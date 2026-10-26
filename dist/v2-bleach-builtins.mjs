// Original user-specified BLEACH decks. One source of truth for V2 combat
// previews and the picture-style deck builder: no retyping or changing counts.
import {DESIGNATED_BLEACH_DECKS} from './universal-v2/bleach-designated-decks.mjs';
import {normalizeEditorCounts,editorV2Status} from './v2-editor-compat.mjs';

function verifiedPreset(row){
 const counts={};
 for(const {cardId,source,copies,sourcePinned} of row.entries){
  if(!sourcePinned||!source.endsWith('/'+cardId))
   throw Error('Designated BLEACH original print mismatch: '+source);
  if(Object.hasOwn(counts,cardId))throw Error('Designated BLEACH duplicate card: '+cardId);
  if(!Number.isInteger(copies)||copies<1||copies>4)throw Error('Designated BLEACH invalid copies: '+source);
  counts[cardId]=copies;
 }
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 if(total!==50)throw Error('Designated BLEACH deck does not contain 50 cards: '+row.name);
 const normalized=normalizeEditorCounts('bleach',counts);
 const report=editorV2Status('bleach',normalized);
 const missing=row.entries.filter(e=>!report.supported.has(e.cardId));
 return Object.freeze({
  id:row.key,name:row.name,color:row.color,colorLabel:row.colorLabel,
  displayName:row.colorLabel+'色「'+row.name+'」',counts:Object.freeze(normalized),
  sources:Object.freeze(row.entries.map(e=>Object.freeze({id:e.cardId,source:e.source,copies:e.copies}))),
  total,kinds:row.entries.length,registeredKinds:row.entries.length-missing.length,
  missingIds:Object.freeze(missing.map(e=>e.cardId)),ready:report.ready,
  issues:Object.freeze([...report.issues])
 });
}

export const BUILTIN_BLEACH_V2_DECKS=Object.freeze(DESIGNATED_BLEACH_DECKS.map(verifiedPreset));
export function builtinBleachDeck(id){return BUILTIN_BLEACH_V2_DECKS.find(row=>row.id===id)||null;}

export function renderBuiltinBleachPanel(escapeHtml){
 const cards=BUILTIN_BLEACH_V2_DECKS.map(d=>{
  const status=d.ready?'✓ 可以在 V2 正式對戰':'V2 已登錄 '+d.registeredKinds+'/'+d.kinds+' 種，尚缺 '+d.missingIds.length+' 種效果';
  return `<article class="v2e-designated-card ${d.color}"><small>${escapeHtml(d.colorLabel)}色 · ${d.total} 張 · ${d.kinds} 種</small><h3>${escapeHtml(d.name)}</h3><p class="${d.ready?'v2e-okay':'v2e-pending'}">${escapeHtml(status)}</p><button type="button" data-designated-preset="${escapeHtml(d.id)}">載入這副牌組</button></article>`;
 }).join('');
 return `<section class="v2e-designated" aria-label="BLEACH 三副指定牌組"><div class="v2e-designated-head"><h2>你之前提供的三副牌組</h2><p>原始 50 張卡號與數量完整保留。載入後可查看卡圖、修改與另存。</p></div><div class="v2e-designated-grid">${cards}</div></section>`;
}
