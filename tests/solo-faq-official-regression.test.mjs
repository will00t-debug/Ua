import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloMatchBp,assertSoloTrainingMatch} from '../dist/solo-match.mjs';

// Regression tests derived from official UA51BT FAQs:
// https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT
const deck=add=>({...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-009':0,...add});
const game=(x=SOLO_SHADOW_TRAINING_PRESET)=>{const s=newSoloTrainingMatch({decks:[x,x],seed:305,first:0});s.phase='attack';return s;};
function extract(p,id){for(const z of ['hand','deck','life']){const i=p[z].findIndex(c=>c.cardId===id);if(i>=0)return p[z].splice(i,1)[0];}throw Error('fixture card missing '+id);}
function put(s,id,owner,line,slot,ready=true){
 const c=extract(s.players[owner],id);Object.assign(c,{owner,line,slot,ready});s.players[owner][line][slot]=c;return c;
}
function doAction(s,action){return soloTrainingDispatch(s,action);}
test('Q2032 Kaisel effect-selected immunity excludes attacker from opponent SPECIAL Trigger targets',()=>{
 let s=game();
 const attacker=put(s,'SLG-1-030',0,'front',0),kaiser=put(s,'SLG-1-029',0,'energy',0);
 s.players[1].life[0].cardId='SLG-1-040'; // SPECIAL life trigger, no additional cards created
 s=doAction(s,{type:'attack',uid:attacker.uid});assert.equal(s.pending.kind,'kaiserPick');
 s=doAction(s,{type:'choose',uid:kaiser.uid});
 s=doAction(s,{type:'choose',mode:'untargetable'});
 assert.equal(s.players[0].front[0].untargetableTurn,s.turn);
 assert.notEqual(s.pending?.kind,'specialTrigger','untargetable character must never be a target');
 assertSoloTrainingMatch(s);
});
test('Q2055-Q2060 skip ACTIVE once, then another ACTIVE attempt succeeds',()=>{
 let s=game(),attacker=put(s,'SLG-1-030',0,'front',0),target=put(s,'SLG-1-030',1,'front',0,false);
 target.skipActive=1;
 for(let k=0;k<2;k++){
  s.players[1].life[0].cardId='SLG-1-029'; // ACTIVE trigger in first life
  s=doAction(s,{type:'attack',uid:attacker.uid});
  assert.equal(s.pending?.kind,'activeTrigger');
  s=doAction(s,{type:'choose',uid:target.uid});
  assert.equal(s.players[1].front[0].ready,k===1,'skip once, then ACTIVE');
  assert.equal(s.players[1].front[0].skipActive,0);
  if(k===0)s.players[0].front[0].ready=true;
 }
 assertSoloTrainingMatch(s);
});
test('Q2070-Q2071 printed-BP REST shadow character count excludes BP-less fields and ignores temporary BP buffs',()=>{
 let s=game();
 const iron=put(s,'SLG-1-027',0,'front',0);
 const soldier=put(s,'SLG-1-030',0,'front',1,false);
 const realm=put(s,'SLG-1-035',0,'energy',0,false);
 soldier.buffs.push({turn:s.turn,bp:4000});
 realm.ready=false;
 assert.equal(soloMatchBp(s,iron),3500,'REST soldier with original BP1500 still counts');
 soldier.ready=true;
 assert.equal(soloMatchBp(s,iron),3000,'BP-less field does not count although REST');
 assertSoloTrainingMatch(s);
});

test('Q2032/Q2062 explicit enemy-target event rejects immunity and requires AP after the event cost',()=>{
 const counts={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-040':4};
 let s=game(counts);s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;
 put(s,'SLG-1-035',0,'energy',0);
 put(s,'SLG-1-029',0,'energy',1);
 const target=put(s,'SLG-1-030',1,'front',0,false);
 const event=extract(s.players[0],'SLG-1-040');s.players[0].hand.push(event);
 target.untargetableTurn=s.turn;
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='playEvent'&&a.uid===event.uid),false);
 delete target.untargetableTurn;
 target.extraTargetAp=1;
 s.players[0].ap=1;
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='playEvent'&&a.uid===event.uid),false,'1AP must pay event, cannot pay extra target cost');
 s.players[0].ap=2;
 const play=soloTrainingLegalActions(s).find(a=>a.type==='playEvent'&&a.uid===event.uid);
 assert.ok(play);
 s=doAction(s,play);assert.equal(s.players[0].ap,1);
 assert.equal(s.pending.kind,'eventDestroy');
 s=doAction(s,{type:'choose',uid:target.uid});
 assert.equal(s.players[0].ap,0);
 assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));assertSoloTrainingMatch(s);
});
test('Q2056 second Shizuku-057 does not repeat first same-name entry ACTIVE ability in same turn',()=>{
 const counts={...SOLO_TRAINING_PRESET,'SLG-1-065':0,'SLG-1-057':4};
 let s=newSoloTrainingMatch({decks:[counts,counts],seed:421,first:0});
 s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;
 put(s,'SLG-1-055',0,'front',0);
 put(s,'SLG-1-056',0,'front',1);
 put(s,'SLG-1-066',0,'front',2);
 put(s,'SLG-1-067',0,'energy',0);
 put(s,'SLG-1-041',0,'energy',1);
 put(s,'SLG-1-041',0,'energy',2);
 const first=extract(s.players[0],'SLG-1-057'),second=extract(s.players[0],'SLG-1-057');
 s.players[0].hand.push(first,second);
 const a=soloTrainingLegalActions(s).find(x=>x.type==='play'&&x.uid===first.uid&&x.line==='front');
 assert.ok(a);s=doAction(s,a);
 assert.equal(s.players[0].front[a.slot].ready,true);
 assert.equal(s.groupUsed['0:shizuku057Entry'],s.turn);
 const b=soloTrainingLegalActions(s).find(x=>x.type==='play'&&x.uid===second.uid&&x.line==='energy');
 assert.ok(b);s=doAction(s,b);
 assert.equal(s.players[0].energy[b.slot].ready,false,'Q2056 later copy must not self-activate again');
 assert.equal(s.players[0].energy[b.slot].freezeSelfOnAttackTurn,undefined);
 assertSoloTrainingMatch(s);
});

test('Q2025: SLG-1-014 cannot use ordinary move-phase energy-to-front action',()=>{
 const purple={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-014':4};
 let s=game(purple);s.phase='move';
 const satoko=put(s,'SLG-1-014',0,'energy',0);
 assert.ok(s.players[0].front.some(x=>x===null));
 assert.equal(soloTrainingLegalActions(s).some(a=>a.type==='move'&&a.uid===satoko.uid),false);
 assert.throws(()=>doAction(s,{type:'move',uid:satoko.uid,slot:0}),/illegal SOLO action/);
 assert.equal(s.players[0].energy[0].uid,satoko.uid);assertSoloTrainingMatch(s);
});
test('Q2057/Q2059/Q2060: frozen 058/060/064 skip exactly the next ACTIVE, then activate on second official ACTIVE Trigger',()=>{
 for(const id of ['058','060','064']){
  const counts=id==='058'?SOLO_TRAINING_PRESET:
   id==='060'?{...SOLO_TRAINING_PRESET,'SLG-1-065':0,'SLG-1-060':4}:
   {...SOLO_TRAINING_PRESET,'SLG-1-065':0,'SLG-1-064':4,'SLG-1-066':0,'SLG-1-063':4};
  let s=game(counts);
  const first=put(s,'SLG-1-045',0,'front',0);
  const second=put(s,'SLG-1-041',0,'front',1);
  let frozen;
  if(id==='060')frozen=put(s,'SLG-1-060',1,'front',0,false);
  else{
   const p=s.players[1],base=extract(p,id==='058'?'SLG-1-055':'SLG-1-063');
   const top=extract(p,'SLG-1-'+id);
   Object.assign(top,{owner:1,line:'front',slot:0,ready:false,stack:[base]});
   p.front[0]=top;frozen=top;
  }
  frozen.skipActive=1;
  for(const attacker of [first,second]){
   s.players[1].life[0].cardId='SLG-1-043'; // actual green ACTIVE Trigger
   s=doAction(s,{type:'attack',uid:attacker.uid});
   assert.equal(s.pending?.kind,'activeTrigger',id+' needs Trigger selection');
   s=doAction(s,{type:'choose',uid:frozen.uid});
   const current=s.players[1].front[0];
   assert.equal(current.skipActive,0);
   assert.equal(current.ready,attacker.uid===second.uid,id+' skip once then ACTIVE');
  }
  assertSoloTrainingMatch(s);
 }
});

test('Q2025: purple 022 real attack-end position swap cannot use energy-line Satoko 014 as source',()=>{
 const counts={...SOLO_SHADOW_TRAINING_PRESET,'SLG-1-001':0,'SLG-1-014':4,'SLG-1-009':0,'SLG-1-022':4};
 let s=game(counts);s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;
 const satoko=put(s,'SLG-1-014',0,'energy',0);
 const k1=put(s,'SLG-1-029',0,'energy',1);
 const k2=put(s,'SLG-1-029',0,'energy',2);
 const base=put(s,'SLG-1-015',0,'energy',3);
 const fighters=Array.from({length:4},(_,i)=>put(s,'SLG-1-030',0,'front',i));
 const raidCard=extract(s.players[0],'SLG-1-022');s.players[0].hand.push(raidCard);
 const r=soloTrainingLegalActions(s).find(a=>a.type==='raid'&&a.uid===raidCard.uid&&a.target===base.uid&&a.line==='energy');
 assert.ok(r,'022 reduces required energy using six actual Shadow Army characters');
 s=doAction(s,r);assert.equal(s.pending.kind,'slg022Enter');
 s=doAction(s,{type:'choose',uid:null});
 s=doAction(s,{type:'choose',uid:null});
 // Kaisel is REST, preventing its separate optional attack trigger from obscuring Q2025.
 s.players[0].energy[1].ready=false;s.players[0].energy[2].ready=false;
 s.players[1].life[0].cardId='SLG-1-014'; // no life Trigger, isolate swap selection
 s.phase='attack';s=doAction(s,{type:'attack',uid:fighters[0].uid});
 assert.equal(s.pending.kind,'slg022Swap');
 assert.equal(s.pending.source,raidCard.uid);
 assert.equal(soloTrainingLegalActions(s).some(a=>a.uid===satoko.uid),false,'014 must not be selectable as energy->front swap');
 assert.throws(()=>doAction(s,{type:'choose',uid:satoko.uid}),/illegal SOLO action/);
 assert.equal(s.players[0].energy[0].uid,satoko.uid);
 assertSoloTrainingMatch(s);
});
