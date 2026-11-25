// How much of v2's existing choices sit in the eight frozen hash buckets.
import {WHITE_SWORD_IDS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {marginParts} from '../../v4b1/lib/decompose.mjs';
import {SCALE,STEP_CAP} from '../../v4b2/lib/protocol.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {hashBin,signatureOf} from '../../v4b9/lib/hash.mjs';

const HASH_NAMES=['h0','h1','h2','h3','h4','h5','h6','h7'];

export function linePlayOccupancy(bins=8){
 const buckets=Array.from({length:bins},()=>[]);
 for(const card of WHITE_SWORD_IDS){
  for(const line of ['front','energy']){
   const text=signatureOf('play',card,'',line);
   buckets[hashBin(text,bins)].push(text);
  }
 }
 const counts=buckets.map(rows=>rows.length);
 return {
  bins,plays:WHITE_SWORD_IDS.length*2,counts,
  max:Math.max(...counts),
  shared:counts.filter(count=>count>1).length
 };
}
export function rebucket(signatures,bins){
 const map=new Map();
 for(const text of signatures){
  const bin=hashBin(text,bins);
  if(!map.has(bin))map.set(bin,[]);
  map.get(bin).push(text);
 }
 const sizes=[...map.values()].map(rows=>rows.length);
 return {
  bins,signatures:signatures.length,used:map.size,
  max:sizes.length?Math.max(...sizes):0,
  shared:sizes.filter(count=>count>1).length
 };
}
export function zeroHash(weights){
 const next=weights.slice();
 for(const name of HASH_NAMES)next[POLICY_INDEX[name]]=0;
 return next;
}
function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function sideKey(position,line){
 const found=[position?.actionA,position?.actionB].filter(Boolean).find(side=>{
  const body=side.action||parsed(side.key);
  return body?.line===line;
 });
 return found?.key||null;
}
export function isPlay(row,card,line){
 const body=parsed(row?.key);
 if(body.type!=='play'||body.line!==line)return false;
 return cardsOf(row.features).includes(card);
}
function sameCardLine(position){
 const sides=[position.actionA,position.actionB].filter(Boolean);
 if(sides.length<2)return null;
 const plays=sides.map(side=>({
  side,body:side.action||parsed(side.key),
  card:side.card||cardsOf(side.features||[])[0]||null
 }));
 if(plays.some(play=>play.body?.type!=='play'))return null;
 if(plays[0].card!==plays[1].card||!plays[0].card)return null;
 const front=plays.find(play=>play.body.line==='front');
 const energy=plays.find(play=>play.body.line==='energy');
 if(!front||!energy)return null;
 const frontRow=position.band.find(row=>row.key===front.side.key);
 const energyRow=position.band.find(row=>row.key===energy.side.key);
 if(!frontRow||!energyRow)return null;
 return {front:frontRow,energy:energyRow};
}
export function hashPressure(positions,weights){
 let decisions=0;
 let comparable=0;
 let hashLarger=0;
 let hashFlips=0;
 let linePairs=0;
 let lineDominant=0;
 let lineHash=0;
 let lineOther=0;
 const shares=[];
 for(const position of positions){
  const band=position?.band;
  if(!band||band.length<2)continue;
  decisions++;
  const bestKey=chooseKey(band,weights,SCALE);
  const secondKey=chooseKey(band.filter(row=>row.key!==bestKey),weights,SCALE);
  const best=band.find(row=>row.key===bestKey);
  const second=band.find(row=>row.key===secondKey);
  if(!best||!second)continue;
  comparable++;
  const parts=marginParts(weights,best,second,SCALE);
  const hashLead=-parts.parts.hash;
  const otherLead=-(parts.policy-parts.parts.hash);
  const denom=Math.abs(hashLead)+Math.abs(otherLead);
  if(denom>1e-9)shares.push(Math.abs(hashLead)/denom);
  if(Math.abs(hashLead)>Math.abs(otherLead)+1e-9)hashLarger++;
  if(chooseKey(band,zeroHash(weights),SCALE)!==bestKey)hashFlips++;
  const line=sameCardLine(position);
  if(!line)continue;
  linePairs++;
  const gap=marginParts(weights,line.front,line.energy,SCALE);
  const hashAbs=Math.abs(gap.parts.hash);
  const otherAbs=Math.abs(gap.policy-gap.parts.hash);
  lineHash+=hashAbs;
  lineOther+=otherAbs;
  if(hashAbs>otherAbs+1e-9)lineDominant++;
 }
 shares.sort((left,right)=>left-right);
 return {
  decisions,comparable,hashLarger,hashFlips,linePairs,lineDominant,
  hashLargerShare:comparable?hashLarger/comparable:0,
  flipShare:comparable?hashFlips/comparable:0,
  medianHashShare:shares.length?shares[Math.floor((shares.length-1)/2)]:0,
  lineHashShare:(lineHash+lineOther)?lineHash/(lineHash+lineOther):0,
  lineDominantShare:linePairs?lineDominant/linePairs:0,
  lineHashMean:linePairs?lineHash/linePairs:0,
  lineOtherMean:linePairs?lineOther/linePairs:0
 };
}
export function actionLead(position,weights){
 const left=position?.band?.find(row=>row.key===position.actionA?.key);
 const right=position?.band?.find(row=>row.key===position.actionB?.key);
 if(!left||!right)return null;
 const scoreA=blendScore(left.hard,weights,left.features,SCALE);
 const scoreB=blendScore(right.hard,weights,right.features,SCALE);
 return {scoreA,scoreB,leadA:scoreA-scoreB};
}
export function oneStepRoom(step=STEP_CAP,scale=SCALE){
 return step*scale;
}
export function stepsToClear(lead,step=STEP_CAP,scale=SCALE){
 const room=oneStepRoom(step,scale);
 if(!(room>0))throw Error('步長沒有分數');
 if(!(lead>1e-9))return 0;
 return Math.ceil((lead-1e-9)/room);
}
export function stepsUntil(band,weights,predicate,wantedKey,maxSteps){
 for(let step=0;step<=maxSteps;step++){
  const after=boostedChoice(band,weights,predicate,step*oneStepRoom());
  if(after===wantedKey)return step;
 }
 return null;
}
export function boostedChoice(band,weights,predicate,points){
 const next=band.map(row=>predicate(row)?{...row,hard:row.hard+points}:row);
 return chooseKey(next,weights,SCALE);
}
export function signatureReach(positions,weights,predicate,points){
 let exposed=0;
 let flips=0;
 const flipped=[];
 for(const position of positions){
  if(!position.band?.some(predicate))continue;
  exposed++;
  const before=chooseKey(position.band,weights,SCALE);
  const after=boostedChoice(position.band,weights,predicate,points);
  if(before===after)continue;
  flips++;
  flipped.push(position.id);
 }
 return {exposed,flips,flipped};
}
