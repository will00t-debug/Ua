# UNION ARENA V2 R26 — Earned movement, Q2315/Q2316 and BLC official pilot

Date: 2026-10-22. Branch: `gpt/v2-resume-20261022`. Existing draft PR [#78](https://github.com/will00t-debug/Ua/pull/78)
base `cursor/v2-multi-retire-life-6ff5`. Start HEAD `fca93717ee5752f2e01427801651e0b585e23489`
verified [Actions 39796697725](https://github.com/will00t-debug/Ua/actions/runs/39796697725) success 1769 tests/60 matches.
Never merge main, overwrite Cursor PR #77, deploy production, or force push.

## Official sources and exact scope

* [EX07BT/BLC-2-019](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-019_p1): blue4/AP1/BP4000+, Ichigo Raid/ACTIVE/front; up to 2 distinct opposing front >=BP2000 get -1500; MAIN one named hand 斬月 / 月牙 to outside, then draw1, +BP1000, temporary attack-time draw up to one; RAID LIFE trigger.
* [EX07BT/BLC-2-047](https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=EX07BT%2FBLC-2-047): blue2/AP1 event draw2; own blue Ichigo's effect hand→outside grants draw1 independently, no LIFE trigger. Official **Q1046**: the extra trigger needs NO printed energy 2 threshold.
* [EX07BT Q1033](https://www.unionarena-tcg.com/jp/faq/list.php?series=EX07BT): card 047's earned draw only **after the ENTIRE Ichigo MAIN** source has resolved, including draw, buff, grant and all choices.
* [EX15BT/BLC-4-034](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-034) **Q2315/Q2316** (2026-09-04): Riruka's own on-field blue Ichigo hand-to-outside reaction may REST itself, then optionally put the same exact outside physical UID face down beneath itself, **without cancelling** the already-earned 047 draw; owner can inspect own face-down card; opponent cannot.

## Five scoped batches, real commits

1. **A / Q2316 hidden root visibility** `1e9abecf1d07c21e64fb5aa6f0247a9199d86d0f`.
   `universalPublicView` now exposes generic `underLayers` for both plain FRONT and ENERGY field roots, not just Raid stacks. `layerView` hides opponent facedown UID+cardId and reveals own card identity; actual 50-card conservation and serialized snapshots in `tests/v2-r26-q2316-root-under-visibility.test.mjs`.
2. **B / source-qualified field watcher and choice grammar** `9c717911fcedef4f2a5985132849fa46886e9b9e`, `916be66a5b4da9242ee813680af8811605050fd7`, `6ca4f8f90a372071fcdc47864a430f97d2e6c052`, `1c060b818df6175788f56b4d3e25dd3f73de8a82`, test fix `0657e15cfee3881771dfab8202be61b6ecfc9acc`.
   Data-driven *strict* `moveObserver:{when,op:'restSelfTuckMovedFaceDown'}` for a character, only own hand→outside, named and colored field source, reason payment|own-effect. The **existing queue** opens `effect-move-order` for simultaneous earned watcher and moved-card draw. Choosing observer may REST its exact stamped physical character and optionally tuck the exact original moved UID outside→raid-under face down; card conservation, legal actor/AI, official Q2315 both orders and optional skip tests. The *moved-card draw* remains earned from event metadata after the full originating source, even after tucked under.
3. **C / actual AP and LIFE Raid printed pilot** `3e95acb98ab8591ff440a607e44f01d013df959a`.
   `tests/v2-r25-blc-official-print-pilot.test.mjs` adds real seeded 50-card attack→LIFE reveal of BLC-2-019, confirms free trigger Raid at blue4 into compatible base, READY, inherited base and source onPlay two-target option, plus GET alternative. Q1046: a printed energy2 event in hand cannot be **played** with zero blue energy, while its already-earned *source-qualified trigger* still draws without energy cost or additional AP. All performed through shared reducer.
4. **D / strict negative and multiple physical witnesses** `72dab55f29146725502c1db9f381cd2ff949a607`.
   Tests two simultaneous watching UID sources for one physical 047, ensuring it cannot be tucked twice; wrong source name/color does not count, other owner's watcher cannot react, watcher can skip REST while earned draw still resolves. No cross-title card-specific reducers.
5. **E / moved-at-event snapshot, not late board scan** `bd8a538b15e31229c0c4ed8859faf49ce889eff3`.
   Original completed hand→outside `zoneMoveEvents` now optionally holds a strict `earnedFieldObservers` list with actual `sourceUid` and `fieldEntryStamp` for eligible on-field printed watchers. The existing `sourceResolutionBoundary` releases these immutable earned reactions **after** complete source. If watcher later leaves or changes incarnation, it cannot illegally pay REST; the moved card trigger is still retained from its original move. Strict state validation of stamped snapshot, no second queue/reducer. No public history leaks.

## Current verified evidence

* **Latest code HEAD** `bd8a538b15e31229c0c4ed8859faf49ce889eff3`,
  [GitHub Actions 39801612655](https://github.com/will00t-debug/Ua/actions/runs/39801612655)
  `completed/success`. Node22 **1786/1786 PASS, 0 fails**; seeded five-title **60/60 PASS**;
  manifest counts BLEACH 97, TTG 35, SLG 41, SAO 91, MST 48.
  Independent report **700 total / 312 pilot / 388 unported / 0 full per-card FAQ certified**.
* First Q2315 intermediate `1c060b8` failed four **fixture** assertions due to reading a stale pre-dispatch card object (4000 instead of live BP5000). `0657e15` corrected by reading current exact UID field object, no weakening of validator; its Actions `39800649701` then **success 1780/1780**, matrix60/60.
* Later official Raid LIFE/Q1046 Actions `39800917146` **success 1782/1782**, matrix60/60.
* Source snapshot completed and validated by the **latest full Actions** above. No local npm test claim: these are actual remote Actions logs.

## Important non-certification limits

These are generic primitives and isolated official-print **test pilot** IDs, **not a full official registered card port**. BLC-2-019 and 047 remain unregistered; BLC-4-034 Riruka is a source reference/synthetic model, **not** a complete registered port. Riruka also has additional onPlay energy ACTIVE, retirement MAIN and COLOR trigger lines that have *not* been full-card ported or certified here.

Q2315's **tested** case is the true source-qualified one physical event and on-field REST watcher. Other simultaneous movement triggers (two or more separate watcher program families), broad cross-player Q38 ordering, sealing/source leaving in every possible nested window, and nested LIFE reentry are **not globally certified**. Nested LIFE remains atomic fail-closed without new queue. No additional official registry cards or claimed comprehensive FAQ certifications. Do not conflate this focused FAQ evidence with full series acceptance.

## Next priority

1. Independently verify complete Riruka BLC-4-034 printed ability **if** that title catalog is fully available; avoid registering absent printed lines.
2. Expand typed move observer to other printed watcher grammars only after exact official text/ruling, with simultaneous event priority across both players.
3. Audit source disappearance / silence between earning and paying REST, protected leave, Raid layers, and Q38 nested damage; keep unsupported interactions fail closed.
4. Check final documentation commit's own Actions SHA before accepting delivery; no merge/deploy.
