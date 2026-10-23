import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const profile={color:'green',types:['event','field'],minDistinctNames:4};
const ch=(id,bp=2000,swap=null)=>({id,name:id,color:'green',type:'character',
 energy:0,ap:1,bp,gen:1,traits:[],implementation:swap?'dsl':'vanilla',
 effects:{},...(swap?{attackEndSwap:swap}:{})});
const cards=[ch('swap',4000,profile),ch('blocker',2000),ch('ally',2500),
 ...['ev1','ev2','fl1','fl2'].map((id,i)=>({id,name:id,type:i<2?'event':'field',
 color:'green',energy:0,ap:1,bp:0,gen:i<2?0:1,traits:[],
 implementation:'vanilla',effects:{}})),
 ...Array.from({length:6},(_,i)=>({...ch('f'+i),trigger:i===0?'draw':null}))];
const pack=createUniversalPack({id:'r47-swap',cards});
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===0?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function pull(s,p,id){for(const z of ['hand','deck','life','outside']){
 const q=s.players[p][z],idx=q.findIndex(c=>c.cardId===id);
 if(idx>=0)return q.splice(idx,1)[0];
}throw Error('Physical UID missing '+id);}
function placed(s,p,id,line,slot){
 const c=pull(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function scene(n=4,withAlly=true){
 let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:47069});
 const attacker=placed(s,0,'swap','front',0);
 const blocker=placed(s,1,'blocker','front',0);
 const ally=withAlly?placed(s,0,'ally','energy',1):null;
 for(const id of ['ev1','ev2','fl1','fl2'].slice(0,n))
  s.players[0].outside.push(pull(s,0,id));
 s.active=0;s.phase='attack';
 assert.equal(assertUniversalMatch(pack,s),true);
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 s=use(s,{type:'chooseBlock',uid:blocker.uid});
 return {s,attacker,blocker,ally};
}
test('Q2337 blocked combat produces one swap choice after completed battle',()=>{
 let {s,attacker,ally}=scene();
 assert.equal(s.pending?.kind,'attack-end-swap');
 const options=legalUniversalActions(pack,s);
 assert.deepEqual(options,[{type:'chooseAttackEndSwap',uid:null},
  {type:'chooseAttackEndSwap',uid:ally.uid}]);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(pack,s,{difficulty});
  assert.ok(options.some(c=>JSON.stringify(c)===JSON.stringify(ai)));
 }
 const baseline=structuredClone(s);
 assert.throws(()=>use(s,{type:'chooseAttackEndSwap',uid:'0-forged'}),/not currently legal/);
 assert.deepEqual(s,baseline);
 s=use(JSON.parse(JSON.stringify(s)),options[1]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].uid,ally.uid);
 assert.equal(s.players[0].energy[1].uid,attacker.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].energy[1].ready,false);
 assert.equal(s.players[0].energy[1].fieldEntryStamp,attacker.fieldEntryStamp);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===attacker.uid&&e.from==='front'&&e.to==='energy'));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===ally.uid&&e.from==='energy'&&e.to==='front'));
 assert.equal(s.turnRetireEvents.length,1,'swapping is neither a true retire nor an onPlay');
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('Up to one allows zero; 3 printed names and no energy target suppress exchange',()=>{
 let x=scene(),s=use(x.s,{type:'chooseAttackEndSwap',uid:null});
 assert.equal(s.pending,null);assert.equal(s.players[0].front[0].uid,x.attacker.uid);
 assert.equal(scene(3).s.pending,null);
 assert.equal(scene(4,false).s.pending,null);
});
test('Forged choice, stamp and extra fields rejected without touching live game',()=>{
 const original=scene().s;
 for(const fn of [q=>q.sourceStamp++,q=>q.sourceUid='0-fake',
  q=>q.choices[0].uid='1-forged',q=>q.choices[0].stamp++,q=>q.extra=true]){
  const invalid=structuredClone(original);fn(invalid.pending);
  assert.throws(()=>assertUniversalMatch(pack,invalid),/Invalid saved attack-end swap pending/);
 }
 assert.equal(assertUniversalMatch(pack,original),true);
});
test('Unruled card type, ordering or threshold cannot grant source profile',()=>{
 for(const candidate of [
  {...profile,minDistinctNames:3},{...profile,types:['field','event']},
  {...profile,surprise:true}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[ch('x',2000,candidate)]}));
 }
 assert.throws(()=>createUniversalPack({id:'bad-event',cards:[{
  ...cards[3],implementation:'dsl',attackEndSwap:profile}]}));
});

test('Q2337 unblocked LIFE DRAW Trigger finishes before offered single-attack swap',()=>{
 let s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:47469});
 const attacker=placed(s,0,'swap','front',0);
 const ally=placed(s,0,'ally','energy',1);
 for(const id of ['ev1','ev2','fl1','fl2'])
  s.players[0].outside.push(pull(s,0,id));
 const drawn=pull(s,1,'f0');
 const displaced=s.players[1].life.splice(0,1,drawn)[0];
 s.players[1].deck.push(displaced);
 s.active=0;s.phase='attack';
 assert.equal(assertUniversalMatch(pack,s),true);
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.ok(s.effectQueue.some(e=>e.op==='resolveAttackEndSwap'));
 assert.ok(!s.zoneMoveEvents.some(e=>e.owner===0&&e.from==='front'&&e.to==='energy'));
 const legal=legalUniversalActions(pack,s);
 const trigger=legal.find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.ok(trigger);
 const handBefore=s.players[1].hand.length;
 s=use(s,trigger);
 assert.equal(s.players[1].hand.length,handBefore+1);
 assert.equal(s.pending?.kind,'attack-end-swap');
 assert.equal(s.players[0].front[0].uid,attacker.uid);
 s=use(s,{type:'chooseAttackEndSwap',uid:ally.uid});
 assert.equal(s.players[0].front[0].uid,ally.uid);
 assert.equal(s.players[0].energy[1].uid,attacker.uid);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('Queued Q2337 attack-end cannot be forged before first real attack',()=>{
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:47070});
 const c=placed(s,0,'swap','front',0);
 s.phase='attack';
 s.effectQueue.push({op:'resolveAttackEndSwap',owner:0,sourceUid:c.uid,
  sourceStamp:c.fieldEntryStamp});
 assert.throws(()=>assertUniversalMatch(pack,s),/Invalid earned attack-end swap continuation/);
});
