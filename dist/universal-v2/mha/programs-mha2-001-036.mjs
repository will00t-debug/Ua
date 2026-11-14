// EX06BT MHA-2-001 through 036. A card is ready only when the whole
// printed sentence is an existing V2 operation. A matching clause is not
// enough. This file does not define 037–073 and does not add engine ops.
const ready=(extra={})=>Object.freeze({ready:true,implementation:'dsl',...extra});
const pending=notes=>Object.freeze({ready:false,notes});
const deku=Object.freeze({
 kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'緑谷 出久'
});

export const MHA2_PROGRAMS_001_036=Object.freeze({
 'MHA-2-001':ready({
  mainAbility:Object.freeze({
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1
  }),
  notes:'起動：休息，每回合一次。這個回合發生能量 +1 黃。主要階段結束時退場。'
 }),
 'MHA-2-002':ready({
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard',count:4,logic:'any',filters:Object.freeze([
    Object.freeze({field:'name',value:'緑谷 出久'}),
    Object.freeze({field:'trait',value:'ワン・フォー・オール'})
   ])
  }])}),
  notes:'看牌頂 4 張。公開最多 1 張綠谷或ワン・フォー・オール到手牌，其餘放牌底。有拿才棄 1 張手牌到場外。不能拿的牌留在畫面上。'
 }),
 'MHA-2-003':pending('三種不同ワン・フォー・オール名字的發生能源，以及休息後把一張該特徵手牌放到場外再抽 1，沒有對得上的同一句起動。不能只做能量。'),
 'MHA-2-004':ready({
  activeExtraEnergy:1,
  notes:'活動時發生能量 +1 黃。休息時只有印刷的 1 點。前線不產生能量。'
 }),
 'MHA-2-005':ready({
  effects:Object.freeze({onPlay:Object.freeze([{op:'drawDiscard',count:1}])}),
  notes:'登場時抽 1，再把 1 張手牌放到場外。不能略過棄牌。'
 }),
 'MHA-2-006':Object.freeze({ready:true,implementation:'vanilla',notes:'効果欄は「-」。ゲットは卡表。'}),
 'MHA-2-007':ready({step:true,notes:'只有移步。自己的移動階段可從前線回到能量線。'}),
 'MHA-2-008':ready({
  enterAlwaysActive:true,
  passiveBonuses:Object.freeze([Object.freeze({bp:1000,condition:deku})]),
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard',count:3,noHandDiscard:true,
   filter:Object.freeze({field:'trait',value:'A組'})
  }])}),
  notes:'活動登場。自己回合場上有綠谷時 BP+1000。看牌頂 3 張，公開最多 1 張 A組 到手牌，其餘放牌底，不棄手牌。'
 }),
 'MHA-2-009':pending('登場要同時給本回合 BP+1000 與衝擊 1，並可付一張非綠谷手牌，從場外休息登場能量 4 以下、AP 1 的黃綠谷。沒有這句支付後續。'),
 'MHA-2-010':Object.freeze({ready:true,implementation:'vanilla',notes:'効果欄は「-」。ゲットは卡表。'}),
 'MHA-2-011':pending('在前線期間，自己的綠谷不被對手寫有「選び」的效果選取。沒有「在場期間保護指定名字」的被動。Q998 約束的是選取範圍，不是登場授予。'),
 'MHA-2-012':pending('突襲、衝擊無效、BP 4000 以上不能阻擋，以及付 2 張非綠谷或改付 1 AP 後從場外休息登場黃綠谷。Q999 的兩種支付沒有共用句。'),
 'MHA-2-013':ready({impactNull:true,notes:'與這張卡戰鬥的角色，這場戰鬥失去衝擊。'}),
 'MHA-2-014':ready({ownTurnBp:1000,notes:'自己回合 BP+1000。對手回合維持印刷 BP。'}),
 'MHA-2-015':ready({
  effects:Object.freeze({onPlay:Object.freeze([{op:'drawDiscard',count:1}])}),
  notes:'登場時抽 1，再把 1 張手牌放到場外。'
 }),
 'MHA-2-016':pending('退場時最多把 1 張自己的角色移到另一條線。Q1000 的滿格先移除是既有移動規則，但移線目前只掛在事件的登場選擇裡，不能掛在退場。'),
 'MHA-2-017':Object.freeze({ready:true,implementation:'vanilla',notes:'効果欄は「-」。アクティブは生命觸發。'}),
 'MHA-2-018':pending('可同時付 1 AP 與一張非綠谷手牌，再從場外休息登場能量 4 以下、AP 1 的黃綠谷。沒有這個雙支付。'),
 'MHA-2-019':ready({
  passiveBonuses:Object.freeze([
   Object.freeze({bp:1000,condition:deku}),
   Object.freeze({impact:1,condition:deku})
  ]),
  notes:'自己回合且場上有綠谷時，BP+1000 並有衝擊 1。少了綠谷或不是自己回合就都沒有。'
 }),
 'MHA-2-020':pending('登場二選一，以及前線每回合一次把 BP+1000 與衝擊 1 給綠谷後，再活動自己或一張 AP。兩句都沒有完整的共用起動。'),
 'MHA-2-021':pending('場上有其他 A組 時不能從手牌登場，但仍要能從手牌付 1 AP 放到場外、抽棄並活動一張 AP。Q1001 的手牌起動沒有共用句，登場禁止也沒有欄位。'),
 'MHA-2-022':ready({
  playBanOtherTrait:Object.freeze({trait:'A組',exceptName:'緑谷 出久'}),
  step:true,
  passiveBonuses:Object.freeze([Object.freeze({bp:1000,condition:Object.freeze({
   kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',excludeSelf:false,
   trait:'ワン・フォー・オール',min:3
  })})]),
  notes:'場上有名字不是〈緑谷 出久〉的其他 A組 時，不能從手牌登場或手牌突襲；場外效果登場不受影響。有移步。場上或場外不同卡名的ワン・フォー・オール達 3 種時 BP+1000。印刷沒有寫自己回合，所以雙方回合都算。#482 的試例把同一門檻寫成自己回合，這裡依印刷全文。'
 }),
 'MHA-2-023':pending('手牌付 1 AP 放到場外後，看牌頂 4 張並取最多 2 張非綠谷。Q1002。顏色觸發的休息並跳過下次活動已有共用句，但登場禁止與手牌起動沒有。'),
 'MHA-2-024':pending('登場時獲得本回合「ワン・フォー・オール退場可抽 1」，攻擊時三種名字可付 1 AP 獲得衝擊 1。加上其他 A組 的登場禁止。沒有整句。'),
 'MHA-2-025':pending('手牌付 1 AP 放到場外後，退場對手前線。其他 A組 達 3 張時上限從 3000 改成 5000。Q1003。登場禁止與這個手牌起動沒有共用句。'),
 'MHA-2-026':pending('每種場上與場外的ワン・フォー・オール名字讓手牌必要能量減 1 黃，另有衝擊 1，並可從手牌或場外把該特徵休息放到能量線。每種名字減能量沒有共用欄位。'),
 'MHA-2-027':ready({
  effects:Object.freeze({onPlay:Object.freeze([{op:'bounceOwnOtherUnderEnergy',energy:1}])}),
  notes:'登場時把必要能量 1 以下的其他自己角色回手。沒有合格對象時回自己。能量線與更高必要能量不能選，也不能略過。'
 }),
 'MHA-2-028':ready({
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'searchTopOneBottomDiscard',count:3,
   filter:Object.freeze({field:'trait',value:'A組'})
  }])}),
  notes:'看牌頂 3 張。公開最多 1 張 A組 到手牌，其餘放牌底。有拿才棄 1 張手牌到場外。'
 }),
 'MHA-2-029':pending('休息並退場自己，三種ワン・フォー・オール名字才可發動，給一張綠谷直到自己下個回合開始不被角色效果選取、也不被狙擊，然後抽 1。Q1004。沒有這句場域起動。'),
 'MHA-2-030':pending('自己回合、三種名字、而且綠谷會因對手觸發離場時，可改退這張場域並把那張綠谷休息。沒有觸發離場替代。'),
 'MHA-2-031':pending('休息並退場自己後只活動一張綠谷，而且要三種名字。場域起動的現有後續不是活動指定名字。'),
 'MHA-2-032':pending('休息、付 1 張手牌到場外並退場自己後，給一張綠谷本回合狙擊。要三種名字。沒有這句支付。'),
 'MHA-2-033':pending('休息並退場自己後，給一張綠谷本回合 BP+2000 並抽 1。要三種名字。沒有這句後續。'),
 'MHA-2-034':ready({
  distinctNameHandEnergy:Object.freeze({trait:'ワン・フォー・オール',per:1}),
  triggerEffect:Object.freeze({op:'retireOppFront'}),
  effects:Object.freeze({onPlay:Object.freeze([{
   op:'retireOppFrontUnderBp',bp:3000,bonusName:'緑谷 出久',bonusBp:5000,mandatory:true
  }])}),
  notes:'手牌必要能量按自己場上與場外、正面的ワン・フォー・オール卡名種類各減 1 黃。生命區不減，蓋放不算。使用時必須退場 1 張對手前排：沒有〈緑谷 出久〉時 BP 3000 以下，自己場上有這個名字時改成 5000 以下。沒有合格對象就不能使用。特殊觸發退場對手前線 1 張。'
 }),
 'MHA-2-035':ready({
  effects:Object.freeze({onPlay:Object.freeze([{op:'recoverAp',count:2}])}),
  notes:'最多使 2 張自己的行動值卡活動。可以少選。最終觸發是卡表。'
 }),
 'MHA-2-036':pending('場上要有 3 張其他 A組 才能使用。最多選兩個不同句子，依印刷順序結算，不能選同一句兩次。Q1005、Q1006。現有二選項形狀對不上這三句。')
});
