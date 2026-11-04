import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {csmFacedowns} from '../dist/universal-v2/csm-continuous.mjs';
import {runCsmJob} from '../dist/universal-v2/csm-runtime.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';

const pack=createCsmV2Pack(),packs=[pack,pack];
function countsFor(required){
 const ids=[...new Set(required)];
 for(const d of Object.values(pack.cards).sort((a,b)=>a.id.localeCompare(b.id))){
  if(ids.length>=13)break;
  if(!ids.includes(d.id)&&!['special','color','final'].includes(d.trigger))ids.push(d.id);
 }
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function start(required,seed){
 let s=newUniversalMatch(packs,{decks:[countsFor(required),countsFor(required)],seed,first:0});
 let guard=0;
 while(s.phase!=='main'){
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.ok(++guard<8);
 }
 for(let i=0;i<s.players[0].apCards.length;i++){
  s.players[0].apCards[i].inPlay=i<3;
  s.players[0].apCards[i].ready=i<3;
 }
 while(s.players[0].hand.length)s.players[0].deck.push(s.players[0].hand.pop());
 return s;
}
function take(s,id){
 const pl=s.players[0];
 for(const zone of ['hand','deck','life','outside','removed']){
  const idx=pl[zone].findIndex(c=>c.cardId===id);
  if(idx!==-1)return pl[zone].splice(idx,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,id,line,slot){
 const c=take(s,id);
 c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=c;
 return c;
}
function hand(s,id){
 const c=take(s,id);s.players[0].hand.push(c);return c;
}
function redEnergy(s,third='CSM-1-059',fourth=null){
 place(s,'CSM-1-060','energy',0);
 place(s,'CSM-1-060','energy',1);
 place(s,third,'energy',2);
 if(fourth)place(s,fourth,'energy',3);
}

test('CSM-1-048 attack-end peels Pochita under the buried Denji Raid base',()=>{
 let s=start(['CSM-1-048','CSM-1-050','CSM-1-067','CSM-1-060','CSM-1-059'],48067);
 redEnergy(s,'CSM-1-059','CSM-1-067'); // red 6 for the paid 6/1 Raid
 const denji=place(s,'CSM-1-050','front',0);
 const pochita=take(s,'CSM-1-067');
 pochita.faceDown=true;pochita.ready=false;pochita.fieldEntryStamp=null;
 denji.under=[pochita];
 const top=hand(s,'CSM-1-048');
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&
  a.uid===top.uid&&a.baseUid===denji.uid&&a.slot===0);
 assert.ok(raid,'6/1 Chainsaw Man should Raid its Denji base');
 s=dispatchUniversalAction(packs,s,raid);
 const host=s.players[0].front[0];
 assert.equal(host.uid,top.uid);
 assert.ok(host.stack?.some(c=>c.uid===denji.uid));
 assert.equal(csmFacedowns(host).some(c=>c.uid===pochita.uid),true);
 host.ready=false; // simulate the attack having finished
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-048',slot:'attackEnd',owner:0,sourceUid:host.uid});
 assert.equal(host.ready,true,'Chainsaw Man must become ACTIVE');
 assert.equal(host.impactGranted?.amount,1);
 assert.equal(host.stack[0].under?.some(c=>c.uid===pochita.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===pochita.uid),true);
 assert.equal(s.pending?.step,'pochita','optional resting Pochita entry');
 const skip=legalUniversalActions(packs,s).find(a=>a.type==='csm'&&a.mode==='skip');
 assert.ok(skip);
 s=dispatchUniversalAction(packs,s,skip);
 assertUniversalMatch(packs,s);
});

test('CSM-1-048 may select between multiple facedown cards under the Raid base',()=>{
 let s=start(['CSM-1-048','CSM-1-050','CSM-1-067','CSM-1-060','CSM-1-059'],48167);
 redEnergy(s,'CSM-1-059','CSM-1-067');
 const denji=place(s,'CSM-1-050','front',0);
 const pochita=take(s,'CSM-1-067');
 const extra=take(s,'CSM-1-001');
 for(const c of [pochita,extra]){c.faceDown=true;c.ready=false;c.fieldEntryStamp=null;}
 denji.under=[pochita,extra];
 const top=hand(s,'CSM-1-048');
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===denji.uid&&a.slot===0);
 assert.ok(raid);
 s=dispatchUniversalAction(packs,s,raid);
 const host=s.players[0].front[0];host.ready=false;
 runCsmJob(pack,s,{op:'csm',id:'CSM-1-048',slot:'attackEnd',owner:0,sourceUid:host.uid});
 assert.equal(s.pending?.step,'peelUnder');
 const pick=legalUniversalActions(packs,s).find(a=>a.type==='csm'&&a.mode==='peel'&&a.uid===pochita.uid);
 assert.ok(pick);
 s=dispatchUniversalAction(packs,s,pick);
 assert.equal(s.pending?.step,'pochita');
 // Dispatch returns a cloned state: read the current physical Raid, not the
 // pre-dispatch host reference.
 const updatedHost=s.players[0].front[0];
 assert.equal(updatedHost.stack[0].under.length,1);
 assert.equal(updatedHost.stack[0].under[0].uid,extra.uid);
 assertUniversalMatch(packs,s);
});

test('CSM-1-061 5/1 Power can Raid a red Power on the front line',()=>{
 let s=start(['CSM-1-061','CSM-1-057','CSM-1-059','CSM-1-060'],56100);
 redEnergy(s); // 2+2+1 red satisfies energy 5
 const base=place(s,'CSM-1-057','front',0);
 const top=hand(s,'CSM-1-061');
 const actions=legalUniversalActions(packs,s);
 const raid=actions.find(a=>a.type==='raid'&&a.uid===top.uid&&
  a.baseUid===base.uid&&a.slot===0);
 assert.ok(raid,'Power Raid must be legal from a same-name red Power base');
 s=dispatchUniversalAction(packs,s,raid);
 assert.equal(s.players[0].front[0]?.uid,top.uid);
 assert.equal(s.players[0].front[0]?.ready,true);
 assert.equal(s.players[0].front[0]?.stack?.[0]?.uid,base.uid);
 assertUniversalMatch(packs,s);
});

test('CSM-1-061 Power can Raid an energy-line Power to a selected front slot',()=>{
 let s=start(['CSM-1-061','CSM-1-057','CSM-1-059','CSM-1-060'],56101);
 redEnergy(s);
 const base=place(s,'CSM-1-057','energy',3);
 const top=hand(s,'CSM-1-061');
 const actions=legalUniversalActions(packs,s);
 const raid=actions.find(a=>a.type==='raid'&&a.uid===top.uid&&
  a.baseUid===base.uid&&a.slot===1&&(a.line===undefined||a.line==='front'));
 assert.ok(raid,'Power on energy line should permit raid into empty front');
 s=dispatchUniversalAction(packs,s,raid);
 assert.equal(s.players[0].front[1]?.uid,top.uid);
 assert.equal(s.players[0].front[1]?.ready,true);
 assert.equal(s.players[0].front[1]?.stack?.[0]?.uid,base.uid);
 assertUniversalMatch(packs,s);
});
