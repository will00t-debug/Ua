// Round-2 seed blocks and pass rules were written before this round's games.
// Round 1 already looked at 188000–188403. Those seeds stay out of the new
// test. The four round-1 test seeds are development data in this round.
import {splitForSeed} from '../../dist/universal-v2/white-sword-ai/constants.mjs';
import {
 AGREEMENT_DROP,CRITIC_INIT_SEED,GAMMA,INIT_SEED,PPO_ACTOR_LR,PPO_BATCH_GAMES,PPO_CLIP,
 PPO_CRITIC_LR,PPO_ENTROPY,PPO_EPOCHS,PPO_KL_LIMIT,PPO_MAX_BATCHES,REPLAY_FRACTION,
 ROUND4_CONFIRM_CAP,SURPASS_SEEDS
} from './constants.mjs';

export const RESERVED=Object.freeze([
 [11000,12100],[19000,22000],[30000,31000],[41000,42000],[50000,51000],[80000,81000],
 [92000,92016],[94000,94016],[100000,130016],[160000,162229],[170000,178499],
 [182000,184999]
]);

function range(start,count){
 return Array.from({length:count},(_,index)=>start+index);
}
export const ROUND1_SEEDS=Object.freeze([
 188000,188001,
 ...range(188100,8),
 ...range(188200,24),
 ...range(188300,8),
 ...range(188400,4)
]);
export const PRIOR_TEST_SEEDS=Object.freeze([188400,188401,188402,188403]);
const ROUND1_BLOCKED=new Set(ROUND1_SEEDS.filter(seed=>!PRIOR_TEST_SEEDS.includes(seed)));

export const BENCH_NN_SEED=188500;
export const BENCH_V2_SEED=188501;
export const IMITATE_SEEDS=Object.freeze(range(188600,32));
export const SELF_SEEDS=Object.freeze(range(188800,80));
export const FRESH_DEV_SEEDS=Object.freeze(range(189200,12));
export const DEV_SEEDS=Object.freeze([...PRIOR_TEST_SEEDS,...FRESH_DEV_SEEDS]);
export const TEST_SEEDS=Object.freeze(range(189400,12));
// Round 2 already evaluated 189400–189411. Round 3 may use them as development
// data only. Confirmation needs a block neither round has trained or scored.
export const ROUND3_DEV_SEEDS=TEST_SEEDS;
export const ROUND3_DIAG_SEEDS=Object.freeze(range(189600,4));
export const ROUND3_CONFIRM_SEEDS=Object.freeze(range(189800,12));
// Round 4 trains on a new block. 189400–189411 were scored in rounds 2 and 3,
// so they stay development data. Confirmation is a block neither round played.
export const ROUND4_SELF_SEEDS=Object.freeze(range(191200,PPO_MAX_BATCHES*PPO_BATCH_GAMES));
export const ROUND4_DEV_SEEDS=ROUND3_DEV_SEEDS;
export const ROUND4_CONFIRM_SEEDS=Object.freeze(range(191400,ROUND4_CONFIRM_CAP));
// Seat and first player are crossed. Four games per seed, not two bound pairs.
export const EVAL_CELLS=Object.freeze([
 Object.freeze({learnerSeat:0,first:0}),
 Object.freeze({learnerSeat:0,first:1}),
 Object.freeze({learnerSeat:1,first:0}),
 Object.freeze({learnerSeat:1,first:1})
]);

export const METHOD=[
 '獨立模組沿用規則引擎列出的合法動作。網路從全部合法動作裡選，不受 Hard cap 7 限制，也不把預測值加進 v2 混合分。',
 '模型是小型多層網路。輸入是行動者可見的場面向量，後面接上該候選動作的向量。隱藏層保留場面和動作的交互，不用舊的 115 維動作相減。',
 '公開歷史在模仿、自我對戰和評估用同一套流程。只記錄行動後對方看得到的卡號，不記錄實體 uid。',
 '模仿學習只用新產生的 v2 決策，而且標籤有平滑。整場保留的示範不參與權重更新。模仿結束後凍結一份新的 A，不沿用上一輪的 A 或 B。',
 '自我對戰用 Deep Monte-Carlo：已執行的動作回歸該行動者的折扣終局回報。勝方的每一步不是分類標籤。',
 '訓練對手依固定順序使用自己、歷史快照和凍結的正式 v2。評估時不做探索。',
 '對手手牌、未公開 LIFE、牌庫順序、種子和實體 uid 不是模型輸入。',
 '損失、權重距離和改選率都不算棋力。開發曲線可以選檢查點，不能代替凍結後的新種子測試。'
].join('\n');

export const INIT_RULE='模仿品質只在整場保留的示範上計算，這些場的決策不更新權重。完全相同的動作，和已證明只差實體 uid、而且兩個 uid 都對到同一張看得到的卡，要分開統計。後者不是錯誤，但也不算成完全一致。特徵向量撞車而沒有這項證明的，算不一致。';
export const TREND_RULE='開發曲線在計畫自我對戰場數的 25%、50%、75% 和 100% 保存權重，用同一組開發種子對凍結的 A 評估。每個原始種子先把自己完成的對局平均成一個勝率，再對種子平均。95% 區間用種子的 t 分配，不把同種子的四種組合當成獨立局。正向趨勢是指最後一個已跑到的計畫檢查點，相對第一個檢查點的配對差，區間下限高於 0。';
export const SELECTION_RULE='只在開發種子數最多的檢查點之間選擇。種子平均勝率最高者當選，平手取較晚的檢查點。選完就凍結，之後才打新種子。開發曲線上的勝率不用來加場或改超參數。';
export const FOLLOWUP_RULE='只有在被選中的檢查點至少有 8 個開發種子、配對的種子至少 8 個、配對差的區間下限高於 0、該檢查點對 A 的種子平均高於 50%，而且凍結後新種子測試的區間下限也高於 50% 時，才建議安排更完整的獨立驗證。少了任何一項，只表示目前資料不夠，不表示方法不可行，也不表示跑完預算就有足夠檢定力。正式晉級門檻不使用這條規則，也不放寬。';
export const PROMOTION_RULE='挑戰正式 v2 沿用既有冠軍門檻：至少 200 場已完成對局、總勝率至少 60%、95% 下限高於 50%、先後手都有、至少三種對手牌型、非鏡像下限也高於 50%，而且沒有非法、洩漏、死循環、引擎錯誤或回退。這次試訓不提交晉級樣本，也不放寬門檻。';
export const LEARNING_RULE='上一輪的開發集 Wilson 規則只屬於上一輪。這一輪改看種子分組的開發曲線、配對差，以及凍結後的新種子測試。';

export const COPY_RULE='0 次更新的檢查點是凍結 A 的複本。複本的權重、診斷動作的分數和貪心選擇都要和 A 逐位相同。同一複本在四種座位與先後手組合下，同一種子、同一先手的兩種座位標籤必須有相同勝者和相同行動序列。學習者勝場在這一對標籤裡互補。';
export const SCALE_RULE='尺度診斷使用固定的自我對戰樣本，以及沒有參與回放的保留示範。原始更新把網路輸出直接拿去減終局回報。輸出和回報的絕對差中位數大於 1，而且回報仍在 [-1,1] 時，記成尺度接法錯誤。修正是先用 tanh 把輸出壓進同一個區間再求誤差。這項修正只在診斷裡使用，不進入 B-original，也不進入 B-retain。';
export const EARLY_RULE='最早更新看第 1 場和第 4 場。固定診斷上記錄更新前後的輸出分布、回報分布、教師動作排名和模仿一致率。線上對 A 的勝負用同一組開發種子。均方誤差下降不當作更新有效。保留示範的完全一致率相對 0 次更新下降至少 '+(AGREEMENT_DROP*100)+' 個百分點，或對 A 的配對差區間整段低於 0，記成最早更新就退步。';
export const ARM_RULE='只比較 B-original 和 B-retain。兩者從同一個凍結 A 出發，自我對戰場數、種子、對手順序和評估種子都相同。兩個版本各用一個學習率為自我對戰學習率的優化器。B-retain 在每個 Monte-Carlo 樣本之後接一個模仿回放樣本，回放步數和 Monte-Carlo 步數相等，比例 '+(REPLAY_FRACTION)+' 在跑之前就固定。回放只抽訓練示範，抽到保留場種子就中止。不因開發勝率改比例、學習率或場數。';
export const READ_RULE='終點是計畫自我對戰場數的最後一個檢查點，不從曲線裡另挑高點。B-retain 的種子平均沒有高於 50% 時，即使高於 B-original，也只稱為減輕退步，不能稱為自主變強。只有終點種子至少 '+SURPASS_SEEDS+' 個、種子平均高於 50%，而且相對 0 次更新的配對差區間下限高於 0，才用全新確認種子再打該版本。確認種子的區間下限也要高於 50%，才建議更完整的獨立驗證。189400–189411 只當開發種子。正式晉級門檻不使用這條規則，也不放寬。';
export const PPO_RULE=[
 'Actor 從凍結 A 完整複製。動作分數只當目前合法動作上的 softmax logits，不再回歸終局回報，也不套 tanh。',
 'Critic 使用另一組權重，只接收行動者看得到的場面和歷史，預測該行動者的回報。Critic 的預測不加進選牌分數，也不更新 Actor 的參數。',
 '每一批開始時凍結行為策略和 Critic。整批 rollout 都用這一版收集，不能邊收集邊更新。採樣來自合法動作的 softmax，不用 epsilon-greedy。',
 '每筆資料保存行動者可見的狀態、當時全部合法動作、選中動作、行為策略實際選中的 log probability、凍結 Critic 的 value，以及行為版本。更新使用留下的舊機率，不用事後重算的新策略機率冒充。',
 '不把模仿回放或上一輪自我對戰樣本混進這一批，也不把那種混合稱為 on-policy PPO。',
 '優勢是回報減去凍結舊 Critic 的 value，並在該批更新前固定。若做優勢正規化，只用這一訓練批次的樣本標準差。樣本少於 2 或變異為 0 時，正規化後的優勢為 0。',
 'Actor 最大化標準 PPO-Clip。Critic 另以回報做回歸。clip '+PPO_CLIP+'，Actor 學習率 '+PPO_ACTOR_LR+'，Critic 學習率 '+PPO_CRITIC_LR+'，每批最多 '+PPO_EPOCHS+' 次更新，熵係數 '+PPO_ENTROPY+'。一批的平均 KL 超過 '+PPO_KL_LIMIT+' 就不再做該批後續更新。這些數字在看勝率之前固定，不因開發勝率改動。',
 '對手沿用自己、落後至少一批的歷史快照，以及正式 v2。一批之內對手版本不變。快照或 v2 不能用時，該批改為自己對自己。',
 '回報沿用既有定義。折扣係數 '+GAMMA+'。終局結果以行動者視角為 +1 或 -1，沒有中途獎勵。時間單位是該決策之後的剩餘決策數，不是回合數。這一輪不改獎勵。'
].join('\n');
export const ROUND4_SELECT_RULE='檢查點包含 0 次更新，以及每一個實際跑完的批次。只在開發種子數最多的檢查點之間選候選：種子平均勝率最高，平手取較晚的。選完就凍結該檢查點的 Actor。確認對局的結果不用來改選檢查點、學習率或批次。';
export const ROUND4_READ_RULE='計畫終點是最後一個實際跑完的檢查點。損失、Critic 誤差、KL 和權重距離都不是棋力。終點相對 0 次更新的配對差區間整段低於 0，記成 PPO 造成退步。沒有同時達到至少 '+SURPASS_SEEDS+' 個種子、種子平均高於 50%、以及相對 0 次更新的配對差下限高於 0 時，只稱為未觀察到明顯退步，不能稱為自主變強。只有被選中的檢查點同時達到這三項，才用全新確認種子再打，而且確認種子的區間下限也要高於 50%，才建議更完整的獨立驗證。189400–189411 只作開發。正式晉級門檻不使用這條規則，也不放寬。';

export function reservedHit(seed){
 return RESERVED.find(([low,high])=>seed>=low&&seed<=high)||null;
}
export function assertExperimentSeed(seed,role){
 if(!Number.isInteger(seed))throw Error('Seed is not an integer');
 if(seed===INIT_SEED||seed===CRITIC_INIT_SEED)throw Error('Initialization seed is not a game seed');
 if(ROUND1_BLOCKED.has(seed))throw Error('Seed '+seed+' was already used in round 1');
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
 if(role==='test'&&PRIOR_TEST_SEEDS.includes(seed))throw Error('Round-1 test seed '+seed+' is development data now');
 if(role==='round3-dev'&&!ROUND3_DEV_SEEDS.includes(seed))throw Error('Round-3 dev seed '+seed+' is outside the reclassified block');
 if(role==='round3-diag'&&!ROUND3_DIAG_SEEDS.includes(seed))throw Error('Diagnostic seed '+seed+' is outside the diagnostic block');
 if(role==='round3-confirm'&&!ROUND3_CONFIRM_SEEDS.includes(seed))throw Error('Confirmation seed '+seed+' is outside the confirmation block');
 if(role==='round3-confirm'&&ROUND3_DEV_SEEDS.includes(seed))throw Error('A round-2 test seed cannot confirm round 3');
 if(role==='round4-train'&&!ROUND4_SELF_SEEDS.includes(seed))throw Error('Round-4 training seed '+seed+' is outside the new self-play block');
 if(role==='round4-dev'&&!ROUND4_DEV_SEEDS.includes(seed))throw Error('Round-4 dev seed '+seed+' is outside the reclassified block');
 if(role==='round4-confirm'&&!ROUND4_CONFIRM_SEEDS.includes(seed))throw Error('Round-4 confirmation seed '+seed+' is outside the new confirmation block');
 if(role==='round4-confirm'&&ROUND4_DEV_SEEDS.includes(seed))throw Error('A round-4 dev seed cannot confirm round 4');
 if(role==='round4-train'&&ROUND4_DEV_SEEDS.includes(seed))throw Error('A development seed cannot enter round-4 rollouts');
 return seed;
}
export function allExperimentSeeds(){
 return [
  BENCH_NN_SEED,BENCH_V2_SEED,...IMITATE_SEEDS,...SELF_SEEDS,...DEV_SEEDS,...TEST_SEEDS,
  ...ROUND3_DIAG_SEEDS,...ROUND3_CONFIRM_SEEDS,...ROUND4_SELF_SEEDS,...ROUND4_CONFIRM_SEEDS
 ];
}
export function holdoutSplit(seeds){
 const list=seeds.slice();
 const width=list.length;
 if(width<4)return {train:list,holdout:[]};
 const hold=Math.max(width>=8?2:1,Math.floor(width/4));
 return {train:list.slice(0,width-hold),holdout:list.slice(width-hold)};
}
export function checkpointEnds(count){
 const points=[];
 for(let step=1;step<=4;step++){
  const at=Math.ceil(step*count/4);
  if(at>=1&&points[points.length-1]!==at)points.push(at);
 }
 return points;
}
