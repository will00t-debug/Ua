import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Official BLC-1-024 two modes, but this is synthetic component-only:
// no official card is registered until printed DAMAGE(2) is complete.
const mode={op:'chooseOne',optional:false,options:[
 {id:'strip',label:'Strip a Raid top',turn:'any',
  then:[{op:'stripOppRaidTop',optional:true}]},
 {id:'retire',label:'Retire an opponent with BP up to 3000',turn:'any',
  then:[{op:'retireOppFrontOneUnderBp',bp:3000,optional:true}]}
]};
const defs=Array.from({length:13},(_,i)=>({
 id:'MODE-'+i,name:i===1?'Base':i===2?'Raid':'Character '+i,
 type:'character',color:'yellow',energy:0,ap:1,bp:i===3?2500:4000,gen:1,
 implementation:i===0||i===2||i===3?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[mode]}}:{}),
 ...(i===2?{raidName:'Base',effects:{onRetire:[{op:'draw',count:1}]}}:{}),
 ...(i===3?{effects:{onRetire:[{op:'draw',count:1}]}}:{})
}));
const pack=createUniversalPack({id:'choose-raid-retire-fixture',cards:defs}),packs=[pack,pack];
const deck=Object.fromEntries(defs.map((d,i)=>[d.id,i===12?2:4]));
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);}
function setup(raid){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:7277});
 const source=take(s,0,'MODE-0');s.players[0].hand.push(source);
 const low=take(s,1,'MODE-3');low.ready=true;s.players[1].front[1]=low;
 let top=null,base=null;
 if(raid){base=take(s,1,'MODE-1');top=take(s,1,'MODE-2');top.stack=[base];top.ready=false;s.players[1].front[0]=top;}
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,top,base,low};
}
test('exactly one printed mode selected; upper BP=3000 only, legal target, actual retirement ledger',()=>{
 let {s,low,top}=setup(true);
 assert.deepEqual(legalUniversalActions(packs,s).map(x=>x.mode),['strip','retire']);
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'retire');
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseRetireBp',uid:null},{type:'chooseRetireBp',uid:low.uid}]);
 const hand=s.players[1].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(s.players[1].hand.length,hand+1);
 assert.deepEqual(s.turnRetireEvents.map(e=>e.uid),[low.uid]);
 assert.equal(s.players[1].front[0].uid,top.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('stripping Raid from other mode is not retirement and preserves base incarnation',()=>{
 let {s,top,base}=setup(true);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'strip'});
 assert.equal(s.pending.kind,'effect-strip-raid-top');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'normal'}).uid,top.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseRaidTopStrip',uid:top.uid});
 assert.equal(s.players[1].front[0].uid,base.uid);
 assert.deepEqual(s.turnRetireEvents,[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('mode is selectable with no Raid target, and strict nested schema rejects bad BP',()=>{
 let {s}=setup(false);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'strip'});
 assert.equal(s.pending,null);
 for(const bad of [{op:'retireOppFrontOneUnderBp',bp:3000,optional:false},
  {op:'retireOppFrontOneUnderBp',bp:0,optional:true},
  {op:'retireOppFrontOneUnderBp',bp:3000,optional:true,anyLine:true}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...defs[0],
   effects:{onPlay:[{...mode,options:[{...mode.options[0]},
    {...mode.options[1],then:[bad]}]}]}}]}),
   /invalid optional BP-limited opponent retirement/);
 }
});
