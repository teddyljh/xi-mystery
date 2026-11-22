#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {data,pool,registry,review,key}=loadHardReview(source);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'data/reveal_mls_baseline_2026_11_22.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/hard_mls_stars.json'),'utf8'));
const contextCatalog=JSON.parse(fs.readFileSync(path.join(root,'data/match_context.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(hash(data.fixtures),baseline.baseFixturesHash);
const combined=d=>['club','nation'].flatMap(m=>pool(m,d));
for(const d of ['easy','moderate']){const oldIds=new Set(baseline.pools[d]);assert.deepEqual(combined(d).filter(f=>oldIds.has(f.id)).map(f=>f.id),baseline.pools[d].filter(id=>d!=='moderate'||registry.get(id).team!=='frankfurt'),d+': previous membership retained except requested Frankfurt exclusion');}
const hard=combined('hard');
assert.equal(hard.length,baseline.pools.hard.length+5+33);
assert.deepEqual(hard.filter(f=>!data.hardMlsStars.some(x=>x.id===f.id)&&!f.id.startsWith('expansion-')).map(f=>f.id),baseline.pools.hard);
assert.equal(new Set(hard.map(key)).size,hard.length);
assert.equal(Object.keys(baseline.hardMasks).length,239);
for(const [id,expected] of Object.entries(baseline.hardMasks))assert.equal(hash(review(registry.get(id)).variants.map(v=>JSON.stringify(v)).sort()),expected,id+': every prior hidden/hint branch preserved');
assert.equal(catalog.fixtures.length,5);
assert.equal(data.hardMlsStars.length,5);
const previousMls={
  'hard-mls-stars-2025-09-13-vancouver':'9a0854e1f6d3c32d00ba256772de061f96dde21999944cc6855ad1adeccc2b02',
  'hard-mls-stars-2015-03-08-orlando':'0939692091f7ba8115d80cbc9d3579d556d57bda92cb9378dde88a5006c29e62',
  'hard-mls-stars-2017-04-01-chicago':'35500b1beda39fe58a2da1466e055594315192eaff4a9923e964a42199dc3f33'
};
for(const [id,expected] of Object.entries(previousMls))assert.equal(hash(registry.get(id)),expected,id+': previously published XI and hint order retained');
for(const record of catalog.fixtures){
  const f=registry.get(record.id);assert.ok(f);
  assert.equal(hard.filter(x=>key(x)===key(f)).length,1);
  for(const d of ['easy','moderate'])assert.ok(!combined(d).some(x=>key(x)===key(f)));
  assert.deepEqual(f.players,record.players.map(({role,name,value})=>({role,name,value})));
  assert.equal(f.players.length,11);assert.equal(new Set(f.players.map(p=>p.name)).size,11);
  assert.ok(f.players.every(p=>data.nations[p.value]));
  const {variants}=review(f);assert.equal(variants.length,1);
  assert.equal(variants[0].hidden.length,2);
  assert.deepEqual(variants[0].hidden.map(i=>f.players[i].name),record.hardHintOrder);
  assert.deepEqual(variants[0].hints.map(i=>f.players[i].name),record.hardHintOrder);
  assert.equal(record.hardHintOrder[1],record.star);
}
const currentSeason={
  orlando:{star:'Antoine Griezmann',nation:'FRA',other:'Griffin Dorsey',opponent:'San Jose Earthquakes',matchId:'MLS-MAT-0009HR'},
  chicago:{star:'Robert Lewandowski',nation:'POL',other:'Andrew Gutman',opponent:'Inter Miami CF',matchId:'MLS-MAT-0009HM'}
};
const additions=catalog.fixtures.filter(f=>f.season==='2026');
assert.equal(additions.length,2);
for(const record of additions){
  const expected=currentSeason[record.team];assert.ok(expected);
  assert.equal(record.date,'2026-07-22');assert.equal(record.versus,expected.opponent);
  assert.equal(record.matchSportecId,expected.matchId);
  assert.equal(record.officialLineupSource,'https://stats-api.mlssoccer.com/matches/'+expected.matchId);
  assert.equal(new Set(record.players.map(p=>p.mlsPlayerId)).size,11,'eleven distinct official starters');
  assert.ok(record.players.every(p=>/^MLS-OBJ-/.test(p.mlsPlayerId)));
  assert.equal(record.players.find(p=>p.name===expected.star).value,expected.nation);
  assert.deepEqual(record.hardHintOrder,[expected.other,expected.star]);
}
const assets=JSON.parse(source.split('window.XI_UI_ASSETS = ')[1].split(';\n')[0]);
for(const [code,asset] of Object.entries(catalog.flags))assert.equal(assets.flags[code],'data:image/png;base64,'+fs.readFileSync(path.join(root,asset.path)).toString('base64'));
const crests=JSON.parse(source.split('  const CREST_PATH_OVERRIDES=')[1].split(';\n')[0]);
for(const [team,club] of Object.entries(catalog.clubs))assert.equal(crests[team],club.crestPath);
// Exercise the shipped localized renderer, including safe emphasis and clearing.
const moduleStart=source.indexOf('  // Answer-reveal match context.');
const moduleEnd=source.indexOf('  // End answer-reveal match context.\n',moduleStart)+'  // End answer-reveal match context.\n'.length;
const moduleSource=source.slice(moduleStart,moduleEnd);
assert.equal(moduleSource,fs.readFileSync(path.join(root,'scripts/reveal_context.js'),'utf8'));
const node=(tag,text='')=>({tag,textContent:text,children:[],append(child){this.children.push(child)},replaceChildren(){this.children=[]}});
const context=vm.createContext({DATA:data,state:{},document:{createElement:tag=>node(tag),createTextNode:text=>node('#text',text)}});
vm.runInContext(moduleSource+'\nglobalThis.api={matchExplanation,contextOpponent,renderMatchExplanation};',context);
// Both legacy Chicago keys still label archived clues, but a typed answer and
// autocomplete selection must resolve to one playable club in every language.
let currentFixture;
const searchIndex=JSON.parse(source.split('window.XI_SEARCH_INDEX=')[1].split(';\n')[0]);
const searchContext=vm.createContext({DATA:data,state:{lang:'zh'},window:{XI_SEARCH_INDEX:searchIndex},current:()=>currentFixture,translateKey:(group,key)=>group[key][searchContext.state.lang]});
vm.runInContext(source.slice(source.indexOf('  function answerItem(f){'),source.indexOf('  function showAutocomplete(){'))+'\nglobalThis.api={isCorrect,findExactAnswer,searchSuggestions};',searchContext);
for(const f of data.hardMlsStars)for(const lang of ['zh','en','es']){
  currentFixture=f;searchContext.state.lang=lang;
  const input=data.teams[f.team][lang],answer=searchContext.api.findExactAnswer(input);
  assert.equal(answer,f.team,f.id+': typed '+lang+' answer is unambiguous');
  assert.ok(searchContext.api.isCorrect(answer,f));
  const suggestions=[...searchContext.api.searchSuggestions(input)];
  assert.equal(suggestions.filter(s=>s.key===f.team).length,1);
  assert.ok(!suggestions.some(s=>s.key==='chicagofire'));
}
const all=[...new Map(['easy','moderate','hard'].flatMap(combined).map(f=>[key(f),f])).values()];
const explained=new Set();
for(const lang of ['zh','en','es']){
  context.state={lang};
  for(const f of all){
    assert.ok(data.matchContext.competitions[f.competition]?.[lang],f.id+': localized competition');
    const text=context.api.matchExplanation(f);assert.ok(text.includes(context.api.contextOpponent(f)));
    assert.ok(!/undefined|null|<\w/.test(text));
    if(lang==='zh')assert.ok(/[\u4e00-\u9fff]/.test(context.api.contextOpponent(f)),f.versus+': translated opponent');
    const container=node('p');context.api.renderMatchExplanation(container,f);
    assert.equal(container.children.map(n=>n.textContent).join(''),text.replaceAll('**',''));
    assert.ok(container.children.filter(n=>n.tag==='strong').length>=2);
    context.api.renderMatchExplanation(container,null);assert.deepEqual(container.children,[],'clear between questions');
    explained.add(f.id);
  }
}
assert.equal(contextCatalog.matches.length,76);
const contextKeys=new Set();
for(const m of contextCatalog.matches){
  assert.ok(m.sources.length&&m.sources.every(url=>url.startsWith('https://')));
  for(const lang of ['zh','en','es'])assert.ok(m.note[lang]);
  for(const team of m.teams){const k=[m.mode,team,m.date].join('|');assert.ok(!contextKeys.has(k),'one story per team/date');contextKeys.add(k);assert.ok(all.some(f=>f.mode===m.mode&&f.team===team&&f.date===m.date),k+': context belongs to an actual question');}
}
for(const field of ['uclFinals','nationalFinals'])for(const entry of data[field]){
  const f=typeof entry==='string'?registry.get(entry):entry;
  const m=data.matchContext.matches.find(m=>m.mode===f.mode&&m.date===f.date&&m.teams.includes(f.team));
  assert.equal(m.stage.zh,'决赛');assert.ok(m.note.zh,f.id+': final story included');
}
assert.match(source,/id="inline-result-points"[^\n]*\n\s*<p id="inline-result-description" class="inline-result-points match-explanation"/);
assert.ok(source.includes("renderMatchExplanation($('inline-result-description'),state.revealed?f:null);"),'guard before all correct/wrong/forfeit renders');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-context-test-'));
try{
  fs.cpSync(path.join(root,'scripts'),path.join(temp,'scripts'),{recursive:true});
  fs.cpSync(path.join(root,'data'),path.join(temp,'data'),{recursive:true});
  const index=path.join(temp,'index.html');fs.writeFileSync(index,source);
  const update=()=>{for(const script of ['sync_ucl_finals.py','sync_national_finals.py','sync_mls_stars.py','sync_african_classics.py','upgrade_hard.py','sync_match_context.py','upgrade_easy.py'])execFileSync('python3',[path.join(temp,'scripts',script)]);};
  update();assert.equal(fs.readFileSync(index,'utf8'),source,'complete CI generation is idempotent');
  const stale=structuredClone(data);delete stale.hardMlsStars;delete stale.matchContext;
  fs.writeFileSync(index,source.replace('window.LINEUP_DATA = '+JSON.stringify(data)+';\n','window.LINEUP_DATA = '+JSON.stringify(stale)+';\n'));
  update();
  const regenerated=fs.readFileSync(index,'utf8'),payload=regenerated.split('window.LINEUP_DATA = ')[1].split(';\n')[0];
  assert.deepEqual(JSON.parse(payload),data,'catalog regeneration restores all descriptions and Hard XIs');
  assert.equal(regenerated.replace('window.LINEUP_DATA = '+payload+';\n','window.LINEUP_DATA = RESTORED;\n'),source.replace('window.LINEUP_DATA = '+JSON.stringify(data)+';\n','window.LINEUP_DATA = RESTORED;\n'),'regeneration preserves the surrounding engine and UI');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.equal(fs.readFileSync(path.join(root,'docs/match-context-and-hard-mls.md'),'utf8'),execFileSync(process.execPath,[path.join(root,'scripts/report_match_context.cjs')],{encoding:'utf8'}));
assert.equal(hash(fs.readFileSync(path.join(root,'README.md'),'utf8')),baseline.originalReadmeHash,'README retains only the original explanation');
console.log(`PASS: all ${explained.size} question descriptions in 3 languages; 76 classic/final stories; 5 Hard-only MLS XIs including Griezmann/Lewandowski debuts with exact hints; all 242 prior XIs and masks unchanged; offline flags, README and full generation.`);
