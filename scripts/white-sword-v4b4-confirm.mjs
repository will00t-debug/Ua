#!/usr/bin/env node
// Full two-stage operating characteristics. No rollout games.
import {judgeSamples} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {
 PLAN_CORRECTION,PLAN_MODE,PLAN_SIDE,fixedProbs,probsFor,scenarioPositions,simulateScenario
} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {conditionalMeanInterval,signTest} from '../training/white-sword-ai/v4b4/lib/exact.mjs';
import {comparisonP} from '../training/white-sword-ai/v4b3/lib/labels.mjs';
import {renderConfirm} from '../training/white-sword-ai/v4b4/lib/confirm-report.mjs';

const ROUNDS=500;
const FRAGILE=[-1,-1,-1,0,0,0,0,0];

const SCENARIOS=[
 ['null-tie50',0.5,[]],
 ['null-tie80',0.8,[]],
 ['null-tie90',0.9,[]],
 ['one375-tie50',0.5,[{mu:-0.375,learnable:true}]],
 ['one375-tie80',0.8,[{mu:-0.375,learnable:true}]],
 ['one375-tie90',0.9,[{mu:-0.375,learnable:true}]],
 ['one250-tie80',0.8,[{mu:-0.25,learnable:true}]],
 ['one500-tie80',0.8,[{mu:-0.5,learnable:true}]],
 ['three375-tie80',0.8,[{mu:-0.375,learnable:true},{mu:-0.375,learnable:true},{mu:-0.375,learnable:true}]],
 ['learn-plus-blocked',0.8,[{mu:-0.375,learnable:true},{mu:-0.5,learnable:false}]],
 ['two-and-two-blocked',0.8,[
  {mu:-0.375,learnable:true},{mu:-0.375,learnable:true},
  {mu:-0.375,learnable:false},{mu:-0.375,learnable:false}
 ]],
 ['six375-tie80',0.8,Array.from({length:6},()=>({mu:-0.375,learnable:true}))],
 ['fixed80-m016',0.8,[{mu:-0.16,learnable:true}],'fixed'],
 ['fixed90-m008',0.9,[{mu:-0.08,learnable:true}],'fixed']
];

function cell(tie,specials,mode,side,seed,kind='tilt'){
 return simulateScenario(scenarioPositions(tie,specials,{kind}),{seed,rounds:ROUNDS,mode,side});
}
function signalTie(tie,specials,kind='tilt'){
 const live=(specials||[]).find(item=>item.learnable!==false);
 if(!live)return tie;
 return (kind==='fixed'?fixedProbs(live.mu,tie):probsFor(live.mu,tie)).tie;
}
function main(){
 const normal=judgeSamples(FRAGILE);
 const exact=signTest(FRAGILE);
 const interval=conditionalMeanInterval(FRAGILE);
 const fragile={
  normal:{...normal,p:comparisonP(normal)},
  exact:{pOne:exact.pOne,pTwo:exact.pTwo,mean:exact.mean},
  interval:{low:interval.low,high:interval.high,mean:interval.mean}
 };
 const rows=[];
 for(const [name,tie,specials,kind='tilt'] of SCENARIOS){
  for(const mode of ['fixed','allocate']){
   rows.push({
    name,tie,signalTie:signalTie(tie,specials,kind),kind,mode,side:'one',
    ...cell(tie,specials,mode,'one',21+rows.length,kind)
   });
  }
 }
 for(const [name,tie,specials] of [['null-tie80',0.8,[]],['one375-tie80',0.8,[{mu:-0.375,learnable:true}]]]){
  rows.push({
   name,tie,signalTie:signalTie(tie,specials),kind:'tilt',mode:'fixed',side:'two',
   ...cell(tie,specials,'fixed','two',90)
  });
 }
 const study={
  rounds:ROUNDS,plan:{mode:PLAN_MODE,correction:PLAN_CORRECTION,side:PLAN_SIDE},fragile,rows
 };
 writeJson('training/white-sword-ai/v4b4/confirm.json',study);
 const text=renderConfirm(study);
 writeText('training/white-sword-ai/v4b4/confirm.md',text);
 writeText('docs/white-sword-ai/v4b4/confirm.md',text);
 const planRows=rows.filter(row=>row.mode===PLAN_MODE&&row.side===PLAN_SIDE);
 for(const row of planRows){
  console.log(row.name,'false',row.falsePerRound.toFixed(3),'fwer',row.falseRoundRate.toFixed(3),'true',row.trueRate==null?'-':row.trueRate.toFixed(2),'miss',row.insufficient==null?'-':row.insufficient.toFixed(2),'games',row.games.toFixed(0));
 }
}
main();
