import { MetadataRoute } from 'next';
import { supabase } from '@/api/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cms1500claimbilling.com';

  // Fetch all articles from the Knowledge Base
  const { data: articles, error } = await supabase
    .from('knowledge_base')
    .select('slug, published_at')
    .order('published_at', { ascending: false });

  // Base static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Dynamically append all blog articles
  if (error) console.error('Sitemap DB Error:', error);
  if (articles) {
    const articleRoutes = articles.map((article) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: new Date(article.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    
    return [...routes, ...articleRoutes];
  }

  return routes;
}
