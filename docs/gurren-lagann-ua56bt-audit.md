# UA56BT — 天元突破グレンラガン Integration Audit

Status: **PARTIAL / NOT PLAYABLE**. This file is an evidence and implementation ledger, not a claim of coverage.

## Sources checked (2026-10-12)
- JP official: https://www.unionarena-tcg.com/jp/cardlist/ (search by product UA56BT).
- TC official: https://www.unionarena-tcg.com/tc/cardlist/
- JP FAQ: https://www.unionarena-tcg.com/jp/faq/list.php?category=カード個別&sub_category=天元突破グレンラガン
- Official correction (2026-08-28): https://www.unionarena-tcg.com/tc/news/033.php

## Required integration boundaries
- Keep the current 276 BLEACH card identities and presets unchanged.
- UA56BT card numbers must be unique across titles; parallel art shares the gameplay identity and 4-copy allowance.
- Deck validation must reject cross-title mixes. Color mixing alone is not sufficient to detect this.
- Enforce authoritative per-card energy, AP, BP, generated energy, type, traits, triggers, rarity, effect, and variant artwork.
- Do not enable automatic gameplay for imported cards until all effects and relevant FAQ rulings are implemented, tested, and verified.
- No embedding of official card images without suitable permission; use labeled placeholders and official source links.

## Verified example
**UA56BT/TTG-1-081 — ギガドリルブレイク** — U, red 4 required energy, 1 AP, event, SPECIAL trigger, official source:
https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-081

**Corrected main effect (also applies to parallels)**: choose and retire one opponent **front-line** character with BP <= 3000. If Simon or Kamina is on your field or among the raid bases under one of your characters, the threshold is BP <= 5000 instead. The printed wording saying opponent's whole field is wrong. The SPECIAL trigger targets an opponent front-line character.

## Missing work before release
- Official UA56BT exhaustive card/parallel inventory: **NOT VERIFIED**.
- Full per-card metadata and local display placeholders: **NOT IMPORTED**.
- Artwork permission review: **PENDING**.
- Product selection, cross-title deck editor and AI deck selection: **NOT IMPLEMENTED**.
- Every UA56BT automatic ruling and state transition: **NOT IMPLEMENTED**.
- Specific layered Raid, face-down-under-card behavior, energy changes and FAQ as of 2026-10-09: **NOT IMPLEMENTED**.
- UI smoke checks and `npm test`: **NOT EXECUTED in the connector environment**.

**Effect completion rate for UA56BT: 0 confirmed fully implemented / total not yet verified.** Do not advertise 100% coverage.
