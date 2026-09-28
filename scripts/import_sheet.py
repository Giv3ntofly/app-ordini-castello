"""Importa i fogli di categoria approvati, lasciando gli originali in sola lettura."""
import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.tools' / 'python'))
NAVIGATION = json.loads((ROOT / 'data/categories.json').read_text(encoding='utf-8'))
APPROVED = {category['nome']: category['sottocategorie'] for category in NAVIGATION}
HEADERS = ['Ordinamento', 'QuantitaPeriodo1', 'Prezzo per unità']
FREE_KG_CODES = {'021-NGA8533-1', '033-GELNGAC-1'}


def parse_sheet(sheet):
    if not sheet.nrows or sheet.row_values(0) != HEADERS:
        raise ValueError(f'{sheet.name}: intestazione diversa da quella verificata.')
    products, imported, excluded, blanks, headings, warnings = [], [], [], [], [], []
    subcategory = None
    seen_headings = set()
    for index in range(1, sheet.nrows):
        values = sheet.row_values(index)
        row = index + 1
        if all(value == '' for value in values):
            excluded.append({'riga': row, 'motivo': 'Riga vuota'})
            continue
        original = values[0]
        if original in APPROVED[sheet.name]:
            if original in seen_headings:
                raise ValueError(f'{sheet.name}, riga {row}: sottocategoria ripetuta {original}.')
            subcategory = original
            seen_headings.add(original)
            headings.append({'riga': row, 'titolo': original})
            excluded.append({'riga': row, 'motivo': 'Titolo sottocategoria', 'valore': original})
            if any(value != '' for value in values[1:]):
                warnings.append(f'Riga {row}: valori numerici accanto al titolo {original}, ignorati.')
            continue
        match = re.fullmatch(r'(\d{3}-.+?)\s{2,}(.+)', original) if isinstance(original, str) else None
        if not match:
            raise ValueError(f'{sheet.name}, riga {row}: codice/descrizione o sottocategoria non riconosciuti.')
        if APPROVED[sheet.name] and subcategory is None:
            raise ValueError(f'{sheet.name}, riga {row}: prodotto prima della prima sottocategoria.')
        code, description = match.groups()
        for column, value in zip(HEADERS, values):
            if value == '':
                blanks.append({'riga': row, 'colonna': column})
        packs = list(re.finditer(r'\bCF\.?\s*(\d+)\s*PZ\b', description, re.I))
        if len(packs) > 1 or (re.search(r'\bCF\.?\s*\d', description, re.I) and not packs):
            raise ValueError(f'{sheet.name}, riga {row}: confezione ambigua.')
        pack = packs[0].group(0) if packs else None
        free_kg = code in FREE_KG_CODES
        if free_kg and (pack or not re.search(r'\bKG\.\s*$', description, re.I)):
            raise ValueError(f'{sheet.name}, riga {row}: il gelcoat a peso libero non termina con KG.')
        product = {
            'id': f'excel:{sheet.name.lower()}:{code}',
            'codice': code, 'descrizione': description,
            'categoria': sheet.name, 'sottocategoria': subcategory,
            'confezione': pack,
            'unita': 'kg' if free_kg else 'confezioni' if pack else None,
            'multiploMinimo': None,
            'fonte': {'foglio': sheet.name, 'riga': row, 'ordinamentoOriginale': original},
        }
        if free_kg:
            product['quantitaDecimale'] = True
        products.append(product)
        imported.append({'rigaExcel': row, 'codice': code, 'sottocategoria': subcategory,
                         'valoriOriginali': dict(zip(HEADERS, values))})
    if seen_headings != set(APPROVED[sheet.name]):
        raise ValueError(f'{sheet.name}: sottocategorie mancanti rispetto alla struttura verificata.')
    if not products:
        raise ValueError(f'{sheet.name}: nessun prodotto trovato.')
    return products, {
        'foglio': sheet.name, 'colonne': HEADERS, 'rigaIntestazione': 1,
        'righeAnalizzate': sheet.nrows, 'numeroProdotti': len(products),
        'righeImportate': imported, 'righeEscluse': excluded,
        'sottocategorie': headings, 'campiVuoti': blanks, 'avvisi': warnings,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', nargs='?', default=str(ROOT / 'CASTELLO 2026.rev.1.XLS'))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--sheet', choices=sorted(APPROVED))
    mode.add_argument('--all', action='store_true', help='Tutti i fogli di categoria, escluso Foglio1.')
    parser.add_argument('--verify', action='store_true', help='Confronto in sola lettura, senza aggiornare file.')
    args = parser.parse_args()
    try:
        import xlrd
        source = Path(args.file)
        source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
        workbook = xlrd.open_workbook(str(source))
        if args.all and set(workbook.sheet_names()) - {'Foglio1'} != set(APPROVED):
            raise ValueError('I fogli Excel non corrispondono alle categorie verificate.')
        names = [name for name in workbook.sheet_names() if name in APPROVED] if args.all else [args.sheet]
        imported_products, sheets = [], []
        for name in names:
            products, sheet_report = parse_sheet(workbook.sheet_by_name(name))
            imported_products.extend(products)
            sheets.append(sheet_report)
        catalog_path = ROOT / 'data/products.json'
        existing = json.loads(catalog_path.read_text(encoding='utf-8'))
        updated, inserted = [], set()
        by_sheet = {name: [p for p in imported_products if p['fonte']['foglio'] == name] for name in names}
        for product in existing:
            name = product['fonte']['foglio']
            if name in by_sheet:
                if name not in inserted:
                    updated.extend(by_sheet[name])
                    inserted.add(name)
            elif not args.all:
                updated.append(product)
        for name in names:
            if name not in inserted:
                updated.extend(by_sheet[name])
        seen = {}
        for product in updated:
            code = product['codice']
            if code in seen:
                raise ValueError(f'Codice duplicato {code}: {seen[code]} e {product["fonte"]}. Nessun aggiornamento.')
            seen[code] = product['fonte']
        if args.verify:
            if args.all:
                compared = existing
            else:
                compared = [p for p in existing if p['fonte']['foglio'] in names]
            expected = {p['id']: p for p in imported_products}
            actual = {p['id']: p for p in compared}
            if len(actual) != len(compared) or actual != expected:
                raise ValueError('Catalogo e fogli selezionati non corrispondono integralmente.')
            print(f'VERIFICA COMPLETATA: {len(expected)} prodotti in {len(names)} categorie corrispondono alla fonte, campo per campo.')
            for sheet in sheets:
                print(f'{sheet["foglio"]}: {sheet["numeroProdotti"]} prodotti')
            return
        decisions = [
            'Foglio1 escluso; nessun articolo recuperato dal vecchio elenco generale.',
            'Categoria dal nome del foglio; sottocategoria dal titolo che precede ogni gruppo.',
            'Codici e descrizioni conservati, compresi spazi interni e indicazioni originali.',
            'Tutte le indicazioni CF con numero di pezzi significano confezioni intere. Quantità 1 = una confezione.',
            'I due gelcoat 021-NGA8533-1 e 033-GELNGAC-1 sono ordinabili a kg con quantità decimali libere.',
            'Per gli altri articoli: quantità intere, senza multipli minimi o unità dedotte dai formati.',
            'Prezzi e quantità storiche esclusi dal catalogo applicativo e dal PDF.',
            'Identificativi tecnici stabili basati su foglio e codice; quantità di Diluenti preservate.',
        ]
        report = {
            'file': source.name, 'sha256': source_hash,
            'dataImportazione': datetime.now(timezone.utc).isoformat(),
            'fogli': sheets, 'numeroProdottiImportati': len(imported_products),
            'numeroProdottiCatalogo': len(updated), 'duplicati': [],
            'fogliEsclusi': [name for name in workbook.sheet_names() if name not in names],
            'decisioni': decisions, 'problemiLettura': [],
        }
        name = 'import-completo' if args.all else 'import-' + re.sub(r'[^a-z0-9]+', '-', args.sheet.lower()).strip('-')
        lines = ['# Report importazione catalogo', '', f'Fonte: {source.name}.',
                 f'Categorie importate: {len(names)}. Prodotti importati: {len(imported_products)}. Totale catalogo: {len(updated)}.',
                 '', '| Categoria | Prodotti | Sottocategorie |', '|---|---:|---|']
        lines += [f'| {s["foglio"]} | {s["numeroProdotti"]} | {", ".join(h["titolo"] for h in s["sottocategorie"]) or "Non presenti"} |' for s in sheets]
        lines += ['', '## Regole applicate', *['- ' + text for text in decisions],
                  '', '## Esclusioni e controlli', '- Fogli esclusi: ' + ', '.join(report['fogliEsclusi']),
                  '- Nessun codice duplicato. Nessun problema di lettura.',
                  '- Le righe di titolo delle sottocategorie non sono prodotti.',
                  '- I campi non disponibili (nome cliente, unità per articoli senza CF o kg libero, multiplo minimo) non sono inventati.',
                  '- Originali non modificati. SHA-256 Excel: ' + source_hash]
        for sheet in sheets:
            lines += ['', '## ' + sheet['foglio'], f'Righe analizzate: {sheet["righeAnalizzate"]}. Intestazione: riga 1.',
                      'Colonne: ' + ', '.join(HEADERS),
                      '| Riga Excel | Codice | Descrizione originale | Sottocategoria |', '|---:|---|---|---|']
            for p in by_sheet[sheet['foglio']]:
                lines.append(f'| {p["fonte"]["riga"]} | {p["codice"]} | {p["descrizione"]} | {p["sottocategoria"] or ""} |')
            lines += ['Righe escluse: ' + json.dumps(sheet['righeEscluse'], ensure_ascii=False),
                      'Campi sorgente vuoti: ' + json.dumps(sheet['campiVuoti'], ensure_ascii=False)]
            lines += ['Avviso: ' + warning for warning in sheet['avvisi']]
        (ROOT / 'reports' / (name + '.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (ROOT / 'reports' / (name + '.md')).write_text('\n'.join(lines) + '\n', encoding='utf-8')
        if hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
            raise ValueError('Il file sorgente è cambiato durante la lettura; ripetere l’importazione.')
        temporary = catalog_path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(catalog_path)
        print(f'Importati {len(imported_products)} prodotti da {len(names)} categorie. Totale: {len(updated)}.')
        for sheet in sheets:
            print(f'{sheet["foglio"]}: {sheet["numeroProdotti"]} prodotti')
        print(f'Report: reports/{name}.md')
    except Exception as error:
        print(f'IMPORTAZIONE INTERROTTA: {error}. Nessun dato sostitutivo creato.', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
