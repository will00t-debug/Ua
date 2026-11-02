import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {basename,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);

export async function buildOnlineClient({outdir=resolve(root,'dist'),revision=process.env.GITHUB_SHA||process.env.VERCEL_GIT_COMMIT_SHA||''}={}){
 const {build}=require('esbuild');
 const stamp=createHash('sha256').update(revision);
 const dist=resolve(root,'dist');
 for(const name of (await readdir(dist)).filter(name=>name.endsWith('.css')).sort())
  stamp.update(name).update(await readFile(resolve(dist,name)));
 stamp.update(await readFile(resolve(dist,'online-bootstrap.mjs')));
 const entry=resolve(dist,'online.mjs');
 const result=await build({
  absWorkingDir:root,entryPoints:[entry],outdir,entryNames:'online-client-[hash]',outExtension:{'.js':'.mjs'},
  bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,keepNames:true,
  write:false,metafile:true,legalComments:'none',banner:{js:'// online release '+stamp.digest('hex')},
  inject:[resolve(root,'scripts/online-battle-inject.mjs')],
  plugins:[{name:'keep-optional-online-data-lazy',setup(builder){
   builder.onResolve({filter:/^\./},args=>args.kind==='dynamic-import'&&args.importer===entry?
    {path:args.path,external:true}:undefined);
  }}]
 });
 const output=result.outputFiles[0],name=basename(output.path);
 const version=/^online-client-([A-Z0-9]{8})\.mjs$/.exec(name)?.[1];
 if(!version)throw new Error('Missing fingerprinted online client');
 await mkdir(outdir,{recursive:true});await writeFile(output.path,output.contents);
 return {version,script:'/'+name,metafile:result.metafile,file:output.path};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const release=await buildOnlineClient();console.log('Online client '+release.version+': '+release.script);
}
