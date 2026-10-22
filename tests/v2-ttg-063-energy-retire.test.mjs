import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createTtgV2Pack,TTG_V2_ADDITION_IDS} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

// UA56BT/TTG-1-063 uses the SAME shared delayed-energy MAIN profile as
// source-verified MST016 and SLG013; only its own printed color changes.
// Card-front source in TTG_BY_ID was transcribed from the supplied eight-card PDF.
const ttg=registeredV2TitlePack('gurren-lagann');
const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const ttgIds=['042','043','047','049','051','052','053',
 '063','064','065','066','072','073'];
const ttgDeck=Object.fromEntries(ttgIds.map(id=>['TTG-1-'+id,4]));
ttgDeck['TTG-1-073']=2;
const mstIds=['001','002','003','010','012','013','016',
 '017','019','020','024','027','029'];
const mstDeck=Object.fromEntries(mstIds.map(id=>['MST-1-'+id,4]));
mstDeck['MST-1-029']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],ix=a.findIndex(c=>c.cardId===id);
  if(ix>=0)return a.splice(ix,1)[0];
 }
 throw Error('Missing printed physical card '+id);
}
function put(s,p,id,line,slot){
 assert.equal(s.players[p][line][slot],null);
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;
 return c;
}
function main(packs,s){
 for(let k=0;k<5&&s.phase!=='main';k++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');return s;
}
function scene(owner=0){
 const packs=owner===0?[ttg,mst]:[mst,ttg];
 const decks=owner===0?[ttgDeck,mstDeck]:[mstDeck,ttgDeck];
 let s=newUniversalMatch(packs,{decks,first:owner,seed:6300+owner});
 const source=put(s,owner,'TTG-1-063','energy',0);
 s=main(packs,s);
 return {packs,s,source,owner};
}
test('TTG-063 source fingerprint: original eight-card front and native shared red energy action',()=>{
 const original=TTG_BY_ID['TTG-1-063'],card=ttg.cards['TTG-1-063'];
 assert.equal(original.number,'UA56BT/TTG-1-063');
 assert.equal(original.identity,'TTG-1-063');
 assert.equal(original.verifiedFrom,'user-uploaded-card-front-pdf-2026-10-13');
 assert.equal(original.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-063');
 assert.equal(original.nameJa,'ブータ');
 assert.match(original.effect,/REST 自己/);
 assert.match(original.effect,/每回合一次/);
 assert.match(original.effect,/紅色能源\+1/);
 assert.match(original.effect,/主要階段結束時讓此角色退場/);
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,
  card.gen,card.type,card.trigger,card.traits],
  ['ブータ','red',0,1,1000,1,'character',null,['大グレン団']]);
 assert.deepEqual(card.mainAbility,mst.cards['MST-1-016'].mainAbility);
 assert.deepEqual(card.mainAbility,slg.cards['SLG-1-013'].mainAbility);
 assert.deepEqual(card.effects,{});
 assert.equal(TTG_V2_ADDITION_IDS.filter(id=>id==='TTG-1-063').length,1);
 assert.deepEqual(Object.keys(ttg.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
test('real TTG P0 vs MST P1 MAIN: pay READY->REST once, +1 RED and retire exact UID at main close',()=>{
 const {packs,s:original,source}=scene(0);
 const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 const beforeAp=original.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(universalEnergyByColor(packs,original,0).red,1);
 assert.ok(legalUniversalActions(packs,original).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 assert.throws(()=>dispatchUniversalAction(packs,original,action,{actor:1}),/Wrong player/);
 let s=dispatchUniversalAction(packs,original,action,{actor:0});
 assert.equal(original.players[0].energy[0].ready,true,'pure reducer preserved caller');
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(packs,s,0).red,2);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,beforeAp);
 assert.equal(s.delayedEffects.length,1);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalEnergyByColor(packs,s,0).red||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('real TTG P1 vs MST P0: red source never feeds opponent energy or reveals owner hand',()=>{
 const {packs,s:orig,source,owner}=scene(1);
 assert.equal(owner,1);
 assert.ok(source.uid.startsWith('1-'));
 assert.equal(universalEnergyByColor(packs,orig,1).red,1);
 assert.equal(universalEnergyByColor(packs,orig,0).red||0,0);
 let s=dispatchUniversalAction(packs,orig,
  {type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'},{actor:1});
 assert.equal(universalEnergyByColor(packs,s,1).red,2);
 assert.equal(universalEnergyByColor(packs,s,0).red||0,0);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('TTG-063 front-line or REST source cannot activate; forged UID never enters delayed queue',()=>{
 const {packs,s:original,source}=scene();
 const alreadyRest=structuredClone(original);
 alreadyRest.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,alreadyRest).some(a=>a.type==='activate'&&a.uid===source.uid));
 const front=structuredClone(original);
 front.players[0].front[0]=front.players[0].energy[0];front.players[0].energy[0]=null;
 assert.ok(!legalUniversalActions(packs,front).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,front,{type:'activate',
  uid:source.uid,mode:'selfRestEnergyRetire'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,original,{type:'activate',
  uid:'0-fabricated',mode:'selfRestEnergyRetire'}),/not currently legal/);
 assert.equal(original.delayedEffects.length,0);
 assert.equal(assertUniversalMatch(packs,original),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});
test('TTG-063 bounce and re-entry cancels obsolete delayed retirement, no ghost energy bonus',()=>{
 const {packs,s:initial,source}=scene();
 let s=structuredClone(initial);
 const other=put(s,0,'TTG-1-042','energy',1);
 let action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.delayedEffects.length,1);
 const bouncer=take(s,0,'TTG-1-049');s.players[0].hand.push(bouncer);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===bouncer.uid&&a.line==='front');
 assert.ok(play,'legal red energy and AP for printed 049 self-other bounce');
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 const bounce=legalUniversalActions(packs,s).find(a=>a.type==='chooseOwnBounce'&&a.uid===source.uid);
 assert.ok(bounce);
 s=dispatchUniversalAction(packs,s,bounce);
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].energy[0],null);
 const restored=s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===source.uid),1)[0];
 assert.equal(restored.fieldEntryStamp,null);
 restored.ready=false;s.players[0].energy[0]=restored;
 assert.equal(universalCardEnergy(packs,s,0,restored),1,'source loses prior energy buff on leaving field');
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0]?.uid,source.uid);
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),1);
 assert.equal(other.uid,s.players[0].energy[1]?.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
