// MHA-1-023 ラブラバ. Front, once per turn: another own character gets
// BP+1000 this turn. 〈ジェントル・クリミナル〉 gets BP+2000 and sniper instead.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const printed=MHA_CATALOG.find(c=>c.id==='MHA-1-023');
const love=mhaBattleCard(printed, mhaProgramFor('MHA-1-023'));

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
 const bodies=[love,
  card({id:'GENTLE', name:'ジェントル・クリミナル', bp:2000}),
  card({id:'ALLY', name:'同伴', bp:1500}),
  card({id:'SMALL', name:'小燃料', gen:1}),
  card({id:'BIG', name:'大燃料', gen:2}),
  card({id:'WALL', name:'牆', bp:1000, color:'red'}),
  card({id:'TALL', name:'高牆', bp:2500, color:'red'})
 ];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, bp:1000}));
  n++;
 }
 return createUniversalPack({id:'mha-023', version:'mha-023', cards:bodies});
}
function open({seed=23}={}){
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
 return [...s.players[0].front,...s.players[0].energy,
  ...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid)||null;
}

test('MHA-1-023 scales the bonus for Gentle Criminal and grants sniper',()=>{
 assert.equal(love.name,'ラブラバ');
 assert.equal(love.energy,2);
 assert.equal(love.mainAbility.op,'frontOnceNameBuff');
 assert.equal(love.mainAbility.name,'ジェントル・クリミナル');
 assert.equal(printed.faq.length,0);
 assert.equal(createMhaV2Pack().cards['MHA-1-023'].mainAbility.namedBp,2000);
});

test('the front activate buffs another character once, and the named one cannot be blocked',()=>{
 let unpaid=open({seed:27});
 const waiting=hold(unpaid.s,'MHA-1-023');
 const small=seat(unpaid.s,0,'SMALL','energy',0,true);
 assert.equal(legal(unpaid.pack,unpaid.s).some(a=>a.type==='play'&&a.uid===waiting.uid),false);
 assert.throws(()=>dispatchUniversalAction(unpaid.pack,unpaid.s,
  {type:'play', uid:waiting.uid, line:'front', slot:0}),/not currently legal/);
 unpaid.s.players[0].energy[0]=null;
 unpaid.s.players[0].deck.push(small);
 seat(unpaid.s,0,'BIG','energy',0,true);
 assert.equal(legal(unpaid.pack,unpaid.s).some(a=>a.type==='play'&&a.uid===waiting.uid&&a.line==='front'),true);

 let {pack,s}=open();
 const source=seat(s,0,'MHA-1-023','energy',0,true);
 const gentle=seat(s,0,'GENTLE','front',0,true);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 s.players[0].energy[0]=null;
 s.players[0].front[1]=source;
 const ally=seat(s,0,'ALLY','front',2,true);
 const foe=seat(s,1,'WALL','front',0,true);
 const grants=()=>legal(pack,s).filter(a=>a.type==='activate'&&a.uid===source.uid);
 assert.equal(grants().some(a=>a.targetUid===gentle.uid),true);
 assert.equal(grants().some(a=>a.targetUid===ally.uid),true);
 assert.equal(grants().some(a=>a.targetUid===source.uid),false);
 assert.equal(grants().some(a=>a.targetUid===foe.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'activate', uid:source.uid, mode:'nameScaledBuff', targetUid:source.uid}),
  /not currently legal/);
 const away=s.players[0].front[2];
 s.players[0].front[2]=null;
 s.players[0].outside.push(away);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'activate', uid:source.uid, mode:'nameScaledBuff', targetUid:ally.uid}),
  /not currently legal/);
 s.players[0].outside.pop();
 s.players[0].front[2]=away;
 s=act(pack,s,{type:'activate', uid:source.uid, mode:'nameScaledBuff', targetUid:gentle.uid});
 assert.equal(universalBp(pack,s,find(s,gentle.uid)),4000);
 assert.equal(find(s,gentle.uid).sniperGranted.turn,s.turn);
 assert.equal(find(s,ally.uid).sniperGranted,undefined);
 assert.equal(legal(pack,s).some(a=>a.uid===source.uid&&a.mode==='nameScaledBuff'),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'activate', uid:source.uid, mode:'nameScaledBuff', targetUid:ally.uid}),
  /not currently legal/);
 let guard=0;
 while(s.phase!=='attack'){
  s=act(pack,s,{type:'next'});
  if(++guard>4)throw Error('attack');
 }
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 const marked=legal(pack,s).find(a=>a.type==='attack'&&a.uid===gentle.uid&&a.targetUid===foe.uid);
 assert.ok(marked);
 s=act(pack,s,marked);
 assert.notEqual(s.pending?.kind,'block');
 assert.equal(s.players[1].outside.some(c=>c.uid===foe.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===gentle.uid),true);

 let plain=open({seed:24});
 const giver=seat(plain.s,0,'MHA-1-023','front',0,true);
 const other=seat(plain.s,0,'ALLY','front',1,true);
 const blocker=seat(plain.s,1,'WALL','front',0,true);
 plain.s=act(plain.pack,plain.s,{type:'activate', uid:giver.uid, mode:'nameScaledBuff', targetUid:other.uid});
 assert.equal(universalBp(plain.pack,plain.s,find(plain.s,other.uid)),2500);
 assert.equal(find(plain.s,other.uid).sniperGranted,undefined);
 guard=0;
 while(plain.s.phase!=='attack'){
  plain.s=act(plain.pack,plain.s,{type:'next'});
  if(++guard>4)throw Error('attack');
 }
 plain.s=act(plain.pack,plain.s,a=>a.type==='attack'&&a.uid===other.uid&&!a.targetUid);
 assert.equal(plain.s.pending.kind,'block');
 plain.s=act(plain.pack,plain.s,{type:'chooseBlock', uid:blocker.uid});
 assert.equal(plain.s.players[1].outside.some(c=>c.uid===blocker.uid),true);

 let quiet=open({seed:26});
 const muted=seat(quiet.s,0,'MHA-1-023','front',0,true);
 seat(quiet.s,0,'ALLY','front',1,true);
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled', controller:1,
  sourceUid:muted.uid, targetUid:muted.uid, sourceLinked:false,
  until:{player:0, phase:'start', edge:'start'}});
 assert.equal(legal(quiet.pack,quiet.s).some(a=>a.uid===muted.uid&&a.mode==='nameScaledBuff'),false);
});
