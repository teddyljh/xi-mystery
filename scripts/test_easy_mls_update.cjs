#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {data,pool,registry,review,key}=loadHardReview(source);
const old=JSON.parse(fs.readFileSync(path.join(root,'data/easy_mls_baseline_2026_11_22.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/mls_stars.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(hash(data.fixtures),old.baseFixturesHash,'all existing source XIs remain unchanged');
const combined=d=>['club','nation'].flatMap(m=>pool(m,d));
const easy=combined('easy'),medium=combined('moderate'),hard=combined('hard');
const restored={club:new Set(['villa','brugge','athletic']),nation:new Set(['NOR','POL','SWE','GRE','TUR','CHE'])};
const previousEasy=new Set(old.pools.easy.map(id=>key(registry.get(id))));
for(const id of old.pools.easy)assert.ok(easy.some(f=>key(f)===key(registry.get(id))),id+': existing Easy question retained');
const added=easy.filter(f=>!previousEasy.has(key(f)));
assert.equal(added.length,20);
for(const f of added)assert.ok(restored[f.mode].has(f.team),f.id+': only requested teams restored');
for(const [mode,keys] of Object.entries(restored))for(const team of keys)assert.ok(added.some(f=>f.mode===mode&&f.team===team),team);
for(const f of data.fixtures.filter(f=>['shakhtar','dinamo','crvenazvezda','slavia','sparta','slovan','qarabag','kairat'].includes(f.team)))assert.ok(!easy.some(x=>key(x)===key(f)),f.id+': obscure eastern-league clubs excluded from Easy');
for(const [difficulty,current] of [['moderate',medium],['hard',hard]]){
  const currentKeys=new Set(current.map(key));
  for(const id of old.pools[difficulty])assert.ok(currentKeys.has(key(registry.get(id))),id+': restoring Easy never drops higher difficulty membership');
  const previousKeys=new Set(old.pools[difficulty].map(id=>key(registry.get(id))));
  const africanAdded=(data.africanClassics||[]).map(f=>typeof f==='string'?registry.get(f):f).filter(f=>!previousKeys.has(key(f)));
  assert.equal(current.length,old.pools[difficulty].length+3+africanAdded.length+(difficulty==='hard'?data.hardMlsStars.length:0),'three MLS XIs plus the later African catalog in '+difficulty);
}
assert.equal(Object.keys(old.hardMasks).length,231);
for(const [id,expected] of Object.entries(old.hardMasks)){
  const actual=hash(review(registry.get(id)).variants.map(v=>JSON.stringify(v)).sort());
  assert.equal(actual,expected,id+': all previous hidden/hint variants preserved');
}
assert.equal(catalog.fixtures.length,3);
assert.equal(data.mlsStars.length,3);
const protectedNames={'inter-miami':'Lionel Messi',lac:'Son Heung-Min',lagalaxy:'Landon Donovan'};
for(const record of catalog.fixtures){
  const f=registry.get(record.id);assert.ok(f);
  assert.deepEqual(f.players,record.players.map(({role,name,value})=>({role,name,value})));
  assert.ok(record.stars.every(name=>f.players.some(p=>p.name===name)),record.id+': famous players actually start');
  assert.equal(f.players.length,new Set(f.players.map(p=>p.name)).size);
  for(const current of [medium,hard])assert.equal(current.filter(x=>key(x)===key(f)).length,1);
  assert.ok(!easy.some(x=>key(x)===key(f)));
  for(const variant of review(f).variants){
    assert.equal(variant.hidden.length,3);
    assert.equal(f.players[variant.hidden[2]].name,protectedNames[f.team]);
    assert.ok(variant.hidden.slice(0,2).every(i=>f.players[i].value==='USA'),record.id+': two additional domestic clues');
    assert.deepEqual(variant.hints,variant.hidden.slice(0,2));
  }
}
const lafc=catalog.fixtures.find(f=>f.team==='lac');
assert.equal(lafc.matchSportecId,'MLS-MAT-000992');
assert.equal(new Set(lafc.players.map(p=>p.mlsPlayerId)).size,11);
assert.equal(lafc.players.find(p=>p.name==='Nathan Ordaz').value,'SLV');
assert.equal(catalog.fixtures.find(f=>f.team==='lagalaxy').players[10].value,'PUR');
const assets=JSON.parse(source.split('window.XI_UI_ASSETS = ')[1].split(';\n')[0]);
for(const [code,asset] of Object.entries(catalog.flags))assert.equal(assets.flags[code],'data:image/png;base64,'+fs.readFileSync(path.join(root,asset.path)).toString('base64'),code+': correct bundled flag, no fallback');
const africa=new Set('ALG DZA ANG BEN BOT BFA BUR BDI CMR CPV CTA CAF CHA TCD COM COG COD CIV DJI EGY EQG ERI ETH GAB GAM GMB GHA GUI GIN GNB KEN LES LBR LBY MAD MDG MWI MLI MTN MRT MRI MUS MAR MOZ NAM NIG NER NGA RWA STP SEN SEY SLE SOM RSA ZAF SSD SDN SUD SWZ TAN TZA TOG TGO TUN UGA ZAM ZMB ZIM ZWE'.split(' '));
const africanExpected=['CIV|2024-02-11','CMR|2002-06-06','EGY|2022-02-06','MAR|2022-12-10','NGA|2024-02-11','SEN|2022-02-06'];
for(const difficulty of ['easy','moderate','hard'])assert.deepEqual(pool('nation',difficulty).filter(f=>africa.has(f.team)).map(f=>f.team+'|'+f.date).sort(),difficulty==='easy'?[]:africanExpected,'exact African national-team questions in '+difficulty);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-mls-test-'));
try{
  for(const folder of ['scripts','data/flags'])fs.mkdirSync(path.join(temp,folder),{recursive:true});
  fs.copyFileSync(path.join(root,'scripts/sync_mls_stars.py'),path.join(temp,'scripts/sync_mls_stars.py'));
  fs.copyFileSync(path.join(root,'data/mls_stars.json'),path.join(temp,'data/mls_stars.json'));
  for(const asset of Object.values(catalog.flags))fs.copyFileSync(path.join(root,asset.path),path.join(temp,asset.path));
  const index=path.join(temp,'index.html');fs.writeFileSync(index,source);
  const update=()=>execFileSync('python3',[path.join(temp,'scripts/sync_mls_stars.py')]);
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'MLS updater is idempotent');
  const stale=structuredClone(data);stale.mlsStars=[];
  fs.writeFileSync(index,source.replace('window.LINEUP_DATA = '+JSON.stringify(data)+';\n','window.LINEUP_DATA = '+JSON.stringify(stale)+';\n'));
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'MLS updater restores the complete catalog without duplicates');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.equal(fs.readFileSync(path.join(root,'docs/easy-mls-update-2026-11-22.md'),'utf8'),execFileSync(process.execPath,[path.join(root,'scripts/report_easy_mls_update.cjs')],{encoding:'utf8'}),'review matches the shipped pools and masks');
console.log('PASS: 20 requested Easy restorations; all previous higher-difficulty XIs and 231 mask/hint variants retained; 3 verified MLS XIs, bundled flags, and exact African pools.');
