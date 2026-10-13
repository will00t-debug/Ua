import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloEnergy,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
// Official print: UA51BT/SLG-1-017, 018, 019 and official Q2026.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-017
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-018
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-019
const counts={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-009':0,'SLG-1-017':1,'SLG-1-018':1,'SLG-1-019':2};
function match(seed=1719){const s=newSoloTrainingMatch({decks:[counts,counts],seed,first:0});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;}
function pull(p,id){for(const zone of ['hand','deck','life']){const index=p[zone].findIndex(c=>c.cardId==='SLG-1-'+id);if(index>=0)return p[zone].splice(index,1)[0];}throw Error('Missing SLG '+id);}
function hand(s,id){const c=pull(s.players[0],id);s.players[0].hand.push(c);return c;}
function field(s,id,line='energy',slot=0,ready=true){const c=pull(s.players[0],id);Object.assign(c,{owner:0,line,slot,ready});s.players[0][line][slot]=c;return c;}
function doAction(s,predicate){const a=soloTrainingLegalActions(s).find(predicate);assert.ok(a,'expected legal official-card action');return soloTrainingDispatch(s,a);}
test('SLG-1-017 hand energy -2 only when BOTH field lines empty, AP still paid; top look preserves physical card',()=>{
 let s=match(),p=s.players[0],c=hand(s,'017');
 assert.equal(soloEnergy(s,0),0);
 const play=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='energy');
 assert.ok(play,'official empty-field purple2 reduction makes a zero-energy play legal');
 const before=p.ap,top=p.deck[0].uid,deckSize=p.deck.length;
 s=soloTrainingDispatch(s,play);
 assert.equal(s.players[0].ap,before-1);
 assert.equal(s.pending?.kind,'peekTop');
 const legal=soloTrainingLegalActions(s);
 assert.ok(legal.some(a=>a.outsideUid===null));
 assert.ok(legal.some(a=>a.outsideUid===top));
 const kept=soloTrainingDispatch(s,legal.find(a=>a.outsideUid===null));
 assert.equal(kept.players[0].deck[0].uid,top);
 assert.equal(kept.players[0].deck.length,deckSize);
 const milled=soloTrainingDispatch(s,legal.find(a=>a.outsideUid===top));
 assert.equal(milled.players[0].outside.at(-1).uid,top);
 assert.equal(milled.players[0].deck.length,deckSize-1);
 assert.ok(assertSoloTrainingMatch(kept));assert.ok(assertSoloTrainingMatch(milled));
});
test('SLG-1-017 blank field fails once an energy-line card exists with only one generated energy',()=>{
 const s=match(),p=s.players[0],c=hand(s,'017');
 field(s,'015','energy',0);
 assert.equal(soloEnergy(s,0),1);
 assert.ok(!soloTrainingLegalActions(s).some(a=>a.type==='play'&&a.uid===c.uid));
 assert.ok(assertSoloTrainingMatch(s));
});
test('SLG-1-018 look at three, choose up to one Sung or Shadow, bottom remaining in exact order; mandatory hand discard only on take',()=>{
 let s=match(),p=s.players[0],source=hand(s,'018');
 field(s,'006','energy',0);field(s,'006','energy',1); // purple 4 energy
 const eligible=pull(p,'017'),shadow=pull(p,'030'),ineligible=pull(p,'001');
 p.deck.unshift(ineligible,shadow,eligible);
 s=doAction(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.pending?.kind,'slgSearch');const q=s.pending;
 assert.equal(q.topUids.length,3);assert.ok(q.eligible.includes(eligible.uid));assert.ok(q.eligible.includes(shadow.uid));
 assert.ok(!q.eligible.includes(ineligible.uid));
 const originalOutside=s.players[0].outside.length,originalHand=s.players[0].hand.length;
 const picks=soloTrainingLegalActions(s);
 assert.ok(picks.some(a=>a.picks.length===0));
 assert.ok(!picks.some(a=>a.picks.length>1));
 const chosen=picks.find(a=>a.picks.length===1&&a.picks[0]===eligible.uid);
 assert.ok(chosen);s=soloTrainingDispatch(s,chosen);
 assert.equal(s.pending?.kind,'slgDiscard');
 assert.equal(s.players[0].hand.length,originalHand+1);
 assert.ok(s.players[0].hand.some(c=>c.uid===eligible.uid));
 const disc=soloTrainingLegalActions(s).find(a=>a.uid!==eligible.uid);
 assert.ok(disc);s=soloTrainingDispatch(s,disc);
 assert.equal(s.pending,null);assert.equal(s.players[0].hand.length,originalHand);
 assert.equal(s.players[0].outside.length,originalOutside+1);
 assert.ok(assertSoloTrainingMatch(s));
});
test('SLG-1-019 official Q2026 once PER NAME (not per outside physical card), paying real Shadow hand discard',()=>{
 let s=match(),p=s.players[0];
 const first=pull(p,'019'),second=pull(p,'019');p.outside.push(first,second);
 const shadow=hand(s,'030'),handBefore=p.hand.length,outBefore=p.outside.length;
 assert.equal(soloTrainingLegalActions(s).filter(a=>a.type==='abilityOutside').length,2);
 s=doAction(s,a=>a.type==='abilityOutside'&&a.uid===first.uid);
 assert.equal(s.pending?.kind,'slg019Recover');
 s=doAction(s,a=>a.type==='choose'&&a.uid===shadow.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===first.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===second.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===shadow.uid));
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].outside.length,outBefore);
 s.players[0].hand.push(pull(s.players[0],'030'));
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='abilityOutside'&&a.uid===second.uid),false,'Q2026 forbids second same-name activation');
 s.turn++;
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='abilityOutside'&&a.uid===second.uid));
 assert.ok(assertSoloTrainingMatch(s));
});
test('SLG-1-019 optional entry discards Shadow then draws 1, or declines without card movement',()=>{
 let s=match(),p=s.players[0],source=hand(s,'019'),cost=hand(s,'030');
 field(s,'015','energy',0);
 const choose=doAction(s,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.equal(choose.pending?.kind,'slg019Entry');
 const handBefore=choose.players[0].hand.length,outBefore=choose.players[0].outside.length,top=choose.players[0].deck[0].uid;
 assert.ok(soloTrainingLegalActions(choose).some(a=>a.uid===null));
 const decline=doAction(choose,a=>a.uid===null);
 assert.equal(decline.players[0].hand.length,handBefore);
 assert.equal(decline.players[0].outside.length,outBefore);
 const paid=doAction(choose,a=>a.uid===cost.uid);
 assert.equal(paid.pending,null);assert.equal(paid.players[0].hand.length,handBefore);
 assert.ok(paid.players[0].outside.some(c=>c.uid===cost.uid));
 assert.ok(paid.players[0].hand.some(c=>c.uid===top));
 assert.ok(assertSoloTrainingMatch(paid));assert.ok(assertSoloTrainingMatch(decline));
});
