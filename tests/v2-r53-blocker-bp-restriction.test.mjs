import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const base=(id,name=id,bp=2000)=>({id,name,color:'green',type:'character',
 energy:0,ap:1,bp,gen:1,traits:[],trigger:null,effects:{},
 implementation:'vanilla'});
const noBig={...base('noBig','ヨーコ',3500),implementation:'dsl',
 blockBpRestriction:{relation:'atLeast',bp:4000,condition:null}};
const condition={kind:'ownOutsideNamedCountAtLeast',turn:'any',min:8,
 names:['ユウキ','マザーズ・ロザリオ']};
const noSmall={...base('noSmall','アスナ',4000),implementation:'dsl',
 blockBpRestriction:{relation:'atMost',bp:3000,condition}};
const cards=[noBig,noSmall,base('big','big',4000),base('small','small',2000),
 base('yuuki','ユウキ'),base('rosario','マザーズ・ロザリオ'),
 ...Array.from({length:7},(_,i)=>base('f'+i,'f'+i))];
const pack=createUniversalPack({id:'r53-block-bp-restriction-shared',cards});
const decks=Object.fromEntries(Object.keys(pack.cards).map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,decks),[]);
const both=[pack,pack],use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('missing physical '+id);
}
function scene(attackerId,names=0){
 let s=newUniversalMatch(both,{decks:[decks,decks],first:0,seed:53067+names});
 const a=take(s,0,attackerId);a.ready=true;
 a.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=a;
 const low=take(s,1,'small'),high=take(s,1,'big');
 for(const [i,c] of [low,high].entries()){
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[i]=c;
 }
 const sources=[
  ...Array.from({length:4},()=>take(s,0,'yuuki')),
  ...Array.from({length:4},()=>take(s,0,'rosario'))
 ];
 s.players[0].outside.push(...sources.slice(0,names));
 // Remaining physical cards are conserved in original deck/hand/LIFE.
 // Restore those not going to OUTSIDE, preserving exact unique card identity.
 s.players[0].deck.push(...sources.slice(names));
 for(let i=0;i<3;i++)s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=use(s,{type:'attack',uid:a.uid});
 assert.equal(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
 return {s,low,high,a};
}
test('R53 TTG printed >=4000 blocker exclusion checks current BP, not printed-only',()=>{
 const {s,low,high}=scene('noBig');
 const choices=legalUniversalActions(both,s).filter(x=>x.type==='chooseBlock');
 assert.ok(choices.some(x=>x.uid===low.uid));
 assert.ok(!choices.some(x=>x.uid===high.uid));
 assert.throws(()=>use(s,{type:'chooseBlock',uid:high.uid}));
 const won=use(s,{type:'chooseBlock',uid:low.uid});
 assert.equal(assertUniversalMatch(both,won),true);
});
test('R53 future SAO named OUTSIDE gate at 7/8 changes <=3000 block prohibition',()=>{
 const a=scene('noSmall',7),b=scene('noSmall',8);
 const legal1=legalUniversalActions(both,a.s).filter(x=>x.type==='chooseBlock');
 const legal2=legalUniversalActions(both,b.s).filter(x=>x.type==='chooseBlock');
 assert.ok(legal1.some(x=>x.uid===a.low.uid));
 assert.ok(legal1.some(x=>x.uid===a.high.uid));
 assert.ok(!legal2.some(x=>x.uid===b.low.uid));
 assert.ok(legal2.some(x=>x.uid===b.high.uid));
 assert.throws(()=>use(b.s,{type:'chooseBlock',uid:b.low.uid}));
 assert.equal(assertUniversalMatch(both,use(b.s,{type:'chooseBlock',uid:b.high.uid})),true);
});
test('R53 blocker schema rejects fake or loosened current-BP source restrictions',()=>{
 for(const variant of [
  {...noBig,blockBpRestriction:{relation:'above',bp:4000,condition:null}},
  {...noBig,blockBpRestriction:{relation:'atLeast',bp:0,condition:null}},
  {...noBig,blockBpRestriction:{relation:'atLeast',bp:4000}},
  {...noBig,blockBpRestriction:{relation:'atLeast',bp:4000,condition:null,optional:true}},
  {...noBig,blockBpRestriction:{relation:'atMost',bp:3000,condition:
   {...condition,names:['ユウキ','ユウキ']}}},
  {...noBig,implementation:'vanilla'},
  {...noBig,type:'field'}
 ]){
  assert.throws(()=>createUniversalPack({id:'r53-block-negative',cards:[variant]}));
 }
});
