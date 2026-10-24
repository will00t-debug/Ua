import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalCardEnergy,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. UA15BT/SAO-1-043 has no FAQ block.
// Cost alt 青3, generated alt 青. The on-play sentence names 〈ピナ〉 only.
// It does not print color, required energy, or AP. Up to one, REST.

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];
const blueId=Object.values(sao.cards).find(c=>c.color==='blue'&&c.type==='character'&&
 c.gen>=1&&c.name!=='ピナ'&&c.id!=='SAO-1-043'&&c.maxCopies===4&&
 !['special','color','final'].includes(c.trigger)).id;

function deck(){
 const required=['SAO-1-043','SAO-2-019','SAO-1-045',blueId];
 const rest=Object.values(sao.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,9)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function toMain(seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');
 return s;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('SAO-1-043 deploys a named character and does not reuse the filtered REST op',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-043');
 assert.equal(source.effectJa,'【登場時】自分の場外から〈ピナ〉を1枚まで自分の場にレストで登場させる。');
 assert.equal(source.energy,3);
 assert.equal(source.gen,1);
 assert.equal(source.trigger,'draw');
 assert.deepEqual(source.traits,['アインクラッド']);
 const card=sao.cards['SAO-1-043'];
 assert.equal(card.name,'シリカ');
 assert.equal(card.gen,1);
 assert.equal(card.frontGeneratesEnergy,false);
 assert.deepEqual(card.effects.onPlay,[{op:'deployOutsideNameRest',name:'ピナ',optional:true}]);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-043'));
 const base={id:'LAB',name:'Lab',color:'blue',type:'character',energy:0,ap:1,
  bp:1000,gen:1,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'old-shape',cards:[{...base,
  effects:{onPlay:[{op:'deployOutsideRest',name:'ピナ',optional:true}]}}]}),
  /invalid outside-to-REST/);
 assert.throws(()=>createUniversalPack({id:'filtered',cards:[{...base,
  effects:{onPlay:[{op:'deployOutsideNameRest',name:'ピナ',color:'blue',
   energy:2,ap:1,optional:true}]}}]}),/invalid name-only outside REST/);
});

test('either printed Pina can enter REST, and a non-Pina cannot',()=>{
 let s=toMain(1043);
 for(let slot=0;slot<3;slot++){
  const gen=take(s,0,blueId);gen.ready=true;s.players[0].energy[slot]=gen;
 }
 const costly=take(s,0,'SAO-2-019');
 const free=take(s,0,'SAO-1-045');
 const other=take(s,0,blueId);
 s.players[0].outside.push(costly,free,other);
 const held=take(s,0,'SAO-2-019');
 s.players[0].hand.push(held);
 const foe=take(s,1,'SAO-1-045');
 s.players[1].outside.push(foe);
 const silica=take(s,0,'SAO-1-043');
 s.players[0].hand.push(silica);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===silica.uid&&
  a.line==='front'&&!a.replaceUid);
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].front[0]),0);
 const choices=new Set(s.pending.choices);
 assert.equal(choices.has(costly.uid),true);
 assert.equal(choices.has(free.uid),true);
 assert.equal(choices.has(other.uid),false);
 assert.equal(choices.has(held.uid),false);
 assert.equal(choices.has(foe.uid),false);
 aiLegal(s);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOutsideNameRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].outside.some(c=>c.uid===costly.uid));
 const enter=legalUniversalActions(packs,s).find(a=>a.type==='chooseOutsideNameRest'&&
  a.uid===costly.uid&&a.line==='front'&&!a.replaceUid);
 const entered=dispatchUniversalAction(packs,s,enter);
 const pina=entered.players[0].front[1];
 assert.equal(pina.uid,costly.uid);
 assert.equal(pina.ready,false);
 assert.equal(universalBp(packs,entered,pina),4000);
 const enemyTurn=structuredClone(entered);enemyTurn.active=1;
 assert.equal(universalBp(packs,enemyTurn,enemyTurn.players[0].front[1]),2000);
 assert.equal(assertUniversalMatch(packs,entered),true);
});

test('an outside alias is Pina, and a different printed name is not',()=>{
 const vanilla={color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}};
 const cards=[
  {...vanilla,id:'SILICA',name:'シリカ',energy:3,bp:3000,implementation:'dsl',
   effects:{onPlay:[{op:'deployOutsideNameRest',name:'ピナ',optional:true}]}},
  {...vanilla,id:'PINA',name:'ピナ',bp:2000},
  {...vanilla,id:'ALIAS',name:'別名義',nameAliases:['ピナ'],implementation:'dsl'},
  ...Array.from({length:10},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i,gen:1}))
 ];
 const lab=createUniversalPack({id:'lab-pina',cards});
 const labPacks=[lab,lab];
 const ids=cards.map(c=>c.id);
 const labCounts=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 let s=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:1044,first:0});
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(labPacks,s,legalUniversalActions(labPacks,s).find(a=>a.type==='next'));
 function pull(id){
  for(const zone of ['hand','deck','life','outside']){
   const i=s.players[0][zone].findIndex(c=>c.cardId===id);
   if(i>=0)return s.players[0][zone].splice(i,1)[0];
  }
  throw Error(id);
 }
 for(let slot=0;slot<3;slot++){
  const gen=pull('F'+slot);gen.ready=true;s.players[0].energy[slot]=gen;
 }
 const alias=pull('ALIAS');
 const printed=pull('PINA');
 s.players[0].outside.push(alias,printed);
 const silica=pull('SILICA');
 s.players[0].hand.push(silica);
 const play=legalUniversalActions(labPacks,s).find(a=>a.type==='play'&&a.uid===silica.uid&&
  a.line==='energy'&&!a.replaceUid);
 s=dispatchUniversalAction(labPacks,s,play);
 assert.equal(new Set(s.pending.choices).has(printed.uid),true);
 assert.equal(new Set(s.pending.choices).has(alias.uid),true);
 assert.equal(assertUniversalMatch(labPacks,s),true);
});
