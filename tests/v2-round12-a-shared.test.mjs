// Round 12 A. The six shared shapes are generic. The MHA cards that need
// them stay pending until their group writes the program.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';

function card(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'green',
  type:extra.type||'character',energy:extra.energy??0,ap:extra.ap??1,
  bp:extra.bp??2000,gen:extra.gen??1,traits:extra.traits||[],
  trigger:extra.trigger??null,implementation:extra.implementation||'dsl',
  effects:extra.effects||{},...extra
 };
}
function shell(cards){
 const bodies=[...cards];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'),name:'填'+n,
   implementation:'vanilla',bp:1000,effects:{}}));
  n++;
 }
 return createUniversalPack({id:'r12',version:'r12',cards:bodies});
}
function reject(body,pattern){
 const fillers=Array.from({length:12},(_,i)=>card({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000,effects:{}
 }));
 assert.throws(()=>createUniversalPack({id:'r12',version:'bad',cards:[card(body),...fillers]}),pattern);
}
function open(cards,{seed=12,phase='main'}={}){
 const pack=shell(cards);
 const deck={};
 let remain=50;
 const order=[...new Set([...cards.map(c=>c.id),...Object.keys(pack.cards)])];
 for(const id of order){
  if(remain<=0)break;
  const n=Math.min(4,remain);
  deck[id]=n;
  remain-=n;
 }
 assert.equal(remain,0);
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed,first:0,openingMulligan:false});
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase '+phase);
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pay(s,pips,ap,p=0){
 const gens=Math.ceil(pips/2);
 for(let i=0;i<gens;i++){
  if(s.players[p].energy[i]?.cardId==='GEN')s.players[p].energy[i].ready=true;
  else seat(s,p,'GEN','energy',i,true);
 }
 s.players[p].apCards.forEach((body,index)=>{
  body.inPlay=index<ap;
  body.ready=index<ap;
 });
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function play(pack,s,id,line='front',slot=0,p=0){
 const body=hold(s,id,p);
 const action=legal(pack,s).find(a=>a.type==='play'&&a.uid===body.uid&&a.line===line&&a.slot===slot);
 assert.ok(action,id+' play '+line+' '+slot);
 return act(pack,s,action);
}
function eventPlay(pack,s,id){
 const body=hold(s,id);
 const action=legal(pack,s).find(a=>a.type==='event'&&a.uid===body.uid);
 assert.ok(action,id+' event');
 return act(pack,s,action);
}
function reach(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('pending '+s.pending.kind+' blocked '+phase);
  s=act(pack,s,{type:'next'});
  if(++guard>24)throw Error('did not reach '+player+' '+phase);
 }
 return s;
}
function stackTop(s,ids,p=0){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
const gen=card({id:'GEN',name:'能源',gen:2,implementation:'vanilla',effects:{}});
const activeEntry={
 op:'deployOwnHandActiveOrRaid',type:'character',color:'green',trait:null,
 maxEnergy:3,ap:1,max:1,optional:true,requireAffordableEnergy:true
};

test('IMC stays 113 and MHA stays 77 ready with 32 pending',()=>{
 const imc=createImcV2Pack();
 const mha=createMhaV2Pack();
 const editor=mhaEditorCards();
 assert.equal(Object.keys(imc.cards).length,113);
 assert.equal(editor.length,109);
 assert.equal(Object.keys(mha.cards).length,78);
 assert.equal(editor.filter(row=>!mha.cards[row.id]).length,31);
 assert.equal(mha.cards['MHA-1-001'].impactNull,true);
 assert.equal(mha.cards['MHA-1-013'].effects.onPlay[0].then[0].line,'front');
 assert.equal(mha.cards['MHA-1-014'].raidName,'荼毘');
 assert.equal(mha.cards['MHA-1-018'].mainAbility.frontOnly,false);
 assert.equal(mha.cards['MHA-1-051'].unblockedAttack.oncePerTurn,true);
 assert.equal(mha.cards['MHA-1-054'].effects.onPlay[0].op,'searchTopOneBottomDiscard');
 assert.equal(mha.cards['MHA-1-070'].printedMains[0].op,'discardHandThenActive');
 assert.equal(mha.cards['MHA-1-006'].mainAbility.op,'payHandMoveOrSwap');
 assert.equal(mha.cards['MHA-1-089'].effects.onPlay[0].op,'ifLiveThen');
 assert.equal(mha.cards['MHA-1-087'].effects.onRetire[0].op,'drawUntilHand');
 assert.equal(mha.cards['MHA-1-093'].oppEffectLeave.excludeNames[0],'緑谷 出久');
});

test('the six shared shapes reject an illegal parameter',()=>{
 reject({id:'BAD-HAND',mainAbility:{op:'payHandMoveOrSwap',oncePerTurn:true,pay:2}},
  /unsupported main action ability/);
 reject({id:'BAD-TUCK',mainAbility:{op:'onceTuckFacedown',oncePerTurn:true,from:'hand',host:'self',count:1}},
  /unsupported main action ability/);
 reject({id:'BAD-LOSS',battleLoseToHand:'both'},/invalid battle-loss hand replacement/);
 reject({id:'BAD-LEAVE',oppEffectLeave:{turn:'any',oncePerTurn:true,instead:'stay',
  cause:'effect',subject:'self',line:'front'}},/invalid opponent-effect leave replacement/);
 reject({id:'BAD-CEIL',effects:{onPlay:[{op:'ifLiveThen',when:{kind:'ownHandCountAtMost',turn:'any',max:11},
  then:[{op:'draw',count:1}]}]}},/invalid hand ceiling|invalid live-condition/);
 reject({id:'BAD-UNTIL',effects:{onRetire:[{op:'drawUntilHand',count:0}]}},/invalid draw-until-hand/);
 reject({id:'BAD-UNDER',effects:{onPlay:[{op:'tuckFacedownUnder',from:'deckTop',host:{names:['宿主']},
  count:1,optional:false}]}},/invalid facedown tuck/);
 reject({id:'BAD-STRIP',effects:{onAttack:[{op:'stripFacedownToOutside',optional:true,max:2,
  host:'self',to:'outside'}]}},/invalid facedown strip/);
 reject({id:'BAD-ENTRY',effects:{onPlay:[{...activeEntry,requireAffordableEnergy:false}]}},
  /invalid active or raid hand entry/);
});

test('a hand at or under the ceiling draws, and a later card is not counted early',()=>{
 const actor=card({id:'CEIL',effects:{onPlay:[
  {op:'draw',count:1},
  {op:'ifLiveThen',when:{kind:'ownHandCountAtMost',turn:'any',max:2},then:[{op:'draw',count:1}]}
 ]}});
 const cards=[gen,actor,card({id:'A',implementation:'vanilla',effects:{}}),
  card({id:'B',implementation:'vanilla',effects:{}})];
 const high=open(cards,{seed:1201});
 pay(high.s,0,1);
 hold(high.s,'A');hold(high.s,'B');hold(high.s,'CEIL');
 const deckBefore=high.s.players[0].deck.length;
 let s=play(high.pack,high.s,'CEIL');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.filter(c=>c.cardId==='CEIL').length,0);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 const low=open(cards,{seed:1202});
 pay(low.s,0,1);
 hold(low.s,'CEIL');
 const kept=low.s.players[0].hand.filter(c=>c.cardId!=='CEIL');
 low.s.players[0].deck.push(...kept);
 low.s.players[0].hand=low.s.players[0].hand.filter(c=>c.cardId==='CEIL');
 const lowDeck=low.s.players[0].deck.length;
 s=play(low.pack,low.s,'CEIL');
 assert.equal(s.players[0].hand.length,2);
 assert.equal(s.players[0].deck.length,lowDeck-2);
 const dry=open(cards,{seed:1203});
 pay(dry.s,0,1);
 hold(dry.s,'CEIL');
 const spare=dry.s.players[0].hand.filter(c=>c.cardId!=='CEIL');
 dry.s.players[0].hand=dry.s.players[0].hand.filter(c=>c.cardId==='CEIL');
 dry.s.players[0].life.push(...dry.s.players[0].deck.splice(0),...spare);
 assert.equal(dry.s.players[0].deck.length,0);
 s=play(dry.pack,dry.s,'CEIL');
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].deck.length,0);
});

test('retirement draws until the hand reaches the printed size and then stops',()=>{
 const loser=card({id:'UNTIL',effects:{onRetire:[{op:'drawUntilHand',count:2}]}});
 const foe=card({id:'HIT',effects:{onPlay:[{op:'retireOppFrontOne'}]}});
 const cards=[gen,loser,foe,card({id:'A',implementation:'vanilla',effects:{}}),
  card({id:'B',implementation:'vanilla',effects:{}}),card({id:'C',implementation:'vanilla',effects:{}})];
 function retireInto(seed,handIds,deckIds){
  const opened=open(cards,{seed,phase:'main'});
  pay(opened.s,0,1);
  const victim=seat(opened.s,1,'UNTIL','front',0,true);
  const pl=opened.s.players[1];
  pl.life.push(...pl.hand.splice(0),...pl.deck.splice(0));
  const take=id=>{
   const index=pl.life.findIndex(c=>c.cardId===id);
   if(index<0)throw Error('missing '+id);
   return pl.life.splice(index,1)[0];
  };
  for(const id of deckIds)pl.deck.push(take(id));
  for(const id of handIds)pl.hand.push(take(id));
  let s=play(opened.pack,opened.s,'HIT');
  assert.equal(s.pending.kind,'effect-retire-bp');
  s=act(opened.pack,s,a=>a.type==='chooseRetireBp'&&a.uid===victim.uid);
  return {s,victim};
 }
 const filled=retireInto(1211,[],['A','B']);
 assert.equal(filled.s.players[1].front[0],null);
 assert.equal(filled.s.players[1].hand.length,2);
 const enough=retireInto(1212,['A','B'],['C']);
 assert.equal(enough.s.players[1].hand.length,2);
 assert.equal(enough.s.players[1].deck[0].cardId,'C');
 const short=retireInto(1213,[],['A']);
 assert.equal(short.s.players[1].hand.length,1);
 assert.equal(short.s.players[1].deck.length,0);
});

test('facedown cards go under a character, leave on attack, and keep their order',()=>{
 const tuck=card({id:'TUCK',effects:{onPlay:[{
  op:'tuckFacedownUnder',from:'hand',host:'self',count:1,optional:true,
  then:[{op:'draw',count:1}]
 }]}});
 const named=card({id:'NAMED',name:'宿主',effects:{onPlay:[{
  op:'tuckFacedownUnder',from:'hand',host:{names:['宿主']},count:1,optional:true
 }]}});
 const other=card({id:'OTHER',name:'路人',implementation:'vanilla',effects:{}});
 const pick=card({id:'PICK',name:'蓋牌',implementation:'vanilla',effects:{}});
 const cards=[gen,tuck,named,other,pick];
 const opened=open(cards,{seed:1221});
 pay(opened.s,0,1);
 hold(opened.s,'PICK');
 let s=play(opened.pack,opened.s,'TUCK','front',0);
 assert.equal(s.pending.kind,'effect-tuck-facedown');
 assert.equal(s.pending.step,'card');
 const handUid=s.players[0].hand.find(c=>c.cardId==='PICK').uid;
 const deckAtChoice=s.players[0].deck.length;
 s=act(opened.pack,s,a=>a.type==='chooseTuckFacedown'&&a.uid===handUid);
 const host=s.players[0].front[0];
 assert.equal(host.under.length,1);
 assert.equal(host.under[0].cardId,'PICK');
 assert.equal(host.under[0].faceDown,true);
 assert.equal(s.players[0].deck.length,deckAtChoice-1);
 const order=s.zoneMoveEvents.map(e=>e.from+'>'+e.to);
 const underAt=order.lastIndexOf('hand>raid-under');
 const drawAt=order.lastIndexOf('deck>hand');
 assert.equal(underAt>=0&&drawAt>underAt,true);
 const skipped=open(cards,{seed:1222});
 pay(skipped.s,0,1);
 hold(skipped.s,'PICK');
 const before=skipped.s.players[0].deck.length;
 s=play(skipped.pack,skipped.s,'TUCK','front',0);
 s=act(skipped.pack,s,a=>a.type==='chooseTuckFacedown'&&a.uid===null);
 assert.equal((s.players[0].front[0].under||[]).length,0);
 assert.equal(s.players[0].deck.length,before);
 const gone=open(cards,{seed:1223});
 pay(gone.s,0,1);
 hold(gone.s,'PICK');
 s=play(gone.pack,gone.s,'TUCK','front',0);
 const hostBody=s.players[0].front[0];
 const deckAtGone=s.players[0].deck.length;
 s.players[0].front[0]=null;
 s.players[0].outside.push(hostBody);
 assert.deepEqual(legal(gone.pack,s).filter(a=>a.type==='chooseTuckFacedown'),
  [{type:'chooseTuckFacedown',uid:null}]);
 s=act(gone.pack,s,a=>a.type==='chooseTuckFacedown'&&a.uid===null);
 assert.equal(s.players[0].outside.some(c=>c.uid===hostBody.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.cardId==='PICK'),true);
 assert.equal(s.players[0].deck.length,deckAtGone);
 const hosts=open(cards,{seed:1224});
 pay(hosts.s,0,1);
 const first=seat(hosts.s,0,'NAMED','front',1,true);
 const second=seat(hosts.s,0,'NAMED','energy',1,true);
 seat(hosts.s,0,'OTHER','energy',2,true);
 hold(hosts.s,'PICK');
 s=play(hosts.pack,hosts.s,'NAMED','front',0);
 assert.equal(s.pending.step,'host');
 const choices=legal(hosts.pack,s).filter(a=>a.type==='chooseTuckFacedown'&&a.uid);
 assert.equal(choices.length,3);
 assert.equal(choices.some(a=>a.uid===s.players[0].energy[2].uid),false);
 s=act(hosts.pack,s,a=>a.uid===first.uid);
 const picked=s.players[0].hand.find(c=>c.cardId==='PICK').uid;
 s=act(hosts.pack,s,a=>a.uid===picked);
 assert.equal(s.players[0].front[1].under[0].cardId,'PICK');
 assert.equal((s.players[0].front[0].under||[]).length,0);
 assert.equal(s.players[0].energy[1].uid,second.uid);
 assert.equal((s.players[0].energy[1].under||[]).length,0);
});

test('a deck-top tuck is spent once, and an attack strip moves that card outside first',()=>{
 const body=card({id:'TOP',mainAbility:{op:'onceTuckFacedown',oncePerTurn:true,from:'deckTop',host:'self',count:1},
  effects:{onAttack:[{op:'stripFacedownToOutside',optional:true,max:1,host:'self',to:'outside',
   then:[{op:'retireOppFrontUnderBp',bp:3000,optional:true}]}]}});
 const lid=card({id:'LID',implementation:'vanilla',effects:{}});
 const foe=card({id:'FOE',bp:1000,implementation:'vanilla',effects:{}});
 const cards=[gen,body,lid,foe,card({id:'EXTRA',implementation:'vanilla',effects:{}})];
 const opened=open(cards,{seed:1231});
 pay(opened.s,0,1);
 const mine=seat(opened.s,0,'TOP','front',0,true);
 stackTop(opened.s,['LID','EXTRA']);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='activate'&&a.uid===mine.uid&&a.mode==='onceTuck'),true);
 let s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===mine.uid&&a.mode==='onceTuck');
 assert.equal(s.players[0].front[0].under[0].cardId,'LID');
 assert.equal(s.players[0].front[0].under[0].faceDown,true);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='activate'&&a.mode==='onceTuck'),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,{type:'activate',uid:mine.uid,mode:'onceTuck'}),
  /not currently legal|Deck-top facedown/);
 const empty=open(cards,{seed:1232});
 pay(empty.s,0,1);
 const bare=seat(empty.s,0,'TOP','front',0,true);
 empty.s.players[0].life.push(...empty.s.players[0].deck.splice(0));
 assert.equal(legal(empty.pack,empty.s).some(a=>a.uid===bare.uid&&a.mode==='onceTuck'),false);
 seat(s,1,'FOE','front',0,true);
 s=reach(opened.pack,s,0,'attack');
 s=act(opened.pack,s,{type:'attack',uid:mine.uid});
 assert.equal(s.pending.kind,'effect-strip-facedown');
 const layerCard=s.players[0].front[0].under.splice(0,1)[0];
 s.players[0].outside.push(layerCard);
 assert.equal(legal(opened.pack,s).some(a=>a.type==='chooseStripFacedown'&&a.uid===layerCard.uid),false);
 s=act(opened.pack,s,a=>a.type==='chooseStripFacedown'&&a.uid===null);
 assert.equal(s.pending?.kind==='effect-retire-bp',false);
 assert.equal(s.players[1].front[0].cardId,'FOE');
 const again=open(cards,{seed:1233});
 pay(again.s,0,1);
 const attacker=seat(again.s,0,'TOP','front',0,true);
 stackTop(again.s,['LID']);
 let t=act(again.pack,again.s,a=>a.type==='activate'&&a.uid===attacker.uid);
 const victim=seat(t,1,'FOE','front',0,true);
 t=reach(again.pack,t,0,'attack');
 t=act(again.pack,t,{type:'attack',uid:attacker.uid});
 const buried=t.players[0].front[0].under[0].uid;
 t=act(again.pack,t,a=>a.type==='chooseStripFacedown'&&a.uid===buried);
 assert.equal(t.players[0].outside.some(c=>c.uid===buried),true);
 assert.equal(t.pending.kind,'effect-retire-bp');
 const outsideAt=t.zoneMoveEvents.findIndex(e=>e.uid===buried&&e.to==='outside');
 t=act(again.pack,t,a=>a.uid===victim.uid);
 assert.equal(t.players[1].front[0],null);
 assert.equal(t.zoneMoveEvents.findIndex(e=>e.uid===victim.uid&&e.to==='outside')>outsideAt,true);
 const declined=open(cards,{seed:1234});
 pay(declined.s,0,1);
 const quiet=seat(declined.s,0,'TOP','front',0,true);
 stackTop(declined.s,['LID']);
 let d=act(declined.pack,declined.s,a=>a.uid===quiet.uid&&a.mode==='onceTuck');
 seat(d,1,'FOE','front',0,true);
 d=reach(declined.pack,d,0,'attack');
 d=act(declined.pack,d,{type:'attack',uid:quiet.uid});
 d=act(declined.pack,d,a=>a.type==='chooseStripFacedown'&&a.uid===null);
 assert.equal(d.players[0].front[0].under.length,1);
 assert.equal(d.players[1].front[0].cardId,'FOE');
});

test('own-turn battle loss changes the destination, and the other turn does not',()=>{
 const handLoss=card({id:'HAND',bp:5000,battleLoseToHand:'ownTurn',printedImpact:1});
 const always=card({id:'ALWAYS',bp:5000,battleLoseToHand:true});
 const removed=card({id:'REMOVED',bp:5000,battleRemoveInstead:true});
 const low=card({id:'LOW',bp:1000,effects:{onRetire:[{op:'draw',count:1}]}});
 const sniper=card({id:'SNIP',bp:1000,effects:{onPlay:[{op:'grantSelfSniperThisTurn'}]}});
 const cards=[gen,handLoss,always,removed,low,sniper];
 function attackWin(seed,winnerId){
  const opened=open(cards,{seed,phase:'main'});
  const winner=seat(opened.s,0,winnerId,'front',0,true);
  const loser=seat(opened.s,1,'LOW','front',0,true);
  let s=reach(opened.pack,opened.s,0,'attack');
  const deck=s.players[1].deck.length;
  s=act(opened.pack,s,{type:'attack',uid:winner.uid});
  s=act(opened.pack,s,a=>a.type==='chooseBlock'&&a.uid===loser.uid);
  return {s,loser,deck};
 }
 const own=attackWin(1241,'HAND');
 assert.equal(own.s.players[1].hand.some(c=>c.uid===own.loser.uid),true);
 assert.equal(own.s.players[1].outside.some(c=>c.uid===own.loser.uid),false);
 assert.equal(own.s.players[1].deck.length,own.deck);
 const handAt=own.s.zoneMoveEvents.findIndex(e=>e.uid===own.loser.uid&&e.to==='hand');
 const lifeAt=own.s.zoneMoveEvents.findIndex(e=>e.from==='life'&&e.owner===1);
 assert.equal(handAt>=0&&lifeAt>handAt,true);
 const plain=attackWin(1243,'ALWAYS');
 assert.equal(plain.s.players[1].hand.some(c=>c.uid===plain.loser.uid),true);
 assert.equal(plain.s.players[1].deck.length,plain.deck);
 const away=attackWin(1244,'REMOVED');
 assert.equal(away.s.players[1].removed.some(c=>c.uid===away.loser.uid),true);
 assert.equal(away.s.players[1].outside.some(c=>c.uid===away.loser.uid),false);
 assert.equal(away.s.players[1].deck.length,away.deck);
 const quiet=open(cards,{seed:1246,phase:'main'});
 const winner=seat(quiet.s,0,'HAND','front',0,true);
 const loser=seat(quiet.s,1,'LOW','front',0,true);
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:winner.uid,targetUid:winner.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 let s=reach(quiet.pack,quiet.s,0,'attack');
 const quietDeck=s.players[1].deck.length;
 s=act(quiet.pack,s,{type:'attack',uid:winner.uid});
 s=act(quiet.pack,s,a=>a.type==='chooseBlock'&&a.uid===loser.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===loser.uid),true);
 assert.equal(s.players[1].hand.some(c=>c.uid===loser.uid),false);
 assert.equal(s.players[1].deck.length,quietDeck-1);
 function sniped(seed,defenderId){
  const opened=open(cards,{seed,phase:'main'});
  let state=reach(opened.pack,opened.s,1,'main');
  pay(state,0,1,1);
  state=play(opened.pack,state,'SNIP','front',0,1);
  const attacker=state.players[1].front[0];
  attacker.ready=true;
  const defender=seat(state,0,defenderId,'front',0,true);
  state=reach(opened.pack,state,1,'attack');
  const shot=legal(opened.pack,state).find(a=>a.type==='attack'&&
   a.uid===attacker.uid&&a.targetUid===defender.uid);
  assert.ok(shot,'sniper target');
  state=act(opened.pack,state,shot);
  return {s:state,attacker};
 }
 const other=sniped(1242,'HAND');
 assert.equal(other.s.players[1].outside.some(c=>c.uid===other.attacker.uid),true);
 assert.equal(other.s.players[1].hand.some(c=>c.uid===other.attacker.uid),false);
 const either=sniped(1247,'ALWAYS');
 assert.equal(either.s.players[1].hand.some(c=>c.uid===either.attacker.uid),true);
 assert.equal(either.s.players[1].outside.some(c=>c.uid===either.attacker.uid),false);
 const kept=sniped(1245,'REMOVED');
 assert.equal(kept.s.players[1].outside.some(c=>c.uid===kept.attacker.uid),true);
 assert.equal(kept.s.players[1].removed.some(c=>c.uid===kept.attacker.uid),false);
 const missed=open(cards,{seed:1248,phase:'main'});
 const champ=seat(missed.s,0,'HAND','front',0,true);
 const mark=seat(missed.s,1,'LOW','front',0,true);
 s=reach(missed.pack,missed.s,0,'attack');
 s=act(missed.pack,s,{type:'attack',uid:champ.uid});
 assert.equal(s.pending.kind,'block');
 const body=s.players[1].front[0];
 s.players[1].front[0]=null;
 s.players[1].outside.push(body);
 assert.equal(legal(missed.pack,s).some(a=>a.type==='chooseBlock'&&a.uid===body.uid),false);
 assert.throws(()=>dispatchUniversalAction(missed.pack,s,{type:'chooseBlock',uid:body.uid}),
  /not currently legal/);
});

test('an opponent effect can stay or pay one life, and a failed payment leaves',()=>{
 const stay=card({id:'STAY',oppEffectLeave:{turn:'opponent',oncePerTurn:true,instead:'stay',
  cause:'characterOrEvent',subject:'self',line:'any'},
  effects:{onRetire:[{op:'draw',count:1}]}});
 const life=card({id:'LIFE',name:'守護',oppEffectLeave:{turn:'any',oncePerTurn:true,instead:'life',
  cause:'character',subject:'other',line:'front',excludeNames:['綠谷出久']}});
 const hero=card({id:'HERO',name:'綠谷出久',implementation:'vanilla',effects:{}});
 const ally=card({id:'ALLY',name:'同伴',effects:{onRetire:[{op:'draw',count:1}]}});
 const hit=card({id:'HIT',effects:{onPlay:[{op:'retireOppFrontOne'}]}});
 const event=card({id:'EVT',type:'event',ap:1,energy:0,bp:0,gen:0,
  effects:{onPlay:[{op:'retireOppFrontOne'}]}});
 const own=card({id:'OWN',effects:{onPlay:[{op:'retireOwnCharacterOne',optional:true,
  after:[{op:'draw',count:1}]}]}});
 const cards=[gen,stay,life,hero,ally,hit,event,own];
 const opened=open(cards,{seed:1251});
 pay(opened.s,0,2);
 const body=seat(opened.s,1,'STAY','front',0,true);
 const handBefore=opened.s.players[1].hand.length;
 let s=play(opened.pack,opened.s,'HIT');
 s=act(opened.pack,s,a=>a.uid===body.uid);
 assert.equal(s.players[1].front[0].uid,body.uid);
 assert.equal(s.players[1].hand.length,handBefore);
 assert.equal(s.mainAbilityUsedUids.includes(body.uid+'|oppLeave'),true);
 s=eventPlay(opened.pack,s,'EVT');
 s=act(opened.pack,s,a=>a.uid===body.uid);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].hand.length,handBefore+1);
 const only=open([gen,card({id:'ONLY',oppEffectLeave:{turn:'opponent',oncePerTurn:true,instead:'stay',
  cause:'character',subject:'self',line:'any'}}),event,hit],{seed:1253});
 pay(only.s,0,1);
 const kept=seat(only.s,1,'ONLY','front',0,true);
 s=eventPlay(only.pack,only.s,'EVT');
 s=act(only.pack,s,a=>a.uid===kept.uid);
 assert.equal(s.players[1].front[0],null);
 const paid=open(cards,{seed:1254});
 pay(paid.s,0,1);
 const guard=seat(paid.s,1,'LIFE','front',0,true);
 const friend=seat(paid.s,1,'ALLY','front',1,true);
 const lifeCard=paid.s.players[1].life[0];
 const friendHand=paid.s.players[1].hand.length;
 s=play(paid.pack,paid.s,'HIT');
 s=act(paid.pack,s,a=>a.uid===friend.uid);
 assert.equal(s.pending.kind,'effect-opp-life-leave');
 s=act(paid.pack,s,a=>a.type==='chooseOppLeave'&&a.mode==='life');
 assert.equal(s.players[1].front[1].uid,friend.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===lifeCard.uid),true);
 assert.equal(s.players[1].hand.length,friendHand);
 assert.equal(s.mainAbilityUsedUids.includes(guard.uid+'|oppLeave'),true);
 const declined=open(cards,{seed:1255});
 pay(declined.s,0,1);
 seat(declined.s,1,'LIFE','front',0,true);
 const second=seat(declined.s,1,'ALLY','front',1,true);
 s=play(declined.pack,declined.s,'HIT');
 s=act(declined.pack,s,a=>a.uid===second.uid);
 assert.equal(s.pending.kind,'effect-opp-life-leave');
 const moved=s.players[1].front[1];
 s.players[1].front[1]=null;
 s.players[1].outside.push(moved);
 assert.deepEqual(legal(declined.pack,s).filter(a=>a.type==='chooseOppLeave'),
  [{type:'chooseOppLeave',mode:'decline'}]);
 s=act(declined.pack,s,a=>a.type==='chooseOppLeave'&&a.mode==='decline');
 assert.equal(s.players[1].outside.filter(c=>c.uid===second.uid).length,1);
 assert.equal(s.mainAbilityUsedUids.includes(moved.uid+'|oppLeave'),false);
 const normal=open(cards,{seed:1259});
 pay(normal.s,0,1);
 seat(normal.s,1,'LIFE','front',0,true);
 const leaving=seat(normal.s,1,'ALLY','front',1,true);
 const beforeDraw=normal.s.players[1].deck.length;
 s=play(normal.pack,normal.s,'HIT');
 s=act(normal.pack,s,a=>a.uid===leaving.uid);
 s=act(normal.pack,s,a=>a.mode==='decline');
 assert.equal(s.players[1].front[1],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===leaving.uid),true);
 assert.equal(s.players[1].deck.length,beforeDraw-1);
 const broke=open(cards,{seed:1256});
 pay(broke.s,0,1);
 seat(broke.s,1,'LIFE','front',0,true);
 const bare=seat(broke.s,1,'ALLY','front',1,true);
 broke.s.players[1].deck.push(...broke.s.players[1].life.splice(0));
 s=play(broke.pack,broke.s,'HIT');
 s=act(broke.pack,s,a=>a.uid===bare.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[1],null);
 const named=open(cards,{seed:1257});
 pay(named.s,0,1);
 seat(named.s,1,'LIFE','front',0,true);
 const midoriya=seat(named.s,1,'HERO','front',1,true);
 s=play(named.pack,named.s,'HIT');
 assert.equal(s.pending.kind,'effect-retire-bp');
 s=act(named.pack,s,a=>a.uid===midoriya.uid);
 assert.equal(s.players[1].front[1],null);
 const mine=open(cards,{seed:1258});
 pay(mine.s,0,1);
 const self=seat(mine.s,0,'STAY','front',0,true);
 s=play(mine.pack,mine.s,'OWN','front',1);
 s=act(mine.pack,s,a=>a.uid===self.uid);
 assert.equal(s.players[0].front[0],null);
});

test('paying one hand card moves or swaps, and a missing target keeps the payment',()=>{
 const mover=card({id:'MOVE',mainAbility:{op:'payHandMoveOrSwap',oncePerTurn:true,pay:1}});
 const front=card({id:'FRONT',implementation:'vanilla',effects:{}});
 const energy=card({id:'ENERGY',implementation:'vanilla',effects:{}});
 const payCard=card({id:'PAY',implementation:'vanilla',effects:{}});
 const cards=[gen,mover,front,energy,payCard];
 const opened=open(cards,{seed:1261});
 pay(opened.s,0,1);
 const source=seat(opened.s,0,'MOVE','energy',0,true);
 const frontBody=seat(opened.s,0,'FRONT','front',0,true);
 const energyBody=seat(opened.s,0,'ENERGY','energy',1,true);
 const paid=hold(opened.s,'PAY');
 let s=act(opened.pack,opened.s,a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='payHandMove');
 assert.equal(s.pending.kind,'effect-pay-hand-move');
 s=act(opened.pack,s,a=>a.type==='choosePayHandMove'&&a.uid===paid.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===paid.uid),true);
 assert.equal(s.pending.kind,'effect-move-or-swap');
 s=act(opened.pack,s,a=>a.type==='chooseMoveOrSwap'&&a.mode==='shift');
 s=act(opened.pack,s,a=>a.type==='chooseLineMove'&&a.uid===energyBody.uid);
 s=act(opened.pack,s,a=>a.type==='chooseLineSlot'&&a.slot===1);
 assert.equal(s.players[0].front[1].uid,energyBody.uid);
 const payAt=s.zoneMoveEvents.findIndex(e=>e.uid===paid.uid&&e.to==='outside');
 const moveAt=s.zoneMoveEvents.findIndex(e=>e.uid===energyBody.uid&&e.to==='front');
 assert.equal(payAt>=0&&moveAt>payAt,true);
 assert.equal(legal(opened.pack,s).some(a=>a.uid===source.uid&&a.mode==='payHandMove'),false);
 const swapped=open(cards,{seed:1262});
 pay(swapped.s,0,1);
 const swapSource=seat(swapped.s,0,'MOVE','front',1,true);
 const left=seat(swapped.s,0,'FRONT','front',0,true);
 const right=seat(swapped.s,0,'ENERGY','energy',0,true);
 const cost=hold(swapped.s,'PAY');
 s=act(swapped.pack,swapped.s,a=>a.uid===swapSource.uid&&a.mode==='payHandMove');
 s=act(swapped.pack,s,a=>a.uid===cost.uid);
 s=act(swapped.pack,s,a=>a.mode==='swap');
 s=act(swapped.pack,s,a=>a.type==='chooseSwapLines'&&a.uid===left.uid);
 s=act(swapped.pack,s,a=>a.type==='chooseSwapLines'&&a.uid===right.uid);
 assert.equal(s.players[0].energy[0].uid,left.uid);
 assert.equal(s.players[0].front[0].uid,right.uid);
 const lost=open(cards,{seed:1263});
 pay(lost.s,0,1);
 const lone=seat(lost.s,0,'MOVE','front',0,true);
 const spare=hold(lost.s,'PAY');
 s=act(lost.pack,lost.s,a=>a.uid===lone.uid&&a.mode==='payHandMove');
 s=act(lost.pack,s,a=>a.uid===spare.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 if(s.pending?.kind==='effect-line-move'){
  const body=s.players[0].front[0];
  s.players[0].front[0]=null;
  s.players[0].outside.push(body);
  assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
  assert.throws(()=>dispatchUniversalAction(lost.pack,s,{type:'chooseLineMove',uid:body.uid}),
   /Illegal line-move character|Line move source|not currently legal/);
 }
 const broke=open(cards,{seed:1264});
 pay(broke.s,0,1);
 const quiet=seat(broke.s,0,'MOVE','front',0,true);
 broke.s.players[0].deck.push(...broke.s.players[0].hand.splice(0));
 assert.equal(legal(broke.pack,broke.s).some(a=>a.uid===quiet.uid&&a.mode==='payHandMove'),false);
 assert.throws(()=>dispatchUniversalAction(broke.pack,broke.s,{type:'activate',uid:quiet.uid,mode:'payHandMove'}),
  /not currently legal|Hand payment/);
});

test('filtered hand entry is active or raid, one at a time, and rechecks the card',()=>{
 const door=card({id:'DOOR',effects:{onPlay:[{...activeEntry,max:2}]}});
 const child=card({id:'CHILD',name:'綠童',energy:1,ap:1,color:'green',raidName:'基地',
  effects:{onPlay:[{op:'draw',count:1}]}});
 const base=card({id:'BASE',name:'基地',energy:0,implementation:'vanilla',effects:{}});
 const plain=card({id:'PLAIN',energy:1,ap:1,color:'green',implementation:'vanilla',effects:{}});
 const blue=card({id:'BLUE',energy:1,ap:1,color:'blue',implementation:'vanilla',effects:{}});
 const heavy=card({id:'HEAVY',energy:4,ap:1,color:'green',implementation:'vanilla',effects:{}});
 const wide=card({id:'WIDE',energy:1,ap:2,color:'green',implementation:'vanilla',effects:{}});
 const traited=card({id:'TRAIT',energy:1,ap:1,color:'green',traits:['英雄'],implementation:'vanilla',effects:{}});
 const cards=[gen,door,child,base,plain,blue,heavy,wide,traited];
 const opened=open(cards,{seed:1271});
 pay(opened.s,2,1);
 const baseBody=seat(opened.s,0,'BASE','front',1,true);
 hold(opened.s,'CHILD');hold(opened.s,'PLAIN');hold(opened.s,'BLUE');
 hold(opened.s,'HEAVY');hold(opened.s,'WIDE');
 let s=play(opened.pack,opened.s,'DOOR','front',0);
 assert.equal(s.pending.kind,'effect-hand-active-or-raid');
 const choices=legal(opened.pack,s).filter(a=>a.type==='chooseHandActiveOrRaid'&&a.uid);
 const ids=new Set(choices.map(a=>s.players[0].hand.find(c=>c.uid===a.uid).cardId));
 for(const id of ['CHILD','PLAIN'])assert.equal(ids.has(id),true);
 for(const id of ['BLUE','HEAVY','WIDE'])assert.equal(ids.has(id),false);
 assert.equal(choices.some(a=>a.mode==='raid'&&
  s.players[0].hand.find(c=>c.uid===a.uid).cardId==='CHILD'),true);
 assert.equal(choices.some(a=>a.mode==='raid'&&
  s.players[0].hand.find(c=>c.uid===a.uid).cardId==='PLAIN'),false);
 assert.equal(choices.some(a=>a.mode==='enter'),false);
 const childUid=s.players[0].hand.find(c=>c.cardId==='CHILD').uid;
 const deckBefore=s.players[0].deck.length;
 s=act(opened.pack,s,a=>a.type==='chooseHandActiveOrRaid'&&a.mode==='active'&&
  a.uid===childUid&&a.line==='front'&&a.slot===2);
 const entered=s.players[0].front[2];
 assert.equal(entered.cardId,'CHILD');
 assert.equal(entered.ready,true);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.pending.kind,'effect-hand-active-or-raid');
 assert.equal(legal(opened.pack,s).some(a=>a.uid===childUid),false);
 const entryAt=s.zoneMoveEvents.findIndex(e=>e.uid===childUid&&e.to==='front');
 const drawAt=s.zoneMoveEvents.findIndex(e=>e.to==='hand'&&e.from==='deck'&&e.order>s.zoneMoveEvents[entryAt].order);
 assert.equal(drawAt>entryAt,true);
 s=act(opened.pack,s,a=>a.type==='chooseHandActiveOrRaid'&&a.uid===null);
 assert.equal(s.players[0].front.filter(c=>c?.cardId==='PLAIN').length,0);
 const raided=open(cards,{seed:1272});
 pay(raided.s,2,1);
 const raidBase=seat(raided.s,0,'BASE','energy',1,false);
 hold(raided.s,'CHILD');
 s=play(raided.pack,raided.s,'DOOR');
 const raid=legal(raided.pack,s).find(a=>a.mode==='raid'&&a.baseUid===raidBase.uid);
 assert.ok(raid);
 s=act(raided.pack,s,raid);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='CHILD'&&c.stack[0].cardId==='BASE')||
  s.players[0].energy.some(c=>c?.cardId==='CHILD'&&c.stack?.[0]?.cardId==='BASE'),true);
 const changed=open(cards,{seed:1273});
 pay(changed.s,2,1);
 hold(changed.s,'PLAIN');
 s=play(changed.pack,changed.s,'DOOR');
 const plainUid=s.players[0].hand.find(c=>c.cardId==='PLAIN').uid;
 for(let slot=0;slot<s.players[0].energy.length;slot++){
  const body=s.players[0].energy[slot];
  if(!body)continue;
  s.players[0].energy[slot]=null;
  s.players[0].outside.push(body);
 }
 assert.equal(legal(changed.pack,s).some(a=>a.uid===plainUid),false);
 assert.throws(()=>dispatchUniversalAction(changed.pack,s,{type:'chooseHandActiveOrRaid',mode:'active',
  uid:plainUid,line:'energy',slot:1}),/not currently legal|printed condition changed/);
 const missing=open(cards,{seed:1274});
 pay(missing.s,2,1);
 hold(missing.s,'PLAIN');
 s=play(missing.pack,missing.s,'DOOR');
 const gone=s.players[0].hand.find(c=>c.cardId==='PLAIN');
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==gone.uid);
 s.players[0].outside.push(gone);
 assert.equal(legal(missing.pack,s).some(a=>a.uid===gone.uid),false);
 assert.throws(()=>dispatchUniversalAction(missing.pack,s,{type:'chooseHandActiveOrRaid',mode:'active',
  uid:gone.uid,line:'front',slot:2}),/not currently legal|Hand entry card left the hand/);
 const filtered=open([gen,card({id:'DOOR2',effects:{onPlay:[{...activeEntry,trait:'英雄',excludeNames:['除外']}]}}),
  traited,card({id:'BAN',name:'除外',energy:1,ap:1,color:'green',traits:['英雄'],implementation:'vanilla',effects:{}})],
  {seed:1275});
 pay(filtered.s,2,1);
 hold(filtered.s,'TRAIT');hold(filtered.s,'BAN');
 s=play(filtered.pack,filtered.s,'DOOR2');
 const shown=legal(filtered.pack,s).filter(a=>a.uid).map(a=>s.players[0].hand.find(c=>c.uid===a.uid).cardId);
 assert.equal(shown.includes('TRAIT'),true);
 assert.equal(shown.includes('BAN'),false);
 assert.throws(()=>dispatchUniversalAction(filtered.pack,s,{type:'chooseHandActiveOrRaid',mode:'enter',
  uid:s.players[0].hand.find(c=>c.cardId==='TRAIT').uid,line:'front',slot:1}),
  /not currently legal|cannot rest/);
 void baseBody;
});
