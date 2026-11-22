#!/usr/bin/env node
// Coarse safety/viability pilot gate only. No parameter search or promotion.
// Complete 840-game evaluation is independent and is skipped for an obviously
// harmful/ineffective policy (4 pilot seeds are never reused for final).
import {readFileSync} from 'node:fs';
import {V33_PILOT_SEEDS} from '../dist/universal-v2/white-sword-ai/v33-protocol.mjs';
const report=JSON.parse(readFileSync('docs/white-sword-ai/v33/pilot.json','utf8'));
const {matched,mirrors}=report;
if(report.actualGames!==112||matched?.length!==48||mirrors?.length!==16)
 throw Error('Unrecognized 112-game pilot');
const keys=matched.map(x=>[x.seed,x.seat,x.first,x.deckId].join('/'));
if(new Set(keys).size!==48||matched.some(x=>!V33_PILOT_SEEDS.includes(x.seed)))
 throw Error('Incomplete or reused pilot fixtures');
const old=matched.filter(x=>x.v2win).length;
const next=matched.filter(x=>x.v33win).length;
const direct=mirrors.filter(x=>x.win).length;
const differing=matched.filter(x=>x.diverged).length;
const delta=(next-old)/48;
const reasons=[];
if(delta<-.10)reasons.push('pilot matched win rate fell more than 10pp');
if(direct<5)reasons.push('pilot direct mirror wins fewer than 5/16');
if(differing<3)reasons.push('policy rarely changes decisions (<3 of 48 matches)');
const result={v2:old,v33:next,pairs:48,delta,headToHeadWins:direct,differing,
 pass:reasons.length===0,reasons};
console.log('V33_PILOT_GATE',JSON.stringify(result,null,2));
if(!result.pass)throw Error('v3.3 pilot viability gate failed. Keep incumbent v2. '+reasons.join('; '));
