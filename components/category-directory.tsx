import Link from "next/link";
import {
  ArrowRight,
  Brush,
  CircleDot,
  Droplets,
  Hand,
  Paintbrush,
  ShieldCheck,
  ShipWheel,
  Sparkles,
  SprayCan,
  Tag,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { alphabetically, categories, categoryHref } from "@/lib/navigation";
import { assetPath } from "@/lib/asset-path";
import type { Product } from "@/types/product";

const visuals: Record<
  string,
  {
  Icon: LucideIcon;
  label: string;
  tone?: string;
  logo?: string;
  photo?: boolean;
  empty?: boolean;
  }
> = {
  Diluenti: {
    Icon: SprayCan,
    label: "Diluente",
    tone: "photo photo-thinners",
    photo: true,
  },
  "Rulli & Pennelli": {
    Icon: Paintbrush,
    label: "Pennello",
    tone: "photo photo-brushes",
    photo: true,
  },
  Mascherature: {
    Icon: Tag,
    label: "Nastro",
    tone: "photo photo-masking",
    photo: true,
  },
  Abrasivi: {
    Icon: CircleDot,
    label: "Disco abrasivo",
    tone: "photo photo-abrasives",
    photo: true,
  },
  "Resine ed Affini": {
    Icon: Droplets,
    label: "Resina",
    tone: "photo photo-resin",
    photo: true,
  },
  Lucidatura: {
    Icon: Sparkles,
    label: "Lucidatura",
    tone: "photo photo-polishing",
    photo: true,
  },
  Sigillanti: {
    Icon: SprayCan,
    label: "Sigillante",
    tone: "photo photo-sealants",
    photo: true,
  },
  Jotun: {
    Icon: ShipWheel,
    label: "Jotun",
    tone: "brand-logo jotun",
    logo: "/brands/jotun.svg",
  },
  Epifanes: {
    Icon: ShipWheel,
    label: "Epifanes",
    tone: "brand-logo epifanes",
    logo: "/brands/epifanes.png",
  },
  Skipper: {
    Icon: ShipWheel,
    label: "Skipper's Yachting Line",
    tone: "brand-logo skipper",
    logo: "/brands/skippers.jpg",
  },
  Stucchi: {
    Icon: Hand,
    label: "Stucchi ICR",
    tone: "brand-logo icr",
    logo: "/brands/icr.png",
  },
  Sestriere: {
    Icon: Brush,
    label: "Vernice",
    tone: "brand-logo sestriere",
    logo: "/brands/sestriere.png",
  },
  Hempel: {
    Icon: ShipWheel,
    label: "Hempel",
    tone: "brand-logo hempel",
    logo: "/brands/hempel.png",
  },
  International: {
    Icon: ShipWheel,
    label: "International",
    tone: "brand-logo international",
    logo: "/brands/international.png",
  },
  "DPI e Varie": {
    Icon: ShieldCheck,
    label: "Protezione",
    tone: "photo photo-dpi",
    photo: true,
  },
} as const;

export function CategoryDirectory({
  category,
  products,
}: {
  category?: string;
  products: Product[];
}) {
  const selected = categories.find((c) => c.nome === category);
  const entries = selected
    ? alphabetically(selected.sottocategorie).map((name) => ({
        name,
        href: categoryHref(selected.nome, name),
        subcategories: 0,
        count: products.filter(
          (p) => p.categoria === selected.nome && p.sottocategoria === name,
        ).length,
      }))
    : categories.map((c) => ({
        name: c.nome,
        href: categoryHref(c.nome),
        subcategories: c.sottocategorie.length,
        count: products.filter((p) => p.categoria === c.nome).length,
      }));
  return (
    <nav
      aria-label={selected ? "Sottocategorie" : "Categorie"}
      className="category-directory"
    >
      <ul>
        {entries.map((entry) => (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="directory-link"
              data-testid="directory-link"
            >
              {(() => {
                const visual = visuals[entry.name as keyof typeof visuals];
                const isJotunStucchi =
                  selected?.nome === "Jotun" && entry.name === "Stucchi";
                if (isJotunStucchi)
                  return (
                    <span className="directory-icon teal">
                      <Hand size={25} strokeWidth={1.7} />
                    </span>
                  );
                if (visual?.empty) return null;
                return (
                  <span
                    className={`directory-icon ${visual?.tone ?? "teal"}`}
                  >
                    {(() => {
                  if (visual?.logo)
                    return <img src={assetPath(visual.logo)} alt="" aria-hidden="true" />;
                  if (visual?.photo) return null;
                  const Icon = visual?.Icon ?? Wrench;
                  return <Icon size={25} strokeWidth={1.7} />;
                    })()}
                  </span>
                );
              })()}
              <span className="directory-name">
                <strong>{entry.name}</strong>
                <small>
                  {entry.subcategories
                    ? `${entry.subcategories} sottocategorie`
                    : entry.count
                      ? `${entry.count} prodotti`
                      : "Nessun prodotto disponibile"}
                </small>
              </span>
              <ArrowRight size={20} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
