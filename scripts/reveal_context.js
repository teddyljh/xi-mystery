  // Answer-reveal match context. Never rendered before the answer is public.
  const MATCH_CONTEXT=DATA.matchContext;
  const contextNameKey=name=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  function contextOpponent(f){
    const key=contextNameKey(f.versus);
    const records=Object.values(f.mode==='club'?DATA.teams:DATA.nations);
    const record=records.find(r=>[r.en,r.zh,r.es,...(r.aliases||[])].some(n=>contextNameKey(n)===key))||MATCH_CONTEXT.opponents[f.versus];
    return record?.[state.lang]||f.versus;
  }
  function matchExplanation(f){
    const lang=state.lang;
    const match=MATCH_CONTEXT.matches.find(m=>m.mode===f.mode&&m.date===f.date&&m.teams.includes(f.team));
    const competition=MATCH_CONTEXT.competitions[f.competition]?.[lang]||f.competition;
    const stage=match?.stage?.[lang]||'';
    const event=lang==='es'&&stage?`${stage} de ${competition}`.replace(' de el ',' del '):
      competition+(stage?(lang==='zh'?'':' ')+stage:'');
    const opponent=contextOpponent(f);
    const base=lang==='zh'?`这是本球队在**${event}**中对决**${opponent}**的首发阵容。`:
      lang==='es'?`Este es el once titular del equipo ante **${opponent}** en **${event}**.`:
      `This is the team's starting XI against **${opponent}** in the **${event}**.`;
    return base+(match?.note?.[lang]?(lang==='zh'?'':' ')+match.note[lang]:'');
  }
  function renderMatchExplanation(container,f){
    container.replaceChildren();
    if(!f)return;
    // Only text and <strong> nodes: curated emphasis cannot inject markup.
    matchExplanation(f).split(/(\*\*[^*]+\*\*)/g).filter(Boolean).forEach(part=>{
      if(part.startsWith('**')){const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);container.append(strong);}
      else container.append(document.createTextNode(part));
    });
  }
  // End answer-reveal match context.
