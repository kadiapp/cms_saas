import { Metadata } from 'next';
import { supabase } from '@/api/supabase';
import { notFound } from 'next/navigation';
import { decodeWPEntities, cleanHtmlSchemas } from '@/utils/decode';
import '@/app/globals.css';
import TopNav from '@/components/TopNav';
import TableOfContents from '@/components/TableOfContents';
import RelatedArticles from './RelatedArticles';
import InlineCodingAssistantCTA from '@/components/InlineCodingAssistantCTA';
import CopyAttribution from '@/components/CopyAttribution';
import BlogMicroCTA from '@/components/BlogMicroCTA';
import parse, { DOMNode, Element, Text } from 'html-react-parser';

// This is required for Next.js App Router dynamic params
type Props = {
  params: Promise<{ slug: string }>;
};

// 1. Dynamic SEO Metadata Generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('meta_title, meta_description, published_at')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return {
      title: 'Article Not Found | 1500 Claim Billing',
      description: 'The requested article could not be found.',
    };
  }

  const absoluteUrl = `https://cms1500claimbilling.com/${slug}`;

  // Exactly replicates your Yoast SEO meta title and description, and adds OG tags
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
    }
  };
}

// 2. The Page Component
export const revalidate = 60; // Revalidate every 60 seconds so DB edits show up live

export default async function BlogPost({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const { data: article, error } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !article) {
    notFound();
  }

  let cleanContent = cleanHtmlSchemas(article.content || '');

  // Since we don't have Supabase database write access (RLS blocks the Anon Key), 
  // we dynamically inject the shortcodes for this specific high-traffic article directly into the HTML.
  if (slug === 'rcpt-codes-abdomen-pelvis-w-wo-contrast-2025') {
    // 1. Inject Dictionary after the first table
    let tableParts = cleanContent.split('</table>');
    if (tableParts.length > 1 && !cleanContent.includes('[inject_dictionary]')) {
      cleanContent = tableParts[0] + '</table>\n<p>[inject_dictionary]</p>\n' + tableParts.slice(1).join('</table>');
    }
    // 2. Inject MedNec after the Medical Necessity bullet points
    let splitByMedNec = cleanContent.split('<li><strong>Medical Necessity:</strong>');
    if (splitByMedNec.length > 1 && !cleanContent.includes('[inject_mednec]')) {
      let afterMedNec = splitByMedNec[1];
      let ulParts = afterMedNec.split('</ul>');
      if (ulParts.length > 1) {
         cleanContent = splitByMedNec[0] + '<li><strong>Medical Necessity:</strong>' + ulParts[0] + '</ul>\n<p>[inject_mednec]</p>\n' + ulParts.slice(1).join('</ul>');
      }
    }
    // 3. Upgrade old ncci checker to new one
    cleanContent = cleanContent.replace(/\[mb_ncci_checker\]/g, '[inject_ncci]');
  }
  
  // Strip hardcoded inline styles and bgcolors from ALL legacy WordPress elements
  cleanContent = cleanContent.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
    // Remove bgcolor attribute entirely
    let newAttrs = attrs.replace(/\s*bgcolor=["'][^"']*["']/gi, '');
    // Remove background-color and background from style attribute but keep other styles
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

  const articleTitleStr = decodeWPEntities(article.title || '');
  const isCptArticle = /CPT|HCPCS/i.test(articleTitleStr) || /\b\d{5}\b/.test(articleTitleStr) || /\b[A-Z]\d{4}\b/i.test(articleTitleStr);
  const cptMatch = articleTitleStr.match(/\b\d{5}\b/) || articleTitleStr.match(/\b[A-Z]\d{4}\b/i);
  const primaryCode = cptMatch ? cptMatch[0] : '';

  // Pre-process shortcodes into predictable HTML tags so the parser always finds them
  let processedContent = cleanContent
    .replace(/\[inject_ncci\]/g, '<span data-inject="ncci"></span>')
    .replace(/\[mb_ncci_checker\]/g, '<span data-inject="ncci"></span>')
    .replace(/\[inject_mednec\]/g, '<span data-inject="mednec"></span>')
    .replace(/\[inject_dictionary\]/g, '<span data-inject="dictionary"></span>');

  // Parse HTML and replace our custom spans with React Micro-CTAs
  const parsedContent = parse(processedContent, {
    replace: (domNode: DOMNode) => {
      if (domNode.type === 'tag' && (domNode as Element).attribs && (domNode as Element).attribs['data-inject']) {
        const type = (domNode as Element).attribs['data-inject'];
        if (type === 'ncci') return <BlogMicroCTA type="ncci" defaultCode={primaryCode} />;
        if (type === 'mednec') return <BlogMicroCTA type="mednec" defaultCode={primaryCode} />;
        if (type === 'dictionary') return <BlogMicroCTA type="dictionary" defaultCode={primaryCode} />;
      }
    }
  });

  return (
    <>
      <TopNav />
      <CopyAttribution />
      {/* 3. Injecting the EXACT Yoast JSON-LD Schema markup */}
      {article.schema_markup && (
        <script type="application/ld+json" suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema_markup) }}
        />
      )}

      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '48px 40px 80px' }}>
        <main style={{ width: '100%', maxWidth: '1100px' }}>
          <nav style={{ marginBottom: '24px', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Home</a>
            <span>›</span>
            <a href="/blog" style={{ color: '#3b82f6', textDecoration: 'none' }}>Knowledge Base</a>
            <span>›</span>
            <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
              {decodeWPEntities(article.title)}
            </span>
          </nav>
          <article style={{ background: 'transparent', border: 'none', padding: '0 48px 48px' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: '#f0f4ff', lineHeight: '1.25', marginBottom: '16px' }}>{decodeWPEntities(article.title)}</h1>
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              Last Updated: {new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            
            
            {/* DYNAMIC INLINE SOFTWARE AD - TOP */}
            {isCptArticle ? (
              <InlineCodingAssistantCTA defaultCpt={primaryCode} />
            ) : (
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '24px', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 8px 0' }}>Stop filling the CMS-1500 form by hand.</h3>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem' }}>Upload your superbill and let our AI auto-fill the CMS-1500 claim for you in 5 seconds. Catch coding errors and prevent denials before you submit.</p>
                </div>
                <div>
                  <a href="/app/editor" style={{ background: '#3b82f6', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', fontSize: '0.95rem' }}>Try AI Auto-Fill for Free &rarr;</a>
                </div>
              </div>
            )}

            <TableOfContents />
              <div className="blog-article-content" suppressHydrationWarning>
                {parsedContent}
              </div>
            
            {/* INLINE SOFTWARE AD - BOTTOM */}
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '16px', padding: '32px', marginTop: '48px', marginBottom: '48px', textAlign: 'center' }}>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', margin: '0 0 12px 0' }}>Tired of dealing with rejected claims?</h2>
              <p style={{ color: '#cbd5e1', margin: '0 0 24px 0', fontSize: '1rem', lineHeight: '1.6' }}>Use our modern CMS-1500 software to instantly validate NPIs, CPT codes, and ICD-10 formatting. It's completely free to start.</p>
              <a href="/app/editor" style={{ background: '#fff', color: '#0f172a', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block', fontSize: '1rem', boxShadow: '0 4px 14px rgba(255,255,255,0.1)' }}>Create Your Free Account</a>
            </div>

            <RelatedArticles currentArticleId={article.id} />
          </article>
        </main>
      </div>
    </>
  );
}
