# MHA 89 張整合基準

這份提交就是 B、C、D 的新基準。分支是 `cursor/v2-mha-final20-integrate-65f8`。

來源只移植各支尚未進 `main` 的修改：#454 的五個提交、#457 的一筆、#461 的一筆、#458 的一筆、#460 的一筆。沒有重放這些提交的共同祖先。

最新 `main` 的 IMC 與線上介面都留在這條分支，包含 #449、#452、#455、#456、#459。沒有整檔覆蓋 `dist/app.mjs`、`dist/index.html`、`dist/styles.css`、`dist/clean.css`、`dist/online.mjs` 或線上樣式。

## 清點

IMC 113／113，`playable:true`。MHA 89／109 ready，20 pending，`playable:false`。`UA10ST_PRODUCT.recipe` 維持 null。

已進包、這輪不要再寫一次的是 #457 的 003、005、011、026，以及 #461 的 055、060、062、066、072、076、081、084。

仍 pending：002、004、020、023、025、029、030、031、033、035、038、042、045、085、090、091、095、096、099、100。

## 可沿用的共用操作

#460 的契約在 `docs/v2-handoff/V2-MHA-shared-next.md`。已在引擎裡、不要重寫的是 `gainSameLineMains`、`facedownKeywordThresholds`、`bpPerDirectFacedown`、`lookUnderToHandThenActive`，以及 `retireOppFrontUnderBp` 的 `handAtMost`。

後續提交請從這個 SHA 開分支。逐張改自己的程式與測試，不要整檔覆蓋別人的檔案，也不要把未完成卡標成 ready。

這個 SHA 的清點是 89 ready、20 pending。後面的提交若把已能寫完整句的卡進包，以該提交的程式清點為準，不回改這一段。

038 與 099 的整句已由上面的共用操作涵蓋，之後的提交把它們進包。那一筆的清點是 91 ready、18 pending。002、004、091、095、096、100 仍待整句。

100 隨後用 `thenRestAll` 把強制退場和其後的全體休息寫成同一句。那一筆的清點是 92 ready、17 pending。

最後八張的共用契約在 `docs/v2-handoff/V2-MHA-final8-shared.md`。上面的 89 張 SHA 與清點沒有改寫。
