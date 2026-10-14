import test from 'node:test';
import assert from 'node:assert/strict';

test('all four non-playable series have usable isolated draft editors and BLEACH returns unchanged',async()=>{
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const stored=new Map();
 globalThis.document={querySelector:q=>q==='#app'?app:q==='#toast'?toast:null,onkeydown:null};
 globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 globalThis.window={scrollTo(){},open(){}};
 const old=globalThis.setTimeout;globalThis.setTimeout=()=>1;
 const click=dataset=>{assert.equal(typeof app.onclick,'function');app.onclick({target:{closest:()=>({dataset,disabled:false})}});};
 try{
  await import('../dist/app.mjs?four-series-ui-smoke');
  click({view:'builder'});
  const examples=[
   ['gurren-lagann','天元突破','ttgCount','TTG-1-064','ua-ttg-draft-v1'],
   ['sword-art-online','刀劍神域','saoCount','SAO-1-004','ua-sao-draft-v1'],
   ['solo-leveling','我獨自升級','soloCount','SLG-1-001','ua-slg-draft-v1'],
   ['mushoku-tensei','無職轉生','mstCount','MST-1-007','ua-mst-draft-v1']
  ];
  for(const [title,label,key,id,storage] of examples){
   click({title});
   assert.ok(app.innerHTML.includes(label),title);
   if(title==='gurren-lagann'||title==='solo-leveling')assert.match(app.innerHTML,/已接入共用對戰入口（Beta）/);
   else assert.match(app.innerHTML,/尚未開放對戰/);
   click({[key]:id,delta:'1'});
   assert.equal(JSON.parse(stored.get(storage))[id],1,title+' independent draft');
  }
  assert.equal([...stored.keys()].filter(k=>/ua-(ttg|sao|slg|mst)-draft-v1/.test(k)).length,4);
  click({title:'bleach'});
  assert.match(app.innerHTML,/編輯牌組/);
  assert.match(app.innerHTML,/data-title=/);
 }finally{globalThis.setTimeout=old;}
});
