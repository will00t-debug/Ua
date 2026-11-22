// Pure AI playback pacing: does not control search nodes, policies, or timers
// that bound inference. The fast route yields back to the event loop after
// every action; it never blocks through a whole AI turn.
export const AI_PLAYBACK_FAST_KEY='ua-ai-fast-playback-v1';
export const AI_STANDARD_FRAME_MS=16;
export const AI_FAST_FRAME_MS=0;
export const AI_FAST_RENDER_EVERY=3;
export function aiPlaybackDelayMs(fast){
 return fast?AI_FAST_FRAME_MS:AI_STANDARD_FRAME_MS;
}
export function shouldRenderAiStep({fast=false,count=0,before=null,after=null}={}){
 if(!fast||!before||!after)return true;
 if(after.status!=='playing'||(after.pending?.player??after.active)!==1)return true;
 if(before.turn!==after.turn||before.active!==after.active||before.phase!==after.phase
  ||before.pending?.kind!==after.pending?.kind)return true;
 return count%AI_FAST_RENDER_EVERY===0;
}
