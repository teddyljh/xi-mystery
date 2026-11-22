#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadHardReview}=require('./hard_review.cjs');
const root=path.resolve(__dirname,'..');
const {data,pool,registry,review}=loadHardReview(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/hard_mls_stars.json'),'utf8'));
const context=JSON.parse(fs.readFileSync(path.join(root,'data/match_context.json'),'utf8'));
console.log('# 答案揭晓说明与 Hard 美职联首发\n');
console.log('所有难度在“本题 + 分数”下方显示赛事及对手；与得分使用相同字体和字号，关键内容加粗。只在答案揭晓后显示，答对、用尽次数和放弃均适用。中英西三种语言同步，换题清空旧说明。\n');
console.log(`为${context.matches.length}场决赛或经典比赛补充简短重点，涵盖题库全部欧冠、世界杯、欧洲杯决赛。其他比赛仅显示简洁的赛事及对手说明。原有239套 Hard 首发的全部隐藏与两次提示方案保持一致。\n`);
console.log('## 新增首发 · 仅 Hard\n\n开局只隐藏下表两人国籍；第一次提示恢复另一人，第二次恢复球星。两次提示都不切换为答案选项。\n');
console.log('| 球队 | 日期 | 对手 | 第一次提示 | 第二次提示（球星） |\n|---|---|---|---|---|');
for(const record of catalog.fixtures){const f=registry.get(record.id),r=review(f);console.log(`| ${r.teamName} | ${f.date} | ${context.opponents[f.versus].zh} | ${record.hardHintOrder.map(name=>`${name}（${data.nations[f.players.find(p=>p.name===name).value].zh}）`).join(' | ')} |`);}
for(const record of catalog.fixtures){console.log(`\n### ${data.teams[record.team].zh} · ${record.date}\n\n[球队官方首发及战报](${record.source})\n\n${record.players.map(p=>`${p.name}（${data.nations[p.value].zh}，${p.role}）`).join('；')}\n`);}
console.log('## 揭晓后的经典比赛重点\n\n同场双方及不同难度共用说明；以下列出日期、参赛球队和简短重点。\n\n| 日期 | 球队 | 比赛重点 | 资料 |\n|---|---|---|---|');
for(const m of context.matches){const teams=m.teams.map(t=>(m.mode==='club'?data.teams:data.nations)[t].zh).join('／');console.log(`| ${m.date} | ${teams} | ${m.note.zh} | [官方记录](${m.sources[0]}) |`);}
console.log('\n## 当前题库\n\n| 难度 | 俱乐部 | 国家队 |\n|---|---|---|');
for(const d of ['easy','moderate','hard'])console.log(`| ${d==='moderate'?'Medium':d==='easy'?'Easy':'Hard'} | ${pool('club',d).length} | ${pool('nation',d).length} |`);
