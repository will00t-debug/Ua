import test from 'node:test';
import assert from 'node:assert/strict';
import {TITLES,titleOfCard,validateTitleMembership} from '../dist/title-registry.mjs';
import {REZERO_VOL2_AP,REZERO_VOL2_BY_ID,REZERO_VOL2_CARDS,REZERO_VOL2_SET} from '../dist/rezero-vol2.mjs';
import {rezDeckIssues,normalizeRezCounts} from '../dist/rezero-builder.mjs';
import {REZ_V2_IMPLEMENTED_IDS} from '../dist/universal-v2/rez-pack.mjs';

const byId=id=>REZERO_VOL2_BY_ID[id];

test('EX17BT catalogue is the official 73-card Vol.2 list and stays unplayable',()=>{
 const title=TITLES.find(item=>item.id==='rezero');
 assert.equal(title.playable,false);
 assert.equal(title.cards.length,186); // 113 Vol.1 plus 73 Vol.2; Vol.2 identity checks below remain set-scoped.
 assert.equal(REZERO_VOL2_SET.regularCount,73);
 assert.equal(REZERO_VOL2_SET.release,'2026-10-30');
 assert.deepEqual(REZERO_VOL2_CARDS.map(card=>card.id),Array.from({length:73},(_,index)=>'REZ-2-'+String(index+1).padStart(3,'0')));
 assert.deepEqual(REZERO_VOL2_SET.rarity,{SR:12,R:12,U:24,C:25});
 const rarity={};
 for(const card of REZERO_VOL2_CARDS)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 assert.deepEqual(rarity,REZERO_VOL2_SET.rarity);
 assert.equal(REZERO_VOL2_AP.length,8);
 const implemented=new Set(REZ_V2_IMPLEMENTED_IDS);
 assert.equal(implemented.size,28);
 assert.ok(REZERO_VOL2_CARDS.every(card=>card.auto===false&&titleOfCard(card)==='rezero'));
 assert.ok(REZERO_VOL2_CARDS.every(card=>card.engineImplemented===implemented.has(card.id)));
 assert.ok(REZERO_VOL2_AP.every(card=>card.engineImplemented!==true));
 assert.ok(REZERO_VOL2_CARDS.every(card=>card.type!=='action-point'));
 assert.deepEqual(REZERO_VOL2_SET.packedVol1Parallel,['EX17BT/REZ-1-029_p1']);
 assert.equal(byId('REZ-1-029'),undefined);
});

test('printed Vol.2 stats stay pinned to the official pages',()=>{
 const pack=byId('REZ-2-001');
 assert.equal(pack.number,'EX17BT/REZ-2-001');
 assert.equal(pack.nameJa,'パック');
 assert.deepEqual([pack.color,pack.energy,pack.ap,pack.bp,pack.gen,pack.trigger,pack.rarity,pack.type],['yellow',0,1,500,1,'draw','U','character']);
 assert.match(pack.effectJa,/イベントカードとしても扱う/);
 assert.match(pack.effectJa,/必要エナジーが0の黄の〈エミリア〉/);
 assert.deepEqual(pack.alsoTypes,['event']);

 const emilia=byId('REZ-2-011');
 assert.deepEqual([emilia.color,emilia.energy,emilia.ap,emilia.bp,emilia.gen,emilia.traits[0],emilia.trigger],['yellow',3,1,3000,1,'王選候補者','draw']);
 assert.match(emilia.effectJa,/【ステップ】|ステップ/);
 assert.match(emilia.effectJa,/イベントカード2枚につき/);
 assert.deepEqual(emilia.faq,['Q2404','Q2405','Q2406']);

 const subaru=byId('REZ-2-039');
 assert.deepEqual([subaru.color,subaru.energy,subaru.ap,subaru.bp,subaru.gen,subaru.trigger,subaru.rarity],['green',4,2,2500,2,'color','SR']);
 assert.match(subaru.effectJa,/元々のBPが2500/);
 assert.deepEqual(subaru.faq,['Q2414','Q2415']);

 const sylphy=byId('REZ-2-041');
 assert.deepEqual(sylphy.alsoNamesJa,['シルフィ']);
 assert.match(sylphy.effectJa,/〈シルフィ〉としても扱う/);
 assert.deepEqual(sylphy.faq,['Q2416','Q2417']);

 const raid=byId('REZ-2-058');
 assert.equal(raid.raid,'エミリア');
 assert.equal(raid.trigger,'raid');
 assert.deepEqual([raid.energy,raid.bp,raid.bpMark,raid.gen], [6,4000,'+',1]);
 assert.deepEqual(raid.faq,['Q2420','Q2421','Q2422','Q2423']);

 const field=byId('REZ-2-066');
 assert.equal(field.type,'field');
 assert.deepEqual([field.color,field.energy,field.gen,field.bp],['green',3,2,null]);
 assert.equal(field.nameJa,'水門都市プリステラ');

 const spaced=byId('REZ-2-057');
 assert.match(spaced.effectJa,/〈水門都市 プリステラ〉/);
 assert.match(spaced.note,/空格/);
 assert.equal(spaced.effect.includes('水門都市プリステラ'),false);

 const reinhard=byId('REZ-2-047');
 assert.deepEqual([reinhard.energy,reinhard.bp,reinhard.gen,reinhard.trigger], [8,5000,1,'get']);
 assert.deepEqual(reinhard.faq,['Q2418']);

 assert.equal(byId('REZ-2-028').genMark,'+');
 assert.equal(byId('REZ-2-060').bpMark,'-');
 assert.equal(byId('REZ-2-014').effectJa,'-');
 assert.equal(byId('REZ-2-063').effectJa,'-');
 assert.equal(byId('REZ-2-063').effect,'無印刷角色能力。');
});

test('every regular card keeps its official source, image and non-empty Japanese body or an explicit blank',()=>{
 for(const card of REZERO_VOL2_CARDS){
  assert.equal(card.source,`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.number)}`);
  assert.match(card.image,/^https:\/\/www\.unionarena-tcg\.com\/jp\/images\/cardlist\/card\/EX17BT_REZ-2-\d{3}\.png$/);
  assert.equal(card.maxCopies,4);
  assert.ok(card.name&&card.nameJa);
  assert.equal(typeof card.effect,'string');
  assert.equal(typeof card.effectJa,'string');
  if(!['REZ-2-014','REZ-2-063'].includes(card.id))assert.ok(card.effectJa.length>0,card.id);
 }
 const withArt=REZERO_VOL2_CARDS.filter(card=>card.aliases.length);
 assert.ok(withArt.length>0);
 assert.ok(withArt.every(card=>card.aliases.every(number=>number.startsWith(card.number+'_p'))));
 assert.deepEqual(byId('REZ-2-AP01'),undefined);
 assert.equal(REZERO_VOL2_AP.find(card=>card.id==='REZ-2-AP01').aliases[0],'EX17BT/REZ-2-AP01_p1');
});

test('Vol.2 drafts reject other titles, AP cards and fifth copies, and cannot start a match',()=>{
 assert.throws(()=>normalizeRezCounts({'REZ-2-001':5}),/4/);
 assert.throws(()=>normalizeRezCounts({'EX17BT/REZ-2-AP01':1}),/卡號不存在/);
 assert.throws(()=>normalizeRezCounts({'BLC-1-001':1}),/卡號不存在/);
 const thin=rezDeckIssues({'REZ-2-014':4});
 assert.ok(thin.some(issue=>issue.includes('50')));
 assert.ok(thin.some(issue=>issue.includes('不能開始對戰')));
 const picks=REZERO_VOL2_CARDS.slice(0,13);
 const full=Object.fromEntries(picks.map((card,index)=>[card.id,index===12?2:4]));
 assert.equal(Object.values(full).reduce((sum,n)=>sum+n,0),50);
 assert.ok(rezDeckIssues(full).some(issue=>issue.includes('不能開始對戰')));
 assert.equal(rezDeckIssues(full).some(issue=>issue.includes('50')),false);
 const bleach={title:'bleach',id:'039'};
 assert.equal(validateTitleMembership({'REZ-2-001':4,'039':1},{...REZERO_VOL2_BY_ID,'039':bleach}).length,1);
});

test('Vol.2 editor keeps an independent draft and does not open a match',async()=>{
 const nodes={app:{innerHTML:'',onclick:null},toast:{textContent:'',classList:{add(){},remove(){}}}};
 const store=new Map();
 globalThis.document={querySelector:selector=>selector==='#app'?nodes.app:selector==='#toast'?nodes.toast:null,onkeydown:null};
 globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
 globalThis.window={scrollTo(){},open(){}};
 const old=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 try{
  await import('../dist/app.mjs?rezero-vol2-ui');
  const click=dataset=>nodes.app.onclick({target:{closest:()=>({dataset,disabled:false})}});
  click({view:'builder'});
  click({title:'rezero'});
  assert.match(nodes.app.innerHTML,/Re:從零開始的異世界生活 · Vol\.2/);
  assert.match(nodes.app.innerHTML,/EX17BT\/REZ-2-001/);
  assert.match(nodes.app.innerHTML,/尚未開放對戰/);
  assert.match(nodes.app.innerHTML,/帕克/);
  assert.equal(nodes.app.innerHTML.includes('data-action="start"'),false);
  click({rezCount:'REZ-2-039',delta:'1'});
  assert.equal(JSON.parse(store.get('ua-rez-draft-v1'))['REZ-2-039'],1);
  click({rezColor:'green'});
  assert.match(nodes.app.innerHTML,/EX17BT\/REZ-2-039/);
  assert.equal(nodes.app.innerHTML.includes('EX17BT/REZ-2-001'),false);
  click({title:'bleach'});
  assert.match(nodes.app.innerHTML,/編輯牌組|BLEACH 卡片圖鑑/);
  assert.equal(nodes.app.innerHTML.includes('EX17BT/REZ-2-039'),false);
 }finally{globalThis.setTimeout=old;}
});
