import test from 'node:test';
import assert from 'node:assert/strict';
import {createTtgV2Pack,TTG_V2_ADDITION_IDS} from '../dist/universal-v2/ttg-pack.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const ttg=createTtgV2Pack(),slg=createSlgV2Pack(),packs=[ttg,slg];
const ttgDeck=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
const slgDeck=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-038']=2;
const fresh=()=>newUniversalMatch(packs,{decks:[ttgDeck,slgDeck],seed:56,first:0});
function take(s,player,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('No fixture: '+id);
}
function main(s){
 while(s.phase!=='main'){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 return s;
}
test('TTG additive pack preserves all 20 original V2 pilots; 3 supported additions and real 50-card mixed-title deck',()=>{
 const old=verifiedPilotPack('gurren-lagann');
 assert.deepEqual(TTG_V2_ADDITION_IDS,['TTG-1-005','TTG-1-014','TTG-1-019']);
 assert.equal(Object.keys(old.cards).length,20);
 assert.equal(Object.keys(ttg.cards).length,23);
 for(const [id,c] of Object.entries(old.cards))assert.deepEqual(ttg.cards[id].effects,c.effects);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
 assert.equal(ttg.cards['TTG-1-005'].impactNull,true);
 assert.equal(ttg.cards['TTG-1-005'].trigger,'draw');
 assert.equal(ttg.cards['TTG-1-014'].effects.onPlay[0].op,'bounceOwnOtherUnderEnergy');
 assert.ok(!ttg.cards['TTG-1-074'],'complex unported TTG Raid must fail closed');
});
test('TTG-1-014 ordinary onPlay spends AP, offers only eligible own bounce UID, and rejects forged choice',()=>{
 let s=fresh(),energy=take(s,0,'TTG-1-005'),source=take(s,0,'TTG-1-014');
 energy.ready=true;s.players[0].energy[0]=energy;s.players[0].hand.push(source);
 s=main(s);
 const beforeAp=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,beforeAp-1);
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseOwnBounce',uid:energy.uid}]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:'0-forged'}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:energy.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===energy.uid));
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('TTG-1-019 ACTIVE generates an extra GREEN energy only until REST, retaining physical-card conservation',()=>{
 const s=fresh(),c=take(s,0,'TTG-1-019');s.players[0].energy[0]=c;c.ready=true;
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 c.ready=false;assert.equal(universalEnergyByColor(packs,s,0).green,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
