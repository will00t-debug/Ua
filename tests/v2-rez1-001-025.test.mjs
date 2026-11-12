// UA40BT/REZ-1-001–025. Official text checked 2026-11-07.
// These cases cover the clauses the earlier set-1 file does not execute:
// a private look versus the one published card, an ordinary play versus a
// face-up raid, a this-turn grant that stays after the printed text is
// silenced, and the life symbols printed on this range.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRezeroV2Pack} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,universalPrivateChoices,
 universalPublicView
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const fours=['REZ-1-005','REZ-1-006','REZ-1-007','REZ-1-008','REZ-1-012',
 'REZ-1-014','REZ-1-019','REZ-1-022','REZ-1-024'];
const twos=['REZ-1-009','REZ-1-010','REZ-1-011','REZ-1-015','REZ-1-018','REZ-1-023','REZ-1-025'];
const counts={
 ...Object.fromEntries(fours.map(id=>[id,4])),
 ...Object.fromEntries(twos.map(id=>[id,2]))
};
assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
const fresh=seed=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});

function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function fuel(s,p,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,p,id);
  card.ready=false;
  s.players[p].energy[i]=card;
 });
}
function reach(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase+' '+(s.pending?.kind||s.phase));
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function walk(s,done){
 for(let guard=0;guard<80&&!done(s);guard++){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand[0];
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid:hand.uid});
  }else if(s.pending?.kind==='block'){
   s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
  }else{
   const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=dispatchUniversalAction(packs,s,next);
  }
 }
 assert.ok(done(s));
 return s;
}
function play(s,p,id,line){
 const card=pull(s,p,id);
 s.players[p].hand.push(card);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===card.uid&&
  (line?a.line===line:true));
 assert.ok(action,id);
 return [dispatchUniversalAction(packs,s,action),card];
}
function setTop(s,p,ids){
 const pl=s.players[p];
 const cards=ids.map(id=>{
  let index=pl.deck.findIndex(c=>c.cardId===id);
  if(index<0)throw Error('deck missing '+id);
  return pl.deck.splice(index,1)[0];
 });
 pl.deck.unshift(...cards);
 return cards;
}
function order(s,uids){
 for(const uid of uids){
  assert.equal(s.pending.kind,'effect-top-order');
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function hiddenFrom(s,viewer,uids){
 assert.equal(universalPrivateChoices(packs,s,viewer),null);
 const blob=JSON.stringify(universalPublicView(packs,s,viewer));
 for(const uid of uids)assert.equal(blob.includes('"'+uid+'"'),false,uid);
}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
}
function skipOn(s,uid){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===uid&&!e.consumed);
}

test('REZ-1-009 keeps the look private and publishes only the taken card',()=>{
 let declined=fresh(1101);
 fuel(declined,0,['REZ-1-008']);
 const missed=setTop(declined,0,['REZ-1-022','REZ-1-007','REZ-1-005']);
 declined=reach(declined,'main');
 [declined]=play(declined,0,'REZ-1-009','energy');
 assert.equal(declined.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(declined.pending.choices,[missed[1].uid]);
 hiddenFrom(declined,1,missed.map(c=>c.uid));
 declined=dispatchUniversalAction(packs,declined,{type:'chooseTopFiltered',uid:null});
 declined=order(declined,[missed[2].uid,missed[0].uid,missed[1].uid]);
 assert.equal(declined.pending,null);
 assert.equal(declined.publicReveals.some(c=>missed.some(card=>card.uid===c.uid)),false);
 assert.equal(declined.players[0].hand.some(c=>c.uid===missed[1].uid),false);
 assert.deepEqual(declined.players[0].deck.slice(-3).map(c=>c.uid),
  [missed[2].uid,missed[0].uid,missed[1].uid]);

 let taken=fresh(1102);
 fuel(taken,0,['REZ-1-008']);
 const found=setTop(taken,0,['REZ-1-022','REZ-1-012','REZ-1-007']);
 taken=reach(taken,'main');
 [taken]=play(taken,0,'REZ-1-009','energy');
 hiddenFrom(taken,1,found.map(c=>c.uid));
 taken=dispatchUniversalAction(packs,taken,{type:'chooseTopFiltered',uid:found[2].uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'REZ-1-007');
 assert.equal(taken.publicReveals.filter(c=>found.some(card=>card.uid===c.uid))
  .map(c=>c.uid).join(','),found[2].uid);
 taken=order(taken,[found[1].uid,found[0].uid]);
 assert.equal(taken.pending.kind,'effect-discard');
 const dumped=taken.players[0].hand.find(c=>c.uid!==found[2].uid);
 taken=dispatchUniversalAction(packs,taken,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===found[2].uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,taken),true);
});

test('REZ-1-025 looks privately and may leave every card on top',()=>{
 let kept=fresh(1103);
 fuel(kept,0,['REZ-1-008']);
 const all=setTop(kept,0,['REZ-1-022','REZ-1-012','REZ-1-014']);
 kept=reach(kept,'main');
 [kept]=play(kept,0,'REZ-1-025','energy');
 assert.equal(kept.pending.kind,'effect-top-inspect');
 assert.deepEqual(kept.pending.uids,all.map(c=>c.uid));
 assert.equal(universalPublicView(packs,kept,1).pending.uids,undefined);
 hiddenFrom(kept,1,all.map(c=>c.uid));
 kept=dispatchUniversalAction(packs,kept,{type:'chooseInspectedOutside',uid:null});
 kept=order(kept,[all[2].uid,all[0].uid,all[1].uid]);
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].outside.some(c=>all.some(card=>card.uid===c.uid)),false);
 assert.deepEqual(kept.players[0].deck.slice(0,3).map(c=>c.uid),
  [all[2].uid,all[0].uid,all[1].uid]);
 hiddenFrom(kept,1,all.map(c=>c.uid));

 let sent=fresh(1104);
 fuel(sent,0,['REZ-1-008']);
 const window=setTop(sent,0,['REZ-1-022','REZ-1-012','REZ-1-014']);
 sent=reach(sent,'main');
 [sent]=play(sent,0,'REZ-1-025','energy');
 sent=dispatchUniversalAction(packs,sent,{type:'chooseInspectedOutside',uid:window[0].uid});
 sent=order(sent,[window[2].uid,window[1].uid]);
 assert.equal(sent.pending,null);
 assert.equal(sent.players[0].outside.some(c=>c.uid===window[0].uid),true);
 assert.deepEqual(sent.players[0].deck.slice(0,2).map(c=>c.uid),[window[2].uid,window[1].uid]);
 hiddenFrom(sent,1,[window[1].uid,window[2].uid]);
 assert.equal(assertUniversalMatch(packs,kept),true);
 assert.equal(assertUniversalMatch(packs,sent),true);
});

test('REZ-1-011 is silent without a raid and the face-up raid cuts BP this turn',()=>{
 let plain=fresh(1105);
 fuel(plain,0,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 plain=reach(plain,'main');
 let entered;
 [plain,entered]=play(plain,0,'REZ-1-011','front');
 assert.equal(plain.pending,null);
 assert.equal(entered.ready,false);
 assert.equal(entered.stack.length,0);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='activate'&&a.uid===entered.uid),false);

 let live=fresh(1106);
 fuel(live,0,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const host=pull(live,0,'REZ-1-008');
 host.ready=false;
 live.players[0].front[0]=host;
 const small=pull(live,1,'REZ-1-005'),mid=pull(live,1,'REZ-1-012'),big=pull(live,1,'REZ-1-014');
 live.players[1].front[0]=small;
 live.players[1].front[1]=mid;
 live.players[1].front[2]=big;
 live=reach(live,'main');
 const ram=pull(live,0,'REZ-1-011');
 live.players[0].hand.push(ram);
 const raid=legalUniversalActions(packs,live).find(a=>a.type==='raid'&&a.uid===ram.uid&&
  a.baseUid===host.uid);
 assert.ok(raid);
 live=dispatchUniversalAction(packs,live,raid);
 assert.equal(live.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(packs,live).filter(a=>a.type==='chooseEffectMode');
 assert.equal(modes.some(a=>a.mode==='skip'),false);
 assert.ok(modes.some(a=>a.mode==='allDown'));
 assert.ok(modes.some(a=>a.mode==='oneDown'));
 live=dispatchUniversalAction(packs,live,{type:'chooseEffectMode',mode:'allDown'});
 assert.equal(live.pending,null);
 assert.equal(universalBp(packs,live,live.players[1].front[0]),500);
 assert.equal(universalBp(packs,live,live.players[1].front[1]),500);
 assert.equal(universalBp(packs,live,live.players[1].front[2]),1500);
 live=walk(live,s=>s.active===1&&s.phase==='main'&&!s.pending);
 assert.equal(universalBp(packs,live,live.players[1].front[0]),500);
 assert.equal(universalBp(packs,live,live.players[1].front[1]),1500);
 assert.equal(universalBp(packs,live,live.players[1].front[2]),2500);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('REZ-1-019 is silent without a raid and the granted impact ends this turn',()=>{
 let plain=fresh(1118);
 fuel(plain,0,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 plain=reach(plain,'main');
 let entered;
 [plain,entered]=play(plain,0,'REZ-1-019','front');
 assert.equal(plain.pending,null);
 assert.equal(entered.ready,false);
 assert.equal(entered.stack.length,0);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='activate'&&
  a.uid===entered.uid),false);

 let live=fresh(1119);
 fuel(live,0,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const host=pull(live,0,'REZ-1-014');
 host.ready=false;
 live.players[0].front[0]=host;
 const ram=pull(live,0,'REZ-1-008');
 live.players[0].hand.push(ram);
 live=reach(live,'main');
 const rem=pull(live,0,'REZ-1-019');
 live.players[0].hand.push(rem);
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>
  a.type==='raid'&&a.uid===rem.uid&&a.baseUid===host.uid));
 assert.equal(live.pending.kind,'effect-hand-named-rest');
 assert.equal(live.pending.choices.includes(ram.uid),true);
 const enter=legalUniversalActions(packs,live).find(a=>a.type==='chooseHandNamedRest'&&
  a.uid===ram.uid&&a.line==='front');
 live=dispatchUniversalAction(packs,live,enter);
 assert.equal(live.players[0].front.find(c=>c?.uid===ram.uid).ready,false);
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>
  a.type==='activate'&&a.mode==='grantNamedImpact'&&a.uid===rem.uid));
 assert.equal(live.pending.choices.includes(rem.uid),false);
 live=dispatchUniversalAction(packs,live,{type:'chooseGrantNamedImpact',uid:ram.uid});
 assert.equal(universalImpact(packs,live,live.players[0].front.find(c=>c?.uid===ram.uid)),1);
 live=walk(live,s=>s.active===1&&s.phase==='main'&&!s.pending);
 assert.equal(universalImpact(packs,live,live.players[0].front.find(c=>c?.uid===ram.uid)),0);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('REZ-1-015 skips the raid frame on an ordinary play and the cut ends this turn',()=>{
 let plain=fresh(1107);
 fuel(plain,0,['REZ-1-007','REZ-1-007','REZ-1-007']);
 plain=reach(plain,'main');
 let entered;
 [plain,entered]=play(plain,0,'REZ-1-015','front');
 assert.equal(plain.pending,null);
 assert.equal(universalBp(packs,plain,entered),3500);
 assert.equal(legalUniversalActions(packs,plain).some(a=>a.type==='activate'&&
  a.uid===entered.uid),false);

 let live=fresh(1108);
 fuel(live,0,['REZ-1-007','REZ-1-007','REZ-1-007']);
 const host=pull(live,0,'REZ-1-014');
 host.ready=false;
 live.players[0].front[0]=host;
 const prey=pull(live,1,'REZ-1-012');
 live.players[1].front[0]=prey;
 live=reach(live,'main');
 const rem=pull(live,0,'REZ-1-015');
 live.players[0].hand.push(rem);
 const deck=live.players[0].deck.length;
 live=dispatchUniversalAction(packs,live,legalUniversalActions(packs,live).find(a=>
  a.type==='raid'&&a.uid===rem.uid&&a.baseUid===host.uid));
 assert.equal(live.players[0].deck.length,deck-1);
 assert.equal(live.pending.kind,'effect-discard');
 const dumped=live.players[0].hand[0];
 live=dispatchUniversalAction(packs,live,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(live.pending,null);
 const top=live.players[0].front.find(c=>c?.uid===rem.uid);
 assert.equal(top.ready,true);
 assert.equal(universalBp(packs,live,top),4000);
 const cut=legalUniversalActions(packs,live).find(a=>a.type==='activate'&&
  a.mode==='frontOnce'&&a.uid===rem.uid);
 assert.ok(cut);
 live=dispatchUniversalAction(packs,live,cut);
 assert.equal(live.pending.kind,'effect-target');
 assert.equal(live.pending.choices.includes(null),false);
 assert.deepEqual(live.pending.choices,[prey.uid]);
 live=dispatchUniversalAction(packs,live,{type:'chooseTarget',uid:prey.uid});
 assert.equal(universalBp(packs,live,live.players[1].front[0]),500);
 live=walk(live,s=>s.active===1&&s.phase==='main'&&!s.pending);
 assert.equal(universalBp(packs,live,live.players[0].front.find(c=>c?.uid===rem.uid)),3500);
 assert.equal(universalBp(packs,live,live.players[1].front[0]),1500);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,live),true);
});

test('REZ-1-006 keeps the gained energy and retirement after its printed text is silenced',()=>{
 let blocked=fresh(1109);
 const quiet=pull(blocked,0,'REZ-1-006');
 quiet.ready=true;
 quiet.fieldEntryStamp=1;
 blocked.players[0].energy[0]=quiet;
 silence(blocked,quiet.uid);
 blocked=reach(blocked,'main');
 assert.equal(universalEnergyByColor(packs,blocked,0).yellow,1);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='activate'&&
  a.uid===quiet.uid),false);

 let gained=fresh(1110);
 const ram=pull(gained,0,'REZ-1-006');
 ram.ready=true;
 ram.fieldEntryStamp=1;
 gained.players[0].energy[0]=ram;
 gained=reach(gained,'main');
 assert.equal(universalEnergyByColor(packs,gained,0).yellow,1);
 gained=dispatchUniversalAction(packs,gained,legalUniversalActions(packs,gained).find(a=>
  a.type==='activate'&&a.mode==='selfRestEnergyRetire'&&a.uid===ram.uid));
 assert.equal(universalEnergyByColor(packs,gained,0).yellow,2);
 assert.equal(gained.players[0].energy[0].ready,false);
 silence(gained,ram.uid);
 assert.equal(universalEnergyByColor(packs,gained,0).yellow,2);
 assert.equal(legalUniversalActions(packs,gained).some(a=>a.mode==='selfRestEnergyRetire'&&
  a.uid===ram.uid),false);
 gained=dispatchUniversalAction(packs,gained,legalUniversalActions(packs,gained).find(a=>a.type==='next'));
 assert.equal(gained.phase,'attack');
 assert.equal(gained.players[0].energy[0],null);
 assert.equal(gained.players[0].outside.some(c=>c.uid===ram.uid),true);
 assert.equal(assertUniversalMatch(packs,blocked),true);
 assert.equal(assertUniversalMatch(packs,gained),true);
});

test('REZ-1-010 draws when Rem is on the energy line and not otherwise',()=>{
 let named=fresh(1120);
 fuel(named,0,['REZ-1-007','REZ-1-007','REZ-1-007']);
 const rem=pull(named,0,'REZ-1-012');
 rem.ready=false;
 named.players[0].energy[3]=rem;
 named=reach(named,'main');
 const ram=pull(named,0,'REZ-1-010');
 named.players[0].hand.push(ram);
 const deck=named.players[0].deck.length;
 named=dispatchUniversalAction(packs,named,legalUniversalActions(packs,named).find(a=>
  a.type==='play'&&a.uid===ram.uid&&a.line==='front'));
 assert.equal(named.pending,null);
 assert.equal(named.players[0].deck.length,deck-1);

 let quiet=fresh(1121);
 fuel(quiet,0,['REZ-1-007','REZ-1-007','REZ-1-007']);
 quiet=reach(quiet,'main');
 const lone=pull(quiet,0,'REZ-1-010');
 quiet.players[0].hand.push(lone);
 const quietDeck=quiet.players[0].deck.length;
 quiet=dispatchUniversalAction(packs,quiet,legalUniversalActions(packs,quiet).find(a=>
  a.type==='play'&&a.uid===lone.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,quietDeck);
 assert.equal(assertUniversalMatch(packs,named),true);
 assert.equal(assertUniversalMatch(packs,quiet),true);
});

test('REZ-1-024 returns an energy-1 character to hand and is not a retirement',()=>{
 let s=fresh(1111);
 fuel(s,0,['REZ-1-008']);
 const low=pull(s,0,'REZ-1-014'),heavy=pull(s,0,'REZ-1-008');
 low.ready=false;heavy.ready=false;
 s.players[0].front[0]=low;
 s.players[0].front[1]=heavy;
 s=reach(s,'main');
 let emilia;
 [s,emilia]=play(s,0,'REZ-1-024','front');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 assert.equal(s.pending.choices.includes(emilia.uid),false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBounce',uid:low.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===low.uid),false);
 assert.equal(s.players[0].front.some(c=>c?.uid===emilia.uid),true);
 assert.equal((s.turnRetireEvents||[]).some(e=>e.uid===low.uid),false);

 let home=fresh(1112);
 fuel(home,0,['REZ-1-008']);
 const wall=pull(home,0,'REZ-1-008');
 wall.ready=false;
 home.players[0].front[0]=wall;
 home=reach(home,'main');
 let self;
 [home,self]=play(home,0,'REZ-1-024','front');
 assert.equal(home.pending,null);
 assert.equal(home.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(home.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal((home.turnRetireEvents||[]).some(e=>e.uid===self.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,home),true);
});

test('REZ-1-018 color trigger rests one front character and skips the next active once',()=>{
 let s=fresh(1113);
 const attacker=pull(s,1,'REZ-1-014');
 attacker.ready=true;
 attacker.fieldEntryStamp=1;
 s.players[1].front[0]=attacker;
 const bystander=pull(s,1,'REZ-1-008');
 bystander.ready=true;
 bystander.fieldEntryStamp=2;
 s.players[1].front[1]=bystander;
 s.players[0].deck.push(s.players[0].life[0]);
 const trigger=pull(s,0,'REZ-1-018');
 s.players[0].life[0]=trigger;
 s=walk(s,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'color');
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorRestSkip',uid:bystander.uid});
 assert.equal(s.players[1].front[1].ready,false);
 assert.equal(skipOn(s,bystander.uid),true);
 s=walk(s,x=>x.active===0&&x.players[0].ownTurns>=2&&x.phase==='start'&&!x.pending);
 assert.equal(s.players[1].front[1].ready,false);
 assert.equal(skipOn(s,bystander.uid),false);
 s=walk(s,x=>x.active===1&&x.players[1].ownTurns>=2&&x.phase==='start'&&!x.pending);
 assert.equal(s.players[1].front[1].ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('life symbols on 007, 012, 005 and 011 resolve the printed sentence',()=>{
 function life(seed,id){
  const s=fresh(seed);
  const attacker=pull(s,0,'REZ-1-014');
  attacker.ready=true;
  attacker.fieldEntryStamp=1;
  s.players[0].front[0]=attacker;
  s.players[1].deck.push(s.players[1].life[0]);
  const trigger=pull(s,1,id);
  s.players[1].life[0]=trigger;
  return {s,attacker,trigger};
 }
 let draw=life(1114,'REZ-1-007');
 draw.s=walk(draw.s,x=>x.phase==='attack'&&!x.pending);
 const hand=draw.s.players[1].hand.length;
 draw.s=dispatchUniversalAction(packs,draw.s,{type:'attack',uid:draw.attacker.uid});
 draw.s=dispatchUniversalAction(packs,draw.s,{type:'chooseBlock',uid:null});
 assert.equal(draw.s.pending.trigger,'draw');
 draw.s=dispatchUniversalAction(packs,draw.s,{type:'chooseTrigger',mode:'draw'});
 assert.equal(draw.s.players[1].hand.length,hand+1);
 assert.equal(draw.s.players[1].hand.some(c=>c.uid===draw.trigger.uid),false);
 assert.equal(draw.s.players[1].outside.some(c=>c.uid===draw.trigger.uid),true);

 let got=life(1115,'REZ-1-012');
 got.s=walk(got.s,x=>x.phase==='attack'&&!x.pending);
 got.s=dispatchUniversalAction(packs,got.s,{type:'attack',uid:got.attacker.uid});
 got.s=dispatchUniversalAction(packs,got.s,{type:'chooseBlock',uid:null});
 assert.equal(got.s.pending.trigger,'get');
 got.s=dispatchUniversalAction(packs,got.s,{type:'chooseTrigger',mode:'get'});
 assert.equal(got.s.players[1].hand.filter(c=>c.uid===got.trigger.uid).length,1);
 assert.equal(got.s.players[1].deck.some(c=>c.uid===got.trigger.uid),false);

 let active=life(1116,'REZ-1-005');
 const rested=pull(active.s,1,'REZ-1-014');
 rested.ready=false;
 rested.fieldEntryStamp=2;
 active.s.players[1].front[0]=rested;
 active.s=walk(active.s,x=>x.phase==='attack'&&!x.pending);
 active.s=dispatchUniversalAction(packs,active.s,{type:'attack',uid:active.attacker.uid});
 active.s=dispatchUniversalAction(packs,active.s,{type:'chooseBlock',uid:null});
 assert.equal(active.s.pending.trigger,'active');
 active.s=dispatchUniversalAction(packs,active.s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(active.s.players[1].front[0].ready,true);
 assert.equal(universalBp(packs,active.s,active.s.players[1].front[0]),5500);
 active.s=walk(active.s,x=>x.active===1&&x.phase==='main'&&!x.pending);
 assert.equal(universalBp(packs,active.s,active.s.players[1].front[0]),2500);

 let raid=life(1117,'REZ-1-011');
 fuel(raid.s,1,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const host=pull(raid.s,1,'REZ-1-008');
 host.ready=false;
 raid.s.players[1].front[0]=host;
 raid.s=walk(raid.s,x=>x.phase==='attack'&&!x.pending);
 raid.s=dispatchUniversalAction(packs,raid.s,{type:'attack',uid:raid.attacker.uid});
 raid.s=dispatchUniversalAction(packs,raid.s,{type:'chooseBlock',uid:null});
 assert.equal(raid.s.pending.trigger,'raid');
 const raidAction=legalUniversalActions(packs,raid.s).find(a=>a.type==='chooseTrigger'&&
  a.mode==='raid'&&a.baseUid===host.uid);
 assert.ok(raidAction);
 raid.s=dispatchUniversalAction(packs,raid.s,raidAction);
 assert.equal(raid.s.players[1].front[0].uid,raid.trigger.uid);
 assert.equal(raid.s.players[1].front[0].ready,true);
 assert.equal(raid.s.players[1].front[0].stack[0].uid,host.uid);
 assert.equal(raid.s.pending.kind,'effect-choice-mode');
 raid.s=dispatchUniversalAction(packs,raid.s,{type:'chooseEffectMode',mode:'allDown'});
 assert.equal(raid.s.pending,null);
 assert.equal(assertUniversalMatch(packs,draw.s),true);
 assert.equal(assertUniversalMatch(packs,got.s),true);
 assert.equal(assertUniversalMatch(packs,active.s),true);
 assert.equal(assertUniversalMatch(packs,raid.s),true);
});
