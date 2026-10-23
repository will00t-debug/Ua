import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,
 universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {SAO_Q1208_ASUNA_AURA,selectionHandDiscardTaxPlan}
 from '../dist/universal-v2/selection-hand-tax.mjs';
const pack=registeredV2TitlePack('sword-art-online');
const official=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-064');
const ids=['SAO-1-001','SAO-1-005','SAO-2-035','SAO-2-047','SAO-1-004',
 'SAO-1-019','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-068',
 'SAO-1-069','SAO-2-069','SAO-2-064'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function pull(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function put(s,p,id,line,slot){
 const c=pull(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function setup({pay=true,double=false,energy=false}={}){
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:46064});
 const k=put(s,0,'SAO-2-064','front',0);
 const asuna=put(s,0,'SAO-1-068',energy?'energy':'front',1);
 if(double)put(s,0,'SAO-2-064','front',3);
 const source=pull(s,1,'SAO-2-069');
 s.players[1].outside.push(...s.players[1].hand.splice(0));
 s.players[1].hand.push(source);
 if(pay)s.players[1].hand.push(pull(s,1,'SAO-1-001'));
 for(let i=0;i<4;i++)put(s,1,'SAO-1-068','energy',i);
 s.active=1;s.phase='main';s.players[1].ownTurns=2;
 for(const ap of s.players[1].apCards){ap.inPlay=true;ap.ready=true;}
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,k,asuna,source};
}
test('SAO-2-064 entire official printed stat/FRONT named nonstack aura/DRAW LIFE',()=>{
 assert.equal(official.number,'EX08BT/SAO-2-064');
 assert.deepEqual([official.nameJa,official.type,official.color,official.energy,
 official.ap,official.bp,official.gen,official.trigger,official.traits],
 ['キリト','character','green',4,1,4000,1,'draw',['ALO']]);
 assert.ok(official.effectJa.includes('〈アスナ〉'));
 assert.ok(official.effectJa.includes('重複しない'));
 const c=pack.cards['SAO-2-064'];
 assert.equal(c.implementation,'dsl');
 assert.deepEqual(c.selectionHandDiscardTax,{...SAO_Q1208_ASUNA_AURA});
 assert.deepEqual(c.effects,{});
});
test('Actual SAO-2-069 CHARACTER onPlay must physically pay to retire named Asuna',()=>{
 let {s,asuna,source}=setup();
 const a=legalUniversalActions(pack,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front');
 assert.ok(a);s=use(s,a);
 assert.equal(s.pending?.kind,'effect-retire-bp');
 const targeted=legalUniversalActions(pack,s).find(x=>x.type==='chooseRetireBp'&&x.uid===asuna.uid);
 assert.ok(targeted);
 s=use(s,targeted);
 assert.equal(s.pending?.kind,'effect-selection-hand-payment');
 assert.ok(s.players[0].front.some(c=>c?.uid===asuna.uid));
 const choices=legalUniversalActions(pack,s);
 assert.equal(choices.length,1);
 assert.equal(choices[0].type,'chooseSelectionTaxDiscard');
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(pack,s,{difficulty});
  assert.ok(choices.some(x=>JSON.stringify(x)===JSON.stringify(a)));
 }
 assert.equal(universalPrivateChoices(pack,s,0),null);
 assert.equal(universalPrivateChoices(pack,s,1)?.options?.length,1);
 s=use(JSON.parse(JSON.stringify(s)),choices[0]);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===asuna.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===choices[0].uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===choices[0].uid&&
  e.from==='hand'&&e.to==='outside'&&e.reason==='payment'));
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('No-hand SOURCE selection: Asuna unavailable, Kirito legal, zero-target optional',()=>{
 let {s,k,asuna,source}=setup({pay:false});
 const play=legalUniversalActions(pack,s).find(x=>x.type==='play'&&x.uid===source.uid);
 assert.ok(play);s=use(s,play);
 const choices=legalUniversalActions(pack,s);
 assert.ok(!choices.some(x=>x.uid===asuna.uid));
 assert.ok(choices.some(x=>x.uid===k.uid));
 assert.ok(choices.some(x=>x.uid===null));
 const old=structuredClone(s);
 assert.throws(()=>use(s,{type:'chooseRetireBp',uid:asuna.uid}),/not currently legal/);
 assert.deepEqual(s,old);
 s=use(s,{type:'chooseRetireBp',uid:null});
 assert.equal(s.pending,null);
});
test('Duplicate FRONT grant does not stack; moving/removing grantors correctly revokes aura',()=>{
 const {s,k,asuna}=setup({double:true});
 let p=selectionHandDiscardTaxPlan(pack,s,1,asuna.uid,'character');
 assert.equal(p.cost,1);assert.equal(p.sourceUids.length,2);
 s.players[0].front[0]=null;s.players[0].energy[0]=k;
 p=selectionHandDiscardTaxPlan(pack,s,1,asuna.uid,'event');
 assert.equal(p.sourceUids.length,1);
 const other=s.players[0].front[3];s.players[0].front[3]=null;
 s.players[0].outside.push(other);
 assert.equal(selectionHandDiscardTaxPlan(pack,s,1,asuna.uid,'event').cost,0);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('Own ENERGY Asuna receives exact printed-name tax, never self or enemy',()=>{
 const {s,asuna,k}=setup({energy:true});
 assert.equal(selectionHandDiscardTaxPlan(pack,s,1,asuna.uid,'event').cost,1);
 assert.equal(selectionHandDiscardTaxPlan(pack,s,1,k.uid,'event').cost,0);
 assert.equal(selectionHandDiscardTaxPlan(pack,s,0,s.players[1].energy[0].uid,'event').cost,0);
});
test('DRAW LIFE draws a genuine deck card, preserves public hidden-hand info',()=>{
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:46065});
 const k=pull(s,0,'SAO-2-064');s.players[0].outside.push(k);
 s.pending={kind:'life-trigger',player:0,uid:k.uid,trigger:'draw'};
 const choose=legalUniversalActions(pack,s).find(x=>x.type==='chooseTrigger'&&x.mode==='draw');
 assert.ok(choose);
 const old=s.players[0].hand.length;
 const after=use(s,choose);
 assert.equal(after.players[0].hand.length,old+1);
 assert.equal(after.pending,null);
 assert.equal(universalPublicView(pack,after,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(pack,after),true);
});
