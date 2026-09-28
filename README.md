# App Ordini — Castello

Applicazione web in italiano per preparare gli ordini del cliente Castello. Il catalogo è locale, senza accesso, account, database remoto o area titolare.

## Catalogo

- Sorgente: `CASTELLO 2026.rev.1.XLS`.
- 156 articoli, 15 categorie e 21 sottocategorie.
- I dati dell'app sono in `data/products.json` e `data/categories.json`.
- I prezzi e lo storico non vengono gestiti dall'app.

## Avvio

Serve Node.js 20.9 o superiore.

```powershell
npm install
npm run dev
```

Aprire `http://localhost:3000`. Se PowerShell blocca gli script npm, usare `npm.cmd` al posto di `npm`.

Per creare la versione statica pronta per la pubblicazione:

```powershell
npm run build
```

La cartella prodotta è `out`.

## Utilizzo

1. Scegliere una categoria o una sottocategoria, oppure cercare un prodotto.
2. Inserire le quantità nel carrello. I due gelcoat ammettono quantità decimali in kg; gli altri articoli richiedono quantità intere.
3. Controllare il riepilogo e, se necessario, indicare il nome del cliente.
4. Scaricare o condividere il PDF dell'ordine.

Il carrello resta salvato solo nel browser del dispositivo. Le foto degli articoli sono facoltative e vengono salvate localmente nel browser: non vengono inviate online.

## Aggiornare il catalogo Castello

I dati JSON sono già presenti e non serve Python per usare l'app. Per rigenerarli dall'Excel:

```powershell
npm run import:excel -- --all
```

L'importazione legge l'Excel in sola lettura e aggiorna `data/products.json` e `data/categories.json`.

## Verifica

```powershell
npm run typecheck
npm test
npm run build
```

## Struttura

- `app/`: pagine e stile.
- `components/`: interfaccia del catalogo, quantità e conferme.
- `data/`: catalogo Castello.
- `lib/`: ricerca, navigazione, carrello, foto locali e PDF.
- `scripts/`: importazione dall'Excel Castello.
- `reports/`: documentazione dell'importazione Castello.
- `tests/`: controlli automatici.
