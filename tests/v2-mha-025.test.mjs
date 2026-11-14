// MHA-1-025 オーバーホール. On play, look at the top 4 privately. Add at
// most one 死穢八斎會 character or 〈エリ〉, publish only that card, and order
// the rest to the bottom. Taking a card puts one hand card outside. Q432
// allows taking nothing. Q433 allows 〈エリ〉 without the trait.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalPrivateChoices
} from '../dist/universal-v2/engine.mjs';

const printed=MHA_CATALOG.find(c=>c.id==='MHA-1-025');
const overhaul=mhaBattleCard(printed, mhaProgramFor('MHA-1-025'));

function card(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'purple',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1500, gen:extra.gen??1, traits:extra.traits||[],
  trigger:null, implementation:extra.implementation||'vanilla',
  effects:extra.effects||{}, ...extra
 };
}
function shell(){
 const bodies=[overhaul,
  card({id:'CREW', name:'幹部', traits:['死穢八斎會']}),
  card({id:'ERI', name:'エリ', traits:[]}),
  card({id:'FIELD', name:'彈', type:'field', traits:['死穢八斎會'], bp:0}),
  card({id:'PLAIN', name:'路人'}),
  card({id:'FUEL', name:'燃料', gen:1}),
  card({id:'WALL', name:'牆', bp:1000, color:'red'})
 ];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, bp:1000}));
  n++;
 }
 return createUniversalPack({id:'mha-025', version:'mha-025', cards:bodies});
}
function open({seed=25}={}){
 const pack=shell();
 const deck={};
 let remain=50;
 for(const id of Object.keys(pack.cards)){
  if(remain<=0)break;
  deck[id]=Math.min(4, remain);
  remain-=deck[id];
 }
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 let guard=0;
 while(s.phase!=='main'||s.active!==0){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase');
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function windowOf(s,ids){
 const cards=ids.map(id=>pull(s,0,id));
 s.players[0].deck.unshift(...cards);
 return cards;
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action; pending='+(s.pending?.kind||'none'));
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function orderRest(pack,s){
 let guard=0;
 const chosen=[];
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  chosen.push(uid);
  s=act(pack,s,{type:'chooseTopOrder', uid});
  if(++guard>6)throw Error('order');
 }
 return {s,chosen};
}

test('MHA-1-025 looks at four cards and may take a trait character or Eri',()=>{
 assert.equal(overhaul.name,'オーバーホール');
 assert.equal(overhaul.energy,1);
 assert.deepEqual([...overhaul.traits],['死穢八斎會']);
 assert.equal(overhaul.effects.onPlay[0].op,'searchTopOneBottomDiscard');
 assert.equal(overhaul.effects.onPlay[0].count,4);
 assert.equal(printed.faq.some(f=>f.id==='Q432'),true);
 assert.equal(printed.faq.some(f=>f.id==='Q433'),true);
 assert.equal(createMhaV2Pack().cards['MHA-1-025'].id,'MHA-1-025');
});

test('the look stays private, taking nothing skips the discard, and a legal card publishes only itself',()=>{
 let {pack,s}=open();
 seat(s,0,'FUEL','energy',0,true);
 const hand=hold(s,'MHA-1-025');
 const [crew,eri,field,plain]=windowOf(s,['CREW','ERI','FIELD','PLAIN']);
 const before=s.players[0].hand.length;
 s=act(pack,s,a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[crew.uid,eri.uid,field.uid,plain.uid]);
 assert.deepEqual([...s.pending.choices].sort(),[crew.uid,eri.uid].sort());
 assert.equal(s.publicReveals.some(r=>r.kind==='revealed-window'),false);
 const mine=universalPrivateChoices(pack,s,0);
 assert.equal(mine.inspected.length,4);
 assert.ok(mine.inspected.some(c=>c.uid===field.uid));
 assert.ok(mine.inspected.some(c=>c.uid===plain.uid));
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.throws(()=>dispatchUniversalAction(pack,structuredClone(s),
  {type:'chooseTopFiltered', uid:field.uid}),/not currently legal|Filtered top search/);
 const left=s.players[0].deck.findIndex(c=>c.uid===eri.uid);
 s.players[0].removed.push(s.players[0].deck.splice(left,1)[0]);
 assert.throws(()=>assertUniversalMatch(pack,s),/Invalid grouped top-filter pending/);

 let declined=open({seed:26});
 seat(declined.s,0,'FUEL','energy',0,true);
 const waiting=hold(declined.s,'MHA-1-025');
 const shown=windowOf(declined.s,['CREW','ERI','FIELD','PLAIN']);
 const handBefore=declined.s.players[0].hand.length;
 declined.s=act(declined.pack,declined.s,a=>a.type==='play'&&a.uid===waiting.uid);
 const skipped=act(declined.pack,declined.s,{type:'chooseTopFiltered', uid:null});
 assert.equal(skipped.pending.kind,'effect-top-order');
 assert.equal(skipped.pending.discardAfter,undefined);
 assert.equal(skipped.players[0].hand.length,handBefore-1);
 const ordered=orderRest(declined.pack,skipped);
 assert.equal(ordered.s.pending,null);
 assert.deepEqual(ordered.s.players[0].deck.slice(-4).map(c=>c.uid),ordered.chosen);
 assert.equal(ordered.s.players[0].hand.some(c=>shown.some(card=>card.uid===c.uid)),false);
 assert.equal(ordered.s.zoneMoveEvents.some(e=>e.turn===ordered.s.turn&&e.from==='hand'&&e.to==='outside'),false);

 let taken=open({seed:27});
 seat(taken.s,0,'FUEL','energy',0,true);
 const payer=hold(taken.s,'MHA-1-025');
 const [member,girl]=windowOf(taken.s,['CREW','ERI','FIELD','PLAIN']);
 const spare=taken.s.players[0].hand.find(c=>c.uid!==payer.uid);
 taken.s=act(taken.pack,taken.s,a=>a.type==='play'&&a.uid===payer.uid);
 taken.s=act(taken.pack,taken.s,{type:'chooseTopFiltered', uid:girl.uid});
 assert.equal(taken.s.players[0].hand.some(c=>c.uid===girl.uid),true);
 assert.equal(taken.s.publicReveals.filter(r=>r.kind==='searched-to-hand').length,1);
 assert.equal(taken.s.publicReveals.find(r=>r.kind==='searched-to-hand').uid,girl.uid);
 assert.equal(taken.s.publicReveals.some(r=>r.uid===member.uid),false);
 taken.s=orderRest(taken.pack,taken.s).s;
 assert.equal(taken.s.pending.kind,'effect-discard');
 const away=taken.s.players[0].hand.findIndex(c=>c.uid===spare.uid);
 taken.s.players[0].deck.push(taken.s.players[0].hand.splice(away,1)[0]);
 assert.throws(()=>dispatchUniversalAction(taken.pack,taken.s,
  {type:'chooseDiscard', uid:spare.uid}),/not currently legal|Discard requires/);
 const fresh=taken.s.players[0].hand.find(c=>c.uid!==girl.uid);
 taken.s=act(taken.pack,taken.s,{type:'chooseDiscard', uid:fresh.uid});
 assert.equal(taken.s.pending,null);
 assert.equal(taken.s.players[0].hand.some(c=>c.uid===girl.uid),true);
 assert.equal(taken.s.players[0].outside.some(c=>c.uid===fresh.uid),true);
 assert.equal(assertUniversalMatch(taken.pack,taken.s),true);
});

test('an empty or unmatched window does not discard, and one purple energy is the play cost',()=>{
 let {pack,s}=open({seed:28});
 const waiting=hold(s,'MHA-1-025');
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===waiting.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'play', uid:waiting.uid, line:'front', slot:0}),/not currently legal/);
 seat(s,0,'FUEL','energy',0,true);
 s.players[0].removed.push(...s.players[0].deck.splice(0));
 s=act(pack,s,a=>a.type==='play'&&a.uid===waiting.uid&&a.line==='front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.some(c=>c?.uid===waiting.uid),true);

 let none=open({seed:29});
 seat(none.s,0,'FUEL','energy',0,true);
 const body=hold(none.s,'MHA-1-025');
 windowOf(none.s,['FIELD','PLAIN','FILL-01','FILL-02']);
 none.s=act(none.pack,none.s,a=>a.type==='play'&&a.uid===body.uid);
 assert.equal(none.s.pending.kind,'effect-top-order');
 const finished=orderRest(none.pack,none.s).s;
 assert.equal(finished.pending,null);
 assert.equal(finished.players[0].hand.length>0,true);

 let {pack:battlePack,s:battle}=open({seed:30});
 const fighter=seat(battle,0,'MHA-1-025','front',0,true);
 const wall=seat(battle,1,'WALL','front',0,true);
 let guard=0;
 while(battle.phase!=='attack'){
  battle=act(battlePack,battle,{type:'next'});
  if(++guard>4)throw Error('attack');
 }
 battle=act(battlePack,battle,a=>a.type==='attack'&&a.uid===fighter.uid);
 battle=act(battlePack,battle,{type:'chooseBlock', uid:wall.uid});
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[0].front.some(c=>c?.uid===fighter.uid),true);
 assert.equal(assertUniversalMatch(battlePack,battle),true);
});
