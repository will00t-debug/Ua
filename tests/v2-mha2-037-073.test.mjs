// EX06BT MHA-2-037 through 073. Official text is effectJa.
// Ready cards use an existing shared sentence. The rest stay out of the pack.
// Q1007–Q1014 constrain the pending cards. This is not an FAQ acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA2_CARDS_037_073} from '../dist/mha/cards-2-037-073.mjs';
import {MHA2_CATALOG_037_073, mhaEditorCards} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {MHA2_PROGRAMS_037_073} from '../dist/universal-v2/mha/programs-2-037-073.mjs';
import {MHA2_REQUESTS_037_073} from '../dist/universal-v2/mha/requests-2-037-073.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
 import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp, zoneRequiredEnergy, universalPrivateChoices
} from '../dist/universal-v2/engine.mjs';

const READY=['MHA-2-039','MHA-2-047','MHA-2-049','MHA-2-052','MHA-2-055',
 'MHA-2-058','MHA-2-059','MHA-2-061','MHA-2-063','MHA-2-064','MHA-2-065',
 'MHA-2-071','MHA-2-073'];
const real=createMha2Pack();
const set1Pack=createMhaV2Pack();
const byId=new Map(MHA2_CARDS_037_073.map(card=>[card.id,card]));

function fixture(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'purple',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1000, gen:extra.gen??1, traits:extra.traits||[],
  trigger:extra.trigger??null, implementation:extra.implementation||'vanilla',
  effects:extra.effects||{}, ...extra
 };
}
function readyCard(id){
 const row=byId.get(id);
 const program=MHA2_PROGRAMS_037_073[id];
 const card={
  id, name:row.nameJa, color:row.color, type:row.type, energy:row.energy,
  ap:row.ap, bp:row.bp, gen:row.gen, traits:[...(row.traits||[])],
  trigger:row.trigger, implementation:program.implementation,
  effects:program.effects||{}
 };
 for(const key of Object.keys(program)){
  if(key==='ready'||key==='implementation'||key==='effects'||key==='notes')continue;
  card[key]=program[key];
 }
 return card;
}
function shell(){
 const ready=READY.map(readyCard);
 const bodies=[
  ...ready,
  fixture({id:'PURPLE', name:'紫燃料', gen:4}),
  fixture({id:'GREEN', name:'綠燃料', color:'green', gen:2}),
  fixture({id:'RED', name:'紅燃料', color:'red', gen:2}),
  fixture({id:'NAGANT', name:'レディ・ナガン', bp:1500}),
  fixture({id:'LOW', name:'低', bp:3000}),
  fixture({id:'MID', name:'中', bp:3500}),
  fixture({id:'HIGH', name:'高', bp:5000}),
  fixture({id:'OVER', name:'過', bp:5500}),
  fixture({id:'WALL', name:'牆', color:'red', bp:4000}),
  fixture({id:'COST4', name:'能源四', color:'green', energy:4, bp:2000}),
  fixture({id:'COST5', name:'能源五', color:'green', energy:5, bp:2000}),
  fixture({id:'COST3', name:'能源三', color:'green', energy:3, bp:2000}),
  fixture({id:'IMPACT', name:'衝擊', color:'red', bp:5000, printedImpact:1, implementation:'dsl'}),
  fixture({id:'PLAIN', name:'路人', bp:3000})
 ];
 for(let n=1;n<=24;n++)
  bodies.push(fixture({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n}));
 return createUniversalPack({id:'mha2-037', version:'mha2-037', cards:bodies});
}
function open(seed){
 const pack=shell();
 const deck={};
 for(const id of Object.keys(pack.cards))deck[id]=1;
 for(const id of READY)deck[id]=2;
 let total=Object.values(deck).reduce((sum,n)=>sum+n,0);
 for(const id of Object.keys(deck)){
  if(total<=50)break;
  if(!id.startsWith('FILL-'))continue;
  const cut=Math.min(deck[id], total-50);
  deck[id]-=cut;
  total-=cut;
  if(deck[id]===0)delete deck[id];
 }
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 for(let i=0;i<8&&(s.phase!=='main'||s.active!==0);i++)
  s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=pl[zone];
  const index=pile.findIndex(c=>c?.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const slot=pl[line].findIndex(c=>c?.cardId===id);
  if(slot>=0){const body=pl[line][slot];pl[line][slot]=null;return body;}
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 const occupant=s.players[p][line][slot];
 if(occupant){
  s.players[p][line][slot]=null;
  s.players[p].removed.push(occupant);
 }
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
function clearLines(s,p){
 for(const line of ['front','energy']){
  for(let slot=0;slot<s.players[p][line].length;slot++){
   const body=s.players[p][line][slot];
   if(!body)continue;
   s.players[p][line][slot]=null;
   s.players[p].removed.push(body);
  }
 }
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,pred){
 const choice=legal(pack,s).find(pred);
 if(!choice)throw Error('missing action '+(s.pending?.kind||s.phase)+' '+JSON.stringify(legal(pack,s).slice(0,6)));
 return dispatchUniversalAction(pack,s,choice);
}
function readyAp(s){
 s.players[s.active].apCards.forEach(ap=>{ap.inPlay=true;ap.ready=true;});
}
function reach(pack,s,phase,player=0){
 let guard=0;
 while(!(s.active===player&&s.phase===phase&&!s.pending)){
  if(s.pending?.kind==='block')s=act(pack,s,a=>a.uid===null);
  else if(s.pending)throw Error('pending '+s.pending.kind);
  else s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>24)throw Error('stuck '+player+' '+s.phase+' '+(s.pending?.kind||''));
 }
 return s;
}
function live(s,p,uid){
 for(const line of ['front','energy']){
  const hit=s.players[p][line].find(c=>c?.uid===uid);
  if(hit)return hit;
 }
 return null;
}

test('037-073 keep the official identity and only complete sentences are ready',()=>{
 assert.equal(MHA2_CARDS_037_073.length,37);
 assert.equal(MHA2_CATALOG_037_073.length,37);
 const editor=mhaEditorCards();
 const set1=editor.filter(card=>card.id.startsWith('MHA-1-'));
 assert.equal(set1.length,109);
 assert.equal(set1.every(card=>set1Pack.cards[card.id]),true);
 assert.equal(Object.keys(set1Pack.cards).length,109);
 assert.equal(editor.filter(card=>card.id.startsWith('MHA-2-')).length,73);
 const pending=Object.keys(MHA2_REQUESTS_037_073).sort();
 const ready=Object.keys(MHA2_PROGRAMS_037_073).sort();
 assert.deepEqual(ready, [...READY].sort());
 assert.equal(ready.length+pending.length,37);
 assert.equal(ready.some(id=>pending.includes(id)),false);
 for(let n=37;n<=73;n++){
  const id='MHA-2-'+String(n).padStart(3,'0');
  const card=byId.get(id);
  assert.equal(card.set,'EX06BT');
  assert.equal(card.title,'mha');
  assert.equal(card.name,card.nameJa);
  assert.equal(card.battleReady,false);
  assert.equal(card.deckLegal,true);
  assert.equal(card.sourceTc,'');
  assert.match(card.image, new RegExp('EX06BT_'+id+'\\.png$'));
  assert.match(card.source, /card_no=EX06BT%2F/);
  assert.equal(card.effectJa.length>0,true);
  assert.equal(editor.some(row=>row.id===id&&row.playable===false),true);
  if(ready.includes(id)){
   assert.equal(MHA2_REQUESTS_037_073[id],undefined);
   assert.equal(real.cards[id].id,id);
   assert.equal(real.cards[id].name,card.nameJa);
   assert.equal(real.cards[id].energy,card.energy);
   assert.equal(real.cards[id].ap,card.ap);
   assert.equal(real.cards[id].bp,card.bp);
   assert.equal(real.cards[id].color,card.color);
   assert.equal(real.cards[id].type,card.type);
   assert.equal(real.cards[id].trigger,card.trigger);
   assert.equal(set1Pack.cards[id],undefined);
   assert.equal(MHA2_PROGRAMS_037_073[id].ready,true);
   assert.equal(mhaProgramFor(id),null);
  }else{
   assert.equal(real.cards[id],undefined);
   assert.equal(set1Pack.cards[id],undefined);
   assert.equal(mhaProgramFor(id),null);
   assert.equal(typeof MHA2_REQUESTS_037_073[id].missing,'string');
   assert.deepEqual(MHA2_REQUESTS_037_073[id].faq||[], card.faq.map(row=>row.id));
  }
 }
});

test('039 draws one and puts one hand card outside when it attacks',()=>{
 const {pack,s}=open(39);
 clearLines(s,0);
 const body=seat(s,0,'MHA-2-039','front',0,true);
 const spare=hold(s,'PLAIN');
 const before=s.players[0].deck.length;
 let swung=reach(pack,s,'attack');
 swung=act(pack,swung,a=>a.type==='attack'&&a.uid===body.uid);
 if(swung.pending?.kind==='block')swung=act(pack,swung,a=>a.uid===null);
 assert.equal(swung.pending.kind,'effect-discard');
 assert.equal(swung.players[0].deck.length,before-1);
 assert.equal(legal(pack,swung).some(a=>a.type==='chooseDiscard'&&a.uid===spare.uid),true);
 assert.throws(()=>dispatchUniversalAction(pack,swung,{type:'chooseDiscard', uid:'gone'}));
 const paid=act(pack,swung,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(paid.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(paid.players[0].hand.some(c=>c.uid===spare.uid),false);
 assert.equal(paid.players[0].deck.length,before-1);
 assert.equal(assertUniversalMatch(pack,paid),true);
});

test('047 draws one when it leaves, and 049 retires only inside the printed BP cap',()=>{
 const {pack,s}=open(49);
 clearLines(s,0);
 clearLines(s,1);
 seat(s,0,'PURPLE','energy',0,true);
 readyAp(s);
 const event=hold(s,'MHA-2-049');
 assert.equal(legal(pack,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 const low=seat(s,1,'MHA-2-047','front',0,true);
 const mid=seat(s,1,'MID','front',1,true);
 const high=seat(s,1,'HIGH','front',2,true);
 let played=act(pack,s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.choices.includes(low.uid),true);
 assert.equal(played.pending.choices.includes(mid.uid),false);
 assert.equal(legal(pack,played).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(pack,played,{type:'chooseRetireBp', uid:mid.uid}));
 const deck=played.players[1].deck.length;
 const hand=played.players[1].hand.length;
 const retired=act(pack,played,a=>a.type==='chooseRetireBp'&&a.uid===low.uid);
 assert.equal(live(retired,1,low.uid),null);
 assert.equal(retired.players[1].deck.length,deck-1);
 assert.equal(retired.players[1].hand.length,hand+1);
 assert.equal(assertUniversalMatch(pack,retired),true);

 const raised=open(491);
 clearLines(raised.s,0);
 clearLines(raised.s,1);
 seat(raised.s,0,'PURPLE','energy',0,true);
 seat(raised.s,0,'NAGANT','front',0,true);
 readyAp(raised.s);
 const again=hold(raised.s,'MHA-2-049');
 const top=seat(raised.s,1,'HIGH','front',0,true);
 const over=seat(raised.s,1,'OVER','front',1,true);
 const opened=act(raised.pack,raised.s,a=>a.type==='event'&&a.uid===again.uid);
 assert.equal(opened.pending.choices.includes(top.uid),true);
 assert.equal(opened.pending.choices.includes(over.uid),false);
 const gone=opened.players[1].front.findIndex(c=>c?.uid===top.uid);
 opened.players[1].front[gone]=null;
 opened.players[1].removed.push(top);
 assert.throws(()=>dispatchUniversalAction(raised.pack,opened,
  {type:'chooseRetireBp', uid:top.uid}));

 const broke=open(492);
 clearLines(broke.s,0);
 readyAp(broke.s);
 const unpaid=hold(broke.s,'MHA-2-049');
 assert.equal(legal(broke.pack,broke.s).some(a=>a.type==='event'&&a.uid===unpaid.uid),false);
 seat(broke.s,0,'PURPLE','energy',0,true);
 assert.equal(legal(broke.pack,broke.s).some(a=>a.type==='event'&&a.uid===unpaid.uid),true);
 broke.s.players[0].apCards.forEach(ap=>{ap.ready=false;});
 assert.equal(legal(broke.pack,broke.s).some(a=>a.type==='event'&&a.uid===unpaid.uid),false);
});

test('058 gains 1000 BP only on its controller turn',()=>{
 const {pack,s}=open(58);
 const body=seat(s,0,'MHA-2-058','front',0,true);
 assert.equal(universalBp(pack,s,body),3000);
 const foe=reach(pack,s,'attack',1);
 assert.equal(universalBp(pack,foe,live(foe,0,body.uid)),2000);
 const back=reach(pack,foe,'main',0);
 assert.equal(universalBp(pack,back,live(back,0,body.uid)),3000);
 assert.equal(assertUniversalMatch(pack,back),true);
});

test('059 and 073 discount hand energy only while the field is empty',()=>{
 for(const [id,color] of [['MHA-2-059','green'],['MHA-2-073','red']]){
  const {pack,s}=open(id==='MHA-2-059'?59:73);
  clearLines(s,0);
  const body=hold(s,id);
  assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards[id],'hand'),0);
  assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards[id],'life'),2);
  readyAp(s);
  assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===body.uid),true);
  const occupied=seat(s,0,'PLAIN','energy',0,true);
  assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards[id],'hand'),2);
  assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===body.uid),false);
  s.players[0].energy[0]=null;
  s.players[0].outside.push(occupied);
  assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards[id],'hand'),0);
  assert.equal(pack.cards[id].color,color);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('061 may give 1000 BP to one own character, including itself',()=>{
 const {pack,s}=open(61);
 clearLines(s,0);
 clearLines(s,1);
 seat(s,0,'GREEN','energy',0,true);
 readyAp(s);
 const self=hold(s,'MHA-2-061');
 const ally=seat(s,0,'PLAIN','energy',1,true);
 const foe=seat(s,1,'WALL','front',0,true);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===self.uid),true);
 s.players[0].apCards.forEach(ap=>{ap.ready=false;});
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===self.uid),false);
 readyAp(s);
 const played=act(pack,s,a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.choices.includes(self.uid),true);
 assert.equal(played.pending.choices.includes(ally.uid),true);
 assert.equal(played.pending.choices.includes(foe.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,played,{type:'chooseOwnBuff', uid:foe.uid}));
 const skipped=act(pack,played,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(universalBp(pack,skipped,live(skipped,0,ally.uid)),3000);
 const again=open(611);
 clearLines(again.s,0);
 seat(again.s,0,'GREEN','energy',0,true);
 readyAp(again.s);
 const card=hold(again.s,'MHA-2-061');
 const target=seat(again.s,0,'PLAIN','front',1,true);
 const opened=act(again.pack,again.s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 const slot=opened.players[0].front.findIndex(c=>c?.uid===target.uid);
 opened.players[0].front[slot]=null;
 opened.players[0].removed.push(target);
 assert.throws(()=>dispatchUniversalAction(again.pack,opened,{type:'chooseOwnBuff', uid:target.uid}));
 const fresh=open(612);
 clearLines(fresh.s,0);
 seat(fresh.s,0,'GREEN','energy',0,true);
 readyAp(fresh.s);
 const third=hold(fresh.s,'MHA-2-061');
 const other=seat(fresh.s,0,'PLAIN','energy',1,true);
 const entered=act(fresh.pack,fresh.s,a=>a.type==='play'&&a.uid===third.uid&&a.line==='energy');
 const buffed=act(fresh.pack,entered,a=>a.type==='chooseOwnBuff'&&a.uid===other.uid);
 assert.equal(universalBp(fresh.pack,buffed,live(buffed,0,other.uid)),4000);
 assert.equal(assertUniversalMatch(fresh.pack,buffed),true);
});

test('064 has no printed effect and 065 removes impact from the character it battles',()=>{
 const {pack,s}=open(64);
 clearLines(s,0);
 clearLines(s,1);
 const plain=hold(s,'MHA-2-064');
 readyAp(s);
 const wall=seat(s,1,'WALL','front',0,true);
 const played=act(pack,s,a=>a.type==='play'&&a.uid===plain.uid&&a.line==='front');
 assert.equal(played.pending,null);
 assert.equal(live(played,0,plain.uid).cardId,'MHA-2-064');
 const swinging=reach(pack,played,'attack');
 live(swinging,0,plain.uid).ready=true;
 const attacked=act(pack,swinging,a=>a.type==='attack'&&a.uid===plain.uid);
 assert.equal(attacked.pending.kind,'block');
 const hand=attacked.players[0].hand.length;
 const lifeBefore=attacked.players[1].life.length;
 const blocked=act(pack,attacked,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(live(blocked,0,plain.uid).cardId,'MHA-2-064');
 assert.equal(live(blocked,0,plain.uid).ready,false);
 assert.equal(live(blocked,1,wall.uid).cardId,'WALL');
 assert.equal(blocked.players[1].life.length,lifeBefore);
 assert.equal(blocked.players[0].hand.length,hand);
 assert.equal(blocked.pending,null);
 assert.equal(assertUniversalMatch(pack,blocked),true);

 const battle=open(65);
 clearLines(battle.s,0);
 clearLines(battle.s,1);
 const striker=seat(battle.s,0,'IMPACT','front',0,true);
 const guard=seat(battle.s,1,'MHA-2-065','front',0,true);
 const life=battle.s.players[1].life.length;
 let turn=reach(battle.pack,battle.s,'attack');
 turn=act(battle.pack,turn,a=>a.type==='attack'&&a.uid===striker.uid);
 assert.equal(turn.pending.kind,'block');
 const after=act(battle.pack,turn,a=>a.type==='chooseBlock'&&a.uid===guard.uid);
 assert.equal(after.players[1].life.length,life);
 assert.equal(live(after,1,guard.uid),null);
 const control=open(651);
 clearLines(control.s,0);
 clearLines(control.s,1);
 const hitter=seat(control.s,0,'IMPACT','front',0,true);
 const vanilla=seat(control.s,1,'PLAIN','front',0,true);
 const before=control.s.players[1].life.length;
 let swing=reach(control.pack,control.s,'attack');
 swing=act(control.pack,swing,a=>a.type==='attack'&&a.uid===hitter.uid);
 const hit=act(control.pack,swing,a=>a.type==='chooseBlock'&&a.uid===vanilla.uid);
 assert.equal(hit.players[1].life.length,before-1);
 assert.equal(assertUniversalMatch(battle.pack,after),true);
 assert.equal(assertUniversalMatch(control.pack,hit),true);
});

test('071 steps from the front to energy only in its move phase',()=>{
 const {pack,s}=open(71);
 clearLines(s,0);
 const body=seat(s,0,'MHA-2-071','front',0,true);
 seat(s,0,'PLAIN','energy',1,true);
 let moving=reach(pack,s,'move');
 assert.equal(legal(pack,moving).some(a=>a.type==='step'&&a.uid===body.uid&&a.slot===1),false);
 const stepped=act(pack,moving,a=>a.type==='step'&&a.uid===body.uid&&a.slot===0);
 assert.equal(stepped.players[0].energy[0].uid,body.uid);
 assert.equal(stepped.players[0].front[0],null);
 const later=reach(pack,stepped,'attack');
 assert.equal(legal(pack,later).some(a=>a.type==='step'&&a.uid===body.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,later,{type:'step', uid:body.uid, line:'energy', slot:2}));
 const plain=open(711);
 clearLines(plain.s,0);
 const other=seat(plain.s,0,'PLAIN','front',0,true);
 const phase=reach(plain.pack,plain.s,'move');
 assert.equal(legal(plain.pack,phase).some(a=>a.type==='step'&&a.uid===other.uid),false);
 assert.equal(assertUniversalMatch(pack,later),true);
});

function order(live,s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(live,s,action=>action.type==='chooseTopOrder'&&action.uid===uid);
  if(++guard>8)throw Error('order');
 }
 return s;
}
function shownUids(pack,s){
 const seen=universalPrivateChoices(pack,s,0);
 return (seen.inspected||[]).map(card=>card.uid);
}

test('MHA-2-052 shows four cards and discards a hand card only after taking energy 3 or less',()=>{
 let {pack,s}=open(2052);
 clearLines(s,0);
 seat(s,0,'GREEN','energy',0,true);
 readyAp(s);
 const self=hold(s,'MHA-2-052');
 const low=pull(s,0,'COST3');
 const high=pull(s,0,'COST4');
 const zero=pull(s,0,'MHA-2-064');
 const plain=pull(s,0,'PLAIN');
 s.players[0].deck.unshift(plain,zero,high,low);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 const shown=shownUids(pack,s);
 assert.equal(shown.length,4);
 for(const body of [low,high,zero,plain])assert.equal(shown.includes(body.uid),true);
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(zero.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 s=act(pack,s,action=>action.type==='chooseTopFiltered'&&action.uid===null);
 s=order(pack,s);
 assert.equal(s.pending,null);

 let taken=open(2053);
 clearLines(taken.s,0);
 seat(taken.s,0,'GREEN','energy',0,true);
 readyAp(taken.s);
 const body=hold(taken.s,'MHA-2-052');
 const pick=pull(taken.s,0,'COST3');
 taken.s.players[0].deck.unshift(pull(taken.s,0,'PLAIN'),pull(taken.s,0,'COST4'),pull(taken.s,0,'MHA-2-064'),pick);
 taken.s=act(taken.pack,taken.s,action=>action.type==='play'&&action.uid===body.uid);
 taken.s=act(taken.pack,taken.s,action=>action.type==='chooseTopFiltered'&&action.uid===pick.uid);
 taken.s=order(taken.pack,taken.s);
 assert.equal(taken.s.pending.kind,'effect-discard');
 const spare=taken.s.players[0].hand.find(card=>card.uid!==pick.uid);
 taken.s=act(taken.pack,taken.s,action=>action.type==='chooseDiscard'&&action.uid===spare.uid);
 assert.ok(taken.s.players[0].outside.some(card=>card.uid===spare.uid));
 assert.ok(taken.s.players[0].hand.some(card=>card.uid===pick.uid));
});

test('MHA-2-055 takes only a character of printed energy 4 or more',()=>{
 let {pack,s}=open(2055);
 clearLines(s,0);
 seat(s,0,'GREEN','energy',0,true);
 readyAp(s);
 const self=hold(s,'MHA-2-055');
 const low=pull(s,0,'COST3');
 const high=pull(s,0,'COST4');
 const zero=pull(s,0,'MHA-2-064');
 const five=pull(s,0,'COST5');
 s.players[0].deck.unshift(five,zero,low,high);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='energy'&&action.slot===1);
 const shown=shownUids(pack,s);
 assert.equal(shown.length,4);
 for(const body of [low,high,zero,five])assert.equal(shown.includes(body.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),true);
 assert.equal(s.pending.choices.includes(five.uid),true);
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.equal(s.pending.choices.includes(zero.uid),false);
 s=act(pack,s,action=>action.type==='chooseTopFiltered'&&action.uid===high.uid);
 s=order(pack,s);
 assert.equal(s.pending.kind,'effect-discard');
});

test('MHA-2-063 uses printed BP 3500, not the current BP',()=>{
 let {pack,s}=open(2063);
 clearLines(s,0);
 seat(s,0,'RED','energy',0,true);
 readyAp(s);
 const self=hold(s,'MHA-2-063');
 const mid=pull(s,0,'MID');
 const high=pull(s,0,'HIGH');
 const low=pull(s,0,'LOW');
 const plain=pull(s,0,'PLAIN');
 high.buffs=[{bp:-2000,untilTurn:s.turn}];
 low.buffs=[{bp:2000,untilTurn:s.turn}];
 s.players[0].deck.unshift(plain,low,high,mid);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 const shown=shownUids(pack,s);
 assert.equal(shown.length,4);
 for(const body of [mid,high,low,plain])assert.equal(shown.includes(body.uid),true);
 assert.equal(s.pending.choices.includes(mid.uid),true);
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
});
