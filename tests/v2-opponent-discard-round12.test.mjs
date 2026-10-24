import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Synthetic. The opponent, not the effect's controller, chooses one hand card.
const cards=Array.from({length:13},(_,i)=>({
 id:'D'+i,name:'D'+i,color:'red',type:i===0?'character':'character',
 energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla'
}));
cards[0]={...cards[0],implementation:'dsl',effects:{onPlay:[{op:'discardOppHand',count:1}]}};
const pack=createUniversalPack({id:'opp-discard-r12',cards});
const packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function main(s){
 for(let n=0;n<4&&s.phase!=='main';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');
 return s;
}

test('opponent chooses exactly one hidden hand card; the controller cannot',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:1254,first:0});
 const source=take(s,0,'D0');s.players[0].hand.push(source);
 s=main(s);
 assert.ok(s.players[1].hand.length>=2);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.pending.player,1);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 const choices=legalUniversalActions(packs,s);
 assert.equal(choices.length,s.players[1].hand.length);
 assert.ok(choices.every(a=>a.type==='chooseDiscard'&&s.players[1].hand.some(c=>c.uid===a.uid)));
 assert.equal(choices.some(a=>a.uid===null),false);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,choices[0],{actor:0}),/Wrong player turn/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'forged'},{actor:1}),/not currently legal/);
 const chosen=choices[0].uid;
 const kept=s.players[1].hand.find(c=>c.uid!==chosen).uid;
 s=dispatchUniversalAction(packs,s,choices[0],{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].outside.filter(c=>c.uid===chosen).length,1);
 assert.ok(s.players[1].hand.some(c=>c.uid===kept));
 assert.equal(s.players[1].hand.some(c=>c.uid===chosen),false);
 assert.equal(s.turnEffectZoneMoves[1].handToOutside,true);
 assert.equal(s.turnEffectZoneMoves[0].handToOutside,false);
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('an empty opposing hand resolves the discard without a pending choice',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:1255,first:0});
 const source=take(s,0,'D0');s.players[0].hand.push(source);
 s.players[1].outside.push(...s.players[1].hand.splice(0));
 s=main(s);
 const outside=s.players[1].outside.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[1].outside.length,outside);
 assert.equal(s.players[1].hand.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('opponent discard rejects a second card and non-onPlay timing',()=>{
 const base={id:'Z',name:'Z',color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-count',cards:[{...base,effects:{onPlay:[{op:'discardOppHand',count:2}]}}]}),/invalid opponent hand discard/);
 assert.throws(()=>createUniversalPack({id:'bad-timing',cards:[{...base,effects:{onRetire:[{op:'discardOppHand',count:1}]}}]}),/only an onPlay effect/);
});
