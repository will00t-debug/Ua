// Q51 / Q552. Rugia HK span.raidBorder on 2026-11-19 is the split.
// TRK-1-009 keeps BP-down immunity outside the frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import {raidBoxListed} from '../dist/universal-v2/raid-box.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const frames={
 'TRK-1-009':['staticBp','onPlay','onBlock'],
 'TRK-1-013':['readyOnBlockCount','attackWinDraw','frontMustAttackIfName'],
 'TRK-1-017':['printedAttackDamage','attackWinHandRest','main'],
 'TRK-1-054':['passive','onAttack'],
 'TRK-1-072':['passive','onPlay','onRetire'],
 'TRK-1-081':['onPlay','onAttack'],
 'TRK-1-088':['unblockedAttack','onPlay'],
 'TRK-1-091':['oppEffectRetireInstead','main'],
 'TRK-1-106':['passive','onPlay']
};

test('Toriko raid tops list every framed keyword and leave 009 immunity outside',()=>{
 const pack=officialV2Pack('toriko');
 const raidIds=Object.values(pack.cards).filter(c=>c.raidName||c.raidTrait).map(c=>c.id).sort();
 assert.deepEqual(raidIds,Object.keys(frames).sort());
 for(const [id,features] of Object.entries(frames))
  for(const feature of features)assert.equal(raidBoxListed(id,feature),true,id+' '+feature);
 assert.equal(raidBoxListed('TRK-1-009','bpDownImmune'),false);
 assert.equal(raidBoxListed('TRK-1-009','staticBp'),true);
});
