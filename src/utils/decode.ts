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


export function cleanHtmlSchemas(html: string): string {
  if (!html) return html;
  return html.replace(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    (match, p1) => {
      let cleanJson = p1.replace(/<br\s*\/?>/gi, '').replace(/<\/?p>/gi, '').replace(/&quot;/g, '\\"');
      
      try {
        JSON.parse(cleanJson);
        return `<script type="application/ld+json">${cleanJson}</script>`;
      } catch (e) {
        // If it's still invalid JSON, try to escape unescaped quotes inside string values as a last resort
        try {
           // A naive fix for unescaped quotes inside values: replace all quotes that have letters around them
           // But it's safer to just remove the broken schema so it doesn't trigger SEO errors
           return '';
        } catch(err) {}
        
        console.warn('Removed broken JSON-LD schema from content');
        return '';
      }
    }
  );
}
