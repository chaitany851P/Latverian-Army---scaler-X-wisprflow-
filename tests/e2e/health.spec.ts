import { expect, test } from "@playwright/test";

test("counter human test bench generates bill and saves inspectable offline entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "VoiceKhata" })).toBeVisible();
  await expect(page.getByText(/Draft Card/)).toBeVisible();
  await page.getByRole("button", { name: /Generate Bill/ }).click();
  await expect(page.getByText(/Retail Bill/)).toBeVisible();
});
