#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..');
const {data,pool,registry,review,key}=loadHardReview(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/african_classics.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'data/african_classics_baseline_2026_11_22.json'),'utf8'));
console.log('# 非洲国家队经典首发与 Hard 提示\n');
console.log('Medium 新增6套，Hard 新增5套；摩洛哥2022-12-10复用原有首发，仅补入 Medium。每个难度按同一球队、日期和首发去重，Easy 不增加。\n');
console.log('中等知名度国家队沿用本国联赛／关键球员规则，每次提示恢复一人，非本国联赛优先。埃及、喀麦隆沿用经典阵容规则，依次提示中场、后卫，核心前锋继续隐藏。摩洛哥原有隐藏和提示不变。\n');
console.log('| 国家队 | 日期 | Medium | Hard |\n|---|---|---|---|');
for(const record of catalog.fixtures){
  const f=registry.get(record.reuseId||record.id);
  const status=d=>baseline.pools[d].some(id=>key(registry.get(id))===key(f))?'已有，复用':'新增';
  console.log(`| ${data.nations[f.team].zh} | ${f.date} | ${status('moderate')} | ${status('hard')} |`);
}
console.log('\n| 难度 | 俱乐部首发 | 国家队首发 | 总数 |\n|---|---|---|---|');
for(const difficulty of ['easy','moderate','hard']){const c=pool('club',difficulty).length,n=pool('nation',difficulty).length;console.log(`| ${difficulty==='moderate'?'Medium':difficulty==='easy'?'Easy':'Hard'} | ${c} | ${n} | ${c+n} |`);}
for(const record of catalog.fixtures){
  const f=registry.get(record.reuseId||record.id),r=review(f),player=i=>`${f.players[i].name}（${data.teams[f.players[i].value].zh}）`;
  console.log(`\n## ${data.nations[f.team].zh} · ${f.date} · ${f.formation}\n`);
  console.log(`[比赛来源](${record.source})${record.note?' · '+record.note:''}\n`);
  console.log('| 位置 | 首发球员 | 当时俱乐部 |\n|---|---|---|');
  for(const p of f.players)console.log(`| ${p.role} | ${p.name} | ${data.teams[p.value].zh} |`);
  console.log('\n| 开局隐藏 | 第一次提示 | 第二次提示 | 两次提示后仍隐藏 |\n|---|---|---|---|');
  for(const v of r.variants)console.log(`| ${v.hidden.map(player).join('、')} | ${player(v.hints[0])} | ${player(v.hints[1])} | ${v.hidden.filter(i=>!v.hints.includes(i)).map(player).join('、')||'无'} |`);
  for(const [label,urls] of [['首发核对',record.lineupSources],['俱乐部核对',record.clubSources]])if(urls?.length)console.log(`\n${label}：${urls.map((url,i)=>`[来源${i+1}](${url})`).join('、')}`);
}
