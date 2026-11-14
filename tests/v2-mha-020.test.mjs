// MHA-1-020 トガヒミコ. Any of your Raid characters can raid onto this one
// even when the printed Raid condition fails. Q431. On play, reveal the top
// card and add it to hand. A card without 【レイド】 puts one hand card outside.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const printed=MHA_CATALOG.find(c=>c.id==='MHA-1-020');
const toga=mhaBattleCard(printed, mhaProgramFor('MHA-1-020'));

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
 const bodies=[toga,
  card({id:'NEED', name:'條件突襲', implementation:'dsl', raidName:'標的',
   raidRequiresNames:['不在場'], effects:{onPlay:[{op:'draw', count:1}]}}),
  card({id:'PLAIN', name:'路人'}),
  card({id:'ICON', name:'突襲觸發', trigger:'raid', raidName:'圖示',
   implementation:'dsl', effects:{onPlay:[{op:'draw', count:1}]}}),
  card({id:'SMALL', name:'小燃料', gen:1}),
  card({id:'BIG', name:'大燃料', gen:2}),
  card({id:'WALL', name:'牆', bp:1000, color:'red'})
 ];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, bp:1000}));
  n++;
 }
 return createUniversalPack({id:'mha-020', version:'mha-020', cards:bodies});
}
function open({seed=20}={}){
 const pack=shell();
 const deck={};
 let remain=50;
 for(const id of Object.keys(pack.cards)){
  if(remain<=0)break;
  deck[id]=Math.min(4, remain);
  remain-=deck[id];
 }
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
function top(s,id){
 const body=pull(s,0,id);
 s.players[0].deck.unshift(body);
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
function playToga(pack,s,fuel){
 seat(s,0,fuel,'energy',0,true);
 const hand=hold(s,'MHA-1-020');
 return {hand, s:act(pack,s,a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front')};
}

test('MHA-1-020 is a Raid host and reveals one card when it enters',()=>{
 assert.equal(toga.name,'トガヒミコ');
 assert.equal(toga.energy,2);
 assert.equal(toga.raidHostAny,true);
 assert.equal(toga.effects.onPlay[0].op,'revealTopHandOutsideUnlessRaid');
 assert.equal(printed.faq.some(f=>f.id==='Q431'),true);
 assert.equal(createMhaV2Pack().cards['MHA-1-020'].raidHostAny,true);
});

test('one purple energy cannot play it, and a card without Raid forces a hand discard',()=>{
 let {pack,s}=open();
 const waiting=hold(s,'MHA-1-020');
 const small=seat(s,0,'SMALL','energy',0,true);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===waiting.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'play', uid:waiting.uid, line:'front', slot:0}),/not currently legal/);
 s.players[0].energy[0]=null;
 s.players[0].deck.push(small);
 const shown=top(s,'PLAIN');
 const played=playToga(pack,s,'BIG');
 s=played.s;
 assert.equal(s.players[0].front.some(c=>c?.uid===played.hand.uid&&c.ready===false),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===shown.uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===shown.uid&&r.kind==='searched-to-hand'),true);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(pack,s).some(a=>a.type==='chooseDiscard'&&a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'chooseDiscard', uid:null}),/not currently legal|Discard requires/);
 const spare=s.players[0].hand.find(c=>c.uid!==shown.uid);
 const away=s.players[0].hand.findIndex(c=>c.uid===spare.uid);
 s.players[0].deck.push(s.players[0].hand.splice(away,1)[0]);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'chooseDiscard', uid:spare.uid}),/not currently legal|Discard requires/);
 s=act(pack,s,{type:'chooseDiscard', uid:shown.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===shown.uid),true);

 let icon=open({seed:21});
 const raidIcon=top(icon.s,'ICON');
 icon.s=playToga(icon.pack,icon.s,'BIG').s;
 assert.equal(icon.s.pending,null);
 assert.equal(icon.s.players[0].hand.some(c=>c.uid===raidIcon.uid),true);
 assert.equal(icon.s.players[0].outside.some(c=>c.uid===raidIcon.uid),false);

 let keyword=open({seed:25});
 const named=top(keyword.s,'NEED');
 keyword.s=playToga(keyword.pack,keyword.s,'BIG').s;
 assert.equal(keyword.s.pending,null);
 assert.equal(keyword.s.players[0].hand.some(c=>c.uid===named.uid),true);

 let empty=open({seed:22});
 empty.s.players[0].removed.push(...empty.s.players[0].deck.splice(0));
 empty.s=playToga(empty.pack,empty.s,'BIG').s;
 assert.equal(empty.s.pending,null);
 assert.equal(empty.s.players[0].front.some(c=>c?.cardId==='MHA-1-020'),true);
});

test('an unmet Raid condition still raids onto Toga, and silence removes that permission',()=>{
 let {pack,s}=open({seed:23});
 const host=seat(s,0,'MHA-1-020','front',0,true);
 const neighbor=seat(s,0,'PLAIN','front',1,true);
 const rider=hold(s,'NEED');
 const raids=()=>legal(pack,s).filter(a=>a.type==='raid'&&a.uid===rider.uid);
 assert.equal(raids().some(a=>a.baseUid===host.uid),true);
 assert.equal(raids().some(a=>a.baseUid===neighbor.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'raid', uid:rider.uid, baseUid:neighbor.uid, slot:1}),/not currently legal/);
 const plain=hold(s,'PLAIN');
 assert.equal(legal(pack,s).some(a=>a.type==='raid'&&a.uid===plain.uid),false);
 grantContinuousState(s,{kind:'originalEffectsDisabled', controller:1,
  sourceUid:neighbor.uid, targetUid:host.uid, sourceLinked:false,
  until:{player:0, phase:'start', edge:'start'}});
 assert.equal(raids().some(a=>a.baseUid===host.uid),false);
 s.continuousStates=[];
 const layer=pull(s,0,'FILL-01');
 layer.faceDown=false;
 host.stack=[layer];
 assert.equal(raids().some(a=>a.baseUid===host.uid),false);
 host.stack=[];
 s.players[0].deck.push(layer);
 s=act(pack,s,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===host.uid);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='NEED'&&c.stack?.[0]?.uid===host.uid),true);

 let {pack:battlePack,s:battle}=open({seed:24});
 const fighter=seat(battle,0,'MHA-1-020','front',0,true);
 const wall=seat(battle,1,'WALL','front',0,true);
 let guard=0;
 while(battle.phase!=='attack'){
  battle=act(battlePack,battle,{type:'next'});
  if(++guard>4)throw Error('attack');
 }
 battle=act(battlePack,battle,a=>a.type==='attack'&&a.uid===fighter.uid);
 battle=act(battlePack,battle,{type:'chooseBlock', uid:wall.uid});
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[0].front.some(c=>c?.uid===fighter.uid),true);
 assert.equal(assertUniversalMatch(battlePack,battle),true);
});
