import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalAttackDamage,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-065','REZ-2-063','REZ-2-049','REZ-2-055','REZ-2-043','REZ-2-041',
 'REZ-2-056','REZ-2-014','REZ-2-033','REZ-2-035','REZ-2-046','REZ-2-050','REZ-2-040'
],'REZ-2-055');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy].find(c=>c?.uid===uid);
}

test('REZ-2-065 raids Priscilla, gains own-turn BP, and draws on attack',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-065'].effectJa,/\[レイド\]〈プリシラ・バーリエル〉/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-065'].effectJa,/\[自分のターン中\]このキャラはBP\+1000/);
 assert.equal(rez.cards['REZ-2-065'].raidName,'プリシラ・バーリエル');
 assert.equal(rez.cards['REZ-2-065'].ownTurnBp,1000);
 assert.equal(rez.cards['REZ-2-065'].printedImpact,0);
 let s=fresh(deck,2065);
 const base=sit(s,0,'REZ-2-063','front',0);
 sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-055','energy',1);
 sit(s,0,'REZ-2-043','energy',2);
 sit(s,0,'REZ-2-041','energy',3);
 const rider=take(s,0,'REZ-2-065');s.players[0].hand.push(rider);
 s=toPhase(rezPacks,s,'main');
 const raid=legalUniversalActions(rezPacks,s).find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(rezPacks,s,raid,{actor:0});
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'REZ-2-065');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(universalBp(rez,s,top),5000);
 const opponent=structuredClone(s);opponent.active=1;
 assert.equal(universalBp(rez,opponent,opponent.players[0].front[0]),4000);
 const before=s.players[0].hand.length;
 s=toPhase(rezPacks,s,'attack');
 const attacker=s.players[0].front[0];
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('Q2425 stacks Damage 2 at three above-printed characters and Impact 1 at five',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-065'].note,/Q2425/);
 let few=fresh(deck,3065);
 const pris=sit(few,0,'REZ-2-065','front',0);
 const a=sit(few,0,'REZ-2-056','front',1);
 const b=sit(few,0,'REZ-2-043','front',2);
 few=toPhase(rezPacks,few,'main');
 for(const uid of [a.uid,b.uid])live(few,uid).buffs=[{bp:500,untilTurn:few.turn}];
 const act=legalUniversalActions(rezPacks,few).find(x=>x.type==='activate'&&x.uid===pris.uid);
 assert.equal(act.mode,'abovePrinted');
 few=dispatchUniversalAction(rezPacks,few,act,{actor:0});
 const granted=live(few,pris.uid);
 assert.equal(universalAttackDamage(rez,few,granted),2);
 assert.equal(universalImpact(rez,few,granted),0);
 assert.equal(legalUniversalActions(rezPacks,few).some(x=>x.type==='activate'&&x.uid===pris.uid),false);
 let many=fresh(deck,4065);
 const self=sit(many,0,'REZ-2-065','energy',0);
 const ids=['REZ-2-056','REZ-2-043','REZ-2-055','REZ-2-041'];
 const extras=ids.map((id,i)=>sit(many,0,id,'front',i));
 many=toPhase(rezPacks,many,'main');
 for(const c of extras)live(many,c.uid).buffs=[{bp:500,untilTurn:many.turn}];
 many=dispatchUniversalAction(rezPacks,many,legalUniversalActions(rezPacks,many)
  .find(x=>x.type==='activate'&&x.uid===self.uid),{actor:0});
 const both=live(many,self.uid);
 assert.equal(universalAttackDamage(rez,many,both),2);
 assert.equal(universalImpact(rez,many,both),1);
 let lone=fresh(deck,5065);
 const only=sit(lone,0,'REZ-2-065','front',0);
 lone=toPhase(rezPacks,lone,'main');
 lone=dispatchUniversalAction(rezPacks,lone,legalUniversalActions(rezPacks,lone)
  .find(x=>x.type==='activate'&&x.uid===only.uid),{actor:0});
 const plain=live(lone,only.uid);
 assert.equal(plain.attackDamageGranted,undefined);
 assert.equal(universalImpact(rez,lone,plain),0);
 assert.equal(assertUniversalMatch(rezPacks,few),true);
 assert.equal(assertUniversalMatch(rezPacks,many),true);
 assert.equal(assertUniversalMatch(rezPacks,lone),true);
});
