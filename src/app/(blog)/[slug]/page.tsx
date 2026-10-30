import { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { supabase } from '@/api/supabase';
import { notFound } from 'next/navigation';
import { decodeWPEntities, cleanHtmlSchemas, normalizeInternalLinks, normalizeArticleSchema } from '@/utils/decode';
import '@/app/globals.css';
import TopNav from '@/components/TopNav';
import TableOfContents, { TocHeading } from '@/components/TableOfContents';
import RelatedArticles from './RelatedArticles';
import InlineCodingAssistantCTA from '@/components/InlineCodingAssistantCTA';
import CopyAttribution from '@/components/CopyAttribution';
import BlogMicroCTA from '@/components/BlogMicroCTA';
import parse, { DOMNode, Element } from 'html-react-parser';

type Props = {
  params: Promise<{ slug: string }>;
};

// Deduplicate the Supabase fetch between generateMetadata() and BlogPost() within the same render pass
const getArticleBySlug = cache(async (slug: string) => {
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, slug, title, meta_title, meta_description, published_at, content, schema_markup')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return data;
});

// Pre-render the top cited & highest-traffic articles at build time and keep edge cache warm for 1 hour
export const revalidate = 3600;

export async function generateStaticParams() {
  const { data } = await supabase
    .from('knowledge_base')
    .select('slug')
    .order('published_at', { ascending: false })
    .limit(50);

  const prioritySlugs = [
    'ct-abd-cpt-codes-74176-7417',
    'cpt-code-82306-82652-vitamin-d-hydroxy',
    'cpt-code-botox-j0585-billing-guidelines',
    'ub-04-medicare-discharge-status-code',
    'cpt-code-venofer-j1756-j2916',
    'cpt-code-prolia-j0897-billing-guidelines',
    'cpt-code-for-vitamin-b12',
    'legacy-number-and-upin-number-no-need-to-print-individual-and-organization-npi-is-enough',
  ];

  const all = new Set<string>(prioritySlugs);
  if (data) {
    for (const row of data) {
      if (row.slug) all.add(row.slug);
    }
  }
  return Array.from(all).map((slug) => ({ slug }));
}

// 1. Dynamic SEO Metadata Generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const data = await getArticleBySlug(slug);

  if (!data) {
    return {
      title: 'Article Not Found | 1500 Claim Billing',
      description: 'The requested article could not be found.',
    };
  }

  const absoluteUrl = `https://cms1500claimbilling.com/${slug}`;

  return {
    title: decodeWPEntities(data.meta_title),
    description: data.meta_description,
    alternates: {
      canonical: absoluteUrl,
    },
    openGraph: {
      title: decodeWPEntities(data.meta_title),
      description: data.meta_description,
      url: absoluteUrl,
      type: 'article',
      siteName: '1500 Claim Billing',
      publishedTime: data.published_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: decodeWPEntities(data.meta_title),
      description: data.meta_description,
    },
  };
}

// 2. The Page Component
export default async function BlogPost({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  let cleanContent = normalizeInternalLinks(cleanHtmlSchemas(article.content || ''));

  const articleTitleStr = decodeWPEntities(article.title || '');
  const cptMatch = articleTitleStr.match(/\b\d{5}\b/) || articleTitleStr.match(/\b[A-Z]\d{4}\b/i);
  const primaryCode = cptMatch ? cptMatch[0].toUpperCase() : '';

  // Determine the smartest default tab for the unified Coding Assistant widget based on article topic
  let smartDefaultTab: 'dictionary' | 'ncci' | 'mednec' | 'npi' | 'auto' = 'dictionary';
  if (/Box 17|Referring Provider|Ordering Provider|NPI|Taxonomy|UPIN/i.test(articleTitleStr)) {
    smartDefaultTab = 'npi';
  } else if (/NCCI|Modifier 59|Modifier 25|Bundl/i.test(articleTitleStr)) {
    smartDefaultTab = 'ncci';
  } else if (/LCD|NCD|Medical Necessity/i.test(articleTitleStr)) {
    smartDefaultTab = 'mednec';
  }

  // --- CLEAN & FOCUSED INJECTION SYSTEM (NO AD OVERLOAD) ---
  // 1. Wrap unwrapped opening paragraph (from legacy wpautop) in <p>...</p> so the main assistant always injects right after Paragraph 1
  cleanContent = cleanContent.trim();
  if (cleanContent && !cleanContent.startsWith('<p') && !cleanContent.startsWith('<h') && !cleanContent.startsWith('<div') && !cleanContent.startsWith('<table')) {
    cleanContent = cleanContent.replace(/^([\s\S]+?)(?=\r?\n\r?\n|\s*<h[1-6]|\s*<p|\s*<table|\s*<div)/i, '<p>$1</p>\n');
  }

  // 2. Strip legacy WordPress [mb_*] callout wrapper divs, shortcode tags, and draft image placeholders
  cleanContent = cleanContent
    .replace(/<div[^>]*>(?:(?!<\/div>)[\s\S])*?\[(?:mb_[a-z0-9_]+|inject_[a-z0-9_]+)\][\s\S]*?<\/div>/gi, '')
    .replace(/<p[^>]*>\s*\[(?:inject_[a-z0-9_]+|mb_[a-z0-9_]+|placeholder_[^\]]+|Insert Screenshot[^\]]+|INSERT IMAGE[^\]]+)\]\s*<\/p>/gi, '')
    .replace(/\[(?:inject_[a-z0-9_]+|mb_[a-z0-9_]+|placeholder_[^\]]+|Insert Screenshot[^\]]+|INSERT IMAGE[^\]]+)\]/gi, '');

  // 3. Inject the primary multi-tab Coding Assistant right after the first introductory paragraph
  cleanContent = cleanContent.replace(/(<p[^>]*>[\s\S]*?<\/p>)/i, '$1\n<span data-inject="main_assistant"></span>\n');

  // 4. Inject at most ONE contextual mid-article Micro-CTA further down in the article
  let midCtaInjected = false;

  if (!midCtaInjected && /Medical Necessity/i.test(cleanContent)) {
    const replaced = cleanContent.replace(/(<h[2-4][^>]*>[\s\S]*?Medical Necessity[\s\S]*?<\/h[2-4]>)/i, '$1\n<span data-inject="mednec"></span>\n');
    if (replaced !== cleanContent) {
      cleanContent = replaced;
      midCtaInjected = true;
    }
  }

  if (!midCtaInjected && /NCCI/i.test(cleanContent)) {
    const replaced = cleanContent.replace(/(<h[2-4][^>]*>[\s\S]*?NCCI[\s\S]*?<\/h[2-4]>)/i, '$1\n<span data-inject="ncci"></span>\n');
    if (replaced !== cleanContent) {
      cleanContent = replaced;
      midCtaInjected = true;
    }
  }

  if (!midCtaInjected && /Box 17|Referring Provider/i.test(cleanContent)) {
    const replaced = cleanContent.replace(/(<h[2-4][^>]*>[\s\S]*?(?:Box 17|Referring Provider)[\s\S]*?<\/h[2-4]>)/i, '$1\n<span data-inject="box17"></span>\n');
    if (replaced !== cleanContent) {
      cleanContent = replaced;
      midCtaInjected = true;
    }
  }

  if (!midCtaInjected && /UB-04|UB04|Discharge Status|FL 17/i.test(cleanContent)) {
    const replaced = cleanContent.replace(/(<h[2-4][^>]*>[\s\S]*?(?:UB-04|UB04|Discharge Status|FL 17)[\s\S]*?<\/h[2-4]>)/i, '$1\n<span data-inject="ub04"></span>\n');
    if (replaced !== cleanContent) {
      cleanContent = replaced;
      midCtaInjected = true;
    }
  }

  if (!midCtaInjected && /Box 24|Date of Service/i.test(cleanContent)) {
    const replaced = cleanContent.replace(/(<h[2-4][^>]*>[\s\S]*?(?:Box 24|Date of Service)[\s\S]*?<\/h[2-4]>)/i, '$1\n<span data-inject="box24"></span>\n');
    if (replaced !== cleanContent) {
      cleanContent = replaced;
      midCtaInjected = true;
    }
  }

  // Strip hardcoded inline styles and bgcolors from ALL legacy WordPress elements
  cleanContent = cleanContent.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
    let newAttrs = attrs.replace(/\s*bgcolor=["'][^"']*["']/gi, '');
    newAttrs = newAttrs.replace(/\bstyle=(["'])([^"']*)\1/gi, (styleMatch: string, quote: string, styleVal: string) => {
      const cleaned = styleVal
        .split(';')
        .filter((rule: string) => {
          const prop = rule.split(':')[0].trim().toLowerCase();
          return prop !== 'background' && prop !== 'background-color' && prop !== 'color';
        })
        .join(';')
        .trim();
      return cleaned ? `style=${quote}${cleaned}${quote}` : '';
    });
    return `<${tag}${newAttrs}>`;
  });

  // Pre-extract H2 headings on the server & ensure deterministic IDs so TableOfContents renders at t=0ms with zero CLS
  const tocHeadings: TocHeading[] = [];
  let h2Index = 0;
  cleanContent = cleanContent.replace(/<h2(\b[^>]*)>([\s\S]*?)<\/h2>/gi, (fullMatch, attrs, innerHtml) => {
    const rawText = decodeWPEntities(innerHtml.replace(/<[^>]+>/g, '').trim());
    if (!rawText) return fullMatch;
    const idMatch = attrs.match(/\bid=(["'])([^"']+)\1/i);
    const id = idMatch ? idMatch[2] : rawText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `section-${h2Index}`;
    h2Index++;
    tocHeadings.push({ id, text: rawText });
    if (idMatch) {
      return `<h2${attrs} style="scroll-margin-top:96px">${innerHtml}</h2>`;
    }
    return `<h2 id="${id}"${attrs} style="scroll-margin-top:96px">${innerHtml}</h2>`;
  });

  // Parse HTML and replace our custom spans with React components
  const parsedContent = parse(cleanContent, {
    replace: (domNode: DOMNode) => {
      if (domNode.type === 'tag' && (domNode as Element).attribs && (domNode as Element).attribs['data-inject']) {
        const type = (domNode as Element).attribs['data-inject'];
        if (type === 'main_assistant') {
          return <InlineCodingAssistantCTA defaultCpt={primaryCode} defaultTab={smartDefaultTab} />;
        }
        if (type === 'ncci') return <BlogMicroCTA type="ncci" defaultCode={primaryCode} />;
        if (type === 'mednec') return <BlogMicroCTA type="mednec" defaultCode={primaryCode} />;
        if (type === 'dictionary') return <BlogMicroCTA type="dictionary" defaultCode={primaryCode} />;
        if (type === 'box17') return <BlogMicroCTA type="box17" />;
        if (type === 'ub04') return <BlogMicroCTA type="ub04" />;
        if (type === 'box24') return <BlogMicroCTA type="box24" />;
      }
    },
  });

  return (
    <>
      <TopNav />
      <CopyAttribution />
      {/* 3. Injecting the normalized JSON-LD Schema markup */}
      {article.schema_markup && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(normalizeArticleSchema(article.schema_markup, article)) }}
        />
      )}

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '40px 24px 80px' }}>
        <main style={{ width: '100%', maxWidth: '1040px' }}>
          <nav style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Home</a>
            <span>›</span>
            <a href="/blog" style={{ color: '#3b82f6', textDecoration: 'none' }}>Knowledge Base</a>
            <span>›</span>
            <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
              {decodeWPEntities(article.title)}
            </span>
          </nav>
          <article style={{ background: 'transparent', border: 'none', padding: '0 24px 48px' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.35rem)', fontWeight: '800', color: '#f0f4ff', lineHeight: '1.25', marginBottom: '12px' }}>
              {decodeWPEntities(article.title)}
            </h1>
            <div style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              Last Updated: {new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>

            <TableOfContents initialHeadings={tocHeadings} />

            <div className="blog-article-content" suppressHydrationWarning>
              {parsedContent}
            </div>

            {/* INLINE SOFTWARE AD - BOTTOM */}
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px', padding: '32px', marginTop: '48px', marginBottom: '48px', textAlign: 'center' }}>
              <h2 style={{ color: '#fff', fontSize: '1.45rem', margin: '0 0 10px 0' }}>Check Codes, NCCI Edits & Medical Necessity in Seconds</h2>
              <p style={{ color: '#cbd5e1', margin: '0 0 24px 0', fontSize: '0.98rem', lineHeight: '1.6', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
                Use our free Medical Coding Assistant to lookup CPT/ICD-10 descriptions, check Medicare LCD rules, verify NPIs, or auto-fill CMS-1500 claims with AI.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/app/coding-assistant" style={{ background: '#3b82f6', color: '#fff', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', fontSize: '0.95rem' }}>
                  Launch Coding Assistant &rarr;
                </a>
                <a href="/app/editor" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#f8fafc', padding: '12px 24px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, display: 'inline-block', fontSize: '0.95rem' }}>
                  Open CMS-1500 AI Editor
                </a>
              </div>
            </div>

            <Suspense fallback={null}>
              <RelatedArticles currentArticleId={article.id} />
            </Suspense>
          </article>
        </main>
      </div>
    </>
  );
}
