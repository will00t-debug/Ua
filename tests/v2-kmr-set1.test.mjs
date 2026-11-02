import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack,KMR_STARTER_IDS} from '../dist/universal-v2/kmr-pack.mjs';
import {kmrEngineKind} from '../dist/universal-v2/kmr-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {kmrPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalImpact,universalPrivateChoices,universalPublicView,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {frontAttackKeywordBadges,inspectedPendingChoiceCards,publicPendingTargetCard} from '../dist/universal-v2/preview-actions.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const STARTER=new Set(KMR_STARTER_IDS);

test('Kamen Rider set 1 registers 113 identities without parallels or the five-title census',()=>{
 assert.equal(KMR_CARDS.length,113);
 assert.equal(Object.keys(pack.cards).length,113);
 const ids=KMR_CARDS.map(c=>c.id);
 assert.deepEqual(ids,Array.from({length:113},(_,i)=>'KMR-1-'+String(i+1).padStart(3,'0')));
 assert.equal(ids.some(id=>id.includes('_p')||id.endsWith('AP')),false);
 for(const card of KMR_CARDS){
  assert.equal(kmrEngineKind(card.effectJa),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa,card.id);
 }
 assert.equal(V2_TITLE_IDS.includes('kmr'),false);
 const reprint=KMR_CARDS.find(c=>c.id==='KMR-1-016');
 assert.deepEqual(reprint.sets,['UA29BT','UA29ST']);
 assert.deepEqual(reprint.printings.map(p=>p.set),['UA29BT','UA29ST']);
});

test('yellow starter practice deck uses only the 18 starter identities',()=>{
 const built=kmrPracticeDeck();
 const ids=Object.keys(built.counts);
 assert.equal(Object.values(built.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(ids.every(id=>STARTER.has(id)),true);
 for(const promo of ['KMR-1-110','KMR-1-111','KMR-1-112','KMR-1-113'])
  assert.equal(built.counts[promo],undefined);
 assert.deepEqual(validateUniversalDeck(built.pack,built.counts),[]);
 const status=editorV2Status('kmr',built.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,113);
});

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
function fresh(counts){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:29,first:0});
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

function ready(s){
 s.pending=null;
 s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
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
function stackRaid(s,p,topId,underId,line,slot){
 const top=put(s,p,topId,line,slot,true);
 const under=take(s,p,underId);
 under.faceDown=false;
 under.ready=false;
 top.stack=[under];
 return top;
}
function silence(s,card,controller){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
test('ARK-ONE hand energy drops by 5 with two outside AP2 trait cards',()=>{
 const s=fresh(countsFor(['KMR-1-001','KMR-1-021','KMR-1-024']));
 s.players[0].outside.push(take(s,0,'KMR-1-021'),take(s,0,'KMR-1-024'));
 const printed=pack.cards['KMR-1-001'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),printed.energy-5);
 s.players[0].outside.pop();
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),printed.energy);
});

test('Faiz Accel can raid onto a Faiz name and cannot be played from hand',()=>{
 const s=fresh(countsFor(['KMR-1-085','KMR-1-082','KMR-1-069','KMR-1-072','KMR-1-089','KMR-1-090']));
 put(s,0,'KMR-1-082','front',0,true);
 for(const [i,id] of ['KMR-1-069','KMR-1-072','KMR-1-089','KMR-1-090'].entries())
  put(s,0,id,'energy',i,true);
 const rider=take(s,0,'KMR-1-085');
 s.players[0].hand.push(rider);
 ready(s);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(a=>a.type==='play'&&a.uid===rider.uid),false);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===rider.uid),true);
});

test('Den-O host accepts a raider whose name contains 電王',()=>{
 const s=fresh(countsFor(['KMR-1-078','KMR-1-079','KMR-1-069','KMR-1-072','KMR-1-082','KMR-1-089']));
 const host=put(s,0,'KMR-1-078','front',0,true);
 for(const [i,id] of ['KMR-1-069','KMR-1-072','KMR-1-082','KMR-1-089'].entries())
  put(s,0,id,'energy',i,true);
 const rider=take(s,0,'KMR-1-079');
 s.players[0].hand.push(rider);
 ready(s);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===host.uid),true);
});

test('shared sentences stay on the existing profiles',()=>{
 assert.equal(pack.cards['KMR-1-008'].opponentBounceImmune,true);
 assert.equal(pack.cards['KMR-1-008'].impactNull,true);
 assert.deepEqual(pack.cards['KMR-1-089'].blockBpRestriction,{relation:'atMost',bp:2000,condition:null});
 assert.equal(pack.cards['KMR-1-078'].raidHostNameIncludes,'電王');
 assert.equal(pack.cards['KMR-1-085'].raidOnlyEntry,true);
});

test('same-energy main is offered only when three hand cards share a cost',()=>{
 const s=fresh(countsFor(['KMR-1-034','KMR-1-006','KMR-1-017','KMR-1-023']));
 const actor=put(s,0,'KMR-1-034','front',0,true);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 ready(s);
 const before=legalUniversalActions(packs,s);
 assert.equal(before.some(a=>a.uid===actor.uid&&String(a.mode).startsWith('kmr:KMR-1-034')),false);
 s.players[0].hand.push(take(s,0,'KMR-1-006'),take(s,0,'KMR-1-017'),take(s,0,'KMR-1-023'));
 const after=legalUniversalActions(packs,s);
 assert.equal(after.some(a=>a.uid===actor.uid&&String(a.mode).startsWith('kmr:KMR-1-034')),true);
});

test('Gun Form raid retires printed energy 0, and Den-O kill art uses the opponent pack',()=>{
 const bleach=verifiedBleachPurplePilotDeck();
 const cross=[pack,bleach.pack];
 const mine=countsFor(['KMR-1-075','KMR-1-093','KMR-1-096','KMR-1-068','KMR-1-069','KMR-1-072','KMR-1-073']);
 const s=newUniversalMatch(cross,{decks:[mine,bleach.counts],seed:75,first:0});
 for(const [slot,id] of ['KMR-1-068','KMR-1-069','KMR-1-072','KMR-1-073'].entries())
  put(s,0,id,'energy',slot,true);
 const host=put(s,0,'KMR-1-093','front',0,true);
 const renji=put(s,1,'BLC-1-045','front',0,true);
 const rukia=put(s,1,'BLC-1-052','front',1,true);
 const gun=take(s,0,'KMR-1-075');
 const kill=take(s,0,'KMR-1-096');
 s.players[0].hand.push(gun,kill);
 ready(s);
 const raid=legalUniversalActions(cross,s).find(a=>a.type==='raid'&&a.uid===gun.uid&&a.baseUid===host.uid);
 assert.ok(raid,'Gun Form should raid onto Ryutaros');
 const entered=dispatchUniversalAction(cross,s,raid);
 assert.equal(entered.pending?.kind,'kmr');
 assert.equal(entered.pending?.id,'KMR-1-075');
 assert.equal(entered.pending?.step,'retire');
 const zero=entered.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.deepEqual(zero,[renji.uid]);
 assert.equal(zero.includes(rukia.uid),false);
 const priv=universalPrivateChoices(cross,entered,0);
 assert.equal(priv.options.find(o=>o.action.uid===renji.uid).card,null);
 const view=universalPublicView(cross,entered,0);
 assert.deepEqual(publicPendingTargetCard(view,{uid:renji.uid}),
  {side:1,line:'front',index:0,cardId:'BLC-1-045',bp:2000});
 const skipped=dispatchUniversalAction(cross,entered,{type:'kmr',mode:'skip'});
 assert.equal(skipped.pending,null);
 const play=legalUniversalActions(cross,skipped).find(a=>a.type==='event'&&a.uid===kill.uid);
 assert.ok(play,'俺の必殺技 should be playable after the raid');
 const choosing=dispatchUniversalAction(cross,skipped,play);
 assert.equal(choosing.pending?.id,'KMR-1-096');
 const victims=choosing.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid).sort();
 assert.deepEqual(victims,[renji.uid,rukia.uid].sort());
 const shown=universalPrivateChoices(cross,choosing,0);
 assert.equal(shown.options.every(o=>o.card===null),true);
 const board=universalPublicView(cross,choosing,0);
 assert.equal(publicPendingTargetCard(board,{uid:renji.uid}).side,1);
 assert.equal(publicPendingTargetCard(board,{uid:rukia.uid}).side,1);
 assert.equal(publicPendingTargetCard(board,{uid:rukia.uid}).cardId,'BLC-1-052');
});

test('Ore, Sanjou looks at the top five and can ready one AP when life is 5 or more',()=>{
 const counts=countsFor(['KMR-1-095','KMR-1-078','KMR-1-094','KMR-1-093','KMR-1-068']);
 const s=fresh(counts);
 put(s,0,'KMR-1-068','energy',0,true);
 const event=take(s,0,'KMR-1-095');
 s.players[0].hand.push(event);
 const platform=take(s,0,'KMR-1-078');
 const liner=take(s,0,'KMR-1-094');
 const ryuta=take(s,0,'KMR-1-093');
 const fillers=[];
 for(const card of s.players[0].deck){
  if(fillers.length>=2)break;
  const printed=pack.cards[card.cardId];
  if(!printed.name.includes('電王')&&printed.name!=='デンライナー')fillers.push(card);
 }
 for(const card of fillers)s.players[0].deck.splice(s.players[0].deck.indexOf(card),1);
 s.players[0].deck.unshift(platform,liner,ryuta,...fillers);
 ready(s);
 assert.ok(s.players[1].life.length>=5);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play,'俺、参上！ should be a legal event');
 const looked=dispatchUniversalAction(packs,s,play);
 assert.equal(looked.pending?.kind,'kmr');
 assert.equal(looked.pending?.step,'lookPick');
 const takes=looked.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid).sort();
 assert.deepEqual(takes,[platform.uid,liner.uid].sort());
 assert.equal(takes.includes(ryuta.uid),false);
 const window=[platform,liner,ryuta,...fillers];
 const seen=universalPrivateChoices(packs,looked,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,looked));
 assert.deepEqual(shown.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(shown.find(c=>c.uid===platform.uid).action.mode,'take');
 assert.equal(shown.find(c=>c.uid===liner.uid).action.mode,'take');
 assert.equal(shown.find(c=>c.uid===ryuta.uid).action,null);
 assert.equal(shown.find(c=>c.uid===fillers[0].uid).action,null);
 assert.equal(universalPrivateChoices(packs,looked,1),null);
 assert.throws(()=>dispatchUniversalAction(packs,looked,{type:'kmr',mode:'take',uid:ryuta.uid}),
  /not currently legal/);
 let ordered=dispatchUniversalAction(packs,looked,{type:'kmr',mode:'take',uid:platform.uid});
 while(ordered.pending?.step==='lookOrder')
  ordered=dispatchUniversalAction(packs,ordered,ordered.pending.actions[0]);
 assert.equal(ordered.players[0].hand.some(c=>c.uid===platform.uid),true);
 assert.equal(ordered.pending?.kind,'effect-recover-ap');
 assert.equal(ordered.pending?.remaining,1);
 const rested=ordered.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 assert.ok(rested);
 const readied=dispatchUniversalAction(packs,ordered,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(readied.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 assert.equal(readied.pending,null);
});

test('a Kamen Rider choice does not fall through the AI play path',()=>{
 const s=fresh(countsFor(['KMR-1-001']));
 s.pending={kind:'kmr',player:0,sourceUid:'0-1',id:'KMR-1-001',step:'mill',
  actions:[{type:'kmr',mode:'skip'},{type:'kmr',mode:'mill'}]};
 const chosen=dispatchUniversalAction(packs,s,{type:'kmr',mode:'skip'});
 assert.equal(chosen.pending,null);
});

test('KMR-1-079 activates Sword Form on-play as itself, so Impact lands on the liner',()=>{
 const counts=countsFor(['KMR-1-079','KMR-1-078','KMR-1-077','KMR-1-092','KMR-1-002']);
 let s=toPhase(fresh(counts),'attack');
 const liner=stackRaid(s,0,'KMR-1-079','KMR-1-078','front',0);
 const sword=stackRaid(s,0,'KMR-1-077','KMR-1-092','front',1);
 const wall=put(s,1,'KMR-1-002','front',0,true);
 const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===liner.uid&&a.targetUid===undefined);
 assert.ok(attack,'Liner Form should be able to attack');
 s=dispatchUniversalAction(packs,s,attack);
 assert.equal(s.pending?.kind,'kmr');
 assert.equal(s.pending?.id,'KMR-1-079');
 assert.equal(s.pending.actions.some(a=>a.mode==='own'&&a.uid===sword.uid),true);
 const skipped=dispatchUniversalAction(packs,structuredClone(s),{type:'kmr',mode:'skip'});
 assert.equal(universalImpact(packs,skipped,skipped.players[0].front.find(c=>c?.uid===liner.uid)),0);
 assert.equal(skipped.pending?.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'kmr',mode:'own',uid:sword.uid});
 const linerLive=s.players[0].front.find(c=>c?.uid===liner.uid);
 const swordLive=s.players[0].front.find(c=>c?.uid===sword.uid);
 assert.equal(universalImpact(packs,s,linerLive),1,'copied Momotaros Impact belongs to the sniper');
 assert.equal(universalImpact(packs,s,swordLive),0,'the chosen Sword Form is not the card that activated the effect');
 assert.deepEqual(frontAttackKeywordBadges(packs,s,0,0).map(b=>b.text),['衝擊1']);
 assert.deepEqual(frontAttackKeywordBadges(packs,s,0,1).map(b=>b.text),[]);
 assert.equal(s.pending?.kind,'block');
 const life=s.players[1].life.length;
 const block=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.ok(block,'the lower BP character can block');
 s=dispatchUniversalAction(packs,s,block);
 assert.equal(s.players[1].front.some(c=>c?.uid===wall.uid),false);
 assert.equal(s.players[1].life.length,life-1,'winning the battle with Impact deals 1 to the player');
 assertUniversalMatch(packs,s);
});

test('KMR-1-079 Q1897 does not activate a silenced Momotaros on-play',()=>{
 const counts=countsFor(['KMR-1-079','KMR-1-078','KMR-1-077','KMR-1-092']);
 let s=toPhase(fresh(counts),'attack');
 const liner=stackRaid(s,0,'KMR-1-079','KMR-1-078','front',0);
 const sword=stackRaid(s,0,'KMR-1-077','KMR-1-092','front',1);
 silence(s,sword,1);
 const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===liner.uid&&a.targetUid===undefined);
 assert.ok(attack);
 s=dispatchUniversalAction(packs,s,attack);
 assert.notEqual(s.pending?.kind,'kmr');
 assert.equal(universalImpact(packs,s,s.players[0].front.find(c=>c?.uid===liner.uid)),0);
 assertUniversalMatch(packs,s);
});
