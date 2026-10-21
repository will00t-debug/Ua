# V2 Batch 35 — MST-1-057 shared FRONT energy (2026-10-21)

Source: BANDAI Japanese UA54BT/MST-1-057 クリフ, GREEN4/AP1/BP3500, GREEN1, CHARACTER, ラノア魔法大学, DRAW Life; printed effect `このキャラはフロントLでもエナジーを発生させる。` Official card page: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-057

Strict generic `frontGeneratesEnergy:true` DSL profile counts an own FRONT physical UID in live energy production, in addition to normal ENERGY-line sources. Unflagged FRONT, other owners, HAND, OUTSIDE and REMOVED never produce. REST does not negate base energy; READY-specific bonuses remain independent. Physical move FRONT→ENERGY counts once, then OUTSIDE removes production. `pack.mjs` refuses faux vanilla, noncharacter and invalid values. MST-057 has no other printed effect; generic DRAW Life is independent.

`tests/v2-mst-057-front-energy.test.mjs` pins official full text, 50-card deck legality, both P0/P1 versus SLG, actual GREEN4/AP1 entry, REST FRONT production, owner isolation, UID zone movement, public hand secrecy, physical conservation and schema-negative controls. Independent 5-title exact-ID and coverage assertions move to 243/700 source-registered pilots (MST 33/80; 457 unported). This does not establish complete official FAQ acceptance.

GitHub CI: pending on commit. No local checkout/npm test (GitHub DNS unavailable in local container), no manual browser/mobile QA, main merge, force push or Production deployment. PR #75 remains Draft.
