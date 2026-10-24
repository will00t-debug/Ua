import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const pack=registeredV2TitlePack('sword-art-online'),packs=[pack,pack];
const ids=['SAO-1-100','SAO-1-070','SAO-1-078','SAO-1-079','SAO-2-068',
 'SAO-2-069','SAO-1-068','SAO-1-069','SAO-1-005','SAO-1-057',
 'SAO-1-051','SAO-1-019','SAO-1-004'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const pool=s.players[p][zone],i=pool.findIndex(c=>c.cardId===id);
  if(i>=0)return pool.splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function scene(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:52070});
 const asuna=take(s,0,'SAO-1-070');
 asuna.ready=true;asuna.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=asuna;
 const sources=[];
 for(let i=0;i<3;i++){
  const c=take(s,0,'SAO-2-068');c.ready=true;
  c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[i+1]=c;sources.push(c);
 }
 // Extract three DISTINCT physical IDs before returning them to HAND:
 // repeated take/push would select the same UID three times.
 const events=Array.from({length:3},()=>take(s,0,'SAO-1-100'));
 s.players[0].hand.push(...events);
 const payments=Array.from({length:3},()=>take(s,0,'SAO-1-005'));
 s.players[0].hand.push(...payments);
 for(let i=0;i<4;i++){
  const c=take(s,0,'SAO-1-068');c.ready=true;
  c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=c;
  const foe=take(s,1,'SAO-1-068');foe.ready=true;
  foe.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[i]=foe;
 }
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 // Reachable three-ready-AP snapshot: all 3 AP cards have already entered play.
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 assert.equal(universalBp(packs,s,asuna),3500);
 assert.equal(universalImpact(packs,s,asuna),0);
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,asuna,sources,events};
}
function actualNameOutside(s){
 return s.players[0].outside.filter(c=>
  ['ユウキ','マザーズ・ロザリオ'].includes(pack.cards[c.cardId].name)).length;
}
test('R52 SAO-1-070 officially pinned independent 4 BP / 6 IMPACT and real 50 cards',()=>{
 const src=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-070');
 assert.equal(src.number,'UA15BT/SAO-1-070');
 assert.deepEqual([src.color,src.energy,src.ap,src.bp,src.gen,src.trigger],
  ['green',3,1,3500,1,null]);
 assert.deepEqual(src.traits,['ALO']);
 assert.match(src.effectJa,/4枚以上/);
 assert.match(src.effectJa,/6枚以上/);
 const d=pack.cards[src.id];
 assert.deepEqual(d.passiveBonuses,[
  {condition:{kind:'ownOutsideNamedCountAtLeast',turn:'own',min:4,
   names:['ユウキ','マザーズ・ロザリオ']},bp:500},
  {condition:{kind:'ownOutsideNamedCountAtLeast',turn:'any',min:6,
   names:['ユウキ','マザーズ・ロザリオ']},impact:1}
 ]);
 assert.equal(d.printedImpact,0);
});
test('R52 REAL ACTIONS: three paid SAO100 EVENT plus three SAO068 true retire reach 3/4/5/6 sources',()=>{
 let {s,asuna,sources,events}=scene();
 const foes=s.players[1].front.filter(Boolean).map(x=>x.uid);
 for(let i=0;i<3;i++){
  const a=legalUniversalActions(packs,s).find(x=>x.type==='event'&&x.uid===events[i].uid);
  assert.ok(a,'true physical SAO-1-100 legal paid action iteration='+i+
   ' phase='+s.phase+' AP='+s.players[0].apCards.filter(x=>x.ready).length+
   ' sources='+actualNameOutside(s)+' energy='+s.players[0].energy
    .filter(Boolean).map(x=>pack.cards[x.cardId].gen).join(',')+
   ' handEvents='+s.players[0].hand.filter(c=>c.cardId==='SAO-1-100').map(x=>x.uid).join(',')+
   ' wanted='+events[i].uid+
   ' foeFront='+s.players[1].front.map(x=>x?.uid||'-').join(',')+
   ' foeBp='+s.players[1].front.filter(Boolean).map(x=>universalBp(packs,s,x)).join(',')+
   ' candidates='+legalUniversalActions(packs,s).map(x=>x.type).join(','));
  s=use(s,a);
  assert.equal(s.pending?.kind,'effect-named-outside-bounce-retire');
  assert.equal(actualNameOutside(s),i,'Q767 source not yet added');
  const chosen=legalUniversalActions(packs,s).find(x=>
   x.type==='chooseNamedOutsideBounceRetire'&&x.uid===foes[i]);
  assert.ok(chosen);s=use(s,chosen);
  assert.equal(actualNameOutside(s),i+1,'physical EVENT source only after effect');
  assert.ok(s.players[1].hand.some(x=>x.uid===foes[i]));
 }
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3500);
 assert.equal(universalImpact(packs,s,s.players[0].front[0]),0);
 for(let i=0;i<3;i++){
  const source=sources[i];
  const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&
   a.uid===source.uid&&a.mode==='restDiscardRetire');
  assert.ok(act,'SAO-2-068 real MAIN REST -> DISCARD -> true retirement');
  s=use(s,act);
  assert.equal(s.pending?.kind,'main-discard-self-retire');
  const payment=legalUniversalActions(packs,s).find(a=>a.type==='chooseMainDiscardRetire'&&
   s.players[0].hand.some(c=>c.uid===a.uid&&c.cardId==='SAO-1-005'));
  assert.ok(payment,'real physical matching hand payment');
  s=use(s,payment);
  if(s.pending?.kind==='effect-named-zone-entry'){
   const skip=legalUniversalActions(packs,s).find(a=>a.type==='chooseNamedZoneDeploy'&&a.uid===null);
   assert.ok(skip);s=use(s,skip);
  }
  assert.ok(s.players[0].outside.some(x=>x.uid===source.uid));
  assert.ok(s.zoneMoveEvents.some(e=>e.uid===source.uid&&e.reason==='retirement'));
  const count=actualNameOutside(s);assert.equal(count,4+i);
  assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
  assert.equal(universalImpact(packs,s,s.players[0].front[0]),i===2?1:0);
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 }
 for(const level of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty:level});
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(ai)));
 }
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 s=use(s,{type:'next'});assert.equal(s.phase,'attack');
 const attacker=s.players[0].front[0];
 assert.equal(universalImpact(packs,s,attacker),1);
 const before=s.players[1].life.length;
 s=use(s,{type:'attack',uid:attacker.uid});
 const block=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===foes[3]);
 assert.ok(block,'one genuine remaining opponent FRONT blocker');
 s=use(s,block);
 assert.equal(s.players[1].life.length,before-1,'winning blocker battle IMAPCT1 only');
 while(s.pending?.kind==='life-trigger')s=use(s,{type:'chooseTrigger',mode:'skip'});
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('R52 live thresholds disappear when printed name leaves OWN OUTSIDE',()=>{
 const {s:initial,asuna}=scene();
 const s=structuredClone(initial);
 // This checks the pre-existing live R51 predicate on genuine registered
 // card identities; it is separate from the real-move test above.
 for(let i=0;i<4;i++)s.players[0].outside.push(take(s,0,'SAO-1-078'));
 assert.equal(universalBp(packs,s,asuna),4000);
 assert.equal(universalImpact(packs,s,asuna),0);
 s.players[0].hand.push(s.players[0].outside.pop());
 assert.equal(universalBp(packs,s,asuna),3500);
 assert.equal(assertUniversalMatch(packs,s),true);
});
