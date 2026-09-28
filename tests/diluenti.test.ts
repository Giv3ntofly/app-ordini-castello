import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { products as catalogProducts } from "../lib/catalog";
const products = catalogProducts.filter((p) => p.categoria === "Diluenti");
import { restoreDraft } from "../lib/order";

test("Diluenti: undici codici approvati, valori originali, un solo foglio", () => {
  const report = JSON.parse(
    readFileSync("reports/import-diluenti.json", "utf8"),
  );
  assert.deepEqual(
    products.map((p) => p.codice),
    [
      "009-ABETE-1",
      "009-ACETONEL-5",
      "009-ALCOOL-0.75",
      "009-ANTIS-1",
      "009-ANTIS-5",
      "009-DILE-5",
      "009-DILN-1",
      "009-DILN-25",
      "009-DILN-5",
      "122-ACETONE-25",
      "009-3666-4",
    ],
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync("CASTELLO 2026.rev.1.XLS"))
      .digest("hex"),
    report.sha256,
  );
  assert.equal(new Set(products.map((p) => p.id)).size, 11);
  products.forEach((p, i) => {
    assert.equal(p.categoria, "Diluenti");
    assert.equal(p.fonte.foglio, "Diluenti");
    assert.equal(p.fonte.riga, i + 2);
    assert.equal(p.sottocategoria, null);
    assert.equal(p.unita, null);
    assert.equal(p.multiploMinimo, null);
    assert.equal(
      p.fonte.ordinamentoOriginale,
      report.righeImportate[i].valoriOriginali.Ordinamento,
    );
    assert.equal(`${p.codice}  ${p.descrizione}`, p.fonte.ordinamentoOriginale);
    assert.ok(
      !/prezzo|quantitaStorica|QuantitaPeriodo1/i.test(JSON.stringify(p)),
    );
  });
});
test("le quantità del vecchio catalogo non si associano ai nuovi prodotti", () => {
  const old = {
    version: 1,
    id: "ORD-20260921-0123456789ABCDEF",
    customer: "",
    quantities: { "excel-r2": "9" },
  };
  assert.deepEqual(restoreDraft(JSON.stringify(old), products).quantities, {});
});
test("importatore: Foglio1 non è ammesso e il catalogo rimane invariato", () => {
  const before = readFileSync("data/products.json", "utf8");
  const result = spawnSync(
    process.execPath,
    ["scripts/import-excel.mjs", "--sheet", "Foglio1"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /invalid choice/);
  assert.equal(readFileSync("data/products.json", "utf8"), before);
});
