import data from "@/data/categories.json";

export function alphabetically(names: string[]) {
  return [...names].sort((a, b) =>
    a.localeCompare(b, "it", { sensitivity: "base" }),
  );
}
export function categorySlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const categories = [...data].sort((a, b) =>
  a.nome.localeCompare(b.nome, "it", { sensitivity: "base" }),
);
export function categoryHref(category: string, subcategory?: string) {
  return (
    "/catalogo/" +
    categorySlug(category) +
    (subcategory ? "/" + categorySlug(subcategory) : "")
  );
}
export function resolveCategoryPath(segments: string[]) {
  if (segments.length < 1 || segments.length > 2) return null;
  const category = categories.find((c) => categorySlug(c.nome) === segments[0]);
  if (!category) return null;
  const subcategory = segments[1]
    ? category.sottocategorie.find((s) => categorySlug(s) === segments[1])
    : undefined;
  if (segments.length === 2 && !subcategory) return null;
  return { category: category.nome, subcategory };
}
