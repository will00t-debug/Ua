# Batch 16 — MST-1-003 two-name shared condition

Official printed source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-003

MST-1-003 エリス: BLUE1 / AP1 / BP2000+ / produced blue1 / no traits / DRAW Life. It gains continuous BP+1000 exactly when controller owns both a Rudeus and a Ruijerd CHARACTER on own field (FRONT or ENERGY). The ability is not restricted to own turn.

Reuses existing validated generic ownFieldHasAllNames live predicate (created at a079960/5fe64af/8a6b518). No new per-title engine, no extra effect flags. Strict source pin matches existing audited Japanese inventory and official site. Normal play pays energy/AP, source remains physical UID.

Five dedicated scenarios in tests/v2-mst-003-own-names.test.mjs cover exact original source, real owner P0 and P1 across SAO, front/energy + ready/rest, both own names mandatory, duplicates/enemy/hand/outside negatives, live retract and opponent public BP, strict schema failures, physical UID conservation.

Proposed exact registry: BLEACH 80, TTG 28, SLG 32, SAO 54, MST 25, TOTAL 219/700, blocked 481. Count as candidate after NEW HEAD CI. Full per-card official FAQ acceptance remains zero; no main merge, deployment or manual mobile QA.