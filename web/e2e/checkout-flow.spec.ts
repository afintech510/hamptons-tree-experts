import { test, expect } from "@playwright/test";

test.describe("BIN checkout flow — UI navigation", () => {
  test("configure page loads for stump grinding", async ({ page }) => {
    await page.goto("/book/configure?service=stump-grinding");
    await expect(page.locator("main")).toBeVisible();
  });

  test("configure page loads for mulch delivery", async ({ page }) => {
    await page.goto("/book/configure?service=mulch-delivery");
    await expect(page.locator("main")).toBeVisible();
  });

  test("configure page loads for yard cleanup", async ({ page }) => {
    await page.goto("/book/configure?service=yard-cleanup");
    await expect(page.locator("main")).toBeVisible();
  });

  test("checkout page loads", async ({ page }) => {
    await page.goto("/book/checkout");
    await expect(page.locator("main")).toBeVisible();
  });

  test("estimate checkout page loads", async ({ page }) => {
    await page.goto("/book/estimate-checkout");
    await expect(page.locator("main")).toBeVisible();
  });

  test("authorize checkout page loads", async ({ page }) => {
    await page.goto("/book/authorize-checkout");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Confirmation page", () => {
  test("confirmation page loads", async ({ page }) => {
    await page.goto("/book/confirmation");
    await expect(page.locator("main")).toBeVisible();
  });
});
