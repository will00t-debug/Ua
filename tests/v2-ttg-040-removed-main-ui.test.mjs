import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalCardEnergy,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {legalRemovedMainAction,removedMainActionText} from '../dist/universal-v2/removed-main-ui.mjs';

const pack=createTtgV2Pack();
const featured=['TTG-1-003','TTG-1-017','TTG-1-040','TTG-1-068','TTG-1-070','TTG-1-080'];
const fillers=['TTG-1-019','TTG-1-063','TTG-1-010','TTG-1-044','TTG-1-076','TTG-1-029','TTG-1-005','TTG-1-002'];
const deck=Object.fromEntries(featured.map(id=>[id,3]));
for(const id of fillers)deck[id]=4;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone];
  const n=list.findIndex(c=>c.cardId===id);
  if(n!==-1)return list.splice(n,1)[0];
 }
 throw Error('Missing physical '+id);
}
function step(s,predicate){
 const legal=legalUniversalActions(pack,s);
 const action=legal.find(predicate);
 assert.ok(action,'expected action in '+s.phase+' ('+(s.pending?.kind||'normal')+')');
 const next=dispatchUniversalAction(pack,s,action,{actor:0});
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function fixture(seed){
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed,first:0});
 const spell=take(s,0,'TTG-1-040');
 const second=take(s,0,'TTG-1-040');
 s.players[0].removed.push(spell,second);
 const producers=Array.from({length:4},(_,i)=>{
  const c=take(s,0,'TTG-1-019');
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[i]=c;
  return c;
 });
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,spell,second,producers};
}

test('TTG-040 removed MAIN only appears as an engine-issued action during own MAIN at 8+ energy',()=>{
 let {s,spell,producers}=fixture(8040);
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,s),spell.uid),null,'start phase');
 s=step(s,a=>a.type==='next');
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,s),spell.uid),null,'move phase');
 s=step(s,a=>a.type==='next');
 assert.equal(s.phase,'main');
 assert.equal(universalCardEnergy(pack,s,0,producers[0]),2);
 const action=legalRemovedMainAction(legalUniversalActions(pack,s),spell.uid);
 assert.deepEqual(action,{type:'activateRemoved',uid:spell.uid,mode:'double'});
 assert.equal(removedMainActionText(action),'起動主要｜本回合產生能源 ×2');
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,s),spell.uid,false),null,'opponent/non-controller cannot activate');
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,s),'other-uid'),null);
 assert.equal(universalPublicView(pack,s,1).players[0].removed.some(c=>c.uid===spell.uid),true,
  'removed card is publicly visible but hidden hand remains redacted');
 s=step(s,a=>a.type==='activateRemoved'&&a.uid===spell.uid);
 assert.equal(s.energyDoubles[0],1);
 assert.equal(universalCardEnergy(pack,s,0,producers[0]),4);
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,s),spell.uid),null,'once per physical card per turn');
 assert.ok(legalRemovedMainAction(legalUniversalActions(pack,s),s.players[0].removed[1].uid),
  'a second physical copy may activate independently');
 s=step(s,a=>a.type==='activateRemoved'&&a.uid===s.players[0].removed[1].uid);
 assert.equal(s.energyDoubles[0],2);
 assert.equal(universalCardEnergy(pack,s,0,producers[0]),8,'two doublings stack to ×4');
 s=step(s,a=>a.type==='next');
 assert.equal(s.phase,'attack');
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,s),spell.uid),null);
 s=step(s,a=>a.type==='next');
 assert.equal(s.energyDoubles[0],0,'effect expires on turn boundary');
});

test('TTG-040 cannot start removed MAIN below the 8-energy threshold',()=>{
 const {s,spell}=fixture(8041);
 s.players[0].energy[3]=null;
 s.players[0].outside.push(...[]); // no hidden card lookup required
 let at=s;
 at=step(at,a=>a.type==='next');
 at=step(at,a=>a.type==='next');
 assert.equal(at.phase,'main');
 assert.equal(legalRemovedMainAction(legalUniversalActions(pack,at),spell.uid),null);
});

test('solo and online zone galleries expose activateRemoved only through the legal action list',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const solo=read('dist/universal-v2-preview.mjs');
 const online=read('dist/online.mjs');
 const onlineBattle=read('dist/universal-v2/online-battle-ui.mjs');
 const popup=solo.split('function showZoneSheet(side,zone){')[1]?.split('function clearPendingOverlay(')[0];
 const mobile=online.split('function zoneTray(player){')[1]?.split('function ownHand(')[0];
 const desktop=onlineBattle.split('const showZone=(side,zone)=>{')[1]?.split('const playerArea=')[0];
 assert.ok(popup&&mobile&&desktop);
 assert.match(popup,/const zoneLegal=yours\?legalUniversalActions/);
 assert.match(popup,/legalRemovedMainAction\(activations,physical\.uid,yours\)/);
 assert.match(popup,/closeZoneSheet\(\);applyAction\(activate\)/);
 assert.match(mobile,/legalRemovedMainAction\(legal,card\.uid,ready&&app\.zone==='removed'\)/);
 assert.match(mobile,/sendAction\(activate\.index\)/);
 assert.match(desktop,/side===0&&room\.yourTurn&&room\.status==='playing'/);
 assert.match(desktop,/legalRemovedMainAction\(choices,c\.uid,enabled&&zone==='removed'\)/);
 assert.match(desktop,/onAction\(activate\.index\)/);
 assert.match(read('dist/universal-v2-battle.html'),/universal-v2-zone\.css\?v=20261105removedmain1/);
 assert.match(read('dist/online.html'),/online\.css\?v=20261105removedmain1/);
});
