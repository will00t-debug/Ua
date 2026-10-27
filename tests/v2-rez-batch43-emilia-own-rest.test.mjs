import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-027'],'REZ-2-055');
const body={color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:1,trigger:null,traits:[]};

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function advance(packs,s,times){
 for(let i=0;i<times;i++){
  if(s.pending)throw Error(s.pending.kind);
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:s.active});
 }
 return s;
}

test('attacking or blocking REZ-2-027 does not open its own-effect ACTIVE',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-027'].effectJa,/自分の効果でアクティブからレスト/);
 assert.equal(rez.cards['REZ-2-027'].mainAbility.op,'onceActiveIfOwnEffectRested');
 let s=fresh(deck,2027);
 s=toPhase(rezPacks,s,'main');
 const emilia=sit(s,0,'REZ-2-027','front',0);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='ownRestActive'),false);
 s=advance(rezPacks,s,1);
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:emilia.uid},{actor:0});
 assert.equal(s.ownEffectRests.flat().some(e=>e.uid===emilia.uid),false);
 let blocked=fresh(deck,3027);
 const attacker=sit(blocked,0,'REZ-2-014','front',0);
 const wall=sit(blocked,1,'REZ-2-027','front',0);
 blocked=toPhase(rezPacks,blocked,'attack');
 blocked=dispatchUniversalAction(rezPacks,blocked,{type:'attack',uid:attacker.uid},{actor:0});
 blocked=dispatchUniversalAction(rezPacks,blocked,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(blocked.ownEffectRests.flat().some(e=>e.uid===wall.uid),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,blocked),true);
});

test('an own-effect REST lets the front character become ACTIVE once this turn',()=>{
 const filler=id=>({id,name:id,...body,implementation:'vanilla',effects:{}});
 const pack=createUniversalPack({id:'rez-027-fixture',cards:[
  {id:'EM',name:'エミリア',...body,implementation:'dsl',effects:{},mainAbility:{
   op:'onceActiveIfOwnEffectRested',oncePerTurn:true,frontOnly:true}},
  {id:'REST',name:'レスト',...body,implementation:'dsl',effects:{onPlay:[
   {op:'restOwnFrontOne',optional:true}]}},
  ...Array.from({length:11},(_,i)=>filler('P'+i))
 ]});
 assert.throws(()=>createUniversalPack({id:'rez-027-bad',cards:[{
  id:'REST',name:'レスト',...body,implementation:'dsl',effects:{onPlay:[
   {op:'restOwnFrontOne'}]}}]}),/own front REST/);
 const ids=['EM','REST',...Array.from({length:11},(_,i)=>'P'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.P10=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:4027,first:0});
 const em=takeFrom(s,'EM');em.ready=true;em.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=em;
 let guard=0;
 while(s.phase!=='main'){
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
  if(++guard>6)throw Error('no main');
 }
 const rest=takeFrom(s,'REST');s.players[0].hand.push(rest);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===rest.uid&&a.line==='energy'),{actor:0});
 assert.equal(s.pending.kind,'effect-rest-own');
 const skipped=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseOwnFrontRest',uid:null},{actor:0});
 assert.equal(skipped.players[0].front[0].ready,true);
 assert.equal(legalUniversalActions(packs,skipped).some(a=>a.mode==='ownRestActive'),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFrontRest',uid:em.uid},{actor:0});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.ownEffectRests.flat().some(e=>e.uid===em.uid&&e.turn===s.turn),true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.mode==='ownRestActive'&&a.uid===em.uid),{actor:0});
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='ownRestActive'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

function takeFrom(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
