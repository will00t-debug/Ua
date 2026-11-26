// Gakuen Idolmaster card faces shown in the deck list and battle view.
// The official PNG answers Cross-Origin-Resource-Policy: same-site, so a browser
// on this site cannot paint it and the list falls back to the lightning mark.
// Rugia publishes the same print and allows embedding. No image bytes are stored here.
// Artwork copyright belongs to BANDAI.
export const GIM_ART_CREDIT='卡圖：路基亞（rugiacreation.com）；卡圖著作權屬 BANDAI';
const RUGIA='https://rugiacreation.com/ua/cardlist/small/';
const VERSION='?v=20261126';
const FILE=/^([A-Z0-9]+_GIM-1-(?:\d{3}|AP\d{2})(?:_[A-Za-z0-9]+)?)\.png$/;

export function gimDisplayImage(card){
 const name=String(card?.image||'').split('/').pop()?.split('?')[0]||'';
 const match=FILE.exec(name);
 if(!match)return '';
 return RUGIA+match[1]+'.jpg'+VERSION;
}
