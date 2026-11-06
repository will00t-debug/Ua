import test from 'node:test';
import assert from 'node:assert/strict';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {inspectedPendingChoiceCards} from '../dist/universal-v2/preview-actions.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalEnergyByColor,
 universalImpact, universalPrivateChoices, universalPublicView, zoneRequiredEnergy}
    from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createIysV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final','raid'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
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
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function raidOnto(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&
  a.baseUid===baseUid&&a.line!=='energy');
 if(!action)throw Error('No raid onto '+baseUid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify(legalUniversalActions(packs,s).slice(0,8)));
 return use(s,action);
}
function legal(s,pred){return legalUniversalActions(packs,s).some(pred);}
function payRed(s){
 put(s,0,'IYS-1-041','energy',0);
 put(s,0,'IYS-1-062','energy',1);
 put(s,0,'IYS-1-049','energy',2);
}
function crown(s,p,id){
 const card=take(s,p,id);
 s.players[p].life.unshift(card);
 return card;
}
function onlyLife(s,p,id){
 const card=take(s,p,id);
 const old=s.players[p].life.splice(0);
 s.players[p].deck.push(...old);
 s.players[p].life.unshift(card);
 return card;
}
function topDeck(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of cards.slice().reverse())s.players[p].deck.unshift(card);
 return cards;
}
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
function find(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function bp(s,p,uid){return universalBp(pack,s,find(s,p,uid));}
function swing(s,uid){
 s=use(s,{type:'attack',uid});
 if(s.pending?.kind==='block')s=choose(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function silence(s,sourceUid,targetUid,until={player:0,phase:'main',edge:'end'}){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid,
  targetUid,sourceLinked:false,until});
}
function hidden(s,uids){
 const view=JSON.stringify(universalPublicView(packs,s,1));
 const priv=universalPrivateChoices(packs,s,1);
 const text=priv===null?'':JSON.stringify(priv);
 return uids.every(uid=>!view.includes(uid)&&!text.includes(uid));
}
function looked(s){
 return inspectedPendingChoiceCards(universalPrivateChoices(packs,s,0),legalUniversalActions(packs,s));
}

test('IYS-1-051 gains BP only after own Sango attacked, and loses it when silenced',()=>{
 const counts=countsFor(['IYS-1-051','IYS-1-056','IYS-1-053','IYS-1-042']);
 let idle=toPhase(fresh(counts,5101),'main');
 const mica=put(idle,0,'IYS-1-051','front',0,true);
 put(idle,0,'IYS-1-056','front',1,true);
 assert.equal(bp(idle,0,mica.uid),3000);
 assertUniversalMatch(packs,idle);

 let s=toPhase(fresh(counts,5102),'attack');
 const self=put(s,0,'IYS-1-051','front',0,true);
 const sango=put(s,0,'IYS-1-056','front',1,true);
 crown(s,1,'IYS-1-053');
 s=swing(s,sango.uid);
 assert.equal(s.pending,null);
 assert.equal(bp(s,0,self.uid),4000);
 const later=passTo(s,1,'main');
 assert.equal(bp(later,0,self.uid),3000);
 assertUniversalMatch(packs,later);

 let quiet=toPhase(fresh(counts,5103),'attack');
 const body=put(quiet,0,'IYS-1-051','front',0,true);
 const coral=put(quiet,0,'IYS-1-056','front',1,true);
 crown(quiet,1,'IYS-1-053');
 quiet=swing(quiet,coral.uid);
 silence(quiet,coral.uid,body.uid);
 assert.equal(bp(quiet,0,body.uid),3000);
 assertUniversalMatch(packs,quiet);

 let life=toPhase(fresh(counts,5104),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const rested=put(life,1,'IYS-1-042','front',0,false);
 const trigger=crown(life,1,'IYS-1-051');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(bp(life,1,rested.uid),4500);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-052 steps only in the move phase, and its draw trigger draws one',()=>{
 const counts=countsFor(['IYS-1-052','IYS-1-053']);
 let move=toPhase(fresh(counts,5201),'move');
 const card=put(move,0,'IYS-1-052','front',0,true);
 assert.equal(legal(move,a=>a.type==='step'&&a.uid===card.uid&&a.line!=='front'),true);
 move=use(move,legalUniversalActions(packs,move).find(a=>a.type==='step'&&a.uid===card.uid));
 assert.equal(move.players[0].energy.some(c=>c?.uid===card.uid),true);
 assert.equal(move.players[0].front.some(c=>c?.uid===card.uid),false);
 assertUniversalMatch(packs,move);

 let main=toPhase(fresh(counts,5202),'main');
 const stuck=put(main,0,'IYS-1-052','front',0,true);
 assert.equal(legal(main,a=>a.type==='step'&&a.uid===stuck.uid),false);
 assertUniversalMatch(packs,main);

 let life=toPhase(fresh(counts,5203),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const trigger=crown(life,1,'IYS-1-052');
 const deck=life.players[1].deck.length;
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,deck-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),false);
 assertUniversalMatch(packs,life);
});

test('IYS-1-053 steps in the move phase, and a null life opens nothing',()=>{
 const counts=countsFor(['IYS-1-053','IYS-1-042']);
 let move=toPhase(fresh(counts,5301),'move');
 const card=put(move,0,'IYS-1-053','front',0,true);
 move=use(move,legalUniversalActions(packs,move).find(a=>a.type==='step'&&a.uid===card.uid));
 assert.equal(move.players[0].energy.some(c=>c?.uid===card.uid),true);
 assertUniversalMatch(packs,move);

 let life=toPhase(fresh(counts,5302),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-053');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-054 may become active when Kagome is present, then returns at attack end only at BP 4000 or less',()=>{
 const counts=countsFor(['IYS-1-054','IYS-1-063','IYS-1-060','IYS-1-042','IYS-1-041','IYS-1-062','IYS-1-049']);
 let bare=toPhase(fresh(counts,5401),'main');
 readyAp(bare);
 payRed(bare);
 const lonely=take(bare,0,'IYS-1-054');
 bare.players[0].hand.push(lonely);
 bare=play(bare,lonely.uid);
 assert.equal(bare.pending,null);
 assert.equal(find(bare,0,lonely.uid).ready,false);
 bare=toPhase(bare,'attack');
 bare=use(bare,{type:'next'});
 assert.equal(find(bare,0,lonely.uid)!==undefined,true);
 assertUniversalMatch(packs,bare);

 let skipped=toPhase(fresh(counts,5402),'main');
 readyAp(skipped);
 payRed(skipped);
 put(skipped,0,'IYS-1-063','front',0);
 const held=take(skipped,0,'IYS-1-054');
 skipped.players[0].hand.push(held);
 skipped=play(skipped,held.uid);
 assert.equal(skipped.pending.step,'mayActive');
 assert.equal(legal(skipped,a=>a.mode==='skip'),true);
 skipped=choose(skipped,a=>a.mode==='skip');
 assert.equal(find(skipped,0,held.uid).ready,false);
 skipped=toPhase(skipped,'attack');
 skipped=use(skipped,{type:'next'});
 assert.equal(find(skipped,0,held.uid)!==undefined,true);
 assertUniversalMatch(packs,skipped);

 let back=toPhase(fresh(counts,5403),'main');
 readyAp(back);
 payRed(back);
 put(back,0,'IYS-1-063','front',0);
 const actor=take(back,0,'IYS-1-054');
 back.players[0].hand.push(actor);
 back=play(back,actor.uid);
 back=choose(back,a=>a.mode==='active');
 assert.equal(find(back,0,actor.uid).ready,true);
 assert.equal(bp(back,0,actor.uid),4000);
 back=toPhase(back,'attack');
 back=use(back,{type:'next'});
 assert.equal(back.players[0].hand.some(c=>c.uid===actor.uid),true);
 assert.equal(find(back,0,actor.uid),undefined);
 assertUniversalMatch(packs,back);

 let high=toPhase(fresh(counts,5404),'main');
 readyAp(high);
 payRed(high);
 put(high,0,'IYS-1-063','front',0);
 const tall=take(high,0,'IYS-1-054');
 high.players[0].hand.push(tall);
 high=play(high,tall.uid);
 high=choose(high,a=>a.mode==='active');
 const gift=take(high,0,'IYS-1-060');
 high.players[0].hand.push(gift);
 high=play(high,gift.uid);
 assert.equal(legal(high,a=>a.type==='chooseOwnBuff'&&a.uid===gift.uid),false);
 high=choose(high,a=>a.type==='chooseOwnBuff'&&a.uid===tall.uid);
 assert.equal(bp(high,0,tall.uid),5000);
 high=toPhase(high,'attack');
 high=use(high,{type:'next'});
 assert.equal(find(high,0,tall.uid)!==undefined,true);
 assertUniversalMatch(packs,high);

 let lost=toPhase(fresh(counts,5405),'main');
 readyAp(lost);
 payRed(lost);
 const kagome=put(lost,0,'IYS-1-063','front',0);
 const silenced=take(lost,0,'IYS-1-054');
 lost.players[0].hand.push(silenced);
 lost=play(lost,silenced.uid);
 lost=choose(lost,a=>a.mode==='active');
 silence(lost,kagome.uid,silenced.uid,{player:1,phase:'start',edge:'start'});
 lost=toPhase(lost,'attack');
 lost=use(lost,{type:'next'});
 assert.equal(find(lost,0,silenced.uid)!==undefined,true);
 assertUniversalMatch(packs,lost);

 let life=toPhase(fresh(counts,5406),'attack');
 const swinger=put(life,0,'IYS-1-042','front',0,true);
 const rested=put(life,1,'IYS-1-042','front',0,false);
 const trigger=crown(life,1,'IYS-1-054');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-055 rests on the energy line for one red and retires at the end of main',()=>{
 const counts=countsFor(['IYS-1-055','IYS-1-042']);
 let s=toPhase(fresh(counts,5501),'main');
 const card=put(s,0,'IYS-1-055','energy',0,true);
 assert.equal(universalEnergyByColor(pack,s,0).red,1);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===card.uid),true);
 s=use(s,{type:'activate',uid:card.uid,mode:'selfRestEnergyRetire'});
 assert.equal(find(s,0,card.uid).ready,false);
 assert.equal(universalEnergyByColor(pack,s,0).red,2);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===card.uid),false);
 s=use(s,{type:'next'});
 assert.equal(s.players[0].outside.some(c=>c.uid===card.uid),true);
 assert.equal(find(s,0,card.uid),undefined);
 assertUniversalMatch(packs,s);

 let front=toPhase(fresh(counts,5503),'main');
 const faced=put(front,0,'IYS-1-055','front',0,true);
 assert.equal(universalEnergyByColor(pack,front,0).red||0,0);
 assert.equal(legal(front,a=>a.type==='activate'&&a.uid===faced.uid&&a.mode==='selfRestEnergyRetire'),true);
 front=use(front,{type:'activate',uid:faced.uid,mode:'selfRestEnergyRetire'});
 assert.equal(find(front,0,faced.uid).ready,false);
 assert.equal(universalEnergyByColor(pack,front,0).red||0,0);
 assert.equal(legal(front,a=>a.type==='activate'&&a.uid===faced.uid),false);
 front=use(front,{type:'next'});
 assert.equal(front.players[0].outside.some(c=>c.uid===faced.uid),true);
 assertUniversalMatch(packs,front);

 let life=toPhase(fresh(counts,5502),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-055');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-056 shows both looked cards, sends one red event outside, and keeps the rest on top',()=>{
 const counts=countsFor(['IYS-1-056','IYS-1-080','IYS-1-078','IYS-1-042','IYS-1-053']);
 let s=toPhase(fresh(counts,5601),'main');
 readyAp(s);
 const window=topDeck(s,0,['IYS-1-080','IYS-1-042']);
 const actor=take(s,0,'IYS-1-056');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(s.pending.step,'lookPick');
 const shown=looked(s);
 assert.deepEqual(shown.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(shown[0].action.uid,window[0].uid);
 assert.equal(shown[1].action,null);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(s.players[0].deck[0].uid,window[1].uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let order=toPhase(fresh(counts,5602),'main');
 readyAp(order);
 const pair=topDeck(order,0,['IYS-1-080','IYS-1-078']);
 const searcher=take(order,0,'IYS-1-056');
 order.players[0].hand.push(searcher);
 order=play(order,searcher.uid);
 order=choose(order,a=>a.mode==='skip');
 assert.equal(order.pending.step,'lookOrder');
 order=choose(order,a=>a.mode==='next'&&a.uid===pair[1].uid);
 assert.equal(order.players[0].deck[0].uid,pair[1].uid);
 assert.equal(order.players[0].deck[1].uid,pair[0].uid);
 assert.equal(order.players[0].outside.some(c=>c.uid===pair[0].uid),false);
 assertUniversalMatch(packs,order);

 let life=toPhase(fresh(counts,5603),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const rested=put(life,1,'IYS-1-053','front',0,false);
 const trigger=crown(life,1,'IYS-1-056');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-057 shows the whole top three, reveals one named card, and discards only after a take',()=>{
 const counts=countsFor(['IYS-1-057','IYS-1-056','IYS-1-068','IYS-1-051','IYS-1-042']);
 let s=toPhase(fresh(counts,5701),'main');
 readyAp(s);
 put(s,0,'IYS-1-051','energy',0);
 const window=topDeck(s,0,['IYS-1-042','IYS-1-056','IYS-1-068']);
 const actor=take(s,0,'IYS-1-057');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown[0].action,null);
 assert.equal(shown[1].action.uid,window[1].uid);
 assert.equal(shown[2].action.uid,window[2].uid);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid);
 assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===window[1].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===window[0].uid);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===window[2].uid);
 assert.equal(s.players[0].deck.at(-2).uid,window[0].uid);
 assert.equal(s.players[0].deck.at(-1).uid,window[2].uid);
 assert.equal(s.pending.kind,'effect-discard');
 const hand=s.players[0].hand.length;
 s=choose(s,a=>a.type==='chooseDiscard'&&a.uid!==window[1].uid);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let miss=toPhase(fresh(counts,5702),'main');
 readyAp(miss);
 put(miss,0,'IYS-1-042','energy',0);
 topDeck(miss,0,['IYS-1-042','IYS-1-051','IYS-1-068']);
 const played=take(miss,0,'IYS-1-057');
 miss.players[0].hand.push(played);
 const before=miss.players[0].hand.length;
 miss=play(miss,played.uid);
 miss=choose(miss,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 assert.equal(miss.pending.kind,'effect-top-order');
 while(miss.pending?.kind==='effect-top-order'){
  const next=legalUniversalActions(packs,miss).find(a=>a.type==='chooseTopOrder');
  miss=use(miss,next);
 }
 assert.equal(miss.pending,null);
 assert.equal(miss.players[0].hand.length,before-1);
 assertUniversalMatch(packs,miss);

 let life=toPhase(fresh(counts,5703),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-057');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-058 gains BP only while Miroku is on the field, and the look keeps the unchosen order',()=>{
 const counts=countsFor(['IYS-1-058','IYS-1-068','IYS-1-080','IYS-1-042','IYS-1-050','IYS-1-041','IYS-1-062','IYS-1-049']);
 let off=toPhase(fresh(counts,5801),'main');
 const plain=put(off,0,'IYS-1-058','front',0,true);
 assert.equal(bp(off,0,plain.uid),3000);
 const miroku=put(off,0,'IYS-1-068','front',1,true);
 assert.equal(bp(off,0,plain.uid),4000);
 const away=passTo(off,1,'main');
 assert.equal(bp(away,0,plain.uid),3000);
 assertUniversalMatch(packs,away);

 let lost=toPhase(fresh(counts,5802),'main');
 const body=put(lost,0,'IYS-1-058','front',0,true);
 const other=put(lost,0,'IYS-1-068','front',1,true);
 silence(lost,other.uid,body.uid);
 assert.equal(bp(lost,0,body.uid),3000);
 assertUniversalMatch(packs,lost);

 let s=toPhase(fresh(counts,5803),'main');
 readyAp(s);
 payRed(s);
 const window=topDeck(s,0,['IYS-1-080','IYS-1-042','IYS-1-050']);
 const actor=take(s,0,'IYS-1-058');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 const shown=looked(s);
 assert.deepEqual(shown.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(shown[0].action.uid,window[0].uid);
 assert.equal(shown[1].action,null);
 assert.equal(shown[2].action,null);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 s=choose(s,a=>a.mode==='next'&&a.uid===window[1].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(s.players[0].deck.at(-1).uid,window[1].uid);
 assert.equal(s.players[0].deck.at(-2).uid,window[2].uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,5804),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-058');
 const deck=life.players[1].deck.length;
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,deck-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-059 keeps impact and the draw inside the raid, and the life trigger can be added to hand',()=>{
 const counts=countsFor(['IYS-1-059','IYS-1-056','IYS-1-068','IYS-1-042','IYS-1-053','IYS-1-041','IYS-1-062','IYS-1-049']);
 let plain=toPhase(fresh(counts,5901),'main');
 readyAp(plain);
 payRed(plain);
 const normal=take(plain,0,'IYS-1-059');
 plain.players[0].hand.push(normal);
 const deck=plain.players[0].deck.length;
 plain=play(plain,normal.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(universalImpact(pack,plain,find(plain,0,normal.uid)),0);
 assertUniversalMatch(packs,plain);

 let raid=toPhase(fresh(counts,5902),'main');
 readyAp(raid);
 payRed(raid);
 const base=put(raid,0,'IYS-1-056','front',0,true);
 const raider=take(raid,0,'IYS-1-059');
 raid.players[0].hand.push(raider);
 const before=raid.players[0].deck.length;
 raid=raidOnto(raid,raider.uid,base.uid);
 assert.equal(find(raid,0,raider.uid).ready,true);
 assert.equal(find(raid,0,raider.uid).stack?.[0]?.uid,base.uid);
 assert.equal(universalImpact(pack,raid,find(raid,0,raider.uid)),1);
 assert.equal(raid.players[0].deck.length,before-1);
 assert.equal(raid.pending.step,'discard');
 raid=choose(raid,a=>a.mode==='discard');
 assert.equal(raid.pending,null);
 assertUniversalMatch(packs,raid);

 let both=toPhase(fresh(counts,5903),'main');
 readyAp(both);
 payRed(both);
 const coral=put(both,0,'IYS-1-056','front',0,true);
 put(both,0,'IYS-1-068','front',1,true);
 const top=take(both,0,'IYS-1-059');
 both.players[0].hand.push(top);
 const hand=both.players[0].hand.length;
 both=raidOnto(both,top.uid,coral.uid);
 assert.equal(both.pending.step,'drawCount');
 assert.equal(legal(both,a=>a.mode==='one'),true);
 assert.equal(legal(both,a=>a.mode==='two'),true);
 const piled=both.players[0].deck.length;
 both=choose(both,a=>a.mode==='two');
 assert.equal(both.players[0].deck.length,piled-2);
 assert.equal(both.pending.step,'discard');
 both=choose(both,a=>a.mode==='discard');
 assert.equal(both.players[0].hand.length,hand);
 assertUniversalMatch(packs,both);

 let battle=toPhase(fresh(counts,5904),'attack');
 const attacker=put(battle,0,'IYS-1-059','front',0,true);
 attacker.stack=[take(battle,0,'IYS-1-056')];
 attacker.stack[0].faceDown=false;
 const wall=put(battle,1,'IYS-1-042','front',0,true);
 crown(battle,1,'IYS-1-053');
 const lives=battle.players[1].life.length;
 assert.equal(universalImpact(pack,battle,attacker),1);
 battle=use(battle,{type:'attack',uid:attacker.uid});
 battle=choose(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,lives-1);
 assertUniversalMatch(packs,battle);

 let life=toPhase(fresh(counts,5905),'attack');
 const swinger=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-059');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'raid');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-060 may buff another character and can be skipped',()=>{
 const counts=countsFor(['IYS-1-060','IYS-1-042','IYS-1-053']);
 let s=toPhase(fresh(counts,6001),'main');
 readyAp(s);
 put(s,0,'IYS-1-053','energy',0);
 const other=put(s,0,'IYS-1-042','front',0,true);
 const actor=take(s,0,'IYS-1-060');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(legal(s,a=>a.type==='chooseOwnBuff'&&a.uid===actor.uid),false);
 assert.equal(legal(s,a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 s=choose(s,a=>a.type==='chooseOwnBuff'&&a.uid===other.uid);
 assert.equal(bp(s,0,other.uid),2500);
 assert.equal(bp(s,0,actor.uid),2000);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,6002),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const trigger=crown(life,1,'IYS-1-060');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-061 discounts an empty field, peeks privately, then retires itself to rest-deploy',()=>{
 const counts=countsFor(['IYS-1-061','IYS-1-063','IYS-1-060','IYS-1-042','IYS-1-053']);
 let cost=toPhase(fresh(counts,6101),'main');
 readyAp(cost);
 const hand=take(cost,0,'IYS-1-061');
 cost.players[0].hand.push(hand);
 assert.equal(zoneRequiredEnergy(pack,cost,0,pack.cards['IYS-1-061'],'hand'),0);
 put(cost,0,'IYS-1-042','front',0);
 assert.equal(zoneRequiredEnergy(pack,cost,0,pack.cards['IYS-1-061'],'hand'),2);
 assertUniversalMatch(packs,cost);

 let peek=toPhase(fresh(counts,6102),'main');
 readyAp(peek);
 const top=topDeck(peek,0,['IYS-1-042'])[0];
 const actor=take(peek,0,'IYS-1-061');
 peek.players[0].hand.push(actor);
 peek=play(peek,actor.uid);
 assert.equal(peek.pending.kind,'private-top-choice');
 const mine=universalPrivateChoices(packs,peek,0);
 assert.equal(mine.options[0].card.cardId,'IYS-1-042');
 assert.equal(universalPrivateChoices(packs,peek,1),null);
 assert.equal(hidden(peek,[top.uid]),true);
 peek=choose(peek,a=>a.mode==='top');
 assert.equal(peek.players[0].deck[0].uid,top.uid);
 assert.equal(peek.pending,null);
 assertUniversalMatch(packs,peek);

 let out=toPhase(fresh(counts,6103),'main');
 readyAp(out);
 const secret=topDeck(out,0,['IYS-1-053'])[0];
 const player=take(out,0,'IYS-1-061');
 out.players[0].hand.push(player);
 out=play(out,player.uid);
 out=choose(out,a=>a.mode==='outside');
 assert.equal(out.players[0].outside.some(c=>c.uid===secret.uid),true);
 assertUniversalMatch(packs,out);

 let paid=toPhase(fresh(counts,6104),'main');
 const self=put(paid,0,'IYS-1-061','front',0,true);
 const recruit=take(paid,0,'IYS-1-063');
 paid.players[0].outside.push(recruit);
 const shippo=take(paid,0,'IYS-1-060');
 paid.players[0].outside.push(shippo);
 assert.equal(legal(paid,a=>a.type==='activate'&&a.uid===self.uid),true);
 silence(paid,self.uid,self.uid);
 assert.equal(legal(paid,a=>a.type==='activate'&&a.uid===self.uid),false);
 assertUniversalMatch(packs,paid);

 let go=toPhase(fresh(counts,6105),'main');
 const source=put(go,0,'IYS-1-061','energy',0,true);
 const kagome=take(go,0,'IYS-1-063');
 go.players[0].outside.push(kagome);
 const small=take(go,0,'IYS-1-060');
 go.players[0].outside.push(small);
 const deck=go.players[0].deck.length;
 go=use(go,{type:'activate',uid:source.uid,mode:'iys:0'});
 assert.equal(go.players[0].outside.some(c=>c.uid===source.uid),true);
 assert.equal(legal(go,a=>a.mode==='deploy'&&a.uid===small.uid),false);
 assert.equal(legal(go,a=>a.mode==='skip'),true);
 assert.equal(legal(go,a=>a.mode==='deploy'&&a.uid===kagome.uid&&a.line==='front'),true);
 assert.equal(legal(go,a=>a.mode==='deploy'&&a.uid===kagome.uid&&a.line==='energy'),true);
 go=choose(go,a=>a.mode==='deploy'&&a.uid===kagome.uid&&a.line==='energy');
 const entered=find(go,0,kagome.uid);
 assert.equal(entered.ready,false);
 assert.equal(go.players[0].deck.length,deck-1);
 assert.equal(go.pending.kind,'effect-discard');
 go=choose(go,a=>a.type==='chooseDiscard');
 assert.equal(go.pending,null);
 assertUniversalMatch(packs,go);
});

test('IYS-1-062 may add one red event from outside and ignores other cards',()=>{
 const counts=countsFor(['IYS-1-062','IYS-1-080','IYS-1-038','IYS-1-042','IYS-1-041','IYS-1-049']);
 let s=toPhase(fresh(counts,6201),'main');
 readyAp(s);
 payRed(s);
 const red=take(s,0,'IYS-1-080');
 const purple=take(s,0,'IYS-1-038');
 s.players[0].outside.push(red,purple);
 const actor=take(s,0,'IYS-1-062');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(legal(s,a=>a.type==='chooseOutsideRecovery'&&a.uid===red.uid),true);
 assert.equal(legal(s,a=>a.type==='chooseOutsideRecovery'&&a.uid===purple.uid),false);
 assert.equal(legal(s,a=>a.type==='chooseOutsideRecovery'&&a.uid===null),true);
 s=choose(s,a=>a.uid===red.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===red.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===purple.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,6202),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-062');
 const deck=life.players[1].deck.length;
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,deck-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-063 draws one and must put one hand card outside',()=>{
 const counts=countsFor(['IYS-1-063','IYS-1-042','IYS-1-053']);
 let s=toPhase(fresh(counts,6301),'main');
 readyAp(s);
 const actor=take(s,0,'IYS-1-063');
 s.players[0].hand.push(actor);
 const deck=s.players[0].deck.length;
 s=play(s,actor.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 const hand=s.players[0].hand.length;
 s=choose(s,a=>a.type==='chooseDiscard');
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,6302),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const rested=put(life,1,'IYS-1-042','front',0,false);
 const trigger=crown(life,1,'IYS-1-063');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(bp(life,1,rested.uid),4500);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-064 generates the extra red only while active on the energy line',()=>{
 const counts=countsFor(['IYS-1-064','IYS-1-042']);
 let s=toPhase(fresh(counts,6401),'main');
 const card=put(s,0,'IYS-1-064','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,card),2);
 card.ready=false;
 assert.equal(universalCardEnergy(pack,s,0,card),1);
 card.ready=true;
 silence(s,card.uid,card.uid);
 assert.equal(universalCardEnergy(pack,s,0,card),1);
 assertUniversalMatch(packs,s);

 let front=toPhase(fresh(counts,6402),'main');
 const faced=put(front,0,'IYS-1-064','front',0,true);
 assert.equal(universalCardEnergy(pack,front,0,faced),0);
 assertUniversalMatch(packs,front);

 let life=toPhase(fresh(counts,6403),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-064');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-065 shows all four cards, reveals one named card, and discards only after a take',()=>{
 const counts=countsFor(['IYS-1-065','IYS-1-042','IYS-1-063','IYS-1-053','IYS-1-050','IYS-1-060']);
 let s=toPhase(fresh(counts,6501),'main');
 readyAp(s);
 put(s,0,'IYS-1-050','energy',0);
 const window=topDeck(s,0,['IYS-1-053','IYS-1-042','IYS-1-050','IYS-1-060']);
 const actor=take(s,0,'IYS-1-065');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown[0].action,null);
 assert.equal(shown[1].action.uid,window[1].uid);
 assert.equal(shown[2].action,null);
 assert.equal(shown[3].action,null);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid);
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid&&r.kind==='searched-to-hand'),true);
 while(s.pending?.kind==='effect-top-order'){
  s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder'));
 }
 assert.equal(s.pending.kind,'effect-discard');
 s=choose(s,a=>a.type==='chooseDiscard'&&a.uid!==window[1].uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,6502),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const rested=put(life,1,'IYS-1-050','front',0,false);
 const trigger=crown(life,1,'IYS-1-065');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(bp(life,1,rested.uid),5000);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-066 recruits from hand only while face-up raided, and the front activate grants the block ceiling',()=>{
 const counts=countsFor(['IYS-1-066','IYS-1-064','IYS-1-065','IYS-1-045','IYS-1-054','IYS-1-050','IYS-1-041','IYS-1-062','IYS-1-049','IYS-1-042','IYS-1-053']);
 let plain=toPhase(fresh(counts,6601),'main');
 readyAp(plain);
 payRed(plain);
 put(plain,0,'IYS-1-045','front',0,true);
 const recruit=take(plain,0,'IYS-1-065');
 plain.players[0].hand.push(recruit);
 const actor=take(plain,0,'IYS-1-066');
 plain.players[0].hand.push(actor);
 plain=play(plain,actor.uid);
 assert.equal(plain.pending,null);
 assert.equal(legal(plain,a=>a.type==='activate'&&a.uid===actor.uid),false);
 assertUniversalMatch(packs,plain);

 let raid=toPhase(fresh(counts,6602),'main');
 readyAp(raid);
 payRed(raid);
 const base=put(raid,0,'IYS-1-064','front',0,true);
 const inu=put(raid,0,'IYS-1-045','front',1,true);
 const legalHand=take(raid,0,'IYS-1-065');
 const tooBig=take(raid,0,'IYS-1-054');
 raid.players[0].hand.push(legalHand,tooBig);
 topDeck(raid,0,['IYS-1-042','IYS-1-053','IYS-1-050','IYS-1-062']);
 const raider=take(raid,0,'IYS-1-066');
 raid.players[0].hand.push(raider);
 raid=raidOnto(raid,raider.uid,base.uid);
 assert.equal(find(raid,0,raider.uid).stack?.[0]?.uid,base.uid);
 assert.equal(raid.pending.kind,'effect-hand-rest');
 assert.equal(legal(raid,a=>a.type==='chooseHandRest'&&a.uid===tooBig.uid),false);
 assert.equal(legal(raid,a=>a.type==='chooseHandRest'&&a.uid===null),true);
 assert.equal(legal(raid,a=>a.type==='chooseHandRest'&&a.uid===legalHand.uid&&a.line==='front'),true);
 assert.equal(legal(raid,a=>a.type==='chooseHandRest'&&a.uid===legalHand.uid&&a.line==='energy'),true);
 raid=choose(raid,a=>a.type==='chooseHandRest'&&a.uid===legalHand.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(find(raid,0,legalHand.uid).ready,false);
 assert.equal(raid.pending.kind,'effect-top-filter-choice');
 raid=choose(raid,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 while(raid.pending?.kind==='effect-top-order'){
  raid=use(raid,legalUniversalActions(packs,raid).find(a=>a.type==='chooseTopOrder'));
 }
 assert.equal(raid.pending,null);
 assert.equal(legal(raid,a=>a.type==='activate'&&a.uid===raider.uid),true);
 const energyBase=put(raid,0,'IYS-1-064','energy',3,true);
 const spare=take(raid,0,'IYS-1-042');
 const energyRaider=take(raid,0,'IYS-1-066');
 raid.players[0].hand.push(spare,energyRaider);
 const energyRaid=legalUniversalActions(packs,raid).find(a=>a.type==='raid'&&
  a.uid===energyRaider.uid&&a.baseUid===energyBase.uid&&a.line==='energy');
 raid=use(raid,energyRaid);
 assert.equal(raid.pending.kind,'effect-hand-rest');
 raid=choose(raid,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(find(raid,0,energyRaider.uid)!==undefined,true);
 assert.equal(legal(raid,a=>a.type==='activate'&&a.uid===energyRaider.uid),false);
 raid=use(raid,{type:'activate',uid:raider.uid,mode:'iys:0'});
 assert.equal(raid.pending.step,'restInu');
 raid=choose(raid,a=>a.uid===inu.uid);
 assert.equal(find(raid,0,inu.uid).ready,false);
 assert.equal(raid.pending.kind==='iys'&&raid.pending.step==='buffOther',true);
 raid=choose(raid,a=>a.mode==='skip');
 assert.equal(raid.pending,null);
 raid=toPhase(raid,'attack');
 const big=put(raid,1,'IYS-1-054','front',0,true);
 const small=put(raid,1,'IYS-1-050','front',1,true);
 raid=use(raid,{type:'attack',uid:raider.uid});
 assert.equal(legal(raid,a=>a.type==='chooseBlock'&&a.uid===big.uid),false);
 assert.equal(legal(raid,a=>a.type==='chooseBlock'&&a.uid===small.uid),true);
 assertUniversalMatch(packs,raid);

 let lines=toPhase(fresh(counts,6604),'main');
 readyAp(lines);
 payRed(lines);
 const host=put(lines,0,'IYS-1-064','front',0,true);
 const backInu=put(lines,0,'IYS-1-045','energy',3,true);
 const frontInu=put(lines,0,'IYS-1-042','front',1,true);
 const second=take(lines,0,'IYS-1-066');
 lines.players[0].hand.push(second);
 lines=raidOnto(lines,second.uid,host.uid);
 if(lines.pending?.kind==='effect-hand-rest')lines=choose(lines,a=>a.type==='chooseHandRest'&&a.uid===null);
 lines=use(lines,{type:'activate',uid:second.uid,mode:'iys:0'});
 assert.equal(lines.pending.step,'restInu');
 assert.equal(legal(lines,a=>a.uid===frontInu.uid),true);
 assert.equal(legal(lines,a=>a.uid===backInu.uid),false);
 assertUniversalMatch(packs,lines);

 let life=toPhase(fresh(counts,6603),'attack');
 const swinger=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-066');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'raid');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-067 bounces another energy-1-or-less character, or itself when none exists',()=>{
 const counts=countsFor(['IYS-1-067','IYS-1-063','IYS-1-054','IYS-1-042']);
 let s=toPhase(fresh(counts,6701),'main');
 readyAp(s);
 const cheap=put(s,0,'IYS-1-063','energy',0,true);
 const dear=put(s,0,'IYS-1-054','front',0,true);
 const actor=take(s,0,'IYS-1-067');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(legal(s,a=>a.type==='chooseOwnBounce'&&a.uid===cheap.uid),true);
 assert.equal(legal(s,a=>a.type==='chooseOwnBounce'&&a.uid===dear.uid),false);
 assert.equal(legal(s,a=>a.type==='chooseOwnBounce'&&a.uid===actor.uid),false);
 s=choose(s,a=>a.uid===cheap.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===cheap.uid),true);
 assert.equal(find(s,0,actor.uid)!==undefined,true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let self=toPhase(fresh(counts,6702),'main');
 readyAp(self);
 put(self,0,'IYS-1-054','energy',0,true);
 const alone=take(self,0,'IYS-1-067');
 self.players[0].hand.push(alone);
 self=play(self,alone.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===alone.uid),true);
 assert.equal(find(self,0,alone.uid),undefined);
 assertUniversalMatch(packs,self);

 let life=toPhase(fresh(counts,6703),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-067');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-068 has no printed effect, and its get trigger adds it to hand',()=>{
 const counts=countsFor(['IYS-1-068','IYS-1-042']);
 let s=toPhase(fresh(counts,6801),'main');
 readyAp(s);
 const actor=take(s,0,'IYS-1-068');
 s.players[0].hand.push(actor);
 s=play(s,actor.uid);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,6802),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-068');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'get');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-069 draws one and discards one',()=>{
 const counts=countsFor(['IYS-1-069','IYS-1-042','IYS-1-053']);
 let s=toPhase(fresh(counts,6901),'main');
 readyAp(s);
 put(s,0,'IYS-1-042','energy',0);
 put(s,0,'IYS-1-053','energy',1);
 const actor=take(s,0,'IYS-1-069');
 s.players[0].hand.push(actor);
 const deck=s.players[0].deck.length;
 s=play(s,actor.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 s=choose(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,6902),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const rested=put(life,1,'IYS-1-042','front',0,false);
 const trigger=crown(life,1,'IYS-1-069');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(find(life,1,rested.uid).ready,true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-070 removes one outside event from the front while Sango is present, and color retires 2500 or less',()=>{
 const counts=countsFor(['IYS-1-070','IYS-1-056','IYS-1-080','IYS-1-044','IYS-1-054','IYS-1-050','IYS-1-042','IYS-1-041','IYS-1-062','IYS-1-049']);
 let s=toPhase(fresh(counts,7001),'main');
 const actor=put(s,0,'IYS-1-070','front',0,true);
 const event=take(s,0,'IYS-1-080');
 s.players[0].outside.push(event);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===actor.uid),false);
 put(s,0,'IYS-1-056','front',1);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===actor.uid),true);
 const back=put(s,0,'IYS-1-070','energy',0,true);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===back.uid),false);
 silence(s,actor.uid,actor.uid);
 assert.equal(legal(s,a=>a.type==='activate'&&a.uid===actor.uid),false);
 assertUniversalMatch(packs,s);

 let go=toPhase(fresh(counts,7002),'main');
 const miroku=put(go,0,'IYS-1-070','front',0,true);
 put(go,0,'IYS-1-056','front',1);
 const bone=take(go,0,'IYS-1-080');
 go.players[0].outside.push(bone);
 go=use(go,{type:'activate',uid:miroku.uid,mode:'iys:0'});
 go=choose(go,a=>a.mode==='remove'&&a.uid===bone.uid);
 assert.equal(go.players[0].removed.some(c=>c.uid===bone.uid),true);
 assert.equal(go.pending,null);
 go=toPhase(go,'attack');
 const big=put(go,1,'IYS-1-054','front',0,true);
 const small=put(go,1,'IYS-1-050','front',1,true);
 go=use(go,{type:'attack',uid:miroku.uid});
 assert.equal(legal(go,a=>a.type==='chooseBlock'&&a.uid===big.uid),false);
 assert.equal(legal(go,a=>a.type==='chooseBlock'&&a.uid===small.uid),true);
 assertUniversalMatch(packs,go);

 let life=toPhase(fresh(counts,7003),'attack');
 const swinger=put(life,0,'IYS-1-042','front',0,true);
 const low=put(life,0,'IYS-1-050','front',1,true);
 const high=put(life,0,'IYS-1-044','front',2,true);
 const trigger=crown(life,1,'IYS-1-070');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'color');
 assert.equal(legal(life,a=>a.mode==='colorRetire'&&a.uid===low.uid),true);
 assert.equal(legal(life,a=>a.mode==='colorRetire'&&a.uid===high.uid),false);
 assert.equal(legal(life,a=>a.mode==='skip'),true);
 life=choose(life,a=>a.mode==='colorRetire'&&a.uid===low.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===low.uid),true);
 assert.equal(life.players[0].front.some(c=>c?.uid===high.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-071 removes any number of events only while face-up raided, then retires inside the printed cap',()=>{
 const counts=countsFor(['IYS-1-071','IYS-1-068','IYS-1-056','IYS-1-080','IYS-1-078','IYS-1-047','IYS-1-045','IYS-1-044','IYS-1-041','IYS-1-062','IYS-1-049','IYS-1-042']);
 let plain=toPhase(fresh(counts,7101),'main');
 readyAp(plain);
 payRed(plain);
 const event=take(plain,0,'IYS-1-080');
 plain.players[0].outside.push(event);
 const actor=take(plain,0,'IYS-1-071');
 plain.players[0].hand.push(actor);
 plain=play(plain,actor.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].outside.some(c=>c.uid===event.uid),true);
 assertUniversalMatch(packs,plain);

 let zero=toPhase(fresh(counts,7102),'main');
 readyAp(zero);
 payRed(zero);
 const base=put(zero,0,'IYS-1-068','front',0,true);
 const small=put(zero,1,'IYS-1-047','front',0);
 const mid=put(zero,1,'IYS-1-045','front',1);
 const raider=take(zero,0,'IYS-1-071');
 zero.players[0].hand.push(raider);
 zero=raidOnto(zero,raider.uid,base.uid);
 assert.equal(zero.pending.step,'removeEvents');
 zero=choose(zero,a=>a.mode==='done');
 assert.equal(zero.pending.step,'retireCap');
 assert.equal(legal(zero,a=>a.uid===small.uid),true);
 assert.equal(legal(zero,a=>a.uid===mid.uid),false);
 assert.equal(legal(zero,a=>a.mode==='skip'),true);
 zero=choose(zero,a=>a.mode==='skip');
 assert.equal(zero.players[1].front.some(c=>c?.uid===small.uid),true);
 assertUniversalMatch(packs,zero);

 let plainCap=toPhase(fresh(counts,7105),'main');
 readyAp(plainCap);
 payRed(plainCap);
 const capBase=put(plainCap,0,'IYS-1-068','front',0,true);
 const kept=take(plainCap,0,'IYS-1-080');
 plainCap.players[0].outside.push(kept);
 const capLow=put(plainCap,1,'IYS-1-047','front',0);
 const over=put(plainCap,1,'IYS-1-045','front',1);
 const solo=take(plainCap,0,'IYS-1-071');
 plainCap.players[0].hand.push(solo);
 plainCap=raidOnto(plainCap,solo.uid,capBase.uid);
 plainCap=choose(plainCap,a=>a.mode==='remove'&&a.uid===kept.uid);
 plainCap=choose(plainCap,a=>a.mode==='done');
 assert.equal(legal(plainCap,a=>a.uid===capLow.uid),true);
 assert.equal(legal(plainCap,a=>a.uid===over.uid),false);
 plainCap=choose(plainCap,a=>a.mode==='skip');
 assert.equal(plainCap.players[1].front.some(c=>c?.uid===capLow.uid),true);
 assertUniversalMatch(packs,plainCap);

 let boosted=toPhase(fresh(counts,7103),'main');
 readyAp(boosted);
 payRed(boosted);
 const home=put(boosted,0,'IYS-1-068','front',0,true);
 put(boosted,0,'IYS-1-056','front',1);
 const first=take(boosted,0,'IYS-1-080');
 const second=take(boosted,0,'IYS-1-078');
 boosted.players[0].outside.push(first,second);
 const low=put(boosted,1,'IYS-1-045','front',0);
 const high=put(boosted,1,'IYS-1-044','front',1);
 const top=take(boosted,0,'IYS-1-071');
 boosted.players[0].hand.push(top);
 boosted=raidOnto(boosted,top.uid,home.uid);
 boosted=choose(boosted,a=>a.mode==='remove'&&a.uid===first.uid);
 assert.equal(boosted.players[0].removed.some(c=>c.uid===first.uid),true);
 assert.equal(boosted.players[0].outside.some(c=>c.uid===second.uid),true);
 boosted=choose(boosted,a=>a.mode==='done');
 assert.equal(legal(boosted,a=>a.uid===low.uid),true);
 assert.equal(legal(boosted,a=>a.uid===high.uid),false);
 boosted=choose(boosted,a=>a.uid===low.uid);
 assert.equal(boosted.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(boosted.players[1].front.some(c=>c?.uid===high.uid),true);
 assertUniversalMatch(packs,boosted);

 let life=toPhase(fresh(counts,7104),'attack');
 const swinger=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-071');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'raid');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-072 shows the whole window and does not discard when a card is added',()=>{
 const counts=countsFor(['IYS-1-072','IYS-1-042','IYS-1-063','IYS-1-053','IYS-1-050','IYS-1-060']);
 let s=toPhase(fresh(counts,7201),'main');
 readyAp(s);
 put(s,0,'IYS-1-042','energy',0);
 put(s,0,'IYS-1-063','energy',1);
 const window=topDeck(s,0,['IYS-1-053','IYS-1-063','IYS-1-050','IYS-1-060']);
 const actor=take(s,0,'IYS-1-072');
 s.players[0].hand.push(actor);
 const hand=s.players[0].hand.length;
 s=play(s,actor.uid,'play','energy');
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown[0].action,null);
 assert.equal(shown[1].action.uid,window[1].uid);
 assert.equal(hidden(s,window.map(c=>c.uid)),true);
 s=choose(s,a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid);
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid),true);
 while(s.pending?.kind==='effect-top-order'){
  s=use(s,legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder'));
 }
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,7202),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-072');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'get');
 life=choose(life,a=>a.mode==='get');
 assert.equal(life.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-073 readies up to two AP, and final starts only with no life',()=>{
 const counts=countsFor(['IYS-1-073','IYS-1-041','IYS-1-062','IYS-1-049','IYS-1-042']);
 let s=toPhase(fresh(counts,7301),'main');
 readyAp(s);
 payRed(s);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 const event=take(s,0,'IYS-1-073');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(legal(s,a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===s.players[0].apCards[0].uid);
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===s.players[0].apCards[1].uid);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let last=toPhase(fresh(counts,7302),'attack');
 const attacker=put(last,0,'IYS-1-042','front',0,true);
 const life=onlyLife(last,1,'IYS-1-073');
 const top=last.players[1].deck[0];
 last=swing(last,attacker.uid);
 assert.equal(last.pending.trigger,'final');
 last=choose(last,a=>a.mode==='final');
 assert.equal(last.players[1].life[0].uid,top.uid);
 assert.equal(last.players[1].outside.some(c=>c.uid===life.uid),true);
 assert.equal(last.winner,null);
 assertUniversalMatch(packs,last);
});

test('IYS-1-074 draws, may buff Inuyasha, then may rest a front one to ready an AP',()=>{
 const counts=countsFor(['IYS-1-074','IYS-1-063','IYS-1-042','IYS-1-045','IYS-1-050','IYS-1-044','IYS-1-041','IYS-1-062','IYS-1-049']);
 let blocked=toPhase(fresh(counts,7401),'main');
 readyAp(blocked);
 payRed(blocked);
 const illegal=take(blocked,0,'IYS-1-074');
 blocked.players[0].hand.push(illegal);
 assert.equal(legal(blocked,a=>a.type==='event'&&a.uid===illegal.uid),false);
 assertUniversalMatch(packs,blocked);

 let s=toPhase(fresh(counts,7402),'main');
 readyAp(s);
 payRed(s);
 put(s,0,'IYS-1-063','front',0);
 const front=put(s,0,'IYS-1-045','front',1,true);
 const energy=put(s,0,'IYS-1-042','energy',3,true);
 s.players[0].apCards[0].ready=false;
 const event=take(s,0,'IYS-1-074');
 s.players[0].hand.push(event);
 const deck=s.players[0].deck.length;
 s=play(s,event.uid,'event');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.step,'buffInu');
 assert.equal(legal(s,a=>a.uid===front.uid),true);
 assert.equal(legal(s,a=>a.uid===energy.uid),true);
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 s=choose(s,a=>a.uid===energy.uid);
 assert.equal(bp(s,0,energy.uid),2500);
 assert.equal(s.pending.step,'restInu');
 assert.equal(legal(s,a=>a.uid===energy.uid),false);
 assert.equal(legal(s,a=>a.uid===front.uid),true);
 s=choose(s,a=>a.uid===front.uid);
 assert.equal(find(s,0,front.uid).ready,false);
 assert.equal(s.pending.step,'ap');
 s=choose(s,a=>a.mode==='ap'&&a.index===0);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,7403),'attack');
 const swinger=put(life,0,'IYS-1-042','front',0,true);
 const low=put(life,0,'IYS-1-050','front',1,true);
 const high=put(life,0,'IYS-1-044','front',2,true);
 const trigger=crown(life,1,'IYS-1-074');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'color');
 assert.equal(legal(life,a=>a.mode==='colorRetire'&&a.uid===low.uid),true);
 assert.equal(legal(life,a=>a.mode==='colorRetire'&&a.uid===high.uid),false);
 life=choose(life,a=>a.mode==='skip');
 assert.equal(life.players[0].front.some(c=>c?.uid===low.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-075 may buff any character, then readies one AP when Shippo is present',()=>{
 const counts=countsFor(['IYS-1-075','IYS-1-060','IYS-1-042','IYS-1-053','IYS-1-041','IYS-1-062','IYS-1-049']);
 let none=toPhase(fresh(counts,7501),'main');
 readyAp(none);
 payRed(none);
 const bare=take(none,0,'IYS-1-075');
 none.players[0].hand.push(bare);
 none=play(none,bare.uid,'event');
 assert.equal(none.pending.step,'buffAny');
 none=choose(none,a=>a.mode==='skip');
 assert.equal(none.pending,null);
 assertUniversalMatch(packs,none);

 let s=toPhase(fresh(counts,7502),'main');
 readyAp(s);
 payRed(s);
 const shippo=put(s,0,'IYS-1-060','front',0,true);
 const other=put(s,0,'IYS-1-042','front',1,true);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 const event=take(s,0,'IYS-1-075');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.step,'buffAny');
 assert.equal(legal(s,a=>a.uid===shippo.uid),true);
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 s=choose(s,a=>a.uid===other.uid);
 assert.equal(bp(s,0,other.uid),3500);
 assert.equal(bp(s,0,shippo.uid),2000);
 assert.equal(s.pending.step,'ap');
 s=choose(s,a=>a.mode==='ap'&&a.index===0);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,7503),'attack');
 const attacker=put(life,0,'IYS-1-053','front',0,true);
 const rested=put(life,1,'IYS-1-042','front',0,false);
 const trigger=crown(life,1,'IYS-1-075');
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'active');
 life=choose(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(bp(life,1,rested.uid),4500);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-076 readies AP, and final does nothing while life remains',()=>{
 const counts=countsFor(['IYS-1-076','IYS-1-041','IYS-1-062','IYS-1-049','IYS-1-042']);
 let s=toPhase(fresh(counts,7601),'main');
 readyAp(s);
 payRed(s);
 s.players[0].apCards[0].ready=false;
 const event=take(s,0,'IYS-1-076');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.players[0].apCards[0].ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,7602),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-076');
 const remaining=life.players[1].life.length;
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].life.length,remaining-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);

 let last=toPhase(fresh(counts,7603),'attack');
 const swinger=put(last,0,'IYS-1-042','front',0,true);
 const final=onlyLife(last,1,'IYS-1-076');
 const top=last.players[1].deck[0];
 last=swing(last,swinger.uid);
 assert.equal(last.pending.trigger,'final');
 last=choose(last,a=>a.mode==='final');
 assert.equal(last.players[1].life[0].uid,top.uid);
 assert.equal(last.players[1].outside.some(c=>c.uid===final.uid),true);
 assert.equal(last.winner,null);
 assertUniversalMatch(packs,last);
});

test('IYS-1-077 costs one less AP while Miroku is present, and special ignores the printed cap',()=>{
 const counts=countsFor(['IYS-1-077','IYS-1-068','IYS-1-044','IYS-1-042','IYS-1-041','IYS-1-062','IYS-1-049','IYS-1-053']);
 let full=toPhase(fresh(counts,7701),'main');
 readyAp(full,0,1);
 payRed(full);
 const dear=take(full,0,'IYS-1-077');
 full.players[0].hand.push(dear);
 put(full,1,'IYS-1-044','front',0);
 assert.equal(legal(full,a=>a.type==='event'&&a.uid===dear.uid),false);
 put(full,0,'IYS-1-068','front',0);
 assert.equal(legal(full,a=>a.type==='event'&&a.uid===dear.uid),true);
 assertUniversalMatch(packs,full);

 let s=toPhase(fresh(counts,7702),'main');
 readyAp(s);
 payRed(s);
 put(s,0,'IYS-1-068','front',0);
 const front=put(s,1,'IYS-1-044','front',0);
 const energy=put(s,1,'IYS-1-042','energy',0);
 const event=take(s,0,'IYS-1-077');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.step,'retireBp');
 assert.equal(legal(s,a=>a.uid===front.uid),true);
 assert.equal(legal(s,a=>a.uid===energy.uid),false);
 assert.equal(legal(s,a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.players[1].front.some(c=>c?.uid===front.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let hit=toPhase(fresh(counts,7703),'main');
 readyAp(hit);
 payRed(hit);
 put(hit,0,'IYS-1-068','energy',3);
 const target=put(hit,1,'IYS-1-044','front',0);
 const played=take(hit,0,'IYS-1-077');
 hit.players[0].hand.push(played);
 hit=play(hit,played.uid,'event');
 hit=choose(hit,a=>a.uid===target.uid);
 assert.equal(hit.players[1].outside.some(c=>c.uid===target.uid),true);
 assertUniversalMatch(packs,hit);

 let life=toPhase(fresh(counts,7704),'attack');
 const swinger=put(life,0,'IYS-1-053','front',0,true);
 const big=put(life,0,'IYS-1-044','front',1,true);
 const trigger=crown(life,1,'IYS-1-077');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'special');
 assert.equal(legal(life,a=>a.mode==='special'&&a.uid===big.uid),true);
 life=choose(life,a=>a.mode==='special'&&a.uid===big.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===big.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-078 draws two and discards two before readying an AP',()=>{
 const counts=countsFor(['IYS-1-078','IYS-1-068','IYS-1-042','IYS-1-041','IYS-1-062','IYS-1-049']);
 let plain=toPhase(fresh(counts,7801),'main');
 readyAp(plain);
 payRed(plain);
 const event=take(plain,0,'IYS-1-078');
 plain.players[0].hand.push(event);
 const deck=plain.players[0].deck.length;
 plain=play(plain,event.uid,'event');
 assert.equal(plain.players[0].deck.length,deck-2);
 assert.equal(plain.pending.kind,'effect-discard');
 plain=choose(plain,a=>a.type==='chooseDiscard');
 assert.equal(plain.pending.kind,'effect-discard');
 plain=choose(plain,a=>a.type==='chooseDiscard');
 assert.equal(plain.pending,null);
 assertUniversalMatch(packs,plain);

 let s=toPhase(fresh(counts,7802),'main');
 readyAp(s);
 payRed(s);
 put(s,0,'IYS-1-068','front',0);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 const card=take(s,0,'IYS-1-078');
 s.players[0].hand.push(card);
 s=play(s,card.uid,'event');
 assert.equal(s.pending.kind,'effect-discard');
 s=choose(s,a=>a.type==='chooseDiscard');
 s=choose(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending.step,'ap');
 s=choose(s,a=>a.mode==='ap'&&a.index===0);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,7803),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-078');
 const piled=life.players[1].deck.length;
 life=swing(life,attacker.uid);
 assert.equal(life.pending.trigger,'draw');
 life=choose(life,a=>a.mode==='draw');
 assert.equal(life.players[1].deck.length,piled-1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-079 raises the cap only while Inuyasha is on the field, and special ignores it',()=>{
 const counts=countsFor(['IYS-1-079','IYS-1-045','IYS-1-044','IYS-1-042','IYS-1-041','IYS-1-062','IYS-1-049','IYS-1-053']);
 let low=toPhase(fresh(counts,7901),'main');
 readyAp(low);
 payRed(low);
 const mid=put(low,1,'IYS-1-045','front',0);
 const high=put(low,1,'IYS-1-044','front',1);
 const event=take(low,0,'IYS-1-079');
 low.players[0].hand.push(event);
 assert.equal(legal(low,a=>a.type==='event'&&a.uid===event.uid),true);
 low=play(low,event.uid,'event');
 assert.equal(legal(low,a=>a.uid===mid.uid),true);
 assert.equal(legal(low,a=>a.uid===high.uid),false);
 low=choose(low,a=>a.uid===mid.uid);
 assert.equal(low.players[1].outside.some(c=>c.uid===mid.uid),true);
 assertUniversalMatch(packs,low);

 let raised=toPhase(fresh(counts,7902),'main');
 readyAp(raised);
 payRed(raised);
 put(raised,0,'IYS-1-042','front',0);
 const big=put(raised,1,'IYS-1-044','front',0);
 const played=take(raised,0,'IYS-1-079');
 raised.players[0].hand.push(played);
 raised=play(raised,played.uid,'event');
 assert.equal(legal(raised,a=>a.uid===big.uid),true);
 raised=choose(raised,a=>a.uid===big.uid);
 assert.equal(raised.players[1].outside.some(c=>c.uid===big.uid),true);
 assertUniversalMatch(packs,raised);

 let life=toPhase(fresh(counts,7903),'attack');
 const swinger=put(life,0,'IYS-1-053','front',0,true);
 const spared=put(life,0,'IYS-1-044','front',1,true);
 const trigger=crown(life,1,'IYS-1-079');
 life=swing(life,swinger.uid);
 assert.equal(life.pending.trigger,'special');
 life=choose(life,a=>a.mode==='special'&&a.uid===spared.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===spared.uid),true);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-080 rests one front character, and draws only when an effect puts it outside',()=>{
 const counts=countsFor(['IYS-1-080','IYS-1-056','IYS-1-069','IYS-1-044','IYS-1-042','IYS-1-041','IYS-1-062','IYS-1-049']);
 let none=toPhase(fresh(counts,8001),'main');
 readyAp(none);
 payRed(none);
 put(none,1,'IYS-1-042','energy',0);
 const blocked=take(none,0,'IYS-1-080');
 none.players[0].hand.push(blocked);
 assert.equal(legal(none,a=>a.type==='event'&&a.uid===blocked.uid),false);
 assertUniversalMatch(packs,none);

 let s=toPhase(fresh(counts,8002),'main');
 readyAp(s);
 payRed(s);
 put(s,0,'IYS-1-056','front',0);
 const front=put(s,1,'IYS-1-044','front',0,true);
 const energy=put(s,1,'IYS-1-042','energy',0,true);
 const event=take(s,0,'IYS-1-080');
 s.players[0].hand.push(event);
 const deck=s.players[0].deck.length;
 s=play(s,event.uid,'event');
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.pending.step,'restFoe');
 assert.equal(legal(s,a=>a.uid===front.uid),true);
 assert.equal(legal(s,a=>a.uid===energy.uid),false);
 assert.equal(legal(s,a=>a.mode==='skip'),false);
 s=choose(s,a=>a.uid===front.uid);
 assert.equal(find(s,1,front.uid).ready,false);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let drawn=toPhase(fresh(counts,8003),'main');
 readyAp(drawn);
 payRed(drawn);
 put(drawn,0,'IYS-1-056','front',0);
 const bone=take(drawn,0,'IYS-1-080');
 drawn.players[0].hand.push(bone);
 const mover=take(drawn,0,'IYS-1-069');
 drawn.players[0].hand.push(mover);
 const before=drawn.players[0].deck.length;
 drawn=play(drawn,mover.uid);
 assert.equal(drawn.players[0].deck.length,before-1);
 assert.equal(drawn.pending.kind,'effect-discard');
 drawn=choose(drawn,a=>a.type==='chooseDiscard'&&a.uid===bone.uid);
 assert.equal(drawn.players[0].outside.some(c=>c.uid===bone.uid),true);
 assert.equal(drawn.players[0].deck.length,before-2);
 assert.equal(drawn.pending,null);
 assertUniversalMatch(packs,drawn);

 let quiet=toPhase(fresh(counts,8004),'main');
 readyAp(quiet);
 payRed(quiet);
 const moved=take(quiet,0,'IYS-1-080');
 quiet.players[0].hand.push(moved);
 const other=take(quiet,0,'IYS-1-069');
 quiet.players[0].hand.push(other);
 const piled=quiet.players[0].deck.length;
 quiet=play(quiet,other.uid);
 quiet=choose(quiet,a=>a.type==='chooseDiscard'&&a.uid===moved.uid);
 assert.equal(quiet.players[0].deck.length,piled-1);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===moved.uid),true);
 assertUniversalMatch(packs,quiet);

 let life=toPhase(fresh(counts,8005),'attack');
 const attacker=put(life,0,'IYS-1-042','front',0,true);
 const trigger=crown(life,1,'IYS-1-080');
 life=swing(life,attacker.uid);
 assert.equal(life.pending,null);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

