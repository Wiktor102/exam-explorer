// Post-build SEO step: sitemap.xml, robots.txt and static prerender snapshots.
//
// Production URL comes from the deploy verify step in
// .github/workflows/deploy-mydevil.yml
// (https://egzamin-zawodowy.wiktorgolicz.pl/). The deploy .env template only
// carries a placeholder, so this file pins the real address in one place.
//
// Query-URL shapes mirror syncUrl() in src/hooks/useCatalogExplorer.ts, which
// is what the app writes to the address bar when an exam or task is opened.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://egzamin-zawodowy.wiktorgolicz.pl";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(rootDir, "public");
const distDir = join(rootDir, "dist");

function readCatalog(name) {
  return JSON.parse(
    readFileSync(join(publicDir, "data", name, "catalog.json"), "utf8"),
  );
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
}

const landingSnapshot = `
    <main class="landing-page">
      <header class="landing-nav">
        <a class="landing-brand" href="/">
          <img src="/favicon.svg" alt="" aria-hidden="true" />
          <span>Eksplorator zadań INF.03 i INF.04</span>
        </a>
      </header>
      <div class="landing-content">
        <section class="landing-hero" aria-labelledby="landing-title">
          <h1 id="landing-title">Wszystkie arkusze w jednym miejscu.</h1>
          <p>
            Przeglądaj archiwalne arkusze z egzaminów zawodowych INF.03 i
            INF.04, filtruj zadania po temacie i od razu otwieraj właściwe
            strony arkuszy.
          </p>
          <nav aria-label="Katalogi egzaminacyjne">
            <a href="/?type=inf03">INF.03, tworzenie i administrowanie stronami i bazami danych</a>
            <a href="/?type=inf04">INF.04, projektowanie i programowanie aplikacji</a>
          </nav>
          <p>Bezpłatnie, bez logowania. Materiały otwierają się w przeglądarce.</p>
          <p>
            <a href="/polityka-prywatnosci/">Polityka prywatności</a>
          </p>
        </section>
      </div>
    </main>`;

const privacySnapshot = `
    <main class="landing-page privacy-page">
      <header class="landing-nav">
        <a class="landing-brand" href="/">
          <img src="/favicon.svg" alt="" aria-hidden="true" />
          <span>Eksplorator zadań INF.03 i INF.04</span>
        </a>
      </header>
      <div class="landing-content">
        <article aria-labelledby="privacy-title">
          <h1 id="privacy-title">Polityka prywatności</h1>
          <p>
            Ta polityka opisuje dane przetwarzane przez hosting oraz, po
            wyrażeniu zgody, przez Google Analytics 4. Wyjaśnia też, jak
            zmienić decyzję dotyczącą pomiaru odwiedzin.
          </p>
          <nav aria-label="Spis treści">
            <a href="/">Wróć do strony głównej</a>
          </nav>
          <section>
            <h2>1. Administrator danych</h2>
            <p>
              Administratorem danych jest Wiktor Golicz. Kontakt w sprawach
              prywatności: admin@wiktorgolicz.pl.
            </p>
          </section>
          <section>
            <h2>2. Hosting</h2>
            <p>
              Serwer może zapisywać logi techniczne dla bezpieczeństwa i
              diagnozowania awarii. Dostawcą hostingu jest MyDevil.net.
            </p>
          </section>
          <section>
            <h2>3. Google Analytics 4</h2>
            <p>
              Analityka uruchamia się dopiero po wyrażeniu zgody i nie jest
              potrzebna do działania aplikacji. Zgodę można wycofać w
              ustawieniach prywatności.
            </p>
          </section>
          <section>
            <h2>4. Cookies i zapis ustawień</h2>
            <p>
              Decyzja o analityce jest zapisywana lokalnie w przeglądarce,
              aby aplikacja nie pytała o zgodę przy każdej wizycie.
            </p>
          </section>
        </article>
      </div>
    </main>`;

function buildEntries() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today },
    { loc: `${SITE_URL}/polityka-prywatnosci/`, lastmod: today },
  ];

  for (const name of ["inf03", "inf04"]) {
    const catalog = readCatalog(name);
    const lastmod = catalog.generatedAt
      ? toDate(catalog.generatedAt)
      : today;
    entries.push({ loc: `${SITE_URL}/?type=${name}`, lastmod });
    for (const exam of catalog.exams ?? []) {
      entries.push({
        loc: `${SITE_URL}/?type=${name}&mode=exams&exam=${exam.id}`,
        lastmod,
      });
    }
    for (const task of catalog.tasks ?? []) {
      entries.push({
        loc: `${SITE_URL}/?type=${name}&mode=tasks&exam=${task.examId}&task=${task.id}`,
        lastmod,
      });
    }
  }

  return entries;
}

function writeSitemap(entries) {
  const urls = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  writeFileSync(join(distDir, "sitemap.xml"), xml);
  return entries.length;
}

function writeRobots() {
  writeFileSync(
    join(distDir, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  );
}

function renderShell(shell, snapshot, { title, canonical, ogUrl }) {
  if (!shell.includes('<div id="root"></div>')) {
    throw new Error("dist/index.html has no empty #root to prerender into");
  }
  return shell
    .replace('<div id="root"></div>', `<div id="root">${snapshot}</div>`)
    .replace(
      /<title>.*?<\/title>/,
      `<title>${escapeXml(title)}</title>`,
    )
    .replaceAll(
      '<link rel="canonical" href="https://egzamin-zawodowy.wiktorgolicz.pl/" />',
      `<link rel="canonical" href="${canonical}" />`,
    )
    .replaceAll(
      '<meta property="og:url" content="https://egzamin-zawodowy.wiktorgolicz.pl/" />',
      `<meta property="og:url" content="${ogUrl}" />`,
    );
}

const entries = buildEntries();
const urlCount = writeSitemap(entries);
writeRobots();

const shell = readFileSync(join(distDir, "index.html"), "utf8");

writeFileSync(
  join(distDir, "index.html"),
  renderShell(shell, landingSnapshot, {
    title: "Eksplorator zadań INF.03 i INF.04",
    canonical: `${SITE_URL}/`,
    ogUrl: `${SITE_URL}/`,
  }),
);

const privacyDir = join(distDir, "polityka-prywatnosci");
mkdirSync(privacyDir, { recursive: true });
writeFileSync(
  join(privacyDir, "index.html"),
  renderShell(shell, privacySnapshot, {
    title: "Polityka prywatności | Eksplorator zadań INF.03 i INF.04",
    canonical: `${SITE_URL}/polityka-prywatnosci/`,
    ogUrl: `${SITE_URL}/polityka-prywatnosci/`,
  }),
);

console.log(
  `SEO: ${urlCount} sitemap URLs, robots.txt, prerendered / and /polityka-prywatnosci/.`,
);
