# UNION ARENA 通用 V2 — 雙作品全真 50 張對戰里程碑

**狀態：實驗 Draft PR #70；不合併 main，也不取代線上正式版本。更新：2026-10-15。**

## 最新可驗證的開發範圍

- **V2 官方印刷卡號 Pilot：BLEACH 15、天元突破 20，共 35 張。** 與全卡完整 FAQ 驗收不同；其他卡仍不在可玩白名單內。
- **可重用效果模板：25 種。** 另外有 Raid、ACTIVE 特殊產能、IMPACT 無效等受控特殊規則。
- **BLEACH 紫色全真牌組 50 張：** `dist/universal-v2/verified-real-decks.mjs` 的 `verifiedBleachPurplePilotDeck()`；官方紫色印刷卡號 12 種各 4 張，加 2 張 FINAL；不含虛構卡。
- **天元突破紅色全真牌組 50 張：** `verifiedTtgRedPilotDeck()`；官方紅色印刷卡號 13 種，其中 12 種各 4 張、TTG-1-073 兩張，COLOR TTG-1-045 共 4 張，無其他 SPECIAL/COLOR/FINAL；不含虛構卡。
- 新增 `tests/universal-v2-ttg-vs-bleach-real-decks.test.mjs`：**兩副全真 50 張跨作品 AI 整局對戰**、合法組牌、特殊卡效果選牌、私密視圖、同回合首次攻擊、Raid 返回手牌，以及全程每位玩家 50 實體 UID/印刷卡號守恆。
- 保留 BLEACH 紫色 50 張鏡像 AI 對戰回歸 `tests/universal-v2-bleach-real-deck.test.mjs`。
- 新增 TTG-1-047（第一次己方角色攻擊時自身 +1500 BP）、TTG-1-049（登場必回收其他己方需求能源 1 以下角色，無法則自己返回手牌）、TTG-1-052（登場可棄 1 張牌、成功支付後可回收場外需求能源 ≤2 的紅卡）三張。卡片照原本 81 張官方卡表 `dist/gurren-lagann.mjs` 讀取，並**沒有**偷偷增加第 82 張或打開原本 `auto:false` 的舊系統旗標。
- 官方 Q62：Raid 角色回手時僅最上層回手，底板／附屬裏向卡全部送己方場外。新 V2 泛用 `bounceToHand` 遵守此規則，並以合成 Raid 堆疊對局額外驗證。

## 本批主要官方核對來源

- [TTG-1-047 キタン](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-047)
- [TTG-1-049 ギミー＆ダリー](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-049)：沿用倉庫內已有卡片正面 PDF 轉錄；官方網頁曾無法直接讀取，仍需獨立完整 FAQ 核對
- [TTG-1-052 シモン](https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-052)
- [Union Arena 日本官方 Q62 Raid 退場／回手處理](https://www.unionarena-tcg.com/jp/faq/list.php?type=0)
- BLEACH BLC-1-036 的官方 Q556：牌庫不足時，仍將實際剩餘張數送場外。

## 限制與後續

**通用引擎已有跨作品全真 50 張測試案例，不表示 35 張卡均通過所有官卡 FAQ，或全部約 700 張都能玩。** 這仍是在 Node.js 測試運行的 V2 戰鬥引擎，尚未完成正式網站 UI 對接、實體手機完整流程與 AI 難度強度驗收。自動化對局測試可以驗證結算能正常完賽，但不能代替實際逐卡裁定驗收。

接著針對天元 049/052/047 和 BLEACH 已移植卡逐張擴充極端時序測試，補特殊常駐效果及卡片來源核對；再增加第三個作品的第一副全真 50 張牌組。每次加卡都保留明確 allowlist、官方來源連結、實體卡守恆，與不干擾 Production 的邊界。
