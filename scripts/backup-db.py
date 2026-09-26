"""Create a consistent SQLite snapshot without modifying the source database."""
import argparse
import pathlib
import sqlite3

parser = argparse.ArgumentParser()
parser.add_argument('--source', default='backend/prisma/fintrack.db')
parser.add_argument('--output', default='deployment-data/fintrack.db')
args = parser.parse_args()
source = pathlib.Path(args.source).resolve()
target = pathlib.Path(args.output).resolve()
if target.exists():
    raise SystemExit('Output already exists; choose a new output path.')
target.parent.mkdir(parents=True, exist_ok=True)
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src:
    with sqlite3.connect(target) as dst:
        src.backup(dst)
        assert dst.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
target.chmod(0o600)
print(f'Verified database backup: {target}')
