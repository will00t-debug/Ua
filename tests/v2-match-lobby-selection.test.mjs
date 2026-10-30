import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectSavedV2LobbyDecks,validatedLobbyChoice,accountLobbyRows,orderedAccountLobbyRows,shadowedLocalLobbyKeys,lobbyChoiceText,V2_MATCH_SETUP_STORAGE_KEY}
 from '../dist/universal-v2/lobby-saved-decks.mjs';
import {prepareSoloBattle} from '../dist/universal-v2/solo-battle-session.mjs';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';
import {TITLES} from '../dist/title-registry.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
const read=x=>readFileSync(new URL(x,import.meta.url),'utf8');
test('V2 lobby displays a human deck, AI deck, actual difficulty control and same classic match UI',()=>{
 const html=read('../dist/universal-v2-preview.html');
 for(const id of ['my-title','ai-title','ai-level','first-player','start-game','designated-decks','my-deck-description','ai-deck-description'])
  assert.match(html,new RegExp('id="'+id+'"'),'Missing old public control '+id);
 for(const key of ['reject-blue','white-sword','renruki']){
  const match=html.match(new RegExp('data-deck-key="'+key+'"','g'))||[];
  assert.equal(match.length,2,'Both sides should offer '+key);
 }
 for(const difficulty of ['easy','normal','hard'])
  assert.ok(html.includes('data-ai-difficulty="'+difficulty+'"'));
 assert.ok(html.includes('選擇自己的牌組'));
 assert.ok(html.includes('選擇電腦牌組'));
 assert.ok(html.includes('開始 V2 對戰'));
 assert.match(html,/每場新對局都會自動重新洗牌/);
 assert.doesNotMatch(html,/id="match-seed"|牌序種子/);
 assert.ok(html.includes('牌組'));
 assert.match(read('../vercel.json'),/online\.html/);
 const js=read('../dist/universal-v2-preview.mjs');
 assert.ok(js.includes('newUniversalMatch(app.packs,'));
 assert.ok(js.includes('validateUniversalDeck(pack,counts)'));
 assert.ok(js.includes('syncMatchLobby()'));
 assert.ok(js.includes('rememberMatchLobby()'));
 assert.ok(js.includes('collectSavedV2LobbyDecks(localStorage)'));
 assert.match(js,/fetch\('\/api\/decks',\{credentials:'same-origin'/);
 assert.match(js,/accountLobbyRows\(payload\?\.decks\)/);
 assert.match(js,/if\(status===200\)/);
 assert.doesNotMatch(js,/from '\.\/engine\.mjs'/);
});
test('AI selection is three real V2 AI levels, not a decorative control',()=>{
 const html=read('../dist/universal-v2-preview.html');
 const js=read('../dist/universal-v2-preview.mjs');
 assert.ok(html.includes('id="ai-level"'));
 assert.ok(js.includes("app.aiDifficulty=$('ai-level').value"));
 assert.ok(js.includes("$('ai-level').value=difficulty"));
 assert.ok(js.includes("String($('ai-level').value===button.dataset.aiDifficulty)"));
 assert.equal(V2_MATCH_SETUP_STORAGE_KEY,'ua-v2-match-setup-v1');
});
test('previously saved V2-valid decks become selectable for both players without modifying originals',()=>{
 const data={
  'bleach-arena-saved-decks-v1':JSON.stringify([
   {id:'demo',name:'我的綠色自訂牌組',counts:BLEACH_GREEN_V2_COUNTS},
   {id:'incomplete',name:'僅供組卡草稿',counts:{'BLC-2-027':4}},
   {id:'bad',name:'已損壞牌組',counts:{'NOT-A-CARD':4}}
  ]),
  'ua-rez-saved-v1':JSON.stringify([
   {name:'不合法的 Re:Zero 測試',counts:{'REZ-2-001':4}}
  ])
 };
 const original=JSON.stringify(data);
 const storage={getItem:k=>data[k]??null};
 const decks=collectSavedV2LobbyDecks(storage);
 assert.equal(JSON.stringify(data),original,'Must not overwrite browser data');
 assert.ok(decks.length>=2);
 const valid=decks.find(d=>d.name==='我的綠色自訂牌組');
 assert.ok(valid&&valid.ready,valid?.issues?.join('；'));
 assert.equal(valid.title,'bleach');
 assert.equal(Object.values(valid.counts).reduce((n,c)=>n+c,0),50);
 const blocked=decks.find(d=>d.name==='僅供組卡草稿');
 assert.ok(blocked&&!blocked.ready);
 assert.equal(blocked.counts,null);
 assert.equal(decks.some(d=>d.name==='已損壞牌組'),false);
 const chosen=validatedLobbyChoice({value:valid.key},{[valid.key]:{pack:valid.pack,counts:valid.counts}},new Map());
 assert.equal(chosen.counts,valid.counts);
});
test('the picture deck builder and three BLEACH originals stay available',()=>{
 const html=read('../dist/universal-v2-preview.html');
 const js=read('../dist/universal-v2-preview.mjs');
 assert.ok(html.includes('href="/index.html"'));
 assert.match(js,/summarizeDesignatedDecks/);
 assert.match(js,/renderDesignatedDecks\(\)/);
 assert.ok(js.includes("button.dataset.deckSide"));
 assert.ok(js.includes("button.dataset.deckKey"));
 assert.ok(js.includes("button.dataset.aiDifficulty"));
 const green=editorV2Status('bleach',BLEACH_GREEN_V2_COUNTS);
 assert.equal(green.ready,true,green.issues.join('；'));
 assert.ok(TITLES.some(t=>t.id==='bleach'));
});
test('signed-in account decks become V2 lobby choices without rewriting the saved list',()=>{
 const readyId='d0123456789abcdef';
 const draftId='d0123456789abcdee';
 const brokenId='d0123456789abcdff';
 const input=[
  {id:readyId,name:' 我的綠色帳號牌組 ',title:'bleach',counts:{...BLEACH_GREEN_V2_COUNTS},localId:'demo',playable:false},
  {id:draftId,name:'還沒組完',title:'bleach',counts:{'BLC-1-067':4},localId:'draft'},
  {id:brokenId,name:'壞掉的牌表',title:'bleach',counts:{'NOT-A-CARD':4}},
  {id:'not-an-account-id',name:'不該出現',title:'bleach',counts:{...BLEACH_GREEN_V2_COUNTS}},
  {id:readyId,name:'重複',title:'bleach',counts:{...BLEACH_GREEN_V2_COUNTS}}
 ];
 const original=JSON.stringify(input);
 const rows=accountLobbyRows(input);
 assert.equal(JSON.stringify(input),original);
 assert.deepEqual(rows.map(row=>row.name),['我的綠色帳號牌組','還沒組完','壞掉的牌表']);
 const ready=rows[0];
 assert.equal(ready.ready,true,ready.issues.join('；'));
 assert.equal(ready.key,'v2-account-'+readyId);
 assert.equal(ready.recordDeckId,readyId);
 assert.equal(ready.localId,'demo');
 assert.equal(ready.source,'account');
 assert.equal(Object.values(ready.counts).reduce((n,c)=>n+c,0),50);
 assert.equal(rows[1].ready,false);
 assert.equal(rows[1].counts,null);
 assert.equal(lobbyChoiceText(rows[1],'my-title'),'帳號牌組｜還沒組完（目前 4/50 張。V2 正式對戰需要完整 50 張牌組。）');
 const long=lobbyChoiceText({source:'account',ready:false,name:'長原因',issues:['還沒完成的原因'.repeat(8)]},'my-title');
 assert.match(long,/^帳號牌組｜長原因（.{36}…）$/u);
 assert.match(rows[2].issues[0],/無效卡號/);
 assert.equal(lobbyChoiceText(ready,'ai-title'),'帳號牌組｜我的綠色帳號牌組');
 const ordered=orderedAccountLobbyRows([rows[1],rows[2],ready]);
 assert.deepEqual(ordered.map(row=>row.ready),[true,false,false]);
 const local=collectSavedV2LobbyDecks({
  getItem:key=>key==='bleach-arena-saved-decks-v1'?JSON.stringify([
   {id:'demo',name:'我的綠色自訂牌組',counts:{...BLEACH_GREEN_V2_COUNTS}},
   {id:'other',name:'另一副本機牌',counts:{...BLEACH_GREEN_V2_COUNTS}}
  ]):null
 });
 assert.deepEqual(shadowedLocalLobbyKeys(local,rows),['v2-saved-bleach-0']);
 const chosen=validatedLobbyChoice({value:ready.key},{[ready.key]:{pack:ready.pack,counts:ready.counts,label:ready.name,recordDeckId:ready.recordDeckId}},new Map());
 const battle=prepareSoloBattle({
  mine:chosen,foe:{pack:ready.pack,counts:ready.counts,label:'練習組'},
  first:0,difficulty:'normal',recordDeckId:chosen.recordDeckId,now:1_700_000_000_000,nonce:7
 });
 assert.equal(battle.recordDeckId,readyId);
 assert.equal(battle.decks[0].name,'我的綠色帳號牌組');
 assert.equal(Object.values(battle.decks[0].counts).reduce((n,c)=>n+c,0),50);
});
