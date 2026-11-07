import test from 'node:test';
import assert from 'node:assert/strict';
import {EXEDRA_CARDS} from '../dist/madoka-exedra-cards.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalBp, universalCardEnergy,
 universalEnergyByColor, universalImpact, universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(2,4-caps[trigger]);
   caps[trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=(counts[id]||0)+add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(ids,seed){
 return newUniversalMatch(packs,{decks:[countsFor(ids),countsFor(ids)],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function park(s,p){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function acts(s){return legalUniversalActions(packs,s);}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function pick(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||s.phase)+'/'+(s.pending?.step||'')+' '+
  JSON.stringify(acts(s).slice(0,6)));
 return use(s,action);
}
function play(s,uid,line='front'){
 return pick(s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
}
function raidOnto(s,uid,baseUid){
 return pick(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);
}
function cast(s,uid){return pick(s,a=>a.type==='event'&&a.uid===uid);}
function can(s,pred){return acts(s).some(pred);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+'/'+s.pending.step+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase);
 }
 return s;
}
function toSide(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+player+' '+phase);
  s=use(s,{type:'next'});
  if(++guard>20)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function finish(s){assertUniversalMatch(packs,s);return s;}
function live(s,p,uid){return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;}
function bp(s,c){return universalBp(packs,s,c);}
function modes(s,mode){return (s.pending?.actions||acts(s)).filter(a=>a.mode===mode);}
function uids(s){return acts(s).map(a=>a.uid);}

test('001 through 025 each have one EX16BT printing',()=>{
 for(let n=1;n<=25;n++){
  const id='MMM-2-'+String(n).padStart(3,'0');
  const card=EXEDRA_CARDS.find(c=>c.id===id);
  const built=pack.cards[id];
  assert.equal(card.printings.filter(p=>p.set==='EX16BT').length,1);
  assert.equal(built.name,card.nameJa);
  assert.equal(built.energy,card.energy);
  assert.equal(built.ap,card.ap);
  assert.equal(built.bp,card.bp);
  assert.equal(built.color,card.color);
  assert.equal(built.trigger,card.trigger);
  assert.equal(built.type,card.type);
 }
});

test('001 draws and may deploy from removed only while face-up raided, and retirement removes it',()=>{
 const ids=['MMM-2-001','MMM-2-004','MMM-2-007','MMM-2-008','MMM-2-002','MMM-2-005','MMM-1-001'];
 let plain=toPhase(fresh(ids,20001),'main');
 put(plain,0,'MMM-2-007','energy',0,true);
 put(plain,0,'MMM-2-008','energy',1,true);
 put(plain,0,'MMM-2-002','energy',2,true);
 readyAp(plain,0,1);
 const paid=toHand(plain,0,'MMM-2-001');
 const deck=plain.players[0].deck.length;
 plain=play(plain,paid.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(live(plain,0,paid.uid).ready,false);
 finish(plain);

 let raid=toPhase(fresh(ids,20002),'main');
 put(raid,0,'MMM-2-007','energy',0,true);
 put(raid,0,'MMM-2-008','energy',1,true);
 put(raid,0,'MMM-2-002','energy',2,true);
 const base=put(raid,0,'MMM-2-004','front',0,true);
 readyAp(raid,0,1);
 park(raid,0);
 const girl=toHand(raid,0,'MMM-2-005');
 const ultimate=toHand(raid,0,'MMM-2-001');
 const before=raid.players[0].deck.length;
 raid=raidOnto(raid,ultimate.uid,base.uid);
 assert.equal(raid.players[0].deck.length,before-1);
 assert.equal(live(raid,0,ultimate.uid).ready,true);
 assert.equal(raid.pending.step,'u001');
 assert.equal(modes(raid,'skip').length,1);
 assert.equal(uids(raid).includes(girl.uid),true);
 raid=pick(raid,a=>a.uid===girl.uid);
 assert.equal(raid.players[0].removed.some(c=>c.uid===girl.uid),true);
 assert.equal(raid.pending.step,'deploy');
 raid=pick(raid,a=>a.uid===girl.uid&&a.line==='front');
 assert.equal(live(raid,0,girl.uid).ready,false);
 assert.equal(raid.pending,null);
 const foe=put(raid,1,'MMM-1-001','front',0,true);
 const spare=toHand(raid,0,'MMM-2-002');
 raid.players[0].hand=raid.players[0].hand.filter(c=>c.uid!==spare.uid);
 raid.players[0].outside.push(spare);
 raid=toSide(raid,1,'attack');
 raid=pick(raid,a=>a.type==='attack'&&a.uid===foe.uid&&!a.targetUid);
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid===ultimate.uid);
 assert.equal(raid.players[0].removed.some(c=>c.uid===ultimate.uid),true);
 assert.equal(raid.players[0].outside.some(c=>c.uid===ultimate.uid),false);
 assert.equal(raid.pending.step,'u001out');
 assert.equal(uids(raid).includes(spare.uid),true);
 raid=pick(raid,a=>a.mode==='skip');
 assert.equal(raid.players[0].outside.some(c=>c.uid===spare.uid),true);
 finish(raid);

 let quiet=toPhase(fresh(ids,20003),'main');
 put(quiet,0,'MMM-2-007','energy',0,true);
 put(quiet,0,'MMM-2-008','energy',1,true);
 put(quiet,0,'MMM-2-002','energy',2,true);
 readyAp(quiet,0,1);
 const rested=toHand(quiet,0,'MMM-2-001');
 quiet=play(quiet,rested.uid);
 const hammer=put(quiet,1,'MMM-1-001','front',0,true);
 quiet=toSide(quiet,1,'attack');
 quiet=pick(quiet,a=>a.type==='attack'&&a.uid===hammer.uid&&!a.targetUid);
 quiet=pick(quiet,a=>a.type==='chooseBlock'&&a.uid===rested.uid);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===rested.uid),true);
 assert.equal(quiet.players[0].removed.some(c=>c.uid===rested.uid),false);
 assert.equal(quiet.pending,null);
 finish(quiet);
});

test('002 removes impact from the character it battles, and its draw trigger draws',()=>{
 const ids=['MMM-2-002','MMM-1-020','MMM-2-021'];
 let open=toPhase(fresh(ids,20020),'attack');
 const hitter=put(open,0,'MMM-1-020','front',0,true);
 const plain=put(open,1,'MMM-2-021','front',0,true);
 assert.equal(universalImpact(pack,open,hitter),1);
 const openLife=open.players[1].life.length;
 open=pick(open,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid===plain.uid);
 assert.equal(open.players[1].life.length,openLife-1);
 assert.equal(open.pending?.kind,'life-trigger');
 finish(open);

 let s=toPhase(fresh(ids,20021),'attack');
 const attacker=put(s,0,'MMM-1-020','front',0,true);
 const kyubey=put(s,1,'MMM-2-002','front',0,true);
 assert.equal(universalImpact(pack,s,attacker),1);
 const life=s.players[1].life.length;
 s=pick(s,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===kyubey.uid);
 assert.equal(s.players[1].life.length,life);
 assert.equal(s.pending?.kind==='life-trigger',false);
 assert.equal(s.players[1].outside.some(c=>c.uid===kyubey.uid),true);
 finish(s);

 let lifeHit=toPhase(fresh(['MMM-2-002','MMM-2-021'],20022),'attack');
 const swinger=put(lifeHit,0,'MMM-2-021','front',0,true);
 const blank=take(lifeHit,1,'MMM-2-021');
 const drawn=take(lifeHit,1,'MMM-2-002');
 lifeHit.players[1].deck.push(...lifeHit.players[1].life.splice(0));
 lifeHit.players[1].life=[drawn,blank];
 const hand=lifeHit.players[1].hand.length;
 lifeHit=pick(lifeHit,a=>a.type==='attack'&&a.uid===swinger.uid&&!a.targetUid);
 lifeHit=pick(lifeHit,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(lifeHit.pending.trigger,'draw');
 lifeHit=pick(lifeHit,a=>a.mode==='draw');
 assert.equal(lifeHit.players[1].hand.length,hand+1);
 finish(lifeHit);
});

test('003 must choose a Homura option, and a chosen option stays closed this turn',()=>{
 const ids=['MMM-2-003','MMM-2-001','MMM-2-007','MMM-2-008','MMM-2-002','MMM-2-021'];
 let bare=toPhase(fresh(ids,20031),'main');
 put(bare,0,'MMM-2-007','energy',0,true);
 put(bare,0,'MMM-2-008','energy',1,true);
 put(bare,0,'MMM-2-002','energy',2,true);
 readyAp(bare,0,2);
 const first=toHand(bare,0,'MMM-2-003');
 const deck=bare.players[0].deck.length;
 bare=play(bare,first.uid);
 assert.equal(bare.pending.step,'u003');
 assert.deepEqual(acts(bare).map(a=>a.mode),['b']);
 bare=pick(bare,a=>a.mode==='b');
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].deck.length,deck);
 finish(bare);

 let named=toPhase(fresh(ids,20032),'main');
 put(named,0,'MMM-2-007','energy',0,true);
 put(named,0,'MMM-2-008','energy',1,true);
 put(named,0,'MMM-2-002','energy',2,true);
 put(named,0,'MMM-2-001','front',0,true);
 const buried=toHand(named,0,'MMM-2-001');
 named.players[0].hand=named.players[0].hand.filter(c=>c.uid!==buried.uid);
 named.players[0].removed.push(buried);
 const foe=put(named,1,'MMM-2-021','front',0,true);
 readyAp(named,0,3);
 const homura=toHand(named,0,'MMM-2-003');
 const before=named.players[0].deck.length;
 named=play(named,homura.uid);
 assert.equal(acts(named).some(a=>a.mode==='skip'),false);
 assert.deepEqual(acts(named).map(a=>a.mode).sort(),['a','b']);
 named=pick(named,a=>a.mode==='a');
 assert.equal(named.pending,null);
 assert.equal(named.players[0].deck.length,before-1);
 const second=toHand(named,0,'MMM-2-003');
 named=play(named,second.uid);
 assert.deepEqual(acts(named).map(a=>a.mode),['b']);
 named=pick(named,a=>a.mode==='b');
 assert.equal(named.pending.step,'u003b');
 named=pick(named,a=>a.uid===buried.uid);
 assert.equal(named.players[0].outside.some(c=>c.uid===buried.uid),true);
 assert.equal(named.pending.step,'restFoe');
 named=pick(named,a=>a.uid===foe.uid);
 assert.equal(live(named,1,foe.uid).ready,false);
 const third=toHand(named,0,'MMM-2-003');
 named=play(named,third.uid);
 assert.equal(named.pending,null);
 finish(named);
});

test('004 costs nothing on an empty field and peeks one card privately',()=>{
 const ids=['MMM-2-004','MMM-2-002','MMM-2-021'];
 let empty=toPhase(fresh(ids,20041),'main');
 readyAp(empty,0,1);
 const madoka=toHand(empty,0,'MMM-2-004');
 const top=crown(empty,0,['MMM-2-021'])[0];
 assert.equal(effectiveHandRequiredEnergy(pack,empty,0,pack.cards['MMM-2-004'],madoka),0);
 empty=play(empty,madoka.uid);
 assert.equal(empty.pending.kind,'private-top-choice');
 assert.equal(universalPrivateChoices(pack,empty,1),null);
 assert.equal(universalPublicView(pack,empty,1).publicReveals.some(e=>e.uid===top.uid),false);
 empty=pick(empty,a=>a.mode==='outside');
 assert.equal(empty.players[0].outside.some(c=>c.uid===top.uid),true);
 finish(empty);

 let occupied=toPhase(fresh(ids,20042),'main');
 put(occupied,0,'MMM-2-002','energy',0,true);
 const costly=toHand(occupied,0,'MMM-2-004');
 assert.equal(effectiveHandRequiredEnergy(pack,occupied,0,pack.cards['MMM-2-004'],costly),2);
 finish(occupied);
});

test('005 steps once and gains 1000 only on the opponent turn',()=>{
 const ids=['MMM-2-005','MMM-2-021'];
 let s=toPhase(fresh(ids,20051),'move');
 const kyoko=put(s,0,'MMM-2-005','front',0,true);
 assert.equal(bp(s,kyoko),3000);
 assert.equal(can(s,a=>a.type==='step'&&a.uid===kyoko.uid),true);
 s=pick(s,a=>a.type==='step'&&a.uid===kyoko.uid);
 assert.equal(s.players[0].energy.some(c=>c?.uid===kyoko.uid),true);
 assert.equal(can(s,a=>a.type==='step'&&a.uid===kyoko.uid),false);
 const foe=toSide(s,1,'main');
 assert.equal(bp(foe,live(foe,0,kyoko.uid)),4000);
 finish(foe);
});

test('006 gains 1000 while four or more own events are outside',()=>{
 const ids=['MMM-2-006','MMM-2-009','MMM-2-010','MMM-2-018'];
 let s=toPhase(fresh(ids,20061),'main');
 const mami=put(s,0,'MMM-2-006','front',0,true);
 assert.equal(bp(s,mami),2000);
 for(const id of ['MMM-2-009','MMM-2-010','MMM-2-018'])s.players[0].outside.push(take(s,0,id));
 assert.equal(bp(s,live(s,0,mami.uid)),2000);
 s.players[0].outside.push(take(s,0,'MMM-2-009'));
 assert.equal(bp(s,live(s,0,mami.uid)),3000);
 finish(s);
});

test('007 cannot enter beside another girl, counts one extra event, and replays on play',()=>{
 const ids=['MMM-2-007','MMM-2-005','MMM-2-006','MMM-2-008','MMM-2-009','MMM-2-010','MMM-2-018','MMM-2-002'];
 let blocked=toPhase(fresh(ids,20071),'main');
 put(blocked,0,'MMM-2-002','energy',0,true);
 put(blocked,0,'MMM-2-002','energy',1,true);
 put(blocked,0,'MMM-2-002','energy',2,true);
 const kyoko=put(blocked,0,'MMM-2-005','front',0,true);
 readyAp(blocked,0,1);
 const banned=toHand(blocked,0,'MMM-2-007');
 assert.equal(can(blocked,a=>a.type==='play'&&a.uid===banned.uid),false);
 blocked.players[0].front[0]=null;
 blocked.players[0].outside.push(kyoko);
 put(blocked,0,'MMM-2-006','front',0,true);
 assert.equal(can(blocked,a=>a.type==='play'&&a.uid===banned.uid),true);
 finish(blocked);

 let s=toPhase(fresh(ids,20072),'main');
 put(s,0,'MMM-2-002','energy',0,true);
 put(s,0,'MMM-2-002','energy',1,true);
 put(s,0,'MMM-2-002','energy',2,true);
 readyAp(s,0,1);
 const ally=put(s,0,'MMM-2-002','front',1,true);
 const mami=toHand(s,0,'MMM-2-007');
 s=play(s,mami.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(uids(s).includes(mami.uid),true);
 assert.equal(uids(s).includes(ally.uid),true);
 s=pick(s,a=>a.uid===ally.uid);
 assert.equal(bp(s,live(s,0,ally.uid)),3000);
 for(let i=0;i<4;i++)s.players[0].outside.push(take(s,0,i%2?'MMM-2-009':'MMM-2-010'));
 const copy=put(s,0,'MMM-2-007','front',2,true);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===copy.uid),false);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===mami.uid),false);
 s.players[0].outside.push(take(s,0,'MMM-2-018'));
 const third=put(s,0,'MMM-2-007','front',3,true);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===copy.uid),true);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===third.uid),true);
 s=pick(s,a=>a.type==='activate'&&a.uid===copy.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=pick(s,a=>a.uid==null||a.mode==='skip');
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===copy.uid),false);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===third.uid),true);
 finish(s);
});

test('008 draws and discards only after a removed character entered, once per Sayaka',()=>{
 const ids=['MMM-2-008','MMM-2-001','MMM-2-004','MMM-2-005','MMM-2-007','MMM-2-002'];
 let closed=toPhase(fresh(ids,20081),'main');
 const sayaka=put(closed,0,'MMM-2-008','front',0,true);
 readyAp(closed,0,1);
 assert.equal(can(closed,a=>a.type==='activate'&&a.uid===sayaka.uid),false);
 finish(closed);

 let s=toPhase(fresh(ids,20082),'main');
 put(s,0,'MMM-2-007','energy',0,true);
 put(s,0,'MMM-2-008','energy',1,true);
 put(s,0,'MMM-2-002','energy',2,true);
 const base=put(s,0,'MMM-2-004','front',0,true);
 const actor=put(s,0,'MMM-2-008','front',1,true);
 const other=put(s,0,'MMM-2-008','front',2,true);
 readyAp(s,0,1);
 park(s,0);
 const girl=toHand(s,0,'MMM-2-005');
 const ultimate=toHand(s,0,'MMM-2-001');
 s=raidOnto(s,ultimate.uid,base.uid);
 s=pick(s,a=>a.uid===girl.uid);
 s=pick(s,a=>a.uid===girl.uid&&a.line==='energy');
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===actor.uid),true);
 const before=s.players[0].deck.length;
 s=pick(s,a=>a.type==='activate'&&a.uid===actor.uid);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.step,'handOut');
 assert.equal(modes(s,'skip').length,0);
 const discard=s.players[0].hand[0];
 s=pick(s,a=>a.uid===discard.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===other.uid),false);
 finish(s);
});

test('009 buffs up to two characters and draws two when six other events are outside',()=>{
 const ids=['MMM-2-009','MMM-2-010','MMM-2-018','MMM-2-007','MMM-2-008','MMM-2-002','MMM-2-021'];
 let few=toPhase(fresh(ids,20091),'main');
 put(few,0,'MMM-2-008','energy',0,true);
 put(few,0,'MMM-2-002','energy',1,true);
 const one=put(few,0,'MMM-2-002','front',0,true);
 const two=put(few,0,'MMM-2-021','front',1,true);
 readyAp(few,0,1);
 const event=toHand(few,0,'MMM-2-009');
 const before=few.players[0].deck.length;
 few=cast(few,event.uid);
 assert.equal(few.pending.step,'u009');
 few=pick(few,a=>a.uid===one.uid);
 few=pick(few,a=>a.mode==='done');
 assert.equal(bp(few,live(few,0,one.uid)),4000);
 assert.equal(bp(few,live(few,0,two.uid)),1000);
 assert.equal(few.players[0].deck.length,before-1);
 finish(few);

 let many=toPhase(fresh(ids,20092),'main');
 put(many,0,'MMM-2-008','energy',0,true);
 put(many,0,'MMM-2-002','energy',1,true);
 put(many,0,'MMM-2-007','front',0,true);
 for(let i=0;i<5;i++)many.players[0].outside.push(take(many,0,i%2?'MMM-2-010':'MMM-2-018'));
 readyAp(many,0,1);
 const memory=toHand(many,0,'MMM-2-009');
 const deck=many.players[0].deck.length;
 many=cast(many,memory.uid);
 many=pick(many,a=>a.mode==='done');
 assert.equal(many.players[0].deck.length,deck-2);
 finish(many);
});

test('010 draws three while a Madoka name is on the field, then removes itself and one hand card',()=>{
 const ids=['MMM-2-010','MMM-2-004','MMM-2-011','MMM-2-002'];
 let plain=toPhase(fresh(ids,20101),'main');
 put(plain,0,'MMM-2-002','energy',0,true);
 put(plain,0,'MMM-2-002','energy',1,true);
 put(plain,0,'MMM-2-002','energy',2,true);
 readyAp(plain,0,1);
 park(plain,0);
 const keep=toHand(plain,0,'MMM-2-002');
 const event=toHand(plain,0,'MMM-2-010');
 const before=plain.players[0].deck.length;
 plain=cast(plain,event.uid);
 assert.equal(plain.players[0].deck.length,before-2);
 assert.equal(plain.pending.step,'u010');
 plain=pick(plain,a=>a.uid===keep.uid);
 assert.equal(plain.players[0].removed.some(c=>c.uid===keep.uid),true);
 assert.equal(plain.players[0].removed.some(c=>c.uid===event.uid),true);
 finish(plain);

 let named=toPhase(fresh(ids,20102),'main');
 put(named,0,'MMM-2-002','energy',0,true);
 put(named,0,'MMM-2-002','energy',1,true);
 put(named,0,'MMM-2-002','energy',2,true);
 put(named,0,'MMM-2-011','front',0,true);
 readyAp(named,0,1);
 park(named,0);
 const hand=toHand(named,0,'MMM-2-002');
 const card=toHand(named,0,'MMM-2-010');
 const deck=named.players[0].deck.length;
 named=cast(named,card.uid);
 assert.equal(named.players[0].deck.length,deck-3);
 named=pick(named,a=>a.uid===hand.uid);
 assert.equal(named.players[0].removed.some(c=>c.uid===card.uid),true);
 finish(named);
});

test('011 is a Madoka, and returning it may deploy an energy-1 purple character',()=>{
 const ids=['MMM-2-011','MMM-2-012','MMM-2-015','MMM-2-013','MMM-2-016','MMM-2-021'];
 let s=toPhase(fresh(ids,20111),'main');
 const ultimate=put(s,0,'MMM-2-011','front',1,true);
 const devil=put(s,0,'MMM-2-012','front',0,true);
 crown(s,0,['MMM-2-021','MMM-2-013']);
 readyAp(s,0,1);
 park(s,0);
 const madoka=toHand(s,0,'MMM-2-015');
 s=pick(s,a=>a.type==='activate'&&a.uid===devil.uid&&a.mode==='mmm2:0');
 s=pick(s,a=>a.uid===ultimate.uid);
 assert.equal(s.pending.step,'u012look');
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.players[0].hand.some(c=>c.uid===ultimate.uid),true);
 assert.equal(s.pending.step,'u011');
 assert.equal(uids(s).includes(ultimate.uid),true);
 s=pick(s,a=>a.uid===ultimate.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===ultimate.uid),true);
 assert.equal(uids(s).includes(ultimate.uid),false);
 assert.equal(uids(s).includes(madoka.uid),true);
 s=pick(s,a=>a.uid===madoka.uid&&a.line==='front');
 assert.equal(live(s,0,madoka.uid).ready,false);
 assert.equal(s.pending.step,'u011c');
 assert.equal(uids(s).includes(madoka.uid),true);
 s=pick(s,a=>a.uid===madoka.uid);
 assert.equal(live(s,0,madoka.uid).ready,true);
 assert.equal(bp(s,live(s,0,madoka.uid)),5000);
 finish(s);
});

test('012 bounces once per copy, and bottoms Madoka cards until their energy reaches 4',()=>{
 const ids=['MMM-2-012','MMM-2-004','MMM-2-013','MMM-2-016','MMM-2-011','MMM-2-021'];
 let look=toPhase(fresh(ids,20121),'main');
 put(look,0,'MMM-2-013','energy',0,true);
 put(look,0,'MMM-2-016','energy',1,true);
 const madoka=put(look,0,'MMM-2-004','front',1,true);
 const devil=put(look,0,'MMM-2-012','front',0,true);
 const window=crown(look,0,['MMM-2-021','MMM-2-013']);
 readyAp(look,0,1);
 look=pick(look,a=>a.type==='activate'&&a.uid===devil.uid&&a.mode==='mmm2:0');
 assert.equal(look.pending.step,'u012a');
 assert.equal(modes(look,'skip').length,0);
 look=pick(look,a=>a.uid===madoka.uid);
 assert.equal(look.players[0].hand.some(c=>c.uid===madoka.uid),true);
 assert.equal(look.pending.step,'u012look');
 assert.equal(universalPrivateChoices(pack,look,1),null);
 const seen=universalPrivateChoices(pack,look,0);
 assert.equal(seen.inspected.length,2);
 look=pick(look,a=>a.uid===window[0].uid);
 assert.equal(look.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(look.players[0].outside.some(c=>c.uid===window[1].uid),true);
 assert.equal(can(look,a=>a.type==='activate'&&a.uid===devil.uid&&a.mode==='mmm2:0'),false);
 finish(look);

 let bottom=toPhase(fresh(ids,20122),'main');
 const short=take(bottom,0,'MMM-2-004');
 bottom.players[0].outside.push(short);
 const actor=put(bottom,0,'MMM-2-012','energy',0,false);
 assert.equal(can(bottom,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='mmm2:1'),false);
 const extra=take(bottom,0,'MMM-2-004');
 const big=take(bottom,0,'MMM-2-011');
 bottom.players[0].outside.push(extra,big);
 readyAp(bottom,0,1);
 bottom=pick(bottom,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='mmm2:1');
 bottom=pick(bottom,a=>a.uid===big.uid);
 assert.equal(bottom.pending.step,'u012b');
 assert.equal(modes(bottom,'done').length,1);
 assert.equal(bottom.players[0].deck.at(-1).uid,big.uid);
 bottom=pick(bottom,a=>a.mode==='done');
 assert.equal(live(bottom,0,actor.uid).ready,true);
 assert.equal(bottom.players[0].outside.some(c=>c.uid===extra.uid),true);
 const copy=put(bottom,0,'MMM-2-012','front',0,true);
 assert.equal(can(bottom,a=>a.type==='activate'&&a.uid===copy.uid&&a.mode==='mmm2:1'),false);
 finish(bottom);

 let pair=toPhase(fresh(ids,20123),'main');
 const first=take(pair,0,'MMM-2-004');
 const second=take(pair,0,'MMM-2-004');
 pair.players[0].outside.push(first,second);
 const homura=put(pair,0,'MMM-2-012','front',0,false);
 readyAp(pair,0,1);
 pair=pick(pair,a=>a.type==='activate'&&a.uid===homura.uid&&a.mode==='mmm2:1');
 pair=pick(pair,a=>a.uid===first.uid);
 assert.equal(modes(pair,'done').length,0);
 pair=pick(pair,a=>a.uid===second.uid);
 assert.equal(pair.pending,null);
 assert.equal(live(pair,0,homura.uid).ready,true);
 assert.equal(pair.players[0].deck.at(-1).uid,first.uid);
 assert.equal(pair.players[0].deck.at(-2).uid,second.uid);
 finish(pair);
});

test('013 gains 1000 on its own turn while a Madoka name is on this field',()=>{
 const ids=['MMM-2-013','MMM-2-011','MMM-2-004','MMM-2-021'];
 let s=toPhase(fresh(ids,20131),'main');
 const homura=put(s,0,'MMM-2-013','front',0,true);
 assert.equal(bp(s,homura),3000);
 put(s,0,'MMM-2-011','energy',0,true);
 assert.equal(bp(s,live(s,0,homura.uid)),4000);
 const foe=toSide(s,1,'main');
 assert.equal(bp(foe,live(foe,0,homura.uid)),3000);
 finish(foe);
});

test('014 cuts 1000 only after an own-effect entry, and BP 0 leaves by the rule',()=>{
 const ids=['MMM-2-014','MMM-2-018','MMM-2-017','MMM-2-013','MMM-2-016','MMM-2-021'];
 let paid=toPhase(fresh(ids,20141),'main');
 readyAp(paid,0,1);
 const foe=put(paid,1,'MMM-2-013','front',0,true);
 paid=play(paid,toHand(paid,0,'MMM-2-014').uid);
 assert.equal(paid.pending,null);
 assert.equal(bp(paid,foe),3000);
 finish(paid);

 let cut=toPhase(fresh(ids,20142),'main');
 put(cut,0,'MMM-2-013','energy',0,true);
 put(cut,0,'MMM-2-016','energy',1,true);
 put(cut,0,'MMM-2-017','energy',2,true);
 const wall=put(cut,1,'MMM-2-013','front',0,true);
 const zero=put(cut,1,'MMM-2-017','front',1,true);
 readyAp(cut,0,2);
 const homura=toHand(cut,0,'MMM-2-014');
 cut.players[0].hand=cut.players[0].hand.filter(c=>c.uid!==homura.uid);
 cut.players[0].outside.push(homura);
 cut=cast(cut,toHand(cut,0,'MMM-2-018').uid);
 cut=pick(cut,a=>a.uid===homura.uid);
 cut=pick(cut,a=>a.uid===homura.uid&&a.line==='front');
 assert.equal(cut.pending.step,'u014');
 assert.equal(uids(cut).includes(wall.uid),true);
 assert.equal(uids(cut).includes(zero.uid),true);
 assert.equal(modes(cut,'skip').length,1);
 cut=pick(cut,a=>a.uid===zero.uid);
 if(cut.pending?.step==='u018')cut=pick(cut,a=>a.mode==='done');
 assert.equal(cut.players[1].outside.some(c=>c.uid===zero.uid),true);
 assert.equal(cut.players[1].removed.some(c=>c.uid===zero.uid),false);
 assert.equal(bp(cut,live(cut,1,wall.uid)),3000);
 finish(cut);
});

test('015 draws one and must put one hand card outside',()=>{
 const ids=['MMM-2-015','MMM-2-017','MMM-2-021'];
 let s=toPhase(fresh(ids,20151),'main');
 put(s,0,'MMM-2-017','energy',0,true);
 readyAp(s,0,1);
 park(s,0);
 const spare=toHand(s,0,'MMM-2-021');
 const madoka=toHand(s,0,'MMM-2-015');
 const before=s.players[0].deck.length;
 s=play(s,madoka.uid);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 s=pick(s,a=>a.uid===spare.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 finish(s);
});

test('016 retires another energy-4 character, and a purple 1 sets both block floors',()=>{
 const ids=['MMM-2-016','MMM-2-017','MMM-2-014','MMM-2-013','MMM-2-012','MMM-2-011','MMM-2-021'];
 let retire=toPhase(fresh(ids,20161),'main');
 const nagisa=put(retire,0,'MMM-2-016','front',0,true);
 const other=put(retire,0,'MMM-2-012','front',1,true);
 const expensive=put(retire,0,'MMM-2-011','energy',0,true);
 readyAp(retire,0,1);
 assert.equal(can(retire,a=>a.type==='activate'&&a.uid===nagisa.uid&&a.mode==='mmm2:0'),true);
 const before=retire.players[0].deck.length;
 retire=pick(retire,a=>a.type==='activate'&&a.uid===nagisa.uid&&a.mode==='mmm2:0');
 assert.equal(retire.pending.step,'u016a');
 assert.equal(uids(retire).includes(other.uid),true);
 assert.equal(uids(retire).includes(expensive.uid),false);
 retire=pick(retire,a=>a.uid===other.uid);
 assert.equal(retire.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(retire.players[0].deck.length,before-1);
 assert.equal(live(retire,0,nagisa.uid).ready,true);
 assert.equal(can(retire,a=>a.type==='activate'&&a.uid===nagisa.uid&&a.mode==='mmm2:0'),false);
 finish(retire);

 let reveal=toPhase(fresh(ids,20162),'main');
 const actor=put(reveal,0,'MMM-2-016','front',0,true);
 put(reveal,0,'MMM-2-017','energy',0,true);
 const top=crown(reveal,0,['MMM-2-017'])[0];
 readyAp(reveal,0,1);
 reveal=pick(reveal,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='mmm2:1');
 assert.equal(reveal.pending.step,'u016b');
 assert.equal(universalPublicView(pack,reveal,1).publicReveals.some(e=>e.uid===top.uid),true);
 reveal=pick(reveal,a=>a.mode==='top');
 assert.equal(live(reveal,0,actor.uid).mmm2Block.atLeast,4000);
 assert.equal(live(reveal,0,actor.uid).mmm2Block.atMost,2000);
 const low=put(reveal,1,'MMM-2-021','front',0,true);
 const high=put(reveal,1,'MMM-2-012','front',1,true);
 reveal=toPhase(reveal,'attack');
 reveal=pick(reveal,a=>a.type==='attack'&&a.uid===actor.uid&&!a.targetUid);
 const blocks=acts(reveal).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===high.uid),false);
 assert.equal(blocks.some(a=>a.uid==null),true);
 finish(reveal);
});

test('017 reduces purple deck energy by one per copy and buffs another character',()=>{
 const ids=['MMM-2-017','MMM-2-016','MMM-2-014','MMM-2-021'];
 let s=toPhase(fresh(ids,20171),'main');
 const mami=put(s,0,'MMM-2-017','front',0,true);
 const second=put(s,0,'MMM-2-017','energy',0,true);
 const ally=put(s,0,'MMM-2-021','front',1,true);
 const nagisa=put(s,0,'MMM-2-016','front',2,true);
 const top=crown(s,0,['MMM-2-016'])[0];
 readyAp(s,0,1);
 s=pick(s,a=>a.type==='activate'&&a.uid===mami.uid);
 assert.equal(s.pending.step,'buff');
 assert.equal(uids(s).includes(ally.uid),true);
 assert.equal(uids(s).includes(mami.uid),false);
 s=pick(s,a=>a.uid===ally.uid);
 assert.equal(bp(s,live(s,0,ally.uid)),2000);
 s=pick(s,a=>a.type==='activate'&&a.uid===nagisa.uid&&a.mode==='mmm2:1');
 s=pick(s,a=>a.mode==='outside');
 assert.equal(s.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(live(s,0,nagisa.uid).mmm2Block.atLeast,4000);
 assert.equal(live(s,0,nagisa.uid).mmm2Block.atMost,2000);
 assert.equal(live(s,0,second.uid).ready,true);
 finish(s);
});

test('018 deploys one Homura and one Madoka from outside, then readies an AP for Devil Homura',()=>{
 const ids=['MMM-2-018','MMM-2-014','MMM-2-015','MMM-2-012','MMM-2-013','MMM-2-016','MMM-2-017'];
 let s=toPhase(fresh(ids,20181),'main');
 put(s,0,'MMM-2-013','energy',0,true);
 put(s,0,'MMM-2-016','energy',1,true);
 put(s,0,'MMM-2-012','front',0,true);
 readyAp(s,0,3);
 s.players[0].apCards[2].ready=false;
 const homura=toHand(s,0,'MMM-2-014');
 const madoka=toHand(s,0,'MMM-2-015');
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==homura.uid&&c.uid!==madoka.uid);
 s.players[0].outside.push(homura,madoka);
 s=cast(s,toHand(s,0,'MMM-2-018').uid);
 s=pick(s,a=>a.uid===homura.uid);
 s=pick(s,a=>a.uid===homura.uid&&a.line==='energy');
 if(s.pending?.step==='u014')s=pick(s,a=>a.mode==='skip');
 s=pick(s,a=>a.uid===madoka.uid);
 s=pick(s,a=>a.uid===madoka.uid&&a.line==='front');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(live(s,0,homura.uid).ready,false);
 assert.equal(live(s,0,madoka.uid).ready,false);
 finish(s);
});

test('019 rests, draws one, and must put one hand card outside',()=>{
 const ids=['MMM-2-019','MMM-2-021'];
 let s=toPhase(fresh(ids,20191),'main');
 const kaede=put(s,0,'MMM-2-019','front',0,true);
 readyAp(s,0,1);
 park(s,0);
 const spare=toHand(s,0,'MMM-2-021');
 const before=s.players[0].deck.length;
 s=pick(s,a=>a.type==='activate'&&a.uid===kaede.uid);
 assert.equal(live(s,0,kaede.uid).ready,false);
 assert.equal(s.players[0].deck.length,before-1);
 s=pick(s,a=>a.uid===spare.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(can(s,a=>a.type==='activate'&&a.uid===kaede.uid),false);
 finish(s);
});

test('020 gains 1000 while Oriko is on the field, and may buff Oriko when it leaves',()=>{
 const ids=['MMM-2-020','MMM-2-023','MMM-1-001','MMM-2-021'];
 let s=toPhase(fresh(ids,20201),'main');
 const kirika=put(s,0,'MMM-2-020','front',0,true);
 assert.equal(bp(s,kirika),3000);
 const oriko=put(s,0,'MMM-2-023','energy',0,true);
 assert.equal(bp(s,live(s,0,kirika.uid)),4000);
 const foe=toSide(s,1,'main');
 assert.equal(bp(foe,live(foe,0,kirika.uid)),3000);
 const hammer=put(foe,1,'MMM-1-001','front',0,true);
 let battle=toPhase(foe,'attack');
 battle=pick(battle,a=>a.type==='attack'&&a.uid===hammer.uid&&!a.targetUid);
 battle=pick(battle,a=>a.type==='chooseBlock'&&a.uid===kirika.uid);
 assert.equal(battle.pending.kind,'effect-buff-own');
 assert.equal(uids(battle).includes(oriko.uid),true);
 battle=pick(battle,a=>a.uid===oriko.uid);
 assert.equal(bp(battle,live(battle,0,oriko.uid)),5000);
 finish(battle);
});

test('021 grants one green energy this turn and retires when main ends',()=>{
 const ids=['MMM-2-021','MMM-2-002'];
 let front=toPhase(fresh(ids,20211),'main');
 const shown=put(front,0,'MMM-2-021','front',0,true);
 const frontEnergy=universalEnergyByColor(pack,front,0).green||0;
 front=pick(front,a=>a.type==='activate'&&a.uid===shown.uid&&a.mode==='selfRestEnergyRetire');
 assert.equal(live(front,0,shown.uid).ready,false);
 assert.equal(universalCardEnergy(pack,front,0,live(front,0,shown.uid)),0);
 assert.equal(universalEnergyByColor(pack,front,0).green||0,frontEnergy);
 front=toPhase(front,'attack');
 assert.equal(front.players[0].outside.some(c=>c.uid===shown.uid),true);
 finish(front);

 let s=toPhase(fresh(ids,20212),'main');
 const ui=put(s,0,'MMM-2-021','energy',0,true);
 assert.equal(universalCardEnergy(pack,s,0,ui),1);
 const before=universalEnergyByColor(pack,s,0).green||0;
 s=pick(s,a=>a.type==='activate'&&a.uid===ui.uid&&a.mode==='selfRestEnergyRetire');
 assert.equal(live(s,0,ui.uid).ready,false);
 assert.equal(universalCardEnergy(pack,s,0,live(s,0,ui.uid)),2);
 assert.equal(universalEnergyByColor(pack,s,0).green||0,before+1);
 s=toPhase(s,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===ui.uid),true);
 assert.equal(s.players[0].removed.some(c=>c.uid===ui.uid),false);
 assert.equal(universalEnergyByColor(pack,s,0).green||0,0);
 finish(s);
});

test('022 may give another character 1000 BP and cannot choose itself',()=>{
 const ids=['MMM-2-022','MMM-2-021','MMM-2-020'];
 let s=toPhase(fresh(ids,20221),'main');
 put(s,0,'MMM-2-020','energy',0,true);
 const ally=put(s,0,'MMM-2-021','front',1,true);
 readyAp(s,0,1);
 const momoko=toHand(s,0,'MMM-2-022');
 s=play(s,momoko.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.equal(uids(s).includes(momoko.uid),false);
 s=pick(s,a=>a.uid===ally.uid);
 assert.equal(bp(s,live(s,0,ally.uid)),2000);
 const later=toSide(s,1,'main');
 assert.equal(bp(later,live(later,0,ally.uid)),1000);
 finish(later);
});

test('023 enters active and may deploy the Kirika it just put outside',()=>{
 const ids=['MMM-2-023','MMM-2-020','MMM-2-025','MMM-2-021'];
 let s=toPhase(fresh(ids,20231),'main');
 put(s,0,'MMM-2-020','energy',0,true);
 put(s,0,'MMM-2-025','energy',1,true);
 readyAp(s,0,2);
 park(s,0);
 const kirika=toHand(s,0,'MMM-2-020');
 const oriko=toHand(s,0,'MMM-2-023');
 s=play(s,oriko.uid);
 assert.equal(live(s,0,oriko.uid).ready,true);
 assert.equal(s.pending.step,'u023');
 s=pick(s,a=>a.uid===kirika.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===kirika.uid),true);
 s=pick(s,a=>a.uid===kirika.uid&&a.line==='front');
 assert.equal(live(s,0,kirika.uid).ready,false);
 finish(s);
});

test('024 returns another energy-1 character, or itself when none exists',()=>{
 const ids=['MMM-2-024','MMM-2-021','MMM-2-020'];
 let other=toPhase(fresh(ids,20241),'main');
 const small=put(other,0,'MMM-2-021','front',1,true);
 const heavy=put(other,0,'MMM-2-020','energy',0,true);
 readyAp(other,0,1);
 const rena=toHand(other,0,'MMM-2-024');
 other=play(other,rena.uid);
 assert.equal(other.pending.kind,'effect-bounce-own');
 assert.equal(uids(other).includes(small.uid),true);
 assert.equal(uids(other).includes(heavy.uid),false);
 assert.equal(uids(other).includes(rena.uid),false);
 other=pick(other,a=>a.uid===small.uid);
 assert.equal(other.players[0].hand.some(c=>c.uid===small.uid),true);
 assert.equal(live(other,0,rena.uid)?.cardId,'MMM-2-024');
 finish(other);

 let self=toPhase(fresh(ids,20242),'main');
 put(self,0,'MMM-2-020','energy',0,true);
 readyAp(self,0,1);
 const alone=toHand(self,0,'MMM-2-024');
 self=play(self,alone.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===alone.uid),true);
 assert.equal(self.players[0].front.some(c=>c?.uid===alone.uid),false);
 finish(self);
});

test('025 moves another Mikazuki character to the energy line, removing one card when that line is full',()=>{
 const ids=['MMM-2-025','MMM-2-021','MMM-2-022','MMM-2-019','MMM-2-020'];
 let open=toPhase(fresh(ids,20251),'main');
 const iroha=put(open,0,'MMM-2-025','front',0,true);
 const sana=put(open,0,'MMM-2-025','front',1,true);
 readyAp(open,0,1);
 open=pick(open,a=>a.type==='activate'&&a.uid===iroha.uid);
 assert.equal(open.pending.step,'moveLine');
 assert.equal(acts(open).some(a=>a.uid===sana.uid&&a.replaceUid),false);
 open=pick(open,a=>a.uid===sana.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.equal(open.players[0].energy.some(c=>c?.uid===sana.uid),true);
 assert.equal(can(open,a=>a.type==='activate'&&a.uid===iroha.uid),false);
 finish(open);

 let full=toPhase(fresh(ids,20252),'main');
 const mover=put(full,0,'MMM-2-025','front',0,true);
 const moving=put(full,0,'MMM-2-025','front',1,true);
 const occupants=[0,1,2,3].map(slot=>put(full,0,['MMM-2-021','MMM-2-022','MMM-2-019','MMM-2-020'][slot],'energy',slot,true));
 readyAp(full,0,1);
 full=pick(full,a=>a.type==='activate'&&a.uid===mover.uid);
 assert.equal(acts(full).some(a=>a.uid===moving.uid&&a.replaceUid===occupants[0].uid),true);
 full=pick(full,a=>a.uid===moving.uid&&a.replaceUid===occupants[0].uid);
 assert.equal(full.players[0].removed.some(c=>c.uid===occupants[0].uid),true);
 assert.equal(full.players[0].energy.some(c=>c?.uid===moving.uid),true);
 finish(full);
});

function swing(seed,lifeId,extra=[],prepare=null){
 const ids=['MMM-2-021','MMM-2-005',lifeId,...extra];
 let s=toPhase(fresh(ids,seed),'attack');
 const swinger=put(s,0,'MMM-2-021','front',0,true);
 const pl=s.players[1];
 while(pl.life.length)pl.deck.push(pl.life.pop());
 const blank=take(s,1,'MMM-2-005');
 const flipped=lifeId==='MMM-2-005'?take(s,1,'MMM-2-005'):take(s,1,lifeId);
 pl.life=[flipped,blank];
 if(prepare)prepare(s,flipped);
 s=pick(s,a=>a.type==='attack'&&a.uid===swinger.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 return {s,flipped};
}

test('life triggers of 001-025 each resolve from a real hit',()=>{
 const draws=['MMM-2-002','MMM-2-004','MMM-2-007','MMM-2-010','MMM-2-013','MMM-2-014','MMM-2-016','MMM-2-018','MMM-2-025'];
 draws.forEach((id,i)=>{
  const {s,flipped}=swing(21000+i,id);
  assert.equal(s.pending.trigger,'draw',id);
  const hand=s.players[1].hand.length;
  const done=pick(s,a=>a.mode==='draw');
  assert.equal(done.players[1].hand.length,hand+1,id);
  assert.equal(done.players[1].outside.some(c=>c.uid===flipped.uid),true,id);
  finish(done);
 });
 for(const [i,id] of ['MMM-2-003','MMM-2-008','MMM-2-009','MMM-2-017'].entries()){
  const {s,flipped}=swing(21100+i,id,[],state=>{
   put(state,1,'MMM-2-021','front',0,false);
  });
  assert.equal(s.pending.trigger,'active',id);
  const rested=s.players[1].front.find(c=>c&&!c.ready);
  const done=pick(s,a=>a.mode==='active'&&a.uid===rested.uid);
  assert.equal(live(done,1,rested.uid).ready,true,id);
  assert.equal(done.players[1].outside.some(c=>c.uid===flipped.uid),true,id);
  finish(done);
 }
 for(const [i,id] of ['MMM-2-012','MMM-2-023'].entries()){
  const {s,flipped}=swing(21200+i,id);
  assert.equal(s.pending.trigger,'get',id);
  const done=pick(s,a=>a.mode==='get');
  assert.equal(done.players[1].hand.some(c=>c.uid===flipped.uid),true,id);
  finish(done);
 }
 let colorTarget=null;
 const color=swing(21300,'MMM-2-011',['MMM-2-014'],state=>{
  colorTarget=take(state,1,'MMM-2-014');
  state.players[1].outside.push(colorTarget);
 });
 assert.equal(color.s.pending.trigger,'color');
 const seated=pick(color.s,a=>a.mode==='colorOutside'&&a.uid===colorTarget.uid);
 assert.equal(live(seated,1,colorTarget.uid).ready,true);
 assert.equal(seated.pending,null);
 finish(seated);
 let raidBase=null;
 const raid=swing(21301,'MMM-2-001',['MMM-2-004','MMM-2-007','MMM-2-008','MMM-2-002'],state=>{
  put(state,1,'MMM-2-007','energy',0,true);
  put(state,1,'MMM-2-008','energy',1,true);
  put(state,1,'MMM-2-002','energy',2,true);
  raidBase=put(state,1,'MMM-2-004','front',0,true);
 });
 assert.equal(raid.s.pending.trigger,'raid');
 assert.equal(acts(raid.s).some(a=>a.mode==='get'),true);
 let raided=pick(raid.s,a=>a.mode==='raid'&&a.baseUid===raidBase.uid);
 assert.equal(live(raided,1,raid.flipped.uid).ready,true);
 assert.equal(live(raided,1,raid.flipped.uid).stack.some(c=>c.uid===raidBase.uid),true);
 assert.equal(raided.pending.step,'u001');
 raided=pick(raided,a=>a.mode==='skip');
 finish(raided);
 for(const [i,id] of ['MMM-2-005','MMM-2-006','MMM-2-015','MMM-2-019','MMM-2-020','MMM-2-021','MMM-2-022','MMM-2-024'].entries()){
  const {s,flipped}=swing(21400+i,id);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].outside.some(c=>c.uid===flipped.uid),true,id);
  finish(s);
 }
});
