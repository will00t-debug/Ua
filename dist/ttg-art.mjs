// Remote, non-redistributed regular card illustrations from Rugiacreation's public catalogue.
// The copyright in the printed artwork belongs to BANDAI. No image bytes are stored in this repository.
// Verify that upstream external embedding remains permitted before production use.
export const TTG_ART_CREDIT='卡圖：路基亞（rugiacreation.com）；卡圖著作權屬 BANDAI';
export const TTG_ART_FALLBACK='assets/mark.svg';
export const TTG_RUGIA_CARD_SEARCH='https://rugiacreation.com/ua/search?Name=HK&Version=TTG';
export function ttgArtSource(id){
 if(!/^TTG-1-\d{3}$/.test(String(id||'')))return TTG_ART_FALLBACK;
 return 'https://rugiacreation.com/ua/cardlist/small/UA56BT_'+id+'.jpg?v=20261013';
}
export function ttgArtErrorFallback(img){
 if(!img?.dataset||img.dataset.ttgArt!=='1'||img.dataset.ttgFallback==='1')return false;
 img.dataset.ttgFallback='1';
 img.src=TTG_ART_FALLBACK;
 return true;
}
