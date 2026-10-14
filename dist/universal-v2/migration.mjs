// Explicit migration planning only. Reading a card in an existing catalogue
// NEVER makes that card playable in universal v2 or flips its auto flag.
export function auditUniversalPort(title,cards){
 if(typeof title!=='string'||!Array.isArray(cards))throw Error('Title and catalogue required');
 const seen=new Set(),records=[];
 for(const c of cards){
  if(!c||typeof c.id!=='string'||seen.has(c.id))throw Error('Missing or duplicate card identifier');
  seen.add(c.id);
  const missing=[];
  for(const f of ['name','type','color','energy','ap','bp','gen'])if(c[f]===undefined||c[f]===null)missing.push(f);
  const supported=!!c.v2Implementation&&['vanilla','dsl'].includes(c.v2Implementation);
  records.push(Object.freeze({id:c.id,missingFields:missing,hasEffectText:!!(c.effect||c.effectJa),
   requiresEffectPort:!supported,legacyAuto:!!c.auto}));
 }
 return Object.freeze({title,total:records.length,metadataReady:records.filter(r=>!r.missingFields.length).length,
  v2Ready:records.filter(r=>!r.missingFields.length&&!r.requiresEffectPort).length,
  records:Object.freeze(records)});
}
