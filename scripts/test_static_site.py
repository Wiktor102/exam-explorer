"""Verify built SEO pages without running a browser or JavaScript."""
import json
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
SITE = "https://egzamin-zawodowy.wiktorgolicz.pl"


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.links = []
        self.canonicals = []
        self.meta = {}
        self.h1 = 0
        self.text = []
        self.skip = 0
        # Astro serializes the catalog in an attribute for hydration. Inspect
        # rendered content, without reparsing that large duplicate data payload.
        self.feed(re.sub(r'\bprops="[^"]*"', 'props=""', source))

    def handle_starttag(self, tag, attrs):
        if tag in ("template", "script", "style"):
            self.skip += 1
        if self.skip:
            return
        attrs = dict(attrs)
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs["href"])
        if tag == "meta":
            self.meta[attrs.get("name", attrs.get("property"))] = attrs.get("content")
        if tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if tag in ("template", "script", "style"):
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)


def verify():
    expected = {"/", "/polityka-prywatnosci/", "/inf03/", "/inf04/"}
    for kind in ("inf03", "inf04"):
        catalog = json.loads((ROOT / f"public/data/{kind}/catalog.json").read_text())
        for category, entries in (("arkusze", catalog["exams"]), ("zadania", catalog["tasks"])):
            for entry in entries:
                route = f"/{kind}/{category}/{entry['id']}/"
                expected.add(route)
                html = (DIST / route.strip("/") / "index.html").read_text()
                page = Page(html)
                text = " ".join(" ".join(page.text).split())
                if category == "zadania":
                    assert " ".join(entry["text"].split()) in text, route
                    assert " ".join(entry["summary"].split()) in text, route
                else:
                    assert entry["code"] in text, route
                assert entry["pdf"] in page.links, route
    urls = {element.text for element in ET.parse(DIST / "sitemap.xml").findall("{*}url/{*}loc")}
    assert urls == {SITE + path for path in expected}
    titles = set()
    for route in expected:
        html = (DIST / route.strip("/") / "index.html").read_text()
        page = Page(html)
        assert page.h1 == 1, (route, page.h1)
        assert page.canonicals == [SITE + route], route
        for key in ("description", "og:title", "og:description", "og:url", "og:image", "twitter:title", "twitter:description", "twitter:image"):
            assert page.meta.get(key), (route, key)
        assert page.meta["og:url"] == SITE + route
        assert page.meta["og:title"] not in titles, route
        titles.add(page.meta["og:title"])
        for href in page.links:
            path = unquote(urlsplit(unescape(href)).path)
            if path.startswith(("/inf03/", "/inf04/")):
                assert path in expected, (route, href)
    for path in ("index.html", "polityka-prywatnosci/index.html"):
        html = (DIST / path).read_text()
        assert 'component-export="default"' in html  # Consent island remains interactive.
        assert '/App.' not in html
        assert '/LandingPage.' not in html and '/PrivacyPolicyPage.' not in html
    assert 'noindex' in (DIST / "404.html").read_text()
    assert SITE + "/sitemap.xml" in (DIST / "robots.txt").read_text()
    print(f"Verified {len(expected)} static pages, full task text, PDFs, metadata, sitemap and internal links.")


if __name__ == "__main__":
    verify()
