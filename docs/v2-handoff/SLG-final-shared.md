# SLG final shared batch

The last six Solo Leveling prints are registered on the shared V2 engine. Official card pages were checked on 2026-10-26. This is not a full FAQ certification. `fullyAccepted` stays 0.

| Card | Print | Shared behavior |
| --- | --- | --- |
| SLG-1-022 水篠 旬 | purple 12 / AP 1 / BP 5000 / RAID | Each own-field 影の軍団 reduces required energy by 1 in every zone except the field and outside. Raid name 水篠 旬. Impact 1. On play, ACTIVE up to one front and one energy 影の軍団, then gain sniper this turn. While this card is on the energy line, after each own character attack finishes it may switch with a front 影の軍団. Q2029: that offer is after battle and after a life trigger. |
| SLG-1-034 悪魔の城 | purple 3 / AP 1 field / gen 2 / GET | Enters ACTIVE. MAIN REST, once per this physical card, mills one. The other MAIN REST can start only when outside already has 20 cards; paying the hand cost does not create that count. The played 命の神水 is removed instead of returning outside. |
| SLG-1-058 向坂 雫 | green 4 / AP 1 / BP 4000 / RAID | Trait 第四次架南島レイド. On play, BP+1000 this turn. On attack, once per this card, a hand discard then applies ACTIVE to one own front character that skips its next ACTIVE and to this character. Q2057: that process can leave the chosen card REST. Skipping the offer does not spend the use. |
| SLG-1-064 最上 真 | green 4 / AP 1 / BP 4000 / RAID | Same trait. On play, five or more own cards of that trait give BP-1000 this turn to every opposing front character at current BP 1500 or more. An attack mode grants the next ACTIVE skip only when the player chooses replay or the BP 2000 retirement. |
| SLG-1-073 リュー | green 4 / AP 2 / BP 4000 / GET | Enters ACTIVE. A front copy gives current own DFN cards a same-turn return-to-hand when an own 第四次架南島レイド without DFN retires. The entry buff and the two-AP recovery are shared once per printed name. Q2063. |
| SLG-1-075 デイリークエスト | green 1 / AP 1 field / GET | REST and tuck the deck top facedown under this field while 水篠 旬 is on the own field. The other REST pays one hand card, may release one facedown card, and then may add an outside 水篠 旬 of required energy 0. Q2064: only the controller sees that facedown card. |

Pilot total after this batch: 446/700. Solo Leveling: 80/80 registered. The browser match screen was not clicked; the state transitions are covered by `tests/v2-slg-final-shared.test.mjs`.
