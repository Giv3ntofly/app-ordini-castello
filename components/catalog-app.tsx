"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  Camera,
  Check,
  CheckCheck,
  ClipboardList,
  FileText,
  Info,
  LayoutGrid,
  Package,
  Search,
  Share2,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import type { Product } from "@/types/product";
import type { Quantities } from "@/types/order";
import { searchProducts } from "@/lib/catalog";
import {
  deleteProductPhoto,
  loadProductPhotos,
  saveProductPhoto,
} from "@/lib/product-photos";
import {
  newOrderId,
  orderLines,
  quantityError,
  quantityValue,
  restoreDraft,
  STORAGE_KEY,
} from "@/lib/order";
import { createOrderPdf } from "@/lib/pdf";
import { QuantityInput } from "./quantity-input";
import { ConfirmDialog } from "./confirm-dialog";
import { CategoryDirectory } from "./category-directory";
import { categories, categoryHref } from "@/lib/navigation";
import { assetPath } from "@/lib/asset-path";

export function CatalogApp({
  products,
  categoryName = "",
  subcategoryName = "",
}: {
  products: Product[];
  categoryName?: string;
  subcategoryName?: string;
}) {
  const [query, setQuery] = useState("");
  const category = categoryName;
  const [onlySelected, setOnlySelected] = useState(false);
  const [quantities, setQuantities] = useState<Quantities>({});
  const [customer, setCustomer] = useState("");
  const [id, setId] = useState("");
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [mobileOrder, setMobileOrder] = useState(false);
  const [productPhotos, setProductPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    setQuery("");
    setOnlySelected(false);
    setMobileOrder(false);
  }, [categoryName, subcategoryName]);
  useEffect(() => {
    let restoredId = newOrderId();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = restoreDraft(saved, products);
        setQuantities(draft.quantities);
        setCustomer(draft.customer);
        restoredId = draft.id;
      }
    } catch {
      setStorageMessage(
        "La bozza precedente non è accessibile o non è valida. Puoi creare un nuovo ordine.",
      );
    }
    setId(restoredId);
    setReady(true);
    try {
      setCanShare(
        !!navigator.canShare?.({
          files: [new File([""], "ordine.pdf", { type: "application/pdf" })],
        }),
      );
    } catch {
      setCanShare(false);
    }
  }, [products]);
  useEffect(() => {
    loadProductPhotos()
      .then(setProductPhotos)
      .catch(() =>
        setStorageMessage(
          "Le foto dei prodotti non sono accessibili in questo browser.",
        ),
      );
  }, []);
  const hasErrors = products.some((p) =>
    quantityError(quantities[p.id] ?? "", p),
  );
  useEffect(() => {
    if (!ready || hasErrors) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, id, customer, quantities }),
      );
    } catch {
      setStorageMessage(
        "Salvataggio nel browser non disponibile. Mantieni aperta questa pagina fino al download del PDF.",
      );
    }
  }, [ready, id, customer, quantities, hasErrors]);
  useEffect(() => {
    if (!mobileOrder || !window.matchMedia("(max-width: 760px)").matches)
      return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("order-heading")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOrder(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOrder]);
  const active = useMemo(
    () =>
      products
        .filter((p) => p.attivo !== false)
        .sort(
          (a, b) =>
            (a.ordineVisualizzazione ?? a.fonte.riga) -
            (b.ordineVisualizzazione ?? b.fonte.riga),
        ),
    [products],
  );
  const lines = orderLines(active, quantities);
  // Keep a row mounted while its quantity is being edited, including a blank
  // or invalid intermediate value. Only validated positive lines enter the PDF.
  const summaryProducts = active.filter((p) =>
    Object.prototype.hasOwnProperty.call(quantities, p.id),
  );
  const selectedCount = lines.length;
  const subcategories =
    categories.find((c) => c.nome === category)?.sottocategorie ?? [];
  const showDirectory =
    !onlySelected &&
    !query.trim() &&
    (!category || (!subcategoryName && subcategories.length > 0));
  const scopeProducts = active.filter(
    (p) =>
      (!category || p.categoria === category) &&
      (!subcategoryName || p.sottocategoria === subcategoryName),
  );
  const visible = searchProducts(active, query).filter(
    (p) =>
      (onlySelected ||
        ((!category || p.categoria === category) &&
          (!subcategoryName || p.sottocategoria === subcategoryName))) &&
      (!onlySelected || quantityValue(quantities[p.id]) > 0),
  );
  const groups = visible.reduce<Record<string, Product[]>>((acc, p) => {
    const key = [p.categoria, p.sottocategoria].filter(Boolean).join(" / ");
    (acc[key] ??= []).push(p);
    return acc;
  }, {});
  function updateQuantity(productId: string, value: string) {
    setQuantities((old) => ({ ...old, [productId]: value }));
    setNotice("");
  }
  function remove(product: Product) {
    setQuantities((old) => {
      const copy = { ...old };
      delete copy[product.id];
      return copy;
    });
    setNotice(`${product.codice} rimosso dall’ordine.`);
  }
  async function addProductPhoto(product: Product, file?: File) {
    if (!file) return;
    try {
      const photo = await saveProductPhoto(product.codice, file);
      setProductPhotos((current) => ({ ...current, [product.codice]: photo }));
      setNotice(`Foto aggiunta a ${product.codice}.`);
    } catch {
      setNotice("Impossibile salvare la foto. Riprova con un'immagine piÃ¹ piccola.");
    }
  }
  async function removeProductPhoto(product: Product) {
    try {
      await deleteProductPhoto(product.codice);
      setProductPhotos((current) => {
        const next = { ...current };
        delete next[product.codice];
        return next;
      });
      setNotice(`Foto rimossa da ${product.codice}.`);
    } catch {
      setNotice("Impossibile rimuovere la foto. Riprova.");
    }
  }
  async function exportPdf(share = false) {
    if (!lines.length || hasErrors || busy || !ready) return;
    setBusy(true);
    setNotice("");
    try {
      const { blob, filename } = createOrderPdf({
        id,
        date: new Date(),
        customer,
        lines,
      });
      if (share) {
        const file = new File([blob], filename, { type: "application/pdf" });
        if (!navigator.canShare?.({ files: [file] }))
          throw new Error("Condivisione non disponibile: usa Scarica PDF.");
        await navigator.share({ files: [file], title: "Ordine prodotti" });
        setNotice("Condivisione completata.");
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setNotice("PDF scaricato. Puoi allegarlo a WhatsApp o a un’email.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setNotice(
          error instanceof Error
            ? error.message
            : "Impossibile generare il PDF. Riprova.",
        );
    } finally {
      setBusy(false);
    }
  }
  function clearOrder() {
    setQuantities({});
    setId(newOrderId());
    setConfirmClear(false);
    setNotice("Ordine svuotato.");
  }
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/" aria-label="Ordini, catalogo">
            <img src={assetPath("/brand/nsp-logo.png")} alt="NSP" />
          </Link>
          <span className="header-title">Ordini</span>
          <nav className="main-nav" aria-label="Navigazione principale">
            <Link
              className="nav-active"
              href="/"
              onClick={() => {
                setQuery("");
                setOnlySelected(false);
              }}
            >
              <LayoutGrid size={17} /> Categorie
            </Link>
            <button
              onClick={() => {
                setMobileOrder(window.matchMedia("(max-width: 760px)").matches);
                document
                  .getElementById("riepilogo")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <ClipboardList size={17} /> Il mio ordine{" "}
              <span className="nav-count">{selectedCount}</span>
            </button>
          </nav>
          <span className="header-note">
            <span className="status-dot" /> Il tuo spazio ordini
          </span>
        </div>
      </header>
      <div className="nsp-watermark" aria-hidden="true" />
      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-top">
            <p className="sidebar-caption">CATALOGO</p>
            <Link
              href="/"
              className={
                !onlySelected && !category ? "side-item active" : "side-item"
              }
              onClick={() => {
                setOnlySelected(false);
                setQuery("");
              }}
            >
              <LayoutGrid size={18} /> Tutte le categorie{" "}
              <span>{categories.length}</span>
            </Link>
            <button
              className={onlySelected ? "side-item active" : "side-item"}
              onClick={() => {
                setOnlySelected(true);
                setQuery("");
              }}
            >
              <ShoppingBag size={18} /> Nel mio ordine{" "}
              <span>{selectedCount}</span>
            </button>
            {category && (
              <>
                <p className="sidebar-caption category-caption">CATEGORIE</p>
                <Link
                  href={categoryHref(category)}
                  className="side-item active"
                  onClick={() => {
                    setQuery("");
                    setOnlySelected(false);
                  }}
                >
                  {category}
                </Link>
              </>
            )}
          </div>
          <div className="sidebar-bottom">
            <div className="how-card">
              <FileText size={23} />
              <h3>Dal catalogo al PDF</h3>
              <p>
                Inserisci le quantità, controlla l’ordine e scarica il PDF da
                inviare.
              </p>
              <span>
                Nessun invio automatico <ArrowRight size={14} />
              </span>
            </div>
            <span className="version-note">
              Gestione ordini · Prima versione
            </span>
          </div>
        </aside>
        <main id="catalogo" className="catalog-main">
          {category && (
            <nav className="breadcrumbs" aria-label="Percorso">
              <Link href="/">Categorie</Link>
              <span aria-hidden="true">/</span>
              {subcategoryName ? (
                <>
                  <Link href={categoryHref(category)}>{category}</Link>
                  <span aria-hidden="true">/</span>
                  <span aria-current="page">{subcategoryName}</span>
                </>
              ) : (
                <span aria-current="page">{category}</span>
              )}
            </nav>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">PREPARA IL TUO ORDINE</p>
              <h1>
                {subcategoryName || category || "Categorie"}
                <span>.</span>
              </h1>
              <p>
                {showDirectory
                  ? category
                    ? "Scegli una sottocategoria per vedere i prodotti."
                    : "Scegli una categoria per consultare i prodotti."
                  : "Scegli gli articoli e indica le quantità che ti servono."}
              </p>
            </div>
            <span className="catalog-count">
              {showDirectory
                ? category
                  ? `${subcategories.length} sottocategorie`
                  : `${categories.length} categorie`
                : `${scopeProducts.length} prodotti`}
            </span>
          </div>
          <div className="search-row">
            <div className="search-box">
              <Search size={20} />
              <input
                type="search"
                aria-label="Cerca per nome o codice"
                placeholder="Cerca per nome o codice prodotto…"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
              {query && (
                <button
                  aria-label="Cancella ricerca"
                  onClick={() => setQuery("")}
                >
                  <X size={17} />
                </button>
              )}
            </div>
            <button
              className={`selected-filter ${onlySelected ? "on" : ""}`}
              onClick={() => setOnlySelected(!onlySelected)}
              aria-pressed={onlySelected}
            >
              <ShoppingBag size={17} />
              <span>Nel mio ordine</span>
              <b>{selectedCount}</b>
            </button>
          </div>
          {!showDirectory && scopeProducts.some((p) => p.confezione) && (
            <div className="catalog-info">
              <Info size={18} />
              <p>
                Gli articoli con indicazione <strong>CF</strong> si ordinano a
                confezioni intere: quantità 1 significa una confezione.
              </p>
            </div>
          )}
          {showDirectory ? (
            <CategoryDirectory
              category={category || undefined}
              products={active}
            />
          ) : (
            <>
              <div className="list-heading">
                <span>
                  {onlySelected
                    ? "Prodotti nel tuo ordine"
                    : subcategoryName ||
                      category ||
                      "Risultati della ricerca"}{" "}
                  <b>{visible.length}</b>
                </span>
                {active.length > 0 && (
                  <span>Ordine del catalogo originale</span>
                )}
              </div>
              {visible.length === 0 ? (
                <div className="no-results">
                  <Search size={30} />
                  <h2>
                    {active.length === 0
                      ? "Il catalogo è vuoto"
                      : category && !query && !onlySelected
                        ? "Nessun prodotto disponibile"
                        : onlySelected && !query
                          ? "Il tuo ordine è ancora vuoto"
                          : "Nessun prodotto trovato"}
                  </h2>
                  <p>
                    {active.length === 0
                      ? "Nessun prodotto disponibile al momento."
                      : category && !query && !onlySelected
                        ? "Questa sezione non contiene ancora prodotti disponibili."
                        : onlySelected && !query
                          ? "Torna al catalogo per scegliere i prodotti."
                          : "Prova un altro nome o codice prodotto."}
                  </p>
                  {category && !query && !onlySelected ? (
                    <Link href="/" className="button secondary">
                      Torna alle categorie
                    </Link>
                  ) : (
                    active.length > 0 && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setQuery("");
                          setOnlySelected(false);
                        }}
                      >
                        Cancella filtri
                      </button>
                    )
                  )}
                </div>
              ) : (
                Object.entries(groups).map(([group, items]) => (
                  <section
                    className="product-group"
                    key={group}
                    aria-label={group || "Prodotti"}
                  >
                    {group && (!category || onlySelected) && (
                      <h2 className="group-title">{group}</h2>
                    )}
                    <div className="product-grid">
                      {items.map((p) => {
                        const selected =
                          quantityValue(quantities[p.id]) > 0 &&
                          !quantityError(quantities[p.id] ?? "", p);
                        const photo = productPhotos[p.codice];
                        return (
                          <article
                            data-testid="product-card"
                            data-code={p.codice}
                            className={`product-card ${selected ? "is-selected" : ""}`}
                            key={p.id}
                          >
                            <div className="card-top">
                              <span className="product-symbol">
                                <Package size={23} strokeWidth={1.45} />
                              </span>
                              <span className="product-code">{p.codice}</span>
                              {selected && (
                                <span
                                  className="selected-check"
                                  aria-label="Nell’ordine"
                                >
                                  <Check size={14} />
                                </span>
                              )}
                            </div>
                            <h2>{p.nome || p.descrizione}</h2>
                            {p.nome && <p>{p.descrizione}</p>}
                            <div className="product-meta">
                              {p.confezione ? (
                                <span className="pack-label">
                                  <Package size={13} /> {p.confezione}
                                </span>
                              ) : (
                                <span className="neutral-label">
                                  {p.quantitaDecimale
                                    ? "Kg a quantità libera"
                                    : "Quantità intera"}
                                </span>
                              )}
                              <label className="photo-button" htmlFor={`photo-${p.id}`}>
                                <Camera size={13} /> {photo ? "Cambia foto" : "Foto"}
                              </label>
                              <input
                                id={`photo-${p.id}`}
                                className="photo-input"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(event) => {
                                  void addProductPhoto(p, event.currentTarget.files?.[0]);
                                  event.currentTarget.value = "";
                                }}
                              />
                            </div>
                            {photo && (
                              <div className="product-photo-preview">
                                <img src={photo} alt={`Foto di ${p.nome || p.descrizione}`} />
                                <button
                                  type="button"
                                  className="remove-photo"
                                  onClick={() => void removeProductPhoto(p)}
                                >
                                  <Trash2 size={13} /> Rimuovi foto
                                </button>
                              </div>
                            )}
                            <div className="card-bottom">
                              <span
                                className={
                                  selected ? "in-order selected" : "in-order"
                                }
                              >
                                {selected ? (
                                  <>
                                    <Check size={13} /> Nell’ordine
                                  </>
                                ) : (
                                  "Da ordinare"
                                )}
                              </span>
                              <QuantityInput
                                product={p}
                                value={quantities[p.id] ?? ""}
                                onChange={(v) => updateQuantity(p.id, v)}
                              />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </>
          )}
          {active.length > 0 &&
            active.every((p) => !p.categoria && !p.sottocategoria) && (
              <p className="catalog-footnote">
                <Info size={14} /> Categorie e sottocategorie non sono presenti
                nel file di origine.
              </p>
            )}
        </main>
        <aside
          id="riepilogo"
          className={`order-panel ${mobileOrder ? "mobile-open" : ""}`}
          aria-label="Riepilogo ordine"
        >
          <div className="order-panel-inner">
            <div className="order-title">
              <span className="order-symbol">
                <ClipboardList size={21} />
              </span>
              <div>
                <p className="eyebrow">LA TUA BOZZA</p>
                <h2 id="order-heading" tabIndex={-1}>
                  Il mio ordine <span>{selectedCount}</span>
                </h2>
              </div>
              <button
                className="mobile-close icon-button"
                aria-label="Torna al catalogo"
                onClick={() => setMobileOrder(false)}
              >
                <X size={22} />
              </button>
            </div>
            <div
              className={`save-state ${storageMessage || hasErrors ? "warning" : ""}`}
            >
              {storageMessage || hasErrors ? (
                <Info size={14} />
              ) : (
                <CheckCheck size={15} />
              )}
              <span>
                {storageMessage
                  ? "Salvataggio non disponibile"
                  : hasErrors
                    ? "Correggi le quantità per salvare"
                    : ready
                      ? "Bozza salvata su questo dispositivo"
                      : "Caricamento bozza…"}
              </span>
            </div>
            {storageMessage && (
              <p className="storage-warning" role="alert">
                {storageMessage}
              </p>
            )}
            <label className="customer-label" htmlFor="customer">
              Nome cliente <span>facoltativo</span>
            </label>
            <input
              className="customer-input"
              id="customer"
              value={customer}
              maxLength={100}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Inserisci il nome per il PDF"
              disabled={!ready}
            />
            <div className="order-items" data-testid="order-items">
              {summaryProducts.length ? (
                summaryProducts.map((p) => (
                  <div className="order-item" key={p.id}>
                    <div className="order-item-top">
                      <span className="product-code">{p.codice}</span>
                      <button
                        className="remove-button"
                        aria-label={`Rimuovi ${p.codice}`}
                        onClick={() => remove(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <h3>{p.nome || p.descrizione}</h3>
                    <div className="order-item-bottom">
                      <span>{p.confezione || ""}</span>
                      <QuantityInput
                        compact
                        product={p}
                        value={quantities[p.id] ?? ""}
                        onChange={(v) => updateQuantity(p.id, v)}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-order">
                  <div>
                    <ShoppingBag size={32} strokeWidth={1.4} />
                  </div>
                  <h3>Il tuo ordine parte da qui</h3>
                  <p>
                    Aggiungi una quantità ai prodotti del catalogo. Li
                    ritroverai in questo riepilogo.
                  </p>
                </div>
              )}
            </div>
            <div className="order-actions">
              <div className="order-total">
                <span>Articoli selezionati</span>
                <strong>{selectedCount}</strong>
              </div>
              {hasErrors && (
                <p className="field-error" role="alert">
                  Correggi le quantità non valide nel catalogo prima di
                  esportare.
                </p>
              )}
              <button
                className="button primary"
                disabled={!ready || !selectedCount || !!hasErrors || busy}
                onClick={() => exportPdf()}
              >
                <ArrowDownToLine size={18} />
                {busy ? "Preparazione PDF…" : "Scarica PDF"}
                <ArrowRight size={17} />
              </button>
              {canShare && (
                <button
                  className="button secondary share-button"
                  disabled={!ready || !selectedCount || !!hasErrors || busy}
                  onClick={() => exportPdf(true)}
                >
                  <Share2 size={17} /> Condividi PDF
                </button>
              )}
              <p className="pdf-hint">
                Scarica il PDF e invialo manualmente
                <br />
                tramite WhatsApp o email.
              </p>
              <button
                className="clear-button"
                disabled={Object.keys(quantities).length === 0}
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 size={14} /> Svuota ordine
              </button>
              <p role="status" aria-live="polite" className="export-notice">
                {notice}
              </p>
            </div>
          </div>
        </aside>
      </div>
      <button className="mobile-order-bar" onClick={() => setMobileOrder(true)}>
        <ShoppingBag size={20} />
        <span>
          Il mio ordine <b>{selectedCount} articoli</b>
        </span>
        <ArrowRight size={20} />
      </button>
      <ConfirmDialog
        open={confirmClear}
        onCancel={() => setConfirmClear(false)}
        onConfirm={clearOrder}
      />
    </>
  );
}
