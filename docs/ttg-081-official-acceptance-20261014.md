# UA56BT/TTG-1-081 official acceptance continuation — 2026-10-14

Branch: `audit/ttg081-official-20261014` (based on `audit/ttg078-080-official-20261014`).
Draft PR: https://github.com/will00t-debug/Ua/pull/60
Status: **tests committed; NOT full-card certified**.

## Official authority
- JP official detail: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-081
- JP card FAQ Q2301 (updated 2026-08-21) corrects the **normal hand event**: retire **one enemy FRONT-line character** BP <= 3000, or BP <= 5000 when a Simon or Kamina is in the user's field or among one of their Raid bases. Do not use erroneous printed whole-field wording.
- Printed **SPECIAL life trigger**: retire one enemy **FRONT-line** character, with no printed BP ceiling.
- Generic life-trigger FAQ Q99: player may choose not to activate the trigger.

## Tests added
`tests/ttg-official-acceptance-081.test.mjs`
1. BP 3000 legal / 3001 illegal; opponent energy-line excluded.
2. Own Simon enables BP 5000 but not BP 5001; protected targets excluded.
3. Simon under Raid counts; normal event AP payment; targeted enemy Raid stack leaves for outside without duplication.
4. SPECIAL can retire high BP target or decline; energy line is never a target.

## Adjacent repair
Corrected `tests/ttg-official-acceptance-078-080.test.mjs` to use a **non-Kamina** red energy generator for 080's negative precondition case. The former fixture used TTG-1-042 Kamina and invalidated the purpose of the no-Kamina assertion.

## Remaining and non-claims
- GitHub Actions Node 22 end-to-end run: **no workflow run/status available for latest commit when checked**; never call this passing.
- Physical mobile UI, two-player hidden information, 073 leave-replacement timing, SPECIAL queue after Damage 2 and empty-deck FINAL interactions require further acceptance.
- Earlier TTG 001–080 test branches contain specific verified scenarios, not 80 fully certified cards.
- Do not merge to main, enable unverified auto flags, or deploy to Vercel.
