import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { products } from "../../lib/catalog";
import { categories, categoryHref } from "../../lib/navigation";
import { STORAGE_KEY } from "../../lib/order";

test("tutte le categorie: ogni prodotto è raggiungibile una sola volta", async ({
  page,
}) => {
  test.setTimeout(120000);
  const seen: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const category of categories) {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Categorie", exact: true })
      .locator(`a[href="${categoryHref(category.nome)}"]`)
      .click();
    for (const sub of category.sottocategorie.length
      ? category.sottocategorie
      : [null]) {
      if (sub) {
        await page.goto(categoryHref(category.nome));
        await page
          .getByRole("navigation", { name: "Sottocategorie", exact: true })
          .locator(`a[href="${categoryHref(category.nome, sub)}"]`)
          .click();
      }
      const expected = products.filter(
        (p) => p.categoria === category.nome && p.sottocategoria === sub,
      );
      const cards = page.getByTestId("product-card");
      await expect(cards).toHaveCount(expected.length);
      for (const p of expected) {
        const card = page.locator(`[data-code="${p.codice}"]`);
        await expect(card.getByRole("heading")).toHaveText(p.descrizione);
      }
      seen.push(
        ...(await cards.evaluateAll((cards) =>
          cards.map((c) => c.getAttribute("data-code")!),
        )),
      );
    }
  }
  expect(seen.sort()).toEqual(products.map((p) => p.codice).sort());
  expect(new Set(seen).size).toBe(156);
  expect(errors).toEqual([]);
});

test("ordine misto: kg decimali, confezioni 60/72, persistenza e PDF", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const kg = products.filter((p) => p.quantitaDecimale);
  const packs = products.filter((p) => /(?:60|72)PZ/.test(p.confezione ?? ""));
  expect(packs).toHaveLength(2);
  await page.goto(categoryHref(kg[0].categoria!, kg[0].sottocategoria!));
  for (const [i, p] of kg.entries()) {
    const input = page
      .locator(`[data-code="${p.codice}"]`)
      .getByRole("textbox");
    await expect(input).toHaveAttribute("inputmode", "decimal");
    await input.fill(i === 0 ? "2,5" : "0.75");
  }
  await mkdir("tmp/qa", { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "tmp/qa/gelcoat-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [i, p] of packs.entries()) {
    await page.goto(categoryHref(p.categoria!, p.sottocategoria!));
    const input = page
      .locator(`[data-code="${p.codice}"]`)
      .getByRole("textbox");
    await input.fill("1,5");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByRole("button", { name: "Scarica PDF", exact: true }),
    ).toBeDisabled();
    await input.fill(String(i + 1));
  }
  await page.reload();
  await expect(
    page.getByTestId("order-items").locator(".order-item"),
  ).toHaveCount(4);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(saved.quantities[kg[0].id]).toBe("2,5");
  expect(saved.quantities[kg[1].id]).toBe("0.75");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF", exact: true }).click();
  await (await download).saveAs("tmp/qa/ordine-misto.pdf");
});

test("PDF completo con tutti i 156 prodotti", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(
    ({ key, quantities }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          id: "ORD-20260921-0123456789ABCDEF",
          customer: "",
          quantities,
        }),
      ),
    {
      key: STORAGE_KEY,
      quantities: Object.fromEntries(
        products.map((p) => [p.id, p.quantitaDecimale ? "2,5" : "1"]),
      ),
    },
  );
  await page.goto("/");
  await expect(
    page.getByTestId("order-items").locator(".order-item"),
  ).toHaveCount(156);
  await mkdir("tmp/qa", { recursive: true });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Scarica PDF", exact: true }).click();
  await (await download).saveAs("tmp/qa/ordine-completo.pdf");
});
