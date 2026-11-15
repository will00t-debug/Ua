# Rurouni Kenshin / 浪客劍心 UA41 — V2 kickoff (2026-11-16)

## Verified target and release gate
- Title key `rnk`, engine IDs `RNK-1-001` through `RNK-1-113`.
- UA41BT: numbered cards 001–100 (100 unique deck cards); six AP card designs.
- UA41ST: numbered cards 068, 070, 074, 078, 080, 081, 085, 096, 100 (reprints) plus 101–113 (13 new deck cards); one AP print. Its 27 listed products include parallel versions and MUST NOT be treated as 27 unique playable effects.
- Target: 113 unique BT/ST numbered deck cards, plus separate UAPR/RNK-P-001 event (114 tracked deck identities total). 8 verified AP print IDs including UAPR/RNK-AP01. Count artwork variants separately, never as new engine effects.
- UAPR/RNK-1-014, -057, -086, -090 are additional promo prints of existing BT IDs; do not create duplicate effects. More promo products, if verified later, must be added to the inventory explicitly.
- This draft PR establishes identity and print mapping, plus official Traditional Chinese printed card text and numeric stats for all 28 cards RNK-1-001–028 (Group A). No card is playable yet: Japanese copy, independent V2 effect acceptance, live-registry entries, and deployment are pending. No fake vanillas or guessed effects.
- Sources:
  - Official booster: https://www.unionarena-tcg.com/jp/products/boosters/rnk-1.php
  - Official starter filter: https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570041
  - Cross-check full list: https://cardframescanner.com/ja/games/union-arena/sets/ua41bt
  - Cross-check starter: https://cardframescanner.com/ja/games/union-arena/sets/ua41st
  - Official promo event: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-P-001
  - Official Traditional Chinese card detail pattern (001–028 checked individually): https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-001

## Four independent owners (7-card sub-batches preferred)
| Group | Exclusive numbered ID ownership | Sub-batches |
| --- | --- | --- |
| A | RNK-1-001–028 | 001–007, 008–014, 015–021, 022–028 |
| B | RNK-1-029–056 | 029–035, 036–042, 043–049, 050–056 |
| C | RNK-1-057–084 | 057–063, 064–070, 071–077, 078–084 |
| D | RNK-1-085–113 and RNK-P-001 | 085–091, 092–098, 099–105, 106–113, promo event |

- Shared starter reprint numbers stay owned by their numeric group (C or D). The print alias must not create a second card effect.
- A/B/C/D own separate `dist/rnk/cards-<range>.mjs`, `dist/universal-v2/rnk/programs-<range>.mjs`, and matching `tests/v2-rnk-<range>.test.mjs` files. Do not concurrently edit common registry, engine, shared catalog, or other group's files.
- Each sub-batch: confirm official card number, Japanese name, source image, color/type/energy/AP/BP/gen, trigger, traits, Japanese rules text, Traditional Chinese localization, V2 effect program, positive and negative acceptance tests. Never fabricate missing details; if the source is incomplete, mark not-ready and record the missing evidence.
- V2 `onPlay` and `onRaid` are separate. Respect target choices, attack windows, cost payment, place replacement, trigger resolution, and card conservation. Existing `dist/mha/catalog.mjs` and `dist/universal-v2/mha-pack.mjs` illustrate `battleReady:false` source catalogs and program-owned `ready:true` gates.
- Any new shared-engine effect should be raised as a narrowly scoped integration change; don't silently patch the engine in multiple group branches.
- Only after each acceptance gate: integration branch merges verified batches, wires editor/search/AI and online V2 lazily, verifies traditional Chinese, confirms 50-card legality, mobile/desktop card inspect, local `npm test`, remote CI, and then production deployment. Do not merge or deploy a partial manifest.

## Definition of done per numbered card
1. Official identity, numeric stats, trigger, source, Japanese printed text, and accurate Traditional Chinese text confirmed.
2. Correct V2 DSL/vanilla classification (vanilla only if truly no printed effect); all effects implemented with correct timing and target selection.
3. Regression tests include legal and illegal paths; no unsupported action silently becomes legal.
4. Card enters the ready battle pack only if independently accepted and stays consistent across deck editor, AI, and online battle.
5. No duplicate IDs from UA41ST reprints and no AP in the 50-card deck.

## Foundation files
- `dist/rnk/manifest.mjs`: stable IDs, reprint mappings, starter-only card names, AP prints, and explicitly non-ready inventory (the first seven rows include verified TC copy).
- `dist/rnk/cards-001-007.mjs`, `cards-008-014.mjs`, `cards-015-021.mjs`, `cards-022-028.mjs`: full Group A official Traditional Chinese 001–028 identity, cost, effect, trigger and source links; Japanese effects and runtime acceptance are not yet verified.
- `tests/v2-rnk-cards-001-007.test.mjs`, `v2-rnk-cards-008-014.test.mjs`, `v2-rnk-cards-015-021.test.mjs`, `v2-rnk-cards-022-028.test.mjs`: four independent seven-card acceptance-data guards.
- `tests/v2-rnk-manifest.test.mjs`: guards 113 numbered + one UAPR event identity, reprints, AP exclusion and false-ready flags.

## Effect-engine follow-up / printed wording edge case
- The Traditional Chinese UA41BT/RNK-1-011 text names the event 〈生存的意志〉, while UA41BT/RNK-1-027's own Traditional Chinese printed title is 〈求生意志〉. The Japanese title of RNK-1-027 is 〈生きようとする意志〉. Confirm canonical name mapping when implementing 011's once-per-turn main ability. Do not treat the two TC renderings as two different event cards.
- RNK-1-008 requires Raid, Damage(2), opponent blocker BP cap, own-turn BP, event recovery and once-per-turn BP grant; do not mark ready based on partial DSL support.
- RNK-1-018 requires safe deployment of the raid-bottom card from underneath the host, with temporary cannot-attack and end-of-attack retirement; verify card conservation and zone capacity.
- RNK-1-026 is a field and RNK-1-027/028 are events, not characters; keep their BP/gen/trigger semantics distinct from character entries.
- Catalog uses `confirmedTc:true` for audited TC data while `cardDataVerified:false`, `effectJa:null`, `battleReady:false` stay false until independent JP and V2 acceptance; this is intentional.
