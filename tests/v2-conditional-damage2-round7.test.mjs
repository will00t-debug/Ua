import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalAttackDamage,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Printed Yhwach condition: both players' two genuine CHARACTER retirements
// in the active turn; COMPONENT-only, no BLC-1-024 registry promotion here.
const cards=Array.from({length:13},(_,i)=>({
 id:'DAMAGE-'+i,name:'Character '+i,color:'yellow',
 type:i===1?'event':'character',energy:0,ap:1,bp:i===1?0:i===2||i===3?1000:4000,
 gen:i===1?0:1,implementation:i===0||i===1?'dsl':'vanilla',
 ...(i===0?{passiveBonuses:[{condition:{kind:'retireCountThisTurn',
  turn:'own',controller:'any',cardType:'character',min:2},bp:1000,extraDamage:1}]}:{}),
 ...(i===1?{effects:{onPlay:[{op:'retireOppFrontAllUnderBp',bp:1500}]}}:{})
}));
const pack=createUniversalPack({id:'damage2-component',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(x=>x.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);}
function setup(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:7302});
 const attacker=take(s,0,'DAMAGE-0');attacker.ready=true;s.players[0].front[0]=attacker;
 const event=take(s,0,'DAMAGE-1');s.players[0].hand.push(event);
 for(const [i,id] of ['DAMAGE-2','DAMAGE-3'].entries()){
  const c=take(s,1,id);c.ready=true;s.players[1].front[i]=c;
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 return {s,attacker,event};
}
test('two true retirements activate conditional BP+1000 and DAMAGE(2) without replaying fake event count',()=>{
 let {s,attacker,event}=setup();
 assert.equal(universalBp(packs,s,attacker),4000);
 assert.equal(universalAttackDamage(packs,s,attacker),1);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 assert.equal(countRetirementsThisTurn(s,'any','character'),2);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),5000);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),2);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.ok(attack);s=dispatchUniversalAction(packs,s,attack);
 assert.equal(s.pending?.kind,'block');
 const before=s.players[1].life.length,reveals=s.publicReveals.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 for(let i=0;i<6&&s.pending?.kind==='life-trigger';i++)
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'});
 assert.equal(s.players[1].life.length,before-2);
 assert.equal(s.publicReveals.length,reveals+2);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('one retirement or opponent turn gives no conditional damage; invalid schema fails closed',()=>{
 const {s,attacker}=setup();
 s.turnRetireEvents.push({turn:s.turn,controller:1,cardType:'character',uid:'1-3',
  line:'front',fieldEntryStamp:1});
 assert.equal(universalAttackDamage(packs,s,attacker),1);
 assert.equal(universalBp(packs,s,attacker),4000);
 s.active=1;assert.equal(universalAttackDamage(packs,s,attacker),1);
 for(const bonus of [{extraDamage:0},{extraDamage:3},{extraDamage:1,extraEnergy:11}]){
  assert.throws(()=>createUniversalPack({id:'bad-damage',cards:[{...cards[0],
   passiveBonuses:[{condition:{kind:'retireCountThisTurn',turn:'own',
    controller:'any',cardType:'character',min:2},...bonus}]}]}),
   /invalid passive bonus/);
 }
});
