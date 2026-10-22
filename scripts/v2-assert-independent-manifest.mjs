#!/usr/bin/env node
// Fail when the hand-maintained card-id manifest and the live V2 registry disagree.
// Expected IDs stay in tests/fixtures and are never derived from the registry.
import {assertIndependentV2Inventory,EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL}
 from '../tests/fixtures/v2-integrated-id-manifest.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';

const audit=v2AllTitleInventory();
assertIndependentV2Inventory(audit);
const lines=Object.entries(EXPECTED_V2_COUNTS).map(([title,count])=>title+' '+count);
process.stdout.write('Independent manifest matches registry: '+lines.join(', ')+'; total '+EXPECTED_V2_TOTAL+'\n');
