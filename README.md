# XI Mystery — GitHub Pages

This repository contains the public XI Mystery football lineup quiz, v3.9.


Public URL: https://teddyljh.github.io/xi-mystery/

## Difficulty curation 2026-11-22

All 50 Champions League final XIs (2002–2026) and all 26 World Cup/EURO final XIs in that period now appear exactly once in Medium and Hard. Easy retains 48 club-final and all 26 national-final XIs under the approved recognition boundary. Existing XIs are reused; the 22 supplemental club and nine supplemental national XIs remain outside the base archive so they do not change the frequency heuristic used by previously reviewed Hard masks.

Easy keeps Real Madrid, Barcelona, Bayern, Manchester City, Liverpool, Manchester United, Arsenal, Chelsea, PSG, Inter, Milan, Juventus, Atlético, Dortmund, Tottenham, Napoli, Benfica, Porto, Sporting, Ajax, PSV, Galatasaray, Fenerbahçe, Celtic, Aston Villa, Club Brugge and Athletic Club. Its national boundary is England, France, Germany, Spain, Portugal, Brazil, Argentina, Italy, Netherlands, Belgium, Croatia, Uruguay, Norway, Poland, Sweden, Greece, Turkey and Switzerland. This boundary applies to every era. All 31 currently excluded Easy XIs remain in both higher difficulties; Stuttgart was already outside Easy.

| Pool | Club XIs | National XIs | Total |
|---|---:|---:|---:|
| Easy | 98 | 69 | 167 |
| Medium | 92 | 73 | 165 |
| Hard | 125 | 109 | 234 |

Hard gains 82 distinct XIs compared with revision `fc20d03`, and duplicate historical difficulty copies are merged. The generated [difficulty review](docs/difficulty-update-2026-11-22.md) lists all Easy removals and every Hard addition, its initial hidden clues and both hints, including random alternatives. The [national-team Hard review](docs/hard-national-team-masks.md) covers the complete national pool.

Existing Hard hidden selections and hint order are preserved, including every random branch of the 231 XIs published in revision `0cdb7bf`. Added famous/classic XIs use the reviewed attacking clue plus midfield/defense hints; lesser-known big-five clubs retain the two-clue algorithm. Clubs outside the big five use the domestic-nationality policy, with the existing insufficient-player fallback. Middle-recognition nations hide domestic-league/key-player clues and restore an overseas clue first on each hint. The 2026 World Cup Spain XI hides Dani Olmo, Pau Cubarsí and Lamine Yamal; hints restore Olmo then Cubarsí, with Ruiz and Cucurella initially visible.

Medium and Hard retain the full starting-XI sentence and highlighted date in Chinese, English and Spanish, omitting competition names. Easy retains its date/competition prompt. Hard hints restore one player each and never show answer choices.

Easy restores 20 questions from nine requested teams without removing their existing Medium/Hard copies. No obscure eastern-league clubs were in Easy, so no further deletions were needed. Medium and Hard each gain three reviewed MLS star XIs: Inter Miami (2023-08-19, Messi/Busquets/Alba), LAFC (2025-11-02, Son/Lloris/Bouanga) and LA Galaxy (2012-12-01, Beckham/Donovan/Keane). MLS hints retain the designated attacker and restore two other American players. Medium MLS choices provide one other MLS team and two comparable teams from different foreign leagues. See the [Easy/MLS review](docs/easy-mls-update-2026-11-22.md) for sources, full starting XIs and actual hidden alternatives.

The actual African national-team pools contain no Easy or Medium questions, and one Hard XI: Morocco against Portugal on 2022-12-10. Distractor-only countries do not count as questions.

`data/ucl_finals.json`, `data/national_finals.json` and `data/mls_stars.json` own the reviewed fixture catalogs and official source URLs. See the [UCL starting XIs](docs/ucl-finals-2002-2026.md) and [World Cup/EURO starting XIs](docs/national-finals-2002-2026.md). The catalogs retain the earlier corrections to Porto/Monaco 2004 and Atlético 2016, contemporary national-team club clues, and exact crest paths.

To regenerate, run `sync_ucl_finals.py`, `sync_national_finals.py`, `sync_mls_stars.py`, `upgrade_hard.py`, then `upgrade_easy.py` from `scripts/`. Run the six `scripts/test_*.cjs` checks. `test_difficulty_update.cjs` compares all original mask/hint branches against the published baseline, checks the approved Easy boundary and verifies all moved/final XIs in both higher difficulties. The gallery workflow runs the same generators and checks, then refreshes the difficulty, national-team and MLS reviews. `test_easy_mls_update.cjs` checks the 20 restorations, all prior higher-difficulty membership, all 231 previous Hard masks/hints, the three MLS XIs and their bundled nationality flags.

`index.html` is a self-contained static HTML version of the game. Some club crests and archived reaction photos are requested from online sources, so visitors need Internet access for those. The 64 locally supplied reaction images and user-supplied homepage pictures are embedded.

This is an independent fan project. Verify image rights before publishing.

## Update 2026-11-20

Moderate hint options now use the exact same distractor generation as Easy choices.
Club questions draw one same-league choice and two from other leagues when possible; national-team questions use recognition-level bands.
Hard mode and all other gameplay remain unchanged.

## Easy choices

Easy uses a deduplicated union of the original Easy/Medium questions and final catalogs, filtered by the recognition boundary above. Original source tiers and archive frequencies remain unchanged.

Every Easy club question and Moderate club hint offers one same-country-league opponent and two opponents in the answer's strength band from two other country leagues. League and strength mappings include Dinamo Zagreb and Aston Villa; there is no unconstrained random fallback. National-team options use the question's era and provide two same-band opponents plus one in an adjacent different band. The era bands are game-design judgments, informed by historical results rather than exact FIFA ranks; examples include [Korea/Japan 2002](https://www.fifa.com/pt/articles/copa-do-mundo-de-2002-videos), [European World Cup records](https://www.fifa.com/en/articles/european-nations-record), [Morocco 2022](https://www.fifa.com/fr/tournaments/mens/worldcup/articles/parcours-maroc-coupe-du-monde-qatar-2022-un-an-jour-pour-jour), and the [FA's recent FIFA ranking summary](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/2025-26/fifa-rankings/mens-fifa-rankings-december-2025-12-months.ashx?la=en).

`scripts/easy_choices.js` owns the option rules; `python3 scripts/upgrade_easy.py` embeds them. Run `node scripts/test_easy_mode.cjs` to check the complete Easy/Moderate pools. The generated [national-team Hard review](docs/hard-national-team-masks.md) lists every distinct XI, all random hidden-player alternatives and both hints. Regenerate it with `node scripts/report_hard_nations.cjs > docs/hard-national-team-masks.md`.

## Hard-mode clue update

Powerhouse and classic XIs now hide a reviewed attacking player, one midfielder, and one defender. The attacking selection favors an iconic player or a nationality/club clue that gives too much away, including attackers stored as AM/LM/RM. The two hints reveal the midfielder and defender in that order; the attacker remains hidden until the answer is revealed.

This includes historical powerhouse clubs and the supplemental final XIs. Except for the league and national-team policies below, underdog XIs retain the original `[4,7]` mask and hint order.

For clubs outside Europe's big five leagues, including underdogs, Hard now prioritizes a forward of the league's nationality. If none starts, it hides a forward with an unusual nationality instead. The two other hidden clues must both share the league's nationality; this takes priority over hiding exactly one midfielder and one defender. Hints still leave the designated forward hidden. A second attacker or goalkeeper can be used for the other clues when the nationality requirement makes it necessary.

Five existing XIs have too few domestic players: Fenerbahçe (2026-11-04), Benfica (2025-11-05), Salzburg (2024-11-06), Sturm Graz (2024-11-05), and Pafos (2025-11-05). They retain their complete previous mask and hint policy. The league policy does not apply to national-team questions or big-five league clubs.

All Hard national-team questions in the existing two middle recognition bands hide only domestic-league and selected key-player clues, with no extra masked players for hints. Each of their two hints restores one hidden player, preferring overseas clubs before domestic clubs on every hint; hints never switch to answer choices. Japan 2022 still starts with four hidden players (the FC Tokyo, Urawa and Shimizu players plus Takefusa Kubo), and South Korea 2022 still starts with five (the three Jeonbuk players, the Ulsan player and Son Heung-min). The same policy also covers the newly moved middle-recognition nations. Top-nine and low-recognition nations retain their respective reviewed rules.

Netherlands 2014-06-13 has a Hard-only five-player mask: Robin van Persie, Wesley Sneijder, Daley Blind, Bruno Martins Indi, and Stefan de Vrij. Jasper Cillessen is the only initially visible Ajax player, and Daryl Janmaat is the only initially visible Feyenoord player. The two hints restore Van Persie and then Sneijder; the three other clues remain hidden until the answer reveal. The fixture's Moderate gameplay is unchanged.

Belgium 2026-11-12 hides Kevin De Bruyne (Napoli), Jérémy Doku (Manchester City), and Brandon Mechele (Club Brugge). Its two hints restore De Bruyne and then Doku. Both Italy XIs with Donnarumma at Manchester City now hide four players: the goalkeeper and three Serie A players. The 2025-11-16 (2025/26) XI hides Donnarumma, Francesco Pio Esposito, Federico Dimarco, and Nicolò Barella (the latter three at Inter). The 2026-11-15 (2026/27) XI hides Donnarumma, Esposito (Inter), Nicolò Fagioli (Fiorentina), and Alessandro Bastoni (Inter). Both XIs restore Donnarumma on the first hint and Esposito on the second, leaving the other two Serie A clues hidden. These match-specific rules apply only in Hard.

France 2006-07-09 shows Thierry Henry's Arsenal clue from the start in Hard and hides Florent Malouda's Lyon clue instead. Makelele and Thuram remain hidden, and the two hints still restore them in that order. Abidal's separate Lyon clue remains visible. Both historical fixture copies use this Hard rule; Easy/Moderate gameplay is unchanged.

Spain 2024-07-14 and 2026-11-15 show Fabián Ruiz and Marc Cucurella from the start in Hard, while Lamine Yamal stays hidden through both hints. The 2024 XI hides Nico Williams (Athletic Club), Robin Le Normand (Real Sociedad), and Yamal (Barcelona); hints restore Williams and then Le Normand. The 2026 XI hides Pau Cubarsí (Barcelona), Aymeric Laporte (Athletic Club), and Yamal; hints restore Cubarsí and then Laporte. These rules cover both historical copies of the 2024 XI. Club clues remain those stored for the match; Easy/Moderate gameplay is unchanged.

`scripts/upgrade_hard.py` owns these rules and refreshes the embedded HTML during gallery synchronization. Run `node scripts/test_hard_mode.cjs` to check every Hard fixture, hint behavior, and updater idempotence.
