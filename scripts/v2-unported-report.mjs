#!/usr/bin/env node
import {assertIndependentV2Inventory} from '../tests/fixtures/v2-integrated-id-manifest.mjs';
// Source-driven reporting only. Does not mutate repository or V2 readiness.
import {formatV2UnportedIds,v2AllTitleInventory}
 from '../dist/universal-v2/title-packs/inventory.mjs';
const audit=v2AllTitleInventory();
assertIndependentV2Inventory(audit);
if(audit.totals.total!==700)
 throw Error('Unexpected official regular-card set size: '+audit.totals.total);
process.stdout.write(formatV2UnportedIds()+'\n');
