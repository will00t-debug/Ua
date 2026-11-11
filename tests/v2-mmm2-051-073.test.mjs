import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalAttackDamage, universalBp,
 universalCardEnergy, universalEnergyByColor, universalImpact, universalPrivateChoices,
 universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required,each=4,more={}){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const trigger=pack.cards[id].trigger;
  let copies=more[id]??each;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(copies,2,4-caps[trigger]);
   caps[trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=(counts[id]||0)+add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function another(s,p,id){
 const pile=s.players[p].deck;
 const index=pile.findIndex(c=>c.cardId===id);
 if(index<0)throw Error('Deck missing '+id);
 const card=pile.splice(index,1)[0];
 s.players[p].hand.push(card);
 return card;
}
function dumpHand(s,p=0){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function crownFresh(s,p,id){
 const pile=s.players[p].deck;
 const index=pile.findIndex(c=>c.cardId===id);
 if(index<0)throw Error('Deck missing '+id);
 const card=pile.splice(index,1)[0];
 pile.unshift(card);
 return card;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function apReady(s,p=0){
 return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;
}
function acts(s){return legalUniversalActions(packs,s);}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function pick(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(acts(s).slice(0,8)));
 return use(s,action);
}
function play(s,uid,line='front'){
 const action=acts(s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line&&
  a.replaceUid===undefined);
 if(!action)throw Error('No play '+uid+' '+line);
 return use(s,action);
}
function event(s,uid){
 const action=acts(s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event '+uid);
 return use(s,action);
}
function activate(s,uid,mode='mmm2:0'){
 const action=acts(s).find(a=>a.type==='activate'&&a.uid===uid&&a.mode===mode);
 if(!action)throw Error('No activate '+uid+' '+mode);
 return use(s,action);
}
function raidOnto(s,uid,baseUid){
 const action=acts(s).find(a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);
 if(!action)throw Error('No raid '+uid+' onto '+baseUid);
 return use(s,action);
}
function field(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+(s.pending.kind||'')+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' at '+s.phase);
 }
 return s;
}
function listedUids(value,found=new Set()){
 if(!value||typeof value!=='object')return found;
 if(typeof value.uid==='string')found.add(value.uid);
 for(const child of Object.values(value))listedUids(child,found);
 return found;
}
function assertHidden(s,uids,viewer=1){
 const found=listedUids(universalPublicView(packs,s,viewer));
 for(const uid of uids)assert.equal(found.has(uid),false,uid);
}
function energy(s,p=0){return universalEnergyByColor(packs,s,p);}
function settle(s){
 let guard=0;
 while(s.pending&&['life-batch-order','life-trigger'].includes(s.pending.kind)){
  const action=s.pending.kind==='life-batch-order'?acts(s)[0]:{type:'chooseTrigger',mode:'skip'};
  s=use(s,action);
  if(++guard>12)throw Error('Life resolution stuck');
 }
 return s;
}
function passTurn(s){
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[1].deck.push(...s.players[1].hand.splice(0));
 let guard=0;
 while(s.active===0){
  if(s.pending)throw Error('Pending blocked the turn '+s.pending.kind+' '+s.pending.step);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Turn did not pass at '+s.phase);
 }
 return s;
}
function orderShared(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
 }
 return s;
}
function greens(s,n=4){
 for(let i=0;i<n;i++)put(s,0,'MMM-2-052','energy',i,true);
}

test('MMM-2-051 actives from the energy line and cuts the next printed 5',()=>{
 const counts=countsFor(['MMM-2-051','MMM-2-052','MMM-2-054','MMM-2-056','MMM-2-058','MMM-2-060']);
 let front=toPhase(fresh(counts,13051),'main');
 greens(front,3);
 dumpHand(front);
 const paid=toHand(front,0,'MMM-2-051');
 const fodder=toHand(front,0,'MMM-2-052');
 readyAp(front,0,1);
 front=play(front,paid.uid,'front');
 assert.equal(front.pending,null);
 assert.equal(front.players[0].hand.some(c=>c.uid===fodder.uid),true);
 assertUniversalMatch(packs,front);

 let skipped=toPhase(fresh(counts,13052),'main');
 greens(skipped,3);
 dumpHand(skipped);
 const body=toHand(skipped,0,'MMM-2-051');
 toHand(skipped,0,'MMM-2-052');
 readyAp(skipped,0,1);
 skipped=play(skipped,body.uid,'energy');
 assert.equal(skipped.pending.step,'u051');
 const rested=field(skipped,0,body.uid).ready;
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(field(skipped,0,body.uid).ready,rested);
 assertUniversalMatch(packs,skipped);

 let live=toPhase(fresh(counts,13053),'main');
 greens(live,3);
 dumpHand(live);
 const nemu=toHand(live,0,'MMM-2-051');
 const discarded=toHand(live,0,'MMM-2-052');
 readyAp(live,0,1);
 live=play(live,nemu.uid,'energy');
 live=pick(live,a=>a.uid===discarded.uid);
 assert.equal(field(live,0,nemu.uid).ready,true);
 assert.ok(live.players[0].outside.some(c=>c.uid===discarded.uid));
 assertUniversalMatch(packs,live);

 let reveal=toPhase(fresh(counts,13054),'main');
 greens(reveal,3);
 const actor=put(reveal,0,'MMM-2-051','front',0,true);
 const [small]=crown(reveal,0,['MMM-2-052']);
 readyAp(reveal,0,1);
 const quiet=reveal.publicReveals.length;
 reveal=activate(reveal,actor.uid);
 assert.equal(reveal.pending,null);
 assert.ok(reveal.players[0].hand.some(c=>c.uid===small.uid));
 assert.equal(reveal.publicReveals.some(r=>r.uid===small.uid&&r.kind==='deck-top'),true);
 assert.equal(reveal.players[0].nextPrintedEnergyApCut,null);
 assert.equal(reveal.publicReveals.length,quiet+1);
 assert.equal(field(reveal,0,actor.uid).ready,false);
 assert.equal(apReady(reveal),0);
 assertUniversalMatch(packs,reveal);

 let cut=toPhase(fresh(counts,13055),'main');
 greens(cut,3);
 put(cut,0,'MMM-2-054','energy',3,true);
 const source=put(cut,0,'MMM-2-051','front',0,true);
 const [big]=crown(cut,0,['MMM-2-056']);
 dumpHand(cut);
 const cheap=toHand(cut,0,'MMM-2-058');
 readyAp(cut,0,2);
 cut=activate(cut,source.uid);
 assert.equal(cut.players[0].nextPrintedEnergyApCut.amount,1);
 assert.equal(apReady(cut),1);
 assert.equal(acts(cut).some(a=>a.type==='play'&&a.uid===big.uid),true);
 cut=event(cut,cheap.uid);
 assert.equal(cut.players[0].nextPrintedEnergyApCut?.amount,1);
 assert.ok(cut.pending.kind==='effect-top-filter-many-choice'||cut.pending.kind==='effect-top-order');
 assertUniversalMatch(packs,cut);

 let spent=toPhase(fresh(counts,13056),'main');
 greens(spent,3);
 const payer=put(spent,0,'MMM-2-051','front',0,true);
 crown(spent,0,['MMM-2-060']);
 dumpHand(spent);
 readyAp(spent,0,1);
 spent=activate(spent,payer.uid);
 const reduced=spent.players[0].hand.find(c=>c.cardId==='MMM-2-060');
 assert.equal(effectiveHandRequiredEnergy(pack,spent,0,pack.cards['MMM-2-060'],reduced),3);
 assert.equal(apReady(spent),0);
 assert.ok(acts(spent).some(a=>a.type==='event'&&a.uid===reduced.uid));
 spent=event(spent,reduced.uid);
 assert.equal(spent.players[0].nextPrintedEnergyApCut,null);
 assert.equal(spent.pending.step,'look060');
 assertUniversalMatch(packs,spent);
});

test('MMM-2-052 has no play effect and its life trigger only draws',()=>{
 const counts=countsFor(['MMM-2-052','MMM-2-042']);
 let s=toPhase(fresh(counts,13057),'main');
 const tsukasa=toHand(s,0,'MMM-2-052');
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,tsukasa.uid,'energy');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===tsukasa.uid),false);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,13058),'attack');
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-052','MMM-2-042']);
 const before=life.players[1].deck.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('MMM-2-053 life active grants 3000 and play does nothing else',()=>{
 const counts=countsFor(['MMM-2-053','MMM-2-042']);
 let s=toPhase(fresh(counts,13059),'main');
 const tsukuyo=toHand(s,0,'MMM-2-053');
 readyAp(s,0,1);
 s=play(s,tsukuyo.uid,'energy');
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,field(s,0,tsukuyo.uid)),2000);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,13060),'attack');
 const rested=put(life,1,'MMM-2-042','front',0,false);
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-053','MMM-2-042']);
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'active');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(life,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,life,field(life,1,rested.uid)),4500);
 assertUniversalMatch(packs,life);
});

test('MMM-2-054 adds one green only while active',()=>{
 const counts=countsFor(['MMM-2-054']);
 let s=toPhase(fresh(counts,13061),'main');
 const mifuyu=put(s,0,'MMM-2-054','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,mifuyu),2);
 assert.equal(energy(s).green,2);
 mifuyu.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,mifuyu),1);
 assert.equal(energy(s).green,1);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Q2361 and Q2362 MMM-2-055 waits for the revealer and locks on the offer',()=>{
 const counts=countsFor(['MMM-2-055','MMM-2-050','MMM-2-052','MMM-2-042','MMM-2-051','MMM-2-027','MMM-2-046']);
 let s=toPhase(fresh(counts,13062),'main');
 put(s,0,'MMM-2-052','energy',0,true);
 const nemu=toHand(s,0,'MMM-2-050');
 const [mifuyu,alina,villa]=crown(s,0,['MMM-2-055','MMM-2-042','MMM-2-027']);
 readyAp(s,0,1);
 s=play(s,nemu.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[mifuyu.uid,alina.uid,villa.uid]);
 assert.equal(looked.options.some(o=>o.action.uid===villa.uid),false);
 assertHidden(s,[mifuyu.uid,alina.uid,villa.uid]);
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===mifuyu.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.notEqual(s.pending.step,'u055');
 s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===alina.uid);
 s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===villa.uid);
 assert.equal(s.pending.kind,'effect-discard');
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid!==mifuyu.uid);
 assert.equal(s.pending.step,'u055');
 assert.ok(s.mainReadyOnceByName[0].includes('梓 みふゆ|revealed'));
 s=pick(s,a=>a.uid===nemu.uid);
 assert.equal(universalBp(packs,s,field(s,0,nemu.uid)),2500);
 assert.equal(universalImpact(packs,s,field(s,0,nemu.uid)),1);
 const second=put(s,0,'MMM-2-051','front',1,true);
 crownFresh(s,0,'MMM-2-055');
 readyAp(s,0,1);
 s=activate(s,second.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.filter(c=>c.cardId==='MMM-2-055').length,2);
 assertUniversalMatch(packs,s);

 let chosen=toPhase(fresh(counts,13063),'main');
 put(chosen,0,'MMM-2-052','energy',0,true);
 const host=put(chosen,0,'MMM-2-042','front',0,true);
 const revealer=put(chosen,0,'MMM-2-051','front',1,true);
 crown(chosen,0,['MMM-2-055']);
 readyAp(chosen,0,1);
 chosen=activate(chosen,revealer.uid);
 assert.equal(chosen.pending.step,'u055');
 chosen=pick(chosen,a=>a.mode==='skip');
 assert.equal(universalBp(packs,chosen,field(chosen,0,host.uid)),1500);
 assert.equal(universalImpact(packs,chosen,field(chosen,0,host.uid)),0);
 assert.ok(chosen.mainReadyOnceByName[0].includes('梓 みふゆ|revealed'));
 assertUniversalMatch(packs,chosen);

 let board=toPhase(fresh(counts,13064),'main');
 put(board,0,'MMM-2-042','front',0,true);
 put(board,0,'MMM-2-046','front',1,true);
 put(board,0,'MMM-2-050','energy',0,true);
 const self=put(board,0,'MMM-2-055','front',2,true);
 const discounted=toHand(board,0,'MMM-2-055');
 assert.equal(effectiveHandRequiredEnergy(pack,board,0,pack.cards['MMM-2-055'],discounted),3);
 assert.equal(universalBp(packs,board,self),4000);
 board=passTurn(board);
 assert.equal(universalBp(packs,board,field(board,0,self.uid)),3000);
 assertUniversalMatch(packs,board);
});

test('MMM-2-056 actives, picks one unused magius option, and deals 2 after a 5 reveal',()=>{
 const counts=countsFor(['MMM-2-056','MMM-2-042','MMM-2-046','MMM-2-050','MMM-2-052','MMM-2-054','MMM-2-051','MMM-2-055']);
 let quiet=toPhase(fresh(counts,13065),'main');
 put(quiet,0,'MMM-2-042','front',0,true);
 put(quiet,0,'MMM-2-046','front',1,true);
 for(let i=0;i<3;i++)put(quiet,0,'MMM-2-052','energy',i,true);
 put(quiet,0,'MMM-2-054','energy',3,true);
 const holy=toHand(quiet,0,'MMM-2-056');
 readyAp(quiet,0,2);
 quiet=play(quiet,holy.uid);
 assert.equal(quiet.pending,null);
 assert.equal(field(quiet,0,holy.uid).ready,true);
 assert.equal(universalBp(packs,quiet,field(quiet,0,holy.uid)),4000);
 assertUniversalMatch(packs,quiet);

 let s=toPhase(fresh(counts,13066),'main');
 put(s,0,'MMM-2-042','front',0,true);
 put(s,0,'MMM-2-046','front',1,true);
 put(s,0,'MMM-2-050','energy',0,true);
 for(let i=1;i<3;i++)put(s,0,'MMM-2-052','energy',i,true);
 put(s,0,'MMM-2-054','energy',3,true);
 const first=toHand(s,0,'MMM-2-056');
 const second=another(s,0,'MMM-2-056');
 readyAp(s,0,3);
 const restedBefore=apReady(s);
 s=play(s,first.uid);
 assert.equal(s.pending.step,'u056');
 assert.equal(acts(s).some(a=>a.mode==='skip'),false);
 assert.ok(acts(s).some(a=>a.mode==='a')&&acts(s).some(a=>a.mode==='b'));
 s=pick(s,a=>a.mode==='a');
 assert.equal(apReady(s),restedBefore-2+1);
 assert.equal(universalBp(packs,s,field(s,0,first.uid)),5000);
 assert.equal(universalImpact(packs,s,field(s,0,first.uid)),0);
 s=play(s,second.uid);
 assert.equal(s.pending.step,'u056');
 assert.equal(acts(s).some(a=>a.mode==='a'),false);
 s=pick(s,a=>a.mode==='b');
 assert.equal(universalBp(packs,s,field(s,0,second.uid)),5000);
 assert.equal(universalImpact(packs,s,field(s,0,second.uid)),1);
 assertUniversalMatch(packs,s);

 let damage=toPhase(fresh(counts,13067),'main');
 const revealer=put(damage,0,'MMM-2-051','front',0,true);
 const attacker=put(damage,0,'MMM-2-056','front',1,true);
 crown(damage,0,['MMM-2-055']);
 readyAp(damage,0,1);
 damage=activate(damage,revealer.uid);
 assert.equal(damage.pending.step,'u055');
 damage=pick(damage,a=>a.mode==='skip');
 assert.equal(damage.players[0].deckRevealEnergy5,damage.turn);
 assert.equal(universalAttackDamage(packs,damage,field(damage,0,attacker.uid)),2);
 setLife(damage,1,['MMM-2-054','MMM-2-054','MMM-2-054']);
 damage=toPhase(damage,'attack');
 damage=use(damage,{type:'attack',uid:attacker.uid});
 assert.equal(damage.pending.kind,'block');
 damage=pick(damage,a=>a.type==='chooseBlock'&&a.uid===null);
 damage=settle(damage);
 assert.equal(damage.players[1].life.length,1);
 assertUniversalMatch(packs,damage);

 let plain=toPhase(fresh(counts,13068),'attack');
 const solo=put(plain,0,'MMM-2-056','front',0,true);
 setLife(plain,1,['MMM-2-054','MMM-2-054','MMM-2-054']);
 assert.equal(universalAttackDamage(packs,plain,solo),1);
 plain=use(plain,{type:'attack',uid:solo.uid});
 plain=pick(plain,a=>a.type==='chooseBlock'&&a.uid===null);
 plain=settle(plain);
 assert.equal(plain.players[1].life.length,2);
 assertUniversalMatch(packs,plain);
});

test('MMM-2-057 pays rest and retirement, then may rest a zero-cost villa',()=>{
 const counts=countsFor(['MMM-2-057','MMM-2-037','MMM-2-042']);
 let illegal=toPhase(fresh(counts,13069),'main');
 dumpHand(illegal);
 const fieldCard=toHand(illegal,0,'MMM-2-057');
 readyAp(illegal,0,1);
 assert.equal(acts(illegal).some(a=>a.type==='play'&&a.uid===fieldCard.uid&&a.line==='front'),false);
 illegal=play(illegal,fieldCard.uid,'energy');
 assert.equal(illegal.pending,null);
 assert.equal(illegal.players[0].energy.some(c=>c?.uid===fieldCard.uid),true);
 assertUniversalMatch(packs,illegal);

 let s=toPhase(fresh(counts,13070),'main');
 const source=put(s,0,'MMM-2-057','energy',0,true);
 const felicia=toHand(s,0,'MMM-2-037');
 const alina=toHand(s,0,'MMM-2-042');
 const buried=take(s,0,'MMM-2-057');
 s.players[0].outside.push(buried);
 s=activate(s,source.uid);
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.pending.step,'deploy');
 assert.equal(acts(s).some(a=>a.uid===alina.uid),false);
 assert.equal(acts(s).some(a=>a.uid===buried.uid),false);
 assert.ok(acts(s).some(a=>a.uid===felicia.uid&&a.line==='energy'));
 s=pick(s,a=>a.uid===felicia.uid&&a.line==='energy');
 assert.equal(field(s,0,felicia.uid).ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let skip=toPhase(fresh(counts,13071),'main');
 const empty=put(skip,0,'MMM-2-057','energy',0,true);
 skip=activate(skip,empty.uid);
 assert.equal(skip.pending,null);
 assert.ok(skip.players[0].outside.some(c=>c.uid===empty.uid));
 assertUniversalMatch(packs,skip);
});

test('MMM-2-058 publishes distinct villa names and orders every leftover',()=>{
 const counts=countsFor(['MMM-2-058','MMM-2-026','MMM-2-027','MMM-2-029','MMM-2-039','MMM-2-042','MMM-2-052','MMM-2-051','MMM-2-055','MMM-2-056','MMM-2-054']);
 let s=toPhase(fresh(counts,13072),'main');
 greens(s,4);
 dumpHand(s);
 const spell=toHand(s,0,'MMM-2-058');
 const window=crown(s,0,['MMM-2-026','MMM-2-027','MMM-2-029','MMM-2-042','MMM-2-039']);
 readyAp(s,0,1);
 s=event(s,spell.uid);
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 let looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(looked.options.some(o=>o.action.uid===window[3].uid),false);
 assertHidden(s,window.map(c=>c.uid));
 s=pick(s,a=>a.type==='chooseTopFilteredMany'&&a.uid===window[0].uid);
 looked=universalPrivateChoices(packs,s,0);
 assert.equal(looked.inspected.some(c=>c.uid===window[1].uid),true);
 assert.equal(looked.options.some(o=>o.action.uid===window[1].uid),false);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid&&r.kind==='searched-to-hand'),true);
 assertHidden(s,[window[1].uid,window[3].uid]);
 s=pick(s,a=>a.type==='chooseTopFilteredMany'&&a.uid===window[2].uid);
 s=pick(s,a=>a.type==='chooseTopFilteredMany'&&a.uid===window[4].uid);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 s=orderShared(s,[window[3].uid,window[1].uid]);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[3].uid,window[1].uid]);
 assert.equal(s.publicReveals.some(r=>r.uid===window[3].uid),false);
 assertUniversalMatch(packs,s);

 let none=toPhase(fresh(counts,13073),'main');
 greens(none,4);
 dumpHand(none);
 const empty=toHand(none,0,'MMM-2-058');
 const missed=crown(none,0,['MMM-2-042','MMM-2-051','MMM-2-055','MMM-2-056','MMM-2-054']);
 readyAp(none,0,1);
 const reveals=none.publicReveals.length;
 none=event(none,empty.uid);
 assert.equal(none.pending.kind,'effect-top-order');
 none=pick(none,a=>a.type==='chooseTopOrder');
 none=pick(none,a=>a.type==='chooseTopOrder');
 none=pick(none,a=>a.type==='chooseTopOrder');
 assert.equal(none.pending.kind,'effect-top-order');
 none=orderShared(none,none.pending.uids.filter(uid=>!none.pending.order.includes(uid)));
 assert.equal(none.pending,null);
 assert.equal(none.publicReveals.length,reveals);
 assert.equal(none.players[0].hand.some(c=>missed.some(card=>card.uid===c.uid)),false);
 assertUniversalMatch(packs,none);
});

test('MMM-2-059 retires 3000, or 5000 when Iroha is on the field',()=>{
 const counts=countsFor(['MMM-2-059','MMM-2-027','MMM-2-028','MMM-2-052','MMM-2-065','MMM-2-054']);
 let low=toPhase(fresh(counts,13074),'main');
 greens(low,4);
 const small=put(low,1,'MMM-2-027','front',0,true);
 const tall=put(low,1,'MMM-2-028','front',1,true);
 dumpHand(low);
 const spell=toHand(low,0,'MMM-2-059');
 readyAp(low,0,1);
 low=event(low,spell.uid);
 assert.equal(low.pending.kind,'effect-retire-bp');
 assert.equal(low.pending.limit,3000);
 assert.ok(acts(low).some(a=>a.uid===small.uid));
 assert.equal(acts(low).some(a=>a.uid===tall.uid),false);
 assert.equal(acts(low).some(a=>a.uid==null),false);
 low=pick(low,a=>a.type==='chooseRetireBp'&&a.uid===small.uid);
 assert.equal(low.pending,null);
 assert.equal(field(low,1,tall.uid).bp??pack.cards['MMM-2-028'].bp,3500);
 assert.ok(low.players[1].outside.some(c=>c.uid===small.uid));
 assertUniversalMatch(packs,low);

 let high=toPhase(fresh(counts,13075),'main');
 greens(high,4);
 put(high,0,'MMM-2-027','front',0,true);
 const irohaTarget=put(high,1,'MMM-2-028','front',0,true);
 dumpHand(high);
 const raised=toHand(high,0,'MMM-2-059');
 readyAp(high,0,1);
 high=event(high,raised.uid);
 assert.equal(high.pending.limit,5000);
 assert.ok(acts(high).some(a=>a.uid===irohaTarget.uid));
 high=pick(high,a=>a.type==='chooseRetireBp'&&a.uid===irohaTarget.uid);
 assert.equal(high.players[1].front[0],null);
 assertUniversalMatch(packs,high);

 let life=toPhase(fresh(counts,13076),'attack');
 const attacker=put(life,0,'MMM-2-065','front',0,true);
 setLife(life,1,['MMM-2-059','MMM-2-054']);
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'special');
 assert.ok(acts(life).some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===attacker.uid));
 const hand=life.players[1].hand.length;
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===attacker.uid);
 assert.equal(life.players[0].front[0],null);
 assert.equal(life.players[1].hand.length,hand);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('MMM-2-060 looks privately, adds up to two, and orders two or more on top',()=>{
 const counts=countsFor(['MMM-2-060','MMM-2-052','MMM-2-042','MMM-2-026','MMM-2-054']);
 let s=toPhase(fresh(counts,13077),'main');
 greens(s,3);
 dumpHand(s);
 const spell=toHand(s,0,'MMM-2-060');
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-2-060'],spell),3);
 const window=crown(s,0,['MMM-2-042','MMM-2-026','MMM-2-054','MMM-2-052']);
 readyAp(s,0,1);
 const reveals=s.publicReveals.length;
 s=event(s,spell.uid);
 assert.equal(s.pending.step,'look060');
 let looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(looked.options.filter(o=>o.action.uid).length,4);
 assertHidden(s,window.map(c=>c.uid));
 s=pick(s,a=>a.uid===window[1].uid);
 assert.equal(s.pending.step,'look060');
 looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[window[0].uid,window[2].uid,window[3].uid]);
 assert.equal(looked.options.some(o=>o.action.uid===window[1].uid),false);
 assertHidden(s,[window[0].uid,window[2].uid,window[3].uid]);
 s=pick(s,a=>a.uid===window[3].uid);
 assert.equal(s.pending.step,'orderWindow');
 assertHidden(s,[window[0].uid,window[2].uid]);
 s=pick(s,a=>a.uid===window[2].uid);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[2].uid,window[0].uid]);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[1].uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===window[3].uid));
 assert.equal(s.publicReveals.length,reveals);
 assertUniversalMatch(packs,s);

 let one=toPhase(fresh(counts,13078),'main');
 greens(one,3);
 dumpHand(one);
 const short=toHand(one,0,'MMM-2-060');
 const trio=crown(one,0,['MMM-2-042','MMM-2-026','MMM-2-054']);
 readyAp(one,0,1);
 one.players[0].outside.push(...one.players[0].deck.splice(3));
 one=event(one,short.uid);
 one=pick(one,a=>a.uid===trio[0].uid);
 one=pick(one,a=>a.uid===trio[1].uid);
 assert.equal(one.pending,null);
 assert.equal(one.players[0].deck[0].uid,trio[2].uid);
 assertUniversalMatch(packs,one);

 let all=toPhase(fresh(counts,13079),'main');
 greens(all,3);
 dumpHand(all);
 const leave=toHand(all,0,'MMM-2-060');
 const four=crown(all,0,['MMM-2-042','MMM-2-026','MMM-2-054','MMM-2-052']);
 readyAp(all,0,1);
 all=event(all,leave.uid);
 all=pick(all,a=>a.mode==='done');
 assert.equal(all.pending.step,'orderWindow');
 all=pick(all,a=>a.uid===four[3].uid);
 all=pick(all,a=>a.uid===four[1].uid);
 all=pick(all,a=>a.uid===four[0].uid);
 assert.equal(all.pending,null);
 assert.deepEqual(all.players[0].deck.slice(0,4).map(c=>c.uid),
  [four[3].uid,four[1].uid,four[0].uid,four[2].uid]);
 assertUniversalMatch(packs,all);

 let life=toPhase(fresh(counts,13080),'attack');
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-060','MMM-2-054']);
 const before=life.players[1].deck.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(life.pending,null);
 assert.equal(life.players[1].deck.length,before-1);
 assertUniversalMatch(packs,life);
});

test('MMM-2-041 and MMM-2-046 still filter, hide, and order beside 060',()=>{
 const counts=countsFor(['MMM-2-041','MMM-2-031','MMM-2-027','MMM-2-029','MMM-2-042','MMM-2-026','MMM-2-044','MMM-2-039','MMM-2-046']);
 let s=toPhase(fresh(counts,13081),'main');
 put(s,0,'MMM-2-042','energy',0,true);
 put(s,0,'MMM-2-042','energy',1,true);
 put(s,0,'MMM-2-042','energy',2,true);
 const bounced=put(s,0,'MMM-2-029','front',0,true);
 const yachiyo=toHand(s,0,'MMM-2-031');
 const iroha=toHand(s,0,'MMM-2-027');
 const tsuruno=toHand(s,0,'MMM-2-041');
 readyAp(s);
 s=play(s,yachiyo.uid,'energy');
 s=pick(s,a=>a.uid===bounced.uid);
 s=pick(s,a=>a.uid===iroha.uid&&a.line==='front'&&a.mode==='rest');
 s=play(s,tsuruno.uid);
 setLife(s,1,['MMM-2-026','MMM-2-026','MMM-2-026']);
 const [villa,magius,alina]=crown(s,0,['MMM-2-039','MMM-2-042','MMM-2-044']);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:tsuruno.uid});
 assert.equal(s.pending.step,'u041');
 const looked=universalPrivateChoices(packs,s,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),[villa.uid,magius.uid,alina.uid]);
 assert.equal(looked.options.some(o=>o.action.uid===magius.uid),false);
 assertHidden(s,[villa.uid,magius.uid,alina.uid]);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending.step,'orderWindow');
 s=pick(s,a=>a.uid===alina.uid);
 s=pick(s,a=>a.uid===magius.uid);
 assert.equal(s.pending.kind,'block');
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[alina.uid,magius.uid,villa.uid]);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(field(s,0,tsuruno.uid).ready,true);
 s=use(s,{type:'attack',uid:tsuruno.uid});
 assert.equal(s.pending.kind,'block');
 assert.notEqual(s.pending.step,'u041');
 assertUniversalMatch(packs,s);

 let side=toPhase(fresh(counts,13082),'main');
 const tomoka=toHand(side,0,'MMM-2-046');
 const pair=crown(side,0,['MMM-2-042','MMM-2-026']);
 readyAp(side,0,1);
 side=play(side,tomoka.uid);
 assert.equal(side.pending.step,'u046');
 const window=universalPrivateChoices(packs,side,0);
 assert.equal(window.options.some(o=>o.action.uid===pair[1].uid),false);
 assert.ok(window.options.some(o=>o.action.uid===pair[0].uid));
 assertHidden(side,pair.map(c=>c.uid));
 side=pick(side,a=>a.mode==='done');
 side=pick(side,a=>a.uid===pair[1].uid);
 assert.equal(side.players[0].deck[0].uid,pair[1].uid);
 assert.equal(side.players[0].outside.some(c=>c.uid===pair[0].uid),false);
 assertUniversalMatch(packs,side);
});

test('MMM-2-061 scales the retirement, then draws and discards',()=>{
 const counts=countsFor(['MMM-2-061','MMM-2-042','MMM-2-052','MMM-2-028','MMM-2-029','MMM-2-054','MMM-2-027']);
 let none=toPhase(fresh(counts,13083),'main');
 for(let i=0;i<3;i++)put(none,0,'MMM-2-027','energy',i,true);
 put(none,0,'MMM-2-054','energy',3,true);
 const stayed=put(none,1,'MMM-2-028','front',0,true);
 dumpHand(none);
 const spell=toHand(none,0,'MMM-2-061');
 const before=none.players[0].deck.length;
 readyAp(none,0,1);
 none=event(none,spell.uid);
 assert.equal(none.pending.step,'handOut');
 assert.equal(none.players[0].deck.length,before-1);
 assert.equal(field(none,1,stayed.uid)?.cardId,'MMM-2-028');
 assert.equal(acts(none).some(a=>a.mode==='skip'),false);
 none=pick(none,a=>a.type==='mmm2');
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.length>0,true);
 assertUniversalMatch(packs,none);

 let scaled=toPhase(fresh(counts,13084),'main');
 for(let i=0;i<3;i++)put(scaled,0,'MMM-2-027','energy',i,true);
 put(scaled,0,'MMM-2-054','energy',3,true);
 put(scaled,0,'MMM-2-042','front',0,true);
 const low=put(scaled,1,'MMM-2-029','front',0,true);
 const high=put(scaled,1,'MMM-2-028','front',1,true);
 dumpHand(scaled);
 const raised=toHand(scaled,0,'MMM-2-061');
 readyAp(scaled,0,1);
 scaled=event(scaled,raised.uid);
 assert.equal(scaled.pending.step,'u061');
 assert.ok(acts(scaled).some(a=>a.uid===low.uid));
 assert.equal(acts(scaled).some(a=>a.uid===high.uid),false);
 scaled=pick(scaled,a=>a.uid===low.uid);
 assert.equal(scaled.pending.step,'handOut');
 assert.ok(scaled.players[1].outside.some(c=>c.uid===low.uid));
 assert.equal(field(scaled,1,high.uid).cardId,'MMM-2-028');
 scaled=pick(scaled,a=>a.type==='mmm2');
 assert.equal(scaled.pending,null);
 assertUniversalMatch(packs,scaled);

 let life=toPhase(fresh(counts,13085),'attack');
 const attacker=put(life,0,'MMM-2-028','front',0,true);
 setLife(life,1,['MMM-2-061','MMM-2-054']);
 const hand=life.players[1].hand.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===attacker.uid);
 assert.equal(life.players[0].front[0],null);
 assert.equal(life.players[1].hand.length,hand);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('MMM-2-062 readies up to two AP and its final trigger needs an empty life',()=>{
 const counts=countsFor(['MMM-2-062','MMM-2-052','MMM-2-054','MMM-2-042']);
 let s=toPhase(fresh(counts,13086),'main');
 greens(s,3);
 dumpHand(s);
 const spell=toHand(s,0,'MMM-2-062');
 readyAp(s,0,1);
 s.players[0].apCards[1].inPlay=true;
 s.players[0].apCards[2].inPlay=true;
 s=event(s,spell.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 assert.ok(acts(s).some(a=>a.type==='chooseApRecovery'&&a.uid===null));
 const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready).map(c=>c.uid);
 assert.equal(rested.length,3);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===rested[0]);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===rested[1]);
 assert.equal(s.pending,null);
 assert.equal(apReady(s),2);
 assertUniversalMatch(packs,s);

 let skip=toPhase(fresh(counts,13087),'main');
 greens(skip,3);
 dumpHand(skip);
 const declined=toHand(skip,0,'MMM-2-062');
 readyAp(skip,0,1);
 skip.players[0].apCards[1].inPlay=true;
 skip=event(skip,declined.uid);
 skip=pick(skip,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(apReady(skip),0);
 assertUniversalMatch(packs,skip);

 let buried=toPhase(fresh(counts,13088),'attack');
 const attacker=put(buried,0,'MMM-2-042','front',0,true);
 setLife(buried,1,['MMM-2-062','MMM-2-054']);
 buried=use(buried,{type:'attack',uid:attacker.uid});
 buried=pick(buried,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(buried.pending,null);
 assert.ok(buried.players[1].outside.some(c=>c.cardId==='MMM-2-062'));
 assert.equal(buried.players[1].life.length,1);
 assertUniversalMatch(packs,buried);

 let last=toPhase(fresh(counts,13089),'attack');
 const finisher=put(last,0,'MMM-2-042','front',0,true);
 setLife(last,1,['MMM-2-062']);
 const top=last.players[1].deck[0];
 last=use(last,{type:'attack',uid:finisher.uid});
 last=pick(last,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(last.pending.trigger,'final');
 last=pick(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life[0].uid,top.uid);
 assert.equal(last.status,'playing');
 assertUniversalMatch(packs,last);
});

test('MMM-2-063 looks and draws only after a hand card is placed outside',()=>{
 const counts=countsFor(['MMM-2-063','MMM-2-064','MMM-2-042','MMM-2-052','MMM-2-054']);
 let empty=toPhase(fresh(counts,13090),'main');
 dumpHand(empty);
 const solo=toHand(empty,0,'MMM-2-063');
 const deck=empty.players[0].deck.length;
 readyAp(empty,0,1);
 empty=play(empty,solo.uid);
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length,deck);
 assert.equal(empty.players[0].hand.length,0);
 assertUniversalMatch(packs,empty);

 let skipped=toPhase(fresh(counts,13091),'main');
 dumpHand(skipped);
 const homura=toHand(skipped,0,'MMM-2-063');
 const kept=toHand(skipped,0,'MMM-2-064');
 const untouched=skipped.players[0].deck.length;
 readyAp(skipped,0,1);
 skipped=play(skipped,homura.uid);
 assert.equal(skipped.pending.step,'u063');
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,untouched);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===kept.uid));
 assertUniversalMatch(packs,skipped);

 let bottom=toPhase(fresh(counts,13092),'main');
 dumpHand(bottom);
 const actor=toHand(bottom,0,'MMM-2-063');
 const fodder=toHand(bottom,0,'MMM-2-064');
 const [looked,next]=crown(bottom,0,['MMM-2-042','MMM-2-052']);
 readyAp(bottom,0,1);
 bottom=play(bottom,actor.uid);
 bottom=pick(bottom,a=>a.uid===fodder.uid);
 assert.equal(bottom.pending.step,'placeOne');
 const privateLook=universalPrivateChoices(packs,bottom,0);
 assert.equal(privateLook.inspected?.[0]?.uid,looked.uid);
 assertHidden(bottom,[looked.uid]);
 bottom=pick(bottom,a=>a.mode==='bottom');
 assert.equal(bottom.pending,null);
 assert.ok(bottom.players[0].hand.some(c=>c.uid===next.uid));
 assert.equal(bottom.players[0].hand.some(c=>c.uid===looked.uid),false);
 assert.equal(bottom.players[0].deck.at(-1).uid,looked.uid);
 assert.ok(bottom.players[0].outside.some(c=>c.uid===fodder.uid));
 assertUniversalMatch(packs,bottom);

 let life=toPhase(fresh(counts,13093),'attack');
 const rested=put(life,1,'MMM-2-064','energy',0,false);
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-063','MMM-2-054']);
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'active');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 assert.equal(life.pending,null);
 assert.equal(field(life,1,rested.uid).ready,true);
 assertUniversalMatch(packs,life);
});

test('MMM-2-064 only draws from its life trigger',()=>{
 const counts=countsFor(['MMM-2-064','MMM-2-042']);
 let s=toPhase(fresh(counts,13094),'main');
 const madoka=toHand(s,0,'MMM-2-064');
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,madoka.uid,'energy');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(universalBp(packs,s,field(s,0,madoka.uid)),2000);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,13095),'attack');
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-064','MMM-2-042']);
 const before=life.players[1].deck.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.pending,null);
 assertUniversalMatch(packs,life);
});

test('MMM-2-065 readies on the first block and draws after life moved to hand',()=>{
 const counts=countsFor(['MMM-2-065','MMM-2-042','MMM-2-071','MMM-2-064','MMM-2-054']);
 let quiet=toPhase(fresh(counts,13096),'main');
 for(let i=0;i<4;i++)put(quiet,0,'MMM-2-064','energy',i,true);
 const kyoko=toHand(quiet,0,'MMM-2-065');
 readyAp(quiet,0,1);
 const deck=quiet.players[0].deck.length;
 quiet=play(quiet,kyoko.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,deck);
 assertUniversalMatch(packs,quiet);

 let drawn=toPhase(fresh(counts,13097),'main');
 for(let i=0;i<4;i++)put(drawn,0,'MMM-2-064','energy',i,true);
 const sayaka=put(drawn,0,'MMM-2-071','front',0,true);
 setLife(drawn,0,['MMM-2-054','MMM-2-054']);
 drawn=activate(drawn,sayaka.uid);
 const lifeCard=drawn.players[0].life[0];
 drawn=pick(drawn,a=>a.uid===lifeCard.uid);
 assert.equal(drawn.pending,null);
 const paid=toHand(drawn,0,'MMM-2-065');
 const before=drawn.players[0].deck.length;
 readyAp(drawn,0,1);
 drawn=play(drawn,paid.uid);
 assert.equal(drawn.players[0].deck.length,before-1);
 assert.equal(drawn.pending,null);
 assertUniversalMatch(packs,drawn);

 let block=toPhase(fresh(counts,13098),'attack');
 const first=put(block,0,'MMM-2-042','front',0,true);
 const second=put(block,0,'MMM-2-042','front',1,true);
 const wall=put(block,1,'MMM-2-065','front',0,true);
 setLife(block,1,['MMM-2-054','MMM-2-054']);
 block=use(block,{type:'attack',uid:first.uid});
 block=pick(block,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(field(block,1,wall.uid).ready,true);
 assert.equal(field(block,0,first.uid).ready,false);
 assert.equal(block.players[1].life.length,2);
 block=use(block,{type:'attack',uid:second.uid});
 block=pick(block,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(field(block,1,wall.uid).ready,false);
 assert.equal(block.players[1].life.length,2);
 assertUniversalMatch(packs,block);
});

test('MMM-2-066 publishes one Kyoko or Sayaka and discards only after adding',()=>{
 const counts=countsFor(['MMM-2-066','MMM-2-065','MMM-2-070','MMM-2-064','MMM-2-068','MMM-2-063','MMM-2-052']);
 let added=toPhase(fresh(counts,13099),'main');
 put(added,0,'MMM-2-064','energy',0,true);
 dumpHand(added);
 const pile=added.players[0].deck;
 const spare=pile.splice(pile.findIndex(c=>c.cardId==='MMM-2-064'),1)[0];
 const window=crown(added,0,['MMM-2-065','MMM-2-064','MMM-2-068','MMM-2-070']);
 const kyoko=toHand(added,0,'MMM-2-066');
 added.players[0].hand.push(spare);
 readyAp(added,0,1);
 added=play(added,kyoko.uid);
 assert.equal(added.pending.kind,'effect-top-filter-choice');
 const looked=universalPrivateChoices(packs,added,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(looked.options.some(o=>o.action.uid===window[1].uid),false);
 assert.equal(looked.options.some(o=>o.action.uid===window[2].uid),false);
 assert.ok(looked.options.some(o=>o.action.uid===window[0].uid));
 assertHidden(added,window.map(c=>c.uid));
 added=pick(added,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(added.publicReveals.some(r=>r.uid===window[0].uid&&r.kind==='searched-to-hand'),true);
 assertHidden(added,[window[1].uid,window[2].uid,window[3].uid]);
 added=orderShared(added,[window[3].uid,window[2].uid,window[1].uid]);
 assert.equal(added.pending.kind,'effect-discard');
 added=pick(added,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(added.pending,null);
 assert.deepEqual(added.players[0].deck.slice(-3).map(c=>c.uid),
  [window[3].uid,window[2].uid,window[1].uid]);
 assertUniversalMatch(packs,added);

 let missed=toPhase(fresh(counts,13100),'main');
 put(missed,0,'MMM-2-064','energy',0,true);
 dumpHand(missed);
 const other=toHand(missed,0,'MMM-2-066');
 const none=crown(missed,0,['MMM-2-064','MMM-2-068','MMM-2-063','MMM-2-052']);
 readyAp(missed,0,1);
 missed=play(missed,other.uid);
 assert.equal(missed.pending.kind,'effect-top-order');
 missed=orderShared(missed,none.map(c=>c.uid));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>none.some(card=>card.uid===c.uid)),false);
 assertUniversalMatch(packs,missed);
});

test('Q2363 MMM-2-067 discounts an empty field, buffs, and draws only after an open attack',()=>{
 const counts=countsFor(['MMM-2-067','MMM-2-064','MMM-2-068','MMM-2-070','MMM-2-052','MMM-2-071','MMM-1-083','MMM-2-042','MMM-2-054']);
 let cost=toPhase(fresh(counts,13101),'main');
 dumpHand(cost);
 const cheap=toHand(cost,0,'MMM-2-067');
 assert.equal(effectiveHandRequiredEnergy(pack,cost,0,pack.cards['MMM-2-067'],cheap),0);
 put(cost,0,'MMM-2-064','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,cost,0,pack.cards['MMM-2-067'],cheap),2);
 assertUniversalMatch(packs,cost);

 let names=toPhase(fresh(counts,13102),'main');
 const self=put(names,0,'MMM-2-067','front',0,true);
 put(names,0,'MMM-2-064','energy',0,true);
 put(names,0,'MMM-2-068','energy',1,true);
 put(names,0,'MMM-2-070','energy',2,true);
 put(names,0,'MMM-2-052','front',1,true);
 assert.equal(universalBp(packs,names,self),3000);
 names=passTurn(names);
 assert.equal(universalBp(packs,names,field(names,0,self.uid)),2000);
 assertUniversalMatch(packs,names);

 let lifeBonus=toPhase(fresh(counts,13103),'main');
 const kyoko=put(lifeBonus,0,'MMM-2-067','front',0,true);
 const sayaka=put(lifeBonus,0,'MMM-2-071','front',1,true);
 setLife(lifeBonus,0,['MMM-2-054','MMM-2-054']);
 lifeBonus=activate(lifeBonus,sayaka.uid);
 lifeBonus=pick(lifeBonus,a=>a.type==='mmm2');
 assert.equal(universalBp(packs,lifeBonus,field(lifeBonus,0,kyoko.uid)),3000);
 assertUniversalMatch(packs,lifeBonus);

 let raid=toPhase(fresh(counts,13104),'main');
 const base=put(raid,0,'MMM-2-067','front',0,true);
 const attacker=put(raid,0,'MMM-2-071','front',1,true);
 for(let i=0;i<4;i++)put(raid,0,'MMM-2-064','energy',i,true);
 const raider=toHand(raid,0,'MMM-1-083');
 readyAp(raid,0,1);
 raid=raidOnto(raid,raider.uid,base.uid);
 assert.equal(raid.pending.step,'u067');
 raid=pick(raid,a=>a.uid===attacker.uid);
 assert.equal(field(raid,0,attacker.uid).mmm2UnblockedDraw.turn,raid.turn);
 setLife(raid,1,['MMM-2-054','MMM-2-054']);
 const deck=raid.players[0].deck.length;
 raid=toPhase(raid,'attack');
 raid=use(raid,{type:'attack',uid:attacker.uid});
 assert.equal(raid.pending.kind,'block');
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(raid.pending.step,'drawOpt');
 raid=pick(raid,a=>a.mode==='do');
 assert.equal(raid.players[0].deck.length,deck-1);
 assertUniversalMatch(packs,raid);

 let blocked=toPhase(fresh(counts,13105),'main');
 const host=put(blocked,0,'MMM-2-067','front',0,true);
 const fighter=put(blocked,0,'MMM-2-071','front',1,true);
 for(let i=0;i<4;i++)put(blocked,0,'MMM-2-064','energy',i,true);
 const top=toHand(blocked,0,'MMM-1-083');
 const wall=put(blocked,1,'MMM-2-042','front',0,true);
 readyAp(blocked,0,1);
 blocked=raidOnto(blocked,top.uid,host.uid);
 blocked=pick(blocked,a=>a.uid===fighter.uid);
 setLife(blocked,1,['MMM-2-054']);
 const stayed=blocked.players[0].deck.length;
 blocked=toPhase(blocked,'attack');
 blocked=use(blocked,{type:'attack',uid:fighter.uid});
 blocked=pick(blocked,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(blocked.pending,null);
 assert.equal(blocked.players[0].deck.length,stayed);
 assert.equal(field(blocked,1,wall.uid),null);
 assertUniversalMatch(packs,blocked);
});

test('MMM-2-068 discards after its play draw, not after the life draw',()=>{
 const counts=countsFor(['MMM-2-068','MMM-2-064','MMM-2-042','MMM-2-054']);
 let s=toPhase(fresh(counts,13106),'main');
 put(s,0,'MMM-2-064','energy',0,true);
 const mami=toHand(s,0,'MMM-2-068');
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,mami.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,13107),'attack');
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 setLife(life,1,['MMM-2-068','MMM-2-054']);
 const before=life.players[1].deck.length;
 const outside=life.players[1].outside.length;
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(life.pending,null);
 assert.equal(life.players[1].deck.length,before-1);
 assert.equal(life.players[1].outside.length,outside+1);
 assertUniversalMatch(packs,life);
});

test('MMM-2-069 searches only as a raid and may replay that search on leaving',()=>{
 const counts=countsFor(['MMM-2-069','MMM-2-068','MMM-2-064','MMM-2-070','MMM-2-065','MMM-2-071','MMM-2-052','MMM-2-058','MMM-2-057','MMM-2-062','MMM-2-059','MMM-2-027','MMM-2-066','MMM-2-072','MMM-2-042','MMM-2-054'],2,{'MMM-2-064':4,'MMM-2-052':4});
 let paid=toPhase(fresh(counts,13108),'main');
 for(let i=0;i<4;i++)put(paid,0,'MMM-2-064','energy',i,true);
 dumpHand(paid);
 const ordinary=toHand(paid,0,'MMM-2-069');
 const girl=crown(paid,0,['MMM-2-052']);
 readyAp(paid,0,1);
 paid=play(paid,ordinary.uid);
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck[0].uid,girl[0].uid);
 assertUniversalMatch(packs,paid);

 function retireWithIroha(state,targetUid){
  put(state,1,'MMM-2-027','front',0,true);
  for(let i=0;i<4;i++)put(state,1,'MMM-2-052','energy',i,true);
  state=passTurn(state);
  state=toPhase(state,'main');
  const spell=toHand(state,1,'MMM-2-059');
  readyAp(state,1,1);
  state=event(state,spell.uid);
  assert.equal(state.pending.kind,'effect-retire-bp');
  state=pick(state,a=>a.type==='chooseRetireBp'&&a.uid===targetUid);
  return state;
 }
 let plainLeave=toPhase(fresh(counts,13109),'main');
 const played=put(plainLeave,0,'MMM-2-069','front',0,true);
 put(plainLeave,0,'MMM-2-064','energy',0,true);
 put(plainLeave,0,'MMM-2-065','energy',1,true);
 put(plainLeave,0,'MMM-2-070','energy',2,true);
 put(plainLeave,0,'MMM-2-052','front',1,true);
 plainLeave=retireWithIroha(plainLeave,played.uid);
 assert.equal(plainLeave.pending,null);
 assert.ok(plainLeave.players[0].outside.some(c=>c.uid===played.uid));
 assertUniversalMatch(packs,plainLeave);

 let raid=toPhase(fresh(counts,13110),'main');
 const base=put(raid,0,'MMM-2-068','front',0,true);
 put(raid,0,'MMM-2-064','energy',0,true);
 put(raid,0,'MMM-2-070','energy',1,true);
 put(raid,0,'MMM-2-065','energy',2,true);
 put(raid,0,'MMM-2-071','energy',3,true);
 put(raid,0,'MMM-2-066','front',1,true);
 put(raid,0,'MMM-2-072','front',2,true);
 put(raid,0,'MMM-2-052','front',3,true);
 const mami=toHand(raid,0,'MMM-2-069');
 const window=crown(raid,0,['MMM-2-064','MMM-2-058','MMM-2-057','MMM-2-062']);
 readyAp(raid,0,1);
 raid=raidOnto(raid,mami.uid,base.uid);
 assert.equal(raid.pending.kind,'effect-top-filter-choice');
 const looked=universalPrivateChoices(packs,raid,0);
 assert.deepEqual(looked.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(looked.options.some(o=>o.action.uid===window[1].uid),false);
 assert.ok(looked.options.some(o=>o.action.uid===window[0].uid));
 raid=pick(raid,a=>a.type==='chooseTopFiltered'&&a.uid===window[0].uid);
 assert.equal(raid.publicReveals.some(r=>r.uid===window[0].uid&&r.kind==='searched-to-hand'),true);
 raid=orderShared(raid,[window[2].uid,window[3].uid,window[1].uid]);
 assert.equal(raid.pending,null);
 assert.equal(raid.players[0].hand.some(c=>c.uid===window[0].uid),true);
 const top=field(raid,0,mami.uid);
 raid=retireWithIroha(raid,top.uid);
 assert.equal(raid.pending.step,'u069');
 raid=pick(raid,a=>a.mode==='do');
 assert.equal(raid.pending.kind==='effect-top-filter-choice'||raid.pending.kind==='effect-top-order',true);
 assertUniversalMatch(packs,raid);

 let few=toPhase(fresh(counts,13111),'main');
 const host=put(few,0,'MMM-2-068','front',0,true);
 put(few,0,'MMM-2-064','energy',0,true);
 put(few,0,'MMM-2-065','energy',1,true);
 put(few,0,'MMM-2-070','energy',2,true);
 put(few,0,'MMM-2-071','energy',3,true);
 const lone=toHand(few,0,'MMM-2-069');
 readyAp(few,0,1);
 few=raidOnto(few,lone.uid,host.uid);
 if(few.pending?.kind==='effect-top-filter-choice')few=pick(few,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 while(few.pending?.kind==='effect-top-order')few=pick(few,a=>a.type==='chooseTopOrder');
 const visible=field(few,0,lone.uid);
 few=retireWithIroha(few,visible.uid);
 assert.equal(few.pending,null);
 assertUniversalMatch(packs,few);

 let life=toPhase(fresh(counts,13112),'attack');
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 for(let i=0;i<4;i++)put(life,1,'MMM-2-064','energy',i,true);
 const lifeBase=put(life,1,'MMM-2-068','front',0,true);
 setLife(life,1,['MMM-2-069','MMM-2-054']);
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'raid');
 assert.ok(acts(life).some(a=>a.type==='chooseTrigger'&&a.mode==='get'));
 const raidLife=acts(life).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===lifeBase.uid);
 assert.ok(raidLife);
 life=use(life,raidLife);
 assert.equal(life.pending.kind==='effect-top-filter-choice'||life.pending.kind==='effect-top-order',true);
 assertUniversalMatch(packs,life);
});

test('Q2364 Q2365 Q2366 MMM-2-070 puts one face-up life after a life card reached hand',()=>{
 const counts=countsFor(['MMM-2-070','MMM-2-071','MMM-2-064','MMM-2-054']);
 let denied=toPhase(fresh(counts,13113),'main');
 const quiet=put(denied,0,'MMM-2-070','front',0,true);
 assert.equal(acts(denied).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assertUniversalMatch(packs,denied);

 let s=toPhase(fresh(counts,13114),'main');
 const sayaka=put(s,0,'MMM-2-071','front',0,true);
 const first=put(s,0,'MMM-2-070','front',1,true);
 const second=put(s,0,'MMM-2-070','front',2,true);
 setLife(s,0,['MMM-2-054','MMM-2-054','MMM-2-054']);
 s=activate(s,sayaka.uid);
 s=pick(s,a=>a.type==='mmm2');
 const before=s.players[0].deck.length;
 s=activate(s,first.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.players[0].front[1],null);
 assert.equal(s.players[0].life[0].uid,first.uid);
 assert.equal(s.players[0].life[0].faceUp,true);
 const shown=universalPublicView(packs,s,1);
 assert.ok(shown.players[0].faceUpLife.some(c=>c.uid===first.uid&&c.cardId==='MMM-2-070'));
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 assertUniversalMatch(packs,s);

 s=passTurn(s);
 const attacker=put(s,1,'MMM-2-064','front',0,true);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:attacker.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'draw');
 assert.equal(s.pending.player,0);
 s=pick(s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Q2367 and Q2368 MMM-2-071 takes a hidden life card, then loses on the last one',()=>{
 const counts=countsFor(['MMM-2-071','MMM-2-054']);
 let s=toPhase(fresh(counts,13115),'main');
 const sayaka=put(s,0,'MMM-2-071','front',0,true);
 setLife(s,0,['MMM-2-054','MMM-2-054']);
 const hidden=s.players[0].life[0];
 s=activate(s,sayaka.uid);
 assert.equal(acts(s).some(a=>a.mode==='skip'),false);
 s=pick(s,a=>a.uid===hidden.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===hidden.uid));
 assert.equal(s.publicReveals.some(r=>r.uid===hidden.uid),false);
 assertHidden(s,[hidden.uid]);
 assert.equal(universalBp(packs,s,field(s,0,sayaka.uid)),4000);
 assert.equal(s.players[0].life.length,1);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===sayaka.uid),false);
 assertUniversalMatch(packs,s);

 let last=toPhase(fresh(counts,13116),'main');
 const finisher=put(last,0,'MMM-2-071','front',0,true);
 setLife(last,0,['MMM-2-054']);
 const only=last.players[0].life[0];
 last=activate(last,finisher.uid);
 last=pick(last,a=>a.uid===only.uid);
 assert.equal(universalBp(packs,last,field(last,0,finisher.uid)),4000);
 assert.equal(last.players[0].life.length,0);
 assert.equal(last.status,'finished');
 assert.equal(last.endReason,'life-zero');
 assert.equal(last.winner,1);
});

test('Q2369 and Q2370 MMM-2-072 resolves the upper option before the other character',()=>{
 const counts=countsFor(['MMM-2-072','MMM-2-064','MMM-2-071','MMM-2-054']);
 let solo=toPhase(fresh(counts,13117),'main');
 const alone=put(solo,0,'MMM-2-072','front',0,true);
 solo=activate(solo,alone.uid);
 assert.equal(acts(solo).some(a=>a.mode==='b'),false);
 solo=pick(solo,a=>a.mode==='done');
 assert.equal(solo.pending,null);
 assert.equal(universalBp(packs,solo,field(solo,0,alone.uid)),3000);
 assertUniversalMatch(packs,solo);

 let closed=toPhase(fresh(counts,13118),'main');
 const gated=put(closed,0,'MMM-2-072','front',0,true);
 put(closed,0,'MMM-2-064','front',1,true);
 closed=activate(closed,gated.uid);
 assert.equal(acts(closed).some(a=>a.mode==='b'),false);
 closed=pick(closed,a=>a.mode==='a');
 assert.equal(closed.pending,null);
 assert.equal(universalBp(packs,closed,field(closed,0,gated.uid)),4000);
 assertUniversalMatch(packs,closed);

 let s=toPhase(fresh(counts,13119),'main');
 const sayaka=put(s,0,'MMM-2-072','front',0,true);
 const madoka=put(s,0,'MMM-2-064','front',1,true);
 const taker=put(s,0,'MMM-2-071','energy',0,true);
 setLife(s,0,['MMM-2-054','MMM-2-054']);
 s=activate(s,taker.uid);
 s=pick(s,a=>a.type==='mmm2');
 s=activate(s,sayaka.uid);
 assert.ok(acts(s).some(a=>a.mode==='a')&&acts(s).some(a=>a.mode==='b'));
 s=pick(s,a=>a.mode==='b');
 assert.equal(acts(s).some(a=>a.mode==='b'),false);
 assert.ok(acts(s).some(a=>a.mode==='a'));
 s=pick(s,a=>a.mode==='a');
 assert.equal(s.pending.step,'buff');
 assert.equal(universalBp(packs,s,field(s,0,sayaka.uid)),4000);
 assert.equal(universalBp(packs,s,field(s,0,madoka.uid)),2000);
 assert.equal(acts(s).some(a=>a.uid===sayaka.uid),false);
 s=pick(s,a=>a.uid===madoka.uid);
 assert.equal(universalBp(packs,s,field(s,0,madoka.uid)),3000);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(counts,13125),'attack');
 const attacker=put(life,0,'MMM-2-064','front',0,true);
 setLife(life,1,['MMM-2-072','MMM-2-054']);
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(life.pending.trigger,'get');
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='get');
 assert.equal(life.pending,null);
 assert.ok(life.players[1].hand.some(c=>c.cardId==='MMM-2-072'));
 assertUniversalMatch(packs,life);
});

test('Q2371 MMM-2-073 buffs one girl, impacts Madoka, and readies AP at five names',()=>{
 const counts=countsFor(['MMM-2-073','MMM-2-064','MMM-2-065','MMM-2-068','MMM-2-070','MMM-2-052','MMM-2-054']);
 let madoka=toPhase(fresh(counts,13120),'main');
 put(madoka,0,'MMM-2-065','energy',0,true);
 put(madoka,0,'MMM-2-065','energy',1,true);
 put(madoka,0,'MMM-2-068','energy',2,true);
 put(madoka,0,'MMM-2-070','energy',3,true);
 const girl=put(madoka,0,'MMM-2-064','front',0,true);
 dumpHand(madoka);
 const spell=toHand(madoka,0,'MMM-2-073');
 const again=another(madoka,0,'MMM-2-073');
 readyAp(madoka,0,1);
 const deck=madoka.players[0].deck.length;
 madoka=event(madoka,spell.uid);
 assert.equal(madoka.players[0].deck.length,deck-1);
 assert.equal(madoka.pending.step,'u073');
 madoka=pick(madoka,a=>a.uid===girl.uid);
 assert.equal(universalBp(packs,madoka,field(madoka,0,girl.uid)),4000);
 assert.equal(universalImpact(packs,madoka,field(madoka,0,girl.uid)),1);
 assert.equal(apReady(madoka),0);
 assert.equal(acts(madoka).some(a=>a.type==='event'&&a.uid===again.uid),false);
 assertUniversalMatch(packs,madoka);

 let other=toPhase(fresh(counts,13121),'main');
 for(let i=0;i<4;i++)put(other,0,'MMM-2-065','energy',i,true);
 const mami=put(other,0,'MMM-2-068','front',0,true);
 dumpHand(other);
 const plain=toHand(other,0,'MMM-2-073');
 readyAp(other,0,1);
 other=event(other,plain.uid);
 other=pick(other,a=>a.uid===mami.uid);
 assert.equal(universalBp(packs,other,field(other,0,mami.uid)),4000);
 assert.equal(universalImpact(packs,other,field(other,0,mami.uid)),0);
 assert.equal(apReady(other),0);
 assertUniversalMatch(packs,other);

 let many=toPhase(fresh(counts,13122),'main');
 put(many,0,'MMM-2-064','energy',0,true);
 put(many,0,'MMM-2-065','energy',1,true);
 put(many,0,'MMM-2-068','energy',2,true);
 put(many,0,'MMM-2-070','energy',3,true);
 const tsukasa=put(many,0,'MMM-2-052','front',0,true);
 dumpHand(many);
 const wide=toHand(many,0,'MMM-2-073');
 readyAp(many,0,1);
 many.players[0].apCards[0].ready=false;
 many.players[0].apCards[1].inPlay=true;
 many.players[0].apCards[1].ready=true;
 many=event(many,wide.uid);
 many=pick(many,a=>a.uid===tsukasa.uid);
 assert.equal(universalBp(packs,many,field(many,0,tsukasa.uid)),4000);
 assert.equal(universalImpact(packs,many,field(many,0,tsukasa.uid)),0);
 assert.equal(apReady(many),1);
 assertUniversalMatch(packs,many);

 let skipped=toPhase(fresh(counts,13123),'main');
 put(skipped,0,'MMM-2-064','energy',0,true);
 put(skipped,0,'MMM-2-065','energy',1,true);
 put(skipped,0,'MMM-2-068','energy',2,true);
 put(skipped,0,'MMM-2-070','energy',3,true);
 put(skipped,0,'MMM-2-052','front',0,true);
 dumpHand(skipped);
 const decline=toHand(skipped,0,'MMM-2-073');
 readyAp(skipped,0,1);
 skipped.players[0].apCards[0].ready=false;
 skipped.players[0].apCards[1].inPlay=true;
 skipped.players[0].apCards[1].ready=true;
 skipped=event(skipped,decline.uid);
 skipped=pick(skipped,a=>a.mode==='skip');
 assert.equal(apReady(skipped),1);
 assertUniversalMatch(packs,skipped);

 let life=toPhase(fresh(counts,13124),'attack');
 const attacker=put(life,0,'MMM-2-064','front',0,true);
 const bystander=put(life,1,'MMM-2-064','front',0,true);
 setLife(life,1,['MMM-2-073','MMM-2-054']);
 life=use(life,{type:'attack',uid:attacker.uid});
 life=pick(life,a=>a.type==='chooseBlock'&&a.uid===null);
 life=pick(life,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(life.pending,null);
 assert.equal(universalBp(packs,life,field(life,1,bystander.uid)),2000);
 assertUniversalMatch(packs,life);
});
