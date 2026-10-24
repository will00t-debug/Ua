import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official page checked 2026-10-22. UA15BT/SAO-1-079 has no FAQ block.
// Generated energy alt is 緑, gen 1. On true retirement, choose up to one
// own character on either line and give it BP+1000 this turn. Q2220: silence
// before the retirement removes the printed leave text.

const sao=registeredV2TitlePack('sword-art-online');
const packs=[sao,sao];

function deck(){
 const required=['SAO-1-079','SAO-1-017','SAO-1-007'];
 const rest=Object.values(sao.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,10)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
const counts=deck();
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;s.players[p][line][slot]=c;return c;
}
function toAttack(seed){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
 for(let n=0;n<6&&s.phase!=='attack';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'attack');
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function aiLegal(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('SAO-1-079 uses an optional retirement buff and rejects a mandatory one',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-079');
 assert.equal(source.effectJa,'【退場時】自分の場のキャラを1枚まで選び、このターン中、BP+1000。');
 assert.equal(source.gen,1);
 assert.equal(source.trigger,null);
 assert.equal(source.bp,3000);
 assert.deepEqual(source.traits,['ALO']);
 const card=sao.cards['SAO-1-079'];
 assert.equal(card.name,'ユウキ');
 assert.equal(card.energy,2);
 assert.equal(card.gen,1);
 assert.deepEqual(card.effects,{onRetire:[{op:'buffOwnField',filter:{field:'type',value:'character'},
  bp:1000,optional:true,excludeSelf:true}]});
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-1-079'));
 const base={id:'LAB',name:'Lab',color:'green',type:'character',energy:0,ap:1,
  bp:1000,gen:1,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-retire',cards:[{...base,effects:{
  onRetire:[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:false,excludeSelf:true}]}}]}),/retirement BP choice must be optional/);
});

test('losing a block may buff another own character on either line, or be skipped',()=>{
 let s=toAttack(1079);
 const striker=place(s,0,'SAO-1-017','front',0,true);
 const yuuki=place(s,1,'SAO-1-079','front',0,true);
 const ally=place(s,1,'SAO-1-007','energy',0,false);
 const before=universalBp(packs,s,ally);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:striker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:yuuki.uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===yuuki.uid));
 assert.equal(s.pending?.kind,'effect-buff-own');
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null));
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid));
 assert.equal(choices.some(a=>a.uid===yuuki.uid),false);
 aiLegal(s);
 const skipped=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:null},{actor:1});
 assert.equal(universalBp(packs,skipped,skipped.players[1].energy[0]),before);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid},{actor:1});
 assert.equal(universalBp(packs,s,s.players[1].energy[0]),before+1000);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:striker.uid,
  targetUid:s.players[1].energy[0].uid,sourceLinked:false,until:{player:1,phase:'main',edge:'end'}});
 assert.equal(universalBp(packs,s,s.players[1].energy[0]),before+1000);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('a lone retiring character opens no choice, and earlier silence removes the text',()=>{
 let alone=toAttack(1080);
 const striker=place(alone,0,'SAO-1-017','front',0,true);
 const only=place(alone,1,'SAO-1-079','front',0,true);
 alone=dispatchUniversalAction(packs,alone,{type:'attack',uid:striker.uid});
 alone=dispatchUniversalAction(packs,alone,{type:'chooseBlock',uid:only.uid},{actor:1});
 assert.equal(alone.pending,null);
 assert.ok(alone.players[1].outside.some(c=>c.uid===only.uid));
 assert.equal(countCards(alone.players[1]),50);
 assert.equal(assertUniversalMatch(packs,alone),true);

 let quiet=toAttack(1081);
 const attacker=place(quiet,0,'SAO-1-017','front',0,true);
 const silenced=place(quiet,1,'SAO-1-079','front',0,true);
 const mate=place(quiet,1,'SAO-1-007','front',1,false);
 const mateBp=universalBp(packs,quiet,mate);
 grantContinuousState(quiet,{kind:'originalEffectsDisabled',controller:0,sourceUid:attacker.uid,
  targetUid:silenced.uid,sourceLinked:false,until:{player:1,phase:'main',edge:'end'}});
 quiet=dispatchUniversalAction(packs,quiet,{type:'attack',uid:attacker.uid});
 quiet=dispatchUniversalAction(packs,quiet,{type:'chooseBlock',uid:silenced.uid},{actor:1});
 assert.equal(quiet.pending,null);
 assert.equal(universalBp(packs,quiet,quiet.players[1].front[1]),mateBp);
 assert.equal(countCards(quiet.players[1]),50);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});
