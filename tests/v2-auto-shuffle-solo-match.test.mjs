import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateMatchSeed,MAX_MATCH_SEED} from '../dist/v2-match-random-seed.mjs';
import {verifiedTtgRedPilotDeck,verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the V2 setup no longer exposes a fixed or manually entered deck-order code',()=>{
 const page=read('dist/universal-v2-preview.html');
 const js=read('dist/universal-v2-preview.mjs');
 assert.doesNotMatch(page,/id="match-seed"|牌序種子（可重現）|20261015/);
 assert.doesNotMatch(js,/\$\('match-seed'\)|20261015/);
 assert.match(page,/每場新對局都會自動重新洗牌/);
 assert.match(page,/id="first-player"/);
 assert.match(page,/id="ai-level"/);
 assert.match(page,/id="start-game"/);
 assert.match(page,/universal-v2-preview\.mjs\?v=20261029cardeffect1/);
 assert.match(js,/const seed=generateMatchSeed\(\)/);
 assert.match(js,/newUniversalMatch\(app\.packs,\{decks:\[mine\.counts,foe\.counts\],seed,first,openingMulligan:true\}\)/);
 assert.match(js,/makeUniversalPreviewReplay\(app\.packs,\{/);
 assert.match(js,/decks:\[mine\.counts,foe\.counts\],seed,first/);
 assert.doesNotMatch(js,/\+seed\]/);
 assert.match(js,/起手牌調度階段/);
 assert.match(js,/openingMulligan:true/);
});

test('crypto seeds are in range, differ across samples, and reject biased UInt32 tail',()=>{
 const samples=[0,17,4294967295,3999999995];
 const cryptoSource={getRandomValues(arr){arr[0]=samples.shift();return arr;}};
 assert.equal(generateMatchSeed({cryptoSource}),1);
 assert.equal(generateMatchSeed({cryptoSource}),18);
 assert.equal(generateMatchSeed({cryptoSource}),MAX_MATCH_SEED);
 assert.deepEqual(samples,[]);
 assert.equal(generateMatchSeed({cryptoSource:null,random:()=>0}),1);
 assert.equal(generateMatchSeed({cryptoSource:null,random:()=>1-Number.EPSILON}),MAX_MATCH_SEED);
});

test('different freshly generated seeds give different initial V2 card orders while remaining valid',()=>{
 const mine=verifiedTtgRedPilotDeck(),foe=verifiedBleachPurplePilotDeck();
 const packs=[mine.pack,foe.pack],decks=[mine.counts,foe.counts];
 const raw=[314159,271828];
 const cryptoSource={getRandomValues(a){a[0]=raw.shift();return a;}};
 const first=generateMatchSeed({cryptoSource}),second=generateMatchSeed({cryptoSource});
 assert.notEqual(first,second);
 const a=newUniversalMatch(packs,{decks,seed:first,first:0});
 const b=newUniversalMatch(packs,{decks,seed:second,first:0});
 assert.equal(assertUniversalMatch(packs,a),true);
 assert.equal(assertUniversalMatch(packs,b),true);
 const order=state=>JSON.stringify([...state.players[0].hand,...state.players[0].deck].map(card=>card.cardId));
 assert.notEqual(order(a),order(b));
});

test('deck library heading has no redundant battle CTA but navigation is retained',()=>{
 const editor=read('dist/v2-deck-editor.mjs');
 assert.doesNotMatch(editor,/<a class="v2e-primary" href="\/universal-v2-preview\.html">前往 V2 對戰<\/a>/);
 assert.ok(editor.includes('href="/universal-v2-preview.html">對戰</a>'));
 assert.match(editor,/window\.location\.assign\('\/universal-v2-preview\.html'\)/);
});
