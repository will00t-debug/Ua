import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {ttgRed057ImpactNull,expireTtgRed057GrantedNullAtOwnStart,
  legalTtgRedNiaKaminaPlay} from '../dist/ttg-red-sixth-three.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// UA56BT TTG-1-057–059.
// Japanese official 058: cannot play with Kamina on own field or Raid base,
// and prevents any Kamina from entering while own Nia remains.
// 057/059 card copy has been transcribed into repository from user's official card-front PDF.
// 057: IMPACT null itself; when played give another own character IMPACT null until next own start.
// 058: other own Simon / Simon-base character gets BP+1500 instead of ordinary +1000.
// 059: MAIN REST to select own Simon / Simon base for +1000 BP until end of turn.
const counts=Object.fromEntries([
 ...['042','043','045','046','047','048','051','054','055','057','058','059'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const match=seed=>{const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;};
function take(p,id){
 for(const place of ['hand','deck','life','outside']){
  const i=p[place].findIndex(c=>c.cardId===id);if(i>=0)return p[place].splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function stage(s,id,line='front',slot=0){
 const c=take(s.players[0],id);c.ready=true;s.players[0][line][slot]=c;return c;
}
const offered=(s,fn)=>{const a=legalTtgCoreActions(s).find(fn);assert.ok(a,'Expected printed choice '+s.pending?.kind);return a;};
test('057 actual hand entry gives chosen different character Impact Null until NEXT own turn start',()=>{
 let s=match(5701),p=s.players[0];
 const ally=stage(s,'TTG-1-047','front',0),source=take(p,'TTG-1-057');
 p.hand.push(source);const gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=2;
 s=withTtgDerivedEnergy(s,0);
 const playable=offered(s,a=>a.type==='play'&&a.handUid===source.uid&&a.line==='front'&&a.slot===1);
 s=dispatchTtgCoreAction(s,playable);
 assert.equal(s.pending?.kind,'ttgRed057058Entry');
 const choices=legalTtgCoreActions(s);
 assert.ok(choices.some(a=>a.targetUid===null));
 assert.ok(choices.some(a=>a.targetUid===ally.uid));
 assert.ok(!choices.some(a=>a.targetUid===source.uid),'cannot choose itself as OTHER');
 s=dispatchTtgCoreAction(s,choices.find(a=>a.targetUid===ally.uid));
 assert.equal(s.pending,null);
 assert.equal(ttgRed057ImpactNull(s,0,s.players[0].front[0]),true);
 assert.equal(ttgRed057ImpactNull(s,0,s.players[0].front[1]),true,'source always has Impact Null');
 const later=structuredClone(s);later.players[0].turnCount++;
 const expire=expireTtgRed057GrantedNullAtOwnStart(later,0);
 assert.equal(ttgRed057ImpactNull(expire,0,expire.players[0].front[0]),false);
 assert.equal(ttgRed057ImpactNull(expire,0,expire.players[0].front[1]),true);
 assert.ok(assertTtgCoreState(s));
});
test('058 normal hand play chooses Simon +1500, other named ally +1000, or decline',()=>{
 let s=match(5801),p=s.players[0];
 const simon=stage(s,'TTG-1-051','front',0),other=stage(s,'TTG-1-047','front',1);
 const nia=take(p,'TTG-1-058');p.hand.push(nia);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,offered(s,a=>a.type==='play'&&a.handUid===nia.uid&&a.line==='energy'&&a.slot===0));
 assert.equal(s.pending?.kind,'ttgRed057058Entry');
 const offeredChoices=legalTtgCoreActions(s);
 assert.ok(offeredChoices.some(a=>a.targetUid===simon.uid));
 assert.ok(offeredChoices.some(a=>a.targetUid===other.uid));
 assert.ok(offeredChoices.some(a=>a.targetUid===null));
 const buffSimon=dispatchTtgCoreAction(s,offeredChoices.find(a=>a.targetUid===simon.uid));
 assert.equal(buffSimon.players[0].front[0].currentBp,TTG_BY_ID[simon.cardId].bp+1500);
 const buffOther=dispatchTtgCoreAction(s,offeredChoices.find(a=>a.targetUid===other.uid));
 assert.equal(buffOther.players[0].front[1].currentBp,TTG_BY_ID[other.cardId].bp+1000);
 const skip=dispatchTtgCoreAction(s,offeredChoices.find(a=>a.targetUid===null));
 assert.equal(skip.players[0].front[0].currentBp,undefined);
 assert.ok(assertTtgCoreState(buffSimon));assert.ok(assertTtgCoreState(buffOther));assert.ok(assertTtgCoreState(skip));
});
test('058/059 cannot enter with own Kamina even if Kamina is hidden under a Raid-base stack',()=>{
 let s=match(5802),p=s.players[0];
 const raid=stage(s,'TTG-1-043','front',0),kamina=take(p,'TTG-1-045');
 raid.stack=[kamina]; // controlled printed-name RAID-base state
 const niaA=take(p,'TTG-1-058'),niaB=take(p,'TTG-1-059');
 p.hand.push(niaA,niaB);stage(s,'TTG-1-042','energy',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,niaA),false);
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,niaB),false);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='play'&&[niaA.uid,niaB.uid].includes(a.handUid)));
 assert.ok(assertTtgCoreState(s));
});
test('045 Kamina cannot enter with Nia in RAID base (symmetric with Nia restriction)',()=>{
 let s=match(5803),p=s.players[0];
 const raid=stage(s,'TTG-1-043','front',0),nia=take(p,'TTG-1-058');
 raid.stack=[nia]; // controlled RAID base name, not a claim this is legal Raid pair
 const kamina=take(p,'TTG-1-045');p.hand.push(kamina);
 stage(s,'TTG-1-042','energy',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(legalTtgRedNiaKaminaPlay(s,0,kamina),false);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='play'&&a.handUid===kamina.uid));
 assert.ok(assertTtgCoreState(s));
});
test('059 activation REST cost applies +1000 BP to own Simon; no repeat while resting',()=>{
 let s=match(5901),p=s.players[0];
 const simon=stage(s,'TTG-1-051','front',0),gen=stage(s,'TTG-1-051','energy',0); // Nia cannot legally enter with Kamina 042.
 const nia=take(p,'TTG-1-059');p.hand.push(nia);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,offered(s,a=>a.type==='play'&&a.handUid===nia.uid&&a.line==='front'&&a.slot===1));
 assert.equal(s.pending,null);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='activateNia059'&&a.uid===nia.uid));
 // A legal external READY effect (or the player's next turn) makes it usable.
 s.players[0].front[1].ready=true;s=withTtgDerivedEnergy(s,0);
 const a=offered(s,a=>a.type==='activateNia059'&&a.uid===nia.uid&&a.targetUid===simon.uid);
 s=dispatchTtgCoreAction(s,a);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.players[0].front[0].currentBp,TTG_BY_ID[simon.cardId].bp+1000);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='activateNia059'&&a.uid===nia.uid));
 assert.ok(assertTtgCoreState(s));
});
test('058 ACTIVE LIFE Q99 activation vs decline never readies opponent AP',()=>{
 let s=match(5804),p=s.players[0],target=stage(s,'TTG-1-051','front',0);
 target.ready=false;
 const trigger=take(p,'TTG-1-058'),old=p.life.shift();p.deck.push(old);p.life.unshift(trigger);
 s=withTtgDerivedEnergy(s,0);
 const q=beginTtgLifeTrigger(s,{player:0,lifeUid:trigger.uid}),choices=legalTtgCoreActions(q);
 const accepted=dispatchTtgCoreAction(q,choices.find(a=>a.mode==='active'&&a.targetUid===target.uid));
 assert.equal(accepted.players[0].front[0].ready,true);
 assert.equal(accepted.players[0].front[0].currentBp,TTG_BY_ID[target.cardId].bp+3000);
 const declined=dispatchTtgCoreAction(q,choices.find(a=>a.mode==='decline'));
 assert.equal(declined.players[0].front[0].ready,false);
 assert.ok(assertTtgCoreState(accepted));assert.ok(assertTtgCoreState(declined));
});
