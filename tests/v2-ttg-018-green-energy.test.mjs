import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_V2_ADDITION_IDS} from '../dist/universal-v2/ttg-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,universalCardEnergy,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const ttg=registeredV2TitlePack('gurren-lagann'),mst=registeredV2TitlePack('mushoku-tensei'),ID='TTG-1-018';
const ttgDeck=Object.fromEntries(['001','005','009','014','018','019','042','043','047','049','051','064'].map(n=>['TTG-1-'+n,4]));ttgDeck['TTG-1-036']=2;
const mstDeck=Object.fromEntries(['001','002','003','010','012','013','016','017','019','020','024','027'].map(n=>['MST-1-'+n,4]));mstDeck['MST-1-029']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const arr=s.players[p][z],n=arr.findIndex(x=>x.cardId===id);if(n>=0)return arr.splice(n,1)[0]}throw Error('no physical '+id)}
function main(packs,s){for(let i=0;i<5&&s.phase!=='main';i++){let a=legalUniversalActions(packs,s).find(x=>x.type==='next');assert.ok(a);s=dispatchUniversalAction(packs,s,a)}assert.equal(s.phase,'main');return s}
function scene(owner){const packs=owner===0?[ttg,mst]:[mst,ttg],decks=owner===0?[ttgDeck,mstDeck]:[mstDeck,ttgDeck];let s=newUniversalMatch(packs,{decks,first:owner,seed:1018+owner});let c=take(s,owner,ID);c.ready=true;s.players[owner].energy[0]=c;s=main(packs,s);return {s,packs,source:c,owner}}
test('TTG-018 official source has NO Life icon, identical shared MAIN op as RED TTG-063',()=>{
 const origin=TTG_BY_ID[ID],card=ttg.cards[ID];
 assert.equal(origin.identity,ID);
 assert.equal(origin.number,'UA56BT/TTG-1-018');
 assert.equal(origin.nameJa,'ブータ');
 assert.equal(origin.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-018');
 assert.equal(origin.effect,'主要階段每回合一次：REST自己，本回合產能+1；主要階段結束時退場。');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.type,card.trigger,card.name],['green',0,1,1000,1,'character',null,'ブータ']);
 assert.deepEqual(card.mainAbility,ttg.cards['TTG-1-063'].mainAbility);
 assert.deepEqual(card.effects,{});
 assert.ok(TTG_V2_ADDITION_IDS.includes(ID));
 assert.equal(Object.keys(ttg.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
});
for(const owner of [0,1]){
 test('TTG-018 P'+owner+' versus MST pays physical self REST for own live GREEN +1, retires at MAIN exit',()=>{
 const {s:before,packs,source}=scene(owner),action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 assert.equal(universalEnergyByColor(packs,before,owner).green,1);
 assert.ok(legalUniversalActions(packs,before).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 const ap=before.players[owner].apCards.filter(c=>c.ready).length;
 assert.throws(()=>dispatchUniversalAction(packs,before,action,{actor:1-owner}),/Wrong player/);
 let s=dispatchUniversalAction(packs,before,action,{actor:owner});
 assert.equal(before.players[owner].energy[0].ready,true);
 assert.equal(s.players[owner].energy[0].ready,false);
 assert.equal(universalEnergyByColor(packs,s,owner).green,2);
 assert.equal(universalEnergyByColor(packs,s,1-owner).green||0,0);
 assert.equal(universalCardEnergy(packs,s,owner,s.players[owner].energy[0]),2);
 assert.equal(s.players[owner].apCards.filter(c=>c.ready).length,ap);
 assert.equal(s.delayedEffects.length,1);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,action,{actor:owner}),/not currently legal/);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.ok(s.players[owner].outside.some(c=>c.uid===source.uid));
 assert.equal(s.players[owner].energy[0],null);
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalEnergyByColor(packs,s,owner).green||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('TTG-018 FRONT and REST ENERGY are not valid MAIN energy ability sources',()=>{
 const {s,packs,source}=scene(0);
 const rested=structuredClone(s);rested.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,rested).some(a=>a.type==='activate'&&a.uid===source.uid));
 const front=structuredClone(s);front.players[0].front[0]=front.players[0].energy[0];front.players[0].energy[0]=null;
 assert.ok(!legalUniversalActions(packs,front).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,front,{type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-fake',mode:'selfRestEnergyRetire'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,rested),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});
