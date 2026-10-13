import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_IMPLEMENTED_HAND_EVENTS} from '../dist/ttg-event-resolver.mjs';
import {TTG_IMPLEMENTED_EVENT_TRIGGERS} from '../dist/ttg-triggers.mjs';
import {eligibleGigaDrillTargets,resolveGigaDrillRetire,readyTtgApCards} from '../dist/ttg-actions.mjs';
import {legalRed080Events,resolveRed080Event,expireRed080AtOwnTurnEnd,red080DiscountFor} from '../dist/ttg-red-thirteenth-three.mjs';
import {legalRedHighRaids,resolveRedHighRaid} from '../dist/ttg-red-eleventh-three.mjs';
const c=(uid,id,props={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...props});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],
 apCards:[{uid:'A',ready:true},{uid:'B',ready:false}],turnCount:2});
const start=()=>({turn:9,active:0,phase:'main',status:'playing',players:[pl(),pl()]});
const uids=p=>[...p.front.filter(Boolean),...p.energy.filter(Boolean),...p.hand,...p.deck,...p.life,...p.outside,...p.removed].flatMap(function f(c){return [c.uid,...(c.stack||[]).flatMap(f),...(c.under||[]).flatMap(f)]}).sort();
test('078/079 share AP-ready event reducer and FINAL life, no new fake rule required',()=>{
 for(const n of ['078','079']){
  const id='TTG-1-'+n;
  assert.equal(TTG_BY_ID[id].trigger,'final');
  assert.ok(TTG_IMPLEMENTED_HAND_EVENTS.includes(id));
  assert.ok(TTG_IMPLEMENTED_EVENT_TRIGGERS.includes(id));
 }
 const s=start();const x=readyTtgApCards(s,{player:0,apUids:['B']});
 assert.equal(x.players[0].apCards[1].ready,true);
});
test('080 Q2300 requires Kamina, recovers outside target, retains discount until eligible Raid or end turn',()=>{
 const s=start(),p=s.players[0];
 p.energy[0]=c('power','TTG-1-066',{gen:10});
 p.front[0]=c('kamina','TTG-1-045');
 p.hand=[c('event','TTG-1-080'),c('raid','TTG-1-072')];
 p.outside=[c('lagan','TTG-1-076'),c('ordinary','TTG-1-042')];
 const before=uids(p),offer=legalRed080Events(s,0);
 assert.deepEqual(offer.map(x=>x.recoverUid),[null,'lagan']);
 let r=resolveRed080Event(s,{...offer[1],payApUids:['A']});
 assert.deepEqual(uids(r.players[0]),before);
 assert.ok(r.players[0].hand.some(x=>x.uid==='lagan'));
 assert.equal(r.players[0].red080DiscountUntilTurn,9);
 assert.equal(red080DiscountFor(r,0,c('r','TTG-1-072')),1);
 assert.equal(red080DiscountFor(r,0,c('k','TTG-1-071')),0);
 const raid=legalRedHighRaids(r,0).find(x=>x.handUid==='raid');
 assert.ok(raid);
 assert.equal(raid.requiredAp,0);
 r=resolveRedHighRaid(r,{...raid,payApUids:[]});
 assert.equal(r.players[0].red080DiscountUntilTurn,undefined);
 const ended=expireRed080AtOwnTurnEnd(r,0);
 assert.equal(ended.players[0].red080DiscountUntilTurn,undefined);
});
test('081 corrected Q2301 checks printed BP even without instance bp, NORMAL is front only and SPECIAL independent',()=>{
 const s=start();
 s.players[0].front[0]=c('simon','TTG-1-051');
 s.players[1].front[0]=c('target','TTG-1-073');
 s.players[1].energy[0]=c('wrongLine','TTG-1-064');
 const eligible=eligibleGigaDrillTargets(s,0);
 assert.deepEqual(eligible.map(x=>x.uid),['target']);
 const before=uids(s.players[1]);
 const after=resolveGigaDrillRetire(s,{player:0,targetUid:'target'});
 assert.equal(after.players[1].front[0],null);
 assert.deepEqual(uids(after.players[1]),before);
 assert.ok(TTG_IMPLEMENTED_HAND_EVENTS.includes('TTG-1-081'));
 assert.ok(TTG_IMPLEMENTED_EVENT_TRIGGERS.includes('TTG-1-081'));
});
