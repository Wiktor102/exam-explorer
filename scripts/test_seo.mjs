import { readFileSync } from "node:fs";
import { parse } from "parse5";
import assert from "node:assert/strict";
import { createServer } from "vite";
async function run() {
  const server = await createServer({
    configFile: false,
    server: { middlewareMode: true },
  });
  try {
    const {
      catalogPath,
      examPath,
      taskPath,
      parseCatalogPath,
      legacyDestination,
    } = await server.ssrLoadModule("/src/lib/routes.ts");
    const { SITE_URL, STATIC_PAGES, pageMetaTags } =
      await server.ssrLoadModule("/src/lib/site.ts");
    const { sitePages } = await server.ssrLoadModule("/src/server/pages.ts");
    const pages = sitePages();
    const catalogs = pages.filter(
      (page) => page.catalog && !page.exam && !page.task,
    );
    for (const { type } of catalogs) {
      assert.equal(catalogPath(type), `/${type}/`);
      assert.deepEqual(parseCatalogPath(examPath(type, "exam-1")), {
        examType: type,
        examId: "exam-1",
        taskId: null,
      });
      assert.deepEqual(parseCatalogPath(taskPath(type, "task-1")), {
        examType: type,
        examId: null,
        taskId: "task-1",
      });
    }
    const legacy = (path) =>
      legacyDestination(new URL(path, "https://example.com"));
    assert.equal(legacy("/"), null);
    assert.equal(legacy("/?utm_source=school"), null);
    assert.equal(legacy("/?type=inf03"), "/inf03/");
    assert.equal(
      legacy("/?type=inf04&exam=sheet&task=part&q=C%2B%2B&year=2024#pdf"),
      "/inf04/zadania/part/?q=C%2B%2B&year=2024#pdf",
    );
    assert.equal(
      legacy("/?exam=inf03-sheet&mode=exams"),
      "/inf03/arkusze/inf03-sheet/?mode=exams",
    );
    assert.equal(legacy("/?q=sql&sort=oldest"), "/inf04/?q=sql&sort=oldest");
    assert.equal(legacy("/inf04/?q=sql"), null);
    assert.equal(parseCatalogPath("/inf04/arkusze/missing/extra/"), null);
    const { readExplorerLocation, explorerUrl } = await server.ssrLoadModule(
      "/src/lib/explorerLocation.ts",
    );
    for (const { type, catalog } of catalogs) {
      const filters =
        "?q=C%2B%2B&year=2026&season=summer&taskType=console&sort=oldest";
      for (const path of [
        catalogPath(type),
        examPath(type, catalog.exams[0].id),
        taskPath(type, catalog.tasks[0].id),
      ]) {
        const url = new URL(path + filters, "https://example.com");
        const state = readExplorerLocation(url, catalog);
        assert.equal(explorerUrl(state), path + filters);
        assert.equal(state.query, "C++");
        assert.equal(state.sortMode, "oldest");
      }
      const empty = readExplorerLocation(
        new URL(
          catalogPath(type) + "?mode=tasks&year=broken&sort=broken",
          "https://example.com",
        ),
        catalog,
      );
      assert.equal(explorerUrl(empty), catalogPath(type) + "?mode=tasks");
    }
    console.log("Canonical routes and legacy URL conversion passed.");
    verifyOutput(pages, {
      SITE_URL,
      STATIC_PAGES,
      pageMetaTags,
      catalogPaths: catalogs.map((page) => page.path),
    });
  } finally {
    await server.close();
  }
}

// Ignore scripts, styles and template content. Hydration props are data rather
// than rendered task text, so they cannot make the content assertions pass.
function inspect(source) {
  const elements = [];
  const text = [];
  function visit(node) {
    if (["script", "style", "template"].includes(node.tagName)) return;
    if (node.tagName)
      elements.push({
        tag: node.tagName,
        attrs: Object.fromEntries(
          node.attrs.map(({ name, value }) => [name, value]),
        ),
        node,
      });
    if (node.nodeName === "#text") text.push(node.value);
    for (const child of node.childNodes ?? []) visit(child);
  }
  // Avoid decoding the large, duplicate catalog payload inside Astro props.
  visit(parse(source.replace(/\bprops="[^"]*"/g, 'props=""')));
  return { elements, text: normalize(text.join(" ")) };
}
const normalize = (text) => text.replace(/\s+/gu, " ").trim();
const readOutput = (path) =>
  readFileSync(new URL(`../dist/${path}`, import.meta.url), "utf8");
const pageFile = (path) => path.slice(1) + "index.html";
function nodeText(node) {
  return node.nodeName === "#text"
    ? node.value
    : (node.childNodes ?? []).map(nodeText).join("");
}

function verifyOutput(
  pages,
  { SITE_URL, STATIC_PAGES, pageMetaTags, catalogPaths },
) {
  const expectedPaths = new Set(pages.map((page) => page.path));
  assert.equal(expectedPaths.size, pages.length, "Duplicate page paths");
  const titles = new Set();
  for (const page of pages) {
    const { elements, text } = inspect(readOutput(pageFile(page.path)));
    const context = page.path;
    const links = elements
      .filter((element) => element.tag === "a")
      .map((element) => element.attrs.href);
    assert.equal(
      elements.filter((element) => element.tag === "h1").length,
      1,
      `${context}: h1`,
    );
    assert.deepEqual(
      elements
        .filter(
          (element) =>
            element.tag === "link" && element.attrs.rel === "canonical",
        )
        .map((element) => element.attrs.href),
      [new URL(page.path, SITE_URL).href],
      `${context}: canonical`,
    );
    assert.deepEqual(
      elements
        .filter((element) => element.tag === "title")
        .map((element) => nodeText(element.node)),
      [page.title],
      `${context}: title`,
    );
    for (const expected of pageMetaTags(page)) {
      const attribute = "property" in expected ? "property" : "name";
      const matches = elements.filter(
        (element) =>
          element.tag === "meta" &&
          element.attrs[attribute] === expected[attribute],
      );
      assert.deepEqual(
        matches.map((element) => element.attrs.content),
        [expected.content],
        `${context}: ${expected[attribute]}`,
      );
    }
    assert.ok(!titles.has(page.title), `${context}: duplicate title`);
    titles.add(page.title);
    if (page.task) {
      assert.ok(
        text.includes(normalize(page.task.text)),
        `${context}: full task text`,
      );
      assert.ok(
        text.includes(normalize(page.task.summary)),
        `${context}: task summary`,
      );
      assert.ok(links.includes(page.task.pdf), `${context}: task PDF`);
    } else if (page.exam) {
      assert.ok(text.includes(page.exam.code), `${context}: exam code`);
      assert.ok(links.includes(page.exam.pdf), `${context}: exam PDF`);
    }
    for (const href of links) {
      const url = new URL(href, new URL(page.path, SITE_URL));
      if (
        url.origin === new URL(SITE_URL).origin &&
        catalogPaths.some((path) => url.pathname.startsWith(path))
      ) {
        assert.ok(
          expectedPaths.has(url.pathname),
          `${context}: broken link ${href}`,
        );
      }
    }
  }
  const sitemap = inspect(readOutput("sitemap.xml"));
  const urls = sitemap.elements
    .filter((element) => element.tag === "loc")
    .map((element) => nodeText(element.node));
  assert.equal(urls.length, expectedPaths.size, "Sitemap URL count");
  assert.deepEqual(
    new Set(urls),
    new Set(pages.map((page) => new URL(page.path, SITE_URL).href)),
    "Sitemap coverage",
  );
  for (const page of Object.values(STATIC_PAGES)) {
    const { elements } = inspect(readOutput(pageFile(page.path)));
    const islands = elements.filter(
      (element) => element.tag === "astro-island",
    );
    assert.equal(
      islands.length,
      1,
      `${page.path}: only the consent island should load`,
    );
    assert.ok(
      islands[0].attrs["component-url"].includes("/ConsentIsland."),
      `${page.path}: consent island`,
    );
  }
  assert.ok(
    inspect(readOutput("404.html")).elements.some(
      (element) =>
        element.tag === "meta" &&
        element.attrs.name === "robots" &&
        element.attrs.content === "noindex",
    ),
    "404 must be noindex",
  );
  assert.ok(
    readOutput("robots.txt").includes(new URL("/sitemap.xml", SITE_URL).href),
    "robots sitemap link",
  );
  console.log(
    `Verified ${pages.length} static pages, full task text, PDFs, metadata, sitemap and internal links.`,
  );
}

await run();
