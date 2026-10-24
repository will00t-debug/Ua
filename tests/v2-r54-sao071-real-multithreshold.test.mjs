import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalAttackDamage,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const pack=registeredV2TitlePack('sword-art-online'),both=[pack,pack];
const names=['ユウキ','マザーズ・ロザリオ'];
const ids=['SAO-1-071','SAO-1-070','SAO-1-100','SAO-2-068',
 'SAO-2-063','SAO-1-068','SAO-1-005','SAO-1-079',
 'SAO-1-078','SAO-2-069','SAO-1-057','SAO-1-051','SAO-1-004'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const pool=s.players[p][zone],i=pool.findIndex(c=>c.cardId===id);
  if(i>=0)return pool.splice(i,1)[0];
 }
 throw Error('Missing source-pinned physical '+id);
}
function named(s){
 return s.players[0].outside.filter(c=>names.includes(pack.cards[c.cardId].name)).length;
}
function tierScene(n){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:54071+n});
 const actor=take(s,0,'SAO-1-071');actor.ready=true;
 actor.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=actor;
 const outside=[
  ...Array.from({length:4},()=>take(s,0,'SAO-1-100')),
  ...Array.from({length:4},()=>take(s,0,'SAO-2-068'))];
 s.players[0].outside.push(...outside.slice(0,n));
 s.players[0].deck.push(...outside.slice(n));
 assert.equal(named(s),n);
 assert.equal(assertUniversalMatch(both,s),true);
 return {s,actor};
}
test('R54 official UA15BT/SAO-1-071 literal whole print: accumulated 4/6/8',()=>{
 const source=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-1-071');
 assert.equal(source.number,'UA15BT/SAO-1-071');
 assert.deepEqual([source.nameJa,source.color,source.energy,source.ap,source.bp,source.gen,
  source.trigger],['アスナ','green',4,1,4000,1,'raid']);
 assert.deepEqual(source.traits,['ALO']);
 for(const fragment of ['4枚以上','6枚以上','8枚以上','【ダメージ（2）】',
  'BP3000以下'])assert.ok(source.effectJa.includes(fragment));
 const d=pack.cards[source.id];
 assert.equal(d.raidName,'アスナ');
 assert.deepEqual(d.effects.onAttack,[{op:'drawIfOwnOutsideNamedCountAtLeast',
  min:4,count:1,names,optional:true}]);
 assert.deepEqual(d.passiveBonuses,[{
  condition:{kind:'ownOutsideNamedCountAtLeast',turn:'own',min:6,names},
  bp:1000,extraDamage:1}]);
 assert.deepEqual(d.blockBpRestriction,{
  relation:'atMost',bp:3000,
  condition:{kind:'ownOutsideNamedCountAtLeast',turn:'any',min:8,names}});
});
test('R54 source-pinned physical names: 3/4/5/6/7/8 grants are cumulative and live',()=>{
 for(const n of [3,4,5,6,7,8]){
  let {s,actor}=tierScene(n);
  assert.equal(universalBp(both,s,actor),n>=6?5000:4000);
  assert.equal(universalAttackDamage(both,s,actor),n>=6?2:1);
  s=use(s,{type:'next'});s=use(s,{type:'next'});s=use(s,{type:'next'});
  assert.equal(s.phase,'attack');
  s=use(s,{type:'attack',uid:actor.uid});
  assert.equal(s.pending?.kind,n>=4?'effect-optional-draw':'block');
  if(n>=4){
   assert.ok(legalUniversalActions(both,s).some(x=>
    x.type==='chooseOptionalDraw'&&x.mode==='skip'));
   s=use(s,{type:'chooseOptionalDraw',mode:'skip'});
  }
  assert.equal(s.pending?.kind,'block');
  assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
 }
 const {s,actor}=tierScene(8);
 const moved=s.players[0].outside.pop();s.players[0].hand.push(moved);
 assert.equal(universalBp(both,s,actor),5000);
 // 7 still satisfies six-card DAMAGE2 but loses eight-card blocker restriction.
 assert.equal(universalAttackDamage(both,s,actor),2);
});
test('R54 REAL legal 50-card actions: 4 paid EVENT + 4 Yuuki true retire reach 8, paid Raid and battle',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:54271});
 const boss=take(s,0,'SAO-1-071');
 const base=take(s,0,'SAO-1-070');
 const green3=take(s,0,'SAO-2-063'),green1=take(s,0,'SAO-1-068');
 for(const [slot,c] of [green3,green1,base].entries()){
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].energy[slot]=c;
 }
 const yuuki=Array.from({length:4},()=>take(s,0,'SAO-2-068'));
 yuuki.forEach((c,i)=>{c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[i]=c;});
 const events=Array.from({length:4},()=>take(s,0,'SAO-1-100'));
 const payments=Array.from({length:4},()=>take(s,0,'SAO-1-005'));
 s.players[0].hand.push(...events,...payments,boss);
 const enemies=Array.from({length:4},()=>take(s,1,'SAO-1-068'));
 enemies.forEach((c,i)=>{c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[i]=c;});
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 // Legitimate late-game AP snapshot: all three AP cards have entered play.
 // They are still paid by the real EVENT action and cannot be spent twice.
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 for(let i=0;i<3;i++){
  const a=legalUniversalActions(both,s).find(x=>x.type==='event'&&x.uid===events[i].uid);
  assert.ok(a,'genuine paid EVENT '+i);s=use(s,a);
  assert.equal(s.pending?.kind,'effect-named-outside-bounce-retire');
  const selected=legalUniversalActions(both,s).find(x=>
   x.type==='chooseNamedOutsideBounceRetire'&&x.uid===enemies[i].uid);
  assert.ok(selected);s=use(s,selected);
  assert.equal(named(s),i+1);
 }
 for(let i=0;i<4;i++){
  const act=legalUniversalActions(both,s).find(x=>x.type==='activate'&&
   x.uid===yuuki[i].uid&&x.mode==='restDiscardRetire');
  assert.ok(act,'genuine REST/discard/self-retire '+i);s=use(s,act);
  assert.equal(s.pending?.kind,'main-discard-self-retire');
  const payment=legalUniversalActions(both,s).find(x=>
   x.type==='chooseMainDiscardRetire'&&x.uid===payments[i].uid);
  assert.ok(payment);s=use(s,payment);
  if(s.pending?.kind==='effect-named-zone-entry'){
   const skip=legalUniversalActions(both,s).find(x=>
    x.type==='chooseNamedZoneDeploy'&&x.uid===null);
   assert.ok(skip);s=use(s,skip);
  }
  assert.ok(s.players[0].outside.some(c=>c.uid===yuuki[i].uid));
  assert.equal(named(s),4+i);
 }
 assert.equal(named(s),7);
 s=use(s,{type:'next'});
 for(let i=0;i<12&&!(s.active===0&&s.phase==='main');i++){
  if(s.pending?.kind==='end-hand-limit'){
   // Advance through the real game's mandatory max-eight hand rule,
   // never bypass the turn phase or remove cards without a legal action.
   const trim=legalUniversalActions(both,s).find(x=>x.type==='chooseHandLimit');
   assert.ok(trim);s=use(s,trim);continue;
  }
  assert.equal(s.pending,null);
  s=use(s,{type:'next'});
 }
 assert.equal(s.active,0);assert.equal(s.phase,'main');
 const final=legalUniversalActions(both,s).find(x=>
  x.type==='event'&&x.uid===events[3].uid);
 assert.ok(final,'fourth paid official EVENT on next own turn');
 s=use(s,final);
 const choose=legalUniversalActions(both,s).find(x=>
  x.type==='chooseNamedOutsideBounceRetire'&&x.uid===enemies[3].uid);
 assert.ok(choose);s=use(s,choose);
 assert.equal(named(s),8);
 const raid=legalUniversalActions(both,s).find(x=>
  x.type==='raid'&&x.uid===boss.uid&&x.baseUid===base.uid);
 assert.ok(raid,'paid green4 legal Raid 071 over own Asuna');
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 s=use(s,raid);
 assert.equal(ap-s.players[0].apCards.filter(x=>x.ready).length,1);
 const actor=s.players[0].front.find(c=>c?.uid===boss.uid);
 assert.ok(actor&&actor.ready);
 assert.equal(universalBp(both,s,actor),5000);
 assert.equal(universalAttackDamage(both,s,actor),2);
 const low=take(s,1,'SAO-1-068'),high=take(s,1,'SAO-1-070');
 for(const [i,c] of [low,high].entries()){
  c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[1].front[i]=c;
 }
 s=use(s,{type:'next'});assert.equal(s.phase,'attack');
 s=use(s,{type:'attack',uid:boss.uid});
 assert.equal(s.pending?.kind,'effect-optional-draw');
 const before=s.players[0].deck.length;
 s=use(s,{type:'chooseOptionalDraw',mode:'draw'});
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending?.kind,'block');
 const blocks=legalUniversalActions(both,s).filter(a=>a.type==='chooseBlock');
 assert.ok(!blocks.some(x=>x.uid===low.uid),'BP under 3000 prohibited');
 assert.ok(blocks.some(x=>x.uid===high.uid),'BP above 3000 permitted');
 assert.throws(()=>use(s,{type:'chooseBlock',uid:low.uid}));
 s=use(s,{type:'chooseBlock',uid:high.uid});
 assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
 assert.equal(universalPublicView(both,s,1).players[0].hand,null);
 for(const difficulty of ['easy','normal','hard']){
  const action=chooseUniversalAiAction(both,s,{difficulty});
  assert.ok(legalUniversalActions(both,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 }
});
