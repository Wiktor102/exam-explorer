import { sitePages } from "../server/pages";
import { SITE_URL } from "../lib/site";
export function GET() {
  const paths = sitePages().map((page) => page.path);
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${SITE_URL}${path}</loc></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
