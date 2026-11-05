// Legal 50-card decks used as the ai-v3 comparison pool.
// Steins;Gate and Attack on Titan are outside the old five-title census.
import {officialV2Pack,practiceDeck,steinsGatePracticeDeck,aotPracticeDeck} from '../official-entry.mjs';
import {validateUniversalDeck} from '../pack.mjs';

function fromPractice(id,title,color){
 const pack=officialV2Pack(title);
 const counts=practiceDeck(pack,color?{color}:undefined);
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(id+': '+issues.join('; '));
 return {id,title,pack,counts};
}
export function mainDecks(){
 const bleach=fromPractice('bleach','bleach');
 const sao=fromPractice('sword-art-online','sword-art-online');
 const slg=fromPractice('solo-leveling','solo-leveling');
 const steins=steinsGatePracticeDeck();
 const titan=aotPracticeDeck();
 for(const deck of [steins,titan]){
  const issues=validateUniversalDeck(deck.pack,deck.counts);
  if(issues.length)throw Error(deck.pack.id+': '+issues.join('; '));
 }
 return [
  bleach,sao,slg,
  {id:'steins-gate',title:'steins-gate',pack:steins.pack,counts:steins.counts},
  {id:'aot',title:'aot',pack:titan.pack,counts:titan.counts}
 ];
}
