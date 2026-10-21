import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';

const pack=registeredV2TitlePack('solo-leveling'),packs=[pack,pack];
const ids=['001','002','005','006','010','012','015','016','026','032','041','043','045'];
const deck=Object.fromEntries(ids.map((id,i)=>['SLG-1-'+id,i===12?2:4]));
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:2002});
function take(s,owner,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[owner][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical fixture '+id);
}
function main(s,p= packs){
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(p,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function enter(sourceId='SLG-1-002',other=false){
 let s=fresh();
 let ally=null;
 if(other){ally=take(s,0,'SLG-1-005');ally.ready=true;s.players[0].energy[0]=ally;}
 const source=take(s,0,sourceId);s.players[0].hand.push(source);
 s=main(s);
 const ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play,'printed zero-purple source must be playable using real registry');
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(ap-s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,1,
  'normal printed AP charged ONCE before mode choice');
 assert.equal(s.pending?.kind,'effect-choice-mode');
 return {s,source,ally,ap};
}
test('SLG-1-002 Japanese source exact characteristics, both branch effects and DRAW trigger retained',()=>{
 const src=SOLO_LEVELING_CARDS.find(x=>x.id==='SLG-1-002'),c=pack.cards['SLG-1-002'];
 assert.ok(src&&src.source.includes('UA51BT'));
 assert.equal(src.nameJa,'朝比奈 りん');
 assert.deepEqual([c.color,c.energy,c.ap,c.bp,c.gen,c.trigger,c.type],
  ['purple',0,1,500,1,'draw','character']);
 assert.deepEqual(c.effects.onPlay.map(x=>x.op),['chooseOne']);
 const profile=c.effects.onPlay[0];
 assert.equal(profile.optional,false);
 assert.deepEqual(profile.options.map(x=>x.id),['drawDiscard','buffOther']);
 assert.deepEqual(profile.options[0].then,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(profile.options[1].then,[{op:'buffOwnField',
  filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]);
 assert.equal(pack.cards['SLG-1-025']?.trigger,'active',
  'other choice-mode candidate is now independently source-verified');
 assert.ok(Object.isFrozen(profile.options[0].then),'nested branches cannot be mutated');
});
test('choose draw/discard: AP charged once, draw occurs BEFORE mandatory UID discard, never BP buff',()=>{
 let {s,source}=enter('SLG-1-002',true);
 const original=structuredClone(s),deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 const options=legalUniversalActions(packs,s);
 assert.deepEqual(options,[{type:'chooseEffectMode',mode:'drawDiscard'},
  {type:'chooseEffectMode',mode:'buffOther'}],'printed choose ONE never offers skip');
 const label=uiActionLabel(options[0],{pack:packs,state:s});
 assert.match(label,/抽一張/);
 assert.match(V2_PENDING_LABELS['effect-choice-mode'],/選擇/);
 const first=dispatchUniversalAction(packs,s,options[0],{actor:0});
 assert.deepEqual(s,original,'reducer never mutates source');
 s=first;
 assert.equal(s.players[0].deck.length,deckBefore-1,'draw first');
 assert.equal(s.players[0].hand.length,handBefore+1);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),2000,
  'draw branch cannot leak buff branch');
 const discard=legalUniversalActions(packs,s)[0];
 assert.equal(discard.type,'chooseDiscard');
 const removed=s.players[0].hand.find(x=>x.uid===discard.uid);
 const outBefore=s.players[0].outside.length;
 s=dispatchUniversalAction(packs,s,discard);
 assert.equal(s.players[0].outside.length,outBefore+1);
 assert.ok(s.players[0].outside.some(x=>x.uid===removed.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('own-turn BP mode: choose OTHER active field character, no draw/discard, finite turn duration',()=>{
 let {s,source,ally}=enter('SLG-1-002',true);
 const hand=s.players[0].hand.length,deckCount=s.players[0].deck.length,
  outside=s.players[0].outside.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'buffOther'});
 assert.equal(s.pending?.kind,'effect-buff-own');
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseOwnBuff',uid:null},
  {type:'chooseOwnBuff',uid:ally.uid}]);
 assert.ok(!legalUniversalActions(packs,s).some(x=>x.uid===source.uid),
  'source itself cannot get OTHER character boost');
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),3000);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),500);
 assert.equal(s.players[0].hand.length,hand);assert.equal(s.players[0].deck.length,deckCount);
 assert.equal(s.players[0].outside.length,outside);assert.equal(s.pending,null);
 s.turn++;
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),2000,
  'temporary buff expires; it is not a persistent continuous modifier');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('no eligible OTHER character: mode remains legal because choose UP TO 1, resolves zero without draw',()=>{
 let {s}=enter();
 assert.deepEqual(legalUniversalActions(packs,s).map(x=>x.mode),['drawDiscard','buffOther']);
 const n=s.players[0].deck.length,ap=s.players[0].apCards.filter(x=>x.ready&&x.inPlay).length;
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'buffOther'});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,n);
 assert.equal(s.players[0].apCards.filter(x=>x.ready&&x.inPlay).length,ap);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('wrong actor, forged mode, mode with injected UID, replay cannot alter or double-pay',()=>{
 let {s}=enter('SLG-1-002',true);
 const original=structuredClone(s);
 const choose={type:'chooseEffectMode',mode:'buffOther'};
 assert.throws(()=>dispatchUniversalAction(packs,s,choose,{actor:1}),/Wrong player turn/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'notPrinted'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{...choose,uid:'1-forged'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'skip'}),/not currently legal/);
 assert.deepEqual(s,original);
 s=dispatchUniversalAction(packs,s,choose,{actor:0});
 assert.throws(()=>dispatchUniversalAction(packs,s,choose),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnBuff',uid:'1-foreign'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('public privacy: opponent sees no hand identities, pending branch IDs, or deck order',()=>{
 const {s}=enter();const view=universalPublicView(packs,s,1);
 assert.equal(view.players[0].hand,null);
 assert.equal(view.players[0].deckCount,s.players[0].deck.length);
 assert.equal(view.pending.kind,'effect-choice-mode');
 assert.deepEqual(Object.keys(view.pending).sort(),['kind','player']);
 assert.ok(!JSON.stringify(view).includes('drawDiscard'),'branch metadata not exported');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('AI uses exact V2 legal mode/target/discard and does not run competing branch',()=>{
 let {s}=enter('SLG-1-002',true);
 const legal=legalUniversalActions(packs,s),act=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(legal.some(x=>JSON.stringify(x)===JSON.stringify(act)));
 const before=structuredClone(s);
 s=dispatchUniversalAction(packs,s,act);
 assert.ok(!s.pending||s.pending.kind==='effect-buff-own'||s.pending.kind==='effect-discard');
 for(let i=0;i<5&&s.pending;i++){
  const next=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(next)));
  s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.notDeepEqual(s,before);
});
test('strict nested mode schema rejects unknown choices/fields/ops and duplicate IDs',()=>{
 const original={id:'QA-002',name:'qa',color:'purple',energy:0,ap:1,bp:500,gen:1,
  type:'character',implementation:'dsl'};
 const a={id:'drawA',label:'抽1',turn:'any',then:[{op:'draw',count:1}]},
  b={id:'buffB',label:'BP',turn:'own',then:[{op:'buffSelf',bp:500}]};
 const mk=(options,optional=false)=>createUniversalPack({id:'qa-schema',cards:[
  {...original,effects:{onPlay:[{op:'chooseOne',optional,options}]}}]});
 assert.deepEqual(mk([a,b]).cards['QA-002'].effects.onPlay[0].options.map(x=>x.id),['drawA','buffB']);
 const invalid=[
  [{...a,unknown:'no'},b],
  [a,{...b,id:a.id}],
  [{...a,then:[{op:'noSuchEffect'}]},b],
  [{...a,then:[{op:'draw',count:1,extra:'bad'}]},b],
  [a,{...b,then:[{op:'buffSelf',bp:500,extra:true}]}],
  [a,{...b,then:[{op:'drawDiscard',count:1,discardCount:0}]}],
  [a,{...b,turn:'tomorrow'}],
  [a,{...b,then:[{op:'retireOppFrontAllUnderBp',bp:3000}]}],
  [a,{...b,label:''}],
  [{...a,then:[]},b]
 ];
 for(const v of invalid)assert.throws(()=>mk(v),/choose-one|branched|unsupported|invalid/,
  JSON.stringify(v));
 assert.throws(()=>createUniversalPack({id:'qa-schema',cards:[
  {...original,effects:{onPlay:[{op:'chooseOne',optional:false,options:[a,b],extra:'unknown'}]}}]}),
 /invalid choose-one/);
});
test('optional choose UP TO one can skip; mandatory version cannot, reusable recovery mode with no target stays available',()=>{
 const cards=Array.from({length:13},(_,i)=>({
  id:'QA-'+i,name:'QA'+i,color:'purple',energy:0,ap:1,bp:500,gen:1,
  type:'character',implementation:i===0?'dsl':'vanilla',
  ...(i===0?{effects:{onPlay:[{op:'chooseOne',optional:true,options:[
   {id:'draw',label:'抽一張',turn:'any',then:[{op:'draw',count:1}]},
   {id:'recover',label:'回收最多一張',turn:'any',then:[{op:'recoverOutsideOne',
    filter:{field:'type',value:'character'},optional:true}]}
  ]}]}}:{})
 }));
 const q=createUniversalPack({id:'qa-optional',cards}),qq=[q,q];
 const d=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
 let s=newUniversalMatch(qq,{decks:[d,d],seed:22,first:0});
 const takeQ=()=>{
  for(const zone of ['hand','deck','life']){
   const i=s.players[0][zone].findIndex(x=>x.cardId==='QA-0');
   if(i>=0)return s.players[0][zone].splice(i,1)[0];
  }
  throw Error('QA-0 missing');
 };
 const source=takeQ();s.players[0].hand.push(source);
 s=main(s,qq);
 const play=legalUniversalActions(qq,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front');
 assert.ok(play);s=dispatchUniversalAction(qq,s,play);
 assert.deepEqual(legalUniversalActions(qq,s).map(x=>x.mode),['skip','draw','recover']);
 const before=s.players[0].deck.length;
 const ap=s.players[0].apCards.filter(x=>x.ready&&x.inPlay).length;
 const skipped=dispatchUniversalAction(qq,s,{type:'chooseEffectMode',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck.length,before);
 assert.equal(skipped.players[0].apCards.filter(x=>x.ready&&x.inPlay).length,ap,
  'skipping printed OPTIONAL effect does not refund already spent play AP');
 assert.equal(assertUniversalMatch(qq,skipped),true);
 const mode=dispatchUniversalAction(qq,s,{type:'chooseEffectMode',mode:'recover'});
 assert.equal(mode.pending,null,'optional recover mode with empty own OUTSIDE does nothing');
 assert.equal(assertUniversalMatch(qq,mode),true);
});
