import data from "@/data/products.json";
import type { Product } from "@/types/product";
export const products: Product[] = data;
export function searchProducts(list: Product[], query: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("it")
      .trim();
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return list.filter((p) =>
    terms.every((term) =>
      normalize(
        `${p.codice} ${p.nome ?? ""} ${p.descrizione} ${p.categoria ?? ""} ${p.sottocategoria ?? ""}`,
      ).includes(term),
    ),
  );
}
