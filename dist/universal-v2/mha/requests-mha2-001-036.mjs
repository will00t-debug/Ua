// EX06BT MHA-2-001 through 036 sentences that are not an existing shared
// operation. This file does not approximate a missing sentence and does not
// add an engine op. 037–073 stay in requests-2-037-073.mjs.
// FAQ ids are the official EX06BT list already stored on the catalog row.
// A request is not an FAQ acceptance. Each case is a scene A can implement.
export const MHA2_REQUESTS_001_036=Object.freeze({
 'MHA-2-003':Object.freeze({
  missing:'三種不同卡名的ワン・フォー・オール發生能源 +1 黃已有被動（extraEnergy、min 3、場上與場外、不分回合）。缺少：起動主要、休息，把 1 張該特徵手牌放到場外，做到才抽 1。',
  proposed:'mainAbility restPlaceHandTraitOutsideThenDraw，trait ワン・フォー・オール。沒有該特徵手牌就不能起動。放到場外之後才抽 1。',
  cases:Object.freeze([
   Object.freeze({setup:'003 在能量線且活動。手牌有 1 張煙（ワン・フォー・オール）和 1 張非該特徵。牌庫至少 1 張。',action:'起動主要。',expect:'003 休息。只能選煙放到場外。抽 1。非該特徵不能選。'}),
   Object.freeze({setup:'手牌沒有ワン・フォー・オール。',action:'查看合法起動。',expect:'這句起動不出現。'}),
   Object.freeze({setup:'場上與場外只有 2 種該特徵卡名，另有兩張同名。',action:'讀發生能量。',expect:'不加 1。三種不同卡名才加 1 黃。蓋放不算。'})
  ])
 }),
 'MHA-2-011':Object.freeze({
  faq:Object.freeze(['Q998']),
  missing:'在前排期間，自己場上的〈緑谷 出久〉不被對手寫有「選び」的效果選取。Q998 是選取範圍，不是登場時授予到下回合。沒有「在場期間保護指定名字」的被動。',
  proposed:'被動 whileFrontNameUnchosen，name 緑谷 出久，scope opponentChoose。011 離開前排就失效。',
  cases:Object.freeze([
   Object.freeze({setup:'011 在自己前排。自己場上有綠谷與另一張角色。對手使用「選び」退場前排。',action:'對手選擇目標。',expect:'綠谷不在選項。另一張角色可以選。Q998。'}),
   Object.freeze({setup:'011 改放能量線。',action:'同一個對手「選び」。',expect:'綠谷回到可以選擇的目標。'}),
   Object.freeze({setup:'011 在前排。',action:'對手普通攻擊或阻擋綠谷。',expect:'攻擊與阻擋不受這句影響。'})
  ])
 }),
 'MHA-2-016':Object.freeze({
  faq:Object.freeze(['Q1000']),
  missing:'退場時最多把 1 張自己的角色移到另一條線。Q1000：目的地滿格時先把 1 張放進移除區再移動。移線目前只掛在事件的登場選擇裡，不能掛在退場。',
  proposed:'onRetire mayShiftOwnCharacter，max 1，optional。目的地滿格時先選 1 張進移除區。',
  cases:Object.freeze([
   Object.freeze({setup:'016 退場。自己前排另有 1 張角色，能量線有空位。',action:'退場後選擇那張角色。',expect:'它移到能量線。可以不選。'}),
   Object.freeze({setup:'目的地能量線的 4 格都已有卡。',action:'把前排角色移向能量線。',expect:'先選能量線 1 張進移除區，再移動。Q1000。'}),
   Object.freeze({setup:'016 是唯一自己角色。',action:'退場。',expect:'沒有可移的角色，效果結束。'})
  ])
 }),
 'MHA-2-020':Object.freeze({
  missing:'登場二選一已能用 chooseOne：retireOppFrontOneUnderBp（BP 3000、optional）或 activeSelf。缺少起動主要：前排、休息、每回合一次，給 1 張〈緑谷 出久〉本回合 BP+1000 與衝擊 1，做到之後最多把這張卡或 1 張 AP 活動。',
  proposed:'mainAbility frontOnceNamedImpactThenActive，name 緑谷 出久，bp 1000，impact 1，thenActive selfOrAp，frontOnly，oncePerTurn。',
  cases:Object.freeze([
   Object.freeze({setup:'020 剛登場。對手前排有 BP 2500 與 BP 4000。',action:'選退場。',expect:'只能選 2500，也可以少選。另一項是把 020 活動。'}),
   Object.freeze({setup:'020 在前排且活動。自己場上有綠谷。本回合還沒用過這句。',action:'休息並指定綠谷。',expect:'綠谷本回合 BP+1000 且有衝擊 1。之後最多活動 020 或 1 張 AP。'}),
   Object.freeze({setup:'020 在能量線，或本回合已用過，或場上沒有綠谷。',action:'查看合法起動。',expect:'這句起動不出現。'})
  ])
 }),
 'MHA-2-024':Object.freeze({
  missing:'其他 A組 的手牌登場禁止與顏色觸發已有。攻擊時三種卡名可付 1 AP 獲得衝擊 1，已能用 optionalPayApThen（when 為 ownDistinctTraitNames、min 3）接 grantSelfImpactThisTurn。缺少：登場時本回合獲得「每回合一次，自己的ワン・フォー・オール退場時最多抽 1」。',
  proposed:'onPlay grantTraitRetireDraw，trait ワン・フォー・オール，oncePerTurn，until endOfTurn，optional，count 1。',
  cases:Object.freeze([
   Object.freeze({setup:'024 本回合已登場。自己的煙退場。牌庫至少 1 張。',action:'選擇抽牌。',expect:'抽 1。同回合第二張該特徵退場不再詢問。可以不抽。'}),
   Object.freeze({setup:'對手的該特徵退場，或輪到下一回合。',action:'觀察抽牌。',expect:'不再詢問是否抽牌。'}),
   Object.freeze({setup:'場上與場外有 3 種該特徵卡名。024 攻擊，有 1 點活動 AP。',action:'付 1 AP。',expect:'024 本回合獲得衝擊 1。只有 2 種卡名時不能付。不付就沒有衝擊。'})
  ])
 }),
 'MHA-2-026':Object.freeze({
  missing:'其他 A組 的手牌登場禁止、每種ワン・フォー・オール名字的手牌減能量，以及印刷衝擊 1，都已有欄位。缺少：登場時從手牌或場外把該特徵最多 1 張休息放到能量列。',
  proposed:'onPlay deployTraitFromZones，trait ワン・フォー・オール，zones hand 與 outside，line energy，ready false，optional，max 1。',
  cases:Object.freeze([
   Object.freeze({setup:'026 登場。手牌有煙，場外有避影，另有 1 張非該特徵。能量線有空位。',action:'選 1 張登場。',expect:'兩張該特徵都能選，非該特徵不能選。選中的休息進能量線。手牌與場外合計最多 1 張。可以不選。'}),
   Object.freeze({setup:'能量線 4 格都已有卡。',action:'026 登場。',expect:'沒有空位就不能放。'}),
   Object.freeze({setup:'場上另有非綠谷 A組。手牌有 026，場上與場外有 3 種該特徵卡名。',action:'嘗試手牌登場並讀必要能量。',expect:'不能從手牌登場。若沒有其他 A組，手牌必要能量是 8-3=5。生命區仍是 8。'})
  ])
 }),
 'MHA-2-029':Object.freeze({
  faq:Object.freeze(['Q1004']),
  missing:'休息並退場自己。場上與場外不同卡名的ワン・フォー・オール合計 3 種以上才可發動。選 1 張〈緑谷 出久〉，直到自己下個回合開始不被對手角色效果選取，也不能被狙擊指定，然後抽 1。Q1004。沒有這句場域起動。',
  proposed:'fieldRestRetireNamedProtectDraw，when ownDistinctTraitNames min 3，name 緑谷 出久，until nextOwnStart，scope opponentCharacter 與 sniper，draw 1。',
  cases:Object.freeze([
   Object.freeze({setup:'029 活動。場上與場外有 3 種該特徵卡名。自己場上有綠谷。牌庫至少 1 張。',action:'休息並退場 029，指定綠谷。',expect:'029 進場外。綠谷直到自己下回合開始，不被對手角色效果選取，也不能被狙擊。然後抽 1。Q1004。'}),
   Object.freeze({setup:'只有 2 種卡名，或場上沒有綠谷。',action:'查看合法起動。',expect:'這句起動不出現。'}),
   Object.freeze({setup:'保護仍在。對手用角色效果「選び」，以及用狙擊攻擊。',action:'選擇綠谷。',expect:'兩邊都不能指定綠谷。對手事件的「選び」不在這句範圍。'})
  ])
 }),
 'MHA-2-030':Object.freeze({
  missing:'自己回合、不同卡名的ワン・フォー・オール合計 3 種以上，而且〈緑谷 出久〉會因對手觸發離場時，可改退這張場域並把那張〈緑谷 出久〉休息。沒有觸發離場替代。',
  proposed:'mayRetireFieldInsteadOfTriggerLeave，when ownTurn 且 ownDistinctTraitNames min 3，name 緑谷 出久，then rest that character。',
  cases:Object.freeze([
   Object.freeze({setup:'自己回合。3 種該特徵卡名。030 在場。綠谷會因對手觸發離場。',action:'改退 030。',expect:'030 進場外。綠谷留在原位並休息。可以不改退，綠谷就照觸發離場。'}),
   Object.freeze({setup:'對手回合，或只有 2 種卡名，或離場原因不是對手觸發。',action:'觀察替代。',expect:'不出現替代詢問。'})
  ])
 }),
 'MHA-2-031':Object.freeze({
  missing:'休息並退場自己。不同卡名的ワン・フォー・オール合計 3 種以上才可發動。選 1 張〈緑谷 出久〉並活動。現有場域休息退場的後續不是活動指定名字。',
  proposed:'fieldRestRetireActiveNamed，when ownDistinctTraitNames min 3，name 緑谷 出久。',
  cases:Object.freeze([
   Object.freeze({setup:'031 活動。3 種卡名。綠谷在場且休息。',action:'休息並退場 031，指定綠谷。',expect:'031 進場外。綠谷活動。'}),
   Object.freeze({setup:'只有 2 種卡名，或沒有綠谷。',action:'查看合法起動。',expect:'這句起動不出現。'})
  ])
 }),
 'MHA-2-032':Object.freeze({
  missing:'休息、付 1 張手牌到場外並退場自己。不同卡名的ワン・フォー・オール合計 3 種以上才可發動。給 1 張〈緑谷 出久〉本回合狙擊。沒有這句支付。',
  proposed:'fieldRestPayHandRetireGrantSniper，payHand 1，when ownDistinctTraitNames min 3，name 緑谷 出久，until endOfTurn。',
  cases:Object.freeze([
   Object.freeze({setup:'032 活動。3 種卡名。手牌至少 1 張。綠谷在場。',action:'休息、付 1 張手牌到場外、退場 032、指定綠谷。',expect:'綠谷本回合獲得狙擊。'}),
   Object.freeze({setup:'手牌 0 張，或只有 2 種卡名。',action:'查看合法起動。',expect:'這句起動不出現。'})
  ])
 }),
 'MHA-2-033':Object.freeze({
  missing:'休息並退場自己。不同卡名的ワン・フォー・オール合計 3 種以上才可發動。給 1 張〈緑谷 出久〉本回合 BP+2000，然後抽 1。沒有這句後續。',
  proposed:'fieldRestRetireBuffNamedDraw，when ownDistinctTraitNames min 3，name 緑谷 出久，bp 2000，until endOfTurn，draw 1。',
  cases:Object.freeze([
   Object.freeze({setup:'033 活動。3 種卡名。綠谷在場。牌庫至少 1 張。',action:'休息並退場 033，指定綠谷。',expect:'綠谷本回合 BP+2000。抽 1。'}),
   Object.freeze({setup:'只有 2 種卡名，或沒有綠谷。',action:'查看合法起動。',expect:'這句起動不出現。'})
  ])
 }),
 'MHA-2-036':Object.freeze({
  faq:Object.freeze(['Q1005','Q1006']),
  missing:'場上要有 3 張其他 A組 才能使用。最多選兩個不同句子，依印刷順序結算，不能選同一句兩次。Q1005、Q1006。三句是：休息最多 1 張對手前排；從手牌把付得起的黃 A組、AP 1 最多 1 張活動登場或突襲；自己場上全部角色本回合 BP+1000。現有二選項形狀對不上這三句。',
  proposed:'event onPlay choosePrintedOptions，when 場上非綠谷 A組至少 3，max 2，order printed。三句依序是 restOppFrontOne optional、deployHandActiveOrRaid（yellow、trait A組、ap 1、付得起）、buffOwnField 全部角色 bp 1000。',
  cases:Object.freeze([
   Object.freeze({setup:'自己場上有 3 張非綠谷 A組，另有 1 張綠谷。手牌有付得起的黃 A組 AP 1。對手前排有角色。',action:'選第一句與第三句。',expect:'先休息對手前排最多 1 張，再讓自己全部角色本回合 BP+1000。不能先做第三句。Q1006。'}),
   Object.freeze({setup:'場上仍有 3 張非綠谷 A組。',action:'選同一句兩次。',expect:'不能選同一句兩次。Q1005。'}),
   Object.freeze({setup:'非綠谷 A組 只有 2 張。',action:'使用 036。',expect:'不能使用。綠谷不算進這 3 張。'})
  ])
 })
});
