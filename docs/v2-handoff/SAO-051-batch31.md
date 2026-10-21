# Batch 31 — SAO-1-051 IMPACT nullification + native OWN-hand live BP

Official UA15BT/SAO-1-051 キリト BLUE1 AP1 BP2000+ gen1 ALO, no Life trigger. Full two-line original Japanese: `【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、【インパクト】を失う）` and `【自分のターン中】自分の手札が5枚以上の場合、このキャラはBP+1000。`. Source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-051

Source pins require BOTH printed clauses and characteristics. Compose native V2 `impactNull:true` (already source-verified for SLG and MST) with the exact existing generic `ownHandCountAtLeast` live predicate (introduced with SAO-1-057), with count 5 and BP+1000. The clauses are independently live: IMPACT null has no hand restriction, while the BP bonus depends on own hand count AND own turn. No new per-title battle reducer, no unsupported generic profile.

Dedicated tests: owner P0/P1 vs MST, FRONT and ENERGY, own hand 5→4→5 as actual UIDs, own turn vs opponent turn, opponent hand7 cannot satisfy, persists IMPACT null at each count, real AP-paid BLUE1 play without phantom onPlay draw, invalid source/schema scopes, independent trigger absence and full Japanese print. Genuine 50-card source-validated decks; no full independent FAQ review.

After exact HEAD CI green: BLEACH85/276 TTG30/81 SLG34/80 SAO61/183 MST29/80, total 239/700 candidates, 461 still blocked, 0 fully FAQ-certified. No main merge or production deployment.