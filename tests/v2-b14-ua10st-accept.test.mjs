// Round 14 acceptance for the UA10ST starter. The lists below are test decks.
// UA10ST_PRODUCT.recipe and the IMC starter counts stay null; neither list
// is an official 50-card product.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalPrivateChoices,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {mhaCatalog,mhaEditorCards} from '../dist/mha/catalog.mjs';
import {UA10ST_PRODUCT,UA10ST_CARDS} from '../dist/mha/ua10st-cards.mjs';
import {createMhaV2Pack,mhaProgramFor,MHA_OFFICIAL_MATCH_CLOSED} from '../dist/universal-v2/mha-pack.mjs';
import {MHA_UA10ST_PROGRAMS} from '../dist/universal-v2/mha/programs.mjs';
import {MHA_PROGRAMS_001_050} from '../dist/universal-v2/mha/programs-001-050.mjs';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {loadImcOfficialStarter} from '../dist/imc/starter-deck.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseProgressSafeAiAction} from '../dist/universal-v2/ai-driver-safety.mjs';
import {fieldEffectCopy} from '../dist/universal-v2/preview-actions.mjs';
import {deckCardImage} from '../dist/deck-gallery.mjs';
import {normalizeEditorCounts,editorV2Status,LEGACY_DECK_KEYS} from '../dist/v2-editor-compat.mjs';
import {collectSavedV2LobbyDecks,accountLobbyRows} from '../dist/universal-v2/lobby-saved-decks.mjs';
import {parseDeck} from '../dist/decks.mjs';

const READY=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065','MHA-1-101','MHA-1-102',
 'MHA-1-103','MHA-1-104','MHA-1-105','MHA-1-106','MHA-1-107','MHA-1-108',
 'MHA-1-109'];
const RANGE_SHARED=['MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-065'];
const MECHANIC=['implementation','effects','mainAbility','activeExtraEnergy','step',
 'triggerEffect','passiveBonuses','raidName','printedImpact','printedAttackDamage',
 'ownTurnBp'];
const mha=createMhaV2Pack();
const imc=createImcV2Pack();
const bleach=createBleachV2Pack();
const starterById=Object.fromEntries(UA10ST_CARDS.map(card=>[card.id,card]));
const editorById=Object.fromEntries(mhaEditorCards().map(card=>[card.id,card]));

function mechanics(program){
 const out={};
 for(const key of MECHANIC)if(program[key]!==undefined)out[key]=program[key];
 return out;
}
function rangeProgram(id){
 return id<'MHA-1-051'?MHA_PROGRAMS_001_050[id]:MHA_PROGRAMS_051_100[id];
}
function packsOf(pack){
 return Array.isArray(pack)?pack:[pack,pack];
}
function printOf(pack,player){
 return packsOf(pack)[player].cards;
}
function testDeck(pack,pinned={}){
 const counts={...pinned};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const limited=kind=>Object.entries(counts).reduce((sum,[id,n])=>
  sum+(pack.cards[id]?.trigger===kind?n:0),0);
 for(const card of Object.values(pack.cards)){
  if(total>=50)break;
  if(!['character','event','field'].includes(card.type))continue;
  const have=counts[card.id]||0;
  let room=Math.min(4-have,50-total);
  if(room<=0)continue;
  if(card.trigger==='special'||card.trigger==='final'||card.trigger==='color')
   room=Math.min(room,4-limited(card.trigger));
  if(room<=0)continue;
  counts[card.id]=have+room;
  total+=room;
 }
 if(total!==50)throw Error(pack.id+' test deck stopped at '+total);
 return counts;
}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legalUniversalActions(pack,s).find(action);
  assert.ok(found,'missing legal action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pull(s,player,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const cards=s.players[player][zone];
  const index=cards.findIndex(card=>card.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
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
function setAp(s,player,count){
 s.players[player].apCards.forEach((card,index)=>{
  card.inPlay=index<count;
  card.ready=index<count;
 });
}
function reach(pack,s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=act(pack,s,{type:'next'});
  if(++guard>16)throw Error('Did not reach '+player+' '+phase);
 }
 return s;
}
function starterCounts(){
 const counts={};
 for(const id of READY)counts[id]=2;
 counts['MHA-1-103']=4;
 return counts;
}
function openMatch(left,right,seed,rightPins={}){
 const decks=[testDeck(left,starterCounts()),testDeck(right,rightPins)];
 assert.deepEqual(validateUniversalDeck(left,decks[0]),[]);
 assert.deepEqual(validateUniversalDeck(right,decks[1]),[]);
 let s=newUniversalMatch([left,right],{decks,seed,first:0,openingMulligan:false});
 assert.equal(s.title,'cross-title');
 s=reach([left,right],s,0,'main');
 return {packs:[left,right],s,decks};
}
function same(action,other){
 return JSON.stringify(action)===JSON.stringify(other);
}
function quietLife(pack,s,player){
 const print=printOf(pack,player);
 const life=s.players[player].life;
 for(let i=0;i<life.length;i++){
  if(!print[life[i].cardId]?.trigger)continue;
  const index=s.players[player].deck.findIndex(card=>
   print[card.cardId]?.type==='character'&&!print[card.cardId]?.trigger);
  if(index<0)break;
  const swap=s.players[player].deck.splice(index,1)[0];
  s.players[player].deck.push(life[i]);
  life[i]=swap;
 }
}

test('the 18 starter programs stay ready and the nine reprints execute one object',()=>{
 assert.equal(UA10ST_PRODUCT.recipe,null);
 assert.equal(loadImcOfficialStarter().counts,null);
 assert.equal(Object.keys(MHA_UA10ST_PROGRAMS).length,18);
 for(const id of READY){
  assert.equal(MHA_UA10ST_PROGRAMS[id].ready,true);
  assert.equal(mha.cards[id].id,id);
  assert.equal(editorById[id].playable,false);
  assert.equal(editorById[id].battleReady,false);
 }
 for(const id of RANGE_SHARED){
  const range=rangeProgram(id);
  assert.equal(mhaProgramFor(id),range);
  assert.notEqual(mhaProgramFor(id),MHA_UA10ST_PROGRAMS[id]);
  assert.deepEqual(mechanics(MHA_UA10ST_PROGRAMS[id]),mechanics(range));
 }
 assert.equal(MHA_PROGRAMS_001_050['MHA-1-044'],undefined);
 assert.equal(MHA_PROGRAMS_051_100['MHA-1-063'],undefined);
 assert.equal(mhaProgramFor('MHA-1-044'),MHA_UA10ST_PROGRAMS['MHA-1-044']);
 assert.equal(mhaProgramFor('MHA-1-063'),MHA_UA10ST_PROGRAMS['MHA-1-063']);
 for(const id of READY){
  if(RANGE_SHARED.includes(id))continue;
  assert.equal(mhaProgramFor(id),MHA_UA10ST_PROGRAMS[id]);
 }
});

test('MHA-1-044 activates in the main phase against BLEACH and pays no second AP',()=>{
 const opened=openMatch(mha,bleach,44014);
 let s=opened.s;
 const self=seat(s,0,'MHA-1-044','energy',0,true);
 setAp(s,0,1);
 const before=universalEnergyByColor(opened.packs,s,0).green||0;
 const ap=s.players[0].apCards.filter(card=>card.ready).length;
 s=act(opened.packs,s,legal=>legal.type==='activate'&&legal.uid===self.uid);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalEnergyByColor(opened.packs,s,0).green,before+1);
 assert.equal(s.players[0].apCards.filter(card=>card.ready).length,ap);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>
  action.type==='activate'&&action.uid===self.uid),false);
 s=act(opened.packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(card=>card.uid===self.uid));
 assert.equal(universalEnergyByColor(opened.packs,s,0).green||0,0);
});

test('MHA-1-102 needs four green and two AP before it can be played',()=>{
 const opened=openMatch(mha,imc,10214);
 let s=opened.s;
 for(let slot=0;slot<4;slot++)seat(s,0,'MHA-1-103','energy',slot,true);
 const card=hold(s,0,'MHA-1-102');
 setAp(s,0,1);
 assert.equal(universalEnergyByColor(opened.packs,s,0).green>=4,true);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>
  action.type==='play'&&action.uid===card.uid),false);
 setAp(s,0,2);
 const play=legalUniversalActions(opened.packs,s).find(action=>
  action.type==='play'&&action.uid===card.uid&&action.line==='front');
 assert.ok(play);
 s=act(opened.packs,s,play);
 assert.equal(s.players[0].front[play.slot].cardId,'MHA-1-102');
 assert.equal(s.players[0].apCards.filter(token=>token.ready).length,0);
});

test('MHA-1-107 raids only its own Midoriya while a BLEACH character is on the other side',()=>{
 const opened=openMatch(mha,bleach,10714,{'BLC-1-002':4});
 let s=opened.s;
 for(let slot=0;slot<4;slot++)seat(s,0,'MHA-1-103','energy',slot,true);
 const base=seat(s,0,'MHA-1-106','front',0,false);
 const other=seat(s,0,'MHA-1-105','front',1,false);
 const foe=seat(s,1,'BLC-1-002','front',0,true);
 const raider=hold(s,0,'MHA-1-107');
 setAp(s,0,1);
 const raids=legalUniversalActions(opened.packs,s).filter(action=>
  action.type==='raid'&&action.uid===raider.uid);
 assert.ok(raids.length>0);
 assert.ok(raids.every(action=>action.baseUid===base.uid&&action.slot===0));
 assert.equal(raids.some(action=>action.baseUid===other.uid||action.baseUid===foe.uid),false);
 s=act(opened.packs,s,raids.find(action=>action.slot===0));
 const top=s.players[0].front.find(card=>card?.cardId==='MHA-1-107');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].cardId,'MHA-1-106');
 assert.equal(s.players[1].front[0].uid,foe.uid);
});

test('MHA-1-105 retires one IMC front and then offers the remaining blocker',()=>{
 const opened=openMatch(mha,imc,10514,{
  'IMC-1-001':4,'IMC-1-007':4,'IMC-1-102':4
 });
 let s=reach(opened.packs,opened.s,0,'attack');
 const attacker=seat(s,0,'MHA-1-105','front',0,true);
 const low=seat(s,1,'IMC-1-007','front',0,true);
 const high=seat(s,1,'IMC-1-102','front',1,true);
 const back=seat(s,1,'IMC-1-001','energy',0,true);
 quietLife(opened.packs,s,1);
 s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(back.uid),false);
 assert.equal(legalUniversalActions(opened.packs,s).some(action=>
  action.type==='chooseRetireBp'&&action.uid===null),true);
 s=act(opened.packs,s,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].outside.some(card=>card.uid===low.uid));
 assert.equal(s.pending.kind,'block');
 const blocks=legalUniversalActions(opened.packs,s).filter(action=>action.type==='chooseBlock');
 assert.ok(blocks.some(action=>action.uid===high.uid));
 assert.equal(blocks.some(action=>action.uid===back.uid||action.uid===low.uid),false);
 s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
 assert.equal(s.players[1].front[1].uid,high.uid);
 if(s.pending){
  assert.equal(s.pending.kind,'life-trigger');
  assert.equal(s.pending.player,1);
 }
});

test('a UA10ST life trigger stays with its owner across IMC and BLEACH',()=>{
 function strike(right,seed,lifeId,pins){
  const opened=openMatch(mha,right,seed,pins);
  let s=reach(opened.packs,opened.s,1,'attack');
  const attacker=seat(s,1,right===imc?'IMC-1-001':'BLC-1-002','front',0,true);
  const own=seat(s,0,'MHA-1-103','front',0,true);
  quietLife(opened.packs,s,0);
  s.players[0].life.unshift(pull(s,0,lifeId));
  s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
  if(s.pending?.kind==='block')s=act(opened.packs,s,action=>action.type==='chooseBlock'&&action.uid===null);
  return {opened,s,attacker,own};
 }
 const special=strike(imc,6314,'MHA-1-063',{'IMC-1-001':4});
 assert.equal(special.s.pending.trigger,'special');
 assert.equal(special.s.pending.player,0);
 const targets=legalUniversalActions(special.opened.packs,special.s)
  .filter(action=>action.type==='chooseTrigger'&&action.mode==='special');
 assert.ok(targets.some(action=>action.uid===special.attacker.uid));
 assert.equal(targets.some(action=>action.uid===special.own.uid),false);
 const retired=act(special.opened.packs,special.s,action=>
  action.type==='chooseTrigger'&&action.mode==='special'&&action.uid===special.attacker.uid);
 assert.equal(retired.players[1].front[0],null);
 assert.equal(retired.players[0].front[0].uid,special.own.uid);
 const active=strike(bleach,10114,'MHA-1-101',{'BLC-1-002':4});
 assert.equal(active.s.pending.trigger,'active');
 assert.equal(active.s.pending.player,0);
 const activeTargets=legalUniversalActions(active.opened.packs,active.s)
  .filter(action=>action.type==='chooseTrigger'&&action.mode==='active');
 assert.ok(activeTargets.some(action=>action.uid===active.own.uid));
 assert.equal(activeTargets.some(action=>action.uid===active.attacker.uid),false);
 const kept=act(active.opened.packs,active.s,action=>
  action.type==='chooseTrigger'&&action.mode==='active'&&action.uid===active.own.uid);
 assert.equal(kept.players[0].front[0].ready,true);
});

test('MHA-1-109 keeps the closed window private and chains take, order, then the named draw',()=>{
 const opened=openMatch(mha,bleach,10914);
 let s=opened.s;
 seat(s,0,'MHA-1-103','energy',0,true);
 seat(s,0,'MHA-1-103','energy',1,true);
 const event=hold(s,0,'MHA-1-109');
 const window=['MHA-1-063','MHA-1-108','MHA-1-103','MHA-1-105','MHA-1-106','MHA-1-104']
  .map(id=>pull(s,0,id));
 s.players[0].deck.unshift(...window);
 setAp(s,0,1);
 const hand=s.players[0].hand.length;
 s=act(opened.packs,s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(universalPrivateChoices(opened.packs,s,1),null);
 const mine=universalPrivateChoices(opened.packs,s,0);
 assert.deepEqual(mine.inspected.map(card=>card.cardId),
  ['MHA-1-063','MHA-1-108','MHA-1-103','MHA-1-105','MHA-1-106']);
 const picks=mine.options.filter(option=>option.action.mode==='pick').map(option=>option.card.cardId);
 assert.deepEqual(picks.sort(),['MHA-1-103','MHA-1-105','MHA-1-106']);
 const hidden=universalPublicView(opened.packs,s,1);
 assert.equal(JSON.stringify(hidden.pending||{}).includes('MHA-1-063'),false);
 const hero=mine.inspected.find(card=>card.cardId==='MHA-1-106');
 s=act(opened.packs,s,action=>action.type==='chooseTopScript'&&action.mode==='pick'&&action.uid===hero.uid);
 assert.equal(s.pending.kind,'effect-top-order');
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(opened.packs,s,{type:'chooseTopOrder',uid});
  if(++guard>8)throw Error('order did not finish');
 }
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(card=>card.uid===hero.uid),true);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalPublicView(opened.packs,s,1).publicReveals.some(card=>card.cardId==='MHA-1-106'),true);
 assert.equal(universalPublicView(opened.packs,s,1).publicReveals.some(card=>card.cardId==='MHA-1-063'),false);
});

test('a 50-card UA10ST test list imports and saves without becoming the official starter',()=>{
 assert.equal(UA10ST_PRODUCT.recipe,null);
 const counts={};
 for(const id of READY)counts[id]=2;
 counts['MHA-1-103']=4;
 const deck=testDeck(mha,counts);
 assert.equal(Object.values(deck).reduce((sum,n)=>sum+n,0),50);
 assert.deepEqual(validateUniversalDeck(mha,deck),[]);
 const pasted={};
 for(const [id,n] of Object.entries(deck))pasted[starterById[id]?.number||editorById[id].number]=n;
 const normalized=normalizeEditorCounts('mha',pasted);
 assert.deepEqual(normalized,deck);
 assert.equal(editorById['MHA-1-034'].number,'UA10BT/MHA-1-034');
 assert.ok(editorById['MHA-1-034'].aliases.includes('UA10ST/MHA-1-034'));
 assert.deepEqual(normalizeEditorCounts('mha',{
  'UA10ST/MHA-1-034':2,'UA10BT/MHA-1-034':2
 }),{'MHA-1-034':4});
 assert.throws(()=>parseDeck('4 UA10ST/MHA-1-103\n'),/尚未支援卡號/);
 const saved={
  id:'test-ua10st-b14',
  name:'UA10ST 測試牌組',
  counts:pasted
 };
 const storage={
  getItem(key){return key===LEGACY_DECK_KEYS.mha[1]?JSON.stringify([saved]):null;},
  setItem(){}
 };
 const local=collectSavedV2LobbyDecks(storage).find(row=>row.name==='UA10ST 測試牌組');
 assert.equal(local.title,'mha');
 assert.equal(local.ready,false);
 assert.match(local.issues.join('\n'),new RegExp(MHA_OFFICIAL_MATCH_CLOSED));
 assert.equal(local.counts,null);
 assert.doesNotMatch(local.name,/官方|公式/);
 const account=accountLobbyRows([{
  id:'d0123456789abcdef',title:'mha',name:'UA10ST 測試牌組',localId:saved.id,counts:pasted
 }])[0];
 assert.equal(account.ready,false);
 assert.match(account.issues.join('\n'),new RegExp(MHA_OFFICIAL_MATCH_CLOSED));
 const status=editorV2Status('mha',normalized);
 assert.equal(status.total,50);
 assert.equal(status.ready,false);
 assert.deepEqual(status.counts,deck);
 assert.equal(UA10ST_PRODUCT.recipe,null);
});

test('the battle catalogue shows UA10ST art and printed text for every starter card',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/mha:new Map\(mhaEditorCards\(\)/);
 assert.match(preview,/mha:printedCatalogueMap\(mhaEditorCards\(\)\)/);
 const art=new Map(mhaEditorCards().map(card=>[card.identity||card.id,card.image||card.printings?.[0]?.image||null]));
 for(const id of READY){
  const shown=editorById[id];
  const source=art.get(id)||shown.image||shown.printings?.[0]?.image;
  assert.match(source,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\//);
  assert.equal(deckCardImage(shown),shown.image);
  const copy=fieldEffectCopy(shown);
  assert.notEqual(copy,'這張卡沒有可顯示的效果。');
  assert.match(starterById[id].image,/UA10ST_/);
  const printed=shown.effect;
  if(printed&&printed!=='-')assert.ok(copy.includes(printed.slice(0,16)),id);
  else if(starterById[id].triggerTextJa)assert.match(copy,/觸發效果/);
  else assert.equal(copy,'這張卡沒有印刷效果。');
 }
 for(const id of ['MHA-1-101','MHA-1-102','MHA-1-103','MHA-1-104','MHA-1-105',
  'MHA-1-106','MHA-1-107','MHA-1-108','MHA-1-109']){
  assert.match(editorById[id].image,/UA10ST_/);
  assert.match(fieldEffectCopy(editorById[id]),/./);
 }
 assert.match(editorById['MHA-1-102'].nameJa,/オールマイト/);
 assert.match(fieldEffectCopy(editorById['MHA-1-102']),/傷害（2）/);
 for(const id of RANGE_SHARED)assert.match(editorById[id].image,/UA10BT_/);
 assert.match(starterById['MHA-1-063'].image,/UA10ST_/);
 assert.match(editorById['MHA-1-063'].image,/UA10BT_/);
 assert.match(fieldEffectCopy(editorById['MHA-1-063']),/自分の場のキャラ/);
});

test('the AI action on an IMC or BLEACH match is always one of the legal actions',()=>{
 function walk(right,seed){
  const opened=openMatch(mha,right,seed);
  let s=opened.s;
  for(const difficulty of ['easy','normal']){
   let cursor=s;
   for(let step=0;step<24;step++){
    const legal=legalUniversalActions(opened.packs,cursor);
    const chosen=chooseUniversalAiAction(opened.packs,cursor,{difficulty});
    if(!legal.length){
     assert.equal(chosen,null);
     break;
    }
    assert.ok(legal.some(action=>same(action,chosen)),difficulty+' step '+step);
    const safe=chooseProgressSafeAiAction(opened.packs,cursor,{difficulty,actionsInPhase:0});
    assert.equal(safe.reason,null);
    assert.ok(legal.some(action=>same(action,safe.action)));
    cursor=act(opened.packs,cursor,chosen);
   }
  }
 }
 walk(imc,1414);
 walk(bleach,1415);
 const opened=openMatch(mha,imc,1416,{'IMC-1-007':4});
 let s=reach(opened.packs,opened.s,0,'attack');
 const attacker=seat(s,0,'MHA-1-105','front',0,true);
 seat(s,1,'IMC-1-007','front',0,true);
 s=act(opened.packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 const chosen=chooseUniversalAiAction(opened.packs,s,{difficulty:'normal'});
 const legal=legalUniversalActions(opened.packs,s);
 assert.ok(legal.some(action=>same(action,chosen)));
 s=act(opened.packs,s,chosen);
 assert.equal(assertUniversalMatch(opened.packs,s),true);
});
