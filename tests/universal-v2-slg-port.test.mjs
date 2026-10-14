import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS,SOLO_LEVELING_MISSING_NUMBERS} from '../dist/solo-leveling.mjs';
import {TTG_CARDS} from '../dist/ttg-builder.mjs';
import {createSlgV2Pack,SLG_V2_VERIFIED_IDS} from '../dist/universal-v2/slg-pack.mjs';
import {createTtgV2Pack} from '../dist/universal-v2/ttg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const slg=createSlgV2Pack(),ttg=createTtgV2Pack(),packs=[ttg,slg];
const ttgDeck=Object.fromEntries(['001','005','009','014','019','042','043','047','049','051','064','065'].map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
const slgDeck=Object.fromEntries(['005','006','015','016','026','032','041','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-038']=2;
const fresh=(first=1)=>newUniversalMatch(packs,{decks:[ttgDeck,slgDeck],seed:51,first});
function take(s,player,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing physical '+id);
}
function advance(s,phase){
 while(s.phase!==phase){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 return s;
}
test('TTG 81 and SLG 80 normal official card IDs are unique and contiguous, excluding AP and variants',()=>{
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 assert.deepEqual(SOLO_LEVELING_MISSING_NUMBERS,[]);
 assert.equal(TTG_CARDS.length,81);
 for(const [cards,title,n] of [[SOLO_LEVELING_CARDS,'SLG',80],[TTG_CARDS,'TTG',81]]){
  const expected=Array.from({length:n},(_,i)=>title+'-1-'+String(i+1).padStart(3,'0'));
  assert.deepEqual(cards.map(c=>c.id).sort(),expected);
  assert.equal(new Set(cards.map(c=>c.id)).size,n);
  assert.ok(cards.every(c=>c.type!=='ap'&&c.type!=='action_point'&&!c.id.includes('-AP')));
 }
});
test('SLG 16 printed effect profiles do not equate to full 80-card migration and retain life trigger separately',()=>{
 assert.equal(SLG_V2_VERIFIED_IDS.length,16);
 assert.equal(Object.keys(slg.cards).length,16);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
 assert.equal(slg.cards['SLG-1-005'].implementation,'vanilla');
 assert.equal(slg.cards['SLG-1-005'].trigger,'draw');
 assert.equal(slg.cards['SLG-1-015'].trigger,'get');
 assert.equal(slg.cards['SLG-1-032'].impactNull,true);
 assert.equal(slg.cards['SLG-1-032'].trigger,'active');
 assert.equal(slg.cards['SLG-1-038'].effects.onPlay[0].op,'recoverAp');
 assert.equal(slg.cards['SLG-1-038'].trigger,'final');
 assert.ok(!slg.cards['SLG-1-019']&&!slg.cards['SLG-1-047'],'shared name once and re-Raid unsupported; never enable flags');
});
test('SLG-1-043 onPlay draw/discard targets own hand only, requires real AP and conserves UID',()=>{
 let s=fresh(),c=take(s,1,'SLG-1-043');s.players[1].hand.push(c);
 s=advance(s,'main');
 const apBefore=s.players[1].apCards.filter(x=>x.inPlay&&x.ready).length;
 const deckBefore=s.players[1].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line==='front');
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[1].deck.length,deckBefore-1);
 assert.equal(s.players[1].apCards.filter(x=>x.inPlay&&x.ready).length,apBefore-1);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'0-bad'}),/not currently legal/);
 const choose=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscard');
 s=dispatchUniversalAction(packs,s,choose);
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(x=>x.uid===choose.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-1-016 mandatory mill of two physical deck cards has no optional skip and IMPACT null',()=>{
 let s=fresh(),source=take(s,1,'SLG-1-016');
 for(let i=0;i<3;i++){
  const c=take(s,1,'SLG-1-015');c.ready=true;s.players[1].energy[i]=c;
 }
 s.players[1].hand.push(source);s=advance(s,'main');
 const deckBefore=s.players[1].deck.length,outsideBefore=s.players[1].outside.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[1].deck.length,deckBefore-2);
 assert.equal(s.players[1].outside.length,outsideBefore+2);
 assert.equal(s.pending,null);
 assert.equal(slg.cards['SLG-1-016'].impactNull,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-1-006 ACTIVE purple energy =2, REST purple energy =1, unrelated green unaffected',()=>{
 const s=fresh(),card=take(s,1,'SLG-1-006');s.players[1].energy[0]=card;card.ready=true;
 assert.equal(universalEnergyByColor(packs,s,1).purple,2);
 card.ready=false;assert.equal(universalEnergyByColor(packs,s,1).purple,1);
 assert.equal(universalEnergyByColor(packs,s,1).green||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('SLG-1-038 FINAL optional life trigger resolves as separate handler, replenishes precisely one life',()=>{
 let s=fresh(0),attack=take(s,0,'TTG-1-042'),flip=take(s,1,'SLG-1-038');
 attack.ready=true;s.players[0].front[0]=attack;
 const defender=s.players[1];
 defender.outside.push(...defender.life.splice(0,defender.life.length-1));
 defender.deck.push(defender.life.shift());
 defender.life.push(flip);
 s=advance(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attack.uid},{actor:0});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');assert.equal(s.pending?.trigger,'final');
 const options=legalUniversalActions(packs,s);
 assert.ok(options.some(a=>a.mode==='skip'));
 const choose=options.find(a=>a.mode==='final');assert.ok(choose);
 const deckBefore=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,choose,{actor:1});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].deck.length,deckBefore-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
