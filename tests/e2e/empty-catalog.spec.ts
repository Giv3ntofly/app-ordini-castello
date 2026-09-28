import { test, expect } from "@playwright/test";
import { STORAGE_KEY } from "../../lib/order";
import catalog from "../../data/products.json";

test("catalogo svuotato: elimina le vecchie righe dalla bozza e impedisce il PDF", async ({
  page,
}) => {
  test.skip(
    catalog.length !== 0,
    "Verifica dello stato prima della nuova importazione.",
  );
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          id: "ORD-20260921-0123456789ABCDEF",
          customer: "",
          quantities: { "excel-r2": "3", "excel-r4": "2" },
        }),
      );
    },
    { key: STORAGE_KEY },
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Categorie.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Bozza salvata su questo dispositivo"),
  ).toBeVisible();
  await expect(page.getByTestId("product-card")).toHaveCount(0);
  await expect(
    page.getByTestId("order-items").locator(".order-item"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Scarica PDF", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).quantities,
      STORAGE_KEY,
    ),
  ).toEqual({});
});
