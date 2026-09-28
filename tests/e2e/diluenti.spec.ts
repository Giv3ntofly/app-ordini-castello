import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import catalog from "../../data/products.json";
import { STORAGE_KEY } from "../../lib/order";

test("Diluenti: catalogo, categoria, bozza, ricerca e PDF", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(
    ({ key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            id: "ORD-20260921-0123456789ABCDEF",
            customer: "",
            quantities: { "excel-r2": "8" },
          }),
        );
    },
    { key: STORAGE_KEY },
  );
  await page.goto("/");
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Categorie", exact: true })
    .getByRole("link", { name: "Diluenti 11 prodotti", exact: true })
    .click();
  await expect(page).toHaveURL(/\/catalogo\/diluenti$/);
  await expect(page.getByTestId("product-card")).toHaveCount(11);
  await expect(
    page.getByText("Bozza salvata su questo dispositivo"),
  ).toBeVisible();
  await expect(
    page.getByTestId("order-items").locator(".order-item"),
  ).toHaveCount(0);
  await expect(
    page.getByText("Categorie e sottocategorie non sono presenti", {
      exact: false,
    }),
  ).toHaveCount(0);
  for (const p of catalog.filter((p) => p.categoria === "Diluenti"))
    await expect(
      page.locator(`[data-code="${p.codice}"]`).getByRole("heading"),
    ).toHaveText(p.descrizione);
  const search = page.getByRole("textbox", { name: "Cerca per nome o codice" });
  await search.fill("acquaragia");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await search.fill("009-ALCOOL-0.75");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(
    page.getByTestId("product-card").getByRole("heading"),
  ).toHaveText("ALCOOL 94 LT.1");
  await search.fill("");
  const first = page.locator('[data-code="009-ABETE-1"]').getByRole("textbox");
  await first.fill("2");
  await page.getByTestId("order-items").getByRole("textbox").fill("3");
  await expect(first).toHaveValue("3");
  await page.reload();
  await expect(first).toHaveValue("3");
  await page
    .getByTestId("order-items")
    .getByRole("button", { name: "Rimuovi 009-ABETE-1" })
    .click();
  await expect(first).toHaveValue("");
  for (const card of await page.getByTestId("product-card").all())
    await card.getByRole("textbox").fill("1");
  await mkdir("tmp/qa", { recursive: true });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF", exact: true }).click();
  await (await download).saveAs("tmp/qa/ordine-diluenti.pdf");
  await page.screenshot({
    path: "tmp/qa/diluenti-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "tmp/qa/diluenti-mobile.png" });
  await page.locator(".mobile-order-bar").click();
  await expect(
    page.getByTestId("order-items").locator(".order-item"),
  ).toHaveCount(11);
  expect(errors).toEqual([]);
});
