import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-042'),'REZ-2-061'],'REZ-2-061');

test('REZ-2-061 buffs one character whose printed BP is 2500',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-061'].effectJa,
  '[登場時]自分の場の元々のBPが2500のキャラを1枚まで選び、このターン中、BP+1500。');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-061'].bp,2500);
 assert.deepEqual(rez.cards['REZ-2-061'].effects.onPlay,[{
  op:'buffOwnField',filter:{field:'bp',value:2500},bp:1500,optional:true,excludeSelf:false}]);
 assert.deepEqual(expandAbilityTemplates({onPlay:[{template:'buffOwnPrintedBp',printedBp:2500,
  bp:1500,optional:true,excludeSelf:false}]}).onPlay,rez.cards['REZ-2-061'].effects.onPlay);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'X',name:'フェルト',color:'green',type:'character',energy:3,ap:1,bp:2500,gen:2,
  implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'printed',cards:[{...body,effects:{onPlay:[{
  op:'buffOwnField',filter:{field:'bp',value:'2500'},bp:1500,optional:true,excludeSelf:false}]}}]}),
  /own-field BP/);
 assert.throws(()=>expandAbilityTemplates({onPlay:[{template:'buffOwnPrintedBp',printedBp:100,
  bp:1500,optional:true,excludeSelf:false}]}),/invalid/);
});

test('current BP does not create a printed-2500 target, and the choice includes Felt',()=>{
 let s=fresh(deck,1061);
 s=toPhase(rezPacks,s,'main');
 const payer=take(s,0,'REZ-2-049');payer.ready=true;s.players[0].energy[0]=payer;
 const small=take(s,0,'REZ-2-055');small.ready=true;s.players[0].energy[1]=small;
 const ally=take(s,0,'REZ-2-056');ally.ready=true;s.players[0].front[0]=ally;
 const raised=take(s,0,'REZ-2-043');raised.ready=true;raised.buffs=[{bp:500,untilTurn:s.turn}];
 s.players[0].front[1]=raised;
 const foe=take(s,1,'REZ-2-041');foe.ready=true;s.players[1].front[0]=foe;
 const felt=take(s,0,'REZ-2-061');s.players[0].hand.push(felt);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===felt.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.equal(s.pending.filter.field,'bp');
 assert.equal(s.pending.filter.value,2500);
 const choices=s.pending.choices;
 assert.ok(choices.includes(felt.uid));
 assert.ok(choices.includes(ally.uid));
 assert.equal(choices.includes(payer.uid),false);
 assert.equal(choices.includes(small.uid),false);
 assert.equal(choices.includes(raised.uid),false);
 assert.equal(choices.includes(foe.uid),false);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,skipped,skipped.players[0].front.find(c=>c?.uid===ally.uid)),2500);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:raised.uid},{actor:0}),
  /not currently legal|Illegal own field/);
 const buffed=dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:ally.uid},{actor:0});
 assert.equal(buffed.pending,null);
 assert.equal(universalBp(rezPacks,buffed,buffed.players[0].front.find(c=>c?.uid===ally.uid)),4000);
 assert.equal(universalBp(rezPacks,buffed,buffed.players[0].front.find(c=>c?.uid===felt.uid)),2500);
 const self=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseOwnBuff',uid:felt.uid},{actor:0});
 assert.equal(universalBp(rezPacks,self,self.players[0].front.find(c=>c?.uid===felt.uid)),4000);
 assert.equal(universalBp(rezPacks,self,self.players[0].front.find(c=>c?.uid===ally.uid)),2500);
 assert.equal(assertUniversalMatch(rezPacks,buffed),true);
 assert.equal(assertUniversalMatch(rezPacks,self),true);
});
