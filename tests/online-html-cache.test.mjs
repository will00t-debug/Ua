import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentPage,ONLINE_UI_VERSION} from '../worker/static-pages.mjs';

test('an old browser ETag cannot keep serving a previous online HTML release',async()=>{
 let seen;
 const request=new Request('https://example.test/online?room=ABCD2345',{
  headers:{'if-none-match':'old-ui','if-modified-since':'Mon, 02 Nov 2026 00:00:00 GMT',range:'bytes=0-20','accept-language':'zh-TW'}
 });
 const assets={async fetch(next){seen=next;return new Response('<script src="online.mjs?v='+ONLINE_UI_VERSION+'"></script>',{
  headers:{'content-type':'text/html','cache-control':'public, max-age=3600','etag':'new-ui'}
 });}};
 const response=await currentPage(request,assets,'/online.html');
 assert.equal(seen.url,'https://example.test/online.html?room=ABCD2345');
 for(const name of ['if-none-match','if-modified-since','range'])assert.equal(seen.headers.has(name),false);
 assert.equal(seen.headers.get('accept-language'),'zh-TW');
 assert.equal(request.headers.get('if-none-match'),'old-ui','do not mutate the inbound request');
 assert.equal(response.status,200);
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(response.headers.get('x-ua-ui-version'),ONLINE_UI_VERSION);
 assert.match(await response.text(),new RegExp(ONLINE_UI_VERSION));
 const html=readFileSync(new URL('../dist/online.html',import.meta.url),'utf8');
 assert.ok(html.includes('online.mjs?v='+ONLINE_UI_VERSION),'health, HTML and browser script identify the same release');
});

test('HEAD page requests stay bodyless and asset failures retain their status',async()=>{
 const request=new Request('https://example.test/online.html',{method:'HEAD'});
 const assets={async fetch(next){assert.equal(next.method,'HEAD');return new Response(null,{status:404});}};
 const response=await currentPage(request,assets,'/online.html');
 assert.equal(response.status,404);assert.equal(await response.text(),'');
});
