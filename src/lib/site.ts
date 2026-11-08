export const SITE_URL = "https://egzamin-zawodowy.wiktorgolicz.pl";
export const SITE_NAME = "Eksplorator zadań INF.03 i INF.04";
export const SITE_DESCRIPTION =
  "Archiwalne arkusze, zadania i podgląd PDF dla egzaminów zawodowych INF.03 i INF.04.";

export const STATIC_PAGES = {
  home: { path: "/", title: SITE_NAME, description: SITE_DESCRIPTION },
  privacy: {
    path: "/polityka-prywatnosci/",
    title: `Polityka prywatności | ${SITE_NAME}`,
    description:
      "Informacje o hostingu, cookies, Google Analytics i ustawieniach prywatności w Eksploratorze zadań.",
  },
};

export function pageMetaTags({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const image = `${SITE_URL}/og-image.png`;
  const properties = {
    "og:type": "website",
    "og:locale": "pl_PL",
    "og:site_name": SITE_NAME,
    "og:title": title,
    "og:description": description,
    "og:url": new URL(path, SITE_URL).href,
    "og:image": image,
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:alt": SITE_NAME,
  };
  const names = {
    description,
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": image,
  };
  return [
    ...Object.entries(properties).map(([property, content]) => ({
      property,
      content,
    })),
    ...Object.entries(names).map(([name, content]) => ({ name, content })),
  ];
}
