import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID,REZERO_VOL2_CARDS} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,newUniversalMatch,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'&&id!=='REZ-2-042'),'REZ-2-005','REZ-2-009'],'REZ-2-005');

test('REZ-2-005 is impact null plus 1000 BP for Rem or Roswaal',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-005'].effectJa,/インパクト無効/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-005'].effectJa,/〈レム〉か〈ロズワール・L・メイザース〉/);
 const card=rez.cards['REZ-2-005'];
 assert.equal(card.impactNull,true);
 assert.equal(card.bp,3000);
 assert.deepEqual(card.passiveBonuses[0].condition.names,['レム','ロズワール・L・メイザース']);
 assert.equal(card.passiveBonuses[0].bp,1000);
 assert.equal(REZERO_VOL2_CARDS.some(c=>c.nameJa==='ロズワール・L・メイザース'),false);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'X',name:'ラム',color:'yellow',type:'character',energy:3,ap:1,bp:3000,gen:2,
  implementation:'dsl',effects:{},impactNull:true};
 const names=list=>createUniversalPack({id:'names',cards:[{...body,passiveBonuses:[{
  condition:{kind:'ownAnyNameExists',turn:'own',zone:'field',excludeSelf:false,names:list},bp:1000}]}]});
 assert.throws(()=>names(['レム']),/invalid/);
 assert.throws(()=>names(['レム','レム']),/invalid/);
});

test('Rem on this field adds 1000 once, and only on the controller turn',()=>{
 const packs=[rez,rez];
 const s=fresh(deck,1005);
 const ram=take(s,0,'REZ-2-005');ram.ready=true;s.players[0].front[0]=ram;
 const rem=take(s,0,'REZ-2-009');rem.ready=true;s.players[0].hand.push(rem);
 assert.equal(universalBp(packs,s,ram),3000);
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===rem.uid),1);
 s.players[0].energy[0]=rem;
 assert.equal(universalBp(packs,s,ram),4000);
 const other=structuredClone(s);other.active=1;
 assert.equal(universalBp(packs,other,other.players[0].front[0]),3000);
 s.players[0].energy[0]=null;s.players[0].hand.push(rem);
 const foe=take(s,1,'REZ-2-009');foe.ready=true;s.players[1].front[0]=foe;
 assert.equal(universalBp(packs,s,ram),3000);
 const subaru=take(s,0,'REZ-2-014');subaru.ready=true;s.players[0].energy[0]=subaru;
 assert.equal(universalBp(packs,s,ram),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,other),true);
});

test('Roswaal satisfies the same bonus once, even together with Rem',()=>{
 const ram=rez.cards['REZ-2-005'];
 const filler=id=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const pack=createUniversalPack({id:'rez-005-fixture',cards:[
  {id:ram.id,name:ram.name,color:ram.color,type:ram.type,energy:ram.energy,ap:ram.ap,bp:ram.bp,
   gen:ram.gen,trigger:ram.trigger,implementation:'dsl',effects:{},impactNull:true,
   passiveBonuses:structuredClone(ram.passiveBonuses)},
  {id:'ROS',name:'ロズワール・L・メイザース',color:'yellow',type:'character',energy:0,ap:1,bp:2000,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  {id:'REM',name:'レム',color:'blue',type:'character',energy:0,ap:1,bp:1500,gen:1,
   trigger:null,implementation:'vanilla',effects:{}},
  ...Array.from({length:10},(_,i)=>filler('Y'+i))
 ]});
 const ids=['REZ-2-005','ROS','REM',...Array.from({length:10},(_,i)=>'Y'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts['Y9']=2;
 const packs=[pack,pack];
 const s=newUniversalMatch(packs,{decks:[counts,counts],seed:1006,first:0});
 const host=take(s,0,'REZ-2-005');host.ready=true;s.players[0].front[0]=host;
 const ros=take(s,0,'ROS');ros.ready=true;s.players[0].energy[0]=ros;
 assert.equal(universalBp(packs,s,host),4000);
 const rem=take(s,0,'REM');rem.ready=true;s.players[0].energy[1]=rem;
 assert.equal(universalBp(packs,s,host),4000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-2-005 as a blocker removes the attacker impact for that battle',()=>{
 const filler=id=>({id,name:id,color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const impact=createUniversalPack({id:'rez-005-impact',cards:[
  {id:'HIT',name:'打撃',color:'red',type:'character',energy:0,ap:1,bp:3000,gen:1,
   trigger:null,implementation:'dsl',effects:{},printedImpact:1},
  ...Array.from({length:12},(_,i)=>filler('RED-'+i))
 ]});
 const red=Object.fromEntries(['HIT',...Array.from({length:11},(_,i)=>'RED-'+i)].map(id=>[id,4]));
 red['RED-11']=2;
 const packs=[impact,rez];
 let s=newUniversalMatch(packs,{decks:[red,deck],seed:1007,first:0});
 let hit;
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId==='HIT');
  if(index>=0){hit=pile.splice(index,1)[0];break;}
 }
 hit.ready=true;s.players[0].front[0]=hit;
 const wall=take(s,1,'REZ-2-005');wall.ready=true;s.players[1].front[0]=wall;
 s=toPhase(packs,s,'attack');
 const life=s.players[1].life.map(c=>c.uid);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:hit.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.deepEqual(s.players[1].life.map(c=>c.uid),life);
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
