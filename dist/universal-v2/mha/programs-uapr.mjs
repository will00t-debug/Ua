// Point-exchange promos. A card stays pending until every printed sentence
// is an existing V2 operation. This file is not imported by mha-pack.mjs,
// so it cannot change UA10BT/MHA-1 or EX06BT/MHA-2.
export const UAPR_MHA_REQUESTS=Object.freeze([
 Object.freeze({
  cardId:'MHA-P-001',
  number:'UAPR/MHA-P-001',
  ready:false,
  sentence:'手札登場は〈緑谷 出久〉以外のA組が自分の場にいると不可。インパクト無効。自分のターン、場と場外の異なるワン・フォー・オール名1種につきBP+500。',
  existingOps:['impactNull','mutualPlayBan','buffDistinctTraitNames'],
  whyNotEnough:'mutualPlayBan 只禁止另一個指名，不是「其他 A 組」。buffDistinctTraitNames 是事件的登場時選擇，只看場上，不會在自己回合依場上加場外的不同卡名持續加在自己身上。impactNull 只覆蓋其中一句。'
 }),
 Object.freeze({
  cardId:'MHA-P-002',
  number:'UAPR/MHA-P-002',
  ready:false,
  sentence:'自分の場が空なら手札の必要エナジーを［紫×2］減らす。レイドされた時に登場時を発動。登場時は手札1枚を場外に置いてもよく、置いたらBP2500以上をこのターンBP-2000。',
  existingOps:['emptyOwnFieldHandEnergyDiscount','replayOnPlay','enemyBpDown','placeHandOutside'],
  whyNotEnough:'空場減 2 點能量已有 emptyOwnFieldHandEnergyDiscount，而且 2 沒有超過既有上限。onRaided 不接受 replayOnPlay。enemyBpDown 的 minBp 沒有接在可选手牌放場外成功之後。'
 }),
 Object.freeze({
  cardId:'MHA-P-003',
  number:'UAPR/MHA-P-003',
  ready:false,
  sentence:'インパクト無効。登場時、手札1枚を自分の場の〈ホークス〉の下に裏向きで置いてもよい。このキャラの下に置いた場合だけ、上から2枚見て1枚まで手札、残りは場外。',
  existingOps:['impactNull','tuckFacedownUnder','takeTopHandRestOutside'],
  whyNotEnough:'tuckFacedownUnder 的後續只允許抽 1。takeTopHandRestOutside 會看牌庫頂 2 張，但不會先要求蓋牌放到這張〈霍克斯〉下面。兩句沒有接成同一句。'
 })
]);
