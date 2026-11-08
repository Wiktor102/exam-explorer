import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const inf04 = JSON.parse(
  readFileSync("public/data/inf04/catalog.json", "utf8"),
);
const inf03 = JSON.parse(
  readFileSync("public/data/inf03/catalog.json", "utf8"),
);
const examPath = (id) => `/inf04/arkusze/${id}/`;
const taskPath = (id) => `/inf04/zadania/${id}/`;
const origin = "https://egzamin-zawodowy.wiktorgolicz.pl";
async function ready(page) {
  await page
    .locator('astro-island[component-url*="/App."]:not([ssr])')
    .waitFor();
}
async function identity(page) {
  await page.evaluate(() => {
    window.testShell = document.querySelector(".app-shell");
  });
}
async function sameShell(page) {
  expect(
    await page.evaluate(
      () => window.testShell === document.querySelector(".app-shell"),
    ),
  ).toBe(true);
}
async function metadata(page, path) {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    origin + path,
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    origin + path,
  );
  const title = await page.title();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    title,
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    title,
  );
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("examExplorer.analyticsConsent", "rejected");
    localStorage.setItem("exam-explorer-theme", "dark");
  });
});

test("selections, filters, modes and history retain one document and explorer", async ({
  page,
}) => {
  const errors = [];
  let documents = 0,
    catalogs = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documents++;
    if (
      request.url().includes("/data/") &&
      request.url().endsWith("catalog.json")
    )
      catalogs++;
  });
  await page.goto("/inf04/");
  await ready(page);
  await identity(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const first = inf04.exams[0],
    second = inf04.exams[1];
  await page.locator(`a.exam-line[href^="${examPath(first.id)}"]`).click();
  await expect(page).toHaveURL(new RegExp(examPath(first.id)));
  await metadata(page, examPath(first.id));
  await sameShell(page);
  await page.getByLabel("Szukaj", { exact: true }).fill("aplikacja");
  await expect(page).toHaveURL(/q=aplikacja/);
  await page.locator(`a.exam-line[href^="${examPath(second.id)}"]`).click();
  await expect(page).toHaveURL(new RegExp(examPath(second.id)));
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(new RegExp(examPath(first.id)));
  await expect(page.getByLabel("Szukaj", { exact: true })).toHaveValue(
    "aplikacja",
  );
  await metadata(page, examPath(first.id));
  await page.evaluate(() => history.forward());
  await expect(page).toHaveURL(new RegExp(examPath(second.id)));
  await page.getByLabel("Resetuj filtry", { exact: true }).click();
  await page
    .locator('.segmented-control[aria-label="Tryb katalogu"]')
    .getByRole("button", { name: "Zadania", exact: true })
    .click();
  await expect(page).toHaveURL(/\/zadania\//);
  const task = inf04.tasks.find((item) => item.examId !== second.id);
  await page.locator(`a.task-row[href^="${taskPath(task.id)}"]`).click();
  await expect(page).toHaveURL(new RegExp(taskPath(task.id)));
  await metadata(page, taskPath(task.id));
  await page.locator("a.task-row.selected").click();
  await expect(page).toHaveURL(/\/inf04\/\?mode=tasks$/);
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(new RegExp(taskPath(task.id)));
  await expect(page.locator("a.task-row.selected")).toHaveAttribute(
    "href",
    new RegExp(taskPath(task.id)),
  );
  await sameShell(page);
  expect(documents).toBe(1);
  expect(catalogs).toBe(0);
  expect(errors).toEqual([]);
});

test("qualification loading retains the interface, handles failures and caches successes", async ({
  page,
}) => {
  await page.goto("/inf04/");
  await ready(page);
  await identity(page);
  let release;
  let requests = 0;
  await page.route("**/data/inf03/catalog.json", async (route) => {
    requests++;
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: inf03 });
  });
  await page.getByRole("button", { name: "INF.03", exact: true }).click();
  await expect.poll(() => requests).toBe(1);
  await expect(page.locator("main.app-shell")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator("a.exam-line")).toHaveCount(inf04.exams.length);
  await expect(page).toHaveURL("/inf04/");
  release();
  await expect(page).toHaveURL("/inf03/");
  await sameShell(page);
  await page.getByRole("button", { name: "INF.04", exact: true }).click();
  await expect(page).toHaveURL("/inf04/");
  await page.getByRole("button", { name: "INF.03", exact: true }).click();
  await expect(page).toHaveURL("/inf03/");
  expect(requests).toBe(1);
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL("/inf04/");
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL("/inf03/");
  await metadata(page, "/inf03/");
  await sameShell(page);
});

test("failed qualification request keeps current view and can retry", async ({
  page,
}) => {
  await page.goto("/inf04/");
  await ready(page);
  await identity(page);
  let fail = true;
  await page.route("**/data/inf03/catalog.json", (route) =>
    fail ? route.abort() : route.fulfill({ json: inf03 }),
  );
  await page.getByRole("button", { name: "INF.03", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL("/inf04/");
  await sameShell(page);
  fail = false;
  await page.getByRole("button", { name: "Spróbuj ponownie" }).click();
  await expect(page).toHaveURL("/inf03/");
  await sameShell(page);
});

test("direct filtered task links hydrate without replacing prerendered UI", async ({
  page,
}) => {
  const task = inf04.tasks[0];
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      window.beforeHydration = document.querySelector(".app-shell");
    });
  });
  await page.goto(taskPath(task.id) + "?q=aplikacja&year=2026");
  await ready(page);
  await expect(page.getByLabel("Szukaj", { exact: true })).toHaveValue(
    "aplikacja",
  );
  await expect(page.locator("a.task-row.selected")).toBeVisible();
  expect(
    await page.evaluate(
      () => window.beforeHydration === document.querySelector(".app-shell"),
    ),
  ).toBe(true);
  await metadata(page, taskPath(task.id));
  await page.reload();
  await ready(page);
  await expect(page.getByLabel("Szukaj", { exact: true })).toHaveValue(
    "aplikacja",
  );
});

test("no-JS task content and real links remain usable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const task = inf04.tasks[0];
  await page.goto("http://127.0.0.1:4330" + taskPath(task.id));
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.locator(".task-content summary").click();
  await expect(page.locator(".task-transcript")).toContainText(
    task.text.slice(0, 80),
  );
  await expect(page.locator("a.task-row.selected")).toHaveAttribute(
    "href",
    taskPath(task.id),
  );
  await context.close();
});

test("expanded transcripts stay scrollable and history restores the latest scroll position", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const first = inf04.exams[0],
    second = inf04.exams[1];
  await page.goto(examPath(first.id));
  await ready(page);
  await page.locator(".task-content summary").click();
  expect(
    await page
      .locator(".workspace")
      .evaluate((node) => node.getBoundingClientRect().height),
  ).toBeGreaterThan(100);
  await page.locator(".detail-pane").evaluate((node) => {
    node.scrollTop = 350;
  });
  await expect
    .poll(() => page.locator(".detail-pane").evaluate((node) => node.scrollTop))
    .toBe(350);
  await page.locator(`a.exam-line[href^="${examPath(second.id)}"]`).click();
  await expect(page).toHaveURL(new RegExp(examPath(second.id)));
  await expect.poll(() => page.locator(".detail-pane").evaluate(node => node.scrollTop)).toBe(0);
  await page.locator(".detail-pane").evaluate((node) => {
    node.scrollTop = 240;
  });
  await expect
    .poll(() => page.locator(".detail-pane").evaluate((node) => node.scrollTop))
    .toBe(240);
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(new RegExp(examPath(first.id)));
  await expect
    .poll(() => page.locator(".detail-pane").evaluate((node) => node.scrollTop))
    .toBe(350);
  await page.evaluate(() => history.forward());
  await expect(page).toHaveURL(new RegExp(examPath(second.id)));
  await expect
    .poll(() => page.locator(".detail-pane").evaluate((node) => node.scrollTop))
    .toBe(240);
});

test("keyboard selections stay client-side and modifier clicks open real detail URLs", async ({
  page,
  context,
}) => {
  await page.goto("/inf04/");
  await ready(page);
  await identity(page);
  const link = page.locator("a.exam-line").first();
  const href = await link.getAttribute("href");
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(href));
  await sameShell(page);
  const newLink = page.locator("a.exam-line").nth(1);
  const target = await newLink.getAttribute("href");
  const [tab] = await Promise.all([
    context.waitForEvent("page"),
    newLink.click({ modifiers: ["Control"] }),
  ]);
  await expect(tab).toHaveURL(new RegExp(target));
  await sameShell(page);
  await tab.close();
});

test("a superseded qualification request cannot replace a newer selection", async ({
  page,
}) => {
  await page.goto("/inf04/");
  await ready(page);
  await identity(page);
  let release;
  await page.route("**/data/inf03/catalog.json", async (route) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: inf03 });
  });
  await page.getByRole("button", { name: "INF.03", exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole("button", { name: "INF.04", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  release();
  await page.getByRole("button", { name: "INF.03", exact: true }).click();
  await expect(page).toHaveURL("/inf03/");
  await page.getByRole("button", { name: "INF.04", exact: true }).click();
  await expect(page).toHaveURL("/inf04/");
  await sameShell(page);
});

test("initial accepted analytics records the selected task once after consent initialization", async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript(() =>
    localStorage.setItem("examExplorer.analyticsConsent", "accepted"),
  );
  await context.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4330" + taskPath(inf04.tasks[0].id));
  await ready(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.dataLayer ?? []).filter(
            (args) => args[0] === "event" && args[1] === "task_open",
          ).length,
      ),
    )
    .toBe(1);
  await page
    .locator(`a.task-row[href^="${taskPath(inf04.tasks[1].id)}"]`)
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.dataLayer ?? []).filter(
            (args) => args[0] === "event" && args[1] === "task_open",
          ).length,
      ),
    )
    .toBe(2);
  await context.close();
});
