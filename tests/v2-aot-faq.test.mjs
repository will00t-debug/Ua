import test from 'node:test';
import assert from 'node:assert/strict';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {effectChoiceProtected} from '../dist/universal-v2/continuous-states.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalEnergyByColor, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];

function deck(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(2,4-caps[trigger]);
   caps[trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=add;
  total+=add;
 }
 assert.equal(total,50,Object.entries(counts).map(([id,n])=>id+':'+n).join(','));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function topLife(s,p,id){
 const card=take(s,p,id);
 const life=s.players[p].life;
 if(!life.length)life.push(card);
 else{
  const old=life[0];
  life[0]=card;
  s.players[p].deck.push(old);
 }
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play for '+uid+' '+(s.phase||''));
 return use(s,action);
}
function cast(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===uid);
 if(!action)throw Error('No event for '+uid);
 return use(s,action);
}
function pick(s,pred){
 const actions=legalUniversalActions(packs,s);
 const action=actions.find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(actions.slice(0,6)));
 return use(s,action);
}
function raidFront(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&
  a.baseUid===baseUid&&a.line!=='energy');
 if(!action)throw Error('No front raid for '+uid);
 return use(s,action);
}
function stackRaid(s,p,topId,underId,line,slot){
 const top=put(s,p,topId,line,slot,true);
 const under=take(s,p,underId);
 under.faceDown=false;
 under.ready=false;
 top.stack=[under];
 return top;
}
function apReadyCount(s,p=0){
 return s.players[p].apCards.filter(c=>c.ready).length;
}

test('Q980 the rested player draws when Hange rests a titan',()=>{
 const counts=deck(['AOT-1-003','AOT-1-002','AOT-1-071','AOT-1-013']);
 let s=toPhase(fresh(counts,980),'main');
 put(s,0,'AOT-1-002','energy',0,true);
 put(s,0,'AOT-1-002','energy',1,true);
 readyAp(s,0,1);
 const foe=put(s,1,'AOT-1-071','front',0,true);
 const hange=toHand(s,0,'AOT-1-003');
 const foeHand=s.players[1].hand.length,myHand=s.players[0].hand.length;
 s=play(s,hange.uid);
 assert.equal(s.pending.step,'restEither');
 s=pick(s,a=>a.mode==='rest'&&a.uid===foe.uid);
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.players[1].hand.length,foeHand+1);
 assert.equal(s.players[0].hand.length,myHand-1);
 assertUniversalMatch(packs,s);

 let own=toPhase(fresh(counts,9801),'main');
 put(own,0,'AOT-1-002','energy',0,true);
 put(own,0,'AOT-1-002','energy',1,true);
 readyAp(own,0,1);
 const mine=put(own,0,'AOT-1-013','front',0,true);
 const again=toHand(own,0,'AOT-1-003');
 const before=own.players[0].hand.length;
 own=play(own,again.uid);
 own=pick(own,a=>a.uid===mine.uid);
 assert.equal(own.players[0].front.find(c=>c?.uid===mine.uid).ready,false);
 assert.equal(own.players[0].hand.length,before);
 assertUniversalMatch(packs,own);
});

test('Q981 trigger immunity does not stop combat, and only trigger choices are blocked',()=>{
 const counts=deck(['AOT-1-010','AOT-1-002','AOT-1-001','AOT-1-009']);
 let s=toPhase(fresh(counts,981),'attack');
 put(s,0,'AOT-1-002','energy',0,true);
 const levi=put(s,0,'AOT-1-010','front',0,true);
 const ally=put(s,0,'AOT-1-001','front',1,true);
 readyAp(s,0,1);
 s=use(s,{type:'attack',uid:levi.uid});
 assert.equal(s.pending.step,'pay');
 s=pick(s,a=>a.mode==='pay');
 assert.equal(s.pending.step,'grant010');
 s=pick(s,a=>a.mode==='grant'&&a.uid===ally.uid);
 assert.equal(effectChoiceProtected(s,1,ally.uid,'trigger'),true);
 assert.equal(effectChoiceProtected(s,1,ally.uid,'character'),false);
 assert.equal(effectChoiceProtected(s,1,ally.uid,'event'),false);
 topLife(s,1,'AOT-1-009');
 assert.equal(s.pending.kind,'block');
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.kind,'life-trigger');
 const banned=legalUniversalActions(packs,s).filter(a=>a.mode==='colorBounce');
 assert.equal(banned.some(a=>a.uid===ally.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q982 a granted character returns at the end of the attack phase',()=>{
 const counts=deck(['AOT-1-099','AOT-1-095','AOT-1-083','AOT-1-003']);
 let s=toPhase(fresh(counts,982),'main');
 put(s,0,'AOT-1-095','energy',0,true);
 put(s,0,'AOT-1-083','energy',1,true);
 readyAp(s,0,1);
 const corps=toHand(s,0,'AOT-1-083');
 const gear=toHand(s,0,'AOT-1-099');
 s=cast(s,gear.uid);
 assert.equal(s.pending.step,'corps');
 s=pick(s,a=>a.uid===corps.uid&&a.line==='front');
 const entered=s.players[0].front.find(c=>c?.uid===corps.uid);
 assert.equal(entered.aotReturnHandAtAttackEnd.turn,s.turn);
 s=toPhase(s,'attack');
 assert.equal(s.players[0].front.some(c=>c?.uid===corps.uid),true);
 s=use(s,{type:'next'});
 assert.equal(s.players[0].front.some(c=>c?.uid===corps.uid),false);
 assert.equal(s.players[0].hand.some(c=>c.uid===corps.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===corps.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q983 Historia locks the event AP recover once, and the Ymir bonus stays separate',()=>{
 const counts=deck(['AOT-1-021','AOT-1-002','AOT-1-032','AOT-1-013']);
 let quiet=toPhase(fresh(counts,9830),'main');
 put(quiet,0,'AOT-1-002','energy',0,true);
 put(quiet,0,'AOT-1-002','energy',1,true);
 readyAp(quiet,0,1);
 const first=toHand(quiet,0,'AOT-1-021');
 quiet=play(quiet,first.uid);
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===first.uid),true);
 assertUniversalMatch(packs,quiet);

 let s=toPhase(fresh(counts,983),'main');
 put(s,0,'AOT-1-002','energy',0,true);
 put(s,0,'AOT-1-002','energy',1,true);
 put(s,0,'AOT-1-013','front',0,true);
 readyAp(s,0,3);
 const bomb=toHand(s,0,'AOT-1-032');
 s=cast(s,bomb.uid);
 assert.equal(s.pending,null);
 const actor=toHand(s,0,'AOT-1-021');
 s=play(s,actor.uid);
 assert.equal(s.pending.step,'ready');
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.mainReadyOnceByName[0].includes('AOT-1-021|event'),true);
 const second=toHand(s,0,'AOT-1-021');
 s=play(s,second.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c?.cardId==='AOT-1-021')),3000);
 assertUniversalMatch(packs,s);
});

test('Q984 Bertolt retires energy-0 enemies and blocks character or trigger choices',()=>{
 const counts=deck(['AOT-1-057','AOT-1-060','AOT-1-054','AOT-1-042','AOT-1-008','AOT-1-001','AOT-1-033']);
 let s=toPhase(fresh(counts,984),'main');
 put(s,0,'AOT-1-060','energy',0,true);
 put(s,0,'AOT-1-060','energy',1,true);
 put(s,0,'AOT-1-060','energy',2,true);
 put(s,0,'AOT-1-060','energy',3,true);
 const base=put(s,0,'AOT-1-054','front',0,true);
 const zero=put(s,1,'AOT-1-042','front',0,true);
 const other=put(s,1,'AOT-1-008','front',1,true);
 readyAp(s,0,1);
 const bert=toHand(s,0,'AOT-1-057');
 s=raidFront(s,bert.uid,base.uid);
 const landed=s.players[0].front.find(c=>c?.uid===bert.uid);
 assert.ok(landed);
 assert.equal(s.players[1].outside.some(c=>c.uid===zero.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===other.uid),true);
 assert.equal(effectChoiceProtected(s,1,landed.uid,'character'),true);
 assert.equal(effectChoiceProtected(s,1,landed.uid,'trigger'),true);
 assert.equal(effectChoiceProtected(s,1,landed.uid,'event'),false);
 assert.equal(effectChoiceProtected(s,1,landed.uid,'field'),false);
 const striker=put(s,0,'AOT-1-001','front',1,true);
 s=toPhase(s,'attack');
 topLife(s,1,'AOT-1-033');
 s=use(s,{type:'attack',uid:striker.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.trigger,'special');
 const specials=legalUniversalActions(packs,s).filter(a=>a.mode==='special');
 assert.equal(specials.some(a=>a.uid===landed.uid),false);
 assert.equal(specials.some(a=>a.uid===striker.uid),true);
 assertUniversalMatch(packs,s);
});

test('Q985 and Q997 overflow goes to removed, active player first, and stacks',()=>{
 const counts=deck(['AOT-1-057','AOT-1-113','AOT-1-001','AOT-1-005','AOT-1-007','AOT-1-012']);
 let s=toPhase(fresh(counts,985),'main');
 const mine=[put(s,0,'AOT-1-057','front',0),put(s,0,'AOT-1-001','front',1),
  put(s,0,'AOT-1-005','front',2),put(s,0,'AOT-1-007','front',3)];
 const theirs=[put(s,1,'AOT-1-113','front',0),put(s,1,'AOT-1-001','front',1),
  put(s,1,'AOT-1-005','front',2),put(s,1,'AOT-1-012','front',3)];
 s=use(s,{type:'next'});
 assert.equal(s.pending.id,'capacity');
 assert.equal(s.pending.player,0);
 const mineCut=mine[1];
 s=pick(s,a=>a.uid===mineCut.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===mineCut.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===mineCut.uid),false);
 assert.equal(s.pending.id,'capacity');
 assert.equal(s.pending.player,1);
 const foeCut=theirs[1];
 s=pick(s,a=>a.uid===foeCut.uid);
 assert.equal(s.players[1].removed.some(c=>c.uid===foeCut.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let stacked=toPhase(fresh(counts,997),'main');
 put(stacked,0,'AOT-1-057','front',0);
 put(stacked,0,'AOT-1-113','front',1);
 const extra=put(stacked,0,'AOT-1-001','front',2);
 const extra2=put(stacked,0,'AOT-1-005','front',3);
 stacked=use(stacked,{type:'next'});
 assert.equal(stacked.players[0].aotFrontLimit,2);
 assert.equal(stacked.pending.player,0);
 stacked=pick(stacked,a=>a.uid===extra.uid);
 assert.equal(stacked.pending.id,'capacity');
 stacked=pick(stacked,a=>a.uid===extra2.uid);
 assert.equal(stacked.pending,null);
 assert.equal(stacked.players[0].front.filter(Boolean).length,2);
 assert.equal(stacked.players[0].removed.filter(c=>c.uid===extra.uid||c.uid===extra2.uid).length,2);
 assertUniversalMatch(packs,stacked);
});

test('Q986 and Q996 selection AP applies to raided Reiner and always to the Armored Titan',()=>{
 const green=deck(['AOT-1-066','AOT-1-060','AOT-1-045','AOT-1-112','AOT-1-042']);
 let poor=toPhase(fresh(green,9860),'main');
 put(poor,0,'AOT-1-060','energy',0,true);
 put(poor,0,'AOT-1-060','energy',1,true);
 put(poor,0,'AOT-1-045','front',0,true);
 const armored=put(poor,1,'AOT-1-112','front',0,true);
 const small=put(poor,1,'AOT-1-042','front',1,true);
 readyAp(poor,0,1);
 poor=cast(poor,toHand(poor,0,'AOT-1-066').uid);
 let retires=legalUniversalActions(packs,poor).filter(a=>a.mode==='retire');
 assert.equal(retires.some(a=>a.uid===armored.uid),false);
 assert.equal(retires.some(a=>a.uid===small.uid),true);
 assertUniversalMatch(packs,poor);

 let paid=toPhase(fresh(green,9861),'main');
 put(paid,0,'AOT-1-060','energy',0,true);
 put(paid,0,'AOT-1-060','energy',1,true);
 put(paid,0,'AOT-1-045','front',0,true);
 const taxed=put(paid,1,'AOT-1-112','front',0,true);
 put(paid,1,'AOT-1-042','front',1,true);
 readyAp(paid,0,2);
 paid=cast(paid,toHand(paid,0,'AOT-1-066').uid);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.mode==='retire'&&a.uid===taxed.uid),true);
 paid=pick(paid,a=>a.uid===taxed.uid);
 assert.equal(apReadyCount(paid),0);
 assert.equal(paid.players[1].outside.some(c=>c.uid===taxed.uid),true);
 assertUniversalMatch(packs,paid);

 const blue=deck(['AOT-1-034','AOT-1-002','AOT-1-008','AOT-1-061','AOT-1-058','AOT-1-042']);
 let open=toPhase(fresh(blue,9862),'main');
 put(open,0,'AOT-1-002','energy',0,true);
 put(open,0,'AOT-1-002','energy',1,true);
 put(open,0,'AOT-1-008','front',0,true);
 const plain=put(open,1,'AOT-1-061','front',0,true);
 readyAp(open,0,1);
 open=cast(open,toHand(open,0,'AOT-1-034').uid);
 assert.equal(legalUniversalActions(packs,open).some(a=>a.mode==='retire'&&a.uid===plain.uid),true);
 assertUniversalMatch(packs,open);

 let raided=toPhase(fresh(blue,9863),'main');
 put(raided,0,'AOT-1-002','energy',0,true);
 put(raided,0,'AOT-1-002','energy',1,true);
 put(raided,0,'AOT-1-008','front',0,true);
 const hidden=stackRaid(raided,1,'AOT-1-061','AOT-1-058','front',0);
 put(raided,1,'AOT-1-042','front',1,true);
 readyAp(raided,0,1);
 raided=cast(raided,toHand(raided,0,'AOT-1-034').uid);
 assert.equal(legalUniversalActions(packs,raided).some(a=>a.uid===hidden.uid),false);
 assert.equal(legalUniversalActions(packs,raided).some(a=>a.mode==='retire'),true);
 assertUniversalMatch(packs,raided);
});

test('Q987 two green characters enter together when the energy line is full',()=>{
 const counts=deck(['AOT-1-064','AOT-1-061','AOT-1-038','AOT-1-060','AOT-1-035','AOT-1-039','AOT-1-054']);
 let s=toPhase(fresh(counts,987),'main');
 const reiner=put(s,0,'AOT-1-060','energy',0,true);
 const side=put(s,0,'AOT-1-035','energy',1,true);
 put(s,0,'AOT-1-039','energy',2,true);
 put(s,0,'AOT-1-060','energy',3,true);
 readyAp(s,0,2);
 const armor=toHand(s,0,'AOT-1-061');
 const rod=toHand(s,0,'AOT-1-038');
 while(s.players[0].deck.length)s.players[0].removed.push(s.players[0].deck.pop());
 s=cast(s,toHand(s,0,'AOT-1-064').uid);
 assert.equal(s.pending.step,'pair64');
 s=pick(s,a=>a.mode==='raid'&&a.line==='energy'&&a.baseUid===reiner.uid&&a.uid===armor.uid);
 assert.equal(s.pending.step,'pair64');
 s=pick(s,a=>a.uid===rod.uid&&a.key==='play');
 assert.equal(s.pending.step,'removeEnergy');
 assert.equal(s.players[0].energy.some(c=>c?.uid===armor.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===armor.uid),false);
 s=pick(s,a=>a.uid===side.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===side.uid),true);
 assert.equal(s.players[0].energy.some(c=>c?.uid===rod.uid),true);
 assert.equal(s.pending.step,'moveFront');
 s=pick(s,a=>a.mode==='dest'&&a.line==='front');
 assert.equal(s.players[0].front.some(c=>c?.uid===armor.uid&&c.ready),true);
 assert.equal(s.players[0].energy.some(c=>c?.uid===rod.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Q988 the returned Armin may be the discarded energy-1 red Armin',()=>{
 const counts=deck(['AOT-1-076','AOT-1-001','AOT-1-009']);
 let s=toPhase(fresh(counts,988),'attack');
 const armin=put(s,0,'AOT-1-076','front',0,true);
 const striker=put(s,0,'AOT-1-001','front',1,true);
 s.players[0].deck.push(...s.players[0].hand);
 s.players[0].hand.length=0;
 topLife(s,1,'AOT-1-009');
 s=use(s,{type:'attack',uid:striker.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.kind,'life-trigger');
 s=pick(s,a=>a.mode==='colorBounce'&&a.uid===armin.uid);
 assert.equal(s.pending.step,'armin');
 assert.equal(s.players[0].hand.some(c=>c.uid===armin.uid),true);
 s=pick(s,a=>a.mode==='discard'&&a.uid===armin.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===armin.uid),true);
 assert.equal(s.players[0].hand.length>=2,true);
 assertUniversalMatch(packs,s);
});

test('Q989 and Q990 BP-range bonus stacks once, and a choiceless selection keeps it',()=>{
 const counts=deck(['AOT-1-077','AOT-1-095','AOT-1-034','AOT-1-010','AOT-1-061','AOT-1-057','AOT-1-001','AOT-1-002','AOT-1-090']);
 let kept=toPhase(fresh(counts,989),'main');
 put(kept,0,'AOT-1-095','energy',0,true);
 put(kept,0,'AOT-1-090','energy',1,true);
 put(kept,0,'AOT-1-002','energy',2,true);
 put(kept,0,'AOT-1-002','energy',3,true);
 put(kept,0,'AOT-1-001','front',0,true);
 readyAp(kept,0,2);
 const wall=put(kept,1,'AOT-1-010','front',0,true);
 const huge=put(kept,1,'AOT-1-061','front',1,true);
 const first=toHand(kept,0,'AOT-1-077');
 kept=play(kept,first.uid);
 assert.equal(kept.pending.step,'fork77');
 kept=pick(kept,a=>a.mode==='range');
 assert.equal(kept.aotBpRange[0],1000);
 kept=use(kept,{type:'activate',uid:first.uid,mode:'aot:AOT-1-077'});
 assert.equal(kept.pending.step,'fork77');
 kept=pick(kept,a=>a.mode==='buffMode');
 kept=pick(kept,a=>a.mode==='skip');
 assert.equal(kept.aotBpRange[0],1000);
 kept=cast(kept,toHand(kept,0,'AOT-1-034').uid);
 assert.equal(kept.aotBpRange[0],0);
 assert.equal(kept.pending.data.limit,4000);
 assert.equal(legalUniversalActions(packs,kept).some(a=>a.uid===wall.uid),true);
 assert.equal(legalUniversalActions(packs,kept).some(a=>a.uid===huge.uid),false);
 assertUniversalMatch(packs,kept);

 let doubled=toPhase(fresh(counts,990),'main');
 put(doubled,0,'AOT-1-095','energy',0,true);
 put(doubled,0,'AOT-1-090','energy',1,true);
 put(doubled,0,'AOT-1-002','energy',2,true);
 put(doubled,0,'AOT-1-002','energy',3,true);
 readyAp(doubled,0,2);
 const five=put(doubled,1,'AOT-1-061','front',0,true);
 const six=put(doubled,1,'AOT-1-057','front',1,true);
 const armin=toHand(doubled,0,'AOT-1-077');
 doubled=play(doubled,armin.uid);
 doubled=pick(doubled,a=>a.mode==='range');
 doubled=use(doubled,{type:'activate',uid:armin.uid,mode:'aot:AOT-1-077'});
 doubled=pick(doubled,a=>a.mode==='range');
 assert.equal(doubled.aotBpRange[0],2000);
 doubled=cast(doubled,toHand(doubled,0,'AOT-1-034').uid);
 assert.equal(doubled.aotBpRange[0],0);
 assert.equal(doubled.pending.data.limit,5000);
 assert.equal(legalUniversalActions(packs,doubled).some(a=>a.uid===five.uid),true);
 assert.equal(legalUniversalActions(packs,doubled).some(a=>a.uid===six.uid),false);
 assertUniversalMatch(packs,doubled);
});

test('Q991 Armin can replay onPlay on the turn he entered',()=>{
 const counts=deck(['AOT-1-077','AOT-1-095','AOT-1-001','AOT-1-090']);
 let s=toPhase(fresh(counts,991),'main');
 put(s,0,'AOT-1-095','energy',0,true);
 put(s,0,'AOT-1-090','energy',1,true);
 readyAp(s,0,1);
 const armin=toHand(s,0,'AOT-1-077');
 s=play(s,armin.uid);
 s=pick(s,a=>a.mode==='range');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===armin.uid),true);
 s=use(s,{type:'activate',uid:armin.uid,mode:'aot:AOT-1-077'});
 assert.equal(s.pending.id,'AOT-1-077');
 assert.equal(s.pending.step,'fork77');
 assertUniversalMatch(packs,s);
});

test('Q992 and Q993 Eren may deploy after an optional tuck, including when the tuck opens the slot',()=>{
 const counts=deck(['AOT-1-092','AOT-1-090','AOT-1-095','AOT-1-075','AOT-1-076','AOT-1-083','AOT-1-079']);
 let full=toPhase(fresh(counts,992),'main');
 put(full,0,'AOT-1-095','energy',0,true);
 put(full,0,'AOT-1-079','energy',1,true);
 const base=put(full,0,'AOT-1-090','front',0,true);
 const tucked=put(full,0,'AOT-1-075','front',1,true);
 put(full,0,'AOT-1-076','front',2,true);
 put(full,0,'AOT-1-083','front',3,true);
 readyAp(full,0,1);
 const eren=toHand(full,0,'AOT-1-092');
 const recruit=toHand(full,0,'AOT-1-079');
 full=raidFront(full,eren.uid,base.uid);
 full=toPhase(full,'attack');
 full=use(full,{type:'attack',uid:eren.uid});
 assert.equal(full.pending.step,'tuck92');
 full=pick(full,a=>a.mode==='tuck'&&a.uid===tucked.uid);
 assert.equal(full.players[0].deck[0].uid,tucked.uid);
 assert.equal(full.pending.step,'corps');
 full=pick(full,a=>a.uid===recruit.uid);
 assert.equal(full.players[0].front.some(c=>c?.uid===recruit.uid),true);
 assert.equal(full.players[0].front.find(c=>c?.uid===recruit.uid).aotReturnHandAtAttackEnd.turn,full.turn);
 assertUniversalMatch(packs,full);

 let open=toPhase(fresh(counts,993),'main');
 put(open,0,'AOT-1-095','energy',0,true);
 const host=put(open,0,'AOT-1-090','energy',1,true);
 readyAp(open,0,1);
 const raider=toHand(open,0,'AOT-1-092');
 const extra=toHand(open,0,'AOT-1-075');
 open=raidFront(open,raider.uid,host.uid);
 open=toPhase(open,'attack');
 open=use(open,{type:'attack',uid:raider.uid});
 assert.equal(open.pending.step,'tuck92');
 open=pick(open,a=>a.mode==='skip');
 assert.equal(open.pending.step,'corps');
 open=pick(open,a=>a.uid===extra.uid);
 assert.equal(open.players[0].front.some(c=>c?.uid===extra.uid),true);
 assertUniversalMatch(packs,open);
});

test('Q994 a SPECIAL trigger sends its card to hand instead of retiring the granted Titan',()=>{
 const counts=deck(['AOT-1-096','AOT-1-095','AOT-1-093','AOT-1-090','AOT-1-001','AOT-1-033']);
 let s=toPhase(fresh(counts,994),'main');
 put(s,0,'AOT-1-095','energy',0,true);
 put(s,0,'AOT-1-090','energy',1,true);
 put(s,0,'AOT-1-090','energy',2,true);
 const eren=stackRaid(s,0,'AOT-1-093','AOT-1-090','front',0);
 readyAp(s,0,2);
 s=cast(s,toHand(s,0,'AOT-1-096').uid);
 assert.equal(s.pending.step,'special96');
 s=pick(s,a=>a.mode==='grant'&&a.uid===eren.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===eren.uid).aotSpecialReplace.turn,s.turn);
 const striker=put(s,0,'AOT-1-001','front',1,true);
 s=toPhase(s,'attack');
 topLife(s,1,'AOT-1-033');
 s=use(s,{type:'attack',uid:striker.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.trigger,'special');
 s=pick(s,a=>a.mode==='special'&&a.uid===eren.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===eren.uid),true);
 assert.equal(s.players[1].hand.some(c=>c.cardId==='AOT-1-033'),true);
 assert.equal(s.players[1].outside.some(c=>c.cardId==='AOT-1-033'),false);
 assertUniversalMatch(packs,s);
});

test('Q995 Eren draws on the raid, and the life main is once per name',()=>{
 const counts=deck(['AOT-1-107','AOT-1-090','AOT-1-095']);
 let s=toPhase(fresh(counts,995),'main');
 put(s,0,'AOT-1-095','energy',0,true);
 put(s,0,'AOT-1-090','energy',1,true);
 const base=put(s,0,'AOT-1-090','front',0,true);
 readyAp(s,0,1);
 const eren=toHand(s,0,'AOT-1-107');
 const before=s.players[0].deck.length;
 s=raidFront(s,eren.uid,base.uid);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.mainReadyOnceByName[0].some(k=>k.includes('AOT-1-107')),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===eren.uid),true);
 const life=s.players[0].life[0];
 s=use(s,{type:'activate',uid:eren.uid,mode:'aot:AOT-1-107'});
 assert.equal(s.pending.step,'lifeOut');
 s=pick(s,a=>a.uid===life.uid);
 if(s.pending?.step==='ready')s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[0].outside.some(c=>c.uid===life.uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===eren.uid),false);
 assertUniversalMatch(packs,s);
});

test('Mikasa damage cannot let the opponent activate an ACTIVE trigger',()=>{
 const counts=deck(['AOT-1-025','AOT-1-002','AOT-1-001']);
 let s=toPhase(fresh(counts,1025),'attack');
 const mikasa=put(s,0,'AOT-1-025','front',0,true);
 const ally=put(s,1,'AOT-1-001','front',0,true);
 topLife(s,1,'AOT-1-001');
 s=use(s,{type:'attack',uid:mikasa.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.trigger,'active');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='active'),false);
 s=pick(s,a=>a.mode==='skip');
 assert.equal((ally.buffs||[]).some(b=>b.bp===3000),false);
 assertUniversalMatch(packs,s);
});

function lifeRaid(seed,energyIds){
 const counts=deck(['AOT-1-094','AOT-1-102','AOT-1-090','AOT-1-079','AOT-1-001']);
 let s=toPhase(fresh(counts,seed),'attack');
 energyIds.forEach((id,slot)=>put(s,1,id,'energy',slot,true));
 const base=put(s,1,'AOT-1-090','front',0,true);
 topLife(s,1,'AOT-1-094');
 const attacker=put(s,0,'AOT-1-001','front',0,true);
 readyAp(s,0,1);
 s=use(s,{type:'attack',uid:attacker.uid});
 if(s.pending?.step==='pay')s=pick(s,a=>a.mode==='pay');
 assert.equal(s.pending.kind,'block');
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.player,1);
 return {s,base};
}

test('life RAID of eight-cost Eren follows printed red energy',()=>{
 const short=lifeRaid(10946,['AOT-1-102','AOT-1-102','AOT-1-090','AOT-1-079']);
 assert.equal(universalEnergyByColor(packs,short.s,1).red,6);
 assert.equal(universalPublicView(packs,short.s,1).players[1].energyByColor.red,6);
 assert.equal(legalUniversalActions(packs,short.s).some(a=>a.mode==='raid'),false);
 assert.equal(legalUniversalActions(packs,short.s).some(a=>a.mode==='get'),true);
 assert.throws(()=>use(short.s,{type:'chooseTrigger',mode:'raid',baseUid:short.base.uid,line:'front',slot:0}),
  /not currently legal/);
 const enough=lifeRaid(10948,['AOT-1-102','AOT-1-102','AOT-1-102','AOT-1-102']);
 assert.equal(universalEnergyByColor(packs,enough.s,1).red,8);
 const raid=legalUniversalActions(packs,enough.s).find(a=>a.mode==='raid'&&a.baseUid===enough.base.uid);
 assert.ok(raid);
 enough.s=use(enough.s,raid);
 assert.equal(enough.s.players[1].front.some(c=>c?.cardId==='AOT-1-094'),true);
 assertUniversalMatch(packs,short.s);
 assertUniversalMatch(packs,enough.s);
});
