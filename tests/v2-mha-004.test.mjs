// MHA-1-004 オール・フォー・ワン. Three activate-main characters reduce
// the hand energy by 3. Impact 1. Once per turn, gainSameLineMains copies
// the other characters on the same line, except another All For One and a
// raid-box activate that is not currently raiding. Q423.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, effectiveHandRequiredEnergy, universalImpact
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const printed=MHA_CATALOG.find(c=>c.id==='MHA-1-004');
const afo=mhaBattleCard(printed, mhaProgramFor('MHA-1-004'));
const tuck={op:'onceTuckFacedown', oncePerTurn:true, from:'deckTop', host:'self', count:1};
const pay={op:'payHandGrantImpact', oncePerTurn:true, pay:1, amount:1};

function card(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'purple',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1500, gen:extra.gen??1, traits:extra.traits||[],
  trigger:null, implementation:extra.implementation||'dsl',
  effects:extra.effects||{}, ...extra
 };
}
function shell(){
 const bodies=[afo,
  card({id:'TUCK', name:'蓋牌', mainAbility:tuck}),
  card({id:'PAY', name:'付手牌', mainAbility:pay}),
  card({id:'OTHER', name:'オール・フォー・ワン', mainAbility:tuck}),
  card({id:'SIDE', name:'另一列', mainAbility:tuck}),
  card({id:'BLC-1-004', name:'突襲框', raidName:'底', mainAbility:tuck}),
  card({id:'FUEL', name:'燃料', implementation:'vanilla', effects:{}, gen:1}),
  card({id:'BIG', name:'大燃料', implementation:'vanilla', effects:{}, gen:5}),
  card({id:'SMALL', name:'小燃料', implementation:'vanilla', effects:{}, gen:4}),
  card({id:'WALL', name:'牆', implementation:'vanilla', effects:{}, bp:1000, color:'red'})
 ];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n,
   implementation:'vanilla', effects:{}, bp:1000}));
  n++;
 }
 return createUniversalPack({id:'mha-004', version:'mha-004', cards:bodies});
}
function open({seed=41}={}){
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
function top(s,id,p=0){
 const body=pull(s,p,id);
 s.players[p].deck.unshift(body);
 return body;
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
function find(s,uid){
 const piles=[...s.players[0].front,...s.players[0].energy,...s.players[0].outside];
 return piles.find(c=>c?.uid===uid)||null;
}
function silence(s,source,target){
 grantContinuousState(s,{kind:'originalEffectsDisabled', controller:0,
  sourceUid:source.uid, targetUid:target.uid, sourceLinked:false,
  until:{player:0, phase:'start', edge:'start'}});
}

test('MHA-1-004 copies same-line mains and carries the printed discount and impact',()=>{
 assert.equal(afo.name,'オール・フォー・ワン');
 assert.equal(afo.energy,8);
 assert.equal(afo.bp,5000);
 assert.equal(afo.printedImpact,1);
 assert.equal(afo.handEnergyWhileActivateMain.amount,3);
 assert.equal(afo.mainAbility.op,'gainSameLineMains');
 assert.deepEqual([...afo.mainAbility.excludeNames],['オール・フォー・ワン']);
 assert.equal(printed.faq.some(f=>f.id==='Q423'),true);
 assert.equal(createMhaV2Pack().cards['MHA-1-004'].printedImpact,1);
});

test('three live activate-main characters reduce the hand cost from 8 to 5',()=>{
 let {pack,s}=open();
 const hand=hold(s,'MHA-1-004');
 const body=pack.cards['MHA-1-004'];
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,body,hand),8);
 seat(s,0,'TUCK','front',0,true);
 seat(s,0,'PAY','front',1,true);
 const boxed=seat(s,0,'BLC-1-004','front',2,true);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,body,hand),8);
 const base=pull(s,0,'FILL-01');
 base.faceDown=false;
 boxed.stack=[base];
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,body,hand),5);
 const small=seat(s,0,'SMALL','energy',0,true);
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===hand.uid),false);
 s.players[0].energy[0]=null;
 s.players[0].deck.push(small);
 seat(s,0,'BIG','energy',0,true);
 const spare=s.players[0].apCards.find(c=>!c.inPlay);
 spare.inPlay=true;
 spare.ready=true;
 assert.equal(legal(pack,s).some(a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front'),true);
 s=act(pack,s,a=>a.type==='play'&&a.uid===hand.uid&&a.line==='front');
 const entered=s.players[0].front.find(c=>c?.cardId==='MHA-1-004');
 assert.equal(entered.ready,false);
 assert.equal(universalImpact(pack,s,entered),1);
 silence(s,entered,entered);
 assert.equal(universalImpact(pack,s,entered),0);

 let plain=open({seed:42});
 const waiting=hold(plain.s,'MHA-1-004');
 seat(plain.s,0,'BIG','energy',0,true);
 const ap=plain.s.players[0].apCards.find(c=>!c.inPlay);
 ap.inPlay=true;
 ap.ready=true;
 assert.equal(effectiveHandRequiredEnergy(plain.pack,plain.s,0,plain.pack.cards['MHA-1-004'],waiting),8);
 assert.equal(legal(plain.pack,plain.s).some(a=>a.type==='play'&&a.uid===waiting.uid),false);
 assert.throws(()=>dispatchUniversalAction(plain.pack,plain.s,
  {type:'play', uid:waiting.uid, line:'front', slot:3}),/not currently legal/);
});

test('the activate copies only the other same-line mains and replays their payment',()=>{
 let {pack,s}=open({seed:43});
 const host=seat(s,0,'MHA-1-004','front',0,true);
 const tucked=seat(s,0,'TUCK','front',1,true);
 const paid=seat(s,0,'PAY','energy',0,true);
 const named=seat(s,0,'OTHER','front',2,true);
 const otherLine=seat(s,0,'SIDE','energy',1,true);
 const hidden=seat(s,0,'BLC-1-004','front',3,true);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===host.uid&&a.mode==='gainLineMains'),true);
 s=act(pack,s,{type:'activate', uid:host.uid, mode:'gainLineMains'});
 const items=find(s,host.uid).gainedMains.items.map(item=>item.sourceUid);
 assert.deepEqual(items,[tucked.uid]);
 assert.equal(items.includes(paid.uid),false);
 assert.equal(items.includes(named.uid),false);
 assert.equal(items.includes(otherLine.uid),false);
 assert.equal(items.includes(hidden.uid),false);
 assert.equal(items.includes(host.uid),false);
 assert.equal(legal(pack,s).some(a=>a.uid===host.uid&&a.mode==='gainLineMains'),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'activate', uid:host.uid, mode:'gainLineMains'}),/not currently legal/);
 const marker=top(s,'FILL-01');
 s=act(pack,s,a=>a.type==='activate'&&a.uid===host.uid&&a.mode==='onceTuck'&&a.gained===tucked.uid);
 assert.equal(find(s,host.uid).under.some(c=>c.uid===marker.uid&&c.faceDown===true),true);
 assert.equal(legal(pack,s).some(a=>a.uid===host.uid&&a.gained===tucked.uid),false);
 assert.equal(legal(pack,s).some(a=>a.uid===tucked.uid&&a.mode==='onceTuck'),true);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'activate', uid:host.uid, mode:'onceTuck', gained:named.uid}),/not currently legal/);

 let moved=open({seed:44});
 const buyer=seat(moved.s,0,'MHA-1-004','energy',0,true);
 const seller=seat(moved.s,0,'PAY','energy',1,true);
 const handCard=moved.s.players[0].hand[0];
 moved.s=act(moved.pack,moved.s,{type:'activate', uid:buyer.uid, mode:'gainLineMains'});
 assert.equal(find(moved.s,buyer.uid).gainedMains.items.some(item=>item.sourceUid===seller.uid),true);
 moved.s=act(moved.pack,moved.s,a=>a.uid===buyer.uid&&a.mode==='payHandImpact'&&a.gained===seller.uid);
 const away=moved.s.players[0].hand.findIndex(c=>c.uid===handCard.uid);
 moved.s.players[0].deck.push(moved.s.players[0].hand.splice(away,1)[0]);
 assert.throws(()=>dispatchUniversalAction(moved.pack,moved.s,
  {type:'choosePayHandImpact', uid:handCard.uid}),/not currently legal|Hand payment/);
 const fresh=moved.s.players[0].hand[0];
 moved.s=act(moved.pack,moved.s,{type:'choosePayHandImpact', uid:fresh.uid});
 assert.equal(find(moved.s,buyer.uid).impactGranted.amount,1);
 assert.equal(find(moved.s,seller.uid).impactGranted,undefined);
 assert.equal(legal(moved.pack,moved.s).some(a=>a.uid===seller.uid&&a.mode==='payHandImpact'),true);

 let left=open({seed:45});
 const keeper=seat(left.s,0,'MHA-1-004','front',0,true);
 const source=seat(left.s,0,'TUCK','front',1,true);
 left.s=act(left.pack,left.s,{type:'activate', uid:keeper.uid, mode:'gainLineMains'});
 left.s.players[0].outside.push(left.s.players[0].front[1]);
 left.s.players[0].front[1]=null;
 const buried=top(left.s,'FILL-02');
 left.s=act(left.pack,left.s,a=>a.uid===keeper.uid&&a.gained===source.uid);
 assert.equal(find(left.s,keeper.uid).under.some(c=>c.uid===buried.uid),true);

 let quiet=open({seed:46});
 const mutedHost=seat(quiet.s,0,'MHA-1-004','front',0,true);
 const muted=seat(quiet.s,0,'TUCK','front',1,true);
 silence(quiet.s,mutedHost,muted);
 quiet.s=act(quiet.pack,quiet.s,{type:'activate', uid:mutedHost.uid, mode:'gainLineMains'});
 assert.equal(find(quiet.s,mutedHost.uid).gainedMains.items.length,0);
 silence(quiet.s,mutedHost,mutedHost);
 assert.equal(legal(quiet.pack,quiet.s).some(a=>a.uid===mutedHost.uid&&a.mode==='gainLineMains'),false);

 let raided=open({seed:47});
 const rider=seat(raided.s,0,'MHA-1-004','front',0,true);
 const raid=seat(raided.s,0,'BLC-1-004','front',1,true);
 const layer=pull(raided.s,0,'FILL-01');
 layer.faceDown=false;
 raid.stack=[layer];
 raided.s=act(raided.pack,raided.s,{type:'activate', uid:rider.uid, mode:'gainLineMains'});
 assert.equal(find(raided.s,rider.uid).gainedMains.items.some(item=>item.sourceUid===raid.uid),true);

 let forged=open({seed:48});
 const fake=seat(forged.s,0,'MHA-1-004','front',0,true);
 fake.gainedMains={turn:forged.s.turn, stamp:fake.fieldEntryStamp, items:[]};
 assert.throws(()=>assertUniversalMatch(forged.pack,forged.s),/Forged copied main/);
});

test('impact 1 resolves when the attack wins, and the copy is not a battle-phase activate',()=>{
 let {pack,s}=open({seed:49});
 const host=seat(s,0,'MHA-1-004','front',0,true);
 const loser=seat(s,1,'WALL','front',0,true);
 const life=s.players[1].life.length;
 let guard=0;
 while(s.phase!=='attack'){
  s=act(pack,s,{type:'next'});
  if(++guard>4)throw Error('attack');
 }
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===host.uid),false);
 assert.equal(universalImpact(pack,s,host),1);
 s=act(pack,s,a=>a.type==='attack'&&a.uid===host.uid);
 s=act(pack,s,{type:'chooseBlock', uid:loser.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===loser.uid),true);
 assert.equal(s.players[1].life.length+s.players[1].lifeRevealed.length,life-1);
 if(s.pending?.kind==='life-trigger'){
  s=act(pack,s,a=>a.type==='chooseTrigger'&&(a.mode==='skip'||a.mode==='get'));
 }
 assert.equal(s.players[0].front.some(c=>c?.uid===host.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});
