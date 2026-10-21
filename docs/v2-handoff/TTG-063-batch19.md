# V2 Batch 19 — TTG-1-063 shared MAIN REST, RED energy and deferred retirement

User-supplied card-front PDF transcript held in `dist/gurren-lagann.mjs`:
- [UA56BT/TTG-1-063 ブータ](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-063) (official individual page may be inaccessible to automated tools; card-front transcript verifiedFrom user-uploaded-card-front-pdf-2026-10-13).
- RED0 AP1 BP1000 gen1, 大グレン団, no printed life trigger, PRINTED MAIN: REST own character once per turn, gain +1 RED generated energy this turn, retire this character at MAIN phase end.

Exactly reuses existing native `restSelfGainEnergyRetireEndMain` shared by the independently pinned SLG-1-013 (PURPLE) and MST-1-016 (BLUE), proving full three-title color independence without modifying the shared engine. TTG adapter pins official card identity, numeric characteristics, card-front effect substring, and appends exactly one new registered card. Strict fail-closed for unknown TTG cards remains.

`tests/v2-ttg-063-energy-retire.test.mjs` validates physical cards and AP, P0 TTG vs MST and P1 TTG vs MST, red vs opponent-color energy, wrong actor / no double action, ready/rest/front restrictions, immediate retire at main end, opponent hand secrecy, and bounce + re-enter should cancel stale delayed-retire entry by physical stamp. Independent roster and 60-seeded game matrix pinned.

Proposed after exact HEAD CI: BLEACH 80/276, TTG 29/81, SLG 32/80, SAO 54/183, MST 28/80 = 223/700 candidate playable, 477 blocked. No claim of exhaustive per-card FAQ acceptance or manual mobile QA. No main merge or production deployment.
