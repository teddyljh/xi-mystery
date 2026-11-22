#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {data,pool,registry,review,key}=loadHardReview(source);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/lineup_expansion.json'),'utf8'));
const before=JSON.parse(fs.readFileSync(path.join(root,'data/expansion_baseline_2026_11_22.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const combined=d=>['club','nation'].flatMap(m=>pool(m,d));
const records=catalog.fixtures,added=records.filter(f=>!f.reuseId),resolve=r=>registry.get(r.reuseId||r.id);
assert.equal(records.length,37);assert.equal(added.length,33);assert.equal(records.filter(f=>f.reuseId).length,4);
assert.equal(hash(data.fixtures),before.baseFixturesHash,'base archive and frequency heuristic unchanged');
assert.equal(Object.keys(before.hardMasks).length,244);
for(const [id,expected] of Object.entries(before.hardMasks))assert.equal(hash(review(registry.get(id)).variants.map(v=>JSON.stringify(v)).sort()),expected,id+': every existing mask and both hints preserved');
for(const d of ['easy','moderate','hard']){
 const old=before.pools[d].map(id=>registry.get(id));
 const keep=old.filter(f=>d!=='moderate'||f.team!=='frankfurt');
 const expected=new Set([...keep,...records.filter(r=>r.difficulties.includes(d)).map(resolve)].map(key));
 const actual=combined(d);
 assert.deepEqual(actual.map(key).sort(),[...expected].sort(),d+': exact authorized additions/removal and no duplicates');
 assert.equal(actual.length,{easy:187,moderate:206,hard:277}[d]);
 assert.equal(new Set(actual.map(f=>f.mode+'|'+f.team+'|'+f.date)).size,actual.length,'one question per team/date');
}
assert.ok(!pool('club','moderate').some(f=>f.team==='frankfurt'));
assert.ok(pool('club','hard').some(f=>f.team==='frankfurt'));
for(const team of ['leipzig','como','roma']){
 const r=records.find(r=>r.group==='current'&&resolve(r).team===team);assert.ok(r?.reuseId);
 const f=resolve(r);assert.ok(f.date.startsWith('2026-11'));
 for(const d of ['moderate','hard'])assert.equal(pool('club',d).filter(x=>key(x)===key(f)).length,1);
 assert.ok(!pool('club','easy').some(x=>key(x)===key(f)));
}
const by=(team,date)=>added.find(f=>f.team===team&&f.date===date);
const roma=by('roma','2001-06-17'),napoli=by('napoli','1987-05-10'),sociedad=by('sociedad','2026-04-18');
assert.ok(roma.players.some(p=>p.name==='Francesco Totti'));
assert.ok(napoli.players.some(p=>p.name==='Diego Maradona'));
assert.ok(napoli.players.some(p=>p.name==='Giuseppe Volpecina'));
assert.ok(!napoli.players.some(p=>p.name==='Ciro Ferrara'),'Ferrara came on as a substitute');
assert.ok(!sociedad.players.some(p=>/Kubo|Remiro/.test(p.name)),'Kubo and Remiro did not start this final');
const existingUnited=records.find(r=>r.group==='classic-existing');
assert.ok(resolve(existingUnited).players.some(p=>p.name==='Cristiano Ronaldo'));
for(const d of ['easy','moderate','hard'])assert.equal(pool('club',d).filter(f=>f.team==='manunited'&&f.date==='2008-05-21').length,1);
const ucl=added.filter(f=>f.group==='ucl-semi');assert.equal(ucl.length,12);
for(const year of ['2024','2025','2026']){
 const rows=ucl.filter(f=>f.date.startsWith(year));assert.equal(rows.length,4);
 assert.equal(new Set(rows.map(f=>f.uefaMatchId)).size,2);
 for(const f of rows){assert.equal(f.leg,2);assert.deepEqual(f.difficulties,['moderate','hard']);assert.equal(new Set(f.players.map(p=>p.uefaPlayerId)).size,11);assert.equal(new Set(f.players.map(p=>p.number)).size,11);}
}
assert.ok(!ucl.find(f=>f.team==='realmadrid'&&f.date==='2024-05-08').players.some(p=>p.name==='Joselu'));
assert.ok(!ucl.find(f=>f.team==='barcelona'&&f.date==='2025-05-06').players.some(p=>p.name==='Robert Lewandowski'));
const wc=added.filter(f=>f.group.startsWith('wc-'));assert.equal(wc.length,18);
for(const year of ['2018','2022','2026']){
 const rows=wc.filter(f=>f.date.startsWith(year));assert.equal(rows.length,6);
 assert.equal(rows.filter(f=>f.group==='wc-semi').length,4);assert.equal(rows.filter(f=>f.group==='wc-third').length,2);
 assert.equal(new Set(rows.map(f=>f.espnEventId)).size,3);
 for(const f of rows){assert.deepEqual(f.difficulties,['easy','moderate','hard']);assert.equal(new Set(f.players.map(p=>p.sourcePlayerId)).size,11);}
}
const club=(team,date,name)=>by(team,date).players.find(p=>p.name===name).value;
assert.equal(club('ENG','2026-07-15','Morgan Rogers'),'villa');assert.equal(club('ENG','2026-07-15','Anthony Gordon'),'barcelona');assert.equal(club('ENG','2026-07-15','Elliot Anderson'),'city');
assert.equal(club('ENG','2026-07-18','Marcus Rashford'),'manunited');assert.equal(club('ENG','2026-07-18','Ezri Konsa'),'villa');
assert.equal(club('FRA','2026-07-18','Ibrahima Konaté'),'liverpool');assert.equal(club('FRA','2026-07-14','Bradley Barcola'),'psg');assert.equal(club('FRA','2026-07-18','Theo Hernández'),'al-hilal');
assert.equal(club('BEL','2018-07-10','Axel Witsel'),'tianjinquanjian');assert.equal(club('ARG','2026-07-15','Leandro Paredes'),'boca');
const flags=JSON.parse(source.split('window.XI_UI_ASSETS = ')[1].split(';\n')[0]).flags;
for(const record of added){
 const f=resolve(record);assert.ok(f);assert.deepEqual(f.players,record.players.map(({role,name,value})=>({role,name,value})));
 assert.equal(f.players.length,11);assert.equal(f.players[10].role,'GK');assert.equal(new Set(f.players.map(p=>p.name)).size,11);assert.equal(f.formation.split('-').reduce((n,x)=>n+Number(x),0),10);
 for(const p of f.players)assert.ok(f.mode==='club'?flags[p.value]:data.teams[p.value],f.id+': valid clue and local flag');
 for(const v of review(f).variants){
  assert.equal(v.hints.length,2);assert.equal(new Set(v.hints).size,2);
  if(f.mode==='club'&&record.hardForward){assert.equal(v.hidden.length,3);assert.equal(f.players[v.hidden[2]].name,record.hardForward);assert.deepEqual(v.hints,v.hidden.slice(0,2));assert.ok(['AM','CM','DM','LM','RM'].includes(f.players[v.hints[0]].role));assert.ok(['LB','CB','RB','LWB','RWB'].includes(f.players[v.hints[1]].role));}
 }
}
assert.deepEqual(review(resolve(sociedad)).variants,[{hidden:[4,7],hints:[4,7]}]);
const spain=resolve(by('ESP','2026-07-14'));
for(const v of review(spain).variants){assert.deepEqual(v.hidden.map(i=>spain.players[i].name),['Dani Olmo','Pau Cubarsí','Lamine Yamal']);assert.deepEqual(v.hints,v.hidden.slice(0,2));}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xi-expansion-test-'));
try{
 fs.cpSync(path.join(root,'scripts'),path.join(temp,'scripts'),{recursive:true});fs.cpSync(path.join(root,'data'),path.join(temp,'data'),{recursive:true});
 const index=path.join(temp,'index.html');fs.writeFileSync(index,source);
 const update=()=>{for(const script of ['sync_ucl_finals.py','sync_national_finals.py','sync_mls_stars.py','sync_african_classics.py','sync_lineup_expansion.py','upgrade_hard.py','sync_match_context.py','upgrade_easy.py'])execFileSync('python3',[path.join(temp,'scripts',script)]);};
 update();assert.equal(fs.readFileSync(index,'utf8'),source,'complete generation is idempotent');
 const stale=structuredClone(data);delete stale.lineupExpansion;delete stale.mediumExcludedClubs;
 fs.writeFileSync(index,source.replace('window.LINEUP_DATA = '+JSON.stringify(data)+';\n','window.LINEUP_DATA = '+JSON.stringify(stale)+';\n'));update();assert.equal(fs.readFileSync(index,'utf8'),source,'catalog regenerates all additions and difficulty exceptions');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.equal(fs.readFileSync(path.join(root,'docs/lineup-expansion.md'),'utf8'),execFileSync(process.execPath,[path.join(root,'scripts/report_lineup_expansion.cjs')],{encoding:'utf8'}));
console.log('PASS: 33 new XIs, 4 reused; 12 second-leg UCL semifinal XIs, 18 World Cup semifinal/third-place XIs in all modes; precise Medium edits; every one of 244 old Hard masks and both hints preserved; contemporary club clues, flags, review and generation.');
