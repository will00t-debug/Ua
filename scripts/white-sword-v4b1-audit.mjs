#!/usr/bin/env node
// Offline feasibility audit. Replays saved coordinates only. No new matches.
import {mkdirSync,writeFileSync} from 'node:fs';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {cloneModel,loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {choiceKey} from '../training/white-sword-ai/v4a/lib/diverge.mjs';
import {readJson} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {analyzeSaved} from '../training/white-sword-ai/v4b1/lib/audit.mjs';
import {policyAfter,selection} from '../training/white-sword-ai/v4b1/lib/feasibility.mjs';
import {renderAudit} from '../training/white-sword-ai/v4b1/lib/report.mjs';

const ROOT='training/white-sword-ai/v4b';
const model=loadModel('training/white-sword-ai/weights/v2-capped.json');
const saved=readJson(ROOT+'/report.json');
const cards=new Map((saved.preferences||[]).map(row=>[row.id,{preferred:row.preferredCard}]));
const audit=analyzeSaved(ROOT);
const cache=new Map();

function cardOf(state,action){
 const uid=action?.uid;
 if(!uid)return null;
 for(const player of state.players){
  for(const zone of ['hand','front','energy','outside','removed','life','deck']){
   const card=(player[zone]||[]).find(item=>item?.uid===uid);
   if(card?.cardId)return card.cardId;
  }
 }
 return null;
}
function replay(position){
 if(!cache.has(position.id))cache.set(position.id,replayState(position));
 return cache.get(position.id);
}
function live(position,policy){
 const viewed=replay(position);
 const next=cloneModel(model);
 next.policy=policy.slice();
 next.promoted=false;
 const picked=chooseWhiteSwordAction(viewed.packs,cloneMatch(viewed.state),{
  actor:position.actor,model:next,mode:'blend',scale:6,hardCap:7,explore:0,seed:position.seed
 });
 return {key:choiceKey(picked.action),card:cardOf(viewed.state,picked.action)};
}
for(const row of audit.rows){
 const position=audit.byId.get(row.id);
 const stored=selection(position.band,audit.before);
 const v2=live(position,audit.before);
 const maximalPolicy=row.verdict.oneDelta?policyAfter(audit.before,row.verdict.oneDelta):audit.before.slice();
 const widePolicy=row.verdict.wideDelta?policyAfter(audit.before,row.verdict.wideDelta):maximalPolicy;
 const maximal=live(position,maximalPolicy);
 const wide=live(position,widePolicy);
 const original=live(position,row.methods[0].policy);
 const named=live(position,row.methods[1].policy);
 row.card=cards.get(row.id)?.preferred||null;
 row.live={
  v2:v2.key,v2Card:v2.card,stored,agree:v2.key===stored,
  maximal:maximal.key,maximalCard:maximal.card,
  wide:wide.key,wideCard:wide.card,wideIsPreferred:wide.key===row.preferredKey,
  original:original.key,named:named.key,
  maximalIsPreferred:maximal.key===row.preferredKey,
  originalIsPreferred:original.key===row.preferredKey,
  namedIsPreferred:named.key===row.preferredKey
 };
 delete row.verdict.oneDelta;
 delete row.verdict.wideDelta;
 for(const method of row.methods)delete method.policy;
}
const known=new Map();
for(const group of [saved.learning?.selectedChoices,saved.learning?.untouchedChoices]){
 for(const row of group?.rows||[]){
  if(row.beforeCard)known.set(row.id+'\0'+row.before,row.beforeCard);
  if(row.afterCard)known.set(row.id+'\0'+row.after,row.afterCard);
 }
}
const positions=new Map();
for(const file of ['selected.json','pool.json']){
 const body=readJson(ROOT+'/'+file,{positions:[]});
 for(const position of body.positions||[])positions.set(position.id,position);
}
for(const row of audit.rows){
 for(const method of row.methods){
  for(const change of [...(method.collateralSelectedRows||[]),...(method.collateralPoolRows||[])]){
   change.beforeCard=known.get(change.id+'\0'+change.before)||null;
   change.afterCard=known.get(change.id+'\0'+change.after)||null;
   if(change.beforeCard&&change.afterCard)continue;
   const position=positions.get(change.id);
   if(!position)continue;
   const viewed=replay(position);
   const uidOf=key=>{try{return JSON.parse(key).uid||null;}catch{return null;}};
   if(!change.beforeCard)change.beforeCard=cardOf(viewed.state,{uid:uidOf(change.before)});
   if(!change.afterCard)change.afterCard=cardOf(viewed.state,{uid:uidOf(change.after)});
  }
 }
}
const payload={
 codeVersion:'v4b1-1',
 games:0,
 rows:audit.rows,
 selected:audit.selected,
 pool:audit.pool
};
mkdirSync('docs/white-sword-ai/v4b1',{recursive:true});
mkdirSync('training/white-sword-ai/v4b1',{recursive:true});
const text=renderAudit(payload);
writeFileSync('docs/white-sword-ai/v4b1/feasibility.md',text);
writeFileSync('training/white-sword-ai/v4b1/feasibility.md',text);
writeFileSync('training/white-sword-ai/v4b1/feasibility.json',JSON.stringify(payload,null,2)+'\n');
process.stdout.write(text);
