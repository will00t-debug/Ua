import test from 'node:test';
import assert from 'node:assert/strict';
import {INUYASHA_CARDS} from '../dist/inuyasha-cards.mjs';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {iysEngineKind} from '../dist/universal-v2/iys-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {inuyashaPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalPublicView}
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
