import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalBp, universalEnergyByColor,
 universalImpact, universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];
const LIFE={
 'MMM-1-001':'get','MMM-1-002':'raid','MMM-1-003':null,'MMM-1-004':'active',
 'MMM-1-005':'draw','MMM-1-006':'get','MMM-1-007':'active','MMM-1-008':'color',
 'MMM-1-009':'active','MMM-1-010':null,'MMM-1-011':'active','MMM-1-012':'active',
 'MMM-1-013':'draw','MMM-1-014':'get','MMM-1-015':'draw','MMM-1-016':'draw',
 'MMM-1-017':'active','MMM-1-018':null,'MMM-1-019':'raid','MMM-1-020':'color',
 'MMM-1-021':null,'MMM-1-022':null,'MMM-1-023':null,'MMM-1-024':'active',
 'MMM-1-025':null
};

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
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
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
function stackTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of [...cards].reverse())s.players[p].deck.unshift(card);
 return cards;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function acts(s){return legalUniversalActions(packs,s);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function toSide(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+player+' '+phase);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,kind='play'){
 const action=acts(s).find(a=>a.type===kind&&a.uid===uid&&!a.from&&
  (kind!=='play'||(a.line==='front'&&a.replaceUid===undefined)));
 if(!action)throw Error('No '+kind+' for '+uid);
 return use(s,action);
}
function pick(s,pred){
 const actions=acts(s);
 const action=actions.find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+JSON.stringify(actions.slice(0,6)));
 return use(s,action);
}
function field(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function listedUids(value,found=new Set()){
 if(!value||typeof value!=='object')return found;
 if(typeof value.uid==='string')found.add(value.uid);
 for(const child of Object.values(value))listedUids(child,found);
 return found;
}
function assertHidden(s,uids){
 const found=listedUids(universalPublicView(packs,s,1));
 for(const uid of uids)assert.equal(found.has(uid),false,uid);
}
function assertSeen(s,uids){
 const shown=universalPublicView(packs,s,1).publicReveals.map(entry=>entry.uid);
 for(const uid of uids)assert.equal(shown.includes(uid),true,uid);
}
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.kind==='effect-top-order'||s.pending.step==='lookOrder')){
  s=pick(s,a=>true);
  if(++guard>8)throw Error('order stuck');
 }
 return s;
}
function quietLife(s,p,n=3){
 const pl=s.players[p];
 while(pl.life.length)pl.deck.push(pl.life.pop());
 const blanks=pl.deck.filter(c=>!pack.cards[c.cardId].trigger).slice(0,n);
 assert.equal(blanks.length,n);
 for(const card of blanks){
  const index=pl.deck.findIndex(c=>c.uid===card.uid);
  pl.life.unshift(pl.deck.splice(index,1)[0]);
 }
}
function yellow(s,n=2){
 const gens=['MMM-1-025','MMM-1-025','MMM-1-011','MMM-1-010'];
 for(let i=0;i<n;i++)put(s,0,gens[i],'energy',i,true);
}

test('001-025 print the life symbols on the card',()=>{
 for(const [id,trigger] of Object.entries(LIFE))
  assert.equal(pack.cards[id].trigger,trigger,id);
 const negative=Object.keys(LIFE).filter(id=>(pack.cards[id].effectJa||'').includes('BP-'));
 assert.deepEqual(negative,[]);
});

test('Ultimate Madoka retires into removed girls of different names',()=>{
 const counts=countsFor(['MMM-1-001','MMM-1-025','MMM-1-011','MMM-1-006','MMM-1-005',
  'MMM-1-003','MMM-1-009','MMM-1-008','MMM-1-014','MMM-1-004']);
 let s=toPhase(fresh(counts,91001),'main');
 yellow(s,3);
 const madoka=take(s,0,'MMM-1-006');
 const costly=take(s,0,'MMM-1-005');
 const plain=take(s,0,'MMM-1-003');
 const traitless=take(s,0,'MMM-1-004');
 const first=take(s,0,'MMM-1-009');
 const second=take(s,0,'MMM-1-009');
 const eligible=take(s,0,'MMM-1-014');
 s.players[0].removed.push(madoka,costly,plain,traitless,first,second,eligible);
 const ultimate=toHand(s,0,'MMM-1-001');
 readyAp(s,0,2);
 s=play(s,ultimate.uid);
 assert.equal(field(s,0,ultimate.uid).ready,true);
 assert.equal(s.pending,null);
 s=use(s,{type:'next'});
 s=use(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-removed-rest-pair');
 assert.equal(s.players[0].removed.some(c=>c.uid===ultimate.uid),true);
 const offered=s.pending.choices;
 assert.equal(offered.includes(madoka.uid),false);
 assert.equal(offered.includes(costly.uid),false);
 assert.equal(offered.includes(plain.uid),false);
 assert.equal(offered.includes(traitless.uid),false);
 assert.equal(offered.includes(ultimate.uid),false);
 assert.equal(offered.includes(first.uid),true);
 assert.equal(offered.includes(second.uid),true);
 assert.equal(offered.includes(eligible.uid),true);
 s=pick(s,a=>a.mode==='pick'&&a.uid===first.uid);
 assert.equal(acts(s).some(a=>a.uid===second.uid),false);
 assert.equal(acts(s).some(a=>a.uid===eligible.uid),true);
 s=pick(s,a=>a.mode==='done');
 s=pick(s,a=>a.mode==='place'&&a.uid===first.uid&&a.line==='front');
 assert.equal(field(s,0,first.uid)!==null,true);
 assert.equal(s.players[0].removed.some(c=>c.uid===second.uid),true);
 assertUniversalMatch(packs,s);
});

test('a plain Ultimate Madoka does not open the raid frame',()=>{
 const counts=countsFor(['MMM-1-002','MMM-1-025','MMM-1-011','MMM-1-010','MMM-1-009','MMM-1-006']);
 let plain=toPhase(fresh(counts,91002),'main');
 yellow(plain,4);
 const girl=take(plain,0,'MMM-1-009');
 plain.players[0].removed.push(girl);
 const body=toHand(plain,0,'MMM-1-002');
 readyAp(plain,0,1);
 plain=play(plain,body.uid);
 assert.equal(plain.pending,null);
 assert.equal(field(plain,0,body.uid).ready,false);
 assert.equal(plain.players[0].nextRemovedApCut,null);
 assert.equal(acts(plain).some(a=>a.from==='removed'&&a.uid===girl.uid),false);
 assertUniversalMatch(packs,plain);
});

test('raided Ultimate Madoka filters removed uses and retires into the removed area',()=>{
 const counts=countsFor(['MMM-1-002','MMM-1-025','MMM-1-011','MMM-1-010','MMM-1-006',
  'MMM-1-009','MMM-1-003','MMM-1-019','MMM-1-028','MMM-1-001']);
 let s=toPhase(fresh(counts,91003),'main');
 yellow(s,4);
 const host=put(s,0,'MMM-1-006','front',0,true);
 const madoka=take(s,0,'MMM-1-006');
 const kyubey=take(s,0,'MMM-1-003');
 const raiderGirl=take(s,0,'MMM-1-019');
 const law=take(s,0,'MMM-1-028');
 const girl=take(s,0,'MMM-1-009');
 s.players[0].removed.push(madoka,kyubey,raiderGirl,law,girl);
 const raid=toHand(s,0,'MMM-1-002');
 readyAp(s,0,2);
 s=use(s,acts(s).find(a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===host.uid));
 assert.equal(s.pending,null);
 assert.equal(field(s,0,raid.uid).ready,true);
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 put(s,1,'MMM-1-006','front',0,true);
 assert.equal(acts(s).some(a=>a.from==='removed'&&a.uid===madoka.uid),false);
 assert.equal(acts(s).some(a=>a.from==='removed'&&a.uid===kyubey.uid),false);
 assert.equal(acts(s).some(a=>a.from==='removed'&&a.uid===raiderGirl.uid),false);
 assert.equal(acts(s).some(a=>a.type==='event'&&a.from==='removed'&&a.uid===law.uid),true);
 assert.equal(acts(s).some(a=>a.type==='play'&&a.from==='removed'&&a.uid===girl.uid),true);
 const hammer=put(s,1,'MMM-1-001','front',1,true);
 quietLife(s,0,3);
 quietLife(s,1,3);
 s=toSide(s,1,'attack');
 s=use(s,{type:'attack',uid:hammer.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===raid.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===raid.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===raid.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===host.uid),true);
 assertUniversalMatch(packs,s);
});

test('Kyubey publishes one yellow event and discards only after taking it',()=>{
 const counts=countsFor(['MMM-1-003','MMM-1-025','MMM-1-030','MMM-1-006','MMM-1-009']);
 let skipped=toPhase(fresh(counts,91004),'main');
 put(skipped,0,'MMM-1-025','energy',0,true);
 put(skipped,0,'MMM-1-025','energy',1,true);
 const held=toHand(skipped,0,'MMM-1-009');
 stackTop(skipped,0,['MMM-1-030','MMM-1-006','MMM-1-009','MMM-1-006']);
 const window=skipped.players[0].deck.slice(0,4);
 readyAp(skipped,0,1);
 skipped=play(skipped,toHand(skipped,0,'MMM-1-003').uid);
 assert.equal(skipped.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(packs,skipped,1),null);
 assertHidden(skipped,window.map(c=>c.uid));
 skipped=pick(skipped,a=>a.uid==null);
 skipped=orderRest(skipped);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===held.uid),true);
 assertHidden(skipped,window.map(c=>c.uid));

 let taken=toPhase(fresh(counts,91005),'main');
 put(taken,0,'MMM-1-025','energy',0,true);
 put(taken,0,'MMM-1-025','energy',1,true);
 const seen=stackTop(taken,0,['MMM-1-030','MMM-1-006','MMM-1-009','MMM-1-006']);
 const spare=toHand(taken,0,'MMM-1-025');
 readyAp(taken,0,1);
 taken=play(taken,toHand(taken,0,'MMM-1-003').uid);
 taken=pick(taken,a=>a.uid===seen[0].uid);
 assertSeen(taken,[seen[0].uid]);
 assertHidden(taken,seen.slice(1).map(c=>c.uid));
 taken=orderRest(taken);
 assert.equal(taken.pending.kind,'effect-discard');
 assert.equal(acts(taken).some(a=>a.uid==null),false);
 taken=pick(taken,a=>a.uid===spare.uid);
 assert.equal(taken.players[0].hand.some(c=>c.uid===seen[0].uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===spare.uid),true);
 assertUniversalMatch(packs,taken);
});

test('Kazuko may buff another character for this turn and not herself',()=>{
 const counts=countsFor(['MMM-1-004','MMM-1-025','MMM-1-006']);
 let s=toPhase(fresh(counts,91006),'main');
 put(s,0,'MMM-1-025','energy',0,true);
 const other=put(s,0,'MMM-1-006','front',1,true);
 const kazuko=toHand(s,0,'MMM-1-004');
 readyAp(s,0,1);
 s=play(s,kazuko.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.equal(acts(s).some(a=>a.uid===kazuko.uid),false);
 assert.equal(acts(s).some(a=>a.uid===other.uid),true);
 s=pick(s,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,s,field(s,0,other.uid)),2500);
 s=toSide(s,1,'main');
 assert.equal(universalBp(packs,s,field(s,0,other.uid)),1500);
 assertUniversalMatch(packs,s);
});

test('Homura spends a real Ultimate Madoka for BP and impact',()=>{
 const counts=countsFor(['MMM-1-005','MMM-1-001','MMM-1-006']);
 let paid=toPhase(fresh(counts,91007),'attack');
 quietLife(paid,1,3);
 const homura=put(paid,0,'MMM-1-005','front',0,true);
 const removed=take(paid,0,'MMM-1-001');
 paid.players[0].removed.push(removed);
 const life=paid.players[1].life.length;
 paid=use(paid,{type:'attack',uid:homura.uid});
 assert.equal(paid.pending.kind,'effect-removed-self-grant');
 assert.equal(paid.pending.optional,true);
 paid=pick(paid,a=>a.uid===removed.uid);
 assert.equal(paid.players[0].outside.some(c=>c.uid===removed.uid),true);
 assert.equal(universalBp(packs,paid,field(paid,0,homura.uid)),5000);
 assert.equal(universalImpact(packs,paid,field(paid,0,homura.uid)),1);
 paid=pick(paid,a=>a.type==='chooseBlock'&&a.uid==null);
 if(paid.pending?.kind==='life-trigger')paid=pick(paid,a=>a.mode==='skip');
 assert.equal(paid.players[1].life.length,life-1);

 let empty=toPhase(fresh(counts,91008),'attack');
 const bare=put(empty,0,'MMM-1-005','front',0,true);
 const other=take(empty,0,'MMM-1-006');
 empty.players[0].removed.push(other);
 empty=use(empty,{type:'attack',uid:bare.uid});
 assert.equal(empty.pending.kind,'block');
 assert.equal(universalBp(packs,empty,field(empty,0,bare.uid)),4000);
 assertUniversalMatch(packs,empty);
});

test('Madoka adds an Ultimate or a magical girl, then discards',()=>{
 const counts=countsFor(['MMM-1-007','MMM-1-025','MMM-1-001','MMM-1-006','MMM-1-030','MMM-1-009']);
 let s=toPhase(fresh(counts,91009),'main');
 put(s,0,'MMM-1-025','energy',0,true);
 const seen=stackTop(s,0,['MMM-1-001','MMM-1-030','MMM-1-006']);
 const spare=toHand(s,0,'MMM-1-009');
 readyAp(s,0,1);
 s=play(s,toHand(s,0,'MMM-1-007').uid);
 assert.equal(s.pending.choices.includes(seen[0].uid),true);
 assert.equal(s.pending.choices.includes(seen[2].uid),true);
 assert.equal(s.pending.choices.includes(seen[1].uid),false);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertHidden(s,seen.map(c=>c.uid));
 s=pick(s,a=>a.uid===seen[0].uid);
 assertSeen(s,[seen[0].uid]);
 s=orderRest(s);
 s=pick(s,a=>a.uid===spare.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===seen[0].uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assertUniversalMatch(packs,s);
});

test('Madoka looks privately, and the color trigger rests without activating next',()=>{
 const counts=countsFor(['MMM-1-008','MMM-1-025','MMM-1-009','MMM-1-030','MMM-1-006']);
 let look=toPhase(fresh(counts,91010),'main');
 put(look,0,'MMM-1-025','energy',0,true);
 put(look,0,'MMM-1-025','energy',1,true);
 const seen=stackTop(look,0,['MMM-1-030','MMM-1-009','MMM-1-006','MMM-1-030']);
 readyAp(look,0,1);
 look=play(look,toHand(look,0,'MMM-1-008').uid);
 assert.equal(look.pending.kind,'effect-top-character-outside');
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assertHidden(look,seen.map(c=>c.uid));
 assert.equal(look.pending.choices.includes(seen[0].uid),false);
 assert.equal(look.pending.choices.includes(seen[1].uid),true);
 look=pick(look,a=>a.uid==null);
 look=orderRest(look);
 assert.deepEqual(look.players[0].deck.slice(0,4).map(c=>c.uid).sort(),seen.map(c=>c.uid).sort());
 assert.equal(look.players[0].outside.some(c=>seen.some(x=>x.uid===c.uid)),false);

 let color=toPhase(fresh(counts,91011),'attack');
 const swinger=put(color,0,'MMM-1-006','front',0,true);
 const rested=put(color,1,'MMM-1-009','front',0,true);
 quietLife(color,1,1);
 const flipped=take(color,1,'MMM-1-008');
 color.players[1].life.unshift(flipped);
 color=use(color,{type:'attack',uid:swinger.uid});
 color=pick(color,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(color.pending.trigger,'color');
 color=pick(color,a=>a.mode==='colorRestSkip'&&a.uid===swinger.uid);
 assert.equal(field(color,0,swinger.uid).ready,false);
 assert.equal(color.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===swinger.uid),true);
 assert.equal(field(color,1,rested.uid).ready,true);
 assertUniversalMatch(packs,color);
});

test('Kyoko discounts one yellow only while the opponent has purple or red',()=>{
 const counts=countsFor(['MMM-1-010','MMM-1-035','MMM-1-006']);
 let bare=toPhase(fresh(counts,91012),'main');
 assert.equal(effectiveHandRequiredEnergy(pack,bare,0,pack.cards['MMM-1-010']),3);
 const purple=put(bare,1,'MMM-1-035','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,bare,0,pack.cards['MMM-1-010']),2);
 bare.players[1].energy[0]=null;
 bare.players[1].outside.push(purple);
 const redless=put(bare,1,'MMM-1-006','front',0,true);
 assert.equal(pack.cards[redless.cardId].color,'yellow');
 assert.equal(effectiveHandRequiredEnergy(pack,bare,0,pack.cards['MMM-1-010']),3);
});

test('Kyoko steps only during the move phase',()=>{
 const counts=countsFor(['MMM-1-011','MMM-1-025']);
 let main=toPhase(fresh(counts,91013),'main');
 const waiting=put(main,0,'MMM-1-011','front',0,true);
 assert.equal(acts(main).some(a=>a.type==='step'&&a.uid===waiting.uid),false);
 let move=toPhase(fresh(counts,91014),'move');
 const stepper=put(move,0,'MMM-1-011','front',0,true);
 move=use(move,{type:'step',uid:stepper.uid,slot:0});
 assert.equal(move.players[0].energy[0].uid,stepper.uid);
 assert.equal(move.players[0].front[0],null);
 assertUniversalMatch(packs,move);
});

test('the other Kyoko steps with the same keyword',()=>{
 const counts=countsFor(['MMM-1-013','MMM-1-025']);
 let main=toPhase(fresh(counts,91034),'main');
 const waiting=put(main,0,'MMM-1-013','front',0,true);
 assert.equal(acts(main).some(a=>a.type==='step'&&a.uid===waiting.uid),false);
 let move=toPhase(fresh(counts,91035),'move');
 const stepper=put(move,0,'MMM-1-013','front',0,true);
 move=use(move,{type:'step',uid:stepper.uid,slot:0});
 assert.equal(move.players[0].energy[0].uid,stepper.uid);
 assert.equal(move.players[0].front[0],null);
 assertUniversalMatch(packs,move);
});

test('Madoka can put the peeked card back on top',()=>{
 const counts=countsFor(['MMM-1-008','MMM-1-025','MMM-1-006']);
 let s=toPhase(fresh(counts,91036),'main');
 put(s,0,'MMM-1-025','energy',0,true);
 put(s,0,'MMM-1-025','energy',1,true);
 const top=stackTop(s,0,['MMM-1-006'])[0];
 const body=toHand(s,0,'MMM-1-008');
 readyAp(s,0,1);
 s=play(s,body.uid);
 s=pick(s,a=>a.uid==null);
 s=orderRest(s);
 field(s,0,body.uid).ready=true;
 s=use(s,{type:'activate',uid:body.uid,mode:'restPeek'});
 assert.equal(field(s,0,body.uid).ready,false);
 assert.equal(s.pending.kind,'effect-peek-top-place');
 assertHidden(s,[top.uid]);
 s=pick(s,a=>a.type==='choosePeekTop'&&a.mode==='top');
 assert.equal(s.players[0].deck[0].uid,top.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===top.uid),false);
 assertHidden(s,[top.uid]);
 assertUniversalMatch(packs,s);
});

test('Kyoko blocks twice, and the second block can retire her',()=>{
 const counts=countsFor(['MMM-1-012','MMM-1-010','MMM-1-001']);
 let s=toPhase(fresh(counts,91015),'main');
 const blocker=put(s,0,'MMM-1-012','front',0,true);
 const small=put(s,1,'MMM-1-010','front',0,true);
 const huge=put(s,1,'MMM-1-001','front',1,true);
 quietLife(s,0,3);
 s=toSide(s,1,'attack');
 s=use(s,{type:'attack',uid:small.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(field(s,0,blocker.uid).ready,true);
 assert.equal(field(s,1,small.uid).ready,false);
 s=use(s,{type:'attack',uid:huge.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(field(s,1,huge.uid)!==null,true);
 assertUniversalMatch(packs,s);
});

test('Mami draws and must discard, and a peek stays off the public view',()=>{
 const counts=countsFor(['MMM-1-015','MMM-1-016','MMM-1-025','MMM-1-006']);
 let drawn=toPhase(fresh(counts,91016),'main');
 put(drawn,0,'MMM-1-025','energy',0,true);
 const before=drawn.players[0].deck.length;
 drawn=play(drawn,toHand(drawn,0,'MMM-1-015').uid);
 assert.equal(drawn.players[0].deck.length,before-1);
 assert.equal(drawn.pending.kind,'effect-discard');
 assert.equal(acts(drawn).some(a=>a.uid==null),false);
 const payment=drawn.players[0].hand[0];
 drawn=pick(drawn,a=>a.uid===payment.uid);
 assert.equal(drawn.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(drawn.pending,null);

 let peeked=toPhase(fresh(counts,91017),'main');
 put(peeked,0,'MMM-1-025','energy',0,true);
 const top=stackTop(peeked,0,['MMM-1-006'])[0];
 readyAp(peeked,0,1);
 peeked=play(peeked,toHand(peeked,0,'MMM-1-016').uid);
 assert.equal(peeked.pending.kind,'private-top-choice');
 assertHidden(peeked,[top.uid]);
 peeked=pick(peeked,a=>a.type==='chooseTopCard'&&a.mode==='top');
 assert.equal(peeked.players[0].deck[0].uid,top.uid);
 assertHidden(peeked,[top.uid]);
 assertUniversalMatch(packs,peeked);
});

test('Mami gains 1000 only on her turn after two outside events',()=>{
 const counts=countsFor(['MMM-1-017','MMM-1-030','MMM-1-006']);
 let dry=toPhase(fresh(counts,91018),'main');
 const one=take(dry,0,'MMM-1-030');
 dry.players[0].outside.push(one);
 const early=put(dry,0,'MMM-1-017','front',0,true);
 assert.equal(universalBp(packs,dry,early),3000);
 const two=take(dry,0,'MMM-1-030');
 dry.players[0].outside.push(two);
 assert.equal(universalBp(packs,dry,field(dry,0,early.uid)),4000);
 dry=toSide(dry,1,'main');
 assert.equal(universalBp(packs,dry,field(dry,0,early.uid)),3000);
 assertUniversalMatch(packs,dry);
});

test('ordinary Mami ignores the raid frame, and a raid counts the discarded event',()=>{
 const counts=countsFor(['MMM-1-019','MMM-1-025','MMM-1-014','MMM-1-030','MMM-1-004','MMM-1-006']);
 let plain=toPhase(fresh(counts,91019),'main');
 yellow(plain,2);
 const deck=plain.players[0].deck.length;
 plain=play(plain,toHand(plain,0,'MMM-1-019').uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck);

 let raid=toPhase(fresh(counts,91020),'main');
 yellow(raid,2);
 const host=put(raid,0,'MMM-1-014','front',0,true);
 const event=toHand(raid,0,'MMM-1-030');
 const small=put(raid,1,'MMM-1-004','front',0,true);
 const big=put(raid,1,'MMM-1-006','front',1,true);
 const body=toHand(raid,0,'MMM-1-019');
 readyAp(raid,0,1);
 raid=use(raid,acts(raid).find(a=>a.type==='raid'&&a.uid===body.uid&&a.baseUid===host.uid));
 assert.equal(raid.pending.kind,'effect-discard');
 raid=pick(raid,a=>a.uid===event.uid);
 assert.equal(raid.pending.kind,'effect-bounce-bp');
 assert.equal(raid.pending.limit,1000);
 assert.equal(raid.pending.optional,true);
 assert.equal(raid.pending.choices.includes(small.uid),true);
 assert.equal(raid.pending.choices.includes(big.uid),false);
 raid=pick(raid,a=>a.uid==null);
 assert.equal(field(raid,1,small.uid)!==null,true);
 assertUniversalMatch(packs,raid);
});

test('Mami cuts five yellow at four outside events and still has impact 1',()=>{
 const counts=countsFor(['MMM-1-020','MMM-1-033','MMM-1-006']);
 let s=toPhase(fresh(counts,91021),'main');
 const body=put(s,0,'MMM-1-020','front',0,true);
 assert.equal(universalImpact(packs,s,body),1);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-020']),9);
 for(let i=0;i<4;i++)s.players[0].outside.push(take(s,0,'MMM-1-033'));
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-020']),4);
 assert.equal(universalImpact(packs,s,field(s,0,body.uid)),1);
});

test('Nagisa cancels the impact of the character that battles her',()=>{
 const counts=countsFor(['MMM-1-021','MMM-1-020','MMM-1-006']);
 let open=toPhase(fresh(counts,91022),'attack');
 quietLife(open,1,3);
 const striker=put(open,0,'MMM-1-020','front',0,true);
 const life=open.players[1].life.length;
 open=use(open,{type:'attack',uid:striker.uid});
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid==null);
 if(open.pending?.kind==='life-trigger')open=pick(open,a=>a.mode==='skip');
 assert.equal(open.players[1].life.length,life-1);

 let blocked=toPhase(fresh(counts,91023),'attack');
 quietLife(blocked,1,3);
 const attacker=put(blocked,0,'MMM-1-020','front',0,true);
 const nagisa=put(blocked,1,'MMM-1-021','front',0,true);
 nagisa.ready=true;
 const stayed=blocked.players[1].life.length;
 blocked=use(blocked,{type:'attack',uid:attacker.uid});
 blocked=pick(blocked,a=>a.type==='chooseBlock'&&a.uid===nagisa.uid);
 if(blocked.pending?.kind==='life-trigger')blocked=pick(blocked,a=>a.mode==='skip');
 assert.equal(blocked.players[1].outside.some(c=>c.uid===nagisa.uid),true);
 assert.equal(blocked.players[1].life.length,stayed);
 assertUniversalMatch(packs,blocked);
});

test('Sayaka adds one yellow on the energy line and retires when main ends',()=>{
 const counts=countsFor(['MMM-1-023','MMM-1-006']);
 let energy=toPhase(fresh(counts,91024),'main');
 const sayaka=put(energy,0,'MMM-1-023','energy',0,true);
 assert.equal(universalEnergyByColor(packs,energy,0).yellow,1);
 energy=use(energy,{type:'activate',uid:sayaka.uid,mode:'selfRestEnergyRetire'});
 assert.equal(field(energy,0,sayaka.uid).ready,false);
 assert.equal(universalEnergyByColor(packs,energy,0).yellow,2);
 field(energy,0,sayaka.uid).ready=true;
 assert.equal(acts(energy).some(a=>a.uid===sayaka.uid&&a.mode==='selfRestEnergyRetire'),false);
 energy=use(energy,{type:'next'});
 assert.equal(energy.phase,'attack');
 assert.equal(energy.players[0].outside.some(c=>c.uid===sayaka.uid),true);
 assert.equal(energy.players[0].removed.some(c=>c.uid===sayaka.uid),false);

 let front=toPhase(fresh(counts,91025),'main');
 const stood=put(front,0,'MMM-1-023','front',0,true);
 assert.equal(universalEnergyByColor(packs,front,0).yellow||0,0);
 front=use(front,{type:'activate',uid:stood.uid,mode:'selfRestEnergyRetire'});
 assert.equal(universalEnergyByColor(packs,front,0).yellow||0,0);
 front=use(front,{type:'next'});
 assert.equal(front.players[0].outside.some(c=>c.uid===stood.uid),true);
 assertUniversalMatch(packs,front);
});

test('Sayaka from the removed area can keep, split, or send both looked cards outside',()=>{
 const counts=countsFor(['MMM-1-024','MMM-1-002','MMM-1-025','MMM-1-011','MMM-1-010','MMM-1-006','MMM-1-009']);
 let kept=toPhase(fresh(counts,91026),'main');
 yellow(kept,4);
 const host=put(kept,0,'MMM-1-006','front',0,true);
 const sayaka=take(kept,0,'MMM-1-024');
 kept.players[0].removed.push(sayaka);
 const both=stackTop(kept,0,['MMM-1-009','MMM-1-006']);
 readyAp(kept,0,2);
 const raid=toHand(kept,0,'MMM-1-002');
 kept=use(kept,acts(kept).find(a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===host.uid));
 kept=use(kept,acts(kept).find(a=>a.type==='play'&&a.from==='removed'&&a.uid===sayaka.uid&&a.line==='energy'));
 assert.equal(kept.pending.kind,'effect-top-inspect-many');
 assert.equal(universalPrivateChoices(packs,kept,1),null);
 assertHidden(kept,both.map(c=>c.uid));
 kept=pick(kept,a=>a.uid==null);
 kept=orderRest(kept);
 assert.equal(kept.players[0].outside.some(c=>both.some(x=>x.uid===c.uid)),false);
 assert.deepEqual(kept.players[0].deck.slice(0,2).map(c=>c.uid).sort(),both.map(c=>c.uid).sort());

 let split=toPhase(fresh(counts,91027),'main');
 yellow(split,4);
 const base=put(split,0,'MMM-1-006','front',0,true);
 const copy=take(split,0,'MMM-1-024');
 split.players[0].removed.push(copy);
 const window=stackTop(split,0,['MMM-1-009','MMM-1-006']);
 readyAp(split,0,2);
 const top=toHand(split,0,'MMM-1-002');
 split=use(split,acts(split).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 split=use(split,acts(split).find(a=>a.type==='play'&&a.from==='removed'&&a.uid===copy.uid&&a.line==='energy'));
 split=pick(split,a=>a.uid===window[0].uid);
 assert.equal(split.pending.kind,'effect-top-inspect-many');
 assert.equal(split.players[0].outside.some(c=>c.uid===window[0].uid),false);
 split=pick(split,a=>a.uid==null);
 assert.equal(split.pending.kind,'effect-top-order');
 assert.equal(split.players[0].outside.some(c=>c.uid===window[0].uid),true);
 split=orderRest(split);
 assert.equal(split.players[0].deck[0].uid,window[1].uid);
 assert.equal(split.players[0].outside.some(c=>c.uid===window[1].uid),false);

 let bothOut=toPhase(fresh(counts,91030),'main');
 yellow(bothOut,4);
 const seat=put(bothOut,0,'MMM-1-006','front',0,true);
 const third=take(bothOut,0,'MMM-1-024');
 bothOut.players[0].removed.push(third);
 const pair=stackTop(bothOut,0,['MMM-1-009','MMM-1-006']);
 readyAp(bothOut,0,2);
 const cover=toHand(bothOut,0,'MMM-1-002');
 bothOut=use(bothOut,acts(bothOut).find(a=>a.type==='raid'&&a.uid===cover.uid&&a.baseUid===seat.uid));
 bothOut=use(bothOut,acts(bothOut).find(a=>a.type==='play'&&a.from==='removed'&&a.uid===third.uid&&a.line==='energy'));
 assert.equal(universalPrivateChoices(packs,bothOut,1),null);
 bothOut=pick(bothOut,a=>a.uid===pair[0].uid);
 bothOut=pick(bothOut,a=>a.uid===pair[1].uid);
 assert.equal(bothOut.pending,null);
 assert.equal(pair.every(c=>bothOut.players[0].outside.some(x=>x.uid===c.uid)),true);
 assert.equal(bothOut.players[0].deck.slice(0,2).some(c=>pair.some(x=>x.uid===c.uid)),false);
 assertUniversalMatch(packs,bothOut);
 assertUniversalMatch(packs,split);
});

test('Sayaka returns another energy-1 character, or herself when none qualifies',()=>{
 const counts=countsFor(['MMM-1-025','MMM-1-006','MMM-1-010','MMM-1-011']);
 let other=toPhase(fresh(counts,91028),'main');
 put(other,0,'MMM-1-011','energy',0,true);
 const cheap=put(other,0,'MMM-1-006','front',1,true);
 const costly=put(other,0,'MMM-1-010','energy',1,true);
 const sayaka=toHand(other,0,'MMM-1-025');
 readyAp(other,0,1);
 other=play(other,sayaka.uid);
 assert.equal(other.pending.kind,'effect-bounce-own');
 assert.equal(other.pending.optional,undefined);
 assert.equal(acts(other).some(a=>a.uid===cheap.uid),true);
 assert.equal(acts(other).some(a=>a.uid===costly.uid),false);
 assert.equal(acts(other).some(a=>a.uid===sayaka.uid),false);
 other=pick(other,a=>a.uid===cheap.uid);
 assert.equal(other.players[0].hand.some(c=>c.uid===cheap.uid),true);
 assert.equal(field(other,0,sayaka.uid)!==null,true);

 let self=toPhase(fresh(counts,91029),'main');
 put(self,0,'MMM-1-011','energy',0,true);
 put(self,0,'MMM-1-010','front',1,true);
 const alone=toHand(self,0,'MMM-1-025');
 readyAp(self,0,1);
 self=play(self,alone.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===alone.uid),true);
 assert.equal(field(self,0,alone.uid),null);
 assertUniversalMatch(packs,self);
});

test('each life kind in 001-025 resolves once',()=>{
 const counts=countsFor(['MMM-1-006','MMM-1-004','MMM-1-005','MMM-1-002','MMM-1-025',
  'MMM-1-011','MMM-1-010','MMM-1-009']);
 let got=toPhase(fresh(counts,91030),'attack');
 const swinger=put(got,0,'MMM-1-009','front',0,true);
 quietLife(got,1,1);
 const card=take(got,1,'MMM-1-006');
 got.players[1].life.unshift(card);
 got=use(got,{type:'attack',uid:swinger.uid});
 got=pick(got,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(got.pending.trigger,'get');
 got=pick(got,a=>a.mode==='get');
 assert.equal(got.players[1].hand.some(c=>c.uid===card.uid),true);

 let active=toPhase(fresh(counts,91031),'attack');
 const attacker=put(active,0,'MMM-1-009','front',0,true);
 const rested=put(active,1,'MMM-1-009','front',0,false);
 quietLife(active,1,1);
 const act=take(active,1,'MMM-1-004');
 active.players[1].life.unshift(act);
 active=use(active,{type:'attack',uid:attacker.uid});
 active=pick(active,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(active.pending.trigger,'active');
 active=pick(active,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(active,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,active,field(active,1,rested.uid)),5000);

 let draw=toPhase(fresh(counts,91032),'attack');
 const hitter=put(draw,0,'MMM-1-009','front',0,true);
 quietLife(draw,1,1);
 const drawn=take(draw,1,'MMM-1-005');
 draw.players[1].life.unshift(drawn);
 const hands=draw.players[1].hand.length;
 draw=use(draw,{type:'attack',uid:hitter.uid});
 draw=pick(draw,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(draw.pending.trigger,'draw');
 draw=pick(draw,a=>a.mode==='draw');
 assert.equal(draw.players[1].hand.length,hands+1);
 assert.equal(draw.players[1].outside.some(c=>c.uid===drawn.uid),true);

 let raid=toPhase(fresh(counts,91033),'main');
 put(raid,1,'MMM-1-025','energy',0,true);
 put(raid,1,'MMM-1-025','energy',1,true);
 put(raid,1,'MMM-1-011','energy',2,true);
 put(raid,1,'MMM-1-010','energy',3,true);
 const host=put(raid,1,'MMM-1-006','front',0,true);
 const opener=put(raid,0,'MMM-1-009','front',0,true);
 quietLife(raid,1,1);
 const flipped=take(raid,1,'MMM-1-002');
 raid.players[1].life.unshift(flipped);
 raid=toPhase(raid,'attack');
 raid=use(raid,{type:'attack',uid:opener.uid});
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(acts(raid).some(a=>a.mode==='get'),true);
 raid=pick(raid,a=>a.mode==='raid'&&a.baseUid===host.uid);
 assert.equal(field(raid,1,flipped.uid).ready,true);
 assert.equal(raid.players[1].front.some(c=>c?.uid===flipped.uid&&c.stack?.some(x=>x.uid===host.uid)),true);
 assertUniversalMatch(packs,raid);
});
