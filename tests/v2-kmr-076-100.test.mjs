import test from 'node:test';
import assert from 'node:assert/strict';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalPrivateChoices,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
// 070 / 083 / 087 are red generators and are not the four Imagin names.
const RED=['KMR-1-070','KMR-1-083','KMR-1-087'];

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
function act(s,uid,mode){return use(s,a=>a.type==='activate'&&a.uid===uid&&(!mode||a.mode===mode));}
function activates(s,uid,mode){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid&&(!mode||a.mode===mode));
}
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
function onBoard(s,p,uid){
 return s.players[p].front.find(c=>c?.uid===uid)||s.players[p].energy.find(c=>c?.uid===uid);
}
function order(s,uids){
 for(const uid of uids)s=kmr(s,a=>a.mode==='next'&&a.uid===uid);
 return s;
}

test('KMR-1-076 counts each Imagin name once and raids one cheap Den-O',()=>{
 let one=open(['KMR-1-076','KMR-1-077','KMR-1-092','KMR-1-070','KMR-1-083'],76076);
 line(one,0,['KMR-1-070','KMR-1-083']);
 put(one,0,'KMR-1-092','front',0,true);
 put(one,0,'KMR-1-077','front',1,true);
 const climax=take(one,0,'KMR-1-076');
 onlyHand(one,0,[climax]);
 ready(one);
 const hand=one.players[0].hand.length;
 one=play(one,climax.uid);
 const played=onBoard(one,0,climax.uid);
 assert.equal(played.ready,false);
 assert.equal(one.players[0].hand.length,hand-1);
 assert.equal(one.pending,null);

 let two=open(['KMR-1-076','KMR-1-092','KMR-1-089','KMR-1-070','KMR-1-083'],76077);
 line(two,0,['KMR-1-070','KMR-1-083']);
 put(two,0,'KMR-1-092','front',0,true);
 put(two,0,'KMR-1-089','front',1,true);
 const body=take(two,0,'KMR-1-076');
 onlyHand(two,0,[body]);
 ready(two);
 const before=two.players[0].hand.length;
 two=play(two,body.uid);
 assert.equal(onBoard(two,0,body.uid).ready,true);
 assert.equal(two.players[0].hand.length,before);

 let raid=open(['KMR-1-076','KMR-1-077','KMR-1-079','KMR-1-092','KMR-1-089','KMR-1-090','KMR-1-093'],76078);
 const momo=put(raid,0,'KMR-1-092','front',0,true);
 put(raid,0,'KMR-1-089','front',1,true);
 put(raid,0,'KMR-1-090','front',2,true);
 put(raid,0,'KMR-1-093','energy',0,true);
 const rider=put(raid,0,'KMR-1-076','front',3,true);
 const sword=take(raid,0,'KMR-1-077');
 const liner=take(raid,0,'KMR-1-079');
 onlyHand(raid,0,[sword,liner]);
 ready(raid);
 raid=toAttack(raid);
 raid=use(raid,a=>a.type==='attack'&&a.uid===rider.uid);
 assert.equal(raid.pending.step,'enter');
 assert.equal(raid.pending.actions.some(a=>a.uid===liner.uid),false);
 assert.equal(raid.pending.actions.some(a=>a.mode==='enter'),false);
 const onto=raid.pending.actions.find(a=>a.mode==='raid'&&a.uid===sword.uid&&a.baseUid===momo.uid);
 assert.equal(onto.bp,1000);
 raid=kmr(raid,a=>a.mode==='raid'&&a.uid===sword.uid&&a.baseUid===momo.uid);
 const raided=onBoard(raid,0,sword.uid);
 assert.equal(universalBp(pack,raid,raided),4000);
 assert.equal(raided.impactGranted.turn,raid.turn);
 assert.equal(assertUniversalMatch(packs,one),true);
 assert.equal(assertUniversalMatch(packs,two),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('KMR-1-077 raid text is off an ordinary play, and the base on play fires',()=>{
 let plain=open(['KMR-1-077',...RED],77077);
 line(plain,0,['KMR-1-070','KMR-1-083']);
 const sword=take(plain,0,'KMR-1-077');
 onlyHand(plain,0,[sword]);
 ready(plain);
 plain=play(plain,sword.uid);
 assert.equal(onBoard(plain,0,sword.uid).impactGranted,undefined);
 assert.equal(plain.pending,null);

 let s=open(['KMR-1-077','KMR-1-092','KMR-1-004',...RED],77078);
 line(s,0,['KMR-1-070','KMR-1-083']);
 const base=put(s,0,'KMR-1-092','front',0,true);
 const body=take(s,0,'KMR-1-077');
 onlyHand(s,0,[body]);
 ready(s);
 s=raidOnto(s,body.uid,base.uid);
 const live=onBoard(s,0,body.uid);
 assert.equal(live.impactGranted.turn,s.turn);
 assert.equal(live.ready,true);
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
 assert.equal(onBoard(s,0,base.uid).ready,false);
 assert.equal(s.pending.step==='lookPick'||s.pending.step==='lookOrder',true);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-078 hosts a Den-O raid and draws, then discards',()=>{
 let s=open(['KMR-1-078','KMR-1-077','KMR-1-085',...RED],78078);
 line(s,0,['KMR-1-070']);
 const host=put(s,0,'KMR-1-078','front',0,true);
 const sword=take(s,0,'KMR-1-077');
 const axel=take(s,0,'KMR-1-085');
 onlyHand(s,0,[sword,axel]);
 ready(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===sword.uid&&a.baseUid===host.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===axel.uid&&a.baseUid===host.uid),false);
 silence(s,host);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===sword.uid&&a.baseUid===host.uid),false);

 let playHost=open(['KMR-1-078',...RED],78079);
 line(playHost,0,['KMR-1-070']);
 const body=take(playHost,0,'KMR-1-078');
 onlyHand(playHost,0,[body]);
 ready(playHost);
 const deck=playHost.players[0].deck.length;
 playHost=play(playHost,body.uid);
 assert.equal(playHost.pending.kind,'effect-discard');
 assert.equal(playHost.players[0].hand.length,1);
 assert.equal(playHost.players[0].deck.length,deck-1);
 playHost=use(playHost,a=>a.type==='chooseDiscard');
 assert.equal(playHost.players[0].hand.length,0);
 assert.equal(playHost.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,playHost),true);
});

test('KMR-1-079 grants sniper, replays the chosen on play, and brings the base back',()=>{
 let s=open(['KMR-1-079','KMR-1-077','KMR-1-078','KMR-1-092','KMR-1-089','KMR-1-090','KMR-1-093','KMR-1-006',...RED],79079);
 line(s,0,RED);
 const momo=put(s,0,'KMR-1-092','front',0,true);
 put(s,0,'KMR-1-089','front',1,true);
 put(s,0,'KMR-1-090','front',2,true);
 s.players[0].outside.push(take(s,0,'KMR-1-093'));
 const platform=put(s,0,'KMR-1-078','energy',3,true);
 const sword=take(s,0,'KMR-1-077');
 const liner=take(s,0,'KMR-1-079');
 onlyHand(s,0,[sword,liner]);
 ready(s);
 s=raidOnto(s,sword.uid,momo.uid);
 assert.equal(onBoard(s,0,sword.uid).impactGranted.turn,s.turn);
 s=raidOnto(s,liner.uid,platform.uid);
 const live=onBoard(s,0,liner.uid);
 assert.equal(live.sniperGranted.turn,s.turn);
 const foe=put(s,1,'KMR-1-006','front',0,true);
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===live.uid);
 assert.equal(s.pending.id,'KMR-1-079');
 assert.equal(s.pending.actions.some(a=>a.uid===sword.uid),true);
 s=kmr(s,a=>a.mode==='own'&&a.uid===sword.uid);
 assert.equal(onBoard(s,0,liner.uid).impactGranted.turn,s.turn);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=clearLife(s);

 let silenced=open(['KMR-1-079','KMR-1-077','KMR-1-078','KMR-1-092','KMR-1-089','KMR-1-090','KMR-1-093',...RED],79080);
 line(silenced,0,RED);
 const base=put(silenced,0,'KMR-1-092','front',0,true);
 put(silenced,0,'KMR-1-089','front',1,true);
 put(silenced,0,'KMR-1-090','front',2,true);
 silenced.players[0].outside.push(take(silenced,0,'KMR-1-093'));
 const desk=put(silenced,0,'KMR-1-078','energy',3,true);
 const quiet=take(silenced,0,'KMR-1-077');
 const form=take(silenced,0,'KMR-1-079');
 onlyHand(silenced,0,[quiet,form]);
 ready(silenced);
 silenced=raidOnto(silenced,quiet.uid,base.uid);
 silence(silenced,onBoard(silenced,0,quiet.uid));
 silenced=raidOnto(silenced,form.uid,desk.uid);
 const attacker=onBoard(silenced,0,form.uid);
 silenced=toAttack(silenced);
 silenced=use(silenced,a=>a.type==='attack'&&a.uid===attacker.uid);
 // Silence removes the printed alias, so Sword Form is no longer a タロス choice.
 assert.equal(silenced.pending?.kind,'block');
 assert.equal(legalUniversalActions(packs,silenced).some(a=>a.uid===quiet.uid),false);
 assert.equal(onBoard(silenced,0,form.uid).impactGranted,undefined);
 silenced=use(silenced,a=>a.type==='chooseBlock'&&a.uid==null);
 silenced=clearLife(silenced);

 let back=open(['KMR-1-079','KMR-1-078','KMR-1-004',...RED],79081);
 line(back,0,RED);
 const returned=put(back,0,'KMR-1-078','front',0,true);
 const card=take(back,0,'KMR-1-079');
 onlyHand(back,0,[card]);
 ready(back);
 back=raidOnto(back,card.uid,returned.uid);
 assert.equal(onBoard(back,0,card.uid).sniperGranted,undefined);
 const wall=put(back,1,'KMR-1-004','front',0,true);
 back=toSide(back,1);
 back=toAttack(back);
 back=use(back,a=>a.type==='attack'&&a.uid===wall.uid);
 back=use(back,a=>a.type==='chooseBlock'&&a.uid===card.uid);
 const entry=back.pending.actions.find(a=>a.uid===returned.uid&&a.mode==='enter');
 assert.equal(entry.ready,false);
 assert.equal(entry.skip,false);
 const drawn=back.players[0].deck.length;
 back=kmr(back,a=>a.mode==='enter'&&a.uid===returned.uid&&a.slot===entry.slot);
 assert.equal(onBoard(back,0,returned.uid).ready,false);
 assert.equal(back.pending.kind,'effect-discard');
 assert.equal(back.players[0].deck.length,drawn-1);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,silenced),true);
 assert.equal(assertUniversalMatch(packs,back),true);
});

test('KMR-1-080 grants the unblocked draw only while raided',()=>{
 let plain=open(['KMR-1-080','KMR-1-098',...RED],80080);
 line(plain,0,['KMR-1-070','KMR-1-083']);
 line(plain,1,['KMR-1-070','KMR-1-083']);
 const rod=take(plain,0,'KMR-1-080');
 onlyHand(plain,0,[rod]);
 ready(plain);
 plain=play(plain,rod.uid);
 assert.equal(onBoard(plain,0,rod.uid).unblockedDrawGranted,undefined);
 const bomb=take(plain,1,'KMR-1-098');
 onlyHand(plain,1,[bomb]);
 plain=toSide(plain,1);
 plain=event(plain,bomb.uid);
 assert.equal(plain.pending.kind,'effect-retire-bp');
 plain=use(plain,a=>a.uid===rod.uid);
 assert.equal(plain.players[0].outside.some(c=>c.uid===rod.uid),true);
 assert.equal(plain.pending,null);

 let s=open(['KMR-1-080','KMR-1-089','KMR-1-004',...RED],80081);
 line(s,0,['KMR-1-070','KMR-1-083']);
 const base=put(s,0,'KMR-1-089','front',0,true);
 const body=take(s,0,'KMR-1-080');
 onlyHand(s,0,[body]);
 ready(s);
 s=raidOnto(s,body.uid,base.uid);
 assert.equal(onBoard(s,0,body.uid).unblockedDrawGranted.turn,s.turn);
 const bigger=put(s,1,'KMR-1-004','front',0,true);
 s=toSide(s,1);
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===bigger.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid===body.uid);
 const back=s.pending.actions.find(a=>a.uid===base.uid&&a.mode==='enter');
 assert.equal(back.ready,false);
 s=kmr(s,a=>a.mode==='enter'&&a.uid===base.uid&&a.slot===back.slot);
 assert.equal(onBoard(s,0,base.uid).ready,false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-080 may draw zero or one only after an unblocked raided attack',()=>{
 let skip=open(['KMR-1-080','KMR-1-089',...RED],80082);
 line(skip,0,['KMR-1-070','KMR-1-083']);
 const base=put(skip,0,'KMR-1-089','front',0,true);
 const body=take(skip,0,'KMR-1-080');
 onlyHand(skip,0,[body]);
 ready(skip);
 skip=raidOnto(skip,body.uid,base.uid);
 assert.equal(onBoard(skip,0,body.uid).unblockedDrawGranted.upTo,1);
 skip=toAttack(skip);
 const deck=skip.players[0].deck.length;
 skip=use(skip,a=>a.type==='attack'&&a.uid===body.uid);
 skip=use(skip,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(skip.pending.kind,'effect-may-draw');
 skip=use(skip,a=>a.type==='chooseMayDraw'&&a.mode==='skip');
 assert.equal(skip.players[0].deck.length,deck);

 let drawn=open(['KMR-1-080','KMR-1-089',...RED],80083);
 line(drawn,0,['KMR-1-070','KMR-1-083']);
 const host=put(drawn,0,'KMR-1-089','front',0,true);
 const rider=take(drawn,0,'KMR-1-080');
 onlyHand(drawn,0,[rider]);
 ready(drawn);
 drawn=raidOnto(drawn,rider.uid,host.uid);
 drawn=toAttack(drawn);
 const before=drawn.players[0].deck.length;
 drawn=use(drawn,a=>a.type==='attack'&&a.uid===rider.uid);
 drawn=use(drawn,a=>a.type==='chooseBlock'&&a.uid==null);
 drawn=use(drawn,a=>a.type==='chooseMayDraw'&&a.mode==='draw');
 assert.equal(drawn.players[0].deck.length,before-1);
 assert.equal(assertUniversalMatch(packs,skip),true);
 assert.equal(assertUniversalMatch(packs,drawn),true);
});

test('KMR-1-081 stores a BP range, leaves it for a non-range choice, and may draw',()=>{
 const counts=withCopies(['KMR-1-081','KMR-1-084','KMR-1-098','KMR-1-100','KMR-1-082','KMR-1-076','KMR-1-004','KMR-1-070','KMR-1-087'],
  {'KMR-1-081':2,'KMR-1-082':3});
 let s=open(counts,81081);
 line(s,0,['KMR-1-070','KMR-1-087']);
 const first=put(s,0,'KMR-1-081','front',0,true);
 const second=put(s,0,'KMR-1-081','front',1,true);
 const gear=take(s,0,'KMR-1-098');
 const spare=take(s,0,'KMR-1-082');
 const other=take(s,0,'KMR-1-082');
 onlyHand(s,0,[gear,spare,other]);
 ready(s);
 s=act(s,first.uid,'kmr:KMR-1-081');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(s.aotBpRange[0],1000);
 assert.equal(s.pending,null);
 const faiz=take(s,0,'KMR-1-084');
 s.players[0].hand.push(faiz);
 s=play(s,faiz.uid);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===gear.uid);
 assert.equal(s.pending.step,'gearTop');
 s=kmr(s,a=>a.mode==='top');
 assert.equal(s.players[0].deck[0].uid,gear.uid);
 assert.equal(s.aotBpRange[0],1000);
 s=act(s,second.uid,'kmr:KMR-1-081');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===other.uid);
 assert.equal(s.pending,null);
 assert.equal(s.aotBpRange[0],2000);
 const low=put(s,1,'KMR-1-076','front',0,true);
 const high=put(s,1,'KMR-1-004','front',1,true);
 const evt=take(s,0,'KMR-1-100');
 s.players[0].hand.push(evt);
 s=event(s,evt.uid);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending.actions.some(a=>a.uid===low.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===high.uid),false);
 s=kmr(s,a=>a.mode==='retire'&&a.uid===low.uid);
 assert.equal(s.aotBpRange[0],0);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);

 let draw=open(['KMR-1-081','KMR-1-084','KMR-1-082',...RED],81082);
 line(draw,0,['KMR-1-070','KMR-1-083']);
 const rider=put(draw,0,'KMR-1-081','front',0,true);
 const dumped=take(draw,0,'KMR-1-082');
 const pay=take(draw,0,'KMR-1-084');
 onlyHand(draw,0,[dumped,pay]);
 ready(draw);
 draw=play(draw,pay.uid);
 draw=kmr(draw,a=>a.mode==='discard'&&a.uid===dumped.uid);
 draw=toAttack(draw);
 const cards=draw.players[0].hand.length;
 draw=use(draw,a=>a.type==='attack'&&a.uid===rider.uid);
 assert.equal(draw.pending.step,'mayDraw');
 draw=kmr(draw,a=>a.mode==='skip');
 assert.equal(draw.players[0].hand.length,cards);
 draw=use(draw,a=>a.type==='chooseBlock'&&a.uid==null);
 draw=clearLife(draw);
 assert.equal(activates(draw,rider.uid,'kmr:KMR-1-081'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,draw),true);
});

test('KMR-1-082 has no printed effect and rests on a paid play',()=>{
 let s=open(['KMR-1-082'],82082);
 const body=take(s,0,'KMR-1-082');
 onlyHand(s,0,[body]);
 ready(s);
 s=play(s,body.uid);
 assert.equal(onBoard(s,0,body.uid).ready,false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-083 shows the whole window, orders the rest, and discards after a take',()=>{
 let s=open(['KMR-1-083','KMR-1-098','KMR-1-082','KMR-1-089','KMR-1-090','KMR-1-006','KMR-1-070','KMR-1-075'],83083);
 line(s,0,['KMR-1-070','KMR-1-075']);
 const gear=take(s,0,'KMR-1-098');
 const rest=[take(s,0,'KMR-1-082'),take(s,0,'KMR-1-089'),take(s,0,'KMR-1-090'),take(s,0,'KMR-1-006')];
 s.players[0].deck.unshift(rest[0],gear,...rest.slice(1));
 const body=take(s,0,'KMR-1-083');
 const spare=s.players[0].deck.pop();
 onlyHand(s,0,[body,spare]);
 ready(s);
 s=play(s,body.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.uids.length,5);
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,5);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseTopFiltered'&&a.uid===null),true);
 assert.equal(legalUniversalActions(packs,s).filter(a=>a.type==='chooseTopFiltered'&&a.uid).length,1);
 const shown=s.publicReveals.length;
 s=use(s,a=>a.type==='chooseTopFiltered'&&a.uid===gear.uid);
 assert.equal(s.publicReveals.slice(shown).some(e=>e.uid===gear.uid),true);
 assert.equal(s.publicReveals.slice(shown).some(e=>rest.some(c=>c.uid===e.uid)),false);
 assert.equal(s.pending.kind,'effect-top-order');
 s=use(s,a=>a.type==='chooseTopOrder'&&a.uid===rest[0].uid);
 s=use(s,a=>a.type==='chooseTopOrder'&&a.uid===rest[1].uid);
 s=use(s,a=>a.type==='chooseTopOrder'&&a.uid===rest[2].uid);
 s=use(s,a=>a.type==='chooseTopOrder'&&a.uid===rest[3].uid);
 assert.equal(s.pending.kind,'effect-discard');
 s=use(s,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(s.players[0].deck.at(-1).uid,rest[3].uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===gear.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-084 draws two only after the optional discard',()=>{
 let skip=open(['KMR-1-084','KMR-1-082',...RED],84084);
 line(skip,0,['KMR-1-070']);
 const spare=take(skip,0,'KMR-1-082');
 const body=take(skip,0,'KMR-1-084');
 onlyHand(skip,0,[body,spare]);
 ready(skip);
 const hand=skip.players[0].hand.length;
 skip=play(skip,body.uid);
 skip=kmr(skip,a=>a.mode==='skip');
 assert.equal(skip.players[0].hand.length,hand-1);
 assert.equal(skip.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(skip.pending,null);

 let s=open(['KMR-1-084','KMR-1-082',...RED],84085);
 line(s,0,['KMR-1-070']);
 const dumped=take(s,0,'KMR-1-082');
 const rider=take(s,0,'KMR-1-084');
 onlyHand(s,0,[rider,dumped]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=play(s,rider.uid);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===dumped.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,skip),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('a Faiz gear cost is not 使用, and playing the gear event is',()=>{
 let cost=open(['KMR-1-081','KMR-1-084','KMR-1-098',...RED],81100);
 line(cost,0,['KMR-1-070','KMR-1-083']);
 const rider=put(cost,0,'KMR-1-081','front',0,true);
 const faiz=put(cost,0,'KMR-1-084','front',1,true);
 const gear=take(cost,0,'KMR-1-098');
 onlyHand(cost,0,[gear]);
 ready(cost);
 assert.equal(universalBp(packs,cost,faiz),1500);
 cost=act(cost,rider.uid,'kmr:KMR-1-081');
 cost=kmr(cost,a=>a.mode==='discard'&&a.uid===gear.uid);
 assert.equal(cost.pending,null);
 assert.equal(cost.players[0].outside.some(c=>c.uid===gear.uid),true);
 assert.notEqual(cost.players[0].deck[0]?.uid,gear.uid);
 assert.equal(cost.aotBpRange[0],1000);
 assert.equal(universalBp(packs,cost,onBoard(cost,0,faiz.uid)),1500);
 cost=toAttack(cost);
 cost=use(cost,a=>a.type==='attack'&&a.uid===rider.uid);
 assert.equal(cost.pending.kind,'block');

 let used=open(['KMR-1-084','KMR-1-098',...RED],81101);
 line(used,0,['KMR-1-070','KMR-1-083']);
 const body=put(used,0,'KMR-1-084','front',0,true);
 const bomb=take(used,0,'KMR-1-098');
 onlyHand(used,0,[bomb]);
 ready(used);
 assert.equal(universalBp(packs,used,body),1500);
 used=event(used,bomb.uid);
 assert.equal(used.pending,null);
 assert.equal(universalBp(packs,used,onBoard(used,0,body.uid)),2000);
 assert.equal(assertUniversalMatch(packs,cost),true);
 assert.equal(assertUniversalMatch(packs,used),true);
});

test('KMR-1-085 can only raid, then the attack-phase end removes the top card',()=>{
 let s=open(['KMR-1-085','KMR-1-084','KMR-1-008','KMR-1-098','KMR-1-082','KMR-1-006',...RED],85085);
 line(s,0,RED);
 const base=put(s,0,'KMR-1-084','front',0,true);
 const pause=put(s,0,'KMR-1-008','front',1,true);
 const body=take(s,0,'KMR-1-085');
 const gear=take(s,0,'KMR-1-098');
 onlyHand(s,0,[body,gear]);
 ready(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===body.uid),false);
 s=raidOnto(s,body.uid,base.uid);
 const live=onBoard(s,0,body.uid);
 assert.equal(live.ready,true);
 const low=put(s,1,'KMR-1-082','front',0,true);
 const high=put(s,1,'KMR-1-006','front',1,true);
 s=toAttack(s);
 const deck=s.players[0].deck.length;
 s=use(s,a=>a.type==='attack'&&a.uid===live.uid);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.step,'gearRetire');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===gear.uid);
 assert.equal(s.pending.actions.some(a=>a.uid===low.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===high.uid),false);
 s=kmr(s,a=>a.mode==='skip');
 s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=clearLife(s);
 const top=onBoard(s,0,live.uid);
 top.ready=false;
 top.buffs=[{bp:500,untilTurn:s.turn}];
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.pending.kind,'phase-order');
 s=use(s,a=>a.type==='choosePhaseOrder'&&a.key.startsWith(live.uid+':'));
 const stayed=onBoard(s,0,base.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===live.uid),true);
 assert.equal(stayed.ready,false);
 assert.equal(stayed.buffs.length,0);
 assert.equal(s.pending.step,'revive');
 assert.equal(s.pending.sourceUid,pause.uid);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-086 deals two only while raided, and the win retire follows a gear discard',()=>{
 let plain=open(['KMR-1-086','KMR-1-080'],86086);
 const body=put(plain,0,'KMR-1-086','front',0,true);
 const replaced=plain.players[1].life[0];
 plain.players[1].life[0]=take(plain,1,'KMR-1-080');
 plain.players[1].deck.push(replaced);
 ready(plain);
 const life=plain.players[1].life.length;
 plain=toAttack(plain);
 plain=use(plain,a=>a.type==='attack'&&a.uid===body.uid);
 plain=use(plain,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(plain.players[1].life.length,life-1);
 assert.equal(plain.pending,null);

 let direct=open(['KMR-1-086','KMR-1-082','KMR-1-080','KMR-1-083',...RED],86089);
 line(direct,0,RED);
 const host=put(direct,0,'KMR-1-082','front',0,true);
 const form=take(direct,0,'KMR-1-086');
 onlyHand(direct,0,[form]);
 ready(direct);
 direct=raidOnto(direct,form.uid,host.uid);
 const firstLife=direct.players[1].life[0];
 const secondLife=direct.players[1].life[1];
 direct.players[1].life[0]=take(direct,1,'KMR-1-080');
 direct.players[1].life[1]=take(direct,1,'KMR-1-083');
 direct.players[1].deck.push(firstLife,secondLife);
 const lives=direct.players[1].life.length;
 direct=toAttack(direct);
 direct=use(direct,a=>a.type==='attack'&&a.uid===form.uid);
 direct=use(direct,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(direct.players[1].life.length,lives-2);
 assert.equal(direct.pending.kind,'life-batch-order');
 assert.equal(direct.pending.choices.length,2);
 direct=use(direct,a=>a.type==='chooseLifeOrder'&&a.uid===direct.pending.choices[0]);
 direct=clearLife(direct);
 direct=clearLife(direct);

 let s=open(['KMR-1-086','KMR-1-082','KMR-1-098','KMR-1-090','KMR-1-076','KMR-1-080','KMR-1-089',...RED],86087);
 line(s,0,RED);
 const base=put(s,0,'KMR-1-082','front',0,true);
 const blaster=take(s,0,'KMR-1-086');
 const gear=take(s,0,'KMR-1-098');
 onlyHand(s,0,[blaster,gear]);
 ready(s);
 s=raidOnto(s,blaster.uid,base.uid);
 const live=onBoard(s,0,blaster.uid);
 const low=put(s,1,'KMR-1-090','front',0,true);
 const high=put(s,1,'KMR-1-076','front',1,true);
 const small=put(s,1,'KMR-1-089','front',2,true);
 const oldLife=[s.players[1].life[0],s.players[1].life[1]];
 s.players[1].life[0]=take(s,1,'KMR-1-080');
 s.players[1].life[1]=take(s,1,'KMR-1-082');
 s.players[1].deck.push(...oldLife);
 s=toAttack(s);
 const before=s.players[1].life.length;
 s=use(s,a=>a.type==='attack'&&a.uid===live.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid===low.uid);
 assert.equal(s.players[1].life.length,before);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(s.pending.step,'gearRetire3');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===gear.uid);
 assert.equal(s.pending.actions.some(a=>a.uid===small.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===high.uid),false);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.players[1].front.some(c=>c?.uid===small.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===high.uid),true);

 let lost=open(['KMR-1-086','KMR-1-082','KMR-1-098','KMR-1-004',...RED],86088);
 line(lost,0,RED);
 const faiz=put(lost,0,'KMR-1-082','front',0,true);
 const card=take(lost,0,'KMR-1-086');
 const held=take(lost,0,'KMR-1-098');
 onlyHand(lost,0,[card,held]);
 ready(lost);
 lost=raidOnto(lost,card.uid,faiz.uid);
 const wall=put(lost,1,'KMR-1-004','front',0,true);
 lost=toAttack(lost);
 lost=use(lost,a=>a.type==='attack'&&a.uid===card.uid);
 lost=use(lost,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(onBoard(lost,0,card.uid)!==undefined,true);
 assert.equal(onBoard(lost,1,wall.uid)!==undefined,true);
 assert.equal(lost.pending,null);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,direct),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,lost),true);
});

test('KMR-1-087 reduces its hand energy while the opponent has yellow or blue',()=>{
 let s=open(['KMR-1-087','KMR-1-001','KMR-1-036'],87087);
 const yellow=put(s,1,'KMR-1-001','front',0,true);
 const body=take(s,0,'KMR-1-087');
 onlyHand(s,0,[body]);
 ready(s);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-1-087'],'hand'),2);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-1-087'],'field'),3);
 s.players[1].front[0]=null;
 s.players[1].outside.push(yellow);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-1-087'],'hand'),3);
 put(s,1,'KMR-1-036','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-1-087'],'hand'),2);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-088 returns the retired character only after it actually leaves',()=>{
 let skip=open(['KMR-1-088','KMR-1-090','KMR-1-004',...RED],88088);
 line(skip,0,RED);
 const wall=put(skip,1,'KMR-1-090','front',0,true);
 put(skip,1,'KMR-1-004','front',1,true);
 const evt=take(skip,0,'KMR-1-088');
 onlyHand(skip,0,[evt]);
 ready(skip);
 skip=play(skip,evt.uid);
 assert.equal(skip.pending.actions.some(a=>a.uid===wall.uid),true);
 assert.equal(skip.pending.actions.filter(a=>a.mode==='retire').length,1);
 skip=kmr(skip,a=>a.mode==='skip');
 assert.equal(onBoard(skip,1,wall.uid)!==undefined,true);
 assert.equal(skip.pending,null);

 let back=open(['KMR-1-088','KMR-1-090','KMR-1-082','KMR-1-089',...RED],88089);
 line(back,0,RED);
 const victim=put(back,1,'KMR-1-090','front',0,true);
 const a=take(back,1,'KMR-1-082'),b=take(back,1,'KMR-1-089');
 const card=take(back,0,'KMR-1-088');
 onlyHand(back,0,[card]);
 onlyHand(back,1,[a,b]);
 ready(back);
 back=play(back,card.uid);
 back=kmr(back,a=>a.mode==='retire'&&a.uid===victim.uid);
 assert.equal(back.pending.step,'punishBack');
 assert.equal(back.pending.player,1);
 back=kmr(back,a=>a.mode==='payback');
 assert.equal(back.pending.step,'discard');
 back=kmr(back,a=>a.mode==='discard'&&a.uid===a.uid);
 back=kmr(back,a=>a.mode==='discard'&&a.uid===b.uid);
 assert.equal(back.players[1].hand.some(c=>c.uid===victim.uid),true);
 assert.equal(back.pending,null);

 let stay=open(['KMR-1-088','KMR-1-090','KMR-1-082',...RED],88090);
 line(stay,0,RED);
 const kept=put(stay,1,'KMR-1-090','front',0,true);
 const one=take(stay,1,'KMR-1-082');
 const horse=take(stay,0,'KMR-1-088');
 onlyHand(stay,0,[horse]);
 onlyHand(stay,1,[one]);
 ready(stay);
 stay=play(stay,horse.uid);
 stay=kmr(stay,a=>a.mode==='retire'&&a.uid===kept.uid);
 assert.equal(stay.players[1].outside.some(c=>c.uid===kept.uid),true);
 assert.equal(stay.players[1].hand.some(c=>c.uid===one.uid),true);
 assert.equal(stay.pending,null);

 let shield=open(['KMR-1-088','KMR-1-051','KMR-1-026','KMR-1-082','KMR-1-089',...RED],88091);
 line(shield,0,RED);
 const body=put(shield,1,'KMR-1-051','front',0,true);
 const layer=take(shield,1,'KMR-1-026');
 bury(body,layer);
 const left=take(shield,1,'KMR-1-082'),right=take(shield,1,'KMR-1-089');
 const horseCard=take(shield,0,'KMR-1-088');
 onlyHand(shield,0,[horseCard]);
 onlyHand(shield,1,[left,right]);
 ready(shield);
 shield=use(shield,a=>a.type==='play'&&a.uid===horseCard.uid&&a.line==='front');
 shield=kmr(shield,a=>a.mode==='retire'&&a.uid===body.uid);
 assert.equal(shield.pending.step,'spend51');
 shield=kmr(shield,a=>a.mode==='layer');
 assert.equal(onBoard(shield,1,body.uid)!==undefined,true);
 assert.equal(shield.pending,null);
 assert.equal(shield.players[1].hand.length,2);

 let declined=open(['KMR-1-088','KMR-1-051','KMR-1-026','KMR-1-082','KMR-1-089',...RED],88092);
 line(declined,0,RED);
 const paid=put(declined,1,'KMR-1-051','front',0,true);
 bury(paid,take(declined,1,'KMR-1-026'));
 const x=take(declined,1,'KMR-1-082'),y=take(declined,1,'KMR-1-089');
 const used=take(declined,0,'KMR-1-088');
 onlyHand(declined,0,[used]);
 onlyHand(declined,1,[x,y]);
 ready(declined);
 declined=use(declined,a=>a.type==='play'&&a.uid===used.uid&&a.line==='front');
 declined=kmr(declined,a=>a.mode==='retire'&&a.uid===paid.uid);
 declined=kmr(declined,a=>a.mode==='skip');
 assert.equal(declined.players[1].outside.some(c=>c.uid===paid.uid),true);
 assert.equal(declined.pending.step,'punishBack');
 declined=kmr(declined,a=>a.mode==='skip');
 assert.equal(declined.players[1].outside.some(c=>c.uid===paid.uid),true);
 assert.equal(declined.players[1].hand.length,2);
 assert.equal(assertUniversalMatch(packs,skip),true);
 assert.equal(assertUniversalMatch(packs,back),true);
 assert.equal(assertUniversalMatch(packs,stay),true);
 assert.equal(assertUniversalMatch(packs,shield),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
});

test('KMR-1-089 cannot be blocked by BP 2000 or less',()=>{
 let s=open(['KMR-1-089','KMR-1-090','KMR-1-077'],89089);
 const rider=put(s,0,'KMR-1-089','front',0,true);
 const small=put(s,1,'KMR-1-090','front',0,true);
 const big=put(s,1,'KMR-1-077','front',1,true);
 ready(s);
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===rider.uid);
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock'&&a.uid);
 assert.equal(blocks.some(a=>a.uid===small.uid),false);
 assert.equal(blocks.some(a=>a.uid===big.uid),true);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
 s=clearLife(s);

 let quiet=open(['KMR-1-089','KMR-1-090'],89090);
 const silenced=put(quiet,0,'KMR-1-089','front',0,true);
 const wall=put(quiet,1,'KMR-1-090','front',0,true);
 silence(quiet,silenced);
 ready(quiet);
 quiet=toAttack(quiet);
 quiet=use(quiet,a=>a.type==='attack'&&a.uid===silenced.uid);
 assert.equal(legalUniversalActions(packs,quiet).some(a=>a.type==='chooseBlock'&&a.uid===wall.uid),true);
 quiet=use(quiet,a=>a.type==='chooseBlock'&&a.uid==null);
 quiet=clearLife(quiet);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('KMR-1-090 removes impact from the battle',()=>{
 let s=open(['KMR-1-090','KMR-1-077','KMR-1-092',...RED],90090);
 line(s,0,['KMR-1-070','KMR-1-083']);
 const base=put(s,0,'KMR-1-092','front',0,true);
 const sword=take(s,0,'KMR-1-077');
 onlyHand(s,0,[sword]);
 ready(s);
 s=raidOnto(s,sword.uid,base.uid);
 const wall=put(s,1,'KMR-1-090','front',0,true);
 const life=s.players[1].life.length;
 s=toAttack(s);
 s=use(s,a=>a.type==='attack'&&a.uid===sword.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-091 returns another energy-1 character, or itself',()=>{
 let s=open(['KMR-1-091','KMR-1-082','KMR-1-076','KMR-1-070'],91091);
 line(s,0,['KMR-1-070']);
 const ally=put(s,0,'KMR-1-082','front',0,true);
 const high=put(s,0,'KMR-1-076','front',1,true);
 const body=take(s,0,'KMR-1-091');
 onlyHand(s,0,[body]);
 ready(s);
 s=play(s,body.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(ally.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(body.uid),false);
 s=use(s,a=>a.type==='chooseOwnBounce'&&a.uid===ally.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===ally.uid),true);
 assert.equal(onBoard(s,0,body.uid)!==undefined,true);

 let alone=open(['KMR-1-091','KMR-1-070'],91092);
 line(alone,0,['KMR-1-070']);
 const self=take(alone,0,'KMR-1-091');
 onlyHand(alone,0,[self]);
 ready(alone);
 alone=play(alone,self.uid);
 assert.equal(alone.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(onBoard(alone,0,self.uid),undefined);
 assert.equal(alone.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('KMR-1-092 shows five cards and discards a platform or an energy-1 card only after a take',()=>{
 let s=open(['KMR-1-092','KMR-1-078','KMR-1-082','KMR-1-089','KMR-1-090','KMR-1-006'],92092);
 const hit=take(s,0,'KMR-1-078');
 const rest=[take(s,0,'KMR-1-082'),take(s,0,'KMR-1-089'),take(s,0,'KMR-1-090'),take(s,0,'KMR-1-006')];
 s.players[0].deck.unshift(rest[0],hit,...rest.slice(1));
 const body=take(s,0,'KMR-1-092');
 onlyHand(s,0,[body]);
 ready(s);
 const reveals=s.publicReveals.length;
 s=play(s,body.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,5);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').length,1);
 s=kmr(s,a=>a.mode==='take'&&a.uid===hit.uid);
 assert.equal(s.publicReveals.slice(reveals).some(e=>e.uid===hit.uid),true);
 s=order(s,rest.map(c=>c.uid));
 assert.equal(s.pending.step,'namedDiscard');
 assert.equal(s.pending.actions.some(a=>a.uid===hit.uid),true);
 s=kmr(s,a=>a.mode==='namedDiscard'&&a.uid===hit.uid);
 assert.equal(s.players[0].deck.at(-1).uid,rest[3].uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===hit.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-093 rests, gains one energy this turn, and leaves at the end of main',()=>{
 let s=open(['KMR-1-093'],93093);
 const body=put(s,0,'KMR-1-093','energy',0,true);
 ready(s);
 assert.equal(universalCardEnergy(pack,s,0,body),1);
 s=act(s,body.uid,'selfRestEnergyRetire');
 const live=onBoard(s,0,body.uid);
 assert.equal(live.ready,false);
 assert.equal(universalCardEnergy(pack,s,0,live),2);
 assert.equal(activates(s,body.uid),false);
 s=toAttack(s);
 assert.equal(s.players[0].outside.some(c=>c.uid===body.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-094 enters active and its two mains stay on their printed conditions',()=>{
 let s=open(['KMR-1-094','KMR-1-077','KMR-1-092','KMR-1-082',...RED],94094);
 line(s,0,['KMR-1-070','KMR-1-083']);
 const field=take(s,0,'KMR-1-094');
 const spare=take(s,0,'KMR-1-082');
 onlyHand(s,0,[field,spare]);
 ready(s);
 s=play(s,field.uid,'energy');
 const parked=onBoard(s,0,field.uid);
 assert.equal(parked.ready,true);
 assert.equal(activates(s,field.uid,'kmr:KMR-1-094:a'),false);
 assert.equal(activates(s,field.uid,'kmr:KMR-1-094:b'),false);
 const base=put(s,0,'KMR-1-092','front',0,true);
 const sword=take(s,0,'KMR-1-077');
 s.players[0].hand.push(sword);
 s=raidOnto(s,sword.uid,base.uid);
 assert.equal(activates(s,field.uid,'kmr:KMR-1-094:a'),true);
 assert.equal(activates(s,field.uid,'kmr:KMR-1-094:b'),true);
 s=act(s,field.uid,'kmr:KMR-1-094:a');
 assert.equal(onBoard(s,0,field.uid).ready,false);
 s=kmr(s,a=>a.mode==='own'&&a.uid===sword.uid);
 assert.equal(universalBp(pack,s,onBoard(s,0,sword.uid)),4000);
 s=act(s,field.uid,'kmr:KMR-1-094:b');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(onBoard(s,0,field.uid).ready,true);
 assert.equal(activates(s,field.uid,'kmr:KMR-1-094:b'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-095 readies an AP after the look, including when nothing is taken',()=>{
 let s=open(['KMR-1-095','KMR-1-077','KMR-1-094','KMR-1-082','KMR-1-006','KMR-1-090','KMR-1-070'],95095);
 line(s,0,['KMR-1-070']);
 const hit=take(s,0,'KMR-1-077');
 const liner=take(s,0,'KMR-1-094');
 const rest=[take(s,0,'KMR-1-082'),take(s,0,'KMR-1-006'),take(s,0,'KMR-1-090')];
 s.players[0].deck.unshift(hit,liner,...rest);
 const evt=take(s,0,'KMR-1-095');
 onlyHand(s,0,[evt]);
 ready(s);
 s.players[0].apCards[0].ready=false;
 s=event(s,evt.uid);
 assert.equal(universalPrivateChoices(pack,s,0).inspected.length,5);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid).sort().join(),
  [hit.uid,liner.uid].sort().join());
 s=kmr(s,a=>a.mode==='done');
 s=order(s,[hit.uid,liner.uid,...rest.map(c=>c.uid)]);
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid==null);
 assert.equal(s.players[0].apCards[0].ready,false);
 assert.equal(s.pending,null);

 let low=open(['KMR-1-095','KMR-1-082','KMR-1-080','KMR-1-089','KMR-1-090','KMR-1-006','KMR-1-070'],95096);
 line(low,0,['KMR-1-070']);
 const window=Array.from({length:5},(_,i)=>take(low,0,['KMR-1-082','KMR-1-080','KMR-1-089','KMR-1-090','KMR-1-006'][i]));
 low.players[0].deck.unshift(...window);
 const card=take(low,0,'KMR-1-095');
 onlyHand(low,0,[card]);
 ready(low);
 low.players[0].apCards[0].ready=false;
 low.players[1].deck.push(...low.players[1].life.splice(4));
 low=event(low,card.uid);
 low=kmr(low,a=>a.mode==='done');
 low=order(low,window.map(c=>c.uid));
 assert.equal(low.pending,null);
 assert.equal(low.players[0].apCards[0].ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,low),true);
});

test('KMR-1-096 retires 3000, or 5000 while a raided Den-O is on the field',()=>{
 let s=open(['KMR-1-096','KMR-1-082','KMR-1-076',...RED],96096);
 line(s,0,['KMR-1-070','KMR-1-083']);
 const low=put(s,1,'KMR-1-082','front',0,true);
 const high=put(s,1,'KMR-1-076','front',1,true);
 const evt=take(s,0,'KMR-1-096');
 onlyHand(s,0,[evt]);
 ready(s);
 s=event(s,evt.uid);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(s.pending.actions.some(a=>a.uid===low.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===high.uid),false);
 s=kmr(s,a=>a.mode==='retire'&&a.uid===low.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);

 let wide=open(['KMR-1-096','KMR-1-077','KMR-1-092','KMR-1-004',...RED],96097);
 line(wide,0,['KMR-1-070','KMR-1-083']);
 const base=put(wide,0,'KMR-1-092','front',0,true);
 const sword=take(wide,0,'KMR-1-077');
 const card=take(wide,0,'KMR-1-096');
 onlyHand(wide,0,[sword,card]);
 ready(wide);
 wide=raidOnto(wide,sword.uid,base.uid);
 const huge=put(wide,1,'KMR-1-004','front',0,true);
 wide=event(wide,card.uid);
 assert.equal(wide.pending.actions.some(a=>a.uid===huge.uid),true);
 wide=kmr(wide,a=>a.mode==='retire'&&a.uid===huge.uid);
 assert.equal(wide.players[1].outside.some(c=>c.uid===huge.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,wide),true);
});

test('KMR-1-097 readies up to two AP, and the final trigger does not play the event',()=>{
 let s=open(['KMR-1-097',...RED],97097);
 line(s,0,['KMR-1-070','KMR-1-083']);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 s.players[0].apCards[2].ready=true;
 const evt=take(s,0,'KMR-1-097');
 onlyHand(s,0,[evt]);
 ready(s);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 s=event(s,evt.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.filter(c=>!c.ready);
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid===rested[0].uid);
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid==null);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested[0].uid).ready,true);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested[1].uid).ready,false);

 let early=toAttack(open(['KMR-1-097','KMR-1-006'],97098));
 const poke=put(early,0,'KMR-1-006','front',0,true);
 const trigger=take(early,1,'KMR-1-097');
 const buried=early.players[1].life[0];
 early.players[1].life[0]=trigger;early.players[1].deck.push(buried);
 early=use(early,a=>a.type==='attack'&&a.uid===poke.uid);
 early=use(early,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(early.pending,null);
 assert.equal(early.players[1].outside.some(c=>c.uid===trigger.uid),true);

 let last=toAttack(open(['KMR-1-097','KMR-1-006'],97099));
 const sword=put(last,0,'KMR-1-006','front',0,true);
 const finalCard=take(last,1,'KMR-1-097');
 last.players[1].deck.push(...last.players[1].life.splice(0));
 last.players[1].life.push(finalCard);
 const recovered=last.players[1].deck[0];
 last=use(last,a=>a.type==='attack'&&a.uid===sword.uid);
 last=use(last,a=>a.type==='chooseBlock'&&a.uid==null);
 last=use(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life[0].uid,recovered.uid);
 assert.equal(last.players[1].outside.some(c=>c.uid===finalCard.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,early),true);
 assert.equal(assertUniversalMatch(packs,last),true);
});

test('KMR-1-098 retires one opposing front character of BP 3000 or less',()=>{
 let s=open(['KMR-1-098','KMR-1-082','KMR-1-076',...RED],98098);
 line(s,0,['KMR-1-070']);
 const low=put(s,1,'KMR-1-082','front',0,true);
 const high=put(s,1,'KMR-1-076','front',1,true);
 const evt=take(s,0,'KMR-1-098');
 onlyHand(s,0,[evt]);
 ready(s);
 s=event(s,evt.uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.optional,undefined);
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 s=use(s,a=>a.uid===low.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-099 raises this choice to 4000 and stores +1000 for the next range',()=>{
 let plain=open(['KMR-1-099','KMR-1-090','KMR-1-076','KMR-1-070','KMR-1-087'],99099);
 line(plain,0,['KMR-1-070','KMR-1-087']);
 const low=put(plain,1,'KMR-1-090','front',0,true);
 const mid=put(plain,1,'KMR-1-076','front',1,true);
 const evt=take(plain,0,'KMR-1-099');
 onlyHand(plain,0,[evt]);
 ready(plain);
 plain=event(plain,evt.uid);
 assert.equal(plain.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(plain.pending.actions.some(a=>a.uid===low.uid),true);
 assert.equal(plain.pending.actions.some(a=>a.uid===mid.uid),false);
 plain=kmr(plain,a=>a.mode==='skip');
 assert.equal(plain.aotBpRange?.[0]||0,0);

 let s=open(['KMR-1-099','KMR-1-082','KMR-1-077','KMR-1-076','KMR-1-004','KMR-1-100','KMR-1-070','KMR-1-087'],99100);
 line(s,0,['KMR-1-070','KMR-1-087']);
 put(s,0,'KMR-1-082','front',0,true);
 const three=put(s,1,'KMR-1-077','front',0,true);
 const four=put(s,1,'KMR-1-076','front',1,true);
 const five=put(s,1,'KMR-1-004','front',2,true);
 const card=take(s,0,'KMR-1-099');
 const later=take(s,0,'KMR-1-100');
 onlyHand(s,0,[card,later]);
 ready(s);
 s=event(s,card.uid);
 assert.equal(s.pending.actions.some(a=>a.uid===four.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===five.uid),false);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.aotBpRange[0],1000);
 s=event(s,later.uid);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending.actions.some(a=>a.uid===three.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===four.uid),false);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.aotBpRange[0],1000);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-100 buffs and retires as separate sentences',()=>{
 const empty=withCopies(['KMR-1-100','KMR-1-090','KMR-1-070'],{'KMR-1-094':2});
 let none=open(empty,100100);
 put(none,0,'KMR-1-094','energy',0,true);
 put(none,0,'KMR-1-094','energy',1,true);
 const low=put(none,1,'KMR-1-090','front',0,true);
 const high=put(none,1,'KMR-1-070','front',1,true);
 const evt=take(none,0,'KMR-1-100');
 onlyHand(none,0,[evt]);
 ready(none);
 none=event(none,evt.uid);
 assert.equal(none.pending.step,'retire');
 assert.equal(none.pending.actions.some(a=>a.uid===low.uid),true);
 assert.equal(none.pending.actions.some(a=>a.uid===high.uid),false);
 none=kmr(none,a=>a.mode==='skip');

 let s=open(['KMR-1-100','KMR-1-082','KMR-1-090',...RED],100101);
 line(s,0,RED);
 const ally=put(s,0,'KMR-1-082','front',0,true);
 const foe=put(s,1,'KMR-1-090','front',0,true);
 const card=take(s,0,'KMR-1-100');
 onlyHand(s,0,[card]);
 ready(s);
 s=event(s,card.uid);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(universalBp(pack,s,onBoard(s,0,ally.uid)),1500);
 assert.equal(s.pending.actions.some(a=>a.uid===foe.uid),true);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(onBoard(s,1,foe.uid)!==undefined,true);

 let both=open(['KMR-1-100','KMR-1-082','KMR-1-090',...RED],100102);
 line(both,0,RED);
 const mine=put(both,0,'KMR-1-082','front',0,true);
 const theirs=put(both,1,'KMR-1-090','front',0,true);
 const cut=take(both,0,'KMR-1-100');
 onlyHand(both,0,[cut]);
 ready(both);
 both=event(both,cut.uid);
 both=kmr(both,a=>a.mode==='own'&&a.uid===mine.uid);
 assert.equal(universalBp(pack,both,onBoard(both,0,mine.uid)),3500);
 both=kmr(both,a=>a.mode==='retire'&&a.uid===theirs.uid);
 assert.equal(both.players[1].outside.some(c=>c.uid===theirs.uid),true);
 assert.equal(assertUniversalMatch(packs,none),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,both),true);
});

test('life triggers of KMR-1-076 through 100 resolve on the revealed card',()=>{
 const none=['KMR-1-080','KMR-1-083','KMR-1-087','KMR-1-090','KMR-1-091','KMR-1-093','KMR-1-098'];
 const gets=['KMR-1-076','KMR-1-078','KMR-1-081','KMR-1-082','KMR-1-085','KMR-1-094'];
 const actives=['KMR-1-088','KMR-1-089','KMR-1-095','KMR-1-100'];
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
 for(const id of gets){
  let s=toAttack(open([id,'KMR-1-006'],8100+Number(id.slice(-3))));
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
  let s=toAttack(open([id,'KMR-1-006','KMR-1-082'],8200+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const ally=put(s,1,'KMR-1-082','front',0,false);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===ally.uid);
  assert.equal(s.players[1].front.find(c=>c?.uid===ally.uid).ready,true,id);
  assert.equal(universalBp(pack,s,s.players[1].front.find(c=>c?.uid===ally.uid)),4500,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of ['KMR-1-084','KMR-1-092']){
  let s=toAttack(open([id,'KMR-1-006','KMR-1-076','KMR-1-082'],8300+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const big=put(s,0,'KMR-1-076','front',1,true);
  const small=put(s,0,'KMR-1-082','front',2,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='colorRetire'&&a.uid===small.uid),true,id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='colorRetire'&&a.uid===big.uid),false,id);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='colorRetire'&&a.uid===small.uid);
  assert.equal(s.players[0].outside.some(c=>c.uid===small.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of ['KMR-1-096','KMR-1-099']){
  let s=toAttack(open([id,'KMR-1-082','KMR-1-004'],8400+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-082','front',0,true);
  const huge=put(s,0,'KMR-1-004','front',1,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='special');
  assert.equal(s.pending.actions.some(a=>a.uid===poke.uid),true,id);
  assert.equal(s.pending.actions.some(a=>a.uid===huge.uid),false,id);
  s=kmr(s,a=>a.mode==='retire'&&a.uid===poke.uid);
  assert.equal(s.players[0].outside.some(c=>c.uid===poke.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const spec of [
  {id:'KMR-1-079',base:'KMR-1-078',seed:85079},
  {id:'KMR-1-086',base:'KMR-1-082',seed:85086}
 ]){
  let s=toAttack(open([spec.id,spec.base,'KMR-1-006',...RED],spec.seed));
  line(s,1,RED);
  const host=put(s,1,spec.base,'front',0,true);
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,spec.id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='get'),true,spec.id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='raid'&&a.baseUid===host.uid),true,spec.id);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true,spec.id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 let raid=toAttack(open(['KMR-1-077','KMR-1-092','KMR-1-006','KMR-1-070'],85077));
 line(raid,1,['KMR-1-070']);
 const momo=put(raid,1,'KMR-1-092','front',0,true);
 const poke=put(raid,0,'KMR-1-006','front',0,true);
 const trigger=take(raid,1,'KMR-1-077');
 const buried=raid.players[1].life[0];
 raid.players[1].life[0]=trigger;raid.players[1].deck.push(buried);
 raid=use(raid,a=>a.type==='attack'&&a.uid===poke.uid);
 raid=use(raid,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='get'),true);
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='raid'&&a.baseUid===momo.uid),true);
 raid=use(raid,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===momo.uid);
 assert.equal(onBoard(raid,1,trigger.uid).impactGranted.turn,raid.turn);
 assert.equal(assertUniversalMatch(packs,raid),true);
});
