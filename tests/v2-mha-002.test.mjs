// MHA-1-002 エリ. Optional mill of up to 3, then a separate main that
// rests and retires this card and may add one legal outside card.
// Q421: 〈“個性”消失弾〉 does not need the 死穢八斎會 trait.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalPrivateChoices, universalEnergyByColor
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const printed=MHA_CATALOG.find(c=>c.id==='MHA-1-002');
const eri=mhaBattleCard(printed, mhaProgramFor('MHA-1-002'));
const bulletName='“個性”消失弾';

function card(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'purple',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1500, gen:extra.gen??1, traits:extra.traits||[],
  trigger:extra.trigger??null, implementation:extra.implementation||'vanilla',
  effects:extra.effects||{}, ...extra
 };
}
function shell(){
 const bodies=[eri,
  card({id:'FUEL', name:'燃料'}),
  card({id:'GREEN', name:'綠燃料', color:'green'}),
  card({id:'TRAIT', name:'死穢成員', traits:['死穢八斎會']}),
  card({id:'PLAIN', name:'路人'}),
  card({id:'BULLET', name:bulletName, type:'field', energy:4, ap:1, bp:0, gen:0}),
  card({id:'OTHER-FIELD', name:'別的場地', type:'field', energy:1, ap:1, bp:0, gen:0}),
  card({id:'DEAR', name:'高費紫', energy:3, ap:1}),
  card({id:'WRONG-AP', name:'錯AP', energy:2, ap:2}),
  card({id:'EXACT', name:'剛好紫', energy:2, ap:1}),
  card({id:'WALL', name:'牆', bp:4000, color:'red'})
 ];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, bp:1000}));
  n++;
 }
 return createUniversalPack({id:'mha-002', version:'mha-002', cards:bodies});
}
function open({seed=21}={}){
 const pack=shell();
 const deck={};
 let remain=50;
 for(const id of Object.keys(pack.cards)){
  if(remain<=0)break;
  const n=Math.min(4, remain);
  deck[id]=n;
  remain-=n;
 }
 assert.equal(remain,0);
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 let guard=0;
 while(s.phase!=='main'||s.active!==0){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase');
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function keepHand(s,ids,p=0){
 const kept=ids.map(id=>hold(s,id,p));
 s.players[p].deck.push(...s.players[p].hand.filter(c=>!kept.includes(c)));
 s.players[p].hand=kept;
 return kept;
}
function top(s,id,p=0){
 const body=pull(s,p,id);
 s.players[p].deck.unshift(body);
 return body;
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action; pending='+(s.pending?.kind||'none'));
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function payEnergy(s){
 seat(s,0,'FUEL','energy',0);
 seat(s,0,'FUEL','energy',1);
}
function parkDeck(s,p=0){
 s.players[p].removed.push(...s.players[p].deck.splice(0));
}
function playEri(pack,s){
 const hand=s.players[0].hand.find(c=>c.cardId==='MHA-1-002');
 s=act(pack,s,a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front');
 return {s, played:s.players[0].front.find(c=>c.cardId==='MHA-1-002')};
}
function finishMill(pack,s){
 while(s.pending?.kind==='effect-mill-optional')
  s=act(pack,s,{type:'chooseMillOptional', mode:'stop'});
 return s;
}
function passToOwnMain(pack,s){
 const turn=s.turn;
 let guard=0;
 while(s.active!==0||s.phase!=='main'||s.turn===turn){
  if(s.pending)throw Error('pending '+s.pending.kind+' during the round trip');
  const options=legal(pack,s);
  if(!options.some(a=>a.type==='next'))
   throw Error('no next at '+s.active+' '+s.phase+' '+s.status+' '+(s.endReason||''));
  s=act(pack,s,{type:'next'});
  if(++guard>24)throw Error('did not return to own main');
 }
 return s;
}

test('MHA-1-002 is the printed Eri, including the color trigger and Q421',()=>{
 assert.equal(eri.name,'エリ');
 assert.equal(eri.energy,2);
 assert.equal(eri.ap,1);
 assert.equal(eri.bp,2500);
 assert.equal(eri.trigger,'color');
 assert.equal(eri.effects.onPlay[0].op,'millUpToThenRecover');
 assert.equal(eri.effects.onPlay[0].optional,true);
 assert.equal(eri.effects.onPlay[0].recover,undefined);
 assert.equal(eri.mainAbility.op,'restRetireSequence');
 assert.equal(eri.mainAbility.then[0].optional,true);
 assert.deepEqual(eri.mainAbility.then[0].anyOf,[
  {field:'trait', value:'死穢八斎會'},
  {field:'name', value:bulletName}
 ]);
 assert.equal(eri.triggerEffect.op,'deployOutsideCharacter');
 assert.equal(printed.faq.some(f=>f.id==='Q421'),true);
 assert.equal(createMhaV2Pack().cards['MHA-1-002'].id,'MHA-1-002');
});

test('on play the mill is optional and never opens a recovery',()=>{
 let {pack,s}=open();
 payEnergy(s);
 const first=top(s,'PLAIN');
 const second=top(s,'TRAIT');
 const third=top(s,'FILL-01');
 keepHand(s,['MHA-1-002']);
 const outsideBefore=s.players[0].outside.length;
 ({s}=playEri(pack,s));
 assert.equal(s.pending.kind,'effect-mill-optional');
 assert.equal(s.pending.max,3);
 assert.equal(s.pending.optional,true);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(legal(pack,s).some(a=>a.type==='chooseMillOptional'&&a.mode==='stop'),true);
 assert.equal(legal(pack,s).some(a=>a.type==='chooseMillOptional'&&a.mode==='mill'),true);
 s=act(pack,s,{type:'chooseMillOptional', mode:'stop'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.length,outsideBefore);
 assert.equal(s.players[0].deck[0].uid,third.uid);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='MHA-1-002'),true);

 let skipped=open({seed:22});
 payEnergy(skipped.s);
 top(skipped.s,'PLAIN');
 keepHand(skipped.s,['MHA-1-002']);
 const bullet=pull(skipped.s,0,'BULLET');
 const member=pull(skipped.s,0,'TRAIT');
 skipped.s.players[0].outside.push(bullet, member);
 ({s:skipped.s}=playEri(skipped.pack, skipped.s));
 skipped.s=act(skipped.pack, skipped.s, {type:'chooseMillOptional', mode:'stop'});
 assert.equal(skipped.s.pending,null);
 assert.equal(skipped.s.players[0].outside.some(c=>c.uid===bullet.uid),true);

 let one=open({seed:23});
 payEnergy(one.s);
 top(one.s,'TRAIT');
 const milled=top(one.s,'PLAIN');
 keepHand(one.s,['MHA-1-002']);
 ({s:one.s}=playEri(one.pack, one.s));
 one.s=act(one.pack, one.s, {type:'chooseMillOptional', mode:'mill'});
 assert.equal(one.s.players[0].outside.some(c=>c.uid===milled.uid),true);
 assert.equal(one.s.pending.kind,'effect-mill-optional');
 assert.equal(one.s.pending.milled.length,1);
 one.s=act(one.pack, one.s, {type:'chooseMillOptional', mode:'stop'});
 assert.equal(one.s.pending,null);
 assert.equal(one.s.players[0].outside.filter(c=>c.uid===milled.uid).length,1);

 let short=open({seed:24});
 payEnergy(short.s);
 keepHand(short.s,['MHA-1-002']);
 parkDeck(short.s);
 const only=pull(short.s,0,'PLAIN');
 short.s.players[0].deck.unshift(only);
 ({s:short.s}=playEri(short.pack, short.s));
 short.s=act(short.pack, short.s, {type:'chooseMillOptional', mode:'mill'});
 assert.equal(short.s.pending,null);
 assert.equal(short.s.players[0].deck.length,0);
 assert.equal(short.s.players[0].outside.some(c=>c.uid===only.uid),true);

 let empty=open({seed:25});
 payEnergy(empty.s);
 keepHand(empty.s,['MHA-1-002']);
 parkDeck(empty.s);
 ({s:empty.s}=playEri(empty.pack, empty.s));
 assert.equal(empty.s.pending,null);
 assert.equal(empty.s.players[0].front.some(c=>c?.cardId==='MHA-1-002'),true);
 assert.equal(first.cardId,'PLAIN');
 assert.equal(second.cardId,'TRAIT');
});

test('the main recovers only a Shie Hassaikai character or the named field, and the recovery can be declined',()=>{
 let {pack,s}=open({seed:30});
 payEnergy(s);
 keepHand(s,['MHA-1-002']);
 const member=pull(s,0,'TRAIT');
 const bullet=pull(s,0,'BULLET');
 const plain=pull(s,0,'PLAIN');
 const otherField=pull(s,0,'OTHER-FIELD');
 s.players[0].outside.push(member, bullet, plain, otherField);
 let played;
 ({s, played}=playEri(pack,s));
 s=finishMill(pack,s);
 assert.equal(played.ready,false);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===played.uid),false);
 s=passToOwnMain(pack,s);
 played=s.players[0].front.find(c=>c?.uid===played.uid);
 assert.equal(played.ready,true);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===played.uid&&a.mode==='restRetireSequence'),true);
 s=act(pack,s,{type:'activate', uid:played.uid, mode:'restRetireSequence'});
 assert.equal(s.players[0].front.some(c=>c?.uid===played.uid),false);
 assert.equal(s.players[0].energy.some(c=>c?.uid===played.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===played.uid),true);
 assert.equal(s.pending.kind,'effect-recover-any');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.choices.includes(member.uid),true);
 assert.equal(s.pending.choices.includes(bullet.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 assert.equal(s.pending.choices.includes(otherField.uid),false);
 assert.equal(s.pending.choices.includes(played.uid),false);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(legal(pack,s).some(a=>a.type==='chooseRecoverAny'&&a.uid===null),true);
 const left=s.players[0].outside.findIndex(c=>c.uid===bullet.uid);
 s.players[0].deck.push(s.players[0].outside.splice(left,1)[0]);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRecoverAny', uid:bullet.uid}),
  /not currently legal|Illegal/);
 s=act(pack,s,{type:'chooseRecoverAny', uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===member.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===member.uid),true);

 let taken=open({seed:31});
 payEnergy(taken.s);
 keepHand(taken.s,['MHA-1-002']);
 const wanted=pull(taken.s,0,'TRAIT');
 taken.s.players[0].outside.push(wanted);
 ({s:taken.s, played:taken.played}=playEri(taken.pack, taken.s));
 taken.s=finishMill(taken.pack, taken.s);
 taken.s=passToOwnMain(taken.pack, taken.s);
 taken.played=taken.s.players[0].front.find(c=>c?.uid===taken.played.uid);
 taken.s=act(taken.pack, taken.s, {type:'activate', uid:taken.played.uid, mode:'restRetireSequence'});
 taken.s=act(taken.pack, taken.s, {type:'chooseRecoverAny', uid:wanted.uid});
 assert.equal(taken.s.players[0].hand.some(c=>c.uid===wanted.uid),true);
 assert.equal(taken.s.players[0].outside.some(c=>c.uid===wanted.uid),false);

 let named=open({seed:32});
 payEnergy(named.s);
 keepHand(named.s,['MHA-1-002']);
 const field=pull(named.s,0,'BULLET');
 named.s.players[0].outside.push(field);
 ({s:named.s, played:named.played}=playEri(named.pack, named.s));
 named.s=finishMill(named.pack, named.s);
 named.s=passToOwnMain(named.pack, named.s);
 named.played=named.s.players[0].front.find(c=>c?.uid===named.played.uid);
 named.s=act(named.pack, named.s, {type:'activate', uid:named.played.uid, mode:'restRetireSequence'});
 assert.deepEqual(named.s.pending.choices, [field.uid]);
 named.s=act(named.pack, named.s, {type:'chooseRecoverAny', uid:field.uid});
 assert.equal(named.s.players[0].hand.some(c=>c.uid===field.uid),true);
});

test('the main rejects a rested or silenced Eri, and the card can attack after it enters',()=>{
 let {pack,s}=open({seed:40});
 payEnergy(s);
 keepHand(s,['MHA-1-002']);
 let played;
 ({s, played}=playEri(pack,s));
 s=finishMill(pack,s);
 played.ready=false;
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===played.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'activate', uid:played.uid, mode:'restRetireSequence'}),
  /not currently legal|not legal/);
 played.ready=true;
 grantContinuousState(s,{kind:'originalEffectsDisabled', controller:0,
  sourceUid:played.uid, targetUid:played.uid, sourceLinked:false,
  until:{player:0, phase:'start', edge:'start'}});
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===played.uid),false);

 let battle=open({seed:41});
 payEnergy(battle.s);
 keepHand(battle.s,['MHA-1-002']);
 const wall=seat(battle.s,1,'WALL','front',0,true);
 ({s:battle.s, played:battle.played}=playEri(battle.pack, battle.s));
 battle.s=finishMill(battle.pack, battle.s);
 assert.equal(battle.played.ready,false);
 battle.s=passToOwnMain(battle.pack, battle.s);
 battle.played=battle.s.players[0].front.find(c=>c?.uid===battle.played.uid);
 let guard=0;
 while(battle.s.phase!=='attack'){
  battle.s=act(battle.pack, battle.s, {type:'next'});
  if(++guard>4)throw Error('attack');
 }
 assert.equal(legal(battle.pack, battle.s).some(a=>a.type==='activate'&&a.uid===battle.played.uid),false);
 assert.equal(legal(battle.pack, battle.s).some(a=>a.type==='attack'&&a.uid===battle.played.uid),true);
 battle.s=act(battle.pack, battle.s, a=>a.type==='attack'&&a.uid===battle.played.uid);
 assert.equal(battle.s.pending.kind,'block');
 assert.equal(legal(battle.pack, battle.s).some(a=>a.type==='chooseBlock'&&a.uid===wall.uid),true);
 battle.s=act(battle.pack, battle.s, {type:'chooseBlock', uid:null});
 assert.equal(battle.s.players[0].front.some(c=>c?.uid===battle.played.uid),true);
 assert.equal(assertUniversalMatch(battle.pack, battle.s),true);
});

test('two purple energy is required, and the color trigger deploys only a legal outside character to the front',()=>{
 let {pack,s}=open({seed:50});
 seat(s,0,'GREEN','energy',0);
 seat(s,0,'FUEL','energy',1);
 keepHand(s,['MHA-1-002']);
 const unpaid=s.players[0].hand.find(c=>c.cardId==='MHA-1-002');
 assert.equal(universalEnergyByColor(pack,s,0).purple,1);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===unpaid.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'play', uid:unpaid.uid, line:'front', slot:0}),
  /not currently legal/);
 seat(s,0,'FUEL','energy',2);
 assert.equal(universalEnergyByColor(pack,s,0).purple,2);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===unpaid.uid&&a.line==='front'),true);

 let life=open({seed:51});
 const attacker=seat(life.s,0,'WALL','front',0,true);
 const revealed=pull(life.s,1,'MHA-1-002');
 const displaced=life.s.players[1].life[0];
 life.s.players[1].life[0]=revealed;
 life.s.players[1].deck.push(displaced);
 const exact=pull(life.s,1,'EXACT');
 const dear=pull(life.s,1,'DEAR');
 const wrongAp=pull(life.s,1,'WRONG-AP');
 const green=pull(life.s,1,'GREEN');
 const field=pull(life.s,1,'BULLET');
 life.s.players[1].outside.push(exact, dear, wrongAp, green, field);
 let guard=0;
 while(life.s.phase!=='attack'){
  life.s=act(life.pack, life.s, {type:'next'});
  if(++guard>4)throw Error('attack');
 }
 life.s=act(life.pack, life.s, a=>a.type==='attack'&&a.uid===attacker.uid);
 if(life.s.pending?.kind==='block')
  life.s=act(life.pack, life.s, {type:'chooseBlock', uid:null});
 assert.equal(life.s.pending.kind,'life-trigger');
 assert.equal(life.s.pending.trigger,'color');
 const choices=legal(life.pack, life.s);
 assert.equal(choices.some(a=>a.mode==='colorOutside'&&a.uid===exact.uid&&a.line==='front'),true);
 assert.equal(choices.some(a=>a.uid===dear.uid),false);
 assert.equal(choices.some(a=>a.uid===wrongAp.uid),false);
 assert.equal(choices.some(a=>a.uid===green.uid),false);
 assert.equal(choices.some(a=>a.uid===field.uid),false);
 assert.throws(()=>dispatchUniversalAction(life.pack, life.s,
  {type:'chooseTrigger', mode:'colorOutside', uid:field.uid, line:'front', slot:0}),
  /not currently legal|does not meet|Illegal/);
 const slot=choices.find(a=>a.mode==='colorOutside'&&a.uid===exact.uid);
 life.s=act(life.pack, life.s, slot);
 const entered=life.s.players[1].front.find(c=>c?.uid===exact.uid);
 assert.equal(entered.ready,true);
 assert.equal(life.s.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(life.s.players[1].hand.some(c=>c.uid===exact.uid),false);
 assert.equal(assertUniversalMatch(life.pack, life.s),true);
});
