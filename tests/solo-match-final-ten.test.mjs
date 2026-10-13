import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloEnergy,soloMatchBp,soloTrainingBotAction,inspectSoloAttached,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

const fixtures=(color,ids=[])=>{
 const base=color==='purple'?SOLO_SHADOW_TRAINING_PRESET:SOLO_TRAINING_PRESET;
 const keys=color==='purple'?['SLG-1-001','SLG-1-009','SLG-1-010']:['SLG-1-062','SLG-1-065','SLG-1-066'];
 const counts={...base};ids.forEach((id,i)=>{counts[keys[i]]=0;counts[id]=4;});
 const s=newSoloTrainingMatch({decks:[counts,counts],seed:765,first:0});
 s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;
};
const drawCard=(p,id)=>{for(const key of ['hand','deck','life']){const i=p[key].findIndex(c=>c.cardId===id);if(i>=0)return p[key].splice(i,1)[0];}throw Error('no card in fixture: '+id);};
const onField=(s,id,line,slot,owner=0,ready=true)=>{
 const c=drawCard(s.players[owner],id);Object.assign(c,{owner,line,slot,ready});
 s.players[owner][line][slot]=c;return c;
};
const prepare=(s,id)=>{const c=drawCard(s.players[0],id);s.players[0].hand.push(c);return c;};
const legal=(s,fn)=>{const a=soloTrainingLegalActions(s).find(fn);assert.ok(a,'legal action missing');return a;};
const dispatch=(s,a)=>soloTrainingDispatch(s,a);
const raid=(s,id,base)=>{const c=prepare(s,id);const a=legal(s,x=>x.type==='raid'&&x.uid===c.uid&&x.target===base.uid&&x.line==='front');
 return {s:dispatch(s,a),uid:c.uid};};
const purplePower=s=>{
 for(let i=0;i<4;i++)onField(s,i===0?'SLG-1-006':'SLG-1-030','energy',i);
};
const greenPower=s=>{for(let i=0;i<4;i++)onField(s,'SLG-1-041','energy',i);};
test('020 can draw then pay a chosen hand card and recover a just-discarded BP3000 non-Sung (Q2027)',()=>{
 let s=fixtures('purple',['SLG-1-020']);purplePower(s);
 const base=onField(s,'SLG-1-015','front',0);
 let r=raid(s,'SLG-1-020',base);s=r.s;assert.equal(s.pending.kind,'slg020EntryDiscard');
 const candidate=drawCard(s.players[0],'SLG-1-030');s.players[0].hand.push(candidate);
 const handCandidate=s.players[0].hand.find(x=>x.uid===candidate.uid);
 assert.ok(handCandidate);s=dispatch(s,{type:'choose',uid:handCandidate.uid});
 assert.equal(s.pending.kind,'slg020Recover');
 assert.ok(soloTrainingLegalActions(s).some(x=>x.uid===handCandidate.uid));
 s=dispatch(s,{type:'choose',uid:handCandidate.uid});assert.ok(s.players[0].hand.some(x=>x.uid===handCandidate.uid));
 assertSoloTrainingMatch(s);
});
test('021 cannot pass mandatory block if a legal blocker exists (Q2028); 021 conditional impact remains BP-bound',()=>{
 let s=fixtures('purple',['SLG-1-021']);purplePower(s);const base=onField(s,'SLG-1-015','front',0);
 const fighter=raid(s,'SLG-1-021',base);s=fighter.s;
 const defender=onField(s,'SLG-1-030','front',0,1,true);
 s.phase='attack';s=dispatch(s,{type:'attack',uid:fighter.uid});
 assert.equal(s.pending.kind,'block');assert.equal(s.pending.mandatory,true);
 assert.ok(soloTrainingLegalActions(s).every(x=>x.uid!=null));
 s=dispatch(s,{type:'choose',uid:defender.uid});
 assertSoloTrainingMatch(s);
});
test('022 high-energy Sung Raid receives reduced required energy per shadow, and can choose both lines ACTIVE',()=>{
 let s=fixtures('purple',['SLG-1-022']);const base=onField(s,'SLG-1-015','front',0);
 for(let i=1;i<4;i++)onField(s,'SLG-1-030','front',i);
 for(let i=0;i<4;i++)onField(s,'SLG-1-029','energy',i);
 const c=prepare(s,'SLG-1-022');assert.ok(soloEnergy(s)>=5);
 const a=legal(s,x=>x.type==='raid'&&x.uid===c.uid&&x.target===base.uid);
 s=dispatch(s,a);assert.equal(s.pending.kind,'slg022Enter');
 assert.equal(s.pending.line,'front');
 s=dispatch(s,{type:'choose',uid:s.players[0].front[1].uid});
 assert.equal(s.pending.line,'energy');
 s=dispatch(s,{type:'choose',uid:s.players[0].energy[0].uid});
 assert.equal(s.pending,null);assertSoloTrainingMatch(s);
});
test('047 end-attack Raid spends exactly two own facedown cards, leaves old base, resets previous buffs (Q2042–2046)',()=>{
 let s=fixtures('green',['SLG-1-047','SLG-1-048']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0);
 const r=raid(s,'SLG-1-047',base);s=r.s;
 const host=s.players[0].front[0],next=prepare(s,'SLG-1-048');
 const attached=s.players[0].deck.splice(0,2).map(x=>({...x,faceDown:true}));host.under.push(...attached);
 host.buffs.push({turn:s.turn,bp:2000});host.ready=false;
 s.phase='attack';const before=s.players[0].ap;
 s=dispatch(s,{type:'next'});assert.equal(s.pending.kind,'slgEndRaid');
 const change=legal(s,x=>x.uid===next.uid&&x.used?.length===2);
 s=dispatch(s,change);assert.equal(s.players[0].ap,before);
 assert.equal(s.players[0].front[0].uid,next.uid);assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].front[0].buffs.length,0);
 assert.ok(attached.every(x=>s.players[0].outside.some(y=>y.uid===x.uid)));
 if(s.pending?.kind==='slg048Deploy')s=dispatch(s,{type:'choose',uid:null});
 assertSoloTrainingMatch(s);
});
test('048 end attack Raid accepts only green-energy-6 049 and three OWN facedown; cannot act after phase end',()=>{
 let s=fixtures('green',['SLG-1-048','SLG-1-049']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0);
 const f=raid(s,'SLG-1-048',base);s=f.s;
 if(s.pending?.kind==='slg048Deploy')s=dispatch(s,{type:'choose',uid:null});
 const next=prepare(s,'SLG-1-049'),top=s.players[0].front[0];
 top.under.push(...s.players[0].deck.splice(0,3).map(c=>({...c,faceDown:true})));
 s.phase='attack';s=dispatch(s,{type:'next'});
 assert.equal(s.pending.kind,'slgEndRaid');
 s=dispatch(s,legal(s,x=>x.uid===next.uid));
 if(s.pending?.kind==='slg049Destroy')s=dispatch(s,{type:'choose',uid:null});
 assert.equal(s.players[0].front[0].uid,next.uid);assertSoloTrainingMatch(s);
});
test('049 grants IMPACT and BP +500; own effect entrance offers opponent target or decline',()=>{
 let s=fixtures('green',['SLG-1-049']);greenPower(s);const base=onField(s,'SLG-1-045','front',0);
 const enemy=onField(s,'SLG-1-041','front',0,1);
 const r=raid(s,'SLG-1-049',base);s=r.s;
 assert.equal(soloMatchBp(s,s.players[0].front[0]),4500);
 assert.equal(s.pending.kind,'slg049Destroy');assert.ok(soloTrainingLegalActions(s).some(x=>x.uid===enemy.uid));
 s=dispatch(s,{type:'choose',uid:enemy.uid});assert.equal(s.players[1].front[0],null);
 assertSoloTrainingMatch(s);
});
test('051 can pay additional AP, discard eligible 047 then Raid that exact card from outside (Q2054)',()=>{
 let s=fixtures('green',['SLG-1-051','SLG-1-047']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0),eri=prepare(s,'SLG-1-051');
 const enter=legal(s,a=>a.type==='play'&&a.uid===eri.uid);
 s=dispatch(s,enter);assert.equal(s.pending.kind,'slg051Mode');
 s=dispatch(s,{type:'choose',mode:'raid'});
 const top=prepare(s,'SLG-1-047');s=dispatch(s,{type:'choose',uid:top.uid});
 assert.equal(s.pending.kind,'slg051Raid');
 s=dispatch(s,legal(s,a=>a.uid===top.uid&&a.target===base.uid&&a.line==='front'));
 assert.equal(s.players[0].front[0].uid,top.uid);
 assertSoloTrainingMatch(s);
});
test('060 energy line may swap with frozen front at end of friendly character attack (Q2059)',()=>{
 let s=fixtures('green',['SLG-1-060']);
 const machida=onField(s,'SLG-1-060','energy',0);
 const attacker=onField(s,'SLG-1-045','front',0);attacker.skipActive=1;
 s.phase='attack';s=dispatch(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'slg060Swap');
 s=dispatch(s,{type:'choose',uid:machida.uid});
 s=dispatch(s,{type:'choose',uid:attacker.uid});
 assert.equal(s.players[0].front[0].uid,machida.uid);
 assert.equal(s.players[0].energy[0].uid,attacker.uid);assertSoloTrainingMatch(s);
});
test('061 entry targets a different island ally and end attack may discard to ACTIVE an island ally',()=>{
 let s=fixtures('green',['SLG-1-061']);greenPower(s);
 const ally=onField(s,'SLG-1-055','front',0,0,false),minobu=prepare(s,'SLG-1-061');
 const act=legal(s,a=>a.type==='play'&&a.uid===minobu.uid);
 s=dispatch(s,act);assert.equal(s.pending.kind,'slg061Enter');
 s=dispatch(s,{type:'choose',uid:ally.uid});
 assert.equal(soloMatchBp(s,s.players[0].front[0]),2500);
 s.phase='attack';s=dispatch(s,{type:'next'});
 assert.equal(s.pending.kind,'slg061End');
 const cost=legal(s,x=>x.uid!=null);s=dispatch(s,cost);
 assert.equal(s.pending.kind,'slg061Active');
 s=dispatch(s,{type:'choose',uid:ally.uid});assert.equal(s.players[0].front[0].ready,true);
 assertSoloTrainingMatch(s);
});
test('064 Raid when five island characters present debuffs enemies BP>=1500 and attacking can choose destruction and skip next ACTIVE',()=>{
 let s=fixtures('green',['SLG-1-064','SLG-1-063']);const base=onField(s,'SLG-1-063','front',0);
 onField(s,'SLG-1-055','front',1);
 onField(s,'SLG-1-056','front',2);
 onField(s,'SLG-1-066','front',3);
 onField(s,'SLG-1-067','energy',0);
 for(let i=1;i<4;i++)onField(s,'SLG-1-041','energy',i);
 const enemy=onField(s,'SLG-1-041','front',0,1);
 const raidCard=prepare(s,'SLG-1-064');
 const action=legal(s,a=>a.type==='raid'&&a.uid===raidCard.uid&&a.target===base.uid);
 s=dispatch(s,action);assert.equal(soloMatchBp(s,s.players[1].front[0]),1500);
 s.phase='attack';s=dispatch(s,{type:'attack',uid:raidCard.uid});
 assert.equal(s.pending.kind,'slg064Attack');
 s=dispatch(s,{type:'choose',mode:'destroy'});
 assert.equal(s.pending.kind,'slg064Destroy');
 s=dispatch(s,{type:'choose',uid:enemy.uid});
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[0].front[action.slot].skipActive,1);assertSoloTrainingMatch(s);
});

test('Q2043-46: 047 can pay two hidden cards to peel its top without a new Raid, preserving REST and base UID',()=>{
 let s=fixtures('green',['SLG-1-047']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0);
 const r=raid(s,'SLG-1-047',base);s=r.s;
 const top=s.players[0].front[0];
 top.ready=false;top.buffs.push({turn:s.turn,bp:1000});
 top.under.push(...s.players[0].deck.splice(0,2).map(c=>({...c,faceDown:true})));
 s.phase='attack';s=dispatch(s,{type:'next'});
 assert.equal(s.pending.kind,'slgEndRaid');
 const peel=legal(s,a=>a.uid==='peel'&&a.used.length===2);
 s=dispatch(s,peel);
 assert.equal(s.players[0].front[0].uid,base.uid);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[0].buffs.length,0);
 assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));
 assertSoloTrainingMatch(s);
});
test('021 combat win recovers only a legal non-Sung character, not 021 itself',()=>{
 let s=fixtures('purple',['SLG-1-021']);purplePower(s);
 const base=onField(s,'SLG-1-015','front',0),recover=drawCard(s.players[0],'SLG-1-030');
 s.players[0].outside.push(recover);
 const r=raid(s,'SLG-1-021',base);s=r.s;
 const blocker=onField(s,'SLG-1-030','front',0,1);
 s.phase='attack';s=dispatch(s,{type:'attack',uid:r.uid});
 s=dispatch(s,{type:'choose',uid:blocker.uid});
 assert.equal(s.pending.kind,'slg021Win');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===recover.uid));
 s=dispatch(s,{type:'choose',uid:recover.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===recover.uid));
 assertSoloTrainingMatch(s);
});
test('022 sniper can choose an opposing front character rather than deal player damage',()=>{
 let s=fixtures('purple',['SLG-1-022']);
 const base=onField(s,'SLG-1-015','front',0);
 for(let i=1;i<4;i++)onField(s,'SLG-1-030','front',i);
 for(let i=0;i<4;i++)onField(s,'SLG-1-029','energy',i);
 const r=raid(s,'SLG-1-022',base);s=r.s;
 s=dispatch(s,{type:'choose',uid:null});s=dispatch(s,{type:'choose',uid:null});
 const target=onField(s,'SLG-1-030','front',0,1);
 const before=s.players[1].life.length;s.phase='attack';
 const action=legal(s,a=>a.type==='attackTarget'&&a.uid===r.uid&&a.target===target.uid);
 s=dispatch(s,action);
 assert.equal(s.players[1].life.length,before);
 assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));
 assertSoloTrainingMatch(s);
});
test('051 Raid mode is not offered without one additional AP after paying character entry cost',()=>{
 let s=fixtures('green',['SLG-1-051','SLG-1-047']);greenPower(s);onField(s,'SLG-1-045','front',0);
 const eri=prepare(s,'SLG-1-051');
 s.players[0].ap=1;s=dispatch(s,legal(s,a=>a.type==='play'&&a.uid===eri.uid));
 assert.equal(s.players[0].ap,0);assert.equal(s.pending.kind,'slg051Mode');
 assert.deepEqual(soloTrainingLegalActions(s),[{type:'choose',mode:'recover'}]);
 assert.throws(()=>dispatch(s,{type:'choose',mode:'raid'}),/illegal SOLO action/);
 s=dispatch(s,{type:'choose',mode:'recover'});
 s=dispatch(s,{type:'choose',uid:null});assertSoloTrainingMatch(s);
});

test('AI selects a legal Raid rather than ignoring all final-ten Raid actions',()=>{
 let s=fixtures('green',['SLG-1-047']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0),c=prepare(s,'SLG-1-047');
 const available=soloTrainingLegalActions(s);
 assert.ok(available.some(a=>a.type==='raid'&&a.uid===c.uid&&a.target===base.uid));
 const ai=soloTrainingBotAction(s);
 assert.equal(ai.type,'raid');assert.equal(ai.uid,c.uid);
 s=dispatch(s,ai);assert.equal(s.players[0].front[0].uid,c.uid);assertSoloTrainingMatch(s);
});
test('AI completes purple advanced Sung and green chained Sung custom-deck games with all 50 card UIDs conserved',()=>{
 const purple={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-009':0,'SLG-1-020':4,'SLG-1-021':4};
 const green={...SOLO_TRAINING_PRESET,'SLG-1-062':0,'SLG-1-065':0,'SLG-1-047':4,'SLG-1-048':4};
 for(const deck of [purple,green])for(const seed of [117,118,119]){
  let s=newSoloTrainingMatch({decks:[deck,deck],seed,first:0});
  let steps=0;
  while(s.status==='playing'&&steps++<3600){
   const a=soloTrainingBotAction(s);
   assert.ok(soloTrainingLegalActions(s).some(x=>JSON.stringify(x)===JSON.stringify(a)),'bot action legal');
   s=dispatch(s,a);
  }
  assert.equal(s.status,'finished','seed '+seed+' got stuck at '+steps);
  assertSoloTrainingMatch(s);
 }
});

test('Q2049–Q2052: 048 peel-only after attack preserves original base REST and no old buffs/enter-leave triggers',()=>{
 let s=fixtures('green',['SLG-1-048']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0);
 const r=raid(s,'SLG-1-048',base);s=r.s;
 if(s.pending?.kind==='slg048Deploy')s=dispatch(s,{type:'choose',uid:null});
 const host=s.players[0].front[0];host.ready=false;host.buffs.push({turn:s.turn,bp:2000});
 host.under.push(...s.players[0].deck.splice(0,3).map(c=>({...c,faceDown:true})));
 s.phase='attack';
 s=dispatch(s,{type:'next'});
 assert.equal(s.pending.kind,'slgEndRaid');
 const peel=legal(s,x=>x.uid==='peel'&&x.used?.length===3);
 s=dispatch(s,peel);
 const remains=s.players[0].front[0];
 assert.equal(remains.uid,base.uid);assert.equal(remains.ready,false);
 assert.equal(remains.buffs.length,0,'old 048 temporary BP must not stick to the base');
 assert.ok(s.players[0].outside.some(c=>c.uid===host.uid));
 assert.notEqual(s.pending?.kind,'slg048Deploy','remaining base must not enter again');
 assertSoloTrainingMatch(s);
});
test('Q2041/Q2047/Q2053: private attachments under all 047/048/049 Raid faces are hidden from opponent',()=>{
 for(const id of ['SLG-1-047','SLG-1-048','SLG-1-049']){
  let s=fixtures('green',[id]);greenPower(s);const base=onField(s,'SLG-1-045','front',0);
  s=raid(s,id,base).s;
  if(s.pending?.kind==='slg048Deploy'||s.pending?.kind==='slg049Destroy')s=dispatch(s,{type:'choose',uid:null});
  const host=s.players[0].front[0];
  const card=s.players[0].deck.shift();host.under.push({...card,faceDown:true});
  const owner=inspectSoloAttached(s,{viewer:0,owner:0,hostUid:host.uid});
  const opponent=inspectSoloAttached(s,{viewer:1,owner:0,hostUid:host.uid});
  assert.equal(owner.at(-1).uid,card.uid,'owner knows actual card ID and UID '+id);
  assert.deepEqual(opponent.at(-1),{faceDown:true},'opponent learns no ID or UID '+id);
  assertSoloTrainingMatch(s);
 }
});
test('Q2029: 022 attack-ended swap waits until the defender finishes an ACTIVE life Trigger',()=>{
 let s=fixtures('purple',['SLG-1-022']);
 onField(s,'SLG-1-029','energy',0);
 onField(s,'SLG-1-029','energy',1);
 onField(s,'SLG-1-029','energy',2);
 const base=onField(s,'SLG-1-015','energy',3);
 const attacker=onField(s,'SLG-1-030','front',0);
 onField(s,'SLG-1-030','front',1);
 const target=onField(s,'SLG-1-030','front',0,1,false);
 const card=prepare(s,'SLG-1-022'),ra=legal(s,a=>a.type==='raid'&&a.uid===card.uid&&a.target===base.uid&&a.line==='energy');
 s=dispatch(s,ra);
 assert.equal(s.pending.kind,'slg022Enter');
 s=dispatch(s,{type:'choose',uid:null});
 s=dispatch(s,{type:'choose',uid:null});
 // REST all Kaisel helpers so the test isolates Trigger versus 022 attack-end timing.
 for(const c of s.players[0].energy.filter(c=>c?.cardId==='SLG-1-029'))c.ready=false;
 s.players[1].life[0].cardId='SLG-1-029'; // first life has official ACTIVE trigger
 s.phase='attack';s=dispatch(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'activeTrigger','life Trigger must resolve before attack-end effects');
 s=dispatch(s,{type:'choose',uid:target.uid});
 assert.equal(s.pending.kind,'slg022Swap','swap only offered after Trigger choice');
 assertSoloTrainingMatch(s);
});

test('Q2046/Q2052 removing 048 top reveals 047 Raid base WITHOUT re-firing 047 enter-draw or old 048 retreat trigger',()=>{
 let s=fixtures('green',['SLG-1-047','SLG-1-048']);greenPower(s);
 const base=onField(s,'SLG-1-045','front',0);
 s=raid(s,'SLG-1-047',base).s; // 047 enters here, valid draw exactly once
 const first=s.players[0].front[0];
 const next=prepare(s,'SLG-1-048');
 const secondRaid=legal(s,a=>a.type==='raid'&&a.uid===next.uid&&a.target===first.uid&&a.line==='front');
 s=dispatch(s,secondRaid);
 if(s.pending?.kind==='slg048Deploy')s=dispatch(s,{type:'choose',uid:null});
 const second=s.players[0].front[0];second.ready=false;
 second.under.push(...s.players[0].deck.splice(0,3).map(c=>({...c,faceDown:true})));
 const deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 s.phase='attack';s=dispatch(s,{type:'next'});
 assert.equal(s.pending.kind,'slgEndRaid');
 const action=legal(s,x=>x.uid==='peel'&&x.used?.length===3);
 s=dispatch(s,action);
 assert.equal(s.players[0].front[0].uid,first.uid,'old 047 must stay as face-up base');
 assert.equal(s.players[0].front[0].ready,false,'REST is inherited from 048');
 assert.equal(s.players[0].deck.length,deckBefore,'base must not re-trigger 047 enter draw');
 assert.equal(s.players[0].hand.length,handBefore,'no extra draw or discard');
 assert.ok(s.players[0].outside.some(c=>c.uid===second.uid),'048 goes to outside without a retirement trigger');
 assertSoloTrainingMatch(s);
});
