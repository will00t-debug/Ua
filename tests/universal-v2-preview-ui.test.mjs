import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isExactLegal,uiActor,uiCardLabel,uiActionLabel,
 uiActionGroup,visibleActionsForCard,V2_TITLE_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalPrivateChoices,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const [mine,foe]=[verifiedTtgRedPilotDeck(),verifiedBleachPurplePilotDeck()];
const packs=[mine.pack,foe.pack];
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[mine.counts,foe.counts],first,seed:3001});
const source=path=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
test('V2 standalone preview is never injected into existing production index and references shipped mobile assets',()=>{
 const existing=source('../dist/index.html'),page=source('../dist/universal-v2-preview.html');
 const script=source('../dist/universal-v2-preview.mjs'),css=source('../dist/universal-v2-legacy.css');
 assert.ok(!existing.includes('universal-v2-preview'));
 assert.ok(page.includes('<meta name="robots" content="noindex,nofollow,noarchive">'));
 for(const asset of ['universal-v2-legacy.css','universal-v2-preview.mjs'])assert.ok(page.includes(asset));
 for(const id of ['my-title','ai-title','ai-level','first-player','match-seed','match-view','start-game'])
  assert.ok(page.includes('id="'+id+'"'));
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(script,/dispatchUniversalAction\(app.packs,app.state,a,\{actor:0\}\)/);
 assert.match(script,/uiActor\(app.state\)===1/);
 assert.match(script,/universalPrivateChoices\(app.packs,s,0\)/);
 assert.ok(!page.includes('apiKey'));
});
test('UI presenter only allows actions copied from real per-turn legal options',()=>{
 const s=fresh(),legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(x=>x.type==='next'));
 assert.ok(legal.every(x=>['next','extraDraw'].includes(x.type)),
  'start phase may allow AP-paid extra draw besides next');
 assert.ok(isExactLegal({type:'next'},legal));
 assert.ok(!isExactLegal({type:'attack',uid:'0-99'},legal));
 assert.ok(!isExactLegal({type:'next',uid:'hidden'},legal));
 assert.ok(!isExactLegal({type:'move',uid:'1-2',slot:0},legal));
 assert.equal(uiActor(s),0);
 assert.equal(uiActionLabel(legal[0]),'前進下一階段／結束回合');
 assert.equal(uiActionGroup({type:'raid',uid:'0-1'}),'card');
 assert.equal(uiActionGroup({type:'chooseBlock',uid:null}),'pending');
 assert.deepEqual(visibleActionsForCard(legal,'0-2'),[]);
});
test('UI must not materialize opponent hand or deck card identities from public view',()=>{
 const s=fresh(),view=universalPublicView(packs,s,0);
 assert.equal(view.players[1].hand,null);
 assert.equal(view.players[1].handCount,7);
 assert.equal(view.players[1].deckCount,36);
 assert.equal(view.players[0].hand.length,7);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(V2_TITLE_LABELS['gurren-lagann'],'天元突破');
});
test('first player/actor logic changes at pending without inferring action owner from active turn',()=>{
 let s=fresh(0);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 // An AI can become the actor during a blocked hit even on human attack turn.
 const samples=Object.entries(s.players[0].deck);
 assert.ok(samples.length>1);
 const pending={...s,pending:{kind:'block',player:1},phase:'attack'};
 assert.equal(uiActor(pending),1);
 assert.equal(uiActor(s),0);
});
test('card labels use the correct player title pack, even with identical printed IDs across title sources',()=>{
 let s=fresh();
 const self=s.players[0].hand[0],enemy=s.players[1].hand[0];
 assert.equal(uiCardLabel(packs,s,self.uid),mine.pack.cards[self.cardId].name);
 assert.equal(uiCardLabel(packs,s,enemy.uid),foe.pack.cards[enemy.cardId].name);
 assert.match(uiActionLabel({type:'play',uid:self.uid,line:'energy',slot:2},{pack:packs,state:s}),/能源線 3/);
 assert.equal(uiActionLabel({type:'chooseTrigger',mode:'skip'}),'不使用此觸發');
 assert.equal(uiActionLabel({type:'chooseOwnBounce',uid:self.uid},{pack:packs,state:s}),
  '將 '+mine.pack.cards[self.cardId].name+' 返回手牌');
});

test('mobile board shares one prevalidated legal set per render and freezes selected AI difficulty',()=>{
 const script=source('../dist/universal-v2-preview.mjs');
 const slots=script.split('function legacySlot(')[1]?.split('function legacyLine(')[0];
 assert.ok(slots);
 assert.ok(!slots.includes('legalUniversalActions('),
  'classic V2 board must reuse one validated legal list per render');
 assert.match(script,/legal=legalUniversalActions\(app.packs,s\)/);
 assert.match(script,/legacyPlayer\(v,1,legal\)/);
 assert.match(script,/legacyPlayer\(v,0,legal\)/);
 assert.match(script,/legacyCommands\(legal\)/);
 assert.match(script,/pendingDialog\(legal\)/);
 assert.match(script,/app.aiDifficulty=\$\('ai-level'\).value/);
 assert.match(script,/difficulty:app.aiDifficulty/);
 assert.match(script,/publicPreviewActionLabel\(app.packs,previous,app.state,choice,1\)/);
 assert.match(script,/window.confirm\('除錯重播檔包含/);
 assert.match(script,/app.undo.replay/);
});
