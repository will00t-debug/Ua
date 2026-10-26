import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const printed=REZERO_VOL2_BY_ID['REZ-2-020'];

test('REZ-2-020 stays off the front line, draws when raided, and buffs after a revealed bottom',()=>{
 assert.match(printed.effectJa,/公開されて山札の下に置かれた時/);
 assert.match(printed.effectJa,/フロントLに〔登場・移動〕できない/);
 assert.match(printed.effectJa,/レイドされた時、カードを1枚引く/);
 const card=rez.cards['REZ-2-020'];
 assert.equal(card.frontForbidden,true);
 assert.equal(card.trigger,'get');
 assert.deepEqual(card.effects.onRaided,[{op:'draw',count:1}]);
 assert.equal(card.moveTriggers[0].when.deckPosition,'bottom');
 assert.equal(card.moveTriggers[0].when.revealed,true);
 assert.deepEqual(card.moveTriggers[0].then,[{op:'buffAnyCharacter',bp:1000,optional:true,excludeSelf:false}]);
 assert.throws(()=>createUniversalPack({id:'rez-020-bad',cards:[{
  id:'X',name:'クルシュ・カルスステン',color:'blue',type:'character',energy:0,ap:1,bp:4000,gen:1,
  trigger:'get',implementation:'dsl',effects:{onRaided:[{op:'draw',count:2}]}}]}),/Raid-base draw/);
});

test('REZ-2-020 can enter energy and cannot enter the front line',()=>{
 const deck=rezDeck(['REZ-2-020','REZ-2-015','REZ-2-033','REZ-2-035','REZ-2-040','REZ-2-041',
  'REZ-2-042','REZ-2-043','REZ-2-046','REZ-2-049','REZ-2-050','REZ-2-055','REZ-2-056'],'REZ-2-055');
 let s=fresh(deck,3020);
 const crusch=take(s,0,'REZ-2-020');s.players[0].hand.push(crusch);
 s=toPhase(rezPacks,s,'main');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='play'&&a.uid===crusch.uid&&a.line==='front'),false);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===crusch.uid&&a.line==='energy');
 assert.ok(play);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(s.players[0].energy.some(c=>c?.uid===crusch.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('raiding REZ-2-020 on energy draws one and cannot move the base to the front line',()=>{
 const body={color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,trigger:null,implementation:'vanilla',effects:{}};
 const pack=createUniversalPack({id:'rez-020-raid',cards:[
  {id:'BASE',name:'クルシュ・カルステン',...body,bp:4000,trigger:'get',implementation:'dsl',
   frontForbidden:true,effects:{onRaided:[{op:'draw',count:1}]},moveTriggers:[{
    when:{from:'hand',to:'deck',reasons:['own-effect'],deckPosition:'bottom',revealed:true},
    then:[{op:'buffAnyCharacter',bp:1000,optional:true,excludeSelf:false}]}]},
  {id:'TOP',name:'上位',color:'blue',type:'character',energy:0,ap:1,bp:3000,gen:1,
   trigger:'raid',raidName:'クルシュ・カルステン',implementation:'vanilla',effects:{}},
  ...Array.from({length:11},(_,i)=>({id:'F'+i,name:'余'+i,...body}))
 ]});
 const ids=['BASE','TOP',...Array.from({length:11},(_,i)=>'F'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.F10=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:3021,first:0});
 const pull=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 const base=pull('BASE');base.ready=true;s.players[0].energy[0]=base;
 const top=pull('TOP');s.players[0].hand.push(top);
 let guard=0;
 while(s.phase!=='main'){
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
  if(++guard>6)throw Error('no main');
 }
 const legal=legalUniversalActions(packs,s).filter(a=>a.type==='raid'&&a.uid===top.uid);
 assert.ok(legal.some(a=>a.line==='energy'&&a.slot===0));
 assert.equal(legal.some(a=>a.line==='front'),false);
 const before=s.players[0].hand.length;
 const deckTop=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(packs,s,legal.find(a=>a.line==='energy'),{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy[0].uid,top.uid);
 assert.equal(s.players[0].energy[0].stack[0].uid,base.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===deckTop));
 assert.equal(s.players[0].hand.length,before);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('a revealed hand card put on the bottom lets REZ-2-020 buff either side',()=>{
 const body={color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,trigger:null,implementation:'vanilla',effects:{}};
 const bottom={from:'hand',to:'deck',reasons:['own-effect'],deckPosition:'bottom',revealed:true};
 const crusch={id:'BASE',name:'クルシュ・カルステン',...body,bp:4000,trigger:'get',implementation:'dsl',
  frontForbidden:true,effects:{onRaided:[{op:'draw',count:1}]},
  moveTriggers:[{when:bottom,then:[{op:'buffAnyCharacter',bp:1000,optional:true,excludeSelf:false}]}]};
 const pack=createUniversalPack({id:'rez-020-show',cards:[
  crusch,
  {id:'SHOW',name:'公開',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,trigger:null,
   implementation:'dsl',effects:{onPlay:[{op:'revealHandBottom'}]}},
  {id:'FOE',name:'相手',color:'green',type:'character',energy:0,ap:1,bp:2500,gen:1,trigger:null,
   implementation:'vanilla',effects:{}},
  {id:'ALLY',name:'味方',color:'blue',type:'character',energy:0,ap:1,bp:1500,gen:1,trigger:null,
   implementation:'vanilla',effects:{}},
  ...Array.from({length:9},(_,i)=>({id:'F'+i,name:'余'+i,...body}))
 ]});
 const ids=['BASE','SHOW','FOE','ALLY',...Array.from({length:9},(_,i)=>'F'+i)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts.F8=2;
 const packs=[pack,pack];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:3022,first:0});
 const pull=(owner,id)=>{
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[owner][zone],index=pile.findIndex(c=>c.cardId===id);
   if(index>=0)return pile.splice(index,1)[0];
  }
  throw Error(id);
 };
 const shown=pull(0,'BASE');s.players[0].hand.push(shown);
 const ally=pull(0,'ALLY');ally.ready=true;s.players[0].front[0]=ally;
 const other=pull(0,'ALLY');s.players[0].hand.push(other);
 const foe=pull(1,'FOE');foe.ready=true;s.players[1].front[0]=foe;
 const show=pull(0,'SHOW');s.players[0].hand.push(show);
 let guard=0;
 while(s.phase!=='main'){
  s=dispatchUniversalAction(packs,s,{type:'next'},{actor:0});
  if(++guard>6)throw Error('no main');
 }
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===show.uid&&a.line==='energy'),{actor:0});
 assert.equal(s.pending.kind,'effect-reveal-bottom');
 assert.ok(s.pending.choices.includes(shown.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRevealBottom',uid:'0-nope'},{actor:0}),/not currently legal/);
 let declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseRevealBottom',uid:other.uid},{actor:0});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].deck.at(-1).uid,other.uid);
 assert.equal(universalBp(packs,declined,declined.players[1].front[0]),2500);
 s=dispatchUniversalAction(packs,s,{type:'chooseRevealBottom',uid:shown.uid},{actor:0});
 assert.equal(s.players[0].deck.at(-1).uid,shown.uid);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.ok(s.pending.choices.includes(foe.uid));
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.equal(s.pending.optional,true);
 assert.ok(universalPublicView(packs,s,1).publicReveals.some(x=>x.uid===shown.uid&&x.kind==='hand-bottom'));
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const skipped=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseAnyBuff',uid:null},{actor:0});
 assert.equal(universalBp(packs,skipped,skipped.players[1].front[0]),2500);
 s=dispatchUniversalAction(packs,s,{type:'chooseAnyBuff',uid:foe.uid},{actor:0});
 assert.equal(universalBp(packs,s,s.players[1].front[0]),3500);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),1500);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
