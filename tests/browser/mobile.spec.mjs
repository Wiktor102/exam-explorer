import { test, expect } from "@playwright/test";

test("privacy settings do not cover the mobile footer after declining consent", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await page.getByRole("button", { name: "Nie, dziękuję" }).click();
  const settings = page.getByRole("button", { name: "Otwórz ustawienia prywatności" });
  await expect(settings).toBeVisible();
  await page.locator(".landing-footer").scrollIntoViewIfNeeded();
  const button = await settings.boundingBox();
  const text = await page.locator(".landing-footer__updated").boundingBox();
  expect(button.x).toBeGreaterThanOrEqual(text.x + text.width);
  await settings.click();
  await expect(page.getByRole("button", { name: "Zamknij ustawienia prywatności" })).toBeVisible();
});

test("expanded filters leave exam rows reachable on a small phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    localStorage.setItem("examExplorer.analyticsConsent", "rejected");
  });
  await page.goto("/inf04/");
  await page.locator('astro-island[component-url*="/App."]:not([ssr])').waitFor();
  await page.getByRole("button", { name: "Pokaż filtry" }).click();
  const rows = page.locator(".exam-list");
  expect(await rows.evaluate((node) => node.clientHeight)).toBeGreaterThan(100);
  const lastExam = rows.getByRole("link").last();
  await lastExam.scrollIntoViewIfNeeded();
  await lastExam.click();
  await expect(page).toHaveURL(/\/inf04\/arkusze\//);
  await expect(page.locator(".detail-pane")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
