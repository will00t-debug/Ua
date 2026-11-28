// Independent white-sword experiment. These values are not the live v2 model.
// Official v2, Hard Search 2, the rules engine, and the website stay as they are.
export const FORMAT='ua-white-sword-nn-v1';
export const V2_FILE_HASH='a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa';
export const V2_DECISION_MS=60000;
export const MAX_STEPS=600;
export const LOOP_LIMIT=12;
export const HISTORY=8;
export const HIDDEN=[64,32];
export const GAMMA=0.995;
export const EXPLORE=0.12;
export const IMITATE_LR=1e-3;
export const MONTE_LR=5e-4;
export const WEIGHT_DECAY=1e-5;
export const IMITATE_EPOCHS=3;
export const LABEL_SMOOTH=0.05;
// Round 2 rebuilds A from a new initialization. Round 1's seed stays unused.
export const INIT_SEED=188510;
export const GRAD_CLIP=1;
// Round 1's 12 minute wall was not the limit; its 8/24/16/8 caps were.
// This wall is fixed before the round-2 games. The planner may stop inside it.
export const WALL_MS=20*60*1000;
export const CHECKPOINTS=4;
export const PLAN_SAFETY=1.4;
export const TRAIN_RESERVE_MS=3*60*1000;
export const BENCH_V2_MS=150000;
export const MEMORY_WORKER_RSS=1.5*1024*1024*1024;
export const WORKER_CAP=2;
// Round 3 locks these before its games. They are not retuned from a win rate.
export const REPLAY_FRACTION=0.5;
export const ROUND3_WALL_MS=20*60*1000;
export const EARLY_GAMES=Object.freeze([1,4]);
export const DIAG_GAMES=4;
export const ROUND3_SELF_CAP=32;
export const ROUND3_DEV_CAP=12;
export const ROUND3_CONFIRM_CAP=12;
export const SCALE_EVAL_SEEDS=4;
export const AGREEMENT_DROP=0.10;
export const SURPASS_SEEDS=8;
// Round 4 locks these before any win rate. They are not a search over the dev curve.
export const CRITIC_INIT_SEED=188520;
export const PPO_CLIP=0.2;
export const PPO_ACTOR_LR=3e-4;
export const PPO_CRITIC_LR=1e-3;
export const PPO_EPOCHS=4;
export const PPO_ENTROPY=0.01;
export const PPO_KL_LIMIT=0.02;
export const PPO_BATCH_GAMES=8;
export const PPO_MAX_BATCHES=12;
export const ROUND4_WALL_MS=20*60*1000;
export const ROUND4_DEV_CAP=12;
export const ROUND4_CONFIRM_CAP=12;
// Round 5 locks the candidate and the new dev block before any of its games.
export const ROUND5_DEV_START=191600;
export const ROUND5_DEV_COUNT=64;
export const ROUND5_CANDIDATE_GAMES=80;
export const KL_QUANTILES=Object.freeze([0.5,0.9,0.95]);
// Round 4's critic stream is CRITIC_INIT_SEED+17. It stays blocked as a game seed.
export const ROUND4_SHUFFLE_SEED=188537;
// Round 6 locks three lines before any of its games. The blocks are the full
// 12-batch draft. A shorter plan uses each line's prefix and does not free the tail.
export const ROUND6_LINES=3;
export const ROUND6_WALL_MS=20*60*1000;
export const ROUND6_DEV_START=192800;
export const ROUND6_DEV_COUNT=64;
export const ROUND6_TRAIN_STARTS=Object.freeze([192200,192400,192600]);
export const ROUND6_CRITIC_SEEDS=Object.freeze([188530,188531,188532]);
export const ROUND6_SHUFFLE_SEEDS=Object.freeze([188540,188541,188542]);
export const ROUND6_BENCH_SHUFFLE=188539;
