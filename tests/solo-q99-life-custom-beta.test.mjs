import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {SOLO_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

const getCard=(p,id)=>{
 for(const zone of ['hand','deck','life']){const i=p[zone].findIndex(c=>c.cardId===id);if(i>=0)return p[zone].splice(i,1)[0];}
 throw Error('missing physical card '+id);
};
const triggerDeck=id=>{
 const deck={...SOLO_TRAINING_PRESET};
 if(!deck[id]){deck['SLG-1-041']--;deck[id]=1;}
 return deck;
};
const fixture=(trigger,lifeCount=7,damage2=false)=>{
 const deck=triggerDeck(trigger),s=newSoloTrainingMatch({decks:[deck,deck],seed:20261014,first:0});
 const attacker=getCard(s.players[0],'SLG-1-045');
 Object.assign(attacker,{owner:0,line:'front',slot:0,ready:true});
 if(damage2)attacker.grants=[{kind:'damagePlus',turn:s.turn}];
 s.players[0].front[0]=attacker;s.players[0].ownTurns=2;s.phase='attack';
 const defender=s.players[1],tr=getCard(defender,trigger),old=defender.life.shift();
 defender.deck.push(old);defender.life.unshift(tr);
 if(lifeCount<7){defender.outside.push(...defender.life.splice(lifeCount));}
 assertSoloTrainingMatch(s);return {s,attacker,tr};
};
const attack=(s,attacker)=>{
 const a=soloTrainingLegalActions(s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.ok(a);return soloTrainingDispatch(s,a);
};
const choose=(s,mode)=>{
 const a=soloTrainingLegalActions(s).find(x=>x.type==='choose'&&x.mode===mode);
 assert.ok(a,mode+' absent from '+JSON.stringify(soloTrainingLegalActions(s)));return soloTrainingDispatch(s,a);
};

test('official Q99 GET and DRAW can be declined or activated with actual cards and 50-card conservation',()=>{
 for(const [id,mode] of [['SLG-1-075','get'],['SLG-1-074','draw']]){
  const {s,attacker,tr}=fixture(id);
  const damaged=attack(s,attacker);
  assert.equal(damaged.pending?.kind,'soloOptionalLife',id);
  assert.equal(damaged.pending.trigger,mode);
  assert.ok(damaged.players[1].outside.some(x=>x.uid===tr.uid),id+' revealed outside before decision');
  const options=soloTrainingLegalActions(damaged).map(x=>x.mode);
  assert.ok(options.includes('skip')&&options.includes(mode));
  const skip=choose(damaged,'skip'),yes=choose(damaged,mode);
  assert.ok(skip.players[1].outside.some(x=>x.uid===tr.uid));
  assert.ok(assertSoloTrainingMatch(skip));
  if(mode==='get')assert.ok(yes.players[1].hand.some(x=>x.uid===tr.uid));
  else assert.equal(yes.players[1].hand.length,skip.players[1].hand.length+1);
  assert.ok(assertSoloTrainingMatch(yes));
 }
});
test('official Q99 FINAL 1 life can decline and lose, or replenish one real top-deck card',()=>{
 const {s,attacker,tr}=fixture('SLG-1-078',1);
 const damaged=attack(s,attacker);
 assert.equal(damaged.pending?.kind,'soloOptionalLife');
 assert.equal(damaged.pending.trigger,'final');
 assert.equal(damaged.status,'playing','wait for controller choice');
 const available=damaged.players[1].deck.length;
 const yes=choose(damaged,'final');
 assert.equal(yes.status,'playing');assert.equal(yes.players[1].life.length,1);
 assert.equal(yes.players[1].deck.length,available-1);
 assert.ok(yes.players[1].outside.some(x=>x.uid===tr.uid));
 assert.ok(assertSoloTrainingMatch(yes));
 const no=choose(damaged,'skip');
 assert.equal(no.status,'finished');assert.equal(no.winner,0);
 assert.equal(no.players[1].life.length,0);
 assert.ok(assertSoloTrainingMatch(no));
});
test('Q99 RAID may be declined, put in hand, or offered a real field Raid, without teleportation',()=>{
 const raidId=SOLO_LEVELING_CARDS.find(c=>c.color==='green'&&c.trigger==='raid')?.id;
 assert.ok(raidId);
 const {s,attacker,tr}=fixture(raidId);
 const damaged=attack(s,attacker);
 assert.equal(damaged.pending?.kind,'soloOptionalLife');
 assert.equal(damaged.pending.trigger,'raid');
 const skipped=choose(damaged,'skip'),taken=choose(damaged,'get');
 assert.ok(skipped.players[1].outside.some(x=>x.uid===tr.uid));
 assert.ok(taken.players[1].hand.some(x=>x.uid===tr.uid));
 assert.ok(assertSoloTrainingMatch(skipped));assert.ok(assertSoloTrainingMatch(taken));
});
test('Damage 2 processes the next life only after the previous trigger choice',()=>{
 const {s,attacker}=fixture('SLG-1-075',2,true);
 let next=attack(s,attacker);
 assert.equal(next.pending?.kind,'soloOptionalLife');
 assert.equal(next.pendingLifeDamage?.remaining,1);
 assert.equal(next.players[1].life.length,1);
 next=choose(next,'skip');
 assert.equal(next.pendingLifeDamage,null);
 assert.equal(next.players[1].life.length,0);
 // The second life may also reveal a Trigger: resolve or decline it before losing.
 while(next.pending){
  const opts=soloTrainingLegalActions(next);
  const last=opts.find(a=>a.mode==='skip'||a.uid===null)||opts[0];
  next=soloTrainingDispatch(next,last);
 }
 assert.equal(next.status,'finished');assert.equal(next.winner,0);
 assert.ok(assertSoloTrainingMatch(next));
});
test('builder selected 50-card custom purple deck actually starts that deck in Beta AI match',async()=>{
 const original={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const memory=new Map([['ua-slg-draft-v1',JSON.stringify(SOLO_SHADOW_TRAINING_PRESET)]]);
 const app={innerHTML:'',onclick:null,addEventListener(){}};
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?{textContent:'',classList:{add(){},remove(){}}}:null};
 globalThis.window={scrollTo(){}};
 globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,v)=>memory.set(key,v)};
 globalThis.setTimeout=()=>1;globalThis.clearTimeout=()=>{};
 try{
  await import('../dist/app.mjs?solo-q99-custom-'+Date.now());
  const click=dataset=>app.onclick({target:{closest(){return {dataset,disabled:false};}}});
  click({view:'builder'});click({title:'solo-leveling'});
  assert.match(app.innerHTML,/使用目前50張牌組 Beta AI 對戰/);
  assert.equal((app.innerHTML.match(/autoStatus ready/g)||[]).length,80);
  click({action:'soloTrainingStartCustom'});
  const saved=JSON.parse(memory.get('ua-slg-training-v1'));
  assert.ok(saved,'custom deck match saved');
  const n=saved.players[0].hand.concat(saved.players[0].deck,saved.players[0].life).filter(x=>x.cardId==='SLG-1-030').length;
  assert.equal(n,12,'must use purple custom deck, not green preset');
  assert.ok(assertSoloTrainingMatch(saved));
 }finally{Object.assign(globalThis,original);}
});
