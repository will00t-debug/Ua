import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import test from 'node:test';

function runPreflight(env){
 return spawnSync(process.execPath,['scripts/cloudflare-deploy-preflight.mjs'],{
  encoding:'utf8',
  env:{...process.env,...env},
 });
}

test('Cloudflare deploy preflight accepts current ua-arena Durable Object bindings without printing secrets',()=>{
 const token='test-token-not-real';
 const account='test-account-not-real';
 const result=runPreflight({
  CLOUDFLARE_API_TOKEN:token,
  CLOUDFLARE_ACCOUNT_ID:account,
 });
 assert.equal(result.status,0,result.stderr||result.stdout);
 assert.match(result.stdout,/Preflight OK/);
 assert.match(result.stdout,/credentials: present/);
 assert.doesNotMatch(result.stdout,new RegExp(token));
 assert.doesNotMatch(result.stderr||'',new RegExp(token));
 assert.doesNotMatch(result.stdout,new RegExp(account));
 assert.doesNotMatch(result.stderr||'',new RegExp(account));
});

test('Cloudflare deploy preflight fails closed when secrets are missing',()=>{
 const result=runPreflight({
  CLOUDFLARE_API_TOKEN:'',
  CLOUDFLARE_ACCOUNT_ID:'',
 });
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/CLOUDFLARE_API_TOKEN/);
});
