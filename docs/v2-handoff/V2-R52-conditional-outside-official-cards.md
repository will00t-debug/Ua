# V2 R52 — SAO conditional named-OUTSIDE / Q767 handoff (2026-10-24)

**Branch:** `gpt/v2-resume-20261022`; GPT Draft PR [#78](https://github.com/will00t-debug/Ua/pull/78), target `cursor/v2-multi-retire-life-6ff5`. Never merge main, deploy production, mutate Cursor #77, or force-push. This is **whole-print scenario acceptance**, not exhaustive individual FAQ certification (still 0).

## Official evidence and exact full print

See [R52 official Q767 source inventory](./V2-R52-SAO-Q767-source-audit.md). Exact BANDAI `dist/sao-official-import.mjs` text is byte-pinned via `PRINTED_PINS` for:
- **UA15BT/SAO-1-100 マザーズ・ロザリオ**, green EVENT, printed necessary energy 4, AP1, mandatory opponent FRONT BP<=5000, bounce OWNer hand except own OUTSIDE matching names >=3 causes true retirement. Q767: from-hand EVENT enters own OUTSIDE only after complete effect; SPECIAL LIFE separately retires chosen opponent FRONT.
- **UA15BT/SAO-1-070 アスナ**, green CHARACTER energy3/AP1/BP3500+/green gen1/ALO/null LIFE. Own OUTSIDE physical named copies >=4 give own-turn BP+500; >=6 independently grants IMPACT1 (on a *won battle*, not direct strike).

## Shared implementation (no duplicated old R51 counter)

- Existing `matchesV2LiveCondition('ownOutsideNamedCountAtLeast')` performs each live named count with correct physical UID/owner/zone/aliases.
- Strictly validated generic `conditionalBounceOrRetireByOwnOutsideNames` effect in `pack.mjs`, existing opponent FRONT BP, protection, selection tax, true bounce and true-retirement functions; no card-number reducer.
- `engine.mjs` maintains an in-flight `resolvingEvents` zone **only for explicitly audited deferred EVENT programs**; `completeResolvingEvent` marks hand→outside only after chosen result. A pending event is still conserved as a unique physical UID, cannot be supplied by arbitrary forged saved state, and does not appear in opponent hand or OUTSIDE mid-resolution. Legacy EVENT flows remain unchanged pending per-print audit.
- Q1119 requires at least one legal mandatory selection before printed AP payment. Q62 RAID top bounce vs true retirement moves physical under-cards to OUTSIDE. SPECIAL LIFE runs existing LIFE effect independently.

## Genuine SAO registry and scenario certificates

- Registered EXACT Japanese full-print sources: `SAO-1-100`, `SAO-1-070`; independent manifest lists both IDs. No invented source aliases, synthetic cards or parallel data roster.
- Four existing genuine printed 〈ユウキ〉 source cards: `SAO-1-078`, `SAO-1-079`, `SAO-2-068`, `SAO-2-069`. The last two use prior R43/R44 proven true retirement routes.
- Test `tests/v2-r52-conditional-outside-event.test.mjs`: generic Q767 0/2/3/4, source post-effect move order, mandatory target before AP, bad UID/pending serialization, invalid DSL, hidden zones.
- Test `tests/v2-r52-sao100-real-event.test.mjs`: source-pinned **real** 50-card SAO deck; paid EVENT Q767 0/2/3/4, AP, BP, hand-vs-OUTSIDE, SPECIAL LIFE, Q62 true RAID underlayers.
- Test `tests/v2-r52-sao070-real-passives.test.mjs`: same verified 50-card SAO roster, **three legal paid SAO-1-100 EVENT uses then three legal SAO-2-068 MAIN REST/discard/self true retire**. This actually sends 3 printed 〈マザーズ・ロザリオ〉 and 3 printed 〈ユウキ〉 physical cards to own OUTSIDE through real legal match actions; BP at 3/4/5/6 and IMPACT only at 6; ATTACK/BLOCK winning battle consumes exactly one extra LIFE. Independent live decrement test and AI three difficulty legality.
- R52 `scripts/v2-r52-conditional-outside-candidate-report.mjs` and existing R51 scanner both run in the shared Node22 workflow. Last observed independent current inventory **343 registered / 357 unported** (BLEACH 103, TTG36, SLG45, SAO105, MST54), total catalogue 700; R52 keyword candidates **34**, all **REVIEW PENDING**, zero inferred READY. R51 wider text query matches 93, not semantic acceptance. Any other candidate needs its entire official print/FAQ reviewed first.

## CI and known repaired negative cases

- R51 old HEAD `5a865c3`: [40030890460](https://github.com/will00t-debug/Ua/actions/runs/40030890460) SUCCESS. R52 shared-engine + strict validator `9b3ba352`: [40043667572](https://github.com/will00t-debug/Ua/actions/runs/40043667572) SUCCESS.
- Early R52 synthetic test revealed missing allowlist for **new legitimate signed** queue operations: fixed in `9b3ba35`, retaining negative validation.
- R48 unported audit had an obsolete expectation SAO-1-070 **must remain unported**: corrected to require prior PARTIAL if unported, and exact independently pinned registered identity otherwise; never delete the R48 partition invariant.
- R52 real-deck test fixture was accidentally re-taking the *same UID* by returning each EVENT immediately to HAND; fixed at `36f6751` to remove three distinct copies before moving all to hand. This fixes fixture evidence, not gameplay logic.
- **Final full SHA-specific GitHub Actions SUCCESS must be separately confirmed** after all tests and any subsequent documentation commits; do not borrow older green status.
- R50 Q770 physical FIELD Turn1 and R48–R50 BLEACH official cards remain in npm suite; all negative source/UID protections remain.

## Remaining work / next priority

Do not label any additional R52 text-hit as READY automatically. First reconfirm final Node22+60-match+independent manifest CI for current SHA; if failed fix its real cause. Re-run full R35/R46/R47/R48/R49/R51/R52 censuses on latest registry. Candidate gaps next: `TTG-1-067` battle-win/ACTIVE life, `SLG-1-021` dynamic OUTSIDE BP, `MST-1-009` temporary grant, source-audited SAO name/OUTSIDE effects, cross-BLEACH/SAO known generic atoms. Continue blocking MST-1-067 Q2162, BLC-4-034 facedown Raid bottom, unaudited nested LIFE, mixed multi-target AP/hand costs.

### R52 full code-head Actions SUCCESS (2026-10-24)

- **Executed code SHA**: 36f67514a6de7e2f33edcf61ff3519022e36aa52.
- **GitHub Actions run**: https://github.com/will00t-debug/Ua/actions/runs/40044354789 ; event push, conclusion **SUCCESS**, Node.js 22 tests **2136/2136 PASS**, five-title matrix **60/60** (zero failures), independent literal manifest PASS and 700-source R35/R51/R52 dynamic censuses PASS.
- 5-title current registration: BLEACH 103, TTG 36, SLG 45, SAO 105, MST 54 = **343/700**; remaining **357**. R52 named-OUTSIDE text hits 34 require individual full print / FAQ reviews; no other card inferred READY.
- This SHA is the final R52 gameplay/test implementation before handoff-only documentation commits. After documentation pushes, confirm the exact *latest* PR HEAD GitHub Actions SUCCESS independently; older source green evidence cannot be substituted.
