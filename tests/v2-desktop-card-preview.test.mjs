import test from 'node:test';
import assert from 'node:assert/strict';
import {desktopVisibleCards,resolveDesktopPreview,isDesktopBattlefield,DESKTOP_BATTLE_QUERY}
 from '../dist/universal-v2/desktop-battle-ui.mjs';

const physical=(uid,cardId=uid)=>({uid,cardId,ready:true});
const makeView=()=>({players:[
 {front:[physical('own-front'),null],energy:[physical('own-energy')],hand:[physical('own-hand')],outside:[physical('own-outside')]},
 {front:[physical('enemy-front')],energy:[physical('enemy-energy')],hand:[physical('enemy-secret')],outside:[physical('enemy-outside')]}
]});

test('desktop inspector excludes opponent hands even when an unredacted hand is accidentally supplied',()=>{
 const view=makeView(),before=JSON.stringify(view);
 assert.deepEqual(desktopVisibleCards(view).map(item=>item.card.uid),
  ['own-front','own-energy','own-hand','enemy-front','enemy-energy']);
 assert.equal(JSON.stringify(view),before);
 assert.equal(desktopVisibleCards(view).some(item=>item.card.uid==='enemy-secret'),false);
});

test('desktop inspector follows a public physical card when its field position changes',()=>{
 const view=makeView();
 const previous={uid:'own-front',cardId:'own-front'};
 const moved=view.players[0].front[0];
 view.players[0].front[0]=null;
 view.players[0].energy.push({...moved,ready:false,bp:3500});
 const preview=resolveDesktopPreview(view,previous,null);
 assert.equal(preview.line,'energy');
 assert.equal(preview.card.ready,false);
 assert.equal(preview.card.bp,3500);
});

test('a previously public card entering the opposing hand is dropped from the inspector',()=>{
 const view=makeView(),previous={uid:'enemy-front',cardId:'enemy-front'};
 view.players[1].hand.push(view.players[1].front[0]);
 view.players[1].front[0]=null;
 const preview=resolveDesktopPreview(view,previous,'enemy-secret');
 assert.equal(preview.side,0);
 assert.equal(preview.line,'hand');
 assert.equal(preview.card.uid,'own-hand');
});

test('stale identities are rejected and inspector fallback never requires hidden cards',()=>{
 const view=makeView();
 const result=resolveDesktopPreview(view,{uid:'own-front',cardId:'different-print'},'own-energy');
 assert.equal(result.card.uid,'own-energy');
 assert.equal(resolveDesktopPreview({players:[]},null,null),null);
 assert.equal(isDesktopBattlefield({matchMedia:query=>({matches:query===DESKTOP_BATTLE_QUERY})}),true);
 assert.equal(isDesktopBattlefield({matchMedia:()=>({matches:false})}),false);
 assert.equal(isDesktopBattlefield(null),false);
});
