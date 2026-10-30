#!/usr/bin/env python3
"""Read-only validator for docs/test-spec/<storyKey>-test-spec.csv.

Checks the file format (UTF-8, no BOM, LF, RFC 4180, every field quoted) and
every row against ../schema/test-spec-row.schema.json. Standard library only.

Usage: validate_test_spec.py <csv> [--schema <schema.json>] [--json]
Exit code: 0 valid (warnings allowed), 1 errors found, 2 usage or I/O error.
"""
import argparse
import json
import re
import sys
from pathlib import Path

DEFAULT_SCHEMA = (
    Path(__file__).resolve().parent.parent / 'schema' / 'test-spec-row.schema.json'
)
WARN_PATTERNS = [
    (re.compile(r'\b(TBD|TODO|FIXME|lorem)\b', re.I), 'placeholder text'),
    (re.compile(r'works? (correctly|properly)|as expected', re.I),
     'vague expected result'),
]


def parse_quoted_csv(text):
    """Return (rows, problems). Flags any field that is not double quoted."""
    rows, row, problems = [], [], []
    i, n, line = 0, len(text), 1
    while i < n:
        if text[i] != '"':
            problems.append(f'line {line}: field is not wrapped in double quotes')
            end = i
            while end < n and text[end] not in ',\n':
                end += 1
            field, i = text[i:end], end
        else:
            i += 1
            buf = []
            while True:
                if i >= n:
                    problems.append(f'line {line}: unterminated quoted field')
                    break
                ch = text[i]
                if ch == '"':
                    if i + 1 < n and text[i + 1] == '"':
                        buf.append('"')
                        i += 2
                        continue
                    i += 1
                    break
                if ch == '\n':
                    line += 1
                buf.append(ch)
                i += 1
            field = ''.join(buf)
            if i < n and text[i] not in ',\n':
                problems.append(f'line {line}: text after closing quote')
        row.append(field)
        if i < n and text[i] == ',':
            i += 1
            continue
        rows.append(row)
        row = []
        if i < n and text[i] == '\n':
            i += 1
            line += 1
    if row:
        rows.append(row)
    return rows, problems


def check_value(name, value, rule):
    if 'enum' in rule and value not in rule['enum']:
        return f'{name}: "{value}" not in {rule["enum"]}'
    if 'pattern' in rule and not re.search(rule['pattern'], value):
        return f'{name}: "{value}" does not match {rule["pattern"]}'
    if len(value.strip()) < rule.get('minLength', 0):
        return f'{name}: empty or too short'
    return None


def validate(csv_path, schema):
    errors, warnings = [], []
    raw = csv_path.read_bytes()
    if raw.startswith(b'\xef\xbb\xbf'):
        errors.append('file: has a UTF-8 BOM')
    if b'\r' in raw:
        errors.append('file: contains CR characters, use \\n line endings')
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        return ['file: not valid UTF-8'], warnings, 0
    rows, problems = parse_quoted_csv(text.replace('\r', ''))
    errors.extend(problems)
    if not rows:
        return errors + ['file: empty'], warnings, 0

    columns = schema['x-columnOrder']
    if rows[0] != columns:
        errors.append(f'header: expected {columns}, found {rows[0]}')
        return errors, warnings, 0

    expected_key = re.match(r'^(.+?)-test-spec\.csv$', csv_path.name)
    expected_key = expected_key.group(1) if expected_key else None
    seen, last_number = set(), 0
    data_rows = rows[1:]
    for index, row in enumerate(data_rows, start=2):
        if len(row) != len(columns):
            errors.append(f'row {index}: {len(row)} columns, expected {len(columns)}')
            continue
        item = dict(zip(columns, row))
        label = item['Test ID'] or f'row {index}'
        for name in columns:
            message = check_value(name, item[name], schema['properties'][name])
            if message:
                errors.append(f'{label}: {message}')
        if expected_key and item['Story Key'] != expected_key:
            errors.append(f'{label}: Story Key differs from file name')
        if not item['Test ID'].startswith(f'{item["Story Key"]}-TC-'):
            errors.append(f'{label}: Test ID prefix differs from Story Key')
        if item['Test ID'] in seen:
            errors.append(f'{label}: duplicate Test ID')
        seen.add(item['Test ID'])
        match = re.search(r'(\d+)$', item['Test ID'])
        if match:
            number = int(match.group(1))
            if number <= last_number:
                errors.append(f'{label}: Test ID not ascending')
            last_number = number
        if not re.match(r'^1\. ', item['Steps']):
            warnings.append(f'{label}: Steps should start with "1. "')
        for name in ('Title', 'Steps', 'Expected Result', 'Test Data'):
            for pattern, why in WARN_PATTERNS:
                if pattern.search(item[name]):
                    warnings.append(f'{label}: {name} has {why}')
    return errors, warnings, len(data_rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path)
    parser.add_argument('--schema', type=Path, default=DEFAULT_SCHEMA)
    parser.add_argument('--json', action='store_true', help='machine output')
    args = parser.parse_args()
    try:
        schema = json.loads(args.schema.read_text(encoding='utf-8'))
        errors, warnings, count = validate(args.csv, schema)
    except OSError as exc:
        print(f'error: {exc}', file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps({'rows': count, 'errors': errors, 'warnings': warnings}))
    else:
        for message in errors:
            print(f'ERROR   {message}')
        for message in warnings:
            print(f'WARNING {message}')
        status = 'INVALID' if errors else 'VALID'
        print(f'{status}: {count} rows, {len(errors)} errors, '
              f'{len(warnings)} warnings')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
