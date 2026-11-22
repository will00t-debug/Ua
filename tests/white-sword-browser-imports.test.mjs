import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const WORKER='dist/universal-v2/white-sword-ai/browser-worker.mjs';

function importedModules(source){
 const out=[];
 // All static ESM imports including multi-line declarations and re-exports.
 const pattern=/\b(?:import|export)\s+(?:[\s\S]*?\s+from\s*)?['"]([^'"]+)['"]/g;
 // Match line-scoped imports; do not swallow arbitrary source code into an
 // import if a comment or non-import statement sits between declarations.
 for(const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?:(?:.|\n)*?\s+from\s*)?['"]([^'"]+)['"]/g)) out.push(match[1]);
 void pattern;
 return out;
}

test('white sword browser worker dependency graph has no Node-only imports',()=>{
 const seen=new Set();
 const visit=path=>{
  const normalized=resolve(ROOT,path);
  if(seen.has(normalized))return;
  seen.add(normalized);
  assert.ok(existsSync(normalized),'missing worker dependency: '+path);
  const source=readFileSync(normalized,'utf8');
  for(const specifier of importedModules(source)){
   const spec=specifier.split('?')[0];
   assert.ok(!spec.startsWith('node:'),'Node-only import '+spec+' in '+path);
   assert.ok(spec.startsWith('.'),'non-browser dependency '+spec+' in '+path);
   const next=resolve(dirname(normalized),spec);
   assert.equal(extname(next),'.mjs','unexpected browser module extension '+next);
   visit(next.slice(ROOT.length+1));
  }
 };
 visit(WORKER);
 assert.ok(seen.size>=10,'browser module graph traversal unexpectedly small');
});
