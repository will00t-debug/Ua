import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040','REZ-2-041','REZ-2-042'].includes(id)),
 'REZ-2-017','REZ-2-021','REZ-2-022','REZ-2-038'
],'REZ-2-056');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function ready(){
 let s=fresh(deck,2021);
 s=toPhase(rezPacks,s,'main');
 for(let i=0;i<4;i++)sit(s,0,'REZ-2-014','energy',i);
 return s;
}

test('REZ-2-021 retires BP 5000 or less and buffs an energy-0 Subaru only beside a raided front Rem',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-021'].effectJa,/〈ナツキ・スバル〉と〈レム〉/);
 assert.deepEqual(rez.cards['REZ-2-021'].playRequiresAllNames,['ナツキ・スバル','レム']);
 assert.equal(rez.cards['REZ-2-021'].triggerEffect.op,'retireOppFront');
 let closed=ready();
 const early=take(closed,0,'REZ-2-021');closed.players[0].hand.push(early);
 assert.equal(legalUniversalActions(rezPacks,closed).some(a=>a.uid===early.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,closed,{type:'event',uid:early.uid},{actor:0}),/not currently legal/);
 const plain=ready();
 sit(plain,0,'REZ-2-017','front',0);
 const event=take(plain,0,'REZ-2-021');plain.players[0].hand.push(event);
 const low=sit(plain,1,'REZ-2-055','front',0);
 const high=sit(plain,1,'REZ-2-046','front',1);high.buffs=[{bp:2000,untilTurn:plain.turn}];
 let played=dispatchUniversalAction(rezPacks,plain,legalUniversalActions(rezPacks,plain).find(a=>a.type==='event'&&a.uid===event.uid),{actor:0});
 assert.deepEqual(played.pending.choices,[low.uid]);
 assert.throws(()=>dispatchUniversalAction(rezPacks,played,{type:'chooseRetireBp',uid:high.uid},{actor:0}),/not currently legal/);
 played=dispatchUniversalAction(rezPacks,played,{type:'chooseRetireBp',uid:low.uid},{actor:0});
 assert.equal(played.pending,null);
 const raided=ready();
 const rem=sit(raided,0,'REZ-2-017','front',0);
 rem.stack=[take(raided,0,'REZ-2-049')];
 const zero=sit(raided,0,'REZ-2-022','front',1);
 const heavy=sit(raided,0,'REZ-2-038','front',2);
 const card=take(raided,0,'REZ-2-021');raided.players[0].hand.push(card);
 const foe=sit(raided,1,'REZ-2-055','front',0);
 let buffed=dispatchUniversalAction(rezPacks,raided,legalUniversalActions(rezPacks,raided).find(a=>a.type==='event'&&a.uid===card.uid),{actor:0});
 buffed=dispatchUniversalAction(rezPacks,buffed,{type:'chooseRetireBp',uid:foe.uid},{actor:0});
 assert.equal(buffed.pending.kind,'effect-buff-own');
 assert.ok(buffed.pending.choices.includes(zero.uid));
 assert.equal(buffed.pending.choices.includes(heavy.uid),false);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(buffed),{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,skipped,skipped.players[0].front.find(c=>c.uid===zero.uid)),1500);
 buffed=dispatchUniversalAction(rezPacks,buffed,{type:'chooseOwnBuff',uid:zero.uid},{actor:0});
 assert.equal(universalBp(rezPacks,buffed,buffed.players[0].front.find(c=>c.uid===zero.uid)),3000);
 let aside=fresh(deck,4021);
 aside=toPhase(rezPacks,aside,'main');
 for(let i=1;i<4;i++)sit(aside,0,'REZ-2-014','energy',i);
 const buried=sit(aside,0,'REZ-2-017','energy',0);
 buried.stack=[take(aside,0,'REZ-2-049')];
 const only=take(aside,0,'REZ-2-021');aside.players[0].hand.push(only);
 const victim=sit(aside,1,'REZ-2-055','front',0);
 let quiet=dispatchUniversalAction(rezPacks,aside,legalUniversalActions(rezPacks,aside).find(a=>a.type==='event'&&a.uid===only.uid),{actor:0});
 quiet=dispatchUniversalAction(rezPacks,quiet,{type:'chooseRetireBp',uid:victim.uid},{actor:0});
 assert.equal(quiet.pending,null);
 const empty=ready();
 sit(empty,0,'REZ-2-017','front',0);
 const last=take(empty,0,'REZ-2-021');empty.players[0].hand.push(last);
 const wall=sit(empty,1,'REZ-2-046','front',0);wall.buffs=[{bp:2000,untilTurn:empty.turn}];
 const fizzled=dispatchUniversalAction(rezPacks,empty,legalUniversalActions(rezPacks,empty).find(a=>a.type==='event'&&a.uid===last.uid),{actor:0});
 assert.equal(fizzled.pending,null);
 assert.ok(fizzled.players[0].outside.some(c=>c.uid===last.uid));
 assert.equal(assertUniversalMatch(rezPacks,played),true);
 assert.equal(assertUniversalMatch(rezPacks,buffed),true);
 assert.equal(assertUniversalMatch(rezPacks,quiet),true);
 assert.equal(assertUniversalMatch(rezPacks,fizzled),true);
});
