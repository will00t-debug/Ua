import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 AI_PLAYBACK_FAST_KEY,AI_FAST_FRAME_MS,AI_STANDARD_FRAME_MS,AI_FAST_RENDER_EVERY,
 aiPlaybackDelayMs,shouldRenderAiStep
} from '../dist/universal-v2/ai-playback-speed.mjs';

const state=(patch={})=>({
 status:'playing',turn:3,phase:'main',active:1,pending:null,
 ...patch
});

test('fast AI pacing removes UI delay but leaves inference limits untouched',()=>{
 assert.equal(aiPlaybackDelayMs(true),0);
 assert.equal(aiPlaybackDelayMs(false),16);
 assert.equal(AI_STANDARD_FRAME_MS,16);
 assert.equal(AI_FAST_FRAME_MS,0);
 assert.equal(AI_FAST_RENDER_EVERY,3);
 assert.equal(AI_PLAYBACK_FAST_KEY,'ua-ai-fast-playback-v1');
 const script=readFileSync('dist/universal-v2-preview.mjs','utf8');
 assert.match(script,/AI 出牌：/);
 assert.match(script,/aiPlaybackDelayMs\(fastAiPlayback\)/);
 assert.match(script,/shouldRenderAiStep\(\{fast:fastAiPlayback,count:app.autoMoves,before:decision,after:app.state\}\)/);
 assert.match(script,/nodes:MATCH_LIMITS.nodes,ms:MATCH_LIMITS.ms/);
 assert.match(script,/specialist\?4500:700/);
 // Neither search nodes, the AI policy, nor its worker deadlines are
 // parameterized by the display speed state.
 assert.doesNotMatch(script,/nodes:fastAiPlayback|ms:fastAiPlayback|hardCap:fastAiPlayback/);
});

test('fast mode coalesces only uneventful, same-phase AI render frames',()=>{
 const before=state();
 const after=state();
 assert.equal(shouldRenderAiStep({fast:false,count:1,before,after}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after}),false);
 assert.equal(shouldRenderAiStep({fast:true,count:2,before,after}),false);
 assert.equal(shouldRenderAiStep({fast:true,count:3,before,after}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after:state({phase:'attack'})}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after:state({turn:4})}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after:state({active:0})}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after:state({pending:{kind:'chooseBlock',player:1}})}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after:state({status:'finished'})}),true);
 assert.equal(shouldRenderAiStep({fast:true,count:1,before,after:state({pending:{kind:'choice',player:0}})}),true);
});
