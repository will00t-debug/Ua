// Sentences added while staging the next EVA prints. The probes use ordinary
// card fields so the same rules apply outside this title.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalCardEnergy,universalImpact,universalAttackDamage}
 from '../dist/universal-v2/engine.mjs';

const MISATO='葛\u{E0100}城 ミサト';
function face(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'red',type:extra.type||'character',
  energy:extra.energy??0,ap:extra.ap??1,bp:extra.bp??2000,gen:extra.gen??1,
  traits:extra.traits||[],trigger:extra.trigger===undefined?null:extra.trigger,
  implementation:extra.implementation||'dsl',effects:extra.effects||{},...extra
 };
}
const probes=[
 face({id:'ACT',type:'event',bp:0,effects:{onPlay:[{op:'activeOwnThenFollow',ifName:'綾波 レイ',thenAp:1,
  drawIf:{name:'碇 シンジ',colorExcept:'yellow'}}]}}),
 face({id:'ORDEP',effects:{onPlay:[{op:'deployOrFilterRest',color:'purple',maxEnergy:2,optional:true,
  names:['アヤナミレイ（仮称）','渚 カヲル'],orType:'field',zones:['hand','outside'],outsideDiscard:true}]}}),
 face({id:'STRIP',effects:{onPlay:[{op:'draw',count:1},{op:'stripAllUnder',optional:true}]}}),
 face({id:'REENTER',ownTurnBp:500,effects:{
  onPlay:[{op:'drawDiscard',count:2,discardCount:2}],
  onRetire:[{op:'optionalDiscardReenterRest'}]}}),
 face({id:'GRANT',mainAbility:{op:'restRetireThen',then:[{
  op:'grantImpactOrDamage',optional:true,color:'purple',minEnergy:5,impact:1,damage:2}]}}),
 face({id:'MUST',raidName:MISATO,effects:{
  onPlay:[{op:'grantSelfMustBlockThisTurn'}],
  onRetire:[{op:'searchTopUpToTwoBottom',count:5,max:2,rest:'bottom',logic:'all',filters:[
   {field:'printedRequiredEnergyAtLeast',value:5}]}]}}),
 face({id:'CAPPED',effects:{onAttack:[{op:'discardGate',optional:true,then:[{
  op:'deployOutsideNameRest',name:'碇 シンジ',color:'purple',maxEnergy:3,ap:1,
  includeRaid:true,optional:true}]}]}}),
 face({id:'NAMES',type:'event',bp:0,trigger:'special',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,bonusNames:['碇 シンジ','エヴァンゲリオン初号機（ガイウスの槍）']},
  {op:'drawDiscard',count:1}]}}),
 face({id:'PLUS',impactNull:true,mainAbility:{op:'distinctNameEnergyPlus',oncePerTurn:true,
  name:'綾波 レイ',color:'red',minKinds:2,amount:1}}),
 face({id:'OUTSIDE',outsideActivate:{hand:2,ap:1,ready:false},effects:{onPlay:[
  {op:'maySwapOwnFrontEnergy',optional:true,withSelf:true}]}}),
 face({id:'DRAW4',raidName:'真希波・マリ・イラストリアス',effects:{
  onPlay:[{op:'drawIfOwnTriggerlessAtLeast',min:4,count:1}],
  onRetire:[{op:'restOppFrontOne',optional:true}]}}),
 face({id:'SCALE',trigger:'raid',raidName:'式波・アスカ・ラングレー',effects:{onPlay:[
  {op:'deployHandRestScaled',color:'red',type:'character',noTrigger:true,baseEnergy:0,
   perTriggerless:1,optional:true},
  {op:'drawDiscard',count:2,discardCount:1,when:{
   kind:'ownTriggerlessAtLeast',turn:'any',min:4,zone:'field'}}]}}),
 face({id:'LEAVE',name:'式波・アスカ・ラングレー',lifeLeave:{
  turn:'opponent',noTrigger:true,once:'name',mayBp:2000}}),
 face({id:'LEAVE2',name:'真希波・マリ・イラストリアス',lifeLeave:{
  turn:'opponent',noTrigger:true,once:'name',minTriggerless:4,restSelf:true,recoverLeft:true}}),
 face({id:'SNIPER',type:'event',bp:0,effects:{onPlay:[{op:'activeUnraidedRaidGrant',bp:1000,sniper:true}]}}),
 face({id:'SUM',raidName:'碇 シンジ',printedImpact:1,effects:{onAttack:[{
  op:'restEnergySumGrant',thresholds:[{min:4,bp:3000},{min:8,damage:2}]}]}}),
 face({id:'BLOCK',raidName:'綾波 レイ',readyOnBlockCount:1,effects:{onRetire:[
  {op:'draw',count:2},{op:'discardGate',optional:true,then:[{
   op:'deployOutsideNameRest',name:'綾波 レイ',color:'red',maxEnergy:1,includeRaid:true,optional:true}]}]}}),
 face({id:'BUFF',type:'event',bp:0,effects:{onPlay:[
  {op:'buffNameOrIncludesUntilNext',optional:true,name:'碇 シンジ',includes:'初号機',bp:3000},
  {op:'optionalRestNamedActiveDraw',name:'綾波 レイ'}]}}),
 face({id:'TUCK',energy:2,emptyOwnFieldHandEnergyDiscount:2,mainAbility:{
  op:'restTuckUnderName',name:'エヴァンゲリオン第13号機',
  then:[{op:'drawDiscard',count:2,discardCount:1}]}}),
 face({id:'RAIDED',name:'基地',effects:{onRaided:[{op:'chooseOne',optional:false,options:[
  {id:'draw',label:'カードを1枚引く',turn:'any',then:[{op:'draw',count:1}]},
  {id:'down',label:'相手の前排BP-1000',turn:'any',then:[{op:'enemyBpDown',bp:1000,optional:true}]}
 ]}]}}),
 face({id:'RET',type:'event',bp:0,effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:5000}]}}),
 face({id:'DAMAGE',type:'event',bp:0,effects:{onPlay:[{op:'damagePlayer',amount:1}]}}),
 face({id:'REI',name:'綾波 レイ',implementation:'vanilla'}),
 face({id:'REI1',name:'綾波 レイ',energy:1,implementation:'vanilla'}),
 face({id:'REI2',name:'綾波 レイ',energy:2,implementation:'vanilla'}),
 face({id:'SHINJI',name:'碇 シンジ',color:'purple',implementation:'vanilla'}),
 face({id:'SHINJIY',name:'碇 シンジ',color:'yellow',implementation:'vanilla'}),
 face({id:'BIG',name:'碇 シンジ',color:'purple',energy:5,implementation:'vanilla'}),
 face({id:'SMALL',name:'碇 シンジ',color:'purple',energy:4,ap:2,implementation:'vanilla'}),
 face({id:'MISATO',name:MISATO,implementation:'vanilla'}),
 face({id:'WRONG',name:'葛城 ミサト',implementation:'vanilla'}),
 face({id:'HOST',name:'エヴァンゲリオン第13号機',implementation:'vanilla'}),
 face({id:'UNIT',name:'エヴァンゲリオン初号機',implementation:'vanilla'}),
 face({id:'FIELD',type:'field',bp:0,color:'purple',energy:1,implementation:'vanilla'}),
 face({id:'LOW',energy:2,implementation:'vanilla'}),
 face({id:'HIGH',energy:5,implementation:'vanilla'}),
 face({id:'E2A',energy:2,implementation:'vanilla'}),
 face({id:'E2B',energy:2,implementation:'vanilla'}),
 face({id:'E4',energy:4,implementation:'vanilla'}),
 face({id:'OPEN',raidName:'開放',implementation:'vanilla'}),
 face({id:'STACKED',raidName:'閉鎖',implementation:'vanilla'}),
 face({id:'RAIDER',name:'襲来',raidName:'基地',energy:0,implementation:'vanilla'}),
 face({id:'LIFE',implementation:'vanilla'}),
 face({id:'OTHER',bp:4000,implementation:'vanilla'}),
 face({id:'PAY',implementation:'vanilla'}),
 ...Array.from({length:4},(_,i)=>face({id:'FILL-'+i,implementation:'vanilla',bp:1000}))
];
const pack=createUniversalPack({id:'probe',version:'eva-batch',cards:probes});
function counts(){
 const spec={};
 for(const card of probes)spec[card.id]=card.id==='LEAVE'?2:1;
 const fill=50-Object.values(spec).reduce((n,v)=>n+v,0);
 spec['FILL-0']+=fill;
 assert.equal(Object.values(spec).reduce((n,v)=>n+v,0),50);
 return spec;
}
const decks=[counts(),counts()];
function pull(s,id,player=0){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function main(seed){
 let s=newUniversalMatch(pack,{decks,first:0,seed});
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 for(const ap of s.players[1].apCards){ap.inPlay=true;ap.ready=true;}
 return s;
}
function seat(s,id,line,slot,player=0){
 const card=pull(s,id,player);
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[player][line][slot]=card;
 return card;
}
function play(s,id,line='front',slot=0){
 const card=pull(s,id);
 s.players[0].hand.push(card);
 return dispatchUniversalAction(pack,s,{type:'play',uid:card.uid,line,slot});
}
function cast(s,id){
 const card=pull(s,id);
 s.players[0].hand.push(card);
 return dispatchUniversalAction(pack,s,{type:'event',uid:card.uid});
}
function act(s,pred){
 const found=legalUniversalActions(pack,s).find(pred);
 assert.ok(found,s.pending?.kind||s.phase);
 return dispatchUniversalAction(pack,s,found);
}
function live(s,uid){
 for(const p of s.players)for(const line of ['front','energy']){
  const found=p[line].find(c=>c?.uid===uid);
  if(found)return found;
 }
 throw Error('Missing live '+uid);
}
function bp(s,uid){
 for(const viewer of [0,1]){
  const board=universalPublicView(pack,s,viewer).players[viewer];
  const row=[...board.front,...board.energy].find(c=>c?.uid===uid);
  if(row)return row.bp;
 }
 throw Error('Missing BP '+uid);
}

test('activating a named character may ready an AP, then a different color draws',()=>{
 let s=main(1);
 const rei=seat(s,'REI','front',0);
 seat(s,'SHINJI','energy',0);
 s.players[0].apCards[0].ready=false;
 const before=s.players[0].hand.length;
 s=cast(s,'ACT');
 assert.equal(s.pending.kind,'effect-active-character');
 s=dispatchUniversalAction(pack,s,{type:'chooseActiveCharacter',uid:rei.uid});
 assert.equal(live(s,rei.uid).ready,true);
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=dispatchUniversalAction(pack,s,{type:'chooseApRecovery',uid:s.players[0].apCards[0].uid});
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].hand.length>=before,true);
});

test('a hand or outside filter deploys at REST and outside entry discards one card',()=>{
 let s=main(2);
 const field=pull(s,'FIELD');
 s.players[0].outside.push(field);
 const pay=pull(s,'PAY');
 s.players[0].hand.push(pay);
 s=play(s,'ORDEP','front',0);
 s=act(s,a=>a.type==='chooseOrDeploy'&&a.uid===field.uid&&a.line==='energy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===field.uid&&c.ready===false),true);
 assert.equal(s.pending.kind,'effect-discard-one');
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscardOne',uid:pay.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
});

test('one chosen card sends its face-up, face-down, and raid base cards outside',()=>{
 let s=main(3);
 const host=seat(s,'HOST','front',0);
 const base=pull(s,'PAY');
 const hidden=pull(s,'LIFE');
 hidden.faceDown=true;
 host.stack=[base];
 host.under=[hidden];
 s=play(s,'STRIP','energy',0);
 assert.equal(s.pending.kind,'effect-strip-under');
 assert.equal(s.pending.choices.includes(host.uid),true);
 s=dispatchUniversalAction(pack,s,{type:'chooseStripUnder',uid:host.uid});
 assert.deepEqual(live(s,host.uid).stack,[]);
 assert.deepEqual(live(s,host.uid).under,[]);
 assert.equal(s.players[0].outside.some(c=>c.uid===base.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===hidden.uid&&c.faceDown!==true),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===host.uid),true);
});

test('discarding one card reenters the retired card at REST and runs its on-play',()=>{
 let s=main(4);
 const body=seat(s,'REENTER','front',0,1);
 const buried=pull(s,'PAY',1);
 body.stack=[buried];
 const pay=pull(s,'LIFE',1);
 s.players[1].hand.push(pay);
 assert.equal(bp(s,body.uid),2000);
 s=cast(s,'RET');
 s=dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:body.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===buried.uid),true);
 assert.equal(s.pending.kind,'effect-discard-reenter');
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscardReenter',uid:pay.uid});
 s=act(s,a=>a.type==='chooseReenterRest'&&a.line==='energy');
 const back=s.players[1].energy.find(c=>c?.uid===body.uid);
 assert.equal(back.ready,false);
 assert.deepEqual(back.stack,[]);
 assert.equal(s.pending.kind,'effect-discard');
});

test('resting and retiring may grant impact or damage to a high-energy character',()=>{
 let s=main(5);
 const big=seat(s,'BIG','front',0);
 const small=seat(s,'LOW','front',1);
 const source=seat(s,'GRANT','energy',0);
 s=dispatchUniversalAction(pack,s,{type:'activate',uid:source.uid,mode:'restRetireThen'});
 assert.equal(s.players[0].outside.some(c=>c.uid===source.uid),true);
 assert.equal(s.pending.kind,'effect-grant-keyword');
 assert.equal(s.pending.choices.includes(big.uid),true);
 assert.equal(s.pending.choices.includes(small.uid),false);
 s=dispatchUniversalAction(pack,s,{type:'chooseGrantKeyword',uid:big.uid,mode:'damage'});
 assert.equal(universalAttackDamage(pack,s,live(s,big.uid)),2);
 assert.equal(universalImpact(pack,s,live(s,big.uid)),0);
});

test('a raid uses the printed name that includes the variation selector',()=>{
 let s=main(6);
 const right=seat(s,'MISATO','front',0);
 seat(s,'WRONG','energy',0);
 const raider=pull(s,'MUST');
 s.players[0].hand.push(raider);
 const raids=legalUniversalActions(pack,s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===right.uid),true);
 assert.equal(raids.some(a=>a.baseUid===s.players[0].energy[0].uid),false);
 s=dispatchUniversalAction(pack,s,raids.find(a=>a.baseUid===right.uid));
 const top=s.players[0].front.find(c=>c?.cardId==='MUST');
 assert.equal(top.mustBlockGranted.turn,s.turn);
});

test('two outside copies with different energies add one energy until the next own turn',()=>{
 let s=main(7);
 const host=seat(s,'PLUS','energy',0);
 s.players[0].outside.push(pull(s,'REI1'),pull(s,'REI2'));
 const before=universalCardEnergy(pack,s,0,host);
 s=dispatchUniversalAction(pack,s,{type:'activate',uid:host.uid,mode:'distinctEnergy'});
 assert.equal(universalCardEnergy(pack,s,0,host),before+1);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.mode==='distinctEnergy'),false);
});

test('outside activation pays two hand cards and one AP, then may swap with the other line',()=>{
 let s=main(8);
 const body=pull(s,'OUTSIDE');
 s.players[0].outside.push(body);
 const a=pull(s,'PAY'),b=pull(s,'LIFE');
 s.players[0].hand.push(a,b);
 const other=seat(s,'REI','front',0);
 assert.equal(legalUniversalActions(pack,s).some(x=>x.type==='outsideActivate'&&x.uid===body.uid),true);
 s=dispatchUniversalAction(pack,s,{type:'outsideActivate',uid:body.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseOutsidePay',mode:'hand',uid:a.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseOutsidePay',mode:'hand',uid:b.uid});
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,
  s.players[0].apCards.length-1);
 s=act(s,x=>x.type==='chooseOutsideEntry'&&x.line==='energy');
 assert.equal(s.pending.kind,'effect-swap-lines');
 s=dispatchUniversalAction(pack,s,{type:'chooseSwapLines',uid:other.uid});
 assert.equal(s.players[0].front[0].uid,body.uid);
 assert.equal(s.players[0].energy[0].uid,other.uid);
});

test('four triggerless cards draw one, and the hand cap grows by one per triggerless card',()=>{
 let s=main(9);
 seat(s,'REI','front',0);
 seat(s,'HOST','front',1);
 seat(s,'UNIT','energy',0);
 s=play(s,'DRAW4','energy',1);
 assert.equal(s.players[0].hand.length>0,true);
 const before=s.players[0].hand.length;
 const low=pull(s,'LOW'),high=pull(s,'HIGH');
 s.players[0].hand.push(low,high);
 s=play(s,'SCALE','front',2);
 const legal=legalUniversalActions(pack,s).filter(a=>a.type==='chooseHandScaled'&&a.uid);
 assert.equal(legal.some(a=>a.uid===low.uid),true);
 assert.equal(legal.some(a=>a.uid===high.uid),false);
 s=dispatchUniversalAction(pack,s,legal.find(a=>a.uid===low.uid));
 assert.equal(s.players[0].energy.some(c=>c?.uid===low.uid&&c.ready===false)||
  s.players[0].front.some(c=>c?.uid===low.uid&&c.ready===false),true);
 assert.equal(s.pending.kind,'effect-discard');
 const junk=s.players[0].hand.find(c=>c.uid!==high.uid);
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscard',uid:junk.uid});
 assert.equal(s.players[0].hand.length,before+1);
});

test('a triggerless life card leaving on the opponent turn buffs one copy of the name',()=>{
 let s=main(10);
 const first=seat(s,'LEAVE','front',0);
 const second=seat(s,'LEAVE','front',1);
 const left=pull(s,'LIFE');
 s.players[0].life.unshift(left);
 s.active=1;
 s.phase='main';
 const hit=pull(s,'DAMAGE',1);
 s.players[1].hand.push(hit);
 s=dispatchUniversalAction(pack,s,{type:'event',uid:hit.uid});
 assert.equal(s.pending?.kind,'effect-life-leave');
 assert.equal([first.uid,second.uid].includes(s.pending.sourceUid),true);
 const chosen=s.pending.sourceUid;
 s=dispatchUniversalAction(pack,s,{type:'chooseLifeLeave',mode:'take'});
 assert.equal(bp(s,chosen),4000);
 assert.equal(bp(s,chosen===first.uid?second.uid:first.uid),2000);
 assert.equal(s.pending,null);
});

test('the same life leave can rest an active character and take that exact card',()=>{
 let s=main(11);
 const body=seat(s,'LEAVE2','front',0);
 seat(s,'REI','front',1);
 seat(s,'HOST','energy',0);
 seat(s,'UNIT','energy',1);
 const left=pull(s,'LIFE');
 s.players[0].life.unshift(left);
 s.active=1;s.phase='main';
 const hit=pull(s,'DAMAGE',1);
 s.players[1].hand.push(hit);
 s=dispatchUniversalAction(pack,s,{type:'event',uid:hit.uid});
 assert.equal(s.pending.kind,'effect-life-leave');
 s=dispatchUniversalAction(pack,s,{type:'chooseLifeLeave',mode:'take'});
 assert.equal(live(s,body.uid).ready,false);
 assert.equal(s.players[0].hand.some(c=>c.uid===left.uid),true);
});

test('an unraided raid character is activated and gains BP and sniper',()=>{
 let s=main(12);
 const open=seat(s,'OPEN','front',0);
 const closed=seat(s,'STACKED','front',1);
 closed.stack=[pull(s,'PAY')];
 s=cast(s,'SNIPER');
 assert.equal(s.pending.choices.includes(open.uid),true);
 assert.equal(s.pending.choices.includes(closed.uid),false);
 s=dispatchUniversalAction(pack,s,{type:'chooseActiveCharacter',uid:open.uid});
 const granted=live(s,open.uid);
 assert.equal(granted.ready,true);
 assert.equal(bp(s,open.uid),3000);
 assert.equal(granted.sniperGranted.turn,s.turn);
});

test('resting energy cards grants BP at four energy and damage at eight',()=>{
 let s=main(13);
 const striker=seat(s,'SUM','front',0);
 const a=seat(s,'E2A','energy',0),b=seat(s,'E2B','energy',1),c=seat(s,'E4','energy',2);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=act(s,x=>x.type==='attack'&&x.uid===striker.uid);
 assert.equal(s.pending.kind,'effect-rest-energy-sum');
 s=dispatchUniversalAction(pack,s,{type:'chooseRestEnergy',mode:'add',uid:a.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseRestEnergy',mode:'add',uid:b.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseRestEnergy',mode:'add',uid:c.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseRestEnergy',mode:'done'});
 assert.equal(live(s,a.uid).ready,false);
 assert.equal(bp(s,striker.uid),5000);
 assert.equal(universalAttackDamage(pack,s,live(s,striker.uid)),2);
 assert.equal(universalImpact(pack,s,live(s,striker.uid)),1);
});

test('a name or a printed fragment lasts until the next own turn, then a named rest draws',()=>{
 let s=main(14);
 const unit=seat(s,'UNIT','front',0);
 const rei=seat(s,'REI','energy',0);
 const event=pull(s,'BUFF');
 s.players[0].hand.push(event);
 const before=s.players[0].hand.length;
 s=dispatchUniversalAction(pack,s,{type:'event',uid:event.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseBuffUntil',uid:unit.uid});
 assert.equal(live(s,unit.uid).buffs[0].untilOwnTurnStart,s.players[0].ownTurns+1);
 assert.equal(bp(s,unit.uid),5000);
 s=dispatchUniversalAction(pack,s,{type:'chooseRestNamed',uid:rei.uid});
 assert.equal(live(s,rei.uid).ready,false);
 assert.equal(s.players[0].hand.length,before);
});

test('resting tucks this card facedown under the named host and then draws',()=>{
 let s=main(15);
 const host=seat(s,'HOST','front',0);
 const body=seat(s,'TUCK','energy',0);
 const before=s.players[0].hand.length;
 s=dispatchUniversalAction(pack,s,{type:'activate',uid:body.uid,mode:'restTuck'});
 assert.equal(s.players[0].energy[0],null);
 assert.equal(live(s,host.uid).under.some(c=>c.uid===body.uid&&c.faceDown===true),true);
 assert.equal(s.players[0].hand.length,before+2);
 assert.equal(s.pending.kind,'effect-discard');
});

test('either printed name raises one retirement cap from 3000 to 5000',()=>{
 let plain=main(20);
 const low=seat(plain,'LIFE','front',0,1);
 const high=seat(plain,'OTHER','front',1,1);
 plain=cast(plain,'NAMES');
 assert.equal(plain.pending.kind,'effect-retire-bp');
 assert.equal(plain.pending.choices.includes(low.uid),true);
 assert.equal(plain.pending.choices.includes(high.uid),false);
 let named=main(21);
 seat(named,'SHINJI','energy',0);
 const tall=seat(named,'OTHER','front',0,1);
 named=cast(named,'NAMES');
 assert.equal(named.pending.choices.includes(tall.uid),true);
});

test('a discarded card brings back only the printed energy and AP',()=>{
 let s=main(22);
 const striker=seat(s,'CAPPED','front',0);
 const ok=pull(s,'SHINJI'),hi=pull(s,'BIG'),wrong=pull(s,'SHINJIY');
 s.players[0].outside.push(ok,hi,wrong);
 const pay=pull(s,'PAY');
 s.players[0].hand.push(pay);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 s=act(s,a=>a.type==='attack'&&a.uid===striker.uid);
 assert.equal(s.pending.kind,'effect-discard-gate');
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscardGate',uid:pay.uid});
 const legal=legalUniversalActions(pack,s).filter(a=>a.type==='chooseOutsideNameRest'&&a.uid);
 assert.equal(legal.some(a=>a.uid===ok.uid&&a.line==='energy'),true);
 assert.equal(legal.some(a=>a.uid===hi.uid),false);
 assert.equal(legal.some(a=>a.uid===wrong.uid),false);
 s=act(s,a=>a.type==='chooseOutsideNameRest'&&a.uid===ok.uid&&a.line==='energy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===ok.uid&&c.ready===false),true);
});

test('being raided offers the printed choice, including a draw',()=>{
 let s=main(16);
 const base=seat(s,'RAIDED','front',0);
 const raider=pull(s,'RAIDER');
 s.players[0].hand.push(raider);
 const before=s.players[0].hand.length;
 s=act(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 if(s.pending?.kind==='raid-effect-order')
  s=dispatchUniversalAction(pack,s,{type:'chooseRaidOrder',mode:'baseFirst'});
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=dispatchUniversalAction(pack,s,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(s.players[0].hand.length,before);
});
