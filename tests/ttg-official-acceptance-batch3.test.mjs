import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {inspectFacedownUnder} from '../dist/ttg-rules.mjs';
// Official Japanese print checked 2026-10-14 (002 retrieved directly over HTTPS):
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT/TTG-1-002
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT/TTG-1-004
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT/TTG-1-005
// 004 Q2260: source must be front BEFORE Raid; Q2262: private attached card identity.
const counts=Object.fromEntries([...['002','004','005','006','009','012','027','028','029','031','032','017'].map(x=>['TTG-1-'+x,4]),['TTG-1-039',2]]);
const game=()=>{const s=newTtgCoreMatch({decks:[counts,counts],seed:1400,first:0});s.phase='main';s.players[0].turnCount=2;return s;};
function take(p,id){for(const z of ['hand','deck','life','outside']){const i=p[z].findIndex(c=>c.cardId==='TTG-1-'+id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('missing '+id);}
function put(s,id,line,slot,owner=0,ready=true){const c=take(s.players[owner],id);c.ready=ready;s.players[owner][line][slot]=c;return c;}
function act(s,f){const a=legalTtgCoreActions(s).find(f);assert.ok(a,'expected legal action');const n=dispatchTtgCoreAction(s,a.type==='greenHighRaid'?{...a,payApUids:s.players[a.player].apCards.filter(c=>c.ready).slice(0,a.requiredAp).map(c=>c.uid)}:a);assertTtgCoreState(n);return n;}
test('002 main needs two distinct ACTIVE characters; invalid target atomic; energy expires after turn',()=>{
 let s=game();const v=put(s,'002','energy',0),t=put(s,'005','front',0),enemy=put(s,'006','front',0,1);
 s=withTtgDerivedEnergy(s,0);const before=calculateTtgEnergyByColor(s,0).green,ap=s.players[0].apCards.map(c=>c.ready);
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'activateViral002',player:0,uid:v.uid,targetUid:enemy.uid}));assert.equal(s.players[0].energy[0].ready,true);
 s=act(s,a=>a.type==='activateViral002'&&a.uid===v.uid&&a.targetUid===t.uid);
 assert.equal(s.players[0].energy[0].ready,false);assert.equal(s.players[0].front[0].ready,false);
 assert.equal(calculateTtgEnergyByColor(s,0).green,before+1);assert.deepEqual(s.players[0].apCards.map(c=>c.ready),ap);
 s.players[0].energy[0].ready=true;s.players[0].front[0].ready=true;
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='activateViral002'),false);
 s=act(s,a=>a.type==='next');s=act(s,a=>a.type==='next');
 assert.equal(calculateTtgEnergyByColor(s,0).green,before);
 const alone=game();put(alone,'002','front',0);
 assert.equal(legalTtgCoreActions(alone).some(a=>a.type==='activateViral002'),false,'REST cost cannot also pay front target');
});
test('official Q99: 002 ACTIVE, 004 GET, 005 DRAW all offer defender activation or decline',()=>{
 for(const id of ['002','004','005']){let s=game();s.phase='attack';const attacker=put(s,'006','front',0),p=s.players[1];
  const life=take(p,id);p.deck.push(p.life.shift());p.life.unshift(life);const hand=p.hand.length;
  const target=put(s,'006','energy',0,1,false),top=p.deck[0].uid;s=withTtgDerivedEnergy(s,0);
  s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);
  if(s.pending?.kind==='block')s=act(s,a=>a.type==='block'&&a.blockUid===null);
  assert.ok(s.pendingTtgLife);
  const declined=act(s,a=>a.mode==='decline');
  assert.ok(declined.players[1].outside.some(c=>c.uid===life.uid));
  assert.equal(declined.players[1].hand.length,hand,'declining any Trigger cannot draw or add life card');
  s=act(s,a=>a.mode===({ '002':'active','004':'get','005':'draw'}[id])&&(id!=='002'||a.targetUid===target.uid));
  if(id==='002'){assert.equal(s.players[1].energy[0].ready,true);assert.equal(s.players[1].energy[0].currentBp,6000);}
  else {assert.equal(s.players[1].hand.length,hand+1);assert.ok(s.players[1].hand.some(c=>c.uid===(id==='004'?life.uid:top)));}
 }
});
test('004 Q2260 front Raid base triggers but energy-to-front base does not; hand/outside attachment differs in draw',()=>{
 for(const line of ['front','energy'])for(const zone of ['hand','outside']){let s=game(),p=s.players[0];
  const base=put(s,'004',line,0);for(let i=1;i<4;i++)put(s,'017','energy',i);
  p.energy[1].energyBonus=1; // Exactly seven physical generated energy, enough for 027.
  const raid=take(p,'027');p.hand.push(raid);const companion=take(p,'009');p[zone].push(companion);
  s=withTtgDerivedEnergy(s,0);
  s=act(s,a=>a.type==='greenHighRaid'&&a.handUid===raid.uid&&a.line==='front'&&a.slot===0);
  assert.equal(s.pending.remaining.includes('viral004'),line==='front');
  if(line==='energy')continue;
  const before=s.players[0].hand.length;
  s=act(s,a=>a.step==='viral004'&&a.mode==='attach'&&a.sourceUid===companion.uid&&a.zone===zone);
  const host=s.players[0].front[0];assert.equal(host.stack[0].uid,base.uid);
  assert.ok(host.under.some(c=>c.uid===companion.uid&&c.faceDown));
  assert.equal(s.players[0].hand.length,before,'hand attach replaces itself by one draw; outside attach draws none');
  assert.deepEqual(inspectFacedownUnder(host,{viewer:1,owner:0}),[{faceDown:true}]);
  assert.equal(inspectFacedownUnder(host,{viewer:0,owner:0})[0].uid,companion.uid);
 }
});
