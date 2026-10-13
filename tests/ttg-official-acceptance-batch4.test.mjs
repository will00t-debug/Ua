import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {greenTtgCurrentBp} from '../dist/ttg-green-passives.mjs';
// Official TTG-1-006 / 007: printed effects, and 008 Q2263
// https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-007
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-008
const counts={...TTG_GREEN_BETA_PRESET,'TTG-1-014':0,'TTG-1-007':4,'TTG-1-016':0,'TTG-1-013':4,'TTG-1-035':0,'TTG-1-008':2};
function game(seed=6708){const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;}
function get(p,id){
 for(const z of ['hand','deck','life','outside']){const i=p[z].findIndex(c=>c.cardId==='TTG-1-'+id);if(i>=0)return p[z].splice(i,1)[0];}
 throw Error('Missing TTG '+id);
}
function put(s,id,line='front',slot=0,owner=0){
 const c=get(s.players[owner],id);c.ready=true;s.players[owner][line][slot]=c;return c;
}
function legal(s,f){const a=legalTtgCoreActions(s).find(f);assert.ok(a,'expected legal TTG action');return a;}
function use(s,f){const a=legal(s,f);return dispatchTtgCoreAction(s,a);}
test('TTG-1-006: 5 -> 6 energy adds +1000 BP on own turn only and updates immediately',()=>{
 let s=game();put(s,'006','front',0);put(s,'017','energy',0);
 s=withTtgDerivedEnergy(s,0);
 const g=s.players[0].energy[0];
 g.energyBonus=(g.energyBonus||0)+(5-calculateTtgEnergyByColor(s,0).green);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,5);
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),3000);
 s.players[0].energy[0].energyBonus++;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,6);
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),4000);
 s.active=1;
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),3000);
 assert.ok(assertTtgCoreState(s));
});
test('TTG-1-007: +1000 BP requires own Darry on either line, including opponent turn; enemy Darry does not count',()=>{
 let s=game(),g=put(s,'007','front',0);
 assert.equal(TTG_BY_ID[g.cardId].trigger,'active');
 assert.equal(greenTtgCurrentBp(s,0,g),1500);
 put(s,'013','energy',0,1);
 assert.equal(greenTtgCurrentBp(s,0,g),1500,'opponent Darry cannot satisfy own trait');
 const d=put(s,'013','energy',0);
 assert.equal(greenTtgCurrentBp(s,0,g),2500);
 s.active=1;
 assert.equal(greenTtgCurrentBp(s,0,g),2500,'007 printed passive has no own-turn condition');
 s.players[0].energy[0]=null;s.players[0].outside.push(d);
 s=withTtgDerivedEnergy(s,0);s=withTtgDerivedEnergy(s,1);
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),1500);
 assert.ok(assertTtgCoreState(s));
});
test('TTG-1-007 from hand: optional second real AP plays one matching Darry from own outside REST, without duplicating it',()=>{
 let s=game(),p=s.players[0],g=get(p,'007'),d=get(p,'013');
 p.hand.push(g);p.outside.push(d);s=withTtgDerivedEnergy(s,0);
 const entry=legal(s,a=>a.type==='play'&&a.handUid===g.uid&&a.line==='front'&&a.slot===0);
 const availableBefore=p.apCards.filter(x=>x.ready).length;
 s=dispatchTtgCoreAction(s,entry);
 assert.equal(s.pending?.kind,'ttgGreenEntry');
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,availableBefore-1);
 const skip=legal(s,a=>a.type==='resolveGreenEntry'&&a.mode==='partnerRecover'&&a.takeUid===undefined);
 const declined=dispatchTtgCoreAction(s,skip);
 assert.ok(declined.players[0].outside.some(c=>c.uid===d.uid));
 assert.equal(declined.players[0].apCards.filter(x=>x.ready).length,availableBefore-1);
 const revive=legal(s,a=>a.mode==='partnerRecover'&&a.takeUid===d.uid&&a.line==='front'&&a.slot===1);
 const paid=dispatchTtgCoreAction(s,revive);
 assert.equal(paid.players[0].front[1].uid,d.uid);
 assert.equal(paid.players[0].front[1].ready,false);
 assert.equal(paid.players[0].apCards.filter(x=>x.ready).length,availableBefore-2);
 assert.ok(!paid.players[0].outside.some(c=>c.uid===d.uid));
 assert.equal(greenTtgCurrentBp(paid,0,paid.players[0].front[0]),2500);
 assert.ok(assertTtgCoreState(paid));assert.ok(assertTtgCoreState(declined));
});
test('TTG-1-008 Q2263 Darry Raid: unblocked draw happens AFTER block choice and BEFORE defending DRAW trigger choice',()=>{
 let s=game(8053),p=s.players[0],op=s.players[1];
 const d=put(s,'013','front',0);
 put(s,'017','energy',0);put(s,'017','energy',1);
 const h=get(p,'008');p.hand.push(h);
 const triggered=get(op,'005'),old=op.life.shift();op.deck.push(old);op.life.unshift(triggered);
 s=withTtgDerivedEnergy(s,0);
 const raid=legal(s,a=>a.type==='green008Raid'&&a.baseUid===d.uid&&a.handUid===h.uid&&a.line==='front');
 s=dispatchTtgCoreAction(s,{...raid,payApUids:[s.players[0].apCards.find(x=>x.ready).uid]});
 assert.equal(s.players[0].front[0].green008UnblockedDraw,true);
 const attacker=s.players[0].front[0].uid;
 s=use(s,a=>a.type==='next');assert.equal(s.phase,'attack');
 s=use(s,a=>a.type==='attack'&&a.uid===attacker);
 const before=s.players[0].hand.length,beforeDef=s.players[1].hand.length;
 assert.equal(s.pending?.kind,'block');
 s=use(s,a=>a.type==='block'&&a.blockUid===null);
 assert.equal(s.players[0].hand.length,before+1,'Darry draw resolves after defender chooses no block');
 assert.equal(s.pendingTtgLife?.trigger,'draw','life trigger check then asks defender under Q99');
 assert.equal(s.players[1].hand.length,beforeDef);
 const skipped=use(s,a=>a.type==='ttgLifeChoice'&&a.mode==='decline');
 assert.equal(skipped.players[1].hand.length,beforeDef);
 assert.ok(assertTtgCoreState(skipped));
});
