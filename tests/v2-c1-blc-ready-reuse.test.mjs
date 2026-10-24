import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official pages read 2026-10-24. None contained an FAQ.
// UA08BT/BLC-1-058: 紫2 / AP1 / BP2500 / 零番隊 / 発生紫 / no trigger.
//   【起動メイン】【レストにする】自分の場の他のキャラを1枚選び、このターン中、BP+1000。
// UA08BT/BLC-1-088: 緑3 / AP1 / BP3500 / 護廷十三隊 / 発生緑 / ドロー.
//   【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）
// UA08ST/BLC-1-101: 紫2 / AP1 / BP3000 / no trait / 発生紫 / アクティブ.
//   【2回ブロック】 with the same parenthetical. Q80 (2023-03-17).
// EX15BT/BLC-4-073: 緑2 / AP1 / BP2500 / 護廷十三隊 / 発生緑 / no trigger.
//   【自分のターン中】自分の場に〈更木 剣八〉がある場合、このキャラはBP+1500。
// The same physical UID keeps its block count after it leaves and re-enters.
// No FAQ was found that resets that count.

const bleach=registeredV2TitlePack('bleach');
function deck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck(['BLC-1-058','BLC-1-088','BLC-1-101','BLC-4-073','BLC-2-066','BLC-1-001','BLC-1-008']);
const packs=[bleach,bleach];
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,...s.players[1].front,...s.players[1].energy]
  .find(c=>c?.uid===uid);
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,phase);
 return s;
}
function fresh(seed){
 return toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed,first:0}),'main');
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('the four reused BLEACH prints match the catalogue and the shared DSL',()=>{
 const expect={
  'BLC-1-058':{mainAbility:{op:'restSelfBuffOther',bp:1000},trigger:null,traits:['零番隊'],bp:2500},
  'BLC-1-088':{readyOnBlockCount:1,trigger:'draw',traits:['護廷十三隊'],bp:3500},
  'BLC-1-101':{readyOnBlockCount:1,trigger:'active',traits:[],bp:3000},
  'BLC-4-073':{bp:2500,trigger:null,traits:['護廷十三隊'],
   passiveBonuses:[{condition:{kind:'ownNameExists',turn:'own',zone:'field',
    excludeSelf:false,name:'更木 剣八'},bp:1500}]}
 };
 for(const [id,pin] of Object.entries(expect)){
  const source=CARDS.find(c=>c.identity===id);
  const card=bleach.cards[id];
  assert.equal(card.name,source.nameJa);
  assert.equal(card.energy,source.energy);
  assert.equal(card.gen,1);
  assert.deepEqual(card.effects,{});
  assert.equal(card.readyOnAttackCount,0);
  if(pin.mainAbility)assert.deepEqual(card.mainAbility,pin.mainAbility);
  if(pin.readyOnBlockCount)assert.equal(card.readyOnBlockCount,1);
  else assert.equal(card.readyOnBlockCount,0);
  if(pin.passiveBonuses)assert.deepEqual(card.passiveBonuses,pin.passiveBonuses);
  assert.equal(card.trigger,pin.trigger);
  assert.deepEqual(card.traits,pin.traits);
  assert.equal(card.bp,pin.bp);
  assert.ok(EXPECTED_V2_IDS.bleach.includes(id));
 }
 assert.equal(CARDS.find(c=>c.identity==='BLC-1-101').nameJa,'井上 織姫');
 assert.throws(()=>createUniversalPack({id:'bad-block',cards:[{
  id:'C',name:'C',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',readyOnBlockCount:2}]}),/invalid ready-on-block count/);
});

test('BLC-1-058 rests from either line and buffs one other own character',()=>{
 let s=fresh(1058);
 const source=place(s,0,'BLC-1-058','energy',0,true);
 const ally=place(s,0,'BLC-1-001','front',0);
 const other=place(s,0,'BLC-1-008','energy',1);
 const foe=place(s,1,'BLC-1-001','front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='selfRestBuff'),true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:source.uid,
  targetUid:source.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s.continuousStates=[];
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestBuff'});
 assert.equal(live(s,source.uid).ready,false);
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid));
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid));
 assert.equal(choices.some(a=>a.uid===source.uid||a.uid===foe.uid||a.uid===null),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,live(s,ally.uid)),3000);
 assert.equal(universalBp(packs,s,live(s,other.uid)),2500);
 assert.equal((s.turnRetireEvents||[]).length,0);
 live(s,source.uid).ready=true;
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'selfRestBuff'});
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,live(s,ally.uid)),4000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:ally.uid,
  targetUid:ally.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,live(s,ally.uid)),4000);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
 let alone=fresh(1059);
 const only=place(alone,0,'BLC-1-058','front',0,true);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.uid===only.uid&&a.type==='activate'),false);
 assert.throws(()=>dispatchUniversalAction(packs,alone,{type:'activate',uid:only.uid,mode:'selfRestBuff'}),/not currently legal/);
});

test('BLC-4-073 gains 1500 only on its own turn while 更木 剣八 is on its field',()=>{
 let s=fresh(1073);
 const ikkaku=place(s,0,'BLC-4-073','front',0,true);
 assert.equal(universalBp(packs,s,ikkaku),2500);
 const hand=take(s,0,'BLC-2-066');
 s.players[0].hand.push(hand);
 assert.equal(universalBp(packs,s,ikkaku),2500);
 const ken=place(s,0,'BLC-2-066','energy',0,true);
 assert.equal(bleach.cards[ken.cardId].name,'更木 剣八');
 assert.equal(universalBp(packs,s,live(s,ikkaku.uid)),4000);
 const foe=place(s,1,'BLC-2-066','front',0,true);
 assert.equal(universalBp(packs,s,live(s,ikkaku.uid)),4000);
 assert.equal(universalBp(packs,s,live(s,foe.uid)),2000);
 const saved=s.active;
 s.active=1;
 assert.equal(universalBp(packs,s,live(s,ikkaku.uid)),2500);
 s.active=saved;
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:foe.uid,
  targetUid:ikkaku.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,live(s,ikkaku.uid)),2500);
 assert.equal(countCards(s.players[0]),50);
 s.continuousStates=[];
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-1-088 and BLC-1-101 ready once per UID, and their life triggers stay generic',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:1088,first:0}),'attack');
 const a=place(s,1,'BLC-1-088','front',0,true);
 const b=place(s,1,'BLC-1-088','front',1,true);
 const small=place(s,0,'BLC-1-001','front',0,true);
 const mid=place(s,0,'BLC-1-008','front',1,true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:small.uid});
 assert.equal(s.pending.kind,'block');
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a.uid},{actor:1});
 assert.equal(live(s,a.uid).ready,true);
 assert.equal(s.blocksByUid[a.uid],1);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:mid.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:a.uid},{actor:1});
 assert.equal(live(s,a.uid).ready,false);
 assert.equal(s.blocksByUid[a.uid],2);
 assert.equal(s.blocksByUid[b.uid],undefined);

 let silenced=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:1089,first:0}),'attack');
 const blocker=place(silenced,1,'BLC-1-101','front',0,true);
 const striker=place(silenced,0,'BLC-2-066','front',0,true);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:0,sourceUid:striker.uid,
  targetUid:blocker.uid,sourceLinked:false,until:{player:1,phase:'attack',edge:'end'}});
 silenced=dispatchUniversalAction(packs,silenced,{type:'attack',uid:striker.uid});
 silenced=dispatchUniversalAction(packs,silenced,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(live(silenced,blocker.uid).ready,false);
 assert.equal(silenced.blocksByUid[blocker.uid],1);

 let life=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:1090,first:0}),'attack');
 const attacker=place(life,0,'BLC-2-066','front',0,true);
 const drawn=take(life,1,'BLC-1-088');
 life.players[1].life.unshift(drawn);
 const before=life.players[1].hand.length;
 life=dispatchUniversalAction(packs,life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(packs,life,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(life.pending.trigger,'draw');
 life=dispatchUniversalAction(packs,life,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(life.players[1].hand.length,before+1);
 assert.equal(universalPublicView(packs,life,0).players[1].hand,null);

 let active=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:1101,first:0}),'attack');
 const hit=place(active,0,'BLC-4-073','front',0,true);
 const ally=place(active,1,'BLC-2-066','front',0,false);
 const revealed=take(active,1,'BLC-1-101');
 active.players[1].life.unshift(revealed);
 active=dispatchUniversalAction(packs,active,{type:'attack',uid:hit.uid});
 active=dispatchUniversalAction(packs,active,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(active.pending.trigger,'active');
 aiOk(active);
 active=dispatchUniversalAction(packs,active,{type:'chooseTrigger',mode:'active',uid:ally.uid},{actor:1});
 assert.equal(live(active,ally.uid).ready,true);
 assert.equal(universalBp(packs,active,live(active,ally.uid)),5000);
 assert.equal(countCards(active.players[1]),50);
 assert.equal(assertUniversalMatch(packs,active),true);
});
