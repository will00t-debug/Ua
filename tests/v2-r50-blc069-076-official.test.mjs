import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';
import {R48_GREEN_REAL_COUNTS} from './v2-r48-four-official-green-sources.test.mjs';
const pack=registeredV2TitlePack('bleach');
const counts={...R48_GREEN_REAL_COUNTS};
for(const id of ['BLC-1-090','BLC-1-089','BLC-1-086','BLC-1-072'])delete counts[id];
for(const id of ['BLC-4-069','BLC-4-076','BLC-4-067','BLC-1-095'])counts[id]=4;
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
assert.equal(Object.values(counts).reduce((a,b)=>a+b),50);
function pull(s,id,p=0){for(const zone of ['hand','deck','life','outside']){
 const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
 if(i>=0)return list.splice(i,1)[0];
 }throw Error('Real 50 card missing '+p+'/'+id);}
function doIt(s,a){assert.ok(legalUniversalActions(pack,s).some(x=>JSON.stringify(x)===JSON.stringify(a)),
 'must use legal action '+JSON.stringify(a));return dispatchUniversalAction(pack,s,a);}
function lateGame(){
 let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:50069});
 let bound=90;
 while(!(s.active===0&&s.players[0].ownTurns===3&&s.phase==='main')&&--bound>0){
  // Real turns can require mandatory end-hand-limit or trigger decisions.
  // Settle the CURRENT legitimate action instead of assuming NEXT exists.
  const actions=legalUniversalActions(pack,s);
  const decision=actions.find(a=>a.type==='next')||actions.find(a=>a.uid===null)||
   actions[0];
  assert.ok(decision,'legal phase/mandatory action while earning third own AP turn');
  s=doIt(s,decision);
 }
 assert.ok(bound>0,'three real turns start with three ready AP');
 return s;
}
function place(s,id,p,line,slot){const c=pull(s,id,p);c.ready=true;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p][line][slot]=c;return c;}
function scenario(){
 let s=lateGame();
 place(s,'BLC-1-068',0,'energy',0);
 place(s,'BLC-1-068',0,'energy',1);
 place(s,'BLC-1-075',0,'energy',2);
 const source=pull(s,'BLC-4-069'),field=pull(s,'BLC-4-076'),off=pull(s,'BLC-1-097');
 s.players[0].hand.push(source,field,off);
 const play=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play,'blueprints true energy 5 paid 069 play');
 s=doIt(s,play);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].front.some(c=>c?.uid===source.uid));
 return {s,source,field,off};
}
test('R50 BLC-4-069 + BLC-4-076 official exact source stats and no made-up vanilla abilities',()=>{
 for(const [id,type,energy,gen,trigger] of [
  ['BLC-4-069','character',5,1,'raid'],['BLC-4-076','field',0,1,'active']]){
  const c=pack.cards[id],old=CARDS.find(x=>x.identity===id);
  assert.ok(c&&old&&old.source.includes('unionarena-tcg.com/jp/cardlist/'));
  assert.deepEqual([c.type,c.color,c.energy,c.gen,c.trigger],[type,'green',energy,gen,trigger]);
  assert.equal(c.name,old.nameJa);assert.equal(c.implementation,'dsl');
 }
 assert.equal(pack.cards['BLC-4-069'].raidName,'京楽 春水');
 assert.deepEqual(pack.cards['BLC-4-069'].effects.onPlay,
  [{op:'nextEligibleHandPlayApDiscount',filter:{trait:'花天狂骨'}}]);
 assert.equal(pack.cards['BLC-4-069'].attackEndSwap.minDistinctNames,4);
 assert.equal(pack.cards['BLC-4-076'].mainAbility.op,'fieldRestRetireThen');
});
test('R50 real 069 printed 花天狂骨 AP discount survives ineligible EVENT and only matching field consumes',()=>{
 let {s,source,field,off}=scenario();
 assert.equal(s.continuousStates.filter(e=>e.sourceUid===source.uid).length,1);
 let ap=s.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(ap,2);
 const event=legalUniversalActions(pack,s).find(a=>a.type==='event'&&a.uid===off.uid);
 assert.ok(event);s=doIt(s,event);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.continuousStates.filter(e=>e.sourceUid===source.uid).length,1);
 ap=s.players[0].apCards.filter(c=>c.ready).length;
 const play=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 assert.ok(play,'matching real printed 花天 FIELD still gets full AP reduction');
 s=doIt(s,play);
 assert.ok(s.players[0].energy.some(c=>c?.uid===field.uid));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(s.continuousStates.filter(e=>e.sourceUid===source.uid).length,0);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R50 076 truly RETIRES physical FIELD and offers exact printed energy<=2 outside Kyoraku ACTIVE',()=>{
 let {s,source,field}=scenario();
 // 069 onPlay gives exactly one eligible discount; deploy its 076 now.
 const action=legalUniversalActions(pack,s).find(a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 assert.ok(action);s=doIt(s,action);
 const cheap=pull(s,'BLC-4-067');
 s.players[0].outside.push(cheap);
 // Normal hand FIELD entry is REST. It legitimately refreshes ACTIVE at
 // the next own turn; never turn it ACTIVE by test fiat.
 let steps=45;
 while(!(s.active===0&&s.players[0].ownTurns===4&&s.phase==='main')&&--steps>0){
  const actions=legalUniversalActions(pack,s);
  const next=actions.find(a=>a.type==='next')||actions.find(a=>a.uid===null)||actions[0];
  assert.ok(next);s=doIt(s,next);
 }
 assert.ok(steps>0);
 assert.ok(s.players[0].energy.some(c=>c?.uid===field.uid&&c.ready));
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 assert.ok(legalUniversalActions(pack,s).some(a=>a.type==='activate'&&a.uid===field.uid&&
  a.mode==='fieldRestTrueRetireDeploy'));
 s=doIt(s,{type:'activate',uid:field.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.ok(s.players[0].outside.some(c=>c.uid===field.uid),'real own FIELD retirement to OUTSIDE');
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 const opts=legalUniversalActions(pack,s).filter(a=>a.type==='chooseNamedZoneDeploy');
 assert.ok(opts.some(a=>a.uid===cheap.uid&&a.zone==='outside'&&a.line==='energy'));
 assert.ok(opts.every(a=>a.uid===null||a.uid===cheap.uid),'no energy 5 original Kyoraku or wrong name');
 const deploy=opts.find(a=>a.uid===cheap.uid);
 s=doIt(s,deploy);
 assert.ok(s.players[0].energy.some(c=>c?.uid===cheap.uid&&c.ready));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 // 067 onPlay TOP3 may open nested private inspection; legality stays delegated.
 for(let bound=0;bound<8&&s.pending;bound++){
  const options=legalUniversalActions(pack,s),option=options.find(a=>a.uid===null)||
   options.find(a=>a.type==='chooseTopOrder')||options[0];
  assert.ok(option);s=doIt(s,option);
 }
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R50 069 un-Raid printed Q2337 blocked battle ends before real green four-name exchange',()=>{
 let {s,source}=scenario();
 const printed=['BLC-1-095','BLC-1-097','BLC-1-099','BLC-1-100'];
 for(const id of printed)s.players[0].outside.push(pull(s,id));
 const ally=s.players[0].energy[0],blocker=place(s,'BLC-1-071',1,'front',0);
 const attacker=s.players[0].front.find(c=>c?.uid===source.uid);
 assert.ok(attacker);attacker.ready=true; // staged attack window after legal paid turn
 s.phase='attack';
 assert.equal(assertUniversalMatch(pack,s),true);
 s=doIt(s,{type:'attack',uid:source.uid});
 assert.equal(s.pending?.kind,'block');
 s=doIt(s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(s.pending?.kind,'attack-end-swap');
 const opts=legalUniversalActions(pack,s);
 assert.ok(opts.some(a=>a.uid===ally.uid));
 const stamp=attacker.fieldEntryStamp;
 s=doIt(s,{type:'chooseAttackEndSwap',uid:ally.uid});
 assert.ok(s.players[0].energy.some(c=>c?.uid===source.uid&&c.fieldEntryStamp===stamp));
 assert.ok(s.players[0].front.some(c=>c?.uid===ally.uid));
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
