# Batch 15: TTG-1-006 own energy threshold

On 2026-10-21, TTG-1-006 reused the existing cross-title `ownEnergyAtLeast` passive predicate. Commits: 06d5596 (card/roster), b578cfc (six independent TTG-vs-SAO tests), 7740954 (evidence CSV and exact-count regression repair). The source is a user-supplied TTG card-front PDF preserved in the repository; this is not full independent official FAQ certification.

Verified CI on 7740954: Node 22 npm test 1281/1281 pass, five-title seeded match matrix 60/60 completed with 0 failures, unported report success (218/700 registered, 482 unported, 0 full FAQ certified). Isolated SAO/MST QA also success. Exact title counts: BLEACH 80/276, TTG 28/81, SLG 32/80, SAO 54/183, MST 24/80. No main merge, production deployment or force push.

Next: prioritize a new shared rule from fully verified official MST/BLEACH/SAO/TTG text. MST-1-007 has a printed onPlay choice of two modes, but requires own-effect entry provenance and must not be partially registered. MST-1-003 uses two-name AND board presence, and MST-1-013 uses onRetire draw; audit reuse and FAQ before implementation.
