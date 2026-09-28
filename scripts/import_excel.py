"""Importazione controllata: file sorgente in sola lettura, esattamente 10 prodotti."""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / '.tools' / 'python'))
import hashlib
import json
import re
from datetime import datetime, timezone

def main():
    try:
        import xlrd
        source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'CASTELLO 2026..XLS'
        workbook = xlrd.open_workbook(str(source))
        expected = ['Ordinamento', 'QuantitaPeriodo1', 'Prezzo per unità']
        matches = [(sheet, row) for sheet in workbook.sheets() for row in range(sheet.nrows)
                   if sheet.row_values(row) == expected]
        if len(matches) != 1:
            raise ValueError('Intestazione assente o ambigua: richiesta verifica manuale; catalogo non aggiornato.')
        sheet, header = matches[0]
        products, imported, excluded, blanks, duplicates = [], [], [], [], []
        seen = {}
        for index in range(header + 1, sheet.nrows):
            values = sheet.row_values(index)
            row_number = index + 1
            if all(value == '' for value in values):
                excluded.append({'riga': row_number, 'motivo': 'Riga vuota'})
                continue
            # Solo le prime 10 righe non vuote: le successive non entrano nel catalogo.
            if len(products) == 10:
                excluded.append({'riga': row_number, 'motivo': 'Oltre il limite delle prime 10 righe'})
                continue
            for column, value in zip(expected, values):
                if value == '': blanks.append({'riga': row_number, 'colonna': column})
            original = values[0]
            if not isinstance(original, str):
                raise ValueError(f'Riga {row_number}: Ordinamento non testuale; richiesta verifica.')
            split = re.fullmatch(r'(\S+)\s{2,}(.+)', original)
            if not split:
                raise ValueError(f'Riga {row_number}: separazione codice/descrizione ambigua; richiesta verifica.')
            code, description = split.groups()
            pack = re.search(r'\bCF\.\s*(10|12)\s*PZ\b', description, re.I)
            if re.search(r'\bCF\.', description, re.I) and not pack:
                raise ValueError(f'Riga {row_number}: confezione diversa dalle 10/12 pezzi confermate; richiesta verifica.')
            if code in seen:
                duplicates.append({'codice': code, 'righe': [seen[code], row_number]})
            else: seen[code] = row_number
            product = {
                'id': f'excel-r{row_number}', 'codice': code, 'descrizione': description,
                'categoria': None, 'sottocategoria': None,
                'confezione': pack.group(0) if pack else None,
                'unita': 'confezioni' if pack else None,
                'multiploMinimo': None,
                'fonte': {'foglio': sheet.name, 'riga': row_number, 'ordinamentoOriginale': original}
            }
            products.append(product)
            # Dati originali disponibili solo nel report locale, mai importato dall'app.
            imported.append({'rigaExcel': row_number, 'valoriOriginali': dict(zip(expected, values))})
        if len(products) != 10:
            raise ValueError(f'Trovate solo {len(products)} righe: richieste 10. Catalogo non aggiornato.')
        report = {
            'file': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
            'dataImportazione': datetime.now(timezone.utc).isoformat(),
            'foglio': sheet.name, 'rigaIntestazione': header + 1, 'colonne': expected,
            'righeAnalizzate': sheet.nrows, 'righeImportate': imported,
            'righeEscluse': excluded, 'campiVuoti': blanks, 'duplicati': duplicates,
            'campiNonDisponibili': ['nome cliente', 'categoria', 'sottocategoria', 'multiplo minimo', 'unità per articoli senza CF.', 'attivo', 'ordine visualizzazione'],
            'decisioniConfermate': ['Codice e descrizione separati sul doppio spazio.', 'CF.10PZ e CF.12PZ: ordine per confezioni intere, non per pezzi.', 'QuantitaPeriodo1 esclusa da app e PDF.', 'Prezzi esclusi da app e PDF.', 'Categorie assenti: nessuna categoria commerciale dedotta.', 'ID tecnici derivati dalla riga Excel; ordine originale preservato.'],
            'problemiLettura': []
        }
        (ROOT / 'data').mkdir(exist_ok=True)
        (ROOT / 'reports').mkdir(exist_ok=True)
        (ROOT / 'data' / 'products.json').write_text(json.dumps(products, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (ROOT / 'reports' / 'import-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        lines = ['# Report importazione Excel', '', f'File: {source.name}', f'Foglio: {sheet.name}. Intestazione: riga {header + 1}.', f'Righe analizzate: {sheet.nrows} (intestazione inclusa). Prodotti importati: 10.', '', 'Colonne: ' + ', '.join(expected), '', '| Riga Excel | Ordinamento originale | QuantitaPeriodo1 | Prezzo per unità (solo fonte) |', '|---|---|---:|---:|']
        for row in imported:
            v = row['valoriOriginali']
            lines.append(f"| {row['rigaExcel']} | {v[expected[0]]} | {v[expected[1]]} | {v[expected[2]]} |")
        lines += ['', '## Interpretazione confermata', *['- ' + d for d in report['decisioniConfermate']], '', '## Campi non disponibili', *['- ' + f for f in report['campiNonDisponibili']], '', f'Campi vuoti nelle righe importate: {json.dumps(blanks, ensure_ascii=False)}', f'Duplicati nelle righe importate: {json.dumps(duplicates, ensure_ascii=False)}', '', '## Righe escluse', *[f"- Riga {r['riga']}: {r['motivo']}" for r in excluded], '', 'Problemi di lettura: nessuno.', 'Il catalogo PDF originale non è stato utilizzato. Nessun file originale è stato modificato.', f"SHA-256 Excel: {report['sha256']}"]
        (ROOT / 'reports' / 'import-report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        print(f'Importate 10 righe da {sheet.name}: ' + ', '.join(str(r['rigaExcel']) for r in imported))
        print('Report: reports/import-report.md e reports/import-report.json')
    except Exception as error:
        print(f'IMPORTAZIONE INTERROTTA: {error}. Nessun dato sostitutivo creato.', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__': main()
