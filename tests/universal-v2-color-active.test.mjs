import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
  assertUniversalMatch,universalBp,universalEnergy,universalEnergyByColor,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Two colors are legal within ONE source material; their printed energy
// symbols must nevertheless be counted separately per official FAQ Q29.
const cards=Array.from({length:13},(_,i)=>({
 id:'M'+String(i).padStart(2,'0'),name:'Base '+i,
 type:'character',color:'green',energy:i%4,ap:1,bp:1500,gen:1,
 implementation:'vanilla'
}));
cards[0]={...cards[0],energy:0,gen:4};
cards[1]={...cards[1],name:'Purple high-cost',color:'purple',energy:3,bp:3500,gen:0};
cards[2]={...cards[2],name:'Purple generator',color:'purple',energy:0,gen:3};
cards[3]={...cards[3],name:'Green high-cost',color:'green',energy:4,gen:1};
cards[4]={...cards[4],name:'ACTIVE life trigger',color:'green',trigger:'active',energy:0,gen:1};
cards[5]={...cards[5],name:'FINAL life trigger',trigger:'final',energy:0};
const pack=createUniversalPack({id:'mixed-color-same-series',cards});
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
const newMatch=(seed=15)=>newUniversalMatch(pack,{decks:[deck,deck],seed,first:0});
function take(s,owner,id){
 const p=s.players[owner];
 for(const zone of ['hand','deck','life','outside']){
  const i=p[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return p[zone].splice(i,1)[0];
 }
 throw Error('No fixture card '+owner+'/'+id);
}
function toHand(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function phase(s,target){
 for(let i=0;i<5&&s.phase!==target;i++)
  s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,target);
 return s;
}
test('official deck construction permits same-title mixed colors, not mandatory mono-color',()=>{
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 const mono=createUniversalPack({id:'restricted-test',cards,restrictColors:true});
 assert.match(validateUniversalDeck(mono,deck).join(';'),/Deck colors must match/);
 assert.equal(newMatch().players[0].life.length,7);
 assert.equal(assertUniversalMatch(pack,newMatch()),true);
});
test('colored printed costs use required matching icons; green 4 cannot pay purple 3',()=>{
 let s=newMatch(),p=s.players[0];
 const target=toHand(s,0,'M01'),greenTarget=toHand(s,0,'M03');
 const green=take(s,0,'M00');green.ready=false;p.energy[0]=green;
 s=phase(s,'main');
 assert.equal(universalEnergy(pack,s,0),4);
 assert.deepEqual({...universalEnergyByColor(pack,s,0)},{green:4});
 let legal=legalUniversalActions(pack,s);
 assert.ok(!legal.some(a=>a.type==='play'&&a.uid===target.uid),'purple-3 illegal with green-4');
 assert.ok(legal.some(a=>a.type==='play'&&a.uid===greenTarget.uid),'green-4 legal');
 const purple=take(s,0,'M02');p=s.players[0];p.energy[1]=purple;
 assert.equal(universalEnergy(pack,s,0),7);
 assert.deepEqual({...universalEnergyByColor(pack,s,0)},{green:4,purple:3});
 legal=legalUniversalActions(pack,s);
 assert.ok(legal.some(a=>a.type==='play'&&a.uid===target.uid));
 const next=dispatchUniversalAction(pack,s,legal.find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='front'&&a.slot===0));
 assert.equal(assertUniversalMatch(pack,next),true);
 assert.equal(next.players[0].energy[0].ready,false,'REST card still produces energy');
 assert.equal(universalEnergy(pack,next,0),7,'energy is continuous, not spent');
 assert.deepEqual(universalPublicView(pack,next,0).players[0].energyByColor,{green:4,purple:3});
});
test('hard AI prefers purple energy to pay a purple hand card, even with enough total green symbols',()=>{
 let s=newMatch(25);const p=s.players[0],green=take(s,0,'M00');
 p.energy[0]=green;
 const purpleProducer=toHand(s,0,'M02'),purpleCost=toHand(s,0,'M01');
 s=phase(s,'main');
 assert.equal(universalEnergy(pack,s,0),4);
 const legal=legalUniversalActions(pack,s);
 assert.ok(legal.some(a=>a.uid===purpleProducer.uid&&a.line==='energy'));
 assert.ok(!legal.some(a=>a.uid===purpleCost.uid&&a.type==='play'));
 const action=chooseUniversalAiAction(pack,s,{difficulty:'hard'});
 assert.equal(action.uid,purpleProducer.uid);
 assert.equal(action.line,'energy');
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(next.players[0].energy[0].uid,green.uid);
 assert.equal(universalEnergyByColor(pack,next,0).purple,3);
 assert.equal(assertUniversalMatch(pack,next),true);
});
function lifeFixture({last=false,alreadyActive=false}={}){
 let s=newMatch(49),attacker=take(s,0,'M03');
 attacker.ready=true;s.players[0].front[0]=attacker;
 const defending=take(s,1,'M00');defending.ready=alreadyActive;s.players[1].front[0]=defending;
 const energy=take(s,1,'M02');s.players[1].energy[0]=energy;
 const revealed=take(s,1,'M04'),life=s.players[1].life;
 s.players[1].deck.push(life.shift());life.unshift(revealed);
 if(last)s.players[1].outside.push(...life.splice(1));
 s=phase(s,'attack');
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 return {s,defending,energy,revealed};
}
test('Q99/Q101 ACTIVE trigger may be declined; can target own REST or already ACTIVE in either line',()=>{
 for(const ready of [false,true]){
  const {s,defending,energy,revealed}=lifeFixture({alreadyActive:ready});
  const actions=legalUniversalActions(pack,s);
  assert.equal(actions[0].mode,'skip');
  assert.ok(actions.some(a=>a.mode==='active'&&a.uid===defending.uid));
  assert.ok(actions.some(a=>a.mode==='active'&&a.uid===energy.uid));
  assert.ok(!actions.some(a=>a.uid===s.players[0].front[0].uid));
  const reject=dispatchUniversalAction(pack,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
  assert.equal(reject.players[1].front[0].ready,ready);
  assert.equal(universalBp(pack,reject,reject.players[1].front[0]),1500);
  const activated=dispatchUniversalAction(pack,s,{type:'chooseTrigger',mode:'active',uid:defending.uid},{actor:1});
  assert.equal(activated.players[1].front[0].ready,true);
  assert.equal(universalBp(pack,activated,activated.players[1].front[0]),4500);
  assert.ok(activated.players[1].outside.some(c=>c.uid===revealed.uid));
  assert.equal(assertUniversalMatch(pack,activated),true);
  assert.throws(()=>dispatchUniversalAction(pack,s,
    {type:'chooseTrigger',mode:'active',uid:s.players[0].front[0].uid},{actor:1}),/not currently legal/);
  const ai=chooseUniversalAiAction(pack,s,{difficulty:'normal'});
  assert.equal(ai.mode,'active','AI may choose an ACTIVE trigger in the defender turn');
 }
});
test('ACTIVE trigger on final life still loses after resolution, it never restores a life card',()=>{
 const {s,defending}=lifeFixture({last:true});
 assert.equal(s.status,'playing','must wait for optional trigger');
 const applied=dispatchUniversalAction(pack,s,{type:'chooseTrigger',mode:'active',uid:defending.uid},{actor:1});
 assert.equal(applied.status,'finished');
 assert.equal(applied.winner,0);
 assert.equal(applied.players[1].life.length,0);
 assert.equal(assertUniversalMatch(pack,applied),true);
});
