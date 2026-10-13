// Read-only, temporary metadata probe for the eight incomplete UA54BT entries.
// Official printed data are not inferred; nothing is automatically committed.
const nums=[10,11,15,19,23,44,64,78];
const strip=html=>html
 .replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
 .replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&amp;/gi,'&')
 .replace(/&lt;/gi,'<')
 .replace(/&gt;/gi,'>')
 .replace(/&quot;/gi,'"')
 .replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(Number(x)))
 .replace(/&#x([\da-f]+);/gi,(_,x)=>String.fromCodePoint(parseInt(x,16)))
 .replace(/[\t\r ]+/g,' ')
 .replace(/\n\s*\n/g,'\n')
 .trim();
let good=0;
for(const n of nums){
 const card='UA54BT/MST-1-'+String(n).padStart(3,'0');
 const url='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(card);
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(13000),headers:{'User-Agent':'Mozilla/5.0 (compatible; UA54BT-card-data-audit/1.0)'}});
  const html=await response.text(),text=strip(html);
  const i=text.indexOf(card),slice=text.slice(Math.max(0,i-140),Math.max(0,i-140)+2600);
  const altMatches=[...html.matchAll(/<img\\b[^>]*alt\\s*=\\s*[\"']([^\"']+)[\"'][^>]*>/gi)].map(x=>x[1]);
  const markers=['必要','発生','トリガー','効果'];
  const around=Object.fromEntries(markers.map(m=>{const p=html.indexOf(m);return [m,p<0?null:html.slice(Math.max(0,p-200),p+600)];}));
  console.log('CARD_AUDIT '+JSON.stringify({card,http:response.status,url,found:i!==-1,text:slice,bytes:html.length,altMatches,around}));
  if(response.ok&&i!==-1)good++;
 }catch(e){console.log('CARD_AUDIT '+JSON.stringify({card,url,error:String(e)}));}
}
console.log('CARD_AUDIT_SUMMARY '+JSON.stringify({good,total:nums.length}));
if(good===0)process.exitCode=1;
