import {createServer} from 'node:http';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHandler} from './http.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const dataFile=process.env.UA_DATA_FILE||join(root,'data','account.sqlite');
const requested=Number(process.env.PORT);
const port=Number.isInteger(requested)&&requested>0&&requested<65536?requested:8787;
const handler=await createHandler({dataFile,staticRoot:join(root,'dist')});
createServer(handler).listen(port,'0.0.0.0',()=>{
 console.log('UNION ARENA 帳號與線上對戰：http://localhost:'+port);
 console.log('帳號、牌組與未結束的對戰寫在 '+dataFile);
});
