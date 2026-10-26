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
