#!/usr/bin/env node
// [V2-E] Independent, fail-closed catalog coverage report.
// Execute only from one pinned checkout: node scripts/v2-audit-catalog.mjs
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {CARDS} from '../dist/cards.mjs';
import {TTG_CARDS} from '../dist/ttg-builder.mjs';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {UA54BT_VERIFIED} from '../dist/mushoku-tensei.mjs';
import {SAO_CARDS} from '../dist/sao-cards.mjs';
import {REAL_V2_PILOT_IDS,verifiedPilotPack} from '../dist/universal-v2/real-card-pilots.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS,TTG_RED_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';

const SOURCE_V2_SHA='ad04bef572303e8af1084ae1fb5cb431af9e7a11';
const root=path.resolve(import.meta.dirname,'..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
const dirty=git('status','--porcelain','--','dist','tests','scripts').length>0;
if(dirty)throw Error('Audit refuses dirty tracked engine/tests/scripts checkout');
const catalogues=[
 ['bleach',CARDS],
 ['gurren-lagann',TTG_CARDS],
 ['solo-leveling',SOLO_LEVELING_CARDS],
 ['mushoku-tensei',UA54BT_VERIFIED],
 ['sword-art-online',SAO_CARDS]
];
const legalType=c=>!['ap','action_point'].includes(String(c.type||'').toLowerCase())
 && !/(?:^|[-_/])AP[0-9]+$/i.test(String(c.id||''));
const pilotByTitle=new Map(Object.entries(REAL_V2_PILOT_IDS).map(([title,ids])=>[title,new Set(ids)]));
const packs=new Map([...pilotByTitle.keys()].map(title=>[title,verifiedPilotPack(title)]));
const previewByTitle=new Map([
 ['bleach',new Set(Object.keys(BLEACH_PURPLE_V2_PILOT_COUNTS))],
 ['gurren-lagann',new Set(Object.keys(TTG_RED_V2_PILOT_COUNTS))]
]);
const tests=fs.readdirSync(path.join(root,'tests')).filter(x=>/^universal-v2-.*\.test\.mjs$/.test(x));
const testTexts=tests.map(name=>({name,text:fs.readFileSync(path.join(root,'tests',name),'utf8')}));
const cols=[
 'title','id','number','name','type','color','energy','ap','bp','gen',
 'trigger','source','data_complete','missing_fields','has_effect_text',
 'printed_ability_segments','printed_ability_text','raid_printed',
 'v2_registered','v2_implementation','v2_effects','trigger_encoded',
 'raid_encoded','candidate_v2_test_files','all_abilities_accepted',
 'core_gap','in_integrated_preview_deck','end_to_end_passed',
 'playable_in_integrated_v2','status','audit_source_commit'
];
const missingFields=c=>{
 const absent=[];
 for(const k of ['name','type','color','energy','ap','bp','gen']){
  // Events/fields have no printed BP in the official table; null means N/A,
  // not that the card's source data is absent. V2 pack must adapt it to BP 0.
  if(k==='bp'&&c.bp==null&&['event','field'].includes(c.type))continue;
  if(c[k]===undefined||c[k]===null||c[k]==='')absent.push(k);
 }
 if(!String(c.source||'').includes('/cardlist/'))absent.push('official_card_source');
 if(!String(c.effectJa??c.effect??'').trim())absent.push('printed_effect_text');
 if(c.verified===false||Array.isArray(c.unverifiedFields)&&c.unverifiedFields.length)
  absent.push('official_field_verification');
 if(String(c.name||'').startsWith('待核對卡片 '))absent.push('verified_card_name');
 return absent;
};
const rows=[];
for(const [title,cards] of catalogues){
 const seen=new Set();
 for(const c of cards){
  if(!legalType(c))continue;
  const id=String(c.identity||c.id||'');
  if(!id)throw Error('Missing identity: '+title);
  if(seen.has(id))throw Error('Duplicate regular card: '+title+'/'+id);
  seen.add(id);
  const missing=missingFields(c),ready=missing.length===0;
  const v2=pilotByTitle.get(title)?.has(id)===true;
  const spec=v2?packs.get(title).cards[id]:null;
  if(v2&&!spec)throw Error('Allowlist card absent from actual V2 pack: '+title+'/'+id);
  const text=String(c.effectJa??c.effect??'');
  const segments=text.split(/(?=【)|\n/).map(x=>x.trim()).filter(Boolean);
  const evidence=testTexts.filter(t=>t.text.includes("'"+id+"'")||t.text.includes('"'+id+'"')).map(t=>t.name);
  const printedRaid=String(c.trigger||'')==='raid'||/レイド|Raid|突襲/i.test(text);
  const effects=spec?JSON.stringify({
   effects:spec.effects,onPlay:spec.effects?.onPlay,
   onAttack:spec.effects?.onAttack,triggerEffect:spec.triggerEffect,
   mainAbility:spec.mainAbility,raidName:spec.raidName,step:spec.step,
   ownTurnBp:spec.ownTurnBp,activeExtraEnergy:spec.activeExtraEnergy
  }):'';
  // Presence of a test file is only a candidate pointer, not proof the test passed.
  const accepted=false;
  const inPreview=previewByTitle.get(title)?.has(id)===true;
  const completedMatch=false; // Never turn true without audited seed+replay+finished outcome.
  const coreGap=!ready?'missing-card-data':!v2?'not-ported-to-v2':
   'all-printed-abilities-and-corner-cases-not-independently-certified';
  rows.push({
   title,id,number:c.number||'',name:c.name||'',type:c.type??'',
   color:c.color??'',energy:c.energy??'',ap:c.ap??'',bp:c.bp??'',gen:c.gen??'',
   trigger:c.trigger??'',source:c.source||'',data_complete:ready,
   missing_fields:missing.join('|'),has_effect_text:!!text.trim(),
   printed_ability_segments:JSON.stringify(segments),printed_ability_text:text,
   raid_printed:printedRaid,v2_registered:v2,
   v2_implementation:spec?.implementation||'',v2_effects:effects,
   trigger_encoded:v2&&(!c.trigger||!!spec.trigger),
   raid_encoded:v2&&(!printedRaid||!!spec.raidName),
   candidate_v2_test_files:evidence.join('|'),
   all_abilities_accepted:accepted,core_gap:coreGap,
   in_integrated_preview_deck:inPreview,end_to_end_passed:completedMatch,
   playable_in_integrated_v2:accepted&&inPreview&&completedMatch,
   status:!ready?'missing_card_data':!v2?'data_ready_not_ported':'ported_not_accepted',
   audit_source_commit:head
  });
 }
}
for(const [title,ids] of pilotByTitle)
 for(const id of ids)if(!rows.some(r=>r.title===title&&r.id===id))
  throw Error('V2 card missing from source catalog: '+title+'/'+id);
const totals=title=>{
 const a=rows.filter(r=>r.title===title);
 return {
  catalogued:a.length,metadata_complete:a.filter(r=>r.data_complete).length,
  v2_ported:a.filter(r=>r.v2_registered).length,
  fully_accepted:a.filter(r=>r.all_abilities_accepted).length,
  listed_in_preview_deck:a.filter(r=>r.in_integrated_preview_deck).length,
  integrated_playable:a.filter(r=>r.playable_in_integrated_v2).length,
  missing_data_ids:a.filter(r=>!r.data_complete).map(r=>r.id),
  not_ported_ids:a.filter(r=>r.data_complete&&!r.v2_registered).map(r=>r.id)
 };
};
const summary={
 schema:'v2-e-catalog-1',source_commit:head,v2_base_commit:SOURCE_V2_SHA,
 node:process.version,command:'node scripts/v2-audit-catalog.mjs',
 basis:'Only this checked-out Git tree. No cross-branch aggregation.',
 acceptance_policy:'No card fully accepted without per-ability, trigger, negative-path, full-match and integration evidence.',
 mobile_physical_test:'not_run',whole_match_multiseed:'not_run',
 source_branches_not_merged:'Other V2 port branches intentionally excluded',
 titles:Object.fromEntries(catalogues.map(([name])=>[name,totals(name)]))
};
const escapeCSV=value=>{
 const s=typeof value==='boolean'?String(value):String(value??'');
 return /[,"\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
};
fs.mkdirSync(path.join(root,'audit'),{recursive:true});
fs.writeFileSync(path.join(root,'audit/v2-full-catalog.csv'),
 cols.join(',')+'\n'+rows.map(r=>cols.map(k=>escapeCSV(r[k])).join(',')).join('\n')+'\n');
fs.writeFileSync(path.join(root,'audit/v2-full-catalog-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({
 source_commit:head,node:process.version,
 titles:Object.fromEntries(Object.entries(summary.titles).map(([k,v])=>[k,{
 catalogued:v.catalogued,data_complete:v.metadata_complete,v2_ported:v.v2_ported,
 fully_accepted:v.fully_accepted,preview_deck:v.listed_in_preview_deck,
 integrated_playable:v.integrated_playable
 }]))
},null,2));
