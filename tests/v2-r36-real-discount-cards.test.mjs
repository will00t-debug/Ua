import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
const packs=[registeredV2TitlePack('sword-art-online'),registeredV2TitlePack('mushoku-tensei')];
const ids=[['SAO-2-074','SAO-2-065','SAO-1-068','SAO-1-069','SAO-1-072','SAO-1-073','SAO-1-074','SAO-1-077','SAO-1-078','SAO-1-079','SAO-1-082','SAO-1-084','SAO-1-088'],['MST-1-062','MST-1-046','MST-1-050','MST-1-059','MST-1-063','MST-1-055','MST-1-057','MST-1-052','MST-1-069','MST-1-054','MST-1-075','MST-1-066','MST-1-070']];
const decks=ids.map(xs=>Object.fromEntries(xs.map((id,i)=>[id,i===12?2:4])));
for(let p=0;p<2;p++)assert.deepEqual(validateUniversalDeck(packs[p],decks[p]),[]);
function take(s,p,id){for(const z of ['deck','life','hand','outside']){const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function put(s,p,id,line,slot){const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[p][line][slot]=c;return c;}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
function scene(p=0){let s=newUniversalMatch(packs,{decks,first:p,seed:36074});
 for(let i=0;i<3;i++)put(s,p,p===0?'SAO-1-068':'MST-1-050','energy',i);
 const source=take(s,p,ids[p][0]);s.players[p].hand.push(source);
 s=act(act(s,{type:'next'}),{type:'next'});
 for(const ap of s.players[p].apCards){ap.ready=true;ap.inPlay=true;}
 return {s,source};}
function play(s,uid,line){const a=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line);assert.ok(a);return act(s,a);}
function ai(s){for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));}
test('R36 two official complete printed profiles, body and LIFE definitions',()=>{
 const a=packs[0].cards['SAO-2-074'],b=packs[1].cards['MST-1-062'];
 assert.deepEqual([a.name,a.type,a.color,a.energy,a.ap,a.bp,a.gen,a.traits,a.trigger],['トンキー','field','green',3,1,0,1,['ALO'],'active']);
 assert.deepEqual(a.effects.onPlay,[{op:'nextEligibleHandPlayApDiscount',filter:{printedBp:3500,trait:'ALO'}}]);
 assert.deepEqual([b.name,b.type,b.color,b.energy,b.ap,b.bp,b.gen,b.traits,b.trigger],['ナナホシ','character','green',3,1,2000,2,['ラノア魔法大学'],'color']);
 assert.equal(b.effects.onPlay[0].options.length,2);assert.equal(b.effects.onPlay[0].options[0].then[0].excludeName,'ナナホシ');
 assert.deepEqual(b.triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
});
test('R36 SAO Q1209/Q1210: paid FIELD grants printed 3500+ALO reduction, no live BP dependence',()=>{
 let {s,source}=scene();s=play(s,source.uid,'energy');assert.equal(s.continuousStates.length,1);
 const wrong=take(s,0,'SAO-1-082');wrong.buffs=[{bp:1500,untilTurn:s.turn}];s.players[0].hand.push(wrong);
 s=play(s,wrong.uid,'front');assert.equal(s.continuousStates.length,1);
 const target=take(s,0,'SAO-2-065');target.buffs=[{bp:1000,untilTurn:s.turn}];s.players[0].hand.push(target);
 for(const ap of s.players[0].apCards)ap.ready=false;ai(s);s=play(s,target.uid,'front');
 assert.equal(s.continuousStates.length,0);assert.equal(assertUniversalMatch(packs,s),true);
});
for(const line of ['front','energy'])test('R36 MST Q2161 '+line+' entry: choose bounce, excludes every Nanahoshi, consumes only after success',()=>{
 let {s,source}=scene(1);const sameName=put(s,1,'MST-1-062','front',2);const returnable=put(s,1,'MST-1-070','front',0);
 s=play(s,source.uid,line);ai(s);s=act(s,{type:'chooseEffectMode',mode:'bounce'});
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===sameName.uid));assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===source.uid));
 const snap=structuredClone(s);assert.throws(()=>act(s,{type:'chooseOwnBounce',uid:sameName.uid}));assert.deepEqual(s,snap);
 const bounce=legalUniversalActions(packs,s).find(a=>a.uid===returnable.uid);const picked=bounce.uid;
 s=act(s,bounce);assert.ok(s.players[1].hand.some(c=>c.uid===picked));assert.equal(s.continuousStates.length,1);
 const target=take(s,1,'MST-1-046');s.players[1].hand.push(target);for(const ap of s.players[1].apCards)ap.ready=false;
 // Keep enough real generation after returning one producer.
 s=play(s,target.uid,'front');assert.equal(s.continuousStates.length,0);assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
});
test('R36 MST optional decline gives no discount; draw mode draws exactly one',()=>{
 for(const mode of ['bounce','draw']){let {s,source}=scene(1);s=play(s,source.uid,'front');const n=s.players[1].deck.length;
 s=act(s,{type:'chooseEffectMode',mode});if(mode==='bounce'){s=act(s,{type:'chooseOwnBounce',uid:null});assert.equal(s.players[1].deck.length,n);}else assert.equal(s.players[1].deck.length,n-1);
 assert.equal(s.continuousStates.length,0);assert.equal(s.pending,null);}
});
test('R36 MST pending continuation save rejects injected follow-up or excluded-name changes',()=>{
 let {s,source}=scene(1);s=act(play(s,source.uid,'front'),{type:'chooseEffectMode',mode:'bounce'});assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 for(const mutate of [q=>q.excludeName='other',q=>q.after[0].filter.printedGenAtLeast=0,q=>q.choices.push(source.uid)]){const bad=structuredClone(s);mutate(bad.pending);assert.throws(()=>assertUniversalMatch(packs,bad));}
});
test('R36 earned discount survives source departure and seal; source UID remains auditable and private hands hidden',()=>{
 let {s,source}=scene();s=play(s,source.uid,'energy');const target=put(s,0,'SAO-1-078','front',0);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:target.uid,targetUid:source.uid,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'),true);
 const i=s.players[0].energy.findIndex(c=>c?.uid===source.uid);const c=s.players[0].energy[i];s.players[0].energy[i]=null;c.fieldEntryStamp=null;s.players[0].outside.push(c);
 assert.equal(assertUniversalMatch(packs,s),true);assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 s=act(act(s,{type:'next'}),{type:'next'});assert.equal(s.continuousStates.length,0);
});
for(const defender of [0,1])test('R36 real cross-title combat resolves '+(defender?'MST COLOR':'SAO ACTIVE')+' LIFE without granting onPlay discount',()=>{
 const attacker=1-defender;let s=newUniversalMatch(packs,{decks,first:attacker,seed:36100+defender});
 const unit=put(s,attacker,attacker?'MST-1-046':'SAO-2-065','front',0);
 const target=put(s,defender,defender?'MST-1-050':'SAO-1-078','front',1);target.ready=false;
 const trig=take(s,defender,ids[defender][0]);s.players[defender].deck.push(s.players[defender].life.shift());s.players[defender].life.unshift(trig);
 const hand=take(s,defender,defender?'MST-1-050':'SAO-1-078');s.players[defender].hand.push(hand);
 s=act(act(act(s,{type:'next'}),{type:'next'}),{type:'next'});s=act(s,{type:'attack',uid:unit.uid});s=act(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');ai(s);
 const a=legalUniversalActions(packs,s).find(a=>a.mode===(defender?'color':'active')&&a.uid===(defender?hand.uid:target.uid));assert.ok(a);s=act(s,a);
 assert.equal(s.continuousStates.length,0);assert.equal(assertUniversalMatch(packs,s),true);
});
test('R36 same physical FIELD reentry gets a new stamp; earned old grant and new grant stack',()=>{
 let {s,source}=scene();s=play(s,source.uid,'energy');const first=s.continuousStates[0].sourceStamp;
 const slot=s.players[0].energy.findIndex(c=>c?.uid===source.uid),c=s.players[0].energy[slot];s.players[0].energy[slot]=null;c.fieldEntryStamp=null;c.ready=false;s.players[0].hand.push(c);
 s=play(s,c.uid,'energy');assert.equal(s.continuousStates.length,2);assert.notEqual(s.continuousStates[1].sourceStamp,first);
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 const target=take(s,0,'SAO-2-065');s.players[0].hand.push(target);for(const ap of s.players[0].apCards)ap.ready=false;
 s=play(s,target.uid,'front');assert.equal(s.continuousStates.length,0);
});
test('R36 MST bounce of a Raid top retains physical top, sends all lower layers outside, then grants discount',()=>{
 let {s,source}=scene(1);const top=put(s,1,'MST-1-054','front',0),base=take(s,1,'MST-1-052');top.stack=[base];
 s=act(play(s,source.uid,'energy'),{type:'chooseEffectMode',mode:'bounce'});s=act(s,{type:'chooseOwnBounce',uid:top.uid});
 assert.ok(s.players[1].hand.some(c=>c.uid===top.uid&&c.stack.length===0));assert.ok(s.players[1].outside.some(c=>c.uid===base.uid));
 assert.equal(s.turnRetireEvents.length,0);assert.equal(s.continuousStates.length,1);assert.equal(assertUniversalMatch(packs,s),true);
});
