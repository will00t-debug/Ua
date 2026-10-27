// Per-deck results for this browser. UNION ARENA matches do not draw.
// Records are keyed by a stable deck id, never by the display name.
export const DECK_RECORD_KEY='ua-deck-records-v1';

function blank(){
 return {ai:{wins:0,losses:0},online:{wins:0,losses:0},recent:[]};
}
function count(value){
 const n=Number(value);
 return Number.isInteger(n)&&n>=0?n:0;
}
function side(raw){
 return {wins:count(raw?.wins),losses:count(raw?.losses)};
}
function cleanRow(raw){
 if(!raw||typeof raw!=='object')return blank();
 const recent=Array.isArray(raw.recent)?raw.recent.filter(item=>item&&(item.result==='win'||item.result==='loss')&&(item.channel==='ai'||item.channel==='online')).slice(-12):[];
 return {ai:side(raw.ai),online:side(raw.online),recent};
}
export function readRecords(storage){
 try{
  const raw=JSON.parse(storage?.getItem(DECK_RECORD_KEY)||'{}');
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw).filter(([id])=>typeof id==='string'&&id.length>0&&id.length<=80).map(([id,row])=>[id,cleanRow(row)]));
 }catch{return {};}
}
export function readDeckRecord(storage,deckId){
 if(typeof deckId!=='string'||!deckId)return blank();
 return readRecords(storage)[deckId]||blank();
}
export function recordDeckResult(storage,{deckId,channel,win,at,opponent}={}){
 if(!storage||typeof deckId!=='string'||deckId.length<1||deckId.length>80)return null;
 if(channel!=='ai'&&channel!=='online')return null;
 if(typeof win!=='boolean')return null;
 const all=readRecords(storage);
 const row=all[deckId]||blank();
 const bucket=side(channel==='ai'?row.ai:row.online);
 if(win)bucket.wins+=1;else bucket.losses+=1;
 const recent=[...row.recent,{
  at:typeof at==='string'&&at?at:new Date().toISOString(),
  channel,result:win?'win':'loss',
  opponent:typeof opponent==='string'?opponent.slice(0,40):''
 }].slice(-12);
 const next={
  ai:channel==='ai'?bucket:side(row.ai),
  online:channel==='online'?bucket:side(row.online),
  recent
 };
 all[deckId]=next;
 storage.setItem(DECK_RECORD_KEY,JSON.stringify(all));
 return next;
}
export function tally(record,view='all'){
 const ai=side(record?.ai),online=side(record?.online);
 const wins=(view==='online'?0:ai.wins)+(view==='ai'?0:online.wins);
 const losses=(view==='online'?0:ai.losses)+(view==='ai'?0:online.losses);
 const games=wins+losses;
 return {wins,losses,games,rate:games?wins/games*100:null};
}
export function formatRate(stat){
 if(!stat?.games)return '尚無戰績';
 const rounded=Math.round(stat.rate*10)/10;
 return (Number.isInteger(rounded)?String(rounded):rounded.toFixed(1))+'%';
}
export function recentMatches(records,limit=8){
 const rows=[];
 for(const [deckId,record] of Object.entries(records||{})){
  for(const item of record.recent||[])rows.push({deckId,...item});
 }
 rows.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 return rows.slice(0,limit);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function renderDeckRecord({record,view='all'}={}){
 const views=[['all','全部戰績'],['ai','電腦對戰'],['online','線上對戰']];
 const stat=tally(record,view==='ai'||view==='online'?view:'all');
 const rows=(record?.recent||[]).filter(item=>view==='all'||item.channel===view).slice(-6).reverse();
 const chips=views.map(([id,label])=>`<button type="button" data-record-view="${id}" class="${view===id?'active':''}" aria-pressed="${view===id}">${label}</button>`).join('');
 const history=rows.length?rows.map(item=>`<li><b>${item.result==='win'?'勝':'敗'}</b><span>${item.channel==='ai'?'電腦對戰':'線上對戰'}</span><span>${esc(item.opponent||'')}</span></li>`).join(''):'<li class="arena-empty">尚無戰績</li>';
 return `<section class="arena-record" aria-label="牌組戰績"><h3>戰績</h3><div class="arena-record-views">${chips}</div><p class="arena-rate"><strong>${esc(formatRate(stat))}</strong><span>${stat.games?stat.wins+' 勝 '+stat.losses+' 敗 · '+stat.games+' 場':'沒有對戰紀錄'}</span></p><ul class="arena-record-list">${history}</ul></section>`;
}
