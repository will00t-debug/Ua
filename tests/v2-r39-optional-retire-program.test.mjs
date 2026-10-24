import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const mk=(n,extra={})=>({id:'QR-'+String(n).padStart(3,'0'),name:'qr'+n,
 type:'character',color:'blue',energy:0,ap:1,bp:1000,gen:1,
 traits:[],implementation:'vanilla',...extra});
const TOP={op:'searchTopUpToTwoBottom',count:4,max:1,rest:'bottom',
 filters:[{field:'traitlessCharacterOrField',value:true}],logic:'any'};
const source=mk(1,{implementation:'dsl',effects:{onPlay:[{op:'optionalRetireThenProgram',
 optional:true,cardType:'field',after:[{op:'activeSelfIf',
 when:{kind:'ownRetiredThisTurn',turn:'any',cardType:'field'}},TOP]}]}});
const cards=[source,mk(2,{type:'field',bp:0}),...Array.from({length:11},(_,i)=>mk(i+3))];
const pack=createUniversalPack({id:'qr-test',version:'v1',cards});
const packs=[pack,pack],deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function fresh(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:391});
 const take=id=>{for(const z of ['hand','deck','life','outside']){
  const list=s.players[0][z],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }throw Error(id);};
 const src=take('QR-001'),field=take('QR-002'),other=take('QR-003');
 s.players[0].hand.push(src);
 field.ready=true;field.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=field;
 other.ready=true;other.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=other;
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front');
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 return {s,src,field,other};
}
test('optional true FIELD retire: decline creates no retirement or AFTER',()=>{
 let {s,field}=fresh();
 assert.equal(s.pending?.kind,'effect-retire-own-field');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),[null,field.uid]);
 const deckBefore=s.players[0].deck.map(c=>c.uid),n=s.turnRetireEvents.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:null});
 assert.equal(s.pending,null);assert.deepEqual(s.players[0].deck.map(c=>c.uid),deckBefore);
 assert.equal(s.turnRetireEvents.length,n);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('a genuine FIELD retirement gates ACTIVE and TOP search, never a CHARACTER or forged UID',()=>{
 let {s,src,field,other}=fresh();
 const copy=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:other.uid}),/not currently legal/);
 assert.deepEqual(s,copy);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===field.uid));
 assert.ok(s.turnRetireEvents.some(x=>x.uid===field.uid&&x.cardType==='field'));
 assert.ok(s.players[0].front.some(c=>c?.uid===src.uid&&c.ready));
 assert.ok(['effect-top-filter-many-choice','effect-top-order',null].includes(s.pending?.kind??null));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('bad optional cost and untyped follow-ups are rejected at pack boundary',()=>{
 for(const bad of [
  {op:'optionalRetireThenProgram',optional:true,cardType:'event',after:[TOP]},
  {op:'optionalRetireThenProgram',optional:true,cardType:'character',after:[{op:'draw',count:1}]},
  {op:'optionalRetireThenProgram',optional:true,cardType:'character',
   after:[{op:'activeSelfIf',line:'front'},TOP]}
 ])assert.throws(()=>createUniversalPack({id:'bad',version:'v1',
  cards:[{...source,effects:{onPlay:[bad]}},...cards.slice(1)]}),/invalid/);
});
