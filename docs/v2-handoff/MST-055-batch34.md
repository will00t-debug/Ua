# V2 Batch 34 — MST-1-055 cross-title TOP3 trait private search

- BANDAI Japanese official UA54BT/MST-1-055 アリエル: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-055 . GREEN1/AP1/BP2000/generation GREEN1, trait ラノア魔法大学, independent DRAW Life. Printed main text: onPlay inspect exactly own TOP3; optionally reveal/add <=1 with printed matching trait; move ALL remaining inspected physical UIDs to own deck BOTTOM in controller-selected order, no shuffle; ONLY IF card added discard exactly one own-hand card AFTER deck bottom ordering.
- Reuses existing engine and strictly-validated ability template searchTopOneBottomDiscard, used already in TTG and SLG. Does not add a title-specific reducer. Source-locked complete exact print in MST pack; no inference from printed prose.
- New dedicated P0/P1 versus SLG proof uses real 50-card registered title decks. Covers AP cost, UI owner-only private TOP3, exact eligible UID, skip/no-match/hidden fourth, deterministic bottom order, discard contingent on adding a card, spoofed UID/actor negatives and physical ownership/conservation. Independent manually pinned five-title V2 roster and strict title inventory refreshed.
- Expected (pending new CI): five-title source-registered 242/700, unported 458/700; BLEACH85, TTG30, SLG34, SAO61, MST32. These are pilot implementation counts, NOT independent complete per-card official FAQ certification. PR #75 remains DRAFT; no main merge, production update, or manual phone/browser QA.

## Verified green source integration

- Source+strict test commit `cf324c884302664c4b5b509fe56b41036706f3c0`; regression-only precision correction `b5f8a7e99cfc0d36e5dfee4b0e9002153ffe5e07`.
- [V2 Resumed Integration CI run 39592732062](https://github.com/will00t-debug/Ua/actions/runs/39592732062): SUCCESS on Node22: `npm test` **1394/1394 passed** (0 failures); five-title matrix **60/60 games finished** (0 failures); unported report returned **242/700 integrated, 458 unported, 0 full FAQ-certified**.
- [V2-D SAO and MST isolated QA run 39592738149](https://github.com/will00t-debug/Ua/actions/runs/39592738149): SUCCESS.
- First CI reported two failures in new privacy assertions: test matched unquoted short physical UID text as substring of an unrelated visible UID. Fixed by comparing exact JSON STRING tokens `JSON.stringify(c.uid)`. This retains the private-choice and UID secrecy assertion, avoids weakening the privacy condition and does not touch the engine.
- No main merge, force push, live production deploy or manual phone UX QA. PR #75 remains draft.
