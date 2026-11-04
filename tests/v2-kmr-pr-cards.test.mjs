import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_PR_CARDS} from '../dist/kmr-pr-cards.mjs';
import {kmr2EngineKind} from '../dist/universal-v2/kmr2-kinds.mjs';
import {kmr2HandApCut} from '../dist/universal-v2/kmr2-continuous.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {controllerChoiceArt,fieldEffectCopy,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const pack=createKmrBattlePack();
const packs=[pack,pack];

function fill(required,extra={}){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={...extra};
 for(const id of [...new Set(required)]){
  if(counts[id])continue;
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(Object.prototype.hasOwnProperty.call(caps,trigger)){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(pack.cards[id].maxCopies||4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:4,first:0});
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
function ready(s){
 s.pending=null;s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
function click(state,pred){
 const action=state.pending?.actions?.find(pred);
 assert.ok(action,state.pending?.step||'no pending');
 return dispatchUniversalAction(packs,state,action);
}
function orderRest(state){
 let guard=0;
 while(state.pending?.step==='lookOrder'){
  state=click(state,a=>a.mode==='next');
  if(++guard>8)throw Error('order did not finish');
 }
 return state;
}
function labelsOk(state){
 for(const action of state.pending.actions){
  const label=uiActionLabel(action,{pack,state});
  assert.equal(label.includes('執行'),false,label);
  assert.equal(/kmr/i.test(label),false,label);
  assert.equal(/[A-Za-z]/.test(label),false,label);
 }
}
function readyAp(state){
 return state.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
}

test('the three point-exchange promos are deck characters',()=>{
 assert.deepEqual(KMR_PR_CARDS.map(c=>c.id),['KMR-P-003','KMR-P-004','KMR-P-005']);
 assert.equal(Object.keys(createKmrV2Pack().cards).length,113);
 assert.equal(Object.keys(pack.cards).length,216);
 for(const card of KMR_PR_CARDS){
  assert.equal(kmr2EngineKind(card.effectJa),card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa);
  assert.equal(pack.cards[card.id].type,'character');
  assert.match(card.image,/rugiacreation\.com\/ua\/cardlist\/small\/UAPR_KMR-P-00[345]\.jpg/);
  assert.match(card.effect,/登場時/);
  assert.equal(/\b(DRAW|GET|ACTIVE|RAID|SPECIAL|FINAL|COLOR)\b/.test(card.triggerText),false);
  const shown=fieldEffectCopy(card);
  assert.match(shown,/登場時/);
  assert.equal(shown.includes('沒有可顯示的效果'),false);
 }
 assert.equal(pack.cards['KMR-P-003'].color,'yellow');
 assert.equal(pack.cards['KMR-P-003'].energy,0);
 assert.equal(pack.cards['KMR-P-003'].bp,1000);
 assert.equal(pack.cards['KMR-P-004'].color,'green');
 assert.equal(pack.cards['KMR-P-004'].energy,3);
 assert.equal(pack.cards['KMR-P-004'].gen,2);
 assert.equal(pack.cards['KMR-P-005'].ap,2);
 assert.equal(pack.cards['KMR-P-005'].energy,4);
 assert.equal(pack.pointCards.some(c=>c.id.startsWith('KMR-P-')),false);
});

test('Poppingummy can take a Gochizo, or retire one and take a yellow character instead',()=>{
 const s=fresh(fill(['KMR-P-003','KMR-2-013','KMR-2-010','KMR-2-090','KMR-2-091','KMR-2-088','KMR-2-002','KMR-2-001'],
  {'KMR-2-013':2}));
 const fieldFood=put(s,0,'KMR-2-013','energy',0,true);
 const deckFood=take(s,0,'KMR-2-013');
 const yellow=take(s,0,'KMR-2-010');
 const red=take(s,0,'KMR-2-090');
 const red2=take(s,0,'KMR-2-091');
 const red3=take(s,0,'KMR-2-088');
 const marker=take(s,0,'KMR-2-002');
 const rider=take(s,0,'KMR-P-003');
 const spare=take(s,0,'KMR-2-001');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].deck.unshift(marker);
 s.players[0].deck.unshift(red,deckFood,yellow,red2,red3);
 s.players[0].hand.push(rider,spare);
 ready(s);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front'));
 assert.equal(state.pending?.id,'KMR-P-003');
 assert.equal(state.pending.step,'pr003Pick');
 const looked=universalPrivateChoices(packs,state,0);
 assert.deepEqual(looked.inspected.map(c=>c.cardId),[red.cardId,deckFood.cardId,yellow.cardId,red2.cardId,red3.cardId]);
 assert.equal(state.pending.actions.some(a=>a.mode==='take'&&a.uid===deckFood.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===yellow.uid),false);
 assert.equal(state.pending.actions.some(a=>a.uid===red.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='switch'),true);
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 labelsOk(state);
 assert.equal(controllerChoiceArt(packs,state,state.pending.actions.find(a=>a.uid===deckFood.uid))[0]?.cardId,'KMR-2-013');
 state=click(state,a=>a.mode==='take'&&a.uid===deckFood.uid);
 state=orderRest(state);
 assert.equal(state.pending?.step,'discard');
 labelsOk(state);
 state=click(state,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===deckFood.uid),true);
 assert.equal(state.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(state.players[0].energy.some(c=>c?.uid===fieldFood.uid),true);
 assert.equal(state.players[0].deck[0]?.uid,marker.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===yellow.uid),false);
});

test('retiring a field Gochizo switches the five-card take to a yellow character and delays its draw',()=>{
 const s=fresh(fill(['KMR-P-003','KMR-2-013','KMR-2-010','KMR-2-090','KMR-2-091','KMR-2-088','KMR-2-002'],
  {'KMR-2-013':2}));
 const fieldFood=put(s,0,'KMR-2-013','energy',0,true);
 const deckFood=take(s,0,'KMR-2-013');
 const yellow=take(s,0,'KMR-2-010');
 const reds=[take(s,0,'KMR-2-090'),take(s,0,'KMR-2-091'),take(s,0,'KMR-2-088')];
 const marker=take(s,0,'KMR-2-002');
 const rider=take(s,0,'KMR-P-003');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].deck.unshift(marker);
 s.players[0].deck.unshift(reds[0],deckFood,yellow,reds[1],reds[2]);
 s.players[0].hand.push(rider);
 ready(s);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front'));
 const before=state.players[0].hand.length;
 state=click(state,a=>a.mode==='switch');
 assert.equal(state.pending.step,'pr003Retire');
 labelsOk(state);
 state=click(state,a=>a.mode==='retireFood'&&a.uid===fieldFood.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===fieldFood.uid),true);
 assert.equal(state.players[0].hand.length,before);
 assert.equal(state.players[0].hand.some(c=>c.uid===marker.uid),false);
 assert.equal(state.pending.step,'pr003Pick');
 assert.equal(state.pending.actions.some(a=>a.mode==='take'&&a.uid===yellow.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===deckFood.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='switch'),false);
 const looked=universalPrivateChoices(packs,state,0);
 assert.equal(looked.inspected.some(c=>c.uid===reds[0].uid),true);
 state=click(state,a=>a.mode==='take'&&a.uid===yellow.uid);
 state=orderRest(state);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===yellow.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===deckFood.uid),false);
 assert.equal(state.players[0].hand.some(c=>c.uid===marker.uid),true);
});

test('Decade returns one Reimagine card and the next matching hand play costs 1 less AP',()=>{
 const s=fresh(fill(['KMR-P-004','KMR-2-064','KMR-2-070','KMR-2-090'],{'KMR-2-064':4}));
 for(let slot=0;slot<3;slot++)put(s,0,'KMR-2-064','energy',slot,true);
 const trait=put(s,0,'KMR-2-070','front',0,true);
 const promo=take(s,0,'KMR-P-004');
 const other=take(s,0,'KMR-2-090');
 const decade=take(s,0,'KMR-2-064');
 s.players[0].hand.push(promo,other,decade);
 ready(s);
 assert.equal(readyAp(s),3);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===promo.uid&&a.line==='front'));
 assert.equal(readyAp(state),2);
 assert.equal(state.pending?.step,'pr004Bounce');
 assert.equal(uiActionLabel(state.pending.actions.find(a=>a.mode==='skip'),{pack,state}),'不發動');
 const bounce=state.pending.actions.find(a=>a.mode==='bounce'&&a.uid===trait.uid);
 assert.match(uiActionLabel(bounce,{pack,state}),/返回手牌/);
 assert.equal(controllerChoiceArt(packs,state,bounce)[0]?.cardId,'KMR-2-070');
 state=dispatchUniversalAction(packs,state,bounce);
 assert.equal(state.players[0].hand.some(c=>c.uid===trait.uid),true);
 assert.equal(state.kmrPrNextDecadeAp?.[0],state.turn);
 const afterOther=readyAp(state);
 state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state)
  .find(a=>a.type==='play'&&a.uid===other.uid&&a.line==='front'));
 assert.equal(readyAp(state),afterOther-1);
 assert.equal(state.kmrPrNextDecadeAp?.[0],state.turn);
 const kept=readyAp(state);
 state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state)
  .find(a=>a.type==='play'&&a.uid===decade.uid&&a.line==='front'));
 assert.equal(readyAp(state),kept);
 assert.equal(state.kmrPrNextDecadeAp?.[0]??null,null);
 s.kmrPrNextDecadeAp={[0]:s.turn};
 assert.equal(kmr2HandApCut(pack,s,0,pack.cards['KMR-2-064'],()=>null),1);
 assert.equal(kmr2HandApCut(pack,s,0,pack.cards['KMR-2-068'],()=>null),0);
 assert.equal(kmr2HandApCut(pack,s,0,pack.cards['KMR-2-090'],()=>null),0);
 assert.equal(kmr2HandApCut(pack,s,0,pack.cards['KMR-2-064'],()=>null,'removed'),0);
});

test('skipping the Reimagine return does not grant the Decade discount',()=>{
 const s=fresh(fill(['KMR-P-004','KMR-2-064','KMR-2-070'],{'KMR-2-064':4}));
 for(let slot=0;slot<3;slot++)put(s,0,'KMR-2-064','energy',slot,true);
 put(s,0,'KMR-2-070','front',0,true);
 const promo=take(s,0,'KMR-P-004');
 const decade=take(s,0,'KMR-2-064');
 s.players[0].hand.push(promo,decade);
 ready(s);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===promo.uid&&a.line==='front'));
 state=click(state,a=>a.mode==='skip');
 assert.equal(state.kmrPrNextDecadeAp,undefined);
 const before=readyAp(state);
 state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state)
  .find(a=>a.type==='play'&&a.uid===decade.uid&&a.line==='front'));
 assert.equal(readyAp(state),before-1);
});

test('Ryuki shows every outside card and puts at most one Survive card on top',()=>{
 const s=fresh(fill(['KMR-P-005','KMR-2-089','KMR-2-001','KMR-2-090'],{'KMR-2-090':4}));
 const promo=take(s,0,'KMR-P-005');
 const survive=take(s,0,'KMR-2-089');
 const plain=take(s,0,'KMR-2-001');
 s.players[0].outside.push(survive,plain);
 for(let slot=0;slot<4;slot++)put(s,0,'KMR-2-090','energy',slot,true);
 s.players[0].hand.push(promo);
 ready(s);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===promo.uid&&a.line==='front'));
 assert.equal(state.pending?.step,'outsideTop');
 const looked=universalPrivateChoices(packs,state,0);
 assert.deepEqual(looked.inspected.map(c=>c.cardId).sort(),['KMR-2-001','KMR-2-089']);
 assert.equal(state.pending.actions.some(a=>a.mode==='deckTop'&&a.uid===survive.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===plain.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 labelsOk(state);
 assert.equal(controllerChoiceArt(packs,state,state.pending.actions.find(a=>a.uid===survive.uid))[0]?.cardId,'KMR-2-089');
 state=click(state,a=>a.mode==='deckTop'&&a.uid===survive.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck[0]?.uid,survive.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===plain.uid),true);
 assert.equal(state.players[0].outside.some(c=>c.uid===survive.uid),false);
});

test('Ryuki may place no outside card',()=>{
 const s=fresh(fill(['KMR-P-005','KMR-2-089','KMR-2-090'],{'KMR-2-090':4}));
 const promo=take(s,0,'KMR-P-005');
 const survive=take(s,0,'KMR-2-089');
 s.players[0].outside.push(survive);
 for(let slot=0;slot<4;slot++)put(s,0,'KMR-2-090','energy',slot,true);
 s.players[0].hand.push(promo);
 ready(s);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='play'&&a.uid===promo.uid&&a.line==='front'));
 state=click(state,a=>a.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(c=>c.uid===survive.uid),true);
 assert.notEqual(state.players[0].deck[0]?.uid,survive.uid);
});

test('Ryuki main draws for a Knight name and can raid Ryuki Survive onto itself',()=>{
 const s=fresh(fill(['KMR-P-005','KMR-2-089','KMR-2-094','KMR-2-090','KMR-2-001']));
 const rider=put(s,0,'KMR-P-005','front',0,true);
 const knight=put(s,0,'KMR-2-089','front',1,true);
 const under=take(s,0,'KMR-2-090');
 under.faceDown=false;
 knight.stack=[under];
 const dragon=take(s,0,'KMR-2-094');
 const marker=take(s,0,'KMR-2-001');
 s.players[0].deck.unshift(marker);
 s.players[0].hand.push(dragon);
 ready(s);
 const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(activate?.mode,'kmr2:KMR-P-005');
 assert.match(uiActionLabel(activate,{pack,state:s}),/起動主要/);
 assert.equal(/kmr/i.test(uiActionLabel(activate,{pack,state:s})),false);
 let state=dispatchUniversalAction(packs,s,activate);
 assert.equal(state.players[0].hand.some(c=>c.uid===marker.uid),true);
 assert.equal(state.pending?.step,'raidSelf');
 labelsOk(state);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='activate'&&a.uid===rider.uid),false);
 state=click(state,a=>a.mode==='skip');
 assert.equal(state.players[0].hand.some(c=>c.uid===dragon.uid),true);
 assert.equal(state.players[0].front[0]?.cardId,'KMR-P-005');
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='activate'&&a.mode==='kmr2:KMR-P-005'),false);
});

test('accepting the raid puts Ryuki Survive on this Ryuki',()=>{
 const s=fresh(fill(['KMR-P-005','KMR-2-089','KMR-2-094','KMR-2-090','KMR-2-001']));
 const rider=put(s,0,'KMR-P-005','front',0,true);
 const knight=put(s,0,'KMR-2-089','front',1,true);
 const under=take(s,0,'KMR-2-090');
 under.faceDown=false;
 knight.stack=[under];
 const dragon=take(s,0,'KMR-2-094');
 s.players[0].deck.unshift(take(s,0,'KMR-2-001'));
 s.players[0].hand.push(dragon);
 ready(s);
 let state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='activate'&&a.uid===rider.uid));
 state=click(state,a=>a.mode==='raid'&&a.uid===dragon.uid);
 const top=state.players[0].front[0];
 assert.equal(top?.cardId,'KMR-2-094');
 assert.equal(top.stack.some(c=>c.uid===rider.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===dragon.uid),false);
});

test('Ryuki main does not draw or raid without a Knight, and does not activate off the front',()=>{
 const s=fresh(fill(['KMR-P-005','KMR-2-094','KMR-2-001']));
 const rider=put(s,0,'KMR-P-005','energy',0,true);
 const dragon=take(s,0,'KMR-2-094');
 const marker=take(s,0,'KMR-2-001');
 s.players[0].deck.unshift(marker);
 s.players[0].hand.push(dragon);
 ready(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===rider.uid),false);
 s.players[0].energy[0]=null;
 s.players[0].front[0]=rider;
 const state=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)
  .find(a=>a.type==='activate'&&a.uid===rider.uid));
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck[0]?.uid,marker.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===dragon.uid),true);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='activate'&&a.uid===rider.uid),false);
});
