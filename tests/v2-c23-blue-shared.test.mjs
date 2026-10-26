import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView,universalEnergyByColor}
 from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts}
 from '../dist/universal-v2/bleach-designated-decks.mjs';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const counts={
 'BLC-4-034':4,'BLC-2-021':4,'BLC-2-015':4,'BLC-4-027':4,'BLC-2-019':4,
 'BLC-4-022':4,'BLC-4-036':2,'BLC-2-047':4,'BLC-2-046':4,'BLC-2-016':4,
 'BLC-4-026':2,'BLC-3-001':2,'BLC-2-062':2,'BLC-1-009':2,'BLC-2-044':2,'BLC-2-049':2
};
const fresh=(seed=2301)=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function uids(s){
 const out=[],walk=c=>{out.push(c.uid);for(const x of c.stack||[])walk(x);for(const x of c.under||[])walk(x);};
 for(const p of s.players){
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed'])
   for(const c of p[zone])walk(c);
  for(const c of [...p.front,...p.energy])if(c)walk(c);
 }
 return out.sort();
}
function actorOf(s){return s.pending?.player??s.active;}
function play(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,'missing legal action');
 const next=dispatchUniversalAction(packs,s,action,{actor:actorOf(s)});
 assert.deepEqual(uids(next),uids(s));
 assert.equal(assertUniversalMatch(packs,next),true);
 return next;
}
function phase(s,target){
 for(let i=0;i<8&&s.phase!==target;i++)s=play(s,a=>a.type==='next');
 assert.equal(s.phase,target);return s;
}
function sit(s,card,ready=true){
 card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;return card;
}
function fuel(s,n,id='BLC-2-016'){
 for(let i=0;i<n;i++)s.players[0].energy[i]=sit(s,take(s,0,id));
}
function readyAp(s,n){
 for(let i=0;i<n;i++){s.players[0].apCards[i].inPlay=true;s.players[0].apCards[i].ready=true;}
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function orderBottom(s){
 while(s.pending?.kind==='effect-top-order'){
  s=play(s,a=>a.type==='chooseTopOrder');
 }
 return s;
}

test('nine blue prints complete the reject deck without joining the seven presets',()=>{
 assert.equal(Object.keys(pack.cards).length,160);
 assert.equal(EXPECTED_V2_COUNTS.bleach,160);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.equal(EXPECTED_V2_TOTAL,489);
 const row=summarizeDesignatedDecks(id=>!!pack.cards[id]).find(r=>r.key==='reject-blue');
 assert.equal(row.playable,true);
 assert.equal(row.registeredKinds,13);
 assert.deepEqual(validateUniversalDeck(pack,designatedPlayableCounts(row)),[]);
 assert.equal(Object.keys(createAllV2PreviewRealDecks()).includes('reject-blue'),false);
});

test('BLC-2-015 takes one traitless character from the top three, then discards only if it took one',()=>{
 let s=phase(fresh(2315),'main');
 fuel(s,1);
 const urahara=take(s,0,'BLC-2-015');s.players[0].hand.push(urahara);
 const [plain,traited,field]=setTop(s,0,['BLC-2-021','BLC-2-062','BLC-2-044']);
 s=play(s,a=>a.type==='play'&&a.uid===urahara.uid&&a.line==='energy');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.choices,[plain.uid]);
 const declined=orderBottom(play(s,a=>a.type==='chooseTopFiltered'&&a.uid===null));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>c.uid===plain.uid),false);
 assert.deepEqual(declined.players[0].deck.slice(-3).map(c=>c.uid),[plain.uid,traited.uid,field.uid]);
 s=play(s,a=>a.type==='chooseTopFiltered'&&a.uid===plain.uid);
 assert.equal(s.publicReveals.at(-1).cardId,'BLC-2-021');
 s=orderBottom(s);
 assert.equal(s.pending.kind,'effect-discard');
 const spare=s.players[0].hand.find(c=>c.uid!==plain.uid);
 s=play(s,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===plain.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[traited.uid,field.uid]);
});

test('BLC-2-047 draws two on play, and the bonus draw waits until a blue Ichigo effect finishes',()=>{
 let s=phase(fresh(2347),'main');
 fuel(s,2);
 const event=take(s,0,'BLC-2-047');s.players[0].hand.push(event);
 const before=s.players[0].deck.length;
 s=play(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 let caused=phase(fresh(2348),'main');
 fuel(caused,2);
 const ichigo=take(caused,0,'BLC-2-016'),bonus=take(caused,0,'BLC-2-047');
 caused.players[0].hand.push(ichigo,bonus);
 caused=play(caused,a=>a.type==='play'&&a.uid===ichigo.uid);
 assert.equal(caused.pending.kind,'effect-discard');
 const drawn=caused.players[0].deck.length;
 caused=play(caused,a=>a.type==='chooseDiscard'&&a.uid===bonus.uid);
 assert.equal(caused.pending,null);
 assert.equal(caused.players[0].deck.length,drawn-1);
 let other=phase(fresh(2349),'main');
 fuel(other,1);
 const kisuke=take(other,0,'BLC-2-015'),named=take(other,0,'BLC-2-047');
 other.players[0].hand.push(kisuke,named);
 setTop(other,0,['BLC-2-021','BLC-2-062','BLC-2-044']);
 other=play(other,a=>a.type==='play'&&a.uid===kisuke.uid&&a.line==='front');
 other=play(other,a=>a.type==='chooseTopFiltered'&&a.uid!==null);
 other=orderBottom(other);
 const still=other.players[0].deck.length;
 other=play(other,a=>a.type==='chooseDiscard'&&a.uid===named.uid);
 assert.equal(other.players[0].deck.length,still);
 assert.equal(other.players[0].outside.some(c=>c.uid===named.uid),true);
});

test('BLC-2-021 may stop BP 3000 from blocking the causing blue Ichigo',()=>{
 function grant(seed,mode){
  let s=phase(fresh(seed),'main');
  const ichigo=take(s,0,'BLC-2-016'),zangetsu=take(s,0,'BLC-2-021');
  s.players[0].hand.push(ichigo,zangetsu);
  const low=sit(s,take(s,1,'BLC-3-001')),high=sit(s,take(s,1,'BLC-2-016'));
  high.buffs=[{bp:2000,untilTurn:s.turn}];
  s.players[1].front[0]=low;s.players[1].front[1]=high;
  s=play(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front'&&a.slot===0);
  s=play(s,a=>a.type==='chooseDiscard'&&a.uid===zangetsu.uid);
  assert.equal(s.pending.kind,'effect-grant-cause');
  s=play(s,a=>a.type==='chooseGrantCause'&&a.mode===mode);
  return {s,ichigo:s.players[0].front.find(c=>c?.uid===ichigo.uid),low,high};
 }
 let {s,ichigo,low,high}=grant(2321,'grant');
 ichigo.ready=true;
 s=play(s,a=>a.type==='next');
 s=play(s,a=>a.type==='attack'&&a.uid===ichigo.uid);
 const blocked=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocked.includes(low.uid),false);
 assert.equal(blocked.includes(high.uid),true);
 assert.equal(universalBp(packs,s,low),3000);
 assert.equal(universalBp(packs,s,high),3500);
 ({s,ichigo,low}=grant(2322,'skip'));
 ichigo.ready=true;
 s=play(s,a=>a.type==='next');
 s=play(s,a=>a.type==='attack'&&a.uid===ichigo.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseBlock'&&a.uid===low.uid),true);
});

test('BLC-2-019 raids, lowers two fronts, then pays a slash-name card and draws its bonus afterward',()=>{
 let s=phase(fresh(2319),'main');
 fuel(s,4);
 const base=sit(s,take(s,0,'BLC-4-026'),false);
 s.players[0].front[0]=base;
 const raid=take(s,0,'BLC-2-019'),bonus=take(s,0,'BLC-2-047');
 s.players[0].hand.push(raid,bonus);
 const foes=[sit(s,take(s,1,'BLC-3-001')),sit(s,take(s,1,'BLC-2-062'))];
 foes.forEach((c,i)=>{s.players[1].front[i]=c;});
 s=play(s,a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===base.uid);
 assert.equal(s.pending.kind,'effect-target-many');
 for(const foe of foes)s=play(s,a=>a.type==='chooseTargetMany'&&a.uid===foe.uid);
 assert.deepEqual(s.players[1].front.slice(0,2).map(c=>universalBp(packs,s,c)),[1500,1000]);
 const before=s.players[0].deck.length;
 s=play(s,a=>a.type==='activate'&&a.uid===raid.uid);
 s=play(s,a=>a.type==='chooseDiscardGate'&&a.uid===bonus.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),5000);
 s=play(s,a=>a.type==='next');
 s.players[0].front[0].ready=true;
 const deck=s.players[0].deck.length;
 s=play(s,a=>a.type==='attack'&&a.uid===raid.uid);
 assert.equal(s.pending.kind,'granted-attack-draw');
 s=play(s,a=>a.type==='chooseGrantedDraw'&&a.mode==='draw');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'block');
});

test('BLC-2-046 retires BP 3500 or lower, and a successful bottom grants the first attack a ready',()=>{
 let s=phase(fresh(2346),'main');
 fuel(s,3);
 const event=take(s,0,'BLC-2-046');s.players[0].hand.push(event);
 const low=sit(s,take(s,1,'BLC-3-001')),high=sit(s,take(s,1,'BLC-1-009'));
 high.buffs=[{bp:2000,untilTurn:s.turn}];
 s.players[1].front[0]=low;s.players[1].front[1]=high;
 s=play(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.deepEqual(s.pending.choices,[low.uid]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:high.uid}),/not currently legal/);
 s=play(s,a=>a.type==='chooseRetireBp'&&a.uid===low.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 let granted=phase(fresh(2345),'main');
 const ichigo=take(granted,0,'BLC-2-016'),getsuga=take(granted,0,'BLC-2-046'),
  bottom=granted.players[0].hand[0];
 granted.players[0].hand.push(ichigo,getsuga);
 granted=play(granted,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front'&&a.slot===0);
 granted=play(granted,a=>a.type==='chooseDiscard'&&a.uid===getsuga.uid);
 assert.equal(granted.pending.kind,'effect-hand-bottom');
 granted=play(granted,a=>a.type==='chooseHandBottom'&&a.uid===bottom.uid);
 assert.equal(granted.players[0].deck.at(-1).uid,bottom.uid);
 granted.players[0].front[0].ready=true;
 granted=play(granted,a=>a.type==='next');
 granted=play(granted,a=>a.type==='attack'&&a.uid===ichigo.uid);
 assert.equal(granted.players[0].front.find(c=>c?.uid===ichigo.uid).ready,true);
 let skipped=phase(fresh(2344),'main');
 const source=take(skipped,0,'BLC-2-016'),again=take(skipped,0,'BLC-2-046');
 skipped.players[0].hand.push(source,again);
 skipped=play(skipped,a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 skipped=play(skipped,a=>a.type==='chooseDiscard'&&a.uid===again.uid);
 skipped=play(skipped,a=>a.type==='chooseHandBottom'&&a.uid===null);
 skipped.players[0].front[0].ready=true;
 skipped=play(skipped,a=>a.type==='next');
 skipped=play(skipped,a=>a.type==='attack'&&a.uid===source.uid);
 assert.equal(skipped.players[0].front.find(c=>c?.uid===source.uid).ready,false);
 assert.equal(pack.cards['BLC-2-046'].triggerEffect.op,'retireOppFront');
});

test('BLC-4-027 nullifies Impact, pays a slash name, moves from energy, and rejects trigger choices',()=>{
 let battle=phase(fresh(2327),'attack');
 const defender=sit(battle,take(battle,0,'BLC-4-027')),attacker=sit(battle,take(battle,1,'BLC-1-009'));
 battle.players[0].front[0]=defender;battle.players[1].front[0]=attacker;
 battle.active=1;
 const life=battle.players[0].life.length;
 battle=play(battle,a=>a.type==='attack'&&a.uid===attacker.uid);
 battle=play(battle,a=>a.type==='chooseBlock'&&a.uid===defender.uid);
 assert.equal(battle.players[0].life.length,life);
 assert.equal(battle.players[0].outside.some(c=>c.uid===defender.uid),true);
 let open=phase(fresh(2328),'main');
 fuel(open,3);
 const self=take(open,0,'BLC-4-027');
 for(const id of ['BLC-2-021','BLC-2-046','BLC-2-047'])
  while(open.players[0].hand.some(c=>c.cardId===id))open.players[0].deck.push(take(open,0,id));
 open.players[0].hand.push(self);
 open=play(open,a=>a.type==='play'&&a.uid===self.uid&&a.line==='energy'&&a.slot===3);
 assert.equal(open.players[0].energy[3].ready,false);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const pay=take(open,0,'BLC-2-021');open.players[0].hand.push(pay);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.type==='activate'&&a.uid===self.uid),true);
 const drawn=open.players[0].deck.length;
 open=play(open,a=>a.type==='activate'&&a.uid===self.uid);
 open=play(open,a=>a.type==='chooseDiscardGate'&&a.uid===pay.uid);
 if(open.pending?.kind==='effect-grant-cause')
  open=play(open,a=>a.type==='chooseGrantCause'&&a.mode==='skip');
 assert.equal(open.players[0].deck.length,drawn-1);
 assert.equal(universalBp(packs,open,open.players[0].energy[3]),4000);
 for(let i=0;i<3;i++)open.players[0].front[i]=sit(open,take(open,0,'BLC-4-034'),false);
 const lifeCard=take(open,1,'BLC-2-046');
 open.players[1].life.unshift(lifeCard);
 open=play(open,a=>a.type==='next');
 assert.equal(open.phase,'attack');
 assert.equal(open.players[0].front[3].uid,self.uid);
 assert.equal(open.players[0].energy[3],null);
 open.players[0].front[0].ready=true;
 open=play(open,a=>a.type==='attack'&&a.uid===open.players[0].front[0].uid);
 open=play(open,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(open.pending.kind,'life-trigger');
 const specials=legalUniversalActions(packs,open).filter(a=>a.type==='chooseTrigger'&&a.mode==='special');
 assert.equal(specials.some(a=>a.uid===self.uid),false);
 assert.equal(specials.some(a=>a.uid===open.players[0].front[0].uid),true);
});

test('BLC-4-022 enters active, may reuse the discarded blue card, and protects only on the entry turn',()=>{
 let s=phase(fresh(2322),'main');
 fuel(s,4);readyAp(s,2);
 const orihime=take(s,0,'BLC-4-022'),discarded=take(s,0,'BLC-2-021'),
  covered=sit(s,take(s,0,'BLC-2-021')),openTarget=sit(s,take(s,0,'BLC-4-034'));
 s.players[0].hand.push(orihime,discarded);
 s.players[0].front[1]=covered;s.players[0].front[2]=openTarget;
 s=play(s,a=>a.type==='play'&&a.uid===orihime.uid&&a.line==='front'&&a.slot===0);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].front[0].entryTurn,s.turn);
 s=play(s,a=>a.type==='chooseDiscardGate'&&a.uid===discarded.uid);
 assert.equal(s.pending.kind,'effect-outside-hand-or-rest');
 assert.equal(s.pending.choices.includes(discarded.uid),true);
 s=play(s,a=>a.type==='chooseOutsideUse'&&a.mode==='hand'&&a.uid===discarded.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===discarded.uid),true);
 s=play(s,a=>a.type==='activate'&&a.uid===orihime.uid&&a.mode==='entryProtect');
 s=play(s,a=>a.type==='chooseEntryProtect'&&a.uid===covered.uid);
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'&&e.targetUid===covered.uid),true);
 for(let i=0;i<12&&!(s.active===1&&s.phase==='main');i++){
  if(s.pending?.kind==='end-hand-limit')
   s=play(s,a=>a.type==='chooseHandLimit');
  else s=play(s,a=>a.type==='next');
 }
 assert.equal(s.active,1);assert.equal(s.phase,'main');
 for(let i=0;i<3;i++)s.players[1].energy[i]=sit(s,take(s,1,'BLC-2-016'));
 const getsuga=take(s,1,'BLC-2-046');s.players[1].hand.push(getsuga);
 s=play(s,a=>a.type==='event'&&a.uid===getsuga.uid);
 const choices=legalUniversalActions(packs,s).filter(a=>a.type==='chooseRetireBp').map(a=>a.uid);
 assert.equal(choices.includes(covered.uid),false);
 assert.equal(choices.includes(openTarget.uid),true);
 s=play(s,a=>a.type==='chooseRetireBp'&&a.uid===openTarget.uid);
 for(let i=0;i<12&&!(s.active===0&&s.phase==='main');i++){
  if(s.pending?.kind==='end-hand-limit')s=play(s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('unexpected pending '+s.pending.kind);
  else s=play(s,a=>a.type==='next');
 }
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===orihime.uid),false);
});

test('BLC-4-034 tucks one facedown card, readies on the energy line, and can return that card',()=>{
 let rested=phase(fresh(2334),'main');
 const front=take(rested,0,'BLC-4-034');rested.players[0].hand.push(front);
 rested=play(rested,a=>a.type==='play'&&a.uid===front.uid&&a.line==='front');
 assert.equal(rested.players[0].front.find(c=>c.uid===front.uid).ready,false);
 let active=phase(fresh(2335),'main');
 const line=take(active,0,'BLC-4-034');active.players[0].hand.push(line);
 active=play(active,a=>a.type==='play'&&a.uid===line.uid&&a.line==='energy');
 assert.equal(active.players[0].energy.find(c=>c.uid===line.uid).ready,true);
 let s=phase(fresh(2336),'main');
 const riruka=sit(s,take(s,0,'BLC-4-034')),ichigo=take(s,0,'BLC-2-016'),
  tucked=take(s,0,'BLC-2-047');
 s.players[0].front[0]=riruka;s.players[0].hand.push(ichigo,tucked);
 const before=s.players[0].deck.length;
 s=play(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='energy');
 s=play(s,a=>a.type==='chooseDiscard'&&a.uid===tucked.uid);
 assert.equal(s.pending.kind,'effect-move-order');
 s=play(s,a=>a.type==='chooseMoveEffectOrder'&&String(a.key).startsWith('observer-'));
 s=play(s,a=>a.type==='chooseRestTuck'&&a.mode==='rest');
 s=play(s,a=>a.type==='chooseTuckMoved'&&a.uid===tucked.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before-2);
 assert.equal(s.players[0].front[0].under[0].uid,tucked.uid);
 assert.equal(s.players[0].front[0].under[0].faceDown,true);
 const owner=universalPublicView(packs,s,0).players[0].front[0].underLayers[0];
 const foe=universalPublicView(packs,s,1).players[0].front[0].underLayers[0];
 assert.equal(owner.cardId,'BLC-2-047');
 assert.deepEqual(foe,{faceDown:true});
 s.players[0].front[0].ready=true;
 s=play(s,a=>a.type==='activate'&&a.uid===riruka.uid&&a.mode==='restRetireUnder');
 assert.equal(s.pending.kind,'effect-recover-under');
 s=play(s,a=>a.type==='chooseRecoverUnder'&&a.uid===tucked.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===tucked.uid&&c.faceDown!==true),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===riruka.uid),true);
});

test('BLC-4-036 pays 1 AP to enter active only for Ichigo or Urahara, and only the paid entry is once per turn',()=>{
 function caused(seed,{gens=4,ap=2,trait=false}={}){
  let s=phase(fresh(seed),'main');
  fuel(s,gens);readyAp(s,ap);
  if(trait)s.players[0].front[0]=sit(s,take(s,0,'BLC-2-062'));
  const ichigo=take(s,0,'BLC-4-026'),grim=take(s,0,'BLC-4-036');
  s.players[0].hand.push(ichigo,grim);
  s=play(s,a=>a.type==='play'&&a.uid===ichigo.uid&&a.line==='front'&&a.slot===1);
  s=play(s,a=>a.type==='chooseDiscard'&&a.uid===grim.uid);
  return {s,grim};
 }
 const poor=caused(2361,{gens:3});
 assert.equal(universalEnergyByColor(packs,poor.s,0).blue,3);
 assert.equal(poor.s.pending,null);
 const traited=caused(2362,{trait:true});
 assert.equal(traited.s.pending,null);
 const broke=caused(2363,{ap:1});
 assert.equal(broke.s.pending,null);
 const declined=caused(2364);
 assert.equal(declined.s.pending.kind,'effect-pay-deploy-self');
 const skipped=play(declined.s,a=>a.type==='choosePayDeploy'&&a.mode==='skip');
 assert.deepEqual(skipped.onceEffectUses[0],[]);
 let paid=caused(2365);
 paid.s=play(paid.s,a=>a.type==='choosePayDeploy'&&a.mode==='pay');
 paid.s=play(paid.s,a=>a.type==='chooseDeploySelfActive'&&a.line==='front');
 assert.equal(paid.s.players[0].front.find(c=>c?.uid===paid.grim.uid).ready,true);
 paid.s.players[0].apCards[0].ready=true;paid.s.players[0].apCards[1].ready=true;
 const second=take(paid.s,0,'BLC-4-026'),other=take(paid.s,0,'BLC-4-036');
 paid.s.players[0].hand.push(second,other);
 paid.s=play(paid.s,a=>a.type==='play'&&a.uid===second.uid&&a.line==='front');
 paid.s=play(paid.s,a=>a.type==='chooseDiscard'&&a.uid===other.uid);
 assert.equal(paid.s.pending,null);
 assert.equal(paid.s.players[0].outside.some(c=>c.uid===other.uid),true);
 let ura=phase(fresh(2366),'main');
 fuel(ura,4);readyAp(ura,2);
 const kisuke=take(ura,0,'BLC-2-015'),grimU=take(ura,0,'BLC-4-036');
 ura.players[0].hand.push(kisuke,grimU);
 setTop(ura,0,['BLC-2-021','BLC-2-062','BLC-2-044']);
 ura=play(ura,a=>a.type==='play'&&a.uid===kisuke.uid&&a.line==='front'&&a.slot===0);
 ura=play(ura,a=>a.type==='chooseTopFiltered'&&a.uid!==null);
 ura=orderBottom(ura);
 ura=play(ura,a=>a.type==='chooseDiscard'&&a.uid===grimU.uid);
 assert.equal(ura.pending.kind,'effect-pay-deploy-self');
 let named=phase(fresh(2367),'main');
 fuel(named,4);readyAp(named,3);
 const hime=take(named,0,'BLC-4-022'),grimN=take(named,0,'BLC-4-036');
 named.players[0].hand.push(hime,grimN);
 named=play(named,a=>a.type==='play'&&a.uid===hime.uid&&a.line==='front'&&a.slot===0);
 named=play(named,a=>a.type==='chooseDiscardGate'&&a.uid===grimN.uid);
 assert.equal(named.pending,null);
 assert.equal(named.players[0].outside.some(c=>c.uid===grimN.uid),true);
 assert.equal(universalEnergyByColor(packs,named,0).blue>=4,true);
 assert.equal(named.players[0].apCards.some(c=>c.ready),true);
});
