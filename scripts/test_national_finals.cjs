#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(source.split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/national_finals.json'),'utf8'));
const records=catalog.fixtures;
const rules=source.slice(source.indexOf('  // Hard includes every historical XI'),source.indexOf('  // Shuffle-bag rotation'));
const context=vm.createContext({DATA:data,Math,state:{}});
vm.runInContext(rules+'\nglobalThis.api={available,quizFixtureCount};',context);
assert.equal(records.length,26);
assert.equal(new Set(records.map(f=>f.team+'|'+f.date)).size,26);
assert.equal(data.fixtures.length,274,'base archive receives no clones');
assert.equal(data.nationalFinals.filter(f=>typeof f==='string').length,17);
assert.equal(data.nationalFinals.filter(f=>typeof f!=='string').length,9);
assert.equal(context.api.quizFixtureCount(),351);
for(const [event,years] of [['WORLD_CUP',[2002,2006,2010,2014,2018,2022,2026]],['EURO',[2004,2008,2012,2016,2020,2024]]]){
  for(const year of years){
    const pair=records.filter(f=>f.event===event&&f.eventYear===year);
    assert.equal(pair.length,2,event+' '+year);assert.equal(pair[0].date,pair[1].date);
    assert.notEqual(pair[0].team,pair[1].team);
    if(year===2020)assert.equal(pair[0].date,'2021-07-11','use actual match date');
  }
}
for(const difficulty of ['easy','moderate','hard']){
  context.state={mode:'nation',difficulty};const pool=[...context.api.available()];
  assert.equal(pool.length,{easy:87,moderate:97,hard:132}[difficulty]);
  assert.equal(new Set(pool.map(f=>f.team+'|'+f.date)).size,pool.length,'one question per team/date');
  for(const f of records){
    const matches=pool.filter(x=>x.team===f.team&&x.date===f.date);
    assert.equal(matches.length,1,f.id);
    assert.equal(matches[0].formation,f.formation);
    assert.deepEqual(JSON.parse(JSON.stringify(matches[0].players)),f.players.map(({role,name,value})=>({role,name,value})));
    assert.equal(f.players.length,11);assert.equal(new Set(f.players.map(p=>p.name)).size,11);
    assert.equal(f.players.filter(p=>p.role==='GK').length,1);assert.equal(f.players[10].role,'GK');
    assert.ok(f.players.every(p=>data.teams[p.value]));
    assert.equal(f.formation.split('-').map(Number).reduce((a,b)=>a+b,0),10);
  }
}
context.state={mode:'nation',difficulty:'hard'};
assert.equal(context.api.available().length,132,'Hard covers finals, semifinals, third-place matches and moved nations');
const fixture=(team,date)=>records.find(f=>f.team===team&&f.date===date);
const club=(f,part)=>f.players.find(p=>p.name.includes(part)).value;
assert.equal(club(fixture('GRE','2004-07-04'),'Nikopolidis'),'panathinaikos');
assert.equal(club(fixture('GRE','2004-07-04'),'Kapsis'),'aek');
assert.equal(club(fixture('ITA','2012-07-01'),'Montolivo'),'fiorentina');
assert.equal(club(fixture('ITA','2021-07-11'),'Donnarumma'),'milan');
assert.equal(club(fixture('ARG','2026-07-19'),'Montiel'),'riverplate');
assert.equal(club(fixture('ARG','2026-07-19'),'De Paul'),'inter-miami');
assert.equal(club(fixture('ESP','2026-07-19'),'Cucurella'),'chelsea');
const crests=JSON.parse(source.split('  const CREST_PATH_OVERRIDES=')[1].split(';\n')[0]);
for(const [key,club] of Object.entries(catalog.clubs))assert.equal(crests[key],club.crestPath);
for(const [key,value] of Object.entries(catalog.crestPaths))assert.equal(crests[key],value);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-national-finals-test-'));
try{
  for(const folder of ['scripts','data'])fs.mkdirSync(path.join(temp,folder));
  for(const file of ['sync_ucl_finals.py','sync_national_finals.py','upgrade_hard.py','upgrade_easy.py','easy_choices.js'])fs.copyFileSync(path.join(root,'scripts',file),path.join(temp,'scripts',file));
  for(const file of ['ucl_finals.json','national_finals.json'])fs.copyFileSync(path.join(root,'data',file),path.join(temp,'data',file));
  const index=path.join(temp,'index.html');fs.writeFileSync(index,source);
  const update=()=>{for(const file of ['sync_ucl_finals.py','sync_national_finals.py','upgrade_hard.py','upgrade_easy.py'])execFileSync('python3',[path.join(temp,'scripts',file)]);};
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'all generators remain idempotent together');
  assert.equal(fs.readFileSync(path.join(temp,'docs/national-finals-2002-2026.md'),'utf8'),fs.readFileSync(path.join(root,'docs/national-finals-2002-2026.md'),'utf8'));
  const stale=source.replace("const competition=state.difficulty==='easy'?competitionName(f.competition):'';","const competition=competitionName(f.competition);");
  assert.notEqual(stale,source);fs.writeFileSync(index,stale);
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'updater removes competition clues while preserving full sentences');
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'repeated updates do not duplicate XIs');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS: all 26 national finals in Moderate/Hard once; all 26 national finals in Easy; historical club clues, crests and all updater checks passed.');
