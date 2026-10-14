import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,BY_ID,CARDS} from '../dist/cards.mjs';
import {newGame,dispatch,legalActions,bp,assertState} from '../dist/engine.mjs';
function fixture(ids=[]){
 const counts={...PRESETS[0].counts};
 for(const id of ids){
  if(counts[id])continue;
  const old=Object.keys(counts).find(k=>counts[k]>0&&!ids.includes(k)&&k!=='102');
  assert.ok(old,id);counts[old]--;counts[id]=1;
 }
 let s=newGame({seed:97103,decks:[counts,counts]});s=dispatch(s,{type:'keep'});s=dispatch(s,{type:'keep'});
 for(const pl of s.players){pl.deck.push(...pl.hand,...pl.life);pl.hand=[];pl.life=[];pl.front.fill(null);pl.energy.fill(null);pl.ap=3;pl.maxAp=3;pl.turnCount=3;}
 s.phase='main';s.active=0;s.turn=6;s.pending=null;s.queue=[];
 return s;
}
function take(s,id,p=0){const a=s.players[p].deck,i=a.findIndex(c=>c.cardId===id);assert.ok(i>=0,`${id} not in deck`);return a.splice(i,1)[0];}
function put(s,id,line='front',slot=0,p=0,ready=true){const c=take(s,id,p);c.ready=ready;s.players[p][line][slot]=c;return c;}
function putRaid(s,id,line='front',slot=0,p=0){
 const top=put(s,id,line,slot,p);
 const baseProfile=CARDS.find(d=>d.name===BY_ID[id]?.name&&!d.raid&&d.type==='character');
 assert.ok(baseProfile,'Missing non-Raid base for '+id);
 const base=take(s,'039',p);
 base.cardId=baseProfile.id;base.ready=false;
 top.stack=[base];top.ready=true;
 return top;
}
function hand(s,id,p=0){const c=take(s,id,p);s.players[p].hand.push(c);return c;}
function choose(s,...ids){assert.ok(s.pending,`Expected choice (${ids})`);const next=dispatch(s,{type:'choose',ids});assertState(next);return next;}
function boost(s,id='102',slot=0){const c=put(s,id,'energy',slot);c.energyBoostTurn=s.turn;c.energyBoostAmount=16;return c;}
function ability(s,c){const a=legalActions(s).find(a=>a.type==='ability'&&a.uid===c.uid);assert.ok(a,'no legal ability');return dispatch(s,a);}

test('FAQ Q560: remove all three outside cards, but no following effect when four are required',()=>{
 let s=fixture(['BLC-1-047']);boost(s);const base=put(s,'046','front',0);const r=hand(s,'BLC-1-047');
 const outside=[take(s,'039'),take(s,'034'),take(s,'035')];s.players[0].outside.push(...outside);
 s=dispatch(s,{type:'raid',uid:r.uid,target:base.uid,line:'front',slot:0});assert.equal(s.pending?.effect.kind,'removeOutside');
 assert.equal(s.pending.choices.length,3);s=choose(s,...outside.map(c=>c.uid));
 assert.equal(s.players[0].removed.length,3);assert.equal(s.players[0].outside.length,0);assert.equal(s.pending,null);assertState(s);
});

test('FAQ Q562: allow activated Byakuya with insufficient outside, consume two, do not grant IMPACT',()=>{
 let s=fixture(['BLC-1-050']);const by=putRaid(s,'BLC-1-050');
 const outside=[take(s,'039'),take(s,'034')];s.players[0].outside.push(...outside);
 s=ability(s,by);assert.equal(s.pending?.effect.kind,'removeOutside');s=choose(s,...outside.map(c=>c.uid));
 assert.equal(s.players[0].removed.length,2);assert.notEqual(s.players[0].front[0].impactTurn,s.turn);assertState(s);
});

test('FAQ Q568: Kenpachi BLC-1-081 cannot be exchanged front-to-energy by another card',()=>{
 let s=fixture(['BLC-1-081','BLC-2-002']);const ken=put(s,'BLC-1-081','front',0),askin=put(s,'BLC-2-002','front',1);put(s,'039','energy',0);const discard=hand(s,'034');
 s=ability(s,askin);assert.equal(s.pending?.effect.kind,'ruleChoice');s=choose(s,discard.uid);
 assert.equal(s.pending?.effect.kind,'chooseMode');s=choose(s,'0');
 if(s.pending){assert.equal(s.pending.effect.kind,'swapFrontPick');assert.ok(!s.pending.choices.some(x=>x.id===ken.uid));}
 assert.equal(s.players[0].front[0].uid,ken.uid);assertState(s);
});

test('FAQ Q1033/Q1046: discarded event draws AFTER Ichigo finishes his main ability, regardless of required energy',()=>{
 let s=fixture(['BLC-2-019','BLC-2-047']);const ich=putRaid(s,'BLC-2-019'),evt=hand(s,'BLC-2-047');
 s=ability(s,ich);assert.equal(s.pending?.effect.kind,'discardHand');s=choose(s,evt.uid);
 assert.equal(s.players[0].hand.length,2);assert.equal(bp(s,s.players[0].front[0]),5000);assert.equal(s.players[0].front[0].attackDrawTurn,s.turn);
 const log=s.log.map(x=>x.message);const buff=log.findIndex(x=>x.includes('BP +1000'));const draws=log.map((x,i)=>x.includes('抽 1 張牌')?i:-1).filter(x=>x>=0);
 assert.ok(draws.length>=2);assert.ok(draws[0]<buff&&buff<draws[1],`wrong effect order: ${log.slice(-8).join(' | ')}`);assertState(s);
});

test('FAQ Q1045: discarded Getsuga Jujisho can put a card on deck bottom and give double attack, no energy check',()=>{
 let s=fixture(['BLC-2-019','BLC-2-046']);const ich=putRaid(s,'BLC-2-019'),evt=hand(s,'BLC-2-046'),pay=hand(s,'034');
 s=ability(s,ich);s=choose(s,evt.uid);assert.equal(s.pending?.effect.kind,'blueCrossDiscard');
 s=choose(s,pay.uid);assert.equal(s.players[0].deck.at(-1).uid,pay.uid);assert.equal(s.players[0].front[0].doubleAttackTurn,s.turn);assertState(s);
});

test('FAQ Q2315: Liluka storing discarded Zangetsu does not cancel the delayed draw',()=>{
 let s=fixture(['BLC-2-019','BLC-2-047','BLC-4-034']);const ich=putRaid(s,'BLC-2-019'),lilu=put(s,'BLC-4-034','energy',0),evt=hand(s,'BLC-2-047');
 s=ability(s,ich);s=choose(s,evt.uid);assert.equal(s.pending?.effect.kind,'lilukaStore');s=choose(s,lilu.uid);
 assert.equal(s.players[0].hand.length,2);assert.equal(s.players[0].energy[0].under[0].uid,evt.uid);assertState(s);
});

test('FAQ Q1052: Raid Komamura resists rest but still receives skip-next-ACTIVE on freeze',()=>{
 let s=fixture(['BLC-1-031','BLC-1-003','BLC-1-002','BLC-2-065','BLC-1-078']);
 boost(s,'BLC-1-002',0);put(s,'BLC-1-003','front',1);
 const base=put(s,'BLC-1-078','front',2,1);const top=take(s,'BLC-2-065',1);top.stack=[base];top.ready=true;s.players[1].front[2]=top;
 const event=hand(s,'BLC-1-031');s=dispatch(s,{type:'play',uid:event.uid});
 if(s.pending){assert.equal(s.pending.effect.kind,'ruleChoice');s=choose(s,top.uid);}
 assert.equal(s.players[1].front[2].ready,true,'Komamura must stay ACTIVE');
 assert.equal(s.players[1].front[2].skipActive,1,'but its next ACTIVE operation should be skipped');assertState(s);
});

test('FAQ Q546/Q570: stripping Raid top does not resurrect pre-Raid BP buffs on underlying base',()=>{
 let s=fixture(['BLC-1-023','BLC-1-002']);boost(s,'BLC-1-002');const base=put(s,'039','front',0,1);base.buffs.push({turn:s.turn,bp:2000});
 const top=take(s,'104',1);top.ready=false;top.stack=[base];s.players[1].front[0]=top;
 const y=hand(s,'BLC-1-023');s=dispatch(s,{type:'play',uid:y.uid,line:'front',slot:0});assert.equal(s.pending?.effect.kind,'chooseMode');s=choose(s,'0');s=choose(s,top.uid);
 assert.equal(s.players[1].front[0].uid,base.uid);assert.equal(bp(s,s.players[1].front[0]),1500);assert.equal(s.players[1].front[0].ready,false);assertState(s);
});

test('FAQ Q1030: Orihime protection prevents character and trigger selection, but NOT event selection',()=>{
 let s=fixture(['BLC-2-048','BLC-2-013']);boost(s,'BLC-2-013');const target=put(s,'039','front',0,1);target.protectedUntilSource={p:1,turnCount:s.players[1].turnCount+1,scope:'characterTrigger'};
 const ev=hand(s,'BLC-2-048');assert.ok(legalActions(s).some(x=>x.type==='play'&&x.uid===ev.uid),'an event can still target Orihime-protected Ichigo');
 s=dispatch(s,{type:'play',uid:ev.uid});assert.equal(s.pending?.effect.kind,'ruleChoice');assert.ok(s.pending.choices.some(x=>x.id===target.uid));s=choose(s,target.uid);
 assert.equal(s.players[1].front[0],null);assertState(s);
});

test('FAQ Q2328/Q2338: AP discount is NOT consumed by playing an ineligible character',()=>{
 let s=fixture([]);s.players[0].nextApDiscount={turn:s.turn,names:['朽木露琪亞'],amount:1};const unrelated=hand(s,'034');
 s=dispatch(s,{type:'play',uid:unrelated.uid,line:'front',slot:0});
 assert.ok(s.players[0].nextApDiscount,'unrelated card must not clear pending conditional discount');assertState(s);
});

test('FAQ Q2335: two copies of Nanao share their once-per-turn activated ability',()=>{
 let s=fixture(['BLC-4-065']);let first=put(s,'BLC-4-065');let second=take(s,'034');second.cardId='BLC-4-065';second.ready=false;s.players[0].front[1]=second;
 s.players[0].turnEvents=['神劍・八鏡劍'];assert.ok(legalActions(s).filter(x=>x.type==='ability'&&[first.uid,second.uid].includes(x.uid)).length===2);
 s=ability(s,first);assert.ok(!legalActions(s).some(x=>x.type==='ability'&&x.uid===second.uid));assertState(s);
});

test('FAQ Q2332: losing printed effects does not remove buffs already granted by other effects',()=>{
 let s=fixture(['BLC-4-052']);const source=put(s,'BLC-4-052');const original=bp(s,source);source.buffs.push({turn:s.turn,bp:2000});source.silencedUntilSource={p:1,turnCount:s.players[1].turnCount+1};
 assert.equal(bp(s,source),original+2000);assertState(s);
});
