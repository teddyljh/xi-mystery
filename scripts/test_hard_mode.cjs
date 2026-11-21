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
    selectHardForward, picks: HARD_FORWARD_PICKS, getHint, available,
    usesLeagueHardMask, hardLeagueNation, usesNationHardMask,
    hardNationDomesticSlots, hardNationProtectedSlots, mediumNations:HARD_MEDIUM_NATIONS};
`, context);
const api = context.api;
const midfield = new Set(['AM', 'CM', 'DM', 'LM', 'RM']);
const defense = new Set(['LB', 'CB', 'RB', 'LWB', 'RWB']);
const attack = new Set(['ST', 'LS', 'RS', 'LW', 'RW', 'AM', 'LM', 'RM']);
const hard = data.fixtures.filter(f => f.tier === 'hard' || api.isImportedHardFixture(f));
const featured = hard.filter(api.isFeaturedHardFixture);
const league = hard.filter(api.usesLeagueHardMask);
const nations = hard.filter(api.usesNationHardMask);
const threeClues = hard.filter(f => !api.usesNationHardMask(f) && (api.isFeaturedHardFixture(f) || api.usesLeagueHardMask(f)));
const underdogs = hard.filter(f => !api.isFeaturedHardFixture(f) && !api.usesLeagueHardMask(f) && !api.usesNationHardMask(f));

function reset(mask, difficulty = 'hard') {
  context.state = {difficulty, mode: fixture.mode, masked: [...mask], hints: 0,
    revealed: false, choicesShown: difficulty === 'easy',
    choices: [fixture.team, 'wrong-a', 'wrong-b', 'wrong-c'], removed: []};
  renders = 0;
  feedback.textContent = '';
}

// Include extreme random values to cover every pair-selection tie. League
// rules prioritize nationality; other featured XIs retain midfield/defense.
for (const f of threeClues) {
  fixture = f;
  const preferred = api.picks[f.id.replace(/-medium$/, '')];
  if (api.isFeaturedHardFixture(f))assert.ok(preferred, 'Review the attacking clue for new featured XI: ' + f.id);
  for (let sample = 0; sample <= 20; sample++) {
    roll = sample / 20 * 0.999999;
    const mask = [...api.buildHardMask(f)];
    assert.equal(mask.length, 3, f.id);
    assert.equal(new Set(mask).size, 3, f.id);
    assert.ok(attack.has(f.players[mask[2]].role), f.id + ': protected attacking player');
    if (preferred)assert.equal(f.players[mask[2]].name, preferred, f.id + ': curated forward');
    if (api.usesLeagueHardMask(f)) {
      const nation = api.hardLeagueNation(f);
      assert.ok(mask.slice(0, 2).every(i => f.players[i].value === nation), f.id + ': two OTHER domestic clues');
      const forwards = f.players.filter(p => ['ST','LS','RS','LW','RW'].includes(p.role));
      if (forwards.some(p => p.value === nation)) {
        assert.equal(f.players[mask[2]].value, nation, f.id + ': domestic forward first');
      } else {
        const count = value => f.players.filter(p => p.value === value).length;
        assert.equal(count(f.players[mask[2]].value), Math.min(...forwards.map(p => count(p.value))), f.id + ': unusual nationality without domestic forward');
      }
      const domestic = f.players.filter((p,i) => i !== mask[2] && p.value === nation);
      if (domestic.some(p => midfield.has(p.role)) && domestic.some(p => defense.has(p.role))) {
        assert.ok(midfield.has(f.players[mask[0]].role), f.id + ': domestic midfield hint first when possible');
        assert.ok(defense.has(f.players[mask[1]].role), f.id + ': domestic defense hint second when possible');
      }
    } else {
      assert.ok(midfield.has(f.players[mask[0]].role), f.id + ': first hint is midfield');
      assert.ok(defense.has(f.players[mask[1]].role), f.id + ': second hint is defense');
      assert.ok(mask.every(i => f.players[i].role !== 'GK'), f.id + ': goalkeeper stays visible');
    }
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

// Domestic-league crests/names are protected even when hints are used. Two
// separate foreign-club clues remain available as hints, and key export clues
// stay hidden as well. Exercise every affected fixture and random tie edge.
for (const f of nations) {
  fixture=f;
  const domestic=[...api.hardNationDomesticSlots(f)];
  const locked=[...api.hardNationProtectedSlots(f)];
  assert.ok(domestic.every(i=>locked.includes(i)),f.id+': all domestic clues protected');
  assert.ok(locked.length>=2,f.id+': identifying export clues protected');
  const previous=api.picks[f.id.replace(/-medium$/,'')];
  if(previous)assert.ok(locked.some(i=>f.players[i].name===previous),f.id+': original iconic forward stays protected');
  for(let sample=0;sample<=20;sample++){
    roll=sample/20*0.999999;
    const mask=[...api.buildHardMask(f)];
    assert.ok(mask.length>=4 && mask.length<=9,f.id+': more clues hidden while retaining visible clues');
    assert.equal(new Set(mask).size,mask.length);
    assert.ok(locked.every(i=>mask.includes(i)),f.id);
    assert.deepEqual(mask.slice(2),locked,f.id+': only the first two clues can be hinted');
    reset(mask);
    api.getHint();api.getHint();
    assert.deepEqual(context.state.masked,locked,f.id+': domestic and key clues survive both hints');
    api.getHint();
    assert.deepEqual(context.state.masked,locked);
    assert.equal(context.state.hints,2);
  }
  // The hint handler must skip protected positions, even if a queue is reordered.
  roll=0;
  const mask=[...api.buildHardMask(f)];
  reset([...locked,...mask.slice(0,2)]);
  api.getHint();
  assert.ok(locked.every(i=>context.state.masked.includes(i)),f.id+': no protected-clue leak');
}
const japan=data.fixtures.find(f=>f.id==='historic-nation-JPN-2022-11-23-50');
const korea=data.fixtures.find(f=>f.id==='historic-nation-KOR-2022-12-02-51');
assert.deepEqual([...api.hardNationDomesticSlots(japan)],[6,9,10]);
assert.deepEqual([...api.hardNationDomesticSlots(korea)],[0,6,7,9]);
assert.equal(api.buildHardMask(japan).length,6);
assert.equal(api.buildHardMask(korea).length,7);
assert.ok(api.hardNationProtectedSlots(japan).some(i=>japan.players[i].name==='Takefusa Kubo'));
assert.ok(api.hardNationProtectedSlots(korea).some(i=>korea.players[i].name==='Son Heung-min'));
for(const f of hard.filter(f=>f.mode==='nation' && f.team==='WAL')){
  assert.deepEqual([...api.hardNationDomesticSlots(f)],[],'Welsh clubs in the English league system are not Welsh-league clues');
}
const bands=source.split('const EASY_NATION_LEVELS=[',2)[1].split('].map(keys=>keys.split',1)[0].match(/'[^']*'/g).map(s=>s.slice(1,-1).split(' '));
assert.deepEqual([...api.mediumNations].sort(),[...new Set([...bands[1],...bands[2]])].sort(),'recognition groups stay aligned');
for(const f of data.fixtures.filter(f=>f.mode==='club'))assert.equal(api.usesNationHardMask(f),false);
for(const key of ['FRA','ARG','KSA','CRC','ISL','GEO'])assert.equal(api.usesNationHardMask({mode:'nation',team:key}),false,key+': unchanged recognition group');

// In a future heavily domestic XI, hints may offer choices rather than exposing
// a protected home-club clue. Two visible foreign clues stay visible initially.
fixture={...japan,id:'future-domestic-xi',players:japan.players.map((p,i)=>({...p,value:i<2?p.value:'fctokyo'}))};
const domesticMask=[...api.buildHardMask(fixture)];
assert.equal(domesticMask.length,9);
reset(domesticMask);
api.getHint();api.getHint();
assert.deepEqual(context.state.masked,domesticMask);
assert.equal(context.state.choicesShown,true);

// These players are deliberately protected even when their stored position is
// LM/RM/AM rather than a conventional ST/LW/RW role.
const regressions = {
  'club-2026/27-3': 'Viktor Gyökeres',
  'club-2026/27-23': 'Guus Til',
  'club-2025/26-37': 'Wout Weghorst',
  'club-2024/25-66': 'Nicolas Kühn',
  'club-2024/25-70': 'Pedro Gonçalves',
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

// Insufficient domestic players means the ENTIRE former mask is retained,
// including its original forward, rather than a partially applied new policy.
const insufficient = {
  'club-2026/27-25': [[4, 9, 1]],
  'club-2025/26-44': [[3, 7, 1], [4, 7, 1]],
  'club-2024/25-124': [[4, 7]],
  'club-2024/25-126': [[4, 7]],
  'club-2025/26-127': [[4, 7]],
};
for (const [id, masks] of Object.entries(insufficient)) {
  const f = data.fixtures.find(f => f.id === id);
  assert.equal(api.usesLeagueHardMask(f), false, id + ': legacy fallback');
  for (roll of [0, 0.5, 0.999999]) {
    assert.ok(masks.some(mask => JSON.stringify(mask) === JSON.stringify([...api.buildHardMask(f)])), id + ': exact old mask');
  }
}
// The new scope explicitly includes lesser-known clubs outside the big five.
for (const id of ['club-2026/27-24', 'club-2026/27-34', 'club-2025/26-89', 'club-2025/26-128']) {
  const f = data.fixtures.find(f => f.id === id);
  assert.equal(api.isFeaturedHardFixture(f), false, id);
  assert.equal(api.usesLeagueHardMask(f), true, id);
  assert.equal(api.buildHardMask(f).length, 3, id);
}
assert.equal(api.hardLeagueNation(data.fixtures.find(f => f.team === 'arsenal')), undefined);
for (const f of data.fixtures.filter(f => f.mode === 'nation'))assert.equal(api.usesLeagueHardMask(f), false, f.id);

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
fixture=japan;
reset([], 'moderate');
api.getHint();
assert.equal(context.state.choicesShown,true,'Moderate national hints unchanged');
assert.deepEqual(context.state.masked,[]);

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

const futureLeague = {id:'future-league-xi', mode:'club', team:'porto', players:[
  {name:'Cristiano Ronaldo',role:'LW',value:'ENG'},
  {name:'Visiting striker',role:'ST',value:'ENG'},
  {name:'Unusual winger',role:'RW',value:'WAL'},
  {name:'Domestic midfielder',role:'CM',value:'POR'},
  {name:'Domestic defender',role:'CB',value:'POR'},
]};
assert.equal(api.usesLeagueHardMask(futureLeague), true);
assert.equal(api.selectHardForward(futureLeague), 2, 'rare clue outranks a known foreign star when no domestic forward exists');
futureLeague.players[1].value='POR';
assert.equal(api.selectHardForward(futureLeague), 1, 'domestic forward outranks a famous foreign player');
futureLeague.players[4].value='BRA';
assert.equal(api.usesLeagueHardMask(futureLeague), false, 'domestic forward requires two ADDITIONAL domestic players');

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
  fs.writeFileSync(index,source.replace('state.masked.splice(hintIndex,1)','state.masked.shift()'));
  upgrade();
  assert.equal(fs.readFileSync(index,'utf8'),source,'updater repairs the hint handler even when mask rules already match');
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}

console.log(`PASS: ${featured.length} featured fixtures, ${Object.keys(api.picks).length} unique XIs, ` +
  `${league.length} league-nationality masks, ${nations.length} national-team masks, ${underdogs.length} unchanged two-clue fixtures; protected domestic clues, hints, exact legacy fallbacks and updater checks passed.`);
