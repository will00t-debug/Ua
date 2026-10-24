import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX07BT/BLC-2-063 checked 2026-10-22:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-063
// 緑4 / AP1 / キャラ / BP2000 / 護廷十三隊 / 発生緑緑 / トリガーなし
// Keyword alt 【2回アタック】
// （このキャラがこのターン初めてアタックした時、アクティブにする）
// The card page has no FAQ. Timing is official Q79 (2023-03-17):
// designate the attacker, rest it, then set it ACTIVE.
// https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AD%E3%83%BC%E3%83%AF%E3%83%BC%E3%83%89%E5%8A%B9%E6%9E%9C&sub_category=2%E5%9B%9E%E3%82%A2%E3%82%BF%E3%83%83%E3%82%AF
// No FAQ was found that resets this count when the same physical card leaves
// and re-enters. The printed 「このキャラがこのターン」 keeps that UID's count.
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
const packs=[bleach,mst];
const ble=deck(bleach,['BLC-2-063','BLC-1-074'],'green');
const foreign=deck(mst,[],'green');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,phase);
 return s;
}
function advance(s){
 const legal=legalUniversalActions(packs,s);
 const next=legal.find(a=>a.type==='next');
 if(next)return dispatchUniversalAction(packs,s,next);
 const actor=s.pending?.player;
 const choice=legal.find(a=>a.type==='chooseHandLimit')
  ||legal.find(a=>a.type==='chooseTrigger'&&a.mode==='skip')
  ||legal.find(a=>a.type==='chooseBlock'&&a.uid===null)
  ||legal[0];
 return dispatchUniversalAction(packs,s,choice,actor===undefined?{}:{actor});
}
function settle(s){
 if(s.pending?.kind==='block')s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 while(['life-batch-order','life-trigger'].includes(s.pending?.kind)){
  const choice=s.pending.kind==='life-batch-order'?legalUniversalActions(packs,s)[0]:
   {type:'chooseTrigger',mode:'skip'};
  s=dispatchUniversalAction(packs,s,choice,{actor:1});
 }
 return s;
}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy].find(c=>c?.uid===uid);
}
function open(){
 let s=newUniversalMatch(packs,{decks:[ble,foreign],seed:2063,first:0});
 const first=take(s,0,'BLC-2-063'),second=take(s,0,'BLC-2-063');
 s.players[0].hand.push(first);
 second.ready=true;s.players[0].front[1]=second;
 for(let i=0;i<2;i++){const g=take(s,0,'BLC-1-074');g.ready=true;s.players[0].energy[i]=g;}
 s=toPhase(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===first.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,false,'a normal entry is rested');
 s=toPhase(s,'attack');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.uid===first.uid),false);
 const playedOn=s.turn;
 for(let n=0;n<16&&!(s.active===0&&s.phase==='attack'&&s.turn>playedOn);n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 assert.equal(live(s,first.uid).ready,true);
 return {s,first:first.uid,second:second.uid};
}

test('BLC-2-063 is the printed first-attack ACTIVE keyword',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-2-063'));
 const card=bleach.cards['BLC-2-063'];
 const printed=CARDS.find(c=>c.identity==='BLC-2-063');
 assert.equal(printed.nameJa,'京楽 春水');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits,card.readyOnAttackCount],
  ['green',4,1,2000,2,null,['護廷十三隊'],1]);
 assert.deepEqual(card.effects,{});
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-2-063');
 assert.equal(checkedBleachAddonDefinition(profile).readyOnAttackCount,1);
 assert.throws(()=>createUniversalPack({id:'bad-count',cards:[{
  id:'C',name:'C',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'vanilla',readyOnAttackCount:2}]}),/invalid ready-on-attack count/);
 assert.throws(()=>createUniversalPack({id:'bad-event',cards:[{
  id:'E',name:'E',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',readyOnAttackCount:1}]}),/invalid ready-on-attack count/);
});

test('each physical BLC-2-063 attacks twice, then a third attack is absent for the player and the AI',()=>{
 let {s,first,second}=open();
 const vanilla=take(s,0,'BLC-1-074');vanilla.ready=true;s.players[0].front[2]=vanilla;
 assert.equal(live(s,first).ready,true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first});
 assert.equal(s.pending?.kind,'block');
 assert.equal(live(s,first).ready,true,'Q79 sets ACTIVE after the attack rest and before battle');
 assert.equal(s.attacksByUid[first],1);
 assert.equal(s.attacksThisTurn,1);
 s=settle(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:second});
 assert.equal(live(s,second).ready,true);
 assert.equal(s.attacksByUid[second],1);
 assert.equal(s.attacksByUid[first],1);
 assert.equal(s.attacksThisTurn,2);
 s=settle(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:vanilla.uid});
 assert.equal(live(s,vanilla.uid).ready,false,'a character without the keyword stays rested');
 s=settle(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first});
 assert.equal(s.pending?.kind,'block');
 assert.equal(live(s,first).ready,false);
 assert.equal(s.attacksByUid[first],2);
 s=settle(s);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(a=>a.type==='attack'&&a.uid===first),false);
 assert.equal(legal.some(a=>a.type==='attack'&&a.uid===second),true);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  assert.notEqual(ai.uid,first);
 }
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:second});
 s=settle(s);
 assert.equal(s.attacksByUid[second],2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&(a.uid===first||a.uid===second)),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('the same physical card keeps its attack count after it leaves and re-enters, and the next turn clears it',()=>{
 let {s,first}=open();
 s=settle(dispatchUniversalAction(packs,s,{type:'attack',uid:first}));
 assert.equal(s.attacksByUid[first],1);
 const slot=s.players[0].front.findIndex(c=>c?.uid===first);
 const physical=s.players[0].front[slot];
 s.players[0].front[slot]=null;
 physical.ready=true;physical.buffs=[];
 physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[slot]=physical;
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first});
 assert.equal(live(s,first).ready,false,'re-entry does not make this the first attack of the turn');
 assert.equal(s.attacksByUid[first],2);
 s=settle(s);
 const seen=s.turn;
 for(let n=0;n<24&&!(s.active===0&&s.phase==='attack'&&s.turn>seen);n++)s=advance(s);
 assert.equal(s.active,0);
 assert.equal(s.phase,'attack');
 assert.deepEqual(s.attacksByUid,{});
 assert.equal(live(s,first).ready,true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first});
 assert.equal(live(s,first).ready,true);
 assert.equal(s.attacksByUid[first],1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('silence and skip-next-active both stop the printed ready',()=>{
 let {s,first}=open();
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:first,
  targetUid:first,until:{player:0,phase:'attack',edge:'end'},sourceLinked:false});
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first});
 assert.equal(live(s,first).ready,false);
 assert.equal(s.attacksByUid[first],1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'),false);
 s=settle(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.uid===first),false);
 let skipped=open();
 grantContinuousState(skipped.s,{kind:'skipNextActive',controller:0,sourceUid:skipped.first,
  targetUid:skipped.first,sourceLinked:false});
 skipped.s=dispatchUniversalAction(packs,skipped.s,{type:'attack',uid:skipped.first});
 assert.equal(live(skipped.s,skipped.first).ready,false);
 assert.equal(skipped.s.attacksByUid[skipped.first],1);
 assert.equal(assertUniversalMatch(packs,skipped.s),true);
});

test('a Raid top counts its own attacks and does not inherit the base',()=>{
 const filler=i=>({id:'F'+i,name:'F'+i,color:'green',type:'character',energy:0,ap:1,bp:1500,gen:1,implementation:'vanilla'});
 const cards=[
  {id:'BASE',name:'Base',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla'},
  {id:'RIDER',name:'Rider',color:'green',type:'character',energy:0,ap:1,bp:2500,gen:1,
   implementation:'dsl',raidName:'Base',readyOnAttackCount:1},
  ...Array.from({length:11},(_,i)=>filler(i))
 ];
 const pack=createUniversalPack({id:'ready-raid-fixture',cards});
 const pair=[pack,pack];
 const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 let s=newUniversalMatch(pair,{decks:[counts,counts],seed:2064,first:0});
 const pull=(p,id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error(id);
 };
 const base=pull(0,'BASE');base.ready=true;s.players[0].front[0]=base;
 const rider=pull(0,'RIDER');s.players[0].hand.push(rider);
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(pair,s,{type:'next'});
 const raid=legalUniversalActions(pair,s).find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(pair,s,raid);
 for(let n=0;n<4&&s.phase!=='attack';n++)s=dispatchUniversalAction(pair,s,{type:'next'});
 const top=s.players[0].front.find(c=>c?.cardId==='RIDER');
 assert.equal(top.stack[0].cardId,'BASE');
 assert.equal(s.attacksByUid[base.uid],undefined);
 s=dispatchUniversalAction(pair,s,{type:'attack',uid:top.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].front.find(c=>c?.uid===top.uid).ready,true);
 assert.equal(s.attacksByUid[top.uid],1);
 assert.equal(s.attacksByUid[base.uid],undefined);
 s=dispatchUniversalAction(pair,s,{type:'chooseBlock',uid:null},{actor:1});
 s=dispatchUniversalAction(pair,s,{type:'attack',uid:top.uid});
 assert.equal(s.players[0].front.find(c=>c?.uid===top.uid).ready,false);
 assert.equal(s.attacksByUid[top.uid],2);
 assert.equal(legalUniversalActions(pair,s).some(a=>a.type==='attack'&&a.uid===top.uid),false);
 assert.equal(assertUniversalMatch(pair,s),true);
});
