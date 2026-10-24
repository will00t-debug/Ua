# R25 — target snapshot, temporary granted onAttack, source-complete MAIN, official BLC pilot

Date 2026-10-22. Original Draft [PR #78](https://github.com/will00t-debug/Ua/pull/78);
branch `gpt/v2-resume-20261022` targeting `cursor/v2-multi-retire-life-6ff5`.
Baseline `8a8c80ce440d8a802e2fe0ddb308973d05a986a4`,
Actions [39791287832](https://github.com/will00t-debug/Ua/actions/runs/39791287832)
success Node22 1748/1748, five-title matrix 60/60, manifest/report.

## Actual batches and SHA

1. **A** `b0d8aa81d1a4bb3c28d4b80f6ac30e10a7619207`,
   follow-up `e70a1a1119be743ef5be0cfee6eb7aa21b8e3a1b`,
   targeted test syntax fix `30a60cbadfa50ec9353989dbd1484cbb92477134`:
   typed `enemyBpDown.maxTargets=2`, optional 0/1/2 exact distinct opposing FRONT
   physical UIDs, initial BP candidate snapshot, simultaneous BP application
   followed by existing shared simultaneous state-based retirement jobs.
   Shared Human/Normal/Hard AI actions and private views, serialization;
   no second queue. Node22 Actions
   [39793144785](https://github.com/will00t-debug/Ua/actions/runs/39793144785)
   **SUCCESS 1755/1755**, cross-title matrix 60/60, manifest/report pass.
2. **B** `06c1f66b11361ce66c96608870b2b1d20c6739ee`:
   strict reusable `grantOnAttack` DSL with bounded optional draw-1
   and target `self|ownCharacter`. Store *earned* ability in
   `continuousStates` with distinct grant id and physical `fieldEntryStamp`,
   not in printed `effects.onAttack`. On actual attack, snapshot each grant
   as an original `effectQueue` job after printed attack programs;
   each independent grant offers draw/skip, then blocker decision.
   Source-linked false: independently granted abilities may survive giver's
   departure or original-rule silence, but not target reincarnation;
   evidence in `tests/v2-r25-granted-onattack.test.mjs`.
3. **C** `faeb167dfb54e7c1264d7c0152a1fef4c596a4fe`,
   test fixture correction `716497484bb7ee1545871d284b931671cc83b76a`:
   widen **shared** `frontOnceProgram` to complete typed
   `discardGate` payment programs. Strict gate still validates names, physical
   UIDs, 1-turn use, and legal source. Its `then` may draw, BP buff,
   or grant attack draw, before the existing `sourceResolutionBoundary`
   releases the moved event's earned bonus draw.
   `tests/v2-r25-blc-synthetic-source-main.test.mjs` models Q1033
   using **synthetic IDs** and same common engine. Not a real-card port.
4. **D** `1ac80609c2222c7899e85e3eb3a50a30c12417d3`:
   generic grant expires at the **current turn** attack-end, even
   when given during another player's turn, not at grant controller's
   next attack-end. Physical source independence vs target UID/stamp, duplicate
   independent grants and strict state deserialization in
   `tests/v2-r25-grant-controller-lifetime.test.mjs`.
5. **E** `04495e2d1e689c799128c616a81a00f67c30d6c9`:
   official source-pinned `CARDS` metadata and isolated prototype for
   BLC-2-019/047. Tests require exact blue4/AP1/4000 Raid source,
   blue2/AP1 event, 4 actual generated blue energy, 1 actual AP,
   correct Raid top/base movement, optional two enemy BP targets,
   and ordinary event draw2 without earned hand-payment draw1.
   Deliberately outside production registry. See
   `tests/v2-r25-blc-official-print-pilot.test.mjs`.

Focused test correction `300ad3d87eb2025ea33e9b82400466ab80b19736`
keeps full assertions and changes two synthetic fixtures to **legal** second-turn
two AP and real opposing BP >=2000 target positions. Earlier Actions on
intermediate B/C commits **failed**; they are not accepted baselines.
At the time this document was written, B/C/D/E consolidated
Node22 remote CI was queued; check **latest exact head SHA and Actions**,
not previous green A, before claiming R25 success.

## Official printed/ruling boundaries

Japanese [BLC-2-019](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1):
Raid 〈黒崎 一護〉, onPlay select **up to two distinct** opposing FRONT
characters BP >=2000 to give -1500 until turn-end, MAIN once/turn
discard own hand card whose printed name contains 斬月/ 月牙,
then draw one, self +1000 BP, grant on-attack **draw up to one** this turn,
RAID LIFE. [BLC-2-047](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-047):
ordinary event draw2, bonus draw1 when own in-field blue Ichigo effect
places this physical card from own hand to outside, no LIFE trigger.
[Official Q1033 / Q1046](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT):
the earned extra draw after the COMPLETE Ichigo MAIN; its printed blue2
energy is NOT a separate cost to activate the bonus. 
[Q2315/Q2316](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX15BT):
earned trigger persists after later facedown placement, with correct own/private
inspection. The **complete real-card Q2315 underneath placement chain is not
certified** by these synthetic pilots; no complete FAQ registration.

### Safety boundaries / unverified

- No globally certified opposite-player Q38 multitrigger ordering; R24
  verified SPECIAL->onRetire->FINAL case only. Nested LIFE still atomic
  fail-closed, no new queue.
- The granted attack DSL currently supports ONLY optional 1-card draw,
  not arbitrary printed effect programs. Accumulated grants have independent
  physical stamps/IDs; do not infer unrelated extra keywords.
- Source disappearance/silence while a partially started MAIN program is
  suspended is not fully official-audited.
- Verified generated-energy producers and paid Raid are an **isolated**
  official-anchored pack test, NOT a completed registry or official full FAQ
  acceptance. More true Raid LIFE/hidden underneath and all movement/privacy
  scenarios still need independent acceptance.
- No newly registered official cards R25; last verified roster:
  BLEACH 97, TTG 35, SLG 41, SAO 91, MST 48 = **312/700**,
  unported **388**, full-per-card FAQ certification **0**.
- No local checkout/Node test (container cannot resolve GitHub DNS). All
  cited CI, when complete, is **remote Actions**. Do not claim local tests.
  No main merge, Cursor PR #77 modification, Vercel deployment, force-push.

## Next

1. Confirm green remote Actions for latest complete R25 HEAD; fix
   true regressions without deleting tests or weakening validators.
2. Official independent BLC-2-019/047 RAID LIFE, onPlay dual target,
   source MAIN, Q1033/Q1046 and Q2315 facedown earned trigger in
   integrated actual 50-card deck before any registration.
3. Broader `grantedOnAttack` program schema / source moved or sealed
   during source completion only after official ruling.
4. Full cross-player simultaneous trigger schedule with explicit official
   priority; keep nested LIFE fail closed until definitive priority.
