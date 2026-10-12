import {writeFileSync} from 'node:fs';
const host='https://www.unionarena-tcg.com';
const plans=[['UA15BT','SAO-1',100],['EX08BT','SAO-2',74],['UA15ST','SAO-1',125],['UAPR','SAO-1',125],['UAPR','SAO-2',100]];
const decode=s=>String(s||'').replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&nbsp;':' ','&#39;':"'"})[x]||x);
const clean=s=>decode(String(s||'').replace(/<br\s*\/?>/gi,'\n').replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi,(_,alt)=>'【'+decode(alt)+'】').replace(/<[^>]+>/g,'')).trim().replace(/\s*\n\s*/g,'\n');
function section(h,cls){const d=h.match(new RegExp('<dl class="cardDataCol '+cls+'">([\\s\\S]*?)<\\/dl>'));return d?.[1].match(/<dd class="cardDataContents">([\s\S]*?)<\/dd>/)?.[1]||'';}
function parse(h,num){
 const number=clean(h.match(/class="cardNumData">([^<]+)</)?.[1]);
 if(number!==num)return null;
 const typeName=clean(section(h,'categoryData'));
 if(typeName==='アクションポイント')return null;
 const type={'キャラクター':'character','イベント':'event','フィールド':'field'}[typeName];
 if(!type)throw Error('unknown type '+num+': '+typeName);
 const name=clean((h.match(/<h2 class="cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]?.replace(/<span class="rubyData">[\s\S]*?<\/span>/,''));
 const en=section(h,'needEnergyData').match(/energy_(yellow|blue|purple|green|red)(\d+)/);
 if(!en)throw Error('energy missing '+num);
 const ap=Number(clean(section(h,'apData')));
 const bpText=clean(section(h,'bpData'));
 const gen=[...section(h,'generatedEnergyData').matchAll(/ico_resource_energy_(?:yellow|blue|purple|green|red)(\d+)/g)].reduce((n,x)=>n+Number(x[1]),0);
 const rarity=clean(h.match(/class="rareData">([^<]+)/)?.[1]);
 const effectJa=clean(section(h,'effectData'));
 const traits=clean(section(h,'attributeData')).split(/[、,/]/).map(x=>x.trim()).filter(x=>x&&x!=='-');
 const trig=section(h,'triggerData').match(/ico_(get|draw|active|special|final|raid|color)_trigger/);
 const art=h.match(/<dd class="cardDataImgCol"><img src="([^"]+)"/)?.[1];
 if(!name||!art||!Number.isInteger(ap)||!Number.isInteger(gen))throw Error('bad official record '+num);
 const id=num.split('/')[1];
 return {id,identity:id,number:num,name,nameJa:name,title:'sword-art-online',set:num.split('/')[0],type,color:en[1],energy:Number(en[2]),ap,bp:Number(bpText.match(/\d+/)?.[0]||0),bpPrinted:bpText,gen,traits,rarity,trigger:trig?.[1]||null,effect:effectJa,effectJa,image:host+art,source:host+'/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(num),translationStatus:'pending',auto:false};
}
async function fetchOfficial(number){
 const u=host+'/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(number);
 for(let tries=0;tries<3;tries++){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
  try{const r=await fetch(u,{signal:ctl.signal});if(r.status===404)return null;if(!r.ok)throw Error('HTTP '+r.status);return await r.text();}
  catch(e){if(tries===2)throw e;await new Promise(r=>setTimeout(r,500));}
  finally{clearTimeout(timer);}
 }
}
const todo=plans.flatMap(([set,prefix,last,first=1])=>Array.from({length:last-first+1},(_,i)=>set+'/'+prefix+'-'+String(first+i).padStart(3,'0')));
const records=[],fail=[];let n=0;
await Promise.all(Array.from({length:8},async()=>{while(todo.length){const number=todo.shift();try{const h=await fetchOfficial(number);const card=h?parse(h,number):null;if(card)records.push(card);}catch(e){fail.push({number,error:e.message});}if(++n%50===0)console.log('checked',n,'valid',records.length,'failed',fail.length);}}));
records.sort((a,b)=>a.number.localeCompare(b.number));
const counts=Object.fromEntries(plans.map(p=>[p[0],records.filter(x=>x.set===p[0]).length]));
const groups=Object.groupBy(records,x=>x.id),duplicateCodes=Object.entries(groups).filter(([,v])=>v.length>1).map(([id,v])=>({id,prints:v.map(x=>x.number),sameStats:v.every(x=>['type','energy','ap','bp','gen','color','effectJa'].every(k=>x[k]===v[0][k]))}));
console.log('RESULT',JSON.stringify({counts,unique:Object.keys(groups).length,duplicates:duplicateCodes,fetchErrors:fail.slice(0,20)}));
if(fail.length||counts.UA15BT<95||counts.EX08BT<70||counts.UA15ST<10)throw Error('Incomplete official card crawl; aborting without modifying files');
writeFileSync('dist/sao-official-import.mjs','// Generated from official JP card detail pages. Never mark unimplemented cards playable.\nexport const SAO_OFFICIAL_CARDS='+JSON.stringify(records,null,1)+';\n');
writeFileSync('dist/sao-official-audit.json',JSON.stringify({fetchedAt:new Date().toISOString(),counts,unique:Object.keys(groups).length,duplicates:duplicateCodes,fetchErrors:fail},null,2)+'\n');
