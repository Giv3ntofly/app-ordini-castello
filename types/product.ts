export interface Product {
  id: string;
  codice: string;
  descrizione: string;
  nome?: string | null;
  categoria: string | null;
  sottocategoria: string | null;
  confezione: string | null;
  multiploMinimo: number | null;
  unita: string | null;
  quantitaDecimale?: boolean;
  attivo?: boolean;
  ordineVisualizzazione?: number;
  fonte: { foglio: string; riga: number; ordinamentoOriginale: string };
}
