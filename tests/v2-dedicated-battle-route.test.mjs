import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedTtgRedPilotDeck,verifiedBleachPurplePilotDeck}
 from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,assertUniversalMatch,legalUniversalActions}
 from '../dist/universal-v2/engine.mjs';
import {prepareSoloBattle,saveSoloBattle,loadSoloBattle,clearSoloBattle,
 soloProgressMatches,readSoloProgress,writeSoloProgress,soloProgressKey,
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
 assert.match(battle,/universal-v2-preview\.mjs\?v=[0-9a-z]+/);
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

test('a resume snapshot is read only after the account matches',()=>{
 const id='u'+'a'.repeat(16);
 const other='u'+'b'.repeat(16);
 assert.equal(soloProgressMatches({accountId:id},id),true);
 assert.equal(soloProgressMatches({accountId:null},null),true);
 assert.equal(soloProgressMatches({accountId:id},other),false);
 assert.equal(soloProgressMatches({accountId:id},null),false);
 assert.equal(soloProgressMatches({accountId:null},id),false);
 assert.equal(soloProgressMatches({},null),false);
 assert.equal(soloProgressMatches({state:{secret:true}},id),false);
 assert.equal(soloProgressMatches({accountId:'not-an-account'},null),false);
});

test('a new game for one account keeps the other account entry and progress',()=>{
 const storage=fakeStorage();
 const first='u'+'a'.repeat(16);
 const second='u'+'b'.repeat(16);
 const firstLaunch=launch();
 const secondLaunch=launch({nonce:4242});
 saveSoloBattle(storage,firstLaunch,first);
 writeSoloProgress(storage,first,{version:1,launchId:firstLaunch.id,state:{phase:'main'}});
 saveSoloBattle(storage,secondLaunch,second);
 writeSoloProgress(storage,second,{version:1,launchId:secondLaunch.id,state:{phase:'mulligan'}});
 assert.equal(readSoloProgress(storage,first).status,'ok');
 assert.equal(readSoloProgress(storage,first).data.state.phase,'main');
 assert.equal(readSoloProgress(storage,second).data.state.phase,'mulligan');
 assert.equal(loadSoloBattle(storage,{now,accountId:first}).config.id,firstLaunch.id);
 assert.equal(loadSoloBattle(storage,{now,accountId:second}).config.id,secondLaunch.id);
 saveSoloBattle(storage,{...secondLaunch,unrecorded:true},null);
 assert.equal(readSoloProgress(storage,first).data.state.phase,'main');
 assert.equal(readSoloProgress(storage,null).status,'absent');
 clearSoloBattle(storage,second);
 assert.equal(loadSoloBattle(storage,{now,accountId:second}),null);
 assert.equal(readSoloProgress(storage,first).status,'ok');
 assert.equal(loadSoloBattle(storage,{now,accountId:first}).config.id,firstLaunch.id);
 storage.setItem(soloProgressKey(first),'{');
 assert.equal(readSoloProgress(storage,first).status,'unreadable');
 assert.equal(storage.getItem(soloProgressKey(first)),'{');
});

test('a legacy snapshot is adopted only by the account it names',()=>{
 const storage=fakeStorage();
 const first='u'+'c'.repeat(16);
 const second='u'+'d'.repeat(16);
 const firstLaunch=launch();
 saveSoloBattle(storage,firstLaunch);
 storage.setItem(SOLO_BATTLE_PROGRESS_KEY,JSON.stringify({accountId:first,version:1,state:{phase:'main'}}));
 assert.equal(loadSoloBattle(storage,{now,accountId:second}),null);
 assert.equal(storage.getItem(SOLO_BATTLE_PROGRESS_KEY).includes(first),true);
 const adopted=loadSoloBattle(storage,{now,accountId:first});
 assert.equal(adopted.config.id,firstLaunch.id);
 assert.equal(readSoloProgress(storage,first).status,'ok');
 assert.equal(readSoloProgress(storage,first).data.state.phase,'main');
 saveSoloBattle(storage,launch({nonce:99}),first);
 assert.equal(storage.getItem(SOLO_BATTLE_PROGRESS_KEY),null);
 assert.equal(readSoloProgress(storage,first).status,'absent');
});

test('setup launches the new URL and battle-only boot preserves V2 reducer, AI and session recovery',()=>{
 const code=read('dist/universal-v2-preview.mjs');
 assert.match(code,/const IS_BATTLE_PAGE=document\.body\?\.dataset\?\.v2Screen==='battle'/);
 assert.match(code,/function launchBattle\(\)/);
 assert.match(code,/window\.location\.assign\(SOLO_BATTLE_URL\)/);
 assert.match(code,/saveSoloBattle\(sessionStorage,config,account==null\?null:account\)/);
 assert.match(code,/if\(!IS_BATTLE_PAGE\)renderDesignatedDecks\(\)/);
 assert.match(code,/if\(!IS_BATTLE_PAGE\)importV2EditorDeck\(\)/);
 assert.match(code,/if\(!IS_BATTLE_PAGE\)\{/);
 assert.match(code,/const loaded=loadSoloBattle\(sessionStorage,\{accountId:account\}\)/);
 assert.doesNotMatch(code,/if\(!restoreBattleProgress\(\)\)void startGame\(\)/);
 assert.match(code,/if\(app\.progressRead==='absent'\)void startGame\(\{account\}\)/);
 assert.match(code,/這份續局無法讀取，原進度已保留/);
 assert.match(code,/無法確認帳號，這一局的進度已保留/);
 assert.match(code,/這場屬於另一個帳號。請回到對戰設定，由目前的帳號另開一局/);
 assert.match(code,/if\(launchOwner&&launchOwner!==owner\)return/);
 assert.match(code,/不記錄練習/);
 assert.match(code,/learningBattleMode\(payload,\{accountId:app\.battleAccountId\}\)/);
 assert.match(read('dist/universal-v2/learn-policy.mjs'),/模型帳號與本場不符/);
 const checked=code.indexOf('soloProgressMatches(data,app.battleAccountId)');
 const applied=code.indexOf('app.state=data.state');
 assert.ok(checked>0&&applied>checked);
 assert.match(code,/accountId:soloProgressOwner\(app\.battleAccountId\)/);
 assert.match(code,/writeSoloProgress\(sessionStorage,app\.battleAccountId,data\)/);
 assert.match(code,/assertUniversalMatch\(app\.packs,data\.state\)/);
 assert.match(code,/saveBattleProgress\(\)/);
 assert.match(code,/clearSoloBattle\(sessionStorage,app\.battleAccountId\)/);
 assert.match(code,/newUniversalMatch\(app\.packs,\{decks:\[mine\.counts,foe\.counts\],seed,first,openingMulligan:true\}\)/);
 assert.match(code,/dispatchUniversalAction\(app\.packs,app\.state,a,\{actor:0\}\)/);
 assert.match(code,/chooseProgressSafeAiAction\(app\.packs,app\.state/);
 assert.match(code,/function renderOpeningMulligan\(target,s\)/);
 assert.match(code,/const seed=generateMatchSeed\(\)/);
 assert.doesNotMatch(read('dist/universal-v2-battle.html'),/app\.mjs|match-runtime\.mjs/);
});
