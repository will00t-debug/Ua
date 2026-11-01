// Post-match sandbox. It replays a copy of the marked position and never
// writes back into the live match. The AI hand is shown only here.
import {legalUniversalActions} from './engine.mjs';
import {uiActionLabel} from './preview-actions.mjs';
import {COACH_REASONS,stateAtReplayIndex,coachObservation,pushSandbox,buildAiDemonstration} from './coach-record.mjs';

function h(tag,className,text){
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!=null)node.textContent=text;
 return node;
}
function cardName(packs,cardId){
 return packs?.[1]?.cards?.[cardId]?.name||cardId;
}

export function coachLiveNote(count){
 const note=h('p','coach-live-note',count?'已標 '+count:'');
 note.title=count
  ?'已標記 '+count+' 步。電腦手牌會在對局結束後的檢討畫面才顯示。'
  :'可以標記電腦剛走的那一步，賽後再改。';
 note.dataset.coachLive='1';
 if(!count)note.hidden=true;
 return note;
}

export function mountCoachReview(parent,{packs,replay,marks,onSave}){
 parent.replaceChildren();
 const section=h('section','coach-review panel');
 section.append(
  h('h2',null,'賽後教 AI'),
  h('p','coach-review-note','這裡使用獨立重播。修改不會寫回剛才的對局。保存後的 AI 不會立刻變強。'));
 if(!marks.length)section.append(h('p',null,'這場還沒有標記電腦的步驟。'));
 marks.forEach((mark,index)=>{
  const origin=stateAtReplayIndex(packs,replay,mark.replayIndex);
  const opening=coachObservation(packs,origin,1);
  const legal=legalUniversalActions(packs,origin).map(action=>structuredClone(action));
  let cursor=origin;
  let taken=[];
  const hand=h('div','coach-hand');
  const legalBox=h('div','coach-legal');
  const sequence=h('ol','coach-sequence');
  const reason=document.createElement('select');
  reason.className='coach-reason';
  for(const [value,label] of COACH_REASONS){
   const option=document.createElement('option');
   option.value=value;option.textContent=label;reason.append(option);
  }
  const status=h('p','coach-save-status','');
  function showHand(state){
   let observation=opening;
   try{observation=coachObservation(packs,state,1);}catch{/* A finished sandbox keeps the opening view. */}
   const cards=observation.visible.players[1].hand||[];
   hand.replaceChildren(h('strong',null,'電腦當時看得到的手牌'));
   const row=h('div','coach-hand-row');
   for(const card of cards)row.append(h('span','coach-chip',cardName(packs,card.cardId)));
   if(!cards.length)row.append(h('span',null,'沒有手牌'));
   hand.append(row,h('p','coach-position',
    '第 '+observation.visible.turn+' 回合 · '+observation.visible.phase+
    ' · 生命 '+observation.visible.players[0].lifeCount+' / '+observation.visible.players[1].lifeCount));
  }
  function draw(){
   showHand(cursor);
   legalBox.replaceChildren();
   const actions=taken.length>=8?[]:legalUniversalActions(packs,cursor);
   if(!actions.length)legalBox.append(h('p',null,taken.length?'這段示範已停止。':'目前沒有合法操作。'));
   for(const action of actions){
    const button=h('button','btn small',uiActionLabel(action,{pack:packs,state:cursor}));
    button.type='button';
    button.addEventListener('click',()=>{
     const label=uiActionLabel(action,{pack:packs,state:cursor});
     try{
      cursor=pushSandbox(packs,cursor,action);
      taken=[...taken,{action:structuredClone(action),label}];
      status.textContent='';
      draw();
     }catch(error){status.textContent=error?.message||'這步不能加入示範。';}
    });
    legalBox.append(button);
   }
   sequence.replaceChildren(...taken.map(item=>h('li',null,item.label)));
  }
  const article=h('article','coach-mark');
  article.dataset.coachMark=String(mark.replayIndex);
  article.append(
   h('h3',null,'標記 '+(index+1)+' · 電腦的第 '+(mark.step+1)+' 步'),
   h('p',null,'電腦原本的選擇：'+uiActionLabel(mark.action,{pack:packs,state:origin})),
   hand,h('h4',null,'改成'),legalBox,h('h4',null,'示範序列'),sequence,reason,status);
  const save=h('button','btn primary','保存這段示範');
  save.type='button';
  save.addEventListener('click',async()=>{
   try{
    const body=buildAiDemonstration({
     ...mark.header,format:'ua-v2-coach-demo-v1',step:mark.step,replayIndex:mark.replayIndex,
     seat:1,observation:opening,legal,original:structuredClone(mark.action),
     clientKey:mark.header.matchId+':ai:'+mark.replayIndex
    },taken.map(item=>item.action),reason.value);
    status.textContent='保存中…';
    await onSave(body);
    status.textContent='已保存。';
   }catch(error){status.textContent=error?.message||'沒有保存。';}
  });
  const reset=h('button','btn small','重來這段示範');
  reset.type='button';
  reset.addEventListener('click',()=>{
   cursor=origin;taken=[];status.textContent='';draw();
  });
  article.append(save,reset);
  section.append(article);
  draw();
 });
 parent.append(section);
}
