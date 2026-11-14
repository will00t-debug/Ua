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
 assertUniversalMatch, universalBp, zoneRequiredEnergy, universalPrivateChoices,
 universalCardEnergy, universalAttackDamage, universalImpact
} from '../dist/universal-v2/engine.mjs';

const READY=['MHA-2-037','MHA-2-039','MHA-2-041','MHA-2-043','MHA-2-044','MHA-2-045','MHA-2-047',
 'MHA-2-048','MHA-2-049','MHA-2-052','MHA-2-055','MHA-2-058','MHA-2-059','MHA-2-060',
 'MHA-2-061','MHA-2-062','MHA-2-063','MHA-2-064','MHA-2-065','MHA-2-066','MHA-2-067',
 'MHA-2-068','MHA-2-069','MHA-2-070','MHA-2-071','MHA-2-072','MHA-2-073'];
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
function shell(extras=[]){
 const ready=READY.map(readyCard);
 const bodies=[
  ...ready,
  fixture({id:'PURPLE', name:'紫燃料', gen:4}),
  fixture({id:'GREEN', name:'綠燃料', color:'green', gen:2}),
  fixture({id:'RED', name:'紅燃料', color:'red', gen:2}),
  fixture({id:'NAGANT', name:'レディ・ナガン', bp:1500}),
  fixture({id:'CAP', name:'上限', bp:2500}),
  fixture({id:'LOW', name:'低', bp:3000}),
  fixture({id:'MID', name:'中', bp:3500}),
  fixture({id:'HIGH', name:'高', bp:5000}),
  fixture({id:'OVER', name:'過', bp:5500}),
  fixture({id:'WALL', name:'牆', color:'red', bp:4000}),
  fixture({id:'COST4', name:'能源四', color:'green', energy:4, bp:2000}),
  fixture({id:'COST5', name:'能源五', color:'green', energy:5, bp:2000}),
  fixture({id:'COST3', name:'能源三', color:'green', energy:3, bp:2000}),
  fixture({id:'IMPACT', name:'衝擊', color:'red', bp:5000, printedImpact:1, implementation:'dsl'}),
  fixture({id:'PLAIN', name:'路人', bp:3000}),
  ...extras
 ];
 for(let n=1;n<=24;n++)
  bodies.push(fixture({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n}));
 return createUniversalPack({id:'mha2-037', version:'mha2-037', cards:bodies});
}
function open(seed, extras=[]){
 const pack=shell(extras);
 const deck={};
 for(const id of Object.keys(pack.cards))deck[id]=1;
 for(const id of READY)deck[id]=2;
 for(const id of ['MHA-2-037','MHA-2-043','MHA-2-044','MHA-2-048','MHA-2-064',
  'MHA-2-062','MHA-2-067','MHA-2-069','MHA-2-070','MHA-2-072'])deck[id]=1;
 const spare=READY.filter(id=>deck[id]===2);
 for(const extra of extras){
  const id=spare.pop();
  if(id)deck[id]=1;
  deck[extra.id]=1;
 }
 let total=Object.values(deck).reduce((sum,n)=>sum+n,0);
 for(const id of Object.keys(deck)){
  if(total<=50)break;
  if(!id.startsWith('FILL-'))continue;
  const cut=Math.min(deck[id], total-50);
  deck[id]-=cut;
  total-=cut;
  if(deck[id]===0)delete deck[id];
 }
 const keepPair=new Set(['MHA-2-045','MHA-2-049','MHA-2-060','MHA-2-066','MHA-2-068']);
 while(total>50){
  const cut=Object.keys(deck).find(id=>deck[id]>1&&!keepPair.has(id))||
   Object.keys(deck).find(id=>id.startsWith('FILL-')&&deck[id]>0);
  if(!cut)break;
  deck[cut]-=1;
  total-=1;
  if(deck[cut]===0)delete deck[cut];
 }
 if(total>50&&deck.GREEN){
  deck.GREEN-=1;
  total-=1;
  if(deck.GREEN===0)delete deck.GREEN;
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
 const choice=typeof pred==='function'?legal(pack,s).find(pred):
  legal(pack,s).find(action=>JSON.stringify(action)===JSON.stringify(pred));
 if(!choice)throw Error('missing action '+(s.pending?.kind||s.phase)+' '+JSON.stringify(legal(pack,s).slice(0,6)));
 return dispatchUniversalAction(pack,s,choice);
}
function placeSpare(s,p,id,line,slot,ready=true){
 const pl=s.players[p];
 let body=null;
 for(const zone of ['removed','deck','hand','outside','life']){
  const index=pl[zone].findIndex(card=>card?.cardId===id);
  if(index<0)continue;
  body=pl[zone].splice(index,1)[0];
  break;
 }
 if(!body)throw Error('missing spare '+id);
 const occupant=pl[line][slot];
 if(occupant){pl[line][slot]=null;pl.removed.push(occupant);}
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 pl[line][slot]=body;
 return body;
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

test('MHA-2-041 pays one AP, then retires BP 2500 or draws two',()=>{
 const unpaid=open(2041);
 clearLines(unpaid.s,0);
 clearLines(unpaid.s,1);
 const body=hold(unpaid.s,'MHA-2-041');
 seat(unpaid.s,1,'CAP','front',0,true);
 assert.equal(legal(unpaid.pack,unpaid.s).some(a=>a.type==='play'&&a.uid===body.uid),false);
 seat(unpaid.s,0,'PURPLE','energy',0,true);
 seat(unpaid.s,0,'MHA-2-047','energy',1,true);
 unpaid.s.players[0].apCards.forEach(ap=>{ap.ready=false;});
 assert.equal(legal(unpaid.pack,unpaid.s).some(a=>a.type==='play'&&a.uid===body.uid),false);

 let {pack,s}=open(2042);
 clearLines(s,0);
 clearLines(s,1);
 seat(s,0,'PURPLE','energy',0,true);
 seat(s,0,'MHA-2-047','energy',1,true);
 const self=hold(s,'MHA-2-041');
 const cap=seat(s,1,'CAP','front',0,true);
 const low=seat(s,1,'LOW','front',1,true);
 s=act(pack,s,a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.equal(s.pending,null);
 assert.equal(live(s,1,cap.uid).cardId,'CAP');

 let paid=open(2043);
 clearLines(paid.s,0);
 clearLines(paid.s,1);
 seat(paid.s,0,'PURPLE','energy',0,true);
 seat(paid.s,0,'MHA-2-047','energy',1,true);
 readyAp(paid.s);
 const card=hold(paid.s,'MHA-2-041');
 const legalCap=seat(paid.s,1,'CAP','front',0,true);
 const illegal=seat(paid.s,1,'LOW','front',1,true);
 const deck=paid.s.players[0].deck.length;
 paid.s=act(paid.pack,paid.s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 assert.equal(paid.s.pending.kind,'effect-optional-pay-ap');
 const skipped=act(paid.pack,structuredClone(paid.s),a=>a.type==='chooseOptionalPayAp'&&a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,deck);
 paid.s=act(paid.pack,paid.s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(paid.s.pending.kind,'effect-choice-mode');
 assert.deepEqual(paid.s.pending.options.map(o=>o.id).sort(),['draw','retire']);
 const drawn=act(paid.pack,structuredClone(paid.s),a=>a.type==='chooseEffectMode'&&a.mode==='draw');
 assert.equal(drawn.players[0].deck.length,deck-2);
 assert.equal(live(drawn,1,legalCap.uid).cardId,'CAP');
 paid.s=act(paid.pack,paid.s,a=>a.type==='chooseEffectMode'&&a.mode==='retire');
 assert.equal(paid.s.pending.kind,'effect-retire-bp');
 assert.equal(paid.s.pending.choices.includes(legalCap.uid),true);
 assert.equal(paid.s.pending.choices.includes(illegal.uid),false);
 assert.throws(()=>dispatchUniversalAction(paid.pack,paid.s,{type:'chooseRetireBp',uid:'missing'}));
 const passed=act(paid.pack,structuredClone(paid.s),a=>a.type==='chooseRetireBp'&&a.uid===null);
 assert.equal(live(passed,1,legalCap.uid).cardId,'CAP');
 const retired=act(paid.pack,paid.s,a=>a.type==='chooseRetireBp'&&a.uid===legalCap.uid);
 assert.equal(live(retired,1,legalCap.uid),null);
 assert.equal(live(retired,1,illegal.uid).cardId,'LOW');
 assert.equal(assertUniversalMatch(paid.pack,retired),true);
});

test('MHA-2-045 pays two hand cards for sniper that cannot name BP 3000 or more',()=>{
 const broke=open(2045);
 clearLines(broke.s,0);
 const short=seat(broke.s,0,'MHA-2-045','front',0,true);
 seat(broke.s,0,'PURPLE','energy',0,true);
 while(broke.s.players[0].hand.length>1)broke.s.players[0].removed.push(broke.s.players[0].hand.pop());
 readyAp(broke.s);
 assert.equal(legal(broke.pack,broke.s).some(a=>a.type==='activate'&&a.uid===short.uid),false);

 let {pack,s}=open(2046);
 clearLines(s,0);
 clearLines(s,1);
 seat(s,0,'PURPLE','energy',0,true);
 const self=seat(s,0,'MHA-2-045','energy',1,true);
 readyAp(s);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='oncePay'),true);
 const front=seat(s,0,'MHA-2-045','front',0,true);
 const parked=s.players[0].energy[1];
 s.players[0].energy[1]=null;
 s.players[0].removed.push(parked);
 const cap=seat(s,1,'CAP','front',0,true);
 const low=seat(s,1,'LOW','front',1,true);
 while(s.players[0].hand.length<2)s.players[0].hand.push(pull(s,0,'PLAIN'));
 const spare=s.players[0].hand.slice(0,2);
 s=act(pack,s,a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='oncePay');
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.pending.count,2);
 s=act(pack,s,a=>a.type==='chooseDiscardGate'&&a.uids&&a.uids.includes(spare[0].uid)&&a.uids.includes(spare[1].uid));
 assert.equal(s.pending,null);
 assert.equal(live(s,0,front.uid).sniperGranted.maxBp,3000);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare[0].uid),true);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===front.uid),false);
 const swinging=reach(pack,s,'attack');
 live(swinging,0,front.uid).ready=true;
 const attacks=legal(pack,swinging).filter(a=>a.type==='attack'&&a.uid===front.uid);
 assert.equal(attacks.some(a=>a.targetUid===cap.uid),true);
 assert.equal(attacks.some(a=>a.targetUid===low.uid),false);
 assert.equal(assertUniversalMatch(pack,swinging),true);
});

test('MHA-2-060 cuts two green in hand and adds energy beside another four-cost character',()=>{
 let {pack,s}=open(2060);
 clearLines(s,0);
 const printed=pack.cards['MHA-2-060'];
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),4);
 const self=seat(s,0,'MHA-2-060','energy',0,false);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 const cheap=seat(s,0,'COST3','energy',1,false);
 assert.equal(universalCardEnergy(pack,s,0,self),1);
 cheap.buffs=[{requiredEnergy:2,untilTurn:s.turn}];
 assert.equal(universalCardEnergy(pack,s,0,self),2);
 cheap.buffs=[];
 const costly=seat(s,0,'COST4','energy',2,false);
 assert.equal(universalCardEnergy(pack,s,0,self),2);
 assert.equal(universalCardEnergy(pack,s,0,costly),1);
 const twin=seat(s,0,'MHA-2-060','energy',3,false);
 assert.equal(universalCardEnergy(pack,s,0,twin),2);

 let paid=open(2061);
 clearLines(paid.s,0);
 const copy=hold(paid.s,'MHA-2-060');
 readyAp(paid.s);
 assert.equal(legal(paid.pack,paid.s).some(a=>a.type==='play'&&a.uid===copy.uid),false);
 seat(paid.s,0,'GREEN','energy',0,true);
 assert.equal(legal(paid.pack,paid.s).some(a=>a.type==='play'&&a.uid===copy.uid&&a.line==='front'),true);
 paid.s=act(paid.pack,paid.s,a=>a.type==='play'&&a.uid===copy.uid&&a.line==='front');
 assert.equal(paid.s.players[0].front.some(card=>card?.uid===copy.uid),true);
 assert.equal(assertUniversalMatch(paid.pack,paid.s),true);
});

test('MHA-2-037 takes a name or trait without discarding, then readies one AP',()=>{
 const yel=fixture({id:'YEL', name:'黃燃料', color:'yellow', gen:2});
 const deku=fixture({id:'DEKU', name:'緑谷 出久', color:'yellow', bp:2000});
 const ofa=fixture({id:'OFA', name:'繼承', color:'yellow', traits:['ワン・フォー・オール']});
 const look=[yel,deku,ofa];
 let {pack,s}=open(2037,look);
 clearLines(s,0);
 seat(s,0,'YEL','energy',0,true);
 readyAp(s);
 const resting=s.players[0].apCards.find(card=>card.inPlay);
 resting.ready=false;
 const event=hold(s,'MHA-2-037');
 const named=pull(s,0,'DEKU');
 const trait=pull(s,0,'OFA');
 const plain=pull(s,0,'PLAIN');
 const other=pull(s,0,'NAGANT');
 s.players[0].deck.unshift(other,plain,trait,named);
 const handBefore=s.players[0].hand.map(card=>card.uid);
 s=act(pack,s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.discard,false);
 assert.equal(shownUids(pack,s).length,4);
 assert.equal(s.pending.choices.includes(named.uid),true);
 assert.equal(s.pending.choices.includes(trait.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 s=act(pack,s,action=>action.type==='chooseTopFiltered'&&action.uid===named.uid);
 s=order(pack,s);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.players[0].hand.some(card=>card.uid===named.uid),true);
 assert.equal(s.players[0].outside.some(card=>card.uid!==event.uid&&handBefore.includes(card.uid)),false);
 s=act(pack,s,action=>action.type==='chooseApRecovery'&&action.uid===resting.uid);
 assert.equal(s.players[0].apCards.some(card=>card.uid===resting.uid&&card.ready),true);
 assert.equal(s.pending,null);

 let skipped=open(2038,look);
 clearLines(skipped.s,0);
 seat(skipped.s,0,'YEL','energy',0,true);
 readyAp(skipped.s);
 const asleep=skipped.s.players[0].apCards.find(card=>card.inPlay);
 asleep.ready=false;
 const again=hold(skipped.s,'MHA-2-037');
 const left=pull(skipped.s,0,'DEKU');
 skipped.s.players[0].deck.unshift(pull(skipped.s,0,'PLAIN'),left);
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='event'&&action.uid===again.uid);
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='chooseTopFiltered'&&action.uid===null);
 skipped.s=order(skipped.pack,skipped.s);
 assert.equal(skipped.s.pending.kind,'effect-recover-ap');
 assert.equal(skipped.s.players[0].hand.some(card=>card.uid===left.uid),false);
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='chooseApRecovery'&&action.uid===null);
 assert.equal(skipped.s.players[0].apCards.some(card=>card.uid===asleep.uid&&card.ready),false);
});

test('MHA-2-043 discards only when the look adds a card, then rests and retires to draw',()=>{
 const afo=fixture({id:'AFO', name:'オール・フォー・ワン', color:'purple', bp:2000});
 let {pack,s}=open(2043,[afo]);
 clearLines(s,0);
 seat(s,0,'PURPLE','energy',0,true);
 const self=hold(s,'MHA-2-043');
 const named=pull(s,0,'AFO');
 const plain=pull(s,0,'PLAIN');
 s.players[0].deck.unshift(plain,pull(s,0,'MID'),pull(s,0,'HIGH'),named);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 assert.equal(s.pending.choices.includes(named.uid),true);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 s=act(pack,s,action=>action.type==='chooseTopFiltered'&&action.uid===named.uid);
 s=order(pack,s);
 assert.equal(s.pending.kind,'effect-discard');
 const spare=s.players[0].hand.find(card=>card.uid!==named.uid);
 s=act(pack,s,action=>action.type==='chooseDiscard'&&action.uid===spare.uid);
 assert.equal(s.players[0].outside.some(card=>card.uid===spare.uid),true);
 assert.equal(s.players[0].hand.some(card=>card.uid===named.uid),true);
 const body=s.players[0].front.find(card=>card?.uid===self.uid);
 body.ready=true;
 const parked=s.players[0].hand.length;
 s=act(pack,s,action=>action.type==='activate'&&action.uid===body.uid&&
  action.mode==='restRetireDraw');
 assert.equal(s.players[0].outside.some(card=>card.uid===body.uid),true);
 assert.equal(s.players[0].front.some(card=>card?.uid===body.uid),false);
 assert.equal(s.pending.kind,'effect-discard');
 const next=s.players[0].hand[0];
 s=act(pack,s,action=>action.type==='chooseDiscard'&&action.uid===next.uid);
 assert.equal(s.players[0].outside.some(card=>card.uid===next.uid),true);
 assert.equal(s.players[0].hand.length,parked);
 assert.equal(s.pending,null);

 let passed=open(2044,[afo]);
 clearLines(passed.s,0);
 seat(passed.s,0,'PURPLE','energy',0,true);
 const doctor=hold(passed.s,'MHA-2-043');
 const hidden=pull(passed.s,0,'AFO');
 passed.s.players[0].deck.unshift(pull(passed.s,0,'PLAIN'),hidden);
 const outside=passed.s.players[0].outside.length;
 passed.s=act(passed.pack,passed.s,action=>action.type==='play'&&action.uid===doctor.uid&&
  action.line==='front');
 passed.s=act(passed.pack,passed.s,action=>action.type==='chooseTopFiltered'&&action.uid===null);
 passed.s=order(passed.pack,passed.s);
 assert.equal(passed.s.pending,null);
 assert.equal(passed.s.players[0].hand.some(card=>card.uid===hidden.uid),false);
 assert.equal(passed.s.players[0].outside.length,outside);
});

test('MHA-2-044 pays one AP to draw and does not gain energy',()=>{
 let {pack,s}=open(2045);
 clearLines(s,0);
 const self=seat(s,0,'MHA-2-044','energy',0,false);
 readyAp(s);
 const before=s.players[0].hand.length;
 const energy=universalCardEnergy(pack,s,0,self);
 s=act(pack,s,action=>action.type==='activate'&&action.uid===self.uid&&action.mode==='payApDraw');
 const liveCard=s.players[0].energy.find(card=>card?.uid===self.uid);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.players[0].apCards.filter(card=>card.inPlay&&card.ready).length,
  s.players[0].apCards.filter(card=>card.inPlay).length-1);
 assert.equal((liveCard.buffs||[]).some(buff=>buff.energy),false);
 assert.equal(universalCardEnergy(pack,s,0,liveCard),energy);
 assert.equal(legal(pack,s).some(action=>action.type==='activate'&&action.uid===self.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-2-048 gains damage 2 only while six Shie Hassaikai cards are outside',()=>{
 const shie=[1,2,3,4,5,6].map(n=>fixture({
  id:'SHIE-'+n, name:'死穢'+n, color:'purple', traits:['死穢八斎會']
 }));
 let {pack,s}=open(2048,shie);
 clearLines(s,0);
 const self=seat(s,0,'MHA-2-048','front',0,true);
 const bodies=shie.map(card=>pull(s,0,card.id));
 s.players[0].outside.push(...bodies.slice(0,5));
 assert.equal(universalAttackDamage(pack,s,self),1);
 s.players[0].outside.push(bodies[5]);
 assert.equal(universalAttackDamage(pack,s,self),2);
 assert.equal(assertUniversalMatch(pack,s),true);
});

const redFuel=fixture({id:'RFUEL', name:'紅燃料四', color:'red', gen:4, bp:1000});
const shoutBlocker=fixture({
 id:'SHOUT', name:'喊', bp:2000, implementation:'dsl',
 effects:{onBlock:[{op:'draw', count:1}], onRetire:[{op:'draw', count:1}]}
});
function trimHand(s,p,count){
 const pl=s.players[p];
 while(pl.hand.length>count)pl.deck.push(pl.hand.pop());
}
function blankLife(s,p){
 const pl=s.players[p];
 const quietIds=new Set(['PLAIN','CAP','LOW','MID','HIGH','WALL','OVER','NAGANT','COST3','COST4','COST5']);
 const quiet=[];
 for(const zone of ['deck','hand','outside','removed']){
  for(let i=pl[zone].length-1;i>=0&&quiet.length<4;i--){
   if(!quietIds.has(pl[zone][i]?.cardId))continue;
   quiet.push(pl[zone].splice(i,1)[0]);
  }
 }
 pl.removed.push(...pl.life.splice(0));
 pl.life.push(...quiet);
}
function colorLife(extra){
 return fixture({
  id:extra.id, name:extra.name||extra.id, color:extra.color||'red', bp:1000,
  trigger:'color', triggerEffect:{op:'retireOppFrontUnderBp', bp:extra.bp}
 });
}

test('MHA-2-062 gains damage 2 at three hand cards and silences block and battle leave',()=>{
 let {pack,s}=open(2062,[shoutBlocker]);
 clearLines(s,0);
 clearLines(s,1);
 const self=seat(s,0,'MHA-2-062','front',0,true);
 trimHand(s,0,4);
 assert.equal(universalAttackDamage(pack,s,self),1);
 trimHand(s,0,3);
 assert.equal(universalAttackDamage(pack,s,self),2);
 const blocker=seat(s,1,'SHOUT','front',0,true);
 const deck=s.players[1].deck.length;
 s=reach(pack,s,'attack');
 s=act(pack,s,action=>action.type==='attack'&&action.uid===self.uid);
 s=act(pack,s,action=>action.type==='chooseBlock'&&action.uid===blocker.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].deck.length,deck);
 assert.equal(s.players[1].outside.some(card=>card.uid===blocker.uid),true);
 assert.equal(live(s,1,blocker.uid),null);
 assert.equal(assertUniversalMatch(pack,s),true);

 let plain=open(20620,[shoutBlocker]);
 clearLines(plain.s,0);
 clearLines(plain.s,1);
 const attacker=seat(plain.s,0,'PLAIN','front',0,true);
 const wall=seat(plain.s,1,'SHOUT','front',0,true);
 const before=plain.s.players[1].deck.length;
 plain.s=reach(plain.pack,plain.s,'attack');
 plain.s=act(plain.pack,plain.s,action=>action.type==='attack'&&action.uid===attacker.uid);
 plain.s=act(plain.pack,plain.s,action=>action.type==='chooseBlock'&&action.uid===wall.uid);
 assert.equal(plain.s.players[1].deck.length,before-2);
 assert.equal(plain.s.players[1].outside.some(card=>card.uid===wall.uid),true);
});

test('MHA-2-066 stays once, raises front BP and the BP window, and raids Kirishima',()=>{
 let {pack,s}=open(2066);
 clearLines(s,0);
 clearLines(s,1);
 const self=seat(s,0,'MHA-2-066','energy',0,true);
 const ally=seat(s,0,'PLAIN','front',0,true);
 assert.equal(universalBp(pack,s,self),3500);
 assert.equal(universalBp(pack,s,ally),3000);
 s.active=1;
 assert.equal(universalBp(pack,s,self),4000);
 assert.equal(universalBp(pack,s,ally),3000);
 s.active=0;
 const front=seat(s,0,'MHA-2-066','front',1,true);
 assert.equal(universalBp(pack,s,ally),3500);
 assert.equal(universalBp(pack,s,front),4000);
 s.players[0].energy[0]=null;
 s.players[0].front[2]=self;
 const second=self;
 assert.equal(universalBp(pack,s,ally),4000);
 assert.equal(universalBp(pack,s,front),4500);
 assert.equal(universalBp(pack,s,second),4500);
 s.players[0].front[2]=null;
 s.players[0].removed.push(second);
 seat(s,0,'PURPLE','energy',1,true);
 readyAp(s);
 const mid=seat(s,1,'MID','front',0,true);
 const wall=seat(s,1,'WALL','front',1,true);
 const over=seat(s,1,'OVER','front',2,true);
 const event=hold(s,'MHA-2-049');
 s=act(pack,s,action=>action.type==='event'&&action.uid===event.uid);
 assert.equal(s.pending.choices.includes(mid.uid),true);
 assert.equal(s.pending.choices.includes(wall.uid),false);
 assert.equal(s.pending.choices.includes(over.uid),false);
 s=act(pack,s,action=>action.type==='chooseRetireBp'&&action.uid===mid.uid);
 const copy=placeSpare(s,0,'MHA-2-066','front',2,true);
 readyAp(s);
 const again=hold(s,'MHA-2-049');
 s=act(pack,s,action=>action.type==='event'&&action.uid===again.uid);
 assert.equal(s.pending.choices.includes(wall.uid),true);
 assert.equal(s.pending.choices.includes(over.uid),false);
 s=act(pack,s,action=>action.type==='chooseRetireBp'&&action.uid===wall.uid);
 assert.equal(copy.uid.length>0,true);

 const lifeA=colorLife({id:'STAY-A', bp:5000});
 const lifeB=colorLife({id:'STAY-B', bp:5000});
 let stay=open(20661,[lifeA,lifeB]);
 clearLines(stay.s,0);
 clearLines(stay.s,1);
 const home=seat(stay.s,0,'MHA-2-066','front',0,true);
 const striker=seat(stay.s,0,'PLAIN','front',1,true);
 const first=pull(stay.s,1,'STAY-A');
 const next=pull(stay.s,1,'STAY-B');
 stay.s.players[1].life.unshift(next,first);
 stay.s=reach(stay.pack,stay.s,'attack');
 stay.s=act(stay.pack,stay.s,action=>action.type==='attack'&&action.uid===striker.uid);
 stay.s=act(stay.pack,stay.s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(stay.s.pending?.kind==='attack-life-target')
  stay.s=act(stay.pack,stay.s,action=>action.type==='chooseAttackLife');
 assert.equal(stay.s.pending.kind,'life-trigger');
 stay.s=act(stay.pack,stay.s,action=>action.type==='chooseTrigger'&&action.uid===home.uid);
 assert.equal(live(stay.s,0,home.uid)?.cardId,'MHA-2-066');
 live(stay.s,0,striker.uid).ready=true;
 stay.s=act(stay.pack,stay.s,action=>action.type==='attack'&&action.uid===striker.uid);
 stay.s=act(stay.pack,stay.s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(stay.s.pending?.kind==='attack-life-target')
  stay.s=act(stay.pack,stay.s,action=>action.type==='chooseAttackLife');
 stay.s=act(stay.pack,stay.s,action=>action.type==='chooseTrigger'&&action.uid===home.uid);
 assert.equal(stay.s.players[0].outside.some(card=>card.uid===home.uid),true);

 let raid=open(20662,[redFuel,fixture({id:'KIRI', name:'切島 鋭児郎', color:'red', bp:2000})]);
 clearLines(raid.s,0);
 seat(raid.s,0,'RFUEL','energy',0,true);
 readyAp(raid.s);
 const base=seat(raid.s,0,'KIRI','energy',1,false);
 const raider=hold(raid.s,'MHA-2-066');
 raid.s=act(raid.pack,raid.s,action=>action.type==='raid'&&action.uid===raider.uid&&
  action.baseUid===base.uid&&action.slot===0&&action.line!=='energy');
 const arrived=raid.s.players[0].front.find(card=>card?.uid===raider.uid);
 assert.equal(arrived.ready,true);
 assert.equal(arrived.stack.some(card=>card.uid===base.uid),true);
 assert.equal(assertUniversalMatch(raid.pack,raid.s),true);
});

test('MHA-2-067 pays one AP and then activates itself or rests a BP 3000 front',()=>{
 let skipped=open(2067,[redFuel]);
 clearLines(skipped.s,0);
 clearLines(skipped.s,1);
 seat(skipped.s,0,'RFUEL','energy',0,true);
 readyAp(skipped.s);
 const quiet=hold(skipped.s,'MHA-2-067');
 const tall=seat(skipped.s,1,'MID','front',0,true);
 skipped.s=act(skipped.pack,skipped.s,action=>action.type==='play'&&action.uid===quiet.uid&&
  action.line==='front');
 skipped.s=act(skipped.pack,skipped.s,{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.s.pending,null);
 assert.equal(live(skipped.s,0,quiet.uid).ready,false);
 assert.equal(live(skipped.s,1,tall.uid).ready,true);

 let {pack,s}=open(20671,[redFuel]);
 clearLines(s,0);
 clearLines(s,1);
 seat(s,0,'RFUEL','energy',0,true);
 readyAp(s);
 const self=hold(s,'MHA-2-067');
 const low=seat(s,1,'LOW','front',0,true);
 const mid=seat(s,1,'MID','front',1,true);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 s=act(pack,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=act(pack,s,action=>action.type==='chooseEffectMode'&&action.mode==='rest');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(mid.uid),false);
 s=act(pack,s,action=>action.type==='chooseRestBp'&&action.uid===low.uid);
 assert.equal(live(s,1,low.uid).ready,false);
 assert.equal(s.continuousStates.some(state=>state.kind==='skipNextActive'&&
  state.targetUid===low.uid&&state.consumed!==true),true);
 s=reach(pack,s,'start',1);
 assert.equal(live(s,1,low.uid).ready,false);
 assert.equal(s.continuousStates.some(state=>state.kind==='skipNextActive'&&
  state.targetUid===low.uid&&!state.consumed),false);

 let ready=open(20672,[redFuel]);
 clearLines(ready.s,0);
 seat(ready.s,0,'RFUEL','energy',0,true);
 readyAp(ready.s);
 const body=hold(ready.s,'MHA-2-067');
 ready.s=act(ready.pack,ready.s,action=>action.type==='play'&&action.uid===body.uid&&
  action.line==='front');
 ready.s=act(ready.pack,ready.s,{type:'chooseOptionalPayAp',mode:'pay'});
 ready.s=act(ready.pack,ready.s,action=>action.type==='chooseEffectMode'&&action.mode==='self');
 const stood=live(ready.s,0,body.uid);
 assert.equal(stood.ready,true);
 assert.equal(universalBp(ready.pack,ready.s,stood),4000);
 assert.equal(assertUniversalMatch(ready.pack,ready.s),true);
});

test('MHA-2-068 widens only a red color trigger on the opponent turn and pays for impact',()=>{
 const red=colorLife({id:'RED-COLOR', bp:2500});
 const blue=colorLife({id:'BLUE-COLOR', color:'blue', bp:2500});
 let {pack,s}=open(2068,[red,blue]);
 clearLines(s,0);
 clearLines(s,1);
 const self=seat(s,0,'MHA-2-068','front',0,true);
 const mid=seat(s,1,'MID','front',0,true);
 const wall=seat(s,1,'WALL','front',1,true);
 const revealed=pull(s,0,'RED-COLOR');
 s.players[0].life.unshift(revealed);
 s=reach(pack,s,'attack',1);
 const striker=seat(s,1,'PLAIN','front',2,true);
 s=act(pack,s,action=>action.type==='attack'&&action.uid===striker.uid);
 s=act(pack,s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(s.pending?.kind==='attack-life-target')
  s=act(pack,s,action=>action.type==='chooseAttackLife');
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(legal(pack,s).some(action=>action.uid===mid.uid),true);
 assert.equal(legal(pack,s).some(action=>action.uid===wall.uid),false);
 s.active=0;
 assert.equal(legal(pack,s).some(action=>action.uid===mid.uid),false);
 s.active=1;
 s=act(pack,s,action=>action.type==='chooseTrigger'&&action.mode==='colorRetire'&&
  action.uid===mid.uid);
 assert.equal(s.players[1].outside.some(card=>card.uid===mid.uid),true);

 let pair=open(20680,[red]);
 clearLines(pair.s,0);
 clearLines(pair.s,1);
 seat(pair.s,0,'MHA-2-068','front',0,true);
 placeSpare(pair.s,0,'MHA-2-068','front',1,true);
 const high=seat(pair.s,1,'WALL','front',0,true);
 const over=seat(pair.s,1,'HIGH','front',1,true);
 const top=pull(pair.s,0,'RED-COLOR');
 pair.s.players[0].life.unshift(top);
 pair.s=reach(pair.pack,pair.s,'attack',1);
 const hitter=seat(pair.s,1,'PLAIN','front',2,true);
 pair.s=act(pair.pack,pair.s,action=>action.type==='attack'&&action.uid===hitter.uid);
 pair.s=act(pair.pack,pair.s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(pair.s.pending?.kind==='attack-life-target')
  pair.s=act(pair.pack,pair.s,action=>action.type==='chooseAttackLife');
 assert.equal(legal(pair.pack,pair.s).some(action=>action.uid===high.uid),true);
 assert.equal(legal(pair.pack,pair.s).some(action=>action.uid===over.uid),false);
 pair.s=act(pair.pack,pair.s,action=>action.type==='chooseTrigger'&&action.mode==='skip');

 let other=open(20681,[blue]);
 clearLines(other.s,0);
 clearLines(other.s,1);
 seat(other.s,0,'MHA-2-068','front',0,true);
 const missed=seat(other.s,1,'MID','front',0,true);
 const blueTop=pull(other.s,0,'BLUE-COLOR');
 other.s.players[0].life.unshift(blueTop);
 other.s=reach(other.pack,other.s,'attack',1);
 const blueHitter=seat(other.s,1,'PLAIN','front',1,true);
 other.s=act(other.pack,other.s,action=>action.type==='attack'&&action.uid===blueHitter.uid);
 other.s=act(other.pack,other.s,action=>action.type==='chooseBlock'&&action.uid===null);
 if(other.s.pending?.kind==='attack-life-target')
  other.s=act(other.pack,other.s,action=>action.type==='chooseAttackLife');
 assert.equal(legal(other.pack,other.s).some(action=>action.uid===missed.uid),false);

 let paid=open(20682,[redFuel]);
 clearLines(paid.s,0);
 clearLines(paid.s,1);
 seat(paid.s,0,'RFUEL','energy',0,true);
 readyAp(paid.s);
 const body=hold(paid.s,'MHA-2-068');
 const small=seat(paid.s,1,'CAP','front',0,true);
 const large=seat(paid.s,1,'LOW','front',1,true);
 paid.s=act(paid.pack,paid.s,action=>action.type==='play'&&action.uid===body.uid&&
  action.line==='front');
 paid.s=act(paid.pack,paid.s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(paid.s.pending.choices.includes(small.uid),true);
 assert.equal(paid.s.pending.choices.includes(large.uid),false);
 paid.s=act(paid.pack,paid.s,action=>action.type==='chooseRetireBp'&&action.uid===small.uid);
 const stood=live(paid.s,0,body.uid);
 assert.equal(legal(paid.pack,paid.s).some(action=>action.type==='activate'&&
  action.uid===stood.uid&&action.mode==='oncePay'),true);
 paid.s.players[0].apCards.forEach(ap=>{ap.ready=false;});
 assert.equal(legal(paid.pack,paid.s).some(action=>action.uid===stood.uid&&
  action.mode==='oncePay'),false);
 readyAp(paid.s);
 paid.s=act(paid.pack,paid.s,action=>action.type==='activate'&&action.uid===stood.uid&&
  action.mode==='oncePay');
 const impacted=live(paid.s,0,stood.uid);
 assert.equal(universalImpact(paid.pack,paid.s,impacted),1);
 assert.equal(legal(paid.pack,paid.s).some(action=>action.uid===stood.uid&&
  action.mode==='oncePay'),false);
 assert.equal(assertUniversalMatch(paid.pack,paid.s),true);
});

test('MHA-2-069 tucks a deck top facedown and looks at it on attack',()=>{
 let {pack,s}=open(2069);
 clearLines(s,0);
 seat(s,0,'RED','energy',0,true);
 const self=hold(s,'MHA-2-069');
 const hidden=pull(s,0,'PLAIN');
 s.players[0].deck.unshift(hidden);
 s=act(pack,s,action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 assert.equal(s.pending.kind,'effect-optional-tuck-under');
 assert.equal(universalPrivateChoices(pack,s,1),null);
 s=act(pack,s,{type:'chooseOptionalTuck',mode:'tuck'});
 const entered=live(s,0,self.uid);
 assert.equal(entered.under.some(card=>card.uid===hidden.uid&&card.faceDown===true),true);
 const spare=pull(s,0,'CAP');
 spare.faceDown=true;
 entered.under.push(spare);
 entered.ready=true;
 s=reach(pack,s,'attack');
 s=act(pack,s,action=>action.type==='attack'&&action.uid===entered.uid);
 assert.equal(s.pending.kind,'effect-look-under-order');
 const viewed=universalPrivateChoices(pack,s,0);
 assert.equal(viewed.options.some(row=>row.action.uid===hidden.uid&&row.card.name==='路人'),true);
 assert.equal(viewed.options.some(row=>row.action.uid===spare.uid&&row.card.cardId==='CAP'),true);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 s=act(pack,s,action=>action.type==='chooseLookUnderOrder'&&action.uid===hidden.uid&&
  action.order.length===1&&action.order[0]===spare.uid);
 const host=live(s,0,self.uid);
 assert.equal(s.players[0].hand.some(card=>card.uid===hidden.uid&&card.faceDown!==true),true);
 assert.deepEqual(host.under.filter(card=>card.faceDown).map(card=>card.uid),[spare.uid]);
 const pay=s.players[0].hand.find(card=>card.uid!==hidden.uid);
 s=act(pack,s,action=>action.type==='choosePlaceHandOutside'&&action.uid===pay.uid);
 assert.equal(s.players[0].outside.some(card=>card.uid===pay.uid),true);
 if(s.pending?.kind==='block')s=act(pack,s,action=>action.uid===null);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-2-070 activates a required-energy 5 character after a hand card left',()=>{
 let {pack,s}=open(2070);
 clearLines(s,0);
 const self=seat(s,0,'MHA-2-070','front',0,true);
 const high=seat(s,0,'COST5','energy',0,false);
 const low=seat(s,0,'COST4','energy',1,false);
 assert.equal(legal(pack,s).some(action=>action.type==='activate'&&action.uid===self.uid),false);
 const payer=seat(s,0,'MHA-2-072','front',1,true);
 const cost=hold(s,'PLAIN');
 s=act(pack,s,action=>action.type==='activate'&&action.uid===payer.uid&&action.mode==='frontOnce');
 s=act(pack,s,action=>action.type==='chooseDiscardGate'&&action.uid===cost.uid);
 s=act(pack,s,action=>action.type==='chooseImpactGrant'&&action.uid===high.uid);
 assert.equal(legal(pack,s).some(action=>action.type==='activate'&&action.uid===self.uid&&
  action.mode==='frontOnce'),true);
 s=act(pack,s,action=>action.type==='activate'&&action.uid===self.uid&&action.mode==='frontOnce');
 assert.equal(s.pending.kind,'effect-active-energy-buff');
 assert.equal(s.pending.choices.includes(high.uid),true);
 assert.equal(s.pending.choices.includes(self.uid),false);
 assert.equal(s.pending.choices.includes(low.uid),false);
 assert.equal(legal(pack,s).some(action=>action.uid===null),false);
 s=act(pack,s,action=>action.type==='chooseActiveEnergyBuff'&&action.uid===high.uid);
 assert.equal(live(s,0,high.uid).ready,true);
 assert.equal(universalBp(pack,s,live(s,0,high.uid)),3500);
 assert.equal(legal(pack,s).some(action=>action.uid===self.uid&&action.mode==='frontOnce'),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('MHA-2-072 raids, steps, grants impact plus one, and draws only on the first short-hand attack',()=>{
 let {pack,s}=open(2072,[redFuel,fixture({id:'MIRKO', name:'ミルコ', color:'red', bp:2000})]);
 clearLines(s,0);
 seat(s,0,'RFUEL','energy',0,true);
 readyAp(s);
 const base=seat(s,0,'MIRKO','energy',1,false);
 const raider=hold(s,'MHA-2-072');
 s=act(pack,s,action=>action.type==='raid'&&action.uid===raider.uid&&
  action.baseUid===base.uid&&action.slot===0&&action.line!=='energy');
 const self=live(s,0,raider.uid);
 assert.equal(self.ready,true);
 assert.equal(self.stack.some(card=>card.uid===base.uid),true);
 s=reach(pack,s,'move');
 assert.equal(legal(pack,s).some(action=>action.type==='step'&&action.uid===self.uid),true);
 s=act(pack,s,action=>action.type==='step'&&action.uid===self.uid);
 assert.equal(s.players[0].energy.some(card=>card?.uid===self.uid),true);

 let main=open(20721);
 clearLines(main.s,0);
 const source=seat(main.s,0,'MHA-2-072','energy',0,true);
 const other=seat(main.s,0,'IMPACT','front',0,true);
 hold(main.s,'PLAIN');
 assert.equal(legal(main.pack,main.s).some(action=>action.uid===source.uid&&
  action.mode==='frontOnce'),false);
 const front=seat(main.s,0,'MHA-2-072','front',1,true);
 const pay=hold(main.s,'CAP');
 main.s=act(main.pack,main.s,action=>action.type==='activate'&&action.uid===front.uid&&
  action.mode==='frontOnce');
 main.s=act(main.pack,main.s,action=>action.type==='chooseDiscardGate'&&action.uid===pay.uid);
 assert.equal(main.s.pending.choices.includes(front.uid),false);
 assert.equal(main.s.pending.choices.includes(other.uid),true);
 main.s=act(main.pack,main.s,action=>action.type==='chooseImpactGrant'&&action.uid===other.uid);
 const granted=live(main.s,0,other.uid);
 assert.equal(universalImpact(main.pack,main.s,granted),2);
 assert.equal(universalBp(main.pack,main.s,granted),6000);
 assert.equal(main.s.players[0].outside.some(card=>card.uid===pay.uid),true);
 assert.equal(legal(main.pack,main.s).some(action=>action.uid===front.uid&&
  action.mode==='frontOnce'),false);

 let swing=open(20722);
 clearLines(swing.s,0);
 const attacker=seat(swing.s,0,'MHA-2-072','front',0,true);
 trimHand(swing.s,0,4);
 swing.s=reach(swing.pack,swing.s,'attack');
 blankLife(swing.s,1);
 const full=swing.s.players[0].deck.length;
 swing.s=act(swing.pack,swing.s,action=>action.type==='attack'&&action.uid===attacker.uid);
 if(swing.s.pending?.kind==='block')
  swing.s=act(swing.pack,swing.s,action=>action.uid===null);
 assert.equal(swing.s.pending,null);
 assert.equal(universalBp(swing.pack,swing.s,live(swing.s,0,attacker.uid)),3000);
 assert.equal(swing.s.players[0].deck.length,full);
 trimHand(swing.s,0,3);
 live(swing.s,0,attacker.uid).ready=true;
 const before=swing.s.players[0].deck.length;
 swing.s=act(swing.pack,swing.s,action=>action.type==='attack'&&action.uid===attacker.uid);
 if(swing.s.pending?.kind==='block')
  swing.s=act(swing.pack,swing.s,action=>action.uid===null);
 assert.equal(swing.s.pending.kind,'effect-may-draw');
 swing.s=act(swing.pack,swing.s,{type:'chooseMayDraw',mode:'skip'});
 if(swing.s.pending?.kind==='block')
  swing.s=act(swing.pack,swing.s,action=>action.type==='chooseBlock'&&action.uid===null);
 assert.equal(universalBp(swing.pack,swing.s,live(swing.s,0,attacker.uid)),4000);
 assert.equal(swing.s.players[0].deck.length,before);
 live(swing.s,0,attacker.uid).ready=true;
 swing.s=act(swing.pack,swing.s,action=>action.type==='attack'&&action.uid===attacker.uid);
 if(swing.s.pending?.kind==='block')
  swing.s=act(swing.pack,swing.s,action=>action.uid===null);
 assert.equal(swing.s.pending,null);
 assert.equal(universalBp(swing.pack,swing.s,live(swing.s,0,attacker.uid)),4000);

 let empty=open(20723);
 clearLines(empty.s,0);
 const last=seat(empty.s,0,'MHA-2-072','front',0,true);
 trimHand(empty.s,0,3);
 empty.s.players[0].removed.push(...empty.s.players[0].deck.splice(0));
 empty.s=reach(empty.pack,empty.s,'attack');
 empty.s=act(empty.pack,empty.s,action=>action.type==='attack'&&action.uid===last.uid);
 if(empty.s.pending?.kind==='block')
  empty.s=act(empty.pack,empty.s,action=>action.uid===null);
 assert.equal(empty.s.pending.kind,'effect-may-draw');
 empty.s=act(empty.pack,empty.s,{type:'chooseMayDraw',mode:'skip'});
 assert.equal(universalBp(empty.pack,empty.s,live(empty.s,0,last.uid)),4000);
 assert.equal(assertUniversalMatch(empty.pack,empty.s),true);
});
