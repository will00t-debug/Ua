import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {publicLifeTriggerText} from '../dist/universal-v2/preview-actions.mjs';
import {publicPreviewActionLabel} from '../dist/universal-v2/preview-replay.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'T'+i,name:i===3?'公開抽牌':i===8?'手牌密卡':i===9?'未翻生命':'T'+i,
 type:'character',color:'yellow',energy:0,ap:1,bp:2000,gen:1,implementation:'vanilla',
 ...(i===3?{trigger:'draw'}:{})
}));
const pack=createUniversalPack({id:'public-trigger-reveal',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function revealDraw(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:281028});
 const attacker=take(s,0,'T1');attacker.ready=true;s.players[0].front[0]=attacker;
 const shown=take(s,1,'T3'),hidden=take(s,1,'T9'),secret=take(s,1,'T8');
 const pl=s.players[1];
 pl.deck.push(...pl.life.splice(0));
 pl.life.push(shown,hidden);
 pl.hand.push(secret);
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 return {s,shown,hidden,secret};
}

test('a revealed trigger is identical for both viewers and hides the rest of life',()=>{
 const {s,shown,hidden,secret}=revealDraw();
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,shown.uid);
 const mine=universalPublicView(packs,s,0),foe=universalPublicView(packs,s,1);
 assert.deepEqual(mine.openTriggers,foe.openTriggers);
 assert.deepEqual(mine.openTriggers,[{
  owner:1,uid:shown.uid,cardId:'T3',name:'公開抽牌',color:'yellow',trigger:'draw',checking:true
 }]);
 const published=JSON.stringify(mine);
 assert.equal(published.includes(JSON.stringify(hidden.uid)),false);
 assert.equal(published.includes(JSON.stringify(secret.uid)),false);
 assert.equal(mine.players[1].lifeCount,1);
 assert.equal(mine.players[1].hand,null);
 assert.equal(foe.players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('the public log names the trigger card for the opponent and not a hidden hand card',()=>{
 const {s,shown,secret}=revealDraw();
 const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.ok(action);
 const after=dispatchUniversalAction(packs,s,action,{actor:1});
 const line=publicPreviewActionLabel(packs,s,after,action,1);
 assert.equal(line,'電腦：觸發 公開抽牌 · 抽 1 張');
 assert.equal(line.includes(secret.cardId),false);
 assert.equal(line.includes('手牌密卡'),false);
 assert.equal(line.includes(shown.uid),false);
 assert.equal(publicLifeTriggerText(packs,s,after,{type:'chooseDeckSearch',uid:secret.uid}),'');
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('COLOR trigger names only the card that became public, not the other hand card',()=>{
 const before={
  pending:{kind:'life-trigger',player:1,uid:'1-4'},
  players:[
   {front:[],energy:[],outside:[],lifeRevealed:[]},
   {front:[],energy:[],outside:[{uid:'1-4',cardId:'T4'}],lifeRevealed:[],
    hand:[{uid:'1-8',cardId:'T8'},{uid:'1-1',cardId:'T1'}]}
  ]
 };
 const after={
  players:[
   {front:[],energy:[],outside:[],lifeRevealed:[]},
   {front:[{uid:'1-1',cardId:'T1'}],energy:[],outside:[{uid:'1-4',cardId:'T4'}],lifeRevealed:[]}
  ]
 };
 const text=publicLifeTriggerText(packs,before,after,{type:'chooseTrigger',mode:'color',uid:'1-1',line:'front',slot:0});
 assert.equal(text,'觸發 T4 · COLOR 登場 T1');
 assert.equal(text.includes('手牌密卡'),false);
 const hidden=publicLifeTriggerText(packs,before,before,{type:'chooseTrigger',mode:'color',uid:'1-8',line:'front',slot:1});
 assert.equal(hidden,'觸發 T4 · COLOR 登場');
 assert.equal(hidden.includes('手牌密卡'),false);
});

test('solo and online surfaces tell the opponent about an open trigger',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const preview=read('dist/universal-v2-preview.mjs');
 const online=read('dist/online.mjs');
 const domain=read('server/domain.mjs');
 assert.match(preview,/function triggerBoard\(/);
 assert.match(preview,/choicePicture\(card\.cardId,card\.name,card\.owner\)/);
 assert.match(online,/view\.openTriggers/);
 assert.match(online,/對手正在確認已公開的觸發/);
 assert.match(domain,/publicLifeTriggerText\(packs,before,after,action\)/);
 assert.match(domain,/publicActionText\(actorName,action,hadPending,live\.packs,live\.match,next\)/);
});
