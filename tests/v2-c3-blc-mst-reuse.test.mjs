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
import {c3BlcMstReuse} from '../scripts/v2-c3-blc-mst-reuse.mjs';

// EX15BT/BLC-4-029 official page, 2026-10-24. No FAQ.
// 青1 / AP1 / BP2000 / no trait / 発生青 / ACTIVE.
// このキャラはBP2000以下のキャラにブロックされない。
// EX15BT/BLC-4-031 official page, 2026-10-24. No FAQ.
// 青1 / AP1 / BP2000 / no trait / 発生青 / no trigger.
// 【登場時】このキャラが自分の効果で登場していた場合、カードを1枚引く。
// Paid play and COLOR life are not an own-effect entry. The same gate is MST-1-023.

const bleach=registeredV2TitlePack('bleach');
function deck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck(['BLC-4-029','BLC-4-031','BLC-1-001','BLC-1-008']);
const packs=[bleach,bleach];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,phase);return s;
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}
function aiOk(s,use=packs){
 const legal=legalUniversalActions(use,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(use,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('C3 registers the two whole-print BLEACH reuses and leaves MST priority blocked',()=>{
 const x=c3BlcMstReuse();
 assert.deepEqual(x.registered,['BLC-4-029','BLC-4-031']);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.mst,57);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.readyFromKeywords,0);
 assert.deepEqual(x.mstBlocked.map(c=>c.id),['MST-1-021','MST-1-033']);
 for(const id of x.registered)assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
});

test('BLC-4-029 and BLC-4-031 match the catalogue and the shared DSL',()=>{
 const low=CARDS.find(c=>c.identity==='BLC-4-029');
 const draw=CARDS.find(c=>c.identity==='BLC-4-031');
 assert.equal(low.effect,'此角色不會被BP2000以下的角色阻擋。');
 assert.equal(draw.effect,'登場時：若此角色是以自己的效果登場，抽1張牌。');
 assert.deepEqual(bleach.cards['BLC-4-029'].blockBpRestriction,
  {relation:'atMost',bp:2000,condition:null});
 assert.equal(bleach.cards['BLC-4-029'].trigger,'active');
 assert.deepEqual(bleach.cards['BLC-4-029'].effects,{});
 assert.deepEqual(bleach.cards['BLC-4-031'].effects,
  {onPlay:[{op:'draw',count:1,entry:'ownEffect'}]});
 assert.equal(bleach.cards['BLC-4-031'].trigger,null);
 assert.equal(bleach.cards['BLC-1-001'].bp,2000);
 assert.ok(bleach.cards['BLC-1-008'].bp>2000);
});

test('BLC-4-029 rejects a BP2000 block, allows a higher block, and loses the rule when silenced',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4029,first:0}),'attack');
 const actor=place(s,0,'BLC-4-029','front',0,true);
 const small=place(s,1,'BLC-1-001','front',0,true);
 const large=place(s,1,'BLC-1-008','front',1,true);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 assert.equal(s.pending.kind,'block');
 let choices=legalUniversalActions(packs,s);
 assert.equal(choices.some(a=>a.type==='chooseBlock'&&a.uid===small.uid),false);
 assert.ok(choices.some(a=>a.type==='chooseBlock'&&a.uid===large.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:small.uid}));
 aiOk(s);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:large.uid,
  targetUid:actor.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.type==='chooseBlock'&&a.uid===small.uid));
 s.continuousStates=[];
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:large.uid});
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-4-029 ACTIVE life readies one own character and adds 3000 BP this turn',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:40291,first:0}),'main');
 const actor=place(s,0,'BLC-1-008','front',0,true);
 const ally=place(s,1,'BLC-1-001','front',0,false);
 const revealed=take(s,1,'BLC-4-029');
 const buried=s.players[1].life.shift();
 s.players[1].deck.push(buried);
 s.players[1].life.unshift(revealed);
 s=toPhase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'active');
 const action=legalUniversalActions(packs,s).find(a=>a.mode==='active'&&a.uid===ally.uid);
 assert.ok(action);
 aiOk(s);
 const before=universalBp(packs,s,ally);
 s=dispatchUniversalAction(packs,s,action);
 const live=s.players[1].front.find(c=>c?.uid===ally.uid);
 assert.equal(live.ready,true);
 assert.equal(universalBp(packs,s,live),before+3000);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-4-031 draws only after an own-effect entry, not a paid play or COLOR life',()=>{
 const payCounts=deck(['BLC-4-031','BLC-4-023','BLC-1-001','BLC-1-008']);
 let paid=toPhase(newUniversalMatch(packs,{decks:[payCounts,payCounts],seed:4031,first:0}),'main');
 place(paid,0,'BLC-4-023','energy',0,true);
 const card=take(paid,0,'BLC-4-031');
 paid.players[0].hand.push(card);
 const deckBefore=paid.players[0].deck.length,handBefore=paid.players[0].hand.length;
 const play=legalUniversalActions(packs,paid).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.ok(play);
 paid=dispatchUniversalAction(packs,paid,play);
 assert.equal(paid.players[0].front.find(c=>c?.uid===card.uid).ready,false);
 assert.equal(paid.players[0].deck.length,deckBefore);
 assert.equal(paid.players[0].hand.length,handBefore-1);
 assert.equal(countCards(paid.players[0]),50);

 const event={id:'LAB-DEPLOY-YORU',name:'Deploy Yoruichi',color:'blue',type:'event',
  energy:0,ap:1,bp:0,gen:0,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'deployOutsideNameRest',name:'四楓院 夜一',optional:true}]}};
 const color={id:'LAB-COLOR-BLUE',name:'Blue Color',color:'blue',type:'character',
  energy:0,ap:1,bp:1000,gen:1,trigger:'color',implementation:'vanilla',traits:[],effects:{},
  triggerEffect:{op:'deployHandCharacter',color:'blue',maxEnergy:2,ap:1}};
 const yoru={id:'BLC-4-031',name:'四楓院 夜一',color:'blue',type:'character',
  energy:1,ap:1,bp:2000,gen:1,trigger:null,implementation:'dsl',traits:[],
  effects:{onPlay:[{op:'draw',count:1,entry:'ownEffect'}]}};
 const fillers=Array.from({length:10},(_,i)=>({id:'LAB-FILL-'+i,name:'Fill '+i,
  color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,trigger:null,
  implementation:'vanilla',traits:[],effects:{}}));
 const mixed=createUniversalPack({id:'c3-own-effect',cards:[yoru,event,color,...fillers]});
 const both=[mixed,mixed];
 const mixDeck=(()=>{
  const required=['BLC-4-031','LAB-COLOR-BLUE','LAB-DEPLOY-YORU'];
  const rest=Object.values(mixed.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
   !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
  const ids=[...required,...rest.slice(0,10)];
  const out=Object.fromEntries(ids.map(id=>[id,4]));
  out[ids.at(-1)]=2;
  assert.equal(Object.values(out).reduce((n,v)=>n+v,0),50);
  assert.deepEqual(validateUniversalDeck(mixed,out),[]);
  return out;
 })();
 let own=newUniversalMatch(both,{decks:[mixDeck,mixDeck],seed:4032,first:0});
 const outside=take(own,0,'BLC-4-031');
 own.players[0].outside.push(outside);
 const played=take(own,0,'LAB-DEPLOY-YORU');
 own.players[0].hand.push(played);
 for(let n=0;n<4&&own.phase!=='main';n++)
  own=dispatchUniversalAction(both,own,{type:'next'});
 const beforeDeck=own.players[0].deck.length;
 own=dispatchUniversalAction(both,own,{type:'event',uid:played.uid});
 assert.equal(own.pending.kind,'effect-outside-name-rest');
 aiOk(own,both);
 const choice=legalUniversalActions(both,own).find(a=>a.type==='chooseOutsideNameRest'&&a.uid===outside.uid&&a.line==='energy');
 assert.ok(choice);
 own=dispatchUniversalAction(both,own,choice);
 assert.equal(own.players[0].energy.find(c=>c?.uid===outside.uid).ready,false);
 assert.equal(own.players[0].deck.length,beforeDeck-1);
 assert.equal(countCards(own.players[0]),50);
 assert.equal(universalPublicView(both,own,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(both,structuredClone(own)),true);

 let life=newUniversalMatch(both,{decks:[mixDeck,mixDeck],seed:4033,first:1});
 const attacker=take(life,1,'LAB-FILL-0');
 attacker.ready=true;attacker.fieldEntryStamp=life.nextFieldEntryStamp++;
 life.players[1].front[0]=attacker;
 const entrant=take(life,0,'BLC-4-031');
 life.players[0].hand.push(entrant);
 const revealed=take(life,0,'LAB-COLOR-BLUE');
 const old=life.players[0].life.shift();
 life.players[0].deck.push(old);
 life.players[0].life.unshift(revealed);
 for(let n=0;n<6&&life.phase!=='attack';n++)
  life=dispatchUniversalAction(both,life,{type:'next'});
 life=dispatchUniversalAction(both,life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(both,life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'color');
 const deckLife=life.players[0].deck.length,handLife=life.players[0].hand.length;
 const colorPlay=legalUniversalActions(both,life).find(a=>a.mode==='color'&&a.uid===entrant.uid&&a.line==='front');
 assert.ok(colorPlay);
 life=dispatchUniversalAction(both,life,colorPlay);
 assert.equal(life.players[0].front.find(c=>c?.uid===entrant.uid).ready,true);
 assert.equal(life.players[0].deck.length,deckLife);
 assert.equal(life.players[0].hand.length,handLife-1);
 assert.equal(countCards(life.players[0]),50);
 assert.equal(assertUniversalMatch(both,structuredClone(life)),true);
});
