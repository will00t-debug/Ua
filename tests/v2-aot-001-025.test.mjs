import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalPrivateChoices,
 zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';
import {effectChoiceProtected} from '../dist/universal-v2/continuous-states.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];
const card=id=>AOT_CARDS.find(c=>c.id===id);

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
  counts[id]=add;
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
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function setLife(s,p,ids){
 const life=ids.map(id=>take(s,p,id));
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life=life;
 return life;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase+' from '+s.phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function pick(s,pred){
 const actions=legalUniversalActions(packs,s);
 const action=actions.find(pred);
 if(!action)throw Error('No legal action in '+s.pending?.kind+'/'+(s.pending?.step||'')+
  ' '+actions.map(a=>a.type+':'+(a.mode||'')+':'+(a.uid||'')).slice(0,6).join(','));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,line='front'){
 return pick(s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
}
function raidOnto(s,uid,baseUid,line='front'){
 return pick(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid&&
  (line==='energy'?a.line==='energy':a.line!=='energy'));
}
function opponentMain(s){
 let guard=0;
 while(!(s.phase==='main'&&s.active===1)){
  if(s.pending)throw Error('Pending blocked the turn pass '+s.pending.kind);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach the opponent main from '+s.phase);
 }
 return s;
}
function fuel(s,p=0){
 ['AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'].forEach((id,slot)=>put(s,p,id,'energy',slot,true));
}
function live(s,p,id){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.cardId===id);
}
function handOf(s,p,id){return s.players[p].hand.find(c=>c.cardId===id);}
function bp(s,c){return universalBp(packs,s,c);}
function finish(s){assertUniversalMatch(packs,s);return s;}

test('001, 007, 012 and 019 have no effect and one printing',()=>{
 for(const id of ['AOT-1-001','AOT-1-007','AOT-1-012','AOT-1-019']){
  const printed=card(id);
  assert.equal(printed.effectJa,'');
  assert.equal(printed.printings.length,1);
  assert.equal(printed.printings[0].number,'UA23BT/'+id);
 }
 let s=toPhase(fresh(['AOT-1-001'],1),'main');
 const erwin=toHand(s,0,'AOT-1-001');
 s=play(s,erwin.uid);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,'AOT-1-001').ready,false);
 finish(s);
});

test('002 looks at three cards, adds only an exact Levi, and discards only then',()=>{
 let s=toPhase(fresh(['AOT-1-002','AOT-1-007','AOT-1-004','AOT-1-001','AOT-1-006','AOT-1-015','AOT-1-012'],2),'main');
 put(s,0,'AOT-1-006','energy',0,true);
 put(s,0,'AOT-1-015','energy',1,true);
 readyAp(s);
 const fodder=toHand(s,0,'AOT-1-012');
 const erwin=toHand(s,0,'AOT-1-002');
 const window=crown(s,0,['AOT-1-004','AOT-1-007','AOT-1-001']);
 const handBefore=s.players[0].hand.length;
 s=play(s,erwin.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.deepEqual(s.pending.choices,[window[1].uid]);
 const mine=universalPrivateChoices(packs,s,0);
 assert.equal(mine.inspected.length,3);
 assert.equal(mine.inspected.some(c=>c.cardId==='AOT-1-004'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 assert.equal(s.pending.kind,'effect-top-order');
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),false);
 s=pick(s,a=>a.uid===window[2].uid);
 s=pick(s,a=>a.uid===window[0].uid);
 s=pick(s,a=>a.uid===window[1].uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.deepEqual(s.players[0].deck.slice(-3).map(c=>c.uid),[window[2].uid,window[0].uid,window[1].uid]);
 assert.equal(handOf(s,0,'AOT-1-012').uid,fodder.uid);

 let added=toPhase(fresh(['AOT-1-002','AOT-1-007','AOT-1-004','AOT-1-001','AOT-1-006','AOT-1-015'],3),'main');
 put(added,0,'AOT-1-006','energy',0,true);
 put(added,0,'AOT-1-015','energy',1,true);
 readyAp(added);
 const top=crown(added,0,['AOT-1-004','AOT-1-007','AOT-1-001']);
 const actor=toHand(added,0,'AOT-1-002');
 const dump=added.players[0].hand.find(c=>c.uid!==actor.uid);
 added=play(added,actor.uid);
 added=pick(added,a=>a.type==='chooseTopFiltered'&&a.uid===top[1].uid);
 assert.equal(added.publicReveals.filter(r=>r.kind==='searched-to-hand').map(r=>r.uid).join(),top[1].uid);
 added=pick(added,a=>a.uid===top[0].uid);
 added=pick(added,a=>a.uid===top[2].uid);
 assert.equal(added.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,added).some(a=>a.uid===null),false);
 added=pick(added,a=>a.type==='chooseDiscard'&&a.uid===dump.uid);
 assert.equal(added.players[0].outside.some(c=>c.uid===dump.uid),true);
 assert.equal(added.players[0].hand.some(c=>c.uid===top[1].uid),true);
 assert.deepEqual(added.players[0].deck.slice(-2).map(c=>c.uid),[top[0].uid,top[2].uid]);
 finish(added);
});

test('002 pays one AP once, adds blue energy, and may ready one AP at attack start',()=>{
 let s=toPhase(fresh(['AOT-1-002','AOT-1-006'],4),'main');
 const erwin=put(s,0,'AOT-1-002','energy',0,true);
 put(s,0,'AOT-1-006','energy',1,true);
 readyAp(s,0,0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===erwin.uid),false);
 readyAp(s,0,1);
 assert.equal(universalCardEnergy(packs,s,0,erwin),2);
 s=pick(s,a=>a.type==='activate'&&a.uid===erwin.uid);
 assert.equal(s.pending,null);
 const lived=s.players[0].energy.find(c=>c?.uid===erwin.uid);
 assert.equal(universalCardEnergy(packs,s,0,lived),3);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 lived.ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===erwin.uid),false);
 s=toPhase(s,'attack');
 assert.equal(s.pending.kind,'aot');
 assert.equal(s.pending.step,'ready');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='skip'),true);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].apCards.some(c=>c.ready),false);
 finish(s);
});

test('003 may rest one active heir or pure titan, and that player draws',()=>{
 let s=toPhase(fresh(['AOT-1-003','AOT-1-012','AOT-1-040','AOT-1-001','AOT-1-006','AOT-1-015'],5),'main');
 put(s,0,'AOT-1-006','energy',0,true);
 put(s,0,'AOT-1-015','energy',1,true);
 readyAp(s);
 const mine=put(s,0,'AOT-1-012','front',0,true);
 const decoy=put(s,0,'AOT-1-001','front',1,true);
 const theirs=put(s,1,'AOT-1-040','front',0,true);
 const asleep=put(s,1,'AOT-1-012','front',1,false);
 const hange=toHand(s,0,'AOT-1-003');
 const myHand=s.players[0].hand.length,oppHand=s.players[1].hand.length;
 s=play(s,hange.uid);
 assert.equal(s.pending.step,'restEither');
 const ids=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(ids.includes(mine.uid),true);
 assert.equal(ids.includes(theirs.uid),true);
 assert.equal(ids.includes(decoy.uid),false);
 assert.equal(ids.includes(asleep.uid),false);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].hand.length,myHand-1);
 assert.equal(s.players[1].hand.length,oppHand);
 assert.equal(s.players[0].front.find(c=>c?.uid===mine.uid).ready,true);

 let own=toPhase(fresh(['AOT-1-003','AOT-1-012','AOT-1-040','AOT-1-001','AOT-1-006','AOT-1-015'],6),'main');
 put(own,0,'AOT-1-006','energy',0,true);
 put(own,0,'AOT-1-015','energy',1,true);
 readyAp(own);
 const heir=put(own,0,'AOT-1-012','front',0,true);
 const actor=toHand(own,0,'AOT-1-003');
 const before=own.players[0].hand.length;
 const oppBefore=own.players[1].hand.length;
 own=play(own,actor.uid);
 own=pick(own,a=>a.uid===heir.uid);
 assert.equal(own.players[0].front.find(c=>c?.uid===heir.uid).ready,false);
 assert.equal(own.players[0].hand.length,before);
 assert.equal(own.players[1].hand.length,oppBefore);

 let foe=toPhase(fresh(['AOT-1-003','AOT-1-040','AOT-1-006','AOT-1-015'],8),'main');
 put(foe,0,'AOT-1-006','energy',0,true);
 put(foe,0,'AOT-1-015','energy',1,true);
 readyAp(foe);
 const pure=put(foe,1,'AOT-1-040','front',0,true);
 const cardInHand=toHand(foe,0,'AOT-1-003');
 const foeHand=foe.players[1].hand.length;
 const myBefore=foe.players[0].hand.length;
 foe=play(foe,cardInHand.uid);
 foe=pick(foe,a=>a.uid===pure.uid);
 assert.equal(foe.players[1].front.find(c=>c?.uid===pure.uid).ready,false);
 assert.equal(foe.players[1].hand.length,foeHand+1);
 assert.equal(foe.players[0].hand.length,myBefore-1);
 finish(foe);
});

test('004 gains 2000 only after AP is paid during this attack phase',()=>{
 let s=toPhase(fresh(['AOT-1-004','AOT-1-002','AOT-1-008','AOT-1-006'],9),'main');
 const eld=put(s,0,'AOT-1-004','front',0,true);
 const erwin=put(s,0,'AOT-1-002','energy',0,true);
 put(s,0,'AOT-1-006','energy',1,true);
 readyAp(s,0,2);
 s=pick(s,a=>a.type==='activate'&&a.uid===erwin.uid);
 assert.equal(bp(s,eld),1500);
 s=toPhase(s,'attack');
 s=pick(s,a=>a.mode==='skip');
 const levi=put(s,0,'AOT-1-008','front',1,true);
 readyAp(s,0,1);
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===eld.uid)),1500);
 s=pick(s,a=>a.type==='attack'&&a.uid===levi.uid&&!a.targetUid);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===eld.uid)),1500);
 finish(s);

 let paid=toPhase(fresh(['AOT-1-004','AOT-1-008'],10),'attack');
 const wall=put(paid,0,'AOT-1-004','front',0,true);
 const attacker=put(paid,0,'AOT-1-008','front',1,true);
 readyAp(paid);
 paid=pick(paid,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 paid=pick(paid,a=>a.mode==='pay');
 assert.equal(bp(paid,paid.players[0].front.find(c=>c.uid===wall.uid)),3500);
 finish(paid);
});

test('005 rests once, adds one blue energy, and leaves at the end of main',()=>{
 let s=toPhase(fresh(['AOT-1-005'],11),'main');
 const oruo=put(s,0,'AOT-1-005','energy',0,true);
 readyAp(s);
 assert.equal(universalCardEnergy(packs,s,0,oruo),1);
 s=pick(s,a=>a.type==='activate'&&a.uid===oruo.uid);
 const body=s.players[0].energy[0];
 assert.equal(body.ready,false);
 assert.equal(universalCardEnergy(packs,s,0,body),2);
 body.ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===oruo.uid),false);
 s=toPhase(s,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===oruo.uid),true);
 finish(s);
});

test('006 readies up to one AP when the attack phase starts, including zero',()=>{
 let s=toPhase(fresh(['AOT-1-006','AOT-1-002','AOT-1-015'],12),'main');
 put(s,0,'AOT-1-002','energy',0,true);
 put(s,0,'AOT-1-015','energy',1,true);
 readyAp(s,0,2);
 const petra=toHand(s,0,'AOT-1-006');
 s=play(s,petra.uid);
 assert.equal(s.pending,null);
 s.players[0].apCards[0].ready=false;
 s=toPhase(s,'attack');
 assert.equal(s.pending.step,'ready');
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].apCards[0].ready,false);
 finish(s);

 let quiet=toPhase(fresh(['AOT-1-006','AOT-1-002','AOT-1-015'],13),'main');
 put(quiet,0,'AOT-1-002','energy',0,true);
 put(quiet,0,'AOT-1-015','energy',1,true);
 readyAp(quiet,0,2);
 const other=toHand(quiet,0,'AOT-1-006');
 quiet=play(quiet,other.uid);
 for(const ap of quiet.players[0].apCards)if(ap.inPlay)ap.ready=true;
 quiet=toPhase(quiet,'attack');
 assert.equal(quiet.pending,null);
 finish(quiet);
});

test('008 and 009 may pay one AP to draw and raise their own BP',()=>{
 let s=toPhase(fresh(['AOT-1-008','AOT-1-009'],14),'attack');
 const small=put(s,0,'AOT-1-008','front',0,true);
 readyAp(s,0,0);
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 s=pick(s,a=>a.type==='attack'&&a.uid===small.uid&&!a.targetUid);
 assert.equal(s.pending.kind,'block');
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===small.uid)),2500);

 let paid=toPhase(fresh(['AOT-1-008'],15),'attack');
 const levi=put(paid,0,'AOT-1-008','front',0,true);
 readyAp(paid,0,1);
 const before=paid.players[0].hand.length;
 paid=pick(paid,a=>a.type==='attack'&&a.uid===levi.uid&&!a.targetUid);
 paid=pick(paid,a=>a.mode==='skip');
 assert.equal(paid.players[0].hand.length,before);
 assert.equal(paid.players[0].apCards[0].ready,true);
 assert.equal(bp(paid,paid.players[0].front[0]),2500);
 finish(paid);

 let drawn=toPhase(fresh(['AOT-1-009'],16),'attack');
 const big=put(drawn,0,'AOT-1-009','front',0,true);
 readyAp(drawn,0,1);
 const handBefore=drawn.players[0].hand.length;
 drawn=pick(drawn,a=>a.type==='attack'&&a.uid===big.uid&&!a.targetUid);
 drawn=pick(drawn,a=>a.mode==='pay');
 assert.equal(drawn.players[0].hand.length,handBefore+1);
 assert.equal(drawn.players[0].apCards[0].ready,false);
 assert.equal(bp(drawn,drawn.players[0].front[0]),4000);
 finish(drawn);
});

test('009 color trigger bounces one opposing front character of BP 3500 or less',()=>{
 let s=toPhase(fresh(['AOT-1-009','AOT-1-001','AOT-1-010','AOT-1-003'],17),'attack');
 const attacker=put(s,0,'AOT-1-001','front',0,true);
 const legalTarget=put(s,0,'AOT-1-001','front',1,true);
 const huge=put(s,0,'AOT-1-010','energy',0,true);
 put(s,0,'AOT-1-010','front',2,true);
 setLife(s,1,['AOT-1-009','AOT-1-003','AOT-1-003']);
 s=pick(s,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'color');
 const choices=legalUniversalActions(packs,s).filter(a=>a.mode==='colorBounce').map(a=>a.uid);
 assert.equal(choices.includes(legalTarget.uid),true);
 assert.equal(choices.includes(attacker.uid),true);
 assert.equal(choices.includes(huge.uid),false);
 assert.equal(choices.includes(s.players[0].front.find(c=>c?.cardId==='AOT-1-010').uid),false);
 s=pick(s,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(s.players[0].front.some(c=>c?.uid===legalTarget.uid),true);
 finish(s);

 let bounce=toPhase(fresh(['AOT-1-009','AOT-1-001','AOT-1-003'],18),'attack');
 const striker=put(bounce,0,'AOT-1-001','front',0,true);
 const target=put(bounce,0,'AOT-1-001','front',1,true);
 setLife(bounce,1,['AOT-1-009','AOT-1-003']);
 bounce=pick(bounce,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 bounce=pick(bounce,a=>a.type==='chooseBlock'&&a.uid===null);
 bounce=pick(bounce,a=>a.mode==='colorBounce'&&a.uid===target.uid);
 assert.equal(bounce.players[0].hand.some(c=>c.uid===target.uid),true);
 assert.equal(bounce.players[0].front.find(c=>c?.uid===target.uid),undefined);
 finish(bounce);
});

test('010 readies an AP at attack start only while active on the front',()=>{
 let s=toPhase(fresh(['AOT-1-010','AOT-1-001'],19),'attack');
 put(s,0,'AOT-1-010','energy',0,true);
 readyAp(s,0,1);
 s.players[0].apCards[0].ready=false;
 assert.equal(s.pending,null);
 finish(s);

 let rested=toPhase(fresh(['AOT-1-010'],20),'main');
 put(rested,0,'AOT-1-010','front',0,false);
 readyAp(rested,0,1);
 rested.players[0].apCards[0].ready=false;
 rested=toPhase(rested,'attack');
 assert.equal(rested.pending,null);
 finish(rested);

 let front=toPhase(fresh(['AOT-1-010'],21),'main');
 put(front,0,'AOT-1-010','front',0,true);
 readyAp(front,0,2);
 front.players[0].apCards[0].ready=false;
 front=toPhase(front,'attack');
 assert.equal(front.pending.step,'ready');
 front=pick(front,a=>a.mode==='ready');
 assert.equal(front.players[0].apCards[0].ready,true);
 finish(front);
});

test('010 may pay one AP, then may grant 1000 BP and trigger protection',()=>{
 let s=toPhase(fresh(['AOT-1-010','AOT-1-001'],22),'attack');
 const levi=put(s,0,'AOT-1-010','front',0,true);
 const ally=put(s,0,'AOT-1-001','front',1,true);
 readyAp(s,0,1);
 s=pick(s,a=>a.type==='attack'&&a.uid===levi.uid&&!a.targetUid);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(bp(s,s.players[0].front[1]),2000);
 finish(s);

 let granted=toPhase(fresh(['AOT-1-010','AOT-1-001'],23),'attack');
 const attacker=put(granted,0,'AOT-1-010','front',0,true);
 const friend=put(granted,0,'AOT-1-001','front',1,true);
 readyAp(granted,0,1);
 granted=pick(granted,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 granted=pick(granted,a=>a.mode==='pay');
 assert.equal(granted.pending.step,'grant010');
 assert.equal(legalUniversalActions(packs,granted).some(a=>a.mode==='skip'),true);
 granted=pick(granted,a=>a.mode==='skip');
 assert.equal(bp(granted,granted.players[0].front.find(c=>c.uid===friend.uid)),2000);
 assert.equal(granted.players[0].front.find(c=>c.uid===friend.uid).aotTriggerUnchosen,undefined);
 finish(granted);

 let chosen=toPhase(fresh(['AOT-1-010','AOT-1-001'],24),'attack');
 const source=put(chosen,0,'AOT-1-010','front',0,true);
 const target=put(chosen,0,'AOT-1-001','front',1,true);
 readyAp(chosen,0,1);
 chosen=pick(chosen,a=>a.type==='attack'&&a.uid===source.uid&&!a.targetUid);
 chosen=pick(chosen,a=>a.mode==='pay');
 chosen=pick(chosen,a=>a.mode==='grant'&&a.uid===target.uid);
 const body=chosen.players[0].front.find(c=>c.uid===target.uid);
 assert.equal(bp(chosen,body),3000);
 assert.equal(body.aotTriggerUnchosen.turn,chosen.turn);
 assert.equal(effectChoiceProtected(chosen,1,target.uid,'trigger'),true);
 assert.equal(effectChoiceProtected(chosen,0,target.uid,'trigger'),false);
 assert.equal(effectChoiceProtected(chosen,1,target.uid,'character'),false);
 finish(chosen);
});

test('010 blocks the opponent trigger list and still allows this player trigger',()=>{
 let s=toPhase(fresh(['AOT-1-010','AOT-1-001','AOT-1-009','AOT-1-003'],242),'attack');
 const source=put(s,0,'AOT-1-010','front',0,true);
 const target=put(s,0,'AOT-1-001','front',1,false);
 const bounce=put(s,0,'AOT-1-003','front',2,true);
 put(s,1,'AOT-1-001','front',0,true);
 readyAp(s,0,1);
 setLife(s,1,['AOT-1-009','AOT-1-003']);
 s=pick(s,a=>a.type==='attack'&&a.uid===source.uid&&!a.targetUid);
 s=pick(s,a=>a.mode==='pay');
 s=pick(s,a=>a.mode==='grant'&&a.uid===target.uid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'color');
 assert.equal(s.turn,s.players[0].front.find(c=>c.uid===target.uid).aotTriggerUnchosen.turn);
 const listed=legalUniversalActions(packs,s).filter(a=>a.mode==='colorBounce').map(a=>a.uid);
 assert.equal(listed.includes(target.uid),false);
 assert.equal(listed.includes(bounce.uid),true);
 assert.equal(effectChoiceProtected(s,0,target.uid,'trigger'),false);
 assert.equal(effectChoiceProtected(s,1,target.uid,'trigger'),true);
 s=pick(s,a=>a.mode==='colorBounce'&&a.uid===bounce.uid);
 finish(s);
});

test('011 raid grants the printed bonuses, and a plain play grants none',()=>{
 let plain=toPhase(fresh(['AOT-1-011','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-001','AOT-1-003'],25),'main');
 fuel(plain);
 const played=toHand(plain,0,'AOT-1-011');
 put(plain,1,'AOT-1-001','front',0,true);
 plain=play(plain,played.uid);
 const ordinary=plain.players[0].front.find(c=>c.uid===played.uid);
 assert.equal(ordinary.ready,false);
 assert.equal(bp(plain,ordinary),4000);
 assert.equal(ordinary.aotThirdSniper,undefined);
 setLife(plain,1,['AOT-1-003','AOT-1-003']);
 plain.players[0].front.find(c=>c.uid===played.uid).ready=true;
 plain=toPhase(plain,'attack');
 readyAp(plain,0,1);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='attack'&&a.uid===played.uid&&a.targetUid),false);
 plain=pick(plain,a=>a.type==='attack'&&a.uid===played.uid&&!a.targetUid);
 plain=pick(plain,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].front.find(c=>c.uid===played.uid).ready,false);
 finish(plain);

 let s=toPhase(fresh(['AOT-1-011','AOT-1-007','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-001','AOT-1-003'],26),'main');
 fuel(s);
 const host=put(s,0,'AOT-1-007','front',0,true);
 const wall=put(s,1,'AOT-1-001','front',0,true);
 setLife(s,1,['AOT-1-003','AOT-1-003','AOT-1-003']);
 const raider=toHand(s,0,'AOT-1-011');
 readyAp(s,0,2);
 s=raidOnto(s,raider.uid,host.uid);
 const levi=s.players[0].front.find(c=>c.uid===raider.uid);
 assert.equal(levi.ready,true);
 assert.equal(levi.stack.length,1);
 assert.equal(bp(s,levi),5000);
 assert.equal(levi.aotThirdSniper.done,true);
 s=toPhase(s,'attack');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.uid===raider.uid&&a.targetUid),false);
 s=pick(s,a=>a.type==='attack'&&a.uid===raider.uid&&!a.targetUid);
 assert.equal(s.players[0].front.find(c=>c.uid===raider.uid).ready,true);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.step,'pay');
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.uid===raider.uid&&a.targetUid),false);
 s=pick(s,a=>a.type==='attack'&&a.uid===raider.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.step,'pay');
 assert.equal(s.players[0].front.find(c=>c.uid===raider.uid).aotThirdSniper.done,false);
 s=pick(s,a=>a.mode==='pay');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.players[0].front.find(c=>c.uid===raider.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.targetUid===wall.uid),true);
 s=pick(s,a=>a.type==='attack'&&a.uid===raider.uid&&a.targetUid===wall.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c.uid===raider.uid).aotThirdSniper.done,true);
 assert.equal(s.players[1].front[0],null);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='attack'&&a.uid===raider.uid),false);
 finish(s);

 let open=toPhase(fresh(['AOT-1-011','AOT-1-007','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-001','AOT-1-003'],261),'main');
 fuel(open);
 const base=put(open,0,'AOT-1-007','front',0,true);
 const victim=put(open,1,'AOT-1-001','front',0,true);
 setLife(open,1,['AOT-1-003','AOT-1-003','AOT-1-003']);
 const unpaid=toHand(open,0,'AOT-1-011');
 readyAp(open,0,2);
 open=raidOnto(open,unpaid.uid,base.uid);
 open=toPhase(open,'attack');
 const before=open.players[0].apCards.filter(c=>c.ready).length;
 open=pick(open,a=>a.type==='attack'&&a.uid===unpaid.uid&&!a.targetUid);
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid===null);
 open=pick(open,a=>a.mode==='skip');
 open=pick(open,a=>a.type==='attack'&&a.uid===unpaid.uid&&!a.targetUid);
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid===null);
 open=pick(open,a=>a.mode==='skip');
 const rested=open.players[0].front.find(c=>c.uid===unpaid.uid);
 assert.equal(open.players[0].apCards.filter(c=>c.ready).length,before);
 assert.equal(rested.ready,false);
 assert.equal(rested.aotThirdSniper.done,false);
 assert.equal(open.mainAbilityUsedUids.includes(unpaid.uid+'|AOT-1-011|end'),false);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.type==='attack'&&a.uid===unpaid.uid),false);
 assert.equal(open.players[1].front[0].uid,victim.uid);
 // 【2回アタック】 only readies the first attack. Another effect has to
 // make him active before the third attack, or the once never comes up
 // on a sniper battle. This set has no such effect during the attack phase.
 rested.ready=true;
 assert.equal(legalUniversalActions(packs,open).some(a=>a.type==='attack'&&a.targetUid===victim.uid),true);
 open=pick(open,a=>a.type==='attack'&&a.uid===unpaid.uid&&a.targetUid===victim.uid);
 assert.equal(open.players[1].front[0],null);
 assert.equal(open.pending.step,'pay');
 assert.equal(open.players[0].front.find(c=>c.uid===unpaid.uid).aotThirdSniper.done,true);
 open=pick(open,a=>a.mode==='pay');
 assert.equal(open.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.equal(open.players[0].front.find(c=>c.uid===unpaid.uid).ready,true);
 assert.equal(open.mainAbilityUsedUids.includes(unpaid.uid+'|AOT-1-011|end'),true);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.mode==='pay'),false);
 finish(open);
});

test('013 gains 1000 on the opponent turn only while exact Historia is on this field',()=>{
 let s=toPhase(fresh(['AOT-1-013','AOT-1-019','AOT-1-012'],27),'main');
 const ymir=put(s,0,'AOT-1-013','front',0,true);
 put(s,1,'AOT-1-019','front',0,true);
 assert.equal(bp(s,ymir),3000);
 s=opponentMain(s);
 assert.equal(s.active,1);
 assert.equal(bp(s,s.players[0].front[0]),3000);
 finish(s);

 let boosted=toPhase(fresh(['AOT-1-013','AOT-1-019'],28),'main');
 const body=put(boosted,0,'AOT-1-013','front',0,true);
 put(boosted,0,'AOT-1-019','energy',0,true);
 assert.equal(bp(boosted,body),3000);
 boosted=opponentMain(boosted);
 assert.equal(bp(boosted,boosted.players[0].front[0]),4000);
 finish(boosted);
});

test('014 draws and discards only while raided, then may ready at six events',()=>{
 let plain=toPhase(fresh(['AOT-1-014','AOT-1-001'],29),'attack');
 const ymir=put(plain,0,'AOT-1-014','front',0,true);
 put(plain,1,'AOT-1-001','front',0,true);
 const hand=plain.players[0].hand.length;
 plain=pick(plain,a=>a.type==='attack'&&a.uid===ymir.uid&&!a.targetUid);
 assert.equal(plain.pending.kind,'block');
 assert.equal(plain.players[0].hand.length,hand);
 finish(plain);

 let s=toPhase(fresh(['AOT-1-014','AOT-1-012','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-029','AOT-1-032','AOT-1-001','AOT-1-003'],30),'main');
 fuel(s);
 for(let i=0;i<4;i++)s.players[0].outside.push(take(s,0,'AOT-1-032'));
 s.players[0].outside.push(take(s,0,'AOT-1-029'));
 const discard=toHand(s,0,'AOT-1-029');
 crown(s,0,['AOT-1-001']);
 const host=put(s,0,'AOT-1-012','front',0,true);
 put(s,1,'AOT-1-001','front',0,true);
 setLife(s,1,['AOT-1-003','AOT-1-003','AOT-1-003']);
 const raider=toHand(s,0,'AOT-1-014');
 readyAp(s);
 s=raidOnto(s,raider.uid,host.uid);
 s=toPhase(s,'attack');
 const before=s.players[0].hand.length;
 s=pick(s,a=>a.type==='attack'&&a.uid===raider.uid&&!a.targetUid);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.pending.step,'discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='skip'),false);
 s=pick(s,a=>a.mode==='discard'&&a.uid===discard.uid);
 assert.equal(s.pending.step,'yes');
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].front.find(c=>c.uid===raider.uid).ready,false);
 finish(s);

 let again=toPhase(fresh(['AOT-1-014','AOT-1-012','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-029','AOT-1-032','AOT-1-001','AOT-1-003'],31),'main');
 fuel(again);
 for(let i=0;i<4;i++)again.players[0].outside.push(take(again,0,'AOT-1-032'));
 again.players[0].outside.push(take(again,0,'AOT-1-029'));
 const event=toHand(again,0,'AOT-1-029');
 crown(again,0,['AOT-1-001','AOT-1-001']);
 const base=put(again,0,'AOT-1-012','front',0,true);
 put(again,1,'AOT-1-001','front',0,true);
 setLife(again,1,['AOT-1-003','AOT-1-003','AOT-1-003']);
 const top=toHand(again,0,'AOT-1-014');
 readyAp(again);
 again=raidOnto(again,top.uid,base.uid);
 again=toPhase(again,'attack');
 again=pick(again,a=>a.type==='attack'&&a.uid===top.uid&&!a.targetUid);
 again=pick(again,a=>a.mode==='discard'&&a.uid===event.uid);
 again=pick(again,a=>a.mode==='ready');
 assert.equal(again.players[0].front.find(c=>c.uid===top.uid).ready,true);
 const held=again.players[0].hand.length;
 again=pick(again,a=>a.type==='chooseBlock'&&a.uid===null);
 again=pick(again,a=>a.type==='attack'&&a.uid===top.uid&&!a.targetUid);
 assert.equal(again.pending.kind,'block');
 assert.equal(again.players[0].hand.length,held);
 finish(again);

 let few=toPhase(fresh(['AOT-1-014','AOT-1-012','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-032','AOT-1-001','AOT-1-003'],311),'main');
 fuel(few);
 for(let i=0;i<4;i++)few.players[0].outside.push(take(few,0,'AOT-1-032'));
 const junk=toHand(few,0,'AOT-1-001');
 crown(few,0,['AOT-1-001']);
 const home=put(few,0,'AOT-1-012','front',0,true);
 put(few,1,'AOT-1-001','front',0,true);
 setLife(few,1,['AOT-1-003','AOT-1-003']);
 const jaw=toHand(few,0,'AOT-1-014');
 readyAp(few);
 few=raidOnto(few,jaw.uid,home.uid);
 few=toPhase(few,'attack');
 few=pick(few,a=>a.type==='attack'&&a.uid===jaw.uid&&!a.targetUid);
 few=pick(few,a=>a.mode==='discard'&&a.uid===junk.uid);
 assert.equal(few.pending.kind,'block');
 finish(few);
});

test('015 bounces another energy-1-or-less character, or itself when none exists',()=>{
 let s=toPhase(fresh(['AOT-1-015','AOT-1-001','AOT-1-007','AOT-1-009'],32),'main');
 put(s,0,'AOT-1-006','energy',0,true);
 const low=put(s,0,'AOT-1-001','energy',1,true);
 const other=put(s,0,'AOT-1-007','front',0,true);
 const high=put(s,0,'AOT-1-009','front',1,true);
 const armin=toHand(s,0,'AOT-1-015');
 s=play(s,armin.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(choices.includes(low.uid),true);
 assert.equal(choices.includes(other.uid),true);
 assert.equal(choices.includes(high.uid),false);
 assert.equal(choices.includes(null),false);
 s=pick(s,a=>a.uid===low.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===armin.uid),true);
 finish(s);

 let back=toPhase(fresh(['AOT-1-015','AOT-1-009','AOT-1-006'],33),'main');
 put(back,0,'AOT-1-006','energy',0,true);
 put(back,0,'AOT-1-009','front',0,true);
 const self=toHand(back,0,'AOT-1-015');
 back=play(back,self.uid);
 assert.equal(back.pending,null);
 assert.equal(back.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(back.players[0].front.some(c=>c?.uid===self.uid),false);
 finish(back);
});

test('016 reduces its hand cost by one blue only when the opponent has green or red',()=>{
 let s=toPhase(fresh(['AOT-1-016','AOT-1-040','AOT-1-001'],34),'main');
 const conny=pack.cards['AOT-1-016'];
 assert.equal(zoneRequiredEnergy(packs,s,0,conny,'hand'),3);
 put(s,1,'AOT-1-001','front',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,conny,'hand'),3);
 put(s,0,'AOT-1-040','front',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,conny,'hand'),3);
 put(s,1,'AOT-1-040','energy',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,conny,'hand'),2);
 finish(s);
});

test('017 removes Impact from the character it battles',()=>{
 function battle(seed,blockerId,events,raided){
  let s=toPhase(fresh(['AOT-1-022','AOT-1-019','AOT-1-017','AOT-1-001','AOT-1-029','AOT-1-032','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-003'],seed),'main');
  fuel(s);
  for(let i=0;i<events;i++)s.players[0].outside.push(take(s,0,i<4?'AOT-1-032':'AOT-1-029'));
  const host=put(s,0,'AOT-1-019','front',0,true);
  const blocker=put(s,1,blockerId,'front',0,true);
  setLife(s,1,['AOT-1-003','AOT-1-003','AOT-1-003']);
  if(raided){
   const historia=toHand(s,0,'AOT-1-022');
   readyAp(s);
   s=raidOnto(s,historia.uid,host.uid);
  }else{
   put(s,0,'AOT-1-022','front',1,true);
  }
  s=toPhase(s,'attack');
  const life=s.players[1].life.length;
  const attacker=s.players[0].front.find(c=>c.cardId==='AOT-1-022');
  s=pick(s,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
  if(s.pending?.step==='buffOne')s=pick(s,a=>a.mode==='skip');
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
  return {s,life,dropped:s.players[1].life.length<life};
 }
 const blocked=battle(35,'AOT-1-017',6,true);
 assert.equal(blocked.dropped,false);
 finish(blocked.s);
 const hit=battle(36,'AOT-1-001',6,true);
 assert.equal(hit.dropped,true);
 finish(hit.s);
 const ordinary=battle(37,'AOT-1-001',6,false);
 assert.equal(ordinary.dropped,false);
 finish(ordinary.s);
});

test('018 readies after its first block this turn and stays rested after the second',()=>{
 let s=toPhase(fresh(['AOT-1-018','AOT-1-001'],38),'attack');
 const first=put(s,0,'AOT-1-001','front',0,true);
 const second=put(s,0,'AOT-1-001','front',1,true);
 const jean=put(s,1,'AOT-1-018','front',0,true);
 s=pick(s,a=>a.type==='attack'&&a.uid===first.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===jean.uid);
 assert.equal(s.players[1].front.find(c=>c.uid===jean.uid).ready,true);
 s=pick(s,a=>a.type==='attack'&&a.uid===second.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===jean.uid);
 assert.equal(s.players[1].front.find(c=>c.uid===jean.uid).ready,false);
 finish(s);
});

test('020 returns both cards to the top, or any number when a Ymir name is on the field',()=>{
 let s=toPhase(fresh(['AOT-1-020','AOT-1-001','AOT-1-007','AOT-1-006'],39),'main');
 put(s,0,'AOT-1-006','energy',0,true);
 const window=crown(s,0,['AOT-1-001','AOT-1-007']);
 const historia=toHand(s,0,'AOT-1-020');
 s=play(s,historia.uid);
 assert.equal(s.pending.step,'lookOrder');
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,2);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=pick(s,a=>a.uid===window[1].uid);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[window[1].uid,window[0].uid]);
 assert.equal(s.players[0].hand.some(c=>window.some(w=>w.uid===c.uid)),false);
 finish(s);

 let ymir=toPhase(fresh(['AOT-1-020','AOT-1-012','AOT-1-001','AOT-1-007','AOT-1-006'],40),'main');
 put(ymir,0,'AOT-1-006','energy',0,true);
 put(ymir,0,'AOT-1-012','energy',1,true);
 const seen=crown(ymir,0,['AOT-1-001','AOT-1-007']);
 const actor=toHand(ymir,0,'AOT-1-020');
 ymir=play(ymir,actor.uid);
 assert.equal(ymir.pending.step,'lookKeep');
 assert.deepEqual(universalPrivateChoices(packs,ymir,0).inspected.map(c=>c.uid),seen.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,ymir,1),null);
 ymir=pick(ymir,a=>a.mode==='done');
 assert.equal(ymir.players[0].outside.filter(c=>seen.some(w=>w.uid===c.uid)).length,2);
 assert.equal(ymir.players[0].hand.some(c=>seen.some(w=>w.uid===c.uid)),false);
 finish(ymir);

 let some=toPhase(fresh(['AOT-1-020','AOT-1-014','AOT-1-001','AOT-1-007','AOT-1-006'],41),'main');
 put(some,0,'AOT-1-006','energy',0,true);
 put(some,0,'AOT-1-014','front',0,true);
 const pair=crown(some,0,['AOT-1-001','AOT-1-007']);
 const second=toHand(some,0,'AOT-1-020');
 some=play(some,second.uid);
 assert.equal(some.pending.step,'lookKeep');
 some=pick(some,a=>a.mode==='keep'&&a.uid===pair[1].uid);
 assert.equal(universalPrivateChoices(packs,some,0).inspected.length,2);
 some=pick(some,a=>a.mode==='done');
 assert.equal(some.players[0].deck[0].uid,pair[1].uid);
 assert.equal(some.players[0].outside.some(c=>c.uid===pair[0].uid),true);
 assert.equal(some.players[0].hand.some(c=>c.uid===pair[1].uid),false);
 finish(some);

 let foe=toPhase(fresh(['AOT-1-020','AOT-1-012','AOT-1-001','AOT-1-007','AOT-1-006'],412),'main');
 put(foe,0,'AOT-1-006','energy',0,true);
 put(foe,1,'AOT-1-012','front',0,true);
 crown(foe,0,['AOT-1-001','AOT-1-007']);
 const mine=toHand(foe,0,'AOT-1-020');
 foe=play(foe,mine.uid);
 assert.equal(foe.pending.step,'lookOrder');
 assert.equal(universalPrivateChoices(packs,foe,1),null);
 finish(foe);
});

test('021 gains 500 from a Ymir name, and the on-play ready is once per Historia',()=>{
 let s=toPhase(fresh(['AOT-1-021','AOT-1-012','AOT-1-029','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-001'],42),'main');
 fuel(s);
 readyAp(s,0,3);
 const early=toHand(s,0,'AOT-1-021');
 s=play(s,early.uid);
 assert.equal(s.pending,null);
 const first=s.players[0].front.find(c=>c.uid===early.uid);
 assert.equal(bp(s,first),2500);
 put(s,1,'AOT-1-012','front',0,true);
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===early.uid)),2500);
 put(s,0,'AOT-1-012','front',1,true);
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===early.uid)),3000);
 const fodder=toHand(s,0,'AOT-1-001');
 const event=toHand(s,0,'AOT-1-029');
 s=pick(s,a=>a.type==='event'&&a.uid===event.uid);
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid===fodder.uid);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 const later=toHand(s,0,'AOT-1-021');
 s=play(s,later.uid);
 assert.equal(s.pending.step,'ready');
 const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready).map(c=>c.uid);
 s=pick(s,a=>a.mode==='skip');
 assert.deepEqual(s.players[0].apCards.filter(c=>c.inPlay&&!c.ready).map(c=>c.uid),rested);
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===later.uid)),3000);
 finish(s);
});

test('022 gains each outside-event line only while raided',()=>{
 let s=toPhase(fresh(['AOT-1-022','AOT-1-019','AOT-1-023','AOT-1-001','AOT-1-029','AOT-1-032','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],43),'main');
 fuel(s);
 for(let i=0;i<2;i++)s.players[0].outside.push(take(s,0,'AOT-1-032'));
 const host=put(s,0,'AOT-1-019','front',0,true);
 const corps=put(s,0,'AOT-1-023','front',1,true);
 const other=put(s,0,'AOT-1-001','front',2,true);
 put(s,1,'AOT-1-001','front',0,true);
 const historia=toHand(s,0,'AOT-1-022');
 readyAp(s);
 s=raidOnto(s,historia.uid,host.uid);
 s=toPhase(s,'attack');
 s=pick(s,a=>a.type==='attack'&&a.uid===historia.uid&&!a.targetUid);
 assert.equal(s.pending.step,'buffOne');
 const targets=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(targets.includes(corps.uid),true);
 assert.equal(targets.includes(other.uid),false);
 assert.equal(targets.includes(historia.uid),false);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(bp(s,s.players[0].front.find(c=>c.uid===corps.uid)),1500);
 finish(s);

 let paid=toPhase(fresh(['AOT-1-022','AOT-1-019','AOT-1-023','AOT-1-001','AOT-1-032','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],44),'main');
 fuel(paid);
 for(let i=0;i<2;i++)paid.players[0].outside.push(take(paid,0,'AOT-1-032'));
 const base=put(paid,0,'AOT-1-019','front',0,true);
 const ally=put(paid,0,'AOT-1-023','front',1,true);
 put(paid,1,'AOT-1-001','front',0,true);
 const top=toHand(paid,0,'AOT-1-022');
 readyAp(paid);
 paid=raidOnto(paid,top.uid,base.uid);
 paid=toPhase(paid,'attack');
 paid=pick(paid,a=>a.type==='attack'&&a.uid===top.uid&&!a.targetUid);
 paid=pick(paid,a=>a.mode==='buff'&&a.uid===ally.uid);
 assert.equal(bp(paid,paid.players[0].front.find(c=>c.uid===ally.uid)),2500);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.type==='activate'),false);
 finish(paid);

 let main=toPhase(fresh(['AOT-1-022','AOT-1-019','AOT-1-029','AOT-1-032','AOT-1-001','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],45),'main');
 fuel(main);
 for(let i=0;i<3;i++)main.players[0].outside.push(take(main,0,'AOT-1-032'));
 const home=put(main,0,'AOT-1-019','front',0,true);
 readyAp(main,0,3);
 main.players[0].apCards[0].ready=false;
 const event=toHand(main,0,'AOT-1-029');
 const fodder=toHand(main,0,'AOT-1-001');
 main=pick(main,a=>a.type==='event'&&a.uid===event.uid);
 main=pick(main,a=>a.type==='chooseDiscard'&&a.uid===fodder.uid);
 main=pick(main,a=>a.type==='chooseApRecovery'&&a.uid===null);
 const body=toHand(main,0,'AOT-1-022');
 main=raidOnto(main,body.uid,home.uid);
 assert.equal(legalUniversalActions(packs,main).some(a=>a.type==='activate'&&a.uid===body.uid),true);
 main=pick(main,a=>a.type==='activate'&&a.uid===body.uid);
 assert.equal(main.pending.step,'ready');
 main=pick(main,a=>a.mode==='skip');
 assert.equal(legalUniversalActions(packs,main).some(a=>a.type==='activate'&&a.uid===body.uid),false);
 finish(main);

 let energy=toPhase(fresh(['AOT-1-022','AOT-1-019','AOT-1-029','AOT-1-032','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016','AOT-1-001'],46),'main');
 fuel(energy);
 for(let i=0;i<3;i++)energy.players[0].outside.push(take(energy,0,'AOT-1-032'));
 const displaced=energy.players[0].energy[0];
 energy.players[0].energy[0]=null;
 energy.players[0].deck.push(displaced);
 const bench=put(energy,0,'AOT-1-019','energy',0,false);
 const spent=toHand(energy,0,'AOT-1-029');
 const extra=toHand(energy,0,'AOT-1-001');
 readyAp(energy);
 energy=pick(energy,a=>a.type==='event'&&a.uid===spent.uid);
 energy=pick(energy,a=>a.type==='chooseDiscard'&&a.uid===extra.uid);
 energy=pick(energy,a=>a.type==='chooseApRecovery'&&a.uid===null);
 const parked=toHand(energy,0,'AOT-1-022');
 energy=raidOnto(energy,parked.uid,bench.uid,'energy');
 assert.equal(energy.players[0].energy.some(c=>c?.uid===parked.uid),true);
 assert.equal(legalUniversalActions(packs,energy).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 finish(energy);

 let plain=toPhase(fresh(['AOT-1-022','AOT-1-023','AOT-1-032','AOT-1-001','AOT-1-029','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],431),'main');
 fuel(plain);
 for(let i=0;i<4;i++)plain.players[0].outside.push(take(plain,0,'AOT-1-032'));
 const quiet=put(plain,0,'AOT-1-022','front',0,true);
 put(plain,0,'AOT-1-023','front',1,true);
 put(plain,1,'AOT-1-001','front',0,true);
 readyAp(plain,0,2);
 const cast=toHand(plain,0,'AOT-1-029');
 const dumped=toHand(plain,0,'AOT-1-001');
 plain=pick(plain,a=>a.type==='event'&&a.uid===cast.uid);
 plain=pick(plain,a=>a.type==='chooseDiscard'&&a.uid===dumped.uid);
 plain=pick(plain,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 plain=toPhase(plain,'attack');
 plain=pick(plain,a=>a.type==='attack'&&a.uid===quiet.uid&&!a.targetUid);
 assert.equal(plain.pending.kind,'block');
 finish(plain);
});

test('023 draws one and must put one hand card outside',()=>{
 let s=toPhase(fresh(['AOT-1-023','AOT-1-001'],47),'main');
 const fodder=toHand(s,0,'AOT-1-001');
 const mikasa=toHand(s,0,'AOT-1-023');
 const before=s.players[0].deck.length;
 s=play(s,mikasa.uid);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.uid===fodder.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===fodder.uid),true);
 finish(s);
});

test('024 adds blue energy at two outside events and 1000 BP at four',()=>{
 let s=toPhase(fresh(['AOT-1-024','AOT-1-032'],48),'main');
 const mikasa=put(s,0,'AOT-1-024','energy',0,true);
 const front=put(s,0,'AOT-1-024','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,mikasa),1);
 assert.equal(bp(s,front),3000);
 s.players[0].outside.push(take(s,0,'AOT-1-032'));
 assert.equal(universalCardEnergy(packs,s,0,mikasa),1);
 assert.equal(bp(s,front),3000);
 s.players[0].outside.push(take(s,0,'AOT-1-032'));
 assert.equal(universalCardEnergy(packs,s,0,mikasa),2);
 assert.equal(bp(s,front),3000);
 s.players[0].outside.push(take(s,0,'AOT-1-032'),take(s,0,'AOT-1-032'));
 assert.equal(universalCardEnergy(packs,s,0,mikasa),2);
 assert.equal(bp(s,front),4000);
 finish(s);
});

test('025 may bounce one opposing front character of BP 4000 or less',()=>{
 let s=toPhase(fresh(['AOT-1-025','AOT-1-001','AOT-1-010','AOT-1-061','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],49),'main');
 fuel(s);
 const small=put(s,1,'AOT-1-001','front',0,true);
 const exact=put(s,1,'AOT-1-010','front',1,true);
 const over=put(s,1,'AOT-1-061','front',2,true);
 const bench=put(s,1,'AOT-1-001','energy',0,true);
 readyAp(s,0,2);
 const mikasa=toHand(s,0,'AOT-1-025');
 s=play(s,mikasa.uid);
 assert.equal(s.pending.kind,'effect-bounce-bp');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(choices.includes(small.uid),true);
 assert.equal(choices.includes(exact.uid),true);
 assert.equal(choices.includes(over.uid),false);
 assert.equal(choices.includes(bench.uid),false);
 assert.equal(choices.includes(null),true);
 s=pick(s,a=>a.type==='chooseBounceBp'&&a.uid===null);
 assert.equal(s.players[1].front.filter(Boolean).length,3);
 finish(s);

 let bounced=toPhase(fresh(['AOT-1-025','AOT-1-010','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],50),'main');
 fuel(bounced);
 readyAp(bounced,0,2);
 const target=put(bounced,1,'AOT-1-010','front',0,true);
 const actor=toHand(bounced,0,'AOT-1-025');
 bounced=play(bounced,actor.uid);
 bounced=pick(bounced,a=>a.uid===target.uid);
 assert.equal(bounced.players[1].hand.some(c=>c.uid===target.uid),true);
 finish(bounced);
});

test('025 stops the opponent using an active trigger on damage this card dealt',()=>{
 let s=toPhase(fresh(['AOT-1-025','AOT-1-001','AOT-1-003','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],51),'main');
 fuel(s);
 const mikasa=toHand(s,0,'AOT-1-025');
 put(s,1,'AOT-1-003','front',0,false);
 setLife(s,1,['AOT-1-001','AOT-1-003']);
 readyAp(s);
 s=play(s,mikasa.uid);
 s=pick(s,a=>a.type==='chooseBounceBp'&&a.uid===null);
 s.players[0].front.find(c=>c.uid===mikasa.uid).ready=true;
 s=toPhase(s,'attack');
 s=pick(s,a=>a.type==='attack'&&a.uid===mikasa.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.trigger,'active');
 assert.equal(s.pending.suppressActive,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='active'),false);
 s=pick(s,a=>a.mode==='skip');
 finish(s);

 let open=toPhase(fresh(['AOT-1-001','AOT-1-003'],52),'attack');
 const attacker=put(open,0,'AOT-1-001','front',0,true);
 const rested=put(open,1,'AOT-1-003','front',0,false);
 setLife(open,1,['AOT-1-001','AOT-1-003']);
 open=pick(open,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.mode==='active'&&a.uid===rested.uid),true);
 open=pick(open,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(open.players[1].front[0].ready,true);
 assert.equal(bp(open,open.players[1].front[0]),6000);
 finish(open);
});

test('life triggers for get, draw, raid and a card with no trigger',()=>{
 let got=toPhase(fresh(['AOT-1-007','AOT-1-001','AOT-1-003'],53),'attack');
 const attacker=put(got,0,'AOT-1-001','front',0,true);
 setLife(got,1,['AOT-1-007','AOT-1-003']);
 got=pick(got,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 got=pick(got,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(got.pending.trigger,'get');
 const life=got.players[1].outside[0];
 got=pick(got,a=>a.mode==='skip');
 assert.equal(got.players[1].outside.some(c=>c.uid===life.uid),true);
 finish(got);

 let drawn=toPhase(fresh(['AOT-1-023','AOT-1-001','AOT-1-003'],54),'attack');
 const striker=put(drawn,0,'AOT-1-001','front',0,true);
 setLife(drawn,1,['AOT-1-023','AOT-1-003']);
 const deck=()=>drawn.players[1].deck.length;
 drawn=pick(drawn,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 drawn=pick(drawn,a=>a.type==='chooseBlock'&&a.uid===null);
 const before=drawn.players[1].deck.length;
 assert.equal(drawn.pending.trigger,'draw');
 drawn=pick(drawn,a=>a.mode==='draw');
 assert.equal(drawn.players[1].deck.length,before-1);
 finish(drawn);

 let none=toPhase(fresh(['AOT-1-003','AOT-1-001'],55),'attack');
 const plain=put(none,0,'AOT-1-001','front',0,true);
 const lives=setLife(none,1,['AOT-1-003','AOT-1-003']);
 none=pick(none,a=>a.type==='attack'&&a.uid===plain.uid&&!a.targetUid);
 none=pick(none,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(none.pending,null);
 assert.equal(none.players[1].outside.some(c=>c.uid===lives[0].uid),true);
 finish(none);

 let raid=toPhase(fresh(['AOT-1-011','AOT-1-007','AOT-1-001','AOT-1-003','AOT-1-002','AOT-1-006','AOT-1-015','AOT-1-016'],56),'attack');
 fuel(raid,1);
 const host=put(raid,1,'AOT-1-007','front',0,true);
 const hitter=put(raid,0,'AOT-1-001','front',0,true);
 setLife(raid,1,['AOT-1-011','AOT-1-003']);
 raid=pick(raid,a=>a.type==='attack'&&a.uid===hitter.uid&&!a.targetUid);
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='get'),true);
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='raid'&&a.baseUid===host.uid),true);
 raid=pick(raid,a=>a.mode==='get');
 assert.equal(raid.players[1].hand.some(c=>c.cardId==='AOT-1-011'),true);
 finish(raid);

 let poor=toPhase(fresh(['AOT-1-011','AOT-1-001','AOT-1-003'],57),'attack');
 const attacker2=put(poor,0,'AOT-1-001','front',0,true);
 setLife(poor,1,['AOT-1-011','AOT-1-003']);
 poor=pick(poor,a=>a.type==='attack'&&a.uid===attacker2.uid&&!a.targetUid);
 poor=pick(poor,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(legalUniversalActions(packs,poor).some(a=>a.mode==='raid'),false);
 assert.equal(legalUniversalActions(packs,poor).some(a=>a.mode==='get'),true);
 finish(poor);
});
