import { expect, test } from "@playwright/test";

test("counter shell renders heading when running", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "VoiceKhata" })).toBeVisible();
});
