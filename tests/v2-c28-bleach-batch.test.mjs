import test from 'node:test';
import assert from 'node:assert/strict';
import contribution from '../dist/universal-v2/title-packs/bleach.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPrivateChoices,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS,EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// C28: four BLEACH prints. Official pages checked 2026-10-25. Cost icons are
// often stripped by the page fetch, so the catalogue brackets are used when
// the surviving official sentence matches the effect body.
// BLC-1-062 catalogue: 一個己方角色本回合 BP +1000，可回復 1 AP。
// Official: choose one own field character, BP+1000, then up to one AP card.
// BLC-4-028: Rest, once per turn, +1000 until the next own turn starts.
//   No front-only icon is printed. The site's 4000+ is the ability, not printed BP.
// BLC-4-037: on play, up to one opposing front at BP 1500 or higher, -1000.
//   Main pays 1 AP once and uses that same on-play effect.
// BLC-2-032 catalogue: 登場：查看己方牌堆頂 5 張，可公開其中最多 1 張原始 AP 消耗 2 以上的卡並加入手牌，其餘以任意順序放至牌堆底。
//   No discard. Q1037: 元々の消費AP is printed AP.
// This is not per-card FAQ acceptance.

const IDS=['BLC-1-062','BLC-4-028','BLC-4-037','BLC-2-032'];
const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
function deck(){
 const fours=['BLC-4-052','BLC-2-041','BLC-1-001','BLC-1-008','BLC-1-010','BLC-2-010','BLC-2-004','BLC-2-032','BLC-4-046','BLC-1-106','BLC-4-076'];
 const twos=['BLC-1-062','BLC-4-028','BLC-4-037'];
 const counts=Object.fromEntries([...fours.map(id=>[id,4]),...twos.map(id=>[id,2])]);
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','outside','removed']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 const i=pl.life.findIndex(c=>c.cardId===id);
 if(i<0)throw Error('Missing '+id);
 const card=pl.life[i];
 const replacement=pl.deck.pop();
 if(!replacement)throw Error('No deck card to keep life full');
 pl.life[i]=replacement;
 return card;
}
function occupy(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function toMain(s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function fresh(seed=2801){
 return toMain(newUniversalMatch(packs,{decks:[counts,counts],seed,first:0}));
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1+(c.stack||[]).length+(c.under||[]).length;
 return n;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function play(s,uid,line){
 const action=legalUniversalActions(packs,s).find(a=>
  (a.type==='play'||a.type==='event')&&a.uid===uid&&
  (line===undefined||a.line===line)&&a.replaceUid===undefined);
 assert.ok(action,'legal play '+uid);
 return dispatchUniversalAction(packs,s,action);
}
function at(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy,...s.players[p].outside,
  ...s.players[p].hand].find(c=>c?.uid===uid);
}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,until:{player:0,phase:'attack',edge:'end'},sourceLinked:false});
}
function go(s,player,phase){
 for(let i=0;i<16&&!(s.active===player&&s.phase===phase);i++){
  assert.equal(s.pending,null);
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 assert.equal(s.active,player);
 assert.equal(s.phase,phase);
 return s;
}
function orderBottom(s){
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function activates(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);
}

test('C28 registers four whole prints on the independent manifest',()=>{
 assert.equal(EXPECTED_V2_COUNTS.bleach,180);
 assert.equal(EXPECTED_V2_TOTAL,432);
 assert.equal(Object.keys(bleach.cards).length,180);
 for(const id of IDS){
  const entry=contribution.entries.find(x=>x.id===id);
  assert.ok(entry,id);
  assert.equal(entry.evidence.printedTextFragments[0],entry.sourceRecord.effect);
  assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
  assert.equal(bleach.cards[id].name,entry.sourceRecord.nameJa);
 }
 const bread=bleach.cards['BLC-1-062'];
 assert.equal(bread.type,'event');
 assert.equal(bread.effects.onPlay[0].optional,false);
 assert.equal(bread.effects.onPlay[1].op,'recoverAp');
 assert.equal(bread.triggerEffect,null);
 const sado=bleach.cards['BLC-4-028'];
 assert.equal(sado.mainAbility.frontOnly,false);
 assert.equal(sado.mainAbility.oncePerTurn,true);
 assert.equal(sado.mainAbility.then[0].op,'buffSelfUntilNextOwnStart');
 assert.equal(sado.bp,4000);
 const nel=bleach.cards['BLC-4-037'];
 assert.equal(nel.effects.onPlay[0].minBp,1500);
 assert.equal(nel.mainAbility.then[0].minBp,1500);
 assert.equal(nel.mainAbility.payAp,1);
 assert.deepEqual(nel.traits,['破面']);
 assert.equal(bleach.cards['BLC-2-032'].effects.onPlay[0].filters[0].value,2);
 assert.equal(bleach.cards['BLC-1-106'].ap,2);
});

test('BLC-1-062 must buff one own character, then may ready one rested AP card',()=>{
 let s=fresh();
 const ally=occupy(s,0,'BLC-4-052','energy',0);
 occupy(s,0,'BLC-4-052','energy',1);
 const field=occupy(s,0,'BLC-4-076','energy',2);
 const event=toHand(s,0,'BLC-1-062');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 let blocked=fresh(2802);
 toHand(blocked,0,'BLC-1-062');
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'),false);
 s=play(s,event.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(field.uid),false);
 aiOk(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:null}));
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,at(s,0,ally.uid)),2500);
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
 assert.equal(rested.length,1);
 s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:null});
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 let again=fresh(2803);
 const other=occupy(again,0,'BLC-4-052','energy',0);
 occupy(again,0,'BLC-4-052','energy',1);
 const loaf=toHand(again,0,'BLC-1-062');
 again=play(again,loaf.uid);
 again=dispatchUniversalAction(packs,again,{type:'chooseOwnBuff',uid:other.uid});
 const ap=again.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 again=dispatchUniversalAction(packs,again,{type:'chooseApRecovery',uid:ap.uid});
 assert.equal(again.players[0].apCards.find(c=>c.uid===ap.uid).ready,true);
 assert.equal(countCards(again.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(again)),true);
});

test('BLC-4-028 rests from either line once and keeps 1000 until the next own turn',()=>{
 let s=fresh(2804);
 const self=occupy(s,0,'BLC-4-028','front',0);
 assert.equal(universalBp(packs,s,self),4000);
 assert.equal(activates(s,self.uid),true);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:self.uid,mode:'selfRestThen'});
 assert.equal(at(s,0,self.uid).ready,false);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),5000);
 at(s,0,self.uid).ready=true;
 assert.equal(activates(s,self.uid),false);
 s=go(s,1,'main');
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),5000);
 s=go(s,0,'main');
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),4000);
 let energy=fresh(2805);
 const parked=occupy(energy,0,'BLC-4-028','energy',0);
 energy=dispatchUniversalAction(packs,energy,{type:'activate',uid:parked.uid,mode:'selfRestThen'});
 assert.equal(at(energy,0,parked.uid).ready,false);
 assert.equal(universalBp(packs,energy,at(energy,0,parked.uid)),5000);
 let asleep=fresh(2806);
 const rested=occupy(asleep,0,'BLC-4-028','front',0,false);
 assert.equal(activates(asleep,rested.uid),false);
 let quiet=fresh(2807);
 const muted=occupy(quiet,0,'BLC-4-028','front',0);
 silence(quiet,muted.uid);
 assert.equal(activates(quiet,muted.uid),false);
 assert.equal(countCards(s.players[0]),50);
});

test('BLC-4-037 lowers one front at BP 1500 or higher, and the main pays 1 AP to do it again',()=>{
 let played=fresh(2808);
 occupy(played,0,'BLC-2-041','energy',0);
 occupy(played,0,'BLC-2-041','energy',1);
 occupy(played,0,'BLC-2-041','energy',2);
 const nel=toHand(played,0,'BLC-4-037');
 const floor=occupy(played,1,'BLC-4-052','front',0);
 const small=occupy(played,1,'BLC-4-046','front',1);
 const hidden=occupy(played,1,'BLC-1-001','energy',0);
 played=play(played,nel.uid,'front');
 assert.equal(played.pending.kind,'effect-target');
 assert.equal(played.pending.optional,true);
 assert.deepEqual(played.pending.choices,[floor.uid]);
 assert.equal(played.pending.choices.includes(small.uid),false);
 assert.equal(played.pending.choices.includes(hidden.uid),false);
 played=dispatchUniversalAction(packs,played,{type:'chooseTarget',uid:floor.uid});
 assert.equal(universalBp(packs,played,at(played,1,floor.uid)),500);

 let main=fresh(2809);
 const actor=occupy(main,0,'BLC-4-037','energy',0);
 const exact=occupy(main,1,'BLC-4-052','front',0);
 const low=occupy(main,1,'BLC-4-046','front',1);
 assert.equal(universalBp(packs,main,exact),1500);
 assert.equal(activates(main,actor.uid),true);
 main=dispatchUniversalAction(packs,main,{type:'activate',uid:actor.uid,mode:'oncePay'});
 assert.equal(main.pending.choices.includes(exact.uid),true);
 assert.equal(main.pending.choices.includes(low.uid),false);
 aiOk(main);
 main=dispatchUniversalAction(packs,main,{type:'chooseTarget',uid:null});
 assert.equal(universalBp(packs,main,at(main,1,exact.uid)),1500);
 assert.equal(main.mainAbilityUsedUids.includes(actor.uid),true);
 assert.equal(activates(main,actor.uid),false);
 let bare=fresh(2810);
 const waiting=occupy(bare,0,'BLC-4-037','front',0);
 occupy(bare,1,'BLC-4-046','front',0);
 assert.equal(activates(bare,waiting.uid),false);
 bare.players[0].apCards.forEach(c=>{if(c.inPlay)c.ready=false;});
 occupy(bare,1,'BLC-4-052','front',1);
 assert.equal(activates(bare,waiting.uid),false);
 assert.equal(countCards(played.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(main)),true);
});

test('BLC-2-032 adds at most one printed-AP-2 card from the top five and bottoms the rest',()=>{
 let s=fresh(2811);
 occupy(s,0,'BLC-2-041','energy',0);
 occupy(s,0,'BLC-2-041','energy',1);
 const actor=toHand(s,0,'BLC-2-032');
 const window=setTop(s,0,['BLC-1-001','BLC-1-106','BLC-1-008','BLC-1-010','BLC-2-004']);
 const high=window.find(c=>c.cardId==='BLC-1-106');
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 assert.deepEqual(s.pending.choices,[high.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.ok(universalPrivateChoices(packs,s,0).options.some(o=>
  o.action?.uid===high.uid&&o.card?.cardId==='BLC-1-106'));
 aiOk(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFilteredMany',uid:window[0].uid}));
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFilteredMany',uid:high.uid});
 assert.equal(s.publicReveals.some(r=>r.cardId==='BLC-1-106'&&r.uid===high.uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 s=orderBottom(s);
 assert.equal(s.players[0].hand.some(c=>c.uid===high.uid),true);
 for(const card of window)if(card.uid!==high.uid)
  assert.equal(s.players[0].deck.some(c=>c.uid===card.uid),true);
 assert.equal(s.players[0].hand.filter(c=>window.some(w=>w.uid===c.uid)).length,1);

 let skipped=fresh(2812);
 occupy(skipped,0,'BLC-2-041','energy',0);
 occupy(skipped,0,'BLC-2-041','energy',1);
 const rukia=toHand(skipped,0,'BLC-2-032');
 const hidden=setTop(skipped,0,['BLC-1-106','BLC-1-001','BLC-1-008','BLC-1-010','BLC-2-010']);
 const before=skipped.players[0].hand.length;
 skipped=play(skipped,rukia.uid);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseTopFilteredMany',uid:null});
 skipped=orderBottom(skipped);
 assert.equal(skipped.players[0].hand.length,before-1);
 for(const card of hidden)assert.equal(skipped.players[0].deck.some(c=>c.uid===card.uid),true);
 assert.equal(countCards(skipped.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(skipped)),true);
});
