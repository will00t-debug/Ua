import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalCardEnergy} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-033','REZ-2-035','REZ-2-038','REZ-2-040','REZ-2-041','REZ-2-043',
 'REZ-2-046','REZ-2-049','REZ-2-050','REZ-2-051','REZ-2-055','REZ-2-056','REZ-2-063'
],'REZ-2-056');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}

test('REZ-2-051 adds green energy at four printed names and keeps its two main actions separate',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-051'].effectJa,/4種類以上/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-051'].effectJa,/6種類以上/);
 assert.equal(rez.cards['REZ-2-051'].passiveBonuses[0].extraEnergy,1);
 assert.equal(rez.cards['REZ-2-051'].mainAbility.op,'characterDualMain');
 let s=fresh(deck,2051);
 s=toPhase(rezPacks,s,'main');
 const lily=sit(s,0,'REZ-2-051','energy',0);
 const twin=sit(s,0,'REZ-2-050','front',0);
 const sylphy=sit(s,0,'REZ-2-041','front',1);
 const otto=sit(s,0,'REZ-2-033','energy',1);
 assert.equal(universalCardEnergy(rezPacks,s,0,lily),1);
 const garf=sit(s,0,'REZ-2-035','energy',2);
 assert.equal(universalCardEnergy(rezPacks,s,0,lily),2);
 s.players[0].energy[0]=null;s.players[0].front[2]=lily;
 assert.equal(universalCardEnergy(rezPacks,s,0,lily),0);
 s.players[0].front[2]=null;s.players[0].energy[0]=lily;
 const extra=sit(s,0,'REZ-2-055','front',3);
 const copy=sit(s,0,'REZ-2-055','energy',3);
 assert.equal(universalCardEnergy(rezPacks,s,0,lily),2);
 assert.equal(extra.cardId,'REZ-2-055');
 assert.equal(copy.cardId,'REZ-2-055');
 assert.equal(twin.cardId,'REZ-2-050');
 assert.equal(sylphy.cardId,'REZ-2-041');
 assert.equal(otto.cardId,'REZ-2-033');
 assert.equal(garf.cardId,'REZ-2-035');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='kindsActive'),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('six green printed names ACTIVE the energy character once, and REST can buff again',()=>{
 let s=fresh(deck,2052);
 s=toPhase(rezPacks,s,'main');
 const lily=sit(s,0,'REZ-2-051','energy',0);
 const names=['REZ-2-033','REZ-2-035','REZ-2-038','REZ-2-040','REZ-2-043'];
 const placed=names.map((id,i)=>sit(s,0,id,i<3?'front':'energy',i<3?i:i-2));
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.uid===lily.uid&&a.mode==='kindsActive'),true);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.uid===lily.uid&&a.mode==='selfRestBuff'),true);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.uid===lily.uid&&a.mode==='selfRestBuff'),{actor:0});
 assert.equal(s.players[0].energy[0].ready,false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:placed[0].uid},{actor:0});
 assert.equal(universalBp(rezPacks,s,s.players[0].front[0]),rez.cards[placed[0].cardId].bp+500);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.uid===lily.uid&&a.mode==='kindsActive'));
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.uid===lily.uid&&a.mode==='kindsActive'),{actor:0});
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.mode==='kindsActive'),false);
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.uid===lily.uid&&a.mode==='selfRestBuff'));
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s).find(a=>a.uid===lily.uid&&a.mode==='selfRestBuff'),{actor:0});
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
