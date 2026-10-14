import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalRed075,resolveRed075,red075ImpactNull,legalRed077Fields,resolveRed077Field,legalRed077Recover,resolveRed077Recover} from '../dist/ttg-red-twelfth-three.mjs';

// Official UA56BT/TTG-1-075 and 077; 076 printed text still requires external reconfirmation.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-075
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-077
const deck=Object.fromEntries([...['042','043','045','046','047','051','059','064','075','076','077'].map(n=>['TTG-1-'+n,4]),['TTG-1-036',2],['TTG-1-038',2],['TTG-1-072',2]]);
function setup(seed){const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});s.phase='main';s.players[0].turnCount=2;return s;}
function take(p,id){for(const zone of ['hand','deck','life','outside']){const i=p[zone].findIndex(c=>c.cardId===id);if(i>=0)return p[zone].splice(i,1)[0]}throw Error('Missing '+id);}
function stage(s,id,line,slot){const c=take(s.players[0],id);c.ready=true;s.players[0][line][slot]=c;return c;}
test('075: own Nia and Gunmen count allow distinct modes only; one activation each turn',()=>{
 let s=setup(7501);
 const c=stage(s,'TTG-1-075','front',0);
 stage(s,'TTG-1-059','energy',0);
 stage(s,'TTG-1-076','energy',1);
 let actions=legalRed075(s,0).filter(x=>x.uid===c.uid);
 assert.ok(actions.some(x=>x.effects.length===2&&x.effects.includes('impactNull')&&x.effects.includes('doubleBlock')));
 assert.ok(!actions.some(x=>new Set(x.effects).size!==x.effects.length));
 assert.ok(!actions.some(x=>x.effects.length===3));
 s=resolveRed075(s,actions.find(x=>x.effects.length===2&&x.effects.includes('impactNull')&&x.effects.includes('doubleBlock')));
 assert.equal(red075ImpactNull(s,0,s.players[0].front[0]),true);
 assert.equal(s.players[0].front[0].doubleBlockUntilOwnStartTurnCount,3);
 assert.equal(legalRed075(s,0).length,0);
 assert.ok(assertTtgCoreState(s));
});
test('075: opponent Nia does not qualify and duplicate mode is illegal',()=>{
 let s=setup(7502);
 stage(s,'TTG-1-075','front',0);
 const nia=take(s.players[1],'TTG-1-059');s.players[1].energy[0]=nia;
 assert.equal(legalRed075(s,0).length,0);
 assert.throws(()=>resolveRed075(s,{type:'ttgRed075Main',player:0,uid:s.players[0].front[0].uid,effects:['bp','bp']}));
 assert.ok(assertTtgCoreState(s));
});
test('077: paid field entry recovers only own outside Gunmen, or may decline',()=>{
 let s=setup(7701),p=s.players[0];
 const gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=4;
 const target=take(p,'TTG-1-076');p.outside.push(target);
 const other=take(p,'TTG-1-043');p.outside.push(other);
 const field=take(p,'TTG-1-077');p.hand.push(field);
 s=withTtgDerivedEnergy(s,0);
 const a=legalRed077Fields(s,0).find(x=>x.handUid===field.uid&&x.slot===1);
 assert.ok(a);
 s=resolveRed077Field(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 const recover=legalRed077Recover(s);
 assert.ok(recover.some(x=>x.recoverUid===target.uid));
 assert.ok(!recover.some(x=>x.recoverUid===other.uid));
 assert.ok(recover.some(x=>x.recoverUid===null));
 s=resolveRed077Recover(s,recover.find(x=>x.recoverUid===target.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===target.uid));
 assert.ok(s.players[0].outside.some(x=>x.uid===other.uid));
 assert.ok(assertTtgCoreState(s));
});
