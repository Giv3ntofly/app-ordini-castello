import { CatalogApp } from "@/components/catalog-app";
import { products } from "@/lib/catalog";

export default function Page() {
  return <CatalogApp products={products} />;
}
