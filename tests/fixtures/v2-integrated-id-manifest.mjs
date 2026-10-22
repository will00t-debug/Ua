// Explicit source-pinned integration acceptance list from PR #73/#72/#74.
// This is a TEST-ONLY independent reference. Never compute expected IDs from
// the registry being tested: doing so would accept missing or duplicate cards.
export const EXPECTED_V2_ADDED_CARD_IDS=Object.freeze({
 'bleach':Object.freeze(`BLC-2-010,BLC-2-063,BLC-2-007,BLC-1-109,BLC-1-023,BLC-1-006,BLC-1-042,BLC-1-016,BLC-1-069,BLC-2-022,BLC-2-040,BLC-1-051,BLC-2-042,BLC-1-009,BLC-1-074,BLC-1-054,BLC-4-023,BLC-1-002,BLC-1-012,BLC-1-018,BLC-1-021,BLC-1-024,BLC-1-071,BLC-1-083,BLC-1-086,BLC-2-023,BLC-2-025,BLC-2-031,BLC-2-036,BLC-2-056,BLC-2-059,BLC-2-066,BLC-1-001,BLC-1-089,BLC-4-062,BLC-1-017,BLC-1-035,BLC-1-068,BLC-2-020,BLC-1-010,BLC-1-075,BLC-2-029,BLC-4-014,BLC-1-008,BLC-1-043,BLC-1-067,BLC-4-035,BLC-1-072,BLC-1-094,BLC-2-008,BLC-2-016,BLC-2-052,BLC-2-071,BLC-4-026,BLC-4-040,BLC-1-082,BLC-1-090,BLC-1-029,BLC-1-100,BLC-2-049,BLC-4-019,BLC-4-020,BLC-4-045,BLC-4-059,BLC-4-080,BLC-2-053,BLC-4-061,BLC-1-097,BLC-1-013,BLC-1-099,BLC-2-048,BLC-1-049,BLC-4-009,BLC-4-067,BLC-1-030,BLC-1-059,BLC-1-077,BLC-2-055,BLC-3-006,BLC-3-009,BLC-4-013,BLC-1-005`.split(',').sort()),
 'gurren-lagann':Object.freeze(`TTG-1-018,TTG-1-006,TTG-1-077,TTG-1-005,TTG-1-014,TTG-1-019,TTG-1-010,TTG-1-023,TTG-1-053,TTG-1-063`.split(',').sort()),
 'solo-leveling':Object.freeze(`SLG-1-053,SLG-1-042,SLG-1-004,SLG-1-009,SLG-1-008,SLG-1-014,SLG-1-025,SLG-1-001,SLG-1-002,SLG-1-007,SLG-1-013,SLG-1-010,SLG-1-005,SLG-1-006,SLG-1-015,SLG-1-016,SLG-1-026,SLG-1-032,SLG-1-038,SLG-1-041,SLG-1-043,SLG-1-045,SLG-1-052,SLG-1-055,SLG-1-066,SLG-1-068,SLG-1-078,SLG-1-079,SLG-1-040,SLG-1-076,SLG-1-036,SLG-1-037,SLG-1-018,SLG-1-012`.split(',').sort()),
 'sword-art-online':Object.freeze(`SAO-2-007,SAO-2-055,SAO-2-043,SAO-2-052,SAO-1-038,SAO-1-072,SAO-1-009,SAO-1-040,SAO-1-077,SAO-2-023,SAO-1-034,SAO-1-051,SAO-1-020,SAO-1-057,SAO-1-014,SAO-2-019,SAO-2-016,SAO-1-105,SAO-1-003,SAO-1-032,SAO-1-052,SAO-1-063,SAO-1-073,SAO-1-075,SAO-1-089,SAO-1-098,SAO-1-107,SAO-2-021,SAO-2-017,SAO-2-030,SAO-2-048,SAO-2-057,SAO-2-072,SAO-1-019,SAO-1-023,SAO-1-035,SAO-1-039,SAO-1-054,SAO-1-058,SAO-1-068,SAO-1-069,SAO-1-084,SAO-1-088,SAO-1-102,SAO-1-106,SAO-2-028,SAO-2-035,SAO-2-047,SAO-1-001,SAO-1-082,SAO-1-061,SAO-2-041,SAO-1-016,SAO-1-055,SAO-1-078,SAO-1-026,SAO-1-027,SAO-1-074,SAO-2-026,SAO-2-045,SAO-1-006,SAO-1-046,SAO-1-095,SAO-2-046,SAO-2-040,SAO-1-042,SAO-1-004,SAO-1-047,SAO-1-094,SAO-2-015,SAO-2-027,SAO-2-067`.split(',').sort()),
 'mushoku-tensei':Object.freeze(`MST-1-043,MST-1-042,MST-1-046,MST-1-052,MST-1-053,MST-1-054,MST-1-074,MST-1-075,MST-1-076,MST-1-055,MST-1-057,MST-1-063,MST-1-045,MST-1-051,MST-1-010,MST-1-016,MST-1-024,MST-1-013,MST-1-003,MST-1-001,MST-1-002,MST-1-020,MST-1-027,MST-1-050,MST-1-070,MST-1-017,MST-1-022,MST-1-012,MST-1-018,MST-1-015,MST-1-071,MST-1-029,MST-1-072,MST-1-047,MST-1-069,MST-1-019,MST-1-044,MST-1-034,MST-1-037,MST-1-077,MST-1-079,MST-1-061`.split(',').sort()),
});

// Independently reviewed baseline identities: literal pins, NOT imports from
// real-card-pilots or the registry under test. Update IDs only after source audit.
export const EXPECTED_V2_BASELINE_IDS=Object.freeze({
 bleach:Object.freeze('BLC-1-034,BLC-1-036,BLC-1-037,BLC-1-039,BLC-1-040,BLC-1-064,BLC-1-066,BLC-1-045,BLC-1-048,BLC-1-052,BLC-1-057,BLC-1-102,BLC-1-103,BLC-1-105,BLC-1-107'.split(',').sort()),
 'gurren-lagann':Object.freeze('TTG-1-001,TTG-1-009,TTG-1-036,TTG-1-037,TTG-1-038,TTG-1-045,TTG-1-046,TTG-1-047,TTG-1-049,TTG-1-052,TTG-1-051,TTG-1-042,TTG-1-043,TTG-1-066,TTG-1-064,TTG-1-065,TTG-1-072,TTG-1-073,TTG-1-078,TTG-1-079'.split(',').sort()),
 'solo-leveling':Object.freeze([]),'sword-art-online':Object.freeze([]),'mushoku-tensei':Object.freeze([])
});
export const EXPECTED_V2_IDS=Object.freeze(Object.fromEntries(
 Object.keys(EXPECTED_V2_ADDED_CARD_IDS).map(title=>{
  const ids=[...EXPECTED_V2_BASELINE_IDS[title],...EXPECTED_V2_ADDED_CARD_IDS[title]].sort();
  if(new Set(ids).size!==ids.length)throw Error('Duplicate independent manifest ID: '+title);
  return [title,Object.freeze(ids)];
 })));
export const EXPECTED_V2_COUNTS=Object.freeze(Object.fromEntries(
 Object.entries(EXPECTED_V2_IDS).map(([title,ids])=>[title,ids.length])));
export const EXPECTED_V2_TOTAL=Object.values(EXPECTED_V2_COUNTS).reduce((a,b)=>a+b,0);
// Accept actual inventory as input; never derive the expected side from it.
export function assertIndependentV2Inventory(audit){
 const titles=audit.series.map(x=>x.title).sort();
 if(JSON.stringify(titles)!==JSON.stringify(Object.keys(EXPECTED_V2_IDS).sort()))throw Error('Independent V2 title drift');
 for(const row of audit.series){
  if(JSON.stringify([...row.pilotIds].sort())!==JSON.stringify(EXPECTED_V2_IDS[row.title])||
   row.pilotImplemented!==EXPECTED_V2_COUNTS[row.title]||row.blocked!==row.total-EXPECTED_V2_COUNTS[row.title])
   throw Error('Independent V2 identity/count drift: '+row.title);
 }
 if(audit.totals.pilotImplemented!==EXPECTED_V2_TOTAL||audit.totals.blocked!==audit.totals.total-EXPECTED_V2_TOTAL)
  throw Error('Independent V2 total drift');
 return true;
}
