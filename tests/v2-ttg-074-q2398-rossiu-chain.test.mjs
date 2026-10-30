import test from 'node:test';
import assert from 'node:assert/strict';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

// Official UA56BT Q2398 (2026-10-09): TTG-1-074 may chain-raid a raided
// グレン whose buried base is TTG-1-070 ロシウ. The printed Raid name remains
// シモン; 070 independently hosts グレン / グレンラガン while no カミナ is present.
const ttg=createTtgV2Pack();
const deck={
 'TTG-1-074':2,'TTG-1-072':4,'TTG-1-070':4,'TTG-1-058':4,
 'TTG-1-042':4,'TTG-1-043':4,'TTG-1-051':4,'TTG-1-064':4,
 'TTG-1-065':4,'TTG-1-066':4,'TTG-1-063':4,'TTG-1-053':4,'TTG-1-049':4
};
assert.equal(Object.values(deck).reduce((n,c)=>n+c,0),50);
assert.deepEqual(validateUniversalDeck(ttg,deck),[]);

function take(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function stage(s,id,line,slot,ready=true){
 const c=take(s,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=c;return c;
}
function hold(s,id){
 const c=take(s,id);s.players[0].hand.push(c);return c;
}
function nest(top,base){
 base.stack=[];base.under=[];base.ready=false;
 top.stack=[base];top.under=[];top.ready=true;
 top.raidBaseUid=base.uid;
 return top;
}
function next(s,action){
 const before=structuredClone(s);
 const after=dispatchUniversalAction(ttg,s,action,{actor:0});
 assert.deepEqual(s,before,'reducer must not mutate the input state');
 assert.equal(assertUniversalMatch(ttg,after),true);
 return after;
}
function legal(s,predicate){
 const action=legalUniversalActions(ttg,s).find(predicate);
 assert.ok(action,JSON.stringify({phase:s.phase,pending:s.pending?.kind,
  types:legalUniversalActions(ttg,s).map(a=>a.type)}));
 return action;
}
function main(s){
 for(let i=0;i<5&&s.phase!=='main';i++)s=next(s,legal(s,a=>a.type==='next'));
 assert.equal(s.phase,'main');return s;
}
function fuel(s){
 for(let i=0;i<4;i++)stage(s,'TTG-1-063','energy',i,true);
}
function fresh(seed){
 return newUniversalMatch([ttg,ttg],{decks:[deck,deck],first:0,seed});
}

test('Q2398 TTG-074 chains onto Gurren whose buried base is Rossiu',()=>{
 let s=fresh(23981);fuel(s);
 stage(s,'TTG-1-058','front',1,true);
 const rossiu=take(s,'TTG-1-070');
 rossiu.ready=false;rossiu.fieldEntryStamp=s.nextFieldEntryStamp++;
 const gurren=take(s,'TTG-1-072');
 gurren.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=nest(gurren,rossiu);
 const yoko=take(s,'TTG-1-064');
 yoko.ready=false;yoko.fieldEntryStamp=s.nextFieldEntryStamp++;
 const other=take(s,'TTG-1-072');
 other.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[2]=nest(other,yoko);
 const simon=stage(s,'TTG-1-051','front',3,true);
 const card=hold(s,'TTG-1-074');
 s=main(s);
 const raids=legalUniversalActions(ttg,s).filter(a=>a.type==='raid'&&a.uid===card.uid);
 assert.ok(raids.some(a=>a.baseUid===gurren.uid),'Q2398 answer is yes');
 assert.ok(raids.some(a=>a.baseUid===simon.uid),'printed Simon base stays legal');
 assert.equal(raids.some(a=>a.baseUid===other.uid),false,
  'a Gurren on Yoko is not a 074 chain');
 s=next(s,legal(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===gurren.uid));
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'TTG-1-074');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'TTG-1-070');
 assert.equal(top.stack[0].uid,rossiu.uid);
 assert.equal(top.raidBaseUid,rossiu.uid);
 assert.equal(top.stack[0].under[0].cardId,'TTG-1-072');
 assert.equal(top.stack[0].under[0].faceDown,true);
 assert.equal(assertUniversalMatch(ttg,s),true);
});

test('Q2398 the Rossiu host closes when an own Kamina is on the field',()=>{
 let s=fresh(23982);fuel(s);
 stage(s,'TTG-1-058','front',1,true);
 stage(s,'TTG-1-042','front',2,true);
 const rossiu=take(s,'TTG-1-070');
 rossiu.ready=false;rossiu.fieldEntryStamp=s.nextFieldEntryStamp++;
 const gurren=take(s,'TTG-1-072');
 gurren.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=nest(gurren,rossiu);
 const card=hold(s,'TTG-1-074');
 s=main(s);
 assert.equal(legalUniversalActions(ttg,s).some(a=>
  a.type==='raid'&&a.uid===card.uid&&a.baseUid===gurren.uid),false);
});
