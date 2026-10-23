# UNION ARENA V2 R46 — Batch A real atomic source-limited hand tax

Date 2026-10-23; GPT Draft PR #78, original branch gpt/v2-resume-20261022 → cursor/v2-multi-retire-life-6ff5. No main merge, Cursor PR change, deployment or force push.

- Reuses R45 selectionHandDiscardTaxPlan and existing legalUniversalActions, target pending, physical hand-discard/move journal, effectQueue and optional TARGET skip.
- Strict profile and source class persisted in normalized cards; only CHARACTER grants audited Q978/Q1208 selection taxes.
- Q1119 EVENT mandatory preflight excludes the EVENT itself from its remaining playable hand, before printed AP payment.
- Selecting a taxed UID enters a serializable payment pending; physical OWN hand UID is sent hand→outside with reason payment BEFORE completing the selected target effect. Other legal targets remain available and same-group auras do not stack.
- Unsupported combined AP+hand surcharge and multi-target costs stay blocked, along with unknown/unproven provenance. Trigger is never inferred to be EVENT.
- Tests: source-pinned *synthetic* 50-card pack, Q1119 preflight, real payment, UID ledger, JSON resume, duplicate auras, alternatives and forged pending negatives.
- No SAO-2-064 or SAO-1-087 formal card registration or full independent FAQ acceptance is claimed; official full-card migration and unported R35–R45 rescans remain next.
- CI status for this exact commit must be checked independently; no historical green-light inheritance.

## Batch B SAO-2-064 — official full source, pending exact-SHA CI
The real official EX08BT/SAO-2-064 Q1208 is imported by exact Japanese print and printed characteristics; shared R45 Q1208 aura in original SAO source pack, human/AI/physical UID choice, onPlay CHARACTER source, no-hand, duplicate FRONT, ENERGY Asuna, DRAW LIFE, 50-card valid registered real SAO. Added independent literal manifest and R35 partial review; status is NOT complete independent FAQ certified. R45 five-title roster scanners execute in CI. SAO-1-087 / BLC-4-069 / BLC-4-042 remain unported until whole effects work. Full remote SHA CI pending.
