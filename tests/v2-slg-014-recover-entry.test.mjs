import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';

const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['005','006','014','015','016','026','032','041','043','045','052','025','078'];
const deck=Object.fromEntries(ids.map((id,i)=>['SLG-1-'+id,i===ids.length-1?2:4]));
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:14025});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical fixture '+id);
}
function main(s){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function recover({full=false}={}){
 let s=fresh(),c=take(s,0,'SLG-1-014'),source=take(s,0,'SLG-1-025');
 s.players[0].outside.push(c);
 const energies=[];
 for(let i=0;i<(full?4:3);i++){
  const x=take(s,0,i===3?'SLG-1-006':'SLG-1-005');
  x.ready=true;s.players[0].energy[i]=x;energies.push(x);
 }
 s.players[0].hand.push(source);s=main(s);
 for(let i=0;i<2;i++){s.players[0].apCards[i].inPlay=true;s.players[0].apCards[i].ready=true;}
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'drawRecover'});
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===c.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseOutsideRecovery',uid:c.uid});
 assert.equal(s.pending?.kind,'recovered-self-entry');
 return {s,c,source,energies};
}
test('official SLG-014 card source, Q2025 FRONT ban, onPlay mill and own-outside follow-up',()=>{
 const printed=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-014'),c=pack.cards['SLG-1-014'];
 assert.ok(printed.source.includes('UA51BT'));
 assert.equal(printed.nameJa,'水篠 聡子');
 assert.deepEqual([c.color,c.energy,c.ap,c.bp,c.gen,c.trigger,c.frontForbidden],
  ['purple',2,1,1000,1,null,true]);
 assert.deepEqual(c.ownOutsideRecovery,{op:'restSelfToEnergy',optional:true,rest:true});
 assert.deepEqual(c.effects.onPlay,[{op:'millTop',count:1}]);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
});
test('optional controller-only free REST ENERGY entry after exact own-outside recovery',()=>{
 const {s,c}=recover(),options=legalUniversalActions(packs,s);
 assert.deepEqual(options[0],{type:'chooseRecoveredEntry',mode:'skip'});
 assert.ok(options.some(a=>a.mode==='enter'&&a.line==='energy'));
 assert.match(V2_PENDING_LABELS['recovered-self-entry'],/回收/);
 assert.match(uiActionLabel(options[1],{pack:packs,state:s}),/REST/);
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'normal'}).mode,'enter');
 const enemy=universalPublicView(packs,s,1);
 assert.deepEqual(enemy.pending,{kind:'recovered-self-entry',player:0});
 assert.equal(enemy.players[0].hand,null);
 for(const bad of [
  {type:'chooseRecoveredEntry',mode:'enter',line:'front',slot:0},
  {type:'chooseRecoveredEntry',mode:'enter',line:'energy',slot:0}
 ])assert.throws(()=>dispatchUniversalAction(packs,s,bad),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,options[1],{actor:1}),/Wrong player/);
 const skipped=dispatchUniversalAction(packs,s,options[0]);
 assert.ok(skipped.players[0].hand.some(x=>x.uid===c.uid));
 assert.equal(skipped.pending,null);assert.equal(assertUniversalMatch(packs,skipped),true);
 const oldDeck=s.players[0].deck.length,oldOutside=s.players[0].outside.length,
  oldAp=s.players[0].apCards.filter(x=>x.ready).length;
 const accepted=dispatchUniversalAction(packs,s,options[1]);
 assert.ok(accepted.players[0].energy.some(x=>x?.uid===c.uid&&!x.ready));
 assert.ok(!accepted.players[0].hand.some(x=>x.uid===c.uid));
 assert.equal(accepted.players[0].deck.length,oldDeck-1,'entry resolves printed mill TOP1');
 assert.equal(accepted.players[0].outside.length,oldOutside+1);
 assert.equal(accepted.players[0].apCards.filter(x=>x.ready).length,oldAp,'no AP re-payment');
 assert.equal(accepted.pending,null);assert.equal(assertUniversalMatch(packs,accepted),true);
});
test('full ENERGY line free entry must choose exact existing card for REMOVAL',()=>{
 const {s,c,energies}=recover({full:true});
 const available=legalUniversalActions(packs,s).filter(a=>a.mode==='enter');
 assert.equal(available.length,4);assert.ok(available.every(a=>a.replaceUid));
 const chosen=available.find(a=>a.slot===0);
 const result=dispatchUniversalAction(packs,s,chosen);
 assert.equal(result.players[0].energy[0].uid,c.uid);
 assert.equal(result.players[0].energy[0].ready,false);
 assert.ok(result.players[0].removed.some(x=>x.uid===energies[0].uid));
 assert.ok(!result.players[0].outside.some(x=>x.uid===energies[0].uid));
 assert.equal(assertUniversalMatch(packs,result),true);
});
test('ordinary play and movement may NEVER enter FRONT, even when energy is sufficient',()=>{
 let s=fresh(),c=take(s,0,'SLG-1-014');
 for(let i=0;i<2;i++){const e=take(s,0,'SLG-1-005');e.ready=true;s.players[0].energy[i]=e;}
 s.players[0].hand.push(c);s=main(s);
 const legal=legalUniversalActions(packs,s).filter(a=>a.uid===c.uid);
 assert.ok(legal.some(a=>a.type==='play'&&a.line==='energy'));
 assert.ok(!legal.some(a=>a.line==='front'));
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'play',uid:c.uid,line:'front',slot:0}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,legal.find(a=>a.line==='energy'));
 const moved=structuredClone(s);moved.phase='move';moved.movedUids=[];
 assert.ok(!legalUniversalActions(packs,moved).some(a=>a.type==='move'&&a.uid===c.uid));
 assert.throws(()=>dispatchUniversalAction(packs,moved,
  {type:'move',uid:c.uid,slot:0}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict recovery and front restriction schemas reject forged profiles',()=>{
 const profile={id:'SYN',name:'Synthetic',color:'purple',type:'character',energy:2,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{onPlay:[{op:'millTop',count:1}]},
  ownOutsideRecovery:{op:'restSelfToEnergy',optional:true,rest:true},frontForbidden:true};
 assert.doesNotThrow(()=>createUniversalPack({id:'synthetic',cards:[profile]}));
 for(const p of [
  {op:'restSelfToEnergy',optional:false,rest:true},
  {op:'restSelfToEnergy',optional:true,rest:false},
  {op:'playFront',optional:true,rest:true},
  {op:'restSelfToEnergy',optional:true,rest:true,ap:0}
 ])assert.throws(()=>createUniversalPack({id:'synthetic',cards:[{...profile,ownOutsideRecovery:p}]}),
  /unsupported own-outside recovery entry/);
 assert.throws(()=>createUniversalPack({id:'synthetic',cards:[{...profile,frontForbidden:false}]}),
  /invalid front-line restriction/);
 assert.throws(()=>createUniversalPack({id:'synthetic',cards:[{...profile,implementation:'vanilla',effects:{}}]}),
  /claims vanilla/);
});
