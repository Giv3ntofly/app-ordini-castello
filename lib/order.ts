import type { Product } from "@/types/product";
import type { OrderDraft, OrderLine, Quantities } from "@/types/order";
export const STORAGE_KEY = "app-ordini:draft:v1";
export function quantityValue(value: string = ""): number {
  return Number(value.replace(",", "."));
}
export function quantityNumberError(
  amount: number,
  product: Product,
): string | null {
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > Number.MAX_SAFE_INTEGER
  )
    return "Inserisci una quantità valida maggiore o uguale a zero.";
  if (!product.quantitaDecimale && !Number.isSafeInteger(amount))
    return "Inserisci un numero intero positivo o zero.";
  if (product.multiploMinimo && amount % product.multiploMinimo !== 0)
    return `Inserisci un multiplo di ${product.multiploMinimo}.`;
  return null;
}
export function quantityError(value: string, product: Product): string | null {
  if (value === "") return null;
  const pattern = product.quantitaDecimale ? /^\d+(?:[.,]\d+)?$/ : /^\d+$/;
  if (!pattern.test(value))
    return product.quantitaDecimale
      ? "Inserisci i kg, anche con decimali (es. 2,5)."
      : "Inserisci un numero intero positivo o zero.";
  return quantityNumberError(quantityValue(value), product);
}
export function orderLines(
  products: Product[],
  quantities: Quantities,
): OrderLine[] {
  return products
    .filter(
      (p) =>
        p.attivo !== false &&
        !quantityError(quantities[p.id] ?? "", p) &&
        quantityValue(quantities[p.id]) > 0,
    )
    .map((product) => ({
      product,
      quantity: quantityValue(quantities[product.id]),
    }));
}
export function dateStamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function newOrderId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `ORD-${dateStamp(new Date()).replaceAll("-", "")}-${Array.from(
    bytes,
    (b) => b.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase()}`;
}
export function restoreDraft(raw: string, products: Product[]): OrderDraft {
  const data = JSON.parse(raw);
  if (
    data?.version !== 1 ||
    typeof data.customer !== "string" ||
    data.customer.length > 100 ||
    typeof data.id !== "string" ||
    !/^ORD-\d{8}-[A-F0-9]{16}$/.test(data.id) ||
    !data.quantities ||
    typeof data.quantities !== "object" ||
    Array.isArray(data.quantities)
  )
    throw new Error("Bozza non valida");
  const quantities: Quantities = {};
  for (const product of products) {
    const value = data.quantities[product.id];
    if (value === undefined) continue;
    if (typeof value !== "string" || quantityError(value, product))
      throw new Error("Quantità salvata non valida");
    if (quantityValue(value) > 0 && product.attivo !== false)
      quantities[product.id] = value;
  }
  return { version: 1, id: data.id, customer: data.customer, quantities };
}
