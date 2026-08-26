import { supabase } from '@/api/supabase';
import { decodeWPEntities } from '@/utils/decode';
import Link from 'next/link';

export default async function RelatedArticles({ currentArticleId }: { currentArticleId: string }) {
  const { data: articles, error } = await supabase
    .from('knowledge_base')
    .select('id, slug, title, published_at')
    .neq('id', currentArticleId)
    .order('published_at', { ascending: false })
    .limit(3);

  if (error || !articles || articles.length === 0) return null;

  return (
    <div style={{ marginTop: '64px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '48px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .related-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 24px;
          height: 100%;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .related-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1);
        }
      `}} />
      <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f8fafc', marginBottom: '24px' }}>
        Related Articles
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {articles.map((article) => (
          <Link href={`/${article.slug}`} key={article.id} style={{ textDecoration: 'none' }}>
            <div className="related-card">
              <h4 style={{ 
                color: '#e2e8f0', 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                lineHeight: '1.4', 
                marginBottom: '12px' 
              }}>
                {decodeWPEntities(article.title)}
              </h4>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 'auto' }}>
                {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
