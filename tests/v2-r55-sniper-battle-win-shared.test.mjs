import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const basic=(id,bp=1000)=>({id,name:id,type:'character',color:'red',
 energy:0,ap:1,bp,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{}});
const shooter={...basic('shooter',3500),implementation:'dsl',enterAlwaysActive:true,
 effects:{onPlay:[{op:'grantSelfSniperThisTurn'},{op:'grantSelfAttackWinDrawThisTurn'}]}};
const cards=[shooter,basic('weak',3000),basic('equal',3500),basic('strong',4000),
 ...Array.from({length:9},(_,i)=>basic('other'+i))];
const pack=createUniversalPack({id:'r55-sniper-shared',cards}),both=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const take=(s,p,id)=>{
 for(const z of ['hand','deck','life']){
  const a=s.players[p][z],k=a.findIndex(c=>c.cardId===id);
  if(k>=0)return a.splice(k,1)[0];
 }
 throw Error('No physical '+id);
};
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function scene(defenderId='equal'){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:55122});
 const shooterCard=take(s,0,'shooter');
 shooterCard.fieldEntryStamp=s.nextFieldEntryStamp++;shooterCard.ready=true;
 s.players[0].front[0]=shooterCard;
 // Genuine onPlay effect resolution, not just an invented action payload.
 // Use an actual paid play of the shooter to earn the ability.
 s.players[0].front[0]=null;s.players[0].hand.push(shooterCard);
 const energy=take(s,0,'other0');energy.ready=true;
 energy.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[0]=energy;
 for(let i=0;i<2;i++)s=use(s,{type:'next'});
 const play=legalUniversalActions(both,s).find(a=>a.type==='play'&&a.uid===shooterCard.uid&&a.line==='front');
 assert.ok(play);s=use(s,play);
 const attacker=s.players[0].front.find(c=>c?.uid===shooterCard.uid);
 assert.ok(attacker?.ready);
 const target=take(s,1,defenderId);target.fieldEntryStamp=s.nextFieldEntryStamp++;target.ready=true;
 s.players[1].front[0]=target;
 s=use(s,{type:'next'});assert.equal(s.phase,'attack');
 return {s,attacker,target};
}
test('R55 Q66-Q70 designated sniper attacks earn onAttack but no BLOCK, 3500 equality wins and draws',()=>{
 let {s,attacker,target}=scene('equal');
 const options=legalUniversalActions(both,s);
 const sniper=options.find(a=>a.type==='attack'&&a.uid===attacker.uid&&a.targetUid===target.uid);
 assert.ok(sniper);assert.ok(options.some(a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid));
 assert.equal(sniper.targetStamp,target.fieldEntryStamp);
 const h=s.players[0].hand.length;
 s=use(s,sniper);
 assert.equal(s.pending,null);assert.equal(s.players[0].hand.length,h+1);
 assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));
 assert.equal(s.blocksByUid[target.uid],undefined);
 assert.equal(s.players[1].life.length,7);
 assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
 assert.equal(universalPublicView(both,s,1).players[0].hand,null);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(both,s,{difficulty});
  assert.ok(legalUniversalActions(both,s).some(x=>JSON.stringify(x)===JSON.stringify(ai)));
 }
});
test('R55 stronger defender survives without block, without attacker-win draw',()=>{
 let {s,attacker,target}=scene('strong');
 const h=s.players[0].hand.length;
 const a=legalUniversalActions(both,s).find(x=>x.type==='attack'&&x.targetUid===target.uid);
 s=use(s,a);
 assert.equal(s.players[0].hand.length,h);
 assert.ok(s.players[1].front.some(x=>x?.uid===target.uid&&x.ready));
 assert.equal(s.blocksByUid[target.uid],undefined);
});
test('R55 direct LIFE not a character battle victory, forged foreign/stale target rejected',()=>{
 let {s,attacker,target}=scene('weak');
 const legal=legalUniversalActions(both,s);
 assert.ok(!legal.some(a=>a.targetUid==='0-999999'));
 assert.throws(()=>use(s,{type:'attack',uid:attacker.uid,targetUid:'0-999999',targetStamp:1}));
 assert.throws(()=>use(s,{type:'attack',uid:attacker.uid,targetUid:target.uid,targetStamp:999999}));
 const before=s.players[0].hand.length;
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.players[1].life.length,6);
});
test('R55 source-stamped grants fail closed for arbitrary cards and wrong schema',()=>{
 for(const op of ['grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn']){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...shooter,
   effects:{onPlay:[{op,until:'permanent'}]}}]}));
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...shooter,
   effects:{onAttack:[{op}]}}]}));
 }
 const {s}=scene('weak');
 const forged=structuredClone(s),actor=forged.players[0].front.find(Boolean);
 actor.sniperGranted={turn:forged.turn,stamp:99999};
 assert.throws(()=>assertUniversalMatch(both,forged));
});

test('R55 Q2295 ordinary BLOCK at equal BP earns self battle victory draw once',()=>{
 let {s,attacker,target}=scene('equal');
 const hand=s.players[0].hand.length;
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 const options=legalUniversalActions(both,s);
 assert.ok(options.some(x=>x.type==='chooseBlock'&&x.uid===target.uid));
 s=use(s,{type:'chooseBlock',uid:target.uid});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.ok(s.players[1].outside.some(x=>x.uid===target.uid));
 assert.equal(s.blocksByUid[target.uid],1);
 assert.equal(assertUniversalMatch(both,s),true);
});
