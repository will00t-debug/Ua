// Bundle the Durable Object worker. Card modules import with a cache-busting
// query string, which Wrangler cannot resolve, so this step strips those
// queries and writes one file Wrangler can upload.
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
let build;
try{({build}=require('esbuild'));}
catch{
 console.error('缺少 esbuild。請先在專案目錄執行 npm install，再執行 npm run worker:build。');
 process.exit(1);
}
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const outfile=resolve(root,'worker/dist/index.mjs');
await mkdir(dirname(outfile),{recursive:true});
await build({
 absWorkingDir:root,
 entryPoints:[resolve(root,'worker/index.mjs')],
 outfile,
 bundle:true,
 format:'esm',
 platform:'neutral',
 target:'es2022',
 minify:true,
 keepNames:true,
 legalComments:'none',
 external:['cloudflare:workers','node:crypto'],
 plugins:[{
  name:'strip-import-query',
  setup(builder){
   builder.onResolve({filter:/\?/},args=>{
    const path=args.path.replace(/\?.*$/,'');
    return builder.resolve(path,{importer:args.importer,resolveDir:args.resolveDir,kind:args.kind});
   });
  }
 }]
});
console.log('已寫入 '+outfile);
