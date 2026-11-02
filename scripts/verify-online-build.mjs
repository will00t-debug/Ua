import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildOnlineClient} from './build-online-client.mjs';

const directory=await mkdtemp(join(tmpdir(),'ua-online-build-'));
try{
 const a=await buildOnlineClient({outdir:directory,revision:'release-a'});
 const b=await buildOnlineClient({outdir:directory,revision:'release-b'});
 assert.notEqual(a.script,b.script,'a new deployment must have a fresh client URL');
 for(const release of [a,b]){
  const code=await readFile(release.file,'utf8');
  assert.match(release.script,new RegExp('^/online-client-'+release.version+'\\.mjs$'));
  const inputs=Object.keys(release.metafile.inputs);
  for(const file of ['dist/online.mjs','dist/universal-v2/online-battle-ui.mjs','dist/universal-v2/desktop-battle-ui.mjs','dist/online-updates.mjs'])
   assert.ok(inputs.includes(file),file+' must be in the same client bundle');
  assert.equal(inputs.some(file=>file.endsWith('/engine.mjs')||file.startsWith('server/')),false,'the client must not include the authoritative reducer');
  assert.ok(Buffer.byteLength(code)<256*1024,'optional card data must stay lazy');
  const syntax=spawnSync(process.execPath,['--check',release.file],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
 }
 console.log('Online build verified: atomic UI bundle, fresh filenames, no server reducer, valid modules.');
}finally{await rm(directory,{recursive:true,force:true});}
