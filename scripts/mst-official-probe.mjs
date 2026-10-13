// Read-only, reproducible audit of all eighty UA54BT ordinary cards.
// No card art is downloaded or copied; all original card URLs remain authoritative.
const ids=Array.from({length:80},(_,i)=>i+1);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const tagText=html=>String(html)
 .replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi,(_,alt)=>' 〖'+alt+'〗 ')
 .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
 .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
 .replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
 .replace(/[ \t\r]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
const block=(html,cls)=>{
 const marker='class="cardDataCol '+cls+'"';
 const start=html.indexOf(marker);
 if(start<0)return null;
 const end=html.indexOf('</dl>',start);
 return end<0?null:html.slice(start,end);
};
const altOf=html=>html?.match(/\balt="([^"]*)"/)?.[1]??null;
const numOf=t=>{const v=tagText(t||'').match(/(\d+)/);return v?Number(v[1]):null;};
let good=0;
for(const n of ids){
 const number='UA54BT/MST-1-'+String(n).padStart(3,'0');
 const url='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(number);
 try{
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; UA54BT-audit-read-only/1.0)'},signal:AbortSignal.timeout(12000)});
  const html=await response.text();
  if(!response.ok||!html.includes(number))throw new Error('http '+response.status+' or wrong card');
  const need=altOf(block(html,'needEnergyData'));
  const genAlt=altOf(block(html,'generatedEnergyData'));
  const genBlock=block(html,'generatedEnergyData')||'';
  const genInner=genBlock.match(/<dd[^>]*>([\s\S]*?)<\/dd>/)?.[1]??'';
  const gen=genAlt===null?(tagText(genInner)==='-'?0:null):(genAlt.match(/[青緑赤黄紫]/g)||[]).length;
  const bpMatch=html.match(/<dt[^>]*>BP<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i);
  const bpRaw=bpMatch?tagText(bpMatch[1]):null;
  const bp=bpRaw==='-'?0:(bpRaw?numOf(bpRaw):null);
  const ap=numOf(block(html,'apData'));
  const energy=need===null?null:(need.endsWith('-')?0:Number(need.match(/\d+$/)?.[0]??NaN));
  const trig=block(html,'triggerData')||'';
  const match=trig.match(/ico_(draw|active|get|final|color|special|raid)_trigger/);
  const trigger=match?.[1]||null;
  const body=tagText(block(html,'effectData')||'').replace(/^効果\s*/,'').slice(0,1200);
  const triggerEffectJa=tagText(trig).replace(/^トリガー\s*/,'').slice(0,500);
  const pageText=tagText(html);
  const traitMatch=pageText.match(/特徴\s*\n?\s*([^\n]+?)\s*発生\s*エナジー/);
  const trait=traitMatch?.[1]?.trim()||null;
  const typeName=pageText.match(/カード\s*種類\s*(キャラクター|フィールド|イベント)/)?.[1]||null;
  const type=({'キャラクター':'character','フィールド':'field','イベント':'event'})[typeName]||null;
  const row={id:'MST-1-'+String(n).padStart(3,'0'),energy,ap,bp,gen,type,trigger,trait,effectJa:body,triggerEffectJa,url};
  console.log('CARD_AUDIT80 '+JSON.stringify(row));
  if(Number.isInteger(ap)&&Number.isInteger(energy)&&Number.isInteger(bp)&&Number.isInteger(gen))good++;
 }catch(e){console.log('CARD_AUDIT80 '+JSON.stringify({id:'MST-1-'+String(n).padStart(3,'0'),error:String(e),url}));}
 await sleep(180);
}
console.log('CARD_AUDIT80_SUMMARY '+JSON.stringify({complete:good,total:ids.length}));
if(good!==ids.length)process.exitCode=1;
