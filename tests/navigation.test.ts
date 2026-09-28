import assert from "node:assert/strict";
import test from "node:test";
import {
  categories,
  categoryHref,
  categorySlug,
  resolveCategoryPath,
  alphabetically,
} from "../lib/navigation";
test("categorie reali in ordine alfabetico e percorsi senza collisioni", () => {
  assert.equal(categories.length, 15);
  assert.deepEqual(
    categories.map((c) => c.nome),
    [
      "Abrasivi",
      "Diluenti",
      "DPI e Varie",
      "Epifanes",
      "Hempel",
      "International",
      "Jotun",
      "Lucidatura",
      "Mascherature",
      "Resine ed Affini",
      "Rulli & Pennelli",
      "Sestriere",
      "Sigillanti",
      "Skipper",
      "Stucchi",
    ],
  );
  assert.equal(new Set(categories.map((c) => categorySlug(c.nome))).size, 15);
  assert.ok(!categories.some((c) => c.nome === "Foglio1"));
});
test("risoluzione categoria e sottocategoria, rifiuto percorsi non presenti", () => {
  assert.equal(
    categoryHref("Rulli & Pennelli", "Pennelli"),
    "/catalogo/rulli-pennelli/pennelli",
  );
  assert.deepEqual(resolveCategoryPath(["rulli-pennelli", "pennelli"]), {
    category: "Rulli & Pennelli",
    subcategory: "Pennelli",
  });
  assert.equal(resolveCategoryPath(["diluenti", "pennelli"]), null);
  assert.equal(resolveCategoryPath(["inesistente"]), null);
  assert.equal(
    resolveCategoryPath(["rulli-pennelli", "pennelli", "altro"]),
    null,
  );
  assert.deepEqual(alphabetically(["Sia", "Norton", "Accessori"]), [
    "Accessori",
    "Norton",
    "Sia",
  ]);
});
