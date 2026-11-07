import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, effectiveHandRequiredEnergy,
 legalUniversalActions, newUniversalMatch, universalBp, universalCardEnergy,
 universalEnergyByColor, universalPrivateChoices, universalPublicView}
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
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+JSON.stringify(actions.slice(0,8)));
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
function yellow(s,n){
 const gens=['MMM-1-025','MMM-1-025','MMM-1-025','MMM-1-011'];
 for(let i=0;i<n;i++)put(s,0,gens[i],'energy',i,true);
}
function purple(s,n){
 const gens=['MMM-1-049','MMM-1-049','MMM-1-049','MMM-1-037'];
 for(let i=0;i<n;i++)put(s,0,gens[i],'energy',i,true);
}

test('024 can still send the whole removed-entry window outside',()=>{
 assert.deepEqual(pack.cards['MMM-1-024'].effects.onPlay,[{
  op:'ifEnteredFromRemoved',then:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]
 }]);
});

test('Sayaka adds one yellow only while she is active on the energy line',()=>{
 const counts=countsFor(['MMM-1-026','MMM-1-006']);
 let s=toPhase(fresh(counts,10026),'main');
 const body=put(s,0,'MMM-1-026','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,body),2);
 body.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,field(s,0,body.uid)),1);
 const front=put(s,0,'MMM-1-026','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
});

test('Mami house discounts every Mami this turn only after an event leaves',()=>{
 const counts=countsFor(['MMM-1-027','MMM-1-025','MMM-1-018','MMM-1-030','MMM-1-014']);
 let s=toPhase(fresh(counts,10027),'main');
 const house=put(s,0,'MMM-1-027','energy',0,true);
 put(s,0,'MMM-1-025','energy',1,true);
 const mami=toHand(s,0,'MMM-1-018');
 const other=toHand(s,0,'MMM-1-014');
 assert.equal(acts(s).some(a=>a.mode==='discardEventEnergy'),false);
 const event=toHand(s,0,'MMM-1-030');
 readyAp(s,0,1);
 s=use(s,acts(s).find(a=>a.mode==='discardEventEnergy'&&a.uid===house.uid));
 assert.equal(s.pending.choices.includes(event.uid),true);
 assert.equal(s.pending.choices.includes(mami.uid),false);
 assert.equal(acts(s).some(a=>a.uid==null),false);
 s=pick(s,a=>a.uid===event.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-018'],mami),1);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-014'],other),0);
 s=toSide(s,1,'main');
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-018'],
  s.players[0].hand.find(c=>c.uid===mami.uid)),2);
 assertUniversalMatch(packs,s);
});

test('Law of Cycles removes a BP 5000 front and does not retire it',()=>{
 const counts=countsFor(['MMM-1-028','MMM-1-025','MMM-1-006','MMM-1-001','MMM-1-047']);
 let s=toPhase(fresh(counts,10028),'main');
 yellow(s,3);
 put(s,0,'MMM-1-047','front',0,true);
 const low=put(s,1,'MMM-1-006','front',0,true);
 const high=put(s,1,'MMM-1-001','front',1,true);
 high.buffs=[{bp:1000,untilTurn:s.turn}];
 const event=toHand(s,0,'MMM-1-028');
 readyAp(s,0,1);
 assert.equal(universalBp(packs,s,high),6000);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-remove-front-self');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(acts(s).some(a=>a.uid==null),false);
 s=pick(s,a=>a.uid===low.uid);
 assert.equal(s.players[1].removed.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),false);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===low.uid),false);
 assert.equal(s.players[0].removed.some(c=>c.uid===event.uid),true);
 assertUniversalMatch(packs,s);
});

test('the fear event skips the next active only when Mami and two events are both true',()=>{
 const counts=countsFor(['MMM-1-033','MMM-1-025','MMM-1-018','MMM-1-030','MMM-1-006']);
 function cast(seed,prepare){
  let s=toPhase(fresh(counts,seed),'main');
  yellow(s,2);
  const victim=put(s,1,'MMM-1-006','front',0,true);
  prepare(s);
  const event=toHand(s,0,'MMM-1-033');
  readyAp(s,0,1);
  s=play(s,event.uid,'event');
  return {s,victim};
 }
 const mamiOnly=cast(10033,s=>put(s,0,'MMM-1-018','front',0,true));
 assert.equal(mamiOnly.s.pending.skipNextActive,false);
 const oneEvent=cast(10034,s=>{
  put(s,0,'MMM-1-018','front',0,true);
  s.players[0].outside.push(take(s,0,'MMM-1-030'));
 });
 assert.equal(oneEvent.s.pending.skipNextActive,true);
 const eventsOnly=cast(10035,s=>{
  s.players[0].outside.push(take(s,0,'MMM-1-030'),take(s,0,'MMM-1-030'));
 });
 assert.equal(eventsOnly.s.pending.skipNextActive,false);
});

test('ordinary Devil Homura ignores the raid frame, and a raid raises the cut',()=>{
 const counts=countsFor(['MMM-1-036','MMM-1-049','MMM-1-039','MMM-1-035','MMM-1-006',
  'MMM-1-037','MMM-1-001','MMM-1-028','MMM-1-025','MMM-1-047']);
 let plain=toPhase(fresh(counts,10036),'main');
 purple(plain,3);
 put(plain,0,'MMM-1-006','front',1,true);
 const body=toHand(plain,0,'MMM-1-036');
 readyAp(plain,0,1);
 plain=play(plain,body.uid);
 assert.equal(plain.pending,null);
 assert.equal(field(plain,0,body.uid).ready,false);
 assert.equal((field(plain,0,body.uid).stack||[]).length,0);

 let bare=toPhase(fresh(counts,10037),'main');
 put(bare,0,'MMM-1-037','energy',0,true);
 put(bare,0,'MMM-1-037','energy',1,true);
 put(bare,0,'MMM-1-037','energy',2,true);
 const host=put(bare,0,'MMM-1-039','front',0,true);
 put(bare,0,'MMM-1-035','front',1,true);
 const foe=put(bare,1,'MMM-1-001','front',0,true);
 const raider=toHand(bare,0,'MMM-1-036');
 readyAp(bare,0,1);
 bare=use(bare,acts(bare).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid));
 assert.equal(bare.pending,null);
 assert.equal(universalBp(packs,bare,field(bare,1,foe.uid)),5000);
 assert.equal(field(bare,0,raider.uid).ready,true);

 let pure=toPhase(fresh(counts,10038),'main');
 purple(pure,3);
 const base=put(pure,0,'MMM-1-039','front',0,true);
 put(pure,0,'MMM-1-035','front',1,true);
 const madoka=put(pure,0,'MMM-1-006','front',2,true);
 const target=put(pure,1,'MMM-1-001','front',0,true);
 const top=toHand(pure,0,'MMM-1-036');
 readyAp(pure,0,1);
 pure=use(pure,acts(pure).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 assert.equal(pure.pending.kind,'effect-bounce-named-cut');
 assert.equal(pure.pending.choices.includes(madoka.uid),true);
 assert.equal(acts(pure).some(a=>a.uid==null),true);
 pure=pick(pure,a=>a.uid===madoka.uid);
 assert.equal(pure.players[0].hand.some(c=>c.uid===madoka.uid),true);
 assert.equal(pure.pending.kind,'effect-front-bp-cut');
 assert.equal(pure.pending.bp,4000);
 assert.equal(acts(pure).some(a=>a.uid==null),true);
 pure=pick(pure,a=>a.uid===target.uid);
 assert.equal(universalBp(packs,pure,field(pure,1,target.uid)),1000);
 pure=toSide(pure,1,'main');
 assert.equal(universalBp(packs,pure,field(pure,1,target.uid)),5000);

 let mixed=toPhase(fresh(counts,10039),'main');
 purple(mixed,3);
 const stand=put(mixed,0,'MMM-1-039','front',0,true);
 put(mixed,0,'MMM-1-037','front',1,true);
 const girl=put(mixed,0,'MMM-1-006','front',2,true);
 const other=put(mixed,1,'MMM-1-001','front',0,true);
 const devil=toHand(mixed,0,'MMM-1-036');
 readyAp(mixed,0,1);
 mixed=use(mixed,acts(mixed).find(a=>a.type==='raid'&&a.uid===devil.uid&&a.baseUid===stand.uid));
 mixed=pick(mixed,a=>a.uid===girl.uid);
 assert.equal(mixed.pending.bp,3000);
 mixed=pick(mixed,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,mixed,field(mixed,1,other.uid)),2000);
 assertUniversalMatch(packs,mixed);
});

test('a raided Devil Homura blocks effect removal, and a plain copy does not',()=>{
 const counts=countsFor(['MMM-1-036','MMM-1-049','MMM-1-039','MMM-1-035','MMM-1-006',
  'MMM-1-028','MMM-1-025','MMM-1-047']);
 let open=toPhase(fresh(counts,10040),'main');
 yellow(open,3);
 put(open,0,'MMM-1-047','front',0,true);
 const plainDevil=put(open,1,'MMM-1-036','front',0,true);
 const law=toHand(open,0,'MMM-1-028');
 readyAp(open,0,1);
 open=play(open,law.uid,'event');
 assert.equal(open.pending.choices.includes(plainDevil.uid),true);
 open=pick(open,a=>a.uid===plainDevil.uid);
 assert.equal(open.players[1].removed.some(c=>c.uid===plainDevil.uid),true);
 assert.equal(open.turnRetireEvents.some(e=>e.uid===plainDevil.uid),false);

 let shielded=toPhase(fresh(counts,10041),'main');
 purple(shielded,3);
 const host=put(shielded,0,'MMM-1-039','front',0,true);
 const alias=put(shielded,0,'MMM-1-035','front',1,true);
 const madoka=put(shielded,0,'MMM-1-006','front',2,true);
 yellow(shielded,0);
 put(shielded,1,'MMM-1-025','energy',0,true);
 put(shielded,1,'MMM-1-025','energy',1,true);
 put(shielded,1,'MMM-1-025','energy',2,true);
 put(shielded,1,'MMM-1-047','front',0,true);
 const event=toHand(shielded,1,'MMM-1-028');
 const raider=toHand(shielded,0,'MMM-1-036');
 readyAp(shielded,0,1);
 shielded=use(shielded,acts(shielded).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid));
 shielded=pick(shielded,a=>a.uid==null);
 assert.equal(shielded.pending,null);
 readyAp(shielded,1,1);
 shielded=toSide(shielded,1,'main');
 shielded=play(shielded,event.uid,'event');
 assert.equal(shielded.pending.choices.includes(raider.uid),false);
 assert.equal(shielded.pending.choices.includes(alias.uid),false);
 assert.equal(shielded.pending.choices.includes(madoka.uid),true);
 assertUniversalMatch(packs,shielded);
});

test('Kyubey discounts one purple only while the opponent has yellow or red',()=>{
 const counts=countsFor(['MMM-1-037','MMM-1-006','MMM-1-039']);
 let s=toPhase(fresh(counts,10042),'main');
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-037']),3);
 put(s,1,'MMM-1-006','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-037']),2);
 s.players[1].front[0]=null;
 put(s,1,'MMM-1-039','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['MMM-1-037']),3);
});

test('Bebe buffs another character this turn and is treated as Nagisa',()=>{
 const counts=countsFor(['MMM-1-038','MMM-1-025','MMM-1-006']);
 let s=toPhase(fresh(counts,10043),'main');
 yellow(s,1);
 const other=put(s,0,'MMM-1-006','front',0,true);
 const bebe=toHand(s,0,'MMM-1-038');
 readyAp(s,0,1);
 s=play(s,bebe.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(other.uid),true);
 assert.equal(s.pending.choices.includes(bebe.uid),false);
 assert.equal(acts(s).some(a=>a.uid==null),true);
 s=pick(s,a=>a.uid===other.uid);
 assert.equal(universalBp(packs,s,field(s,0,other.uid)),2500);
 s=toSide(s,1,'main');
 assert.equal(universalBp(packs,s,field(s,0,other.uid)),1500);
 assert.equal(pack.cards['MMM-1-038'].nameAliases.includes('百江 なぎさ'),true);
 assertUniversalMatch(packs,s);
});

test('Madoka publishes one matching card from a private five-card look',()=>{
 const counts=countsFor(['MMM-1-040','MMM-1-049','MMM-1-006','MMM-1-039','MMM-1-030','MMM-1-047','MMM-1-050']);
 let skipped=toPhase(fresh(counts,10044),'main');
 purple(skipped,1);
 const window=stackTop(skipped,0,['MMM-1-030','MMM-1-039','MMM-1-050','MMM-1-006','MMM-1-047']);
 const actor=toHand(skipped,0,'MMM-1-040');
 readyAp(skipped,0,1);
 skipped=play(skipped,actor.uid);
 assert.equal(skipped.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(packs,skipped,1),null);
 assertHidden(skipped,window.map(c=>c.uid));
 assert.equal(skipped.pending.choices.includes(window[3].uid),true);
 assert.equal(skipped.pending.choices.includes(window[4].uid),true);
 assert.equal(skipped.pending.choices.includes(window[0].uid),false);
 skipped=pick(skipped,a=>a.uid==null);
 skipped=orderRest(skipped);
 assert.equal(skipped.pending,null);
 assertHidden(skipped,window.map(c=>c.uid));

 let taken=toPhase(fresh(counts,10045),'main');
 purple(taken,1);
 const seen=stackTop(taken,0,['MMM-1-006','MMM-1-039','MMM-1-030','MMM-1-050','MMM-1-047']);
 const spare=toHand(taken,0,'MMM-1-049');
 readyAp(taken,0,1);
 taken=play(taken,toHand(taken,0,'MMM-1-040').uid);
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

test('raided Homura draws two and a plain copy does not',()=>{
 const counts=countsFor(['MMM-1-041','MMM-1-049','MMM-1-039','MMM-1-006']);
 let plain=toPhase(fresh(counts,10046),'main');
 purple(plain,2);
 put(plain,0,'MMM-1-006','front',1,true);
 const entered=toHand(plain,0,'MMM-1-041');
 readyAp(plain,0,1);
 const before=plain.players[0].deck.length;
 plain=play(plain,entered.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,before);
 assert.equal((field(plain,0,entered.uid).stack||[]).length,0);

 let raid=toPhase(fresh(counts,10047),'main');
 purple(raid,2);
 const host=put(raid,0,'MMM-1-039','front',0,true);
 const raider=toHand(raid,0,'MMM-1-041');
 readyAp(raid,0,1);
 const deck=raid.players[0].deck.length;
 raid=use(raid,acts(raid).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===host.uid));
 assert.equal(raid.players[0].deck.length,deck-2);
 assert.equal(raid.pending.kind,'effect-discard');
 assert.equal(acts(raid).some(a=>a.uid==null),false);
 raid=pick(raid,a=>a.type==='chooseDiscard');
 assert.equal(raid.pending,null);
 assert.equal(field(raid,0,raider.uid).ready,true);
 assert.equal(field(raid,0,raider.uid).stack[0].uid,host.uid);
 assertUniversalMatch(packs,raid);
});

test('Nagisa publishes one quintet or alias from a private look',()=>{
 const counts=countsFor(['MMM-1-043','MMM-1-049','MMM-1-038','MMM-1-045','MMM-1-039']);
 let s=toPhase(fresh(counts,10048),'main');
 purple(s,1);
 const seen=stackTop(s,0,['MMM-1-039','MMM-1-038','MMM-1-045']);
 readyAp(s,0,1);
 s=play(s,toHand(s,0,'MMM-1-043').uid);
 assert.equal(s.pending.choices.includes(seen[0].uid),false);
 assert.equal(s.pending.choices.includes(seen[1].uid),true);
 assert.equal(s.pending.choices.includes(seen[2].uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertHidden(s,seen.map(c=>c.uid));
 s=pick(s,a=>a.uid===seen[2].uid);
 assertSeen(s,[seen[2].uid]);
 assertHidden(s,seen.slice(0,2).map(c=>c.uid));
 s=orderRest(s);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.players[0].hand.some(c=>c.uid===seen[2].uid),true);
 assertUniversalMatch(packs,s);
});

test('ordinary Nagisa ignores the raid frame, and a raid reveals the top',()=>{
 const counts=countsFor(['MMM-1-044','MMM-1-037','MMM-1-038','MMM-1-045','MMM-1-006','MMM-1-043','MMM-1-049']);
 let plain=toPhase(fresh(counts,10049),'main');
 purple(plain,2);
 const quiet=toHand(plain,0,'MMM-1-044');
 const spare=toHand(plain,0,'MMM-1-006');
 readyAp(plain,0,1);
 plain=play(plain,quiet.uid);
 assert.equal(plain.pending,null);
 assert.equal(acts(plain).some(a=>a.mode==='frontDiscardBuff'),false);
 quietLife(plain,1,3);
 field(plain,0,quiet.uid).ready=true;
 plain=toPhase(plain,'attack');
 const deck=plain.players[0].deck.length;
 plain=use(plain,{type:'attack',uid:quiet.uid});
 plain=pick(plain,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(plain.players[0].hand.some(c=>c.uid===spare.uid),true);

 let raid=toPhase(fresh(counts,10050),'main');
 purple(raid,2);
 const host=put(raid,0,'MMM-1-043','front',0,true);
 const quintet=put(raid,0,'MMM-1-045','front',1,true);
 const alias=put(raid,0,'MMM-1-038','front',2,true);
 const girl=put(raid,0,'MMM-1-006','energy',2,true);
 const payment=toHand(raid,0,'MMM-1-006');
 const body=toHand(raid,0,'MMM-1-044');
 readyAp(raid,0,1);
 raid=use(raid,acts(raid).find(a=>a.type==='raid'&&a.uid===body.uid&&a.baseUid===host.uid));
 assert.equal(raid.pending,null);
 assert.equal(field(raid,0,body.uid).ready,true);
 const beforeAlias=universalBp(packs,raid,field(raid,0,alias.uid));
 const beforeQuintet=universalBp(packs,raid,field(raid,0,quintet.uid));
 const beforeGirl=universalBp(packs,raid,field(raid,0,girl.uid));
 const beforeBody=universalBp(packs,raid,field(raid,0,body.uid));
 raid=use(raid,acts(raid).find(a=>a.mode==='frontDiscardBuff'&&a.discardUid===payment.uid));
 assert.equal(raid.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(universalBp(packs,raid,field(raid,0,alias.uid)),beforeAlias+1000);
 assert.equal(universalBp(packs,raid,field(raid,0,quintet.uid)),beforeQuintet+1000);
 assert.equal(universalBp(packs,raid,field(raid,0,girl.uid)),beforeGirl);
 assert.equal(universalBp(packs,raid,field(raid,0,body.uid)),beforeBody+1000);
 const shown=stackTop(raid,0,['MMM-1-006'])[0];
 quietLife(raid,1,3);
 raid=toPhase(raid,'attack');
 raid=use(raid,{type:'attack',uid:body.uid});
 assert.equal(raid.pending.kind,'effect-reveal-top-place');
 assertSeen(raid,[shown.uid]);
 raid=pick(raid,a=>a.mode==='bottom');
 assert.equal(raid.players[0].deck.at(-1).uid,shown.uid);
 assertSeen(raid,[shown.uid]);
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid==null);
 if(raid.pending?.kind==='life-trigger')raid=pick(raid,a=>a.mode==='skip');
 raid=toSide(raid,1,'main');
 assert.equal(universalBp(packs,raid,field(raid,0,alias.uid)),beforeAlias);

 let stayed=toPhase(fresh(counts,10051),'main');
 put(stayed,0,'MMM-1-037','energy',1,true);
 put(stayed,0,'MMM-1-037','energy',2,true);
 const energyHost=put(stayed,0,'MMM-1-038','energy',0,true);
 toHand(stayed,0,'MMM-1-006');
 const sidelined=toHand(stayed,0,'MMM-1-044');
 readyAp(stayed,0,1);
 stayed=use(stayed,acts(stayed).find(a=>a.type==='raid'&&a.uid===sidelined.uid&&
  a.baseUid===energyHost.uid&&a.line==='energy'));
 assert.equal(field(stayed,0,sidelined.uid).uid,sidelined.uid);
 assert.equal(stayed.players[0].energy[0].uid,sidelined.uid);
 assert.equal(acts(stayed).some(a=>a.mode==='frontDiscardBuff'),false);
 assertUniversalMatch(packs,stayed);
});

test('quintet Homura cancels the impact of the character that battles her',()=>{
 const counts=countsFor(['MMM-1-045','MMM-1-020','MMM-1-006']);
 let open=toPhase(fresh(counts,10052),'attack');
 quietLife(open,1,3);
 const striker=put(open,0,'MMM-1-020','front',0,true);
 const life=open.players[1].life.length;
 open=use(open,{type:'attack',uid:striker.uid});
 open=pick(open,a=>a.type==='chooseBlock'&&a.uid==null);
 if(open.pending?.kind==='life-trigger')open=pick(open,a=>a.mode==='skip');
 assert.equal(open.players[1].life.length,life-1);

 let blocked=toPhase(fresh(counts,10053),'attack');
 quietLife(blocked,1,3);
 const attacker=put(blocked,0,'MMM-1-020','front',0,true);
 const wall=put(blocked,1,'MMM-1-045','front',0,true);
 wall.ready=true;
 const stayed=blocked.players[1].life.length;
 blocked=use(blocked,{type:'attack',uid:attacker.uid});
 blocked=pick(blocked,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 if(blocked.pending?.kind==='life-trigger')blocked=pick(blocked,a=>a.mode==='skip');
 assert.equal(blocked.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(blocked.players[1].life.length,stayed);
 assertUniversalMatch(packs,blocked);
});

test('active Homura adds one purple only while she is active on the energy line',()=>{
 const counts=countsFor(['MMM-1-046']);
 let s=toPhase(fresh(counts,10054),'main');
 const body=put(s,0,'MMM-1-046','energy',0,true);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 body.ready=false;
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 const front=put(s,0,'MMM-1-046','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
});

test('Madoka draws one and must discard',()=>{
 const counts=countsFor(['MMM-1-047','MMM-1-049','MMM-1-006']);
 let s=toPhase(fresh(counts,10055),'main');
 purple(s,1);
 const before=s.players[0].deck.length;
 s=play(s,toHand(s,0,'MMM-1-047').uid);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 const payment=s.players[0].hand[0];
 s=pick(s,a=>a.uid===payment.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Madoka can send both looked cards outside',()=>{
 const counts=countsFor(['MMM-1-048','MMM-1-049','MMM-1-006','MMM-1-039']);
 let both=toPhase(fresh(counts,10056),'main');
 purple(both,1);
 const window=stackTop(both,0,['MMM-1-006','MMM-1-039']);
 readyAp(both,0,1);
 both=play(both,toHand(both,0,'MMM-1-048').uid);
 assert.equal(both.pending.kind,'effect-top-inspect-many');
 assert.equal(universalPrivateChoices(packs,both,1),null);
 assertHidden(both,window.map(c=>c.uid));
 both=pick(both,a=>a.uid===window[0].uid);
 assert.equal(both.pending.kind,'effect-top-inspect-many');
 both=pick(both,a=>a.uid===window[1].uid);
 assert.equal(both.pending,null);
 assert.equal(both.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.equal(both.players[0].outside.some(c=>c.uid===window[1].uid),true);
 assert.equal(both.players[0].deck.some(c=>window.some(x=>x.uid===c.uid)),false);

 let none=toPhase(fresh(counts,10057),'main');
 purple(none,1);
 const kept=stackTop(none,0,['MMM-1-006','MMM-1-039']);
 readyAp(none,0,1);
 none=play(none,toHand(none,0,'MMM-1-048').uid);
 none=pick(none,a=>a.type==='chooseInspectedOutside'&&a.uid==null);
 assert.equal(none.pending.kind,'effect-top-order');
 none=orderRest(none);
 assert.deepEqual(none.players[0].deck.slice(0,2).map(c=>c.uid).sort(),kept.map(c=>c.uid).sort());
 assertHidden(none,kept.map(c=>c.uid));

 let one=toPhase(fresh(counts,10058),'main');
 purple(one,1);
 const split=stackTop(one,0,['MMM-1-006','MMM-1-039']);
 readyAp(one,0,1);
 one=play(one,toHand(one,0,'MMM-1-048').uid);
 one=pick(one,a=>a.uid===split[0].uid);
 one=pick(one,a=>a.type==='chooseInspectedOutside'&&a.uid==null);
 assert.equal(one.pending.kind,'effect-top-order');
 one=orderRest(one);
 assert.equal(one.players[0].outside.some(c=>c.uid===split[0].uid),true);
 assert.equal(one.players[0].deck[0].uid,split[1].uid);
 assertHidden(one,[split[1].uid]);
 assertUniversalMatch(packs,one);
});

test('a soul gem may active two rested AP cards and the final trigger restores one life',()=>{
 const counts=countsFor(['MMM-1-030','MMM-1-031','MMM-1-025','MMM-1-006']);
 let gem=toPhase(fresh(counts,10059),'main');
 yellow(gem,2);
 readyAp(gem,0,3);
 gem.players[0].apCards[0].ready=false;
 gem.players[0].apCards[1].ready=false;
 gem=play(gem,toHand(gem,0,'MMM-1-030').uid,'event');
 assert.equal(gem.pending.kind,'effect-recover-ap');
 assert.equal(gem.pending.remaining,2);
 assert.equal(acts(gem).some(a=>a.uid==null),true);
 const first=gem.players[0].apCards[0];
 gem=pick(gem,a=>a.uid===first.uid);
 assert.equal(gem.players[0].apCards.find(c=>c.uid===first.uid).ready,true);
 assert.equal(gem.pending.kind,'effect-recover-ap');
 gem=pick(gem,a=>a.uid==null);
 assert.equal(gem.players[0].apCards[1].ready,false);
 assert.equal(gem.pending,null);
 const twin=toHand(gem,0,'MMM-1-031');
 readyAp(gem,0,2);
 gem.players[0].apCards[0].ready=false;
 gem=play(gem,twin.uid,'event');
 assert.equal(gem.pending.kind,'effect-recover-ap');
 const rested=gem.players[0].apCards.find(c=>c.uid===gem.players[0].apCards[0].uid);
 gem=pick(gem,a=>a.uid===rested.uid);
 gem=pick(gem,a=>a.uid==null);
 assert.equal(gem.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(gem.pending,null);

 let last=toPhase(fresh(counts,10060),'attack');
 const hitter=put(last,0,'MMM-1-006','front',0,true);
 const card=take(last,1,'MMM-1-030');
 last.players[1].deck.push(...last.players[1].life.splice(0));
 last.players[1].life.push(card);
 const recovered=last.players[1].deck[0];
 quietLife(last,0,1);
 last=use(last,{type:'attack',uid:hitter.uid});
 last=pick(last,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(last.pending.trigger,'final');
 last=pick(last,a=>a.mode==='final');
 assert.equal(last.players[1].life[0].uid,recovered.uid);
 assertUniversalMatch(packs,last);
});

test('each life kind in 026-050 resolves once',()=>{
 const counts=countsFor(['MMM-1-027','MMM-1-050','MMM-1-038','MMM-1-032','MMM-1-036',
  'MMM-1-037','MMM-1-039','MMM-1-006','MMM-1-025']);
 let got=toPhase(fresh(counts,10061),'attack');
 const swinger=put(got,0,'MMM-1-006','front',0,true);
 quietLife(got,1,1);
 const card=take(got,1,'MMM-1-027');
 got.players[1].life.unshift(card);
 got=use(got,{type:'attack',uid:swinger.uid});
 got=pick(got,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(got.pending.trigger,'get');
 got=pick(got,a=>a.mode==='get');
 assert.equal(got.players[1].hand.some(c=>c.uid===card.uid),true);

 let active=toPhase(fresh(counts,10062),'attack');
 const attacker=put(active,0,'MMM-1-006','front',0,true);
 const rested=put(active,1,'MMM-1-006','front',0,false);
 quietLife(active,1,1);
 const act=take(active,1,'MMM-1-050');
 active.players[1].life.unshift(act);
 active=use(active,{type:'attack',uid:attacker.uid});
 active=pick(active,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(active.pending.trigger,'active');
 active=pick(active,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(active,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,active,field(active,1,rested.uid)),4500);

 let draw=toPhase(fresh(counts,10063),'attack');
 const hitter=put(draw,0,'MMM-1-006','front',0,true);
 quietLife(draw,1,1);
 const drawn=take(draw,1,'MMM-1-038');
 draw.players[1].life.unshift(drawn);
 const hands=draw.players[1].hand.length;
 draw=use(draw,{type:'attack',uid:hitter.uid});
 draw=pick(draw,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(draw.pending.trigger,'draw');
 draw=pick(draw,a=>a.mode==='draw');
 assert.equal(draw.players[1].hand.length,hands+1);
 assert.equal(draw.players[1].outside.some(c=>c.uid===drawn.uid),true);

 let special=toPhase(fresh(counts,10064),'attack');
 const victim=put(special,0,'MMM-1-006','front',0,true);
 quietLife(special,1,1);
 const spell=take(special,1,'MMM-1-032');
 special.players[1].life.unshift(spell);
 special=use(special,{type:'attack',uid:victim.uid});
 special=pick(special,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(special.pending.trigger,'special');
 special=pick(special,a=>a.mode==='special'&&a.uid===victim.uid);
 assert.equal(special.players[0].outside.some(c=>c.uid===victim.uid),true);

 let raid=toPhase(fresh(counts,10065),'main');
 put(raid,1,'MMM-1-037','energy',0,true);
 put(raid,1,'MMM-1-037','energy',1,true);
 put(raid,1,'MMM-1-037','energy',2,true);
 const host=put(raid,1,'MMM-1-039','front',0,true);
 const opener=put(raid,0,'MMM-1-006','front',0,true);
 quietLife(raid,1,1);
 const flipped=take(raid,1,'MMM-1-036');
 raid.players[1].life.unshift(flipped);
 raid=toPhase(raid,'attack');
 raid=use(raid,{type:'attack',uid:opener.uid});
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(acts(raid).some(a=>a.mode==='get'),true);
 raid=pick(raid,a=>a.mode==='raid'&&a.baseUid===host.uid);
 assert.equal(field(raid,1,flipped.uid).ready,true);
 assert.equal(field(raid,1,flipped.uid).stack[0].uid,host.uid);
 assertUniversalMatch(packs,raid);
});

test('Devil Homura cuts 1000 only until this turn ends',()=>{
 const counts=countsFor(['MMM-1-035','MMM-1-049','MMM-1-006']);
 let s=toPhase(fresh(counts,10066),'attack');
 const body=put(s,0,'MMM-1-035','front',0,true);
 put(s,0,'MMM-1-049','energy',0,true);
 const foe=put(s,1,'MMM-1-006','front',0,true);
 quietLife(s,1,3);
 const before=universalBp(packs,s,foe);
 s=use(s,{type:'attack',uid:body.uid});
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,true);
 s=pick(s,a=>a.uid===foe.uid);
 assert.equal(universalBp(packs,s,field(s,1,foe.uid)),before-1000);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 if(s.pending?.kind==='life-trigger')s=pick(s,a=>a.mode==='skip');
 s=toSide(s,1,'main');
 assert.equal(universalBp(packs,s,field(s,1,foe.uid)),before);
 assertUniversalMatch(packs,s);
});

test('Madoka grants impact 1 only until this turn ends',()=>{
 const counts=countsFor(['MMM-1-049','MMM-1-006','MMM-1-038']);
 let s=toPhase(fresh(counts,10067),'main');
 purple(s,2);
 const ally=put(s,0,'MMM-1-006','front',0,true);
 const body=toHand(s,0,'MMM-1-049');
 readyAp(s,0,1);
 s=play(s,body.uid);
 s=use(s,acts(s).find(a=>a.mode==='entryOtherImpact'&&a.uid===body.uid));
 assert.equal(s.pending.optional,false);
 s=pick(s,a=>a.uid===ally.uid);
 assert.equal(field(s,0,ally.uid).impactGranted.turn,s.turn);
 quietLife(s,1,3);
 const wall=put(s,1,'MMM-1-038','front',0,true);
 wall.ready=true;
 s=toPhase(s,'attack');
 const life=s.players[1].life.length;
 s=use(s,{type:'attack',uid:ally.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 if(s.pending?.kind==='life-trigger')s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(s.players[1].life.length,life-1);
 s=toSide(s,1,'main');
 assert.equal(field(s,0,ally.uid).impactGranted,undefined);
 const later=put(s,1,'MMM-1-038','front',0,true);
 later.ready=true;
 field(s,0,ally.uid).ready=true;
 s=toSide(s,0,'attack');
 const again=s.players[1].life.length;
 s=use(s,{type:'attack',uid:ally.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===later.uid);
 if(s.pending?.kind==='life-trigger')s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[1].life.length,again);
 assertUniversalMatch(packs,s);
});
