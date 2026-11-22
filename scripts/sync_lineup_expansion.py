#!/usr/bin/env python3
"""Embed match-specific difficulty additions without altering the source archive."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ('id', 'mode', 'season', 'tier', 'team', 'date', 'versus', 'formation', 'competition', 'source')


def main():
    index = ROOT / 'index.html'
    source = original = index.read_text(encoding='utf-8')
    marker = 'window.LINEUP_DATA = '
    old = source.split(marker, 1)[1].split(';\n', 1)[0]
    data = json.loads(old)
    catalog = json.loads((ROOT / 'data/lineup_expansion.json').read_text(encoding='utf-8'))
    paths = {}
    for key, record in catalog['clubs'].items():
        club = {k: v for k, v in record.items() if k != 'crestPath'}
        assert key not in data['teams'] or data['teams'][key] == club, key
        data['teams'][key] = club
        paths[key] = record['crestPath']
    base = {f['id']: f for f in data['fixtures']}
    entries, seen = [], set()
    for record in catalog['fixtures']:
        assert record['difficulties'] and set(record['difficulties']) <= {'easy', 'moderate', 'hard'}
        if 'reuseId' in record:
            assert record['reuseId'] in base
            fixture = base[record['reuseId']]
            runtime = record['reuseId']
        else:
            fixture = {k: record[k] for k in FIELDS}
            fixture['players'] = [{k: p[k] for k in ('role', 'name', 'value')} for p in record['players']]
            assert not any((f['mode'], f['team'], f['date']) == (fixture['mode'], fixture['team'], fixture['date']) for f in base.values()), fixture['id']
            runtime = fixture
        assert len(fixture['players']) == len({p['name'] for p in fixture['players']}) == 11
        assert fixture['players'][-1]['role'] == 'GK'
        assert sum(map(int, fixture['formation'].split('-'))) == 10
        assert fixture['team'] in data['teams' if fixture['mode'] == 'club' else 'nations']
        assert all(p['value'] in data['nations' if fixture['mode'] == 'club' else 'teams'] for p in fixture['players'])
        identity = (fixture['mode'], fixture['team'], fixture['date'])
        assert identity not in seen, identity
        seen.add(identity)
        entry = {'fixture': runtime, 'difficulties': record['difficulties']}
        for field in ('hardForward', 'hardMask'):
            if field in record:
                names = record[field] if isinstance(record[field], list) else [record[field]]
                assert all(name in {p['name'] for p in fixture['players']} for name in names), fixture['id']
                entry[field] = record[field]
        entries.append(entry)
    data['lineupExpansion'] = entries
    data['mediumExcludedClubs'] = catalog['mediumExcludedClubs']
    source = source.replace(marker + old + ';\n', marker + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', 1)
    marker = '  const CREST_PATH_OVERRIDES='
    old = source.split(marker, 1)[1].split(';\n', 1)[0]
    crests = json.loads(old) | paths
    source = source.replace(marker + old + ';\n', marker + json.dumps(crests, ensure_ascii=False, separators=(',', ':')) + ';\n', 1)
    if source != original:
        index.write_text(source, encoding='utf-8')
    print(f'Lineup expansion synchronized: {len(entries)} entries, {sum(isinstance(e["fixture"], str) for e in entries)} reused; archive unchanged')


if __name__ == '__main__':
    main()
