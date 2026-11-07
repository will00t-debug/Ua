import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {effectChoiceProtected,grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalEnergyByColor, universalImpact, universalImpactNull, universalPrivateChoices,
 zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];

function countsFor(required,color){
 const fillers=Object.values(pack.cards).filter(c=>c.id.startsWith('AOT-1-')&&
  c.color===color&&!required.includes(c.id)&&
  !['special','color','final','raid'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const card=pack.cards[id];
  if(card.color!==color)throw Error(id+' is not '+color);
  let copies=4;
  if(card.trigger==='special'||card.trigger==='color'||card.trigger==='final'){
   copies=Math.min(2,4-caps[card.trigger]);
   caps[card.trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function match(own,foe,seed,ownColor='green',foeColor=ownColor){
 return newUniversalMatch(packs,{decks:[countsFor(own,ownColor),countsFor(foe,foeColor)],
  seed,first:0});
}
function fresh(ids,seed,color='green'){return match(ids,ids,seed,color,color);}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function setLife(s,p,ids){
 const life=ids.map(id=>take(s,p,id));
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life=life;
 return life;
}
function clearDeck(s,p){
 while(s.players[p].deck.length)s.players[p].removed.push(s.players[p].deck.pop());
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;}
function pick(s,pred){
 const actions=legalUniversalActions(packs,s);
 const action=actions.find(pred);
 if(!action)throw Error('No legal action in '+s.pending?.kind+'/'+(s.pending?.step||s.phase)+
  ' '+actions.map(a=>a.type+':'+(a.mode||'')+':'+(a.uid||'')).slice(0,10).join(','));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,line='front'){
 return pick(s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
}
function cast(s,uid){return pick(s,a=>a.type==='event'&&a.uid===uid);}
function activate(s,uid){return pick(s,a=>a.type==='activate'&&a.uid===uid);}
function canActivate(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);
}
function canEvent(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
}
function canRaid(s,uid,baseUid){
 return legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===uid&&
  (!baseUid||a.baseUid===baseUid));
}
function raidOnto(s,uid,baseUid){
 return pick(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid&&a.line!=='energy');
}
function stackRaid(s,p,topId,underId,line,slot){
 const top=put(s,p,topId,line,slot,true);
 const under=take(s,p,underId);
 under.faceDown=false;
 under.ready=false;
 top.stack=[under];
 return top;
}
function silence(s,uid,controller=0){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:uid,targetUid:uid,
  until:{player:controller,phase:'attack',edge:'start'},sourceLinked:false});
}
function advance(s,pred,label){
 let guard=0;
 while(!pred(s)){
  if(s.pending?.kind==='end-hand-limit')s=pick(s,a=>a.type==='chooseHandLimit');
  else if(s.pending?.kind==='block')s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
  else if(s.pending)throw Error('Pending '+s.pending.kind+'/'+s.pending.step+' blocked '+label);
  else s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>20)throw Error('Did not reach '+label);
 }
 return s;
}
function toPhase(s,phase){return advance(s,x=>x.phase===phase,phase);}
function toActiveMain(s,p){return advance(s,x=>x.phase==='main'&&x.active===p,'player '+p);}
function ownMainAgain(s){
 const started=s.turn;
 return advance(s,x=>x.phase==='main'&&x.active===0&&x.turn>started,'own main');
}
function finish(s){assertUniversalMatch(packs,s);return s;}
function live(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);}
function bp(s,c){return universalBp(packs,s,c);}
function cardEnergy(s,p,c){return universalCardEnergy(packs,s,p,c);}
function pool(s,p=0){return universalEnergyByColor(packs,s,p);}
function modes(s,mode){return (s.pending?.actions||[]).filter(a=>a.mode===mode);}
function printed(id){return AOT_CARDS.find(c=>c.id===id);}
function orderBottom(s){
 const order=[];
 while(s.pending?.kind==='effect-top-order'){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder'&&!order.includes(a.uid));
  order.push(next.uid);
  s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===next.uid);
 }
 return {s,order};
}
function orderLook(s){
 const clicks=[];
 while(s.pending?.step==='lookOrder'){
  const uid=s.pending.data.left[0];
  clicks.push(uid);
  s=pick(s,a=>a.mode==='next'&&a.uid===uid);
 }
 return {s,clicks};
}
function swing(s,uid){
 s=pick(s,a=>a.type==='attack'&&a.uid===uid&&!a.targetUid);
 if(s.pending?.kind==='block')s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 return s;
}
function revealed(s,uid){return s.publicReveals.some(e=>e.uid===uid);}

test('051 through 075 each have one UA23BT printing',()=>{
 for(let n=51;n<=75;n++){
  const id='AOT-1-'+String(n).padStart(3,'0');
  const card=printed(id);
  assert.equal(card.printings.some(p=>p.number==='UA23BT/'+id),true,id);
  assert.equal(pack.cards[id].name,card.nameJa);
  assert.equal(card.effectJa||'-',card.effectJa||'-');
 }
});

test('051 looks privately, may take zero, reveals only the added card, then discards',()=>{
 let s=toPhase(fresh(['AOT-1-051','AOT-1-054','AOT-1-042','AOT-1-065','AOT-1-052','AOT-1-062'],51051),'main');
 put(s,0,'AOT-1-052','energy',0,true);
 readyAp(s,0,1);
 const window=crown(s,0,['AOT-1-054','AOT-1-042','AOT-1-065']);
 const spare=toHand(s,0,'AOT-1-052');
 const annie=toHand(s,0,'AOT-1-051');
 s=play(s,annie.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,3);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const choices=legalUniversalActions(packs,s).filter(a=>a.uid).map(a=>a.uid);
 assert.deepEqual(choices.sort(),[window[0].uid,window[1].uid].sort());
 assert.equal(choices.includes(window[2].uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),true);
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(revealed(s,window[0].uid),true);
 assert.equal(s.publicReveals.some(e=>e.kind==='revealed-window'&&window.some(w=>w.uid===e.uid)),false);
 assert.equal(revealed(s,window[1].uid),false);
 assert.equal(revealed(s,window[2].uid),false);
 const ordered=orderBottom(s);
 s=ordered.s;
 assert.deepEqual(s.players[0].deck.slice(-ordered.order.length).map(c=>c.uid),ordered.order);
 assert.equal(s.players[0].deck.at(-1).uid,ordered.order.at(-1));
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 finish(s);

 let zero=toPhase(fresh(['AOT-1-051','AOT-1-054','AOT-1-042','AOT-1-065','AOT-1-052','AOT-1-062'],51052),'main');
 put(zero,0,'AOT-1-052','energy',0,true);
 readyAp(zero,0,1);
 const kept=toHand(zero,0,'AOT-1-052');
 crown(zero,0,['AOT-1-065','AOT-1-065','AOT-1-062']);
 zero=play(zero,toHand(zero,0,'AOT-1-051').uid);
 assert.equal(zero.pending.kind,'effect-top-order');
 assert.equal(legalUniversalActions(packs,zero).some(a=>a.uid===null),false);
 zero=orderBottom(zero).s;
 assert.equal(zero.pending,null);
 assert.equal(zero.players[0].hand.some(c=>c.uid===kept.uid),true);
 assert.equal(zero.publicReveals.some(e=>e.kind==='searched-to-hand'),false);
 finish(zero);
});

test('052 adds one green energy only while active on the energy line',()=>{
 let s=toPhase(fresh(['AOT-1-052'],51053),'main');
 const annie=put(s,0,'AOT-1-052','energy',0,true);
 assert.equal(cardEnergy(s,0,annie),2);
 assert.equal(pool(s).green,2);
 annie.ready=false;
 assert.equal(cardEnergy(s,0,s.players[0].energy[0]),1);
 assert.equal(pool(s).green,1);
 const front=put(s,0,'AOT-1-052','front',0,true);
 assert.equal(cardEnergy(s,0,front),0);
 assert.equal(pool(s).red||0,0);
 finish(s);
});

test('053 discounts a hand raid, not a life raid, and returns only its original base',()=>{
 const ids=['AOT-1-053','AOT-1-051','AOT-1-052','AOT-1-054','AOT-1-060','AOT-1-057','AOT-1-042'];
 let paid=toPhase(fresh(ids,51054),'main');
 put(paid,0,'AOT-1-052','energy',0,false);
 put(paid,0,'AOT-1-052','energy',1,false);
 put(paid,0,'AOT-1-052','energy',2,false);
 put(paid,0,'AOT-1-054','energy',3,false);
 const shown=stackRaid(paid,0,'AOT-1-053','AOT-1-051','front',0);
 const base=put(paid,0,'AOT-1-052','front',1,true);
 readyAp(paid,0,1);
 const second=toHand(paid,0,'AOT-1-053');
 const stranger=put(paid,0,'AOT-1-042','front',2,true);
 assert.equal(canRaid(paid,second.uid,base.uid),true);
 assert.equal(canRaid(paid,second.uid,stranger.uid),false);
 silence(paid,shown.uid);
 assert.equal(canRaid(paid,second.uid,base.uid),false);
 finish(paid);

 let bench=toPhase(fresh(ids,51055),'main');
 stackRaid(bench,0,'AOT-1-053','AOT-1-051','energy',0);
 put(bench,0,'AOT-1-052','energy',1,false);
 put(bench,0,'AOT-1-052','energy',2,false);
 put(bench,0,'AOT-1-052','energy',3,false);
 bench.players[0].energy[0].ready=false;
 const frontBase=put(bench,0,'AOT-1-052','front',0,true);
 readyAp(bench,0,1);
 assert.equal(canRaid(bench,toHand(bench,0,'AOT-1-053').uid,frontBase.uid),false);
 finish(bench);

 let life=toPhase(fresh(ids,51056),'attack');
 put(life,1,'AOT-1-052','energy',0,false);
 put(life,1,'AOT-1-052','energy',1,false);
 put(life,1,'AOT-1-052','energy',2,false);
 put(life,1,'AOT-1-052','energy',3,false);
 stackRaid(life,1,'AOT-1-053','AOT-1-051','front',0);
 const hitter=put(life,0,'AOT-1-060','front',0,true);
 setLife(life,1,['AOT-1-053','AOT-1-042']);
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='raid'),false);
 assert.equal(legalUniversalActions(packs,life).some(a=>a.mode==='get'),true);
 life=pick(life,a=>a.mode==='skip');
 finish(life);

 let enough=toPhase(fresh(ids,51057),'attack');
 put(enough,1,'AOT-1-060','energy',0,true);
 put(enough,1,'AOT-1-060','energy',1,true);
 stackRaid(enough,1,'AOT-1-053','AOT-1-051','front',0);
 const host=put(enough,1,'AOT-1-052','front',1,true);
 const attacker=put(enough,0,'AOT-1-060','front',0,true);
 setLife(enough,1,['AOT-1-053','AOT-1-042']);
 enough=swing(enough,attacker.uid);
 assert.equal(legalUniversalActions(packs,enough).some(a=>a.mode==='raid'&&a.baseUid===host.uid),true);
 enough=pick(enough,a=>a.mode==='skip');
 finish(enough);

 let entered=toPhase(fresh(ids,51058),'main');
 put(entered,0,'AOT-1-060','energy',0,true);
 put(entered,0,'AOT-1-060','energy',1,true);
 const origin=put(entered,0,'AOT-1-051','front',0,true);
 const recruit=toHand(entered,0,'AOT-1-054');
 readyAp(entered,0,1);
 const titan=toHand(entered,0,'AOT-1-053');
 entered=raidOnto(entered,titan.uid,origin.uid);
 assert.equal(live(entered,0,titan.uid).ready,true);
 assert.equal(entered.players[0].front.some(c=>c?.uid===titan.uid),true);
 assert.equal(entered.pending.step,'deploy');
 assert.equal(modes(entered,'skip').length,1);
 assert.equal(entered.pending.actions.some(a=>a.uid===recruit.uid&&a.ready===false),true);
 assert.equal(entered.pending.actions.some(a=>a.uid===recruit.uid&&a.line==='energy'),true);
 entered=pick(entered,a=>a.mode==='skip');
 const foe=put(entered,1,'AOT-1-057','front',0,true);
 entered=advance(entered,x=>x.phase==='attack'&&x.active===1,'opponent attack');
 entered=pick(entered,a=>a.type==='attack'&&a.uid===foe.uid&&!a.targetUid);
 entered=pick(entered,a=>a.type==='chooseBlock'&&a.uid===titan.uid);
 assert.equal(entered.pending.step,'baseHand');
 assert.equal(modes(entered,'skip').length,1);
 assert.deepEqual(modes(entered,'take').map(a=>a.uid),[origin.uid]);
 entered=pick(entered,a=>a.mode==='take'&&a.uid===origin.uid);
 assert.equal(entered.players[0].hand.some(c=>c.uid===origin.uid),true);
 assert.equal(entered.players[0].outside.some(c=>c.uid===titan.uid),true);
 finish(entered);
});

test('054 rests, adds green energy this turn, and retires at the end of main',()=>{
 let s=toPhase(fresh(['AOT-1-054'],51059),'main');
 const bert=put(s,0,'AOT-1-054','energy',0,true);
 assert.equal(pool(s).green,1);
 s=activate(s,bert.uid);
 assert.equal(live(s,0,bert.uid).ready,false);
 assert.equal(cardEnergy(s,0,live(s,0,bert.uid)),2);
 assert.equal(pool(s).green,2);
 assert.equal(canActivate(s,bert.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===bert.uid),true);
 assert.equal(pool(s).green||0,0);
 finish(s);

 let front=toPhase(fresh(['AOT-1-054'],51060),'main');
 const standing=put(front,0,'AOT-1-054','front',0,true);
 front=activate(front,standing.uid);
 assert.equal(pool(front).green||0,0);
 assert.equal(live(front,0,standing.uid).ready,false);
 front=dispatchUniversalAction(packs,front,{type:'next'});
 assert.equal(front.players[0].outside.some(c=>c.uid===standing.uid),true);
 finish(front);
});

test('055 draws when generated energy is at least 6 after entry, and its active trigger buffs the chosen character',()=>{
 let s=toPhase(fresh(['AOT-1-055','AOT-1-060','AOT-1-052'],51061),'main');
 put(s,0,'AOT-1-060','energy',0,true);
 put(s,0,'AOT-1-060','energy',1,true);
 readyAp(s,0,1);
 const before=s.players[0].deck.length;
 s=play(s,toHand(s,0,'AOT-1-055').uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-1);
 finish(s);

 let short=toPhase(fresh(['AOT-1-055','AOT-1-060'],51062),'main');
 put(short,0,'AOT-1-060','energy',0,true);
 readyAp(short,0,1);
 const deck=short.players[0].deck.length;
 short=play(short,toHand(short,0,'AOT-1-055').uid,'energy');
 assert.equal(short.pending,null);
 assert.equal(short.players[0].deck.length,deck);
 finish(short);

 let life=toPhase(fresh(['AOT-1-055','AOT-1-060','AOT-1-052'],51063),'attack');
 const hitter=put(life,0,'AOT-1-060','front',0,true);
 const rested=put(life,1,'AOT-1-052','front',0,false);
 setLife(life,1,['AOT-1-055','AOT-1-052']);
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'active');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 assert.equal(live(life,1,rested.uid).ready,true);
 assert.equal(bp(life,live(life,1,rested.uid)),5500);
 finish(life);
});

test('056 generates on the front while rested, and its color trigger plays one legal character',()=>{
 let s=toPhase(fresh(['AOT-1-056','AOT-1-054','AOT-1-060'],51064),'main');
 const front=put(s,0,'AOT-1-056','front',0,false);
 assert.equal(cardEnergy(s,0,front),1);
 assert.equal(pool(s).green,1);
 const line=put(s,0,'AOT-1-056','energy',0,true);
 assert.equal(cardEnergy(s,0,line),1);
 finish(s);

 let color=toPhase(fresh(['AOT-1-056','AOT-1-054','AOT-1-060','AOT-1-052'],51065),'attack');
 const hitter=put(color,0,'AOT-1-060','front',0,true);
 const small=toHand(color,1,'AOT-1-054');
 const big=toHand(color,1,'AOT-1-060');
 setLife(color,1,['AOT-1-056','AOT-1-052']);
 color=swing(color,hitter.uid);
 assert.equal(color.pending.trigger,'color');
 const plays=legalUniversalActions(packs,color).filter(a=>a.mode==='color');
 assert.equal(plays.some(a=>a.uid===small.uid),true);
 assert.equal(plays.some(a=>a.uid===big.uid),false);
 color=pick(color,a=>a.mode==='color'&&a.uid===small.uid&&a.line==='front');
 assert.equal(live(color,1,small.uid).ready,true);
 finish(color);

 let skipped=toPhase(fresh(['AOT-1-056','AOT-1-060','AOT-1-052'],51066),'attack');
 const striker=put(skipped,0,'AOT-1-060','front',0,true);
 setLife(skipped,1,['AOT-1-056','AOT-1-052']);
 skipped.players[1].deck.push(...skipped.players[1].hand.splice(0));
 skipped=swing(skipped,striker.uid);
 assert.equal(legalUniversalActions(packs,skipped).some(a=>a.mode==='color'),false);
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[1].front.filter(Boolean).length,0);
 finish(skipped);
});

test('057 reduces front capacity before the raid box, and the box text needs a face-up raid',()=>{
 const ids=['AOT-1-057','AOT-1-060','AOT-1-054','AOT-1-042','AOT-1-052','AOT-1-067','AOT-1-066'];
 let played=toPhase(fresh(ids,51067),'main');
 put(played,0,'AOT-1-060','energy',0,true);
 put(played,0,'AOT-1-060','energy',1,true);
 put(played,0,'AOT-1-060','energy',2,true);
 put(played,0,'AOT-1-060','energy',3,true);
 const zero=put(played,1,'AOT-1-042','front',0,true);
 readyAp(played,0,1);
 const bert=toHand(played,0,'AOT-1-057');
 played=play(played,bert.uid);
 assert.equal(played.pending,null);
 assert.equal(played.players[0].aotFrontLimit,3);
 assert.equal(played.players[1].front.some(c=>c?.uid===zero.uid),true);
 assert.equal(universalAttackDamage(packs,played,live(played,0,bert.uid)),1);
 assert.equal(universalImpact(packs,played,live(played,0,bert.uid)),0);
 assert.equal(effectChoiceProtected(played,1,bert.uid,'character'),false);
 finish(played);

 let energy=toPhase(fresh(ids,51068),'main');
 put(energy,0,'AOT-1-060','energy',0,true);
 put(energy,0,'AOT-1-060','energy',1,true);
 put(energy,0,'AOT-1-060','energy',2,true);
 put(energy,0,'AOT-1-060','energy',3,true);
 const stayed=put(energy,1,'AOT-1-042','front',0,true);
 readyAp(energy,0,1);
 const parked=toHand(energy,0,'AOT-1-057');
 energy=pick(energy,a=>a.type==='play'&&a.uid===parked.uid&&a.line==='energy');
 assert.equal(energy.pending,null);
 assert.equal(energy.players[0].aotFrontLimit,undefined);
 assert.equal(energy.players[1].front.some(c=>c?.uid===stayed.uid),true);
 finish(energy);

 let raided=toPhase(fresh(ids,51069),'main');
 put(raided,0,'AOT-1-060','energy',0,true);
 put(raided,0,'AOT-1-060','energy',1,true);
 put(raided,0,'AOT-1-060','energy',2,true);
 put(raided,0,'AOT-1-060','energy',3,true);
 const base=put(raided,0,'AOT-1-054','front',0,true);
 const small=put(raided,1,'AOT-1-042','front',0,true);
 const other=put(raided,1,'AOT-1-060','front',1,true);
 readyAp(raided,0,1);
 const top=toHand(raided,0,'AOT-1-057');
 raided=raidOnto(raided,top.uid,base.uid);
 const landed=live(raided,0,top.uid);
 assert.equal(landed.ready,true);
 assert.equal(raided.players[0].front.some(c=>c?.uid===top.uid),true);
 assert.equal(raided.players[1].outside.some(c=>c.uid===small.uid),true);
 assert.equal(raided.players[1].front.some(c=>c?.uid===other.uid),true);
 assert.equal(effectChoiceProtected(raided,1,landed.uid,'character'),true);
 assert.equal(effectChoiceProtected(raided,1,landed.uid,'trigger'),true);
 assert.equal(effectChoiceProtected(raided,1,landed.uid,'unknown'),true);
 assert.equal(effectChoiceProtected(raided,1,landed.uid,'event'),false);
 assert.equal(effectChoiceProtected(raided,1,landed.uid,'field'),false);
 assert.equal(effectChoiceProtected(raided,0,landed.uid,'character'),false);
 assert.equal(universalAttackDamage(packs,raided,landed),3);
 assert.equal(universalImpact(packs,raided,landed),1);
 readyAp(raided,0,1);
 raided=cast(raided,toHand(raided,0,'AOT-1-067').uid);
 assert.equal(raided.pending.step,'green2');
 assert.equal(raided.pending.actions.some(a=>a.uid===landed.uid),true);
 raided=pick(raided,a=>a.uid===landed.uid);
 if(raided.pending?.step==='ready')raided=pick(raided,a=>a.mode==='skip');
 const remembered=raided.turn;
 raided.turn+=1;
 assert.equal(effectChoiceProtected(raided,1,landed.uid,'character'),false);
 raided.turn=remembered;
 finish(raided);

 let later=toPhase(fresh(ids,51074),'main');
 put(later,0,'AOT-1-060','energy',0,true);
 put(later,0,'AOT-1-060','energy',1,true);
 put(later,0,'AOT-1-060','energy',2,true);
 put(later,0,'AOT-1-060','energy',3,true);
 const hostLater=put(later,0,'AOT-1-054','front',0,true);
 readyAp(later,0,1);
 const shielded=toHand(later,0,'AOT-1-057');
 later=raidOnto(later,shielded.uid,hostLater.uid);
 assert.equal(effectChoiceProtected(later,1,shielded.uid,'character'),true);
 later=toActiveMain(later,1);
 const still=live(later,0,shielded.uid);
 assert.equal(still.aotChoiceShield,undefined);
 assert.equal(effectChoiceProtected(later,1,still.uid,'character'),false);
 assert.equal(effectChoiceProtected(later,1,still.uid,'trigger'),false);
 finish(later);

 let skipped=toPhase(fresh(ids,51070),'attack');
 put(skipped,1,'AOT-1-060','energy',0,true);
 put(skipped,1,'AOT-1-060','energy',1,true);
 put(skipped,1,'AOT-1-060','energy',2,true);
 put(skipped,1,'AOT-1-060','energy',3,true);
 const host=put(skipped,1,'AOT-1-054','front',0,true);
 const victim=put(skipped,0,'AOT-1-042','front',0,true);
 const hitter=put(skipped,0,'AOT-1-060','front',1,true);
 setLife(skipped,1,['AOT-1-057','AOT-1-052']);
 skipped=swing(skipped,hitter.uid);
 assert.equal(skipped.pending.trigger,'raid');
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[0].front.some(c=>c?.uid===victim.uid),true);
 assert.equal(live(skipped,1,host.uid).cardId,'AOT-1-054');
 finish(skipped);
});

test('058 has no effect, enters rested, and its get trigger adds the life card',()=>{
 let s=toPhase(fresh(['AOT-1-058','AOT-1-060'],51071),'main');
 readyAp(s,0,1);
 const reiner=toHand(s,0,'AOT-1-058');
 s=play(s,reiner.uid);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,reiner.uid).ready,false);
 finish(s);

 let life=toPhase(fresh(['AOT-1-058','AOT-1-060'],51072),'attack');
 const hitter=put(life,0,'AOT-1-060','front',0,true);
 setLife(life,1,['AOT-1-058','AOT-1-060']);
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'get');
 const uid=life.pending.uid;
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===uid),true);
 assert.equal(life.pending,null);
 finish(life);
});

test('059 gains 1000 BP while generated energy is at least 6 on either turn',()=>{
 let s=toPhase(fresh(['AOT-1-059','AOT-1-060'],51073),'main');
 const one=put(s,0,'AOT-1-060','energy',0,true);
 const reiner=put(s,0,'AOT-1-059','front',0,true);
 assert.equal(bp(s,reiner),3000);
 const two=put(s,0,'AOT-1-060','energy',1,true);
 assert.equal(bp(s,live(s,0,reiner.uid)),4000);
 one.ready=false;
 two.ready=false;
 assert.equal(bp(s,live(s,0,reiner.uid)),4000);
 s=toActiveMain(s,1);
 assert.equal(bp(s,live(s,0,reiner.uid)),4000);
 finish(s);
});

test('060 draws two and must discard one; its get trigger does not discard',()=>{
 let s=toPhase(fresh(['AOT-1-060','AOT-1-052'],51074),'main');
 put(s,0,'AOT-1-060','energy',0,true);
 put(s,0,'AOT-1-060','energy',1,true);
 readyAp(s,0,2);
 const played=toHand(s,0,'AOT-1-060');
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 s=play(s,played.uid);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);
 finish(s);

 let life=toPhase(fresh(['AOT-1-060','AOT-1-052'],51075),'attack');
 const hitter=put(life,0,'AOT-1-060','front',0,true);
 setLife(life,1,['AOT-1-060','AOT-1-052','AOT-1-052']);
 const before=life.players[1].hand.length;
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'get');
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.length,before+1);
 assert.equal(life.pending,null);
 finish(life);
});

 test('061 taxes a face-up raid selection and its impact text stays in the raid box',()=>{
 const ids=['AOT-1-061','AOT-1-058','AOT-1-048','AOT-1-066','AOT-1-060','AOT-1-042','AOT-1-052'];
 let onto=toPhase(fresh(ids,51161),'main');
 put(onto,0,'AOT-1-060','energy',0,true);
 put(onto,0,'AOT-1-060','energy',1,true);
 put(onto,0,'AOT-1-052','energy',2,true);
 const reiner=put(onto,0,'AOT-1-058','front',0,true);
 const other=put(onto,0,'AOT-1-042','front',1,true);
 readyAp(onto,0,1);
 const armorHand=toHand(onto,0,'AOT-1-061');
 assert.equal(canRaid(onto,armorHand.uid,reiner.uid),true);
 assert.equal(canRaid(onto,armorHand.uid,other.uid),false);
 onto=raidOnto(onto,armorHand.uid,reiner.uid);
 assert.equal(onto.pending,null);
 assert.equal(live(onto,0,armorHand.uid).ready,true);
 assert.equal(onto.players[0].front.some(c=>c?.uid===armorHand.uid),true);
 assert.equal(universalImpact(packs,onto,live(onto,0,armorHand.uid)),1);
 finish(onto);

 let open=toPhase(fresh(ids,51076),'main');
 put(open,0,'AOT-1-060','energy',0,true);
 put(open,0,'AOT-1-060','energy',1,true);
 put(open,0,'AOT-1-048','front',0,true);
 const plain=put(open,1,'AOT-1-061','front',0,true);
 readyAp(open,0,1);
 assert.equal(universalImpact(packs,open,plain),0);
 assert.equal(universalImpactNull(packs,open,plain),false);
 open=cast(open,toHand(open,0,'AOT-1-066').uid);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.mode==='retire'&&a.uid===plain.uid),true);
 finish(open);

 let taxed=toPhase(fresh(ids,51077),'main');
 put(taxed,0,'AOT-1-060','energy',0,true);
 put(taxed,0,'AOT-1-060','energy',1,true);
 put(taxed,0,'AOT-1-048','front',0,true);
 const hidden=stackRaid(taxed,1,'AOT-1-061','AOT-1-058','front',0);
 put(taxed,1,'AOT-1-042','front',1,true);
 readyAp(taxed,0,1);
 assert.equal(universalImpact(packs,taxed,hidden),1);
 assert.equal(universalImpactNull(packs,taxed,hidden),true);
 assert.equal(universalAttackDamage(packs,taxed,hidden),1);
 taxed=cast(taxed,toHand(taxed,0,'AOT-1-066').uid);
 assert.equal(legalUniversalActions(packs,taxed).some(a=>a.uid===hidden.uid),false);
 assert.equal(legalUniversalActions(packs,taxed).some(a=>a.mode==='retire'),true);
 finish(taxed);

 let paid=toPhase(fresh(ids,51078),'main');
 put(paid,0,'AOT-1-060','energy',0,true);
 put(paid,0,'AOT-1-060','energy',1,true);
 put(paid,0,'AOT-1-048','front',0,true);
 const armor=stackRaid(paid,1,'AOT-1-061','AOT-1-058','front',0);
 readyAp(paid,0,2);
 paid=cast(paid,toHand(paid,0,'AOT-1-066').uid);
 assert.equal(apReady(paid),1);
 paid=pick(paid,a=>a.mode==='retire'&&a.uid===armor.uid);
 assert.equal(apReady(paid),0);
 assert.equal(paid.players[1].outside.some(c=>c.uid===armor.uid),true);
 finish(paid);

 let trigger=toPhase(fresh(ids,51079),'attack');
 const mine=stackRaid(trigger,0,'AOT-1-061','AOT-1-058','front',0);
 const hitter=put(trigger,0,'AOT-1-060','front',1,true);
 readyAp(trigger,1,1);
 setLife(trigger,1,['AOT-1-066','AOT-1-052','AOT-1-052']);
 trigger=swing(trigger,hitter.uid);
 assert.equal(trigger.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,trigger).some(a=>a.mode==='special'&&a.uid===mine.uid),true);
 trigger=pick(trigger,a=>a.mode==='special'&&a.uid===mine.uid);
 assert.equal(apReady(trigger,1),1);
 assert.equal(trigger.players[0].outside.some(c=>c.uid===mine.uid),true);
 finish(trigger);
});

test('062 rests, discards one, and adds one green energy this turn without retiring',()=>{
 let s=toPhase(fresh(['AOT-1-062','AOT-1-052'],51080),'main');
 const forest=put(s,0,'AOT-1-062','energy',0,true);
 const spare=toHand(s,0,'AOT-1-052');
 assert.equal(cardEnergy(s,0,forest),2);
 s=activate(s,forest.uid);
 assert.equal(s.pending.step,'discard');
 assert.equal(modes(s,'skip').length,0);
 s=pick(s,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,forest.uid).ready,false);
 assert.equal(cardEnergy(s,0,live(s,0,forest.uid)),3);
 assert.equal(pool(s).green,3);
 assert.equal(canActivate(s,forest.uid),false);
 s=ownMainAgain(s);
 assert.equal(cardEnergy(s,0,live(s,0,forest.uid)),2);
 assert.equal(canActivate(s,forest.uid),true);
 finish(s);

});

test('063 takes one privately, orders the rest, then may ready only for the printed cards',()=>{
 const ids=['AOT-1-063','AOT-1-042','AOT-1-054','AOT-1-052','AOT-1-065','AOT-1-037','AOT-1-048'];
 let s=toPhase(fresh(ids,51082),'main');
 put(s,0,'AOT-1-052','energy',0,true);
 readyAp(s,0,2);
 s.players[0].apCards[1].ready=false;
 const window=crown(s,0,['AOT-1-042','AOT-1-054','AOT-1-052','AOT-1-065']);
 const event=toHand(s,0,'AOT-1-063');
 s=cast(s,event.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(modes(s,'done').length,0);
 assert.equal(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid).join(),window.map(c=>c.uid).join());
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(window.every(c=>!revealed(s,c.uid)),true);
 s=pick(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.pending.step,'lookOrder');
 assert.equal(revealed(s,window[0].uid),true);
 assert.equal(revealed(s,window[1].uid),false);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const ordered=orderLook(s);
 s=ordered.s;
 assert.equal(s.players[0].deck.at(-1).uid,ordered.clicks[0]);
 assert.equal(s.pending.step,'ready');
 assert.equal(modes(s,'skip').length,1);
 s=pick(s,a=>a.mode==='ready'&&a.uid===s.players[0].apCards[1].uid);
 assert.equal(s.players[0].apCards[1].ready,true);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);
 finish(s);

 let other=toPhase(fresh(ids,51083),'main');
 put(other,0,'AOT-1-052','energy',0,true);
 readyAp(other,0,1);
 const plain=crown(other,0,['AOT-1-054','AOT-1-052','AOT-1-065','AOT-1-065']);
 other=cast(other,toHand(other,0,'AOT-1-063').uid);
 other=pick(other,a=>a.mode==='take'&&a.uid===plain[0].uid);
 other=orderLook(other).s;
 assert.equal(other.pending,null);
 finish(other);

 let rod=toPhase(fresh(ids,51084),'main');
 put(rod,0,'AOT-1-052','energy',0,true);
 readyAp(rod,0,2);
 rod.players[0].apCards[1].ready=false;
 const named=crown(rod,0,['AOT-1-037','AOT-1-054','AOT-1-052','AOT-1-065']);
 rod=cast(rod,toHand(rod,0,'AOT-1-063').uid);
 rod=pick(rod,a=>a.mode==='take'&&a.uid===named[0].uid);
 rod=orderLook(rod).s;
 assert.equal(rod.pending.step,'ready');
 rod=pick(rod,a=>a.mode==='skip');
 finish(rod);

 let zeke=toPhase(fresh(ids,51085),'main');
 put(zeke,0,'AOT-1-052','energy',0,true);
 readyAp(zeke,0,1);
 const beast=crown(zeke,0,['AOT-1-048']);
 while(zeke.players[0].deck.length>1)zeke.players[0].removed.push(zeke.players[0].deck.pop());
 zeke=cast(zeke,toHand(zeke,0,'AOT-1-063').uid);
 zeke=pick(zeke,a=>a.mode==='take'&&a.uid===beast[0].uid);
 assert.equal(zeke.pending.step,'ready');
 zeke=pick(zeke,a=>a.mode==='skip');
 finish(zeke);

 let empty=toPhase(fresh(ids,51086),'main');
 put(empty,0,'AOT-1-052','energy',0,true);
 readyAp(empty,0,1);
 clearDeck(empty,0);
 const blocked=toHand(empty,0,'AOT-1-063');
 assert.equal(canEvent(empty,blocked.uid),false);
 finish(empty);
});

test('064 may stop at one search, does both bullets in order, and orders the two on-play effects',()=>{
 const ids=['AOT-1-064','AOT-1-053','AOT-1-057','AOT-1-051','AOT-1-054','AOT-1-055',
  'AOT-1-056','AOT-1-060','AOT-1-062','AOT-1-052','AOT-1-042','AOT-1-065','AOT-1-066','AOT-1-067'];
 let choice=toPhase(fresh(ids,51087),'main');
 put(choice,0,'AOT-1-055','energy',0,true);
 put(choice,0,'AOT-1-062','energy',1,true);
 put(choice,0,'AOT-1-052','energy',2,true);
 put(choice,0,'AOT-1-052','energy',3,true);
 put(choice,0,'AOT-1-056','front',0,true);
 readyAp(choice,0,2);
 const window=crown(choice,0,['AOT-1-054','AOT-1-051','AOT-1-065','AOT-1-066','AOT-1-067','AOT-1-065','AOT-1-066']);
 choice=cast(choice,toHand(choice,0,'AOT-1-064').uid);
 assert.equal(choice.pending.step,'mode64');
 choice=pick(choice,a=>a.mode==='mode'&&a.key==='a');
 assert.equal(choice.pending.step,'lookPick');
 assert.equal(modes(choice,'done').length,1);
 const takes=modes(choice,'take').map(a=>a.uid);
 assert.deepEqual(takes.sort(),[window[0].uid,window[1].uid].sort());
 choice=pick(choice,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(choice.pending.step,'lookPick');
 assert.equal(modes(choice,'done').length,1);
 assert.equal(modes(choice,'take').some(a=>a.uid===window[1].uid),true);
 choice=pick(choice,a=>a.mode==='done');
 choice=orderLook(choice).s;
 assert.equal(choice.pending,null);
 assert.equal(choice.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(choice.players[0].hand.some(c=>c.uid===window[1].uid),false);
 assert.equal(revealed(choice,window[1].uid),false);
 finish(choice);

 let none=toPhase(fresh(ids,51088),'main');
 put(none,0,'AOT-1-055','energy',0,true);
 put(none,0,'AOT-1-062','energy',1,true);
 put(none,0,'AOT-1-052','energy',2,true);
 put(none,0,'AOT-1-052','energy',3,true);
 put(none,0,'AOT-1-056','front',0,true);
 readyAp(none,0,2);
 const held=[...none.players[0].hand];
 for(const c of held){
  const d=pack.cards[c.cardId];
  if(d.type==='character'&&d.color==='green'&&d.energy>=4&&d.ap===1){
   none.players[0].hand.splice(none.players[0].hand.indexOf(c),1);
   none.players[0].deck.push(c);
  }
 }
 none=cast(none,toHand(none,0,'AOT-1-064').uid);
 none=pick(none,a=>a.key==='b');
 assert.equal(none.pending,null);
 finish(none);

 let both=toPhase(fresh(ids,51089),'main');
 put(both,0,'AOT-1-055','energy',0,true);
 put(both,0,'AOT-1-062','energy',1,true);
 put(both,0,'AOT-1-060','energy',2,true);
 put(both,0,'AOT-1-052','energy',3,true);
 const annie=put(both,0,'AOT-1-051','front',0,true);
 const bert=put(both,0,'AOT-1-054','front',1,true);
 readyAp(both,0,2);
 const recruit=toHand(both,0,'AOT-1-052');
 const female=toHand(both,0,'AOT-1-053');
 const colossal=toHand(both,0,'AOT-1-057');
 const looked=crown(both,0,['AOT-1-065','AOT-1-066','AOT-1-067','AOT-1-065','AOT-1-066','AOT-1-067','AOT-1-067']);
 const zero=put(both,1,'AOT-1-042','front',0,true);
 both=cast(both,toHand(both,0,'AOT-1-064').uid);
 assert.equal(both.pending.step,'lookOrder');
 assert.equal(universalPrivateChoices(packs,both,1),null);
 both=orderLook(both).s;
 assert.equal(both.pending.step,'pair64');
 assert.equal(both.players[0].hand.some(c=>looked.some(c2=>c2.uid===c.uid)),false);
 both=pick(both,a=>a.mode==='raid'&&a.uid===female.uid&&a.baseUid===annie.uid&&a.line==='front');
 both=pick(both,a=>a.mode==='raid'&&a.uid===colossal.uid&&a.baseUid===bert.uid&&a.line==='front');
 assert.equal(both.pending.step,'entryOrder');
 assert.equal(both.players[1].front.some(c=>c?.uid===zero.uid),true);
 both=pick(both,a=>a.mode==='first'&&a.uid===colossal.uid);
 assert.equal(both.players[1].outside.some(c=>c.uid===zero.uid),true);
 assert.equal(both.pending.step,'deploy');
 assert.equal(both.pending.actions.some(a=>a.uid===recruit.uid),true);
 both=pick(both,a=>a.mode==='skip');
 assert.equal(both.pending,null);
 finish(both);

 let reverse=toPhase(fresh(ids,51090),'main');
 put(reverse,0,'AOT-1-055','energy',0,true);
 put(reverse,0,'AOT-1-062','energy',1,true);
 put(reverse,0,'AOT-1-060','energy',2,true);
 put(reverse,0,'AOT-1-052','energy',3,true);
 const annie2=put(reverse,0,'AOT-1-051','front',0,true);
 const bert2=put(reverse,0,'AOT-1-054','front',1,true);
 readyAp(reverse,0,2);
 toHand(reverse,0,'AOT-1-052');
 const female2=toHand(reverse,0,'AOT-1-053');
 const colossal2=toHand(reverse,0,'AOT-1-057');
 clearDeck(reverse,0);
 const still=put(reverse,1,'AOT-1-042','front',0,true);
 reverse=cast(reverse,toHand(reverse,0,'AOT-1-064').uid);
 assert.equal(reverse.pending.step,'pair64');
 reverse=pick(reverse,a=>a.mode==='raid'&&a.uid===female2.uid&&a.baseUid===annie2.uid&&a.line==='front');
 reverse=pick(reverse,a=>a.mode==='raid'&&a.uid===colossal2.uid&&a.baseUid===bert2.uid&&a.line==='front');
 assert.equal(reverse.pending.step,'entryOrder');
 reverse=pick(reverse,a=>a.mode==='first'&&a.uid===female2.uid);
 assert.equal(reverse.pending.step,'deploy');
 assert.equal(reverse.players[1].front.some(c=>c?.uid===still.uid),true);
 reverse=pick(reverse,a=>a.mode==='skip');
 assert.equal(reverse.players[1].outside.some(c=>c.uid===still.uid),true);
 assert.equal(reverse.pending,null);
 finish(reverse);

 let special=toPhase(fresh(ids,51091),'attack');
 const hitter=put(special,0,'AOT-1-060','front',0,true);
 const victim=put(special,0,'AOT-1-057','front',1,true);
 setLife(special,1,['AOT-1-064','AOT-1-052','AOT-1-052','AOT-1-052']);
 special=swing(special,hitter.uid);
 assert.equal(special.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,special).some(a=>a.mode==='skip'),true);
 special=pick(special,a=>a.mode==='special'&&a.uid===victim.uid);
 assert.equal(special.players[0].outside.some(c=>c.uid===victim.uid),true);
 finish(special);
});

test('065 readies up to two AP, and the final trigger places a life only when none remain',()=>{
 let s=toPhase(fresh(['AOT-1-065','AOT-1-060'],51092),'main');
 put(s,0,'AOT-1-060','energy',0,true);
 put(s,0,'AOT-1-060','energy',1,true);
 readyAp(s,0,3);
 s.players[0].apCards[1].ready=false;
 s.players[0].apCards[2].ready=false;
 s=cast(s,toHand(s,0,'AOT-1-065').uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 finish(s);

 let one=toPhase(fresh(['AOT-1-065','AOT-1-060'],51093),'main');
 put(one,0,'AOT-1-060','energy',0,true);
 put(one,0,'AOT-1-060','energy',1,true);
 readyAp(one,0,3);
 one.players[0].apCards[1].ready=false;
 one.players[0].apCards[2].ready=false;
 one=cast(one,toHand(one,0,'AOT-1-065').uid);
 one=pick(one,a=>a.type==='chooseApRecovery'&&a.uid===one.players[0].apCards[1].uid);
 assert.equal(one.pending.remaining,1);
 one=pick(one,a=>a.type==='chooseApRecovery'&&a.uid===one.players[0].apCards[2].uid);
 assert.equal(one.pending,null);
 assert.equal(one.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,2);
 finish(one);

 let early=toPhase(fresh(['AOT-1-065','AOT-1-060','AOT-1-052'],51094),'attack');
 const hitter=put(early,0,'AOT-1-060','front',0,true);
 setLife(early,1,['AOT-1-065','AOT-1-052']);
 const top=early.players[1].deck[0];
 early=swing(early,hitter.uid);
 assert.equal(early.pending,null);
 assert.equal(early.players[1].life.length,1);
 assert.equal(early.players[1].life.some(c=>c.uid===top.uid),false);
 assert.equal(early.players[1].outside.some(c=>c.cardId==='AOT-1-065'),true);
 finish(early);

 let last=toPhase(fresh(['AOT-1-065','AOT-1-060','AOT-1-052'],51095),'attack');
 const striker=put(last,0,'AOT-1-060','front',0,true);
 setLife(last,1,['AOT-1-065']);
 const incoming=last.players[1].deck[0];
 last=swing(last,striker.uid);
 assert.equal(last.pending.trigger,'final');
 assert.equal(last.players[1].life.length,0);
 assert.equal(last.winner,null);
 last=pick(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life.some(c=>c.uid===incoming.uid),true);
 assert.equal(last.winner,null);
 finish(last);
});

test('066 must retire one front at the printed BP, and its special trigger is separate',()=>{
 const ids=['AOT-1-066','AOT-1-060','AOT-1-059','AOT-1-048','AOT-1-061','AOT-1-057','AOT-1-052'];
 let none=toPhase(fresh(ids,51096),'main');
 put(none,0,'AOT-1-060','energy',0,true);
 put(none,0,'AOT-1-060','energy',1,true);
 readyAp(none,0,1);
 put(none,1,'AOT-1-060','front',0,true);
 const blocked=toHand(none,0,'AOT-1-066');
 assert.equal(canEvent(none,blocked.uid),false);
 finish(none);

 let low=toPhase(fresh(ids,51097),'main');
 put(low,0,'AOT-1-060','energy',0,true);
 put(low,0,'AOT-1-060','energy',1,true);
 readyAp(low,0,1);
 const at3000=put(low,1,'AOT-1-059','front',0,true);
 const at4000=put(low,1,'AOT-1-060','front',1,true);
 low=cast(low,toHand(low,0,'AOT-1-066').uid);
 assert.equal(modes(low,'skip').length,0);
 assert.equal(modes(low,'retire').some(a=>a.uid===at3000.uid),true);
 assert.equal(modes(low,'retire').some(a=>a.uid===at4000.uid),false);
 low=pick(low,a=>a.mode==='retire'&&a.uid===at3000.uid);
 assert.equal(low.players[1].outside.some(c=>c.uid===at3000.uid),true);
 finish(low);

 let named=toPhase(fresh(ids,51098),'main');
 put(named,0,'AOT-1-060','energy',0,true);
 put(named,0,'AOT-1-060','energy',1,true);
 put(named,0,'AOT-1-048','front',0,true);
 readyAp(named,0,1);
 silence(named,named.players[0].front[0].uid);
 const at5000=put(named,1,'AOT-1-061','front',0,true);
 const at6000=put(named,1,'AOT-1-057','front',1,true);
 named=cast(named,toHand(named,0,'AOT-1-066').uid);
 assert.equal(modes(named,'skip').length,0);
 assert.equal(modes(named,'retire').some(a=>a.uid===at5000.uid),true);
 assert.equal(modes(named,'retire').some(a=>a.uid===at6000.uid),false);
 named=pick(named,a=>a.mode==='retire'&&a.uid===at5000.uid);
 finish(named);

 let special=toPhase(fresh(ids,51099),'attack');
 const hitter=put(special,0,'AOT-1-060','front',0,true);
 const huge=put(special,0,'AOT-1-057','front',1,true);
 setLife(special,1,['AOT-1-066','AOT-1-052','AOT-1-052']);
 special=swing(special,hitter.uid);
 assert.equal(special.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,special).some(a=>a.mode==='skip'),true);
 special=pick(special,a=>a.mode==='special'&&a.uid===huge.uid);
 assert.equal(special.players[0].outside.some(c=>c.uid===huge.uid),true);
 finish(special);
});

test('067 must buff one field card by two green energy, once per name, and readies only with Bertolt',()=>{
 const ids=['AOT-1-067','AOT-1-060','AOT-1-052','AOT-1-054'];
 let s=toPhase(fresh(ids,51100),'main');
 put(s,0,'AOT-1-060','energy',0,true);
 put(s,0,'AOT-1-060','energy',1,true);
 put(s,0,'AOT-1-060','energy',2,true);
 const target=put(s,0,'AOT-1-052','energy',3,false);
 readyAp(s,0,2);
 s.players[0].apCards[1].ready=false;
 s=cast(s,toHand(s,0,'AOT-1-067').uid);
 assert.equal(s.pending.step,'green2');
 assert.equal(modes(s,'skip').length,0);
 s=pick(s,a=>a.mode==='buff'&&a.uid===target.uid);
 assert.equal(s.pending,null);
 assert.equal(cardEnergy(s,0,live(s,0,target.uid)),3);
 const second=toHand(s,0,'AOT-1-067');
 assert.equal(canEvent(s,second.uid),false);
 s=ownMainAgain(s);
 assert.equal(live(s,0,target.uid).ready,true);
 assert.equal(cardEnergy(s,0,live(s,0,target.uid)),2);
 finish(s);

 let bert=toPhase(fresh(ids,51101),'main');
 put(bert,0,'AOT-1-060','energy',0,true);
 put(bert,0,'AOT-1-060','energy',1,true);
 put(bert,0,'AOT-1-060','energy',2,true);
 put(bert,0,'AOT-1-054','front',0,true);
 const line=put(bert,0,'AOT-1-052','energy',3,false);
 readyAp(bert,0,2);
 bert.players[0].apCards[1].ready=false;
 bert=cast(bert,toHand(bert,0,'AOT-1-067').uid);
 bert=pick(bert,a=>a.mode==='buff'&&a.uid===line.uid);
 assert.equal(bert.pending.step,'ready');
 assert.equal(modes(bert,'skip').length,1);
 bert=pick(bert,a=>a.mode==='ready'&&a.uid===bert.players[0].apCards[1].uid);
 assert.equal(bert.players[0].apCards[1].ready,true);
 assert.equal(cardEnergy(bert,0,live(bert,0,line.uid)),3);
 finish(bert);
});

test('068 adds red energy for this turn and retires at the end of main',()=>{
 let s=toPhase(fresh(['AOT-1-068'],51102,'red'),'main');
 const carla=put(s,0,'AOT-1-068','energy',0,true);
 s=activate(s,carla.uid);
 assert.equal(cardEnergy(s,0,live(s,0,carla.uid)),2);
 assert.equal(pool(s).red,2);
 assert.equal(pool(s).green||0,0);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].outside.some(c=>c.uid===carla.uid),true);
 finish(s);

 let front=toPhase(fresh(['AOT-1-068'],51103,'red'),'main');
 const standing=put(front,0,'AOT-1-068','front',0,true);
 front=activate(front,standing.uid);
 assert.equal(pool(front).red||0,0);
 front=dispatchUniversalAction(packs,front,{type:'next'});
 assert.equal(front.players[0].outside.some(c=>c.uid===standing.uid),true);
 finish(front);
});

test('069 draws only when another Titan heir is on the field',()=>{
 let s=toPhase(fresh(['AOT-1-069','AOT-1-068','AOT-1-071'],51104,'red'),'main');
 put(s,0,'AOT-1-068','energy',0,true);
 put(s,0,'AOT-1-068','energy',1,true);
 put(s,0,'AOT-1-068','energy',2,true);
 readyAp(s,0,1);
 const hange=toHand(s,0,'AOT-1-069');
 const deck=s.players[0].deck.length;
 s=play(s,hange.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 finish(s);

 let heir=toPhase(fresh(['AOT-1-069','AOT-1-074','AOT-1-071'],51105,'red'),'main');
 put(heir,0,'AOT-1-074','energy',0,true);
 put(heir,0,'AOT-1-074','energy',1,true);
 put(heir,0,'AOT-1-071','front',0,true);
 readyAp(heir,0,1);
 const hange2=toHand(heir,0,'AOT-1-069');
 const before=heir.players[0].deck.length;
 heir=play(heir,hange2.uid);
 assert.equal(heir.pending,null);
 assert.equal(heir.players[0].deck.length,before-1);
 finish(heir);

 let life=toPhase(fresh(['AOT-1-069','AOT-1-074','AOT-1-071'],51106,'red'),'attack');
 const hitter=put(life,0,'AOT-1-074','front',0,true);
 const rested=put(life,1,'AOT-1-071','front',0,false);
 setLife(life,1,['AOT-1-069','AOT-1-074']);
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'active');
 life=pick(life,a=>a.mode==='skip');
 assert.equal(live(life,1,rested.uid).ready,false);
 finish(life);
});

test('070 must bounce another energy-1-or-less character, or itself when none exists',()=>{
 let s=toPhase(fresh(['AOT-1-070','AOT-1-068','AOT-1-074'],51107,'red'),'main');
 const other=put(s,0,'AOT-1-068','front',0,true);
 const high=put(s,0,'AOT-1-074','energy',0,true);
 readyAp(s,0,1);
 const hannes=toHand(s,0,'AOT-1-070');
 s=play(s,hannes.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===other.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===high.uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===hannes.uid),false);
 s=pick(s,a=>a.type==='chooseOwnBounce'&&a.uid===other.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(live(s,0,hannes.uid).cardId,'AOT-1-070');
 finish(s);

 let self=toPhase(fresh(['AOT-1-070','AOT-1-074'],51108,'red'),'main');
 const stayed=put(self,0,'AOT-1-074','energy',0,true);
 readyAp(self,0,1);
 const bounced=toHand(self,0,'AOT-1-070');
 self=play(self,bounced.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===bounced.uid),true);
 assert.equal(live(self,0,stayed.uid).cardId,'AOT-1-074');
 finish(self);
});

test('071 activates only with Grisha, then rests, retires, draws two and discards one',()=>{
 let closed=toPhase(fresh(['AOT-1-071','AOT-1-072','AOT-1-074'],51109,'red'),'main');
 const lone=put(closed,0,'AOT-1-071','energy',0,true);
 assert.equal(canActivate(closed,lone.uid),false);
 finish(closed);

 let s=toPhase(fresh(['AOT-1-071','AOT-1-072','AOT-1-074'],51110,'red'),'main');
 const kruger=put(s,0,'AOT-1-071','front',0,true);
 const grisha=put(s,0,'AOT-1-072','front',1,true);
 silence(s,grisha.uid);
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 s=activate(s,kruger.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===kruger.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.kind,'aot');
 assert.equal(s.pending.step,'discard');
 assert.equal(modes(s,'skip').length,0);
 s=pick(s,a=>a.mode==='discard');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(live(s,0,grisha.uid).cardId,'AOT-1-072');
 finish(s);
});

test('072 looks privately, may take zero, orders the rest, and discards only after adding',()=>{
 const ids=['AOT-1-072','AOT-1-092','AOT-1-098','AOT-1-075','AOT-1-073','AOT-1-071','AOT-1-074'];
 let s=toPhase(fresh(ids,51111,'red'),'main');
 put(s,0,'AOT-1-074','energy',0,true);
 readyAp(s,0,1);
 const window=crown(s,0,['AOT-1-092','AOT-1-098','AOT-1-075','AOT-1-073','AOT-1-071']);
 const spare=toHand(s,0,'AOT-1-074');
 s=play(s,toHand(s,0,'AOT-1-072').uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,5);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const takes=modes(s,'take').map(a=>a.uid);
 assert.deepEqual(takes.sort(),[window[0].uid,window[1].uid].sort());
 assert.equal(window.slice(2).every(c=>universalPrivateChoices(packs,s,0).inspected.some(x=>x.uid===c.uid)),true);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending.step,'lookOrder');
 const declined=orderLook(s);
 s=declined.s;
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,declined.clicks[0]);
 assert.equal(s.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(s.publicReveals.some(e=>window.some(w=>w.uid===e.uid)),false);
 finish(s);

 let taken=toPhase(fresh(ids,51112,'red'),'main');
 put(taken,0,'AOT-1-074','energy',0,true);
 readyAp(taken,0,1);
 const cards=crown(taken,0,['AOT-1-075','AOT-1-092','AOT-1-073','AOT-1-071','AOT-1-098']);
 const extra=toHand(taken,0,'AOT-1-074');
 taken=play(taken,toHand(taken,0,'AOT-1-072').uid);
 taken=pick(taken,a=>a.mode==='take'&&a.uid===cards[1].uid);
 assert.equal(taken.pending.step,'lookOrder');
 assert.equal(revealed(taken,cards[1].uid),true);
 assert.equal(revealed(taken,cards[4].uid),false);
 taken=orderLook(taken).s;
 assert.equal(taken.pending.step,'discard');
 assert.equal(modes(taken,'skip').length,0);
 assert.equal(taken.players[0].deck.at(-1).uid!==undefined,true);
 taken=pick(taken,a=>a.mode==='discard'&&a.uid===extra.uid);
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===cards[1].uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===extra.uid),true);
 finish(taken);
});

test('073 enters active, readies after the first attack only, and its draw trigger does not discard',()=>{
 let s=toPhase(fresh(['AOT-1-073','AOT-1-074','AOT-1-068'],51113,'red'),'main');
 put(s,0,'AOT-1-074','energy',0,true);
 put(s,0,'AOT-1-074','energy',1,true);
 put(s,0,'AOT-1-074','energy',2,true);
 readyAp(s,0,2);
 const levi=toHand(s,0,'AOT-1-073');
 s=play(s,levi.uid);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,levi.uid).ready,true);
 s=toPhase(s,'attack');
 setLife(s,1,['AOT-1-068','AOT-1-068','AOT-1-068']);
 s=swing(s,levi.uid);
 assert.equal(live(s,0,levi.uid).ready,true);
 s=swing(s,levi.uid);
 assert.equal(live(s,0,levi.uid).ready,false);
 finish(s);

 let quiet=toPhase(fresh(['AOT-1-073','AOT-1-074','AOT-1-068'],51114,'red'),'main');
 put(quiet,0,'AOT-1-074','energy',0,true);
 put(quiet,0,'AOT-1-074','energy',1,true);
 put(quiet,0,'AOT-1-074','energy',2,true);
 readyAp(quiet,0,2);
 const silenced=toHand(quiet,0,'AOT-1-073');
 quiet=play(quiet,silenced.uid);
 silence(quiet,silenced.uid);
 quiet=toPhase(quiet,'attack');
 setLife(quiet,1,['AOT-1-068','AOT-1-068']);
 quiet=swing(quiet,silenced.uid);
 assert.equal(live(quiet,0,silenced.uid).ready,false);
 finish(quiet);

 let life=toPhase(fresh(['AOT-1-073','AOT-1-074','AOT-1-068'],51115,'red'),'attack');
 const hitter=put(life,0,'AOT-1-074','front',0,true);
 setLife(life,1,['AOT-1-073','AOT-1-068','AOT-1-068']);
 const before=life.players[1].hand.length;
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,before+1);
 assert.equal(life.pending,null);
 finish(life);
});

test('074 reduces its hand energy by one red only while the opponent has blue or green',()=>{
 const ymir=pack.cards['AOT-1-074'];
 let s=match(['AOT-1-074','AOT-1-068'],['AOT-1-052','AOT-1-042'],51116,'red','green');
 s=toPhase(s,'main');
 assert.equal(zoneRequiredEnergy(packs,s,0,ymir,'hand'),3);
 assert.equal(zoneRequiredEnergy(packs,s,0,ymir,'field'),3);
 put(s,1,'AOT-1-052','front',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,ymir,'hand'),2);
 assert.equal(zoneRequiredEnergy(packs,s,0,ymir,'field'),3);
 put(s,0,'AOT-1-068','energy',0,true);
 put(s,0,'AOT-1-068','energy',1,true);
 readyAp(s,0,1);
 const card=toHand(s,0,'AOT-1-074');
 s=play(s,card.uid);
 assert.equal(live(s,0,card.uid).cardId,'AOT-1-074');
 finish(s);

 let full=match(['AOT-1-074','AOT-1-068'],['AOT-1-068'],51117,'red','red');
 full=toPhase(full,'main');
 put(full,0,'AOT-1-068','energy',0,true);
 put(full,0,'AOT-1-068','energy',1,true);
 readyAp(full,0,1);
 const priced=toHand(full,0,'AOT-1-074');
 assert.equal(legalUniversalActions(packs,full).some(a=>a.type==='play'&&a.uid===priced.uid),false);
 finish(full);
});

test('075 draws one and must discard one; its draw trigger does not discard',()=>{
 let s=toPhase(fresh(['AOT-1-075','AOT-1-068'],51118,'red'),'main');
 readyAp(s,0,1);
 const played=toHand(s,0,'AOT-1-075');
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 s=play(s,played.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand-1);
 finish(s);

 let life=toPhase(fresh(['AOT-1-075','AOT-1-068'],51119,'red'),'attack');
 const hitter=put(life,0,'AOT-1-068','front',0,true);
 setLife(life,1,['AOT-1-075','AOT-1-068','AOT-1-068']);
 const before=life.players[1].hand.length;
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,before+1);
 assert.equal(life.pending,null);
 finish(life);
});

test('null triggers in this range leave the life card outside',()=>{
 for(const id of ['AOT-1-051','AOT-1-052','AOT-1-054','AOT-1-059','AOT-1-068','AOT-1-070','AOT-1-071','AOT-1-072','AOT-1-074']){
  const color=Number(id.slice(-3))>=68?'red':'green';
  const fuel=color==='green'?'AOT-1-060':'AOT-1-074';
  let s=toPhase(fresh([id,fuel],51120+Number(id.slice(-2)),color),'attack');
  const hitter=put(s,0,fuel,'front',0,true);
  const lives=setLife(s,1,[id,fuel]);
  s=swing(s,hitter.uid);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].outside.some(c=>c.uid===lives[0].uid),true,id);
  finish(s);
 }
});
