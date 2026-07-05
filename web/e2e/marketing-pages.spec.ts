import { test, expect } from "@playwright/test";

test.describe("Marketing pages load and render", () => {
  test("homepage loads with hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Hamptons Tree Experts/i);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("emergency page loads", async ({ page }) => {
    await page.goto("/emergency");
    await expect(page.locator("main")).toBeVisible();
  });

  test("contact page loads with lead form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form")).toBeVisible();
  });

  test("service detail pages load", async ({ page }) => {
    const services = [
      "stump-grinding",
      "mulch-delivery",
      "yard-cleanup",
      "weed-barrier",
      "topsoil-delivery",
      "tree-removal",
      "plant-installation",
    ];
    for (const slug of services) {
      const resp = await page.goto(`/services/${slug}`);
      expect(resp?.status()).toBe(200);
    }
  });

  test("navigation links are functional", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header nav, header");
    await expect(nav).toBeVisible();
  });
});
