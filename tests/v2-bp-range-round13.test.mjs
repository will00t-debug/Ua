import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX07BT/BLC-2-007 checked 2026-10-22:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-007
// 黄3 / AP1 / キャラ / BP2500 / 発生黄黄 / 登場時
// BP1000以上の相手のフロントLのキャラ全ては、このターン中、BP-500。
// ACTIVE: 自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。
// The page has no FAQ. Feature text on the page is 星十字騎士団／バンビーズ;
// the local catalogue keeps that as one translated trait and this port does not split it.
const bleach=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei');
function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function main(packs,s){
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
const unit=(id,bp,effect)=>({
 id,name:id,color:'green',type:'character',energy:0,ap:1,bp,gen:1,
 implementation:effect?'dsl':'vanilla',
 ...(effect?{templateEffects:{onPlay:[effect]}}:{})
});

test('BLC-2-007 uses the shared inclusive BP floor and the standard ACTIVE trigger',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-007'));
 const card=bleach.cards['BLC-2-007'];
 const printed=CARDS.find(c=>c.identity==='BLC-2-007');
 assert.equal(printed.nameJa,'キャンディス・キャットニップ');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits],
  ['yellow',3,1,2500,2,'active',['星十字騎士團／邦比愛塔親衛隊']]);
 assert.deepEqual(card.effects,{onPlay:[{op:'enemyFrontAllBpDown',bp:500,minBp:1000}]});
 assert.equal(card.triggerEffect,null);
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-2-007');
 assert.deepEqual(checkedBleachAddonDefinition(profile).templateEffects,
  {onPlay:[{template:'enemyFrontBpDownInRange',bp:500,minBp:1000,maxBp:null}]});
});

test('BP window is snapshotted once and does not retarget after the reduction',()=>{
 const cards=['SRC','L500','L999','M1000','M1500','H3000','E2000','OWN','N1','N2','N3','N4','LATE']
  .map(id=>unit(id,Number(id.replace(/\D/g,''))||1500,
   id==='SRC'?{template:'enemyFrontBpDownInRange',bp:500,minBp:1000,maxBp:2000}:null));
 const pack=createUniversalPack({id:'bp-range-fixture',cards});
 const packs=[pack,pack];
 const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2007,first:0});
 const src=take(s,0,'SRC');s.players[0].hand.push(src);
 const own=take(s,0,'OWN');own.ready=true;s.players[0].front[0]=own;
 const front={};
 for(const [i,id] of ['L999','M1000','M1500','H3000'].entries()){
  front[id]=take(s,1,id);s.players[1].front[i]=front[id];
 }
 const energy=take(s,1,'E2000');s.players[1].energy[0]=energy;
 s=main(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'));
 const live=uid=>[...s.players[0].front,...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,live(front.L999.uid)),999);
 assert.equal(universalBp(packs,s,live(front.M1000.uid)),500,'1000 was inside the window before it fell below 1000');
 assert.equal(universalBp(packs,s,live(front.M1500.uid)),1000);
 assert.equal(universalBp(packs,s,live(front.H3000.uid)),3000);
 assert.equal(universalBp(packs,s,live(energy.uid)),2000);
 assert.equal(universalBp(packs,s,live(own.uid)),1500);
 const late=take(s,1,'LATE');
 const displaced=s.players[1].front[1];
 s.players[1].outside.push(displaced);
 s.players[1].front[1]=late;
 assert.equal(universalBp(packs,s,late),1500,'a character that arrives after resolution is not in the snapshot');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.throws(()=>expandAbilityTemplates({onPlay:[{template:'enemyFrontBpDownInRange',bp:500,minBp:null,maxBp:null}]}),/incompatible parameters/);
 assert.throws(()=>expandAbilityTemplates({onPlay:[{template:'enemyFrontBpDownInRange',bp:500,minBp:2000,maxBp:1000}]}),/incompatible parameters/);
 assert.throws(()=>createUniversalPack({id:'bad-range',cards:[unit('X',1000,null),{
  ...unit('Y',1000,null),implementation:'dsl',
  effects:{onPlay:[{op:'enemyFrontAllBpDown',bp:500,minBp:2000,maxBp:1000}]}
 }]}),/invalid simultaneous BP reduction/);
});

test('an unbounded batch reduction still hits every opposing front character',()=>{
 const cards=['SRC','LOW','HIGH','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']
  .map(id=>unit(id,id==='LOW'?400:id==='HIGH'?2000:1500,
   id==='SRC'?{template:'enemyFrontAllBpDown',bp:500}:null));
 const pack=createUniversalPack({id:'bp-open-fixture',cards});
 const packs=[pack,pack];
 const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2008,first:0});
 const src=take(s,0,'SRC');s.players[0].hand.push(src);
 const low=take(s,1,'LOW'),high=take(s,1,'HIGH');
 s.players[1].front[0]=low;s.players[1].front[1]=high;
 s=main(packs,s);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'));
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(universalBp(packs,s,s.players[1].front.find(c=>c?.uid===high.uid)),1500);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('paid BLC-2-007 debuffs only opposing front characters whose current BP is at least 1000',()=>{
 const packs=[bleach,mst];
 const ble=deck(bleach,['BLC-2-007','BLC-1-009'],'yellow');
 const foreign=deck(mst,['MST-1-012','MST-1-001','MST-1-010','MST-1-002','MST-1-029'],'blue');
 let s=newUniversalMatch(packs,{decks:[ble,foreign],seed:2009,first:0});
 const source=take(s,0,'BLC-2-007');s.players[0].hand.push(source);
 for(let i=0;i<3;i++){const g=take(s,0,'BLC-1-009');g.ready=true;s.players[0].energy[i]=g;}
 const ally=take(s,0,'BLC-1-009');ally.ready=true;s.players[0].front[1]=ally;
 const floor=take(s,1,'MST-1-012');
 const below=take(s,1,'MST-1-001');
 below.buffs=[{bp:-600,untilTurn:s.turn}];
 const high=take(s,1,'MST-1-010');
 const bench=take(s,1,'MST-1-002');
 s.players[1].front[0]=floor;s.players[1].front[1]=below;s.players[1].front[2]=high;
 s.players[1].energy[0]=bench;
 s=main(packs,s);
 assert.equal(universalBp(packs,s,below),900);
 const poor=structuredClone(s);
 poor.players[0].outside.push(poor.players[0].energy[2]);poor.players[0].energy[2]=null;
 assert.equal(legalUniversalActions(packs,poor).some(a=>a.uid===source.uid),false);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,play);
 const live=uid=>[...s.players[0].front,...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
 assert.equal(universalBp(packs,s,live(floor.uid)),500);
 assert.equal(universalBp(packs,s,live(below.uid)),900);
 assert.equal(universalBp(packs,s,live(high.uid)),2500);
 assert.equal(universalBp(packs,s,live(bench.uid)),2000);
 assert.equal(universalBp(packs,s,live(ally.uid)),3000);
 assert.equal(universalBp(packs,s,live(source.uid)),2500);
 const later=take(s,1,'MST-1-029');
 s.players[1].front[3]=later;
 assert.equal(universalBp(packs,s,later),2500);
 for(let n=0;n<3&&s.phase!=='attack';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(universalBp(packs,s,s.players[1].front.find(c=>c?.uid===floor.uid)),500,'the printed turn duration lasts through this attack phase');
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),1000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-007 ACTIVE life trigger readies one character and grants BP+3000',()=>{
 const packs=[bleach,bleach];
 const ble=deck(bleach,['BLC-2-007','BLC-1-009'],'yellow');
 let s=newUniversalMatch(packs,{decks:[ble,ble],seed:2010,first:0});
 const attacker=take(s,0,'BLC-1-009');attacker.ready=true;s.players[0].front[0]=attacker;
 const rested=take(s,1,'BLC-1-009');rested.ready=false;s.players[1].front[0]=rested;
 const revealed=take(s,1,'BLC-2-007');s.players[1].life.unshift(revealed);
 for(let n=0;n<6&&s.phase!=='attack';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.trigger,'active');
 const choice=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===rested.uid);
 assert.ok(choice);
 s=dispatchUniversalAction(packs,s,choice,{actor:1});
 const target=s.players[1].front.find(c=>c?.uid===rested.uid);
 assert.equal(target.ready,true);
 assert.equal(universalBp(packs,s,target),6000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
