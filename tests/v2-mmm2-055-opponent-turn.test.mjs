import test from 'node:test';
import assert from 'node:assert/strict';
import {EXEDRA_CARDS} from '../dist/madoka-exedra-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalPublicView} from '../dist/universal-v2/engine.mjs';

const kmr=createKmrV2Pack();
const mmm=createMadokaV2Pack();
const packs=[kmr,mmm];

function countsFor(pack,required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(copies,2,4-caps[trigger]);
   caps[trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(trigger==='special'||trigger==='color'||trigger==='final')caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' for player '+p);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function acts(s){return legalUniversalActions(packs,s);}
function use(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(acts(s).slice(0,6)));
 return dispatchUniversalAction(packs,s,action);
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+(s.pending.kind||'')+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase+' at '+s.phase+' active '+s.active);
 }
 return s;
}
function passTo(s,player){
 let guard=0;
 while(s.active!==player){
  if(s.pending)throw Error('Pending '+(s.pending.kind||'')+' '+(s.pending.step||'')+' blocked the turn');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>16)throw Error('Did not reach player '+player+' at '+s.phase);
 }
 return s.phase==='main'?s:toPhase(s,'main');
}
function readyAp(s,p,n){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function locked(s,p){
 return (s.mainReadyOnceByName[p]||[]).includes('梓 みふゆ|revealed');
}

test('KMR-1-113 reveals MMM-2-055 on the opponent turn without starting it',()=>{
 const printed=EXEDRA_CARDS.find(c=>c.id==='MMM-2-055');
 assert.equal(printed.effectJa.includes('自分のターン中にこのカードが山札から公開された時'),true);
 assert.equal(printed.effectJa.includes('1ターンに1回のみ発動できる'),true);
 const kmrCounts=countsFor(kmr,['KMR-1-113','KMR-1-070','KMR-1-087']);
 const mmmCounts=countsFor(mmm,['MMM-2-055','MMM-2-051','MMM-2-042']);
 let s=toPhase(newUniversalMatch(packs,{decks:[kmrCounts,mmmCounts],seed:14055,first:0}),'main');
 put(s,0,'KMR-1-070','energy',0,true);
 put(s,0,'KMR-1-087','energy',1,true);
 const magius=put(s,1,'MMM-2-042','front',0,true);
 const shown=take(s,1,'MMM-2-055');
 s.players[1].deck.unshift(shown);
 const muse=take(s,0,'KMR-1-113');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(muse);
 readyAp(s,0,1);
 const bp=universalBp(packs,s,magius);
 s=use(s,a=>a.type==='play'&&a.uid===muse.uid&&a.line==='front'&&a.replaceUid==null);
 assert.equal(s.pending.step,'oppTop');
 assert.equal(s.pending.kind!=='mmm2',true);
 assert.equal(universalPublicView(packs,s,0).publicReveals.some(r=>r.uid===shown.uid&&r.cardId==='MMM-2-055'),true);
 assert.equal(universalPublicView(packs,s,1).publicReveals.some(r=>r.uid===shown.uid),true);
 assert.equal(locked(s,1),false);
 assert.equal(universalBp(packs,s,magius),bp);
 assert.ok(acts(s).some(a=>a.type==='kmr'&&a.mode==='top'));
 assert.ok(acts(s).some(a=>a.type==='kmr'&&a.mode==='outside'));
 s=use(s,a=>a.type==='kmr'&&a.mode==='top');
 assert.equal(s.pending,null);
 assert.equal(s.players[1].deck[0].uid,shown.uid);
 assert.equal(locked(s,1),false);
 assert.equal(universalBp(packs,s,magius),bp);
 assert.equal(assertUniversalMatch(packs,s),true);

 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[1].deck.push(...s.players[1].hand.splice(0));
 s=passTo(s,1);
 assert.equal(s.active,1);
 assert.equal(s.phase,'main');
 const first=put(s,1,'MMM-2-051','front',1,true);
 const second=put(s,1,'MMM-2-051','front',2,true);
 const ownTop=take(s,1,'MMM-2-055');
 s.players[1].deck.unshift(ownTop);
 readyAp(s,1,2);
 s=use(s,a=>a.type==='activate'&&a.uid===first.uid&&a.mode==='mmm2:0');
 assert.equal(s.pending.step,'u055');
 assert.equal(locked(s,1),true);
 assert.ok(acts(s).some(a=>a.mode==='skip'));
 s=use(s,a=>a.type==='mmm2'&&a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),bp);
 assert.equal(locked(s,1),true);
 assert.ok(s.players[1].hand.some(c=>c.uid===ownTop.uid));

 const again=take(s,1,'MMM-2-055');
 s.players[1].deck.unshift(again);
 s=use(s,a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='mmm2:0');
 assert.equal(s.pending,null);
 assert.equal(locked(s,1),true);
 assert.equal(universalBp(packs,s,s.players[1].front[0]),bp);
 assert.ok(s.players[1].hand.some(c=>c.uid===again.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('MMM-2-055 active life trigger readies one character',()=>{
 const counts=countsFor(mmm,['MMM-2-055','MMM-2-042']);
 const both=[mmm,mmm];
 let life=newUniversalMatch(both,{decks:[counts,counts],seed:14056,first:0});
 let guard=0;
 while(life.phase!=='attack'){
  if(life.pending)throw Error('Pending blocked attack');
  life=dispatchUniversalAction(both,life,{type:'next'});
  if(++guard>12)throw Error('attack '+life.phase);
 }
 const rested=put(life,1,'MMM-2-042','front',0,false);
 const attacker=put(life,0,'MMM-2-042','front',0,true);
 const trigger=take(life,1,'MMM-2-055');
 const filler=take(life,1,'MMM-2-042');
 life.players[1].deck.push(...life.players[1].life.splice(0));
 life.players[1].life.unshift(filler);
 life.players[1].life.unshift(trigger);
 life=dispatchUniversalAction(both,life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(both,life,legalUniversalActions(both,life).find(a=>a.type==='chooseBlock'&&a.uid===null));
 assert.equal(life.pending.trigger,'active');
 life=dispatchUniversalAction(both,life,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(life.players[1].front[0].ready,true);
 assert.equal(universalBp(both,life,life.players[1].front[0]),4500);
 assert.equal(life.pending,null);
 assert.equal(assertUniversalMatch(both,life),true);
});
