// Easy multiple choice: one same-league club plus two comparable foreign clubs.
// These explicit country-league maps also serve Moderate hint choices.
const EASY_CLUB_LEAGUES={
  england:'city arsenal liverpool chelsea manunited spurs newcastle villa westham brighton',
  spain:'realmadrid barcelona atletico athletic sevilla villarreal realbetis valencia girona',
  germany:'bayern dortmund leverkusen leipzig stuttgart frankfurt wolfsburg',
  italy:'inter milan juventus atalanta napoli roma lazio fiorentina bologna como',
  france:'psg marseille lyon monaco lille nice lens reims',
  turkey:'galatasaray fenerbahce besiktas',
  portugal:'benfica porto sporting braga',
  netherlands:'ajax psv feyenoord alkmaar',
  scotland:'celtic rangers',
  belgium:'brugge anderlecht union-sg',
  austria:'salzburg sturm',
  greece:'olympiacos aek paok',
  switzerland:'basel youngboys',
  ukraine:'shakhtar dynamokyiv',
  croatia:'dinamo hajduk rijeka'
};
const EASY_CLUB_LEAGUE_BY_KEY={};
for(const [league,keys] of Object.entries(EASY_CLUB_LEAGUES)){
  for(const key of keys.split(' ')){
    if(DATA.teams[key])EASY_CLUB_LEAGUE_BY_KEY[key]=league;
  }
}
// Broad game-design strength bands, rather than exact rankings. Both foreign
// distractors must share the answer's band and come from distinct countries.
const EASY_CLUB_LEVELS=[
  'realmadrid barcelona bayern city liverpool arsenal chelsea psg inter',
  'manunited milan juventus atletico dortmund leverkusen spurs newcastle villa napoli roma atalanta marseille lyon monaco leipzig galatasaray fenerbahce benfica porto sporting ajax psv',
  'athletic sevilla villarreal realbetis valencia stuttgart frankfurt westham brighton lille nice lens fiorentina lazio bologna girona wolfsburg feyenoord braga celtic rangers brugge anderlecht salzburg olympiacos dinamo',
  'besiktas como reims alkmaar youngboys basel shakhtar union-sg sturm aek paok dynamokyiv hajduk rijeka'
].map(keys=>keys.split(' '));
const EASY_CLUB_LEVEL_BY_KEY={};
EASY_CLUB_LEVELS.forEach((group,i)=>group.forEach(key=>EASY_CLUB_LEVEL_BY_KEY[key]=i));

// Keep the original recognition bands available to existing Hard policies.
// Easy choices use the era profiles below, independently of Hard masking.
const EASY_NATION_LEVELS=[
  'ENG FRA GER ESP POR BRA ARG ITA NED',
  'BEL CRO URU DEN CHE COL MAR SEN JPN KOR USA MEX TUR',
  'NOR SWE AUT POL UKR SRB CZE SCO WAL RUS GRE ECU NGA CIV DZA CAN IRL HUN SVN BIH ROU SVK',
  'UZB GEO EGY FIN ISR ALB ISL NZL KAZ GHA TUN PAN CRC KSA AUS ZAF LUX NIR'
].map(keys=>keys.split(' '));
const EASY_NATION_LEVEL_BY_KEY={};
EASY_NATION_LEVELS.forEach((group,i)=>group.forEach(key=>EASY_NATION_LEVEL_BY_KEY[key]=i));

// Reviewed broad strength profiles for the question's era, informed by the
// contemporary World Cup/Euro results. They are gameplay judgments, not FIFA
// ranking claims. Unlisted teams retain a middle/lower recognition band.
const EASY_NATION_ERAS=[
  [2004,'BRA FRA ESP GER ARG NED ENG ITA','POR MEX TUR USA DEN IRL CZE CMR BEL SEN KOR SWE CRO'],
  [2008,'BRA ARG ITA FRA GER ESP ENG NED POR','CZE CRO SWE MEX USA DEN CHE UKR RUS TUR GHA CIV'],
  [2012,'ESP NED GER BRA ARG URU ITA POR ENG','FRA CRO RUS CZE CHE DEN MEX USA CHI GHA CIV JPN KOR GRE'],
  [2014,'GER ARG NED BRA ESP COL BEL FRA POR URU','ITA ENG CRO CHE MEX USA CHI CRC GRE ECU CIV NGA'],
  [2018,'FRA BEL CRO BRA ENG POR ESP ARG GER','NED ITA URU COL CHE DEN MEX SWE RUS WAL POL SEN JPN KOR'],
  [2022,'ARG FRA BRA ENG ESP POR NED BEL CRO','GER ITA URU COL CHE DEN MAR SEN JPN KOR USA MEX IRN ECU'],
  [Infinity,'ARG FRA ESP ENG BRA POR NED GER ITA','BEL CRO MAR COL URU MEX USA JPN CHE SEN DEN KOR AUT ECU TUR IRN']
].map(([through,top,next])=>({through,levels:[top.split(' '),next.split(' ')]}));
const EASY_NATION_CHOICE_KEYS=new Set([...EASY_NATION_LEVELS.flat(),...EASY_NATION_ERAS.flatMap(era=>era.levels.flat())]);
function easyNationLevel(f,key){
  const year=Number((f.date||'').slice(0,4));
  const era=EASY_NATION_ERAS.find(era=>year<=era.through)||EASY_NATION_ERAS[EASY_NATION_ERAS.length-1];
  for(let i=0;i<era.levels.length;i++)if(era.levels[i].includes(key))return i;
  return Math.max(2,EASY_NATION_LEVEL_BY_KEY[key]??3);
}

function randomPick(arr){return arr[Math.floor(Math.random()*arr.length)];}
function buildChoices(f){
  const group=f.mode==='club'?DATA.teams:DATA.nations;
  const options=Object.keys(group).filter(key=>key!==f.team);
  // Preserve Hard's original random, unused-until-needed choice generation.
  if(state.difficulty==='hard')return shuffle([f.team,...shuffle(options).slice(0,3)]);

  if(f.mode==='club'){
    const league=EASY_CLUB_LEAGUE_BY_KEY[f.team],level=EASY_CLUB_LEVEL_BY_KEY[f.team];
    if(!league||level===undefined)throw Error('Missing Easy club classification: '+f.team);
    const domestic=options.filter(key=>EASY_CLUB_LEAGUE_BY_KEY[key]===league&&EASY_CLUB_LEVEL_BY_KEY[key]!==undefined);
    if(!domestic.length)throw Error('Missing same-league distractor: '+f.team);
    const distance=Math.min(...domestic.map(key=>Math.abs(EASY_CLUB_LEVEL_BY_KEY[key]-level)));
    const same=randomPick(domestic.filter(key=>Math.abs(EASY_CLUB_LEVEL_BY_KEY[key]-level)===distance));
    const foreign=options.filter(key=>EASY_CLUB_LEAGUE_BY_KEY[key]&&EASY_CLUB_LEAGUE_BY_KEY[key]!==league&&EASY_CLUB_LEVEL_BY_KEY[key]===level);
    const first=randomPick(foreign);
    const second=randomPick(foreign.filter(key=>EASY_CLUB_LEAGUE_BY_KEY[key]!==EASY_CLUB_LEAGUE_BY_KEY[first]));
    if(!first||!second)throw Error('Missing comparable foreign-league distractors: '+f.team);
    return shuffle([f.team,same,first,second]);
  }

  const level=easyNationLevel(f,f.team);
  const nationalOptions=options.filter(key=>EASY_NATION_CHOICE_KEYS.has(key));
  const peers=nationalOptions.filter(key=>easyNationLevel(f,key)===level);
  if(peers.length<2)throw Error('Missing contemporary national-team peers: '+f.team);
  const first=randomPick(peers),second=randomPick(peers.filter(key=>key!==first));
  const otherLevels=[0,1,2,3].filter(other=>other!==level&&nationalOptions.some(key=>easyNationLevel(f,key)===other));
  const distance=Math.min(...otherLevels.map(other=>Math.abs(other-level)));
  const otherLevel=randomPick(otherLevels.filter(other=>Math.abs(other-level)===distance));
  const different=randomPick(nationalOptions.filter(key=>easyNationLevel(f,key)===otherLevel));
  if(!different)throw Error('Missing different-level national-team distractor: '+f.team);
  return shuffle([f.team,first,second,different]);
}
