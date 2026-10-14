import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {redRaidPassive} from '../dist/ttg-red-eleventh-three.mjs';
import {inspectFacedownUnder} from '../dist/ttg-rules.mjs';
// Japan official printed UA56BT/TTG-1-072/073/074, Q2298/Q2299.
const deck=Object.fromEntries([...['042','043','045','046','047','051','059','064','070','072','073'].map(n=>['TTG-1-'+n,4]),['TTG-1-074',2],['TTG-1-036',2],['TTG-1-038',2]]);
function game(seed){const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s}
function take(p,id){for(const z of ['hand','deck','life','outside']){const i=p[z].findIndex(c=>c.cardId===id);if(i>=0)return p[z].splice(i,1)[0]}throw Error('Missing '+id)}
function stage(s,id,line='front',slot=0,p=0){const c=take(s.players[p],id);c.ready=true;s.players[p][line][slot]=c;return c}
const legal=(s,fn)=>{const a=legalTtgCoreActions(s).find(fn);assert.ok(a,'Required official choice');return a};
function setup072(seed){let s=game(seed),p=s.players[0],kamina=stage(s,'TTG-1-045'),gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=3;const gurren=take(p,'TTG-1-072');p.hand.push(gurren);s=withTtgDerivedEnergy(s,0);const a=legal(s,x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-072'&&x.sourceUid===kamina.uid&&x.line==='front'&&x.slot===0);s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});return {s,gurren,kamina};}
test('072 physical raid on Kamina: mandatory draw even with no optional REST target',()=>{
 let {s,gurren}=setup072(7201);
 assert.equal(s.players[0].front[0].uid,gurren.uid);
 assert.equal(s.pending?.kind,'ttgRedRaidQueue');
 const old=s.players[0].deck[0].uid;
 const a=legal(s,x=>x.step==='entry072'&&x.targetUid===null);
 s=dispatchTtgCoreAction(s,a);
 assert.ok(s.players[0].hand.some(c=>c.uid===old));
 assert.equal(s.players[0].front[0].ready,true);
 assert.ok(assertTtgCoreState(s));
});
test('072 printed REST option targets opponent FRONT BP<=3000, never higher BP or energy line',()=>{
 let {s}=setup072(7202),op=s.players[1];
 const small=stage(s,'TTG-1-042','front',0,1),big=stage(s,'TTG-1-073','front',1,1),back=stage(s,'TTG-1-043','energy',0,1);
 s=withTtgDerivedEnergy(s,1);
 const choices=legalTtgCoreActions(s).filter(x=>x.step==='entry072');
 assert.ok(choices.some(x=>x.targetUid===small.uid));
 assert.ok(!choices.some(x=>x.targetUid===big.uid||x.targetUid===back.uid));
 s=dispatchTtgCoreAction(s,choices.find(x=>x.targetUid===small.uid));
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.players[1].front[1].uid,big.uid);
 assert.ok(assertTtgCoreState(s));
});
test('073 upgrades existing RAID 072 with printed Simon and Kamina on field; older 072 becomes hidden, conditional IM1',()=>{
 let {s,kamina}=setup072(7301);
 s=dispatchTtgCoreAction(s,legal(s,x=>x.step==='entry072'&&x.targetUid===null));
 s=dispatchTtgCoreAction(s,legal(s,x=>x.step==='base045'&&x.targetUid===null));
 stage(s,'TTG-1-051','energy',1);const p=s.players[0],up=take(p,'TTG-1-073');p.hand.push(up);
 s=withTtgDerivedEnergy(s,0);
 const a=legal(s,x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-073'&&x.line==='front'&&x.slot===0);
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[1].uid]});
 assert.equal(s.players[0].front[0].uid,up.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,kamina.uid);
 assert.equal(s.players[0].front[0].under.length,1);
 assert.deepEqual(inspectFacedownUnder(s.players[0].front[0],{viewer:1,owner:0}),[{faceDown:true}]);
 assert.equal(redRaidPassive(s,0,s.players[0].front[0]).impact,1);
 assert.ok(assertTtgCoreState(s));
});
test('074 cannot Raid without own Nia, nor without legal Simon base, even at sufficient RED energy',()=>{
 let s=game(7401),p=s.players[0],simon=stage(s,'TTG-1-051'),gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=3;
 const top=take(p,'TTG-1-074');p.hand.push(top);s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-074'));
 stage(s,'TTG-1-059','energy',1);s=withTtgDerivedEnergy(s,0);
 assert.ok(legalTtgCoreActions(s).some(x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-074'&&x.sourceUid===simon.uid));
 assert.ok(assertTtgCoreState(s));
});
test('074 mandatory entry draw and printed IMPACT1 on actual legal Nia+Simon RAID',()=>{
 let s=game(7402),p=s.players[0],simon=stage(s,'TTG-1-051'),nia=stage(s,'TTG-1-059','energy',1),gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=3;
 const top=take(p,'TTG-1-074');p.hand.push(top);s=withTtgDerivedEnergy(s,0);
 const a=legal(s,x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-074'&&x.sourceUid===simon.uid&&x.line==='front');
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 const drawn=s.players[0].deck[0].uid;
 s=dispatchTtgCoreAction(s,legal(s,x=>x.step==='entry074'));
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn));
 assert.equal(redRaidPassive(s,0,s.players[0].front[0]).impact,1);
 assert.ok(assertTtgCoreState(s));
});
