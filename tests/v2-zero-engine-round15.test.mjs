import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalCardEnergy,universalEnergyByColor,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Zero engine edits. Official pages checked 2026-10-22 and none contained an
// FAQ block. SAO-2-006 generated-energy alt is 黄+ (one pip plus the printed
// conditional sentence), so gen is 1. SAO-2-008 and SLG-1-062 print 自分のターン中
// and 他の only on the SAO cards. SLG-1-062 counts itself. MST-1-066 generated
// energy is two green pips (gen 2) plus the alias and the energy threshold.

const sao=registeredV2TitlePack('sword-art-online');
const slg=registeredV2TitlePack('solo-leveling');
const mst=registeredV2TitlePack('mushoku-tensei');
const saoPacks=[sao,sao],slgPacks=[slg,slg],mstPacks=[mst,mst];
const knight={kind:'ownTraitCount',turn:'any',min:3,zone:'field',excludeSelf:true,trait:'整合騎士'};
const knightTurn={...knight,turn:'own',min:4};

function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13,pack.id);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 return counts;
}
const saoDeck=deck(sao,['SAO-2-006','SAO-2-008','SAO-1-010','SAO-1-008']);
const slgDeck=deck(slg,['SLG-1-062','SLG-1-056','SLG-1-069','SLG-1-042']);
const mstDeck=deck(mst,['MST-1-066','MST-1-046','MST-1-001','MST-1-013']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function many(s,p,id,n,line,start){
 return Array.from({length:n},(_,i)=>place(s,p,id,line,start+i));
}
function toPhase(packs,s,phase){
 for(let n=0;n<6&&s.phase!==phase;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function silence(s,target,until){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:target.uid,
  targetUid:target.uid,sourceLinked:false,until});
}
function aiLegal(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('four existing-DSL cards keep the official print, traits, and a legal 50-card deck',()=>{
 const six=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-006');
 const eight=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-008');
 assert.equal(six.effectJa,'自分の場に他の［特徴：整合騎士］が3枚以上ある場合、このキャラの発生エナジー+【黄】。');
 assert.equal(six.gen,1);
 assert.equal(six.trigger,null);
 assert.equal(eight.effectJa,'【自分のターン中】自分の場に他の［特徴：整合騎士］が4枚以上ある場合、このキャラはBP+1500。');
 assert.equal(eight.bpPrinted,'1500+');
 assert.equal(eight.trigger,'active');
 const energy=sao.cards['SAO-2-006'],bp=sao.cards['SAO-2-008'];
 assert.equal(energy.name,'ベルクーリ・シンセシス・ワン');
 assert.deepEqual(energy.passiveBonuses,[{condition:knight,extraEnergy:1}]);
 assert.equal(energy.activeExtraEnergy,0);
 assert.equal(energy.frontGeneratesEnergy,false);
 assert.equal(energy.gen,1);
 assert.deepEqual(energy.effects,{});
 assert.equal(bp.name,'レンリ・シンセシス・トゥエニセブン');
 assert.deepEqual(bp.passiveBonuses,[{condition:knightTurn,bp:1500}]);
 assert.equal(bp.triggerEffect,null);
 assert.deepEqual(bp.traits,['整合騎士']);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-006'));
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-008'));
 const shizuku=slg.cards['SLG-1-062'];
 assert.equal(shizuku.name,'最上 真');
 assert.deepEqual(shizuku.traits,['第四次架南島レイド']);
 assert.deepEqual(shizuku.passiveBonuses,[{condition:{kind:'ownTraitCount',turn:'own',min:5,
  zone:'field',excludeSelf:false,trait:'第四次架南島レイド'},bp:1500}]);
 assert.equal(shizuku.trigger,'draw');
 assert.deepEqual(SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-062').traits,['第四次架南島Raid']);
 assert.ok(EXPECTED_V2_IDS['solo-leveling'].includes('SLG-1-062'));
 const fitz=mst.cards['MST-1-066'];
 assert.equal(UA54BT_OFFICIAL_PRINT['MST-1-066'].effectJa,
  'このカードは〈シルフィエット〉としても扱う。\n 〖自分のターン中〗 自分の発生エナジーが7以上ある場合、このキャラはBP+1000。');
 assert.equal(UA54BT_OFFICIAL_PRINT['MST-1-066'].gen,2);
 assert.equal(fitz.name,'フィッツ');
 assert.deepEqual(fitz.nameAliases,['シルフィエット']);
 assert.deepEqual(fitz.traits,['ラノア魔法大学']);
 assert.deepEqual(fitz.passiveBonuses,[{condition:{kind:'ownEnergyAtLeast',turn:'own',min:7},bp:1000}]);
 assert.equal(fitz.gen,2);
 assert.equal(fitz.trigger,'draw');
 assert.equal(cardHasName(fitz,'シルフィエット'),true);
 assert.equal(cardHasName(fitz,'フィッツ'),true);
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-066'));
});

test('SAO-2-006 adds one yellow only on the energy line while three other knights are present',()=>{
 let s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:2006,first:0});
 s=toPhase(saoPacks,s,'main');
 const self=place(s,0,'SAO-2-006','energy',0,true);
 many(s,0,'SAO-1-010',3,'front',0);
 assert.equal(self.cardId,'SAO-2-006');
 assert.equal(universalCardEnergy(sao,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(sao,s,0).yellow,2);
 assert.equal(universalCardEnergy(sao,s,0,s.players[0].front[0]),0);
 const short=structuredClone(s);
 short.players[0].front[2]=null;
 assert.equal(universalCardEnergy(sao,short,0,short.players[0].energy[0]),1);
 const front=structuredClone(s);
 const moved=front.players[0].energy[0];
 front.players[0].energy[0]=null;
 front.players[0].front[3]=moved;
 assert.equal(universalCardEnergy(sao,front,0,front.players[0].front[3]),0);
 assert.equal(universalEnergyByColor(sao,front,0).yellow,undefined);
 const enemy=structuredClone(s);enemy.active=1;
 assert.equal(universalCardEnergy(sao,enemy,0,enemy.players[0].energy[0]),2);
 silence(s,s.players[0].energy[0],{player:0,phase:'main',edge:'end'});
 assert.equal(universalCardEnergy(sao,s,0,s.players[0].energy[0]),1);
 assert.equal(universalPublicView(saoPacks,s,1).players[0].hand,null);
 assert.equal(universalPublicView(saoPacks,s,1).players[0].energy[0].produces,1);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(saoPacks,s);
 assert.throws(()=>dispatchUniversalAction(saoPacks,s,{type:'play',uid:'0-missing',line:'front',slot:0}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(saoPacks,s),true);
 assert.equal(assertUniversalMatch(saoPacks,enemy),true);
});

test('SAO-2-008 gains 1500 BP on its own turn with four other knights, and ACTIVE is the standard trigger',()=>{
 let s=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:2008,first:0});
 s=toPhase(saoPacks,s,'main');
 const self=place(s,0,'SAO-2-008','front',0,false);
 many(s,0,'SAO-1-010',3,'energy',0);
 assert.equal(universalBp(saoPacks,s,s.players[0].front[0]),1500);
 place(s,0,'SAO-1-010','energy',3);
 assert.equal(universalBp(saoPacks,s,s.players[0].front[0]),3000);
 const enemy=structuredClone(s);enemy.active=1;
 assert.equal(universalBp(saoPacks,enemy,enemy.players[0].front[0]),1500);
 silence(s,self,{player:0,phase:'main',edge:'end'});
 assert.equal(universalBp(saoPacks,s,s.players[0].front[0]),1500);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(saoPacks,s);
 assert.equal(assertUniversalMatch(saoPacks,s),true);

 let flip=newUniversalMatch(saoPacks,{decks:[saoDeck,saoDeck],seed:2009,first:0});
 flip=toPhase(saoPacks,flip,'attack');
 const striker=place(flip,0,'SAO-1-008','front',0,true);
 const front=place(flip,1,'SAO-1-010','front',0,false);
 const energy=place(flip,1,'SAO-1-011','energy',0,false);
 const revealed=take(flip,1,'SAO-2-008');
 flip.players[1].deck.push(flip.players[1].life.shift());
 flip.players[1].life.unshift(revealed);
 flip=dispatchUniversalAction(saoPacks,flip,{type:'attack',uid:striker.uid});
 flip=dispatchUniversalAction(saoPacks,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'active');
 assert.equal(flip.pending.uid,revealed.uid);
 const legal=legalUniversalActions(saoPacks,flip);
 assert.ok(legal.some(a=>a.mode==='active'&&a.uid===front.uid));
 assert.ok(legal.some(a=>a.mode==='active'&&a.uid===energy.uid));
 assert.equal(legal.some(a=>a.uid===striker.uid),false);
 aiLegal(saoPacks,flip);
 const skipped=dispatchUniversalAction(saoPacks,flip,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[1].front[0].ready,false);
 assert.ok(skipped.players[1].outside.some(c=>c.uid===revealed.uid));
 assert.equal(universalBp(saoPacks,skipped,skipped.players[1].front[0]),1500);
 flip=dispatchUniversalAction(saoPacks,flip,{type:'chooseTrigger',mode:'active',uid:front.uid},{actor:1});
 assert.equal(flip.players[1].front[0].uid,front.uid);
 assert.equal(flip.players[1].front[0].ready,true);
 assert.equal(universalBp(saoPacks,flip,flip.players[1].front[0]),4500);
 assert.equal(universalPublicView(saoPacks,flip,0).players[1].hand,null);
 assert.equal(countCards(flip.players[1]),50);
 assert.equal(assertUniversalMatch(saoPacks,flip),true);
});

test('SLG-1-062 counts five raid-trait characters including itself, and DRAW adds one hidden card',()=>{
 let s=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed:1062,first:0});
 s=toPhase(slgPacks,s,'main');
 const self=place(s,0,'SLG-1-062','front',0);
 many(s,0,'SLG-1-062',3,'energy',0);
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),1500);
 const other=place(s,0,'SLG-1-069','energy',3);
 // Official 069 carries DFN／第四次架南島レイド; verified components
 // mean it IS the fifth 第四次架南島レイド character (not a missing trait).
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),3000);
 s.players[0].outside.push(other);
 s.players[0].energy[3]=null;
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),1500,
  'a card moved outside stops contributing to the live field count');
 place(s,0,'SLG-1-056','front',1);
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),3000);
 const enemy=structuredClone(s);enemy.active=1;
 assert.equal(universalBp(slgPacks,enemy,enemy.players[0].front[0]),1500);
 silence(s,self,{player:0,phase:'main',edge:'end'});
 assert.equal(universalBp(slgPacks,s,s.players[0].front[0]),1500);
 assert.equal(universalBp(slgPacks,s,s.players[0].energy[0]),3000);
 assert.equal(universalPublicView(slgPacks,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(slgPacks,s);
 assert.equal(assertUniversalMatch(slgPacks,s),true);

 let flip=newUniversalMatch(slgPacks,{decks:[slgDeck,slgDeck],seed:1063,first:0});
 flip=toPhase(slgPacks,flip,'attack');
 const striker=place(flip,0,'SLG-1-042','front',0,true);
 const revealed=take(flip,1,'SLG-1-062');
 flip.players[1].deck.push(flip.players[1].life.shift());
 flip.players[1].life.unshift(revealed);
 flip=dispatchUniversalAction(slgPacks,flip,{type:'attack',uid:striker.uid});
 flip=dispatchUniversalAction(slgPacks,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'draw');
 const hand=flip.players[1].hand.length,deckBefore=flip.players[1].deck.length;
 aiLegal(slgPacks,flip);
 const skipped=dispatchUniversalAction(slgPacks,flip,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[1].hand.length,hand);
 assert.equal(skipped.players[1].deck.length,deckBefore);
 flip=dispatchUniversalAction(slgPacks,flip,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(flip.players[1].hand.length,hand+1);
 assert.equal(flip.players[1].deck.length,deckBefore-1);
 assert.ok(flip.players[1].outside.some(c=>c.uid===revealed.uid));
 assert.equal(universalPublicView(slgPacks,flip,0).players[1].hand,null);
 assert.equal(flip.players[1].hand.some(c=>c.cardId),true);
 assert.equal(countCards(flip.players[1]),50);
 assert.equal(assertUniversalMatch(slgPacks,flip),true);
});

test('MST-1-066 gains 1000 BP on its own turn at seven generated energy, and its alias is silence-sensitive',()=>{
 let s=newUniversalMatch(mstPacks,{decks:[mstDeck,mstDeck],seed:1066,first:0});
 s=toPhase(mstPacks,s,'main');
 const self=place(s,0,'MST-1-066','front',0);
 many(s,0,'MST-1-046',3,'energy',0);
 assert.equal(universalEnergyByColor(mst,s,0).green,6);
 assert.equal(universalBp(mstPacks,s,s.players[0].front[0]),3000);
 assert.equal(universalCardEnergy(mst,s,0,s.players[0].front[0]),0);
 place(s,0,'MST-1-046','energy',3);
 assert.equal(universalEnergyByColor(mst,s,0).green,8);
 assert.equal(universalBp(mstPacks,s,s.players[0].front[0]),4000);
 const alone=structuredClone(s);
 for(const c of alone.players[0].energy)if(c)alone.players[0].outside.push(c);
 alone.players[0].energy=[alone.players[0].front[0],null,null,null];
 alone.players[0].front[0]=null;
 assert.equal(universalCardEnergy(mst,alone,0,alone.players[0].energy[0]),2);
 assert.equal(universalBp(mstPacks,alone,alone.players[0].energy[0]),3000);
 const enemy=structuredClone(s);enemy.active=1;
 assert.equal(universalBp(mstPacks,enemy,enemy.players[0].front[0]),3000);
 assert.equal(cardHasName(mst.cards['MST-1-066'],'シルフィエット',false),true);
 silence(s,self,{player:0,phase:'main',edge:'end'});
 assert.equal(universalBp(mstPacks,s,s.players[0].front[0]),3000);
 assert.equal(cardHasName(mst.cards['MST-1-066'],'シルフィエット',true),false);
 assert.equal(cardHasName(mst.cards['MST-1-066'],'フィッツ',true),true);
 assert.equal(universalPublicView(mstPacks,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 aiLegal(mstPacks,s);
 assert.throws(()=>dispatchUniversalAction(mstPacks,s,{type:'activate',uid:'0-missing'}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(mstPacks,s),true);
 assert.equal(assertUniversalMatch(mstPacks,enemy),true);
});
