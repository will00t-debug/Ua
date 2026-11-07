import test from 'node:test';
import assert from 'node:assert/strict';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {KJN_CARDS} from '../dist/kjn-cards.mjs';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalEnergyByColor, universalImpact, universalImpactNull, universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';

const pack=createKjnV2Pack();
const packs=[pack,pack];
const ROSE='ローズ・オリアナ';
const SID='シド・カゲノー';

function countsFor(required,color){
 for(const id of required)assert.equal(pack.cards[id].color,color,id);
 const groups={special:[],color:[],final:[]};
 for(const id of required){
  const trigger=pack.cards[id].trigger;
  if(groups[trigger])groups[trigger].push(id);
 }
 const copies=Object.fromEntries(required.map(id=>[id,4]));
 for(const ids of Object.values(groups)){
  if(!ids.length)continue;
  const each=Math.floor(4/ids.length);
  assert.ok(each>=1,ids.join(','));
  let used=0;
  ids.forEach((id,i)=>{
   const n=i===ids.length-1?4-used:each;
   copies[id]=n;used+=n;
  });
 }
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  c.color===color&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 let total=Object.values(copies).reduce((n,x)=>n+x,0);
 assert.ok(total<=50,'required copies '+total);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  copies[id]=add;total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,copies),[]);
 return copies;
}
function fresh(ids,seed,color='yellow'){
 const counts=countsFor(ids,color);
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function freshPair(yellowIds,purpleIds,seed){
 return newUniversalMatch(packs,{decks:[countsFor(yellowIds,'yellow'),countsFor(purpleIds,'purple')],
  seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' p'+p);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){const card=take(s,p,id);s.players[p].hand.push(card);return card;}
function toOutside(s,p,id){const card=take(s,p,id);s.players[p].outside.push(card);return card;}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of cards.slice().reverse())s.players[p].deck.unshift(card);
 return cards;
}
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function parkHand(s,p){s.players[p].deck.push(...s.players[p].hand.splice(0));}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function legal(s,pred){return legalUniversalActions(packs,s).some(pred);}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify(legalUniversalActions(packs,s).slice(0,8)));
 return use(s,action);
}
function play(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.from!=='removed'&&a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play '+uid+' '+line+(s.pending?' pending '+s.pending.kind+' '+(s.pending.step||''):''));
 return use(s,action);
}
function playRemoved(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.from==='removed'&&a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No removed play '+uid+' '+line);
 return use(s,action);
}
function cast(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event '+uid);
 return use(s,action);
}
function raidOnto(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&
  a.baseUid===baseUid&&a.from!=='removed');
 if(!action)throw Error('No raid onto '+baseUid);
 return use(s,action);
}
function raidRemoved(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&
  a.baseUid===baseUid&&a.from==='removed');
 if(!action)throw Error('No removed raid onto '+baseUid);
 return use(s,action);
}
function activate(s,uid,mode='kjn:0'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode===mode);
 if(!action)throw Error('No activate '+uid+' '+mode+' '+s.phase);
 return use(s,action);
}
function fuel(s,id,n,p=0){for(let i=0;i<n;i++)put(s,p,id,'energy',i,true);}
function passTo(s,player,phase){
 const startTurn=s.turn,startActive=s.active,startPhase=s.phase;
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&(s.turn>startTurn||s.active!==startActive||s.phase!==startPhase))){
  if(s.pending?.kind==='end-hand-limit')s=choose(s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('Turn blocked by '+s.pending.kind+' '+(s.pending.step||''));
  else s=use(s,{type:'next'});
  if(++guard>40)throw Error('Did not reach player '+player+' '+phase);
 }
 return s;
}
function find(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);}
function bp(s,p,uid){return universalBp(pack,s,find(s,p,uid));}
function purple(s,p=0){return universalEnergyByColor(pack,s,p).purple||0;}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;}
function attack(s,uid){return use(s,{type:'attack',uid});}
function hit(s,uid){
 s=attack(s,uid);
 if(s.pending?.kind==='block')s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function silence(s,card,controller=1){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function hidden(s,uids){
 const view=JSON.stringify(universalPublicView(packs,s,1));
 const priv=universalPrivateChoices(packs,s,1);
 const text=priv===null?'':JSON.stringify(priv);
 return uids.every(uid=>!view.includes(uid)&&!text.includes(uid));
}
function layer(s,viewer,owner,uid){
 const view=universalPublicView(packs,s,viewer);
 const lines=[...view.players[owner].front,...view.players[owner].energy];
 return lines.find(c=>c&&c.uid===uid);
}
function main(ids,seed,color='yellow'){
 const s=toPhase(fresh(ids,seed,color),'main');
 readyAp(s);
 return s;
}
function orderTop(s,uids){
 for(const uid of uids)s=choose(s,a=>a.uid===uid);
 return s;
}
function settleLook(s){
 let guard=0;
 while(s.pending&&guard++<8){
  const step=s.pending.step;
  if(step==='lookPick'||step==='keepTop'||step==='distinctHand')s=choose(s,a=>a.mode==='done');
  else if(step==='lookOrder')s=choose(s,a=>a.uid);
  else break;
 }
 return s;
}
function fillOutside(s,p,n){
 while(s.players[p].outside.length<n&&s.players[p].deck.length)
  s.players[p].outside.push(s.players[p].deck.pop());
}

test('KJN-1-011 cannot enter the front or move while covered',()=>{
 const ids=['KJN-1-011','KJN-1-010','KJN-1-012','KJN-1-005','KJN-1-026'];
 const text=KJN_CARDS.find(c=>c.id==='KJN-1-011').effectJa;
 assert.match(text,/フロントLに登場できず/);
 assert.match(text,/裏向きのカードが下にある場合、移動できない/);
 const foreign=KJN_CARDS.filter(c=>{
  const n=Number(c.id.slice(7));
  return n>=26&&n<=50&&/入れ替/.test(c.effectJa||'');
 });
 assert.deepEqual(foreign.map(c=>c.id),[]);
 let s=main(ids,11011);
 fuel(s,'KJN-1-026',2);
 const window=top(s,0,['KJN-1-010','KJN-1-026','KJN-1-010']);
 const card=toHand(s,0,'KJN-1-011');
 assert.equal(legal(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'),false);
 s=play(s,card.uid,'energy');
 const self=find(s,0,card.uid);
 assert.deepEqual(self.under.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(layer(s,1,0,self.uid).underLayers.every(c=>c.faceDown===true&&c.cardId===undefined),true);
 assert.equal(layer(s,0,0,self.uid).underLayers.map(c=>c.cardId).join(','),window.map(c=>c.cardId).join(','));
 let move=toPhase(s,'move');
 assert.equal(legal(move,a=>a.type==='move'&&a.uid===self.uid),false);
 move=passTo(toPhase(s,'main'),0,'main');
 let live=find(move,0,self.uid);
 move=activate(move,live.uid);
 const first=live.under[0];
 move=choose(move,a=>a.mode==='out'&&a.uid===first.uid);
 assert.equal(move.pending,null);
 assert.equal(find(move,0,self.uid).ready,false);
 assert.equal(legal(toPhase(move,'move'),a=>a.type==='move'&&a.uid===self.uid),false);
 move=passTo(move,0,'main');
 live=find(move,0,self.uid);
 move=activate(move,live.uid);
 move=choose(move,a=>a.mode==='out');
 move=passTo(move,0,'main');
 live=find(move,0,self.uid);
 move=activate(move,live.uid);
 const last=live.under.find(c=>c.faceDown);
 move=choose(move,a=>a.mode==='out'&&a.uid===last.uid);
 assert.equal(find(move,0,self.uid).ready,true);
 assert.equal(move.pending.step,'moveFront');
 move=choose(move,a=>a.mode==='dest'&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(move.players[0].front.some(c=>c?.uid===self.uid),true);
 assert.equal(universalAttackDamage(pack,move,find(move,0,self.uid)),2);
 assertUniversalMatch(packs,move);
});

test('Q2110 keeps a covered Elizabeth off effect moves and position swaps',()=>{
 const sao=registeredV2TitlePack('sword-art-online');
 const mixed={kind:pack.kind,id:pack.id,version:pack.version,restrictColors:false,
  cards:{...pack.cards,'SAO-1-109':sao.cards['SAO-1-109'],
   'SAO-1-052':sao.cards['SAO-1-052']}};
 const both=[mixed,mixed];
 const copies={'KJN-1-011':4,'KJN-1-010':4,'KJN-1-026':4,'SAO-1-109':4,'SAO-1-052':4};
 let total=20;
 for(const id of Object.values(pack.cards).filter(c=>c.color==='yellow'&&!copies[c.id]&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort()){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  copies[id]=add;total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(mixed,copies),[]);
 function open(seed){
  let s=newUniversalMatch(both,{decks:[copies,copies],seed,first:0});
  let guard=0;
  while(s.phase!=='main'){
   if(s.pending)throw Error('Opening pending '+s.pending.kind);
   s=dispatchUniversalAction(both,s,{type:'next'});
   if(++guard>8)throw Error('Did not reach main');
  }
  readyAp(s);
  return s;
 }
 function act(s,pred){
  const action=legalUniversalActions(both,s).find(pred);
  if(!action)throw Error('No Q2110 action '+(s.pending?.kind||s.phase)+' '+
   (s.pending?.step||'')+' '+JSON.stringify(legalUniversalActions(both,s).slice(0,6)));
  return dispatchUniversalAction(both,s,action);
 }
 function covered(seed,hide){
  let s=open(seed);
  const blue=take(s,0,'SAO-1-052');
  blue.ready=true;blue.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[0]=blue;
  const liz=take(s,0,'KJN-1-011');
  liz.ready=true;liz.fieldEntryStamp=s.nextFieldEntryStamp++;
  liz.ownEffectFront=true;
  if(hide){
   const down=take(s,0,'KJN-1-010');
   down.faceDown=true;down.ready=false;down.fieldEntryStamp=null;
   liz.under=[down];
  }
  s.players[0].front[0]=liz;
  const event=take(s,0,'SAO-1-109');
  s.players[0].hand.push(event);
  s.players[0].apCards[0].ready=false;
  s=act(s,a=>a.type==='event'&&a.uid===event.uid);
  assert.equal(s.pending.kind,'effect-recover-ap');
  const rested=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  s=act(s,a=>a.type==='chooseApRecovery'&&a.uid===rested.uid);
  assert.equal(s.pending.kind,'effect-choice-mode');
  return {s,liz,blue};
 }
 const blocked=covered(21101,true);
 const moving=act(structuredClone(blocked.s),a=>a.type==='chooseEffectMode'&&a.mode==='move');
 assert.equal(moving.pending.kind,'effect-line-move');
 assert.equal(moving.pending.choices.includes(blocked.liz.uid),false);
 assert.equal(moving.pending.choices.includes(blocked.blue.uid),true);
 const swapping=act(structuredClone(blocked.s),a=>a.type==='chooseEffectMode'&&a.mode==='swap');
 assert.equal(swapping.pending,null);
 assert.equal(swapping.players[0].front.some(c=>c?.uid===blocked.liz.uid),true);
 const openMove=covered(21102,false);
 const shifted=act(structuredClone(openMove.s),a=>a.type==='chooseEffectMode'&&a.mode==='move');
 assert.equal(shifted.pending.kind,'effect-line-move');
 assert.equal(shifted.pending.choices.includes(openMove.liz.uid),true);
 const exchanged=act(structuredClone(openMove.s),a=>a.type==='chooseEffectMode'&&a.mode==='swap');
 assert.equal(exchanged.pending.kind,'effect-swap-lines');
 assert.equal(exchanged.pending.choices.includes(openMove.liz.uid),true);
 assertUniversalMatch(both,exchanged);
});

test('KJN-1-026 and KJN-1-041 bounce another energy-1 character or themselves',()=>{
 let s=main(['KJN-1-026','KJN-1-030','KJN-1-032','KJN-1-014','KJN-1-010'],26001);
 fuel(s,'KJN-1-010',4);
 const cheap=put(s,0,'KJN-1-030','front',0,true);
 const heavy=put(s,0,'KJN-1-014','front',1,true);
 const bouncer=toHand(s,0,'KJN-1-026');
 s=play(s,bouncer.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(legal(s,a=>a.uid===cheap.uid),true);
 assert.equal(legal(s,a=>a.uid===heavy.uid),false);
 assert.equal(legal(s,a=>a.uid===bouncer.uid),false);
 assert.equal(legal(s,a=>a.uid===null),false);
 s=choose(s,a=>a.uid===cheap.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===cheap.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===bouncer.uid),true);
 assertUniversalMatch(packs,s);

 let alone=main(['KJN-1-026','KJN-1-014','KJN-1-010'],26002);
 fuel(alone,'KJN-1-014',1);
 const wall=put(alone,0,'KJN-1-014','front',0,true);
 const self=toHand(alone,0,'KJN-1-026');
 alone=play(alone,self.uid);
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(alone.players[0].front.some(c=>c?.uid===wall.uid),true);
 assertUniversalMatch(packs,alone);

 let purpleDeck=main(['KJN-1-041','KJN-1-042','KJN-1-046','KJN-1-050'],41001,'purple');
 fuel(purpleDeck,'KJN-1-041',1);
 const zero=toHand(purpleDeck,0,'KJN-1-042');
 purpleDeck=play(purpleDeck,zero.uid);
 const purpleBounce=toHand(purpleDeck,0,'KJN-1-041');
 purpleDeck=play(purpleDeck,purpleBounce.uid);
 assert.equal(purpleDeck.pending.kind,'effect-bounce-own');
 purpleDeck=choose(purpleDeck,a=>a.uid===zero.uid);
 assert.equal(purpleDeck.players[0].hand.some(c=>c.uid===zero.uid),true);
 assertUniversalMatch(packs,purpleDeck);
});

test('KJN-1-027 gains 2000 once while an opponent front is at least 4500',()=>{
 const ids=['KJN-1-027','KJN-1-011','KJN-1-010','KJN-1-026'];
 let s=main(ids,27001);
 const self=put(s,0,'KJN-1-027','front',0,true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 const big=put(s,1,'KJN-1-011','front',0,true);
 big.ownEffectFront=true;
 s=activate(s,self.uid);
 assert.equal(s.pending,null);
 assert.equal(bp(s,0,self.uid),5000);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===self.uid),false);
 s=passTo(s,0,'main');
 const again=find(s,0,self.uid);
 s=activate(s,again.uid);
 assert.equal(bp(s,0,again.uid),5000);
 let life=toPhase(fresh(ids,27002),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const rested=put(life,1,'KJN-1-010','front',0,false);
 setLife(life,1,['KJN-1-027','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(bp(life,1,rested.uid),5000);
 assertUniversalMatch(packs,life);
});

test('KJN-1-028 is larger on its turn and actives once when a 4500 is present',()=>{
 const ids=['KJN-1-028','KJN-1-011','KJN-1-026','KJN-1-010'];
 let quiet=main(ids,28001);
 fuel(quiet,'KJN-1-026',4);
 const first=toHand(quiet,0,'KJN-1-028');
 quiet=play(quiet,first.uid);
 assert.equal(quiet.pending,null);
 assert.equal(find(quiet,0,first.uid).ready,false);
 assert.equal(bp(quiet,0,first.uid),5000);
 assert.equal(quiet.mainReadyOnceByName[0].includes('KJN-1-028'),false);
 const big=put(quiet,1,'KJN-1-011','front',0,true);
 big.ownEffectFront=true;
 const second=toHand(quiet,0,'KJN-1-028');
 quiet=play(quiet,second.uid);
 assert.equal(find(quiet,0,second.uid).ready,true);
 assert.equal(quiet.pending.step,'restFoe');
 assert.equal(legal(quiet,a=>a.mode==='skip'),true);
 quiet=choose(quiet,a=>a.mode==='rest'&&a.uid===big.uid);
 assert.equal(find(quiet,1,big.uid).ready,false);
 const third=toHand(quiet,0,'KJN-1-028');
 quiet=play(quiet,third.uid);
 assert.equal(quiet.pending,null);
 assert.equal(find(quiet,0,third.uid).ready,false);
 assert.equal(bp(quiet,0,third.uid),5000);
 quiet=passTo(quiet,1,'main');
 assert.equal(bp(quiet,0,first.uid),4000);
 let muted=main(ids,28002);
 fuel(muted,'KJN-1-026',3);
 const body=toHand(muted,0,'KJN-1-028');
 muted=play(muted,body.uid);
 silence(muted,find(muted,0,body.uid));
 assert.equal(bp(muted,0,body.uid),4000);
 let life=toPhase(fresh(ids,28003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-028','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-028'),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-029 lowers one front Claire, draws, discards, and raises itself',()=>{
 const ids=['KJN-1-029','KJN-1-012','KJN-1-026','KJN-1-010'];
 let s=main(ids,29001);
 fuel(s,'KJN-1-026',2);
 const claire=put(s,0,'KJN-1-012','front',0,true);
 const energy=put(s,0,'KJN-1-029','energy',2,true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===energy.uid),false);
 const self=toHand(s,0,'KJN-1-029');
 s=play(s,self.uid);
 const live=find(s,0,self.uid);
 parkHand(s,0);
 const deck=s.players[0].deck.length;
 s=activate(s,live.uid);
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='down'&&a.uid===claire.uid);
 assert.equal(bp(s,0,claire.uid),500);
 assert.equal(bp(s,0,live.uid),4000);
 assert.equal(s.pending.kind,'kjn');
 assert.equal(s.pending.step,'pay');
 assert.equal(s.players[0].deck.length,deck-1);
 s=choose(s,a=>a.mode==='discard');
 assert.equal(s.players[0].hand.length,0);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===live.uid),false);
 let life=toPhase(fresh(ids,29002),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-029','KJN-1-010']);
 const before=life.players[1].deck.length;
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-029'),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-030 looks privately and may put one of the trio outside',()=>{
 const ids=['KJN-1-030','KJN-1-031','KJN-1-007','KJN-1-010','KJN-1-026'];
 let s=main(ids,30001);
 const window=top(s,0,['KJN-1-031','KJN-1-010']);
 const card=toHand(s,0,'KJN-1-030');
 s=play(s,card.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(legal(s,a=>a.mode==='take'&&a.uid===window[0].uid),true);
 assert.equal(legal(s,a=>a.mode==='take'&&a.uid===window[1].uid),false);
 assert.equal(legal(s,a=>a.mode==='done'),true);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 assert.equal(s.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 s=choose(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,window[1].uid);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 assertUniversalMatch(packs,s);

 let none=main(ids,30002);
 const both=top(none,0,['KJN-1-010','KJN-1-026']);
 const other=toHand(none,0,'KJN-1-030');
 none=play(none,other.uid);
 assert.equal(none.pending.step,'lookOrder');
 assert.equal(hidden(none,both.map(c=>c.uid)),true);
 none=choose(none,a=>a.uid===both[1].uid);
 assert.equal(none.players[0].deck[0].uid,both[1].uid);
 assert.equal(none.players[0].deck[1].uid,both[0].uid);
 let life=toPhase(fresh(ids,30003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-030','KJN-1-010']);
 const deck=life.players[1].deck.length;
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,deck-1);
 assertUniversalMatch(packs,life);
});

test('KJN-1-031 orders three or mills one removable card after a discard',()=>{
 const ids=['KJN-1-031','KJN-1-030','KJN-1-010','KJN-1-026','KJN-1-012'];
 let look=main(ids,31001);
 fuel(look,'KJN-1-026',1);
 parkHand(look,0);
 const window=top(look,0,['KJN-1-012','KJN-1-010','KJN-1-026']);
 const card=toHand(look,0,'KJN-1-031');
 look=play(look,card.uid);
 assert.equal(legal(look,a=>a.mode==='mill'),false);
 assert.equal(legal(look,a=>a.mode==='look'),true);
 look=choose(look,a=>a.mode==='look');
 look=orderTop(look,window.slice(0,-1).map(c=>c.uid));
 assert.deepEqual(look.players[0].deck.slice(0,3).map(c=>c.uid),window.map(c=>c.uid));
 assertUniversalMatch(packs,look);

 let mill=main(ids,31002);
 fuel(mill,'KJN-1-026',1);
 const body=toHand(mill,0,'KJN-1-031');
 const payment=toHand(mill,0,'KJN-1-012');
 const milled=top(mill,0,['KJN-1-030'])[0];
 mill=play(mill,body.uid);
 assert.equal(legal(mill,a=>a.mode==='mill'),true);
 mill=choose(mill,a=>a.mode==='mill');
 mill=choose(mill,a=>a.mode==='discard'&&a.uid===payment.uid);
 assert.equal(mill.players[0].removed.some(c=>c.uid===milled.uid),true);
 assert.equal(legal(mill,a=>a.from==='removed'&&a.uid===milled.uid),true);
 mill=playRemoved(mill,milled.uid);
 assert.equal(mill.players[0].front.some(c=>c?.uid===milled.uid),true);
 mill=settleLook(mill);
 mill=passTo(mill,0,'main');
 assert.equal(legal(mill,a=>a.from==='removed'&&a.uid===milled.uid),false);
 let life=toPhase(fresh(ids,31003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const rested=put(life,1,'KJN-1-010','front',0,false);
 setLife(life,1,['KJN-1-031','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(bp(life,1,rested.uid),5000);
 assertUniversalMatch(packs,life);
});

test('KJN-1-032 mills a removable card only on the turn it entered',()=>{
 const ids=['KJN-1-032','KJN-1-030','KJN-1-026','KJN-1-010'];
 let s=main(ids,32001);
 fuel(s,'KJN-1-026',1);
 const late=put(s,0,'KJN-1-032','front',0,true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===late.uid),false);
 const card=toHand(s,0,'KJN-1-032');
 const milled=top(s,0,['KJN-1-030'])[0];
 s=play(s,card.uid);
 s=activate(s,card.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===milled.uid),true);
 s=playRemoved(s,milled.uid);
 assert.equal(s.players[0].energy.some(c=>c?.uid===milled.uid)||s.players[0].front.some(c=>c?.uid===milled.uid),true);
 s=settleLook(s);
 s=passTo(s,0,'main');
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===card.uid),false);
 assertUniversalMatch(packs,s);
});

test('KJN-1-033 rests, then either tops a hand card or uses a removed-area play',()=>{
 const ids=['KJN-1-033','KJN-1-030','KJN-1-032','KJN-1-026','KJN-1-010','KJN-1-012'];
 let hand=main(ids,33001);
 const other=put(hand,0,'KJN-1-030','front',0,true);
 const self=put(hand,0,'KJN-1-033','front',1,true);
 const placed=toHand(hand,0,'KJN-1-012');
 hand=activate(hand,self.uid);
 assert.equal(find(hand,0,self.uid).ready,false);
 assert.equal(legal(hand,a=>a.mode==='removed'),false);
 hand=choose(hand,a=>a.mode==='hand');
 hand=choose(hand,a=>a.mode==='place'&&a.uid===placed.uid);
 assert.equal(hand.players[0].deck[0].uid,placed.uid);
 assert.equal(hand.pending.step,'buff');
 assert.equal(legal(hand,a=>a.mode==='skip'),true);
 hand=choose(hand,a=>a.mode==='buff'&&a.uid===other.uid);
 assert.equal(bp(hand,0,other.uid),2500);
 assertUniversalMatch(packs,hand);

 let removed=main(ids,33002);
 fuel(removed,'KJN-1-026',2);
 const rose=put(removed,0,'KJN-1-030','energy',2,true);
 const source=toHand(removed,0,'KJN-1-032');
 const milled=top(removed,0,['KJN-1-012'])[0];
 removed=play(removed,source.uid);
 removed=activate(removed,source.uid);
 removed=playRemoved(removed,milled.uid);
 const actor=put(removed,0,'KJN-1-033','front',2,true);
 removed=activate(removed,actor.uid);
 assert.equal(legal(removed,a=>a.mode==='removed'),true);
 removed=choose(removed,a=>a.mode==='removed');
 removed=choose(removed,a=>a.mode==='skip');
 assert.equal(bp(removed,0,rose.uid),1500);
 let life=toPhase(fresh(ids,33003),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 const rested=put(life,1,'KJN-1-010','front',0,false);
 setLife(life,1,['KJN-1-033','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(bp(life,1,rested.uid),5000);
 assertUniversalMatch(packs,life);
});

test('KJN-1-034 raids onto Rose and retires only after a removed-area raid',()=>{
 const ids=['KJN-1-034','KJN-1-030','KJN-1-032','KJN-1-026','KJN-1-012','KJN-1-010'];
 let paid=main(ids,34001);
 fuel(paid,'KJN-1-026',2);
 const base=toHand(paid,0,'KJN-1-030');
 paid=play(paid,base.uid);
 paid=settleLook(paid);
 const raider=toHand(paid,0,'KJN-1-034');
 paid=raidOnto(paid,raider.uid,base.uid);
 assert.equal(paid.pending,null);
 const topCard=paid.players[0].front.find(c=>c?.cardId==='KJN-1-034');
 assert.equal(topCard.ready,true);
 assert.equal(legal(paid,a=>a.type==='activate'&&a.uid===topCard.uid),false);
 assertUniversalMatch(packs,paid);

 let used=main(ids,34002);
 fuel(used,'KJN-1-026',3);
 const rose=put(used,0,'KJN-1-030','front',0,true);
 const miller=toHand(used,0,'KJN-1-032');
 const buried=top(used,0,['KJN-1-034'])[0];
 used=play(used,miller.uid);
 used=activate(used,miller.uid);
 const victim=put(used,1,'KJN-1-012','front',0,true);
 assert.equal(legal(used,a=>a.type==='raid'&&a.from==='removed'&&a.uid===buried.uid),true);
 const quiet=playRemoved(structuredClone(used),buried.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[1].front.some(c=>c?.uid===victim.uid),true);
 used=raidRemoved(used,buried.uid,rose.uid);
 assert.equal(used.pending?.step,'retire');
 assert.equal(legal(used,a=>a.mode==='skip'),true);
 used=choose(used,a=>a.mode==='retire'&&a.uid===victim.uid);
 assert.equal(used.players[1].front.some(c=>c?.uid===victim.uid),false);
 assert.equal(used.players[0].front.some(c=>c?.uid===buried.uid),true);
 assert.equal(used.players[0].front.find(c=>c?.uid===buried.uid).stack[0].uid,rose.uid);
 assertUniversalMatch(packs,used);

 let peeled=main(ids,34003);
 fuel(peeled,'KJN-1-026',3);
 const baseRose=put(peeled,0,'KJN-1-030','front',0,true);
 const cover=toHand(peeled,0,'KJN-1-034');
 peeled=raidOnto(peeled,cover.uid,baseRose.uid);
 assert.equal(peeled.pending,null);
 const opener=toHand(peeled,0,'KJN-1-032');
 top(peeled,0,['KJN-1-012']);
 peeled=play(peeled,opener.uid);
 peeled=activate(peeled,opener.uid);
 const returned=peeled.players[0].removed.find(c=>c.cardId==='KJN-1-012');
 peeled=playRemoved(peeled,returned.uid);
 const body=peeled.players[0].front.find(c=>c?.cardId==='KJN-1-034');
 peeled=activate(peeled,body.uid);
 assert.equal(peeled.players[0].outside.some(c=>c.uid===baseRose.uid),true);
 assert.equal(universalImpact(pack,peeled,find(peeled,0,body.uid)),1);
 assert.equal(legal(peeled,a=>a.type==='activate'&&a.uid===body.uid),false);
 assertUniversalMatch(packs,peeled);
});

test('KJN-1-035 enters active and buffs one front from each side',()=>{
 const ids=['KJN-1-035','KJN-1-011','KJN-1-012','KJN-1-026','KJN-1-010'];
 let s=main(ids,35001);
 fuel(s,'KJN-1-026',2);
 const mine=put(s,0,'KJN-1-012','front',0,true);
 const foe=put(s,1,'KJN-1-011','front',0,true);
 foe.ownEffectFront=true;
 const rested=put(s,1,'KJN-1-012','front',1,false);
 const field=toHand(s,0,'KJN-1-035');
 assert.equal(legal(s,a=>a.type==='play'&&a.uid===field.uid&&a.line==='front'),false);
 s=play(s,field.uid,'energy');
 assert.equal(find(s,0,field.uid).ready,true);
 s=activate(s,field.uid);
 assert.equal(find(s,0,field.uid).ready,false);
 assert.equal(legal(s,a=>a.uid===rested.uid),false);
 s=choose(s,a=>a.mode==='pick'&&a.uid===mine.uid);
 s=choose(s,a=>a.mode==='pick'&&a.uid===foe.uid);
 assert.equal(bp(s,0,mine.uid),2500);
 assert.equal(bp(s,1,foe.uid),6000);
 let life=toPhase(fresh(ids,35002),'attack');
 const hitter=put(life,0,'KJN-1-010','front',0,true);
 setLife(life,1,['KJN-1-035','KJN-1-010']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-035'),true);
 assertUniversalMatch(packs,life);
});

function recover(id,seed){
 const ids=[id,'KJN-1-026','KJN-1-010'];
 let s=main(ids,seed);
 fuel(s,'KJN-1-026',2);
 readyAp(s,0,3);
 s.players[0].apCards[0].ready=false;
 const event=toHand(s,0,'KJN-1-'+id.slice(-3));
 s=cast(s,event.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legal(s,a=>a.uid===null),true);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid!==null);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid!==null);
 assert.equal(apReady(s),3);
 assert.equal(s.pending,null);
 let blocked=main(ids,seed+1);
 fuel(blocked,'KJN-1-026',2);
 setLife(blocked,1,[id,'KJN-1-010']);
 blocked=toPhase(blocked,'attack');
 const hitter=put(blocked,0,'KJN-1-010','front',0,true);
 blocked=hit(blocked,hitter.uid);
 assert.equal(blocked.pending,null);
 assert.equal(blocked.players[1].life.length,1);
 let last=main(ids,seed+2);
 fuel(last,'KJN-1-026',2);
 const deckTop=last.players[1].deck[0];
 setLife(last,1,[id]);
 last=toPhase(last,'attack');
 const attacker=put(last,0,'KJN-1-010','front',0,true);
 last=hit(last,attacker.uid);
 assert.equal(legal(last,a=>a.mode==='final'),true);
 last=choose(last,a=>a.mode==='final');
 assert.equal(last.players[1].life[0].uid,deckTop.uid);
 assert.equal(last.players[1].outside.some(c=>c.cardId===id),true);
 assertUniversalMatch(packs,last);
}
test('KJN-1-036 readies up to two AP and its final needs an empty life',()=>{
 recover('KJN-1-036',36001);
});
test('KJN-1-039 readies up to two AP and its final needs an empty life',()=>{
 recover('KJN-1-039',39001);
});

test('KJN-1-037 must retire at 2000, or 5000 beside Rose, then may buff from removed',()=>{
 const ids=['KJN-1-037','KJN-1-032','KJN-1-030','KJN-1-012','KJN-1-014','KJN-1-011','KJN-1-026','KJN-1-010'];
 let none=main(ids,37001);
 fuel(none,'KJN-1-026',2);
 const huge=put(none,1,'KJN-1-011','front',0,true);
 huge.ownEffectFront=true;
 const event=toHand(none,0,'KJN-1-037');
 assert.equal(legal(none,a=>a.type==='event'&&a.uid===event.uid),false);
 const small=put(none,1,'KJN-1-012','front',1,true);
 none=cast(none,event.uid);
 assert.equal(legal(none,a=>a.mode==='skip'),false);
 assert.equal(legal(none,a=>a.uid===huge.uid),false);
 assert.equal(legal(none,a=>a.uid===small.uid),true);
 none=choose(none,a=>a.mode==='retire'&&a.uid===small.uid);
 assert.equal(none.pending,null);
 assert.equal(none.players[1].outside.some(c=>c.uid===small.uid),true);

 let rose=main(ids,37002);
 fuel(rose,'KJN-1-026',2);
 put(rose,0,'KJN-1-030','front',0,true);
 const mid=put(rose,1,'KJN-1-014','front',0,true);
 const roseEvent=toHand(rose,0,'KJN-1-037');
 assert.equal(legal(rose,a=>a.type==='event'&&a.uid===roseEvent.uid),true);
 rose=cast(rose,roseEvent.uid);
 assert.equal(legal(rose,a=>a.uid===mid.uid),true);
 rose=choose(rose,a=>a.uid===mid.uid);
 assert.equal(rose.players[1].outside.some(c=>c.uid===mid.uid),true);

 let removed=main(ids,37003);
 fuel(removed,'KJN-1-026',3);
 const miller=toHand(removed,0,'KJN-1-032');
 const buried=top(removed,0,['KJN-1-037'])[0];
 const ally=put(removed,0,'KJN-1-030','front',0,true);
 const target=put(removed,1,'KJN-1-012','front',0,true);
 removed=play(removed,miller.uid);
 removed=activate(removed,miller.uid);
 removed=cast(removed,buried.uid);
 assert.equal(removed.pending.data.fromRemoved,true);
 removed=choose(removed,a=>a.mode==='retire'&&a.uid===target.uid);
 assert.equal(removed.pending.step,'buff');
 assert.equal(legal(removed,a=>a.mode==='skip'),true);
 removed=choose(removed,a=>a.mode==='buff'&&a.uid===ally.uid);
 assert.equal(bp(removed,0,ally.uid),2500);
 assertUniversalMatch(packs,removed);

 let life=toPhase(fresh(ids,37004),'attack');
 const hitter=put(life,0,'KJN-1-010','front',1,true);
 const big=put(life,0,'KJN-1-011','front',0,true);
 big.ownEffectFront=true;
 setLife(life,1,['KJN-1-037','KJN-1-010']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'special');
 assert.equal(legal(life,a=>a.mode==='special'&&a.uid===big.uid),true);
 life=choose(life,a=>a.mode==='special'&&a.uid===big.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===big.uid),true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-038 raises the cap for Claire and taxes a raided Claire with a facedown',()=>{
 const ids=['KJN-1-038','KJN-1-037','KJN-1-015','KJN-1-012','KJN-1-002','KJN-1-011','KJN-1-014','KJN-1-026','KJN-1-010'];
 let plain=main(ids,38001);
 fuel(plain,'KJN-1-026',3);
 const low=put(plain,1,'KJN-1-012','front',0,true);
 const over=put(plain,1,'KJN-1-011','front',1,true);
 over.ownEffectFront=true;
 const event=toHand(plain,0,'KJN-1-038');
 plain=cast(plain,event.uid);
 assert.equal(legal(plain,a=>a.mode==='skip'),true);
 assert.equal(legal(plain,a=>a.uid===low.uid),true);
 assert.equal(legal(plain,a=>a.uid===over.uid),false);
 plain=choose(plain,a=>a.mode==='skip');
 assert.equal(plain.pending,null);
 assert.equal(plain.players[1].front.some(c=>c?.uid===low.uid),true);

 let raised=main(ids,38002);
 fuel(raised,'KJN-1-026',3);
 put(raised,0,'KJN-1-012','front',0,true);
 const mid=put(raised,1,'KJN-1-014','front',0,true);
 const bigger=put(raised,1,'KJN-1-011','front',1,true);
 bigger.ownEffectFront=true;
 const cap=toHand(raised,0,'KJN-1-038');
 raised=cast(raised,cap.uid);
 assert.equal(legal(raised,a=>a.uid===mid.uid),true);
 assert.equal(legal(raised,a=>a.uid===bigger.uid),true);
 raised=choose(raised,a=>a.mode==='skip');
 assert.equal(raised.pending,null);

 let taxed=main(ids,38003);
 fuel(taxed,'KJN-1-026',3);
 const root=put(taxed,0,'KJN-1-012','front',0,true);
 const raider=toHand(taxed,0,'KJN-1-015');
 taxed=raidOnto(taxed,raider.uid,root.uid);
 assert.equal(taxed.pending,null);
 const claire=taxed.players[0].front.find(c=>c?.cardId==='KJN-1-015');
 const cover=put(taxed,0,'KJN-1-002','energy',3,true);
 taxed=activate(taxed,cover.uid);
 taxed=choose(taxed,a=>a.mode==='host'&&a.uid===claire.uid);
 taxed=choose(taxed,a=>a.mode==='discard');
 assert.equal(layer(taxed,0,0,claire.uid).underLayers.some(c=>c.cardId==='KJN-1-002'),true);
 assert.equal(layer(taxed,1,0,claire.uid).underLayers.every(c=>c.cardId===undefined),true);
 const other=put(taxed,0,'KJN-1-010','front',1,true);
 const tax=toHand(taxed,0,'KJN-1-038');
 taxed=cast(taxed,tax.uid);
 taxed=choose(taxed,a=>a.mode==='skip');
 assert.equal(taxed.pending.step,'tax');
 taxed=choose(taxed,a=>a.mode==='tax'&&a.uid===claire.uid);
 assert.equal(find(taxed,0,claire.uid).kjnSelectTax.turn,taxed.turn);
 setLife(taxed,1,['KJN-1-037']);
 const hitter=put(taxed,0,'KJN-1-010','front',2,true);
 taxed=toPhase(taxed,'attack');
 taxed=hit(taxed,hitter.uid);
 assert.equal(taxed.pending.trigger,'special');
 assert.equal(legal(taxed,a=>a.mode==='special'&&a.uid===other.uid),true);
 taxed=choose(taxed,a=>a.mode==='special'&&a.uid===claire.uid);
 assert.equal(taxed.pending.kind,'effect-selection-hand-payment');
 const paid=taxed.players[1].hand[0];
 taxed=choose(taxed,a=>a.type==='chooseSelectionTaxDiscard'&&a.uid===paid.uid);
 assert.equal(taxed.players[1].outside.some(c=>c.uid===paid.uid),true);
 assert.equal(taxed.players[0].outside.some(c=>c.uid===claire.uid),true);
 assertUniversalMatch(packs,taxed);

 let empty=main(ids,38004);
 fuel(empty,'KJN-1-026',3);
 const base=put(empty,0,'KJN-1-012','front',0,true);
 const again=toHand(empty,0,'KJN-1-015');
 empty=raidOnto(empty,again.uid,base.uid);
 const body=empty.players[0].front.find(c=>c?.cardId==='KJN-1-015');
 const tuck=put(empty,0,'KJN-1-002','energy',3,true);
 empty=activate(empty,tuck.uid);
 empty=choose(empty,a=>a.mode==='host'&&a.uid===body.uid);
 empty=choose(empty,a=>a.mode==='discard');
 const spare=put(empty,0,'KJN-1-010','front',1,true);
 const second=toHand(empty,0,'KJN-1-038');
 empty=cast(empty,second.uid);
 empty=choose(empty,a=>a.mode==='skip');
 empty=choose(empty,a=>a.mode==='tax'&&a.uid===body.uid);
 setLife(empty,1,['KJN-1-037']);
 parkHand(empty,1);
 const attacker=put(empty,0,'KJN-1-010','front',2,true);
 empty=toPhase(empty,'attack');
 empty=hit(empty,attacker.uid);
 assert.equal(legal(empty,a=>a.mode==='special'&&a.uid===spare.uid),true);
 assert.throws(()=>use(empty,{type:'chooseTrigger',mode:'special',uid:body.uid}));
 empty=choose(empty,a=>a.mode==='special'&&a.uid===spare.uid);
 assert.equal(empty.players[0].front.some(c=>c?.uid===body.uid),true);
 assertUniversalMatch(packs,empty);
});

test('KJN-1-040 looks only beside Sid, keeps any number, and draws on attack',()=>{
 const ids=['KJN-1-040','KJN-1-044','KJN-1-047','KJN-1-041'];
 let bare=main(ids,40001,'purple');
 fuel(bare,'KJN-1-041',2);
 const lonely=toHand(bare,0,'KJN-1-040');
 bare=play(bare,lonely.uid);
 assert.equal(bare.pending,null);
 assert.equal(find(bare,0,lonely.uid).ready,true);
 assertUniversalMatch(packs,bare);

 let sided=main(ids,40002,'purple');
 fuel(sided,'KJN-1-041',2);
 const sid=put(sided,0,'KJN-1-047','energy',2,true);
 const window=top(sided,0,['KJN-1-044','KJN-1-041']);
 const card=toHand(sided,0,'KJN-1-040');
 sided=play(sided,card.uid);
 assert.equal(sided.pending.step,'keepTop');
 assert.equal(legal(sided,a=>a.mode==='done'),true);
 assert.equal(hidden(sided,window.map(c=>c.uid)),true);
 sided=choose(sided,a=>a.mode==='keep'&&a.uid===window[1].uid);
 sided=choose(sided,a=>a.mode==='keep'&&a.uid===window[0].uid);
 assert.equal(sided.players[0].deck[0].uid,window[1].uid);
 assert.equal(sided.players[0].deck[1].uid,window[0].uid);
 silence(sided,sid);
 readyAp(sided,0,3);
 const muted=toHand(sided,0,'KJN-1-040');
 sided=play(sided,muted.uid);
 assert.equal(sided.pending,null);

 let attackDraw=toPhase(fresh(ids,40003,'purple'),'attack');
 const hitter=put(attackDraw,0,'KJN-1-040','front',0,true);
 fillOutside(attackDraw,0,10);
 const hand=attackDraw.players[0].hand.length;
 const deck=attackDraw.players[0].deck.length;
 setLife(attackDraw,1,['KJN-1-041','KJN-1-041']);
 attackDraw=hit(attackDraw,hitter.uid);
 assert.equal(attackDraw.players[0].hand.length,hand+1);
 assert.equal(attackDraw.players[0].deck.length,deck-1);
 let quiet=toPhase(fresh(ids,40004,'purple'),'attack');
 const small=put(quiet,0,'KJN-1-040','front',0,true);
 const before=quiet.players[0].hand.length;
 setLife(quiet,1,['KJN-1-041']);
 quiet=hit(quiet,small.uid);
 assert.equal(quiet.players[0].hand.length,before);
 let life=toPhase(fresh(ids,40005,'purple'),'attack');
 const opener=put(life,0,'KJN-1-041','front',0,true);
 setLife(life,1,['KJN-1-040','KJN-1-041']);
 const lifeDeck=life.players[1].deck.length;
 life=hit(life,opener.uid);
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,lifeDeck-1);
 assertUniversalMatch(packs,life);
});

test('KJN-1-042 adds purple only while it generates, then retires',()=>{
 const ids=['KJN-1-042','KJN-1-041'];
 let s=toPhase(fresh(ids,42001,'purple'),'main');
 const self=put(s,0,'KJN-1-042','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 s=activate(s,self.uid,'selfRestEnergyRetire');
 assert.equal(find(s,0,self.uid).ready,false);
 assert.equal(purple(s),2);
 assert.equal(legal(s,a=>a.uid===self.uid&&a.mode==='selfRestEnergyRetire'),false);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===self.uid),true);
 let front=toPhase(fresh(ids,42002,'purple'),'main');
 const ahead=put(front,0,'KJN-1-042','front',0,true);
 const other=put(front,0,'KJN-1-042','energy',1,true);
 const before=purple(front);
 front=activate(front,ahead.uid,'selfRestEnergyRetire');
 assert.equal(purple(front),before);
 assert.equal(legal(front,a=>a.uid===other.uid&&a.mode==='selfRestEnergyRetire'),true);
 silence(front,other);
 assert.equal(legal(front,a=>a.uid===other.uid&&a.mode==='selfRestEnergyRetire'),false);
 front=use(front,{type:'next'});
 assert.equal(front.players[0].outside.some(c=>c.uid===ahead.uid),true);
 assertUniversalMatch(packs,front);
});

test('KJN-1-043 is also Rose, mills up to two when it leaves, and actives',()=>{
 const printed=pack.cards['KJN-1-043'];
 assert.equal(cardHasName(printed,ROSE,false),true);
 assert.equal(cardHasName(printed,ROSE,true),false);
 let s=freshPair(['KJN-1-037','KJN-1-026','KJN-1-010'],['KJN-1-043','KJN-1-041','KJN-1-042'],43001);
 s=toPhase(s,'main');
 readyAp(s);
 fuel(s,'KJN-1-026',2);
 const rose=put(s,1,'KJN-1-043','front',0,true);
 const event=toHand(s,0,'KJN-1-037');
 const marker=top(s,1,['KJN-1-041','KJN-1-042']);
 s=cast(s,event.uid);
 s=choose(s,a=>a.mode==='retire'&&a.uid===rose.uid);
 assert.equal(s.pending.kind,'effect-optional-mill');
 s=choose(s,a=>a.mode==='mill');
 s=choose(s,a=>a.mode==='mill');
 assert.equal(s.players[1].outside.some(c=>c.uid===marker[0].uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===marker[1].uid),true);
 assertUniversalMatch(packs,s);

 let skip=freshPair(['KJN-1-037','KJN-1-026','KJN-1-010'],['KJN-1-043','KJN-1-041'],43002);
 skip=toPhase(skip,'main');
 readyAp(skip);
 fuel(skip,'KJN-1-026',2);
 const body=put(skip,1,'KJN-1-043','front',0,true);
 const deck=skip.players[1].deck.length;
 const casted=toHand(skip,0,'KJN-1-037');
 skip=cast(skip,casted.uid);
 skip=choose(skip,a=>a.uid===body.uid);
 skip=choose(skip,a=>a.mode==='skip');
 assert.equal(skip.players[1].deck.length,deck);
 let life=toPhase(fresh(['KJN-1-043','KJN-1-041'],43003,'purple'),'attack');
 const hitter=put(life,0,'KJN-1-041','front',0,true);
 const rested=put(life,1,'KJN-1-041','front',0,false);
 setLife(life,1,['KJN-1-043','KJN-1-041']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(bp(life,1,rested.uid),4500);
 assertUniversalMatch(packs,life);
});

test('KJN-1-044 has no effect and its get trigger adds the life card',()=>{
 const ids=['KJN-1-044','KJN-1-041'];
 let s=main(ids,44001,'purple');
 const card=toHand(s,0,'KJN-1-044');
 s=play(s,card.uid);
 assert.equal(s.pending,null);
 let life=toPhase(fresh(ids,44002,'purple'),'attack');
 const hitter=put(life,0,'KJN-1-041','front',0,true);
 setLife(life,1,['KJN-1-044','KJN-1-041']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.cardId==='KJN-1-044'),true);
 assert.equal(life.players[1].outside.some(c=>c.cardId==='KJN-1-044'),false);
 assertUniversalMatch(packs,life);
});

test('KJN-1-045 draws one and must discard one',()=>{
 const ids=['KJN-1-045','KJN-1-041','KJN-1-042'];
 let s=main(ids,45001,'purple');
 fuel(s,'KJN-1-042',1);
 parkHand(s,0);
 const card=toHand(s,0,'KJN-1-045');
 const deck=s.players[0].deck.length;
 s=play(s,card.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s,a=>a.uid===null),false);
 s=choose(s,a=>a.type==='chooseDiscard');
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].outside.length,1);
 assertUniversalMatch(packs,s);
});

test('KJN-1-046 lets the raider take impact or damage, in either order with on play',()=>{
 const ids=['KJN-1-046','KJN-1-048','KJN-1-041','KJN-1-044'];
 let baseFirst=main(ids,46001,'purple');
 fuel(baseFirst,'KJN-1-041',3);
 const base=toHand(baseFirst,0,'KJN-1-046');
 baseFirst=play(baseFirst,base.uid);
 const raider=toHand(baseFirst,0,'KJN-1-048');
 const window=top(baseFirst,0,['KJN-1-044','KJN-1-041']);
 baseFirst=raidOnto(baseFirst,raider.uid,base.uid);
 assert.equal(baseFirst.pending.kind,'raid-effect-order');
 baseFirst=choose(baseFirst,a=>a.mode==='baseFirst');
 assert.equal(baseFirst.pending.step,'raidGrant');
 assert.equal(legal(baseFirst,a=>a.mode==='skip'),false);
 baseFirst=choose(baseFirst,a=>a.mode==='impact');
 const topCard=baseFirst.players[0].front.find(c=>c?.cardId==='KJN-1-048');
 assert.equal(universalImpact(pack,baseFirst,topCard),1);
 assert.equal(baseFirst.pending.step,'takeOne');
 assert.equal(hidden(baseFirst,window.map(c=>c.uid)),true);
 baseFirst=choose(baseFirst,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(baseFirst.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(baseFirst.players[0].outside.some(c=>c.uid===window[1].uid),true);
 assert.equal(baseFirst.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 assert.equal(universalCardEnergy(pack,baseFirst,0,find(baseFirst,0,topCard.uid)),1);
 assertUniversalMatch(packs,baseFirst);

 let entryFirst=main(ids,46002,'purple');
 fuel(entryFirst,'KJN-1-041',3);
 const other=toHand(entryFirst,0,'KJN-1-046');
 entryFirst=play(entryFirst,other.uid);
 const cover=toHand(entryFirst,0,'KJN-1-048');
 top(entryFirst,0,['KJN-1-044','KJN-1-044']);
 entryFirst=raidOnto(entryFirst,cover.uid,other.uid);
 entryFirst=choose(entryFirst,a=>a.mode==='entryFirst');
 assert.equal(entryFirst.pending.step,'takeOne');
 entryFirst=choose(entryFirst,a=>a.mode==='take');
 assert.equal(entryFirst.pending.step,'raidGrant');
 entryFirst=choose(entryFirst,a=>a.mode==='damage');
 const body=entryFirst.players[0].front.find(c=>c?.cardId==='KJN-1-048');
 assert.equal(universalAttackDamage(pack,entryFirst,body),2);
 assert.equal(universalImpact(pack,entryFirst,body),0);
 const plain=put(entryFirst,0,'KJN-1-048','front',1,true);
 assert.equal(universalCardEnergy(pack,entryFirst,0,plain),0);
 assertUniversalMatch(packs,entryFirst);
});

test('KJN-1-047 counts as Sid, loses impact at ten outside, and actives once',()=>{
 const ids=['KJN-1-047','KJN-1-048','KJN-1-041','KJN-1-046','KJN-1-042','KJN-1-044'];
 assert.equal(cardHasName(pack.cards['KJN-1-047'],SID,false),true);
 let raid=main(ids,47001,'purple');
 fuel(raid,'KJN-1-041',3);
 const alias=put(raid,0,'KJN-1-047','front',0,true);
 const notSid=put(raid,0,'KJN-1-041','front',1,true);
 const raider=toHand(raid,0,'KJN-1-048');
 assert.equal(legal(raid,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===alias.uid),true);
 assert.equal(legal(raid,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===notSid.uid),false);
 top(raid,0,['KJN-1-044','KJN-1-042']);
 raid=raidOnto(raid,raider.uid,alias.uid);
 assert.equal(raid.pending.step,'takeOne');
 raid=choose(raid,a=>a.mode==='take');
 assertUniversalMatch(packs,raid);

 let active=main(ids,47002,'purple');
 fuel(active,'KJN-1-041',2);
 fillOutside(active,0,10);
 const first=toHand(active,0,'KJN-1-047');
 active=play(active,first.uid);
 assert.equal(find(active,0,first.uid).ready,false);
 assert.equal(universalImpactNull(pack,active,find(active,0,first.uid)),true);
 assert.equal(active.pending.step,'mayActive');
 active=choose(active,a=>a.mode==='skip');
 assert.equal(find(active,0,first.uid).ready,false);
 const second=toHand(active,0,'KJN-1-047');
 active=play(active,second.uid,'energy');
 assert.equal(active.pending,null);
 const third=toHand(active,0,'KJN-1-047');
 active=play(active,third.uid);
 assert.equal(active.pending,null);
 assert.equal(find(active,0,third.uid).ready,false);

 let used=main(ids,47003,'purple');
 fuel(used,'KJN-1-041',2);
 fillOutside(used,0,10);
 const body=toHand(used,0,'KJN-1-047');
 used=play(used,body.uid);
 used=choose(used,a=>a.mode==='active');
 assert.equal(find(used,0,body.uid).ready,true);
 const later=toHand(used,0,'KJN-1-047');
 used=play(used,later.uid);
 assert.equal(used.pending,null);
 silence(used,find(used,0,body.uid));
 assert.equal(universalImpactNull(pack,used,find(used,0,body.uid)),false);

 let few=main(ids,47004,'purple');
 fuel(few,'KJN-1-041',2);
 fillOutside(few,0,9);
 const short=toHand(few,0,'KJN-1-047');
 few=play(few,short.uid);
 assert.equal(few.pending,null);
 assert.equal(universalImpactNull(pack,few,find(few,0,short.uid)),false);
 let life=toPhase(fresh(ids,47005,'purple'),'attack');
 const hitter=put(life,0,'KJN-1-041','front',0,true);
 toOutside(life,1,'KJN-1-042');
 toOutside(life,1,'KJN-1-046');
 setLife(life,1,['KJN-1-047','KJN-1-041']);
 life=hit(life,hitter.uid);
 assert.equal(life.pending.trigger,'color');
 assert.equal(legal(life,a=>a.mode==='colorOutside'&&a.uid&&life.players[1].outside.find(c=>c.uid===a.uid)?.cardId==='KJN-1-046'),false);
 assert.equal(legal(life,a=>a.mode==='colorOutside'&&life.players[1].outside.some(c=>c.uid===a.uid&&c.cardId==='KJN-1-042')),true);
 life=choose(life,a=>a.mode==='colorOutside'&&life.players[1].outside.some(c=>c.uid===a.uid&&c.cardId==='KJN-1-042'));
 const entered=life.players[1].front.find(c=>c?.cardId==='KJN-1-042');
 assert.equal(entered.ready,true);
 assertUniversalMatch(packs,life);
});

test('KJN-1-048 returns its raid base rested after one optional discard',()=>{
 let s=freshPair(['KJN-1-037','KJN-1-030','KJN-1-026','KJN-1-010'],
  ['KJN-1-048','KJN-1-044','KJN-1-041','KJN-1-042'],48001);
 s=toPhase(s,'main');
 readyAp(s,1,3);
 fuel(s,'KJN-1-026',2,0);
 fuel(s,'KJN-1-041',3,1);
 put(s,0,'KJN-1-030','front',0,true);
 s=passTo(s,1,'main');
 readyAp(s,1,3);
 const base=toHand(s,1,'KJN-1-044');
 s=play(s,base.uid);
 const raider=toHand(s,1,'KJN-1-048');
 top(s,1,['KJN-1-042','KJN-1-041']);
 s=raidOnto(s,raider.uid,base.uid);
 s=choose(s,a=>a.mode==='take');
 s=passTo(s,0,'main');
 readyAp(s,0,3);
 const event=toHand(s,0,'KJN-1-037');
 s=cast(s,event.uid);
 assert.equal(legal(s,a=>a.uid===raider.uid),true);
 s=choose(s,a=>a.mode==='retire'&&a.uid===raider.uid);
 assert.equal(s.pending.step,'pay');
 assert.equal(s.pending.player,1);
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 const payment=s.players[1].hand[0];
 s=choose(s,a=>a.mode==='discard'&&a.uid===payment.uid);
 assert.equal(s.pending.step,'deploy');
 s=choose(s,a=>a.mode==='dest'&&a.uid===base.uid&&a.line==='front');
 const returned=find(s,1,base.uid);
 assert.equal(returned.ready,false);
 assertUniversalMatch(packs,s);

 let skipped=freshPair(['KJN-1-037','KJN-1-030','KJN-1-026','KJN-1-010'],
  ['KJN-1-048','KJN-1-044','KJN-1-041'],48002);
 skipped=toPhase(skipped,'main');
 readyAp(skipped,1,3);
 fuel(skipped,'KJN-1-026',2,0);
 fuel(skipped,'KJN-1-041',3,1);
 put(skipped,0,'KJN-1-030','front',0,true);
 skipped=passTo(skipped,1,'main');
 readyAp(skipped,1,3);
 const root=toHand(skipped,1,'KJN-1-044');
 skipped=play(skipped,root.uid);
 const cover=toHand(skipped,1,'KJN-1-048');
 top(skipped,1,['KJN-1-044','KJN-1-041']);
 skipped=raidOnto(skipped,cover.uid,root.uid);
 skipped=choose(skipped,a=>a.mode==='take');
 parkHand(skipped,1);
 skipped=passTo(skipped,0,'main');
 readyAp(skipped,0,3);
 const killer=toHand(skipped,0,'KJN-1-037');
 skipped=cast(skipped,killer.uid);
 skipped=choose(skipped,a=>a.uid===cover.uid);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].outside.some(c=>c.uid===root.uid),true);
 assert.equal(skipped.players[1].front.some(c=>c?.uid===root.uid),false);
 assertUniversalMatch(packs,skipped);
});

test('KJN-1-049 discounts the next non-raid card and takes distinct printed energies',()=>{
 const ids=['KJN-1-049','KJN-1-044','KJN-1-042','KJN-1-043','KJN-1-045','KJN-1-041','KJN-1-074','KJN-1-070','KJN-1-077','KJN-1-080'];
 let same=main(ids,49001,'purple');
 fuel(same,'KJN-1-041',4);
 const sid=put(same,0,'KJN-1-044','front',0,true);
 const zeroA=toOutside(same,0,'KJN-1-042');
 const zeroB=toOutside(same,0,'KJN-1-043');
 const one=toOutside(same,0,'KJN-1-045');
 for(const id of ['KJN-1-077','KJN-1-077','KJN-1-077','KJN-1-077','KJN-1-080','KJN-1-080','KJN-1-080'])
  toOutside(same,0,id);
 const card=toHand(same,0,'KJN-1-049');
 same=raidOnto(same,card.uid,sid.uid);
 assert.equal(universalImpact(pack,same,find(same,0,card.uid)),1);
 assert.equal(same.pending.step,'recoverEnergy');
 assert.equal(legal(same,a=>a.mode==='done'),true);
 same=choose(same,a=>a.mode==='take'&&a.uid===zeroA.uid);
 assert.equal(legal(same,a=>a.uid===zeroB.uid),false);
 assert.equal(legal(same,a=>a.uid===one.uid),true);
 same=choose(same,a=>a.mode==='take'&&a.uid===one.uid);
 assert.equal(same.players[0].hand.some(c=>c.uid===zeroA.uid),true);
 assert.equal(same.players[0].hand.some(c=>c.uid===one.uid),true);
 assert.equal(same.players[0].outside.some(c=>c.uid===zeroB.uid),true);
 assert.equal(same.pending,null);
 assertUniversalMatch(packs,same);

 let discount=main(ids,49002,'purple');
 fuel(discount,'KJN-1-041',4);
 const base=put(discount,0,'KJN-1-044','front',0,true);
 fillOutside(discount,0,12);
 const shadow=toHand(discount,0,'KJN-1-049');
 readyAp(discount,0,3);
 const before=apReady(discount);
 discount=raidOnto(discount,shadow.uid,base.uid);
 if(discount.pending?.kind==='raid-effect-order')discount=choose(discount,a=>a.mode==='entryFirst');
 if(discount.pending?.step==='recoverEnergy')discount=choose(discount,a=>a.mode==='done');
 if(discount.pending?.step==='raidGrant')discount=choose(discount,a=>a.mode==='impact');
 assert.equal(discount.pending,null);
 assert.equal(apReady(discount),before-1);
 const beta=put(discount,0,'KJN-1-070','front',1,true);
 const raid=toHand(discount,0,'KJN-1-074');
 const readyBeforeRaid=apReady(discount);
 discount=raidOnto(discount,raid.uid,beta.uid);
 if(discount.pending)discount=choose(discount,a=>a.mode==='skip'||a.mode==='done'||a.type==='chooseRaidOrder');
 while(discount.pending)discount=choose(discount,a=>a.mode==='skip'||a.mode==='done'||a.uid===null);
 assert.equal(apReady(discount),readyBeforeRaid-1);
 const free=toHand(discount,0,'KJN-1-042');
 const held=apReady(discount);
 assert.equal(legal(discount,a=>a.type==='play'&&a.uid===free.uid),true);
 discount=play(discount,free.uid);
 assert.equal(apReady(discount),held);
 const paid=toHand(discount,0,'KJN-1-042');
 discount=play(discount,paid.uid);
 assert.equal(apReady(discount),held-1);
 assertUniversalMatch(packs,discount);

 let normal=main(['KJN-1-049','KJN-1-041','KJN-1-042'],49003,'purple');
 fuel(normal,'KJN-1-041',4);
 const plain=toHand(normal,0,'KJN-1-049');
 readyAp(normal,0,2);
 normal=play(normal,plain.uid);
 assert.equal(normal.pending,null);
 assert.equal(universalImpact(pack,normal,find(normal,0,plain.uid)),0);
 const follower=toHand(normal,0,'KJN-1-042');
 const ap=apReady(normal);
 normal=play(normal,follower.uid);
 assert.equal(apReady(normal),ap-1);
 assertUniversalMatch(packs,normal);
});

test('KJN-1-050 gains 1500 BP at ten outside cards',()=>{
 const ids=['KJN-1-050','KJN-1-041'];
 let s=main(ids,50001,'purple');
 const card=put(s,0,'KJN-1-050','front',0,true);
 assert.equal(bp(s,0,card.uid),2000);
 fillOutside(s,0,9);
 assert.equal(bp(s,0,card.uid),2000);
 fillOutside(s,0,10);
 assert.equal(bp(s,0,card.uid),3500);
 silence(s,card);
 assert.equal(bp(s,0,card.uid),2000);
 let life=toPhase(fresh(ids,50002,'purple'),'attack');
 const hitter=put(life,0,'KJN-1-041','front',0,true);
 const rested=put(life,1,'KJN-1-041','front',0,false);
 setLife(life,1,['KJN-1-050','KJN-1-041']);
 life=hit(life,hitter.uid);
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(bp(life,1,rested.uid),4500);
 assertUniversalMatch(packs,life);
});

test('KJN-1-054 publishes only the Seven Shadows card it adds',()=>{
 const ids=['KJN-1-054','KJN-1-057','KJN-1-041','KJN-1-042','KJN-1-077'];
 let s=main(ids,54001,'purple');
 fuel(s,'KJN-1-042',1);
 parkHand(s,0);
 const payment=toHand(s,0,'KJN-1-077');
 const window=top(s,0,['KJN-1-057','KJN-1-041','KJN-1-042']);
 const card=toHand(s,0,'KJN-1-054');
 s=play(s,card.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(hidden(s,[window[1].uid,window[2].uid,window[0].uid]),true);
 assert.equal(legal(s,a=>a.uid===window[0].uid),true);
 assert.equal(legal(s,a=>a.uid===window[1].uid),false);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===window[0].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid||r.uid===window[2].uid),false);
 s=orderTop(s,[window[2].uid,window[1].uid]);
 assert.equal(s.pending.kind,'effect-discard');
 s=choose(s,a=>a.uid===payment.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);

 let miss=main(ids,54002,'purple');
 fuel(miss,'KJN-1-042',1);
 const blanks=top(miss,0,['KJN-1-041','KJN-1-042','KJN-1-077']);
 const other=toHand(miss,0,'KJN-1-054');
 const hand=miss.players[0].hand.length;
 miss=play(miss,other.uid);
 assert.equal(miss.pending.kind,'effect-top-order');
 miss=orderTop(miss,blanks.map(c=>c.uid));
 assert.equal(miss.pending,null);
 assert.equal(miss.players[0].hand.length,hand-1);
 assert.deepEqual(miss.players[0].deck.slice(-3).map(c=>c.uid),blanks.map(c=>c.uid));
 assertUniversalMatch(packs,miss);
});

test('KJN-1-055 discards up to two and draws that many only beside Sid',()=>{
 const ids=['KJN-1-055','KJN-1-044','KJN-1-047','KJN-1-041','KJN-1-042'];
 let none=main(ids,55001,'purple');
 fuel(none,'KJN-1-041',2);
 const lonely=toHand(none,0,'KJN-1-055');
 none=play(none,lonely.uid);
 assert.equal(none.pending,null);
 let sided=main(ids,55002,'purple');
 fuel(sided,'KJN-1-041',3);
 put(sided,0,'KJN-1-044','front',0,true);
 parkHand(sided,0);
 const a=toHand(sided,0,'KJN-1-042');
 const b=toHand(sided,0,'KJN-1-041');
 const card=toHand(sided,0,'KJN-1-055');
 const deck=sided.players[0].deck.length;
 sided=play(sided,card.uid);
 assert.equal(sided.pending.step,'handOut');
 sided=choose(sided,x=>x.mode==='done');
 assert.equal(sided.players[0].deck.length,deck);
 const again=toHand(sided,0,'KJN-1-055');
 const nextDeck=sided.players[0].deck.length;
 sided=play(sided,again.uid);
 sided=choose(sided,x=>x.mode==='out'&&x.uid===a.uid);
 assert.equal(legal(sided,x=>x.mode==='done'),true);
 sided=choose(sided,x=>x.mode==='out'&&x.uid===b.uid);
 assert.equal(sided.players[0].deck.length,nextDeck-2);
 assert.equal(sided.players[0].hand.length,2);
 let muted=main(ids,55003,'purple');
 fuel(muted,'KJN-1-041',2);
 const sid=put(muted,0,'KJN-1-047','front',0,true);
 silence(muted,sid);
 const blocked=toHand(muted,0,'KJN-1-055');
 muted=play(muted,blocked.uid);
 assert.equal(muted.pending,null);
 assertUniversalMatch(packs,muted);
});

test('KJN-1-056 publishes two, takes distinct names, and its main is once per name',()=>{
 const ids=['KJN-1-056','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070','KJN-1-041','KJN-1-051'];
 let look=main(ids,56001,'purple');
 fuel(look,'KJN-1-041',3);
 const base=put(look,0,'KJN-1-052','front',0,true);
 const same=top(look,0,['KJN-1-057','KJN-1-057']);
 const card=toHand(look,0,'KJN-1-056');
 look=raidOnto(look,card.uid,base.uid);
 assert.equal(look.pending.step,'distinctHand');
 assert.equal(look.publicReveals.filter(r=>same.some(c=>c.uid===r.uid)).length,2);
 assert.equal(hidden(look,same.map(c=>c.uid)),false);
 look=choose(look,a=>a.mode==='take'&&a.uid===same[0].uid);
 assert.equal(look.pending,null);
 assert.equal(look.players[0].hand.some(c=>c.uid===same[1].uid),false);
 assert.equal(look.players[0].outside.some(c=>c.uid===same[1].uid),true);
 const body=look.players[0].front.find(c=>c?.cardId==='KJN-1-056');
 look=activate(look,body.uid);
 assert.equal(look.pending,null);
 assert.equal(universalImpact(pack,look,find(look,0,body.uid)),1);
 assert.equal(legal(look,a=>a.type==='activate'&&a.uid===body.uid),false);

 let many=main(ids,56002,'purple');
 fuel(many,'KJN-1-041',4);
 const root=put(many,0,'KJN-1-052','front',0,true);
 const raider=toHand(many,0,'KJN-1-056');
 top(many,0,['KJN-1-057','KJN-1-059']);
 many=raidOnto(many,raider.uid,root.uid);
 if(many.pending?.step==='distinctHand')many=choose(many,a=>a.mode==='done');
 for(let i=0;i<4;i++){
  const sitting=many.players[0].energy[i];
  if(sitting){many.players[0].energy[i]=null;sitting.fieldEntryStamp=null;many.players[0].outside.push(sitting);}
 }
 const names=['KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070'];
 names.forEach((id,i)=>put(many,0,id,i<4?'energy':'front',i<4?i:i-3,true));
 const live=many.players[0].front.find(c=>c?.cardId==='KJN-1-056');
 many=activate(many,live.uid);
 assert.equal(many.pending.step,'buffImpact');
 assert.equal(legal(many,a=>a.mode==='skip'),false);
 const picked=many.players[0].energy.find(c=>c?.cardId==='KJN-1-057');
 many=choose(many,a=>a.mode==='buff'&&a.uid===picked.uid);
 assert.equal(bp(many,0,picked.uid),3000);
 assert.equal(universalImpact(pack,many,find(many,0,picked.uid)),1);
 assert.equal(universalImpact(pack,many,find(many,0,live.uid)),0);
 assert.equal(legal(many,a=>a.type==='activate'&&a.uid===live.uid),false);
 assertUniversalMatch(packs,many);

 let twice=main(ids,56003,'purple');
 for(let i=0;i<4;i++)put(twice,0,'KJN-1-051','energy',i,true);
 fillOutside(twice,0,30);
 assert.ok(purple(twice)>=10,'purple '+purple(twice));
 const firstBase=put(twice,0,'KJN-1-052','front',0,true);
 const first=toHand(twice,0,'KJN-1-056');
 top(twice,0,['KJN-1-041','KJN-1-041']);
 twice=raidOnto(twice,first.uid,firstBase.uid);
 if(twice.pending)twice=choose(twice,a=>a.mode==='done');
 const secondBase=put(twice,0,'KJN-1-052','front',1,true);
 const second=toHand(twice,0,'KJN-1-056');
 top(twice,0,['KJN-1-041','KJN-1-041']);
 twice=raidOnto(twice,second.uid,secondBase.uid);
 if(twice.pending)twice=choose(twice,a=>a.mode==='done');
 const older=twice.players[0].front.find(c=>c?.uid===first.uid);
 twice=activate(twice,older.uid);
 assert.equal(legal(twice,a=>a.type==='activate'&&a.uid===second.uid),false);
 assertUniversalMatch(packs,twice);
});

test('KJN-1-058 buffs one other character, or two when seven names are present',()=>{
 const ids=['KJN-1-058','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070','KJN-1-052','KJN-1-041'];
 let s=main(ids,58001,'purple');
 const self=put(s,0,'KJN-1-058','front',0,true);
 const other=put(s,0,'KJN-1-041','front',1,true);
 s=activate(s,self.uid);
 assert.equal(find(s,0,self.uid).ready,false);
 assert.equal(legal(s,a=>a.mode==='done'),false);
 s=choose(s,a=>a.mode==='buff'&&a.uid===other.uid);
 assert.equal(s.pending,null);
 assert.equal(bp(s,0,other.uid),2500);
 let many=main(ids,58002,'purple');
 const actor=put(many,0,'KJN-1-058','front',0,true);
 const extras=['KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065','KJN-1-067','KJN-1-070'];
 extras.forEach((id,i)=>put(many,0,id,i<3?'front':'energy',i<3?i+1:i-3,true));
 many=activate(many,actor.uid);
 const first=many.players[0].front.find(c=>c?.cardId==='KJN-1-052');
 many=choose(many,a=>a.mode==='buff'&&a.uid===first.uid);
 assert.equal(legal(many,a=>a.mode==='done'),true);
 const second=many.players[0].energy.find(c=>c?.cardId==='KJN-1-070');
 many=choose(many,a=>a.mode==='buff'&&a.uid===second.uid);
 assert.equal(bp(many,0,first.uid),2500);
 assert.equal(bp(many,0,second.uid),3000);
 assert.equal(many.pending,null);
 assertUniversalMatch(packs,many);
});

test('KJN-1-059 orders the top three privately back to the top',()=>{
 const ids=['KJN-1-059','KJN-1-041','KJN-1-042','KJN-1-044'];
 let s=main(ids,59001,'purple');
 const window=top(s,0,['KJN-1-044','KJN-1-042','KJN-1-041']);
 const card=toHand(s,0,'KJN-1-059');
 s=play(s,card.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=orderTop(s,[window[2].uid,window[0].uid,window[1].uid]);
 assert.deepEqual(s.players[0].deck.slice(0,3).map(c=>c.uid),[window[2].uid,window[0].uid,window[1].uid]);
 assert.equal(s.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 assertUniversalMatch(packs,s);
});
