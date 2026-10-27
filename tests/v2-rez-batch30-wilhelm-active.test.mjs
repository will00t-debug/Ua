import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-013','REZ-2-059'
],'REZ-2-055');
const NAME='ヴィルヘルム・ヴァン・アストレア|onceActiveSelfGate';

function layout(seed,{crusch=true,selfBp=0,oppBp=0}={}){
 let s=fresh(deck,seed);
 for(let slot=0;slot<3;slot++){
  const gen=take(s,0,'REZ-2-014');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 if(crusch){
  const ally=take(s,0,'REZ-2-059');ally.ready=true;ally.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=ally;
 }
 const foe=take(s,1,oppBp? 'REZ-2-049':'REZ-2-014');
 foe.ready=true;foe.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(oppBp)foe.buffs=[{bp:oppBp,untilTurn:s.turn}];
 s.players[1].front[0]=foe;
 s=toPhase(rezPacks,s,'main');
 const wilhelm=take(s,0,'REZ-2-013');s.players[0].hand.push(wilhelm);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===wilhelm.uid&&a.line==='front'),{actor:0});
 const played=s.players[0].front.find(c=>c.uid===wilhelm.uid);
 if(selfBp)played.buffs=[{bp:selfBp,untilTurn:s.turn}];
 return s;
}

function canActivate(s,uid){
 return legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===uid&&a.mode==='onceActiveGate');
}

test('REZ-2-013 becomes ACTIVE once per name when Crusch and a BP gate are met',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-013'].effectJa,/1ターンに1回のみ発動できる/);
 assert.equal(rez.cards['REZ-2-013'].impactNull,true);
 assert.equal(rez.cards['REZ-2-013'].mainAbility.op,'onceActiveSelfGate');
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let gated=layout(2013,{crusch:true,oppBp:1500});
 const first=gated.players[0].front.find(c=>c.cardId==='REZ-2-013');
 assert.equal(first.ready,false);
 assert.equal(universalBp(rezPacks,gated,gated.players[1].front[0]),4500);
 assert.equal(canActivate(gated,first.uid),true);
 gated=dispatchUniversalAction(rezPacks,gated,{type:'activate',uid:first.uid,mode:'onceActiveGate'},{actor:0});
 assert.equal(gated.players[0].front.find(c=>c.uid===first.uid).ready,true);
 assert.ok(gated.mainReadyOnceByName[0].includes(NAME));
 assert.equal(canActivate(gated,first.uid),false);
 const slot=gated.players[0].front.findIndex(c=>!c);
 const second=take(gated,0,'REZ-2-013');second.ready=false;second.fieldEntryStamp=gated.nextFieldEntryStamp++;
 gated.players[0].front[slot]=second;
 assert.equal(canActivate(gated,second.uid),false);
 assert.equal(canActivate(gated,first.uid),false);
 const bare=layout(2014,{crusch:false,oppBp:1500});
 assert.equal(canActivate(bare,bare.players[0].front.find(c=>c.cardId==='REZ-2-013').uid),false);
 const low=layout(2015,{crusch:true});
 assert.equal(universalBp(rezPacks,low,low.players[1].front[0]),2000);
 assert.equal(canActivate(low,low.players[0].front.find(c=>c.cardId==='REZ-2-013').uid),false);
 let tall=layout(2016,{crusch:true,selfBp:2000});
 const self=tall.players[0].front.find(c=>c.cardId==='REZ-2-013');
 assert.equal(universalBp(rezPacks,tall,self),5000);
 assert.equal(universalBp(rezPacks,tall,tall.players[1].front[0]),2000);
 tall=dispatchUniversalAction(rezPacks,tall,{type:'activate',uid:self.uid,mode:'onceActiveGate'},{actor:0});
 assert.equal(tall.players[0].front.find(c=>c.uid===self.uid).ready,true);
 assert.equal(assertUniversalMatch(rezPacks,gated),true);
 assert.equal(assertUniversalMatch(rezPacks,bare),true);
 assert.equal(assertUniversalMatch(rezPacks,low),true);
 assert.equal(assertUniversalMatch(rezPacks,tall),true);
});
