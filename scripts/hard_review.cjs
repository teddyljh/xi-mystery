'use strict';
// Run every random branch of the actual shipped mask and both hint handlers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function loadHardReview(source){
  const data=JSON.parse(source.split('window.LINEUP_DATA = ')[1].split(';\n')[0]);
  let rules=source.slice(source.indexOf('  // Hard includes every historical XI'),source.indexOf('  // Shuffle-bag rotation'));
  for(const [marker,size] of [['return top[Math.floor(Math.random()*top.length)];','top.length'],['const pair=pairs[Math.floor(Math.random()*pairs.length)];','pairs.length']]){
    assert.equal(rules.split(marker).length,2);rules=rules.replace(marker,'globalThis.tieSizes.push('+size+');'+marker);
  }
  const math=Object.create(Math);let fixture;
  const context=vm.createContext({DATA:data,Math:math,state:{},tieSizes:[],current:()=>fixture,$:()=>({textContent:''}),tr:k=>k,renderGame:()=>{}});
  const hints=source.slice(source.indexOf('  function getHint(){'),source.indexOf('  function next(){'));
  vm.runInContext(rules+'\n'+hints+'\nglobalThis.api={available,buildHardMask,getHint,fixtureIdentity,finals:CLASSIC_FINAL_FIXTURES};',context);
  const pool=(mode,difficulty)=>{context.state={mode,difficulty};return [...context.api.available()];};
  const registry=new Map([...data.fixtures,...context.api.finals,...(data.mlsStars||[]),...(data.africanClassics||[]).filter(f=>typeof f!=='string'),...(data.hardMlsStars||[])].map(f=>[f.id,f]));
  function review(f){
    fixture=f;const masks=new Map();
    function enumerate(rolls=[]){
      let call=0;const request={};context.tieSizes=[];
      math.random=()=>{const size=context.tieSizes[call];assert.ok(Number.isInteger(size)&&size>0,f.id+': untracked random branch');if(call===rolls.length){request.size=size;throw request;}return rolls[call++];};
      try{const mask=[...context.api.buildHardMask(f)];masks.set(JSON.stringify(mask),mask);}
      catch(error){if(error!==request)throw error;for(let i=0;i<request.size;i++)enumerate([...rolls,(i+0.5)/request.size]);}
    }
    enumerate();
    const variants=[...masks.values()].map(hidden=>{
      context.state={mode:f.mode,difficulty:'hard',masked:[...hidden],hints:0,revealed:false,choicesShown:false,choices:[f.team,'a','b','c'],removed:[]};
      const order=[];for(let i=0;i<2;i++){const before=[...context.state.masked];context.api.getHint();const restored=before.filter(i=>!context.state.masked.includes(i));assert.equal(restored.length,1,f.id+': one restored clue');assert.equal(context.state.choicesShown,false);order.push(restored[0]);}
      return {hidden,hints:order};
    });
    return {id:f.id,mode:f.mode,team:f.team,teamName:(f.mode==='club'?data.teams:data.nations)[f.team].zh,date:f.date,
      players:f.players.map(p=>({...p,clue:(f.mode==='club'?data.nations:data.teams)[p.value].zh})),variants};
  }
  return {data,pool,registry,review,key:context.api.fixtureIdentity};
}
module.exports={loadHardReview};
