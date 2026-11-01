import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {aotEngineKind} from '../dist/universal-v2/aot-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {aotPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
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
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
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
function use(s,action){
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function cast(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event for '+uid);
 return use(s,action);
}
function stackRaid(s,p,topId,underId,line,slot){
 const top=put(s,p,topId,line,slot,true);
 const under=take(s,p,underId);
 under.faceDown=false;
 under.ready=false;
 top.stack=[under];
 return top;
}

test('UA23BT and UA23ST register 113 playable identities outside the five-title census',()=>{
 assert.equal(AOT_CARDS.length,113);
 assert.deepEqual(AOT_CARDS.map(c=>c.id),Array.from({length:113},(_,i)=>'AOT-1-'+String(i+1).padStart(3,'0')));
 assert.equal(AOT_CARDS.some(c=>c.rarity==='AP'||/_p\d/.test(c.number)),false);
 assert.equal(Object.keys(pack.cards).length,186);
 assert.equal(pack.version,'aot-ua23-ex10-20261101');
 assert.equal(pack.id,'aot');
 assert.equal(V2_TITLE_IDS.includes('aot'),false);
 const colors={blue:0,green:0,red:0};
 const triggers={};
 for(const card of AOT_CARDS){
  assert.equal(aotEngineKind(card.effectJa||'-'),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa);
  colors[card.color]++;
  triggers[card.trigger||'None']=(triggers[card.trigger||'None']||0)+1;
  if(card.traitComponents){
   assert.equal(card.traitComponents.join('／'),card.traits[0]);
   assert.ok(card.traitComponents.length===2||card.traitComponents.length===3);
  }
  const shown=`${card.effect||''}${card.triggerText||''}`.replace(/［特徵：[^］]*］/g,'').replace(/・/g,'');
  assert.equal(/[\u3040-\u30ff]/.test(shown),false,card.id);
  if(card.effectJa)assert.ok(card.effect.length>0,card.id);
 }
 assert.deepEqual(colors,{blue:36,green:35,red:42});
 assert.equal(AOT_CARDS.filter(c=>c.traitComponents).length,59);
 assert.deepEqual(triggers,{active:23,None:31,get:16,color:6,raid:12,draw:15,final:3,special:7});
 const merged=['068','070','075','084','085','087','090','091','097'];
 for(const n of merged){
  const card=AOT_CARDS.find(c=>c.id==='AOT-1-'+n);
  assert.deepEqual(card.sets,['UA23BT','UA23ST']);
  assert.equal(card.printings.some(p=>p.set==='UA23BT'&&p.image.includes('UA23BT')),true);
  assert.equal(card.printings.some(p=>p.set==='UA23ST'&&p.image.includes('UA23ST')),true);
 }
 assert.deepEqual(AOT_CARDS.filter(c=>c.sets.length===1&&c.sets[0]==='UA23ST').map(c=>c.id),
  Array.from({length:13},(_,i)=>'AOT-1-'+String(101+i).padStart(3,'0')));
 assert.equal(pack.cards['AOT-1-001'].name,'エルヴィン・スミス');
 assert.equal(AOT_CARDS.find(c=>c.id==='AOT-1-001').name,'艾爾文·史密斯');
 assert.equal(pack.cards['AOT-1-057'].raidAttackDamage,3);
 assert.equal(pack.cards['AOT-1-038'].raidAttackDamage,0);
 assert.equal(pack.cards['AOT-1-038'].raidOwnTurnBp,2000);
 assert.equal(pack.cards['AOT-1-113'].energyLineForbidden,true);
 assert.equal(pack.cards['AOT-1-004'].aotHook,true);
 assert.equal(pack.cards['AOT-1-032'].type,'event');
 const practice=aotPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(Object.keys(practice.counts).every(id=>practice.pack.cards[id].color==='red'),true);
 const status=editorV2Status('aot',practice.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,186);
});

test('outside events scale Mikasa energy and BP, and Ymir on the field raises Historia',()=>{
 const counts=countsFor(['AOT-1-024','AOT-1-021','AOT-1-013','AOT-1-032']);
 let s=toPhase(fresh(counts,24024),'main');
 const mikasa=put(s,0,'AOT-1-024','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,mikasa),2);
 assert.equal(universalBp(packs,s,mikasa),3000);
 for(let i=0;i<4;i++)s.players[0].outside.push(take(s,0,'AOT-1-032'));
 assert.equal(universalCardEnergy(packs,s,0,mikasa),3);
 assert.equal(universalBp(packs,s,mikasa),4000);
 const historia=put(s,0,'AOT-1-021','front',1,true);
 assert.equal(universalBp(packs,s,historia),2500);
 put(s,0,'AOT-1-013','energy',1,true);
 assert.equal(universalBp(packs,s,historia),3000);
 assertUniversalMatch(packs,s);
});

test('Zeke discounts off-field energy and a raided copy buffs pure titans',()=>{
 const counts=countsFor(['AOT-1-048','AOT-1-040','AOT-1-045']);
 let s=toPhase(fresh(counts,24048),'main');
 const zeke=pack.cards['AOT-1-048'];
 assert.equal(zoneRequiredEnergy(packs,s,0,zeke,'hand'),7);
 put(s,0,'AOT-1-040','front',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,zeke,'hand'),6);
 assert.equal(zoneRequiredEnergy(packs,s,0,zeke,'outside'),6);
 assert.equal(zoneRequiredEnergy(packs,s,0,zeke,'field'),7);
 const titan=s.players[0].front[0];
 assert.equal(universalBp(packs,s,titan),pack.cards['AOT-1-040'].bp);
 stackRaid(s,0,'AOT-1-048','AOT-1-045','front',1);
 assert.equal(universalBp(packs,s,titan),pack.cards['AOT-1-040'].bp+1000);
 assertUniversalMatch(packs,s);
});

test('basement key and an Eren name change the printed hand costs',()=>{
 const counts=countsFor(['AOT-1-095','AOT-1-098','AOT-1-096','AOT-1-090']);
 let s=toPhase(fresh(counts,24095),'main');
 const field=pack.cards['AOT-1-095'];
 assert.equal(zoneRequiredEnergy(packs,s,0,field,'hand'),6);
 s.players[0].outside.push(take(s,0,'AOT-1-098'));
 assert.equal(zoneRequiredEnergy(packs,s,0,field,'hand'),4);
 put(s,0,'AOT-1-095','energy',0,true);
 readyAp(s,0,1);
 const punch=toHand(s,0,'AOT-1-096');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===punch.uid),false);
 put(s,0,'AOT-1-090','front',0,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===punch.uid),true);
 assertUniversalMatch(packs,s);
});

test('paying AP during this attack phase gives Eld +2000',()=>{
 const counts=countsFor(['AOT-1-004','AOT-1-008','AOT-1-002']);
 let s=toPhase(fresh(counts,24004),'attack');
 const eld=put(s,0,'AOT-1-004','front',0,true);
 const levi=put(s,0,'AOT-1-008','front',1,true);
 assert.equal(universalBp(packs,s,eld),1500);
 readyAp(s);
 s=use(s,{type:'attack',uid:levi.uid});
 assert.equal(s.pending.step,'pay');
 s=use(s,legalUniversalActions(packs,s).find(a=>a.mode==='pay'));
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c?.uid===eld.uid)),3500);
 assertUniversalMatch(packs,s);
});

test('Bertolt deals 3 while raided, and Rod deals 2 only while an enemy is ready',()=>{
 const counts=countsFor(['AOT-1-057','AOT-1-054','AOT-1-038','AOT-1-037','AOT-1-001']);
 let s=toPhase(fresh(counts,24057),'attack');
 const bert=stackRaid(s,0,'AOT-1-057','AOT-1-054','front',0);
 const rod=stackRaid(s,0,'AOT-1-038','AOT-1-037','front',1);
 const wall=put(s,1,'AOT-1-001','front',0,true);
 assert.equal(universalAttackDamage(packs,s,bert),3);
 assert.equal(universalAttackDamage(packs,s,rod),2);
 assert.equal(universalBp(packs,s,rod),6000);
 wall.ready=false;
 assert.equal(universalAttackDamage(packs,s,rod),1);
 assertUniversalMatch(packs,s);
});

test('the Colossal Titan cannot be played onto the energy line',()=>{
 const counts=countsFor(['AOT-1-113','AOT-1-060','AOT-1-035']);
 let s=toPhase(fresh(counts,24113),'main');
 put(s,0,'AOT-1-060','energy',0,true);
 put(s,0,'AOT-1-035','energy',1,true);
 readyAp(s,0,1);
 const titan=toHand(s,0,'AOT-1-113');
 const plays=legalUniversalActions(packs,s).filter(a=>a.type==='play'&&a.uid===titan.uid);
 assert.equal(plays.some(a=>a.line==='energy'),false);
 assert.equal(plays.some(a=>a.line==='front'),true);
 s=play(s,titan.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===titan.uid),true);
 assertUniversalMatch(packs,s);
});
