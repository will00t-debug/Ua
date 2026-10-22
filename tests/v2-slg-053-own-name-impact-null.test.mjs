import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {SLG_V2_VERIFIED_IDS,createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
const slg=registeredV2TitlePack('solo-leveling'),packs=[slg,slg],id='SLG-1-053';
const ids=['005','006','015','026','032','041','043','045','052','053','055','066','068'];
const deck=Object.fromEntries(ids.map(n=>['SLG-1-'+n,4]));deck['SLG-1-068']=2;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){let list=s.players[p][z],i=list.findIndex(c=>c.cardId===id);if(i>=0)return list.splice(i,1)[0]}throw Error('Missing physical '+id)}
function scene({actor=0,ownName='front',opponentName=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:5300+actor,first:actor});
 const source=take(s,actor,id);s.players[actor].hand.push(source);
 for(let k=0;k<3;k++){const e=take(s,actor,'SLG-1-043');e.ready=true;s.players[actor].energy[k]=e;}
 if(ownName==='energy'||ownName==='front'){
  const x=take(s,actor,'SLG-1-015');x.ready=true;s.players[actor][ownName][ownName==='front'?1:3]=x;
 }
 if(opponentName){let c=take(s,1-actor,'SLG-1-015');c.ready=true;s.players[1-actor].front[0]=c;}
 for(let k=0;k<5&&s.phase!=='main';k++){let x=legalUniversalActions(packs,s).find(a=>a.type==='next');assert.ok(x);s=dispatchUniversalAction(packs,s,x);}
 assert.equal(s.phase,'main');
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action,'play requires correct green ENERGY/AP');
 return {s,source,action,actor};
}
test('SLG053 original full two-clause print is source-pinned; own-name gate + independent impact-null and DRAW Life',()=>{
 const original=SOLO_LEVELING_CARDS.find(x=>x.id===id),card=slg.cards[id];
 assert.equal(original.number,'UA51BT/SLG-1-053');
 assert.equal(original.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-053');
 assert.equal(original.nameJa,'諸菱 賢太');
 assert.equal(original.effect,'Impact無效。登場時若場上有己方水篠旬，抽1張。');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type,card.impactNull],
  ['諸菱 賢太','green',3,1,2000,2,'draw','character',true]);
 assert.deepEqual(card.effects.onPlay,slg.cards['SLG-1-012'].effects.onPlay);
 assert.deepEqual(card.effects.onPlay,[{op:'drawIfOwnName',name:'水篠 旬',count:1}]);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.equal(SLG_V2_VERIFIED_IDS.filter(x=>x===id).length,1);
 assert.deepEqual(createSlgV2Pack().cards[id],card);
 assert.deepEqual(validateUniversalDeck(slg,deck),[]);
});
for(const actor of [0,1]){
 for(const ownName of ['front','energy']){
  test('SLG053 P'+actor+' draws exactly one with OWN 水篠旬 in '+ownName+' only',()=>{
   const {s,action,source}=scene({actor,ownName}),oldDeck=s.players[actor].deck.map(x=>x.uid);
   const oldAp=s.players[actor].apCards.filter(x=>x.ready&&x.inPlay).length,hand=s.players[actor].hand.length;
   assert.throws(()=>dispatchUniversalAction(packs,s,action,{actor:1-actor}),/Wrong player/);
   let next=dispatchUniversalAction(packs,s,action,{actor});
   assert.equal(next.players[actor].front[0].uid,source.uid);
   assert.equal(next.players[actor].deck.length,oldDeck.length-1);
   assert.equal(next.players[actor].hand.length,hand,'play one then draw one');
   assert.equal(next.players[actor].hand.at(-1).uid,oldDeck[0]);
   assert.equal(next.players[actor].apCards.filter(x=>x.ready&&x.inPlay).length,oldAp-1);
   assert.equal(universalPublicView(packs,next,1-actor).players[actor].hand,null);
   assert.equal(assertUniversalMatch(packs,next),true);
  });
 }
}
test('SLG053 opponent-only field and OWN hand/outside name never trigger draw',()=>{
 let {s,action,actor}=scene({ownName:'none',opponentName:true});
 s.players[actor].hand.push(take(s,actor,'SLG-1-015'));
 s.players[actor].outside.push(take(s,actor,'SLG-1-015'));
 const before=s.players[actor].deck.map(x=>x.uid),n=s.players[actor].hand.length;
 const after=dispatchUniversalAction(packs,s,action,{actor});
 assert.deepEqual(after.players[actor].deck.map(x=>x.uid),before);
 assert.equal(after.players[actor].hand.length,n-1);
 assert.equal(assertUniversalMatch(packs,after),true);
});
test('SLG053 insufficient green energy or spent AP rejects original play and does not generate phantom DRAW',()=>{
 const {s,action,actor}=scene({ownName:'energy'});
 for(const what of ['energy','ap']){
  const q=structuredClone(s);
  if(what==='energy'){q.players[actor].hand.push(q.players[actor].energy[1]);q.players[actor].energy[1]=null;}
  else for(const a of q.players[actor].apCards)a.ready=false;
  assert.ok(!legalUniversalActions(packs,q).some(a=>a.type==='play'&&a.uid===action.uid));
  assert.throws(()=>dispatchUniversalAction(packs,q,action,{actor}),/not currently legal/);
  assert.equal(assertUniversalMatch(packs,q),true);
 }
});
