// Deck-cover choices are always cards actually included in this deck.
// AP cards and cards with zero copies cannot become saved cover art.
function deckCardIds(cards,counts){
 const chosen=new Set();
 for(const card of Array.isArray(cards)?cards:[]){
  if(!card||typeof card.id!=='string'||!card.id)continue;
  if(['ap','action_point','action-point'].includes(card.type)||/AP\d+$/i.test(card.id))continue;
  if(Number(counts?.[card.id])>0)chosen.add(card.id);
 }
 return chosen;
}

export function coverChoices(cards,counts){
 const ids=deckCardIds(cards,counts);
 return (Array.isArray(cards)?cards:[]).filter(card=>ids.has(card.id));
}

export function validDeckCoverId(cards,counts,coverId){
 return typeof coverId==='string'&&deckCardIds(cards,counts).has(coverId)?coverId:null;
}

export function displayCoverCard(cards,counts,coverId){
 const chosen=coverChoices(cards,counts);
 return chosen.find(card=>card.id===validDeckCoverId(cards,counts,coverId))
  ||chosen.find(card=>card.type==='character')||chosen[0]||null;
}
