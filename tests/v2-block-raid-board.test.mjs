import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {attackBattleTags,raidClickPlan} from '../dist/universal-v2/preview-actions.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'T'+i,
 name:i===1?'直傷衝擊':i===2?'阻擋角色':i===8?'手牌密卡':'T'+i,
 type:'character',color:'yellow',energy:0,ap:1,bp:i===1?4000:3000,gen:1,
 implementation:i===1?'dsl':'vanilla',
 ...(i===1?{printedAttackDamage:2,printedImpact:1}:{})
}));
const pack=createUniversalPack({id:'block-raid-board',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function openBlock(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:281028});
 const attacker=take(s,0,'T1');attacker.ready=true;s.players[0].front[0]=attacker;
 const blocker=take(s,1,'T2');blocker.ready=true;s.players[1].front[0]=blocker;
 const secret=take(s,0,'T8');s.players[0].hand.push(secret);
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 return {s,attacker,blocker,secret};
}

test('both viewers see the attacker, direct damage 2 and impact 1',()=>{
 const {s,attacker,secret}=openBlock();
 const mine=universalPublicView(packs,s,0),foe=universalPublicView(packs,s,1);
 assert.equal(mine.pending.kind,'block');
 assert.deepEqual(Object.keys(mine.pending).sort(),['kind','player']);
 assert.deepEqual(mine.battle,foe.battle);
 assert.deepEqual(mine.battle,{
  owner:0,uid:attacker.uid,cardId:'T1',name:'直傷衝擊',color:'yellow',
  bp:4000,damage:2,impact:1
 });
 assert.deepEqual(attackBattleTags(mine.battle),['BP 4000','直傷2','衝擊1']);
 assert.deepEqual(attackBattleTags({bp:2000,damage:1,impact:0}),['BP 2000','直傷1','無衝擊']);
 const hidden=JSON.stringify(foe);
 assert.equal(hidden.includes(JSON.stringify(secret.uid)),false);
 assert.equal(foe.players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 const skip=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid===null);
 const block=legalUniversalActions(packs,s).find(a=>a.type==='chooseBlock'&&a.uid);
 assert.ok(skip&&block);
});

test('raid starts on the base click and submits only on the entry slot',()=>{
 const legal=[
  {type:'raid',uid:'hand',baseUid:'front-base',slot:0},
  {type:'raid',uid:'hand',baseUid:'energy-base',slot:1},
  {type:'raid',uid:'hand',baseUid:'energy-base',slot:2},
  {type:'play',uid:'hand',line:'front',slot:3},
  {type:'raid',uid:'other',baseUid:'front-base',slot:0},
  {type:'raid',uid:'hand',baseUid:'energy-base',line:'energy',slot:1}
 ];
 assert.deepEqual(raidClickPlan({selectedUid:'hand',raidBaseUid:null,slotUid:'front-base',
  line:'front',slot:0,legal}),{type:'choose-base',baseUid:'front-base'});
 assert.deepEqual(raidClickPlan({selectedUid:'hand',raidBaseUid:'front-base',slotUid:'front-base',
  line:'front',slot:0,legal}),{type:'raid',actions:[legal[0]]});
 assert.deepEqual(raidClickPlan({selectedUid:'hand',raidBaseUid:'energy-base',slotUid:null,
  line:'front',slot:2,legal}),{type:'raid',actions:[legal[2]]});
 assert.deepEqual(raidClickPlan({selectedUid:'hand',raidBaseUid:'energy-base',slotUid:'front-base',
  line:'front',slot:0,legal}),{type:'choose-base',baseUid:'front-base'});
 assert.deepEqual(raidClickPlan({selectedUid:'hand',raidBaseUid:null,slotUid:null,
  line:'front',slot:3,legal}),{type:'place',actions:[legal[3]]});
 assert.equal(raidClickPlan({selectedUid:'hand',raidBaseUid:null,slotUid:null,
  line:'front',slot:1,legal}).type,'select');
});

test('the block dialog and raid board describe the two clicks',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const preview=read('dist/universal-v2-preview.mjs');
 const online=read('dist/online.mjs');
 const legacy=read('dist/universal-v2-legacy.css');
 assert.match(preview,/function attackShowcase\(/);
 assert.match(preview,/choicePicture\(battle\.cardId,battle\.name,battle\.owner\)/);
 assert.match(preview,/attackBattleTags\(battle\)/);
 assert.match(preview,/先看直傷和衝擊，再選擇阻擋或不阻擋/);
 assert.match(preview,/function blockControl\(/);
 assert.match(preview,/btn\('不阻擋'/);
 assert.match(preview,/entryClickPlan\(/);
 assert.match(preview,/plan\.type==='entry'/);
 assert.match(preview,/選擇突襲進場或普通進場/);
 assert.match(preview,/請直接點要登場的格子/);
 assert.match(preview,/boardEntryMode\(a\)/);
 assert.match(legacy,/\.slot\.raid-base/);
 assert.match(online,/view\.battle/);
 assert.match(online,/直傷2/);
 assert.match(online,/無衝擊/);
});
