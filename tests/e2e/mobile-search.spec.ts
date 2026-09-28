import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, isMobile: true });

test("la ricerca aggiorna i risultati dopo un tocco su mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const search = page.getByRole("searchbox", {
    name: "Cerca per nome o codice",
  });
  await search.tap();
  await page.keyboard.insertText("acquaragia");

  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(page.getByTestId("product-card")).toHaveAttribute(
    "data-code",
    "009-ABETE-1",
  );

  await search.fill("Diluenti");
  await expect(page.getByTestId("product-card")).toHaveCount(13);
});
