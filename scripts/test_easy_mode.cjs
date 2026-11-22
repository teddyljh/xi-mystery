#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(source.split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
const finals=[...(data.uclFinals||[]),...(data.nationalFinals||[])].map(entry=>typeof entry==='string'?data.fixtures.find(f=>f.id===entry):entry);
const rules=source.slice(source.indexOf('  // Hard includes every historical XI'),source.indexOf('  // Shuffle-bag rotation'));
const choices=source.slice(source.indexOf('  // Easy multiple choice'),source.indexOf('  function renderGame(){'));
const math=Object.create(Math);
let seed=1,edge=null;
math.random=()=>edge??((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const context=vm.createContext({DATA:data,Math:math,state:{}});
vm.runInContext(`function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}\n`+
  rules+'\n'+choices+`\nglobalThis.api={available,buildChoices,easyNationLevel,
    leagues:EASY_CLUB_LEAGUE_BY_KEY,levels:EASY_CLUB_LEVEL_BY_KEY,
    originalHardChoices:f=>shuffle([f.team,...shuffle(Object.keys(f.mode==='club'?DATA.teams:DATA.nations).filter(key=>key!==f.team)).slice(0,3)])};`,context);
const api=context.api;
const identity=f=>JSON.stringify([f.mode,f.team,f.date,f.formation,f.players.map(p=>[p.name,p.role,p.value])]);
const unique=fixtures=>fixtures.filter((f,i)=>fixtures.findIndex(other=>identity(other)===identity(f))===i);
let added=0,checked=0;
const allowed=f=>(f.mode==='club'?new Set('realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund spurs napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic'.split(' ')):new Set('ENG FRA GER ESP POR BRA ARG ITA NED BEL CRO URU'.split(' '))).has(f.team);
for(const mode of ['club','nation']){
  context.state={mode,difficulty:'easy'};
  const easy=[...api.available()];
  const original=data.fixtures.filter(f=>f.mode===mode&&f.tier==='easy'&&allowed(f));
  const former=unique([...data.fixtures.filter(f=>f.mode===mode&&f.tier==='easy'),...data.fixtures.filter(f=>f.mode===mode&&f.tier==='moderate'),...finals.filter(f=>f.mode===mode)]);
  const moved=former.filter(f=>!allowed(f));
  const moderate=unique([...data.fixtures.filter(f=>f.mode===mode&&f.tier==='moderate'),...finals.filter(f=>f.mode===mode),...moved]);
  const keys=new Set(easy.map(identity));
  assert.equal(easy.length,mode==='club'?93:54,mode+': expected curated pool');
  assert.equal(keys.size,easy.length,mode+': no duplicate XIs');
  for(const f of former.filter(allowed))assert.ok(keys.has(identity(f)),f.id+': included in Easy');
  assert.ok(easy.every(allowed));
  for(const f of original)assert.ok(easy.includes(f),f.id+': prefer original Easy copy');
  assert.ok(easy.every(f=>f.tier==='easy'||f.tier==='moderate'||finals.some(x=>identity(x)===identity(f))));
  added+=easy.length-original.length;
  // Check both modes against their actual pools. All extreme values and a
  // seeded stream exercise each pick, including the last selectable club.
  for(const difficulty of ['easy','moderate']){
    context.state={mode,difficulty};
    const pool=[...api.available()];
    if(difficulty==='moderate')assert.deepEqual(pool.map(f=>f.id),moderate.map(f=>f.id));
    for(const f of pool){
      for(let sample=0;sample<302;sample++){
        edge=sample===0?0:sample===1?0.999999999:null;
        const result=[...api.buildChoices(f)];
        assert.equal(result.length,4,f.id);assert.equal(new Set(result).size,4,f.id+': unique options');
        assert.ok(result.includes(f.team));
        const wrong=result.filter(key=>key!==f.team);
        if(mode==='club'){
          const league=api.leagues[f.team],level=api.levels[f.team];
          assert.ok(league,f.id+': mapped country league');assert.notEqual(level,undefined);
          const same=wrong.filter(key=>api.leagues[key]===league);
          const foreign=wrong.filter(key=>api.leagues[key]!==league);
          assert.equal(same.length,1,f.id+': one same-league opponent');
          assert.equal(foreign.length,2);assert.equal(new Set(foreign.map(key=>api.leagues[key])).size,2,f.id+': two different foreign countries');
          assert.ok(foreign.every(key=>api.levels[key]===level),f.id+': both foreign opponents have comparable strength');
        }else{
          const level=api.easyNationLevel(f,f.team);
          assert.equal(wrong.filter(key=>api.easyNationLevel(f,key)===level).length,2,f.id+': two contemporary peers');
          assert.equal(wrong.filter(key=>api.easyNationLevel(f,key)!==level).length,1,f.id+': one different-level opponent');
        }
        checked++;
      }
    }
  }
}
edge=null;
// Era-specific results, not current fame, determine national-team peers.
const at=year=>({date:year+'-07-01'});
assert.ok(api.easyNationLevel(at(2002),'BEL')>api.easyNationLevel(at(2018),'BEL'));
assert.ok(api.easyNationLevel(at(2002),'KOR')<api.easyNationLevel(at(2014),'KOR'));
assert.ok(api.easyNationLevel(at(2014),'MAR')>api.easyNationLevel(at(2022),'MAR'));
assert.ok(api.easyNationLevel(at(2006),'CRO')>api.easyNationLevel(at(2018),'CRO'));
for(const f of data.fixtures){
  context.state={difficulty:'hard'};
  seed=12345;
  const result=[...api.buildChoices(f)];
  seed=12345;
  assert.deepEqual(result,[...api.originalHardChoices(f)],f.id+': Hard option generation unchanged');
}

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-easy-test-'));
try{
  fs.mkdirSync(path.join(temp,'scripts'));
  for(const name of ['upgrade_easy.py','easy_choices.js'])fs.copyFileSync(path.join(root,'scripts',name),path.join(temp,'scripts',name));
  const index=path.join(temp,'index.html');
  fs.writeFileSync(index,source);
  const update=()=>execFileSync('python3',[path.join(temp,'scripts/upgrade_easy.py')]);
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'Easy updater is idempotent');
  fs.writeFileSync(index,source.replace("const first=randomPick(foreign);","const first=randomPick(options);"));
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'Easy updater repairs stale rules');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log(`PASS: 147 curated Easy fixtures; ${checked} four-option sets satisfy league/era rules; all removed XIs remain in Moderate; unchanged Hard choice algorithm; updater checks passed.`);
