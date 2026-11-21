import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MGS_CARDS} from '../dist/mgs-cards.mjs';
import {createMgsV2Pack,MGS_ENGINE_IDS,MGS2_ENGINE_IDS} from '../dist/universal-v2/mgs-pack.mjs';
import {MGS2_CARDS} from '../dist/mgs-vol2.mjs';
import {mgsEngineKind} from '../dist/universal-v2/mgs-classify.mjs';
import {parseGen} from '../scripts/fetch-mgs-ua42.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {titleLogo} from '../dist/title-logos.mjs';
import {mgsPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {dispatchUniversalAction,effectiveHandRequiredEnergy,effectiveRequiredEnergy,legalUniversalActions,newUniversalMatch,universalBp,universalCardEnergy,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const pack=createMgsV2Pack();
const packs=[pack,pack];
const byId=new Map(MGS_CARDS.map(card=>[card.id,card]));
const RAID_FRAMES=['MGS-1-015','MGS-1-021','MGS-1-047','MGS-1-060','MGS-1-061','MGS-1-075','MGS-1-076','MGS-1-083','MGS-1-088','MGS-1-101','MGS-1-113'];
const practice=mgsPracticeDeck();
const RICH={
 'MGS-1-003':4,'MGS-1-004':4,'MGS-1-006':4,'MGS-1-007':4,'MGS-1-009':4,
 'MGS-1-012':4,'MGS-1-018':4,'MGS-1-020':2,'MGS-1-023':4,'MGS-1-035':4,
 'MGS-1-041':4,'MGS-1-050':4,'MGS-1-054':2,'MGS-1-022':2
};

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(card=>card.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
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
function readyAp(s,n=2){
 for(let i=0;i<s.players[0].apCards.length;i++){
  s.players[0].apCards[i].inPlay=i<n;
  s.players[0].apCards[i].ready=i<n;
 }
}
function playLine(s,uid,line){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='play'&&item.uid===uid&&item.line===line);
 if(!action)throw Error('No '+line+' play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}
function slot(pl,line){
 const index=pl[line].findIndex(card=>!card);
 if(index<0)throw Error(line+' is full');
 return index;
}
function sit(s,player,id,line,extra={}){
 const physical=take(s,player,id);
 physical.ready=extra.ready!==false;
 physical.entryTurn=extra.entryTurn??(s.turn||1)-1;
 physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 if(extra.faceDown)physical.faceDown=true;
 s.players[player][line][slot(s.players[player],line)]=physical;
 return physical;
}

test('UA42BT and UA42ST are one identity per number on the shared engine',()=>{
 assert.equal(MGS_CARDS.length,113);
 assert.deepEqual(MGS_CARDS.map(card=>card.id),[
  ...Array.from({length:100},(_,i)=>'MGS-1-'+String(i+1).padStart(3,'0')),
  ...Array.from({length:13},(_,i)=>'MGS-1-'+String(101+i))
 ]);
 assert.equal(MGS_CARDS.some(card=>card.id.includes('_p')||/AP\d/.test(card.id)),false);
 assert.equal(MGS_CARDS.every(card=>card.auto===false),true);
 assert.equal(MGS_CARDS.every(card=>card.sourceTc&&card.effectJa&&card.nameJa),true);
 assert.equal(MGS_CARDS.every(card=>card.engineKind===mgsEngineKind(card)),true);
 assert.deepEqual([...MGS_ENGINE_IDS],MGS_CARDS.filter(card=>card.engineKind).map(card=>card.id));
 assert.equal(MGS_ENGINE_IDS.length,113);
 assert.deepEqual(Object.keys(pack.cards),[...MGS_ENGINE_IDS,...MGS2_ENGINE_IDS]);
 assert.equal(JSON.stringify(pack).includes('"op":"mgs"'),false);
 assert.doesNotMatch(readFileSync(new URL('../dist/universal-v2/mgs-pack.mjs',import.meta.url),'utf8'),/from ['"][^'"]*engine\.mjs/);
 assert.equal(V2_TITLE_IDS.includes('mgs'),false);
 const title=TITLES.find(row=>row.id==='mgs');
 assert.equal(title.label,'〈物語〉系列');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,MGS_CARDS.length+MGS2_CARDS.length);
 assert.equal(titleLogo('mgs'),null);

 const reprint=byId.get('MGS-1-035');
 assert.deepEqual(reprint.sets,['UA42BT','UA42ST']);
 assert.equal(reprint.printings.filter(row=>!row.number.includes('_p')).length,2);
 assert.equal(byId.get('MGS-1-101').set,'UA42ST');
 assert.equal(byId.get('MGS-1-001').gen,2);
 assert.equal(byId.get('MGS-1-001').energy,3);
 assert.deepEqual(parseGen('<img alt="黄黄" src="ico_resource_energy_yellow3.png">'),{
  gen:2,genMark:'',color:'yellow',alt:'黄黄',filenameNumber:3,filenameDisagrees:true
 });
 const marked=byId.get('MGS-1-004');
 assert.equal(marked.energy,0);
 assert.equal(marked.gen,1);
 assert.equal(marked.genMark,'+');
 assert.equal(MGS_CARDS.some(card=>card.traits.some(trait=>trait.includes('/')||trait.includes('／'))),false);

 const FRAME_FEATURES={
  'MGS-1-015':['blockFloor','onPlay'],
  'MGS-1-021':['step','energyLossSwap','onPlay'],
  'MGS-1-047':['onPlay','main'],
  'MGS-1-060':['onPlay','main'],
  'MGS-1-061':['attackWin','onPlay'],
  'MGS-1-075':['onAttack','onRetire'],
  'MGS-1-076':['onAttack','onRetire'],
  'MGS-1-083':['onPlay'],
  'MGS-1-088':['main','onRetire'],
  'MGS-1-101':['onPlay','onRetire'],
  'MGS-1-113':['ownTurnBp','onPlay']
 };
 for(const id of RAID_FRAMES){
  const card=byId.get(id);
  assert.ok(card.raidFrame&&card.raidFrame.inside,id);
  assert.ok(pack.cards[id],id);
  for(const feature of FRAME_FEATURES[id])assert.equal(raidBoxListed(id,feature),true,id+' '+feature);
 }
 assert.equal(raidBoxListed('MGS-1-075','onPlay'),false);
 assert.equal(raidBoxListed('MGS-1-060','nameAlias'),false);
 assert.equal(pack.cards['MGS-1-075'].impactNull,true);
 assert.equal(pack.cards['MGS-1-060'].nameAliases.includes('羽川翼'),true);
 assert.equal(MGS_CARDS.filter(card=>card.raidFrame).map(card=>card.id).join(','),RAID_FRAMES.join(','));
 assert.equal(pack.cards['MGS-1-009'].nameAliases.includes('千石撫子'),true);
 assert.equal(pack.cards['MGS-1-009'].name,'千石 撫子');
 assert.equal(pack.cards['MGS-1-013'].triggerEffect.op,'restOppFrontSkipNextActive');
 assert.equal(pack.cards['MGS-1-110'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(pack.cards['MGS-1-110'].impactNull,true);
 assert.equal(pack.cards['MGS-1-022'].effects.onPlay[0].filter.value,'ファイヤーシスターズ');
});

test('the supported practice deck is a legal 50, and a fifth copy stays out',()=>{
 assert.equal(Object.values(practice.counts).reduce((sum,n)=>sum+n,0),50);
 const ready=editorV2Status('mgs',practice.counts,pack);
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.equal(ready.registered,MGS_ENGINE_IDS.length+MGS2_ENGINE_IDS.length);
 const mixed={...practice.counts};
 const four=Object.keys(mixed).find(id=>mixed[id]===4);
 const donor=Object.keys(mixed).find(id=>id!==four&&mixed[id]>0);
 mixed[four]+=1;
 mixed[donor]-=1;
 const blocked=editorV2Status('mgs',mixed,pack);
 assert.equal(blocked.ready,false);
});

test('energy 0 records the entry turn, a closed search keeps every inspected card, and a spaced name matches the effect text',()=>{
 assert.equal(Object.values(RICH).reduce((sum,n)=>sum+n,0),50);
 let opened=toPhase(newUniversalMatch(packs,{decks:[RICH,RICH],seed:42012,first:0}),'main');
 readyAp(opened,2);
 const seeker=take(opened,0,'MGS-1-012');
 const empty=[];
 for(const id of ['MGS-1-003','MGS-1-006','MGS-1-009','MGS-1-018','MGS-1-035','MGS-1-041','MGS-1-050'])
  empty.push(take(opened,0,id));
 opened.players[0].deck.unshift(...empty);
 opened.players[0].hand.push(seeker);
 opened=playLine(opened,seeker.uid,'front');
 assert.equal(opened.players[0].front[0].uid,seeker.uid);
 assert.equal(opened.players[0].front[0].entryTurn,opened.turn);
 assert.equal(opened.pending.kind,'effect-top-order');
 assert.deepEqual(opened.pending.uids,empty.map(card=>card.uid));
 assert.equal(universalPrivateChoices(packs,opened,1),null);
 assert.equal(opened.publicReveals.some(row=>empty.some(card=>card.uid===row.uid)),false);

 let filtered=toPhase(newUniversalMatch(packs,{decks:[RICH,RICH],seed:42023,first:0}),'main');
 readyAp(filtered,2);
 const fuel=take(filtered,0,'MGS-1-004');
 filtered.players[0].hand.push(fuel);
 filtered=playLine(filtered,fuel.uid,'energy');
 assert.equal(filtered.pending,null);
 assert.equal(filtered.players[0].energy[0].entryTurn,filtered.turn);
 assert.equal(filtered.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(pack,filtered,0,fuel),1);
 const match=take(filtered,0,'MGS-1-020');
 const plain=take(filtered,0,'MGS-1-006');
 const other=take(filtered,0,'MGS-1-009');
 filtered.players[0].deck.unshift(match,plain,other);
 const traitSeeker=take(filtered,0,'MGS-1-023');
 filtered.players[0].hand.push(traitSeeker);
 filtered=playLine(filtered,traitSeeker.uid,'front');
 assert.equal(filtered.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(filtered.pending.uids,[match.uid,plain.uid,other.uid]);
 assert.deepEqual(filtered.pending.choices,[match.uid]);
 const seen=universalPrivateChoices(packs,filtered,0);
 assert.deepEqual(seen.inspected.map(card=>card.uid),filtered.pending.uids);
 assert.equal(universalPrivateChoices(packs,filtered,1),null);
 assert.equal(filtered.publicReveals.some(row=>[match.uid,plain.uid,other.uid].includes(row.uid)),false);

 let named=toPhase(newUniversalMatch(packs,{decks:[RICH,RICH],seed:42007,first:0}),'main');
 const karen=sit(named,0,'MGS-1-007','front');
 assert.equal(universalBp(pack,named,karen),2000);
 const nadeko=sit(named,0,'MGS-1-009','energy',{faceDown:true});
 assert.equal(universalBp(pack,named,karen),2000);
 nadeko.faceDown=false;
 assert.equal(universalBp(pack,named,karen),3000);

 let sister=toPhase(newUniversalMatch(packs,{decks:[RICH,RICH],seed:42022,first:0}),'main');
 readyAp(sister,1);
 const hitagi=sit(sister,0,'MGS-1-020','front');
 const otherYellow=sit(sister,0,'MGS-1-003','front');
 const tsukihi=take(sister,0,'MGS-1-022');
 sister.players[0].hand.push(tsukihi);
 sister=playLine(sister,tsukihi.uid,'front');
 assert.equal(sister.pending.kind,'effect-buff-own');
 assert.deepEqual(sister.pending.choices,[hitagi.uid]);
 assert.equal(sister.pending.choices.includes(otherYellow.uid),false);
 assert.equal(sister.pending.choices.includes(tsukihi.uid),false);
});

function deckWith(ids){
 const counts={'MGS-1-003':4,'MGS-1-004':4,'MGS-1-006':4,'MGS-1-007':4,'MGS-1-012':4,
  'MGS-1-018':4,'MGS-1-020':4,'MGS-1-035':4,'MGS-1-041':4};
 for(const id of ids)counts[id]=(counts[id]||0)+1;
 counts['MGS-1-050']=4;
 counts['MGS-1-054']=4;
 return counts;
}
function act(s,action){
 return dispatchUniversalAction(packs,s,action,{actor:s.pending?s.pending.player:0});
}

 test('new shared prints keep the window, the hand cost, and the once-per-turn limit',()=>{
 const deck=deckWith(['MGS-1-024','MGS-1-042','MGS-1-062','MGS-1-078','MGS-1-080','MGS-1-109']);
 deck['MGS-1-054']-=1;
 deck['MGS-1-080']+=1;
 assert.equal(Object.values(deck).reduce((sum,n)=>sum+n,0),50);
 let milled=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42109,first:0}),'main');
 readyAp(milled,2);
 const shown=[take(milled,0,'MGS-1-003'),take(milled,0,'MGS-1-006'),take(milled,0,'MGS-1-007')];
 milled.players[0].deck.unshift(...shown);
 const field=take(milled,0,'MGS-1-109');
 milled.players[0].hand.push(field);
 milled=playLine(milled,field.uid,'energy');
 assert.equal(milled.pending,null);
 const played=milled.players[0].energy.find(card=>card?.uid===field.uid);
 assert.equal(played.entryTurn,milled.turn);
 assert.deepEqual(milled.players[0].outside.slice(-3).map(card=>card.uid),shown.map(card=>card.uid));
 assert.equal(shown.every(card=>milled.publicReveals.some(row=>row.uid===card.uid&&row.kind==='revealed-window')),true);

 let looked=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42062,first:0}),'main');
 readyAp(looked,2);
 sit(looked,0,'MGS-1-042','energy');
 const match=take(looked,0,'MGS-1-003');
 const plain=take(looked,0,'MGS-1-109');
 const other=take(looked,0,'MGS-1-006');
 looked.players[0].deck.unshift(match,plain,other);
 const seeker=take(looked,0,'MGS-1-062');
 looked.players[0].hand.push(seeker);
 looked=playLine(looked,seeker.uid,'energy');
 assert.equal(looked.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(looked.pending.uids,[match.uid,plain.uid,other.uid]);
 assert.deepEqual(looked.pending.choices,[match.uid,other.uid]);
 assert.deepEqual(universalPrivateChoices(packs,looked,0).inspected.map(card=>card.uid),looked.pending.uids);
 assert.equal(universalPrivateChoices(packs,looked,1),null);
 assert.equal(looked.publicReveals.some(row=>[match.uid,plain.uid,other.uid].includes(row.uid)),false);

 let attack=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42024,first:0}),'main');
 const karen=sit(attack,0,'MGS-1-024','front');
 attack=toPhase(attack,'attack');
 attack=act(attack,{type:'attack',uid:karen.uid});
 assert.equal(attack.pending.kind,'effect-next');
 assert.equal(attack.pending.mode,'draw');
 assert.equal(attack.pending.count,1);
 attack=act(attack,{type:'nextPrint',mode:'done'});
 assert.equal((attack.continuousStates||[]).some(row=>row.kind==='skipNextActive'&&row.targetUid===karen.uid),false);

 let once=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42042,first:0}),'main');
 const source=sit(once,0,'MGS-1-042','front');
 const ally=sit(once,0,'MGS-1-003','front');
 once=act(once,legalUniversalActions(packs,once).find(action=>action.uid===source.uid&&action.mode==='selfRestBuff'));
 assert.equal(once.pending.kind,'effect-buff-own');
 once=act(once,{type:'chooseOwnBuff',uid:ally.uid});
 const liveAlly=once.players[0].front.flat().find(card=>card?.uid===ally.uid);
 assert.equal(universalBp(pack,once,liveAlly),pack.cards['MGS-1-003'].bp+1000);
 once.players[0].front.flat().find(card=>card?.uid===source.uid).ready=true;
 assert.equal(legalUniversalActions(packs,once).some(action=>action.uid===source.uid&&action.mode==='selfRestBuff'),false);

 let cost=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42080,first:0}),'main');
 const cut=sit(cost,0,'MGS-1-080','front');
 assert.equal(effectiveRequiredEnergy(pack,cost,cut),0);
 assert.equal(universalBp(pack,cost,cut),3000);
 const hand=take(cost,0,'MGS-1-078');
 cost.players[0].hand.push(hand);
 assert.equal(effectiveHandRequiredEnergy(pack,cost,0,pack.cards['MGS-1-078'],hand),1);
 const host=sit(cost,0,'MGS-1-003','energy');
 const origin=take(cost,0,'MGS-1-080');
 host.stack=[origin];
 assert.equal(effectiveRequiredEnergy(pack,cost,origin),0);
 assert.equal(universalBp(pack,cost,host),pack.cards['MGS-1-003'].bp);
 assert.equal(universalBp(pack,cost,origin),4000);
 while(cost.players[0].outside.length<10)cost.players[0].outside.push(cost.players[0].deck.shift());
 assert.equal(effectiveRequiredEnergy(pack,cost,cut),3);
 assert.equal(universalBp(pack,cost,cut),4000);
 assert.equal(effectiveHandRequiredEnergy(pack,cost,0,pack.cards['MGS-1-078'],hand),1);
});

test('the last prints keep a private window, a raid frame, and a name-wide once',()=>{
 const deck=deckWith(['MGS-1-002','MGS-1-058','MGS-1-059','MGS-1-060','MGS-1-075','MGS-1-079','MGS-1-105']);
 deck['MGS-1-054']-=3;
 deck['MGS-1-050']-=1;
 deck['MGS-1-059']+=1;
 deck['MGS-1-079']+=1;
 deck['MGS-1-009']=1;
 assert.equal(Object.values(deck).reduce((sum,n)=>sum+n,0),50);
 let looked=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42002,first:0}),'main');
 readyAp(looked,2);
 for(let i=0;i<4;i++)sit(looked,0,'MGS-1-004','energy');
 const nadeko=take(looked,0,'MGS-1-009');
 const suruga=take(looked,0,'MGS-1-075');
 const plain=take(looked,0,'MGS-1-018');
 const other=take(looked,0,'MGS-1-020');
 const last=take(looked,0,'MGS-1-035');
 looked.players[0].deck.unshift(nadeko,suruga,plain,other,last);
 const seeker=take(looked,0,'MGS-1-002');
 looked.players[0].hand.push(seeker);
 looked=playLine(looked,seeker.uid,'front');
 assert.equal(looked.pending.kind,'effect-next');
 assert.equal(looked.pending.mode,'look');
 assert.deepEqual(looked.pending.uids,[nadeko.uid,suruga.uid,plain.uid,other.uid,last.uid]);
 assert.deepEqual(looked.pending.choices,[nadeko.uid,suruga.uid]);
 assert.deepEqual(universalPrivateChoices(packs,looked,0).inspected.map(card=>card.uid),looked.pending.uids);
 assert.equal(universalPrivateChoices(packs,looked,1),null);
 looked=act(looked,{type:'nextPrint',mode:'take',uid:nadeko.uid});
 looked=act(looked,{type:'nextPrint',mode:'take',uid:suruga.uid});
 while(looked.pending?.mode==='order'){
  const uid=looked.pending.uids[0];
  looked=act(looked,{type:'nextPrint',mode:'bottom',uid});
 }
 assert.equal(looked.players[0].hand.some(card=>card.uid===nadeko.uid),true);
 assert.equal(looked.players[0].hand.some(card=>card.uid===suruga.uid),true);
 assert.equal(looked.publicReveals.some(row=>row.uid===nadeko.uid&&row.kind==='searched-to-hand'),true);
 assert.equal(looked.publicReveals.some(row=>row.uid===plain.uid),false);
 assert.equal(looked.players[0].front.find(card=>card?.uid===seeker.uid).entryTurn,looked.turn);

 let reveal=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42058,first:0}),'main');
 readyAp(reveal,2);
 for(let i=0;i<4;i++)sit(reveal,0,'MGS-1-041','energy');
 const top=take(reveal,0,'MGS-1-003');
 reveal.players[0].deck.unshift(top);
 const named=take(reveal,0,'MGS-1-058');
 reveal.players[0].hand.push(named);
 reveal=playLine(reveal,named.uid,'front');
 assert.equal(reveal.pending.mode,'number');
 const wrong=reveal.pending.numbers.find(number=>number!==pack.cards['MGS-1-003'].energy);
 reveal=act(reveal,{type:'lastPrint',mode:'number',number:wrong});
 assert.equal(reveal.players[0].deck[0].uid,top.uid);
 assert.equal(reveal.publicReveals.some(row=>row.uid===top.uid&&row.kind==='revealed-window'),true);

 let once=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42059,first:0}),'main');
 const first=sit(once,0,'MGS-1-059','front');
 const second=sit(once,0,'MGS-1-059','front');
 const wing=sit(once,0,'MGS-1-060','front',{ready:true});
 wing.stack=[take(once,0,'MGS-1-003')];
 once.players[0].deck.unshift(take(once,0,'MGS-1-006'));
 once=act(once,legalUniversalActions(packs,once).find(action=>action.uid===first.uid&&action.mode==='main'));
 assert.equal(once.pending.mode,'number');
 once=act(once,{type:'lastPrint',mode:'number',number:0});
 assert.equal(legalUniversalActions(packs,once).some(action=>action.uid===second.uid&&action.mode==='main'),false);
 assert.equal(legalUniversalActions(packs,once).some(action=>action.uid===wing.uid&&action.mode==='main'),true);

 let ordinary=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42075,first:0}),'main');
 const loose=sit(ordinary,0,'MGS-1-075','front');
 ordinary=toPhase(ordinary,'attack');
 ordinary=act(ordinary,{type:'attack',uid:loose.uid});
 assert.notEqual(ordinary.pending?.mode,'tuck');
 let raided=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42076,first:0}),'main');
 const tight=sit(raided,0,'MGS-1-075','front');
 tight.stack=[take(raided,0,'MGS-1-003')];
 raided.players[0].deck.unshift(take(raided,0,'MGS-1-006'));
 raided=toPhase(raided,'attack');
 raided=act(raided,{type:'attack',uid:tight.uid});
 assert.equal(raided.pending.mode,'tuck');

 let cut=toPhase(newUniversalMatch(packs,{decks:[deck,deck],seed:42079,first:0}),'main');
 const body=sit(cut,0,'MGS-1-079','front');
 assert.equal(effectiveRequiredEnergy(pack,cut,body),0);
 const held=take(cut,0,'MGS-1-079');
 cut.players[0].hand.push(held);
 assert.equal(effectiveHandRequiredEnergy(pack,cut,0,pack.cards['MGS-1-079'],held),3);
 const piled=sit(cut,0,'MGS-1-105','front');
 piled.under=[Object.assign(take(cut,0,'MGS-1-003'),{faceDown:true}),Object.assign(take(cut,0,'MGS-1-006'),{faceDown:true})];
 assert.equal(universalBp(pack,cut,piled),3000);
});
