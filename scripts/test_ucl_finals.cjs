#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(source.split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/ucl_finals.json'),'utf8'));
const rules=source.slice(source.indexOf('  // Hard includes every historical XI'),source.indexOf('  // Shuffle-bag rotation'));
const context=vm.createContext({DATA:data,Math,state:{}});
vm.runInContext(rules+'\nglobalThis.api={available,quizFixtureCount};',context);
assert.equal(catalog.length,50);
assert.equal(new Set(catalog.map(f=>f.team+'|'+f.date)).size,50);
assert.equal(data.fixtures.length,274,'no duplicated base records');
assert.equal(data.uclFinals.filter(f=>typeof f==='string').length,28,'reuse all existing finals');
assert.equal(data.uclFinals.filter(f=>typeof f!=='string').length,22,'only missing final XIs are new');
assert.equal(context.api.quizFixtureCount(),318);
for(let year=2002;year<=2026;year++){
  const pair=catalog.filter(f=>f.date.startsWith(String(year)));
  assert.equal(pair.length,2);assert.equal(pair[0].date,pair[1].date);
  assert.equal(pair[0].uefaMatchId,pair[1].uefaMatchId);
  assert.notEqual(pair[0].team,pair[1].team);
}
for(const difficulty of ['easy','moderate','hard']){
  context.state={mode:'club',difficulty};const pool=[...context.api.available()];
  assert.equal(pool.length,{easy:98,moderate:92,hard:130}[difficulty]);
  assert.equal(new Set(pool.map(f=>f.team+'|'+f.date)).size,pool.length,'no duplicate match/team questions');
  for(const f of catalog){
    const matches=pool.filter(x=>x.team===f.team&&x.date===f.date);
    if(difficulty==='easy'&&['leverkusen','monaco'].includes(f.team)){assert.equal(matches.length,0,f.id+': underdog excluded from Easy');continue;}
    assert.equal(matches.length,1,f.id+': included exactly once');
    const actual=JSON.parse(JSON.stringify(matches[0]));
    assert.equal(actual.formation,f.formation);
    assert.deepEqual(actual.players,f.players.map(({role,name,value})=>({role,name,value})));
    assert.equal(f.players.length,11);assert.equal(new Set(f.players.map(p=>p.uefaPlayerId)).size,11);
    assert.equal(f.players.filter(p=>p.role==='GK').length,1);assert.equal(f.players[10].role,'GK');
    assert.ok(f.players.every(p=>data.nations[p.value]));
    assert.equal(f.formation.split('-').map(Number).reduce((a,b)=>a+b,0),10);
  }
}
context.state={mode:'club',difficulty:'hard'};
const hard=[...context.api.available()];
assert.equal(hard.length,130,'Hard includes new finals and moved clubs');
for(const [team,date,expected,absent] of [
  ['porto','2004-05-26',['Deco'],['Benni McCarthy']],
  ['monaco','2004-05-26',['Édouard Cissé','Julien Rodriguez'],['Dado Prso','Sebastien Squillaci']],
  ['atletico','2016-05-28',['Saúl Ñíguez'],['Yannick Carrasco']]
]){
  const f=hard.find(f=>f.team===team&&f.date===date);assert.ok(f);
  for(const name of expected)assert.ok(f.players.some(p=>p.name===name));
  for(const name of absent)assert.ok(!f.players.some(p=>p.name===name));
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-ucl-test-'));
try{
  for(const folder of ['scripts','data'])fs.mkdirSync(path.join(temp,folder));
  for(const script of ['sync_ucl_finals.py','upgrade_hard.py','upgrade_easy.py','easy_choices.js'])fs.copyFileSync(path.join(root,'scripts',script),path.join(temp,'scripts',script));
  fs.copyFileSync(path.join(root,'data/ucl_finals.json'),path.join(temp,'data/ucl_finals.json'));
  const index=path.join(temp,'index.html');fs.writeFileSync(index,source);
  const update=()=>{for(const script of ['sync_ucl_finals.py','upgrade_hard.py','upgrade_easy.py'])execFileSync('python3',[path.join(temp,'scripts',script)]);};
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'all updaters are idempotent together');
  assert.equal(fs.readFileSync(path.join(temp,'docs/ucl-finals-2002-2026.md'),'utf8'),fs.readFileSync(path.join(root,'docs/ucl-finals-2002-2026.md'),'utf8'));
  const stale=source.replace("subtitle.replaceChildren(document.createTextNode(prefix),dateEl,document.createTextNode(suffix));","subtitle.replaceChildren(dateEl);");
  assert.notEqual(stale,source);fs.writeFileSync(index,stale);update();assert.equal(fs.readFileSync(index,'utf8'),source,'updater restores the full sentence around the highlighted date');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS: all 50 UCL final XIs appear once in Moderate/Hard; 48 famous-club XIs in Easy; catalog reuse, prompt updater and idempotence passed.');
