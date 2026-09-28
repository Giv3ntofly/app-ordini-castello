import type { Metadata, Viewport } from "next";
import { assetPath } from "@/lib/asset-path";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ordini | Catalogo prodotti",
  description: "Consulta i prodotti e prepara il tuo ordine.",
  icons: { icon: assetPath("/icon.svg") },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18382f",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body
        style={
          {
            "--category-photo-grid": `url(${assetPath("/brand/category-photo-grid.png")})`,
            "--nsp-logo": `url(${assetPath("/brand/nsp-logo.png")})`,
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
