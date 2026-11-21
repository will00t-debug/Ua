import test from 'node:test';
import assert from 'node:assert/strict';
import {createMgsV2Pack} from '../dist/universal-v2/mgs-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';

const pack=createMgsV2Pack();
const packs=[pack,pack];

function countsFor(required,extra={}){
 const reserved=new Set([...required,...Object.keys(extra)]);
 const fillers=Object.values(pack.cards).filter(card=>!reserved.has(card.id)&&
  !['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const counts={};
 let total=0;
 for(const id of reserved){
  const n=extra[id]??1;
  counts[id]=n;total+=n;
 }
 for(const id of fillers){
  if(total>=50)break;
  const n=Math.min(4,50-total);
  counts[id]=n;total+=n;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(card=>card.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function slot(pl,line){
 const index=pl[line].findIndex(card=>!card);
 if(index<0)throw Error(line+' is full');
 return index;
}
function sit(s,player,id,line,extra={}){
 const physical=take(s,player,id);
 physical.ready=extra.ready!==false;
 physical.entryTurn=extra.entryTurn??(s.turn||1)-1;
 physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(extra.faceDown)physical.faceDown=true;
 s.players[player][line][slot(s.players[player],line)]=physical;
 return physical;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function use(s,action){
 const actor=s.pending?s.pending.player:s.active;
 return dispatchUniversalAction(packs,s,action,{actor});
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function playable(s,uid,kind='play'){
 return legalUniversalActions(packs,s).some(action=>action.type===kind&&action.uid===uid);
}
function bury(host,card){
 card.faceDown=false;
 host.stack=[card];
 return host;
}
function quietLife(s,player){
 const plain=s.players[player].life.findIndex(card=>pack.cards[card.cardId].trigger==null);
 if(plain>0){
  const [card]=s.players[player].life.splice(plain,1);
  s.players[player].life.unshift(card);
 }
}
function passToOpponent(s){
 const before=s.active;
 let guard=0;
 while(s.active===before){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the turn pass');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>6)throw Error('Turn did not pass');
 }
 return toPhase(s,'main');
}

test('Q1624 removes one card on a full destination line, then moves',()=>{
 const counts=countsFor(['MGS-1-019','MGS-1-022','MGS-1-001','MGS-1-084'],{'MGS-1-001':2,'MGS-1-003':3});
 let open=toPhase(fresh(counts,41624),'main');
 readyAp(open,0,2);
 sit(open,0,'MGS-1-001','energy');
 sit(open,0,'MGS-1-001','energy');
 sit(open,0,'MGS-1-003','energy');
 const sister=sit(open,0,'MGS-1-022','front');
 const mover=take(open,0,'MGS-1-019');
 open.players[0].hand.push(mover);
 open=use(open,legalUniversalActions(packs,open).find(action=>action.type==='play'&&action.uid===mover.uid&&action.line==='front'));
 assert.equal(open.pending.mode,'moveTrait');
 open=use(open,{type:'nextPrint',mode:'pick',uid:sister.uid});
 assert.equal(open.pending.mode,'cell');
 open=use(open,{type:'nextPrint',mode:'cell',line:'energy',slot:open.pending.cells[0].slot});
 assert.equal(open.pending,null);
 assert.equal(open.players[0].removed.some(card=>card.cardId==='MGS-1-084'),false);
 assert.ok(open.players[0].energy.some(card=>card?.uid===sister.uid));

 let full=toPhase(fresh(counts,41625),'main');
 readyAp(full,0,2);
 sit(full,0,'MGS-1-001','energy');
 sit(full,0,'MGS-1-001','energy');
 sit(full,0,'MGS-1-003','energy');
 const moving=sit(full,0,'MGS-1-022','front');
 const removed=sit(full,0,'MGS-1-084','energy');
 const source=take(full,0,'MGS-1-019');
 full.players[0].hand.push(source);
 const deckBefore=full.players[0].deck.length;
 full=use(full,legalUniversalActions(packs,full).find(action=>action.type==='play'&&action.uid===source.uid&&action.line==='front'));
 full=use(full,{type:'nextPrint',mode:'pick',uid:moving.uid});
 assert.equal(full.pending.mode,'clear');
 assert.ok(full.pending.choices.includes(removed.uid));
 full=use(full,{type:'nextPrint',mode:'clear',uid:removed.uid});
 assert.equal(full.pending,null);
 assert.ok(full.players[0].removed.some(card=>card.uid===removed.uid));
 assert.equal(full.players[0].energy.find(card=>card?.uid===moving.uid)!=null,true);
 assert.equal(full.players[0].deck.length,deckBefore);
});

test('Q1625 swaps only after your own character loses a character battle',()=>{
 const counts=countsFor(['MGS-1-021','MGS-1-022','MGS-1-003','MGS-1-105','MGS-1-004']);
 function battle(seed,opts={}){
  let s=toPhase(fresh(counts,seed),'main');
  const karen=sit(s,0,'MGS-1-021','energy');
  if(opts.raid!==false)bury(karen,take(s,0,'MGS-1-004'));
  const sister=sit(s,0,'MGS-1-022','front');
  const attacker=sit(s,0,'MGS-1-003','front');
  const blocker=opts.blocker===false?null:sit(s,1,'MGS-1-105','front');
  quietLife(s,1);
  s=toPhase(s,'attack');
  s=use(s,{type:'attack',uid:attacker.uid});
  return {s,karen,sister,attacker,blocker};
 }
 let lost=battle(41626);
 assert.equal(lost.s.pending.kind,'block');
 assert.equal(lost.s.players[0].deck.length>0,true);
 const deck=lost.s.players[0].deck.length;
 lost.s=use(lost.s,{type:'chooseBlock',uid:lost.blocker.uid});
 assert.equal(lost.s.pending.kind,'effect-last');
 assert.equal(lost.s.pending.mode,'swap');
 assert.equal(lost.s.players[0].life.length,fresh(counts,1).players[0].life.length);
 lost.s=use(lost.s,{type:'lastPrint',mode:'slot',slot:lost.s.players[0].front.findIndex(card=>card?.uid===lost.sister.uid)});
 assert.equal(lost.s.players[0].front.some(card=>card?.uid===lost.karen.uid),true);
 assert.equal(lost.s.players[0].energy.some(card=>card?.uid===lost.sister.uid),true);
 assert.equal(lost.s.players[0].deck.length,deck);

 let player=battle(41627,{blocker:false});
 assert.equal(player.s.pending.kind,'block');
 const life=player.s.players[1].life.length;
 player.s=use(player.s,{type:'chooseBlock',uid:null});
 assert.notEqual(player.s.pending?.mode,'swap');
 assert.equal(player.s.players[1].life.length,life-1);
 assert.equal(player.s.players[0].energy.some(card=>card?.uid===player.karen.uid),true);

 let plain=battle(41628,{raid:false});
 plain.s=use(plain.s,{type:'chooseBlock',uid:plain.blocker.uid});
 assert.notEqual(plain.s.pending?.mode,'swap');
 assert.equal(plain.s.players[0].energy.some(card=>card?.uid===plain.karen.uid),true);

 let theirs=toPhase(fresh(counts,41629),'main');
 const watcher=sit(theirs,0,'MGS-1-021','energy');
 bury(watcher,take(theirs,0,'MGS-1-004'));
 const victim=sit(theirs,0,'MGS-1-003','front');
 const striker=sit(theirs,1,'MGS-1-105','front');
 theirs=passToOpponent(theirs);
 theirs=toPhase(theirs,'attack');
 theirs=use(theirs,{type:'attack',uid:striker.uid});
 theirs=use(theirs,{type:'chooseBlock',uid:victim.uid});
 assert.notEqual(theirs.pending?.mode,'swap');
 assert.equal(theirs.players[0].energy.some(card=>card?.uid===watcher.uid),true);
});

test('Q1626 and Q1635 keep the next matching hand discount',()=>{
 const named=countsFor(['MGS-1-029','MGS-1-026','MGS-1-009','MGS-1-004','MGS-1-001'],{'MGS-1-001':2});
 let s=toPhase(fresh(named,41630),'main');
 readyAp(s,0,2);
 sit(s,0,'MGS-1-001','energy');
 sit(s,0,'MGS-1-001','energy');
 const field=sit(s,0,'MGS-1-026','energy');
 const event=take(s,0,'MGS-1-029');
 const nadeko=take(s,0,'MGS-1-009');
 const other=take(s,0,'MGS-1-004');
 s.players[0].hand.push(event,nadeko,other);
 s=use(s,legalUniversalActions(packs,s).find(action=>action.type==='event'&&action.uid===event.uid));
 assert.equal(s.pending.mode,'retireField');
 s=use(s,{type:'lastPrint',mode:'pick',uid:field.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(card=>card.uid===field.uid));
 readyAp(s,0,0);
 assert.equal(playable(s,nadeko.uid),true);
 assert.equal(playable(s,other.uid),false);
 readyAp(s,0,1);
 s=use(s,legalUniversalActions(packs,s).find(action=>action.type==='play'&&action.uid===other.uid));
 readyAp(s,0,0);
 assert.equal(playable(s,nadeko.uid),true);
 s=use(s,legalUniversalActions(packs,s).find(action=>action.type==='play'&&action.uid===nadeko.uid));
 assert.ok(s.players[0].front.concat(s.players[0].energy).some(card=>card?.uid===nadeko.uid));

 const color=countsFor(['MGS-1-087','MGS-1-077','MGS-1-009'],{'MGS-1-077':4});
 let red=toPhase(fresh(color,41631),'main');
 readyAp(red,0,2);
 sit(red,0,'MGS-1-077','energy');
 sit(red,0,'MGS-1-077','energy');
 sit(red,0,'MGS-1-077','energy');
 const mayoi=take(red,0,'MGS-1-087');
 const cheap=take(red,0,'MGS-1-077');
 const yellow=take(red,0,'MGS-1-009');
 red.players[0].hand.push(mayoi,cheap,yellow);
 red=use(red,legalUniversalActions(packs,red).find(action=>action.type==='play'&&action.uid===mayoi.uid));
 assert.equal(red.pending.mode,'look');
 red=use(red,{type:'nextPrint',mode:'done'});
 while(red.pending?.mode==='order')
  red=use(red,{type:'nextPrint',mode:'bottom',uid:red.pending.uids[0]});
 assert.equal(red.pending,null);
 readyAp(red,0,0);
 assert.equal(playable(red,cheap.uid),true);
 assert.equal(playable(red,yellow.uid),false);
 readyAp(red,0,1);
 red=use(red,legalUniversalActions(packs,red).find(action=>action.type==='play'&&action.uid===yellow.uid));
 readyAp(red,0,0);
 assert.equal(playable(red,cheap.uid),true);
});

test('Q1627 draws after the block is chosen and not when the attack is declined',()=>{
 const counts=countsFor(['MGS-1-052','MGS-1-003','MGS-1-004']);
 let blocked=toPhase(fresh(counts,41632),'main');
 const hitagi=sit(blocked,0,'MGS-1-052','front');
 const wall=sit(blocked,1,'MGS-1-003','front');
 quietLife(blocked,1);
 blocked=toPhase(blocked,'attack');
 blocked=use(blocked,{type:'attack',uid:hitagi.uid});
 assert.equal(blocked.pending.kind,'block');
 const before=blocked.players[0].deck.length;
 const life=blocked.players[1].life.length;
 blocked=use(blocked,{type:'chooseBlock',uid:wall.uid});
 assert.equal(blocked.players[0].deck.length,before-1);
 assert.equal(blocked.players[1].life.length,life);
 assert.equal(blocked.players[0].hand.length>0,true);

 let open=toPhase(fresh(counts,41633),'main');
 const attacker=sit(open,0,'MGS-1-052','front');
 quietLife(open,1);
 open=toPhase(open,'attack');
 open=use(open,{type:'attack',uid:attacker.uid});
 const stayed=open.players[0].deck.length;
 const lives=open.players[1].life.length;
 open=use(open,{type:'chooseBlock',uid:null});
 assert.equal(open.players[0].deck.length,stayed);
 assert.equal(open.players[1].life.length,lives-1);
});

test('Q1628 and Q1643 let only one copy of the named activate resolve',()=>{
 const wing=countsFor(['MGS-1-059','MGS-1-060'],{'MGS-1-059':2});
 let once=toPhase(fresh(wing,41634),'main');
 const first=sit(once,0,'MGS-1-059','front');
 const second=sit(once,0,'MGS-1-059','front');
 const other=sit(once,0,'MGS-1-060','front');
 bury(other,take(once,0,'MGS-1-003'));
 once=use(once,legalUniversalActions(packs,once).find(action=>action.type==='activate'&&action.uid===first.uid&&action.mode==='main'));
 assert.equal(once.pending.mode,'number');
 once=use(once,{type:'lastPrint',mode:'number',number:0});
 assert.equal(legalUniversalActions(packs,once).some(action=>action.uid===second.uid&&action.mode==='main'),false);
 assert.equal(legalUniversalActions(packs,once).some(action=>action.uid===other.uid&&action.mode==='main'),true);

 const suruga=countsFor(['MGS-1-112','MGS-1-075'],{'MGS-1-112':2});
 let grant=toPhase(fresh(suruga,41635),'main');
 const left=sit(grant,0,'MGS-1-112','front');
 const right=sit(grant,0,'MGS-1-112','front');
 const host=sit(grant,0,'MGS-1-075','front');
 bury(host,take(grant,0,'MGS-1-003'));
 grant=use(grant,legalUniversalActions(packs,grant).find(action=>action.type==='activate'&&action.uid===left.uid&&action.mode==='main'));
 assert.equal(grant.pending.mode,'tuckGrant');
 assert.equal(legalUniversalActions(packs,grant).some(action=>action.uid===right.uid&&action.mode==='main'),false);
});

test('Q1629 treats an equal or higher BP character battle as the win',()=>{
 const counts=countsFor(['MGS-1-061','MGS-1-052','MGS-1-105','MGS-1-003','MGS-1-004'],{'MGS-1-052':2,'MGS-1-003':2});
 function attack(seed,{raid=true,energy=true,blocker='MGS-1-052',decline=false}={}){
  let s=toPhase(fresh(counts,seed),'main');
  const black=sit(s,0,'MGS-1-061','front');
  if(raid)bury(black,take(s,0,'MGS-1-003'));
  if(energy)sit(s,0,'MGS-1-052','energy');
  const wall=decline?null:sit(s,1,blocker,'front');
  quietLife(s,1);
  const hand=s.players[1].hand.length;
  s=toPhase(s,'attack');
  s=use(s,{type:'attack',uid:black.uid});
  s=use(s,{type:'chooseBlock',uid:decline?null:wall.uid});
  return {s,wall,hand};
 }
 const even=attack(41636);
 assert.equal(even.s.pending.kind,'effect-discard');
 assert.equal(even.s.pending.player,1);
 assert.equal(even.s.players[1].front.some(card=>card?.uid===even.wall.uid),false);
 assert.equal(even.s.players[1].life.length,fresh(counts,1).players[0].life.length);

 const higher=attack(41637,{blocker:'MGS-1-003'});
 assert.equal(higher.s.pending.kind,'effect-discard');
 assert.equal(higher.s.players[1].hand.length,higher.hand);

 const loss=attack(41638,{blocker:'MGS-1-105'});
 assert.notEqual(loss.s.pending?.kind,'effect-discard');
 assert.equal(loss.s.players[1].hand.length,loss.hand);
 assert.ok(loss.s.players[1].front.some(card=>card?.uid===loss.wall.uid));

 const player=attack(41639,{decline:true});
 assert.notEqual(player.s.pending?.kind,'effect-discard');
 assert.equal(player.s.players[1].hand.length,player.hand);
 assert.equal(player.s.players[1].life.length,fresh(counts,1).players[0].life.length-1);

 const bare=attack(41640,{raid:false});
 assert.notEqual(bare.s.pending?.kind,'effect-discard');
 assert.equal(bare.s.players[1].hand.length,bare.hand);

 const unnamed=attack(41641,{energy:false});
 assert.notEqual(unnamed.s.pending?.kind,'effect-discard');
 assert.equal(unnamed.s.players[1].hand.length,unnamed.hand);
});

test('Q1630 Q1631 Q1632 Q1636 Q1638 Q1641 and Q1642 show facedown cards only to their controller',()=>{
 const counts=countsFor(['MGS-1-075','MGS-1-076','MGS-1-079','MGS-1-093','MGS-1-099','MGS-1-105','MGS-1-112','MGS-1-003','MGS-1-004','MGS-1-006']);
 let s=toPhase(fresh(counts,41642),'main');
 const hosts=['MGS-1-075','MGS-1-076','MGS-1-079','MGS-1-105','MGS-1-112'].map((id,index)=>sit(s,0,id,index<4?'front':'energy'));
 const hidden=hosts.map((_,index)=>{
  if(index===0)return ['MGS-1-093','MGS-1-099'].map(id=>Object.assign(take(s,0,id),{faceDown:true}));
  const first=s.players[0].deck.shift();
  const second=s.players[0].deck.shift();
  first.faceDown=true;second.faceDown=true;
  return [first,second];
 });
 hosts.forEach((host,index)=>{host.under=hidden[index];});
 const foreign=sit(s,1,'MGS-1-075','front');
 const foreignLayers=[s.players[1].deck.shift(),s.players[1].deck.shift()];
 foreignLayers.forEach(card=>{card.faceDown=true;});
 foreign.under=foreignLayers;
 const mine=universalPublicView(pack,s,0);
 const theirs=universalPublicView(pack,s,1);
 const placed=(view,player,uid)=>[...view.players[player].front,...view.players[player].energy].find(card=>card?.uid===uid);
 for(const [index,host] of hosts.entries()){
  const own=placed(mine,0,host.uid);
  const opp=placed(theirs,0,host.uid);
  assert.deepEqual(own.underLayers.map(layer=>layer.cardId),hidden[index].map(card=>card.cardId));
  assert.deepEqual(opp.underLayers,[{faceDown:true},{faceDown:true}]);
  const swap=legalUniversalActions(packs,s).find(action=>action.type==='reorderUnder'&&action.uid===host.uid&&action.index===0);
  assert.ok(swap);
 }
 assert.equal(legalUniversalActions(packs,s).some(action=>action.type==='reorderUnder'&&action.uid===foreign.uid),false);
 const seen=placed(mine,1,foreign.uid);
 assert.deepEqual(seen.underLayers,[{faceDown:true},{faceDown:true}]);
 s=use(s,{type:'reorderUnder',uid:hosts[0].uid,index:0});
 const ordered=s.players[0].front.find(card=>card?.uid===hosts[0].uid);
 assert.deepEqual(ordered.under.map(card=>card.cardId),[hidden[0][1].cardId,hidden[0][0].cardId]);
 const third=Object.assign(take(s,0,'MGS-1-006'),{faceDown:true});
 ordered.under.push(third);
 s=use(s,{type:'reorderUnder',uid:hosts[0].uid,index:1});
 const again=s.players[0].front.find(card=>card?.uid===hosts[0].uid);
 assert.deepEqual(again.under.map(card=>card.cardId),[hidden[0][1].cardId,third.cardId,hidden[0][0].cardId]);
});

test('Q1633 Q1634 Q1637 and Q1639 ignore rule removal and the end-step hand trim',()=>{
 const counts=countsFor(['MGS-1-084','MGS-1-085','MGS-1-095','MGS-1-100','MGS-1-087','MGS-1-077','MGS-1-004'],{'MGS-1-004':2,'MGS-1-077':3});
 function trim(id,seed){
  let s=toPhase(fresh(counts,seed),'main');
  const card=take(s,0,id);
  s.players[0].hand.push(card);
  while(s.players[0].hand.length<9)s.players[0].hand.push(s.players[0].deck.shift());
  const deck=s.players[0].deck.length;
  s=toPhase(s,'attack');
  s=use(s,{type:'next'});
  assert.equal(s.pending.kind,'end-hand-limit');
  s=use(s,{type:'chooseHandLimit',uid:card.uid});
  assert.notEqual(s.pending?.mode,'millRemoved');
  assert.notEqual(s.pending?.mode,'buffAny');
  assert.notEqual(s.pending?.mode,'draw');
  assert.notEqual(s.pending?.mode,'payRetire');
  assert.ok(s.players[0].removed.some(item=>item.uid===card.uid));
  assert.equal(s.players[0].deck.length,deck);
 }
 trim('MGS-1-084',41643);
 trim('MGS-1-085',41644);
 trim('MGS-1-095',41645);
 trim('MGS-1-100',41646);

 let owned=toPhase(fresh(counts,41647),'main');
 const source=sit(owned,0,'MGS-1-087','front');
 sit(owned,0,'MGS-1-077','energy');
 const removed=take(owned,0,'MGS-1-084');
 owned.players[0].hand.push(removed);
 const deck=owned.players[0].deck.length;
 owned=use(owned,legalUniversalActions(packs,owned).find(action=>action.type==='activate'&&action.uid===source.uid&&action.mode==='main'));
 assert.equal(owned.pending.mode,'removeBuff');
 owned=use(owned,{type:'lastPrint',mode:'pick',uid:removed.uid});
 assert.equal(owned.pending.mode,'buffOne');
 owned=use(owned,{type:'lastPrint',mode:'pick',uid:source.uid});
 assert.equal(owned.pending.mode,'millRemoved');
 assert.equal(owned.players[0].deck.length,deck);
 assert.ok(owned.players[0].removed.some(card=>card.uid===removed.uid));

 let raised=toPhase(fresh(counts,41651),'main');
 const raiser=sit(raised,0,'MGS-1-087','front');
 const bonus=take(raised,0,'MGS-1-085');
 raised.players[0].hand.push(bonus);
 raised=use(raised,legalUniversalActions(packs,raised).find(action=>action.type==='activate'&&action.uid===raiser.uid&&action.mode==='main'));
 raised=use(raised,{type:'lastPrint',mode:'pick',uid:bonus.uid});
 raised=use(raised,{type:'lastPrint',mode:'pick',uid:raiser.uid});
 assert.equal(raised.pending.mode,'buffAny');

 let drawn=toPhase(fresh(counts,41648),'main');
 const drawer=sit(drawn,0,'MGS-1-087','front');
 const event=take(drawn,0,'MGS-1-095');
 drawn.players[0].hand.push(event);
 drawn=use(drawn,legalUniversalActions(packs,drawn).find(action=>action.type==='activate'&&action.uid===drawer.uid&&action.mode==='main'));
 drawn=use(drawn,{type:'lastPrint',mode:'pick',uid:event.uid});
 drawn=use(drawn,{type:'lastPrint',mode:'pick',uid:drawer.uid});
 assert.equal(drawn.pending.kind,'effect-next');
 assert.equal(drawn.pending.mode,'draw');

 let paid=toPhase(fresh(counts,41649),'main');
 readyAp(paid,0,1);
 const payer=sit(paid,0,'MGS-1-087','front');
 sit(paid,0,'MGS-1-077','energy');
 sit(paid,0,'MGS-1-077','energy');
 sit(paid,0,'MGS-1-077','energy');
 sit(paid,1,'MGS-1-004','front');
 const hate=take(paid,0,'MGS-1-100');
 paid.players[0].hand.push(hate);
 paid=use(paid,legalUniversalActions(packs,paid).find(action=>action.type==='activate'&&action.uid===payer.uid&&action.mode==='main'));
 paid=use(paid,{type:'lastPrint',mode:'pick',uid:hate.uid});
 paid=use(paid,{type:'lastPrint',mode:'pick',uid:payer.uid});
 assert.equal(paid.pending.mode,'payRetire');
});

test('Q1640 makes the gained attack block when a character can, and deal damage when none can',()=>{
 const counts=countsFor(['MGS-1-101','MGS-1-001','MGS-1-052','MGS-1-003'],{'MGS-1-052':4,'MGS-1-003':2});
 let forced=toPhase(fresh(counts,41650),'main');
 readyAp(forced,0,1);
 for(let i=0;i<4;i++)sit(forced,0,'MGS-1-052','energy');
 const base=sit(forced,0,'MGS-1-001','front');
 const first=sit(forced,1,'MGS-1-003','front');
 const second=sit(forced,1,'MGS-1-003','front');
 const koyomi=take(forced,0,'MGS-1-101');
 forced.players[0].hand.push(koyomi);
 const raid=legalUniversalActions(packs,forced).find(action=>action.type==='raid'&&action.uid===koyomi.uid&&action.baseUid===base.uid);
 assert.ok(raid);
 forced=use(forced,raid);
 const body=forced.players[0].front.find(card=>card?.uid===koyomi.uid);
 assert.equal(universalBp(pack,forced,body),5000);
 forced=toPhase(forced,'attack');
 forced=use(forced,{type:'attack',uid:koyomi.uid});
 const choices=legalUniversalActions(packs,forced).filter(action=>action.type==='chooseBlock');
 assert.deepEqual(choices.map(action=>action.uid).sort(),[first.uid,second.uid].sort());
 forced=use(forced,{type:'chooseBlock',uid:first.uid});
 assert.equal(forced.players[1].front.some(card=>card?.uid===second.uid&&card.ready),true);
 assert.equal(forced.players[1].front.some(card=>card?.uid===first.uid&&card.ready),false);

 let empty=toPhase(fresh(counts,41651),'main');
 readyAp(empty,0,1);
 for(let i=0;i<4;i++)sit(empty,0,'MGS-1-052','energy');
 const host=sit(empty,0,'MGS-1-001','front');
 const lone=take(empty,0,'MGS-1-101');
 empty.players[0].hand.push(lone);
 empty=use(empty,legalUniversalActions(packs,empty).find(action=>action.type==='raid'&&action.uid===lone.uid&&action.baseUid===host.uid));
 quietLife(empty,1);
 empty=toPhase(empty,'attack');
 empty=use(empty,{type:'attack',uid:lone.uid});
 assert.ok(legalUniversalActions(packs,empty).some(action=>action.type==='chooseBlock'&&action.uid===null));
 const life=empty.players[1].life.length;
 empty=use(empty,{type:'chooseBlock',uid:null});
 assert.equal(empty.players[1].life.length,life-1);

 let plain=toPhase(fresh(counts,41652),'main');
 readyAp(plain,0,1);
 for(let i=0;i<4;i++)sit(plain,0,'MGS-1-052','energy');
 sit(plain,1,'MGS-1-003','front');
 const loose=take(plain,0,'MGS-1-101');
 plain.players[0].hand.push(loose);
 plain=use(plain,legalUniversalActions(packs,plain).find(action=>action.type==='play'&&action.uid===loose.uid&&action.line==='front'));
 const played=plain.players[0].front.find(card=>card?.uid===loose.uid);
 assert.equal(universalBp(pack,plain,played),4000);
 assert.equal(played.mustBlockGranted,undefined);
 played.ready=true;
 plain=toPhase(plain,'attack');
 plain=use(plain,{type:'attack',uid:loose.uid});
 assert.ok(legalUniversalActions(packs,plain).some(action=>action.type==='chooseBlock'&&action.uid===null));
});

test('Q1644 does not invoke a raid-boxed onRetire when Koyomi is not raiding',()=>{
 const counts=countsFor(['MGS-1-046','MGS-1-101','MGS-1-105','MGS-1-003'],{'MGS-1-101':2});
 let bare=toPhase(fresh(counts,41653),'main');
 const shinobu=sit(bare,0,'MGS-1-046','front');
 const koyomi=sit(bare,0,'MGS-1-101','front');
 sit(bare,0,'MGS-1-105','energy');
 bare=use(bare,legalUniversalActions(packs,bare).find(action=>action.type==='activate'&&action.uid===shinobu.uid&&action.mode==='main'));
 assert.equal(bare.pending.mode,'bounceRetire');
 bare=use(bare,{type:'lastPrint',mode:'pick',uid:koyomi.uid});
 assert.equal(bare.pending,null);
 assert.ok(bare.players[0].hand.some(card=>card.uid===koyomi.uid));
 assert.equal(universalBp(pack,bare,bare.players[0].front.find(card=>card?.uid===shinobu.uid)),4000);
 assert.equal(bare.players[0].front.concat(bare.players[0].energy).some(card=>card&&card.uid!==shinobu.uid&&card.cardId==='MGS-1-003'),false);

 let raided=toPhase(fresh(counts,41654),'main');
 const source=sit(raided,0,'MGS-1-046','front');
 const top=sit(raided,0,'MGS-1-101','front');
 const origin=take(raided,0,'MGS-1-003');
 bury(top,origin);
 sit(raided,0,'MGS-1-105','front');
 raided=use(raided,legalUniversalActions(packs,raided).find(action=>action.type==='activate'&&action.uid===source.uid&&action.mode==='main'));
 raided=use(raided,{type:'lastPrint',mode:'pick',uid:top.uid});
 assert.equal(raided.pending.mode,'cell');
 assert.equal(raided.pending.uid,origin.uid);
 assert.equal(raided.pending.ready,false);
 const cell=raided.pending.cells[0];
 raided=use(raided,{type:'lastPrint',mode:'cell',line:cell.line,slot:cell.slot});
 const entered=raided.players[0][cell.line][cell.slot];
 assert.equal(entered.uid,origin.uid);
 assert.equal(entered.ready,false);
 assert.equal(universalBp(pack,raided,raided.players[0].front.find(card=>card?.uid===source.uid)),4000);
});
