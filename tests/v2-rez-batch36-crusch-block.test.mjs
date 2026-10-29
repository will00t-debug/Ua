import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-019'],'REZ-2-055');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function until(packs,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' at '+s.active+' '+s.phase);
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:s.active});
  if(++guard>12)throw Error('Stuck '+s.active+' '+s.phase);
 }
 return s;
}

test('REZ-2-019 grants two blocks and impact null only at BP 5000, until the next own start',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-019'].effectJa,/BPが5000以上/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-019'].effectJa,/2回ブロック/);
 assert.equal(rez.cards['REZ-2-019'].bp,4000);
 assert.equal(rez.cards['REZ-2-019'].mainAbility.op,'onceGrantBlockImpact');
 assert.throws(()=>createUniversalPack({id:'rez-019-bad',cards:[{
  id:'X',name:'クルシュ・カルステン',color:'blue',type:'character',energy:4,ap:1,bp:4000,gen:1,
  trigger:null,implementation:'dsl',effects:{},mainAbility:{
   op:'onceGrantBlockImpact',oncePerTurn:true,minBp:4000}}]}),/unsupported main/);
 let s=fresh(deck,2019);
 s=toPhase(rezPacks,s,'main');
 const crusch=sit(s,0,'REZ-2-019','front',0);
 assert.equal(universalBp(rezPacks,s,crusch),4000);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='grantBlockImpact'),false);
 crusch.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(rezPacks,s,crusch),5000);
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===crusch.uid&&a.mode==='grantBlockImpact');
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending,null);
 const granted=s.players[0].front[0];
 assert.equal(granted.doubleBlockUntil.untilOwnTurnStart,s.players[0].ownTurns+1);
 assert.equal(granted.impactNullUntil.stamp,granted.fieldEntryStamp);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='grantBlockImpact'),false);
 const first=sit(s,1,'REZ-2-014','front',0);
 const second=sit(s,1,'REZ-2-014','front',1);
 s=until(rezPacks,s,1,'attack');
 assert.equal(universalBp(rezPacks,s,s.players[0].front[0]),4000);
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:first.uid},{actor:1});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:crusch.uid},{actor:0});
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[1].front.some(c=>c?.uid===first.uid),true);
 assert.equal(s.players[1].front.find(c=>c.uid===first.uid).ready,false);
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:second.uid},{actor:1});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:crusch.uid},{actor:0});
 assert.equal(s.players[0].front[0].ready,false);
 s=until(rezPacks,s,0,'start');
 assert.equal(s.players[0].front[0].doubleBlockUntil,undefined);
 assert.equal(s.players[0].front[0].impactNullUntil,undefined);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('the granted impact null stops the winning attacker, and silence turns it off',()=>{
 const filler=id=>({id,name:id,color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const impact=createUniversalPack({id:'rez-019-impact',cards:[
  {id:'HIT',name:'打撃',color:'red',type:'character',energy:0,ap:1,bp:5000,gen:1,
   trigger:null,implementation:'dsl',effects:{},printedImpact:1},
  ...Array.from({length:12},(_,i)=>filler('RED-'+i))
 ]});
 const red=Object.fromEntries(['HIT',...Array.from({length:11},(_,i)=>'RED-'+i)].map(id=>[id,4]));
 red['RED-11']=2;
 const packs=[impact,rez];
 function scene(silence){
  let s=newUniversalMatch(packs,{decks:[red,deck],seed:3019,first:0});
  let hit;
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId==='HIT');
   if(index>=0){hit=pile.splice(index,1)[0];break;}
  }
  hit.ready=true;hit.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=hit;
  s=until(packs,s,1,'main');
  const wall=sit(s,1,'REZ-2-019','front',0);
  wall.buffs=[{bp:1000,untilTurn:s.turn}];
  const grant=legalUniversalActions(packs,s).find(a=>a.mode==='grantBlockImpact'&&a.uid===wall.uid);
  s=dispatchUniversalAction(packs,s,grant,{actor:1});
  s=until(packs,s,0,'attack');
  const live=s.players[1].front[0];
  if(silence)grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,
   sourceUid:live.uid,targetUid:live.uid,sourceLinked:false,
   until:{player:0,phase:'attack',edge:'end'}});
  const life=s.players[1].life.map(c=>c.uid);
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:hit.uid},{actor:0});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:live.uid},{actor:1});
  return {s,life,wall:live.uid};
 }
 const nulled=scene(false);
 assert.deepEqual(nulled.s.players[1].life.map(c=>c.uid),nulled.life);
 assert.equal(nulled.s.pending,null);
 assert.ok(nulled.s.players[1].outside.some(c=>c.uid===nulled.wall));
 const silenced=scene(true);
 assert.notDeepEqual(silenced.s.players[1].life.map(c=>c.uid),silenced.life);
 assert.equal(assertUniversalMatch(packs,nulled.s),true);
 assert.equal(assertUniversalMatch(packs,silenced.s),true);
});
