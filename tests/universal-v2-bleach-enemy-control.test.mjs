import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const counts={
 'BLC-1-013':4,'BLC-1-017':4,'BLC-2-029':4,'BLC-2-020':4,
 'BLC-2-031':4,'BLC-2-048':4,'BLC-1-105':4,'BLC-1-039':4,
 'BLC-2-008':4,'BLC-1-071':4,'BLC-1-075':4,'BLC-1-072':4,
 'BLC-1-100':2
};
const fresh=(first=0)=>newUniversalMatch(packs,{decks:[counts,counts],first,seed:2801});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('Missing official physical card '+id);
}
function to(s,phase){for(let i=0;i<4&&s.phase!==phase;i++)s=dispatchUniversalAction(packs,s,{type:'next'});assert.equal(s.phase,phase);return s;}

test('64+ official BLEACH cards include real mandatory BP-limited REST and 2 SPECIAL retirement programs',()=>{
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.deepEqual(pack.cards['BLC-1-013'].effects.onPlay,[{op:'restOppFrontUnderBp',bp:3500,optional:true}]);
 for(const [id,name] of [['BLC-1-099','山本元柳斎重國'],['BLC-2-048','朽木ルキア']]){
  assert.equal(pack.cards[id].trigger,'special');
  assert.deepEqual(pack.cards[id].triggerEffect,{op:'retireOppFront'});
  assert.deepEqual(pack.cards[id].effects.onPlay,[{op:'retireOppFrontUnderBp',bp:3000,bonusName:name,bonusBp:5000}]);
 }
});

test('BLC-1-013 onPlay optional REST cannot target BP 4000 foe; skip and legal REST preserve UID',()=>{
 let s=fresh(),p=s.players[0],foe=s.players[1];
 const power=take(s,0,'BLC-1-017'),entry=take(s,0,'BLC-1-013'),
  low=take(s,1,'BLC-2-029'),high=take(s,1,'BLC-1-105');
 power.ready=true;p.energy[0]=power;p.hand.push(entry);
 low.ready=true;high.ready=true;foe.front[0]=low;foe.front[1]=high;
 s=to(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===entry.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const pending=dispatchUniversalAction(packs,s,play,{actor:0});
 assert.equal(pending.pending?.kind,'effect-rest-bp');
 const actions=legalUniversalActions(packs,pending);
 assert.ok(actions.some(a=>a.type==='chooseRestBp'&&a.uid===low.uid));
 assert.ok(actions.some(a=>a.type==='chooseRestBp'&&a.uid===null));
 assert.ok(!actions.some(a=>a.uid===high.uid));
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:high.uid},{actor:0}),/not currently legal/);
 const resolved=dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:low.uid},{actor:0});
 assert.equal(resolved.players[1].front[0].ready,false);
 assert.equal(resolved.players[1].front[1].ready,true);
 assert.equal(assertUniversalMatch(packs,resolved),true);
 const skip=dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:null},{actor:0});
 assert.equal(skip.players[1].front[0].ready,true);
 assert.equal(assertUniversalMatch(packs,skip),true);
});

test('BLC-2-048 bonus Rukia enables legal 4000-BP retirement; no Rukia means no free removal',()=>{
 let s=fresh(),p=s.players[0],foe=s.players[1];
 const a=take(s,0,'BLC-2-029'),b=take(s,0,'BLC-2-020'),
  rukia=take(s,0,'BLC-2-031'),spell=take(s,0,'BLC-2-048'),
  high=take(s,1,'BLC-1-105');
 a.ready=true;b.ready=true;p.energy[0]=a;p.energy[1]=b;
 p.front[0]=rukia;p.hand.push(spell);foe.front[0]=high;
 s=to(s,'main');
 const option=legalUniversalActions(packs,s).find(x=>x.type==='event'&&x.uid===spell.uid);
 assert.ok(option);
 let buffed=dispatchUniversalAction(packs,s,option,{actor:0});
 assert.equal(buffed.pending?.kind,'effect-retire-bp');
 assert.deepEqual(legalUniversalActions(packs,buffed),[{type:'chooseRetireBp',uid:high.uid}]);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseRetireBp',uid:high.uid},{actor:0});
 assert.equal(buffed.players[1].front[0],null);
 assert.ok(buffed.players[1].outside.some(x=>x.uid===high.uid));
 assert.equal(assertUniversalMatch(packs,buffed),true);
 // Without Rukia, above 3000 BP has no eligible retirement target.
 const noRukia=structuredClone(s);
 noRukia.players[0].front[0]=null;noRukia.players[0].outside.push(rukia);
 const base=dispatchUniversalAction(packs,noRukia,option,{actor:0});
 assert.equal(base.pending,null);
 assert.equal(base.players[1].front[0]?.uid,high.uid);
 assert.equal(assertUniversalMatch(packs,base),true);
});

test('BLC-2-048 SPECIAL life trigger can retire a BP4000 foe without event energy/AP cost',()=>{
 let s=fresh(1);
 const attacker=take(s,1,'BLC-1-039'),high=take(s,1,'BLC-1-105');
 attacker.ready=true;high.ready=true;
 s.players[1].front[0]=attacker;s.players[1].front[1]=high;
 const trigger=take(s,0,'BLC-2-048');
 const displaced=s.players[0].life.shift();
 s.players[0].deck.push(displaced);
 s.players[0].life.unshift(trigger);
 s=to(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'special');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===high.uid),
  'SPECIAL ignores normal event BP<=3000 requirement');
 assert.ok(legal.some(a=>a.type==='chooseTrigger'&&a.mode==='skip'),
  'life trigger can be declined');
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'special',uid:'forged'},{actor:0}),/not currently legal/);
 assert.deepEqual(s,before);
 const apBefore=s.players[0].apCards.filter(x=>x.ready).length;
 const after=dispatchUniversalAction(packs,s,
  {type:'chooseTrigger',mode:'special',uid:high.uid},{actor:0});
 assert.equal(after.players[1].front[1],null);
 assert.ok(after.players[1].outside.some(x=>x.uid===high.uid));
 assert.equal(after.players[0].apCards.filter(x=>x.ready).length,apBefore);
 assert.ok(after.players[0].outside.some(x=>x.uid===trigger.uid));
 assert.equal(assertUniversalMatch(packs,after),true);
 const skip=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:0});
 assert.equal(skip.players[1].front[1]?.uid,high.uid);
 assert.equal(assertUniversalMatch(packs,skip),true);
});


test('BLC-1-049 official onPlay optional BP -500 cannot hit illegal UID; COLOR is explicit outside deployment',()=>{
 const c=pack.cards['BLC-1-049'];
 assert.deepEqual(c.effects.onPlay,[{op:'enemyBpDown',bp:500,optional:true}]);
 assert.deepEqual(c.triggerEffect,{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true});
 const copy={...counts};delete copy['BLC-1-013'];copy['BLC-1-049']=4;
 assert.deepEqual(validateUniversalDeck(pack,copy),[]);
 let s=newUniversalMatch(packs,{decks:[copy,copy],first:0,seed:14904});
 const p=s.players[0],foe=s.players[1];
 const entry=take(s,0,'BLC-1-049'),target=take(s,1,'BLC-1-105');
 const g1=take(s,0,'BLC-1-039'),g2=take(s,0,'BLC-1-039'),g3=take(s,0,'BLC-1-039');
 p.energy[0]=g1;p.energy[1]=g2;p.energy[2]=g3;
 p.hand.push(entry);foe.front[0]=target;
 s=to(s,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===entry.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play);
 const waiting=dispatchUniversalAction(packs,s,play,{actor:0});
 const opts=legalUniversalActions(packs,waiting);
 assert.ok(opts.some(x=>x.type==='chooseTarget'&&x.uid===target.uid));
 assert.ok(opts.some(x=>x.type==='chooseTarget'&&x.uid===null));
 assert.throws(()=>dispatchUniversalAction(packs,waiting,{type:'chooseTarget',uid:entry.uid},{actor:0}),/not currently legal/);
 const yes=dispatchUniversalAction(packs,waiting,opts.find(x=>x.uid===target.uid),{actor:0});
 assert.equal(yes.players[1].front[0].buffs.at(-1).bp,-500);
 assert.equal(assertUniversalMatch(packs,yes),true);
 const skipped=dispatchUniversalAction(packs,waiting,opts.find(x=>x.uid===null),{actor:0});
 assert.equal(skipped.players[1].front[0].buffs?.length||0,0);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('BLC-1-049 printed COLOR life trigger deploys own purple cost <=2 AP1 from outside ACTIVE with no AP cost',()=>{
 const copy={...counts};delete copy['BLC-1-013'];copy['BLC-1-049']=4;
 let s=newUniversalMatch(packs,{decks:[copy,copy],first:1,seed:14905});
 const p=s.players[0],attacker=take(s,1,'BLC-1-039');
 attacker.ready=true;s.players[1].front[0]=attacker;
 const life=take(s,0,'BLC-1-049'),old=p.life.shift();
 p.deck.push(old);p.life.unshift(life);
 const target=take(s,0,'BLC-1-039');p.outside.push(target);
 s=to(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.trigger,'color');
 const opts=legalUniversalActions(packs,s);
 const choice=opts.find(a=>a.type==='chooseTrigger'&&a.mode==='colorOutside'&&a.uid===target.uid&&a.slot===0);
 assert.ok(choice);
 const readyAp=p.apCards.filter(x=>x.ready).length;
 const result=dispatchUniversalAction(packs,s,choice,{actor:0});
 assert.equal(result.players[0].front[0]?.uid,target.uid);
 assert.equal(result.players[0].front[0]?.ready,true);
 assert.equal(result.players[0].apCards.filter(x=>x.ready).length,readyAp);
 assert.ok(result.players[0].outside.some(x=>x.uid===life.uid));
 assert.equal(assertUniversalMatch(packs,result),true);
});

// Official UNON ARENA FAQ Q1119, updated 2024-09-06:
// https://www.unionarena-tcg.com/jp/faq/list.php?number=1119
// Event cards requiring a mandatory target are unplayable with no legal target.
function jailFixture(withTarget){
 const deck={...counts,'BLC-1-030':4};
 delete deck['BLC-1-013'];
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:30030,first:0});
 const power=take(s,0,'BLC-1-017'),jail=take(s,0,'BLC-1-030');
 s.players[0].energy[0]=power;
 s.players[0].hand.push(jail);
 let high=null;
 if(withTarget){
  high=take(s,1,'BLC-1-105');
  high.ready=true;
  // Makes the actual BP far above any "pretend no cap" numeric threshold.
  high.buffs.push({bp:15000,untilTurn:s.turn});
  s.players[1].front[0]=high;
 }
 s=to(s,'main');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,jail,high};
}
test('BLC-1-030 official source and DSL require REST of one enemy FRONT without any BP ceiling',()=>{
 const raw=CARDS.find(c=>c.identity==='BLC-1-030');
 assert.equal(raw?.type,'event');
 assert.equal(raw?.effect,'選 1 個敵方前線角色，將其轉為 REST。');
 assert.equal(raw?.number,'UA08BT/BLC-1-030');
 assert.deepEqual(pack.cards['BLC-1-030'].effects.onPlay,
  [{op:'restOppFrontOne',optional:false}]);
 const {s,jail,high}=jailFixture(true);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===jail.uid);
 assert.ok(action,'target exists even at BP 19000+');
 const apBefore=s.players[0].apCards.filter(c=>c.ready).length;
 const pending=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(pending.pending?.kind,'effect-rest-bp');
 assert.equal(pending.pending?.limit,null,'no numerical BP cap');
 assert.deepEqual(legalUniversalActions(packs,pending),
  [{type:'chooseRestBp',uid:high.uid}],
  'mandatory choose has no skip/null');
 assert.throws(()=>dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:null},{actor:0}),
  /not currently legal/);
 assert.equal(s.players[1].front[0].ready,true,'input state unchanged');
 const done=dispatchUniversalAction(packs,pending,{type:'chooseRestBp',uid:high.uid},{actor:0});
 assert.equal(done.players[1].front[0].ready,false);
 assert.ok(done.players[0].outside.some(c=>c.uid===jail.uid));
 assert.equal(done.players[0].apCards.filter(c=>c.ready).length,apBefore-1);
 assert.equal(assertUniversalMatch(packs,done),true);
});
test('BLC-1-030 is NOT playable with no opponent FRONT target (official Q1119)',()=>{
 const {s,jail}=jailFixture(false);
 const before=structuredClone(s);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===jail.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'event',uid:jail.uid},{actor:0}),
  /Action not currently legal/);
 assert.deepEqual(s,before,'illegal event does not spend AP or leave hand');
 assert.ok(s.players[0].hand.some(c=>c.uid===jail.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
