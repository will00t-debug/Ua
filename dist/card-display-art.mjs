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
  image.src=replacement;
 },true);
 installed.add(root);
 return true;
}

installCardArtFallback();
