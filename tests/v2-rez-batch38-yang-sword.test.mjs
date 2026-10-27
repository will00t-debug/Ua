import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-063','REZ-2-072'
],'REZ-2-056');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function board(raised){
 let s=fresh(deck,2072+raised);
 s=toPhase(rezPacks,s,'main');
 const pris=sit(s,0,'REZ-2-063','front',0);
 const energy=[];
 for(let i=0;i<4;i++)energy.push(sit(s,0,'REZ-2-055','energy',i));
 for(let i=0;i<raised;i++)energy[i].buffs=[{bp:500,untilTurn:s.turn}];
 const event=take(s,0,'REZ-2-072');s.players[0].hand.push(event);
 const low=sit(s,1,'REZ-2-014','front',0);
 return {s,pris,event,low};
}

test('REZ-2-072 needs Priscilla, retires BP 5000 or less, and buffs only after four raised characters',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-072'].effectJa,/〈プリシラ・バーリエル〉/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-072'].effectJa,/4枚以上/);
 assert.equal(rez.cards['REZ-2-072'].playRequiresOwnName,'プリシラ・バーリエル');
 let locked=fresh(deck,2072);
 locked=toPhase(rezPacks,locked,'main');
 for(let i=0;i<4;i++)sit(locked,0,'REZ-2-055','energy',i);
 const denied=take(locked,0,'REZ-2-072');locked.players[0].hand.push(denied);
 assert.equal(legalUniversalActions(rezPacks,locked).some(a=>a.uid===denied.uid),false);
 const few=board(3);
 let short=dispatchUniversalAction(rezPacks,few.s,legalUniversalActions(rezPacks,few.s).find(a=>a.uid===few.event.uid),{actor:0});
 short=dispatchUniversalAction(rezPacks,short,{type:'chooseRetireBp',uid:few.low.uid},{actor:0});
 assert.equal(short.pending,null);
 const many=board(4);
 const high=sit(many.s,1,'REZ-2-046','front',1);high.buffs=[{bp:2000,untilTurn:many.s.turn}];
 let played=dispatchUniversalAction(rezPacks,many.s,legalUniversalActions(rezPacks,many.s).find(a=>a.uid===many.event.uid),{actor:0});
 assert.deepEqual(played.pending.choices,[many.low.uid]);
 played=dispatchUniversalAction(rezPacks,played,{type:'chooseRetireBp',uid:many.low.uid},{actor:0});
 assert.equal(played.pending.kind,'effect-buff-own');
 const before=universalBp(rezPacks,played,played.players[0].front[0]);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(played),{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,skipped,skipped.players[0].front[0]),before);
 played=dispatchUniversalAction(rezPacks,played,{type:'chooseOwnBuff',uid:many.pris.uid},{actor:0});
 assert.equal(universalBp(rezPacks,played,played.players[0].front[0]),before+1000);
 assert.equal(assertUniversalMatch(rezPacks,short),true);
 assert.equal(assertUniversalMatch(rezPacks,played),true);
 assert.equal(assertUniversalMatch(rezPacks,skipped),true);
});
