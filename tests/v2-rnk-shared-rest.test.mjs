import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_PROMO_CARD} from '../dist/rnk/promo-card.mjs';
import {RNK_JP_EVIDENCE_SHARED_REST} from '../dist/rnk/jp-evidence-shared-rest.mjs';
import {RNK_PROGRAMS_SHARED_REST} from '../dist/universal-v2/rnk/programs-shared-rest.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalCardEnergy,universalPrivateChoices,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const IDS=['RNK-1-010','RNK-1-011','RNK-1-018','RNK-1-033','RNK-1-038','RNK-1-040','RNK-1-044','RNK-1-050','RNK-1-054','RNK-1-056','RNK-1-059','RNK-1-071','RNK-1-076','RNK-1-077','RNK-1-089','RNK-1-099','RNK-1-103','RNK-1-111','RNK-P-001'];
const source=Object.fromEntries([...RNK_TC_CATALOG,RNK_PROMO_CARD].map(c=>[c.id,c]));
const pack=createRnkBcdBatchStagingPack();
const packs=[pack,pack];
function deck(){
 const counts={
  'RNK-1-004':4,'RNK-1-035':4,'RNK-1-037':4,'RNK-1-076':4,
  'RNK-1-002':2,'RNK-1-105':1,'RNK-1-014':2,'RNK-1-015':2,'RNK-1-053':2,'RNK-1-027':2,
  'RNK-1-091':2,'RNK-1-096':1,'RNK-1-098':1,'RNK-1-043':1
 };
 for(const id of IDS)if(!counts[id])counts[id]=1;
 assert.equal(Object.values(counts).reduce((s,n)=>s+n,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
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
function seat(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);
 c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;c.entryTurn=s.turn;
 s.players[p][line][slot]=c;return c;
}
function toMain(s){
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
function fresh(seed=31){
 const s=toMain(newUniversalMatch(pack,{decks:[counts,counts],seed,first:0,openingMulligan:false}));
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 return s;
}
function fuel(s,id,slots){for(let i=0;i<slots;i++)seat(s,0,id,'energy',i);return s;}
function play(s,id,line,slot){
 const c=take(s,0,id);s.players[0].hand.push(c);
 const type=pack.cards[id].type==='event'?'event':'play';
 return dispatchUniversalAction(packs,s,type==='event'?{type,uid:c.uid}:{type,uid:c.uid,line,slot});
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty+' '+JSON.stringify(ai));
 }
}
function act(s,pred){
 const legal=legalUniversalActions(packs,s);
 const a=legal.find(pred);
 assert.ok(a,JSON.stringify(legal.slice(0,8)));
 return dispatchUniversalAction(packs,s,a);
}
function findUid(s,id){
 for(const p of s.players)for(const line of ['front','energy'])
  for(const c of p[line])if(c?.cardId===id)return c;
 return null;
}

test('the last nineteen identities stage on the shared engine',()=>{
 assert.equal(RNK_BATCH_STAGING_IDS.length,114);
 assert.equal(IDS.length,19);
 for(const id of IDS){
  const jp=RNK_JP_EVIDENCE_SHARED_REST[id],tc=source[id],v2=pack.cards[id];
  assert.equal(jp.print,tc.number);
  assert.equal(v2.name,jp.nameJa);
  assert.equal(v2.energy,tc.energy);
  assert.equal(tc.battleReady,false);
  assert.equal(RNK_IDENTITY_INVENTORY.find(c=>c.id===id).effectImplemented,false);
  assert.ok(jp.sourceJa.startsWith('https://www.unionarena-tcg.com/jp/cardlist/'));
  assert.equal(RNK_PROGRAMS_SHARED_REST[id].ready,true);
 }
 assert.equal(pack.cards['RNK-1-010'].triggerEffect.bp,3500);
 assert.equal(pack.cards['RNK-1-054'].raidName,'沢下条 張');
 assert.equal(pack.cards['RNK-P-001'].allColors,true);
 assert.equal(source['RNK-1-103'].set,'UA41ST');
 assert.equal(source['RNK-1-111'].set,'UA41ST');
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});

test('010 puts the named outside card under the deck, then moves to the front',()=>{
 let s=fresh();
 const self=seat(s,0,'RNK-1-010','energy',0,true);
 const will=take(s,0,'RNK-1-027');s.players[0].outside.push(will);
 s=act(s,a=>a.type==='activate'&&a.mode==='restBottom'&&a.uid===self.uid);
 s=act(s,a=>a.type==='chooseOutsideBottom'&&a.uid===will.uid);
 const moved=s.players[0].front.find(c=>c?.uid===self.uid);
 assert.ok(moved);
 assert.equal(s.players[0].deck.at(-1).cardId,'RNK-1-027');
 assert.equal(universalBp(packs,s,moved),4000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('011 double-attacks only at 6000 BP and draws when the hand is small',()=>{
 let high=fresh();
 fuel(high,'RNK-1-004',3);
 high=play(high,'RNK-1-011','front',0);
 const attacker=findUid(high,'RNK-1-011');
 attacker.ready=true;
 attacker.buffs=[{bp:2000,untilTurn:high.turn}];
 high=dispatchUniversalAction(packs,high,legalUniversalActions(packs,high).find(a=>a.type==='next'));
 high=dispatchUniversalAction(packs,high,{type:'attack',uid:attacker.uid});
 assert.equal(findUid(high,'RNK-1-011').ready,true);
 high=act(high,a=>a.type==='chooseBlock'&&a.uid===null);
 if(high.pending?.kind==='effect-may-draw'){
  const before=high.players[0].hand.length;
  high=act(high,a=>a.type==='chooseMayDraw'&&a.mode==='draw');
  assert.equal(high.players[0].hand.length,before+1);
 }
 assert.equal(assertUniversalMatch(packs,high),true);

 let low=fresh(32);
 const quiet=seat(low,0,'RNK-1-011','front',0,true);
 low=dispatchUniversalAction(packs,low,legalUniversalActions(packs,low).find(a=>a.type==='next'));
 low=dispatchUniversalAction(packs,low,{type:'attack',uid:quiet.uid});
 assert.equal(findUid(low,'RNK-1-011').ready,false);
});

test('011 buffs itself only after the named event was used',()=>{
 let s=fresh(33);
 fuel(s,'RNK-1-004',3);
 const self=seat(s,0,'RNK-1-011','front',0,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restUseBuff'),false);
 s=play(s,'RNK-1-027');
 if(s.pending)s=act(s,a=>a.uid===null||a.mode==='skip'||a.type==='chooseRecoverAp');
 s=act(s,a=>a.mode==='restUseBuff'&&a.uid===self.uid);
 assert.equal(universalBp(packs,s,findUid(s,'RNK-1-011')),5000);
});

test('018 and 033 give the entered character the attack lock',()=>{
 let s=fresh(34);
 const top=seat(s,0,'RNK-1-018','front',0,true);
 const base=take(s,0,'RNK-1-014');
 top.stack=[base];top.raidBaseUid=base.uid;
 s=act(s,a=>a.mode==='restRaidSource');
 s=act(s,a=>a.type==='chooseRaidSource');
 let locked=s.players[0].energy.find(c=>c?.cardId==='RNK-1-014')||s.players[0].front.find(c=>c?.cardId==='RNK-1-014');
 assert.equal(locked.ready,true);
 assert.equal(locked.attackBanned.turn,s.turn);
 while(s.pending)s=act(s,a=>a.uid!==undefined||a.mode);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.players[0].front.some(c=>c?.uid===locked.uid)||s.players[0].energy.some(c=>c?.uid===locked.uid),false);
 assert.ok(s.players[0].outside.some(c=>c.uid===locked.uid));

 let event=fresh(35);
 fuel(event,'RNK-1-004',2);
 const outside=take(event,0,'RNK-1-014');event.players[0].outside.push(outside);
 event=play(event,'RNK-1-033');
 event=act(event,a=>a.type==='chooseLockedEntry'&&a.uid===outside.uid);
 const entered=findUid(event,'RNK-1-014');
 assert.equal(entered.ready,true);
 assert.ok(entered.attackBanned);
 assert.equal(assertUniversalMatch(packs,event),true);
});

test('038 discounts an empty field and can bounce one union character',()=>{
 let s=fresh(36);
 const card=take(s,0,'RNK-1-038');s.players[0].hand.push(card);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===card.uid));
 s=fresh(37);
 fuel(s,'RNK-1-037',2);
 const self=seat(s,0,'RNK-1-038','front',0,true);
 const ally=seat(s,0,'RNK-1-002','front',1,true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:self.uid});
 s=act(s,a=>a.type==='chooseBounceUnion'&&a.uid===ally.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===ally.uid));
 assert.equal(universalBp(packs,s,findUid(s,'RNK-1-038')),4000);
});

test('040 gains an energy attack that moves to the front and snipes',()=>{
 let s=fresh(38);
 fuel(s,'RNK-1-037',3);
 s=play(s,'RNK-1-040','front',3);
 const self=findUid(s,'RNK-1-040');
 assert.equal(universalBp(packs,s,self),5000);
 assert.ok(self.energyAttackGranted);
 // Move it to energy so the earned attack can leave that line.
 s.players[0].front[s.players[0].front.findIndex(c=>c?.uid===self.uid)]=null;
 self.ready=true;
 s.players[0].energy[3]=self;
 const target=seat(s,1,'RNK-1-035','front',0,true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=act(s,a=>a.type==='attack'&&a.uid===self.uid&&a.targetUid===target.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===self.uid),true);
 assert.equal(s.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('044 may enter active, then retires by the milled card energy',()=>{
 let s=fresh(39);
 fuel(s,'RNK-1-037',2);
 const union=take(s,0,'RNK-1-056');s.players[0].hand.push(union);
 const top=take(s,0,'RNK-1-037');s.players[0].deck.unshift(top);
 const foe=seat(s,1,'RNK-1-035','front',0,true);
 s=play(s,'RNK-1-044','front',0);
 assert.equal(findUid(s,'RNK-1-044').ready,false);
 s=act(s,a=>a.type==='chooseUnionDiscard'&&a.uid===union.uid);
 assert.equal(findUid(s,'RNK-1-044').ready,true);
 s=act(s,a=>a.type==='chooseMillScale'&&a.uid===foe.uid);
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
});

test('050 shows every facedown card and can tuck after blocking',()=>{
 let look=fresh(40);
 const self=seat(look,0,'RNK-1-050','front',0,true);
 const hidden=take(look,0,'RNK-1-035');
 const other=take(look,0,'RNK-1-037');
 hidden.faceDown=true;other.faceDown=true;self.under=[hidden,other];
 look=dispatchUniversalAction(packs,look,legalUniversalActions(packs,look).find(a=>a.type==='next'));
 look=dispatchUniversalAction(packs,look,{type:'attack',uid:self.uid});
 const eyes=universalPrivateChoices(packs,look,0);
 const shown=eyes.options.map(o=>o.card?.cardId);
 assert.ok(shown.includes('RNK-1-035')&&shown.includes('RNK-1-037'));
 look=act(look,a=>a.type==='chooseFacedownHand'&&a.uid===hidden.uid);
 assert.ok(look.players[0].hand.some(c=>c.uid===hidden.uid));
 assert.equal(findUid(look,'RNK-1-050').under.length,1);

 let block=fresh(401);
 const host=seat(block,0,'RNK-1-050','front',0,true);
 const victim=seat(block,0,'RNK-1-037','front',1,true);
 const attacker=seat(block,1,'RNK-1-035','front',0,true);
 block=dispatchUniversalAction(packs,block,legalUniversalActions(packs,block).find(a=>a.type==='next'));
 block=dispatchUniversalAction(packs,block,legalUniversalActions(packs,block).find(a=>a.type==='next'));
 while(block.active!==1||block.phase!=='attack'){
  if(block.pending)block=act(block,a=>a.uid===null||a.mode==='skip');
  else block=dispatchUniversalAction(packs,block,legalUniversalActions(packs,block).find(a=>a.type==='next'));
 }
 block=dispatchUniversalAction(packs,block,{type:'attack',uid:attacker.uid});
 block=act(block,a=>a.type==='chooseBlock'&&a.uid===host.uid);
 block=act(block,a=>a.type==='chooseRetireTuck'&&a.uid===victim.uid);
 assert.ok(findUid(block,'RNK-1-050').under.some(c=>c.faceDown===true));
 assert.equal(universalBp(packs,block,findUid(block,'RNK-1-050')),4500);
 assert.equal(assertUniversalMatch(packs,block),true);
 aiOk(block);
});

test('054 reveals a union card, then moves generated energy of 1 or less',()=>{
 let s=fresh(41);
 fuel(s,'RNK-1-037',2);
 const shown=take(s,0,'RNK-1-056');s.players[0].hand.push(shown);
 const small=seat(s,1,'RNK-1-035','energy',0,true);
 const big=seat(s,1,'RNK-1-037','energy',1,true);
 s=play(s,'RNK-1-054','front',0);
 s=act(s,a=>a.type==='chooseRevealUnion'&&a.uid===shown.uid);
 assert.equal(s.players[0].deck[0].uid,shown.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===big.uid),false);
 s=act(s,a=>a.type==='chooseMoveGen'&&a.uid===small.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===small.uid),true);
 assert.equal(universalCardEnergy(packs,s,1,big),2);
});

test('056 pays a hand card before the rested entry, once per name',()=>{
 let s=fresh(42);
 fuel(s,'RNK-1-037',2);
 const milled=take(s,0,'RNK-1-056');s.players[0].deck.unshift(milled);
 const pay=take(s,0,'RNK-1-035');s.players[0].hand.push(pay);
 s=play(s,'RNK-1-044','front',0);
 if(s.pending?.kind==='effect-union-discard')s=act(s,a=>a.uid===null);
 s=act(s,a=>a.type==='chooseHandRestSelf'&&a.uid===pay.uid);
 const entered=findUid(s,'RNK-1-056');
 assert.equal(entered.ready,false);
 assert.ok(s.players[0].outside.some(c=>c.uid===pay.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('059 can raid from outside and the front main puts the raid top on the deck',()=>{
 let s=fresh(43);
 fuel(s,'RNK-1-037',2);
 const base=seat(s,0,'RNK-1-056','front',1,true);
 const milled=take(s,0,'RNK-1-059');s.players[0].deck.unshift(milled);
 s=play(s,'RNK-1-044','front',0);
 if(s.pending?.kind==='effect-union-discard')s=act(s,a=>a.uid===null);
 if(s.pending?.kind==='effect-mill-scale')s=act(s,a=>a.uid===null);
 s=act(s,a=>a.type==='chooseOutsideRaid'&&a.uid===base.uid);
 const top=findUid(s,'RNK-1-059');
 assert.equal(top.ready,true);
 assert.equal(universalImpact(packs,s,top),1);
 if(s.pending?.kind==='effect-draw-up-to')s=act(s,a=>a.mode==='skip');
 while(s.pending)s=act(s,a=>a.uid===null||a.mode==='skip');
 s=act(s,a=>a.mode==='restRaidTop'&&a.uid===top.uid);
 assert.equal(s.players[0].deck[0].cardId,'RNK-1-059');
 assert.equal(s.players[0].front[1].cardId,'RNK-1-056');
});

test('071 grants the opponent a hand tax until your next turn',()=>{
 let s=fresh(44);
 fuel(s,'RNK-1-076',1);
 const ken=seat(s,0,'RNK-1-010','front',0,true);
 s=play(s,'RNK-1-071','energy',3);
 s=act(s,a=>a.mode==='restSelectTax');
 s=act(s,a=>a.type==='chooseSelectTax'&&a.uid===ken.uid);
 assert.equal(findUid(s,'RNK-1-010').selectHandTaxUntil.count,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('076 may discard at attack end and then swap with an unattacked character',()=>{
 let s=fresh(45);
 const self=seat(s,0,'RNK-1-076','energy',0,true);
 const freshFront=seat(s,0,'RNK-1-010','front',1,true);
 const attacker=seat(s,0,'RNK-1-035','front',0,true);
 const pay=take(s,0,'RNK-1-002');s.players[0].hand.push(pay);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===null);
 s=act(s,a=>a.type==='chooseDiscardSwap'&&a.uid===pay.uid);
 s=act(s,a=>a.type==='chooseSwapFresh'&&a.uid===freshFront.uid);
 assert.equal(s.players[0].front[1].uid,self.uid);
 assert.equal(s.players[0].energy[0].uid,freshFront.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('077 can rest another Sanosuke when the attack is blocked',()=>{
 let s=fresh(46);
 fuel(s,'RNK-1-076',3);
 s=play(s,'RNK-1-077','front',0);
 while(s.pending)s=act(s,a=>a.mode==='skip'||a.uid===null);
 const self=findUid(s,'RNK-1-077');
 self.ready=true;
 const other=seat(s,0,'RNK-1-076','front',1,true);
 const wall=seat(s,1,'RNK-1-037','front',0,true);
 wall.buffs=[{bp:1000,untilTurn:s.turn}];
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:self.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 s=act(s,a=>a.type==='chooseRestBattle'&&a.uid===other.uid);
 assert.equal(findUid(s,'RNK-1-076').ready,false);
 assert.equal(universalImpact(packs,s,findUid(s,'RNK-1-077')),1);
 assert.ok(universalBp(packs,s,findUid(s,'RNK-1-077'))>=5000);
});

test('089 removes the oath, draws, and silences every Kenshin own-turn text',()=>{
 let s=fresh(47);
 fuel(s,'RNK-1-076',2);
 const ken=seat(s,0,'RNK-1-105','front',0,true);
 const before=universalBp(packs,s,ken);
 const oath=take(s,0,'RNK-1-096');s.players[0].outside.push(oath);
 s=play(s,'RNK-1-089','front',1);
 while(s.pending?.kind!=='effect-remove-aura'&&legalUniversalActions(packs,s).some(a=>a.mode==='restRemoveAura'||a.type!=='activate')){
  if(legalUniversalActions(packs,s).some(a=>a.mode==='restRemoveAura'))break;
  s=act(s,a=>a.type==='chooseDiscard'||a.uid!==undefined);
 }
 s=act(s,a=>a.mode==='restRemoveAura');
 s=act(s,a=>a.type==='chooseRemoveAura'&&a.uid===oath.uid);
 assert.ok(s.players[0].removed.some(c=>c.uid===oath.uid));
 assert.equal(universalBp(packs,s,findUid(s,'RNK-1-105')),before+1000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('099 retires, or removes when a Sanosuke rests',()=>{
 let removed=fresh(48);
 fuel(removed,'RNK-1-076',2);
 const sano=seat(removed,0,'RNK-1-076','front',0,true);
 const foe=seat(removed,1,'RNK-1-035','front',0,true);
 removed=play(removed,'RNK-1-099');
 removed=act(removed,a=>a.type==='chooseRetireRemove'&&a.mode==='remove'&&a.restUid===sano.uid);
 assert.equal(findUid(removed,'RNK-1-076').ready,false);
 assert.ok(removed.players[1].removed.some(c=>c.uid===foe.uid));
 assert.equal(removed.players[1].outside.some(c=>c.uid===foe.uid),false);

 let retired=fresh(49);
 fuel(retired,'RNK-1-076',2);
 seat(retired,0,'RNK-1-076','front',0,false);
 const other=seat(retired,1,'RNK-1-035','front',0,true);
 retired=play(retired,'RNK-1-099');
 retired=act(retired,a=>a.type==='chooseRetireRemove'&&a.mode==='retire');
 assert.ok(retired.players[1].outside.some(c=>c.uid===other.uid));
});

test('103 wakes from an effect rest and stays rested after an attack',()=>{
 let s=fresh(50);
 fuel(s,'RNK-1-091',2);
 const self=seat(s,1,'RNK-1-103','front',0,true);
 s=play(s,'RNK-1-098');
 s=act(s,a=>a.uid===self.uid);
 assert.equal(findUid(s,'RNK-1-103').ready,true);
 let attack=fresh(51);
 const attacker=seat(attack,0,'RNK-1-103','front',0,true);
 attack=dispatchUniversalAction(packs,attack,legalUniversalActions(packs,attack).find(a=>a.type==='next'));
 attack=dispatchUniversalAction(packs,attack,{type:'attack',uid:attacker.uid});
 assert.equal(findUid(attack,'RNK-1-103').ready,false);
});

test('111 cannot be rule-moved to the front and pays two cards to change lines',()=>{
 let s=fresh(52);
 fuel(s,'RNK-1-004',2);
 s=play(s,'RNK-1-111','energy',3);
 while(s.pending)s=act(s,a=>a.type==='chooseInspectedOutside'||a.type==='chooseTopOrder');
 const self=findUid(s,'RNK-1-111');
 seat(s,0,'RNK-1-010','front',0,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='move'&&a.uid===self.uid),false);
 s=act(s,a=>a.mode==='restPayMove'&&a.uid===self.uid);
 const first=s.players[0].hand[0];
 s=act(s,a=>a.type==='choosePayMove'&&a.uid===first.uid);
 const second=s.players[0].hand[0];
 s=act(s,a=>a.type==='choosePayMove'&&a.uid===second.uid);
 if(s.pending?.kind==='effect-move-line')s=act(s,a=>a.type==='chooseMoveLine');
 assert.equal(findUid(s,'RNK-1-111')&&s.players[0].front.some(c=>c?.uid===self.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('the promo is paid with any colors and actives up to two AP',()=>{
 let s=fresh(53);
 const card=take(s,0,'RNK-P-001');s.players[0].hand.push(card);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===card.uid),false);
 seat(s,0,'RNK-1-004','energy',0);
 seat(s,0,'RNK-1-076','energy',1);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===card.uid));
 s.players[0].apCards[0].ready=false;
 s=dispatchUniversalAction(packs,s,{type:'event',uid:card.uid});
 s=act(s,a=>a.type==='chooseApRecovery'&&a.uid==='AP0-0');
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
 aiOk(s);
});
