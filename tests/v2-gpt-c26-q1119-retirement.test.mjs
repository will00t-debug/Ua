import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Official Q1119 (2024-09-06): an EVENT with mandatory "1枚選び"
// is unplayable without a legal target, even though an optional event is legal.
// Q32: use CURRENT BP, including buffs. Q1206: selected targets must be eligible.
// C26's four named events are identical in this respect; SPECIAL life differs.
const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const rows=[
 {pack:sao,id:'SAO-1-030',fuel:'SAO-1-020',named:'SAO-1-010'},
 {pack:sao,id:'SAO-1-065',fuel:'SAO-1-057',named:'SAO-1-001'},
 {pack:sao,id:'SAO-2-059',fuel:'SAO-2-051',named:'SAO-1-070'},
 {pack:mst,id:'MST-1-078',fuel:'MST-1-052',named:'MST-1-013'}
];
function deckOf(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.maxCopies!==1&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.filter(id=>!required.includes(id))].slice(0,13);
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=false;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function hold(s,p,id){const c=take(s,p,id);s.players[p].hand.push(c);return c;}
function toMain(packs,s){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function eventActions(packs,s,uid){
 return legalUniversalActions(packs,s).filter(a=>a.type==='event'&&a.uid===uid);
}
test('C26/Q1119: all four mandatory retire events are unplayable without a front target',()=>{
 for(const row of rows){
  const packs=[row.pack,sao];
  const own=deckOf(row.pack,[row.id,row.fuel,row.named]);
  const foe=deckOf(sao,['SAO-2-063','SAO-2-069']);
  let s=newUniversalMatch(packs,{decks:[own,foe],first:0,seed:261119});
  for(let i=0;i<4;i++)place(s,0,row.fuel,'energy',i);
  const event=hold(s,0,row.id);
  place(s,1,'SAO-2-063','energy',0); // Enemy ENERGY never satisfies FRONT.
  s=toMain(packs,s);
  assert.equal(eventActions(packs,s,event.uid).length,0,row.id+' empty enemy FRONT');
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'event',uid:event.uid}),
   /Action not currently legal/);
  assert.equal(s.players[0].hand.some(c=>c.uid===event.uid),true);
  assert.equal(assertUniversalMatch(packs,s),true);
  // BP5000 is too large without the printed bonus name.
  const large=place(s,1,'SAO-2-069','front',0);
  s.players[1].front[0].buffs.push({bp:1000,untilTurn:s.turn});
  assert.equal(universalBp(packs,s,s.players[1].front[0]),5000);
  assert.equal(eventActions(packs,s,event.uid).length,0,row.id+' BP5000 without name');
  // Actual field name is sufficient; this case also checks both titles.
  place(s,0,row.named,'front',0);
  assert.equal(eventActions(packs,s,event.uid).length,1,row.id+' named BP5000');
  const p=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
  assert.equal(p.pending.kind,'effect-retire-bp');
  assert.deepEqual(p.pending.choices,[large.uid]);
  const ai=chooseUniversalAiAction(packs,p,{difficulty:'hard'});
  assert.ok(legalUniversalActions(packs,p).some(a=>
   JSON.stringify(a)===JSON.stringify(ai)),row.id+' Hard AI legal');
  const done=dispatchUniversalAction(packs,p,{type:'chooseRetireBp',uid:large.uid});
  assert.equal(done.players[1].front[0],null);
  assert.equal(assertUniversalMatch(packs,done),true);
 }
});
test('C26/Q32: inclusive BP3000 boundary and current BP (3000+500) reject without bonus',()=>{
 const row=rows[0],packs=[sao,sao];
 const own=deckOf(sao,[row.id,row.fuel,row.named]);
 const foe=deckOf(sao,['SAO-2-063']);
 let s=newUniversalMatch(packs,{decks:[own,foe],first:0,seed:263000});
 for(let i=0;i<4;i++)place(s,0,row.fuel,'energy',i);
 const event=hold(s,0,row.id);
 const target=place(s,1,'SAO-2-063','front',0);
 s=toMain(packs,s);
 assert.equal(universalBp(packs,s,target),3000);
 assert.equal(eventActions(packs,s,event.uid).length,1,'3000 exact is legal');
 s.players[1].front[0].buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,s.players[1].front[0]),3500);
 assert.equal(eventActions(packs,s,event.uid).length,0,'3500 is above 3000');
 place(s,0,row.named,'front',0);
 assert.equal(eventActions(packs,s,event.uid).length,1,'named 3500 legal');
 const p=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.deepEqual(p.pending.choices,[target.uid]);
 assert.equal(assertUniversalMatch(packs,p),true);
});

test('C26/Q87/Q1946: silencing an alias loses the name, silencing an original print does not',()=>{
 for(const [i,stillNamed] of [[0,false],[1,true]]){
  const row=rows[i],packs=[sao,sao];
  const own=deckOf(sao,[row.id,row.fuel,row.named]);
  const foe=deckOf(sao,['SAO-2-069']);
  let s=newUniversalMatch(packs,{decks:[own,foe],first:0,seed:261946+i});
  for(let k=0;k<4;k++)place(s,0,row.fuel,'energy',k);
  const event=hold(s,0,row.id),name=place(s,0,row.named,'front',0);
  place(s,1,'SAO-2-069','front',0);
  s=toMain(packs,s);
  assert.equal(universalBp(packs,s,s.players[1].front[0]),4000);
  assert.equal(eventActions(packs,s,event.uid).length,1,'un-silenced printed name/alias qualifies');
  grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
   sourceUid:name.uid,targetUid:name.uid,sourceLinked:false,
   until:{player:0,phase:'attack',edge:'end'}});
  assert.equal(eventActions(packs,s,event.uid).length,stillNamed?1:0,
   (stillNamed?'original print remains':'alias is disabled')+' on silence');
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('C26/Q1206: an unselectable enemy FRONT is not a playable-event target',()=>{
 const row=rows[0],packs=[sao,sao];
 const own=deckOf(sao,[row.id,row.fuel,row.named]);
 const foe=deckOf(sao,['SAO-2-063','SAO-1-082']);
 let s=newUniversalMatch(packs,{decks:[own,foe],first:0,seed:261206});
 for(let i=0;i<4;i++)place(s,0,row.fuel,'energy',i);
 const event=hold(s,0,row.id),target=place(s,1,'SAO-2-063','front',0);
 s=toMain(packs,s);
 assert.equal(eventActions(packs,s,event.uid).length,1);
 grantContinuousState(s,{kind:'cannotBeChosenByOppEffect',controller:1,
  sourceUid:target.uid,targetUid:target.uid,sourceLinked:false,
  selectionScope:'any',until:{player:1,phase:'start',edge:'start'}});
 assert.equal(eventActions(packs,s,event.uid).length,0,
  'an entirely protected FRONT cannot satisfy mandatory event choice');
 const other=place(s,1,'SAO-1-082','front',1);
 assert.equal(eventActions(packs,s,event.uid).length,1);
 const a=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.deepEqual(a.pending.choices,[other.uid],'protected UID never enters pending');
 assert.equal(assertUniversalMatch(packs,a),true);
});
