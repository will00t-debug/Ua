import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {validateUniversalDeck,createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('gurren-lagann'),both=[pack,pack];
const ids=['TTG-1-020','TTG-1-067','TTG-1-028','TTG-1-007','TTG-1-013',
 'TTG-1-002','TTG-1-015','TTG-1-018','TTG-1-022',
 'TTG-1-006','TTG-1-077','TTG-1-005','TTG-1-014'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing real 50-card physical '+id);
}
test('R57 official TTG-1-020 own hand green2→green0 iff own field empty; STEP and ACTIVE life',()=>{
 const c=TTG_BY_ID['TTG-1-020'],d=pack.cards['TTG-1-020'];
 assert.equal(c.identity,'TTG-1-020');
 assert.deepEqual([c.nameJa,c.energy,c.ap,c.bp,c.gen,c.trigger],
  ['ヨーコ',2,1,2500,1,'active']);
 assert.ok(c.source.includes('UA56BT%2FTTG-1-020'));
 assert.ok(c.effect.includes('需求能源減2')&&c.effect.includes('STEP'));
 assert.equal(d.emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(d.energy,2);assert.equal(d.step,true);assert.equal(d.trigger,'active');
});
test('R57 real paid first turn with no other field allows TTG-020 at zero produced energy',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:572020});
 const first=take(s,0,'TTG-1-020'),second=take(s,0,'TTG-1-020');
 s.players[0].hand.push(first,second);
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 assert.equal(s.phase,'main');
 const action=legalUniversalActions(both,s).find(a=>a.type==='play'&&a.uid===first.uid&&a.line==='front');
 assert.ok(action,'printed empty-own-field hand reduction not offered');
 s=use(s,action);
 assert.ok(s.players[0].front.some(c=>c?.uid===first.uid));
 assert.ok(!legalUniversalActions(both,s).some(a=>
  a.type==='play'&&a.uid===second.uid));
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
 assert.equal(universalPublicView(both,s,1).players[0].hand,null);
});
test('R57 other own field object denies discount, even when energy remains zero',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:572021});
 const target=take(s,0,'TTG-1-020');s.players[0].hand.push(target);
 const fieldCard=take(s,0,'TTG-1-007');fieldCard.ready=true;
 fieldCard.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=fieldCard;
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 assert.ok(!legalUniversalActions(both,s).some(a=>a.type==='play'&&a.uid===target.uid));
 // A foreign board object alone never changes the OWN empty-field predicate.
 const external=s.players[0].front[0];s.players[0].front[0]=null;
 s.players[0].hand.push(external);external.fieldEntryStamp=null;
 assert.ok(legalUniversalActions(both,s).some(a=>a.type==='play'&&a.uid===target.uid));
});
test('R57 shared STEP remains legal at next own movement phase, UID and printed AP conserved',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:572022});
 const target=take(s,0,'TTG-1-020');s.players[0].hand.push(target);
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 const play=legalUniversalActions(both,s).find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='front');
 assert.ok(play);s=use(s,play);
 s=use(s,{type:'next'});s=use(s,{type:'next'}); // opponent starts
 for(let i=0;i<4;i++)s=use(s,{type:'next'}); // own next start
 assert.equal(s.active,0);assert.equal(s.phase,'start');
 s=use(s,{type:'next'});
 assert.equal(s.phase,'move');
 const mv=legalUniversalActions(both,s).find(a=>a.type==='step'&&a.uid===target.uid);
 assert.ok(mv);s=use(s,mv);
 assert.ok(s.players[0].energy.some(c=>c?.uid===target.uid));
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
});
test('R57 genuine TTG-1-020 ACTIVE LIFE flips one owned character and grants exactly +3000 BP',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:572023});
 const attacker=take(s,0,'TTG-1-005');
 attacker.ready=true;attacker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=attacker;
 const revealed=take(s,1,'TTG-1-020'),defender=take(s,1,'TTG-1-005');
 defender.ready=false;defender.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=defender;
 while(s.players[1].life.length>=7)
  s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(revealed);
 while(s.players[1].life.length<7)
  s.players[1].life.push(s.players[1].deck.shift());
 s=use(s,{type:'next'});s=use(s,{type:'next'});s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=use(s,{type:'attack',uid:attacker.uid});
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,revealed.uid);
 const a=legalUniversalActions(both,s).find(x=>
  x.type==='chooseTrigger'&&x.mode==='active'&&x.uid===defender.uid);
 assert.ok(a);
 s=use(s,a);
 assert.equal(s.players[1].front[0].ready,true);
 assert.ok(s.players[1].front[0].buffs.some(b=>b.bp===3000&&b.untilTurn===s.turn));
 assert.ok(s.players[1].outside.some(x=>x.uid===revealed.uid));
 assert.equal(assertUniversalMatch(both,structuredClone(s)),true);
});
test('R57 invalid printed discount spec fails closed, never author auto inference',()=>{
 const d={...pack.cards['TTG-1-020'],
  raidBaseNames:undefined,raidFromRaid:undefined,raidRequiresNames:undefined};
 const raw={
  id:d.id,name:d.name,color:d.color,type:d.type,
  energy:d.energy,ap:d.ap,bp:d.bp,gen:d.gen,traits:d.traits,
  trigger:d.trigger,step:true,implementation:'dsl',effects:{}
 };
 for(const value of [-1,3,9])
  assert.throws(()=>createUniversalPack({id:'illegal',cards:[
   {...raw,emptyOwnFieldHandEnergyDiscount:value}]}));
});
