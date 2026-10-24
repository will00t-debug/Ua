import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const ids=['001','002','003','010','012','013','015','017','018','019','020','022','027'];
const mstDeck=Object.fromEntries(ids.map(x=>['MST-1-'+x,4]));
mstDeck['MST-1-027']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(x=>['SLG-1-'+x,4]));
slgDeck['SLG-1-041']=2;
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing physical card '+id);
}
function put(s,p,id,line,slot){
 assert.equal(s.players[p][line][slot],null);
 const c=take(s,p,id);c.ready=true;s.players[p][line][slot]=c;
 return c;
}
function phase(packs,s,wanted){
 for(let i=0;i<5&&s.phase!==wanted;i++){
  const a=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(a);s=dispatchUniversalAction(packs,s,a);
 }
 assert.equal(s.phase,wanted);return s;
}
test('MST013 immutable official printed onRetire DRAW matches previously verified SLG007 shared operation',()=>{
 const source=MST_V2_OFFICIAL_BY_ID['MST-1-013'];
 const card=mst.cards['MST-1-013'];
 assert.equal(source.effectJa,'〖退場時〗 カードを1枚引く。');
 assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-013');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.type,card.traits,card.trigger],
  ['シルフィエット','blue',1,1,2000,1,'character',[],null]);
 assert.deepEqual(card.effects.onRetire,[{op:'draw',count:1}]);
 assert.deepEqual(card.effects.onRetire,slg.cards['SLG-1-007'].effects.onRetire);
 assert.ok(Object.isFrozen(card.effects.onRetire));
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
test('actual SLG vs MST blocked attack truly RETIRES MST013: exactly one card drawn by owner',()=>{
 const packs=[slg,mst];let s=newUniversalMatch(packs,{decks:[slgDeck,mstDeck],first:0,seed:1313});
 const a=put(s,0,'SLG-1-010','front',0),d=put(s,1,'MST-1-013','front',0);
 s=phase(packs,s,'attack');
 const beforeHand=s.players[1].hand.length,beforeDeck=s.players[1].deck.length,
  enemyDeck=s.players[0].deck.length;
 const attack=legalUniversalActions(packs,s).find(x=>x.type==='attack'&&x.uid===a.uid);
 assert.ok(attack);s=dispatchUniversalAction(packs,s,attack,{actor:0});
 assert.equal(s.pending?.kind,'block');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:'fake'},{actor:1}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:d.uid},{actor:1});
 assert.ok(s.players[1].outside.some(x=>x.uid===d.uid));
 assert.equal(s.players[1].hand.length,beforeHand+1);
 assert.equal(s.players[1].deck.length,beforeDeck-1);
 assert.equal(s.players[0].deck.length,enemyDeck);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('own bounce of MST013 does NOT retire and does not draw',()=>{
 const packs=[mst,mst];let s=newUniversalMatch(packs,{decks:[mstDeck,mstDeck],first:0,seed:1314});
 const target=put(s,0,'MST-1-013','front',0);
 put(s,0,'MST-1-001','energy',0);
 const bouncer=take(s,0,'MST-1-019');s.players[0].hand.push(bouncer);
 s=phase(packs,s,'main');
 const deckBefore=s.players[0].deck.length;
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===bouncer.uid&&x.line==='front');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-bounce-own');
 const legal=legalUniversalActions(packs,s).find(x=>x.type==='chooseOwnBounce'&&x.uid===target.uid);
 assert.ok(legal);s=dispatchUniversalAction(packs,s,legal);
 assert.ok(s.players[0].hand.some(x=>x.uid===target.uid));
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('full ENERGY line replacement moves MST013 to REMOVED, not retired OUTSIDE',()=>{
 const packs=[mst,mst];let s=newUniversalMatch(packs,{decks:[mstDeck,mstDeck],first:0,seed:1315});
 const target=put(s,0,'MST-1-013','energy',0);
 for(let i=1;i<4;i++)put(s,0,'MST-1-001','energy',i);
 const incoming=take(s,0,'MST-1-002');s.players[0].hand.push(incoming);
 s=phase(packs,s,'main');
 const deckBefore=s.players[0].deck.length;
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===incoming.uid&&
  x.line==='energy'&&x.slot===0&&x.replaceUid===target.uid);
 assert.ok(play);s=dispatchUniversalAction(packs,s,play);
 assert.ok(s.players[0].removed.some(x=>x.uid===target.uid));
 assert.ok(!s.players[0].outside.some(x=>x.uid===target.uid));
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(assertUniversalMatch(packs,s),true);
});
