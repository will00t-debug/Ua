import {CARDS,PRESETS} from './cards.mjs';
import {UA56BT_VERIFIED} from './gurren-lagann.mjs';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
// This registry separates catalogues without turning unimplemented TTG cards into playable BLEACH cards.
export const TITLES=[
 {id:'bleach',label:'BLEACH 千年血戰篇',cards:CARDS,presets:PRESETS,playable:true},
 {id:'gurren-lagann',label:'天元突破 紅蓮螺巖',cards:UA56BT_VERIFIED,presets:[],playable:false},
 {id:'solo-leveling',label:'我獨自升級',cards:SOLO_LEVELING_CARDS,presets:[],playable:false}
];
export function titleOfCard(card){return card?.title==='gurren-lagann'?'gurren-lagann':card?.title==='solo-leveling'?'solo-leveling':'bleach';}
export function getTitle(id){return TITLES.find(t=>t.id===id)||null;}
export function validateTitleMembership(counts,byId){
 const ids=new Set(Object.entries(counts).filter(([,count])=>count>0).map(([id])=>titleOfCard(byId[id])));
 return ids.size<=1?[]:['不同作品的卡片不可混入同一副牌組。'];
}
