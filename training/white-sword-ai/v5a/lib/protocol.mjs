// v5-A compares learning architectures. It does not fit weights or edit v2.
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {signatureOf} from '../../v4b9/lib/hash.mjs';

export const CODE_VERSION='v5a-1';
export const OFFICIAL_V2='a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa';
export const EVIDENCE_PRIOR=8;
export const MAX_ACCUMULATED_STEPS=WEIGHT_CLIP/STEP_CAP;

export const CONSTRAINTS=Object.freeze([
 {id:'d12a2d6f5ced1d88',role:'preference',type:'play',card:'BLC-4-070',line:'energy',text:'已確認應改打能量線'},
 {id:'b122fb89d72eec7e',role:'preference',type:'play',card:'BLC-4-070',line:'energy',text:'已確認應改打能量線'},
 {id:'01c85e5ddb31e7fa',role:'preference',type:'play',card:'BLC-4-070',line:'energy',text:'已確認應改打能量線'},
 {id:'ee6cdd154ceeb4ce',role:'preserve',type:'next',card:null,line:null,text:'已確認結束行動較好；結束動作沒有卡號，這輪只要求選擇不變'},
 {id:'0d035ea8a0b2be16',role:'preserve',type:'play',card:'BLC-1-085',line:'front',text:'已確認改選會變差，選擇必須留在 v2'},
 {id:'1fbdc61d55fa7f09',role:'preserve',type:'raid',card:'BLC-2-067',line:null,text:'067 突襲必須留在 v2'}
]);

export function assertOfficialLimits(){
 if(HARD_OPTIONS.nodes!==48||HARD_NODES!==48)throw Error('Hard Search 節點數必須是 48');
 if(HARD_CAP!==7||SCALE!==6||STEP_CAP!==1.5||WEIGHT_CLIP!==6)throw Error('硬分上限、縮放、步長或權重夾限已改變');
 if(MAX_ACCUMULATED_STEPS!==4)throw Error('累積步數必須停在權重夾限');
}
export function namedFeatureOf(preference){
 if(preference?.role!=='preference')return null;
 if(preference.type!=='play'||!preference.card||!preference.line)return null;
 return {type:'play',card:preference.card,line:preference.line};
}
export function uniqueNamedFeatures(preferences=CONSTRAINTS){
 const seen=new Map();
 for(const preference of preferences){
  const feature=namedFeatureOf(preference);
  if(!feature)continue;
  seen.set(signatureOf(feature.type,feature.card,'',feature.line),feature);
 }
 return [...seen.values()];
}
