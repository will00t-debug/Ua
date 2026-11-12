#!/usr/bin/env node
// Reference only: at each still-live challenger decision, ask frozen
// hard-search-2 what it would do with the same 48 nodes. A different action
// is not marked wrong here.
import {readFileSync} from 'node:fs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {chooseStrengthenedHardAction,resetHardAiReport} from '../dist/universal-v2/hard-ai.mjs';
import {newComparedMatch,matchRules} from '../dist/universal-v2/ai-v3/opening.mjs';

const RULES=matchRules('official');
const decks=new Map(battleDecks().map(deck=>[deck.id,deck]));
const report=JSON.parse(readFileSync('audit/ai-v3-main-front-8401-baseline.json','utf8'));
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function label(action){
 if(!action)return 'none';
 if(action.type==='play')return 'play:'+(action.line||'');
 if(action.type==='chooseBlock')return action.uid==null?'block-pass':'block';
 return action.type;
}
function fresh(deck,seed,first){
 const packs=[deck.pack,deck.pack];
 return {packs,state:newComparedMatch(packs,[deck.counts,deck.counts],seed,first,RULES)};
}
const rows=[];
for(const [title,block] of Object.entries(report.titles)){
 const deck=decks.get(title);
 for(const game of block.byMode.tree.games){
  if(game.challengerWon)continue;
  const id=`${title}|${game.seed}|first${game.first}|seat${game.challengerSeat}`;
  const started=performance.now();
  const {packs,state}=fresh(deck,game.seed,game.first);
  let cursor=state;
  for(const choice of game.opening||[]){
   const legal=legalUniversalActions(packs,cursor);
   const action=legal.find(item=>item.type==='openingMulligan'&&item.mode===choice.mode);
   cursor=dispatchUniversalAction(packs,cursor,action,{actor:choice.actor});
  }
  let chain=0,chainTurn=-1;
  for(const step of game.actions){
   if(cursor.status!=='playing')break;
   const actor=cursor.pending?.player??cursor.active;
   const legal=legalUniversalActions(packs,cursor);
   const recorded=legal.find(item=>same(item,step.action));
   if(!recorded)throw Error('diverged '+id+' '+step.step);
   const voluntary=!cursor.pending;
   if(voluntary||cursor.turn!==chainTurn){chain++;chainTurn=cursor.turn;}
   const life=cursor.players.map(player=>player.life.length);
   if(actor===game.challengerSeat&&legal.length>1&&life[actor]>=4&&life[1-actor]>=4&&cursor.pending?.kind!=='opening-mulligan'){
    resetHardAiReport();
    const picked=chooseStrengthenedHardAction(packs,cursor,{nodes:48,ms:1e9,seed:1});
    const hardAction=legal.find(item=>same(item,picked));
    rows.push({id,deck:title,seed:game.seed,first:game.first,seat:game.challengerSeat,step:step.step,turn:cursor.turn,
     phase:cursor.phase,pending:cursor.pending?.kind||null,chain,life,
     v3:label(recorded),hard:label(hardAction),agree:same(recorded,hardAction)});
   }
   cursor=dispatchUniversalAction(packs,cursor,recorded,{actor});
  }
  console.error(id,'ms',Math.round(performance.now()-started),'rows',rows.length);
 }
}
const live=rows;
const games=list=>new Set(list.map(row=>row.id)).size;
const decksOf=list=>new Set(list.map(row=>row.deck)).size;
const chains=list=>new Set(list.map(row=>row.id+'#'+row.chain)).size;
const diff=live.filter(row=>!row.agree);
const bag=new Map();
for(const row of diff){
 const key=`${row.phase}${row.pending?'/'+row.pending:''} ${row.v3} -> ${row.hard}`;
 if(!bag.has(key))bag.set(key,[]);
 bag.get(key).push(row);
}
const summary=[...bag.entries()].map(([name,items])=>({name,decisions:items.length,chains:chains(items),games:games(items),decks:decksOf(items)}))
 .sort((a,b)=>b.games-a.games||b.chains-a.chains);
console.log(JSON.stringify({decisions:live.length,agree:live.filter(row=>row.agree).length,diff:diff.length,
 games:games(live),diffGames:games(diff),summary:summary.slice(0,25)},null,2));
