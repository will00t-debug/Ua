import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {fresh,readyAp,stg,stgDeck,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const FAQ={
 Q2428:'STG-1-004',Q2429:'STG-1-004',
 Q2378:'STG-1-011',Q2379:'STG-1-011',
 Q2380:'STG-1-018',
 Q2381:'STG-1-028',Q2382:'STG-1-028',
 Q2383:'STG-1-039',Q2384:'STG-1-039',Q2385:'STG-1-039',
 Q2386:'STG-1-046',
 Q2387:'STG-1-056',Q2388:'STG-1-056',
 Q2389:'STG-1-070',
 Q2390:'STG-1-077',Q2391:'STG-1-077'
};

function who(s){return s.pending?.player??s.active;}
function go(s,action){return dispatchUniversalAction(stgPacks,s,action,{actor:who(s)});}
function act(s,pred){
 const action=legalUniversalActions(stgPacks,s).find(pred);
 if(!action)throw Error('Missing action '+(s.pending?.kind||s.phase));
 return go(s,action);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function outside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function lifeTop(s,p,id){
 const card=take(s,p,id);
 const life=s.players[p].life,displaced=life[0];
 life[0]=card;
 if(displaced&&displaced.uid!==card.uid)s.players[p].deck.push(displaced);
 return card;
}
function board(ids,seed){
 const s=toPhase(stgPacks,fresh(stgDeck(ids),seed),'main');
 readyAp(s);
 return s;
}
function passUntil(s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=go(s,{type:'next'});
  if(++guard>16)throw Error('stuck '+s.phase+' '+s.active);
 }
 return s;
}
function on(s,uid){
 for(const p of s.players)for(const zone of ['front','energy','hand','outside','removed']){
  const card=(p[zone]||[]).find(c=>c?.uid===uid);
  if(card)return card;
 }
 return null;
}

const DRAW=['STG-1-004','STG-1-032','STG-1-034','STG-1-035','STG-1-040','STG-1-012',
 'STG-1-007','STG-1-001','STG-1-014','STG-1-020','STG-1-024','STG-1-042','STG-1-064'];
const SLAP=['STG-1-039','STG-1-001','STG-1-007','STG-1-014','STG-1-012','STG-1-032',
 'STG-1-034','STG-1-035','STG-1-020','STG-1-024','STG-1-042','STG-1-047','STG-1-064'];
const KURISU=['STG-1-028','STG-1-001','STG-1-007','STG-1-035','STG-1-034','STG-1-014',
 'STG-1-012','STG-1-020','STG-1-024','STG-1-032','STG-1-042','STG-1-047','STG-1-064'];
const MAYURI=['STG-1-018','STG-1-001','STG-1-007','STG-1-014','STG-1-012','STG-1-020',
 'STG-1-024','STG-1-032','STG-1-042','STG-1-047','STG-1-053','STG-1-015','STG-1-064'];
const MOVE=['STG-1-056','STG-1-032','STG-1-042','STG-1-047','STG-1-053','STG-1-007',
 'STG-1-011','STG-1-001','STG-1-014','STG-1-012','STG-1-020','STG-1-024','STG-1-064'];
const PROTECT=['STG-1-070','STG-1-042','STG-1-047','STG-1-053','STG-1-001','STG-1-033',
 'STG-1-014','STG-1-007','STG-1-012','STG-1-020','STG-1-024','STG-1-015','STG-1-064'];
const LETTER=['STG-1-077','STG-1-057','STG-1-073','STG-1-072','STG-1-001','STG-1-066',
 'STG-1-031','STG-1-014','STG-1-012','STG-1-020','STG-1-024','STG-1-042','STG-1-064'];

test('Steins;Gate catalogue lists the sixteen official FAQ rulings',()=>{
 const found=[];
 for(const card of STEINS_GATE_CARDS)for(const entry of card.faq){
  assert.equal(FAQ[entry.no],card.id);
  assert.match(entry.updated,/^2026\.10\.(09|23)$/);
  assert.ok(entry.q.length>20);
  assert.ok(entry.a.length>0);
  found.push(entry.no);
 }
 assert.deepEqual(found.sort(),Object.keys(FAQ).sort());
 assert.equal(STEINS_GATE_CARDS.filter(c=>c.engineKind).length,80);
});

test('Q2428 and Q2429 redraw from the trigger count after STG-1-004 enters',()=>{
 function enter(seed,outsideIds,discardId){
  let s=board(DRAW,seed);
  place(s,0,'STG-1-007','energy',0);
  place(s,0,'STG-1-001','energy',1);
  for(const id of outsideIds)outside(s,0,id);
  const actor=take(s,0,'STG-1-004');
  const extra=discardId?take(s,0,discardId):null;
  hold(s,0,extra?[actor,extra]:[actor]);
  const deck=s.players[0].deck.length;
  s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
  return {s,extra,deck};
 }
 const growing=enter(24280,['STG-1-032','STG-1-034','STG-1-035'],'STG-1-040');
 assert.equal(growing.s.pending.kind,'effect-discard');
 assert.equal(growing.s.players[0].deck.length,growing.deck-1);
 let after=go(growing.s,{type:'chooseDiscard',uid:growing.extra.uid});
 assert.equal(after.players[0].deck.length,growing.deck-2);
 assert.ok(after.players[0].outside.some(c=>c.uid===growing.extra.uid));
 assert.equal(after.pending,null);

 const already=enter(24290,['STG-1-032','STG-1-034','STG-1-035','STG-1-040'],null);
 assert.equal(already.s.pending,null);
 assert.equal(already.s.players[0].deck.length,already.deck-1);
 assert.equal(assertUniversalMatch(stgPacks,already.s),true);
});

test('Q2380 two STG-1-018 copies share one activation',()=>{
 let s=board(MAYURI,23800);
 const first=place(s,0,'STG-1-018','front',0);
 const second=place(s,0,'STG-1-018','front',1);
 assert.equal(legalUniversalActions(stgPacks,s).filter(a=>a.mode==='nameActive').length,2);
 s=act(s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='nameActive');
 assert.equal(on(s,first.uid).ready,true);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.mode==='nameActive'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('Q2381 and Q2382 the Kurisu discount is once per turn and survives a mismatch',()=>{
 let s=board(KURISU,23810);
 const first=place(s,0,'STG-1-028','front',0);
 const second=place(s,0,'STG-1-028','front',1);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 assert.equal(legalUniversalActions(stgPacks,s).filter(a=>a.mode==='discount').length,2);
 s=act(s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='discount');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.mode==='discount'),false);
 const character=take(s,0,'STG-1-001');
 const finalEvent=take(s,0,'STG-1-034');
 const matching=take(s,0,'STG-1-035');
 hold(s,0,[character,finalEvent,matching]);
 const discount=()=>s.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount'&&!e.consumed);
 s=act(s,a=>a.type==='play'&&a.uid===character.uid);
 assert.ok(discount());
 s=act(s,a=>a.type==='event'&&a.uid===finalEvent.uid);
 if(s.pending)s=go(s,legalUniversalActions(stgPacks,s).find(a=>a.uid===null)||legalUniversalActions(stgPacks,s)[0]);
 assert.ok(discount());
 s=act(s,a=>a.type==='event'&&a.uid===matching.uid);
 assert.equal(discount(),undefined);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===second.uid&&a.mode==='discount'),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('Q2383 Q2384 and Q2385 the slap chooses distinct effects in printed order once',()=>{
 let s=board(SLAP,23830);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 const ally=place(s,0,'STG-1-001','front',0,false);
 const foe=place(s,1,'STG-1-001','front',0);
 const first=take(s,0,'STG-1-039');
 const second=take(s,0,'STG-1-039');
 hold(s,0,[first,second]);
 s=act(s,a=>a.type==='event'&&a.uid===first.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.order,['active','buff','rest']);
 s=go(s,{type:'chooseOrderedSubset',mode:'pick',id:'active'});
 s=go(s,{type:'chooseOrderedSubset',mode:'pick',id:'active'});
 assert.deepEqual(s.pending.selected,[]);
 s=go(s,{type:'chooseOrderedSubset',mode:'pick',id:'rest'});
 s=go(s,{type:'chooseOrderedSubset',mode:'pick',id:'active'});
 assert.equal(on(s,foe.uid).ready,true);
 s=go(s,{type:'chooseOrderedSubset',mode:'confirm'});
 assert.equal(s.pending.kind,'effect-active-character');
 assert.equal(on(s,foe.uid).ready,true);
 s=act(s,a=>a.type==='chooseActiveCharacter'&&a.uid===ally.uid);
 assert.equal(on(s,ally.uid).ready,true);
 assert.equal(s.pending.kind,'effect-rest-bp');
 assert.equal(on(s,foe.uid).ready,true);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='event'&&a.uid===second.uid),false);
 s=act(s,a=>a.uid===foe.uid);
 assert.equal(on(s,foe.uid).ready,false);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='event'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('Q2387 and Q2388 a full energy line removes one card and a locked character can still raid',()=>{
 let s=board(MOVE,23870);
 place(s,0,'STG-1-042','energy',0);
 place(s,0,'STG-1-042','energy',1);
 place(s,0,'STG-1-047','energy',2);
 place(s,0,'STG-1-053','energy',3);
 const ally=place(s,0,'STG-1-001','front',0);
 for(let slot=0;slot<4;slot++)place(s,1,'STG-1-007','energy',slot);
 const victim=place(s,1,'STG-1-014','front',0);
 const event=take(s,0,'STG-1-032');
 const actor=take(s,0,'STG-1-056');
 hold(s,0,[event,actor]);
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 s=go(s,{type:'chooseRetireOwnOther',uid:ally.uid});
 const replacement=legalUniversalActions(stgPacks,s).find(a=>a.type==='chooseMoveOppFront'&&
  a.uid===victim.uid&&a.replaceUid);
 s=go(s,replacement);
 assert.equal(on(s,victim.uid).line===undefined&&s.players[1].energy.some(c=>c?.uid===victim.uid),true);
 assert.ok(s.players[1].removed.some(c=>c.uid===replacement.replaceUid));
 assert.ok(s.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===victim.uid));
 assert.equal(legalUniversalActions(stgPacks,passUntil(s,x=>x.active===1&&x.phase==='move'))
  .some(a=>a.type==='move'&&a.uid===victim.uid),false);

 s=board(MOVE,23880);
 place(s,0,'STG-1-042','energy',0);
 place(s,0,'STG-1-042','energy',1);
 place(s,0,'STG-1-047','energy',2);
 place(s,0,'STG-1-053','energy',3);
 const retired=place(s,0,'STG-1-001','front',0);
 place(s,1,'STG-1-007','energy',0);
 place(s,1,'STG-1-007','energy',1);
 place(s,1,'STG-1-007','energy',2);
 const base=place(s,1,'STG-1-007','front',0);
 const raider=take(s,1,'STG-1-011');
 s.players[1].hand.push(raider);
 const pay=take(s,0,'STG-1-032');
 const source=take(s,0,'STG-1-056');
 hold(s,0,[pay,source]);
 s=act(s,a=>a.type==='event'&&a.uid===pay.uid);
 s=act(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 s=go(s,{type:'chooseRetireOwnOther',uid:retired.uid});
 s=act(s,a=>a.type==='chooseMoveOppFront'&&a.uid===base.uid&&a.replaceUid===undefined);
 assert.ok(s.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===base.uid));
 s=passUntil(s,x=>x.active===1&&x.phase==='main');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.type==='raid'&&a.uid===raider.uid&&
  a.baseUid===base.uid));
 s=act(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===raider.uid&&c.ready===true)||
  s.players[1].energy.some(c=>c?.uid===raider.uid&&c.ready===true),true);
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===raider.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('Q2389 a character granted untargetable is not a special-trigger choice',()=>{
 let s=board(PROTECT,23890);
 place(s,0,'STG-1-042','energy',0);
 place(s,0,'STG-1-047','energy',1);
 place(s,0,'STG-1-053','energy',2);
 place(s,0,'STG-1-064','energy',3);
 const ally=place(s,0,'STG-1-001','front',0);
 const open=place(s,0,'STG-1-014','front',1);
 const actor=take(s,0,'STG-1-070');
 hold(s,0,[actor]);
 lifeTop(s,1,'STG-1-033');
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-entry-protect');
 s=go(s,{type:'chooseEntryProtect',uid:ally.uid});
 s=passUntil(s,x=>x.phase==='attack'&&x.active===0);
 s=act(s,a=>a.type==='attack'&&a.uid===open.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 const choices=legalUniversalActions(stgPacks,s);
 assert.equal(choices.some(a=>a.mode==='special'&&a.uid===ally.uid),false);
 assert.ok(choices.some(a=>a.mode==='special'&&a.uid===open.uid));
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('Q2390 and Q2391 the D-Mail color trigger may play a green field only to energy',()=>{
 let s=board(LETTER,23900);
 const attacker=place(s,0,'STG-1-001','front',0);
 lifeTop(s,1,'STG-1-077');
 const character=take(s,1,'STG-1-057');
 const field=take(s,1,'STG-1-073');
 const wide=take(s,1,'STG-1-072');
 s.players[1].hand.push(character,field,wide);
 s=passUntil(s,x=>x.phase==='attack');
 s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'color');
 const color=legalUniversalActions(stgPacks,s);
 assert.ok(color.some(a=>a.mode==='color'&&a.uid===character.uid&&a.line==='front'));
 assert.ok(color.some(a=>a.mode==='colorMayField'&&a.uid===field.uid&&a.line==='energy'));
 assert.ok(color.some(a=>a.mode==='colorMayField'&&a.uid===wide.uid&&a.line==='energy'));
 assert.equal(color.some(a=>a.mode==='colorMayField'&&a.line==='front'),false);
 s=act(s,a=>a.mode==='colorMayField'&&a.uid===field.uid&&a.line==='energy');
 assert.equal(s.players[1].energy.some(c=>c?.uid===field.uid&&c.ready),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===field.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
