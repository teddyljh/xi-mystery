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
    hardNationDomesticSlots, hardNationHiddenSlots, hardNationMaskOverride,
    mediumNations:HARD_MEDIUM_NATIONS};
`, context);
const api = context.api;
const midfield = new Set(['AM', 'CM', 'DM', 'LM', 'RM']);
const defense = new Set(['LB', 'CB', 'RB', 'LWB', 'RWB']);
const attack = new Set(['ST', 'LS', 'RS', 'LW', 'RW', 'AM', 'LM', 'RM']);
const hard = ['club','nation'].flatMap(mode=>{context.state={mode,difficulty:'hard'};return [...api.available()];});
const featured = hard.filter(api.isFeaturedHardFixture);
const league = hard.filter(api.usesLeagueHardMask);
const nations = hard.filter(api.usesNationHardMask);
const isNetherlands2014=f=>f.mode==='nation'&&f.team==='NED'&&f.date==='2014-06-13';
const isNewMls=f=>(data.hardMlsStars||[]).some(x=>x.id===f.id);
const threeClues = hard.filter(f => !isNewMls(f) && !api.hardNationMaskOverride(f) && !api.usesNationHardMask(f) && (api.isFeaturedHardFixture(f) || api.usesLeagueHardMask(f)));
const underdogs = hard.filter(f => !isNewMls(f) && !api.isFeaturedHardFixture(f) && !api.usesLeagueHardMask(f) && !api.usesNationHardMask(f));

function reset(mask, difficulty = 'hard') {
  context.state = {difficulty, mode: fixture.mode, masked: [...mask], hints: 0,
    revealed: false, choicesShown: difficulty === 'easy',
    choices: [fixture.team, 'wrong-a', 'wrong-b', 'wrong-c'], removed: []};
  renders = 0;
  feedback.textContent = '';
}

// This historic XI leaves one visible Ajax clue and one visible Feyenoord
// clue. Hints restore the two overseas players while domestic clues stay masked.
const netherlands2014=hard.filter(isNetherlands2014);
assert.ok(netherlands2014.length);
for(const f of netherlands2014){
  fixture=f;
  for(roll of [0,0.5,0.999999]){
    const mask=[...api.buildHardMask(f)];
    assert.deepEqual(mask.map(i=>f.players[i].name),[
      'Robin van Persie','Wesley Sneijder','Daley Blind','Bruno Martins Indi','Stefan de Vrij'
    ],f.id+': exact five hidden players and hint order');
    for(const [club,visible] of [['ajax','Jasper Cillessen'],['feyenoord','Daryl Janmaat']]){
      assert.deepEqual(f.players.filter((p,i)=>p.value===club&&!mask.includes(i)).map(p=>p.name),[visible],f.id+': one visible '+club+' player');
    }
    reset(mask);
    api.getHint();
    assert.deepEqual(context.state.masked,mask.slice(1),f.id+': Van Persie restored first');
    api.getHint();
    assert.deepEqual(context.state.masked,mask.slice(2),f.id+': Sneijder restored second');
    assert.equal(context.state.hints,2);
    assert.equal(context.state.choicesShown,false);
    assert.deepEqual(context.state.removed,[]);
    api.getHint();
    assert.deepEqual(context.state.masked,mask.slice(2),f.id+': no third hint');
    assert.equal(renders,2);
  }
}

// Match-specific masks retain their exact player and hint order. Both Spain
// copies keep Ruiz/Cucurella visible and Yamal hidden after the two hints.
for(const [id,names,clubs] of [
  ['historic-nation-ESP-2024-07-14-30',['Nico Williams','Robin Le Normand','Lamine Yamal'],['athletic','sociedad','barcelona']],
  ['historic-nation-ESP-2024-07-14-30-medium',['Nico Williams','Robin Le Normand','Lamine Yamal'],['athletic','sociedad','barcelona']],
  ['nation-2026/27-10',['Pau Cubarsí','Aymeric Laporte','Lamine Yamal'],['barcelona','athletic','barcelona']],
  ['nation-2026/27-12',['Kevin De Bruyne','Jérémy Doku','Brandon Mechele'],['napoli','city','brugge']],
  ['nation-2025/26-106',['Gianluigi Donnarumma','Francesco Pio Esposito','Federico Dimarco','Nicolò Barella'],['city','inter','inter','inter']],
  ['nation-2026/27-75',['Gianluigi Donnarumma','Francesco Pio Esposito','Nicolò Fagioli','Alessandro Bastoni'],['city','inter','fiorentina','inter']]
]){
  const f=data.fixtures.find(f=>f.id===id);
  assert.ok(f,id);
  fixture=f;
  for(roll of [0,0.5,0.999999]){
    const mask=[...api.buildHardMask(f)];
    assert.deepEqual(mask.map(i=>f.players[i].name),names,id+': exact requested players');
    assert.deepEqual(mask.map(i=>f.players[i].value),clubs,id+': exact club clues');
    if(f.team==='ESP'){
      for(const surname of ['Ruiz','Cucurella']){
        const i=f.players.findIndex(p=>p.name.includes(surname));
        assert.ok(i!==-1&&!mask.includes(i),id+': '+surname+' visible from the start');
      }
    }
    reset(mask);
    api.getHint();
    assert.deepEqual(context.state.masked,mask.slice(1),id+': first requested hint');
    api.getHint();
    assert.deepEqual(context.state.masked,mask.slice(2),id+': second requested hint');
    assert.equal(context.state.hints,2);
    assert.equal(context.state.choicesShown,false);
    assert.deepEqual(context.state.removed,[]);
    api.getHint();
    assert.deepEqual(context.state.masked,mask.slice(2),id+': remaining clue stays hidden');
  }
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
      // Curated attackers can be listed as AM/LM/RM (e.g. Deco in 2004).
      const forwards = f.players.filter(p => ['ST','LS','RS','LW','RW'].includes(p.role)||p.name===preferred);
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

// Every middle-band national team masks only domestic-club/key-player clues.
// Each hint restores one masked player, preferring overseas clubs every time.
for (const f of nations) {
  fixture=f;
  const domestic=[...api.hardNationDomesticSlots(f)];
  const locked=[...api.hardNationHiddenSlots(f)];
  assert.ok(domestic.every(i=>locked.includes(i)),f.id+': all domestic clues hidden initially');
  assert.ok(locked.length>=2,f.id+': identifying player clues selected');
  const previous=api.picks[f.id.replace(/-medium$/,'')];
  if(previous)assert.ok(locked.some(i=>f.players[i].name===previous),f.id+': original iconic forward hidden initially');
  for(let sample=0;sample<=20;sample++){
    roll=sample/20*0.999999;
    const mask=[...api.buildHardMask(f)];
    const expectedCount=api.hardNationMaskOverride(f)?.length??Math.max(2,domestic.length+(domestic.length<5?1:0));
    assert.equal(mask.length,expectedCount,f.id+': no extra players masked for hints');
    assert.equal(new Set(mask).size,mask.length);
    assert.deepEqual(mask,locked,f.id+': only domestic-club/key-player clues masked');
    reset(mask);
    const expected=[...mask];
    for(let h=0;h<2;h++){
      const overseas=expected.findIndex(i=>!domestic.includes(i));
      expected.splice(overseas===-1?0:overseas,1);
      api.getHint();
      assert.deepEqual(context.state.masked,expected,f.id+': overseas-first hint '+(h+1));
      assert.equal(context.state.hints,h+1);
      assert.equal(feedback.textContent,'uncovered');
    }
    assert.equal(context.state.choicesShown,false,f.id+': hints never show answer choices');
    assert.deepEqual(context.state.removed,[],f.id+': hints never remove answer choices');
    const afterHints=[...context.state.masked];
    api.getHint();
    assert.deepEqual(context.state.masked,afterHints);
    assert.equal(context.state.hints,2);
  }
  // Selection remains correct even when a mask queue is reordered.
  roll=0;
  const mask=[...api.buildHardMask(f)];
  reset([...mask].reverse());
  const firstOverseas=context.state.masked.findIndex(i=>!domestic.includes(i));
  const expected=[...context.state.masked];
  expected.splice(firstOverseas===-1?0:firstOverseas,1);
  api.getHint();
  assert.deepEqual(context.state.masked,expected,f.id+': restore order independent of mask queue');
  reset([]);
  api.getHint();
  assert.equal(context.state.choicesShown,false,f.id+': empty mask never switches to choices');
  assert.equal(context.state.hints,0);
}
const japan=data.fixtures.find(f=>f.id==='historic-nation-JPN-2022-11-23-50');
const korea=data.fixtures.find(f=>f.id==='historic-nation-KOR-2022-12-02-51');
assert.deepEqual([...api.hardNationDomesticSlots(japan)],[6,9,10]);
assert.deepEqual([...api.hardNationDomesticSlots(korea)],[0,6,7,9]);
assert.deepEqual([...api.buildHardMask(japan)].sort((a,b)=>a-b),[1,6,9,10],'Japan hides exactly the requested four players');
assert.deepEqual([...api.buildHardMask(korea)].sort((a,b)=>a-b),[0,1,6,7,9],'Korea hides exactly the requested five players');
assert.ok(api.hardNationHiddenSlots(japan).some(i=>japan.players[i].name==='Takefusa Kubo'));
assert.ok(api.hardNationHiddenSlots(korea).some(i=>korea.players[i].name==='Son Heung-min'));
for(const f of hard.filter(f=>f.mode==='nation' && f.team==='WAL')){
  assert.deepEqual([...api.hardNationDomesticSlots(f)],[],'Welsh clubs in the English league system are not Welsh-league clues');
}
const bands=source.split('const EASY_NATION_LEVELS=[',2)[1].split('].map(keys=>keys.split',1)[0].match(/'[^']*'/g).map(s=>s.slice(1,-1).split(' '));
assert.deepEqual([...api.mediumNations].sort(),[...new Set([...bands[1],...bands[2]])].sort(),'recognition groups stay aligned');
for(const f of data.fixtures.filter(f=>f.mode==='club'))assert.equal(api.usesNationHardMask(f),false);
for(const key of ['FRA','ARG','KSA','CRC','ISL','GEO'])assert.equal(api.usesNationHardMask({mode:'nation',team:key}),false,key+': unchanged recognition group');

// If no masked overseas clue remains, national-team hints restore domestic
// clues. They never fall back to answer choices, even with an empty mask.
fixture={...japan,id:'future-domestic-xi',players:japan.players.map((p,i)=>({...p,value:i<2?p.value:'fctokyo'}))};
const domesticMask=[...api.buildHardMask(fixture)];
assert.equal(domesticMask.length,9);
reset(domesticMask);
api.getHint();api.getHint();
assert.deepEqual(context.state.masked,domesticMask.slice(2));
assert.equal(context.state.choicesShown,false);
fixture=japan;
reset([6,1,9,2]);
api.getHint();
assert.deepEqual(context.state.masked,[6,9,2],'first overseas clue before earlier domestic slots');
api.getHint();
assert.deepEqual(context.state.masked,[6,9],'second overseas clue also precedes domestic slots');
assert.equal(context.state.choicesShown,false);
reset([]);
api.getHint();
assert.equal(context.state.choicesShown,false,'no answer-choice fallback');
assert.equal(context.state.hints,0);

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

// All finals enter Hard; Easy follows the approved recognition boundary.
for (const mode of ['club', 'nation']) {
  for (const difficulty of ['easy', 'moderate', 'hard']) {
    context.state = {mode, difficulty};
    const key=f=>JSON.stringify([f.mode,f.team,f.date,f.formation,f.players.map(p=>[p.name,p.role,p.value])]);
    const union=new Map();
    for(const tier of ['easy','moderate'])for(const f of data.fixtures){
      if(f.mode===mode&&f.tier===tier&&!union.has(key(f)))union.set(key(f),f);
    }
    const finals=[...(data.uclFinals||[]),...(data.nationalFinals||[])].map(entry=>typeof entry==='string'?data.fixtures.find(f=>f.id===entry):entry).filter(f=>f.mode===mode);
    for(const f of finals)if(!union.has(key(f)))union.set(key(f),f);
    const moderate=new Map();
    for(const f of [...data.fixtures.filter(f=>f.mode===mode&&f.tier==='moderate'),...finals])if(!moderate.has(key(f)))moderate.set(key(f),f);
    const keep=f=>(mode==='club'?new Set('realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund spurs napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic villa brugge athletic'.split(' ')):new Set('ENG FRA GER ESP POR BRA ARG ITA NED BEL CRO URU NOR POL SWE GRE TUR CHE'.split(' '))).has(f.team);
    const restored=f=>(mode==='club'?['villa','brugge','athletic']:['NOR','POL','SWE','GRE','TUR','CHE']).includes(f.team);
    const moved=[...union.values()].filter(f=>!keep(f)||restored(f));
    const mls=[...(data.mlsStars||[]),...(data.africanClassics||[]).map(f=>typeof f==='string'?data.fixtures.find(x=>x.id===f):f)].filter(f=>f.mode===mode);
    for(const f of [...moved,...mls])if(!moderate.has(key(f)))moderate.set(key(f),f);
    const hardPool=new Map();
    for(const f of [...data.fixtures.filter(f=>f.mode===mode&&(f.tier==='hard'||api.isImportedHardFixture(f))),...finals,...moved,...mls,...(data.hardMlsStars||[]).filter(f=>f.mode===mode)])if(!hardPool.has(key(f)))hardPool.set(key(f),f);
    const expected = difficulty==='easy'?[...union.values()].filter(keep):difficulty==='moderate'?[...moderate.values()]:[...hardPool.values()];
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
  `${league.length} league-nationality masks, ${nations.length} national-team masks, ${underdogs.length} unchanged two-clue fixtures; overseas-first player hints, exact legacy fallbacks and updater checks passed.`);
