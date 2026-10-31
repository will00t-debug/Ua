// EX15BT/BLC-4-069 attack-end swap is your effect. EX15BT/BLC-4-060 may
// move to the front by your effect, so the exchange must complete and mark
// ownEffectFront. EX15BT/BLC-4-075 cannot move to the front at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import {BLEACH_GREEN_V2_COUNTS} from '../dist/universal-v2/preview-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const pack=registeredV2TitlePack('bleach');
const counts={...BLEACH_GREEN_V2_COUNTS};
delete counts['BLC-4-061'];
counts['BLC-1-099']=4;
for(const id of ['BLC-1-090','BLC-1-089','BLC-1-086','BLC-1-082'])delete counts[id];
for(const id of ['BLC-4-069','BLC-4-067','BLC-4-060','BLC-4-075'])counts[id]=4;
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);

function pull(s,id,p=0){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function bury(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const deck=s.players[p].deck;
 if(!deck.length)throw Error('No deck card to place under '+card.cardId);
 const under=deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function place(s,id,p,line,slot){
 const c=pull(s,id,p);
 c.ready=true;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function act(s,a){
 assert.ok(legalUniversalActions(pack,s).some(x=>JSON.stringify(x)===JSON.stringify(a)),
  'must use a legal action '+JSON.stringify(a));
 return dispatchUniversalAction(pack,s,a);
}
function fresh(){
 return newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:69060});
}
function outsideNames(s){
 for(const id of ['BLC-1-094','BLC-1-097','BLC-1-099','BLC-1-100'])
  s.players[0].outside.push(pull(s,id));
}

test('raided BLC-4-069 swaps with BLC-4-060 and leaves an absolute front ban in place',()=>{
 let s=fresh();
 const base=place(s,'BLC-4-067',0,'front',0);
 const fuel=place(s,'BLC-4-060',0,'energy',0);
 const aizen=place(s,'BLC-4-060',0,'energy',1);
 const banned=place(s,'BLC-4-075',0,'energy',2);
 const top=pull(s,'BLC-4-069');
 s.players[0].hand.push(top);
 s.players[0].apCards[0].inPlay=true;
 s.players[0].apCards[0].ready=true;
 s.phase='main';
 assert.equal(assertUniversalMatch(pack,s),true);
 const raid=legalUniversalActions(pack,s).find(a=>a.type==='raid'&&a.uid===top.uid&&
  a.baseUid===base.uid&&a.slot===0&&a.line!=='energy');
 assert.ok(raid,'paid raid of BLC-4-069 onto 京楽 春水');
 s=act(s,raid);
 for(let i=0;i<6&&s.pending;i++){
  const opts=legalUniversalActions(pack,s);
  const pick=opts.find(a=>a.uid===null)||opts[0];
  s=act(s,pick);
 }
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].uid,top.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 outsideNames(s);
 const blocker=place(s,'BLC-1-071',1,'front',0);
 s.players[0].front[0].ready=true;
 s.phase='attack';
 assert.equal(assertUniversalMatch(pack,s),true);
 s=act(s,{type:'attack',uid:top.uid});
 assert.equal(s.pending?.kind,'block');
 s=act(s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(s.pending?.kind,'attack-end-swap');
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(a=>a.type==='chooseAttackEndSwap'&&a.uid===null));
 assert.ok(options.some(a=>a.type==='chooseAttackEndSwap'&&a.uid===aizen.uid));
 assert.ok(options.some(a=>a.type==='chooseAttackEndSwap'&&a.uid===fuel.uid));
 assert.equal(options.some(a=>a.uid===banned.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseAttackEndSwap',uid:banned.uid}),
  /not currently legal/);
 const stamp=s.players[0].front.find(c=>c?.uid===top.uid).fieldEntryStamp;
 const aizenStamp=s.players[0].energy.find(c=>c?.uid===aizen.uid).fieldEntryStamp;
 s=act(s,{type:'chooseAttackEndSwap',uid:aizen.uid});
 const arrived=s.players[0].front.find(c=>c?.uid===aizen.uid);
 const parked=s.players[0].energy.find(c=>c?.uid===top.uid);
 assert.ok(arrived);
 assert.equal(arrived.ownEffectFront,true);
 assert.equal(arrived.fieldEntryStamp,aizenStamp);
 assert.ok(parked);
 assert.equal(parked.fieldEntryStamp,stamp);
 assert.equal(parked.stack[0].uid,base.uid);
 assert.equal(parked.ownEffectFront,undefined);
 assert.equal(s.players[0].energy.find(c=>c?.uid===banned.uid)?.uid,banned.uid);
 assert.equal(s.players[0].energy.some(c=>c?.uid===fuel.uid),true);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===top.uid&&e.from==='front'&&e.to==='energy'&&
  e.reason==='own-effect'));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===aizen.uid&&e.from==='energy'&&e.to==='front'&&
  e.reason==='own-effect'));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});

test('BLC-4-069 still swaps with an ordinary energy character and does not mark ownEffectFront',()=>{
 let s=fresh();
 const attacker=place(s,'BLC-4-069',0,'front',0);
 const ally=place(s,'BLC-1-072',0,'energy',0);
 outsideNames(s);
 const blocker=place(s,'BLC-1-071',1,'front',0);
 bury(s,0,attacker);
 s.phase='attack';
 assert.equal(assertUniversalMatch(pack,s),true);
 s=act(s,{type:'attack',uid:attacker.uid});
 s=act(s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(s.pending?.kind,'attack-end-swap');
 s=act(s,{type:'chooseAttackEndSwap',uid:ally.uid});
 assert.equal(s.players[0].front[0].uid,ally.uid);
 assert.equal(s.players[0].front[0].ownEffectFront,undefined);
 assert.equal(s.players[0].energy[0].uid,attacker.uid);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
