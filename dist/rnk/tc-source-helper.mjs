// Shared factory for official TC source rows. Source-only, NEVER battle-ready.
// Printed Japanese rule text and all engine programs need independent acceptance.
const TC='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
const IMG='https://www.unionarena-tcg.com/tc/images/cardlist/card/';
const TRIGGER={
  draw:'[抽卡] 抽1張卡片。',
  get:'[獲得] 將這張卡片加入手牌。',
  active:'[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。',
  raid:'[突襲] 將這張卡片加入手牌，或若滿足能源需求可發動突襲。',
  final:'[最終] 若自己沒有生命卡，將1張自己卡組上的卡片放置在生命區。',
  special:'[特別] 選擇1張對手前線角色，使其退場。',
};
export function tcCard(row, set='UA41BT'){
  const id=row.id, number=set+'/'+id;
  if(!/^(RNK-1-\d{3}|RNK-P-\d{3})$/.test(id))throw Error('Bad RNK card id '+id);
  const source=TC+encodeURIComponent(number);
  const image=IMG+number.replace('/','_')+'.png';
  return Object.freeze({
    id, identity:id, number, title:'rnk', set, sets:[set],
    name:row.name, nameZhTw:row.name, nameJa:row.nameJa??null,
    rarity:row.rarity, color:row.color, energy:row.energy,
    ap:row.ap, bp:row.bp??0, bpMark:row.bpMark??'',
    gen:row.gen??0, genMark:row.genMark??'', genColor:row.genColor??row.color,
    type:row.type??'character', traits:Object.freeze(row.traits??[]),
    trigger:row.trigger??null, triggerText:TRIGGER[row.trigger]??'',
    triggerTextJa:null, effect:row.effectZhTw,
    effectZhTw:row.effectZhTw, effectJa:null,
    source, sourceTc:source, image,
    printings:Object.freeze([{number,set,rarity:row.rarity,source,image}]),
    confirmedTc:true, needsManualReview:Boolean(row.needsManualReview), sourceNote:row.sourceNote??null,
    cardDataVerified:false, auto:false,
    battleReady:false, effectImplemented:false, deckLegal:true, faq:[]
  });
}
export function tcRows(rows,set='UA41BT'){
  return Object.freeze(rows.map(row=>tcCard(row,set)));
}
