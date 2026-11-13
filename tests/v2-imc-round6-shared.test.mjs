// Round 6 shared rules. Synthetic cards exercise the new combinations.
// Unfinished IMC cards stay out of the battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {loadImcOfficialStarter} from '../dist/imc/starter-deck.mjs';
import {IMC_PROGRAMS_001_050} from '../dist/universal-v2/imc/programs-001-050.mjs';
import {IMC_PROGRAMS_051_100} from '../dist/universal-v2/imc/programs-051-100.mjs';
import {IMC_PROGRAMS_STARTER} from '../dist/universal-v2/imc/programs-starter.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {boardEntryMode,boardEntrySelection,entryClickPlan,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const deploy={op:'deployOwnHandRestOrRaid',type:'character',color:'yellow',ap:1,
 maxEnergy:30,max:1,optional:true,requireAffordableEnergy:true,
 names:['日野 茜','高森 藍子']};
const bounce={op:'bounceOwnOtherUnderEnergy',optional:true,energy:3,
 trait:'ポジティブパッション',then:[deploy]};
const active={op:'activeOwnTrait',optional:true,max:1,trait:'ポジティブパッション'};
const raidWhen={kind:'selfOwnEffectRaid',turn:'any'};
const nameWhen={kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'本田 未央'};
function printedOptions(when){
 return {op:'choosePrintedOptions',max:2,optional:true,options:[
  {id:'bounce',label:'回手後休息登場或突襲',then:[bounce]},
  {id:'active',label:'活動積極熱情',...(when?{when}:{}),then:[active]}
 ]};
}
const namedLook={op:'lookTopScript',count:6,rest:'bottom',takes:[{
 to:'hand',eachName:true,publish:true,names:['本田 未央','日野 茜','高森 藍子']}]};
const raidLook={op:'lookTopScript',count:3,rest:'bottom',takes:[{
 to:'restOrRaid',type:'character',max:1,color:'blue',trait:'ガールズ・イン・ザ・フロンティア'}]};
const exactLook={op:'lookTopScript',count:6,rest:'bottom',takes:[{
 to:'rest',type:'character',max:1,color:'red',trait:'Starry-Go-Round',energyExact:2}]};
const gatedLook={op:'bottomOwnCharacterThen',optional:true,max:1,type:'character',then:[{
 op:'lookTopScript',count:3,rest:'bottom',takes:[
  {to:'rest',type:'character',max:1,color:'blue',trait:'ガールズ・イン・ザ・フロンティア'},
  {to:'hand',max:1,publish:false}
 ]}]};

function face(extra){
 const effects=extra.effects||{};
 const {effects:ignored,implementation,...rest}=extra;
 void ignored;
 return {
  id:rest.id,name:rest.name||rest.id,color:rest.color||'blue',
  type:rest.type||'character',energy:rest.energy??0,ap:rest.ap??1,
  bp:rest.bp??2000,gen:rest.gen??0,traits:rest.traits||[],trigger:null,
  ...rest,
  implementation:implementation||(Object.keys(effects).length||rest.mainAbility?'dsl':'vanilla'),
  effects
 };
}
function open(cards,seed=6,packId='probe'){
 const fillers=Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),name:'填充'+i,implementation:'vanilla',bp:1000
 }));
 const bodies=[...cards,...fillers];
 const pack=createUniversalPack({id:packId,version:'imc-r6-'+seed,cards:bodies});
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
 const pl=s.players[p];
 const cards=ids.map(id=>{
  for(const zone of ['deck','hand','life','outside']){
   const index=pl[zone].findIndex(c=>c.cardId===id);
   if(index>=0)return pl[zone].splice(index,1)[0];
  }
  throw Error('Missing '+id);
 });
 pl.deck.unshift(...cards);
 return cards;
}
function fuel(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function apReady(s,p=0){
 return s.players[p].apCards.filter(c=>c.ready).length;
}
function play(pack,s,id,p=0){
 const card=hold(s,id,p);
 fuel(s,2,p);
 const action=legalUniversalActions(pack,s).find(a=>a.uid===card.uid&&
  (a.type==='play'||a.type==='event'));
 assert.ok(action,id);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function act(pack,s,pred){
 const action=legalUniversalActions(pack,s).find(pred);
 assert.ok(action,s.pending?.kind);
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function bodies(s){
 let n=0;
 const walk=c=>{
  if(!c)return;
  n+=1;
  for(const layer of [...(c.stack||[]),...(c.under||[])])walk(layer);
 };
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const c of p[zone]||[])walk(c);
  for(const line of ['front','energy'])for(const c of p[line])walk(c);
 }
 return n;
}
function ids(actions){
 return actions.filter(a=>a.mode==='pick'&&a.id).map(a=>a.id);
}

test('printed options resolve top to bottom and can be fewer than two',()=>{
 const cards=[
  face({id:'SRC',name:'主角',energy:0,color:'yellow',
   effects:{onPlay:[printedOptions(nameWhen)]}}),
  face({id:'LOW',name:'本田 未央',energy:2,color:'yellow',traits:['ポジティブパッション']}),
  face({id:'HIGH',name:'高坂',energy:4,color:'yellow',traits:['ポジティブパッション']}),
  face({id:'HINO',name:'日野 茜',energy:0,color:'yellow'}),
  face({id:'RICH',name:'高森 藍子',energy:5,color:'yellow'})
 ];
 const opened=open(cards,61);
 const before=bodies(opened.s);
 let s=opened.s;
 const low=seat(s,0,'LOW','front',1,false);
 const high=seat(s,0,'HIGH','energy',0,false);
 hold(s,'HINO');
 hold(s,'RICH');
 s=play(opened.pack,s,'SRC');
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.order,['bounce','active']);
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce','active']);
 const legal=legalUniversalActions(opened.pack,s);
 assert.deepEqual(ids(legal),['bounce','active']);
 assert.equal(legal.filter(a=>a.id==='bounce').length,1);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,
  {type:'chooseOrderedSubset',mode:'pick',id:'rest'}),/Action not currently legal/);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='active');
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 assert.deepEqual(s.pending.selected,['active','bounce']);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 assert.deepEqual(s.pending.selected,['active']);
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 const ap=apReady(s);
 s=act(opened.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-bounce-own');
 s=act(opened.pack,s,a=>a.type==='chooseOwnBounce'&&a.uid===low.uid);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 s=act(opened.pack,s,a=>a.type==='chooseHandRestOrRaid'&&a.uid===null);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===low.uid),false);
 assert.equal(s.players[0].energy.find(c=>c?.uid===high.uid).ready,false);
 assert.equal(s.pending,null);
 assert.equal(apReady(s),ap);
 assert.equal(bodies(s),before);
});

test('skipping the bounce does not play from hand, and a failed when is not offered',()=>{
 const cards=[
  face({id:'SRC',name:'主角',energy:0,color:'yellow',raidName:'底板',
   effects:{onPlay:[printedOptions(raidWhen)]}}),
  face({id:'BASE',name:'底板',energy:1,color:'yellow'}),
  face({id:'LOW',name:'本田 未央',energy:2,color:'yellow',traits:['ポジティブパッション']}),
  face({id:'HINO',name:'日野 茜',energy:0,color:'yellow',raidName:'底板'}),
  face({id:'RICH',name:'高森 藍子',energy:5,color:'yellow'}),
  face({id:'GATE',name:'門',effects:{onPlay:[{op:'raidOwnHandNamed',optional:true,max:1,
   requireAffordableEnergy:true,names:['主角']}]}})
 ];
 const paid=open(cards,63);
 let s=paid.s;
 const base=seat(s,0,'BASE','front',0,true);
 const low=seat(s,0,'LOW','energy',0,false);
 const hino=hold(s,'HINO');
 hold(s,'RICH');
 const src=hold(s,'SRC');
 fuel(s);
 const raid=legalUniversalActions(paid.pack,s).find(a=>a.type==='raid'&&a.uid===src.uid&&
  a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(paid.pack,s,raid);
 assert.equal(assertUniversalMatch(paid.pack,s),true);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce']);
 s=act(paid.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 s=act(paid.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.trait,'ポジティブパッション');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(src.uid),false);
 s=act(paid.pack,s,a=>a.type==='chooseOwnBounce'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===hino.uid),true);
 assert.equal(s.players[0].energy.some(c=>c?.uid===low.uid),true);

 const rested=open(cards,64);
 s=rested.s;
 seat(s,0,'LOW','front',1,false);
 s=play(rested.pack,s,'SRC');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce']);
 s=act(rested.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending,null);

 const empty=open(cards,65);
 s=empty.s;
 s=play(empty.pack,s,'SRC');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce']);
 s=act(empty.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 s=act(empty.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending,null);

 const caused=open(cards,66);
 s=caused.s;
 const host=seat(s,0,'BASE','front',0,true);
 hold(s,'SRC');
 s=play(caused.pack,s,'GATE');
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 s=act(caused.pack,s,a=>a.mode==='raid'&&a.baseUid===host.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce','active']);
 assert.equal(s.pending.entryCause,'handEffectRaid');
});

test('a successful bounce replays the hand against the new board',()=>{
 const cards=[
  face({id:'SRC',name:'主角',energy:0,color:'yellow',
   effects:{onPlay:[printedOptions(raidWhen)]}}),
  face({id:'LOW',name:'本田 未央',energy:3,color:'yellow',traits:['ポジティブパッション']}),
  face({id:'BASE',name:'底板',energy:1,color:'yellow'}),
  face({id:'HINO',name:'日野 茜',energy:0,color:'yellow',raidName:'底板'}),
  face({id:'RICH',name:'高森 藍子',energy:5,color:'yellow',raidName:'底板'})
 ];
 const opened=open(cards,67);
 let s=opened.s;
 const low=seat(s,0,'LOW','front',1,false);
 const base=seat(s,0,'BASE','energy',0,true);
 const hino=hold(s,'HINO');
 const rich=hold(s,'RICH');
 const ap=apReady(s);
 s=play(opened.pack,s,'SRC');
 s=act(opened.pack,s,a=>a.mode==='pick'&&a.id==='bounce');
 s=act(opened.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-bounce-own');
 s=act(opened.pack,s,a=>a.type==='chooseOwnBounce'&&a.uid===low.uid);
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 const handActs=legalUniversalActions(opened.pack,s);
 assert.equal(handActs.some(a=>a.uid===hino.uid),true);
 assert.equal(handActs.some(a=>a.uid===rich.uid),false);
 assert.equal(handActs.some(a=>a.uid===low.uid),false);
 s=act(opened.pack,s,a=>a.mode==='enter'&&a.uid===hino.uid&&a.line==='front');
 assert.equal(s.players[0].front.some(c=>c?.uid===hino.uid&&c.ready===false),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(apReady(s),ap);
 assert.equal(s.players[0].energy.some(c=>c?.uid===base.uid),true);
});

test('named look publishes only the added cards and keeps ineligible cards visible',()=>{
 const cards=[
  face({id:'LOOK',name:'三名',type:'event',bp:0,energy:0,
   effects:{onPlay:[namedLook]}}),
  face({id:'A',name:'本田 未央',color:'yellow'}),
  face({id:'B',name:'日野 茜',color:'yellow'}),
  face({id:'C',name:'高森 藍子',color:'yellow'}),
  face({id:'D',name:'路人',color:'red'}),
  face({id:'E',name:'本田 未央',color:'red'})
 ];
 const opened=open(cards,68);
 const before=bodies(opened.s);
 let s=opened.s;
 const window=stackTop(s,['A','D','B','E','C','D']);
 s=play(opened.pack,s,'LOOK');
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(s.pending.uids.length,6);
 const mine=universalPrivateChoices(opened.pack,s,0);
 assert.equal(mine.inspected.length,6);
 assert.deepEqual(mine.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 const hidden=JSON.stringify(universalPublicView(opened.pack,s,1));
 for(const card of window)assert.equal(hidden.includes(card.uid),false);
 let legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.uid===window[0].uid),true);
 assert.equal(legal.some(a=>a.uid===window[1].uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.pack,s,
  {type:'chooseTopScript',mode:'pick',uid:window[1].uid}),/Action not currently legal/);
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
  assert.equal(s.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===card.uid),true);
 }
 assert.equal(s.publicReveals.some(r=>r.uid===window[1].uid),false);
 const remain=[window[5],window[3],window[1]];
 for(const card of remain)s=act(opened.pack,s,a=>a.type==='chooseTopOrder'&&a.uid===card.uid);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),remain.map(c=>c.uid));
 assert.equal(bodies(s),before);

 const skipped=open(cards,69);
 s=skipped.s;
 const short=stackTop(s,['D']);
 const top=short[0].uid;
 s.players[0].outside.push(...s.players[0].deck.splice(1));
 s=play(skipped.pack,s,'LOOK');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,top);
 assert.equal(s.publicReveals.some(r=>r.uid===top),false);

 const none=open(cards,70);
 s=none.s;
 s.players[0].outside.push(...s.players[0].deck.splice(0));
 s=play(none.pack,s,'LOOK');
 assert.equal(s.pending,null);
});

test('a looked character rests or raids from the deck window, not the hand',()=>{
 const raidDraw={op:'ifLiveThen',when:raidWhen,then:[{op:'draw',count:1}]};
 const cards=[
  face({id:'LOOK',name:'藍窗',type:'event',bp:0,energy:0,effects:{onPlay:[raidLook]}}),
  face({id:'RAID',name:'可突襲',color:'blue',traits:['ガールズ・イン・ザ・フロンティア'],
   raidName:'底板',effects:{onPlay:[raidDraw]}}),
  face({id:'REST',name:'只休息',color:'blue',traits:['ガールズ・イン・ザ・フロンティア'],
   effects:{onPlay:[raidDraw]}}),
  face({id:'RED',name:'紅',color:'red',traits:['ガールズ・イン・ザ・フロンティア'],raidName:'底板'}),
  face({id:'HAND',name:'手牌',color:'blue',traits:['ガールズ・イン・ザ・フロンティア'],raidName:'底板'}),
  face({id:'BASE',name:'底板',color:'blue'})
 ];
 const opened=open(cards,71);
 let s=opened.s;
 const base=seat(s,0,'BASE','front',0,true);
 const window=stackTop(s,['RED','RAID','REST']);
 const hand=hold(s,'HAND');
 const ap=apReady(s);
 s=play(opened.pack,s,'LOOK');
 const handSize=s.players[0].hand.length;
 let legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.uid===window[0].uid&&a.mode==='enter'),false);
 assert.equal(legal.some(a=>a.uid===hand.uid),false);
 assert.equal(legal.some(a=>a.mode==='raid'&&a.uid===window[1].uid&&a.baseUid===base.uid),true);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===window[1].uid),true);
 assert.equal(legal.some(a=>a.mode==='raid'&&a.uid===window[2].uid),false);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===window[2].uid),true);
 assert.equal(boardEntryMode(legal.find(a=>a.mode==='enter'&&a.uid===window[2].uid)),'normal');
 assert.equal(boardEntryMode(legal.find(a=>a.mode==='raid'&&a.uid===window[1].uid)),'raid');
 const both=legal.filter(a=>a.uid===window[1].uid&&(a.mode==='enter'||a.mode==='raid'));
 assert.equal(boardEntrySelection(both,window[1].uid).needsMode,true);
 assert.equal(entryClickPlan({selectedUid:window[1].uid,entryMode:null,line:'front',slot:1,
  slotUid:null,legal:both}).type,'entry-mode');
 s=act(opened.pack,s,a=>a.mode==='raid'&&a.uid===window[1].uid&&a.baseUid===base.uid&&a.line==='front');
 assert.equal(s.players[0].front[0].uid,window[1].uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].hand.length,handSize+1);
 assert.equal(s.players[0].hand.some(c=>c.uid===hand.uid),true);
 assert.equal(apReady(s),ap);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.pending.uids.includes(window[1].uid),false);

 const bare=open(cards,72);
 s=bare.s;
 const only=stackTop(s,['REST','RED','RAID']);
 hold(s,'HAND');
 s=play(bare.pack,s,'LOOK');
 legal=legalUniversalActions(bare.pack,s);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===only[0].uid),true);
 const size=s.players[0].hand.length;
 s=act(bare.pack,s,a=>a.mode==='enter'&&a.uid===only[0].uid&&a.line==='energy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===only[0].uid&&c.ready===false),true);
 assert.equal(s.players[0].hand.length,size);
 assert.equal(s.players[0].deck.includes(only[0]),false);
});

test('exact energy rest does not invent a raid',()=>{
 const cards=[
  face({id:'LOOK',name:'星',type:'event',bp:0,energy:0,color:'red',effects:{onPlay:[exactLook]}}),
  face({id:'HIT',name:'恰好',color:'red',energy:2,traits:['Starry-Go-Round'],raidName:'底板'}),
  face({id:'LOW',name:'較低',color:'red',energy:1,traits:['Starry-Go-Round']}),
  face({id:'HIGH',name:'較高',color:'red',energy:3,traits:['Starry-Go-Round'],raidName:'底板'}),
  face({id:'BLUE',name:'藍星',color:'blue',energy:2,traits:['Starry-Go-Round'],raidName:'底板'}),
  face({id:'BASE',name:'底板',color:'red'})
 ];
 const opened=open(cards,73);
 let s=opened.s;
 seat(s,0,'BASE','front',0,true);
 const window=stackTop(s,['LOW','HIGH','BLUE','HIT','LOW','HIGH']);
 s=play(opened.pack,s,'LOOK');
 assert.equal(s.pending.uids.length,6);
 const legal=legalUniversalActions(opened.pack,s);
 assert.deepEqual(legal.filter(a=>a.uid).map(a=>a.uid).filter((uid,i,all)=>all.indexOf(uid)===i),
  [window[3].uid]);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(boardEntrySelection(legal,window[3].uid).raid.length,0);
 assert.equal(boardEntrySelection(legal,window[3].uid).needsMode,false);
 s=act(opened.pack,s,a=>a.mode==='enter'&&a.uid===window[3].uid&&a.line==='front'&&a.slot===1);
 assert.equal(s.players[0].front[1].uid,window[3].uid);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.pending.kind,'effect-top-order');
});

test('bottom placement gates the look, and one card cannot enter and be added',()=>{
 const cards=[
  face({id:'SRC',name:'凛',color:'blue',energy:0,effects:{onPlay:[gatedLook]}}),
  face({id:'OTHER',name:'其他',color:'yellow'}),
  face({id:'BLUE',name:'藍',color:'blue',traits:['ガールズ・イン・ザ・フロンティア']}),
  face({id:'ANY',name:'任意',type:'event',bp:0,color:'red'}),
  face({id:'LEFT',name:'剩下',color:'green'})
 ];
 const skipped=open(cards,74);
 let s=skipped.s;
 const marker=stackTop(s,['LEFT'])[0];
 s=play(skipped.pack,s,'SRC');
 assert.equal(s.pending.kind,'effect-bottom-own');
 s=act(skipped.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck[0].uid,marker.uid);

 const opened=open(cards,75);
 s=opened.s;
 const other=seat(s,0,'OTHER','front',1,true);
 const window=stackTop(s,['BLUE','ANY','LEFT']);
 const before=bodies(s);
 s=play(opened.pack,s,'SRC');
 s=act(opened.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===other.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(s.players[0].deck.at(-1).uid,other.uid);
 assert.equal(universalPrivateChoices(opened.pack,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(opened.pack,s,1)).includes(window[1].uid),false);
 let legal=legalUniversalActions(opened.pack,s);
 assert.equal(legal.some(a=>a.mode==='enter'&&a.uid===window[0].uid),true);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.mode==='pick'),false);
 assert.equal(legal.some(a=>a.uid===window[1].uid),false);
 s=act(opened.pack,s,a=>a.mode==='enter'&&a.uid===window[0].uid&&a.line==='energy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===window[0].uid&&c.ready===false),true);
 assert.equal(s.pending.takes[s.pending.index].publish,false);
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

 const handFirst=open(cards,76);
 s=handFirst.s;
 stackTop(s,['BLUE']);
 s.players[0].outside.push(...s.players[0].deck.splice(1));
 seat(s,0,'OTHER','energy',0,true);
 s=play(handFirst.pack,s,'SRC');
 const bottom=[...s.players[0].front,...s.players[0].energy].find(c=>c?.cardId==='SRC');
 s=act(handFirst.pack,s,a=>a.type==='chooseBottomOwn'&&a.uid===bottom.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 s=act(handFirst.pack,s,a=>a.mode==='skip');
 assert.equal(s.pending.takes[s.pending.index].to,'hand');
 const only=s.pending.uids[0];
 s=act(handFirst.pack,s,a=>a.mode==='pick'&&a.uid===only);
 assert.equal(s.players[0].hand.some(c=>c.uid===only),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===only),false);
 assert.equal(s.pending,null);
});

test('the same ops work outside IMC while unfinished cards stay out of the pack',()=>{
 const cards=[
  face({id:'CGD-1-001',name:'其他作品',color:'green',energy:0,
   effects:{onPlay:[printedOptions(nameWhen)]}}),
  face({id:'CGD-1-002',name:'本田 未央',color:'green',energy:1,traits:['ポジティブパッション']})
 ];
 const opened=open(cards,77,'code-geass');
 let s=opened.s;
 const named=seat(s,0,'CGD-1-002','front',1,false);
 s=play(opened.pack,s,'CGD-1-001');
 assert.equal(s.pending.kind,'effect-ordered-subset');
 s=act(opened.pack,s,a=>a.mode==='confirm');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.uid===named.uid),true);
 const imc=createImcV2Pack();
 assert.equal(Object.keys(imc.cards).length,92);
 assert.deepEqual(['IMC-1-028','IMC-1-033','IMC-1-036','IMC-1-065','IMC-1-078','IMC-1-080','IMC-1-112']
  .every(id=>imc.cards[id]?.id===id),true);
 for(const id of ['IMC-1-011','IMC-1-012']){
  assert.equal(imc.cards[id],undefined,id);
  assert.equal(IMC_PROGRAMS_001_050[id]?.ready,undefined,id);
  assert.equal(IMC_PROGRAMS_051_100[id]?.ready,undefined,id);
  assert.equal(IMC_PROGRAMS_STARTER[id]?.ready,undefined,id);
 }
 assert.equal(getTitle('imc').playable,false);
 assert.equal(loadImcOfficialStarter().counts,null);
 assert.throws(()=>createUniversalPack({id:'probe',version:'bad',cards:[face({
  id:'BAD',name:'壞',effects:{onPlay:[{op:'choosePrintedOptions',max:3,optional:true,options:[]}]}
 })]}),/invalid printed option set/);
 assert.throws(()=>createUniversalPack({id:'probe',version:'bad',cards:[face({
  id:'BAD',name:'壞',effects:{onPlay:[{op:'chooseUpToDistinctOrdered',max:2,options:[
   {id:'bounce',label:'回手',then:[{op:'draw',count:1}]},
   {id:'active',label:'活動',then:[active]},
   {id:'rest',label:'休息',then:[{op:'draw',count:1}]}
  ]}]}
 })]}),/invalid ordered subset/);
 const old=open([
  face({id:'OLD',name:'舊回手',energy:0,effects:{onPlay:[{
   op:'bounceOwnOtherUnderEnergy',optional:true,energy:3,
   then:[{op:'recoverOutsideUnderEnergy',optional:true,energy:3}]
  }]}}),
  face({id:'LOW',name:'低費',energy:3})
 ],78);
 s=old.s;
 const target=seat(s,0,'LOW','front',1,true);
 s.players[0].outside.push(pull(s,0,'FILL-01'));
 s=play(old.pack,s,'OLD');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.trait,undefined);
 s=act(old.pack,s,a=>a.type==='chooseOwnBounce'&&a.uid===target.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===target.uid),true);
 assert.equal(s.pending.kind,'effect-recover-outside');
});

test('life raid and deck raid keep the own-effect option, and rest entry does not',()=>{
 const cards=[
  face({id:'SRC',name:'主角',energy:0,color:'blue',trigger:'raid',raidName:'底板',
   traits:['ガールズ・イン・ザ・フロンティア'],
   effects:{onPlay:[printedOptions(raidWhen)]}}),
  face({id:'BASE',name:'底板',energy:1,color:'yellow'}),
  face({id:'ATK',name:'攻擊',color:'red',bp:5000}),
  face({id:'LOOK',name:'窗',type:'event',bp:0,energy:0,effects:{onPlay:[raidLook]}})
 ];
 const life=open(cards,79);
 let s=life.s;
 const home=seat(s,0,'BASE','front',0,true);
 const attacker=seat(s,1,'ATK','front',0,true);
 attacker.ready=true;
 const old=s.players[0].life[0];
 const rider=pull(s,0,'SRC');
 s.players[0].life[0]=rider;
 s.players[0].deck.push(old);
 for(let i=0;i<8&&!(s.active===1&&s.phase==='attack');i++){
  if(s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=act(life.pack,s,a=>a.type==='chooseHandLimit'&&a.uid===uid);
   continue;
  }
  s=act(life.pack,s,a=>a.type==='next');
 }
 assert.equal(s.active,1);
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(life.pack,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(life.pack,s,{type:'chooseBlock',uid:null});
 const lifeRaid=legalUniversalActions(life.pack,s).find(a=>a.type==='chooseTrigger'&&
  a.mode==='raid'&&a.baseUid===home.uid);
 assert.ok(lifeRaid);
 s=dispatchUniversalAction(life.pack,s,lifeRaid,{actor:0});
 assert.equal(assertUniversalMatch(life.pack,s),true);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce','active']);
 assert.equal(s.pending.entryCause,'lifeRaid');

 const deck=open(cards,80);
 s=deck.s;
 const host=seat(s,0,'BASE','front',0,true);
 const window=stackTop(s,['SRC','ATK','LOOK']);
 s=play(deck.pack,s,'LOOK');
 s=act(deck.pack,s,a=>a.mode==='raid'&&a.uid===window[0].uid&&a.baseUid===host.uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.equal(s.pending.entryCause,'deckEffectRaid');
 assert.deepEqual(s.pending.options.map(o=>o.id),['bounce','active']);
});
