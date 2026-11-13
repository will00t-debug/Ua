// IMC round 6 D group. The five cards use the shared printed-option and look
// scripts. Each case plays the real catalog card.
import test from 'node:test';
import assert from 'node:assert/strict';
import {imcCatalog} from '../dist/imc/catalog.mjs';
import {imcBattleCard,imcProgramFor} from '../dist/universal-v2/imc-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView,
 universalImpact,universalImpactNull} from '../dist/universal-v2/engine.mjs';
import {boardEntrySelection} from '../dist/universal-v2/preview-actions.mjs';

const catalog=imcCatalog();
const trait='ポジティブパッション';
const girls='ガールズ・イン・ザ・フロンティア';
const star='Starry-Go-Round';
const raidDraw={op:'ifLiveThen',when:{kind:'selfOwnEffectRaid',turn:'any'},
 then:[{op:'draw',count:1}]};

function real(id){
 const card=imcBattleCard(catalog.byId.get(id),imcProgramFor(id));
 assert.ok(card,id);
 return card;
}
function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'blue',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:rest.trigger??null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length?'dsl':'vanilla'),
  effects
 };
}
function open(cards,seed){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:'imc-r6d',version:'d-'+seed,cards:bodies});
 const counts={};
 let left=50;
 for(const card of bodies){
  const n=Math.min(4,left);
  if(n<=0)break;
  counts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0});
 for(let i=0;i<6&&s.phase!=='main';i++){
  const next=legalUniversalActions(pack,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(pack,s,next);
 }
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,id,p=0){
 const card=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(card))s.players[p].hand.push(card);
 return card;
}
function seat(s,p,id,line,slot,ready=false){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function stackTop(s,ids,p=0){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function fuel(s,n=3,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function apReady(s,p=0){
 return s.players[p].apCards.filter(c=>c.ready).length;
}
function play(pack,s,id,p=0){
 const card=hold(s,id,p);
 fuel(s,3,p);
 const action=legalUniversalActions(pack,s).find(a=>a.uid===card.uid&&
  (a.type==='play'||a.type==='event'));
 assert.ok(action,id+' '+(s.pending?.kind||s.phase));
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function act(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action,s.pending?.kind||s.phase);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function bodies(s){
 let n=0;
 const seen=new Set();
 const walk=c=>{
  if(!c)return;
  assert.equal(seen.has(c.uid),false,c.uid);
  seen.add(c.uid);
  n+=1;
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const c of p[zone]||[])walk(c);
  for(const line of ['front','energy'])for(const c of p[line])walk(c);
  for(const c of p.apCards||[])walk(c);
 }
 return n;
}
function hidden(pack,s,uid){
 return JSON.stringify(universalPublicView(pack,s,1)).includes(uid);
}
function orderRest(pack,s,uids){
 for(const uid of uids)s=act(pack,s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
 return s;
}

test('IMC-1-028 pays, raids, and resolves the two printed options in order',()=>{
 const cards=[
  real('IMC-1-028'),
  face({id:'Y5',name:'黃能源',color:'yellow',gen:5,bp:1000}),
  face({id:'LOW',name:'同伴',color:'yellow',energy:2,traits:[trait]}),
  face({id:'HIGH',name:'高費',color:'yellow',energy:4,traits:[trait]}),
  face({id:'OTHER',name:'別特徵',color:'yellow',energy:1,traits:['LiPPS']}),
  face({id:'FIELD',name:'場域',type:'field',color:'yellow',energy:1,bp:0,traits:[trait]}),
  face({id:'HINO',name:'日野 茜',color:'yellow',energy:0,ap:1,raidName:'底板'}),
  face({id:'RICH',name:'高森 藍子',color:'yellow',energy:6,ap:1,raidName:'底板'}),
  face({id:'BLUE',name:'日野 茜',color:'blue',energy:0,ap:1}),
  face({id:'AP2',name:'日野 茜',color:'yellow',energy:0,ap:2}),
  face({id:'BASE',name:'本田 未央',color:'yellow',energy:1,bp:1500}),
  face({id:'HOST',name:'底板',color:'yellow',energy:1}),
  face({id:'GATE',name:'使之',color:'yellow',energy:0,effects:{onPlay:[{
   op:'raidOwnHandNamed',optional:true,max:1,requireAffordableEnergy:true,
   names:['本田 未央']}]}})
 ];
 const opened=open(cards,2801);
 let s=opened.s;
 const before=bodies(s);
 seat(s,0,'Y5','energy',0,true);
 const low=seat(s,0,'LOW','front',1,false);
 const high=seat(s,0,'HIGH','energy',1,false);
 const other=seat(s,0,'OTHER','energy',2,false);
 const field=seat(s,0,'FIELD','energy',3,false);
 const opp=seat(s,1,'LOW','front',0,false);
 const hino=hold(s,'HINO');
 const rich=hold(s,'RICH');
 hold(s,'BLUE');
 hold(s,'AP2');
 const host=seat(s,0,'HOST','front',2,true);
 s=play(opened.pack,s,'IMC-1-028');
 const actor=[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId==='IMC-1-028');
 const ap=apReady(s);
 assert.equal(universalImpact(opened.pack,s,actor),1);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce']);
 assert.deepEqual(s.pending.order,['bounce','active']);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 assert.deepEqual(s.pending.selected,[]);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 s=act(opened.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(other.uid),false);
 assert.equal(s.pending.choices.includes(field.uid),false);
 assert.equal(s.pending.choices.includes(opp.uid),false);
 assert.equal(s.pending.choices.includes(actor.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,
  {type:'chooseOwnBounce',uid:high.uid}),/not currently legal/);
 s=act(opened.pack,s,a=>a.type==='chooseOwnBounce'&&a.uid===low.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 const hand=legalUniversalActions(opened.pack,s);
 assert.equal(hand.some(a=>a.uid===hino.uid),true);
 assert.equal(hand.some(a=>a.uid===rich.uid),false);
 assert.equal(hand.some(a=>a.uid===low.uid),false);
 assert.equal(hand.filter(a=>a.uid&&a.cardId==='BLUE').length,0);
 assert.equal(hand.some(a=>a.mode==='raid'&&a.uid===hino.uid&&a.baseUid===host.uid),true);
 assert.equal(hidden(opened.pack,s,rich.uid),false);
 s=act(opened.pack,s,a=>a.mode==='raid'&&a.uid===hino.uid&&a.baseUid===host.uid&&a.line==='front');
 assert.equal(s.players[0].front.some(c=>c?.uid===hino.uid&&c.ready===true),true);
 assert.equal(s.pending,null);
 assert.equal(apReady(s),ap);
 assert.equal(bodies(s),before);

 const paid=open(cards,2802);
 s=paid.s;
 seat(s,0,'Y5','energy',0,true);
 const paidLow=seat(s,0,'LOW','energy',1,false);
 const paidBase=seat(s,0,'BASE','front',0,true);
 const paidCard=hold(s,'IMC-1-028');
 fuel(s);
 const raid=legalUniversalActions(paid.pack,s).find(a=>a.type==='raid'&&a.uid===paidCard.uid&&
  a.baseUid===paidBase.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(paid.pack,s,raid);
 assert.equal(assertUniversalMatch(paid.pack,s),true);
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce']);
 s=act(paid.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy.some(c=>c?.uid===paidLow.uid&&c.ready===false),true);
 assert.equal(universalImpact(paid.pack,s,s.players[0].front.find(c=>c?.cardId==='IMC-1-028')),1);

 const caused=open(cards,2803);
 s=caused.s;
 seat(s,0,'Y5','energy',0,true);
 const ally=seat(s,0,'LOW','energy',1,false);
 const plain=seat(s,0,'OTHER','front',1,false);
 const base=seat(s,0,'BASE','front',0,true);
 hold(s,'IMC-1-028');
 hold(s,'HINO');
 s=play(caused.pack,s,'GATE');
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 const fromHand=s.players[0].hand.find(c=>c.cardId==='IMC-1-028');
 s=act(caused.pack,s,a=>a.mode==='raid'&&a.uid===fromHand.uid&&a.baseUid===base.uid&&a.line==='front');
 const spent=apReady(s);
 assert.equal(s.pending.entryCause,'handEffectRaid');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce','active']);
 s=act(caused.pack,s,a=>a.mode==='pick'&&a.id==='active');
 s=act(caused.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 assert.deepEqual(s.pending.selected,['active','bounce']);
 s=act(caused.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-bounce-own');
 s=act(caused.pack,s,a=>a.type==='chooseOwnBounce'&&a.uid===null);
 assert.equal(s.pending.kind,'effect-active-own-trait');
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 s=act(caused.pack,s,a=>a.type==='chooseActiveOwnTrait'&&a.uid===ally.uid);
 assert.equal(s.players[0].energy.find(c=>c?.uid===ally.uid).ready,true);
 assert.equal(s.players[0].front.find(c=>c?.uid===plain.uid).ready,false);
 assert.equal(apReady(s),spent);
 assert.equal(s.pending,null);

 const life=open(cards,2804);
 s=life.s;
 seat(s,1,'Y5','energy',0,true);
 const home=seat(s,1,'BASE','energy',1,true);
 const mate=seat(s,1,'LOW','front',0,false);
 const hitter=seat(s,0,'HOST','front',0,true);
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life=[pull(s,1,'IMC-1-028')];
 fuel(s,3,1);
 s=act(life.pack,s,a=>a.type==='next');
 s=act(life.pack,s,a=>a.type==='attack'&&a.uid===hitter.uid);
 if(s.pending?.kind==='block')s=act(life.pack,s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending?.kind,'life-trigger');
 s=act(life.pack,s,a=>a.mode==='raid'&&a.baseUid===home.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.equal(s.pending.options.some(o=>o.id==='active'),true);
 assert.equal(s.pending.options.some(o=>o.id==='bounce'),true);
 s=act(life.pack,s,a=>a.mode==='pick'&&a.id==='active');
 s=act(life.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-active-own-trait');
 assert.equal(s.pending.choices.includes(mate.uid),true);
 assert.equal(bodies(s),before);
});

test('IMC-1-033 publishes one of each printed name and bottoms the rest',()=>{
 const cards=[
  real('IMC-1-033'),
  face({id:'Y5',name:'黃能源',color:'yellow',gen:5,bp:1000}),
  face({id:'A',name:'本田 未央',color:'yellow'}),
  face({id:'B',name:'日野 茜',color:'yellow'}),
  face({id:'C',name:'高森 藍子',color:'yellow'}),
  face({id:'D',name:'路人',color:'red'}),
  face({id:'E',name:'本田 未央',color:'red'})
 ];
 const opened=open(cards,3301);
 const before=bodies(opened.s);
 let s=opened.s;
 seat(s,0,'Y5','energy',0,true);
 const window=stackTop(s,['A','D','B','E','C','D']);
 assert.equal(legalUniversalActions(opened.pack,s).some(a=>a.type==='raid'&&a.cardId==='IMC-1-033'),false);
 s=play(opened.pack,s,'IMC-1-033');
 assert.equal(s.pending.kind,'effect-top-script');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(opened.pack,s,0).inspected.length,6);
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 for(const card of window)assert.equal(hidden(opened.pack,s,card.uid),false);
 let legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.uid===window[0].uid),true);
 assert.equal(legal.some(a=>a.uid===window[1].uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,
  {type:'chooseTopScript',mode:'pick',uid:window[1].uid}),/not currently legal/);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.uid===window[0].uid);
 legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.uid===window[0].uid),false);
 assert.equal(legal.some(a=>a.uid===window[3].uid),false);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.uid===window[2].uid);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.uid===window[4].uid);
 s=act(opened.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-top-order');
 for(const card of [window[0],window[2],window[4]]){
  assert.equal(s.players[0].hand.some(c=>c.uid===card.uid),true);
  assert.equal(s.players[0].front.some(c=>c?.uid===card.uid),false);
  assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===card.uid),true);
 }
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid),false);
 const remain=[window[5],window[3],window[1]];
 s=orderRest(opened.pack,s,remain.map(c=>c.uid));
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),remain.map(c=>c.uid));
 assert.equal(bodies(s),before);

 const short=open(cards,3302);
 s=short.s;
 seat(s,0,'Y5','energy',0,true);
 const only=stackTop(s,['D'])[0];
 s.players[0].outside.push(...s.players[0].deck.splice(1));
 s=play(short.pack,s,'IMC-1-033');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,only.uid);
 assert.equal(s.publicReveals.some(r=>r.uid===only.uid),false);
 assert.equal(bodies(s),before);

 const none=open(cards,3303);
 s=none.s;
 seat(s,0,'Y5','energy',0,true);
 s.players[0].outside.push(...s.players[0].deck.splice(0));
 s=play(none.pack,s,'IMC-1-033');
 assert.equal(s.pending,null);
 assert.equal(bodies(s),before);
});

test('IMC-1-065 rests or raids from the looked cards and leaves the hand alone',()=>{
 const cards=[
  real('IMC-1-065'),
  face({id:'B5',name:'藍能源',color:'blue',gen:5,bp:1000}),
  face({id:'RAID',name:'可突襲',color:'blue',traits:[girls],raidName:'底板',effects:{onPlay:[raidDraw]}}),
  face({id:'REST',name:'只休息',color:'blue',traits:[girls],effects:{onPlay:[raidDraw]}}),
  face({id:'RED',name:'紅',color:'red',traits:[girls],raidName:'底板'}),
  face({id:'HAND',name:'手牌',color:'blue',traits:[girls],raidName:'底板'}),
  face({id:'BASE',name:'底板',color:'blue'})
 ];
 const opened=open(cards,6501);
 const before=bodies(opened.s);
 let s=opened.s;
 seat(s,0,'B5','energy',0,true);
 const base=seat(s,0,'BASE','front',0,true);
 const window=stackTop(s,['RED','RAID','REST']);
 const hand=hold(s,'HAND');
 s=play(opened.pack,s,'IMC-1-065');
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 for(const card of window)assert.equal(hidden(opened.pack,s,card.uid),false);
 let legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.uid===window[0].uid&&a.mode==='enter'),false);
 assert.equal(legal.some(a=>a.uid===hand.uid),false);
 assert.equal(legal.some(a=>a.mode==='raid'&&a.uid===window[1].uid&&a.baseUid===base.uid),true);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===window[1].uid),true);
 assert.equal(legal.some(a=>a.mode==='raid'&&a.uid===window[2].uid),false);
 assert.equal(boardEntrySelection(legal,window[1].uid).needsMode,true);
 const handSize=s.players[0].hand.length;
 const spent=apReady(s);
 s=act(opened.pack,s,a=>a.mode==='raid'&&a.uid===window[1].uid&&a.baseUid===base.uid&&a.line==='front');
 assert.equal(s.players[0].front[0].uid,window[1].uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].hand.length,handSize+1);
 assert.equal(s.players[0].hand.some(c=>c.uid===hand.uid),true);
 assert.equal(apReady(s),spent);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.uids.includes(window[1].uid),false);
 assert.equal(bodies(s),before);

 const rested=open(cards,6502);
 s=rested.s;
 seat(s,0,'B5','energy',0,true);
 const only=stackTop(s,['REST','RED','RAID']);
 hold(s,'HAND');
 s=play(rested.pack,s,'IMC-1-065');
 legal=legalUniversalActions(rested.pack,s);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===only[0].uid),true);
 const size=s.players[0].hand.length;
 s=act(rested.pack,s,a=>a.mode==='enter'&&a.uid===only[0].uid&&a.line==='energy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===only[0].uid&&c.ready===false),true);
 assert.equal(s.players[0].hand.length,size);
 assert.equal(s.pending.kind,'effect-top-order');
 s=orderRest(rested.pack,s,[only[2].uid,only[1].uid]);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[only[2].uid,only[1].uid]);
 assert.equal(bodies(s),before);

 const paid=open(cards,6503);
 s=paid.s;
 seat(s,0,'B5','energy',0,true);
 const paidBase=seat(s,0,'BASE','front',0,true);
 const paidRaid=hold(s,'RAID');
 fuel(s);
 const paidAction=legalUniversalActions(paid.pack,s).find(a=>a.type==='raid'&&
  a.uid===paidRaid.uid&&a.baseUid===paidBase.uid);
 assert.ok(paidAction);
 const deck=s.players[0].deck.length;
 s=dispatchUniversalAction(paid.pack,s,paidAction);
 assert.equal(s.players[0].hand.length,s.players[0].hand.length);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].front[0].ready,true);
 assert.notEqual(s.pending?.kind,'effect-top-script');
 assert.equal(bodies(s),before);

 const empty=open(cards,6504);
 s=empty.s;
 seat(s,0,'B5','energy',0,true);
 s.players[0].outside.push(...s.players[0].deck.splice(0));
 s=play(empty.pack,s,'IMC-1-065');
 assert.equal(s.pending,null);
 const one=open(cards,6505);
 s=one.s;
 seat(s,0,'B5','energy',0,true);
 const leftover=stackTop(s,['RED'])[0];
 s.players[0].outside.push(...s.players[0].deck.splice(1));
 s=play(one.pack,s,'IMC-1-065');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,leftover.uid);
});

test('IMC-1-078 looks six and rests only an exact red Starry character',()=>{
 const cards=[
  real('IMC-1-078'),
  face({id:'R5',name:'紅能源',color:'red',gen:5,bp:1000}),
  face({id:'HIT',name:'恰好',color:'red',energy:2,traits:[star],raidName:'底板'}),
  face({id:'LOW',name:'較低',color:'red',energy:1,traits:[star]}),
  face({id:'HIGH',name:'較高',color:'red',energy:3,traits:[star],raidName:'底板'}),
  face({id:'BLUE',name:'藍星',color:'blue',energy:2,traits:[star],raidName:'底板'}),
  face({id:'BASE',name:'アナスタシア',color:'red',energy:1}),
  face({id:'GATE',name:'使之',color:'red',energy:0,effects:{onPlay:[{
   op:'raidOwnHandNamed',optional:true,max:1,requireAffordableEnergy:true,
   names:['アナスタシア']}]}})
 ];
 const opened=open(cards,7801);
 const before=bodies(opened.s);
 let s=opened.s;
 seat(s,0,'R5','energy',0,true);
 seat(s,0,'BASE','front',0,true);
 const window=stackTop(s,['LOW','HIGH','BLUE','HIT','LOW','HIGH']);
 s=play(opened.pack,s,'IMC-1-078');
 const actor=[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId==='IMC-1-078');
 assert.equal(universalImpactNull(opened.pack,s,actor),true);
 assert.equal(s.pending.uids.length,6);
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 for(const card of window)assert.equal(hidden(opened.pack,s,card.uid),false);
 let legal=legalUniversalActions(opened.pack,s);
 assert.deepEqual([...new Set(legal.filter(a=>a.uid).map(a=>a.uid))],[window[3].uid]);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(boardEntrySelection(legal,window[3].uid).raid.length,0);
 s=act(opened.pack,s,a=>a.mode==='enter'&&a.uid===window[3].uid&&a.line==='front'&&a.slot===1);
 assert.equal(s.players[0].front[1].uid,window[3].uid);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.pending.kind,'effect-top-order');
 s=orderRest(opened.pack,s,[window[0].uid,window[1].uid,window[2].uid,window[4].uid,window[5].uid]);
 assert.equal(s.pending,null);
 assert.equal(bodies(s),before);

 const paid=open(cards,7802);
 s=paid.s;
 seat(s,0,'R5','energy',0,true);
 const paidBase=seat(s,0,'BASE','front',0,true);
 const paidCard=hold(s,'IMC-1-078');
 fuel(s);
 const topped=stackTop(s,['HIGH','LOW']);
 s.players[0].outside.push(...s.players[0].deck.splice(2));
 s=dispatchUniversalAction(paid.pack,s,legalUniversalActions(paid.pack,s).find(a=>
  a.type==='raid'&&a.uid===paidCard.uid&&a.baseUid===paidBase.uid));
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,topped.map(c=>c.uid));
 assert.equal([...s.players[0].front,...s.players[0].energy].some(c=>c?.uid===topped[0].uid),false);
 s=orderRest(paid.pack,s,topped.map(c=>c.uid));
 assert.equal(s.pending,null);
 assert.equal(bodies(s),before);

 const caused=open(cards,7803);
 s=caused.s;
 seat(s,0,'R5','energy',0,true);
 const host=seat(s,0,'BASE','front',0,true);
 hold(s,'IMC-1-078');
 stackTop(s,['HIT']);
 s.players[0].outside.push(...s.players[0].deck.splice(1));
 s=play(caused.pack,s,'GATE');
 const fromHand=s.players[0].hand.find(c=>c.cardId==='IMC-1-078');
 s=act(caused.pack,s,a=>a.mode==='raid'&&a.uid===fromHand.uid&&a.baseUid===host.uid);
 const raider=[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId==='IMC-1-078');
 assert.equal(raider.ready,true);
 assert.equal(s.pending.kind,'effect-top-script');
 legal=legalUniversalActions(caused.pack,s);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.mode==='enter'),true);
 s=act(caused.pack,s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).cardId,'HIT');
 assert.equal(bodies(s),before);

 const none=open(cards,7804);
 s=none.s;
 seat(s,0,'R5','energy',0,true);
 s.players[0].outside.push(...s.players[0].deck.splice(0));
 s=play(none.pack,s,'IMC-1-078');
 assert.equal(s.pending,null);
});

test('IMC-1-112 bottoms one character before a private rest and an unrestricted add',()=>{
 const cards=[
  real('IMC-1-112'),
  face({id:'B5',name:'藍能源',color:'blue',gen:5,bp:1000}),
  face({id:'OTHER',name:'其他',color:'yellow'}),
  face({id:'BLUE',name:'藍',color:'blue',traits:[girls],raidName:'底板'}),
  face({id:'ANY',name:'任意',type:'event',bp:0,color:'red'}),
  face({id:'LEFT',name:'剩下',color:'green'}),
  face({id:'BASE',name:'渋谷 凛',color:'blue',energy:1}),
  face({id:'GATE',name:'使之',color:'blue',energy:0,effects:{onPlay:[{
   op:'raidOwnHandNamed',optional:true,max:1,requireAffordableEnergy:true,
   names:['渋谷 凛']}]}})
 ];
 const skipped=open(cards,11201);
 const before=bodies(skipped.s);
 let s=skipped.s;
 seat(s,0,'B5','energy',0,true);
 const marker=stackTop(s,['LEFT'])[0];
 s=play(skipped.pack,s,'IMC-1-112');
 const arrived=[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId==='IMC-1-112');
 assert.equal(universalImpactNull(skipped.pack,s,arrived),true);
 assert.equal(s.pending.kind,'effect-bottom-own');
 assert.equal(s.pending.choices.includes(arrived.uid),true);
 s=act(skipped.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,marker.uid);
 assert.equal(bodies(s),before);

 const opened=open(cards,11202);
 s=opened.s;
 seat(s,0,'B5','energy',0,true);
 const other=seat(s,0,'OTHER','front',1,true);
 const window=stackTop(s,['BLUE','ANY','LEFT']);
 const opp=seat(s,1,'BLUE','front',0,true);
 s=play(opened.pack,s,'IMC-1-112');
 assert.equal(s.pending.choices.includes(opp.uid),false);
 assert.equal(s.pending.choices.includes(other.uid),true);
 s=act(opened.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===other.uid);
 assert.equal(s.players[0].deck.at(-1).uid,other.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 assert.equal(hidden(opened.pack,s,window[1].uid),false);
 let legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===window[0].uid),true);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.uid===window[1].uid),false);
 assert.equal(boardEntrySelection(legal,window[0].uid).raid.length,0);
 s=act(opened.pack,s,a=>a.mode==='enter'&&a.uid===window[0].uid&&a.line==='energy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===window[0].uid&&c.ready===false),true);
 legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.uid===window[0].uid),false);
 assert.equal(legal.some(a=>a.mode==='pick'&&a.uid===window[1].uid),true);
 assert.equal(legal.some(a=>a.mode==='pick'&&a.uid===window[2].uid),true);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.uid===window[1].uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid),false);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,window[2].uid);
 assert.equal(bodies(s),before);

 const paid=open(cards,11203);
 s=paid.s;
 seat(s,0,'B5','energy',0,true);
 const paidBase=seat(s,0,'BASE','front',0,true);
 const paidOther=seat(s,0,'OTHER','front',1,true);
 const paidWindow=stackTop(s,['BLUE','ANY','LEFT']);
 s.players[0].outside.push(...s.players[0].deck.splice(3));
 const paidCard=hold(s,'IMC-1-112');
 fuel(s);
 s=dispatchUniversalAction(paid.pack,s,legalUniversalActions(paid.pack,s).find(a=>
  a.type==='raid'&&a.uid===paidCard.uid&&a.baseUid===paidBase.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===paidCard.uid&&c.ready===true),true);
 assert.equal(s.pending.kind,'effect-bottom-own');
 s=act(paid.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===paidOther.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(legalUniversalActions(paid.pack,s).some(a=>a.mode==='raid'),false);
 s=act(paid.pack,s,a=>a.mode==='skip');
 assert.equal(s.pending.takes[s.pending.index].to,'hand');
 s=act(paid.pack,s,a=>a.mode==='pick'&&a.uid===paidWindow[1].uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===paidWindow[1].uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===paidWindow[1].uid),false);
 assert.equal(s.pending.kind,'effect-top-order');
 s=orderRest(paid.pack,s,[paidWindow[0].uid,paidWindow[2].uid]);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[paidWindow[0].uid,paidWindow[2].uid]);
 assert.equal(bodies(s),before);

 const caused=open(cards,11204);
 s=caused.s;
 seat(s,0,'B5','energy',0,true);
 const host=seat(s,0,'BASE','front',0,true);
 hold(s,'IMC-1-112');
 s.players[0].outside.push(...s.players[0].deck.splice(0));
 s=play(caused.pack,s,'GATE');
 const fromHand=s.players[0].hand.find(c=>c.cardId==='IMC-1-112');
 s=act(caused.pack,s,a=>a.mode==='raid'&&a.uid===fromHand.uid&&a.baseUid===host.uid);
 const raided=[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId==='IMC-1-112');
 assert.equal(raided.ready,true);
 assert.equal(s.pending.kind,'effect-bottom-own');
 s=act(caused.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(bodies(s),before);

 const lone=open(cards,11205);
 s=lone.s;
 seat(s,0,'B5','energy',0,true);
 const single=stackTop(s,['ANY'])[0];
 s.players[0].outside.push(...s.players[0].deck.splice(1));
 const parked=seat(s,0,'OTHER','front',1,true);
 s=play(lone.pack,s,'IMC-1-112');
 s=act(lone.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===parked.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(s.pending.takes[s.pending.index].to,'hand');
 assert.equal(s.pending.takes[s.pending.index].publish,false);
 assert.equal(legalUniversalActions(lone.pack,s).some(a=>a.mode==='enter'),false);
 s=act(lone.pack,s,a=>a.mode==='pick'&&a.uid===single.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===single.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===single.uid),false);
 assert.equal(s.pending,null);
 assert.equal(bodies(s),before);
});
