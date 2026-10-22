import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID,MST_V2_OFFICIAL_LIMITS} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {verifiedMstV2Entries} from '../dist/universal-v2/mst-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {compileV2TitleContribution} from '../dist/universal-v2/title-packs/contract.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const mst=registeredV2TitlePack('mushoku-tensei'),id='MST-1-051';
const ids=['001','002','003','010','012','013','015','017','019','020','022','050'];
const counts=Object.fromEntries(ids.map(s=>['MST-1-'+s,4]));
counts[id]=1;counts['MST-1-027']=1;
function take(s,p,id){for(const zone of ['hand','deck','life','outside']){const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);if(i>=0)return arr.splice(i,1)[0]}throw Error('No printed physical '+id)}
function main(pack,s){for(let i=0;i<5&&s.phase!=='main';i++){const a=legalUniversalActions(pack,s).find(x=>x.type==='next');assert.ok(a);s=dispatchUniversalAction(pack,s,a)}assert.equal(s.phase,'main');return s}
test('MST051 official Japanese FULL text, DRAW Life and Oct-01 one-copy restriction source-locked',()=>{
 const origin=MST_V2_OFFICIAL_BY_ID[id],card=mst.cards[id],limit=MST_V2_OFFICIAL_LIMITS[id];
 assert.equal(origin.number,'UA54BT/MST-1-051');
 assert.equal(origin.nameJa,'ロキシー');
 assert.equal(origin.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-051');
 assert.equal(origin.effectJa,'〖登場時〗 カードを1枚引き、自分の手札を1枚場外に置く。');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.type,card.traits,card.trigger],
  ['ロキシー','green',3,1,3000,2,'character',[],'draw']);
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.ok(Object.isFrozen(card.effects.onPlay));
 assert.equal(origin.deckLimit,1);
 assert.equal(limit.maxCopies,1);
 assert.equal(limit.effectiveFrom,'2026-10-01');
 assert.equal(origin.deckLimitSource,'https://www.unionarena-tcg.com/jp/rules/limited.php');
 assert.equal(card.maxCopies,1);
 assert.equal(mst.cards['MST-1-050'].maxCopies,4,'other cards preserve normal 4-copy cap');
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),50);
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
});
test('native V2 deck validator applies a source-verified one-copy cap, not merely four-copy check',()=>{
 const illegal={...counts,[id]:2,'MST-1-001':3};
 const errors=validateUniversalDeck(mst,illegal);
 assert.ok(errors.some(e=>e===id+' exceeds 0–1 copies'));
 assert.ok(!errors.some(e=>e.includes('50 cards')),'50 physical cards exactly; failure is copy cap');
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 assert.match(validateUniversalDeck(mst,{...counts,[id]:5}).join(';'),/0–4 copies/);
 const source=verifiedMstV2Entries().find(x=>x.id===id);assert.ok(source);
 assert.ok(source.evidence.testFiles.includes('tests/v2-mst-051-limited-draw-discard.test.mjs'));
 const tampered=structuredClone(source);tampered.definition.maxCopies=2;
 assert.throws(()=>compileV2TitleContribution({title:'mushoku-tensei',
  version:'bad-fingerprint',entries:[tampered]}),/official deck copy cap changed/);
});
test('generic maxCopies schema rejects 0/5/fraction, preserves normal 4 and never treats unregistered card as legal',()=>{
 const c={id:'SYN',name:'Synthetic',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla',effects:{}};
 for(const invalid of [0,5,1.5,null,-1])
  assert.throws(()=>createUniversalPack({id:'copy-cap-test',cards:[{...c,maxCopies:invalid}]}),/invalid deck copy cap/);
 const vanilla=createUniversalPack({id:'copy-cap-test',cards:[c]});
 assert.equal(vanilla.cards.SYN.maxCopies,4);
 const one=createUniversalPack({id:'copy-cap-test',cards:[{...c,maxCopies:1}]});
 assert.equal(one.cards.SYN.maxCopies,1);
 assert.match(validateUniversalDeck(one,{SYN:2}).join(';'),/0–1 copies/);
 assert.match(validateUniversalDeck(one,{'FAKE-1-001':1}).join(';'),/Unregistered/);
});
test('actual AP-paid MST051 entry draws one OWN top card and forces physical hand discard BEFORE resolve',()=>{
 const packs=[mst,mst];let s=newUniversalMatch(packs,{decks:[counts,counts],seed:51051,first:0});
 const source=take(s,0,id);s.players[0].hand.push(source);
 for(let i=0;i<3;i++){const energy=take(s,0,'MST-1-050');energy.ready=true;s.players[0].energy[i]=energy}
 s=main(packs,s);
 const oldDeck=s.players[0].deck.length,oldAp=s.players[0].apCards.filter(c=>c.ready).length,
   enemyDeck=s.players[1].deck.length,oldHand=s.players[0].hand.length;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(act,'three green sources satisfy printed 3 green ENERGY');
 const old=structuredClone(s);s=dispatchUniversalAction(packs,s,act,{actor:0});
 assert.equal(old.players[0].hand.length,oldHand,'reducer must not mutate original');
 assert.equal(s.players[0].front[0].uid,source.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,oldAp-1);
 assert.equal(s.players[0].deck.length,oldDeck-1);
 assert.equal(s.players[1].deck.length,enemyDeck);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'0-fabricated'},{actor:0}),/not currently legal/);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const discard=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 assert.ok(discard);
 s=dispatchUniversalAction(packs,s,discard,{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
 assert.equal(s.players[0].deck.length,oldDeck-1);
 assert.equal(s.players[1].deck.length,enemyDeck);
 assert.equal(assertUniversalMatch(packs,s),true);
});
