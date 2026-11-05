import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {createKmrV2Pack,KMR_STARTER_IDS} from '../dist/universal-v2/kmr-pack.mjs';
import {kmr2EngineKind} from '../dist/universal-v2/kmr2-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {createKmrBattlePack,kmrPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {uiActionLabel,controllerChoiceArt,fieldEffectCopy,pendingFocusCard} from '../dist/universal-v2/preview-actions.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const set1=createKmrV2Pack();
const pack=createKmrBattlePack();
const packs=[pack,pack];
const STARTER=new Set(KMR_STARTER_IDS);

test('EX12BT registers 100 identities and the battle pack keeps both sets',()=>{
 assert.equal(KMR2_CARDS.length,100);
 assert.deepEqual(KMR2_CARDS.map(c=>c.id),Array.from({length:100},(_,i)=>'KMR-2-'+String(i+1).padStart(3,'0')));
 assert.equal(KMR2_CARDS.some(c=>c.id.includes('_p')||c.id.includes('AP')),false);
 assert.equal(Object.keys(set1.cards).length,113);
 assert.equal(Object.keys(pack.cards).length,216);
 assert.ok(pack.cards['KMR-1-001']);
 assert.ok(pack.cards['KMR-2-001']);
 assert.equal(new Set(Object.keys(pack.cards)).size,216);
 assert.equal(V2_TITLE_IDS.includes('kmr'),false);
 for(const card of KMR2_CARDS){
  assert.equal(kmr2EngineKind(card.effectJa),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa,card.id);
  assert.match(card.image,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\/EX12BT_KMR-2-\d\d\d\.png$/);
  assert.match(card.sourceTc,/unionarena-tcg\.com\/tc\/cardlist\/detail_iframe\.php/);
  if((card.effectJa||'').trim())assert.notEqual((card.effect||'').trim(),'',card.id);
  assert.equal(card.effect.includes('沒有可顯示的效果'),false);
  assert.equal(/\b(DRAW|GET|ACTIVE|RAID|SPECIAL|FINAL|COLOR)\b/.test(card.triggerText||''),false,card.id);
 }
 const shown=fieldEffectCopy(KMR2_CARDS.find(c=>c.id==='KMR-2-001'));
 assert.match(shown,/登場時/);
 assert.equal(shown.includes('沒有可顯示的效果'),false);
});

test('the yellow practice deck stays on the 18 set-1 identities',()=>{
 const built=kmrPracticeDeck();
 const ids=Object.keys(built.counts);
 assert.equal(Object.values(built.counts).reduce((n,x)=>n+x,0),50);
 assert.equal(ids.every(id=>STARTER.has(id)),true);
 assert.equal(ids.some(id=>id.startsWith('KMR-2-')),false);
 assert.equal(editorV2Status('kmr',built.counts).ready,true);
});

function fill(required,extra={}){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={...extra};
 for(const id of [...new Set(required)]){
  if(counts[id])continue;
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(Object.prototype.hasOwnProperty.call(caps,trigger)){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(pack.cards[id].maxCopies||4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 return counts;
}
function fresh(counts){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:12,first:0});
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
 s.pending=null;s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}

test('口嚼獸 may be 10 copies and other vol.2 cards stay at 4',()=>{
 const ten=fill(['KMR-2-001'],{'KMR-2-013':10});
 assert.deepEqual(validateUniversalDeck(pack,ten),[]);
 const eleven=fill(['KMR-2-001'],{'KMR-2-013':11});
 assert.match(validateUniversalDeck(pack,eleven).join(';'),/KMR-2-013/);
 const five=fill([],{'KMR-2-001':5});
 assert.match(validateUniversalDeck(pack,five).join(';'),/KMR-2-001/);
 assert.equal(KMR2_CARDS.find(c=>c.id==='KMR-2-013').maxCopies,10);
});

test('shared vol.2 sentences stay on the existing profiles',()=>{
 for(const id of ['KMR-2-016','KMR-2-027','KMR-2-043','KMR-2-062','KMR-2-078','KMR-2-081','KMR-2-098'])
  assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'recoverAp',count:2}]);
 for(const id of ['KMR-2-037','KMR-2-064'])
  assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(pack.cards['KMR-2-045'].effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 assert.equal(pack.cards['KMR-2-053'].ownTurnBp,1000);
 assert.equal(pack.cards['KMR-2-066'].activeExtraEnergy,1);
 assert.equal(pack.cards['KMR-2-092'].activeExtraEnergy,1);
 for(const id of ['KMR-2-010','KMR-2-029','KMR-2-036','KMR-2-050','KMR-2-090'])
  assert.equal(pack.cards[id].implementation,'vanilla');
 assert.equal(pack.cards['KMR-2-049'].raidNameAlsoIncludes,'ジョーカー');
 assert.equal(pack.cards['KMR-2-055'].raidOnlyEntry,true);
});

test('VALEN looks at two cards and can put the matching one outside',()=>{
 const s=fresh(fill(['KMR-2-001','KMR-2-005','KMR-2-020']));
 const match=take(s,0,'KMR-2-005'),other=take(s,0,'KMR-2-020');
 s.players[0].deck.unshift(match,other);
 const rider=take(s,0,'KMR-2-001');
 s.players[0].hand.push(rider);
 ready(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.ok(play);
 let state=dispatchUniversalAction(packs,s,play);
 assert.equal(state.pending?.kind,'kmr2');
 const takeAction=state.pending.actions.find(a=>a.mode==='outside'&&a.uid===match.uid);
 assert.ok(takeAction);
 for(const action of state.pending.actions){
  const label=uiActionLabel(action,{pack,state});
  assert.equal(/[A-Za-z]/.test(label),false,label);
 }
 assert.equal(controllerChoiceArt(packs,state,takeAction)[0]?.cardId,'KMR-2-005');
 state=dispatchUniversalAction(packs,state,takeAction);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(c=>c.uid===match.uid),true);
 assert.equal(state.players[0].deck[0]?.uid,other.uid);
});

test('口嚼獸 draws only when no character is on the field, and draws again when it retires',()=>{
 const s=fresh(fill(['KMR-2-013','KMR-2-001','KMR-2-002']));
 put(s,0,'KMR-2-001','front',0,true);
 const blocked=take(s,0,'KMR-2-013');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(blocked);
 ready(s);
 const busy=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===blocked.uid);
 let state=dispatchUniversalAction(packs,s,busy);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,0);
 const field=state.players[0].front.find(c=>c?.cardId==='KMR-2-013')||
  state.players[0].energy.find(c=>c?.cardId==='KMR-2-013');
 assert.equal(field.cardId,'KMR-2-013');
 const actor=put(state,0,'KMR-2-002','front',1,false);
 const before=state.players[0].hand.length;
 ready(state);
 const activate=legalUniversalActions(packs,state).find(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='kmr2:KMR-2-002:a');
 assert.ok(activate);
 assert.equal(uiActionLabel(activate,{pack,state}).includes('起動主要'),true);
 assert.equal(/kmr/i.test(uiActionLabel(activate,{pack,state})),false);
 state=dispatchUniversalAction(packs,state,activate);
 const retire=state.pending.actions.find(a=>a.uid===field.uid);
 state=dispatchUniversalAction(packs,state,retire);
 assert.equal(state.players[0].outside.some(c=>c.uid===field.uid),true);
 assert.equal(state.players[0].hand.length,before+1);
});

test('two-token raid accepts サイクロンジョーカー and Fang Joker cannot be played from hand',()=>{
 const s=fresh(fill(['KMR-2-048','KMR-2-049','KMR-2-050','KMR-2-055'],{'KMR-2-045':2}));
 const host=put(s,0,'KMR-2-048','front',0,true);
 const lone=put(s,0,'KMR-2-050','front',1,true);
 put(s,0,'KMR-2-045','energy',0,true);
 put(s,0,'KMR-2-045','energy',1,true);
 const rider=take(s,0,'KMR-2-049');
 const fang=take(s,0,'KMR-2-055');
 s.players[0].hand.push(rider,fang);
 ready(s);
 const legal=legalUniversalActions(packs,s);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===host.uid),true);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===lone.uid),false);
 assert.equal(legal.some(a=>a.type==='play'&&a.uid===fang.uid),false);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===fang.uid&&a.baseUid===host.uid),true);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===fang.uid&&a.baseUid===lone.uid),false);
});

test('a vol.2 pending choice does not fall through the AI play path',()=>{
 const s=fresh(fill(['KMR-2-001']));
 s.pending={kind:'kmr2',player:0,sourceUid:'0-1',id:'KMR-2-001',step:'lookPick',
  actions:[{type:'kmr2',mode:'skip'},{type:'kmr2',mode:'outside',uid:'0-2'}]};
 const chosen=chooseUniversalAiAction(packs,s);
 assert.equal(chosen.type,'kmr2');
 assert.equal(chosen.mode,'outside');
});

function click(state,pred){
 const action=state.pending?.actions?.find(pred);
 assert.ok(action);
 return dispatchUniversalAction(packs,state,action);
}
function setupAsk(ids,extra){
 const s=fresh(fill(ids,extra));
 const drawn=take(s,0,'KMR-2-010');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].deck.unshift(drawn);
 return {s,drawn};
}

test('不准問我問題 lets the player choose the character, including none',()=>{
 const {s,drawn}=setupAsk(['KMR-2-060','KMR-2-048','KMR-2-072','KMR-2-010']);
 const event=take(s,0,'KMR-2-060');
 const kiva=take(s,0,'KMR-2-072');
 const luna=take(s,0,'KMR-2-048');
 s.players[0].hand.push(event,kiva,luna);
 ready(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 let state=dispatchUniversalAction(packs,s,play);
 assert.equal(state.pending?.step,'deployPick');
 assert.deepEqual(state.pending.actions.filter(a=>a.mode==='deploy').map(a=>a.uid).sort(),
  [kiva.uid,luna.uid].sort());
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 for(const action of state.pending.actions){
  const label=uiActionLabel(action,{pack,state});
  assert.equal(label.includes('執行'),false,label);
  assert.equal(/kmr/i.test(label),false,label);
 }
 state=click(state,a=>a.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===kiva.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===luna.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===drawn.uid),true);
});

test('the character entered by 不准問我問題 does not use its on-play effect',()=>{
 const {s}=setupAsk(['KMR-2-060','KMR-2-048','KMR-2-072','KMR-2-010']);
 const event=take(s,0,'KMR-2-060');
 const kiva=take(s,0,'KMR-2-072');
 const luna=take(s,0,'KMR-2-048');
 s.players[0].hand.push(event,kiva,luna);
 ready(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 let state=dispatchUniversalAction(packs,s,play);
 state=click(state,a=>a.mode==='deploy'&&a.uid===luna.uid);
 state=click(state,a=>a.mode==='enter'&&a.uid===luna.uid&&a.line==='front');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].front.find(c=>c?.uid===luna.uid)?.ready,false);
 assert.equal(state.players[0].hand.some(c=>c.uid===kiva.uid),true);
});

function diendBoard(){
 const s=fresh(fill(['KMR-2-063','KMR-2-070','KMR-2-072','KMR-2-020','KMR-2-010'],{'KMR-2-045':2}));
 put(s,0,'KMR-2-045','energy',0,true);
 put(s,0,'KMR-2-045','energy',1,true);
 const rider=take(s,0,'KMR-2-063');
 const agito=take(s,0,'KMR-2-070');
 const kiva=take(s,0,'KMR-2-072');
 const top=take(s,0,'KMR-2-020');
 const under=take(s,0,'KMR-2-010');
 s.players[0].outside.push(...s.players[0].deck.splice(0),...s.players[0].hand.splice(0));
 s.players[0].deck.push(top,under);
 s.players[0].hand.push(rider,agito,kiva);
 ready(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.ok(play);
 let state=dispatchUniversalAction(packs,s,play);
 assert.equal(state.pending?.step,'lookOrder');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.pending?.step,'deployPick');
 return {state,agito,kiva};
}

test('DIEND asks for each re-imagination character, including the second',()=>{
 const {state:opened,agito,kiva}=diendBoard();
 let state=opened;
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 assert.deepEqual(state.pending.actions.filter(a=>a.mode==='deploy').map(a=>a.uid).sort(),
  [agito.uid,kiva.uid].sort());
 state=click(state,a=>a.mode==='deploy'&&a.uid===agito.uid);
 state=click(state,a=>a.mode==='enter'&&a.uid===agito.uid&&a.line==='front');
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.pending.actions.some(a=>a.uid===agito.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='deploy'&&a.uid===kiva.uid),true);
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 state=click(state,a=>a.mode==='deploy'&&a.uid===kiva.uid);
 state=click(state,a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='energy');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].front.find(c=>c?.uid===agito.uid)?.ready,false);
 assert.equal(state.players[0].energy.find(c=>c?.uid===kiva.uid)?.ready,false);
});

test('DIEND can leave both re-imagination characters in hand',()=>{
 const {state:opened,agito,kiva}=diendBoard();
 const state=click(opened,a=>a.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===agito.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===kiva.uid),true);
});

test('a two-way vol.2 choice names the printed effect',()=>{
 const pending=id=>({pending:{id,step:'mode'}});
 const draw=uiActionLabel({type:'kmr2',mode:'one',key:'draw'},{pack,state:pending('KMR-2-018')});
 const raid=uiActionLabel({type:'kmr2',mode:'two',key:'raid'},{pack,state:pending('KMR-2-018')});
 assert.match(draw,/抽 1 張/);
 assert.match(raid,/抽 2 張/);
 assert.notEqual(draw,raid);
 assert.equal(draw.includes('選擇第一項'),false);
 assert.equal(/[A-Za-z]/.test(draw+raid),false,draw+' / '+raid);
 assert.equal(/執行|kmr/i.test(draw+raid),false);
 const tuck=uiActionLabel({type:'kmr2',mode:'one',key:'tuck'},{pack,state:pending('KMR-2-022')});
 assert.match(tuck,/EX-AID/);
 assert.equal(tuck.includes('選擇第一項'),false);
 const top=uiActionLabel({type:'kmr2',mode:'one',key:'top'},{pack,state:pending('KMR-2-054')});
 const alt=uiActionLabel({type:'kmr2',mode:'two',key:'draw'},{pack,state:pending('KMR-2-054')});
 assert.match(top,/牌組/);
 assert.match(alt,/抽最多 1 張/);
 assert.equal(/[A-Za-z]/.test(top+alt),false);
});

function passionBoard(handIds,{small=true}={}){
 const s=fresh(fill(
  ['KMR-2-068','KMR-2-064','KMR-2-070','KMR-2-071','KMR-2-072','KMR-2-063','KMR-2-010','KMR-2-020'],
  {'KMR-2-045':3,'KMR-2-072':2}
 ));
 put(s,0,'KMR-2-045','energy',0,true);
 put(s,0,'KMR-2-045','energy',1,true);
 put(s,0,'KMR-2-045','energy',2,true);
 const decade=put(s,0,'KMR-2-064','front',0,true);
 const rider=take(s,0,'KMR-2-068');
 const drawn=take(s,0,'KMR-2-010');
 const filler=take(s,0,'KMR-2-020');
 const hand=handIds.map(id=>take(s,0,id));
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].deck.unshift(drawn);
 s.players[0].hand.push(rider,filler,...hand);
 const foeSmall=small?put(s,1,'KMR-2-072','front',0,true):null;
 const foeMid=put(s,1,'KMR-2-071','front',1,true);
 const foeBig=put(s,1,'KMR-2-063','front',2,true);
 ready(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===decade.uid);
 assert.ok(play);
 let state=dispatchUniversalAction(packs,s,play);
 assert.equal(state.pending?.id,'KMR-2-068');
 assert.equal(state.pending?.step,'removeTwo');
 assert.equal(state.players[0].hand.some(c=>c.uid===drawn.uid),true);
 const offered=state.pending.actions.filter(a=>a.mode==='remove').map(a=>a.uid).sort();
 assert.deepEqual(offered,hand.map(c=>c.uid).sort());
 assert.equal(state.pending.actions.some(a=>a.uid===filler.uid),false);
 assert.equal(state.pending.actions.some(a=>a.uid===drawn.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 for(const action of state.pending.actions){
  const label=uiActionLabel(action,{pack,state});
  assert.equal(label.includes('執行'),false,label);
  assert.equal(/kmr/i.test(label),false,label);
 }
 assert.equal(uiActionLabel(state.pending.actions.find(a=>a.mode==='done'),{pack,state}),'完成選擇');
 const shown=state.pending.actions.find(a=>a.uid===hand[0].uid);
 assert.equal(controllerChoiceArt(packs,state,shown)[0]?.cardId,hand[0].cardId);
 return {state,rider,hand,foeSmall,foeMid,foeBig};
}
function hostOf(state,rider){
 return state.players[0].front.find(c=>c?.uid===rider.uid);
}
function retireTargets(state){
 return state.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
}

test('EX12BT/KMR-2-068 removing one re-imagination still retires and copies',()=>{
 const {state:opened,rider,hand,foeSmall,foeMid,foeBig}=passionBoard(['KMR-2-072']);
 let state=click(opened,a=>a.mode==='remove'&&a.uid===hand[0].uid);
 assert.equal(state.players[0].removed.filter(c=>c.uid===hand[0].uid).length,1);
 assert.equal(state.players[0].hand.some(c=>c.uid===hand[0].uid),false);
 assert.equal(state.pending?.step,'retire');
 assert.deepEqual(retireTargets(state),[foeSmall.uid]);
 assert.equal(retireTargets(state).includes(foeMid.uid),false);
 assert.equal(retireTargets(state).includes(foeBig.uid),false);
 state=click(state,a=>a.mode==='retire'&&a.uid===foeSmall.uid);
 const host=hostOf(state,rider);
 assert.deepEqual(host.kmr2Copied.ids,['KMR-2-072']);
 assert.equal(universalBp(pack,state,host),5000);
 assert.equal(universalCardEnergy(pack,state,0,host),0);
 assert.equal(state.players[1].front.some(c=>c?.uid===foeSmall.uid),false);
 assert.equal(state.players[1].outside.filter(c=>c.uid===foeSmall.uid).length,1);
 assert.equal(state.players[0].front.filter(c=>c?.uid===rider.uid).length,1);
});

test('EX12BT/KMR-2-068 still copies when one removal cannot retire',()=>{
 const {state:opened,rider,hand,foeMid,foeBig}=passionBoard(['KMR-2-072'],{small:false});
 const state=click(opened,a=>a.mode==='remove'&&a.uid===hand[0].uid);
 assert.equal(state.pending,null);
 const host=hostOf(state,rider);
 assert.deepEqual(host.kmr2Copied.ids,['KMR-2-072']);
 assert.equal(universalBp(pack,state,host),5000);
 assert.equal(state.players[0].removed.filter(c=>c.uid===hand[0].uid).length,1);
 assert.equal(state.players[1].front.some(c=>c?.uid===foeMid.uid),true);
 assert.equal(state.players[1].front.some(c=>c?.uid===foeBig.uid),true);
});

test('EX12BT/KMR-2-068 can stop after placing one of two cards',()=>{
 const {state:opened,rider,hand,foeSmall,foeMid,foeBig}=passionBoard(['KMR-2-070','KMR-2-072']);
 const [agito,kiva]=hand;
 let state=click(opened,a=>a.mode==='remove'&&a.uid===agito.uid);
 assert.equal(state.pending?.step,'removeTwo');
 assert.equal(state.players[0].removed.filter(c=>c.uid===agito.uid).length,1);
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 assert.equal(state.pending.actions.some(a=>a.uid===kiva.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===agito.uid),false);
 assert.equal(uiActionLabel(state.pending.actions.find(a=>a.mode==='done'),{pack,state}),'完成選擇');
 state=click(state,a=>a.mode==='done');
 assert.equal(state.pending?.step,'retire');
 assert.deepEqual(retireTargets(state),[foeSmall.uid]);
 assert.equal(retireTargets(state).includes(foeMid.uid),false);
 assert.equal(retireTargets(state).includes(foeBig.uid),false);
 state=click(state,a=>a.mode==='skip');
 const host=hostOf(state,rider);
 assert.deepEqual(host.kmr2Copied.ids,['KMR-2-070']);
 assert.equal(universalBp(pack,state,host),4500);
 assert.equal(universalCardEnergy(pack,state,0,host),1);
 assert.equal(state.players[0].hand.some(c=>c.uid===kiva.uid),true);
 assert.equal(state.players[0].removed.filter(c=>c.uid===agito.uid).length,1);
 assert.equal(state.players[1].front.some(c=>c?.uid===foeSmall.uid),true);
});

test('EX12BT/KMR-2-068 sums both removed cards',()=>{
 const {state:opened,rider,hand,foeSmall,foeMid,foeBig}=passionBoard(['KMR-2-070','KMR-2-072']);
 const [agito,kiva]=hand;
 let state=click(opened,a=>a.mode==='remove'&&a.uid===agito.uid);
 state=click(state,a=>a.mode==='remove'&&a.uid===kiva.uid);
 assert.equal(state.pending?.step,'retire');
 assert.deepEqual(retireTargets(state).sort(),[foeSmall.uid,foeMid.uid].sort());
 assert.equal(retireTargets(state).includes(foeBig.uid),false);
 state=click(state,a=>a.mode==='retire'&&a.uid===foeMid.uid);
 const host=hostOf(state,rider);
 assert.deepEqual(host.kmr2Copied.ids,['KMR-2-070','KMR-2-072']);
 assert.equal(universalBp(pack,state,host),5000);
 assert.equal(universalCardEnergy(pack,state,0,host),1);
 assert.equal(state.players[1].outside.filter(c=>c.uid===foeMid.uid).length,1);
 assert.equal(state.players[0].hand.some(c=>c.uid===agito.uid||c.uid===kiva.uid),false);
 assert.equal(state.players[0].removed.filter(c=>c.uid===agito.uid||c.uid===kiva.uid).length,2);
 assert.equal(state.players[0].front.filter(c=>c?.uid===rider.uid).length,1);
});

test('EX12BT/KMR-2-068 can place none of the re-imagination cards',()=>{
 const {state:opened,rider,hand,foeSmall}=passionBoard(['KMR-2-070','KMR-2-072']);
 const state=click(opened,a=>a.mode==='done');
 const host=hostOf(state,rider);
 assert.equal(state.pending,null);
 assert.equal(host.kmr2Copied,undefined);
 assert.equal(hand.every(c=>state.players[0].hand.some(x=>x.uid===c.uid)),true);
 assert.equal(state.players[0].removed.some(c=>hand.some(x=>x.uid===c.uid)),false);
 assert.equal(state.players[1].front.some(c=>c?.uid===foeSmall.uid),true);
});


test('KMR-2-022 tucks the chosen hand card facedown under a chosen host instead of discarding',()=>{
 const s=fresh(fill(['KMR-2-022','KMR-2-090','KMR-2-010']));
 const source=put(s,0,'KMR-2-022','front',0,true);
 const chosen=take(s,0,'KMR-2-090');
 s.players[0].hand.push(chosen);
 ready(s);
 const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid);
 assert.ok(activate);
 let state=dispatchUniversalAction(packs,s,activate);
 assert.equal(state.pending?.step,'mode');
 state=click(state,a=>a.key==='tuck');
 assert.equal(state.pending?.step,'tuck022Hand');
 assert.ok(state.pending.actions.some(a=>a.mode==='tuck'&&a.uid===chosen.uid));
 state=click(state,a=>a.mode==='tuck'&&a.uid===chosen.uid);
 assert.equal(state.pending?.step,'tuck022Host');
 state=click(state,a=>a.mode==='under'&&a.uid===source.uid);
 assert.equal(state.pending,null);
 const host=state.players[0].front.find(c=>c?.uid===source.uid);
 assert.ok(host?.under?.some(c=>c.uid===chosen.uid&&c.faceDown===true));
 assert.equal(state.players[0].outside.some(c=>c.uid===chosen.uid),false);
});

test('KMR-2-099 continues after chosen discard to outside Mirror Monster entry',()=>{
 const s=fresh(fill(['KMR-2-099','KMR-2-095','KMR-2-087','KMR-2-090','KMR-2-091']));
 put(s,0,'KMR-2-087','energy',0,true);
 put(s,0,'KMR-2-090','energy',1,true);
 put(s,0,'KMR-2-091','energy',2,true);
 const mirror=take(s,0,'KMR-2-095');
 s.players[0].outside.push(mirror);
 const event=take(s,0,'KMR-2-099');
 s.players[0].hand.push(event);
 ready(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 let state=dispatchUniversalAction(packs,s,play);
 state=click(state,a=>a.key==='deploy');
 assert.equal(state.pending?.step,'discard');
 state=click(state,a=>a.mode==='discard');
 assert.equal(state.pending?.step,'deployPick');
 state=click(state,a=>a.mode==='deploy'&&a.uid===mirror.uid);
 assert.equal(state.pending?.step,'enter');
 state=click(state,a=>a.mode==='enter'&&a.uid===mirror.uid&&a.line==='energy'&&a.slot===3);
 // KMR-2-095 has an independent optional on-play effect; resolve it before closing.
 if(state.pending?.kind==='kmr2'&&state.pending?.step==='triggerSafe')
  state=click(state,a=>a.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].energy[3]?.uid,mirror.uid);
 assert.equal(state.players[0].energy[3]?.ready,false);
});


test('Gav swaps compare raids against the ATTACK-phase baseline rather than the turn flag',()=>{
 const s=fresh(fill(['KMR-2-005','KMR-2-012']));
 ready(s);
 assert.deepEqual(s.kmr2AttackRaidBaseline,[0,0]);
 const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
 assert.ok(next);
 const attack=dispatchUniversalAction(packs,s,next);
 assert.equal(attack.phase,'attack');
 assert.deepEqual(attack.kmr2AttackRaidBaseline,attack.raidCount);
});

test('W Heat Metal chooses a single top-or-bottom placement after Memory Change mode',()=>{
 for(const where of ['top','bottom']){
  const s=fresh(fill(['KMR-2-054','KMR-2-059','KMR-2-020']));
  const heat=put(s,0,'KMR-2-054','front',0,true);
  heat.kmr2EnteredBy={id:'KMR-2-059',name:'メモリチェンジ',turn:s.turn};
  const seen=take(s,0,'KMR-2-020');
  s.players[0].deck.unshift(seen);
  ready(s);
  // The blocked hook has already offered the printed Memory Change alternative.
  s.pending={kind:'kmr2',player:0,id:'KMR-2-054',sourceUid:heat.uid,
   step:'mode',data:{},actions:[
    {type:'kmr2',mode:'one',key:'top'},
    {type:'kmr2',mode:'two',key:'draw'}
   ]};
  let state=click(s,a=>a.key==='top');
  assert.equal(state.pending?.step,'topPlace','must not reopen the mode choice');
  assert.deepEqual(state.pending.actions.map(a=>a.mode),['top','bottom']);
  assert.equal(controllerChoiceArt(packs,state,state.pending.actions[0])[0]?.cardId,'KMR-2-020');
  const focus=pendingFocusCard(packs,state);
  assert.equal(focus?.cardId,'KMR-2-020');
  assert.equal(focus?.uid,seen.uid);
  const printed=KMR2_CARDS.find(card=>card.id===focus.cardId);
  assert.match(fieldEffectCopy(printed),/インパクト無効|減少/);
  assert.equal(state.publicReveals.some(entry=>entry.uid===seen.uid),false);
  assert.equal(universalPrivateChoices(packs,state,1),null);
  const shown=universalPrivateChoices(packs,state,0);
  assert.equal(shown?.options?.some(option=>option.card?.cardId==='KMR-2-020'),true);
  state=click(state,a=>a.mode===where);
  assert.equal(state.pending,null);
  assert.equal(state.players[0].deck[where==='top'?0:state.players[0].deck.length-1]?.uid,seen.uid);
 }
});

test('two different top-placement cards do not collapse into one effect sheet',()=>{
 const state={pending:{player:0,kind:'kmr2',step:'topPlace',actions:[
  {type:'kmr2',mode:'top',uid:'0-1'},{type:'kmr2',mode:'bottom',uid:'0-2'}
 ]},players:[{deck:[]},{deck:[]}]};
 assert.equal(pendingFocusCard(packs,state),null);
});

test('Memory Change asks for a W hand card and destination, entering it ACTIVE',()=>{
 const s=fresh(fill(['KMR-2-059','KMR-2-050','KMR-2-054']));
 const field=put(s,0,'KMR-2-059','energy',0,true);
 const oldW=put(s,0,'KMR-2-050','front',0,true);
 const nextW=take(s,0,'KMR-2-054');
 s.players[0].hand.push(nextW);
 ready(s);
 const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===field.uid);
 assert.ok(activate,'field must be usable');
 let state=dispatchUniversalAction(packs,s,activate);
 assert.equal(state.pending?.step,'retireOwn');
 assert.equal(state.pending.actions.some(a=>a.uid===oldW.uid),true);
 state=click(state,a=>a.mode==='retireOwn'&&a.uid===oldW.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===oldW.uid),true);
 assert.equal(state.pending?.step,'deployPick','draw must precede hand selection');
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 assert.equal(state.pending.actions.some(a=>a.mode==='deploy'&&a.uid===nextW.uid),true);
 state=click(state,a=>a.mode==='deploy'&&a.uid===nextW.uid);
 assert.equal(state.pending?.step,'enter','choose line only after the chosen hand card');
 assert.equal(state.pending.actions.some(a=>a.mode==='enter'&&a.line==='front'&&a.slot===0),true);
 assert.equal(state.pending.actions.some(a=>a.mode==='enter'&&a.line==='energy'),true);
 state=click(state,a=>a.mode==='enter'&&a.line==='front'&&a.slot===0);
 assert.equal(state.pending,null);
 const entered=state.players[0].front[0];
 assert.equal(entered?.uid,nextW.uid);
 assert.equal(entered.ready,true);
 assert.equal(entered.kmr2EnteredBy?.id,'KMR-2-059');
 assert.equal(state.players[0].hand.some(c=>c.uid===nextW.uid),false);
});

function wExtremeBoard(fullEnergy){
 const ids=['KMR-2-048','KMR-2-049','KMR-2-050','KMR-2-052','KMR-2-056',
  'KMR-2-090','KMR-2-045','KMR-2-013'];
 const s=fresh(fill(ids,{'KMR-2-045':4,'KMR-2-013':4}));
 const base=put(s,0,'KMR-2-048','front',0,true);
 put(s,0,'KMR-2-050','front',1,true);
 put(s,0,'KMR-2-052','front',2,true);
 put(s,0,'KMR-2-056','front',3,true);
 for(let i=0;i<4;i++)put(s,0,'KMR-2-045','energy',i,true);
 const target=put(s,1,'KMR-2-090','front',0,true);
 const replacements=[];
 for(let i=0;i<(fullEnergy?4:3);i++)replacements.push(put(s,1,'KMR-2-013','energy',i,true));
 const extreme=take(s,0,'KMR-2-049');
 s.players[0].hand.push(extreme);
 ready(s);
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===extreme.uid&&a.baseUid===base.uid);
 assert.ok(raid,'4/1 W should be allowed to raid W Cyclone Joker');
 const opened=dispatchUniversalAction(packs,s,raid);
 assert.equal(opened.pending?.step,'toEnergy','0/1/2/4 distinct W energies must qualify');
 return {opened,target,replacements,extreme};
}

test('W Extreme sends the chosen enemy front character to an open ENERGY space',()=>{
 const {opened,target,extreme}=wExtremeBoard(false);
 const state=click(opened,a=>a.mode==='place'&&a.uid===target.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[1].front.some(c=>c?.uid===target.uid),false);
 assert.equal(state.players[1].energy.some(c=>c?.uid===target.uid),true);
 assert.equal(state.continuousStates.some(x=>x.kind==='originalEffectsDisabled'&&
  x.sourceUid===extreme.uid&&x.targetUid===target.uid),true);
});

test('W Extreme moves a selected front character even when ENERGY is full',()=>{
 const {opened,target,replacements,extreme}=wExtremeBoard(true);
 let state=click(opened,a=>a.mode==='place'&&a.uid===target.uid);
 assert.equal(state.pending?.step,'toEnergyReplace');
 assert.equal(state.pending?.player,1,'defender chooses the ENERGY card to remove');
 assert.equal(state.players[1].front.some(c=>c?.uid===target.uid),true);
 assert.equal(state.continuousStates.some(x=>x.targetUid===target.uid),false,
  'silence applies only after successfully moving the target');
 assert.deepEqual(state.pending.actions.map(a=>a.uid).sort(),replacements.map(c=>c.uid).sort());
 state=click(state,a=>a.mode==='remove'&&a.uid===replacements[2].uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[1].removed.some(c=>c.uid===replacements[2].uid),true);
 assert.equal(state.players[1].front.some(c=>c?.uid===target.uid),false);
 assert.equal(state.players[1].energy.some(c=>c?.uid===target.uid),true);
 assert.equal(state.players[1].energy.filter(Boolean).length,4);
 assert.equal(state.continuousStates.some(x=>x.kind==='originalEffectsDisabled'&&
  x.sourceUid===extreme.uid&&x.targetUid===target.uid),true);
});
