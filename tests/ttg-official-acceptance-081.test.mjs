import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {gigaDrillEnergyThreshold,eligibleGigaDrillTargets} from '../dist/ttg-actions.mjs';
import {legalTtgEventTriggerChoices,resolveTtgEventLifeTrigger} from '../dist/ttg-triggers.mjs';

// OFFICIAL Q2301 (2026-08-21) overrides erroneous printed normal effect:
// opponent FRONT only, BP <= 3000 or <= 5000 with Simon/Kamina on own field or Raid base.
// https://www.unionarena-tcg.com/jp/faq/list.php?category=カード個別&sub_category=天元突破グレンラガン
// SPECIAL life trigger remains opponent FRONT, with no printed BP ceiling; Q99 permits decline.
const deck=Object.fromEntries([...['042','043','045','046','047','051','059','064','070','072','076'].map(n=>['TTG-1-'+n,4]),['TTG-1-081',4],['TTG-1-036',2]]);
function game(seed){const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});s.phase='main';s.players[0].turnCount=2;return s;}
function take(p,id){for(const z of ['hand','deck','life','outside']){const i=p[z].findIndex(c=>c.cardId===id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('Missing '+id);}
function stage(s,p,id,line,slot){const c=take(s.players[p],id);c.ready=true;s.players[p][line][slot]=c;return c;}
function prepare(seed){let s=game(seed);const energy=stage(s,0,'TTG-1-064','energy',0);energy.energyBonus=4;const event=take(s.players[0],'TTG-1-081');s.players[0].hand.push(event);s=withTtgDerivedEnergy(s,0);return {s,event};}
test('081 Q2301: no Simon/Kamina permits opponent FRONT BP3000 but never energy or BP3001+',()=>{
 const {s}=prepare(8101);
 const low=stage(s,1,'TTG-1-043','front',0);low.currentBp=3000;
 const high=stage(s,1,'TTG-1-046','front',1);high.currentBp=3001;
 const back=stage(s,1,'TTG-1-042','energy',0);back.currentBp=1000;
 assert.equal(gigaDrillEnergyThreshold(s.players[0]),3000);
 const legal=eligibleGigaDrillTargets(s,0).map(x=>x.uid);
 assert.deepEqual(legal,[low.uid]);
 assert.ok(!legal.includes(high.uid));assert.ok(!legal.includes(back.uid));
 assert.ok(assertTtgCoreState(s));
});
test('081 Q2301: on-field Simon unlocks BP5000; BP5001 and protected opponents remain illegal',()=>{
 const {s}=prepare(8102);
 stage(s,0,'TTG-1-051','front',0);
 const legalTarget=stage(s,1,'TTG-1-046','front',0);legalTarget.currentBp=5000;
 const over=stage(s,1,'TTG-1-047','front',1);over.currentBp=5001;
 const guarded=stage(s,1,'TTG-1-043','front',2);guarded.protectedFromEffects=true;
 assert.equal(gigaDrillEnergyThreshold(s.players[0]),5000);
 assert.deepEqual(eligibleGigaDrillTargets(s,0).map(x=>x.uid),[legalTarget.uid]);
 assert.ok(assertTtgCoreState(s));
});
test('081 Q2301: Simon Raid base also raises threshold; corrected target retires entire Raid pile',()=>{
 let {s,event}=prepare(8103);
 const simon=stage(s,0,'TTG-1-051','front',0);
 const ownRaid=take(s.players[0],'TTG-1-076');
 s.players[0].front[0]={...ownRaid,ready:true,stack:[simon],under:[]};
 const enemyBase=stage(s,1,'TTG-1-043','front',0);
 const enemyTop=take(s.players[1],'TTG-1-072');
 s.players[1].front[0]={...enemyTop,ready:true,currentBp:5000,stack:[enemyBase],under:[]};
 s=withTtgDerivedEnergy(s,0);
 assert.equal(gigaDrillEnergyThreshold(s.players[0]),5000);
 const actions=legalTtgCoreActions(s).filter(x=>x.type==='playTtgEvent'&&x.handUid===event.uid);
 assert.equal(actions.length,1);
 assert.ok(actions[0].targetUids.includes(enemyTop.uid));
 const payment=s.players[0].apCards.find(x=>x.ready).uid;
 s=dispatchTtgCoreAction(s,{type:'playTtgEvent',player:0,handUid:event.uid,cardId:event.cardId,targetUid:enemyTop.uid,payApUids:[payment]});
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].outside.some(x=>x.uid===enemyTop.uid));
 assert.ok(s.players[1].outside.some(x=>x.uid===enemyBase.uid));
 assert.ok(s.players[0].outside.some(x=>x.uid===event.uid));
 assert.equal(s.players[0].apCards.find(x=>x.uid===payment).ready,false);
 assert.ok(assertTtgCoreState(s));
});
test('081 SPECIAL life trigger has NO BP threshold and can be declined per Q99',()=>{
 let s=game(8104);
 const target=stage(s,1,'TTG-1-047','front',0);target.currentBp=9999;
 const back=stage(s,1,'TTG-1-042','energy',0);
 const life=take(s.players[0],'TTG-1-081');s.pendingTtgTrigger={player:0,card:life};
 const opts=legalTtgEventTriggerChoices(s);
 assert.deepEqual(opts.map(x=>x.targetUid),[target.uid]);
 assert.ok(!opts.some(x=>x.targetUid===back.uid));
 const declined=resolveTtgEventLifeTrigger(s,{player:0,decline:true});
 assert.equal(declined.players[1].front[0].uid,target.uid);
 assert.ok(declined.players[0].outside.some(x=>x.uid===life.uid));
 assert.ok(assertTtgCoreState(declined));
 const activated=resolveTtgEventLifeTrigger(s,{player:0,targetUid:target.uid});
 assert.equal(activated.players[1].front[0],null);
 assert.ok(activated.players[1].outside.some(x=>x.uid===target.uid));
 assert.ok(activated.players[0].outside.some(x=>x.uid===life.uid));
 assert.ok(assertTtgCoreState(activated));
});
