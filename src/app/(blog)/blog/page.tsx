import { supabase } from '@/api/supabase';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Medical Billing Knowledge Base | ClaimPilot',
  description: 'Explore our comprehensive library of medical billing guides, CPT/ICD-10 coding tutorials, and revenue cycle management strategies.',
  alternates: {
    canonical: 'https://claimpilot.com/blog',
  },
  openGraph: {
    title: 'Medical Billing Knowledge Base | ClaimPilot',
    description: 'Explore our comprehensive library of medical billing guides, CPT/ICD-10 coding tutorials, and revenue cycle management strategies.',
    url: 'https://claimpilot.com/blog',
    type: 'website',
    siteName: 'ClaimPilot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Medical Billing Knowledge Base | ClaimPilot',
    description: 'Explore our comprehensive library of medical billing guides, CPT/ICD-10 coding tutorials, and revenue cycle management strategies.',
  }
};
import { decodeWPEntities } from '@/utils/decode';
import Link from 'next/link';
import * as Icon from 'react-feather';
import TopNav from '@/components/TopNav';
import BlogSearch from './BlogSearch';
import '@/app/blog-index.css';

type Props = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

const iconColors = [
  { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
  { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.2)' },
];

export default async function BlogIndex({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const currentPage = parseInt(resolvedParams.page || '1', 10);
  const q = resolvedParams.q || '';
  const itemsPerPage = 12;
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  let query = supabase
    .from('knowledge_base')
    .select('slug, title, published_at', { count: 'exact' });

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data: articles, count, error } = await query
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <>
        <TopNav />
        <div style={{ padding: '40px', color: '#f87171' }}>Error loading articles</div>
      </>
    );
  }

  const totalPages = Math.ceil((count || 0) / itemsPerPage);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
        <>
      <TopNav />
      <div className="blog-index-page">
        <div className="blog-index-header">
          <h1 className="blog-index-title">Knowledge Base</h1>
          <p className="blog-index-subtitle" style={{ marginBottom: 32 }}>
            Explore our comprehensive guides and documentation on medical billing, CMS-1500 forms, and coding compliance.
          </p>
          <BlogSearch initialQuery={q} />
        </div>

        <div className="blog-index-grid">
          {articles?.map(article => {
            const theme = iconColors[article.slug.length % iconColors.length];
            return (
              <Link href={`/${article.slug}`} key={article.slug} className="blog-card">
                <div
                  className="blog-card-icon"
                  style={{ color: theme.color, background: theme.bg, border: `1px solid ${theme.border}` }}
                >
                  <Icon.FileText size={20} strokeWidth={2.5} />
                </div>
                <h2
                  className="blog-card-title"
                  dangerouslySetInnerHTML={{ __html: article.title }}
                />
                <div className="blog-card-date">
                  <Icon.Calendar size={13} />
                  {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </Link>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="blog-pagination">
            {currentPage > 1 && (
              <Link href={`/blog?page=${currentPage - 1}${q ? '&q=' + encodeURIComponent(q) : ''}`} className="blog-page-btn blog-page-nav">
                <Icon.ArrowLeft size={16} /> Prev
              </Link>
            )}

            {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="blog-page-dots mobile-hidden">...</span>
                ) : (
                  <Link
                    key={p}
                    href={`/blog?page=${p}${q ? '&q=' + encodeURIComponent(q) : ''}`}
                    className={`blog-page-btn mobile-hidden ${p === currentPage ? 'blog-page-active' : ''}`}
                  >
                    {p}
                  </Link>
                )
              )}
              
              <div className="mobile-only-page-info" style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '0 12px' }}>
                Page {currentPage} of {totalPages}
              </div>

            {currentPage < totalPages && (
              <Link href={`/blog?page=${currentPage + 1}${q ? '&q=' + encodeURIComponent(q) : ''}`} className="blog-page-btn blog-page-nav">
                Next <Icon.ArrowRight size={16} />
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
