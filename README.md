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

This covers 79 distinct XIs (113 fixture entries including historical difficulty copies), including historical powerhouse clubs already in Hard. Underdog XIs, including their historical lineups, retain the original `[4,7]` mask and hint order. Fixture data, question pools, scoring, and Easy/Moderate gameplay are unchanged.

`scripts/upgrade_hard.py` owns these rules and refreshes the embedded HTML during gallery synchronization. Run `node scripts/test_hard_mode.cjs` to check every Hard fixture, hint behavior, and updater idempotence.
