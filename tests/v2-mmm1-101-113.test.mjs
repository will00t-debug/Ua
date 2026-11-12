import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalImpact, universalImpactNull,
 universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const ids=[...new Set(required)];
 const colors=new Set(ids.map(id=>pack.cards[id].color));
 const fillers=Object.values(pack.cards).filter(c=>!ids.includes(c.id)&&
  colors.has(c.color)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
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
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function bury(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const under=s.players[p].deck.pop();
 if(!under)throw Error('No deck card to place under '+card.cardId);
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function use(s,action,actor){
 return dispatchUniversalAction(packs,s,action,actor===undefined?undefined:{actor});
}
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
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function apReady(s,p=0){
 return s.players[p].apCards.filter(c=>c.inPlay&&c.ready).length;
}
function play(s,uid,kind='play',baseUid){
 const action=acts(s).find(a=>a.type===kind&&a.uid===uid&&!a.from&&
  (kind!=='play'||(a.line==='front'&&a.replaceUid===undefined))&&
  (kind!=='event'||a.targetUid===undefined)&&
  (kind!=='raid'||(a.baseUid===baseUid&&(a.line==null||a.line==='front'))));
 if(!action)throw Error('No '+kind+' for '+uid+' pending '+(s.pending?.kind||''));
 return use(s,action);
}
function pick(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+
  JSON.stringify(acts(s).slice(0,6)));
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
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.kind==='effect-top-order'||s.pending.step==='order')){
  s=pick(s,a=>true);
  if(++guard>8)throw Error('order stuck');
 }
 return s;
}
function openLife(counts,seed,id,hitter,backup,setup){
 let s=toPhase(fresh(counts,seed),'attack');
 const attacker=put(s,0,hitter,'front',0,true);
 if(setup)setup(s);
 setLife(s,1,[id,backup]);
 s=use(s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='block')s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.players[1].outside.some(c=>c.cardId===id),true);
 return s;
}
function finishTrigger(s){
 if(s.pending?.kind!=='life-trigger')return s;
 const preferred=['skip','get','draw','active','raid'];
 for(const mode of preferred){
  if(acts(s).some(a=>a.mode===mode&&(mode!=='active'&&mode!=='raid'||a.uid||a.baseUid)))
   return use(s,acts(s).find(a=>a.mode===mode));
 }
 throw Error('Unresolved life trigger '+s.pending.trigger);
}
function passUntil(s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending){
   if(s.pending.kind==='life-trigger')s=pick(s,a=>a.mode==='skip');
   else throw Error('Pending '+s.pending.kind+' at '+s.active+' '+s.phase);
  }else s=use(s,{type:'next'});
  if(++guard>40)throw Error('Stuck at '+s.active+' '+s.phase+' '+(s.pending?.kind||''));
 }
 return s;
}
function fuelRed(s,gen){
 if(gen===4){
  put(s,0,'MMM-1-105','energy',0);
  put(s,0,'MMM-1-105','energy',1);
 }else if(gen===3){
  put(s,0,'MMM-1-105','energy',0);
  put(s,0,'MMM-1-076','energy',1);
 }else put(s,0,'MMM-1-076','energy',0);
}

test('101-113 sibling triggers share one printed sentence',()=>{
 assert.equal(pack.cards['MMM-1-108'].triggerTextJa,pack.cards['MMM-1-102'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-110'].triggerTextJa,pack.cards['MMM-1-102'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-111'].triggerTextJa,pack.cards['MMM-1-109'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-112'].triggerTextJa,pack.cards['MMM-1-109'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-106'].triggerTextJa,pack.cards['MMM-1-105'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-113'].triggerTextJa,pack.cards['MMM-1-105'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-101'].trigger,null);
 assert.equal(pack.cards['MMM-1-103'].trigger,null);
 assert.deepEqual(pack.cards['MMM-1-107'].effects,{});
 assert.equal(pack.cards['MMM-1-107'].trigger,null);
 assert.equal(pack.cards['MMM-1-107'].mainAbility??null,null);
 assert.deepEqual(pack.cards['MMM-1-105'].effects,{});
 assert.equal(pack.cards['MMM-1-105'].trigger,'active');
 assert.equal(pack.cards['MMM-1-110'].effects.onPlay[0].op,'noteNextHandEventApCut');
 assert.equal(pack.cards['MMM-1-110'].mainAbility.op,'outsideEventDiscardActive');
});

test('life triggers on MMM-1-102, 104, 105 and 109 use the printed card',()=>{
 const gets=countsFor(['MMM-1-102','MMM-1-072']);
 let life=openLife(gets,13102,'MMM-1-102','MMM-1-072','MMM-1-072');
 assert.equal(life.pending.trigger,'get');
 assert.equal(acts(life).some(a=>a.mode==='draw'),false);
 const revealed=life.players[1].outside.find(c=>c.cardId==='MMM-1-102');
 life=pick(life,a=>a.mode==='get');
 assert.equal(life.pending,null);
 assert.ok(life.players[1].hand.some(c=>c.uid===revealed.uid));
 assertUniversalMatch(packs,life);

 const active=countsFor(['MMM-1-105','MMM-1-072']);
 let awoken=openLife(active,13105,'MMM-1-105','MMM-1-072','MMM-1-072',s=>{
  put(s,1,'MMM-1-072','front',1,false);
 });
 assert.equal(awoken.pending.trigger,'active');
 const rested=awoken.players[1].front[1];
 const before=universalBp(packs,awoken,rested);
 awoken=pick(awoken,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(awoken,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,awoken,field(awoken,1,rested.uid)),before+3000);
 assert.equal(awoken.pending,null);
 assertUniversalMatch(packs,awoken);

 const draw=countsFor(['MMM-1-109','MMM-1-105','MMM-1-072']);
 let drawn=openLife(draw,13109,'MMM-1-109','MMM-1-072','MMM-1-072');
 assert.equal(drawn.pending.trigger,'draw');
 const top=drawn.players[1].deck[0];
 const deck=drawn.players[1].deck.length;
 drawn=pick(drawn,a=>a.mode==='draw');
 assert.equal(drawn.players[1].deck.length,deck-1);
 assert.ok(drawn.players[1].hand.some(c=>c.uid===top.uid));
 assert.equal(drawn.pending,null);
 assertUniversalMatch(packs,drawn);

 const raid=countsFor(['MMM-1-104','MMM-1-105','MMM-1-076','MMM-1-072']);
 let raided=openLife(raid,13104,'MMM-1-104','MMM-1-072','MMM-1-072',s=>{
  put(s,1,'MMM-1-105','energy',0);
  put(s,1,'MMM-1-105','energy',1);
  put(s,1,'MMM-1-076','front',1,true);
  put(s,1,'MMM-1-072','energy',2,true);
 });
 const base=raided.players[1].front[1];
 assert.equal(raided.pending.trigger,'raid');
 assert.ok(acts(raided).some(a=>a.mode==='get'));
 assert.ok(acts(raided).some(a=>a.mode==='raid'&&a.baseUid===base.uid));
 assert.equal(acts(raided).some(a=>a.mode==='raid'&&a.baseUid===raided.players[1].energy[2].uid),false);
 raided=pick(raided,a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
 const topCard=raided.players[1].front.find(c=>c?.cardId==='MMM-1-104');
 assert.equal(topCard.ready,true);
 assert.equal(topCard.stack[0].uid,base.uid);
 assert.equal(raided.pending,null);
 assertUniversalMatch(packs,raided);
});

test('MMM-1-101 draws one and must discard one',()=>{
 const counts=countsFor(['MMM-1-101','MMM-1-076','MMM-1-072','MMM-1-107']);
 let s=toPhase(fresh(counts,13101),'main');
 fuelRed(s,1);
 const drawn=stackTop(s,0,['MMM-1-107'])[0];
 const spare=toHand(s,0,'MMM-1-072');
 const homura=toHand(s,0,'MMM-1-101');
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,homura.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn.uid));
 assert.equal(field(s,0,homura.uid).ready,false);
 assert.equal(acts(s).some(a=>a.type==='attack'&&a.uid===homura.uid),false);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===spare.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn.uid));
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('MMM-1-102 may decline the tuck, and the rest deploy is filtered',()=>{
 const counts=countsFor(['MMM-1-102','MMM-1-105','MMM-1-076','MMM-1-072','MMM-1-078','MMM-1-006','MMM-1-104','MMM-1-068']);
 let declined=toPhase(fresh(counts,13121),'main');
 fuelRed(declined,4);
 const madoka=put(declined,0,'MMM-1-076','front',0);
 const homura=toHand(declined,0,'MMM-1-102');
 const girl=toHand(declined,0,'MMM-1-072');
 readyAp(declined,0,1);
 const deck=declined.players[0].deck.length;
 declined=play(declined,homura.uid);
 assert.equal(declined.pending.kind,'effect-tuck-named');
 assert.equal(declined.pending.optional!==false,true);
 declined=pick(declined,a=>a.type==='chooseTuckNamed'&&a.uid===null);
 assert.equal(declined.pending,null);
 assert.equal(field(declined,0,madoka.uid).uid,madoka.uid);
 assert.equal(declined.players[0].deck.length,deck);
 assert.ok(declined.players[0].hand.some(c=>c.uid===girl.uid));
 assertUniversalMatch(packs,declined);

 let filtered=toPhase(fresh(counts,13122),'main');
 fuelRed(filtered,4);
 const base=put(filtered,0,'MMM-1-076','front',0);
 const source=toHand(filtered,0,'MMM-1-102');
 const legal=toHand(filtered,0,'MMM-1-072');
 const boundary=toHand(filtered,0,'MMM-1-104');
 const expensive=toHand(filtered,0,'MMM-1-078');
 const yellow=toHand(filtered,0,'MMM-1-006');
 const boy=toHand(filtered,0,'MMM-1-068');
 readyAp(filtered,0,1);
 const before=filtered.players[0].deck.length;
 filtered=play(filtered,source.uid);
 filtered=pick(filtered,a=>a.type==='chooseTuckNamed'&&a.uid===base.uid);
 assert.equal(filtered.players[0].deck.at(-1).uid,base.uid);
 assert.equal(filtered.players[0].deck.length,before);
 assert.equal(filtered.pending.kind,'effect-hand-girl-rest');
 assert.ok(filtered.pending.choices.includes(legal.uid));
 assert.ok(filtered.pending.choices.includes(boundary.uid));
 assert.equal(filtered.pending.choices.includes(expensive.uid),false);
 assert.equal(filtered.pending.choices.includes(yellow.uid),false);
 assert.equal(filtered.pending.choices.includes(boy.uid),false);
 assert.ok(acts(filtered).some(a=>a.type==='chooseHandGirlRest'&&a.uid===null));
 filtered=pick(filtered,a=>a.type==='chooseHandGirlRest'&&a.uid===null);
 assert.equal(filtered.pending,null);
 assert.ok(filtered.players[0].hand.some(c=>c.uid===legal.uid));
 assert.ok(filtered.players[0].hand.some(c=>c.uid===boundary.uid));
 assertUniversalMatch(packs,filtered);
});

test('MMM-1-103 shows the whole window, and declining adds nothing',()=>{
 const counts=countsFor(['MMM-1-103','MMM-1-076','MMM-1-072','MMM-1-014','MMM-1-109','MMM-1-068']);
 let s=toPhase(fresh(counts,13103),'main');
 fuelRed(s,1);
 const window=stackTop(s,0,['MMM-1-072','MMM-1-076','MMM-1-109','MMM-1-014']);
 const spare=toHand(s,0,'MMM-1-068');
 const madoka=toHand(s,0,'MMM-1-103');
 readyAp(s,0,1);
 s=play(s,madoka.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.ok(s.pending.choices.includes(window[0].uid));
 assert.ok(s.pending.choices.includes(window[3].uid));
 assert.equal(s.pending.choices.includes(window[1].uid),false);
 assert.equal(s.pending.choices.includes(window[2].uid),false);
 assertHidden(s,window.map(c=>c.uid));
 assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid),
  window.map(c=>c.uid));
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 s=orderRest(s);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>window.some(card=>card.uid===c.uid)),false);
 assert.equal(s.players[0].deck.at(-1).uid,window[3].uid);
 assertHidden(s,window.map(c=>c.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===spare.uid));
 assertUniversalMatch(packs,s);

 let taken=toPhase(fresh(counts,13113),'main');
 fuelRed(taken,1);
 const looked=stackTop(taken,0,['MMM-1-014','MMM-1-076','MMM-1-068','MMM-1-072']);
 const cost=toHand(taken,0,'MMM-1-109');
 const girl=toHand(taken,0,'MMM-1-103');
 readyAp(taken,0,1);
 taken=play(taken,girl.uid);
 assertHidden(taken,looked.map(c=>c.uid));
 taken=pick(taken,a=>a.type==='chooseTopFiltered'&&a.uid===looked[0].uid);
 taken=orderRest(taken);
 assert.equal(taken.pending.kind,'effect-discard');
 assert.equal(acts(taken).some(a=>a.uid===null),false);
 assert.ok(listedUids(universalPublicView(packs,taken,1)).has(looked[0].uid));
 assertHidden(taken,[looked[1].uid,looked[2].uid,looked[3].uid]);
 taken=pick(taken,a=>a.type==='chooseDiscard'&&a.uid===cost.uid);
 assert.ok(taken.players[0].hand.some(c=>c.uid===looked[0].uid));
 assert.ok(taken.players[0].outside.some(c=>c.uid===cost.uid));
 assert.equal(taken.pending,null);
 assertUniversalMatch(packs,taken);
});

test('MMM-1-104 raid text is silent until it is actually raided',()=>{
 const counts=countsFor(['MMM-1-104','MMM-1-105','MMM-1-072','MMM-1-076','MMM-1-087','MMM-1-107']);
 let ordinary=toPhase(fresh(counts,13141),'main');
 put(ordinary,0,'MMM-1-105','energy',0);
 put(ordinary,0,'MMM-1-072','energy',1);
 put(ordinary,0,'MMM-1-087','energy',2);
 put(ordinary,0,'MMM-1-076','energy',3);
 put(ordinary,0,'MMM-1-076','front',0);
 const played=toHand(ordinary,0,'MMM-1-104');
 readyAp(ordinary,0,1);
 ordinary=play(ordinary,played.uid);
 const entered=field(ordinary,0,played.uid);
 assert.equal(entered.ready,false);
 assert.equal((entered.stack||[]).length,0);
 assert.equal(universalBp(packs,ordinary,entered),4000);
 assert.equal(universalImpact(packs,ordinary,entered),0);
 assert.equal(ordinary.pending,null);
 assertUniversalMatch(packs,ordinary);

 let quiet=toPhase(fresh(counts,13142),'attack');
 const plain=put(quiet,0,'MMM-1-104','front',0,true);
 put(quiet,0,'MMM-1-105','energy',0);
 put(quiet,0,'MMM-1-072','energy',1);
 put(quiet,0,'MMM-1-087','energy',2);
 put(quiet,0,'MMM-1-076','energy',3);
 put(quiet,1,'MMM-1-072','front',0,true);
 assert.equal(universalBp(packs,quiet,plain),4000);
 assert.equal(universalImpact(packs,quiet,plain),0);
 const quietDeck=quiet.players[0].deck.length;
 quiet=use(quiet,{type:'attack',uid:plain.uid});
 assert.equal(quiet.pending.kind,'block');
 assert.equal(quiet.players[0].deck.length,quietDeck);
 quiet=pick(quiet,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(quiet.players[0].deck.length,quietDeck);
 quiet=finishTrigger(quiet);
 assert.equal(quiet.pending,null);
 assertUniversalMatch(packs,quiet);

 let struck=toPhase(fresh(counts,13143),'attack');
 const attacker=put(struck,0,'MMM-1-104','front',1,true);
 put(struck,0,'MMM-1-105','energy',0);
 put(struck,0,'MMM-1-072','energy',1);
 put(struck,0,'MMM-1-087','energy',2);
 put(struck,0,'MMM-1-076','energy',3);
 put(struck,0,'MMM-1-076','front',0);
 const wall=put(struck,1,'MMM-1-076','front',0,true);
 setLife(struck,1,['MMM-1-107','MMM-1-107']);
 struck=use(struck,{type:'attack',uid:attacker.uid});
 struck=pick(struck,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.ok(struck.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(struck.players[1].life.length,2);
 assert.equal(universalImpact(packs,struck,attacker),0);
 assertUniversalMatch(packs,struck);

 function raidOnto(seed,energyIds){
  let s=toPhase(fresh(counts,seed),'main');
  energyIds.forEach((id,slot)=>put(s,0,id,'energy',slot));
  const base=put(s,0,'MMM-1-076','front',0,true);
  const raider=toHand(s,0,'MMM-1-104');
  readyAp(s,0,1);
  s=play(s,raider.uid,'raid',base.uid);
  const top=field(s,0,raider.uid);
  assert.equal(top.ready,true);
  assert.equal(top.stack[0].uid,base.uid);
  assert.equal(s.pending,null);
  return {s,top};
 }
 let one=raidOnto(13144,['MMM-1-072','MMM-1-072','MMM-1-072','MMM-1-072']);
 assert.equal(universalBp(packs,one.s,one.top),4000);
 assert.equal(universalImpact(packs,one.s,one.top),0);
 one.s=toPhase(one.s,'attack');
 put(one.s,1,'MMM-1-072','front',0,true);
 const oneDeck=one.s.players[0].deck.length;
 one.s=use(one.s,{type:'attack',uid:one.top.uid});
 one.s=pick(one.s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(one.s.players[0].deck.length,oneDeck);
 one.s=finishTrigger(one.s);
 assert.equal(one.s.pending,null);
 assertUniversalMatch(packs,one.s);

 let two=raidOnto(13145,['MMM-1-105','MMM-1-105','MMM-1-076','MMM-1-076']);
 assert.equal(universalBp(packs,two.s,two.top),4000);
 assert.equal(universalImpact(packs,two.s,two.top),0);
 two.s=toPhase(two.s,'attack');
 put(two.s,1,'MMM-1-072','front',0,true);
 const twoDeck=two.s.players[0].deck.length;
 two.s=use(two.s,{type:'attack',uid:two.top.uid});
 assert.equal(two.s.pending.kind,'block');
 assert.equal(two.s.players[0].deck.length,twoDeck);
 two.s=pick(two.s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(two.s.players[0].deck.length,twoDeck-1);
 two.s=finishTrigger(two.s);
 assert.equal(two.s.pending,null);
 assertUniversalMatch(packs,two.s);

 let four=raidOnto(13146,['MMM-1-105','MMM-1-072','MMM-1-087','MMM-1-076']);
 assert.equal(universalBp(packs,four.s,four.top),5000);
 assert.equal(universalImpact(packs,four.s,four.top),1);
 four.s.active=1;
 assert.equal(universalBp(packs,four.s,four.top),4000);
 assert.equal(universalImpact(packs,four.s,four.top),0);
 four.s.active=0;
 assert.equal(universalBp(packs,four.s,four.top),5000);
 four.s=toPhase(four.s,'attack');
 const victim=put(four.s,1,'MMM-1-076','front',0,true);
 setLife(four.s,1,['MMM-1-107','MMM-1-107']);
 four.s=use(four.s,{type:'attack',uid:four.top.uid});
 four.s=pick(four.s,a=>a.type==='chooseBlock'&&a.uid===victim.uid);
 assert.ok(four.s.players[1].outside.some(c=>c.uid===victim.uid));
 assert.equal(four.s.players[1].life.length,1);
 assert.equal(four.s.pending,null);
 assertUniversalMatch(packs,four.s);
});

test('MMM-1-106 enters active, draws two, and retires at the next own start',()=>{
 const counts=countsFor(['MMM-1-106','MMM-1-105','MMM-1-076','MMM-1-107','MMM-1-072']);
 let s=toPhase(fresh(counts,13106),'main');
 fuelRed(s,3);
 const drawn=stackTop(s,0,['MMM-1-107','MMM-1-072']);
 const mami=toHand(s,0,'MMM-1-106');
 readyAp(s,0,2);
 const deck=s.players[0].deck.length;
 s=play(s,mami.uid);
 const entered=field(s,0,mami.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.players[0].deck.length,deck-2);
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn[0].uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn[1].uid));
 assert.equal(s.pending,null);
 s=toPhase(s,'attack');
 assert.ok(acts(s).some(a=>a.type==='attack'&&a.uid===mami.uid));
 s=passUntil(s,state=>state.active===1&&state.phase==='start');
 assert.ok(field(s,0,mami.uid));
 s=passUntil(s,state=>state.active===0&&state.phase==='start'&&
  state.players[0].outside.some(c=>c.uid===mami.uid));
 assert.equal(field(s,0,mami.uid),null);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('MMM-1-109 may add none, and the unchosen window stays private',()=>{
 const counts=countsFor(['MMM-1-109','MMM-1-105','MMM-1-072','MMM-1-076','MMM-1-014','MMM-1-029','MMM-1-068']);
 let none=toPhase(fresh(counts,13119),'main');
 fuelRed(none,4);
 const window=stackTop(none,0,['MMM-1-072','MMM-1-076','MMM-1-014','MMM-1-029','MMM-1-068']);
 const event=toHand(none,0,'MMM-1-109');
 readyAp(none,0,1);
 none=play(none,event.uid,'event');
 assert.equal(none.pending.kind,'effect-top-filter-many-choice');
 assert.equal(none.pending.max,3);
 assert.deepEqual(none.pending.uids,window.map(c=>c.uid));
 assert.equal(none.pending.choices.includes(window[3].uid),false);
 assert.equal(none.pending.choices.includes(window[4].uid),false);
 assert.ok(none.pending.choices.includes(window[0].uid));
 assertHidden(none,window.map(c=>c.uid));
 none=pick(none,a=>a.type==='chooseTopFilteredMany'&&a.uid===null);
 none=orderRest(none);
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.some(c=>window.some(card=>card.uid===c.uid)),false);
 assert.equal(none.players[0].deck.at(-1).uid,window[4].uid);
 assertHidden(none,window.map(c=>c.uid));
 assertUniversalMatch(packs,none);

 let early=toPhase(fresh(counts,13129),'main');
 fuelRed(early,4);
 const looked=stackTop(early,0,['MMM-1-072','MMM-1-072','MMM-1-076','MMM-1-014','MMM-1-068']);
 const spell=toHand(early,0,'MMM-1-109');
 readyAp(early,0,1);
 early=play(early,spell.uid,'event');
 early=pick(early,a=>a.type==='chooseTopFilteredMany'&&a.uid===looked[0].uid);
 assert.equal(acts(early).some(a=>a.uid===looked[1].uid),false);
 assert.ok(listedUids(universalPublicView(packs,early,1)).has(looked[0].uid));
 assertHidden(early,[looked[1].uid,looked[2].uid,looked[3].uid,looked[4].uid]);
 early=pick(early,a=>a.type==='chooseTopFilteredMany'&&a.uid===null);
 early=orderRest(early);
 assert.equal(early.pending,null);
 assert.ok(early.players[0].hand.some(c=>c.uid===looked[0].uid));
 assert.equal(early.players[0].hand.some(c=>c.uid===looked[2].uid),false);
 assertHidden(early,[looked[1].uid,looked[2].uid,looked[3].uid,looked[4].uid]);
 assertUniversalMatch(packs,early);
});

test('MMM-1-110 on-play and main work on an ordinary entry',()=>{
 const counts=countsFor(['MMM-1-110','MMM-1-011','MMM-1-006','MMM-1-014','MMM-1-029','MMM-1-034','MMM-1-009']);
 let s=toPhase(fresh(counts,13110),'main');
 put(s,0,'MMM-1-011','energy',0);
 put(s,0,'MMM-1-011','energy',1);
 const ally=put(s,0,'MMM-1-006','front',0,false);
 const outside=[];
 for(let i=0;i<2;i++)outside.push(take(s,0,'MMM-1-034'));
 for(let i=0;i<3;i++)outside.push(take(s,0,'MMM-1-029'));
 s.players[0].outside.push(...outside);
 const sixth=take(s,0,'MMM-1-034');
 const extra=take(s,0,'MMM-1-034');
 s.players[0].hand.push(sixth);
 s.players[0].deck.push(extra);
 const mami=toHand(s,0,'MMM-1-110');
 readyAp(s,0,2);
 s=play(s,mami.uid);
 assert.equal((field(s,0,mami.uid).stack||[]).length,0);
 assert.equal(s.players[0].nextHandEventApCut.amount,1);
 assert.equal(s.players[0].nextHandEventApCut.maxEnergy,3);
 assert.equal(acts(s).some(a=>a.mode==='outsideActive'),false);
 s.players[0].deck.pop();
 s.players[0].outside.push(extra);
 const action=acts(s).find(a=>a.mode==='outsideActive'&&a.discardUid===sixth.uid);
 assert.ok(action);
 s=use(s,action);
 assert.ok(s.players[0].outside.some(c=>c.uid===sixth.uid));
 assert.equal(s.pending.kind,'effect-mami-active');
 assert.equal(acts(s).some(a=>a.uid===null),false);
 assert.equal(acts(s).some(a=>a.uid===mami.uid),false);
 assert.ok(acts(s).some(a=>a.type==='chooseMamiActive'&&a.uid===ally.uid));
 s=pick(s,a=>a.type==='chooseMamiActive'&&a.uid===ally.uid);
 assert.equal(field(s,0,ally.uid).ready,true);
 assert.equal(acts(s).some(a=>a.uid===mami.uid&&a.mode==='outsideActive'),false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let raided=toPhase(fresh(counts,13112),'main');
 put(raided,0,'MMM-1-011','energy',0);
 put(raided,0,'MMM-1-011','energy',1);
 const base=put(raided,0,'MMM-1-014','front',0,true);
 const top=toHand(raided,0,'MMM-1-110');
 readyAp(raided,0,1);
 raided=play(raided,top.uid,'raid',base.uid);
 assert.equal(field(raided,0,top.uid).ready,true);
 assert.equal(field(raided,0,top.uid).stack[0].uid,base.uid);
 assert.equal(raided.players[0].nextHandEventApCut.amount,1);
 assert.equal(raided.pending,null);
 assertUniversalMatch(packs,raided);

 let cut=toPhase(fresh(counts,13114),'main');
 put(cut,0,'MMM-1-011','energy',0);
 put(cut,0,'MMM-1-011','energy',1);
 const girl=toHand(cut,0,'MMM-1-009');
 const expensive=toHand(cut,0,'MMM-1-029');
 const cheap=toHand(cut,0,'MMM-1-034');
 const source=toHand(cut,0,'MMM-1-110');
 readyAp(cut,0,3);
 cut=play(cut,source.uid);
 assert.equal(cut.players[0].nextHandEventApCut.amount,1);
 cut=play(cut,girl.uid);
 assert.equal(cut.players[0].nextHandEventApCut.amount,1);
 const beforeExpensive=apReady(cut);
 cut=play(cut,expensive.uid,'event');
 assert.equal(apReady(cut),beforeExpensive-1);
 assert.equal(cut.players[0].nextHandEventApCut.amount,1);
 const cheapAction=acts(cut).find(a=>a.type==='event'&&a.uid===cheap.uid);
 const beforeCheap=apReady(cut);
 cut=use(cut,cheapAction);
 assert.equal(apReady(cut),beforeCheap);
 assert.equal(cut.players[0].nextHandEventApCut,null);
 if(cut.pending?.kind==='effect-discard')
  cut=pick(cut,a=>a.type==='chooseDiscard'&&a.uid===cut.players[0].hand[0].uid);
 assert.equal(cut.pending,null);
 cut=passUntil(cut,state=>state.active===1&&state.phase==='start');
 assert.equal(cut.players[0].nextHandEventApCut,null);
 assertUniversalMatch(packs,cut);
});

test('MMM-1-111 loses the opponent impact and actives another only from removed',()=>{
 const counts=countsFor(['MMM-1-111','MMM-1-002','MMM-1-011','MMM-1-006','MMM-1-090','MMM-1-087','MMM-1-076','MMM-1-107']);
 let hand=toPhase(fresh(counts,13111),'main');
 put(hand,0,'MMM-1-011','energy',0);
 put(hand,0,'MMM-1-011','energy',1);
 const fromHand=toHand(hand,0,'MMM-1-111');
 readyAp(hand,0,1);
 hand=play(hand,fromHand.uid);
 assert.equal(hand.pending,null);
 assert.equal(field(hand,0,fromHand.uid).ready,false);
 assert.equal(universalImpactNull(packs,hand,field(hand,0,fromHand.uid)),true);
 assertUniversalMatch(packs,hand);

 let closed=toPhase(fresh(counts,13115),'main');
 put(closed,0,'MMM-1-011','energy',0);
 put(closed,0,'MMM-1-011','energy',1);
 const bare=put(closed,0,'MMM-1-002','front',0,true);
 const denied=take(closed,0,'MMM-1-111');
 closed.players[0].removed.push(denied);
 readyAp(closed,0,1);
 assert.equal(acts(closed).some(a=>a.uid===denied.uid&&a.from==='removed'),false);
 bury(closed,0,bare);
 const rested=put(closed,0,'MMM-1-006','front',1,false);
 const action=acts(closed).find(a=>a.type==='play'&&a.uid===denied.uid&&
  a.from==='removed'&&a.line==='front');
 assert.ok(action);
 let opened=use(closed,action);
 assert.equal(opened.pending.kind,'effect-active-own-other');
 assert.equal(opened.pending.optional,true);
 assert.ok(acts(opened).some(a=>a.type==='chooseActiveOwnOther'&&a.uid===null));
 assert.ok(acts(opened).some(a=>a.uid===rested.uid));
 assert.ok(acts(opened).some(a=>a.uid===bare.uid));
 assert.equal(acts(opened).some(a=>a.uid===denied.uid),false);
 opened=pick(opened,a=>a.type==='chooseActiveOwnOther'&&a.uid===null);
 assert.equal(field(opened,0,rested.uid).ready,false);
 assert.equal(opened.pending,null);
 assertUniversalMatch(packs,opened);

 let accepted=toPhase(fresh(counts,13116),'main');
 put(accepted,0,'MMM-1-011','energy',0);
 put(accepted,0,'MMM-1-011','energy',1);
 const permission=put(accepted,0,'MMM-1-002','front',0,true);
 bury(accepted,0,permission);
 const ally=put(accepted,0,'MMM-1-006','front',1,false);
 const removed=take(accepted,0,'MMM-1-111');
 accepted.players[0].removed.push(removed);
 readyAp(accepted,0,1);
 accepted=use(accepted,acts(accepted).find(a=>a.type==='play'&&a.uid===removed.uid&&
  a.from==='removed'&&a.line==='front'));
 accepted=pick(accepted,a=>a.type==='chooseActiveOwnOther'&&a.uid===ally.uid);
 assert.equal(field(accepted,0,ally.uid).ready,true);
 assert.equal(field(accepted,0,removed.uid).ready,false);
 assert.equal(accepted.pending,null);
 assertUniversalMatch(packs,accepted);

 let battle=toPhase(fresh(counts,13117),'main');
 put(battle,0,'MMM-1-076','energy',0);
 put(battle,0,'MMM-1-076','energy',1);
 put(battle,0,'MMM-1-076','energy',2);
 put(battle,0,'MMM-1-076','energy',3);
 const sayakaBase=put(battle,0,'MMM-1-087','front',0,true);
 const raider=toHand(battle,0,'MMM-1-090');
 readyAp(battle,0,1);
 battle=play(battle,raider.uid,'raid',sayakaBase.uid);
 const striker=field(battle,0,raider.uid);
 assert.equal(universalImpact(packs,battle,striker),1);
 const wall=put(battle,1,'MMM-1-111','front',0,true);
 setLife(battle,1,['MMM-1-107','MMM-1-107']);
 assert.equal(universalImpactNull(packs,battle,wall),true);
 battle=toPhase(battle,'attack');
 battle=use(battle,{type:'attack',uid:striker.uid});
 battle=pick(battle,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(battle.players[1].life.length,2);
 assert.ok(battle.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(battle.pending,null);
 assertUniversalMatch(packs,battle);
});

test('MMM-1-112 may return a yellow Madoka of energy 2 or less, or none',()=>{
 const counts=countsFor(['MMM-1-112','MMM-1-078','MMM-1-006','MMM-1-047']);
 let s=toPhase(fresh(counts,13112),'attack');
 const wall=put(s,1,'MMM-1-112','front',0,true);
 const yellow=take(s,1,'MMM-1-006');
 const purple=take(s,1,'MMM-1-047');
 const high=take(s,1,'MMM-1-078');
 s.players[1].outside.push(yellow,purple,high);
 const striker=put(s,0,'MMM-1-078','front',0,true);
 assert.ok(universalBp(packs,s,striker)>=universalBp(packs,s,wall));
 s=use(s,{type:'attack',uid:striker.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.optional,true);
 assert.ok(s.pending.choices.includes(yellow.uid));
 assert.ok(s.pending.choices.includes(purple.uid));
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.ok(acts(s).some(a=>a.type==='chooseOutsideRecovery'&&a.uid===null));
 s=pick(s,a=>a.type==='chooseOutsideRecovery'&&a.uid===null);
 assert.ok(s.players[1].outside.some(c=>c.uid===yellow.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===purple.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let taken=toPhase(fresh(counts,13118),'attack');
 const blocker=put(taken,1,'MMM-1-112','front',0,true);
 const back=take(taken,1,'MMM-1-006');
 taken.players[1].outside.push(back);
 const attacker=put(taken,0,'MMM-1-078','front',0,true);
 taken=use(taken,{type:'attack',uid:attacker.uid});
 taken=pick(taken,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 taken=pick(taken,a=>a.type==='chooseOutsideRecovery'&&a.uid===back.uid);
 assert.ok(taken.players[1].hand.some(c=>c.uid===back.uid));
 assert.ok(taken.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(taken.pending,null);
 assertUniversalMatch(packs,taken);
});

test('MMM-1-113 gains 500 BP only while four other own quintet are on the field',()=>{
 const counts=countsFor(['MMM-1-113','MMM-1-045','MMM-1-047','MMM-1-050','MMM-1-053']);
 let s=fresh(counts,13113);
 const kyoko=put(s,0,'MMM-1-113','front',0,true);
 assert.equal(universalBp(packs,s,kyoko),2500);
 put(s,0,'MMM-1-045','energy',0);
 put(s,0,'MMM-1-047','energy',1);
 put(s,0,'MMM-1-050','front',1);
 assert.equal(universalBp(packs,s,kyoko),2500);
 const fourth=put(s,0,'MMM-1-053','energy',2);
 assert.equal(universalBp(packs,s,kyoko),3000);
 s.active=1;
 assert.equal(universalBp(packs,s,kyoko),3000);
 s.active=0;
 s.players[0].energy[2]=null;
 s.players[0].hand.push(fourth);
 assert.equal(universalBp(packs,s,kyoko),2500);
 put(s,1,'MMM-1-045','front',0);
 put(s,1,'MMM-1-047','front',1);
 put(s,1,'MMM-1-050','energy',0);
 put(s,1,'MMM-1-053','energy',1);
 assert.equal(universalBp(packs,s,kyoko),2500);
 assertUniversalMatch(packs,s);

 let played=toPhase(fresh(counts,13123),'main');
 put(played,0,'MMM-1-053','energy',0);
 const entering=toHand(played,0,'MMM-1-113');
 readyAp(played,0,1);
 played=play(played,entering.uid);
 const copy=field(played,0,entering.uid);
 assert.equal(copy.ready,false);
 assert.equal(played.pending,null);
 assert.equal(universalBp(packs,played,copy),2500);
 assert.equal(acts(played).some(a=>a.type==='activate'&&a.uid===copy.uid),false);
 assertUniversalMatch(packs,played);
});
