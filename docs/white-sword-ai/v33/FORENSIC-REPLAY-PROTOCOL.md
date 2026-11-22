# 白劍 v3.3-T：26 個單步替代動作的驗證規範

本檔只用於實驗分支的測試紀錄和評估界線，不更動對戰邏輯、模型權重、正式版 v2 或任何部署設定。

## 要完成的重播

- 先以先前已使用的 pilot seeds 48660–48663 重播 48 場，確認仍為白劍 v3.3-T **29/48**，且所有場次完成，非法動作、fallback、死循環均為 0。
- 根據同批局面之 `MARGIN-AUDIT.json` 已識別的 **26 個合法 Hard-capped 替代動作**，每個局面只強制替換一手，後續雙方照原 AI 重新決策。
- CI 順序：`node scripts/white-sword-v33-margin-audit.mjs` 後執行 `node scripts/white-sword-v33-counterfactual-pilot.mjs`。
- 將 `MARGIN-AUDIT.{json,md}` 與 `COUNTERFACTUAL-PILOT.{json,md}` 作為 GitHub Actions artifacts 保存；失敗應明確標出失敗步驟和 seed，不可用部分結果宣稱成功。

## 須整理的結論

1. 26 個案例中，替代後 **輸變贏／贏變輸／勝負不變** 分別幾個。
2. 依原動作→替代動作、對手牌組、主階段決策類型彙整；說明哪些例子涉及 AP/能源、登場與 Raid/攻擊節奏。
3. 將 Hard 搜尋原本偏好的替代動作另列，不把 Hard 的評分當作必然正確答案。
4. 優先列出至少 3 個可以重播的典型局面：seed、座位、步驟、回合、原始動作、替代動作、兩者分數差與後續勝負；勿記錄未公開手牌、血區或牌序給 AI。
5. 結論僅供診斷。相同 seed 的改手重播 **不是獨立、盲測或策略勝率估計**；出牌分歧會改變後續血區翻牌時點，不可以將單次翻盤直接歸因於該步。
6. 下一個候選必須先提出單一可解釋的策略假設，使用尚未使用的新種子另行驗證；不得直接根據這 26 個已見案例選倍數或調權重。

## 安全界線

- **不得**合併 main、不得部署、不得自動晉級候選。
- 保留 v2 的 48-node Hard Search 2、root cap 7、hidden-information invariance。
- 原本獨立驗證 seeds 48700–48729 與歷史 final holdout 94000–94016 不得觸碰。
