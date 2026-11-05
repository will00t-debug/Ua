import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalAttackDamage,universalBp,universalCardEnergy,universalEnergyByColor,universalImpact,
 universalImpactNull,universalPrivateChoices,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const csm=createCsmV2Pack();
const sao=registeredV2TitlePack('sword-art-online');
const FUEL=['KMR-1-026','KMR-1-027','KMR-1-103','KMR-1-105'];
const text=id=>KMR_CARDS.find(c=>c.id===id).effectJa;

function countsFor(required,source=pack){
 const fillers=Object.values(source.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=source.cards[id].trigger;
  let copies=1;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(4,50-total);
  const trigger=source.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(source,counts),[]);
 return counts;
}
function withCopies(ids,extras){
 const counts=countsFor(ids);
 for(const [id,n] of Object.entries(extras)){
  let need=n-(counts[id]||0);
  counts[id]=n;
  for(const key of Object.keys(counts)){
   if(need<=0)break;
   if(key===id||Object.prototype.hasOwnProperty.call(extras,key)||ids.includes(key))continue;
   const drop=Math.min(need,counts[key]);
   counts[key]-=drop;
   if(counts[key]<=0)delete counts[key];
   need-=drop;
  }
  assert.equal(need,0,id);
 }
 assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function open(ids,seed,titlePacks=packs,source=pack){
 const counts=Array.isArray(ids)?countsFor(ids,source):ids;
 const decks=Array.isArray(counts[0])?counts:[counts,counts];
 return newUniversalMatch(titlePacks,{decks,seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' p'+p);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;card.entryTurn=s.turn;
 s.players[p][line][slot]=card;return card;
}
function fuel(s,p=0){FUEL.forEach((id,i)=>put(s,p,id,'energy',i,true));}
function ready(s){
 s.pending=null;s.phase='main';
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
}
function use(titlePacks,s,pred){
 const action=legalUniversalActions(titlePacks,s).find(pred);
 if(!action)throw Error('No action pending '+(s.pending?.kind||'-')+'/'+(s.pending?.step||'')+' id '+(s.pending?.id||''));
 return dispatchUniversalAction(titlePacks,s,action);
}
function play(s,uid,line='front'){return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid==null);}
function raidOnto(s,uid,baseUid){return use(packs,s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);}
function kmr(s,pred){return use(packs,s,a=>a.type==='kmr'&&pred(a));}
function onlyHand(s,p,cards){s.players[p].deck.push(...s.players[p].hand.splice(0));s.players[p].hand.push(...cards);}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function activates(s,uid){return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);}
function silence(s,card,controller){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function ownMainAgain(s){
 const turn=s.turn;let guard=0;
 while(!(s.turn>turn&&s.active===0&&s.phase==='main')){
  if(s.pending)throw Error('Pending '+s.pending.kind+'/'+(s.pending.step||'')+' blocked the turn');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>20)throw Error('Stuck '+s.phase+' t'+s.turn+' a'+s.active);
 }
 return s;
}
function toAttack(s){
 let guard=0;
 while(s.phase!=='attack'){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked attack');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('phase '+s.phase);
 }
 return s;
}

test('KMR-1-004 damages at its own attack end only from the front with eight rider names',()=>{
 assert.match(text('KMR-1-004'),/異なるカード名のキャラが8枚以上/);
 const ids=['KMR-1-004','KMR-1-001','KMR-1-002','KMR-1-005','KMR-1-006','KMR-1-010','KMR-1-016','KMR-1-018','KMR-1-017',...FUEL];
 let s=open(ids,1401);
 fuel(s);
 const self=take(s,0,'KMR-1-004');
 onlyHand(s,0,[self]);
 ready(s);
 s=play(s,self.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(universalImpact(pack,s,s.players[0].front[0]),1);
 const later=ownMainAgain(s);
 assert.equal(universalImpact(pack,later,later.players[0].front.find(c=>c?.uid===self.uid)),0);

 let eight=toAttack(open(ids,1402));
 const names=['KMR-1-004','KMR-1-001','KMR-1-002','KMR-1-005','KMR-1-006','KMR-1-010','KMR-1-016','KMR-1-018'];
 names.forEach((id,i)=>put(eight,0,id,i<4?'front':'energy',i%4,true));
 const life=take(eight,1,'KMR-1-017');
 const buried=eight.players[1].life[0];
 eight.players[1].life[0]=life;eight.players[1].deck.push(buried);
 eight=dispatchUniversalAction(packs,eight,{type:'next'});
 assert.equal(eight.players[1].life.length,6);
 assert.equal(eight.players[1].outside.some(c=>c.uid===life.uid),true);
 assert.equal(eight.pending,null);

 let seven=toAttack(open(ids,1403));
 names.slice(0,7).forEach((id,i)=>put(seven,0,id,i<4?'front':'energy',i%4,true));
 const kept=seven.players[1].life.length;
 seven=dispatchUniversalAction(packs,seven,{type:'next'});
 assert.equal(seven.players[1].life.length,kept);

 let bench=toAttack(open(ids,1404));
 put(bench,0,'KMR-1-004','energy',0,true);
 ['KMR-1-001','KMR-1-002','KMR-1-005','KMR-1-006','KMR-1-010','KMR-1-016','KMR-1-018']
  .forEach((id,i)=>put(bench,0,id,i<4?'front':'energy',i<4?i:i-3,true));
 const still=bench.players[1].life.length;
 bench=dispatchUniversalAction(packs,bench,{type:'next'});
 assert.equal(bench.players[1].life.length,still);
 assert.equal(assertUniversalMatch(packs,later),true);
 assert.equal(assertUniversalMatch(packs,eight),true);
});

test('KMR-1-005 raid frame summons only legal rests, then the front main pays 1 AP',()=>{
 assert.match(text('KMR-1-005'),/2枚まで自分のフロントLにレストで登場/);
 const ids=['KMR-1-005','KMR-1-010','KMR-1-086','KMR-1-075','KMR-1-013','KMR-1-085',...FUEL];
 let plain=open(ids,1501);
 fuel(plain);
 const loose=take(plain,0,'KMR-1-005');
 onlyHand(plain,0,[loose]);
 ready(plain);
 plain=play(plain,loose.uid);
 assert.equal(plain.pending,null);
 assert.equal(activates(plain,loose.uid),false);

 let s=open(ids,1502);
 fuel(s);
 const base=put(s,0,'KMR-1-010','front',0,true);
 const pool=['KMR-1-086','KMR-1-075','KMR-1-013','KMR-1-085'].map(id=>take(s,0,id));
 const rider=take(s,0,'KMR-1-005');
 onlyHand(s,0,[rider,...pool]);
 ready(s);
 const before=apReady(s);
 s=raidOnto(s,rider.uid,base.uid);
 assert.equal(s.players[0].front[0].cardId,'KMR-1-005');
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.pending.step,'enter');
 const enters=s.pending.actions.filter(a=>a.mode==='enter');
 assert.deepEqual([...new Set(enters.map(a=>a.uid))].sort(),[pool[0].uid,pool[1].uid].sort());
 assert.equal(s.pending.actions.some(a=>a.mode==='raid'),false);
 assert.equal(enters.every(a=>a.line==='front'),true);
 s=kmr(s,a=>a.mode==='enter'&&a.uid===pool[0].uid&&a.line==='front'&&a.slot===1);
 assert.equal(s.players[0].front[1].ready,false);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending.step,'ready');
 s=kmr(s,a=>a.mode==='ready'&&a.uid===pool[0].uid);
 assert.equal(s.players[0].front[1].ready,true);
 assert.equal(activates(s,rider.uid),true);
 s=use(packs,s,a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(s.pending,null);
 assert.equal(apReady(s),before-2);
 assert.equal(universalBp(packs,s,s.players[0].front[1]),pack.cards['KMR-1-086'].bp+1000);
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),pack.cards[FUEL[0]].bp+1000);
 assert.equal(activates(s,rider.uid),false);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-008 and 009 can pay the hand cost with nothing to summon',()=>{
 assert.match(text('KMR-1-008'),/疾風/);
 assert.match(text('KMR-1-009'),/剛烈/);
 const ids=['KMR-1-008','KMR-1-009','KMR-1-006',...FUEL];
 let s=toAttack(open(ids,1801));
 const self=put(s,0,'KMR-1-008','front',0,true);
 const cost=take(s,0,'KMR-1-006');
 onlyHand(s,0,[cost]);
 let paid=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(paid.pending.step,'revive');
 const declined=kmr(structuredClone(paid),a=>a.mode==='skip');
 assert.equal(declined.players[0].front[0].uid,self.uid);
 assert.equal(declined.players[0].hand.some(c=>c.uid===cost.uid),true);
 paid=kmr(paid,a=>a.mode==='revive');
 paid=kmr(paid,a=>a.mode==='discard'&&a.uid===cost.uid);
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].front[0],null);
 assert.equal(paid.players[0].outside.some(c=>c.uid===self.uid),true);

 let back=toAttack(open(ids,1802));
 const again=put(back,0,'KMR-1-008','front',0,true);
 const hand=take(back,0,'KMR-1-006');
 const storm=take(back,0,'KMR-1-009');
 onlyHand(back,0,[hand]);
 back.players[0].outside.push(storm);
 back=dispatchUniversalAction(packs,back,{type:'next'});
 back=kmr(back,a=>a.mode==='revive');
 back=kmr(back,a=>a.mode==='discard');
 assert.equal(back.pending.step,'enter');
 assert.equal(back.pending.actions.some(a=>a.mode==='raid'),false);
 const rest=back.pending.actions.find(a=>a.mode==='enter'&&a.uid===storm.uid&&a.line==='energy'&&a.slot===0);
 assert.equal(rest.ready,false);
 back=kmr(back,a=>a.mode==='enter'&&a.uid===storm.uid&&a.line==='energy'&&a.slot===0);
 assert.equal(back.players[0].energy.some(c=>c?.uid===storm.uid),true);
 assert.equal(back.players[0].front.some(c=>c?.uid===again.uid),false);

 let quiet=toAttack(open(ids,1803));
 put(quiet,1,'KMR-1-008','front',0,true);
 quiet=dispatchUniversalAction(packs,quiet,{type:'next'});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[1].front[0].cardId,'KMR-1-008');

 let wind=open(ids,1804);
 const nine=put(wind,0,'KMR-1-009','front',0,true);
 nine.buffs=[{bp:-1000,untilTurn:wind.turn}];
 assert.equal(universalBp(packs,wind,nine),4000);
 wind.active=1;
 assert.equal(universalBp(packs,wind,nine),3000);
 wind.active=0;
 silence(wind,nine,0);
 assert.equal(universalBp(packs,wind,nine),2000);

 let gale=toAttack(open(ids,1805));
 const stormSelf=put(gale,0,'KMR-1-009','front',0,true);
 const pay=take(gale,0,'KMR-1-006');
 const stone=take(gale,0,'KMR-1-008');
 const stray=take(gale,0,FUEL[0]);
 onlyHand(gale,0,[pay]);
 gale.players[0].outside.push(stone,stray);
 gale=dispatchUniversalAction(packs,gale,{type:'next'});
 gale=kmr(gale,a=>a.mode==='revive');
 gale=kmr(gale,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(gale.pending.step,'enter');
 const summoned=[...new Set(gale.pending.actions.filter(a=>a.mode==='enter').map(a=>a.uid))];
 assert.deepEqual(summoned,[stone.uid]);
 const rested=gale.pending.actions.find(a=>a.mode==='enter'&&a.uid===stone.uid&&a.line==='front'&&a.slot===1);
 assert.equal(rested.ready,false);
 gale=kmr(gale,a=>a.mode==='enter'&&a.uid===stone.uid&&a.line==='front'&&a.slot===1);
 assert.equal(gale.players[0].front.some(c=>c?.uid===stone.uid),true);
 assert.equal(gale.players[0].front.some(c=>c?.uid===stormSelf.uid),false);
 assert.equal(gale.players[0].outside.some(c=>c.uid===stray.uid),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,back),true);
 assert.equal(assertUniversalMatch(packs,gale),true);
});

test('KMR-1-010 rests for yellow energy and retires at the end of main without a substitute',()=>{
 assert.match(text('KMR-1-010'),/発生エナジー\+【黄】/);
 const ids=['KMR-1-010','KMR-1-025',...FUEL];
 let s=open(ids,1010);
 const self=put(s,0,'KMR-1-010','energy',0,true);
 put(s,0,'KMR-1-025','front',0,true);
 ready(s);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 s=use(packs,s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='selfRestEnergyRetire');
 const live=s.players[0].energy[0];
 assert.equal(live.ready,false);
 assert.equal(universalCardEnergy(pack,s,0,live),2);
 live.ready=true;
 assert.equal(activates(s,self.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.players[0].front[0].cardId,'KMR-1-025');
 let front=open(ids,1011);
 const bench=put(front,0,'KMR-1-010','front',0,true);
 ready(front);
 front=use(packs,front,a=>a.type==='activate'&&a.uid===bench.uid);
 assert.equal(universalCardEnergy(pack,front,0,front.players[0].front[0]),0);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});

test('KMR-1-012 shows the whole top seven and publishes only the taken raid',()=>{
 assert.match(text('KMR-1-012'),/7枚見る/);
 const ids=['KMR-1-012','KMR-1-086','KMR-1-013','KMR-1-010','KMR-1-006','KMR-1-016','KMR-1-017','KMR-1-018',...FUEL];
 let s=open(ids,1012);
 fuel(s);
 const window=['KMR-1-086','KMR-1-013','KMR-1-010','KMR-1-006','KMR-1-016','KMR-1-017','KMR-1-018']
  .map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const self=take(s,0,'KMR-1-012');
 onlyHand(s,0,[self]);
 ready(s);
 s=play(s,self.uid);
 assert.deepEqual(s.pending.data.uids,window.map(c=>c.uid));
 assert.deepEqual(s.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid),[window[0].uid]);
 const seen=universalPrivateChoices(packs,s,0);
 assert.equal(seen.inspected.length,7);
 assert.equal(seen.inspected.some(c=>c.uid===window[1].uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(e=>e.uid===window[1].uid),false);
 s=kmr(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.publicReveals.some(e=>e.uid===window[0].uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);
 const order=s.pending.data.left.slice();
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.uid===s.pending.data.left[0]);
 assert.deepEqual(s.players[0].deck.slice(-order.length).map(c=>c.uid),order);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-013 looks only while raided and raises the take to two with Geiz and Woz',()=>{
 assert.match(text('KMR-1-013'),/『2枚』に代わる/);
 const ids=['KMR-1-013','KMR-1-010','KMR-1-006','KMR-1-002','KMR-1-023','KMR-1-008','KMR-1-030','KMR-1-047','KMR-1-028',...FUEL];
 let plain=open(ids,1013);
 fuel(plain);
 const loose=take(plain,0,'KMR-1-013');
 onlyHand(plain,0,[loose]);
 ready(plain);
 plain=play(plain,loose.uid);
 assert.equal(plain.pending,null);

 let s=open(ids,1014);
 fuel(s);
 const base=put(s,0,'KMR-1-010','front',0,true);
 put(s,0,'KMR-1-006','front',1,true);
 put(s,0,'KMR-1-002','front',2,true);
 const window=['KMR-1-023','KMR-1-008','KMR-1-030','KMR-1-047','KMR-1-028'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const self=take(s,0,'KMR-1-013');
 onlyHand(s,0,[self]);
 ready(s);
 s=raidOnto(s,self.uid,base.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(s.pending.data.max,2);
 assert.deepEqual(s.pending.data.uids,window.map(c=>c.uid));
 assert.deepEqual(s.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid).sort(),[window[0].uid,window[1].uid].sort());
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,5);
 s=kmr(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.pending.actions.some(a=>a.mode==='take'&&a.uid===window[1].uid),true);
 s=kmr(s,a=>a.mode==='done');
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.uid===s.pending.data.left[0]);
 assert.equal(s.players[0].hand.filter(c=>c.uid===window[0].uid).length,1);
 assert.equal(s.publicReveals.some(e=>e.uid===window[0].uid),true);
 assert.equal(s.publicReveals.some(e=>e.uid===window[2].uid),false);

 let one=open(ids,1015);
 fuel(one);
 const host=put(one,0,'KMR-1-010','front',0,true);
 const five=['KMR-1-023','KMR-1-008','KMR-1-030','KMR-1-047','KMR-1-028'].map(id=>take(one,0,id));
 one.players[0].deck.unshift(...five);
 const lone=take(one,0,'KMR-1-013');
 onlyHand(one,0,[lone]);
 ready(one);
 one=raidOnto(one,lone.uid,host.uid);
 assert.equal(one.pending.data.max,1);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-015 through 018 and 020 use the printed energy, step, discard and damage',()=>{
 assert.match(text('KMR-1-015'),/青か赤/);
 assert.match(text('KMR-1-016'),/アクティブの場合/);
 assert.match(text('KMR-1-017'),/【ステップ】/);
 assert.match(text('KMR-1-018'),/カードを1枚引き/);
 assert.match(text('KMR-1-020'),/合計4枚以上/);
 const ids=['KMR-1-015','KMR-1-016','KMR-1-017','KMR-1-018','KMR-1-020','KMR-1-021','KMR-1-024','KMR-1-039','KMR-1-074',...FUEL];
 let s=open(ids,1016);
 const tsukuyomi=take(s,0,'KMR-1-015');
 s.players[0].hand.push(tsukuyomi);
 const printed=pack.cards['KMR-1-015'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),3);
 put(s,1,'KMR-1-039','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 put(s,1,'KMR-1-074','front',1,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 for(const slot of [0,1]){
  const card=s.players[1].front[slot];
  s.players[1].front[slot]=null;
  s.players[1].outside.push(card);
 }
 put(s,1,'KMR-1-021','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),3);

 const vulcan=put(s,0,'KMR-1-016','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,vulcan),2);
 vulcan.ready=false;
 assert.equal(universalCardEnergy(pack,s,0,vulcan),1);
 const front=put(s,0,'KMR-1-017','front',0,true);
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 let moving=open(ids,1017);
 const stepper=put(moving,0,'KMR-1-017','front',0,true);
 assert.equal(legalUniversalActions(packs,moving).some(a=>a.type==='step'),false);
 moving=dispatchUniversalAction(packs,moving,{type:'next'});
 assert.equal(moving.phase,'move');
 assert.equal(legalUniversalActions(packs,moving).some(a=>a.type==='step'&&a.uid===stepper.uid&&a.slot===0),true);
 moving=use(packs,moving,a=>a.type==='step'&&a.uid===stepper.uid&&a.slot===0);
 assert.equal(moving.players[0].energy.some(c=>c?.uid===stepper.uid),true);
 assert.equal(legalUniversalActions(packs,moving).some(a=>a.type==='step'&&a.uid===stepper.uid),false);

 let draw=open(ids,1018);
 const cheetah=take(draw,0,'KMR-1-018');
 onlyHand(draw,0,[cheetah]);
 ready(draw);
 const hand=draw.players[0].hand.length,deck=draw.players[0].deck.length;
 draw=play(draw,cheetah.uid);
 assert.equal(draw.players[0].deck.length,deck-1);
 assert.equal(draw.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,draw).some(a=>a.uid==null),false);
 draw=use(packs,draw,a=>a.type==='chooseDiscard');
 assert.equal(draw.players[0].hand.length,0);

 let damage=open(withCopies(ids,{'KMR-1-021':2}),1020);
 const souther=put(damage,0,'KMR-1-020','front',0,true);
 assert.equal(universalAttackDamage(pack,damage,souther),1);
 for(const id of ['KMR-1-021','KMR-1-016','KMR-1-017'])damage.players[0].outside.push(take(damage,0,id));
 assert.equal(universalAttackDamage(pack,damage,souther),1);
 damage.players[0].outside.push(take(damage,0,'KMR-1-021'));
 assert.equal(universalAttackDamage(pack,damage,souther),1);
 damage.players[0].outside.push(take(damage,0,'KMR-1-024'));
 assert.equal(universalAttackDamage(pack,damage,souther),2);
 assert.equal(assertUniversalMatch(packs,moving),true);
 assert.equal(assertUniversalMatch(packs,draw),true);
});

test('KMR-1-019 pays for every mode only when it did not enter this turn',()=>{
 assert.match(text('KMR-1-019'),/このターン中に登場していない場合/);
 const ids=['KMR-1-019','KMR-1-016',...FUEL];
 let freshRaid=open(ids,1019);
 fuel(freshRaid);
 const base=put(freshRaid,0,'KMR-1-016','front',0,true);
 const rider=take(freshRaid,0,'KMR-1-019');
 onlyHand(freshRaid,0,[rider]);
 ready(freshRaid);
 freshRaid=raidOnto(freshRaid,rider.uid,base.uid);
 assert.equal(freshRaid.pending,null);
 assert.equal(universalImpactNull(pack,freshRaid,freshRaid.players[0].front[0]),false);
 freshRaid=use(packs,freshRaid,a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(freshRaid.pending.actions.some(a=>a.mode==='payAll'),false);
 freshRaid=kmr(freshRaid,a=>a.key==='impact');
 assert.equal(universalImpact(pack,freshRaid,freshRaid.players[0].front[0]),1);
 assert.equal(universalAttackDamage(pack,freshRaid,freshRaid.players[0].front[0]),1);
 assert.equal(universalBp(packs,freshRaid,freshRaid.players[0].front[0]),4000);
 assert.equal(activates(freshRaid,rider.uid),false);

 let older=open(ids,1021);
 fuel(older);
 const host=put(older,0,'KMR-1-016','front',0,true);
 const again=take(older,0,'KMR-1-019');
 onlyHand(older,0,[again]);
 ready(older);
 older=raidOnto(older,again.uid,host.uid);
 older=ownMainAgain(older);
 const spent=apReady(older);
 older=use(packs,older,a=>a.type==='activate'&&a.uid===again.uid);
 assert.equal(older.pending.actions.some(a=>a.mode==='payAll'),true);
 older=kmr(older,a=>a.mode==='payAll');
 const lived=older.players[0].front.find(c=>c?.uid===again.uid);
 assert.equal(apReady(older),spent-1);
 assert.equal(universalImpact(pack,older,lived),1);
 assert.equal(universalAttackDamage(pack,older,lived),2);
 assert.equal(universalBp(packs,older,lived),5000);
 assert.equal(activates(older,again.uid),false);
 let normal=open(ids,1022);
 fuel(normal);
 const played=take(normal,0,'KMR-1-019');
 onlyHand(normal,0,[played]);
 ready(normal);
 normal=play(normal,played.uid);
 assert.equal(activates(normal,played.uid),false);
 assert.equal(assertUniversalMatch(packs,freshRaid),true);
 assert.equal(assertUniversalMatch(packs,older),true);
});

test('KMR-1-021 does not enter from a main-phase raid and its on-play grants Zero-One',()=>{
 assert.match(text('KMR-1-021'),/リアライジングホッパー/);
 assert.match(text('KMR-1-021'),/1ターンに1回のみ/);
 const ids=['KMR-1-021','KMR-1-107','KMR-1-023','KMR-1-022','KMR-1-106','KMR-1-010',...FUEL];
 let s=open(ids,1023);
 fuel(s);
 const base=put(s,0,'KMR-1-023','front',0,true);
 put(s,0,'KMR-1-022','front',1,true);
 put(s,0,'KMR-1-106','front',2,true);
 const hopper=take(s,0,'KMR-1-107');
 const iz=take(s,0,'KMR-1-021');
 onlyHand(s,0,[hopper,iz]);
 ready(s);
 s=raidOnto(s,hopper.uid,base.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===iz.uid),true);
 assert.equal(s.mainReadyOnceByName[0].includes('仮面ライダーゼロツー（イズ）|021'),false);

 let playable=open(ids,1024);
 fuel(playable);
 const zero=put(playable,0,'KMR-1-022','front',0,true);
 const other=put(playable,0,'KMR-1-010','front',1,true);
 const card=take(playable,0,'KMR-1-021');
 onlyHand(playable,0,[card]);
 ready(playable);
 playable=play(playable,card.uid);
 const choices=playable.pending.actions.filter(a=>a.mode==='own').map(a=>a.uid);
 assert.equal(choices.includes(zero.uid),true);
 assert.equal(choices.includes(other.uid),false);
 assert.equal(choices.includes(card.uid),false);
 const skipped=kmr(structuredClone(playable),a=>a.mode==='skip');
 assert.equal(universalBp(packs,skipped,skipped.players[0].front.find(c=>c?.uid===zero.uid)),4000);
 playable=kmr(playable,a=>a.mode==='own'&&a.uid===zero.uid);
 const granted=playable.players[0].front.find(c=>c?.uid===zero.uid);
 assert.equal(universalBp(packs,playable,granted),5000);
 assert.equal(universalAttackDamage(pack,playable,granted),2);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,playable),true);
});

test('KMR-1-022 impact null and the optional hand draw exist only while raided',()=>{
 assert.match(text('KMR-1-022'),/カードを1枚まで引く/);
 const ids=['KMR-1-022','KMR-1-023','KMR-1-006','KMR-1-007','KMR-1-004','KMR-1-039',...FUEL];
 let plain=open(ids,1025);
 fuel(plain);
 const loose=take(plain,0,'KMR-1-022');
 onlyHand(plain,0,[loose]);
 ready(plain);
 plain=play(plain,loose.uid);
 assert.equal(plain.pending,null);
 assert.equal(universalImpactNull(pack,plain,plain.players[0].front[0]),false);

 let s=open(ids,1026);
 fuel(s);
 const base=put(s,0,'KMR-1-023','front',0,true);
 const handCard=take(s,0,'KMR-1-006');
 const outside=take(s,0,'KMR-1-007');
 const heavy=take(s,0,'KMR-1-004');
 const blue=take(s,0,'KMR-1-039');
 const rider=take(s,0,'KMR-1-022');
 onlyHand(s,0,[rider,handCard,heavy,blue]);
 s.players[0].outside.push(outside);
 ready(s);
 const deck=s.players[0].deck.length;
 s=raidOnto(s,rider.uid,base.uid);
 assert.equal(universalImpactNull(pack,s,s.players[0].front[0]),true);
 const offered=[...new Set(s.pending.actions.filter(a=>a.mode==='enter').map(a=>a.uid))].sort();
 assert.deepEqual(offered,[handCard.uid,outside.uid].sort());
 s=kmr(s,a=>a.mode==='enter'&&a.uid===handCard.uid&&a.line==='front'&&a.slot===1);
 assert.equal(s.pending.step,'mayDraw');
 assert.equal(s.players[0].deck.length,deck);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].front[1].ready,false);

 let out=open(ids,1027);
 fuel(out);
 const host=put(out,0,'KMR-1-023','front',0,true);
 const side=take(out,0,'KMR-1-007');
 const top=take(out,0,'KMR-1-022');
 onlyHand(out,0,[top]);
 out.players[0].outside.push(side);
 ready(out);
 const stayed=out.players[0].deck.length;
 out=raidOnto(out,top.uid,host.uid);
 out=kmr(out,a=>a.mode==='enter'&&a.uid===side.uid&&a.line==='front'&&a.slot===1);
 assert.equal(out.pending,null);
 assert.equal(out.players[0].deck.length,stayed);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,out),true);
});

test('KMR-1-024 still discards and retires when the deck or hand is short',()=>{
 assert.match(text('KMR-1-024'),/BPの範囲\+1000/);
 const ids=['KMR-1-024','KMR-1-025','KMR-1-009','KMR-1-008','KMR-1-006','KMR-1-017','KMR-1-010','KMR-1-011',...FUEL];
 let s=open(withCopies(ids,{'KMR-1-025':2}),1028);
 fuel(s);
 const low=put(s,1,'KMR-1-009','front',0,true);
 const high=put(s,1,'KMR-1-008','front',1,true);
 const trait=take(s,0,'KMR-1-025');
 const junk=take(s,0,'KMR-1-006');
 s.players[0].deck.unshift(take(s,0,'KMR-1-010'),take(s,0,'KMR-1-017'));
 const self=take(s,0,'KMR-1-024');
 onlyHand(s,0,[self,trait,junk]);
 ready(s);
 s=play(s,self.uid);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===trait.uid);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===junk.uid);
 const targets=s.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(targets.includes(low.uid),true);
 assert.equal(targets.includes(high.uid),false);
 s=kmr(s,a=>a.mode==='skip');

 let bare=open(ids,1029);
 fuel(bare);
 const victim=put(bare,1,'KMR-1-010','front',0,true);
 bare.players[0].outside.push(...bare.players[0].deck.splice(0),...bare.players[0].hand.splice(0));
 bare.players[0].deck.push(take(bare,0,'KMR-1-006'));
 const only=take(bare,0,'KMR-1-024');
 onlyHand(bare,0,[only]);
 ready(bare);
 bare=play(bare,only.uid);
 assert.equal(bare.pending.step,'discard');
 assert.equal(bare.pending.data.need,1);
 bare=kmr(bare,a=>a.mode==='discard');
 assert.equal(bare.pending.actions.some(a=>a.mode==='retire'&&a.uid===victim.uid),true);
 bare=kmr(bare,a=>a.mode==='skip');

 let empty=open(ids,1030);
 fuel(empty);
 put(empty,1,'KMR-1-010','front',0,true);
 empty.players[0].outside.push(...empty.players[0].deck.splice(0),...empty.players[0].hand.splice(0));
 const last=take(empty,0,'KMR-1-024');
 onlyHand(empty,0,[last]);
 ready(empty);
 empty=play(empty,last.uid);
 assert.equal(empty.pending.step,'retire');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

function board024(seed,place){
 const ids=['KMR-1-024','KMR-1-025','KMR-1-010','KMR-1-006','KMR-1-017','KMR-1-011',...FUEL];
 const s=open(ids,seed);
 fuel(s);
 place(s);
 const junk=[take(s,0,'KMR-1-006'),take(s,0,'KMR-1-017')];
 s.players[0].deck.unshift(take(s,0,'KMR-1-010'),take(s,0,'KMR-1-011'));
 const self=take(s,0,'KMR-1-024');
 onlyHand(s,0,[self,...junk]);
 ready(s);
 return {s,self,junk};
}
function discardTwo(s,junk){
 let next=play(s,s.players[0].hand.find(c=>c.cardId==='KMR-1-024').uid);
 next=kmr(next,a=>a.mode==='discard'&&a.uid===junk[0].uid);
 next=kmr(next,a=>a.mode==='discard'&&a.uid===junk[1].uid);
 return next;
}

test('KMR-1-025 substitutes only an opponent character effect and keeps the cause',()=>{
 assert.match(text('KMR-1-025'),/相手のキャラの効果によって退場する場合/);
 assert.match(text('KMR-1-025'),/【退場時】カードを1枚引き/);
 const opened=board024(1031,s=>{
  put(s,1,'KMR-1-010','front',0,true);
  put(s,1,'KMR-1-025','front',1,true);
 });
 let s=discardTwo(opened.s,opened.junk);
 assert.equal(s.pending.step,'retire');
 s=kmr(s,a=>a.mode==='retire'&&a.uid===s.players[1].front[0].uid);
 assert.equal(s.pending.step,'sub25');
 assert.equal(s.pending.data.retireCause.by,'opponent');
 assert.equal(s.pending.data.retireCause.controller,0);
 assert.equal(s.pending.data.retireCause.sourceUid,opened.self.uid);
 const accepted=kmr(structuredClone(s),a=>a.mode==='sub');
 assert.equal(accepted.players[1].front[0].cardId,'KMR-1-010');
 assert.equal(accepted.players[1].front[1],null);
 assert.equal(accepted.pending.step,'discard');
 const declined=kmr(s,a=>a.mode==='skip');
 assert.equal(declined.players[1].front[0],null);
 assert.equal(declined.players[1].front[1].cardId,'KMR-1-025');
 assert.equal(declined.pending,null);

 const energy=board024(1032,s=>{
  put(s,1,'KMR-1-010','energy',0,true);
  put(s,1,'KMR-1-025','front',0,true);
 });
 const actor=energy.s.players[0].hand.find(c=>c.cardId==='KMR-1-024');
 ready(energy.s);
 energy.s.effectQueue.unshift({op:'retireBatchOne',mode:'threshold',owner:0,targetPlayer:1,
  uid:energy.s.players[1].energy[0].uid,sourceUid:actor.uid});
 let lined=dispatchUniversalAction(packs,energy.s,{type:'next'});
 assert.equal(lined.pending.step,'sub25');
 assert.equal(lined.pending.data.line,'energy');
 assert.equal(lined.pending.data.retireCause.sourceUid,actor.uid);

 const event=open(['KMR-1-030','KMR-1-010','KMR-1-025',...FUEL],1033);
 const victim=put(event,1,'KMR-1-010','front',0,true);
 put(event,1,'KMR-1-025','front',1,true);
 const printed=take(event,0,'KMR-1-030');
 event.players[0].hand.push(printed);
 ready(event);
 event.effectQueue.unshift({op:'retireBatchOne',mode:'threshold',owner:0,targetPlayer:1,
  uid:victim.uid,sourceUid:printed.uid});
 let events=dispatchUniversalAction(packs,event,{type:'next'});
 assert.notEqual(events.pending?.step,'sub25');
 assert.equal(events.players[1].front[0],null);
 assert.equal(events.players[1].front[1].cardId,'KMR-1-025');

 let battle=toAttack(open(['KMR-1-006','KMR-1-010','KMR-1-025',...FUEL],1034));
 const attacker=put(battle,0,'KMR-1-006','front',0,true);
 const blocker=put(battle,1,'KMR-1-010','front',0,true);
 put(battle,1,'KMR-1-025','front',1,true);
 battle=use(packs,battle,a=>a.type==='attack'&&a.uid===attacker.uid);
 battle=use(packs,battle,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.notEqual(battle.pending?.step,'sub25');
 assert.equal(battle.players[1].front[0],null);
 assert.equal(battle.players[1].front[1].cardId,'KMR-1-025');

 let lost=toAttack(open(['KMR-1-004','KMR-1-025',...FUEL],1035));
 const big=put(lost,0,'KMR-1-004','front',0,true);
 const falcon=put(lost,1,'KMR-1-025','front',0,true);
 const before=lost.players[1].deck.length;
 lost=use(packs,lost,a=>a.type==='attack'&&a.uid===big.uid);
 lost=use(packs,lost,a=>a.type==='chooseBlock'&&a.uid===falcon.uid);
 assert.equal(lost.pending.step,'discard');
 assert.equal(lost.players[1].deck.length,before-1);
 assert.equal(lost.players[1].front[0],null);

 const quiet=board024(1036,s=>{
  put(s,1,'KMR-1-010','front',0,true);
  const sub=put(s,1,'KMR-1-025','front',1,true);
  silence(s,sub,1);
 });
 let silenced=discardTwo(quiet.s,quiet.junk);
 silenced=kmr(silenced,a=>a.mode==='retire');
 assert.notEqual(silenced.pending?.step,'sub25');
 assert.equal(silenced.players[1].front[0],null);

 const named=open(withCopies(
  ['KMR-1-024','KMR-1-025','KMR-1-008','KMR-1-006','KMR-1-010','KMR-1-011',...FUEL],
  {'KMR-1-025':3}),1037);
 fuel(named);
 const twin=put(named,1,'KMR-1-025','front',0,true);
 const other=put(named,1,'KMR-1-025','front',1,true);
 const high=put(named,1,'KMR-1-008','front',2,true);
 const trait=take(named,0,'KMR-1-025');
 const junk=take(named,0,'KMR-1-006');
 named.players[0].deck.unshift(take(named,0,'KMR-1-010'),take(named,0,'KMR-1-011'));
 const ark=take(named,0,'KMR-1-024');
 onlyHand(named,0,[ark,trait,junk]);
 ready(named);
 let same=play(named,ark.uid);
 same=kmr(same,a=>a.mode==='discard'&&a.uid===trait.uid);
 same=kmr(same,a=>a.mode==='discard'&&a.uid===junk.uid);
 const listed=same.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(listed.includes(twin.uid),true);
 assert.equal(listed.includes(high.uid),false);
 const deck=same.players[1].deck.length;
 same=kmr(same,a=>a.mode==='retire'&&a.uid===twin.uid);
 assert.notEqual(same.pending?.step,'sub25');
 assert.equal(same.players[1].front.some(c=>c?.uid===twin.uid),false);
 assert.equal(same.players[1].front.some(c=>c?.uid===other.uid),true);
 assert.equal(same.pending.step,'discard');
 assert.equal(same.players[1].deck.length,deck-1);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
 assert.equal(assertUniversalMatch(packs,same),true);
});

function finishKmr(s){
 let guard=0;
 while(s.pending?.kind==='kmr'&&guard++<16){
  const a=s.pending.actions.find(x=>x.mode==='skip'||x.mode==='done')||s.pending.actions[0];
  s=use(packs,s,x=>x.type==='kmr'&&x.mode===a.mode&&(a.uid==null||x.uid===a.uid)&&(a.key==null||x.key===a.key));
 }
 return s;
}
test('life triggers of KMR-1-001 through 025 resolve on the revealed card',()=>{
 assert.equal(text('KMR-1-006'),'');
 assert.equal(text('KMR-1-023'),'');
 const draws=['KMR-1-002','KMR-1-007','KMR-1-009','KMR-1-014','KMR-1-018','KMR-1-025'];
 const gets=['KMR-1-004','KMR-1-021','KMR-1-023'];
 const actives=['KMR-1-003','KMR-1-006','KMR-1-008','KMR-1-024'];
 const plain=['KMR-1-010','KMR-1-011','KMR-1-015','KMR-1-016','KMR-1-017','KMR-1-020'];
 for(const id of draws){
  let s=toAttack(open([id,'KMR-1-006',...FUEL],2000+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  const hand=s.players[1].hand.length;
  s=use(packs,s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending?.trigger,'draw',id);
  s=use(packs,s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.equal(s.players[1].hand.length,hand+1);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of gets){
  let s=toAttack(open([id,'KMR-1-006',...FUEL],2100+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(packs,s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending?.trigger,'get',id);
  s=use(packs,s,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of actives){
  let s=toAttack(open([id,'KMR-1-006','KMR-1-010',...FUEL],2200+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const ally=put(s,1,'KMR-1-010','front',0,false);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(packs,s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending?.trigger,'active',id);
  s=use(packs,s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===ally.uid);
  const woke=s.players[1].front.find(c=>c?.uid===ally.uid);
  assert.equal(woke.ready,true);
  assert.equal(universalBp(packs,s,woke),4000);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of plain){
  let s=toAttack(open([id,'KMR-1-006',...FUEL],2300+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(packs,s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].outside.some(c=>c.uid===trigger.uid),true,id);
  assert.equal(s.players[1].life.length,6,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of ['KMR-1-001','KMR-1-012']){
  let s=toAttack(open([id,'KMR-1-006',...FUEL],2400+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(packs,s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending?.trigger,'color',id);
  s=use(packs,s,a=>a.type==='chooseTrigger'&&a.mode==='colorRestSkip'&&a.uid===poke.uid);
  assert.equal(s.players[0].front.find(c=>c?.uid===poke.uid).ready,false);
  assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===poke.uid),true);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 const raids=[['KMR-1-005','KMR-1-010'],['KMR-1-013','KMR-1-010'],['KMR-1-019','KMR-1-016'],['KMR-1-022','KMR-1-023']];
 for(const [id,baseId] of raids){
  let s=toAttack(open([id,baseId,'KMR-1-006',...FUEL],2500+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const base=put(s,1,baseId,'front',0,true);
  FUEL.forEach((fuelId,slot)=>put(s,1,fuelId,'energy',slot,true));
  s.players[1].deck.push(...s.players[1].hand.splice(0));
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(packs,s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending?.trigger,'raid',id);
  s=use(packs,s,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid);
  const top=s.players[1].front.find(c=>c?.uid===trigger.uid);
  assert.equal(top.ready,true);
  assert.equal(top.stack.some(c=>c?.uid===base.uid),true);
  s=finishKmr(s);
  if(id==='KMR-1-022')assert.equal(universalImpactNull(pack,s,s.players[1].front.find(c=>c?.uid===trigger.uid)),true);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});

test('KMR-1-008 is not returned to hand by an opponent effect',()=>{
 const blue=['SAO-1-046','SAO-1-048','SAO-1-050','SAO-1-102'];
 const titlePacks=[sao,pack];
 const s0=newUniversalMatch(titlePacks,{
  decks:[countsFor(['SAO-2-024',...blue],sao),countsFor(['KMR-1-008','KMR-1-006',...FUEL])],
  seed:1808,first:0
 });
 blue.forEach((id,slot)=>put(s0,0,id,'energy',slot,true));
 const leafa=take(s0,0,'SAO-2-024');
 onlyHand(s0,0,[leafa]);
 const immune=put(s0,1,'KMR-1-008','front',0,true);
 const soft=put(s0,1,'KMR-1-006','front',1,true);
 ready(s0);
 let played=use(titlePacks,s0,a=>a.type==='play'&&a.uid===leafa.uid&&a.line==='front');
 assert.equal(played.pending.kind,'effect-optional-pay-ap');
 played=use(titlePacks,played,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(played.pending.kind,'effect-bounce-bp');
 assert.equal(played.pending.choices.includes(immune.uid),true);
 assert.equal(played.pending.choices.includes(soft.uid),true);
 const stayed=use(titlePacks,structuredClone(played),a=>a.type==='chooseBounceBp'&&a.uid===immune.uid);
 assert.equal(stayed.players[1].front.some(c=>c?.uid===immune.uid),true);
 assert.equal(stayed.players[1].hand.some(c=>c.uid===immune.uid),false);
 const bounced=use(titlePacks,played,a=>a.type==='chooseBounceBp'&&a.uid===soft.uid);
 assert.equal(bounced.players[1].front.some(c=>c?.uid===soft.uid),false);
 assert.equal(bounced.players[1].hand.some(c=>c.uid===soft.uid),true);
 assert.equal(assertUniversalMatch(titlePacks,stayed),true);
 assert.equal(assertUniversalMatch(titlePacks,bounced),true);
});

test('impact null on KMR-1-007 and KMR-1-008 stops the winning impact',()=>{
 assert.match(text('KMR-1-007'),/【インパクト無効】/);
 for(const id of ['KMR-1-007','KMR-1-008']){
  let s=toAttack(open(['KMR-1-001',id,...FUEL],2600+Number(id.slice(-3))));
  const attacker=put(s,0,'KMR-1-001','front',0,true);
  const wall=put(s,1,id,'front',0,true);
  assert.equal(universalImpact(pack,s,attacker),1);
  assert.equal(universalImpactNull(pack,s,wall),true);
  const life=s.players[1].life.length;
  s=use(packs,s,a=>a.type==='attack'&&a.uid===attacker.uid);
  s=use(packs,s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
  assert.equal(s.players[1].life.length,life);
  assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
