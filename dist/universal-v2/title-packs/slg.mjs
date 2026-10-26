// [V2-C] Workstream-owned SLG contribution. Legacy solo match engine is never used.
import {SOLO_LEVELING_CARDS} from '../../solo-leveling.mjs';
import {verifiedSlgV2Cards} from '../slg-pack.mjs';
const records=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const proof=Object.freeze({
 '021':['戰鬥獲勝時可回收場外非水篠旬角色',
 'Official UA51BT/SLG-1-021 水篠 旬 purple5/AP1/BP4000/gen1, raid 水篠 旬, RAID Life. Live BP >=6000 gains IMPACT1; own OUTSIDE each five cards gives +500 BP onAttack; true attacking battle victory chooses up to one own OUTSIDE CHARACTER other than printed name 水篠 旬 with printed BP <=2000+500 per five own OUTSIDE (not current BP). Unconditional onPlay mandatory legal BLOCK grant lasts this turn; Q2028 2026-04-17 requires a legal opponent blocker if any, otherwise normal LIFE. Same physical UID/entry stamp preserved. Full official https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-021; all-FAQ certification is independent.'],
 '028':['以ACTIVE登場',
 'Official UA51BT/SLG-1-028 イグリット purple4/AP2/BP4000/影の軍団; enters ACTIVE without an opponent condition. OnPlay may choose up to one exact named 〈影の兵士〉 from OWN HAND OR OWN OUTSIDE and enter any legal line REST for free; nested onPlay of SLG-1-030 resolves using existing effectQueue, GET life separately. Official https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-028; not complete independent FAQ certification.'],
 '030':['同卡號牌組最多12張',
 'Official UA51BT/SLG-1-030 影の兵士 PURPLE0/AP1/BP1500/gen1/DRAW life: deck limit 12 copies; onPlay requires OTHER own field character with exact trait 影の軍団; inspect TOP2, optionally send one either exact trait 影の軍団 OR named 〈水篠 旬〉 outside, reorder rest to TOP. Q no per-card special ruling found. Printed source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-030; not fully independently FAQ-certified.'],
 '046':['登場時：查看牌庫頂4張','Official UA51BT/SLG-1-046 水篠 旬 GREEN1/AP1/BP2000/gen1, no LIFE; TOP4 reveal 0..1 exact name 水篠 旬 OR デイリークエスト, bottom-order rest, only on successful addition discard exactly one own hand card. Reuses existing contingent TOP-N search op; full FAQ certification remains independent.'],
 '070':['登場時令另一己方DFN角色最多1張',
 'Official UA51BT/SLG-1-070 シーマ GREEN0/AP1/BP1000/gen1, printed compound DFN／第四次架南島レイド traits and ACTIVE Life. OnPlay choose UP TO ONE OTHER OWN field DFN character; during next opponent turn, that opponent must pay extra 1 READY AP when selecting this stamped target by a CARD EFFECT; may choose another or 0 if allowed, and without AP cannot choose it. Explicit Q2062 2026-04-17. Physical UID/field stamp, AI choice, optional 0 and owner-only private state in tests/v2-r33-slg070-official.test.mjs; complete all-FAQ certificate NOT claimed.'],
 '053':['Impact無效。登場時若場上有己方水篠旬，抽1張。','Original Japanese UA51BT/SLG-1-053 諸菱 賢太 GREEN3/AP1/BP2000/gen2 DRAW Life separately: IMPACT nullification plus onPlay draw exactly 1 only when OWN field has 〈水篠 旬〉 in front or energy line. Both printed clauses share existing native impactNull and drawIfOwnName V2 predicates, no separate reducer. Official https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-053; not fully FAQ certified.'],
 '023':['兩次阻擋：本回合第一次阻擋時ACTIVE。','Official UA51BT/SLG-1-023 水篠 潤一郎 purple4/AP1/BP4000/gen1. Printed [2回ブロック] uses the shared readyOnBlockCount of 1. ACTIVE life is the generic own-character ACTIVE plus BP+3000. Catalogue traits are empty. Official page checked 2026-10-22; not a full FAQ certification. https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-023'],
 '056':['Impact1。','Official UA51BT/SLG-1-056 向坂 雫 green2/AP1/BP3000/gen1 no trigger. Printed impact is exactly 1 on a won battle. Official trait is the single token 第四次架南島レイド; the catalogue token 第四次架南島Raid is the known wrong label and is not registered. No life trigger. Page checked 2026-10-22; not a full FAQ certification.'],
 '069':['己方回合手牌5張以上時BP+1500。','Official UA51BT/SLG-1-069 ケン green2/AP1/BP2500/gen1. Own turn and own hand of at least 5 gives BP+1500 through ownHandCountAtLeast. Official trait is one token DFN／第四次架南島レイド; the catalogue splits DFN and 第四次架南島Raid and is not registered. No life trigger. Page checked 2026-10-22; not a full FAQ certification.'],
 '062':['己方回合中若場上有5張以上第四次架南島Raid卡，BP+1500。','Official UA51BT/SLG-1-062 最上 真 green0/AP1/BP1500/gen1 DRAW. Own turn and at least five own-field characters with the official trait 第四次架南島レイド, including this card, give BP+1500. The printed sentence has no 他の. Catalogue trait 第四次架南島Raid is the known wrong token and is not registered. Page checked 2026-10-22; no FAQ block; not a full FAQ certification.'],
 '072':['登場時若己方有3張以上DFN，抽1張。','Official UA51BT/SLG-1-072 ミズア GREEN3/AP1/BP2000/gen2, no LIFE; onPlay draw 1 if own field has at least 3 cards with DFN trait including this entering character. The printed trait is one token DFN／第四次架南島レイド; components are independently source-audited, never inferred by splitting arbitrary slash text. Official https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-072; full FAQ acceptance remains outstanding.'],
 '065':['己方回合手牌5張以上時BP+1000並獲Impact1。','Official UA51BT/SLG-1-065 アーシー green4/AP1/BP4000/gen1 DRAW. Printed BP is 4000+. Own turn and own hand of at least 5 give both BP+1000 and impact 1. Generated energy alt is 緑, so gen is 1. Official trait is one token DFN／第四次架南島レイド. Page checked 2026-10-22; no FAQ block; not a full FAQ certification.'],
 '027':['原本BP2500以下且REST的己方影之軍團角色，BP+500','Official UA51BT/SLG-1-027 アイアン purple2/AP1/BP3000+/gen1, no trigger. Generated alt is 紫, so gen is 1. Own turn: each REST own-field character whose printed BP is 2500 or less and whose trait token is exactly 影の軍団 gives BP+500. Q2030: 元々のBP is the printed number. Q2070: a field has no BP and is not counted. The catalogue trait 影之軍團 is not registered. Page checked 2026-10-22; not a full FAQ certification.'],
 '017':['若己方場上沒有任何卡，手牌中需求能源減少紫2。登場時查看牌庫頂1張','UA51BT/SLG-1-017 水篠 旬 purple2/AP1/BP2000/gen1 ACTIVE life separate. Hand required energy is reduced by 2 only while both own lines are empty; the card is purple, so the shared empty-field discount matches the printed purple-2 reduction. OnPlay peeks the top card and may put it outside. Official page was not re-read in this batch; the catalogue Chinese is the text anchor. Not a full FAQ certification. https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-017'],
 '074':['登場時令另一己方DFN角色最多1張本回合獲Impact1。','UA51BT/SLG-1-074 ルノー green2/AP1/BP3000/gen1 DRAW life separate. OnPlay may grant Impact 1 this turn to up to one other own character with the DFN component. Official trait is one token DFN／第四次架南島レイド; the catalogue split is not registered. Official page was not re-read in this batch. Not a full FAQ certification. https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-074'],
 '050':['主要階段REST並退場此角色，可從己方場外回收最多1張水篠旬。','UA51BT/SLG-1-050 観月 絵里 green0/AP1/BP500/gen1, no trigger. Main: REST this ready character, true-retire it, then optionally recover one own outside character named 水篠 旬. Official page was not re-read in this batch. Not a full FAQ certification. https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-050'],
 '071':['主要階段每回合一次：REST自己，使另一己方角色本回合BP+1000並將自身返回手牌。','UA51BT/SLG-1-071 マリー green0/AP1/BP1500/gen1 DRAW life separate. Main once per physical card this turn: REST, give another own character BP+1000 this turn, then return this card to hand. Official trait is one token DFN／第四次架南島レイド. Official page was not re-read in this batch. Not a full FAQ certification. https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-071'],
 '063':['登場時查看牌庫頂3張，可公開最多1張第四次架南島Raid卡加入手牌','UA51BT/SLG-1-063 最上 真 green1/AP1/BP1500/gen1 DRAW life separate. OnPlay inspects top 3, may add one card with official trait 第四次架南島レイド to hand, orders the rest to the bottom, and discards one hand card only if a card was added. Catalogue token 第四次架南島Raid is not registered. Official page was not re-read in this batch. Not a full FAQ certification.'],
 '054':['登場時查看牌庫頂2張，可把其中最多1張具有第四次架南島Raid特徵的卡送場外','UA51BT/SLG-1-054 黒須 圭介 green0/AP1/BP1500/gen1 ACTIVE life separate. OnPlay inspects top 2, may send one official trait 第四次架南島レイド card outside, and returns the rest to the top in chosen order. Official page was not re-read in this batch. Not a full FAQ certification.'],
 '003':['經自己的效果從場外加入手牌時，可讓己方1個角色本回合BP+1000','UA51BT/SLG-1-003 朝比奈 りん purple2/AP1/BP3000/gen1 ACTIVE life separate. Own-effect outside-to-hand may give one own character BP+1000 this turn. Ten or more own outside cards generate one extra purple energy on either turn. OnAttack peeks one top card. This recover buff is not the SLG-014 energy entry. Official page was not re-read in this batch. Not a full FAQ certification.'],
 '024':['本角色不會被BP4000以上角色阻擋','UA51BT/SLG-1-024 道門 泰星 purple1/AP1/BP2500/gen1 no trigger. Cannot be blocked by BP 4000 or higher. On retire the opponent may give one of their field characters the same this-turn ceiling. Official page was not re-read in this batch. Not a full FAQ certification.'],

 '042':['主要階段每回合一次REST自己，額外產生1綠能源，主要階段結束時退場。','Official UA51BT/SLG-1-042 2026-04-17 errata-aware source: 馬渕 勲 GREEN0/AP1/BP1000/gen1 no life; rest OWN READY ENERGY source MAIN once per turn, current-turn GREEN+1, mandatory source retirement at MAIN end. Reuses native delayed-retire V2 primitive from SLG-1-013, TTG-1-063, BLEACH-1-069; old Japanese source name corrected in original official errata. No full FAQ certification.'],

 '004':['自己的回合中，若本回合曾以己方效果將手牌送場外或從場外回收手牌','Official Japanese UA51BT/SLG-1-004 犬飼 晃 purple3/AP1/BP3500/gen1 DRAW life. OnPlay mandatory draw ONE then put ONE own HAND card into OUTSIDE. Live own-turn BP+500 only if since current turn start one OWN effect physically moved own HAND to OUTSIDE or own OUTSIDE to HAND (source independent; no stale count, no opponent effect). Exact source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-004; no comprehensive FAQ certification.'],
 '007':['退場時抽1張','Official Japanese UA51BT/SLG-1-007 エシル purple0 AP1 BP500 gen1; onRetire DRAW1; DRAW Life separately.'],
 '008':['經自己效果從場外加入手牌時','Official UA51BT/SLG-1-008 エシル purple1/AP1/BP2000/gen1 NO Life: self OWN-OUTSIDE-to-hand by OWN effect triggers mandatory draw1 then discard1. OnPlay inspect TOP4, choose 0..1 by exact JP NAME 水篠 旬 OR 悪魔の城 (both name filters, NOT traits), put the rest in chosen order on BOTTOM, discard1 only after actual addition. Source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-008; full FAQ QA not claimed.'],
 '014':['經自己的效果從場外加入手牌時','Official UA51BT/SLG-1-014 水篠 聡子 purple2/AP1/BP1000/gen1: OWN outside recovered to own hand by own effect may REST enter ENERGY for free; cannot enter or move to FRONT even with a swap, FAQ Q2025 2026-04-17; onPlay mandatory TOP1 mill. Not full FAQ certified.'],
 '013':['主要階段每回合一次：REST此角色','Official Japanese UA51BT/SLG-1-013 水篠 葵 purple0 AP1 BP1000 gen1; ENERGY line MAIN REST once per turn, +1 energy this turn, retire source at MAIN end; no Life trigger.'],
 '025':['登場時選一項：抽2張','Official Japanese UA51BT/SLG-1-025 観月 絵里 purple3/AP2/BP2000/gen2, ACTIVE life: onPlay mandatory choose draw2 OR draw1 then optional own-outside TRAITLESS character with printed energy <=3 recover; ACTIVE life readies one own character and gives BP+3000 until turn end. Not full FAQ certified.'],
 '002':['登場時選一項：抽1張後將1張手牌送場外','UA51BT/SLG-1-002 printed: purple0/AP1/BP500/gen1, DRAW life; onPlay choose exactly ONE: draw1 then mandatory discard1; OR own turn select up to one OTHER own field character for current-turn BP+1000. Official Japanese source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-002. Not full FAQ certified.'],
 '001':['自己的回合中，若場外至少5張卡','Official UA51BT/SLG-1-001: own turn and own outside >=5 yields persistent BP+500; no life trigger.'],
 '009':['主要階段每回合一次：將1張手牌送場外','Official Japanese UA51BT/SLG-1-009 向坂 雫: purple0/AP1/BP1500/gen1 and independent ACTIVE Life; MAIN discard exactly one OWN hand physical UID, once per turn, this character BP+1500 for that turn, no AP or REST activation cost. Source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-009; not fully FAQ-certified.'],
 '010':['自己的回合中，若場外有10張以上','Official UA51BT/SLG-1-010: own turn and own outside >=10 yields persistent BP+1000; separate DRAW life trigger.'],
 '005':['無印刷角色能力','無印刷內文，DRAW Life'],
 '006':['ACTIVE','只有 ACTIVE 時紫額外能源一'],
 '012':['己方場上存在水篠旬','Official UA51BT/SLG-1-012: purple 3 AP1 BP2500 gen2; onPlay draw exactly one iff own front or energy line contains a character named 水篠 旬, never hand/opponent field, no life Trigger.'],
 '015':['無印刷角色能力','無內文效果，GET Life'],
 '016':['牌庫頂2張','登場強制送二卡場外，IMPACT 無效'],
 '018':['牌庫頂3張','Official UA51BT/SLG-1-018: purple3/AP1/BP2500/gen2; onPlay inspect TOP3, reveal 0..1 name 水篠 旬 OR trait 影の軍団, bottom order the rest, then discard one only on successful hand addition. The imported source labels the printed 影の軍団 trait in Traditional Chinese as 影之軍團 (explicit source-to-filter translation, no source mutation). Independent COLOR life: own OUTSIDE purple CHARACTER energy<=2 and AP1 to ACTIVE front with no AP cost.'],
 '026':['登場時讓另一己方','強制回手其他己方低費角色，否則自身回手'],
 '032':['IMPACT無效','純 IMPACT 無效，ACTIVE Life'],
 '036':['抽3張後將2張手牌送場外','官方 UA51BT/SLG-1-036：抽三張，然後強制送兩張己方手牌場外；ACTIVE Life 獨立處理'],
 '037':['原本BP4000以下的角色','UA51BT/SLG-1-037 optional own-outside printed character BP<=4000, then unconditional draw one. Official Q2039 (2026-04-17): original BP is bottom-left PRINTED number; no buffs. Life DRAW is separate.'],
 '038':['最多2張己方AP','事件至多回復二 AP，Life FINAL 與事件分流'],
 '040':['BP3000以下','紫事件有水篠旬才把退場 BP3000 改為 BP5000；Life SPECIAL 無條件'],
 '041':['ACTIVE','只有 ACTIVE 時綠額外能源一'],
 '043':['抽1張','登場抽一、強制棄一，ACTIVE Life'],
 '045':['無印刷角色能力','無內文效果，GET Life'],
 '052':['Impact無效','純 IMPACT 無效，ACTIVE Life'],
 '055':['無印刷角色能力','無內文效果，GET Life'],
 '066':['無印刷角色能力','無內文效果，DRAW Life'],
 '068':['另一己方能源需求1以下','強制回手其他低費己方角色，沒有則回自身'],
 '076':['BP3000以下','綠事件有水篠旬才把退場 BP3000 改為 BP5000；Life SPECIAL 無條件'],
 '078':['最多2張己方AP','事件至多回復二 AP，Life FINAL'],
 '079':['最多2張己方AP','事件至多回復二 AP，Life FINAL']
});
export default Object.freeze({
 title:'solo-leveling',
 version:'v2-c-slg-20261026-b3',
 entries:Object.freeze(verifiedSlgV2Cards().map(def=>{
  const record=records[def.id],suffix=def.id.slice(-3),review=proof[suffix];
  if(!record||!review||!record.effect.includes(review[0]))
   throw Error('SLG missing verified body evidence: '+def.id);
  // The printed BP dash is a null source-catalogue field; V2 events/fields
  // have no battle BP and encode that same non-BP property as numeric 0.
  // Never coerce CHARACTER printed BP here.
  const normalized={...(record.bp==null&&record.type!=='character'?{...record,bp:0}:record),
   // Deck-limit print is explicit in source catalogue maxCopies (030 permits 12).
   // Contract checks deckLimit against authored maxCopies; do not silently cap at 4.
   deckLimit:record.maxCopies??4};
  return Object.freeze({
   id:def.id,sourceRecord:normalized,definition:def,
   evidence:{printedTextFragments:[review[0]],
    reviewNote:review[1]+'；日文公式卡文來源 '+record.source+
     '；原始 source BP = '+String(record.bp),
    testFiles:['tests/universal-v2-slg-port.test.mjs',
     ...(def.id==='SLG-1-021'?['tests/v2-r56-slg021-full-print.test.mjs']:[]),
     ...(def.id==='SLG-1-007'||def.id==='SLG-1-013'?['tests/v2-retire-delayed-slg.test.mjs']:[]),
     ...(def.id==='SLG-1-002'?['tests/v2-choice-mode-slg002.test.mjs']:[]),
     ...(def.id==='SLG-1-025'?['tests/v2-slg-025-traitless-recovery.test.mjs']:[]),
     ...(def.id==='SLG-1-014'?['tests/v2-slg-014-recover-entry.test.mjs']:[]),
     ...(def.id==='SLG-1-008'?['tests/v2-slg-008-on-outside-recover.test.mjs']:[]),
     ...(def.id==='SLG-1-009'?['tests/v2-slg-009-discard-main.test.mjs']:[]),
     ...(def.id==='SLG-1-004'?['tests/v2-slg-004-turn-zone-ledger.test.mjs']:[]),
     ...(def.id==='SLG-1-012'?['tests/v2-slg-012-own-name.test.mjs']:[]),
     ...(def.id==='SLG-1-018'?['tests/v2-slg-018-compound-top.test.mjs']:[]),
     ...(def.id==='SLG-1-046'?['tests/v2-r38-slg046-real.test.mjs']:[]),
     ...(def.id==='SLG-1-037'?['tests/v2-slg-037-original-bp.test.mjs']:[]),
     ...(def.id==='SLG-1-042'?['tests/v2-slg-042-shared-energy.test.mjs']:[]),
     ...(def.id==='SLG-1-053'?['tests/v2-slg-053-own-name-impact-null.test.mjs']:[]),
     ...(def.id==='SLG-1-023'||def.id==='SLG-1-056'||def.id==='SLG-1-069'?['tests/v2-zero-engine-round14.test.mjs']:[]),
     ...(def.id==='SLG-1-062'?['tests/v2-zero-engine-round15.test.mjs']:[]),
     ...(def.id==='SLG-1-065'?['tests/v2-zero-engine-round16.test.mjs']:[]),
     ...(def.id==='SLG-1-027'?['tests/v2-rest-printed-bp-round17.test.mjs']:[]),
     ...(def.id==='SLG-1-030'?['tests/v2-r42-slg030-official.test.mjs']:[]),
     ...(def.id==='SLG-1-028'?['tests/v2-r42-slg028-030-official.test.mjs']:[]),
     ...(def.id==='SLG-1-070'?['tests/v2-r33-slg070-official.test.mjs']:[]),
     ...(def.id==='SLG-1-072'?['tests/v2-slg-072-dfn-draw-gpt.test.mjs']:[]),
     ...(['SLG-1-017','SLG-1-074','SLG-1-050','SLG-1-071'].includes(def.id)?['tests/v2-slg-eight-b1.test.mjs']:[]),
     ...(['SLG-1-063','SLG-1-054'].includes(def.id)?['tests/v2-slg-eight-b2.test.mjs']:[]),
     ...(['SLG-1-003','SLG-1-024'].includes(def.id)?['tests/v2-slg-eight-b3.test.mjs']:[])],
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})}
  });
 }))
});
