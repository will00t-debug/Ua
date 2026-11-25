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
export const INIT_SEED=188010;
export const GRAD_CLIP=1;
export const WALL_MS=12*60*1000;
export const BENCH_V2_MS=150000;
export const MEMORY_WORKER_RSS=1.5*1024*1024*1024;
export const WORKER_CAP=2;
