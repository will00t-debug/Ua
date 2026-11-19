import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TORIKO_CARDS} from '../dist/toriko-cards.mjs';
import {createTrkV2Pack,TORIKO_ENGINE_IDS} from '../dist/universal-v2/trk-pack.mjs';
import {trkEngineKind} from '../dist/universal-v2/trk-classify.mjs';
import {parseGen,parseNeed} from '../scripts/fetch-trk-ua17.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {officialV2Pack,torikoPracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';

const pack=createTrkV2Pack();
const packs=[pack,pack];
const byId=new Map(TORIKO_CARDS.map(card=>[card.id,card]));
const BLUE=['TRK-1-037','TRK-1-038','TRK-1-040','TRK-1-041','TRK-1-043','TRK-1-044','TRK-1-050','TRK-1-052','TRK-1-055','TRK-1-058','TRK-1-061','TRK-1-101'];

function blueDeck(){
 const counts=Object.fromEntries(BLUE.map(id=>[id,4]));
 counts['TRK-1-102']=2;
 return counts;
}

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(card=>card.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
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

function fresh(deck,seed=17017){
 return newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
}

function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}

function playFront(s,uid){
 const action=legalUniversalActions(packs,s).find(item=>item.type==='play'&&item.uid===uid&&item.line==='front');
 if(!action)throw Error('No front play for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}

test('UA17 Toriko catalogue is one identity per number and keeps the printed energy',()=>{
 assert.equal(TORIKO_CARDS.length,109);
 assert.equal(new Set(TORIKO_CARDS.map(card=>card.id)).size,109);
 assert.equal(TORIKO_CARDS.some(card=>/AP/i.test(card.id)||card.type==='ap'),false);
 assert.equal(TORIKO_CARDS.some(card=>/_p/.test(card.id)),false);
 const starter=['TRK-1-101','TRK-1-102','TRK-1-103','TRK-1-104','TRK-1-105','TRK-1-106','TRK-1-107','TRK-1-108','TRK-1-109'];
 for(const id of starter)assert.deepEqual(byId.get(id).sets,['UA17ST']);
 const reprint=byId.get('TRK-1-041');
 assert.deepEqual(reprint.sets,['UA17BT','UA17ST']);
 assert.deepEqual(reprint.printings.map(row=>row.number),['UA17BT/TRK-1-041','UA17ST/TRK-1-041']);
 const iron=byId.get('TRK-1-005');
 assert.equal(iron.gen,1);
 assert.equal(iron.genMark,'+');
 assert.equal(iron.energy,0);
 assert.equal(iron.color,'yellow');
 assert.deepEqual(iron.traits,['再生屋']);
 assert.equal(iron.engineKind,null);
 assert.equal(iron.auto,false);
 assert.match(iron.effectJa,/このターン中、このキャラの発生エナジー\+【黄】。メインフェイズ終了時、このキャラを退場させる。/);
 assert.doesNotMatch(iron.effectJa,/を得る/);
 const parsed=parseGen('<img src="/images/cardlist/ico_resource_energy_yellow2.png" alt="黄+">');
 assert.equal(parsed.gen,1);
 assert.equal(parsed.genMark,'+');
 assert.equal(parsed.filenameNumber,2);
 assert.equal(parsed.filenameDisagrees,true);
 const need=parseNeed('<img src="/images/cardlist/ico_character_energy_yellow0.png" alt="黄-">');
 assert.equal(need.energy,0);
 assert.equal(need.color,'yellow');
 const slash=['美食會／副料理長','美食會／ボス','美食會／料理長','美食會／料理人'];
 const seen=new Set(TORIKO_CARDS.flatMap(card=>card.traits));
 for(const trait of slash)assert.equal(seen.has(trait),true);
 assert.equal(seen.has('副料理長')||seen.has('料理長')||seen.has('ボス'),false);
 assert.equal(TORIKO_CARDS.every(card=>card.auto===false&&!card.traitComponents),true);
 const sunny=byId.get('TRK-1-002');
 assert.equal(sunny.faq.some(entry=>entry.id==='Q796'),true);
 assert.equal(sunny.engineKind,null);
});

test('only a whole Japanese print joins the shared pack',()=>{
 for(const card of TORIKO_CARDS)assert.equal(card.engineKind,trkEngineKind(card));
 assert.deepEqual(TORIKO_ENGINE_IDS,TORIKO_CARDS.filter(card=>card.engineKind).map(card=>card.id));
 assert.equal(TORIKO_ENGINE_IDS.length,34);
 assert.deepEqual(Object.keys(pack.cards).sort(),[...TORIKO_ENGINE_IDS].sort());
 assert.equal(pack.cards['TRK-1-005'],undefined);
 assert.equal(pack.cards['TRK-1-047'],undefined);
 assert.equal(pack.cards['TRK-1-082'],undefined);
 assert.equal(byId.get('TRK-1-048').engineKind,null);
 const source=readFileSync(new URL('../dist/universal-v2/trk-pack.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/op:\s*['"]trk['"]/);
 assert.doesNotMatch(source,/restSelfGainEnergyRetireEndMain/);
 assert.equal(JSON.stringify(pack).includes('"op":"trk"'),false);
 assert.equal(pack.cards['TRK-1-041'].printedImpact,1);
 assert.deepEqual(pack.cards['TRK-1-041'].effects,{});
 assert.deepEqual(pack.cards['TRK-1-075'].effects,{onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]});
 assert.deepEqual(pack.cards['TRK-1-003'].opponentFieldColorsHandEnergyDiscount,{colors:['blue','purple'],amount:1});
 assert.equal(V2_TITLE_IDS.includes('toriko'),false);
 const title=TITLES.find(row=>row.id==='toriko');
 assert.equal(title.label,'美食獵人');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,109);
 const practice=torikoPracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((sum,n)=>sum+n,0),50);
 assert.equal(Object.keys(practice.counts).every(id=>pack.cards[id].color==='blue'),true);
 assert.deepEqual(Object.keys(officialV2Pack('toriko').cards).sort(),Object.keys(pack.cards).sort());
 const ready=editorV2Status('toriko',practice.counts,pack);
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.equal(ready.registered,34);
 const blocked={...practice.counts};
 const donor=Object.keys(blocked).find(id=>blocked[id]>=1);
 blocked[donor]-=1;
 blocked['TRK-1-005']=1;
 assert.equal(editorV2Status('toriko',blocked,pack).ready,false);
 assert.ok(validateUniversalDeck(pack,blocked).some(issue=>issue.includes('TRK-1-005')));
 assert.throws(()=>fresh(blocked),/TRK-1-005/);
});

test('a vanilla character, a draw-and-discard, a hand discount and a full top window resolve on the shared engine',()=>{
 const deck=blueDeck();
 let vanilla=toPhase(fresh(deck,17040),'main');
 readyAp(vanilla);
 const plain=take(vanilla,0,'TRK-1-052');
 vanilla.players[0].hand.push(plain);
 vanilla=playFront(vanilla,plain.uid);
 assert.equal(vanilla.pending,null);
 assert.equal(vanilla.players[0].front.some(card=>card&&card.uid===plain.uid),true);

 let draw=toPhase(fresh(deck,17044),'main');
 readyAp(draw);
 const discarder=take(draw,0,'TRK-1-044');
 draw.players[0].hand.push(discarder);
 const before=draw.players[0].deck.length;
 draw=playFront(draw,discarder.uid);
 assert.equal(draw.players[0].deck.length,before-1);
 assert.equal(draw.pending.kind,'effect-discard');
 assert.equal(draw.pending.player,0);
 assert.equal(draw.players[0].hand.length>0,true);

 const mixed={...deck,'TRK-1-102':0,'TRK-1-003':1,'TRK-1-075':1};
 delete mixed['TRK-1-102'];
 const lookDeck={
  'TRK-1-037':4,'TRK-1-038':4,'TRK-1-040':4,'TRK-1-041':4,'TRK-1-043':4,
  'TRK-1-044':4,'TRK-1-050':4,'TRK-1-052':4,'TRK-1-055':2,'TRK-1-058':4,
  'TRK-1-061':2,'TRK-1-075':2,'TRK-1-078':4,'TRK-1-092':4
 };
 let discount=toPhase(fresh(mixed,17003),'main');
 const yellow=pack.cards['TRK-1-003'];
 assert.equal(zoneRequiredEnergy(pack,discount,0,yellow,'hand'),3);
 put(discount,1,'TRK-1-040','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,discount,0,yellow,'hand'),2);

 let look=toPhase(fresh(lookDeck,17075),'main');
 readyAp(look);
 for(let copy=0;copy<2;copy++){
  const energy=take(look,0,'TRK-1-078');
  look.players[0].hand.push(energy);
  const action=legalUniversalActions(packs,look).find(item=>item.type==='play'&&item.uid===energy.uid&&item.line==='energy');
  if(!action)throw Error('Purple energy was not playable');
  look=dispatchUniversalAction(packs,look,action,{actor:0});
  if(look.pending)throw Error('Energy play opened '+look.pending.kind);
 }
 const event=take(look,0,'TRK-1-061');
 const other=take(look,0,'TRK-1-052');
 look.players[0].deck.unshift(other,event);
 const keeper=take(look,0,'TRK-1-075');
 look.players[0].hand.push(keeper);
 look=playFront(look,keeper.uid);
 assert.equal(look.pending.kind,'effect-top-inspect-many');
 assert.deepEqual(look.pending.uids,[other.uid,event.uid]);
 const shown=look.pending.uids.map(uid=>{
  const physical=[...look.players[0].deck,...look.players[0].hand,...look.players[0].life].find(card=>card.uid===uid);
  return physical.cardId;
 });
 assert.deepEqual(shown,['TRK-1-052','TRK-1-061']);
});
