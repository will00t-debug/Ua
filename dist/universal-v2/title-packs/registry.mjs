// Shared V2 registry. Series workers own only the five independent files
// imported below; central integration never infers card readiness from an old
// engine, legacy auto flags, printed keywords or empty placeholder records.
import {verifiedPilotCards} from '../real-card-pilots.mjs';
import {compileV2TitleContribution,mergeV2TitlePack,V2_TITLE_IDS}
 from './contract.mjs';
import bleach from './bleach.mjs';
import ttg from './ttg.mjs';
import slg from './slg.mjs';
import sao from './sao.mjs';
import mst from './mst.mjs';

export const V2_TITLE_CONTRIBUTIONS=Object.freeze({
 bleach, 'gurren-lagann':ttg, 'solo-leveling':slg,
 'sword-art-online':sao, 'mushoku-tensei':mst
});
const baseline=Object.freeze({bleach:'bleach','gurren-lagann':'gurren-lagann'});
export function listRegisteredV2Titles(){
 return V2_TITLE_IDS.map(title=>{
  const existing=Object.prototype.hasOwnProperty.call(baseline,title)?
   verifiedPilotCards(title):[];
  const contributed=compileV2TitleContribution(V2_TITLE_CONTRIBUTIONS[title]);
  if(contributed.cardIds.some(id=>existing.some(c=>c.id===id)))
   throw Error(title+' V2 Pilot duplicate requires explicit review');
  return Object.freeze({title,totalV2Cards:existing.length+contributed.cards.length,
   baselinePilots:existing.length,newlyContributed:contributed.cards.length,
   version:contributed.version,previewReady:existing.length+contributed.cards.length>0});
 });
}
export function registeredV2TitlePack(title){
 if(!V2_TITLE_IDS.includes(title))throw Error('Unknown registered V2 title '+title);
 const existing=Object.prototype.hasOwnProperty.call(baseline,title)?
  verifiedPilotCards(title):[];
 const contribution=V2_TITLE_CONTRIBUTIONS[title];
 if(!existing.length&&!contribution.entries.length)return null;
 return mergeV2TitlePack({title,baselineCards:existing,contribution});
}
export function requireRegisteredV2TitlePack(title){
 const pack=registeredV2TitlePack(title);
 if(!pack)throw Error(title+' has no verified V2 playable cards yet');
 return pack;
}
