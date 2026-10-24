import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const ids=Array.from({length:13},(_,i)=>'J'+String(i).padStart(2,'0'));
const decks=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
const when={from:'hand',to:'outside',sourceName:'SourceRole',sourceColor:'blue',
 sourceOnField:true,reasons:['payment','own-effect']};
function build(name='SourceRole',color='blue'){
 const cards=ids.map(id=>({
  id,name:id==='J00'?name:id,color:id==='J00'?color:'blue',
  type:id==='J01'?'event':'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:['J00','J01'].includes(id)?'dsl':'vanilla',
  ...(id==='J00'?{mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,
   discardCount:1,bp:1500}}:{}),
  ...(id==='J01'?{moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{})
 }));
 const pack=createUniversalPack({id:'r20-main-source-'+name+'-'+color,cards});
 assert.deepEqual(validateUniversalDeck(pack,decks),[]);
 return [pack,pack];
}
function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[0][zone],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function started(packs){
 let s=newUniversalMatch(packs,{decks:[decks,decks],first:0,seed:20204});
 const source=take(s,'J00'),trigger=take(s,'J01');
 s.players[0].hand.push(source,trigger);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='discardSelfBuff');
 assert.ok(act);
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.pending?.kind,'main-discard-buff');
 return {s,source,trigger};
}
test('MAIN payment triggers only after source pays and gains BP, shared legal actions and exact UID',()=>{
 const packs=build();
 let {s,source,trigger}=started(packs);
 const empty=s.zoneMoveEvents.length;
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.type==='chooseMainDiscard'&&a.uid===trigger.uid));
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>a.uid===ai.uid));
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseMainDiscard',uid:'1-9999'}),/not currently legal/);
 assert.equal(s.zoneMoveEvents.length,empty);
 s=dispatchUniversalAction(packs,s,{type:'chooseMainDiscard',uid:trigger.uid});
 const move=s.zoneMoveEvents.find(x=>x.uid===trigger.uid&&x.to==='outside');
 assert.ok(move);
 assert.equal(move.reason,'payment');
 assert.equal(move.sourceCardId,'J00');
 assert.equal(s.zoneMoveEvents.filter(x=>x.from==='deck'&&x.to==='hand'&&x.sourceUid===trigger.uid).length,1);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),2500);
 assert.equal(s.mainAbilityUsedUids.includes(source.uid),true);
 assert.equal(s.pending,null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('a different source name or color cannot release moved-card ability',()=>{
 for(const packs of [build('OtherRole','blue'),build('SourceRole','red')]){
  let {s,trigger}=started(packs);
  s=dispatchUniversalAction(packs,s,{type:'chooseMainDiscard',uid:trigger.uid});
  assert.equal(s.zoneMoveEvents.filter(x=>x.sourceUid===trigger.uid&&x.from==='deck').length,0);
  assert.equal(s.zoneMoveEvents.filter(x=>x.uid===trigger.uid&&x.to==='outside').length,1);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('declaring source-qualified trigger cannot be silently downgraded to vanilla',()=>{
 const base=build()[0].cards['J01'];
 assert.ok(base.moveTriggers.length===1);
 const authored=ids.map(id=>({id,name:id,color:'blue',type:'character',
  energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla',
  ...(id==='J01'?{moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{})}));
 assert.throws(()=>createUniversalPack({id:'bad-move-vanilla',cards:authored}),
  /invalid|vanilla/i);
});
