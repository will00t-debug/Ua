import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040','REZ-2-056'].includes(id)),
 'REZ-2-002','REZ-2-004','REZ-2-067'
],'REZ-2-067');

function board(s){
 for(const [slot,id] of [[0,'REZ-2-004'],[1,'REZ-2-004'],[2,'REZ-2-049'],[3,'REZ-2-055']]){
  const card=take(s,0,id);card.ready=true;s.players[0].energy[slot]=card;
 }
 for(const [i,ap] of s.players[0].apCards.entries()){ap.inPlay=true;ap.ready=i<2;}
 return toPhase(rezPacks,s,'main');
}

test('REZ-2-002 becomes active on the energy line after an event, and rests to buff another character',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-002'].effectJa,
  '[登場時][エナジーLにある場合]このターン中に自分がイベントカードを使用している場合、このキャラをアクティブにする。\n[起動メイン][レストにする]自分の場の他のキャラを1枚選び、このターン中、BP+1000。');
 assert.deepEqual(rez.cards['REZ-2-002'].effects.onPlay,[{
  op:'activeSelfIf',line:'energy',when:{kind:'ownEventUsedThisTurn',turn:'own'}}]);
 assert.deepEqual(rez.cards['REZ-2-002'].mainAbility,{op:'restSelfBuffOther',bp:1000});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=board(fresh(deck,1002));
 const event=take(s,0,'REZ-2-067');s.players[0].hand.push(event);
 const playEvent=legalUniversalActions(rezPacks,s).find(a=>a.type==='event'&&a.uid===event.uid);
 s=dispatchUniversalAction(rezPacks,s,playEvent,{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseApRecovery',uid:null},{actor:0});
 const spare=s.players[0].energy[3];
 s.players[0].outside.push(spare);s.players[0].energy[3]=null;
 const frederica=take(s,0,'REZ-2-002');s.players[0].hand.push(frederica);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===frederica.uid&&a.line==='energy');
 assert.ok(play);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 const entered=s.players[0].energy.find(c=>c?.uid===frederica.uid);
 assert.equal(entered.ready,true);
 const ally=s.players[0].energy.find(c=>c&&c.uid!==frederica.uid);
 const before=universalBp(rezPacks,s,ally);
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===frederica.uid&&a.mode==='selfRestBuff');
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.choices.includes(frederica.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:frederica.uid},{actor:0}),
  /not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBuff',uid:ally.uid},{actor:0});
 assert.equal(universalBp(rezPacks,s,s.players[0].energy.find(c=>c?.uid===ally.uid)),before+1000);
 assert.equal(s.players[0].energy.find(c=>c?.uid===frederica.uid).ready,false);
 s.players[0].energy.find(c=>c?.uid===frederica.uid).ready=true;
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===frederica.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-002 stays rested without an event, and a front entry does not become active',()=>{
 let quiet=board(fresh(deck,1003));
 const card=take(quiet,0,'REZ-2-002');quiet.players[0].hand.push(card);
 const spare=quiet.players[0].energy[3];
 quiet.players[0].outside.push(spare);quiet.players[0].energy[3]=null;
 const play=legalUniversalActions(rezPacks,quiet).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy');
 quiet=dispatchUniversalAction(rezPacks,quiet,play,{actor:0});
 assert.equal(quiet.players[0].energy.find(c=>c?.uid===card.uid).ready,false);
 let front=board(fresh(deck,1004));
 const event=take(front,0,'REZ-2-067');front.players[0].hand.push(event);
 front=dispatchUniversalAction(rezPacks,front,legalUniversalActions(rezPacks,front)
  .find(a=>a.type==='event'&&a.uid===event.uid),{actor:0});
 front=dispatchUniversalAction(rezPacks,front,{type:'chooseApRecovery',uid:null},{actor:0});
 const other=take(front,0,'REZ-2-002');front.players[0].hand.push(other);
 const toFront=legalUniversalActions(rezPacks,front).find(a=>a.type==='play'&&a.uid===other.uid&&a.line==='front');
 front=dispatchUniversalAction(rezPacks,front,toFront,{actor:0});
 assert.equal(front.players[0].front.find(c=>c?.uid===other.uid).ready,false);
 assert.equal(assertUniversalMatch(rezPacks,quiet),true);
 assert.equal(assertUniversalMatch(rezPacks,front),true);
});
