# XI Mystery — GitHub Pages

This repository contains the public XI Mystery football lineup quiz, v3.9.


Public URL: https://teddyljh.github.io/xi-mystery/

`index.html` is a self-contained static HTML version of the game. Some club crests and archived reaction photos are requested from online sources, so visitors need Internet access for those. The 64 locally supplied reaction images and user-supplied homepage pictures are embedded.

This is an independent fan project. Verify image rights before publishing.

## Update 2026-11-20

Moderate hint options now use the exact same distractor generation as Easy choices.
Club questions draw one same-league choice and two from other leagues when possible; national-team questions use recognition-level bands.
Hard mode and all other gameplay remain unchanged.

## Easy expansion 2026-11-21

Easy now includes the deduplicated union of all original Easy and Moderate XIs: 80 club and 80 national-team questions, adding 40 of each. Existing Easy copies take precedence over identical Moderate copies. Source fixture tiers and archive frequencies are unchanged, so the Moderate and Hard pools and Hard clue selections are preserved.

Every Easy club question and Moderate club hint offers one same-country-league opponent and two opponents in the answer's strength band from two other country leagues. League and strength mappings include Dinamo Zagreb and Aston Villa; there is no unconstrained random fallback. National-team options use the question's era and provide two same-band opponents plus one in an adjacent different band. The era bands are game-design judgments, informed by historical results rather than exact FIFA ranks; examples include [Korea/Japan 2002](https://www.fifa.com/pt/articles/copa-do-mundo-de-2002-videos), [European World Cup records](https://www.fifa.com/en/articles/european-nations-record), [Morocco 2022](https://www.fifa.com/fr/tournaments/mens/worldcup/articles/parcours-maroc-coupe-du-monde-qatar-2022-un-an-jour-pour-jour), and the [FA's recent FIFA ranking summary](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/2025-26/fifa-rankings/mens-fifa-rankings-december-2025-12-months.ashx?la=en).

`scripts/easy_choices.js` owns the option rules; `python3 scripts/upgrade_easy.py` embeds them. Run `node scripts/test_easy_mode.cjs` to check the complete Easy/Moderate pools. The generated [national-team Hard review](docs/hard-national-team-masks.md) lists every distinct XI, all random hidden-player alternatives and both hints. Regenerate it with `node scripts/report_hard_nations.cjs > docs/hard-national-team-masks.md`.

## Hard-mode clue update

Powerhouse and classic XIs now hide a reviewed attacking player, one midfielder, and one defender. The attacking selection favors an iconic player or a nationality/club clue that gives too much away, including attackers stored as AM/LM/RM. The two hints reveal the midfielder and defender in that order; the attacker remains hidden until the answer is revealed.

This covers 79 distinct XIs (113 fixture entries including historical difficulty copies), including historical powerhouse clubs already in Hard. Except for the league and national-team policies below, underdog XIs retain the original `[4,7]` mask and hint order. Fixture data, question pools, scoring, and Easy/Moderate gameplay are unchanged.

For clubs outside Europe's big five leagues, including underdogs, Hard now prioritizes a forward of the league's nationality. If none starts, it hides a forward with an unusual nationality instead. The two other hidden clues must both share the league's nationality; this takes priority over hiding exactly one midfielder and one defender. Hints still leave the designated forward hidden. A second attacker or goalkeeper can be used for the other clues when the nationality requirement makes it necessary.

This league policy applies to 29 current club XIs. Five XIs have too few domestic players: Fenerbahçe (2026-11-04), Benfica (2025-11-05), Salzburg (2024-11-06), Sturm Graz (2024-11-05), and Pafos (2025-11-05). They retain their complete previous mask and hint policy. The league policy does not apply to national-team questions or big-five league clubs.

All Hard national-team questions in the existing two middle recognition bands hide only domestic-league and selected key-player clues, with no extra masked players for hints. Each of their two hints restores one hidden player, preferring overseas clubs before domestic clubs on every hint; hints never switch to answer choices. Japan 2022 still starts with four hidden players (the FC Tokyo, Urawa and Shimizu players plus Takefusa Kubo), and South Korea 2022 still starts with five (the three Jeonbuk players, the Ulsan player and Son Heung-min). The same policy applies to all 16 nations represented by 23 fixture entries (22 distinct XIs). The other 14 nations now start with two to six hidden players rather than four to eight. Top-nine and low-recognition national teams, all club rules, and Easy/Moderate gameplay retain their previous behavior.

Netherlands 2014-06-13 has a Hard-only five-player mask: Robin van Persie, Wesley Sneijder, Daley Blind, Bruno Martins Indi, and Stefan de Vrij. Jasper Cillessen is the only initially visible Ajax player, and Daryl Janmaat is the only initially visible Feyenoord player. The two hints restore Van Persie and then Sneijder; the three other clues remain hidden until the answer reveal. The fixture's Moderate gameplay is unchanged.

Belgium 2026-11-12 hides Kevin De Bruyne (Napoli), Jérémy Doku (Manchester City), and Brandon Mechele (Club Brugge). Its two hints restore De Bruyne and then Doku. Both Italy XIs with Donnarumma at Manchester City now hide four players: the goalkeeper and three Serie A players. The 2025-11-16 (2025/26) XI hides Donnarumma, Francesco Pio Esposito, Federico Dimarco, and Nicolò Barella (the latter three at Inter). The 2026-11-15 (2026/27) XI hides Donnarumma, Esposito (Inter), Nicolò Fagioli (Fiorentina), and Alessandro Bastoni (Inter). Both XIs restore Donnarumma on the first hint and Esposito on the second, leaving the other two Serie A clues hidden. These match-specific rules apply only in Hard.

France 2006-07-09 shows Thierry Henry's Arsenal clue from the start in Hard and hides Florent Malouda's Lyon clue instead. Makelele and Thuram remain hidden, and the two hints still restore them in that order. Abidal's separate Lyon clue remains visible. Both historical fixture copies use this Hard rule; Easy/Moderate gameplay is unchanged.

`scripts/upgrade_hard.py` owns these rules and refreshes the embedded HTML during gallery synchronization. Run `node scripts/test_hard_mode.cjs` to check every Hard fixture, hint behavior, and updater idempotence.
