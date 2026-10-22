import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {checkedBleachAddonDefinition,BLEACH_V2_ADDON_PROFILES} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Official Japanese UA08BT/BLC-1-023 and Q542-Q546, checked 2026-10-22:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-023
const packs=['bleach','mushoku-tensei'].map(registeredV2TitlePack);
const ids=[['BLC-1-023','BLC-1-017','BLC-1-021','BLC-1-002','BLC-1-005','BLC-1-012','BLC-1-018','BLC-1-071','BLC-1-083','BLC-1-086','BLC-1-035','BLC-1-010','BLC-1-075'],
 ['MST-1-054','MST-1-050','MST-1-052','MST-1-053','MST-1-075','MST-1-001','MST-1-002','MST-1-012','MST-1-016','MST-1-020','MST-1-022','MST-1-027','MST-1-070']];
const decks=ids.map(a=>Object.fromEntries(a.map((id,i)=>[id,i===12?2:4])));
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){for(const z of ['deck','hand','life','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function setup(){
 let s=newUniversalMatch(packs,{decks,first:0,seed:10023});
 // Actual second own turn supplies the printed AP2 cost.
 for(let n=0;n<30&&(s.active!==0||s.players[0].ownTurns<2);n++)s=act(s,{type:'next'});
 const source=take(s,0,'BLC-1-023');s.players[0].hand.push(source);
 for(let i=0;i<2;i++)s.players[0].energy[i]=take(s,0,'BLC-1-017');
 const top=take(s,1,'MST-1-054'),base=take(s,1,'MST-1-050'),low=take(s,1,'MST-1-052');
 top.stack=[base];top.ready=false;s.players[1].front[0]=top;s.players[1].front[1]=low;
 s=act(act(s,{type:'next'}),{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');assert.ok(play);
 return {s,source,top,base,low,play};
}
test('BLC023 independently pinned complete Japanese stats, printed text and legal real 50-card decks',()=>{
 const c=packs[0].cards['BLC-1-023'];
 assert.deepEqual([c.name,c.color,c.energy,c.ap,c.bp,c.gen,c.trigger,c.raidName],['ユーハバッハ','yellow',4,2,4000,1,'get',null]);
 assert.deepEqual(c.effects.onPlay,[{op:'chooseOne',optional:false,options:[
 {id:'strip',label:'Strip opponent RAID top',turn:'any',then:[{op:'stripOppRaidTop',optional:true}]},
 {id:'retire',label:'Retire BP 2000 or lower',turn:'any',then:[{op:'retireOppFrontOneUnderBp',bp:2000,optional:true}]}]}]);
 assert.equal(CARDS.find(c=>c.identity==='BLC-1-023').number,'UA08BT/BLC-1-023');
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-1-023');
 for(const patch of [{ap:1},{energy:3},{trigger:'draw'},{effect:profile.effect+'?'}])assert.throws(()=>checkedBleachAddonDefinition({...profile,...patch}),/printed card changed/);
 decks.forEach((d,i)=>assert.deepEqual(validateUniversalDeck(packs[i],d),[]));
});
for(const mode of ['strip','retire'])for(const skip of [false,true])test(`BLC023 paid cross-title ${mode}, skip=${skip}, illegal UID, AI and conservation`,()=>{
 let {s,source,top,base,low,play}=setup();
 const poor=structuredClone(s);poor.players[0].hand.push(poor.players[0].energy[0]);poor.players[0].energy[0]=take(poor,0,'BLC-1-021');
 assert.ok(!legalUniversalActions(packs,poor).some(a=>a.type==='play'&&a.uid===source.uid));
 const ap=structuredClone(s);ap.players[0].apCards.find(c=>c.ready).ready=false;
 assert.ok(!legalUniversalActions(packs,ap).some(a=>a.type==='play'&&a.uid===source.uid));
 s=act(s,play);assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.throws(()=>act(s,{type:'chooseEffectMode',mode:'forged'}),/not currently legal/);
 s=act(s,{type:'chooseEffectMode',mode});
 const type=mode==='strip'?'chooseRaidTopStrip':'chooseRetireBp',uid=mode==='strip'?top.uid:low.uid;
 assert.throws(()=>act(s,{type,uid:base.uid}),/not currently legal/);
 assert.throws(()=>act(s,{type,uid:source.uid}),/not currently legal/);
 for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 s=act(s,{type,uid:skip?null:uid});
 if(!skip){assert.ok(s.players[1].outside.some(c=>c.uid===uid));assert.equal(s.turnRetireEvents.length,mode==='retire'?1:0);}
 if(mode==='strip'&&!skip){assert.equal(s.players[1].front[0].uid,base.uid);assert.equal(s.players[1].front[0].ready,false);}
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC023 genuine GET life trigger returns exact revealed physical card to hand',()=>{
 let {s}=setup();
 const trigger=take(s,0,'BLC-1-023');s.players[0].deck.push(s.players[0].life.shift());s.players[0].life.unshift(trigger);
 while(s.active===0)s=act(s,legalUniversalActions(packs,s).find(a=>a.type==='next')||legalUniversalActions(packs,s)[0]);
 s=act(act(act(s,{type:'next'}),{type:'next'}),{type:'next'});
 const attacker=s.players[1].front[0];s=act(s,{type:'attack',uid:attacker.uid});s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 const get=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='get');assert.ok(get);
 s=act(s,get);assert.ok(s.players[0].hand.some(c=>c.uid===trigger.uid));assert.equal(assertUniversalMatch(packs,s),true);
});
