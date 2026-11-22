#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/lineup_expansion.json'),'utf8'));
const {data,pool,registry,review}=loadHardReview(fs.readFileSync(path.join(root,'index.html'),'utf8'));
console.log('# 经典、当前首发与杯赛扩充清单\n');
console.log('新增33套首发，复用4套已有首发。欧冠仅收录2024—2026年半决赛次回合双方；世界杯收录2018、2022、2026年半决赛与季军赛双方，全部进入 Easy、Medium、Hard。曼联2008年欧冠决赛、莱比锡、科莫和罗马当前首发按原记录复用。Medium 移除法兰克福，Hard 保留。\n');
console.log('原有244套 Hard 的全部隐藏及提示随机方案保持不变；新经典豪门按前锋、中场、后场规则隐藏，提示先中场再后场。中等知名度国家队仍采用本国俱乐部与关键球员规则，非本国联赛信息优先恢复；皇家社会保留冷门球队两人隐藏规则。\n');
console.log('| 难度 | 俱乐部首发 | 国家队首发 | 总题数 |\n|---|---|---|---|');
for(const d of ['easy','moderate','hard']){const a=pool('club',d).length,b=pool('nation',d).length;console.log(`| ${d==='moderate'?'Medium':d==='easy'?'Easy':'Hard'} | ${a} | ${b} | ${a+b} |`);}
console.log('\n## 阵容、难度与两次提示\n\n开局隐藏名单为后面三列之和；前两列分别为两次提示恢复的信息。“／”表示随机选择；有联动的组合分行列出。\n\n| 球队 | 日期 | 赛事／对手 | 难度／状态 | 提示1 | 提示2 | 两次提示后仍隐藏 |\n|---|---|---|---|---|---|---|');
for(const record of catalog.fixtures){
 const f=registry.get(record.reuseId||record.id),r=review(f),name=i=>`${r.players[i].name}（${r.players[i].clue}）`;
 const groups=new Map();for(const v of r.variants){const rest=v.hidden.filter(i=>!v.hints.includes(i));const k=JSON.stringify([v.hints[1],rest]);if(!groups.has(k))groups.set(k,{first:[],second:v.hints[1],rest});groups.get(k).first.push(v.hints[0]);}
 for(const v of groups.values())console.log(`| ${r.teamName} | ${f.date} | ${f.competition}／${f.versus} | ${record.difficulties.map(d=>d==='moderate'?'Medium':d==='easy'?'Easy':'Hard').join('、')}／${record.reuseId?'复用':'新增'} | ${[...new Set(v.first)].map(name).join('／')} | ${name(v.second)} | ${v.rest.map(name).join('、')||'—'} |`);
}
console.log('\n## 新增首发与资料\n');
for(const record of catalog.fixtures){
 if(record.reuseId)continue;
 const f=registry.get(record.id),r=review(f);
 console.log(`### ${r.teamName} · ${f.date} · ${f.formation}\n\n[比赛及首发资料](${record.source})${record.officialLineupSource?` · [首发数据](${record.officialLineupSource})`:''}\n\n${r.players.map(p=>`${p.name}（${p.clue}，${p.role}）`).join('；')}\n`);
 if(record.clubSources)console.log('当届俱乐部资料：'+record.clubSources.map((url,i)=>`[来源${i+1}](${url})`).join('、')+'\n');
}
