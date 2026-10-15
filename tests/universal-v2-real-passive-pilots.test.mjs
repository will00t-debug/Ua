import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalBp,assertUniversalMatch
} from '../dist/universal-v2/engine.mjs';

// Both sides now use printed and allowed REAL 50-card pilot decks.
const bleach=verifiedBleachPurplePilotDeck(),realTtg=verifiedTtgRedPilotDeck();
const bleachWithUrahara={...bleach.counts,'BLC-1-034':3,'BLC-1-037':1};
assert.deepEqual(validateUniversalDeck(bleach.pack,bleachWithUrahara),[]);
const ttg=realTtg.pack,redCounts=realTtg.counts;
assert.deepEqual(validateUniversalDeck(ttg,redCounts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing actual card '+p+'/'+id);
}
test('same audited ACTIVE +1 energy passive works in BLEACH purple and TTG red, and stops on REST',()=>{
 const packs=[bleach.pack,ttg];
 const s=newUniversalMatch(packs,{decks:[bleachWithUrahara,redCounts],seed:525,first:0});
 const purple=take(s,0,'BLC-1-037'),red=take(s,1,'TTG-1-066');
 s.players[0].energy[0]=purple;s.players[1].energy[0]=red;
 purple.ready=true;red.ready=true;
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 assert.equal(universalEnergyByColor(packs,s,1).red,2);
 const rest=structuredClone(s);
 rest.players[0].energy[0].ready=false;
 rest.players[1].energy[0].ready=false;
 assert.equal(universalEnergyByColor(packs,rest,0).purple,1);
 assert.equal(universalEnergyByColor(packs,rest,1).red,1);
 // Raising and lowering energy changes legality, not only displayed values.
 const candidate=take(s,0,'BLC-1-036');s.players[0].hand.push(candidate);
 for(let n=0;n<2;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);
  const after=dispatchUniversalAction(packs,s,next);
  Object.assign(s,after);
 }
 assert.ok(legalUniversalActions(packs,s).some(a=>
  a.type==='play'&&a.uid===candidate.uid),
  'energy-2 BLEACH character can play when generator ACTIVE');
 const blocked=structuredClone(s);blocked.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,blocked).some(a=>
  a.type==='play'&&a.uid===candidate.uid),
  'energy-2 BLEACH character cannot play after generator REST');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

function impactFixture(nullify){
 const packs=[ttg,ttg];
 let s=newUniversalMatch(packs,{decks:[redCounts,redCounts],first:0,seed:570});
 const attacker=take(s,0,'TTG-1-073'),base=take(s,0,'TTG-1-045'),
  hidden=take(s,0,'TTG-1-064');
 hidden.faceDown=true;base.under.push(hidden);attacker.stack=[base];attacker.ready=true;
 s.players[0].front[0]=attacker;
 const defending=take(s,1,nullify?'TTG-1-043':'TTG-1-042');
 defending.ready=true;s.players[1].front[0]=defending;
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const attacked=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(attacked.pending.kind,'block');
 assert.ok(universalBp(packs,attacked,attacked.players[0].front[0])>=5000);
 return {s:attacked,packs,attacker,defending};
}
test('official TTG-1-043 IMPACT-null blocker negates attacker 073 facedown RAID IMPACT only in its battle',()=>{
 const withNull=impactFixture(true),noNull=impactFixture(false);
 const before=withNull.s.players[1].life.length;
 assert.equal(before,noNull.s.players[1].life.length);
 const resolved=dispatchUniversalAction(withNull.packs,withNull.s,
  {type:'chooseBlock',uid:withNull.defending.uid},{actor:1});
 assert.equal(resolved.players[1].life.length,before,
  'IMPACT-null blocker prevents bonus damage after losing battle');
 assert.equal(resolved.players[1].front[0],null);
 const normal=dispatchUniversalAction(noNull.packs,noNull.s,
  {type:'chooseBlock',uid:noNull.defending.uid},{actor:1});
 assert.equal(normal.players[1].life.length,before-1,
  'ordinary blocker cannot negate attacker IMPACT');
 assert.equal(assertUniversalMatch(withNull.packs,resolved),true);
 assert.equal(assertUniversalMatch(noNull.packs,normal),true);
});
test('new real printed passive profiles fail closed when lied about or attached to events',()=>{
 const cards=[{
  id:'BAD',name:'Bad',type:'character',color:'red',
  energy:1,ap:1,bp:2000,gen:1,implementation:'vanilla'
 }];
 const cases=[
  {...cards[0],activeExtraEnergy:1},
  {...cards[0],impactNull:true},
  {...cards[0],implementation:'dsl',impactNull:false},
  {...cards[0],implementation:'dsl',activeExtraEnergy:0},
  {...cards[0],type:'event',gen:0,implementation:'dsl',impactNull:true},
  {...cards[0],type:'event',gen:0,implementation:'dsl',activeExtraEnergy:1}
 ];
 for(const card of cases)assert.throws(
  ()=>createUniversalPack({id:'bad-passive',cards:[card]}),
  /invalid|vanilla|without effects/,JSON.stringify(card));
});
