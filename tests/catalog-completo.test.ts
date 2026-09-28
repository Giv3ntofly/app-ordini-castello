import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../lib/catalog";
import { quantityError, orderLines, restoreDraft } from "../lib/order";
import { createOrderPdf } from "../lib/pdf";
import report from "../reports/import-completo.json";

test("catalogo completo: 156 prodotti, 15 categorie, 21 sottocategorie e provenienza", () => {
  const counts = {
    Diluenti: 11,
    "Rulli & Pennelli": 19,
    Mascherature: 14,
    Abrasivi: 30,
    "Resine ed Affini": 13,
    Lucidatura: 4,
    Sigillanti: 8,
    Jotun: 5,
    Epifanes: 3,
    Skipper: 14,
    Stucchi: 6,
    Sestriere: 9,
    Hempel: 2,
    International: 3,
    "DPI e Varie": 15,
  };
  assert.equal(products.length, 156);
  assert.equal(new Set(products.map((p) => p.codice)).size, 156);
  assert.equal(new Set(products.map((p) => p.id)).size, 156);
  assert.equal(
    new Set(
      products
        .filter((p) => p.sottocategoria)
        .map((p) => `${p.categoria}/${p.sottocategoria}`),
    ).size,
    21,
  );
  assert.deepEqual(report.fogliEsclusi, ["Foglio1"]);
  for (const [category, count] of Object.entries(counts)) {
    const list = products.filter((p) => p.categoria === category);
    assert.equal(list.length, count, category);
    const sheet = report.fogli.find((s) => s.foglio === category)!;
    assert.equal(sheet.righeImportate.length, count);
    for (const p of list) {
      const row = sheet.righeImportate.find(
        (r) => r.rigaExcel === p.fonte.riga,
      )!;
      assert.equal(p.fonte.foglio, category);
      assert.equal(row.codice, p.codice);
      assert.equal(row.sottocategoria, p.sottocategoria);
      assert.equal(
        row.valoriOriginali.Ordinamento,
        p.fonte.ordinamentoOriginale,
      );
      const [code, ...description] =
        row.valoriOriginali.Ordinamento.split("  ");
      assert.equal(code, p.codice);
      assert.equal(description.join("  "), p.descrizione);
      assert.ok(
        !/prezzo|QuantitaPeriodo1|quantitaStorica/i.test(JSON.stringify(p)),
      );
    }
  }
});

test("48 articoli CF: ordine a confezioni intere, inclusi 60 e 72 pezzi", () => {
  const packs = products.filter((p) => p.confezione);
  assert.equal(packs.length, 48);
  assert.ok(packs.some((p) => /60/.test(p.confezione!)));
  assert.ok(packs.some((p) => /72/.test(p.confezione!)));
  for (const p of packs) {
    assert.equal(p.unita, "confezioni");
    assert.equal(p.multiploMinimo, null);
    assert.ok(p.descrizione.includes(p.confezione!));
    assert.equal(quantityError("1", p), null);
    assert.ok(quantityError("1,5", p));
    assert.ok(quantityError("1.5", p));
  }
});

test("gelcoat: kg liberi con virgola o punto, bozza e PDF", () => {
  const kg = products.filter((p) => p.quantitaDecimale);
  assert.deepEqual(
    kg.map((p) => p.codice),
    ["021-NGA8533-1", "033-GELNGAC-1"],
  );
  for (const p of kg) {
    assert.equal(p.unita, "kg");
    assert.match(p.descrizione, /KG\.$/);
    for (const q of ["0", "0,001", "0.75", "2,5", "12"])
      assert.equal(quantityError(q, p), null);
    for (const q of ["-1", "2,", "1e3", "NaN", "1,2.3"])
      assert.ok(quantityError(q, p));
  }
  const quantities = { [kg[0].id]: "2,5", [kg[1].id]: "0.75" };
  const draft = restoreDraft(
    JSON.stringify({
      version: 1,
      id: "ORD-20260921-0123456789ABCDEF",
      customer: "",
      quantities,
    }),
    products,
  );
  assert.deepEqual(draft.quantities, quantities);
  const lines = orderLines(products, draft.quantities);
  assert.deepEqual(
    lines.map((l) => l.quantity),
    [2.5, 0.75],
  );
  const order = { id: draft.id, customer: "", date: new Date(), lines };
  assert.ok(createOrderPdf(order).blob.size > 0);
  assert.throws(() =>
    createOrderPdf({
      ...order,
      lines: [{ product: products.find((p) => p.confezione)!, quantity: 1.5 }],
    }),
  );
});
