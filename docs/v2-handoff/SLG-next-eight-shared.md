# SLG next eight shared batches

Official pages checked 2026-10-26. These eight prints are registered on the shared V2 engine. Passing tests are not full official FAQ acceptance. `fullyAccepted` stays 0.

| ID | Print | Shared behavior |
| --- | --- | --- |
| SLG-1-024 | 道門 泰星 | Current BP 4000 or higher cannot block this character. On retire the opponent may grant that same this-turn rule to one of their field characters. |
| SLG-1-067 | カナ | OnPlay with 3 own DFN cards: draw 1, ACTIVE self, BP+1000 this turn. Name gate. A failed count does not spend it. COLOR deploys a green hand character. |
| SLG-1-057 | 向坂 雫 | OnPlay with 5 own 第四次架南島レイド cards: ACTIVE self and store an on-attack skip-next-ACTIVE. The skip is applied when it attacks. COLOR is the same hand deployment. |
| SLG-1-003 | 朝比奈 りん | Own-effect outside-to-hand chooses up to one own character for BP+1000. Ten or more own outside cards add 1 generated energy. The catalogue attack peek is not on the official print. |
| SLG-1-039 | 影の君主 | Choose one: up to one own outside 影の軍団 enters ACTIVE, or up to two with energy 3 or less enter REST. SPECIAL is the generic front retire. |
| SLG-1-077 | 架南島レイド攻略開始 | Retire an opponent front character at BP 2000, or 5000 when five own island-raid cards are present. Five distinct printed names may give one own character BP+1000. |
| SLG-1-019 | 水篠 旬 | Outside MAIN discards one hand 影の軍団 and adds this card to hand, once per name. OnPlay may discard one and then draw 1. |
| SLG-1-060 | 町田 堂玄 | Impact null. At the end of the own attack phase, an energy-line copy may swap with a front character that has an unconsumed skip-next-ACTIVE. Q2059. |

New shared operations: `grantOppBlockAtLeast`, `grantSelfAttackSkipThisTurn`, `deployOutsideFiltered`, `ifLiveThen`, `swapEnergyWithFrontSkip`, and outside MAIN `outsideDiscardTraitToHand`. `oncePerTurnGate` can take a live `when`. `retireOppFrontUnderBp` can scale its BP limit by an own trait count. `ownDistinctTraitNames` counts distinct printed names.

Filters use the official Japanese trait. Catalogue tokens such as 第四次架南島Raid and 影之軍團 are not filters. Compound DFN／第四次架南島レイド keeps audited components.
