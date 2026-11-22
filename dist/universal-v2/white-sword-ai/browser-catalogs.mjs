// No catalogue imports; accepts the two packs supplied by the V2 match.
export function catalogsOf(pack){
 if(Array.isArray(pack))return pack.map(item=>item.cards||item);
 return [pack.cards||pack,pack.cards||pack];
}
