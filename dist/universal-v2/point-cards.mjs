// Physical action-point cards sit beside the 50-card deck. A title pack lists
// them on pointCards. Packs without that list keep the three generic tokens.
// This file does not import the engine.

export function assignPointCards(pack, player, requested){
 const catalog=Array.isArray(pack?.pointCards)?pack.pointCards:[];
 const known=new Set(catalog.map(card=>card?.id).filter(id=>typeof id==='string'&&id));
 if(!catalog.length){
  if(requested!=null)throw Error('This title has no point cards');
  return [0,1,2].map(i=>({uid:'AP'+player+'-'+i,ready:false,inPlay:false}));
 }
 let ids;
 if(requested==null)ids=catalog.slice(0,3).map(card=>card.id);
 else{
  if(!Array.isArray(requested)||requested.length!==3||
   requested.some(id=>typeof id!=='string'||!known.has(id)))
   throw Error('Each player brings exactly 3 registered point cards');
  ids=requested;
 }
 return ids.map((cardId,i)=>({uid:'AP'+player+'-'+i,ready:false,inPlay:false,cardId}));
}

export function assertPointCardIdentities(pack, player){
 const catalog=Array.isArray(pack?.pointCards)?pack.pointCards:[];
 const known=new Set(catalog.map(card=>card?.id).filter(id=>typeof id==='string'&&id));
 for(const token of player?.apCards||[]){
  if(typeof token?.cardId==='string'){
   if(!known.has(token.cardId))throw Error('Invalid point card');
  }else if(token?.cardId!=null||known.size)throw Error('Invalid point card');
 }
}
