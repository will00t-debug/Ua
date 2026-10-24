# UNION ARENA V2 — R49 共用支付／FIELD 登場／三模式組合驗收

日期：2026-10-24　工作 PR：#78（Draft，base `cursor/v2-multi-retire-life-6ff5`）

**登錄政策：沒有完成完整真卡效果，禁止加入 registry。** R49 新增跨作品共用原語，但尚未將 BLC-4-042 或 BLC-2-044 移植到正式 V2。R48 基準 337／700；最新數量須由 `node scripts/v2-unported-report.mjs` 重算。全面獨立 FAQ 認證依舊 0。

## Batch A — 同一選擇原子支付 2 個 HAND 實體 UID

- 基於既有 `discardGate`（沒有新 reducer、佇列或 AP 系統），加入選用 `count:2`。對外 UI legal action 使用 `{type:'chooseDiscardGate',uids:[ownUidA,ownUidB]}`，每對不同 UID 僅列一次；Human/Normal/Hard 共用同一合法清單。
- 兩個 UID **先一次驗證合法**，然後於**同一個 dispatch** 把兩張 HAND → OWN OUTSIDE。原子性：沒有部分費用可啟動 follow-up；遇到非法、偽造及過期 UID 時原始 match 不變。選擇 `uid:null` 於支付前不付兩張，且不排隊任何後續效果。所有 MOVE 皆記錄 `reason:'payment'` 與原有 `sourceUid`。不存在「棄第一張後暫停、可存檔重試第二張」的半付款狀態。
- 僅 count=2 或既有缺省 count=1 有效，count=3 或不合法 JSON 鍵拒絕。序列化待決操作核對真實來源印刷程式中的 `discardGate` count、optional、payment 與 then，不可假造待決回收。
- PRIVATE choices 包含兩卡名稱供控制玩家 UI 呈現；對手 PUBLIC view 不暴露 HAND UID/卡名。測試：`tests/v2-r49-atomic-two-hand-cost.test.mjs`。此測試使用特製合法 50 張模型牌組驗證**共用原語**，不是聲稱 BLC-4-042 整張官方認證。

## Batch B — 真正印刷卡名多選一場外回收

- `recoverOutsideOne` 嚴格新增 `filter:{field:'printedNameAny',values:['涅 マユリ','涅 ネム']}`；使用 `printed.name` 精確匹配，不用 trait、更不以不同日文卡名／alias 猜測等同。
- 支付兩張後才重新掃描**目前** OWN OUTSIDE。無合法回收目標時本效果不憑空造卡；可合法回收0張。禁止重複 values、額外鍵、空陣列或單名冒充兩名。
- 同樣驗收完整物理 UID 移動、AI、人類及序列化。既有單名 `name` filter 和其它 FILTER 不改語意。

## Batch C — 真實指定名稱 FIELD 免費 ACTIVE 入 ENERGY

- 擴充原本 `deployNamedFromZones`，選用 `cardType:'field'`；只允許 `zones:['hand']`、`line:'energy'`、`ready:true`、合法 COLOR/AP/required-energy 指定條件、沒有無關 grantBp。其它普通 CHARACTER 登場和 ACTION 仍然使用同一套原有選擇引擎。
- FIELD 必須符合**印刷卡名和色彩**，同 trait 的其它名字不能冒充；真實 `hand → energy`、新 `fieldEntryStamp`、onPlay 次級結算、零額外正常手牌 AP、UID 守恆、AI/Human 一致。
- 嚴格新增 pending 來源驗證並核對選擇清單。測試：`tests/v2-r49-named-active-field-entry.test.mjs`，特製模型牌組，非完整 BLC-2-044 認證。

## Batch D — 其他角色真正退場後接續 FIELD，三選一實際可執行

- 擴充既有 `retireOwnCharacterOne`，嚴格限定 `excludeSelf:true`＋後續 `deployNamedFromZones(cardType:'field')`；保留 legacy 退場後 draw 路徑。
- 自己本體 UID 永不能選；選 0 張（不退場）則絕不執行 FIELD 入場；合法真正退場完成後依既有 onRetire 時序，然後進到共用 FIELD 選擇。pending 來源、候選及後續程式不可偽造。
- 擴充既有 `chooseOne` 所允許 nested effect：`inspectTopAnyOutside`（TOP2 任意0/1/2 OUTSIDE、剩餘依次序回 TOP）、`discardGate(count2)`、`retireOwnCharacterOne(excludeSelf)`。一旦選定 A/B/C，只執行該模式，不會洩漏/跨模式。
- `tests/v2-r49-three-mode-live-integration.test.mjs` 實際測試 3 個模式的合法 ACTION、支付／退場、FIELD ACTIVE 登場、onPlay 與保存。**模型牌組不是 BLC-4-042 完整移植**。

## Batch E — 來源釘選、五作品實際動態重掃、集中 CI

- 先前 R48 `capabilityIndex()` 與 R46/R47/R48 報告保留，新增 `scripts/v2-r49-unported-reuse-report.mjs` 重算五作品當下 registry 的補集，每次動態檢查 700 個來源，按雙手費、指定場外回收、免費 ENERGY、真退場接續、複合選擇提出文字候選。
- 未逐卡官方全文審核者一律 **REVIEW PENDING**；完成語意審核但欠其它印刷效果者 **PARTIAL**。不會因相似片語直接變 READY，也不另存第二套卡牌資料庫。
- `tests/v2-r49-unported-rescan.test.mjs` 確保母體/各作品未移植 UID 守恆。另 `tests/v2-r49-blc042-044-official-source-pins.test.mjs` 明確證實 Legacy `BLC-4-042 gen=3` 不等於官方藍產 2，而 `BLC-2-044` 是藍 FIELD、不是 CHARACTER；二者仍未註冊。
- 所有動態候選仍須逐張核對官方日文印刷、適用 FAQ 及實際 50 張合法真卡牌組後才能登錄。

## BLC-4-042 — 現在的準確狀態：PARTIAL（不是 READY）

官方：https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-042　FAQ Q2323。

R49 的通用模式 A/B/C 都已能在完整 50 張合成牌組中**實際操作**，但整張官方 BLC-4-042 還缺：

1. 獨立修正/釘選 BLC-4-042 官方印刷 BLUE 基礎產能 2 與 Legacy gen=3 不符，再將三種模式共用 DSL 寫到真正官方卡牌定義，補上 DRAW LIFE、印刷 AP/能源/BP 的合法遊玩。
2. BLC-2-044〈涅骸部隊〉場地本身還有**兩種不同 MAIN 效果**；至少其完整來源卡文和互不共用的 once-per-turn、真退場成本、REST FIELD 費用、退場條件後全體 BP buff 都要確認與驗收，不能只把它變成簡化無能力 FIELD 充數。
3. 真實 50 張 BLEACH 牌組中進行完整實戰、0/1/2 TOP、真兩 UID 付款後回收0或1名「涅 マユリ／涅 ネム」、FIELD 登場、DRAW LIFE、保存、對手私有牌保護及跨作品。尚未逐張完成。
4. 先前留下的 BLC-4-069 Q2337/Q2338，真正特徵「花天狂骨」卡 BLC-4-076／077／081 與其全卡效果，仍為另一條 PARTIAL 工作序列。

## 長期安全與下一輪優先序

優先真正解鎖 BLC-2-044 的**同一 FIELD 上兩個相互獨立 MAIN 能力**，不要建立 BLEACH 專屬 reducer；回查其它五作品可重用卡後完整移植。接著將 BLC-4-042 三模式掛到真正 source pin 並完整整卡驗收；第三優先處理「花天狂骨」來源與 BLC-4-069 攻擊結束換位、下一張手牌 AP 折扣。另保留 MST-1-067 Q2162、BLC-4-034 裏向底卡與退場、第二批巢狀 LIFE 及合併 AP＋棄手費用裁定疑義。

不合併 main、不部署 Vercel、不修改 Cursor PR #77、不 force push；所有證據以 **最新 HEAD 的 GitHub Actions SUCCESS** 為準，不能沿用前一個綠燈。全面獨立 FAQ 認證仍為0，通用原語及個別整卡驗收不可混淆。
