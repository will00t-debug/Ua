// EX06BT MHA-2-001 through 036 sentences that are not an existing shared
// operation. This file does not approximate a missing sentence and does not
// add an engine op. 037–073 stay in requests-2-037-073.mjs.
// FAQ ids are the official EX06BT list already stored on the catalog row.
// A request is not an FAQ acceptance.
export const MHA2_REQUESTS_001_036=Object.freeze({
 'MHA-2-003':Object.freeze({
  missing:'三種不同卡名的ワン・フォー・オール發生能源 +1 黃已有被動欄位（extraEnergy、min 3、場上與場外、不分回合）。缺少整句：起動主要、休息，把 1 張該特徵手牌放到場外，做到才抽 1。'
 }),
 'MHA-2-011':Object.freeze({
  faq:Object.freeze(['Q998']),
  missing:'在前排期間，自己場上的〈緑谷 出久〉不被對手寫有「選び」的效果選取。Q998 是選取範圍，不是登場時授予到下回合。沒有「在場期間保護指定名字」的被動。'
 }),
 'MHA-2-016':Object.freeze({
  faq:Object.freeze(['Q1000']),
  missing:'退場時最多把 1 張自己的角色移到另一條線。Q1000：目的地滿格時先把 1 張放進移除區再移動。移線目前只掛在事件的登場選擇裡，不能掛在退場。'
 }),
 'MHA-2-020':Object.freeze({
  missing:'登場時二選一已能用 chooseOne：retireOppFrontOneUnderBp（BP 3000、optional）或 activeSelf。缺少起動主要：前排、休息、每回合一次，給 1 張〈緑谷 出久〉本回合 BP+1000 與衝擊 1，做到之後最多把這張卡或 1 張 AP 活動。不能只做登場句。'
 }),
 'MHA-2-021':Object.freeze({
  faq:Object.freeze(['Q1001']),
  missing:'場上有其他 A組 時不能從手牌登場，但手牌起動仍可使用。起動：確認必要能源、付 1 AP、把這張卡從手牌放到場外，然後抽 1、棄 1，再最多活動 1 張 AP。Q1001。登場禁止已有 playBanOtherTrait。手牌起動沒有共用句。'
 }),
 'MHA-2-023':Object.freeze({
  faq:Object.freeze(['Q1002']),
  missing:'場上有其他 A組 時不能從手牌登場，但手牌起動仍可使用。起動：確認必要能源、付 1 AP、把這張卡放到場外，然後看牌頂 4 張，公開最多 2 張非〈緑谷 出久〉到手牌，其餘放牌底。Q1002。顏色觸發的休息並跳過下次活動已有共用句。登場禁止已有 playBanOtherTrait。手牌起動沒有。'
 }),
 'MHA-2-024':Object.freeze({
  missing:'其他 A組 的手牌登場禁止與顏色觸發已有共用句。攻擊時三種卡名可付 1 AP 獲得衝擊 1，已能用 optionalPayApThen（when 為 ownDistinctTraitNames、min 3）接 grantSelfImpactThisTurn。缺少：登場時本回合獲得「每回合一次，自己的ワン・フォー・オール退場時最多抽 1」。不能只做攻擊句。'
 }),
 'MHA-2-025':Object.freeze({
  faq:Object.freeze(['Q1003','Q2007']),
  missing:'場上有其他 A組 時不能從手牌登場，但手牌起動仍可使用。起動：確認必要能源、付 1 AP、把這張卡放到場外，然後退場最多 1 張對手前排。其他 A組 達 3 張時上限從 BP 3000 改成 5000。Q1003。Q2007：場外發動的角色效果仍是角色效果。特殊觸發已有共用句。登場禁止已有 playBanOtherTrait。這個手牌起動沒有。'
 }),
 'MHA-2-026':Object.freeze({
  missing:'場上有其他 A組 時不能從手牌登場。場上與場外每種不同卡名的ワン・フォー・オール，讓手牌必要能源 -1 黃。有衝擊 1。登場時可從手牌或場外把該特徵最多 1 張休息放到能量列。登場禁止已有 playBanOtherTrait。每種名字減手牌能源已有 distinctNameHandEnergy。缺的是從手牌或場外休息放到能量列。'
 }),
 'MHA-2-029':Object.freeze({
  faq:Object.freeze(['Q1004']),
  missing:'休息並退場自己。場上與場外不同卡名的ワン・フォー・オール合計 3 種以上才可發動。選 1 張〈緑谷 出久〉，直到自己下個回合開始不被對手角色效果選取，也不能被狙擊指定，然後抽 1。Q1004 的選取範圍與 Q998 相同。沒有這句場域起動。'
 }),
 'MHA-2-030':Object.freeze({
  missing:'自己回合、不同卡名的ワン・フォー・オール合計 3 種以上，而且〈緑谷 出久〉會因對手觸發離場時，可改退這張場域並把那張〈緑谷 出久〉休息。沒有觸發離場替代。'
 }),
 'MHA-2-031':Object.freeze({
  missing:'休息並退場自己。不同卡名的ワン・フォー・オール合計 3 種以上才可發動。選 1 張〈緑谷 出久〉並活動。現有場域休息退場的後續不是活動指定名字。'
 }),
 'MHA-2-032':Object.freeze({
  missing:'休息、付 1 張手牌到場外並退場自己。不同卡名的ワン・フォー・オール合計 3 種以上才可發動。給 1 張〈緑谷 出久〉本回合狙擊。沒有這句支付。'
 }),
 'MHA-2-033':Object.freeze({
  missing:'休息並退場自己。不同卡名的ワン・フォー・オール合計 3 種以上才可發動。給 1 張〈緑谷 出久〉本回合 BP+2000，然後抽 1。沒有這句後續。'
 }),
 'MHA-2-034':Object.freeze({
  missing:'場上與場外每種不同卡名的ワン・フォー・オール，讓手牌必要能源 -1 黃。必須退場 1 張對手前排。場上有〈緑谷 出久〉時上限從 BP 3000 改成 5000。特殊觸發已有共用句。每種名字減手牌能源已有 distinctNameHandEnergy。缺的是必須退場，以及有綠谷時改上限。'
 }),
 'MHA-2-036':Object.freeze({
  faq:Object.freeze(['Q1005','Q1006']),
  missing:'場上要有 3 張其他 A組 才能使用。最多選兩個不同句子，依印刷順序結算，不能選同一句兩次。Q1005、Q1006。三句是：休息最多 1 張對手前排；從手牌把付得起的黃 A組、AP 1 最多 1 張活動登場或突襲；自己場上全部角色本回合 BP+1000。現有二選項形狀對不上這三句。'
 })
});
