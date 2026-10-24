# V2 GPT AI round 1 — shared public-information policy

Draft PR #83, base `gpt/v2-r58-safe-integration-20261024`.
No engine, DSL, card registration, independent manifest, main or deployment changes.

## Verified starting points

- R58 #81: `b03e8a6674ab09323b140a80385bef0f3e34f1db`, push Actions **40053951453 SUCCESS**.
- Cursor #82: `f0a6ba8f7f53346973c5a097a4d92648a4a8c68f`, push Actions **40055521587 SUCCESS**. Not included in this AI branch; its seven cards and original branch remain intact.
- Local Git HTTPS did not have push credentials. Published identical Git trees using the connected GitHub Git-data API with sequential parents and expected-SHA, non-force ref updates. Remote commit IDs differ from local author/timestamp IDs; tree equality was verified at every publication.

## Five reviewable batches

1. Legal-choice boundary: fixed two automatic-semicolon-insertion `return` defects in rest/tuck pending handlers; all live AI selections are mapped back to exact native legal-action objects. Captured unchanged R58 baseline with relocated engine import, pinned SHA-256 in tests.
2. Reusable scoring: current BP/IMPACT/DAMAGE from engine public helpers; life pressure, hand opportunity cost, own registered-deck energy target, color demand, AP, board slots, Raid base loss, known outside potential and effect utility. Added exported position evaluation and ranked candidate diagnostics.
3. Tactical verification: profitable attack/sniper comparisons, stronger surviving blockers, discard costs, optional sacrifices, deployment replacement, replay and hidden-state metamorphic tests. Added five-title mirrored benchmark.
4. Compatibility and information safety: retirement/onRetire value, onPlay during Raid, base onRaided value, stable forced ordering, protection without full-state simulations, and actual V2 end-turn refresh. Pinned all **9 phase action types and 61 pending kinds** to reviewed categories.
5. Acceptance: Node 22 full regression, original 60-game matrix, independent manifest, 240-game benchmark plus 160 games on additional fixed seeds, CI benchmark/artifact step and this handoff.

## Policy boundary and difficulty

- Easy retains simple baseline choices and typically declines optional costs; every result is exact-legal.
- Normal retains predictable baseline resource/deployment/blocking behavior. Its old replacement simulation was removed; it now checks visible BP loss and own available protection layers without resolving unknown future draws.
- Hard uses `ai-observation.mjs` then the pure `ai-strategy.mjs` scorer. It estimates every legal candidate, including a zero-utility pass/skip when legal. It has no card-ID or title-specific tactics, reducer import, remote model, network request or asynchronous dependency.
- Existing V2 preview imports `chooseUniversalAiAction` from `ai.mjs`, so the same selector is used in-game. Existing save/replay format, UID, effect source, first player and control remain unchanged. No browser/mobile manual QA was performed in this round.

The observation includes public field state/counts/outside, the acting player's own hand and registered deck composition, authorized private-choice card identities, selected public pending parameters and native legal actions. It excludes RNG, either hidden deck sequence, unrevealed LIFE, opponent hand, opponent deck composition, raw effect queues and opponent facedown-layer identities. Private search identities come through the engine's existing `universalPrivateChoices`. Equal-score deck-search choices use UID ordering so shuffling unseen deck order cannot bias selection. The score module cannot inspect the full match or dispatch actions. This is heuristic estimation, not a cloned rules engine or omniscient rollout.

V2 refreshes one's field at the end of the attack phase. Hard does **not** assume an attacker necessarily loses its next blocking opportunity: reserve penalties apply when public `cannotActive`/`skipNextActive` restrictions prevent refresh. Losing battles are still penalized for actual future material loss.

## Pending-choice audit

`tests/fixtures/v2-ai-decision-inventory.json` explicitly lists every current kind; a test compares it against engine validation and fails when a new kind is introduced. The list is an inventory gate, not proof of optimal play for all 61 kinds.

| Category | Handling |
| --- | --- |
| Block / sniper / attack | Live BP and keywords, prospective trade/life costs; exact target UID/stamp retained |
| Discard, hand limit, selection payment | Lowest estimated own opportunity cost; joint two-card payments scored together |
| Search / recovery / filtered top selection | Authorized candidate identities and own resource value |
| Entry / Raid / COLOR entry | Destination, replacement, base, energy and printed public effect estimates |
| Rest / retire / debuff enemy | Public target value, lethal BP thresholds and READY state |
| Own sacrifice / protection | Lost material versus known followup/onRetire value; avoid last protection layer when BP would become lethal |
| Multi-mode | Public validated option-program utility; unknown opcodes contribute no invented payoff |
| Forced effect, retirement, phase and LIFE ordering | Deterministic native order for ties; no fabricated action or queue manipulation |
| Remaining optional/own-target choices | Conservative generic target/skip scoring; advanced sequencing remains incomplete |

Actual benchmark pending-kind/action coverage is recorded in the JSON summary. Legal fallbacks cover unoptimized kinds, but this does **not** establish that every rare pending interaction has been encountered in simulated games.

## Final measurements

The policy is frozen before the second seed set. Seeds: validation `747,20261015,20261016`; additional `947,20261024`. Each seed compares 10 title pairs × both Hard deck seats × both first-player orientations × two opponents. Every deck is a validated, registered, real-card exact 50-card preview preset. Results apply to these presets, not every possible deck.

| Opponent | Validation | Additional seeds | Combined |
| --- | ---: | ---: | ---: |
| Normal | 79/120 (65.83%) | 51/80 (63.75%) | 130/200 (65.0%) |
| Exact R58 Hard | 74/120 (61.67%) | 47/80 (58.75%) | 121/200 (60.5%) |

Validation Hard first/second: Normal **61.67% / 70.0%**, R58 Hard **56.67% / 66.67%**. Additional first/second: Normal **60.0% / 67.5%**, R58 Hard **60.0% / 57.5%**.

| Hard preset | Validation (48 games each) | Additional (32 each) |
| --- | ---: | ---: |
| BLEACH green | 58.33% | 78.13% |
| TTG red | 100% | 93.75% |
| Solo Leveling | 27.08% | 18.75% |
| Sword Art Online | 50.0% | 78.13% |
| Mushoku Tensei | 83.33% | 37.5% |

Title rows pool opponents with different decks; they are **not** a controlled per-title uplift estimate. The balanced policy comparison supports an aggregate improvement in this sample, not universal superiority. Small fixed seed sets are correlated, and MST's large seed sensitivity is a clear limitation.

- All **400/400** finished; **0 illegal actions, 0 step-limit games**. Original Normal matrix separately **60/60**.
- Mean action count **182.13** validation / **166.65** additional.
- Hard decision time validation: mean **0.649 ms**, p95 **1.904 ms**, max **198.588 ms**; additional mean **0.522 ms**, p95 **1.368 ms**, max **180.596 ms**. These include wrapper/observation/native legal calls. Diagnostics are collected outside the timed selector. Local runs overlapped; cold startup/GC/outliers and hardware matter. No mobile latency guarantee is claimed.
- Node **22.23.4** `npm test`: **2224 passed, 0 failed**. All prior negative tests retained. Final extra baseline-hash assertion passed in the 10-test AI file and will also run in final full CI.
- Independent registry manifest: **353** (BLEACH 107, TTG 38, SLG 46, SAO 107, MST 55), unchanged. Not full official FAQ certification.

The earlier exploratory 72.5%/70% result used a superseded policy with regression failures. It is **not** the final result above. Correctness and compatibility took precedence over keeping the higher exploratory win rate.

## Loss evidence and next priorities

Benchmark JSON stores the last eight Hard candidate rankings for each loss, final life/field counts, seed, seats and termination reason. Example: additional seed 947, BLEACH vs SLG, Hard SLG seat 1, first player 0: Hard loses at action 109, LIFE `[7,0]`, fronts `[4,0]`. Its final trace includes a mandatory own bounce, hand-limit discards and no available attacker/blocker. This directly demonstrates failed board development; attributing it to insufficient valuation of bounce/conditional-entry chains is a hypothesis to test, not a proven causal diagnosis.

Next round priorities:

1. Add generic cost-aware evaluation for mandatory own-bounce and conditional free-entry chains, with counterexamples where avoiding the card is correct. Broaden source/opcode coverage without card-ID tactics.
2. Controlled same-preset mirror comparisons and more deck archetypes/seeds, especially SLG and MST; measure paired uplift rather than pooled title win rates.
3. Improve legal block restrictions, defensive keyword interactions, active-ability scheduling and effect ordering. Current ordering is deterministic, not a search over all permutations.
4. Add a bounded belief-state/search interface only if it cannot reveal unknown draws/Triggers; no full-state rollout shortcut.
5. Safely integrate Cursor #82 in a separate integration checkpoint after rechecking its current head; rerun manifest, all tests, matrix and AI benchmark before acceptance. No Cursor cards were copied into this AI branch.

Reproduce with Node 22:

```sh
npm test
node scripts/v2-integrated-match-matrix.mjs
node scripts/v2-assert-independent-manifest.mjs
node scripts/v2-ai-benchmark.mjs
AI_SEEDS=947,20261024 AI_OUTPUT=audit/v2-ai-benchmark-heldout.json node scripts/v2-ai-benchmark.mjs
```

Committed summary: `audit/v2-ai-round1-summary.json`. Full run records are generated at runtime and CI uploads `audit/v2-ai-benchmark.json`. Read PR #83 for the final tested SHA and its own Actions URL; do not substitute R58 or intermediate CI for final acceptance.
