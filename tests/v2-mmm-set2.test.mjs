import test from 'node:test';
import assert from 'node:assert/strict';
import {EXEDRA_CARDS} from '../dist/madoka-exedra-cards.mjs';
import {MADOKA_CARDS} from '../dist/madoka-cards.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {exedraEngineKind} from '../dist/universal-v2/mmm-exedra-kinds.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
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
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
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
function playFront(s,uid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&a.line==='front');
 if(!action)throw Error('No front play for '+uid);
 return use(s,action);
}

test('EX16BT registers all 73 playable identities on the shared pack',()=>{
 assert.equal(MADOKA_CARDS.length,113);
 assert.equal(EXEDRA_CARDS.length,73);
 assert.deepEqual(EXEDRA_CARDS.map(c=>c.id),Array.from({length:73},(_,i)=>'MMM-2-'+String(i+1).padStart(3,'0')));
 assert.equal(EXEDRA_CARDS.some(c=>c.rarity==='AP'||c.id.includes('AP')||/_p\d/.test(c.number)),false);
 assert.equal(Object.keys(pack.cards).length,186);
 assert.equal(pack.version,'mmm-ua31-ex16-20261029');
 assert.equal(V2_TITLE_IDS.includes('madoka'),false);
 const colors={};
 for(const card of EXEDRA_CARDS){
  assert.equal(card.effect,card.effectJa);
  assert.equal(card.name,card.nameJa);
  assert.equal(exedraEngineKind(card.effectJa),card.engineKind);
  assert.ok(pack.cards[card.id],card.id);
  colors[card.color]=(colors[card.color]||0)+1;
 }
 assert.equal(colors.green,44);
 assert.equal(colors.red,11);
 assert.equal(colors.yellow,10);
 assert.equal(colors.purple,8);
 assert.equal(pack.cards['MMM-2-060'].printedHandEnergyDiscount,2);
 assert.equal(pack.cards['MMM-2-060'].type,'event');
 assert.equal(pack.cards['MMM-2-069'].effects.onPlay[0].count,4);
 assert.equal(pack.cards['MMM-2-069'].effects.onPlay[0].noHandDiscard,true);
 assert.equal(EXEDRA_CARDS.find(c=>c.id==='MMM-2-001').faq[0].id,'Q2344');
 const green=Object.fromEntries(EXEDRA_CARDS.filter(c=>c.color==='green').slice(0,13).map((c,i)=>[c.id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,green),[]);
});

test('Q2346 bars Mami while another magical girl is on the field',()=>{
 const counts=countsFor(['MMM-2-007','MMM-2-042','MMM-1-003']);
 let s=toPhase(fresh(counts,2007),'main');
 readyAp(s);
 const fuel=[0,1].map(slot=>put(s,0,'MMM-1-003','energy',slot));
 assert.ok(fuel.every(c=>c.cardId==='MMM-1-003'));
 const other=put(s,0,'MMM-2-042','front',0);
 const mami=take(s,0,'MMM-2-007');
 s.players[0].hand.push(mami);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===mami.uid),false);
 s.players[0].front[0]=null;
 s.players[0].outside.push(other);
 const open=legalUniversalActions(packs,s).filter(a=>a.type==='play'&&a.uid===mami.uid);
 assert.ok(open.length>0);
 s=playFront(s,mami.uid);
 assert.equal(s.players[0].front.some(c=>c?.cardId==='MMM-2-007'),true);
 assertUniversalMatch(packs,s);
});

test('Q2344 can deploy the yellow girl just placed in the removed area',()=>{
 const counts=countsFor(['MMM-2-001','MMM-2-006','MMM-1-003']);
 let s=toPhase(fresh(counts,2001),'main');
 readyAp(s);
 put(s,0,'MMM-1-003','energy',0);
 put(s,0,'MMM-1-003','energy',1);
 put(s,0,'MMM-1-003','energy',2);
 const girl=take(s,0,'MMM-2-006');
 const madoka=take(s,0,'MMM-2-001');
 s.players[0].hand.push(girl,madoka);
 const handBefore=s.players[0].hand.length;
 s=playFront(s,madoka.uid);
 assert.equal(s.pending?.kind,'mmm2');
 assert.equal(s.pending.id,'MMM-2-001');
 assert.equal(s.players[0].hand.length,handBefore);
 const choose=s.pending.actions.find(a=>a.uid===girl.uid);
 assert.ok(choose);
 s=use(s,choose);
 assert.equal(s.players[0].removed.some(c=>c.uid===girl.uid),true);
 assert.equal(s.pending?.kind,'mmm2');
 const seat=s.pending.actions.find(a=>a.uid===girl.uid&&a.line==='front');
 assert.ok(seat);
 s=use(s,seat);
 const entered=s.players[0].front.find(c=>c?.uid===girl.uid);
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('MMM-2-045 gains 500 BP for every two opposing front characters',()=>{
 const counts=countsFor(['MMM-2-045','MMM-2-042']);
 const s=fresh(counts,2045);
 const self=put(s,0,'MMM-2-045','front',0);
 assert.equal(universalBp(packs,s,self),4000);
 put(s,1,'MMM-2-042','front',0);
 assert.equal(universalBp(packs,s,self),4000);
 put(s,1,'MMM-2-042','front',1);
 assert.equal(universalBp(packs,s,self),4500);
});

test('energy 1 on the revealed purple top sets both block floors',()=>{
 const counts=countsFor(['MMM-2-016','MMM-2-042','MMM-2-045','MMM-2-014']);
 let s=toPhase(fresh(counts,2016),'main');
 const attacker=put(s,0,'MMM-2-016','front',0,true);
 const low=put(s,1,'MMM-2-042','front',0,true);
 const high=put(s,1,'MMM-2-045','front',1,true);
 const purple=take(s,0,'MMM-2-014');
 assert.equal(pack.cards['MMM-2-014'].color,'purple');
 assert.equal(pack.cards['MMM-2-014'].energy,0);
 s.players[0].deck.unshift(purple);
 readyAp(s);
 const reveal=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===attacker.uid&&a.mode==='mmm2:1');
 assert.ok(reveal);
 s=use(s,reveal);
 assert.equal(s.pending?.id,'MMM-2-016');
 s=use(s,s.pending.actions.find(a=>a.mode==='top'));
 const live=s.players[0].front.find(c=>c?.uid===attacker.uid);
 assert.equal(live.mmm2Block.atLeast,4000);
 assert.equal(live.mmm2Block.atMost,2000);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock');
 assert.equal(blocks.some(a=>a.uid===low.uid),false);
 assert.equal(blocks.some(a=>a.uid===high.uid),false);
 assert.equal(blocks.some(a=>a.uid===null),true);
 assertUniversalMatch(packs,s);
});

test('face-up life stays public and is not a retirement',()=>{
 const counts=countsFor(['MMM-2-070','MMM-2-071']);
 let s=toPhase(fresh(counts,2070),'main');
 readyAp(s);
 const mover=put(s,0,'MMM-2-071','front',0,true);
 const life=s.players[0].life[0];
 assert.ok(life);
 const openLife=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===mover.uid&&a.mode==='mmm2:0');
 assert.ok(openLife);
 s=use(s,openLife);
 s=use(s,s.pending.actions.find(a=>a.uid===life.uid));
 assert.equal(s.players[0].hand.some(c=>c.uid===life.uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===life.uid),false);
 const sayaka=put(s,0,'MMM-2-070','front',1,true);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===sayaka.uid&&a.mode==='mmm2:0');
 assert.ok(act);
 const before=s.players[0].hand.length;
 s=use(s,act);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.players[0].life[0]?.uid,sayaka.uid);
 assert.equal(s.players[0].life[0].faceUp,true);
 assert.equal(s.players[0].front.some(c=>c?.uid===sayaka.uid),false);
 const view=universalPublicView(packs,s,1);
 assert.deepEqual(view.players[0].faceUpLife,[{uid:sayaka.uid,cardId:'MMM-2-070'}]);
 assert.equal(s.players[0].outside.some(c=>c.uid===sayaka.uid),false);
 assertUniversalMatch(packs,s);
});
