"""Expose only the DuoNest note to agents and record approved Codex findings."""

import argparse
import datetime
import fcntl
import json
import os
from pathlib import Path
import re

VAULT = Path.home() / 'Documents' / 'AI Memory'
NOTE = VAULT / 'Projekty/github.com/dawidgibaszek/duonest.md'
RULES = VAULT / 'Zasady dla modeli.md'
HEADING = '## Ustalenia z recenzji Cezara'
CACHE = Path('.cache/duonest-cezar/obsidian.md')
PATCH = 'node_modules/.cache/duonest-review/changes.diff'
MARKER = 'CEZ:MEMORY '
REPLACE = 'CEZ:REPLACE '


def snapshot():
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    if CACHE.parent.resolve() != Path.cwd().resolve() / CACHE.parent:
        raise SystemExit('Katalog migawki musi znajdować się w kopii roboczej.')
    try:
        content = RULES.read_text() + '\n---\n\n' + NOTE.read_text()
    except OSError:
        content = 'Lokalna pamięć DuoNest jest niedostępna. Użyj kontekstu repozytorium.\n'
    temporary = CACHE.with_suffix('.tmp')
    temporary.unlink(missing_ok=True)
    temporary.write_text(content)
    temporary.replace(CACHE)
    print(CACHE.resolve())


def read_approved_review(root, run_id):
    pending = {}
    read_paths = set()
    checks_exit_code = None
    verdict = None
    last_text = ''
    with (root / f'.ai/cezar/runs/{run_id}.ndjson').open() as events:
        for line in events:
            event = json.loads(line)
            if event.get('stepId') == 'checks' and event['type'] == 'check-output':
                checks_exit_code = event.get('exitCode')
            if event.get('stepId') != 'review':
                continue
            if event['type'] == 'step-start':
                pending.clear()
                read_paths.clear()
                verdict = None
                last_text = ''
            elif event['type'] == 'text':
                last_text = event['text']
            elif event['type'] == 'note' and event.get('message') == 'verdict: approve':
                verdict = 'approve'
            elif event['type'] == 'tool-call':
                args = event.get('input', {}).get('arguments', {})
                if args.get('tool') == 'Read' and args.get('path'):
                    pending[event['id']] = args['path']
            elif event['type'] == 'tool-result' and event.get('toolCallId') in pending:
                result = json.loads(event['result'])
                if result.get('success'):
                    path = pending[event['toolCallId']]
                    for expected in (str(CACHE), PATCH):
                        if path == expected or path.endswith('/' + expected):
                            read_paths.add(expected)
    if verdict != 'approve' or checks_exit_code != 0:
        raise SystemExit('Brak zaliczonej recenzji w tym uruchomieniu.')
    if read_paths != {str(CACHE), PATCH}:
        raise SystemExit('Brak potwierdzonego odczytu diffu lub migawki pamięci przez Codexa.')
    return last_text


def approved_finding(root, run_id):
    lines = read_approved_review(root, run_id).strip().splitlines()
    if not lines or not lines[-1].startswith(MARKER):
        return None
    finding = lines[-1].removeprefix(MARKER).strip()
    if finding == 'none':
        return None
    if not finding or len(finding) > 320 or re.search(r'@|https?://|<|>|!\[|[\x00-\x1f]', finding):
        raise SystemExit('Wpis Codexa nie spełnia formatu notatki projektu.')
    previous = lines[-2].removeprefix(REPLACE).strip() if len(lines) > 1 and lines[-2].startswith(REPLACE) else None
    return finding, previous


def update(root, run_id):
    proposed = approved_finding(root, run_id)
    if not proposed:
        print('Recenzja nie wskazała trwałej zmiany do zapisania.')
        return
    finding, previous = proposed
    try:
        note = NOTE.open('r+')
    except FileNotFoundError:
        print('Notatka obok projektu jest niedostępna.')
        return
    today = datetime.date.today().isoformat()
    with note:
        fcntl.flock(note, fcntl.LOCK_EX)
        content = note.read()
        if any(line.endswith(f': {finding}') for line in content.splitlines()):
            return
        if f'\n{HEADING}\n' not in content:
            content = content.rstrip() + f'\n\n{HEADING}\n'
        entry = f'- {today}: {finding}\n'
        prefix, section = content.split(f'\n{HEADING}\n', 1)
        section, separator, remainder = section.partition('\n## ')
        if previous:
            section = re.sub(r'^- \d{4}-\d{2}-\d{2}: ' + re.escape(previous) + r'\n', '', section, count=1, flags=re.M)
        content = prefix + f'\n{HEADING}\n\n' + entry + section.lstrip('\n') + separator + remainder
        note.seek(0)
        note.write(content)
        note.truncate()
    print('Zapisano ustalenie Codexa w Obsidianie.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['snapshot', 'update'])
    args = parser.parse_args()
    if args.action == 'snapshot':
        snapshot()
    else:
        update(Path(os.environ['DUONEST_CEZAR_ROOT']), os.environ['CEZ_RUN_ID'])
