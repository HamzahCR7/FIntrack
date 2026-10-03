"""Export a SQLite snapshot to SQL for an EMPTY PostgreSQL database. Never uploads data."""
import argparse
import datetime
import pathlib
import re
import sqlite3

root = pathlib.Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--source', default=str(root / 'deployment-data/fintrack.db'))
parser.add_argument('--output', default=str(root / 'deployment-data/import-postgres.sql'))
args = parser.parse_args()
source = pathlib.Path(args.source).resolve()
schema = (root / 'backend/prisma/schema.prisma').read_text()
models = {}
for name, body in re.findall(r'model (\w+) \{(.*?)\n\}', schema, re.S):
    fields = {}
    for field, kind in re.findall(r'^\s+(\w+)\s+(String|Float|Int|Boolean|DateTime)\??\s', body, re.M):
        fields[field] = kind
    models[name] = fields
# Production authentication uses environment credentials, not legacy plaintext users.
order = ['Account', 'Category', 'Subscription', 'Transaction', 'Debt', 'FinancialProfile', 'InsightFeedback', 'QuickItem', 'Budget', 'Goal']
output = pathlib.Path(args.output).resolve()
if output.exists():
    raise SystemExit('Export exists; move it before creating another snapshot export.')

def literal(value, kind):
    if value is None:
        return 'NULL'
    if kind == 'Boolean':
        return 'TRUE' if value else 'FALSE'
    if kind == 'DateTime':
        if isinstance(value, (int, float)):
            value = datetime.datetime.fromtimestamp(value / 1000, datetime.timezone.utc).isoformat()
        return "'" + str(value).replace("'", "''") + "'"
    if kind in ('Int', 'Float'):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"

lines = ['BEGIN;', 'SET standard_conforming_strings = on;']
for name in order:
    lines.append(f'''DO $$ BEGIN IF EXISTS (SELECT 1 FROM "{name}") THEN RAISE EXCEPTION 'Target must be empty'; END IF; END $$;''')
counts = {}
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as db:
    db.row_factory = sqlite3.Row
    parent_updates = []
    for name in order:
        rows = db.execute(f'SELECT * FROM "{name}"').fetchall()
        counts[name] = len(rows)
        for row in rows:
            fields = [field for field in models[name] if field in row.keys()]
            values = []
            for field in fields:
                value = row[field]
                if name == 'Category' and field == 'parentId' and value:
                    parent_updates.append('UPDATE "Category" SET "parentId" = ' + literal(value, 'String') + ' WHERE "id" = ' + literal(row['id'], 'String') + ';')
                    value = None
                values.append(literal(value, models[name][field]))
            columns = ', '.join('"' + f + '"' for f in fields)
            lines.append(f'INSERT INTO "{name}" ({columns}) VALUES ({", ".join(values)});')
        if name == 'Category':
            lines.extend(parent_updates)
for name, count in counts.items():
    lines.append(f'''DO $$ BEGIN IF (SELECT count(*) FROM "{name}") <> {count} THEN RAISE EXCEPTION 'Row count mismatch'; END IF; END $$;''')
lines.append('COMMIT;')
output.write_text('\n'.join(lines) + '\n')
output.chmod(0o600)
print(f'Prepared {sum(counts.values())} records across {len(counts)} tables. Private export: {output}')
