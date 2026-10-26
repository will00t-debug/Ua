import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {parseNamedFieldRetireBonus} from '../dist/universal-v2/ability-templates.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// Official cardlist sentences, checked against the pinned catalogue.
// UA15BT/SAO-1-030, UA15BT/SAO-1-065, EX08BT/SAO-2-059, UA54BT/MST-1-078:
//   retire one opposing front at BP 3000, or 5000 while the named character
//   is on the own field. SPECIAL life stays the uncapped front retire.
// EX08BT/SAO-2-029: top 5, up to one 歌, rest to bottom, discard only after a take.
// UA15BT/SAO-1-067: up to one own front BP+2000, then draw 1.
// UA15BT/SAO-1-076: up to one hand character, energy at most 2, AP 1, trait ALO, no color.
// UA15BT/SAO-1-083: up to one own outside card that is both green and ALO.
// EX08BT/SAO-2-037: on retire, mill up to 2. ACTIVE life is the generic trigger.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const RETIRE=[
 {id:'SAO-1-030',name:'アリス',fuel:'SAO-1-020',named:'SAO-1-010',color:'yellow'},
 {id:'SAO-1-065',name:'キリト',fuel:'SAO-1-057',named:'SAO-1-001',color:'blue'},
 {id:'SAO-2-059',name:'アスナ',fuel:'SAO-2-051',named:'SAO-1-070',color:'purple'},
 {id:'MST-1-078',name:'シルフィエット',fuel:'MST-1-052',named:'MST-1-013',color:'green'}
];

function deckOf(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.maxCopies!==1&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.filter(id=>!required.includes(id))].slice(0,13);
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const card=take(s,p,id);
 card.ready=false;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toMain(packs,s){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function readyAp(s,p,n){
 for(let i=0;i<3;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c&&c.uid===uid);
}
function keepHand(s,p,cards){
 const keep=new Set(cards.map(c=>c.uid));
 const extras=s.players[p].hand.filter(c=>!keep.has(c.uid));
 s.players[p].hand=s.players[p].hand.filter(c=>keep.has(c.uid));
 s.players[p].deck.push(...extras);
}

test('C26 registers nine whole prints and reads the bonus name from the sentence',()=>{
 assert.equal(EXPECTED_V2_TOTAL,479);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 assert.equal(EXPECTED_V2_COUNTS['mushoku-tensei'],60);
 assert.equal(parseNamedFieldRetireBonus(
  'BP3000以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場か自分のキャラのレイド元に〈シモン〉か〈カミナ〉がある場合、BP5000以下に代わる。'),
  null);
 for(const row of RETIRE){
  const title=row.id.startsWith('SAO')?'sword-art-online':'mushoku-tensei';
  const pack=title==='sword-art-online'?sao:mst;
  const card=pack.cards[row.id];
  const source=title==='sword-art-online'
   ?SAO_OFFICIAL_CARDS.find(c=>c.id===row.id)
   :MST_V2_OFFICIAL_BY_ID[row.id];
  assert.equal(EXPECTED_V2_IDS[title].includes(row.id),true);
  assert.match(source.source,/unionarena-tcg\.com\/jp\/cardlist/);
  assert.equal(card.name,source.nameJa);
  assert.equal(card.color,row.color);
  assert.equal(card.energy,4);
  assert.equal(card.ap,1);
  assert.equal(card.trigger,'special');
  assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
  assert.deepEqual(card.effects.onPlay,[{op:'retireOppFrontUnderBp',bp:3000,
   bonusName:row.name,bonusBp:5000}]);
 }
 const yuna=sao.cards['SAO-2-029'];
 assert.deepEqual(yuna.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:5,
  filter:{field:'trait',value:'歌'}}]);
 assert.equal(yuna.trigger,'draw');
 assert.deepEqual(sao.cards['SAO-1-067'].effects.onPlay,[
  {op:'buffOwnField',filter:{field:'type',value:'character'},bp:2000,
   optional:true,excludeSelf:false,zone:'front'},
  {op:'draw',count:1}]);
 assert.equal(sao.cards['SAO-1-067'].trigger,'active');
 assert.deepEqual(sao.cards['SAO-1-076'].effects.onPlay,[{op:'deployOwnHandSpecial',
  type:'character',color:null,ap:1,trait:'ALO',maxEnergy:2,ready:false,max:1,
  protectionScope:null}]);
 assert.deepEqual(sao.cards['SAO-1-083'].effects.onPlay,[{op:'recoverOutsideOne',
  optional:true,logic:'all',filters:[{field:'color',value:'green'},{field:'trait',value:'ALO'}]}]);
 assert.equal(sao.cards['SAO-1-083'].ap,2);
 assert.deepEqual(sao.cards['SAO-2-037'].effects.onRetire,[{op:'millTop',count:2,optional:true}]);
});

test('field-name retire bonus raises only the printed cap and still fizzles above it',()=>{
 for(const row of RETIRE){
  const own=row.id.startsWith('SAO')?sao:mst;
  const packs=[own,sao];
  const ownDeck=deckOf(own,[row.id,row.fuel,row.named]);
  const foeDeck=deckOf(sao,['SAO-2-069','SAO-1-082']);
  let s=newUniversalMatch(packs,{decks:[ownDeck,foeDeck],first:0,seed:26030});
  for(let i=0;i<4;i++)place(s,0,row.fuel,'energy',i);
  const event=hold(s,0,row.id);
  const high=place(s,1,'SAO-2-069','front',0);
  const low=place(s,1,'SAO-1-082','front',1);
  s=toMain(packs,s);
  let played=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
   .find(a=>a.type==='event'&&a.uid===event.uid));
  assert.equal(played.pending.kind,'effect-retire-bp');
  assert.deepEqual(played.pending.choices,[low.uid]);
  aiOk(packs,played);
  const named=place(structuredClone(s),0,row.named,'front',0);
  let raised=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
   .find(a=>a.type==='event'&&a.uid===event.uid));
  // The clone above is only a name check. Replay from the fueled state with the name present.
  s=newUniversalMatch(packs,{decks:[ownDeck,foeDeck],first:0,seed:26030});
  for(let i=0;i<4;i++)place(s,0,row.fuel,'energy',i);
  const event2=hold(s,0,row.id);
  const high2=place(s,1,'SAO-2-069','front',0);
  place(s,0,row.named,'front',0);
  s=toMain(packs,s);
  raised=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
   .find(a=>a.type==='event'&&a.uid===event2.uid));
  assert.ok(raised.pending.choices.includes(high2.uid));
  raised=dispatchUniversalAction(packs,raised,{type:'chooseRetireBp',uid:high2.uid});
  assert.equal(raised.players[1].front[0],null);
  assert.ok(raised.players[0].outside.some(c=>c.uid===event2.uid));
  assert.equal(named.cardId,row.named);
  assert.equal(assertUniversalMatch(packs,raised),true);
  assert.equal(universalPublicView(packs,raised,1).players[0].hand,null);
 }
});

test('SAO-2-029 takes one song card from the top five and discards only after a take',()=>{
 const packs=[sao,mst];
 const counts=deckOf(sao,['SAO-2-029','SAO-2-051','SAO-2-060','SAO-1-020']);
 let s=newUniversalMatch(packs,{decks:[counts,deckOf(mst,['MST-1-052'])],first:0,seed:26029});
 const yuna=hold(s,0,'SAO-2-029');
 place(s,0,'SAO-2-051','energy',0);
 const window=['SAO-1-020','SAO-2-060','SAO-1-020','SAO-1-020','SAO-1-020'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===yuna.uid&&a.line==='front'));
 assert.deepEqual(s.pending.choices,[window[1].uid]);
 const opened=s;
 let declined=dispatchUniversalAction(packs,opened,{type:'chooseTopFiltered',uid:null});
 for(const card of [...window].reverse())
  declined=dispatchUniversalAction(packs,declined,{type:'chooseTopOrder',uid:card.uid});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===window[1].uid),false);
 assert.equal(declined.players[0].outside.some(c=>c.uid===window[1].uid),false);
 assert.equal(assertUniversalMatch(packs,declined),true);
 s=dispatchUniversalAction(packs,opened,{type:'chooseTopFiltered',uid:window[1].uid});
 for(const card of [window[4],window[3],window[2],window[0]])
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:card.uid});
 assert.equal(s.pending.kind,'effect-discard');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:window[1].uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===window[1].uid));
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-067 buffs only a front character and still draws when declined',()=>{
 const packs=[sao,sao];
 const counts=deckOf(sao,['SAO-1-067','SAO-1-057','SAO-1-082','SAO-1-020']);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26067});
 place(s,0,'SAO-1-057','energy',0);
 place(s,0,'SAO-1-057','energy',1);
 const front=place(s,0,'SAO-1-082','front',0);
 const energy=place(s,0,'SAO-1-020','energy',2);
 const event=hold(s,0,'SAO-1-067');
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='event'&&a.uid===event.uid));
 assert.deepEqual(s.pending.choices,[front.uid]);
 assert.equal(s.pending.choices.includes(energy.uid),false);
 const hand=s.players[0].hand.length;
 let skipped=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),2000);
 assert.equal(skipped.players[0].hand.length,hand+1);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:front.uid});
 assert.equal(universalBp(packs,s,live(s,0,front.uid)),4000);
 assert.equal(universalBp(packs,s,live(s,0,energy.uid)),2500);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-076 REST-plays an ALO hand character of any color at energy 2 or less',()=>{
 const packs=[sao,sao];
 const counts=deckOf(sao,['SAO-1-076','SAO-2-063','SAO-1-051','SAO-1-020','SAO-1-057']);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26076});
 place(s,0,'SAO-2-063','energy',0);
 const legal=hold(s,0,'SAO-1-051');
 const wrongTrait=hold(s,0,'SAO-1-020');
 const tooCostly=hold(s,0,'SAO-1-057');
 const source=hold(s,0,'SAO-1-076');
 keepHand(s,0,[source,legal,wrongTrait,tooCostly]);
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 assert.deepEqual(s.pending.choices,[legal.uid]);
 const declined=dispatchUniversalAction(packs,s,{type:'chooseHandRest',uid:null});
 assert.equal(declined.players[0].hand.some(c=>c.uid===legal.uid),true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='chooseHandRest'&&a.uid===legal.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===legal.uid&&c.ready===false)||
  s.players[0].energy.some(c=>c?.uid===legal.uid&&c.ready===false),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-1-083 recovers one outside card only when it is green and ALO',()=>{
 const packs=[sao,sao];
 const counts=deckOf(sao,['SAO-1-083','SAO-2-063','SAO-1-082','SAO-1-051','SAO-1-092']);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26083});
 place(s,0,'SAO-2-063','energy',0);
 readyAp(s,0,2);
 const match=take(s,0,'SAO-1-082');
 const blue=take(s,0,'SAO-1-051');
 const greenOther=take(s,0,'SAO-1-092');
 s.players[0].outside.push(match,blue,greenOther);
 const source=hold(s,0,'SAO-1-083');
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===source.uid));
 assert.deepEqual(s.pending.choices,[match.uid]);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(skipped.players[0].outside.some(c=>c.uid===match.uid),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:match.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===match.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===blue.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===greenOther.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SAO-2-037 mills up to two on retire and a skip stops the rest',()=>{
 const packs=[sao,sao];
 const counts=deckOf(sao,['SAO-2-037','SAO-1-030','SAO-1-020','SAO-1-082']);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26037});
 for(let i=0;i<4;i++)place(s,0,'SAO-1-020','energy',i);
 const event=hold(s,0,'SAO-1-030');
 const klein=place(s,1,'SAO-2-037','front',0);
 place(s,1,'SAO-1-082','front',1);
 const top=[take(s,1,'SAO-1-020'),take(s,1,'SAO-1-082')];
 s.players[1].deck.unshift(...top);
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='event'&&a.uid===event.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:klein.uid});
 assert.equal(s.pending.kind,'effect-optional-mill');
 assert.equal(s.pending.player,1);
 assert.equal(s.pending.remaining,2);
 aiOk(packs,s);
 const stopped=dispatchUniversalAction(packs,s,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(stopped.pending,null);
 assert.equal(stopped.players[1].deck[0].uid,top[0].uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(s.pending.remaining,1);
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===top[0].uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===top[1].uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('C26 second pass registers four more whole prints',()=>{
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-085'),true);
 assert.equal(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-103'),true);
 assert.equal(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-011'),true);
 assert.equal(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-064'),true);
 assert.deepEqual(sao.cards['SAO-1-085'].effects.onAttack,[
  {op:'drawIfSelfBpAtLeast',bp:5000,count:1}]);
 assert.equal(sao.cards['SAO-1-085'].trigger,null);
 assert.deepEqual(sao.cards['SAO-1-103'].effects.onPlay,[
  {op:'moveOtherAcrossOrRemove',optional:true,includeSelf:true}]);
 assert.deepEqual(sao.cards['SAO-1-103'].triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(mst.cards['MST-1-011'].mainAbility,{op:'frontOnceProgram',frontOnly:true,
  oncePerTurn:true,then:[{op:'buffOwnField',filter:{field:'name',value:'エリス'},
   bp:1000,optional:false,excludeSelf:false}]});
 assert.equal(mst.cards['MST-1-064'].enterAlwaysActive,true);
 assert.deepEqual(mst.cards['MST-1-064'].effects.onRetire,[
  {op:'returnRetiredToHand',optional:true}]);
 assert.equal(mst.cards['MST-1-064'].trigger,'active');
 assert.equal(mst.cards['MST-1-064'].triggerEffect,null);
});

test('SAO-1-085 draws on attack only when its current BP is at least 5000',()=>{
 const packs=[sao,sao];
 const counts=deckOf(sao,['SAO-1-085','SAO-2-063','SAO-1-068']);
 let low=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26085});
 const kirito=place(low,0,'SAO-1-085','front',0);
 kirito.ready=true;
 low=toMain(packs,low);
 low=dispatchUniversalAction(packs,low,{type:'next'});
 assert.equal(low.phase,'attack');
 const deck=low.players[0].deck.length,hand=low.players[0].hand.length;
 low=dispatchUniversalAction(packs,low,{type:'attack',uid:kirito.uid});
 assert.equal(low.pending.kind,'block');
 assert.equal(low.players[0].deck.length,deck);
 assert.equal(low.players[0].hand.length,hand);
 let high=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26085});
 const raised=place(high,0,'SAO-1-085','front',0);
 raised.ready=true;
 raised.buffs=[{bp:1000,untilTurn:high.turn}];
 high=toMain(packs,high);
 high=dispatchUniversalAction(packs,high,{type:'next'});
 const before=high.players[0].deck.length;
 high=dispatchUniversalAction(packs,high,{type:'attack',uid:raised.uid});
 assert.equal(high.players[0].deck.length,before-1);
 assert.equal(high.players[0].hand.some(c=>c.cardId==='SAO-1-085'),false);
 assert.equal(assertUniversalMatch(packs,high),true);
});

test('SAO-1-103 moves any own character, including itself, and COLOR bounces BP 3500',()=>{
 const packs=[sao,sao];
 const counts=deckOf(sao,['SAO-1-103','SAO-1-057','SAO-1-001','SAO-2-069']);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26103});
 for(let i=0;i<3;i++)place(s,0,'SAO-1-057','energy',i);
 const foe=place(s,1,'SAO-1-001','front',0);
 const source=hold(s,0,'SAO-1-103');
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-line-move');
 assert.equal(s.pending.choices.includes(source.uid),true);
 assert.equal(s.pending.choices.includes(foe.uid),false);
 const declined=dispatchUniversalAction(packs,s,{type:'chooseLineMove',uid:null});
 assert.equal(declined.players[0].front[0].uid,source.uid);
 const ally=s.players[0].energy[0];
 s=dispatchUniversalAction(packs,s,{type:'chooseLineMove',uid:ally.uid});
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='chooseLineSlot'&&!a.replaceUid));
 assert.equal(s.players[0].front.some(c=>c?.uid===ally.uid),true);
 assert.equal(s.players[0].energy[0],null);
 let selfMove=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26103});
 for(let i=0;i<3;i++)place(selfMove,0,'SAO-1-057','energy',i);
 const self=hold(selfMove,0,'SAO-1-103');
 selfMove=toMain(packs,selfMove);
 selfMove=dispatchUniversalAction(packs,selfMove,legalUniversalActions(packs,selfMove)
  .find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 selfMove=dispatchUniversalAction(packs,selfMove,{type:'chooseLineMove',uid:self.uid});
 selfMove=dispatchUniversalAction(packs,selfMove,{type:'chooseLineSlot',slot:3});
 assert.equal(selfMove.players[0].energy[3].uid,self.uid);
 assert.equal(selfMove.players[0].front[0],null);
 let life=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26104});
 const low=place(life,0,'SAO-1-001','front',0);
 const high=place(life,0,'SAO-2-069','front',1);
 low.ready=true;
 life.players[1].deck.push(...life.players[1].life.splice(0));
 const trigger=take(life,1,'SAO-1-103');
 life.players[1].life.push(trigger);
 life=toMain(packs,life);
 life=dispatchUniversalAction(packs,life,{type:'next'});
 life=dispatchUniversalAction(packs,life,{type:'attack',uid:low.uid});
 life=dispatchUniversalAction(packs,life,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(life.pending.kind,'life-trigger');
 const legal=legalUniversalActions(packs,life);
 assert.equal(legal.some(a=>a.mode==='colorBounce'&&a.uid===low.uid),true);
 assert.equal(legal.some(a=>a.uid===high.uid),false);
 life=dispatchUniversalAction(packs,life,{type:'chooseTrigger',mode:'colorBounce',uid:low.uid},{actor:1});
 assert.equal(life.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('MST-1-011 buffs one own Eris from the front and ignores other names',()=>{
 const packs=[mst,mst];
 const counts=deckOf(mst,['MST-1-011','MST-1-006','MST-1-052']);
 let bare=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26011});
 const alone=place(bare,0,'MST-1-011','front',0);
 for(let i=0;i<4;i++)place(bare,0,'MST-1-052','energy',i);
 bare=toMain(packs,bare);
 assert.equal(legalUniversalActions(packs,bare).some(a=>a.type==='activate'&&a.uid===alone.uid),false);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26011});
 const erisFront=place(s,0,'MST-1-006','front',0);
 const erisEnergy=place(s,0,'MST-1-006','energy',0);
 const erisEnergy2=place(s,0,'MST-1-006','energy',1);
 const ghislaine=hold(s,0,'MST-1-011');
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===ghislaine.uid&&a.line==='front'));
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===ghislaine.uid);
 assert.equal(act.mode,'frontOnce');
 s=dispatchUniversalAction(packs,s,act);
 assert.deepEqual(s.pending.choices.slice().sort(),
  [erisFront.uid,erisEnergy.uid,erisEnergy2.uid].sort());
 assert.equal(s.pending.choices.includes(ghislaine.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:erisFront.uid});
 assert.equal(universalBp(packs,s,live(s,0,erisFront.uid)),3500);
 assert.equal(universalBp(packs,s,live(s,0,erisEnergy.uid)),2500);
 assert.equal(universalBp(packs,s,live(s,0,erisEnergy2.uid)),2500);
 assert.equal(universalBp(packs,s,live(s,0,ghislaine.uid)),4000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===ghislaine.uid&&a.type==='activate'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MST-1-064 enters ACTIVE and may return itself to hand after retirement',()=>{
 const packs=[mst,mst];
 const counts=deckOf(mst,['MST-1-064','MST-1-078','MST-1-013','MST-1-044','MST-1-046','MST-1-060']);
 let entered=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26064});
 for(const [id,slot] of [['MST-1-044',0],['MST-1-046',1],['MST-1-060',2]])
  place(entered,0,id,'energy',slot);
 readyAp(entered,0,2);
 const bard=hold(entered,0,'MST-1-064');
 entered=toMain(packs,entered);
 entered=dispatchUniversalAction(packs,entered,legalUniversalActions(packs,entered)
  .find(a=>a.type==='play'&&a.uid===bard.uid&&a.line==='front'));
 assert.equal(live(entered,0,bard.uid).ready,true);
 assert.equal(entered.pending,null);
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:26064});
 for(let i=0;i<3;i++)place(s,0,['MST-1-044','MST-1-046','MST-1-060'][i],'energy',i);
 place(s,0,'MST-1-013','front',0);
 const event=hold(s,0,'MST-1-078');
 const target=place(s,1,'MST-1-064','front',0);
 s=toMain(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending.choices.includes(target.uid),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:target.uid});
 assert.equal(s.pending.kind,'effect-return-retired');
 assert.equal(s.pending.player,1);
 aiOk(packs,s);
 const kept=dispatchUniversalAction(packs,s,{type:'chooseReturnRetired',mode:'skip'},{actor:1});
 assert.equal(kept.players[1].outside.some(c=>c.uid===target.uid),true);
 assert.equal(kept.players[1].hand.some(c=>c.uid===target.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseReturnRetired',mode:'return'},{actor:1});
 assert.equal(s.players[1].hand.some(c=>c.uid===target.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===target.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
