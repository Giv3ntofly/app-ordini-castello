import type { Product } from "./product";
export type Quantities = Record<string, string>;
export interface OrderLine {
  product: Product;
  quantity: number;
}
export interface OrderDocument {
  id: string;
  date: Date;
  customer: string;
  lines: OrderLine[];
}
export interface OrderDraft {
  version: 1;
  id: string;
  customer: string;
  quantities: Quantities;
}
