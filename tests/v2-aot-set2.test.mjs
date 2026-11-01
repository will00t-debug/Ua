import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT2_CARDS} from '../dist/aot-vol2-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {aot2EngineKind} from '../dist/universal-v2/aot2-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {aotPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalImpact,
 universalPrivateChoices, universalPublicView}
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
 assert.equal(total,50,Object.entries(counts).map(([id,n])=>id+':'+n).join(','));
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
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function fromZone(s,p,id,zone){
 const pile=s.players[p][zone];
 const index=pile.findIndex(c=>c.cardId===id);
 if(index<0)throw Error('Missing '+id+' in '+zone);
 const card=pile.splice(index,1)[0];
 s.players[p].hand.push(card);
 return card;
}
function use(s,action){
 return dispatchUniversalAction(packs,s,action);
}
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
  if(++guard>14)throw Error('Did not reach '+player+' '+phase+' from '+s.active+' '+s.phase);
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
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play for '+uid);
 return use(s,action);
}
function cast(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event for '+uid);
 return use(s,action);
}
function pick(s,pred){
 const actions=legalUniversalActions(packs,s);
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
function redCorps(card){
 const d=pack.cards[card.cardId];
 const traits=[...(d.traits||[]),...(d.traitComponents||[])];
 return d.type==='character'&&d.color==='red'&&d.energy<=3&&d.ap===1&&traits.includes('104期兵');
}
function park(s,p,zones,pred){
 for(const zone of zones){
  const pile=s.players[p][zone];
  for(let i=pile.length-1;i>=0;i--)if(pred(pile[i]))s.players[p].removed.push(pile.splice(i,1)[0]);
 }
}
function clearWindow(s){
 let guard=0;
 while(s.pending&&['effect-top-filter-choice','effect-top-order','effect-discard'].includes(s.pending.kind)){
  if(s.pending.kind==='effect-top-filter-choice')s=pick(s,a=>a.uid===null);
  else s=pick(s,a=>true);
  if(++guard>8)throw Error('Search window did not close');
 }
 return s;
}

test('EX10BT registers 73 playable identities on the combined Attack on Titan pack',()=>{
 assert.equal(AOT2_CARDS.length,73);
 assert.deepEqual(AOT2_CARDS.map(c=>c.id),Array.from({length:73},(_,i)=>'AOT-2-'+String(i+1).padStart(3,'0')));
 assert.equal(AOT2_CARDS.some(c=>c.rarity==='AP'||/_p\d/.test(c.number)),false);
 assert.equal(Object.keys(pack.cards).length,186);
 assert.equal(pack.version,'aot-ua23-ex10-20261101');
 assert.equal(V2_TITLE_IDS.includes('aot'),false);
 const title=TITLES.find(t=>t.id==='aot');
 assert.equal(title.cards.length,186);
 assert.equal(title.cards.filter(c=>c.id.startsWith('AOT-2-')).length,73);
 const colors={},types={},triggers={},rarities={};
 const sentences=new Set();
 for(const card of AOT2_CARDS){
  assert.equal(aot2EngineKind(card.effectJa||'-'),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa);
  assert.equal(card.set,'EX10BT');
  colors[card.color]=(colors[card.color]||0)+1;
  types[card.type]=(types[card.type]||0)+1;
  triggers[card.trigger||'None']=(triggers[card.trigger||'None']||0)+1;
  rarities[card.rarity]=(rarities[card.rarity]||0)+1;
  sentences.add(card.effectJa||'-');
  if(card.traitComponents)assert.equal(card.traitComponents.join('／'),card.traits[0]);
  const shown=`${card.effect||''}${card.triggerText||''}`.replace(/［特徵：[^］]*］/g,'').replace(/・/g,'');
  assert.equal(/[\u3040-\u30ff]/.test(shown),false,card.id);
 }
 assert.deepEqual(colors,{yellow:37,blue:12,green:12,red:12});
 assert.deepEqual(types,{character:62,event:10,field:1});
 assert.deepEqual(triggers,{None:18,active:14,color:3,get:6,draw:16,raid:11,special:3,final:2});
 assert.deepEqual(rarities,{U:25,C:28,R:12,SR:8});
 assert.equal(sentences.size,66);
 const rumbling=AOT2_CARDS.find(c=>c.id==='AOT-2-034');
 assert.notEqual(rumbling.effect,AOT2_CARDS.find(c=>c.id==='AOT-2-032').effect);
 assert.match(rumbling.effect,/終尾的巨人/);
 assert.match(rumbling.effectJa,/終尾の巨人/);
 const practice=aotPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(Object.keys(practice.counts).every(id=>practice.pack.cards[id].color==='red'),true);
 const status=editorV2Status('aot',practice.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,186);
});

test('a ready Yelena generates 3 and a rested copy generates 2',()=>{
 const counts=countsFor(['AOT-2-001']);
 let s=toPhase(fresh(counts,2001),'main');
 const yelena=put(s,0,'AOT-2-001','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,yelena),3);
 yelena.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,yelena),2);
 assertUniversalMatch(packs,s);
});

test('Gabi buffs another character only after her own name makes four',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-005','AOT-2-006']);
 let quiet=toPhase(fresh(counts,2003),'main');
 put(quiet,0,'AOT-2-001','energy',0,true);
 put(quiet,0,'AOT-2-004','front',0,true);
 readyAp(quiet,0,1);
 quiet=play(quiet,toHand(quiet,0,'AOT-2-003').uid);
 assert.equal(quiet.pending,null);
 assertUniversalMatch(packs,quiet);

 let s=toPhase(fresh(counts,2004),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 const conny=put(s,0,'AOT-2-005','front',0,true);
 assert.equal(universalBp(packs,s,conny),2000);
 readyAp(s,0,1);
 s=play(s,toHand(s,0,'AOT-2-003').uid);
 assert.equal(s.pending.id,'AOT-2-003');
 assert.equal(s.pending.step,'buff');
 s=pick(s,a=>a.mode==='done');
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c?.uid===conny.uid)),3000);
 const jean=put(s,0,'AOT-2-006','front',2,true);
 assert.equal(universalBp(packs,s,jean),4000);
 assertUniversalMatch(packs,s);
});

test('Kiyomi bounces another energy-1 character, and herself when none qualifies',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-011']);
 let s=toPhase(fresh(counts,2005),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 const armin=put(s,0,'AOT-2-011','front',0,true);
 readyAp(s,0,1);
 const kiyomi=toHand(s,0,'AOT-2-004');
 s=play(s,kiyomi.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(armin.uid),true);
 assert.equal(s.pending.choices.includes(kiyomi.uid),false);
 s=pick(s,a=>a.uid===armin.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===armin.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===kiyomi.uid),true);
 assertUniversalMatch(packs,s);

 let alone=toPhase(fresh(counts,2006),'main');
 put(alone,0,'AOT-2-001','energy',0,true);
 readyAp(alone,0,1);
 const self=toHand(alone,0,'AOT-2-004');
 alone=play(alone,self.uid);
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].hand.some(c=>c.uid===self.uid),true);
 assertUniversalMatch(packs,alone);
});

test('Armin draws one and discards one',()=>{
 const counts=countsFor(['AOT-2-011']);
 let s=toPhase(fresh(counts,2011),'main');
 readyAp(s,0,1);
 const armin=toHand(s,0,'AOT-2-011');
 const before=s.players[0].hand.length;
 s=play(s,armin.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,before);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before-1);
 assertUniversalMatch(packs,s);
});

test('Mikasa gains Impact only at 1 life, and the name locks only after the entry succeeds',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-008']);
 let impact=toPhase(fresh(counts,2008),'main');
 const mikasa=put(impact,0,'AOT-2-008','front',0,true);
 setLife(impact,1,1);
 assert.equal(universalImpact(packs,impact,mikasa),1);
 setLife(impact,1,2);
 assert.equal(universalImpact(packs,impact,mikasa),0);
 assertUniversalMatch(packs,impact);

 let s=toPhase(fresh(counts,2009),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-003','energy',2,true);
 setLife(s,1,6);
 readyAp(s,0,2);
 const key='ミカサ・アッカーマン|AOT-2-008|onPlay';
 s=play(s,toHand(s,0,'AOT-2-008').uid);
 assert.equal(s.mainReadyOnceByName[0].includes(key),false);
 setLife(s,1,5);
 s=play(s,toHand(s,0,'AOT-2-008').uid);
 assert.equal(s.mainReadyOnceByName[0].includes(key),true);
 assertUniversalMatch(packs,s);
});

test('Levi gains 1000 during his own turn before the once-per-name main is paid',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-009']);
 let s=toPhase(fresh(counts,20091),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 const levi=put(s,0,'AOT-2-009','front',0,true);
 assert.equal(universalBp(packs,s,levi),5000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='aot2:AOT-2-009'),false);
 put(s,0,'AOT-2-005','front',1,true);
 readyAp(s,0,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='aot2:AOT-2-009'),true);
 levi.ready=false;
 s=use(s,{type:'activate',uid:levi.uid,mode:'aot2:AOT-2-009'});
 assert.equal(s.mainReadyOnceByName[0].includes('リヴァイ|AOT-2-009|main'),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='aot2:AOT-2-009'),false);
 s=pick(s,a=>a.mode==='one');
 s=pick(s,a=>a.mode==='double');
 const after=s.players[0].front.find(c=>c?.uid===levi.uid);
 assert.equal(after.ready,false);
 assert.equal(after.readyOnAttackGranted.turn,s.turn);
 assert.equal(universalBp(packs,s,after),5000);
 assertUniversalMatch(packs,s);

 let both=toPhase(fresh(counts,20092),'main');
 put(both,0,'AOT-2-001','energy',0,true);
 put(both,0,'AOT-2-004','energy',1,true);
 put(both,0,'AOT-2-005','front',1,true);
 const rested=put(both,0,'AOT-2-009','front',0,false);
 readyAp(both,0,1);
 both=use(both,{type:'activate',uid:rested.uid,mode:'aot2:AOT-2-009'});
 both=pick(both,a=>a.mode==='two');
 both=pick(both,a=>a.mode==='discard');
 const risen=both.players[0].front.find(c=>c?.uid===rested.uid);
 assert.equal(risen.ready,true);
 assert.equal(risen.readyOnAttackGranted.turn,both.turn);
 assert.equal(universalBp(packs,both,risen),5000);
 assertUniversalMatch(packs,both);
});

test('the Colossal Titans stack the front-line limit',()=>{
 const counts=countsFor(['AOT-2-013','AOT-2-069','AOT-2-001','AOT-2-005']);
 let s=toPhase(fresh(counts,2013),'main');
 put(s,0,'AOT-2-013','front',0,true);
 put(s,0,'AOT-2-069','front',1,true);
 const extra=put(s,0,'AOT-2-001','front',2,true);
 const extra2=put(s,0,'AOT-2-005','front',3,true);
 s=use(s,{type:'next'});
 assert.equal(s.players[0].aotFrontLimit,2);
 assert.equal(s.pending.id,'capacity');
 s=pick(s,a=>a.uid===extra.uid);
 assert.equal(s.pending.id,'capacity');
 s=pick(s,a=>a.uid===extra2.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.filter(Boolean).length,2);
 assert.equal(s.players[0].removed.filter(c=>c.uid===extra.uid||c.uid===extra2.uid).length,2);
 assertUniversalMatch(packs,s);
});

test('standing BP range raises the Thunder Spear ceiling and is not consumed',()=>{
 const counts=countsFor(['AOT-2-049','AOT-1-002','AOT-1-015','AOT-2-002','AOT-2-008','AOT-2-013','AOT-2-069']);
 let s=toPhase(fresh(counts,2049),'main');
 put(s,0,'AOT-1-002','energy',0,true);
 put(s,0,'AOT-1-015','energy',1,true);
 const mid=put(s,1,'AOT-2-002','front',0,true);
 const gap=put(s,1,'AOT-2-008','front',1,true);
 readyAp(s,0,4);
 const spear=toHand(s,0,'AOT-2-049');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===spear.uid),false);
 const huge=put(s,1,'AOT-2-013','front',2,true);
 s=cast(s,spear.uid);
 assert.equal(s.pending.id,'AOT-2-049');
 const first=legalUniversalActions(packs,s).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.deepEqual(first,[huge.uid]);
 s=pick(s,a=>a.uid===huge.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===huge.uid),true);

 put(s,0,'AOT-2-069','front',0,true);
 const again=toHand(s,0,'AOT-2-049');
 s=cast(s,again.uid);
 const second=legalUniversalActions(packs,s).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(second.includes(mid.uid),true);
 assert.equal(second.includes(gap.uid),false);
 s=pick(s,a=>a.uid===mid.uid);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='AOT-2-069'),true);

 const later=toHand(s,0,'AOT-2-049');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===later.uid),false);
 put(s,0,'AOT-2-069','front',1,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===later.uid),true);
 s=cast(s,later.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='retire'&&a.uid===gap.uid),true);
 assertUniversalMatch(packs,s);
});

test('Pieck stays private under Falco, and the opponent receives no identity',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-017']);
 let s=toPhase(fresh(counts,2017),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-005','energy',1,true);
 const buried=put(s,0,'AOT-2-004','front',0,true);
 readyAp(s,0,1);
 const falco=toHand(s,0,'AOT-2-017');
 s=play(s,falco.uid);
 assert.equal(s.pending.step,'tuck');
 const shown=universalPrivateChoices(packs,s,0);
 assert.equal(shown.options.some(o=>o.card?.cardId==='AOT-2-004'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=pick(s,a=>a.uid===buried.uid);
 s=pick(s,a=>a.mode==='done');
 const hidden=universalPublicView(packs,s,1).players[0].front.find(c=>c?.uid===falco.uid);
 assert.deepEqual(hidden.underLayers,[{faceDown:true}]);
 const own=universalPublicView(packs,s,0).players[0].front.find(c=>c?.uid===falco.uid);
 assert.equal(own.underLayers[0].cardId,'AOT-2-004');
 const host=s.players[0].front.find(c=>c?.uid===falco.uid);
 host.ready=true;
 s=use(s,{type:'activate',uid:falco.uid,mode:'aot2:AOT-2-017'});
 assert.equal(s.pending.step,'under');
 const looked=universalPrivateChoices(packs,s,0);
 assert.equal(looked.options.some(o=>o.card?.cardId==='AOT-2-004'),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assertUniversalMatch(packs,s);
});

test('Reiner taxes an opposing event until his next turn starts',()=>{
 const counts=countsFor(['AOT-2-001','AOT-2-004','AOT-2-005','AOT-2-019','AOT-1-060','AOT-1-045','AOT-1-066']);
 let poor=toPhase(fresh(counts,2019),'main');
 put(poor,0,'AOT-2-001','energy',0,true);
 put(poor,0,'AOT-2-004','energy',1,true);
 const small=put(poor,0,'AOT-2-005','front',0,true);
 readyAp(poor,0,1);
 const reiner=toHand(poor,0,'AOT-2-019');
 poor=play(poor,reiner.uid);
 assert.equal(universalBp(packs,poor,poor.players[0].front.find(c=>c?.uid===reiner.uid)),5000);
 assert.equal(universalImpact(packs,poor,poor.players[0].front.find(c=>c?.uid===reiner.uid)),1);
 assert.equal(poor.players[0].front.find(c=>c?.uid===reiner.uid).aot2SelectTax.untilOwnTurnStart>poor.players[0].ownTurns,true);
 poor=toSide(poor,1,'main');
 put(poor,1,'AOT-1-060','energy',0,true);
 put(poor,1,'AOT-1-045','front',0,true);
 readyAp(poor,1,1);
 poor=cast(poor,toHand(poor,1,'AOT-1-066').uid);
 const blocked=legalUniversalActions(packs,poor).filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(blocked.includes(reiner.uid),false);
 assert.equal(blocked.includes(small.uid),true);
 assertUniversalMatch(packs,poor);

 let paid=toPhase(fresh(counts,2020),'main');
 put(paid,0,'AOT-2-001','energy',0,true);
 put(paid,0,'AOT-2-004','energy',1,true);
 put(paid,0,'AOT-2-005','front',0,true);
 readyAp(paid,0,1);
 const taxed=toHand(paid,0,'AOT-2-019');
 paid=play(paid,taxed.uid);
 paid=toSide(paid,1,'main');
 put(paid,1,'AOT-1-060','energy',0,true);
 put(paid,1,'AOT-1-045','front',0,true);
 readyAp(paid,1,2);
 paid=cast(paid,toHand(paid,1,'AOT-1-066').uid);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.mode==='retire'&&a.uid===taxed.uid),true);
 paid=pick(paid,a=>a.uid===taxed.uid);
 assert.equal(paid.players[1].apCards.filter(c=>c.ready).length,0);
 assert.equal(paid.players[0].outside.some(c=>c.uid===taxed.uid),true);
 assertUniversalMatch(packs,paid);

 let expired=toPhase(fresh(counts,2021),'main');
 put(expired,0,'AOT-2-001','energy',0,true);
 put(expired,0,'AOT-2-004','energy',1,true);
 put(expired,0,'AOT-2-005','front',1,true);
 readyAp(expired,0,1);
 const lasting=toHand(expired,0,'AOT-2-019');
 expired=play(expired,lasting.uid);
 expired=toSide(expired,0,'start');
 const body=expired.players[0].front.find(c=>c?.uid===lasting.uid);
 assert.equal(body.aot2SelectTax,undefined);
 assert.equal(universalBp(packs,expired,body),4000);
 assert.equal(universalImpact(packs,expired,body),0);
 assertUniversalMatch(packs,expired);
});

test('Nicolo discounts only the next food card, and Sasha locks only after that use',()=>{
 const counts=countsFor(['AOT-2-062','AOT-2-065','AOT-2-073','AOT-2-011','AOT-1-069','AOT-1-070']);
 let s=toPhase(fresh(counts,2062),'main');
 put(s,0,'AOT-1-069','energy',0,true);
 put(s,0,'AOT-1-070','energy',1,true);
 readyAp(s,0,3);
 const key='サシャ・ブラウス|AOT-2-065|onPlay';
 s=play(s,toHand(s,0,'AOT-2-065').uid);
 assert.equal(s.mainReadyOnceByName[0].includes(key),false);
 s=play(s,toHand(s,0,'AOT-2-062').uid);
 assert.equal(s.players[0].aot2FoodAp.amount,1);
 s=play(s,toHand(s,0,'AOT-2-011').uid);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.players[0].aot2FoodAp.amount,1);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 const food=toHand(s,0,'AOT-2-073');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===food.uid),true);
 s=cast(s,food.uid);
 assert.equal(s.players[0].aot2FoodAp,null);
 s=pick(s,a=>a.mode==='one');
 s=pick(s,a=>a.mode==='done');
 readyAp(s,0,1);
 s=play(s,toHand(s,0,'AOT-2-065').uid);
 assert.equal(s.mainReadyOnceByName[0].includes(key),true);
 assertUniversalMatch(packs,s);
});

test('a corps return during the attack phase may replay Mikasa, and declining does not',()=>{
 const counts=countsFor(['AOT-1-099','AOT-2-070','AOT-2-066','AOT-1-069','AOT-2-062']);
 let declined=toPhase(fresh(counts,2066),'main');
 put(declined,0,'AOT-1-069','energy',0,true);
 put(declined,0,'AOT-2-062','energy',1,true);
 const eren=toHand(declined,0,'AOT-2-070');
 park(declined,0,['hand','deck'],c=>c.uid!==eren.uid&&redCorps(c));
 readyAp(declined,0,1);
 declined=cast(declined,toHand(declined,0,'AOT-1-099').uid);
 assert.equal(declined.pending.step,'corps');
 declined=pick(declined,a=>a.uid===eren.uid&&a.line==='front');
 declined=clearWindow(declined);
 if(declined.pending?.step==='corps')declined=pick(declined,a=>a.mode==='done');
 assert.equal(declined.pending,null);
 const replay=toHand(declined,0,'AOT-2-066');
 declined=use(declined,{type:'next'});
 declined=use(declined,{type:'next'});
 assert.equal(declined.phase,'attack');
 assert.equal(declined.pending.id,'AOT-2-066');
 assert.equal(declined.aot2CorpsReturned[0],declined.turn);
 assert.equal(declined.players[0].hand.some(c=>c.uid===eren.uid),true);
 declined=pick(declined,a=>a.mode==='done');
 assert.equal(declined.players[0].hand.some(c=>c.uid===replay.uid),true);
 assert.equal(declined.players[0].front.some(c=>c?.uid===replay.uid),false);
 assertUniversalMatch(packs,declined);

 let accepted=toPhase(fresh(counts,2067),'main');
 put(accepted,0,'AOT-1-069','energy',0,true);
 put(accepted,0,'AOT-2-062','energy',1,true);
 const soldier=toHand(accepted,0,'AOT-2-070');
 park(accepted,0,['hand','deck'],c=>c.uid!==soldier.uid&&redCorps(c));
 readyAp(accepted,0,1);
 accepted=cast(accepted,toHand(accepted,0,'AOT-1-099').uid);
 accepted=pick(accepted,a=>a.uid===soldier.uid&&a.line==='front');
 accepted=clearWindow(accepted);
 if(accepted.pending?.step==='corps')accepted=pick(accepted,a=>a.mode==='done');
 const first=toHand(accepted,0,'AOT-2-066');
 const second=fromZone(accepted,0,'AOT-2-066','removed');
 accepted=use(accepted,{type:'next'});
 accepted=use(accepted,{type:'next'});
 assert.equal(accepted.pending.id,'AOT-2-066');
 accepted=pick(accepted,a=>a.mode==='enter'&&a.uid===first.uid);
 const entered=accepted.players[0].front.find(c=>c?.uid===first.uid);
 assert.equal(!!entered,true);
 assert.equal(entered.ready,true);
 assert.equal(accepted.players[0].hand.some(c=>c.uid===second.uid),true);
 assertUniversalMatch(packs,accepted);
});

test('raid Mikasa ignores standing BP and still cannot be played from hand',()=>{
 const counts=countsFor(['AOT-2-066','AOT-2-067','AOT-2-069','AOT-1-069','AOT-1-010','AOT-1-061']);
 let low=toPhase(fresh(counts,2068),'main');
 put(low,0,'AOT-1-069','energy',0,true);
 const base=put(low,0,'AOT-2-066','front',0,true);
 put(low,0,'AOT-2-069','front',1,true);
 const small=put(low,1,'AOT-1-010','front',0,true);
 readyAp(low,0,1);
 const raider=toHand(low,0,'AOT-2-067');
 assert.equal(legalUniversalActions(packs,low).some(a=>a.type==='play'&&a.uid===raider.uid),false);
 assert.equal(legalUniversalActions(packs,low).some(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid),true);
 low=use(low,legalUniversalActions(packs,low).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid));
 assert.equal(low.pending.step,'mode');
 low=pick(low,a=>a.mode==='battle');
 assert.equal(low.pending.step,'mikasa');
 assert.ok(low.players[0].hand.length>=2);
 low=pick(low,a=>a.uid===small.uid);
 assert.equal(low.pending,null);
 assert.equal(low.players[1].front.some(c=>c?.uid===small.uid),true);
 assertUniversalMatch(packs,low);

 let high=toPhase(fresh(counts,2069),'main');
 put(high,0,'AOT-1-069','energy',0,true);
 const host=put(high,0,'AOT-2-066','front',0,true);
 put(high,0,'AOT-2-069','front',1,true);
 const armored=put(high,1,'AOT-1-061','front',0,true);
 readyAp(high,0,1);
 const copy=toHand(high,0,'AOT-2-067');
 high=use(high,legalUniversalActions(packs,high).find(a=>a.type==='raid'&&a.uid===copy.uid&&a.baseUid===host.uid));
 high=pick(high,a=>a.mode==='battle');
 assert.ok(high.players[0].hand.length>=2);
 high=pick(high,a=>a.uid===armored.uid);
 assert.equal(high.pending.step,'discard');
 high=pick(high,a=>a.mode==='discard');
 high=pick(high,a=>a.mode==='discard');
 assert.equal(high.players[1].outside.some(c=>c.uid===armored.uid),true);
 assertUniversalMatch(packs,high);
});

test('the Rumbling empties the hand, retires the printed window, and bans other attacks',()=>{
 const counts=countsFor(['AOT-2-034','AOT-2-001','AOT-2-003','AOT-2-004','AOT-2-070','AOT-1-045','AOT-2-022','AOT-2-005','AOT-2-013']);
 let s=toPhase(fresh(counts,2034),'main');
 put(s,0,'AOT-2-001','energy',0,true);
 put(s,0,'AOT-2-004','energy',1,true);
 put(s,0,'AOT-2-003','energy',2,true);
 put(s,0,'AOT-2-070','front',0,true);
 const eren=put(s,0,'AOT-2-022','front',1,true);
 const other=put(s,0,'AOT-2-005','front',2,true);
 put(s,0,'AOT-1-045','front',3,true);
 const low=put(s,1,'AOT-2-004','front',0,true);
 const tall=put(s,1,'AOT-2-013','front',1,true);
 readyAp(s,0,2);
 const event=toHand(s,0,'AOT-2-034');
 const spare=toHand(s,0,'AOT-2-001');
 park(s,0,['hand'],c=>c.uid!==event.uid&&c.uid!==spare.uid);
 assert.equal(s.players[0].hand.length,2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const third=toHand(s,0,'AOT-2-005');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 s=cast(s,event.uid);
 assert.equal(s.players[0].aot2AttackOnly.name,'エレン・イェーガー（終尾の巨人）');
 assert.equal(s.players[0].hand.length,0);
 assert.equal(s.players[1].front.some(c=>c?.uid===low.uid),false);
 assert.equal(s.players[1].front.some(c=>c?.uid===tall.uid),true);
 s=toPhase(s,'attack');
 const attacks=legalUniversalActions(packs,s).filter(a=>a.type==='attack').map(a=>a.uid);
 assert.equal(attacks.includes(eren.uid),true);
 assert.equal(attacks.includes(other.uid),false);
 assertUniversalMatch(packs,s);
});

test('Bertolt reduces only a red Colossal Titan raiding onto him',()=>{
 const counts=countsFor(['AOT-2-068','AOT-2-069','AOT-2-011','AOT-2-013','AOT-2-066','AOT-1-069','AOT-1-070','AOT-2-001','AOT-2-004','AOT-2-005']);
 let s=toPhase(fresh(counts,20681),'main');
 put(s,0,'AOT-1-069','energy',0,true);
 put(s,0,'AOT-1-070','energy',1,true);
 put(s,0,'AOT-2-066','energy',2,true);
 const host=put(s,0,'AOT-2-068','front',0,true);
 const other=put(s,0,'AOT-2-011','front',1,true);
 readyAp(s,0,1);
 const red=toHand(s,0,'AOT-2-069');
 const raids=legalUniversalActions(packs,s).filter(a=>a.type==='raid'&&a.uid===red.uid);
 assert.equal(raids.some(a=>a.baseUid===host.uid),true);
 assert.equal(raids.some(a=>a.baseUid===other.uid),false);
 s=use(s,raids.find(a=>a.baseUid===host.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===red.uid),true);
 assert.equal(s.players[0].hand.length>=3,true);
 assertUniversalMatch(packs,s);

 let yellow=toPhase(fresh(counts,20682),'main');
 put(yellow,0,'AOT-2-001','energy',0,true);
 put(yellow,0,'AOT-2-004','energy',1,true);
 put(yellow,0,'AOT-2-005','energy',2,true);
 const same=put(yellow,0,'AOT-2-068','front',0,true);
 readyAp(yellow,0,1);
 const colossal=toHand(yellow,0,'AOT-2-013');
 assert.equal(legalUniversalActions(packs,yellow).some(a=>a.type==='raid'&&a.uid===colossal.uid&&a.baseUid===same.uid),false);
 assertUniversalMatch(packs,yellow);
});

test('life cards stay hidden while Eren and the Attack Titan choose one',()=>{
 const counts=countsFor(['AOT-2-071','AOT-2-072','AOT-1-069','AOT-1-070','AOT-2-062']);
 let s=toPhase(fresh(counts,2071),'main');
 const eren=put(s,0,'AOT-2-071','front',0,true);
 const life=s.players[0].life[0];
 s=use(s,{type:'activate',uid:eren.uid,mode:'aot2:AOT-2-071'});
 assert.equal(s.pending.step,'life');
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(own.options.every(o=>o.card===null),true);
 assert.equal(own.options.some(o=>o.action.uid===life.uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,0).players[0].faceUpLife.length,0);
 s=pick(s,a=>a.uid===life.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===life.uid),true);
 assert.equal(universalImpact(packs,s,s.players[0].front.find(c=>c?.uid===eren.uid)),1);
 assertUniversalMatch(packs,s);

 let titan=toPhase(fresh(counts,2072),'main');
 put(titan,0,'AOT-1-069','energy',0,true);
 put(titan,0,'AOT-1-070','energy',1,true);
 put(titan,0,'AOT-2-062','energy',2,true);
 readyAp(titan,0,1);
 const hidden=titan.players[0].life[0];
 titan=play(titan,toHand(titan,0,'AOT-2-072').uid);
 assert.equal(universalBp(packs,titan,titan.players[0].front.find(c=>c?.cardId==='AOT-2-072')),5000);
 titan=pick(titan,a=>a.mode==='life');
 assert.equal(universalPrivateChoices(packs,titan,0).options.every(o=>o.card===null),true);
 assert.equal(universalPrivateChoices(packs,titan,1),null);
 titan=pick(titan,a=>a.uid===hidden.uid);
 assert.equal(titan.players[0].hand.some(c=>c.uid===hidden.uid),true);
 if(titan.pending?.step==='retire')titan=pick(titan,a=>a.mode==='done');
 assertUniversalMatch(packs,titan);
});
