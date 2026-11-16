// Picture-editor rows. The live battle pack is built from the staged programs.
// These catalogue rows stay battleReady false; the adapter requires that.
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
