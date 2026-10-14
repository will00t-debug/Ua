import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET,ttgExecutableActions} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalGreenSitePlays,resolveGreenSitePlay} from '../dist/ttg-green-fields.mjs';
import {greenTtgNeedsEnergy,greenTtgCanAttackOrBlock} from '../dist/ttg-green-passives.mjs';
// Japanese official individual printed cards:
// 024 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-024
// 025 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-025 ; FAQ Q2272
// 026 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-026
const counts={...TTG_GREEN_BETA_PRESET,'TTG-1-003':0,'TTG-1-010':0,'TTG-1-014':0,
 'TTG-1-015':0,'TTG-1-018':0,'TTG-1-035':0,
 'TTG-1-024':4,'TTG-1-025':4,'TTG-1-026':4,'TTG-1-033':4,'TTG-1-034':2,'TTG-1-029':4};
const game=seed=>{
 const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
};
const take=(pl,id)=>{
 for(const z of ['hand','deck','life','outside']){
  const i=pl[z].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[z].splice(i,1)[0];
 }throw Error('Missing physical '+id);
};
const put=(s,id,line='energy',slot=0,player=0)=>{
 const c=take(s.players[player],id);c.ready=true;
 s.players[player][line][slot]=c;return c;
};
const offered=(s,predicate)=>{
 const a=legalTtgCoreActions(s).find(predicate);
 assert.ok(a,'Expected printed legal action');return a;
};
const energy=s=>calculateTtgEnergyByColor(s,0).green;
test('024: one Reite in energy allows an actual 033 field AP1 hand play at one GREEN',()=>{
 let s=game(2401),p=s.players[0],reite=put(s,'TTG-1-024','energy',0);
 const field=take(p,'TTG-1-033');p.hand.push(field);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),1);
 assert.equal(greenTtgNeedsEnergy(s,0,field),1);
 assert.ok(legalGreenSitePlays(s,0).some(a=>a.handUid===field.uid),'the same live hand discount must be used by field deployment');
 const a=offered(s,a=>a.type==='ttgGreenSitePlay'&&a.handUid===field.uid&&a.slot===1);
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.players[0].energy[1].uid,field.uid);
 assert.equal(s.players[0].apCards[0].ready,false);
 assert.equal(s.players[0].energy[0].uid,reite.uid);
 assert.ok(assertTtgCoreState(s));
});
test('024: multiple Reites reduce 034 conditional printed need, removal removes discount immediately',()=>{
 let s=game(2402),p=s.players[0],a=put(s,'TTG-1-024','energy',0),b=put(s,'TTG-1-024','energy',1);
 const generator=put(s,'TTG-1-005','energy',2);
 const field=take(p,'TTG-1-034');p.hand.push(field);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),3);
 assert.ok(legalGreenSitePlays(s,0).some(x=>x.handUid===field.uid));
 s.players[0].outside.push(s.players[0].energy[1]);s.players[0].energy[1]=null;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),2);
 assert.equal(legalGreenSitePlays(s,0).some(x=>x.handUid===field.uid),false,'only one discount leaves 034 at 4');
 // With a field on our board the printed 034 requirement changes from 5 to 8 before reductions.
 const boardSite=take(s.players[0],'TTG-1-033');
 s.players[0].energy[1]=boardSite;boardSite.ready=false;
 generator.energyBonus=3;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),7);
 assert.equal(legalGreenSitePlays(s,0).some(x=>x.handUid===field.uid),true,'8 printed - 1 Reite = 7');
 assert.ok(assertTtgCoreState(s));
});
test('024: +1 generated GREEN appears/disappears with live own Gunmen, even when it rests',()=>{
 let s=game(2403);const reite=put(s,'TTG-1-024','energy',0);
 s=withTtgDerivedEnergy(s,0);assert.equal(energy(s),1);
 const other=put(s,'TTG-1-029','front',0);
 s=withTtgDerivedEnergy(s,0);assert.equal(energy(s),2);
 reite.ready=false;s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),2,'Reite Gunmen bonus has no ACTIVE condition');
 s.players[0].outside.push(other);s.players[0].front[0]=null;
 s=withTtgDerivedEnergy(s,0);assert.equal(energy(s),1);
 assert.ok(assertTtgCoreState(s));
});
test('025 Q2272: no Simon target refuses paid cost; with own Simon source is REST retired, AP selected readied',()=>{
 let s=game(2501),p=s.players[0];
 const lord=put(s,'TTG-1-025','front',0);
 const enemySimon=put(s,'TTG-1-009','front',0,1);
 const gen=put(s,'TTG-1-017','energy',0);gen.energyBonus=4;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),6);
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='green025Lordgenome'),false);
 const before=JSON.stringify(s);
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'green025Lordgenome',player:0,uid:lord.uid,targetUid:enemySimon.uid,apUid:p.apCards[1].uid}),/Illegal/);
 assert.equal(JSON.stringify(s),before);
 const simon=put(s,'TTG-1-009','energy',1);
 s.players[0].apCards[1].ready=false;
 s=withTtgDerivedEnergy(s,0);
 const a=offered(s,x=>x.type==='green025Lordgenome'&&x.uid===lord.uid&&x.targetUid===simon.uid&&x.apUid===s.players[0].apCards[1].uid);
 const next=dispatchTtgCoreAction(s,a);
 assert.equal(next.players[0].front[0],null);
 assert.ok(next.players[0].outside.some(c=>c.uid===lord.uid&&!c.ready));
 assert.equal(next.players[0].apCards[1].ready,true);
 assert.equal(next.players[0].energy[1].energyBonus,3);
 assert.ok(assertTtgCoreState(next));
});
test('025 cannot attack or block with own energy 5, becomes legal immediately at 6',()=>{
 let s=game(2502),l=put(s,'TTG-1-025','front',0);
 const g=put(s,'TTG-1-017','energy',0);
 g.energyBonus=3;s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),5);
 assert.equal(greenTtgCanAttackOrBlock(s,0,l),false);
 g.energyBonus++;s=withTtgDerivedEnergy(s,0);
 assert.equal(energy(s),6);
 assert.equal(greenTtgCanAttackOrBlock(s,0,l),true);
 assert.ok(assertTtgCoreState(s));
});
test('026: official outside branch can decline with ZERO Ark; no deck inspection or order changes',()=>{
 let s=game(2601),p=s.players[0],source=put(s,'TTG-1-026','energy',0);
 const ark=take(p,'TTG-1-033');p.outside.push(ark);
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:source.uid};
 s=withTtgDerivedEnergy(s,0);
 const options=ttgExecutableActions(s);
 assert.ok(options.some(a=>a.mode==='arkOutside'&&a.takeUid===null));
 assert.ok(options.some(a=>a.mode==='arkOutside'&&a.takeUid===ark.uid));
 const originalDeck=s.players[0].deck.map(c=>c.uid),hand=p.hand.map(c=>c.uid);
 const declined=dispatchTtgCoreAction(s,offered(s,a=>a.mode==='arkOutside'&&a.takeUid===null));
 assert.deepEqual(declined.players[0].deck.map(c=>c.uid),originalDeck);
 assert.deepEqual(declined.players[0].hand.map(c=>c.uid),hand);
 assert.ok(assertTtgCoreState(declined));
 const recovered=dispatchTtgCoreAction(s,offered(s,a=>a.mode==='arkOutside'&&a.takeUid===ark.uid));
 assert.deepEqual(recovered.players[0].deck.map(c=>c.uid),originalDeck);
 assert.ok(recovered.players[0].hand.some(c=>c.uid===ark.uid));
 assert.ok(!recovered.players[0].outside.some(c=>c.uid===ark.uid));
 assert.ok(assertTtgCoreState(recovered));
});
test('026: top seven search finds only Ark-Gurren, selected result is publicly revealed, no other looked-at UIDs',()=>{
 let s=game(2602),p=s.players[0],source=put(s,'TTG-1-026','energy',0);
 const ark=take(p,'TTG-1-033'),non=take(p,'TTG-1-005');
 p.deck.unshift(non,ark);
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:source.uid};
 s=withTtgDerivedEnergy(s,0);
 const search=offered(s,a=>a.type==='resolveGreenEntry'&&a.mode==='arkChoice'&&a.takeUid===ark.uid);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.mode==='arkChoice'&&a.takeUid===non.uid));
 const order=s.players[0].deck.slice(0,7).filter(c=>c.uid!==ark.uid).map(c=>c.uid).reverse();
 const resolved=dispatchTtgCoreAction(s,{...search,bottomOrderUids:order});
 assert.deepEqual(resolved.players[0].deck.slice(-order.length).map(c=>c.uid),order);
 assert.ok(resolved.players[0].hand.some(c=>c.uid===ark.uid));
 assert.equal(resolved.log.filter(x=>x.type==='ttgPublicSearchReveal').length,1);
 assert.equal(resolved.log.find(x=>x.type==='ttgPublicSearchReveal').cardId,'TTG-1-033');
 assert.equal(resolved.log.some(x=>Object.values(x).includes(non.uid)),false);
 assert.ok(assertTtgCoreState(resolved));
});
