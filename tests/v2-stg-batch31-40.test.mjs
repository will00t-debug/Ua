import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {steinsGatePracticeDeck,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {V2_PENDING_LABELS,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {REZ_BASE_IDS,rez,rezDeck} from './helpers/rez-v2-match.mjs';
import {deckWith,fresh,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const STILL=['STG-1-003','STG-1-010','STG-1-011','STG-1-017','STG-1-018','STG-1-027',
 'STG-1-028','STG-1-033','STG-1-038','STG-1-039','STG-1-046','STG-1-050','STG-1-060',
 'STG-1-066','STG-1-070','STG-1-077'];
const KINDS={
 'STG-1-016':'inspectCharacterEntry','STG-1-059':'labHandRest','STG-1-026':'triggerSearch',
 'STG-1-004':'triggerDrawBranch','STG-1-025':'raidedTriggerDraw','STG-1-040':'kurisuBlockDraw',
 'STG-1-037':'okabeWall','STG-1-071':'ibnGate','STG-1-056':'impactMove','STG-1-029':'triggerKindRetire'
};

function play(packs,s,pred,actor=0){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('Missing legal action');
 return dispatchUniversalAction(packs,s,action,{actor});
}
function place(s,p,id,line,slot,ready=true){
 const card=put(s,p,id,line,slot,ready);
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 return card;
}
function hold(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function outside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function lifeTop(s,p,id){
 const card=take(s,p,id);
 const life=s.players[p].life,displaced=life[0];
 life[0]=card;
 if(displaced&&displaced.uid!==card.uid)s.players[p].deck.push(displaced);
 return card;
}
function board(ids,seed){
 const s=toPhase(stgPacks,fresh(deckWith(ids),seed),'main');
 readyAp(s);
 return s;
}
function advance(packs,s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending?.kind==='end-hand-limit'){
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',
    uid:s.players[s.pending.player].hand[0].uid},{actor:s.pending.player});
   continue;
  }
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked advance at '+s.phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>40)throw Error('stuck '+s.phase+' active '+s.active+' turn '+s.turn);
 }
 return s;
}
function replay(id){
 const c=stg.cards[id];
 return {
  id:c.id,name:c.name,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:c.gen,trigger:c.trigger,traits:[...(c.traits||[])],
  implementation:c.implementation,effects:JSON.parse(JSON.stringify(c.effects)),
  ...(c.impactNull?{impactNull:true}:{}),
  ...(c.raidName?{raidName:c.raidName}:{}),
  ...(c.playRequiresOwnName?{playRequiresOwnName:c.playRequiresOwnName}:{}),
  ...(c.passiveBonuses?{passiveBonuses:JSON.parse(JSON.stringify(c.passiveBonuses))}:{}),
  ...(c.emptyOwnFieldHandEnergyDiscount?{
   emptyOwnFieldHandEnergyDiscount:c.emptyOwnFieldHandEnergyDiscount}:{}),
  ...(c.triggerEffect?{triggerEffect:JSON.parse(JSON.stringify(c.triggerEffect))}:{})
 };
}
function fillers(){
 return Array.from({length:12},(_,i)=>({
  id:'F'+i,name:'填料'+i,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}
 }));
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','outside']){
  const index=pl[zone].findIndex(c=>c.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 const life=pl.life.findIndex(c=>c.cardId===id);
 if(life<0)throw Error('Missing '+id);
 const swapped=pl.deck.pop();
 const card=pl.life[life];
 pl.life[life]=swapped;
 return card;
}
function labMatch(cards,seed){
 const pack=createUniversalPack({id:'stg-lab',version:'lab',cards:[...cards,...fillers()]});
 const counts={};
 let n=0;
 for(const card of cards){counts[card.id]=1;n++;}
 for(const card of fillers())while(n<50&&(counts[card.id]||0)<4){
  counts[card.id]=(counts[card.id]||0)+1;n++;
 }
 const packs=[pack,pack];
 return {packs,s:newUniversalMatch(packs,{decks:[counts,counts],seed,first:0})};
}
function finishInspect(packs,s,actor=0){
 if(s.pending?.kind==='effect-top-inspect-many')
  s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null},{actor});
 while(s.pending?.kind==='effect-top-order')
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:s.pending.uids[0]},{actor});
 return s;
}

test('batches 31-40 register ten whole prints and leave sixteen catalogue cards',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.length,80);
 assert.equal(Object.keys(stg.cards).length,64);
 assert.equal(stg.version,'stg-ua57-batches-31-40-20261028');
 assert.deepEqual(STEINS_GATE_CARDS.filter(c=>!c.engineKind).map(c=>c.id).sort(),[...STILL].sort());
 for(const [id,kind] of Object.entries(KINDS)){
  assert.equal(STEINS_GATE_BY_ID[id].engineKind,kind);
  assert.equal(stg.cards[id].name,STEINS_GATE_BY_ID[id].nameJa);
 }
 assert.equal(stg.cards['STG-1-003'],undefined);
 assert.equal(stg.cards['STG-1-004'].bp,3000);
 assert.equal(stg.cards['STG-1-025'].triggerEffect.op,'bounceOppFrontUnderBp');
 assert.equal(stg.cards['STG-1-025'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(stg.cards['STG-1-029'].raidName,'牧瀬 紅莉栖');
 assert.equal(stg.cards['STG-1-037'].playRequiresOwnName,'岡部 倫太郎');
 assert.equal(stg.cards['STG-1-056'].impactNull,true);
 assert.equal(stg.cards['STG-1-059'].impactNull,true);
 assert.equal(V2_PENDING_LABELS['effect-retire-own-other'].includes('退場'),true);
 assert.equal(V2_PENDING_LABELS['effect-remove-named-zones'].includes('移除'),true);
 const practice=steinsGatePracticeDeck();
 assert.equal(v2DeckReport('steins-gate',practice.counts).ok,true);
 assert.equal(Object.values(practice.counts).reduce((n,c)=>n+c,0),50);
 assert.ok(Object.keys(practice.counts).every(id=>practice.pack.cards[id].color==='blue'));
 const editor=editorV2Status('steins-gate',practice.counts);
 assert.equal(editor.registered,64);
 const blocked=v2DeckReport('steins-gate',{...practice.counts,'STG-1-003':1,'STG-1-001':3});
 assert.equal(blocked.ok,false);
 assert.ok(blocked.issues.some(issue=>issue.includes('STG-1-003')));
 const base={id:'X',name:'X',color:'blue',type:'character',energy:1,ap:1,bp:1000,gen:1,implementation:'dsl'};
 const reject=(effects,pattern)=>assert.throws(()=>createUniversalPack({id:'bad',cards:[{...base,effects}]}),pattern);
 reject({onPlay:[{op:'searchTopOneBottomDiscard',count:3,logic:'any',discard:false,
  filters:['a','b'].map(value=>({field:'name',value}))}]},/invalid top-N filtered bottom\/discard profile/);
 reject({onPlay:[{op:'searchTopOneBottomDiscard',count:2,logic:'all',filters:[
  {field:'type',value:'event'},{field:'triggerNot',value:'draw'}]}]},/invalid top-N filtered bottom\/discard profile/);
 reject({onPlay:[{op:'searchTopOneBottomDiscard',count:3,logic:'all',filters:[
  {field:'type',value:'event'},{field:'triggerNot',value:'final'}],
  whenTriggers:{color:'blue',maxEnergy:3,min:3,count:3}}]},/invalid top-N filtered bottom\/discard profile/);
 reject({onPlay:[{op:'deployOwnHandRest',type:'character',color:'green',energy:2,ap:1,max:2,
  names:['牧瀬 紅莉栖']}]},/invalid named hand REST/);
 reject({onPlay:[{op:'grantOwnNameBlockAtLeast',name:'牧瀬 紅莉栖',bp:4000,optional:true,alsoBp:1500}]},
  /invalid named blocker ceiling/);
 reject({onPlay:[{op:'discardGate',optional:true,payment:{zone:'hand',field:'typeAny',values:['character']},
  then:[{op:'draw',count:1}]}]},/invalid typed name payment/);
 reject({onPlay:[{op:'moveOppFrontIfEvent',optional:true}]},
  /opponent energy move is only the follow-up/);
});

test('STG-1-016 looks at two cards, or three after a character effect entry',()=>{
 let s=board(['STG-1-016'],31016);
 place(s,0,'STG-1-001','energy',0);
 place(s,0,'STG-1-007','energy',1);
 const window=top(s,0,['STG-1-012','STG-1-014','STG-1-020']);
 const actor=take(s,0,'STG-1-016');
 hold(s,0,[actor]);
 s=play(stgPacks,s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 assert.deepEqual(s.pending.uids,[window[0].uid,window[1].uid]);
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseInspectedOutside',uid:window[0].uid},{actor:0});
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseInspectedOutside',uid:null},{actor:0});
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseTopOrder',uid:window[1].uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===window[0].uid));
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[1].uid,window[2].uid]);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);

 const deployer={id:'DEP',name:'派遣',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{onPlay:[{op:'deployOwnHandRest',type:'character',color:'blue',
   energy:2,ap:1,max:1,names:['椎名 まゆり']}]}};
 const lab=labMatch([deployer,replay('STG-1-016')],31017);
 let entered=toPhase(lab.packs,lab.s,'main');
 readyAp(entered);
 const source=pull(entered,0,'DEP');
 const mayuri=pull(entered,0,'STG-1-016');
 entered.players[0].hand.push(source,mayuri);
 entered=play(lab.packs,entered,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.equal(entered.pending.kind,'effect-hand-rest');
 assert.deepEqual(entered.pending.choices,[mayuri.uid]);
 entered=play(lab.packs,entered,a=>a.type==='chooseHandRest'&&a.uid===mayuri.uid&&a.line==='front');
 assert.equal(entered.players[0].front.some(c=>c?.uid===mayuri.uid&&c.ready===false),true);
 assert.equal(entered.pending.kind,'effect-top-inspect-many');
 assert.equal(entered.pending.uids.length,3);
 entered=finishInspect(lab.packs,entered);
 assert.equal(entered.pending,null);
 assert.equal(assertUniversalMatch(lab.packs,entered),true);
});

test('STG-1-059 rests one cheap green lab character and ignores the other hand cards',()=>{
 let s=board(['STG-1-059','STG-1-069','STG-1-051','STG-1-045'],31059);
 place(s,0,'STG-1-042','energy',0);
 place(s,0,'STG-1-042','energy',1);
 place(s,0,'STG-1-047','energy',2);
 const actor=take(s,0,'STG-1-059');
 const kurisu=take(s,0,'STG-1-069');
 const okabe=take(s,0,'STG-1-051');
 const expensive=take(s,0,'STG-1-045');
 const ruka=take(s,0,'STG-1-047');
 const blue=take(s,0,'STG-1-001');
 hold(s,0,[actor,kurisu,okabe,expensive,ruka,blue]);
 s=play(stgPacks,s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.deepEqual(s.pending.choices.slice().sort(),[kurisu.uid,okabe.uid].sort());
 const declined=dispatchUniversalAction(stgPacks,s,{type:'chooseHandRest',uid:null},{actor:0});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].hand.some(c=>c.uid===okabe.uid));
 s=play(stgPacks,s,a=>a.type==='chooseHandRest'&&a.uid===okabe.uid&&a.line==='front');
 assert.equal(s.players[0].front.some(c=>c?.uid===okabe.uid&&c.ready===false),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-026 widens the event window only for three blue low-energy trigger kinds',()=>{
 function open(seed,outsideIds,windowIds){
  let s=board(['STG-1-026','STG-1-032','STG-1-034','STG-1-035','STG-1-037','STG-1-040'],seed);
  place(s,0,'STG-1-001','energy',0);
  for(const id of outsideIds)outside(s,0,id);
  const window=top(s,0,windowIds);
  const actor=take(s,0,'STG-1-026');
  hold(s,0,[actor,take(s,0,'STG-1-012')]);
  s=play(stgPacks,s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
  return {s,window,spare:s.players[0].hand.find(c=>c.cardId==='STG-1-012')};
 }
 const narrow=open(31026,[],['STG-1-034','STG-1-001','STG-1-040','STG-1-037','STG-1-014']);
 assert.deepEqual(narrow.s.pending.uids,narrow.window.slice(0,3).map(c=>c.uid));
 assert.deepEqual(narrow.s.pending.choices,[narrow.window[2].uid]);
 const twoKinds=open(31027,['STG-1-034','STG-1-034','STG-1-032'],
  ['STG-1-012','STG-1-014','STG-1-020','STG-1-024','STG-1-007']);
 assert.equal(twoKinds.s.pending.uids.length,3);
 const ignored=open(31028,['STG-1-032','STG-1-034','STG-1-037'],
  ['STG-1-012','STG-1-014','STG-1-020','STG-1-024','STG-1-007']);
 assert.equal(ignored.s.pending.uids.length,3);
 const wide=open(31029,['STG-1-032','STG-1-034','STG-1-035'],
  ['STG-1-012','STG-1-014','STG-1-020','STG-1-024','STG-1-007']);
 assert.equal(wide.s.pending.uids.length,5);
 wide.s=dispatchUniversalAction(stgPacks,wide.s,{type:'chooseTopFiltered',uid:null},{actor:0});
 assert.equal(wide.s.pending.kind,'effect-top-order');
 assert.equal(wide.s.pending.discardAfter,undefined);

 let taken=narrow.s;
 const chosen=narrow.window[2].uid;
 taken=dispatchUniversalAction(stgPacks,taken,{type:'chooseTopFiltered',uid:chosen},{actor:0});
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,true);
 for(const card of narrow.window.slice(0,2))
  taken=dispatchUniversalAction(stgPacks,taken,{type:'chooseTopOrder',uid:card.uid},{actor:0});
 assert.equal(taken.pending.kind,'effect-discard');
 assert.ok(taken.players[0].hand.some(c=>c.uid===chosen));
 const before=taken.players[0].deck.length;
 taken=dispatchUniversalAction(stgPacks,taken,{type:'chooseDiscard',uid:narrow.spare.uid},{actor:0});
 assert.equal(taken.players[0].deck.length,before);
 assert.ok(taken.players[0].outside.some(c=>c.uid===narrow.spare.uid));
 assert.deepEqual(taken.players[0].deck.slice(-2).map(c=>c.uid),narrow.window.slice(0,2).map(c=>c.uid));
 assert.equal(taken.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,taken),true);
});

test('STG-1-004 redraws after the discard reaches four trigger kinds',()=>{
 let quiet=board(['STG-1-004','STG-1-032'],31004);
 const waiting=place(quiet,0,'STG-1-004','front',0);
 assert.equal(universalBp(stg,quiet,waiting),3000);
 const event=take(quiet,0,'STG-1-032');
 hold(quiet,0,[event]);
 quiet=play(stgPacks,quiet,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(universalBp(stg,quiet,quiet.players[0].front[0]),4000);
 quiet=advance(stgPacks,quiet,x=>x.active===1&&x.phase==='main');
 assert.equal(universalBp(stg,quiet,quiet.players[0].front[0]),3000);

 function branch(seed,outsideIds,handIds=[]){
  let s=board(['STG-1-004','STG-1-032','STG-1-034','STG-1-035','STG-1-040'],seed);
  place(s,0,'STG-1-001','energy',0);
  place(s,0,'STG-1-007','energy',1);
  for(const id of outsideIds)outside(s,0,id);
  const actor=take(s,0,'STG-1-004');
  const spare=take(s,0,'STG-1-012');
  const extras=handIds.map(id=>take(s,0,id));
  hold(s,0,[actor,spare,...extras]);
  const before=s.players[0].deck.length;
  s=play(stgPacks,s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
  return {s,spare,before,extras};
 }
 const none=branch(31005,[]);
 assert.equal(none.s.pending.kind,'effect-discard');
 assert.equal(none.s.players[0].deck.length,none.before-1);
 let finished=dispatchUniversalAction(stgPacks,none.s,{type:'chooseDiscard',uid:none.spare.uid},{actor:0});
 assert.equal(finished.players[0].deck.length,none.before-1);
 assert.equal(finished.pending,null);

 const low=branch(31006,['STG-1-032','STG-1-034','STG-1-035'],['STG-1-040']);
 const drawn=low.extras[0];
 assert.equal(low.s.pending.kind,'effect-discard');
 assert.equal(low.s.players[0].deck.length,low.before-1);
 low.s=dispatchUniversalAction(stgPacks,low.s,{type:'chooseDiscard',uid:drawn.uid},{actor:0});
 assert.equal(low.s.players[0].deck.length,low.before-2);
 assert.ok(low.s.players[0].outside.some(c=>c.uid===drawn.uid));
 assert.equal(low.s.pending,null);

 const character=branch(31007,['STG-1-032','STG-1-034','STG-1-035']);
 assert.equal(character.s.pending.kind,'effect-discard');
 character.s=dispatchUniversalAction(stgPacks,character.s,{type:'chooseDiscard',uid:character.spare.uid},{actor:0});
 assert.equal(character.s.players[0].deck.length,character.before-1);
 assert.equal(character.s.pending,null);

 const high=branch(31008,['STG-1-032','STG-1-034','STG-1-035','STG-1-040']);
 assert.equal(high.s.pending,null);
 assert.equal(high.s.players[0].deck.length,high.before-1);
 assert.ok(high.s.players[0].hand.some(c=>c.uid===high.spare.uid));
 assert.equal(assertUniversalMatch(stgPacks,high.s),true);

 const green=['get','final','active'].map(trigger=>({
  id:'E'+trigger,name:'綠事件'+trigger,color:'green',type:'event',energy:1,ap:1,bp:0,gen:0,
  trigger,implementation:'vanilla',effects:{}
 }));
 const gen={id:'GN',name:'產能',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:2,
  implementation:'vanilla',effects:{}};
 const spareCard={id:'SP',name:'備牌',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:0,
  implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-004'),gen,spareCard,...green],31009);
 let other=toPhase(lab.packs,lab.s,'main');
 readyAp(other);
 other.players[0].energy[0]=pull(other,0,'GN');
 for(const card of green)other.players[0].outside.push(pull(other,0,card.id));
 const actor=pull(other,0,'STG-1-004');
 const extra=pull(other,0,'SP');
 hold(other,0,[actor,extra]);
 other=play(lab.packs,other,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(other.pending.kind,'effect-discard');
 other=dispatchUniversalAction(lab.packs,other,{type:'chooseDiscard',uid:extra.uid},{actor:0});
 assert.equal(other.pending,null);
 assert.equal(assertUniversalMatch(lab.packs,other),true);
});

test('STG-1-025 discounts an empty field, bounces on its color trigger, and draws when raided',()=>{
 let empty=board(['STG-1-025'],31025);
 const actor=take(empty,0,'STG-1-025');
 hold(empty,0,[actor]);
 assert.equal(legalUniversalActions(stgPacks,empty).some(a=>a.type==='play'&&a.uid===actor.uid),true);
 place(empty,0,'STG-1-012','front',0);
 assert.equal(legalUniversalActions(stgPacks,empty).some(a=>a.type==='play'&&a.uid===actor.uid),false);
 place(empty,0,'STG-1-001','energy',0);
 place(empty,0,'STG-1-007','energy',1);
 assert.equal(legalUniversalActions(stgPacks,empty).some(a=>a.type==='play'&&a.uid===actor.uid),true);

 let life=board(['STG-1-025','STG-1-041'],31026);
 const attacker=place(life,0,'STG-1-012','front',0);
 const low=place(life,0,'STG-1-001','front',1);
 const high=place(life,0,'STG-1-041','front',2);
 lifeTop(life,1,'STG-1-025');
 life=toPhase(stgPacks,life,'attack');
 life=play(stgPacks,life,a=>a.type==='attack'&&a.uid===attacker.uid);
 if(life.pending?.kind==='block')
  life=dispatchUniversalAction(stgPacks,life,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(life.pending.kind,'life-trigger');
 const legal=legalUniversalActions(stgPacks,life);
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='colorBounce'&&a.uid===low.uid));
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='colorBounce'&&a.uid===attacker.uid));
 assert.equal(legal.some(a=>a.uid===high.uid),false);
 life=dispatchUniversalAction(stgPacks,life,{type:'chooseTrigger',mode:'colorBounce',uid:low.uid},{actor:1});
 assert.ok(life.players[0].hand.some(c=>c.uid===low.uid));
 assert.equal(life.players[0].front[0].uid,attacker.uid);
 assert.equal(life.players[0].front[2].uid,high.uid);
 assert.equal(life.players[0].outside.some(c=>c.uid===low.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,life),true);

 function raidOf(seed,outsideIds){
  let s=board(['STG-1-025','STG-1-029','STG-1-009','STG-1-032','STG-1-034','STG-1-035','STG-1-020'],seed);
  const base=place(s,0,'STG-1-025','front',0);
  place(s,0,'STG-1-009','energy',0);
  place(s,0,'STG-1-001','energy',1);
  place(s,0,'STG-1-007','energy',2);
  place(s,0,'STG-1-014','energy',3);
  for(const id of outsideIds)outside(s,0,id);
  const victim=place(s,1,'STG-1-020','front',0);
  const raider=take(s,0,'STG-1-029');
  hold(s,0,[raider]);
  const before=s.players[0].deck.length;
  s=play(stgPacks,s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.line==='front');
  return {s,before,victim,raider,base};
 }
 const early=raidOf(31027,['STG-1-032','STG-1-034','STG-1-035']);
 assert.equal(early.s.pending.kind,'raid-effect-order');
 let entry=dispatchUniversalAction(stgPacks,early.s,{type:'chooseRaidOrder',mode:'entryFirst'},{actor:0});
 assert.equal(entry.pending.kind,'effect-retire-trigger-ceiling');
 assert.equal(entry.players[0].deck.length,early.before);
 assert.ok(entry.pending.choices.includes(early.victim.uid));
 entry=dispatchUniversalAction(stgPacks,entry,{type:'chooseRetireAtLeast',uid:null},{actor:0});
 assert.equal(entry.players[0].deck.length,early.before-1);
 assert.equal(entry.pending,null);
 const baseFirst=raidOf(31028,['STG-1-032','STG-1-034','STG-1-035']);
 let first=dispatchUniversalAction(stgPacks,baseFirst.s,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:0});
 assert.equal(first.players[0].deck.length,baseFirst.before-1);
 assert.equal(first.pending.kind,'effect-retire-trigger-ceiling');
 const short=raidOf(31029,['STG-1-032','STG-1-034']);
 let missed=dispatchUniversalAction(stgPacks,short.s,{type:'chooseRaidOrder',mode:'baseFirst'},{actor:0});
 assert.equal(missed.players[0].deck.length,short.before);
 assert.equal(missed.pending.kind,'effect-retire-trigger-ceiling');
 missed=dispatchUniversalAction(stgPacks,missed,{type:'chooseRetireAtLeast',uid:null},{actor:0});
 assert.equal(missed.players[0].deck.length,short.before);
 assert.equal(missed.players[0].front.some(c=>c?.uid===short.raider.uid&&c.ready===true),true);
 assert.equal(assertUniversalMatch(stgPacks,missed),true);
});

test('STG-1-040 requires Kurisu, raises BP, and blocks only below 4000',()=>{
 let absent=board(['STG-1-040','STG-1-069'],31040);
 place(absent,0,'STG-1-001','energy',0);
 place(absent,0,'STG-1-007','energy',1);
 const missing=take(absent,0,'STG-1-040');
 hold(absent,0,[missing]);
 assert.equal(legalUniversalActions(stgPacks,absent).some(a=>a.type==='event'&&a.uid===missing.uid),false);

 function open(seed,outsideIds){
  let s=board(['STG-1-040','STG-1-069','STG-1-032','STG-1-034','STG-1-035','STG-1-041'],seed);
  place(s,0,'STG-1-001','energy',0);
  place(s,0,'STG-1-007','energy',1);
  const kurisu=place(s,0,'STG-1-069','front',0);
  for(const id of outsideIds)outside(s,0,id);
  const event=take(s,0,'STG-1-040');
  hold(s,0,[event]);
  const before=s.players[0].deck.length;
  s=play(stgPacks,s,a=>a.type==='event'&&a.uid===event.uid);
  assert.equal(s.pending.kind,'effect-grant-block-at-least');
  assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===null),false);
  s=dispatchUniversalAction(stgPacks,s,{type:'chooseGrantBlockAtLeast',uid:kurisu.uid},{actor:0});
  return {s,kurisu,before};
 }
 const plain=open(31041,['STG-1-032','STG-1-034']);
 assert.equal(plain.s.players[0].deck.length,plain.before);
 assert.equal(plain.s.players[0].front[0].blockAtLeastGranted.bp,4000);
 assert.equal(universalBp(stg,plain.s,plain.s.players[0].front[0]),2000);
 const drawn=open(31042,['STG-1-032','STG-1-034','STG-1-035']);
 assert.equal(drawn.s.players[0].deck.length,drawn.before-1);
 assert.equal(drawn.s.pending,null);

 let battle=drawn.s;
 const wall=place(battle,1,'STG-1-041','front',0);
 const small=place(battle,1,'STG-1-001','front',1);
 battle=toPhase(stgPacks,battle,'attack');
 battle=play(stgPacks,battle,a=>a.type==='attack'&&a.uid===drawn.kurisu.uid);
 assert.equal(battle.pending.kind,'block');
 const blocks=legalUniversalActions(stgPacks,battle);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===wall.uid),false);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===small.uid),true);
 battle=dispatchUniversalAction(stgPacks,battle,{type:'chooseBlock',uid:small.uid},{actor:1});
 assert.equal(assertUniversalMatch(stgPacks,battle),true);
});

test('STG-1-037 retires a 5000 BP front character and may remove Okabe after seven blue Mayuri',()=>{
 const mayuri=(id,color)=>({id,name:'椎名 まゆり',color,type:'character',energy:0,ap:1,bp:1000,
  gen:color==='blue'?1:0,implementation:'vanilla',effects:{}});
 const blues=Array.from({length:7},(_,i)=>mayuri('M'+i,'blue'));
 const green=mayuri('MG','green');
 const okabe={id:'OK',name:'岡部 倫太郎',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'vanilla',effects:{}};
 const okabeOut={...okabe,id:'OK2'};
 const low={id:'LOW',name:'低',color:'red',type:'character',energy:0,ap:1,bp:5000,gen:0,
  implementation:'vanilla',effects:{}};
 const high={id:'HIGH',name:'高',color:'red',type:'character',energy:0,ap:1,bp:5500,gen:0,
  implementation:'vanilla',effects:{}};
 const gen={id:'GN',name:'產能',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:4,
  implementation:'vanilla',effects:{}};
 const cards=[replay('STG-1-037'),...blues,green,okabe,okabeOut,low,high,gen];
 function open(seed,{mayuriCount=7,withOkabe=true,onlyHigh=false}={}){
  const lab=labMatch(cards,seed);
  let s=toPhase(lab.packs,lab.s,'main');
  readyAp(s);
  s.players[0].energy[0]=pull(s,0,'GN');
  if(withOkabe)s.players[0].front[0]=pull(s,0,'OK');
  else s.players[0].deck.push(pull(s,0,'OK'));
  s.players[0].outside.push(pull(s,0,'OK2'),pull(s,0,'MG'));
  for(let i=0;i<mayuriCount;i++)s.players[0].outside.push(pull(s,0,'M'+i));
  s.players[1].front[0]=pull(s,1,onlyHigh?'HIGH':'LOW');
  if(!onlyHigh)s.players[1].front[1]=pull(s,1,'HIGH');
  else s.players[1].deck.push(pull(s,1,'LOW'));
  const event=pull(s,0,'STG-1-037');
  hold(s,0,[event]);
  return {lab,s,event};
 }
 const locked=open(31037,{withOkabe:false});
 assert.equal(legalUniversalActions(locked.lab.packs,locked.s).some(a=>a.type==='event'),false);
 const tall=open(31038,{onlyHigh:true});
 assert.equal(legalUniversalActions(tall.lab.packs,tall.s).some(a=>a.type==='event'),false);
 const six=open(31039,{mayuriCount:6});
 let few=play(six.lab.packs,six.s,a=>a.type==='event'&&a.uid===six.event.uid);
 assert.equal(few.pending.kind,'effect-retire-at-most');
 assert.equal(legalUniversalActions(six.lab.packs,few).some(a=>a.uid===null),false);
 assert.equal(few.pending.choices.length,1);
 few=dispatchUniversalAction(six.lab.packs,few,{type:'chooseRetireAtMost',uid:few.pending.choices[0]},{actor:0});
 assert.equal(few.pending,null);
 assert.equal(few.players[0].front[0].cardId,'OK');

 const seven=open(31040);
 let many=play(seven.lab.packs,seven.s,a=>a.type==='event'&&a.uid===seven.event.uid);
 const fieldOkabe=many.players[0].front[0];
 const buried=many.players[0].outside.find(c=>c.cardId==='OK2');
 many=dispatchUniversalAction(seven.lab.packs,many,{type:'chooseRetireAtMost',uid:many.pending.choices[0]},{actor:0});
 assert.equal(many.pending.kind,'effect-remove-named-zones');
 const removal=legalUniversalActions(seven.lab.packs,many);
 assert.ok(removal.some(a=>a.type==='chooseRemoveNamedZone'&&a.uid===null));
 assert.ok(removal.some(a=>a.uid===fieldOkabe.uid));
 assert.ok(removal.some(a=>a.uid===buried.uid));
 assert.equal(removal.some(a=>a.uid&&many.players[0].outside.find(c=>c.uid===a.uid)?.cardId==='MG'),false);
 const declined=dispatchUniversalAction(seven.lab.packs,many,{type:'chooseRemoveNamedZone',uid:null},{actor:0});
 assert.equal(declined.players[0].front[0].uid,fieldOkabe.uid);
 assert.equal(declined.pending,null);
 many=dispatchUniversalAction(seven.lab.packs,many,{type:'chooseRemoveNamedZone',uid:fieldOkabe.uid},{actor:0});
 assert.ok(many.players[0].removed.some(c=>c.uid===fieldOkabe.uid));
 assert.equal(many.players[0].front[0],null);
 assert.equal(many.players[0].outside.some(c=>c.uid===fieldOkabe.uid),false);
 assert.ok(many.players[0].outside.some(c=>c.uid===seven.event.uid));
 assert.equal(many.pending,null);
 assert.equal(assertUniversalMatch(seven.lab.packs,many),true);
});

test('STG-1-071 pays an event or field, then chooses Moeka or a draw on retirement',()=>{
 let gate=board(['STG-1-071','STG-1-032','STG-1-073'],31071);
 place(gate,0,'STG-1-042','energy',0);
 place(gate,0,'STG-1-047','energy',1);
 const field=take(gate,0,'STG-1-071');
 const eventPay=take(gate,0,'STG-1-032');
 const fieldPay=take(gate,0,'STG-1-073');
 const character=take(gate,0,'STG-1-001');
 const window=top(gate,0,['STG-1-012','STG-1-014']);
 hold(gate,0,[field,eventPay,fieldPay,character]);
 gate=play(stgPacks,gate,a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 assert.equal(gate.pending.kind,'effect-discard-gate');
 const pays=legalUniversalActions(stgPacks,gate);
 assert.ok(pays.some(a=>a.type==='chooseDiscardGate'&&a.uid===null));
 assert.ok(pays.some(a=>a.uid===eventPay.uid));
 assert.ok(pays.some(a=>a.uid===fieldPay.uid));
 assert.equal(pays.some(a=>a.uid===character.uid),false);
 const skipped=dispatchUniversalAction(stgPacks,gate,{type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.slice(0,2).map(c=>c.uid),window.map(c=>c.uid));
 gate=dispatchUniversalAction(stgPacks,gate,{type:'chooseDiscardGate',uid:eventPay.uid},{actor:0});
 assert.equal(gate.pending.kind,'effect-top-add-one');
 assert.deepEqual(gate.pending.uids,window.map(c=>c.uid));
 gate=dispatchUniversalAction(stgPacks,gate,{type:'chooseTopAddOne',uid:window[0].uid},{actor:0});
 assert.ok(gate.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.ok(gate.players[0].outside.some(c=>c.uid===window[1].uid));
 assert.ok(gate.players[0].outside.some(c=>c.uid===eventPay.uid));
 assert.equal(gate.pending,null);

 function retire(seed,withMoeka){
  let s=board(['STG-1-071','STG-1-041','STG-1-045','STG-1-054','STG-1-073'],seed);
  place(s,0,'STG-1-045','energy',0);
  place(s,0,'STG-1-042','energy',1);
  place(s,0,'STG-1-047','energy',2);
  const ibn=place(s,0,'STG-1-071','energy',3);
  const moeka=withMoeka?place(s,0,'STG-1-054','front',0,false):null;
  outside(s,0,'STG-1-073');
  const actor=take(s,0,'STG-1-041');
  hold(s,0,[actor]);
  s=play(stgPacks,s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
  s=dispatchUniversalAction(stgPacks,s,{type:'chooseOwnFieldRetire',uid:ibn.uid},{actor:0});
  return {s,moeka};
 }
 const drawn=retire(31072,false);
 assert.equal(drawn.s.pending.kind,'effect-choice-mode');
 assert.deepEqual(legalUniversalActions(stgPacks,drawn.s).map(a=>a.mode).sort(),['active','draw']);
 const handBefore=drawn.s.players[0].hand.length;
 let drew=dispatchUniversalAction(stgPacks,drawn.s,{type:'chooseEffectMode',mode:'draw'},{actor:0});
 assert.equal(drew.players[0].hand.length,handBefore+1);
 assert.equal(drew.pending.kind,'effect-different-field');
 const quiet=retire(31073,false);
 const unchanged=quiet.s.players[0].hand.length;
 let skippedActive=dispatchUniversalAction(stgPacks,quiet.s,{type:'chooseEffectMode',mode:'active'},{actor:0});
 assert.equal(skippedActive.players[0].hand.length,unchanged);
 assert.equal(skippedActive.pending.kind,'effect-different-field');
 const named=retire(31074,true);
 let active=dispatchUniversalAction(stgPacks,named.s,{type:'chooseEffectMode',mode:'active'},{actor:0});
 assert.equal(active.pending.kind,'effect-active-own-named');
 assert.ok(legalUniversalActions(stgPacks,active).some(a=>a.uid===null));
 active=play(stgPacks,active,a=>a.type==='chooseActiveOwnNamed'&&a.uid===named.moeka.uid);
 assert.equal(active.players[0].front.find(c=>c?.uid===named.moeka.uid).ready,true);
 assert.equal(active.pending.kind,'effect-different-field');
 assert.equal(assertUniversalMatch(stgPacks,active),true);
});

test('STG-1-056 retires another own card, moves an opponent, and locks that move after an event',()=>{
 function open(seed){
  let s=board(['STG-1-056','STG-1-045','STG-1-073','STG-1-064','STG-1-032'],seed);
  place(s,0,'STG-1-045','energy',0);
  place(s,0,'STG-1-042','energy',1);
  place(s,0,'STG-1-047','energy',2);
  const field=place(s,0,'STG-1-073','energy',3);
  const ally=place(s,0,'STG-1-064','front',0);
  const actor=take(s,0,'STG-1-056');
  hold(s,0,[actor]);
  return {s,field,ally,actor};
 }
 const declined=open(31056);
 let skip=play(stgPacks,declined.s,a=>a.type==='play'&&a.uid===declined.actor.uid&&a.line==='front');
 assert.equal(skip.pending.kind,'effect-retire-own-other');
 assert.ok(skip.pending.choices.includes(declined.field.uid));
 assert.ok(skip.pending.choices.includes(declined.ally.uid));
 assert.equal(skip.pending.choices.includes(declined.actor.uid),false);
 assert.equal(uiActionLabel({type:'chooseRetireOwnOther',uid:null},{pack:stg,state:skip}),'不使卡片退場');
 skip=dispatchUniversalAction(stgPacks,skip,{type:'chooseRetireOwnOther',uid:null},{actor:0});
 assert.equal(skip.pending,null);
 assert.equal(skip.players[0].front[0].uid,declined.ally.uid);
 assert.equal(skip.continuousStates.some(e=>e.kind==='cannotMove'),false);

 const plain=open(31057);
 const victim=place(plain.s,1,'STG-1-001','front',0);
 let moved=play(stgPacks,plain.s,a=>a.type==='play'&&a.uid===plain.actor.uid&&a.line==='front');
 moved=dispatchUniversalAction(stgPacks,moved,{type:'chooseRetireOwnOther',uid:plain.ally.uid},{actor:0});
 assert.equal(moved.pending.kind,'effect-move-opp-if-event');
 moved=play(stgPacks,moved,a=>a.type==='chooseMoveOppFront'&&a.uid===victim.uid);
 assert.equal(moved.players[1].energy.some(c=>c?.uid===victim.uid),true);
 assert.equal(moved.continuousStates.some(e=>e.kind==='cannotMove'),false);
 assert.equal(moved.pending,null);

 const locked=open(31058);
 const event=take(locked.s,0,'STG-1-032');
 locked.s.players[0].hand.push(event);
 locked.s=play(stgPacks,locked.s,a=>a.type==='event'&&a.uid===event.uid);
 const caught=place(locked.s,1,'STG-1-020','front',0);
 let bound=play(stgPacks,locked.s,a=>a.type==='play'&&a.uid===locked.actor.uid&&a.line==='front');
 bound=dispatchUniversalAction(stgPacks,bound,{type:'chooseRetireOwnOther',uid:locked.ally.uid},{actor:0});
 bound=play(stgPacks,bound,a=>a.type==='chooseMoveOppFront'&&a.uid===caught.uid);
 assert.ok(bound.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===caught.uid));
 let firstMove=advance(stgPacks,bound,x=>x.active===1&&x.phase==='move');
 assert.equal(legalUniversalActions(stgPacks,firstMove).some(a=>a.type==='move'&&a.uid===caught.uid),false);
 firstMove=dispatchUniversalAction(stgPacks,firstMove,{type:'next'});
 const later=advance(stgPacks,firstMove,x=>x.active===1&&x.phase==='move'&&x.turn!==firstMove.turn);
 assert.equal(later.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===caught.uid),false);
 assert.equal(legalUniversalActions(stgPacks,later).some(a=>a.type==='move'&&a.uid===caught.uid),true);

 const crowded=open(31059);
 for(const [id,slot] of [['STG-1-001',0],['STG-1-007',1],['STG-1-012',2],['STG-1-014',3]])
  place(crowded.s,1,id,'energy',slot);
 const front=place(crowded.s,1,'STG-1-020','front',0);
 let full=play(stgPacks,crowded.s,a=>a.type==='play'&&a.uid===crowded.actor.uid&&a.line==='front');
 full=dispatchUniversalAction(stgPacks,full,{type:'chooseRetireOwnOther',uid:crowded.field.uid},{actor:0});
 const replacement=legalUniversalActions(stgPacks,full).find(a=>a.type==='chooseMoveOppFront'&&
  a.uid===front.uid&&a.replaceUid);
 assert.ok(replacement);
 full=dispatchUniversalAction(stgPacks,full,replacement,{actor:0});
 assert.equal(full.players[1].energy[replacement.slot].uid,front.uid);
 assert.ok(full.players[1].removed.some(c=>c.uid===replacement.replaceUid));
 assert.equal(full.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,full),true);

 const kurisu={id:'KU',name:'牧瀬 紅莉栖',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:0,
  implementation:'vanilla',effects:{}};
 const raider={id:'RD',name:'突襲',color:'green',type:'character',energy:0,ap:1,bp:2000,gen:0,
  raidName:'牧瀬 紅莉栖',implementation:'vanilla',effects:{}};
 const other={id:'OT',name:'其他',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:0,
  implementation:'vanilla',effects:{}};
 const fuel={id:'GN',name:'產能',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:4,
  implementation:'vanilla',effects:{}};
 const used={id:'EV',name:'事件',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-056'),kurisu,raider,other,fuel,used],31060);
 let raid=toPhase(lab.packs,lab.s,'main');
 readyAp(raid);
 raid.players[0].energy[0]=pull(raid,0,'GN');
 const retired=pull(raid,0,'OT');
 raid.players[0].front[0]=retired;
 const buried=pull(raid,1,'KU');
 raid.players[1].front[0]=buried;
 const topCard=pull(raid,1,'RD');
 raid.players[1].hand.push(topCard);
 const pay=pull(raid,0,'EV');
 const source=pull(raid,0,'STG-1-056');
 hold(raid,0,[pay,source]);
 raid=play(lab.packs,raid,a=>a.type==='event'&&a.uid===pay.uid);
 raid=play(lab.packs,raid,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 raid=dispatchUniversalAction(lab.packs,raid,{type:'chooseRetireOwnOther',uid:retired.uid},{actor:0});
 raid=play(lab.packs,raid,a=>a.type==='chooseMoveOppFront'&&a.uid===buried.uid);
 assert.ok(raid.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===buried.uid));
 raid=advance(lab.packs,raid,x=>x.active===1&&x.phase==='main');
 assert.ok(legalUniversalActions(lab.packs,raid).some(a=>a.type==='raid'&&a.uid===topCard.uid&&
  a.baseUid===buried.uid&&a.line==='front'));
 raid=play(lab.packs,raid,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===buried.uid&&a.line==='front',1);
 assert.equal(raid.players[1].front.some(c=>c?.uid===topCard.uid&&c.ready===true),true);
 assert.equal(raid.continuousStates.some(e=>e.targetUid===topCard.uid),false);
 assert.equal(assertUniversalMatch(lab.packs,raid),true);
 assert.equal(raid.continuousStates.some(e=>e.targetUid===buried.uid),false);
});

test('STG-1-029 retires by trigger kinds, gains impact at five, and raids Kurisu',()=>{
 function playOf(seed,outsideIds,targets){
  let s=board(['STG-1-029','STG-1-032','STG-1-034','STG-1-035','STG-1-041','STG-1-020','STG-1-009'],seed);
  place(s,0,'STG-1-009','energy',0);
  place(s,0,'STG-1-001','energy',1);
  place(s,0,'STG-1-007','energy',2);
  place(s,0,'STG-1-014','energy',3);
  for(const id of outsideIds)outside(s,0,id);
  const placed=targets.map((id,slot)=>place(s,1,id,'front',slot));
  const actor=take(s,0,'STG-1-029');
  hold(s,0,[actor]);
  s=play(stgPacks,s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
  return {s,actor,placed};
 }
 const zero=playOf(31029,[],['STG-1-020']);
 assert.equal(zero.s.pending,null);
 assert.equal(zero.s.players[0].front[0].impactGranted,undefined);
 assert.equal(zero.s.players[1].front[0].uid,zero.placed[0].uid);
 const three=playOf(31030,['STG-1-032','STG-1-034','STG-1-035'],['STG-1-020','STG-1-041']);
 assert.equal(three.s.pending.kind,'effect-retire-trigger-ceiling');
 assert.equal(three.s.pending.ceiling,3000);
 assert.ok(three.s.pending.choices.includes(three.placed[0].uid));
 assert.equal(three.s.pending.choices.includes(three.placed[1].uid),false);
 const kept=dispatchUniversalAction(stgPacks,three.s,{type:'chooseRetireAtLeast',uid:null},{actor:0});
 assert.equal(kept.players[1].front[0].uid,three.placed[0].uid);
 assert.equal(kept.players[0].front[0].impactGranted,undefined);
 let retired=playOf(31031,['STG-1-032','STG-1-034','STG-1-035'],['STG-1-020']);
 retired.s=dispatchUniversalAction(stgPacks,retired.s,{type:'chooseRetireAtLeast',uid:retired.placed[0].uid},{actor:0});
 assert.ok(retired.s.players[1].outside.some(c=>c.uid===retired.placed[0].uid));
 assert.equal(retired.s.pending,null);

 const kinds=['draw','get','final','active','special'];
 const events=kinds.map(trigger=>({
  id:'E'+trigger,name:'藍事件'+trigger,color:'blue',type:'event',energy:1,ap:1,bp:0,gen:0,trigger,
  ...(trigger==='special'?{triggerEffect:{op:'retireOppFront'}}:{}),
  implementation:'vanilla',effects:{}
 }));
 const low={id:'LOW',name:'低',color:'red',type:'character',energy:0,ap:1,bp:5000,gen:0,
  implementation:'vanilla',effects:{}};
 const high={id:'HIGH',name:'高',color:'red',type:'character',energy:0,ap:1,bp:5500,gen:0,
  implementation:'vanilla',effects:{}};
 const gen={id:'GN',name:'產能',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:4,
  implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-029'),...events,low,high,gen],31032);
 let five=toPhase(lab.packs,lab.s,'main');
 readyAp(five);
 five.players[0].energy[0]=pull(five,0,'GN');
 for(const card of events)five.players[0].outside.push(pull(five,0,card.id));
 const legalTarget=pull(five,1,'LOW');
 const illegal=pull(five,1,'HIGH');
 five.players[1].front[0]=legalTarget;
 five.players[1].front[1]=illegal;
 const actor=pull(five,0,'STG-1-029');
 hold(five,0,[actor]);
 five=play(lab.packs,five,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(five.pending.ceiling,5000);
 assert.ok(five.pending.choices.includes(legalTarget.uid));
 assert.equal(five.pending.choices.includes(illegal.uid),false);
 five=dispatchUniversalAction(lab.packs,five,{type:'chooseRetireAtLeast',uid:null},{actor:0});
 assert.equal(five.players[0].front[0].impactGranted.amount,1);
 assert.equal(five.pending,null);
 assert.equal(assertUniversalMatch(lab.packs,five),true);

 let raid=board(['STG-1-029','STG-1-069','STG-1-009'],31033);
 const base=place(raid,0,'STG-1-069','energy',0);
 place(raid,0,'STG-1-009','energy',1);
 place(raid,0,'STG-1-001','energy',2);
 place(raid,0,'STG-1-007','energy',3);
 const topCard=take(raid,0,'STG-1-029');
 hold(raid,0,[topCard]);
 const raids=legalUniversalActions(stgPacks,raid).filter(a=>a.type==='raid'&&a.uid===topCard.uid&&
  a.baseUid===base.uid);
 assert.ok(raids.some(a=>a.line==='front'));
 assert.ok(raids.some(a=>a.line==='energy'));
 raid=play(stgPacks,raid,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid&&a.line==='front');
 assert.equal(raid.pending,null);
 assert.equal(raid.players[0].front.some(c=>c?.uid===topCard.uid&&c.ready===true&&c.stack[0].uid===base.uid),true);
 assert.equal(raid.players[0].front[0].impactGranted,undefined);
 assert.equal(assertUniversalMatch(stgPacks,raid),true);
});

test('STG-1-056 and STG-1-059 cancel impact while an ordinary defender does not',()=>{
 const rezIds=REZ_BASE_IDS.map((id,i)=>i===REZ_BASE_IDS.length-1?'REZ-2-047':id);
 const packs=[rez,stg];
 function battle(defenderId,seed){
  let s=newUniversalMatch(packs,{decks:[rezDeck(rezIds),deckWith(['STG-1-056','STG-1-059'])],seed,first:0});
  const attacker=put(s,0,'REZ-2-047','front',0);
  const defender=put(s,1,defenderId,'front',0);
  s=toPhase(packs,s,'attack');
  s=play(packs,s,a=>a.type==='attack'&&a.uid===attacker.uid);
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:1});
  return s;
 }
 const plain=battle('STG-1-001',31061);
 assert.equal(plain.players[1].life.length,6);
 for(const [id,seed] of [['STG-1-056',31062],['STG-1-059',31063]]){
  const nulled=battle(id,seed);
  assert.equal(nulled.players[1].life.length,7);
  assert.ok(nulled.players[1].outside.some(c=>c.cardId===id));
  assert.equal(nulled.pending,null);
  assert.equal(assertUniversalMatch(packs,nulled),true);
 }
});
