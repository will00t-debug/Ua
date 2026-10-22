# Batch 28 — SAO-1-014 shared opponent-turn live BP

Official UA15BT/SAO-1-014 エルドリエ・シンセシス・サーティワン, YELLOW2 / AP1 / base BP2500+ / gen1, trait 整合騎士, DRAW Life. Exact JP body `【相手のターン中】このキャラはBP+1000。` at https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-014.

Adds small generic `opponentTurnBp` numeric V2 card characteristic (strict integer 1..5000 and character-only, normalized default 0), mirror of existing `ownTurnBp`. Engine evaluates exactly one of ownTurnBp/opponentTurnBp at each BP read by physical owner, never snapshot/mutate printed BP, independent of READY/REST, front/energy, hidden zones, or foreign opponent cards. Existing live passive predicates still compose as before. Strict source locking validates every original characteristic and full printed JP text before allowing the official card into V2.

Dedicated original physical SAO versus MST tests cover both owner positions and front/energy line, live own/opponent turn switching, BP 2500 / 3500, REST and dynamic public BP, UID/conservation and independent DRAW Life icon, fail-closed invalid numeric profile. No independent FAQ acceptance claim.

Expected on fully green CI: BLEACH85, TTG30, SLG34, SAO58, MST29, total 236/700 candidates, 464 unported, 0 comprehensively FAQ-certified. No merge main, production deploy or manual mobile QA.