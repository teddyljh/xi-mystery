#!/usr/bin/env node
'use strict';

// Exercise the shipped rules and hint handler against the complete fixture pool.
// Run with: node scripts/test_hard_mode.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = JSON.parse(source.split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
const rules = source.slice(source.indexOf('  // Hard includes every historical XI'),
  source.indexOf('  // Shuffle-bag rotation'));
const hints = source.slice(source.indexOf('  function getHint(){'), source.indexOf('  function next(){'));
let roll = 0;
let fixture;
let renders = 0;
const feedback = {textContent: ''};
const math = Object.create(Math);
math.random = () => roll;
const context = vm.createContext({
  DATA: data, Math: math, state: {},
  current: () => fixture,
  $: () => feedback,
  tr: key => key,
  renderGame: () => { renders++; },
});
vm.runInContext(rules + '\n' + hints + `
  globalThis.api = {buildHardMask, isImportedHardFixture, isFeaturedHardFixture,
    selectHardForward, picks: HARD_FORWARD_PICKS, getHint, available};
`, context);
const api = context.api;
const midfield = new Set(['AM', 'CM', 'DM', 'LM', 'RM']);
const defense = new Set(['LB', 'CB', 'RB', 'LWB', 'RWB']);
const attack = new Set(['ST', 'LS', 'RS', 'LW', 'RW', 'AM', 'LM', 'RM']);
const hard = data.fixtures.filter(f => f.tier === 'hard' || api.isImportedHardFixture(f));
const featured = hard.filter(api.isFeaturedHardFixture);
const underdogs = hard.filter(f => !api.isFeaturedHardFixture(f));

function reset(mask, difficulty = 'hard') {
  context.state = {difficulty, mode: fixture.mode, masked: [...mask], hints: 0,
    revealed: false, choicesShown: difficulty === 'easy',
    choices: [fixture.team, 'wrong-a', 'wrong-b', 'wrong-c'], removed: []};
  renders = 0;
  feedback.textContent = '';
}

// Include extreme random values to catch the old random-forward selection and
// cases where a second attacker or goalkeeper used to be hidden as clue three.
for (const f of featured) {
  fixture = f;
  const preferred = api.picks[f.id.replace(/-medium$/, '')];
  assert.ok(preferred, 'Review the attacking clue for new featured XI: ' + f.id);
  for (let sample = 0; sample <= 20; sample++) {
    roll = sample / 20 * 0.999999;
    const mask = [...api.buildHardMask(f)];
    assert.equal(mask.length, 3, f.id);
    assert.equal(new Set(mask).size, 3, f.id);
    assert.ok(midfield.has(f.players[mask[0]].role), f.id + ': first hint is midfield');
    assert.ok(defense.has(f.players[mask[1]].role), f.id + ': second hint is defense');
    assert.ok(attack.has(f.players[mask[2]].role), f.id + ': protected attacking player');
    assert.equal(f.players[mask[2]].name, preferred, f.id + ': curated forward');
    assert.ok(mask.every(i => f.players[i].role !== 'GK'), f.id + ': goalkeeper stays visible');
    reset(mask);
    api.getHint();
    assert.deepEqual(context.state.masked, mask.slice(1), f.id + ': first hint');
    assert.equal(context.state.hints, 1);
    assert.equal(feedback.textContent, 'uncovered');
    api.getHint();
    assert.deepEqual(context.state.masked, [mask[2]], f.id + ': forward still hidden after both hints');
    assert.equal(context.state.hints, 2);
    api.getHint();
    assert.deepEqual(context.state.masked, [mask[2]], f.id + ': extra hint cannot expose forward');
    assert.equal(renders, 2);
    reset(mask);
    context.state.revealed = true;
    api.getHint();
    assert.deepEqual(context.state.masked, mask);
    assert.equal(context.state.hints, 0);
  }
}

for (const f of underdogs) {
  fixture = f;
  for (roll of [0, 0.5, 0.999999]) {
    assert.deepEqual([...api.buildHardMask(f)], [4, 7], f.id + ': original mask');
  }
  reset([4, 7]);
  api.getHint();
  assert.deepEqual(context.state.masked, [7], f.id + ': original hint one');
  api.getHint();
  assert.deepEqual(context.state.masked, [], f.id + ': original hint two');
}

// These players are deliberately protected even when their stored position is
// LM/RM/AM rather than a conventional ST/LW/RW role.
const regressions = {
  'historic-club-manunited-2008-05-21-3': 'Cristiano Ronaldo',
  'historic-club-bayern-2010-05-22-8': 'Arjen Robben',
  'historic-club-chelsea-2005-03-08-0': 'Eidur Gudjohnsen',
  'historic-club-milan-2007-05-23-19': 'Kaka',
  'historic-nation-FRA-2016-07-10-43': 'Antoine Griezmann',
  'historic-club-realmadrid-2014-05-24-11': 'Gareth Bale',
  'historic-club-barcelona-2015-06-06-9': 'Lionel Messi',
  'historic-club-liverpool-2019-06-01-17': 'Mohamed Salah',
  'historic-club-city-2023-06-10-15': 'Erling Haaland',
  'historic-nation-FRA-2022-12-18-33': 'Kylian Mbappe',
  'historic-nation-POR-2024-06-26-48': 'Cristiano Ronaldo',
  'nation-2025/26-78': 'Memphis Depay',
  'historic-club-barcelona-2005-03-08-28': 'Ronaldinho',
};
for (const [id, name] of Object.entries(regressions)) {
  const f = data.fixtures.find(f => f.id === id);
  assert.ok(f && api.isFeaturedHardFixture(f), id);
  assert.equal(f.players[api.buildHardMask(f)[2]].name, name, id);
}
for (const id of Object.keys(api.picks)) {
  assert.ok(featured.some(f => f.id === id), 'No stale curated entry: ' + id);
}

// Pool membership and the original per-tier pools remain unchanged.
for (const mode of ['club', 'nation']) {
  for (const difficulty of ['easy', 'moderate', 'hard']) {
    context.state = {mode, difficulty};
    const expected = data.fixtures.filter(f => f.mode === mode &&
      (f.tier === difficulty || (difficulty === 'hard' && api.isImportedHardFixture(f))));
    assert.deepEqual([...api.available()].map(f => f.id), expected.map(f => f.id));
  }
}
fixture = data.fixtures[0];
reset([], 'moderate');
api.getHint();
assert.equal(context.state.choicesShown, true);
api.getHint();
assert.deepEqual(context.state.removed, ['wrong-a', 'wrong-b']);
reset([], 'easy');
api.getHint();
assert.deepEqual(context.state.removed, ['wrong-a', 'wrong-b']);
assert.equal(context.state.hints, 1);

// Fallbacks for future/unlisted XIs stay deterministic and hide an informative
// clue. A known attacker marked LM is still eligible; defenders never are.
const future = {id: 'future-xi', players: [
  {name: 'Academy striker', role: 'ST', value: 'ENG'},
  {name: 'Local winger', role: 'RW', value: 'ENG'},
  {name: 'Unusual winger', role: 'LW', value: 'WAL'},
  {name: 'Local midfielder', role: 'CM', value: 'ENG'},
]};
assert.equal(api.selectHardForward(future), 2);
future.players[1] = {name: 'Cristiano Ronaldo', role: 'LM', value: 'POR'};
assert.equal(api.selectHardForward(future), 1);
future.players[1].role = 'CB';
assert.equal(api.selectHardForward(future), 2);

// The gallery updater must preserve the new rules and migrate an older mask
// ordering; test in an isolated copy rather than rewriting the working tree.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'xi-hard-test-'));
try {
  fs.mkdirSync(path.join(temp, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/upgrade_hard.py'), path.join(temp, 'scripts/upgrade_hard.py'));
  const index = path.join(temp, 'index.html');
  fs.writeFileSync(index, source);
  const upgrade = () => execFileSync('python3', [path.join(temp, 'scripts/upgrade_hard.py')]);
  upgrade();
  assert.equal(fs.readFileSync(index, 'utf8'), source, 'updater is idempotent');
  fs.writeFileSync(index, source.replace('return [midfielder,defender,striker];', 'return [striker,midfielder,defender];'));
  upgrade();
  assert.equal(fs.readFileSync(index, 'utf8'), source, 'updater refreshes existing installations');
  upgrade();
  assert.equal(fs.readFileSync(index, 'utf8'), source, 'repeat updates preserve generated HTML');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}

console.log(`PASS: ${featured.length} featured fixtures, ${Object.keys(api.picks).length} unique XIs, ` +
  `${underdogs.length} unchanged underdog fixtures; hint order, fallback and updater checks passed.`);
