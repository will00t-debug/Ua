import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName,cardHasTrait} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalEnergyByColor,universalCardEnergy,
 universalPublicView,universalPrivateChoices,effectiveHandRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// Official iframes fetched 2026-10-24.
// BLC-1-080 UA08BT: このキャラはBPをマイナスする効果を受けない。
//   自分のターン中 このキャラはBP+1000。 ACTIVE is the generic sentence.
//   Generated energy alt is 緑. Printed BP is 4000+.
// BLC-1-091 UA08BT: このカードは〈山本 元柳斎 重國〉としても扱う。
//   自分のフロントLに他のキャラがない場合、このキャラはBP+1000。 GET is generic.
//   No 自分のターン中 icon. Energy-line cards are not front characters.
// BLC-2-041 EX07BT: 自分のターン中 このターン中に自分の場の他のキャラが退場している場合、
//   このキャラはBP+1000。 ACTIVE is generic. Trait is the single token 破面／涅骸部隊.
// BLC-1-062 UA08ST: 自分の場のキャラを1枚選び、このターン中、BP+1000。
//   自分のAPカードを1枚まで選び、アクティブにする。 ACTIVE is generic.
//   The character choice is mandatory. The AP choice is up to one.
// BLC-1-087 UA08BT: [登場時]自分の場の［特徴：護廷十三隊］を1枚まで選び、このターン中、
//   [インパクト（+1）]を与える。 The parenthetical gives Impact 1 when the
//   target has none. The sentence does not say 他の, so this character is legal.
//   ACTIVE is the generic sentence. Generated energy alt is 緑.
// BLC-2-026 EX07BT: [登場時]自分の場の元々の消費APが2以上のキャラを1枚まで選び、
//   このターン中、[インパクト（+1）]を与える。 DRAW is generic. Gen alt is 青.
//   This card's own printed AP is 1, so it is not its own target.
// BLC-2-027 EX07BT: [自分のターン中]自分のフロントLの元々の消費APが2以上のキャラ
//   1枚につき、このキャラはBP+500。 ACTIVE is generic. Energy-line cards do not count.
// BLC-4-046 EX15BT: [登場時]自分の場の紫の〈黒崎 一護〉を1枚まで選び、このターン中、BP+1500。
//   ACTIVE is generic. Required energy is 紫- (0). Traits are empty.
// BLC-3-007 UA04NC: [登場時]自分の山札の上から3枚見る。その中から［特徴：護廷十三隊］を
//   1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、
//   自分の手札を1枚場外に置く。 DRAW is generic. Gen alt is 緑.
// BLC-3-002 UA04NC: the same sentence with 〈黒崎 一護〉か〈阿散井 恋次〉か
//   〈朽木 ルキア〉か〈朽木 白哉〉. DRAW is generic. Gen alt is 青.
// BLC-4-001 EX15BT: このカードは〈バズビー〉としても扱う。 The on-play sentence is the
//   same look-3 with 〈バズビー〉か〈ユーグラム・ハッシュヴァルト〉. DRAW is generic. Gen alt is 黄.
// BLC-4-064 EX15BT: [登場時]自分の山札の上から3枚見て、緑のイベントカードか緑のフィールドカードを
//   1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、
//   自分の手札を1枚場外に置く。 Each か group is color AND type. A green character
//   matches neither group. No trigger. Generated energy alt is 緑.
// BLC-2-005 EX07BT: [登場時]このキャラが自分のキャラの効果で登場していた場合、
//   相手のフロントLのキャラを1枚まで選び、レストにする。 ACTIVE is generic.
//   The attribute cell is one composite, 護廷十三隊／ゾンビ. Generated energy alt is 黄.
//   Paid play, an event, and a field do not open the REST. A character effect does.
// BLC-2-006 EX07BT: [登場時]このキャラが自分のキャラの効果で登場していた場合、カードを1枚引く。
//   [起動メイン][APを1支払う][ターン1]このキャラはこのターン中、[インパクト（1）]を得る。
//   COLOR is the standard rest-and-skip-next-active sentence. The attribute cell
//   is one composite, 星十字騎士団／ゾンビ. Generated energy alt is 黄. The activate
//   has no フロントL restriction and does not REST this character.
// BLC-2-058 EX07BT: [登場時]自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。
//   [アタック時]自分の手札の［特徴：零番隊］を1枚リムーブエリアに置いてもよい。
//   そうした場合、このキャラはこのターン中、BP+2000。 ACTIVE is generic.
//   Generated energy alt is 紫紫. A non-零番隊 hand card is not a payment.
// BLC-2-033 EX07BT: [登場時]『カードを1枚引き、自分の手札を1枚場外に置く』。
//   自分のフロントLに元々の消費APが2以上のキャラがある場合、『カードを1枚引く』に代えてもよい。
//   No trigger. Required energy alt is 青3. Generated energy alt is 青青.
//   The replacement is chosen before either sentence. Energy-line cards do not
//   count. This card's own printed AP is 1, so it does not open its own gate.
//   A printed AP of 2 on this same sentence does count, because the text has no 他の.
// BLC-1-022 UA08BT: [登場時]相手は自身の山札の上から1枚を公開する。自分はこの効果で
//   公開されたカードを相手の山札の上か場外に置く。 COLOR is the standard
//   rest-and-skip-next-active sentence. Required energy alt is 黄3.
//   Generated energy alt is 黄黄. An empty opposing deck reveals nothing.
// BLC-2-011 EX07BT: [登場時]自分の山札の上から3枚を公開する。その中から
//   ［特徴：バンビーズ］か〈バンビエッタ・バスターバイン〉を1枚まで手札に加える。
//   残りを自分の場外に置く。手札に加えた場合、自分の手札を1枚場外に置く。
//   No trigger. Required energy alt is 黄1. Generated energy alt is 黄.
//   The attribute cell is 星十字騎士団／バンビーズ. The catalogue stores that
//   as one string, and only this exact string is split into audited components.
//   邦比小隊 is a different token. A miss sends all three outside with no discard.
// BLC-1-060 UA08BT: [登場時]必要エナジーの数を1つ指定する。自分の山札の上から2枚公開する。
//   その中からこの効果で指定した数と同じ必要エナジーのキャラカードを1枚まで手札に加え、
//   残りを場外に置く。 The number is chosen before the reveal. Fields and events
//   with the same energy are not characters. Taking a card does not discard.
//   ACTIVE is the generic sentence. Required energy alt is 紫3. Generated energy alt is 紫.
// BLC-1-038 UA08BT: [登場時]自分の山札の上から3枚を場外に置いてもよい。そうした場合、
//   自分の場外から紫のキャラカードを1枚まで手札に加える。 The mill is one
//   accept-or-skip for the whole three, not one card at a time. Skipping does
//   not open the recovery. A shorter deck still mills what remains. No trigger.
//   Required energy alt is 紫3. Generated energy alt is 紫. Printed AP is 2.
// BLC-2-014 EX07BT: [登場時]必要エナジーが2以下の自分の場のキャラを1枚手札に戻してもよい。
//   そうした場合、自分の場外から必要エナジーが2以下のカードを1枚まで手札に加える。
//   The source is a legal target when its own printed energy is 2 or less.
//   This print is energy 3, so it is not. Fields are not characters.
//   Skipping, or having no legal character, does not open the recovery.
//   Recovery accepts any card type at printed energy 2 or less.
//   COLOR: BP3500以下の相手のフロントのキャラを1枚手札に戻す。
//   Required energy alt is 青3. Generated energy alt is 青青, so gen stays 2.
// BLC-2-001 EX07BT: （自分の移動フェイズにフロントLからエナジーLへ移動できる）
//   [起動メイン][ターン1] 相手のフロントLに元々のBPよりBPが低いキャラか
//   レストのキャラがある場合、このキャラはこのターン中、BP+1000。
//   The printed BP cell is 3000+. That plus is the Step marker; BP stays 3000.
//   No trigger. Required energy alt is 黄3. Generated energy alt is 黄黄.
//   Front only. A rested energy-line character does not qualify.
//   The activation does not rest this card and works from either own line.
// BLC-3-005 UA04NC: [インパクト無効]. The battling character loses Impact for
//   that battle. [起動メイン] only when an opposing front character's live BP
//   is below its printed BP (official Q1583: 元々のBP is the
//   printed lower-left BP). Set this character ACTIVE.
//   「〈阿散井 恋次〉のこの効果は1ターンに1回のみ」(Q1584: two copies, only one
//   of them may activate this effect that turn). ACTIVE is the generic
//   sentence. Required energy is 紫5. Generated energy is 紫. An energy-line
//   reduced character does not open the activate.
// BLC-4-006 EX15BT: [インパクト無効]. [自分のターン中] BP+1000 only when own
//   outside has no 〈ユーハバッハ〉 and own field has 〈ユーグラム・ハッシュヴァルト〉.
//   Official iframe 2026-10-26: required 黄3, generated 黄黄, BP 3000+, no trigger,
//   no card FAQ. Catalogue gen=3 is the sprite index.
// BLC-4-047 EX15BT: [起動メイン][レストにする][このカードを退場させる], then up to
//   one purple 〈黒崎 一護〉 of required energy exactly 0 from own outside,
//   REST, onto own field. Official iframe 2026-10-26: 紫-, generated 紫,
//   AP1, BP500, DRAW, no traits, no card FAQ. AP is not a filter.
// BLC-2-017 EX07BT: [起動メイン][手札を1枚場外に置く][ターン1]. This physical
//   card sends one hand card outside, then cannot be blocked by BP 4000+.
//   Official iframe 2026-10-26. Q1032 (2024-07-19): discarding 斬月 triggers it.
//   Generated energy is 青. No traits.
// BLC-4-003 EX15BT: empty own field reduces this hand card by 黄×2.
//   Step. On retire during its own turn, up to one opposing front character
//   of live BP 1500+ gets BP-1000. Official iframe 2026-10-26. Generated 黄.
//   ACTIVE is generic. No card FAQ.
// BLC-2-028 EX07BT: Impact null. On play may discard one, then may ACTIVE
//   one own AP. [ターン1] sets this physical card ACTIVE only while another
//   own front character has printed AP 2+. Q1036 (2024-07-19). Generated 青.
// BLC-4-043 EX15BT: also 〈涅 ネム〉. On play look at the top 2 and may put
//   one blue 〈涅 マユリ〉, 〈涅 ネム〉, or 涅骸部隊 card outside. Rest return
//   to the top. Official iframe 2026-10-26. Required 青-. Generated 青.
// BLC-4-051 EX15BT: [起動メイン][ターン1] only on the turn this character
//   entered. Choose one: draw 1 then put one hand card outside, or draw 1
//   only when an opposing front character's live BP is below its printed BP.
//   Q2324 (2026-09-04): 元々のBP is the printed lower-left BP. Official iframe
//   2026-10-26. Required 紫3. Generated 紫紫, so V2 gen is 2. DRAW is generic.
// BLC-4-068 EX15BT: Impact null. [起動メイン][フロントL][APを1支払う] only
//   while this character is REST. Set it ACTIVE, then up to one opposing
//   front character becomes REST. Q2336 (2026-09-04): two copies, one use.
//   Official iframe 2026-10-26. Required 緑4. Generated 緑. ACTIVE is generic.
// BLC-4-010 EX15BT: [起動メイン][フロントL][手札を1枚場外に置く][ターン1]
//   only while own field has 〈ユーハバッハ〉. Choose one opposing character
//   on the front or energy line with live BP 1500+, then BP-1000 this turn.
//   Official iframe 2026-10-26. Required 黄4. Generated 黄. DRAW is generic.
//   No card FAQ. [ターン1] is this physical card.
// BLC-2-024 EX07BT: 自分のターン中 BP+500. Printed BP stays 3500.
//   On play, if this player already placed a hand card outside this turn,
//   may REST one traitless blue character of printed energy 1 or less and
//   printed AP 1. Official iframe 2026-10-26. Required 青4. Generated 青.
//   ACTIVE is generic. No card FAQ.
// BLC-4-039 EX15BT: on play from the energy line, become ACTIVE only when
//   an own front character has printed AP 2 or more. [起動メイン][レストにする]
//   chooses another own character on either line for BP+1000. Printed AP 2+
//   may discard one hand card to set that character ACTIVE. Q2320 (2026-09-04).
//   Official iframe 2026-10-26. Required 青2. Generated 青. DRAW is generic.
// BLC-3-003 UA04NC: on play choose one. Up to one other own character gets
//   BP+1000, or BP+3000 and retires when its attack ends. Official iframe
//   2026-10-26. Required 青1. Generated 青. ACTIVE is generic. No card FAQ.
// BLC-4-072 EX15BT: on play, may put one hand card outside. If that payment
//   happens, may REST up to one own outside character of printed AP 1 with
//   trait 假面軍勢 whose required energy is currently met. Q2341 (2026-09-04):
//   the card just sent outside may be that character. Official iframe
//   2026-10-26. Required 緑4. Generated 緑. No trigger.
// BLC-1-026 UA08BT: 自分の【レイド】を持つキャラカードはこのキャラにレイドできる。
//   Q553 (2023-09-25) waives the named base and the conditions to the right
//   of 【レイド】. Silence and a buried host do not. Generated energy is 黄.

const bleach=registeredV2TitlePack('bleach');
const ADDED=['BLC-1-080','BLC-1-091','BLC-2-041','BLC-1-062','BLC-1-032','BLC-1-078','BLC-1-087','BLC-2-026','BLC-2-027','BLC-4-046','BLC-4-028','BLC-4-052','BLC-3-007','BLC-3-002','BLC-4-001','BLC-2-072','BLC-2-032','BLC-3-004','BLC-1-079','BLC-2-050','BLC-1-108','BLC-3-010','BLC-2-018','BLC-1-056','BLC-4-024','BLC-1-004','BLC-1-046','BLC-4-063','BLC-4-064','BLC-2-005','BLC-2-006','BLC-2-058','BLC-2-033','BLC-1-022','BLC-2-011','BLC-1-060','BLC-1-038','BLC-2-014','BLC-2-001','BLC-4-037','BLC-4-071','BLC-3-005','BLC-4-006','BLC-4-047','BLC-2-017','BLC-4-003','BLC-2-028','BLC-4-043','BLC-4-051','BLC-4-068','BLC-4-010','BLC-2-024','BLC-4-039','BLC-3-003','BLC-4-072','BLC-1-026'];
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const green=realDeck(['BLC-1-080','BLC-1-091','BLC-1-078','BLC-1-070','BLC-4-062','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-4-061','BLC-2-072','BLC-1-083','BLC-1-079'],'green');
const blue=realDeck(['BLC-2-041','BLC-2-031','BLC-4-036','BLC-2-026','BLC-2-027','BLC-4-022','BLC-4-028','BLC-3-002','BLC-2-016','BLC-2-029','BLC-2-032','BLC-2-015','BLC-2-019'],'blue');
const purple=realDeck(['BLC-1-062','BLC-1-035','BLC-1-103','BLC-4-046','BLC-1-039','BLC-4-052','BLC-2-050','BLC-3-004','BLC-1-108','BLC-1-041'],'purple');
const yellow=realDeck(['BLC-1-032','BLC-1-023','BLC-1-006','BLC-4-001','BLC-2-003','BLC-1-018'],'yellow');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,ready=true){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function main(deck,seed){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 return {packs,s};
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function orderBottom(packs,s){
 while(s.pending?.kind==='effect-top-order'){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder');
  assert.ok(action);
  s=dispatchUniversalAction(packs,s,action);
 }
 return s;
}
function live(s,p,uid){
 for(const line of ['front','energy']){
  const c=s.players[p][line].find(x=>x?.uid===uid);
  if(c)return c;
 }
 return s.players[p].outside.find(x=>x.uid===uid)||null;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function plainId(deck,bp,not){
 const id=Object.keys(deck).find(id=>{
  if(not.includes(id))return false;
  const c=bleach.cards[id];
  return c.type==='character'&&c.bp===bp&&c.maxCopies===4&&
   !c.printedImpact&&!c.impactNull&&!c.mainAbility&&!c.passiveBonuses?.length&&
   !Object.keys(c.effects||{}).length;
 });
 assert.ok(id,'plain '+bp);
 return id;
}

test('C29 registers fifty-six whole BLEACH prints and keeps the independent census',()=>{
 assert.equal(EXPECTED_V2_TOTAL,492);
 assert.equal(EXPECTED_V2_COUNTS.bleach,216);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 for(const id of ADDED)assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
 assert.equal(Object.keys(bleach.cards).length,216);
});

test('BLC-1-080 ignores BP reductions and gains 1000 only on its own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-080');
 assert.equal(printed.effect,'此角色不受降低 BP 的效果影響。己方回合中，此角色 BP +1000。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-080'];
 assert.equal(card.bpDownImmune,true);
 assert.equal(card.ownTurnBp,1000);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 const {packs,s}=main(green,29080);
 const self=put(s,0,'BLC-1-080','front',0);
 assert.equal(universalBp(packs,s,self),5000);
 self.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),5000);
 self.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),5500);
 let opp=s;
 for(let n=0;n<12&&opp.active===0;n++)
  opp=dispatchUniversalAction(packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 const there=live(opp,0,self.uid);
 assert.equal(universalBp(packs,opp,there),4000);
 there.buffs.push({bp:-2000,untilTurn:opp.turn});
 assert.equal(universalBp(packs,opp,there),4000);
 there.buffs.push({bp:500,untilTurn:opp.turn});
 assert.equal(universalBp(packs,opp,there),4500);
 aiOk(packs,opp);
 assert.equal(assertUniversalMatch(packs,opp),true);
});

test('BLC-1-091 is the printed Yamamoto alias and gains 1000 with no other front character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-091');
 assert.equal(printed.effect,'此卡亦視為〈山本元柳齋重國〉。己方前線沒有其他角色時，此角色 BP +1000。');
 const card=bleach.cards['BLC-1-091'];
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.equal(cardHasName(card,'山本 重國'),true);
 assert.equal(cardHasName(card,'山本 元柳斎 重國'),true);
 assert.equal(cardHasName(card,'山本 元柳斎 重國',true),false);
 assert.deepEqual(card.passiveBonuses,[{
  condition:{kind:'ownFrontNoOtherCharacter',turn:'any'},bp:1000}]);
 const {packs,s}=main(green,29091);
 const self=put(s,0,'BLC-1-091','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 const energyMate=put(s,0,'BLC-1-080','energy',0);
 assert.equal(universalBp(packs,s,self),3000);
 const mateId=Object.keys(green).find(id=>id!=='BLC-1-080'&&id!=='BLC-1-091'&&
  bleach.cards[id].type==='character');
 const frontMate=put(s,0,mateId,'front',1);
 assert.equal(universalBp(packs,s,self),2000);
 s.players[0].front[1]=null;
 s.players[0].hand.push(frontMate);
 assert.equal(universalBp(packs,s,self),3000);
 s.players[0].front[0]=null;
 s.players[0].energy[1]=self;
 assert.equal(universalBp(packs,s,self),3000);
 const held=s.players[0].hand.findIndex(c=>c.uid===frontMate.uid);
 s.players[0].front[0]=s.players[0].hand.splice(held,1)[0];
 assert.equal(universalBp(packs,s,self),2000);
 assert.equal(universalBp(packs,s,energyMate),5000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-041 gains 1000 only after another own character retires this own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-041');
 assert.equal(printed.effect,'己方回合中，若本回合已有其他己方場上角色退場，此角色 BP +1000。');
 assert.equal(printed.traits,'破面／涅骸部隊');
 const card=bleach.cards['BLC-2-041'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['破面／涅骸部隊']);
 assert.equal(card.traitComponents,undefined);
 assert.deepEqual(card.passiveBonuses[0].condition,{kind:'retireCountThisTurn',turn:'own',
  controller:'own',cardType:'character',min:1,excludeSelf:true});
 const low=plainId(blue,1500,['BLC-2-041']);
 const wall=plainId(blue,4000,['BLC-2-041']);
 const {packs,s}=main(blue,29041);
 const self=put(s,0,'BLC-2-041','energy',0);
 assert.equal(universalBp(packs,s,self),2000);
 const mine=put(s,0,low,'front',0);
 const theirWall=put(s,1,wall,'front',0);
 let battle=s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:mine.uid});
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:theirWall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===mine.uid),false);
 assert.equal(battle.active,0);
 const stayed=live(battle,0,self.uid);
 assert.equal(universalBp(packs,battle,stayed),3000);
 let later=battle;
 for(let n=0;n<12&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,self.uid)),2000);
 const foe=main(blue,29042);
 const watcher=put(foe.s,0,'BLC-2-041','energy',0);
 const big=put(foe.s,0,wall,'front',0);
 const small=put(foe.s,1,low,'front',0);
 let oppLoss=foe.s;
 for(let n=0;n<6&&oppLoss.phase!=='attack';n++)
  oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'next'});
 oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'attack',uid:big.uid});
 oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'chooseBlock',uid:small.uid},{actor:1});
 assert.equal(oppLoss.players[1].front.some(c=>c?.uid===small.uid),false);
 assert.equal(universalBp(packs,oppLoss,live(oppLoss,0,watcher.uid)),2000);
 const again=main(blue,29043);
 const ken=put(again.s,0,'BLC-2-041','front',0);
 const blocker=put(again.s,1,wall,'front',0);
 let lost=again.s;
 for(let n=0;n<6&&lost.phase!=='attack';n++)
  lost=dispatchUniversalAction(packs,lost,{type:'next'});
 lost=dispatchUniversalAction(packs,lost,{type:'attack',uid:ken.uid});
 lost=dispatchUniversalAction(packs,lost,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(lost.players[0].front.some(c=>c?.uid===ken.uid),false);
 const returned=lost.players[0].outside.find(c=>c.uid===ken.uid);
 assert.ok(returned);
 const index=lost.players[0].outside.findIndex(c=>c.uid===ken.uid);
 lost.players[0].outside.splice(index,1);
 returned.ready=true;returned.fieldEntryStamp=lost.nextFieldEntryStamp++;
 lost.players[0].energy[1]=returned;
 assert.equal(universalBp(packs,lost,returned),2000);
 assert.equal(assertUniversalMatch(packs,lost),true);
});

test('BLC-1-062 must buff one own character, then may ready one rested AP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-062');
 assert.equal(printed.effect,'一個己方角色本回合 BP +1000，可回復 1 AP。');
 assert.equal(printed.type,'event');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-1-062'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[
  {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false},
  {op:'recoverAp',count:1}]);
 const {packs,s}=main(purple,29062);
 const bread=take(s,0,'BLC-1-062');
 s.players[0].hand.push(bread);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===bread.uid),false);
 const fuel=put(s,0,'BLC-1-035','energy',0);
 const front=put(s,0,'BLC-1-103','front',0);
 const foe=put(s,1,'BLC-1-103','front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===bread.uid),true);
 let played=dispatchUniversalAction(packs,s,{type:'event',uid:bread.uid});
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.optional,false);
 const choices=legalUniversalActions(packs,played);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),false);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===fuel.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===front.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===foe.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:null}),
  /not currently legal/);
 played=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:front.uid});
 assert.equal(universalBp(packs,played,live(played,0,front.uid)),4000);
 assert.equal(universalBp(packs,played,live(played,0,fuel.uid)),1500);
 assert.equal(played.pending.kind,'effect-recover-ap');
 const rested=played.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
 assert.equal(rested.length,1);
 const recoveries=legalUniversalActions(packs,played);
 assert.equal(recoveries.some(a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 assert.equal(recoveries.some(a=>a.type==='chooseApRecovery'&&a.uid===rested[0].uid),true);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseApRecovery',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].apCards.some(c=>c.uid===rested[0].uid&&!c.ready),true);
 const readied=dispatchUniversalAction(packs,played,{type:'chooseApRecovery',uid:rested[0].uid});
 assert.equal(readied.pending,null);
 assert.equal(readied.players[0].apCards.find(c=>c.uid===rested[0].uid).ready,true);
 aiOk(packs,readied);
 assert.equal(assertUniversalMatch(packs,readied),true);
});

test('BLC-1-032 chooses one optional buff or one optional front BP reduction',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-032');
 assert.equal(printed.effect,'選一項：①可使最多 1 個己方場上角色本回合 BP +1000；②可使最多 1 個敵方前線角色本回合 BP −1000。');
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-1-032'];
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 assert.equal(card.effects.onPlay[0].optional,false);
 const {packs,s}=main(yellow,29032);
 const event=take(s,0,'BLC-1-032');
 s.players[0].hand.push(event);
 const fuel=put(s,0,'BLC-1-023','energy',0);
 const front=put(s,0,'BLC-1-006','front',0);
 const foeFront=put(s,1,'BLC-1-023','front',0);
 const foeEnergy=put(s,1,'BLC-1-006','energy',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 let played=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(packs,played);
 assert.deepEqual(modes.map(a=>a.mode).sort(),['buff','down']);
 let buffed=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'buff'});
 assert.equal(buffed.pending.kind,'effect-buff-own');
 assert.equal(buffed.pending.optional,true);
 const buffChoices=legalUniversalActions(packs,buffed);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===fuel.uid),true);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===front.uid),true);
 assert.equal(buffChoices.some(a=>a.uid===foeFront.uid),false);
 const skipped=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),4000);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:fuel.uid});
 assert.equal(universalBp(packs,buffed,live(buffed,0,fuel.uid)),5000);
 let down=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'down'});
 assert.equal(down.pending.kind,'effect-target');
 assert.equal(down.pending.optional,true);
 const downChoices=legalUniversalActions(packs,down);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===foeFront.uid),true);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===foeEnergy.uid),false);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===null),true);
 down=dispatchUniversalAction(packs,down,{type:'chooseTarget',uid:foeFront.uid});
 assert.equal(universalBp(packs,down,live(down,1,foeFront.uid)),3000);
 assert.equal(universalBp(packs,down,live(down,1,foeEnergy.uid)),4000);
 assert.equal(assertUniversalMatch(packs,down),true);
});

test('BLC-1-078 steps to energy and may buff one Gotei character on attack',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-078');
 assert.equal(printed.effect,'Step：己方移動階段可由前線移至能源線。攻擊時：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合 BP +500。');
 assert.equal(printed.gen,2);
 const card=bleach.cards['BLC-1-078'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onAttack,[{op:'buffOwnField',filter:{field:'trait',value:'護廷十三隊'},
  bp:500,optional:true,excludeSelf:false}]);
 const packs=[bleach,bleach];
 let moving=newUniversalMatch(packs,{decks:[green,green],seed:29078,first:0});
 for(let n=0;n<6&&moving.phase!=='move';n++)
  moving=dispatchUniversalAction(packs,moving,{type:'next'});
 assert.equal(moving.phase,'move');
 const stepper=put(moving,0,'BLC-1-078','front',0);
 assert.equal(legalUniversalActions(packs,moving).some(a=>a.type==='step'&&a.uid===stepper.uid),true);
 moving=dispatchUniversalAction(packs,moving,{type:'step',uid:stepper.uid,slot:0});
 assert.equal(moving.players[0].energy[0]?.uid,stepper.uid);
 assert.equal(moving.players[0].front[0],null);
 const {s}=main(green,29079);
 const self=put(s,0,'BLC-1-078','front',0);
 const ally=put(s,0,'BLC-1-070','energy',0);
 const other=put(s,0,'BLC-4-062','front',1);
 put(s,1,'BLC-1-070','front',0);
 let battle=s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:self.uid});
 assert.equal(battle.pending.kind,'effect-buff-own');
 assert.equal(battle.pending.optional,true);
 const choices=legalUniversalActions(packs,battle);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===self.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid),false);
 const skipped=dispatchUniversalAction(packs,battle,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,self.uid)),3000);
 battle=dispatchUniversalAction(packs,battle,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,battle,live(battle,0,ally.uid)),bleach.cards['BLC-1-070'].bp+500);
 assert.equal(universalBp(packs,battle,live(battle,0,other.uid)),bleach.cards['BLC-4-062'].bp);
 assert.equal(assertUniversalMatch(packs,moving),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('BLC-1-087 adds one Impact to at most one own Gotei character, including itself',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-087');
 assert.equal(printed.effect,'登場：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-087'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.printedImpact||0,0);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'grantOtherImpactThisTurn',trait:'護廷十三隊',
  amount:1,optional:true,plus:true,includeSelf:true}]);
 const {packs,s}=main(green,29087);
 put(s,0,'BLC-1-080','energy',0);
 put(s,0,'BLC-1-091','energy',1);
 const other=put(s,0,'BLC-4-062','energy',2);
 const ken=put(s,0,'BLC-2-067','front',0);
 const plain=put(s,0,'BLC-1-070','front',1);
 const foe=put(s,1,'BLC-1-080','front',0);
 const self=take(s,0,'BLC-1-087');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 let played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-grant-impact');
 assert.equal(played.pending.plus,true);
 assert.equal(played.pending.includeSelf,true);
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseGrantImpact'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(self.uid),true);
 assert.equal(chosen(ken.uid),true);
 assert.equal(chosen(plain.uid),true);
 assert.equal(chosen(other.uid),false);
 assert.equal(chosen(foe.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,self.uid)),0);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,ken.uid)),1);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,plain.uid)),0);
 let added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:ken.uid});
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),2);
 assert.equal(universalImpact(packs,added,live(added,0,self.uid)),0);
 assert.equal(universalImpact(packs,added,live(added,0,plain.uid)),0);
 added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:plain.uid});
 assert.equal(universalImpact(packs,added,live(added,0,plain.uid)),1);
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),1);
 added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:self.uid});
 assert.equal(universalImpact(packs,added,live(added,0,self.uid)),1);
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),1);
 let later=added;
 for(let n=0;n<16&&later.turn===added.turn;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.notEqual(later.turn,added.turn);
 assert.equal(universalImpact(packs,later,live(later,0,self.uid)),0);
 assert.equal(universalImpact(packs,later,live(later,0,ken.uid)),1);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,added),true);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-2-026 adds Impact 1 only to an own character with printed AP 2 or more',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-026');
 assert.equal(printed.effect,'登場：可使最多 1 個己方場上原始 AP 消耗 2 以上的角色，本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-026'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.ap,1);
 assert.deepEqual(card.effects.onPlay,[{op:'grantOtherImpactThisTurn',minPrintedAp:2,
  amount:1,optional:true,plus:true,includeSelf:true}]);
 const {packs,s}=main(blue,29026);
 put(s,0,'BLC-2-027','energy',0);
 const heavy=put(s,0,'BLC-4-022','energy',1);
 const light=put(s,0,'BLC-2-031','front',0);
 const foe=put(s,1,'BLC-4-022','front',0);
 const self=take(s,0,'BLC-2-026');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===1);
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-grant-impact');
 assert.equal(played.pending.minPrintedAp,2);
 assert.equal(played.pending.plus,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseGrantImpact'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(heavy.uid),true);
 assert.equal(chosen(self.uid),false);
 assert.equal(chosen(light.uid),false);
 assert.equal(chosen(foe.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:null});
 assert.equal(universalImpact(packs,skipped,live(skipped,0,heavy.uid)),0);
 const granted=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:heavy.uid});
 assert.equal(universalImpact(packs,granted,live(granted,0,heavy.uid)),1);
 assert.equal(universalImpact(packs,granted,live(granted,0,self.uid)),0);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,granted),true);
});

test('BLC-2-027 gains 500 on its own turn for each own front character with printed AP 2 or more',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-027');
 assert.equal(printed.effect,'己方回合中，己方前線每有 1 個原始 AP 消耗 2 以上的角色，此角色 BP +500。');
 const card=bleach.cards['BLC-2-027'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownPrintedApAtLeast',turn:'own',
  zone:'front',excludeSelf:false,minAp:2},bpEach:500}]);
 const {packs,s}=main(blue,29027);
 const self=put(s,0,'BLC-2-027','front',0);
 const heavy=put(s,0,'BLC-4-022','front',1);
 put(s,0,'BLC-2-031','front',2);
 assert.equal(universalBp(packs,s,self),3000);
 const moved=live(s,0,heavy.uid);
 s.players[0].front[1]=null;
 s.players[0].energy[0]=moved;
 assert.equal(universalBp(packs,s,self),2500);
 s.players[0].energy[0]=null;
 s.players[0].front[1]=moved;
 const foe=put(s,1,'BLC-4-022','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 assert.equal(foe.cardId,'BLC-4-022');
 let later=s;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,self.uid)),2500);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-4-046 may buff one own purple Ichigo',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-046');
 assert.equal(printed.effect,'登場時：最多選自己場上1個紫色《黑崎一護》，本回合BP+1500。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-046'];
 assert.equal(card.energy,0);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'buffOwnField',filter:{field:'color',value:'purple'},
  also:{field:'name',value:'黒崎 一護'},bp:1500,optional:true,excludeSelf:false}]);
 const {packs,s}=main(purple,29046);
 const self=take(s,0,'BLC-4-046');
 s.players[0].hand.push(self);
 const front=put(s,0,'BLC-1-103','front',0);
 const energy=put(s,0,'BLC-1-039','energy',0);
 const other=put(s,0,'BLC-1-035','front',1);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(front.uid),true);
 assert.equal(chosen(energy.uid),true);
 assert.equal(chosen(other.uid),false);
 assert.equal(chosen(self.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),3000);
 const buffed=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:energy.uid});
 assert.equal(universalBp(packs,buffed,live(buffed,0,energy.uid)),3000);
 assert.equal(universalBp(packs,buffed,live(buffed,0,front.uid)),3000);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,buffed),true);
});

test('BLC-4-028 rests once and keeps BP+1000 until its next own turn starts',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-028');
 assert.equal(printed.effect,'啟動・主要〔改為Rest／每回合1次〕：此角色到自己下次回合開始前BP+1000。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-028'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.mainAbility,{op:'restOnceBuffSelfUntilNextOwnStart',oncePerTurn:true,bp:1000});
 const {packs,s}=main(blue,29028);
 const energy=put(s,0,'BLC-4-028','energy',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===energy.uid&&a.mode==='restOnceSelfBuff'),true);
 let used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===energy.uid));
 assert.equal(live(used,0,energy.uid).ready,false);
 assert.equal(universalBp(packs,used,live(used,0,energy.uid)),5000);
 live(used,0,energy.uid).ready=true;
 assert.equal(legalUniversalActions(packs,used).some(a=>a.type==='activate'&&a.uid===energy.uid),false);
 let later=used;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,energy.uid)),5000);
 for(let n=0;n<16&&later.active===1;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,0);
 assert.equal(universalBp(packs,later,live(later,0,energy.uid)),4000);
 assert.equal(assertUniversalMatch(packs,later),true);
 const fresh=main(blue,29029);
 const front=put(fresh.s,0,'BLC-4-028','front',0);
 assert.equal(legalUniversalActions(fresh.packs,fresh.s).some(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='restOnceSelfBuff'),true);
 const fromFront=dispatchUniversalAction(fresh.packs,fresh.s,legalUniversalActions(fresh.packs,fresh.s).find(a=>a.type==='activate'&&a.uid===front.uid));
 assert.equal(live(fromFront,0,front.uid).ready,false);
 assert.equal(universalBp(fresh.packs,fromFront,live(fromFront,0,front.uid)),5000);
 assert.equal(assertUniversalMatch(fresh.packs,fromFront),true);
});

test('BLC-4-052 gains 1500 while an opposing front character is below its printed BP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-052');
 assert.equal(printed.effect,'若對方前線有BP低於印刷BP的角色，此角色BP+1500。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-052'];
 assert.equal(card.energy,0);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'oppFrontLiveBpBelowPrinted',turn:'any'},bp:1500}]);
 const {packs,s}=main(purple,29052);
 const self=put(s,0,'BLC-4-052','front',0);
 const foe=put(s,1,'BLC-1-039','front',0);
 const side=put(s,1,'BLC-1-035','energy',0);
 assert.equal(universalBp(packs,s,self),1500);
 foe.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),3000);
 foe.buffs.length=0;
 side.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),1500);
 side.buffs.length=0;
 foe.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),1500);
 foe.buffs.length=0;
 let later=s;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 const there=live(later,0,self.uid);
 const reduced=live(later,1,foe.uid);
 reduced.buffs.push({bp:-500,untilTurn:later.turn});
 assert.equal(universalBp(packs,later,there),3000);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-3-007 may reveal one Gotei card from the top three, then discards only if it took one',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-007');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張【特徵：護廷十三隊】的卡片，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-007'];
 assert.equal(card.energy,2);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:'護廷十三隊'}}]);
 const {packs,s}=main(green,29007);
 put(s,0,'BLC-1-070','energy',0);
 put(s,0,'BLC-1-078','energy',1);
 const [gotei,visor,other]=setTop(s,0,['BLC-1-080','BLC-4-062','BLC-4-060']);
 const self=take(s,0,'BLC-3-007');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(gotei.uid),true);
 assert.equal(chosen(visor.uid),false);
 assert.equal(chosen(other.uid),false);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>[gotei.uid,visor.uid,other.uid].includes(c.uid)),false);
 assert.deepEqual(missed.players[0].deck.slice(-3).map(c=>c.uid).sort(),[gotei.uid,visor.uid,other.uid].sort());
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:gotei.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-1-080');
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,true);
 const ordered=orderBottom(packs,taken);
 assert.equal(ordered.pending.kind,'effect-discard');
 const spare=ordered.players[0].hand.find(c=>c.uid!==gotei.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.some(c=>c.uid===gotei.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-2).map(c=>c.uid).sort(),[visor.uid,other.uid].sort());
 const empty=main(green,29008);
 put(empty.s,0,'BLC-1-070','energy',0);
 put(empty.s,0,'BLC-1-078','energy',1);
 const none=setTop(empty.s,0,['BLC-4-062','BLC-4-061','BLC-4-060']);
 const again=take(empty.s,0,'BLC-3-007');
 empty.s.players[0].hand.push(again);
 const replay=legalUniversalActions(empty.packs,empty.s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front');
 const opened=dispatchUniversalAction(empty.packs,empty.s,replay);
 assert.equal(opened.pending.kind,'effect-top-order');
 const closed=orderBottom(empty.packs,opened);
 assert.equal(closed.pending,null);
 assert.equal(closed.players[0].hand.some(c=>none.some(x=>x.uid===c.uid)),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-002 may reveal one of four printed names from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-002');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張〈黑崎一護〉、〈阿散井戀次〉、〈朽木露琪亞〉或〈朽木白哉〉，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。');
 const card=bleach.cards['BLC-3-002'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'黒崎 一護'},{field:'name',value:'阿散井 恋次'},
  {field:'name',value:'朽木 ルキア'},{field:'name',value:'朽木 白哉'}]}]);
 const {packs,s}=main(blue,29002);
 put(s,0,'BLC-2-027','energy',0);
 const [ichigo,other,byakuya]=setTop(s,0,['BLC-2-016','BLC-2-041','BLC-2-029']);
 const self=take(s,0,'BLC-3-002');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(ichigo.uid),true);
 assert.equal(chosen(byakuya.uid),true);
 assert.equal(chosen(other.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:byakuya.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-2-029');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==byakuya.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===byakuya.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].deck.some(c=>c.uid===other.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-4-001 is also Bazz-B and may reveal Bazz-B or Jugram from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-001');
 assert.equal(printed.effect,'此卡也視為《巴茲比》。登場時：查看牌庫頂3張，最多公開1張《巴茲比》或《雨葛蘭・哈斯沃德》加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-001'];
 assert.equal(card.energy,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(cardHasName(card,'バズ'),true);
 assert.equal(cardHasName(card,'バズビー'),true);
 assert.equal(cardHasName(card,'バズビー',true),false);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'バズビー'},{field:'name',value:'ユーグラム・ハッシュヴァルト'}]}]);
 const {packs,s}=main(yellow,29001);
 put(s,0,'BLC-1-023','energy',0);
 const self=take(s,0,'BLC-4-001');
 const [alias,jugram,other]=setTop(s,0,['BLC-4-001','BLC-1-018','BLC-1-006']);
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(alias.uid),true);
 assert.equal(chosen(jugram.uid),true);
 assert.equal(chosen(other.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:alias.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-001');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==alias.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===alias.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].hand.some(c=>c.uid===other.uid),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-2-072 rests a cheap green character from hand only while Hitsugaya is on the own field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-072');
 assert.equal(printed.effect,'登場：己方場上有〈日番谷冬獅郎〉時，可從手牌將最多 1 張需求能源 2 以下、AP 消耗 1 的綠色角色卡，以 REST 登場於己方場上。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-072'];
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'deployOwnHandRest',type:'character',color:'green',
  energy:2,ap:1,max:1,when:{kind:'ownNameExists',turn:'any',zone:'field',
  excludeSelf:false,name:'日番谷 冬獅郎'}}]);
 const closed=main(green,29072);
 put(closed.s,0,'BLC-1-078','energy',0);
 put(closed.s,0,'BLC-1-080','energy',1);
 put(closed.s,1,'BLC-1-083','front',0);
 const lone=take(closed.s,0,'BLC-2-072');
 closed.s.players[0].hand.push(lone);
 const blocked=legalUniversalActions(closed.packs,closed.s).find(a=>a.type==='play'&&a.uid===lone.uid&&a.line==='front');
 assert.ok(blocked);
 const quiet=dispatchUniversalAction(closed.packs,closed.s,blocked);
 assert.equal(quiet.pending,null);
 const {packs,s}=main(green,29073);
 put(s,0,'BLC-1-078','energy',0);
 put(s,0,'BLC-1-080','energy',1);
 const gate=put(s,0,'BLC-1-083','energy',2);
 const cheap=take(s,0,'BLC-4-062');
 const heavy=take(s,0,'BLC-1-070');
 s.players[0].hand.push(cheap,heavy);
 const self=take(s,0,'BLC-2-072');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-hand-rest');
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseHandRest'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(cheap.uid),true);
 assert.equal(chosen(heavy.uid),false);
 assert.equal(chosen(gate.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseHandRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===cheap.uid),true);
 const enter=choices.find(a=>a.type==='chooseHandRest'&&a.uid===cheap.uid&&a.line==='front');
 assert.ok(enter);
 const entered=dispatchUniversalAction(packs,played,enter);
 assert.equal(entered.pending,null);
 const arrived=live(entered,0,cheap.uid);
 assert.equal(arrived.ready,false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,entered),true);
});

test('BLC-2-032 reveals one printed-AP-2 card from the top five and does not discard',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-032');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 5 張，可公開其中最多 1 張原始 AP 消耗 2 以上的卡並加入手牌，其餘以任意順序放至牌堆底。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-032'];
 assert.equal(card.energy,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopUpToTwoBottom',count:5,max:1,rest:'bottom',
  logic:'all',filters:[{field:'printedApAtLeast',value:2}]}]);
 const {packs,s}=main(blue,29032);
 put(s,0,'BLC-2-026','energy',0);
 put(s,0,'BLC-4-028','energy',1);
 const [heavy,light,a,b,c]=setTop(s,0,['BLC-4-022','BLC-2-031','BLC-2-027','BLC-2-041','BLC-4-036']);
 const self=take(s,0,'BLC-2-032');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-many-choice');
 assert.equal(played.pending.max,1);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFilteredMany'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(heavy.uid),true);
 assert.equal(chosen(light.uid),false);
 const skipped=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFilteredMany',uid:null}));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(x=>x.uid===heavy.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFilteredMany',uid:heavy.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-022');
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,undefined);
 const done=orderBottom(packs,taken);
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.some(x=>x.uid===heavy.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-4).map(x=>x.uid).sort(),[light.uid,a.uid,b.uid,c.uid].sort());
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-004 rests itself and one other active front character, then generates one more purple',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-004');
 assert.equal(printed.effect,'【啟動主要】【將此角色轉為 Rest】【每回合一次】將自己前線的 1 張 Active 角色轉為 Rest。若如此做，此角色在本回合中產生能源＋紫 1。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-3-004'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.mainAbility,{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1});
 const {packs,s}=main(purple,29004);
 const other=put(s,0,'BLC-1-035','front',0);
 const self=put(s,0,'BLC-3-004','energy',0);
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 const used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='restFrontGainEnergy'));
 assert.equal(used.pending.kind,'main-rest-front-energy');
 const targets=legalUniversalActions(packs,used);
 assert.equal(targets.some(a=>a.uid===other.uid),true);
 assert.equal(targets.some(a=>a.uid===self.uid),false);
 const done=dispatchUniversalAction(packs,used,{type:'chooseRestFrontEnergy',uid:other.uid});
 assert.equal(live(done,0,self.uid).ready,false);
 assert.equal(live(done,0,other.uid).ready,false);
 assert.equal(universalEnergyByColor(packs,done,0).purple,2);
 live(done,0,self.uid).ready=true;
 assert.equal(legalUniversalActions(packs,done).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 let later=done;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalEnergyByColor(packs,later,0).purple,1);
 const front=main(purple,29005);
 const source=put(front.s,0,'BLC-3-004','front',0);
 const mate=put(front.s,0,'BLC-1-039','front',1);
 assert.equal(universalEnergyByColor(front.packs,front.s,0).purple||0,0);
 const rested=dispatchUniversalAction(front.packs,front.s,legalUniversalActions(front.packs,front.s).find(a=>a.uid===source.uid&&a.mode==='restFrontGainEnergy'));
 const after=dispatchUniversalAction(front.packs,rested,{type:'chooseRestFrontEnergy',uid:mate.uid});
 assert.equal(live(after,0,source.uid).ready,false);
 assert.equal(universalEnergyByColor(front.packs,after,0).purple||0,0);
 assert.equal(live(after,0,source.uid).buffs.some(b=>b.energy===1),true);
 const alone=main(purple,29006);
 const only=put(alone.s,0,'BLC-3-004','front',0);
 put(alone.s,1,'BLC-1-035','front',0);
 assert.equal(legalUniversalActions(alone.packs,alone.s).some(a=>a.type==='activate'&&a.uid===only.uid),false);
 only.ready=false;
 const parked=put(alone.s,0,'BLC-1-039','front',1,false);
 assert.equal(legalUniversalActions(alone.packs,alone.s).some(a=>a.uid===only.uid),false);
 assert.equal(parked.ready,false);
 aiOk(packs,used);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(assertUniversalMatch(front.packs,after),true);
});

test('BLC-1-079 discards one hand card once per turn and generates two more green',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-079');
 assert.equal(printed.effect,'主要階段・每回合 1 次：將 1 張手牌送至場外，本回合額外產生 2 綠能源。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-1-079'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.mainAbility,{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,energy:2});
 const {packs,s}=main(green,29079);
 const self=put(s,0,'BLC-1-079','energy',0);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 const payment=s.players[0].hand[0];
 const used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='discardSelfBuff'));
 assert.equal(used.pending.kind,'main-discard-buff');
 assert.equal(used.pending.energy,2);
 const done=dispatchUniversalAction(packs,used,{type:'chooseMainDiscard',uid:payment.uid});
 assert.equal(live(done,0,self.uid).ready,true);
 assert.equal(done.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(universalEnergyByColor(packs,done,0).green,3);
 assert.equal(legalUniversalActions(packs,done).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const rested=main(green,29080);
 const quiet=put(rested.s,0,'BLC-1-079','energy',0,false);
 assert.equal(legalUniversalActions(rested.packs,rested.s).some(a=>a.uid===quiet.uid&&a.mode==='discardSelfBuff'),true);
 const side=main(green,29081);
 const front=put(side.s,0,'BLC-1-079','front',0);
 const spare=side.s.players[0].hand[0];
 const opened=dispatchUniversalAction(side.packs,side.s,legalUniversalActions(side.packs,side.s).find(a=>a.uid===front.uid&&a.mode==='discardSelfBuff'));
 const sided=dispatchUniversalAction(side.packs,opened,{type:'chooseMainDiscard',uid:spare.uid});
 assert.equal(live(sided,0,front.uid).ready,true);
 assert.equal(universalEnergyByColor(side.packs,sided,0).green||0,0);
 assert.equal(live(sided,0,front.uid).buffs.some(b=>b.energy===2),true);
 const empty=main(green,29082);
 const held=put(empty.s,0,'BLC-1-079','energy',0);
 empty.s.players[0].outside.push(...empty.s.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(empty.packs,empty.s).some(a=>a.uid===held.uid),false);
 aiOk(packs,used);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(assertUniversalMatch(side.packs,sided),true);
});

test('BLC-2-050 reveals one traitless non-Raid character from the top five',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-050');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 5 張，可公開其中最多 1 張不具有特徵、且不具有 Raid 的角色卡並加入手牌，其餘以任意順序放至牌堆底。若有卡加入手牌，再將 1 張手牌送至場外。');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-2-050'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,2);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:5,excludeRaid:true,
  filter:{field:'traitlessCharacter',value:true}}]);
 const older=bleach.cards['BLC-2-015'];
 assert.deepEqual(older.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'traitlessCharacter',value:true}}]);
 const {packs,s}=main(purple,29050);
 put(s,0,'BLC-1-103','energy',0);
 put(s,0,'BLC-1-035','energy',1);
 const [plain,raid,traited,event,named]=setTop(s,0,['BLC-4-046','BLC-1-041','BLC-4-052','BLC-1-062','BLC-1-039']);
 const self=take(s,0,'BLC-2-050');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 assert.equal(played.pending.excludeRaid,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(plain.uid),true);
 assert.equal(chosen(raid.uid),false);
 assert.equal(chosen(traited.uid),false);
 assert.equal(chosen(event.uid),false);
 assert.equal(chosen(named.uid),false);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>c.uid===plain.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:plain.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-046');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==plain.uid&&c.uid!==self.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===plain.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].deck.some(c=>c.uid===raid.uid),true);
 const prior=main(blue,29015);
 put(prior.s,0,'BLC-2-027','energy',0);
 const [raider,open,marked]=setTop(prior.s,0,['BLC-2-019','BLC-2-016','BLC-2-041']);
 const kisuke=take(prior.s,0,'BLC-2-015');
 prior.s.players[0].hand.push(kisuke);
 const again=legalUniversalActions(prior.packs,prior.s).find(a=>a.type==='play'&&a.uid===kisuke.uid&&a.line==='front');
 const opened=dispatchUniversalAction(prior.packs,prior.s,again);
 const olderChoices=legalUniversalActions(prior.packs,opened);
 const olderHit=uid=>olderChoices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(opened.pending.excludeRaid,undefined);
 assert.equal(olderHit(raider.uid),true);
 assert.equal(olderHit(open.uid),true);
 assert.equal(olderHit(marked.uid),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-1-108 rests, retires itself, draws two, then puts one hand card outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-108');
 assert.equal(printed.nameJa,'一護の部屋');
 assert.equal(printed.effect,'主要階段：REST 並退場自己，抽 2 張，再棄 1 張。');
 const card=bleach.cards['BLC-1-108'];
 assert.equal(card.name,'一護の部屋');
 assert.equal(card.type,'field');
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.mainAbility,{op:'fieldRestRetireThen',then:[{op:'drawDiscard',count:2,discardCount:1}]});
 const {packs,s}=main(purple,29108);
 const self=put(s,0,'BLC-1-108','energy',0);
 const beforeHand=s.players[0].hand.length,beforeDeck=s.players[0].deck.length;
 const used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='fieldRestTrueRetireDeploy'));
 assert.equal(used.players[0].energy.some(c=>c?.uid===self.uid),false);
 assert.equal(used.players[0].outside.some(c=>c.uid===self.uid),true);
 assert.equal(used.players[0].hand.length,beforeHand+2);
 assert.equal(used.players[0].deck.length,beforeDeck-2);
 assert.equal(used.pending.kind,'effect-discard');
 const spare=used.players[0].hand[0];
 const done=dispatchUniversalAction(packs,used,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.length,beforeHand+1);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 const quiet=main(purple,29109);
 const asleep=put(quiet.s,0,'BLC-1-108','energy',0,false);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='activate'&&a.uid===asleep.uid),false);
 aiOk(packs,used);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-010 places each of the top two on the top or the bottom',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-010');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 2 張牌。將這些卡片依任意張數與任意順序，分別放到牌庫頂與牌庫底。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-010'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'inspectTopArrange',count:2,split:true}]);
 const hirako=realDeck(['BLC-3-010','BLC-1-080','BLC-1-078','BLC-1-070','BLC-4-062','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-4-061','BLC-2-072','BLC-1-083','BLC-1-079'],'green');
 const {packs,s}=main(hirako,29010);
 put(s,0,'BLC-1-080','energy',0);
 const [first,second]=setTop(s,0,['BLC-1-078','BLC-4-062']);
 const under=s.players[0].deck[2];
 const self=take(s,0,'BLC-3-010');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-order');
 assert.equal(played.pending.split,true);
 const choices=legalUniversalActions(packs,played);
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.equal(choices.filter(a=>a.uid===first.uid).map(a=>a.place).sort().join(','),'bottom,top');
 assert.equal(choices.some(a=>a.place===undefined),false);
 const bottom=choices.find(a=>a.uid===first.uid&&a.place==='bottom');
 const afterBottom=dispatchUniversalAction(packs,played,bottom);
 const top=legalUniversalActions(packs,afterBottom).find(a=>a.uid===second.uid&&a.place==='top');
 const split=dispatchUniversalAction(packs,afterBottom,top);
 assert.equal(split.pending,null);
 assert.equal(split.players[0].deck[0].uid,second.uid);
 assert.equal(split.players[0].deck.at(-1).uid,first.uid);
 assert.equal(split.players[0].deck[1].uid,under.uid);
 const both=main(hirako,29011);
 put(both.s,0,'BLC-1-080','energy',0);
 const [alpha,beta]=setTop(both.s,0,['BLC-1-070','BLC-2-072']);
 const again=take(both.s,0,'BLC-3-010');
 both.s.players[0].hand.push(again);
 const opened=dispatchUniversalAction(both.packs,both.s,legalUniversalActions(both.packs,both.s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front'));
 const firstTop=legalUniversalActions(both.packs,opened).find(a=>a.uid===alpha.uid&&a.place==='top');
 const mid=dispatchUniversalAction(both.packs,opened,firstTop);
 const secondTop=legalUniversalActions(both.packs,mid).find(a=>a.uid===beta.uid&&a.place==='top');
 const stacked=dispatchUniversalAction(both.packs,mid,secondTop);
 assert.equal(stacked.players[0].deck[0].uid,alpha.uid);
 assert.equal(stacked.players[0].deck[1].uid,beta.uid);
 const short=main(hirako,29012);
 put(short.s,0,'BLC-1-080','energy',0);
 const only=setTop(short.s,0,['BLC-4-060'])[0];
 short.s.players[0].outside.push(...short.s.players[0].deck.splice(1));
 const lone=take(short.s,0,'BLC-3-010');
 short.s.players[0].hand.push(lone);
 const one=dispatchUniversalAction(short.packs,short.s,legalUniversalActions(short.packs,short.s).find(a=>a.type==='play'&&a.uid===lone.uid&&a.line==='front'));
 assert.equal(one.pending.uids.length,1);
 const placed=dispatchUniversalAction(short.packs,one,legalUniversalActions(short.packs,one).find(a=>a.uid===only.uid&&a.place==='bottom'));
 assert.equal(placed.players[0].deck.at(-1).uid,only.uid);
 const bare=main(hirako,29013);
 put(bare.s,0,'BLC-1-080','energy',0);
 bare.s.players[0].outside.push(...bare.s.players[0].deck.splice(0));
 const emptyHand=take(bare.s,0,'BLC-3-010');
 bare.s.players[0].hand.push(emptyHand);
 const quiet=dispatchUniversalAction(bare.packs,bare.s,legalUniversalActions(bare.packs,bare.s).find(a=>a.type==='play'&&a.uid===emptyHand.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===emptyHand.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,split),true);
 assert.equal(assertUniversalMatch(both.packs,stacked),true);
});

test('BLC-2-018 returns one opposing front character at BP 4000 or lower, then draws and discards on the front',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-018');
 assert.equal(printed.effect,'登場：可將最多 1 個敵方前線 BP 4000 以下角色返回手牌。主要階段・位於前線・每回合 1 次：抽 1 張，再將 1 張手牌送至場外。');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-2-018'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'bounceOppFrontOneUnderBp',bp:4000,optional:true}]);
 assert.deepEqual(card.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'drawDiscard',count:1,discardCount:1}]});
 const ichigo=realDeck(['BLC-2-018','BLC-4-027','BLC-2-020','BLC-4-036','BLC-2-016','BLC-2-027','BLC-4-022','BLC-4-028','BLC-3-002','BLC-2-032','BLC-2-015','BLC-2-019','BLC-2-026'],'blue');
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[ichigo,ichigo],seed:29018,first:0});
 let mains=0;
 for(let n=0;n<40&&mains<2;n++){
  if(s.active===0&&s.phase==='main'){
   mains++;
   if(mains===2)break;
  }
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step,s.pending?.kind||s.phase);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(s.players[0].ownTurns,2);
 put(s,0,'BLC-4-027','energy',0);
 put(s,0,'BLC-2-020','energy',1);
 const legal=put(s,1,'BLC-4-036','front',0);
 const tall=put(s,1,'BLC-4-022','front',1);
 tall.buffs.push({bp:1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,tall),5000);
 const aside=put(s,1,'BLC-2-016','energy',0);
 const self=take(s,0,'BLC-2-018');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const opened=dispatchUniversalAction(packs,s,play);
 assert.equal(opened.pending.kind,'effect-bounce-bp');
 const choices=legalUniversalActions(packs,opened);
 assert.equal(choices.some(a=>a.uid===legal.uid),true);
 assert.equal(choices.some(a=>a.uid===tall.uid),false);
 assert.equal(choices.some(a=>a.uid===aside.uid),false);
 assert.equal(choices.some(a=>a.uid===null),true);
 const returned=dispatchUniversalAction(packs,opened,choices.find(a=>a.uid===legal.uid));
 assert.equal(returned.pending,null);
 assert.equal(returned.players[1].hand.some(c=>c.uid===legal.uid),true);
 assert.equal(returned.players[1].front.some(c=>c?.uid===legal.uid),false);
 assert.equal(returned.players[1].front.some(c=>c?.uid===tall.uid),true);
 const onFront=returned.players[0].front.find(c=>c?.uid===self.uid);
 assert.ok(onFront);
 assert.equal(onFront.ready,false);
 const beforeHand=returned.players[0].hand.length;
 const beforeDeck=returned.players[0].deck.length;
 const act=legalUniversalActions(packs,returned).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='frontOnce');
 assert.ok(act);
 const drawing=dispatchUniversalAction(packs,returned,act);
 assert.equal(drawing.pending.kind,'effect-discard');
 assert.equal(drawing.players[0].hand.length,beforeHand+1);
 assert.equal(drawing.players[0].deck.length,beforeDeck-1);
 const spare=drawing.players[0].hand.find(c=>c.uid!==self.uid);
 const dumped=dispatchUniversalAction(packs,drawing,legalUniversalActions(packs,drawing).find(a=>a.type==='chooseDiscard'&&a.uid===spare.uid));
 assert.equal(dumped.pending,null);
 assert.equal(dumped.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(legalUniversalActions(packs,dumped).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const quiet=main(ichigo,29019);
 put(quiet.s,0,'BLC-4-027','energy',0);
 put(quiet.s,0,'BLC-2-020','energy',1);
 const parked=put(quiet.s,0,'BLC-2-018','energy',2);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 const skipped=main(ichigo,29020);
 for(let n=0;n<40&&!(skipped.s.active===0&&skipped.s.phase==='main'&&skipped.s.players[0].ownTurns===2);n++){
  const step=legalUniversalActions(skipped.packs,skipped.s).find(a=>a.type==='next');
  assert.ok(step);
  skipped.s=dispatchUniversalAction(skipped.packs,skipped.s,step);
 }
 put(skipped.s,0,'BLC-4-027','energy',0);
 put(skipped.s,0,'BLC-2-020','energy',1);
 const high=put(skipped.s,1,'BLC-4-022','front',0);
 high.buffs.push({bp:1000,untilTurn:skipped.s.turn});
 const alone=take(skipped.s,0,'BLC-2-018');
 skipped.s.players[0].hand.push(alone);
 const entered=dispatchUniversalAction(skipped.packs,skipped.s,legalUniversalActions(skipped.packs,skipped.s).find(a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front'));
 assert.equal(entered.pending,null);
 assert.equal(entered.players[1].front.some(c=>c?.uid===high.uid),true);
 aiOk(packs,opened);
 assert.equal(assertUniversalMatch(packs,dumped),true);
 assert.equal(assertUniversalMatch(skipped.packs,entered),true);
});

test('BLC-1-056 rests, retires, and must add one purple character from outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-056');
 assert.equal(printed.effect,'主要階段：REST 並退場自己，從己方場外將 1 張紫色角色卡加入手牌。');
 assert.equal(printed.traits,'零番隊');
 const card=bleach.cards['BLC-1-056'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['零番隊']);
 assert.deepEqual(card.mainAbility,{op:'restRetireRecoverOutside',optional:false,
  filters:[{field:'color',value:'purple'},{field:'type',value:'character'}],logic:'all'});
 const kirinji=realDeck(['BLC-1-056','BLC-1-062','BLC-1-108','BLC-1-039','BLC-4-046'],'purple');
 const {packs,s}=main(kirinji,29056);
 const self=put(s,0,'BLC-1-056','energy',0,true);
 const asleep=put(s,0,'BLC-1-056','front',0,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===asleep.uid),false);
 const event=take(s,0,'BLC-1-062');
 const fieldCard=take(s,0,'BLC-1-108');
 const other=take(s,0,'BLC-4-046');
 s.players[0].outside.push(event,fieldCard,other);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='restRetireRecover');
 assert.ok(act);
 const paid=dispatchUniversalAction(packs,s,act);
 assert.equal(paid.players[0].energy[0],null);
 assert.equal(paid.pending.kind,'effect-recover-outside');
 assert.equal(paid.pending.optional,false);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===null),false);
 const ids=paid.pending.choices.map(uid=>paid.players[0].outside.find(c=>c.uid===uid).cardId).sort();
 assert.deepEqual(ids,['BLC-1-056','BLC-4-046']);
 const taken=dispatchUniversalAction(packs,paid,legalUniversalActions(packs,paid).find(a=>a.uid===other.uid));
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===self.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===fieldCard.uid),true);
 const alone=main(kirinji,29057);
 const only=put(alone.s,0,'BLC-1-056','front',0,true);
 const back=dispatchUniversalAction(alone.packs,alone.s,legalUniversalActions(alone.packs,alone.s).find(a=>a.type==='activate'&&a.uid===only.uid&&a.mode==='restRetireRecover'));
 assert.deepEqual(back.pending.choices,[only.uid]);
 const home=dispatchUniversalAction(alone.packs,back,legalUniversalActions(alone.packs,back)[0]);
 assert.equal(home.players[0].hand.some(c=>c.uid===only.uid),true);
 assert.equal(home.players[0].front[0],null);
 aiOk(packs,paid);
 assert.equal(assertUniversalMatch(packs,taken),true);
 assert.equal(assertUniversalMatch(alone.packs,home),true);
});

test('BLC-4-024 moves one other traitless character and generates two blue',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-024');
 assert.equal(printed.effect,'登場時：最多選自己場上另1個沒有特徵的角色，移至另一條線；目的線已滿時，先選該線1張卡除外。');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.gen,3);
 const card=bleach.cards['BLC-4-024'];
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'moveOtherAcrossOrRemove',optional:true,traitless:true}]);
 // Catalogue token 「無」 stays a trait. An empty list is the traitless print.
 assert.deepEqual(bleach.cards['BLC-1-039'].traits,['無']);
 const kisuke=realDeck(['BLC-4-024','BLC-4-027','BLC-2-016','BLC-2-031','BLC-2-025','BLC-2-036','BLC-2-029','BLC-4-035','BLC-2-040','BLC-4-042','BLC-2-039','BLC-4-038','BLC-2-020'],'blue');
 const {packs,s}=main(kisuke,29024);
 const fuel=put(s,0,'BLC-4-027','energy',0);
 const before=universalEnergyByColor(packs,s,0).blue;
 const generator=put(s,0,'BLC-4-024','energy',1);
 assert.equal(universalEnergyByColor(packs,s,0).blue,before+2);
 const bare=put(s,0,'BLC-2-016','energy',2);
 const traited=put(s,0,'BLC-2-031','front',0);
 const self=take(s,0,'BLC-4-024');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===1);
 assert.ok(play);
 const opened=dispatchUniversalAction(packs,s,play);
 assert.equal(opened.pending.kind,'effect-line-move');
 assert.equal(opened.pending.traitless,true);
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.choices.includes(bare.uid),true);
 assert.equal(opened.pending.choices.includes(self.uid),false);
 assert.equal(opened.pending.choices.includes(generator.uid),true);
 assert.equal(opened.pending.choices.includes(fuel.uid),true);
 assert.equal(opened.pending.choices.includes(traited.uid),false);
 aiOk(packs,opened);
 const moving=dispatchUniversalAction(packs,opened,legalUniversalActions(packs,opened).find(a=>a.type==='chooseLineMove'&&a.uid===bare.uid));
 assert.equal(moving.pending.kind,'effect-line-slot');
 const landed=dispatchUniversalAction(packs,moving,legalUniversalActions(packs,moving).find(a=>a.type==='chooseLineSlot'&&a.slot===2));
 assert.equal(landed.pending,null);
 assert.equal(landed.players[0].front[2].uid,bare.uid);
 assert.equal(landed.players[0].energy[2],null);
 assert.equal(landed.players[0].front[1].uid,self.uid);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseLineMove',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].energy[2].uid,bare.uid);
 const quiet=main(kisuke,29025);
 put(quiet.s,0,'BLC-4-042','energy',0);
 put(quiet.s,0,'BLC-2-031','energy',1);
 const alone=take(quiet.s,0,'BLC-4-024');
 quiet.s.players[0].hand.push(alone);
 const none=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front'));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].front.some(c=>c?.uid===alone.uid),true);
 const full=main(kisuke,29026);
 put(full.s,0,'BLC-4-027','energy',0);
 const mover=put(full.s,0,'BLC-2-016','energy',1);
 const occupants=[0,1,2,3].map(slot=>put(full.s,0,'BLC-2-031','front',slot));
 const entering=take(full.s,0,'BLC-4-024');
 full.s.players[0].hand.push(entering);
 const crowded=dispatchUniversalAction(full.packs,full.s,legalUniversalActions(full.packs,full.s).find(a=>a.type==='play'&&a.uid===entering.uid&&a.line==='energy'&&a.slot===2));
 assert.equal(crowded.pending.choices.includes(mover.uid),true);
 assert.equal(crowded.pending.choices.some(uid=>occupants.some(c=>c.uid===uid)),false);
 const chosen=dispatchUniversalAction(full.packs,crowded,{type:'chooseLineMove',uid:mover.uid});
 const removed=dispatchUniversalAction(full.packs,chosen,legalUniversalActions(full.packs,chosen).find(a=>a.type==='chooseLineSlot'&&a.replaceUid===occupants[0].uid));
 assert.equal(removed.players[0].removed.some(c=>c.uid===occupants[0].uid),true);
 assert.equal(removed.players[0].front[0].uid,mover.uid);
 assert.equal(removed.players[0].energy[1],null);
 assert.equal(assertUniversalMatch(packs,landed),true);
 assert.equal(assertUniversalMatch(quiet.packs,none),true);
 assert.equal(assertUniversalMatch(full.packs,removed),true);
});

test('BLC-1-004 raids onto Es Nott, has Impact 1, and may rest one front character at live BP 3000',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-004');
 assert.equal(printed.effect,'Raid〈艾斯・諾特〉：轉為 ACTIVE，可移至前線。Impact 1。主要階段・位於前線・每回合 1 次：可選最多 1 個敵方前線 BP 3000 以下角色，將其轉為 REST。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-004'];
 assert.equal(card.raidName,'エス・ノト');
 assert.equal(card.printedImpact,1);
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'restOppFrontUnderBp',bp:3000,optional:true}]});
 const es=realDeck(['BLC-1-004','BLC-1-002','BLC-1-005','BLC-1-006','BLC-1-007','BLC-1-017','BLC-1-015','BLC-1-012','BLC-1-019','BLC-1-023','BLC-2-007','BLC-1-027','BLC-4-014'],'yellow');
 const {packs,s}=main(es,29004);
 const asleep=put(s,0,'BLC-1-004','front',0,false);
 const parked=put(s,0,'BLC-1-004','energy',1,true);
 assert.equal(universalImpact(packs,s,asleep),1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 const low=put(s,1,'BLC-1-005','front',0,true);
 const raised=put(s,1,'BLC-1-005','front',1,true);
 raised.buffs.push({bp:1000,untilTurn:s.turn});
 const high=put(s,1,'BLC-1-006','front',2,true);
 high.buffs.push({bp:-1000,untilTurn:s.turn});
 const aside=put(s,1,'BLC-1-012','energy',0,true);
 assert.equal(universalBp(packs,s,low),3000);
 assert.equal(universalBp(packs,s,raised),4000);
 assert.equal(universalBp(packs,s,high),3000);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===asleep.uid&&a.mode==='frontOnce');
 assert.ok(act);
 const opened=dispatchUniversalAction(packs,s,act);
 assert.equal(opened.pending.kind,'effect-rest-bp');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.limit,3000);
 const choices=legalUniversalActions(packs,opened);
 assert.equal(choices[0].uid,null);
 assert.equal(choices.some(a=>a.uid===low.uid),true);
 assert.equal(choices.some(a=>a.uid===high.uid),true);
 assert.equal(choices.some(a=>a.uid===raised.uid),false);
 assert.equal(choices.some(a=>a.uid===aside.uid),false);
 aiOk(packs,opened);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseRestBp',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0].ready,true);
 const rested=dispatchUniversalAction(packs,opened,choices.find(a=>a.uid===low.uid));
 assert.equal(rested.pending,null);
 assert.equal(rested.players[1].front.find(c=>c?.uid===low.uid).ready,false);
 assert.equal(rested.players[1].front.find(c=>c?.uid===high.uid).ready,true);
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.type==='activate'&&a.uid===asleep.uid),false);
 const quiet=main(es,29005);
 const lone=put(quiet.s,0,'BLC-1-004','front',0,true);
 const used=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='activate'&&a.uid===lone.uid&&a.mode==='frontOnce'));
 assert.equal(used.pending,null);
 assert.equal(used.players[0].front[0].ready,true);
 assert.equal(legalUniversalActions(quiet.packs,used).some(a=>a.type==='activate'&&a.uid===lone.uid),false);
 const raid=main(es,29006);
 put(raid.s,0,'BLC-1-007','energy',0);
 put(raid.s,0,'BLC-1-017','energy',1);
 const base=put(raid.s,0,'BLC-1-002','energy',2);
 const other=put(raid.s,0,'BLC-1-012','front',1);
 const raider=take(raid.s,0,'BLC-1-004');
 raid.s.players[0].hand.push(raider);
 const legal=legalUniversalActions(raid.packs,raid.s);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===other.uid),false);
 const action=legal.find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(action);
 const stacked=dispatchUniversalAction(raid.packs,raid.s,action);
 const top=stacked.players[0].front[0];
 assert.equal(top.uid,raider.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(stacked.players[0].energy[2],null);
 assert.equal(universalImpact(raid.packs,stacked,top),1);
 assert.equal(assertUniversalMatch(packs,rested),true);
 assert.equal(assertUniversalMatch(quiet.packs,used),true);
 assert.equal(assertUniversalMatch(raid.packs,stacked),true);
});

test('BLC-1-046 mills one card from the front, then may give another character BP+500',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-046');
 assert.equal(printed.effect,'前線・每回合 1 次：牌堆頂 1 張送場外，成功時可讓另一己方角色本回合 BP +500。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-1-046'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.then[0].op,'millTop');
 assert.equal(card.mainAbility.then[0].count,1);
 const renji=realDeck(['BLC-1-046','BLC-4-046','BLC-1-108','BLC-1-039','BLC-1-062','BLC-2-050','BLC-3-004','BLC-1-041','BLC-1-035','BLC-4-052','BLC-1-103','BLC-1-034','BLC-1-036'],'purple');
 const {packs,s}=main(renji,29046);
 const self=put(s,0,'BLC-1-046','front',0,false);
 const parked=put(s,0,'BLC-1-046','energy',0,true);
 const other=put(s,0,'BLC-4-046','front',1);
 const aside=put(s,0,'BLC-1-039','energy',1);
 const fieldCard=put(s,0,'BLC-1-108','energy',2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 const [top]=setTop(s,0,['BLC-1-062']);
 const beforeDeck=s.players[0].deck.length;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='frontOnce');
 assert.ok(act);
 const opened=dispatchUniversalAction(packs,s,act);
 assert.equal(opened.players[0].deck.length,beforeDeck-1);
 assert.equal(opened.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(opened.players[0].front[0].ready,false);
 assert.equal(opened.pending.kind,'effect-buff-own');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.bp,500);
 const choices=legalUniversalActions(packs,opened);
 assert.equal(choices[0].uid,null);
 assert.equal(choices.some(a=>a.uid===other.uid),true);
 assert.equal(choices.some(a=>a.uid===aside.uid),true);
 assert.equal(choices.some(a=>a.uid===self.uid),false);
 assert.equal(choices.some(a=>a.uid===parked.uid),true);
 assert.equal(choices.some(a=>a.uid===fieldCard.uid),false);
 aiOk(packs,opened);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front[1]),1000);
 const buffed=dispatchUniversalAction(packs,opened,choices.find(a=>a.uid===other.uid));
 assert.equal(buffed.pending,null);
 assert.equal(universalBp(packs,buffed,buffed.players[0].front[1]),1500);
 assert.equal(buffed.players[0].front[1].buffs.some(b=>b.bp===500&&b.untilTurn===buffed.turn),true);
 assert.equal(legalUniversalActions(packs,buffed).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const quiet=main(renji,29047);
 const lone=put(quiet.s,0,'BLC-1-046','front',0,true);
 const mate=put(quiet.s,0,'BLC-4-046','energy',0);
 quiet.s.players[0].outside.push(...quiet.s.players[0].deck.splice(0));
 const unused=universalBp(quiet.packs,quiet.s,mate);
 const done=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='activate'&&a.uid===lone.uid&&a.mode==='frontOnce'));
 assert.equal(done.pending,null);
 assert.equal(done.players[0].front[0].ready,true);
 assert.equal(universalBp(quiet.packs,done,done.players[0].energy[0]),unused);
 assert.equal(legalUniversalActions(quiet.packs,done).some(a=>a.type==='activate'&&a.uid===lone.uid),false);
 assert.equal(assertUniversalMatch(packs,buffed),true);
 assert.equal(assertUniversalMatch(quiet.packs,done),true);
});

test('BLC-4-063 gives another character BP+1000, or BP+2000 for four printed names',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-063');
 assert.equal(printed.effect,'登場時：最多選自己場上另1個角色，本回合BP+1000；若所選角色為《更木劍八》、《草鹿八千流》、《斑目一角》或《綾瀨川弓親》，改為BP+2000。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.gen,3);
 const card=bleach.cards['BLC-4-063'];
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.effects.onPlay[0].bp,1000);
 assert.equal(card.effects.onPlay[0].bonusBp,2000);
 assert.deepEqual(card.effects.onPlay[0].bonusNames,['更木 剣八','草鹿 やちる','斑目 一角','綾瀬川 弓親']);
 const yumi=realDeck(['BLC-4-063','BLC-1-094','BLC-4-076','BLC-1-080','BLC-1-076','BLC-2-071','BLC-1-067','BLC-1-091','BLC-1-078','BLC-1-087','BLC-4-062','BLC-2-072','BLC-1-079'],'green');
 const {packs,s}=main(yumi,29063);
 const fieldA=put(s,0,'BLC-1-094','energy',0);
 const fieldB=put(s,0,'BLC-4-076','energy',1);
 const before=universalEnergyByColor(packs,s,0).green;
 const generator=put(s,0,'BLC-4-063','energy',2);
 assert.equal(universalEnergyByColor(packs,s,0).green,before+2);
 const ken=put(s,0,'BLC-1-080','front',0);
 const yama=put(s,0,'BLC-1-091','front',1);
 const yachiru=put(s,0,'BLC-1-076','energy',3);
 const self=take(s,0,'BLC-4-063');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 const opened=dispatchUniversalAction(packs,s,play);
 assert.equal(opened.pending.kind,'effect-buff-own');
 assert.equal(opened.pending.bonusBp,2000);
 assert.equal(opened.pending.choices.includes(ken.uid),true);
 assert.equal(opened.pending.choices.includes(yama.uid),true);
 assert.equal(opened.pending.choices.includes(yachiru.uid),true);
 assert.equal(opened.pending.choices.includes(self.uid),false);
 assert.equal(opened.pending.choices.includes(generator.uid),true);
 assert.equal(opened.pending.choices.includes(fieldA.uid),false);
 assert.equal(opened.pending.choices.includes(fieldB.uid),false);
 aiOk(packs,opened);
 const kenBefore=universalBp(packs,opened,opened.players[0].front[0]);
 const yamaBefore=universalBp(packs,opened,opened.players[0].front[1]);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front[0]),kenBefore);
 const named=dispatchUniversalAction(packs,opened,legalUniversalActions(packs,opened).find(a=>a.type==='chooseOwnBuff'&&a.uid===ken.uid));
 assert.equal(universalBp(packs,named,named.players[0].front[0]),kenBefore+2000);
 const plain=main(yumi,29064);
 put(plain.s,0,'BLC-1-094','energy',0);
 put(plain.s,0,'BLC-4-076','energy',1);
 const other=put(plain.s,0,'BLC-1-091','front',0);
 const ikkaku=put(plain.s,0,'BLC-2-071','front',1);
 const entering=take(plain.s,0,'BLC-4-063');
 plain.s.players[0].hand.push(entering);
 const again=dispatchUniversalAction(plain.packs,plain.s,legalUniversalActions(plain.packs,plain.s).find(a=>a.type==='play'&&a.uid===entering.uid&&a.line==='front'&&a.slot===2));
 const otherBefore=universalBp(plain.packs,again,again.players[0].front[0]);
 const ikkakuBefore=universalBp(plain.packs,again,again.players[0].front[1]);
 const raised=dispatchUniversalAction(plain.packs,again,legalUniversalActions(plain.packs,again).find(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid));
 assert.equal(universalBp(plain.packs,raised,raised.players[0].front[0]),otherBefore+1000);
 assert.equal(universalBp(plain.packs,raised,raised.players[0].front[1]),ikkakuBefore);
 const quiet=main(yumi,29065);
 put(quiet.s,0,'BLC-1-094','energy',0);
 put(quiet.s,0,'BLC-4-076','energy',1);
 const alone=take(quiet.s,0,'BLC-4-063');
 quiet.s.players[0].hand.push(alone);
 const none=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front'));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].front.some(c=>c?.uid===alone.uid),true);
 assert.equal(assertUniversalMatch(packs,named),true);
 assert.equal(assertUniversalMatch(plain.packs,raised),true);
 assert.equal(assertUniversalMatch(quiet.packs,none),true);
});

test('BLC-4-064 reveals one green event or one green field from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-064');
 assert.equal(printed.effect,'登場時：查看牌庫頂3張，最多公開1張綠色事件卡或綠色場地卡加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,0);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-4-064'];
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 const groups=[
  {logic:'all',filters:[{field:'color',value:'green'},{field:'type',value:'event'}]},
  {logic:'all',filters:[{field:'color',value:'green'},{field:'type',value:'field'}]}
 ];
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,groups}]);
 const deck=realDeck(['BLC-4-064','BLC-1-095','BLC-4-076','BLC-1-080','BLC-1-094','BLC-1-068','BLC-1-070','BLC-1-078','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-1-079'],'green');
 const {packs,s}=main(deck,29064);
 const [event,field,character]=setTop(s,0,['BLC-1-095','BLC-4-076','BLC-1-080']);
 const self=take(s,0,'BLC-4-064');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(played.pending.groups,groups);
 const pub=universalPublicView(packs,played,1);
 assert.deepEqual(pub.pending,{kind:'effect-top-filter-choice',player:0});
 assert.equal(pub.players[0].hand,null);
 assert.equal(pub.publicReveals.some(r=>[event.uid,field.uid,character.uid].includes(r.uid)),false);
 assert.equal(universalPrivateChoices(packs,played,1),null);
 const shown=universalPrivateChoices(packs,played,0).options.filter(o=>o.card).map(o=>o.card.cardId);
 assert.deepEqual(shown.sort(),['BLC-1-095','BLC-4-076'].sort());
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(event.uid),true);
 assert.equal(chosen(field.uid),true);
 assert.equal(chosen(character.uid),false);
 const forged=structuredClone(played);
 forged.pending.groups[1].filters[1].value='character';
 assert.throws(()=>assertUniversalMatch(packs,forged),/grouped top-filter/);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>[event.uid,field.uid,character.uid].includes(c.uid)),false);
 assert.equal(missed.publicReveals.some(r=>r.kind==='searched-to-hand'),false);
 assert.deepEqual(missed.players[0].deck.slice(-3).map(c=>c.uid).sort(),[event.uid,field.uid,character.uid].sort());
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:event.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-1-095');
 assert.equal(taken.publicReveals.filter(r=>r.kind==='searched-to-hand').length,1);
 assert.equal(taken.pending.discardAfter,true);
 assert.equal(taken.pending.uids.includes(event.uid),false);
 const ordered=orderBottom(packs,taken);
 assert.equal(ordered.pending.kind,'effect-discard');
 const spare=ordered.players[0].hand.find(c=>c.uid!==event.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-2).map(c=>c.uid).sort(),[field.uid,character.uid].sort());
 const again=main(deck,29066);
 const [onlyChar,field2,event2]=setTop(again.s,0,['BLC-1-080','BLC-4-076','BLC-1-095']);
 const self2=take(again.s,0,'BLC-4-064');
 again.s.players[0].hand.push(self2);
 const opened=dispatchUniversalAction(again.packs,again.s,legalUniversalActions(again.packs,again.s).find(a=>a.type==='play'&&a.uid===self2.uid&&a.line==='front'));
 const legal2=legalUniversalActions(again.packs,opened);
 assert.equal(legal2.some(a=>a.uid===onlyChar.uid),false);
 assert.equal(legal2.some(a=>a.uid===event2.uid),true);
 const got=dispatchUniversalAction(again.packs,opened,legal2.find(a=>a.type==='chooseTopFiltered'&&a.uid===field2.uid));
 assert.equal(got.publicReveals.at(-1).cardId,'BLC-4-076');
 const dumped=orderBottom(again.packs,got);
 const spare2=dumped.players[0].hand.find(c=>c.uid!==field2.uid);
 const finished=dispatchUniversalAction(again.packs,dumped,{type:'chooseDiscard',uid:spare2.uid});
 assert.equal(finished.players[0].hand.some(c=>c.uid===field2.uid),true);
 assert.deepEqual(finished.players[0].deck.slice(-2).map(c=>c.uid).sort(),[onlyChar.uid,event2.uid].sort());
 const none=main(deck,29067);
 const chars=setTop(none.s,0,['BLC-1-080','BLC-1-068','BLC-1-070']);
 const self3=take(none.s,0,'BLC-4-064');
 none.s.players[0].hand.push(self3);
 const opened3=dispatchUniversalAction(none.packs,none.s,legalUniversalActions(none.packs,none.s).find(a=>a.type==='play'&&a.uid===self3.uid&&a.line==='front'));
 assert.equal(opened3.pending.kind,'effect-top-order');
 const closed=orderBottom(none.packs,opened3);
 assert.equal(closed.pending,null);
 assert.equal(closed.players[0].hand.some(c=>chars.some(x=>x.uid===c.uid)),false);
 const dry=main(deck,29068);
 const self4=take(dry.s,0,'BLC-4-064');
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 dry.s.players[0].hand.push(self4);
 const quietPlay=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===self4.uid&&a.line==='front'));
 assert.equal(quietPlay.pending,null);
 assert.equal(quietPlay.players[0].front.some(c=>c?.uid===self4.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(assertUniversalMatch(again.packs,finished),true);
 assert.equal(assertUniversalMatch(none.packs,closed),true);
 assert.equal(assertUniversalMatch(dry.packs,quietPlay),true);
});

test('BLC-2-005 rests an opposing front character only after a character effect enters it',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-005');
 assert.equal(printed.effect,'登場：若透過己方角色的效果登場，可將最多 1 個敵方前線角色轉為 REST。');
 assert.equal(printed.traits,'護廷十三隊／殭屍');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-2-005'];
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊／殭屍']);
 assert.deepEqual(card.effects.onPlay,[{op:'restOppFrontOne',optional:true,entry:'ownCharacter'}]);
 const deck=realDeck(['BLC-2-005','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-001','BLC-1-021','BLC-4-001','BLC-1-006','BLC-1-023','BLC-1-032','BLC-2-003','BLC-1-008','BLC-1-016'],'yellow');
 const {packs,s}=main(deck,29005);
 put(s,0,'BLC-1-002','energy',0);
 put(s,0,'BLC-1-012','energy',1);
 put(s,0,'BLC-1-018','energy',2);
 const foe=put(s,1,'BLC-1-001','front',0,true);
 const self=take(s,0,'BLC-2-005');
 s.players[0].hand.push(self);
 const paid=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(paid.pending,null);
 assert.equal(paid.players[1].front.find(c=>c?.uid===foe.uid).ready,true);
 assert.equal(paid.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 const hit={id:card.id,name:card.name,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,traits:[...card.traits],trigger:card.trigger,
  implementation:'dsl',effects:card.effects};
 const deploy={op:'deployOwnHandRest',type:'character',color:'yellow',energy:3,ap:1,max:1};
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:2000,
  gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-own-character',cards:[
  hit,unit('SRC',{effects:{onPlay:[deploy]}}),
  unit('EVT',{type:'event',bp:0,gen:0,effects:{onPlay:[deploy]}}),
  unit('FLD',{type:'field',bp:0,effects:{onPlay:[deploy]}}),
  unit('FOE',{implementation:'vanilla'}),
  ...['A','B','C','D','E','F','G','H'].map(id=>unit(id,{implementation:'vanilla'}))
 ]});
 const ids=['BLC-2-005','SRC','EVT','FLD','FOE','A','B','C','D','E','F','G','H'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 function boot(seed){
  let state=newUniversalMatch(both,{decks:[counts,counts],seed,first:0});
  for(let n=0;n<8&&state.phase!=='main';n++)
   state=dispatchUniversalAction(both,state,{type:'next'});
  return state;
 }
 function lift(state,p,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=state.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 function enter(seed,sourceId){
  let state=boot(seed);
  const rival=lift(state,1,'FOE');
  rival.ready=true;rival.fieldEntryStamp=state.nextFieldEntryStamp++;
  state.players[1].front[0]=rival;
  const child=lift(state,0,'BLC-2-005');
  const source=lift(state,0,sourceId);
  state.players[0].hand.push(child,source);
  const action=legalUniversalActions(both,state).find(a=>a.uid===source.uid&&!a.replaceUid&&
   (sourceId==='EVT'?a.type==='event':a.type==='play'&&a.line===(sourceId==='FLD'?'energy':'front')));
  assert.ok(action,sourceId);
  const opened=dispatchUniversalAction(both,state,action);
  assert.equal(opened.pending.kind,'effect-hand-rest');
  const seat=legalUniversalActions(both,opened).find(a=>a.type==='chooseHandRest'&&a.uid===child.uid&&a.line==='front');
  assert.ok(seat,sourceId);
  const entered=dispatchUniversalAction(both,opened,seat);
  return {entered,rival,child};
 }
 const byCharacter=enter(290051,'SRC');
 assert.equal(byCharacter.entered.pending.kind,'effect-rest-bp');
 assert.deepEqual(universalPublicView(both,byCharacter.entered,1).pending,{kind:'effect-rest-bp',player:0});
 const restLegal=legalUniversalActions(both,byCharacter.entered);
 assert.equal(restLegal.some(a=>a.type==='chooseRestBp'&&a.uid===null),true);
 assert.equal(restLegal.some(a=>a.type==='chooseRestBp'&&a.uid===byCharacter.rival.uid),true);
 const skipped=dispatchUniversalAction(both,byCharacter.entered,restLegal.find(a=>a.uid===null));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0].ready,true);
 const again=enter(290052,'SRC');
 const rested=dispatchUniversalAction(both,again.entered,legalUniversalActions(both,again.entered).find(a=>a.type==='chooseRestBp'&&a.uid===again.rival.uid));
 assert.equal(rested.pending,null);
 assert.equal(rested.players[1].front.find(c=>c?.uid===again.rival.uid).ready,false);
 assert.equal(rested.players[0].front.find(c=>c?.uid===again.child.uid).ready,false);
 const byEvent=enter(290053,'EVT');
 assert.equal(byEvent.entered.pending,null);
 assert.equal(byEvent.entered.players[1].front[0].ready,true);
 assert.equal(byEvent.entered.players[0].front.some(c=>c?.uid===byEvent.child.uid),true);
 const byField=enter(290054,'FLD');
 assert.equal(byField.entered.pending,null);
 assert.equal(byField.entered.players[1].front[0].ready,true);
 let quiet=boot(290055);
 const lonely=lift(quiet,0,'BLC-2-005');
 const source=lift(quiet,0,'SRC');
 quiet.players[0].hand.push(lonely,source);
 const played=dispatchUniversalAction(both,quiet,legalUniversalActions(both,quiet).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 const seated=dispatchUniversalAction(both,played,legalUniversalActions(both,played).find(a=>a.type==='chooseHandRest'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(seated.pending,null);
 assert.equal(seated.players[0].front.some(c=>c?.uid===lonely.uid),true);
 aiOk(both,byCharacter.entered);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(both,rested),true);
 assert.equal(assertUniversalMatch(both,byEvent.entered),true);
 assert.equal(assertUniversalMatch(both,byField.entered),true);
 assert.equal(assertUniversalMatch(both,seated),true);
});

test('BLC-2-006 draws only after a character effect, then pays 1 AP for this-turn Impact 1',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-006');
 assert.equal(printed.effect,'登場：若透過己方角色的效果登場，抽 1 張。主要階段・每回合 1 次：支付 1 AP，使此角色本回合獲得 Impact 1。');
 assert.equal(printed.traits,'星十字騎士團／殭屍');
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-2-006'];
 assert.deepEqual(card.traits,['星十字騎士團／殭屍']);
 assert.deepEqual(card.effects.onPlay,[{op:'draw',count:1,entry:'ownCharacter'}]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'grantSelfImpactThisTurn',amount:1}]});
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.equal(card.printedImpact||0,0);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-draw-entry',cards:[{...bare,effects:{onPlay:[{op:'draw',count:1,entry:'paidPlay'}]}}]}),/invalid own-effect draw gate/);
 assert.throws(()=>createUniversalPack({id:'bad-draw-event',cards:[{...bare,type:'event',bp:0,gen:0,effects:{onPlay:[{op:'draw',count:1,entry:'ownCharacter'}]}}]}),/only a character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-impact-amount',cards:[{...bare,mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'grantSelfImpactThisTurn',amount:2}]}}]}),/invalid this-turn impact/);
 const deck=realDeck(['BLC-2-006','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021','BLC-1-001','BLC-4-001','BLC-1-006','BLC-1-023','BLC-1-032','BLC-2-003','BLC-1-008','BLC-1-016'],'yellow');
 const paidMatch=main(deck,29006);
 put(paidMatch.s,0,'BLC-1-002','energy',0);
 put(paidMatch.s,0,'BLC-1-012','energy',1);
 put(paidMatch.s,0,'BLC-1-018','energy',2);
 put(paidMatch.s,0,'BLC-1-021','energy',3);
 const self=take(paidMatch.s,0,'BLC-2-006');
 const top=paidMatch.s.players[0].deck[0].uid;
 const handBefore=paidMatch.s.players[0].hand.length;
 paidMatch.s.players[0].hand.push(self);
 const paid=dispatchUniversalAction(paidMatch.packs,paidMatch.s,legalUniversalActions(paidMatch.packs,paidMatch.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck[0].uid,top);
 assert.equal(paid.players[0].hand.length,handBefore);
 assert.equal(paid.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(universalImpact(paidMatch.packs,paid,paid.players[0].front.find(c=>c?.uid===self.uid)),0);
 assert.equal(legalUniversalActions(paidMatch.packs,paid).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 paid.players[0].apCards[0].ready=true;
 const act={type:'activate',uid:self.uid,mode:'oncePay'};
 const granted=dispatchUniversalAction(paidMatch.packs,paid,act);
 const body=granted.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(universalImpact(paidMatch.packs,granted,body),1);
 assert.equal(body.ready,false);
 assert.equal(body.impactGranted.turn,granted.turn);
 assert.equal(granted.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(legalUniversalActions(paidMatch.packs,granted).some(a=>a.uid===self.uid&&a.mode==='oncePay'),false);
 assert.throws(()=>dispatchUniversalAction(paidMatch.packs,granted,act),/not currently legal/);
 const energyMatch=main(deck,290061);
 const lined=put(energyMatch.s,0,'BLC-2-006','energy',0,true);
 const deckBefore=energyMatch.s.players[0].deck.length;
 const fromEnergy=dispatchUniversalAction(energyMatch.packs,energyMatch.s,{type:'activate',uid:lined.uid,mode:'oncePay'});
 const stayed=fromEnergy.players[0].energy.find(c=>c?.uid===lined.uid);
 assert.equal(universalImpact(energyMatch.packs,fromEnergy,stayed),1);
 assert.equal(stayed.ready,true);
 assert.equal(fromEnergy.players[0].deck.length,deckBefore);
 assert.equal(fromEnergy.players[0].apCards.filter(c=>c.ready).length,0);
 let later=fromEnergy;
 for(let n=0;n<8&&universalImpact(energyMatch.packs,later,later.players[0].energy.find(c=>c?.uid===lined.uid))===1;n++)
  later=dispatchUniversalAction(energyMatch.packs,later,{type:'next'});
 assert.equal(universalImpact(energyMatch.packs,later,later.players[0].energy.find(c=>c?.uid===lined.uid)),0);
 const broke=main(deck,290062);
 const resting=put(broke.s,0,'BLC-2-006','front',0,false);
 for(const ap of broke.s.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(broke.packs,broke.s).some(a=>a.mode==='oncePay'),false);
 assert.throws(()=>dispatchUniversalAction(broke.packs,broke.s,{type:'activate',uid:resting.uid,mode:'oncePay'}),/not currently legal/);
 broke.s.players[0].apCards[0].inPlay=true;
 broke.s.players[0].apCards[0].ready=true;
 const fromRest=dispatchUniversalAction(broke.packs,broke.s,{type:'activate',uid:resting.uid,mode:'oncePay'});
 assert.equal(fromRest.players[0].front.find(c=>c?.uid===resting.uid).ready,false);
 assert.equal(universalImpact(broke.packs,fromRest,fromRest.players[0].front.find(c=>c?.uid===resting.uid)),1);
 const hit={id:card.id,name:card.name,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,traits:[...card.traits],trigger:card.trigger,
  triggerEffect:card.triggerEffect,mainAbility:card.mainAbility,implementation:'dsl',effects:card.effects};
 const deploy={op:'deployOwnHandRest',type:'character',color:'yellow',energy:4,ap:1,max:1};
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:2000,
  gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-own-character-draw',cards:[
  hit,unit('SRC',{effects:{onPlay:[deploy]}}),
  unit('EVT',{type:'event',bp:0,gen:0,effects:{onPlay:[deploy]}}),
  unit('FLD',{type:'field',bp:0,effects:{onPlay:[deploy]}}),
  ...['A','B','C','D','E','F','G','H','I'].map(id=>unit(id,{implementation:'vanilla'}))
 ]});
 const ids=['BLC-2-006','SRC','EVT','FLD','A','B','C','D','E','F','G','H','I'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 function boot(seed){
  let state=newUniversalMatch(both,{decks:[counts,counts],seed,first:0});
  for(let n=0;n<8&&state.phase!=='main';n++)
   state=dispatchUniversalAction(both,state,{type:'next'});
  return state;
 }
 function lift(state,p,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=state.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 function enter(seed,sourceId){
  let state=boot(seed);
  const child=lift(state,0,'BLC-2-006');
  const source=lift(state,0,sourceId);
  state.players[0].hand.push(child,source);
  const action=legalUniversalActions(both,state).find(a=>a.uid===source.uid&&!a.replaceUid&&
   (sourceId==='EVT'?a.type==='event':a.type==='play'&&a.line===(sourceId==='FLD'?'energy':'front')));
  assert.ok(action,sourceId);
  const opened=dispatchUniversalAction(both,state,action);
  assert.equal(opened.pending.kind,'effect-hand-rest');
  const seat=legalUniversalActions(both,opened).find(a=>a.type==='chooseHandRest'&&a.uid===child.uid&&a.line==='front');
  const beforeDeck=opened.players[0].deck.length;
  const drawn=opened.players[0].deck[0]?.uid||null;
  const beforeHand=opened.players[0].hand.length;
  const entered=dispatchUniversalAction(both,opened,seat);
  return {entered,child,beforeDeck,beforeHand,drawn};
 }
 const byCharacter=enter(290063,'SRC');
 assert.equal(byCharacter.entered.pending,null);
 assert.equal(byCharacter.entered.players[0].deck.length,byCharacter.beforeDeck-1);
 assert.equal(byCharacter.entered.players[0].hand.length,byCharacter.beforeHand);
 assert.equal(byCharacter.entered.players[0].hand.some(c=>c.uid===byCharacter.drawn),true);
 assert.equal(universalPublicView(both,byCharacter.entered,1).players[0].hand,null);
 assert.equal(universalImpact(both,byCharacter.entered,byCharacter.entered.players[0].front.find(c=>c?.uid===byCharacter.child.uid)),0);
 assert.equal(byCharacter.entered.mainAbilityUsedUids.includes(byCharacter.child.uid),false);
 assert.equal(legalUniversalActions(both,byCharacter.entered).some(a=>a.mode==='oncePay'&&a.uid===byCharacter.child.uid),false);
 byCharacter.entered.players[0].apCards[0].inPlay=true;
 byCharacter.entered.players[0].apCards[0].ready=true;
 const linked=dispatchUniversalAction(both,byCharacter.entered,{type:'activate',uid:byCharacter.child.uid,mode:'oncePay'});
 assert.equal(linked.players[0].deck.length,byCharacter.entered.players[0].deck.length);
 assert.equal(universalImpact(both,linked,linked.players[0].front.find(c=>c?.uid===byCharacter.child.uid)),1);
 assert.equal(legalUniversalActions(both,linked).some(a=>a.mode==='oncePay'&&a.uid===byCharacter.child.uid),false);
 const byEvent=enter(290064,'EVT');
 assert.equal(byEvent.entered.pending,null);
 assert.equal(byEvent.entered.players[0].deck.length,byEvent.beforeDeck);
 assert.equal(byEvent.entered.players[0].hand.length,byEvent.beforeHand-1);
 assert.equal(byEvent.entered.players[0].front.some(c=>c?.uid===byEvent.child.uid),true);
 const byField=enter(290065,'FLD');
 assert.equal(byField.entered.pending,null);
 assert.equal(byField.entered.players[0].deck.length,byField.beforeDeck);
 assert.equal(byField.entered.players[0].hand.length,byField.beforeHand-1);
 let quiet=boot(290066);
 const lonely=lift(quiet,0,'BLC-2-006');
 const source=lift(quiet,0,'SRC');
 quiet.players[0].outside.push(...quiet.players[0].deck.splice(0));
 quiet.players[0].hand.push(lonely,source);
 const opened=dispatchUniversalAction(both,quiet,legalUniversalActions(both,quiet).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 const seated=dispatchUniversalAction(both,opened,legalUniversalActions(both,opened).find(a=>a.type==='chooseHandRest'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(seated.pending,null);
 assert.equal(seated.players[0].deck.length,0);
 assert.equal(seated.players[0].front.some(c=>c?.uid===lonely.uid),true);
 const color=main(deck,290067);
 const attacker=put(color.s,0,'BLC-1-001','front',0,true);
 put(color.s,1,'BLC-1-002','front',0,true);
 const trigger=take(color.s,1,'BLC-2-006');
 const buried=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buried);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 assert.equal(revealed.phase,'attack');
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='skip'),true);
 assert.equal(choices.some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),true);
 assert.equal(choices.some(a=>a.mode==='color'),false);
 assert.equal(choices.some(a=>a.uid===color.s.players[1].front[0].uid),false);
 const skipped=dispatchUniversalAction(color.packs,revealed,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.equal(skipped.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assert.equal(universalImpact(color.packs,skipped,skipped.players[0].front.find(c=>c?.uid===attacker.uid)),0);
 let again=color.s;
 again=dispatchUniversalAction(color.packs,structuredClone(revealed),{type:'chooseTrigger',mode:'colorRestSkip',uid:attacker.uid},{actor:1});
 assert.equal(again.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.deepEqual(universalPublicView(color.packs,again,1).players[0].front.find(c=>c?.uid===attacker.uid).restrictions,[{kind:'skipNextActive',until:null}]);
 assert.equal(again.players[1].hand.some(c=>c.uid===trigger.uid),false);
 assert.equal(again.players[1].outside.some(c=>c.uid===trigger.uid),true);
 aiOk(paidMatch.packs,paid);
 aiOk(color.packs,revealed);
 assert.equal(assertUniversalMatch(paidMatch.packs,granted),true);
 assert.equal(assertUniversalMatch(energyMatch.packs,later),true);
 assert.equal(assertUniversalMatch(broke.packs,fromRest),true);
 assert.equal(assertUniversalMatch(both,linked),true);
 assert.equal(assertUniversalMatch(both,byEvent.entered),true);
 assert.equal(assertUniversalMatch(both,byField.entered),true);
 assert.equal(assertUniversalMatch(both,seated),true);
 assert.equal(assertUniversalMatch(color.packs,again),true);
});

test('BLC-2-058 peeks the top card, then may remove one Squad Zero hand card for BP+2000',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-058');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 1 張，將其放至牌堆頂或牌堆底。攻擊時：可將手牌中 1 張具有「零番隊」特徵的卡除外；成功時此角色本回合 BP +2000。');
 assert.equal(printed.traits,'零番隊');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-2-058'];
 assert.deepEqual(card.traits,['零番隊']);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,2);
 assert.deepEqual(card.effects.onPlay,[{op:'peekTopOrBottom'}]);
 assert.deepEqual(card.effects.onAttack,[{op:'optionalRemoveHandThen',zone:'removed',filter:{field:'trait',value:'零番隊'},then:[{op:'buffSelf',bp:2000}]}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const removal={op:'optionalRemoveHandThen',zone:'removed',filter:{field:'trait',value:'零番隊'},then:[{op:'buffSelf',bp:2000}]};
 assert.throws(()=>createUniversalPack({id:'bad-remove-play',cards:[{...bare,effects:{onPlay:[removal]}}]}),/only a lone character onAttack/);
 assert.throws(()=>createUniversalPack({id:'bad-remove-zone',cards:[{...bare,effects:{onAttack:[{...removal,zone:'outside'}]}}]}),/invalid optional hand removal/);
 const deck=realDeck(['BLC-2-058','BLC-2-056','BLC-2-059','BLC-2-055','BLC-1-034','BLC-1-107','BLC-4-046','BLC-1-039','BLC-1-045','BLC-1-048','BLC-1-051','BLC-4-048','BLC-4-052'],'purple');
 const opened=main(deck,29058);
 put(opened.s,0,'BLC-2-056','energy',0);
 put(opened.s,0,'BLC-2-059','energy',1);
 put(opened.s,0,'BLC-2-055','energy',2);
 const self=take(opened.s,0,'BLC-2-058');
 const top=opened.s.players[0].deck[0];
 opened.s.players[0].hand.push(self);
 const played=dispatchUniversalAction(opened.packs,opened.s,legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.pending.kind,'private-top-place');
 assert.deepEqual(universalPublicView(opened.packs,played,1).pending,{kind:'private-top-place',player:0});
 assert.equal(universalPrivateChoices(opened.packs,played,1),null);
 assert.equal(universalPrivateChoices(opened.packs,played,0).options.some(o=>o.card.cardId===top.cardId),true);
 const placed=dispatchUniversalAction(opened.packs,played,legalUniversalActions(opened.packs,played).find(a=>a.type==='chooseTopCard'&&a.mode==='bottom'));
 assert.equal(placed.pending,null);
 assert.equal(placed.players[0].deck.at(-1).uid,top.uid);
 assert.equal(placed.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(universalBp(opened.packs,placed,placed.players[0].front.find(c=>c?.uid===self.uid)),2000);
 placed.players[0].front.find(c=>c?.uid===self.uid).ready=true;
 const squad=take(placed,0,'BLC-2-056');
 const plain=take(placed,0,'BLC-1-034');
 placed.players[0].hand.push(squad,plain);
 put(placed,1,'BLC-1-039','front',0,true);
 let attacking=placed;
 while(attacking.phase!=='attack')attacking=dispatchUniversalAction(opened.packs,attacking,{type:'next'});
 const declared=dispatchUniversalAction(opened.packs,attacking,{type:'attack',uid:self.uid});
 assert.equal(declared.pending.kind,'effect-remove-hand');
 const pay=legalUniversalActions(opened.packs,declared);
 assert.equal(pay.some(a=>a.type==='chooseRemoveHand'&&a.uid===null),true);
 assert.equal(pay.some(a=>a.type==='chooseRemoveHand'&&a.uid===squad.uid),true);
 assert.equal(pay.some(a=>a.uid===plain.uid),false);
 assert.equal(universalPublicView(opened.packs,declared,1).players[0].hand,null);
 assert.equal(universalPrivateChoices(opened.packs,declared,1),null);
 assert.equal(universalPrivateChoices(opened.packs,declared,0).options.some(o=>o.card?.cardId==='BLC-2-056'),true);
 const skipped=dispatchUniversalAction(opened.packs,declared,pay.find(a=>a.uid===null));
 assert.equal(skipped.players[0].hand.some(c=>c.uid===squad.uid),true);
 assert.equal(skipped.players[0].removed.some(c=>c.uid===squad.uid),false);
 assert.equal(universalBp(opened.packs,skipped,skipped.players[0].front.find(c=>c?.uid===self.uid)),2000);
 const again=dispatchUniversalAction(opened.packs,structuredClone(declared),pay.find(a=>a.uid===squad.uid));
 assert.equal(again.players[0].removed.some(c=>c.uid===squad.uid),true);
 assert.equal(again.players[0].outside.some(c=>c.uid===squad.uid),false);
 assert.equal(again.players[0].hand.some(c=>c.uid===squad.uid),false);
 assert.equal(universalBp(opened.packs,again,again.players[0].front.find(c=>c?.uid===self.uid)),4000);
 assert.equal(again.pending.kind,'block');
 const quiet=main(deck,290581);
 const lone=put(quiet.s,0,'BLC-2-058','front',0,true);
 for(const zone of ['hand']){
  const kept=[],moved=[];
  for(const c of quiet.s.players[0][zone])(bleach.cards[c.cardId].traits.includes('零番隊')?moved:kept).push(c);
  quiet.s.players[0].hand=kept;
  quiet.s.players[0].outside.push(...moved);
 }
 put(quiet.s,1,'BLC-1-039','front',0,true);
 let bareAttack=quiet.s;
 while(bareAttack.phase!=='attack')bareAttack=dispatchUniversalAction(quiet.packs,bareAttack,{type:'next'});
 const noPay=dispatchUniversalAction(quiet.packs,bareAttack,{type:'attack',uid:lone.uid});
 assert.equal(noPay.pending.kind,'block');
 assert.equal(universalBp(quiet.packs,noPay,noPay.players[0].front.find(c=>c?.uid===lone.uid)),2000);
 const nextTurn=structuredClone(again);
 assert.equal(universalBp(opened.packs,nextTurn,nextTurn.players[0].front.find(c=>c?.uid===self.uid)),4000);
 nextTurn.turn+=1;
 assert.equal(universalBp(opened.packs,nextTurn,nextTurn.players[0].front.find(c=>c?.uid===self.uid)),2000);
 aiOk(opened.packs,played);
 aiOk(opened.packs,declared);
 assert.equal(assertUniversalMatch(opened.packs,placed),true);
 assert.equal(assertUniversalMatch(opened.packs,skipped),true);
 assert.equal(assertUniversalMatch(opened.packs,again),true);
 assert.equal(assertUniversalMatch(quiet.packs,noPay),true);
});

test('BLC-2-033 draws and discards, or only draws when a front character has printed AP 2',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-033');
 assert.equal(printed.effect,'登場：抽 1 張，再將 1 張手牌送至場外；若己方前線有原始 AP 消耗 2 以上角色，可改為只抽 1 張。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-2-033'];
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 const when={kind:'ownPrintedApAtLeast',turn:'any',zone:'front',excludeSelf:false,minAp:2};
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1,when}}]);
 assert.equal(bleach.cards['BLC-2-018'].mainAbility.then[0].instead,undefined);
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const onPlay=[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1,when}}];
 assert.throws(()=>createUniversalPack({id:'bad-instead-count',cards:[{...bare,effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:2,when}}]}}]}),/invalid mandatory draw\/discard profile/);
 assert.throws(()=>createUniversalPack({id:'bad-instead-when',cards:[{...bare,effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1}}]}}]}),/invalid mandatory draw\/discard profile/);
 const deck=realDeck(['BLC-2-033','BLC-2-025','BLC-2-031','BLC-2-036','BLC-4-022','BLC-2-018','BLC-2-016','BLC-4-023','BLC-2-022','BLC-2-040','BLC-2-042','BLC-4-035','BLC-2-021'],'blue');
 function pay(s){
  put(s,0,'BLC-2-025','energy',0);
  put(s,0,'BLC-2-031','energy',1);
  put(s,0,'BLC-2-036','energy',2);
 }
 function play(match){
  const self=take(match.s,0,'BLC-2-033');
  const top=match.s.players[0].deck[0];
  match.s.players[0].hand.push(self);
  const beforeHand=match.s.players[0].hand.length;
  const beforeDeck=match.s.players[0].deck.length;
  const played=dispatchUniversalAction(match.packs,match.s,legalUniversalActions(match.packs,match.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
  assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
  return {self,top,beforeHand,beforeDeck,played};
 }
 function discardTop(packs,played,top){
  assert.equal(played.pending.kind,'effect-discard');
  assert.equal(played.players[0].hand.some(c=>c.uid===top.uid),true);
  const done=dispatchUniversalAction(packs,played,legalUniversalActions(packs,played).find(a=>a.type==='chooseDiscard'&&a.uid===top.uid));
  assert.equal(done.pending,null);
  assert.equal(done.players[0].outside.some(c=>c.uid===top.uid),true);
  assert.equal(done.players[0].removed.some(c=>c.uid===top.uid),false);
  assert.equal(done.players[0].hand.some(c=>c.uid===top.uid),false);
  return done;
 }
 const alone=main(deck,29033);
 pay(alone.s);
 const closed=play(alone);
 assert.equal(closed.played.pending.kind,'effect-discard');
 assert.equal(closed.played.players[0].deck.length,closed.beforeDeck-1);
 assert.equal(closed.played.players[0].hand.length,closed.beforeHand);
 const closedDone=discardTop(alone.packs,closed.played,closed.top);
 assert.equal(closedDone.players[0].hand.length,closed.beforeHand-1);
 const energyGate=main(deck,290331);
 pay(energyGate.s);
 put(energyGate.s,0,'BLC-4-022','energy',3,false);
 const fromEnergy=play(energyGate);
 assert.equal(fromEnergy.played.pending.kind,'effect-discard');
 const lowFront=main(deck,290332);
 pay(lowFront.s);
 const mate=put(lowFront.s,0,'BLC-2-016','front',0,true);
 mate.buffs=[{bp:9000,untilTurn:lowFront.s.turn}];
 assert.equal(universalBp(lowFront.packs,lowFront.s,mate),bleach.cards['BLC-2-016'].bp+9000);
 const buffed=play(lowFront);
 assert.equal(buffed.played.pending.kind,'effect-discard');
 const open=main(deck,290333);
 pay(open.s);
 const heavy=put(open.s,0,'BLC-4-022','front',0,false);
 assert.equal(heavy.ready,false);
 const choice=play(open);
 assert.equal(choice.played.pending.kind,'effect-draw-instead');
 assert.equal(choice.played.players[0].deck[0].uid,choice.top.uid);
 assert.equal(choice.played.players[0].hand.some(c=>c.uid===choice.top.uid),false);
 assert.equal(choice.played.players[0].hand.length,choice.beforeHand-1);
 assert.deepEqual(universalPublicView(open.packs,choice.played,1).pending,{kind:'effect-draw-instead',player:0});
 assert.equal(universalPrivateChoices(open.packs,choice.played,0),null);
 assert.equal(universalPrivateChoices(open.packs,choice.played,1),null);
 const modes=legalUniversalActions(open.packs,choice.played);
 assert.deepEqual(modes.map(a=>a.mode),['discard','draw']);
 const drew=dispatchUniversalAction(open.packs,structuredClone(choice.played),modes.find(a=>a.mode==='draw'));
 assert.equal(drew.pending,null);
 assert.equal(drew.players[0].hand.some(c=>c.uid===choice.top.uid),true);
 assert.equal(drew.players[0].outside.some(c=>c.uid===choice.top.uid),false);
 assert.equal(drew.players[0].deck.length,choice.beforeDeck-1);
 assert.equal(drew.players[0].hand.length,choice.beforeHand);
 const mid=dispatchUniversalAction(open.packs,structuredClone(choice.played),modes.find(a=>a.mode==='discard'));
 assert.equal(mid.pending.kind,'effect-discard');
 assert.equal(mid.players[0].hand.some(c=>c.uid===choice.top.uid),true);
 const tossed=dispatchUniversalAction(open.packs,mid,legalUniversalActions(open.packs,mid).find(a=>a.type==='chooseDiscard'&&a.uid===choice.top.uid));
 assert.equal(tossed.players[0].outside.some(c=>c.uid===choice.top.uid),true);
 assert.equal(tossed.players[0].removed.some(c=>c.uid===choice.top.uid),false);
 assert.equal(tossed.players[0].hand.length,choice.beforeHand-1);
 const emptyDraw=structuredClone(choice.played);
 emptyDraw.players[0].outside.push(...emptyDraw.players[0].deck.splice(0));
 const nothing=dispatchUniversalAction(open.packs,emptyDraw,legalUniversalActions(open.packs,emptyDraw).find(a=>a.mode==='draw'));
 assert.equal(nothing.pending,null);
 assert.equal(nothing.players[0].deck.length,0);
 assert.equal(nothing.players[0].hand.length,choice.beforeHand-1);
 assert.equal(nothing.players[0].hand.some(c=>c.uid===choice.top.uid),false);
 const emptyDiscard=structuredClone(choice.played);
 emptyDiscard.players[0].outside.push(...emptyDiscard.players[0].deck.splice(0));
 const stillDiscard=dispatchUniversalAction(open.packs,emptyDiscard,legalUniversalActions(open.packs,emptyDiscard).find(a=>a.mode==='discard'));
 assert.equal(stillDiscard.pending.kind,'effect-discard');
 assert.equal(stillDiscard.players[0].deck.length,0);
 assert.equal(stillDiscard.players[0].hand.length,choice.beforeHand-1);
 const held=stillDiscard.players[0].hand[0];
 const emptied=dispatchUniversalAction(open.packs,stillDiscard,legalUniversalActions(open.packs,stillDiscard).find(a=>a.type==='chooseDiscard'&&a.uid===held.uid));
 assert.equal(emptied.players[0].outside.some(c=>c.uid===held.uid),true);
 assert.equal(emptied.players[0].deck.length,0);
 const dropped=structuredClone(choice.played);
 const gone=dropped.players[0].front.find(c=>c?.cardId==='BLC-4-022');
 dropped.players[0].front[dropped.players[0].front.findIndex(c=>c?.uid===gone.uid)]=null;
 dropped.players[0].outside.push(gone);
 assert.equal(assertUniversalMatch(open.packs,dropped),true);
 const only=legalUniversalActions(open.packs,dropped);
 assert.equal(only.some(a=>a.mode==='draw'),false);
 assert.equal(only.some(a=>a.mode==='discard'),true);
 assert.throws(()=>dispatchUniversalAction(open.packs,dropped,{type:'chooseDrawInstead',mode:'draw'}),/not currently legal/);
 const unit=(id,extra)=>({id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-draw-instead',cards:[
  unit('AP2',{ap:2,implementation:'dsl',effects:{onPlay}}),
  unit('AP1',{implementation:'dsl',effects:{onPlay}}),
  ...['A','B','C','D','E','F','G','H','I','J','K'].map(id=>unit(id))
 ]});
 const ids=['AP2','AP1','A','B','C','D','E','F','G','H','I','J','K'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 let selfGate=newUniversalMatch(both,{decks:[counts,counts],seed:290334,first:0});
 for(let n=0;n<8&&selfGate.phase!=='main';n++)
  selfGate=dispatchUniversalAction(both,selfGate,{type:'next'});
 function lift(state,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=state.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 const ap2=lift(selfGate,'AP2');
 selfGate.players[0].hand.push(ap2);
 selfGate.players[0].apCards[1].inPlay=true;
 selfGate.players[0].apCards[1].ready=true;
 const openedSelf=dispatchUniversalAction(both,selfGate,legalUniversalActions(both,selfGate).find(a=>a.type==='play'&&a.uid===ap2.uid&&a.line==='front'));
 assert.equal(openedSelf.pending.kind,'effect-draw-instead');
 assert.equal(openedSelf.players[0].front.filter(Boolean).length,1);
 let lowSelf=newUniversalMatch(both,{decks:[counts,counts],seed:290335,first:0});
 for(let n=0;n<8&&lowSelf.phase!=='main';n++)
  lowSelf=dispatchUniversalAction(both,lowSelf,{type:'next'});
 const ap1=lift(lowSelf,'AP1');
 lowSelf.players[0].hand.push(ap1);
 const openedLow=dispatchUniversalAction(both,lowSelf,legalUniversalActions(both,lowSelf).find(a=>a.type==='play'&&a.uid===ap1.uid&&a.line==='front'));
 assert.equal(openedLow.pending.kind,'effect-discard');
 aiOk(open.packs,choice.played);
 assert.equal(assertUniversalMatch(alone.packs,closedDone),true);
 assert.equal(assertUniversalMatch(energyGate.packs,fromEnergy.played),true);
 assert.equal(assertUniversalMatch(lowFront.packs,buffed.played),true);
 assert.equal(assertUniversalMatch(open.packs,choice.played),true);
 assert.equal(assertUniversalMatch(open.packs,drew),true);
 assert.equal(assertUniversalMatch(open.packs,tossed),true);
 assert.equal(assertUniversalMatch(open.packs,nothing),true);
 assert.equal(assertUniversalMatch(open.packs,emptied),true);
 assert.equal(assertUniversalMatch(both,openedSelf),true);
 assert.equal(assertUniversalMatch(both,openedLow),true);
});

test('BLC-1-022 reveals the opponent top card, then puts it back or outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-022');
 assert.equal(printed.effect,'登場：敵方公開牌堆頂 1 張；由己方選擇將該卡放回敵方牌堆頂或送至場外。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-1-022'];
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.equal(card.gen,2);
 assert.deepEqual(card.effects.onPlay,[{op:'revealOppTopPlace'}]);
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-reveal-extra',cards:[{...bare,effects:{onPlay:[{op:'revealOppTopPlace',count:1}]}}]}),/invalid revealed opponent top/);
 const deck=realDeck(['BLC-1-022','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021','BLC-1-001','BLC-4-001','BLC-1-006','BLC-1-023','BLC-1-032','BLC-2-003','BLC-1-008','BLC-1-016'],'yellow');
 const opened=main(deck,29022);
 put(opened.s,0,'BLC-1-002','energy',0);
 put(opened.s,0,'BLC-1-012','energy',1);
 put(opened.s,0,'BLC-1-018','energy',2);
 const shown=take(opened.s,1,'BLC-1-021');
 opened.s.players[1].deck.unshift(shown);
 const self=take(opened.s,0,'BLC-1-022');
 opened.s.players[0].hand.push(self);
 const played=dispatchUniversalAction(opened.packs,opened.s,legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.pending.kind,'effect-reveal-opp-top');
 assert.equal(played.players[1].deck[0].uid,shown.uid);
 assert.deepEqual(universalPublicView(opened.packs,played,0).pending,{kind:'effect-reveal-opp-top',player:0});
 assert.deepEqual(universalPublicView(opened.packs,played,1).pending,{kind:'effect-reveal-opp-top',player:0});
 assert.equal(universalPublicView(opened.packs,played,0).publicReveals.some(x=>x.uid===shown.uid&&x.cardId==='BLC-1-021'),true);
 assert.equal(universalPublicView(opened.packs,played,1).publicReveals.some(x=>x.uid===shown.uid&&x.cardId==='BLC-1-021'),true);
 assert.equal(universalPrivateChoices(opened.packs,played,0),null);
 assert.equal(universalPrivateChoices(opened.packs,played,1),null);
 const places=legalUniversalActions(opened.packs,played);
 assert.deepEqual(places.map(a=>a.place),['top','outside']);
 const kept=dispatchUniversalAction(opened.packs,structuredClone(played),places.find(a=>a.place==='top'));
 assert.equal(kept.pending,null);
 assert.equal(kept.players[1].deck[0].uid,shown.uid);
 assert.equal(kept.players[1].outside.some(c=>c.uid===shown.uid),false);
 const sent=dispatchUniversalAction(opened.packs,structuredClone(played),places.find(a=>a.place==='outside'));
 assert.equal(sent.pending,null);
 assert.equal(sent.players[1].outside.some(c=>c.uid===shown.uid),true);
 assert.equal(sent.players[1].deck.some(c=>c.uid===shown.uid),false);
 assert.equal(sent.players[1].removed.some(c=>c.uid===shown.uid),false);
 const quiet=main(deck,290221);
 put(quiet.s,0,'BLC-1-002','energy',0);
 put(quiet.s,0,'BLC-1-012','energy',1);
 put(quiet.s,0,'BLC-1-018','energy',2);
 quiet.s.players[1].outside.push(...quiet.s.players[1].deck.splice(0));
 const lonely=take(quiet.s,0,'BLC-1-022');
 quiet.s.players[0].hand.push(lonely);
 const empty=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(empty.pending,null);
 assert.equal(empty.players[1].deck.length,0);
 assert.equal(empty.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const color=main(deck,290222);
 const attacker=put(color.s,0,'BLC-1-001','front',0,true);
 const trigger=take(color.s,1,'BLC-1-022');
 const buried=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buried);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 assert.equal(revealed.phase,'attack');
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),true);
 const skipped=dispatchUniversalAction(color.packs,structuredClone(revealed),{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.equal(skipped.players[0].front.find(c=>c?.uid===attacker.uid).restrictions,undefined);
 const rested=dispatchUniversalAction(color.packs,structuredClone(revealed),choices.find(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),{actor:1});
 assert.equal(rested.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.deepEqual(universalPublicView(color.packs,rested,1).players[0].front.find(c=>c?.uid===attacker.uid).restrictions,[{kind:'skipNextActive',until:null}]);
 assert.equal(rested.players[1].outside.some(c=>c.uid===trigger.uid),true);
 aiOk(opened.packs,played);
 assert.equal(assertUniversalMatch(opened.packs,played),true);
 assert.equal(assertUniversalMatch(opened.packs,kept),true);
 assert.equal(assertUniversalMatch(opened.packs,sent),true);
 assert.equal(assertUniversalMatch(quiet.packs,empty),true);
 assert.equal(assertUniversalMatch(color.packs,rested),true);
});

test('BLC-2-011 reveals three cards, takes one Bambies trait or Bambi name, and puts the rest outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-011');
 assert.equal(printed.effect,'登場：公開己方牌堆頂 3 張，可將其中最多 1 張具有「邦比愛塔親衛隊」特徵或名為〈邦比愛塔・芭絲塔拜茵〉的卡加入手牌，其餘送至場外。若有卡加入手牌，再將 1 張手牌送至場外。');
 assert.equal(printed.traits,'星十字騎士團／邦比愛塔親衛隊');
 assert.equal(printed.energy,1);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const filters=[
  {field:'trait',value:'邦比愛塔親衛隊'},
  {field:'name',value:'バンビエッタ・バスターバイン'}
 ];
 const card=bleach.cards['BLC-2-011'];
 assert.deepEqual(card.traits,['星十字騎士團／邦比愛塔親衛隊']);
 assert.deepEqual(card.traitComponents,['星十字騎士團','邦比愛塔親衛隊']);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,rest:'outside',filters,logic:'any'}]);
 for(const id of ['BLC-2-007','BLC-2-008','BLC-2-010']){
  assert.deepEqual(bleach.cards[id].traitComponents,['星十字騎士團','邦比愛塔親衛隊']);
  assert.equal(cardHasTrait(bleach.cards[id],'邦比愛塔親衛隊'),true);
  assert.equal(cardHasTrait(bleach.cards[id],'星十字騎士團'),true);
 }
 assert.equal(bleach.cards['BLC-2-041'].traitComponents,undefined);
 assert.deepEqual(bleach.cards['BLC-2-006'].traits,['星十字騎士團／殭屍']);
 assert.equal(bleach.cards['BLC-2-006'].traitComponents,undefined);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-006'],'邦比愛塔親衛隊'),false);
 assert.equal(cardHasName(bleach.cards['BLC-2-006'],'バンビエッタ・バスターバイン'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-4-009'],'邦比愛塔親衛隊'),false);
 assert.equal(cardHasName(bleach.cards['BLC-4-009'],'バンビエッタ・バスターバイン'),true);
 assert.equal(cardHasTrait({traits:['星十字騎士團','邦比小隊']},'邦比愛塔親衛隊'),false);
 assert.equal(bleach.cards['BLC-4-064'].effects.onPlay[0].rest,undefined);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const bad=rest=>createUniversalPack({id:'bad-window-'+rest,cards:[{...bare,effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,rest,filters,logic:'any'}]}}]});
 assert.throws(()=>bad('bottom'),/invalid top-N filtered bottom\/discard profile/);
 assert.throws(()=>bad('deck'),/invalid top-N filtered bottom\/discard profile/);
 const deck=realDeck(['BLC-2-011','BLC-1-002','BLC-2-010','BLC-4-009','BLC-2-006','BLC-2-008','BLC-1-001','BLC-1-018','BLC-4-001','BLC-1-012','BLC-1-016','BLC-1-021','BLC-2-003'],'yellow');
 function open(seed,tops){
  const opened=main(deck,seed);
  put(opened.s,0,'BLC-1-002','energy',0);
  const window=tops?setTop(opened.s,0,tops):[];
  const self=take(opened.s,0,'BLC-2-011');
  opened.s.players[0].hand.push(self);
  const play=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
  assert.ok(play);
  return {opened,window,self,played:dispatchUniversalAction(opened.packs,opened.s,play)};
 }
 const first=open(29011,['BLC-2-010','BLC-4-009','BLC-1-018']);
 const [traitCard,nameCard,plain]=first.window;
 assert.equal(first.played.players[0].front.find(c=>c?.uid===first.self.uid).ready,false);
 assert.equal(first.played.pending.kind,'effect-top-filter-choice');
 assert.equal(first.played.pending.rest,'outside');
 assert.deepEqual(first.played.pending.filters,filters);
 assert.equal(first.played.pending.logic,'any');
 const shownIds=[traitCard.cardId,nameCard.cardId,plain.cardId];
 for(const viewer of [0,1]){
  const pub=universalPublicView(first.opened.packs,first.played,viewer);
  assert.deepEqual(pub.pending,{kind:'effect-top-filter-choice',player:0});
  assert.deepEqual(pub.publicReveals.filter(r=>r.kind==='revealed-window').map(r=>r.cardId),shownIds);
  assert.equal(pub.players[0].deckCount,first.played.players[0].deck.length);
 }
 assert.equal(universalPrivateChoices(first.opened.packs,first.played,1),null);
 const privateIds=universalPrivateChoices(first.opened.packs,first.played,0).options.filter(o=>o.card).map(o=>o.card.cardId);
 assert.deepEqual(privateIds.sort(),['BLC-2-010','BLC-4-009'].sort());
 const choices=legalUniversalActions(first.opened.packs,first.played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(traitCard.uid),true);
 assert.equal(chosen(nameCard.uid),true);
 assert.equal(chosen(plain.uid),false);
 const tookTrait=dispatchUniversalAction(first.opened.packs,first.played,choices.find(a=>a.uid===traitCard.uid));
 assert.equal(tookTrait.pending.kind,'effect-discard');
 assert.equal(tookTrait.players[0].hand.some(c=>c.uid===traitCard.uid),true);
 assert.deepEqual(tookTrait.players[0].outside.slice(-2).map(c=>c.uid),[nameCard.uid,plain.uid]);
 assert.equal(tookTrait.players[0].deck.some(c=>[nameCard.uid,plain.uid,traitCard.uid].includes(c.uid)),false);
 assert.equal(tookTrait.players[0].removed.some(c=>[nameCard.uid,plain.uid].includes(c.uid)),false);
 const spare=tookTrait.players[0].hand.find(c=>c.uid!==traitCard.uid);
 const dumped=dispatchUniversalAction(first.opened.packs,tookTrait,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(dumped.pending,null);
 assert.equal(dumped.players[0].hand.some(c=>c.uid===traitCard.uid),true);
 assert.equal(dumped.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(dumped.players[0].removed.some(c=>c.uid===spare.uid),false);
 const tossed=dispatchUniversalAction(first.opened.packs,tookTrait,{type:'chooseDiscard',uid:traitCard.uid});
 assert.equal(tossed.players[0].outside.some(c=>c.uid===traitCard.uid),true);
 assert.equal(tossed.players[0].hand.some(c=>c.uid===traitCard.uid),false);
 assert.equal(tossed.players[0].removed.some(c=>c.uid===traitCard.uid),false);
 const tookName=dispatchUniversalAction(first.opened.packs,first.played,choices.find(a=>a.uid===nameCard.uid));
 assert.equal(tookName.players[0].hand.some(c=>c.uid===nameCard.uid),true);
 assert.deepEqual(tookName.players[0].outside.slice(-2).map(c=>c.uid),[traitCard.uid,plain.uid]);
 assert.equal(tookName.pending.kind,'effect-discard');
 const skipped=dispatchUniversalAction(first.opened.packs,first.played,{type:'chooseTopFiltered',uid:null});
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].outside.slice(-3).map(c=>c.uid),[traitCard.uid,nameCard.uid,plain.uid]);
 assert.equal(skipped.players[0].hand.some(c=>[traitCard.uid,nameCard.uid,plain.uid].includes(c.uid)),false);
 assert.equal(skipped.publicReveals.some(r=>r.kind==='searched-to-hand'),false);
 const missed=open(290111,['BLC-1-001','BLC-1-018','BLC-4-001']);
 assert.equal(missed.played.pending,null);
 assert.deepEqual(missed.played.players[0].outside.slice(-3).map(c=>c.cardId),['BLC-1-001','BLC-1-018','BLC-4-001']);
 assert.equal(missed.played.players[0].deck.some(c=>missed.window.some(x=>x.uid===c.uid)),false);
 assert.equal(missed.played.publicReveals.filter(r=>r.kind==='revealed-window').length,3);
 const named=open(290112,['BLC-2-006','BLC-1-018','BLC-1-001']);
 const nameOnly=legalUniversalActions(named.opened.packs,named.played);
 assert.equal(nameOnly.some(a=>a.uid===named.window[0].uid),true);
 assert.equal(nameOnly.some(a=>a.uid===named.window[1].uid),false);
 assert.equal(nameOnly.some(a=>a.uid===named.window[2].uid),false);
 const gotName=dispatchUniversalAction(named.opened.packs,named.played,nameOnly.find(a=>a.uid===named.window[0].uid));
 assert.equal(gotName.players[0].hand.some(c=>c.cardId==='BLC-2-006'&&c.uid===named.window[0].uid),true);
 assert.deepEqual(gotName.players[0].outside.slice(-2).map(c=>c.uid),[named.window[1].uid,named.window[2].uid]);
 const dry=main(deck,290113);
 put(dry.s,0,'BLC-1-002','energy',0);
 const lonely=take(dry.s,0,'BLC-2-011');
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 dry.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,0);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const filler=(id)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團'],trigger:null,implementation:'vanilla'});
 const lab=createUniversalPack({id:'c29-bambies-outside',cards:[
  {id:'ACT',name:'リルトット',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,rest:'outside',filters,logic:'any'}]}},
  {id:'TRAIT',name:'ジゼル',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團／邦比愛塔親衛隊'],traitComponents:['星十字騎士團','邦比愛塔親衛隊'],trigger:null,implementation:'vanilla'},
  {id:'NAME',name:'バンビエッタ・バスターバイン',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團'],trigger:null,implementation:'vanilla'},
  {id:'SQUAD',name:'リルトット・ランパード',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團','邦比小隊'],trigger:null,implementation:'vanilla'},
  filler('PLAIN'),...Array.from({length:8},(_,i)=>filler('F'+i))
 ]});
 const counts={ACT:4,TRAIT:4,NAME:4,SQUAD:4,PLAIN:4,F0:4,F1:4,F2:4,F3:4,F4:4,F5:4,F6:4,F7:2};
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 let labState=newUniversalMatch(both,{decks:[counts,counts],seed:290115,first:0});
 for(let n=0;n<8&&labState.phase!=='main';n++)
  labState=dispatchUniversalAction(both,labState,{type:'next'});
 function lift(id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=labState.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('lab '+id);
 }
 const squad=lift('SQUAD'),bambi=lift('NAME'),member=lift('TRAIT');
 labState.players[0].deck.unshift(member,bambi,squad);
 const actor=lift('ACT');
 labState.players[0].hand.push(actor);
 const labPlayed=dispatchUniversalAction(both,labState,legalUniversalActions(both,labState).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'));
 const labLegal=legalUniversalActions(both,labPlayed);
 assert.equal(labLegal.some(a=>a.uid===member.uid),true);
 assert.equal(labLegal.some(a=>a.uid===bambi.uid),true);
 assert.equal(labLegal.some(a=>a.uid===squad.uid),false);
 aiOk(first.opened.packs,first.played);
 assert.equal(assertUniversalMatch(first.opened.packs,first.played),true);
 assert.equal(assertUniversalMatch(first.opened.packs,dumped),true);
 assert.equal(assertUniversalMatch(first.opened.packs,tossed),true);
 assert.equal(assertUniversalMatch(first.opened.packs,tookName),true);
 assert.equal(assertUniversalMatch(first.opened.packs,skipped),true);
 assert.equal(assertUniversalMatch(missed.opened.packs,missed.played),true);
 assert.equal(assertUniversalMatch(named.opened.packs,gotName),true);
 assert.equal(assertUniversalMatch(dry.packs,quiet),true);
 assert.equal(assertUniversalMatch(both,labPlayed),true);
});

test('BLC-1-060 names a printed energy, reveals two cards, and puts the rest outside without discarding',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-060');
 assert.equal(printed.effect,'登場：指定 1 個需求能源數值，公開己方牌堆頂 2 張；可將其中最多 1 張需求能源等於該數值的角色卡加入手牌，其餘送至場外。');
 assert.equal(printed.traits,'零番隊');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-1-060'];
 assert.deepEqual(card.traits,['零番隊']);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'chooseEnergyRevealOutside',count:2}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-energy-window',cards:[{...bare,effects:{onPlay:[{op:'chooseEnergyRevealOutside',count:2,rest:'outside'}]}}]}),/invalid printed-energy reveal/);
 assert.throws(()=>createUniversalPack({id:'bad-energy-count',cards:[{...bare,effects:{onPlay:[{op:'chooseEnergyRevealOutside',count:5}]}}]}),/invalid printed-energy reveal/);
 const deck=realDeck(['BLC-1-060','BLC-1-034','BLC-1-039','BLC-1-045','BLC-1-036','BLC-1-108','BLC-1-062','BLC-2-052','BLC-1-057','BLC-1-035','BLC-2-053','BLC-1-059','BLC-1-048'],'purple');
 function open(seed,tops){
  const opened=main(deck,seed);
  put(opened.s,0,'BLC-1-034','energy',0);
  put(opened.s,0,'BLC-1-039','energy',1);
  put(opened.s,0,'BLC-1-045','energy',2);
  const window=tops?setTop(opened.s,0,tops):[];
  const self=take(opened.s,0,'BLC-1-060');
  opened.s.players[0].hand.push(self);
  const play=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
  assert.ok(play);
  const played=dispatchUniversalAction(opened.packs,opened.s,play);
  assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
  return {opened,window,self,played};
 }
 const first=open(29060,['BLC-1-036','BLC-1-108']);
 assert.equal(first.played.pending.kind,'effect-choose-printed-energy');
 assert.equal(first.played.publicReveals.some(r=>first.window.some(c=>c.uid===r.uid)),false);
 assert.equal(universalPublicView(first.opened.packs,first.played,1).players[0].deckCount,first.played.players[0].deck.length);
 assert.equal(universalPrivateChoices(first.opened.packs,first.played,0),null);
 assert.equal(universalPrivateChoices(first.opened.packs,first.played,1),null);
 const numbers=legalUniversalActions(first.opened.packs,first.played);
 assert.equal(numbers[0].value,0);
 assert.equal(numbers.some(a=>a.type==='choosePrintedEnergy'&&a.value===2),true);
 assert.equal(numbers.some(a=>a.value===30),true);
 const named=dispatchUniversalAction(first.opened.packs,first.played,numbers.find(a=>a.value===2));
 assert.equal(named.pending.kind,'effect-top-filter-choice');
 assert.equal(named.pending.rest,'outside');
 assert.equal(named.pending.discard,false);
 assert.deepEqual(named.pending.filter,{field:'printedEnergy',value:2});
 for(const viewer of [0,1]){
  const pub=universalPublicView(first.opened.packs,named,viewer);
  assert.deepEqual(pub.publicReveals.filter(r=>r.kind==='revealed-window').map(r=>r.cardId),['BLC-1-036','BLC-1-108']);
 }
 const picks=legalUniversalActions(first.opened.packs,named);
 assert.equal(picks.some(a=>a.uid===first.window[0].uid),true);
 assert.equal(picks.some(a=>a.uid===first.window[1].uid),false);
 const took=dispatchUniversalAction(first.opened.packs,named,picks.find(a=>a.uid===first.window[0].uid));
 assert.equal(took.pending,null);
 assert.equal(took.players[0].hand.some(c=>c.uid===first.window[0].uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===first.window[1].uid),true);
 assert.equal(took.players[0].deck.some(c=>first.window.some(x=>x.uid===c.uid)),false);
 assert.equal(took.players[0].removed.some(c=>first.window.some(x=>x.uid===c.uid)),false);
 const missed=dispatchUniversalAction(first.opened.packs,first.played,numbers.find(a=>a.value===0));
 assert.equal(missed.pending,null);
 assert.deepEqual(missed.players[0].outside.slice(-2).map(c=>c.uid),first.window.map(c=>c.uid));
 assert.equal(missed.publicReveals.filter(r=>r.kind==='revealed-window').length,2);
 const zero=open(290601,['BLC-1-048','BLC-1-062']);
 const zeroNumbers=legalUniversalActions(zero.opened.packs,zero.played);
 const zeroHit=dispatchUniversalAction(zero.opened.packs,zero.played,zeroNumbers.find(a=>a.value===0));
 assert.equal(zeroHit.pending.choices.length,1);
 assert.equal(zeroHit.players[0].deck[0].cardId,'BLC-1-048');
 const zeroTaken=dispatchUniversalAction(zero.opened.packs,zeroHit,legalUniversalActions(zero.opened.packs,zeroHit).find(a=>a.uid===zero.window[0].uid));
 assert.equal(zeroTaken.pending,null);
 assert.equal(zeroTaken.players[0].hand.some(c=>c.uid===zero.window[0].uid),true);
 assert.equal(zeroTaken.players[0].outside.some(c=>c.uid===zero.window[1].uid),true);
 const eventOnly=dispatchUniversalAction(zero.opened.packs,zero.played,zeroNumbers.find(a=>a.value===2));
 assert.equal(eventOnly.pending,null);
 assert.deepEqual(eventOnly.players[0].outside.slice(-2).map(c=>c.cardId),['BLC-1-048','BLC-1-062']);
 const dry=main(deck,290602);
 put(dry.s,0,'BLC-1-034','energy',0);
 put(dry.s,0,'BLC-1-039','energy',1);
 put(dry.s,0,'BLC-1-045','energy',2);
 const lonely=take(dry.s,0,'BLC-1-060');
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 dry.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,0);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const life=main(deck,290603);
 const ally=put(life.s,1,'BLC-1-035','front',0,false);
 const trigger=take(life.s,1,'BLC-1-060');
 const buried=life.s.players[1].life[0];
 life.s.players[1].life[0]=trigger;
 life.s.players[1].deck.push(buried);
 const attacker=put(life.s,0,'BLC-1-034','front',0,true);
 let revealed=life.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(life.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'active');
 const ready=legalUniversalActions(life.packs,revealed).find(a=>a.mode==='active'&&a.uid===ally.uid);
 assert.ok(ready);
 const woken=dispatchUniversalAction(life.packs,revealed,ready,{actor:1});
 const woke=woken.players[1].front.find(c=>c?.uid===ally.uid);
 assert.equal(woke.ready,true);
 assert.equal(universalBp(life.packs,woken,woke),bleach.cards['BLC-1-035'].bp+3000);
 aiOk(first.opened.packs,first.played);
 aiOk(first.opened.packs,named);
 assert.equal(assertUniversalMatch(first.opened.packs,first.played),true);
 assert.equal(assertUniversalMatch(first.opened.packs,named),true);
 assert.equal(assertUniversalMatch(first.opened.packs,took),true);
 assert.equal(assertUniversalMatch(first.opened.packs,missed),true);
 assert.equal(assertUniversalMatch(zero.opened.packs,zeroTaken),true);
 assert.equal(assertUniversalMatch(zero.opened.packs,eventOnly),true);
 assert.equal(assertUniversalMatch(dry.packs,quiet),true);
 assert.equal(assertUniversalMatch(life.packs,woken),true);
});

test('BLC-1-038 may mill three cards at once, then recover one purple character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-038');
 assert.equal(printed.effect,'登場：可將己方牌堆頂 3 張送至場外；成功時可從己方場外將最多 1 張紫色角色卡加入手牌。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,2);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const recover={op:'recoverOutsideOne',optional:true,logic:'all',filters:[
  {field:'color',value:'purple'},{field:'type',value:'character'}]};
 const card=bleach.cards['BLC-1-038'];
 assert.deepEqual(card.traits,[]);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'millTop',count:3,optional:true,then:[recover]}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-mill-three',cards:[{...bare,effects:{onPlay:[{op:'millTop',count:3,optional:true}]}}]}),/optional mill is one or two cards/);
 assert.throws(()=>createUniversalPack({id:'bad-mill-follow',cards:[{...bare,effects:{onPlay:[{op:'millTop',count:3,optional:true,then:[{op:'draw',count:1}]}]}}]}),/optional mill follow-up must recover one purple character/);
 const deck=realDeck(['BLC-1-038','BLC-1-034','BLC-1-039','BLC-1-045','BLC-1-057','BLC-1-062','BLC-1-108','BLC-1-035','BLC-2-052','BLC-1-036','BLC-2-053','BLC-1-059','BLC-1-048'],'purple');
 function second(seed){
  const opened=main(deck,seed);
  for(let n=0;n<40&&!(opened.s.active===0&&opened.s.phase==='main'&&opened.s.players[0].ownTurns===2);n++){
   const step=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='next');
   assert.ok(step);
   opened.s=dispatchUniversalAction(opened.packs,opened.s,step);
  }
  assert.equal(opened.s.players[0].ownTurns,2);
  put(opened.s,0,'BLC-1-034','energy',0);
  put(opened.s,0,'BLC-1-039','energy',1);
  put(opened.s,0,'BLC-1-045','energy',2);
  return opened;
 }
 const first=second(29038);
 const window=setTop(first.s,0,['BLC-1-057','BLC-1-062','BLC-1-108']);
 const waiting=take(first.s,0,'BLC-1-035');
 first.s.players[0].outside.push(waiting);
 const self=take(first.s,0,'BLC-1-038');
 first.s.players[0].hand.push(self);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.pending.kind,'effect-optional-mill');
 assert.equal(played.pending.batch,3);
 assert.equal(played.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 assert.equal(universalPrivateChoices(first.packs,played,0),null);
 assert.deepEqual(legalUniversalActions(first.packs,played).map(a=>a.mode),['skip','mill']);
 const skipped=dispatchUniversalAction(first.packs,played,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.slice(0,3).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(skipped.players[0].outside.some(c=>c.uid===waiting.uid),true);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===waiting.uid),false);
 const milled=dispatchUniversalAction(first.packs,played,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(milled.pending.kind,'effect-recover-outside');
 assert.deepEqual(milled.players[0].outside.slice(-3).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(milled.players[0].deck.some(c=>window.some(x=>x.uid===c.uid)),false);
 const choices=legalUniversalActions(first.packs,milled);
 assert.equal(choices.some(a=>a.uid===null),true);
 assert.equal(choices.some(a=>a.uid===window[0].uid),true);
 assert.equal(choices.some(a=>a.uid===waiting.uid),true);
 assert.equal(choices.some(a=>a.uid===window[1].uid),false);
 assert.equal(choices.some(a=>a.uid===window[2].uid),false);
 const took=dispatchUniversalAction(first.packs,milled,choices.find(a=>a.uid===window[0].uid));
 assert.equal(took.pending,null);
 assert.equal(took.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===waiting.uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===window[1].uid),true);
 const declined=dispatchUniversalAction(first.packs,milled,choices.find(a=>a.uid===null));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>window.some(x=>x.uid===c.uid)),false);
 assert.equal(declined.players[0].outside.some(c=>c.uid===window[0].uid),true);
 const short=second(290381);
 const only=setTop(short.s,0,['BLC-1-057']);
 short.s.players[0].outside.push(...short.s.players[0].deck.splice(1));
 const shortSelf=take(short.s,0,'BLC-1-038');
 short.s.players[0].hand.push(shortSelf);
 const shortPlay=dispatchUniversalAction(short.packs,short.s,legalUniversalActions(short.packs,short.s).find(a=>a.type==='play'&&a.uid===shortSelf.uid&&a.line==='front'));
 assert.equal(shortPlay.pending.batch,3);
 const shortMill=dispatchUniversalAction(short.packs,shortPlay,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(shortMill.pending.kind,'effect-recover-outside');
 assert.equal(shortMill.players[0].deck.length,0);
 assert.equal(shortMill.players[0].outside.some(c=>c.uid===only[0].uid),true);
 const dry=second(290382);
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 const lonely=take(dry.s,0,'BLC-1-038');
 dry.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,0);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 aiOk(first.packs,played);
 aiOk(first.packs,milled);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(first.packs,skipped),true);
 assert.equal(assertUniversalMatch(first.packs,milled),true);
 assert.equal(assertUniversalMatch(first.packs,took),true);
 assert.equal(assertUniversalMatch(first.packs,declined),true);
 assert.equal(assertUniversalMatch(short.packs,shortMill),true);
 assert.equal(assertUniversalMatch(dry.packs,quiet),true);
});

test('BLC-2-014 may bounce one own character at energy 2 or less, then recover one such card',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-014');
 assert.equal(printed.effect,'登場：可將 1 個己方場上需求能源 2 以下角色返回手牌；成功時可從己方場外將最多 1 張需求能源 2 以下的卡加入手牌。');
 assert.equal(printed.triggerEffect,'【COLOR】將 1 個敵方前線 BP 3500 以下角色返回手牌。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,'color');
 const recover={op:'recoverOutsideUnderEnergy',energy:2,optional:true};
 const card=bleach.cards['BLC-2-014'];
 assert.deepEqual(card.traits,[]);
 assert.equal(card.gen,2);
 assert.deepEqual(card.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(card.effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[recover]}]);
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-energy-bounce',cards:[{...bare,effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2}]}}]}),/optional energy bounce follow-up must recover one card at that energy/);
 assert.throws(()=>createUniversalPack({id:'bad-energy-follow',cards:[{...bare,effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[{op:'draw',count:1}]}]}}]}),/optional energy bounce follow-up must recover one card at that energy/);
 const deck=realDeck(['BLC-2-014','BLC-2-016','BLC-2-021','BLC-2-022','BLC-2-015','BLC-2-026','BLC-2-032','BLC-2-033','BLC-2-047','BLC-2-044','BLC-2-018','BLC-2-025','BLC-2-031'],'blue');
 function open(seed){
  const opened=main(deck,seed);
  put(opened.s,0,'BLC-2-016','energy',0);
  put(opened.s,0,'BLC-2-021','energy',1);
  put(opened.s,0,'BLC-2-022','energy',2);
  return opened;
 }
 const first=open(29214);
 const low=put(first.s,0,'BLC-2-015','front',0);
 const high=put(first.s,0,'BLC-2-033','front',1);
 const mid=put(first.s,0,'BLC-2-026','front',2);
 const field=put(first.s,0,'BLC-2-044','energy',3);
 const event=take(first.s,0,'BLC-2-047');
 const outsideChar=take(first.s,0,'BLC-2-032');
 const huge=take(first.s,0,'BLC-2-018');
 first.s.players[0].outside.push(event,outsideChar,huge);
 const self=take(first.s,0,'BLC-2-014');
 first.s.players[0].hand.push(self);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.pending.kind,'effect-bounce-own');
 assert.equal(played.pending.energy,2);
 const bounceIds=played.pending.choices.map(uid=>{
  const c=[...played.players[0].front,...played.players[0].energy].find(x=>x?.uid===uid);
  return c.cardId;
 });
 assert.deepEqual(bounceIds,['BLC-2-015','BLC-2-026','BLC-2-016','BLC-2-021','BLC-2-022']);
 assert.equal(played.pending.choices.includes(self.uid),false);
 assert.equal(played.pending.choices.includes(high.uid),false);
 assert.equal(played.pending.choices.includes(field.uid),false);
 assert.equal(universalPrivateChoices(first.packs,played,1),null);
 assert.equal(universalPrivateChoices(first.packs,played,0).options.some(o=>o.card?.cardId==='BLC-2-026'),true);
 const skipped=dispatchUniversalAction(first.packs,played,{type:'chooseOwnBounce',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===mid.uid),true);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===event.uid),true);
 const bounced=dispatchUniversalAction(first.packs,played,{type:'chooseOwnBounce',uid:mid.uid});
 assert.equal(bounced.pending.kind,'effect-recover-outside');
 assert.equal(bounced.pending.printedEnergyMax,2);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===mid.uid),true);
 assert.equal(bounced.players[0].front.some(c=>c?.uid===mid.uid),false);
 assert.deepEqual(bounced.pending.choices.slice().sort(),[event.uid,outsideChar.uid].sort());
 assert.equal(bounced.pending.choices.includes(huge.uid),false);
 assert.equal(bounced.pending.choices.includes(mid.uid),false);
 const recoveries=legalUniversalActions(first.packs,bounced);
 const took=dispatchUniversalAction(first.packs,bounced,recoveries.find(a=>a.uid===event.uid));
 assert.equal(took.pending,null);
 assert.equal(took.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===outsideChar.uid),true);
 const declined=dispatchUniversalAction(first.packs,bounced,recoveries.find(a=>a.uid===null));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(declined.players[0].hand.some(c=>c.uid===event.uid),false);
 const bareField=main(deck,29215);
 put(bareField.s,0,'BLC-2-044','energy',0);
 put(bareField.s,0,'BLC-2-044','energy',1);
 put(bareField.s,0,'BLC-2-044','energy',2);
 const onlyHigh=put(bareField.s,0,'BLC-2-033','front',0);
 const over=put(bareField.s,0,'BLC-2-018','front',1);
 const lonely=take(bareField.s,0,'BLC-2-014');
 bareField.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(bareField.packs,bareField.s,legalUniversalActions(bareField.packs,bareField.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===onlyHigh.uid),true);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===over.uid),true);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const emptyOutside=open(29216);
 const target=put(emptyOutside.s,0,'BLC-2-015','front',0);
 const actor=take(emptyOutside.s,0,'BLC-2-014');
 emptyOutside.s.players[0].hand.push(actor);
 emptyOutside.s.players[0].removed.push(...emptyOutside.s.players[0].deck.splice(0),...emptyOutside.s.players[0].outside.splice(0));
 const sent=dispatchUniversalAction(emptyOutside.packs,emptyOutside.s,legalUniversalActions(emptyOutside.packs,emptyOutside.s).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'));
 const returned=dispatchUniversalAction(emptyOutside.packs,sent,{type:'chooseOwnBounce',uid:target.uid});
 assert.equal(returned.pending,null);
 assert.equal(returned.players[0].hand.some(c=>c.uid===target.uid),true);
 assert.equal(returned.players[0].outside.length,0);
 const life=open(29217);
 const victim=put(life.s,0,'BLC-2-033','front',0,true);
 const tall=put(life.s,0,'BLC-2-018','front',1,true);
 life.s.players[1].deck.push(...life.s.players[1].life.splice(0));
 life.s.players[1].life.push(take(life.s,1,'BLC-2-014'));
 let revealed=life.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(life.packs,revealed,{type:'attack',uid:victim.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const legal=legalUniversalActions(life.packs,revealed);
 assert.equal(legal.some(a=>a.mode==='colorBounce'&&a.uid===victim.uid),true);
 assert.equal(legal.some(a=>a.uid===tall.uid),false);
 const woken=dispatchUniversalAction(life.packs,revealed,legal.find(a=>a.mode==='colorBounce'&&a.uid===victim.uid),{actor:1});
 assert.equal(woken.players[0].hand.some(c=>c.uid===victim.uid),true);
 assert.equal(woken.players[0].front.some(c=>c?.uid===tall.uid),true);
 const filler=id=>({id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'vanilla'});
 const lab=createUniversalPack({id:'c29-energy-bounce',cards:[
  {id:'SELF',name:'SELF',color:'blue',type:'character',energy:2,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[recover]}]}},
  {id:'FIELD',name:'FIELD',color:'blue',type:'field',energy:2,ap:1,bp:0,gen:1,traits:[],trigger:null,implementation:'vanilla'},
  {id:'BIG',name:'BIG',color:'blue',type:'event',energy:3,ap:1,bp:0,gen:0,traits:[],trigger:null,implementation:'vanilla'},
  filler('A'),filler('B'),filler('C'),filler('D'),filler('E'),filler('F'),filler('G'),filler('H'),filler('I'),filler('J')
 ]});
 const counts={SELF:4,FIELD:4,BIG:4,A:4,B:4,C:4,D:4,E:4,F:4,G:4,H:4,I:4,J:2};
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 let labState=newUniversalMatch(both,{decks:[counts,counts],seed:29218,first:0});
 for(let n=0;n<8&&labState.phase!=='main';n++)
  labState=dispatchUniversalAction(both,labState,{type:'next'});
 function lift(id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=labState.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('lab '+id);
 }
 for(const [id,slot] of [['A',0],['B',1]]){
  const pay=lift(id);pay.ready=true;pay.fieldEntryStamp=labState.nextFieldEntryStamp++;
  labState.players[0].energy[slot]=pay;
 }
 const smallField=lift('FIELD'),bigEvent=lift('BIG');
 labState.players[0].outside.push(smallField,bigEvent);
 const ego=lift('SELF');
 labState.players[0].hand.push(ego);
 const labPlayed=dispatchUniversalAction(both,labState,legalUniversalActions(both,labState).find(a=>a.type==='play'&&a.uid===ego.uid&&a.line==='front'));
 assert.equal(labPlayed.pending.choices.includes(ego.uid),true);
 const labBounced=dispatchUniversalAction(both,labPlayed,{type:'chooseOwnBounce',uid:ego.uid});
 assert.equal(labBounced.players[0].hand.some(c=>c.uid===ego.uid),true);
 assert.equal(labBounced.pending.kind,'effect-recover-outside');
 assert.equal(labBounced.pending.choices.includes(smallField.uid),true);
 assert.equal(labBounced.pending.choices.includes(bigEvent.uid),false);
 aiOk(first.packs,played);
 aiOk(first.packs,bounced);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(first.packs,skipped),true);
 assert.equal(assertUniversalMatch(first.packs,bounced),true);
 assert.equal(assertUniversalMatch(first.packs,took),true);
 assert.equal(assertUniversalMatch(first.packs,declined),true);
 assert.equal(assertUniversalMatch(bareField.packs,quiet),true);
 assert.equal(assertUniversalMatch(emptyOutside.packs,returned),true);
 assert.equal(assertUniversalMatch(life.packs,woken),true);
 assert.equal(assertUniversalMatch(both,labPlayed),true);
 assert.equal(assertUniversalMatch(both,labBounced),true);
});

test('BLC-2-001 steps to energy and buffs once while the opponent front is reduced or rested',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-001');
 assert.equal(printed.effect,'Step：己方移動階段可由前線移至能源線。主要階段・每回合 1 次：敵方前線有 BP 低於原始 BP 的角色，或有 REST 角色時，此角色本回合 BP +1000。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,3000);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,null);
 const when={logic:'any',checks:[
  {kind:'oppFrontLiveBpBelowPrinted',turn:'any'},
  {kind:'oppRestCharacter',turn:'any',zone:'front'}]};
 const card=bleach.cards['BLC-2-001'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.equal(card.traitComponents,undefined);
 assert.deepEqual(card.mainAbility,{op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,when});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},mainAbility:{op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,when:{logic:'any',checks:[{kind:'oppRestCharacter',turn:'any',zone:'field'}]}}};
 assert.throws(()=>createUniversalPack({id:'bad-step-or',cards:[bare]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-2-001','BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021','BLC-2-003'],'yellow');
 const first=main(deck,29301);
 put(first.s,0,'BLC-1-002','energy',0);
 put(first.s,0,'BLC-1-012','energy',1);
 put(first.s,0,'BLC-1-018','energy',2);
 const rested=put(first.s,1,'BLC-1-001','front',0,false);
 const full=put(first.s,1,'BLC-1-021','front',1,true);
 const bench=put(first.s,1,'BLC-2-003','energy',0,false);
 const self=take(first.s,0,'BLC-2-001');
 first.s.players[0].hand.push(self);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 let played=dispatchUniversalAction(first.packs,first.s,play);
 const body=played.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(body.ready,false);
 assert.equal(universalBp(first.packs,played,body),3000);
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='onceBuffSelf'&&a.uid===self.uid);
 assert.ok(act);
 played=dispatchUniversalAction(first.packs,played,act);
 const boosted=played.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(boosted.ready,false);
 assert.equal(universalBp(first.packs,played,boosted),4000);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='onceBuffSelf'),false);
 const quiet=main(deck,29302);
 put(quiet.s,0,'BLC-1-002','energy',0);
 put(quiet.s,0,'BLC-1-012','energy',1);
 put(quiet.s,0,'BLC-1-018','energy',2);
 put(quiet.s,1,'BLC-1-001','front',0,true);
 put(quiet.s,1,'BLC-2-003','energy',0,false);
 const quietSelf=take(quiet.s,0,'BLC-2-001');
 quiet.s.players[0].hand.push(quietSelf);
 const quietPlay=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===quietSelf.uid&&a.line==='front'));
 assert.equal(legalUniversalActions(quiet.packs,quietPlay).some(a=>a.mode==='onceBuffSelf'),false);
 const lowered=main(deck,29303);
 put(lowered.s,0,'BLC-1-002','energy',0);
 put(lowered.s,0,'BLC-1-012','energy',1);
 put(lowered.s,0,'BLC-1-018','energy',2);
 const victim=put(lowered.s,1,'BLC-1-001','front',0,true);
 victim.buffs=[{bp:-1000,untilTurn:lowered.s.turn}];
 assert.equal(universalBp(lowered.packs,lowered.s,victim),1000);
 const lowSelf=take(lowered.s,0,'BLC-2-001');
 lowered.s.players[0].hand.push(lowSelf);
 let lowPlayed=dispatchUniversalAction(lowered.packs,lowered.s,legalUniversalActions(lowered.packs,lowered.s).find(a=>a.type==='play'&&a.uid===lowSelf.uid&&a.line==='front'));
 const lowAct=legalUniversalActions(lowered.packs,lowPlayed).find(a=>a.mode==='onceBuffSelf'&&a.uid===lowSelf.uid);
 assert.ok(lowAct);
 lowPlayed=dispatchUniversalAction(lowered.packs,lowPlayed,lowAct);
 assert.equal(universalBp(lowered.packs,lowPlayed,lowPlayed.players[0].front.find(c=>c?.uid===lowSelf.uid)),4000);
 let stepped=played;
 for(let n=0;n<30&&!(stepped.active===0&&stepped.phase==='move'&&stepped.players[0].ownTurns===2);n++){
  const step=legalUniversalActions(first.packs,stepped).find(a=>a.type==='next');
  assert.ok(step);
  stepped=dispatchUniversalAction(first.packs,stepped,step);
 }
 const shift=legalUniversalActions(first.packs,stepped).find(a=>a.type==='step'&&a.uid===self.uid);
 assert.ok(shift);
 stepped=dispatchUniversalAction(first.packs,stepped,shift);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===self.uid),true);
 stepped.players[1].front.find(c=>c?.cardId==='BLC-1-001').ready=false;
 for(let n=0;n<8&&!(stepped.active===0&&stepped.phase==='main');n++)
  stepped=dispatchUniversalAction(first.packs,stepped,{type:'next'});
 const again=legalUniversalActions(first.packs,stepped).find(a=>a.type==='activate'&&a.mode==='onceBuffSelf'&&a.uid===self.uid);
 assert.ok(again);
 stepped=dispatchUniversalAction(first.packs,stepped,again);
 const moved=stepped.players[0].energy.find(c=>c?.uid===self.uid);
 assert.equal(universalBp(first.packs,stepped,moved),4000);
 for(let n=0;n<20&&stepped.active===0;n++){
  const step=legalUniversalActions(first.packs,stepped).find(a=>a.type==='next');
  assert.ok(step);
  stepped=dispatchUniversalAction(first.packs,stepped,step);
 }
 assert.equal(universalBp(first.packs,stepped,stepped.players[0].energy.find(c=>c?.uid===self.uid)),3000);
 assert.equal(rested.ready,false);
 assert.equal(full.ready,true);
 assert.equal(bench.ready,false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietPlay),true);
 assert.equal(assertUniversalMatch(lowered.packs,lowPlayed),true);
 assert.equal(assertUniversalMatch(first.packs,stepped),true);
});

test('BLC-4-037 reduces one front character at BP 1500 or higher, then replays that effect for 1 AP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-037');
 assert.equal(printed.effect,'登場時：最多選1個對方前線BP1500以上的角色，本回合BP−1000。啟動・主要〔支付1 AP／每回合1次〕：發動此角色的登場時效果。');
 assert.deepEqual(printed.traits,['破面']);
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'draw');
 const down={op:'enemyBpDown',bp:1000,optional:true,minBp:1500};
 const card=bleach.cards['BLC-4-037'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['破面']);
 assert.deepEqual(card.effects.onPlay,[down]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[down]});
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-replay-bp',cards:[{...bare,mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'enemyBpDown',bp:0,optional:true,minBp:1500}]}}]}),/invalid temporary BP/);
 const deck=realDeck(['BLC-4-037','BLC-2-031','BLC-3-002','BLC-2-015','BLC-2-016','BLC-2-026','BLC-2-041'],'blue');
 const first=main(deck,29370);
 put(first.s,0,'BLC-2-031','energy',0);
 put(first.s,0,'BLC-3-002','energy',1);
 put(first.s,0,'BLC-2-015','energy',2);
 assert.equal(universalEnergyByColor(first.packs,first.s,0).blue,3);
 const high=put(first.s,1,'BLC-2-026','front',0,true);
 const exact=put(first.s,1,'BLC-2-016','front',1,true);
 const low=put(first.s,1,'BLC-2-016','front',2,true);
 low.buffs=[{bp:-500,untilTurn:first.s.turn}];
 const bench=put(first.s,1,'BLC-2-041','energy',0,true);
 assert.equal(universalBp(first.packs,first.s,high),3000);
 assert.equal(universalBp(first.packs,first.s,exact),1500);
 assert.equal(universalBp(first.packs,first.s,low),1000);
 const self=take(first.s,0,'BLC-4-037');
 first.s.players[0].hand.push(self);
 let played=dispatchUniversalAction(first.packs,first.s,legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.pending.kind,'effect-target');
 assert.equal(played.pending.optional,true);
 assert.deepEqual(played.pending.choices.slice().sort(),[high.uid,exact.uid].sort());
 assert.equal(played.pending.choices.includes(low.uid),false);
 assert.equal(played.pending.choices.includes(bench.uid),false);
 const skipped=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(first.packs,skipped,skipped.players[1].front.find(c=>c?.uid===high.uid)),3000);
 const again=take(skipped,0,'BLC-4-037');
 skipped.players[0].hand.push(again);
 skipped.players[0].apCards[0].ready=true;
 played=dispatchUniversalAction(first.packs,skipped,legalUniversalActions(first.packs,skipped).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='energy'));
 assert.equal(played.pending.choices.includes(high.uid),true);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(first.packs,played,played.players[1].front.find(c=>c?.uid===high.uid)),2000);
 assert.equal(played.players[0].energy.find(c=>c?.uid===again.uid).ready,false);
 played.players[0].apCards[0].ready=true;
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===again.uid);
 assert.ok(act);
 played=dispatchUniversalAction(first.packs,played,act);
 assert.equal(played.pending.choices.includes(exact.uid),true);
 assert.equal(played.pending.choices.includes(low.uid),false);
 assert.equal(played.pending.choices.includes(bench.uid),false);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:exact.uid});
 assert.equal(universalBp(first.packs,played,played.players[1].front.find(c=>c?.uid===exact.uid)),500);
 assert.equal(played.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='oncePay'&&a.uid===again.uid),false);
 const other=played.players[0].front.find(c=>c?.uid===self.uid);
 played.players[0].apCards[1].inPlay=true;
 played.players[0].apCards[1].ready=true;
 const second=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===other.uid);
 assert.ok(second);
 played=dispatchUniversalAction(first.packs,played,second);
 assert.equal(played.pending.kind,'effect-target');
 played=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:null});
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='oncePay'),false);
 const quiet=main(deck,29371);
 put(quiet.s,0,'BLC-2-031','energy',0);
 put(quiet.s,0,'BLC-3-002','energy',1);
 put(quiet.s,0,'BLC-2-015','energy',2);
 const small=put(quiet.s,1,'BLC-2-016','front',0,true);
 small.buffs=[{bp:-500,untilTurn:quiet.s.turn}];
 const onlyEnergy=put(quiet.s,1,'BLC-2-026','energy',0,true);
 const quietSelf=take(quiet.s,0,'BLC-4-037');
 quiet.s.players[0].hand.push(quietSelf);
 const quietPlay=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===quietSelf.uid&&a.line==='front'));
 assert.equal(quietPlay.pending,null);
 assert.equal(universalBp(quiet.packs,quietPlay,quietPlay.players[1].front.find(c=>c?.uid===small.uid)),1000);
 assert.equal(universalBp(quiet.packs,quietPlay,quietPlay.players[1].energy.find(c=>c?.uid===onlyEnergy.uid)),3000);
 const broke=main(deck,29372);
 const resting=put(broke.s,0,'BLC-4-037','front',0,false);
 for(const ap of broke.s.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(broke.packs,broke.s).some(a=>a.mode==='oncePay'),false);
 broke.s.players[0].apCards[0].ready=true;
 let paid=dispatchUniversalAction(broke.packs,broke.s,{type:'activate',uid:resting.uid,mode:'oncePay'});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].front.find(c=>c?.uid===resting.uid).ready,false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietPlay),true);
 assert.equal(assertUniversalMatch(broke.packs,paid),true);
});

test('BLC-4-071 draws and discards, steps, and shares one ACTIVE among every Soi Fon',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-071');
 assert.equal(printed.effect,'Step：移動階段可從前線移至能量線。登場時：抽1張牌，再將1張手牌送至場外。啟動・主要：將此角色改為Active；所有《碎蜂》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-4-071'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1,discardCount:1}]);
 assert.deepEqual(card.mainAbility,{op:'nameOnceActive',scope:'name',when:null});
 const bare={id:'BAD',name:'BAD',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-name-once',cards:[{...bare,mainAbility:{op:'nameOnceActive',scope:'card',when:null}}]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-4-071','BLC-1-091','BLC-1-078','BLC-4-060','BLC-1-087','BLC-4-062','BLC-1-079'],'green');
 const first=main(deck,29471);
 put(first.s,0,'BLC-1-078','energy',0);
 put(first.s,0,'BLC-4-060','energy',1);
 assert.ok(universalEnergyByColor(first.packs,first.s,0).green>=4);
 const self=take(first.s,0,'BLC-4-071');
 const beforeDeck=first.s.players[0].deck.length;
 const beforeHand=first.s.players[0].hand.length;
 first.s.players[0].hand.push(self);
 let played=dispatchUniversalAction(first.packs,first.s,legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.pending.kind,'effect-discard');
 assert.equal(played.players[0].deck.length,beforeDeck-1);
 assert.equal(played.players[0].hand.length,beforeHand+1);
 const discard=played.players[0].hand.find(c=>c.uid!==self.uid);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 const other=put(played,0,'BLC-4-071','energy',2,false);
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='nameOnceActive'&&a.uid===self.uid);
 assert.ok(act);
 played=dispatchUniversalAction(first.packs,played,act);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='nameOnceActive'),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'activate',uid:other.uid,mode:'nameOnceActive'}),/not currently legal/);
 const fromEnergy=main(deck,29472);
 const lined=put(fromEnergy.s,0,'BLC-4-071','energy',0,false);
 const woken=dispatchUniversalAction(fromEnergy.packs,fromEnergy.s,{type:'activate',uid:lined.uid,mode:'nameOnceActive'});
 assert.equal(woken.players[0].energy.find(c=>c?.uid===lined.uid).ready,true);
 let stepped=played;
 for(let n=0;n<30&&!(stepped.active===0&&stepped.phase==='move'&&stepped.players[0].ownTurns===2);n++)
  stepped=dispatchUniversalAction(first.packs,stepped,{type:'next'});
 const shift=legalUniversalActions(first.packs,stepped).find(a=>a.type==='step'&&a.uid===self.uid);
 assert.ok(shift);
 stepped=dispatchUniversalAction(first.packs,stepped,shift);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===self.uid),true);
 for(let n=0;n<8&&!(stepped.active===0&&stepped.phase==='main');n++)
  stepped=dispatchUniversalAction(first.packs,stepped,{type:'next'});
 const again=legalUniversalActions(first.packs,stepped).find(a=>a.mode==='nameOnceActive'&&a.uid===self.uid);
 assert.ok(again);
 stepped=dispatchUniversalAction(first.packs,stepped,again);
 assert.equal(stepped.players[0].energy.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,stepped).some(a=>a.mode==='nameOnceActive'&&a.uid===other.uid),false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(fromEnergy.packs,woken),true);
 assert.equal(assertUniversalMatch(first.packs,stepped),true);
});

test('BLC-3-005 nulls the battling character impact and actives once per Renji name',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-005');
 assert.equal(printed.effect,'【無效化 Impact】與此角色戰鬥的角色，在該次戰鬥中失去 Impact。\n【啟動主要】只有對手前線有目前 BP 低於原本 BP 的角色時才能發動。將此角色轉為 Active。〈阿散井戀次〉的此效果每回合只能發動一次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,5);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const when={kind:'oppFrontLiveBpBelowPrinted',turn:'any'};
 const card=bleach.cards['BLC-3-005'];
 assert.equal(card.impactNull,true);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.mainAbility,{op:'nameOnceActive',scope:'name',when});
 const deck=realDeck(['BLC-3-005','BLC-1-041','BLC-1-102','BLC-1-103','BLC-1-034','BLC-1-039'],'purple');
 const first=main(deck,29505);
 put(first.s,0,'BLC-1-102','energy',0);
 put(first.s,0,'BLC-1-103','energy',1);
 put(first.s,0,'BLC-1-034','energy',2);
 assert.ok(universalEnergyByColor(first.packs,first.s,0).purple>=5);
 const self=put(first.s,0,'BLC-3-005','front',0,false);
 const copy=put(first.s,0,'BLC-3-005','energy',3,false);
 const quiet=put(first.s,1,'BLC-1-041','front',0,true);
 assert.equal(universalBp(first.packs,first.s,quiet),4000);
 assert.equal(legalUniversalActions(first.packs,first.s).some(a=>a.mode==='nameOnceActive'),false);
 quiet.buffs=[{bp:-1000,untilTurn:first.s.turn}];
 assert.equal(universalBp(first.packs,first.s,quiet),3000);
 const act=legalUniversalActions(first.packs,first.s).find(a=>a.type==='activate'&&a.mode==='nameOnceActive'&&a.uid===self.uid);
 assert.ok(act);
 let played=dispatchUniversalAction(first.packs,first.s,act);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='nameOnceActive'),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'activate',uid:copy.uid,mode:'nameOnceActive'}),/not currently legal/);
 const benchOnly=main(deck,29506);
 const benched=put(benchOnly.s,1,'BLC-1-034','energy',0,true);
 benched.buffs=[{bp:-500,untilTurn:benchOnly.s.turn}];
 const waiting=put(benchOnly.s,0,'BLC-3-005','front',0,false);
 assert.equal(universalBp(benchOnly.packs,benchOnly.s,benched),1000);
 assert.equal(legalUniversalActions(benchOnly.packs,benchOnly.s).some(a=>a.mode==='nameOnceActive'&&a.uid===waiting.uid),false);
 const fought=main(deck,29507);
 const attacker=put(fought.s,0,'BLC-1-041','front',0,true);
 attacker.impactGranted={turn:fought.s.turn,stamp:attacker.fieldEntryStamp,amount:1};
 const wall=put(fought.s,1,'BLC-3-005','front',0,true);
 assert.equal(universalBp(fought.packs,fought.s,attacker),4000);
 assert.equal(universalBp(fought.packs,fought.s,wall),4000);
 assert.equal(universalImpact(fought.packs,fought.s,attacker),1);
 const lifeBefore=fought.s.players[1].life.length;
 let battle=fought.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fought.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(fought.packs,battle,{type:'attack',uid:attacker.uid});
 assert.equal(battle.pending?.kind,'block');
 battle=dispatchUniversalAction(fought.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===attacker.uid),true);
 assert.equal(battle.players[1].front.some(c=>c?.uid===wall.uid),false);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,lifeBefore);
 assert.equal(battle.pending,null);
 const control=main(deck,29508);
 const striker=put(control.s,0,'BLC-1-041','front',0,true);
 striker.impactGranted={turn:control.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const plain=put(control.s,1,'BLC-1-103','front',0,true);
 assert.equal(universalImpact(control.packs,control.s,striker),1);
 const controlLife=control.s.players[1].life.length;
 let open=control.s;
 for(let n=0;n<6&&open.phase!=='attack';n++)
  open=dispatchUniversalAction(control.packs,open,{type:'next'});
 open=dispatchUniversalAction(control.packs,open,{type:'attack',uid:striker.uid});
 open=dispatchUniversalAction(control.packs,open,{type:'chooseBlock',uid:plain.uid},{actor:1});
 assert.equal(open.players[1].life.length,controlLife-1);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(benchOnly.packs,benchOnly.s),true);
 assert.equal(assertUniversalMatch(fought.packs,battle),true);
 assert.equal(assertUniversalMatch(control.packs,open),true);
});

test('BLC-4-006 gains 1000 on its turn when Haschwalth is on the field and Yhwach is not outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-006');
 assert.equal(printed.effect,'Impact無效。自己的回合中：若自己場外沒有《友哈巴赫》，且自己場上有《雨葛蘭・哈斯沃德》，此角色BP+1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.energy,3);
 assert.equal(printed.bp,3000);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,null);
 const absent={kind:'ownNameAbsent',turn:'own',zone:'outside',excludeSelf:false,name:'ユーハバッハ'};
 const present={kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'ユーグラム・ハッシュヴァルト'};
 const condition={logic:'all',turn:'own',checks:[absent,present]};
 const card=bleach.cards['BLC-4-006'];
 assert.equal(card.impactNull,true);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition,bp:1000}]);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:3000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-plus',cards:[{...bare,passiveBonuses:[{condition:absent,bp:1000}]}]}),/invalid passive bonus/);
 assert.throws(()=>createUniversalPack({id:'bad-wrap',cards:[{...bare,passiveBonuses:[{condition:{logic:'all',turn:'own',checks:[absent,{...absent,name:'別'}]},bp:1000}]}]}),/name-absence/);
 assert.throws(()=>createUniversalPack({id:'bad-zone',cards:[{...bare,passiveBonuses:[{condition:{...absent,zone:'hand'},bp:-1000}]}]}),/invalid or cyclic passive/);
 const deck=realDeck(['BLC-4-006','BLC-1-018','BLC-1-021','BLC-1-023'],'yellow');
 const first=main(deck,29606);
 const self=put(first.s,0,'BLC-4-006','front',0);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 const jugram=put(first.s,0,'BLC-1-018','energy',0);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 first.s.players[0].energy[0]=null;
 first.s.players[0].hand.push(jugram);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 put(first.s,0,'BLC-1-018','front',1);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const held=take(first.s,0,'BLC-1-021');
 first.s.players[0].hand.push(held);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const handIndex=first.s.players[0].hand.findIndex(c=>c.uid===held.uid);
 first.s.players[0].hand.splice(handIndex,1);
 first.s.players[0].outside.push(held);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 first.s.players[0].outside.splice(first.s.players[0].outside.findIndex(c=>c.uid===held.uid),1);
 held.ready=true;held.fieldEntryStamp=first.s.nextFieldEntryStamp++;
 first.s.players[0].energy[0]=held;
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const oppOutside=take(first.s,1,'BLC-1-021');
 first.s.players[1].outside.push(oppOutside);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const ownJugram=first.s.players[0].front[1];
 first.s.players[0].front[1]=null;
 first.s.players[0].hand.push(ownJugram);
 put(first.s,1,'BLC-1-018','front',0);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 put(first.s,0,'BLC-1-018','front',1);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const enemy=structuredClone(first.s);enemy.active=1;
 assert.equal(universalBp(first.packs,enemy,enemy.players[0].front[0]),3000);
 grantContinuousState(first.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(first.packs,first.s,first.s.players[0].front[0]),3000);
 const lined=main(deck,29607);
 const energyCopy=put(lined.s,0,'BLC-4-006','energy',0,false);
 assert.equal(universalCardEnergy(lined.packs,lined.s,0,energyCopy),2);
 energyCopy.ready=true;
 assert.equal(universalCardEnergy(lined.packs,lined.s,0,energyCopy),2);
 assert.equal(universalEnergyByColor(lined.packs,lined.s,0).yellow,2);
 const fought=main(deck,29608);
 const attacker=put(fought.s,0,'BLC-1-023','front',0,true);
 attacker.impactGranted={turn:fought.s.turn,stamp:attacker.fieldEntryStamp,amount:1};
 const wall=put(fought.s,1,'BLC-4-006','front',0,true);
 put(fought.s,1,'BLC-1-018','energy',0);
 assert.equal(universalBp(fought.packs,fought.s,attacker),4000);
 // The BP clause is own-turn only, so it is off while this character blocks.
 assert.equal(universalBp(fought.packs,fought.s,wall),3000);
 assert.equal(universalImpact(fought.packs,fought.s,attacker),1);
 const lifeBefore=fought.s.players[1].life.length;
 let battle=fought.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fought.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(fought.packs,battle,{type:'attack',uid:attacker.uid});
 assert.equal(battle.pending?.kind,'block');
 battle=dispatchUniversalAction(fought.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===attacker.uid),true);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,lifeBefore);
 assert.equal(battle.pending,null);
 const control=main(deck,29609);
 const striker=put(control.s,0,'BLC-1-023','front',0,true);
 striker.impactGranted={turn:control.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const plain=put(control.s,1,'BLC-1-018','front',0,true);
 const controlLife=control.s.players[1].life.length;
 let hit=control.s;
 for(let n=0;n<6&&hit.phase!=='attack';n++)
  hit=dispatchUniversalAction(control.packs,hit,{type:'next'});
 hit=dispatchUniversalAction(control.packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(control.packs,hit,{type:'chooseBlock',uid:plain.uid},{actor:1});
 assert.equal(hit.players[1].life.length,controlLife-1);
 const base={...bare,implementation:'vanilla'};
 const fillers=Array.from({length:9},(_,i)=>({...base,id:'F'+i,name:'余'+i}));
 const lab=createUniversalPack({id:'lab-bazz',cards:[
  {...bare,id:'BAZZ',name:'バズビー',impactNull:true,passiveBonuses:[{condition,bp:1000}]},
  {...base,id:'YH',name:'ユーハバッハ',bp:1500},
  {...bare,id:'AL',name:'別名義',nameAliases:['ユーハバッハ'],bp:1500},
  {...base,id:'JU',name:'ユーグラム・ハッシュヴァルト',bp:1500},
  ...fillers]});
 const labIds=['BAZZ','YH','AL','JU',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let aliasBoard=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:29610,first:0});
 const aliasSelf=put(aliasBoard,0,'BAZZ','front',0);
 put(aliasBoard,0,'JU','energy',0);
 assert.equal(universalBp(labPacks,aliasBoard,aliasSelf),4000);
 const alias=take(aliasBoard,0,'AL');
 aliasBoard.players[0].outside.push(alias);
 assert.equal(universalBp(labPacks,aliasBoard,aliasSelf),3000);
 aliasBoard.players[0].outside.pop();
 aliasBoard.players[0].hand.push(alias);
 assert.equal(universalBp(labPacks,aliasBoard,aliasSelf),4000);
 aiOk(first.packs,first.s);
 assert.equal(assertUniversalMatch(first.packs,first.s),true);
 assert.equal(assertUniversalMatch(lined.packs,lined.s),true);
 assert.equal(assertUniversalMatch(fought.packs,battle),true);
 assert.equal(assertUniversalMatch(control.packs,hit),true);
 assert.equal(assertUniversalMatch(labPacks,aliasBoard),true);
});

test('BLC-4-047 rests, retires, and may REST-play one energy-0 purple Ichigo',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-047');
 assert.equal(printed.effect,'啟動・主要〔改為Rest，並使此卡退場〕：可從自己場外將最多1張所需能量0的紫色《黑崎一護》以Rest登場。');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.energy,0);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,500);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'draw');
 const ability={op:'restRetireExactOutside',name:'黒崎 一護',color:'purple',energy:0,optional:true};
 const card=bleach.cards['BLC-4-047'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.mainAbility,ability);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:500,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...bare,mainAbility:{...ability,ap:1}}]}),/unsupported main action ability/);
 assert.throws(()=>createUniversalPack({id:'old-rest',cards:[{...bare,effects:{onPlay:[{op:'deployOutsideRest',name:'黒崎 一護',color:'purple',energy:0,optional:true}]}}]}),/invalid outside-to-REST/);
 const deck=realDeck(['BLC-4-047','BLC-1-039','BLC-1-040','BLC-1-034'],'purple');
 const first=main(deck,29747);
 const self=put(first.s,0,'BLC-4-047','front',0,true);
 const ichigo=take(first.s,0,'BLC-1-039');
 const costly=take(first.s,0,'BLC-1-040');
 const other=take(first.s,0,'BLC-1-034');
 first.s.players[0].outside.push(ichigo,costly,other);
 const act=legalUniversalActions(first.packs,first.s).find(a=>a.type==='activate'&&a.mode==='restRetireExact'&&a.uid===self.uid);
 assert.ok(act);
 let played=dispatchUniversalAction(first.packs,first.s,act);
 assert.equal(played.pending.kind,'effect-outside-exact-rest');
 assert.deepEqual(played.pending.choices,[ichigo.uid]);
 assert.equal(played.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(played.players[0].outside.some(c=>c.uid===self.uid),true);
 aiOk(first.packs,played);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseOutsideExactRest',uid:null});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].outside.some(c=>c.uid===ichigo.uid),true);
 const entered=main(deck,29748);
 const kon=put(entered.s,0,'BLC-4-047','front',0,true);
 const body=take(entered.s,0,'BLC-1-039');
 entered.s.players[0].outside.push(body);
 const beforeDeck=entered.s.players[0].deck.length;
 let landed=dispatchUniversalAction(entered.packs,entered.s,{type:'activate',uid:kon.uid,mode:'restRetireExact'});
 const choice=legalUniversalActions(entered.packs,landed).find(a=>a.type==='chooseOutsideExactRest'&&a.uid===body.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(choice);
 landed=dispatchUniversalAction(entered.packs,landed,choice);
 assert.equal(landed.players[0].front.find(c=>c?.uid===body.uid).ready,false);
 assert.equal(landed.players[0].outside.some(c=>c.uid===kon.uid),true);
 assert.equal(landed.players[0].deck.length,beforeDeck);
 const again=put(landed,0,'BLC-4-047','front',1,true);
 assert.ok(legalUniversalActions(entered.packs,landed).some(a=>a.mode==='restRetireExact'&&a.uid===again.uid));
 const fromEnergy=main(deck,29749);
 const lined=put(fromEnergy.s,0,'BLC-4-047','energy',0,true);
 const moved=take(fromEnergy.s,0,'BLC-1-039');
 fromEnergy.s.players[0].outside.push(moved);
 let energyPlay=dispatchUniversalAction(fromEnergy.packs,fromEnergy.s,{type:'activate',uid:lined.uid,mode:'restRetireExact'});
 const energyChoice=legalUniversalActions(fromEnergy.packs,energyPlay).find(a=>a.type==='chooseOutsideExactRest'&&a.uid===moved.uid&&a.line==='energy');
 assert.ok(energyChoice);
 energyPlay=dispatchUniversalAction(fromEnergy.packs,energyPlay,energyChoice);
 assert.equal(energyPlay.players[0].energy.find(c=>c?.uid===moved.uid).ready,false);
 const empty=main(deck,29750);
 const lonely=put(empty.s,0,'BLC-4-047','front',0,true);
 let spent=dispatchUniversalAction(empty.packs,empty.s,{type:'activate',uid:lonely.uid,mode:'restRetireExact'});
 assert.equal(spent.pending,null);
 assert.equal(spent.players[0].outside.some(c=>c.uid===lonely.uid),true);
 const resting=main(deck,29751);
 const asleep=put(resting.s,0,'BLC-4-047','front',0,false);
 assert.equal(legalUniversalActions(resting.packs,resting.s).some(a=>a.mode==='restRetireExact'),false);
 const vanilla={...bare,implementation:'vanilla',effects:{}};
 const fillers=Array.from({length:8},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}));
 const lab=createUniversalPack({id:'lab-kon',cards:[
  {...bare,id:'KON',name:'コン',mainAbility:ability},
  {...bare,id:'RAID',name:'黒崎 一護',ap:2,raidName:'黒崎 一護',effects:{onPlay:[{op:'draw',count:1}]}},
  {...vanilla,id:'ONE',name:'黒崎 一護',energy:1},
  {...vanilla,id:'BLUE',name:'黒崎 一護',color:'blue'},
  {...vanilla,id:'OTHER',name:'浦原 喜助'},
  ...fillers]});
 const labIds=['KON','RAID','ONE','BLUE','OTHER',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let board=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:29752,first:0});
 for(let n=0;n<8&&board.phase!=='main';n++)
  board=dispatchUniversalAction(labPacks,board,{type:'next'});
 const source=put(board,0,'KON','front',0,true);
 const raid=take(board,0,'RAID');
 const one=take(board,0,'ONE');
 const blue=take(board,0,'BLUE');
 const named=take(board,0,'OTHER');
 board.players[0].outside.push(raid,one,blue,named);
 const deckBefore=board.players[0].deck.length;
 let raidPlay=dispatchUniversalAction(labPacks,board,{type:'activate',uid:source.uid,mode:'restRetireExact'});
 const uids=legalUniversalActions(labPacks,raidPlay).filter(a=>a.type==='chooseOutsideExactRest'&&a.uid).map(a=>a.uid);
 assert.deepEqual([...new Set(uids)],[raid.uid]);
 const raidChoice=legalUniversalActions(labPacks,raidPlay).find(a=>a.uid===raid.uid&&a.line==='front'&&a.mode===undefined);
 assert.ok(raidChoice);
 raidPlay=dispatchUniversalAction(labPacks,raidPlay,raidChoice);
 const arrived=raidPlay.players[0].front.find(c=>c?.uid===raid.uid);
 assert.equal(arrived.ready,false);
 assert.equal(arrived.stack?.length||0,0);
 assert.equal(raidPlay.players[0].deck.length,deckBefore-1);
 aiOk(empty.packs,spent);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(entered.packs,landed),true);
 assert.equal(assertUniversalMatch(fromEnergy.packs,energyPlay),true);
 assert.equal(assertUniversalMatch(empty.packs,spent),true);
 assert.equal(assertUniversalMatch(resting.packs,resting.s),true);
 assert.equal(assertUniversalMatch(labPacks,raidPlay),true);
});

test('BLC-2-017 discards one hand card and cannot be blocked by BP 4000+',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-017');
 assert.equal(printed.effect,'主要階段・每回合 1 次：將 1 張手牌送至場外，使此角色本回合不能被 BP 4000 以上角色阻擋。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-2-017'];
 assert.equal(card.energy,2);
 assert.equal(card.ap,1);
 assert.equal(card.bp,3000);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.deepEqual(card.traits,[]);
 assert.equal(card.mainAbility.op,'oncePayProgram');
 assert.equal(card.mainAbility.payAp,0);
 assert.equal(card.mainAbility.then[0].then[0].op,'grantSelfBlockAtLeast');
 assert.equal(card.mainAbility.then[0].then[0].bp,4000);
 const deck=realDeck(['BLC-2-017','BLC-2-021','BLC-2-031','BLC-2-016','BLC-2-026'],'blue');
 const first=main(deck,29817);
 const self=put(first.s,0,'BLC-2-017','front',0,true);
 const sword=take(first.s,0,'BLC-2-021');
 first.s.players[0].hand.push(sword);
 assert.equal(legalUniversalActions(first.packs,first.s).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),false);
 let paid=dispatchUniversalAction(first.packs,first.s,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(paid.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(first.packs,paid).some(a=>a.uid===null),false);
 aiOk(first.packs,paid);
 paid=dispatchUniversalAction(first.packs,paid,{type:'chooseDiscardGate',uid:sword.uid});
 assert.equal(paid.pending.kind,'effect-grant-cause');
 assert.equal(live(paid,0,self.uid).blockAtLeastGranted.bp,4000);
 paid=dispatchUniversalAction(first.packs,paid,{type:'chooseGrantCause',mode:'grant'});
 assert.equal(live(paid,0,self.uid).blockFloorGranted.bp,3000);
 const huge=put(paid,1,'BLC-2-026','front',0,true);
 huge.buffs=[{bp:1000,untilTurn:paid.turn}];
 const mid=put(paid,1,'BLC-2-031','front',1,true);
 mid.buffs=[{bp:2000,untilTurn:paid.turn}];
 const small=put(paid,1,'BLC-2-016','front',2,true);
 assert.equal(universalBp(first.packs,paid,huge)>=4000,true);
 assert.equal(universalBp(first.packs,paid,mid),3500);
 let battle=paid;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(first.packs,battle,{type:'next'});
 live(battle,0,self.uid).ready=true;
 battle=dispatchUniversalAction(first.packs,battle,{type:'attack',uid:self.uid});
 assert.equal(battle.pending.kind,'block');
 const blocks=legalUniversalActions(first.packs,battle).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocks.includes(huge.uid),false);
 assert.equal(blocks.includes(mid.uid),true);
 assert.equal(blocks.includes(small.uid),false);
 assert.equal(blocks.includes(null),true);
 const again=main(deck,29818);
 const used=put(again.s,0,'BLC-2-017','front',0,true);
 const other=put(again.s,0,'BLC-2-017','energy',0,true);
 const spare=take(again.s,0,'BLC-2-031');
 again.s.players[0].hand.push(spare);
 let once=dispatchUniversalAction(again.packs,again.s,{type:'activate',uid:used.uid,mode:'oncePay'});
 const dumped=again.s.players[0].hand[0];
 once=dispatchUniversalAction(again.packs,once,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(once.pending,null);
 assert.equal(legalUniversalActions(again.packs,once).some(a=>a.uid===used.uid&&a.mode==='oncePay'),false);
 assert.equal(legalUniversalActions(again.packs,once).some(a=>a.uid===other.uid&&a.mode==='oncePay'),true);
 const quiet=main(deck,29819);
 const lined=put(quiet.s,0,'BLC-2-017','energy',0,false);
 const emptyHand=quiet.s.players[0].hand.splice(0);
 quiet.s.players[0].outside.push(...emptyHand);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.mode==='oncePay'),false);
 quiet.s.players[0].hand.push(quiet.s.players[0].outside.pop());
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.uid===lined.uid&&a.mode==='oncePay'),true);
 aiOk(first.packs,battle);
 assert.equal(assertUniversalMatch(first.packs,battle),true);
 assert.equal(assertUniversalMatch(again.packs,once),true);
 assert.equal(assertUniversalMatch(quiet.packs,quiet.s),true);
});

test('BLC-4-003 discounts an empty field, steps, and cuts BP only on its own retire turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-003');
 assert.equal(printed.effect,'自己場上沒有任何卡片時，手牌中的此卡所需黃色能量減少2。Step：移動階段可從前線移至能量線。退場時：若為自己的回合，最多選1個對方前線BP1500以上的角色，本回合BP−1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-4-003'];
 assert.equal(card.energy,2);
 assert.equal(card.gen,1);
 assert.equal(card.step,true);
 assert.equal(card.emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onRetire[0].ownTurnOnly,true);
 assert.equal(card.effects.onRetire[0].minBp,1500);
 const deck=realDeck(['BLC-4-003','BLC-1-023','BLC-1-018','BLC-1-012','BLC-1-002'],'yellow');
 const cost=main(deck,29903);
 assert.equal(effectiveHandRequiredEnergy(cost.packs,cost.s,0,card),0);
 put(cost.s,0,'BLC-1-002','front',0);
 assert.equal(effectiveHandRequiredEnergy(cost.packs,cost.s,0,card),2);
 const packs=[bleach,bleach];
 let moving=newUniversalMatch(packs,{decks:[deck,deck],seed:29904,first:0});
 for(let n=0;n<8&&moving.phase!=='move';n++)
  moving=dispatchUniversalAction(packs,moving,{type:'next'});
 const stepper=put(moving,0,'BLC-4-003','front',0,true);
 const step=legalUniversalActions(packs,moving).find(a=>a.type==='step'&&a.uid===stepper.uid);
 assert.ok(step);
 moving=dispatchUniversalAction(packs,moving,step);
 assert.equal(moving.players[0].energy.some(c=>c?.uid===stepper.uid),true);
 const own=main(deck,29905);
 const self=put(own.s,0,'BLC-4-003','front',0,true);
 const wall=put(own.s,1,'BLC-1-023','front',0,true);
 const edge=put(own.s,1,'BLC-1-018','front',1,true);
 const low=put(own.s,1,'BLC-1-012','front',2,true);
 low.buffs=[{bp:-500,untilTurn:own.s.turn}];
 assert.equal(universalBp(own.packs,own.s,low),1000);
 let battle=own.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(own.packs,battle,{type:'next'});
 live(battle,0,self.uid).ready=true;
 battle=dispatchUniversalAction(own.packs,battle,{type:'attack',uid:self.uid});
 battle=dispatchUniversalAction(own.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(battle.pending.kind,'effect-target');
 const targets=legalUniversalActions(own.packs,battle).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(targets.includes(wall.uid),true);
 assert.equal(targets.includes(edge.uid),true);
 assert.equal(targets.includes(low.uid),false);
 assert.equal(targets.includes(null),true);
 battle=dispatchUniversalAction(own.packs,battle,{type:'chooseTarget',uid:wall.uid});
 assert.equal(universalBp(own.packs,battle,live(battle,1,wall.uid)),3000);
 let theirs=newUniversalMatch(packs,{decks:[deck,deck],seed:29906,first:1});
 for(let n=0;n<8&&theirs.phase!=='attack';n++)
  theirs=dispatchUniversalAction(packs,theirs,{type:'next'});
 const attacker=put(theirs,1,'BLC-1-023','front',0,true);
 const blocker=put(theirs,0,'BLC-4-003','front',0,true);
 theirs=dispatchUniversalAction(packs,theirs,{type:'attack',uid:attacker.uid});
 theirs=dispatchUniversalAction(packs,theirs,{type:'chooseBlock',uid:blocker.uid},{actor:0});
 assert.equal(theirs.players[0].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(theirs.pending,null);
 aiOk(own.packs,battle);
 assert.equal(assertUniversalMatch(cost.packs,cost.s),true);
 assert.equal(assertUniversalMatch(packs,moving),true);
 assert.equal(assertUniversalMatch(own.packs,battle),true);
 assert.equal(assertUniversalMatch(packs,theirs),true);
});

test('BLC-2-028 may discard into an AP active and actives once per card',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-028');
 assert.equal(printed.effect,'Impact 無效。登場：可將 1 張手牌送至場外；成功時可將最多 1 張己方 AP 卡轉為 ACTIVE。主要階段・每回合 1 次：己方前線有其他原始 AP 消耗 2 以上角色時，將此角色轉為 ACTIVE。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-028'];
 assert.equal(card.impactNull,true);
 assert.equal(card.ap,2);
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.op,'cardOnceActive');
 assert.equal(card.effects.onPlay[0].optional,true);
 const deck=realDeck(['BLC-2-028','BLC-2-018','BLC-2-031','BLC-2-016','BLC-4-022'],'blue');
 const played=main(deck,30028);
 for(let i=0;i<3;i++)put(played.s,0,'BLC-2-031','energy',i,true);
 for(const ap of played.s.players[0].apCards.slice(0,2)){ap.inPlay=true;ap.ready=true;}
 const handCard=take(played.s,0,'BLC-2-028');
 played.s.players[0].hand.push(handCard);
 let entry=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 assert.equal(entry.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(played.packs,entry).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),true);
 entry=dispatchUniversalAction(played.packs,entry,{type:'chooseDiscardGate',uid:null});
 assert.equal(entry.pending,null);
 assert.equal(entry.players[0].apCards[0].ready,false);
 played.s=entry;
 for(const ap of played.s.players[0].apCards.slice(0,2)){ap.inPlay=true;ap.ready=true;}
 const second=take(played.s,0,'BLC-2-028');
 played.s.players[0].hand.push(second);
 const dumped=played.s.players[0].hand.find(c=>c.uid!==second.uid);
 let paid=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:second.uid,line:'front',slot:1});
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(paid.pending.kind,'effect-recover-ap');
 const rested=paid.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(paid.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 const gated=main(deck,30029);
 const self=put(gated.s,0,'BLC-2-028','front',0,false);
 const small=put(gated.s,0,'BLC-2-031','front',1,true);
 assert.equal(bleach.cards['BLC-2-031'].ap<2,true);
 assert.equal(legalUniversalActions(gated.packs,gated.s).some(a=>a.mode==='cardOnceActive'),false);
 const parked=put(gated.s,0,'BLC-2-018','energy',0,true);
 assert.equal(legalUniversalActions(gated.packs,gated.s).some(a=>a.mode==='cardOnceActive'),false);
 gated.s.players[0].energy[0]=null;
 gated.s.players[0].front[2]=parked;
 assert.equal(legalUniversalActions(gated.packs,gated.s).some(a=>a.uid===self.uid&&a.mode==='cardOnceActive'),true);
 let stood=dispatchUniversalAction(gated.packs,gated.s,{type:'activate',uid:self.uid,mode:'cardOnceActive'});
 assert.equal(live(stood,0,self.uid).ready,true);
 assert.equal(legalUniversalActions(gated.packs,stood).some(a=>a.uid===self.uid&&a.mode==='cardOnceActive'),false);
 const copy=put(stood,0,'BLC-2-028','energy',0,false);
 assert.equal(legalUniversalActions(gated.packs,stood).some(a=>a.uid===copy.uid&&a.mode==='cardOnceActive'),true);
 grantContinuousState(stood,{kind:'originalEffectsDisabled',controller:1,sourceUid:parked.uid,
  targetUid:copy.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(gated.packs,stood).some(a=>a.uid===copy.uid&&a.mode==='cardOnceActive'),false);
 const fight=main(deck,30030);
 const striker=put(fight.s,0,'BLC-2-018','front',0,true);
 striker.impactGranted={turn:fight.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const wall=put(fight.s,1,'BLC-2-028','front',0,true);
 const life=fight.s.players[1].life.length;
 let battle=fight.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fight.packs,battle,{type:'next'});
 live(battle,0,striker.uid).ready=true;
 battle=dispatchUniversalAction(fight.packs,battle,{type:'attack',uid:striker.uid});
 assert.ok(universalImpact(fight.packs,battle,live(battle,0,striker.uid))>0);
 battle=dispatchUniversalAction(fight.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,life);
 aiOk(played.packs,paid);
 assert.equal(assertUniversalMatch(played.packs,paid),true);
 assert.equal(assertUniversalMatch(gated.packs,stood),true);
 assert.equal(assertUniversalMatch(fight.packs,battle),true);
});

test('BLC-4-043 is also Nem and may put one blue squad card outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-043');
 assert.equal(printed.effect,'此卡也視為《涅音夢》。登場時：查看牌庫頂2張，可將最多1張藍色《涅繭利》、《涅音夢》或具有「涅骸部隊」特徵的卡送至場外，其餘依任意順序放回牌庫頂。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-043'];
 assert.deepEqual(card.nameAliases,['涅 ネム']);
 assert.equal(card.energy,0);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(cardHasName(card,'涅 ネム'),true);
 const ids=['BLC-4-043','BLC-4-040','BLC-2-044','BLC-1-054','BLC-2-031','BLC-2-016','BLC-2-015','BLC-2-026','BLC-2-019','BLC-2-032','BLC-4-022','BLC-2-018','BLC-4-036'];
 const deck=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const packs=[bleach,bleach];
 const playTop=(seed,topIds)=>{
  let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
  for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
  s.players[0].apCards[0].inPlay=true;s.players[0].apCards[0].ready=true;
  const actor=take(s,0,'BLC-4-043');
  const tops=setTop(s,0,topIds);
  s.players[0].hand.push(actor);
  const played=dispatchUniversalAction(packs,s,{type:'play',uid:actor.uid,line:'front',slot:0});
  return {played,tops};
 };
 const miss=playTop(30143,['BLC-1-054','BLC-2-031']);
 assert.equal(miss.played.pending.kind,'effect-top-order');
 assert.equal(miss.played.players[0].outside.some(c=>miss.tops.some(t=>t.uid===c.uid)),false);
 const named=playTop(30144,['BLC-4-040','BLC-2-031']);
 assert.equal(named.played.pending.kind,'effect-top-trait-outside');
 const namedChoices=legalUniversalActions(packs,named.played).filter(a=>a.type==='chooseTopTraitOutside').map(a=>a.uid);
 assert.equal(namedChoices.includes(named.tops[0].uid),true);
 assert.equal(namedChoices.includes(named.tops[1].uid),false);
 assert.equal(namedChoices.includes(null),true);
 let kept=dispatchUniversalAction(packs,named.played,{type:'chooseTopTraitOutside',uid:named.tops[0].uid});
 assert.equal(kept.players[0].outside.some(c=>c.uid===named.tops[0].uid),true);
 kept=dispatchUniversalAction(packs,kept,legalUniversalActions(packs,kept).find(a=>a.type==='chooseTopOrder'));
 assert.equal(kept.players[0].deck[0].uid,named.tops[1].uid);
 const traited=playTop(30145,['BLC-2-044','BLC-1-054']);
 const traitChoices=legalUniversalActions(packs,traited.played).filter(a=>a.type==='chooseTopTraitOutside').map(a=>a.uid);
 assert.equal(traitChoices.includes(traited.tops[0].uid),true);
 assert.equal(traitChoices.includes(traited.tops[1].uid),false);
 const alias=playTop(30146,['BLC-4-043','BLC-2-031']);
 const aliasChoices=legalUniversalActions(packs,alias.played).filter(a=>a.type==='chooseTopTraitOutside').map(a=>a.uid);
 assert.equal(aliasChoices.includes(alias.tops[0].uid),true);
 let skipped=dispatchUniversalAction(packs,alias.played,{type:'chooseTopTraitOutside',uid:null});
 assert.equal(skipped.players[0].outside.some(c=>c.uid===alias.tops[0].uid),false);
 assert.equal(skipped.pending.kind,'effect-top-order');
 aiOk(packs,named.played);
 assert.equal(assertUniversalMatch(packs,kept),true);
 assert.equal(assertUniversalMatch(packs,traited.played),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('BLC-4-051 chooses a draw only on its entry turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-051');
 assert.equal(printed.effect,'啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動，選1項。①抽1張牌，再將1張手牌送至場外。②若對方前線有BP低於印刷BP的角色，抽1張牌。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.gen,3);
 const card=bleach.cards['BLC-4-051'];
 assert.equal(card.gen,2);
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.entryTurnOnly,true);
 assert.deepEqual(card.effects.onPlay,[{op:'noteEntryTurn'}]);
 const deck=realDeck(['BLC-4-051','BLC-1-039','BLC-1-045','BLC-1-048'],'purple');
 const played=main(deck,30251);
 for(const [i,id] of ['BLC-1-039','BLC-1-045','BLC-1-048'].entries())
  put(played.s,0,id,'energy',i,true);
 assert.equal(['BLC-1-039','BLC-1-045','BLC-1-048'].reduce((n,id)=>n+bleach.cards[id].gen,0),3);
 played.s.players[0].apCards[0].inPlay=true;
 played.s.players[0].apCards[0].ready=true;
 const handCard=take(played.s,0,'BLC-4-051');
 played.s.players[0].hand.push(handCard);
 const plain=put(played.s,1,'BLC-1-045','front',0,true);
 assert.equal(universalBp(played.packs,played.s,plain),bleach.cards['BLC-1-045'].bp);
 assert.equal(legalUniversalActions(played.packs,played.s).some(a=>a.type==='play'&&a.uid===handCard.uid),true);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 const self=live(entered,0,handCard.uid);
 assert.equal(self.entryTurn,entered.turn);
 assert.equal(entered.pending,null);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='oncePay'),true);
 const deckBefore=entered.players[0].deck.length;
 let missed=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(missed.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(played.packs,missed).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode);
 assert.deepEqual(modes.sort(),['below','discard']);
 missed=dispatchUniversalAction(played.packs,missed,{type:'chooseEffectMode',mode:'below'});
 assert.equal(missed.players[0].deck.length,deckBefore);
 assert.equal(missed.pending,null);
 assert.equal(legalUniversalActions(played.packs,missed).some(a=>a.uid===self.uid&&a.mode==='oncePay'),false);
 const parked=put(missed,0,'BLC-4-051','energy',3,true);
 assert.equal(universalCardEnergy(played.packs,missed,0,parked),2);
 parked.ready=false;
 assert.equal(universalCardEnergy(played.packs,missed,0,parked),2);
 assert.equal(legalUniversalActions(played.packs,missed).some(a=>a.uid===parked.uid&&a.mode==='oncePay'),false);
 parked.entryTurn=missed.turn-1;
 assert.throws(()=>dispatchUniversalAction(played.packs,missed,{type:'activate',uid:parked.uid,mode:'oncePay'}),/Action not currently legal/);
 parked.entryTurn=missed.turn;
 assert.equal(legalUniversalActions(played.packs,missed).some(a=>a.uid===parked.uid&&a.mode==='oncePay'),true);
 const handBefore=missed.players[0].hand.length;
 const deckNow=missed.players[0].deck.length;
 let drawn=dispatchUniversalAction(played.packs,missed,{type:'activate',uid:parked.uid,mode:'oncePay'});
 drawn=dispatchUniversalAction(played.packs,drawn,{type:'chooseEffectMode',mode:'discard'});
 assert.equal(drawn.players[0].deck.length,deckNow-1);
 assert.equal(drawn.players[0].hand.length,handBefore+1);
 assert.equal(drawn.pending.kind,'effect-discard');
 const dumped=drawn.players[0].hand[drawn.players[0].hand.length-1];
 drawn=dispatchUniversalAction(played.packs,drawn,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(drawn.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(drawn.pending,null);
 assert.equal(legalUniversalActions(played.packs,drawn).some(a=>a.uid===parked.uid&&a.mode==='oncePay'),false);
 const silenced=put(drawn,0,'BLC-4-051','front',1,true);
 silenced.entryTurn=drawn.turn;
 assert.equal(legalUniversalActions(played.packs,drawn).some(a=>a.uid===silenced.uid&&a.mode==='oncePay'),true);
 grantContinuousState(drawn,{kind:'originalEffectsDisabled',controller:1,sourceUid:plain.uid,
  targetUid:silenced.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,drawn).some(a=>a.uid===silenced.uid&&a.mode==='oncePay'),false);
 const reduced=main(deck,30252);
 for(const [i,id] of ['BLC-1-039','BLC-1-045','BLC-1-048'].entries())
  put(reduced.s,0,id,'energy',i,true);
 reduced.s.players[0].apCards[0].inPlay=true;
 reduced.s.players[0].apCards[0].ready=true;
 const wall=put(reduced.s,1,'BLC-1-039','front',0,true);
 wall.buffs=[{bp:-1000,untilTurn:reduced.s.turn}];
 assert.ok(universalBp(reduced.packs,reduced.s,wall)<bleach.cards['BLC-1-039'].bp);
 const actor=take(reduced.s,0,'BLC-4-051');
 reduced.s.players[0].hand.push(actor);
 let low=dispatchUniversalAction(reduced.packs,reduced.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 const before=low.players[0].deck.length;
 low=dispatchUniversalAction(reduced.packs,low,{type:'activate',uid:actor.uid,mode:'oncePay'});
 low=dispatchUniversalAction(reduced.packs,low,{type:'chooseEffectMode',mode:'below'});
 assert.equal(low.players[0].deck.length,before-1);
 assert.equal(low.pending,null);
 aiOk(played.packs,entered);
 aiOk(reduced.packs,low);
 assert.equal(assertUniversalMatch(played.packs,drawn),true);
 assert.equal(assertUniversalMatch(reduced.packs,low),true);
});

test('BLC-4-068 actives from REST on the front, pays 1 AP, and rests one opponent',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-068');
 assert.equal(printed.effect,'Impact無效。啟動・主要〔前線／支付1 AP〕：僅在此角色為Rest時可發動；將此角色改為Active，並最多選1個對方前線角色改為Rest。所有《京樂春水》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-068'];
 assert.equal(card.impactNull,true);
 assert.equal(card.energy,4);
 assert.equal(card.gen,1);
 assert.equal(card.bp,4000);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.op,'restFrontNameOnce');
 const deck=realDeck(['BLC-4-068','BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089','BLC-1-080'],'green');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089'].entries())
   put(s,0,id,'energy',i,true);
  for(const ap of s.players[0].apCards.slice(0,2)){ap.inPlay=true;ap.ready=true;}
 };
 const played=main(deck,30368);
 fuel(played.s);
 const handCard=take(played.s,0,'BLC-4-068');
 played.s.players[0].hand.push(handCard);
 let stood=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 const self=live(stood,0,handCard.uid);
 assert.equal(self.ready,false);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===self.uid&&a.mode==='restFrontNameOnce'),true);
 const displaced=stood.players[0].energy[3];
 stood.players[0].energy[3]=null;
 stood.players[0].deck.push(displaced);
 const lined=put(stood,0,'BLC-4-068','energy',3,false);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===lined.uid&&a.mode==='restFrontNameOnce'),false);
 const awake=put(stood,0,'BLC-4-068','front',1,true);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===awake.uid&&a.mode==='restFrontNameOnce'),false);
 const quiet=put(stood,0,'BLC-4-068','front',2,false);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===quiet.uid&&a.mode==='restFrontNameOnce'),true);
 grantContinuousState(stood,{kind:'originalEffectsDisabled',controller:1,sourceUid:awake.uid,
  targetUid:quiet.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===quiet.uid&&a.mode==='restFrontNameOnce'),false);
 const left=put(stood,1,'BLC-1-071','front',0,true);
 const right=put(stood,1,'BLC-1-083','front',1,true);
 stood=dispatchUniversalAction(played.packs,stood,{type:'activate',uid:self.uid,mode:'restFrontNameOnce'});
 assert.equal(live(stood,0,self.uid).ready,true);
 assert.equal(stood.pending.kind,'effect-rest-bp');
 const rests=legalUniversalActions(played.packs,stood).filter(a=>a.type==='chooseRestBp').map(a=>a.uid);
 assert.equal(rests.includes(null),true);
 assert.equal(rests.includes(left.uid),true);
 assert.equal(rests.includes(right.uid),true);
 stood=dispatchUniversalAction(played.packs,stood,{type:'chooseRestBp',uid:left.uid});
 assert.equal(live(stood,1,left.uid).ready,false);
 assert.equal(live(stood,1,right.uid).ready,true);
 assert.equal(stood.pending,null);
 stood.players[0].apCards.find(c=>c.inPlay&&!c.ready).ready=true;
 awake.ready=false;
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===awake.uid&&a.mode==='restFrontNameOnce'),false);
 const skipped=main(deck,30369);
 fuel(skipped.s);
 const actor=take(skipped.s,0,'BLC-4-068');
 skipped.s.players[0].hand.push(actor);
 let open=dispatchUniversalAction(skipped.packs,skipped.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 live(open,0,actor.uid).ready=false;
 const lone=put(open,1,'BLC-1-071','front',0,true);
 open=dispatchUniversalAction(skipped.packs,open,{type:'activate',uid:actor.uid,mode:'restFrontNameOnce'});
 open=dispatchUniversalAction(skipped.packs,open,{type:'chooseRestBp',uid:null});
 assert.equal(live(open,0,actor.uid).ready,true);
 assert.equal(live(open,1,lone.uid).ready,true);
 assert.equal(open.pending,null);
 const empty=main(deck,30370);
 fuel(empty.s);
 const bare=take(empty.s,0,'BLC-4-068');
 empty.s.players[0].hand.push(bare);
 let none=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:bare.uid,line:'front',slot:0});
 live(none,0,bare.uid).ready=false;
 none=dispatchUniversalAction(empty.packs,none,{type:'activate',uid:bare.uid,mode:'restFrontNameOnce'});
 assert.equal(live(none,0,bare.uid).ready,true);
 assert.equal(none.pending,null);
 const fight=main(deck,30371);
 const striker=put(fight.s,0,'BLC-1-080','front',0,true);
 striker.impactGranted={turn:fight.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const wall=put(fight.s,1,'BLC-4-068','front',0,true);
 const life=fight.s.players[1].life.length;
 let battle=fight.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fight.packs,battle,{type:'next'});
 live(battle,0,striker.uid).ready=true;
 assert.ok(universalBp(fight.packs,battle,live(battle,0,striker.uid))>=universalBp(fight.packs,battle,live(battle,1,wall.uid)));
 battle=dispatchUniversalAction(fight.packs,battle,{type:'attack',uid:striker.uid});
 assert.ok(universalImpact(fight.packs,battle,live(battle,0,striker.uid))>0);
 battle=dispatchUniversalAction(fight.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,life);
 aiOk(played.packs,stood);
 assert.equal(assertUniversalMatch(played.packs,stood),true);
 assert.equal(assertUniversalMatch(skipped.packs,open),true);
 assert.equal(assertUniversalMatch(empty.packs,none),true);
 assert.equal(assertUniversalMatch(fight.packs,battle),true);
});

test('BLC-4-010 discards from the front only while Yhwach is on the field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-010');
 assert.equal(printed.effect,'啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：僅在自己場上有《友哈巴赫》時可發動；選1個對方場上BP1500以上的角色，本回合BP−1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 const card=bleach.cards['BLC-4-010'];
 assert.equal(card.name,'ペルニダ・パルンカジャス');
 assert.equal(card.energy,4);
 assert.equal(card.gen,1);
 assert.equal(card.bp,4000);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.requiresOwnName,'ユーハバッハ');
 assert.deepEqual(card.effects,{});
 const deck=realDeck(['BLC-4-010','BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021'],'yellow');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018'].entries())
   put(s,0,id,'energy',i,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const played=main(deck,30410);
 fuel(played.s);
 assert.equal(['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018'].reduce((n,id)=>n+bleach.cards[id].gen,0),4);
 const yhwach=put(played.s,0,'BLC-1-021','front',1,true);
 assert.equal(cardHasName(bleach.cards[yhwach.cardId],'ユーハバッハ'),true);
 const handCard=take(played.s,0,'BLC-4-010');
 const payment=take(played.s,0,'BLC-1-001');
 played.s.players[0].hand.push(handCard,payment);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 const self=live(entered,0,handCard.uid);
 assert.equal(self.ready,false);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='oncePay'),true);
 const displaced=entered.players[0].energy[3];
 entered.players[0].energy[3]=null;
 entered.players[0].deck.push(displaced);
 const lined=put(entered,0,'BLC-4-010','energy',3,true);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===lined.uid&&a.mode==='oncePay'),false);
 const quiet=put(entered,0,'BLC-4-010','front',2,false);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===quiet.uid&&a.mode==='oncePay'),true);
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,sourceUid:yhwach.uid,
  targetUid:quiet.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===quiet.uid&&a.mode==='oncePay'),false);
 const high=put(entered,1,'BLC-1-002','energy',0,true);
 const low=put(entered,1,'BLC-1-012','front',0,true);
 low.buffs=[{bp:-1000,untilTurn:entered.turn}];
 assert.ok(universalBp(played.packs,entered,low)<1500);
 assert.ok(universalBp(played.packs,entered,high)>=1500);
 const before=universalBp(played.packs,entered,high);
 entered=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(entered.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),false);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseDiscardGate',uid:payment.uid});
 assert.equal(entered.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(entered.pending.kind,'effect-target');
 const targets=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(targets.includes(high.uid),true);
 assert.equal(targets.includes(low.uid),false);
 assert.equal(targets.includes(null),false);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(played.packs,entered,live(entered,1,high.uid)),before-1000);
 assert.equal(entered.pending,null);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='oncePay'),false);
 const secondPay=take(entered,0,'BLC-1-018');
 entered.players[0].hand.push(secondPay);
 const fresh=put(entered,1,'BLC-1-001','energy',1,true);
 const copy=put(entered,0,'BLC-4-010','front',3,false);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===copy.uid&&a.mode==='oncePay'),true);
 let again=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:copy.uid,mode:'oncePay'});
 again=dispatchUniversalAction(played.packs,again,{type:'chooseDiscardGate',uid:secondPay.uid});
 assert.equal(again.pending.kind,'effect-target');
 const nextTargets=legalUniversalActions(played.packs,again).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(nextTargets.includes(fresh.uid),true);
 assert.equal(nextTargets.includes(high.uid),false);
 const absent=main(deck,30411);
 fuel(absent.s);
 const bare=take(absent.s,0,'BLC-4-010');
 const spare=take(absent.s,0,'BLC-1-001');
 absent.s.players[0].hand.push(bare,spare);
 let closed=dispatchUniversalAction(absent.packs,absent.s,{type:'play',uid:bare.uid,line:'front',slot:0});
 assert.equal(legalUniversalActions(absent.packs,closed).some(a=>a.uid===bare.uid&&a.mode==='oncePay'),false);
 const held=closed.players[0].energy[0];
 closed.players[0].energy[0]=null;
 closed.players[0].deck.push(held);
 const yh=put(closed,0,'BLC-1-021','energy',0,true);
 assert.equal(cardHasName(bleach.cards[yh.cardId],'ユーハバッハ'),true);
 assert.equal(legalUniversalActions(absent.packs,closed).some(a=>a.uid===bare.uid&&a.mode==='oncePay'),true);
 const empty=main(deck,30412);
 fuel(empty.s);
 const actor=take(empty.s,0,'BLC-4-010');
 const dumped=take(empty.s,0,'BLC-1-001');
 empty.s.players[0].hand.push(actor,dumped);
 put(empty.s,0,'BLC-1-021','front',1,true);
 const small=put(empty.s,1,'BLC-1-012','front',0,true);
 small.buffs=[{bp:-1000,untilTurn:empty.s.turn}];
 let none=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 none=dispatchUniversalAction(empty.packs,none,{type:'activate',uid:actor.uid,mode:'oncePay'});
 none=dispatchUniversalAction(empty.packs,none,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.some(c=>c.uid===dumped.uid),true);
 aiOk(played.packs,entered);
 assert.equal(assertUniversalMatch(played.packs,again),true);
 assert.equal(assertUniversalMatch(absent.packs,closed),true);
 assert.equal(assertUniversalMatch(empty.packs,none),true);
});

test('BLC-2-024 gains 500 on its turn and REST-plays one traitless blue character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-024');
 assert.equal(printed.effect,'己方回合中，此角色 BP +500。登場：若本回合己方曾將手牌送至場外，可從手牌將最多 1 張需求能源 1 以下、AP 消耗 1、且不具有特徵的藍色角色卡，以 REST 登場於己方場上。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.bp,3500);
 const card=bleach.cards['BLC-2-024'];
 assert.equal(card.name,'四楓院 夜一');
 assert.equal(card.bp,3500);
 assert.equal(card.ownTurnBp,500);
 assert.equal(card.energy,4);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.equal(card.effects.onPlay[0].traitless,true);
 const deck=realDeck(['BLC-2-024','BLC-2-017','BLC-2-016','BLC-2-031','BLC-2-022','BLC-4-030','BLC-2-025','BLC-2-023','BLC-4-022','BLC-2-018'],'blue');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-2-016','BLC-2-031','BLC-2-022','BLC-4-030'].entries())
   put(s,0,id,'energy',i,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const quiet=main(deck,30420);
 fuel(quiet.s);
 const bare=take(quiet.s,0,'BLC-2-024');
 const cheap=take(quiet.s,0,'BLC-2-016');
 quiet.s.players[0].hand.push(bare,cheap);
 let closed=dispatchUniversalAction(quiet.packs,quiet.s,{type:'play',uid:bare.uid,line:'front',slot:0});
 assert.equal(closed.pending,null);
 assert.equal(universalBp(quiet.packs,closed,live(closed,0,bare.uid)),4000);
 grantContinuousState(closed,{kind:'originalEffectsDisabled',controller:1,sourceUid:cheap.uid,
  targetUid:bare.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(quiet.packs,closed,live(closed,0,bare.uid)),3500);
 const played=main(deck,30421);
 fuel(played.s);
 const payer=put(played.s,0,'BLC-2-017','front',1,false);
 const dumped=take(played.s,0,'BLC-2-025');
 const legal=take(played.s,0,'BLC-2-023');
 const traited=take(played.s,0,'BLC-2-025');
 const costly=take(played.s,0,'BLC-2-018');
 const heavy=take(played.s,0,'BLC-4-022');
 const actor=take(played.s,0,'BLC-2-024');
 played.s.players[0].hand.push(dumped,legal,traited,costly,heavy,actor);
 assert.equal(legalUniversalActions(played.packs,played.s).some(a=>a.uid===payer.uid&&a.mode==='oncePay'),true);
 let paid=dispatchUniversalAction(played.packs,played.s,{type:'activate',uid:payer.uid,mode:'oncePay'});
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(paid.players[0].outside.some(c=>c.uid===dumped.uid),true);
 let entered=dispatchUniversalAction(played.packs,paid,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(universalBp(played.packs,entered,live(entered,0,actor.uid)),4000);
 assert.equal(entered.pending.kind,'effect-hand-rest');
 const choices=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseHandRest');
 const ids=uid=>choices.some(a=>a.uid===uid);
 assert.equal(ids(legal.uid),true);
 assert.equal(ids(traited.uid),false);
 assert.equal(ids(costly.uid),false);
 assert.equal(ids(heavy.uid),false);
 assert.equal(ids(null),true);
 aiOk(played.packs,entered);
 const skipped=dispatchUniversalAction(played.packs,entered,{type:'chooseHandRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===legal.uid),true);
 const again=main(deck,30422);
 fuel(again.s);
 const gate=put(again.s,0,'BLC-2-017','front',1,false);
 const pay=take(again.s,0,'BLC-2-025');
 const seat=take(again.s,0,'BLC-2-023');
 const self=take(again.s,0,'BLC-2-024');
 again.s.players[0].hand.push(pay,seat,self);
 let open=dispatchUniversalAction(again.packs,again.s,{type:'activate',uid:gate.uid,mode:'oncePay'});
 open=dispatchUniversalAction(again.packs,open,{type:'chooseDiscardGate',uid:pay.uid});
 open=dispatchUniversalAction(again.packs,open,{type:'play',uid:self.uid,line:'front',slot:0});
 const action=legalUniversalActions(again.packs,open).find(a=>a.type==='chooseHandRest'&&a.uid===seat.uid&&a.line==='front');
 assert.ok(action);
 open=dispatchUniversalAction(again.packs,open,action);
 const rested=live(open,0,seat.uid);
 assert.equal(rested.ready,false);
 assert.equal(open.players[0].front.some(c=>c?.uid===seat.uid),true);
 assert.equal(open.pending,null);
 let opp=open;
 for(let n=0;n<12&&opp.active===0;n++)
  opp=dispatchUniversalAction(again.packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 assert.equal(universalBp(again.packs,opp,live(opp,0,self.uid)),3500);
 aiOk(quiet.packs,closed);
 aiOk(again.packs,open);
 assert.equal(assertUniversalMatch(quiet.packs,closed),true);
 assert.equal(assertUniversalMatch(played.packs,skipped),true);
 assert.equal(assertUniversalMatch(again.packs,opp),true);
});

test('BLC-4-039 actives from the energy line and may discard to active a printed AP 2',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-039');
 assert.equal(printed.effect,'登場時〔能量線〕：若自己的前線有印刷消費AP為2以上的角色，將此角色改為Active。啟動・主要〔改為Rest〕：選自己場上另1個角色，本回合BP+1000；若所選角色的印刷消費AP為2以上，可將1張手牌送至場外，如此則將所選角色改為Active。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-039'];
 assert.equal(card.name,'朽木 ルキア');
 assert.equal(card.energy,2);
 assert.equal(card.ap,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'restBuffThenApActive');
 assert.equal(card.mainAbility.minAp,2);
 const deck=realDeck(['BLC-4-039','BLC-2-016','BLC-2-031','BLC-2-018','BLC-2-023','BLC-4-022'],'blue');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-2-016','BLC-2-031'].entries())
   put(s,0,id,'energy',i,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const fronted=main(deck,30430);
 fuel(fronted.s);
 put(fronted.s,0,'BLC-2-018','front',1,false);
 const frontCard=take(fronted.s,0,'BLC-4-039');
 fronted.s.players[0].hand.push(frontCard);
 let onFront=dispatchUniversalAction(fronted.packs,fronted.s,{type:'play',uid:frontCard.uid,line:'front',slot:0});
 assert.equal(live(onFront,0,frontCard.uid).ready,false);
 assert.equal(onFront.pending,null);
 const missed=main(deck,30431);
 fuel(missed.s);
 const onlyEnergy=put(missed.s,0,'BLC-4-022','energy',2,false);
 const missCard=take(missed.s,0,'BLC-4-039');
 missed.s.players[0].hand.push(missCard);
 let stayed=dispatchUniversalAction(missed.packs,missed.s,{type:'play',uid:missCard.uid,line:'energy',slot:3});
 assert.equal(live(stayed,0,missCard.uid).ready,false);
 assert.equal(bleach.cards[onlyEnergy.cardId].ap,2);
 const played=main(deck,30432);
 fuel(played.s);
 const heavy=put(played.s,0,'BLC-2-018','front',1,false);
 const small=put(played.s,0,'BLC-2-023','front',2,false);
 const spare=take(played.s,0,'BLC-2-016');
 const actor=take(played.s,0,'BLC-4-039');
 played.s.players[0].hand.push(spare,actor);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:actor.uid,line:'energy',slot:2});
 const self=live(entered,0,actor.uid);
 assert.equal(self.ready,true);
 assert.equal(entered.pending,null);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='restBuffAp'),true);
 const alone=put(entered,0,'BLC-4-039','front',0,true);
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,sourceUid:heavy.uid,
  targetUid:alone.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===alone.uid&&a.mode==='restBuffAp'),false);
 const before=universalBp(played.packs,entered,small);
 entered=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'restBuffAp'});
 assert.equal(live(entered,0,self.uid).ready,false);
 assert.equal(entered.pending.kind,'effect-buff-own');
 const buffs=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseOwnBuff').map(a=>a.uid);
 assert.equal(buffs.includes(small.uid),true);
 assert.equal(buffs.includes(heavy.uid),true);
 assert.equal(buffs.includes(self.uid),false);
 assert.equal(buffs.includes(null),false);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseOwnBuff',uid:small.uid});
 assert.equal(universalBp(played.packs,entered,live(entered,0,small.uid)),before+1000);
 assert.equal(live(entered,0,small.uid).ready,false);
 assert.equal(entered.pending,null);
 live(entered,0,self.uid).ready=true;
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='restBuffAp'),true);
 const lined=put(entered,0,'BLC-4-022','energy',3,false);
 const linedBefore=universalBp(played.packs,entered,lined);
 entered=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'restBuffAp'});
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseOwnBuff',uid:lined.uid});
 assert.equal(universalBp(played.packs,entered,live(entered,0,lined.uid)),linedBefore+1000);
 assert.equal(entered.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),true);
 const skipped=dispatchUniversalAction(played.packs,entered,{type:'chooseDiscardGate',uid:null});
 assert.equal(live(skipped,0,lined.uid).ready,false);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===spare.uid),true);
 live(skipped,0,self.uid).ready=true;
 let paid=dispatchUniversalAction(played.packs,skipped,{type:'activate',uid:self.uid,mode:'restBuffAp'});
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseOwnBuff',uid:heavy.uid});
 assert.equal(paid.pending.kind,'effect-discard-gate');
 aiOk(played.packs,paid);
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseDiscardGate',uid:spare.uid});
 assert.equal(paid.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(live(paid,0,heavy.uid).ready,true);
 assert.equal(paid.pending,null);
 const empty=main(deck,30433);
 fuel(empty.s);
 const wall=put(empty.s,0,'BLC-2-018','front',1,false);
 const bare=take(empty.s,0,'BLC-4-039');
 empty.s.players[0].hand.push(bare);
 let quiet=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:bare.uid,line:'energy',slot:2});
 assert.equal(live(quiet,0,bare.uid).ready,true);
 quiet.players[0].deck.push(...quiet.players[0].hand.splice(0));
 assert.equal(quiet.players[0].hand.length,0);
 quiet=dispatchUniversalAction(empty.packs,quiet,{type:'activate',uid:bare.uid,mode:'restBuffAp'});
 quiet=dispatchUniversalAction(empty.packs,quiet,{type:'chooseOwnBuff',uid:wall.uid});
 assert.equal(quiet.pending,null);
 assert.equal(live(quiet,0,wall.uid).ready,false);
 const solo=main(deck,30434);
 const only=put(solo.s,0,'BLC-4-039','front',0,true);
 assert.equal(legalUniversalActions(solo.packs,solo.s).some(a=>a.uid===only.uid&&a.mode==='restBuffAp'),false);
 aiOk(played.packs,entered);
 aiOk(empty.packs,quiet);
 assert.equal(assertUniversalMatch(fronted.packs,onFront),true);
 assert.equal(assertUniversalMatch(missed.packs,stayed),true);
 assert.equal(assertUniversalMatch(played.packs,paid),true);
 assert.equal(assertUniversalMatch(empty.packs,quiet),true);
 assert.equal(assertUniversalMatch(solo.packs,solo.s),true);
});

test('BLC-3-003 chooses BP+1000 or BP+3000 that retires at attack end',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-003');
 assert.equal(printed.effect,'【登場時】選擇以下一項：\n・可以選擇最多 1 張自己場上的其他角色，在本回合中 BP＋1000。\n・可以選擇最多 1 張自己場上的其他角色，在本回合中 BP＋3000，並賦予「此角色的攻擊結束時，將此角色退場」。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-003'];
 assert.equal(card.name,'涅 マユリ');
 assert.equal(card.energy,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 const deck=realDeck(['BLC-3-003','BLC-2-016','BLC-2-023','BLC-2-022','BLC-2-018','BLC-2-044'],'blue');
 const fuel=s=>{
  put(s,0,'BLC-2-016','energy',0,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const finishAttack=(packs,s,attacker)=>{
  let battle=s;
  for(let n=0;n<6&&battle.phase!=='attack';n++)
   battle=dispatchUniversalAction(packs,battle,{type:'next'});
  live(battle,0,attacker).ready=true;
  const life=battle.players[1].life.length;
  battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:attacker});
  if(battle.pending?.kind==='block')
   battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:null},{actor:1});
  while(battle.pending?.kind==='life-trigger')
   battle=dispatchUniversalAction(packs,battle,{type:'chooseTrigger',mode:'skip'},{actor:1});
  return {battle,life};
 };
 const played=main(deck,30440);
 fuel(played.s);
 const ally=put(played.s,0,'BLC-2-023','front',1,true);
 const actor=take(played.s,0,'BLC-3-003');
 played.s.players[0].hand.push(actor);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(entered.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode);
 assert.deepEqual(modes.sort(),['retire','small']);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(entered.pending.kind,'effect-buff-own');
 const choices=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseOwnBuff').map(a=>a.uid);
 assert.equal(choices.includes(ally.uid),true);
 assert.equal(choices.includes(actor.uid),false);
 assert.equal(choices.includes(null),true);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseOwnBuff',uid:ally.uid});
 const granted=live(entered,0,ally.uid);
 assert.equal(universalBp(played.packs,entered,granted),bleach.cards['BLC-2-023'].bp+3000);
 assert.equal(granted.attackEndRetireGranted.turn,entered.turn);
 assert.equal(granted.attackEndRetireGranted.stamp,granted.fieldEntryStamp);
 assert.equal(granted.attackEndRetireGranted.sourceUid,actor.uid);
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,sourceUid:actor.uid,
  targetUid:ally.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(live(entered,0,ally.uid).attackEndRetireGranted.stamp,granted.fieldEntryStamp);
 const direct=finishAttack(played.packs,entered,ally.uid);
 assert.equal(direct.battle.players[0].outside.some(c=>c.uid===ally.uid),true);
 assert.equal(direct.battle.players[1].life.length,direct.life-1);
 assert.equal(direct.battle.pending,null);
 const small=main(deck,30441);
 fuel(small.s);
 const mild=put(small.s,0,'BLC-2-023','front',1,true);
 const self=take(small.s,0,'BLC-3-003');
 small.s.players[0].hand.push(self);
 let mildPlay=dispatchUniversalAction(small.packs,small.s,{type:'play',uid:self.uid,line:'front',slot:0});
 mildPlay=dispatchUniversalAction(small.packs,mildPlay,{type:'chooseEffectMode',mode:'small'});
 mildPlay=dispatchUniversalAction(small.packs,mildPlay,{type:'chooseOwnBuff',uid:mild.uid});
 assert.equal(universalBp(small.packs,mildPlay,live(mildPlay,0,mild.uid)),bleach.cards['BLC-2-023'].bp+1000);
 assert.equal(live(mildPlay,0,mild.uid).attackEndRetireGranted,undefined);
 const stayed=finishAttack(small.packs,mildPlay,mild.uid);
 assert.equal(live(stayed.battle,0,mild.uid).uid,mild.uid);
 assert.equal(stayed.battle.players[0].front.some(c=>c?.uid===mild.uid),true);
 const skipped=main(deck,30442);
 fuel(skipped.s);
 const other=put(skipped.s,0,'BLC-2-023','front',1,true);
 const source=take(skipped.s,0,'BLC-3-003');
 skipped.s.players[0].hand.push(source);
 let declined=dispatchUniversalAction(skipped.packs,skipped.s,{type:'play',uid:source.uid,line:'front',slot:0});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseEffectMode',mode:'retire'});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseOwnBuff',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(live(declined,0,other.uid).attackEndRetireGranted,undefined);
 assert.equal(universalBp(skipped.packs,declined,live(declined,0,other.uid)),bleach.cards['BLC-2-023'].bp);
 const alone=main(deck,30443);
 put(alone.s,0,'BLC-2-044','energy',0,true);
 alone.s.players[0].apCards[0].inPlay=true;
 alone.s.players[0].apCards[0].ready=true;
 const lone=take(alone.s,0,'BLC-3-003');
 alone.s.players[0].hand.push(lone);
 let empty=dispatchUniversalAction(alone.packs,alone.s,{type:'play',uid:lone.uid,line:'front',slot:0});
 empty=dispatchUniversalAction(alone.packs,empty,{type:'chooseEffectMode',mode:'small'});
 assert.equal(empty.pending,null);
 const won=main(deck,30444);
 fuel(won.s);
 const striker=put(won.s,0,'BLC-2-023','front',1,true);
 const wall=put(won.s,1,'BLC-2-022','front',0,true);
 const giver=take(won.s,0,'BLC-3-003');
 won.s.players[0].hand.push(giver);
 let armed=dispatchUniversalAction(won.packs,won.s,{type:'play',uid:giver.uid,line:'front',slot:0});
 armed=dispatchUniversalAction(won.packs,armed,{type:'chooseEffectMode',mode:'retire'});
 armed=dispatchUniversalAction(won.packs,armed,{type:'chooseOwnBuff',uid:striker.uid});
 let clash=armed;
 for(let n=0;n<6&&clash.phase!=='attack';n++)
  clash=dispatchUniversalAction(won.packs,clash,{type:'next'});
 live(clash,0,striker.uid).ready=true;
 const lives=clash.players[1].life.length;
 clash=dispatchUniversalAction(won.packs,clash,{type:'attack',uid:striker.uid});
 assert.equal(clash.pending.kind,'block');
 clash=dispatchUniversalAction(won.packs,clash,{type:'chooseBlock',uid:wall.uid},{actor:1});
 while(clash.pending?.kind==='life-trigger')
  clash=dispatchUniversalAction(won.packs,clash,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(clash.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(clash.players[0].outside.some(c=>c.uid===striker.uid),true);
 assert.equal(clash.players[1].life.length,lives);
 const held=main(deck,30445);
 fuel(held.s);
 const parked=put(held.s,0,'BLC-2-023','front',1,true);
 const mayuri=take(held.s,0,'BLC-3-003');
 held.s.players[0].hand.push(mayuri);
 let marked=dispatchUniversalAction(held.packs,held.s,{type:'play',uid:mayuri.uid,line:'front',slot:0});
 marked=dispatchUniversalAction(held.packs,marked,{type:'chooseEffectMode',mode:'retire'});
 marked=dispatchUniversalAction(held.packs,marked,{type:'chooseOwnBuff',uid:parked.uid});
 let later=marked;
 for(let n=0;n<12&&later.active===0;n++)
  later=dispatchUniversalAction(held.packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(live(later,0,parked.uid).attackEndRetireGranted,undefined);
 assert.equal(universalBp(held.packs,later,live(later,0,parked.uid)),bleach.cards['BLC-2-023'].bp);
 aiOk(small.packs,mildPlay);
 aiOk(skipped.packs,declined);
 assert.equal(assertUniversalMatch(played.packs,direct.battle),true);
 assert.equal(assertUniversalMatch(small.packs,stayed.battle),true);
 assert.equal(assertUniversalMatch(skipped.packs,declined),true);
 assert.equal(assertUniversalMatch(alone.packs,empty),true);
 assert.equal(assertUniversalMatch(won.packs,clash),true);
 assert.equal(assertUniversalMatch(held.packs,later),true);
});

test('BLC-4-072 may discard one hand card and REST an affordable AP 1 visored character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-072');
 assert.equal(printed.effect,'登場時：可將1張手牌送至場外；如此則可從場外將最多1張能量需求已滿足、消費AP1且具有「假面軍勢」特徵的卡以Rest登場（可選剛丟棄的卡）。');
 assert.equal(printed.nameJa,'平子 真子');
 assert.equal(printed.number,'EX15BT/BLC-4-072');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.color,'green');
 const card=bleach.cards['BLC-4-072'];
 assert.equal(card.name,'平子 真子');
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(cardHasTrait(card,'假面軍勢'),false);
 assert.equal(cardHasTrait(bleach.cards['BLC-4-061'],'假面軍勢'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-4-062'],'假面軍勢'),true);
 const program=[{op:'discardGate',optional:true,then:[{op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true,requireAffordableEnergy:true}]}];
 assert.deepEqual(card.effects.onPlay,program);
 assert.equal(card.mainAbility,null);
 const bare={id:'BAD',name:'平子 真子',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['假面軍勢'],trigger:null,implementation:'dsl',effects:{}};
 const visoredOp={op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true,requireAffordableEnergy:true};
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...bare,effects:{onPlay:[{...visoredOp,ap:4}]}}]}),/invalid trait AP outside REST/);
 assert.throws(()=>createUniversalPack({id:'bad-zero',cards:[{...bare,effects:{onPlay:[{...visoredOp,ap:0}]}}]}),/invalid trait AP outside REST/);
 assert.throws(()=>createUniversalPack({id:'bad-opt',cards:[{...bare,effects:{onPlay:[{...visoredOp,optional:false}]}}]}),/invalid trait AP outside REST/);
 assert.throws(()=>createUniversalPack({id:'bad-energy',cards:[{...bare,effects:{onPlay:[{op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true}]}}]}),/invalid trait AP outside REST/);
 const deck=realDeck(['BLC-4-072','BLC-4-061','BLC-4-062','BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089','BLC-1-080'],'green');
 function fuel(s){
  for(const [i,id] of ['BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089'].entries())
   put(s,0,id,'energy',i);
 }
 const first=main(deck,30472);
 fuel(first.s);
 const lisa=take(first.s,0,'BLC-4-062');
 const kenpachi=take(first.s,0,'BLC-1-080');
 first.s.players[0].outside.push(lisa,kenpachi);
 const hiyori=take(first.s,0,'BLC-4-061');
 first.s.players[0].hand.push(hiyori);
 const hirako=take(first.s,0,'BLC-4-072');
 first.s.players[0].hand.push(hirako);
 let played=dispatchUniversalAction(first.packs,first.s,{type:'play',uid:hirako.uid,line:'front',slot:0});
 assert.equal(played.players[0].front.find(c=>c?.uid===hirako.uid).ready,false);
 assert.equal(played.pending.kind,'effect-discard-gate');
 assert.equal(played.pending.optional,true);
 aiOk(first.packs,played);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseDiscardGate',uid:hiyori.uid});
 assert.equal(played.pending.kind,'effect-outside-trait-ap-rest');
 assert.deepEqual([...played.pending.choices].sort(),[hiyori.uid,lisa.uid].sort());
 assert.equal(played.pending.choices.includes(kenpachi.uid),false);
 const shown=[...new Set(universalPrivateChoices(first.packs,played,0).options.filter(o=>o.card).map(o=>o.card.cardId))].sort();
 assert.deepEqual(shown,['BLC-4-061','BLC-4-062']);
 assert.equal(universalPrivateChoices(first.packs,played,1),null);
 const legal=legalUniversalActions(first.packs,played);
 assert.equal(legal.some(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===null),true);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.uid===kenpachi.uid),false);
 aiOk(first.packs,played);
 const seat=legal.find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===hiyori.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(seat);
 played=dispatchUniversalAction(first.packs,played,seat);
 assert.equal(played.pending,null);
 assert.equal(played.players[0].front.find(c=>c?.uid===hiyori.uid).ready,false);
 assert.equal(played.players[0].outside.some(c=>c.uid===lisa.uid),true);
 assert.equal(played.players[0].outside.some(c=>c.uid===hiyori.uid),false);
 const skipped=main(deck,30473);
 fuel(skipped.s);
 const parked=take(skipped.s,0,'BLC-4-062');
 skipped.s.players[0].outside.push(parked);
 const actor=take(skipped.s,0,'BLC-4-072');
 skipped.s.players[0].hand.push(actor);
 let declined=dispatchUniversalAction(skipped.packs,skipped.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseDiscardGate',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===parked.uid),true);
 const gated=main(deck,30474);
 fuel(gated.s);
 const needTwo=take(gated.s,0,'BLC-4-062');
 gated.s.players[0].outside.push(needTwo);
 const cheap=take(gated.s,0,'BLC-4-061');
 gated.s.players[0].hand.push(cheap);
 const payer=take(gated.s,0,'BLC-4-072');
 gated.s.players[0].hand.push(payer);
 let gate=dispatchUniversalAction(gated.packs,gated.s,{type:'play',uid:payer.uid,line:'front',slot:0});
 for(const slot of [1,2,3]){
  const held=gate.players[0].energy[slot];
  gate.players[0].energy[slot]=null;
  gate.players[0].deck.push(held);
 }
 assert.equal(universalEnergyByColor(gated.packs,gate,0).green,1);
 assert.equal(effectiveHandRequiredEnergy(gated.packs,gate,0,bleach.cards['BLC-4-062']),2);
 gate=dispatchUniversalAction(gated.packs,gate,{type:'chooseDiscardGate',uid:cheap.uid});
 assert.deepEqual(gate.pending.choices,[cheap.uid]);
 const energySeat=legalUniversalActions(gated.packs,gate).find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===cheap.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.ok(energySeat);
 gate=dispatchUniversalAction(gated.packs,gate,energySeat);
 assert.equal(gate.players[0].energy.find(c=>c?.uid===cheap.uid).ready,false);
 assert.equal(gate.players[0].outside.some(c=>c.uid===needTwo.uid),true);
 const quietBoard=main(deck,30475);
 fuel(quietBoard.s);
 const solo=take(quietBoard.s,0,'BLC-4-072');
 const waiting=take(quietBoard.s,0,'BLC-4-061');
 quietBoard.s.players[0].deck.push(...quietBoard.s.players[0].hand.splice(0));
 quietBoard.s.players[0].hand.push(solo);
 quietBoard.s.players[0].outside.push(waiting);
 let quiet=dispatchUniversalAction(quietBoard.packs,quietBoard.s,{type:'play',uid:solo.uid,line:'front',slot:0});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===waiting.uid),true);
 const miss=main(deck,30476);
 fuel(miss.s);
 const plain=take(miss.s,0,'BLC-1-080');
 miss.s.players[0].hand.push(plain);
 const source=take(miss.s,0,'BLC-4-072');
 miss.s.players[0].hand.push(source);
 let none=dispatchUniversalAction(miss.packs,miss.s,{type:'play',uid:source.uid,line:'front',slot:0});
 none=dispatchUniversalAction(miss.packs,none,{type:'chooseDiscardGate',uid:plain.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.some(c=>c.uid===plain.uid),true);
 const vanilla={...bare,implementation:'vanilla',effects:{},traits:[]};
 const fillers=Array.from({length:6},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}));
 const lab=createUniversalPack({id:'lab-hirako',cards:[
  {...bare,id:'SRC',traits:[],effects:{onPlay:program}},
  {...vanilla,id:'VIS',name:'猿柿',traits:['假面軍勢']},
  {...vanilla,id:'COST',name:'リサ',energy:2,traits:['假面軍勢']},
  {...vanilla,id:'AP2',name:'高AP',ap:2,traits:['假面軍勢']},
  {...bare,id:'BAN',name:'前線禁止',frontForbidden:true,traits:['假面軍勢'],effects:{onPlay:[{op:'draw',count:1}]}},
  {...bare,id:'RAID',name:'レイド',raidName:'レイド',traits:['假面軍勢'],effects:{onPlay:[{op:'draw',count:1}]}},
  {...vanilla,id:'BASE',name:'レイド',gen:1},
  ...fillers]});
 const labIds=['SRC','VIS','COST','AP2','BAN','RAID','BASE',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let board=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30477,first:0});
 for(let n=0;n<8&&board.phase!=='main';n++)
  board=dispatchUniversalAction(labPacks,board,{type:'next'});
 put(board,0,'BASE','energy',0);
 put(board,0,'BASE','energy',1);
 const vis=take(board,0,'VIS');
 const cost=take(board,0,'COST');
 const ap2=take(board,0,'AP2');
 const ban=take(board,0,'BAN');
 const raid=take(board,0,'RAID');
 board.players[0].outside.push(vis,cost,ap2,ban,raid);
 const pay=take(board,0,'F0');
 board.players[0].hand.push(pay);
 const src=take(board,0,'SRC');
 board.players[0].hand.push(src);
 let opened=dispatchUniversalAction(labPacks,board,{type:'play',uid:src.uid,line:'front',slot:0});
 opened=dispatchUniversalAction(labPacks,opened,{type:'chooseDiscardGate',uid:pay.uid});
 assert.deepEqual([...opened.pending.choices].sort(),[vis.uid,cost.uid,ban.uid,raid.uid].sort());
 const openedLegal=legalUniversalActions(labPacks,opened);
 assert.equal(openedLegal.some(a=>a.mode==='raid'),false);
 assert.equal(openedLegal.some(a=>a.uid===ban.uid&&a.line==='front'),false);
 assert.equal(openedLegal.some(a=>a.uid===ban.uid&&a.line==='energy'),true);
 assert.equal(openedLegal.some(a=>a.uid===raid.uid&&a.line==='front'),true);
 assert.equal(openedLegal.some(a=>a.uid===ap2.uid),false);
 const deckBefore=opened.players[0].deck.length;
 const raidSeat=openedLegal.find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===raid.uid&&a.line==='front'&&a.replaceUid===undefined);
 opened=dispatchUniversalAction(labPacks,opened,raidSeat);
 assert.equal(opened.pending,null);
 assert.equal(opened.players[0].front.find(c=>c?.uid===raid.uid).ready,false);
 assert.equal(opened.players[0].deck.length,deckBefore-1);
 let banned=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30478,first:0});
 for(let n=0;n<8&&banned.phase!=='main';n++)
  banned=dispatchUniversalAction(labPacks,banned,{type:'next'});
 put(banned,0,'BASE','energy',0);
 const blocked=take(banned,0,'BAN');
 const pricey=take(banned,0,'COST');
 banned.players[0].outside.push(blocked,pricey);
 const toll=take(banned,0,'F0');
 banned.players[0].hand.push(toll);
 const again=take(banned,0,'SRC');
 banned.players[0].hand.push(again);
 let narrow=dispatchUniversalAction(labPacks,banned,{type:'play',uid:again.uid,line:'front',slot:0});
 narrow=dispatchUniversalAction(labPacks,narrow,{type:'chooseDiscardGate',uid:toll.uid});
 assert.deepEqual(narrow.pending.choices,[blocked.uid]);
 const banSeat=legalUniversalActions(labPacks,narrow).find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===blocked.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.ok(banSeat);
 narrow=dispatchUniversalAction(labPacks,narrow,banSeat);
 assert.equal(narrow.pending,null);
 assert.equal(narrow.players[0].energy.find(c=>c?.uid===blocked.uid).ready,false);
 assert.equal(narrow.players[0].front.some(c=>c?.uid===blocked.uid),false);
 assert.equal(narrow.players[0].outside.some(c=>c.uid===pricey.uid),true);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(skipped.packs,declined),true);
 assert.equal(assertUniversalMatch(gated.packs,gate),true);
 assert.equal(assertUniversalMatch(quietBoard.packs,quiet),true);
 assert.equal(assertUniversalMatch(miss.packs,none),true);
 assert.equal(assertUniversalMatch(labPacks,opened),true);
 assert.equal(assertUniversalMatch(labPacks,narrow),true);
});

test('BLC-1-026 lets any own Raid character raid onto it and waives printed conditions',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-026');
 assert.equal(printed.effect,'己方具有 Raid 的角色卡可在此角色上 Raid。');
 assert.equal(printed.nameJa,'ロイド・ロイド（R）');
 assert.equal(printed.number,'UA08BT/BLC-1-026');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,1);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,2000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.color,'yellow');
 const card=bleach.cards['BLC-1-026'];
 assert.equal(card.name,'ロイド・ロイド（R）');
 assert.equal(card.raidHostAny,true);
 assert.equal(card.raidName,null);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.traits,['星十字騎士團']);
 const bare={id:'BAD',name:'宿主',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},raidHostAny:true};
 assert.throws(()=>createUniversalPack({id:'bad-host-event',cards:[{...bare,id:'EV',type:'event',bp:0}]}),/invalid Raid host/);
 assert.throws(()=>createUniversalPack({id:'bad-host-flag',cards:[{...bare,id:'FL',raidHostAny:false,effects:{onPlay:[{op:'draw',count:1}]}}]}),/invalid Raid host/);
 assert.throws(()=>createUniversalPack({id:'bad-host-raid',cards:[{...bare,id:'RD',raidName:'標的'}]}),/invalid Raid host/);
 assert.throws(()=>createUniversalPack({id:'bad-host-vanilla',cards:[{...bare,id:'VA',implementation:'vanilla'}]}),/claims vanilla despite printed\/declared effects/);
 const deck=realDeck(['BLC-1-026','BLC-1-004','BLC-1-002','BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-021'],'yellow');
 const wrong=plainId(deck,3000,['BLC-1-026','BLC-1-004','BLC-1-002','BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-021']);
 function fuel(s){
  for(const [i,id] of ['BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-021'].entries())
   put(s,0,id,'energy',i);
 }
 const first=main(deck,30526);
 fuel(first.s);
 const host=put(first.s,0,'BLC-1-026','front',0);
 const named=put(first.s,0,'BLC-1-002','front',1);
 const other=put(first.s,0,wrong,'front',2);
 const rider=take(first.s,0,'BLC-1-004');
 const second=take(first.s,0,'BLC-1-004');
 first.s.players[0].hand.push(rider,second);
 const raids=()=>legalUniversalActions(first.packs,first.s).filter(a=>a.type==='raid');
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===host.uid&&a.slot===0),true);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===host.uid&&a.slot!==0),false);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===named.uid&&a.slot===1),true);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===other.uid),false);
 assert.equal(raids().some(a=>a.uid===second.uid&&a.baseUid===host.uid),true);
 grantContinuousState(first.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:other.uid,
  targetUid:host.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(raids().some(a=>a.baseUid===host.uid),false);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===named.uid),true);
 assert.equal(raids().some(a=>a.baseUid===other.uid),false);
 first.s.continuousStates=[];
 let stacked=dispatchUniversalAction(first.packs,first.s,{type:'raid',uid:rider.uid,baseUid:host.uid,slot:0});
 assert.equal(stacked.pending,null);
 const top=stacked.players[0].front[0];
 assert.equal(top.cardId,'BLC-1-004');
 assert.equal(top.ready,true);
 assert.equal(top.stack.length,1);
 assert.equal(top.stack[0].cardId,'BLC-1-026');
 assert.equal(top.stack[0].uid,host.uid);
 assert.equal(top.stack[0].faceDown,undefined);
 assert.equal(stacked.players[0].front[1].cardId,'BLC-1-002');
 stacked.players[0].apCards.forEach(c=>{if(c.inPlay)c.ready=true;});
 const after=legalUniversalActions(first.packs,stacked).filter(a=>a.type==='raid');
 assert.equal(after.some(a=>a.uid===second.uid&&a.baseUid===top.uid),false);
 assert.equal(after.some(a=>a.uid===second.uid&&a.baseUid===named.uid&&a.slot===1),true);
 assert.equal(after.some(a=>a.baseUid===host.uid),false);
 const lined=main(deck,30527);
 for(const [i,id] of ['BLC-1-001','BLC-1-012','BLC-1-018'].entries())
  put(lined.s,0,id,'energy',i);
 const energyHost=put(lined.s,0,'BLC-1-026','energy',3);
 const stillNamed=put(lined.s,0,'BLC-1-002','front',0);
 const energyRider=take(lined.s,0,'BLC-1-004');
 lined.s.players[0].hand.push(energyRider);
 const energyRaids=legalUniversalActions(lined.packs,lined.s).filter(a=>a.type==='raid'&&a.uid===energyRider.uid);
 assert.equal(energyRaids.some(a=>a.baseUid===energyHost.uid&&a.slot===1),true);
 assert.equal(energyRaids.some(a=>a.baseUid===stillNamed.uid&&a.slot===0),true);
 let moved=dispatchUniversalAction(lined.packs,lined.s,{type:'raid',uid:energyRider.uid,baseUid:energyHost.uid,slot:1});
 assert.equal(moved.players[0].energy[3],null);
 assert.equal(moved.players[0].front[1].cardId,'BLC-1-004');
 assert.equal(moved.players[0].front[1].stack[0].uid,energyHost.uid);
 assert.equal(moved.players[0].front[0].cardId,'BLC-1-002');
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const fillers=Array.from({length:9},(_,i)=>unit('F'+i));
 const lab=createUniversalPack({id:'lab-raid-host',cards:[
  unit('HOST',{implementation:'dsl',raidHostAny:true,name:'ロイド・ロイド（R）'}),
  unit('NEED',{implementation:'dsl',raidName:'標的',raidRequiresNames:['不在場'],name:'條件突襲',effects:{onPlay:[{op:'draw',count:1}]}}),
  unit('NAMED',{name:'標的'}),
  unit('GATE',{name:'不在場'}),
  ...fillers]});
 const labIds=['HOST','NEED','NAMED','GATE',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let board=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30528,first:0});
 for(let n=0;n<8&&board.phase!=='main';n++)
  board=dispatchUniversalAction(labPacks,board,{type:'next'});
 const labHost=put(board,0,'HOST','front',0);
 const labNamed=put(board,0,'NAMED','front',1);
 const need=take(board,0,'NEED');
 board.players[0].hand.push(need);
 const labRaids=()=>legalUniversalActions(labPacks,board).filter(a=>a.type==='raid'&&a.uid===need.uid);
 assert.equal(labRaids().some(a=>a.baseUid===labHost.uid),true);
 assert.equal(labRaids().some(a=>a.baseUid===labNamed.uid),false);
 const gate=put(board,0,'GATE','front',2);
 assert.equal(labRaids().some(a=>a.baseUid===labNamed.uid&&a.slot===1),true);
 assert.equal(labRaids().some(a=>a.baseUid===labHost.uid),true);
 grantContinuousState(board,{kind:'originalEffectsDisabled',controller:1,sourceUid:gate.uid,
  targetUid:labHost.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(labRaids().some(a=>a.baseUid===labHost.uid),false);
 assert.equal(labRaids().some(a=>a.baseUid===labNamed.uid),true);
 board.continuousStates=[];
 const deckBefore=board.players[0].deck.length;
 let waived=dispatchUniversalAction(labPacks,board,{type:'raid',uid:need.uid,baseUid:labHost.uid,slot:0});
 assert.equal(waived.players[0].front[0].cardId,'NEED');
 assert.equal(waived.players[0].front[0].stack[0].uid,labHost.uid);
 assert.equal(waived.players[0].deck.length,deckBefore-1);
 aiOk(first.packs,stacked);
 assert.equal(assertUniversalMatch(first.packs,stacked),true);
 assert.equal(assertUniversalMatch(lined.packs,moved),true);
 assert.equal(assertUniversalMatch(labPacks,waived),true);
});
