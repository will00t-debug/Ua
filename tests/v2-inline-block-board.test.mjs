import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {inlineBlockDecision,attackKeywordBadges,frontAttackKeywordBadges} from '../dist/universal-v2/preview-actions.mjs';

const unit=(id,bp=3000,extra={})=>({id,name:id,type:'character',color:'yellow',
 energy:0,ap:1,bp,gen:1,implementation:'vanilla',...extra});
const cards=[unit('attacker',4000,{implementation:'dsl',printedAttackDamage:2,
 printedImpact:1,blockBpRestriction:{relation:'atLeast',bp:4000,condition:null}}),
 unit('mandatory',3000,{implementation:'dsl',mustBlock:true}),
 unit('small'),unit('too-big',5000),unit('rested'),unit('energy'),
 ...Array.from({length:7},(_,i)=>unit('filler-'+i))];
const pack=createUniversalPack({id:'inline-block-board',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){
 for(const zone of ['deck','hand','life']){
  const pool=s.players[p][zone],index=pool.findIndex(c=>c.cardId===id);
  if(index>=0)return pool.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function open({mandatory=false,noReady=false,withoutAttack=false}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:1,seed:291029});
 const put=(p,line,index,id,ready=true)=>{
  const card=take(s,p,id);card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[p][line][index]=card;return card;
 };
 const attacker=put(1,'front',0,'attacker');
 const small=put(0,'front',0,mandatory?'mandatory':'small',!noReady);
 const high=put(0,'front',1,'too-big',!noReady);
 const rested=put(0,'front',2,'rested',false);
 const energy=put(0,'energy',0,'energy');
 s.phase='attack';
 if(!withoutAttack)s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:1});
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,attacker,small,high,rested,energy};
}

test('inline blockers follow genuine BP and readiness restrictions, not all own cards',()=>{
 const {s,attacker,small,high,rested,energy}=open();
 const view=universalPublicView(packs,s,0),legal=legalUniversalActions(packs,s);
 const decision=inlineBlockDecision(view,legal);
 assert.equal(view.players[1].front[0].ready,false,'attack declaration already rests the attacker');
 assert.equal(decision.battle.uid,attacker.uid);
 assert.equal(decision.battle.damage,2);
 assert.equal(decision.battle.impact,1);
 assert.deepEqual(decision.blockers.map(a=>a.uid),[small.uid]);
 assert.equal(decision.blockers[0],legal.find(a=>a.uid===small.uid),'retain exact reducer action');
 for(const card of [high,rested,energy])assert.ok(!decision.blockers.some(a=>a.uid===card.uid));
 assert.equal(decision.skipAction,legal.find(a=>a.uid===null));
 assert.equal(view.players[1].hand,null);
 const after=dispatchUniversalAction(packs,s,decision.blockers[0],{actor:0});
 assert.equal(assertUniversalMatch(packs,after),true);
 assert.equal(after.blocksByUid[small.uid],1);
 assert.ok(after.players[0].outside.some(c=>c.uid===small.uid));
 assert.equal(inlineBlockDecision(universalPublicView(packs,after,0),legalUniversalActions(packs,after)),null);
});

test('no eligible blockers still offers the real decline action and resolves damage',()=>{
 const {s}=open({noReady:true});
 const decision=inlineBlockDecision(universalPublicView(packs,s,0),legalUniversalActions(packs,s));
 assert.deepEqual(decision.blockers,[]);
 assert.deepEqual(decision.skipAction,{type:'chooseBlock',uid:null});
 const lifeBefore=s.players[0].life.length;
 const after=dispatchUniversalAction(packs,s,decision.skipAction,{actor:0});
 assert.equal(after.players[0].life.length,lifeBefore-2);
 assert.equal(assertUniversalMatch(packs,after),true);
 assert.equal(inlineBlockDecision(universalPublicView(packs,after,0),legalUniversalActions(packs,after)),null);
});

test('mandatory block never invents a decline button',()=>{
 const {s}=open({mandatory:true});
 const decision=inlineBlockDecision(universalPublicView(packs,s,0),legalUniversalActions(packs,s));
 assert.equal(decision.blockers.length,1);
 assert.equal(decision.skipAction,null);
});

test('inline controls do not appear for the attacker or unrelated pending effects',()=>{
 const {s}=open();
 const view=universalPublicView(packs,s,0),legal=legalUniversalActions(packs,s);
 assert.equal(inlineBlockDecision(universalPublicView(packs,s,1),legal,1),null);
 assert.equal(inlineBlockDecision({...view,pending:{kind:'life-trigger',player:0}},legal),null);
 assert.equal(inlineBlockDecision({...view,battle:null},legal),null);
 assert.equal(inlineBlockDecision({...view,battle:{...view.battle,uid:'foreign'}},legal),null);
 assert.equal(inlineBlockDecision(view,[]),null);
});

test('gold keyword badges reflect public combat damage and impact, but omit ordinary attacks',()=>{
 const {s}=open();
 const battle=universalPublicView(packs,s,0).battle;
 assert.deepEqual(attackKeywordBadges(battle),[
  {type:'damage',text:'直傷2'},{type:'impact',text:'衝擊1'}
 ]);
 assert.deepEqual(attackKeywordBadges({damage:1,impact:0}),[]);
 assert.deepEqual(attackKeywordBadges({damage:3,impact:2}),[
  {type:'damage',text:'直傷3'},{type:'impact',text:'衝擊2'}
 ]);
 assert.deepEqual(attackKeywordBadges({damage:2,impact:0}),[{type:'damage',text:'直傷2'}]);
 assert.deepEqual(attackKeywordBadges(null),[]);
});

test('gold labels are appended outside REST-rotating face and displayed in the center row',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const script=read('dist/universal-v2-preview.mjs');
 const css=read('dist/universal-v2-block.css');
 assert.ok(script.includes("btnSlot.append(face);\n  // Visible FRONT keywords persist"));
 assert.ok(script.includes("class:'v2-attack-keywords v2-attack-keywords-card'"));
 assert.ok(script.includes("class:'v2-block-battle-meta'"));
 assert.ok(css.includes('.slot.v2-has-attack-keywords .v2-attack-keywords-card{'));
 assert.ok(css.includes('background:linear-gradient(180deg,#fff79b'));
});

test('frontline gold keywords are visible before attack declaration, including REST cards',()=>{
 const {s,attacker}=open({withoutAttack:true});
 const view=universalPublicView(packs,s,0);
 assert.equal(view.battle,null,'no pending block means the prior UI displayed no keywords');
 assert.equal(view.players[1].front[0].ready,true);
 assert.deepEqual(frontAttackKeywordBadges(packs,s,1,0),[
  {type:'damage',text:'直傷2'},{type:'impact',text:'衝擊1'}
 ]);
 s.players[1].front[0].ready=false;
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.deepEqual(frontAttackKeywordBadges(packs,s,1,0),[
  {type:'damage',text:'直傷2'},{type:'impact',text:'衝擊1'}
 ],'REST must not hide publicly visible attack abilities');
 assert.deepEqual(frontAttackKeywordBadges(packs,s,0,0),[]);
 assert.deepEqual(frontAttackKeywordBadges(packs,s,1,3),[]);
 assert.deepEqual(frontAttackKeywordBadges(packs,s,1,7),[]);
 assert.equal(attacker.cardId,'attacker');
});

test('persistent field badges use canonical V2 combat values, not card-art text',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const script=read('dist/universal-v2-preview.mjs');
 const actions=read('dist/universal-v2/preview-actions.mjs');
 assert.match(script,/frontAttackKeywordBadges\(app\.packs,app\.state,side,index\)/);
 assert.match(script,/v2-has-attack-keywords/);
 assert.match(actions,/universalAttackDamage\(packs,state,front\)/);
 assert.match(actions,/universalImpact\(packs,state,front\)/);
 assert.doesNotMatch(script,/const attackBadges=attacking\?/);
});
