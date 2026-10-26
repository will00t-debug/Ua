// R45 strict eligibility-only calculation for source-specific hand-discard
// selection costs. NOT a second chooser/payment engine; the V2 pending /
// effectQueue integration is intentionally gated until atomic payment,
// mandatory EVENT preflight and saved-pending provenance are implemented.
// Official Japanese SAO-1-087 Q978 / SAO-2-064 Q1208.
import {cardHasName} from './field-conditions.mjs';

const uidOwner=uid=>{
 const m=/^([01])-\d+$/.exec(uid||'');
 return m?Number(m[1]):null;
};
const board=p=>[...p.front,...p.energy].filter(Boolean);
function printed(pack,c){
 const owner=uidOwner(c?.uid);
 return owner===null?null:(Array.isArray(pack)?pack[owner]:pack)?.cards?.[c.cardId]||null;
}
const allowedSources=new Set(['character','event']);

// These profiles must be authored and source-pinned in a registered card
// definition. In particular: a Trigger is not an EVENT just because its
// physical card is an EVENT. Never infer a tax from translated prose.
export function validateSelectionHandTaxProfile(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||
  !['self','grantNamed'].includes(x.scope)||
  !['field','front'].includes(x.sourceLine)||
  x.period!=='opponentTurn'||
  !Array.isArray(x.sourceTypes)||!x.sourceTypes.length||
  x.sourceTypes.length>2||new Set(x.sourceTypes).size!==x.sourceTypes.length||
  !x.sourceTypes.every(t=>allowedSources.has(t))||
  x.count!==1||x.stackPolicy!=='nonstackSameGroup'||
  typeof x.stackGroup!=='string'||!x.stackGroup.trim()||x.stackGroup.length>80||
  (x.scope==='self'&&x.name!==null)||
  (x.scope==='grantNamed'&&(typeof x.name!=='string'||!x.name.trim()||
    x.name.length>80))||
  Object.keys(x).length!==8||
  Object.keys(x).some(k=>!['scope','sourceLine','period','sourceTypes','count',
    'stackPolicy','stackGroup','name'].includes(k)))
  throw Error('Unsupported source-specific selection hand-discard tax profile');
 return true;
}
export const SAO_Q978_SELF_EVENT_TAX=Object.freeze({
 scope:'self',sourceLine:'field',period:'opponentTurn',sourceTypes:['event'],
 count:1,stackPolicy:'nonstackSameGroup',stackGroup:'SAO-1-087',name:null
});
export const SAO_Q1208_ASUNA_AURA=Object.freeze({
 scope:'grantNamed',sourceLine:'front',period:'opponentTurn',
 sourceTypes:['character','event'],count:1,
 stackPolicy:'nonstackSameGroup',stackGroup:'SAO-2-064',name:'アスナ'
});
validateSelectionHandTaxProfile(SAO_Q978_SELF_EVENT_TAX);
validateSelectionHandTaxProfile(SAO_Q1208_ASUNA_AURA);

// Pure defensive plan for reuse by the EXISTING legal target selector.
// Returns fail-closed blocked=true when different groups might stack;
// no printed source here authorizes a guess about combining distinct taxes.
// No mutations; no card is charged or newly playable by this module.
export function selectionHandDiscardTaxPlan(pack,s,selector,targetUid,sourceType,
 {isSuppressed=()=>false}={}){
 if(![0,1].includes(selector)||typeof targetUid!=='string'||
  !['character','event','trigger','field','unknown'].includes(sourceType)||
  !s||![0,1].includes(s.active)||!Array.isArray(s.players)||s.players.length!==2)
  throw Error('Invalid selection tax context');
 const victim=1-selector;
 const target=board(s.players[victim]).find(c=>c.uid===targetUid);
 // Q978 and Q1208 name character and event selections. A trigger is a timing,
 // and a field is its own printed type, so neither pays this hand tax.
 if(!target||sourceType==='trigger'||sourceType==='field')
  return {cost:0,payable:true,blocked:false,sourceUids:[]};
 const live=board(s.players[victim]),sources=[];
 for(const source of live){
  const d=printed(pack,source),rule=d?.selectionHandDiscardTax;
  if(!rule||isSuppressed(s,source))continue;
  validateSelectionHandTaxProfile(rule);
  if(s.active!==selector||!rule.sourceTypes.includes(sourceType)||
    rule.sourceLine==='front'&&
     !s.players[victim].front.some(c=>c?.uid===source.uid))continue;
  if(rule.scope==='self'&&source.uid!==targetUid)continue;
  if(rule.scope==='grantNamed'&&!cardHasName(printed(pack,target),rule.name))continue;
  // A live source belongs to its physical owner and present incarnation.
  if(uidOwner(source.uid)!==victim||
   !Number.isInteger(source.fieldEntryStamp)||source.fieldEntryStamp<1||
   !Number.isInteger(target.fieldEntryStamp)||target.fieldEntryStamp<1)
   throw Error('Invalid physical field stamp for selection tax');
  sources.push({uid:source.uid,stamp:source.fieldEntryStamp,group:rule.stackGroup});
 }
 if(!sources.length)return {cost:0,payable:true,blocked:false,sourceUids:[]};
 const groups=new Set(sources.map(x=>x.group));
 // Official Q1208 says duplicate SAO-2-064 sources cost ONE, not two.
 const blocked=groups.size!==1||sourceType==='unknown';
 return {cost:blocked?0:1,
  payable:!blocked&&s.players[selector].hand.length>=1,
  blocked,sourceUids:sources.map(x=>x.uid)};
}
