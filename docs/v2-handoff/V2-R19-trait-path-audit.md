# V2 R19 — feature/trait matching call sites (source-pinned inventory)

Baseline: PR #78 `5340df340b1f587fab771b812ab8d875e41f4cce`.
No blanket slash split is authorized; real title adapter verifies `traitComponents`.
Full search of `dist/universal-v2/{engine,field-conditions,pack,ability-templates,ai}.mjs` at this baseline.

| Use site | Existing mode | R19 disposition |
| --- | --- | --- |
| `field-conditions.cardHasTrait` | audited `traits` or explicit `traitComponents` | **shared official-audited** |
| `ownTraitCount`, `ownRestPrintedBpCount` | `cardHasTrait` | maintained |
| `ownFieldTraitKinds` | explicit verified components; unverified string whole | maintained; distinct kinds, not cards |
| `engine.matchesFilter` (deck search, top-N selection, outside recovery, field buff targeting, replay recheck) | unsafe splitting every `／` or `/` | **Batch A replaced with `cardHasTrait`** |
| `legalUniversalActions` main two-mode trait buff and `chooseTwoAfterOwnRaid` mode gate | exact `.traits.includes` | **Batch A reused `cardHasTrait`** |
| `engine.buffOwnTrait`, `buffOwnTraitAllTurn`, `effect-buff-trait`, `main-two-buff` resolved target | `cardHasTrait` | maintained from R18 |
| `inspectTopTraitOutside` top window selection and UID revalidation | original printed **exact trait token** | **retained fail-closed** by prior R18 source contract, not automatically split. Source MST-1-065; verify all future FAQs before reinterpreting |
| `pack` printed `traits`, printed aliases, `traitComponents` validator | immutable source-pinned identity | maintained; validator checks declared components against one printed composite |
| `pack` Raid legality, base name / `raidFromRaid` | printed name/alias, **not** trait equivalence | **not** converted to traits |
| `engine` color/energy/Impact live bonuses | delegated `matchesV2LiveCondition` | maintained; no speculative parsing |
| Trigger effect/queued delayed trait checks | use same `matchesFilter` or explicit exact-token top-window contract | previous split removed; no ability guessing |
| AI / human private selection | `legalUniversalActions` shared gate | maintained; one legal-action set |

Cross-title probes: verified SLG-1-065/069/072 vs SAO-1-009 original token and synthetic unverified slash; BLEACH unchanged by selector implementation. `inspectTopTraitOutside` intentionally not changed. Global FAQ certification remains zero.
