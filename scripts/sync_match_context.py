#!/usr/bin/env python3
"""Embed post-answer stories and three Hard-only MLS XIs, without editing the archive."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_json(source, marker, value):
    old = source.split(marker, 1)[1].split(';\n', 1)[0]
    return source.replace(marker + old + ';\n', marker + json.dumps(value, ensure_ascii=False, separators=(',', ':')) + ';\n', 1)


def main():
    index = ROOT / 'index.html'
    source = original = index.read_text(encoding='utf-8')
    data = json.loads(source.split('window.LINEUP_DATA = ', 1)[1].split(';\n', 1)[0])
    catalog = json.loads((ROOT / 'data/hard_mls_stars.json').read_text(encoding='utf-8'))
    crests = {}
    for key, record in catalog['clubs'].items():
        club = {k: v for k, v in record.items() if k != 'crestPath'}
        assert key not in data['teams'] or data['teams'][key] == club, key
        data['teams'][key] = club
        crests[key] = record['crestPath']
    for key, nation in catalog['nations'].items():
        assert key not in data['nations'] or data['nations'][key] == nation, key
        data['nations'][key] = nation
    fixtures = []
    for record in catalog['fixtures']:
        assert record['mode'] == 'club' and record['tier'] == 'hard'
        assert record['team'] in data['teams']
        assert len(record['players']) == len({p['name'] for p in record['players']}) == 11
        assert all(p['value'] in data['nations'] for p in record['players'])
        assert record['players'][-1]['role'] == 'GK'
        assert sum(map(int, record['formation'].split('-'))) == 10
        assert len(record['hardHintOrder']) == len(set(record['hardHintOrder'])) == 2
        assert all(sum(p['name'] == name for p in record['players']) == 1 for name in record['hardHintOrder'])
        assert record['hardHintOrder'][-1] == record['star']
        fields = ('id', 'mode', 'season', 'tier', 'team', 'date', 'versus', 'formation', 'competition', 'source', 'players', 'hardHintOrder')
        fixtures.append({k: record[k] for k in fields})
    assert len({(f['team'], f['date']) for f in fixtures}) == len(fixtures)
    data['hardMlsStars'] = fixtures
    context = json.loads((ROOT / 'data/match_context.json').read_text(encoding='utf-8'))
    assert all(all(lang in m['note'] for lang in ('zh', 'en', 'es')) and m['sources'] for m in context['matches'])
    # Sources stay in the reviewable catalog; the offline game needs only text.
    data['matchContext'] = dict(context, matches=[{k: v for k, v in m.items() if k != 'sources'} for m in context['matches']])
    source = replace_json(source, 'window.LINEUP_DATA = ', data)
    paths = json.loads(source.split('  const CREST_PATH_OVERRIDES=', 1)[1].split(';\n', 1)[0])
    source = replace_json(source, '  const CREST_PATH_OVERRIDES=', paths | crests)
    assets = json.loads(source.split('window.XI_UI_ASSETS = ', 1)[1].split(';\n', 1)[0])
    for code, asset in catalog['flags'].items():
        content = (ROOT / asset['path']).read_bytes()
        assert content.startswith(b'\x89PNG\r\n\x1a\n')
        assets['flags'][code] = 'data:image/png;base64,' + base64.b64encode(content).decode('ascii')
    source = replace_json(source, 'window.XI_UI_ASSETS = ', assets)
    # The archived club registry has two Chicago Fire keys. Keep both for old
    # national-team clues, but resolve typing/suggestions to the quiz answer.
    alias_helper = "  const canonicalAnswerKey=(group,key)=>group===DATA.teams&&key==='chicagofire'?'chicago':key;\n"
    if alias_helper not in source:
        source = source.replace('  function findExactAnswer(input){', alias_helper + '  function findExactAnswer(input){', 1)
    source = source.replace(
        '    const matches=Object.keys(group).filter(key=>searchTerms(group,key).includes(target));',
        '    const matches=[...new Set(Object.keys(group).filter(key=>searchTerms(group,key).includes(target)).map(key=>canonicalAnswerKey(group,key)))];', 1)
    source = source.replace('    return scored.slice(0,7);',
        '    return scored.filter(entry=>entry.key===canonicalAnswerKey(group,entry.key)).slice(0,7);', 1)
    module = (ROOT / 'scripts/reveal_context.js').read_text(encoding='utf-8')
    start_marker, end_marker = '  // Answer-reveal match context.', '  // End answer-reveal match context.\n'
    if start_marker in source:
        start = source.index(start_marker)
        end = source.index(end_marker, start) + len(end_marker)
        source = source[:start] + module + source[end:]
    else:
        source = source.replace('  function renderGame(){', module + '  function renderGame(){', 1)
    points = '                <p id="inline-result-points" class="inline-result-points"></p>\n'
    if 'id="inline-result-description"' not in source:
        assert source.count(points) == 1
        source = source.replace(points, points + '                <p id="inline-result-description" class="inline-result-points match-explanation"></p>\n', 1)
    hook = "    renderMatchExplanation($('inline-result-description'),state.revealed?f:null);\n"
    if hook not in source:
        marker = "    inline.classList.toggle('hidden',!state.revealed);\n"
        assert source.count(marker) == 1
        source = source.replace(marker, marker + hook, 1)
    css = '.match-explanation{line-height:1.65!important;overflow-wrap:anywhere}.match-explanation strong{font-weight:700}\n'
    if css not in source:
        source = source.replace('.inline-result .primary-btn{', css + '.inline-result .primary-btn{', 1)
    if source != original:
        index.write_text(source, encoding='utf-8')
    print(f'Answer context synchronized: {len(context["matches"])} memorable matches; {len(fixtures)} Hard-only MLS XIs')


if __name__ == '__main__':
    main()
