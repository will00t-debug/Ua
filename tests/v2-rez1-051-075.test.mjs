// UA40BT/REZ-1-051–075. Official pages and card images checked 2026-11-11.
// Each case plays that card. A shared sentence on another number is not evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRezeroV2Pack} from '../dist/universal-v2/rezero-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,universalImpact,
 effectiveHandRequiredEnergy,universalPrivateChoices,handCharacterBpMayAmount
} from '../dist/universal-v2/engine.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
const FILL=['REZ-1-007','REZ-1-043','REZ-1-055','REZ-1-068','REZ-1-072','REZ-1-048',
 'REZ-1-037','REZ-1-014','REZ-1-036','REZ-1-038','REZ-1-012','REZ-1-073','REZ-1-056',
 'REZ-1-094','REZ-1-045','REZ-1-076'];
function counts(extra){
 const c={...extra};
 let n=Object.values(c).reduce((a,b)=>a+b,0);
 for(const id of FILL){
  const add=Math.min(4-(c[id]||0),50-n);
  if(add>0){c[id]=(c[id]||0)+add;n+=add;}
  if(n===50)break;
 }
 assert.equal(n,50);
 assert.deepEqual(validateUniversalDeck(pack,c),[]);
 return c;
}
const fresh=(seed,extra)=>newUniversalMatch(packs,{decks:[counts(extra),counts(extra)],first:0,seed});
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function fuel(s,ids,p=0){
 ids.forEach((id,i)=>{
  const card=pull(s,p,id);
  card.ready=false;
  s.players[p].energy[i]=card;
 });
}
function seat(s,p,id,line,slot,ready=true){
 const card=pull(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function legal(s){return legalUniversalActions(packs,s);}
function act(s,action){return dispatchUniversalAction(packs,s,action);}
function reach(s,phase){
 for(let i=0;i<6&&s.phase!==phase;i++){
  const next=legal(s).find(a=>a.type==='next');
  assert.ok(next,'no next before '+phase+' '+(s.pending?.kind||s.phase));
  s=act(s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function walk(s,done){
 for(let guard=0;guard<80&&!done(s);guard++){
  if(s.pending?.kind==='end-hand-limit'){
   s=act(s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
  }else if(s.pending?.kind==='block'){
   s=act(s,{type:'chooseBlock',uid:null});
  }else{
   const next=legal(s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+(s.pending?.kind||s.phase));
   s=act(s,next);
  }
 }
 assert.ok(done(s),'walk missed '+(s.pending?.kind||s.phase));
 return s;
}
function play(s,id,line='front'){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
 assert.ok(action,id+' '+line);
 return [act(s,action),card];
}
function cast(s,id,p=0){
 const card=pull(s,p,id);
 s.players[p].hand.push(card);
 const action=legal(s).find(a=>a.type==='event'&&a.uid===card.uid);
 assert.ok(action,id);
 return [act(s,action),card];
}
function setTop(s,p,ids){
 const cards=ids.map(id=>pull(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function live(s,uid){
 for(const pl of s.players){
  for(const zone of ['front','energy','hand','deck','outside','life','removed']){
   const found=(pl[zone]||[]).find(c=>c?.uid===uid);
   if(found)return found;
  }
 }
 throw Error('Missing physical '+uid);
}
function readyAp(s,n=2,p=0){
 s.players[p].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function blue4(s){
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-055']);
 return reach(s,'main');
}
function blue5(s){
 fuel(s,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 s=reach(s,'main');
 s.players[0].energy[0].buffs=[{energy:1,untilTurn:s.turn}];
 assert.equal(universalEnergyByColor(packs,s,0).blue,5);
 return s;
}
function purple4(s){
 fuel(s,['REZ-1-068','REZ-1-068','REZ-1-072','REZ-1-072']);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).purple,4);
 return s;
}

test('051 and 071 stay inside the raid panel; 053 and 058 do not',()=>{
 assert.equal(raidBoxListed('REZ-1-051','onPlay'),true);
 assert.equal(raidBoxListed('REZ-1-071','onPlay'),true);
 assert.equal(raidBoxListed('REZ-1-071','onAttack'),true);
 for(const feature of ['onPlay','onAttack','main','handBpMayWhileFront']){
  assert.equal(raidBoxListed('REZ-1-053',feature),false,feature);
  assert.equal(raidBoxListed('REZ-1-058',feature),false,feature);
 }
 assert.equal(pack.cards['REZ-1-053'].printedImpact,1);
 assert.equal(pack.cards['REZ-1-053'].raidImpact,0);
 assert.deepEqual(pack.cards['REZ-1-063'].effects.onPlay,pack.cards['REZ-1-031'].effects.onPlay);
});

test('REZ-1-051 retires only after a raid, scaled by energy-0 blue Subaru',()=>{
 let plain=blue5(fresh(5101,{'REZ-1-051':1,'REZ-1-038':1}));
 const victim=seat(plain,1,'REZ-1-038','front',0,true);
 const deck=plain.players[0].deck.length;
 [plain]=play(plain,'REZ-1-051');
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck-1);
 assert.equal(plain.players[1].front[0].uid,victim.uid);
 assert.equal(plain.players[0].front.find(c=>c?.cardId==='REZ-1-051').ready,false);

 let raid=blue5(fresh(5102,{'REZ-1-051':1,'REZ-1-048':1,'REZ-1-037':1,'REZ-1-038':2}));
 const base=seat(raid,0,'REZ-1-048','front',0,false);
 seat(raid,0,'REZ-1-037','front',1,true);
 const exact=seat(raid,1,'REZ-1-038','front',0,true);
 exact.buffs=[{bp:500,untilTurn:raid.turn}];
 const over=seat(raid,1,'REZ-1-038','front',1,true);
 over.buffs=[{bp:1000,untilTurn:raid.turn}];
 assert.equal(universalBp(packs,raid,exact),2000);
 assert.equal(universalBp(packs,raid,over),2500);
 const top=pull(raid,0,'REZ-1-051');
 raid.players[0].hand.push(top);
 raid=act(raid,legal(raid).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 assert.equal(raid.players[0].front.find(c=>c?.uid===top.uid).ready,true);
 assert.equal(raid.pending.kind,'effect-retire-scaled');
 assert.equal(raid.pending.ceiling,2000);
 assert.equal(raid.pending.optional,true);
 assert.deepEqual(raid.pending.choices,[exact.uid]);
 let skipped=act(structuredClone(raid),{type:'chooseRetireScaled',uid:null});
 assert.equal(skipped.players[1].front[0].uid,exact.uid);
 raid=act(raid,{type:'chooseRetireScaled',uid:exact.uid});
 assert.equal(raid.players[1].outside.some(c=>c.uid===exact.uid),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('REZ-1-052 chooses an active zero Subaru or a bounce then a rested one',()=>{
 let active=blue4(fresh(5201,{'REZ-1-052':1,'REZ-1-037':1,'REZ-1-040':1}));
 readyAp(active,2);
 const zero=pull(active,0,'REZ-1-037');
 const costly=pull(active,0,'REZ-1-040');
 active.players[0].outside.push(zero,costly);
 [active]=play(active,'REZ-1-052');
 assert.equal(active.pending.kind,'effect-choice-mode');
 assert.deepEqual(active.pending.options.map(o=>o.id).sort(),['activeZero','bounceRaid']);
 active=act(active,{type:'chooseEffectMode',mode:'activeZero'});
 assert.equal(active.pending.kind,'effect-outside-printed-active');
 assert.deepEqual(active.pending.choices,[zero.uid]);
 active=act(active,legal(active).find(a=>a.type==='chooseOutsidePrintedActive'&&a.uid===zero.uid&&a.line==='front'));
 assert.equal(active.players[0].front.some(c=>c?.uid===zero.uid&&c.ready),true);
 assert.equal(active.players[0].outside.some(c=>c.uid===costly.uid),true);

 let bounce=blue4(fresh(5202,{'REZ-1-052':1,'REZ-1-037':1,'REZ-1-036':1}));
 readyAp(bounce,2);
 const other=seat(bounce,0,'REZ-1-036','front',1,true);
 const subaru=pull(bounce,0,'REZ-1-037');
 bounce.players[0].outside.push(subaru);
 [bounce]=play(bounce,'REZ-1-052');
 bounce=act(bounce,{type:'chooseEffectMode',mode:'bounceRaid'});
 assert.equal(bounce.pending.kind,'effect-bounce-include-self');
 assert.equal(bounce.pending.optional,true);
 assert.equal(bounce.pending.choices.includes(other.uid),true);
 bounce=act(bounce,{type:'chooseBounceIncludeSelf',uid:other.uid});
 assert.equal(bounce.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(bounce.pending.kind,'effect-outside-rest-or-raid');
 assert.equal(bounce.pending.choices.includes(subaru.uid),true);
 bounce=act(bounce,legal(bounce).find(a=>a.type==='chooseOutsideRestOrRaid'&&
  a.mode==='enter'&&a.uid===subaru.uid&&a.line==='front'));
 assert.equal(bounce.players[0].front.some(c=>c?.uid===subaru.uid&&c.ready===false),true);
 assert.equal(assertUniversalMatch(packs,active),true);
 assert.equal(assertUniversalMatch(packs,bounce),true);
});

test('REZ-1-053 has impact and on-play outside the raid panel',()=>{
 let plain=blue5(fresh(5301,{'REZ-1-053':1,'REZ-1-037':1,'REZ-1-040':1,'REZ-1-068':1}));
 const cheap=pull(plain,0,'REZ-1-037');
 const costly=pull(plain,0,'REZ-1-040');
 const purple=pull(plain,0,'REZ-1-068');
 plain.players[0].outside.push(cheap,costly,purple);
 let played;
 [plain,played]=play(plain,'REZ-1-053');
 assert.equal(played.ready,false);
 assert.equal((played.stack||[]).length,0);
 assert.equal(universalImpact(packs,plain,live(plain,played.uid)),1);
 assert.equal(plain.pending.kind,'effect-outside-printed-rest');
 assert.deepEqual(plain.pending.choices,[cheap.uid]);
 plain=act(plain,{type:'chooseOutsidePrintedRest',uid:null});
 assert.equal(plain.pending,null);

 let raid=blue5(fresh(5302,{'REZ-1-053':1,'REZ-1-048':1,'REZ-1-037':1}));
 const base=seat(raid,0,'REZ-1-048','front',0,false);
 const fieldSubaru=seat(raid,0,'REZ-1-037','front',1,true);
 const top=pull(raid,0,'REZ-1-053');
 raid.players[0].hand.push(top);
 raid=act(raid,legal(raid).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid));
 assert.equal(raid.players[0].front.find(c=>c?.uid===top.uid).ready,true);
 assert.equal(universalImpact(packs,raid,live(raid,top.uid)),1);
 assert.equal(raid.pending,null);
 raid.players[0].front.find(c=>c?.uid===top.uid).ready=true;
 raid=reach(raid,'attack');
 raid=act(raid,{type:'attack',uid:top.uid});
 assert.equal(raid.pending.kind,'effect-grant-printed-block');
 assert.deepEqual(raid.pending.choices,[fieldSubaru.uid]);
 raid=act(raid,{type:'chooseGrantPrintedBlock',uid:fieldSubaru.uid});
 assert.equal(live(raid,fieldSubaru.uid).blockAtLeastGranted.bp,4000);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('REZ-1-054 returns an energy-1 character, or itself when none exists',()=>{
 let s=fresh(5401,{'REZ-1-054':1,'REZ-1-049':1,'REZ-1-056':1});
 s=reach(s,'main');
 const low=seat(s,0,'REZ-1-049','front',1,true);
 const high=seat(s,0,'REZ-1-056','energy',0,true);
 let felt;
 [s,felt]=play(s,'REZ-1-054');
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(felt.uid),false);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=act(s,{type:'chooseOwnBounce',uid:low.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===low.uid),false);

 let alone=fresh(5402,{'REZ-1-054':1});
 fuel(alone,['REZ-1-043']);
 alone=reach(alone,'main');
 let self;
 [alone,self]=play(alone,'REZ-1-054');
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].hand.some(c=>c.uid===self.uid),true);
 assert.equal(alone.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('REZ-1-055 and REZ-1-056 draw only where printed',()=>{
 let quiet=fresh(5501,{'REZ-1-055':1});
 quiet=reach(quiet,'main');
 const deck=quiet.players[0].deck.length;
 [quiet]=play(quiet,'REZ-1-055');
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,deck-1);

 let drawn=fresh(5601,{'REZ-1-056':1});
 drawn=blue4(drawn);
 const before=drawn.players[0].deck.length;
 const hand=drawn.players[0].hand.length;
 [drawn]=play(drawn,'REZ-1-056');
 assert.equal(drawn.pending,null);
 assert.equal(drawn.players[0].deck.length,before-2);
 assert.equal(drawn.players[0].hand.length,hand+1);
 assert.equal(assertUniversalMatch(packs,quiet),true);
 assert.equal(assertUniversalMatch(packs,drawn),true);
});

test('REZ-1-057 looks privately and the color trigger bounces only BP 3500 or less',()=>{
 let s=blue4(fresh(5701,{'REZ-1-057':1,'REZ-1-055':1,'REZ-1-042':1,'REZ-1-034':1,'REZ-1-036':2}));
 const spare=pull(s,0,'REZ-1-036');
 s.players[0].hand.push(spare);
 const [miss,crusch,felix,wilhelm]=setTop(s,0,['REZ-1-036','REZ-1-055','REZ-1-042','REZ-1-034']);
 [s]=play(s,'REZ-1-057');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids.map(uid=>live(s,uid).cardId).sort(),
  ['REZ-1-034','REZ-1-036','REZ-1-042','REZ-1-055']);
 assert.equal(s.pending.choices.includes(miss.uid),false);
 assert.equal(s.pending.choices.includes(crusch.uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const windowCards=s.pending.uids.map(uid=>live(s,uid));
 assert.equal(s.publicReveals.some(r=>windowCards.some(c=>c.uid===r.uid)),false);
 let none=act(structuredClone(s),{type:'chooseTopFiltered',uid:null});
 for(const card of [...windowCards].reverse())none=act(none,{type:'chooseTopOrder',uid:card.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.some(c=>c.uid===spare.uid),true);
 s=act(s,{type:'chooseTopFiltered',uid:crusch.uid});
 assert.equal(s.publicReveals.at(-1).uid,crusch.uid);
 for(const card of windowCards.filter(c=>c.uid!==crusch.uid))
  s=act(s,{type:'chooseTopOrder',uid:card.uid});
 assert.equal(s.pending.kind,'effect-discard');
 s=act(s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);

 let life=fresh(5702,{'REZ-1-057':1,'REZ-1-041':1,'REZ-1-040':1});
 const small=seat(life,1,'REZ-1-041','front',0,true);
 const big=seat(life,1,'REZ-1-040','front',1,true);
 life.players[0].deck.push(life.players[0].life[0]);
 life.players[0].life[0]=pull(life,0,'REZ-1-057');
 life=walk(life,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 life=act(life,{type:'attack',uid:small.uid});
 life=act(life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'color');
 assert.equal(legal(life).some(a=>a.mode==='colorBounce'&&a.uid===small.uid),true);
 assert.equal(legal(life).some(a=>a.uid===big.uid),false);
 life=act(life,{type:'chooseTrigger',mode:'colorBounce',uid:small.uid});
 assert.equal(life.players[1].hand.some(c=>c.uid===small.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('REZ-1-058 takes, activates, and may raise hand BP without a raid',()=>{
 let s=blue4(fresh(5801,{'REZ-1-058':2,'REZ-1-036':2,'REZ-1-045':1,'REZ-1-076':1}));
 const [first,second]=setTop(s,0,['REZ-1-036','REZ-1-076']);
 let played;
 [s,played]=play(s,'REZ-1-058');
 assert.equal((live(s,played.uid).stack||[]).length,0);
 assert.equal(s.pending.kind,'effect-top-take-one');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=act(s,{type:'chooseTopTakeOne',uid:second.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===second.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===first.uid),true);
 const foe=seat(s,1,'REZ-1-036','front',0,true);
 s=act(s,legal(s).find(a=>a.mode==='frontOnce'&&a.uid===played.uid));
 assert.equal(s.pending.kind,'effect-buff-either');
 s=act(s,{type:'chooseEitherBuff',uid:foe.uid});
 assert.equal(universalBp(packs,s,live(s,foe.uid)),3000);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===played.uid),false);
 const displaced=s.players[0].energy[1];
 s.players[0].deck.push(displaced);
 s.players[0].energy[1]=null;
 const parked=seat(s,0,'REZ-1-058','energy',1,true);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===parked.uid),false);
 assert.equal(handCharacterBpMayAmount(packs,s,0),1000);
 const oldGauge=s.players[0].energy[2];
 s.players[0].deck.push(oldGauge);
 s.players[0].energy[2]=null;
 const gauge=seat(s,0,'REZ-1-045','energy',2,true);
 const shown=pull(s,0,'REZ-1-076');
 s.players[0].hand.push(shown);
 s=act(s,legal(s).find(a=>a.mode==='revealBottomBuff'&&a.uid===gauge.uid));
 s=act(s,{type:'chooseRevealBottom',uid:shown.uid});
 assert.equal(s.pending.kind,'effect-hand-bp-may');
 let declined=act(structuredClone(s),{type:'chooseHandBpMay',mode:'decline'});
 assert.equal(universalBp(packs,declined,live(declined,gauge.uid)),1500);
 s=act(s,{type:'chooseHandBpMay',mode:'accept'});
 assert.equal(universalBp(packs,s,live(s,gauge.uid)),4000);
 const oldEnergy=s.players[0].energy[0];
 s.players[0].deck.push(oldEnergy);
 s.players[0].energy[0]=s.players[0].front[0];
 s.players[0].front[0]=null;
 assert.equal(handCharacterBpMayAmount(packs,s,0),0);
 assert.equal(assertUniversalMatch(packs,s),true);

 let raid=blue4(fresh(5802,{'REZ-1-058':1,'REZ-1-055':1}));
 readyAp(raid,2);
 const base=seat(raid,0,'REZ-1-055','front',0,false);
 const card=pull(raid,0,'REZ-1-058');
 raid.players[0].hand.push(card);
 raid=act(raid,legal(raid).find(a=>a.type==='raid'&&a.uid===card.uid&&
  a.baseUid===base.uid&&a.line!=='energy'));
 assert.equal(live(raid,card.uid).ready,true);
 assert.equal((live(raid,card.uid).stack||[]).some(c=>c.uid===base.uid),true);
 assert.equal(raid.pending.kind,'effect-top-take-one');
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('REZ-1-059 reduces blue energy only while the opponent has yellow or purple',()=>{
 let open=fresh(5901,{'REZ-1-059':1});
 open=reach(open,'main');
 const card=pull(open,0,'REZ-1-059');
 open.players[0].hand.push(card);
 assert.equal(effectiveHandRequiredEnergy(packs,open,0,pack.cards['REZ-1-059'],card),3);
 const yellow=seat(open,1,'REZ-1-007','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(packs,open,0,pack.cards['REZ-1-059'],card),2);
 open.players[1].deck.push(yellow);
 open.players[1].front[0]=null;
 const purple=seat(open,1,'REZ-1-068','energy',0,true);
 assert.equal(effectiveHandRequiredEnergy(packs,open,0,pack.cards['REZ-1-059'],card),2);
 open.players[1].deck.push(purple);
 open.players[1].energy[0]=null;
 seat(open,1,'REZ-1-043','front',0,true);
 assert.equal(effectiveHandRequiredEnergy(packs,open,0,pack.cards['REZ-1-059'],card),3);
 assert.equal(assertUniversalMatch(packs,open),true);
});

test('REZ-1-060 reveals in public, retires at that BP, and the name is once a turn',()=>{
 let s=fresh(6001,{'REZ-1-060':2,'REZ-1-027':1,'REZ-1-036':1});
 s=reach(s,'main');
 const tree=seat(s,0,'REZ-1-060','energy',0,true);
 const exact=seat(s,1,'REZ-1-027','front',0,true);
 const small=seat(s,1,'REZ-1-036','front',1,true);
 small.buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,exact),4000);
 assert.equal(universalBp(packs,s,small),5000);
 const shown=pull(s,0,'REZ-1-027');
 s.players[0].hand.push(shown);
 s=act(s,legal(s).find(a=>a.mode==='restLeaveReveal'&&a.uid===tree.uid));
 assert.equal(live(s,tree.uid).ready,false);
 s=act(s,{type:'chooseRevealRetire',uid:shown.uid});
 assert.equal(s.publicReveals.at(-1).cardId,'REZ-1-027');
 assert.equal(s.players[0].deck.at(-1).uid,shown.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===tree.uid),true);
 assert.equal(s.pending.kind,'effect-retire-referenced');
 assert.equal(s.pending.ceiling,4000);
 assert.deepEqual(s.pending.choices,[exact.uid]);
 s=act(s,{type:'chooseRetireReferenced',uid:exact.uid});
 const second=seat(s,0,'REZ-1-060','energy',0,true);
 const spare=pull(s,0,'REZ-1-036');
 s.players[0].hand.push(spare);
 assert.equal(legal(s).some(a=>a.mode==='restLeaveReveal'&&a.uid===second.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-061 and REZ-1-064 each ready up to two AP cards',()=>{
 function recover(seed,id,stopEarly){
  let s=fresh(seed,{[id]:1});
  fuel(s,['REZ-1-043','REZ-1-043','REZ-1-055']);
  s=reach(s,'main');
  readyAp(s,3);
  s.players[0].apCards.filter(c=>c.inPlay).slice(0,2).forEach(c=>{c.ready=false;});
  [s]=cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  const rested=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
  assert.equal(rested.length,3);
  s=act(s,{type:'chooseApRecovery',uid:rested[0].uid});
  if(stopEarly)s=act(s,{type:'chooseApRecovery',uid:null});
  else s=act(s,{type:'chooseApRecovery',uid:s.players[0].apCards.find(c=>c.inPlay&&!c.ready).uid});
  assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,stopEarly?1:2);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 recover(6101,'REZ-1-061',false);
 recover(6401,'REZ-1-064',true);
});

test('REZ-1-062 cannot be used without Rem, then buffs her and draws',()=>{
 let none=blue4(fresh(6201,{'REZ-1-062':1,'REZ-1-036':1}));
 seat(none,0,'REZ-1-036','front',0,true);
 const event=pull(none,0,'REZ-1-062');
 none.players[0].hand.push(event);
 assert.equal(legal(none).some(a=>a.type==='event'&&a.uid===event.uid),false);
 let s=blue4(fresh(6202,{'REZ-1-062':1,'REZ-1-048':1,'REZ-1-036':1}));
 const rem=seat(s,0,'REZ-1-048','front',0,true);
 seat(s,0,'REZ-1-036','front',1,true);
 [s]=cast(s,'REZ-1-062');
 assert.equal(s.pending.kind,'effect-named-impact');
 assert.deepEqual(s.pending.choices,[rem.uid]);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const hand=s.players[0].hand.length;
 s=act(s,{type:'chooseNamedImpact',uid:rem.uid});
 assert.equal(universalBp(packs,s,live(s,rem.uid)),2500);
 assert.equal(universalImpact(packs,s,live(s,rem.uid)),1);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-063 uses the same mandatory front retirement as REZ-1-031',()=>{
 assert.deepEqual(pack.cards['REZ-1-063'].effects.onPlay,[{
  op:'retireOppFrontUnderBp',bp:3000,bonusName:'レム',bonusBp:5000,mandatory:true}]);
 let none=blue4(fresh(6301,{'REZ-1-063':1,'REZ-1-058':1}));
 seat(none,1,'REZ-1-058','front',0,true);
 const event=pull(none,0,'REZ-1-063');
 none.players[0].hand.push(event);
 const ap=none.players[0].apCards.filter(c=>c.ready).length;
 assert.equal(legal(none).some(a=>a.type==='event'&&a.uid===event.uid),false);
 assert.throws(()=>act(none,{type:'event',uid:event.uid}));
 assert.equal(none.players[0].apCards.filter(c=>c.ready).length,ap);

 let low=blue4(fresh(6302,{'REZ-1-063':1,'REZ-1-036':1,'REZ-1-058':1}));
 const small=seat(low,1,'REZ-1-036','front',0,true);
 const tall=seat(low,1,'REZ-1-058','front',1,true);
 [low]=cast(low,'REZ-1-063');
 assert.equal(low.pending.limit,3000);
 assert.deepEqual(low.pending.choices,[small.uid]);
 low=act(low,{type:'chooseRetireBp',uid:small.uid});
 assert.equal(low.players[1].front[1].uid,tall.uid);

 let rem=blue4(fresh(6303,{'REZ-1-063':1,'REZ-1-048':1,'REZ-1-058':1}));
 seat(rem,0,'REZ-1-048','front',0,true);
 const wide=seat(rem,1,'REZ-1-058','front',0,true);
 [rem]=cast(rem,'REZ-1-063');
 assert.equal(rem.pending.limit,5000);
 rem=act(rem,{type:'chooseRetireBp',uid:wide.uid});
 assert.equal(rem.players[1].outside.some(c=>c.uid===wide.uid),true);
 assert.equal(assertUniversalMatch(packs,rem),true);
});

test('REZ-1-065 stays an event and counts as a BP 4000 character only while revealed',()=>{
 let paid=blue4(fresh(6501,{'REZ-1-065':1,'REZ-1-014':1}));
 const tall=seat(paid,1,'REZ-1-014','front',0,true);
 tall.buffs=[{bp:2000,untilTurn:paid.turn}];
 assert.equal(universalBp(packs,paid,tall),4500);
 const spell=pull(paid,0,'REZ-1-065');
 paid.players[0].hand.push(spell);
 assert.equal(legal(paid).some(a=>(a.type==='play'||a.type==='raid')&&a.uid===spell.uid),false);
 assert.equal(legal(paid).some(a=>a.type==='event'&&a.uid===spell.uid),true);
 [paid]=cast(paid,'REZ-1-065');
 assert.equal(paid.pending.kind,'effect-retire-at-least');
 assert.equal(paid.pending.floor,4500);
 paid=act(paid,{type:'chooseRetireAtLeast',uid:tall.uid});
 assert.equal(paid.players[0].outside.some(c=>c.uid===spell.uid),true);
 assert.equal(paid.players[0].front.some(c=>c?.uid===spell.uid),false);

 let shown=fresh(6502,{'REZ-1-065':1,'REZ-1-060':1,'REZ-1-027':1,'REZ-1-014':1});
 shown=reach(shown,'main');
 const tree=seat(shown,0,'REZ-1-060','energy',0,true);
 const exact=seat(shown,1,'REZ-1-027','front',0,true);
 const over=seat(shown,1,'REZ-1-014','front',1,true);
 over.buffs=[{bp:2000,untilTurn:shown.turn}];
 const revealed=pull(shown,0,'REZ-1-065');
 shown.players[0].hand.push(revealed);
 shown=act(shown,legal(shown).find(a=>a.mode==='restLeaveReveal'&&a.uid===tree.uid));
 shown=act(shown,{type:'chooseRevealRetire',uid:revealed.uid});
 assert.equal(shown.pending.ceiling,4000);
 assert.deepEqual(shown.pending.choices,[exact.uid]);
 assert.equal(shown.players[0].front.some(c=>c?.uid===revealed.uid),false);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,shown),true);
});

test('REZ-1-066 requires Crusch, retires BP 5000, then may raise hand BP',()=>{
 let blocked=fresh(6601,{'REZ-1-066':1,'REZ-1-036':1});
 fuel(blocked,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 blocked=reach(blocked,'main');
 seat(blocked,1,'REZ-1-036','front',0,true);
 const event=pull(blocked,0,'REZ-1-066');
 blocked.players[0].hand.push(event);
 assert.equal(legal(blocked).some(a=>a.type==='event'&&a.uid===event.uid),false);

 let s=blue4(fresh(6602,{'REZ-1-066':1,'REZ-1-055':1,'REZ-1-036':1,'REZ-1-058':1,'REZ-1-045':1,'REZ-1-076':1}));
 seat(s,0,'REZ-1-055','front',0,true);
 const small=seat(s,1,'REZ-1-036','front',0,true);
 const tall=seat(s,1,'REZ-1-058','front',1,true);
 tall.buffs=[{bp:1500,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,tall),5500);
 [s]=cast(s,'REZ-1-066');
 assert.equal(s.pending.kind,'effect-retire-at-most');
 assert.equal(s.pending.ceiling,5000);
 assert.deepEqual(s.pending.choices,[small.uid]);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=act(s,{type:'chooseRetireAtMost',uid:small.uid});
 assert.equal(handCharacterBpMayAmount(packs,s,0),1000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-067 enters active, cuts front BP, and readies only from the front',()=>{
 let s=purple4(fresh(6701,{'REZ-1-067':2,'REZ-1-058':1}));
 readyAp(s,2);
 const foe=seat(s,1,'REZ-1-058','front',0,true);
 let garf;
 [s,garf]=play(s,'REZ-1-067');
 assert.equal(live(s,garf.uid).ready,true);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(s.pending.optional,true);
 let skipped=act(structuredClone(s),{type:'chooseTarget',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,foe.uid)),4000);
 s=act(s,{type:'chooseTarget',uid:foe.uid});
 assert.equal(universalBp(packs,s,live(s,foe.uid)),1500);
 live(s,garf.uid).ready=false;
 s=act(s,legal(s).find(a=>a.mode==='frontOnce'&&a.uid===garf.uid));
 assert.equal(live(s,garf.uid).ready,true);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===garf.uid),false);
 const occupant=s.players[0].energy[2];
 s.players[0].deck.push(occupant);
 s.players[0].energy[2]=null;
 const line=seat(s,0,'REZ-1-067','energy',2,false);
 assert.equal(legal(s).some(a=>a.mode==='frontOnce'&&a.uid===line.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-067 nullifies impact when it blocks',()=>{
 let s=purple4(fresh(6702,{'REZ-1-067':1,'REZ-1-053':1,'REZ-1-068':1,'REZ-1-056':1}));
 readyAp(s,2);
 const plain=seat(s,0,'REZ-1-068','front',1,true);
 const down=seat(s,1,'REZ-1-036','front',1,true);
 let garf;
 [s,garf]=play(s,'REZ-1-067');
 assert.equal(s.pending.choices.includes(down.uid),true);
 s=act(s,{type:'chooseTarget',uid:null});
 assert.equal(universalBp(packs,s,live(s,down.uid)),2000);
 const foe=seat(s,1,'REZ-1-053','front',0,true);
 assert.equal(universalImpact(packs,s,foe),1);
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life=[pull(s,1,'REZ-1-056')];
 s=walk(s,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 s=act(s,{type:'attack',uid:foe.uid});
 assert.equal(s.pending.kind,'block');
 const life=s.players[0].life.length;
 let nulled=act(structuredClone(s),{type:'chooseBlock',uid:garf.uid});
 assert.equal(nulled.players[0].life.length,life);
 assert.equal(nulled.players[0].outside.some(c=>c.uid===garf.uid),true);
 let hit=act(s,{type:'chooseBlock',uid:plain.uid});
 assert.equal(hit.players[0].life.length,life-1);
 assert.equal(assertUniversalMatch(packs,nulled),true);
 assert.equal(assertUniversalMatch(packs,hit),true);
});

test('REZ-1-068 and REZ-1-072 have no on-play effect',()=>{
 for(const [seed,id] of [[6801,'REZ-1-068'],[7201,'REZ-1-072']]){
  let s=reach(fresh(seed,{[id]:1}),'main');
  const card=pull(s,0,id);
  s.players[0].hand.push(card);
  const deck=s.players[0].deck.length;
  s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='front'));
  assert.equal(s.pending,null,id);
  assert.equal(live(s,card.uid).ready,false,id);
  assert.equal(s.players[0].deck.length,deck,id);
  assert.equal(s.zoneMoveEvents.some(e=>e.reason==='own-effect'&&e.to==='hand'),false,id);
  assert.equal(assertUniversalMatch(packs,s),true,id);
 }
});

test('REZ-1-069 looks privately for Subaru, Beatrice, or the library',()=>{
 let s=fresh(6901,{'REZ-1-069':1,'REZ-1-068':2,'REZ-1-072':1,'REZ-1-094':1,'REZ-1-007':1});
 fuel(s,['REZ-1-068']);
 s=reach(s,'main');
 const spare=pull(s,0,'REZ-1-072');
 s.players[0].hand.push(spare);
 const [miss,subaru,library]=setTop(s,0,['REZ-1-007','REZ-1-068','REZ-1-094']);
 [s]=play(s,'REZ-1-069');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,[miss.uid,subaru.uid,library.uid]);
 assert.equal(s.pending.choices.includes(miss.uid),false);
 assert.equal(s.pending.choices.includes(subaru.uid),true);
 assert.equal(s.pending.choices.includes(library.uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.publicReveals.some(r=>[miss,subaru,library].some(c=>c.uid===r.uid)),false);
 let none=act(structuredClone(s),{type:'chooseTopFiltered',uid:null});
 for(const card of [library,subaru,miss])none=act(none,{type:'chooseTopOrder',uid:card.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].hand.some(c=>c.uid===spare.uid),true);
 s=act(s,{type:'chooseTopFiltered',uid:library.uid});
 assert.equal(s.publicReveals.at(-1).uid,library.uid);
 s=act(s,{type:'chooseTopOrder',uid:subaru.uid});
 s=act(s,{type:'chooseTopOrder',uid:miss.uid});
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=act(s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===library.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,none),true);
});

test('REZ-1-070 must draw and place, or may pay to reveal Beatrice',()=>{
 let placed=purple4(fresh(7001,{'REZ-1-070':1,'REZ-1-007':1}));
 const low=pull(placed,0,'REZ-1-007');
 placed.players[0].hand.push(low);
 [placed]=play(placed,'REZ-1-070');
 assert.equal(placed.pending.kind,'effect-choice-mode');
 assert.equal(placed.pending.optional,false);
 assert.equal(legal(placed).some(a=>a.mode==='skip'),false);
 const before=placed.players[0].hand.length;
 placed=act(placed,{type:'chooseEffectMode',mode:'drawPlace'});
 assert.equal(placed.pending.kind,'effect-place-hand');
 assert.equal(placed.players[0].hand.length,before+1);
 assert.equal(legal(placed).some(a=>a.uid===null),false);
 const previous=placed.players[0].deck[0].uid;
 placed=act(placed,{type:'choosePlaceHand',mode:'deck',uid:low.uid});
 assert.equal(placed.players[0].deck[0].uid,low.uid);
 assert.equal(placed.players[0].deck[1].uid,previous);
 assert.equal(placed.pending,null);

 let poor=purple4(fresh(7002,{'REZ-1-070':1,'REZ-1-072':1}));
 const hidden=setTop(poor,0,['REZ-1-072'])[0];
 [poor]=play(poor,'REZ-1-070');
 poor.players[0].apCards.forEach(c=>{c.ready=false;});
 poor=act(poor,{type:'chooseEffectMode',mode:'revealBeatrice'});
 assert.equal(poor.pending,null);
 assert.equal(poor.players[0].deck[0].uid,hidden.uid);
 assert.equal(poor.publicReveals.some(r=>r.kind==='deck-top'),false);

 let rich=purple4(fresh(7003,{'REZ-1-070':1,'REZ-1-072':1,'REZ-1-007':1}));
 readyAp(rich,2);
 setTop(rich,0,['REZ-1-072']);
 [rich]=play(rich,'REZ-1-070');
 rich=act(rich,{type:'chooseEffectMode',mode:'revealBeatrice'});
 assert.equal(rich.pending.kind,'effect-optional-pay-ap');
 let skipped=act(structuredClone(rich),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck[0].cardId,'REZ-1-072');
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,1);
 rich=act(rich,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(rich.pending.kind,'effect-deck-named-play');
 assert.equal(rich.players[0].deck[0].cardId,'REZ-1-072');
 assert.equal(rich.publicReveals.at(-1).kind,'deck-top');

 let missed=purple4(fresh(7004,{'REZ-1-070':1,'REZ-1-007':1}));
 readyAp(missed,2);
 setTop(missed,0,['REZ-1-007']);
 [missed]=play(missed,'REZ-1-070');
 missed=act(missed,{type:'chooseEffectMode',mode:'revealBeatrice'});
 missed=act(missed,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(missed.pending,null);
 assert.equal(missed.publicReveals.at(-1).cardId,'REZ-1-007');
 assert.equal(missed.players[0].hand.some(c=>c.cardId==='REZ-1-007'),true);
 assert.equal(assertUniversalMatch(packs,placed),true);
 assert.equal(assertUniversalMatch(packs,poor),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,rich),true);
 assert.equal(assertUniversalMatch(packs,missed),true);
});

test('REZ-1-071 peeks and draws only in a raid, then pays AP once on attack',()=>{
 let plain=purple4(fresh(7101,{'REZ-1-071':1,'REZ-1-007':1,'REZ-1-072':1}));
 setTop(plain,0,['REZ-1-007','REZ-1-072']);
 const body=pull(plain,0,'REZ-1-071');
 plain.players[0].hand.push(body);
 const deck=plain.players[0].deck.length;
 plain=act(plain,legal(plain).find(a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'));
 assert.equal((live(plain,body.uid).stack||[]).length,0);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,deck);
 assert.equal(live(plain,body.uid).ready,false);

 let raid=purple4(fresh(7102,{'REZ-1-071':1,'REZ-1-068':1,'REZ-1-007':1,'REZ-1-072':1,'REZ-1-056':2}));
 readyAp(raid,2);
 const base=seat(raid,0,'REZ-1-068','front',0,true);
 const subaru=pull(raid,0,'REZ-1-071');
 raid.players[0].hand.push(subaru);
 const raidAction=legal(raid).find(a=>a.type==='raid'&&a.uid===subaru.uid&&a.baseUid===base.uid&&a.line!=='energy');
 assert.ok(raidAction);
 raid=act(raid,raidAction);
 assert.equal(live(raid,subaru.uid).ready,true);
 assert.equal((live(raid,subaru.uid).stack||[]).some(c=>c.uid===base.uid),true);
 assert.equal(raid.pending.kind,'effect-top-inspect');
 assert.equal(raid.effectQueue.some(e=>e.op==='draw'&&e.count===1),true);
 const seen=[...raid.pending.uids];
 const hand=raid.players[0].hand.length;
 raid=act(raid,{type:'chooseInspectedOutside',uid:null});
 for(const uid of seen)raid=act(raid,{type:'chooseTopOrder',uid});
 assert.equal(raid.pending,null);
 assert.equal(raid.players[0].hand.length,hand+1);
 raid.players[1].deck.push(...raid.players[1].life.splice(0));
 raid.players[1].life=[pull(raid,1,'REZ-1-056'),pull(raid,1,'REZ-1-056')];
 raid=walk(raid,x=>x.active===0&&x.phase==='attack'&&!x.pending);
 raid=act(raid,legal(raid).find(a=>a.type==='attack'&&a.uid===subaru.uid));
 assert.equal(raid.pending.kind,'effect-optional-pay-ap');
 assert.equal(raid.onceEffectUses[0].includes('attack-ap:'+subaru.uid),true);
 setTop(raid,0,['REZ-1-072']);
 raid=act(raid,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(raid.pending.kind,'effect-deck-named-play');
 assert.equal(raid.players[0].deck[0].cardId,'REZ-1-072');
 raid=act(raid,{type:'chooseDeckNamedPlay',mode:'hand',uid:raid.pending.uid});
 assert.equal(raid.players[0].hand.some(c=>c.cardId==='REZ-1-072'),true);
 assert.equal(raid.pending.kind,'block');
 raid=act(raid,{type:'chooseBlock',uid:null});
 live(raid,subaru.uid).ready=true;
 raid=act(raid,legal(raid).find(a=>a.type==='attack'&&a.uid===subaru.uid));
 assert.equal(raid.pending.kind,'block');
 assert.equal(raid.onceEffectUses[0].filter(k=>k.startsWith('attack-ap:')).length,1);

 let broke=purple4(fresh(7103,{'REZ-1-071':1,'REZ-1-068':1,'REZ-1-056':1}));
 readyAp(broke,1);
 const quietBase=seat(broke,0,'REZ-1-068','front',0,true);
 const quiet=pull(broke,0,'REZ-1-071');
 broke.players[0].hand.push(quiet);
 broke=act(broke,legal(broke).find(a=>a.type==='raid'&&a.uid===quiet.uid&&a.baseUid===quietBase.uid&&a.line!=='energy'));
 const window=[...broke.pending.uids];
 broke=act(broke,{type:'chooseInspectedOutside',uid:null});
 for(const uid of window)broke=act(broke,{type:'chooseTopOrder',uid});
 broke.players[1].deck.push(...broke.players[1].life.splice(0));
 broke.players[1].life=[pull(broke,1,'REZ-1-056')];
 broke.players[0].apCards.forEach(c=>{c.ready=false;});
 broke=walk(broke,x=>x.active===0&&x.phase==='attack'&&!x.pending);
 broke=act(broke,legal(broke).find(a=>a.type==='attack'&&a.uid===quiet.uid));
 assert.equal(broke.pending.kind,'block');
 assert.equal(broke.onceEffectUses[0].includes('attack-ap:'+quiet.uid),true);
 assert.equal(broke.publicReveals.some(r=>r.kind==='deck-top'),false);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
 assert.equal(assertUniversalMatch(packs,broke),true);
});

test('REZ-1-073 draws and must discard',()=>{
 let s=reach(fresh(7301,{'REZ-1-073':1,'REZ-1-007':1}),'main');
 const spare=pull(s,0,'REZ-1-007');
 s.players[0].hand.push(spare);
 const body=pull(s,0,'REZ-1-073');
 s.players[0].hand.push(body);
 const deck=s.players[0].deck.length;
 s=act(s,legal(s).find(a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'));
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=act(s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('REZ-1-074 sends Subaru to hand for an opponent effect, and battle still retires it',()=>{
 let retired=fresh(7401,{'REZ-1-074':1,'REZ-1-068':1,'REZ-1-072':1,'REZ-1-063':1});
 fuel(retired,['REZ-1-072']);
 fuel(retired,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-055'],1);
 retired=reach(retired,'main');
 const subaru=seat(retired,0,'REZ-1-068','front',0,true);
 [retired]=play(retired,'REZ-1-074');
 assert.equal(retired.pending.kind,'effect-grant-bounce-instead');
 assert.deepEqual(retired.pending.choices,[subaru.uid]);
 let skipped=act(structuredClone(retired),{type:'chooseGrantBounceInstead',uid:null});
 assert.equal(live(skipped,subaru.uid).bounceInsteadGranted,undefined);
 retired=act(retired,{type:'chooseGrantBounceInstead',uid:subaru.uid});
 assert.equal(live(retired,subaru.uid).bounceInsteadGranted.sourceUid!==undefined,true);
 readyAp(retired,1,1);
 retired=walk(retired,x=>x.active===1&&x.phase==='main'&&!x.pending);
 [retired]=cast(retired,'REZ-1-063',1);
 assert.equal(retired.pending.kind,'effect-retire-bp');
 assert.equal(retired.pending.choices.includes(subaru.uid),true);
 retired=act(retired,{type:'chooseRetireBp',uid:subaru.uid});
 assert.equal(retired.players[0].hand.some(c=>c.uid===subaru.uid),true);
 assert.equal(retired.players[0].outside.some(c=>c.uid===subaru.uid),false);
 assert.equal(retired.turnRetireEvents.some(e=>e.uid===subaru.uid),false);

 let fight=fresh(7402,{'REZ-1-074':1,'REZ-1-068':1,'REZ-1-072':1,'REZ-1-058':1});
 fuel(fight,['REZ-1-072']);
 fight=reach(fight,'main');
 const guard=seat(fight,0,'REZ-1-068','front',0,true);
 [fight]=play(fight,'REZ-1-074');
 fight=act(fight,{type:'chooseGrantBounceInstead',uid:guard.uid});
 const foe=seat(fight,1,'REZ-1-058','front',0,true);
 fight=walk(fight,x=>x.active===1&&x.phase==='attack'&&!x.pending);
 fight=act(fight,{type:'attack',uid:foe.uid});
 fight=act(fight,{type:'chooseBlock',uid:guard.uid});
 assert.equal(fight.players[0].outside.some(c=>c.uid===guard.uid),true);
 assert.equal(fight.players[0].hand.some(c=>c.uid===guard.uid),false);
 assert.equal(fight.turnRetireEvents.some(e=>e.uid===guard.uid),true);
 assert.equal(assertUniversalMatch(packs,retired),true);
 assert.equal(assertUniversalMatch(packs,fight),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('REZ-1-075 draws only when an own effect puts it onto the field',()=>{
 let paid=purple4(fresh(7501,{'REZ-1-075':1}));
 const body=pull(paid,0,'REZ-1-075');
 paid.players[0].hand.push(body);
 const deck=paid.players[0].deck.length;
 paid=act(paid,legal(paid).find(a=>a.type==='play'&&a.uid===body.uid&&a.line==='front'));
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck.length,deck);
 assert.equal(live(paid,body.uid).ready,false);

 let born=purple4(fresh(7502,{'REZ-1-070':1,'REZ-1-075':1}));
 readyAp(born,2);
 setTop(born,0,['REZ-1-075']);
 [born]=play(born,'REZ-1-070');
 born=act(born,{type:'chooseEffectMode',mode:'revealBeatrice'});
 born=act(born,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(born.pending.kind,'effect-deck-named-play');
 assert.equal(born.players[0].deck[0].cardId,'REZ-1-075');
 const hand=born.players[0].hand.length;
 const enter=legal(born).find(a=>a.type==='chooseDeckNamedPlay'&&a.mode==='enter'&&a.line==='front');
 born=act(born,enter);
 const beatrice=born.players[0].front.find(c=>c?.cardId==='REZ-1-075');
 assert.equal(beatrice.ready,false);
 assert.equal(born.players[0].hand.length,hand+1);
 assert.equal(born.zoneMoveEvents.some(e=>e.uid===beatrice.uid&&e.from==='deck'&&e.reason==='own-effect'),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,born),true);
});

test('every life symbol in 051-075 resolves on that card',()=>{
 const rows=[
  ['REZ-1-051','get'],['REZ-1-052','get'],['REZ-1-053','raid'],['REZ-1-054',null],
  ['REZ-1-055','draw'],['REZ-1-056',null],['REZ-1-057','color'],['REZ-1-058','raid'],
  ['REZ-1-059',null],['REZ-1-060','get'],['REZ-1-061','final'],['REZ-1-062','active'],
  ['REZ-1-063','special'],['REZ-1-064','final'],['REZ-1-065','draw'],['REZ-1-066','special'],
  ['REZ-1-067','active'],['REZ-1-068','active'],['REZ-1-069',null],['REZ-1-070',null],
  ['REZ-1-071','raid'],['REZ-1-072','get'],['REZ-1-073','draw'],['REZ-1-074','active'],
  ['REZ-1-075','draw']
 ];
 rows.forEach(([id,symbol],index)=>{
  const hit=(()=>{
   let s=fresh(9100+index,{[id]:1,'REZ-1-036':1});
   const attacker=seat(s,0,'REZ-1-036','front',0,true);
   s.players[1].deck.push(...s.players[1].life.splice(0));
   s.players[1].life=[pull(s,1,id)];
   s=walk(s,x=>x.phase==='attack'&&!x.pending);
   s=act(s,{type:'attack',uid:attacker.uid});
   if(s.pending?.kind==='block')s=act(s,{type:'chooseBlock',uid:null});
   return {s,attacker};
  })();
  if(!symbol){
   assert.equal(hit.s.pending,null,id);
   assert.equal(hit.s.players[1].outside.some(c=>c.cardId===id),true,id);
  }else{
   assert.equal(hit.s.pending.trigger,symbol,id);
   if(symbol==='draw'){
    const hand=hit.s.players[1].hand.length;
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'draw'});
    assert.equal(hit.s.players[1].hand.length,hand+1,id);
    assert.equal(hit.s.players[1].outside.some(c=>c.cardId===id),true,id);
   }else if(symbol==='get'){
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'get'});
    assert.equal(hit.s.players[1].hand.some(c=>c.cardId===id),true,id);
   }else if(symbol==='active'){
    const rested=seat(hit.s,1,'REZ-1-007','front',0,false);
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'active',uid:rested.uid});
    assert.equal(live(hit.s,rested.uid).ready,true,id);
    assert.equal(universalBp(packs,hit.s,live(hit.s,rested.uid)),5000,id);
   }else if(symbol==='special'){
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'special',uid:hit.attacker.uid});
    assert.equal(hit.s.players[0].outside.some(c=>c.uid===hit.attacker.uid),true,id);
   }else if(symbol==='final'){
    const top=hit.s.players[1].deck[0];
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'final'});
    assert.equal(hit.s.players[1].life[0].uid,top.uid,id);
   }else if(symbol==='raid'){
    assert.equal(legal(hit.s).some(a=>a.mode==='raid'),false,id);
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'get'});
    assert.equal(hit.s.players[1].hand.some(c=>c.cardId===id),true,id);
   }else if(symbol==='color'){
    assert.equal(legal(hit.s).some(a=>a.mode==='colorBounce'&&a.uid===hit.attacker.uid),true,id);
    hit.s=act(hit.s,{type:'chooseTrigger',mode:'colorBounce',uid:hit.attacker.uid});
    assert.equal(hit.s.players[0].hand.some(c=>c.uid===hit.attacker.uid),true,id);
   }
  }
  assert.equal(assertUniversalMatch(packs,hit.s),true,id);
 });
});
