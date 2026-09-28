import { notFound } from "next/navigation";
import { CatalogApp } from "@/components/catalog-app";
import { products } from "@/lib/catalog";
import { resolveCategoryPath } from "@/lib/navigation";

export function generateStaticParams() {
  const { categories, categorySlug } = require("@/lib/navigation") as typeof import("@/lib/navigation");
  return categories.flatMap((category) => [
    { segments: [categorySlug(category.nome)] },
    ...category.sottocategorie.map((subcategory) => ({ segments: [categorySlug(category.nome), categorySlug(subcategory)] })),
  ]);
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const selection = resolveCategoryPath(segments);
  if (!selection) notFound();
  return (
    <CatalogApp
      products={products}
      categoryName={selection.category}
      subcategoryName={selection.subcategory}
    />
  );
}
