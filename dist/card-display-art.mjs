// Presentation-only fallbacks for public UNION ARENA card art.
// Official cardlist PNGs can reject cross-site embedding (see PR #622).
// Rugia uses the same set + printed card number for ordinary JPEGs.
// Artwork copyright belongs to BANDAI; the alternative catalogue is rugiacreation.com.
// Keep official metadata, already-working art, and alternate-print suffixes intact.
const OFFICIAL_REGULAR=/^https:\/\/www\.unionarena-tcg\.com\/(?:jp|tc)\/images\/cardlist\/card\/([A-Z0-9]+_[A-Z0-9]+-(?:\d+|P)-(?:\d{3}|AP\d{2}))\.png(?:\?[^#]*)?$/;
const RUGIA='https://rugiacreation.com/ua/cardlist/small/';
const VERSION='?v=20261016';

export function fallbackCardArtUrl(source){
 if(typeof source!=='string')return '';
 const match=OFFICIAL_REGULAR.exec(source);
 return match?RUGIA+match[1]+'.jpg'+VERSION:'';
}

const installed=new WeakSet();
const resolved=new Map();
const pending=new WeakMap();

export function resolvedCardArtUrl(source){
 return resolved.get(source)||source;
}

function reuseImage(image){
 if(image?.localName!=='img'||typeof image.getAttribute!=='function')return;
 const source=image.getAttribute('src');
 const replacement=resolvedCardArtUrl(source);
 if(replacement&&replacement!==source){
  pending.set(image,{source,replacement});
  image.src=replacement;
 }
}

// Image errors do not bubble, so capture runs before the existing per-image
// lightning fallback. Only the exact official card-image route is intercepted.
// A failed Rugia request is not matched again and the original error handler
// remains free to display its normal placeholder. Logos and backs are untouched.
export function installCardArtFallback(root=globalThis.document){
 if(!root||typeof root.addEventListener!=='function'||installed.has(root))return false;
 root.addEventListener('error',event=>{
  const image=event.target;
  if(image?.localName!=='img'||typeof image.getAttribute!=='function')return;
  const replacement=fallbackCardArtUrl(image.getAttribute('src'));
  if(!replacement)return;
  event.stopImmediatePropagation();
  pending.set(image,{source:image.getAttribute('src'),replacement});
  image.src=replacement;
 },true);
 root.addEventListener('load',event=>{
  const image=event.target;
  const attempt=pending.get(image);
  if(attempt&&image.getAttribute('src')===attempt.replacement){
   resolved.set(attempt.source,attempt.replacement);
   pending.delete(image);
  }
 },true);
 // New DOM nodes are processed before the next paint, including full hand redraws.
 if(typeof globalThis.MutationObserver==='function'&&root.nodeType){
  const observer=new globalThis.MutationObserver(records=>{
   for(const record of records){
    if(record.type==='attributes')reuseImage(record.target);
    for(const node of record.addedNodes||[]){
     reuseImage(node);
     for(const image of node.querySelectorAll?.('img')||[])reuseImage(image);
    }
   }
  });
  observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  for(const image of root.querySelectorAll?.('img')||[])reuseImage(image);
 }
 installed.add(root);
 return true;
}

installCardArtFallback();
