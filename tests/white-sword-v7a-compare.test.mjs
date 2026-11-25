import assert from 'node:assert/strict';
import test from 'node:test';
import {POLICY_DIM,POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {blendScore} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {chooseThreshold,contrastFeatures,decide,exampleFrom,judge,summarize} from '../training/white-sword-ai/v7a/lib/compare.mjs';
import {ALWAYS,POSITION_CONTEXT,SCALE,positiveSignal,shrink} from '../training/white-sword-ai/v7a/lib/protocol.mjs';

const weights=[];

function features(name){
 const values=Array(POLICY_DIM).fill(0);
 if(name)values[POLICY_INDEX[name]]=1;
 return values;
}
function row(key,hard,name){
 return {key,sort:key,hard,features:features(name)};
}

test('a small sample is shrunk toward zero and is not a hard label',()=>{
 assert.equal(shrink(1,32),0.5);
 assert.equal(shrink(1,0),0);
 assert.equal(shrink(-1,32),-0.5);
});

test('the target flips with the v2 side and is not added to the blend',()=>{
 const band=[row('a',3),row('b',1)];
 const sample={keyA:'a',keyB:'b',y:0.25,n:32,band,game:'g',fold:0};
 const example=exampleFrom(sample,weights);
 assert.equal(example.baseKey,'a');
 assert.equal(example.candidateKey,'b');
 assert.equal(example.y,-0.25);
 const opposite={...sample,band:[row('a',1),row('b',3)]};
 const flipped=exampleFrom(opposite,weights);
 assert.equal(flipped.baseKey,'b');
 assert.equal(flipped.y,0.25);
 assert.equal(blendScore(3,weights,band[0].features,SCALE),3);
});

test('a predicted advantage can switch without changing the blend score',()=>{
 const band=[row('v2',10),row('alt',9,'type_play')];
 const contrast=contrastFeatures(features('type_play'),features());
 const beta=contrast.map(value=>value?1:0);
 const before=blendScore(9,weights,features('type_play'),SCALE);
 const choice=decide(band,weights,{beta,scale:beta.map(()=>1)},0.05);
 assert.equal(choice,'alt');
 assert.equal(blendScore(9,weights,features('type_play'),SCALE),before);
});

test('a prediction below the gate stays with v2 and cannot leave the hard cap',()=>{
 const band=[row('v2',10),row('alt',9,'type_play'),row('out',0,'type_attack')];
 const stay=decide(band,weights,{beta:[],scale:[]},0.05);
 assert.equal(stay,'v2');
 const index=POSITION_CONTEXT.length+0;
 const beta=Array(index+1).fill(0);
 const outsider=contrastFeatures(features('type_attack'),features());
 beta.length=outsider.length;
 outsider.forEach((value,at)=>{if(value)beta[at]=10;});
 const choice=decide(band,weights,{beta,scale:beta.map(()=>1)},0.05);
 assert.equal(choice,'v2');
 const judged=judge({...exampleFrom({keyA:'v2',keyB:'alt',y:-1,n:32,band,game:'g'},weights),band},weights,{beta,scale:beta.map(()=>1)},0.05);
 assert.equal(judged.kind,'stay');
});

test('an unevidenced third action is not counted as zero gain',()=>{
 const summary=summarize([
  {game:'known',kind:'verified',gain:0.2},
  {game:'missing',kind:'unknown',gain:null},
  {game:'known',kind:'stay',gain:null}
 ]);
 assert.equal(summary.unknown,1);
 assert.equal(summary.unknownGames,1);
 assert.equal(summary.identifiedGames,1);
 assert.ok(Math.abs(summary.gain.mean-0.1)<1e-12);
});

test('equal training utility keeps v2',()=>{
 const choice=chooseThreshold([
  {threshold:0.02,eligible:true,utility:0},
  {threshold:ALWAYS,eligible:true,utility:0}
 ]);
 assert.equal(choice.threshold,ALWAYS);
 const blocked=positiveSignal({threshold:ALWAYS,summary:{unknown:0,verified:0,effective:0,reverse:0,gain:{low:0}},safetyOk:true});
 assert.equal(blocked,false);
});
