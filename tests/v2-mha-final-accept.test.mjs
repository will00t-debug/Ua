// Final-round battle acceptance on the 92-card integration HEAD.
// The last eight printed sentences are 055, 060, 062, 066, 072, 076, 081
// and 084. Decks are unofficial 50-card lists. Official MHA play stays closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMhaV2Pack, MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp, universalAttackDamage, universalEnergyByColor,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {chooseHybridMainAction} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {fieldEffectCopy} from '../dist/universal-v2/preview-actions.mjs';
import {facedownInspectModel, facedownTitle} from '../dist/universal-v2/facedown-inspect.mjs';
import {deckCardImage} from '../dist/deck-gallery.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {UA10ST_CARDS, UA10ST_PRODUCT} from '../dist/mha/ua10st-cards.mjs';
import {normalizeEditorCounts, editorV2Status, LEGACY_DECK_KEYS} from '../dist/v2-editor-compat.mjs';
import {collectSavedV2LobbyDecks} from '../dist/universal-v2/lobby-saved-decks.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {onlineBattleView, visibleRaidBaseCards, showOnlineCard} from '../dist/universal-v2/online-battle-ui.mjs';
import {makeAttackLifePicker} from '../dist/universal-v2/attack-life-picker.mjs';
import {FakeNode, texts} from './helpers/online-client-dom.mjs';

const UNOFFICIAL='非官方測試牌組';
const LAST=['MHA-1-055','MHA-1-060','MHA-1-062','MHA-1-066','MHA-1-072','MHA-1-076','MHA-1-081','MHA-1-084'];
const REPRINTS=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052','MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065'];
const LIMITED=new Set(['special','final','color']);
const mha=createMhaV2Pack();
const imc=createImcV2Pack();
const bleach=createBleachV2Pack();
const editor=mhaEditorCards();
const editorById=Object.fromEntries(editor.map(card=>[card.id,card]));
const starterById=Object.fromEntries(UA10ST_CARDS.map(card=>[card.id,card]));

function takeInto(counts, used, id, want, color){
 const card=mha.cards[id];
 if(!card||card.color!==color)throw Error(id+' is not a ready '+color+' card');
 let room=4-(counts[id]||0);
 if(LIMITED.has(card.trigger))room=Math.min(room,4-(used[card.trigger]||0));
 const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const add=Math.min(want, Math.max(0,room), 50-total);
 if(add<=0)return;
 counts[id]=(counts[id]||0)+add;
 if(LIMITED.has(card.trigger))used[card.trigger]=(used[card.trigger]||0)+add;
}
function unofficial(color, pins){
 const counts={}, used={};
 for(const [id,n] of Object.entries(pins))takeInto(counts, used, id, n, color);
 const pool=Object.values(mha.cards)
  .filter(card=>card.color===color&&['character','event','field'].includes(card.type))
  .sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id));
 for(const card of pool){
  const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
  if(total>=50||card.energy>2)continue;
  takeInto(counts, used, card.id, card.energy===0?2:3, color);
 }
 for(const card of pool){
  const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
  if(total>=50)break;
  takeInto(counts, used, card.id, 4, color);
 }
 const total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 if(total!==50)throw Error(color+' deck stopped at '+total);
 const issues=validateUniversalDeck(mha, counts);
 if(issues.length)throw Error(color+' '+issues.join(' | '));
 return counts;
}
const green=unofficial('green',{
 'MHA-1-044':4,'MHA-1-057':4,'MHA-1-041':3,'MHA-1-037':2,'MHA-1-054':2,'MHA-1-061':2,
 'MHA-1-050':2,'MHA-1-051':2,'MHA-1-055':2,'MHA-1-056':2,'MHA-1-060':2,'MHA-1-062':2,
 'MHA-1-064':2,'MHA-1-066':2
});
const red=unofficial('red',{
 'MHA-1-073':4,'MHA-1-078':4,'MHA-1-077':2,'MHA-1-069':2,'MHA-1-071':2,'MHA-1-076':2,
 'MHA-1-080':2,'MHA-1-081':2,'MHA-1-084':2,'MHA-1-072':2,'MHA-1-099':2
});
const purple=unofficial('purple',{
 'MHA-1-001':2,'MHA-1-008':2,'MHA-1-013':2,'MHA-1-014':2,'MHA-1-016':2,'MHA-1-018':2,
 'MHA-1-019':2,'MHA-1-021':2,'MHA-1-024':2,'MHA-1-028':2
});
const decks={
 [UNOFFICIAL+'・綠']:green,
 [UNOFFICIAL+'・紫']:purple,
 [UNOFFICIAL+'・紅']:red
};

function fillDeck(pack, pinned={}){
 const counts={...pinned};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const used={special:0,final:0,color:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(LIMITED.has(trigger))used[trigger]+=n;
 }
 for(const card of Object.values(pack.cards)){
  if(total>=50)break;
  if(!['character','event','field'].includes(card.type))continue;
  let n=Math.min(4-(counts[card.id]||0),50-total);
  if(LIMITED.has(card.trigger))n=Math.min(n,4-(used[card.trigger]||0));
  if(n<=0)continue;
  counts[card.id]=(counts[card.id]||0)+n;
  total+=n;
  if(LIMITED.has(card.trigger))used[card.trigger]+=n;
 }
 if(total!==50)throw Error(pack.id+' filler stopped at '+total);
 return counts;
}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legalUniversalActions(pack,s).find(action);
  assert.ok(found,'missing legal action at '+s.phase+' '+(s.pending?.kind||''));
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pull(s,player,id){
 const pl=s.players[player];
 for(const zone of ['hand','deck','life','outside','removed']){
  const index=pl[zone].findIndex(card=>card?.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(card=>card?.cardId===id);
  if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
 }
 throw Error('Missing '+id+' for player '+player);
}
function hold(s,player,id){
 const hand=s.players[player].hand;
 const card=hand.find(item=>item.cardId===id)||pull(s,player,id);
 if(!hand.includes(card))hand.push(card);
 return card;
}
function seat(s,player,id,line,slot,ready=true){
 const card=pull(s,player,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[player][line][slot]=card;
 return card;
}
function fuel(s,player,ids){
 ids.forEach((id,index)=>{
  const card=pull(s,player,id);
  card.ready=false;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[player].energy[index]=card;
 });
}
function readyAp(s,player,count){
 s.players[player].apCards.forEach((card,index)=>{
  card.inPlay=index<count;
  card.ready=index<count;
 });
}
function reach(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+player+' '+phase+' at '+s.active+' '+s.phase+' front '+s.players.map(pl=>pl.front.filter(Boolean).map(c=>c.cardId).join('/')||'-').join(' | '));
  s=act(pack,s,{type:'next'});
  if(++guard>24)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function silence(s,card,controller=card.owner??0){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,
  sourceUid:card.uid,targetUid:card.uid,sourceLinked:false,
  until:{player:controller,phase:'start',edge:'start'}});
}
function orderBottom(pack,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(pack,s,action=>action.type==='chooseTopOrder'&&action.uid===uid);
  if(++guard>6)throw Error('order');
 }
 return s;
}
function openDecks(left,right,leftCounts,rightCounts,seed,extra={}){
 assert.deepEqual(validateUniversalDeck(left,leftCounts),[]);
 assert.deepEqual(validateUniversalDeck(right,rightCounts),[]);
 const packs=left===right?left:[left,right];
 let s=newUniversalMatch(packs,{
  decks:[leftCounts,rightCounts],seed,first:0,openingMulligan:false,...extra
 });
 s=reach(packs,s,0,'main');
 return {packs,s};
}
function same(action,other){return JSON.stringify(action)===JSON.stringify(other);}
const el=(tag,props={},...children)=>{
 const node=new FakeNode(tag);
 for(const [key,value] of Object.entries(props)){
  if(value==null)continue;
  if(key==='text')node.textContent=String(value);
  else if(key==='class')node.className=value;
  else if(key==='onClick')node.addEventListener('click',value);
  else if(key==='disabled')node.disabled=!!value;
  else if(key.startsWith('data-')){node.setAttribute(key,String(value));node.dataset.lifeIndex=String(value);}
  else node.setAttribute(key,String(value));
 }
 node.append(...children.flat().filter(child=>child!=null));
 return node;
};

test('three unofficial 50-card decks stay legal and MHA stays closed',()=>{
 assert.equal(Object.keys(mha.cards).length,92);
 assert.equal(getTitle('mha').playable,false);
 assert.equal(getTitle('imc').playable,true);
 assert.equal(Object.keys(imc.cards).length,113);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.match(MHA_OFFICIAL_MATCH_CLOSED,/尚未開放正式對戰/);
 for(const id of LAST)assert.equal(mha.cards[id].id,id);
 for(const id of ['MHA-1-002','MHA-1-029','MHA-1-091'])assert.equal(mha.cards[id],undefined);
 for(const [name,counts] of Object.entries(decks)){
  assert.match(name,/非官方測試牌組/);
  assert.equal(Object.values(counts).reduce((sum,n)=>sum+n,0),50);
  assert.deepEqual(validateUniversalDeck(mha,counts),[]);
  for(const [id,n] of Object.entries(counts))assert.ok(n<=4,id);
  for(const trigger of LIMITED){
   const n=Object.entries(counts).reduce((sum,[id,count])=>
    sum+(mha.cards[id].trigger===trigger?count:0),0);
   assert.ok(n<=4,trigger+' '+n);
  }
  const lows=Object.entries(counts).reduce((sum,[id,n])=>
   sum+(mha.cards[id].energy<=2?n:0),0);
  const highs=Object.entries(counts).reduce((sum,[id,n])=>
   sum+(mha.cards[id].energy>=4?n:0),0);
  assert.ok(lows>=8,name);
  assert.ok(highs>=2,name);
 }
 for(const id of ['MHA-1-055','MHA-1-060','MHA-1-062','MHA-1-066'])assert.ok(green[id]>=2);
 for(const id of ['MHA-1-072','MHA-1-076','MHA-1-081','MHA-1-084'])assert.ok(red[id]>=2);
});

test('the last eight keep official art and the full printed sentence',()=>{
 for(const id of LAST){
  const row=editorById[id];
  assert.match(row.image,/UA10BT_MHA-1-/);
  assert.equal(deckCardImage(row),row.image);
  const flat=row.effectJa.replace(/\s+/g,'');
  assert.equal(row.effect.replace(/\s+/g,''),flat);
  assert.ok(fieldEffectCopy(row).replace(/\s+/g,'').includes(flat),id);
  assert.equal(row.playable,false);
  assert.equal(row.battleReady,false);
 }
 assert.match(fieldEffectCopy(editorById['MHA-1-055']),/必要エナジーが4以上の他のキャラが3枚以上/);
 assert.match(fieldEffectCopy(editorById['MHA-1-060']),/手札を1枚場外に置いてもよい/);
 assert.match(fieldEffectCopy(editorById['MHA-1-062']),/発目 明/);
 assert.match(fieldEffectCopy(editorById['MHA-1-066']),/レストで登場/);
 assert.match(fieldEffectCopy(editorById['MHA-1-072']),/枚数×1000/);
 assert.match(fieldEffectCopy(editorById['MHA-1-076']),/フロントLに移動/);
 assert.match(fieldEffectCopy(editorById['MHA-1-081']),/次の1回アクティブにならない/);
 assert.match(fieldEffectCopy(editorById['MHA-1-084']),/BPの範囲\+1000/);
});

test('nine UA10ST reprints import into the unofficial decks',()=>{
 for(const id of REPRINTS){
  assert.ok(editorById[id].aliases.includes('UA10ST/'+id));
  assert.match(starterById[id].image,/UA10ST_/);
  assert.match(editorById[id].image,/UA10BT_/);
  assert.equal(mha.cards[id].id,id);
  assert.deepEqual(normalizeEditorCounts('mha',{['UA10ST/'+id]:2,['UA10BT/'+id]:2}),{[id]:4});
 }
 const saved=Object.entries(decks).map(([name,counts],index)=>{
  const pasted={};
  for(const [id,n] of Object.entries(counts))
   pasted[starterById[id]?.number||editorById[id].number]=n;
  assert.deepEqual(normalizeEditorCounts('mha',pasted),counts);
  return {id:'final-unofficial-'+index,name,counts:pasted};
 });
 const rows=collectSavedV2LobbyDecks({
  getItem(key){return key===LEGACY_DECK_KEYS.mha[1]?JSON.stringify(saved):null;},
  setItem(){}
 });
 for(const [name,counts] of Object.entries(decks)){
  const row=rows.find(item=>item.name===name);
  assert.equal(row.title,'mha');
  assert.equal(row.ready,false);
  assert.match(row.issues.join('\n'),/尚未開放正式對戰/);
  const status=editorV2Status('mha',counts);
  assert.equal(status.total,50);
  assert.equal(status.ready,false);
 }
});

test('055 retires one front character only after three other high-energy characters',()=>{
 let opened=openDecks(mha,mha,green,red,5501);
 let s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-057']);
 readyAp(s,0,2);
 seat(s,0,'MHA-1-056','front',1);
 seat(s,0,'MHA-1-050','front',2);
 const stayed=seat(s,1,'MHA-1-078','front',0);
 const twist=hold(s,0,'MHA-1-055');
 const plays=legalUniversalActions(opened.packs,s).filter(action=>action.type==='play'&&action.uid===twist.uid);
 if(!plays.length)throw Error('no 055 play energy '+JSON.stringify(universalEnergyByColor(opened.packs,s,0))+' ap '+s.players[0].apCards.map(c=>c.inPlay&&c.ready).join(',')+' hand '+s.players[0].hand.map(c=>c.cardId).join(','));
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===twist.uid&&action.line==='front');
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0].uid,stayed.uid);
 opened=openDecks(mha,mha,green,red,5502);
 s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-057']);
 readyAp(s,0,2);
 seat(s,0,'MHA-1-051','front',1);
 seat(s,0,'MHA-1-056','front',2);
 seat(s,0,'MHA-1-050','front',3);
 const target=seat(s,1,'MHA-1-078','front',0);
 const again=hold(s,0,'MHA-1-055');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===again.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(target.uid),true);
 s.players[1].deck.push(s.players[1].front[0]);
 s.players[1].front[0]=null;
 assert.throws(()=>dispatchUniversalAction(opened.packs,s,{type:'chooseRetireBp',uid:target.uid}),
  /not currently legal|Illegal/);
 s=act(opened.packs,s,{type:'chooseRetireBp',uid:null});
 assert.equal(s.players[1].outside.some(card=>card.uid===target.uid),false);
});

test('060 raids Midoriya, pays one hand card on attack, and does not pay while blocking or silenced',()=>{
 let opened=openDecks(mha,mha,green,red,6001);
 let s=opened.s;
 fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(s,0,1);
 const base=seat(s,0,'MHA-1-057','front',1,true);
 const topCard=hold(s,0,'MHA-1-060');
 s=act(opened.packs,s,action=>action.type==='raid'&&action.uid===topCard.uid&&action.baseUid===base.uid);
 const raided=s.players[0].front.find(card=>card?.cardId==='MHA-1-060');
 assert.equal(raided.stack.some(card=>card.uid===base.uid),true);
 assert.equal(universalBp(opened.packs,s,raided),4000);
 opened=openDecks(mha,mha,green,red,6002);
 s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-057']);
 const fighter=seat(s,0,'MHA-1-060','front',0,true);
 const ally=seat(s,0,'MHA-1-061','front',1,false);
 const named=seat(s,0,'MHA-1-057','energy',3,false);
 const heavy=seat(s,0,'MHA-1-056','front',2,false);
 const paid=hold(s,0,'MHA-1-044');
 s=reach(opened.packs,s,0,'attack');
 s=act(opened.packs,s,{type:'attack',uid:fighter.uid});
 assert.equal(s.pending.kind,'effect-once-choice');
 s=act(opened.packs,s,{type:'chooseOnceEffect',mode:'skip'});
 assert.equal(s.players[0].hand.some(card=>card.uid===paid.uid),true);
 assert.equal(s.onceEffectUses[0].includes('uid:'+fighter.uid),false);
 opened=openDecks(mha,mha,green,red,6003);
 s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-057']);
 const body=seat(s,0,'MHA-1-060','front',0,true);
 const friend=seat(s,0,'MHA-1-061','front',1,false);
 seat(s,0,'MHA-1-057','energy',3,false);
 seat(s,0,'MHA-1-056','front',2,false);
 const handCard=hold(s,0,'MHA-1-044');
 s=reach(opened.packs,s,0,'attack');
 s=act(opened.packs,s,{type:'attack',uid:body.uid});
 s=act(opened.packs,s,{type:'chooseOnceEffect',mode:'activate'});
 s=act(opened.packs,s,{type:'choosePayHandActive',uid:handCard.uid});
 assert.ok(s.players[0].outside.some(card=>card.uid===handCard.uid));
 assert.equal(s.pending.choices.includes(friend.uid),true);
 assert.equal(s.pending.choices.includes(named.uid),false);
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 s=act(opened.packs,s,{type:'chooseActiveCharacter',uid:friend.uid});
 assert.equal(s.players[0].front[1].ready,true);
 opened=openDecks(mha,mha,green,red,6004);
 s=opened.s;
 const muted=seat(s,0,'MHA-1-060','front',0,true);
 seat(s,0,'MHA-1-061','front',1,false);
 hold(s,0,'MHA-1-044');
 silence(s,muted,0);
 s=reach(opened.packs,s,0,'attack');
 s=act(opened.packs,s,{type:'attack',uid:muted.uid});
 assert.notEqual(s.pending?.kind,'effect-once-choice');
 opened=openDecks(mha,mha,green,red,6005);
 s=opened.s;
 s=reach(opened.packs,s,1,'attack');
 const hitter=seat(s,1,'MHA-1-078','front',0,true);
 const blocker=seat(s,0,'MHA-1-060','front',0,true);
 const before=s.players[0].hand.length;
 s=act(opened.packs,s,{type:'attack',uid:hitter.uid});
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===blocker.uid);
 assert.notEqual(s.pending?.kind,'effect-once-choice');
 assert.notEqual(s.pending?.kind,'effect-pay-hand-active');
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.players[0].front[0].uid,blocker.uid);
 assert.equal(s.players[1].front[0].uid,hitter.uid);
});

test('062 enters active beside Mei, then the activation buffs characters already on the field',()=>{
 let opened=openDecks(mha,mha,green,red,6201);
 let s=opened.s;
 fuel(s,0,['MHA-1-057','MHA-1-057']);
 readyAp(s,0,1);
 const field=hold(s,0,'MHA-1-062');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===field.uid&&action.line==='energy');
 const rested=s.players[0].energy.find(card=>card?.cardId==='MHA-1-062');
 assert.equal(rested.ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=act(opened.packs,s,action=>action.uid===null);
 silence(s,rested,0);
 rested.ready=true;
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.type==='activate'&&action.uid===rested.uid),false);
 opened=openDecks(mha,mha,green,red,6202);
 s=opened.s;
 fuel(s,0,['MHA-1-057','MHA-1-057']);
 readyAp(s,0,2);
 const mei=seat(s,0,'MHA-1-054','front',0,true);
 const ally=seat(s,0,'MHA-1-061','front',1,true);
 const workshop=hold(s,0,'MHA-1-062');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===workshop.uid&&action.line==='energy'&&action.slot===2);
 assert.equal(s.players[0].energy[2].ready,true);
 s=act(opened.packs,s,action=>action.type==='chooseOwnBuff'&&action.uid===mei.uid);
 assert.equal(universalBp(opened.packs,s,s.players[0].front[0]),3500);
 const site=s.players[0].energy[2];
 s=act(opened.packs,s,{type:'activate',uid:site.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.ok(s.players[0].outside.some(card=>card.uid===site.uid));
 assert.equal(s.players[0].front[0].buffs.some(buff=>buff.bp===500),true);
 assert.equal(s.players[0].front[1].buffs.some(buff=>buff.bp===500),true);
 readyAp(s,0,1);
 const laterHand=hold(s,0,'MHA-1-057');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===laterHand.uid&&action.line==='front');
 const later=s.players[0].front.find(card=>card?.cardId==='MHA-1-057');
 assert.equal((later.buffs||[]).some(buff=>buff.bp===500),false);
 void ally;
});

test('066 looks at three cards, then rest-plays All Might only against three front characters',()=>{
 let opened=openDecks(mha,mha,green,red,6601);
 let s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037']);
 readyAp(s,0,2);
 for(let slot=0;slot<3;slot++)seat(s,1,'MHA-1-078','front',slot,true);
 const might=hold(s,0,'MHA-1-044');
 const event=hold(s,0,'MHA-1-066');
 const eventCard=pull(s,0,'MHA-1-064');
 const shown=pull(s,0,'MHA-1-057');
 const other=pull(s,0,'MHA-1-041');
 s.players[0].deck.unshift(eventCard,shown,other);
 s=act(opened.packs,s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(s.pending.uids.length,3);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.uid===eventCard.uid),false);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.uid===shown.uid),true);
 s=act(opened.packs,s,action=>action.type==='chooseTopScript'&&action.uid===shown.uid);
 s=orderBottom(opened.packs,s);
 assert.equal(s.pending.kind,'effect-hand-rest');
 s=act(opened.packs,s,action=>action.type==='chooseHandRest'&&action.uid===might.uid&&action.line==='front');
 assert.equal(s.players[0].front.find(card=>card?.uid===might.uid).ready,true);
 opened=openDecks(mha,mha,green,red,6602);
 s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037']);
 readyAp(s,0,2);
 seat(s,1,'MHA-1-078','front',0,true);
 const quiet=hold(s,0,'MHA-1-044');
 const second=hold(s,0,'MHA-1-066');
 s=act(opened.packs,s,action=>action.type==='event'&&action.uid===second.uid);
 if(s.pending?.kind==='effect-top-script'){
  s=act(opened.packs,s,{type:'chooseTopScript',mode:'skip'});
  s=orderBottom(opened.packs,s);
 }
 s=act(opened.packs,s,action=>action.type==='chooseHandRest'&&action.uid===quiet.uid&&action.line==='front');
 assert.equal(s.players[0].front.find(card=>card?.uid===quiet.uid).ready,false);
});

test('072 pays hand cards to outside on entry and attack, and a block does not pay',()=>{
 let opened=openDecks(mha,mha,red,green,7201);
 let s=opened.s;
 fuel(s,0,['MHA-1-069','MHA-1-077','MHA-1-078']);
 readyAp(s,0,2);
 const self=hold(s,0,'MHA-1-072');
 s.players[0].deck.push(...s.players[0].hand.filter(card=>card!==self));
 s.players[0].hand=[self];
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-discard-any');
 s=act(opened.packs,s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(s.players[0].hand.length,3);
 opened=openDecks(mha,mha,red,green,7202);
 s=opened.s;
 const unit=seat(s,0,'MHA-1-072','front',0,true);
 const low=seat(s,1,'MHA-1-044','front',0);
 const high=seat(s,1,'MHA-1-056','front',1);
 const pay=hold(s,0,'MHA-1-078');
 assert.equal(universalAttackDamage(opened.packs,s,unit),2);
 s=reach(opened.packs,s,0,'attack');
 s=act(opened.packs,s,{type:'attack',uid:unit.uid});
 assert.equal(s.pending.mode,'retireScale');
 s=act(opened.packs,s,{type:'chooseDiscardAny',mode:'take',uid:pay.uid});
 s=act(opened.packs,s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(s.pending.limit,1000);
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 s=act(opened.packs,s,{type:'chooseRetireBp',uid:low.uid});
 assert.ok(s.players[1].outside.some(card=>card.uid===low.uid));
 opened=openDecks(mha,mha,red,green,7203);
 s=opened.s;
 s=reach(opened.packs,s,1,'attack');
 const hitter=seat(s,1,'MHA-1-044','front',0,true);
 const blocker=seat(s,0,'MHA-1-072','front',0,true);
 const before=s.players[0].outside.length;
 s=act(opened.packs,s,{type:'attack',uid:hitter.uid});
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===blocker.uid);
 assert.notEqual(s.pending?.kind,'effect-discard-any');
 assert.equal(s.players[0].outside.length,before);
 assert.equal(s.players[0].front[0].uid,blocker.uid);
 assert.equal(s.players[1].front[0].uid,hitter.uid);
});

test('076 moves from energy, and a full front removes one character first',()=>{
 let opened=openDecks(mha,mha,red,green,7601);
 let s=opened.s;
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,0,1);
 const back=hold(s,0,'MHA-1-076');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===back.uid&&action.line==='energy'&&action.slot===2);
 assert.equal(s.pending,null);
 opened=openDecks(mha,mha,red,green,7602);
 s=opened.s;
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,0,1);
 const energy=seat(s,0,'MHA-1-078','energy',2,false);
 seat(s,0,'MHA-1-073','front',1,true);
 seat(s,0,'MHA-1-080','front',2,true);
 seat(s,0,'MHA-1-069','front',3,true);
 const full=hold(s,0,'MHA-1-076');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===full.uid&&action.line==='front'&&action.slot===0);
 assert.equal(s.pending.kind,'effect-front-vacate');
 const other=s.players[0].front[1].uid;
 assert.throws(()=>dispatchUniversalAction(opened.packs,s,{type:'chooseFrontVacate',uid:energy.uid}),
  /not currently legal/);
 s=act(opened.packs,s,{type:'chooseFrontVacate',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].removed.length,0);
 assert.equal(s.players[0].energy[2].uid,energy.uid);
 opened=openDecks(mha,mha,red,green,7603);
 s=opened.s;
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,0,1);
 const mover=seat(s,0,'MHA-1-078','energy',2,false);
 seat(s,0,'MHA-1-073','front',1,true);
 seat(s,0,'MHA-1-080','front',2,true);
 seat(s,0,'MHA-1-069','front',3,true);
 const moverCard=hold(s,0,'MHA-1-076');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===moverCard.uid&&action.line==='front'&&action.slot===0);
 s=act(opened.packs,s,{type:'chooseFrontVacate',uid:s.players[0].front[1].uid});
 assert.ok(s.players[0].removed.some(card=>card.cardId==='MHA-1-073'));
 assert.equal(s.players[0].outside.some(card=>card.cardId==='MHA-1-073'),false);
 s=act(opened.packs,s,action=>action.type==='chooseEnergyTraitFront'&&action.uid===mover.uid&&action.slot===1);
 assert.equal(s.players[0].front[1].uid,mover.uid);
 const parked=s.players[0].front[0];
 silence(s,parked,0);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.type==='activate'&&action.uid===parked.uid),false);
});

test('081 raids Todoroki, and the rested character misses the next active',()=>{
 let opened=openDecks(mha,mha,red,green,8101);
 let s=opened.s;
 fuel(s,0,['MHA-1-069','MHA-1-077']);
 readyAp(s,0,1);
 while(s.players[1].life.length>4)s.players[1].deck.push(s.players[1].life.pop());
 const base=seat(s,0,'MHA-1-078','front',1,true);
 const topCard=hold(s,0,'MHA-1-081');
 s=act(opened.packs,s,action=>action.type==='raid'&&action.uid===topCard.uid&&action.baseUid===base.uid);
 const raided=s.players[0].front.find(card=>card?.cardId==='MHA-1-081');
 assert.equal(raided.stack.some(card=>card.uid===base.uid),true);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.mode==='hurt'),false);
 const foe=seat(s,1,'MHA-1-057','front',0,true);
 s=act(opened.packs,s,{type:'chooseEffectMode',mode:'rest'});
 s=act(opened.packs,s,{type:'chooseRestBp',uid:foe.uid});
 assert.equal(s.players[1].front[0].ready,false);
 s=reach(opened.packs,s,1,'main');
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.continuousStates.some(entry=>entry.kind==='skipNextActive'&&
  entry.targetUid===foe.uid&&!entry.consumed),false);
 opened=openDecks(mha,mha,red,green,8102);
 s=opened.s;
 fuel(s,0,['MHA-1-069','MHA-1-077']);
 readyAp(s,0,1);
 while(s.players[1].life.length>5)s.players[1].deck.push(s.players[1].life.pop());
 while(s.players[1].life.length<5)s.players[1].life.push(s.players[1].deck.pop());
 const shoto=hold(s,0,'MHA-1-081');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===shoto.uid&&action.line==='front');
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.mode==='hurt'),true);
 const life=s.players[1].life.length;
 s.players[1].deck.push(...s.players[1].life.splice(0,life-4));
 assert.throws(()=>dispatchUniversalAction(opened.packs,s,{type:'chooseEffectMode',mode:'hurt'}),
  /not currently legal|Printed choice gate failed/);
 const muted=s.players[0].front.find(card=>card?.cardId==='MHA-1-081');
 s=act(opened.packs,s,{type:'chooseEffectMode',mode:'rest'});
 if(s.pending)s=act(opened.packs,s,action=>action.uid===null||action.mode==='skip');
 silence(s,muted,0);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.type==='activate'&&action.uid===muted.uid),false);
});

test('084 widens the next BP choice once, and a silenced copy cannot activate',()=>{
 let opened=openDecks(mha,mha,red,green,8401);
 let s=opened.s;
 fuel(s,0,['MHA-1-069','MHA-1-077']);
 readyAp(s,0,2);
 const unit=seat(s,0,'MHA-1-084','front',0,true);
 const sidelined=seat(s,0,'MHA-1-084','energy',3,true);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.type==='activate'&&action.uid===sidelined.uid),false);
 s=act(opened.packs,s,{type:'activate',uid:unit.uid,mode:'frontOnce'});
 assert.deepEqual(s.bpWindowPlus,[1000,0]);
 const event=hold(s,0,'MHA-1-099');
 const extras=[];
 while(s.players[0].hand.length<5)extras.push(pull(s,0,'MHA-1-078'));
 for(const card of extras)if(!s.players[0].hand.includes(card))s.players[0].hand.push(card);
 const small=seat(s,1,'MHA-1-044','front',0);
 const wide=seat(s,1,'MHA-1-055','front',1);
 assert.ok(s.players[0].hand.length>3);
 s=act(opened.packs,s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(small.uid),true);
 assert.equal(s.pending.choices.includes(wide.uid),true);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.uid===null),false);
 assert.equal(s.bpWindowPlus[0],0);
 s=act(opened.packs,s,{type:'chooseRetireBp',uid:small.uid});
 assert.ok(s.players[1].outside.some(card=>card.uid===small.uid));
 silence(s,unit,0);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>action.type==='activate'&&action.uid===unit.uid),false);
 opened=openDecks(mha,mha,red,green,8402);
 s=opened.s;
 const window=seat(s,0,'MHA-1-084','front',1,true);
 const striker=seat(s,0,'MHA-1-072','front',0,true);
 const thousand=seat(s,1,'MHA-1-044','front',0);
 const above=seat(s,1,'MHA-1-056','front',1);
 s=act(opened.packs,s,{type:'activate',uid:window.uid,mode:'frontOnce'});
 s=reach(opened.packs,s,0,'attack');
 s=act(opened.packs,s,{type:'attack',uid:striker.uid});
 const discarded=hold(s,0,'MHA-1-078');
 s=act(opened.packs,s,{type:'chooseDiscardAny',mode:'take',uid:discarded.uid});
 s=act(opened.packs,s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(s.pending.limit,1000);
 assert.equal(s.pending.choices.includes(thousand.uid),true);
 assert.equal(s.pending.choices.includes(above.uid),false);
 assert.equal(s.bpWindowPlus[0],1000);
});

test('a facedown card under Fat Gum stays hidden, including after another match starts',()=>{
 const opened=openDecks(mha,mha,green,purple,5601);
 let s=opened.s;
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-044']);
 readyAp(s,0,1);
 const secret=hold(s,0,'MHA-1-061');
 const gum=hold(s,0,'MHA-1-056');
 s=act(opened.packs,s,action=>action.type==='play'&&action.uid===gum.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-tuck-facedown');
 s=act(opened.packs,s,{type:'chooseTuckFacedown',uid:secret.uid});
 if(s.pending)s=act(opened.packs,s,action=>action.uid===null||action.mode==='skip'||action.mode==='draw');
 const foe=universalPublicView(opened.packs,s,1);
 const own=universalPublicView(opened.packs,s,0);
 assert.equal(JSON.stringify(foe).includes(secret.uid),false);
 assert.equal(JSON.stringify(foe).includes('MHA-1-061'),false);
 const foeHost=foe.players[0].front.find(card=>card?.cardId==='MHA-1-056');
 const ownHost=own.players[0].front.find(card=>card?.cardId==='MHA-1-056');
 assert.deepEqual(foeHost.underLayers[0],{faceDown:true});
 assert.equal(facedownTitle(facedownInspectModel(foeHost)),'對手的裏向卡');
 assert.equal(facedownInspectModel(ownHost).cards[0].cardId,'MHA-1-061');
 const frozen=JSON.stringify(foe);
 const again=openDecks(mha,mha,green,purple,5602);
 assert.equal(JSON.stringify(universalPublicView(opened.packs,s,1)),frozen);
 assert.equal(JSON.stringify(universalPublicView(again.packs,again.s,1)).includes(secret.uid),false);
});

test('online life selection for damage 2 shows positions, and the raid base stays visible',()=>{
 const opened=openDecks(mha,mha,red,green,7204,{attackerChoosesLife:true});
 let s=opened.s;
 const unit=seat(s,0,'MHA-1-072','front',0,true);
 s.players[1].front=s.players[1].front.map(()=>null);
 s=reach(opened.packs,s,0,'attack');
 s=act(opened.packs,s,{type:'attack',uid:unit.uid});
 if(s.pending?.kind==='effect-discard-any')s=act(opened.packs,s,{type:'chooseDiscardAny',mode:'skip'});
 if(s.pending?.kind==='block')s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
 assert.equal(s.pending.kind,'attack-life-target');
 assert.equal(s.pending.count,2);
 const choices=legalUniversalActions(opened.packs,s).filter(action=>action.type==='chooseAttackLife');
 assert.ok(choices.length>=1);
 const room={seat:0,status:'playing',view:{phase:'attack',active:0,actor:0,
  pending:{kind:'attack-life-target',player:0,defender:1,count:s.pending.count},
  players:[{lifeCount:s.players[0].life.length,hand:[],front:[],energy:[]},
   {lifeCount:s.players[1].life.length,hand:[],front:[],energy:[]}]}};
 const view=onlineBattleView(room);
 assert.equal(view.pending.count,2);
 const dispatched=[];
 const picker=makeAttackLifePicker({el,lifeCount:s.players[1].life.length,count:2,
  actions:choices,onAction:action=>dispatched.push(action)});
 const slots=picker.querySelectorAll('.v2-life-picker-slot');
 assert.equal(slots.length,s.players[1].life.length);
 assert.equal(texts(picker).includes('MHA-1-'),false);
 slots[0].handlers.click();
 slots[1].handlers.click();
 picker.querySelector('.v2-life-picker-confirm').handlers.click();
 assert.equal(dispatched.length,1);
 assert.deepEqual(dispatched[0].indices.slice().sort((a,b)=>a-b),[0,1]);
 s=act(opened.packs,s,dispatched[0]);
 assert.equal(s.players[1].life.length<=5,true);
 const raid=openDecks(mha,mha,green,red,6006);
 let board=raid.s;
 fuel(board,0,['MHA-1-057','MHA-1-057','MHA-1-041']);
 readyAp(board,0,1);
 const base=seat(board,0,'MHA-1-057','front',0,true);
 const secret=pull(board,0,'MHA-1-061');
 secret.faceDown=true;
 base.under=[secret];
 const rider=hold(board,0,'MHA-1-060');
 board=act(raid.packs,board,action=>action.type==='raid'&&action.uid===rider.uid&&action.baseUid===base.uid);
 const ownerView=universalPublicView(raid.packs,board,0);
 const foeView=universalPublicView(raid.packs,board,1);
 const ownCard=ownerView.players[0].front.find(card=>card?.cardId==='MHA-1-060');
 const foeCard=foeView.players[0].front.find(card=>card?.cardId==='MHA-1-060');
 assert.deepEqual(visibleRaidBaseCards(ownCard),[{cardId:'MHA-1-057',uid:base.uid}]);
 assert.deepEqual(visibleRaidBaseCards(foeCard),[{cardId:'MHA-1-057',uid:base.uid}]);
 assert.equal(JSON.stringify(foeCard).includes(secret.uid),false);
 assert.equal(JSON.stringify(foeCard).includes('MHA-1-061'),false);
 const root=new FakeNode('div');
 const previous=globalThis.document;
 globalThis.document={activeElement:null,body:root,querySelector:selector=>
  selector==='.online-battle-shell'?root:null};
 try{
  showOnlineCard({el,card:foeCard,definition:{name:'緑谷 出久',effect:editorById['MHA-1-060'].effectJa},
   src:editorById['MHA-1-060'].image,
   nameOf:id=>editorById[id]?.nameJa||id,
   imageOf:id=>editorById[id]?.image||'',
   effectOf:id=>editorById[id]?.effectJa||''});
  const sheet=root.querySelector('.online-raid-base-section');
  const shown=texts(sheet);
  assert.match(shown,/突襲底板/);
  assert.match(shown,/緑谷 出久/);
  assert.equal(shown.includes(secret.uid),false);
  assert.equal(shown.includes('MHA-1-061'),false);
 }finally{globalThis.document=previous;}
});

test('IMC stays playable against MHA, and BLEACH battle-remove stays in removed',()=>{
 assert.equal(getTitle('imc').playable,true);
 const versusImc=openDecks(mha,imc,purple,fillDeck(imc,{'IMC-1-001':4,'IMC-1-007':4}),1605,
  {attackerChoosesLife:true});
 let s=versusImc.s;
 assert.equal(s.title,'cross-title');
 s=reach(versusImc.packs,s,0,'attack');
 const attacker=seat(s,0,'MHA-1-008','front',0,true);
 s.players[1].front=s.players[1].front.map(()=>null);
 s=act(versusImc.packs,s,{type:'attack',uid:attacker.uid});
 if(s.pending?.kind==='block')s=act(versusImc.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(s.pending?.kind==='attack-life-target'){
  assert.equal(s.pending.player,0);
  s=act(versusImc.packs,s,action=>action.type==='chooseAttackLife');
 }
 assert.equal(getTitle('imc').playable,true);
 assert.equal(getTitle('mha').playable,false);
 const versusBleach=openDecks(mha,bleach,red,fillDeck(bleach,{
  'BLC-1-092':2,'BLC-1-002':4,'BLC-1-078':4
 }),1606);
 s=reach(versusBleach.packs,versusBleach.s,1,'attack');
 const winner=seat(s,1,'BLC-1-092','front',0,true);
 const loser=seat(s,0,'MHA-1-073','front',0,true);
 assert.equal(bleach.cards['BLC-1-092'].battleRemoveInstead,true);
 s=act(versusBleach.packs,s,{type:'attack',uid:winner.uid});
 s=act(versusBleach.packs,s,action=>action.type==='chooseBlock'&&action.uid===loser.uid);
 assert.ok(s.players[0].removed.some(card=>card.uid===loser.uid));
 assert.equal(s.players[0].outside.some(card=>card.uid===loser.uid),false);
});

test('easy, normal, hard and hybrid actions stay legal in MHA, IMC and BLEACH matches',()=>{
 const pairs=[
  ['mha',openDecks(mha,mha,green,red,1611)],
  ['imc',openDecks(mha,imc,purple,fillDeck(imc,{'IMC-1-001':4}),1612)],
  ['bleach',openDecks(mha,bleach,red,fillDeck(bleach,{'BLC-1-002':4}),1613)]
 ];
 for(const [label,opened] of pairs){
  for(const difficulty of ['easy','normal','hard']){
   let cursor=opened.s;
   for(let step=0;step<8;step++){
    const legal=legalUniversalActions(opened.packs,cursor);
    const chosen=chooseUniversalAiAction(opened.packs,cursor,{difficulty});
    assert.ok(legal.some(action=>same(action,chosen)),
     label+' '+difficulty+' step '+step+' '+JSON.stringify(chosen));
    const safe=chooseProgressSafeAiAction(opened.packs,cursor,{difficulty,actionsInPhase:0});
    assert.equal(safe.reason,null,label+' '+difficulty);
    cursor=act(opened.packs,cursor,chosen);
   }
  }
  let hybrid=opened.s;
  for(let step=0;step<3;step++){
   const legal=legalUniversalActions(opened.packs,hybrid);
   const chosen=chooseHybridMainAction(opened.packs,hybrid,{nodes:48,ms:40,seed:1611+step});
   assert.ok(legal.some(action=>same(action,chosen)),
    label+' hybrid step '+step+' '+JSON.stringify(chosen));
   hybrid=act(opened.packs,hybrid,chosen);
  }
 }
 assert.equal(getTitle('mha').playable,false);
 assert.equal(getTitle('imc').playable,true);
});
