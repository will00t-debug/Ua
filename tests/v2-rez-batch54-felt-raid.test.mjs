import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalEnergy} from '../dist/universal-v2/engine.mjs';
import {hasFrontEnergyPermission} from '../dist/universal-v2/continuous-states.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-062','REZ-2-060','REZ-2-049','REZ-2-066','REZ-2-056','REZ-2-043',
 'REZ-2-041','REZ-2-065','REZ-2-055','REZ-2-014','REZ-2-035','REZ-2-033','REZ-2-050'
],'REZ-2-055');

function sit(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,
  ...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
}
function forward(s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending?.kind==='end-hand-limit')
   s=dispatchUniversalAction(rezPacks,s,{type:'chooseHandLimit',
    uid:s.players[s.pending.player].hand[0].uid},{actor:s.pending.player});
  else if(s.pending?.kind==='life-trigger')
   s=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:s.pending.player});
  else if(s.pending)throw Error('Pending '+s.pending.kind);
  else s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>24)throw Error('stuck '+s.active+' '+s.phase);
 }
 return s;
}
function shell(extra){
 return {id:'X',name:'フェルト',color:'green',type:'character',energy:4,ap:1,
  bp:2500,gen:2,trigger:'raid',raidName:'フェルト',implementation:'dsl',...extra};
}

test('REZ-2-062 raids Felt, chooses its Raid-box effect, and keeps the block ceiling until her next turn',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-062'].effectJa,/\[レイド\]〈フェルト〉/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-062'].effectJa,/BP4000以上のキャラにブロックされない/);
 assert.equal(rez.cards['REZ-2-062'].raidName,'フェルト');
 let s=fresh(deck,2062);
 const base=sit(s,0,'REZ-2-060','front',0);
 const ally=sit(s,0,'REZ-2-056','front',1,false);
 const producer=sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-066','energy',1);
 const rider=take(s,0,'REZ-2-062');s.players[0].hand.push(rider);
 const quiet=take(s,1,'REZ-2-056');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(quiet);
 const big=sit(s,1,'REZ-2-065','front',0);
 const small=sit(s,1,'REZ-2-043','front',1);
 s=toPhase(rezPacks,s,'main');
 live(s,small.uid).buffs=[{bp:1500,untilTurn:s.turn}];
 const before=s.players[0].hand.length;
 const raid=legalUniversalActions(rezPacks,s).find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 s=dispatchUniversalAction(rezPacks,s,raid,{actor:0});
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'REZ-2-062');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id).sort(),['active','draw']);
 const drawn=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseEffectMode',mode:'draw'},{actor:0});
 assert.equal(drawn.players[0].hand.length,before);
 assert.equal(drawn.pending,null);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseEffectMode',mode:'active'},{actor:0});
 assert.equal(skipped.pending.kind,'effect-active-own-other');
 assert.deepEqual(skipped.pending.choices.slice().sort(),[ally.uid,producer.uid].sort());
 const rested=dispatchUniversalAction(rezPacks,structuredClone(skipped),
  {type:'chooseActiveOwnOther',uid:null},{actor:0});
 assert.equal(live(rested,ally.uid).ready,false);
 s=dispatchUniversalAction(rezPacks,skipped,{type:'chooseActiveOwnOther',uid:ally.uid},{actor:0});
 assert.equal(live(s,ally.uid).ready,true);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===top.uid&&a.mode==='frontChoose'),true);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='activate'&&a.uid===top.uid),{actor:0});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.ok(s.pending.options.some(o=>o.id==='keywords'));
 assert.ok(s.pending.options.some(o=>o.id==='energy'));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'keywords'},{actor:0});
 const felt=s.players[0].front[0];
 assert.equal(universalBp(rez,s,felt),3500);
 assert.equal(felt.blockAtLeastUntil.bp,4000);
 assert.equal(felt.blockAtLeastUntil.untilOwnTurnStart,s.players[0].ownTurns+1);
 const opposing=structuredClone(s);opposing.active=1;
 assert.equal(universalBp(rez,opposing,opposing.players[0].front[0]),3500);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===felt.uid),false);
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:s.players[0].front[0].uid},{actor:0});
 const blocks=legalUniversalActions(rezPacks,s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocks.includes(big.uid),false);
 assert.ok(blocks.includes(small.uid));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending,null);
 const during=forward(s,x=>x.active===1&&x.phase==='main');
 const still=live(during,felt.uid);
 assert.equal(universalBp(rez,during,still),3500);
 assert.equal(still.blockAtLeastUntil.bp,4000);
 s=forward(during,x=>x.active===0&&x.phase==='main'&&x.players[0].ownTurns>=2);
 const later=live(s,felt.uid);
 assert.equal(universalBp(rez,s,later),2500);
 assert.equal(later.blockAtLeastUntil,undefined);
 s=toPhase(rezPacks,s,'attack');
 const ready=live(s,felt.uid);
 if(!ready.ready)ready.ready=true;
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:ready.uid},{actor:0});
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='chooseBlock'&&a.uid===big.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,drawn),true);
 assert.equal(assertUniversalMatch(rezPacks,rested),true);
});

test('REZ-2-062 grants front energy to another character and hides that choice when she is alone',()=>{
 let s=fresh(deck,3062);
 const base=sit(s,0,'REZ-2-060','front',0);
 const front=sit(s,0,'REZ-2-056','front',1);
 const producer=sit(s,0,'REZ-2-049','energy',0);
 const energy=sit(s,0,'REZ-2-041','energy',1);
 const other=sit(s,0,'REZ-2-043','energy',2);
 sit(s,0,'REZ-2-066','energy',3);
 const rider=take(s,0,'REZ-2-062');s.players[0].hand.push(rider);
 s=toPhase(rezPacks,s,'main');
 const energyBefore=universalEnergy(rez,s,0);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid),{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'draw'},{actor:0});
 const felt=s.players[0].front[0];
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='activate'&&a.uid===felt.uid),{actor:0});
 const ids=s.pending.options.map(o=>o.id);
 assert.ok(ids.includes('energy'));
 const branch=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseEffectMode',mode:'energy'},{actor:0});
 assert.equal(branch.pending.kind,'effect-grant-field-energy');
 assert.deepEqual(branch.pending.choices.map(c=>c.uid).sort(),[front.uid,energy.uid,other.uid,producer.uid].sort());
 assert.equal(branch.pending.choices.some(c=>c.uid===felt.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,branch,
  {type:'chooseFieldEnergyGrant',uid:felt.uid},{actor:0}),/not currently legal/);
 const granted=dispatchUniversalAction(rezPacks,branch,
  {type:'chooseFieldEnergyGrant',uid:front.uid},{actor:0});
 assert.equal(hasFrontEnergyPermission(granted,0,live(granted,front.uid)),true);
 assert.equal(universalEnergy(rez,granted,0),energyBefore+1);
 const stored=dispatchUniversalAction(rezPacks,structuredClone(branch),
  {type:'chooseFieldEnergyGrant',uid:energy.uid},{actor:0});
 assert.equal(hasFrontEnergyPermission(stored,0,live(stored,energy.uid)),true);
 assert.equal(universalEnergy(rez,stored,0),energyBefore);
 let line=fresh(deck,4062);
 sit(line,0,'REZ-2-049','energy',0);
 sit(line,0,'REZ-2-066','energy',1);
 const energyRider=take(line,0,'REZ-2-062');line.players[0].hand.push(energyRider);
 line=toPhase(rezPacks,line,'main');
 const playEnergy=legalUniversalActions(rezPacks,line).find(a=>a.type==='play'&&a.uid===energyRider.uid&&a.line==='energy');
 line=dispatchUniversalAction(rezPacks,line,playEnergy,{actor:0});
 assert.equal(line.players[0].energy.find(c=>c?.cardId==='REZ-2-062').ready,false);
 assert.equal(line.pending,null,'ordinary energy-line play must not offer a Raid-only choice');
 assert.equal(legalUniversalActions(rezPacks,line).some(a=>a.type==='activate'&&a.mode==='frontChoose'),false);
 let alone=fresh(deck,5062);
 const only=sit(alone,0,'REZ-2-060','front',0);
 sit(alone,0,'REZ-2-066','energy',0);
 sit(alone,0,'REZ-2-066','energy',1);
 const one=take(alone,0,'REZ-2-062');alone.players[0].hand.push(one);
 alone=toPhase(rezPacks,alone,'main');
 alone=dispatchUniversalAction(rezPacks,alone,legalUniversalActions(rezPacks,alone)
  .find(a=>a.type==='raid'&&a.uid===one.uid),{actor:0});
 alone=dispatchUniversalAction(rezPacks,alone,{type:'chooseEffectMode',mode:'draw'},{actor:0});
 alone=dispatchUniversalAction(rezPacks,alone,legalUniversalActions(rezPacks,alone)
  .find(a=>a.type==='activate'&&a.mode==='frontChoose'),{actor:0});
 assert.deepEqual(alone.pending.options.map(o=>o.id),['keywords']);
 assert.throws(()=>createUniversalPack({id:'bad-062',cards:[shell({
  effects:{onPlay:[{op:'activeOwnOther',optional:true}]}
 })]}),/nested choices/);
 assert.throws(()=>createUniversalPack({id:'bad-062b',cards:[shell({
  effects:{},mainAbility:{op:'onceFrontChoose',oncePerTurn:true,frontOnly:false,then:[
   {op:'chooseOne',optional:false,options:[
    {id:'keywords',label:'bp and block ceiling',turn:'any',then:[
     {op:'buffSelf',bp:1000}]}]}]}
 })]}),/unsupported main/);
 assert.equal(assertUniversalMatch(rezPacks,granted),true);
 assert.equal(assertUniversalMatch(rezPacks,stored),true);
 assert.equal(assertUniversalMatch(rezPacks,alone),true);
});

test('REZ-2-062 does not resolve the enclosed Raid effect on ordinary FRONT or ENERGY play',()=>{
 assert.ok(!rez.cards['REZ-2-062'].effects.onPlay?.length,
  'normal entry has no separately printed entry program');
 assert.equal(rez.cards['REZ-2-062'].effects.onRaid?.[0]?.op,'chooseOne');
 for(const line of ['front','energy']){
  let s=fresh(deck,line==='front'?6062:7062);
  sit(s,0,'REZ-2-049','energy',0);
  sit(s,0,'REZ-2-066','energy',1);
  const felt=take(s,0,'REZ-2-062');
  s.players[0].hand.push(felt);
  s=toPhase(rezPacks,s,'main');
  const handBefore=s.players[0].hand.length;
  const ordinary=legalUniversalActions(rezPacks,s).find(a=>
   a.type==='play'&&a.uid===felt.uid&&a.line===line);
  assert.ok(ordinary, `ordinary entry to ${line} must be legal`);
  s=dispatchUniversalAction(rezPacks,s,ordinary,{actor:0});
  assert.equal(s.pending,null,`ordinary ${line} play cannot open the Raid-choice dialog`);
  assert.ok(s.players[0][line].some(c=>c?.uid===felt.uid));
  assert.equal(s.players[0].hand.length,handBefore-1,
   'the Raid-only draw option must not draw a card on normal entry');
  assert.equal(assertUniversalMatch(rezPacks,s),true);
 }
});
