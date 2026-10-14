import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {greenTtgNeedsEnergy} from '../dist/ttg-green-passives.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';

// Japanese official printed cards: UA56BT/TTG-1-018, 019, 020.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-018
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-019
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-020
// Every test exercises physical 50-card state. It does not certify all cross-card interactions.
const preset={...TTG_GREEN_BETA_PRESET,'TTG-1-014':0,'TTG-1-020':4};
const game=seed=>{const s=newTtgCoreMatch({decks:[preset,preset],seed,first:0});s.phase='main';return s;};
const take=(pl,id)=>{
 for(const zone of ['hand','deck','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw new Error('Missing physical '+id);
};
function stage(s,id,line='energy',slot=0,player=0){
 const card=take(s.players[player],id);
 card.ready=true;s.players[player][line][slot]=card;
 return card;
}
const generated=(s,p=0)=>calculateTtgEnergyByColor(s,p).green;

test('TTG-1-018 official MAIN: physical REST adds one green; source retires on actual Main end and keeps 50 UIDs',()=>{
 let s=game(1801);
 const buta=stage(s,'TTG-1-018');
 s=withTtgDerivedEnergy(s,0);
 assert.equal(generated(s),1);
 const activate=legalTtgCoreActions(s).find(a=>a.type==='ttgGreen018'&&a.uid===buta.uid);
 assert.ok(activate,'018 needs a human-clickable main-phase action');
 s=dispatchTtgCoreAction(s,activate);
 assert.equal(s.players[0].energy[0].ready,false,'physical REST cost');
 assert.equal(s.players[0].energy[0].greenRetireAtMainEndTurn,s.turn);
 assert.equal(generated(s),2);
 assert.ok(assertTtgCoreState(s));
 // Making it ACTIVE again must not let the same card reuse Turn 1.
 s.players[0].energy[0].ready=true;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(legalTtgCoreActions(s).filter(a=>a.type==='ttgGreen018'&&a.uid===buta.uid).length,0);
 assert.throws(()=>dispatchTtgCoreAction(s,activate),/Illegal/);
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===buta.uid));
 assert.equal(generated(s),0,'retirement removes +1 and base 1 immediately');
 assert.ok(assertTtgCoreState(s));
});

test('TTG-1-018 front activation grants no front-line production; scheduled retirement still occurs',()=>{
 let s=game(1802),card=stage(s,'TTG-1-018','front');
 s=withTtgDerivedEnergy(s,0);
 const original=generated(s);
 assert.equal(original,0);
 s=dispatchTtgCoreAction(s,legalTtgCoreActions(s).find(a=>a.type==='ttgGreen018'&&a.uid===card.uid));
 assert.equal(generated(s),0,'boosting energy does not make an ordinary front character generate energy');
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.players[0].front[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===card.uid));
 assert.ok(assertTtgCoreState(s));
});

test('TTG-1-019 continuously updates +1 GREEN only while ACTIVE and actually generating energy',()=>{
 let s=game(1901),yoko=stage(s,'TTG-1-019');
 s=withTtgDerivedEnergy(s,0);
 assert.equal(TTG_BY_ID[yoko.cardId].energy,2);
 assert.equal(generated(s),2);
 s.players[0].energy[0].ready=false;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(generated(s),1,'REST loses extra energy, not printed base');
 s.players[0].energy[0].ready=true;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(generated(s),2,'re-ACTIVE restores passive immediately');
 s.phase='move';
 const movement=legalTtgCoreActions(s).find(a=>a.type==='move'&&a.uid===yoko.uid&&a.slot===0);
 assert.ok(movement);
 s=dispatchTtgCoreAction(s,movement);
 assert.equal(s.players[0].front[0].uid,yoko.uid);
 assert.equal(generated(s),0,'an ACTIVE front character normally does not generate');
 s.players[0].front[0].frontGenerates=true; // Other effect grants front-line production.
 s=withTtgDerivedEnergy(s,0);
 assert.equal(generated(s),2,'both printed and ACTIVE bonus apply when front generates');
 s.players[0].front[0].ready=false;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(generated(s),1);
 assert.ok(assertTtgCoreState(s));
});

test('TTG-1-020 empty own field: zero energy hand play is legal but still pays AP1; enemy field does not prevent discount',()=>{
 let s=game(2001),pl=s.players[0];
 const yoko=take(pl,'TTG-1-020');pl.hand.push(yoko);
 const enemy=stage(s,'TTG-1-005','front',0,1);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(generated(s),0);
 assert.equal(greenTtgNeedsEnergy(s,0,yoko),0);
 const action=legalTtgCoreActions(s).find(a=>a.type==='play'&&a.handUid===yoko.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);
 s=dispatchTtgCoreAction(s,action);
 assert.equal(s.players[0].front[0].uid,yoko.uid);
 assert.equal(s.players[0].apCards[0].ready,false,'energy discount must never waive AP cost');
 assert.equal(s.players[1].front[0].uid,enemy.uid,'opponent unchanged');
 assert.ok(assertTtgCoreState(s));
 const second=take(s.players[0],'TTG-1-020');
 s.players[0].hand.push(second);
 s.players[0].apCards[1].ready=true;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(greenTtgNeedsEnergy(s,0,second),2,'after first entry the field is no longer empty');
 assert.equal(generated(s),0);
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='play'&&a.handUid===second.uid),false);
 assert.ok(assertTtgCoreState(s));
});

test('TTG-1-020 STEP: optional move in MOVE phase only, preserves REST state, rejects occupied destination',()=>{
 let s=game(2002),yoko=stage(s,'TTG-1-020','front',0);
 yoko.ready=false;
 stage(s,'TTG-1-005','energy',0);
 s=withTtgDerivedEnergy(s,0);
 s.phase='move';
 const options=legalTtgCoreActions(s).filter(a=>a.type==='ttgGreen020Step'&&a.uid===yoko.uid);
 assert.deepEqual(options.map(a=>a.slot),[1,2,3]);
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'ttgGreen020Step',player:0,uid:yoko.uid,slot:0}),/Illegal/);
 s=dispatchTtgCoreAction(s,options.find(a=>a.slot===2));
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy[2].uid,yoko.uid);
 assert.equal(s.players[0].energy[2].ready,false,'STEP is not an automatic ACTIVE');
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='ttgGreen020Step'&&a.uid===yoko.uid),false);
 assert.ok(assertTtgCoreState(s));
});

test('TTG-1-020 ACTIVE life trigger is optional, selects OWN character, gives +3000 BP and is public',()=>{
 let s=game(2003),pl=s.players[0];
 const own=stage(s,'TTG-1-005','front',0);
 own.ready=false;
 const lifeCard=take(pl,'TTG-1-020');
 pl.life.unshift(lifeCard);
 s=withTtgDerivedEnergy(s,0);
 const revealed=beginTtgLifeTrigger(s,{player:0,lifeUid:lifeCard.uid});
 const legal=legalTtgCoreActions(revealed);
 assert.ok(legal.some(a=>a.mode==='decline'));
 const activate=legal.find(a=>a.mode==='active'&&a.targetUid===own.uid);
 assert.ok(activate);
 assert.ok(!legal.some(a=>a.mode==='active'&&a.targetUid===revealed.players[1].front[0]?.uid));
 assert.equal(revealed.publicLifeReveals.at(-1).cardId,'TTG-1-020');
 const decline=dispatchTtgCoreAction(revealed,legal.find(a=>a.mode==='decline'));
 assert.equal(decline.players[0].front[0].ready,false);
 assert.equal(decline.publicLifeReveals.at(-1).outcome,'declined');
 assert.ok(assertTtgCoreState(decline));
 const accepted=dispatchTtgCoreAction(revealed,activate);
 assert.equal(accepted.players[0].front[0].ready,true);
 assert.equal(accepted.players[0].front[0].currentBp,TTG_BY_ID[own.cardId].bp+3000);
 assert.equal(accepted.publicLifeReveals.at(-1).outcome,'activated');
 assert.ok(accepted.players[0].outside.some(c=>c.uid===lifeCard.uid),'revealed card remains outside');
 assert.ok(assertTtgCoreState(accepted));
});
