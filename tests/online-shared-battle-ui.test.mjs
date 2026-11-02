import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineBattleView,onlineAttackBadges,bindOnlineCardInspect}
 from '../dist/universal-v2/online-battle-ui.mjs';
import {desktopVisibleCards} from '../dist/universal-v2/desktop-battle-ui.mjs';

const card=uid=>({uid,cardId:uid});
const fixture=seat=>({seat,status:'playing',view:{active:1,actor:0,
 pending:{kind:'block',player:0},battle:{owner:1,uid:'1-1'},players:[
  {front:[card('0-1')],energy:[],hand:[card('0-secret')]},
  {front:[card('1-1')],energy:[],hand:[card('1-secret')]}
 ]}});

for(const seat of [0,1])test('online seat '+seat+' sees its own hand below and never inspects the opponent hand',()=>{
 const room=fixture(seat),before=structuredClone(room),view=onlineBattleView(room);
 assert.equal(view.players[0].hand[0].uid,seat+'-secret');
 assert.equal(view.players[1].hand,null);
 assert.equal(view.active,seat===1?0:1);
 assert.equal(view.actor,seat===0?0:1);
 assert.equal(view.pending.player,view.actor);
 assert.equal(view.battle.owner,view.active);
 assert.equal(view.status,'playing');
 assert.equal(desktopVisibleCards(view).some(c=>c.card.uid===(1-seat)+'-secret'),false);
 assert.deepEqual(room,before,'presentation must preserve physical seat numbers and server choices');
});

test('attack badges distinguish direct damage, impact and impact nullification',()=>{
 assert.deepEqual(onlineAttackBadges(null),[]);
 assert.deepEqual(onlineAttackBadges({damage:1,impact:0}),[]);
 assert.deepEqual(onlineAttackBadges({damage:2,impact:1,impactNull:true}),[
  {type:'damage',text:'直傷2'},{type:'impact',text:'衝擊1'},{type:'impact-null',text:'衝擊無效'}
 ]);
});

class CardButton extends EventTarget{isConnected=true;}
const pointer=(name,coords={})=>Object.assign(new Event(name,{cancelable:true}),
 {button:0,clientX:0,clientY:0,...coords});
test('one-second inspect never also dispatches an action and dragging cancels the hold',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const node=new CardButton();let inspected=0,acted=0;
 bindOnlineCardInspect(node,()=>inspected++,()=>acted++);
 node.dispatchEvent(pointer('pointerdown'));t.mock.timers.tick(999);
 assert.equal(inspected,0);t.mock.timers.tick(1);assert.equal(inspected,1);
 node.dispatchEvent(pointer('pointerup'));node.dispatchEvent(new Event('click'));
 assert.equal(acted,0);
 node.dispatchEvent(pointer('pointerdown'));node.dispatchEvent(pointer('pointermove',{clientX:20}));
 t.mock.timers.tick(1000);node.dispatchEvent(pointer('pointerup'));assert.equal(inspected,1);
 node.dispatchEvent(pointer('pointerdown'));node.dispatchEvent(pointer('pointerup'));node.dispatchEvent(new Event('click'));
 assert.equal(acted,1);
 node.dispatchEvent(pointer('pointerdown'));node.isConnected=false;t.mock.timers.tick(1000);
 assert.equal(inspected,1,'a removed card cannot reopen an inspector after a room update');
});
