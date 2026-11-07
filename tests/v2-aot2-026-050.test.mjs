import test from 'node:test';
import assert from 'node:assert/strict';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {createRezeroV2Pack} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalImpact, universalImpactNull, universalPrivateChoices, universalPublicView,
 zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
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
  counts[id]=add;
  total+=add;
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
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(s.players[p][line][slot])throw Error('Slot occupied '+line+' '+slot);
 s.players[p][line][slot]=card;
 return card;
}
function coverRaid(s,p,top,baseId){
 const base=take(s,p,baseId);
 base.faceDown=false;
 base.ready=false;
 base.stack=[];
 base.under=[];
 top.stack=[base];
 return top;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function stackTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of cards.reverse())s.players[p].deck.unshift(card);
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function acts(s){return legalUniversalActions(packs,s);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=use(s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function toSide(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+player+' '+phase);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase+' from '+s.active+' '+s.phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(s,uid,line='front'){
 const action=acts(s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play for '+uid+' '+line+' '+JSON.stringify(acts(s).filter(a=>a.uid===uid).slice(0,4)));
 return use(s,action);
}
function cast(s,uid){
 const action=acts(s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event for '+uid);
 return use(s,action);
}
function pick(s,pred){
 const actions=acts(s);
 const action=actions.find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(actions.slice(0,8)));
 return use(s,action);
}
function setLife(s,p,n){
 const pl=s.players[p];
 while(pl.life.length>n)pl.deck.push(pl.life.pop());
 while(pl.life.length<n&&pl.deck.length)pl.life.push(pl.deck.pop());
 assert.equal(pl.life.length,n);
}
function field(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function roundTrip(s){return JSON.parse(JSON.stringify(s));}
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
function assertSameViews(s){
 const restored=roundTrip(s);
 assert.deepEqual(universalPublicView(packs,restored,1).publicReveals,
  universalPublicView(packs,s,1).publicReveals);
 if(s.pending?.player===0){
  assert.deepEqual(universalPrivateChoices(packs,restored,0),universalPrivateChoices(packs,s,0));
  assert.equal(universalPrivateChoices(packs,restored,1),null);
 }
}
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.step==='lookOrder'||s.pending.kind==='effect-top-order')){
  s=pick(s,a=>true);
  if(++guard>12)throw Error('order did not finish');
 }
 return s;
}
function passBlock(s){
 if(s.pending?.kind!=='block')return s;
 return pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
}
function swing(s,uid){
 s=use(s,{type:'attack',uid});
 if(s.pending?.kind==='attack-pay'||s.pending?.step==='pay'||s.pending?.step==='payBuff')
  s=pick(s,a=>a.mode==='skip'||a.mode==='pay'&&s.pending?.step!=='payBuff'||a.uid==null);
 if(s.pending?.step==='payBuff'&&!s.pending.data?.paid)
  s=pick(s,a=>a.mode==='skip');
 return passBlock(s);
}
function handEnergy(s,p,card){
 return zoneRequiredEnergy(packs,s,p,pack.cards[card.cardId],'hand');
}
function quietLife(s,p,n=3){
 const pl=s.players[p];
 while(pl.life.length)pl.deck.push(pl.life.pop());
 const blanks=pl.deck.filter(c=>!pack.cards[c.cardId].trigger).slice(0,n);
 assert.equal(blanks.length,n);
 for(const card of blanks){
  pl.deck.splice(pl.deck.indexOf(card),1);
  pl.life.push(card);
 }
}
function keepOnly(s,p,uids){
 const pl=s.players[p];
 const keep=new Set(uids);
 for(let i=pl.hand.length-1;i>=0;i--){
  if(keep.has(pl.hand[i].uid))continue;
  pl.deck.push(pl.hand.splice(i,1)[0]);
 }
}

const LIFE={
 'AOT-2-026':'draw','AOT-2-027':'draw','AOT-2-028':'active','AOT-2-029':'active',
 'AOT-2-030':'active','AOT-2-031':'color','AOT-2-032':'special','AOT-2-033':'final',
 'AOT-2-034':null,'AOT-2-035':'final','AOT-2-036':'draw','AOT-2-037':'special',
 'AOT-2-038':null,'AOT-2-039':'draw','AOT-2-040':null,'AOT-2-041':'draw',
 'AOT-2-042':'raid','AOT-2-043':'draw','AOT-2-044':null,'AOT-2-045':'active',
 'AOT-2-046':'active','AOT-2-047':'draw','AOT-2-048':'draw','AOT-2-049':null,
 'AOT-2-050':'color'
};

test('AOT-2-026 through 050 keep the printed life trigger',()=>{
 for(const [id,trigger] of Object.entries(LIFE))
  assert.equal(pack.cards[id].trigger,trigger,id);
});

test('the Jaw Titan generates on the front only while both names are on the field',()=>{
 const counts=countsFor(['AOT-2-020','AOT-2-023','AOT-2-026','AOT-2-001']);
 let s=toPhase(fresh(counts,26),'main');
 const jaw=put(s,0,'AOT-2-026','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,jaw),0);
 const eren=put(s,0,'AOT-2-020','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,jaw),0);
 const zeke=put(s,0,'AOT-2-023','energy',1,true);
 assert.equal(universalCardEnergy(packs,s,0,jaw),1);
 jaw.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,jaw),1);
 const energyJaw=put(s,0,'AOT-2-026','energy',2,false);
 assert.equal(universalCardEnergy(packs,s,0,energyJaw),1);
 s.players[0].energy[1]=null;
 s.players[0].outside.push(zeke);
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,jaw.uid)),0);
 s.players[0].energy[1]=zeke;
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,jaw.uid)),1);
 let life=toPhase(fresh(counts,260),'attack');
 put(life,0,'AOT-2-001','energy',0,true);
 const hitter=put(life,0,'AOT-2-001','front',0,true);
 setLife(life,1,2);
 const trigger=take(life,1,'AOT-2-026');
 life.players[1].life.unshift(trigger);
 const before=life.players[1].hand.length;
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,before+1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('the Beast Titan steps from an ordinary entry and gains BP only on its own turn',()=>{
 const counts=countsFor(['AOT-2-020','AOT-2-023','AOT-2-027','AOT-2-001']);
 let s=toPhase(fresh(counts,27),'main');
 const beast=put(s,0,'AOT-2-027','front',0,true);
 put(s,0,'AOT-2-020','energy',0,true);
 put(s,0,'AOT-2-023','energy',1,true);
 assert.equal(universalBp(packs,s,beast),4000);
 assert.equal(acts(s).some(a=>a.type==='step'&&a.uid===beast.uid),false);
 s=toSide(s,1,'main');
 assert.equal(universalBp(packs,s,field(s,0,beast.uid)),2500);
 s=toSide(s,0,'move');
 assert.equal(acts(s).some(a=>a.type==='step'&&a.uid===beast.uid),true);
 s=use(s,acts(s).find(a=>a.type==='step'&&a.uid===beast.uid));
 assert.equal(s.players[0].energy.some(c=>c?.uid===beast.uid),true);
 assert.equal(s.players[0].front[0],null);
 assert.equal(universalBp(packs,s,field(s,0,beast.uid)),4000);
 let bare=toPhase(fresh(counts,271),'main');
 const lonely=put(bare,0,'AOT-2-027','front',0,true);
 put(bare,0,'AOT-2-020','energy',0,true);
 assert.equal(universalBp(packs,bare,lonely),2500);
 let life=toPhase(fresh(counts,272),'attack');
 put(life,0,'AOT-2-001','energy',0,true);
 const hitter=put(life,0,'AOT-2-001','front',0,true);
 setLife(life,1,2);
 life.players[1].life.unshift(take(life,1,'AOT-2-027'));
 const before=life.players[1].hand.length;
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,before+1);
 assertUniversalMatch(packs,s);
});

test('the War Hammer blocks twice, shrugs off character choices, and still loses to an event',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-005','AOT-2-011',
  'AOT-2-013','AOT-2-020','AOT-2-023','AOT-2-027','AOT-2-028','AOT-2-037','AOT-2-039','AOT-2-041']);
 let block=toPhase(fresh(counts,28),'attack');
 put(block,1,'AOT-2-020','energy',0,true);
 put(block,1,'AOT-2-023','energy',1,true);
 const hammer=put(block,1,'AOT-2-028','front',0,true);
 const first=put(block,0,'AOT-2-005','front',0,true);
 const second=put(block,0,'AOT-2-004','front',1,true);
 put(block,0,'AOT-2-001','energy',0,true);
 block=use(block,{type:'attack',uid:first.uid});
 block=pick(block,a=>a.type==='chooseBlock'&&a.uid===hammer.uid);
 assert.equal(field(block,1,hammer.uid).ready,true);
 assert.equal(field(block,0,first.uid).ready,false);
 block=use(block,{type:'attack',uid:second.uid});
 block=pick(block,a=>a.type==='chooseBlock'&&a.uid===hammer.uid);
 assert.equal(field(block,1,hammer.uid).ready,false);
 assert.equal(field(block,0,second.uid).ready,false);
 assertUniversalMatch(packs,block);

 let once=toPhase(fresh(counts,281),'attack');
 const plain=put(once,1,'AOT-2-028','front',0,true);
 put(once,1,'AOT-2-020','energy',0,true);
 const attacker=put(once,0,'AOT-2-005','front',0,true);
 put(once,0,'AOT-2-001','energy',0,true);
 once=use(once,{type:'attack',uid:attacker.uid});
 once=pick(once,a=>a.type==='chooseBlock'&&a.uid===plain.uid);
 assert.equal(field(once,1,plain.uid).ready,false);

 let chosen=toPhase(fresh(counts,282),'main');
 put(chosen,0,'AOT-2-041','energy',0,true);
 put(chosen,0,'AOT-2-041','energy',1,true);
 put(chosen,1,'AOT-2-020','energy',0,true);
 put(chosen,1,'AOT-2-023','energy',1,true);
 const shielded=put(chosen,1,'AOT-2-028','front',0,true);
 const small=put(chosen,1,'AOT-2-001','front',1,true);
 readyAp(chosen,0,1);
 chosen=play(chosen,toHand(chosen,0,'AOT-2-039').uid);
 assert.equal(chosen.pending.kind,'effect-target');
 const targets=acts(chosen).filter(a=>a.uid).map(a=>a.uid);
 assert.equal(targets.includes(shielded.uid),false);
 assert.equal(targets.includes(small.uid),true);
 chosen=pick(chosen,a=>a.uid==null);
 assert.equal(universalBp(packs,chosen,field(chosen,1,shielded.uid)),4000);

 let open=toPhase(fresh(counts,283),'main');
 put(open,0,'AOT-2-041','energy',0,true);
 put(open,0,'AOT-2-041','energy',1,true);
 const exposed=put(open,1,'AOT-2-028','front',0,true);
 readyAp(open,0,1);
 open=play(open,toHand(open,0,'AOT-2-039').uid);
 open=pick(open,a=>a.uid===exposed.uid);
 assert.equal(universalBp(packs,open,field(open,1,exposed.uid)),2000);
 open=toSide(open,0,'start');
 assert.equal(universalBp(packs,open,field(open,0,exposed.uid)?'':field(open,1,exposed.uid)),4000);

 let raid=toPhase(fresh(counts,284),'main');
 put(raid,0,'AOT-2-003','energy',0,true);
 put(raid,0,'AOT-2-004','energy',1,true);
 put(raid,0,'AOT-2-027','energy',2,true);
 put(raid,0,'AOT-2-005','energy',3,true);
 const host=put(raid,0,'AOT-2-011','front',0,true);
 put(raid,1,'AOT-2-020','energy',0,true);
 put(raid,1,'AOT-2-023','energy',1,true);
 const wall=put(raid,1,'AOT-2-028','front',0,true);
 const fodder=put(raid,1,'AOT-2-004','front',1,true);
 readyAp(raid,0,1);
 const colossal=toHand(raid,0,'AOT-2-013');
 raid=use(raid,acts(raid).find(a=>a.type==='raid'&&a.uid===colossal.uid&&a.baseUid===host.uid));
 const kills=acts(raid).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(kills.includes(wall.uid),false);
 assert.equal(kills.includes(fodder.uid),true);
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(field(raid,1,wall.uid)!==null,true);

 let event=toPhase(fresh(counts,285),'main');
 for(let i=0;i<4;i++)put(event,0,'AOT-2-001','energy',i,true);
 put(event,1,'AOT-2-020','energy',0,true);
 put(event,1,'AOT-2-023','energy',1,true);
 const fallen=put(event,1,'AOT-2-028','front',0,true);
 readyAp(event,0,2);
 event=cast(event,toHand(event,0,'AOT-2-037').uid);
 assert.equal(acts(event).some(a=>a.mode==='retire'&&a.uid===fallen.uid),true);
 event=pick(event,a=>a.uid===fallen.uid);
 assert.equal(event.players[1].outside.some(c=>c.uid===fallen.uid),true);
 assertUniversalMatch(packs,event);
});

test('the Colossal Titan discounts only in hand, stays off the energy line, and deals 2',()=>{
 const counts=countsFor(['AOT-2-003','AOT-2-004','AOT-2-020','AOT-2-023','AOT-2-027','AOT-2-029','AOT-2-001','AOT-2-013']);
 let s=toPhase(fresh(counts,29),'main');
 const card=toHand(s,0,'AOT-2-029');
 assert.equal(handEnergy(s,0,card),9);
 put(s,0,'AOT-2-020','front',0,true);
 assert.equal(handEnergy(s,0,card),9);
 put(s,0,'AOT-2-023','front',1,true);
 assert.equal(handEnergy(s,0,card),7);
 put(s,0,'AOT-2-003','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-027','energy',2,true);
 put(s,0,'AOT-2-027','energy',3,true);
 readyAp(s,0,1);
 assert.equal(acts(s).some(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy'),false);
 s=play(s,card.uid,'front');
 assert.equal(s.players[0].front.some(c=>c?.uid===card.uid),true);
 assert.equal(field(s,0,card.uid).ready,false);
 assert.equal(s.players[0].aotFrontLimit,3);
 const body=field(s,0,card.uid);
 assert.equal(universalAttackDamage(packs,s,body),2);
 quietLife(s,1,3);
 s=toSide(s,1,'main');
 s=toSide(s,0,'attack');
 assert.equal(field(s,0,card.uid).ready,true);
 s=swing(s,card.uid);
 assert.equal(s.players[1].life.length,1);
 let crowded=toPhase(fresh(counts,291),'main');
 put(crowded,0,'AOT-2-029','front',0,true);
 put(crowded,0,'AOT-2-013','front',1,true);
 const extra=put(crowded,0,'AOT-2-001','front',2,true);
 crowded=use(crowded,{type:'next'});
 assert.equal(crowded.players[0].aotFrontLimit,2);
 crowded=pick(crowded,a=>a.uid===extra.uid);
 assert.equal(crowded.players[0].front.filter(Boolean).length,2);
 let life=toPhase(fresh(counts,292),'attack');
 put(life,1,'AOT-2-001','energy',0,true);
 const rested=put(life,1,'AOT-2-001','front',0,false);
 const hitter=put(life,0,'AOT-2-001','front',0,true);
 put(life,0,'AOT-2-001','energy',0,true);
 while(life.players[1].life.length)life.players[1].deck.push(life.players[1].life.pop());
 life.players[1].life=[take(life,1,'AOT-2-029'),take(life,1,'AOT-2-004'),take(life,1,'AOT-2-001')];
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'active');
 life=pick(life,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(life,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,life,field(life,1,rested.uid)),5500);
 assertUniversalMatch(packs,life);
});

test('Ksaver publishes the whole window on entry and on leave, and may take nothing',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-023','AOT-2-025','AOT-2-030','AOT-2-049','AOT-2-041']);
 let skipped=toPhase(fresh(counts,30),'main');
 readyAp(skipped,0,1);
 const kept=toHand(skipped,0,'AOT-2-001');
 const played=toHand(skipped,0,'AOT-2-030');
 stackTop(skipped,0,['AOT-2-004','AOT-2-023']);
 const window=skipped.players[0].deck.slice(0,2).map(c=>c.uid);
 skipped=play(skipped,played.uid);
 assert.equal(skipped.pending.step,'revealOut');
 assertSeen(skipped,window);
 assert.equal(universalPrivateChoices(packs,skipped,1),null);
 assertSameViews(skipped);
 skipped=pick(skipped,a=>a.mode==='done');
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].outside.filter(c=>window.includes(c.uid)).map(c=>c.uid).sort(),
  [...window].sort());
 assert.equal(skipped.players[0].hand.some(c=>c.uid===kept.uid),true);

 let taken=toPhase(fresh(counts,301),'main');
 readyAp(taken,0,1);
 const spare=toHand(taken,0,'AOT-2-001');
 const second=toHand(taken,0,'AOT-2-030');
 stackTop(taken,0,['AOT-2-025','AOT-2-004']);
 const zeke=taken.players[0].deck[0];
 const other=taken.players[0].deck[1];
 taken=play(taken,second.uid);
 assertSeen(taken,[zeke.uid,other.uid]);
 taken=pick(taken,a=>a.uid===zeke.uid);
 assert.equal(taken.pending.step,'discard');
 assert.equal(taken.players[0].hand.some(c=>c.uid===zeke.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===other.uid),true);
 taken=pick(taken,a=>a.uid===zeke.uid);
 assert.equal(taken.players[0].outside.some(c=>c.uid===zeke.uid),true);
 assert.equal(taken.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(taken.pending,null);

 let retired=toPhase(fresh(counts,302),'main');
 put(retired,0,'AOT-2-041','energy',0,true);
 put(retired,0,'AOT-2-041','energy',1,true);
 put(retired,0,'AOT-2-041','energy',2,true);
 const tom=put(retired,1,'AOT-2-030','front',0,true);
 readyAp(retired,0,1);
 stackTop(retired,1,['AOT-2-023','AOT-2-001']);
 const shown=retired.players[1].deck.slice(0,2).map(c=>c.uid);
 retired=cast(retired,toHand(retired,0,'AOT-2-049').uid);
 assert.equal(acts(retired).some(a=>a.mode==='retire'&&a.uid===tom.uid),true);
 retired=pick(retired,a=>a.uid===tom.uid);
 assert.equal(retired.players[1].outside.some(c=>c.uid===tom.uid),true);
 assert.equal(retired.pending.id,'AOT-2-030');
 assert.equal(retired.pending.step,'revealOut');
 assertSeen(retired,shown);
 retired=pick(retired,a=>a.mode==='done');
 assert.equal(retired.players[1].outside.filter(c=>shown.includes(c.uid)).length,2);
 assertUniversalMatch(packs,retired);
});

test('Founding Ymir needs a Yeager, looks privately, and rests an outside Yeager',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-011','AOT-2-020','AOT-2-023','AOT-2-024','AOT-2-031','AOT-2-004']);
 let blocked=toPhase(fresh(counts,31),'main');
 put(blocked,0,'AOT-2-001','energy',0,true);
 put(blocked,0,'AOT-2-004','energy',1,true);
 readyAp(blocked,0,1);
 const fieldCard=toHand(blocked,0,'AOT-2-031');
 assert.equal(acts(blocked).some(a=>a.type==='play'&&a.uid===fieldCard.uid),false);
 put(blocked,0,'AOT-2-023','front',0,true);
 blocked=play(blocked,fieldCard.uid,'energy');
 assert.equal(blocked.pending!==null,true);

 let look=toPhase(fresh(counts,311),'main');
 put(look,0,'AOT-2-001','energy',0,true);
 put(look,0,'AOT-2-004','energy',1,true);
 put(look,0,'AOT-2-023','front',0,true);
 readyAp(look,0,1);
 stackTop(look,0,['AOT-2-001','AOT-2-011','AOT-2-004','AOT-2-020']);
 const window=look.players[0].deck.slice(0,4);
 const heir=window.find(c=>c.cardId==='AOT-2-011');
 const below=look.players[0].deck.findIndex(c=>c.cardId==='AOT-2-001'&&!window.some(w=>w.uid===c.uid));
 const payment=look.players[0].deck.splice(below,1)[0];
 look.players[0].hand.push(payment);
 const founding=toHand(look,0,'AOT-2-031');
 look=play(look,founding.uid,'energy');
 assert.deepEqual(universalPrivateChoices(packs,look,0).inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,look,1),null);
 assertHidden(look,window.map(c=>c.uid));
 assertSameViews(look);
 look=pick(look,a=>a.uid===heir.uid);
 assertSeen(look,[heir.uid]);
 assertHidden(look,window.filter(c=>c.uid!==heir.uid).map(c=>c.uid));
 look=orderRest(look);
 assert.equal(look.pending.kind,'effect-discard');
 look=pick(look,a=>a.uid===heir.uid);
 assert.equal(look.players[0].outside.some(c=>c.uid===heir.uid),true);
 assert.equal(look.players[0].hand.some(c=>c.uid===payment.uid),true);
 assert.deepEqual(look.players[0].deck.slice(-3).map(c=>c.uid).sort(),
  window.filter(c=>c.uid!==heir.uid).map(c=>c.uid).sort());

 let zero=toPhase(fresh(counts,312),'main');
 put(zero,0,'AOT-2-001','energy',0,true);
 put(zero,0,'AOT-2-004','energy',1,true);
 put(zero,0,'AOT-2-023','front',0,true);
 readyAp(zero,0,1);
 const kept=toHand(zero,0,'AOT-2-001');
 const declined=toHand(zero,0,'AOT-2-031');
 stackTop(zero,0,['AOT-2-011','AOT-2-020','AOT-2-004','AOT-2-024']);
 const closed=zero.players[0].deck.slice(0,4).map(c=>c.uid);
 zero=play(zero,declined.uid,'energy');
 zero=pick(zero,a=>a.uid==null);
 zero=orderRest(zero);
 assert.equal(zero.pending,null);
 assert.equal(zero.players[0].hand.some(c=>c.uid===kept.uid),true);
 assert.deepEqual(zero.players[0].deck.slice(-4).map(c=>c.uid).sort(),[...closed].sort());
 assertHidden(zero,closed);

 let main=toPhase(fresh(counts,313),'main');
 put(main,0,'AOT-2-023','front',0,true);
 const ymir=put(main,0,'AOT-2-031','energy',0,true);
 readyAp(main,0,1);
 const zeke=toOutside(main,0,'AOT-2-024');
 const extra=main.players[0].deck.find(c=>c.cardId==='AOT-2-001');
 main.players[0].deck.splice(main.players[0].deck.indexOf(extra),1);
 main.players[0].outside.push(extra);
 const junk=[toHand(main,0,'AOT-2-001'),toHand(main,0,'AOT-2-004')];
 main=use(main,{type:'activate',uid:ymir.uid,mode:'aot2:AOT-2-031'});
 assert.equal(field(main,0,ymir.uid).ready,false);
 assert.equal(main.players[0].apCards.filter(c=>c.ready).length,0);
 main=pick(main,a=>a.uid===junk[0].uid);
 main=pick(main,a=>a.uid===junk[1].uid);
 assert.equal(acts(main).some(a=>a.mode==='enter'&&a.uid===zeke.uid&&a.ready===false),true);
 assert.equal(acts(main).some(a=>a.uid===extra.uid),false);
 assert.equal(acts(main).some(a=>a.mode==='done'),false);
 main=pick(main,a=>a.mode==='enter'&&a.uid===zeke.uid&&a.line==='front'&&a.slot===1);
 const entered=field(main,0,zeke.uid);
 assert.equal(entered.ready,false);
 assert.equal(main.pending.id,'AOT-2-024');
 assert.equal(main.pending.actions.some(a=>a.mode==='draw'),true);
 main=pick(main,a=>a.mode==='look');
 while(main.pending)main=pick(main,a=>a.mode==='done'||a.mode==='next'||a.uid==null);
 assertUniversalMatch(packs,main);

 let color=toPhase(fresh(counts,314),'main');
 put(color,0,'AOT-2-001','energy',0,true);
 const rested=put(color,0,'AOT-2-001','front',0,true);
 put(color,1,'AOT-2-001','energy',0,true);
 setLife(color,1,2);
 color.players[1].life.unshift(take(color,1,'AOT-2-031'));
 color=toPhase(color,'attack');
 color=swing(color,rested.uid);
 assert.equal(color.pending.trigger,'color');
 assert.equal(color.pending.player,1);
 assert.equal(acts(color).some(a=>a.mode==='color'),false);
 color=pick(color,a=>a.mode==='colorRestSkip'&&a.uid===rested.uid);
 assert.equal(field(color,0,rested.uid).ready,false);
 color=toSide(color,1,'start');
 assert.equal(field(color,0,rested.uid).ready,false);
 color=toSide(color,0,'start');
 assert.equal(field(color,0,rested.uid).ready,true);
 assertUniversalMatch(packs,color);
});

test('Ksaver watch finishes the leave, the rested Zeke, and the special trigger',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-023','AOT-2-024','AOT-2-025','AOT-2-031','AOT-2-032','AOT-1-045','AOT-2-004']);
 let none=toPhase(fresh(counts,32),'main');
 for(let i=0;i<4;i++)put(none,0,'AOT-2-001','energy',i,true);
 put(none,0,'AOT-1-045','front',0,true);
 readyAp(none,0,1);
 const early=toHand(none,0,'AOT-2-032');
 assert.equal(acts(none).some(a=>a.type==='event'&&a.uid===early.uid),false);
 const yellow=put(none,0,'AOT-2-023','front',1,true);
 none=cast(none,early.uid);
 const sacrifice=acts(none).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(sacrifice.includes(yellow.uid),true);
 assert.equal(sacrifice.includes(none.players[0].front[0].uid),false);

 let fieldYmir=toPhase(fresh(counts,321),'main');
 for(let i=0;i<3;i++)put(fieldYmir,0,'AOT-2-001','energy',i,true);
 put(fieldYmir,0,'AOT-2-031','energy',3,true);
 const beast=put(fieldYmir,0,'AOT-2-025','front',0,true);
 const plain=toOutside(fieldYmir,0,'AOT-2-024');
 const green=toOutside(fieldYmir,0,'AOT-1-045');
 const raider=toOutside(fieldYmir,0,'AOT-2-025');
 const handYmir=toHand(fieldYmir,0,'AOT-2-031');
 readyAp(fieldYmir,0,1);
 fieldYmir=cast(fieldYmir,toHand(fieldYmir,0,'AOT-2-032').uid);
 fieldYmir=pick(fieldYmir,a=>a.uid===beast.uid);
 assert.equal(acts(fieldYmir).some(a=>a.mode==='deploy'),true);
 fieldYmir=pick(fieldYmir,a=>a.mode==='deploy');
 const enters=acts(fieldYmir).filter(a=>a.mode==='enter').map(a=>a.uid);
 assert.equal(enters.includes(plain.uid),true);
 assert.equal(enters.includes(green.uid),false);
 assert.equal(enters.includes(raider.uid),false);
 assert.equal(acts(fieldYmir).some(a=>a.mode==='done'),true);
 fieldYmir=pick(fieldYmir,a=>a.mode==='done');
 assert.equal(fieldYmir.pending,null);
 assert.equal(fieldYmir.players[0].outside.some(c=>c.uid===plain.uid),true);
 assert.equal(fieldYmir.players[0].hand.some(c=>c.uid===handYmir.uid),true);

 let life=toPhase(fresh(counts,322),'attack');
 put(life,1,'AOT-2-001','energy',0,true);
 const hitter=put(life,1,'AOT-2-001','front',0,true);
 const victim=put(life,1,'AOT-2-004','front',1,true);
 setLife(life,0,2);
 const trigger=take(life,0,'AOT-2-032');
 life.players[0].life.unshift(trigger);
 life=toSide(life,1,'attack');
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'special');
 assert.equal(life.pending.player,0);
 life=pick(life,a=>a.mode==='special'&&a.uid===victim.uid);
 assert.equal(life.players[1].outside.some(c=>c.uid===victim.uid),true);
 assertUniversalMatch(packs,life);
});

test('the two AP events can ready nothing, and Final replaces an empty life',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-033','AOT-2-035']);
 let zero=toPhase(fresh(counts,33),'main');
 for(let i=0;i<3;i++)put(zero,0,'AOT-2-001','energy',i,true);
 readyAp(zero,0,1);
 zero.players[0].apCards[1].inPlay=true;
 zero.players[0].apCards[1].ready=false;
 zero.players[0].apCards[2].inPlay=true;
 zero.players[0].apCards[2].ready=false;
 zero=cast(zero,toHand(zero,0,'AOT-2-033').uid);
 assert.equal(zero.pending.kind,'effect-recover-ap');
 assert.equal(zero.pending.remaining,2);
 zero=pick(zero,a=>a.uid==null);
 assert.equal(zero.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(zero.pending,null);

 let both=toPhase(fresh(counts,35),'main');
 for(let i=0;i<3;i++)put(both,0,'AOT-2-001','energy',i,true);
 readyAp(both,0,1);
 both.players[0].apCards[1].inPlay=true;
 both.players[0].apCards[1].ready=false;
 both.players[0].apCards[2].inPlay=true;
 both.players[0].apCards[2].ready=false;
 both=cast(both,toHand(both,0,'AOT-2-035').uid);
 both=pick(both,a=>a.uid===both.players[0].apCards[0].uid);
 both=pick(both,a=>a.uid===both.players[0].apCards[1].uid);
 assert.equal(both.players[0].apCards.filter(c=>c.ready).length,2);

 let life=toPhase(fresh(counts,351),'attack');
 put(life,0,'AOT-2-001','energy',0,true);
 const hitter=put(life,0,'AOT-2-001','front',0,true);
 setLife(life,1,0);
 const finalCard=take(life,1,'AOT-2-033');
 life.players[1].life.push(finalCard);
 const top=life.players[1].deck[0];
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'final');
 life=pick(life,a=>a.mode==='final');
 assert.equal(life.players[1].life.length,1);
 assert.equal(life.players[1].life[0].uid,top.uid);
 assert.equal(life.players[1].life.some(c=>c.uid===finalCard.uid),false);
 assertUniversalMatch(packs,life);
});

test('the Rumbling finishes every retirement before it bans other attacks',()=>{
 const counts=countsFor(['AOT-2-003','AOT-2-004','AOT-2-005','AOT-2-013','AOT-2-022','AOT-2-023','AOT-2-027','AOT-2-030','AOT-2-034']);
 let s=toPhase(fresh(counts,34),'main');
 put(s,0,'AOT-2-003','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-027','energy',2,true);
 put(s,0,'AOT-2-027','energy',3,true);
 const eren=put(s,0,'AOT-2-022','front',0,true);
 const other=put(s,0,'AOT-2-005','front',1,true);
 put(s,0,'AOT-2-023','front',2,true);
 const tom=put(s,1,'AOT-2-030','front',0,true);
 const low=put(s,1,'AOT-2-004','front',1,true);
 const tall=put(s,1,'AOT-2-013','front',2,true);
 readyAp(s,0,2);
 stackTop(s,1,['AOT-2-003','AOT-2-005']);
 const event=toHand(s,0,'AOT-2-034');
 const spare=toHand(s,0,'AOT-2-003');
 keepOnly(s,0,[event.uid,spare.uid]);
 assert.equal(acts(s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const third=toHand(s,0,'AOT-2-004');
 keepOnly(s,0,[event.uid,spare.uid,third.uid]);
 s=cast(s,event.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===tom.uid),true);
 assert.equal(s.pending.id,'AOT-2-030');
 assert.equal(field(s,1,low.uid)!==null,true);
 assert.equal(s.players[0].aot2AttackOnly,undefined);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending,null);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(field(s,1,tall.uid)!==null,true);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[0].aot2AttackOnly.name,'エレン・イェーガー（終尾の巨人）');
 s=toPhase(s,'attack');
 const attacks=acts(s).filter(a=>a.type==='attack').map(a=>a.uid);
 assert.equal(attacks.includes(eren.uid),true);
 assert.equal(attacks.includes(other.uid),false);
 s=toSide(s,0,'start');
 assert.equal(!s.players[0].aot2AttackOnly||s.players[0].aot2AttackOnly.turn!==s.turn,true);
 s=toPhase(s,'attack');
 assert.equal(acts(s).some(a=>a.type==='attack'&&a.uid===other.uid),true);
 assertUniversalMatch(packs,s);
});

test('the rescue life trigger draws, and the look stays private until a name is taken',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-036']);
 let life=toPhase(fresh(counts,36),'attack');
 put(life,0,'AOT-2-001','energy',0,true);
 const hitter=put(life,0,'AOT-2-001','front',0,true);
 setLife(life,1,2);
 const trigger=take(life,1,'AOT-2-036');
 life.players[1].life.unshift(trigger);
 const before=life.players[1].hand.length;
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'draw');
 life=pick(life,a=>a.mode==='draw');
 assert.equal(life.players[1].hand.length,before+1);
 assert.equal(life.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('everyone together cuts AP at four names and raises the cap for Mikasa',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-005','AOT-2-008','AOT-2-013','AOT-2-020','AOT-2-037','AOT-2-069']);
 let full=toPhase(fresh(counts,37),'main');
 put(full,0,'AOT-2-003','energy',0,true);
 put(full,0,'AOT-2-004','energy',1,true);
 put(full,0,'AOT-2-001','front',0,true);
 const victim=put(full,1,'AOT-2-013','front',0,true);
 put(full,1,'AOT-2-004','front',1,true);
 readyAp(full,0,1);
 const cheap=toHand(full,0,'AOT-2-037');
 assert.equal(acts(full).some(a=>a.type==='event'&&a.uid===cheap.uid),false);
 put(full,0,'AOT-2-005','front',1,true);
 assert.equal(acts(full).some(a=>a.type==='event'&&a.uid===cheap.uid),true);
 put(full,0,'AOT-2-008','front',2,true);
 full=cast(full,cheap.uid);
 assert.equal(acts(full).some(a=>a.mode==='retire'&&a.uid===victim.uid),true);
 assert.equal(acts(full).some(a=>a.mode==='done'),false);
 full=pick(full,a=>a.uid===victim.uid);
 assert.equal(full.players[1].outside.some(c=>c.uid===victim.uid),true);

 let narrow=toPhase(fresh(counts,371),'main');
 put(narrow,0,'AOT-2-001','energy',0,true);
 put(narrow,0,'AOT-2-003','energy',1,true);
 put(narrow,0,'AOT-2-004','energy',2,true);
 put(narrow,0,'AOT-2-005','energy',3,true);
 const colossal=put(narrow,1,'AOT-2-013','front',0,true);
 const low=put(narrow,1,'AOT-2-004','front',1,true);
 readyAp(narrow,0,2);
 narrow=cast(narrow,toHand(narrow,0,'AOT-2-037').uid);
 const uids=acts(narrow).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(uids.includes(low.uid),true);
 assert.equal(uids.includes(colossal.uid),false);
 narrow=pick(narrow,a=>a.uid===low.uid);

 let stood=toPhase(fresh(counts,372),'main');
 put(stood,0,'AOT-2-001','energy',0,true);
 put(stood,0,'AOT-2-003','energy',1,true);
 put(stood,0,'AOT-2-004','energy',2,true);
 put(stood,0,'AOT-2-005','energy',3,true);
 coverRaid(stood,0,put(stood,0,'AOT-2-069','front',0,true),'AOT-2-001');
 const raised=put(stood,1,'AOT-2-013','front',0,true);
 readyAp(stood,0,2);
 stood=cast(stood,toHand(stood,0,'AOT-2-037').uid);
 assert.equal(acts(stood).some(a=>a.mode==='retire'&&a.uid===raised.uid),true);
 stood=pick(stood,a=>a.mode==='retire'&&a.uid===raised.uid);
 assert.equal(stood.players[1].outside.some(c=>c.uid===raised.uid),true);
 assertUniversalMatch(packs,stood);
});

test('Hange may buff nobody, and the larger Hange may decline the BP cut',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-038','AOT-2-039','AOT-2-041','AOT-2-004']);
 let small=toPhase(fresh(counts,38),'main');
 put(small,0,'AOT-2-041','energy',0,true);
 const other=put(small,0,'AOT-2-004','front',0,true);
 readyAp(small,0,2);
 small=play(small,toHand(small,0,'AOT-2-038').uid);
 assert.equal(small.pending.kind,'effect-buff-own');
 assert.equal(acts(small).some(a=>a.uid===small.players[0].front.find(c=>c?.cardId==='AOT-2-038').uid),false);
 small=pick(small,a=>a.uid==null);
 assert.equal(universalBp(packs,small,field(small,0,other.uid)),1500);
 small=play(small,toHand(small,0,'AOT-2-038').uid);
 small=pick(small,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,small,field(small,0,other.uid)),2500);
 small=toSide(small,0,'start');
 assert.equal(universalBp(packs,small,field(small,0,other.uid)),1500);

 let big=toPhase(fresh(counts,39),'main');
 put(big,0,'AOT-2-041','energy',0,true);
 put(big,0,'AOT-2-041','energy',1,true);
 const low=put(big,1,'AOT-2-004','front',0,true);
 const exact=put(big,1,'AOT-2-001','front',1,true);
 readyAp(big,0,2);
 big=play(big,toHand(big,0,'AOT-2-039').uid);
 const uids=acts(big).filter(a=>a.uid).map(a=>a.uid);
 assert.equal(uids.includes(low.uid),false);
 assert.equal(uids.includes(exact.uid),true);
 big=pick(big,a=>a.uid==null);
 assert.equal(universalBp(packs,big,field(big,1,exact.uid)),2500);
 big=play(big,toHand(big,0,'AOT-2-039').uid);
 big=pick(big,a=>a.uid===exact.uid);
 assert.equal(universalBp(packs,big,field(big,1,exact.uid)),500);
 assertUniversalMatch(packs,big);
});

test('Levi rests another active front character, once each copy, for blue energy this turn',()=>{
 const counts=countsFor(['AOT-2-040','AOT-2-041','AOT-2-043','AOT-2-001']);
 let alone=toPhase(fresh(counts,40),'main');
 const only=put(alone,0,'AOT-2-040','front',0,true);
 put(alone,0,'AOT-2-041','energy',0,true);
 assert.equal(acts(alone).some(a=>a.mode==='aot2:AOT-2-040'),false);
 const partner=put(alone,0,'AOT-2-043','front',1,true);
 alone=use(alone,{type:'activate',uid:only.uid,mode:'aot2:AOT-2-040'});
 assert.equal(field(alone,0,only.uid).ready,false);
 const fronts=acts(alone).filter(a=>a.mode==='rest').map(a=>a.uid);
 assert.deepEqual(fronts,[partner.uid]);
 alone=pick(alone,a=>a.uid===partner.uid);
 assert.equal(field(alone,0,partner.uid).ready,false);
 assert.equal(universalCardEnergy(packs,alone,0,field(alone,0,only.uid)),0);
 const moved=field(alone,0,only.uid);
 alone.players[0].front[alone.players[0].front.indexOf(moved)]=null;
 alone.players[0].energy[1]=moved;
 assert.equal(universalCardEnergy(packs,alone,0,field(alone,0,only.uid)),2);
 alone=toSide(alone,0,'start');
 assert.equal(universalCardEnergy(packs,alone,0,field(alone,0,only.uid)),1);

 let energy=toPhase(fresh(counts,401),'main');
 const levi=put(energy,0,'AOT-2-040','energy',0,true);
 const mate=put(energy,0,'AOT-2-043','front',0,true);
 const copy=put(energy,0,'AOT-2-040','energy',1,true);
 put(energy,0,'AOT-2-041','energy',2,true);
 energy=use(energy,{type:'activate',uid:levi.uid,mode:'aot2:AOT-2-040'});
 energy=pick(energy,a=>a.uid===mate.uid);
 assert.equal(universalCardEnergy(packs,energy,0,field(energy,0,levi.uid)),2);
 field(energy,0,mate.uid).ready=true;
 energy=use(energy,{type:'activate',uid:copy.uid,mode:'aot2:AOT-2-040'});
 energy=pick(energy,a=>a.uid===mate.uid);
 assert.equal(universalCardEnergy(packs,energy,0,field(energy,0,copy.uid)),2);
 field(energy,0,mate.uid).ready=true;
 field(energy,0,levi.uid).ready=true;
 assert.equal(acts(energy).some(a=>a.mode==='aot2:AOT-2-040'&&a.uid===levi.uid),false);
 assertUniversalMatch(packs,energy);
});

test('Levi may pay and buff nobody, or two characters, and the bonus ends with the turn',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-041','AOT-2-043']);
 let none=toPhase(fresh(counts,41),'attack');
 quietLife(none,1,3);
 put(none,0,'AOT-2-041','energy',0,true);
 const levi=put(none,0,'AOT-2-041','front',0,true);
 assert.equal(universalImpactNull(packs,none,levi),true);
 const mate=put(none,0,'AOT-2-043','front',1,true);
 readyAp(none,0,1);
 none=use(none,{type:'attack',uid:levi.uid});
 assert.equal(none.pending.step,'payBuff');
 none=pick(none,a=>a.mode==='pay');
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,0);
 none=pick(none,a=>a.mode==='done');
 assert.equal(universalBp(packs,none,field(none,0,levi.uid)),3000);
 assert.equal(universalBp(packs,none,field(none,0,mate.uid)),3000);
 none=passBlock(none);

 let two=toPhase(fresh(counts,411),'attack');
 quietLife(two,1,3);
 put(two,0,'AOT-2-041','energy',0,true);
 const body=put(two,0,'AOT-2-041','front',0,true);
 const ally=put(two,0,'AOT-2-043','front',1,true);
 readyAp(two,0,1);
 two=use(two,{type:'attack',uid:body.uid});
 two=pick(two,a=>a.mode==='pay');
 two=pick(two,a=>a.uid===body.uid);
 two=pick(two,a=>a.uid===ally.uid);
 assert.equal(two.pending===null||two.pending.kind==='block',true);
 assert.equal(universalBp(packs,two,field(two,0,body.uid)),4500);
 assert.equal(universalBp(packs,two,field(two,0,ally.uid)),4500);
 two=passBlock(two);
 two=toSide(two,0,'start');
 assert.equal(universalBp(packs,two,field(two,0,body.uid)),3000);
 assert.equal(universalBp(packs,two,field(two,0,ally.uid)),3000);

 let skip=toPhase(fresh(counts,412),'attack');
 quietLife(skip,1,3);
 const quiet=put(skip,0,'AOT-2-041','front',0,true);
 readyAp(skip,0,0);
 skip=use(skip,{type:'attack',uid:quiet.uid});
 assert.equal(skip.pending?.step==='payBuff',false);
 skip=passBlock(skip);
 assertUniversalMatch(packs,skip);
});

test('raid Levi draws and chooses an attack mode only while the raid frame is live',()=>{
 const counts=countsFor(['AOT-2-040','AOT-2-041','AOT-2-042','AOT-2-043','AOT-2-001']);
 let ordinary=toPhase(fresh(counts,42),'main');
 put(ordinary,0,'AOT-2-041','energy',0,true);
 put(ordinary,0,'AOT-2-041','energy',1,true);
 put(ordinary,0,'AOT-2-043','energy',2,true);
 readyAp(ordinary,0,1);
 const before=ordinary.players[0].hand.length;
 const played=toHand(ordinary,0,'AOT-2-042');
 ordinary=play(ordinary,played.uid);
 assert.equal(ordinary.pending,null);
 assert.equal(ordinary.players[0].hand.length,before);
 assert.equal(field(ordinary,0,played.uid).ready,false);
 quietLife(ordinary,1,3);
 ordinary=toSide(ordinary,1,'main');
 ordinary=toSide(ordinary,0,'attack');
 assert.equal(field(ordinary,0,played.uid).ready,true);
 ordinary=use(ordinary,{type:'attack',uid:played.uid});
 assert.equal(ordinary.pending?.id==='AOT-2-042',false);
 ordinary=passBlock(ordinary);

 let raid=toPhase(fresh(counts,421),'main');
 put(raid,0,'AOT-2-041','energy',0,true);
 put(raid,0,'AOT-2-041','energy',1,true);
 put(raid,0,'AOT-2-043','energy',2,true);
 const base=put(raid,0,'AOT-2-040','front',0,true);
 readyAp(raid,0,1);
 raid.players[0].apCards[1].inPlay=true;
 raid.players[0].apCards[1].ready=false;
 const hand=raid.players[0].hand.length;
 const raider=toHand(raid,0,'AOT-2-042');
 toHand(raid,0,'AOT-2-001');
 raid=use(raid,acts(raid).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid));
 assert.equal(field(raid,0,raider.uid).ready,true);
 assert.equal(raid.players[0].hand.length,hand+2);
 assert.equal(raid.pending.step,'discardAp');
 raid=pick(raid,a=>a.mode==='done');
 assert.equal(raid.players[0].apCards.filter(c=>c.ready&&c.inPlay).length,0);
 quietLife(raid,1,3);
 raid=toPhase(raid,'attack');
 readyAp(raid,0,1);
 raid=use(raid,{type:'attack',uid:raider.uid});
 assert.equal(raid.pending.id,'AOT-2-042');
 assert.equal(acts(raid).some(a=>a.mode==='draw'),true);
 assert.equal(acts(raid).some(a=>a.mode==='impact'),true);
 raid=pick(raid,a=>a.mode==='skip');
 assert.equal(universalBp(packs,raid,field(raid,0,raider.uid)),4000);
 assert.equal(raid.players[0].apCards.filter(c=>c.ready).length,1);
 raid=passBlock(raid);
 raid=toSide(raid,1,'main');
 raid=toSide(raid,0,'attack');
 readyAp(raid,0,1);
 const drawn=raid.players[0].hand.length;
 raid=use(raid,{type:'attack',uid:raider.uid});
 raid=pick(raid,a=>a.mode==='draw');
 assert.equal(raid.players[0].hand.length,drawn+1);
 assert.equal(universalBp(packs,raid,field(raid,0,raider.uid)),5000);
 assert.equal(universalImpact(packs,raid,field(raid,0,raider.uid)),0);
 raid=passBlock(raid);

 let impact=toPhase(fresh(counts,422),'main');
 put(impact,0,'AOT-2-041','energy',0,true);
 put(impact,0,'AOT-2-041','energy',1,true);
 put(impact,0,'AOT-2-043','energy',2,true);
 const host=put(impact,0,'AOT-2-040','front',1,true);
 readyAp(impact,0,2);
 const copy=toHand(impact,0,'AOT-2-042');
 impact=use(impact,acts(impact).find(a=>a.type==='raid'&&a.uid===copy.uid&&a.baseUid===host.uid));
 if(impact.pending?.step==='discardAp')impact=pick(impact,a=>a.mode==='done');
 quietLife(impact,1,3);
 impact=toPhase(impact,'attack');
 readyAp(impact,0,1);
 const deck=impact.players[0].deck.length;
 impact=use(impact,{type:'attack',uid:copy.uid});
 impact=pick(impact,a=>a.mode==='impact');
 assert.equal(universalBp(packs,impact,field(impact,0,copy.uid)),5000);
 assert.equal(universalImpact(packs,impact,field(impact,0,copy.uid)),1);
 assert.equal(impact.players[0].deck.length,deck);
 impact=passBlock(impact);
 assertUniversalMatch(packs,impact);

 let flipped=toPhase(fresh(counts,423),'main');
 put(flipped,1,'AOT-2-041','energy',0,true);
 put(flipped,1,'AOT-2-041','energy',1,true);
 put(flipped,1,'AOT-2-043','energy',2,true);
 const hostLife=put(flipped,1,'AOT-2-040','front',0,true);
 put(flipped,0,'AOT-2-001','energy',0,true);
 const hitter=put(flipped,0,'AOT-2-001','front',0,true);
 setLife(flipped,1,2);
 const raidLife=take(flipped,1,'AOT-2-042');
 flipped.players[1].life.unshift(raidLife);
 flipped=toPhase(flipped,'attack');
 flipped=swing(flipped,hitter.uid);
 assert.equal(flipped.pending.trigger,'raid');
 assert.equal(acts(flipped).some(a=>a.mode==='get'),true);
 flipped=pick(flipped,a=>a.mode==='raid'&&a.baseUid===hostLife.uid);
 if(flipped.pending?.step==='discardAp')flipped=pick(flipped,a=>a.mode==='done');
 assert.equal(field(flipped,1,raidLife.uid).ready,true);
 assert.equal(flipped.players[1].front.some(c=>c?.uid===raidLife.uid&&c.stack?.some(x=>x.uid===hostLife.uid)),true);
 assertUniversalMatch(packs,flipped);
});

test('Sasha draws and must put one hand card outside',()=>{
 const counts=countsFor(['AOT-2-041','AOT-2-043','AOT-2-001']);
 let s=toPhase(fresh(counts,43),'main');
 put(s,0,'AOT-2-041','energy',0,true);
 readyAp(s,0,1);
 const sasha=toHand(s,0,'AOT-2-043');
 const top=s.players[0].deck[0];
 s=play(s,sasha.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.some(c=>c.uid===top.uid),true);
 s=pick(s,a=>a.uid===top.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Historia rests for another corps member only with six outside events',()=>{
 const counts=countsFor(['AOT-2-033','AOT-2-035','AOT-2-043','AOT-2-044','AOT-2-048','AOT-2-049','AOT-2-001']);
 let s=toPhase(fresh(counts,44),'main');
 const historia=put(s,0,'AOT-2-044','energy',0,true);
 const corps=put(s,0,'AOT-2-043','front',0,true);
 assert.equal(acts(s).some(a=>a.mode==='aot2:AOT-2-044'),false);
 for(const id of ['AOT-2-033','AOT-2-035','AOT-2-033','AOT-2-035','AOT-2-048','AOT-2-049'])
  toOutside(s,0,id);
 s=use(s,{type:'activate',uid:historia.uid,mode:'aot2:AOT-2-044'});
 assert.equal(field(s,0,historia.uid).ready,false);
 assert.equal(acts(s).some(a=>a.uid===historia.uid),false);
 s=pick(s,a=>a.uid===corps.uid);
 assert.equal(universalBp(packs,s,field(s,0,corps.uid)),4000);
 s=toSide(s,0,'start');
 assert.equal(universalBp(packs,s,field(s,0,corps.uid)),3000);
 assertUniversalMatch(packs,s);
});

test('Historia chooses one draw line from the outside event count',()=>{
 const counts=countsFor(['AOT-2-033','AOT-2-035','AOT-2-045','AOT-2-048','AOT-2-049','AOT-2-041']);
 let bare=toPhase(fresh(counts,45),'main');
 put(bare,0,'AOT-2-041','energy',0,true);
 put(bare,0,'AOT-2-041','energy',1,true);
 readyAp(bare,0,1);
 bare=play(bare,toHand(bare,0,'AOT-2-045').uid);
 assert.deepEqual(acts(bare).map(a=>a.mode).sort(),['d1']);
 const before=bare.players[0].hand.length;
 bare=pick(bare,a=>a.mode==='d1');
 assert.equal(bare.pending.kind,'aot2');
 assert.equal(bare.pending.step,'discard');
 assert.equal(bare.players[0].hand.length,before+1);
 bare=pick(bare,a=>true);
 assert.equal(bare.pending,null);

 let mid=toPhase(fresh(counts,451),'main');
 put(mid,0,'AOT-2-041','energy',0,true);
 put(mid,0,'AOT-2-041','energy',1,true);
 toOutside(mid,0,'AOT-2-033');
 toOutside(mid,0,'AOT-2-035');
 readyAp(mid,0,1);
 const candy=toHand(mid,0,'AOT-2-045');
 const deck=mid.players[0].deck.length;
 mid=play(mid,candy.uid);
 assert.equal(acts(mid).some(a=>a.mode==='d6'),false);
 mid=pick(mid,a=>a.mode==='d2');
 assert.equal(mid.pending,null);
 assert.equal(mid.players[0].deck.length,deck-1);

 let high=toPhase(fresh(counts,452),'main');
 put(high,0,'AOT-2-041','energy',0,true);
 put(high,0,'AOT-2-041','energy',1,true);
 for(const id of ['AOT-2-033','AOT-2-035','AOT-2-033','AOT-2-035','AOT-2-048','AOT-2-049'])
  toOutside(high,0,id);
 readyAp(high,0,1);
 const drawn=toHand(high,0,'AOT-2-045');
 const deep=high.players[0].deck.length;
 high=play(high,drawn.uid);
 high=pick(high,a=>a.mode==='d6');
 assert.equal(high.players[0].deck.length,deep-2);
 assert.equal(high.pending.step,'discard');
 high=pick(high,a=>true);
 assertUniversalMatch(packs,high);
});

test('Mikasa gains BP at two outside events and loses Impact only at four',()=>{
 const counts=countsFor(['AOT-2-033','AOT-2-035','AOT-2-046','AOT-2-048','AOT-2-049','AOT-2-001']);
 let s=toPhase(fresh(counts,46),'main');
 const mikasa=put(s,0,'AOT-2-046','front',0,true);
 assert.equal(universalBp(packs,s,mikasa),2000);
 assert.equal(universalImpactNull(packs,s,mikasa),false);
 toOutside(s,0,'AOT-2-033');
 toOutside(s,0,'AOT-2-035');
 assert.equal(universalBp(packs,s,field(s,0,mikasa.uid)),3000);
 assert.equal(universalImpactNull(packs,s,field(s,0,mikasa.uid)),false);
 toOutside(s,0,'AOT-2-048');
 toOutside(s,0,'AOT-2-049');
 assert.equal(universalBp(packs,s,field(s,0,mikasa.uid)),3000);
 assert.equal(universalImpactNull(packs,s,field(s,0,mikasa.uid)),true);
 while(s.players[0].outside.length>1)s.players[0].deck.push(s.players[0].outside.pop());
 assert.equal(universalBp(packs,s,field(s,0,mikasa.uid)),2000);
 assert.equal(universalImpactNull(packs,s,field(s,0,mikasa.uid)),false);
 assertUniversalMatch(packs,s);
});

test('Armin looks at two privately and may put one event outside',()=>{
 const counts=countsFor(['AOT-2-033','AOT-2-038','AOT-2-047','AOT-2-001']);
 let s=toPhase(fresh(counts,47),'main');
 readyAp(s,0,1);
 stackTop(s,0,['AOT-2-033','AOT-2-038']);
 const event=s.players[0].deck[0];
 const character=s.players[0].deck[1];
 s=play(s,toHand(s,0,'AOT-2-047').uid);
 assert.equal(s.pending.step,'lookPick');
 assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid),[event.uid,character.uid]);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertHidden(s,[event.uid,character.uid]);
 assertSameViews(s);
 s=pick(s,a=>a.uid===event.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(s.players[0].deck[0].uid,character.uid);
 assertHidden(s,[character.uid]);

 let zero=toPhase(fresh(counts,471),'main');
 readyAp(zero,0,1);
 stackTop(zero,0,['AOT-2-038','AOT-2-001']);
 const window=zero.players[0].deck.slice(0,2).map(c=>c.uid);
 zero=play(zero,toHand(zero,0,'AOT-2-047').uid);
 assert.equal(zero.pending.step,'lookOrder');
 assertHidden(zero,window);
 zero=orderRest(zero);
 assert.deepEqual(zero.players[0].deck.slice(0,2).map(c=>c.uid).sort(),[...window].sort());
 assert.equal(zero.players[0].outside.some(c=>window.includes(c.uid)),false);
 assertHidden(zero,window);
 assertUniversalMatch(packs,zero);
});

test('the candy looks privately, then may rest a cheap blue character',()=>{
 const counts=countsFor(['AOT-2-038','AOT-2-039','AOT-2-040','AOT-2-041','AOT-2-048','AOT-2-001']);
 let s=toPhase(fresh(counts,48),'main');
 put(s,0,'AOT-2-041','energy',0,true);
 put(s,0,'AOT-2-041','energy',1,true);
 readyAp(s,0,1);
 const levi=toHand(s,0,'AOT-2-040');
 const expensive=toHand(s,0,'AOT-2-039');
 const candy=toHand(s,0,'AOT-2-048');
 stackTop(s,0,['AOT-2-038','AOT-2-001','AOT-2-041','AOT-2-038']);
 const window=s.players[0].deck.slice(0,4);
 const hange=window.find(c=>c.cardId==='AOT-2-038');
 s=cast(s,candy.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertHidden(s,window.map(c=>c.uid));
 s=pick(s,a=>a.uid===hange.uid);
 assertSeen(s,[hange.uid]);
 assertHidden(s,window.filter(c=>c.uid!==hange.uid).map(c=>c.uid));
 s=orderRest(s);
 assert.equal(s.pending.step,'enter');
 const offered=acts(s).filter(a=>a.mode==='enter').map(a=>a.uid);
 assert.equal(offered.includes(hange.uid),true);
 assert.equal(offered.includes(levi.uid),true);
 assert.equal(offered.includes(expensive.uid),false);
 assert.equal(acts(s).filter(a=>a.mode==='enter'&&a.uid===levi.uid).every(a=>a.ready===false),true);
 s=pick(s,a=>a.mode==='done');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===hange.uid),true);
 assert.equal(field(s,0,levi.uid),null);

 let entered=toPhase(fresh(counts,481),'main');
 put(entered,0,'AOT-2-041','energy',0,true);
 put(entered,0,'AOT-2-041','energy',1,true);
 readyAp(entered,0,1);
 stackTop(entered,0,['AOT-2-038','AOT-2-039','AOT-2-041','AOT-2-001']);
 const body=toHand(entered,0,'AOT-2-040');
 entered=cast(entered,toHand(entered,0,'AOT-2-048').uid);
 entered=pick(entered,a=>a.uid==null);
 entered=orderRest(entered);
 entered=pick(entered,a=>a.mode==='enter'&&a.uid===body.uid&&a.line==='front');
 assert.equal(field(entered,0,body.uid).ready,false);
 assert.equal(entered.pending,null);
 assertUniversalMatch(packs,entered);
});

test('Thunder Spear retires only the printed low or high window',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-002','AOT-2-008','AOT-2-013','AOT-2-041','AOT-2-049','AOT-2-069']);
 let s=toPhase(fresh(counts,49),'main');
 put(s,0,'AOT-2-041','energy',0,true);
 put(s,0,'AOT-2-041','energy',1,true);
 put(s,0,'AOT-2-041','energy',2,true);
 const low=put(s,1,'AOT-2-001','front',0,true);
 const mid=put(s,1,'AOT-2-002','front',1,true);
 const gap=put(s,1,'AOT-2-008','front',2,true);
 readyAp(s,0,2);
 s=cast(s,toHand(s,0,'AOT-2-049').uid);
 const first=acts(s).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(first.includes(low.uid),true);
 assert.equal(first.includes(mid.uid),false);
 assert.equal(first.includes(gap.uid),false);
 assert.equal(acts(s).some(a=>a.mode==='done'),false);
 s=pick(s,a=>a.uid===low.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 coverRaid(s,0,put(s,0,'AOT-2-069','front',0,true),'AOT-2-041');
 const high=put(s,1,'AOT-2-013','front',0,true);
 s=cast(s,toHand(s,0,'AOT-2-049').uid);
 const second=acts(s).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(second.includes(mid.uid),true);
 assert.equal(second.includes(gap.uid),false);
 assert.equal(second.includes(high.uid),true);
 assertUniversalMatch(packs,s);
});

test('Gabi buffs another warrior, doubles both in a raid, and the color trigger deploys a cheap green',()=>{
 const counts=countsFor(['AOT-2-050','AOT-1-045','AOT-1-046','AOT-1-047','AOT-2-053','AOT-2-001']);
 let plain=toPhase(fresh(counts,50),'attack');
 quietLife(plain,1,3);
 const gabi=put(plain,0,'AOT-2-050','front',0,true);
 const warrior=put(plain,0,'AOT-1-046','front',1,true);
 plain=use(plain,{type:'attack',uid:gabi.uid});
 assert.equal(plain.pending.step,'raidBuff');
 assert.equal(acts(plain).some(a=>a.uid===gabi.uid),false);
 plain=pick(plain,a=>a.mode==='done');
 assert.equal(universalBp(packs,plain,field(plain,0,warrior.uid)),2500);
 plain=passBlock(plain);
 let plus=toPhase(fresh(counts,503),'attack');
 quietLife(plus,1,3);
 const self=put(plus,0,'AOT-2-050','front',0,true);
 const other=put(plus,0,'AOT-1-046','front',1,true);
 plus=use(plus,{type:'attack',uid:self.uid});
 plus=pick(plus,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,plus,field(plus,0,other.uid)),3500);
 assert.equal(universalBp(packs,plus,field(plus,0,self.uid)),2000);
 plus=passBlock(plus);
 plus=toSide(plus,0,'start');
 assert.equal(universalBp(packs,plus,field(plus,0,other.uid)),2500);

 let raid=toPhase(fresh(counts,501),'main');
 const attacker=put(raid,0,'AOT-2-050','front',0,true);
 put(raid,0,'AOT-2-050','energy',0,true);
 put(raid,0,'AOT-1-045','energy',1,true);
 put(raid,0,'AOT-1-046','energy',2,true);
 put(raid,0,'AOT-1-047','energy',3,true);
 const host=put(raid,0,'AOT-1-045','front',1,true);
 readyAp(raid,0,1);
 const beast=toHand(raid,0,'AOT-2-053');
 raid=use(raid,acts(raid).find(a=>a.type==='raid'&&a.uid===beast.uid&&a.baseUid===host.uid));
 if(raid.pending)raid=pick(raid,a=>a.mode==='done'||a.uid==null);
 quietLife(raid,1,3);
 raid=toPhase(raid,'attack');
 raid=use(raid,{type:'attack',uid:attacker.uid});
 raid=pick(raid,a=>a.uid===beast.uid);
 assert.equal(universalBp(packs,raid,field(raid,0,beast.uid)),6000);
 assert.equal(universalBp(packs,raid,field(raid,0,attacker.uid)),4000);
 raid=passBlock(raid);
 raid=toSide(raid,0,'start');
 assert.equal(universalBp(packs,raid,field(raid,0,attacker.uid)),2000);

 let life=toPhase(fresh(counts,502),'attack');
 put(life,1,'AOT-2-001','energy',0,true);
 const hitter=put(life,1,'AOT-2-001','front',0,true);
 const cheap=toHand(life,0,'AOT-1-045');
 const dear=toHand(life,0,'AOT-1-047');
 setLife(life,0,2);
 const trigger=take(life,0,'AOT-2-050');
 life.players[0].life.unshift(trigger);
 life=toSide(life,1,'attack');
 life=swing(life,hitter.uid);
 assert.equal(life.pending.trigger,'color');
 assert.equal(life.pending.player,0);
 const deploys=acts(life).filter(a=>a.mode==='color');
 assert.equal(deploys.some(a=>a.uid===cheap.uid),true);
 assert.equal(deploys.some(a=>a.uid===dear.uid),false);
 life=pick(life,a=>a.mode==='color'&&a.uid===cheap.uid&&a.line==='front');
 assert.equal(field(life,0,cheap.uid).ready,true);
 assert.equal(life.players[0].outside.some(c=>c.uid===trigger.uid)||
  life.players[0].deck.some(c=>c.uid===trigger.uid),true);
 assertUniversalMatch(packs,life);
});

test('Ram cannot choose the War Hammer, and the all-front cut skips it',()=>{
 const rez=createRezeroV2Pack();
 function fill(title,required){
  const fillers=Object.values(title.cards).filter(c=>!required.includes(c.id)&&
   !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
  const ids=[...new Set(required)];
  const caps={special:0,color:0,final:0},counts={};
  for(const id of ids){
   const trigger=title.cards[id].trigger;
   let copies=4;
   if(trigger==='special'||trigger==='color'||trigger==='final'){
    copies=Math.min(2,4-caps[trigger]);
    caps[trigger]+=copies;
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
  assert.deepEqual(validateUniversalDeck(title,counts),[]);
  return counts;
 }
 const mixed=[rez,pack];
 const go=(state,action)=>dispatchUniversalAction(mixed,state,action);
 let s=newUniversalMatch(mixed,{decks:[fill(rez,['REZ-1-011','REZ-1-007']),
  fill(pack,['AOT-2-001','AOT-2-020','AOT-2-023','AOT-2-028'])],seed:28028,first:0});
 for(let guard=0;s.phase!=='main';guard++){
  if(s.pending)throw Error('Pending blocked Ram setup');
  s=go(s,{type:'next'});
  if(guard>8)throw Error('Did not reach main');
 }
 for(let i=0;i<4;i++)put(s,0,'REZ-1-007','energy',i,true);
 put(s,1,'AOT-2-020','energy',0,true);
 put(s,1,'AOT-2-023','energy',1,true);
 const hammer=put(s,1,'AOT-2-028','front',0,true);
 const small=put(s,1,'AOT-2-001','front',1,true);
 const before=universalBp(mixed,s,small);
 readyAp(s,0,1);
 const ram=toHand(s,0,'REZ-1-011');
 const raidRam=legalUniversalActions(mixed,s).find(a=>a.type==='raid'&&a.uid===ram.uid&&a.line!=='energy');
 if(!raidRam)throw Error('Ram cannot raid');
 s=go(s,raidRam);
 assert.equal(s.pending.kind,'effect-choice-mode');
 let chosen=structuredClone(s);
 s=go(s,{type:'chooseEffectMode',mode:'allDown'});
 assert.equal(universalBp(mixed,s,field(s,1,hammer.uid)),4000);
 assert.equal(universalBp(mixed,s,field(s,1,small.uid)),before-1000);
 chosen=go(chosen,{type:'chooseEffectMode',mode:'oneDown'});
 assert.equal(chosen.pending.kind,'effect-target');
 assert.equal(chosen.pending.choices.includes(hammer.uid),false);
 assert.equal(chosen.pending.choices.includes(small.uid),true);
 assertUniversalMatch(mixed,s);
});
