import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),
 'REZ-2-044'
],'REZ-2-049');

function play(seed,withOtto){
 let s=fresh(deck,seed);
 const ricard=take(s,0,'REZ-2-049');ricard.ready=true;s.players[0].energy[0]=ricard;
 const emilia=take(s,0,'REZ-2-055');emilia.ready=true;s.players[0].energy[1]=emilia;
 if(withOtto){
  const otto=take(s,0,'REZ-2-033');otto.ready=true;otto.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[0]=otto;
 }
 s=toPhase(rezPacks,s,'main');
 const julius=take(s,0,'REZ-2-044');s.players[0].hand.push(julius);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===julius.uid&&a.line==='front'),{actor:0});
 return {s,julius};
}

test('REZ-2-044 chooses attack-draw or BP+500 once four green names are present',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-044'].effectJa,/異なるカード名の緑のキャラが4種類以上/);
 assert.equal(rez.cards['REZ-2-044'].mainAbility.op,'onceChooseProgram');
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const short=play(2044,false);
 assert.equal(legalUniversalActions(rezPacks,short.s).some(a=>a.type==='activate'&&a.uid===short.julius.uid),false);
 let {s,julius}=play(2045,true);
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===julius.uid&&a.mode==='onceChoose');
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['attackDraw','buff']);
 const buffed=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseEffectMode',mode:'buff'},{actor:0});
 assert.equal(buffed.pending,null);
 assert.equal(universalBp(rezPacks,buffed,buffed.players[0].front.find(c=>c.uid===julius.uid)),4000);
 assert.equal(legalUniversalActions(rezPacks,buffed).some(a=>a.type==='activate'&&a.uid===julius.uid),false);
 const top=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'attackDraw'},{actor:0});
 assert.equal(s.pending,null);
 s.players[0].front.find(c=>c.uid===julius.uid).ready=true;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:julius.uid},{actor:0});
 assert.equal(s.pending.kind,'block');
 assert.ok(s.players[0].hand.some(c=>c.uid===top));
 assert.equal(assertUniversalMatch(rezPacks,short.s),true);
 assert.equal(assertUniversalMatch(rezPacks,buffed),true);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
