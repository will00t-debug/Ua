import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {SOLO_TRAINING_PRESET} from '../dist/solo-match.mjs';
import {matchLegalActions,startMatchForTitle,dispatchMatchAction,chooseMatchBotAction,matchRuntime} from '../dist/match-runtime.mjs';
import {BETA_AI_LEVELS,chooseBetaAiAction} from '../dist/beta-ai-policy.mjs';
import {AI_LEVEL_TEXT,betaArenaHeader,betaDifficultySelect} from '../dist/beta-match-ui.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';

const sources={
 'gurren-lagann':{deck:TTG_GREEN_BETA_PRESET,cards:TTG_BY_ID},
 'solo-leveling':{deck:SOLO_TRAINING_PRESET,cards:Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]))}
};
function firstMain(title,seed){
 const d=sources[title].deck;
 let s=startMatchForTitle(title,{decks:[d,d],first:0,seed,mode:'solo'});
 for(let n=0;n<4&&s.phase!=='main';n++){
  const action=matchLegalActions(title,s).find(a=>a.type==='next');
  if(!action)break;
  s=dispatchMatchAction(title,s,action);
 }
 return s;
}
test('shared Beta AI offers three real policies and always keeps official card legality in the native core',()=>{
 assert.deepEqual(BETA_AI_LEVELS,['easy','normal','hard']);
 for(const title of Object.keys(sources)){
  for(const difficulty of BETA_AI_LEVELS){
   const s=firstMain(title,12345);
   assert.equal(s.phase,'main');
   const before=structuredClone(s);
   const choice=chooseMatchBotAction(title,s,{difficulty});
   assert.ok(choice,title+' '+difficulty);
   const next=dispatchMatchAction(title,s,choice);
   assert.equal(matchRuntime(title).assert(next),true);
   assert.deepEqual(s,before,'AI must not mutate live match');
  }
  assert.throws(()=>chooseBetaAiAction(title,firstMain(title,6),{difficulty:'impossible'}),/Unknown AI difficulty/);
 }
});
test('hard Beta AI chooses a legal energy producer before a cheap front line character',()=>{
 for(const title of Object.keys(sources)){
  let checked=false;
  for(let seed=1;seed<=20&&!checked;seed++){
   const s=firstMain(title,seed);
   const available=matchLegalActions(title,s);
   const allowed=available.filter(x=>x.type==='play'&&x.line==='energy').filter(x=>{
    const card=s.players[0].hand.find(c=>c.uid===(x.handUid??x.uid));
    return (sources[title].cards[card?.cardId]?.gen||0)>0;
   });
   if(!allowed.length)continue;
   const hard=chooseMatchBotAction(title,s,{difficulty:'hard'});
   assert.equal(hard.type,'play',title);
   assert.equal(hard.line,'energy',title);
   assert.ok(allowed.some(a=>JSON.stringify(a)===JSON.stringify(hard)),title+' must select exact legal play');
   const next=dispatchMatchAction(title,s,hard);
   assert.equal(matchRuntime(title).assert(next),true);
   checked=true;
  }
  assert.ok(checked,title+' expected at least one opening hand with legal energy producer');
 }
});
test('shared status/AI controls escape text, keep option labels and expose mobile-friendly resources',()=>{
 const html=betaArenaHeader({title:'天元突破',turn:3,phase:'主要階段',actor:1,aiDifficulty:'hard',status:'playing',lifePlayer:4,lifeOpponent:3,energyPlayer:5,energyOpponent:2,apPlayer:2,apOpponent:1});
 assert.match(html,/betaMatchToolbar/);
 assert.match(html,/困難 · 能源規劃/);
 assert.match(html,/AI 思考中/);
 assert.match(html,/你的生命 4/);
 assert.match(html,/AI 生命 3/);
 assert.match(betaDifficultySelect('normal'),/selected/);
 assert.equal(Object.keys(AI_LEVEL_TEXT).length,3);
 assert.doesNotMatch(betaArenaHeader({title:'<script>alert(1)</script>',turn:0,phase:'',actor:0,aiDifficulty:'normal',status:'playing',lifePlayer:7,lifeOpponent:7,energyPlayer:0,energyOpponent:0,apPlayer:1,apOpponent:1}),/<script>/);
});
test('SLG and TTG have identical persisted difficulty selection and title-aware Beta banner',async()=>{
 const old={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const m=new Map([['ua-ai-difficulty-v1',JSON.stringify('hard')]]),app={innerHTML:'',onclick:null,addEventListener(){}};
 const toast={textContent:'',classList:{add(){},remove(){}}},select={value:'normal',onchange:null};
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:q==='#aiDifficultySelect'?select:null,onkeydown:null};
 globalThis.window={scrollTo(){}};
 globalThis.localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 try{
  await import('../dist/app.mjs?shared-beta-ui-'+Date.now());
  click({view:'builder'});click({title:'gurren-lagann'});
  assert.match(app.innerHTML,/Beta AI 對手設定/);
  assert.match(app.innerHTML,/困難 · 能源規劃/);
  click({action:'ttgBetaStartGreen'});
  assert.match(app.innerHTML,/天元突破 · Beta 自動對戰/);
  assert.match(app.innerHTML,/betaMatchToolbar/);
  click({view:'builder'});click({title:'solo-leveling'});
  assert.match(app.innerHTML,/Beta AI 對手設定/);
  click({action:'soloTrainingStart'});
  assert.match(app.innerHTML,/我獨自升級 · Beta 自動對戰/);
  assert.match(app.innerHTML,/betaMatchToolbar/);
  assert.ok(select.onchange,'difficulty select must be connected to UI handler');
  select.value='easy';select.onchange();
  assert.equal(JSON.parse(m.get('ua-ai-difficulty-v1')),'easy');
 }finally{Object.assign(globalThis,old);}
});
