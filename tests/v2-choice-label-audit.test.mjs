import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';

function context(){
 const cards={'0-1':{name:'黑崎一護'},'0-2':{name:'葛力姆喬・賈卡傑克'}};
 const empty=()=>({hand:[],front:[],energy:[],outside:[],removed:[],deck:[],life:[],lifeRevealed:[]});
 const you=empty();
 you.hand=[{uid:'0-1',cardId:'0-1'},{uid:'0-2',cardId:'0-2'}];
 return {pack:{cards},state:{players:[you,empty()],pending:{
  ap:1,
  options:[
   {id:'active',label:'自己角色活動',then:[{op:'activeOwnOne'}]},
   {id:'buff',label:'自己角色這個回合 BP＋2000',then:[{op:'buffOwnField'}]},
   {id:'rest',label:'對手前線休息',then:[{op:'restOppFrontOne'}]}
  ],
  entries:[{key:'k1',sourceUid:'0-1'},{key:'k2',sourceUid:'0-2'}]
 }}};
}

test('binary and placement choices do not share one button label',()=>{
 const ctx=context();
 const groups=[
  [{type:'chooseGrantCause',mode:'grant'},{type:'chooseGrantCause',mode:'skip'}],
  [{type:'choosePayDeploy',mode:'pay'},{type:'choosePayDeploy',mode:'skip'}],
  [{type:'chooseArmedDraw',mode:'draw'},{type:'chooseArmedDraw',mode:'skip'}],
  [{type:'chooseDrawInstead',mode:'draw'},{type:'chooseDrawInstead',mode:'discard'}],
  [{type:'chooseReturnRetired',mode:'return'},{type:'chooseReturnRetired',mode:'skip'}],
  [{type:'chooseRevealedTop',place:'top'},{type:'chooseRevealedTop',place:'outside'}],
  [{type:'chooseTopTraitHand',mode:'hand'},{type:'chooseTopTraitHand',mode:'top'},
   {type:'chooseTopTraitHand',mode:'outside'}],
  [{type:'chooseSwapMode',mode:'swap'},{type:'chooseSwapMode',mode:'bp'},
   {type:'chooseSwapMode',mode:'both'}],
  [{type:'choosePrintedEnergy',value:1},{type:'choosePrintedEnergy',value:4}],
  [{type:'chooseRaidLife',index:null},{type:'chooseRaidLife',index:0},
   {type:'chooseRaidLife',index:2}],
  [{type:'chooseOutsideUse',mode:'skip'},
   {type:'chooseOutsideUse',mode:'hand',uid:'0-1'},
   {type:'chooseOutsideUse',mode:'rest',uid:'0-1',line:'front',slot:0},
   {type:'chooseOutsideUse',mode:'rest',uid:'0-1',line:'energy',slot:1}],
  [{type:'chooseRaidBaseMode',uid:null},
   {type:'chooseRaidBaseMode',mode:'hand',uid:'0-1'},
   {type:'chooseRaidBaseMode',mode:'rest',uid:'0-1',line:'front',slot:0},
   {type:'chooseRaidBaseMode',mode:'dest',line:'energy',slot:2}],
  [{type:'chooseRaidLeave',mode:'decline'},
   {type:'chooseRaidLeave',mode:'pay',uid:'0-2'}],
  [{type:'chooseActiveAp',uid:'AP0-1'},{type:'chooseActiveAp',uid:'AP0-2'}],
  [{type:'chooseApRecovery',uid:null},{type:'chooseApRecovery',uid:'AP0-1'},
   {type:'chooseApRecovery',uid:'AP0-2'}],
  [{type:'chooseHandBottom',uid:null},{type:'chooseHandBottom',uid:'0-1'},
   {type:'chooseHandBottom',uid:'0-2'}],
  [{type:'chooseHandReenterUnder',uid:null},
   {type:'chooseHandReenterUnder',uid:'0-1',line:'front',slot:0},
   {type:'chooseHandReenterUnder',uid:'0-1',line:'front',slot:2}],
  [{type:'chooseTopDeployRest',uid:null},
   {type:'chooseTopDeployRest',uid:'0-1',line:'front',slot:0},
   {type:'chooseTopDeployRest',uid:'0-1',line:'energy',slot:1},
   {type:'chooseTopDeployRest',uid:'0-2'}],
  [{type:'chooseHandTwoOutside',uid:'0-1'},{type:'chooseHandTwoOutside',uid:'0-2'}],
  [{type:'chooseOrderedSubset',mode:'confirm'},
   {type:'chooseOrderedSubset',mode:'pick',id:'active'},
   {type:'chooseOrderedSubset',mode:'pick',id:'buff'},
   {type:'chooseOrderedSubset',mode:'pick',id:'rest'}],
  [{type:'choosePhaseOrder',key:'k1'},{type:'choosePhaseOrder',key:'k2'}],
  [{type:'chooseRetirementOrder',key:'k1'},{type:'chooseRetirementOrder',key:'k2'}],
  [{type:'chooseRemoveOutside',mode:'skip'},{type:'chooseRemoveOutside',mode:'done'},
   {type:'chooseRemoveOutside',mode:'all'},
   {type:'chooseRemoveOutside',mode:'pick',uid:'0-1'}]
 ];
 for(const group of groups){
  const labels=group.map(action=>uiActionLabel(action,ctx));
  assert.equal(new Set(labels).size,labels.length,labels.join(' | '));
  for(const label of labels){
   assert.equal(label.includes('完成這個選擇'),false,label);
   assert.equal(label.includes('選擇這個效果'),false,label);
  }
 }
 assert.equal(V2_PENDING_LABELS['effect-grant-cause'],'是否給予這次退場原因的角色阻擋下限');
 assert.equal(V2_PENDING_LABELS['effect-draw-instead'],'抽牌，或抽牌後再棄牌');
 assert.equal(uiActionLabel({type:'chooseActiveAp',uid:'AP0-2'},ctx),'將 AP 2 轉為 ACTIVE');
});

test('every pending choice type has a label instead of the generic button',()=>{
 const engine=readFileSync(new URL('../dist/universal-v2/engine.mjs',import.meta.url),'utf8');
 const preview=readFileSync(new URL('../dist/universal-v2/preview-actions.mjs',import.meta.url),'utf8');
 const body=engine.slice(engine.indexOf('function legalPending('),
  engine.indexOf('export function legalUniversalActions'));
 const types=[...new Set([...body.matchAll(/type:'(choose[A-Za-z0-9]+)'/g)].map(m=>m[1]))];
 assert.ok(types.length>250);
 for(const type of types){
  const listed=preview.includes("case '"+type+"'")||
   preview.includes("type==='"+type+"'")||
   preview.includes('\n  '+type+':[')||preview.includes('\n  '+type+':{');
  assert.equal(listed,true,type);
 }
 const ctx=context();
 const named=[
  {type:'chooseEnergyFront',uid:'0-1',slot:1},
  {type:'chooseWyrmLook',uid:'0-1'},
  {type:'chooseOutsidePrinted',uid:'0-1',line:'front',slot:0},
  {type:'chooseHandBottom',uid:'0-2'}
 ];
 for(const action of named){
  const label=uiActionLabel(action,ctx);
  assert.equal(label.includes('完成這個選擇'),false,action.type+' '+label);
  assert.equal(/黑崎一護|葛力姆喬/.test(label),true,label);
 }
 assert.equal(uiActionLabel({type:'chooseGrantCause',mode:'skip'},ctx),'不給予阻擋下限');
});
