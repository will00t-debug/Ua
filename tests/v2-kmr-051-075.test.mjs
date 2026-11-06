import test from 'node:test';
import assert from 'node:assert/strict';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalEnergyByColor,universalImpact,universalPrivateChoices,
 universalPublicView,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const BLUE=['KMR-1-036','KMR-1-046','KMR-1-053','KMR-1-059'];
const RED=['KMR-1-070','KMR-1-083'];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
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
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
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
function open(ids,seed){
 const counts=Array.isArray(ids)?countsFor(ids):ids;
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
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
function line(s,p,ids,zone='energy'){ids.forEach((id,i)=>put(s,p,id,zone,i,true));}
function ready(s){
 s.pending=null;s.phase='main';
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
}
function use(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No action pending '+(s.pending?.kind||'-')+'/'+(s.pending?.step||'')+' id '+(s.pending?.id||''));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,zone='front'){return use(s,a=>a.type==='play'&&a.uid===uid&&a.line===zone&&a.replaceUid==null);}
function raidOnto(s,uid,baseUid){return use(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);}
function event(s,uid){return use(s,a=>a.type==='event'&&a.uid===uid);}
function kmr(s,pred){return use(s,a=>a.type==='kmr'&&pred(a));}
function act(s,uid){return use(s,a=>a.type==='activate'&&a.uid===uid);}
function activates(s,uid){return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);}
function onlyHand(s,p,cards){s.players[p].deck.push(...s.players[p].hand.splice(0));s.players[p].hand.push(...cards);}
function find(s,p,uid){
 const pl=s.players[p];
 const piles=[...pl.front,...pl.energy,...pl.hand,...pl.deck,...pl.outside,...pl.life,...(pl.removed||[])];
 return piles.find(c=>c?.uid===uid)||
  [...pl.front,...pl.energy].filter(Boolean).flatMap(c=>[...(c.under||[]),...(c.stack||[])]).find(c=>c?.uid===uid);
}
function bury(host,card){
 card.faceDown=true;card.ready=false;card.stack=[];card.fieldEntryStamp=null;
 host.under??=[];host.under.push(card);
}
function silence(s,card,controller=0){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function toAttack(s){
 let guard=0;
 while(s.phase!=='attack'){
  if(s.pending)throw Error('Pending '+s.pending.kind+'/'+(s.pending.step||'')+' blocked attack');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('phase '+s.phase);
 }
 return s;
}
function toSide(s,player){
 let guard=0;
 while(s.active!==player&&guard++<8){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the turn');
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 while(s.phase!=='main'&&guard++<8){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked main');
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 return s;
}
function clearLife(s){
 if(s.pending?.kind!=='life-trigger')return s;
 const skip=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='skip');
 return skip?dispatchUniversalAction(packs,s,skip):s;
}

test('KMR-1-051 tucks the character and its facedown, then silences one front character',()=>{
 let s=open(['KMR-1-051','KMR-1-049','KMR-1-038','KMR-1-026','KMR-1-027',...BLUE],51051);
 line(s,0,BLUE);
 const host=put(s,0,'KMR-1-049','front',0,true);
 const layer=take(s,0,'KMR-1-026');
 bury(host,layer);
 const foe=put(s,1,'KMR-1-038','front',0,true);
 foe.buffs=[{bp:500,untilTurn:s.turn}];
 const body=take(s,0,'KMR-1-051');
 onlyHand(s,0,[body]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=play(s,body.uid);
 assert.equal(s.pending.step,'tuck');
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 let again=open(['KMR-1-051','KMR-1-049','KMR-1-038','KMR-1-026','KMR-1-027',...BLUE],51052);
 line(again,0,BLUE);
 const host2=put(again,0,'KMR-1-049','front',0,true);
 const kept=take(again,0,'KMR-1-026');
 again.players[0].deck.push(take(again,0,'KMR-1-027'));
 bury(host2,kept);
 const victim=put(again,1,'KMR-1-038','front',0,true);
 victim.buffs=[{bp:500,untilTurn:again.turn}];
 const played=take(again,0,'KMR-1-051');
 onlyHand(again,0,[played]);
 ready(again);
 const before=again.players[0].deck.length;
 again=play(again,played.uid);
 again=kmr(again,a=>a.mode==='tuck'&&a.uid===host2.uid);
 const maximum=again.players[0].front.find(c=>c?.uid===played.uid);
 assert.equal(again.players[0].deck.length,before-1);
 assert.deepEqual(maximum.under.map(c=>c.uid),[host2.uid,kept.uid]);
 assert.equal(maximum.under.every(c=>c.faceDown===true),true);
 assert.equal(again.players[0].front.some(c=>c?.uid===host2.uid),false);
 const pub=universalPublicView(pack,again,1);
 const mine=pub.players[0];
 const faced=JSON.stringify(mine);
 assert.equal(faced.includes(kept.cardId),false);
 assert.equal(faced.includes('"faceDown":true'),true);
 assert.equal(universalPrivateChoices(pack,again,1),null);
 again=kmr(again,a=>a.mode==='silence'&&a.uid===victim.uid);
 const silenced=again.players[1].front.find(c=>c?.uid===victim.uid);
 assert.equal(universalBp(pack,again,silenced),3000);
 assert.equal(again.continuousStates.some(e=>e.kind==='originalEffectsDisabled'&&
  e.targetUid===victim.uid&&e.until.phase==='start'&&e.until.edge==='start'),true);
 assert.equal(legalUniversalActions(packs,again).some(a=>a.type==='reorderUnder'&&a.uid===played.uid),true);
 const order=maximum.under.map(c=>c.uid);
 again=use(again,a=>a.type==='reorderUnder'&&a.uid===played.uid&&a.index===0);
 const swapped=again.players[0].front.find(c=>c?.uid===played.uid).under.map(c=>c.uid);
 assert.notDeepEqual(swapped,order);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,again),true);
});

test('KMR-1-051 spends a facedown only for an opponent effect',()=>{
 let s=open(['KMR-1-051','KMR-1-067','KMR-1-048','KMR-1-026','KMR-1-006',...BLUE],51053);
 line(s,0,BLUE);
 line(s,1,BLUE);
 put(s,1,'KMR-1-048','front',0,true);
 const body=put(s,0,'KMR-1-051','front',0,true);
 bury(body,take(s,0,'KMR-1-026'));
 const evt=take(s,1,'KMR-1-067');
 onlyHand(s,1,[evt]);
 ready(s);
 s=toSide(s,1);
 s=event(s,evt.uid);
 assert.equal(s.pending.id,'KMR-1-067');
 s=kmr(s,a=>a.mode==='retire'&&a.uid===body.uid);
 assert.equal(s.pending.step,'spend51');
 assert.equal(s.pending.actions.some(a=>a.mode==='layer'&&a.uid===body.under[0].uid),true);
 s=kmr(s,a=>a.mode==='layer');
 assert.equal(s.players[0].front.some(c=>c?.uid===body.uid),true);
 assert.equal(s.players[0].front.find(c=>c?.uid===body.uid).under.length,0);
 assert.equal(s.players[0].outside.some(c=>c.cardId==='KMR-1-026'),true);
 assert.equal(s.pending,null);

 let decline=open(['KMR-1-051','KMR-1-067','KMR-1-048','KMR-1-026',...BLUE],51054);
 line(decline,0,BLUE);line(decline,1,BLUE);
 put(decline,1,'KMR-1-048','front',0,true);
 const stayed=put(decline,0,'KMR-1-051','front',0,true);
 bury(stayed,take(decline,0,'KMR-1-026'));
 const bomb=take(decline,1,'KMR-1-067');
 onlyHand(decline,1,[bomb]);
 ready(decline);
 decline=toSide(decline,1);
 decline=event(decline,bomb.uid);
 decline=kmr(decline,a=>a.mode==='retire'&&a.uid===stayed.uid);
 decline=kmr(decline,a=>a.mode==='skip');
 assert.equal(decline.players[0].front.some(c=>c?.uid===stayed.uid),false);
 assert.equal(decline.players[0].outside.some(c=>c.uid===stayed.uid),true);

 let own=open(['KMR-1-051','KMR-1-070','KMR-1-026',...RED],51055);
 const victim=put(own,0,'KMR-1-051','front',0,true);
 bury(victim,take(own,0,'KMR-1-026'));
 const kaiza=put(own,0,'KMR-1-070','front',1,true);
 ready(own);
 own=toAttack(own);
 own=use(own,a=>a.type==='attack'&&a.uid===kaiza.uid);
 assert.equal(own.pending.step,'retireOwn');
 assert.equal(own.pending.actions.some(a=>a.uid===victim.uid),true);
 own=kmr(own,a=>a.mode==='retireOwn'&&a.uid===victim.uid);
 assert.equal(own.pending?.step==='spend51',false);
 assert.equal(own.players[0].outside.some(c=>c.uid===victim.uid),true);

 let battle=open(['KMR-1-051','KMR-1-001','KMR-1-026'],51056);
 const sword=put(battle,0,'KMR-1-001','front',0,true);
 const wall=put(battle,1,'KMR-1-051','front',0,true);
 bury(wall,take(battle,1,'KMR-1-026'));
 ready(battle);
 battle=toAttack(battle);
 battle=use(battle,a=>a.type==='attack'&&a.uid===sword.uid);
 battle=use(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.pending?.step==='spend51',false);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,decline),true);
 assert.equal(assertUniversalMatch(packs,own),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('KMR-1-052 raid bonus, twice attack, and four-facedown anchor follow the raid',()=>{
 let bare=open(['KMR-1-052',...BLUE],52052);
 line(bare,0,BLUE);
 const ordinary=take(bare,0,'KMR-1-052');
 onlyHand(bare,0,[ordinary]);
 ready(bare);
 bare=play(bare,ordinary.uid);
 assert.equal(bare.pending,null);
 assert.equal(universalBp(pack,bare,bare.players[0].front.find(c=>c?.uid===ordinary.uid)),4000);

 let low=open(['KMR-1-052','KMR-1-050',...BLUE],52053);
 line(low,0,BLUE);
 const small=put(low,0,'KMR-1-050','front',0,true);
 const rider=take(low,0,'KMR-1-052');
 onlyHand(low,0,[rider]);
 ready(low);
 low=raidOnto(low,rider.uid,small.uid);
 assert.equal(low.pending,null);
 const lowTop=low.players[0].front.find(c=>c?.uid===rider.uid);
 assert.equal(universalBp(pack,low,lowTop),5000);

 let s=open(['KMR-1-052','KMR-1-051','KMR-1-026','KMR-1-027',...BLUE],52054);
 line(s,0,BLUE);
 const base=put(s,0,'KMR-1-051','front',0,true);
 const top=take(s,0,'KMR-1-052');
 onlyHand(s,0,[top]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=raidOnto(s,top.uid,base.uid);
 assert.equal(s.pending.step,'tuckTop');
 s=kmr(s,a=>a.mode==='tuckTop');
 assert.equal(s.players[0].deck.length,deck-1);
 let live=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.equal(live.under.length,1);
 assert.equal(live.under[0].faceDown,true);
 bury(live,take(s,0,'KMR-1-026'));
 assert.equal(universalBp(pack,s,live),5000);
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===top.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=clearLife(s);
 live=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.equal(live.ready,true);
 s=use(s,a=>a.type==='attack'&&a.uid===top.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=clearLife(s);
 live=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.equal(live.ready,false);

 let wall=open(['KMR-1-052','KMR-1-051','KMR-1-067','KMR-1-048','KMR-1-026','KMR-1-027','KMR-1-006',...BLUE],52055);
 line(wall,0,BLUE);line(wall,1,BLUE);
 put(wall,1,'KMR-1-048','front',0,true);
 const anchorBase=put(wall,0,'KMR-1-051','front',0,true);
 const anchor=take(wall,0,'KMR-1-052');
 onlyHand(wall,0,[anchor]);
 ready(wall);
 wall=raidOnto(wall,anchor.uid,anchorBase.uid);
 wall=kmr(wall,a=>a.mode==='skip');
 let anchored=wall.players[0].front.find(c=>c?.uid===anchor.uid);
 for(const id of ['KMR-1-026','KMR-1-027','KMR-1-006','KMR-1-048'])bury(anchored,take(wall,0,id));
 anchored.buffs=[{bp:-1000,untilTurn:wall.turn}];
 assert.equal(universalBp(pack,wall,anchored),5000);
 const strike=take(wall,1,'KMR-1-067');
 onlyHand(wall,1,[strike]);
 wall=toSide(wall,1);
 wall=event(wall,strike.uid);
 assert.equal(wall.pending.actions.some(a=>a.uid===anchor.uid),true);
 wall=kmr(wall,a=>a.mode==='retire'&&a.uid===anchor.uid);
 assert.equal(wall.pending,null);
 assert.equal(wall.players[0].front.some(c=>c?.uid===anchor.uid),true);
 const quiet=wall.players[0].front.find(c=>c?.uid===anchor.uid);
 quiet.buffs=[{bp:500,untilTurn:wall.turn}];
 assert.equal(universalBp(pack,wall,quiet),5500);
 silence(wall,quiet,0);
 assert.equal(universalBp(pack,wall,quiet),4500);
 quiet.buffs.push({bp:-1000,untilTurn:wall.turn});
 assert.equal(universalBp(pack,wall,quiet),3500);
 assert.equal(assertUniversalMatch(packs,bare),true);
 assert.equal(assertUniversalMatch(packs,low),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,wall),true);
});

test('KMR-1-053 shows the whole window and bounces instead of retiring',()=>{
 let s=open(['KMR-1-053','KMR-1-023','KMR-1-065','KMR-1-026','KMR-1-006','KMR-1-004',...BLUE],53053);
 line(s,0,['KMR-1-036','KMR-1-046']);
 const top=take(s,0,'KMR-1-023');
 const mid=take(s,0,'KMR-1-065');
 const last=take(s,0,'KMR-1-026');
 s.players[0].deck.unshift(top,mid,last);
 const body=take(s,0,'KMR-1-053');
 onlyHand(s,0,[body]);
 ready(s);
 const reveals=s.publicReveals.length;
 s=play(s,body.uid);
 assert.equal(s.pending.step,'snipeHand');
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,3);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 s=kmr(s,a=>a.mode==='take'&&a.uid===top.uid);
 assert.deepEqual(s.publicReveals.slice(reveals).map(e=>e.cardId),['KMR-1-023']);
 s=kmr(s,a=>a.mode==='under'&&a.uid===mid.uid);
 s=kmr(s,a=>a.mode==='underHost'&&a.uid===body.uid);
 s=kmr(s,a=>a.mode==='bottom'&&a.uid===last.uid);
 const host=s.players[0].front.find(c=>c?.uid===body.uid);
 assert.equal(host.under.some(c=>c.uid===mid.uid&&c.faceDown),true);
 bury(host,take(s,0,'KMR-1-059'));
 const low=put(s,1,'KMR-1-006','front',0,true);
 put(s,1,'KMR-1-004','front',1,true);
 host.ready=true;
 s=act(s,body.uid);
 assert.equal(s.pending.step,'payUnder');
 assert.equal(s.pending.actions.filter(a=>a.mode==='pay').length,2);
 const paid=s.pending.actions.find(a=>a.mode==='pay'&&a.uid!==mid.uid).uid;
 s=kmr(s,a=>a.mode==='pay'&&a.uid===paid);
 assert.equal(s.players[0].outside.some(c=>c.uid===paid&&c.faceDown!==true),true);
 assert.equal(s.players[0].front.find(c=>c?.uid===body.uid).under.some(c=>c.uid===mid.uid),true);
 assert.equal(s.pending.step,'bounceFront');
 assert.equal(s.pending.actions.some(a=>a.uid===low.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid&&find(s,1,a.uid)?.cardId==='KMR-1-004'),false);
 s=kmr(s,a=>a.mode==='bounce'&&a.uid===low.uid);
 assert.equal(s.players[1].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),false);
 assert.equal(activates(s,body.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-054 removes Impact from the character it battles',()=>{
 let nulled=open(['KMR-1-001','KMR-1-054'],54054);
 const attacker=put(nulled,0,'KMR-1-001','front',0,true);
 const wall=put(nulled,1,'KMR-1-054','front',0,true);
 ready(nulled);
 const life=nulled.players[1].life.length;
 assert.equal(universalImpact(pack,nulled,attacker),1);
 nulled=toAttack(nulled);
 nulled=use(nulled,a=>a.type==='attack'&&a.uid===attacker.uid);
 nulled=use(nulled,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(nulled.players[1].life.length,life);
 assert.equal(nulled.players[1].outside.some(c=>c.uid===wall.uid),true);

 let openImpact=open(['KMR-1-001','KMR-1-057'],54057);
 const sword=put(openImpact,0,'KMR-1-001','front',0,true);
 const plain=put(openImpact,1,'KMR-1-057','front',0,true);
 ready(openImpact);
 const other=openImpact.players[1].life.length;
 openImpact=toAttack(openImpact);
 openImpact=use(openImpact,a=>a.type==='attack'&&a.uid===sword.uid);
 openImpact=use(openImpact,a=>a.type==='chooseBlock'&&a.uid===plain.uid);
 assert.equal(openImpact.players[1].life.length,other-1);
 assert.equal(assertUniversalMatch(packs,nulled),true);
 assert.equal(assertUniversalMatch(packs,openImpact),true);
});

test('KMR-1-055 and 069 draw one and discard one',()=>{
 for(const id of ['KMR-1-055','KMR-1-069']){
  let s=open([id],55000+Number(id.slice(-2)));
  const body=take(s,0,id);
  onlyHand(s,0,[body]);
  ready(s);
  const deck=s.players[0].deck.length;
  s=play(s,body.uid);
  assert.equal(s.players[0].deck.length,deck-1);
  assert.equal(s.pending.kind,'effect-discard');
  s=use(s,a=>a.type==='chooseDiscard');
  assert.equal(s.players[0].hand.length,0);
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});

test('KMR-1-056 and 073 add one energy of their color while active',()=>{
 let s=open(['KMR-1-056','KMR-1-073'],56056);
 const blue=put(s,0,'KMR-1-056','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,blue),2);
 assert.ok((universalEnergyByColor(pack,s,0).blue||0)>=2);
 blue.buffs=[{energy:1,color:'blue',untilTurn:s.turn}];
 assert.equal(universalCardEnergy(pack,s,0,blue),3);
 silence(s,blue);
 assert.equal(universalCardEnergy(pack,s,0,blue),2);
 const red=put(s,0,'KMR-1-073','energy',1,true);
 assert.equal(universalCardEnergy(pack,s,0,red),2);
 red.ready=false;
 assert.equal(universalCardEnergy(pack,s,0,red),1);
 s.players[0].energy[0]=null;s.players[0].front[0]=blue;
 assert.equal(universalCardEnergy(pack,s,0,blue),0);
 s.players[0].front[0]=null;s.players[0].energy[0]=blue;
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-058 chooses a facedown under a Doctor or a rested Doctor',()=>{
 let s=open(['KMR-1-058','KMR-1-055','KMR-1-049',...BLUE],58058);
 line(s,0,['KMR-1-036','KMR-1-046']);
 const doctor=put(s,0,'KMR-1-049','front',0,true);
 const top=s.players[0].deck[0];
 const body=take(s,0,'KMR-1-058');
 onlyHand(s,0,[body]);
 ready(s);
 s=play(s,body.uid);
 assert.equal(s.pending.actions.filter(a=>a.mode==='mode').map(a=>a.key).sort().join(','),'deploy,under');
 s=kmr(s,a=>a.mode==='mode'&&a.key==='under');
 s=kmr(s,a=>a.mode==='own'&&a.uid===doctor.uid);
 const live=s.players[0].front.find(c=>c?.uid===doctor.uid);
 assert.equal(live.under.some(c=>c.uid===top.uid&&c.faceDown),true);
 assert.equal(universalBp(pack,s,live),universalBp(pack,s,live));
 assert.equal((live.buffs||[]).some(b=>b.bp===1000),true);

 let other=open(['KMR-1-058','KMR-1-055',...BLUE],58059);
 line(other,0,['KMR-1-036','KMR-1-046']);
 const brave=take(other,0,'KMR-1-058');
 const recruit=take(other,0,'KMR-1-055');
 onlyHand(other,0,[brave,recruit]);
 ready(other);
 other=play(other,brave.uid);
 other=kmr(other,a=>a.mode==='mode'&&a.key==='deploy');
 const entry=other.pending.actions.find(a=>a.uid===recruit.uid&&a.mode==='enter');
 assert.equal(entry.ready,false);
 other=kmr(other,a=>a.mode==='enter'&&a.uid===recruit.uid&&a.slot===entry.slot);
 assert.equal(other.pending.kind,'effect-discard');
 const summoned=other.players[0].front.find(c=>c?.uid===recruit.uid)||
  other.players[0].energy.find(c=>c?.uid===recruit.uid);
 assert.equal(summoned.ready,false);
 other=use(other,a=>a.type==='chooseDiscard');
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,other),true);
});

test('KMR-1-059 on play looks at five, reveals one Ex-Aid character, then discards',()=>{
 let s=open(['KMR-1-059','KMR-1-049','KMR-1-065','KMR-1-026','KMR-1-027','KMR-1-006',...BLUE],59059);
 line(s,0,['KMR-1-036','KMR-1-046']);
 const hit=take(s,0,'KMR-1-049');
 const miss=take(s,0,'KMR-1-065');
 const rest=[take(s,0,'KMR-1-026'),take(s,0,'KMR-1-027'),take(s,0,'KMR-1-006')];
 s.players[0].deck.unshift(hit,miss,...rest);
 const body=take(s,0,'KMR-1-059');
 const spare=s.players[0].deck.pop();
 onlyHand(s,0,[body,spare]);
 ready(s);
 const reveals=s.publicReveals.length;
 s=play(s,body.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,5);
 assert.equal(universalPrivateChoices(pack,s,0).options.filter(o=>o.action.mode==='take').length,1);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 s=kmr(s,a=>a.mode==='done');
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(s.players[0].hand.some(c=>c.uid===spare.uid),true);

 let takeOne=open(['KMR-1-059','KMR-1-049','KMR-1-065','KMR-1-026','KMR-1-027','KMR-1-006',...BLUE],59060);
 line(takeOne,0,['KMR-1-036','KMR-1-046']);
 const character=take(takeOne,0,'KMR-1-049');
 const eventCard=take(takeOne,0,'KMR-1-065');
 const tail=[take(takeOne,0,'KMR-1-026'),take(takeOne,0,'KMR-1-027'),take(takeOne,0,'KMR-1-006')];
 takeOne.players[0].deck.unshift(character,eventCard,...tail);
 const laser=take(takeOne,0,'KMR-1-059');
 const fuel=takeOne.players[0].deck.pop();
 onlyHand(takeOne,0,[laser,fuel]);
 ready(takeOne);
 const shown=takeOne.publicReveals.length;
 takeOne=play(takeOne,laser.uid);
 takeOne=kmr(takeOne,a=>a.mode==='take'&&a.uid===character.uid);
 assert.deepEqual(takeOne.publicReveals.slice(shown).map(e=>e.cardId),['KMR-1-049']);
 takeOne=kmr(takeOne,a=>a.mode==='next'&&a.uid===eventCard.uid);
 takeOne=kmr(takeOne,a=>a.mode==='next'&&a.uid===tail[0].uid);
 takeOne=kmr(takeOne,a=>a.mode==='next'&&a.uid===tail[1].uid);
 takeOne=kmr(takeOne,a=>a.mode==='next'&&a.uid===tail[2].uid);
 assert.equal(takeOne.pending.step,'discard');
 takeOne=kmr(takeOne,a=>a.mode==='discard'&&a.uid===fuel.uid);
 assert.equal(takeOne.players[0].hand.some(c=>c.uid===character.uid),true);
 assert.equal(takeOne.players[0].outside.some(c=>c.uid===fuel.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,takeOne),true);
});

test('KMR-1-060 buffs another character, then rests and tucks itself under Ex-Aid',()=>{
 let s=open(['KMR-1-060','KMR-1-049',...BLUE],60060);
 line(s,0,['KMR-1-036']);
 const host=put(s,0,'KMR-1-049','front',0,true);
 const body=take(s,0,'KMR-1-060');
 onlyHand(s,0,[body]);
 ready(s);
 s=play(s,body.uid);
 s=kmr(s,a=>a.mode==='own'&&a.uid===host.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===host.uid).buffs.some(b=>b.bp===1000),true);
 const live=s.players[0].front.find(c=>c?.uid===body.uid)||s.players[0].energy.find(c=>c?.uid===body.uid);
 live.ready=true;
 s=act(s,body.uid);
 assert.equal(s.pending.actions.some(a=>a.uid===host.uid),true);
 s=kmr(s,a=>a.mode==='own'&&a.uid===host.uid);
 const after=s.players[0].front.find(c=>c?.uid===host.uid);
 assert.equal(after.under.some(c=>c.uid===body.uid&&c.faceDown),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===body.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-061 reduces its hand cost when the opponent has yellow or red',()=>{
 let s=open(['KMR-1-061','KMR-1-027','KMR-1-068','KMR-1-056'],61061);
 const printed=pack.cards['KMR-1-061'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),3);
 const yellow=put(s,1,'KMR-1-027','energy',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 s.players[1].energy[0]=null;
 s.players[1].deck.push(yellow);
 const blue=put(s,1,'KMR-1-056','energy',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),3);
 s.players[1].energy[0]=null;
 s.players[1].deck.push(blue);
 put(s,1,'KMR-1-068','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-062 draws once per turn after three OOO discards',()=>{
 let s=open(withCopies(['KMR-1-062','KMR-1-040','KMR-1-026','KMR-1-027','KMR-1-006'],{'KMR-1-062':2}),62062);
 const source=put(s,0,'KMR-1-040','front',0,true);
 const first=put(s,0,'KMR-1-062','energy',0,true);
 const second=put(s,0,'KMR-1-062','energy',1,true);
 ready(s);
 assert.equal(activates(s,first.uid),false);
 for(const id of ['KMR-1-026','KMR-1-027','KMR-1-006']){
  const card=take(s,0,id);
  const order=s.nextZoneMoveOrder++;
  s.zoneMoveEvents.push({order,turn:s.turn,owner:0,controller:0,uid:card.uid,cardId:card.cardId,
   from:'hand',to:'outside',reason:'own-effect',sourceUid:source.uid,sourceCardId:source.cardId,
   sourceName:pack.cards[source.cardId].name,sourceColor:'yellow',sourceOnField:true});
  s.players[0].outside.push(card);
 }
 const deck=s.players[0].deck.length;
 s=act(s,first.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].energy.find(c=>c?.uid===first.uid).ready,false);
 assert.equal(activates(s,second.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-063 and 065 return from outside after an OOO attack, including an empty hand',()=>{
 let s=open(withCopies(['KMR-1-063','KMR-1-040',...BLUE],{'KMR-1-063':2}),63063);
 line(s,0,['KMR-1-036','KMR-1-046']);
 const ooo=put(s,0,'KMR-1-040','front',0,true);
 const first=take(s,0,'KMR-1-063');
 const second=take(s,0,'KMR-1-063');
 onlyHand(s,0,[first]);
 s.players[0].outside.push(second);
 ready(s);
 const deck=s.players[0].deck.length;
 s=event(s,first.uid);
 assert.equal(s.players[0].deck.length,deck-2);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===ooo.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=clearLife(s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.pending.step,'medalBack');
 s=kmr(s,a=>a.mode==='back');
 assert.equal(s.pending.step,'placeHand');
 assert.equal(s.players[0].hand.length,1);
 const returned=s.pending.actions[0].uid;
 assert.equal(returned,s.players[0].hand[0].uid);
 s=kmr(s,a=>a.mode==='bottom'&&a.uid===returned);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.at(-1).uid,returned);
 assert.equal(s.players[0].outside.some(c=>c.cardId==='KMR-1-063'),true);

 let quiet=open(['KMR-1-065','KMR-1-040','KMR-1-006',...BLUE],63065);
 line(quiet,0,['KMR-1-036']);
 const ally=put(quiet,0,'KMR-1-040','front',0,true);
 const medal=take(quiet,0,'KMR-1-065');
 onlyHand(quiet,0,[medal]);
 ready(quiet);
 const before=quiet.players[0].deck.length;
 quiet=event(quiet,medal.uid);
 assert.equal(quiet.players[0].deck.length,before-1);
 assert.equal(quiet.pending.step,'own');
 quiet=kmr(quiet,a=>a.mode==='own'&&a.uid===ally.uid);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===ally.uid).buffs.some(b=>b.bp===500),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('KMR-1-064 raises the BP ceiling only with OOO and three other hand cards',()=>{
 function board(seed,handIds,ooo,small){
  let s=open(['KMR-1-064','KMR-1-040','KMR-1-006','KMR-1-039','KMR-1-004','KMR-1-026','KMR-1-027',...BLUE],seed);
  line(s,0,['KMR-1-046','KMR-1-053']);
  if(ooo)put(s,0,'KMR-1-040','front',0,true);
  if(small)put(s,1,'KMR-1-006','front',0,true);
  put(s,1,'KMR-1-039','front',1,true);
  put(s,1,'KMR-1-004','front',2,true);
  const evt=take(s,0,'KMR-1-064');
  const extras=handIds.map(id=>take(s,0,id));
  onlyHand(s,0,[evt,...extras]);
  ready(s);
  s=event(s,evt.uid);
  return s;
 }
 let low=board(64064,[],false,false);
 assert.equal(low.pending,null);
 let mid=board(64065,[],true,true);
 assert.equal(mid.pending.actions.some(a=>find(mid,1,a.uid)?.cardId==='KMR-1-039'),true);
 assert.equal(mid.pending.actions.some(a=>find(mid,1,a.uid)?.cardId==='KMR-1-004'),false);
 let high=board(64066,['KMR-1-026','KMR-1-027','KMR-1-006'],true,true);
 assert.equal(high.pending.actions.some(a=>find(high,1,a.uid)?.cardId==='KMR-1-004'),true);
 assert.equal(high.pending.actions.some(a=>a.mode==='skip'),false);
 let hands=board(64067,['KMR-1-026','KMR-1-027','KMR-1-006'],false,false);
 assert.equal(hands.pending,null);
 high=kmr(high,a=>a.mode==='retire'&&find(high,1,a.uid)?.cardId==='KMR-1-006');
 assert.equal(high.players[1].outside.some(c=>c.cardId==='KMR-1-006'),true);
 assert.equal(assertUniversalMatch(packs,low),true);
 assert.equal(assertUniversalMatch(packs,mid),true);
 assert.equal(assertUniversalMatch(packs,high),true);
 assert.equal(assertUniversalMatch(packs,hands),true);
});

test('KMR-1-066 recovers up to two AP, and its final trigger does not play the event',()=>{
 let s=open(['KMR-1-066',...BLUE],66066);
 line(s,0,['KMR-1-036','KMR-1-046']);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 s.players[0].apCards[2].ready=true;
 const evt=take(s,0,'KMR-1-066');
 onlyHand(s,0,[evt]);
 ready(s);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 s=event(s,evt.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 const readyNow=new Set(s.players[0].apCards.filter(c=>c.ready).map(c=>c.uid));
 assert.equal(legalUniversalActions(packs,s).filter(a=>a.type==='chooseApRecovery'&&a.uid)
  .every(a=>!readyNow.has(a.uid)),true);
 const rested=s.players[0].apCards.filter(c=>!c.ready);
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid===rested[0].uid);
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid==null);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested[0].uid).ready,true);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested[1].uid).ready,false);

 let early=toAttack(open(['KMR-1-066','KMR-1-006'],66067));
 const poke=put(early,0,'KMR-1-006','front',0,true);
 const trigger=take(early,1,'KMR-1-066');
 const buried=early.players[1].life[0];
 early.players[1].life[0]=trigger;early.players[1].deck.push(buried);
 early=use(early,a=>a.type==='attack'&&a.uid===poke.uid);
 early=use(early,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(early.pending,null);
 assert.equal(early.players[1].outside.some(c=>c.uid===trigger.uid),true);

 let last=toAttack(open(['KMR-1-066','KMR-1-006'],66068));
 const sword=put(last,0,'KMR-1-006','front',0,true);
 const finalCard=take(last,1,'KMR-1-066');
 last.players[1].deck.push(...last.players[1].life.splice(0));
 last.players[1].life.push(finalCard);
 const recovered=last.players[1].deck[0];
 last=use(last,a=>a.type==='attack'&&a.uid===sword.uid);
 last=use(last,a=>a.type==='chooseBlock'&&a.uid==null);
 last=use(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life[0].uid,recovered.uid);
 assert.equal(last.players[1].outside.some(c=>c.uid===finalCard.uid),true);
 assert.equal(last.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,early),true);
 assert.equal(assertUniversalMatch(packs,last),true);
});

test('KMR-1-067 retires up to 3000, or 5000 while Ex-Aid or Genm is on the field',()=>{
 let s=open(['KMR-1-067','KMR-1-048','KMR-1-006','KMR-1-004',...BLUE],67067);
 line(s,0,BLUE);
 put(s,1,'KMR-1-006','front',0,true);
 put(s,1,'KMR-1-004','front',1,true);
 const evt=take(s,0,'KMR-1-067');
 onlyHand(s,0,[evt]);
 ready(s);
 s=event(s,evt.uid);
 assert.equal(s.pending.actions.some(a=>find(s,1,a.uid)?.cardId==='KMR-1-006'),true);
 assert.equal(s.pending.actions.some(a=>find(s,1,a.uid)?.cardId==='KMR-1-004'),false);
 let wide=open(['KMR-1-067','KMR-1-048','KMR-1-006','KMR-1-004',...BLUE],67068);
 line(wide,0,BLUE);
 put(wide,0,'KMR-1-048','front',0,true);
 put(wide,1,'KMR-1-006','front',0,true);
 put(wide,1,'KMR-1-004','front',1,true);
 const bomb=take(wide,0,'KMR-1-067');
 onlyHand(wide,0,[bomb]);
 ready(wide);
 wide=event(wide,bomb.uid);
 assert.equal(wide.pending.actions.some(a=>find(wide,1,a.uid)?.cardId==='KMR-1-004'),true);
 wide=kmr(wide,a=>a.mode==='retire'&&find(wide,1,a.uid)?.cardId==='KMR-1-004');
 assert.equal(wide.players[1].outside.some(c=>c.cardId==='KMR-1-004'),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,wide),true);
});

test('KMR-1-068 rests, leaves, and adds one Sparkle Cut',()=>{
 let s=open(withCopies(['KMR-1-068','KMR-1-100'],{'KMR-1-100':2}),68068);
 const body=put(s,0,'KMR-1-068','front',0,true);
 const first=take(s,0,'KMR-1-100');
 const second=take(s,0,'KMR-1-100');
 s.players[0].outside.push(first,second);
 ready(s);
 s=act(s,body.uid);
 assert.equal(s.pending.step,'sparkleHand');
 assert.equal(s.pending.actions.filter(a=>a.mode==='sparkleHand').length,2);
 s=kmr(s,a=>a.mode==='sparkleHand'&&a.uid===first.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===first.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===second.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===body.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===body.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-070 gains BP on an open front and may retire one front character',()=>{
 let s=open(['KMR-1-070','KMR-1-072','KMR-1-069','KMR-1-090','KMR-1-056'],70070);
 const body=put(s,0,'KMR-1-070','front',0,true);
 const ally=put(s,0,'KMR-1-072','front',1,true);
 const energy=put(s,0,'KMR-1-056','energy',0,true);
 assert.equal(universalBp(pack,s,body),4000);
 put(s,0,'KMR-1-069','front',2,true);
 put(s,0,'KMR-1-090','front',3,true);
 assert.equal(universalBp(pack,s,s.players[0].front[0]),3000);
 ready(s);
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===body.uid);
 assert.equal(s.pending.actions.some(a=>a.uid===energy.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===ally.uid),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.players[0].front.some(c=>c?.uid===ally.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-071 discards on entry and summons one rested Deneb that turn',()=>{
 let s=open(['KMR-1-071','KMR-1-091','KMR-1-090',...RED],71071);
 line(s,0,RED);
 const ally=put(s,0,'KMR-1-090','front',1,true);
 const deneb=take(s,0,'KMR-1-091');
 const body=take(s,0,'KMR-1-071');
 const spare=s.players[0].deck.pop();
 onlyHand(s,0,[body,deneb,spare]);
 ready(s);
 s=play(s,body.uid);
 assert.equal(s.pending.step,'discard');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===spare.uid);
 const live=s.players[0].front.find(c=>c?.uid===body.uid)||s.players[0].energy.find(c=>c?.uid===body.uid);
 assert.equal(live.entryTurn,s.turn);
 live.ready=true;
 s=act(s,body.uid);
 const entry=s.pending.actions.find(a=>a.uid===deneb.uid&&a.mode==='enter'&&a.line==='front');
 assert.equal(entry.ready,false);
 assert.equal(entry.skip,false);
 s=kmr(s,a=>a.mode==='enter'&&a.uid===deneb.uid&&a.line==='front'&&a.slot===entry.slot);
 const summoned=s.players[0].front.find(c=>c?.uid===deneb.uid);
 assert.equal(summoned.ready,false);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(body.uid),false);
 s=use(s,a=>a.type==='chooseOwnBounce'&&a.uid===ally.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===ally.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===deneb.uid&&c.ready===false),true);
 assert.equal(s.pending,null);
 assert.equal(activates(s,body.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-074 and 075 keep raid-frame text off an ordinary play',()=>{
 let plain=open(['KMR-1-074','KMR-1-090',...RED],74074);
 line(plain,0,RED);
 const axe=take(plain,0,'KMR-1-074');
 onlyHand(plain,0,[axe]);
 ready(plain);
 plain=play(plain,axe.uid);
 const played=plain.players[0].front.find(c=>c?.uid===axe.uid)||plain.players[0].energy.find(c=>c?.uid===axe.uid);
 assert.equal(plain.pending,null);
 assert.equal(played.oppChoiceImmuneGranted,undefined);

 let s=open(['KMR-1-074','KMR-1-090','KMR-1-004',...RED],74075);
 line(s,0,RED);
 const base=put(s,0,'KMR-1-090','front',0,true);
 const body=take(s,0,'KMR-1-074');
 onlyHand(s,0,[body]);
 ready(s);
 s=raidOnto(s,body.uid,base.uid);
 const live=s.players[0].front.find(c=>c?.uid===body.uid);
 assert.equal(live.oppChoiceImmuneGranted.turn,s.turn);
 assert.equal(live.stack.some(c=>c.uid===base.uid),true);
 const bigger=put(s,1,'KMR-1-004','front',0,true);
 s=toSide(s,1);
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===bigger.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid===live.uid);
 assert.equal(s.pending.step,'enter');
 const back=s.pending.actions.find(a=>a.uid===base.uid&&a.mode==='enter');
 assert.equal(back.ready,false);
 assert.equal(back.skip,false);
 s=kmr(s,a=>a.mode==='enter'&&a.uid===base.uid&&a.slot===back.slot);
 const returned=s.players[0].front.find(c=>c?.uid===base.uid)||s.players[0].energy.find(c=>c?.uid===base.uid);
 assert.equal(returned.ready,false);
 assert.equal(s.pending,null);

 let gun=open(['KMR-1-075','KMR-1-093','KMR-1-090',...RED],75075);
 line(gun,0,RED);
 const ryu=put(gun,0,'KMR-1-093','front',0,true);
 const zero=put(gun,1,'KMR-1-090','front',0,true);
 put(gun,1,'KMR-1-070','front',1,true);
 const form=take(gun,0,'KMR-1-075');
 onlyHand(gun,0,[form]);
 ready(gun);
 gun=raidOnto(gun,form.uid,ryu.uid);
 assert.equal(gun.pending.id,'KMR-1-075');
 assert.equal(gun.pending.actions.some(a=>a.uid===zero.uid),true);
 assert.equal(gun.pending.actions.some(a=>find(gun,1,a.uid)?.cardId==='KMR-1-070'),false);
 gun=kmr(gun,a=>a.mode==='skip');
 assert.equal(gun.players[1].front.some(c=>c?.uid===zero.uid),true);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,gun),true);
});

test('life triggers of KMR-1-051 through 075 resolve on the revealed card',()=>{
 const none=['KMR-1-056','KMR-1-058','KMR-1-061','KMR-1-068','KMR-1-071','KMR-1-073'];
 const draws=['KMR-1-055','KMR-1-059','KMR-1-063','KMR-1-065','KMR-1-069','KMR-1-070','KMR-1-075'];
 const gets=['KMR-1-051','KMR-1-053','KMR-1-062'];
 const actives=['KMR-1-054','KMR-1-057','KMR-1-060','KMR-1-072','KMR-1-074'];
 for(const id of none){
  let s=toAttack(open([id,'KMR-1-006'],8000+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].outside.some(c=>c.uid===trigger.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of draws){
  let s=toAttack(open([id,'KMR-1-006'],8100+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  const hand=s.players[1].hand.length;
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.equal(s.players[1].hand.length,hand+1,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of gets){
  let s=toAttack(open([id,'KMR-1-006'],8200+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of actives){
  let s=toAttack(open([id,'KMR-1-006','KMR-1-010'],8300+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const ally=put(s,1,'KMR-1-010','front',0,false);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===ally.uid);
  assert.equal(s.players[1].front.find(c=>c?.uid===ally.uid).ready,true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of ['KMR-1-064','KMR-1-067']){
  let s=toAttack(open([id,'KMR-1-006'],84000+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='special');
  assert.equal(s.pending.actions.some(a=>a.uid===poke.uid),true,id);
  s=kmr(s,a=>a.mode==='retire'&&a.uid===poke.uid);
  assert.equal(s.players[0].outside.some(c=>c.uid===poke.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 let raid=toAttack(open(['KMR-1-052','KMR-1-049','KMR-1-006',...BLUE],83052));
 line(raid,1,BLUE);
 const ex=put(raid,1,'KMR-1-049','front',0,true);
 const poke=put(raid,0,'KMR-1-006','front',0,true);
 const trigger=take(raid,1,'KMR-1-052');
 const buried=raid.players[1].life[0];
 raid.players[1].life[0]=trigger;raid.players[1].deck.push(buried);
 raid=use(raid,a=>a.type==='attack'&&a.uid===poke.uid);
 raid=use(raid,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='get'),true);
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='raid'&&a.baseUid===ex.uid),true);
 raid=use(raid,a=>a.type==='chooseTrigger'&&a.mode==='get');
 assert.equal(raid.players[1].hand.some(c=>c.uid===trigger.uid),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
});
