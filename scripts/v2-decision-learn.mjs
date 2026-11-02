// Train one policy from an exported decision JSONL file.
// The file stays on this machine. This script does not upload it and does
// not write a policy unless --out is given.
import {readFileSync} from 'node:fs';
import {writeFileSync} from 'node:fs';
import {learnReport,rowsFromJsonl,trainPolicy} from '../dist/universal-v2/learn-policy.mjs';

const args=process.argv.slice(2);
const source=args.find(arg=>!arg.startsWith('--'));
const outFlag=args.indexOf('--out');
const out=outFlag>=0?args[outFlag+1]:'';
if(!source){
 console.error('用法：node scripts/v2-decision-learn.mjs 匯出的.jsonl [--out 政策.json]');
 process.exit(1);
}
const policy=trainPolicy(rowsFromJsonl(readFileSync(source,'utf8')));
console.log(learnReport(policy));
console.log('格式 '+policy.format+'，訓練 '+policy.trainedSamples+' 筆，留出 '+policy.heldoutSamples+' 筆。');
if(out){
 writeFileSync(out,JSON.stringify(policy)+'\n');
 console.log('已寫入 '+out+'。這是權重，不是牌譜；不要把玩家匯出檔提交到 Git。');
}
