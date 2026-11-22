#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'data/difficulty_baseline_2026_11_22.json'),'utf8'));
const engine=loadHardReview(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const {data,pool,registry,review,key}=engine;
const resolve=ids=>ids.map(id=>{const f=registry.get(id);assert.ok(f,id);return f;});
const easy=[...pool('club','easy'),...pool('nation','easy')],hard=[...pool('club','hard'),...pool('nation','hard')];
const easyKeys=new Set(easy.map(key)),priorHard=new Set(resolve(baseline.hardIds).map(key));
const removed=resolve(baseline.easyIds).filter(f=>!easyKeys.has(key(f)));
const additions=hard.filter(f=>!priorHard.has(key(f))).map(review).sort((a,b)=>a.mode.localeCompare(b.mode)||a.team.localeCompare(b.team)||a.date.localeCompare(b.date));
const counts={easyClubs:pool('club','easy').length,easyNations:pool('nation','easy').length,moderateClubs:pool('club','moderate').length,moderateNations:pool('nation','moderate').length,hardClubs:pool('club','hard').length,hardNations:pool('nation','hard').length,removedEasy:removed.length,hardAdded:additions.length};
if(process.argv.includes('--json')){console.log(JSON.stringify({counts,removedEasy:removed,hardAdded:additions},null,2));process.exit(0);}
console.log('# 2026-11-22 题库调整与 Hard 新增隐藏清单\n');
console.log(`相对版本 ${baseline.revision}：Easy 移除${removed.length}套首发，Hard 新增${additions.length}套不同首发。Easy 为${counts.easyClubs}套俱乐部、${counts.easyNations}套国家队；Medium 为${counts.moderateClubs}、${counts.moderateNations}套；Hard 为${counts.hardClubs}、${counts.hardNations}套。\n`);
console.log('## Easy 移除的球队\n\n所有移除题目均保留在 Hard。Medium 按当前筛选保留，法兰克福仅在 Hard；本次明确指定的经典及世界杯首发可单独进入 Easy。\n');
console.log('| 类型 | 球队 | 首发数量 | 日期 |\n|---|---|---|---|');
const groups=new Map();for(const f of removed){const k=f.mode+'|'+f.team;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);}
for(const rows of groups.values()){const f=rows[0];console.log(`| ${f.mode==='club'?'俱乐部':'国家队'} | ${(f.mode==='club'?data.teams:data.nations)[f.team].zh} | ${rows.length} | ${rows.map(f=>f.date).sort().join('、')} |`);}
console.log('\n斯图加特此前不在 Easy，继续保留在较高难度。\n');
console.log('## Hard 新增首发：隐藏信息与提示顺序\n\n下面后三列合起来就是开局隐藏名单。第1、2次提示依次恢复前两列球员的信息，最后一列继续隐藏；括号为被隐藏的国籍或俱乐部。“／”表示随机选1人，“、”表示全部隐藏。有关联的随机组合分成多行列出。\n');
console.log('| 类型／球队 | 日期 | 第1次提示恢复 | 第2次提示恢复 | 两次提示后仍隐藏 |\n|---|---|---|---|---|');
function row(f,variants,label=''){
  const values=[...new Set(variants.map(v=>v.hints[0]))],second=[...new Set(variants.map(v=>v.hints[1]))],rests=[...new Set(variants.map(v=>JSON.stringify(v.hidden.filter(i=>!v.hints.includes(i)))))];
  if(variants.length!==values.length*second.length*rests.length){variants.forEach((v,i)=>row(f,[v],`（随机方案${i+1}）`));return;}
  const player=i=>`${f.players[i].name}（${f.players[i].clue}）`;
  const remaining=rests.map(s=>JSON.parse(s).map(player).join('、')||'—').join('／');
  console.log(`| ${f.mode==='club'?'俱乐部':'国家队'}／${f.teamName}${label} | ${f.date} | ${values.map(player).join('／')} | ${second.map(player).join('／')} | ${remaining} |`);
}
for(const f of additions)row(f,f.variants);
