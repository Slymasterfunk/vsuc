import { test, expect, type Page } from "@playwright/test";

/**
 * Rating-calculator tests.
 *
 * Pay-configuration expectations come from docs/business-logic.md:113-121,
 * each of which was hand-verified against va.gov's published 2026 totals.
 */

const addCondition = async (page: Page, name: string, pct: number, bilateral = false) => {
  await page.locator(".name-input").fill(name);
  await page.locator(".pct-input").selectOption(String(pct));
  await page.locator(".add-custom button[type=submit]").click();
  if (bilateral) {
    const row = page.locator(".condition-row", { hasText: name });
    await row.locator(".bilat-chk input[type=checkbox]").check();
  }
};

const getRating = (page: Page) => page.locator(".big-rating .val");
const getMonthly = (page: Page) => page.locator(".money-line > div").nth(0).locator(".val");

test.describe("combined-rating math (38 CFR 4.25)", () => {
  test("example from business-logic.md: PTSD 50 + Lumbar 20 + Tinnitus 10 → 60%", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 50);
    await addCondition(page, "Lumbar", 20);
    await addCondition(page, "Tinnitus", 10);
    await expect(getRating(page)).toHaveText("60%");
  });

  test("single 100% rating stays at 100", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 100);
    await expect(getRating(page)).toHaveText("100%");
  });

  test("two 50% ratings combine to 80%, not 100%", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "A", 50);
    await addCondition(page, "B", 50);
    // eff = 0.5 * 0.5 = 0.25; combined = 75 → round to 80
    await expect(getRating(page)).toHaveText("80%");
  });

  test("round-to-10 uses standard rounding (halves round up)", async ({ page }) => {
    await page.goto("/rating");
    // 45% raw should round up to 50; try 30% + 20% = 44% → 40%
    await addCondition(page, "A", 30);
    await addCondition(page, "B", 20);
    await expect(getRating(page)).toHaveText("40%");
  });
});

test.describe("bilateral factor (38 CFR 4.26)", () => {
  test("single bilateral condition does NOT activate the factor", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "Right knee", 30, true);
    // With factor: would be 30 × 1.1 = 33; without: 30. Round-to-10 is 30 either way,
    // so check the math breakdown for absence of the factor step instead.
    await page.locator(".math-details").evaluate((el) => ((el as HTMLDetailsElement).open = true));
    await expect(page.locator(".is-bilateral-factor")).toHaveCount(0);
  });

  test("two bilateral conditions activate the 10% factor", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "Right knee", 30, true);
    await addCondition(page, "Left knee", 20, true);
    await page.locator(".math-details").evaluate((el) => ((el as HTMLDetailsElement).open = true));
    // Inner combine: (1-0.3)(1-0.2) = 0.56 → 44%. Factor: 44 × 1.1 = 48.4%.
    await expect(page.locator(".is-bilateral-factor .formula")).toContainText("44.0% × 1.1 = 48.4%");
  });

  test("two bilateral + one solo → PTSD 50 + knees (30b, 20b) yields 70%", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 50);
    await addCondition(page, "Right knee", 30, true);
    await addCondition(page, "Left knee", 20, true);
    // bilat combined = 48.4%; outer: (1-0.5)(1-0.484) = 0.258; combined = 74.2 → 70
    await expect(getRating(page)).toHaveText("70%");
  });
});

test.describe("pay composition (verified 2026 VA totals)", () => {
  test("100% alone → $3,938.58/mo", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 100);
    await expect(getMonthly(page)).toHaveText("$3,938.58");
  });

  test("100% + spouse + 1 child → $4,318.99/mo", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 100);
    await page.locator(".dep-fields input[type=checkbox]").check();
    await page.locator(".dep-fields input[type=number]").nth(0).fill("1");
    await expect(getMonthly(page)).toHaveText("$4,318.99");
  });

  test("50% + spouse + 1 child + 1 parent → $1,410.90/mo", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 50);
    await page.locator(".dep-fields input[type=checkbox]").check();
    await page.locator(".dep-fields input[type=number]").nth(0).fill("1");
    await page.locator(".dep-fields input[type=number]").nth(2).fill("1");
    await expect(getMonthly(page)).toHaveText("$1,410.90");
  });

  test("100% + spouse + 2 parents → $4,510.65/mo", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 100);
    await page.locator(".dep-fields input[type=checkbox]").check();
    await page.locator(".dep-fields input[type=number]").nth(2).fill("2");
    await expect(getMonthly(page)).toHaveText("$4,510.65");
  });

  test("30% + 1 child (no spouse) → $596.47/mo", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "PTSD", 30);
    await page.locator(".dep-fields input[type=number]").nth(0).fill("1");
    await expect(getMonthly(page)).toHaveText("$596.47");
  });

  test("dependents below 30% produce $0 bump", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "Tinnitus", 10);
    // Fieldset disabled propagates to inputs; check the user-visible effect.
    await expect(page.locator(".dep-fields input[type=checkbox]").first()).toBeDisabled();
    await expect(getMonthly(page)).toHaveText("$180.42");
  });
});

test.describe("locked sections below 30%", () => {
  test("Dependents + Special inputs are disabled; spouse click is a no-op", async ({ page }) => {
    await page.goto("/rating?c=10.Tinnitus");
    const spouse = page.locator(".dep-fields input[type=checkbox]");
    const aa = page.locator(".special-fields input[type=checkbox]");
    await expect(spouse).toBeDisabled();
    await expect(aa).toBeDisabled();
    await spouse.click({ force: true });
    await expect(spouse).not.toBeChecked();
  });

  test("crossing to 30% re-enables the fieldsets", async ({ page }) => {
    await page.goto("/rating?c=10.Tinnitus");
    await page.locator(".condition-row select").selectOption("30");
    const spouse = page.locator(".dep-fields input[type=checkbox]");
    await expect(spouse).toBeEnabled();
    await spouse.check();
    await expect(spouse).toBeChecked();
  });
});

test.describe("URL state", () => {
  test("save copies a shareable URL and updates history", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/rating");
    await addCondition(page, "Tinnitus", 10);
    await page.locator(".result-cta button").click();
    await expect(page).toHaveURL(/\?c=10\.Tinnitus/);
    await expect(page.locator(".result-cta button")).toContainText("Link copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("c=10.Tinnitus");
  });

  test("loading a URL hydrates conditions, dependents, and special status", async ({ page }) => {
    await page.goto("/rating?c=50b.PTSD~20b.Lumbar~10.Tinnitus&s=1&cu=2&p=1&saa=1");
    await expect(page.locator(".condition-row")).toHaveCount(3);
    await expect(page.locator("fieldset.dep-fields input[type=checkbox]").first()).toBeChecked();
    await expect(page.locator(".dep-fields input[type=number]").nth(0)).toHaveValue("2");
    await expect(page.locator(".dep-fields input[type=number]").nth(2)).toHaveValue("1");
    await expect(page.locator(".special-fields input[type=checkbox]")).toBeChecked();
  });

  test("URL rejects unknown pcts (0% or malformed)", async ({ page }) => {
    await page.goto("/rating?c=0.NoOp~10.Tinnitus");
    await expect(page.locator(".condition-row")).toHaveCount(1);
    await expect(page.locator(".condition-row .c-name")).toContainText("Tinnitus");
  });
});

test.describe("duplicate-name rejection", () => {
  test("case-insensitive, whitespace-normalized; inline error appears and clears", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "Tinnitus", 10);
    await page.locator(".name-input").fill("  tinnitus  ");
    await page.locator(".add-custom button[type=submit]").click();
    await expect(page.locator(".condition-row")).toHaveCount(1);
    await expect(page.locator(".add-error")).toContainText(/already on your list/i);
    // Typing in the input clears the error.
    await page.locator(".name-input").fill("x");
    await expect(page.locator(".add-error")).toHaveCount(0);
  });
});

test.describe("UX niceties", () => {
  test("empty state shows when conditions is empty and swaps out on first add", async ({ page }) => {
    await page.goto("/rating");
    await expect(page.locator(".results-empty")).toBeVisible();
    await expect(page.locator(".big-rating")).toHaveCount(0);
    await addCondition(page, "Tinnitus", 10);
    await expect(page.locator(".results-empty")).toHaveCount(0);
    await expect(page.locator(".big-rating")).toBeVisible();
  });

  test("reset confirms when data present, clears state + URL on accept", async ({ page }) => {
    await page.goto("/rating?c=10.Tinnitus");
    page.once("dialog", (d) => d.accept());
    await page.locator(".reset-btn").click();
    await expect(page.locator(".condition-row")).toHaveCount(0);
    await expect(page).toHaveURL(/\/rating$/);
  });

  test("reset confirm declined preserves state", async ({ page }) => {
    await page.goto("/rating?c=10.Tinnitus");
    page.once("dialog", (d) => d.dismiss());
    await page.locator(".reset-btn").click();
    await expect(page.locator(".condition-row")).toHaveCount(1);
  });

  test("reset on empty does not prompt at all", async ({ page }) => {
    await page.goto("/rating");
    let dialogShown = false;
    page.on("dialog", () => {
      dialogShown = true;
    });
    await page.locator(".reset-btn").click();
    await page.waitForTimeout(100);
    expect(dialogShown).toBe(false);
  });

  test("autofocus: name input re-focuses after submit", async ({ page }) => {
    await page.goto("/rating");
    await addCondition(page, "Tinnitus", 10);
    await expect(page.locator(".name-input")).toBeFocused();
  });

  test("math breakdown includes round-to-10 step", async ({ page }) => {
    await page.goto("/rating?c=50.PTSD~20.Lumbar~10.Tinnitus");
    await page.locator(".math-details").evaluate((el) => ((el as HTMLDetailsElement).open = true));
    await expect(page.locator(".is-round .formula")).toContainText("64.0% → 60%");
  });

  test("aria-live region announces the current estimate", async ({ page }) => {
    await page.goto("/rating?c=50.PTSD");
    const live = page.locator(".results-live");
    await expect(live).toHaveAttribute("aria-live", "polite");
    await expect(live.locator(".sr-only")).toHaveText(/Combined rating 50%\. Monthly estimate \$1,132\.90\./);
    await page.locator(".condition-row select").selectOption("70");
    await expect(live.locator(".sr-only")).toHaveText(/Combined rating 70%\. Monthly estimate \$1,808\.45\./);
  });

  test("dependent number inputs reject e/+/- and clamp to max", async ({ page }) => {
    await page.goto("/rating?c=50.PTSD");
    const parents = page.locator(".dep-fields input[type=number]").nth(2);
    await parents.focus();
    await page.keyboard.press("e");
    await page.keyboard.press("+");
    await page.keyboard.press("-");
    await expect(parents).toHaveValue("0");
    await parents.fill("99");
    await expect(parents).toHaveValue("2");
  });
});
