import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedTtgRedPilotDeck,verifiedBleachPurplePilotDeck}
 from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,assertUniversalMatch,legalUniversalActions}
 from '../dist/universal-v2/engine.mjs';
import {prepareSoloBattle,saveSoloBattle,loadSoloBattle,clearSoloBattle,
 SOLO_BATTLE_ENTRY_KEY,SOLO_BATTLE_PROGRESS_KEY,SOLO_BATTLE_URL,SOLO_SETUP_URL}
 from '../dist/universal-v2/solo-battle-session.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function fakeStorage(){
 const data=new Map();
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),
  removeItem:k=>data.delete(k),data};
}
const now=1793181000000;
const mine=()=>({...verifiedTtgRedPilotDeck(),label:'我的紅色大紅蓮'});
const foe=()=>({...verifiedBleachPurplePilotDeck(),label:'電腦紫色 BLEACH'});
const launch=(overrides={})=>prepareSoloBattle({
 mine:mine(),foe:foe(),first:1,difficulty:'hard',now,nonce:31337,
 recordDeckId:'my-original-deck',...overrides
});

test('setup and actual battle are two separate documents on distinct URLs',()=>{
 const setup=read('dist/universal-v2-preview.html');
 const battle=read('dist/universal-v2-battle.html');
 const worker=read('worker/index.mjs');
 assert.equal(SOLO_SETUP_URL,'/universal-v2-preview.html');
 assert.equal(SOLO_BATTLE_URL,'/universal-v2-battle.html');
 assert.match(setup,/id="start-game"/);
 assert.match(setup,/id="ai-level"/);
 assert.match(setup,/id="my-title"/);
 assert.doesNotMatch(setup,/id="match-view"/);
 assert.match(battle,/data-v2-screen="battle"/);
 assert.match(battle,/id="match-view"/);
 assert.match(battle,/id="exit-battle"/);
 assert.doesNotMatch(battle,/id="start-game"|id="my-title"|id="ai-level"|class="panel setup"/);
 assert.match(battle,/universal-v2-battle\.css\?v=20261028triggercenter1/);
 assert.match(battle,/universal-v2-preview\.mjs\?v=20261029keyword1/);
 assert.match(worker,/'\/universal-v2-battle\.html':'\/universal-v2-battle\.html'/);
 assert.match(worker,/'\/universal-v2-battle':'\/universal-v2-battle\.html'/);
});

test('the new route carries only validated deck lists, metadata and preferences',()=>{
 const storage=fakeStorage();
 storage.setItem(SOLO_BATTLE_PROGRESS_KEY,'old match progress');
 const original=launch();
 assert.equal(original.decks[0].title,'gurren-lagann');
 assert.equal(original.decks[1].title,'bleach');
 assert.equal(original.decks[0].name,'我的紅色大紅蓮');
 assert.equal(original.recordDeckId,'my-original-deck');
 assert.equal(JSON.stringify(original).includes('"rng"'),false);
 assert.equal(JSON.stringify(original).includes('"hand"'),false);
 assert.equal(JSON.stringify(original).includes('"life"'),false);
 saveSoloBattle(storage,original);
 assert.equal(storage.getItem(SOLO_BATTLE_PROGRESS_KEY),null);
 const data=loadSoloBattle(storage,{now:now+10});
 assert.ok(data);
 assert.equal(data.config.first,1);
 assert.equal(data.config.difficulty,'hard');
 assert.equal(data.decks[0].label,'我的紅色大紅蓮');
 assert.equal(data.decks[1].label,'電腦紫色 BLEACH');
 assert.equal(data.packs[0].version,original.decks[0].packVersion);
 const state=newUniversalMatch(data.packs,{decks:data.decks.map(d=>d.counts),
  seed:99881,first:data.config.first,openingMulligan:true});
 assert.equal(assertUniversalMatch(data.packs,state),true);
 assert.equal(state.pending.kind,'opening-mulligan');
 assert.deepEqual(legalUniversalActions(data.packs,state).map(a=>a.mode),['keep','redraw']);
 clearSoloBattle(storage);
 assert.equal(storage.getItem(SOLO_BATTLE_ENTRY_KEY),null);
 assert.equal(loadSoloBattle(storage,{now}),null);
});

test('invalid, expired, corrupted, unknown and no-longer-playable handoffs are rejected',()=>{
 const storage=fakeStorage(),base=launch();
 assert.equal(loadSoloBattle(storage,{now}),null);
 assert.throws(()=>launch({difficulty:'nightmare'}),/設定/);
 assert.throws(()=>launch({first:2}),/設定/);
 assert.throws(()=>launch({mine:{pack:mine().pack,counts:{'NOPE':50}}}),/規則/);
 storage.setItem(SOLO_BATTLE_ENTRY_KEY,'{invalid json}');
 assert.equal(loadSoloBattle(storage,{now}),null);
 storage.setItem(SOLO_BATTLE_ENTRY_KEY,JSON.stringify(base));
 assert.equal(loadSoloBattle(storage,{now:now+24*60*60*1000+1}),null);
 const modified=structuredClone(base);
 modified.decks[0].counts={'TTG-1-042':50};
 storage.setItem(SOLO_BATTLE_ENTRY_KEY,JSON.stringify(modified));
 assert.equal(loadSoloBattle(storage,{now}),null);
 modified.decks[0]={...base.decks[0],packVersion:'invented-v0'};
 storage.setItem(SOLO_BATTLE_ENTRY_KEY,JSON.stringify(modified));
 assert.equal(loadSoloBattle(storage,{now}),null);
});

test('setup launches the new URL and battle-only boot preserves V2 reducer, AI and session recovery',()=>{
 const code=read('dist/universal-v2-preview.mjs');
 assert.match(code,/const IS_BATTLE_PAGE=document\.body\?\.dataset\?\.v2Screen==='battle'/);
 assert.match(code,/function launchBattle\(\)/);
 assert.match(code,/window\.location\.assign\(SOLO_BATTLE_URL\)/);
 assert.match(code,/saveSoloBattle\(sessionStorage,config\)/);
 assert.match(code,/if\(!IS_BATTLE_PAGE\)renderDesignatedDecks\(\)/);
 assert.match(code,/if\(!IS_BATTLE_PAGE\)importV2EditorDeck\(\)/);
 assert.match(code,/if\(!IS_BATTLE_PAGE\)\{/);
 assert.match(code,/const loaded=loadSoloBattle\(sessionStorage\)/);
 assert.match(code,/if\(!restoreBattleProgress\(\)\)startGame\(\)/);
 assert.match(code,/sessionStorage\.setItem\(SOLO_BATTLE_PROGRESS_KEY,JSON\.stringify\(data\)\)/);
 assert.match(code,/assertUniversalMatch\(app\.packs,data\.state\)/);
 assert.match(code,/saveBattleProgress\(\)/);
 assert.match(code,/clearSoloBattle\(sessionStorage\)/);
 assert.match(code,/newUniversalMatch\(app\.packs,\{decks:\[mine\.counts,foe\.counts\],seed,first,openingMulligan:true\}\)/);
 assert.match(code,/dispatchUniversalAction\(app\.packs,app\.state,a,\{actor:0\}\)/);
 assert.match(code,/chooseProgressSafeAiAction\(app\.packs,app\.state/);
 assert.match(code,/function renderOpeningMulligan\(target,s\)/);
 assert.match(code,/const seed=generateMatchSeed\(\)/);
 assert.doesNotMatch(read('dist/universal-v2-battle.html'),/app\.mjs|match-runtime\.mjs/);
});
