// Regular-print card images hosted by the official Japanese UNION ARENA card list.
// Remote URLs only: card artwork is never copied into this repository.
// Do not mistake AP, promotional or parallel prints for numbered regular prints.
export const MST_OFFICIAL_ART_BASE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';
export function mstOfficialCardArt(id){
 const matched=/^MST-1-(\d{3})$/.exec(String(id||''));
 if(!matched)return null;
 const number=Number(matched[1]);
 if(number<1||number>80)return null;
 return MST_OFFICIAL_ART_BASE+'UA54BT_'+matched[0]+'.png?v9=';
}
