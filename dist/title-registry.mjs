import {CARDS,PRESETS} from './cards.mjs?v=20261121doubleblock1';
import {TTG_CARDS} from './ttg-builder.mjs';
import {SAO_CARDS} from './sao-cards.mjs';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs?v=20261121doubleblock1';
import {MST_CARDS} from './mst-builder.mjs';
import {REZERO_VOL2_CARDS} from './rezero-vol2.mjs?v=20261121doubleblock1';
import {REZERO_CARDS} from './rezero-cards.mjs';
import {STEINS_GATE_CARDS} from './steins-gate-cards.mjs?v=20261121doubleblock1';
import {MADOKA_CARDS} from './madoka-cards.mjs';
import {EXEDRA_CARDS} from './madoka-exedra-cards.mjs?v=20261121doubleblock1';
import {INUYASHA_CARDS} from './inuyasha-cards.mjs';
import {KJN_CARDS} from './kjn-cards.mjs';
import {AOT_CARDS} from './aot-cards.mjs?v=20261121doubleblock1';
import {AOT2_CARDS} from './aot-vol2-cards.mjs?v=20261121doubleblock1';
import {KMR_CARDS} from './kmr-cards.mjs';
import {KMR2_CARDS} from './kmr-vol2-cards.mjs';
import {KMR_PR_CARDS} from './kmr-pr-cards.mjs';
import {CSM_CARDS} from './csm-cards.mjs';
import {imcEditorCards} from './imc/catalog.mjs?v=20261121doubleblock1';
import {mhaEditorCards} from './mha/catalog.mjs?v=20261120mha011';
import {rnkEditorCards} from './rnk/editor-cards.mjs';
import {evaEditorCards} from './eva/catalog.mjs?v=20261122evaYellow0';
import {TORIKO_CARDS} from './toriko-cards.mjs?v=20261120mha011';
import {TORIKO_PR_CARDS} from './toriko-pr-cards.mjs?v=20261120mha011';
import {DGM_CARDS} from './dgm-cards.mjs?v=20261121nea067068fix1doubleblock1abilitylabels2zhcomplete1';
import {MGS_CARDS} from './mgs-cards.mjs?v=20261121mgs2';
import {MGS2_CARDS} from './mgs-vol2.mjs?v=20261121mgs2';
// Isolated catalogue/deck editing; unfinished series are not match-playable.
export const TITLES=[
 {id:'bleach',label:'BLEACH 千年血戰篇',cards:CARDS,presets:PRESETS,playable:true},
 {id:'gurren-lagann',label:'天元突破 紅蓮螺巖',cards:TTG_CARDS,presets:[],playable:false},
 {id:'sword-art-online',label:'刀劍神域',cards:SAO_CARDS,presets:[],playable:false},
 {id:'solo-leveling',label:'我獨自升級',cards:SOLO_LEVELING_CARDS,presets:[],playable:false},
 {id:'mushoku-tensei',label:'無職轉生',cards:MST_CARDS,presets:[],playable:false},
 {id:'rezero',label:'Re:從零開始的異世界生活',cards:[...REZERO_CARDS,...REZERO_VOL2_CARDS],presets:[],playable:false},
 {id:'steins-gate',label:'命運石之門',cards:STEINS_GATE_CARDS,presets:[],playable:false},
 {id:'madoka',label:'魔法少女小圓',cards:[...MADOKA_CARDS,...EXEDRA_CARDS],presets:[],playable:false},
 {id:'inuyasha',label:'犬夜叉',cards:INUYASHA_CARDS,presets:[],playable:false},
 {id:'kjn',label:'我想成為影之強者！',cards:KJN_CARDS,presets:[],playable:false},
 {id:'aot',label:'進擊的巨人',cards:[...AOT_CARDS,...AOT2_CARDS],presets:[],playable:false},
 {id:'kmr',label:'假面騎士',cards:[...KMR_CARDS,...KMR2_CARDS,...KMR_PR_CARDS],presets:[],playable:false},
 {id:'csm',label:'鏈鋸人',cards:CSM_CARDS,presets:[],playable:false},
 {id:'imc',label:'偶像大師 灰姑娘女孩',cards:imcEditorCards(),presets:[],playable:true},
 {id:'mha',label:'我的英雄學院',cards:mhaEditorCards(),presets:[],playable:true},
 {id:'rnk',label:'浪客劍心',cards:rnkEditorCards(),presets:[],playable:true},
 {id:'eva',label:'新世紀福音戰士新劇場版',cards:evaEditorCards(),presets:[],playable:true},
 {id:'toriko',label:'美食獵人',cards:[...TORIKO_CARDS,...TORIKO_PR_CARDS],presets:[],playable:false},
 {id:'dgm',label:'驅魔少年',cards:DGM_CARDS,presets:[],playable:false},
 {id:'mgs',label:'〈物語〉系列',cards:[...MGS_CARDS,...MGS2_CARDS],presets:[],playable:false}
];
export function titleOfCard(card){return TITLES.some(t=>t.id===card?.title)?card.title:'bleach';}
export function getTitle(id){return TITLES.find(t=>t.id===id)||null;}
export function validateTitleMembership(counts,byId){const ids=new Set(Object.entries(counts||{}).filter(([,n])=>n>0).map(([id])=>titleOfCard(byId?.[id])));return ids.size<=1?[]:['不可將不同作品的卡片混入同一副牌組。'];}
