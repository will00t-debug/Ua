import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const official=SAO_OFFICIAL_CARDS.find(x=>x.id==='SAO-2-058');
const baseline=registeredV2TitlePack('sword-art-online');
const trial=createUniversalPack({id:'sword-art-online',cards:[{
 id:'SAO-2-058',name:official.nameJa,type:'event',color:'purple',
 energy:2,ap:1,bp:0,gen:0,traits:[],trigger:'active',implementation:'dsl',
 effects:{onPlay:[{op:'grantOwnFrontChoiceProtection',
  scope:'any',until:'nextOwnStart',optional:false,apRecoveryOnName:'アスナ'}]}
}]});
// Full-print tests now run against the actual registered title pack, not
// the pre-registration isolated probe. The independently constructed DSL
// profile remains a strict comparison of the full printed effect.
assert.deepEqual(baseline.cards['SAO-2-058'].effects.onPlay,
 trial.cards['SAO-2-058'].effects.onPlay);
const packs=[baseline,baseline];
const ids=['SAO-1-001','SAO-1-005','SAO-2-035','SAO-2-047','SAO-1-004',
 'SAO-1-019','SAO-1-020','SAO-1-051','SAO-1-057','SAO-1-068',
 'SAO-1-073','SAO-2-016','SAO-2-058'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
const other={...deck};delete other['SAO-2-058'];other['SAO-1-077']=2;
assert.deepEqual(validateUniversalDeck(packs[0],deck),[]);
assert.deepEqual(validateUniversalDeck(packs[1],other),[]);
function pull(s,p,id){for(const z of ['hand','deck','life','outside']){
 const arr=s.players[p][z],idx=arr.findIndex(c=>c.cardId===id);
 if(idx>=0)return arr.splice(idx,1)[0];
}throw Error('Missing '+id);}
function placed(s,id,line,slot){
 const c=pull(s,0,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=c;return c;
}
function scene(name='アスナ'){
 let s=newUniversalMatch(packs,{decks:[deck,other],first:0,seed:40580});
 const event=pull(s,0,'SAO-2-058');s.players[0].hand.push(event);
 const target=placed(s,name==='アスナ'?'SAO-1-068':'SAO-1-051','front',0);
 placed(s,'SAO-2-035','energy',0);placed(s,'SAO-2-047','energy',1);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return {s,event,target};
}
function use(s,a){return dispatchUniversalAction(packs,s,a);}
test('R40 SAO-2-058 source JP print, EVENT mandatory own FRONT, no payment if unavailable',()=>{
 assert.equal(official.number,'EX08BT/SAO-2-058');
 assert.deepEqual([official.type,official.color,official.energy,official.ap,official.trigger],
  ['event','purple',2,1,'active']);
 assert.ok(official.effectJa.includes('相手の効果で選ばれない'));
 let {s,event}=scene();
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(play);
 const snapshot=structuredClone(s);
 for(let i=0;i<4;i++)if(s.players[0].front[i]){
  s.players[0].outside.push(s.players[0].front[i]);s.players[0].front[i]=null;
 }
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid));
 assert.throws(()=>use(s,play),/not currently legal/);
 assert.ok(s.players[0].hand.some(x=>x.uid===event.uid));
 assert.equal(s.players[0].outside.filter(x=>x.uid===event.uid).length,0);
 assert.ok(snapshot.players[0].front[0]);
});
test('R40 SAO-2-058 chooses Asuna, grants physical immunity and optionally readies actual OWN AP',()=>{
 let {s,event,target}=scene();
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 const paidBefore=s.players[0].apCards.filter(x=>x.ready).length;
 s=use(s,play);
 assert.equal(s.pending.kind,'effect-own-front-protect');
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const bad=structuredClone(s);
 assert.throws(()=>use(s,{type:'chooseOwnFrontProtect',uid:'0-forged'}),/not currently legal/);
 assert.deepEqual(s,bad);
 s=use(s,{type:'chooseOwnFrontProtect',uid:target.uid});
 assert.equal(s.continuousStates.filter(x=>x.kind==='cannotBeChosenByOppEffect').length,1);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,paidBefore-1);
 const ready=legalUniversalActions(packs,s).find(a=>a.type==='chooseApRecovery'&&a.uid!==null);
 assert.ok(ready);
 s=use(s,ready);
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,paidBefore);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(x=>x.uid===event.uid));
 assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 const view=universalPublicView(packs,s,1);
 assert.equal(view.players[0].front[0].restrictions.some(x=>x.kind==='cannotBeChosenByOppEffect'),true);
});
test('R40 SAO-2-058 non-Asuna gets protection but no extra AP; Asuna may decline ready',()=>{
 let {s,event,target}=scene('other');
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 s=use(s,action);s=use(s,{type:'chooseOwnFrontProtect',uid:target.uid});
 assert.equal(s.pending,null);
 assert.equal(s.continuousStates.filter(x=>x.kind==='cannotBeChosenByOppEffect').length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
 let a=scene();let t=a.target.uid;
 let pay=legalUniversalActions(packs,a.s).find(x=>x.type==='event'&&x.uid===a.event.uid);
 a.s=use(a.s,pay);a.s=use(a.s,{type:'chooseOwnFrontProtect',uid:t});
 assert.equal(a.s.pending.kind,'effect-recover-ap');
 a.s=use(a.s,{type:'chooseApRecovery',uid:null});
 assert.equal(a.s.pending,null);
 assert.equal(assertUniversalMatch(packs,a.s),true);
});
test('R40 SAO-2-058 ACTIVE LIFE only activates own field character and buffs BP+3000',()=>{
 const {s,event,target}=scene();
 const active=pull(s,0,'SAO-2-058');s.players[0].outside.push(active);
 s.players[0].front[0].ready=false;
 s.pending={kind:'life-trigger',player:0,uid:active.uid,trigger:'active'};
 const legal=legalUniversalActions(packs,s);
 const action=legal.find(x=>x.type==='chooseTrigger'&&x.mode==='active'&&x.uid===target.uid);
 assert.ok(action);
 const bpPrior=s.players[0].front[0].buffs?.length||0;
 const saved=JSON.parse(JSON.stringify(s));
 assert.throws(()=>use(s,{type:'chooseTrigger',mode:'active',uid:'1-not-owned'}),/not currently legal/);
 assert.deepEqual(s,saved);
 const after=use(s,action);
 assert.equal(after.players[0].front[0].ready,true);
 assert.equal(after.players[0].front[0].buffs.length,bpPrior+1);
 assert.equal(after.players[0].front[0].buffs.at(-1).bp,3000);
 assert.equal(after.pending,null);
 assert.equal(assertUniversalMatch(packs,after),true);
});
