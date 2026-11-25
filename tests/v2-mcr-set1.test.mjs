// Macross set 1 lands through the shared V2 pack. The catalog stays unverified.
// These probes cover the printed profiles that already exist as shared ops.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mcrCatalog} from '../dist/mcr/catalog.mjs';
import {MCR_RAID_FRAME_NUMBERS} from '../dist/mcr/catalog.mjs';
import {mcrSharedProgram} from '../dist/universal-v2/mcr/programs.mjs';
import {mcrSharedCard} from '../dist/universal-v2/mcr-shared-adapter.mjs';
import {MCR_STAGING_IDS,createMcrStagingPack} from '../dist/universal-v2/mcr-staging-pack.mjs';
import {createMcrBattlePack,mcrPracticeDeck,officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView,
 universalCardEnergy,universalBp} from '../dist/universal-v2/engine.mjs';

const READY=[
 '001','002','003','005','006','007','013','016','017','018','025','026','027',
 '034','037','038','039','042','050','053','055','056','057','058','059','061',
 '066','070','071','072','075','076','078','080','081','084','085','089','097',
 '103','104','106','110','113'
].map(n=>'MCR-1-'+n);

const pack=createMcrStagingPack();
const packs=pack;

function id(n){return 'MCR-1-'+n;}
function deckOf(extra={}){
 const counts={...extra};
 let total=Object.values(counts).reduce((n,v)=>n+v,0);
 const caps={final:0,color:0,special:0};
 for(const [cardId,num] of Object.entries(counts)){
  const trigger=pack.cards[cardId].trigger;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=num;
 }
 for(const card of Object.values(pack.cards)){
  if(total>=50)break;
  const trigger=card.trigger;
  const capped=Object.prototype.hasOwnProperty.call(caps,trigger);
  if(capped&&caps[trigger]>=4)continue;
  const have=counts[card.id]||0;
  const room=Math.min(4-have,50-total,capped?4-caps[trigger]:4);
  if(room<=0)continue;
  counts[card.id]=have+room;
  total+=room;
  if(capped)caps[trigger]+=room;
 }
 return counts;
}
function take(s,player,cardId){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[player][zone];
  const index=pile.findIndex(c=>c.cardId===cardId);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+cardId);
}
function reach(counts,seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error('Unexpected pending '+s.pending.kind);
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 assert.equal(s.phase,'main');
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
 return s;
}
function seat(s,player,cardId,line,slot){
 const card=take(s,player,cardId);
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.entryTurn=s.turn;
 s.players[player][line][slot]=card;
 return card;
}
function act(s,pred){
 const found=legalUniversalActions(packs,s).find(pred);
 assert.ok(found,JSON.stringify(s.pending||s.phase));
 return dispatchUniversalAction(packs,s,found);
}

test('Macross catalog keeps official counts and does not claim battle support',()=>{
 const catalog=mcrCatalog();
 assert.equal(catalog.deck.length,113);
 assert.equal(catalog.booster.length,100);
 assert.equal(catalog.starterOnly.length,13);
 assert.equal(catalog.ap.length,6);
 assert.equal(catalog.reprints.length,9);
 const sheryl=catalog.byId.get(id('001'));
 assert.equal(sheryl.energy,0);
 assert.equal(sheryl.gen,1);
 assert.equal(sheryl.genMark,'+');
 assert.equal(sheryl.effectJa.includes('発生エナジー+【黄】'),true);
 const skull=catalog.byId.get(id('055'));
 assert.deepEqual(skull.traits,['S.M.S／スカル小隊']);
 assert.equal(skull.sets.includes('UA36ST'),true);
 for(const card of catalog.cards){
  assert.equal(card.battleReady,false);
  assert.equal(card.playable,false);
  assert.equal(card.effectImplemented,false);
  assert.equal(card.cardDataVerified,false);
  assert.equal(card.confirmedTc,false);
  assert.equal(card.auto,false);
 }
 const frames=catalog.deck.filter(card=>card.raidFrame).map(card=>Number(card.id.slice(-3)));
 assert.deepEqual(frames,MCR_RAID_FRAME_NUMBERS);
});

test('only the exact shared profiles enter the battle pack',()=>{
 assert.deepEqual([...MCR_STAGING_IDS].sort(),[...READY].sort());
 assert.deepEqual(Object.keys(officialV2Pack('mcr').cards).sort(),[...READY].sort());
 assert.equal(createMcrBattlePack(),officialV2Pack('mcr'));
 const practice=mcrPracticeDeck();
 assert.deepEqual(validateUniversalDeck(practice.pack,practice.counts),[]);
 assert.equal(editorV2Status('mcr',practice.counts).ready,true);
 const unsupported=editorV2Status('mcr',{[id('009')]:4,[id('001')]:4,[id('002')]:4,
  [id('003')]:4,[id('005')]:4,[id('006')]:4,[id('013')]:4,[id('016')]:4,
  [id('017')]:4,[id('018')]:4,[id('007')]:3,[id('110')]:3});
 assert.equal(unsupported.ready,false);
 assert.equal(pack.cards[id('009')],undefined);
 assert.equal(mcrSharedProgram(mcrCatalog().byId.get(id('093'))).ready,false);
 assert.equal(mcrSharedProgram(mcrCatalog().byId.get(id('009'))).ready,false);
 const row=mcrCatalog().byId.get(id('002'));
 assert.throws(()=>mcrSharedCard({...row,battleReady:true}),/battle readiness/);
 assert.throws(()=>mcrSharedCard(mcrCatalog().byId.get(id('001')),
  {ready:true,implementation:'dsl',effects:{},mcrSpecial:true}),/unsupported/);
 assert.throws(()=>mcrSharedCard(mcrCatalog().byId.get(id('001')),
  {ready:true,implementation:'vanilla',effects:{}}),/cannot be vanilla/);
 const generated=pack.cards[id('001')];
 assert.equal(generated.energy,0);
 assert.equal(generated.gen,1);
 assert.ok(!generated.activeExtraEnergy);
 assert.equal(pack.cards[id('006')].gen,1);
 assert.equal(pack.cards[id('006')].activeExtraEnergy,1);
 assert.deepEqual(pack.cards[id('055')].traits,['S.M.S／スカル小隊']);
 assert.deepEqual(pack.cards[id('055')].traitComponents,['S.M.S','スカル小隊']);
 assert.deepEqual(pack.cards[id('027')].traits,['歌（シェリル）']);
 assert.equal(pack.cards[id('027')].traitComponents,undefined);
});

test('generated energy plus is an ability, not an extra printed pip',()=>{
 const counts=deckOf({[id('001')]:4,[id('006')]:4});
 const s=reach(counts,11);
 const plain=seat(s,0,id('001'),'energy',0);
 const active=seat(s,0,id('006'),'energy',1);
 assert.equal(universalCardEnergy(packs,s,0,plain),1);
 assert.equal(universalCardEnergy(packs,s,0,active),2);
 active.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,active),1);
 assert.equal(pack.cards[id('006')].gen,1);
});

test('057 shows the whole top window and can take Sheryl or an S.M.S component',()=>{
 const counts=deckOf({[id('057')]:4,[id('001')]:4,[id('038')]:4,[id('055')]:4,[id('034')]:4});
 let s=reach(counts,21);
 seat(s,0,id('034'),'energy',0);
 const source=take(s,0,id('057'));
 s.players[0].hand.push(source);
 const sheryl=take(s,0,id('001'));
 const miss=take(s,0,id('038'));
 const skull=take(s,0,id('055'));
 s.players[0].deck.unshift(sheryl,miss,skull);
 s=act(s,a=>a.type==='play'&&a.uid===source.uid);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[sheryl.uid,miss.uid,skull.uid]);
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.deepEqual(choices.sort(),[null,sheryl.uid,skull.uid].sort());
 const own=universalPrivateChoices(packs,s,0);
 const hidden=universalPublicView(packs,s,1);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.deepEqual(own.inspected.map(card=>card.uid),[sheryl.uid,miss.uid,skull.uid]);
 for(const uid of [sheryl.uid,miss.uid,skull.uid])
  assert.equal(JSON.stringify(hidden).includes(JSON.stringify(uid)),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:skull.uid});
 assert.ok(s.players[0].hand.some(card=>card.uid===skull.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('038 and 061 look at the top card privately and can place it on the bottom',()=>{
 const counts=deckOf({[id('038')]:4,[id('061')]:4,[id('002')]:4});
 let s=reach(counts,31);
 const actor=seat(s,0,id('038'),'front',0);
 const secret=take(s,0,id('002'));
 s.players[0].deck.unshift(secret);
 s=act(s,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='selfRestThen');
 assert.equal(s.players[0].front.find(card=>card?.uid===actor.uid).ready,false);
 assert.equal(s.pending?.kind,'private-top-place');
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(own.options[0].card.cardId,id('002'));
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(JSON.stringify(secret.uid)),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(s.players[0].deck.at(-1).uid,secret.uid);
 assert.equal(s.pending,null);
 const played=take(s,0,id('061'));
 s.players[0].hand.push(played);
 const second=take(s,0,id('002'));
 s.players[0].deck.unshift(second);
 s=act(s,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(s.pending?.kind,'private-top-place');
 assert.equal(universalPrivateChoices(packs,s,0).options[0].card.cardId,id('002'));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(s.players[0].deck.at(-1).uid,second.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('027 cannot be played with no legal front and spends no AP',()=>{
 const counts=deckOf({[id('027')]:4,[id('017')]:4,[id('001')]:4,[id('007')]:4});
 let s=reach(counts,41);
 seat(s,0,id('017'),'energy',0);
 seat(s,0,id('017'),'energy',1);
 const wall=seat(s,1,id('007'),'front',0);
 wall.buffs.push({bp:2000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,wall),5000);
 const event=take(s,0,id('027'));
 s.players[0].hand.push(event);
 const before=structuredClone(s);
 const ap=s.players[0].apCards.filter(card=>card.ready).length;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'event',uid:event.uid}),/not currently legal/);
 assert.deepEqual(s,before);
 assert.equal(s.players[0].apCards.filter(card=>card.ready).length,ap);
 const sheryl=seat(s,0,id('001'),'front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 s.players[0].hand.push(s.players[0].front[0]);
 s.players[0].front[0]=null;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 wall.buffs.length=0;
 assert.equal(universalBp(packs,s,wall),3000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 assert.equal(sheryl.cardId,id('001'));
});

test('080 returns a beaten character to hand and a taller blocker removes nobody',()=>{
 const counts=deckOf({[id('080')]:4,[id('002')]:4,[id('017')]:4});
 let won=reach(counts,51);
 const attacker=seat(won,0,id('080'),'front',0);
 const small=seat(won,1,id('002'),'front',0);
 const deckBefore=won.players[0].deck.length;
 for(let i=0;i<6&&won.phase!=='attack';i++)won=dispatchUniversalAction(packs,won,{type:'next'});
 won=act(won,a=>a.type==='attack'&&a.uid===attacker.uid);
 won=dispatchUniversalAction(packs,won,{type:'chooseBlock',uid:small.uid},{actor:1});
 assert.equal(won.players[0].front[0]?.uid,attacker.uid);
 assert.ok(won.players[1].hand.some(card=>card.uid===small.uid));
 assert.equal(won.players[1].outside.some(card=>card.uid===small.uid),false);
 assert.equal(won.players[0].deck.length,deckBefore-1);
 let lost=reach(counts,52);
 const weak=seat(lost,0,id('080'),'front',0);
 const tall=seat(lost,1,id('017'),'front',0);
 for(let i=0;i<6&&lost.phase!=='attack';i++)lost=dispatchUniversalAction(packs,lost,{type:'next'});
 lost=act(lost,a=>a.type==='attack'&&a.uid===weak.uid);
 lost=dispatchUniversalAction(packs,lost,{type:'chooseBlock',uid:tall.uid},{actor:1});
 assert.equal(lost.players[0].front[0]?.uid,weak.uid);
 assert.equal(lost.players[1].front[0]?.uid,tall.uid);
 assert.equal(lost.players[1].hand.some(card=>card.uid===tall.uid),false);
 assert.equal(assertUniversalMatch(packs,won),true);
 assert.equal(assertUniversalMatch(packs,lost),true);
});
