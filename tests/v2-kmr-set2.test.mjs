import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {createKmrV2Pack,KMR_STARTER_IDS} from '../dist/universal-v2/kmr-pack.mjs';
import {kmr2EngineKind} from '../dist/universal-v2/kmr2-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {createKmrBattlePack,kmrPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {uiActionLabel,controllerChoiceArt,fieldEffectCopy} from '../dist/universal-v2/preview-actions.mjs';
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
 assert.equal(Object.keys(pack.cards).length,213);
 assert.ok(pack.cards['KMR-1-001']);
 assert.ok(pack.cards['KMR-2-001']);
 assert.equal(new Set(Object.keys(pack.cards)).size,213);
 assert.equal(V2_TITLE_IDS.includes('kmr'),false);
 for(const card of KMR2_CARDS){
  assert.equal(kmr2EngineKind(card.effectJa),card.engineKind,card.id);
  assert.equal(pack.cards[card.id].name,card.nameJa,card.id);
  assert.match(card.image,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\/EX12BT_KMR-2-\d\d\d\.png$/);
  assert.match(card.sourceTc,/unionarena-tcg\.com\/tc\/cardlist\/detail_iframe\.php/);
  assert.equal(card.effect.includes('沒有可顯示的效果'),false);
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
