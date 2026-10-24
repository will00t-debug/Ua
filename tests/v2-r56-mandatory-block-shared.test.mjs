import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const unit=(id,bp=2000)=>({id,name:id,type:'character',color:'purple',
 energy:0,ap:1,bp,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{}});
const hunter={...unit('hunter',4000),implementation:'dsl',effects:{
 onPlay:[{op:'grantSelfMustBlockThisTurn'}]}};
const summon={id:'summon',name:'summon',type:'event',color:'purple',
 energy:0,ap:1,bp:0,gen:0,traits:[],trigger:null,implementation:'dsl',
 effects:{onPlay:[{op:'deployNamedFromZones',name:'hunter',
  zones:['outside'],line:'front',ready:true,optional:true}]}};
const cards=[hunter,summon,unit('blocker',3500),
 ...Array.from({length:10},(_,i)=>unit('basic-'+i))];
const pack=createUniversalPack({id:'r56-shared',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const dispatch=(s,a)=>dispatchUniversalAction(packs,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const i=s.players[p][zone].findIndex(x=>x.cardId===id);
  if(i>=0)return s.players[p][zone].splice(i,1)[0];
 }
 throw Error('Missing physical card '+id);
}
function prepare(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:561002});
 const hunterCard=take(s,0,'hunter');
 s.players[0].outside.push(hunterCard);
 const event=take(s,0,'summon');
 s.players[0].hand.push(event);
 const blocker=take(s,1,'blocker');
 blocker.ready=true;blocker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=blocker;
 s=dispatch(s,{type:'next'});s=dispatch(s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 s=dispatch(s,play);
 assert.equal(s.pending?.kind,'effect-named-zone-entry');
 const entry=legalUniversalActions(packs,s).find(a=>a.type==='chooseNamedZoneDeploy'&&
  a.uid===hunterCard.uid&&a.zone==='outside'&&a.line==='front');
 assert.ok(entry);
 s=dispatch(s,entry);
 assert.ok(s.players[0].front.some(c=>c?.mustBlockGranted?.turn===s.turn));
 s=dispatch(s,{type:'next'});
 assert.equal(s.phase,'attack');
 return {s,blocker,hunterCard};
}
test('R56 Q2028 real own-effect entry grants a one-turn mandatory legal BLOCK',()=>{
 let {s,blocker,hunterCard}=prepare();
 s=dispatch(s,{type:'attack',uid:hunterCard.uid});
 assert.equal(s.pending?.kind,'block');
 const legal=legalUniversalActions(packs,s);
 assert.deepEqual(legal,[{type:'chooseBlock',uid:blocker.uid}]);
 assert.throws(()=>dispatch(s,{type:'chooseBlock',uid:null}));
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
 s=dispatch(s,legal[0]);
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
});
test('R56 Q2028 mandatory block is not possible without a legal ready blocker',()=>{
 let {s,blocker,hunterCard}=prepare();
 s.players[1].front[0].ready=false;
 s=dispatch(s,{type:'attack',uid:hunterCard.uid});
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseBlock',uid:null}]);
});
test('R56 paid play also earns printed onPlay mandatory BLOCK per official Q2028',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:561003});
 const h=take(s,0,'hunter');s.players[0].hand.push(h);
 const blocker=take(s,1,'blocker');blocker.ready=true;
 blocker.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=blocker;
 s=dispatch(s,{type:'next'});s=dispatch(s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===h.uid&&a.line==='front');
 assert.ok(play);
 s=dispatch(s,play);
 const actor=s.players[0].front.find(c=>c?.uid===h.uid);
 assert.deepEqual(actor.mustBlockGranted,{turn:s.turn,stamp:actor.fieldEntryStamp});
 // Paid entry is REST. Ready this physically existing object for subsequent
 // combat; this does not create a new printed ability.
 actor.ready=true;
 s=dispatch(s,{type:'next'});
 s=dispatch(s,{type:'attack',uid:h.uid});
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseBlock',uid:blocker.uid}]);
});
test('R56 rejected grant schemes cannot authorize foreign timings or permanent/block bypass',()=>{
 for(const op of [
  {op:'grantSelfMustBlockThisTurn',entry:'paidPlay'},
  {op:'grantSelfMustBlockThisTurn',entry:'ownEffect'},
  {op:'grantSelfMustBlockThisTurn',until:'forever'}
 ])assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...hunter,effects:{onPlay:[op]}}]}));
 assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...hunter,effects:{onAttack:[{op:'grantSelfMustBlockThisTurn'}]}}]}));
 const {s}=prepare(),forged=structuredClone(s);
 const actor=forged.players[0].front.find(Boolean);
 actor.mustBlockGranted.stamp=forged.nextFieldEntryStamp+1;
 assert.throws(()=>assertUniversalMatch(packs,forged));
});
