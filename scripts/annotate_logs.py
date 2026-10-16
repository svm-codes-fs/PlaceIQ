"""Print the tail of a log file as a GitHub Actions error annotation (visible without signing in).

    python scripts/annotate_logs.py container-logs.txt
"""
import sys

with open(sys.argv[1], encoding='utf-8', errors='replace') as f:
    tail = f.read()[-6000:]
escaped = tail.replace('%', '%25').replace('\r', '').replace('\n', '%0A')
print(f'::error title=Container logs::{escaped}')
