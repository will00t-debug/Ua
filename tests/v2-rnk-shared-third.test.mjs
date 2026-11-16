import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_SHARED_THIRD} from '../dist/rnk/jp-evidence-shared-third.mjs';
import {RNK_PROGRAMS_SHARED_THIRD} from '../dist/universal-v2/rnk/programs-shared-third.mjs';
import {createRnkBcdBatchStagingPack,RNK_BATCH_STAGING_IDS} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalCardEnergy,universalPrivateChoices,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const IDS=['RNK-1-008','RNK-1-013','RNK-1-019','RNK-1-024','RNK-1-029','RNK-1-039','RNK-1-043','RNK-1-070','RNK-1-085','RNK-1-086','RNK-1-087','RNK-1-088','RNK-1-090','RNK-1-093','RNK-1-098','RNK-1-101','RNK-1-102','RNK-1-105','RNK-1-106','RNK-1-110'];
const source=Object.fromEntries(RNK_TC_CATALOG.map(c=>[c.id,c]));
const pack=createRnkBcdBatchStagingPack();
const packs=[pack,pack];
function deck(){
 const counts={
  'RNK-1-004':4,'RNK-1-035':4,'RNK-1-091':4,
  'RNK-1-002':4,'RNK-1-014':4,'RNK-1-015':2,'RNK-1-053':2,'RNK-1-055':2,'RNK-1-074':2,'RNK-1-112':2
 };
 for(const id of IDS)counts[id]=(counts[id]||0)+1;
 counts['RNK-1-015']-=1;counts['RNK-1-101']+=1;
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
 c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toMain(s){
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
function fresh(seed=21){
 const s=toMain(newUniversalMatch(pack,{decks:[counts,counts],seed,first:0,openingMulligan:false}));
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 return s;
}
const GEN={blue:'RNK-1-004',purple:'RNK-1-035',red:'RNK-1-091'};
function fuel(s,color='red',slots=4){for(let i=0;i<slots;i++)seat(s,0,GEN[color],'energy',i);return s;}
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
 assert.ok(a,JSON.stringify(legal.slice(0,6)));
 return dispatchUniversalAction(packs,s,a);
}
test('third official Japanese batch stages twenty shared programs',()=>{
 assert.equal(RNK_BATCH_STAGING_IDS.length,95);
 assert.equal(IDS.length,20);
 for(const id of IDS){
  const jp=RNK_JP_EVIDENCE_SHARED_THIRD[id],tc=source[id],v2=pack.cards[id];
  assert.equal(jp.print,tc.number);
  assert.equal(v2.name,jp.nameJa);
  assert.equal(v2.energy,tc.energy);
  assert.equal(tc.name,source[id].name);
  assert.equal(tc.battleReady,false);
  assert.equal(RNK_IDENTITY_INVENTORY.find(c=>c.id===id).effectImplemented,false);
  assert.ok(jp.sourceJa.startsWith('https://www.unionarena-tcg.com/jp/cardlist/'));
  assert.equal(RNK_PROGRAMS_SHARED_THIRD[id].ready,true);
 }
 assert.equal(source['RNK-1-101'].set,'UA41ST');
 assert.equal(source['RNK-1-008'].name,'比古清十郎');
 assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
});

test('a battle loser moves to energy instead of leaving, and a higher blocker stays',()=>{
 let s=fresh();
 const atk=seat(s,0,'RNK-1-085','front',0,true);
 const wall=seat(s,1,'RNK-1-014','front',0,true);
 for(let i=0;i<3;i++)seat(s,1,'RNK-1-002','energy',i,true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:atk.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].energy[3]?.uid,wall.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 aiOk(s);

 let lost=fresh(22);
 const low=seat(lost,0,'RNK-1-087','front',0,true);
 const high=seat(lost,1,'RNK-1-014','front',0,true);
 lost.players[1].front[0].buffs=[{bp:2000,untilTurn:lost.turn}];
 lost=dispatchUniversalAction(packs,lost,legalUniversalActions(packs,lost).find(a=>a.type==='next'));
 lost=dispatchUniversalAction(packs,lost,{type:'attack',uid:low.uid});
 lost=act(lost,a=>a.type==='chooseBlock'&&a.uid===high.uid);
 assert.equal(lost.players[0].front[0]?.uid,low.uid);
 assert.equal(lost.players[1].front[0]?.uid,high.uid);
});

test('a full energy line lets the opponent remove one card, then the loser moves',()=>{
 let s=fresh(23);
 const atk=seat(s,0,'RNK-1-085','front',0,true);
 const wall=seat(s,1,'RNK-1-014','front',0,true);
 const occupants=[];
 for(let i=0;i<4;i++)occupants.push(seat(s,1,'RNK-1-002','energy',i,true));
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:atk.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(s.pending?.kind,'effect-battle-energy-full');
 assert.equal(s.pending.player,1);
 const removed=occupants[1];
 s=act(s,a=>a.type==='chooseBattleEnergyRemove'&&a.uid===removed.uid);
 assert.equal(s.players[1].removed.some(c=>c.uid===removed.uid),true);
 assert.equal(s.players[1].energy[1]?.uid,wall.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('105 loses 1000 BP on its own turn and 086 discards only after adding a card',()=>{
 let s=fresh();
 const self=seat(s,0,'RNK-1-105','front',0,true);
 assert.equal(universalBp(pack,s,self),3000);
 let opp=fresh(24);
 opp.active=1;
 const card=seat(opp,0,'RNK-1-105','front',0,true);
 assert.equal(universalBp(pack,opp,card),4000);

 let look=fuel(fresh(25));
 const window=['RNK-1-002','RNK-1-014','RNK-1-015'];
 for(const id of [...window].reverse())look.players[0].deck.unshift(take(look,0,id));
 const before=look.players[0].hand.length;
 look=play(look,'RNK-1-086','front',0);
 assert.equal(look.pending?.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(packs,look,0).inspected.length,3);
 const alias=look.players[0].deck.find(c=>c.cardId==='RNK-1-002');
 look=act(look,a=>a.type==='chooseTopFiltered'&&a.uid===alias.uid);
 while(look.pending?.kind==='effect-top-order')
  look=act(look,a=>a.type==='chooseTopOrder'||a.type==='confirmTopOrder'||a.uid===null||a.type==='next');
 assert.equal(look.players[0].hand.some(c=>c.uid===alias.uid),true);
 assert.ok(look.pending);
 look=act(look,a=>a.uid&&a.uid!==alias.uid);
 assert.equal(look.players[0].hand.length,before);
 assert.equal(assertUniversalMatch(packs,look),true);
});

test('energy-line discard activates 070, and a front play does not',()=>{
 let front=fuel(fresh(26));
 front=play(front,'RNK-1-070','front',0);
 assert.equal(front.pending,null);
 assert.equal(front.players[0].front.some(c=>c?.cardId==='RNK-1-070'),true);

 let energy=fuel(fresh(27), 'red', 3);
 const pay=energy.players[0].hand[0];
 energy=play(energy,'RNK-1-070','energy',3);
 assert.equal(energy.pending?.kind,'effect-discard-hand-active');
 energy=act(energy,a=>a.type==='chooseDiscardHandActive'&&a.uid===pay.uid);
 const kaoru=energy.players[0].energy.find(c=>c?.cardId==='RNK-1-070');
 assert.equal(kaoru.ready,true);
 assert.equal(energy.players[0].outside.some(c=>c.uid===pay.uid),true);
});

test('024 grants this-turn blue energy, and its main returns the card',()=>{
 let s=fuel(fresh(28),'blue',2);
 s=play(s,'RNK-1-024','energy',2);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 s=act(s,a=>a.type==='chooseEffectMode'&&a.mode==='energy');
 const maki=s.players[0].energy.find(c=>c?.cardId==='RNK-1-024');
 assert.equal(universalCardEnergy(pack,s,0,maki),pack.cards['RNK-1-024'].gen+1);
 maki.ready=true;
 const other=seat(s,0,'RNK-1-014','front',0,true);
 s=act(s,a=>a.type==='activate'&&a.mode==='restBuffReturn'&&a.uid===maki.uid);
 s=act(s,a=>a.uid===other.uid);
 const buffed=s.players[0].front.find(c=>c?.uid===other.uid);
 assert.equal(universalBp(pack,s,buffed),2500);
 assert.equal(s.players[0].hand.some(c=>c.uid===maki.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('043 adds the milled card energy times 500, and only from the front',()=>{
 let s=fuel(fresh(29),'purple',3);
 const top=take(s,0,'RNK-1-039');
 s.players[0].deck.unshift(top);
 const actor=seat(s,0,'RNK-1-043','front',0,true);
 actor.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalImpact(pack,s,actor),1);
 s=act(s,a=>a.type==='activate'&&a.mode==='frontOnce'&&a.uid===actor.uid);
 const liveActor=s.players[0].front.find(c=>c?.cardId==='RNK-1-043');
 assert.equal(s.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(universalBp(pack,s,liveActor),3000+2000+4*500);
});

test('110 can add an event whose name contains 回天剣舞 without discarding',()=>{
 let s=fuel(fresh(30),'blue',2);
 const event=take(s,0,'RNK-1-029');
 const other=take(s,0,'RNK-1-002');
 const trait=take(s,0,'RNK-1-014');
 s.players[0].deck.unshift(other,event,trait);
 s=play(s,'RNK-1-110','front',0);
 const handAfterPlay=s.players[0].hand.length;
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.equal(s.pending.discard,false);
 assert.ok(s.pending.choices.includes(event.uid));
 assert.ok(s.pending.choices.includes(trait.uid));
 assert.equal(s.pending.choices.includes(other.uid),false);
 s=act(s,a=>a.type==='chooseTopFiltered'&&a.uid===event.uid);
 while(s.pending)s=act(s,a=>a.uid===null||a.type==='chooseTopOrder'||a.type==='confirmTopOrder');
 assert.equal(s.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(s.players[0].hand.length,handAfterPlay+1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('102 may rest an active front character to gain Impact this turn',()=>{
 let s=fuel(fresh(31),'red',4);
 const ally=seat(s,0,'RNK-1-014','front',1,true);
 s=play(s,'RNK-1-102','front',0);
 const saito=s.players[0].front.find(c=>c?.cardId==='RNK-1-102');
 saito.ready=true;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:saito.uid});
 assert.equal(s.pending?.kind,'effect-rest-own-impact');
 s=act(s,a=>a.type==='chooseRestOwnImpact'&&a.uid===ally.uid);
 const attacker=s.players[0].front.find(c=>c?.cardId==='RNK-1-102');
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(universalImpact(pack,s,attacker),1);
});

test('098 rests an opposing front character, and a red Kenshin discard draws',()=>{
 let s=fuel(fresh(32),'red',3);
 const foe=seat(s,1,'RNK-1-014','front',0,true);
 s=play(s,'RNK-1-098');
 assert.equal(s.pending?.kind==='effect-rest-opp-if-name'||s.pending?.choices?.includes(foe.uid),true);
 s=act(s,a=>a.uid===foe.uid);
 assert.equal(s.players[1].front[0].ready,false);

 let draw=fuel(fresh(33),'red',3);
 const payment=take(draw,0,'RNK-1-098');
 draw.players[0].hand.push(payment);
 const before=draw.players[0].hand.length;
 draw=play(draw,'RNK-1-088','front',0);
 draw=act(draw,a=>a.type==='chooseDiscardHandActive'&&a.uid===payment.uid);
 assert.equal(draw.players[0].hand.length,before);
 assert.equal(draw.players[0].front.find(c=>c?.cardId==='RNK-1-088').ready,true);
});

test('013 can retire itself instead of a front Aoshi leaving on your turn',()=>{
 let s=fresh(34);
 const aoshi=seat(s,0,'RNK-1-014','front',0,true);
 const ram=seat(s,0,'RNK-1-013','front',1,true);
 const atk=seat(s,0,'RNK-1-085','front',2,true);
 const buried=s.players[1].life[0];
 s.players[1].life[0]=take(s,1,'RNK-1-029');
 s.players[1].deck.push(buried);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:atk.uid});
 if(legalUniversalActions(packs,s).some(a=>a.type==='chooseBlock'))
  s=act(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=act(s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===aoshi.uid);
 assert.equal(s.pending?.kind,'effect-substitute-retire');
 s=act(s,a=>a.type==='chooseSubstituteRetire'&&a.uid===ram.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===ram.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===aoshi.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('029 lowers one Aoshi and can reactivate it by resting another',()=>{
 let s=fuel(fresh(35),'blue',4);
 const first=seat(s,0,'RNK-1-014','front',0,true);
 const second=seat(s,0,'RNK-1-014','front',1,true);
 const wall=seat(s,1,'RNK-1-014','front',0,true);
 s=play(s,'RNK-1-029');
 assert.equal(s.pending?.kind,'effect-grant-attack-end');
 s=act(s,a=>a.type==='chooseGrantAttackEnd'&&a.uid===first.uid);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c?.uid===first.uid)),500);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:first.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(s.pending?.kind,'effect-attack-end-reactivate');
 s=act(s,a=>a.type==='chooseAttackEndReactivate'&&a.uid===second.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,true);
 assert.equal(s.players[0].front.find(c=>c?.uid===second.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('093 pays one AP to draw and gain BP, then may active an unattacked character',()=>{
 let s=fuel(fresh(36));
 const ally=seat(s,0,'RNK-1-014','front',1,false);
 s=play(s,'RNK-1-093','front',0);
 const yahiko=s.players[0].front.find(c=>c?.cardId==='RNK-1-093');
 yahiko.ready=true;
 const hand=s.players[0].hand.length;
 s=act(s,a=>a.type==='activate'&&a.mode==='payApDrawBuff'&&a.uid===yahiko.uid);
 const grown=s.players[0].front.find(c=>c?.uid===yahiko.uid);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalBp(pack,s,grown),pack.cards['RNK-1-093'].bp+1000);
 const pay=s.players[0].hand[0];
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:yahiko.uid});
 assert.equal(s.pending?.kind,'effect-discard-active-unattacked');
 s=act(s,a=>a.type==='chooseDiscardActiveUnattacked'&&a.uid===pay.uid);
 assert.equal(s.pending?.kind,'effect-active-unattacked');
 s=act(s,a=>a.type==='chooseActiveUnattacked'&&a.uid===ally.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===ally.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('101 draws by resting only when no opposing character retired, once per name',()=>{
 let s=fresh(37);
 const kaoru=seat(s,0,'RNK-1-101','front',0,true);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.pending?.kind,'effect-quiet-rest-draw');
 s=act(s,a=>a.type==='chooseQuietRestDraw'&&a.mode==='rest');
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[0].front.some(c=>c?.uid===kaoru.uid),true);

 let blocked=fresh(38);
 const quiet=seat(blocked,0,'RNK-1-101','front',0,true);
 const foe=seat(blocked,1,'RNK-1-014','front',0,true);
 const atk=seat(blocked,0,'RNK-1-085','front',1,true);
 blocked=dispatchUniversalAction(packs,blocked,legalUniversalActions(packs,blocked).find(a=>a.type==='next'));
 blocked=dispatchUniversalAction(packs,blocked,{type:'attack',uid:atk.uid});
 blocked=act(blocked,a=>a.type==='chooseBlock'&&a.uid===foe.uid);
 while(blocked.phase==='attack'&&!blocked.pending)
  blocked=dispatchUniversalAction(packs,blocked,legalUniversalActions(packs,blocked).find(a=>a.type==='next'));
 assert.notEqual(blocked.pending?.kind,'effect-quiet-rest-draw');
 assert.equal(blocked.players[0].front.find(c=>c?.uid===quiet.uid).ready,true);
 let twice=fresh(45);
 const first=seat(twice,0,'RNK-1-101','front',0,true);
 const second=seat(twice,0,'RNK-1-101','front',1,true);
 twice=dispatchUniversalAction(packs,twice,legalUniversalActions(packs,twice).find(a=>a.type==='next'));
 twice=dispatchUniversalAction(packs,twice,legalUniversalActions(packs,twice).find(a=>a.type==='next'));
 assert.equal(twice.pending?.kind,'phase-order');
 twice=act(twice,a=>a.type==='choosePhaseOrder'&&a.key.startsWith(first.uid));
 assert.equal(twice.pending?.kind,'effect-quiet-rest-draw');
 twice=act(twice,a=>a.type==='chooseQuietRestDraw'&&a.mode==='rest');
 assert.notEqual(twice.pending?.kind,'effect-quiet-rest-draw');
 assert.equal(twice.players[0].front.some(c=>c?.uid===second.uid),true);
});

test('008 recovers an outside event, deals two damage, and gains 3000 BP',()=>{
 let s=fuel(fresh(39),'blue',4);
 const event=take(s,0,'RNK-1-029');
 s.players[0].outside.push(event);
 const life=s.players[1].life.length;
 s=play(s,'RNK-1-008','front',0);
 assert.equal(s.pending?.kind,'effect-recover-type');
 s=act(s,a=>a.type==='chooseRecoverType'&&a.uid===event.uid);
 const hiko=s.players[0].front.find(c=>c?.cardId==='RNK-1-008');
 assert.equal(s.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(universalBp(pack,s,hiko),8000);
 hiko.ready=true;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:hiko.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.players[1].life.length,life-2);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('106 moves an opposing front character onto that player energy line',()=>{
 let s=fuel(fresh(40));
 const foe=seat(s,1,'RNK-1-014','front',0,true);
 for(let i=0;i<3;i++)seat(s,1,'RNK-1-002','energy',i,true);
 s=play(s,'RNK-1-106','front',0);
 assert.equal(s.pending?.kind,'effect-opp-energy-move');
 s=act(s,a=>a.type==='chooseOppEnergyMove'&&a.uid===foe.uid);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].energy[3]?.uid,foe.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===foe.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('039 adds one named card from five and a low character cannot block it',()=>{
 let s=fuel(fresh(41),'purple',4);
 const named=take(s,0,'RNK-1-002');
 const rest=['RNK-1-015','RNK-1-053','RNK-1-055','RNK-1-074'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...[...rest,named].reverse());
 s=play(s,'RNK-1-039','front',0);
 const hand=s.players[0].hand.length;
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.equal(s.pending.discard,false);
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,5);
 s=act(s,a=>a.type==='chooseTopFiltered'&&a.uid===named.uid);
 while(s.pending)s=act(s,a=>a.uid===null||a.type==='chooseTopOrder'||a.type==='confirmTopOrder');
 assert.equal(s.players[0].hand.filter(c=>c.uid===named.uid).length,1);
 assert.equal(s.players[0].hand.length,hand+1);
 const saito=s.players[0].front.find(c=>c?.cardId==='RNK-1-039');
 assert.equal(universalImpact(pack,s,saito),0);
 saito.ready=true;
 const low=seat(s,1,'RNK-1-085','front',0,true);
 const high=seat(s,1,'RNK-1-105','front',1,true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:saito.uid});
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock'&&a.uid);
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===high.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('019 gains BP from a discarded hand card and deploys a rested blue Aoshi',()=>{
 let s=toMain(newUniversalMatch(pack,{decks:[counts,counts],seed:42,first:1,openingMulligan:false}));
 const hannya=seat(s,0,'RNK-1-019','front',0,true);
 const aoshi=take(s,0,'RNK-1-014');
 const pay=s.players[0].hand[0];
 s.players[0].outside.push(aoshi);
 hannya.ready=true;
 let owner=fresh(43);
 const self=seat(owner,0,'RNK-1-019','front',0,true);
 self.ready=true;
 const discarded=owner.players[0].hand[0];
 owner=act(owner,a=>a.type==='activate'&&a.mode==='discardSelfBuff'&&a.uid===self.uid);
 owner=act(owner,a=>a.type==='chooseMainDiscard'&&a.uid===discarded.uid);
 assert.equal(universalBp(pack,owner,owner.players[0].front.find(c=>c?.uid===self.uid)),4000);
 const atk=seat(s,1,'RNK-1-008','front',0,true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:atk.uid});
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===hannya.uid);
 assert.equal(s.pending?.kind,'effect-hand-then-rest-deploy');
 s=act(s,a=>a.type==='chooseHandThenDeploy'&&a.uid===pay.uid);
 assert.equal(s.pending?.kind,'effect-rest-deploy');
 s=act(s,a=>a.type==='chooseRestDeploy'&&a.uid===aoshi.uid&&a.line==='front');
 const entered=s.players[0].front.find(c=>c?.uid===aoshi.uid);
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.equal(s.players[0].outside.some(c=>c.uid===hannya.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('090 discards once on attack and the second attack does not ask again',()=>{
 let s=fuel(fresh(44));
 s=play(s,'RNK-1-090','front',0);
 const kenshin=s.players[0].front.find(c=>c?.cardId==='RNK-1-090');
 kenshin.ready=true;
 const pay=s.players[0].hand[0];
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:kenshin.uid});
 assert.equal(s.pending?.kind,'effect-discard-hand-active');
 s=act(s,a=>a.type==='chooseDiscardHandActive'&&a.uid===pay.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===kenshin.uid).ready,true);
 s=act(s,a=>a.type==='chooseBlock'&&a.uid==null);
 if(s.pending?.kind==='life-trigger')s=act(s,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 const again=s.players[0].front.find(c=>c?.uid===kenshin.uid);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:again.uid});
 assert.equal(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});
