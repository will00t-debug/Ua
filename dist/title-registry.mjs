import {CARDS,PRESETS} from './cards.mjs';
import {TTG_CARDS} from './ttg-builder.mjs';
import {SAO_CARDS} from './sao-cards.mjs';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {MST_CARDS} from './mst-builder.mjs';
import {REZERO_VOL2_CARDS} from './rezero-vol2.mjs';
import {REZERO_CARDS} from './rezero-cards.mjs';
// Isolated catalogue/deck editing; unfinished series are not match-playable.
export const TITLES=[
 {id:'bleach',label:'BLEACH 千年血戰篇',cards:CARDS,presets:PRESETS,playable:true},
 {id:'gurren-lagann',label:'天元突破 紅蓮螺巖',cards:TTG_CARDS,presets:[],playable:false},
 {id:'sword-art-online',label:'刀劍神域',cards:SAO_CARDS,presets:[],playable:false},
 {id:'solo-leveling',label:'我獨自升級',cards:SOLO_LEVELING_CARDS,presets:[],playable:false},
 {id:'mushoku-tensei',label:'無職轉生',cards:MST_CARDS,presets:[],playable:false},
 {id:'rezero',label:'Re:從零開始的異世界生活',cards:[...REZERO_CARDS,...REZERO_VOL2_CARDS],presets:[],playable:false}
];
export function titleOfCard(card){return TITLES.some(t=>t.id===card?.title)?card.title:'bleach';}
export function getTitle(id){return TITLES.find(t=>t.id===id)||null;}
export function validateTitleMembership(counts,byId){const ids=new Set(Object.entries(counts||{}).filter(([,n])=>n>0).map(([id])=>titleOfCard(byId?.[id])));return ids.size<=1?[]:['不可將不同作品的卡片混入同一副牌組。'];}
