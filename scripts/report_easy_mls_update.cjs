#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..');
const {data,pool,registry,review,key}=loadHardReview(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const before=JSON.parse(fs.readFileSync(path.join(root,'data/easy_mls_baseline_2026_11_22.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/mls_stars.json'),'utf8'));
const oldKeys=new Set(before.pools.easy.map(id=>key(registry.get(id))));
const restored=['club','nation'].flatMap(mode=>pool(mode,'easy')).filter(f=>!oldKeys.has(key(f)));
console.log('# Easy 恢复与美职联题库更新 · 2026-11-22\n');
console.log('相对版本 0cdb7bf：Easy 恢复20套首发；Medium、Hard 各新增3套美职联首发。恢复 Easy 不移除其在较高难度的题目，原有231套 Hard 的所有隐藏及提示随机方案保持一致。\n');
console.log('| 难度 | 俱乐部首发 | 国家队首发 | 总数 |\n|---|---|---|---|');
for(const d of ['easy','moderate','hard']){const a=pool('club',d).length,b=pool('nation',d).length;console.log(`| ${d==='moderate'?'Medium':d==='easy'?'Easy':'Hard'} | ${a} | ${b} | ${a+b} |`);}
console.log('\n## Easy 恢复的球队和日期\n\n| 类型 | 球队 | 日期 |\n|---|---|---|');
const groups=new Map();for(const f of restored){const k=f.mode+'|'+f.team;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);}
for(const rows of groups.values()){const f=rows[0];console.log(`| ${f.mode==='club'?'俱乐部':'国家队'} | ${(f.mode==='club'?data.teams:data.nations)[f.team].zh} | ${rows.map(x=>x.date).sort().join('、')} |`);}
console.log('\nEasy 当前没有东欧小众联赛俱乐部题目，本轮无需额外删除。本菲卡、波尔图、葡萄牙体育、阿贾克斯、PSV、加拉塔萨雷、费内巴切、凯尔特人保留；布鲁日按本次明确要求恢复。\n');
console.log('## 美职联新增首发 · 仅 Medium、Hard\n\n首发按球队及 MLS 官方资料核对，阵型用于游戏位置排列。国籍按当时的代表资格核对，包括2023年的 Cremaschi（美国）、Ordaz（萨尔瓦多）、Saunders（波多黎各）。MLS 阵容遵循原非五大联赛隐藏规则，优先本国前锋；没有本国前锋时选择独特外籍前锋，另外隐藏两名美国球员，前锋保留到两次提示之后。\n');
for(const record of catalog.fixtures){
  const f=registry.get(record.id),r=review(f),name=i=>`${r.players[i].name}（${r.players[i].clue}）`;
  console.log(`### ${data.teams[f.team].zh} · ${f.date} · ${f.formation}\n`);
  console.log(`[官方比赛记录](${record.source})${record.officialLineupPage?` · [官方首发](${record.officialLineupPage})`:''}\n`);
  console.log(f.players.map(p=>`${p.name}（${data.nations[p.value].zh}，${p.role}）`).join('；')+'\n');
  console.log('| 第一次提示恢复 | 第二次提示恢复 | 两次提示后仍隐藏 |\n|---|---|---|');
  const slot=n=>[...new Set(r.variants.map(v=>v.hidden[n]))].map(name).join('／');
  console.log(`| ${slot(0)} | ${slot(1)} | ${slot(2)} |\n`);
  console.log('三列合起来为开局隐藏名单；“／”为随机选一人。\n');
}
console.log('## 当前实际题库中的非洲国家队\n\n| 难度 | 非洲国家队 | 首发日期 |\n|---|---|---|');
const africa=new Set('MAR SEN NGA CIV EGY CMR DZA GHA TUN ZAF RSA MLI GAB COD COG CPV BFA BUR'.split(' '));
for(const difficulty of ['easy','moderate','hard']){
  const rows=pool('nation',difficulty).filter(f=>africa.has(f.team));
  if(!rows.length)console.log(`| ${difficulty==='easy'?'Easy':'Medium'} | 无 | — |`);
  for(const f of rows)console.log(`| ${difficulty==='hard'?'Hard':difficulty==='easy'?'Easy':'Medium'} | ${data.nations[f.team].zh} | ${f.date} |`);
}
console.log('\n作为错误选项出现、但没有可抽取首发的国家队不计入此表。');
