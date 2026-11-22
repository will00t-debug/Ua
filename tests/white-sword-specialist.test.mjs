import test from 'node:test';
import assert from 'node:assert/strict';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {getDeck,verifyWhiteSword} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {
 POLICY_DIM,POLICY_INDEX,VALUE_DIM,policyVector,uniqueFeatureNames,valueVector,POLICY_NAMES,VALUE_NAMES
} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {createModel,dot,updateModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {finalSpecs,fullSpecs,selfPlaySpecs,smokeSpecs,teacherSpecs} from '../dist/universal-v2/white-sword-ai/protocol.mjs';
import {playGame,positionKey,replayMatches} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {splitForSeed} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {collectSamples} from '../dist/universal-v2/white-sword-ai/train.mjs';
import {assertObservationSafe} from '../dist/universal-v2/white-sword-ai/observe.mjs';

const at=(vector,name)=>vector[POLICY_INDEX[name]];
function pad(cards){
 const out=[...cards];
 while(out.length<4)out.push(null);
 return out.slice(0,4);
}
function card(uid,cardId,extra={}){return {uid,cardId,...extra};}
function fixture(partial={}){
 const seat=partial.seat??0;
 const mine={
  lifeCount:partial.myLife??7,deckCount:partial.deck??40,handCount:(partial.hand||[]).length,
  hand:partial.hand||[],front:pad(partial.front||[]),energy:pad(partial.energy||[]),
  apReady:partial.ap??1,apTotal:3,apCards:[],energyTotal:partial.energyTotal??4,
  energyByColor:partial.colors||{green:partial.energyTotal??4},
  faceUpLife:[],outside:partial.outside||[],removed:[],publicLife:[]
 };
 const opp={
  lifeCount:partial.oppLife??7,deckCount:40,handCount:5,hand:null,
  front:pad(partial.oppFront||[]),energy:pad(partial.oppEnergy||[]),
  apReady:1,apTotal:3,apCards:[],energyTotal:2,energyByColor:{green:2},
  faceUpLife:[],outside:[],removed:[],publicLife:[]
 };
 return {
  visible:{
   phase:partial.phase||'main',turn:partial.turn??4,active:seat,actor:seat,
   pending:partial.pending||null,battle:partial.battle||null,
   players:seat===0?[mine,opp]:[opp,mine]
  },
  private:partial.private||null
 };
}
const catalog={
 'BLC-2-067':{name:'更木 剣八',energy:4,ap:1,bp:4000,gen:1,type:'character',color:'green',traits:['護廷十三隊'],raidImpact:1},
 'BLC-3-008':{name:'更木 剣八',energy:4,ap:1,bp:3000,gen:2,type:'character',color:'green',traits:['護廷十三隊']},
 'BLC-4-070':{name:'更木 剣八',energy:1,ap:1,bp:4000,gen:1,type:'character',color:'green',traits:['護廷十三隊'],impactNull:true,mustBlock:true},
 'BLC-1-085':{name:'日番谷 冬獅郎',energy:4,ap:1,bp:4000,gen:1,type:'character',color:'green',traits:['護廷十三隊'],raidName:'日番谷 冬獅郎'},
 'BLC-1-083':{name:'日番谷 冬獅郎',energy:0,ap:1,bp:1500,gen:1,type:'character',color:'green',traits:['護廷十三隊']},
 'BLC-2-069':{name:'日番谷 冬獅郎',energy:1,ap:1,bp:2500,gen:1,type:'character',color:'green',traits:['護廷十三隊']},
 'BLC-3-009':{name:'日番谷 冬獅郎',energy:3,ap:1,bp:2000,gen:2,type:'character',color:'green',traits:['護廷十三隊']},
 'BLC-1-072':{name:'卯ノ花 烈',energy:2,ap:1,bp:2000,gen:1,type:'character',color:'green',traits:['護廷十三隊']},
 'BLC-4-066':{name:'卯ノ花 烈',energy:0,ap:1,bp:1500,gen:1,type:'character',color:'green',traits:['護廷十三隊']},
 'BLC-1-070':{name:'卯ノ花 八千流',energy:6,ap:1,bp:4000,gen:1,type:'character',color:'green',traits:['護廷十三隊'],raidName:'卯ノ花 烈'},
 'BLC-4-060':{name:'藍染 惣右介',energy:3,ap:1,bp:4000,gen:2,type:'character',color:'green',traits:[],frontForbidden:true},
 'BLC-2-073':{name:'野晒',energy:4,ap:1,bp:0,gen:0,type:'event',color:'green',traits:[]},
 'BLC-4-080':{name:'卍解',energy:3,ap:1,bp:0,gen:0,type:'event',color:'green',traits:[]},
 'BLC-9-001':{name:'草鹿 やちる',energy:1,ap:1,bp:1500,gen:1,type:'character',color:'green',traits:[]}
};
const packs=[catalog,catalog];
function vector(partial,action,legal=[action]){
 return policyVector({observation:fixture(partial),seat:0,action,legal,catalogs:packs});
}

test('feature names are unique and fixed width',()=>{
 assert.equal(uniqueFeatureNames(POLICY_NAMES),true);
 assert.equal(uniqueFeatureNames(VALUE_NAMES),true);
 assert.equal(policyVector({observation:fixture(),seat:0,action:{type:'next'},legal:[{type:'next'}],catalogs:packs}).length,POLICY_DIM);
 assert.equal(valueVector({observation:fixture(),seat:0,catalogs:packs}).length,VALUE_DIM);
});
test('white-sword list is the registered 50-card deck',()=>{
 const report=verifyWhiteSword();
 assert.equal(report.ok,true);
 assert.equal(report.copies,50);
 assert.equal(report.kinds,13);
 assert.deepEqual(report.missing,[]);
 assert.deepEqual(report.issues,[]);
 const deck=getDeck('white-sword');
 assert.equal(Object.values(deck.counts).reduce((sum,n)=>sum+n,0),50);
});
test('Kenpachi raid features follow the printed base energy',()=>{
 const high=vector({
  hand:[card('0-1','BLC-2-067'),card('0-2','BLC-1-083')],
  front:[card('0-9','BLC-3-008')],
  oppFront:[card('1-3','BLC-4-070',{bp:4000})]
 },{type:'raid',uid:'0-1',baseUid:'0-9',line:'front',slot:0});
 assert.equal(at(high,'k067_raid'),1);
 assert.equal(at(high,'k067_base_ge4'),1);
 assert.equal(at(high,'k067_damage2'),1);
 assert.equal(at(high,'k067_impact'),1);
 assert.equal(at(high,'k067_leave'),1);
 assert.equal(at(high,'k067_threatened'),1);
 const low=vector({
  hand:[card('0-1','BLC-2-067')],
  front:[card('0-8','BLC-4-070')]
 },{type:'raid',uid:'0-1',baseUid:'0-8',line:'front',slot:0});
 assert.equal(at(low,'k067_base_ge4'),0);
 assert.equal(at(low,'k067_damage2'),0);
 assert.equal(at(low,'k067_leave'),0);
 const buried=vector({
  hand:[card('0-1','BLC-2-067'),card('0-2','BLC-1-083')],
  front:[card('0-7','BLC-4-070',{raidLayers:[card('0-9','BLC-3-008')]})]
 },{type:'raid',uid:'0-1',baseUid:'0-7',line:'front',slot:0});
 assert.equal(at(buried,'k067_base_ge4'),1);
 assert.equal(dot(createModel().policy,high),0);
});
test('Hitsugaya counts other Gotei cards and not a buried base',()=>{
 const bodies=['0-1','0-2','0-3','0-4','0-5','0-6'].map((uid,index)=>card(uid,index===5?'BLC-4-066':'BLC-1-083'));
 const ready=vector({
  hand:[card('0-8','BLC-1-085')],front:bodies.slice(0,4),energy:bodies.slice(4),
  oppFront:[card('1-1','BLC-4-070',{bp:2000,ready:true})],
  oppEnergy:[card('1-2','BLC-1-083')]
 },{type:'raid',uid:'0-8',baseUid:'0-20',line:'front',slot:0});
 assert.equal(at(ready,'h085_upgrade'),1);
 assert.equal(at(ready,'h085_rest_target'),1);
 assert.ok(at(ready,'h085_energy_rest')>0);
 const onto=vector({
  hand:[card('0-8','BLC-1-085')],front:bodies.slice(0,4),energy:bodies.slice(4),
  oppFront:[card('1-1','BLC-4-070',{bp:2000})]
 },{type:'raid',uid:'0-8',baseUid:'0-1',line:'front',slot:0});
 assert.equal(at(onto,'h085_upgrade'),0);
 const buriedOnly=vector({
  hand:[card('0-8','BLC-1-085')],
  front:[card('0-7','BLC-4-060',{raidLayers:[card('0-1','BLC-1-083'),card('0-2','BLC-2-069'),card('0-3','BLC-3-009'),card('0-4','BLC-4-066'),card('0-5','BLC-1-072'),card('0-6','BLC-1-083')]})]
 },{type:'raid',uid:'0-8',baseUid:'0-7',line:'front',slot:0});
 assert.equal(at(buriedOnly,'h085_upgrade'),0);
});
test('Unohana search, raid base, and the next AP discount are visible features',()=>{
 const row=vector({
  hand:[card('0-1','BLC-1-070'),card('0-2','BLC-3-009')],
  front:[card('0-9','BLC-4-066')],ap:0,energyTotal:6,deck:30
 },{type:'raid',uid:'0-1',baseUid:'0-9',line:'front',slot:0});
 assert.equal(at(row,'u070_base'),1);
 assert.equal(at(row,'u070_search'),1);
 assert.ok(at(row,'u070_ap_enable')>0);
 const empty=vector({hand:[card('0-1','BLC-1-070')],deck:0,ap:3},{type:'play',uid:'0-1',line:'energy',slot:0});
 assert.equal(at(empty,'u070_search'),0);
 const choice=vector({
  front:[card('0-1','BLC-1-070')],
  pending:{kind:'effect-top-filter-many-choice',player:0},
  private:{inspected:[card('0-40','BLC-2-069')]}
 },{type:'chooseTopFilteredMany',uid:'0-40'});
 assert.equal(at(choice,'u070_take'),1);
});
test('Aizen distinguishes energy entry from a front entry and scores the line move',()=>{
 const energy=vector({hand:[card('0-1','BLC-4-060')],front:[card('0-2','BLC-1-083',{ready:true}),card('0-3','BLC-2-069',{ready:true})]},
  {type:'play',uid:'0-1',line:'energy',slot:0});
 const front=vector({hand:[card('0-1','BLC-4-060')]},{type:'play',uid:'0-1',line:'front',slot:0});
 assert.equal(at(energy,'aizen_energy_play'),1);
 assert.equal(at(energy,'aizen_front_play'),0);
 assert.equal(at(front,'aizen_front_play'),1);
 const moved=vector({
  energy:[card('0-1','BLC-4-060',{ready:true,produces:2})],
  front:[null,card('0-2','BLC-1-083',{ready:true}),card('0-3','BLC-2-069',{ready:true})],
  energyTotal:4
 },{type:'activate',uid:'0-1',mode:'restTwoMove'});
 assert.equal(at(moved,'aizen_activate'),1);
 assert.equal(at(moved,'aizen_energy_after'),0.25);
 assert.equal(at(moved,'aizen_can_attack'),1);
 assert.equal(at(moved,'aizen_draw'),1);
});
test('forced block and Impact null are features of the legal block',()=>{
 const battle={bp:3000,impact:1,damage:1,cardId:'X',uid:'1-1'};
 const only=vector({
  front:[card('0-1','BLC-4-070',{bp:4000,ready:true})],battle
 },{type:'chooseBlock',uid:'0-1'},[{type:'chooseBlock',uid:'0-1'}]);
 assert.equal(at(only,'k070_block'),1);
 assert.equal(at(only,'k070_null'),1);
 assert.equal(at(only,'k070_survives'),1);
 assert.equal(at(only,'k070_forced'),1);
 const pass=vector({
  front:[card('0-1','BLC-4-070',{bp:4000,ready:true})],battle
 },{type:'chooseBlock',uid:null},[{type:'chooseBlock',uid:'0-1'},{type:'chooseBlock',uid:null}]);
 assert.equal(at(pass,'k070_pass'),1);
 assert.equal(at(pass,'k070_forced'),0);
});
test('Noshaba cap follows Kenpachi on the field or Yachiru outside',()=>{
 const foe=[card('1-1','BLC-3-009',{bp:4000})];
 const plain=vector({hand:[card('0-1','BLC-2-073')],oppFront:foe},{type:'event',uid:'0-1'});
 assert.equal(at(plain,'nos_cap5000'),0);
 assert.equal(at(plain,'nos_at3000'),0);
 assert.equal(at(plain,'nos_at5000'),0.25);
 assert.equal(at(plain,'nos_targets'),0);
 const ken=vector({
  hand:[card('0-1','BLC-2-073')],front:[card('0-2','BLC-4-070')],oppFront:foe
 },{type:'event',uid:'0-1'});
 assert.equal(at(ken,'nos_cap5000'),1);
 assert.equal(at(ken,'nos_targets'),0.25);
 const buried=vector({
  hand:[card('0-1','BLC-2-073')],
  front:[card('0-3','BLC-4-060',{raidLayers:[card('0-2','BLC-3-008')]})],oppFront:foe
 },{type:'event',uid:'0-1'});
 assert.equal(at(buried,'nos_cap5000'),0);
 assert.equal(at(buried,'nos_buried_only'),1);
 const outside=vector({
  hand:[card('0-1','BLC-2-073')],outside:[card('0-9','BLC-9-001')],oppFront:foe
 },{type:'event',uid:'0-1'});
 assert.equal(at(outside,'nos_cap5000'),1);
 const pick=vector({
  front:[card('0-2','BLC-4-070')],oppFront:foe,pending:{kind:'effect-retire-bp',player:0}
 },{type:'chooseRetireBp',uid:'1-1'});
 assert.equal(at(pick,'nos_choice_high'),1);
 assert.equal(at(pick,'nos_cap5000'),1);
});
test('Bankai feature is whether recovered AP can pay a visible card',()=>{
 const enabled=vector({
  hand:[card('0-1','BLC-4-080'),card('0-2','BLC-1-083')],ap:0,energyTotal:3
 },{type:'event',uid:'0-1'});
 assert.equal(at(enabled,'bankai_enable'),1);
 assert.equal(at(enabled,'bankai_none'),0);
 const idle=vector({hand:[card('0-1','BLC-4-080')],ap:2,energyTotal:0},{type:'event',uid:'0-1'});
 assert.equal(at(idle,'bankai_enable'),0);
 assert.equal(at(idle,'bankai_none'),1);
 const already=vector({
  hand:[card('0-1','BLC-4-080'),card('0-2','BLC-1-083')],ap:1,energyTotal:3
 },{type:'event',uid:'0-1'});
 assert.equal(at(already,'bankai_enable'),0);
 assert.equal(at(already,'bankai_already'),1);
});
test('printed bleach cards produce the Kenpachi base-energy feature',()=>{
 const pack=officialV2Pack('bleach');
 const catalogs=[pack.cards,pack.cards];
 const high=policyVector({
  observation:fixture({
   hand:[card('0-1','BLC-2-067'),card('0-2','BLC-1-083')],
   front:[card('0-9','BLC-3-008')],
   oppFront:[card('1-3','BLC-4-070',{bp:4000})]
  }),
  seat:0,catalogs,
  action:{type:'raid',uid:'0-1',baseUid:'0-9',line:'front',slot:0},
  legal:[{type:'raid',uid:'0-1',baseUid:'0-9',line:'front',slot:0}]
 });
 const low=policyVector({
  observation:fixture({hand:[card('0-1','BLC-2-067')],front:[card('0-8','BLC-4-070')]}),
  seat:0,catalogs,
  action:{type:'raid',uid:'0-1',baseUid:'0-8',line:'front',slot:0},
  legal:[{type:'raid',uid:'0-1',baseUid:'0-8',line:'front',slot:0}]
 });
 assert.equal(at(high,'k067_base_ge4'),1);
 assert.equal(at(high,'k067_damage2'),1);
 assert.equal(at(high,'card_BLC-2-067'),1);
 assert.equal(pack.cards['BLC-3-008'].energy,4);
 assert.equal(at(low,'k067_base_ge4'),0);
 assert.equal(pack.cards['BLC-4-070'].energy,1);
});
test('weights move toward the preferred legal action',()=>{
 const model=createModel();
 const chosen=Array(POLICY_DIM).fill(0);
 const other=Array(POLICY_DIM).fill(0);
 const value=Array(VALUE_DIM).fill(0);
 chosen[POLICY_INDEX.type_play]=1;
 other[POLICY_INDEX.type_next]=1;
 value[0]=1;
 const before=model.policy[POLICY_INDEX.type_play];
 updateModel(model,[{kind:'teacher',chosen,negatives:[other],value,reward:null}],{lr:0.5,epochs:2,decayRate:0});
 assert.ok(model.policy[POLICY_INDEX.type_play]>before);
 assert.ok(dot(model.policy,chosen)>dot(model.policy,other));
 const loser=createModel();
 loser.policy[POLICY_INDEX.type_play]=1;
 updateModel(loser,[{kind:'outcome',reward:'loss',chosen,negatives:[other],value}],{lr:0.8,valueLr:0.01,epochs:1,decayRate:0});
 assert.ok(loser.policy[POLICY_INDEX.type_play]<1);
 assert.throws(()=>updateModel(createModel(),[{kind:'outcome',reward:'raid',chosen,negatives:[other],value}]),/match result/);
});
test('final seeds and failed games never become training losses',()=>{
 assert.equal(splitForSeed(50000),'final');
 assert.equal(splitForSeed(20000),'train');
 assert.throws(()=>collectSamples([{seed:50000,status:'finished',winner:0,anomalies:{},samples:[]}]),/cannot be used for training/);
 const {samples,rejected}=collectSamples([{
  seed:19001,matchId:'bad',status:'playing',winner:null,
  anomalies:{illegal:1,timeout:0,fallback:0,deadLoop:0,engineError:0,leak:0},
  samples:[{kind:'outcome',reward:'loss'}]
 }]);
 assert.equal(samples.length,0);
 assert.equal(rejected.length,1);
 assert.equal(rejected[0].reason,'illegal');
 assert.equal(smokeSpecs().length,20);
 assert.equal(fullSpecs().length,100);
 assert.equal(teacherSpecs().length,32);
 assert.equal(selfPlaySpecs().length,1000);
 assert.equal(finalSpecs().length,204);
 assert.equal(new Set(finalSpecs().map(row=>row.opponentDeck)).size,3);
 for(const row of finalSpecs())assert.equal(splitForSeed(row.seed),'final');
 for(const row of selfPlaySpecs())assert.equal(splitForSeed(row.seed),'train');
});
test('opponent hidden zones do not change the specialist action',()=>{
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const state=newComparedMatch(packs,[deck.counts,deck.counts],11000,0,matchRules('official'));
 const actor=state.pending?.player??state.active;
 const model=createModel();
 model.policy[POLICY_INDEX.bias]=0.3;
 model.policy[POLICY_INDEX.type_keep]=0.4;
 const first=chooseWhiteSwordAction(packs,state,{actor,model,seed:11000});
 const poisoned=structuredClone(state);
 const hidden=poisoned.players[actor===0?1:0];
 hidden.deck.reverse();
 hidden.life.reverse();
 hidden.hand.reverse();
 const second=chooseWhiteSwordAction(packs,poisoned,{actor,model,seed:11000});
 assert.equal(first.source==='fallback',false);
 assert.deepEqual(first.action,second.action);
 const observation=first.chosen?null:null;
 assert.equal(observation,null);
 const legal=legalUniversalActions(packs,state);
 assert.ok(legal.some(action=>JSON.stringify(action)===JSON.stringify(first.action)));
});
test('a leaking observation is rejected before scoring',()=>{
 const leaked=fixture();
 leaked.visible.players[1].hand=[{uid:'1-1',cardId:'BLC-1-083'}];
 assert.throws(()=>assertObservationSafe(leaked,0),/opponent hand leaked/);
 assert.throws(()=>policyVector({observation:leaked,seat:0,action:{type:'next'},legal:[],catalogs:packs}),/leaked/);
});
test('model failure falls back to a legal hard action',()=>{
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const state=newComparedMatch(packs,[deck.counts,deck.counts],11001,0,matchRules('official'));
 const actor=state.pending?.player??state.active;
 const picked=chooseWhiteSwordAction(packs,state,{actor,model:createModel(),seed:11001,forceError:true});
 assert.equal(picked.source,'fallback');
 const legal=legalUniversalActions(packs,state);
 assert.ok(legal.some(action=>JSON.stringify(action)===JSON.stringify(picked.action)));
});
test('an order window is not the same position on every pick',()=>{
 const board={life:[1],hand:[1],deck:[1,2,3],outside:[],removed:[],lifeRevealed:[],apCards:[],
  front:[null,null,null,null],energy:[null,null,null,null]};
 const state={turn:4,phase:'main',active:0,effectQueue:[],players:[board,board],
  pending:{kind:'effect-top-order',player:0,uids:['0-1','0-2','0-3','0-4','0-5','0-6','0-7','0-8','0-9','0-10','0-11','0-12'],order:[]}};
 const later={...state,pending:{...state.pending,uids:state.pending.uids.slice(1),order:['0-1']}};
 assert.notEqual(positionKey(state),positionKey(later));
});
test('a seeded specialist game replays the same actions',()=>{
 const deck=getDeck('white-sword');
 const spec={
  seed:11002,first:0,specialistSeat:0,opponentDeck:'white-sword',label:'smoke',
  seats:[
   {deckId:'white-sword',policy:'white-sword',model:createModel(),mode:'policy',explore:0},
   {deckId:'white-sword',policy:'universal-hard',model:null,mode:'policy',explore:0}
  ],
  keepSamples:false,recordTeacher:false,recordSeat:0
 };
 const replay=replayMatches(spec);
 assert.equal(replay.same,true);
 assert.equal(replay.finished,true);
 assert.equal(replay.anomalies.illegal,0);
 assert.equal(replay.anomalies.leak,0);
 assert.ok(replay.first.length>10);
 void deck;
});
