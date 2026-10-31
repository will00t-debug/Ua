import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalAttackDamage,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseLegacyHardAiAction} from '../dist/universal-v2/ai.mjs';
import {chooseStrengthenedHardAction,HARD_AI_POLICY,resetHardAiReport,
 lastHardAiTrace} from '../dist/universal-v2/hard-ai.mjs';
import {chooseProgressSafeAiAction,aiPolicyFor} from '../dist/universal-v2/ai-driver-safety.mjs';

// Decision fixtures use the live V2 reducer. Card numbers are the prints in
// the three designated BLEACH decks, plus EX15BT/BLC-4-044 (first-attack
// sniper kit) and UA08BT/BLC-1-074 (printed Damage 2) where those decks have
// no sniper. Q34: a strictly greater blocker wins and neither character
// leaves. Q65–Q70: a designated sniper battle has no block window.
const pack=createBleachV2Pack(),packs=[pack,pack];
const deck=Object.fromEntries(summarizeDesignatedDecks(id=>!!pack.cards[id])
 .map(row=>[row.key,designatedPlayableCounts(row)]));
const lethalCounts={
 'BLC-4-044':4,'BLC-4-030':4,'BLC-1-074':4,'BLC-2-016':4,'BLC-4-032':4,
 'BLC-4-026':4,'BLC-2-015':4,'BLC-3-001':4,'BLC-4-022':4,'BLC-2-021':4,
 'BLC-4-027':4,'BLC-1-083':4,'BLC-2-019':2
};
assert.deepEqual(validateUniversalDeck(pack,lethalCounts),[]);

function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c?.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function reach(s,phase){
 for(let n=0;s.phase!==phase&&s.status==='playing'&&n<8;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,s.phase+' '+(s.pending?.kind||''));
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,phase);
 return s;
}
function hold(s,p,cards){
 const keep=new Set(cards.map(c=>c.uid));
 const hand=s.players[p].hand;
 for(let i=hand.length-1;i>=0;i--)if(!keep.has(hand[i].uid))
  s.players[p].deck.push(hand.splice(i,1)[0]);
 for(const card of cards)if(!hand.includes(card))hand.push(card);
}
function setLife(player,n){
 while(player.life.length>n)player.deck.push(player.life.pop());
 while(player.life.length<n&&player.deck.length)player.life.push(player.deck.pop());
}
function clearFront(player){
 for(let i=0;i<player.front.length;i++)if(player.front[i]){
  player.deck.push(player.front[i]);player.front[i]=null;
 }
}
function boot(counts,seed=1){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function idOf(s,uid){
 if(!uid)return null;
 for(const player of s.players){
  for(const zone of ['hand','deck','life','outside','removed']){
   const card=(player[zone]||[]).find(c=>c?.uid===uid);
   if(card)return card.cardId;
  }
  for(const line of ['front','energy'])
   for(const card of player[line])if(card?.uid===uid)return card.cardId;
 }
 return null;
}
function choose(s){
 resetHardAiReport();
 const before=structuredClone(s);
 const legacy=chooseLegacyHardAiAction(packs,s);
 const action=chooseStrengthenedHardAction(packs,s);
 assert.deepEqual(s,before,'search must not mutate the live state');
 const again=chooseStrengthenedHardAction(packs,s);
 assert.deepEqual(again,action,'same state is replayable');
 const legal=legalUniversalActions(packs,s);
 assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(action)),JSON.stringify(action));
 const trace=lastHardAiTrace();
 assert.equal(trace.policy,HARD_AI_POLICY);
 assert.ok(trace.ms<80,'decision '+trace.kind+' took '+trace.ms+'ms');
 return {action,legacy,trace};
}
function swapHidden(s){
 // Swap only cards outside a top-3 look and unrevealed LIFE. A decision
 // that reads deck order or LIFE identities changes when these move.
 for(const player of s.players){
  const deck=player.deck;
  if(deck.length>=6){
   const a=deck[deck.length-1];
   deck[deck.length-1]=deck[deck.length-2];
   deck[deck.length-2]=a;
  }
  if(player.life.length>=2){
   const a=player.life[0];player.life[0]=player.life[1];player.life[1]=a;
  }
 }
}

test('search takes the raid base, then discards the event instead of that base',()=>{
 // EX07BT/BLC-2-015 looks at the top 3 and may take one traitless character.
 // EX07BT/BLC-2-019 raids 黒崎 一護, so BLC-2-016 is the base and BLC-4-034 is not.
 let s=reach(boot(deck['reject-blue'],11),'main');
 const event=take(s,0,'BLC-2-047'),raider=take(s,0,'BLC-2-019'),source=take(s,0,'BLC-2-015');
 const handBase=take(s,0,'BLC-2-016');
 const deckWeak=take(s,0,'BLC-4-034'),deckBase=take(s,0,'BLC-2-016'),deckOther=take(s,0,'BLC-2-021');
 hold(s,0,[handBase,raider,event,source]);
 place(s,0,'BLC-4-022','energy',0);
 s.players[0].deck.unshift(deckOther);
 s.players[0].deck.unshift(deckBase);
 s.players[0].deck.unshift(deckWeak);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&
  a.line==='front'&&!a.replaceUid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const hidden=structuredClone(s);swapHidden(hidden);
 const picked=choose(s);
 assert.equal(idOf(s,picked.legacy.uid),'BLC-4-034');
 assert.equal(idOf(s,picked.action.uid),'BLC-2-016');
 assert.deepEqual(chooseStrengthenedHardAction(packs,hidden),picked.action);
 s=dispatchUniversalAction(packs,s,picked.action);
 while(s.pending?.kind==='effect-top-order')
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]);
 assert.equal(s.pending.kind,'effect-discard');
 const dumped=choose(s);
 assert.equal(idOf(s,dumped.legacy.uid),'BLC-2-016');
 assert.equal(idOf(s,dumped.action.uid),'BLC-2-047');
});

test('optional discard is skipped when the only hand card is the raid threat',()=>{
 // EX15BT/BLC-4-066 may discard a hand card, then peek and draw.
 let s=reach(boot(deck['white-sword'],5),'main');
 const threat=take(s,0,'BLC-2-067'),source=take(s,0,'BLC-4-066');
 hold(s,0,[threat,source]);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(s.pending.kind,'effect-discard-gate');
 const hidden=structuredClone(s);swapHidden(hidden);
 const {action,legacy}=choose(s);
 assert.equal(legacy.uid,threat.uid);
 assert.deepEqual(action,{type:'chooseDiscardGate',uid:null});
 assert.deepEqual(chooseStrengthenedHardAction(packs,hidden),action);
});

test('paying 1 AP for Damage 2 is taken when it is lethal, and a buff crosses the blocker',()=>{
 // UA08BT/BLC-1-047: once per turn, pay 1 AP, Damage 2 this turn.
 let paid=reach(boot(deck.renruki,4),'main');
 for(const card of [...paid.players[0].hand])paid.players[0].deck.push(card);
 paid.players[0].hand.length=0;
 const renji=place(paid,0,'BLC-1-047','front',0,true);
 setLife(paid.players[1],2);clearFront(paid.players[1]);
 assert.equal(universalAttackDamage(packs,paid,renji),1);
 const pay=choose(paid);
 assert.equal(pay.legacy.type,'next');
 assert.deepEqual(pay.action,{type:'activate',uid:renji.uid,mode:'oncePay'});

 // UA08BT/BLC-1-053 discards, then +500. 2000+500 ties EX07BT/BLC-2-052 and
 // the attacker wins that tie; 1500+500 still loses.
 let buff=reach(boot(deck.renruki,16),'main');
 for(const card of [...buff.players[0].hand])buff.players[0].deck.push(card);
 buff.players[0].hand.length=0;
 const source=place(buff,0,'BLC-1-053','energy',0,false);
 const small=place(buff,0,'BLC-4-048','front',0,true);
 const mid=place(buff,0,'BLC-4-049','front',1,true);
 const wall=place(buff,1,'BLC-2-052','front',0,true);
 const discard=take(buff,0,'BLC-4-058');buff.players[0].hand.push(discard);
 assert.deepEqual([universalBp(packs,buff,small),universalBp(packs,buff,mid),universalBp(packs,buff,wall)],
  [1500,2000,2500]);
 buff=dispatchUniversalAction(packs,buff,legalUniversalActions(packs,buff).find(a=>
  a.type==='activate'&&a.uid===source.uid));
 assert.equal(buff.pending.kind,'effect-discard-gate');
 buff=dispatchUniversalAction(packs,buff,legalUniversalActions(packs,buff).find(a=>a.uid===discard.uid));
 assert.equal(buff.pending.kind,'effect-buff-own');
 assert.equal(buff.pending.bp,500);
 const granted=choose(buff);
 assert.equal(granted.legacy.uid,small.uid);
 assert.equal(granted.action.uid,mid.uid);
});

test('standing is chosen over the first draw mode when the attack is lethal',()=>{
 // EX15BT/BLC-4-049 requires 朽木 ルキア, then draw OR stand and reduce BP.
 let s=reach(boot(deck.renruki,7),'main');
 for(const card of [...s.players[0].hand])s.players[0].deck.push(card);
 s.players[0].hand.length=0;
 place(s,0,'BLC-4-054','energy',0);
 const renji=place(s,0,'BLC-4-049','front',0,false);
 setLife(s.players[1],1);clearFront(s.players[1]);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='activate'&&a.uid===renji.uid));
 assert.equal(s.pending.kind,'effect-choice-mode');
 const {action,legacy}=choose(s);
 assert.equal(legacy.mode,'draw');
 assert.deepEqual(action,{type:'chooseEffectMode',mode:'active'});
});

test('bring-out deploys the heavier character instead of skipping the hand',()=>{
 // EX15BT/BLC-4-054: if 恋次 is on the field, pay 1 AP, draw, then rest-play or raid.
 let s=reach(boot(deck.renruki,8),'main');
 place(s,0,'BLC-4-049','front',1,true);
 for(let i=0;i<4;i++)place(s,0,'BLC-4-048','energy',i);
 const heavy=take(s,0,'BLC-1-047'),light=take(s,0,'BLC-2-052'),source=take(s,0,'BLC-4-054');
 hold(s,0,[heavy,light,source]);
 for(let i=0;i<s.players[0].apCards.length;i++){
  s.players[0].apCards[i].inPlay=i<2;s.players[0].apCards[i].ready=i<2;
 }
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 s=dispatchUniversalAction(packs,s,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(s.pending.kind,'effect-hand-rest-or-raid');
 const {action,legacy}=choose(s);
 assert.equal(legacy.uid,null);
 assert.equal(action.mode,'enter');
 assert.equal(idOf(s,action.uid),'BLC-1-047');
 assert.equal(action.line,'front');
});

test('raid uses the energy-4 base that grants Damage 2, not the energy-1 base',()=>{
 // EX07BT/BLC-2-067 raids 更木 剣八. Damage 2 and +1000 require a base of energy 4+.
 let s=reach(boot(deck['white-sword'],3),'main');
 const raider=take(s,0,'BLC-2-067');hold(s,0,[raider]);
 const low=place(s,0,'BLC-4-070','front',0);
 const high=place(s,0,'BLC-3-008','front',1);
 for(let i=0;i<4;i++)place(s,0,'BLC-1-083','energy',i);
 setLife(s.players[1],2);clearFront(s.players[1]);
 const {action,legacy}=choose(s);
 assert.equal(legacy.type,'play');
 assert.equal(action.type,'raid');
 assert.equal(action.baseUid,high.uid);
 assert.notEqual(action.baseUid,low.uid);
});

test('removal prefers the ready threat over the higher rested BP',()=>{
 // EX07BT/BLC-2-073 retires BP 3000, or 5000 while 更木 剣八 is on the field.
 let s=reach(boot(deck['white-sword'],2),'main');
 const event=take(s,0,'BLC-2-073');hold(s,0,[event]);
 place(s,0,'BLC-4-070','front',0);
 for(let i=0;i<4;i++)place(s,0,'BLC-1-083','energy',i);
 const rested=place(s,1,'BLC-2-067','front',0,false);
 const ready=place(s,1,'BLC-3-009','front',1,true);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.ok(universalBp(packs,s,rested)>universalBp(packs,s,ready));
 const {action,legacy}=choose(s);
 assert.equal(legacy.uid,rested.uid);
 assert.equal(action.uid,ready.uid);
});

test('sniper attack order is lethal and a losing sniper is refused',()=>{
 // EX15BT/BLC-4-044 grants 四楓院 夜一 +2000 and a first-attack kit
 // (Impact 1 plus a designated battle). UA08BT/BLC-1-074 is printed Damage 2.
 // The 3000 wall loses that designated battle. A higher front does not:
 // resolveFirstAttackKit leaves both characters, consumes the kit, and
 // deals no life damage, so the plain attack must be kept.
 let s=reach(newUniversalMatch(packs,{decks:[lethalCounts,lethalCounts],seed:41,first:0}),'main');
 const yoru=place(s,0,'BLC-4-030','front',0,true);
 const finisher=place(s,0,'BLC-1-074','front',1,true);
 const wall=place(s,1,'BLC-4-032','front',0,true);
 for(let i=0;i<4;i++)place(s,0,'BLC-2-016','energy',i);
 const event=take(s,0,'BLC-4-044');hold(s,0,[event]);setLife(s.players[1],2);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid));
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.uid===yoru.uid));
 s=reach(s,'attack');
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c.uid===yoru.uid)),3500);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front.find(c=>c.uid===finisher.uid)),2);
 const hidden=structuredClone(s);swapHidden(hidden);
 const {action,legacy}=choose(s);
 assert.equal(legacy.uid,finisher.uid);
 assert.equal(legacy.targetUid,undefined);
 assert.equal(action.uid,yoru.uid);
 assert.equal(action.targetUid,wall.uid);
 assert.deepEqual(chooseStrengthenedHardAction(packs,hidden),action);

 let losing=reach(newUniversalMatch(packs,{decks:[lethalCounts,lethalCounts],seed:42,first:0}),'main');
 const sniper=place(losing,0,'BLC-4-030','front',0,true);
 const bigger=place(losing,1,'BLC-4-022','front',0,true);
 for(let i=0;i<4;i++)place(losing,0,'BLC-2-016','energy',i);
 const kit=take(losing,0,'BLC-4-044');hold(losing,0,[kit]);
 losing=dispatchUniversalAction(packs,losing,legalUniversalActions(packs,losing).find(a=>a.type==='event'));
 losing=dispatchUniversalAction(packs,losing,legalUniversalActions(packs,losing).find(a=>a.uid===sniper.uid));
 losing=reach(losing,'attack');
 const sniperAction=legalUniversalActions(packs,losing).find(a=>a.targetUid===bigger.uid);
 assert.ok(sniperAction);
 const sniperCard=losing.players[0].front.find(c=>c.uid===sniper.uid);
 assert.ok(universalBp(packs,losing,sniperCard)<universalBp(packs,losing,bigger));
 const lifeBefore=losing.players[1].life.length;
 const bad=dispatchUniversalAction(packs,losing,sniperAction);
 const survived=bad.players[0].front.find(c=>c?.uid===sniper.uid);
 assert.ok(survived,'first-attack kit loss keeps the attacker');
 assert.ok(bad.players[1].front.some(c=>c?.uid===bigger.uid));
 assert.equal(bad.players[1].life.length,lifeBefore);
 assert.equal(survived.firstAttackKit.consumed,true);
 const refused=choose(losing);
 assert.equal(refused.action.targetUid,undefined);
 assert.equal(refused.action.type,'attack');
});

test('Damage 2 is blocked before life is critical, and the only defender is not tapped',()=>{
 let block=reach(newUniversalMatch(packs,{
  decks:[deck['white-sword'],deck.renruki],seed:23,first:0}),'attack');
 clearFront(block.players[0]);clearFront(block.players[1]);
 const attacker=place(block,0,'BLC-2-067','front',0,true);
 place(block,0,'BLC-3-009','front',1,true);
 const blocker=place(block,1,'BLC-4-048','front',0,true);
 attacker.attackDamageGranted={turn:block.turn,stamp:attacker.fieldEntryStamp,amount:2};
 setLife(block.players[1],4);
 assert.equal(assertUniversalMatch(packs,block),true);
 block=dispatchUniversalAction(packs,block,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(block.pending.kind,'block');
 assert.equal(universalAttackDamage(packs,block,attacker),2);
 const blocked=choose(block);
 assert.equal(blocked.legacy.uid,null);
 assert.equal(blocked.action.uid,blocker.uid);

 let rest=reach(newUniversalMatch(packs,{
  decks:[deck.renruki,deck['white-sword']],seed:22,first:0}),'attack');
 clearFront(rest.players[0]);clearFront(rest.players[1]);
 const defender=place(rest,0,'BLC-4-048','front',0,true);
 place(rest,1,'BLC-4-070','front',0,true);
 const threat=place(rest,1,'BLC-3-009','front',1,true);
 threat.attackDamageGranted={turn:rest.turn,stamp:threat.fieldEntryStamp,amount:2};
 assert.equal(assertUniversalMatch(packs,rest),true);
 const hidden=structuredClone(rest);swapHidden(hidden);
 const passed=choose(rest);
 assert.equal(passed.legacy.type,'attack');
 assert.equal(passed.legacy.uid,defender.uid);
 assert.deepEqual(passed.action,{type:'next'});
 assert.deepEqual(chooseStrengthenedHardAction(packs,hidden),passed.action);
 const driven=chooseProgressSafeAiAction(packs,rest,{difficulty:'hard'});
 assert.deepEqual(driven.action,passed.action);
 assert.equal(driven.reason,null);
 const normal=chooseProgressSafeAiAction(packs,rest,{difficulty:'normal'});
 assert.equal(normal.action.type,'attack');
});

test('an on-play look still puts the affordable generator on energy',()=>{
 // EX15BT/BLC-4-083 peeks on play and costs 0 while the field is empty.
 // EX15BT/BLC-4-048 also peeks. UA08BT/BLC-1-047 is the raider in hand.
 // Scoring the peek as a lost card used to pass the whole main phase.
 let s=reach(boot(deck.renruki,3),'main');
 const small=take(s,0,'BLC-4-048'),body=take(s,0,'BLC-4-083'),raider=take(s,0,'BLC-1-047');
 hold(s,0,[small,body,raider]);
 const hidden=structuredClone(s);swapHidden(hidden);
 const {action,legacy}=choose(s);
 assert.equal(legacy.type,'play');
 assert.equal(legacy.line,'energy');
 assert.equal(idOf(s,legacy.uid),'BLC-4-048');
 assert.equal(action.type,'play');
 assert.equal(action.line,'energy');
 assert.equal(idOf(s,action.uid),'BLC-4-083');
 assert.deepEqual(chooseStrengthenedHardAction(packs,hidden),action);
});

test('the only generator stays on energy while the curve is unmet',()=>{
 // Moving EX15BT/BLC-4-048 forward at 1 energy just to bump another 1500
 // leaves the turn unable to play anything. End of turn would ready it anyway.
 let s=reach(boot(deck.renruki,9),'move');
 const gen=place(s,0,'BLC-4-048','energy',0);
 place(s,1,'BLC-4-048','front',0,true);
 hold(s,0,[]);
 const {action,legacy}=choose(s);
 assert.equal(legacy.type,'next');
 assert.equal(action.type,'next');
 assert.notEqual(action.uid,gen.uid);
});

test('battle page hard difficulty is wired to the strengthened policy',()=>{
 assert.equal(aiPolicyFor('hard'),HARD_AI_POLICY);
 assert.equal(aiPolicyFor('normal'),'normal');
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const battle=readFileSync(new URL('../dist/universal-v2-battle.html',import.meta.url),'utf8');
 const setup=readFileSync(new URL('../dist/universal-v2-preview.html',import.meta.url),'utf8');
 assert.match(preview,/ai-driver-safety\.mjs\?v=20261030hardai1/);
 assert.match(preview,/document\.body\.dataset\.aiPolicy=aiPolicyFor\(app\.aiDifficulty\)/);
 assert.match(battle,/universal-v2-preview\.mjs\?v=20261030hardai1/);
 assert.match(setup,/universal-v2-preview\.mjs\?v=20261030hardai1/);
 assert.match(battle,/universal-v2-battle\.css\?v=20261028triggercenter1/);
});
