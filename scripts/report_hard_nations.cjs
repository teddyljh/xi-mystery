#!/usr/bin/env node
'use strict';

// Enumerate every random tie in the shipped Hard rules, then run both real
// hints. Never present one random sample as a fixed hidden-player policy.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const data=JSON.parse(source.split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
let rules=source.slice(source.indexOf('  // Hard includes every historical XI'),source.indexOf('  // Shuffle-bag rotation'));
const marker='return top[Math.floor(Math.random()*top.length)];';
assert.equal(rules.split(marker).length,2,'instrument the national-team random tie selection');
rules=rules.replace(marker,'globalThis.tieSizes.push(top.length);'+marker);
const hints=source.slice(source.indexOf('  function getHint(){'),source.indexOf('  function next(){'));
const math=Object.create(Math);
let fixture;
const context=vm.createContext({DATA:data,Math:math,state:{},tieSizes:[],current:()=>fixture,
  $:()=>({textContent:''}),tr:key=>key,renderGame:()=>{}});
vm.runInContext(rules+'\n'+hints+'\nglobalThis.api={available,buildHardMask,getHint,fixtureIdentity};',context);
context.state={mode:'nation',difficulty:'hard'};
const grouped=new Map();
for(const f of context.api.available()){
  const key=context.api.fixtureIdentity(f);
  if(!grouped.has(key))grouped.set(key,{fixture:f,ids:[]});
  grouped.get(key).ids.push(f.id);
}
const reports=[];
for(const {fixture:f,ids} of grouped.values()){
  fixture=f;
  const masks=new Map();
  function enumerate(rolls=[]){
    let call=0;
    const nextChoice={};
    context.tieSizes=[];
    math.random=()=>{
      const size=context.tieSizes[call];
      assert.ok(Number.isInteger(size)&&size>0,'untracked random choice: '+f.id);
      if(call===rolls.length){nextChoice.size=size;throw nextChoice;}
      return rolls[call++];
    };
    try{
      const mask=[...context.api.buildHardMask(f)];
      masks.set(JSON.stringify(mask),mask);
    }catch(error){
      if(error!==nextChoice)throw error;
      for(let i=0;i<nextChoice.size;i++)enumerate([...rolls,(i+0.5)/nextChoice.size]);
    }
  }
  enumerate();
  const variants=[...masks.values()].map(mask=>{
    context.state={difficulty:'hard',mode:'nation',masked:[...mask],hints:0,revealed:false,
      choicesShown:false,choices:[f.team,'wrong-a','wrong-b','wrong-c'],removed:[]};
    const order=[];
    for(let i=0;i<2;i++){
      const before=[...context.state.masked];
      context.api.getHint();
      const restored=before.filter(index=>!context.state.masked.includes(index));
      assert.equal(restored.length,1,f.id+': restore one player each hint');
      assert.equal(context.state.choicesShown,false,f.id+': no answer choices');
      order.push(restored[0]);
    }
    return {hidden:mask,hints:order};
  });
  reports.push({id:f.id,ids,team:f.team,nation:data.nations[f.team].zh,date:f.date,
    players:f.players.map(p=>({name:p.name,club:p.value,clubName:data.teams[p.value].zh,role:p.role})),variants});
}
reports.sort((a,b)=>a.team.localeCompare(b.team)||a.date.localeCompare(b.date));
if(process.argv.includes('--json')){
  console.log(JSON.stringify(reports,null,2));
}else{
  const count=reports.reduce((n,row)=>n+row.ids.length,0);
  console.log('# 国家队 Hard 隐藏与提示清单\n');
  console.log(`共${new Set(reports.map(row=>row.team)).size}支国家队、${reports.length}套不同首发（${count}条题库记录）。同一首发的难度副本合并列出。\n`);
  console.log('以下内容由当前游戏实际代码生成，列出了全部随机分支。括号为题库中该球员的俱乐部；“／”表示随机选其中一人，其余均为固定名单。两次提示各恢复一人的俱乐部信息，不切换为选择答案。\n');
  console.log('| 国家队 | 首发日期 | 开局隐藏的球员（俱乐部） | 第一次提示 | 第二次提示 |');
  console.log('|---|---|---|---|---|');
  for(const row of reports){
    const format=i=>`${row.players[i].name}（${row.players[i].clubName}）`;
    const positions=row.variants[0].hidden.map((_,i)=>[...new Set(row.variants.map(v=>v.hidden[i]))]);
    assert.ok(row.variants.every(v=>v.hidden.length===positions.length));
    const hidden=positions.map(indices=>indices.map(format).join('／')+(indices.length>1?'（随机选1）':'')).join('；');
    const hint=n=>[...new Set(row.variants.map(v=>v.hints[n]))].map(format).join('／');
    console.log(`| ${row.nation} | ${row.date} | ${hidden} | ${hint(0)} | ${hint(1)} |`);
  }
}
