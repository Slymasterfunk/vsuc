import { test, expect, type Page } from "@playwright/test";

async function fillRequired(page: Page, overrides: Partial<Record<string, string>> = {}) {
  await page.getByLabel("First name").fill(overrides.firstName ?? "Jordan");
  await page.getByLabel("Last name").fill(overrides.lastName ?? "Reyes");
  await page.getByLabel("Email").fill(overrides.email ?? "jordan@example.com");
  await page.getByLabel("State").selectOption(overrides.state ?? "TX");
  await page
    .getByLabel("Tell us a bit")
    .fill(overrides.message ?? "I separated last year and I'm not sure where to start.");
}

async function waitForTurnstileIfPresent(page: Page) {
  const isConfigured = await page
    .locator(".turnstile-missing")
    .count()
    .then((n) => n === 0);
  if (!isConfigured) return;
  await page.waitForFunction(
    () => {
      const input = document.querySelector(
        'input[name="cf-turnstile-response"]',
      ) as HTMLInputElement | null;
      return !!input && input.value.length > 0;
    },
    { timeout: 15_000 },
  );
}

async function submitForm(page: Page) {
  await waitForTurnstileIfPresent(page);
  await page.getByRole("button", { name: /Send note/ }).click();
}

test.describe("Contact form", () => {
  test("renders the form with state select and Send note button", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Write to us." })).toBeVisible();
    await expect(page.getByLabel("State")).toBeVisible();
    await expect(page.getByRole("button", { name: /Send note/ })).toBeVisible();
  });

  test("excluded state shows inline warning and disables submit", async ({ page }) => {
    await page.goto("/contact");
    await fillRequired(page, { state: "NY" });
    await expect(page.getByTestId("excluded-note")).toBeVisible();
    await expect(page.getByRole("button", { name: /Send note/ })).toBeDisabled();
  });

  test("non-excluded state keeps submit enabled and hides warning", async ({ page }) => {
    await page.goto("/contact");
    await fillRequired(page, { state: "TX" });
    await expect(page.getByTestId("excluded-note")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Send note/ })).toBeEnabled();
  });

  test("successful submit swaps to the success card", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );

    await page.goto("/contact");
    await fillRequired(page);
    await submitForm(page);

    await expect(page.getByTestId("send-success")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("heading", { name: "We got it." })).toBeVisible();
  });

  test("server error renders inline error region", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Couldn't send right now" }),
      }),
    );

    await page.goto("/contact");
    await fillRequired(page);
    await submitForm(page);

    await expect(page.getByTestId("send-error")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("send-error")).toContainText(/Couldn't send/);
  });

  test("submit button shows Sending… during inflight", async ({ page }) => {
    let resolveRoute: (() => void) | null = null;
    const routePromise = new Promise<void>((r) => {
      resolveRoute = r;
    });
    await page.route("**/api/contact", async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/contact");
    await fillRequired(page);
    await submitForm(page);

    await expect(page.getByRole("button", { name: /Sending/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sending/ })).toBeDisabled();

    resolveRoute?.();
    await expect(page.getByTestId("send-success")).toBeVisible({ timeout: 5_000 });
  });
});
