// Seed blocks and pass rules were written before any trial game.
// 188000 is outside v1–v2 splits and outside the v4–v7 blocks recorded
// on the closed research branches. Bench seeds are measurement only.
import {splitForSeed} from '../../dist/universal-v2/white-sword-ai/constants.mjs';

export const RESERVED=Object.freeze([
 [11000,12100],[19000,22000],[30000,31000],[41000,42000],[50000,51000],[80000,81000],
 [92000,92016],[94000,94016],[100000,130016],[160000,162229],[170000,178499],
 [182000,184999]
]);

function range(start,count){
 return Array.from({length:count},(_,index)=>start+index);
}
export const BENCH_NN_SEED=188000;
export const BENCH_V2_SEED=188001;
export const IMITATE_SEEDS=Object.freeze(range(188100,8));
export const SELF_SEEDS=Object.freeze(range(188200,24));
export const DEV_SEEDS=Object.freeze(range(188300,8));
export const TEST_SEEDS=Object.freeze(range(188400,4));
// Learner seat and first player both change. Two games cover first and second.
export const EVAL_CELLS=Object.freeze([
 Object.freeze({learnerSeat:0,first:0}),
 Object.freeze({learnerSeat:1,first:0})
]);

export const METHOD=[
 '獨立模組沿用規則引擎列出的合法動作。網路從全部合法動作裡選，不受 Hard cap 7 限制，也不把預測值加進 v2 混合分。',
 '模型是小型多層網路。輸入是行動者可見的場面向量，後面接上該候選動作的向量。隱藏層保留場面和動作的交互，不用舊的 115 維動作相減。',
 '模仿學習只用新產生的 v2 決策，而且標籤有平滑，不把示範當成唯一正解。模仿結束後凍結一份權重，稱為 A。',
 '自我對戰用 Deep Monte-Carlo：已執行的動作回歸該行動者的折扣終局回報。勝方的每一步不是分類標籤，負方的決策也不會被改寫成正確動作。',
 '訓練對手依固定順序使用自己、歷史快照和凍結的正式 v2。評估時不做探索。',
 '對手手牌、未公開 LIFE、牌庫順序、種子和實體 uid 不是模型輸入。uid 只在引擎內部對應到行動者看得到的卡號。',
 '訓練損失、權重距離、改選或短連勝都不算棋力。棋力只看事先分開的完整對局。'
].join('\n');

export const LEARNING_RULE='開發集須有至少 16 場已完成對局，而且 B 對 A 的 95% Wilson 下限高於 50%。少於 16 場只表示這次預算不夠，不表示這個方法不可行。';
export const PROMOTION_RULE='挑戰正式 v2 沿用既有冠軍門檻：至少 200 場已完成對局、總勝率至少 60%、95% 下限高於 50%、先後手都有、至少三種對手牌型、非鏡像下限也高於 50%，而且沒有非法、洩漏、死循環、引擎錯誤或回退。這次試訓不放寬門檻。';

export function reservedHit(seed){
 return RESERVED.find(([low,high])=>seed>=low&&seed<=high)||null;
}
export function assertExperimentSeed(seed,role){
 if(!Number.isInteger(seed))throw Error('Seed is not an integer');
 const split=splitForSeed(seed);
 if(split!=='unassigned')throw Error('Seed '+seed+' is already in the '+split+' split');
 const hit=reservedHit(seed);
 if(hit)throw Error('Seed '+seed+' is inside reserved block '+hit[0]+'-'+hit[1]);
 if(role==='bench'&&seed!==BENCH_NN_SEED&&seed!==BENCH_V2_SEED)throw Error('Bench seed is not in the bench pair');
 if(role==='train'){
  const train=new Set([...IMITATE_SEEDS,...SELF_SEEDS]);
  if(!train.has(seed))throw Error('Training seed '+seed+' is outside the imitate and self-play blocks');
 }
 if(role==='dev'&&!DEV_SEEDS.includes(seed))throw Error('Dev seed '+seed+' is outside the dev block');
 if(role==='test'&&!TEST_SEEDS.includes(seed))throw Error('Test seed '+seed+' is outside the test block');
 return seed;
}
export function allExperimentSeeds(){
 return [BENCH_NN_SEED,BENCH_V2_SEED,...IMITATE_SEEDS,...SELF_SEEDS,...DEV_SEEDS,...TEST_SEEDS];
}
