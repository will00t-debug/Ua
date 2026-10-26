import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-053'],'REZ-2-055');

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

test('REZ-2-053 cannot enter the front and discards then draws only after Subaru enters',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-053'].effectJa,/フロントLに〔登場・移動〕できない/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-053'].effectJa,/〈ナツキ・スバル〉が登場/);
 assert.equal(rez.cards['REZ-2-053'].frontForbidden,true);
 assert.equal(rez.cards['REZ-2-053'].mainAbility.op,'onceDiscardDrawIfEntered');
 let s=fresh(deck,2053);
 s=toPhase(rezPacks,s,'main');
 const rem=sit(s,0,'REZ-2-053','energy',0);
 sit(s,0,'REZ-2-055','energy',1);
 sit(s,0,'REZ-2-055','energy',2);
 sit(s,0,'REZ-2-014','front',0);
 const handRem=take(s,0,'REZ-2-053');s.players[0].hand.push(handRem);
 const plays=legalUniversalActions(rezPacks,s).filter(a=>a.uid===handRem.uid&&a.type==='play');
 assert.ok(plays.length);
 assert.equal(plays.some(a=>a.line==='front'),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'play',uid:handRem.uid,line:'front',slot:1},{actor:0}),/not currently legal/);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='enteredDiscardDraw'),false);
 let moved=fresh(deck,3053);
 moved=advance(rezPacks,moved,1);
 const waiting=sit(moved,0,'REZ-2-014','energy',0);
 sit(moved,0,'REZ-2-053','energy',1);
 const shift=legalUniversalActions(rezPacks,moved).find(a=>a.type==='move'&&a.uid===waiting.uid);
 moved=dispatchUniversalAction(rezPacks,moved,shift,{actor:0});
 moved=advance(rezPacks,moved,1);
 assert.equal(moved.phase,'main');
 assert.equal(legalUniversalActions(rezPacks,moved).some(a=>a.mode==='enteredDiscardDraw'),false);
 const subaru=take(s,0,'REZ-2-014');s.players[0].hand.push(subaru);
 const top=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===subaru.uid),{actor:0});
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===rem.uid&&a.mode==='enteredDiscardDraw');
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending.kind,'effect-discard');
 const discarded=s.players[0].hand[0];
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscard',uid:discarded.uid},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===top));
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='enteredDiscardDraw'),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,moved),true);
});
