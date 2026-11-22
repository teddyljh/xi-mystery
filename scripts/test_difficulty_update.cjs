#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'data/difficulty_baseline_2026_11_22.json'),'utf8'));
const {data,pool,registry,review,key}=loadHardReview(source);
const easy=[...pool('club','easy'),...pool('nation','easy')];
const moderate=[...pool('club','moderate'),...pool('nation','moderate')];
const hard=[...pool('club','hard'),...pool('nation','hard')];
const allowed={club:new Set([...baseline.easyClubs,'villa','brugge','athletic']),nation:new Set([...baseline.easyNations,'NOR','POL','SWE','GRE','TUR','CHE'])};
for(const [mode,difficulty,count] of [['club','easy',98],['nation','easy',69],['club','moderate',92],['nation','moderate',79],['club','hard',130],['nation','hard',114]]){
  const fixtures=pool(mode,difficulty);
  assert.equal(fixtures.length,count,mode+'/'+difficulty);
  assert.equal(new Set(fixtures.map(key)).size,count,'no duplicate XI in '+difficulty);
  assert.equal(new Set(fixtures.map(f=>f.team+'|'+f.date)).size,count,'one XI per team/date in '+difficulty);
}
for(const f of easy)assert.ok(allowed[f.mode].has(f.team),f.id+': approved Easy team in every era');
const easyKeys=new Set(easy.map(key));
const previousEasy=baseline.easyIds.map(id=>registry.get(id));
assert.ok(previousEasy.every(Boolean));
for(const f of previousEasy)assert.equal(easyKeys.has(key(f)),allowed[f.mode].has(f.team),f.id+': exact Easy boundary');
const removed=previousEasy.filter(f=>!easyKeys.has(key(f)));
assert.equal(removed.length,31);
assert.equal(new Set(removed.filter(f=>f.mode==='club').map(f=>f.team)).size,7);
assert.equal(new Set(removed.filter(f=>f.mode==='nation').map(f=>f.team)).size,11);
const finals=[...data.uclFinals,...data.nationalFinals].map(f=>typeof f==='string'?registry.get(f):f);
assert.equal(finals.length,76);
for(const f of [...removed,...finals]){
  for(const [name,fixtures] of [['Medium',moderate],['Hard',hard]]){
    assert.equal(fixtures.filter(x=>key(x)===key(f)).length,1,f.id+': retained exactly once in '+name);
  }
}
// Compare all random branches, including hints, with the published version.
// The snapshot predates this change and covers all 152 distinct original XIs.
const variants=v=>v.map(x=>JSON.stringify(x)).sort();
assert.equal(Object.keys(baseline.hardMasks).length,152);
const hardKeys=new Set(hard.map(key));
for(const [id,old] of Object.entries(baseline.hardMasks)){
  const f=registry.get(id);assert.ok(f,id);
  assert.ok(hardKeys.has(key(f)),id+': original Hard XI retained');
  assert.deepEqual(variants(review(f).variants),variants(old.variants),id+': every original mask and both hints unchanged');
}
const previousHard=new Set(baseline.hardIds.map(id=>key(registry.get(id))));
const added=hard.filter(f=>!previousHard.has(key(f)));
assert.equal(added.length,92);
for(const f of added)review(f); // Every new random branch restores one clue per hint, never choices.
const spain=hard.find(f=>f.id==='classic-world-cup-final-2026-ESP');
for(const variant of review(spain).variants){
  assert.deepEqual(variant.hidden.map(i=>spain.players[i].name),['Dani Olmo','Pau Cubarsí','Lamine Yamal']);
  assert.deepEqual(variant.hints.map(i=>spain.players[i].name),['Dani Olmo','Pau Cubarsí']);
}
const leverkusen=hard.find(f=>f.team==='leverkusen'&&f.date==='2002-05-15');
assert.deepEqual(review(leverkusen).variants,[{hidden:[4,7],hints:[4,7]}],'new underdog final keeps the former algorithm');
const generated=execFileSync(process.execPath,[path.join(root,'scripts/report_difficulty_update.cjs')],{encoding:'utf8'});
assert.equal(fs.readFileSync(path.join(root,'docs/difficulty-update-2026-11-22.md'),'utf8'),generated,'review is generated from shipped masks and both actual hints');
console.log('PASS: approved Easy boundary, all 76 finals, 31 currently excluded Easy XIs, 92 Hard additions, every original mask/hint branch, and generated review.');
