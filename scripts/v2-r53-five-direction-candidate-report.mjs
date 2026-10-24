#!/usr/bin/env node
// R53: one authority for each source ID remains R35 index / live five-title
// registry. Printed text hits are REVIEW PENDING, never automatically READY.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r52ConditionalFiveTitleRescan} from './v2-r52-conditional-outside-candidate-report.mjs';

const PROBES=Object.freeze({
 'TTG-1-067':{
  source:'UA56BT/TTG-1-067',faq:['Q2295'],
  missing:['ACTIVE enter and BP>=4000 block exclusion','onPlay time-limited sniper',
   'onPlay attack battle win draw','ACTIVE LIFE BP+3000 and real 50-card cross-match']},
 'SLG-1-021':{
  source:'UA51BT/SLG-1-021',faq:['Q2028'],
  missing:['live OUTSIDE floor(count/5) AT ATTACK temporary BP',
   'battle-win optional outside recover non-Sung card, printed BP cutoff 2000+500*floor(count/5)',
   'BP6000 IMPACT1','onPlay temporary mandatory block if legal','RAID and RAID LIFE full-test']},
 'MST-1-009':{
  source:'UA54BT/MST-1-009',faq:['Q2147'],
  missing:['own-effect-entry-only mandatory chooseOne',
   'until next own turn start self BP+1000',
   'this-turn source-stamped optional attack-end swap for one own ENERGY character',
   'own-turn BP+500, Raid and RAID LIFE integrated true 50-card test']},
 'SAO-1-071':{
  source:'UA15BT/SAO-1-071',faq:[],
  missing:['4 named OUTSIDE temporary optional draw on attack',
   '6 named OUTSIDE own-turn BP+1000 plus direct damage(2) independently',
   '8 named OUTSIDE opponent block BP<=3000 exclusion',
   'RAID and RAID LIFE, legal 8 source cards from actual gameplay']}
});
const R53_SAO_R52_IDS=Object.freeze(['SAO-1-071','SAO-1-083','SAO-2-001',
 'SAO-2-002','SAO-2-009','SAO-2-020','SAO-2-031','SAO-2-032',
 'SAO-2-036','SAO-2-049','SAO-2-062','SAO-2-063']);
export function r53FiveDirectionLiveAudit(){
 const inv=v2AllTitleInventory(),index=capabilityIndex(inv);
 const rest=index.cards.filter(c=>!c.registered),registered=index.cards.filter(c=>c.registered);
 const ids=new Set(inv.series.flatMap(r=>r.unportedIds));
 if(index.cards.length!==700||inv.series.length!==5||rest.length!==ids.size||
  registered.length+rest.length!==700||rest.some(c=>!ids.has(c.id)))
  throw Error('R53 live 700-source complement drift');
 const past=r52ConditionalFiveTitleRescan();
 if(past.report.unportedSearched!==rest.length)
  throw Error('R53 historic R52 conditional probe stale');
 const focused=Object.entries(PROBES).map(([id,profile])=>{
  const card=index.cards.find(c=>c.id===id);
  if(!card)throw Error('R53 official candidate missing identity: '+id);
  if(!card.sourceText?.length)throw Error('R53 official candidate missing source: '+id);
  return {id,title:card.title,status:card.registered?'REGISTERED':'PARTIAL',
   source:profile.source,faq:profile.faq,
   missing:card.registered?[]:profile.missing};
 });
 const sao=R53_SAO_R52_IDS.map(id=>({
  id,registered:registered.some(c=>c.id===id),
  status:registered.some(c=>c.id===id)?'REGISTERED':'REVIEW PENDING'
 }));
 if(sao.filter(x=>x.registered).length!==2||
  !sao.find(x=>x.id==='SAO-2-063')?.registered||
  !sao.find(x=>x.id==='SAO-1-071')?.registered)
  throw Error('R53 SAO named source audit drift');
 const candidates=past.candidates.filter(c=>ids.has(c.id));
 const unreviewed=candidates.filter(c=>!focused.some(f=>f.id===c.id));
 const report={catalogue:700,titles:5,registered:registered.length,
  unportedSearched:rest.length,officialReviewedPartial:focused.filter(x=>x.status==='PARTIAL').length,
  officialReviewedRegistered:focused.filter(x=>x.status==='REGISTERED').length,
  r52TextCandidates:candidates.length,saoReviewedFromPriorR52:12,
  readyInferredFromText:0,
  crossTitleSharedAtoms:['ownOutsideNamedCountAtLeast',
   'drawIfOwnOutsideNamedCountAtLeast','countOwnOutsidePhysicalGroups',
   'conditionalBounceOrRetireByOwnOutsideNames','battle-win','phase-end-swap'],
  byTitle:Object.fromEntries(inv.series.map(s=>[s.title,{
   registered:s.pilotImplemented,unported:s.blocked,
   r52TextCandidates:candidates.filter(c=>c.title===s.title).length
  }]))};
 if(report.registered+report.unportedSearched!==700||
  focused.some(c=>c.status==='PARTIAL'&&!ids.has(c.id))||
  Object.values(report.byTitle).reduce((n,s)=>n+s.unported,0)!==rest.length)
  throw Error('R53 5-title physical catalogue conservation');
 return {report,focused,sao,unreviewed};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=r53FiveDirectionLiveAudit();
 console.log('R53_FIVE_DIRECTIONS '+JSON.stringify(x.report));
 console.log('R53_OFFICIAL_PARTIAL '+JSON.stringify(x.focused));
 console.log('R53_SAO_PRIOR_R52 '+JSON.stringify(x.sao));
 console.log('R53_TEXT_REVIEW_PENDING '+JSON.stringify(x.unreviewed));
}
