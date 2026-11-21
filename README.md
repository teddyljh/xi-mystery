# XI Mystery — GitHub Pages

This repository contains the public XI Mystery football lineup quiz, v3.9.


Public URL: https://teddyljh.github.io/xi-mystery/

`index.html` is a self-contained static HTML version of the game. Some club crests and archived reaction photos are requested from online sources, so visitors need Internet access for those. The 64 locally supplied reaction images and user-supplied homepage pictures are embedded.

This is an independent fan project. Verify image rights before publishing.

## Update 2026-11-20

Moderate hint options now use the exact same distractor generation as Easy choices.
Club questions draw one same-league choice and two from other leagues when possible; national-team questions use recognition-level bands.
Hard mode and all other gameplay remain unchanged.

## Hard-mode clue update

Powerhouse and classic XIs now hide a reviewed attacking player, one midfielder, and one defender. The attacking selection favors an iconic player or a nationality/club clue that gives too much away, including attackers stored as AM/LM/RM. The two hints reveal the midfielder and defender in that order; the attacker remains hidden until the answer is revealed.

This covers 79 distinct XIs (113 fixture entries including historical difficulty copies), including historical powerhouse clubs already in Hard. Except for the league and national-team policies below, underdog XIs retain the original `[4,7]` mask and hint order. Fixture data, question pools, scoring, and Easy/Moderate gameplay are unchanged.

For clubs outside Europe's big five leagues, including underdogs, Hard now prioritizes a forward of the league's nationality. If none starts, it hides a forward with an unusual nationality instead. The two other hidden clues must both share the league's nationality; this takes priority over hiding exactly one midfielder and one defender. Hints still leave the designated forward hidden. A second attacker or goalkeeper can be used for the other clues when the nationality requirement makes it necessary.

This league policy applies to 29 current club XIs. Five XIs have too few domestic players: Fenerbahçe (2026-11-04), Benfica (2025-11-05), Salzburg (2024-11-06), Sturm Graz (2024-11-05), and Pafos (2025-11-05). They retain their complete previous mask and hint policy. The league policy does not apply to national-team questions or big-five league clubs.

Hard national-team questions in the existing two middle recognition bands now hide every domestic-league club clue until the answer reveal, including through both hints. Identifying overseas-player clues are also protected; two separate foreign-club clues can normally be revealed as hints. Japan 2022 hides only four players (the FC Tokyo, Urawa and Shimizu players plus Takefusa Kubo), and South Korea 2022 hides only five (the three Jeonbuk players, the Ulsan player and Son Heung-min). These two XIs add no extra masked players for hints: the first hint shows answer choices, and the second removes two wrong choices. This affects 23 fixture entries (22 distinct XIs across 16 nations). Top-nine and low-recognition national teams, all club rules, and Easy/Moderate gameplay retain their previous behavior.

`scripts/upgrade_hard.py` owns these rules and refreshes the embedded HTML during gallery synchronization. Run `node scripts/test_hard_mode.cjs` to check every Hard fixture, hint behavior, and updater idempotence.
