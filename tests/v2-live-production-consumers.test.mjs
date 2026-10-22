import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalCardEnergy,universalEnergyByColor,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
const mst=registeredV2TitlePack('mushoku-tensei'),slg=registeredV2TitlePack('solo-leveling');
const md=Object.fromEntries(['002','010','012','013','016','017','019','050','055','063','070'].map(n=>['MST-1-'+n,4]));
Object.assign(md,{'MST-1-001':2,'MST-1-057':2,'MST-1-029':2});
const sd=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(n=>['SLG-1-'+n,4]));sd['SLG-1-041']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);}
function setup(owner){
 assert.deepEqual(validateUniversalDeck(mst,md),[]);assert.deepEqual(validateUniversalDeck(slg,sd),[]);
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{decks:owner===0?[md,sd]:[sd,md],first:owner,seed:570630+owner});
 while(s.phase!=='main')s=dispatchUniversalAction(packs,s,{type:'next'});
 return {packs,s};
}
function put(s,p,id,line,slot){const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;return c;}
for(const owner of [0,1])test('live production resolves current MST029 READY/identity/buffs from UID, seat '+owner,()=>{
 const {packs,s}=setup(owner),c=put(s,owner,'MST-1-029','energy',0),stale=structuredClone(c);
 assert.equal(universalCardEnergy(packs,s,owner,stale),2);
 c.ready=false;
 assert.equal(universalCardEnergy(packs,s,owner,stale),1);
 c.buffs=[{energy:1,untilTurn:s.turn}];
 assert.equal(universalCardEnergy(packs,s,owner,stale),2);
 c.buffs[0].untilTurn=s.turn-1;
 assert.equal(universalCardEnergy(packs,s,owner,stale),1);
 assert.equal(universalCardEnergy(packs,s,owner,{...stale,cardId:'NOT-A-CARD',ready:true,buffs:[{energy:99,untilTurn:s.turn}]}),1);
 assert.equal(universalCardEnergy(packs,s,1-owner,stale),0);
 s.players[owner].energy[0]=null;s.players[owner].outside.push(c);
 assert.equal(universalCardEnergy(packs,s,owner,stale),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
for(const owner of [0,1])test('MST057 FRONT production pays another real GREEN4 play and removal invalidates stale action, seat '+owner,()=>{
 let {packs,s}=setup(owner);
 for(let i=0;i<3;i++)put(s,owner,'MST-1-050','energy',i);
 const producer=put(s,owner,'MST-1-057','front',0);producer.ready=false;
 const target=take(s,owner,'MST-1-057');s.players[owner].hand.push(target);
 assert.equal(universalEnergyByColor(packs,s,owner).green,4);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='front'&&a.slot===1);
 assert.ok(action);
 const removed=structuredClone(s);removed.players[owner].outside.push(removed.players[owner].front[0]);removed.players[owner].front[0]=null;
 assert.equal(universalEnergyByColor(packs,removed,owner).green,3);
 assert.equal(legalUniversalActions(packs,removed).some(a=>a.type==='play'&&a.uid===target.uid),false);
 const snapshot=structuredClone(removed);
 assert.throws(()=>dispatchUniversalAction(packs,removed,action,{actor:owner}));
 assert.deepEqual(removed,snapshot);
 const ap=s.players[owner].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,action,{actor:owner});
 assert.equal(s.players[owner].front[1].uid,target.uid);
 assert.equal(s.players[owner].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(universalEnergyByColor(packs,s,owner).green,5);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,removed),true);
});
for(const owner of [0,1])for(const hasFrontProducer of [false,true])test('MST063 draw threshold includes live FRONT production='+hasFrontProducer+', seat '+owner,()=>{
 let {packs,s}=setup(owner);
 for(let i=0;i<2;i++)put(s,owner,'MST-1-050','energy',i);
 for(let i=2;i<4;i++)put(s,owner,'MST-1-029','energy',i);
 if(hasFrontProducer)put(s,owner,'MST-1-057','front',0).ready=false;
 const source=take(s,owner,'MST-1-063');s.players[owner].hand.push(source);
 const beforeDeck=s.players[owner].deck.length,beforeHand=s.players[owner].hand.length;
 const top=s.players[owner].deck[0].uid;
 const a=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===1);
 assert.ok(a);
 s=dispatchUniversalAction(packs,s,a,{actor:owner});
 assert.equal(s.players[owner].deck.length,beforeDeck-(hasFrontProducer?1:0));
 assert.equal(s.players[owner].hand.length,beforeHand-1+(hasFrontProducer?1:0));
 assert.equal(s.players[owner].hand.some(c=>c.uid===top),hasFrontProducer);
 assert.equal(universalEnergyByColor(packs,s,owner).green,hasFrontProducer?3:2);
 assert.equal(universalEnergyByColor(packs,s,owner).blue,4);
 assert.equal(universalEnergyByColor(packs,s,1-owner).green||0,0);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
