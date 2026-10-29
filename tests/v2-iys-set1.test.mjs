import test from 'node:test';
import assert from 'node:assert/strict';
import {INUYASHA_CARDS} from '../dist/inuyasha-cards.mjs';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {iysEngineKind} from '../dist/universal-v2/iys-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {inuyashaPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {inspectedPendingChoiceCards} from '../dist/universal-v2/preview-actions.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createIysV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
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
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
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
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||''));
 return use(s,action);
}

test('UA50BT registers all 80 playable identities outside the five-title census',()=>{
 assert.equal(INUYASHA_CARDS.length,80);
 assert.deepEqual(INUYASHA_CARDS.map(c=>c.id),Array.from({length:80},(_,i)=>'IYS-1-'+String(i+1).padStart(3,'0')));
 assert.equal(INUYASHA_CARDS.some(c=>c.rarity==='AP'||/_p\d/.test(c.number)),false);
 assert.equal(Object.keys(pack.cards).length,80);
 assert.equal(pack.version,'iys-ua50-full-20261029');
 assert.equal(V2_TITLE_IDS.includes('inuyasha'),false);
 const colors={purple:0,red:0};
 for(const card of INUYASHA_CARDS){
  assert.equal(iysEngineKind(card.effectJa),card.engineKind);
  assert.equal(pack.cards[card.id].name,card.nameJa);
 assert.equal(pack.cards['IYS-1-010'].name,'殺生丸の母');
 assert.equal(INUYASHA_CARDS.find(c=>c.id==='IYS-1-010').name,'殺生丸的母親');
  colors[card.color]++;
 }
 assert.equal(colors.purple,40);
 assert.equal(colors.red,40);
 assert.equal(pack.cards['IYS-1-001'].effects.onPlay[0].op,'moveOtherAcrossOrRemove');
 assert.equal(pack.cards['IYS-1-003'].triggerEffect.op,'deployOutsideCharacter');
 assert.equal(pack.cards['IYS-1-070'].triggerEffect.op,'retireOppFrontUnderBp');
 assert.equal(pack.cards['IYS-1-070'].triggerEffect.bp,2500);
 assert.equal(pack.cards['IYS-1-035'].triggerEffect.op,'retireOppFront');
 assert.deepEqual(pack.cards['IYS-1-009'].raidName,'殺生丸');
 assert.equal(pack.cards['IYS-1-028'].raidName,'奈落');
 assert.equal(pack.cards['IYS-1-046'].raidName,'犬夜叉');
 assert.equal(pack.cards['IYS-1-030'].nameAliases[0],'奈落');
 assert.equal(pack.cards['IYS-1-037'].effects.onPlay[0].bonusBp,5000);
 assert.equal(pack.cards['IYS-1-079'].effects.onPlay[0].bonusName,'犬夜叉');
 const practice=inuyashaPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 const status=editorV2Status('inuyasha',practice.counts);
 assert.equal(status.ready,true,status.issues.join('；'));
 assert.equal(status.registered,80);
});

test('Q2129 moves another character and removes one when the destination line is full',()=>{
 const counts=countsFor(['IYS-1-001','IYS-1-004','IYS-1-006','IYS-1-010']);
 let s=toPhase(fresh(counts,2129),'main');
 readyAp(s);
 put(s,0,'IYS-1-006','energy',0);
 put(s,0,'IYS-1-010','energy',1);
 put(s,0,'IYS-1-004','energy',2);
 put(s,0,'IYS-1-004','energy',3);
 const mover=put(s,0,'IYS-1-004','front',0);
 const aunn=take(s,0,'IYS-1-001');
 s.players[0].hand.push(aunn);
 s=play(s,aunn.uid);
 assert.equal(s.pending.kind,'effect-line-move');
 s=choose(s,a=>a.uid===mover.uid);
 assert.equal(s.pending.kind,'effect-line-slot');
 const victim=s.players[0].energy[0];
 s=choose(s,a=>a.slot===0&&a.replaceUid===victim.uid);
 assert.equal(s.players[0].energy[0].uid,mover.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===victim.uid),true);
 assertUniversalMatch(packs,s);
});

test('a character that entered from outside raises BP and can be deployed at rest',()=>{
 const recruit=Object.values(pack.cards).find(c=>c.color==='purple'&&c.type==='character'&&
  !(c.traits||[]).length&&c.energy<=3&&c.ap===1&&!['special','color','final'].includes(c.trigger)&&
  !Object.keys(c.effects||{}).length&&!['IYS-1-006','IYS-1-008','IYS-1-001','IYS-1-010'].includes(c.id));
 const counts=countsFor(['IYS-1-006','IYS-1-008','IYS-1-001','IYS-1-010',recruit.id]);
 let s=toPhase(fresh(counts,8),'main');
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-001','energy',1);
 put(s,0,'IYS-1-010','energy',2);
 const sess=put(s,0,'IYS-1-006','front',0);
 const before=universalBp(packs,s,sess);
 const body=take(s,0,recruit.id);
 s.players[0].outside.push(body);
 const enter=take(s,0,'IYS-1-008');
 s.players[0].hand.push(enter);
 s=play(s,enter.uid);
 assert.equal(s.pending.kind,'iys');
 s=choose(s,a=>a.mode==='deploy'&&a.uid===body.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===body.uid&&c.ready===false),true);
 assert.equal(universalBp(packs,s,sess),before+1000);
 assertUniversalMatch(packs,s);
});

test('Q2134 tuck stays visible to the controller and hidden from the opponent',()=>{
 const counts=countsFor(['IYS-1-028','IYS-1-034','IYS-1-001']);
 let s=toPhase(fresh(counts,2134),'main');
 readyAp(s);
 const naraku=put(s,0,'IYS-1-028','front',0);
 const shard=take(s,0,'IYS-1-034');
 s.players[0].outside.push(shard);
 s=use(s,{type:'activate',uid:naraku.uid,mode:'iys:0'});
 if(s.pending)s=choose(s,a=>a.uid===shard.uid);
 const host=s.players[0].front.find(c=>c?.uid===naraku.uid);
 assert.equal(host.under.some(c=>c.uid===shard.uid&&c.faceDown===true),true);
 const mine=universalPublicView(packs,s,0).players[0].front.find(c=>c?.uid===host.uid);
 const theirs=universalPublicView(packs,s,1).players[0].front.find(c=>c?.uid===host.uid);
 assert.equal(mine.underLayers[0].cardId,shard.cardId);
 assert.equal(theirs.underLayers[0].faceDown,true);
 assert.equal(theirs.underLayers[0].cardId,undefined);
 assertUniversalMatch(packs,s);
});

test('Q2138 can rest-enter the character just discarded',()=>{
 const recruit=Object.values(pack.cards).find(c=>c.color==='purple'&&c.type==='character'&&
  !(c.traits||[]).length&&c.energy<=3&&c.ap===1&&!['special','color','final'].includes(c.trigger)&&
  !Object.keys(c.effects||{}).length&&!['IYS-1-036','IYS-1-001','IYS-1-010'].includes(c.id));
 const counts=countsFor(['IYS-1-036','IYS-1-001','IYS-1-010',recruit.id]);
 let s=toPhase(fresh(counts,2138),'main');
 readyAp(s);
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-010','energy',1);
 const discarded=take(s,0,recruit.id);
 const event=take(s,0,'IYS-1-036');
 s.players[0].hand.push(discarded,event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-discard');
 s=choose(s,a=>a.uid===discarded.uid);
 assert.equal(s.pending.kind,'iys');
 assert.equal(s.pending.step,'deploy');
 assert.equal(s.players[0].outside.some(c=>c.uid===discarded.uid),true);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===discarded.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===discarded.uid&&c.ready===false)||
  s.players[0].energy.some(c=>c?.uid===discarded.uid&&c.ready===false),true);
 assertUniversalMatch(packs,s);
});

test('own-effect rest opens the once-per-turn active, and a plain rest does not',()=>{
 const counts=countsFor(['IYS-1-043','IYS-1-045']);
 let s=toPhase(fresh(counts,43),'main');
 const inu=put(s,0,'IYS-1-043','front',0,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===inu.uid),false);
 s.ownEffectRests[0].push({uid:inu.uid,stamp:inu.fieldEntryStamp,turn:s.turn});
 s=use(s,{type:'activate',uid:inu.uid,mode:'iys:0'});
 const live=s.players[0].front.find(c=>c?.uid===inu.uid);
 assert.equal(live.ready,true);
 assert.ok((live.buffs||[]).some(b=>b.bp===1000&&b.untilTurn===s.turn));
 assertUniversalMatch(packs,s);
});

test('IYS-1-044 deals 2 damage and cannot block without a direct facedown',()=>{
 const counts=countsFor(['IYS-1-044','IYS-1-042','IYS-1-034']);
 let s=toPhase(fresh(counts,44),'attack');
 const attacker=put(s,0,'IYS-1-044','front',0,true);
 s=use(s,{type:'attack',uid:attacker.uid});
 const swinging=s.players[0].front.find(c=>c?.uid===attacker.uid);
 assert.equal(universalAttackDamage(packs,s,swinging),2);
 assert.equal(s.pending.kind,'block');
 assertUniversalMatch(packs,s);
 let blocked=toPhase(fresh(counts,45),'attack');
 const striker=put(blocked,0,'IYS-1-042','front',0,true);
 const wall=put(blocked,1,'IYS-1-044','front',0,true);
 blocked=use(blocked,{type:'attack',uid:striker.uid});
 assert.equal(blocked.pending.kind,'block');
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.uid===wall.uid),false);
 const shard=take(blocked,1,'IYS-1-034');
 shard.faceDown=true;
 blocked.players[1].front.find(c=>c?.uid===wall.uid).under.push(shard);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.uid===wall.uid),true);
 assertUniversalMatch(packs,blocked);
});

test('Q2143 playing 飛来骨 does not draw, and an effect discard does when 珊瑚 is on the field',()=>{
 const counts=countsFor(['IYS-1-080','IYS-1-041','IYS-1-056','IYS-1-069','IYS-1-042']);
 let s=toPhase(fresh(counts,2143),'main');
 readyAp(s);
 put(s,0,'IYS-1-041','energy',0);
 put(s,0,'IYS-1-041','energy',1);
 const foe=put(s,1,'IYS-1-042','front',0,true);
 const bone=take(s,0,'IYS-1-080');
 s.players[0].hand.push(bone);
 const deckBefore=s.players[0].deck.length;
 s=play(s,bone.uid,'event');
 assert.equal(s.pending.step,'restFoe');
 s=choose(s,a=>a.uid===foe.uid);
 assert.equal(s.players[1].front.find(c=>c?.uid===foe.uid).ready,false);
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(s.players[0].hand.some(c=>c.cardId==='IYS-1-080'),false);
 assertUniversalMatch(packs,s);

 let drawn=toPhase(fresh(counts,2144),'main');
 readyAp(drawn);
 put(drawn,0,'IYS-1-041','energy',0);
 put(drawn,0,'IYS-1-056','front',0);
 const event=take(drawn,0,'IYS-1-069');
 const moved=take(drawn,0,'IYS-1-080');
 drawn.players[0].hand.push(event,moved);
 const before=drawn.players[0].deck.length;
 drawn=play(drawn,event.uid);
 assert.equal(drawn.pending.kind,'effect-discard');
 drawn=choose(drawn,a=>a.uid===moved.uid);
 assert.equal(drawn.players[0].outside.some(c=>c.uid===moved.uid),true);
 assert.equal(drawn.players[0].deck.length,before-2);
 assertUniversalMatch(packs,drawn);
});

function payPurple(s){
 put(s,0,'IYS-1-001','energy',0);
 put(s,0,'IYS-1-010','energy',1);
}
function payRed(s){
 put(s,0,'IYS-1-041','energy',0);
 put(s,0,'IYS-1-045','energy',1);
 put(s,0,'IYS-1-062','energy',2);
}
function assertFacedownPrivate(s,owner,hostUid,buriedId){
 const mine=universalPublicView(packs,s,owner);
 const theirs=universalPublicView(packs,s,1-owner);
 const host=view=>[...view.players[owner].front,...view.players[owner].energy].find(c=>c?.uid===hostUid);
 const shown=host(mine).underLayers.find(layer=>layer.cardId===buriedId);
 assert.equal(shown.faceDown,true);
 assert.equal(host(theirs).underLayers.every(layer=>layer.faceDown===true&&layer.cardId===undefined),true);
}

test('Q2130 and Q2132 the activate tuck is the once-per-turn lock, and its facedown stays private',()=>{
 const counts=countsFor(['IYS-1-022','IYS-1-028','IYS-1-029','IYS-1-001','IYS-1-010']);
 let s=toPhase(fresh(counts,2130),'main');
 readyAp(s);
 payPurple(s);
 const naraku=put(s,0,'IYS-1-028','front',0);
 const shard=take(s,0,'IYS-1-029');
 s.players[0].outside.push(shard);
 const kanna=take(s,0,'IYS-1-022');
 s.players[0].hand.push(kanna);
 s=play(s,kanna.uid);
 assert.equal(s.pending.step,'handPlace');
 s=choose(s,a=>a.mode==='outside');
 assert.equal(s.mainReadyOnceByName[0].includes('神無'),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===kanna.uid),true);
 s=use(s,{type:'activate',uid:kanna.uid,mode:'iys:0'});
 s=choose(s,a=>a.uid===shard.uid);
 const host=s.players[0].front.find(c=>c?.uid===naraku.uid);
 assert.equal(host.under.some(c=>c.uid===shard.uid&&c.faceDown===true),true);
 assertFacedownPrivate(s,0,naraku.uid,'IYS-1-029');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===kanna.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q2131 two 神無 share one activate tuck in the same turn',()=>{
 const counts=countsFor(['IYS-1-022','IYS-1-028','IYS-1-029']);
 let s=toPhase(fresh(counts,2131),'main');
 const first=put(s,0,'IYS-1-022','front',0);
 const second=put(s,0,'IYS-1-022','front',1);
 put(s,0,'IYS-1-028','front',2);
 const shard=take(s,0,'IYS-1-029');
 s.players[0].outside.push(shard);
 s=use(s,{type:'activate',uid:first.uid,mode:'iys:0'});
 s=choose(s,a=>a.uid===shard.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===first.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q2133 Q2136 and Q2140 keep a facedown under private to the controller',()=>{
 const counts=countsFor(['IYS-1-026','IYS-1-032','IYS-1-028','IYS-1-029','IYS-1-044','IYS-1-079']);
 let hidden=toPhase(fresh(counts,2133),'main');
 const kagura=put(hidden,0,'IYS-1-026','front',0);
 const under=take(hidden,0,'IYS-1-029');
 under.faceDown=true;
 kagura.under.push(under);
 assertFacedownPrivate(hidden,0,kagura.uid,'IYS-1-029');
 assertUniversalMatch(packs,hidden);

 let mirror=toPhase(fresh(counts,2136),'main');
 const glass=put(mirror,0,'IYS-1-032','energy',0,true);
 const host=put(mirror,0,'IYS-1-028','front',0);
 const piece=take(mirror,0,'IYS-1-029');
 mirror.players[0].outside.push(piece);
 mirror=use(mirror,{type:'activate',uid:glass.uid,mode:'iys:0'});
 mirror=choose(mirror,a=>a.uid===piece.uid);
 assert.equal(mirror.players[0].energy.find(c=>c?.uid===glass.uid).ready,false);
 assertFacedownPrivate(mirror,0,host.uid,'IYS-1-029');
 assertUniversalMatch(packs,mirror);

 let sword=toPhase(fresh(counts,2140),'main');
 const inu=put(sword,0,'IYS-1-044','front',0,true);
 const fang=take(sword,0,'IYS-1-079');
 sword.players[0].outside.push(fang);
 sword=use(sword,{type:'activate',uid:inu.uid,mode:'iys:1'});
 assertFacedownPrivate(sword,0,inu.uid,'IYS-1-079');
 assertUniversalMatch(packs,sword);
});

test('Q2135 tucking the revealed top under 奈落 stays private to the controller',()=>{
 const counts=countsFor(['IYS-1-030','IYS-1-028','IYS-1-029']);
 let s=toPhase(fresh(counts,2135),'main');
 readyAp(s);
 const naraku=put(s,0,'IYS-1-028','front',0);
 const top=take(s,0,'IYS-1-029');
 s.players[0].deck.unshift(top);
 const hitomi=take(s,0,'IYS-1-030');
 s.players[0].hand.push(hitomi);
 s=play(s,hitomi.uid);
 assert.equal(s.pending.step,'topOrUnder');
 s=choose(s,a=>a.mode==='host'&&a.uid===naraku.uid);
 assertFacedownPrivate(s,0,naraku.uid,'IYS-1-029');
 assertUniversalMatch(packs,s);
});

test('Q2137 最猛勝 can be used when the opponent has zero or one outside event',()=>{
 const counts=countsFor(['IYS-1-033','IYS-1-028','IYS-1-001','IYS-1-010','IYS-1-038']);
 let empty=toPhase(fresh(counts,2137),'main');
 readyAp(empty);
 payPurple(empty);
 put(empty,0,'IYS-1-028','front',0);
 const first=take(empty,0,'IYS-1-033');
 empty.players[0].hand.push(first);
 const before=empty.players[0].deck.length;
 empty=play(empty,first.uid,'event');
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].deck.length,before-2);
 assertUniversalMatch(packs,empty);

 let one=toPhase(fresh(counts,21370),'main');
 readyAp(one);
 payPurple(one);
 put(one,0,'IYS-1-028','front',0);
 const event=take(one,1,'IYS-1-038');
 one.players[1].outside.push(event);
 const played=take(one,0,'IYS-1-033');
 one.players[0].hand.push(played);
 const deck=one.players[0].deck.length;
 one=play(one,played.uid,'event');
 assert.equal(one.pending,null);
 assert.equal(one.players[0].deck.length,deck-2);
 assert.equal(one.players[1].outside.some(c=>c.uid===event.uid),false);
 assert.equal(one.players[1].deck.at(-1).uid,event.uid);
 assertUniversalMatch(packs,one);
});

test('Q2139 tucking 融合 under 奈落 stays private to the controller',()=>{
 const counts=countsFor(['IYS-1-039','IYS-1-028','IYS-1-029','IYS-1-001','IYS-1-010']);
 let s=toPhase(fresh(counts,2139),'main');
 readyAp(s);
 payPurple(s);
 const naraku=put(s,0,'IYS-1-028','front',0);
 const other=put(s,0,'IYS-1-029','front',1);
 const event=take(s,0,'IYS-1-039');
 s.players[0].hand.push(event);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.step,'retireOwn');
 s=choose(s,a=>a.uid===other.uid);
 assert.equal(s.pending.step,'tuckEvent');
 s=choose(s,a=>a.mode==='host'&&a.uid===naraku.uid);
 assertFacedownPrivate(s,0,naraku.uid,'IYS-1-039');
 assertUniversalMatch(packs,s);
});

test('Q2141 the unblocked draw waits for the block choice and precedes life damage',()=>{
 const counts=countsFor(['IYS-1-046','IYS-1-047']);
 let blocked=toPhase(fresh(counts,2141),'attack');
 const attacker=put(blocked,0,'IYS-1-046','front',0,true);
 const wall=put(blocked,1,'IYS-1-047','front',0,true);
 blocked=use(blocked,{type:'attack',uid:attacker.uid});
 assert.equal(blocked.pending.kind,'block');
 const deckAtChoice=blocked.players[0].deck.length;
 const lifeAtChoice=blocked.players[1].life.length;
 blocked=choose(blocked,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(blocked.players[0].deck.length,deckAtChoice);
 assert.equal(blocked.players[1].life.length,lifeAtChoice);
 assert.equal(blocked.players[1].outside.some(c=>c.uid===wall.uid),true);
 assertUniversalMatch(packs,blocked);

 let open=toPhase(fresh(counts,21411),'attack');
 const swinger=put(open,0,'IYS-1-046','front',0,true);
 const top=take(open,1,'IYS-1-047');
 open.players[1].life.unshift(top);
 open=use(open,{type:'attack',uid:swinger.uid});
 assert.equal(open.pending.kind,'block');
 const before=open.players[0].deck.length;
 assert.equal(open.players[1].life[0].uid,top.uid);
 open=choose(open,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(open.players[0].deck.length,before-1);
 assert.equal(open.players[1].outside.some(c=>c.uid===top.uid),true);
 const draw=open.zoneMoveEvents.find(e=>e.from==='deck'&&e.to==='hand'&&e.sourceUid===swinger.uid);
 const life=open.zoneMoveEvents.find(e=>e.uid===top.uid&&e.from==='life'&&e.to==='outside');
 assert.ok(draw&&life&&draw.order<life.order);
 assertUniversalMatch(packs,open);
});

test('Q2142 retires BP 2500 without 珊瑚, and one removed event raises the cap by 500',()=>{
 const counts=countsFor(['IYS-1-071','IYS-1-047','IYS-1-045','IYS-1-041','IYS-1-062','IYS-1-044','IYS-1-056','IYS-1-038']);
 let plain=toPhase(fresh(counts,2142),'main');
 readyAp(plain);
 payRed(plain);
 const small=put(plain,1,'IYS-1-047','front',0);
 const mid=put(plain,1,'IYS-1-045','front',1);
 const miroku=take(plain,0,'IYS-1-071');
 plain.players[0].hand.push(miroku);
 plain=play(plain,miroku.uid);
 assert.equal(plain.pending.step,'removeEvents');
 plain=choose(plain,a=>a.mode==='done');
 assert.equal(plain.pending.step,'retireCap');
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.uid===small.uid),true);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.uid===mid.uid),false);
 plain=choose(plain,a=>a.uid===small.uid);
 assert.equal(plain.players[1].outside.some(c=>c.uid===small.uid),true);
 assert.equal(plain.players[1].front.some(c=>c?.uid===mid.uid),true);
 assertUniversalMatch(packs,plain);

 let boosted=toPhase(fresh(counts,21420),'main');
 readyAp(boosted);
 payRed(boosted);
 put(boosted,0,'IYS-1-056','front',0);
 const event=take(boosted,0,'IYS-1-038');
 boosted.players[0].outside.push(event);
 const target=put(boosted,1,'IYS-1-045','front',0);
 const high=put(boosted,1,'IYS-1-044','front',1);
 const actor=take(boosted,0,'IYS-1-071');
 boosted.players[0].hand.push(actor);
 boosted=play(boosted,actor.uid);
 boosted=choose(boosted,a=>a.mode==='remove'&&a.uid===event.uid);
 assert.equal(boosted.players[0].removed.some(c=>c.uid===event.uid),true);
 boosted=choose(boosted,a=>a.mode==='done');
 assert.equal(legalUniversalActions(packs,boosted).some(a=>a.uid===target.uid),true);
 assert.equal(legalUniversalActions(packs,boosted).some(a=>a.uid===high.uid),false);
 boosted=choose(boosted,a=>a.uid===target.uid);
 assert.equal(boosted.players[1].outside.some(c=>c.uid===target.uid),true);
 assertUniversalMatch(packs,boosted);
});

test('printed pip stays, and the plus is one more energy only while the effect is live',()=>{
 for(const id of ['IYS-1-011','IYS-1-013','IYS-1-017','IYS-1-055','IYS-1-064'])
  assert.equal(pack.cards[id].gen,1,id);
 const counts=countsFor(['IYS-1-013','IYS-1-004','IYS-1-017','IYS-1-011','IYS-1-064']);
 let s=toPhase(fresh(counts,1013),'main');
 readyAp(s);
 const rin=put(s,0,'IYS-1-013','energy',0);
 assert.equal(universalCardEnergy(packs,s,0,rin),1);
 const sess=put(s,0,'IYS-1-004','energy',1);
 assert.equal(universalCardEnergy(packs,s,0,rin),1,'energy line is not the front');
 s.players[0].energy[1]=null;
 s.players[0].front[0]=sess;
 assert.equal(universalCardEnergy(packs,s,0,rin),2);
 rin.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,rin),2,'the extra purple does not require Rin to be active');
 const kagura=put(s,0,'IYS-1-017','energy',1,true);
 const kagome=put(s,0,'IYS-1-064','energy',2,true);
 assert.equal(universalCardEnergy(packs,s,0,kagura),2);
 assert.equal(universalCardEnergy(packs,s,0,kagome),2);
 kagura.ready=false;
 kagome.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,kagura),1);
 assert.equal(universalCardEnergy(packs,s,0,kagome),1);
 const small=put(s,0,'IYS-1-011','energy',3,true);
 assert.equal(universalCardEnergy(packs,s,0,small),1);
 s=use(s,{type:'activate',uid:small.uid,mode:'selfRestEnergyRetire'});
 assert.equal(s.players[0].energy[3].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[3]),2);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('fake-0 Sesshomaru shows both looked cards and can send only a traitless purple outside',()=>{
 const counts=countsFor(['IYS-1-005','IYS-1-004','IYS-1-047','IYS-1-056','IYS-1-080']);
 let s=toPhase(fresh(counts,1005),'main');
 readyAp(s);
 const miss=take(s,0,'IYS-1-047');
 const hit=take(s,0,'IYS-1-004');
 s.players[0].deck.unshift(hit);
 s.players[0].deck.unshift(miss);
 const body=take(s,0,'IYS-1-005');
 s.players[0].hand.push(body);
 s=play(s,body.uid);
 assert.equal(s.pending.id,'IYS-1-005');
 assert.equal(s.pending.step,'lookPick');
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.cardId),['IYS-1-047','IYS-1-004']);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['IYS-1-047','IYS-1-004']);
 assert.equal(shown[0].action,null);
 assert.equal(shown[1].action.mode,'take');
 assert.equal(shown[1].action.uid,hit.uid);
 const hidden=JSON.stringify(universalPublicView(packs,s,1));
 assert.equal(hidden.includes(miss.uid),false);
 assert.equal(hidden.includes(hit.uid),false);
 s=choose(s,a=>a.mode==='take'&&a.uid===hit.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===hit.uid),true);
 assert.equal(s.players[0].deck[0].uid,miss.uid);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 let coral=toPhase(fresh(counts,1056),'main');
 readyAp(coral);
 const event=take(coral,0,'IYS-1-080');
 const other=take(coral,0,'IYS-1-004');
 coral.players[0].deck.unshift(other);
 coral.players[0].deck.unshift(event);
 const searcher=take(coral,0,'IYS-1-056');
 coral.players[0].hand.push(searcher);
 coral=play(coral,searcher.uid);
 const window=universalPrivateChoices(packs,coral,0);
 assert.equal(window.inspected.length,2);
 assert.deepEqual(window.inspected.map(c=>c.uid),[event.uid,other.uid]);
 const picks=inspectedPendingChoiceCards(window,legalUniversalActions(packs,coral));
 assert.equal(picks[0].action?.uid,event.uid);
 assert.equal(picks[1].action,null);
 assert.equal(universalPrivateChoices(packs,coral,1),null);
 assert.equal(assertUniversalMatch(packs,coral),true);
});
