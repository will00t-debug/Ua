# V2 C7 — four official BLEACH pages, no registration

Parent: C6 `caf8a3c0dc2b3ab36c37ca4212df45327d5664dc`. Actions run 40058477281 SUCCESS, 2026-10-24 11:29–11:30 Asia/Taipei, Node v22.23.3, 2234/2234, matrix 60/60, manifest 365/700. This note registers nothing. Its own push `a5bcc8d` passed Actions run 40058774889 at 2026-10-24 11:33–11:34 Asia/Taipei, Node v22.23.3, with the same 2234/2234, 60/60 and 365/700. BLEACH stays 115/276 and MST stays 55/80 in that SHA.

Fetched 2026-10-24. None of these pages had a FAQ. None is a whole-print match of an existing operation.

- BLC-1-062 UA08ST, event おいしいパン. 紫2 / AP1 / ACTIVE. 「自分の場のキャラを1枚選び、このターン中、BP+1000。自分のAPカードを1枚まで選び、アクティブにする。」 The AP half is `recoverAp` count 1. The character half is a mandatory `buffOwnField`, but event play only refuses a missing target for a few operations. A mandatory field buff is not one of them, so the event could be paid with no character and skip that sentence. It stays unregistered.
- BLC-1-063 UA08BT, event. Look at the top 5, add one to hand, put one outside, and order the rest on the bottom. `searchTopOneBottomDiscard` does not also put one inspected card outside.
- BLC-3-010 UA04NC. On play, look at the top 2 and split any counts, in any order, between the top and the bottom. Existing top inspections send the remainder to one place.
- BLC-4-048 EX15BT. On play, look at the top 2, put up to one purple 阿散井 恋次 or 朽木 ルキア outside, and order the rest on top. `inspectTopTraitOutside` takes one trait, not a color plus either of two names.

Phase 2 battle AI has not started.
