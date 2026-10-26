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

// C29: three BLEACH prints. Official pages checked 2026-10-25.
// BLC-1-078 catalogue says 角色. The official sentence chooses one own field
// card with 護廷十三隊, so a field with that trait is legal. The site's 3000+
// is the attack bonus. The attack icon was stripped; the catalogue keeps it.
// BLC-2-072 deploys one green character of energy 2 or less and AP 1, REST,
// only while Hitsugaya is on the field. The on-play icon was stripped.
// BLC-4-064 takes one green event or green field from the top three.
// This is not per-card FAQ acceptance.

const IDS=['BLC-1-078','BLC-2-072','BLC-4-064'];
const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
function deck(){
 const fours=['BLC-2-069','BLC-1-091','BLC-3-007','BLC-1-080','BLC-2-041','BLC-1-001','BLC-1-098','BLC-4-076','BLC-2-047','BLC-1-008','BLC-1-010'];
 const twos=['BLC-1-078','BLC-2-072','BLC-4-064'];
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
function fresh(seed=2901){
 return toMain(newUniversalMatch(packs,{decks:[counts,counts],seed,first:0}));
}
function atMove(seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'move');
 return s;
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
  ...s.players[p].hand,...s.players[p].deck].find(c=>c?.uid===uid);
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

test('C29 registers three whole prints on the independent manifest',()=>{
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
 const sajin=bleach.cards['BLC-1-078'];
 assert.equal(sajin.step,true);
 assert.equal(sajin.bp,3000);
 assert.equal(sajin.effects.onAttack[0].op,'buffOwnTrait');
 assert.equal(sajin.effects.onAttack[0].bp,500);
 assert.deepEqual(sajin.traits,['護廷十三隊']);
 assert.equal(sajin.triggerEffect,null);
 const rangiku=bleach.cards['BLC-2-072'];
 assert.equal(rangiku.effects.onPlay[0].when.name,'日番谷 冬獅郎');
 assert.equal(rangiku.effects.onPlay[0].energy,2);
 const nanao=bleach.cards['BLC-4-064'];
 assert.deepEqual(nanao.effects.onPlay[0].filters.map(f=>f.value),['green:event','green:field']);
 assert.equal(nanao.trigger,null);
});

test('BLC-1-078 steps to energy and buffs one Gotei card on attack',()=>{
 let s=fresh(2901);
 const self=occupy(s,0,'BLC-1-078','front',0);
 const squad=occupy(s,0,'BLC-1-091','energy',0);
 const exact=occupy(s,0,'BLC-3-007','front',1);
 const yard=occupy(s,0,'BLC-4-076','energy',1);
 const stranger=occupy(s,1,'BLC-1-001','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 s=go(s,0,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'effect-buff-trait');
 assert.equal(s.pending.choices.includes(self.uid),true);
 assert.equal(s.pending.choices.includes(squad.uid),true);
 assert.equal(s.pending.choices.includes(exact.uid),true);
 assert.equal(s.pending.choices.includes(yard.uid),false);
 assert.equal(s.pending.choices.includes(stranger.uid),false);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseTraitBuff',uid:squad.uid});
 assert.equal(universalBp(packs,s,at(s,0,squad.uid)),2500);
 assert.equal(universalBp(packs,s,at(s,0,self.uid)),3000);
 assert.equal(s.pending.kind,'block');

 let skipped=fresh(2902);
 const quiet=occupy(skipped,0,'BLC-1-078','front',0);
 occupy(skipped,0,'BLC-1-091','front',1);
 skipped=go(skipped,0,'attack');
 skipped=dispatchUniversalAction(packs,skipped,{type:'attack',uid:quiet.uid});
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseTraitBuff',uid:null});
 assert.equal(universalBp(packs,skipped,at(skipped,0,quiet.uid)),3000);
 assert.equal(skipped.pending.kind,'block');

 let muted=fresh(2903);
 const silenced=occupy(muted,0,'BLC-1-078','front',0);
 silence(muted,silenced.uid);
 muted=go(muted,0,'attack');
 muted=dispatchUniversalAction(packs,muted,{type:'attack',uid:silenced.uid});
 assert.equal(muted.pending?.kind,'block');

 let parked=fresh(2904);
 const energy=occupy(parked,0,'BLC-1-078','energy',0);
 parked=go(parked,0,'attack');
 assert.equal(legalUniversalActions(packs,parked).some(a=>a.type==='attack'&&a.uid===energy.uid),false);

 let moving=atMove(2905);
 const walker=occupy(moving,0,'BLC-1-078','front',0);
 const step=legalUniversalActions(packs,moving).find(a=>a.type==='step'&&a.uid===walker.uid);
 assert.ok(step);
 moving=dispatchUniversalAction(packs,moving,step);
 assert.equal(moving.players[0].energy.some(c=>c?.uid===walker.uid),true);
 assert.equal(moving.players[0].front.some(c=>c?.uid===walker.uid),false);
 let stuck=atMove(2906);
 const held=occupy(stuck,0,'BLC-1-078','front',0);
 silence(stuck,held.uid);
 assert.equal(legalUniversalActions(packs,stuck).some(a=>a.type==='step'&&a.uid===held.uid),false);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

test('BLC-2-072 rests one cheap green character only while Hitsugaya is on the field',()=>{
 let s=fresh(2907);
 occupy(s,0,'BLC-2-069','energy',0);
 occupy(s,0,'BLC-1-091','energy',1);
 occupy(s,0,'BLC-3-007','energy',2);
 const actor=toHand(s,0,'BLC-2-072');
 const cheap=toHand(s,0,'BLC-1-091');
 const cap=toHand(s,0,'BLC-3-007');
 const heavy=toHand(s,0,'BLC-1-080');
 const blue=toHand(s,0,'BLC-2-041');
 const yard=toHand(s,0,'BLC-4-076');
 s=play(s,actor.uid,'front');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(cheap.uid),true);
 assert.equal(s.pending.choices.includes(cap.uid),true);
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 assert.equal(s.pending.choices.includes(blue.uid),false);
 assert.equal(s.pending.choices.includes(yard.uid),false);
 aiOk(s);
 const enter=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandRest'&&a.uid===cheap.uid&&a.line==='energy');
 assert.ok(enter);
 assert.throws(()=>dispatchUniversalAction(packs,structuredClone(s),{type:'chooseHandRest',uid:heavy.uid,line:'front',slot:0}));
 s=dispatchUniversalAction(packs,s,enter);
 assert.equal(at(s,0,cheap.uid).ready,false);
 assert.equal(s.players[0].energy.some(c=>c?.uid===cheap.uid),true);

 let skipped=fresh(2909);
 occupy(skipped,0,'BLC-2-069','energy',0);
 occupy(skipped,0,'BLC-1-080','energy',1);
 occupy(skipped,0,'BLC-3-007','energy',2);
 const rangiku=toHand(skipped,0,'BLC-2-072');
 const held=toHand(skipped,0,'BLC-1-091');
 skipped=play(skipped,rangiku.uid,'front');
 assert.equal(skipped.pending.kind,'effect-hand-rest');
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseHandRest',uid:null});
 assert.equal(skipped.players[0].hand.some(c=>c.uid===held.uid),true);
 assert.equal(skipped.pending,null);

 let closed=fresh(2910);
 occupy(closed,0,'BLC-1-091','energy',0);
 occupy(closed,0,'BLC-3-007','energy',1);
 occupy(closed,0,'BLC-1-080','energy',2);
 const alone=toHand(closed,0,'BLC-2-072');
 toHand(closed,0,'BLC-1-091');
 toHand(closed,0,'BLC-2-069');
 closed=play(closed,alone.uid,'front');
 assert.equal(closed.pending,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(skipped)),true);
});

test('BLC-4-064 adds one green event or green field from the top three, then discards',()=>{
 let s=fresh(2911);
 const actor=toHand(s,0,'BLC-4-064');
 const window=setTop(s,0,['BLC-1-091','BLC-1-098','BLC-2-047']);
 const event=window.find(c=>c.cardId==='BLC-1-098');
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[event.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.ok(universalPrivateChoices(packs,s,0).options.some(o=>
  o.action?.uid===event.uid&&o.card?.cardId==='BLC-1-098'));
 aiOk(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[0].uid}));
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:event.uid});
 assert.equal(s.publicReveals.some(r=>r.uid===event.uid&&r.cardId==='BLC-1-098'),true);
 s=orderBottom(s);
 assert.equal(s.pending.kind,'effect-discard');
 const dump=s.players[0].hand.find(c=>c.uid!==event.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:dump.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===dump.uid),true);
 for(const card of window)if(card.uid!==event.uid)
  assert.equal(s.players[0].deck.some(c=>c.uid===card.uid),true);

 let field=fresh(2912);
 const nanao=toHand(field,0,'BLC-4-064');
 const yard=setTop(field,0,['BLC-4-076','BLC-1-091','BLC-1-001']);
 const flower=yard.find(c=>c.cardId==='BLC-4-076');
 field=play(field,nanao.uid);
 assert.deepEqual(field.pending.choices,[flower.uid]);
 field=dispatchUniversalAction(packs,field,{type:'chooseTopFiltered',uid:null});
 field=orderBottom(field);
 assert.equal(field.pending,null);
 for(const card of yard)assert.equal(field.players[0].deck.some(c=>c.uid===card.uid),true);
 assert.equal(countCards(field.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(field)),true);
});
