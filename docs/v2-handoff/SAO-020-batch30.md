# Batch 30 — SAO-1-020 universal OWN life-count upper bound for persistent BP

Official UA15BT/SAO-1-020 アスナ（創世神ステイシア）, YELLOW1/AP1/base BP2500+, gen1, 女神 trait, NO Life trigger. Full printed Japanese body `自分のライフが4以下の場合、このキャラはBP+500。` source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-020

Generic shared V2 persistent predicate: `{kind:'ownLifeAtMost',turn:'any',max:4}`. Source-verified upper-bound field `max` accepts integer 0..10 with no zone, opponent, min, or other schema extras. Evaluator checks true physical OWNER life count every time BP is queried and never caches a snapshot or confuses opponent's life; triggers on both turns, unlike the prior own-turn hand-size profile. Reuses native `passiveBonuses` with BP+500, no SAO-only reducer. Official strict source adapter compares exact Japanese print, no inferred effect or guessed rarity behavior.

Tests use actual 50-card SAO and MST decks, owner P0/P1 and FRONT/ENERGY, 7→5→4→5 genuine UID life moved to hand and returned, actual base BP2500→3000→2500 on both turns, opponent life count negative, opponent hand privacy, AP/energy paid normal play with no fake draw, invalid scope/card/schema validations. No manual browser/device or comprehensive FAQ certification.

Expected after exact HEAD green: BLEACH85, TTG30, SLG34, SAO60, MST29 = 238/700 tested candidates, 462 blocked, 0 full official FAQ certified. No main merge or production deployment.