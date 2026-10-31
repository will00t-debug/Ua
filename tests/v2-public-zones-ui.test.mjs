import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('outside and removed identities are public for both players without leaking hidden zones',()=>{
 const cards=Array.from({length:13},(_,i)=>({
  id:'ZONE-'+i,name:'Visible '+i,type:'character',color:'yellow',
  energy:0,ap:1,bp:1000,gen:1,implementation:'vanilla'
 }));
 const pack=createUniversalPack({id:'v2-public-zones',cards});
 const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 const s=newUniversalMatch(pack,{decks:[counts,counts],seed:20261029,first:0});
 const expected=[];
 for(let side=0;side<2;side++){
  const outside=s.players[side].deck.pop();
  const removed=s.players[side].deck.pop();
  s.players[side].outside.push(outside);
  s.players[side].removed.push(removed);
  expected[side]={outside:{uid:outside.uid,cardId:outside.cardId},
   removed:{uid:removed.uid,cardId:removed.cardId}};
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 for(let viewer=0;viewer<2;viewer++){
  const view=universalPublicView(pack,s,viewer);
  for(let side=0;side<2;side++){
   assert.deepEqual(view.players[side].outside,[expected[side].outside]);
   assert.deepEqual(view.players[side].removed,[expected[side].removed]);
   assert.deepEqual(Object.keys(view.players[side].removed[0]).sort(),['cardId','uid']);
   assert.equal(view.players[side].hand===null,side!==viewer);
   assert.equal(view.players[side].deck,undefined);
   assert.equal(view.players[side].life,undefined);
  }
 }
});

test('both energy-side piles open a read-only gallery with card inspection on mobile and desktop',()=>{
 const ui=read('dist/universal-v2-preview.mjs');
 const html=read('dist/universal-v2-battle.html');
 const css=read('dist/universal-v2-zone.css');
 const piles=ui.split('function legacyLine(view,side,line,legal){')[1]?.split('function legacyLife(')[0];
 const popup=ui.split('function showZoneSheet(side,zone){')[1]?.split('function clearPendingOverlay(')[0];
 assert.ok(piles&&popup);
 assert.match(piles,/\[\['outside','場外'\],\['removed','移除區'\]\]/);
 assert.match(piles,/class:'pile v2-zone-pile'/);
 assert.match(piles,/onClick:\(\)=>showZoneSheet\(side,zone\)/);
 assert.match(popup,/universalPublicView\(app\.packs,app\.state,0\)/);
 assert.match(popup,/showFieldSheet\(side,zone,physical,def\)/);
 assert.match(popup,/cards\.length\?gallery:/);
 assert.match(popup,/event\.key==='Escape'/);
 assert.doesNotMatch(popup,/applyAction\(|dispatchUniversalAction\(/);
 assert.match(html,/universal-v2-zone\.css\?v=20261030publicwindow1/);
 assert.match(css,/\.v2-zone-gallery/);
 assert.match(css,/@media\(max-width:600px\)/);
});
