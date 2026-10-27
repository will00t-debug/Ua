import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const CANONICAL='https://ua-arena.will00t.workers.dev';

test('Cloudflare keeps battle, deck gallery and accounts on one host',()=>{
 const wrangler=JSON.parse(read('../wrangler.jsonc'));
 assert.equal(wrangler.assets.html_handling,'none');
 assert.equal(wrangler.assets.run_worker_first,true);
 const worker=read('../worker/index.mjs');
 assert.match(worker,/\/universal-v2-preview\.html/);
 assert.match(worker,/\/index\.html/);
 assert.match(worker,/\/online\.html/);
 assert.match(worker,/html_handling is "none"/);
});

test('the Vercel hostname redirects onto that same host unless stay=1',()=>{
 const routes=JSON.parse(read('../vercel.json'));
 assert.deepEqual(routes.rewrites,[{source:'/',destination:'/universal-v2-preview.html'}]);
 assert.equal(routes.redirects.length,2);
 for(const redirect of routes.redirects){
  assert.equal(redirect.permanent,false);
  assert.deepEqual(redirect.missing,[{type:'query',key:'stay'}]);
  assert.match(redirect.destination,new RegExp('^'+CANONICAL.replace(/[.]/g,'\\.')+'/?')) ;
 }
 assert.equal(routes.redirects[0].destination,CANONICAL+'/');
 assert.equal(routes.redirects[1].destination,CANONICAL+'/:path*');
});
