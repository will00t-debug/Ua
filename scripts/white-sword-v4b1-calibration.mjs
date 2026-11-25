#!/usr/bin/env node
// Offline score split and repeated one-step probes. No new matches.
import {mkdirSync,writeFileSync} from 'node:fs';
import {renderCalibration} from '../training/white-sword-ai/v4b1/lib/calibration-report.mjs';
import {studySaved} from '../training/white-sword-ai/v4b1/lib/study.mjs';

const study=studySaved();
const text=renderCalibration(study);
mkdirSync('docs/white-sword-ai/v4b1',{recursive:true});
mkdirSync('training/white-sword-ai/v4b1',{recursive:true});
writeFileSync('docs/white-sword-ai/v4b1/calibration.md',text);
writeFileSync('training/white-sword-ai/v4b1/calibration.md',text);
writeFileSync('training/white-sword-ai/v4b1/calibration.json',JSON.stringify(study,null,2)+'\n');
process.stdout.write(text);
