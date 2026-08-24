import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/login', '/api/'],
    },
    sitemap: 'https://cms1500claimbilling.com/sitemap.xml',
  };
}
