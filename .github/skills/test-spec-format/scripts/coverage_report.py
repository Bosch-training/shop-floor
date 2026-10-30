#!/usr/bin/env python3
"""Read-only coverage matrix: LLD items versus test spec rows.

Extracts story ACs, LLD-FR, LLD-NFR, error codes and LLD test IDs (T-nn)
from the LLD and maps each to the CSV rows that cite it. SRS IDs and
sub-tasks are reported as informational. Standard library only.

Usage: coverage_report.py <storyKey> [--root <repo>] [--json]
Exit code: 0 no required gaps, 1 required gaps, 2 usage or I/O error.
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

# kind -> (regex on LLD, CSV columns searched, required)
KINDS = {
    'Story AC': (r'^\|\s*([A-Z]+\d+-AC\d+)\s*\|', ['Story AC'], True),
    'LLD-FR': (r'^\|\s*(LLD-FR-\d+)\s*\|', ['LLD Refs'], True),
    'LLD-NFR': (r'^\|\s*(LLD-NFR-\d+)\s*\|', ['LLD Refs'], True),
    'Error code': (r'^\|\s*`([A-Z][A-Z_]+)`\s*\|\s*\d{3}\s*\|',
                   ['Expected Result', 'Test Data', 'Title'], True),
    'LLD test': (r'^\|\s*(T-\d+)\s*\|', ['LLD Refs'], True),
    'Sub-task': (r'^\|\s*(ST-\d+)\s*\|', ['Story AC', 'LLD Refs'], False),
    'Open question': (r'^\|?\s*\**(OQ-\d+)\b', ['Title', 'Test Data', 'LLD Refs'],
                      False),
}
NARROW_KINDS = {'Story AC', 'LLD-FR', 'LLD-NFR', 'Error code'}
SRS_PATTERN = re.compile(r'(?<![A-Za-z0-9-])((?:FR|BR|NFR|AC)-\d{2})(?!\d)')


def load_rows(path):
    with path.open(encoding='utf-8', newline='') as handle:
        return list(csv.DictReader(handle))


def cites(text, item):
    return re.search(rf'(?<![A-Za-z0-9_-]){re.escape(item)}(?![A-Za-z0-9_])',
                     text) is not None


def extract(lld_text):
    found = {}
    for kind, (pattern, _cols, _req) in KINDS.items():
        items = []
        for line in lld_text.splitlines():
            match = re.match(pattern, line)
            if match and match.group(1) not in items:
                items.append(match.group(1))
        found[kind] = items
    found['SRS ID'] = sorted(set(SRS_PATTERN.findall(lld_text)))
    return found


def map_items(found, rows):
    result = []
    for kind, items in found.items():
        columns, required = ['SRS Refs'], False
        if kind in KINDS:
            _p, columns, required = KINDS[kind]
        for item in items:
            hits = [r for r in rows
                    if any(cites(r[c], item) for c in columns)]
            result.append({
                'kind': kind,
                'item': item,
                'required': required,
                'tests': [r['Test ID'] for r in hits],
                'categories': sorted({r['Category'] for r in hits}),
            })
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('story_key')
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    lld = args.root / 'docs' / 'lld' / f'{args.story_key}-low-level-design.md'
    spec = args.root / 'docs' / 'test-spec' / f'{args.story_key}-test-spec.csv'
    try:
        rows = load_rows(spec)
        found = extract(lld.read_text(encoding='utf-8'))
    except OSError as exc:
        print(f'error: {exc}', file=sys.stderr)
        return 2
    entries = map_items(found, rows)
    gaps = [e for e in entries if e['required'] and not e['tests']]
    counts = {
        'Category': Counter(r['Category'] for r in rows),
        'Test Type': Counter(r['Test Type'] for r in rows),
        'Automation Status': Counter(r['Automation Status'] for r in rows),
    }
    if args.json:
        print(json.dumps({
            'total': len(rows),
            'counts': {k: dict(v) for k, v in counts.items()},
            'entries': entries,
            'requiredGaps': [e['item'] for e in gaps],
        }, indent=2))
        return 1 if gaps else 0
    print(f'# Coverage for {args.story_key}: {len(rows)} tests\n')
    for name, counter in counts.items():
        print(f'- {name}: ' + ', '.join(f'{k} {v}' for k, v in
                                       sorted(counter.items())))
    print('\n| Kind | Item | Tests | Categories | Status |')
    print('|---|---|---|---|---|')
    for e in entries:
        if e['tests']:
            narrow = len(e['categories']) == 1 and e['kind'] in NARROW_KINDS
            status = 'single category' if narrow else 'ok'
        else:
            status = 'GAP' if e['required'] else 'not cited (info)'
        tests = ', '.join(e['tests'][:6]) + (' ...' if len(e['tests']) > 6 else '')
        print(f"| {e['kind']} | {e['item']} | {tests or '-'} | "
              f"{', '.join(e['categories']) or '-'} | {status} |")
    print(f'\nRequired gaps: {len(gaps)}')
    return 1 if gaps else 0


if __name__ == '__main__':
    sys.exit(main())
