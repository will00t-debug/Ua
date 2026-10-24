import test from 'node:test';
import assert from 'node:assert/strict';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// UA54BT/MST-1-023 page checked 2026-10-22. No FAQ block. The only printed
// ability draws one card when this entry was caused by an own effect.
// Paying AP and a life COLOR play are not that cause. The gate is optional
// on the existing draw op and does not change an ungated draw.

const mst=registeredV2TitlePack('mushoku-tensei');
const plain={id:'LAB-PLAIN',name:'Plain Draw',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
const deploy={id:'LAB-DEPLOY-RUDEUS',name:'Deploy Rudeus',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
 implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',name:'ルーデウス',color:'blue',energy:2,ap:1,optional:true}]}};
const colorLife={id:'LAB-COLOR',name:'Lab Color',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:'color',implementation:'vanilla',effects:{},
 triggerEffect:{op:'deployHandCharacter',color:'blue',maxEnergy:2,ap:1}};
const fixture=createUniversalPack({id:'mst-own-effect-draw',
 cards:[...verifiedMstV2Cards(),plain,deploy,colorLife]});
const registryDeck=(()=>{
 const required=['MST-1-023','MST-1-001'];
 const rest=Object.values(mst.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,11)];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(mst,counts),[]);
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 return counts;
})();
const fixtureDeck=(()=>{
 const required=['MST-1-023','LAB-PLAIN','LAB-COLOR'];
 const rest=Object.values(fixture.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,9)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts[ids.at(-1)]=2;
 counts['LAB-DEPLOY-RUDEUS']=4;
 assert.equal(ids.length,12);
 assert.deepEqual(validateUniversalDeck(fixture,counts),[]);
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 return counts;
})();
const packs=[fixture,fixture];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function hold(s,p,id){const c=take(s,p,id);s.players[p].hand.push(c);return c;}
function toMain(s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function toAttack(s){
 s=toMain(s);
 s=dispatchUniversalAction(packs,s,{type:'next'});
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

test('MST-1-023 uses the shared draw op only for an own-effect entry',()=>{
 const card=mst.cards['MST-1-023'];
 assert.equal(UA54BT_OFFICIAL_PRINT['MST-1-023'].effectJa,
  '〖登場時〗 このキャラが自分の効果で登場していた場合、カードを1枚引く。');
 assert.equal(card.name,'ルーデウス');
 assert.deepEqual(card.effects.onPlay,[{op:'draw',count:1,entry:'ownEffect'}]);
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger],
  ['blue',2,1,3000,1,null]);
 assert.deepEqual(card.traits,[]);
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-023'));
 assert.throws(()=>createUniversalPack({id:'bad-draw-entry',cards:[{...plain,id:'BAD',
  effects:{onPlay:[{op:'draw',count:1,entry:'paidPlay'}]}}]}),/invalid own-effect draw gate/);
 assert.throws(()=>createUniversalPack({id:'bad-draw-key',cards:[{...plain,id:'BAD',
  effects:{onPlay:[{op:'draw',count:1,note:true}]}}]}),/invalid own-effect draw gate/);
 assert.throws(()=>createUniversalPack({id:'bad-draw-retire',cards:[{...plain,id:'BAD',
  effects:{onRetire:[{op:'draw',count:1,entry:'ownEffect'}]}}]}),/only a character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-draw-event',cards:[{...deploy,id:'BAD',
  effects:{onPlay:[{op:'draw',count:1,entry:'ownEffect'}]}}]}),/only a character onPlay/);
});

test('paid play and life COLOR do not draw, while an outside own effect does',()=>{
 let paid=newUniversalMatch([mst,mst],{decks:[registryDeck,registryDeck],seed:1023,first:0});
 paid=dispatchUniversalAction([mst,mst],paid,{type:'next'});
 paid=dispatchUniversalAction([mst,mst],paid,{type:'next'});
 const payA=take(paid,0,'MST-1-001');payA.ready=true;paid.players[0].energy[0]=payA;
 const payB=take(paid,0,'MST-1-001');payB.ready=true;paid.players[0].energy[1]=payB;
 const card=hold(paid,0,'MST-1-023');
 const deckBefore=paid.players[0].deck.length,handBefore=paid.players[0].hand.length;
 const play=legalUniversalActions([mst,mst],paid).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 paid=dispatchUniversalAction([mst,mst],paid,play);
 assert.equal(paid.players[0].front[0].uid,card.uid);
 assert.equal(paid.players[0].front[0].ready,false);
 assert.equal(paid.players[0].deck.length,deckBefore);
 assert.equal(paid.players[0].hand.length,handBefore-1);
 assert.equal(paid.turnRetireEvents.length,0);
 assert.equal(countCards(paid.players[0]),50);
 assert.equal(assertUniversalMatch([mst,mst],paid),true);

 let own=newUniversalMatch(packs,{decks:[fixtureDeck,fixtureDeck],seed:1024,first:0});
 const outside=take(own,0,'MST-1-023');
 own.players[0].outside.push(outside);
 const event=hold(own,0,'LAB-DEPLOY-RUDEUS');
 own=toMain(own);
 const beforeDeck=own.players[0].deck.length,beforeHand=own.players[0].hand.length;
 own=dispatchUniversalAction(packs,own,{type:'event',uid:event.uid});
 assert.equal(own.pending.kind,'effect-outside-rest');
 const legal=legalUniversalActions(packs,own);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,own,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const choice=legal.find(a=>a.uid===outside.uid&&a.line==='energy'&&a.slot===0);
 own=dispatchUniversalAction(packs,own,choice);
 assert.equal(own.players[0].energy[0].uid,outside.uid);
 assert.equal(own.players[0].energy[0].ready,false);
 assert.equal(own.players[0].deck.length,beforeDeck-1);
 assert.equal(own.players[0].hand.length,beforeHand);
 assert.equal(own.turnRetireEvents.length,0);
 assert.equal(universalPublicView(packs,own,1).players[0].hand,null);
 assert.equal(countCards(own.players[0]),50);
 assert.equal(assertUniversalMatch(packs,own),true);

 let life=newUniversalMatch(packs,{decks:[fixtureDeck,fixtureDeck],seed:1025,first:1});
 const attacker=take(life,1,'LAB-PLAIN');
 attacker.ready=true;life.players[1].front[0]=attacker;
 const entrant=hold(life,0,'MST-1-023');
 const old=life.players[0].life[0];
 const revealed=take(life,0,'LAB-COLOR');
 if(old.uid===revealed.uid)life.players[0].life.unshift(revealed);
 else{life.players[0].life[0]=revealed;life.players[0].deck.push(old);}
 life=toAttack(life);
 life=dispatchUniversalAction(packs,life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(packs,life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'color');
 const deckLife=life.players[0].deck.length,handLife=life.players[0].hand.length;
 const color=legalUniversalActions(packs,life).find(a=>a.mode==='color'&&a.uid===entrant.uid&&a.line==='front');
 assert.ok(color);
 life=dispatchUniversalAction(packs,life,color);
 assert.equal(life.players[0].front.find(c=>c?.uid===entrant.uid).ready,true);
 assert.equal(life.players[0].deck.length,deckLife);
 assert.equal(life.players[0].hand.length,handLife-1);
 assert.equal(life.turnRetireEvents.length,0);
 assert.equal(countCards(life.players[0]),50);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('an ungated on-play draw still draws after a paid play',()=>{
 let s=newUniversalMatch(packs,{decks:[fixtureDeck,fixtureDeck],seed:1026,first:0});
 s=toMain(s);
 const card=hold(s,0,'LAB-PLAIN');
 const deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'play',uid:card.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].uid,card.uid);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.players[0].hand.length,handBefore);
 assert.equal(assertUniversalMatch(packs,s),true);
});
