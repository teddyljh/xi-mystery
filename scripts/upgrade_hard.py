#!/usr/bin/env python3
"""Upgrade the XI Mystery Hard question pool without changing source fixtures.

Idempotent: once patched, subsequent gallery synchronizations preserve the change.
"""
from __future__ import annotations
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

RULES = r"""
  // Hard includes every historical XI from Easy/Moderate and prominent
  // teams from Moderate. The original fixture tiers remain unchanged.
  const HARD_FAMOUS_CLUBS=new Set('realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic'.split(' '));
  const HARD_FAMOUS_NATIONS=new Set('ENG FRA GER ESP POR BRA ARG ITA NED'.split(' '));
  function isImportedHardFixture(f){
    const historical=f.id.startsWith('historic-')||f.date<'2024-01-01';
    if(historical && (f.tier==='easy'||f.tier==='moderate'))return true;
    return f.tier==='moderate'&&(f.mode==='club'?HARD_FAMOUS_CLUBS.has(f.team):HARD_FAMOUS_NATIONS.has(f.team));
  }
  function available(){
    return DATA.fixtures.filter(f=>f.mode===state.mode&&
      (f.tier===state.difficulty||(state.difficulty==='hard'&&isImportedHardFixture(f))));
  }

  // Featured Hard XI: conceal one attacker, one recognizable midfielder or
  // defender, and a third randomly selected different player (3 of 11 total).
  // Original Hard fixtures retain their former two hidden positions.
  const HARD_FORWARD_ROLES=new Set(['ST','LS','RS','LW','RW']);
  const HARD_MIDDEF_ROLES=new Set(['AM','CM','DM','LM','RM','LB','CB','RB','LWB','RWB']);
  const hardName=n=>n.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const HARD_NOTABLE=new Set(('Zinedine Zidane|Kaka|Kevin De Bruyne|Luka Modric|Andres Iniesta|Xavi Hernandez|Andrea Pirlo|Sergio Ramos|Virgil van Dijk|Frank Lampard|Steven Gerrard|Rodri|Jude Bellingham|Pedri|Declan Rice|Joshua Kimmich|Bruno Fernandes|Thomas Muller|Nicolò Barella|Hakan Çalhanoğlu|Frenkie de Jong|Theo Hernández|Bernardo Silva|John Terry|Sergio Busquets|Bastian Schweinsteiger|Paolo Maldini|Ashley Cole|Ruben Dias|Lilian Thuram|Toni Kroos|Philipp Lahm|Marco Reus|Mats Hummels|Wesley Sneijder|Koke|Xabi Alonso|Paul Scholes|Gerard Pique|Dani Alves|João Neves|Vitinha|Achraf Hakimi|Federico Dimarco|Ilkay Gundogan|Joško Gvardiol|Claude Makelele|Clarence Seedorf|N’Golo Kante|Paul Pogba|Cafu|Javier Mascherano|Sandro Tonali|Carles Puyol|Dani Carvajal|Trent Alexander-Arnold|João Palhinha|Roméo Lavia|Reece James|Antoine Griezmann|David Alaba|David Luiz|Iñigo Martínez|Denzel Dumfries|Fabián Ruiz|Marc Cucurella|Phil Foden|Marquinhos|Leonardo Bonucci|Raphael Varane|Marcelo Brozovic|Roberto Carlos|Bernd Schneider|Torsten Frings|Dietmar Hamann|Michael Carrick|Park Ji-sung|Leandro Paredes|Patrick Vieira|Pepe|Jordi Alba|Juan Mata|Manuel Akanji|Michael Ballack|Fabio Cannavaro|Georginio Wijnaldum|Lucas Hernández|Christian Pulisic|Mikel Merino|Dominik Szoboszlai|Enzo Fernandez|Alexis Mac Allister|John Stones|Nico Schlotterbeck|Rodrigo de Paul|Jan Vertonghen|Toby Alderweireld|Christian Eriksen|Lucas Torreira|Mario Lemina|Mattéo Guendouzi|Gabri Veiga|Joey Veerman|Guus Til|Morten Hjulmand|Pedro Gonçalves|Davy Klaassen|Scott McTominay|Callum McGregor|Reo Hatate|Richard Ríos|Jules Koundé|Dani Olmo|Marten de Roon|Ivan Perišić|Manuel Locatelli|Piero Hincapié|Jobe Bellingham|Fikayo Tomori|Alphonso Davies|Sebastian Szymański|İsmail Yüksek|Conor Gallagher|Malik Tillman|Mauro Júnior|Gabriel Magalhães|Leon Goretzka|Enzo Barrenechea|Aleksandar Pavlović|Victor Froholdt|Giorgio Chiellini|Claudio Marchisio|Harry Winks|Moussa Sissoko|Sergi Altimira|Thomas Müller|Mikel Oyarzabal|Declan Rice|Kevin Grosskreutz|Aleix García|John Obi Mikel|Youri Tielemans|Christian Eriksen|Gabriel Magalhães').split('|').map(hardName));
  // Heuristic fallback favors a player who appears repeatedly in the
  // historical/current database when a new lineup isn't in the curated list.
  const HARD_PLAYER_FREQUENCY=new Map();
  for(const f of DATA.fixtures)for(const p of f.players){
    const n=hardName(p.name);
    HARD_PLAYER_FREQUENCY.set(n,(HARD_PLAYER_FREQUENCY.get(n)||0)+1);
  }
  function selectNotableMidDef(f,candidates){
    const known=candidates.filter(i=>HARD_NOTABLE.has(hardName(f.players[i].name)));
    const pool=known.length?known:candidates;
    let best=-1;
    for(const i of pool)best=Math.max(best,HARD_PLAYER_FREQUENCY.get(hardName(f.players[i].name))||0);
    const top=pool.filter(i=>(HARD_PLAYER_FREQUENCY.get(hardName(f.players[i].name))||0)===best);
    return top[Math.floor(Math.random()*top.length)];
  }
  function buildHardMask(f){
    if(!isImportedHardFixture(f))return [4,7];
    const slots=f.players.map((_,i)=>i);
    const attackers=slots.filter(i=>HARD_FORWARD_ROLES.has(f.players[i].role));
    const midfieldDefenders=slots.filter(i=>HARD_MIDDEF_ROLES.has(f.players[i].role));
    if(!attackers.length||!midfieldDefenders.length)throw Error('Invalid featured XI: '+f.id);
    const striker=attackers[Math.floor(Math.random()*attackers.length)];
    const notable=selectNotableMidDef(f,midfieldDefenders.filter(i=>i!==striker));
    const rest=slots.filter(i=>i!==striker&&i!==notable);
    const third=rest[Math.floor(Math.random()*rest.length)];
    return [striker,notable,third];
  }
"""

HARD_BALANCE = r"""    if(state.difficulty==='hard'){
      // 3 recognisable/classic and 2 original Hard XIs per five-question
      // session when available; shuffle the order of the resulting five.
      const featured=new Map(),original=new Map();
      for(const f of shuffle(available())){
        const group=isImportedHardFixture(f)?featured:original;
        if(!group.has(f.team))group.set(f.team,f);
      }
      const chosen=[];
      const draw=(group,count)=>{
        const eligible=shuffle([...group.values()].filter(f=>!chosen.some(x=>x.team===f.team)));
        const fresh=eligible.filter(f=>!seen.has(f.team));
        const old=eligible.filter(f=>seen.has(f.team));
        chosen.push(...[...fresh,...old].slice(0,count));
      };
      draw(featured,3);
      draw(original,Math.max(0,5-chosen.length));
      if(chosen.length<5)draw(choices,5-chosen.length);
      for(const f of chosen)seen.add(f.team);
      if(seen.size>=pool.length)seen.clear();
      saveDeck(key,seen);
      return shuffle(chosen);
    }
"""

def once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise ValueError("Expected one source marker: " + repr(old[:100]))
    return source.replace(old, new, 1)

def main() -> None:
    source = INDEX.read_text(encoding="utf-8")
    if "function isImportedHardFixture(f)" in source:
        print("Hard mode upgrade already present; skipping")
        return
    data_marker = "window.LINEUP_DATA = "
    data_text = source.split(data_marker, 1)[1].split(";\n", 1)[0]
    fixtures = json.loads(data_text)["fixtures"]
    historical = lambda f: f["id"].startswith("historic-") or f["date"] < "2024-01-01"
    clubs = set("realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic".split())
    nations = set("ENG FRA GER ESP POR BRA ARG ITA NED".split())
    added = [f for f in fixtures if (historical(f) and f["tier"] in ("easy", "moderate")) or
             (f["tier"] == "moderate" and (f["team"] in (clubs if f["mode"]=="club" else nations)))]
    forward = {"ST", "LS", "RS", "LW", "RW"}
    middef = {"AM", "CM", "DM", "LM", "RM", "LB", "CB", "RB", "LWB", "RWB"}
    for f in added:
        if not any(p["role"] in forward for p in f["players"]) or not any(p["role"] in middef for p in f["players"]):
            raise ValueError("Cannot mask target positions in: " + f["id"])

    source = once(source,
        "  function available(){return DATA.fixtures.filter(f=>f.mode===state.mode && f.tier===state.difficulty);}",
        RULES)
    source = once(source,
        "    const seen=deckFor(key);\n    const fresh=shuffle(pool.filter(f=>!seen.has(f.team)));",
        "    const seen=deckFor(key);\n" + HARD_BALANCE +
        "    const fresh=shuffle(pool.filter(f=>!seen.has(f.team)));")
    source = once(source,
        "state.masked=state.difficulty==='hard'?[4,7]:[];",
        "state.masked=state.difficulty==='hard'?buildHardMask(current()):[];")
    for old, new in (
        ("hardExplain:'罕见或古早首发、冷门球队与小联赛 · 更少线索'",
         "hardExplain:'豪门与经典历史阵容混合冷门球队 · 豪门/经典阵容隐藏 3 名球员'"),
        ("hardExplain:'Rare and vintage XIs, smaller clubs · Fewer clues'",
         "hardExplain:'Classic and famous XIs mixed with underdogs · Three clues hidden for iconic XIs'"),
        ("hardExplain:'Onces raros o históricos y equipos modestos · Menos pistas'",
         "hardExplain:'Onces clásicos y grandes mezclados con equipos modestos · Tres pistas ocultas en los clásicos'"),
    ):
        source = once(source, old, new)
    INDEX.write_text(source, encoding="utf-8")
    print(f"Hard mode upgraded. Imported {len(added)} fixtures: "+
          f"{sum(f['mode']=='club' for f in added)} club, "+
          f"{sum(f['mode']=='nation' for f in added)} national-team")

if __name__ == "__main__":
    main()
