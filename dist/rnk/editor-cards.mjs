// Deck-builder catalogue only. Official battles stay closed: this does not
// register rnk with officialV2Pack, and every row stays battleReady false.
import {RNK_SOURCE_CATALOG} from './manifest.mjs';

export function rnkEditorCards(){
 return RNK_SOURCE_CATALOG.map(card=>Object.freeze({
  ...card,
  playable:false,
  battleReady:false,
  effectImplemented:false,
  deckLegal:card.deckLegal!==false
 }));
}
