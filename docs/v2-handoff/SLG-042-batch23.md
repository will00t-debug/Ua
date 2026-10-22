# Batch 23 — SLG-1-042 errata-aware GREEN energy MAIN

Source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-042

Original source `dist/solo-leveling.mjs` explicitly transcribes 2026-04-17 official errata-corrected Japanese name 馬渕 勲. Printed GREEN0/AP1/BP1000/gen1/no Life; complete MAIN: once per own turn REST self, generated GREEN+1 for this turn; retire this character at end MAIN. No silent fallback to old solo engine. Reuses the native shared V2 `restSelfGainEnergyRetireEndMain` already source-verified for SLG-1-013 (purple), TTG-1-063 (red), BLEACH yellow, green, blue, purple, and MST blue.

Independently updated `audit/v2-c-slg-status.csv`, formal title evidence, independent literal roster and exact five-title inventory. Dedicated test validates printed fingerprint, owner 0 and 1 actor/AP/green only, hidden hand, physical UID retirement at MAIN exit, once-per-turn, wrong actor/REST/FRONT and source forgery negative cases.

Expected after green CI: 231/700 candidate, 469 unported (BLEACH 85 TTG 29 SLG 33 SAO 56 MST 28); fully per-card FAQ certified 0. No main merge or production deploy.