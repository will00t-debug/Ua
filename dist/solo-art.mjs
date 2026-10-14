// External ordinary-print Solo Leveling (UA51BT/SLG-1) card illustrations.
// Referenced remotely from Rugiacreation; no image bytes are copied into this repository.
// Image copyrights belong to BANDAI. External embedding may change at the source.
export const SOLO_ART_CREDIT='卡圖：路基亞（rugiacreation.com）；卡圖著作權屬 BANDAI';
export const SOLO_ART_FALLBACK='assets/mark.svg';
export const SOLO_RUGIA_SEARCH='https://rugiacreation.com/ua/search?Name=HK&Version=SLG';
export function soloArtSource(id){
 if(!/^SLG-1-\d{3}$/.test(String(id||'')))return SOLO_ART_FALLBACK;
 const n=Number(id.slice(-3));
 if(n<1||n>80)return SOLO_ART_FALLBACK;
 return 'https://rugiacreation.com/ua/cardlist/small/UA51BT_'+id+'.jpg?v=20261013';
}
export function soloArtErrorFallback(img){
 if(!img?.dataset||img.dataset.soloArt!=='1'||img.dataset.soloFallback==='1')return false;
 img.dataset.soloFallback='1';
 img.src=SOLO_ART_FALLBACK;
 return true;
}
