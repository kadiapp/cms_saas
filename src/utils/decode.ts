export function decodeWPEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function normalizeInternalLinks(html: string): string {
  if (!html) return html;
  // Strip trailing slashes on internal cms1500claimbilling.com article links so they match canonical URLs without 308 redirects
  return html.replace(
    /href=(["'])https?:\/\/cms1500claimbilling\.com\/([a-zA-Z0-9\-_\/]+?)\/(#[a-zA-Z0-9\-_]+)?\1/gi,
    'href=$1https://cms1500claimbilling.com/$2$3$1'
  );
}

export function normalizeArticleSchema(
  schema: any,
  article: { slug: string; title?: string; meta_title?: string; meta_description?: string }
): any {
  if (!schema || typeof schema !== 'object') return schema;
  const canonicalUrl = `https://cms1500claimbilling.com/${article.slug}`;
  const cleanTitle = decodeWPEntities(article.title || '');
  const cleanMetaTitle = decodeWPEntities(article.meta_title || article.title || '');
  const cleanMetaDesc = decodeWPEntities(article.meta_description || '');

  try {
    let str = JSON.stringify(schema);
    // Normalize trailing slashes before quotes or hash fragments on internal slug URLs
    str = str.replace(
      /https:\/\/cms1500claimbilling\.com\/([a-zA-Z0-9\-]+)\/(?=["#])/g,
      'https://cms1500claimbilling.com/$1'
    );

    const parsed = JSON.parse(str);
    if (Array.isArray(parsed['@graph'])) {
      for (const node of parsed['@graph']) {
        if (node['@type'] === 'Article') {
          if (cleanTitle) node.headline = cleanTitle;
          node['@id'] = `${canonicalUrl}#article`;
          node.isPartOf = { '@id': canonicalUrl };
          node.mainEntityOfPage = { '@id': canonicalUrl };
        } else if (node['@type'] === 'WebPage') {
          node['@id'] = canonicalUrl;
          node.url = canonicalUrl;
          if (cleanMetaTitle) node.name = cleanMetaTitle;
          if (cleanMetaDesc) node.description = cleanMetaDesc;
          if (node.breadcrumb) node.breadcrumb = { '@id': `${canonicalUrl}#breadcrumb` };
          if (Array.isArray(node.potentialAction)) {
            for (const act of node.potentialAction) {
              if (act['@type'] === 'ReadAction') {
                act.target = [canonicalUrl];
              }
            }
          }
        } else if (node['@type'] === 'BreadcrumbList' && Array.isArray(node.itemListElement)) {
          node['@id'] = `${canonicalUrl}#breadcrumb`;
          node.itemListElement = [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cms1500claimbilling.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Knowledge Base',
              item: 'https://cms1500claimbilling.com/blog',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: cleanTitle || cleanMetaTitle,
            },
          ];
        }
      }
    }
    return parsed;
  } catch {
    return schema;
  }
}

export function cleanHtmlSchemas(html: string): string {
  if (!html) return html;
  return html.replace(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    (match, p1) => {
      const cleanJson = p1.replace(/<br\s*\/?>/gi, '').replace(/<\/?p>/gi, '').replace(/&quot;/g, '\\"');
      try {
        JSON.parse(cleanJson);
        return `<script type="application/ld+json">${cleanJson}</script>`;
      } catch {
        return '';
      }
    }
  );
}
