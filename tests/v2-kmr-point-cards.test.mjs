import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {KMR_POINT_ART_CREDIT,KMR_POINT_CARDS,kmrPointCardsFor} from '../dist/kmr-point-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {kmrPracticeDeck,createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assignPointCards,assertPointCardIdentities} from '../dist/universal-v2/point-cards.mjs';
import {assertUniversalMatch,newUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {controllerChoiceArt,fieldEffectCopy,uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

const SET1_IDS=['KMR-1-AP01','KMR-1-AP02','KMR-1-AP03','KMR-1-AP04','KMR-1-AP05','KMR-1-AP06','KMR-1-AP01-st','KMR-1-AP01-star'];
const BATTLE_EXTRA=['KMR-2-AP01','KMR-2-AP02','KMR-2-AP03','KMR-2-AP04','KMR-2-AP05','KMR-2-AP06','KMR-2-AP01-star','KMR-AP01'];
const deckIds=new Set([...KMR_CARDS,...KMR2_CARDS].map(card=>card.id));

test('Rugia point cards stay outside the 113 and 216 deck identities',()=>{
 const set1=createKmrV2Pack();
 const battle=createKmrBattlePack();
 assert.equal(set1.version,'kmr-ua29-20261101');
 assert.equal(battle.version,'kmr-ua29-ex12-20261102');
 assert.equal(Object.keys(set1.cards).length,113);
 assert.equal(Object.keys(battle.cards).length,216);
 assert.deepEqual(kmrPointCardsFor('set1').map(card=>card.id),SET1_IDS);
 assert.deepEqual(kmrPointCardsFor('battle').map(card=>card.id),[...SET1_IDS,...BATTLE_EXTRA]);
 assert.equal(KMR_POINT_CARDS.length,16);
 for(const card of KMR_POINT_CARDS){
  assert.equal(deckIds.has(card.id),false,card.id);
  assert.equal(set1.cards[card.id],undefined,card.id);
  assert.equal(battle.cards[card.id],undefined,card.id);
  assert.equal(card.type,'action-point');
  assert.equal(card.deckCard,false);
  assert.equal(card.effect,'');
  assert.equal(card.effectJa,'');
  assert.equal(card.officialName,'行動值卡(假面騎士)');
  assert.equal(card.nameJa,'アクションポイントカード(仮面ライダー)');
  assert.equal(card.name.startsWith('行動值卡・'),true,card.name);
  assert.equal(card.image.startsWith('https://rugiacreation.com/ua/cardlist/small/'),true);
  assert.equal(card.artCredit,KMR_POINT_ART_CREDIT);
  assert.equal(card.id.includes('UAPR'),false);
  assert.equal(fieldEffectCopy(card),'這張卡沒有印刷效果。');
 }
 assert.equal(KMR_POINT_CARDS.find(card=>card.id==='KMR-1-AP01-star').illustration,'P');
 assert.equal(KMR_POINT_CARDS.find(card=>card.id==='KMR-2-AP01-star').illustration,'P');
 const issues=validateUniversalDeck(battle,{...kmrPracticeDeck().counts,'KMR-1-AP01':1});
 assert.equal(issues.some(issue=>issue.includes('Unregistered/unsupported card: KMR-1-AP01')),true);
});

test('a Kamen Rider match brings three point cards and shows them to both players',()=>{
 const pack=createKmrBattlePack();
 const counts=kmrPracticeDeck().counts;
 const chosen=[['KMR-1-AP01','KMR-1-AP01','KMR-2-AP06'],['KMR-AP01','KMR-1-AP01-star','KMR-2-AP01-star']];
 const s=newUniversalMatch(pack,{decks:[counts,counts],seed:4,pointCardIds:chosen});
 assert.deepEqual(s.players[0].apCards.map(card=>card.cardId),chosen[0]);
 assert.deepEqual(s.players[1].apCards.map(card=>card.cardId),chosen[1]);
 assert.deepEqual(s.players.map(player=>player.apCards.map(card=>card.uid)),
  [['AP0-0','AP0-1','AP0-2'],['AP1-0','AP1-1','AP1-2']]);
 const mine=universalPublicView(pack,s,0);
 const theirs=universalPublicView(pack,s,1);
 const published=player=>player.apCards.map(card=>({ready:card.ready,inPlay:card.inPlay,cardId:card.cardId}));
 assert.deepEqual(mine.players[0].apCards,theirs.players[0].apCards);
 assert.deepEqual(mine.players[1].apCards,theirs.players[1].apCards);
 assert.deepEqual(mine.players[0].apCards,published(s.players[0]));
 assert.deepEqual(mine.players[1].apCards.map(card=>card.cardId),chosen[1]);
 assert.equal(JSON.stringify(mine).includes('AP0-'),false);
 assert.equal(JSON.stringify(mine).includes('AP1-'),false);
 assert.equal(mine.players[1].hand,null);
 assert.equal(theirs.players[0].hand,null);
 assert.equal('deck' in mine.players[0],false);
 const labelState={...s,pending:{kind:'effect-recover-ap',player:0,remaining:1}};
 assert.equal(uiActionLabel({type:'chooseApRecovery',uid:'AP0-0'},{pack,state:labelState}),
  '啟動 行動值卡・ZI-O');
 assert.equal(uiActionLabel({type:'chooseActiveAp',uid:'AP0-2'},{pack,state:labelState}),
  '將 行動值卡・集合 轉為活動');
 assert.equal(uiActionLabel({type:'chooseApRecovery',uid:null},{pack,state:labelState}),'完成恢復 AP');
 const art=controllerChoiceArt(pack,labelState,{type:'chooseApRecovery',uid:'AP0-0'});
 assert.deepEqual(art.map(card=>card.cardId),['KMR-1-AP01']);
 assert.equal(art[0].name,'行動值卡・ZI-O');
});

test('the default trio is the first three set-1 cards, and unknown cards are refused',()=>{
 const set1=createKmrV2Pack();
 const counts=kmrPracticeDeck().counts;
 assert.deepEqual(validateUniversalDeck(set1,counts),[]);
 const s=newUniversalMatch(set1,{decks:[counts,counts],seed:8});
 assert.deepEqual(s.players[0].apCards.map(card=>card.cardId),['KMR-1-AP01','KMR-1-AP02','KMR-1-AP03']);
 assert.deepEqual(s.players[1].apCards.map(card=>card.cardId),['KMR-1-AP01','KMR-1-AP02','KMR-1-AP03']);
 assert.throws(()=>newUniversalMatch(set1,{decks:[counts,counts],pointCardIds:[['KMR-1-001','KMR-1-AP01','KMR-1-AP02'],['KMR-1-AP01','KMR-1-AP02','KMR-1-AP03']]}),
  /exactly 3 registered point cards/);
 assert.throws(()=>newUniversalMatch(set1,{decks:[counts,counts],pointCardIds:[['KMR-2-AP01','KMR-1-AP01','KMR-1-AP02'],['KMR-1-AP01','KMR-1-AP02','KMR-1-AP03']]}),
  /exactly 3 registered point cards/);
 s.players[0].apCards[0].cardId='KMR-1-001';
 assert.throws(()=>assertUniversalMatch(set1,s),/Invalid point card/);
 const generic=assignPointCards({kind:'ua-v2-pack',pointCards:[]},0,null);
 assert.equal(generic.every(card=>card.cardId==null),true);
 assert.doesNotThrow(()=>assertPointCardIdentities({pointCards:[]},{apCards:generic}));
 assert.throws(()=>assignPointCards({pointCards:[]},0,['KMR-1-AP01','KMR-1-AP02','KMR-1-AP03']),
  /no point cards/);
 generic[0].cardId='KMR-1-AP01';
 assert.throws(()=>assertPointCardIdentities({pointCards:[]},{apCards:generic}),/Invalid point card/);
});
