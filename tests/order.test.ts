import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { searchProducts } from "../lib/catalog";
import products from "./fixtures/products-original.json";
import { orderLines, quantityError, restoreDraft } from "../lib/order";
import { createOrderPdf } from "../lib/pdf";

test("fixture originale: prime 10 righe reali, senza prezzo o storico", () => {
  const report = JSON.parse(readFileSync("reports/import-report.json", "utf8"));
  assert.equal(products.length, 10);
  assert.equal(
    createHash("sha256")
      .update(readFileSync("CASTELLO 2026..XLS"))
      .digest("hex"),
    report.sha256,
  );
  assert.deepEqual(
    products.map((p) => p.fonte.riga),
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  );
  for (const [index, p] of products.entries()) {
    assert.equal(
      p.fonte.ordinamentoOriginale,
      report.righeImportate[index].valoriOriginali.Ordinamento,
    );
    assert.equal(`${p.codice}  ${p.descrizione}`, p.fonte.ordinamentoOriginale);
    assert.equal(p.categoria, null);
    assert.equal(p.sottocategoria, null);
    assert.equal(p.multiploMinimo, null);
    assert.ok(
      !/prezzo|quantitaStorica|QuantitaPeriodo1/i.test(JSON.stringify(p)),
    );
  }
});
test("ricerca per descrizione e codice, senza distinzione maiuscole", () => {
  assert.equal(searchProducts(products, "diluente")[0].codice, "001-70020-1");
  assert.equal(searchProducts(products, "002-606-16cf").length, 1);
  assert.equal(searchProducts(products, "rullino 8005").length, 1);
  assert.equal(searchProducts(products, "inesistente").length, 0);
});
test("ordini per confezioni: 1, 2 e 12 sono validi, nessuna conversione in pezzi", () => {
  for (const p of products.filter((p) => p.confezione)) {
    assert.equal(p.unita, "confezioni");
    for (const v of ["0", "1", "2", "12"])
      assert.equal(quantityError(v, p), null);
    for (const v of ["-1", "1.5", "1,5", "abc", "1e3", "9007199254740992"])
      assert.ok(quantityError(v, p));
  }
  assert.equal(quantityError("3", products[0]), null);
  assert.ok(quantityError("3", { ...products[0], multiploMinimo: 2 }));
});
test("riepilogo: modifica, rimozione, zero e quantità non valide", () => {
  const q = {
    [products[0].id]: "2",
    [products[1].id]: "0",
    [products[2].id]: "1.5",
  };
  assert.equal(orderLines(products, q).length, 1);
  q[products[0].id] = "5";
  assert.equal(orderLines(products, q)[0].quantity, 5);
  delete q[products[0].id];
  assert.equal(orderLines(products, q).length, 0);
});
test("bozza: validazione del contenuto locale e righe non più presenti", () => {
  const draft = {
    version: 1,
    id: "ORD-20260921-0123456789ABCDEF",
    customer: "",
    quantities: { [products[0].id]: "2", unknown: "20" },
  };
  assert.deepEqual(restoreDraft(JSON.stringify(draft), products).quantities, {
    [products[0].id]: "2",
  });
  assert.throws(() => restoreDraft("{", products));
  assert.throws(() =>
    restoreDraft(
      JSON.stringify({ ...draft, quantities: { [products[0].id]: "-3" } }),
      products,
    ),
  );
});
test("PDF: blocca ordine vuoto e quantità non valide", () => {
  const base = {
    id: "ORD-20260921-0123456789ABCDEF",
    date: new Date(2026, 8, 21),
    customer: "",
  };
  assert.throws(() => createOrderPdf({ ...base, lines: [] }));
  assert.throws(() =>
    createOrderPdf({
      ...base,
      lines: [{ product: products[0], quantity: -2 }],
    }),
  );
  assert.throws(() =>
    createOrderPdf({ ...base, lines: [{ product: products[0], quantity: 0 }] }),
  );
});
