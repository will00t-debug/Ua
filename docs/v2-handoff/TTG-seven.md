# TTG seven-card batch

Registration plus scenario tests in `tests/v2-ttg-seven.test.mjs`. This is not full official FAQ certification.

| Card | Shared ability |
| --- | --- |
| TTG-1-008 グラパール | Trait Raid on 大グレン団. Draw 1. ギミー grants this-turn impact. ダリー grants an unblocked draw after the block choice (Q2263). |
| TTG-1-025 ロージェノム | Attack, block, and the main require own energy ≥6. Choose シモン, energy +3 this turn, active one AP. |
| TTG-1-030 スペースキングキタン | Raid キタン, impact null. onRetire replays stack[0] REST, or ACTIVE at energy ≥6. |
| TTG-1-039 ラガンインパクト | Choose one own ラガン-name or シモン. Add the snapshotted max own BP and impact 1. ACTIVE life stays shared. |
| TTG-1-044 カミナ | BP+500 on any turn when シモン is on the field or a raid base. Optional unblocked look at the top 7 for exact グレン. |
| TTG-1-050 キヨウ＆キノン＆キヤル | Draw 1 if キタン is on the field or a raid base. Three once-per-card mains. |
| TTG-1-029 グレンラガン | Raid シモン or ヴィラル. Outside green 大グレン団, energy ≤3, AP 1, to hand; REST play replaces that at energy ≥6. |

Catalog disagreements kept in the proof:

- 025 does not REST or retire itself. +3 is the catalog amount; the official glyph was stripped. Q2272 blocks the main with no Simon.
- 030 uses onRetire because the 退場 glyph was stripped. Removal does not replay the base.
- 044 BP+500 is not limited to the controller's turn. Declining the look does not reveal the deck. No registered card is named exactly グレン.
- 050 discard and REST costs come from the catalog. Each mode is once per physical card.
- 029 recovery is not limited to a front-line entry. Slash traits are normalized like TTG-1-077.

Chain Raid onto a card that itself has raidName stays illegal.
