# Batch 22 — purple BLC-1-042 completes native delayed-energy color family

Source-verified BLEACH card BLC-1-042 茶渡 泰虎, purple 0 / AP1 / BP1000 / gen1 / no Life icon, printed MAIN once per turn physical REST self to generate additional purple1 only this turn, retire genuinely at MAIN end.

The repository's CARDS adapter merges official UA08BT booster record and UA08ST starter printing: authoritative normalized record points to UA08ST/BLC-1-042 (official JP cardlist) with source body '主要階段・每回合 1 次：REST 自己，本回合多產生 1 紫能源；主要階段結束時退場。'. UA08BT text expresses the same core semantics but is a distinct literal translation. Strict fingerprint pins the merged STARTER source and audit refuses a drift to BOOSTER text without new source review. No guessed aliases or source-field overwrite.

Reuses the existing universal V2 restSelfGainEnergyRetireEndMain (energyOnly, oncePerTurn, extraEnergy1) shared across BLEACH yellow/green/blue, MST blue, TTG red, SLG purple. Color-agnostic engine provides five printed color examples across titles with no per-title reducer. Actual-case regression tests cover official text/booster discrepancy, both physical owner indices, AP/UID, no opponent-color leakage, REST/FRONT illegal activation, delayed retirement at end MAIN, Life none, and state conservation.

After exact HEAD green CI: BLEACH 85/276, TTG 29/81, SLG 32/80, SAO 56/183, MST 28/80 = 230/700 candidate cards, 470 blocked. Full independent official FAQ acceptance 0. No merge to main, deployment or manual mobile QA.