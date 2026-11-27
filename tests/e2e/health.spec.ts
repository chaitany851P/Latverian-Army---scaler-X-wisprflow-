import { expect, test } from "@playwright/test";

test("counter human test bench renders and parses Hinglish sample", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "VoiceKhata" })).toBeVisible();
  await expect(page.getByText(/Draft Card/)).toBeVisible();
});
