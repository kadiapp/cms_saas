import { Metadata } from 'next';
import { supabase } from '@/api/supabase';
import { notFound } from 'next/navigation';
import { decodeWPEntities } from '@/utils/decode';
import '@/app/globals.css';
import TopNav from '@/components/TopNav';
import TableOfContents from '@/components/TableOfContents';
import RelatedArticles from './RelatedArticles';

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
      title: 'Article Not Found | ClaimPilot',
      description: 'The requested article could not be found.',
    };
  }

  const absoluteUrl = `https://claimpilot.com/blog/${slug}`;

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
      siteName: 'ClaimPilot',
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

    let cleanContent = article.content || '';
  // Clean up residual WordPress shortcodes from the database migration
  cleanContent = cleanContent.replace(/<div(?:(?!<div).)*?\[mb_[^\]]+\](?:(?!<div).)*?<\/div>/gis, '');

  return (
    <>
      <TopNav />
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
          <article style={{ background: 'rgba(16,20,30,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '48px' }}>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '800', color: '#f0f4ff', lineHeight: '1.25', marginBottom: '16px' }}>{decodeWPEntities(article.title)}</h1>
            <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              Published on {new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            
            <TableOfContents />
              <div className="blog-article-content" suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />
            <RelatedArticles currentArticleId={article.id} />
          </article>
        </main>
      </div>
    </>
  );
}
