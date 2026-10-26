# TTG next six — registration, not full FAQ certification

Branch `cursor/ttg-next-six-9146`. These six UA56BT cards are registered on the shared V2 engine with scenario tests in `tests/v2-ttg-next-six.test.mjs`. Passing those tests is not official FAQ acceptance.

| Card | Shared ability |
|---|---|
| TTG-1-011 シモン | Energy at least 8 gives BP+1500 on either turn. Main, once per physical card, chooses energy +1 or front-line generation until the next own start. |
| TTG-1-016 ニア | On play, put up to 2 hand cards outside and draw that many. REST main at energy 20 draws 1, once per printed name ニア (Q2268). |
| TTG-1-035 時空烈断バーストスピニングパンチ | Remove one opponent front character at BP 3000, or 5000 when own field or raid base `stack[0]` is シモン. Removal does not retire. SPECIAL life stays the shared retire. |
| TTG-1-041 それが俺達 大グレン団だ! | Choose any number of own 大グレン団 characters with different printed names. Each gains count × 1000 BP this turn. Q2284 is cited as the question plus the printed formula. |
| TTG-1-048 キタン | The first own-character attack grants BP+500, impact null, and double block until the next own start. |
| TTG-1-076 ラガン | Paid Raid on シモン enters active. On play, look at the top 2, add 1, put the rest outside, then draw 1 and discard 1. |

Official text and the Chinese catalog disagree on three timings. The engine follows the note in `dist/universal-v2/title-packs/ttg.mjs`:

- TTG-1-011 BP+1500 is not limited to the controller's own turn. The catalog says 自己回合. The official sentence that remains has no own-turn limit.
- TTG-1-016 keeps the catalog REST cost and the energy-20 gate. Official HTML stripped the REST glyph. Q2268 makes the draw once per name per turn.
- TTG-1-076 draw-then-discard is on play. The catalog adds a REST main that the official sentence does not print.

TTG-1-033 アークグレン is still unregistered. This batch does not close raid chains, facedown permissions, the energy-100 print, or the Nia/Kamina play lock.
