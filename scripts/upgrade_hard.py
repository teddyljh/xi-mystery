#!/usr/bin/env python3
"""Upgrade the XI Mystery Hard question pool without changing source fixtures.

Idempotent: gallery synchronizations refresh these rules without changing fixtures.
"""
from __future__ import annotations
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

# League nationality is independent of the nationality mix in an XI.
NON_BIG_FIVE_NATIONS = {
    "benfica": "POR",
    "porto": "POR",
    "sporting": "POR",
    "ajax": "NED",
    "psv": "NED",
    "galatasaray": "TUR",
    "fenerbahce": "TUR",
    "celtic": "SCO",
    "brugge": "BEL",
    "bodoglimt": "NOR",
    "feyenoord": "NED",
    "copenhagen": "DEN",
    "olympiacos": "GRE",
    "shakhtar": "UKR",
    "crvenazvezda": "SRB",
    "qarabag": "AZE",
    "slavia": "CZE",
    "aek": "GRE",
    "youngboys": "CHE",
    "slovan": "SVK",
    "salzburg": "AUT",
    "sparta": "CZE",
    "sturm": "AUT",
    "pafos": "CYP",
    "kairat": "KAZ",
    "union-sg": "BEL",
    "viking": "NOR",
    "dinamo": "CRO",
    "inter-miami": "USA",
    "lac": "USA",
    "lagalaxy": "USA"
}

# The -medium copies share their original match's attacking clue.
FORWARD_PICKS = {
    "club-2026/27-3": "Viktor Gyökeres",
    "club-2026/27-4": "Désiré Doué",
    "club-2026/27-5": "Marcus Thuram",
    "nation-2026/27-10": "Lamine Yamal",
    "nation-2026/27-11": "Harry Kane",
    "club-2025/26-14": "Harry Kane",
    "club-2024/25-16": "Robert Lewandowski",
    "club-2026/27-20": "Bradley Barcola",
    "club-2026/27-21": "Serhou Guirassy",
    "club-2026/27-22": "André Silva",
    "club-2026/27-23": "Guus Til",
    "club-2026/27-25": "Romelu Lukaku",
    "club-2026/27-27": "Barış Alper Yılmaz",
    "club-2026/27-33": "Geny Catamo",
    "club-2025/26-36": "Estêvão",
    "club-2025/26-37": "Wout Weghorst",
    "club-2025/26-44": "Vangelis Pavlidis",
    "club-2025/26-46": "Rasmus Højlund",
    "club-2025/26-48": "Pedro Gonçalves",
    "club-2025/26-53": "Guus Til",
    "club-2024/25-60": "Antoine Griezmann",
    "club-2024/25-62": "Luuk de Jong",
    "club-2024/25-66": "Nicolas Kühn",
    "club-2024/25-69": "Rafael Leão",
    "club-2024/25-70": "Pedro Gonçalves",
    "club-2024/25-71": "Erling Haaland",
    "nation-2026/27-75": "Francesco Pio Esposito",
    "nation-2025/26-78": "Memphis Depay",
    "nation-2024/25-83": "Rafael Leão",
    "nation-2024/25-99": "Mateo Retegui",
    "nation-2025/26-106": "Francesco Pio Esposito",
    "historic-club-chelsea-2005-03-08-0": "Eidur Gudjohnsen",
    "historic-club-milan-2005-05-25-1": "Andriy Shevchenko",
    "historic-club-liverpool-2005-05-25-2": "Milan Baros",
    "historic-club-manunited-2008-05-21-3": "Cristiano Ronaldo",
    "historic-club-chelsea-2008-05-21-4": "Didier Drogba",
    "historic-club-barcelona-2011-05-28-5": "Lionel Messi",
    "historic-club-manunited-2011-05-28-6": "Javier Hernandez",
    "historic-club-inter-2010-05-22-7": "Samuel Eto’o",
    "historic-club-bayern-2010-05-22-8": "Arjen Robben",
    "historic-club-barcelona-2015-06-06-9": "Lionel Messi",
    "historic-club-juventus-2015-06-06-10": "Carlos Tevez",
    "historic-club-realmadrid-2014-05-24-11": "Gareth Bale",
    "historic-club-atletico-2014-05-24-12": "Diego Costa",
    "historic-club-psg-2020-08-23-13": "Kylian Mbappe",
    "historic-club-bayern-2020-08-23-14": "Robert Lewandowski",
    "historic-club-city-2023-06-10-15": "Erling Haaland",
    "historic-club-inter-2023-06-10-16": "Edin Dzeko",
    "historic-club-liverpool-2019-06-01-17": "Mohamed Salah",
    "historic-club-spurs-2019-06-01-18": "Son Heung-min",
    "historic-club-milan-2007-05-23-19": "Kaka",
    "historic-club-chelsea-2012-05-19-20": "Didier Drogba",
    "historic-club-dortmund-2013-05-25-21": "Robert Lewandowski",
    "historic-nation-ESP-2024-07-14-30": "Lamine Yamal",
    "historic-nation-ENG-2024-07-14-31": "Harry Kane",
    "historic-nation-ARG-2022-12-18-32": "Lionel Messi",
    "historic-nation-FRA-2022-12-18-33": "Kylian Mbappe",
    "historic-nation-FRA-2018-07-15-34": "Kylian Mbappe",
    "historic-nation-CRO-2018-07-15-35": "Mario Mandzukic",
    "historic-nation-GER-2014-07-13-36": "Miroslav Klose",
    "historic-nation-ARG-2014-07-13-37": "Lionel Messi",
    "historic-nation-ESP-2010-07-11-38": "David Villa",
    "historic-nation-NED-2010-07-11-39": "Arjen Robben",
    "historic-nation-ITA-2006-07-09-40": "Luca Toni",
    "historic-nation-FRA-2006-07-09-41": "Florent Malouda",
    "historic-nation-POR-2016-07-10-42": "Cristiano Ronaldo",
    "historic-nation-FRA-2016-07-10-43": "Antoine Griezmann",
    "historic-nation-BRA-2002-06-30-44": "Ronaldo",
    "historic-nation-GER-2002-06-30-45": "Miroslav Klose",
    "historic-nation-ESP-2012-07-01-46": "Andres Iniesta",
    "historic-nation-NED-2014-06-13-47": "Robin van Persie",
    "historic-nation-POR-2024-06-26-48": "Cristiano Ronaldo",
    "historic-club-bayern-2012-05-19-22": "Arjen Robben",
    "historic-club-liverpool-2007-05-23-23": "Dirk Kuyt",
    "historic-club-porto-2004-05-26-24": "Deco",
    "historic-club-juventus-2017-06-03-26": "Mario Mandzukic",
    "historic-club-atletico-2016-05-28-27": "Antoine Griezmann",
    "historic-club-barcelona-2005-03-08-28": "Ronaldinho",
    "historic-club-bayern-2013-05-25-29": "Franck Ribery",
    "classic-ucl-final-2002-realmadrid": "Luís Figo",
    "classic-ucl-final-2003-juventus": "David Trezeguet",
    "classic-ucl-final-2003-milan": "Andriy Shevchenko",
    "classic-ucl-final-2006-barcelona": "Samuel Eto'o",
    "classic-ucl-final-2006-arsenal": "Aleksandr Hleb",
    "classic-ucl-final-2009-barcelona": "Lionel Messi",
    "classic-ucl-final-2009-manunited": "Park Ji-Sung",
    "classic-ucl-final-2016-realmadrid": "Gareth Bale",
    "classic-ucl-final-2017-realmadrid": "Cristiano Ronaldo",
    "classic-ucl-final-2018-realmadrid": "Cristiano Ronaldo",
    "classic-ucl-final-2018-liverpool": "Mohamed Salah",
    "classic-ucl-final-2021-city": "Riyad Mahrez",
    "classic-ucl-final-2021-chelsea": "Kai Havertz",
    "classic-ucl-final-2022-liverpool": "Mohamed Salah",
    "classic-ucl-final-2022-realmadrid": "Federico Valverde",
    "classic-ucl-final-2024-dortmund": "Jadon Sancho",
    "classic-ucl-final-2024-realmadrid": "Jude Bellingham",
    "classic-ucl-final-2025-psg": "Khvicha Kvaratskhelia",
    "classic-ucl-final-2025-inter": "Lautaro Martínez",
    "classic-ucl-final-2026-psg": "Khvicha Kvaratskhelia",
    "classic-ucl-final-2026-arsenal": "Martin Ødegaard",
    "classic-euro-final-2004-POR": "Cristiano Ronaldo",
    "classic-euro-final-2008-ESP": "Fernando Torres",
    "classic-euro-final-2008-GER": "Michael Ballack",
    "classic-euro-final-2012-ITA": "Mario Balotelli",
    "classic-euro-final-2021-ENG": "Harry Kane",
    "classic-euro-final-2021-ITA": "Ciro Immobile",
    "classic-world-cup-final-2026-ARG": "Lionel Messi",
    "classic-world-cup-final-2026-ESP": "Lamine Yamal",
    "mls-stars-2023-08-19-inter-miami": "Lionel Messi",
    "mls-stars-2025-11-02-lac": "Son Heung-Min",
    "mls-stars-2012-12-01-lagalaxy": "Landon Donovan"
}

# User-approved Easy recognition boundary. Applies to every era of a team.
EASY_FAMOUS_CLUBS = set('realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund spurs napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic villa brugge athletic'.split())
EASY_FAMOUS_NATIONS = set('ENG FRA GER ESP POR BRA ARG ITA NED BEL CRO URU NOR POL SWE GRE TUR CHE'.split())

RULES = r"""
  // Hard includes every historical XI from Easy/Moderate and prominent
  // teams from Moderate. The original fixture tiers remain unchanged.
  const HARD_FAMOUS_CLUBS=new Set('realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic'.split(' '));
  const HARD_FAMOUS_NATIONS=new Set('ENG FRA GER ESP POR BRA ARG ITA NED'.split(' '));
  const EASY_RESTORED_CLUBS=new Set('villa brugge athletic'.split(' '));
  const EASY_RESTORED_NATIONS=new Set('NOR POL SWE GRE TUR CHE'.split(' '));
  const isRestoredEasyTeam=f=>(f.mode==='club'?EASY_RESTORED_CLUBS:EASY_RESTORED_NATIONS).has(f.team);
  const EASY_FAMOUS_CLUBS=new Set([...HARD_FAMOUS_CLUBS,'spurs',...EASY_RESTORED_CLUBS]);
  const EASY_FAMOUS_NATIONS=new Set([...HARD_FAMOUS_NATIONS,'BEL','CRO','URU',...EASY_RESTORED_NATIONS]);
  const easyFixtureAllowed=f=>(f.mode==='club'?EASY_FAMOUS_CLUBS:EASY_FAMOUS_NATIONS).has(f.team);
  function isImportedHardFixture(f){
    if(f.id.startsWith('mls-stars-'))return true;
    // New underdog classics retain the legacy two-clue policy.
    if(f.id.startsWith('classic-ucl-final-')&&!EASY_FAMOUS_CLUBS.has(f.team))return false;
    const historical=f.id.startsWith('historic-')||f.date<'2024-01-01';
    if(historical && (f.tier==='easy'||f.tier==='moderate'))return true;
    return f.tier==='moderate'&&(f.mode==='club'?HARD_FAMOUS_CLUBS.has(f.team):HARD_FAMOUS_NATIONS.has(f.team));
  }
  function fixtureIdentity(f){
    return JSON.stringify([f.mode,f.team,f.date,f.formation,f.players.map(p=>[p.name,p.role,p.value])]);
  }
  // Finals reuse existing source XIs by ID. The base archive still owns the
  // frequency heuristic, preserving previously reviewed hidden selections.
  function resolveFinalFixtures(entries){return (entries||[]).map(entry=>{
    if(typeof entry!=='string')return entry;
    const fixture=DATA.fixtures.find(f=>f.id===entry);
    if(!fixture)throw Error('Missing final fixture: '+entry);
    return fixture;
  });}
  const UCL_FINAL_FIXTURES=resolveFinalFixtures(DATA.uclFinals);
  const NATIONAL_FINAL_FIXTURES=resolveFinalFixtures(DATA.nationalFinals);
  const CLASSIC_FINAL_FIXTURES=[...UCL_FINAL_FIXTURES,...NATIONAL_FINAL_FIXTURES];
  const MLS_STAR_FIXTURES=resolveFinalFixtures(DATA.mlsStars);
  function uniqueFixtures(fixtures){
    const seen=new Set();
    return fixtures.filter(f=>{const key=fixtureIdentity(f);if(seen.has(key))return false;seen.add(key);return true;});
  }
  const FORMER_EASY_FIXTURES=uniqueFixtures([...DATA.fixtures.filter(f=>f.tier==='easy'),...DATA.fixtures.filter(f=>f.tier==='moderate'),...CLASSIC_FINAL_FIXTURES]);
  const EASY_REMOVED_FIXTURES=FORMER_EASY_FIXTURES.filter(f=>!easyFixtureAllowed(f));
  const EASY_FIXTURES=FORMER_EASY_FIXTURES.filter(easyFixtureAllowed);
  // Restoring Easy eligibility must not remove previously promoted XIs from
  // Medium/Hard. MLS additions are exclusive to these two higher difficulties.
  const HIGHER_DIFFICULTY_FIXTURES=FORMER_EASY_FIXTURES.filter(f=>!easyFixtureAllowed(f)||isRestoredEasyTeam(f));
  const MODERATE_FIXTURES=uniqueFixtures([...DATA.fixtures.filter(f=>f.tier==='moderate'),...CLASSIC_FINAL_FIXTURES,...HIGHER_DIFFICULTY_FIXTURES,...MLS_STAR_FIXTURES]);
  const HARD_FIXTURES=uniqueFixtures([...DATA.fixtures.filter(f=>f.tier==='hard'||isImportedHardFixture(f)),...CLASSIC_FINAL_FIXTURES,...HIGHER_DIFFICULTY_FIXTURES,...MLS_STAR_FIXTURES]);
  const quizFixtureCount=()=>new Set([...DATA.fixtures,...CLASSIC_FINAL_FIXTURES,...MLS_STAR_FIXTURES].map(f=>f.id)).size;
  function available(){
    if(state.difficulty==='easy')return EASY_FIXTURES.filter(f=>f.mode===state.mode);
    if(state.difficulty==='moderate')return MODERATE_FIXTURES.filter(f=>f.mode===state.mode);
    return HARD_FIXTURES.filter(f=>f.mode===state.mode);
  }

  // Imported classics/powerhouses and historical powerhouse clubs use three
  // hidden clues. Other XIs keep [4,7] unless the league policy below applies.
  // This mask policy does not change eligibility or the existing session mix.
  function isFeaturedHardFixture(f){
    const historical=f.id.startsWith('historic-')||f.date<'2024-01-01';
    return isImportedHardFixture(f)||(historical&&f.mode==='club'&&HARD_FAMOUS_CLUBS.has(f.team));
  }
  const HARD_FORWARD_ROLES=new Set(['ST','LS','RS','LW','RW']);
  const HARD_ATTACKING_ROLES=new Set([...HARD_FORWARD_ROLES,'AM','LM','RM']);
  const HARD_MIDFIELD_ROLES=new Set(['AM','CM','DM','LM','RM']);
  const HARD_DEFENDER_ROLES=new Set(['LB','CB','RB','LWB','RWB']);
  // League nationality is explicit, never inferred from the current XI.
  // Includes underdog clubs; national teams never use this policy.
  const HARD_NON_BIG_FIVE_NATIONS=Object.freeze(__HARD_NON_BIG_FIVE_NATIONS__);
  const hardLeagueNation=f=>f.mode==='club'?HARD_NON_BIG_FIVE_NATIONS[f.team]:undefined;
  const hardName=n=>n.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  // Shared by the easy/moderate copies of each historical match. Names allow
  // iconic attackers listed as AM/LM/RM (e.g. Ronaldo in 2008) to stay hidden.
  const HARD_FORWARD_PICKS=Object.freeze(__HARD_FORWARD_PICKS__);
  const HARD_KNOWN_FORWARDS=new Set(Object.values(HARD_FORWARD_PICKS).map(hardName));
  // Curated match-specific masks. Their order also specifies the hint order
  // for top-tier nations; middle-band nations still prefer overseas clues.
  const HARD_NATION_MASK_OVERRIDES=Object.freeze({
    'classic-world-cup-final-2026-ESP':['Dani Olmo','Pau Cubarsí','Lamine Yamal'],
    'historic-nation-ESP-2024-07-14-30':['Nico Williams','Robin Le Normand','Lamine Yamal'],
    'nation-2026/27-10':['Pau Cubarsí','Aymeric Laporte','Lamine Yamal'],
    'historic-nation-NED-2014-06-13-47':['Robin van Persie','Wesley Sneijder','Daley Blind','Bruno Martins Indi','Stefan de Vrij'],
    'nation-2026/27-12':['Kevin De Bruyne','Jérémy Doku','Brandon Mechele'],
    'nation-2025/26-106':['Gianluigi Donnarumma','Francesco Pio Esposito','Federico Dimarco','Nicolò Barella'],
    'nation-2026/27-75':['Gianluigi Donnarumma','Francesco Pio Esposito','Nicolò Fagioli','Alessandro Bastoni']
  });
  function hardNationMaskOverride(f){
    if(f.mode!=='nation')return null;
    const names=HARD_NATION_MASK_OVERRIDES[f.id.replace(/-medium$/,'')];
    if(!names)return null;
    const mask=names.map(name=>f.players.findIndex(p=>hardName(p.name)===hardName(name)));
    if(mask.includes(-1))throw Error('Missing curated national-team player: '+f.id);
    return mask;
  }
  // The existing two middle recognition bands. Top-nine and low-recognition
  // national teams keep their previous rules; club questions are unaffected.
  const HARD_MEDIUM_NATIONS=new Set('BEL CRO URU DEN CHE COL MAR SEN JPN KOR USA MEX TUR NOR SWE AUT POL UKR SRB CZE SCO WAL RUS GRE ECU NGA CIV DZA CAN IRL HUN SVN BIH ROU SVK'.split(' '));
  const HARD_NATION_HOME_CLUB_COUNTRIES=Object.freeze({
    ...HARD_NON_BIG_FIVE_NATIONS,
    gent:'BEL',anderlecht:'BEL',standardliege:'BEL',
    dinamo:'CRO',sion:'CHE',basel:'CHE',zurich:'CHE',winterthur:'CHE',
    aberdeen:'SCO',rosenborg:'NOR',ferencvaros:'HUN',
    polissya:'UKR',dynamokyiv:'UKR',craiova:'ROU',dinamobucharest:'ROU',
    fctokyo:'JPN',urawa:'JPN',shimizu:'JPN',gamba:'JPN',
    jeonbuk:'KOR',ulsan:'KOR',gwangju:'KOR',wydad:'MAR',
    panathinaikos:'GRE',ofi:'GRE',brann:'NOR',lask:'AUT',aik:'SWE',malmo:'SWE',
    celje:'SVN',maribor:'SVN',plzen:'CZE',jablonec:'CZE',teplice:'CZE',
    widzew:'POL',zaglebielubin:'POL',hibernian:'SCO',hearts:'SCO',voyvodina:'SRB'
  });
  const HARD_NATION_KEY_PLAYERS=Object.freeze({
    BEL:'Kevin De Bruyne|Romelu Lukaku|Jérémy Doku|Youri Tielemans',
    CRO:'Luka Modric|Joško Gvardiol|Mateo Kovacic|Ivan Rakitic|Mario Mandzukic',
    CHE:'Granit Xhaka|Manuel Akanji|Ardon Jashari|Remo Freuler|Yann Sommer',
    SCO:'Scott McTominay|Andrew Robertson|John McGinn|Kieran Tierney',
    POL:'Robert Lewandowski|Piotr Zielinski',
    HUN:'Dominik Szoboszlai|Milos Kerkez',
    BIH:'Edin Dzeko|Ermedin Demirovic|Amar Dedic|Haris Tabakovic|Esmir Bajraktarevic',
    UKR:'Oleksandr Zinchenko|Mykhailo Mudryk|Illia Zabarnyi|Roman Yaremchuk',
    IRL:'Caoimhin Kelleher|Nathan Collins|Seamus Coleman|Troy Parrott',
    WAL:'Gareth Bale|Aaron Ramsey|Harry Wilson|Brennan Johnson|Dan James|Ben Davies',
    SRB:'Dusan Vlahovic|Aleksandar Mitrovic|Sergej Milinkovic-Savic|Luka Jovic|Nikola Milenkovic',
    SVK:'Stanislav Lobotka|Milan Skriniar|David Hancko',
    ROU:'Ianis Hagi|Radu Dragusin|Dennis Man',
    MAR:'Achraf Hakimi|Hakim Ziyech|Youssef En-Nesyri',
    JPN:'Takefusa Kubo|Kaoru Mitoma|Wataru Endo|Daichi Kamada',
    KOR:'Son Heung-min|Kim Min-jae|Lee Kang-in',
    NOR:'Erling Haaland|Martin Ødegaard|Alexander Sørloth|Antonio Nusa',
    AUT:'David Alaba|Marcel Sabitzer|Marko Arnautović|Konrad Laimer|Christoph Baumgartner',
    SWE:'Alexander Isak|Viktor Gyökeres|Dejan Kulusevski|Emil Forsberg',
    DEN:'Christian Eriksen|Rasmus Højlund|Mikkel Damsgaard|Pierre-Emile Højbjerg|Morten Hjulmand',
    SVN:'Benjamin Šeško|Jan Oblak|Jaka Bijol|Sandi Lovrić',
    CZE:'Patrik Schick|Tomáš Souček|Vladimír Coufal|Antonín Kinský|Adam Hložek',
    TUR:'Arda Güler|Hakan Çalhanoğlu|Kenan Yıldız|Kerem Aktürkoğlu',
    GRE:'Angelos Charisteas|Theodoros Zagorakis|Giorgos Karagounis|Vangelis Pavlidis|Fotis Ioannidis|Kostas Tsimikas|Konstantinos Mavropanos'
  });
  const usesNationHardMask=f=>f.mode==='nation'&&HARD_MEDIUM_NATIONS.has(f.team);
  function hardNationDomesticSlots(f){
    if(!usesNationHardMask(f))return [];
    return f.players.map((_,i)=>i).filter(i=>HARD_NATION_HOME_CLUB_COUNTRIES[f.players[i].value]===f.team);
  }
  function hardNationHiddenSlots(f){
    if(!usesNationHardMask(f))return [];
    const override=hardNationMaskOverride(f);
    if(override)return override;
    const domestic=hardNationDomesticSlots(f),locked=new Set(domestic);
    // Select only domestic-club and identifying player clues for the initial
    // mask. Add a key star when up to four domestic clues exist; do not add
    // separate masked players just to support hints.
    const target=Math.max(2,domestic.length+(domestic.length<5?1:0));
    const previous=HARD_FORWARD_PICKS[f.id.replace(/-medium$/,'')];
    const names=[...(previous?[previous]:[]),...(HARD_NATION_KEY_PLAYERS[f.team]||'').split('|')];
    for(const name of names){
      if(locked.size>=target)break;
      const i=f.players.findIndex(p=>hardName(p.name)===hardName(name));
      if(i!==-1)locked.add(i);
    }
    const fallback=f.players.map((_,i)=>i).sort((a,b)=>
      Number(HARD_NOTABLE.has(hardName(f.players[b].name)))-Number(HARD_NOTABLE.has(hardName(f.players[a].name)))||
      (HARD_PLAYER_FREQUENCY.get(hardName(f.players[b].name))||0)-(HARD_PLAYER_FREQUENCY.get(hardName(f.players[a].name))||0)||a-b);
    for(const i of fallback){if(locked.size>=target)break;locked.add(i);}
    return [...locked];
  }
  function buildNationHardMask(f){
    return hardNationHiddenSlots(f);
  }
  function hardAttackerSlots(f){
    return f.players.map((_,i)=>i).filter(i=>HARD_FORWARD_ROLES.has(f.players[i].role)||
      (HARD_ATTACKING_ROLES.has(f.players[i].role)&&HARD_KNOWN_FORWARDS.has(hardName(f.players[i].name))));
  }
  function usesLeagueHardMask(f){
    const nation=hardLeagueNation(f);
    if(!nation)return false;
    const attackers=hardAttackerSlots(f);
    if(!attackers.length)return false;
    const hasDomesticForward=attackers.some(i=>f.players[i].value===nation);
    const domestic=f.players.filter(p=>p.value===nation).length;
    // If the designated forward is domestic, two OTHER domestic clues must
    // remain. Infeasible XIs retain their entire previous masking policy.
    return domestic-(hasDomesticForward?1:0)>=2;
  }
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
  function selectHardForward(f){
    const attackers=hardAttackerSlots(f);
    const clueCount=i=>f.players.filter(p=>p.value===f.players[i].value).length;
    const leagueNation=hardLeagueNation(f);
    let eligible=attackers;
    if(leagueNation&&usesLeagueHardMask(f)){
      const domestic=attackers.filter(i=>f.players[i].value===leagueNation);
      if(domestic.length)eligible=domestic;
      else{
        const rarest=Math.min(...attackers.map(clueCount));
        eligible=attackers.filter(i=>clueCount(i)===rarest);
      }
    }
    const preferred=HARD_FORWARD_PICKS[f.id.replace(/-medium$/,'')];
    if(preferred){
      const i=eligible.find(i=>hardName(f.players[i].name)===hardName(preferred));
      if(i!==undefined)return i;
    }
    // Future XIs: prioritize known attackers, then a rare nationality/club
    // clue, then recognition within the archive. Never pick a random forward.
    const known=eligible.filter(i=>HARD_KNOWN_FORWARDS.has(hardName(f.players[i].name)));
    const pool=known.length?known:eligible;
    return pool.sort((a,b)=>clueCount(a)-clueCount(b)||
      (HARD_PLAYER_FREQUENCY.get(hardName(f.players[b].name))||0)-(HARD_PLAYER_FREQUENCY.get(hardName(f.players[a].name))||0)||a-b)[0];
  }
  function buildLeagueHardMask(f,striker,leagueNation){
    const rest=f.players.map((_,i)=>i).filter(i=>i!==striker);
    const regular=i=>HARD_MIDFIELD_ROLES.has(f.players[i].role)||HARD_DEFENDER_ROLES.has(f.players[i].role);
    const rank=pair=>[
      pair.filter(i=>f.players[i].value===leagueNation).length,
      pair.filter(regular).length,
      Number(pair.some(i=>HARD_MIDFIELD_ROLES.has(f.players[i].role))&&pair.some(i=>HARD_DEFENDER_ROLES.has(f.players[i].role))),
      pair.filter(i=>!HARD_FORWARD_ROLES.has(f.players[i].role)).length,
      pair.filter(i=>HARD_NOTABLE.has(hardName(f.players[i].name))).length,
      pair.reduce((sum,i)=>sum+(HARD_PLAYER_FREQUENCY.get(hardName(f.players[i].name))||0),0)
    ];
    const compare=(a,b)=>{
      for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];
      return 0;
    };
    let bestRank=null,pairs=[];
    for(let a=0;a<rest.length;a++)for(let b=a+1;b<rest.length;b++){
      const pair=[rest[a],rest[b]],score=rank(pair);
      const comparison=bestRank?compare(score,bestRank):1;
      if(comparison>0){bestRank=score;pairs=[pair];}
      else if(comparison===0)pairs.push(pair);
    }
    if(!pairs.length)throw Error('Invalid league XI: '+f.id);
    // Hide two domestic clues first, then favor midfield/defense. A keeper or
    // second attacker is allowed only when domestic coverage requires it.
    // Only the designated attacker is protected from hints.
    const pair=pairs[Math.floor(Math.random()*pairs.length)];
    const hintOrder=i=>HARD_MIDFIELD_ROLES.has(f.players[i].role)?0:
      HARD_DEFENDER_ROLES.has(f.players[i].role)?1:f.players[i].role==='GK'?2:3;
    pair.sort((a,b)=>hintOrder(a)-hintOrder(b)||a-b);
    return [...pair,striker];
  }
  function buildHardMask(f){
    const override=hardNationMaskOverride(f);
    if(override)return override;
    if(usesNationHardMask(f))return buildNationHardMask(f);
    if(usesLeagueHardMask(f))return buildLeagueHardMask(f,selectHardForward(f),hardLeagueNation(f));
    if(!isFeaturedHardFixture(f))return [4,7];
    const slots=f.players.map((_,i)=>i);
    const striker=selectHardForward(f);
    const midfielders=slots.filter(i=>i!==striker&&HARD_MIDFIELD_ROLES.has(f.players[i].role));
    const defenders=slots.filter(i=>HARD_DEFENDER_ROLES.has(f.players[i].role));
    if(striker===undefined||!midfielders.length||!defenders.length)throw Error('Invalid featured XI: '+f.id);
    const midfielder=selectNotableMidDef(f,midfielders);
    const defender=selectNotableMidDef(f,defenders);
    // getHint consumes this queue from the front, with a two-hint limit.
    // The protected attacker therefore stays hidden until the answer reveal.
    return [midfielder,defender,striker];
  }
""".replace("__HARD_FORWARD_PICKS__", json.dumps(FORWARD_PICKS, ensure_ascii=False, indent=4)).replace(
    "__HARD_NON_BIG_FIVE_NATIONS__", json.dumps(NON_BIG_FIVE_NATIONS, ensure_ascii=False, indent=4))

HINT_HANDLER = r"""  function getHint(){
    if(state.revealed||state.hints>=2)return;
    const f=current();
    const restoreNationClues=state.difficulty==='hard'&&usesNationHardMask(f);
    const overseasIndex=restoreNationClues?state.masked.findIndex(i=>HARD_NATION_HOME_CLUB_COUNTRIES[f.players[i].value]!==f.team):-1;
    const hintIndex=overseasIndex!==-1?overseasIndex:state.masked.length?0:-1;
    if(restoreNationClues&&hintIndex===-1)return;
    if(hintIndex!==-1){state.masked.splice(hintIndex,1);state.hints++;$('feedback').textContent=tr('uncovered');}
    else if(!state.choicesShown){state.choicesShown=true;state.hints++;$('feedback').textContent=tr('showOptions');}
    else if(state.difficulty==='easy'&&state.hints===0){state.removed=state.choices.filter(x=>x!==f.team).slice(0,2);state.hints++;$('feedback').textContent=tr('easyHint');}
    else if(!state.removed.length){state.removed=state.choices.filter(x=>x!==f.team).slice(0,2);state.hints++;$('feedback').textContent=tr('easyHint');}
    else return;
    renderGame();
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
    original = source
    data_marker = "window.LINEUP_DATA = "
    data_text = source.split(data_marker, 1)[1].split(";\n", 1)[0]
    fixtures = json.loads(data_text)["fixtures"]
    historical = lambda f: f["id"].startswith("historic-") or f["date"] < "2024-01-01"
    clubs = set("realmadrid barcelona bayern city liverpool manunited arsenal chelsea psg inter milan juventus atletico dortmund napoli benfica porto sporting ajax psv galatasaray fenerbahce celtic".split())
    nations = set("ENG FRA GER ESP POR BRA ARG ITA NED".split())
    added = [f for f in fixtures if (historical(f) and f["tier"] in ("easy", "moderate")) or
             (f["tier"] == "moderate" and (f["team"] in (clubs if f["mode"]=="club" else nations)))]
    featured = [f for f in fixtures if f in added or
                (historical(f) and f["mode"] == "club" and f["team"] in clubs)]
    forward = {"ST", "LS", "RS", "LW", "RW", "AM", "LM", "RM"}
    midfield = {"AM", "CM", "DM", "LM", "RM"}
    defense = {"LB", "CB", "RB", "LWB", "RWB"}
    for f in featured:
        preferred = FORWARD_PICKS.get(f["id"].removesuffix("-medium"))
        if preferred and not any(p["name"] == preferred and p["role"] in forward for p in f["players"]):
            raise ValueError("Missing selected attacker in: " + f["id"])
        if (not any(p["role"] in forward for p in f["players"]) or
                not any(p["role"] in midfield and p["name"] != preferred for p in f["players"]) or
                not any(p["role"] in defense for p in f["players"])):
            raise ValueError("Cannot mask target positions in: " + f["id"])

    for old, new in (
        ("罕见或古早首发、冷门球队与小联赛 · 更少线索", "豪门、经典与冷门阵容 · 隐藏更有辨识度的线索"),
        ("豪门与经典历史阵容混合冷门球队 · 豪门/经典阵容隐藏 3 名球员", "豪门、经典与冷门阵容 · 隐藏更有辨识度的线索"),
        ("Rare and vintage XIs, smaller clubs · Fewer clues", "Powerhouse, classic and underdog XIs · More identifying clues hidden"),
        ("Classic and famous XIs mixed with underdogs · Three clues hidden for iconic XIs", "Powerhouse, classic and underdog XIs · More identifying clues hidden"),
        ("Onces raros o históricos y equipos modestos · Menos pistas", "Onces clásicos, grandes y modestos · Más pistas reveladoras ocultas"),
        ("Onces clásicos y grandes mezclados con equipos modestos · Tres pistas ocultas en los clásicos", "Onces clásicos, grandes y modestos · Más pistas reveladoras ocultas"),
    ):
        source = source.replace(old, new)

    hint_start = source.index("  function getHint(){")
    hint_end = source.index("  function next(){", hint_start)
    source = source[:hint_start] + HINT_HANDLER + source[hint_end:]

    if "function isImportedHardFixture(f)" in source:
        start = source.index("  // Hard includes every historical XI")
        end = source.index("  // Shuffle-bag rotation", start)
        updated = source[:start] + RULES.strip("\n") + "\n\n" + source[end:]
        if updated != original:
            INDEX.write_text(updated, encoding="utf-8")
        print(f"Hard rules synchronized: {len(featured)} featured fixtures; non-big-five clubs use nationality rules when feasible")
        return

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
    INDEX.write_text(source, encoding="utf-8")
    print(f"Hard mode upgraded. Imported {len(added)} fixtures: "+
          f"{sum(f['mode']=='club' for f in added)} club, "+
          f"{sum(f['mode']=='nation' for f in added)} national-team")

if __name__ == "__main__":
    main()
