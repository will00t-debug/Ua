// Normalized read-only view models for the cross-title deck library.
// Never mutate local drafts or cloud records while preparing a list.
const nonnegativeCount = counts => Object.values(counts||{}).reduce((n,value)=>{
 const count=Number(value);return n+(Number.isInteger(count)&&count>0?count:0);
},0);
const updatedSort=(a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));

export function buildDeckLibrary({titles=[],savedData={},draftData={},names={},
 cloudDecks=[],cloudUser=null,tab='mine',sharedIds=new Set(),builtins=[],
 summarize,formatUpdated}={}){
 const catalog=new Map(titles.map(title=>[title.id,title]));
 const summarizeFor=(title,counts,coverId)=>{
  const group=catalog.get(title);
  if(!group||!counts||typeof counts!=='object')return null;
  return summarize(group.cards,counts,coverId);
 };
 const item=(key,title,name,counts,updatedAt,coverId,extra='')=>{
  const summary=summarizeFor(title,counts,coverId);
  if(!summary)return null;
  const label=catalog.get(title)?.label||title;
  return {key,name:String(name||'未命名牌組'),cover:summary.cover,
   time:updatedAt?formatUpdated(updatedAt,Date.now(),'relative'):'尚未記錄更新時間',
   meta:label+' · '+summary.total+'/50 張'+(extra?' · '+extra:'')};
 };
 const sections=[];
 const cloud=Array.isArray(cloudDecks)?cloudDecks.filter(deck=>deck&&typeof deck.id==='string'
  &&/^d[a-f0-9]{16}$/.test(deck.id)&&catalog.has(deck.title)):[];
 const cloudItems=cloud.filter(deck=>tab!=='shared'||sharedIds.has(deck.id))
  .sort(updatedSort).map(deck=>item('cloud:'+deck.id,deck.title,deck.name,deck.counts,
   deck.updatedAt,deck.coverId||null,deck.playable===true?'V2 可對戰':'尚未符合 V2')).filter(Boolean);
 if(cloudUser)sections.push({title:tab==='shared'?'帳號分享列表':'帳號牌組',
  empty:tab==='shared'?'還沒有公開的帳號牌組。':'帳號裡還沒有儲存的牌組。',items:cloudItems});
 const cloudLocalKeys=new Set(cloud.map(deck=>deck.localId).filter(id=>typeof id==='string'&&id));
 const locals=[];
 for(const t of titles){
  const decks=Array.isArray(savedData[t.id])?savedData[t.id]:[];
  for(let i=0;i<decks.length;i++){
   const row=decks[i];
   if(!row||!row.counts||cloudLocalKeys.has(row.id))continue;
   if(tab==='shared'&&row.shared!==true)continue;
   const key='saved:'+encodeURIComponent(t.id)+':'+encodeURIComponent(row.id||'@'+i);
   const record=item(key,t.id,row.name,row.counts,row.updatedAt,row.coverId,'本機儲存');
   if(record)locals.push({...record,updatedAt:row.updatedAt});
  }
 }
 locals.sort(updatedSort);
 sections.push({title:tab==='shared'?'本機分享列表':'本機牌組',
  empty:tab==='shared'?'還沒有分享的本機牌組。':'還沒有儲存牌組，按上方「建立新牌組」即可開始。',items:locals});
 if(tab==='mine'){
  const drafts=titles.flatMap(t=>{
   if(nonnegativeCount(draftData[t.id])===0)return [];
   const record=item('draft:'+encodeURIComponent(t.id),t.id,names[t.id]||t.label+' 草稿',
    draftData[t.id],null,null,'未儲存草稿');
   return record?[record]:[];
  });
  if(drafts.length)sections.push({title:'編輯中的草稿',items:drafts});
  const examples=builtins.flatMap(preset=>{
   const record=item('builtin:'+encodeURIComponent(preset.id),'bleach',preset.displayName,
    preset.counts,null,null,'內建示範');
   return record?[{...record,time:'官方卡表組成的指定牌組'}]:[];
  });
  if(examples.length)sections.push({title:'內建範例牌組',items:examples});
 }
 return sections;
}
