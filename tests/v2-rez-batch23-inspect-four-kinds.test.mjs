import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-064'],'REZ-2-055');

function play(ids){
 let s=fresh(deck,1064);
 for(const [slot,id] of ids.entries()){
  const card=take(s,0,id);card.ready=true;
  (slot===0?s.players[0].energy:s.players[0].front)[slot===0?0:slot-1]=card;
 }
 const card=take(s,0,'REZ-2-064');s.players[0].hand.push(card);
 s=toPhase(rezPacks,s,'main');
 const tops=s.players[0].deck.slice(0,4).map(c=>c.uid);
 const action=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 return {s:dispatchUniversalAction(rezPacks,s,action,{actor:0}),tops,card};
}

test('REZ-2-064 inspects two, or four when four green printed names are present',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-064'].effectJa,
  '[登場時]自分の山札の上から『2枚』見て、1枚まで場外に置く。残りを望む順で山札の上に置く。自分の場に異なるカード名の緑のキャラが4種類以上ある場合、『4枚』に代わる。');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-064'].triggerTextJa,
  '[カラー]自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。');
 assert.deepEqual(rez.cards['REZ-2-064'].triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
 assert.deepEqual(rez.cards['REZ-2-064'].effects.onPlay,[{
  op:'inspectTopArrange',count:2,toOutside:true,rest:'top',
  whenDistinct:{color:'green',min:4,count:4}}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 assert.throws(()=>createUniversalPack({id:'top',cards:[{
  id:'X',name:'プリシラ・バーリエル',color:'green',type:'character',energy:0,ap:1,bp:1500,gen:1,
  implementation:'dsl',effects:{onPlay:[{op:'inspectTopArrange',count:2,toOutside:true,rest:'top',
   whenDistinct:{color:'green',min:4,count:2}}]}
 }]}),/top inspect/);
 const small=play(['REZ-2-033','REZ-2-041']);
 assert.deepEqual(small.s.pending.uids,small.tops.slice(0,2));
 const wide=play(['REZ-2-033','REZ-2-041','REZ-2-043']);
 assert.equal(wide.s.pending.kind,'effect-top-inspect');
 assert.deepEqual(wide.s.pending.uids,wide.tops);
 assert.equal(universalPublicView(rezPacks,wide.s,1).pending.uids,undefined);
 const alias=play(['REZ-2-033','REZ-2-041','REZ-2-041']);
 assert.deepEqual(alias.s.pending.uids,alias.tops.slice(0,2));
 const blue=play(['REZ-2-033','REZ-2-041','REZ-2-014']);
 assert.deepEqual(blue.s.pending.uids,blue.tops.slice(0,2));
 let ordered=dispatchUniversalAction(rezPacks,wide.s,{type:'chooseInspectedOutside',uid:wide.tops[0]},{actor:0});
 for(const uid of [wide.tops[3],wide.tops[2],wide.tops[1]])
  ordered=dispatchUniversalAction(rezPacks,ordered,{type:'chooseTopOrder',uid},{actor:0});
 assert.equal(ordered.pending,null);
 assert.deepEqual(ordered.players[0].deck.slice(0,3).map(c=>c.uid),[wide.tops[3],wide.tops[2],wide.tops[1]]);
 assert.ok(ordered.players[0].outside.some(c=>c.uid===wide.tops[0]));
 assert.equal(assertUniversalMatch(rezPacks,ordered),true);
});

test('REZ-2-064 color life plays one green character of energy 2 or less active',()=>{
 let s=fresh(deck,1065);
 const attacker=take(s,0,'REZ-2-046');attacker.ready=true;s.players[0].front[0]=attacker;
 const trigger=take(s,1,'REZ-2-064');
 s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(trigger);
 const legal=take(s,1,'REZ-2-035');s.players[1].hand.push(legal);
 const costly=take(s,1,'REZ-2-046');s.players[1].hand.push(costly);
 const blue=take(s,1,'REZ-2-014');s.players[1].hand.push(blue);
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 const options=legalUniversalActions(rezPacks,s);
 assert.equal(options.some(a=>a.mode==='color'&&a.uid===legal.uid),true);
 assert.equal(options.some(a=>a.uid===costly.uid||a.uid===blue.uid),false);
 const choice=options.find(a=>a.mode==='color'&&a.uid===legal.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,choice,{actor:1});
 const entered=s.players[1].front.find(c=>c?.uid===legal.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.players[1].hand.some(c=>c.uid===legal.uid),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
