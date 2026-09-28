import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { OrderDocument } from "@/types/order";
import { dateStamp, quantityNumberError } from "@/lib/order";

export function createOrderPdf(order: OrderDocument) {
  // Revalidate at the export boundary, even when called without the UI.
  if (
    order.lines.some((line) => quantityNumberError(line.quantity, line.product))
  )
    throw new Error("Quantità non valida.");
  const lines = order.lines.filter(
    (line) => line.quantity > 0 && line.product.attivo !== false,
  );
  if (!lines.length)
    throw new Error("Aggiungi almeno un prodotto per creare il PDF.");
  const doc = new jsPDF();
  const margin = 17;
  doc.setFillColor(24, 56, 47);
  doc.rect(0, 0, 210, 7, "F");
  doc.setTextColor(24, 56, 47);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Ordine prodotti", margin, 28);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(65, 72, 68);
  doc.setFontSize(10);
  doc.text(`Numero ordine: ${order.id}`, margin, 40);
  doc.text(`Data: ${order.date.toLocaleDateString("it-IT")}`, margin, 47);
  let startY = 58;
  if (order.customer.trim()) {
    const customerLines = doc.splitTextToSize(
      `Cliente: ${order.customer.trim()}`,
      176,
    );
    doc.text(customerLines, margin, 54);
    startY = 61 + customerLines.length * 5;
  }
  const hasCategories = lines.some(
    (l) => l.product.categoria || l.product.sottocategoria,
  );
  const head = [
    "Codice",
    "Descrizione",
    ...(hasCategories ? ["Categoria / sottocategoria"] : []),
    "Quantità richiesta",
  ];
  const body = lines.map(({ product: p, quantity }) => [
    p.codice,
    p.nome ? `${p.nome}\n${p.descrizione}` : p.descrizione,
    ...(hasCategories
      ? [[p.categoria, p.sottocategoria].filter(Boolean).join(" / ")]
      : []),
    `${quantity.toLocaleString("it-IT", { useGrouping: false, maximumSignificantDigits: 21 })}${p.unita ? ` ${quantity === 1 && p.unita === "confezioni" ? "confezione" : p.unita}` : ""}`,
  ]);
  autoTable(doc, {
    startY,
    head: [head],
    body,
    margin: { left: margin, right: margin, top: 20, bottom: 22 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
      lineColor: [225, 230, 225],
      textColor: [40, 49, 44],
      overflow: "linebreak",
    },
    headStyles: { fillColor: [24, 56, 47], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 245] },
    columnStyles: {
      0: { cellWidth: 41 },
      [head.length - 1]: { cellWidth: 33, halign: "right" },
    },
    rowPageBreak: "avoid",
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 103);
    doc.text(`Ordine ${order.id}`, margin, 284);
    doc.text(`${page} / ${pages}`, 193, 284, { align: "right" });
  }
  return {
    blob: doc.output("blob"),
    filename: `ordine-${dateStamp(order.date)}.pdf`,
  };
}
