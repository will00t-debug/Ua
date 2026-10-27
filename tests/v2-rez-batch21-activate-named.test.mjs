import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-036'],'REZ-2-036');

test('REZ-2-036 on the front activates one Liliana once per turn',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-036'].effectJa,
  '[起動メイン][フロントLにある場合] [ターン1]自分の場の〈リリアナ・マスカレード〉を1枚選び、アクティブにする。');
 assert.deepEqual(rez.cards['REZ-2-036'].mainAbility,{
  op:'frontOnceActiveNamed',frontOnly:true,oncePerTurn:true,name:'リリアナ・マスカレード'});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 assert.throws(()=>createUniversalPack({id:'named',cards:[{
  id:'X',name:'キリタカ・ミューズ',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{},mainAbility:{op:'frontOnceActiveNamed',oncePerTurn:true,name:'リリアナ・マスカレード'}
 }]}),/unsupported main action/);
 let s=fresh(deck,1036);
 const source=take(s,0,'REZ-2-036');source.ready=false;s.players[0].front[0]=source;
 const first=take(s,0,'REZ-2-050');first.ready=false;s.players[0].energy[0]=first;
 const second=take(s,0,'REZ-2-050');second.ready=true;s.players[0].front[1]=second;
 const other=take(s,0,'REZ-2-014');other.ready=false;s.players[0].energy[1]=other;
 const foe=take(s,1,'REZ-2-050');foe.ready=false;s.players[1].front[0]=foe;
 s=toPhase(rezPacks,s,'main');
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='activeNamed');
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending.kind,'main-active-named');
 assert.deepEqual(s.pending.choices.sort(),[first.uid,second.uid].sort());
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseActiveNamed',uid:other.uid},{actor:0}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseActiveNamed',uid:foe.uid},{actor:0}),
  /not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseActiveNamed',uid:first.uid},{actor:0});
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 const moved=s.players[0].front[0];s.players[0].front[0]=null;s.players[0].energy[2]=moved;
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
