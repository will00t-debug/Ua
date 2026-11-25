// Macross set 1 lands through the shared V2 pack. The catalog stays unverified.
// These probes cover the printed profiles that already exist as shared ops.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mcrCatalog} from '../dist/mcr/catalog.mjs';
import {MCR_RAID_FRAME_NUMBERS,MCR2_RAID_FRAME_NUMBERS,MCR2_BOOSTER_RARITIES} from '../dist/mcr/catalog.mjs';
import {mcrSharedProgram} from '../dist/universal-v2/mcr/programs.mjs';
import {mcrSharedCard} from '../dist/universal-v2/mcr-shared-adapter.mjs';
import {MCR_STAGING_IDS,createMcrStagingPack} from '../dist/universal-v2/mcr-staging-pack.mjs';
import {createMcrBattlePack,mcrPracticeDeck,officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView,
 universalCardEnergy,universalBp,universalImpactNull,universalImpact} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {appendCompletedMove} from '../dist/universal-v2/zone-move-events.mjs';

const READY=[
 '001','002','003','004','005','006','007','008','009','010','011','012','013','014',
 '015','016','017','018','019','020','021','022','023','024','025','026','027',
 '028','029','030','031','032','033','034','035','036','037','038','039','040','041','042',
 '043','044','045','046','047','048','049','050','051','052','053','054','055','056','057','058','059','060','061',
 '062','063','064','065','066','067','068','069','070','071','072','073','074','075','076','077','078',
 '079','080','081','082','083','084','085','086','087','088','089','090','091','092','093','094','096',
 '095','097','098','099','100','101','102','103','104','105','106','107','108','109','110','111',
 '112','113'
].map(n=>'MCR-1-'+n);
const VOL2_READY=[
 '001','005','006','010','012','013','014','015','020','021','023','024','025','026','027','028','029','030',
 '031','032','033','034','037','038','039','040','041','043','044','046','047','050','051','055','056','057',
 '058','059','060','062','063','064','065','067','070','072','076','077'
].map(n=>'MCR-2-'+n);

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
 assert.equal(catalog.deck.length,190);
 assert.equal(catalog.vol2.length,77);
 assert.equal(catalog.booster.length,100);
 assert.equal(catalog.starterOnly.length,13);
 assert.equal(catalog.ap.length,13);
 assert.equal(catalog.ap.filter(card=>card.set==='UA36ST'||card.id.startsWith('MCR-1-')).length,6);
 assert.equal(catalog.ap.filter(card=>card.id.startsWith('MCR-2-')).length,7);
 assert.equal(catalog.reprints.length,9);
 const sheryl=catalog.byId.get(id('001'));
 assert.equal(sheryl.energy,0);
 assert.equal(sheryl.gen,1);
 assert.equal(sheryl.genMark,'+');
 assert.equal(sheryl.effectJa.includes('発生エナジー+【黄】'),true);
 const skull=catalog.byId.get(id('055'));
 assert.deepEqual(skull.traits,['S.M.S／スカル小隊']);
 assert.equal(skull.sets.includes('UA36ST'),true);
 const rarity={};
 for(const card of catalog.vol2)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 assert.deepEqual(rarity,MCR2_BOOSTER_RARITIES);
 const colors={};
 for(const card of catalog.vol2)colors[card.color]=(colors[card.color]||0)+1;
 assert.deepEqual(colors,{yellow:10,blue:8,purple:43,red:16});
 const sheryl2=catalog.byId.get('MCR-2-001');
 assert.equal(sheryl2.energy,0);
 assert.equal(sheryl2.gen,1);
 assert.equal(sheryl2.genMark,'');
 assert.equal(sheryl2.effectJa,'-');
 const bird=catalog.byId.get('MCR-2-071');
 assert.equal(bird.effectJa.includes('〈サラ・ノーム〉を1枚'),true);
 assert.equal(bird.errata,'https://www.unionarena-tcg.com/en/news/034.php');
 for(const card of catalog.cards){
  assert.equal(card.battleReady,false);
  assert.equal(card.playable,false);
  assert.equal(card.effectImplemented,false);
  assert.equal(card.cardDataVerified,false);
  assert.equal(card.auto,false);
  const vol2=card.set==='EX14BT';
  assert.equal(card.confirmedTc,vol2);
  if(vol2){
   assert.equal(card.displaySource,
    'https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no='+
    encodeURIComponent(card.set+'/'+card.id));
  }
 }
 const set1=catalog.deck.filter(card=>card.set!=='EX14BT');
 const frames=set1.filter(card=>card.raidFrame).map(card=>Number(card.id.slice(-3)));
 assert.deepEqual(frames,MCR_RAID_FRAME_NUMBERS);
 const frames2=catalog.vol2.filter(card=>card.raidFrame).map(card=>Number(card.id.slice(-3)));
 assert.deepEqual(frames2,[...MCR2_RAID_FRAME_NUMBERS]);
});

test('only the exact shared profiles enter the battle pack',()=>{
 const admitted=[...READY,...VOL2_READY].sort();
 assert.deepEqual([...MCR_STAGING_IDS].sort(),admitted);
 assert.deepEqual(Object.keys(officialV2Pack('mcr').cards).sort(),admitted);
 assert.equal(createMcrBattlePack(),officialV2Pack('mcr'));
 const practice=mcrPracticeDeck();
 assert.deepEqual(validateUniversalDeck(practice.pack,practice.counts),[]);
 assert.equal(editorV2Status('mcr',practice.counts).ready,true);
 const unsupported=editorV2Status('mcr',{[id('999')]:4,[id('001')]:4,[id('002')]:4,
  [id('003')]:4,[id('005')]:4,[id('006')]:4,[id('013')]:4,[id('016')]:4,
  [id('017')]:4,[id('018')]:4,[id('007')]:3,[id('110')]:3});
 assert.equal(unsupported.ready,false);
 assert.equal(mcrSharedProgram(mcrCatalog().byId.get(id('093'))).ready,true);
 assert.equal(mcrSharedProgram(mcrCatalog().byId.get(id('008'))).ready,true);
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
 assert.deepEqual(pack.cards[id('033')].traitComponents,['歌（シェリル）','歌（ランカ）']);
 assert.deepEqual(pack.cards[id('090')].traitComponents,['新統合軍','ダイアモンドフォース']);
 assert.deepEqual(pack.cards[id('105')].traitComponents,['S.M.S','スカル小隊']);
 assert.deepEqual(pack.cards[id('054')].traits,['B形態']);
 assert.equal(pack.cards[id('054')].traitComponents,undefined);
 assert.equal(pack.cards[id('008')].mainAbility.op,'restPayReplayOnPlay');
 assert.deepEqual(pack.cards[id('065')].traitComponents,['歌（シェリル）','歌（ランカ）']);
 assert.deepEqual(pack.cards[id('093')].traits,['Fire Bomber ／B形態']);
 assert.equal(pack.cards[id('093')].traitComponents,undefined);
 assert.equal(pack.cards[id('093')].raidOnlyEntry,true);
 assert.ok(pack.cards[id('009')].raidName);
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

function play(s,cardId,line){
 const card=take(s,0,cardId);
 s.players[0].hand.push(card);
 return act(s,a=>(a.type==='play'||a.type==='event')&&a.uid===card.uid&&(!line||a.line===line)&&
  (a.type!=='play'||s.players[0][a.line][a.slot]==null));
}
function finishOrder(s){
 while(s.pending?.kind==='effect-top-order'){
  const next=legalUniversalActions(packs,s)[0];
  s=dispatchUniversalAction(packs,s,next);
 }
 return s;
}
function outside(s,player,cardId){
 const card=take(s,player,cardId);
 s.players[player].outside.push(card);
 return card;
}

test('004 and 015 show the whole window and only send the printed cards outside',()=>{
 const counts=deckOf({[id('004')]:4,[id('015')]:4,[id('001')]:4,[id('038')]:4,[id('030')]:4});
 let s=reach(counts,61);
 seat(s,0,id('001'),'energy',0);
 seat(s,0,id('001'),'energy',1);
 seat(s,0,id('001'),'energy',2);
 const sheryl=take(s,0,id('001'));
 const other=take(s,0,id('038'));
 s.players[0].deck.unshift(sheryl,other);
 s=play(s,id('004'));
 assert.equal(s.pending?.kind,'effect-top-inspect-many');
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.deepEqual(own.inspected.map(card=>card.uid),[sheryl.uid,other.uid]);
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(JSON.stringify(other.uid)),false);
 const legal=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.deepEqual(legal.sort(),[null,sheryl.uid].sort());
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:other.uid}));
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:sheryl.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:other.uid});
 assert.equal(s.players[0].outside.some(card=>card.uid===sheryl.uid),true);
 assert.equal(s.players[0].deck[0].uid,other.uid);
 assert.equal(s.pending,null);
 const event=take(s,0,id('030'));
 const character=take(s,0,id('038'));
 s.players[0].deck.unshift(event,character);
 s=play(s,id('015'));
 assert.equal(s.pending?.kind,'effect-top-inspect-many');
 assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(card=>card.uid),[event.uid,character.uid]);
 const eventChoices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.deepEqual(eventChoices.sort(),[null,event.uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseInspectedOutside',uid:event.uid});
 assert.equal(s.pending?.kind,'effect-top-order');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid:character.uid});
 assert.equal(s.players[0].outside.some(card=>card.uid===event.uid),true);
 assert.equal(s.players[0].deck[0].uid,character.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('outside song names are distinct, colored, and own-turn only when printed',()=>{
 const counts=deckOf({[id('014')]:4,[id('020')]:4,[id('111')]:4,[id('030')]:4,[id('032')]:4,[id('033')]:4,[id('034')]:4,[id('001')]:4});
 let s=reach(counts,62);
 const singer=seat(s,0,id('014'),'front',0);
 const ranka=seat(s,0,id('111'),'front',1);
 const idol=seat(s,0,id('020'),'front',2);
 seat(s,0,id('001'),'energy',0);
 seat(s,0,id('001'),'energy',1);
 seat(s,0,id('001'),'energy',2);
 const first=outside(s,0,id('030'));
 outside(s,0,id('030'));
 outside(s,0,id('034'));
 assert.equal(universalBp(packs,s,singer),1500);
 assert.equal(universalBp(packs,s,ranka),3000);
 assert.equal(universalBp(packs,s,idol),3500);
 outside(s,0,id('032'));
 assert.equal(universalBp(packs,s,singer),1500);
 outside(s,0,id('033'));
 assert.equal(universalBp(packs,s,singer),3000);
 assert.equal(universalBp(packs,s,ranka),4000);
 assert.equal(universalBp(packs,s,idol),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,idol),3500);
 assert.equal(universalBp(packs,s,singer),3000);
 s.active=0;
 assert.equal(pack.cards[id('020')].impactNull,true);
 assert.equal(pack.cards[id('014')].impactNull,false);
 assert.equal(first.cardId,id('030'));
});

test('019 takes a yellow song or yellow field and its color trigger rests',()=>{
 const counts=deckOf({[id('019')]:4,[id('001')]:4,[id('024')]:4,[id('027')]:4,[id('030')]:4,[id('034')]:4});
 let s=reach(counts,63);
 seat(s,0,id('001'),'energy',0);
 const field=take(s,0,id('024'));
 const sherylEvent=take(s,0,id('027'));
 const song=take(s,0,id('030'));
 const blue=take(s,0,id('034'));
 s.players[0].deck.unshift(field,sherylEvent,song,blue);
 s=play(s,id('019'));
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.deepEqual(choices.sort(),[null,field.uid,song.uid].sort());
 assert.equal(choices.includes(sherylEvent.uid),false);
 assert.equal(choices.includes(blue.uid),false);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:field.uid});
 s=finishOrder(s);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,hand+1);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(pack.cards[id('019')].triggerEffect.op,'restOppFrontSkipNextActive');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('name includes opens only the printed follow-up',()=>{
 const counts=deckOf({[id('035')]:4,[id('036')]:4,[id('040')]:4,[id('034')]:4,[id('007')]:4,[id('101')]:4,[id('102')]:4,[id('105')]:4});
 let look=reach(counts,64);
 seat(look,0,id('034'),'energy',0);
 look=play(look,id('035'));
 assert.equal(look.pending,null);
 seat(look,0,id('040'),'front',3);
 const top=take(look,0,id('034'));
 const bottom=take(look,0,id('007'));
 look.players[0].deck.unshift(top,bottom);
 look=play(look,id('035'));
 assert.equal(look.pending?.kind,'effect-top-order');
 assert.equal(look.pending.split,true);
 look=dispatchUniversalAction(packs,look,{type:'chooseTopOrder',uid:top.uid,place:'top'});
 look=dispatchUniversalAction(packs,look,{type:'chooseTopOrder',uid:bottom.uid,place:'bottom'});
 assert.equal(look.players[0].deck[0].uid,top.uid);
 assert.equal(look.players[0].deck.at(-1).uid,bottom.uid);
 let energy=reach(counts,65);
 const battery=seat(energy,0,id('036'),'energy',0);
 assert.equal(universalCardEnergy(packs,energy,0,battery),1);
 const isamu=seat(energy,0,id('040'),'front',0);
 assert.equal(universalCardEnergy(packs,energy,0,battery),2);
 const parked=seat(energy,0,id('036'),'front',1);
 assert.equal(universalCardEnergy(packs,energy,0,parked),0);
 energy.players[0].front[0]=null;
 energy.players[0].hand.push(isamu);
 assert.equal(universalCardEnergy(packs,energy,0,battery),1);
 assert.equal(pack.cards[id('036')].gen,1);
 let down=reach(counts,66);
 seat(down,0,id('101'),'energy',0);
 const wall=seat(down,1,id('007'),'front',0);
 down=play(down,id('040'));
 assert.equal(down.pending,null);
 seat(down,0,id('034'),'front',3);
 down=play(down,id('040'));
 assert.equal(down.pending?.kind,'effect-target');
 assert.equal(down.pending.optional,true);
 assert.equal(down.pending.bp,1000);
 assert.ok(down.pending.choices.includes(wall.uid));
 down=dispatchUniversalAction(packs,down,{type:'chooseTarget',uid:null});
 let empty=reach(counts,67);
 const cheap=take(empty,0,id('101'));
 empty.players[0].hand.push(cheap);
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.type==='play'&&a.uid===cheap.uid),true);
 seat(empty,0,id('034'),'front',0);
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.type==='play'&&a.uid===cheap.uid),false);
 seat(empty,0,id('034'),'energy',0);
 seat(empty,0,id('034'),'energy',1);
 seat(empty,0,id('105'),'front',1);
 const first=take(empty,0,id('034'));
 const second=take(empty,0,id('007'));
 empty.players[0].deck.unshift(first,second);
 empty=act(empty,a=>a.type==='play'&&a.uid===cheap.uid);
 assert.equal(empty.pending?.kind,'effect-top-order');
 empty=dispatchUniversalAction(packs,empty,{type:'chooseTopOrder',uid:first.uid,place:'top'});
 empty=dispatchUniversalAction(packs,empty,{type:'chooseTopOrder',uid:second.uid,place:'bottom'});
 const drop=take(empty,0,id('102'));
 empty.players[0].hand.push(drop);
 const victim=seat(empty,1,id('007'),'front',0);
 empty=act(empty,a=>a.type==='play'&&a.uid===drop.uid);
 assert.equal(empty.pending?.kind,'effect-target');
 assert.equal(empty.pending.bp,2000);
 assert.ok(empty.pending.choices.includes(victim.uid));
 empty=dispatchUniversalAction(packs,empty,{type:'chooseTarget',uid:null});
 assert.equal(assertUniversalMatch(packs,look),true);
 assert.equal(assertUniversalMatch(packs,energy),true);
 assert.equal(assertUniversalMatch(packs,down),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

function labelOk(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action);
 const text=uiActionLabel(action,{pack:packs,state:s});
 assert.equal(text.includes('此起動沒有可顯示的效果說明'),false);
 assert.equal(text.includes('請參考卡面'),false);
 return action;
}

test('hand size, opponent draws, and the includes retirement cap',()=>{
 let hand=reach(deckOf({[id('083')]:2,[id('112')]:2,[id('001')]:4,[id('002')]:4}),71);
 const singer=seat(hand,0,id('083'),'front',0);
 hand.players[0].deck.push(...hand.players[0].hand.splice(4));
 const drawFromDeck=(cardId)=>{
  const pile=hand.players[0].deck;
  const index=pile.findIndex(card=>card.cardId===cardId);
  if(index<0)throw Error('deck missing '+cardId);
  return pile.splice(index,1)[0];
 };
 while(hand.players[0].hand.length<4)hand.players[0].hand.push(drawFromDeck(id('002')));
 assert.equal(hand.players[0].hand.length,4);
 assert.equal(universalBp(packs,hand,singer),2000);
 hand.players[0].hand.push(drawFromDeck(id('001')));
 assert.equal(hand.players[0].hand.length,5);
 assert.equal(universalBp(packs,hand,singer),3500);
 const bomber=seat(hand,0,id('112'),'front',1);
 assert.equal(universalBp(packs,hand,bomber),3500);
 assert.notEqual(pack.cards[id('112')].impactNull,true);
 assert.equal(pack.cards[id('112')].passiveBonuses[0].impactNull,true);
 assert.equal(pack.cards[id('112')].battleLoseToHand,true);
 hand.players[0].deck.push(...hand.players[0].hand.splice(4));
 assert.equal(universalBp(packs,hand,bomber),3000);
 let drew=reach(deckOf({[id('001')]:2,[id('083')]:4,[id('005')]:2,[id('086')]:2}),72);
 seat(drew,0,id('001'),'energy',0);
 seat(drew,0,id('083'),'energy',1);
 seat(drew,0,id('083'),'energy',2);
 seat(drew,0,id('083'),'energy',3);
 drew=play(drew,id('005'));
 assert.equal(drew.pending?.kind,'effect-discard');
 drew=dispatchUniversalAction(packs,drew,{type:'chooseDiscard',uid:drew.players[0].hand[0].uid});
 assert.ok(drew.drawnThisTurn[0]>=1);
 assert.equal(drew.drawnThisTurn[1],0);
 drew=play(drew,id('086'));
 assert.notEqual(drew.pending?.kind,'effect-may-draw');
 drew.drawnThisTurn[1]=1;
 const before=drew.players[0].hand.length;
 drew=play(drew,id('086'));
 assert.equal(drew.pending?.kind,'effect-may-draw');
 drew=dispatchUniversalAction(packs,drew,{type:'chooseMayDraw',mode:'skip'});
 assert.equal(drew.players[0].hand.length,before);
 let peek=reach(deckOf({[id('083')]:4,[id('087')]:2,[id('001')]:4,[id('002')]:2}),73);
 seat(peek,0,id('083'),'energy',0);
 seat(peek,0,id('083'),'energy',1);
 seat(peek,0,id('083'),'energy',2);
 const watcher=seat(peek,0,id('087'),'front',0);
 watcher.ready=true;
 peek.players[0].deck.push(...peek.players[0].hand.splice(4));
 while(peek.players[0].hand.length<4)peek.players[0].hand.push(take(peek,0,id('001')));
 assert.equal(legalUniversalActions(packs,peek).some(a=>a.type==='activate'&&a.uid===watcher.uid),false);
 peek.players[0].hand.push(take(peek,0,id('001')));
 const secret=take(peek,0,id('002'));
 peek.players[0].deck.unshift(secret);
 const activation=labelOk(peek,a=>a.type==='activate'&&a.uid===watcher.uid);
 peek=dispatchUniversalAction(packs,peek,activation);
 assert.equal(peek.pending?.kind,'private-top-place');
 assert.equal(universalPrivateChoices(packs,peek,1),null);
 assert.equal(universalPrivateChoices(packs,peek,0).options[0].card.cardId,id('002'));
 peek=dispatchUniversalAction(packs,peek,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(peek.players[0].deck.at(-1).uid,secret.uid);
 let retire=reach(deckOf({[id('098')]:2,[id('007')]:2,[id('073')]:2,[id('083')]:2,[id('077')]:1,[id('001')]:4}),74);
 const tall=seat(retire,1,id('007'),'front',0);
 tall.buffs.push({bp:1000,untilTurn:retire.turn});
 seat(retire,0,id('073'),'energy',0);
 seat(retire,0,id('073'),'energy',1);
 seat(retire,0,id('083'),'energy',2);
 seat(retire,0,id('083'),'energy',3);
 const event=take(retire,0,id('098'));
 retire.players[0].hand.push(event);
 const ap=retire.players[0].apCards.filter(card=>card.ready).length;
 assert.equal(legalUniversalActions(packs,retire).some(a=>a.type==='event'&&a.uid===event.uid),false);
 seat(retire,0,id('077'),'front',0);
 assert.equal(legalUniversalActions(packs,retire).some(a=>a.type==='event'&&a.uid===event.uid),true);
 retire=dispatchUniversalAction(packs,retire,{type:'event',uid:event.uid});
 if(retire.pending?.kind==='effect-retire-bp')
  retire=dispatchUniversalAction(packs,retire,{type:'chooseRetireBp',uid:tall.uid});
 assert.equal(retire.players[1].front[0],null);
 assert.equal(retire.players[1].outside.some(card=>card.uid===tall.uid),true);
 assert.ok(retire.players[0].apCards.filter(card=>card.ready).length<ap);
 assert.equal(assertUniversalMatch(packs,hand),true);
 assert.equal(assertUniversalMatch(packs,drew),true);
 assert.equal(assertUniversalMatch(packs,peek),true);
 assert.equal(assertUniversalMatch(packs,retire),true);
});

test('new mains buff the printed characters and stay once per turn',()=>{
 let field=reach(deckOf({[id('024')]:2,[id('001')]:4,[id('007')]:2}),81);
 seat(field,0,id('001'),'energy',0);
 seat(field,0,id('001'),'energy',1);
 const ally=seat(field,0,id('007'),'front',0);
 field=play(field,id('024'));
 assert.equal(field.pending?.kind,'effect-discard-cost');
 const declined=field.players[0].deck.length;
 field=dispatchUniversalAction(packs,field,{type:'chooseDiscardCost',uid:null});
 assert.equal(field.players[0].deck.length,declined);
 field=play(field,id('024'));
 const handCard=field.players[0].hand[0];
 const beforeDraw=field.players[0].deck.length;
 field=dispatchUniversalAction(packs,field,{type:'chooseDiscardCost',uid:handCard.uid});
 assert.equal(field.players[0].deck.length,beforeDraw-2);
 assert.equal(field.players[0].outside.some(card=>card.uid===handCard.uid),true);
 const ground=field.players[0].energy.find(card=>card?.cardId===id('024'));
 ground.ready=true;
 const beforeBp=universalBp(packs,field,ally);
 const main=labelOk(field,a=>a.type==='activate'&&a.uid===ground.uid&&a.mode==='restRetireThen');
 field=dispatchUniversalAction(packs,field,main);
 assert.equal(field.players[0].energy.some(card=>card?.uid===ground.uid),false);
 if(field.pending?.kind==='effect-buff-own')
  field=dispatchUniversalAction(packs,field,{type:'chooseOwnBuff',uid:ally.uid});
 const buffed=field.players[0].front.find(card=>card?.uid===ally.uid);
 assert.equal(universalBp(packs,field,buffed),beforeBp+500);
 let squad=reach(deckOf({[id('067')]:2,[id('083')]:4}),82);
 const energyMate=seat(squad,0,id('083'),'energy',0);
 const leader=seat(squad,0,id('067'),'front',0);
 const mate=seat(squad,0,id('083'),'front',1);
 leader.ready=true;
 assert.equal(pack.cards[id('067')].step,true);
 const mateBefore=universalBp(packs,squad,mate);
 const energyBefore=universalBp(packs,squad,energyMate);
 const once=labelOk(squad,a=>a.type==='activate'&&a.uid===leader.uid&&a.mode==='frontOnce');
 squad=dispatchUniversalAction(packs,squad,once);
 const liveLeader=squad.players[0].front.find(card=>card?.uid===leader.uid);
 const liveMate=squad.players[0].front.find(card=>card?.uid===mate.uid);
 assert.equal(universalBp(packs,squad,liveLeader),3000);
 assert.equal(universalBp(packs,squad,liveMate),mateBefore+1000);
 assert.equal(universalBp(packs,squad,squad.players[0].energy.find(card=>card?.uid===energyMate.uid)),energyBefore+1000);
 leader.ready=true;
 assert.equal(legalUniversalActions(packs,squad).some(a=>a.type==='activate'&&a.uid===leader.uid),false);
 let choice=reach(deckOf({[id('069')]:2,[id('083')]:4}),83);
 for(let i=0;i<3;i++)seat(choice,0,id('083'),'energy',i);
 const pilot=seat(choice,0,id('069'),'front',0);
 pilot.ready=true;
 const strong=choice.players[0].energy[0];
 strong.buffs.push({bp:2000,untilTurn:choice.turn});
 const weak=choice.players[0].energy[1];
 labelOk(choice,a=>a.type==='activate'&&a.uid===pilot.uid&&a.mode==='restSelfChoose');
 choice=act(choice,a=>a.type==='activate'&&a.uid===pilot.uid);
 assert.equal(choice.pending?.kind,'effect-choice-mode');
 choice=dispatchUniversalAction(packs,choice,{type:'chooseEffectMode',mode:'high'});
 assert.equal(choice.pending?.kind,'effect-buff-own');
 assert.equal(choice.pending.choices.includes(strong.uid),true);
 assert.equal(choice.pending.choices.includes(weak.uid),false);
 assert.equal(choice.pending.choices.includes(pilot.uid),false);
 choice=dispatchUniversalAction(packs,choice,{type:'chooseOwnBuff',uid:null});
 pilot.ready=true;
 assert.equal(legalUniversalActions(packs,choice).some(a=>a.type==='activate'&&a.uid===pilot.uid),false);
 let pay=reach(deckOf({[id('069')]:2,[id('083')]:4}),84);
 for(let i=0;i<3;i++)seat(pay,0,id('083'),'energy',i);
 const second=seat(pay,0,id('069'),'front',0);
 const other=seat(pay,0,id('083'),'front',1);
 second.ready=true;
 pay=act(pay,a=>a.type==='activate'&&a.uid===second.uid);
 pay=dispatchUniversalAction(packs,pay,{type:'chooseEffectMode',mode:'discard'});
 assert.equal(pay.pending?.kind,'effect-discard-gate');
 const kept=universalBp(packs,pay,other);
 pay=dispatchUniversalAction(packs,pay,{type:'chooseDiscardGate',uid:null});
 assert.equal(universalBp(packs,pay,other),kept);
 assert.equal(assertUniversalMatch(packs,field),true);
 assert.equal(assertUniversalMatch(packs,squad),true);
 assert.equal(assertUniversalMatch(packs,choice),true);
 assert.equal(assertUniversalMatch(packs,pay),true);
});

test('events and active entries follow the printed gates',()=>{
 let active=reach(deckOf({[id('021')]:2,[id('001')]:4,[id('030')]:1,[id('032')]:1,[id('033')]:1,[id('007')]:4}),91);
 for(let i=0;i<3;i++)seat(active,0,id('001'),'energy',i);
 outside(active,0,id('030'));
 outside(active,0,id('032'));
 outside(active,0,id('033'));
 const small=seat(active,1,id('007'),'front',0);
 const tall=seat(active,1,id('007'),'front',1);
 tall.buffs.push({bp:1000,untilTurn:active.turn});
 active=play(active,id('021'));
 const entered=[...active.players[0].front,...active.players[0].energy].find(card=>card?.cardId===id('021'));
 assert.equal(entered.ready,true);
 assert.equal(active.pending?.kind,'effect-choice-mode');
 active=dispatchUniversalAction(packs,active,{type:'chooseEffectMode',mode:'bounce'});
 assert.equal(active.pending?.kind,'effect-bounce-bp');
 assert.equal(active.pending.limit,3000);
 assert.equal(active.pending.choices.includes(small.uid),true);
 assert.equal(active.pending.choices.includes(tall.uid),false);
 active=dispatchUniversalAction(packs,active,{type:'chooseBounceBp',uid:null});
 let raid=reach(deckOf({[id('028')]:2,[id('001')]:4}),92);
 outside(raid,0,id('001'));
 const blocked=take(raid,0,id('028'));
 raid.players[0].hand.push(blocked);
 const ap=raid.players[0].apCards.filter(card=>card.ready).length;
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.type==='event'&&a.uid===blocked.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,raid,{type:'event',uid:blocked.uid}),/not currently legal/);
 assert.equal(raid.players[0].apCards.filter(card=>card.ready).length,ap);
 let gate=reach(deckOf({[id('030')]:2,[id('013')]:2,[id('001')]:4,[id('028')]:1,[id('002')]:2,[id('014')]:2,[id('017')]:2}),93);
 seat(gate,0,id('001'),'energy',0);
 seat(gate,0,id('001'),'energy',1);
 seat(gate,0,id('001'),'energy',2);
 const rankaEnergy=seat(gate,0,id('013'),'energy',3);
 const song=take(gate,0,id('030'));
 gate.players[0].hand.push(song);
 assert.equal(legalUniversalActions(packs,gate).some(a=>a.type==='event'&&a.uid===song.uid),false);
 gate.players[0].energy[3]=null;
 gate.players[0].front[0]=rankaEnergy;
 assert.equal(legalUniversalActions(packs,gate).some(a=>a.type==='event'&&a.uid===song.uid),true);
 const character=take(gate,0,id('001'));
 const eventCard=take(gate,0,id('028'));
 gate.players[0].deck.unshift(character,eventCard,take(gate,0,id('002')),take(gate,0,id('014')),take(gate,0,id('017')));
 const handBefore=gate.players[0].hand.length;
 gate=dispatchUniversalAction(packs,gate,{type:'event',uid:song.uid});
 gate=dispatchUniversalAction(packs,gate,{type:'chooseEffectMode',mode:'look'});
 assert.notEqual(gate.pending?.kind,'effect-discard');
 const lookChoices=legalUniversalActions(packs,gate).map(a=>a.uid);
 assert.equal(lookChoices.includes(character.uid),true);
 assert.equal(lookChoices.includes(eventCard.uid),false);
 gate=dispatchUniversalAction(packs,gate,{type:'chooseTopFilteredMany',uid:character.uid});
 gate=dispatchUniversalAction(packs,gate,{type:'chooseTopFilteredMany',uid:null});
 assert.equal(gate.players[0].hand.some(card=>card.uid===character.uid),true);
 assert.ok(gate.players[0].hand.length<=handBefore+1);
 let deploy=reach(deckOf({[id('033')]:2,[id('014')]:2,[id('017')]:2,[id('001')]:4}),94);
 seat(deploy,0,id('001'),'energy',0);
 seat(deploy,0,id('001'),'energy',1);
 const low=outside(deploy,0,id('014'));
 const high=outside(deploy,0,id('017'));
 deploy=play(deploy,id('033'));
 assert.equal(deploy.pending?.kind,'effect-discard');
 deploy=dispatchUniversalAction(packs,deploy,{type:'chooseDiscard',uid:deploy.players[0].hand[0].uid});
 assert.equal(deploy.pending?.kind,'effect-outside-color-rest');
 const deployChoices=legalUniversalActions(packs,deploy).map(a=>a.uid);
 assert.equal(deployChoices.includes(low.uid),true);
 assert.equal(deployChoices.includes(high.uid),false);
 deploy=dispatchUniversalAction(packs,deploy,legalUniversalActions(packs,deploy).find(a=>a.uid===low.uid));
 const rested=deploy.players[0].front.find(card=>card?.uid===low.uid)||
  deploy.players[0].energy.find(card=>card?.uid===low.uid);
 assert.equal(rested.ready,false);
 let ranka=reach(deckOf({[id('054')]:3,[id('036')]:2,[id('034')]:4,[id('040')]:2,[id('013')]:2,[id('007')]:2}),95);
 seat(ranka,0,id('036'),'energy',0);
 seat(ranka,0,id('034'),'energy',1);
 seat(ranka,0,id('034'),'energy',2);
 seat(ranka,0,id('034'),'energy',3);
 seat(ranka,0,id('040'),'front',0);
 ranka=play(ranka,id('054'),'front');
 const lucifer=ranka.players[0].front.find(card=>card?.cardId===id('054'));
 assert.equal(lucifer.ready,true);
 assert.equal(ranka.pending,null);
 seat(ranka,0,id('013'),'front',2);
 const foe=seat(ranka,1,id('007'),'front',0);
 for(const card of ranka.players[0].apCards)card.ready=true;
 ranka=play(ranka,id('054'),'front');
 assert.equal(ranka.pending?.kind,'effect-discard-gate');
 const declined=dispatchUniversalAction(packs,structuredClone(ranka),{type:'chooseDiscardGate',uid:null});
 assert.notEqual(declined.pending?.kind,'effect-bounce-bp');
 const paid=ranka.players[0].hand[0];
 ranka=dispatchUniversalAction(packs,ranka,{type:'chooseDiscardGate',uid:paid.uid});
 assert.equal(ranka.pending?.kind,'effect-bounce-bp');
 assert.equal(ranka.pending.choices.includes(foe.uid),true);
 ranka=dispatchUniversalAction(packs,ranka,{type:'chooseBounceBp',uid:null});
 let alto=reach(deckOf({[id('105')]:2,[id('034')]:4,[id('001')]:2,[id('013')]:2}),96);
 seat(alto,0,id('034'),'energy',0);
 seat(alto,0,id('034'),'energy',1);
 alto=play(alto,id('105'));
 assert.equal(alto.pending,null);
 assert.notEqual(pack.cards[id('105')].impactNull,true);
 seat(alto,0,id('001'),'front',3);
 seat(alto,0,id('013'),'front',2);
 alto=play(alto,id('105'));
 assert.equal(alto.pending?.kind,'effect-discard');
 alto=dispatchUniversalAction(packs,alto,{type:'chooseDiscard',uid:alto.players[0].hand[0].uid});
 let battle=reach(deckOf({[id('112')]:2,[id('002')]:4,[id('001')]:4}),97);
 const attacker=seat(battle,0,id('112'),'front',0);
 const loser=seat(battle,1,id('002'),'front',0);
 const deck=battle.players[0].deck.length;
 for(let i=0;i<6&&battle.phase!=='attack';i++)battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=act(battle,a=>a.type==='attack'&&a.uid===attacker.uid);
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:loser.uid},{actor:1});
 assert.equal(battle.players[1].hand.some(card=>card.uid===loser.uid),true);
 assert.equal(battle.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(packs,active),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
 assert.equal(assertUniversalMatch(packs,gate),true);
 assert.equal(assertUniversalMatch(packs,deploy),true);
 assert.equal(assertUniversalMatch(packs,ranka),true);
 assert.equal(assertUniversalMatch(packs,alto),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('032 recovers AP from three song names, 096 arranges and peeks twice, and 090 waits for the opponent turn',()=>{
 let song=reach(deckOf({[id('032')]:2,[id('001')]:4,[id('014')]:1,[id('030')]:1,[id('033')]:1}),98);
 seat(song,0,id('001'),'energy',0);
 seat(song,0,id('001'),'energy',1);
 const ally=seat(song,0,id('001'),'front',0);
 const before=universalBp(packs,song,ally);
 song=play(song,id('032'));
 assert.equal(song.pending?.kind,'effect-buff-own');
 const deck=song.players[0].deck.length;
 song=dispatchUniversalAction(packs,song,{type:'chooseOwnBuff',uid:null});
 assert.equal(song.pending,null);
 assert.equal(song.players[0].deck.length,deck-1);
 assert.equal(universalBp(packs,song,song.players[0].front.find(card=>card?.uid===ally.uid)),before);
 outside(song,0,id('014'));
 outside(song,0,id('030'));
 outside(song,0,id('033'));
 const rested=song.players[0].apCards.find(card=>card.ready);
 rested.ready=false;
 song=play(song,id('032'));
 song=dispatchUniversalAction(packs,song,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,song,song.players[0].front.find(card=>card?.uid===ally.uid)),before+1000);
 assert.equal(song.pending?.kind,'effect-recover-ap');
 song=dispatchUniversalAction(packs,song,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(song.players[0].apCards.find(card=>card.uid===rested.uid).ready,true);

 let ship=reach(deckOf({[id('096')]:2,[id('083')]:4,[id('002')]:2}),99);
 seat(ship,0,id('083'),'energy',0);
 seat(ship,0,id('083'),'energy',1);
 const top=take(ship,0,id('002'));
 const bottom=take(ship,0,id('083'));
 ship.players[0].deck.unshift(top,bottom);
 ship=play(ship,id('096'),'energy');
 assert.equal(ship.pending?.kind,'effect-top-order');
 assert.equal(ship.pending.split,true);
 ship=dispatchUniversalAction(packs,ship,{type:'chooseTopOrder',uid:bottom.uid,place:'top'});
 ship=dispatchUniversalAction(packs,ship,{type:'chooseTopOrder',uid:top.uid,place:'bottom'});
 assert.equal(ship.players[0].deck[0].uid,bottom.uid);
 assert.equal(ship.players[0].deck.at(-1).uid,top.uid);
 const battle7=ship.players[0].energy.find(card=>card?.cardId===id('096'));
 battle7.ready=true;
 const secret=ship.players[0].deck[0];
 const firstPeek=labelOk(ship,a=>a.type==='activate'&&a.uid===battle7.uid);
 ship=dispatchUniversalAction(packs,ship,firstPeek);
 assert.equal(ship.pending?.kind,'private-top-place');
 assert.equal(universalPrivateChoices(packs,ship,1),null);
 ship=dispatchUniversalAction(packs,ship,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(ship.players[0].deck.at(-1).uid,secret.uid);
 const restedField=ship.players[0].energy.find(card=>card?.uid===battle7.uid);
 assert.equal(restedField.ready,false);
 restedField.ready=true;
 assert.equal(legalUniversalActions(packs,ship).some(a=>a.type==='activate'&&a.uid===restedField.uid),true);
 ship=dispatchUniversalAction(packs,ship,legalUniversalActions(packs,ship).find(a=>a.type==='activate'&&a.uid===restedField.uid));
 assert.equal(ship.pending?.kind,'private-top-place');
 ship=dispatchUniversalAction(packs,ship,{type:'chooseTopCard',mode:'top'});

 let guard=reach(deckOf({[id('090')]:2,[id('085')]:2,[id('083')]:2}),100);
 const gumlin=seat(guard,0,id('090'),'front',0);
 assert.equal(universalBp(packs,guard,gumlin),2000);
 assert.equal(universalImpactNull(packs,guard,gumlin),false);
 const mylene=seat(guard,0,id('085'),'front',1);
 assert.equal(universalBp(packs,guard,gumlin),2000);
 assert.equal(universalImpactNull(packs,guard,gumlin),false);
 const enemy=structuredClone(guard);
 enemy.active=1;
 const live=enemy.players[0].front.find(card=>card?.uid===gumlin.uid);
 assert.equal(universalBp(packs,enemy,live),3000);
 assert.equal(universalImpactNull(packs,enemy,live),true);
 guard.players[0].deck.push(guard.players[0].front[1]);
 guard.players[0].front[1]=null;
 const alone=structuredClone(guard);
 alone.active=1;
 assert.equal(universalBp(packs,alone,alone.players[0].front[0]),2000);
 assert.equal(universalImpactNull(packs,alone,alone.players[0].front[0]),false);
 assert.equal(pack.cards[id('090')].impactNull,false);
 assert.equal(pack.cards[id('090')].passiveBonuses[0].impactNull,true);
 assert.equal(assertUniversalMatch(packs,song),true);
 assert.equal(assertUniversalMatch(packs,ship),true);
 assert.equal(assertUniversalMatch(packs,guard),true);
 assert.equal(assertUniversalMatch(packs,enemy),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy].find(c=>c?.uid===uid);
}
function raidOnto(s,cardId,base){
 const card=take(s,0,cardId);
 s.players[0].hand.push(card);
 return act(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===base.uid);
}

test('009 looks at three cards only after a face-up Raid',()=>{
 const counts=deckOf({[id('009')]:2,[id('001')]:4,[id('017')]:4});
 let s=reach(counts,41);
 seat(s,0,id('017'),'energy',0);
 seat(s,0,id('017'),'energy',1);
 const before=s.players[0].deck.length;
 s=play(s,id('009'),'front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before);
 const base=seat(s,0,id('001'),'front',1);
 s=raidOnto(s,id('009'),base);
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 assert.equal(s.pending.uids.length,Math.min(3,before));
 const hidden=universalPublicView(packs,s,1);
 assert.equal(hidden.pending?.uids,undefined);
});

test('031 retires a small front character only while Ranka is on the field',()=>{
 const counts=deckOf({[id('031')]:2,[id('001')]:4,[id('002')]:4,[id('013')]:2});
 let rest=reach(counts,42);
 for(let i=0;i<4;i++)seat(rest,0,id('001'),'energy',i);
 const small=seat(rest,1,id('002'),'front',0);
 rest=play(rest,id('031'));
 assert.equal(rest.pending.kind,'effect-rest-bp');
 rest=act(rest,a=>a.uid===small.uid);
 assert.equal(rest.players[1].front[0].ready,false);
 let gone=reach(counts,43);
 for(let i=0;i<4;i++)seat(gone,0,id('001'),'energy',i);
 seat(gone,0,id('013'),'front',0);
 const victim=seat(gone,1,id('002'),'front',0);
 gone=play(gone,id('031'));
 assert.equal(gone.pending.kind,'effect-retire-bp');
 gone=act(gone,a=>a.uid===victim.uid);
 assert.equal(gone.players[1].front[0],null);
});

test('107 adds 1000 once and impact only when both singers are present',()=>{
 const counts=deckOf({[id('107')]:2,[id('105')]:2,[id('034')]:4,[id('001')]:2,[id('013')]:2});
 let plain=reach(counts,44);
 for(let i=0;i<4;i++)seat(plain,0,id('034'),'energy',i);
 seat(plain,0,id('001'),'front',1);
 seat(plain,0,id('013'),'front',2);
 const played=take(plain,0,id('107'));
 plain.players[0].hand.push(played);
 const before=plain.players[0].deck.length;
 plain=act(plain,a=>a.type==='play'&&a.uid===played.uid&&a.line==='front');
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,before);
 const ordinary=plain.players[0].front[0];
 assert.equal(universalBp(packs,plain,ordinary),4000);
 assert.equal(universalImpact(packs,plain,ordinary),0);
 let s=reach(counts,45);
 for(let i=0;i<4;i++)seat(s,0,id('034'),'energy',i);
 const base=seat(s,0,id('105'),'front',0);
 s=raidOnto(s,id('107'),base);
 assert.equal(s.pending,null);
 const raider=s.players[0].front.find(c=>c&&c.cardId===id('107'));
 assert.equal(s.players[0].deck.length<50,true);
 assert.equal(universalBp(packs,s,raider),4000);
 assert.equal(universalImpact(packs,s,raider),0);
 seat(s,0,id('001'),'front',1);
 assert.equal(universalBp(packs,s,live(s,raider.uid)),5000);
 assert.equal(universalImpact(packs,s,live(s,raider.uid)),0);
 seat(s,0,id('013'),'front',2);
 assert.equal(universalBp(packs,s,live(s,raider.uid)),5000);
 assert.equal(universalImpact(packs,s,live(s,raider.uid)),1);
});

test('082 draws for both players and readies Basara only after four draws',()=>{
 const counts=deckOf({[id('082')]:2,[id('080')]:4});
 let s=reach(counts,46);
 for(let i=0;i<4;i++)seat(s,0,id('080'),'energy',i);
 const basaraCard=take(s,0,id('082'));
 s.players[0].hand.push(basaraCard);
 const own=s.players[0].deck.length,opp=s.players[1].deck.length;
 s=act(s,a=>a.type==='play'&&a.uid===basaraCard.uid&&a.line==='front');
 assert.equal(s.players[0].deck.length,own-1);
 assert.equal(s.players[1].deck.length,opp-1);
 const basara=s.players[0].front[0];
 assert.equal(basara.ready,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===basara.uid),false);
 s.drawnThisTurn[0]=4;
 const ready=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===basara.uid);
 assert.equal(ready.mode,'nameOnceActive');
 s=dispatchUniversalAction(packs,s,ready);
 assert.equal(live(s,basara.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===basara.uid),false);
});

test('108 enters active and grants energy-line attack only after a hand payment',()=>{
 const counts=deckOf({[id('108')]:2,[id('034')]:4,[id('080')]:2});
 let declined=reach(counts,47);
 for(let i=0;i<4;i++)seat(declined,0,id('034'),'energy',i);
 declined=play(declined,id('108'),'front');
 assert.equal(declined.pending.kind,'effect-discard-gate');
 const entered=declined.players[0].front.find(c=>c&&c.cardId===id('108'));
 assert.equal(entered.ready,true);
 declined=act(declined,a=>a.type==='chooseDiscardGate'&&a.uid===null);
 assert.equal(live(declined,entered.uid).energyAttackGranted,undefined);
 assert.equal(live(declined,entered.uid).sniperGranted,undefined);
 let paid=reach(counts,48);
 for(let i=0;i<4;i++)seat(paid,0,id('034'),'energy',i);
 const cost=take(paid,0,id('080'));
 paid.players[0].hand.push(cost);
 paid=play(paid,id('108'),'front');
 paid=act(paid,a=>a.type==='chooseDiscardGate'&&a.uid===cost.uid);
 const fighter=paid.players[0].front.find(c=>c&&c.cardId===id('108'));
 assert.equal(fighter.energyAttackGranted.turn,paid.turn);
 assert.equal(fighter.sniperGranted.turn,paid.turn);
 assert.equal(fighter.energyAttackMovesFront,undefined);
});

test('068 recovers Minmay only after paying 1 AP and readies at 5000',()=>{
 const counts=deckOf({[id('068')]:2,[id('067')]:2,[id('077')]:4});
 let skipped=reach(counts,49);
 for(let i=0;i<4;i++)seat(skipped,0,id('077'),'energy',i);
 const minmay=outside(skipped,0,id('067'));
 skipped=play(skipped,id('068'),'front');
 assert.equal(skipped.pending.kind,'effect-optional-pay-ap');
 skipped=act(skipped,a=>a.type==='chooseOptionalPayAp'&&a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===minmay.uid),true);
 let paid=reach(counts,50);
 for(let i=0;i<4;i++)seat(paid,0,id('077'),'energy',i);
 const saved=outside(paid,0,id('067'));
 paid=play(paid,id('068'),'front');
 paid=act(paid,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(paid.pending.kind,'effect-recover-outside');
 paid=act(paid,a=>a.uid===saved.uid);
 assert.equal(paid.players[0].hand.some(c=>c.uid===saved.uid),true);
 const hikaru=paid.players[0].front.find(c=>c&&c.cardId===id('068'));
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===hikaru.uid&&a.mode==='nameOnceActive'),false);
 hikaru.buffs=[{bp:2000,untilTurn:paid.turn}];
 const wake=legalUniversalActions(packs,paid).find(a=>a.uid===hikaru.uid&&a.mode==='nameOnceActive');
 assert.ok(wake);
 paid=dispatchUniversalAction(packs,paid,wake);
 assert.equal(live(paid,hikaru.uid).ready,true);
});

test('060 deploys a cheap blue card only as a face-up Raid',()=>{
 const counts=deckOf({[id('060')]:2,[id('061')]:2,[id('034')]:4,[id('058')]:2});
 let plain=reach(counts,61);
 for(let i=0;i<3;i++)seat(plain,0,id('034'),'energy',i);
 const held=take(plain,0,id('058'));
 plain.players[0].hand.push(held);
 const played=take(plain,0,id('060'));
 plain.players[0].hand.push(played);
 plain=act(plain,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(plain.pending,null);
 const ordinary=plain.players[0].front.find(c=>c?.cardId===id('060'))||
  plain.players[0].energy.find(c=>c?.cardId===id('060'));
 assert.equal(universalBp(packs,plain,ordinary),3500);
 let s=reach(counts,62);
 for(let i=0;i<3;i++)seat(s,0,id('034'),'energy',i);
 const blue=take(s,0,id('058'));
 s.players[0].hand.push(blue);
 const base=seat(s,0,id('061'),'front',0);
 s=raidOnto(s,id('060'),base);
 const raider=s.players[0].front.find(c=>c?.cardId===id('060'));
 assert.equal(universalBp(packs,s,raider),4000);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.ok(s.pending.choices.includes(blue.uid));
 s=act(s,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(s.players[0].hand.some(c=>c.uid===blue.uid),true);
});

test('095 draws two only while raided beside Mylene',()=>{
 const counts=deckOf({[id('095')]:2,[id('090')]:2,[id('077')]:4,[id('084')]:2,[id('080')]:2});
 let plain=reach(counts,63);
 for(let i=0;i<2;i++)seat(plain,0,id('077'),'energy',i);
 seat(plain,0,id('084'),'front',1);
 const played=take(plain,0,id('095'));
 plain.players[0].hand.push(played);
 const before=plain.players[0].deck.length;
 plain=act(plain,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,before);
 let s=reach(counts,64);
 for(let i=0;i<2;i++)seat(s,0,id('077'),'energy',i);
 seat(s,0,id('084'),'front',1);
 const base=seat(s,0,id('090'),'front',0);
 const raider=take(s,0,id('095'));
 s.players[0].hand.push(raider);
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-2);
});

test('093 can only enter by Raid and its framed impact stays off a plain card',()=>{
 const counts=deckOf({[id('093')]:2,[id('080')]:2,[id('077')]:4});
 let s=reach(counts,71);
 for(let i=0;i<4;i++)seat(s,0,id('077'),'energy',i);
 const seated=seat(s,0,id('093'),'front',1);
 assert.equal(universalImpact(packs,s,seated),0);
 const card=take(s,0,id('093'));
 s.players[0].hand.push(card);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===card.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'play',uid:card.uid,line:'front',slot:0}));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 const base=seat(s,0,id('080'),'front',0);
 s=raidOnto(s,id('093'),base);
 const top=s.players[0].front.find(c=>c&&pack.cards[c.cardId].id===id('093'));
 assert.equal(universalImpact(packs,s,top),1);
 assert.equal(pack.cards[id('093')].passiveBonuses[0].condition.turn,'any');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('065 cannot start without Sheryl or Ranka and Sheryl raises the retire cap',()=>{
 const counts=deckOf({[id('065')]:2,[id('001')]:2,[id('041')]:4,[id('017')]:2});
 let none=reach(counts,72);
 for(let i=0;i<2;i++)seat(none,0,id('041'),'energy',i);
 const event=take(none,0,id('065'));
 none.players[0].hand.push(event);
 seat(none,1,id('017'),'front',0);
 const ap=none.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legalUniversalActions(packs,none).some(a=>a.type==='event'&&a.uid===event.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,none,{type:'event',uid:event.uid}));
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,ap);
 let sheryl=reach(counts,73);
 for(let i=0;i<2;i++)seat(sheryl,0,id('041'),'energy',i);
 seat(sheryl,0,id('001'),'front',1);
 const tall=seat(sheryl,1,id('017'),'front',0);
 const played=take(sheryl,0,id('065'));
 sheryl.players[0].hand.push(played);
 sheryl=act(sheryl,a=>a.type==='event'&&a.uid===played.uid);
 assert.equal(sheryl.pending.step,'retireMode');
 assert.deepEqual(sheryl.pending.modes,['sheryl']);
 sheryl=act(sheryl,a=>a.mode==='sheryl');
 assert.equal(sheryl.pending.kind,'effect-retire-bp');
 assert.equal(sheryl.pending.limit,5000);
 assert.ok(sheryl.pending.choices.includes(tall.uid));
});

test('framed Macross text stays quiet on an ordinary play',()=>{
 const counts=deckOf({[id('045')]:2,[id('063')]:2,[id('079')]:2,[id('062')]:2,
  [id('042')]:4,[id('040')]:2,[id('034')]:2,[id('105')]:2,[id('001')]:2,
  [id('073')]:2,[id('077')]:4,[id('055')]:2,[id('002')]:2});
 let plain=reach(counts,81);
 for(let i=0;i<3;i++)seat(plain,0,id('042'),'energy',i);
 seat(plain,0,id('034'),'energy',3);
 seat(plain,1,id('002'),'front',0);
 plain=play(plain,id('045'),'front');
 assert.equal(plain.pending,null);
 let raided=reach(counts,82);
 for(let i=0;i<3;i++)seat(raided,0,id('042'),'energy',i);
 seat(raided,0,id('034'),'energy',3);
 const base=seat(raided,0,id('040'),'front',0);
 seat(raided,1,id('002'),'front',0);
 raided=raidOnto(raided,id('045'),base);
 assert.equal(raided.pending?.step,'bounceOrRetire');
 let quiet=reach(counts,83);
 for(let i=0;i<2;i++)seat(quiet,0,id('042'),'energy',i);
 seat(quiet,0,id('001'),'front',1);
 const alto=seat(quiet,0,id('105'),'front',0);
 quiet=play(quiet,id('063'),'front');
 assert.equal(quiet.pending,null);
 quiet=raidOnto(quiet,id('063'),alto);
 assert.equal(quiet.pending?.step,'paid');
 let look=reach(counts,84);
 for(let i=0;i<2;i++)seat(look,0,id('077'),'energy',i);
 const milia=seat(look,0,id('073'),'front',0);
 look=play(look,id('079'),'front');
 assert.equal(look.pending,null);
 look=raidOnto(look,id('079'),milia);
 assert.equal(look.pending?.step,'searchTake');
 assert.equal(look.pending.uids.length,5);
 let floor=reach(counts,85);
 for(let i=0;i<3;i++)seat(floor,0,id('042'),'energy',i);
 const body=take(floor,0,id('062'));
 floor.players[0].hand.push(body);
 floor=act(floor,a=>a.type==='play'&&a.uid===body.uid&&a.line==='energy');
 assert.equal(legalUniversalActions(packs,floor).some(a=>a.type==='activate'&&a.uid===body.uid),false);
 const ozma=seat(floor,0,id('055'),'front',0);
 floor=raidOnto(floor,id('062'),ozma);
 const top=floor.players[0].front.find(c=>c&&c.cardId===id('062'));
 assert.equal(legalUniversalActions(packs,floor).some(a=>a.type==='activate'&&a.uid===top.uid),true);
});

test('099 lets the opponent choose the deck side unless Basara is on the field',()=>{
 const counts=deckOf({[id('099')]:2,[id('077')]:4,[id('080')]:2,[id('002')]:2});
 let foe=reach(counts,74);
 for(let i=0;i<2;i++)seat(foe,0,id('077'),'energy',i);
 const target=seat(foe,1,id('002'),'front',0);
 const event=take(foe,0,id('099'));
 foe.players[0].hand.push(event);
 foe=act(foe,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(foe.pending.step,'deckTarget');
 foe=act(foe,a=>a.uid===target.uid);
 assert.equal(foe.pending.step,'deckSide');
 assert.equal(foe.pending.player,1);
 let self=reach(counts,75);
 for(let i=0;i<2;i++)seat(self,0,id('077'),'energy',i);
 seat(self,0,id('080'),'front',1);
 const marked=seat(self,1,id('002'),'front',0);
 const card=take(self,0,id('099'));
 self.players[0].hand.push(card);
 self=act(self,a=>a.type==='event'&&a.uid===card.uid);
 self=act(self,a=>a.uid===marked.uid);
 assert.equal(self.pending.player,0);
 self=act(self,a=>a.place==='bottom');
 assert.equal(self.players[1].deck.at(-1).uid,marked.uid);
 assert.equal(assertUniversalMatch(packs,self),true);
});

test('Vol.2 exact prints enter and raid frames stay out',()=>{
 for(const cardId of VOL2_READY)
  assert.equal(mcrSharedProgram(mcrCatalog().byId.get(cardId)).ready,true);
 for(const cardId of ['MCR-2-004','MCR-2-008','MCR-2-016','MCR-2-036','MCR-2-045','MCR-2-052','MCR-2-053','MCR-2-054','MCR-2-069']){
  assert.equal(mcrSharedProgram(mcrCatalog().byId.get(cardId)).ready,false);
  assert.equal(pack.cards[cardId],undefined);
 }
 const purple=pack.cards['MCR-2-024'];
 assert.equal(purple.color,'purple');
 assert.equal(purple.gen,1);
 assert.equal(purple.activeExtraEnergy,1);
 assert.deepEqual(purple.traits,['ケイオス／Δ小隊']);
 assert.deepEqual(purple.traitComponents,['ケイオス','Δ小隊']);
 assert.deepEqual(mcrCatalog().byId.get('MCR-2-024').traits,['ケイオス／Δ小隊']);
 assert.equal(mcrCatalog().byId.get('MCR-2-024').traits.length,1);
 assert.equal(pack.cards['MCR-2-027'].impactNull,true);
 assert.equal(pack.cards['MCR-2-037'].impactNull,true);
});

test('005 looks at the top card privately and can place it outside',()=>{
 const counts=deckOf({'MCR-2-005':4,'MCR-2-001':4});
 let s=reach(counts,25);
 const played=take(s,0,'MCR-2-005');
 s.players[0].hand.push(played);
 const secret=take(s,0,'MCR-2-001');
 s.players[0].deck.unshift(secret);
 s=act(s,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(s.pending?.kind,'private-top-or-outside');
 assert.equal(s.pending.uid,secret.uid);
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(own.options[0].card.cardId,'MCR-2-001');
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(JSON.stringify(secret.uid)),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'outside'});
 assert.equal(s.players[0].outside.some(card=>card.uid===secret.uid),true);
 assert.equal(s.players[0].deck[0]?.uid===secret.uid,false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('063 looks at the top card privately and can place it on the bottom',()=>{
 const counts=deckOf({'MCR-2-063':4,'MCR-2-001':4});
 let s=reach(counts,26);
 const played=take(s,0,'MCR-2-063');
 s.players[0].hand.push(played);
 const secret=take(s,0,'MCR-2-001');
 s.players[0].deck.unshift(secret);
 s=act(s,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(s.pending?.kind,'private-top-place');
 assert.equal(universalPrivateChoices(packs,s,0).options[0].card.cardId,'MCR-2-001');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'bottom'});
 assert.equal(s.players[0].deck.at(-1).uid,secret.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('024 generates one extra purple pip only while active',()=>{
 const counts=deckOf({'MCR-2-024':4,'MCR-2-027':4,'MCR-2-001':4});
 let s=reach(counts,27);
 const battery=seat(s,0,'MCR-2-024','energy',0);
 assert.equal(universalCardEnergy(packs,s,0,battery),2);
 battery.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,battery),1);
 const wall=seat(s,0,'MCR-2-027','front',0);
 assert.equal(universalImpactNull(packs,s,wall),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('077 rests and must buff another character',()=>{
 const counts=deckOf({'MCR-2-077':4,'MCR-2-001':4});
 let s=reach(counts,28);
 const actor=seat(s,0,'MCR-2-077','front',0);
 const ally=seat(s,0,'MCR-2-001','front',1);
 s=act(s,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='selfRestThen');
 assert.equal(s.players[0].front.find(card=>card?.uid===actor.uid).ready,false);
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.deepEqual(s.pending.choices,[ally.uid]);
 assert.equal(s.pending.optional,false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].front[1]),
  pack.cards['MCR-2-001'].bp+1000);
 assert.equal(s.pending,null);
 const alone=reach(counts,29);
 const solo=seat(alone,0,'MCR-2-077','front',0);
 assert.equal(legalUniversalActions(packs,alone).some(a=>a.type==='activate'&&a.uid===solo.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,alone,
  {type:'activate',uid:solo.uid,mode:'selfRestThen'}));
 assert.equal(alone.players[0].front[0].ready,true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

function vol2(n){return 'MCR-2-'+n;}
function named(name){
 return Object.values(pack.cards).find(card=>card.name===name);
}

test('Vol.2 slash traits stay one catalog token and only pinned pieces match',()=>{
 const catalog=mcrCatalog().byId;
 for(const id of ['MCR-2-030','MCR-2-050','MCR-2-021','MCR-2-076']){
  assert.equal(catalog.get(id).traits.length,1);
  assert.equal(catalog.get(id).traits[0].includes('／')||id==='MCR-2-076',true);
 }
 assert.deepEqual(pack.cards['MCR-2-030'].traitComponents,['ケイオス','ワルキューレ']);
 assert.deepEqual(pack.cards['MCR-2-050'].traitComponents,['ウィンダミア王国','空中騎士団','G形態']);
 assert.deepEqual(pack.cards['MCR-2-021'].traitComponents,['ケイオス','Δ小隊']);
 assert.equal(pack.cards['MCR-2-076'].traitComponents,undefined);
 assert.ok(!pack.cards['MCR-2-040'].activeExtraEnergy);
 assert.equal(pack.cards['MCR-2-040'].gen,1);
});

test('030 shows every inspected card and only a Walkure can be taken',()=>{
 const counts=deckOf({[vol2('030')]:4,[vol2('001')]:4,[vol2('034')]:4});
 let s=reach(counts,31);
 seat(s,0,vol2('034'),'energy',0);
 const played=take(s,0,vol2('030'));
 s.players[0].hand.push(played);
 const extra=take(s,0,vol2('001'));
 const plain=take(s,0,vol2('001'));
 const walkure=take(s,0,vol2('034'));
 s.players[0].deck.unshift(walkure,plain,extra);
 s=act(s,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual([...s.pending.uids].sort(),[extra.uid,plain.uid,walkure.uid].sort());
 assert.deepEqual(s.pending.choices,[walkure.uid]);
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(own.inspected.length,3);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(plain.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:plain.uid}));
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:walkure.uid});
 assert.equal(s.players[0].hand.some(card=>card.uid===walkure.uid),true);
 assert.equal(s.players[0].hand.length,hand+1);
 s=finishOrder(s);
 assert.equal(s.pending.kind,'effect-discard');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:s.players[0].hand.find(card=>card.uid!==walkure.uid).uid});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('034 counts distinct Walkure names only on your turn and 044 does not',()=>{
 const counts=deckOf({[vol2('034')]:4,[vol2('030')]:4,[vol2('039')]:4,[vol2('044')]:4});
 let s=reach(counts,32);
 const self=seat(s,0,vol2('034'),'front',0);
 seat(s,0,vol2('030'),'front',1);
 seat(s,0,vol2('039'),'energy',0);
 assert.equal(universalBp(packs,s,self),pack.cards[vol2('034')].bp+1000);
 s.active=1;
 assert.equal(universalBp(packs,s,self),pack.cards[vol2('034')].bp);
 const any=seat(s,0,vol2('044'),'front',2);
 assert.equal(universalBp(packs,s,any),pack.cards[vol2('044')].bp+1000);
 s.active=0;
 const copies=reach(counts,33);
 const one=seat(copies,0,vol2('034'),'front',0);
 seat(copies,0,vol2('034'),'front',1);
 seat(copies,0,vol2('034'),'energy',0);
 assert.equal(universalBp(packs,copies,one),pack.cards[vol2('034')].bp);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('040 adds one purple pip only while two Walkure are on the front',()=>{
 const counts=deckOf({[vol2('040')]:4,[vol2('030')]:4,[vol2('034')]:4,[vol2('001')]:4});
 let s=reach(counts,34);
 const battery=seat(s,0,vol2('040'),'energy',0);
 assert.equal(universalCardEnergy(packs,s,0,battery),1);
 battery.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,battery),1);
 battery.ready=true;
 seat(s,0,vol2('030'),'front',0);
 assert.equal(universalCardEnergy(packs,s,0,battery),1);
 seat(s,0,vol2('034'),'front',1);
 assert.equal(universalCardEnergy(packs,s,0,battery),2);
 const played=take(s,0,vol2('040'));
 s.players[0].hand.push(played);
 s.players[0].deck.unshift(take(s,0,vol2('001')),take(s,0,vol2('001')));
 s=act(s,a=>a.type==='play'&&a.uid===played.uid);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('025 does not draw for a Delta character that is not a face-up Raid',()=>{
 const counts=deckOf({[vol2('025')]:4,[vol2('021')]:4,[vol2('024')]:4});
 let s=reach(counts,35);
 seat(s,0,vol2('024'),'energy',0);
 seat(s,0,vol2('021'),'front',0);
 const before=s.players[0].hand.length;
 s=play(s,vol2('025'),'front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('050 recovers only a character without the Raid keyword',()=>{
 const counts=deckOf({[vol2('050')]:4,[vol2('024')]:4,[vol2('001')]:4,[id('009')]:2});
 let s=reach(counts,36);
 for(let i=0;i<2;i++)seat(s,0,vol2('024'),'energy',i);
 const raid=outside(s,0,id('009'));
 const plain=outside(s,0,vol2('001'));
 const hand=take(s,0,vol2('001'));
 s.players[0].hand.push(hand);
 s=play(s,vol2('050'),'front');
 assert.equal(s.pending.kind,'effect-discard-gate');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(card=>card.uid===plain.uid),true);
 let paid=reach(counts,37);
 for(let i=0;i<2;i++)seat(paid,0,vol2('024'),'energy',i);
 const raid2=outside(paid,0,id('009'));
 const plain2=outside(paid,0,vol2('001'));
 const pay=take(paid,0,vol2('001'));
 paid.players[0].hand.push(pay);
 paid=play(paid,vol2('050'),'front');
 paid=dispatchUniversalAction(packs,paid,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(paid.pending.choices.includes(plain2.uid),true);
 assert.equal(paid.pending.choices.includes(raid2.uid),false);
 paid=dispatchUniversalAction(packs,paid,{type:'chooseOutsideRecovery',uid:plain2.uid});
 assert.equal(paid.players[0].hand.some(card=>card.uid===plain2.uid),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
});

test('067 cannot buff at printed BP and spends nothing if forced',()=>{
 const counts=deckOf({[vol2('067')]:4,[vol2('001')]:4});
 let blocked=reach(counts,38);
 const actor=seat(blocked,0,vol2('067'),'front',0);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,blocked,{type:'activate',uid:actor.uid,mode:'onceBuffSelf'}));
 assert.equal(blocked.mainAbilityUsedUids.includes(actor.uid),false);
 actor.buffs=[{bp:500,untilTurn:blocked.turn}];
 blocked=act(blocked,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='onceBuffSelf');
 assert.equal(universalBp(packs,blocked,blocked.players[0].front[0]),pack.cards[vol2('067')].bp+1000);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 let empty=reach(counts,39);
 const card=take(empty,0,vol2('067'));
 empty.players[0].hand.push(card);
 const legal=legalUniversalActions(packs,empty).filter(a=>a.type==='play'&&a.uid===card.uid);
 assert.ok(legal.length);
 empty=dispatchUniversalAction(packs,empty,legal.find(a=>a.line==='front'&&empty.players[0].front[a.slot]==null));
 assert.equal(empty.pending,null);
 assert.equal(assertUniversalMatch(packs,blocked),true);
});

test('012 and 013 do not offer the REST main before the named event is used',()=>{
 const counts=deckOf({[vol2('012')]:4,[vol2('013')]:4,[vol2('001')]:4});
 let s=reach(counts,40);
 const alto=seat(s,0,vol2('012'),'energy',0);
 const look=seat(s,0,vol2('013'),'front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&
  (a.uid===alto.uid||a.uid===look.uid)),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:alto.uid,mode:'selfRestThen'}));
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('062 stays active, puts one hand card on the bottom, then draws',()=>{
 const counts=deckOf({[vol2('062')]:4,[vol2('001')]:4});
 let empty=reach(counts,41);
 const quiet=seat(empty,0,vol2('062'),'front',0);
 empty.players[0].deck.push(...empty.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.uid===quiet.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,empty,{type:'activate',uid:quiet.uid,mode:'frontOnce'}));
 assert.equal(empty.mainAbilityUsedUids.includes(quiet.uid),false);
 quiet.ready=false;
 empty.players[0].hand.push(take(empty,0,vol2('001')));
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.uid===quiet.uid),false);
 let s=reach(counts,42);
 const actor=seat(s,0,vol2('062'),'front',0);
 const buried=take(s,0,vol2('001'));
 s.players[0].hand.push(buried);
 const top=s.players[0].deck[0];
 const handBefore=s.players[0].hand.length;
 s=act(s,a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='frontOnce');
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.pending.kind,'effect-hand-bottom');
 assert.equal(s.pending.mandatory,true);
 s=dispatchUniversalAction(packs,s,{type:'chooseHandBottom',uid:buried.uid});
 assert.equal(s.players[0].deck.at(-1).uid===buried.uid||s.players[0].hand.some(card=>card.uid===top.uid),true);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(s.players[0].front[0].readyOnAttackGranted,undefined);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('065 uses printed BP and hides the active choice unless this card entered by an effect',()=>{
 const counts=deckOf({[vol2('065')]:4,[vol2('067')]:4,[vol2('001')]:4,[vol2('051')]:2});
 let s=reach(counts,43);
 for(let i=0;i<3;i++)seat(s,0,vol2('067'),'energy',i);
 const low=seat(s,0,vol2('001'),'front',1);
 const high=seat(s,0,vol2('051'),'front',2);
 high.buffs=[{bp:-2000,untilTurn:s.turn}];
 s=play(s,vol2('065'),'front');
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(option=>option.id),['buff']);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'buff'});
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),true);
 let caused=reach(counts,44);
 for(let i=0;i<3;i++)seat(caused,0,vol2('067'),'energy',i);
 const small=seat(caused,0,vol2('001'),'front',1);
 const tall=seat(caused,0,vol2('051'),'front',2);
 const coming=seat(caused,0,vol2('065'),'front',3);
 appendCompletedMove(caused,{uid:coming.uid,cardId:coming.cardId,owner:0,controller:0,
  from:'outside',to:'front',reason:'own-effect'});
 caused.fieldEntryNames[0].push(pack.cards[vol2('065')].name);
 small.buffs=[{bp:3000,untilTurn:caused.turn}];
 tall.buffs=[{bp:-2000,untilTurn:caused.turn}];
 const printed=pack.cards[vol2('065')];
 caused.effectQueue.push({...printed.effects.onPlay[0],owner:0,
  sourceUid:coming.uid,sourceName:printed.name});
 caused=dispatchUniversalAction(packs,caused,{type:'next'});
 assert.deepEqual(caused.pending.options.map(option=>option.id),['buff','active']);
 caused=dispatchUniversalAction(packs,caused,{type:'chooseEffectMode',mode:'active'});
 assert.equal(caused.pending.choices.includes(small.uid),true);
 assert.equal(caused.pending.choices.includes(tall.uid),false);
 assert.equal(universalBp(packs,caused,small),pack.cards[vol2('001')].bp+3000);
 assert.equal(universalBp(packs,caused,tall),pack.cards[vol2('051')].bp-2000);
 assert.equal(assertUniversalMatch(packs,caused),true);
});

test('059 does not spend its Walkure discount on an ineligible hand play',()=>{
 const counts=deckOf({[vol2('059')]:2,[vol2('024')]:4,[vol2('001')]:4,[vol2('041')]:4});
 let s=reach(counts,45);
 for(let i=0;i<2;i++)seat(s,0,vol2('024'),'energy',i);
 s.players[0].deck.unshift(take(s,0,vol2('001')),take(s,0,vol2('001')),take(s,0,vol2('001')));
 s=play(s,vol2('059'));
 s=finishOrder(s);
 const grant=s.continuousStates.find(e=>e.kind==='nextEligibleHandPlayApDiscount'&&!e.consumed);
 assert.ok(grant);
 const ready=()=>s.players[0].apCards.filter(c=>c.ready).length;
 const before=ready();
 s=play(s,vol2('001'),'front');
 assert.equal(ready(),before-1);
 assert.equal(s.continuousStates.some(e=>e.id===grant.id&&e.consumed),false);
 const after=ready();
 s=play(s,vol2('041'),'front');
 assert.equal(ready(),after);
 assert.equal(s.continuousStates.some(e=>e.id===grant.id),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('058 cannot start without a legal character or a rested AP',()=>{
 const counts=deckOf({[vol2('058')]:2,[vol2('050')]:4,[vol2('021')]:2});
 let none=reach(counts,46);
 for(let i=0;i<2;i++)seat(none,0,vol2('050'),'energy',i);
 const event=take(none,0,vol2('058'));
 none.players[0].hand.push(event);
 const ap=none.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legalUniversalActions(packs,none).some(a=>a.type==='event'&&a.uid===event.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,none,{type:'event',uid:event.uid}));
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,ap);
 let rested=reach(counts,47);
 for(let i=0;i<2;i++)seat(rested,0,vol2('050'),'energy',i);
 const delta=seat(rested,0,vol2('021'),'front',0);
 const card=take(rested,0,vol2('058'));
 rested.players[0].hand.push(card);
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.type==='event'&&a.uid===card.uid),false);
 rested.players[0].apCards.find(c=>c.ready).ready=false;
 rested=act(rested,a=>a.type==='event'&&a.uid===card.uid);
 assert.equal(rested.pending.kind,'effect-buff-own');
 assert.equal(rested.pending.optional,false);
 assert.equal(rested.pending.choices.includes(delta.uid),true);
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.type==='chooseOwnBuff'&&a.uid===null),false);
 rested=dispatchUniversalAction(packs,rested,{type:'chooseOwnBuff',uid:delta.uid});
 assert.equal(rested.pending.kind,'effect-recover-ap');
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.uid===null),false);
 assert.equal(assertUniversalMatch(packs,rested),true);
});

test('060 raises the retirement cap by distinct Walkure names, not copies',()=>{
 const counts=deckOf({[vol2('060')]:2,[vol2('024')]:4,[vol2('030')]:4,[vol2('034')]:4,
  [vol2('041')]:4,[vol2('001')]:4,[vol2('051')]:2});
 let low=reach(counts,48);
 for(let i=0;i<2;i++)seat(low,0,vol2('024'),'energy',i);
 seat(low,0,vol2('030'),'front',0);
 seat(low,0,vol2('030'),'front',1);
 seat(low,0,vol2('030'),'front',2);
 const small=seat(low,1,vol2('001'),'front',0);
 const tall=seat(low,1,vol2('051'),'front',1);
 low=play(low,vol2('060'));
 assert.equal(low.pending.limit,3000);
 assert.equal(low.pending.choices.includes(small.uid),true);
 assert.equal(low.pending.choices.includes(tall.uid),false);
 let high=reach(counts,49);
 for(let i=0;i<2;i++)seat(high,0,vol2('024'),'energy',i);
 seat(high,0,vol2('030'),'front',0);
 seat(high,0,vol2('034'),'front',1);
 seat(high,0,vol2('041'),'front',2);
 const a=seat(high,1,vol2('001'),'front',0);
 const b=seat(high,1,vol2('051'),'front',1);
 high=play(high,vol2('060'));
 assert.equal(high.pending.limit,5000);
 assert.equal(high.pending.choices.includes(a.uid),true);
 assert.equal(high.pending.choices.includes(b.uid),true);
 assert.equal(assertUniversalMatch(packs,high),true);
});
