// UA10BT/MHA-1-051–100. Official text is effectJa from unionarena-tcg.com.
// Each ready card is played. A shared sentence on another number is not evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CARDS_051_100} from '../dist/mha/cards-051-100.mjs';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_REQUESTS_051_100} from '../dist/universal-v2/mha/requests-051-100.mjs';
import {runMha051} from '../dist/universal-v2/mha/runtime-051-100.mjs';
import {createMhaV2Pack,MHA_OFFICIAL_MATCH_CLOSED,mhaBattleCard,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices,universalBp,universalCardEnergy,
 universalImpactNull,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';

const READY=['MHA-1-051','MHA-1-052','MHA-1-053','MHA-1-054','MHA-1-056','MHA-1-057','MHA-1-058','MHA-1-059','MHA-1-061','MHA-1-064','MHA-1-065',
 'MHA-1-067','MHA-1-068','MHA-1-069','MHA-1-070','MHA-1-071','MHA-1-073','MHA-1-074','MHA-1-075','MHA-1-077','MHA-1-078',
 'MHA-1-079','MHA-1-080','MHA-1-082','MHA-1-083','MHA-1-086','MHA-1-087','MHA-1-088','MHA-1-089','MHA-1-092',
 'MHA-1-093','MHA-1-094','MHA-1-097','MHA-1-098'];
const OPEN=['MHA-1-055','MHA-1-060','MHA-1-062','MHA-1-066','MHA-1-072',
 'MHA-1-076','MHA-1-081','MHA-1-084','MHA-1-085',
 'MHA-1-090','MHA-1-091','MHA-1-095','MHA-1-096','MHA-1-099','MHA-1-100'];
const VIA_STARTER=['MHA-1-063'];
const LIMITED=new Set(['MHA-1-064','MHA-1-097','MHA-1-065','MHA-1-098']);
const pack=createMhaV2Pack();

function counts(extra={},usePack=pack){
 const c={};
 for(const id of READY)c[id]=id==='MHA-1-057'||id==='MHA-1-078'?4:id==='MHA-1-086'?3:1;
 for(const [id,n] of Object.entries(extra))c[id]=(c[id]||0)+n;
 let total=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of READY){
  if(LIMITED.has(id))continue;
  const add=Math.min(4-(c[id]||0),50-total);
  if(add>0){c[id]+=add;total+=add;}
  if(total===50)break;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(usePack,c),[]);
 return c;
}
function kit(usePack=pack){
 const act=(s,action)=>dispatchUniversalAction(usePack,s,action);
 const legal=s=>legalUniversalActions(usePack,s);
 function pull(s,owner,id){
  const pl=s.players[owner];
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed']){
   const list=pl[zone];
   if(!Array.isArray(list))continue;
   const index=list.findIndex(c=>c?.cardId===id);
   if(index>=0)return list.splice(index,1)[0];
  }
  for(const line of ['front','energy']){
   const index=pl[line].findIndex(c=>c?.cardId===id);
   if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
  }
  throw Error('Missing '+id);
 }
 function hold(s,owner,id){
  const card=pull(s,owner,id);
  s.players[owner].hand.push(card);
  return card;
 }
 function seat(s,owner,id,line,slot,ready=true){
  const card=pull(s,owner,id);
  card.ready=ready;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner][line][slot]=card;
  return card;
 }
 function fuel(s,owner,ids){
  ids.forEach((id,i)=>{
   const card=pull(s,owner,id);
   card.ready=false;
   s.players[owner].energy[i]=card;
  });
 }
 function reach(s,phase){
  for(let i=0;i<8&&s.phase!==phase;i++){
   if(s.pending)throw Error(s.pending.kind+' before '+phase);
   s=act(s,{type:'next'});
  }
  if(s.phase!==phase)throw Error('Stopped in '+s.phase);
  return s;
 }
 function play(s,id,line='front'){
  const card=s.players[0].hand.find(c=>c.cardId===id)||hold(s,0,id);
  const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
  assert.ok(action,'no legal play for '+id+' '+line);
  return act(s,action);
 }
 function cast(s,id){
  const card=s.players[0].hand.find(c=>c.cardId===id)||hold(s,0,id);
  const action=legal(s).find(a=>a.type==='event'&&a.uid===card.uid);
  assert.ok(action,'no legal event for '+id);
  return act(s,action);
 }
 function fresh(seed,extra){
  const deck=counts(extra,usePack);
  return newUniversalMatch(usePack,{decks:[deck,deck],seed,first:0});
 }
 return {act,legal,pull,hold,seat,fuel,reach,play,cast,fresh};
}
const game=kit();
function probePack(id,extras){
 const cards=MHA_CARDS_051_100.map(card=>{
  const program=mhaProgramFor(card.id);
  return program?.ready===true?mhaBattleCard(card,program):null;
 }).filter(Boolean);
 return createUniversalPack({id,version:'probe',cards:[...cards,...extras]});
}
function readyAp(s,n){
 s.players[0].apCards.forEach((card,index)=>{
  if(index<n){card.inPlay=true;card.ready=true;}
 });
}
function emptyDeck(s,owner){
 s.players[owner].outside.push(...s.players[owner].deck.splice(0));
}

test('official 051–100 exist once, and only complete programs enter the pack',()=>{
 assert.equal(MHA_CARDS_051_100.length,50);
 assert.equal(MHA_OFFICIAL_MATCH_CLOSED.includes('尚未開放'),true);
 const ids=MHA_CARDS_051_100.map(card=>card.id);
 assert.deepEqual(ids,[...ids].sort((a,b)=>a.localeCompare(b,'en',{numeric:true})));
 for(const card of MHA_CARDS_051_100){
  assert.equal(card.battleReady,false,card.id);
  assert.equal(card.auto,false,card.id);
  assert.equal(card.deckLegal,true,card.id);
  assert.equal(card.set,'UA10BT');
  assert.equal(card.title,'mha');
  assert.match(card.number,/^UA10BT\/MHA-1-(0[5-9][0-9]|100)$/);
  assert.match(card.image,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\/UA10BT_MHA-1-/);
  assert.match(card.source,/unionarena-tcg\.com\/jp\/cardlist\/detail_iframe\.php\?card_no=UA10BT%2FMHA-1-/);
  assert.ok(card.nameJa&&card.effectJa,card.id);
  assert.ok(['character','event','field'].includes(card.type),card.id);
  assert.ok(['green','red'].includes(card.color),card.id);
 }
 assert.deepEqual(READY.filter(id=>!pack.cards[id]),[]);
 for(const id of OPEN){
  assert.equal(pack.cards[id],undefined,id);
  assert.notEqual(MHA_PROGRAMS_051_100[id]?.ready,true,id);
 }
 for(const id of READY)assert.equal(MHA_PROGRAMS_051_100[id].ready,true,id);
 for(const id of VIA_STARTER){
  assert.equal(MHA_PROGRAMS_051_100[id],undefined,id);
  assert.equal(pack.cards[id].effects.onPlay[0].op,'grantOwnFieldAttackKit');
  assert.equal(pack.cards[id].effects.onPlay[0].bp,2500);
  assert.deepEqual(pack.cards[id].effects.onPlay[0].sniperNames,['オールマイト','緑谷 出久']);
  assert.equal(pack.cards[id].triggerEffect.op,'retireOppFront');
 }
 assert.deepEqual(MHA_REQUESTS_051_100.map(row=>row.cardId),OPEN);
 for(const row of MHA_REQUESTS_051_100){
  assert.ok(row.sentence&&row.whyNotEnough&&row.proposal,row.cardId);
  assert.ok(row.existingOps.length,row.cardId);
 }
 assert.throws(()=>runMha051(null,null,{id:'MHA-1-051'}),/D 組還沒有/);
 assert.equal(new Set([...READY,...OPEN,...VIA_STARTER]).size,50);
});

test('MHA-1-052 lowers one opposing character of BP 1000 or more, on either line',()=>{
 let s=game.fresh(5201);
 const attacker=game.seat(s,0,'MHA-1-052','front',0);
 const front=game.seat(s,1,'MHA-1-079','front',0);
 const energy=game.seat(s,1,'MHA-1-073','energy',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,true);
 assert.ok(s.pending.choices.includes(front.uid));
 assert.ok(s.pending.choices.includes(energy.uid));
 const skipped=game.act(structuredClone(s),{type:'chooseTarget',uid:null});
 assert.equal(universalBp(pack,skipped,skipped.players[1].front[0]),3000);
 assert.equal(universalBp(pack,skipped,skipped.players[1].energy[0]),1000);
 s=game.act(s,{type:'chooseTarget',uid:energy.uid});
 assert.equal(universalBp(pack,s,s.players[1].energy[0]),500);
 assert.equal(universalBp(pack,s,s.players[1].front[0]),3000);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseTarget',uid:front.uid}),/not currently legal/);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-1-053 must choose this-turn BP or impact on attack, and only the chosen one resolves',()=>{
 let s=game.fresh(5301);
 const self=game.seat(s,0,'MHA-1-053','front',0);
 const low=game.seat(s,1,'MHA-1-078','front',0);
 s=game.reach(s,'main');
 assert.equal(game.legal(s).some(a=>a.type==='chooseEffectMode'),false);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.equal(s.pending.optional,false);
 assert.deepEqual(s.pending.options.map(o=>o.id),['bp','impact']);
 assert.equal(game.legal(s).some(a=>a.mode==='skip'),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseEffectMode',mode:'skip'}),/not currently legal|Invalid|Illegal/);
 const buffed=game.act(structuredClone(s),{type:'chooseEffectMode',mode:'bp'});
 const boosted=buffed.players[0].front.find(c=>c.uid===self.uid);
 assert.equal(universalBp(pack,buffed,boosted),4000);
 assert.equal(boosted.impactGranted,undefined);
 assert.equal(buffed.pending.kind,'block');
 const life=buffed.players[1].life.length;
 const won=game.act(buffed,{type:'chooseBlock',uid:low.uid});
 assert.equal(won.players[1].life.length,life);
 assert.ok(won.players[1].outside.some(c=>c.uid===low.uid));
 assert.equal(won.pending,null);
 assert.equal(assertUniversalMatch(pack,won),true);

 s=game.fresh(5302);
 const hitter=game.seat(s,0,'MHA-1-053','front',0);
 const wall=game.seat(s,1,'MHA-1-078','front',0);
 const tall=game.seat(s,1,'MHA-1-080','front',1);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:hitter.uid});
 const impacted=game.act(s,{type:'chooseEffectMode',mode:'impact'});
 const bearer=impacted.players[0].front.find(c=>c.uid===hitter.uid);
 assert.equal(universalBp(pack,impacted,bearer),3000);
 assert.equal(bearer.impactGranted.amount,1);
 assert.equal(bearer.impactGranted.turn,impacted.turn);
 const before=impacted.players[1].life.length;
 const hit=game.act(impacted,{type:'chooseBlock',uid:wall.uid});
 assert.equal(hit.players[1].life.length,before-1);
 assert.equal(hit.players[1].front.some(c=>c?.uid===tall.uid),true);
 assert.equal(assertUniversalMatch(pack,hit)===true||hit.pending?.kind==='life-trigger',true);

 s=game.fresh(5303);
 const loser=game.seat(s,0,'MHA-1-053','front',0);
 const bigger=game.seat(s,1,'MHA-1-080','front',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:loser.uid});
 s=game.act(s,{type:'chooseEffectMode',mode:'impact'});
 const lives=s.players[1].life.length;
 s=game.act(s,{type:'chooseBlock',uid:bigger.uid});
 assert.equal(s.players[1].life.length,lives);
 assert.equal(s.players[0].front.some(c=>c?.uid===loser.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===bigger.uid),true);

 s=game.fresh(5304);
 const climber=game.seat(s,0,'MHA-1-053','front',0);
 const rival=game.seat(s,1,'MHA-1-080','front',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:climber.uid});
 s=game.act(s,{type:'chooseEffectMode',mode:'bp'});
 const still=s.players[1].life.length;
 s=game.act(s,{type:'chooseBlock',uid:rival.uid});
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c.uid===climber.uid)),4000);
 assert.equal(s.players[1].life.length,still);
 assert.ok(s.players[1].outside.some(c=>c.uid===rival.uid));
 assert.equal(s.players[0].front.find(c=>c.uid===climber.uid).impactGranted,undefined);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-1-057, 078, 082 and 088 have no printed effect and enter rested',()=>{
 for(const [id,color] of [['MHA-1-057','green'],['MHA-1-078','red'],['MHA-1-082','red'],['MHA-1-088','red']]){
  let s=game.fresh(5700+Number(id.slice(-3)));
  if(color==='green')game.fuel(s,0,['MHA-1-057']);
  s=game.reach(s,'main');
  s=game.play(s,id);
  assert.equal(s.pending,null);
  const entered=s.players[0].front.find(c=>c?.cardId===id);
  assert.equal(entered.ready,false);
  assert.equal(pack.cards[id].implementation,'vanilla');
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('MHA-1-058 draws one and puts one hand card outside, and an empty deck still asks',()=>{
 let s=game.fresh(5801);
 game.fuel(s,0,['MHA-1-057']);
 s=game.reach(s,'main');
 game.hold(s,0,'MHA-1-058');
 const hand=s.players[0].hand.length;
 s=game.play(s,'MHA-1-058');
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,hand);
 const discard=s.players[0].hand[0];
 s=game.act(s,{type:'chooseDiscard',uid:discard.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5802);
 game.fuel(s,0,['MHA-1-057']);
 s=game.reach(s,'main');
 emptyDeck(s,0);
 const only=game.hold(s,0,'MHA-1-058');
 s=game.play(s,'MHA-1-058');
 assert.equal(s.pending.kind,'effect-discard');
 assert.ok(s.players[0].hand.some(c=>c.uid!==only.uid));
});

test('MHA-1-061 draws one and does not invent a card from an empty deck',()=>{
 let s=game.fresh(6101);
 game.fuel(s,0,['MHA-1-057','MHA-1-057']);
 s=game.reach(s,'main');
 game.hold(s,0,'MHA-1-061');
 const deck=s.players[0].deck.length;
 s=game.play(s,'MHA-1-061');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6102);
 game.fuel(s,0,['MHA-1-057','MHA-1-057']);
 s=game.reach(s,'main');
 emptyDeck(s,0);
 const missing=game.hold(s,0,'MHA-1-061');
 const hand=s.players[0].hand.length;
 s=game.play(s,'MHA-1-061');
 assert.equal(s.players[0].hand.some(c=>c.uid===missing.uid),false);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.pending,null);
});

test('MHA-1-064 retires at 3000, and 5000 only while Mirio is on the field',()=>{
 let s=game.fresh(6401);
 game.fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 const low=game.seat(s,1,'MHA-1-079','front',0);
 const high=game.seat(s,1,'MHA-1-080','front',1);
 s=game.reach(s,'main');
 s=game.cast(s,'MHA-1-064');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,3000);
 assert.deepEqual(s.pending.choices,[low.uid]);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseRetireBp',uid:high.uid}),/not currently legal|Illegal/);
 s=game.act(s,{type:'chooseRetireBp',uid:low.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===low.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===high.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 const mirio={id:'MHA-PROBE-MIRIO',name:'通形 ミリオ',color:'green',type:'character',
  energy:0,ap:1,bp:1500,gen:1,implementation:'vanilla',effects:{}};
 const tall={id:'MHA-PROBE-TALL',name:'高BP',color:'green',type:'character',
  energy:0,ap:1,bp:6000,gen:1,implementation:'vanilla',effects:{}};
 const probe=probePack('mha-probe-064',[mirio,tall]);
 const local=kit(probe);
 s=local.fresh(6402,{'MHA-PROBE-MIRIO':1,'MHA-PROBE-TALL':1});
 local.fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057','MHA-1-057']);
 local.seat(s,0,'MHA-PROBE-MIRIO','front',0);
 const mid=local.seat(s,1,'MHA-1-080','front',0);
 const over=local.seat(s,1,'MHA-PROBE-TALL','front',1);
 s=local.reach(s,'main');
 s=local.cast(s,'MHA-1-064');
 assert.equal(s.pending.limit,5000);
 assert.ok(s.pending.choices.includes(mid.uid));
 assert.equal(s.pending.choices.includes(over.uid),false);
 s=local.act(s,{type:'chooseRetireBp',uid:mid.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===mid.uid));
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('MHA-1-065 and 098 activate up to two rested AP cards and may stop early',()=>{
 for(const id of ['MHA-1-065','MHA-1-098']){
  let s=game.fresh(6500+Number(id.slice(-2)));
  const color=id==='MHA-1-065'?'MHA-1-057':'MHA-1-078';
  const need=id==='MHA-1-065'?4:3;
  game.fuel(s,0,Array(need).fill(color));
  s=game.reach(s,'main');
  const ap=s.players[0].apCards;
  ap.forEach((card,index)=>{card.inPlay=true;card.ready=index===0;});
  s=game.cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  assert.ok(game.legal(s).some(a=>a.uid===null));
  const first=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  s=game.act(s,{type:'chooseApRecovery',uid:first.uid});
  assert.equal(s.players[0].apCards.find(c=>c.uid===first.uid).ready,true);
  s=game.act(s,{type:'chooseApRecovery',uid:null});
  assert.equal(s.players[0].apCards.some(c=>c.inPlay&&!c.ready),true);
  assert.equal(s.pending,null);

  s=game.fresh(6600+Number(id.slice(-2)));
  game.fuel(s,0,Array(need).fill(color));
  s=game.reach(s,'main');
  s.players[0].apCards.forEach((card,index)=>{card.inPlay=index===0;card.ready=index===0;});
  s=game.cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  const paid=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&!c.ready).length,1);
  s=game.act(s,{type:'chooseApRecovery',uid:paid.uid});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].apCards.find(c=>c.uid===paid.uid).ready,true);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('MHA-1-067 removes impact from the character it battles',()=>{
 let s=game.fresh(6701);
 const self=game.seat(s,0,'MHA-1-067','front',0);
 s=game.reach(s,'main');
 assert.equal(universalImpactNull(pack,s,s.players[0].front.find(c=>c.uid===self.uid)),true);
 const hitter={id:'MHA-PROBE-HIT',name:'試打',color:'red',type:'character',energy:0,ap:1,
  bp:5000,gen:1,implementation:'dsl',printedImpact:1,effects:{}};
 const probe=probePack('mha-probe-067',[hitter]);
 const local=kit(probe);
 s=local.fresh(6702,{'MHA-PROBE-HIT':1});
 const attacker=local.seat(s,0,'MHA-PROBE-HIT','front',0);
 const wall=local.seat(s,1,'MHA-1-067','front',0);
 const plain=local.seat(s,1,'MHA-1-078','front',1);
 s=local.reach(s,'attack');
 const life=s.players[1].life.length;
 let blocked=local.act(s,{type:'attack',uid:attacker.uid});
 assert.equal(blocked.pending.kind,'block');
 blocked=local.act(blocked,{type:'chooseBlock',uid:wall.uid});
 assert.equal(blocked.players[1].life.length,life);
 assert.ok(blocked.players[1].outside.some(c=>c.uid===wall.uid));

 s=local.fresh(6703,{'MHA-PROBE-HIT':1});
 const again=local.seat(s,0,'MHA-PROBE-HIT','front',0);
 local.seat(s,1,'MHA-1-078','front',0);
 s=local.reach(s,'attack');
 const before=s.players[1].life.length;
 s=local.act(s,{type:'attack',uid:again.uid});
 s=local.act(s,{type:'chooseBlock',uid:s.players[1].front.find(c=>c?.cardId==='MHA-1-078').uid});
 assert.equal(s.players[1].life.length,before-1);
 assert.equal(plain.cardId,'MHA-1-078');
 assert.equal(assertUniversalMatch(probe,s)===true||s.pending?.kind==='life-trigger',true);
});

test('MHA-1-068 rests itself and must buff one other character',()=>{
 let s=game.fresh(6801);
 const self=game.seat(s,0,'MHA-1-068','front',0);
 const other=game.seat(s,0,'MHA-1-078','energy',0);
 s=game.reach(s,'main');
 const action=game.legal(s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='selfRestBuff');
 assert.ok(action);
 s=game.act(s,action);
 assert.equal(s.players[0].front.find(c=>c.uid===self.uid).ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 assert.deepEqual(s.pending.choices,[other.uid]);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseOwnBuff',uid:self.uid}),/not currently legal|Illegal|Mandatory/);
 s=game.act(s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(pack,s,s.players[0].energy[0]),2500);
 s.players[0].front.find(c=>c.uid===self.uid).ready=true;
 assert.ok(game.legal(s).some(a=>a.type==='activate'&&a.uid===self.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6802);
 const alone=game.seat(s,0,'MHA-1-068','front',0);
 s=game.reach(s,'main');
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===alone.uid),false);
});

test('MHA-1-069 cuts hand energy only while the opponent has purple or green',()=>{
 let s=game.fresh(6901);
 const printed=pack.cards['MHA-1-069'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),3);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),3);
 game.seat(s,1,'MHA-1-057','energy',0);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 game.seat(s,0,'MHA-1-057','front',0);
 s.players[1].energy[0]=null;
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),3);
 const purple={id:'MHA-PROBE-PURPLE',name:'紫試',color:'purple',type:'character',
  energy:0,ap:1,bp:1500,gen:1,implementation:'vanilla',effects:{}};
 const red={id:'MHA-PROBE-RED',name:'赤試',color:'red',type:'character',
  energy:0,ap:1,bp:1500,gen:1,implementation:'vanilla',effects:{}};
 const probe=probePack('mha-probe-069',[purple,red]);
 const local=kit(probe);
 s=local.fresh(6902,{'MHA-PROBE-PURPLE':1,'MHA-PROBE-RED':1});
 local.seat(s,1,'MHA-PROBE-RED','front',0);
 assert.equal(zoneRequiredEnergy(probe,s,0,probe.cards['MHA-1-069'],'hand'),3);
 local.seat(s,1,'MHA-PROBE-PURPLE','energy',0);
 assert.equal(zoneRequiredEnergy(probe,s,0,probe.cards['MHA-1-069'],'hand'),2);
 assert.equal(zoneRequiredEnergy(probe,s,0,probe.cards['MHA-1-069'],'life'),3);
});

test('MHA-1-070 pays one hand card to outside once per turn and actives itself',()=>{
 let s=game.fresh(7001,{'MHA-1-070':3});
 const self=game.seat(s,0,'MHA-1-070','energy',0,false);
 const keep=game.hold(s,0,'MHA-1-078');
 const pay=game.hold(s,0,'MHA-1-082');
 const spare=s.players[0].hand.filter(c=>c.uid!==keep.uid&&c.uid!==pay.uid);
 s.players[0].deck.push(...spare);
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid===keep.uid||c.uid===pay.uid);
 s=game.reach(s,'main');
 const modes=game.legal(s).filter(a=>a.type==='activate'&&a.uid===self.uid);
 assert.deepEqual(modes.map(a=>a.mode),['outside']);
 s=game.act(s,modes[0]);
 assert.equal(s.pending.kind,'effect-mode-discard');
 const window=game.legal(s).filter(a=>a.type==='chooseModeDiscard').map(a=>a.uid);
 assert.deepEqual(window.slice().sort(),[keep.uid,pay.uid].sort());
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseModeDiscard',uid:self.uid}),/not currently legal/);
 s=game.act(s,{type:'chooseModeDiscard',uid:pay.uid});
 assert.equal(s.players[0].energy.find(c=>c?.uid===self.uid).ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===pay.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===keep.uid));
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const copy=game.seat(s,0,'MHA-1-070','front',0,false);
 assert.deepEqual(game.legal(s).filter(a=>a.type==='activate'&&a.uid===copy.uid).map(a=>a.mode),['outside']);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7002);
 const front=game.seat(s,0,'MHA-1-070','front',0,true);
 const only=game.hold(s,0,'MHA-1-078');
 s.players[0].deck.push(...s.players[0].hand.filter(c=>c.uid!==only.uid));
 s.players[0].hand=[only];
 s=game.reach(s,'main');
 s=game.act(s,game.legal(s).find(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='outside'));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c.uid===front.uid).ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===only.uid));
 assert.equal(s.players[0].hand.length,0);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===front.uid),false);
 s=game.act(s,{type:'next'});
 s=passTo(s,0,'main');
 const returned=s.players[0].front.find(c=>c?.uid===front.uid)||
  s.players[0].energy.find(c=>c?.uid===front.uid);
 assert.ok(returned);
 game.hold(s,0,'MHA-1-082');
 assert.ok(game.legal(s).some(a=>a.type==='activate'&&a.uid===returned.uid&&a.mode==='outside'));

 s=game.fresh(7003);
 const dry=game.seat(s,0,'MHA-1-070','front',0,false);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s=game.reach(s,'main');
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===dry.uid),false);

 const ttg=createTtgV2Pack();
 const opened=probeMatch([shell(ttg.cards['TTG-1-050'])],7004);
 const local=kit(opened.usePack);
 let mixed=opened.s;
 const iida=local.seat(mixed,0,'MHA-1-070','front',0,false);
 const kamina=local.seat(mixed,0,'TTG-1-050','energy',0,true);
 local.hold(mixed,0,'MHA-1-078');
 mixed=local.reach(mixed,'main');
 assert.deepEqual(local.legal(mixed).filter(a=>a.type==='activate'&&a.uid===iida.uid).map(a=>a.mode),['outside']);
 assert.deepEqual(local.legal(mixed).filter(a=>a.type==='activate'&&a.uid===kamina.uid).map(a=>a.mode).sort(),
  ['active','bp','energy']);
 assert.equal(assertUniversalMatch(opened.usePack,mixed),true);
});

test('MHA-1-073 rests, gains one energy, retires at end of main, and cannot repeat',()=>{
 let s=game.fresh(7301);
 const seated=game.seat(s,0,'MHA-1-073','front',0);
 s=game.reach(s,'main');
 s=game.act(s,game.legal(s).find(a=>a.type==='activate'&&a.uid===seated.uid));
 const used=s.players[0].front.find(c=>c.uid===seated.uid);
 assert.equal(used.ready,false);
 assert.equal(used.buffs.some(b=>b.energy===1),true);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===seated.uid),false);
 for(let i=0;i<6&&!s.players[0].outside.some(c=>c.uid===seated.uid);i++){
  if(s.pending)break;
  s=game.act(s,{type:'next'});
 }
 assert.ok(s.players[0].outside.some(c=>c.uid===seated.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7302);
 s=game.reach(s,'main');
 s=game.play(s,'MHA-1-073');
 const played=s.players[0].front.find(c=>c?.cardId==='MHA-1-073');
 assert.equal(played.ready,false);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===played.uid),false);
 const energy=game.seat(s,0,'MHA-1-073','energy',0,true);
 assert.ok(game.legal(s).some(a=>a.type==='activate'&&a.uid===energy.uid));
});

test('MHA-1-075 looks at the top card privately and puts it on top or bottom',()=>{
 let s=game.fresh(7501);
 s=game.reach(s,'main');
 game.hold(s,0,'MHA-1-075');
 const secret=s.players[0].deck[0];
 const second=s.players[0].deck[1];
 s=game.play(s,'MHA-1-075');
 assert.equal(s.pending.kind,'private-top-place');
 const hidden=universalPublicView(pack,s,1);
 assert.equal(JSON.stringify(hidden.pending??{}).includes(secret.cardId),false);
 s=game.act(s,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(s.players[0].deck[0].uid,second.uid);
 assert.equal(s.players[0].deck.at(-1).uid,secret.uid);
 assert.equal(s.pending,null);

 s=game.fresh(7502);
 s=game.reach(s,'main');
 game.hold(s,0,'MHA-1-075');
 const kept=s.players[0].deck[0];
 s=game.play(s,'MHA-1-075');
 s=game.act(s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.players[0].deck[0].uid,kept.uid);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7503);
 s=game.reach(s,'main');
 emptyDeck(s,0);
 s=game.play(s,'MHA-1-075');
 assert.equal(s.pending,null);
});

test('MHA-1-077 bounces another energy-1 character, or itself when none qualifies',()=>{
 let s=game.fresh(7701);
 game.fuel(s,0,['MHA-1-068']);
 const other=game.seat(s,0,'MHA-1-082','front',0);
 const tall=game.seat(s,0,'MHA-1-079','front',1);
 s=game.reach(s,'main');
 const self=s.players[0].hand.find(c=>c.cardId==='MHA-1-077')||game.hold(s,0,'MHA-1-077');
 s=game.play(s,'MHA-1-077');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.ok(s.pending.choices.includes(other.uid));
 assert.equal(s.pending.choices.includes(tall.uid),false);
 assert.equal(s.pending.choices.includes(self.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 s=game.act(s,{type:'chooseOwnBounce',uid:other.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===other.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===self.uid));

 s=game.fresh(7702);
 game.fuel(s,0,['MHA-1-068']);
 game.seat(s,0,'MHA-1-079','front',0);
 s=game.reach(s,'main');
 const bounced=game.hold(s,0,'MHA-1-077');
 s=game.play(s,'MHA-1-077');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===bounced.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===bounced.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-1-079 may buff one other character on attack and cannot buff itself',()=>{
 let s=game.fresh(7901);
 const attacker=game.seat(s,0,'MHA-1-079','front',0);
 const other=game.seat(s,0,'MHA-1-078','energy',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[other.uid]);
 const skipped=game.act(structuredClone(s),{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(pack,skipped,skipped.players[0].energy[0]),1500);
 s=game.act(s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(pack,s,s.players[0].energy[0]),2000);
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c.uid===attacker.uid)),3000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7902);
 const alone=game.seat(s,0,'MHA-1-079','front',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:alone.uid});
 assert.notEqual(s.pending?.kind,'effect-buff-own');
});

test('MHA-1-080 enters active, draws two, and puts one hand card outside',()=>{
 let s=game.fresh(8001);
 game.fuel(s,0,['MHA-1-078','MHA-1-078','MHA-1-078']);
 s=game.reach(s,'main');
 readyAp(s,2);
 game.hold(s,0,'MHA-1-080');
 const deck=s.players[0].deck.length;
 s=game.play(s,'MHA-1-080');
 const entered=s.players[0].front.find(c=>c?.cardId==='MHA-1-080');
 assert.equal(entered.ready,true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.kind,'effect-discard');
 const discard=s.players[0].hand.find(c=>c.cardId!=='MHA-1-080');
 s=game.act(s,{type:'chooseDiscard',uid:discard.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8002);
 s=game.reach(s,'main');
 const poor=game.hold(s,0,'MHA-1-080');
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===poor.uid),false);
});

test('MHA-1-083 and 094 can step from the front, and a front character without it cannot',()=>{
 let s=game.fresh(8301);
 const step=game.seat(s,0,'MHA-1-083','front',0);
 const other=game.seat(s,0,'MHA-1-094','front',1);
 const plain=game.seat(s,0,'MHA-1-078','front',2);
 s=game.reach(s,'move');
 assert.ok(game.legal(s).some(a=>a.type==='step'&&a.uid===step.uid));
 assert.ok(game.legal(s).some(a=>a.type==='step'&&a.uid===other.uid));
 assert.equal(game.legal(s).some(a=>a.type==='step'&&a.uid===plain.uid),false);
 s=game.act(s,game.legal(s).find(a=>a.type==='step'&&a.uid===step.uid));
 assert.ok(s.players[0].energy.some(c=>c?.uid===step.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===step.uid),false);
 s=game.reach(s,'main');
 assert.equal(game.legal(s).some(a=>a.type==='step'),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-1-086 generates one extra energy only while active on the energy line',()=>{
 let s=game.fresh(8601);
 const active=game.seat(s,0,'MHA-1-086','energy',0,true);
 const rested=game.seat(s,0,'MHA-1-086','energy',1,false);
 const front=game.seat(s,0,'MHA-1-086','front',0,true);
 s=game.reach(s,'main');
 assert.equal(universalCardEnergy(pack,s,0,s.players[0].energy[0]),2);
 assert.equal(universalCardEnergy(pack,s,0,s.players[0].energy[1]),1);
 assert.equal(universalCardEnergy(pack,s,0,s.players[0].front[0]),0);
 assert.equal(active.cardId,'MHA-1-086');
 assert.equal(rested.ready,false);
 assert.equal(front.ready,true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-1-092 may buff one other character on entry and can decline',()=>{
 let s=game.fresh(9201);
 game.fuel(s,0,['MHA-1-078']);
 const other=game.seat(s,0,'MHA-1-082','front',0);
 s=game.reach(s,'main');
 s=game.play(s,'MHA-1-092');
 const self=s.players[0].front.find(c=>c?.cardId==='MHA-1-092');
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.ok(s.pending.choices.includes(other.uid));
 assert.equal(s.pending.choices.includes(self.uid),false);
 assert.equal(s.pending.choices.every(uid=>{
  const card=s.players[0].front.find(c=>c?.uid===uid)||s.players[0].energy.find(c=>c?.uid===uid);
  return card&&card.uid!==self.uid;
 }),true);
 const skipped=game.act(structuredClone(s),{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(pack,skipped,skipped.players[0].front.find(c=>c.uid===other.uid)),1500);
 s=game.act(s,{type:'chooseOwnBuff',uid:other.uid});
 assert.equal(universalBp(pack,s,s.players[0].front.find(c=>c.uid===other.uid)),2500);
 assert.equal(universalBp(pack,skipped,skipped.players[0].energy.find(Boolean)),1500);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-1-097 retires at 3000, and 5000 only while Bakugo is on the field',()=>{
 let s=game.fresh(9701);
 game.fuel(s,0,['MHA-1-078','MHA-1-078','MHA-1-078','MHA-1-078']);
 const low=game.seat(s,1,'MHA-1-079','front',0);
 const high=game.seat(s,1,'MHA-1-080','front',1);
 s=game.reach(s,'main');
 s=game.cast(s,'MHA-1-097');
 assert.equal(s.pending.limit,3000);
 assert.deepEqual(s.pending.choices,[low.uid]);
 s=game.act(s,{type:'chooseRetireBp',uid:low.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===low.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===high.uid));

 s=game.fresh(9702);
 game.fuel(s,0,['MHA-1-078','MHA-1-078','MHA-1-078','MHA-1-078']);
 game.seat(s,0,'MHA-1-082','front',0);
 const mid=game.seat(s,1,'MHA-1-080','front',0);
 s=game.reach(s,'main');
 s=game.cast(s,'MHA-1-097');
 assert.equal(s.pending.limit,5000);
 assert.ok(s.pending.choices.includes(mid.uid));
 s=game.act(s,{type:'chooseRetireBp',uid:mid.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===mid.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(9703);
 game.fuel(s,0,['MHA-1-078','MHA-1-078','MHA-1-078','MHA-1-078']);
 s=game.reach(s,'main');
 s=game.cast(s,'MHA-1-097');
 assert.equal(s.pending,null);
});

function settle(s,tools=game){
 let guard=0;
 while(s.pending){
  const legal=tools.legal(s);
  const kind=s.pending.kind;
  const action=kind==='life-trigger'?legal.find(a=>a.type==='chooseTrigger'&&a.mode==='skip'):
   kind==='life-batch-order'?legal.find(a=>a.type==='chooseLifeOrder')||legal[0]:
   kind==='attack-life-target'?legal[0]:
   kind==='end-hand-limit'?legal[0]:null;
  if(!action)break;
  s=tools.act(s,action);
  if(++guard>12)throw Error('Could not settle '+kind);
 }
 return s;
}
function passTo(s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  s=settle(s);
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+player+' '+phase);
  if(s.active===player&&s.phase===phase)break;
  s=game.act(s,{type:'next'});
  if(++guard>40)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function shell(card){
 return {
  id:card.id,name:card.name,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen||0,traits:[...(card.traits||[])],
  trigger:card.trigger??null,implementation:card.implementation,effects:card.effects,
  ...(card.unblockedAttack?{unblockedAttack:card.unblockedAttack}:{}),
  ...(card.triggerEffect?{triggerEffect:card.triggerEffect}:{}),
  ...(card.raidName?{raidName:card.raidName}:{}),
  ...(card.blockBpRestriction?{blockBpRestriction:card.blockBpRestriction}:{}),
  ...(Array.isArray(card.printedMains)&&card.printedMains.length?{printedMains:card.printedMains}:{})
 };
}
function probeMatch(extras,seed){
 const ready=MHA_CARDS_051_100.map(card=>{
  const program=mhaProgramFor(card.id);
  return program?.ready===true?mhaBattleCard(card,program):null;
 }).filter(Boolean);
 const bodies=[...ready,...extras];
 const usePack=createUniversalPack({id:'mha-d11',version:'probe-'+seed,cards:bodies});
 const counts={};
 let total=0;
 for(const card of extras){counts[card.id]=1;total+=1;}
 for(const card of ready){
  if(total>=50)break;
  counts[card.id]=1;total+=1;
 }
 for(const card of [...extras,...ready]){
  if(total>=50)break;
  const room=4-(counts[card.id]||0);
  const n=Math.min(room,50-total);
  if(n>0){counts[card.id]+=n;total+=n;}
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(usePack,counts),[]);
 let s=newUniversalMatch(usePack,{decks:[counts,counts],seed,first:0});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error(s.pending.kind+' before probe main');
  s=dispatchUniversalAction(usePack,s,{type:'next'});
 }
 assert.equal(s.phase,'main');
 return {usePack,s};
}

test('MHA-1-051 blocks only above 3000, draws once when not blocked, and replays the raid bottom',()=>{
 let s=game.fresh(5101,{'MHA-1-051':3});
 const self=game.seat(s,0,'MHA-1-051','front',0);
 const low=game.seat(s,1,'MHA-1-053','front',0);
 const high=game.seat(s,1,'MHA-1-080','front',1);
 s=game.reach(s,'attack');
 const hand=s.players[0].hand.length;
 const deck=s.players[0].deck.length;
 s=game.act(s,{type:'attack',uid:self.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(game.legal(s).some(a=>a.type==='chooseBlock'&&a.uid===low.uid),false);
 assert.ok(game.legal(s).some(a=>a.type==='chooseBlock'&&a.uid===high.uid));
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseBlock',uid:low.uid}),
  /not currently legal|Invalid|Illegal/);
 s=game.act(s,{type:'chooseBlock',uid:high.uid});
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.mainAbilityUsedUids.includes(self.uid+'|unblockedOnce'),false);
 assert.ok(s.players[1].outside.some(c=>c.uid===high.uid));
 assert.equal(s.pending,null);
 s.players[0].front.find(c=>c.uid===self.uid).ready=true;
 s=game.act(s,{type:'attack',uid:self.uid});
 s=game.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.ok(s.mainAbilityUsedUids.includes(self.uid+'|unblockedOnce'));
 s=settle(s);
 assert.equal(s.pending,null);
 s.players[0].front.find(c=>c.uid===self.uid).ready=true;
 const once=s.players[0].hand.length;
 s=game.act(s,{type:'attack',uid:self.uid});
 s=game.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,once);
 s=settle(s);

 s=game.fresh(5102,{'MHA-1-051':3});
 const quiet=game.seat(s,0,'MHA-1-051','front',0);
 game.seat(s,1,'MHA-1-053','front',0);
 s=game.reach(s,'attack');
 emptyDeck(s,0);
 const emptyHand=s.players[0].hand.length;
 s=game.act(s,{type:'attack',uid:quiet.uid});
 s=game.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,emptyHand);
 assert.equal(s.players[0].deck.length,0);
 assert.ok(s.mainAbilityUsedUids.includes(quiet.uid+'|unblockedOnce'));
 s=settle(s);
 s.players[0].front.find(c=>c.uid===quiet.uid).ready=true;
 s=game.act(s,{type:'attack',uid:quiet.uid});
 s=game.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,emptyHand);

 s=game.fresh(5103,{'MHA-1-051':3});
 const raider=game.seat(s,0,'MHA-1-051','front',0);
 const base=game.pull(s,0,'MHA-1-061');
 raider.stack=[base];
 game.seat(s,0,'MHA-1-051','front',1);
 game.seat(s,0,'MHA-1-051','front',2);
 game.seat(s,0,'MHA-1-051','energy',0);
 const hitter=game.seat(s,1,'MHA-1-051','front',0);
 s=passTo(s,1,'attack');
 const drawn=s.players[0].hand.length;
 s=game.act(s,{type:'attack',uid:hitter.uid});
 s=game.act(s,{type:'chooseBlock',uid:raider.uid});
 assert.equal(s.pending.kind,'effect-raid-bottom-active');
 assert.equal(s.pending.baseUid,base.uid);
 const entries=game.legal(s).filter(a=>a.type==='chooseRaidBottomActive'&&a.uid===base.uid);
 assert.ok(entries.length);
 assert.equal(entries.every(a=>a.line==='front'),true);
 assert.ok(game.legal(s).some(a=>a.type==='chooseRaidBottomActive'&&a.uid===null));
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseRaidBottomActive',uid:base.uid,line:'energy',slot:0}),
  /not currently legal|Illegal raid-bottom/);
 s=game.act(s,entries.find(a=>a.slot===0));
 const entered=s.players[0].front.find(c=>c?.uid===base.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.players[0].energy.some(c=>c?.uid===base.uid),false);
 assert.equal(s.players[0].hand.length,drawn+1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5104,{'MHA-1-051':3});
 const declining=game.seat(s,0,'MHA-1-051','front',0);
 const kept=game.pull(s,0,'MHA-1-057');
 declining.stack=[kept];
 game.seat(s,0,'MHA-1-051','front',1);
 game.seat(s,0,'MHA-1-051','front',2);
 game.seat(s,0,'MHA-1-051','energy',0);
 const swinger=game.seat(s,1,'MHA-1-051','front',0);
 s=passTo(s,1,'attack');
 s=game.act(s,{type:'attack',uid:swinger.uid});
 s=game.act(s,{type:'chooseBlock',uid:declining.uid});
 s=game.act(s,{type:'chooseRaidBottomActive',uid:null});
 assert.ok(s.players[0].outside.some(c=>c.uid===kept.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===kept.uid),false);
 assert.equal(s.pending,null);

 s=game.fresh(5105,{'MHA-1-051':3});
 const small=game.seat(s,0,'MHA-1-051','front',0);
 const buried=game.pull(s,0,'MHA-1-057');
 small.stack=[buried];
 game.seat(s,0,'MHA-1-051','front',1);
 const hidden=game.seat(s,0,'MHA-1-051','front',2);
 hidden.faceDown=true;
 game.seat(s,0,'MHA-1-051','energy',0);
 game.seat(s,0,'MHA-1-080','energy',1);
 const hammer=game.seat(s,1,'MHA-1-051','front',0);
 s=passTo(s,1,'attack');
 s=game.act(s,{type:'attack',uid:hammer.uid});
 s=game.act(s,{type:'chooseBlock',uid:small.uid});
 assert.notEqual(s.pending?.kind,'effect-raid-bottom-active');
 assert.ok(s.players[0].outside.some(c=>c.uid===buried.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 const filler=id=>({
  id,name:id,color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}
 });
 assert.throws(()=>createUniversalPack({id:'bad-051',version:'bad',cards:[
  {id:'BAD-051',name:'壞',color:'green',type:'character',energy:1,ap:1,bp:2000,gen:1,
   traits:[],trigger:null,implementation:'dsl',effects:{},
   unblockedAttack:{oncePerTurn:true,optional:true,then:[{op:'draw',count:1}]}},
  ...Array.from({length:12},(_,i)=>filler('BAD-'+i))
 ]}),/invalid optional unblocked-attack/);
});

test('MHA-1-054 publishes one cheap green field and does not discard a hand card',()=>{
 const imc=createImcV2Pack();
 const extras=[
  {id:'WIN-FIELD',name:'合格場域',color:'green',type:'field',energy:2,ap:1,bp:0,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-COST',name:'太貴場域',color:'green',type:'field',energy:3,ap:1,bp:0,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-CHAR',name:'綠角色',color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-BLUE',name:'藍場域',color:'blue',type:'field',energy:1,ap:1,bp:0,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-EVENT',name:'綠事件',color:'green',type:'event',energy:1,ap:1,bp:0,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-BLUE-CHAR',name:'藍能源',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-GREEN-1',name:'綠能源',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-GREEN-2',name:'綠能源二',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-PAD-1',name:'填充一',color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-PAD-2',name:'填充二',color:'red',type:'character',energy:1,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'WIN-LIPPS',name:'特徵',color:'blue',type:'character',energy:1,ap:1,bp:1000,gen:1,
   traits:['LiPPS'],trigger:null,implementation:'vanilla',effects:{}},
  shell(imc.cards['IMC-1-056']),
  shell(imc.cards['IMC-1-061'])
 ];
 const opened=probeMatch(extras,5401);
 const usePack=opened.usePack;
 const local=kit(usePack);
 let s=opened.s;
 const pullTop=(ids)=>{
  const cards=ids.map(id=>local.pull(s,0,id));
  s.players[0].deck.unshift(...cards);
  return cards;
 };
 local.fuel(s,0,['WIN-GREEN-1','WIN-GREEN-2']);
 readyAp(s,2);
 const [ok,cost,person,blue,event]=pullTop([
  'WIN-FIELD','WIN-COST','WIN-CHAR','WIN-BLUE','WIN-EVENT','WIN-PAD-1','WIN-PAD-2']);
 local.hold(s,0,'MHA-1-054');
 const before=s.players[0].hand.length;
 s=local.play(s,'MHA-1-054');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.discard,false);
 assert.equal(s.pending.uids.length,7);
 assert.deepEqual(s.pending.choices,[ok.uid]);
 for(const card of [cost,person,blue,event])assert.ok(s.pending.uids.includes(card.uid));
 assert.equal(s.publicReveals.some(r=>r.kind==='revealed-window'),false);
 const mine=universalPrivateChoices(usePack,s,0);
 assert.equal(mine.inspected.length,7);
 assert.ok(mine.inspected.some(c=>c.cardId==='WIN-COST'));
 assert.ok(mine.inspected.some(c=>c.cardId==='WIN-CHAR'));
 assert.ok(mine.inspected.some(c=>c.cardId==='WIN-EVENT'));
 assert.equal(universalPrivateChoices(usePack,s,1),null);
 assert.throws(()=>local.act(structuredClone(s),{type:'chooseTopFiltered',uid:cost.uid}),
  /not currently legal|Filtered top search/);
 const declined=local.act(structuredClone(s),{type:'chooseTopFiltered',uid:null});
 assert.equal(declined.pending.kind,'effect-top-order');
 assert.equal(declined.pending.discardAfter,undefined);
 assert.equal(declined.players[0].hand.length,before-1);
 let ordered=declined;
 let guard=0;
 while(ordered.pending?.kind==='effect-top-order'){
  const uid=ordered.pending.uids.find(id=>!ordered.pending.order.includes(id));
  ordered=local.act(ordered,{type:'chooseTopOrder',uid});
  if(++guard>8)throw Error('order');
 }
 assert.equal(ordered.pending,null);
 assert.equal(ordered.players[0].hand.length,before-1);
 assert.equal(ordered.players[0].hand.some(c=>c.uid===ok.uid),false);
 assert.equal(ordered.publicReveals.some(r=>r.kind==='searched-to-hand'),false);

 s=local.act(s,{type:'chooseTopFiltered',uid:ok.uid});
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.discardAfter,undefined);
 assert.ok(s.players[0].hand.some(c=>c.uid===ok.uid));
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.publicReveals.filter(r=>r.kind==='searched-to-hand').length,1);
 assert.equal(s.publicReveals.find(r=>r.kind==='searched-to-hand').cardId,'WIN-FIELD');
 guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=local.act(s,{type:'chooseTopOrder',uid});
  if(++guard>8)throw Error('order');
 }
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.players[0].hand.some(c=>c.cardId==='MHA-1-054'),false);
 assert.equal(assertUniversalMatch(usePack,s),true);

 const short=probeMatch(extras,5402);
 s=short.s;
 const shortKit=kit(short.usePack);
 shortKit.fuel(s,0,['WIN-GREEN-1','WIN-GREEN-2']);
 readyAp(s,2);
 s.players[0].outside.push(...s.players[0].deck.splice(0));
 const window=['WIN-FIELD','WIN-COST','WIN-CHAR'].map(id=>shortKit.pull(s,0,id));
 s.players[0].deck.unshift(...window);
 shortKit.hold(s,0,'MHA-1-054');
 s=shortKit.play(s,'MHA-1-054');
 assert.equal(s.pending.uids.length,3);
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 s=shortKit.act(s,{type:'chooseTopFiltered',uid:window[0].uid});
 assert.equal(s.pending?.kind==='effect-discard',false);
 assert.equal(assertUniversalMatch(short.usePack,s),true);

 const contrast=probeMatch(extras,5403);
 s=contrast.s;
 const other=kit(contrast.usePack);
 other.fuel(s,0,['WIN-BLUE-CHAR']);
 readyAp(s,2);
 const lipps=other.pull(s,0,'WIN-LIPPS');
 s.players[0].deck.unshift(lipps,other.pull(s,0,'WIN-CHAR'),other.pull(s,0,'WIN-PAD-1'));
 other.hold(s,0,'IMC-1-056');
 const held=s.players[0].hand.length;
 s=other.play(s,'IMC-1-056');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.discard,undefined);
 assert.deepEqual(s.pending.choices,[lipps.uid]);
 s=other.act(s,{type:'chooseTopFiltered',uid:lipps.uid});
 assert.equal(s.pending.discardAfter,true);
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=other.act(s,{type:'chooseTopOrder',uid});
 }
 assert.equal(s.pending.kind,'effect-discard');
 const discarded=s.players[0].hand.find(c=>c.uid!==lipps.uid);
 s=other.act(s,{type:'chooseDiscard',uid:discarded.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(s.players[0].hand.length,held-1);
 assert.equal(s.pending,null);

 const side=probeMatch(extras,5404);
 s=side.s;
 const both=kit(side.usePack);
 const mirio=both.seat(s,0,'MHA-1-051','front',0);
 const shuko=both.seat(s,0,'IMC-1-061','front',1);
 both.seat(s,1,'WIN-CHAR','front',0);
 s=both.reach(s,'attack');
 const mirioHand=s.players[0].hand.length;
 s=both.act(s,{type:'attack',uid:shuko.uid});
 s=both.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'effect-may-then');
 s=both.act(s,{type:'chooseMayThen',mode:'skip'});
 s=settle(s,both);
 assert.equal(s.players[0].hand.length,mirioHand);
 s.players[0].front.find(c=>c.uid===shuko.uid).ready=true;
 s=both.act(s,{type:'attack',uid:shuko.uid});
 s=both.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'effect-may-then');
 s=both.act(s,{type:'chooseMayThen',mode:'skip'});
 s=settle(s,both);
 s.players[0].front.find(c=>c.uid===mirio.uid).ready=true;
 const beforeMirio=s.players[0].hand.length;
 s=both.act(s,{type:'attack',uid:mirio.uid});
 s=both.act(s,{type:'chooseBlock',uid:null});
 assert.notEqual(s.pending?.kind,'effect-may-then');
 assert.equal(s.players[0].hand.length,beforeMirio+1);
 assert.ok(s.mainAbilityUsedUids.includes(mirio.uid+'|unblockedOnce'));
 s=settle(s,both);
 s.players[0].front.find(c=>c.uid===mirio.uid).ready=true;
 const stopped=s.players[0].hand.length;
 s=both.act(s,{type:'attack',uid:mirio.uid});
 s=both.act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,stopped);

 assert.throws(()=>createUniversalPack({id:'bad-054',version:'bad',cards:[
  {id:'BAD-054',name:'壞檢索',color:'green',type:'character',energy:1,ap:1,bp:2000,gen:1,
   traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{
    op:'searchTopOneBottomDiscard',count:7,discard:false,logic:'all',filters:[
     {field:'type',value:'character'},{field:'color',value:'green'}
    ]
   }]}},
  ...Array.from({length:12},(_,i)=>({
   id:'GAP-'+i,name:'填充',color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}
  }))
 ]}),/invalid top-N filtered bottom\/discard profile/);
});
