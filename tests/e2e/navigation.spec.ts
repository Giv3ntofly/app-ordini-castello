import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { categories } from "../../lib/navigation";

test("categorie alfabetiche, sottocategorie, ritorno e ordine conservato", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const list = page.getByRole("navigation", { name: "Categorie", exact: true });
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await expect(list.getByRole("link")).toHaveCount(15);
  expect(await list.locator("strong").allTextContents()).toEqual(
    categories.map((c) => c.nome),
  );
  await mkdir("tmp/qa", { recursive: true });
  await page.screenshot({
    path: "tmp/qa/categories-desktop.png",
    fullPage: true,
  });
  await list
    .getByRole("link", { name: "Diluenti 11 prodotti", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo\/diluenti$/);
  await expect(page.getByTestId("product-card")).toHaveCount(11);
  await page
    .locator('[data-code="009-ABETE-1"]')
    .getByRole("textbox")
    .fill("2");
  await page
    .getByRole("navigation", { name: "Percorso" })
    .getByRole("link", { name: "Categorie", exact: true })
    .click();
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await expect(
    page.getByTestId("order-items").getByRole("textbox"),
  ).toHaveValue("2");
  await list
    .getByRole("link", {
      name: "Rulli & Pennelli 2 sottocategorie",
      exact: true,
    })
    .click();
  const subs = page.getByRole("navigation", {
    name: "Sottocategorie",
    exact: true,
  });
  await expect(subs.locator("strong")).toHaveCount(2);
  expect(await subs.locator("strong").allTextContents()).toEqual([
    "Pennelli",
    "Rullini",
  ]);
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await subs
    .getByRole("link", {
      name: "Pennelli 11 prodotti",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/catalogo\/rulli-pennelli\/pennelli$/);
  await expect(page.getByTestId("product-card")).toHaveCount(11);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pennelli.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("order-items").getByRole("textbox"),
  ).toHaveValue("2");
  await page.goBack();
  await expect(subs.getByRole("link")).toHaveCount(2);
  await page
    .getByRole("navigation", { name: "Percorso" })
    .getByRole("link", { name: "Categorie", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "tmp/qa/categories-mobile.png",
    fullPage: true,
  });
  await list
    .getByRole("link", { name: "Abrasivi 3 sottocategorie", exact: true })
    .click();
  await expect(subs.locator("strong")).toHaveCount(3);
  expect(await subs.locator("strong").allTextContents()).toEqual([
    "Accessori",
    "Norton",
    "Sia",
  ]);
  await page.screenshot({ path: "tmp/qa/subcategories-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const bad = await page.goto("/catalogo/inesistente");
  expect(bad?.status()).toBe(404);
});
