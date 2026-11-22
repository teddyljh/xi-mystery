#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {data,pool,registry,review,key}=loadHardReview(source);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'data/african_classics_baseline_2026_11_22.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/african_classics.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(hash(data.fixtures),baseline.baseFixturesHash,'no existing player/club data changed');
assert.equal(data.fixtures.length,274);
assert.equal(data.africanClassics.length,6);
assert.equal(data.africanClassics.filter(f=>typeof f==='string').length,1,'reuse the existing Morocco XI');
assert.deepEqual([...new Set(catalog.fixtures.map(f=>f.team))].sort(),['CIV','CMR','EGY','MAR','NGA','SEN']);
const combined=d=>['club','nation'].flatMap(m=>pool(m,d));
const easy=combined('easy'),medium=combined('moderate'),hard=combined('hard');
assert.deepEqual(easy.map(f=>f.id),baseline.pools.easy,'Easy pool unchanged');
assert.equal(medium.length,baseline.pools.moderate.length+6);
assert.equal(hard.length,baseline.pools.hard.length+5);
for(const difficulty of ['moderate','hard']){
  const current=combined(difficulty),keys=new Set(current.map(key));
  assert.equal(keys.size,current.length,'deduplicate every XI in '+difficulty);
  assert.equal(new Set(current.map(f=>f.mode+'|'+f.team+'|'+f.date)).size,current.length,'one question per team/date');
  for(const id of baseline.pools[difficulty])assert.ok(keys.has(key(registry.get(id))),id+': previous membership retained');
}
assert.equal(Object.keys(baseline.hardMasks).length,234);
for(const [id,expected] of Object.entries(baseline.hardMasks))assert.equal(hash(review(registry.get(id)).variants.map(v=>JSON.stringify(v)).sort()),expected,id+': every prior mask/hint branch unchanged');
const names={
  MAR:[['Yahia Attiyat Allah','Achraf Hakimi'],['Achraf Hakimi','Yahia Attiyat Allah']],
  SEN:[['Sadio Mané','Kalidou Koulibaly'],['Sadio Mané','Kalidou Koulibaly']],
  NGA:[['Victor Osimhen','Ademola Lookman'],['Victor Osimhen','Ademola Lookman']],
  CIV:[['Sébastien Haller','Franck Kessié'],['Sébastien Haller','Franck Kessié']],
  EGY:[['Mohamed Elneny','Mohamed Abdelmonem','Mohamed Salah'],['Mohamed Elneny','Mohamed Abdelmonem']],
  CMR:[['Geremi','Rigobert Song',"Samuel Eto'o"],['Geremi','Rigobert Song']]
};
for(const record of catalog.fixtures){
  const f=registry.get(record.reuseId||record.id);assert.ok(f);
  assert.equal(f.formation,record.formation);
  assert.deepEqual(f.players,record.players.map(({role,name,value})=>({role,name,value})));
  assert.equal(f.players.length,11);assert.equal(new Set(f.players.map(p=>p.name)).size,11);
  assert.equal(f.players.filter(p=>p.role==='GK').length,1);assert.equal(f.players[10].role,'GK');
  assert.equal(f.formation.split('-').reduce((n,x)=>n+Number(x),0),10);
  assert.ok(f.players.every(p=>data.teams[p.value]));
  for(const fixtures of [medium,hard])assert.equal(fixtures.filter(x=>key(x)===key(f)).length,1,f.id+': included exactly once');
  assert.ok(!easy.some(x=>key(x)===key(f)));
  for(const v of review(f).variants){
    assert.deepEqual(v.hidden.map(i=>f.players[i].name),names[f.team][0]);
    assert.deepEqual(v.hints.map(i=>f.players[i].name),names[f.team][1]);
  }
}
const fixture=t=>catalog.fixtures.find(f=>f.team===t),club=(t,name)=>fixture(t).players.find(p=>p.name===name).value;
assert.equal(club('CIV','Serge Aurier'),'galatasaray','2 February transfer precedes the final');
assert.equal(club('CIV','Seko Fofana'),'al-ettifaq','30 January loan precedes the final');
assert.equal(club('EGY','Mohamed Abdelmonem'),'al-ahly-cairo','31 January recall precedes the final');
assert.equal(club('NGA','Stanley Nwabali'),'chippa-united','South African club is not a Nigerian domestic clue');
assert.equal(club('CMR','Geremi'),'realmadrid');
assert.equal(club('CMR',"Samuel Eto'o"),'mallorca');
assert.equal(club('CMR','Rigobert Song'),'koln');
const crests=JSON.parse(source.split('  const CREST_PATH_OVERRIDES=')[1].split(';\n')[0]);
for(const [key,club] of Object.entries(catalog.clubs))assert.equal(crests[key],club.crestPath);
assert.equal(crests.extremadura,'https://upload.wikimedia.org/wikipedia/de/3/30/CF_Extremadura.svg','use the historic CF, not either later club');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-africa-test-'));
try{
  fs.mkdirSync(path.join(temp,'scripts'));
  fs.cpSync(path.join(root,'data'),path.join(temp,'data'),{recursive:true});
  const generators=['sync_ucl_finals.py','sync_national_finals.py','sync_mls_stars.py','sync_african_classics.py','upgrade_hard.py','upgrade_easy.py'];
  for(const file of [...generators,'easy_choices.js'])fs.copyFileSync(path.join(root,'scripts',file),path.join(temp,'scripts',file));
  const index=path.join(temp,'index.html');fs.writeFileSync(index,source);
  const update=()=>{for(const file of generators)execFileSync('python3',[path.join(temp,'scripts',file)]);};
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'complete CI sequence is idempotent');
  const stale=structuredClone(data);stale.africanClassics=[];
  fs.writeFileSync(index,source.replace('window.LINEUP_DATA = '+JSON.stringify(data)+';\n','window.LINEUP_DATA = '+JSON.stringify(stale)+';\n'));
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'restore the catalog without cloning archived XIs');
  const archived=structuredClone(data);const nigeria=data.africanClassics.find(f=>f.team==='NGA');archived.fixtures.push(nigeria);
  fs.writeFileSync(index,source.replace('window.LINEUP_DATA = '+JSON.stringify(data)+';\n','window.LINEUP_DATA = '+JSON.stringify(archived)+';\n'));
  execFileSync('python3',[path.join(temp,'scripts/sync_african_classics.py')]);
  const migrated=JSON.parse(fs.readFileSync(index,'utf8').split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
  assert.ok(migrated.africanClassics.includes(nigeria.id),'reuse a subsequently archived XI by reference');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.equal(fs.readFileSync(path.join(root,'docs/african-classics.md'),'utf8'),execFileSync(process.execPath,[path.join(root,'scripts/report_african_classics.cjs')],{encoding:'utf8'}));
console.log('PASS: 6 African classics in Medium/Hard once; Morocco reused; 234 prior mask/hint branches retained; contemporary club clues, both actual hints, crests and full generator checks.');
