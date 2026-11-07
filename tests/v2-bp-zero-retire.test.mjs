import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const iys=createIysV2Pack();
const kmr=createKmrV2Pack();

function countsFor(pack,required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
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
function fresh(packs,counts,seed){
 return newUniversalMatch(packs,{decks:counts,seed,first:0});
}
function toPhase(packs,s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+'/'+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' (now '+s.phase+')');
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(packs,s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action){
  const types=[...new Set(legalUniversalActions(packs,s).map(a=>a.type))].join(',');
  throw Error('No '+type+' for '+uid+' ('+types+')');
 }
 return dispatchUniversalAction(packs,s,action);
}
function choose(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||''));
 return dispatchUniversalAction(packs,s,action);
}
function zero(card,s,amount){
 card.buffs=[{bp:-amount,untilTurn:s.turn}];
}
function iysMain(seed){
 const packs=[iys,iys];
 const counts=countsFor(iys,['IYS-1-035','IYS-1-001','IYS-1-010','IYS-1-014','IYS-1-011','IYS-1-025','IYS-1-028','IYS-1-032','IYS-1-029','IYS-1-034']);
 return {packs,s:toPhase(packs,fresh(packs,[counts,counts],seed),'main')};
}

test('IYS-1-035 retires a front character whose BP falls to 0',()=>{
 const {packs,s}=iysMain(35001);
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-010','energy',1);
 put(s,0,'IYS-1-014','front',0);
 const victim=put(s,1,'IYS-1-011','front',0);
 const event=take(s,0,'IYS-1-035');
 s.players[0].hand.push(event);
 let state=play(packs,s,event.uid,'event');
 assert.equal(state.pending?.kind,'iys');
 assert.equal(state.pending?.step,'debuff');
 state=choose(packs,state,a=>a.mode==='pick'&&a.uid===victim.uid);
 assert.equal(state.players[1].front.some(c=>c?.uid===victim.uid),false);
 assert.equal(state.players[1].outside.filter(c=>c.uid===victim.uid).length,1);
 assert.equal(state.pending?.step==='leave',false);
 assertUniversalMatch(packs,state);
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.some(a=>JSON.stringify(a).includes(victim.uid)),false);
 const ai=chooseUniversalAiAction(packs,state,{difficulty:'normal'});
 if(ai)assert.equal(JSON.stringify(ai).includes(victim.uid),false);
});

test('IYS-1-035 with no 奈落一派 does not retire, and -1000 keeps a higher BP character',()=>{
 const {packs,s}=iysMain(35000);
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-010','energy',1);
 const victim=put(s,1,'IYS-1-011','front',0);
 const event=take(s,0,'IYS-1-035');
 s.players[0].hand.push(event);
 let state=play(packs,s,event.uid,'event');
 state=choose(packs,state,a=>a.mode==='pick'&&a.uid===victim.uid);
 const stayed=state.players[1].front.find(c=>c?.uid===victim.uid);
 assert.ok(stayed);
 assert.equal(universalBp(packs,state,stayed),1000);

 const again=iysMain(35002);
 readyAp(again.s);
 put(again.s,0,'IYS-1-001','energy',0);
 put(again.s,0,'IYS-1-010','energy',1);
 put(again.s,0,'IYS-1-014','front',0);
 const tall=put(again.s,1,'IYS-1-001','front',0);
 const second=take(again.s,0,'IYS-1-035');
 again.s.players[0].hand.push(second);
 let kept=play(again.packs,again.s,second.uid,'event');
 kept=choose(again.packs,kept,a=>a.mode==='pick'&&a.uid===tall.uid);
 const stayedTall=kept.players[1].front.find(c=>c?.uid===tall.uid);
 assert.ok(stayedTall);
 assert.equal(universalBp(again.packs,kept,stayedTall),2000);
 assertUniversalMatch(again.packs,kept);
});

test('Q1139 BP 0 from IYS-1-025 does not let KMR-1-025 substitute',()=>{
 const packs=[iys,kmr];
 const left=countsFor(iys,['IYS-1-025','IYS-1-001']);
 const right=countsFor(kmr,['KMR-1-010','KMR-1-025']);
 let s=toPhase(packs,fresh(packs,[left,right],1139),'main');
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 const victim=put(s,1,'KMR-1-010','front',0);
 const substitute=put(s,1,'KMR-1-025','front',1);
 const actor=take(s,0,'IYS-1-025');
 s.players[0].hand.push(actor);
 const handBefore=s.players[1].hand.length;
 s=play(packs,s,actor.uid,'play');
 assert.equal(s.pending?.kind,'effect-target');
 s=choose(packs,s,a=>a.uid===victim.uid);
 assert.notEqual(s.pending?.step,'sub25');
 assert.equal(s.players[1].front.some(c=>c?.uid===victim.uid),false);
 assert.equal(s.players[1].outside.filter(c=>c.uid===victim.uid).length,1);
 assert.equal(s.players[1].front.some(c=>c?.uid===substitute.uid),true);
 assert.equal(s.players[1].hand.length,handBefore);
 assertUniversalMatch(packs,s);
});

test('a character reduced to 0 BP on the energy line leaves, a field card does not',()=>{
 const {packs,s}=iysMain(1101);
 const victim=put(s,0,'IYS-1-011','energy',0);
 const field=put(s,0,'IYS-1-032','energy',1);
 const safe=put(s,0,'IYS-1-001','front',0);
 zero(victim,s,1000);
 zero(field,s,1000);
 let state=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(state.players[0].energy.some(c=>c?.uid===victim.uid),false);
 assert.equal(state.players[0].outside.filter(c=>c.uid===victim.uid).length,1);
 assert.equal(state.players[0].energy.some(c=>c?.uid===field.uid),true);
 const stayedSafe=state.players[0].front.find(c=>c?.uid===safe.uid);
 assert.ok(stayedSafe);
 assert.equal(universalBp(packs,state,stayedSafe),3000);
 assertUniversalMatch(packs,state);
});

test('two characters reaching 0 BP leave once each',()=>{
 const {packs,s}=iysMain(2011);
 const first=put(s,1,'IYS-1-011','front',0);
 const second=put(s,1,'IYS-1-011','front',1);
 zero(first,s,1000);
 zero(second,s,1000);
 const state=dispatchUniversalAction(packs,s,{type:'next'});
 for(const card of [first,second]){
  assert.equal(state.players[1].front.some(c=>c?.uid===card.uid),false);
  assert.equal(state.players[1].outside.filter(c=>c.uid===card.uid).length,1);
 }
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('IYS-1-028 at 0 BP still offers the printed leave replacement',()=>{
 const {packs,s}=iysMain(2800);
 const naraku=put(s,0,'IYS-1-028','front',0);
 const base=take(s,0,'IYS-1-025');
 naraku.stack=[base];
 naraku.under=['IYS-1-029','IYS-1-034'].map(id=>{
  const layer=take(s,0,id);layer.faceDown=true;return layer;
 });
 zero(naraku,s,4000);
 let state=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(state.pending?.kind,'iys');
 assert.equal(state.pending?.step,'leave');
 assert.equal(state.pending?.id,'IYS-1-028');
 state=choose(packs,state,a=>a.mode==='hand');
 assert.equal(state.players[0].hand.some(c=>c.uid===naraku.uid),true);
 assert.equal(state.players[0].front.some(c=>c?.uid===naraku.uid),false);
 assert.equal(state.players[0].outside.some(c=>c.uid===base.uid),true);
 assert.notEqual(state.pending?.step,'leave');
 assertUniversalMatch(packs,state);

 const declined=iysMain(2801);
 const other=put(declined.s,0,'IYS-1-028','front',0);
 other.under=['IYS-1-029','IYS-1-034'].map(id=>{
  const layer=take(declined.s,0,id);layer.faceDown=true;return layer;
 });
 zero(other,declined.s,4000);
 let left=dispatchUniversalAction(declined.packs,declined.s,{type:'next'});
 assert.equal(left.pending?.step,'leave');
 left=choose(declined.packs,left,a=>a.mode==='skip');
 assert.equal(left.players[0].front.some(c=>c?.uid===other.uid),false);
 assert.equal(left.players[0].outside.filter(c=>c.uid===other.uid).length,1);
 assert.notEqual(left.pending?.step,'leave');
 assertUniversalMatch(declined.packs,left);
});

test('Q1898 restores BP inside one effect across a choice, and the next effect does not wait',()=>{
 const csm=createCsmV2Pack();
 const packs=[csm,csm];
 const counts=countsFor(csm,['CSM-1-016','CSM-1-001','CSM-1-008','CSM-1-003']);
 const board=()=>toPhase(packs,fresh(packs,[counts,counts],1898),'main');
 function queue(s,jobs){
  const victim=put(s,0,'CSM-1-001','front',0,true);
  const reze=put(s,0,'CSM-1-016','front',1,true);
  put(s,0,'CSM-1-003','front',2,true);
  const deck=s.players[0].deck.length;
  s.effectQueue=jobs.map(job=>{
   const {source,...rest}=job;
   return {owner:0,sourceUid:source==='reze'?reze.uid:victim.uid,...rest};
  });
  return {s:dispatchUniversalAction(packs,s,{type:'next'}),victim,deck};
 }
 const held=queue(board(),[
  {op:'buffSelf',bp:-10000,effectScope:1},
  {op:'csm',id:'CSM-1-016',slot:'onPlay',effectScope:1,source:'reze'},
  {op:'buffSelf',bp:10000,effectScope:1}
 ]);
 assert.equal(held.s.pending?.step,'retireThenKit');
 assert.equal(held.s.players[0].front.some(c=>c?.uid===held.victim.uid),true);
 assert.equal(universalBp(packs,held.s,held.s.players[0].front.find(c=>c.uid===held.victim.uid))<=0,true);
 let restored=choose(packs,held.s,a=>a.mode==='skip');
 const stayed=restored.players[0].front.find(c=>c?.uid===held.victim.uid);
 assert.ok(stayed);
 assert.equal(universalBp(packs,restored,stayed)>0,true);
 assertUniversalMatch(packs,restored);

 const split=queue(board(),[
  {op:'buffSelf',bp:-10000,effectScope:1},
  {op:'csm',id:'CSM-1-016',slot:'onPlay',effectScope:2,source:'reze'}
 ]);
 assert.equal(split.s.pending?.step,'retireThenKit');
 assert.equal(split.s.players[0].front.some(c=>c?.uid===split.victim.uid),false);
 assert.equal(split.s.players[0].outside.some(c=>c.uid===split.victim.uid),true);
 assertUniversalMatch(packs,split.s);

 const ended=queue(board(),[
  {op:'buffSelf',bp:-10000,effectScope:1},
  {op:'csm',id:'CSM-1-016',slot:'onPlay',effectScope:1,source:'reze'},
  {op:'buffSelf',bp:1,effectScope:2}
 ]);
 assert.equal(ended.s.players[0].front.some(c=>c?.uid===ended.victim.uid),true);
 assert.throws(()=>choose(packs,ended.s,a=>a.mode==='skip'),/buffSelf source must be on field/);
});

test('AI and online matches dispatch the same engine action path',()=>{
 const ai=readFileSync(new URL('../dist/universal-v2/ai.mjs',import.meta.url),'utf8');
 const online=readFileSync(new URL('../server/domain.mjs',import.meta.url),'utf8');
 assert.match(ai,/dispatchUniversalAction/);
 assert.match(ai,/from '\.\/engine\.mjs'/);
 assert.match(online,/dispatchUniversalAction/);
 assert.match(online,/from '\.\.\/dist\/universal-v2\/engine\.mjs'/);
 const hidden=readFileSync(new URL('../dist/universal-v2/engine.mjs',import.meta.url),'utf8');
 assert.match(hidden,/openBpZeroRetirements/);
 assert.match(hidden,/\{by:'rule'\}/);
});
