import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName,cardHasTrait} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalAttackDamage,universalEnergyByColor,universalCardEnergy,
 universalPublicView,universalPrivateChoices,effectiveHandRequiredEnergy,effectiveRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {grantContinuousState,effectChoiceProtected,originalEffectsDisabled,fieldRestrictions} from '../dist/universal-v2/continuous-states.mjs';
import {handPlayApPlan} from '../dist/universal-v2/ap-discounts.mjs';
import {EXPECTED_V2_COUNTS,EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';
import bleachContribution from '../dist/universal-v2/title-packs/bleach.mjs';

// Official iframes fetched 2026-10-24.
// BLC-1-080 UA08BT: このキャラはBPをマイナスする効果を受けない。
//   自分のターン中 このキャラはBP+1000。 ACTIVE is the generic sentence.
//   Generated energy alt is 緑. Printed BP is 4000+.
// BLC-1-091 UA08BT: このカードは〈山本 元柳斎 重國〉としても扱う。
//   自分のフロントLに他のキャラがない場合、このキャラはBP+1000。 GET is generic.
//   No 自分のターン中 icon. Energy-line cards are not front characters.
// BLC-2-041 EX07BT: 自分のターン中 このターン中に自分の場の他のキャラが退場している場合、
//   このキャラはBP+1000。 ACTIVE is generic. Trait is the single token 破面／涅骸部隊.
// BLC-1-062 UA08ST: 自分の場のキャラを1枚選び、このターン中、BP+1000。
//   自分のAPカードを1枚まで選び、アクティブにする。 ACTIVE is generic.
//   The character choice is mandatory. The AP choice is up to one.
// BLC-1-087 UA08BT: [登場時]自分の場の［特徴：護廷十三隊］を1枚まで選び、このターン中、
//   [インパクト（+1）]を与える。 The parenthetical gives Impact 1 when the
//   target has none. The sentence does not say 他の, so this character is legal.
//   ACTIVE is the generic sentence. Generated energy alt is 緑.
// BLC-2-026 EX07BT: [登場時]自分の場の元々の消費APが2以上のキャラを1枚まで選び、
//   このターン中、[インパクト（+1）]を与える。 DRAW is generic. Gen alt is 青.
//   This card's own printed AP is 1, so it is not its own target.
// BLC-2-027 EX07BT: [自分のターン中]自分のフロントLの元々の消費APが2以上のキャラ
//   1枚につき、このキャラはBP+500。 ACTIVE is generic. Energy-line cards do not count.
// BLC-4-046 EX15BT: [登場時]自分の場の紫の〈黒崎 一護〉を1枚まで選び、このターン中、BP+1500。
//   ACTIVE is generic. Required energy is 紫- (0). Traits are empty.
// BLC-3-007 UA04NC: [登場時]自分の山札の上から3枚見る。その中から［特徴：護廷十三隊］を
//   1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、
//   自分の手札を1枚場外に置く。 DRAW is generic. Gen alt is 緑.
// BLC-3-002 UA04NC: the same sentence with 〈黒崎 一護〉か〈阿散井 恋次〉か
//   〈朽木 ルキア〉か〈朽木 白哉〉. DRAW is generic. Gen alt is 青.
// BLC-4-001 EX15BT: このカードは〈バズビー〉としても扱う。 The on-play sentence is the
//   same look-3 with 〈バズビー〉か〈ユーグラム・ハッシュヴァルト〉. DRAW is generic. Gen alt is 黄.
// BLC-4-064 EX15BT: [登場時]自分の山札の上から3枚見て、緑のイベントカードか緑のフィールドカードを
//   1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、
//   自分の手札を1枚場外に置く。 Each か group is color AND type. A green character
//   matches neither group. No trigger. Generated energy alt is 緑.
// BLC-2-005 EX07BT: [登場時]このキャラが自分のキャラの効果で登場していた場合、
//   相手のフロントLのキャラを1枚まで選び、レストにする。 ACTIVE is generic.
//   The attribute cell is one composite, 護廷十三隊／ゾンビ. Generated energy alt is 黄.
//   Paid play, an event, and a field do not open the REST. A character effect does.
// BLC-2-006 EX07BT: [登場時]このキャラが自分のキャラの効果で登場していた場合、カードを1枚引く。
//   [起動メイン][APを1支払う][ターン1]このキャラはこのターン中、[インパクト（1）]を得る。
//   COLOR is the standard rest-and-skip-next-active sentence. The attribute cell
//   is one composite, 星十字騎士団／ゾンビ. Generated energy alt is 黄. The activate
//   has no フロントL restriction and does not REST this character.
// BLC-2-058 EX07BT: [登場時]自分の山札の上から1枚見る。そのカードを自分の山札の上か下に置く。
//   [アタック時]自分の手札の［特徴：零番隊］を1枚リムーブエリアに置いてもよい。
//   そうした場合、このキャラはこのターン中、BP+2000。 ACTIVE is generic.
//   Generated energy alt is 紫紫. A non-零番隊 hand card is not a payment.
// BLC-2-033 EX07BT: [登場時]『カードを1枚引き、自分の手札を1枚場外に置く』。
//   自分のフロントLに元々の消費APが2以上のキャラがある場合、『カードを1枚引く』に代えてもよい。
//   No trigger. Required energy alt is 青3. Generated energy alt is 青青.
//   The replacement is chosen before either sentence. Energy-line cards do not
//   count. This card's own printed AP is 1, so it does not open its own gate.
//   A printed AP of 2 on this same sentence does count, because the text has no 他の.
// BLC-1-022 UA08BT: [登場時]相手は自身の山札の上から1枚を公開する。自分はこの効果で
//   公開されたカードを相手の山札の上か場外に置く。 COLOR is the standard
//   rest-and-skip-next-active sentence. Required energy alt is 黄3.
//   Generated energy alt is 黄黄. An empty opposing deck reveals nothing.
// BLC-2-011 EX07BT: [登場時]自分の山札の上から3枚を公開する。その中から
//   ［特徴：バンビーズ］か〈バンビエッタ・バスターバイン〉を1枚まで手札に加える。
//   残りを自分の場外に置く。手札に加えた場合、自分の手札を1枚場外に置く。
//   No trigger. Required energy alt is 黄1. Generated energy alt is 黄.
//   The attribute cell is 星十字騎士団／バンビーズ. The catalogue stores that
//   as one string, and only this exact string is split into audited components.
//   邦比小隊 is a different token. A miss sends all three outside with no discard.
// BLC-1-060 UA08BT: [登場時]必要エナジーの数を1つ指定する。自分の山札の上から2枚公開する。
//   その中からこの効果で指定した数と同じ必要エナジーのキャラカードを1枚まで手札に加え、
//   残りを場外に置く。 The number is chosen before the reveal. Fields and events
//   with the same energy are not characters. Taking a card does not discard.
//   ACTIVE is the generic sentence. Required energy alt is 紫3. Generated energy alt is 紫.
// BLC-1-038 UA08BT: [登場時]自分の山札の上から3枚を場外に置いてもよい。そうした場合、
//   自分の場外から紫のキャラカードを1枚まで手札に加える。 The mill is one
//   accept-or-skip for the whole three, not one card at a time. Skipping does
//   not open the recovery. A shorter deck still mills what remains. No trigger.
//   Required energy alt is 紫3. Generated energy alt is 紫. Printed AP is 2.
// BLC-2-014 EX07BT: [登場時]必要エナジーが2以下の自分の場のキャラを1枚手札に戻してもよい。
//   そうした場合、自分の場外から必要エナジーが2以下のカードを1枚まで手札に加える。
//   The source is a legal target when its own printed energy is 2 or less.
//   This print is energy 3, so it is not. Fields are not characters.
//   Skipping, or having no legal character, does not open the recovery.
//   Recovery accepts any card type at printed energy 2 or less.
//   COLOR: BP3500以下の相手のフロントのキャラを1枚手札に戻す。
//   Required energy alt is 青3. Generated energy alt is 青青, so gen stays 2.
// BLC-2-001 EX07BT: （自分の移動フェイズにフロントLからエナジーLへ移動できる）
//   [起動メイン][ターン1] 相手のフロントLに元々のBPよりBPが低いキャラか
//   レストのキャラがある場合、このキャラはこのターン中、BP+1000。
//   The printed BP cell is 3000+. That plus is the Step marker; BP stays 3000.
//   No trigger. Required energy alt is 黄3. Generated energy alt is 黄黄.
//   Front only. A rested energy-line character does not qualify.
//   The activation does not rest this card and works from either own line.
// BLC-3-005 UA04NC: [インパクト無効]. The battling character loses Impact for
//   that battle. [起動メイン] only when an opposing front character's live BP
//   is below its printed BP (official Q1583: 元々のBP is the
//   printed lower-left BP). Set this character ACTIVE.
//   「〈阿散井 恋次〉のこの効果は1ターンに1回のみ」(Q1584: two copies, only one
//   of them may activate this effect that turn). ACTIVE is the generic
//   sentence. Required energy is 紫5. Generated energy is 紫. An energy-line
//   reduced character does not open the activate.
// BLC-4-006 EX15BT: [インパクト無効]. [自分のターン中] BP+1000 only when own
//   outside has no 〈ユーハバッハ〉 and own field has 〈ユーグラム・ハッシュヴァルト〉.
//   Official iframe 2026-10-26: required 黄3, generated 黄黄, BP 3000+, no trigger,
//   no card FAQ. Catalogue gen=3 is the sprite index.
// BLC-4-047 EX15BT: [起動メイン][レストにする][このカードを退場させる], then up to
//   one purple 〈黒崎 一護〉 of required energy exactly 0 from own outside,
//   REST, onto own field. Official iframe 2026-10-26: 紫-, generated 紫,
//   AP1, BP500, DRAW, no traits, no card FAQ. AP is not a filter.
// BLC-2-017 EX07BT: [起動メイン][手札を1枚場外に置く][ターン1]. This physical
//   card sends one hand card outside, then cannot be blocked by BP 4000+.
//   Official iframe 2026-10-26. Q1032 (2024-07-19): discarding 斬月 triggers it.
//   Generated energy is 青. No traits.
// BLC-4-003 EX15BT: empty own field reduces this hand card by 黄×2.
//   Step. On retire during its own turn, up to one opposing front character
//   of live BP 1500+ gets BP-1000. Official iframe 2026-10-26. Generated 黄.
//   ACTIVE is generic. No card FAQ.
// BLC-2-028 EX07BT: Impact null. On play may discard one, then may ACTIVE
//   one own AP. [ターン1] sets this physical card ACTIVE only while another
//   own front character has printed AP 2+. Q1036 (2024-07-19). Generated 青.
// BLC-4-043 EX15BT: also 〈涅 ネム〉. On play look at the top 2 and may put
//   one blue 〈涅 マユリ〉, 〈涅 ネム〉, or 涅骸部隊 card outside. Rest return
//   to the top. Official iframe 2026-10-26. Required 青-. Generated 青.
// BLC-4-051 EX15BT: [起動メイン][ターン1] only on the turn this character
//   entered. Choose one: draw 1 then put one hand card outside, or draw 1
//   only when an opposing front character's live BP is below its printed BP.
//   Q2324 (2026-09-04): 元々のBP is the printed lower-left BP. Official iframe
//   2026-10-26. Required 紫3. Generated 紫紫, so V2 gen is 2. DRAW is generic.
// BLC-4-068 EX15BT: Impact null. [起動メイン][フロントL][APを1支払う] only
//   while this character is REST. Set it ACTIVE, then up to one opposing
//   front character becomes REST. Q2336 (2026-09-04): two copies, one use.
//   Official iframe 2026-10-26. Required 緑4. Generated 緑. ACTIVE is generic.
// BLC-4-010 EX15BT: [起動メイン][フロントL][手札を1枚場外に置く][ターン1]
//   only while own field has 〈ユーハバッハ〉. Choose one opposing character
//   on the front or energy line with live BP 1500+, then BP-1000 this turn.
//   Official iframe 2026-10-26. Required 黄4. Generated 黄. DRAW is generic.
//   No card FAQ. [ターン1] is this physical card.
// BLC-2-024 EX07BT: 自分のターン中 BP+500. Printed BP stays 3500.
//   On play, if this player already placed a hand card outside this turn,
//   may REST one traitless blue character of printed energy 1 or less and
//   printed AP 1. Official iframe 2026-10-26. Required 青4. Generated 青.
//   ACTIVE is generic. No card FAQ.
// BLC-4-039 EX15BT: on play from the energy line, become ACTIVE only when
//   an own front character has printed AP 2 or more. [起動メイン][レストにする]
//   chooses another own character on either line for BP+1000. Printed AP 2+
//   may discard one hand card to set that character ACTIVE. Q2320 (2026-09-04).
//   Official iframe 2026-10-26. Required 青2. Generated 青. DRAW is generic.
// BLC-3-003 UA04NC: on play choose one. Up to one other own character gets
//   BP+1000, or BP+3000 and retires when its attack ends. Official iframe
//   2026-10-26. Required 青1. Generated 青. ACTIVE is generic. No card FAQ.
// BLC-4-072 EX15BT: on play, may put one hand card outside. If that payment
//   happens, may REST up to one own outside character of printed AP 1 with
//   trait 假面軍勢 whose required energy is currently met. Q2341 (2026-09-04):
//   the card just sent outside may be that character. Official iframe
//   2026-10-26. Required 緑4. Generated 緑. No trigger.
// BLC-1-026 UA08BT: 自分の【レイド】を持つキャラカードはこのキャラにレイドできる。
//   Q553 (2023-09-25) waives the named base and the conditions to the right
//   of 【レイド】. Silence and a buried host do not. Generated energy is 黄.
// BLC-1-025 UA08BT: ブロック時 this character gets BP-1000 this turn. Q552
//   (2023-09-25): a 【レイド】 attacker with a face-up card underneath
//   replaces that with BP+1000. Applied before the battle comparison.
//   Generated energy is 黄. No trigger.
// BLC-1-033 UA08BT: retire one opposing front character of BP 3000 or less.
//   Q555 (2023-09-25): an opposing raid-state character, or own ユーハバッハ,
//   raises the cap to 5000. Mandatory. SPECIAL is retire one front character.
// BLC-1-031 UA08BT: up to one opposing front character becomes REST.
//   Q554 (2023-09-25): own エス・ノト instead rests it, skips its next
//   ACTIVE, and draws 1. Declining draws nothing. No BP cap.
// BLC-1-096 UA08BT: one opposing front character of BP 5000 or less is
//   rested and skips its next ACTIVE. Q573 (2023-09-25). Own
//   日番谷 冬獅郎 retires that same character instead. Mandatory.
// BLC-1-065 UA08BT: while own field has 朽木 白哉, this hand card costs
//   1 less AP. Then up to one opposing front character gets BP-3000,
//   and up to one gets BP-1000. Q567 (2023-09-25): same or different
//   characters are both legal. SPECIAL retires one front character.
// BLC-4-021 EX15BT: playable only while own field has バズビー.
//   Retire one opposing front character of BP 5000 or less. Mandatory.
//   A バズビー of printed energy 5+ may then give up to one own
//   バズビー BP+1000. Printed energy, not generated energy. No card FAQ.
// BLC-4-081 EX15BT: playable only while own field has 京楽 春水.
//   Retire one opposing front character of BP 5000 or less. Mandatory.
//   Then up to one own energy-line 花天 or 狂骨 becomes ACTIVE.
//   Front copies are not choices. No card FAQ.
// BLC-2-012 EX07BT: retire one opposing front character whose BP is at
//   most 1000 times the own-field count of 邦比愛塔親衛隊 or
//   バンビエッタ・バスターバイン. A card with both counts once. Mandatory.
// BLC-1-081 UA08BT: cannot enter or move to the energy line. Q568
//   (2023-09-25). Impact 1. On play, up to one opposing front character
//   of BP 2000 or less retires; six other 護廷十三隊 cards raise it to 4000.
// BLC-2-037 EX07BT: may retire one own 涅骸部隊 character. Success may
//   retire one opposing front at or below that live BP, then draws 1.
// BLC-2-045 EX07BT: must retire one own 涅骸部隊 character. Success draws 1,
//   then up to two affordable blue AP-1 涅 ネム or 涅骸部隊 characters
//   enter ACTIVE from outside. SPECIAL retires one opposing front.
// BLC-1-061 UA08BT: this field enters ACTIVE. REST it, look at the top
//   card. Squad Zero may be revealed to hand. Q566 (2023-09-25) allows
//   refusing that add. Otherwise the card returns to the top or outside.
// BLC-4-077 EX15BT: optional outside 神剣・八鏡剣 to hand. Main REST-retires
//   this field, then may ACTIVE one remaining field card and give one
//   character BP+1000. Catalogue gen 3 normalizes to generated 緑緑.
// BLC-4-079 EX15BT: choose draw 1, or up to one 伊勢 七緒 gets BP+3000
//   and Impact 1. Then may REST one ACTIVE 京楽 春水 or 伊勢 七緒 to
//   ready one AP card. That AP recovery cannot be declined.
// BLC-2-064 EX07BT: REST and retire, then up to one 更木 剣八 gains
//   Impact +1 or direct-attack Damage +1 this turn.
// BLC-4-018 EX15BT: own-turn retirement chooses ACTIVE, or protection
//   plus a live-BP-1000 front cut. Opponent-turn retirement is silent.
// BLC-4-008 EX15BT: on play, with no outside ユーハバッハ, may retire
//   another バズビー. The cap is that card's printed energy times 1000.
//   Declining the opposing retire still readies this character.
// BLC-4-065 EX15BT: Step. Own turn BP+1500 while 京楽 春水 is on the energy
//   line. Main sets this character ACTIVE only after 神剣・八鏡剣 was used
//   this turn. Q2335: every 伊勢 七緒 shares that one activate.
// BLC-2-051 EX07BT: Impact null. Damage 2 from 10 removed cards or 2
//   distinct 零番隊 names. Four such names also grant Impact 1.
// BLC-1-092 UA08BT: front line also generates energy. Q572: a battle
//   loser is removed instead of retiring, and 退場時 does not fire.
// BLC-4-044 EX15BT: one own 四楓院 夜一 gets BP+2000. Her first attack
//   this turn gains Impact 1 and sniper until that attack ends.
// BLC-4-016 EX15BT: 黄黄+. The plus is extra yellow after an entry-turn
//   sacrifice, lasting until the next own turn start.
// BLC-4-017 EX15BT: on play, draw 1 then put one hand card outside.
//   [起動メイン] rests this character and retires it, then one other own
//   殭屍 gains 2回アタック. Q79 (2023-03-17). Q2308 (2026-09-04): the
//   activate is shared by the name. Catalogue gen 3 normalizes to 黄黄.
// BLC-1-028 UA08BT: look at the top 3 and may reveal one 星十字騎士團
//   card to hand. The rest go to the bottom. No hand discard. Main REST
//   stays on the field, retires one other character, then replays 登場時.
// BLC-2-002 EX07BT: discard one, then swap one front character with one
//   energy character, or BP+1000. ユーハバッハ may allow both. [ターン1]
//   is this physical card. Generated energy stays 黄黄.
// BLC-4-032 EX15BT: own turn BP+1000 while 黒崎 一護 or 浦原 喜助 is on
//   the field. From the energy line, once per physical card, an own
//   attack end may swap with one front character that has not attacked.
//   Q2314 (2026-09-04): after the battle and after a life trigger check.
//   Catalogue gen 3 normalizes to 青青.
// BLC-1-011 UA08BT: [起動メイン][手札を1枚場外に置く]. No turn-once.
//   Success grants Damage 2 and a battle-win draw this turn.
//   Q537 (2023-09-25): battle win is attacker BP >= the character it battles.
//   A direct attack does not draw. Generated energy is 黄.
// BLC-1-104 UA08ST: Raid onto 黒崎 一護, enter ACTIVE, and may move to the front.
//   [起動メイン][ターン1] removes 4 own outside cards. That exact count draws 1
//   and grants Impact 1 this turn. Q574 (2023-09-25): 3 cards still leave, and
//   the draw and Impact do not. The removal is not optional. Generated energy is 紫.
// BLC-1-014 UA08BT: 黄4 / 黄. Raid onto バンビエッタ・バスターバイン.
//   On play, during your turn, retire up to one opposing front REST character.
//   A life Raid is the opponent's turn, so that clause does not start.
// BLC-1-020 UA08BT: 黄5 / 黄. Raid onto ユーグラム・ハッシュヴァルト. Impact 1.
//   Front attack-end draws 2 and discards 1 only after the opponent activated
//   a trigger. Q538 (2023-09-25): declining does not count. Q539: both front
//   copies resolve. Q540: a copy that left the front does not. On play, a
//   smaller hand makes the opponent discard one. Q541: equal hands do not.
// BLC-1-050 UA08BT: 紫5 / 紫. Raid onto 朽木 白哉. On play may remove 2 outside;
//   success cuts every opposing front by 1000. Q561 (2023-09-25): 1 still
//   leaves and the cut does not. Main [ターン1] removes 3 for Impact 1.
//   Q562 (2023-09-25): 2 still leave and Impact does not. On attack, removing
//   1 may cut one opposing front by 1000.
// BLC-1-055 UA08BT: 紫4 / 紫. [起動メイン][フロントL][APを1支払う][ターン1].
//   Up to one opposing front character of BP 3500 or less. At the next
//   opponent turn start, retire that visible card, then REST this character
//   and move it to the energy line. Q564 (2023-09-25): a chosen character
//   that already left still leaves this character to rest and move.
//   Q565 (2023-09-25): a Raid top that covered the chosen character stays.
// BLC-1-063 UA08BT: 紫2. Generated energy is a dash. Look at the top 5.
//   Add 1 to hand, put 1 outside, and order the rest on the bottom.
//   見る stays private. Both picks are mandatory while a card remains.
//   DRAW is the generic sentence. No card FAQ.
// BLC-1-093 UA08BT: 緑7 / 緑. Raid onto 山本 元柳斎 重國. Impact 1.
//   On play, any number of own energy-line 護廷十三隊 characters may move
//   to an empty front slot. On attack, every other own field 護廷十三隊
//   gets BP+2000 this turn. No card FAQ.
// BLC-2-009 EX07BT: 黄4 / 黄. Other field cards with バンビーズ, ゾンビ, or
//   the name バンビエッタ・バスターバイン must total 3 before the draw 2
//   and discard 2. Each card counts once. This character does not.
//   Front [ターン1] retires one own character without ゾンビ, then may
//   ACTIVE-play one outside yellow ゾンビ. GET is generic. No card FAQ.
// BLC-2-013 EX07BT: 青2 / 青. When a blue 黒崎 一護 on the field puts this
//   card from hand to outside, up to one own field 黒崎 一護 cannot be
//   chosen by opposing character or trigger effects until the next own
//   start. Q1030 and Q1031 are both 2024-07-19. DRAW is generic.
// BLC-2-035 EX07BT: 青3 / 青青. Main once retires one own 涅骸部隊 character,
//   then looks at the top 4. Up to one 涅 マユリ, 涅 ネム, or 涅骸部隊
//   is revealed to hand. The rest go to the bottom. No trigger. No card FAQ.
// BLC-2-038 EX07BT: 青4 / 青. Raid onto 涅 マユリ. On play, up to one own
//   field 涅 ネム or 涅骸部隊 gets BP+1000 and Impact 1 this turn.
//   Front [ターン1] REST-plays one outside blue AP-1 涅 ネム or 涅骸部隊
//   only after an own character retired this turn. RAID is generic. No card FAQ.
// BLC-2-057 EX07BT: 紫4 / 紫. Raid onto 修多羅 千手丸. On play, remove any
//   number of hand 零番隊, then retire one opposing front. The BP cap
//   starts at 2500 and rises by 1000 per card removed. RAID is generic.
// BLC-2-060 EX07BT: 紫4 / 紫. On play, look at the top 4 and return them
//   to the top in any order. On attack, name a required-energy number,
//   reveal the top card, and a match may be added to hand. Adding it
//   removes one hand card. COLOR is the generic outside ACTIVE sentence.
// BLC-2-061 EX07BT: 紫4 / dash. Up to 3 hand 零番隊 are removed, then one
//   opposing front retires. The cap starts at 3000 and rises by 1000.
//   Draw 1 per removed card. SPECIAL is the generic retirement.
// BLC-4-057 EX15BT: 紫4 / dash. Up to one opposing front character loses
//   printed effects and cannot attack or block until the controller's next
//   own start. A this-turn BP modifier already gained stays. If 兵主部 一兵衛
//   is on the own field or in the removed area, draw 2 and remove 1 hand card.
//   SPECIAL is the generic retirement.
// BLC-4-007 EX15BT: 黄4 / 黄. [起動メイン] only while own outside has no
//   ユーハバッハ and this character's live required energy is 5 or more.
//   Then this character becomes ACTIVE. Q2305: every バズビー shares that
//   one activate. No trigger.
// BLC-4-012 EX15BT: 黄4 / 黄. Raid onto ユーグラム・ハッシュヴァルト.
//   Raid-state front: another own character retiring may draw 1, name once.
//   Raid-state own-turn front: other characters' required energy +2.
//   On play, while no own field card has a trait other than 星十字騎士団,
//   REST-play up to one yellow AP1 character of printed energy 2 or less.

const bleach=registeredV2TitlePack('bleach');
const ADDED=['BLC-1-080','BLC-1-091','BLC-2-041','BLC-1-062','BLC-1-032','BLC-1-078','BLC-1-087','BLC-2-026','BLC-2-027','BLC-4-046','BLC-4-028','BLC-4-052','BLC-3-007','BLC-3-002','BLC-4-001','BLC-2-072','BLC-2-032','BLC-3-004','BLC-1-079','BLC-2-050','BLC-1-108','BLC-3-010','BLC-2-018','BLC-1-056','BLC-4-024','BLC-1-004','BLC-1-046','BLC-4-063','BLC-4-064','BLC-2-005','BLC-2-006','BLC-2-058','BLC-2-033','BLC-1-022','BLC-2-011','BLC-1-060','BLC-1-038','BLC-2-014','BLC-2-001','BLC-4-037','BLC-4-071','BLC-3-005','BLC-4-006','BLC-4-047','BLC-2-017','BLC-4-003','BLC-2-028','BLC-4-043','BLC-4-051','BLC-4-068','BLC-4-010','BLC-2-024','BLC-4-039','BLC-3-003','BLC-4-072','BLC-1-026','BLC-1-025','BLC-1-033','BLC-1-031','BLC-1-096','BLC-1-065','BLC-4-021','BLC-4-081','BLC-2-012','BLC-1-081','BLC-2-037','BLC-2-045','BLC-1-061','BLC-4-077','BLC-4-079','BLC-2-064','BLC-4-018','BLC-4-008','BLC-4-065','BLC-2-051','BLC-1-092','BLC-4-044','BLC-4-016','BLC-4-017','BLC-1-028','BLC-2-002','BLC-4-032','BLC-1-011','BLC-1-104','BLC-1-014','BLC-1-020','BLC-1-050','BLC-1-055','BLC-1-063','BLC-1-093','BLC-2-009','BLC-2-013','BLC-2-030','BLC-2-034','BLC-2-035','BLC-2-038','BLC-2-057','BLC-2-060','BLC-2-061','BLC-4-057','BLC-4-011','BLC-4-007','BLC-4-012','BLC-4-004','BLC-4-005','BLC-4-015','BLC-4-055','BLC-4-056','BLC-4-041','BLC-4-053','BLC-4-033','BLC-4-075','BLC-2-065'];
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const green=realDeck(['BLC-1-080','BLC-1-091','BLC-1-078','BLC-1-070','BLC-4-062','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-4-061','BLC-2-072','BLC-1-083','BLC-1-079'],'green');
const blue=realDeck(['BLC-2-041','BLC-2-031','BLC-4-036','BLC-2-026','BLC-2-027','BLC-4-022','BLC-4-028','BLC-3-002','BLC-2-016','BLC-2-029','BLC-2-032','BLC-2-015','BLC-2-019'],'blue');
const purple=realDeck(['BLC-1-062','BLC-1-035','BLC-1-103','BLC-4-046','BLC-1-039','BLC-4-052','BLC-2-050','BLC-3-004','BLC-1-108','BLC-1-041'],'purple');
const yellow=realDeck(['BLC-1-032','BLC-1-023','BLC-1-006','BLC-4-001','BLC-2-003','BLC-1-018'],'yellow');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,ready=true){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function main(deck,seed){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 return {packs,s};
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function orderBottom(packs,s){
 while(s.pending?.kind==='effect-top-order'){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='chooseTopOrder');
  assert.ok(action);
  s=dispatchUniversalAction(packs,s,action);
 }
 return s;
}
function live(s,p,uid){
 for(const line of ['front','energy']){
  const c=s.players[p][line].find(x=>x?.uid===uid);
  if(c)return c;
 }
 return s.players[p].outside.find(x=>x.uid===uid)||null;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function plainId(deck,bp,not){
 const id=Object.keys(deck).find(id=>{
  if(not.includes(id))return false;
  const c=bleach.cards[id];
  return c.type==='character'&&c.bp===bp&&c.maxCopies===4&&
   !c.printedImpact&&!c.impactNull&&!c.mainAbility&&!c.passiveBonuses?.length&&
   !Object.keys(c.effects||{}).length;
 });
 assert.ok(id,'plain '+bp);
 return id;
}

test('C29 registers one-hundred-thirteen whole BLEACH prints and keeps the independent census',()=>{
 assert.equal(EXPECTED_V2_TOTAL,549);
 assert.equal(EXPECTED_V2_COUNTS.bleach,273);
 assert.equal(EXPECTED_V2_COUNTS['sword-art-online'],125);
 for(const id of ADDED)assert.equal(EXPECTED_V2_IDS.bleach.includes(id),true);
 assert.equal(Object.keys(bleach.cards).length,273);
});

test('BLC-1-080 ignores BP reductions and gains 1000 only on its own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-080');
 assert.equal(printed.effect,'此角色不受降低 BP 的效果影響。己方回合中，此角色 BP +1000。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-080'];
 assert.equal(card.bpDownImmune,true);
 assert.equal(card.ownTurnBp,1000);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 const {packs,s}=main(green,29080);
 const self=put(s,0,'BLC-1-080','front',0);
 assert.equal(universalBp(packs,s,self),5000);
 self.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),5000);
 self.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),5500);
 let opp=s;
 for(let n=0;n<12&&opp.active===0;n++)
  opp=dispatchUniversalAction(packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 const there=live(opp,0,self.uid);
 assert.equal(universalBp(packs,opp,there),4000);
 there.buffs.push({bp:-2000,untilTurn:opp.turn});
 assert.equal(universalBp(packs,opp,there),4000);
 there.buffs.push({bp:500,untilTurn:opp.turn});
 assert.equal(universalBp(packs,opp,there),4500);
 aiOk(packs,opp);
 assert.equal(assertUniversalMatch(packs,opp),true);
});

test('BLC-1-091 is the printed Yamamoto alias and gains 1000 with no other front character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-091');
 assert.equal(printed.effect,'此卡亦視為〈山本元柳齋重國〉。己方前線沒有其他角色時，此角色 BP +1000。');
 const card=bleach.cards['BLC-1-091'];
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.equal(cardHasName(card,'山本 重國'),true);
 assert.equal(cardHasName(card,'山本 元柳斎 重國'),true);
 assert.equal(cardHasName(card,'山本 元柳斎 重國',true),false);
 assert.deepEqual(card.passiveBonuses,[{
  condition:{kind:'ownFrontNoOtherCharacter',turn:'any'},bp:1000}]);
 const {packs,s}=main(green,29091);
 const self=put(s,0,'BLC-1-091','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 const energyMate=put(s,0,'BLC-1-080','energy',0);
 assert.equal(universalBp(packs,s,self),3000);
 const mateId=Object.keys(green).find(id=>id!=='BLC-1-080'&&id!=='BLC-1-091'&&
  bleach.cards[id].type==='character');
 const frontMate=put(s,0,mateId,'front',1);
 assert.equal(universalBp(packs,s,self),2000);
 s.players[0].front[1]=null;
 s.players[0].hand.push(frontMate);
 assert.equal(universalBp(packs,s,self),3000);
 s.players[0].front[0]=null;
 s.players[0].energy[1]=self;
 assert.equal(universalBp(packs,s,self),3000);
 const held=s.players[0].hand.findIndex(c=>c.uid===frontMate.uid);
 s.players[0].front[0]=s.players[0].hand.splice(held,1)[0];
 assert.equal(universalBp(packs,s,self),2000);
 assert.equal(universalBp(packs,s,energyMate),5000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-2-041 gains 1000 only after another own character retires this own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-041');
 assert.equal(printed.effect,'己方回合中，若本回合已有其他己方場上角色退場，此角色 BP +1000。');
 assert.equal(printed.traits,'破面／涅骸部隊');
 const card=bleach.cards['BLC-2-041'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['破面／涅骸部隊']);
 assert.deepEqual(card.traitComponents,['破面','涅骸部隊']);
 assert.equal(cardHasTrait(card,'涅骸部隊'),true);
 assert.equal(cardHasTrait(card,'破面'),true);
 assert.deepEqual(card.passiveBonuses[0].condition,{kind:'retireCountThisTurn',turn:'own',
  controller:'own',cardType:'character',min:1,excludeSelf:true});
 const low=plainId(blue,1500,['BLC-2-041']);
 const wall=plainId(blue,4000,['BLC-2-041']);
 const {packs,s}=main(blue,29041);
 const self=put(s,0,'BLC-2-041','energy',0);
 assert.equal(universalBp(packs,s,self),2000);
 const mine=put(s,0,low,'front',0);
 const theirWall=put(s,1,wall,'front',0);
 let battle=s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:mine.uid});
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:theirWall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===mine.uid),false);
 assert.equal(battle.active,0);
 const stayed=live(battle,0,self.uid);
 assert.equal(universalBp(packs,battle,stayed),3000);
 let later=battle;
 for(let n=0;n<12&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,self.uid)),2000);
 const foe=main(blue,29042);
 const watcher=put(foe.s,0,'BLC-2-041','energy',0);
 const big=put(foe.s,0,wall,'front',0);
 const small=put(foe.s,1,low,'front',0);
 let oppLoss=foe.s;
 for(let n=0;n<6&&oppLoss.phase!=='attack';n++)
  oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'next'});
 oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'attack',uid:big.uid});
 oppLoss=dispatchUniversalAction(packs,oppLoss,{type:'chooseBlock',uid:small.uid},{actor:1});
 assert.equal(oppLoss.players[1].front.some(c=>c?.uid===small.uid),false);
 assert.equal(universalBp(packs,oppLoss,live(oppLoss,0,watcher.uid)),2000);
 const again=main(blue,29043);
 const ken=put(again.s,0,'BLC-2-041','front',0);
 const blocker=put(again.s,1,wall,'front',0);
 let lost=again.s;
 for(let n=0;n<6&&lost.phase!=='attack';n++)
  lost=dispatchUniversalAction(packs,lost,{type:'next'});
 lost=dispatchUniversalAction(packs,lost,{type:'attack',uid:ken.uid});
 lost=dispatchUniversalAction(packs,lost,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(lost.players[0].front.some(c=>c?.uid===ken.uid),false);
 const returned=lost.players[0].outside.find(c=>c.uid===ken.uid);
 assert.ok(returned);
 const index=lost.players[0].outside.findIndex(c=>c.uid===ken.uid);
 lost.players[0].outside.splice(index,1);
 returned.ready=true;returned.fieldEntryStamp=lost.nextFieldEntryStamp++;
 lost.players[0].energy[1]=returned;
 assert.equal(universalBp(packs,lost,returned),2000);
 assert.equal(assertUniversalMatch(packs,lost),true);
});

test('BLC-1-062 must buff one own character, then may ready one rested AP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-062');
 assert.equal(printed.effect,'一個己方角色本回合 BP +1000，可回復 1 AP。');
 assert.equal(printed.type,'event');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-1-062'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[
  {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false},
  {op:'recoverAp',count:1}]);
 const {packs,s}=main(purple,29062);
 const bread=take(s,0,'BLC-1-062');
 s.players[0].hand.push(bread);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===bread.uid),false);
 const fuel=put(s,0,'BLC-1-035','energy',0);
 const front=put(s,0,'BLC-1-103','front',0);
 const foe=put(s,1,'BLC-1-103','front',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===bread.uid),true);
 let played=dispatchUniversalAction(packs,s,{type:'event',uid:bread.uid});
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.optional,false);
 const choices=legalUniversalActions(packs,played);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),false);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===fuel.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===front.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===foe.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:null}),
  /not currently legal/);
 played=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:front.uid});
 assert.equal(universalBp(packs,played,live(played,0,front.uid)),4000);
 assert.equal(universalBp(packs,played,live(played,0,fuel.uid)),1500);
 assert.equal(played.pending.kind,'effect-recover-ap');
 const rested=played.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
 assert.equal(rested.length,1);
 const recoveries=legalUniversalActions(packs,played);
 assert.equal(recoveries.some(a=>a.type==='chooseApRecovery'&&a.uid===null),true);
 assert.equal(recoveries.some(a=>a.type==='chooseApRecovery'&&a.uid===rested[0].uid),true);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseApRecovery',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].apCards.some(c=>c.uid===rested[0].uid&&!c.ready),true);
 const readied=dispatchUniversalAction(packs,played,{type:'chooseApRecovery',uid:rested[0].uid});
 assert.equal(readied.pending,null);
 assert.equal(readied.players[0].apCards.find(c=>c.uid===rested[0].uid).ready,true);
 aiOk(packs,readied);
 assert.equal(assertUniversalMatch(packs,readied),true);
});

test('BLC-1-032 chooses one optional buff or one optional front BP reduction',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-032');
 assert.equal(printed.effect,'選一項：①可使最多 1 個己方場上角色本回合 BP +1000；②可使最多 1 個敵方前線角色本回合 BP −1000。');
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-1-032'];
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 assert.equal(card.effects.onPlay[0].optional,false);
 const {packs,s}=main(yellow,29032);
 const event=take(s,0,'BLC-1-032');
 s.players[0].hand.push(event);
 const fuel=put(s,0,'BLC-1-023','energy',0);
 const front=put(s,0,'BLC-1-006','front',0);
 const foeFront=put(s,1,'BLC-1-023','front',0);
 const foeEnergy=put(s,1,'BLC-1-006','energy',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 let played=dispatchUniversalAction(packs,s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(packs,played);
 assert.deepEqual(modes.map(a=>a.mode).sort(),['buff','down']);
 let buffed=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'buff'});
 assert.equal(buffed.pending.kind,'effect-buff-own');
 assert.equal(buffed.pending.optional,true);
 const buffChoices=legalUniversalActions(packs,buffed);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===fuel.uid),true);
 assert.equal(buffChoices.some(a=>a.type==='chooseOwnBuff'&&a.uid===front.uid),true);
 assert.equal(buffChoices.some(a=>a.uid===foeFront.uid),false);
 const skipped=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),4000);
 buffed=dispatchUniversalAction(packs,buffed,{type:'chooseOwnBuff',uid:fuel.uid});
 assert.equal(universalBp(packs,buffed,live(buffed,0,fuel.uid)),5000);
 let down=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'down'});
 assert.equal(down.pending.kind,'effect-target');
 assert.equal(down.pending.optional,true);
 const downChoices=legalUniversalActions(packs,down);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===foeFront.uid),true);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===foeEnergy.uid),false);
 assert.equal(downChoices.some(a=>a.type==='chooseTarget'&&a.uid===null),true);
 down=dispatchUniversalAction(packs,down,{type:'chooseTarget',uid:foeFront.uid});
 assert.equal(universalBp(packs,down,live(down,1,foeFront.uid)),3000);
 assert.equal(universalBp(packs,down,live(down,1,foeEnergy.uid)),4000);
 assert.equal(assertUniversalMatch(packs,down),true);
});

test('BLC-1-078 steps to energy and may buff one Gotei character on attack',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-078');
 assert.equal(printed.effect,'Step：己方移動階段可由前線移至能源線。攻擊時：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合 BP +500。');
 assert.equal(printed.gen,2);
 const card=bleach.cards['BLC-1-078'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onAttack,[{op:'buffOwnField',filter:{field:'trait',value:'護廷十三隊'},
  bp:500,optional:true,excludeSelf:false}]);
 const packs=[bleach,bleach];
 let moving=newUniversalMatch(packs,{decks:[green,green],seed:29078,first:0});
 for(let n=0;n<6&&moving.phase!=='move';n++)
  moving=dispatchUniversalAction(packs,moving,{type:'next'});
 assert.equal(moving.phase,'move');
 const stepper=put(moving,0,'BLC-1-078','front',0);
 assert.equal(legalUniversalActions(packs,moving).some(a=>a.type==='step'&&a.uid===stepper.uid),true);
 moving=dispatchUniversalAction(packs,moving,{type:'step',uid:stepper.uid,slot:0});
 assert.equal(moving.players[0].energy[0]?.uid,stepper.uid);
 assert.equal(moving.players[0].front[0],null);
 const {s}=main(green,29079);
 const self=put(s,0,'BLC-1-078','front',0);
 const ally=put(s,0,'BLC-1-070','energy',0);
 const other=put(s,0,'BLC-4-062','front',1);
 put(s,1,'BLC-1-070','front',0);
 let battle=s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(packs,battle,{type:'next'});
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:self.uid});
 assert.equal(battle.pending.kind,'effect-buff-own');
 assert.equal(battle.pending.optional,true);
 const choices=legalUniversalActions(packs,battle);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===self.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===ally.uid),true);
 assert.equal(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid),false);
 const skipped=dispatchUniversalAction(packs,battle,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,self.uid)),3000);
 battle=dispatchUniversalAction(packs,battle,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(packs,battle,live(battle,0,ally.uid)),bleach.cards['BLC-1-070'].bp+500);
 assert.equal(universalBp(packs,battle,live(battle,0,other.uid)),bleach.cards['BLC-4-062'].bp);
 assert.equal(assertUniversalMatch(packs,moving),true);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('BLC-1-087 adds one Impact to at most one own Gotei character, including itself',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-087');
 assert.equal(printed.effect,'登場：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-087'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.printedImpact||0,0);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'grantOtherImpactThisTurn',trait:'護廷十三隊',
  amount:1,optional:true,plus:true,includeSelf:true}]);
 const {packs,s}=main(green,29087);
 put(s,0,'BLC-1-080','energy',0);
 put(s,0,'BLC-1-091','energy',1);
 const other=put(s,0,'BLC-4-062','energy',2);
 const ken=put(s,0,'BLC-2-067','front',0);
 const plain=put(s,0,'BLC-1-070','front',1);
 const foe=put(s,1,'BLC-1-080','front',0);
 const self=take(s,0,'BLC-1-087');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 let played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-grant-impact');
 assert.equal(played.pending.plus,true);
 assert.equal(played.pending.includeSelf,true);
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseGrantImpact'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(self.uid),true);
 assert.equal(chosen(ken.uid),true);
 assert.equal(chosen(plain.uid),true);
 assert.equal(chosen(other.uid),false);
 assert.equal(chosen(foe.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,self.uid)),0);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,ken.uid)),1);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,plain.uid)),0);
 let added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:ken.uid});
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),2);
 assert.equal(universalImpact(packs,added,live(added,0,self.uid)),0);
 assert.equal(universalImpact(packs,added,live(added,0,plain.uid)),0);
 added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:plain.uid});
 assert.equal(universalImpact(packs,added,live(added,0,plain.uid)),1);
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),1);
 added=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:self.uid});
 assert.equal(universalImpact(packs,added,live(added,0,self.uid)),1);
 assert.equal(universalImpact(packs,added,live(added,0,ken.uid)),1);
 let later=added;
 for(let n=0;n<16&&later.turn===added.turn;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.notEqual(later.turn,added.turn);
 assert.equal(universalImpact(packs,later,live(later,0,self.uid)),0);
 assert.equal(universalImpact(packs,later,live(later,0,ken.uid)),1);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,added),true);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-2-026 adds Impact 1 only to an own character with printed AP 2 or more',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-026');
 assert.equal(printed.effect,'登場：可使最多 1 個己方場上原始 AP 消耗 2 以上的角色，本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-026'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.ap,1);
 assert.deepEqual(card.effects.onPlay,[{op:'grantOtherImpactThisTurn',minPrintedAp:2,
  amount:1,optional:true,plus:true,includeSelf:true}]);
 const {packs,s}=main(blue,29026);
 put(s,0,'BLC-2-027','energy',0);
 const heavy=put(s,0,'BLC-4-022','energy',1);
 const light=put(s,0,'BLC-2-031','front',0);
 const foe=put(s,1,'BLC-4-022','front',0);
 const self=take(s,0,'BLC-2-026');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===1);
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-grant-impact');
 assert.equal(played.pending.minPrintedAp,2);
 assert.equal(played.pending.plus,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseGrantImpact'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(heavy.uid),true);
 assert.equal(chosen(self.uid),false);
 assert.equal(chosen(light.uid),false);
 assert.equal(chosen(foe.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:null});
 assert.equal(universalImpact(packs,skipped,live(skipped,0,heavy.uid)),0);
 const granted=dispatchUniversalAction(packs,played,{type:'chooseGrantImpact',uid:heavy.uid});
 assert.equal(universalImpact(packs,granted,live(granted,0,heavy.uid)),1);
 assert.equal(universalImpact(packs,granted,live(granted,0,self.uid)),0);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,granted),true);
});

test('BLC-2-027 gains 500 on its own turn for each own front character with printed AP 2 or more',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-027');
 assert.equal(printed.effect,'己方回合中，己方前線每有 1 個原始 AP 消耗 2 以上的角色，此角色 BP +500。');
 const card=bleach.cards['BLC-2-027'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownPrintedApAtLeast',turn:'own',
  zone:'front',excludeSelf:false,minAp:2},bpEach:500}]);
 const {packs,s}=main(blue,29027);
 const self=put(s,0,'BLC-2-027','front',0);
 const heavy=put(s,0,'BLC-4-022','front',1);
 put(s,0,'BLC-2-031','front',2);
 assert.equal(universalBp(packs,s,self),3000);
 const moved=live(s,0,heavy.uid);
 s.players[0].front[1]=null;
 s.players[0].energy[0]=moved;
 assert.equal(universalBp(packs,s,self),2500);
 s.players[0].energy[0]=null;
 s.players[0].front[1]=moved;
 const foe=put(s,1,'BLC-4-022','front',0);
 assert.equal(universalBp(packs,s,self),3000);
 assert.equal(foe.cardId,'BLC-4-022');
 let later=s;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,self.uid)),2500);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-4-046 may buff one own purple Ichigo',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-046');
 assert.equal(printed.effect,'登場時：最多選自己場上1個紫色《黑崎一護》，本回合BP+1500。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-046'];
 assert.equal(card.energy,0);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'buffOwnField',filter:{field:'color',value:'purple'},
  also:{field:'name',value:'黒崎 一護'},bp:1500,optional:true,excludeSelf:false}]);
 const {packs,s}=main(purple,29046);
 const self=take(s,0,'BLC-4-046');
 s.players[0].hand.push(self);
 const front=put(s,0,'BLC-1-103','front',0);
 const energy=put(s,0,'BLC-1-039','energy',0);
 const other=put(s,0,'BLC-1-035','front',1);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-buff-own');
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(front.uid),true);
 assert.equal(chosen(energy.uid),true);
 assert.equal(chosen(other.uid),false);
 assert.equal(chosen(self.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(packs,skipped,live(skipped,0,front.uid)),3000);
 const buffed=dispatchUniversalAction(packs,played,{type:'chooseOwnBuff',uid:energy.uid});
 assert.equal(universalBp(packs,buffed,live(buffed,0,energy.uid)),3000);
 assert.equal(universalBp(packs,buffed,live(buffed,0,front.uid)),3000);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,buffed),true);
});

test('BLC-4-028 rests once and keeps BP+1000 until its next own turn starts',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-028');
 assert.equal(printed.effect,'啟動・主要〔改為Rest／每回合1次〕：此角色到自己下次回合開始前BP+1000。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-028'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.mainAbility,{op:'restOnceBuffSelfUntilNextOwnStart',oncePerTurn:true,bp:1000});
 const {packs,s}=main(blue,29028);
 const energy=put(s,0,'BLC-4-028','energy',0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===energy.uid&&a.mode==='restOnceSelfBuff'),true);
 let used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===energy.uid));
 assert.equal(live(used,0,energy.uid).ready,false);
 assert.equal(universalBp(packs,used,live(used,0,energy.uid)),5000);
 live(used,0,energy.uid).ready=true;
 assert.equal(legalUniversalActions(packs,used).some(a=>a.type==='activate'&&a.uid===energy.uid),false);
 let later=used;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalBp(packs,later,live(later,0,energy.uid)),5000);
 for(let n=0;n<16&&later.active===1;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,0);
 assert.equal(universalBp(packs,later,live(later,0,energy.uid)),4000);
 assert.equal(assertUniversalMatch(packs,later),true);
 const fresh=main(blue,29029);
 const front=put(fresh.s,0,'BLC-4-028','front',0);
 assert.equal(legalUniversalActions(fresh.packs,fresh.s).some(a=>a.type==='activate'&&a.uid===front.uid&&a.mode==='restOnceSelfBuff'),true);
 const fromFront=dispatchUniversalAction(fresh.packs,fresh.s,legalUniversalActions(fresh.packs,fresh.s).find(a=>a.type==='activate'&&a.uid===front.uid));
 assert.equal(live(fromFront,0,front.uid).ready,false);
 assert.equal(universalBp(fresh.packs,fromFront,live(fromFront,0,front.uid)),5000);
 assert.equal(assertUniversalMatch(fresh.packs,fromFront),true);
});

test('BLC-4-052 gains 1500 while an opposing front character is below its printed BP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-052');
 assert.equal(printed.effect,'若對方前線有BP低於印刷BP的角色，此角色BP+1500。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-052'];
 assert.equal(card.energy,0);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'oppFrontLiveBpBelowPrinted',turn:'any'},bp:1500}]);
 const {packs,s}=main(purple,29052);
 const self=put(s,0,'BLC-4-052','front',0);
 const foe=put(s,1,'BLC-1-039','front',0);
 const side=put(s,1,'BLC-1-035','energy',0);
 assert.equal(universalBp(packs,s,self),1500);
 foe.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),3000);
 foe.buffs.length=0;
 side.buffs.push({bp:-1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),1500);
 side.buffs.length=0;
 foe.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,self),1500);
 foe.buffs.length=0;
 let later=s;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 const there=live(later,0,self.uid);
 const reduced=live(later,1,foe.uid);
 reduced.buffs.push({bp:-500,untilTurn:later.turn});
 assert.equal(universalBp(packs,later,there),3000);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-3-007 may reveal one Gotei card from the top three, then discards only if it took one',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-007');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張【特徵：護廷十三隊】的卡片，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-007'];
 assert.equal(card.energy,2);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'trait',value:'護廷十三隊'}}]);
 const {packs,s}=main(green,29007);
 put(s,0,'BLC-1-070','energy',0);
 put(s,0,'BLC-1-078','energy',1);
 const [gotei,visor,other]=setTop(s,0,['BLC-1-080','BLC-4-062','BLC-4-060']);
 const self=take(s,0,'BLC-3-007');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(gotei.uid),true);
 assert.equal(chosen(visor.uid),false);
 assert.equal(chosen(other.uid),false);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>[gotei.uid,visor.uid,other.uid].includes(c.uid)),false);
 assert.deepEqual(missed.players[0].deck.slice(-3).map(c=>c.uid).sort(),[gotei.uid,visor.uid,other.uid].sort());
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:gotei.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-1-080');
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,true);
 const ordered=orderBottom(packs,taken);
 assert.equal(ordered.pending.kind,'effect-discard');
 const spare=ordered.players[0].hand.find(c=>c.uid!==gotei.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.some(c=>c.uid===gotei.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-2).map(c=>c.uid).sort(),[visor.uid,other.uid].sort());
 const empty=main(green,29008);
 put(empty.s,0,'BLC-1-070','energy',0);
 put(empty.s,0,'BLC-1-078','energy',1);
 const none=setTop(empty.s,0,['BLC-4-062','BLC-4-061','BLC-4-060']);
 const again=take(empty.s,0,'BLC-3-007');
 empty.s.players[0].hand.push(again);
 const replay=legalUniversalActions(empty.packs,empty.s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front');
 const opened=dispatchUniversalAction(empty.packs,empty.s,replay);
 assert.equal(opened.pending.kind,'effect-top-order');
 const closed=orderBottom(empty.packs,opened);
 assert.equal(closed.pending,null);
 assert.equal(closed.players[0].hand.some(c=>none.some(x=>x.uid===c.uid)),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-002 may reveal one of four printed names from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-002');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張〈黑崎一護〉、〈阿散井戀次〉、〈朽木露琪亞〉或〈朽木白哉〉，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。');
 const card=bleach.cards['BLC-3-002'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'黒崎 一護'},{field:'name',value:'阿散井 恋次'},
  {field:'name',value:'朽木 ルキア'},{field:'name',value:'朽木 白哉'}]}]);
 const {packs,s}=main(blue,29002);
 put(s,0,'BLC-2-027','energy',0);
 const [ichigo,other,byakuya]=setTop(s,0,['BLC-2-016','BLC-2-041','BLC-2-029']);
 const self=take(s,0,'BLC-3-002');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(ichigo.uid),true);
 assert.equal(chosen(byakuya.uid),true);
 assert.equal(chosen(other.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:byakuya.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-2-029');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==byakuya.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===byakuya.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].deck.some(c=>c.uid===other.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-4-001 is also Bazz-B and may reveal Bazz-B or Jugram from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-001');
 assert.equal(printed.effect,'此卡也視為《巴茲比》。登場時：查看牌庫頂3張，最多公開1張《巴茲比》或《雨葛蘭・哈斯沃德》加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-001'];
 assert.equal(card.energy,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(cardHasName(card,'バズ'),true);
 assert.equal(cardHasName(card,'バズビー'),true);
 assert.equal(cardHasName(card,'バズビー',true),false);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
  {field:'name',value:'バズビー'},{field:'name',value:'ユーグラム・ハッシュヴァルト'}]}]);
 const {packs,s}=main(yellow,29001);
 put(s,0,'BLC-1-023','energy',0);
 const self=take(s,0,'BLC-4-001');
 const [alias,jugram,other]=setTop(s,0,['BLC-4-001','BLC-1-018','BLC-1-006']);
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(alias.uid),true);
 assert.equal(chosen(jugram.uid),true);
 assert.equal(chosen(other.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:alias.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-001');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==alias.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===alias.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].hand.some(c=>c.uid===other.uid),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-2-072 rests a cheap green character from hand only while Hitsugaya is on the own field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-072');
 assert.equal(printed.effect,'登場：己方場上有〈日番谷冬獅郎〉時，可從手牌將最多 1 張需求能源 2 以下、AP 消耗 1 的綠色角色卡，以 REST 登場於己方場上。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-072'];
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'deployOwnHandRest',type:'character',color:'green',
  energy:2,ap:1,max:1,when:{kind:'ownNameExists',turn:'any',zone:'field',
  excludeSelf:false,name:'日番谷 冬獅郎'}}]);
 const closed=main(green,29072);
 put(closed.s,0,'BLC-1-078','energy',0);
 put(closed.s,0,'BLC-1-080','energy',1);
 put(closed.s,1,'BLC-1-083','front',0);
 const lone=take(closed.s,0,'BLC-2-072');
 closed.s.players[0].hand.push(lone);
 const blocked=legalUniversalActions(closed.packs,closed.s).find(a=>a.type==='play'&&a.uid===lone.uid&&a.line==='front');
 assert.ok(blocked);
 const quiet=dispatchUniversalAction(closed.packs,closed.s,blocked);
 assert.equal(quiet.pending,null);
 const {packs,s}=main(green,29073);
 put(s,0,'BLC-1-078','energy',0);
 put(s,0,'BLC-1-080','energy',1);
 const gate=put(s,0,'BLC-1-083','energy',2);
 const cheap=take(s,0,'BLC-4-062');
 const heavy=take(s,0,'BLC-1-070');
 s.players[0].hand.push(cheap,heavy);
 const self=take(s,0,'BLC-2-072');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-hand-rest');
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseHandRest'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(cheap.uid),true);
 assert.equal(chosen(heavy.uid),false);
 assert.equal(chosen(gate.uid),false);
 const skipped=dispatchUniversalAction(packs,played,{type:'chooseHandRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===cheap.uid),true);
 const enter=choices.find(a=>a.type==='chooseHandRest'&&a.uid===cheap.uid&&a.line==='front');
 assert.ok(enter);
 const entered=dispatchUniversalAction(packs,played,enter);
 assert.equal(entered.pending,null);
 const arrived=live(entered,0,cheap.uid);
 assert.equal(arrived.ready,false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,entered),true);
});

test('BLC-2-032 reveals one printed-AP-2 card from the top five and does not discard',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-032');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 5 張，可公開其中最多 1 張原始 AP 消耗 2 以上的卡並加入手牌，其餘以任意順序放至牌堆底。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-032'];
 assert.equal(card.energy,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopUpToTwoBottom',count:5,max:1,rest:'bottom',
  logic:'all',filters:[{field:'printedApAtLeast',value:2}]}]);
 const {packs,s}=main(blue,29032);
 put(s,0,'BLC-2-026','energy',0);
 put(s,0,'BLC-4-028','energy',1);
 const [heavy,light,a,b,c]=setTop(s,0,['BLC-4-022','BLC-2-031','BLC-2-027','BLC-2-041','BLC-4-036']);
 const self=take(s,0,'BLC-2-032');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-many-choice');
 assert.equal(played.pending.max,1);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFilteredMany'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(heavy.uid),true);
 assert.equal(chosen(light.uid),false);
 const skipped=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFilteredMany',uid:null}));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(x=>x.uid===heavy.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFilteredMany',uid:heavy.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-022');
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,undefined);
 const done=orderBottom(packs,taken);
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.some(x=>x.uid===heavy.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-4).map(x=>x.uid).sort(),[light.uid,a.uid,b.uid,c.uid].sort());
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-004 rests itself and one other active front character, then generates one more purple',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-004');
 assert.equal(printed.effect,'【啟動主要】【將此角色轉為 Rest】【每回合一次】將自己前線的 1 張 Active 角色轉為 Rest。若如此做，此角色在本回合中產生能源＋紫 1。');
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-3-004'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.mainAbility,{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1});
 const {packs,s}=main(purple,29004);
 const other=put(s,0,'BLC-1-035','front',0);
 const self=put(s,0,'BLC-3-004','energy',0);
 assert.equal(universalEnergyByColor(packs,s,0).purple,1);
 const used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='restFrontGainEnergy'));
 assert.equal(used.pending.kind,'main-rest-front-energy');
 const targets=legalUniversalActions(packs,used);
 assert.equal(targets.some(a=>a.uid===other.uid),true);
 assert.equal(targets.some(a=>a.uid===self.uid),false);
 const done=dispatchUniversalAction(packs,used,{type:'chooseRestFrontEnergy',uid:other.uid});
 assert.equal(live(done,0,self.uid).ready,false);
 assert.equal(live(done,0,other.uid).ready,false);
 assert.equal(universalEnergyByColor(packs,done,0).purple,2);
 live(done,0,self.uid).ready=true;
 assert.equal(legalUniversalActions(packs,done).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 let later=done;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(universalEnergyByColor(packs,later,0).purple,1);
 const front=main(purple,29005);
 const source=put(front.s,0,'BLC-3-004','front',0);
 const mate=put(front.s,0,'BLC-1-039','front',1);
 assert.equal(universalEnergyByColor(front.packs,front.s,0).purple||0,0);
 const rested=dispatchUniversalAction(front.packs,front.s,legalUniversalActions(front.packs,front.s).find(a=>a.uid===source.uid&&a.mode==='restFrontGainEnergy'));
 const after=dispatchUniversalAction(front.packs,rested,{type:'chooseRestFrontEnergy',uid:mate.uid});
 assert.equal(live(after,0,source.uid).ready,false);
 assert.equal(universalEnergyByColor(front.packs,after,0).purple||0,0);
 assert.equal(live(after,0,source.uid).buffs.some(b=>b.energy===1),true);
 const alone=main(purple,29006);
 const only=put(alone.s,0,'BLC-3-004','front',0);
 put(alone.s,1,'BLC-1-035','front',0);
 assert.equal(legalUniversalActions(alone.packs,alone.s).some(a=>a.type==='activate'&&a.uid===only.uid),false);
 only.ready=false;
 const parked=put(alone.s,0,'BLC-1-039','front',1,false);
 assert.equal(legalUniversalActions(alone.packs,alone.s).some(a=>a.uid===only.uid),false);
 assert.equal(parked.ready,false);
 aiOk(packs,used);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(assertUniversalMatch(front.packs,after),true);
});

test('BLC-1-079 discards one hand card once per turn and generates two more green',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-079');
 assert.equal(printed.effect,'主要階段・每回合 1 次：將 1 張手牌送至場外，本回合額外產生 2 綠能源。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-1-079'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.mainAbility,{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,energy:2});
 const {packs,s}=main(green,29079);
 const self=put(s,0,'BLC-1-079','energy',0);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 const payment=s.players[0].hand[0];
 const used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='discardSelfBuff'));
 assert.equal(used.pending.kind,'main-discard-buff');
 assert.equal(used.pending.energy,2);
 const done=dispatchUniversalAction(packs,used,{type:'chooseMainDiscard',uid:payment.uid});
 assert.equal(live(done,0,self.uid).ready,true);
 assert.equal(done.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(universalEnergyByColor(packs,done,0).green,3);
 assert.equal(legalUniversalActions(packs,done).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const rested=main(green,29080);
 const quiet=put(rested.s,0,'BLC-1-079','energy',0,false);
 assert.equal(legalUniversalActions(rested.packs,rested.s).some(a=>a.uid===quiet.uid&&a.mode==='discardSelfBuff'),true);
 const side=main(green,29081);
 const front=put(side.s,0,'BLC-1-079','front',0);
 const spare=side.s.players[0].hand[0];
 const opened=dispatchUniversalAction(side.packs,side.s,legalUniversalActions(side.packs,side.s).find(a=>a.uid===front.uid&&a.mode==='discardSelfBuff'));
 const sided=dispatchUniversalAction(side.packs,opened,{type:'chooseMainDiscard',uid:spare.uid});
 assert.equal(live(sided,0,front.uid).ready,true);
 assert.equal(universalEnergyByColor(side.packs,sided,0).green||0,0);
 assert.equal(live(sided,0,front.uid).buffs.some(b=>b.energy===2),true);
 const empty=main(green,29082);
 const held=put(empty.s,0,'BLC-1-079','energy',0);
 empty.s.players[0].outside.push(...empty.s.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(empty.packs,empty.s).some(a=>a.uid===held.uid),false);
 aiOk(packs,used);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(assertUniversalMatch(side.packs,sided),true);
});

test('BLC-2-050 reveals one traitless non-Raid character from the top five',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-050');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 5 張，可公開其中最多 1 張不具有特徵、且不具有 Raid 的角色卡並加入手牌，其餘以任意順序放至牌堆底。若有卡加入手牌，再將 1 張手牌送至場外。');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-2-050'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,2);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:5,excludeRaid:true,
  filter:{field:'traitlessCharacter',value:true}}]);
 const older=bleach.cards['BLC-2-015'];
 assert.deepEqual(older.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,
  filter:{field:'traitlessCharacter',value:true}}]);
 const {packs,s}=main(purple,29050);
 put(s,0,'BLC-1-103','energy',0);
 put(s,0,'BLC-1-035','energy',1);
 const [plain,raid,traited,event,named]=setTop(s,0,['BLC-4-046','BLC-1-041','BLC-4-052','BLC-1-062','BLC-1-039']);
 const self=take(s,0,'BLC-2-050');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 assert.equal(played.pending.excludeRaid,true);
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(plain.uid),true);
 assert.equal(chosen(raid.uid),false);
 assert.equal(chosen(traited.uid),false);
 assert.equal(chosen(event.uid),false);
 assert.equal(chosen(named.uid),false);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>c.uid===plain.uid),false);
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:plain.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-4-046');
 const ordered=orderBottom(packs,taken);
 const spare=ordered.players[0].hand.find(c=>c.uid!==plain.uid&&c.uid!==self.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===plain.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(done.players[0].deck.some(c=>c.uid===raid.uid),true);
 const prior=main(blue,29015);
 put(prior.s,0,'BLC-2-027','energy',0);
 const [raider,open,marked]=setTop(prior.s,0,['BLC-2-019','BLC-2-016','BLC-2-041']);
 const kisuke=take(prior.s,0,'BLC-2-015');
 prior.s.players[0].hand.push(kisuke);
 const again=legalUniversalActions(prior.packs,prior.s).find(a=>a.type==='play'&&a.uid===kisuke.uid&&a.line==='front');
 const opened=dispatchUniversalAction(prior.packs,prior.s,again);
 const olderChoices=legalUniversalActions(prior.packs,opened);
 const olderHit=uid=>olderChoices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(opened.pending.excludeRaid,undefined);
 assert.equal(olderHit(raider.uid),true);
 assert.equal(olderHit(open.uid),true);
 assert.equal(olderHit(marked.uid),false);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-1-108 rests, retires itself, draws two, then puts one hand card outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-108');
 assert.equal(printed.nameJa,'一護の部屋');
 assert.equal(printed.effect,'主要階段：REST 並退場自己，抽 2 張，再棄 1 張。');
 const card=bleach.cards['BLC-1-108'];
 assert.equal(card.name,'一護の部屋');
 assert.equal(card.type,'field');
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.mainAbility,{op:'fieldRestRetireThen',then:[{op:'drawDiscard',count:2,discardCount:1}]});
 const {packs,s}=main(purple,29108);
 const self=put(s,0,'BLC-1-108','energy',0);
 const beforeHand=s.players[0].hand.length,beforeDeck=s.players[0].deck.length;
 const used=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='fieldRestTrueRetireDeploy'));
 assert.equal(used.players[0].energy.some(c=>c?.uid===self.uid),false);
 assert.equal(used.players[0].outside.some(c=>c.uid===self.uid),true);
 assert.equal(used.players[0].hand.length,beforeHand+2);
 assert.equal(used.players[0].deck.length,beforeDeck-2);
 assert.equal(used.pending.kind,'effect-discard');
 const spare=used.players[0].hand[0];
 const done=dispatchUniversalAction(packs,used,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.pending,null);
 assert.equal(done.players[0].hand.length,beforeHand+1);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 const quiet=main(purple,29109);
 const asleep=put(quiet.s,0,'BLC-1-108','energy',0,false);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='activate'&&a.uid===asleep.uid),false);
 aiOk(packs,used);
 assert.equal(assertUniversalMatch(packs,done),true);
});

test('BLC-3-010 places each of the top two on the top or the bottom',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-010');
 assert.equal(printed.effect,'【登場時】查看自己牌庫上方 2 張牌。將這些卡片依任意張數與任意順序，分別放到牌庫頂與牌庫底。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-010'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'inspectTopArrange',count:2,split:true}]);
 const hirako=realDeck(['BLC-3-010','BLC-1-080','BLC-1-078','BLC-1-070','BLC-4-062','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-4-061','BLC-2-072','BLC-1-083','BLC-1-079'],'green');
 const {packs,s}=main(hirako,29010);
 put(s,0,'BLC-1-080','energy',0);
 const [first,second]=setTop(s,0,['BLC-1-078','BLC-4-062']);
 const under=s.players[0].deck[2];
 const self=take(s,0,'BLC-3-010');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-order');
 assert.equal(played.pending.split,true);
 const choices=legalUniversalActions(packs,played);
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.equal(choices.filter(a=>a.uid===first.uid).map(a=>a.place).sort().join(','),'bottom,top');
 assert.equal(choices.some(a=>a.place===undefined),false);
 const bottom=choices.find(a=>a.uid===first.uid&&a.place==='bottom');
 const afterBottom=dispatchUniversalAction(packs,played,bottom);
 const top=legalUniversalActions(packs,afterBottom).find(a=>a.uid===second.uid&&a.place==='top');
 const split=dispatchUniversalAction(packs,afterBottom,top);
 assert.equal(split.pending,null);
 assert.equal(split.players[0].deck[0].uid,second.uid);
 assert.equal(split.players[0].deck.at(-1).uid,first.uid);
 assert.equal(split.players[0].deck[1].uid,under.uid);
 const both=main(hirako,29011);
 put(both.s,0,'BLC-1-080','energy',0);
 const [alpha,beta]=setTop(both.s,0,['BLC-1-070','BLC-2-072']);
 const again=take(both.s,0,'BLC-3-010');
 both.s.players[0].hand.push(again);
 const opened=dispatchUniversalAction(both.packs,both.s,legalUniversalActions(both.packs,both.s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front'));
 const firstTop=legalUniversalActions(both.packs,opened).find(a=>a.uid===alpha.uid&&a.place==='top');
 const mid=dispatchUniversalAction(both.packs,opened,firstTop);
 const secondTop=legalUniversalActions(both.packs,mid).find(a=>a.uid===beta.uid&&a.place==='top');
 const stacked=dispatchUniversalAction(both.packs,mid,secondTop);
 assert.equal(stacked.players[0].deck[0].uid,alpha.uid);
 assert.equal(stacked.players[0].deck[1].uid,beta.uid);
 const short=main(hirako,29012);
 put(short.s,0,'BLC-1-080','energy',0);
 const only=setTop(short.s,0,['BLC-4-060'])[0];
 short.s.players[0].outside.push(...short.s.players[0].deck.splice(1));
 const lone=take(short.s,0,'BLC-3-010');
 short.s.players[0].hand.push(lone);
 const one=dispatchUniversalAction(short.packs,short.s,legalUniversalActions(short.packs,short.s).find(a=>a.type==='play'&&a.uid===lone.uid&&a.line==='front'));
 assert.equal(one.pending.uids.length,1);
 const placed=dispatchUniversalAction(short.packs,one,legalUniversalActions(short.packs,one).find(a=>a.uid===only.uid&&a.place==='bottom'));
 assert.equal(placed.players[0].deck.at(-1).uid,only.uid);
 const bare=main(hirako,29013);
 put(bare.s,0,'BLC-1-080','energy',0);
 bare.s.players[0].outside.push(...bare.s.players[0].deck.splice(0));
 const emptyHand=take(bare.s,0,'BLC-3-010');
 bare.s.players[0].hand.push(emptyHand);
 const quiet=dispatchUniversalAction(bare.packs,bare.s,legalUniversalActions(bare.packs,bare.s).find(a=>a.type==='play'&&a.uid===emptyHand.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===emptyHand.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,split),true);
 assert.equal(assertUniversalMatch(both.packs,stacked),true);
});

test('BLC-2-018 returns one opposing front character at BP 4000 or lower, then draws and discards on the front',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-018');
 assert.equal(printed.effect,'登場：可將最多 1 個敵方前線 BP 4000 以下角色返回手牌。主要階段・位於前線・每回合 1 次：抽 1 張，再將 1 張手牌送至場外。');
 assert.equal(printed.traits,'無');
 const card=bleach.cards['BLC-2-018'];
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'bounceOppFrontOneUnderBp',bp:4000,optional:true}]);
 assert.deepEqual(card.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'drawDiscard',count:1,discardCount:1}]});
 const ichigo=realDeck(['BLC-2-018','BLC-4-027','BLC-2-020','BLC-4-036','BLC-2-016','BLC-2-027','BLC-4-022','BLC-4-028','BLC-3-002','BLC-2-032','BLC-2-015','BLC-2-019','BLC-2-026'],'blue');
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[ichigo,ichigo],seed:29018,first:0});
 let mains=0;
 for(let n=0;n<40&&mains<2;n++){
  if(s.active===0&&s.phase==='main'){
   mains++;
   if(mains===2)break;
  }
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step,s.pending?.kind||s.phase);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(s.players[0].ownTurns,2);
 put(s,0,'BLC-4-027','energy',0);
 put(s,0,'BLC-2-020','energy',1);
 const legal=put(s,1,'BLC-4-036','front',0);
 const tall=put(s,1,'BLC-4-022','front',1);
 tall.buffs.push({bp:1000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,tall),5000);
 const aside=put(s,1,'BLC-2-016','energy',0);
 const self=take(s,0,'BLC-2-018');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const opened=dispatchUniversalAction(packs,s,play);
 assert.equal(opened.pending.kind,'effect-bounce-bp');
 const choices=legalUniversalActions(packs,opened);
 assert.equal(choices.some(a=>a.uid===legal.uid),true);
 assert.equal(choices.some(a=>a.uid===tall.uid),false);
 assert.equal(choices.some(a=>a.uid===aside.uid),false);
 assert.equal(choices.some(a=>a.uid===null),true);
 const returned=dispatchUniversalAction(packs,opened,choices.find(a=>a.uid===legal.uid));
 assert.equal(returned.pending,null);
 assert.equal(returned.players[1].hand.some(c=>c.uid===legal.uid),true);
 assert.equal(returned.players[1].front.some(c=>c?.uid===legal.uid),false);
 assert.equal(returned.players[1].front.some(c=>c?.uid===tall.uid),true);
 const onFront=returned.players[0].front.find(c=>c?.uid===self.uid);
 assert.ok(onFront);
 assert.equal(onFront.ready,false);
 const beforeHand=returned.players[0].hand.length;
 const beforeDeck=returned.players[0].deck.length;
 const act=legalUniversalActions(packs,returned).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='frontOnce');
 assert.ok(act);
 const drawing=dispatchUniversalAction(packs,returned,act);
 assert.equal(drawing.pending.kind,'effect-discard');
 assert.equal(drawing.players[0].hand.length,beforeHand+1);
 assert.equal(drawing.players[0].deck.length,beforeDeck-1);
 const spare=drawing.players[0].hand.find(c=>c.uid!==self.uid);
 const dumped=dispatchUniversalAction(packs,drawing,legalUniversalActions(packs,drawing).find(a=>a.type==='chooseDiscard'&&a.uid===spare.uid));
 assert.equal(dumped.pending,null);
 assert.equal(dumped.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(legalUniversalActions(packs,dumped).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const quiet=main(ichigo,29019);
 put(quiet.s,0,'BLC-4-027','energy',0);
 put(quiet.s,0,'BLC-2-020','energy',1);
 const parked=put(quiet.s,0,'BLC-2-018','energy',2);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 const skipped=main(ichigo,29020);
 for(let n=0;n<40&&!(skipped.s.active===0&&skipped.s.phase==='main'&&skipped.s.players[0].ownTurns===2);n++){
  const step=legalUniversalActions(skipped.packs,skipped.s).find(a=>a.type==='next');
  assert.ok(step);
  skipped.s=dispatchUniversalAction(skipped.packs,skipped.s,step);
 }
 put(skipped.s,0,'BLC-4-027','energy',0);
 put(skipped.s,0,'BLC-2-020','energy',1);
 const high=put(skipped.s,1,'BLC-4-022','front',0);
 high.buffs.push({bp:1000,untilTurn:skipped.s.turn});
 const alone=take(skipped.s,0,'BLC-2-018');
 skipped.s.players[0].hand.push(alone);
 const entered=dispatchUniversalAction(skipped.packs,skipped.s,legalUniversalActions(skipped.packs,skipped.s).find(a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front'));
 assert.equal(entered.pending,null);
 assert.equal(entered.players[1].front.some(c=>c?.uid===high.uid),true);
 aiOk(packs,opened);
 assert.equal(assertUniversalMatch(packs,dumped),true);
 assert.equal(assertUniversalMatch(skipped.packs,entered),true);
});

test('BLC-1-056 rests, retires, and must add one purple character from outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-056');
 assert.equal(printed.effect,'主要階段：REST 並退場自己，從己方場外將 1 張紫色角色卡加入手牌。');
 assert.equal(printed.traits,'零番隊');
 const card=bleach.cards['BLC-1-056'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['零番隊']);
 assert.deepEqual(card.mainAbility,{op:'restRetireRecoverOutside',optional:false,
  filters:[{field:'color',value:'purple'},{field:'type',value:'character'}],logic:'all'});
 const kirinji=realDeck(['BLC-1-056','BLC-1-062','BLC-1-108','BLC-1-039','BLC-4-046'],'purple');
 const {packs,s}=main(kirinji,29056);
 const self=put(s,0,'BLC-1-056','energy',0,true);
 const asleep=put(s,0,'BLC-1-056','front',0,false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===asleep.uid),false);
 const event=take(s,0,'BLC-1-062');
 const fieldCard=take(s,0,'BLC-1-108');
 const other=take(s,0,'BLC-4-046');
 s.players[0].outside.push(event,fieldCard,other);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='restRetireRecover');
 assert.ok(act);
 const paid=dispatchUniversalAction(packs,s,act);
 assert.equal(paid.players[0].energy[0],null);
 assert.equal(paid.pending.kind,'effect-recover-outside');
 assert.equal(paid.pending.optional,false);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===null),false);
 const ids=paid.pending.choices.map(uid=>paid.players[0].outside.find(c=>c.uid===uid).cardId).sort();
 assert.deepEqual(ids,['BLC-1-056','BLC-4-046']);
 const taken=dispatchUniversalAction(packs,paid,legalUniversalActions(packs,paid).find(a=>a.uid===other.uid));
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===self.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(taken.players[0].outside.some(c=>c.uid===fieldCard.uid),true);
 const alone=main(kirinji,29057);
 const only=put(alone.s,0,'BLC-1-056','front',0,true);
 const back=dispatchUniversalAction(alone.packs,alone.s,legalUniversalActions(alone.packs,alone.s).find(a=>a.type==='activate'&&a.uid===only.uid&&a.mode==='restRetireRecover'));
 assert.deepEqual(back.pending.choices,[only.uid]);
 const home=dispatchUniversalAction(alone.packs,back,legalUniversalActions(alone.packs,back)[0]);
 assert.equal(home.players[0].hand.some(c=>c.uid===only.uid),true);
 assert.equal(home.players[0].front[0],null);
 aiOk(packs,paid);
 assert.equal(assertUniversalMatch(packs,taken),true);
 assert.equal(assertUniversalMatch(alone.packs,home),true);
});

test('BLC-4-024 moves one other traitless character and generates two blue',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-024');
 assert.equal(printed.effect,'登場時：最多選自己場上另1個沒有特徵的角色，移至另一條線；目的線已滿時，先選該線1張卡除外。');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.gen,3);
 const card=bleach.cards['BLC-4-024'];
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'moveOtherAcrossOrRemove',optional:true,traitless:true}]);
 // Catalogue token 「無」 stays a trait. An empty list is the traitless print.
 assert.deepEqual(bleach.cards['BLC-1-039'].traits,['無']);
 const kisuke=realDeck(['BLC-4-024','BLC-4-027','BLC-2-016','BLC-2-031','BLC-2-025','BLC-2-036','BLC-2-029','BLC-4-035','BLC-2-040','BLC-4-042','BLC-2-039','BLC-4-038','BLC-2-020'],'blue');
 const {packs,s}=main(kisuke,29024);
 const fuel=put(s,0,'BLC-4-027','energy',0);
 const before=universalEnergyByColor(packs,s,0).blue;
 const generator=put(s,0,'BLC-4-024','energy',1);
 assert.equal(universalEnergyByColor(packs,s,0).blue,before+2);
 const bare=put(s,0,'BLC-2-016','energy',2);
 const traited=put(s,0,'BLC-2-031','front',0);
 const self=take(s,0,'BLC-4-024');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===1);
 assert.ok(play);
 const opened=dispatchUniversalAction(packs,s,play);
 assert.equal(opened.pending.kind,'effect-line-move');
 assert.equal(opened.pending.traitless,true);
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.choices.includes(bare.uid),true);
 assert.equal(opened.pending.choices.includes(self.uid),false);
 assert.equal(opened.pending.choices.includes(generator.uid),true);
 assert.equal(opened.pending.choices.includes(fuel.uid),true);
 assert.equal(opened.pending.choices.includes(traited.uid),false);
 aiOk(packs,opened);
 const moving=dispatchUniversalAction(packs,opened,legalUniversalActions(packs,opened).find(a=>a.type==='chooseLineMove'&&a.uid===bare.uid));
 assert.equal(moving.pending.kind,'effect-line-slot');
 const landed=dispatchUniversalAction(packs,moving,legalUniversalActions(packs,moving).find(a=>a.type==='chooseLineSlot'&&a.slot===2));
 assert.equal(landed.pending,null);
 assert.equal(landed.players[0].front[2].uid,bare.uid);
 assert.equal(landed.players[0].energy[2],null);
 assert.equal(landed.players[0].front[1].uid,self.uid);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseLineMove',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].energy[2].uid,bare.uid);
 const quiet=main(kisuke,29025);
 put(quiet.s,0,'BLC-4-042','energy',0);
 put(quiet.s,0,'BLC-2-031','energy',1);
 const alone=take(quiet.s,0,'BLC-4-024');
 quiet.s.players[0].hand.push(alone);
 const none=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front'));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].front.some(c=>c?.uid===alone.uid),true);
 const full=main(kisuke,29026);
 put(full.s,0,'BLC-4-027','energy',0);
 const mover=put(full.s,0,'BLC-2-016','energy',1);
 const occupants=[0,1,2,3].map(slot=>put(full.s,0,'BLC-2-031','front',slot));
 const entering=take(full.s,0,'BLC-4-024');
 full.s.players[0].hand.push(entering);
 const crowded=dispatchUniversalAction(full.packs,full.s,legalUniversalActions(full.packs,full.s).find(a=>a.type==='play'&&a.uid===entering.uid&&a.line==='energy'&&a.slot===2));
 assert.equal(crowded.pending.choices.includes(mover.uid),true);
 assert.equal(crowded.pending.choices.some(uid=>occupants.some(c=>c.uid===uid)),false);
 const chosen=dispatchUniversalAction(full.packs,crowded,{type:'chooseLineMove',uid:mover.uid});
 const removed=dispatchUniversalAction(full.packs,chosen,legalUniversalActions(full.packs,chosen).find(a=>a.type==='chooseLineSlot'&&a.replaceUid===occupants[0].uid));
 assert.equal(removed.players[0].removed.some(c=>c.uid===occupants[0].uid),true);
 assert.equal(removed.players[0].front[0].uid,mover.uid);
 assert.equal(removed.players[0].energy[1],null);
 assert.equal(assertUniversalMatch(packs,landed),true);
 assert.equal(assertUniversalMatch(quiet.packs,none),true);
 assert.equal(assertUniversalMatch(full.packs,removed),true);
});

test('BLC-1-004 raids onto Es Nott, has Impact 1, and may rest one front character at live BP 3000',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-004');
 assert.equal(printed.effect,'Raid〈艾斯・諾特〉：轉為 ACTIVE，可移至前線。Impact 1。主要階段・位於前線・每回合 1 次：可選最多 1 個敵方前線 BP 3000 以下角色，將其轉為 REST。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-004'];
 assert.equal(card.raidName,'エス・ノト');
 assert.equal(card.printedImpact,1);
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.mainAbility,{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'restOppFrontUnderBp',bp:3000,optional:true}]});
 const es=realDeck(['BLC-1-004','BLC-1-002','BLC-1-005','BLC-1-006','BLC-1-007','BLC-1-017','BLC-1-015','BLC-1-012','BLC-1-019','BLC-1-023','BLC-2-007','BLC-1-027','BLC-4-014'],'yellow');
 const {packs,s}=main(es,29004);
 const asleep=put(s,0,'BLC-1-004','front',0,false);
 const parked=put(s,0,'BLC-1-004','energy',1,true);
 assert.equal(universalImpact(packs,s,asleep),1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 const low=put(s,1,'BLC-1-005','front',0,true);
 const raised=put(s,1,'BLC-1-005','front',1,true);
 raised.buffs.push({bp:1000,untilTurn:s.turn});
 const high=put(s,1,'BLC-1-006','front',2,true);
 high.buffs.push({bp:-1000,untilTurn:s.turn});
 const aside=put(s,1,'BLC-1-012','energy',0,true);
 assert.equal(universalBp(packs,s,low),3000);
 assert.equal(universalBp(packs,s,raised),4000);
 assert.equal(universalBp(packs,s,high),3000);
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===asleep.uid&&a.mode==='frontOnce');
 assert.ok(act);
 const opened=dispatchUniversalAction(packs,s,act);
 assert.equal(opened.pending.kind,'effect-rest-bp');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.limit,3000);
 const choices=legalUniversalActions(packs,opened);
 assert.equal(choices[0].uid,null);
 assert.equal(choices.some(a=>a.uid===low.uid),true);
 assert.equal(choices.some(a=>a.uid===high.uid),true);
 assert.equal(choices.some(a=>a.uid===raised.uid),false);
 assert.equal(choices.some(a=>a.uid===aside.uid),false);
 aiOk(packs,opened);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseRestBp',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0].ready,true);
 const rested=dispatchUniversalAction(packs,opened,choices.find(a=>a.uid===low.uid));
 assert.equal(rested.pending,null);
 assert.equal(rested.players[1].front.find(c=>c?.uid===low.uid).ready,false);
 assert.equal(rested.players[1].front.find(c=>c?.uid===high.uid).ready,true);
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.type==='activate'&&a.uid===asleep.uid),false);
 const quiet=main(es,29005);
 const lone=put(quiet.s,0,'BLC-1-004','front',0,true);
 const used=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='activate'&&a.uid===lone.uid&&a.mode==='frontOnce'));
 assert.equal(used.pending,null);
 assert.equal(used.players[0].front[0].ready,true);
 assert.equal(legalUniversalActions(quiet.packs,used).some(a=>a.type==='activate'&&a.uid===lone.uid),false);
 const raid=main(es,29006);
 put(raid.s,0,'BLC-1-007','energy',0);
 put(raid.s,0,'BLC-1-017','energy',1);
 const base=put(raid.s,0,'BLC-1-002','energy',2);
 const other=put(raid.s,0,'BLC-1-012','front',1);
 const raider=take(raid.s,0,'BLC-1-004');
 raid.s.players[0].hand.push(raider);
 const legal=legalUniversalActions(raid.packs,raid.s);
 assert.equal(legal.some(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===other.uid),false);
 const action=legal.find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(action);
 const stacked=dispatchUniversalAction(raid.packs,raid.s,action);
 const top=stacked.players[0].front[0];
 assert.equal(top.uid,raider.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(stacked.players[0].energy[2],null);
 assert.equal(universalImpact(raid.packs,stacked,top),1);
 assert.equal(assertUniversalMatch(packs,rested),true);
 assert.equal(assertUniversalMatch(quiet.packs,used),true);
 assert.equal(assertUniversalMatch(raid.packs,stacked),true);
});

test('BLC-1-046 mills one card from the front, then may give another character BP+500',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-046');
 assert.equal(printed.effect,'前線・每回合 1 次：牌堆頂 1 張送場外，成功時可讓另一己方角色本回合 BP +500。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-1-046'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.then[0].op,'millTop');
 assert.equal(card.mainAbility.then[0].count,1);
 const renji=realDeck(['BLC-1-046','BLC-4-046','BLC-1-108','BLC-1-039','BLC-1-062','BLC-2-050','BLC-3-004','BLC-1-041','BLC-1-035','BLC-4-052','BLC-1-103','BLC-1-034','BLC-1-036'],'purple');
 const {packs,s}=main(renji,29046);
 const self=put(s,0,'BLC-1-046','front',0,false);
 const parked=put(s,0,'BLC-1-046','energy',0,true);
 const other=put(s,0,'BLC-4-046','front',1);
 const aside=put(s,0,'BLC-1-039','energy',1);
 const fieldCard=put(s,0,'BLC-1-108','energy',2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===parked.uid),false);
 const [top]=setTop(s,0,['BLC-1-062']);
 const beforeDeck=s.players[0].deck.length;
 const act=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='frontOnce');
 assert.ok(act);
 const opened=dispatchUniversalAction(packs,s,act);
 assert.equal(opened.players[0].deck.length,beforeDeck-1);
 assert.equal(opened.players[0].outside.some(c=>c.uid===top.uid),true);
 assert.equal(opened.players[0].front[0].ready,false);
 assert.equal(opened.pending.kind,'effect-buff-own');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.bp,500);
 const choices=legalUniversalActions(packs,opened);
 assert.equal(choices[0].uid,null);
 assert.equal(choices.some(a=>a.uid===other.uid),true);
 assert.equal(choices.some(a=>a.uid===aside.uid),true);
 assert.equal(choices.some(a=>a.uid===self.uid),false);
 assert.equal(choices.some(a=>a.uid===parked.uid),true);
 assert.equal(choices.some(a=>a.uid===fieldCard.uid),false);
 aiOk(packs,opened);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front[1]),1000);
 const buffed=dispatchUniversalAction(packs,opened,choices.find(a=>a.uid===other.uid));
 assert.equal(buffed.pending,null);
 assert.equal(universalBp(packs,buffed,buffed.players[0].front[1]),1500);
 assert.equal(buffed.players[0].front[1].buffs.some(b=>b.bp===500&&b.untilTurn===buffed.turn),true);
 assert.equal(legalUniversalActions(packs,buffed).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 const quiet=main(renji,29047);
 const lone=put(quiet.s,0,'BLC-1-046','front',0,true);
 const mate=put(quiet.s,0,'BLC-4-046','energy',0);
 quiet.s.players[0].outside.push(...quiet.s.players[0].deck.splice(0));
 const unused=universalBp(quiet.packs,quiet.s,mate);
 const done=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='activate'&&a.uid===lone.uid&&a.mode==='frontOnce'));
 assert.equal(done.pending,null);
 assert.equal(done.players[0].front[0].ready,true);
 assert.equal(universalBp(quiet.packs,done,done.players[0].energy[0]),unused);
 assert.equal(legalUniversalActions(quiet.packs,done).some(a=>a.type==='activate'&&a.uid===lone.uid),false);
 assert.equal(assertUniversalMatch(packs,buffed),true);
 assert.equal(assertUniversalMatch(quiet.packs,done),true);
});

test('BLC-4-063 gives another character BP+1000, or BP+2000 for four printed names',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-063');
 assert.equal(printed.effect,'登場時：最多選自己場上另1個角色，本回合BP+1000；若所選角色為《更木劍八》、《草鹿八千流》、《斑目一角》或《綾瀨川弓親》，改為BP+2000。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.gen,3);
 const card=bleach.cards['BLC-4-063'];
 assert.equal(card.gen,2);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.effects.onPlay[0].bp,1000);
 assert.equal(card.effects.onPlay[0].bonusBp,2000);
 assert.deepEqual(card.effects.onPlay[0].bonusNames,['更木 剣八','草鹿 やちる','斑目 一角','綾瀬川 弓親']);
 const yumi=realDeck(['BLC-4-063','BLC-1-094','BLC-4-076','BLC-1-080','BLC-1-076','BLC-2-071','BLC-1-067','BLC-1-091','BLC-1-078','BLC-1-087','BLC-4-062','BLC-2-072','BLC-1-079'],'green');
 const {packs,s}=main(yumi,29063);
 const fieldA=put(s,0,'BLC-1-094','energy',0);
 const fieldB=put(s,0,'BLC-4-076','energy',1);
 const before=universalEnergyByColor(packs,s,0).green;
 const generator=put(s,0,'BLC-4-063','energy',2);
 assert.equal(universalEnergyByColor(packs,s,0).green,before+2);
 const ken=put(s,0,'BLC-1-080','front',0);
 const yama=put(s,0,'BLC-1-091','front',1);
 const yachiru=put(s,0,'BLC-1-076','energy',3);
 const self=take(s,0,'BLC-4-063');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 const opened=dispatchUniversalAction(packs,s,play);
 assert.equal(opened.pending.kind,'effect-buff-own');
 assert.equal(opened.pending.bonusBp,2000);
 assert.equal(opened.pending.choices.includes(ken.uid),true);
 assert.equal(opened.pending.choices.includes(yama.uid),true);
 assert.equal(opened.pending.choices.includes(yachiru.uid),true);
 assert.equal(opened.pending.choices.includes(self.uid),false);
 assert.equal(opened.pending.choices.includes(generator.uid),true);
 assert.equal(opened.pending.choices.includes(fieldA.uid),false);
 assert.equal(opened.pending.choices.includes(fieldB.uid),false);
 aiOk(packs,opened);
 const kenBefore=universalBp(packs,opened,opened.players[0].front[0]);
 const yamaBefore=universalBp(packs,opened,opened.players[0].front[1]);
 const skipped=dispatchUniversalAction(packs,opened,{type:'chooseOwnBuff',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(packs,skipped,skipped.players[0].front[0]),kenBefore);
 const named=dispatchUniversalAction(packs,opened,legalUniversalActions(packs,opened).find(a=>a.type==='chooseOwnBuff'&&a.uid===ken.uid));
 assert.equal(universalBp(packs,named,named.players[0].front[0]),kenBefore+2000);
 const plain=main(yumi,29064);
 put(plain.s,0,'BLC-1-094','energy',0);
 put(plain.s,0,'BLC-4-076','energy',1);
 const other=put(plain.s,0,'BLC-1-091','front',0);
 const ikkaku=put(plain.s,0,'BLC-2-071','front',1);
 const entering=take(plain.s,0,'BLC-4-063');
 plain.s.players[0].hand.push(entering);
 const again=dispatchUniversalAction(plain.packs,plain.s,legalUniversalActions(plain.packs,plain.s).find(a=>a.type==='play'&&a.uid===entering.uid&&a.line==='front'&&a.slot===2));
 const otherBefore=universalBp(plain.packs,again,again.players[0].front[0]);
 const ikkakuBefore=universalBp(plain.packs,again,again.players[0].front[1]);
 const raised=dispatchUniversalAction(plain.packs,again,legalUniversalActions(plain.packs,again).find(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid));
 assert.equal(universalBp(plain.packs,raised,raised.players[0].front[0]),otherBefore+1000);
 assert.equal(universalBp(plain.packs,raised,raised.players[0].front[1]),ikkakuBefore);
 const quiet=main(yumi,29065);
 put(quiet.s,0,'BLC-1-094','energy',0);
 put(quiet.s,0,'BLC-4-076','energy',1);
 const alone=take(quiet.s,0,'BLC-4-063');
 quiet.s.players[0].hand.push(alone);
 const none=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front'));
 assert.equal(none.pending,null);
 assert.equal(none.players[0].front.some(c=>c?.uid===alone.uid),true);
 assert.equal(assertUniversalMatch(packs,named),true);
 assert.equal(assertUniversalMatch(plain.packs,raised),true);
 assert.equal(assertUniversalMatch(quiet.packs,none),true);
});

test('BLC-4-064 reveals one green event or one green field from the top three',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-064');
 assert.equal(printed.effect,'登場時：查看牌庫頂3張，最多公開1張綠色事件卡或綠色場地卡加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,0);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-4-064'];
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 const groups=[
  {logic:'all',filters:[{field:'color',value:'green'},{field:'type',value:'event'}]},
  {logic:'all',filters:[{field:'color',value:'green'},{field:'type',value:'field'}]}
 ];
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,groups}]);
 const deck=realDeck(['BLC-4-064','BLC-1-095','BLC-4-076','BLC-1-080','BLC-1-094','BLC-1-068','BLC-1-070','BLC-1-078','BLC-1-087','BLC-2-067','BLC-3-007','BLC-4-060','BLC-1-079'],'green');
 const {packs,s}=main(deck,29064);
 const [event,field,character]=setTop(s,0,['BLC-1-095','BLC-4-076','BLC-1-080']);
 const self=take(s,0,'BLC-4-064');
 s.players[0].hand.push(self);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(packs,s,play);
 assert.equal(played.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(played.pending.groups,groups);
 const pub=universalPublicView(packs,played,1);
 assert.deepEqual(pub.pending,{kind:'effect-top-filter-choice',player:0});
 assert.equal(pub.players[0].hand,null);
 assert.equal(pub.publicReveals.some(r=>[event.uid,field.uid,character.uid].includes(r.uid)),false);
 assert.equal(universalPrivateChoices(packs,played,1),null);
 const shown=universalPrivateChoices(packs,played,0).options.filter(o=>o.card).map(o=>o.card.cardId);
 assert.deepEqual(shown.sort(),['BLC-1-095','BLC-4-076'].sort());
 const choices=legalUniversalActions(packs,played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(event.uid),true);
 assert.equal(chosen(field.uid),true);
 assert.equal(chosen(character.uid),false);
 const forged=structuredClone(played);
 forged.pending.groups[1].filters[1].value='character';
 assert.throws(()=>assertUniversalMatch(packs,forged),/grouped top-filter/);
 const missed=orderBottom(packs,dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:null}));
 assert.equal(missed.pending,null);
 assert.equal(missed.players[0].hand.some(c=>[event.uid,field.uid,character.uid].includes(c.uid)),false);
 assert.equal(missed.publicReveals.some(r=>r.kind==='searched-to-hand'),false);
 assert.deepEqual(missed.players[0].deck.slice(-3).map(c=>c.uid).sort(),[event.uid,field.uid,character.uid].sort());
 const taken=dispatchUniversalAction(packs,played,{type:'chooseTopFiltered',uid:event.uid});
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-1-095');
 assert.equal(taken.publicReveals.filter(r=>r.kind==='searched-to-hand').length,1);
 assert.equal(taken.pending.discardAfter,true);
 assert.equal(taken.pending.uids.includes(event.uid),false);
 const ordered=orderBottom(packs,taken);
 assert.equal(ordered.pending.kind,'effect-discard');
 const spare=ordered.players[0].hand.find(c=>c.uid!==event.uid);
 const done=dispatchUniversalAction(packs,ordered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(done.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(done.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(done.players[0].deck.slice(-2).map(c=>c.uid).sort(),[field.uid,character.uid].sort());
 const again=main(deck,29066);
 const [onlyChar,field2,event2]=setTop(again.s,0,['BLC-1-080','BLC-4-076','BLC-1-095']);
 const self2=take(again.s,0,'BLC-4-064');
 again.s.players[0].hand.push(self2);
 const opened=dispatchUniversalAction(again.packs,again.s,legalUniversalActions(again.packs,again.s).find(a=>a.type==='play'&&a.uid===self2.uid&&a.line==='front'));
 const legal2=legalUniversalActions(again.packs,opened);
 assert.equal(legal2.some(a=>a.uid===onlyChar.uid),false);
 assert.equal(legal2.some(a=>a.uid===event2.uid),true);
 const got=dispatchUniversalAction(again.packs,opened,legal2.find(a=>a.type==='chooseTopFiltered'&&a.uid===field2.uid));
 assert.equal(got.publicReveals.at(-1).cardId,'BLC-4-076');
 const dumped=orderBottom(again.packs,got);
 const spare2=dumped.players[0].hand.find(c=>c.uid!==field2.uid);
 const finished=dispatchUniversalAction(again.packs,dumped,{type:'chooseDiscard',uid:spare2.uid});
 assert.equal(finished.players[0].hand.some(c=>c.uid===field2.uid),true);
 assert.deepEqual(finished.players[0].deck.slice(-2).map(c=>c.uid).sort(),[onlyChar.uid,event2.uid].sort());
 const none=main(deck,29067);
 const chars=setTop(none.s,0,['BLC-1-080','BLC-1-068','BLC-1-070']);
 const self3=take(none.s,0,'BLC-4-064');
 none.s.players[0].hand.push(self3);
 const opened3=dispatchUniversalAction(none.packs,none.s,legalUniversalActions(none.packs,none.s).find(a=>a.type==='play'&&a.uid===self3.uid&&a.line==='front'));
 assert.equal(opened3.pending.kind,'effect-top-order');
 const closed=orderBottom(none.packs,opened3);
 assert.equal(closed.pending,null);
 assert.equal(closed.players[0].hand.some(c=>chars.some(x=>x.uid===c.uid)),false);
 const dry=main(deck,29068);
 const self4=take(dry.s,0,'BLC-4-064');
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 dry.s.players[0].hand.push(self4);
 const quietPlay=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===self4.uid&&a.line==='front'));
 assert.equal(quietPlay.pending,null);
 assert.equal(quietPlay.players[0].front.some(c=>c?.uid===self4.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,done),true);
 assert.equal(assertUniversalMatch(again.packs,finished),true);
 assert.equal(assertUniversalMatch(none.packs,closed),true);
 assert.equal(assertUniversalMatch(dry.packs,quietPlay),true);
});

test('BLC-2-005 rests an opposing front character only after a character effect enters it',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-005');
 assert.equal(printed.effect,'登場：若透過己方角色的效果登場，可將最多 1 個敵方前線角色轉為 REST。');
 assert.equal(printed.traits,'護廷十三隊／殭屍');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-2-005'];
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊／殭屍']);
 assert.deepEqual(card.effects.onPlay,[{op:'restOppFrontOne',optional:true,entry:'ownCharacter'}]);
 const deck=realDeck(['BLC-2-005','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-001','BLC-1-021','BLC-4-001','BLC-1-006','BLC-1-023','BLC-1-032','BLC-2-003','BLC-1-008','BLC-1-016'],'yellow');
 const {packs,s}=main(deck,29005);
 put(s,0,'BLC-1-002','energy',0);
 put(s,0,'BLC-1-012','energy',1);
 put(s,0,'BLC-1-018','energy',2);
 const foe=put(s,1,'BLC-1-001','front',0,true);
 const self=take(s,0,'BLC-2-005');
 s.players[0].hand.push(self);
 const paid=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(paid.pending,null);
 assert.equal(paid.players[1].front.find(c=>c?.uid===foe.uid).ready,true);
 assert.equal(paid.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 const hit={id:card.id,name:card.name,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,traits:[...card.traits],trigger:card.trigger,
  implementation:'dsl',effects:card.effects};
 const deploy={op:'deployOwnHandRest',type:'character',color:'yellow',energy:3,ap:1,max:1};
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:2000,
  gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-own-character',cards:[
  hit,unit('SRC',{effects:{onPlay:[deploy]}}),
  unit('EVT',{type:'event',bp:0,gen:0,effects:{onPlay:[deploy]}}),
  unit('FLD',{type:'field',bp:0,effects:{onPlay:[deploy]}}),
  unit('FOE',{implementation:'vanilla'}),
  ...['A','B','C','D','E','F','G','H'].map(id=>unit(id,{implementation:'vanilla'}))
 ]});
 const ids=['BLC-2-005','SRC','EVT','FLD','FOE','A','B','C','D','E','F','G','H'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 function boot(seed){
  let state=newUniversalMatch(both,{decks:[counts,counts],seed,first:0});
  for(let n=0;n<8&&state.phase!=='main';n++)
   state=dispatchUniversalAction(both,state,{type:'next'});
  return state;
 }
 function lift(state,p,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=state.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 function enter(seed,sourceId){
  let state=boot(seed);
  const rival=lift(state,1,'FOE');
  rival.ready=true;rival.fieldEntryStamp=state.nextFieldEntryStamp++;
  state.players[1].front[0]=rival;
  const child=lift(state,0,'BLC-2-005');
  const source=lift(state,0,sourceId);
  state.players[0].hand.push(child,source);
  const action=legalUniversalActions(both,state).find(a=>a.uid===source.uid&&!a.replaceUid&&
   (sourceId==='EVT'?a.type==='event':a.type==='play'&&a.line===(sourceId==='FLD'?'energy':'front')));
  assert.ok(action,sourceId);
  const opened=dispatchUniversalAction(both,state,action);
  assert.equal(opened.pending.kind,'effect-hand-rest');
  const seat=legalUniversalActions(both,opened).find(a=>a.type==='chooseHandRest'&&a.uid===child.uid&&a.line==='front');
  assert.ok(seat,sourceId);
  const entered=dispatchUniversalAction(both,opened,seat);
  return {entered,rival,child};
 }
 const byCharacter=enter(290051,'SRC');
 assert.equal(byCharacter.entered.pending.kind,'effect-rest-bp');
 assert.deepEqual(universalPublicView(both,byCharacter.entered,1).pending,{kind:'effect-rest-bp',player:0});
 const restLegal=legalUniversalActions(both,byCharacter.entered);
 assert.equal(restLegal.some(a=>a.type==='chooseRestBp'&&a.uid===null),true);
 assert.equal(restLegal.some(a=>a.type==='chooseRestBp'&&a.uid===byCharacter.rival.uid),true);
 const skipped=dispatchUniversalAction(both,byCharacter.entered,restLegal.find(a=>a.uid===null));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front[0].ready,true);
 const again=enter(290052,'SRC');
 const rested=dispatchUniversalAction(both,again.entered,legalUniversalActions(both,again.entered).find(a=>a.type==='chooseRestBp'&&a.uid===again.rival.uid));
 assert.equal(rested.pending,null);
 assert.equal(rested.players[1].front.find(c=>c?.uid===again.rival.uid).ready,false);
 assert.equal(rested.players[0].front.find(c=>c?.uid===again.child.uid).ready,false);
 const byEvent=enter(290053,'EVT');
 assert.equal(byEvent.entered.pending,null);
 assert.equal(byEvent.entered.players[1].front[0].ready,true);
 assert.equal(byEvent.entered.players[0].front.some(c=>c?.uid===byEvent.child.uid),true);
 const byField=enter(290054,'FLD');
 assert.equal(byField.entered.pending,null);
 assert.equal(byField.entered.players[1].front[0].ready,true);
 let quiet=boot(290055);
 const lonely=lift(quiet,0,'BLC-2-005');
 const source=lift(quiet,0,'SRC');
 quiet.players[0].hand.push(lonely,source);
 const played=dispatchUniversalAction(both,quiet,legalUniversalActions(both,quiet).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 const seated=dispatchUniversalAction(both,played,legalUniversalActions(both,played).find(a=>a.type==='chooseHandRest'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(seated.pending,null);
 assert.equal(seated.players[0].front.some(c=>c?.uid===lonely.uid),true);
 aiOk(both,byCharacter.entered);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(both,rested),true);
 assert.equal(assertUniversalMatch(both,byEvent.entered),true);
 assert.equal(assertUniversalMatch(both,byField.entered),true);
 assert.equal(assertUniversalMatch(both,seated),true);
});

test('BLC-2-006 draws only after a character effect, then pays 1 AP for this-turn Impact 1',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-006');
 assert.equal(printed.effect,'登場：若透過己方角色的效果登場，抽 1 張。主要階段・每回合 1 次：支付 1 AP，使此角色本回合獲得 Impact 1。');
 assert.equal(printed.traits,'星十字騎士團／殭屍');
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-2-006'];
 assert.deepEqual(card.traits,['星十字騎士團／殭屍']);
 assert.deepEqual(card.effects.onPlay,[{op:'draw',count:1,entry:'ownCharacter'}]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'grantSelfImpactThisTurn',amount:1}]});
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.equal(card.printedImpact||0,0);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-draw-entry',cards:[{...bare,effects:{onPlay:[{op:'draw',count:1,entry:'paidPlay'}]}}]}),/invalid own-effect draw gate/);
 assert.throws(()=>createUniversalPack({id:'bad-draw-event',cards:[{...bare,type:'event',bp:0,gen:0,effects:{onPlay:[{op:'draw',count:1,entry:'ownCharacter'}]}}]}),/only a character onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-impact-amount',cards:[{...bare,mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'grantSelfImpactThisTurn',amount:2}]}}]}),/invalid this-turn impact/);
 const deck=realDeck(['BLC-2-006','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021','BLC-1-001','BLC-4-001','BLC-1-006','BLC-1-023','BLC-1-032','BLC-2-003','BLC-1-008','BLC-1-016'],'yellow');
 const paidMatch=main(deck,29006);
 put(paidMatch.s,0,'BLC-1-002','energy',0);
 put(paidMatch.s,0,'BLC-1-012','energy',1);
 put(paidMatch.s,0,'BLC-1-018','energy',2);
 put(paidMatch.s,0,'BLC-1-021','energy',3);
 const self=take(paidMatch.s,0,'BLC-2-006');
 const top=paidMatch.s.players[0].deck[0].uid;
 const handBefore=paidMatch.s.players[0].hand.length;
 paidMatch.s.players[0].hand.push(self);
 const paid=dispatchUniversalAction(paidMatch.packs,paidMatch.s,legalUniversalActions(paidMatch.packs,paidMatch.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].deck[0].uid,top);
 assert.equal(paid.players[0].hand.length,handBefore);
 assert.equal(paid.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(universalImpact(paidMatch.packs,paid,paid.players[0].front.find(c=>c?.uid===self.uid)),0);
 assert.equal(legalUniversalActions(paidMatch.packs,paid).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 paid.players[0].apCards[0].ready=true;
 const act={type:'activate',uid:self.uid,mode:'oncePay'};
 const granted=dispatchUniversalAction(paidMatch.packs,paid,act);
 const body=granted.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(universalImpact(paidMatch.packs,granted,body),1);
 assert.equal(body.ready,false);
 assert.equal(body.impactGranted.turn,granted.turn);
 assert.equal(granted.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(legalUniversalActions(paidMatch.packs,granted).some(a=>a.uid===self.uid&&a.mode==='oncePay'),false);
 assert.throws(()=>dispatchUniversalAction(paidMatch.packs,granted,act),/not currently legal/);
 const energyMatch=main(deck,290061);
 const lined=put(energyMatch.s,0,'BLC-2-006','energy',0,true);
 const deckBefore=energyMatch.s.players[0].deck.length;
 const fromEnergy=dispatchUniversalAction(energyMatch.packs,energyMatch.s,{type:'activate',uid:lined.uid,mode:'oncePay'});
 const stayed=fromEnergy.players[0].energy.find(c=>c?.uid===lined.uid);
 assert.equal(universalImpact(energyMatch.packs,fromEnergy,stayed),1);
 assert.equal(stayed.ready,true);
 assert.equal(fromEnergy.players[0].deck.length,deckBefore);
 assert.equal(fromEnergy.players[0].apCards.filter(c=>c.ready).length,0);
 let later=fromEnergy;
 for(let n=0;n<8&&universalImpact(energyMatch.packs,later,later.players[0].energy.find(c=>c?.uid===lined.uid))===1;n++)
  later=dispatchUniversalAction(energyMatch.packs,later,{type:'next'});
 assert.equal(universalImpact(energyMatch.packs,later,later.players[0].energy.find(c=>c?.uid===lined.uid)),0);
 const broke=main(deck,290062);
 const resting=put(broke.s,0,'BLC-2-006','front',0,false);
 for(const ap of broke.s.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(broke.packs,broke.s).some(a=>a.mode==='oncePay'),false);
 assert.throws(()=>dispatchUniversalAction(broke.packs,broke.s,{type:'activate',uid:resting.uid,mode:'oncePay'}),/not currently legal/);
 broke.s.players[0].apCards[0].inPlay=true;
 broke.s.players[0].apCards[0].ready=true;
 const fromRest=dispatchUniversalAction(broke.packs,broke.s,{type:'activate',uid:resting.uid,mode:'oncePay'});
 assert.equal(fromRest.players[0].front.find(c=>c?.uid===resting.uid).ready,false);
 assert.equal(universalImpact(broke.packs,fromRest,fromRest.players[0].front.find(c=>c?.uid===resting.uid)),1);
 const hit={id:card.id,name:card.name,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,traits:[...card.traits],trigger:card.trigger,
  triggerEffect:card.triggerEffect,mainAbility:card.mainAbility,implementation:'dsl',effects:card.effects};
 const deploy={op:'deployOwnHandRest',type:'character',color:'yellow',energy:4,ap:1,max:1};
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:2000,
  gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-own-character-draw',cards:[
  hit,unit('SRC',{effects:{onPlay:[deploy]}}),
  unit('EVT',{type:'event',bp:0,gen:0,effects:{onPlay:[deploy]}}),
  unit('FLD',{type:'field',bp:0,effects:{onPlay:[deploy]}}),
  ...['A','B','C','D','E','F','G','H','I'].map(id=>unit(id,{implementation:'vanilla'}))
 ]});
 const ids=['BLC-2-006','SRC','EVT','FLD','A','B','C','D','E','F','G','H','I'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 function boot(seed){
  let state=newUniversalMatch(both,{decks:[counts,counts],seed,first:0});
  for(let n=0;n<8&&state.phase!=='main';n++)
   state=dispatchUniversalAction(both,state,{type:'next'});
  return state;
 }
 function lift(state,p,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=state.players[p][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 function enter(seed,sourceId){
  let state=boot(seed);
  const child=lift(state,0,'BLC-2-006');
  const source=lift(state,0,sourceId);
  state.players[0].hand.push(child,source);
  const action=legalUniversalActions(both,state).find(a=>a.uid===source.uid&&!a.replaceUid&&
   (sourceId==='EVT'?a.type==='event':a.type==='play'&&a.line===(sourceId==='FLD'?'energy':'front')));
  assert.ok(action,sourceId);
  const opened=dispatchUniversalAction(both,state,action);
  assert.equal(opened.pending.kind,'effect-hand-rest');
  const seat=legalUniversalActions(both,opened).find(a=>a.type==='chooseHandRest'&&a.uid===child.uid&&a.line==='front');
  const beforeDeck=opened.players[0].deck.length;
  const drawn=opened.players[0].deck[0]?.uid||null;
  const beforeHand=opened.players[0].hand.length;
  const entered=dispatchUniversalAction(both,opened,seat);
  return {entered,child,beforeDeck,beforeHand,drawn};
 }
 const byCharacter=enter(290063,'SRC');
 assert.equal(byCharacter.entered.pending,null);
 assert.equal(byCharacter.entered.players[0].deck.length,byCharacter.beforeDeck-1);
 assert.equal(byCharacter.entered.players[0].hand.length,byCharacter.beforeHand);
 assert.equal(byCharacter.entered.players[0].hand.some(c=>c.uid===byCharacter.drawn),true);
 assert.equal(universalPublicView(both,byCharacter.entered,1).players[0].hand,null);
 assert.equal(universalImpact(both,byCharacter.entered,byCharacter.entered.players[0].front.find(c=>c?.uid===byCharacter.child.uid)),0);
 assert.equal(byCharacter.entered.mainAbilityUsedUids.includes(byCharacter.child.uid),false);
 assert.equal(legalUniversalActions(both,byCharacter.entered).some(a=>a.mode==='oncePay'&&a.uid===byCharacter.child.uid),false);
 byCharacter.entered.players[0].apCards[0].inPlay=true;
 byCharacter.entered.players[0].apCards[0].ready=true;
 const linked=dispatchUniversalAction(both,byCharacter.entered,{type:'activate',uid:byCharacter.child.uid,mode:'oncePay'});
 assert.equal(linked.players[0].deck.length,byCharacter.entered.players[0].deck.length);
 assert.equal(universalImpact(both,linked,linked.players[0].front.find(c=>c?.uid===byCharacter.child.uid)),1);
 assert.equal(legalUniversalActions(both,linked).some(a=>a.mode==='oncePay'&&a.uid===byCharacter.child.uid),false);
 const byEvent=enter(290064,'EVT');
 assert.equal(byEvent.entered.pending,null);
 assert.equal(byEvent.entered.players[0].deck.length,byEvent.beforeDeck);
 assert.equal(byEvent.entered.players[0].hand.length,byEvent.beforeHand-1);
 assert.equal(byEvent.entered.players[0].front.some(c=>c?.uid===byEvent.child.uid),true);
 const byField=enter(290065,'FLD');
 assert.equal(byField.entered.pending,null);
 assert.equal(byField.entered.players[0].deck.length,byField.beforeDeck);
 assert.equal(byField.entered.players[0].hand.length,byField.beforeHand-1);
 let quiet=boot(290066);
 const lonely=lift(quiet,0,'BLC-2-006');
 const source=lift(quiet,0,'SRC');
 quiet.players[0].outside.push(...quiet.players[0].deck.splice(0));
 quiet.players[0].hand.push(lonely,source);
 const opened=dispatchUniversalAction(both,quiet,legalUniversalActions(both,quiet).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'));
 const seated=dispatchUniversalAction(both,opened,legalUniversalActions(both,opened).find(a=>a.type==='chooseHandRest'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(seated.pending,null);
 assert.equal(seated.players[0].deck.length,0);
 assert.equal(seated.players[0].front.some(c=>c?.uid===lonely.uid),true);
 const color=main(deck,290067);
 const attacker=put(color.s,0,'BLC-1-001','front',0,true);
 put(color.s,1,'BLC-1-002','front',0,true);
 const trigger=take(color.s,1,'BLC-2-006');
 const buried=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buried);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 assert.equal(revealed.phase,'attack');
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='skip'),true);
 assert.equal(choices.some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),true);
 assert.equal(choices.some(a=>a.mode==='color'),false);
 assert.equal(choices.some(a=>a.uid===color.s.players[1].front[0].uid),false);
 const skipped=dispatchUniversalAction(color.packs,revealed,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.equal(skipped.players[1].outside.some(c=>c.uid===trigger.uid),true);
 assert.equal(universalImpact(color.packs,skipped,skipped.players[0].front.find(c=>c?.uid===attacker.uid)),0);
 let again=color.s;
 again=dispatchUniversalAction(color.packs,structuredClone(revealed),{type:'chooseTrigger',mode:'colorRestSkip',uid:attacker.uid},{actor:1});
 assert.equal(again.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.deepEqual(universalPublicView(color.packs,again,1).players[0].front.find(c=>c?.uid===attacker.uid).restrictions,[{kind:'skipNextActive',until:null}]);
 assert.equal(again.players[1].hand.some(c=>c.uid===trigger.uid),false);
 assert.equal(again.players[1].outside.some(c=>c.uid===trigger.uid),true);
 aiOk(paidMatch.packs,paid);
 aiOk(color.packs,revealed);
 assert.equal(assertUniversalMatch(paidMatch.packs,granted),true);
 assert.equal(assertUniversalMatch(energyMatch.packs,later),true);
 assert.equal(assertUniversalMatch(broke.packs,fromRest),true);
 assert.equal(assertUniversalMatch(both,linked),true);
 assert.equal(assertUniversalMatch(both,byEvent.entered),true);
 assert.equal(assertUniversalMatch(both,byField.entered),true);
 assert.equal(assertUniversalMatch(both,seated),true);
 assert.equal(assertUniversalMatch(color.packs,again),true);
});

test('BLC-2-058 peeks the top card, then may remove one Squad Zero hand card for BP+2000',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-058');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 1 張，將其放至牌堆頂或牌堆底。攻擊時：可將手牌中 1 張具有「零番隊」特徵的卡除外；成功時此角色本回合 BP +2000。');
 assert.equal(printed.traits,'零番隊');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-2-058'];
 assert.deepEqual(card.traits,['零番隊']);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,2);
 assert.deepEqual(card.effects.onPlay,[{op:'peekTopOrBottom'}]);
 assert.deepEqual(card.effects.onAttack,[{op:'optionalRemoveHandThen',zone:'removed',filter:{field:'trait',value:'零番隊'},then:[{op:'buffSelf',bp:2000}]}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const removal={op:'optionalRemoveHandThen',zone:'removed',filter:{field:'trait',value:'零番隊'},then:[{op:'buffSelf',bp:2000}]};
 assert.throws(()=>createUniversalPack({id:'bad-remove-play',cards:[{...bare,effects:{onPlay:[removal]}}]}),/only a lone character onAttack/);
 assert.throws(()=>createUniversalPack({id:'bad-remove-zone',cards:[{...bare,effects:{onAttack:[{...removal,zone:'outside'}]}}]}),/invalid optional hand removal/);
 const deck=realDeck(['BLC-2-058','BLC-2-056','BLC-2-059','BLC-2-055','BLC-1-034','BLC-1-107','BLC-4-046','BLC-1-039','BLC-1-045','BLC-1-048','BLC-1-051','BLC-4-048','BLC-4-052'],'purple');
 const opened=main(deck,29058);
 put(opened.s,0,'BLC-2-056','energy',0);
 put(opened.s,0,'BLC-2-059','energy',1);
 put(opened.s,0,'BLC-2-055','energy',2);
 const self=take(opened.s,0,'BLC-2-058');
 const top=opened.s.players[0].deck[0];
 opened.s.players[0].hand.push(self);
 const played=dispatchUniversalAction(opened.packs,opened.s,legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.pending.kind,'private-top-place');
 assert.deepEqual(universalPublicView(opened.packs,played,1).pending,{kind:'private-top-place',player:0});
 assert.equal(universalPrivateChoices(opened.packs,played,1),null);
 assert.equal(universalPrivateChoices(opened.packs,played,0).options.some(o=>o.card.cardId===top.cardId),true);
 const placed=dispatchUniversalAction(opened.packs,played,legalUniversalActions(opened.packs,played).find(a=>a.type==='chooseTopCard'&&a.mode==='bottom'));
 assert.equal(placed.pending,null);
 assert.equal(placed.players[0].deck.at(-1).uid,top.uid);
 assert.equal(placed.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(universalBp(opened.packs,placed,placed.players[0].front.find(c=>c?.uid===self.uid)),2000);
 placed.players[0].front.find(c=>c?.uid===self.uid).ready=true;
 const squad=take(placed,0,'BLC-2-056');
 const plain=take(placed,0,'BLC-1-034');
 placed.players[0].hand.push(squad,plain);
 put(placed,1,'BLC-1-039','front',0,true);
 let attacking=placed;
 while(attacking.phase!=='attack')attacking=dispatchUniversalAction(opened.packs,attacking,{type:'next'});
 const declared=dispatchUniversalAction(opened.packs,attacking,{type:'attack',uid:self.uid});
 assert.equal(declared.pending.kind,'effect-remove-hand');
 const pay=legalUniversalActions(opened.packs,declared);
 assert.equal(pay.some(a=>a.type==='chooseRemoveHand'&&a.uid===null),true);
 assert.equal(pay.some(a=>a.type==='chooseRemoveHand'&&a.uid===squad.uid),true);
 assert.equal(pay.some(a=>a.uid===plain.uid),false);
 assert.equal(universalPublicView(opened.packs,declared,1).players[0].hand,null);
 assert.equal(universalPrivateChoices(opened.packs,declared,1),null);
 assert.equal(universalPrivateChoices(opened.packs,declared,0).options.some(o=>o.card?.cardId==='BLC-2-056'),true);
 const skipped=dispatchUniversalAction(opened.packs,declared,pay.find(a=>a.uid===null));
 assert.equal(skipped.players[0].hand.some(c=>c.uid===squad.uid),true);
 assert.equal(skipped.players[0].removed.some(c=>c.uid===squad.uid),false);
 assert.equal(universalBp(opened.packs,skipped,skipped.players[0].front.find(c=>c?.uid===self.uid)),2000);
 const again=dispatchUniversalAction(opened.packs,structuredClone(declared),pay.find(a=>a.uid===squad.uid));
 assert.equal(again.players[0].removed.some(c=>c.uid===squad.uid),true);
 assert.equal(again.players[0].outside.some(c=>c.uid===squad.uid),false);
 assert.equal(again.players[0].hand.some(c=>c.uid===squad.uid),false);
 assert.equal(universalBp(opened.packs,again,again.players[0].front.find(c=>c?.uid===self.uid)),4000);
 assert.equal(again.pending.kind,'block');
 const quiet=main(deck,290581);
 const lone=put(quiet.s,0,'BLC-2-058','front',0,true);
 for(const zone of ['hand']){
  const kept=[],moved=[];
  for(const c of quiet.s.players[0][zone])(bleach.cards[c.cardId].traits.includes('零番隊')?moved:kept).push(c);
  quiet.s.players[0].hand=kept;
  quiet.s.players[0].outside.push(...moved);
 }
 put(quiet.s,1,'BLC-1-039','front',0,true);
 let bareAttack=quiet.s;
 while(bareAttack.phase!=='attack')bareAttack=dispatchUniversalAction(quiet.packs,bareAttack,{type:'next'});
 const noPay=dispatchUniversalAction(quiet.packs,bareAttack,{type:'attack',uid:lone.uid});
 assert.equal(noPay.pending.kind,'block');
 assert.equal(universalBp(quiet.packs,noPay,noPay.players[0].front.find(c=>c?.uid===lone.uid)),2000);
 const nextTurn=structuredClone(again);
 assert.equal(universalBp(opened.packs,nextTurn,nextTurn.players[0].front.find(c=>c?.uid===self.uid)),4000);
 nextTurn.turn+=1;
 assert.equal(universalBp(opened.packs,nextTurn,nextTurn.players[0].front.find(c=>c?.uid===self.uid)),2000);
 aiOk(opened.packs,played);
 aiOk(opened.packs,declared);
 assert.equal(assertUniversalMatch(opened.packs,placed),true);
 assert.equal(assertUniversalMatch(opened.packs,skipped),true);
 assert.equal(assertUniversalMatch(opened.packs,again),true);
 assert.equal(assertUniversalMatch(quiet.packs,noPay),true);
});

test('BLC-2-033 draws and discards, or only draws when a front character has printed AP 2',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-033');
 assert.equal(printed.effect,'登場：抽 1 張，再將 1 張手牌送至場外；若己方前線有原始 AP 消耗 2 以上角色，可改為只抽 1 張。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-2-033'];
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 const when={kind:'ownPrintedApAtLeast',turn:'any',zone:'front',excludeSelf:false,minAp:2};
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1,when}}]);
 assert.equal(bleach.cards['BLC-2-018'].mainAbility.then[0].instead,undefined);
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const onPlay=[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1,when}}];
 assert.throws(()=>createUniversalPack({id:'bad-instead-count',cards:[{...bare,effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:2,when}}]}}]}),/invalid mandatory draw\/discard profile/);
 assert.throws(()=>createUniversalPack({id:'bad-instead-when',cards:[{...bare,effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1}}]}}]}),/invalid mandatory draw\/discard profile/);
 const deck=realDeck(['BLC-2-033','BLC-2-025','BLC-2-031','BLC-2-036','BLC-4-022','BLC-2-018','BLC-2-016','BLC-4-023','BLC-2-022','BLC-2-040','BLC-2-042','BLC-4-035','BLC-2-021'],'blue');
 function pay(s){
  put(s,0,'BLC-2-025','energy',0);
  put(s,0,'BLC-2-031','energy',1);
  put(s,0,'BLC-2-036','energy',2);
 }
 function play(match){
  const self=take(match.s,0,'BLC-2-033');
  const top=match.s.players[0].deck[0];
  match.s.players[0].hand.push(self);
  const beforeHand=match.s.players[0].hand.length;
  const beforeDeck=match.s.players[0].deck.length;
  const played=dispatchUniversalAction(match.packs,match.s,legalUniversalActions(match.packs,match.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
  assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
  return {self,top,beforeHand,beforeDeck,played};
 }
 function discardTop(packs,played,top){
  assert.equal(played.pending.kind,'effect-discard');
  assert.equal(played.players[0].hand.some(c=>c.uid===top.uid),true);
  const done=dispatchUniversalAction(packs,played,legalUniversalActions(packs,played).find(a=>a.type==='chooseDiscard'&&a.uid===top.uid));
  assert.equal(done.pending,null);
  assert.equal(done.players[0].outside.some(c=>c.uid===top.uid),true);
  assert.equal(done.players[0].removed.some(c=>c.uid===top.uid),false);
  assert.equal(done.players[0].hand.some(c=>c.uid===top.uid),false);
  return done;
 }
 const alone=main(deck,29033);
 pay(alone.s);
 const closed=play(alone);
 assert.equal(closed.played.pending.kind,'effect-discard');
 assert.equal(closed.played.players[0].deck.length,closed.beforeDeck-1);
 assert.equal(closed.played.players[0].hand.length,closed.beforeHand);
 const closedDone=discardTop(alone.packs,closed.played,closed.top);
 assert.equal(closedDone.players[0].hand.length,closed.beforeHand-1);
 const energyGate=main(deck,290331);
 pay(energyGate.s);
 put(energyGate.s,0,'BLC-4-022','energy',3,false);
 const fromEnergy=play(energyGate);
 assert.equal(fromEnergy.played.pending.kind,'effect-discard');
 const lowFront=main(deck,290332);
 pay(lowFront.s);
 const mate=put(lowFront.s,0,'BLC-2-016','front',0,true);
 mate.buffs=[{bp:9000,untilTurn:lowFront.s.turn}];
 assert.equal(universalBp(lowFront.packs,lowFront.s,mate),bleach.cards['BLC-2-016'].bp+9000);
 const buffed=play(lowFront);
 assert.equal(buffed.played.pending.kind,'effect-discard');
 const open=main(deck,290333);
 pay(open.s);
 const heavy=put(open.s,0,'BLC-4-022','front',0,false);
 assert.equal(heavy.ready,false);
 const choice=play(open);
 assert.equal(choice.played.pending.kind,'effect-draw-instead');
 assert.equal(choice.played.players[0].deck[0].uid,choice.top.uid);
 assert.equal(choice.played.players[0].hand.some(c=>c.uid===choice.top.uid),false);
 assert.equal(choice.played.players[0].hand.length,choice.beforeHand-1);
 assert.deepEqual(universalPublicView(open.packs,choice.played,1).pending,{kind:'effect-draw-instead',player:0});
 assert.equal(universalPrivateChoices(open.packs,choice.played,0),null);
 assert.equal(universalPrivateChoices(open.packs,choice.played,1),null);
 const modes=legalUniversalActions(open.packs,choice.played);
 assert.deepEqual(modes.map(a=>a.mode),['discard','draw']);
 const drew=dispatchUniversalAction(open.packs,structuredClone(choice.played),modes.find(a=>a.mode==='draw'));
 assert.equal(drew.pending,null);
 assert.equal(drew.players[0].hand.some(c=>c.uid===choice.top.uid),true);
 assert.equal(drew.players[0].outside.some(c=>c.uid===choice.top.uid),false);
 assert.equal(drew.players[0].deck.length,choice.beforeDeck-1);
 assert.equal(drew.players[0].hand.length,choice.beforeHand);
 const mid=dispatchUniversalAction(open.packs,structuredClone(choice.played),modes.find(a=>a.mode==='discard'));
 assert.equal(mid.pending.kind,'effect-discard');
 assert.equal(mid.players[0].hand.some(c=>c.uid===choice.top.uid),true);
 const tossed=dispatchUniversalAction(open.packs,mid,legalUniversalActions(open.packs,mid).find(a=>a.type==='chooseDiscard'&&a.uid===choice.top.uid));
 assert.equal(tossed.players[0].outside.some(c=>c.uid===choice.top.uid),true);
 assert.equal(tossed.players[0].removed.some(c=>c.uid===choice.top.uid),false);
 assert.equal(tossed.players[0].hand.length,choice.beforeHand-1);
 const emptyDraw=structuredClone(choice.played);
 emptyDraw.players[0].outside.push(...emptyDraw.players[0].deck.splice(0));
 const nothing=dispatchUniversalAction(open.packs,emptyDraw,legalUniversalActions(open.packs,emptyDraw).find(a=>a.mode==='draw'));
 assert.equal(nothing.pending,null);
 assert.equal(nothing.players[0].deck.length,0);
 assert.equal(nothing.players[0].hand.length,choice.beforeHand-1);
 assert.equal(nothing.players[0].hand.some(c=>c.uid===choice.top.uid),false);
 const emptyDiscard=structuredClone(choice.played);
 emptyDiscard.players[0].outside.push(...emptyDiscard.players[0].deck.splice(0));
 const stillDiscard=dispatchUniversalAction(open.packs,emptyDiscard,legalUniversalActions(open.packs,emptyDiscard).find(a=>a.mode==='discard'));
 assert.equal(stillDiscard.pending.kind,'effect-discard');
 assert.equal(stillDiscard.players[0].deck.length,0);
 assert.equal(stillDiscard.players[0].hand.length,choice.beforeHand-1);
 const held=stillDiscard.players[0].hand[0];
 const emptied=dispatchUniversalAction(open.packs,stillDiscard,legalUniversalActions(open.packs,stillDiscard).find(a=>a.type==='chooseDiscard'&&a.uid===held.uid));
 assert.equal(emptied.players[0].outside.some(c=>c.uid===held.uid),true);
 assert.equal(emptied.players[0].deck.length,0);
 const dropped=structuredClone(choice.played);
 const gone=dropped.players[0].front.find(c=>c?.cardId==='BLC-4-022');
 dropped.players[0].front[dropped.players[0].front.findIndex(c=>c?.uid===gone.uid)]=null;
 dropped.players[0].outside.push(gone);
 assert.equal(assertUniversalMatch(open.packs,dropped),true);
 const only=legalUniversalActions(open.packs,dropped);
 assert.equal(only.some(a=>a.mode==='draw'),false);
 assert.equal(only.some(a=>a.mode==='discard'),true);
 assert.throws(()=>dispatchUniversalAction(open.packs,dropped,{type:'chooseDrawInstead',mode:'draw'}),/not currently legal/);
 const unit=(id,extra)=>({id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-draw-instead',cards:[
  unit('AP2',{ap:2,implementation:'dsl',effects:{onPlay}}),
  unit('AP1',{implementation:'dsl',effects:{onPlay}}),
  ...['A','B','C','D','E','F','G','H','I','J','K'].map(id=>unit(id))
 ]});
 const ids=['AP2','AP1','A','B','C','D','E','F','G','H','I','J','K'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 let selfGate=newUniversalMatch(both,{decks:[counts,counts],seed:290334,first:0});
 for(let n=0;n<8&&selfGate.phase!=='main';n++)
  selfGate=dispatchUniversalAction(both,selfGate,{type:'next'});
 function lift(state,id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=state.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 const ap2=lift(selfGate,'AP2');
 selfGate.players[0].hand.push(ap2);
 selfGate.players[0].apCards[1].inPlay=true;
 selfGate.players[0].apCards[1].ready=true;
 const openedSelf=dispatchUniversalAction(both,selfGate,legalUniversalActions(both,selfGate).find(a=>a.type==='play'&&a.uid===ap2.uid&&a.line==='front'));
 assert.equal(openedSelf.pending.kind,'effect-draw-instead');
 assert.equal(openedSelf.players[0].front.filter(Boolean).length,1);
 let lowSelf=newUniversalMatch(both,{decks:[counts,counts],seed:290335,first:0});
 for(let n=0;n<8&&lowSelf.phase!=='main';n++)
  lowSelf=dispatchUniversalAction(both,lowSelf,{type:'next'});
 const ap1=lift(lowSelf,'AP1');
 lowSelf.players[0].hand.push(ap1);
 const openedLow=dispatchUniversalAction(both,lowSelf,legalUniversalActions(both,lowSelf).find(a=>a.type==='play'&&a.uid===ap1.uid&&a.line==='front'));
 assert.equal(openedLow.pending.kind,'effect-discard');
 aiOk(open.packs,choice.played);
 assert.equal(assertUniversalMatch(alone.packs,closedDone),true);
 assert.equal(assertUniversalMatch(energyGate.packs,fromEnergy.played),true);
 assert.equal(assertUniversalMatch(lowFront.packs,buffed.played),true);
 assert.equal(assertUniversalMatch(open.packs,choice.played),true);
 assert.equal(assertUniversalMatch(open.packs,drew),true);
 assert.equal(assertUniversalMatch(open.packs,tossed),true);
 assert.equal(assertUniversalMatch(open.packs,nothing),true);
 assert.equal(assertUniversalMatch(open.packs,emptied),true);
 assert.equal(assertUniversalMatch(both,openedSelf),true);
 assert.equal(assertUniversalMatch(both,openedLow),true);
});

test('BLC-1-022 reveals the opponent top card, then puts it back or outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-022');
 assert.equal(printed.effect,'登場：敵方公開牌堆頂 1 張；由己方選擇將該卡放回敵方牌堆頂或送至場外。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-1-022'];
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.equal(card.gen,2);
 assert.deepEqual(card.effects.onPlay,[{op:'revealOppTopPlace'}]);
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-reveal-extra',cards:[{...bare,effects:{onPlay:[{op:'revealOppTopPlace',count:1}]}}]}),/invalid revealed opponent top/);
 const deck=realDeck(['BLC-1-022','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021','BLC-1-001','BLC-4-001','BLC-1-006','BLC-1-023','BLC-1-032','BLC-2-003','BLC-1-008','BLC-1-016'],'yellow');
 const opened=main(deck,29022);
 put(opened.s,0,'BLC-1-002','energy',0);
 put(opened.s,0,'BLC-1-012','energy',1);
 put(opened.s,0,'BLC-1-018','energy',2);
 const shown=take(opened.s,1,'BLC-1-021');
 opened.s.players[1].deck.unshift(shown);
 const self=take(opened.s,0,'BLC-1-022');
 opened.s.players[0].hand.push(self);
 const played=dispatchUniversalAction(opened.packs,opened.s,legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.pending.kind,'effect-reveal-opp-top');
 assert.equal(played.players[1].deck[0].uid,shown.uid);
 assert.deepEqual(universalPublicView(opened.packs,played,0).pending,{kind:'effect-reveal-opp-top',player:0});
 assert.deepEqual(universalPublicView(opened.packs,played,1).pending,{kind:'effect-reveal-opp-top',player:0});
 assert.equal(universalPublicView(opened.packs,played,0).publicReveals.some(x=>x.uid===shown.uid&&x.cardId==='BLC-1-021'),true);
 assert.equal(universalPublicView(opened.packs,played,1).publicReveals.some(x=>x.uid===shown.uid&&x.cardId==='BLC-1-021'),true);
 assert.equal(universalPrivateChoices(opened.packs,played,0),null);
 assert.equal(universalPrivateChoices(opened.packs,played,1),null);
 const places=legalUniversalActions(opened.packs,played);
 assert.deepEqual(places.map(a=>a.place),['top','outside']);
 const kept=dispatchUniversalAction(opened.packs,structuredClone(played),places.find(a=>a.place==='top'));
 assert.equal(kept.pending,null);
 assert.equal(kept.players[1].deck[0].uid,shown.uid);
 assert.equal(kept.players[1].outside.some(c=>c.uid===shown.uid),false);
 const sent=dispatchUniversalAction(opened.packs,structuredClone(played),places.find(a=>a.place==='outside'));
 assert.equal(sent.pending,null);
 assert.equal(sent.players[1].outside.some(c=>c.uid===shown.uid),true);
 assert.equal(sent.players[1].deck.some(c=>c.uid===shown.uid),false);
 assert.equal(sent.players[1].removed.some(c=>c.uid===shown.uid),false);
 const quiet=main(deck,290221);
 put(quiet.s,0,'BLC-1-002','energy',0);
 put(quiet.s,0,'BLC-1-012','energy',1);
 put(quiet.s,0,'BLC-1-018','energy',2);
 quiet.s.players[1].outside.push(...quiet.s.players[1].deck.splice(0));
 const lonely=take(quiet.s,0,'BLC-1-022');
 quiet.s.players[0].hand.push(lonely);
 const empty=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(empty.pending,null);
 assert.equal(empty.players[1].deck.length,0);
 assert.equal(empty.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const color=main(deck,290222);
 const attacker=put(color.s,0,'BLC-1-001','front',0,true);
 const trigger=take(color.s,1,'BLC-1-022');
 const buried=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buried);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 assert.equal(revealed.phase,'attack');
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),true);
 const skipped=dispatchUniversalAction(color.packs,structuredClone(revealed),{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(skipped.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.equal(skipped.players[0].front.find(c=>c?.uid===attacker.uid).restrictions,undefined);
 const rested=dispatchUniversalAction(color.packs,structuredClone(revealed),choices.find(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),{actor:1});
 assert.equal(rested.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.deepEqual(universalPublicView(color.packs,rested,1).players[0].front.find(c=>c?.uid===attacker.uid).restrictions,[{kind:'skipNextActive',until:null}]);
 assert.equal(rested.players[1].outside.some(c=>c.uid===trigger.uid),true);
 aiOk(opened.packs,played);
 assert.equal(assertUniversalMatch(opened.packs,played),true);
 assert.equal(assertUniversalMatch(opened.packs,kept),true);
 assert.equal(assertUniversalMatch(opened.packs,sent),true);
 assert.equal(assertUniversalMatch(quiet.packs,empty),true);
 assert.equal(assertUniversalMatch(color.packs,rested),true);
});

test('BLC-2-011 reveals three cards, takes one Bambies trait or Bambi name, and puts the rest outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-011');
 assert.equal(printed.effect,'登場：公開己方牌堆頂 3 張，可將其中最多 1 張具有「邦比愛塔親衛隊」特徵或名為〈邦比愛塔・芭絲塔拜茵〉的卡加入手牌，其餘送至場外。若有卡加入手牌，再將 1 張手牌送至場外。');
 assert.equal(printed.traits,'星十字騎士團／邦比愛塔親衛隊');
 assert.equal(printed.energy,1);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const filters=[
  {field:'trait',value:'邦比愛塔親衛隊'},
  {field:'name',value:'バンビエッタ・バスターバイン'}
 ];
 const card=bleach.cards['BLC-2-011'];
 assert.deepEqual(card.traits,['星十字騎士團／邦比愛塔親衛隊']);
 assert.deepEqual(card.traitComponents,['星十字騎士團','邦比愛塔親衛隊']);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,rest:'outside',filters,logic:'any'}]);
 for(const id of ['BLC-2-007','BLC-2-008','BLC-2-010']){
  assert.deepEqual(bleach.cards[id].traitComponents,['星十字騎士團','邦比愛塔親衛隊']);
  assert.equal(cardHasTrait(bleach.cards[id],'邦比愛塔親衛隊'),true);
  assert.equal(cardHasTrait(bleach.cards[id],'星十字騎士團'),true);
 }
 assert.deepEqual(bleach.cards['BLC-2-041'].traitComponents,['破面','涅骸部隊']);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-041'],'涅骸部隊'),true);
 assert.deepEqual(bleach.cards['BLC-2-043'].traitComponents,['護廷十三隊','涅骸部隊']);
 assert.deepEqual(bleach.cards['BLC-2-006'].traits,['星十字騎士團／殭屍']);
 assert.deepEqual(bleach.cards['BLC-2-006'].traitComponents,['星十字騎士團','殭屍']);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-006'],'殭屍'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-006'],'邦比愛塔親衛隊'),false);
 assert.equal(cardHasName(bleach.cards['BLC-2-006'],'バンビエッタ・バスターバイン'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-4-009'],'邦比愛塔親衛隊'),false);
 assert.equal(cardHasName(bleach.cards['BLC-4-009'],'バンビエッタ・バスターバイン'),true);
 assert.equal(cardHasTrait({traits:['星十字騎士團','邦比小隊']},'邦比愛塔親衛隊'),false);
 assert.equal(bleach.cards['BLC-4-064'].effects.onPlay[0].rest,undefined);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const bad=rest=>createUniversalPack({id:'bad-window-'+rest,cards:[{...bare,effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,rest,filters,logic:'any'}]}}]});
 assert.throws(()=>bad('bottom'),/invalid top-N filtered bottom\/discard profile/);
 assert.throws(()=>bad('deck'),/invalid top-N filtered bottom\/discard profile/);
 const deck=realDeck(['BLC-2-011','BLC-1-002','BLC-2-010','BLC-4-009','BLC-2-006','BLC-2-008','BLC-1-001','BLC-1-018','BLC-4-001','BLC-1-012','BLC-1-016','BLC-1-021','BLC-2-003'],'yellow');
 function open(seed,tops){
  const opened=main(deck,seed);
  put(opened.s,0,'BLC-1-002','energy',0);
  const window=tops?setTop(opened.s,0,tops):[];
  const self=take(opened.s,0,'BLC-2-011');
  opened.s.players[0].hand.push(self);
  const play=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
  assert.ok(play);
  return {opened,window,self,played:dispatchUniversalAction(opened.packs,opened.s,play)};
 }
 const first=open(29011,['BLC-2-010','BLC-4-009','BLC-1-018']);
 const [traitCard,nameCard,plain]=first.window;
 assert.equal(first.played.players[0].front.find(c=>c?.uid===first.self.uid).ready,false);
 assert.equal(first.played.pending.kind,'effect-top-filter-choice');
 assert.equal(first.played.pending.rest,'outside');
 assert.deepEqual(first.played.pending.filters,filters);
 assert.equal(first.played.pending.logic,'any');
 const shownIds=[traitCard.cardId,nameCard.cardId,plain.cardId];
 for(const viewer of [0,1]){
  const pub=universalPublicView(first.opened.packs,first.played,viewer);
  assert.deepEqual(pub.pending,{kind:'effect-top-filter-choice',player:0});
  assert.deepEqual(pub.publicReveals.filter(r=>r.kind==='revealed-window').map(r=>r.cardId),shownIds);
  assert.equal(pub.players[0].deckCount,first.played.players[0].deck.length);
 }
 assert.equal(universalPrivateChoices(first.opened.packs,first.played,1),null);
 const privateIds=universalPrivateChoices(first.opened.packs,first.played,0).options.filter(o=>o.card).map(o=>o.card.cardId);
 assert.deepEqual(privateIds.sort(),['BLC-2-010','BLC-4-009'].sort());
 const choices=legalUniversalActions(first.opened.packs,first.played);
 const chosen=uid=>choices.some(a=>a.type==='chooseTopFiltered'&&a.uid===uid);
 assert.equal(chosen(null),true);
 assert.equal(chosen(traitCard.uid),true);
 assert.equal(chosen(nameCard.uid),true);
 assert.equal(chosen(plain.uid),false);
 const tookTrait=dispatchUniversalAction(first.opened.packs,first.played,choices.find(a=>a.uid===traitCard.uid));
 assert.equal(tookTrait.pending.kind,'effect-discard');
 assert.equal(tookTrait.players[0].hand.some(c=>c.uid===traitCard.uid),true);
 assert.deepEqual(tookTrait.players[0].outside.slice(-2).map(c=>c.uid),[nameCard.uid,plain.uid]);
 assert.equal(tookTrait.players[0].deck.some(c=>[nameCard.uid,plain.uid,traitCard.uid].includes(c.uid)),false);
 assert.equal(tookTrait.players[0].removed.some(c=>[nameCard.uid,plain.uid].includes(c.uid)),false);
 const spare=tookTrait.players[0].hand.find(c=>c.uid!==traitCard.uid);
 const dumped=dispatchUniversalAction(first.opened.packs,tookTrait,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(dumped.pending,null);
 assert.equal(dumped.players[0].hand.some(c=>c.uid===traitCard.uid),true);
 assert.equal(dumped.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(dumped.players[0].removed.some(c=>c.uid===spare.uid),false);
 const tossed=dispatchUniversalAction(first.opened.packs,tookTrait,{type:'chooseDiscard',uid:traitCard.uid});
 assert.equal(tossed.players[0].outside.some(c=>c.uid===traitCard.uid),true);
 assert.equal(tossed.players[0].hand.some(c=>c.uid===traitCard.uid),false);
 assert.equal(tossed.players[0].removed.some(c=>c.uid===traitCard.uid),false);
 const tookName=dispatchUniversalAction(first.opened.packs,first.played,choices.find(a=>a.uid===nameCard.uid));
 assert.equal(tookName.players[0].hand.some(c=>c.uid===nameCard.uid),true);
 assert.deepEqual(tookName.players[0].outside.slice(-2).map(c=>c.uid),[traitCard.uid,plain.uid]);
 assert.equal(tookName.pending.kind,'effect-discard');
 const skipped=dispatchUniversalAction(first.opened.packs,first.played,{type:'chooseTopFiltered',uid:null});
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].outside.slice(-3).map(c=>c.uid),[traitCard.uid,nameCard.uid,plain.uid]);
 assert.equal(skipped.players[0].hand.some(c=>[traitCard.uid,nameCard.uid,plain.uid].includes(c.uid)),false);
 assert.equal(skipped.publicReveals.some(r=>r.kind==='searched-to-hand'),false);
 const missed=open(290111,['BLC-1-001','BLC-1-018','BLC-4-001']);
 assert.equal(missed.played.pending,null);
 assert.deepEqual(missed.played.players[0].outside.slice(-3).map(c=>c.cardId),['BLC-1-001','BLC-1-018','BLC-4-001']);
 assert.equal(missed.played.players[0].deck.some(c=>missed.window.some(x=>x.uid===c.uid)),false);
 assert.equal(missed.played.publicReveals.filter(r=>r.kind==='revealed-window').length,3);
 const named=open(290112,['BLC-2-006','BLC-1-018','BLC-1-001']);
 const nameOnly=legalUniversalActions(named.opened.packs,named.played);
 assert.equal(nameOnly.some(a=>a.uid===named.window[0].uid),true);
 assert.equal(nameOnly.some(a=>a.uid===named.window[1].uid),false);
 assert.equal(nameOnly.some(a=>a.uid===named.window[2].uid),false);
 const gotName=dispatchUniversalAction(named.opened.packs,named.played,nameOnly.find(a=>a.uid===named.window[0].uid));
 assert.equal(gotName.players[0].hand.some(c=>c.cardId==='BLC-2-006'&&c.uid===named.window[0].uid),true);
 assert.deepEqual(gotName.players[0].outside.slice(-2).map(c=>c.uid),[named.window[1].uid,named.window[2].uid]);
 const dry=main(deck,290113);
 put(dry.s,0,'BLC-1-002','energy',0);
 const lonely=take(dry.s,0,'BLC-2-011');
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 dry.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,0);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const filler=(id)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團'],trigger:null,implementation:'vanilla'});
 const lab=createUniversalPack({id:'c29-bambies-outside',cards:[
  {id:'ACT',name:'リルトット',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,rest:'outside',filters,logic:'any'}]}},
  {id:'TRAIT',name:'ジゼル',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團／邦比愛塔親衛隊'],traitComponents:['星十字騎士團','邦比愛塔親衛隊'],trigger:null,implementation:'vanilla'},
  {id:'NAME',name:'バンビエッタ・バスターバイン',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團'],trigger:null,implementation:'vanilla'},
  {id:'SQUAD',name:'リルトット・ランパード',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['星十字騎士團','邦比小隊'],trigger:null,implementation:'vanilla'},
  filler('PLAIN'),...Array.from({length:8},(_,i)=>filler('F'+i))
 ]});
 const counts={ACT:4,TRAIT:4,NAME:4,SQUAD:4,PLAIN:4,F0:4,F1:4,F2:4,F3:4,F4:4,F5:4,F6:4,F7:2};
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 let labState=newUniversalMatch(both,{decks:[counts,counts],seed:290115,first:0});
 for(let n=0;n<8&&labState.phase!=='main';n++)
  labState=dispatchUniversalAction(both,labState,{type:'next'});
 function lift(id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=labState.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('lab '+id);
 }
 const squad=lift('SQUAD'),bambi=lift('NAME'),member=lift('TRAIT');
 labState.players[0].deck.unshift(member,bambi,squad);
 const actor=lift('ACT');
 labState.players[0].hand.push(actor);
 const labPlayed=dispatchUniversalAction(both,labState,legalUniversalActions(both,labState).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'));
 const labLegal=legalUniversalActions(both,labPlayed);
 assert.equal(labLegal.some(a=>a.uid===member.uid),true);
 assert.equal(labLegal.some(a=>a.uid===bambi.uid),true);
 assert.equal(labLegal.some(a=>a.uid===squad.uid),false);
 aiOk(first.opened.packs,first.played);
 assert.equal(assertUniversalMatch(first.opened.packs,first.played),true);
 assert.equal(assertUniversalMatch(first.opened.packs,dumped),true);
 assert.equal(assertUniversalMatch(first.opened.packs,tossed),true);
 assert.equal(assertUniversalMatch(first.opened.packs,tookName),true);
 assert.equal(assertUniversalMatch(first.opened.packs,skipped),true);
 assert.equal(assertUniversalMatch(missed.opened.packs,missed.played),true);
 assert.equal(assertUniversalMatch(named.opened.packs,gotName),true);
 assert.equal(assertUniversalMatch(dry.packs,quiet),true);
 assert.equal(assertUniversalMatch(both,labPlayed),true);
});

test('BLC-1-060 names a printed energy, reveals two cards, and puts the rest outside without discarding',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-060');
 assert.equal(printed.effect,'登場：指定 1 個需求能源數值，公開己方牌堆頂 2 張；可將其中最多 1 張需求能源等於該數值的角色卡加入手牌，其餘送至場外。');
 assert.equal(printed.traits,'零番隊');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const card=bleach.cards['BLC-1-060'];
 assert.deepEqual(card.traits,['零番隊']);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'chooseEnergyRevealOutside',count:2}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-energy-window',cards:[{...bare,effects:{onPlay:[{op:'chooseEnergyRevealOutside',count:2,rest:'outside'}]}}]}),/invalid printed-energy reveal/);
 assert.throws(()=>createUniversalPack({id:'bad-energy-count',cards:[{...bare,effects:{onPlay:[{op:'chooseEnergyRevealOutside',count:5}]}}]}),/invalid printed-energy reveal/);
 const deck=realDeck(['BLC-1-060','BLC-1-034','BLC-1-039','BLC-1-045','BLC-1-036','BLC-1-108','BLC-1-062','BLC-2-052','BLC-1-057','BLC-1-035','BLC-2-053','BLC-1-059','BLC-1-048'],'purple');
 function open(seed,tops){
  const opened=main(deck,seed);
  put(opened.s,0,'BLC-1-034','energy',0);
  put(opened.s,0,'BLC-1-039','energy',1);
  put(opened.s,0,'BLC-1-045','energy',2);
  const window=tops?setTop(opened.s,0,tops):[];
  const self=take(opened.s,0,'BLC-1-060');
  opened.s.players[0].hand.push(self);
  const play=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
  assert.ok(play);
  const played=dispatchUniversalAction(opened.packs,opened.s,play);
  assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
  return {opened,window,self,played};
 }
 const first=open(29060,['BLC-1-036','BLC-1-108']);
 assert.equal(first.played.pending.kind,'effect-choose-printed-energy');
 assert.equal(first.played.publicReveals.some(r=>first.window.some(c=>c.uid===r.uid)),false);
 assert.equal(universalPublicView(first.opened.packs,first.played,1).players[0].deckCount,first.played.players[0].deck.length);
 assert.equal(universalPrivateChoices(first.opened.packs,first.played,0),null);
 assert.equal(universalPrivateChoices(first.opened.packs,first.played,1),null);
 const numbers=legalUniversalActions(first.opened.packs,first.played);
 assert.equal(numbers[0].value,0);
 assert.equal(numbers.some(a=>a.type==='choosePrintedEnergy'&&a.value===2),true);
 assert.equal(numbers.some(a=>a.value===30),true);
 const named=dispatchUniversalAction(first.opened.packs,first.played,numbers.find(a=>a.value===2));
 assert.equal(named.pending.kind,'effect-top-filter-choice');
 assert.equal(named.pending.rest,'outside');
 assert.equal(named.pending.discard,false);
 assert.deepEqual(named.pending.filter,{field:'printedEnergy',value:2});
 for(const viewer of [0,1]){
  const pub=universalPublicView(first.opened.packs,named,viewer);
  assert.deepEqual(pub.publicReveals.filter(r=>r.kind==='revealed-window').map(r=>r.cardId),['BLC-1-036','BLC-1-108']);
 }
 const picks=legalUniversalActions(first.opened.packs,named);
 assert.equal(picks.some(a=>a.uid===first.window[0].uid),true);
 assert.equal(picks.some(a=>a.uid===first.window[1].uid),false);
 const took=dispatchUniversalAction(first.opened.packs,named,picks.find(a=>a.uid===first.window[0].uid));
 assert.equal(took.pending,null);
 assert.equal(took.players[0].hand.some(c=>c.uid===first.window[0].uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===first.window[1].uid),true);
 assert.equal(took.players[0].deck.some(c=>first.window.some(x=>x.uid===c.uid)),false);
 assert.equal(took.players[0].removed.some(c=>first.window.some(x=>x.uid===c.uid)),false);
 const missed=dispatchUniversalAction(first.opened.packs,first.played,numbers.find(a=>a.value===0));
 assert.equal(missed.pending,null);
 assert.deepEqual(missed.players[0].outside.slice(-2).map(c=>c.uid),first.window.map(c=>c.uid));
 assert.equal(missed.publicReveals.filter(r=>r.kind==='revealed-window').length,2);
 const zero=open(290601,['BLC-1-048','BLC-1-062']);
 const zeroNumbers=legalUniversalActions(zero.opened.packs,zero.played);
 const zeroHit=dispatchUniversalAction(zero.opened.packs,zero.played,zeroNumbers.find(a=>a.value===0));
 assert.equal(zeroHit.pending.choices.length,1);
 assert.equal(zeroHit.players[0].deck[0].cardId,'BLC-1-048');
 const zeroTaken=dispatchUniversalAction(zero.opened.packs,zeroHit,legalUniversalActions(zero.opened.packs,zeroHit).find(a=>a.uid===zero.window[0].uid));
 assert.equal(zeroTaken.pending,null);
 assert.equal(zeroTaken.players[0].hand.some(c=>c.uid===zero.window[0].uid),true);
 assert.equal(zeroTaken.players[0].outside.some(c=>c.uid===zero.window[1].uid),true);
 const eventOnly=dispatchUniversalAction(zero.opened.packs,zero.played,zeroNumbers.find(a=>a.value===2));
 assert.equal(eventOnly.pending,null);
 assert.deepEqual(eventOnly.players[0].outside.slice(-2).map(c=>c.cardId),['BLC-1-048','BLC-1-062']);
 const dry=main(deck,290602);
 put(dry.s,0,'BLC-1-034','energy',0);
 put(dry.s,0,'BLC-1-039','energy',1);
 put(dry.s,0,'BLC-1-045','energy',2);
 const lonely=take(dry.s,0,'BLC-1-060');
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 dry.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,0);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const life=main(deck,290603);
 const ally=put(life.s,1,'BLC-1-035','front',0,false);
 const trigger=take(life.s,1,'BLC-1-060');
 const buried=life.s.players[1].life[0];
 life.s.players[1].life[0]=trigger;
 life.s.players[1].deck.push(buried);
 const attacker=put(life.s,0,'BLC-1-034','front',0,true);
 let revealed=life.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(life.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'active');
 const ready=legalUniversalActions(life.packs,revealed).find(a=>a.mode==='active'&&a.uid===ally.uid);
 assert.ok(ready);
 const woken=dispatchUniversalAction(life.packs,revealed,ready,{actor:1});
 const woke=woken.players[1].front.find(c=>c?.uid===ally.uid);
 assert.equal(woke.ready,true);
 assert.equal(universalBp(life.packs,woken,woke),bleach.cards['BLC-1-035'].bp+3000);
 aiOk(first.opened.packs,first.played);
 aiOk(first.opened.packs,named);
 assert.equal(assertUniversalMatch(first.opened.packs,first.played),true);
 assert.equal(assertUniversalMatch(first.opened.packs,named),true);
 assert.equal(assertUniversalMatch(first.opened.packs,took),true);
 assert.equal(assertUniversalMatch(first.opened.packs,missed),true);
 assert.equal(assertUniversalMatch(zero.opened.packs,zeroTaken),true);
 assert.equal(assertUniversalMatch(zero.opened.packs,eventOnly),true);
 assert.equal(assertUniversalMatch(dry.packs,quiet),true);
 assert.equal(assertUniversalMatch(life.packs,woken),true);
});

test('BLC-1-038 may mill three cards at once, then recover one purple character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-038');
 assert.equal(printed.effect,'登場：可將己方牌堆頂 3 張送至場外；成功時可從己方場外將最多 1 張紫色角色卡加入手牌。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,2);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 const recover={op:'recoverOutsideOne',optional:true,logic:'all',filters:[
  {field:'color',value:'purple'},{field:'type',value:'character'}]};
 const card=bleach.cards['BLC-1-038'];
 assert.deepEqual(card.traits,[]);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'millTop',count:3,optional:true,then:[recover]}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-mill-three',cards:[{...bare,effects:{onPlay:[{op:'millTop',count:3,optional:true}]}}]}),/optional mill is one or two cards/);
 assert.throws(()=>createUniversalPack({id:'bad-mill-follow',cards:[{...bare,effects:{onPlay:[{op:'millTop',count:3,optional:true,then:[{op:'draw',count:1}]}]}}]}),/optional mill follow-up must recover one purple character/);
 const deck=realDeck(['BLC-1-038','BLC-1-034','BLC-1-039','BLC-1-045','BLC-1-057','BLC-1-062','BLC-1-108','BLC-1-035','BLC-2-052','BLC-1-036','BLC-2-053','BLC-1-059','BLC-1-048'],'purple');
 function second(seed){
  const opened=main(deck,seed);
  for(let n=0;n<40&&!(opened.s.active===0&&opened.s.phase==='main'&&opened.s.players[0].ownTurns===2);n++){
   const step=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='next');
   assert.ok(step);
   opened.s=dispatchUniversalAction(opened.packs,opened.s,step);
  }
  assert.equal(opened.s.players[0].ownTurns,2);
  put(opened.s,0,'BLC-1-034','energy',0);
  put(opened.s,0,'BLC-1-039','energy',1);
  put(opened.s,0,'BLC-1-045','energy',2);
  return opened;
 }
 const first=second(29038);
 const window=setTop(first.s,0,['BLC-1-057','BLC-1-062','BLC-1-108']);
 const waiting=take(first.s,0,'BLC-1-035');
 first.s.players[0].outside.push(waiting);
 const self=take(first.s,0,'BLC-1-038');
 first.s.players[0].hand.push(self);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.pending.kind,'effect-optional-mill');
 assert.equal(played.pending.batch,3);
 assert.equal(played.publicReveals.some(r=>window.some(c=>c.uid===r.uid)),false);
 assert.equal(universalPrivateChoices(first.packs,played,0),null);
 assert.deepEqual(legalUniversalActions(first.packs,played).map(a=>a.mode),['skip','mill']);
 const skipped=dispatchUniversalAction(first.packs,played,{type:'chooseOptionalMill',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.slice(0,3).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(skipped.players[0].outside.some(c=>c.uid===waiting.uid),true);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===waiting.uid),false);
 const milled=dispatchUniversalAction(first.packs,played,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(milled.pending.kind,'effect-recover-outside');
 assert.deepEqual(milled.players[0].outside.slice(-3).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(milled.players[0].deck.some(c=>window.some(x=>x.uid===c.uid)),false);
 const choices=legalUniversalActions(first.packs,milled);
 assert.equal(choices.some(a=>a.uid===null),true);
 assert.equal(choices.some(a=>a.uid===window[0].uid),true);
 assert.equal(choices.some(a=>a.uid===waiting.uid),true);
 assert.equal(choices.some(a=>a.uid===window[1].uid),false);
 assert.equal(choices.some(a=>a.uid===window[2].uid),false);
 const took=dispatchUniversalAction(first.packs,milled,choices.find(a=>a.uid===window[0].uid));
 assert.equal(took.pending,null);
 assert.equal(took.players[0].hand.some(c=>c.uid===window[0].uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===waiting.uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===window[1].uid),true);
 const declined=dispatchUniversalAction(first.packs,milled,choices.find(a=>a.uid===null));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>window.some(x=>x.uid===c.uid)),false);
 assert.equal(declined.players[0].outside.some(c=>c.uid===window[0].uid),true);
 const short=second(290381);
 const only=setTop(short.s,0,['BLC-1-057']);
 short.s.players[0].outside.push(...short.s.players[0].deck.splice(1));
 const shortSelf=take(short.s,0,'BLC-1-038');
 short.s.players[0].hand.push(shortSelf);
 const shortPlay=dispatchUniversalAction(short.packs,short.s,legalUniversalActions(short.packs,short.s).find(a=>a.type==='play'&&a.uid===shortSelf.uid&&a.line==='front'));
 assert.equal(shortPlay.pending.batch,3);
 const shortMill=dispatchUniversalAction(short.packs,shortPlay,{type:'chooseOptionalMill',mode:'mill'});
 assert.equal(shortMill.pending.kind,'effect-recover-outside');
 assert.equal(shortMill.players[0].deck.length,0);
 assert.equal(shortMill.players[0].outside.some(c=>c.uid===only[0].uid),true);
 const dry=second(290382);
 dry.s.players[0].outside.push(...dry.s.players[0].deck.splice(0));
 const lonely=take(dry.s,0,'BLC-1-038');
 dry.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,0);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 aiOk(first.packs,played);
 aiOk(first.packs,milled);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(first.packs,skipped),true);
 assert.equal(assertUniversalMatch(first.packs,milled),true);
 assert.equal(assertUniversalMatch(first.packs,took),true);
 assert.equal(assertUniversalMatch(first.packs,declined),true);
 assert.equal(assertUniversalMatch(short.packs,shortMill),true);
 assert.equal(assertUniversalMatch(dry.packs,quiet),true);
});

test('BLC-2-014 may bounce one own character at energy 2 or less, then recover one such card',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-014');
 assert.equal(printed.effect,'登場：可將 1 個己方場上需求能源 2 以下角色返回手牌；成功時可從己方場外將最多 1 張需求能源 2 以下的卡加入手牌。');
 assert.equal(printed.triggerEffect,'【COLOR】將 1 個敵方前線 BP 3500 以下角色返回手牌。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,'color');
 const recover={op:'recoverOutsideUnderEnergy',energy:2,optional:true};
 const card=bleach.cards['BLC-2-014'];
 assert.deepEqual(card.traits,[]);
 assert.equal(card.gen,2);
 assert.deepEqual(card.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(card.effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[recover]}]);
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-energy-bounce',cards:[{...bare,effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2}]}}]}),/optional energy bounce follow-up must recover one card at that energy/);
 assert.throws(()=>createUniversalPack({id:'bad-energy-follow',cards:[{...bare,effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[{op:'draw',count:1}]}]}}]}),/optional energy bounce follow-up must recover one card at that energy/);
 const deck=realDeck(['BLC-2-014','BLC-2-016','BLC-2-021','BLC-2-022','BLC-2-015','BLC-2-026','BLC-2-032','BLC-2-033','BLC-2-047','BLC-2-044','BLC-2-018','BLC-2-025','BLC-2-031'],'blue');
 function open(seed){
  const opened=main(deck,seed);
  put(opened.s,0,'BLC-2-016','energy',0);
  put(opened.s,0,'BLC-2-021','energy',1);
  put(opened.s,0,'BLC-2-022','energy',2);
  return opened;
 }
 const first=open(29214);
 const low=put(first.s,0,'BLC-2-015','front',0);
 const high=put(first.s,0,'BLC-2-033','front',1);
 const mid=put(first.s,0,'BLC-2-026','front',2);
 const field=put(first.s,0,'BLC-2-044','energy',3);
 const event=take(first.s,0,'BLC-2-047');
 const outsideChar=take(first.s,0,'BLC-2-032');
 const huge=take(first.s,0,'BLC-2-018');
 first.s.players[0].outside.push(event,outsideChar,huge);
 const self=take(first.s,0,'BLC-2-014');
 first.s.players[0].hand.push(self);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 const played=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 assert.equal(played.pending.kind,'effect-bounce-own');
 assert.equal(played.pending.energy,2);
 const bounceIds=played.pending.choices.map(uid=>{
  const c=[...played.players[0].front,...played.players[0].energy].find(x=>x?.uid===uid);
  return c.cardId;
 });
 assert.deepEqual(bounceIds,['BLC-2-015','BLC-2-026','BLC-2-016','BLC-2-021','BLC-2-022']);
 assert.equal(played.pending.choices.includes(self.uid),false);
 assert.equal(played.pending.choices.includes(high.uid),false);
 assert.equal(played.pending.choices.includes(field.uid),false);
 assert.equal(universalPrivateChoices(first.packs,played,1),null);
 assert.equal(universalPrivateChoices(first.packs,played,0).options.some(o=>o.card?.cardId==='BLC-2-026'),true);
 const skipped=dispatchUniversalAction(first.packs,played,{type:'chooseOwnBounce',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===mid.uid),true);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===event.uid),true);
 const bounced=dispatchUniversalAction(first.packs,played,{type:'chooseOwnBounce',uid:mid.uid});
 assert.equal(bounced.pending.kind,'effect-recover-outside');
 assert.equal(bounced.pending.printedEnergyMax,2);
 assert.equal(bounced.players[0].hand.some(c=>c.uid===mid.uid),true);
 assert.equal(bounced.players[0].front.some(c=>c?.uid===mid.uid),false);
 assert.deepEqual(bounced.pending.choices.slice().sort(),[event.uid,outsideChar.uid].sort());
 assert.equal(bounced.pending.choices.includes(huge.uid),false);
 assert.equal(bounced.pending.choices.includes(mid.uid),false);
 const recoveries=legalUniversalActions(first.packs,bounced);
 const took=dispatchUniversalAction(first.packs,bounced,recoveries.find(a=>a.uid===event.uid));
 assert.equal(took.pending,null);
 assert.equal(took.players[0].hand.some(c=>c.uid===event.uid),true);
 assert.equal(took.players[0].outside.some(c=>c.uid===outsideChar.uid),true);
 const declined=dispatchUniversalAction(first.packs,bounced,recoveries.find(a=>a.uid===null));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(declined.players[0].hand.some(c=>c.uid===event.uid),false);
 const bareField=main(deck,29215);
 put(bareField.s,0,'BLC-2-044','energy',0);
 put(bareField.s,0,'BLC-2-044','energy',1);
 put(bareField.s,0,'BLC-2-044','energy',2);
 const onlyHigh=put(bareField.s,0,'BLC-2-033','front',0);
 const over=put(bareField.s,0,'BLC-2-018','front',1);
 const lonely=take(bareField.s,0,'BLC-2-014');
 bareField.s.players[0].hand.push(lonely);
 const quiet=dispatchUniversalAction(bareField.packs,bareField.s,legalUniversalActions(bareField.packs,bareField.s).find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===onlyHigh.uid),true);
 assert.equal(quiet.players[0].front.some(c=>c?.uid===over.uid),true);
 assert.equal(quiet.players[0].front.find(c=>c?.uid===lonely.uid).ready,false);
 const emptyOutside=open(29216);
 const target=put(emptyOutside.s,0,'BLC-2-015','front',0);
 const actor=take(emptyOutside.s,0,'BLC-2-014');
 emptyOutside.s.players[0].hand.push(actor);
 emptyOutside.s.players[0].removed.push(...emptyOutside.s.players[0].deck.splice(0),...emptyOutside.s.players[0].outside.splice(0));
 const sent=dispatchUniversalAction(emptyOutside.packs,emptyOutside.s,legalUniversalActions(emptyOutside.packs,emptyOutside.s).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'));
 const returned=dispatchUniversalAction(emptyOutside.packs,sent,{type:'chooseOwnBounce',uid:target.uid});
 assert.equal(returned.pending,null);
 assert.equal(returned.players[0].hand.some(c=>c.uid===target.uid),true);
 assert.equal(returned.players[0].outside.length,0);
 const life=open(29217);
 const victim=put(life.s,0,'BLC-2-033','front',0,true);
 const tall=put(life.s,0,'BLC-2-018','front',1,true);
 life.s.players[1].deck.push(...life.s.players[1].life.splice(0));
 life.s.players[1].life.push(take(life.s,1,'BLC-2-014'));
 let revealed=life.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(life.packs,revealed,{type:'attack',uid:victim.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(life.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const legal=legalUniversalActions(life.packs,revealed);
 assert.equal(legal.some(a=>a.mode==='colorBounce'&&a.uid===victim.uid),true);
 assert.equal(legal.some(a=>a.uid===tall.uid),false);
 const woken=dispatchUniversalAction(life.packs,revealed,legal.find(a=>a.mode==='colorBounce'&&a.uid===victim.uid),{actor:1});
 assert.equal(woken.players[0].hand.some(c=>c.uid===victim.uid),true);
 assert.equal(woken.players[0].front.some(c=>c?.uid===tall.uid),true);
 const filler=id=>({id,name:id,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'vanilla'});
 const lab=createUniversalPack({id:'c29-energy-bounce',cards:[
  {id:'SELF',name:'SELF',color:'blue',type:'character',energy:2,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[recover]}]}},
  {id:'FIELD',name:'FIELD',color:'blue',type:'field',energy:2,ap:1,bp:0,gen:1,traits:[],trigger:null,implementation:'vanilla'},
  {id:'BIG',name:'BIG',color:'blue',type:'event',energy:3,ap:1,bp:0,gen:0,traits:[],trigger:null,implementation:'vanilla'},
  filler('A'),filler('B'),filler('C'),filler('D'),filler('E'),filler('F'),filler('G'),filler('H'),filler('I'),filler('J')
 ]});
 const counts={SELF:4,FIELD:4,BIG:4,A:4,B:4,C:4,D:4,E:4,F:4,G:4,H:4,I:4,J:2};
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const both=[lab,lab];
 let labState=newUniversalMatch(both,{decks:[counts,counts],seed:29218,first:0});
 for(let n=0;n<8&&labState.phase!=='main';n++)
  labState=dispatchUniversalAction(both,labState,{type:'next'});
 function lift(id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=labState.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('lab '+id);
 }
 for(const [id,slot] of [['A',0],['B',1]]){
  const pay=lift(id);pay.ready=true;pay.fieldEntryStamp=labState.nextFieldEntryStamp++;
  labState.players[0].energy[slot]=pay;
 }
 const smallField=lift('FIELD'),bigEvent=lift('BIG');
 labState.players[0].outside.push(smallField,bigEvent);
 const ego=lift('SELF');
 labState.players[0].hand.push(ego);
 const labPlayed=dispatchUniversalAction(both,labState,legalUniversalActions(both,labState).find(a=>a.type==='play'&&a.uid===ego.uid&&a.line==='front'));
 assert.equal(labPlayed.pending.choices.includes(ego.uid),true);
 const labBounced=dispatchUniversalAction(both,labPlayed,{type:'chooseOwnBounce',uid:ego.uid});
 assert.equal(labBounced.players[0].hand.some(c=>c.uid===ego.uid),true);
 assert.equal(labBounced.pending.kind,'effect-recover-outside');
 assert.equal(labBounced.pending.choices.includes(smallField.uid),true);
 assert.equal(labBounced.pending.choices.includes(bigEvent.uid),false);
 aiOk(first.packs,played);
 aiOk(first.packs,bounced);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(first.packs,skipped),true);
 assert.equal(assertUniversalMatch(first.packs,bounced),true);
 assert.equal(assertUniversalMatch(first.packs,took),true);
 assert.equal(assertUniversalMatch(first.packs,declined),true);
 assert.equal(assertUniversalMatch(bareField.packs,quiet),true);
 assert.equal(assertUniversalMatch(emptyOutside.packs,returned),true);
 assert.equal(assertUniversalMatch(life.packs,woken),true);
 assert.equal(assertUniversalMatch(both,labPlayed),true);
 assert.equal(assertUniversalMatch(both,labBounced),true);
});

test('BLC-2-001 steps to energy and buffs once while the opponent front is reduced or rested',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-001');
 assert.equal(printed.effect,'Step：己方移動階段可由前線移至能源線。主要階段・每回合 1 次：敵方前線有 BP 低於原始 BP 的角色，或有 REST 角色時，此角色本回合 BP +1000。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,3000);
 assert.equal(printed.gen,2);
 assert.equal(printed.trigger,null);
 const when={logic:'any',checks:[
  {kind:'oppFrontLiveBpBelowPrinted',turn:'any'},
  {kind:'oppRestCharacter',turn:'any',zone:'front'}]};
 const card=bleach.cards['BLC-2-001'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.equal(card.traitComponents,undefined);
 assert.deepEqual(card.mainAbility,{op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,when});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},mainAbility:{op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,when:{logic:'any',checks:[{kind:'oppRestCharacter',turn:'any',zone:'field'}]}}};
 assert.throws(()=>createUniversalPack({id:'bad-step-or',cards:[bare]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-2-001','BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021','BLC-2-003'],'yellow');
 const first=main(deck,29301);
 put(first.s,0,'BLC-1-002','energy',0);
 put(first.s,0,'BLC-1-012','energy',1);
 put(first.s,0,'BLC-1-018','energy',2);
 const rested=put(first.s,1,'BLC-1-001','front',0,false);
 const full=put(first.s,1,'BLC-1-021','front',1,true);
 const bench=put(first.s,1,'BLC-2-003','energy',0,false);
 const self=take(first.s,0,'BLC-2-001');
 first.s.players[0].hand.push(self);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.ok(play);
 let played=dispatchUniversalAction(first.packs,first.s,play);
 const body=played.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(body.ready,false);
 assert.equal(universalBp(first.packs,played,body),3000);
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='onceBuffSelf'&&a.uid===self.uid);
 assert.ok(act);
 played=dispatchUniversalAction(first.packs,played,act);
 const boosted=played.players[0].front.find(c=>c?.uid===self.uid);
 assert.equal(boosted.ready,false);
 assert.equal(universalBp(first.packs,played,boosted),4000);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='onceBuffSelf'),false);
 const quiet=main(deck,29302);
 put(quiet.s,0,'BLC-1-002','energy',0);
 put(quiet.s,0,'BLC-1-012','energy',1);
 put(quiet.s,0,'BLC-1-018','energy',2);
 put(quiet.s,1,'BLC-1-001','front',0,true);
 put(quiet.s,1,'BLC-2-003','energy',0,false);
 const quietSelf=take(quiet.s,0,'BLC-2-001');
 quiet.s.players[0].hand.push(quietSelf);
 const quietPlay=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===quietSelf.uid&&a.line==='front'));
 assert.equal(legalUniversalActions(quiet.packs,quietPlay).some(a=>a.mode==='onceBuffSelf'),false);
 const lowered=main(deck,29303);
 put(lowered.s,0,'BLC-1-002','energy',0);
 put(lowered.s,0,'BLC-1-012','energy',1);
 put(lowered.s,0,'BLC-1-018','energy',2);
 const victim=put(lowered.s,1,'BLC-1-001','front',0,true);
 victim.buffs=[{bp:-1000,untilTurn:lowered.s.turn}];
 assert.equal(universalBp(lowered.packs,lowered.s,victim),1000);
 const lowSelf=take(lowered.s,0,'BLC-2-001');
 lowered.s.players[0].hand.push(lowSelf);
 let lowPlayed=dispatchUniversalAction(lowered.packs,lowered.s,legalUniversalActions(lowered.packs,lowered.s).find(a=>a.type==='play'&&a.uid===lowSelf.uid&&a.line==='front'));
 const lowAct=legalUniversalActions(lowered.packs,lowPlayed).find(a=>a.mode==='onceBuffSelf'&&a.uid===lowSelf.uid);
 assert.ok(lowAct);
 lowPlayed=dispatchUniversalAction(lowered.packs,lowPlayed,lowAct);
 assert.equal(universalBp(lowered.packs,lowPlayed,lowPlayed.players[0].front.find(c=>c?.uid===lowSelf.uid)),4000);
 let stepped=played;
 for(let n=0;n<30&&!(stepped.active===0&&stepped.phase==='move'&&stepped.players[0].ownTurns===2);n++){
  const step=legalUniversalActions(first.packs,stepped).find(a=>a.type==='next');
  assert.ok(step);
  stepped=dispatchUniversalAction(first.packs,stepped,step);
 }
 const shift=legalUniversalActions(first.packs,stepped).find(a=>a.type==='step'&&a.uid===self.uid);
 assert.ok(shift);
 stepped=dispatchUniversalAction(first.packs,stepped,shift);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===self.uid),true);
 stepped.players[1].front.find(c=>c?.cardId==='BLC-1-001').ready=false;
 for(let n=0;n<8&&!(stepped.active===0&&stepped.phase==='main');n++)
  stepped=dispatchUniversalAction(first.packs,stepped,{type:'next'});
 const again=legalUniversalActions(first.packs,stepped).find(a=>a.type==='activate'&&a.mode==='onceBuffSelf'&&a.uid===self.uid);
 assert.ok(again);
 stepped=dispatchUniversalAction(first.packs,stepped,again);
 const moved=stepped.players[0].energy.find(c=>c?.uid===self.uid);
 assert.equal(universalBp(first.packs,stepped,moved),4000);
 for(let n=0;n<20&&stepped.active===0;n++){
  const step=legalUniversalActions(first.packs,stepped).find(a=>a.type==='next');
  assert.ok(step);
  stepped=dispatchUniversalAction(first.packs,stepped,step);
 }
 assert.equal(universalBp(first.packs,stepped,stepped.players[0].energy.find(c=>c?.uid===self.uid)),3000);
 assert.equal(rested.ready,false);
 assert.equal(full.ready,true);
 assert.equal(bench.ready,false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietPlay),true);
 assert.equal(assertUniversalMatch(lowered.packs,lowPlayed),true);
 assert.equal(assertUniversalMatch(first.packs,stepped),true);
});

test('BLC-4-037 reduces one front character at BP 1500 or higher, then replays that effect for 1 AP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-037');
 assert.equal(printed.effect,'登場時：最多選1個對方前線BP1500以上的角色，本回合BP−1000。啟動・主要〔支付1 AP／每回合1次〕：發動此角色的登場時效果。');
 assert.deepEqual(printed.traits,['破面']);
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'draw');
 const down={op:'enemyBpDown',bp:1000,optional:true,minBp:1500};
 const card=bleach.cards['BLC-4-037'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['破面']);
 assert.deepEqual(card.effects.onPlay,[down]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[down]});
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-replay-bp',cards:[{...bare,mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'enemyBpDown',bp:0,optional:true,minBp:1500}]}}]}),/invalid temporary BP/);
 const deck=realDeck(['BLC-4-037','BLC-2-031','BLC-3-002','BLC-2-015','BLC-2-016','BLC-2-026','BLC-2-041'],'blue');
 const first=main(deck,29370);
 put(first.s,0,'BLC-2-031','energy',0);
 put(first.s,0,'BLC-3-002','energy',1);
 put(first.s,0,'BLC-2-015','energy',2);
 assert.equal(universalEnergyByColor(first.packs,first.s,0).blue,3);
 const high=put(first.s,1,'BLC-2-026','front',0,true);
 const exact=put(first.s,1,'BLC-2-016','front',1,true);
 const low=put(first.s,1,'BLC-2-016','front',2,true);
 low.buffs=[{bp:-500,untilTurn:first.s.turn}];
 const bench=put(first.s,1,'BLC-2-041','energy',0,true);
 assert.equal(universalBp(first.packs,first.s,high),3000);
 assert.equal(universalBp(first.packs,first.s,exact),1500);
 assert.equal(universalBp(first.packs,first.s,low),1000);
 const self=take(first.s,0,'BLC-4-037');
 first.s.players[0].hand.push(self);
 let played=dispatchUniversalAction(first.packs,first.s,legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.pending.kind,'effect-target');
 assert.equal(played.pending.optional,true);
 assert.deepEqual(played.pending.choices.slice().sort(),[high.uid,exact.uid].sort());
 assert.equal(played.pending.choices.includes(low.uid),false);
 assert.equal(played.pending.choices.includes(bench.uid),false);
 const skipped=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(first.packs,skipped,skipped.players[1].front.find(c=>c?.uid===high.uid)),3000);
 const again=take(skipped,0,'BLC-4-037');
 skipped.players[0].hand.push(again);
 skipped.players[0].apCards[0].ready=true;
 played=dispatchUniversalAction(first.packs,skipped,legalUniversalActions(first.packs,skipped).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='energy'));
 assert.equal(played.pending.choices.includes(high.uid),true);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(first.packs,played,played.players[1].front.find(c=>c?.uid===high.uid)),2000);
 assert.equal(played.players[0].energy.find(c=>c?.uid===again.uid).ready,false);
 played.players[0].apCards[0].ready=true;
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===again.uid);
 assert.ok(act);
 played=dispatchUniversalAction(first.packs,played,act);
 assert.equal(played.pending.choices.includes(exact.uid),true);
 assert.equal(played.pending.choices.includes(low.uid),false);
 assert.equal(played.pending.choices.includes(bench.uid),false);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:exact.uid});
 assert.equal(universalBp(first.packs,played,played.players[1].front.find(c=>c?.uid===exact.uid)),500);
 assert.equal(played.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='oncePay'&&a.uid===again.uid),false);
 const other=played.players[0].front.find(c=>c?.uid===self.uid);
 played.players[0].apCards[1].inPlay=true;
 played.players[0].apCards[1].ready=true;
 const second=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===other.uid);
 assert.ok(second);
 played=dispatchUniversalAction(first.packs,played,second);
 assert.equal(played.pending.kind,'effect-target');
 played=dispatchUniversalAction(first.packs,played,{type:'chooseTarget',uid:null});
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='oncePay'),false);
 const quiet=main(deck,29371);
 put(quiet.s,0,'BLC-2-031','energy',0);
 put(quiet.s,0,'BLC-3-002','energy',1);
 put(quiet.s,0,'BLC-2-015','energy',2);
 const small=put(quiet.s,1,'BLC-2-016','front',0,true);
 small.buffs=[{bp:-500,untilTurn:quiet.s.turn}];
 const onlyEnergy=put(quiet.s,1,'BLC-2-026','energy',0,true);
 const quietSelf=take(quiet.s,0,'BLC-4-037');
 quiet.s.players[0].hand.push(quietSelf);
 const quietPlay=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===quietSelf.uid&&a.line==='front'));
 assert.equal(quietPlay.pending,null);
 assert.equal(universalBp(quiet.packs,quietPlay,quietPlay.players[1].front.find(c=>c?.uid===small.uid)),1000);
 assert.equal(universalBp(quiet.packs,quietPlay,quietPlay.players[1].energy.find(c=>c?.uid===onlyEnergy.uid)),3000);
 const broke=main(deck,29372);
 const resting=put(broke.s,0,'BLC-4-037','front',0,false);
 for(const ap of broke.s.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(broke.packs,broke.s).some(a=>a.mode==='oncePay'),false);
 broke.s.players[0].apCards[0].ready=true;
 let paid=dispatchUniversalAction(broke.packs,broke.s,{type:'activate',uid:resting.uid,mode:'oncePay'});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].front.find(c=>c?.uid===resting.uid).ready,false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietPlay),true);
 assert.equal(assertUniversalMatch(broke.packs,paid),true);
});

test('BLC-4-071 draws and discards, steps, and shares one ACTIVE among every Soi Fon',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-071');
 assert.equal(printed.effect,'Step：移動階段可從前線移至能量線。登場時：抽1張牌，再將1張手牌送至場外。啟動・主要：將此角色改為Active；所有《碎蜂》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-4-071'];
 assert.equal(card.step,true);
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1,discardCount:1}]);
 assert.deepEqual(card.mainAbility,{op:'nameOnceActive',scope:'name',when:null});
 const bare={id:'BAD',name:'BAD',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-name-once',cards:[{...bare,mainAbility:{op:'nameOnceActive',scope:'card',when:null}}]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-4-071','BLC-1-091','BLC-1-078','BLC-4-060','BLC-1-087','BLC-4-062','BLC-1-079'],'green');
 const first=main(deck,29471);
 put(first.s,0,'BLC-1-078','energy',0);
 put(first.s,0,'BLC-4-060','energy',1);
 assert.ok(universalEnergyByColor(first.packs,first.s,0).green>=4);
 const self=take(first.s,0,'BLC-4-071');
 const beforeDeck=first.s.players[0].deck.length;
 const beforeHand=first.s.players[0].hand.length;
 first.s.players[0].hand.push(self);
 let played=dispatchUniversalAction(first.packs,first.s,legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===self.uid&&a.line==='front'));
 assert.equal(played.pending.kind,'effect-discard');
 assert.equal(played.players[0].deck.length,beforeDeck-1);
 assert.equal(played.players[0].hand.length,beforeHand+1);
 const discard=played.players[0].hand.find(c=>c.uid!==self.uid);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseDiscard',uid:discard.uid});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,false);
 const other=put(played,0,'BLC-4-071','energy',2,false);
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.mode==='nameOnceActive'&&a.uid===self.uid);
 assert.ok(act);
 played=dispatchUniversalAction(first.packs,played,act);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='nameOnceActive'),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'activate',uid:other.uid,mode:'nameOnceActive'}),/not currently legal/);
 const fromEnergy=main(deck,29472);
 const lined=put(fromEnergy.s,0,'BLC-4-071','energy',0,false);
 const woken=dispatchUniversalAction(fromEnergy.packs,fromEnergy.s,{type:'activate',uid:lined.uid,mode:'nameOnceActive'});
 assert.equal(woken.players[0].energy.find(c=>c?.uid===lined.uid).ready,true);
 let stepped=played;
 for(let n=0;n<30&&!(stepped.active===0&&stepped.phase==='move'&&stepped.players[0].ownTurns===2);n++)
  stepped=dispatchUniversalAction(first.packs,stepped,{type:'next'});
 const shift=legalUniversalActions(first.packs,stepped).find(a=>a.type==='step'&&a.uid===self.uid);
 assert.ok(shift);
 stepped=dispatchUniversalAction(first.packs,stepped,shift);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===self.uid),true);
 for(let n=0;n<8&&!(stepped.active===0&&stepped.phase==='main');n++)
  stepped=dispatchUniversalAction(first.packs,stepped,{type:'next'});
 const again=legalUniversalActions(first.packs,stepped).find(a=>a.mode==='nameOnceActive'&&a.uid===self.uid);
 assert.ok(again);
 stepped=dispatchUniversalAction(first.packs,stepped,again);
 assert.equal(stepped.players[0].energy.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,stepped).some(a=>a.mode==='nameOnceActive'&&a.uid===other.uid),false);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(fromEnergy.packs,woken),true);
 assert.equal(assertUniversalMatch(first.packs,stepped),true);
});

test('BLC-3-005 nulls the battling character impact and actives once per Renji name',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-005');
 assert.equal(printed.effect,'【無效化 Impact】與此角色戰鬥的角色，在該次戰鬥中失去 Impact。\n【啟動主要】只有對手前線有目前 BP 低於原本 BP 的角色時才能發動。將此角色轉為 Active。〈阿散井戀次〉的此效果每回合只能發動一次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,5);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 const when={kind:'oppFrontLiveBpBelowPrinted',turn:'any'};
 const card=bleach.cards['BLC-3-005'];
 assert.equal(card.impactNull,true);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.mainAbility,{op:'nameOnceActive',scope:'name',when});
 const deck=realDeck(['BLC-3-005','BLC-1-041','BLC-1-102','BLC-1-103','BLC-1-034','BLC-1-039'],'purple');
 const first=main(deck,29505);
 put(first.s,0,'BLC-1-102','energy',0);
 put(first.s,0,'BLC-1-103','energy',1);
 put(first.s,0,'BLC-1-034','energy',2);
 assert.ok(universalEnergyByColor(first.packs,first.s,0).purple>=5);
 const self=put(first.s,0,'BLC-3-005','front',0,false);
 const copy=put(first.s,0,'BLC-3-005','energy',3,false);
 const quiet=put(first.s,1,'BLC-1-041','front',0,true);
 assert.equal(universalBp(first.packs,first.s,quiet),4000);
 assert.equal(legalUniversalActions(first.packs,first.s).some(a=>a.mode==='nameOnceActive'),false);
 quiet.buffs=[{bp:-1000,untilTurn:first.s.turn}];
 assert.equal(universalBp(first.packs,first.s,quiet),3000);
 const act=legalUniversalActions(first.packs,first.s).find(a=>a.type==='activate'&&a.mode==='nameOnceActive'&&a.uid===self.uid);
 assert.ok(act);
 let played=dispatchUniversalAction(first.packs,first.s,act);
 assert.equal(played.players[0].front.find(c=>c?.uid===self.uid).ready,true);
 assert.equal(legalUniversalActions(first.packs,played).some(a=>a.mode==='nameOnceActive'),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'activate',uid:copy.uid,mode:'nameOnceActive'}),/not currently legal/);
 const benchOnly=main(deck,29506);
 const benched=put(benchOnly.s,1,'BLC-1-034','energy',0,true);
 benched.buffs=[{bp:-500,untilTurn:benchOnly.s.turn}];
 const waiting=put(benchOnly.s,0,'BLC-3-005','front',0,false);
 assert.equal(universalBp(benchOnly.packs,benchOnly.s,benched),1000);
 assert.equal(legalUniversalActions(benchOnly.packs,benchOnly.s).some(a=>a.mode==='nameOnceActive'&&a.uid===waiting.uid),false);
 const fought=main(deck,29507);
 const attacker=put(fought.s,0,'BLC-1-041','front',0,true);
 attacker.impactGranted={turn:fought.s.turn,stamp:attacker.fieldEntryStamp,amount:1};
 const wall=put(fought.s,1,'BLC-3-005','front',0,true);
 assert.equal(universalBp(fought.packs,fought.s,attacker),4000);
 assert.equal(universalBp(fought.packs,fought.s,wall),4000);
 assert.equal(universalImpact(fought.packs,fought.s,attacker),1);
 const lifeBefore=fought.s.players[1].life.length;
 let battle=fought.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fought.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(fought.packs,battle,{type:'attack',uid:attacker.uid});
 assert.equal(battle.pending?.kind,'block');
 battle=dispatchUniversalAction(fought.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===attacker.uid),true);
 assert.equal(battle.players[1].front.some(c=>c?.uid===wall.uid),false);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,lifeBefore);
 assert.equal(battle.pending,null);
 const control=main(deck,29508);
 const striker=put(control.s,0,'BLC-1-041','front',0,true);
 striker.impactGranted={turn:control.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const plain=put(control.s,1,'BLC-1-103','front',0,true);
 assert.equal(universalImpact(control.packs,control.s,striker),1);
 const controlLife=control.s.players[1].life.length;
 let open=control.s;
 for(let n=0;n<6&&open.phase!=='attack';n++)
  open=dispatchUniversalAction(control.packs,open,{type:'next'});
 open=dispatchUniversalAction(control.packs,open,{type:'attack',uid:striker.uid});
 open=dispatchUniversalAction(control.packs,open,{type:'chooseBlock',uid:plain.uid},{actor:1});
 assert.equal(open.players[1].life.length,controlLife-1);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(benchOnly.packs,benchOnly.s),true);
 assert.equal(assertUniversalMatch(fought.packs,battle),true);
 assert.equal(assertUniversalMatch(control.packs,open),true);
});

test('BLC-4-006 gains 1000 on its turn when Haschwalth is on the field and Yhwach is not outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-006');
 assert.equal(printed.effect,'Impact無效。自己的回合中：若自己場外沒有《友哈巴赫》，且自己場上有《雨葛蘭・哈斯沃德》，此角色BP+1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.energy,3);
 assert.equal(printed.bp,3000);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,null);
 const absent={kind:'ownNameAbsent',turn:'own',zone:'outside',excludeSelf:false,name:'ユーハバッハ'};
 const present={kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'ユーグラム・ハッシュヴァルト'};
 const condition={logic:'all',turn:'own',checks:[absent,present]};
 const card=bleach.cards['BLC-4-006'];
 assert.equal(card.impactNull,true);
 assert.equal(card.gen,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.passiveBonuses,[{condition,bp:1000}]);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:3000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-plus',cards:[{...bare,passiveBonuses:[{condition:absent,bp:1000}]}]}),/invalid passive bonus/);
 assert.throws(()=>createUniversalPack({id:'bad-wrap',cards:[{...bare,passiveBonuses:[{condition:{logic:'all',turn:'own',checks:[absent,{...absent,name:'別'}]},bp:1000}]}]}),/name-absence/);
 assert.throws(()=>createUniversalPack({id:'bad-zone',cards:[{...bare,passiveBonuses:[{condition:{...absent,zone:'hand'},bp:-1000}]}]}),/invalid or cyclic passive/);
 const deck=realDeck(['BLC-4-006','BLC-1-018','BLC-1-021','BLC-1-023'],'yellow');
 const first=main(deck,29606);
 const self=put(first.s,0,'BLC-4-006','front',0);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 const jugram=put(first.s,0,'BLC-1-018','energy',0);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 first.s.players[0].energy[0]=null;
 first.s.players[0].hand.push(jugram);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 put(first.s,0,'BLC-1-018','front',1);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const held=take(first.s,0,'BLC-1-021');
 first.s.players[0].hand.push(held);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const handIndex=first.s.players[0].hand.findIndex(c=>c.uid===held.uid);
 first.s.players[0].hand.splice(handIndex,1);
 first.s.players[0].outside.push(held);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 first.s.players[0].outside.splice(first.s.players[0].outside.findIndex(c=>c.uid===held.uid),1);
 held.ready=true;held.fieldEntryStamp=first.s.nextFieldEntryStamp++;
 first.s.players[0].energy[0]=held;
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const oppOutside=take(first.s,1,'BLC-1-021');
 first.s.players[1].outside.push(oppOutside);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const ownJugram=first.s.players[0].front[1];
 first.s.players[0].front[1]=null;
 first.s.players[0].hand.push(ownJugram);
 put(first.s,1,'BLC-1-018','front',0);
 assert.equal(universalBp(first.packs,first.s,self),3000);
 put(first.s,0,'BLC-1-018','front',1);
 assert.equal(universalBp(first.packs,first.s,self),4000);
 const enemy=structuredClone(first.s);enemy.active=1;
 assert.equal(universalBp(first.packs,enemy,enemy.players[0].front[0]),3000);
 grantContinuousState(first.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:self.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(first.packs,first.s,first.s.players[0].front[0]),3000);
 const lined=main(deck,29607);
 const energyCopy=put(lined.s,0,'BLC-4-006','energy',0,false);
 assert.equal(universalCardEnergy(lined.packs,lined.s,0,energyCopy),2);
 energyCopy.ready=true;
 assert.equal(universalCardEnergy(lined.packs,lined.s,0,energyCopy),2);
 assert.equal(universalEnergyByColor(lined.packs,lined.s,0).yellow,2);
 const fought=main(deck,29608);
 const attacker=put(fought.s,0,'BLC-1-023','front',0,true);
 attacker.impactGranted={turn:fought.s.turn,stamp:attacker.fieldEntryStamp,amount:1};
 const wall=put(fought.s,1,'BLC-4-006','front',0,true);
 put(fought.s,1,'BLC-1-018','energy',0);
 assert.equal(universalBp(fought.packs,fought.s,attacker),4000);
 // The BP clause is own-turn only, so it is off while this character blocks.
 assert.equal(universalBp(fought.packs,fought.s,wall),3000);
 assert.equal(universalImpact(fought.packs,fought.s,attacker),1);
 const lifeBefore=fought.s.players[1].life.length;
 let battle=fought.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fought.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(fought.packs,battle,{type:'attack',uid:attacker.uid});
 assert.equal(battle.pending?.kind,'block');
 battle=dispatchUniversalAction(fought.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===attacker.uid),true);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,lifeBefore);
 assert.equal(battle.pending,null);
 const control=main(deck,29609);
 const striker=put(control.s,0,'BLC-1-023','front',0,true);
 striker.impactGranted={turn:control.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const plain=put(control.s,1,'BLC-1-018','front',0,true);
 const controlLife=control.s.players[1].life.length;
 let hit=control.s;
 for(let n=0;n<6&&hit.phase!=='attack';n++)
  hit=dispatchUniversalAction(control.packs,hit,{type:'next'});
 hit=dispatchUniversalAction(control.packs,hit,{type:'attack',uid:striker.uid});
 hit=dispatchUniversalAction(control.packs,hit,{type:'chooseBlock',uid:plain.uid},{actor:1});
 assert.equal(hit.players[1].life.length,controlLife-1);
 const base={...bare,implementation:'vanilla'};
 const fillers=Array.from({length:9},(_,i)=>({...base,id:'F'+i,name:'余'+i}));
 const lab=createUniversalPack({id:'lab-bazz',cards:[
  {...bare,id:'BAZZ',name:'バズビー',impactNull:true,passiveBonuses:[{condition,bp:1000}]},
  {...base,id:'YH',name:'ユーハバッハ',bp:1500},
  {...bare,id:'AL',name:'別名義',nameAliases:['ユーハバッハ'],bp:1500},
  {...base,id:'JU',name:'ユーグラム・ハッシュヴァルト',bp:1500},
  ...fillers]});
 const labIds=['BAZZ','YH','AL','JU',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let aliasBoard=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:29610,first:0});
 const aliasSelf=put(aliasBoard,0,'BAZZ','front',0);
 put(aliasBoard,0,'JU','energy',0);
 assert.equal(universalBp(labPacks,aliasBoard,aliasSelf),4000);
 const alias=take(aliasBoard,0,'AL');
 aliasBoard.players[0].outside.push(alias);
 assert.equal(universalBp(labPacks,aliasBoard,aliasSelf),3000);
 aliasBoard.players[0].outside.pop();
 aliasBoard.players[0].hand.push(alias);
 assert.equal(universalBp(labPacks,aliasBoard,aliasSelf),4000);
 aiOk(first.packs,first.s);
 assert.equal(assertUniversalMatch(first.packs,first.s),true);
 assert.equal(assertUniversalMatch(lined.packs,lined.s),true);
 assert.equal(assertUniversalMatch(fought.packs,battle),true);
 assert.equal(assertUniversalMatch(control.packs,hit),true);
 assert.equal(assertUniversalMatch(labPacks,aliasBoard),true);
});

test('BLC-4-047 rests, retires, and may REST-play one energy-0 purple Ichigo',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-047');
 assert.equal(printed.effect,'啟動・主要〔改為Rest，並使此卡退場〕：可從自己場外將最多1張所需能量0的紫色《黑崎一護》以Rest登場。');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.energy,0);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,500);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'draw');
 const ability={op:'restRetireExactOutside',name:'黒崎 一護',color:'purple',energy:0,optional:true};
 const card=bleach.cards['BLC-4-047'];
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.mainAbility,ability);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:500,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...bare,mainAbility:{...ability,ap:1}}]}),/unsupported main action ability/);
 assert.throws(()=>createUniversalPack({id:'old-rest',cards:[{...bare,effects:{onPlay:[{op:'deployOutsideRest',name:'黒崎 一護',color:'purple',energy:0,optional:true}]}}]}),/invalid outside-to-REST/);
 const deck=realDeck(['BLC-4-047','BLC-1-039','BLC-1-040','BLC-1-034'],'purple');
 const first=main(deck,29747);
 const self=put(first.s,0,'BLC-4-047','front',0,true);
 const ichigo=take(first.s,0,'BLC-1-039');
 const costly=take(first.s,0,'BLC-1-040');
 const other=take(first.s,0,'BLC-1-034');
 first.s.players[0].outside.push(ichigo,costly,other);
 const act=legalUniversalActions(first.packs,first.s).find(a=>a.type==='activate'&&a.mode==='restRetireExact'&&a.uid===self.uid);
 assert.ok(act);
 let played=dispatchUniversalAction(first.packs,first.s,act);
 assert.equal(played.pending.kind,'effect-outside-exact-rest');
 assert.deepEqual(played.pending.choices,[ichigo.uid]);
 assert.equal(played.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(played.players[0].outside.some(c=>c.uid===self.uid),true);
 aiOk(first.packs,played);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseOutsideExactRest',uid:null});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].outside.some(c=>c.uid===ichigo.uid),true);
 const entered=main(deck,29748);
 const kon=put(entered.s,0,'BLC-4-047','front',0,true);
 const body=take(entered.s,0,'BLC-1-039');
 entered.s.players[0].outside.push(body);
 const beforeDeck=entered.s.players[0].deck.length;
 let landed=dispatchUniversalAction(entered.packs,entered.s,{type:'activate',uid:kon.uid,mode:'restRetireExact'});
 const choice=legalUniversalActions(entered.packs,landed).find(a=>a.type==='chooseOutsideExactRest'&&a.uid===body.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(choice);
 landed=dispatchUniversalAction(entered.packs,landed,choice);
 assert.equal(landed.players[0].front.find(c=>c?.uid===body.uid).ready,false);
 assert.equal(landed.players[0].outside.some(c=>c.uid===kon.uid),true);
 assert.equal(landed.players[0].deck.length,beforeDeck);
 const again=put(landed,0,'BLC-4-047','front',1,true);
 assert.ok(legalUniversalActions(entered.packs,landed).some(a=>a.mode==='restRetireExact'&&a.uid===again.uid));
 const fromEnergy=main(deck,29749);
 const lined=put(fromEnergy.s,0,'BLC-4-047','energy',0,true);
 const moved=take(fromEnergy.s,0,'BLC-1-039');
 fromEnergy.s.players[0].outside.push(moved);
 let energyPlay=dispatchUniversalAction(fromEnergy.packs,fromEnergy.s,{type:'activate',uid:lined.uid,mode:'restRetireExact'});
 const energyChoice=legalUniversalActions(fromEnergy.packs,energyPlay).find(a=>a.type==='chooseOutsideExactRest'&&a.uid===moved.uid&&a.line==='energy');
 assert.ok(energyChoice);
 energyPlay=dispatchUniversalAction(fromEnergy.packs,energyPlay,energyChoice);
 assert.equal(energyPlay.players[0].energy.find(c=>c?.uid===moved.uid).ready,false);
 const empty=main(deck,29750);
 const lonely=put(empty.s,0,'BLC-4-047','front',0,true);
 let spent=dispatchUniversalAction(empty.packs,empty.s,{type:'activate',uid:lonely.uid,mode:'restRetireExact'});
 assert.equal(spent.pending,null);
 assert.equal(spent.players[0].outside.some(c=>c.uid===lonely.uid),true);
 const resting=main(deck,29751);
 const asleep=put(resting.s,0,'BLC-4-047','front',0,false);
 assert.equal(legalUniversalActions(resting.packs,resting.s).some(a=>a.mode==='restRetireExact'),false);
 const vanilla={...bare,implementation:'vanilla',effects:{}};
 const fillers=Array.from({length:8},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}));
 const lab=createUniversalPack({id:'lab-kon',cards:[
  {...bare,id:'KON',name:'コン',mainAbility:ability},
  {...bare,id:'RAID',name:'黒崎 一護',ap:2,raidName:'黒崎 一護',effects:{onPlay:[{op:'draw',count:1}]}},
  {...vanilla,id:'ONE',name:'黒崎 一護',energy:1},
  {...vanilla,id:'BLUE',name:'黒崎 一護',color:'blue'},
  {...vanilla,id:'OTHER',name:'浦原 喜助'},
  ...fillers]});
 const labIds=['KON','RAID','ONE','BLUE','OTHER',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let board=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:29752,first:0});
 for(let n=0;n<8&&board.phase!=='main';n++)
  board=dispatchUniversalAction(labPacks,board,{type:'next'});
 const source=put(board,0,'KON','front',0,true);
 const raid=take(board,0,'RAID');
 const one=take(board,0,'ONE');
 const blue=take(board,0,'BLUE');
 const named=take(board,0,'OTHER');
 board.players[0].outside.push(raid,one,blue,named);
 const deckBefore=board.players[0].deck.length;
 let raidPlay=dispatchUniversalAction(labPacks,board,{type:'activate',uid:source.uid,mode:'restRetireExact'});
 const uids=legalUniversalActions(labPacks,raidPlay).filter(a=>a.type==='chooseOutsideExactRest'&&a.uid).map(a=>a.uid);
 assert.deepEqual([...new Set(uids)],[raid.uid]);
 const raidChoice=legalUniversalActions(labPacks,raidPlay).find(a=>a.uid===raid.uid&&a.line==='front'&&a.mode===undefined);
 assert.ok(raidChoice);
 raidPlay=dispatchUniversalAction(labPacks,raidPlay,raidChoice);
 const arrived=raidPlay.players[0].front.find(c=>c?.uid===raid.uid);
 assert.equal(arrived.ready,false);
 assert.equal(arrived.stack?.length||0,0);
 assert.equal(raidPlay.players[0].deck.length,deckBefore-1);
 aiOk(empty.packs,spent);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(entered.packs,landed),true);
 assert.equal(assertUniversalMatch(fromEnergy.packs,energyPlay),true);
 assert.equal(assertUniversalMatch(empty.packs,spent),true);
 assert.equal(assertUniversalMatch(resting.packs,resting.s),true);
 assert.equal(assertUniversalMatch(labPacks,raidPlay),true);
});

test('BLC-2-017 discards one hand card and cannot be blocked by BP 4000+',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-017');
 assert.equal(printed.effect,'主要階段・每回合 1 次：將 1 張手牌送至場外，使此角色本回合不能被 BP 4000 以上角色阻擋。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-2-017'];
 assert.equal(card.energy,2);
 assert.equal(card.ap,1);
 assert.equal(card.bp,3000);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.deepEqual(card.traits,[]);
 assert.equal(card.mainAbility.op,'oncePayProgram');
 assert.equal(card.mainAbility.payAp,0);
 assert.equal(card.mainAbility.then[0].then[0].op,'grantSelfBlockAtLeast');
 assert.equal(card.mainAbility.then[0].then[0].bp,4000);
 const deck=realDeck(['BLC-2-017','BLC-2-021','BLC-2-031','BLC-2-016','BLC-2-026'],'blue');
 const first=main(deck,29817);
 const self=put(first.s,0,'BLC-2-017','front',0,true);
 const sword=take(first.s,0,'BLC-2-021');
 first.s.players[0].hand.push(sword);
 assert.equal(legalUniversalActions(first.packs,first.s).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),false);
 let paid=dispatchUniversalAction(first.packs,first.s,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(paid.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(first.packs,paid).some(a=>a.uid===null),false);
 aiOk(first.packs,paid);
 paid=dispatchUniversalAction(first.packs,paid,{type:'chooseDiscardGate',uid:sword.uid});
 assert.equal(paid.pending.kind,'effect-grant-cause');
 assert.equal(live(paid,0,self.uid).blockAtLeastGranted.bp,4000);
 paid=dispatchUniversalAction(first.packs,paid,{type:'chooseGrantCause',mode:'grant'});
 assert.equal(live(paid,0,self.uid).blockFloorGranted.bp,3000);
 const huge=put(paid,1,'BLC-2-026','front',0,true);
 huge.buffs=[{bp:1000,untilTurn:paid.turn}];
 const mid=put(paid,1,'BLC-2-031','front',1,true);
 mid.buffs=[{bp:2000,untilTurn:paid.turn}];
 const small=put(paid,1,'BLC-2-016','front',2,true);
 assert.equal(universalBp(first.packs,paid,huge)>=4000,true);
 assert.equal(universalBp(first.packs,paid,mid),3500);
 let battle=paid;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(first.packs,battle,{type:'next'});
 live(battle,0,self.uid).ready=true;
 battle=dispatchUniversalAction(first.packs,battle,{type:'attack',uid:self.uid});
 assert.equal(battle.pending.kind,'block');
 const blocks=legalUniversalActions(first.packs,battle).filter(a=>a.type==='chooseBlock').map(a=>a.uid);
 assert.equal(blocks.includes(huge.uid),false);
 assert.equal(blocks.includes(mid.uid),true);
 assert.equal(blocks.includes(small.uid),false);
 assert.equal(blocks.includes(null),true);
 const again=main(deck,29818);
 const used=put(again.s,0,'BLC-2-017','front',0,true);
 const other=put(again.s,0,'BLC-2-017','energy',0,true);
 const spare=take(again.s,0,'BLC-2-031');
 again.s.players[0].hand.push(spare);
 let once=dispatchUniversalAction(again.packs,again.s,{type:'activate',uid:used.uid,mode:'oncePay'});
 const dumped=again.s.players[0].hand[0];
 once=dispatchUniversalAction(again.packs,once,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(once.pending,null);
 assert.equal(legalUniversalActions(again.packs,once).some(a=>a.uid===used.uid&&a.mode==='oncePay'),false);
 assert.equal(legalUniversalActions(again.packs,once).some(a=>a.uid===other.uid&&a.mode==='oncePay'),true);
 const quiet=main(deck,29819);
 const lined=put(quiet.s,0,'BLC-2-017','energy',0,false);
 const emptyHand=quiet.s.players[0].hand.splice(0);
 quiet.s.players[0].outside.push(...emptyHand);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.mode==='oncePay'),false);
 quiet.s.players[0].hand.push(quiet.s.players[0].outside.pop());
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.uid===lined.uid&&a.mode==='oncePay'),true);
 aiOk(first.packs,battle);
 assert.equal(assertUniversalMatch(first.packs,battle),true);
 assert.equal(assertUniversalMatch(again.packs,once),true);
 assert.equal(assertUniversalMatch(quiet.packs,quiet.s),true);
});

test('BLC-4-003 discounts an empty field, steps, and cuts BP only on its own retire turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-003');
 assert.equal(printed.effect,'自己場上沒有任何卡片時，手牌中的此卡所需黃色能量減少2。Step：移動階段可從前線移至能量線。退場時：若為自己的回合，最多選1個對方前線BP1500以上的角色，本回合BP−1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-4-003'];
 assert.equal(card.energy,2);
 assert.equal(card.gen,1);
 assert.equal(card.step,true);
 assert.equal(card.emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onRetire[0].ownTurnOnly,true);
 assert.equal(card.effects.onRetire[0].minBp,1500);
 const deck=realDeck(['BLC-4-003','BLC-1-023','BLC-1-018','BLC-1-012','BLC-1-002'],'yellow');
 const cost=main(deck,29903);
 assert.equal(effectiveHandRequiredEnergy(cost.packs,cost.s,0,card),0);
 put(cost.s,0,'BLC-1-002','front',0);
 assert.equal(effectiveHandRequiredEnergy(cost.packs,cost.s,0,card),2);
 const packs=[bleach,bleach];
 let moving=newUniversalMatch(packs,{decks:[deck,deck],seed:29904,first:0});
 for(let n=0;n<8&&moving.phase!=='move';n++)
  moving=dispatchUniversalAction(packs,moving,{type:'next'});
 const stepper=put(moving,0,'BLC-4-003','front',0,true);
 const step=legalUniversalActions(packs,moving).find(a=>a.type==='step'&&a.uid===stepper.uid);
 assert.ok(step);
 moving=dispatchUniversalAction(packs,moving,step);
 assert.equal(moving.players[0].energy.some(c=>c?.uid===stepper.uid),true);
 const own=main(deck,29905);
 const self=put(own.s,0,'BLC-4-003','front',0,true);
 const wall=put(own.s,1,'BLC-1-023','front',0,true);
 const edge=put(own.s,1,'BLC-1-018','front',1,true);
 const low=put(own.s,1,'BLC-1-012','front',2,true);
 low.buffs=[{bp:-500,untilTurn:own.s.turn}];
 assert.equal(universalBp(own.packs,own.s,low),1000);
 let battle=own.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(own.packs,battle,{type:'next'});
 live(battle,0,self.uid).ready=true;
 battle=dispatchUniversalAction(own.packs,battle,{type:'attack',uid:self.uid});
 battle=dispatchUniversalAction(own.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[0].front.some(c=>c?.uid===self.uid),false);
 assert.equal(battle.pending.kind,'effect-target');
 const targets=legalUniversalActions(own.packs,battle).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(targets.includes(wall.uid),true);
 assert.equal(targets.includes(edge.uid),true);
 assert.equal(targets.includes(low.uid),false);
 assert.equal(targets.includes(null),true);
 battle=dispatchUniversalAction(own.packs,battle,{type:'chooseTarget',uid:wall.uid});
 assert.equal(universalBp(own.packs,battle,live(battle,1,wall.uid)),3000);
 let theirs=newUniversalMatch(packs,{decks:[deck,deck],seed:29906,first:1});
 for(let n=0;n<8&&theirs.phase!=='attack';n++)
  theirs=dispatchUniversalAction(packs,theirs,{type:'next'});
 const attacker=put(theirs,1,'BLC-1-023','front',0,true);
 const blocker=put(theirs,0,'BLC-4-003','front',0,true);
 theirs=dispatchUniversalAction(packs,theirs,{type:'attack',uid:attacker.uid});
 theirs=dispatchUniversalAction(packs,theirs,{type:'chooseBlock',uid:blocker.uid},{actor:0});
 assert.equal(theirs.players[0].outside.some(c=>c.uid===blocker.uid),true);
 assert.equal(theirs.pending,null);
 aiOk(own.packs,battle);
 assert.equal(assertUniversalMatch(cost.packs,cost.s),true);
 assert.equal(assertUniversalMatch(packs,moving),true);
 assert.equal(assertUniversalMatch(own.packs,battle),true);
 assert.equal(assertUniversalMatch(packs,theirs),true);
});

test('BLC-2-028 may discard into an AP active and actives once per card',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-028');
 assert.equal(printed.effect,'Impact 無效。登場：可將 1 張手牌送至場外；成功時可將最多 1 張己方 AP 卡轉為 ACTIVE。主要階段・每回合 1 次：己方前線有其他原始 AP 消耗 2 以上角色時，將此角色轉為 ACTIVE。');
 assert.equal(printed.traits,'護廷十三隊');
 const card=bleach.cards['BLC-2-028'];
 assert.equal(card.impactNull,true);
 assert.equal(card.ap,2);
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'get');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.op,'cardOnceActive');
 assert.equal(card.effects.onPlay[0].optional,true);
 const deck=realDeck(['BLC-2-028','BLC-2-018','BLC-2-031','BLC-2-016','BLC-4-022'],'blue');
 const played=main(deck,30028);
 for(let i=0;i<3;i++)put(played.s,0,'BLC-2-031','energy',i,true);
 for(const ap of played.s.players[0].apCards.slice(0,2)){ap.inPlay=true;ap.ready=true;}
 const handCard=take(played.s,0,'BLC-2-028');
 played.s.players[0].hand.push(handCard);
 let entry=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 assert.equal(entry.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(played.packs,entry).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),true);
 entry=dispatchUniversalAction(played.packs,entry,{type:'chooseDiscardGate',uid:null});
 assert.equal(entry.pending,null);
 assert.equal(entry.players[0].apCards[0].ready,false);
 played.s=entry;
 for(const ap of played.s.players[0].apCards.slice(0,2)){ap.inPlay=true;ap.ready=true;}
 const second=take(played.s,0,'BLC-2-028');
 played.s.players[0].hand.push(second);
 const dumped=played.s.players[0].hand.find(c=>c.uid!==second.uid);
 let paid=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:second.uid,line:'front',slot:1});
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(paid.pending.kind,'effect-recover-ap');
 const rested=paid.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(paid.players[0].apCards.find(c=>c.uid===rested.uid).ready,true);
 const gated=main(deck,30029);
 const self=put(gated.s,0,'BLC-2-028','front',0,false);
 const small=put(gated.s,0,'BLC-2-031','front',1,true);
 assert.equal(bleach.cards['BLC-2-031'].ap<2,true);
 assert.equal(legalUniversalActions(gated.packs,gated.s).some(a=>a.mode==='cardOnceActive'),false);
 const parked=put(gated.s,0,'BLC-2-018','energy',0,true);
 assert.equal(legalUniversalActions(gated.packs,gated.s).some(a=>a.mode==='cardOnceActive'),false);
 gated.s.players[0].energy[0]=null;
 gated.s.players[0].front[2]=parked;
 assert.equal(legalUniversalActions(gated.packs,gated.s).some(a=>a.uid===self.uid&&a.mode==='cardOnceActive'),true);
 let stood=dispatchUniversalAction(gated.packs,gated.s,{type:'activate',uid:self.uid,mode:'cardOnceActive'});
 assert.equal(live(stood,0,self.uid).ready,true);
 assert.equal(legalUniversalActions(gated.packs,stood).some(a=>a.uid===self.uid&&a.mode==='cardOnceActive'),false);
 const copy=put(stood,0,'BLC-2-028','energy',0,false);
 assert.equal(legalUniversalActions(gated.packs,stood).some(a=>a.uid===copy.uid&&a.mode==='cardOnceActive'),true);
 grantContinuousState(stood,{kind:'originalEffectsDisabled',controller:1,sourceUid:parked.uid,
  targetUid:copy.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(gated.packs,stood).some(a=>a.uid===copy.uid&&a.mode==='cardOnceActive'),false);
 const fight=main(deck,30030);
 const striker=put(fight.s,0,'BLC-2-018','front',0,true);
 striker.impactGranted={turn:fight.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const wall=put(fight.s,1,'BLC-2-028','front',0,true);
 const life=fight.s.players[1].life.length;
 let battle=fight.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fight.packs,battle,{type:'next'});
 live(battle,0,striker.uid).ready=true;
 battle=dispatchUniversalAction(fight.packs,battle,{type:'attack',uid:striker.uid});
 assert.ok(universalImpact(fight.packs,battle,live(battle,0,striker.uid))>0);
 battle=dispatchUniversalAction(fight.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,life);
 aiOk(played.packs,paid);
 assert.equal(assertUniversalMatch(played.packs,paid),true);
 assert.equal(assertUniversalMatch(gated.packs,stood),true);
 assert.equal(assertUniversalMatch(fight.packs,battle),true);
});

test('BLC-4-043 is also Nem and may put one blue squad card outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-043');
 assert.equal(printed.effect,'此卡也視為《涅音夢》。登場時：查看牌庫頂2張，可將最多1張藍色《涅繭利》、《涅音夢》或具有「涅骸部隊」特徵的卡送至場外，其餘依任意順序放回牌庫頂。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-043'];
 assert.deepEqual(card.nameAliases,['涅 ネム']);
 assert.equal(card.energy,0);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(cardHasName(card,'涅 ネム'),true);
 const ids=['BLC-4-043','BLC-4-040','BLC-2-044','BLC-1-054','BLC-2-031','BLC-2-016','BLC-2-015','BLC-2-026','BLC-2-019','BLC-2-032','BLC-4-022','BLC-2-018','BLC-4-036'];
 const deck=Object.fromEntries(ids.map((id,i)=>[id,i===ids.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const packs=[bleach,bleach];
 const playTop=(seed,topIds)=>{
  let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
  for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
  s.players[0].apCards[0].inPlay=true;s.players[0].apCards[0].ready=true;
  const actor=take(s,0,'BLC-4-043');
  const tops=setTop(s,0,topIds);
  s.players[0].hand.push(actor);
  const played=dispatchUniversalAction(packs,s,{type:'play',uid:actor.uid,line:'front',slot:0});
  return {played,tops};
 };
 const miss=playTop(30143,['BLC-1-054','BLC-2-031']);
 assert.equal(miss.played.pending.kind,'effect-top-order');
 assert.equal(miss.played.players[0].outside.some(c=>miss.tops.some(t=>t.uid===c.uid)),false);
 const named=playTop(30144,['BLC-4-040','BLC-2-031']);
 assert.equal(named.played.pending.kind,'effect-top-trait-outside');
 const namedChoices=legalUniversalActions(packs,named.played).filter(a=>a.type==='chooseTopTraitOutside').map(a=>a.uid);
 assert.equal(namedChoices.includes(named.tops[0].uid),true);
 assert.equal(namedChoices.includes(named.tops[1].uid),false);
 assert.equal(namedChoices.includes(null),true);
 let kept=dispatchUniversalAction(packs,named.played,{type:'chooseTopTraitOutside',uid:named.tops[0].uid});
 assert.equal(kept.players[0].outside.some(c=>c.uid===named.tops[0].uid),true);
 kept=dispatchUniversalAction(packs,kept,legalUniversalActions(packs,kept).find(a=>a.type==='chooseTopOrder'));
 assert.equal(kept.players[0].deck[0].uid,named.tops[1].uid);
 const traited=playTop(30145,['BLC-2-044','BLC-1-054']);
 const traitChoices=legalUniversalActions(packs,traited.played).filter(a=>a.type==='chooseTopTraitOutside').map(a=>a.uid);
 assert.equal(traitChoices.includes(traited.tops[0].uid),true);
 assert.equal(traitChoices.includes(traited.tops[1].uid),false);
 const alias=playTop(30146,['BLC-4-043','BLC-2-031']);
 const aliasChoices=legalUniversalActions(packs,alias.played).filter(a=>a.type==='chooseTopTraitOutside').map(a=>a.uid);
 assert.equal(aliasChoices.includes(alias.tops[0].uid),true);
 let skipped=dispatchUniversalAction(packs,alias.played,{type:'chooseTopTraitOutside',uid:null});
 assert.equal(skipped.players[0].outside.some(c=>c.uid===alias.tops[0].uid),false);
 assert.equal(skipped.pending.kind,'effect-top-order');
 aiOk(packs,named.played);
 assert.equal(assertUniversalMatch(packs,kept),true);
 assert.equal(assertUniversalMatch(packs,traited.played),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('BLC-4-051 chooses a draw only on its entry turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-051');
 assert.equal(printed.effect,'啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動，選1項。①抽1張牌，再將1張手牌送至場外。②若對方前線有BP低於印刷BP的角色，抽1張牌。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.gen,3);
 const card=bleach.cards['BLC-4-051'];
 assert.equal(card.gen,2);
 assert.equal(card.energy,3);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.entryTurnOnly,true);
 assert.deepEqual(card.effects.onPlay,[{op:'noteEntryTurn'}]);
 const deck=realDeck(['BLC-4-051','BLC-1-039','BLC-1-045','BLC-1-048'],'purple');
 const played=main(deck,30251);
 for(const [i,id] of ['BLC-1-039','BLC-1-045','BLC-1-048'].entries())
  put(played.s,0,id,'energy',i,true);
 assert.equal(['BLC-1-039','BLC-1-045','BLC-1-048'].reduce((n,id)=>n+bleach.cards[id].gen,0),3);
 played.s.players[0].apCards[0].inPlay=true;
 played.s.players[0].apCards[0].ready=true;
 const handCard=take(played.s,0,'BLC-4-051');
 played.s.players[0].hand.push(handCard);
 const plain=put(played.s,1,'BLC-1-045','front',0,true);
 assert.equal(universalBp(played.packs,played.s,plain),bleach.cards['BLC-1-045'].bp);
 assert.equal(legalUniversalActions(played.packs,played.s).some(a=>a.type==='play'&&a.uid===handCard.uid),true);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 const self=live(entered,0,handCard.uid);
 assert.equal(self.entryTurn,entered.turn);
 assert.equal(entered.pending,null);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='oncePay'),true);
 const deckBefore=entered.players[0].deck.length;
 let missed=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(missed.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(played.packs,missed).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode);
 assert.deepEqual(modes.sort(),['below','discard']);
 missed=dispatchUniversalAction(played.packs,missed,{type:'chooseEffectMode',mode:'below'});
 assert.equal(missed.players[0].deck.length,deckBefore);
 assert.equal(missed.pending,null);
 assert.equal(legalUniversalActions(played.packs,missed).some(a=>a.uid===self.uid&&a.mode==='oncePay'),false);
 const parked=put(missed,0,'BLC-4-051','energy',3,true);
 assert.equal(universalCardEnergy(played.packs,missed,0,parked),2);
 parked.ready=false;
 assert.equal(universalCardEnergy(played.packs,missed,0,parked),2);
 assert.equal(legalUniversalActions(played.packs,missed).some(a=>a.uid===parked.uid&&a.mode==='oncePay'),false);
 parked.entryTurn=missed.turn-1;
 assert.throws(()=>dispatchUniversalAction(played.packs,missed,{type:'activate',uid:parked.uid,mode:'oncePay'}),/Action not currently legal/);
 parked.entryTurn=missed.turn;
 assert.equal(legalUniversalActions(played.packs,missed).some(a=>a.uid===parked.uid&&a.mode==='oncePay'),true);
 const handBefore=missed.players[0].hand.length;
 const deckNow=missed.players[0].deck.length;
 let drawn=dispatchUniversalAction(played.packs,missed,{type:'activate',uid:parked.uid,mode:'oncePay'});
 drawn=dispatchUniversalAction(played.packs,drawn,{type:'chooseEffectMode',mode:'discard'});
 assert.equal(drawn.players[0].deck.length,deckNow-1);
 assert.equal(drawn.players[0].hand.length,handBefore+1);
 assert.equal(drawn.pending.kind,'effect-discard');
 const dumped=drawn.players[0].hand[drawn.players[0].hand.length-1];
 drawn=dispatchUniversalAction(played.packs,drawn,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(drawn.players[0].outside.some(c=>c.uid===dumped.uid),true);
 assert.equal(drawn.pending,null);
 assert.equal(legalUniversalActions(played.packs,drawn).some(a=>a.uid===parked.uid&&a.mode==='oncePay'),false);
 const silenced=put(drawn,0,'BLC-4-051','front',1,true);
 silenced.entryTurn=drawn.turn;
 assert.equal(legalUniversalActions(played.packs,drawn).some(a=>a.uid===silenced.uid&&a.mode==='oncePay'),true);
 grantContinuousState(drawn,{kind:'originalEffectsDisabled',controller:1,sourceUid:plain.uid,
  targetUid:silenced.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,drawn).some(a=>a.uid===silenced.uid&&a.mode==='oncePay'),false);
 const reduced=main(deck,30252);
 for(const [i,id] of ['BLC-1-039','BLC-1-045','BLC-1-048'].entries())
  put(reduced.s,0,id,'energy',i,true);
 reduced.s.players[0].apCards[0].inPlay=true;
 reduced.s.players[0].apCards[0].ready=true;
 const wall=put(reduced.s,1,'BLC-1-039','front',0,true);
 wall.buffs=[{bp:-1000,untilTurn:reduced.s.turn}];
 assert.ok(universalBp(reduced.packs,reduced.s,wall)<bleach.cards['BLC-1-039'].bp);
 const actor=take(reduced.s,0,'BLC-4-051');
 reduced.s.players[0].hand.push(actor);
 let low=dispatchUniversalAction(reduced.packs,reduced.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 const before=low.players[0].deck.length;
 low=dispatchUniversalAction(reduced.packs,low,{type:'activate',uid:actor.uid,mode:'oncePay'});
 low=dispatchUniversalAction(reduced.packs,low,{type:'chooseEffectMode',mode:'below'});
 assert.equal(low.players[0].deck.length,before-1);
 assert.equal(low.pending,null);
 aiOk(played.packs,entered);
 aiOk(reduced.packs,low);
 assert.equal(assertUniversalMatch(played.packs,drawn),true);
 assert.equal(assertUniversalMatch(reduced.packs,low),true);
});

test('BLC-4-068 actives from REST on the front, pays 1 AP, and rests one opponent',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-068');
 assert.equal(printed.effect,'Impact無效。啟動・主要〔前線／支付1 AP〕：僅在此角色為Rest時可發動；將此角色改為Active，並最多選1個對方前線角色改為Rest。所有《京樂春水》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-068'];
 assert.equal(card.impactNull,true);
 assert.equal(card.energy,4);
 assert.equal(card.gen,1);
 assert.equal(card.bp,4000);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(card.mainAbility.op,'restFrontNameOnce');
 const deck=realDeck(['BLC-4-068','BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089','BLC-1-080'],'green');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089'].entries())
   put(s,0,id,'energy',i,true);
  for(const ap of s.players[0].apCards.slice(0,2)){ap.inPlay=true;ap.ready=true;}
 };
 const played=main(deck,30368);
 fuel(played.s);
 const handCard=take(played.s,0,'BLC-4-068');
 played.s.players[0].hand.push(handCard);
 let stood=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 const self=live(stood,0,handCard.uid);
 assert.equal(self.ready,false);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===self.uid&&a.mode==='restFrontNameOnce'),true);
 const displaced=stood.players[0].energy[3];
 stood.players[0].energy[3]=null;
 stood.players[0].deck.push(displaced);
 const lined=put(stood,0,'BLC-4-068','energy',3,false);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===lined.uid&&a.mode==='restFrontNameOnce'),false);
 const awake=put(stood,0,'BLC-4-068','front',1,true);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===awake.uid&&a.mode==='restFrontNameOnce'),false);
 const quiet=put(stood,0,'BLC-4-068','front',2,false);
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===quiet.uid&&a.mode==='restFrontNameOnce'),true);
 grantContinuousState(stood,{kind:'originalEffectsDisabled',controller:1,sourceUid:awake.uid,
  targetUid:quiet.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===quiet.uid&&a.mode==='restFrontNameOnce'),false);
 const left=put(stood,1,'BLC-1-071','front',0,true);
 const right=put(stood,1,'BLC-1-083','front',1,true);
 stood=dispatchUniversalAction(played.packs,stood,{type:'activate',uid:self.uid,mode:'restFrontNameOnce'});
 assert.equal(live(stood,0,self.uid).ready,true);
 assert.equal(stood.pending.kind,'effect-rest-bp');
 const rests=legalUniversalActions(played.packs,stood).filter(a=>a.type==='chooseRestBp').map(a=>a.uid);
 assert.equal(rests.includes(null),true);
 assert.equal(rests.includes(left.uid),true);
 assert.equal(rests.includes(right.uid),true);
 stood=dispatchUniversalAction(played.packs,stood,{type:'chooseRestBp',uid:left.uid});
 assert.equal(live(stood,1,left.uid).ready,false);
 assert.equal(live(stood,1,right.uid).ready,true);
 assert.equal(stood.pending,null);
 stood.players[0].apCards.find(c=>c.inPlay&&!c.ready).ready=true;
 awake.ready=false;
 assert.equal(legalUniversalActions(played.packs,stood).some(a=>a.uid===awake.uid&&a.mode==='restFrontNameOnce'),false);
 const skipped=main(deck,30369);
 fuel(skipped.s);
 const actor=take(skipped.s,0,'BLC-4-068');
 skipped.s.players[0].hand.push(actor);
 let open=dispatchUniversalAction(skipped.packs,skipped.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 live(open,0,actor.uid).ready=false;
 const lone=put(open,1,'BLC-1-071','front',0,true);
 open=dispatchUniversalAction(skipped.packs,open,{type:'activate',uid:actor.uid,mode:'restFrontNameOnce'});
 open=dispatchUniversalAction(skipped.packs,open,{type:'chooseRestBp',uid:null});
 assert.equal(live(open,0,actor.uid).ready,true);
 assert.equal(live(open,1,lone.uid).ready,true);
 assert.equal(open.pending,null);
 const empty=main(deck,30370);
 fuel(empty.s);
 const bare=take(empty.s,0,'BLC-4-068');
 empty.s.players[0].hand.push(bare);
 let none=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:bare.uid,line:'front',slot:0});
 live(none,0,bare.uid).ready=false;
 none=dispatchUniversalAction(empty.packs,none,{type:'activate',uid:bare.uid,mode:'restFrontNameOnce'});
 assert.equal(live(none,0,bare.uid).ready,true);
 assert.equal(none.pending,null);
 const fight=main(deck,30371);
 const striker=put(fight.s,0,'BLC-1-080','front',0,true);
 striker.impactGranted={turn:fight.s.turn,stamp:striker.fieldEntryStamp,amount:1};
 const wall=put(fight.s,1,'BLC-4-068','front',0,true);
 const life=fight.s.players[1].life.length;
 let battle=fight.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(fight.packs,battle,{type:'next'});
 live(battle,0,striker.uid).ready=true;
 assert.ok(universalBp(fight.packs,battle,live(battle,0,striker.uid))>=universalBp(fight.packs,battle,live(battle,1,wall.uid)));
 battle=dispatchUniversalAction(fight.packs,battle,{type:'attack',uid:striker.uid});
 assert.ok(universalImpact(fight.packs,battle,live(battle,0,striker.uid))>0);
 battle=dispatchUniversalAction(fight.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,life);
 aiOk(played.packs,stood);
 assert.equal(assertUniversalMatch(played.packs,stood),true);
 assert.equal(assertUniversalMatch(skipped.packs,open),true);
 assert.equal(assertUniversalMatch(empty.packs,none),true);
 assert.equal(assertUniversalMatch(fight.packs,battle),true);
});

test('BLC-4-010 discards from the front only while Yhwach is on the field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-010');
 assert.equal(printed.effect,'啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：僅在自己場上有《友哈巴赫》時可發動；選1個對方場上BP1500以上的角色，本回合BP−1000。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 const card=bleach.cards['BLC-4-010'];
 assert.equal(card.name,'ペルニダ・パルンカジャス');
 assert.equal(card.energy,4);
 assert.equal(card.gen,1);
 assert.equal(card.bp,4000);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.requiresOwnName,'ユーハバッハ');
 assert.deepEqual(card.effects,{});
 const deck=realDeck(['BLC-4-010','BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021'],'yellow');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018'].entries())
   put(s,0,id,'energy',i,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const played=main(deck,30410);
 fuel(played.s);
 assert.equal(['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018'].reduce((n,id)=>n+bleach.cards[id].gen,0),4);
 const yhwach=put(played.s,0,'BLC-1-021','front',1,true);
 assert.equal(cardHasName(bleach.cards[yhwach.cardId],'ユーハバッハ'),true);
 const handCard=take(played.s,0,'BLC-4-010');
 const payment=take(played.s,0,'BLC-1-001');
 played.s.players[0].hand.push(handCard,payment);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:handCard.uid,line:'front',slot:0});
 const self=live(entered,0,handCard.uid);
 assert.equal(self.ready,false);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='oncePay'),true);
 const displaced=entered.players[0].energy[3];
 entered.players[0].energy[3]=null;
 entered.players[0].deck.push(displaced);
 const lined=put(entered,0,'BLC-4-010','energy',3,true);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===lined.uid&&a.mode==='oncePay'),false);
 const quiet=put(entered,0,'BLC-4-010','front',2,false);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===quiet.uid&&a.mode==='oncePay'),true);
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,sourceUid:yhwach.uid,
  targetUid:quiet.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===quiet.uid&&a.mode==='oncePay'),false);
 const high=put(entered,1,'BLC-1-002','energy',0,true);
 const low=put(entered,1,'BLC-1-012','front',0,true);
 low.buffs=[{bp:-1000,untilTurn:entered.turn}];
 assert.ok(universalBp(played.packs,entered,low)<1500);
 assert.ok(universalBp(played.packs,entered,high)>=1500);
 const before=universalBp(played.packs,entered,high);
 entered=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(entered.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),false);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseDiscardGate',uid:payment.uid});
 assert.equal(entered.players[0].outside.some(c=>c.uid===payment.uid),true);
 assert.equal(entered.pending.kind,'effect-target');
 const targets=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(targets.includes(high.uid),true);
 assert.equal(targets.includes(low.uid),false);
 assert.equal(targets.includes(null),false);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseTarget',uid:high.uid});
 assert.equal(universalBp(played.packs,entered,live(entered,1,high.uid)),before-1000);
 assert.equal(entered.pending,null);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='oncePay'),false);
 const secondPay=take(entered,0,'BLC-1-018');
 entered.players[0].hand.push(secondPay);
 const fresh=put(entered,1,'BLC-1-001','energy',1,true);
 const copy=put(entered,0,'BLC-4-010','front',3,false);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===copy.uid&&a.mode==='oncePay'),true);
 let again=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:copy.uid,mode:'oncePay'});
 again=dispatchUniversalAction(played.packs,again,{type:'chooseDiscardGate',uid:secondPay.uid});
 assert.equal(again.pending.kind,'effect-target');
 const nextTargets=legalUniversalActions(played.packs,again).filter(a=>a.type==='chooseTarget').map(a=>a.uid);
 assert.equal(nextTargets.includes(fresh.uid),true);
 assert.equal(nextTargets.includes(high.uid),false);
 const absent=main(deck,30411);
 fuel(absent.s);
 const bare=take(absent.s,0,'BLC-4-010');
 const spare=take(absent.s,0,'BLC-1-001');
 absent.s.players[0].hand.push(bare,spare);
 let closed=dispatchUniversalAction(absent.packs,absent.s,{type:'play',uid:bare.uid,line:'front',slot:0});
 assert.equal(legalUniversalActions(absent.packs,closed).some(a=>a.uid===bare.uid&&a.mode==='oncePay'),false);
 const held=closed.players[0].energy[0];
 closed.players[0].energy[0]=null;
 closed.players[0].deck.push(held);
 const yh=put(closed,0,'BLC-1-021','energy',0,true);
 assert.equal(cardHasName(bleach.cards[yh.cardId],'ユーハバッハ'),true);
 assert.equal(legalUniversalActions(absent.packs,closed).some(a=>a.uid===bare.uid&&a.mode==='oncePay'),true);
 const empty=main(deck,30412);
 fuel(empty.s);
 const actor=take(empty.s,0,'BLC-4-010');
 const dumped=take(empty.s,0,'BLC-1-001');
 empty.s.players[0].hand.push(actor,dumped);
 put(empty.s,0,'BLC-1-021','front',1,true);
 const small=put(empty.s,1,'BLC-1-012','front',0,true);
 small.buffs=[{bp:-1000,untilTurn:empty.s.turn}];
 let none=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 none=dispatchUniversalAction(empty.packs,none,{type:'activate',uid:actor.uid,mode:'oncePay'});
 none=dispatchUniversalAction(empty.packs,none,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.some(c=>c.uid===dumped.uid),true);
 aiOk(played.packs,entered);
 assert.equal(assertUniversalMatch(played.packs,again),true);
 assert.equal(assertUniversalMatch(absent.packs,closed),true);
 assert.equal(assertUniversalMatch(empty.packs,none),true);
});

test('BLC-2-024 gains 500 on its turn and REST-plays one traitless blue character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-024');
 assert.equal(printed.effect,'己方回合中，此角色 BP +500。登場：若本回合己方曾將手牌送至場外，可從手牌將最多 1 張需求能源 1 以下、AP 消耗 1、且不具有特徵的藍色角色卡，以 REST 登場於己方場上。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.bp,3500);
 const card=bleach.cards['BLC-2-024'];
 assert.equal(card.name,'四楓院 夜一');
 assert.equal(card.bp,3500);
 assert.equal(card.ownTurnBp,500);
 assert.equal(card.energy,4);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.equal(card.effects.onPlay[0].traitless,true);
 const deck=realDeck(['BLC-2-024','BLC-2-017','BLC-2-016','BLC-2-031','BLC-2-022','BLC-4-030','BLC-2-025','BLC-2-023','BLC-4-022','BLC-2-018'],'blue');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-2-016','BLC-2-031','BLC-2-022','BLC-4-030'].entries())
   put(s,0,id,'energy',i,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const quiet=main(deck,30420);
 fuel(quiet.s);
 const bare=take(quiet.s,0,'BLC-2-024');
 const cheap=take(quiet.s,0,'BLC-2-016');
 quiet.s.players[0].hand.push(bare,cheap);
 let closed=dispatchUniversalAction(quiet.packs,quiet.s,{type:'play',uid:bare.uid,line:'front',slot:0});
 assert.equal(closed.pending,null);
 assert.equal(universalBp(quiet.packs,closed,live(closed,0,bare.uid)),4000);
 grantContinuousState(closed,{kind:'originalEffectsDisabled',controller:1,sourceUid:cheap.uid,
  targetUid:bare.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalBp(quiet.packs,closed,live(closed,0,bare.uid)),3500);
 const played=main(deck,30421);
 fuel(played.s);
 const payer=put(played.s,0,'BLC-2-017','front',1,false);
 const dumped=take(played.s,0,'BLC-2-025');
 const legal=take(played.s,0,'BLC-2-023');
 const traited=take(played.s,0,'BLC-2-025');
 const costly=take(played.s,0,'BLC-2-018');
 const heavy=take(played.s,0,'BLC-4-022');
 const actor=take(played.s,0,'BLC-2-024');
 played.s.players[0].hand.push(dumped,legal,traited,costly,heavy,actor);
 assert.equal(legalUniversalActions(played.packs,played.s).some(a=>a.uid===payer.uid&&a.mode==='oncePay'),true);
 let paid=dispatchUniversalAction(played.packs,played.s,{type:'activate',uid:payer.uid,mode:'oncePay'});
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseDiscardGate',uid:dumped.uid});
 assert.equal(paid.players[0].outside.some(c=>c.uid===dumped.uid),true);
 let entered=dispatchUniversalAction(played.packs,paid,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(universalBp(played.packs,entered,live(entered,0,actor.uid)),4000);
 assert.equal(entered.pending.kind,'effect-hand-rest');
 const choices=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseHandRest');
 const ids=uid=>choices.some(a=>a.uid===uid);
 assert.equal(ids(legal.uid),true);
 assert.equal(ids(traited.uid),false);
 assert.equal(ids(costly.uid),false);
 assert.equal(ids(heavy.uid),false);
 assert.equal(ids(null),true);
 aiOk(played.packs,entered);
 const skipped=dispatchUniversalAction(played.packs,entered,{type:'chooseHandRest',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===legal.uid),true);
 const again=main(deck,30422);
 fuel(again.s);
 const gate=put(again.s,0,'BLC-2-017','front',1,false);
 const pay=take(again.s,0,'BLC-2-025');
 const seat=take(again.s,0,'BLC-2-023');
 const self=take(again.s,0,'BLC-2-024');
 again.s.players[0].hand.push(pay,seat,self);
 let open=dispatchUniversalAction(again.packs,again.s,{type:'activate',uid:gate.uid,mode:'oncePay'});
 open=dispatchUniversalAction(again.packs,open,{type:'chooseDiscardGate',uid:pay.uid});
 open=dispatchUniversalAction(again.packs,open,{type:'play',uid:self.uid,line:'front',slot:0});
 const action=legalUniversalActions(again.packs,open).find(a=>a.type==='chooseHandRest'&&a.uid===seat.uid&&a.line==='front');
 assert.ok(action);
 open=dispatchUniversalAction(again.packs,open,action);
 const rested=live(open,0,seat.uid);
 assert.equal(rested.ready,false);
 assert.equal(open.players[0].front.some(c=>c?.uid===seat.uid),true);
 assert.equal(open.pending,null);
 let opp=open;
 for(let n=0;n<12&&opp.active===0;n++)
  opp=dispatchUniversalAction(again.packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 assert.equal(universalBp(again.packs,opp,live(opp,0,self.uid)),3500);
 aiOk(quiet.packs,closed);
 aiOk(again.packs,open);
 assert.equal(assertUniversalMatch(quiet.packs,closed),true);
 assert.equal(assertUniversalMatch(played.packs,skipped),true);
 assert.equal(assertUniversalMatch(again.packs,opp),true);
});

test('BLC-4-039 actives from the energy line and may discard to active a printed AP 2',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-039');
 assert.equal(printed.effect,'登場時〔能量線〕：若自己的前線有印刷消費AP為2以上的角色，將此角色改為Active。啟動・主要〔改為Rest〕：選自己場上另1個角色，本回合BP+1000；若所選角色的印刷消費AP為2以上，可將1張手牌送至場外，如此則將所選角色改為Active。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-039'];
 assert.equal(card.name,'朽木 ルキア');
 assert.equal(card.energy,2);
 assert.equal(card.ap,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'restBuffThenApActive');
 assert.equal(card.mainAbility.minAp,2);
 const deck=realDeck(['BLC-4-039','BLC-2-016','BLC-2-031','BLC-2-018','BLC-2-023','BLC-4-022'],'blue');
 const fuel=(s)=>{
  for(const [i,id] of ['BLC-2-016','BLC-2-031'].entries())
   put(s,0,id,'energy',i,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const fronted=main(deck,30430);
 fuel(fronted.s);
 put(fronted.s,0,'BLC-2-018','front',1,false);
 const frontCard=take(fronted.s,0,'BLC-4-039');
 fronted.s.players[0].hand.push(frontCard);
 let onFront=dispatchUniversalAction(fronted.packs,fronted.s,{type:'play',uid:frontCard.uid,line:'front',slot:0});
 assert.equal(live(onFront,0,frontCard.uid).ready,false);
 assert.equal(onFront.pending,null);
 const missed=main(deck,30431);
 fuel(missed.s);
 const onlyEnergy=put(missed.s,0,'BLC-4-022','energy',2,false);
 const missCard=take(missed.s,0,'BLC-4-039');
 missed.s.players[0].hand.push(missCard);
 let stayed=dispatchUniversalAction(missed.packs,missed.s,{type:'play',uid:missCard.uid,line:'energy',slot:3});
 assert.equal(live(stayed,0,missCard.uid).ready,false);
 assert.equal(bleach.cards[onlyEnergy.cardId].ap,2);
 const played=main(deck,30432);
 fuel(played.s);
 const heavy=put(played.s,0,'BLC-2-018','front',1,false);
 const small=put(played.s,0,'BLC-2-023','front',2,false);
 const spare=take(played.s,0,'BLC-2-016');
 const actor=take(played.s,0,'BLC-4-039');
 played.s.players[0].hand.push(spare,actor);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:actor.uid,line:'energy',slot:2});
 const self=live(entered,0,actor.uid);
 assert.equal(self.ready,true);
 assert.equal(entered.pending,null);
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='restBuffAp'),true);
 const alone=put(entered,0,'BLC-4-039','front',0,true);
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,sourceUid:heavy.uid,
  targetUid:alone.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===alone.uid&&a.mode==='restBuffAp'),false);
 const before=universalBp(played.packs,entered,small);
 entered=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'restBuffAp'});
 assert.equal(live(entered,0,self.uid).ready,false);
 assert.equal(entered.pending.kind,'effect-buff-own');
 const buffs=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseOwnBuff').map(a=>a.uid);
 assert.equal(buffs.includes(small.uid),true);
 assert.equal(buffs.includes(heavy.uid),true);
 assert.equal(buffs.includes(self.uid),false);
 assert.equal(buffs.includes(null),false);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseOwnBuff',uid:small.uid});
 assert.equal(universalBp(played.packs,entered,live(entered,0,small.uid)),before+1000);
 assert.equal(live(entered,0,small.uid).ready,false);
 assert.equal(entered.pending,null);
 live(entered,0,self.uid).ready=true;
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.uid===self.uid&&a.mode==='restBuffAp'),true);
 const lined=put(entered,0,'BLC-4-022','energy',3,false);
 const linedBefore=universalBp(played.packs,entered,lined);
 entered=dispatchUniversalAction(played.packs,entered,{type:'activate',uid:self.uid,mode:'restBuffAp'});
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseOwnBuff',uid:lined.uid});
 assert.equal(universalBp(played.packs,entered,live(entered,0,lined.uid)),linedBefore+1000);
 assert.equal(entered.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(played.packs,entered).some(a=>a.type==='chooseDiscardGate'&&a.uid===null),true);
 const skipped=dispatchUniversalAction(played.packs,entered,{type:'chooseDiscardGate',uid:null});
 assert.equal(live(skipped,0,lined.uid).ready,false);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===spare.uid),true);
 live(skipped,0,self.uid).ready=true;
 let paid=dispatchUniversalAction(played.packs,skipped,{type:'activate',uid:self.uid,mode:'restBuffAp'});
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseOwnBuff',uid:heavy.uid});
 assert.equal(paid.pending.kind,'effect-discard-gate');
 aiOk(played.packs,paid);
 paid=dispatchUniversalAction(played.packs,paid,{type:'chooseDiscardGate',uid:spare.uid});
 assert.equal(paid.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(live(paid,0,heavy.uid).ready,true);
 assert.equal(paid.pending,null);
 const empty=main(deck,30433);
 fuel(empty.s);
 const wall=put(empty.s,0,'BLC-2-018','front',1,false);
 const bare=take(empty.s,0,'BLC-4-039');
 empty.s.players[0].hand.push(bare);
 let quiet=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:bare.uid,line:'energy',slot:2});
 assert.equal(live(quiet,0,bare.uid).ready,true);
 quiet.players[0].deck.push(...quiet.players[0].hand.splice(0));
 assert.equal(quiet.players[0].hand.length,0);
 quiet=dispatchUniversalAction(empty.packs,quiet,{type:'activate',uid:bare.uid,mode:'restBuffAp'});
 quiet=dispatchUniversalAction(empty.packs,quiet,{type:'chooseOwnBuff',uid:wall.uid});
 assert.equal(quiet.pending,null);
 assert.equal(live(quiet,0,wall.uid).ready,false);
 const solo=main(deck,30434);
 const only=put(solo.s,0,'BLC-4-039','front',0,true);
 assert.equal(legalUniversalActions(solo.packs,solo.s).some(a=>a.uid===only.uid&&a.mode==='restBuffAp'),false);
 aiOk(played.packs,entered);
 aiOk(empty.packs,quiet);
 assert.equal(assertUniversalMatch(fronted.packs,onFront),true);
 assert.equal(assertUniversalMatch(missed.packs,stayed),true);
 assert.equal(assertUniversalMatch(played.packs,paid),true);
 assert.equal(assertUniversalMatch(empty.packs,quiet),true);
 assert.equal(assertUniversalMatch(solo.packs,solo.s),true);
});

test('BLC-3-003 chooses BP+1000 or BP+3000 that retires at attack end',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-3-003');
 assert.equal(printed.effect,'【登場時】選擇以下一項：\n・可以選擇最多 1 張自己場上的其他角色，在本回合中 BP＋1000。\n・可以選擇最多 1 張自己場上的其他角色，在本回合中 BP＋3000，並賦予「此角色的攻擊結束時，將此角色退場」。');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-3-003'];
 assert.equal(card.name,'涅 マユリ');
 assert.equal(card.energy,1);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 const deck=realDeck(['BLC-3-003','BLC-2-016','BLC-2-023','BLC-2-022','BLC-2-018','BLC-2-044'],'blue');
 const fuel=s=>{
  put(s,0,'BLC-2-016','energy',0,true);
  s.players[0].apCards[0].inPlay=true;
  s.players[0].apCards[0].ready=true;
 };
 const finishAttack=(packs,s,attacker)=>{
  let battle=s;
  for(let n=0;n<6&&battle.phase!=='attack';n++)
   battle=dispatchUniversalAction(packs,battle,{type:'next'});
  live(battle,0,attacker).ready=true;
  const life=battle.players[1].life.length;
  battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:attacker});
  if(battle.pending?.kind==='block')
   battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:null},{actor:1});
  while(battle.pending?.kind==='life-trigger')
   battle=dispatchUniversalAction(packs,battle,{type:'chooseTrigger',mode:'skip'},{actor:1});
  return {battle,life};
 };
 const played=main(deck,30440);
 fuel(played.s);
 const ally=put(played.s,0,'BLC-2-023','front',1,true);
 const actor=take(played.s,0,'BLC-3-003');
 played.s.players[0].hand.push(actor);
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(entered.pending.kind,'effect-choice-mode');
 const modes=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseEffectMode').map(a=>a.mode);
 assert.deepEqual(modes.sort(),['retire','small']);
 aiOk(played.packs,entered);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(entered.pending.kind,'effect-buff-own');
 const choices=legalUniversalActions(played.packs,entered).filter(a=>a.type==='chooseOwnBuff').map(a=>a.uid);
 assert.equal(choices.includes(ally.uid),true);
 assert.equal(choices.includes(actor.uid),false);
 assert.equal(choices.includes(null),true);
 entered=dispatchUniversalAction(played.packs,entered,{type:'chooseOwnBuff',uid:ally.uid});
 const granted=live(entered,0,ally.uid);
 assert.equal(universalBp(played.packs,entered,granted),bleach.cards['BLC-2-023'].bp+3000);
 assert.equal(granted.attackEndRetireGranted.turn,entered.turn);
 assert.equal(granted.attackEndRetireGranted.stamp,granted.fieldEntryStamp);
 assert.equal(granted.attackEndRetireGranted.sourceUid,actor.uid);
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,sourceUid:actor.uid,
  targetUid:ally.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(live(entered,0,ally.uid).attackEndRetireGranted.stamp,granted.fieldEntryStamp);
 const direct=finishAttack(played.packs,entered,ally.uid);
 assert.equal(direct.battle.players[0].outside.some(c=>c.uid===ally.uid),true);
 assert.equal(direct.battle.players[1].life.length,direct.life-1);
 assert.equal(direct.battle.pending,null);
 const small=main(deck,30441);
 fuel(small.s);
 const mild=put(small.s,0,'BLC-2-023','front',1,true);
 const self=take(small.s,0,'BLC-3-003');
 small.s.players[0].hand.push(self);
 let mildPlay=dispatchUniversalAction(small.packs,small.s,{type:'play',uid:self.uid,line:'front',slot:0});
 mildPlay=dispatchUniversalAction(small.packs,mildPlay,{type:'chooseEffectMode',mode:'small'});
 mildPlay=dispatchUniversalAction(small.packs,mildPlay,{type:'chooseOwnBuff',uid:mild.uid});
 assert.equal(universalBp(small.packs,mildPlay,live(mildPlay,0,mild.uid)),bleach.cards['BLC-2-023'].bp+1000);
 assert.equal(live(mildPlay,0,mild.uid).attackEndRetireGranted,undefined);
 const stayed=finishAttack(small.packs,mildPlay,mild.uid);
 assert.equal(live(stayed.battle,0,mild.uid).uid,mild.uid);
 assert.equal(stayed.battle.players[0].front.some(c=>c?.uid===mild.uid),true);
 const skipped=main(deck,30442);
 fuel(skipped.s);
 const other=put(skipped.s,0,'BLC-2-023','front',1,true);
 const source=take(skipped.s,0,'BLC-3-003');
 skipped.s.players[0].hand.push(source);
 let declined=dispatchUniversalAction(skipped.packs,skipped.s,{type:'play',uid:source.uid,line:'front',slot:0});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseEffectMode',mode:'retire'});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseOwnBuff',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(live(declined,0,other.uid).attackEndRetireGranted,undefined);
 assert.equal(universalBp(skipped.packs,declined,live(declined,0,other.uid)),bleach.cards['BLC-2-023'].bp);
 const alone=main(deck,30443);
 put(alone.s,0,'BLC-2-044','energy',0,true);
 alone.s.players[0].apCards[0].inPlay=true;
 alone.s.players[0].apCards[0].ready=true;
 const lone=take(alone.s,0,'BLC-3-003');
 alone.s.players[0].hand.push(lone);
 let empty=dispatchUniversalAction(alone.packs,alone.s,{type:'play',uid:lone.uid,line:'front',slot:0});
 empty=dispatchUniversalAction(alone.packs,empty,{type:'chooseEffectMode',mode:'small'});
 assert.equal(empty.pending,null);
 const won=main(deck,30444);
 fuel(won.s);
 const striker=put(won.s,0,'BLC-2-023','front',1,true);
 const wall=put(won.s,1,'BLC-2-022','front',0,true);
 const giver=take(won.s,0,'BLC-3-003');
 won.s.players[0].hand.push(giver);
 let armed=dispatchUniversalAction(won.packs,won.s,{type:'play',uid:giver.uid,line:'front',slot:0});
 armed=dispatchUniversalAction(won.packs,armed,{type:'chooseEffectMode',mode:'retire'});
 armed=dispatchUniversalAction(won.packs,armed,{type:'chooseOwnBuff',uid:striker.uid});
 let clash=armed;
 for(let n=0;n<6&&clash.phase!=='attack';n++)
  clash=dispatchUniversalAction(won.packs,clash,{type:'next'});
 live(clash,0,striker.uid).ready=true;
 const lives=clash.players[1].life.length;
 clash=dispatchUniversalAction(won.packs,clash,{type:'attack',uid:striker.uid});
 assert.equal(clash.pending.kind,'block');
 clash=dispatchUniversalAction(won.packs,clash,{type:'chooseBlock',uid:wall.uid},{actor:1});
 while(clash.pending?.kind==='life-trigger')
  clash=dispatchUniversalAction(won.packs,clash,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(clash.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(clash.players[0].outside.some(c=>c.uid===striker.uid),true);
 assert.equal(clash.players[1].life.length,lives);
 const held=main(deck,30445);
 fuel(held.s);
 const parked=put(held.s,0,'BLC-2-023','front',1,true);
 const mayuri=take(held.s,0,'BLC-3-003');
 held.s.players[0].hand.push(mayuri);
 let marked=dispatchUniversalAction(held.packs,held.s,{type:'play',uid:mayuri.uid,line:'front',slot:0});
 marked=dispatchUniversalAction(held.packs,marked,{type:'chooseEffectMode',mode:'retire'});
 marked=dispatchUniversalAction(held.packs,marked,{type:'chooseOwnBuff',uid:parked.uid});
 let later=marked;
 for(let n=0;n<12&&later.active===0;n++)
  later=dispatchUniversalAction(held.packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(live(later,0,parked.uid).attackEndRetireGranted,undefined);
 assert.equal(universalBp(held.packs,later,live(later,0,parked.uid)),bleach.cards['BLC-2-023'].bp);
 aiOk(small.packs,mildPlay);
 aiOk(skipped.packs,declined);
 assert.equal(assertUniversalMatch(played.packs,direct.battle),true);
 assert.equal(assertUniversalMatch(small.packs,stayed.battle),true);
 assert.equal(assertUniversalMatch(skipped.packs,declined),true);
 assert.equal(assertUniversalMatch(alone.packs,empty),true);
 assert.equal(assertUniversalMatch(won.packs,clash),true);
 assert.equal(assertUniversalMatch(held.packs,later),true);
});

test('BLC-4-072 may discard one hand card and REST an affordable AP 1 visored character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-072');
 assert.equal(printed.effect,'登場時：可將1張手牌送至場外；如此則可從場外將最多1張能量需求已滿足、消費AP1且具有「假面軍勢」特徵的卡以Rest登場（可選剛丟棄的卡）。');
 assert.equal(printed.nameJa,'平子 真子');
 assert.equal(printed.number,'EX15BT/BLC-4-072');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.color,'green');
 const card=bleach.cards['BLC-4-072'];
 assert.equal(card.name,'平子 真子');
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(cardHasTrait(card,'假面軍勢'),false);
 assert.equal(cardHasTrait(bleach.cards['BLC-4-061'],'假面軍勢'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-4-062'],'假面軍勢'),true);
 const program=[{op:'discardGate',optional:true,then:[{op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true,requireAffordableEnergy:true}]}];
 assert.deepEqual(card.effects.onPlay,program);
 assert.equal(card.mainAbility,null);
 const bare={id:'BAD',name:'平子 真子',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:['假面軍勢'],trigger:null,implementation:'dsl',effects:{}};
 const visoredOp={op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true,requireAffordableEnergy:true};
 assert.throws(()=>createUniversalPack({id:'bad-ap',cards:[{...bare,effects:{onPlay:[{...visoredOp,ap:4}]}}]}),/invalid trait AP outside REST/);
 assert.throws(()=>createUniversalPack({id:'bad-zero',cards:[{...bare,effects:{onPlay:[{...visoredOp,ap:0}]}}]}),/invalid trait AP outside REST/);
 assert.throws(()=>createUniversalPack({id:'bad-opt',cards:[{...bare,effects:{onPlay:[{...visoredOp,optional:false}]}}]}),/invalid trait AP outside REST/);
 assert.throws(()=>createUniversalPack({id:'bad-energy',cards:[{...bare,effects:{onPlay:[{op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true}]}}]}),/invalid trait AP outside REST/);
 const deck=realDeck(['BLC-4-072','BLC-4-061','BLC-4-062','BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089','BLC-1-080'],'green');
 function fuel(s){
  for(const [i,id] of ['BLC-1-071','BLC-1-083','BLC-2-066','BLC-1-089'].entries())
   put(s,0,id,'energy',i);
 }
 const first=main(deck,30472);
 fuel(first.s);
 const lisa=take(first.s,0,'BLC-4-062');
 const kenpachi=take(first.s,0,'BLC-1-080');
 first.s.players[0].outside.push(lisa,kenpachi);
 const hiyori=take(first.s,0,'BLC-4-061');
 first.s.players[0].hand.push(hiyori);
 const hirako=take(first.s,0,'BLC-4-072');
 first.s.players[0].hand.push(hirako);
 let played=dispatchUniversalAction(first.packs,first.s,{type:'play',uid:hirako.uid,line:'front',slot:0});
 assert.equal(played.players[0].front.find(c=>c?.uid===hirako.uid).ready,false);
 assert.equal(played.pending.kind,'effect-discard-gate');
 assert.equal(played.pending.optional,true);
 aiOk(first.packs,played);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseDiscardGate',uid:hiyori.uid});
 assert.equal(played.pending.kind,'effect-outside-trait-ap-rest');
 assert.deepEqual([...played.pending.choices].sort(),[hiyori.uid,lisa.uid].sort());
 assert.equal(played.pending.choices.includes(kenpachi.uid),false);
 const shown=[...new Set(universalPrivateChoices(first.packs,played,0).options.filter(o=>o.card).map(o=>o.card.cardId))].sort();
 assert.deepEqual(shown,['BLC-4-061','BLC-4-062']);
 assert.equal(universalPrivateChoices(first.packs,played,1),null);
 const legal=legalUniversalActions(first.packs,played);
 assert.equal(legal.some(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===null),true);
 assert.equal(legal.some(a=>a.mode==='raid'),false);
 assert.equal(legal.some(a=>a.uid===kenpachi.uid),false);
 aiOk(first.packs,played);
 const seat=legal.find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===hiyori.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(seat);
 played=dispatchUniversalAction(first.packs,played,seat);
 assert.equal(played.pending,null);
 assert.equal(played.players[0].front.find(c=>c?.uid===hiyori.uid).ready,false);
 assert.equal(played.players[0].outside.some(c=>c.uid===lisa.uid),true);
 assert.equal(played.players[0].outside.some(c=>c.uid===hiyori.uid),false);
 const skipped=main(deck,30473);
 fuel(skipped.s);
 const parked=take(skipped.s,0,'BLC-4-062');
 skipped.s.players[0].outside.push(parked);
 const actor=take(skipped.s,0,'BLC-4-072');
 skipped.s.players[0].hand.push(actor);
 let declined=dispatchUniversalAction(skipped.packs,skipped.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 declined=dispatchUniversalAction(skipped.packs,declined,{type:'chooseDiscardGate',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].outside.some(c=>c.uid===parked.uid),true);
 const gated=main(deck,30474);
 fuel(gated.s);
 const needTwo=take(gated.s,0,'BLC-4-062');
 gated.s.players[0].outside.push(needTwo);
 const cheap=take(gated.s,0,'BLC-4-061');
 gated.s.players[0].hand.push(cheap);
 const payer=take(gated.s,0,'BLC-4-072');
 gated.s.players[0].hand.push(payer);
 let gate=dispatchUniversalAction(gated.packs,gated.s,{type:'play',uid:payer.uid,line:'front',slot:0});
 for(const slot of [1,2,3]){
  const held=gate.players[0].energy[slot];
  gate.players[0].energy[slot]=null;
  gate.players[0].deck.push(held);
 }
 assert.equal(universalEnergyByColor(gated.packs,gate,0).green,1);
 assert.equal(effectiveHandRequiredEnergy(gated.packs,gate,0,bleach.cards['BLC-4-062']),2);
 gate=dispatchUniversalAction(gated.packs,gate,{type:'chooseDiscardGate',uid:cheap.uid});
 assert.deepEqual(gate.pending.choices,[cheap.uid]);
 const energySeat=legalUniversalActions(gated.packs,gate).find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===cheap.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.ok(energySeat);
 gate=dispatchUniversalAction(gated.packs,gate,energySeat);
 assert.equal(gate.players[0].energy.find(c=>c?.uid===cheap.uid).ready,false);
 assert.equal(gate.players[0].outside.some(c=>c.uid===needTwo.uid),true);
 const quietBoard=main(deck,30475);
 fuel(quietBoard.s);
 const solo=take(quietBoard.s,0,'BLC-4-072');
 const waiting=take(quietBoard.s,0,'BLC-4-061');
 quietBoard.s.players[0].deck.push(...quietBoard.s.players[0].hand.splice(0));
 quietBoard.s.players[0].hand.push(solo);
 quietBoard.s.players[0].outside.push(waiting);
 let quiet=dispatchUniversalAction(quietBoard.packs,quietBoard.s,{type:'play',uid:solo.uid,line:'front',slot:0});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===waiting.uid),true);
 const miss=main(deck,30476);
 fuel(miss.s);
 const plain=take(miss.s,0,'BLC-1-080');
 miss.s.players[0].hand.push(plain);
 const source=take(miss.s,0,'BLC-4-072');
 miss.s.players[0].hand.push(source);
 let none=dispatchUniversalAction(miss.packs,miss.s,{type:'play',uid:source.uid,line:'front',slot:0});
 none=dispatchUniversalAction(miss.packs,none,{type:'chooseDiscardGate',uid:plain.uid});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].outside.some(c=>c.uid===plain.uid),true);
 const vanilla={...bare,implementation:'vanilla',effects:{},traits:[]};
 const fillers=Array.from({length:6},(_,i)=>({...vanilla,id:'F'+i,name:'余'+i}));
 const lab=createUniversalPack({id:'lab-hirako',cards:[
  {...bare,id:'SRC',traits:[],effects:{onPlay:program}},
  {...vanilla,id:'VIS',name:'猿柿',traits:['假面軍勢']},
  {...vanilla,id:'COST',name:'リサ',energy:2,traits:['假面軍勢']},
  {...vanilla,id:'AP2',name:'高AP',ap:2,traits:['假面軍勢']},
  {...bare,id:'BAN',name:'前線禁止',frontForbidden:true,traits:['假面軍勢'],effects:{onPlay:[{op:'draw',count:1}]}},
  {...bare,id:'RAID',name:'レイド',raidName:'レイド',traits:['假面軍勢'],effects:{onPlay:[{op:'draw',count:1}]}},
  {...vanilla,id:'BASE',name:'レイド',gen:1},
  ...fillers]});
 const labIds=['SRC','VIS','COST','AP2','BAN','RAID','BASE',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let board=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30477,first:0});
 for(let n=0;n<8&&board.phase!=='main';n++)
  board=dispatchUniversalAction(labPacks,board,{type:'next'});
 put(board,0,'BASE','energy',0);
 put(board,0,'BASE','energy',1);
 const vis=take(board,0,'VIS');
 const cost=take(board,0,'COST');
 const ap2=take(board,0,'AP2');
 const ban=take(board,0,'BAN');
 const raid=take(board,0,'RAID');
 board.players[0].outside.push(vis,cost,ap2,ban,raid);
 const pay=take(board,0,'F0');
 board.players[0].hand.push(pay);
 const src=take(board,0,'SRC');
 board.players[0].hand.push(src);
 let opened=dispatchUniversalAction(labPacks,board,{type:'play',uid:src.uid,line:'front',slot:0});
 opened=dispatchUniversalAction(labPacks,opened,{type:'chooseDiscardGate',uid:pay.uid});
 assert.deepEqual([...opened.pending.choices].sort(),[vis.uid,cost.uid,ban.uid,raid.uid].sort());
 const openedLegal=legalUniversalActions(labPacks,opened);
 assert.equal(openedLegal.some(a=>a.mode==='raid'),false);
 assert.equal(openedLegal.some(a=>a.uid===ban.uid&&a.line==='front'),false);
 assert.equal(openedLegal.some(a=>a.uid===ban.uid&&a.line==='energy'),true);
 assert.equal(openedLegal.some(a=>a.uid===raid.uid&&a.line==='front'),true);
 assert.equal(openedLegal.some(a=>a.uid===ap2.uid),false);
 const deckBefore=opened.players[0].deck.length;
 const raidSeat=openedLegal.find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===raid.uid&&a.line==='front'&&a.replaceUid===undefined);
 opened=dispatchUniversalAction(labPacks,opened,raidSeat);
 assert.equal(opened.pending,null);
 assert.equal(opened.players[0].front.find(c=>c?.uid===raid.uid).ready,false);
 assert.equal(opened.players[0].deck.length,deckBefore-1);
 let banned=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30478,first:0});
 for(let n=0;n<8&&banned.phase!=='main';n++)
  banned=dispatchUniversalAction(labPacks,banned,{type:'next'});
 put(banned,0,'BASE','energy',0);
 const blocked=take(banned,0,'BAN');
 const pricey=take(banned,0,'COST');
 banned.players[0].outside.push(blocked,pricey);
 const toll=take(banned,0,'F0');
 banned.players[0].hand.push(toll);
 const again=take(banned,0,'SRC');
 banned.players[0].hand.push(again);
 let narrow=dispatchUniversalAction(labPacks,banned,{type:'play',uid:again.uid,line:'front',slot:0});
 narrow=dispatchUniversalAction(labPacks,narrow,{type:'chooseDiscardGate',uid:toll.uid});
 assert.deepEqual(narrow.pending.choices,[blocked.uid]);
 const banSeat=legalUniversalActions(labPacks,narrow).find(a=>a.type==='chooseOutsideTraitApRest'&&a.uid===blocked.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.ok(banSeat);
 narrow=dispatchUniversalAction(labPacks,narrow,banSeat);
 assert.equal(narrow.pending,null);
 assert.equal(narrow.players[0].energy.find(c=>c?.uid===blocked.uid).ready,false);
 assert.equal(narrow.players[0].front.some(c=>c?.uid===blocked.uid),false);
 assert.equal(narrow.players[0].outside.some(c=>c.uid===pricey.uid),true);
 aiOk(first.packs,played);
 assert.equal(assertUniversalMatch(first.packs,played),true);
 assert.equal(assertUniversalMatch(skipped.packs,declined),true);
 assert.equal(assertUniversalMatch(gated.packs,gate),true);
 assert.equal(assertUniversalMatch(quietBoard.packs,quiet),true);
 assert.equal(assertUniversalMatch(miss.packs,none),true);
 assert.equal(assertUniversalMatch(labPacks,opened),true);
 assert.equal(assertUniversalMatch(labPacks,narrow),true);
});

test('BLC-1-026 lets any own Raid character raid onto it and waives printed conditions',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-026');
 assert.equal(printed.effect,'己方具有 Raid 的角色卡可在此角色上 Raid。');
 assert.equal(printed.nameJa,'ロイド・ロイド（R）');
 assert.equal(printed.number,'UA08BT/BLC-1-026');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,1);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,2000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.color,'yellow');
 const card=bleach.cards['BLC-1-026'];
 assert.equal(card.name,'ロイド・ロイド（R）');
 assert.equal(card.raidHostAny,true);
 assert.equal(card.raidName,null);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.traits,['星十字騎士團']);
 const bare={id:'BAD',name:'宿主',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},raidHostAny:true};
 assert.throws(()=>createUniversalPack({id:'bad-host-event',cards:[{...bare,id:'EV',type:'event',bp:0}]}),/invalid Raid host/);
 assert.throws(()=>createUniversalPack({id:'bad-host-flag',cards:[{...bare,id:'FL',raidHostAny:false,effects:{onPlay:[{op:'draw',count:1}]}}]}),/invalid Raid host/);
 assert.throws(()=>createUniversalPack({id:'bad-host-raid',cards:[{...bare,id:'RD',raidName:'標的'}]}),/invalid Raid host/);
 assert.throws(()=>createUniversalPack({id:'bad-host-vanilla',cards:[{...bare,id:'VA',implementation:'vanilla'}]}),/claims vanilla despite printed\/declared effects/);
 const deck=realDeck(['BLC-1-026','BLC-1-004','BLC-1-002','BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-021'],'yellow');
 const wrong=plainId(deck,3000,['BLC-1-026','BLC-1-004','BLC-1-002','BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-021']);
 function fuel(s){
  for(const [i,id] of ['BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-021'].entries())
   put(s,0,id,'energy',i);
 }
 const first=main(deck,30526);
 fuel(first.s);
 const host=put(first.s,0,'BLC-1-026','front',0);
 const named=put(first.s,0,'BLC-1-002','front',1);
 const other=put(first.s,0,wrong,'front',2);
 const rider=take(first.s,0,'BLC-1-004');
 const second=take(first.s,0,'BLC-1-004');
 first.s.players[0].hand.push(rider,second);
 const raids=()=>legalUniversalActions(first.packs,first.s).filter(a=>a.type==='raid');
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===host.uid&&a.slot===0),true);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===host.uid&&a.slot!==0),false);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===named.uid&&a.slot===1),true);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===other.uid),false);
 assert.equal(raids().some(a=>a.uid===second.uid&&a.baseUid===host.uid),true);
 grantContinuousState(first.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:other.uid,
  targetUid:host.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(raids().some(a=>a.baseUid===host.uid),false);
 assert.equal(raids().some(a=>a.uid===rider.uid&&a.baseUid===named.uid),true);
 assert.equal(raids().some(a=>a.baseUid===other.uid),false);
 first.s.continuousStates=[];
 let stacked=dispatchUniversalAction(first.packs,first.s,{type:'raid',uid:rider.uid,baseUid:host.uid,slot:0});
 assert.equal(stacked.pending,null);
 const top=stacked.players[0].front[0];
 assert.equal(top.cardId,'BLC-1-004');
 assert.equal(top.ready,true);
 assert.equal(top.stack.length,1);
 assert.equal(top.stack[0].cardId,'BLC-1-026');
 assert.equal(top.stack[0].uid,host.uid);
 assert.equal(top.stack[0].faceDown,undefined);
 assert.equal(stacked.players[0].front[1].cardId,'BLC-1-002');
 stacked.players[0].apCards.forEach(c=>{if(c.inPlay)c.ready=true;});
 const after=legalUniversalActions(first.packs,stacked).filter(a=>a.type==='raid');
 assert.equal(after.some(a=>a.uid===second.uid&&a.baseUid===top.uid),false);
 assert.equal(after.some(a=>a.uid===second.uid&&a.baseUid===named.uid&&a.slot===1),true);
 assert.equal(after.some(a=>a.baseUid===host.uid),false);
 const lined=main(deck,30527);
 for(const [i,id] of ['BLC-1-001','BLC-1-012','BLC-1-018'].entries())
  put(lined.s,0,id,'energy',i);
 const energyHost=put(lined.s,0,'BLC-1-026','energy',3);
 const stillNamed=put(lined.s,0,'BLC-1-002','front',0);
 const energyRider=take(lined.s,0,'BLC-1-004');
 lined.s.players[0].hand.push(energyRider);
 const energyRaids=legalUniversalActions(lined.packs,lined.s).filter(a=>a.type==='raid'&&a.uid===energyRider.uid);
 assert.equal(energyRaids.some(a=>a.baseUid===energyHost.uid&&a.slot===1),true);
 assert.equal(energyRaids.some(a=>a.baseUid===stillNamed.uid&&a.slot===0),true);
 let moved=dispatchUniversalAction(lined.packs,lined.s,{type:'raid',uid:energyRider.uid,baseUid:energyHost.uid,slot:1});
 assert.equal(moved.players[0].energy[3],null);
 assert.equal(moved.players[0].front[1].cardId,'BLC-1-004');
 assert.equal(moved.players[0].front[1].stack[0].uid,energyHost.uid);
 assert.equal(moved.players[0].front[0].cardId,'BLC-1-002');
 const unit=(id,extra)=>({id,name:id,color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const fillers=Array.from({length:9},(_,i)=>unit('F'+i));
 const lab=createUniversalPack({id:'lab-raid-host',cards:[
  unit('HOST',{implementation:'dsl',raidHostAny:true,name:'ロイド・ロイド（R）'}),
  unit('NEED',{implementation:'dsl',raidName:'標的',raidRequiresNames:['不在場'],name:'條件突襲',effects:{onPlay:[{op:'draw',count:1}]}}),
  unit('NAMED',{name:'標的'}),
  unit('GATE',{name:'不在場'}),
  ...fillers]});
 const labIds=['HOST','NEED','NAMED','GATE',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let board=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30528,first:0});
 for(let n=0;n<8&&board.phase!=='main';n++)
  board=dispatchUniversalAction(labPacks,board,{type:'next'});
 const labHost=put(board,0,'HOST','front',0);
 const labNamed=put(board,0,'NAMED','front',1);
 const need=take(board,0,'NEED');
 board.players[0].hand.push(need);
 const labRaids=()=>legalUniversalActions(labPacks,board).filter(a=>a.type==='raid'&&a.uid===need.uid);
 assert.equal(labRaids().some(a=>a.baseUid===labHost.uid),true);
 assert.equal(labRaids().some(a=>a.baseUid===labNamed.uid),false);
 const gate=put(board,0,'GATE','front',2);
 assert.equal(labRaids().some(a=>a.baseUid===labNamed.uid&&a.slot===1),true);
 assert.equal(labRaids().some(a=>a.baseUid===labHost.uid),true);
 grantContinuousState(board,{kind:'originalEffectsDisabled',controller:1,sourceUid:gate.uid,
  targetUid:labHost.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(labRaids().some(a=>a.baseUid===labHost.uid),false);
 assert.equal(labRaids().some(a=>a.baseUid===labNamed.uid),true);
 board.continuousStates=[];
 const deckBefore=board.players[0].deck.length;
 let waived=dispatchUniversalAction(labPacks,board,{type:'raid',uid:need.uid,baseUid:labHost.uid,slot:0});
 assert.equal(waived.players[0].front[0].cardId,'NEED');
 assert.equal(waived.players[0].front[0].stack[0].uid,labHost.uid);
 assert.equal(waived.players[0].deck.length,deckBefore-1);
 aiOk(first.packs,stacked);
 assert.equal(assertUniversalMatch(first.packs,stacked),true);
 assert.equal(assertUniversalMatch(lined.packs,moved),true);
 assert.equal(assertUniversalMatch(labPacks,waived),true);
});

test('BLC-1-025 replaces its block BP before the battle comparison',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-025');
 assert.equal(printed.effect,'阻擋時：此角色本回合 BP −1000；若攻擊中的敵方角色處於 Raid 狀態，改為 BP +1000。');
 assert.equal(printed.nameJa,'ロイド・ロイド（L）');
 assert.equal(printed.number,'UA08BT/BLC-1-025');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,3500);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.color,'yellow');
 const card=bleach.cards['BLC-1-025'];
 assert.equal(card.name,'ロイド・ロイド（L）');
 assert.deepEqual(card.blockRaidBp,{plain:-1000,raid:1000});
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(card.traits,['星十字騎士團']);
 const bare={id:'BAD',name:'阻擋',color:'yellow',type:'character',energy:0,ap:1,bp:3500,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{},blockRaidBp:{plain:-1000,raid:1000}};
 assert.throws(()=>createUniversalPack({id:'bad-block-event',cards:[{...bare,type:'event',bp:0}]}),/invalid block Raid BP shift/);
 assert.throws(()=>createUniversalPack({id:'bad-block-zero',cards:[{...bare,blockRaidBp:{plain:0,raid:1000}}]}),/invalid block Raid BP shift/);
 assert.throws(()=>createUniversalPack({id:'bad-block-same',cards:[{...bare,blockRaidBp:{plain:-1000,raid:-1000}}]}),/invalid block Raid BP shift/);
 assert.throws(()=>createUniversalPack({id:'bad-block-key',cards:[{...bare,blockRaidBp:{plain:-1000,raid:1000,extra:1}}]}),/invalid block Raid BP shift/);
 assert.throws(()=>createUniversalPack({id:'bad-block-vanilla',cards:[{...bare,implementation:'vanilla'}]}),/claims vanilla despite printed\/declared effects/);
 const deck=realDeck(['BLC-1-025','BLC-1-001','BLC-1-007','BLC-1-004','BLC-1-002','BLC-1-012','BLC-1-018','BLC-1-021'],'yellow');
 function fight(packs,s,attackerUid,blockerUid){
  for(let n=0;n<6&&s.phase!=='attack';n++)
   s=dispatchUniversalAction(packs,s,{type:'next'});
  live(s,0,attackerUid).ready=true;
  live(s,1,blockerUid).ready=true;
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:attackerUid});
  assert.equal(s.pending?.kind,'block');
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blockerUid},{actor:1});
  while(s.pending?.kind==='life-trigger')
   s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:s.pending.player});
  return s;
 }
 const cut=main(deck,30525);
 const ordinary=put(cut.s,0,'BLC-1-007','front',0,true);
 const wall=put(cut.s,1,'BLC-1-025','front',0,true);
 let reduced=fight(cut.packs,cut.s,ordinary.uid,wall.uid);
 assert.equal(reduced.players[0].front.some(c=>c?.uid===ordinary.uid),true);
 assert.equal(reduced.players[1].outside.some(c=>c.uid===wall.uid),true);
 const quiet=main(deck,30535);
 const loud=put(quiet.s,0,'BLC-1-007','front',0,true);
 const silenced=put(quiet.s,1,'BLC-1-025','front',0,true);
 let held=quiet.s;
 for(let n=0;n<6&&held.phase!=='attack';n++)
  held=dispatchUniversalAction(quiet.packs,held,{type:'next'});
 grantContinuousState(held,{kind:'originalEffectsDisabled',controller:1,sourceUid:loud.uid,
  targetUid:silenced.uid,until:{player:0,phase:'attack',edge:'end'}});
 live(held,0,loud.uid).ready=true;
 live(held,1,silenced.uid).ready=true;
 held=dispatchUniversalAction(quiet.packs,held,{type:'attack',uid:loud.uid});
 held=dispatchUniversalAction(quiet.packs,held,{type:'chooseBlock',uid:silenced.uid},{actor:1});
 assert.equal(held.players[0].outside.some(c=>c.uid===loud.uid),true);
 const stood=live(held,1,silenced.uid);
 assert.equal(universalBp(quiet.packs,held,stood),3500);
 assert.equal((stood.buffs||[]).some(b=>b.bp),false);
 const doubled=main(deck,30536);
 const firstHit=put(doubled.s,0,'BLC-1-001','front',0,true);
 const secondHit=put(doubled.s,0,'BLC-1-001','front',1,true);
 const twice=put(doubled.s,1,'BLC-1-025','front',0,true);
 let once=doubled.s;
 for(let n=0;n<6&&once.phase!=='attack';n++)
  once=dispatchUniversalAction(doubled.packs,once,{type:'next'});
 live(once,0,firstHit.uid).ready=true;
 live(once,1,twice.uid).ready=true;
 once=dispatchUniversalAction(doubled.packs,once,{type:'attack',uid:firstHit.uid});
 once=dispatchUniversalAction(doubled.packs,once,{type:'chooseBlock',uid:twice.uid},{actor:1});
 const shifted=live(once,1,twice.uid);
 assert.equal(universalBp(doubled.packs,once,shifted),2500);
 assert.deepEqual(shifted.buffs.map(b=>b.bp),[-1000]);
 assert.equal(once.players[0].outside.some(c=>c.uid===firstHit.uid),true);
 shifted.ready=true;
 live(once,0,secondHit.uid).ready=true;
 once=dispatchUniversalAction(doubled.packs,once,{type:'attack',uid:secondHit.uid});
 once=dispatchUniversalAction(doubled.packs,once,{type:'chooseBlock',uid:twice.uid},{actor:1});
 assert.equal(once.players[1].outside.some(c=>c.uid===twice.uid),true);
 assert.equal(once.players[0].front.some(c=>c?.uid===secondHit.uid),true);
 const fading=main(deck,30537);
 const small=put(fading.s,0,'BLC-1-001','front',0,true);
 const lasting=put(fading.s,1,'BLC-1-025','front',0,true);
 let stayed=fight(fading.packs,fading.s,small.uid,lasting.uid);
 assert.equal(universalBp(fading.packs,stayed,live(stayed,1,lasting.uid)),2500);
 for(let n=0;n<12&&stayed.active===0;n++)
  stayed=dispatchUniversalAction(fading.packs,stayed,{type:'next'});
 assert.equal(stayed.active,1);
 assert.equal(universalBp(fading.packs,stayed,live(stayed,1,lasting.uid)),3500);
 const raided=main(deck,30538);
 for(const [i,id] of ['BLC-1-012','BLC-1-018','BLC-1-021','BLC-1-001'].entries())
  put(raided.s,0,id,'energy',i);
 const base=put(raided.s,0,'BLC-1-002','front',0);
 const rider=take(raided.s,0,'BLC-1-004');
 raided.s.players[0].hand.push(rider);
 let topped=dispatchUniversalAction(raided.packs,raided.s,{type:'raid',uid:rider.uid,baseUid:base.uid,slot:0});
 assert.equal(topped.pending,null);
 assert.equal(topped.players[0].front[0].stack[0].faceDown,undefined);
 const raidWall=put(topped,1,'BLC-1-025','front',0,true);
 let favored=fight(raided.packs,topped,rider.uid,raidWall.uid);
 assert.equal(favored.players[0].outside.some(c=>c.uid===rider.uid),true);
 const boosted=live(favored,1,raidWall.uid);
 assert.equal(universalBp(raided.packs,favored,boosted),4500);
 assert.deepEqual(boosted.buffs.map(b=>b.bp),[1000]);
 const namedOnly=main(deck,30539);
 const bareRider=put(namedOnly.s,0,'BLC-1-004','front',0,true);
 const plainWall=put(namedOnly.s,1,'BLC-1-025','front',0,true);
 let missed=fight(namedOnly.packs,namedOnly.s,bareRider.uid,plainWall.uid);
 assert.equal(missed.players[1].outside.some(c=>c.uid===plainWall.uid),true);
 assert.equal(missed.players[0].front.some(c=>c?.uid===bareRider.uid),true);
 const hidden=main(deck,30540);
 const buried=take(hidden.s,0,'BLC-1-002');
 buried.faceDown=true;
 const covered=take(hidden.s,0,'BLC-1-004');
 covered.stack=[buried];
 covered.ready=true;
 covered.fieldEntryStamp=hidden.s.nextFieldEntryStamp++;
 hidden.s.players[0].front[0]=covered;
 const blind=put(hidden.s,1,'BLC-1-025','front',0,true);
 let facedown=fight(hidden.packs,hidden.s,covered.uid,blind.uid);
 assert.equal(facedown.players[1].outside.some(c=>c.uid===blind.uid),true);
 assert.equal(facedown.players[0].front.some(c=>c?.uid===covered.uid),true);
 aiOk(cut.packs,reduced);
 assert.equal(assertUniversalMatch(cut.packs,reduced),true);
 assert.equal(assertUniversalMatch(quiet.packs,held),true);
 assert.equal(assertUniversalMatch(doubled.packs,once),true);
 assert.equal(assertUniversalMatch(fading.packs,stayed),true);
 assert.equal(assertUniversalMatch(raided.packs,favored),true);
 assert.equal(assertUniversalMatch(namedOnly.packs,missed),true);
 assert.equal(assertUniversalMatch(hidden.packs,facedown),true);
});

test('BLC-1-033 retires one front character and raises the cap for raid state or Yhwach',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-033');
 assert.equal(printed.effect,'使 1 個敵方前線 BP 3000 以下角色退場；若敵方場上有 Raid 角色，或己方場上有〈友哈巴赫〉，BP 上限改為 5000。');
 assert.equal(printed.nameJa,'星章化');
 assert.equal(printed.number,'UA08BT/BLC-1-033');
 assert.equal(printed.traits,'無');
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,5);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,0);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.color,'yellow');
 const card=bleach.cards['BLC-1-033'];
 assert.equal(card.name,'星章化');
 assert.equal(card.gen,0);
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,raidOrName:{name:'ユーハバッハ'}}]);
 const bare={id:'BAD',name:'星',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{}};
 const op={op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,raidOrName:{name:'ユーハバッハ'}};
 assert.throws(()=>createUniversalPack({id:'bad-cap',cards:[{...bare,effects:{onPlay:[{...op,bonusBp:3000}]}}]}),/unsupported raid-or-name BP retirement/);
 assert.throws(()=>createUniversalPack({id:'bad-name',cards:[{...bare,effects:{onPlay:[{...op,raidOrName:{name:'ユーハバッハ',zone:'field'}}]}}]}),/unsupported raid-or-name BP retirement/);
 assert.throws(()=>createUniversalPack({id:'bad-mix',cards:[{...bare,effects:{onPlay:[{...op,bonusName:'ユーハバッハ'}]}}]}),/unsupported raid-or-name BP retirement/);
 const deck=realDeck(['BLC-1-033','BLC-4-006','BLC-1-012','BLC-1-018','BLC-1-001','BLC-1-021','BLC-1-007','BLC-1-025','BLC-1-006','BLC-1-004','BLC-1-002'],'yellow');
 function fuel(s,fourth='BLC-1-001'){
  put(s,0,'BLC-4-006','energy',0,false);
  put(s,0,'BLC-1-012','energy',1);
  put(s,0,'BLC-1-018','energy',2);
  put(s,0,fourth,'energy',3);
 }
 function hold(s){
  const event=take(s,0,'BLC-1-033');
  s.players[0].hand.push(event);
  return event;
 }
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 const plain=main(deck,30533);
 fuel(plain.s);
 const event=hold(plain.s);
 assert.equal(universalEnergyByColor(plain.packs,plain.s,0).yellow,5);
 const over=put(plain.s,1,'BLC-1-025','front',0,true);
 assert.equal(playable(plain.packs,plain.s,event.uid),false);
 const low=put(plain.s,1,'BLC-1-007','front',1,true);
 assert.equal(playable(plain.packs,plain.s,event.uid),true);
 let played=dispatchUniversalAction(plain.packs,plain.s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.limit,3000);
 assert.deepEqual(played.pending.choices,[low.uid]);
 assert.equal(legalUniversalActions(plain.packs,played).some(a=>a.type==='chooseRetireBp'&&a.uid===null),false);
 assert.equal(legalUniversalActions(plain.packs,played).some(a=>a.uid===over.uid),false);
 played=dispatchUniversalAction(plain.packs,played,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(played.pending,null);
 assert.equal(played.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(played.players[1].front.some(c=>c?.uid===over.uid),true);
 assert.equal(played.players[0].outside.some(c=>c.uid===event.uid),true);
 const raised=main(deck,30543);
 fuel(raised.s);
 const star=hold(raised.s);
 const big=put(raised.s,1,'BLC-1-006','front',0,true);
 assert.equal(playable(raised.packs,raised.s,star.uid),false);
 const base=take(raised.s,1,'BLC-1-002');
 const rider=take(raised.s,1,'BLC-1-004');
 rider.stack=[base];
 rider.ready=true;
 rider.fieldEntryStamp=raised.s.nextFieldEntryStamp++;
 raised.s.players[1].energy[0]=rider;
 assert.equal(playable(raised.packs,raised.s,star.uid),true);
 let capped=dispatchUniversalAction(raised.packs,raised.s,{type:'event',uid:star.uid});
 assert.equal(capped.pending.limit,5000);
 assert.deepEqual(capped.pending.choices,[big.uid]);
 capped=dispatchUniversalAction(raised.packs,capped,{type:'chooseRetireBp',uid:big.uid});
 assert.equal(capped.players[1].outside.some(c=>c.uid===big.uid),true);
 assert.equal(capped.players[1].energy[0].cardId,'BLC-1-004');
 const named=main(deck,30544);
 fuel(named.s,'BLC-1-021');
 const mark=hold(named.s);
 const tall=put(named.s,1,'BLC-1-006','front',0,true);
 const yhwach=named.s.players[0].energy[3];
 assert.equal(yhwach.cardId,'BLC-1-021');
 assert.equal(playable(named.packs,named.s,mark.uid),true);
 grantContinuousState(named.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:tall.uid,
  targetUid:yhwach.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(playable(named.packs,named.s,mark.uid),true);
 named.s.players[0].energy[3]=null;
 const replacement=take(named.s,0,'BLC-1-001');
 replacement.ready=false;
 replacement.fieldEntryStamp=named.s.nextFieldEntryStamp++;
 named.s.players[0].energy[3]=replacement;
 named.s.players[0].outside.push(yhwach);
 assert.equal(universalEnergyByColor(named.packs,named.s,0).yellow,5);
 assert.equal(playable(named.packs,named.s,mark.uid),false);
 const ownRaid=main(deck,30545);
 fuel(ownRaid.s);
 const quietEvent=hold(ownRaid.s);
 put(ownRaid.s,1,'BLC-1-006','front',0,true);
 const ownBase=take(ownRaid.s,0,'BLC-1-002');
 const ownTop=take(ownRaid.s,0,'BLC-1-004');
 ownTop.stack=[ownBase];
 ownTop.ready=true;
 ownTop.fieldEntryStamp=ownRaid.s.nextFieldEntryStamp++;
 ownRaid.s.players[0].front[0]=ownTop;
 assert.equal(playable(ownRaid.packs,ownRaid.s,quietEvent.uid),false);
 const emptyRaid=main(deck,30546);
 fuel(emptyRaid.s);
 const idle=hold(emptyRaid.s);
 put(emptyRaid.s,1,'BLC-1-006','front',0,true);
 put(emptyRaid.s,1,'BLC-1-004','energy',0,true);
 assert.equal(playable(emptyRaid.packs,emptyRaid.s,idle.uid),false);
 const down=main(deck,30547);
 fuel(down.s);
 const sealed=hold(down.s);
 put(down.s,1,'BLC-1-006','front',0,true);
 const hiddenBase=take(down.s,1,'BLC-1-002');
 hiddenBase.faceDown=true;
 const hiddenTop=take(down.s,1,'BLC-1-004');
 hiddenTop.stack=[hiddenBase];
 hiddenTop.ready=true;
 hiddenTop.fieldEntryStamp=down.s.nextFieldEntryStamp++;
 down.s.players[1].energy[0]=hiddenTop;
 assert.equal(playable(down.packs,down.s,sealed.uid),false);
 aiOk(plain.packs,played);
 assert.equal(assertUniversalMatch(plain.packs,played),true);
 assert.equal(assertUniversalMatch(raised.packs,capped),true);
 assert.equal(assertUniversalMatch(named.packs,named.s),true);
 assert.equal(assertUniversalMatch(ownRaid.packs,ownRaid.s),true);
 assert.equal(assertUniversalMatch(emptyRaid.packs,emptyRaid.s),true);
 assert.equal(assertUniversalMatch(down.packs,down.s),true);
});

test('BLC-1-031 rests one front character, and Es Nott adds skip and a draw',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-031');
 assert.equal(printed.effect,'可選最多 1 個敵方前線角色，將其轉為 REST；己方場上有〈艾斯・諾特〉時，改為將其轉為 REST、使其跳過下一次轉為 ACTIVE，並抽 1 張。');
 assert.equal(printed.nameJa,'The Fear');
 assert.equal(printed.number,'UA08BT/BLC-1-031');
 assert.equal(printed.traits,'無');
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,3);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 const card=bleach.cards['BLC-1-031'];
 assert.equal(card.name,'The Fear');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'oppFrontRestBranch',optional:true,name:'エス・ノト',base:'rest',instead:'restSkipDraw'}]);
 const bare={id:'BAD',name:'Fear',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{}};
 const branch={op:'oppFrontRestBranch',optional:true,name:'エス・ノト',base:'rest',instead:'restSkipDraw'};
 assert.throws(()=>createUniversalPack({id:'bad-branch',cards:[{...bare,effects:{onPlay:[{...branch,base:'restSkip'}]}}]}),/invalid front rest branch/);
 assert.throws(()=>createUniversalPack({id:'bad-branch-bp',cards:[{...bare,effects:{onPlay:[{...branch,bp:1000}]}}]}),/invalid front rest branch/);
 const deck=realDeck(['BLC-1-031','BLC-1-001','BLC-1-012','BLC-1-018','BLC-1-002','BLC-1-007'],'yellow');
 function fuel(s){
  for(const [i,id] of ['BLC-1-001','BLC-1-012','BLC-1-018'].entries())put(s,0,id,'energy',i);
 }
 function hold(s){
  const event=take(s,0,'BLC-1-031');
  s.players[0].hand.push(event);
  return event;
 }
 const plain=main(deck,30531);
 fuel(plain.s);
 const event=hold(plain.s);
 assert.equal(legalUniversalActions(plain.packs,plain.s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 const deckBefore=plain.s.players[0].deck.length;
 let quiet=dispatchUniversalAction(plain.packs,plain.s,{type:'event',uid:event.uid});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,deckBefore);
 const aimed=main(deck,30551);
 fuel(aimed.s);
 const fear=hold(aimed.s);
 const foe=put(aimed.s,1,'BLC-1-007','front',0,true);
 let rested=dispatchUniversalAction(aimed.packs,aimed.s,{type:'event',uid:fear.uid});
 assert.equal(rested.pending.kind,'effect-rest-bp');
 assert.equal(rested.pending.optional,true);
 assert.equal(rested.pending.skipNextActive,false);
 assert.equal(rested.pending.thenDraw,undefined);
 assert.equal(legalUniversalActions(aimed.packs,rested).some(a=>a.type==='chooseRestBp'&&a.uid===null),true);
 const before=rested.players[0].deck.length;
 const declined=dispatchUniversalAction(aimed.packs,rested,{type:'chooseRestBp',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(live(declined,1,foe.uid).ready,true);
 assert.equal(declined.players[0].deck.length,before);
 rested=dispatchUniversalAction(aimed.packs,rested,{type:'chooseRestBp',uid:foe.uid});
 assert.equal(live(rested,1,foe.uid).ready,false);
 assert.equal(rested.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 assert.equal(rested.players[0].deck.length,before);
 const upgraded=main(deck,30552);
 for(const [i,id] of ['BLC-1-001','BLC-1-012'].entries())put(upgraded.s,0,id,'energy',i);
 const es=put(upgraded.s,0,'BLC-1-002','energy',2);
 const marked=hold(upgraded.s);
 const victim=put(upgraded.s,1,'BLC-1-007','front',0,true);
 let branchPlay=dispatchUniversalAction(upgraded.packs,upgraded.s,{type:'event',uid:marked.uid});
 assert.equal(branchPlay.pending.skipNextActive,true);
 assert.equal(branchPlay.pending.thenDraw,1);
 const cards=branchPlay.players[0].deck.length;
 const passed=dispatchUniversalAction(upgraded.packs,branchPlay,{type:'chooseRestBp',uid:null});
 assert.equal(live(passed,1,victim.uid).ready,true);
 assert.equal(passed.players[0].deck.length,cards);
 assert.equal(passed.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 branchPlay=dispatchUniversalAction(upgraded.packs,branchPlay,{type:'chooseRestBp',uid:victim.uid});
 assert.equal(live(branchPlay,1,victim.uid).ready,false);
 assert.equal(branchPlay.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===victim.uid),true);
 assert.equal(branchPlay.players[0].deck.length,cards-1);
 grantContinuousState(upgraded.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:victim.uid,
  targetUid:es.uid,until:{player:0,phase:'main',edge:'end'}});
 const again=take(upgraded.s,0,'BLC-1-031');
 upgraded.s.players[0].hand.push(again);
 upgraded.s.players[0].apCards.forEach(c=>{if(c.inPlay)c.ready=true;});
 let silenced=dispatchUniversalAction(upgraded.packs,upgraded.s,{type:'event',uid:again.uid});
 assert.equal(silenced.pending.thenDraw,1);
 const parked=main(deck,30553);
 fuel(parked.s);
 const away=take(parked.s,0,'BLC-1-002');
 parked.s.players[0].outside.push(away);
 const lone=hold(parked.s);
 const standing=put(parked.s,1,'BLC-1-007','front',0,true);
 let outsideName=dispatchUniversalAction(parked.packs,parked.s,{type:'event',uid:lone.uid});
 assert.equal(outsideName.pending.thenDraw,undefined);
 outsideName=dispatchUniversalAction(parked.packs,outsideName,{type:'chooseRestBp',uid:standing.uid});
 assert.equal(live(outsideName,1,standing.uid).ready,false);
 assert.equal(outsideName.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 aiOk(aimed.packs,rested);
 assert.equal(assertUniversalMatch(plain.packs,quiet),true);
 assert.equal(assertUniversalMatch(aimed.packs,rested),true);
 assert.equal(assertUniversalMatch(aimed.packs,declined),true);
 assert.equal(assertUniversalMatch(upgraded.packs,branchPlay),true);
 assert.equal(assertUniversalMatch(upgraded.packs,passed),true);
 assert.equal(assertUniversalMatch(upgraded.packs,silenced),true);
 assert.equal(assertUniversalMatch(parked.packs,outsideName),true);
});

test('BLC-1-096 rests and skips under BP 5000, or retires when Hitsugaya is on the field',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-096');
 assert.equal(printed.effect,'選 1 個敵方前線 BP 5000 以下角色，將其轉為 REST，並使其跳過下一次轉為 ACTIVE；己方場上有〈日番谷冬獅郎〉時，改為使該角色退場。');
 assert.equal(printed.nameJa,'大紅蓮氷輪丸');
 assert.equal(printed.number,'UA08BT/BLC-1-096');
 assert.equal(printed.traits,'無');
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.color,'green');
 const card=bleach.cards['BLC-1-096'];
 assert.equal(card.name,'大紅蓮氷輪丸');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'oppFrontRestBranch',optional:false,bp:5000,name:'日番谷 冬獅郎',base:'restSkip',instead:'retire'}]);
 assert.equal(bleach.cards['BLC-1-083'].name,'日番谷 冬獅郎');
 const bare={id:'BAD',name:'氷',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-ice',cards:[{...bare,effects:{onPlay:[{op:'oppFrontRestBranch',optional:false,bp:5000,name:'日番谷 冬獅郎',base:'rest',instead:'retire'}]}}]}),/invalid front rest branch/);
 const deck=realDeck(['BLC-1-096','BLC-1-071','BLC-2-066','BLC-1-089','BLC-1-067','BLC-1-083','BLC-1-080','BLC-1-070'],'green');
 function fuel(s,fourth='BLC-1-067'){
  for(const [i,id] of ['BLC-1-071','BLC-2-066','BLC-1-089',fourth].entries())put(s,0,id,'energy',i);
 }
 function hold(s){
  const event=take(s,0,'BLC-1-096');
  s.players[0].hand.push(event);
  return event;
 }
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 const plain=main(deck,30596);
 fuel(plain.s);
 const event=hold(plain.s);
 assert.equal(universalEnergyByColor(plain.packs,plain.s,0).green,4);
 const high=put(plain.s,1,'BLC-1-070','front',0,true);
 high.buffs.push({bp:2000,untilTurn:plain.s.turn});
 assert.equal(universalBp(plain.packs,plain.s,high),6000);
 assert.equal(playable(plain.packs,plain.s,event.uid),false);
 const low=put(plain.s,1,'BLC-1-080','front',1,true);
 assert.equal(universalBp(plain.packs,plain.s,low),4000);
 assert.equal(playable(plain.packs,plain.s,event.uid),true);
 low.buffs.push({bp:1000,untilTurn:plain.s.turn});
 assert.equal(universalBp(plain.packs,plain.s,low),5000);
 let played=dispatchUniversalAction(plain.packs,plain.s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-rest-bp');
 assert.equal(played.pending.optional,false);
 assert.equal(played.pending.limit,5000);
 assert.equal(played.pending.skipNextActive,true);
 assert.equal(played.pending.thenDraw,undefined);
 assert.deepEqual(played.pending.choices,[low.uid]);
 assert.equal(legalUniversalActions(plain.packs,played).some(a=>a.type==='chooseRestBp'&&a.uid===null),false);
 const cards=played.players[0].deck.length;
 played=dispatchUniversalAction(plain.packs,played,{type:'chooseRestBp',uid:low.uid});
 assert.equal(played.pending,null);
 assert.equal(live(played,1,low.uid).ready,false);
 assert.equal(played.players[1].front.some(c=>c?.uid===low.uid),true);
 assert.equal(played.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===low.uid),true);
 assert.equal(played.players[0].deck.length,cards);
 const retired=main(deck,30597);
 fuel(retired.s,'BLC-1-083');
 const ice=hold(retired.s);
 const capped=put(retired.s,1,'BLC-1-080','front',0,true);
 capped.buffs.push({bp:1000,untilTurn:retired.s.turn});
 const over=put(retired.s,1,'BLC-1-070','front',1,true);
 over.buffs.push({bp:2000,untilTurn:retired.s.turn});
 let gone=dispatchUniversalAction(retired.packs,retired.s,{type:'event',uid:ice.uid});
 assert.equal(gone.pending.kind,'effect-retire-bp');
 assert.equal(gone.pending.limit,5000);
 assert.deepEqual(gone.pending.choices,[capped.uid]);
 assert.equal(legalUniversalActions(retired.packs,gone).some(a=>a.uid===null),false);
 gone=dispatchUniversalAction(retired.packs,gone,{type:'chooseRetireBp',uid:capped.uid});
 assert.equal(gone.pending,null);
 assert.equal(gone.players[1].outside.some(c=>c.uid===capped.uid),true);
 assert.equal(gone.players[1].front.some(c=>c?.uid===over.uid),true);
 assert.equal(gone.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 assert.equal(gone.players[0].deck.length,retired.s.players[0].deck.length);
 const away=main(deck,30598);
 fuel(away.s);
 const stored=take(away.s,0,'BLC-1-083');
 away.s.players[0].outside.push(stored);
 const blade=hold(away.s);
 const standing=put(away.s,1,'BLC-1-080','front',0,true);
 let outsideName=dispatchUniversalAction(away.packs,away.s,{type:'event',uid:blade.uid});
 assert.equal(outsideName.pending.kind,'effect-rest-bp');
 outsideName=dispatchUniversalAction(away.packs,outsideName,{type:'chooseRestBp',uid:standing.uid});
 assert.equal(live(outsideName,1,standing.uid).ready,false);
 assert.equal(outsideName.players[1].front.some(c=>c?.uid===standing.uid),true);
 const quiet=main(deck,30599);
 fuel(quiet.s,'BLC-1-083');
 const hitsugaya=quiet.s.players[0].energy[3];
 assert.equal(hitsugaya.cardId,'BLC-1-083');
 const last=hold(quiet.s);
 const target=put(quiet.s,1,'BLC-1-080','front',0,true);
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:target.uid,
  targetUid:hitsugaya.uid,until:{player:0,phase:'main',edge:'end'}});
 let silenced=dispatchUniversalAction(quiet.packs,quiet.s,{type:'event',uid:last.uid});
 assert.equal(silenced.pending.kind,'effect-retire-bp');
 silenced=dispatchUniversalAction(quiet.packs,silenced,{type:'chooseRetireBp',uid:target.uid});
 assert.equal(silenced.players[1].outside.some(c=>c.uid===target.uid),true);
 aiOk(plain.packs,played);
 assert.equal(assertUniversalMatch(plain.packs,played),true);
 assert.equal(assertUniversalMatch(retired.packs,gone),true);
 assert.equal(assertUniversalMatch(away.packs,outsideName),true);
 assert.equal(assertUniversalMatch(quiet.packs,silenced),true);
});

test('BLC-1-065 reduces its hand AP while Byakuya is on the field, then cuts BP twice',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-065');
 assert.equal(printed.effect,'己方場上有〈朽木白哉〉時，手牌中此卡的 AP 消耗減少 1。可使最多 1 個敵方前線角色本回合 BP −3000，再可使最多 1 個敵方前線角色本回合 BP −1000。');
 assert.equal(printed.nameJa,'千本桜景厳');
 assert.equal(printed.number,'UA08BT/BLC-1-065');
 assert.equal(printed.traits,'無');
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,2);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.color,'purple');
 const card=bleach.cards['BLC-1-065'];
 assert.equal(card.name,'千本桜景厳');
 assert.deepEqual(card.handApDiscountWhileName,{name:'朽木 白哉',amount:1});
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[
  {op:'enemyBpDown',bp:3000,optional:true},
  {op:'enemyBpDown',bp:1000,optional:true}
 ]);
 assert.equal(bleach.cards['BLC-1-048'].name,'朽木 白哉');
 const bare={id:'BAD',name:'桜',color:'purple',type:'event',energy:0,ap:2,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'bad-sakura',cards:[{...bare,handApDiscountWhileName:{name:'朽木 白哉',amount:2}}]}),/invalid named hand AP discount/);
 assert.throws(()=>createUniversalPack({id:'bad-sakura-char',cards:[{...bare,type:'character',bp:1000,handApDiscountWhileName:{name:'朽木 白哉',amount:1}}]}),/invalid named hand AP discount/);
 const deck=realDeck(['BLC-1-065','BLC-1-048','BLC-1-051','BLC-1-045','BLC-1-034','BLC-1-039','BLC-1-054','BLC-1-042'],'purple');
 const withByakuya=['BLC-1-051','BLC-1-034','BLC-1-039','BLC-1-048'];
 const withoutByakuya=['BLC-1-051','BLC-1-034','BLC-1-039','BLC-1-042'];
 function fuel(s,ids=withByakuya){
  ids.forEach((id,i)=>put(s,0,id,'energy',i));
 }
 function hold(s){
  const event=take(s,0,'BLC-1-065');
  s.players[0].hand.push(event);
  return event;
 }
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 const named=main(deck,30601);
 fuel(named.s);
 const event=hold(named.s);
 assert.equal(universalEnergyByColor(named.packs,named.s,0).purple,4);
 assert.equal(named.s.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(playable(named.packs,named.s,event.uid),true);
 const first=put(named.s,1,'BLC-1-054','front',0,true);
 first.buffs.push({bp:2000,untilTurn:named.s.turn});
 const second=put(named.s,1,'BLC-1-045','front',1,true);
 const before=universalBp(named.packs,named.s,first);
 let played=dispatchUniversalAction(named.packs,named.s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-target');
 assert.equal(played.pending.bp,3000);
 assert.equal(played.pending.optional,true);
 assert.equal(legalUniversalActions(named.packs,played).some(a=>a.type==='chooseTarget'&&a.uid===null),true);
 const declined=dispatchUniversalAction(named.packs,played,{type:'chooseTarget',uid:null});
 assert.equal(declined.pending.kind,'effect-target');
 assert.equal(declined.pending.bp,1000);
 const skipped=dispatchUniversalAction(named.packs,declined,{type:'chooseTarget',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(named.packs,skipped,live(skipped,1,first.uid)),before);
 played=dispatchUniversalAction(named.packs,played,{type:'chooseTarget',uid:first.uid});
 assert.equal(played.pending.bp,1000);
 assert.equal(played.pending.choices.includes(first.uid),true);
 assert.equal(played.pending.choices.includes(second.uid),true);
 played=dispatchUniversalAction(named.packs,played,{type:'chooseTarget',uid:first.uid});
 assert.equal(played.pending,null);
 assert.equal(universalBp(named.packs,played,live(played,1,first.uid)),before-4000);
 assert.equal(universalBp(named.packs,played,live(played,1,second.uid)),universalBp(named.packs,named.s,second));
 assert.equal(played.players[0].outside.some(c=>c.uid===event.uid),true);
 const split=main(deck,30602);
 fuel(split.s);
 const again=hold(split.s);
 const left=put(split.s,1,'BLC-1-054','front',0,true);
 left.buffs.push({bp:2000,untilTurn:split.s.turn});
 const right=put(split.s,1,'BLC-1-045','front',1,true);
 const leftBp=universalBp(split.packs,split.s,left);
 const rightBp=universalBp(split.packs,split.s,right);
 let branched=dispatchUniversalAction(split.packs,split.s,{type:'event',uid:again.uid});
 branched=dispatchUniversalAction(split.packs,branched,{type:'chooseTarget',uid:left.uid});
 branched=dispatchUniversalAction(split.packs,branched,{type:'chooseTarget',uid:right.uid});
 assert.equal(universalBp(split.packs,branched,live(branched,1,left.uid)),leftBp-3000);
 assert.equal(universalBp(split.packs,branched,live(branched,1,right.uid)),rightBp-1000);
 const byakuya=split.s.players[0].energy.find(c=>c?.cardId==='BLC-1-048');
 grantContinuousState(split.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:left.uid,
  targetUid:byakuya.uid,until:{player:0,phase:'main',edge:'end'}});
 const silencedEvent=take(split.s,0,'BLC-1-065');
 split.s.players[0].hand.push(silencedEvent);
 split.s.players[0].apCards.forEach(c=>{if(c.inPlay)c.ready=true;});
 assert.equal(playable(split.packs,split.s,silencedEvent.uid),true);
 const absent=main(deck,30603);
 fuel(absent.s,withoutByakuya);
 const parked=take(absent.s,0,'BLC-1-048');
 absent.s.players[0].outside.push(parked);
 const full=hold(absent.s);
 assert.equal(universalEnergyByColor(absent.packs,absent.s,0).purple,4);
 assert.equal(playable(absent.packs,absent.s,full.uid),false);
 for(let n=0;n<40&&!(absent.s.active===0&&absent.s.phase==='main'&&absent.s.players[0].ownTurns===2);n++){
  const step=legalUniversalActions(absent.packs,absent.s).find(a=>a.type==='next');
  assert.ok(step);
  absent.s=dispatchUniversalAction(absent.packs,absent.s,step);
 }
 const later=take(absent.s,0,'BLC-1-065');
 absent.s.players[0].hand.push(later);
 assert.equal(universalEnergyByColor(absent.packs,absent.s,0).purple,4);
 assert.equal(absent.s.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(playable(absent.packs,absent.s,later.uid),true);
 put(absent.s,1,'BLC-1-054','front',0,true);
 let paid=dispatchUniversalAction(absent.packs,absent.s,{type:'event',uid:later.uid});
 assert.equal(absent.s.players[0].apCards.filter(c=>c.ready).length-paid.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(paid.pending.kind,'effect-target');
 assert.equal(paid.pending.bp,3000);
 paid=dispatchUniversalAction(absent.packs,paid,{type:'chooseTarget',uid:null});
 paid=dispatchUniversalAction(absent.packs,paid,{type:'chooseTarget',uid:null});
 aiOk(named.packs,played);
 assert.equal(assertUniversalMatch(named.packs,played),true);
 assert.equal(assertUniversalMatch(named.packs,skipped),true);
 assert.equal(assertUniversalMatch(split.packs,branched),true);
 assert.equal(assertUniversalMatch(split.packs,split.s),true);
 assert.equal(assertUniversalMatch(absent.packs,paid),true);
});

test('BLC-4-021 retires BP 5000 or less only while Bazz-B is present, and buffs only at printed energy 5',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-021');
 assert.equal(printed.effect,'僅在自己場上有《巴茲比》時可使用。選1個對方前線BP5000以下的角色使其退場；若自己場上有至少1個所需能量5以上的《巴茲比》，可再最多選自己的1個《巴茲比》，本回合BP+1000。');
 assert.equal(printed.nameJa,'バーニング・フル・フィンガーズ');
 assert.equal(printed.number,'EX15BT/BLC-4-021');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.color,'yellow');
 const card=bleach.cards['BLC-4-021'];
 assert.equal(card.name,'バーニング・フル・フィンガーズ');
 assert.equal(card.playRequiresOwnName,'バズビー');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[
  {op:'retireOppFrontUnderBp',bp:5000,optional:false},
  {op:'buffOwnNameIfPrintedEnergy',name:'バズビー',minEnergy:5,bp:1000}
 ]);
 assert.equal(bleach.cards['BLC-2-003'].name,'バズビー');
 assert.equal(bleach.cards['BLC-2-003'].energy,2);
 assert.equal(bleach.cards['BLC-4-006'].name,'バズビー');
 assert.equal(bleach.cards['BLC-4-006'].energy,3);
 assert.equal(bleach.cards['BLC-4-006'].gen,2);
 assert.equal(bleach.cards['BLC-4-001'].nameAliases.includes('バズビー'),true);
 const evt={id:'BAD',name:'指',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',playRequiresOwnName:'バズビー',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'bad-burn-energy',cards:[{...evt,effects:{onPlay:[{op:'buffOwnNameIfPrintedEnergy',name:'バズビー',minEnergy:0,bp:1000}]}}]}),/invalid printed-energy name buff/);
 assert.throws(()=>createUniversalPack({id:'bad-burn-opt',cards:[{...evt,effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:5000,optional:true}]}}]}),/unsupported printed BP retirement profile/);
 const deck=realDeck(['BLC-4-021','BLC-2-003','BLC-4-006','BLC-4-001','BLC-1-001','BLC-1-012','BLC-1-018','BLC-4-009','BLC-1-007','BLC-1-006'],'yellow');
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 function hold(s){
  const event=take(s,0,'BLC-4-021');
  s.players[0].hand.push(event);
  return event;
 }
 const low=main(deck,30611);
 put(low.s,0,'BLC-4-006','energy',0);
 put(low.s,0,'BLC-2-003','energy',1);
 put(low.s,0,'BLC-1-001','energy',2);
 const event=hold(low.s);
 assert.equal(universalEnergyByColor(low.packs,low.s,0).yellow,4);
 const legalFoe=put(low.s,1,'BLC-1-007','front',0,true);
 const tall=put(low.s,1,'BLC-1-006','front',1,true);
 tall.buffs.push({bp:2000,untilTurn:low.s.turn});
 assert.equal(universalBp(low.packs,low.s,legalFoe),3000);
 assert.equal(universalBp(low.packs,low.s,tall),6000);
 assert.equal(playable(low.packs,low.s,event.uid),true);
 let played=dispatchUniversalAction(low.packs,low.s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.limit,5000);
 assert.equal(played.pending.optional,undefined);
 assert.equal(played.pending.choices.includes(legalFoe.uid),true);
 assert.equal(played.pending.choices.includes(tall.uid),false);
 assert.equal(legalUniversalActions(low.packs,played).some(a=>a.type==='chooseRetireBp'&&a.uid===null),false);
 aiOk(low.packs,played);
 played=dispatchUniversalAction(low.packs,played,{type:'chooseRetireBp',uid:legalFoe.uid});
 assert.equal(played.pending,null);
 assert.equal(played.players[1].outside.some(c=>c.uid===legalFoe.uid),true);
 assert.equal(played.players[1].front.some(c=>c?.uid===tall.uid),true);
 assert.equal(universalBp(low.packs,played,live(played,0,low.s.players[0].energy[0].uid)),universalBp(low.packs,low.s,low.s.players[0].energy[0]));
 const blocked=main(deck,30612);
 put(blocked.s,0,'BLC-4-006','energy',0);
 put(blocked.s,0,'BLC-2-003','energy',1);
 put(blocked.s,0,'BLC-1-001','energy',2);
 const blockedEvent=hold(blocked.s);
 const onlyTall=put(blocked.s,1,'BLC-1-006','front',0,true);
 onlyTall.buffs.push({bp:2000,untilTurn:blocked.s.turn});
 assert.equal(playable(blocked.packs,blocked.s,blockedEvent.uid),false);
 const unnamed=main(deck,30613);
 put(unnamed.s,0,'BLC-1-001','energy',0);
 put(unnamed.s,0,'BLC-1-012','energy',1);
 put(unnamed.s,0,'BLC-1-018','energy',2);
 put(unnamed.s,0,'BLC-4-009','energy',3);
 const unnamedEvent=hold(unnamed.s);
 put(unnamed.s,1,'BLC-1-007','front',0,true);
 assert.equal(universalEnergyByColor(unnamed.packs,unnamed.s,0).yellow,4);
 assert.equal(playable(unnamed.packs,unnamed.s,unnamedEvent.uid),false);
 const alias=main(deck,30614);
 const aliasCard=put(alias.s,0,'BLC-4-001','front',0);
 put(alias.s,0,'BLC-1-001','energy',0);
 put(alias.s,0,'BLC-1-012','energy',1);
 put(alias.s,0,'BLC-1-018','energy',2);
 put(alias.s,0,'BLC-4-009','energy',3);
 const aliasEvent=hold(alias.s);
 put(alias.s,1,'BLC-1-007','front',0,true);
 assert.equal(playable(alias.packs,alias.s,aliasEvent.uid),true);
 const foe=alias.s.players[1].front[0];
 grantContinuousState(alias.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:foe.uid,
  targetUid:aliasCard.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(playable(alias.packs,alias.s,aliasEvent.uid),false);
 const printedName=main(deck,30615);
 const bazz=put(printedName.s,0,'BLC-2-003','front',0);
 put(printedName.s,0,'BLC-1-001','energy',0);
 put(printedName.s,0,'BLC-1-012','energy',1);
 put(printedName.s,0,'BLC-1-018','energy',2);
 put(printedName.s,0,'BLC-4-009','energy',3);
 const namedEvent=hold(printedName.s);
 const namedFoe=put(printedName.s,1,'BLC-1-007','front',0,true);
 grantContinuousState(printedName.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:namedFoe.uid,
  targetUid:bazz.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(playable(printedName.packs,printedName.s,namedEvent.uid),true);
 const unit=(id,name,energy,bp)=>({id,name,color:'yellow',type:'character',energy,ap:1,bp,gen:1,traits:[],trigger:null,implementation:'vanilla'});
 const fillers=Array.from({length:9},(_,i)=>unit('F'+i,'余'+i,0,1000));
 const labEvent={id:'EVT',name:'バーニング・フル・フィンガーズ',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',playRequiresOwnName:'バズビー',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'retireOppFrontUnderBp',bp:5000,optional:false},
  {op:'buffOwnNameIfPrintedEnergy',name:'バズビー',minEnergy:5,bp:1000}
 ]}};
 const lab=createUniversalPack({id:'lab-bazz-burn',cards:[
  labEvent,
  unit('HIGH','バズビー',5,4000),
  unit('LOW','バズビー',2,2000),
  unit('FOE','相手',0,3000),
  ...fillers
 ]});
 const labIds=['EVT','HIGH','LOW','FOE',...fillers.map(c=>c.id)];
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 function open(seed){
  let s=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed,first:0});
  for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(labPacks,s,{type:'next'});
  return s;
 }
 function labHold(s){
  const held=take(s,0,'EVT');
  s.players[0].hand.push(held);
  return held;
 }
 const gated=open(30621);
 const high=put(gated,0,'HIGH','front',0);
 const small=put(gated,0,'LOW','energy',0);
 const victim=put(gated,1,'FOE','front',0);
 const held=labHold(gated);
 assert.equal(universalCardEnergy(labPacks,gated,0,high),0);
 assert.equal(cardHasName(lab.cards.HIGH,'バズビー',false),true);
 assert.equal(playable(labPacks,gated,held.uid),true);
 let burned=dispatchUniversalAction(labPacks,gated,{type:'event',uid:held.uid});
 assert.equal(burned.pending.kind,'effect-retire-bp');
 burned=dispatchUniversalAction(labPacks,burned,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(burned.pending.kind,'effect-buff-own');
 assert.equal(burned.pending.optional,true);
 assert.equal(burned.pending.bp,1000);
 assert.equal(burned.pending.choices.includes(high.uid),true);
 assert.equal(burned.pending.choices.includes(small.uid),true);
 aiOk(labPacks,burned);
 const beforeHigh=universalBp(labPacks,burned,high);
 const beforeLow=universalBp(labPacks,burned,small);
 burned=dispatchUniversalAction(labPacks,burned,{type:'chooseOwnBuff',uid:small.uid});
 assert.equal(burned.pending,null);
 assert.equal(universalBp(labPacks,burned,live(burned,0,small.uid)),beforeLow+1000);
 assert.equal(universalBp(labPacks,burned,live(burned,0,high.uid)),beforeHigh);
 const missed=open(30622);
 put(missed,0,'LOW','front',0);
 const missedFoe=put(missed,1,'FOE','front',0);
 const missedEvent=labHold(missed);
 let quiet=dispatchUniversalAction(labPacks,missed,{type:'event',uid:missedEvent.uid});
 quiet=dispatchUniversalAction(labPacks,quiet,{type:'chooseRetireBp',uid:missedFoe.uid});
 assert.equal(quiet.pending,null);
 const declined=open(30623);
 const declinedHigh=put(declined,0,'HIGH','energy',0);
 const declinedLow=put(declined,0,'LOW','energy',1);
 const declinedFoe=put(declined,1,'FOE','front',0);
 const declinedEvent=labHold(declined);
 let passed=dispatchUniversalAction(labPacks,declined,{type:'event',uid:declinedEvent.uid});
 passed=dispatchUniversalAction(labPacks,passed,{type:'chooseRetireBp',uid:declinedFoe.uid});
 assert.equal(legalUniversalActions(labPacks,passed).some(a=>a.type==='chooseOwnBuff'&&a.uid===null),true);
 const lowBefore=universalBp(labPacks,passed,declinedLow);
 const highBefore=universalBp(labPacks,passed,declinedHigh);
 passed=dispatchUniversalAction(labPacks,passed,{type:'chooseOwnBuff',uid:null});
 assert.equal(passed.pending,null);
 assert.equal(universalBp(labPacks,passed,live(passed,0,declinedLow.uid)),lowBefore);
 assert.equal(universalBp(labPacks,passed,live(passed,0,declinedHigh.uid)),highBefore);
 const silenced=open(30624);
 const silencedHigh=put(silenced,0,'HIGH','front',0);
 put(silenced,0,'LOW','energy',0);
 const silencedFoe=put(silenced,1,'FOE','front',0);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:1,sourceUid:silencedFoe.uid,
  targetUid:silencedHigh.uid,until:{player:0,phase:'main',edge:'end'}});
 const silencedEvent=labHold(silenced);
 let kept=dispatchUniversalAction(labPacks,silenced,{type:'event',uid:silencedEvent.uid});
 kept=dispatchUniversalAction(labPacks,kept,{type:'chooseRetireBp',uid:silencedFoe.uid});
 assert.equal(kept.pending.kind,'effect-buff-own');
 assert.equal(kept.pending.choices.includes(silencedHigh.uid),true);
 aiOk(low.packs,played);
 assert.equal(assertUniversalMatch(low.packs,played),true);
 assert.equal(assertUniversalMatch(blocked.packs,blocked.s),true);
 assert.equal(assertUniversalMatch(unnamed.packs,unnamed.s),true);
 assert.equal(assertUniversalMatch(alias.packs,alias.s),true);
 assert.equal(assertUniversalMatch(printedName.packs,printedName.s),true);
 assert.equal(assertUniversalMatch(labPacks,burned),true);
 assert.equal(assertUniversalMatch(labPacks,quiet),true);
 assert.equal(assertUniversalMatch(labPacks,passed),true);
 assert.equal(assertUniversalMatch(labPacks,kept),true);
});

test('BLC-4-081 retires BP 5000 or less beside Kyōraku, then may ACTIVE an energy-line Katen or Kotsu',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-081');
 assert.equal(printed.effect,'僅在自己場上有《京樂春水》時可使用。選1個對方前線BP5000以下的角色使其退場；最多選自己能量線1張《花天》或《狂骨》改為Active。');
 assert.equal(printed.nameJa,'花天狂骨枯松心中');
 assert.equal(printed.number,'EX15BT/BLC-4-081');
 assert.deepEqual(printed.traits,['花天狂骨']);
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.color,'green');
 const card=bleach.cards['BLC-4-081'];
 assert.equal(card.name,'花天狂骨枯松心中');
 assert.equal(card.playRequiresOwnName,'京楽 春水');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.effects.onPlay,[
  {op:'retireOppFrontUnderBp',bp:5000,optional:false},
  {op:'activeEnergyNamed',names:['花天','狂骨'],optional:true}
 ]);
 assert.equal(bleach.cards['BLC-4-076'].name,'花天');
 assert.equal(bleach.cards['BLC-4-076'].type,'field');
 assert.equal(bleach.cards['BLC-4-067'].name,'京楽 春水');
 const evt={id:'BAD',name:'花',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',playRequiresOwnName:'京楽 春水',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'draw',count:1}]}};
 const active={op:'activeEnergyNamed',names:['花天','狂骨'],optional:true};
 assert.throws(()=>createUniversalPack({id:'bad-katen-one',cards:[{...evt,effects:{onPlay:[{...active,names:['花天']}]}}]}),/invalid energy-line named ACTIVE/);
 assert.throws(()=>createUniversalPack({id:'bad-katen-opt',cards:[{...evt,effects:{onPlay:[{...active,optional:false}]}}]}),/invalid energy-line named ACTIVE/);
 const deck=realDeck(['BLC-4-081','BLC-4-067','BLC-1-074','BLC-3-007','BLC-2-063','BLC-4-068','BLC-4-076','BLC-4-061','BLC-1-083','BLC-1-079','BLC-4-062','BLC-1-080'],'green');
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 function hold(s){
  const event=take(s,0,'BLC-4-081');
  s.players[0].hand.push(event);
  return event;
 }
 const opened=main(deck,30631);
 put(opened.s,0,'BLC-4-067','energy',0);
 put(opened.s,0,'BLC-1-074','energy',1);
 put(opened.s,0,'BLC-3-007','energy',2);
 const katen=put(opened.s,0,'BLC-4-076','energy',3,false);
 const event=hold(opened.s);
 assert.equal(universalEnergyByColor(opened.packs,opened.s,0).green>=4,true);
 const legalFoe=put(opened.s,1,'BLC-1-079','front',0,true);
 const tall=put(opened.s,1,'BLC-1-080','front',1,true);
 tall.buffs.push({bp:2000,untilTurn:opened.s.turn});
 assert.equal(universalBp(opened.packs,opened.s,tall),6000);
 assert.equal(playable(opened.packs,opened.s,event.uid),true);
 let played=dispatchUniversalAction(opened.packs,opened.s,{type:'event',uid:event.uid});
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.limit,5000);
 assert.equal(played.pending.choices.includes(legalFoe.uid),true);
 assert.equal(played.pending.choices.includes(tall.uid),false);
 assert.equal(legalUniversalActions(opened.packs,played).some(a=>a.type==='chooseRetireBp'&&a.uid===null),false);
 played=dispatchUniversalAction(opened.packs,played,{type:'chooseRetireBp',uid:legalFoe.uid});
 assert.equal(played.pending.kind,'effect-active-energy-named');
 assert.equal(V2_PENDING_LABELS[played.pending.kind],'可將最多 1 張己方能量線指定名稱卡轉為 ACTIVE');
 assert.equal(played.pending.optional,true);
 assert.deepEqual(played.pending.names,['花天','狂骨']);
 assert.deepEqual(played.pending.choices,[katen.uid]);
 assert.equal(legalUniversalActions(opened.packs,played).some(a=>a.type==='chooseActiveEnergyNamed'&&a.uid===null),true);
 aiOk(opened.packs,played);
 played=dispatchUniversalAction(opened.packs,played,{type:'chooseActiveEnergyNamed',uid:katen.uid});
 assert.equal(played.pending,null);
 assert.equal(live(played,0,katen.uid).ready,true);
 const blocked=main(deck,30632);
 put(blocked.s,0,'BLC-4-067','energy',0);
 put(blocked.s,0,'BLC-1-074','energy',1);
 put(blocked.s,0,'BLC-3-007','energy',2);
 const blockedEvent=hold(blocked.s);
 const onlyTall=put(blocked.s,1,'BLC-1-080','front',0,true);
 onlyTall.buffs.push({bp:2000,untilTurn:blocked.s.turn});
 assert.equal(playable(blocked.packs,blocked.s,blockedEvent.uid),false);
 const unnamed=main(deck,30633);
 put(unnamed.s,0,'BLC-4-061','energy',0);
 put(unnamed.s,0,'BLC-1-083','energy',1);
 put(unnamed.s,0,'BLC-1-079','energy',2);
 put(unnamed.s,0,'BLC-4-062','energy',3);
 const unnamedEvent=hold(unnamed.s);
 put(unnamed.s,1,'BLC-1-080','front',0,true);
 assert.equal(universalEnergyByColor(unnamed.packs,unnamed.s,0).green,4);
 assert.equal(playable(unnamed.packs,unnamed.s,unnamedEvent.uid),false);
 const silenced=main(deck,30634);
 const kyoraku=put(silenced.s,0,'BLC-4-067','front',0);
 put(silenced.s,0,'BLC-4-061','energy',0);
 put(silenced.s,0,'BLC-1-083','energy',1);
 put(silenced.s,0,'BLC-4-062','energy',2);
 const quietKaten=put(silenced.s,0,'BLC-4-076','energy',3,false);
 const silencedEvent=hold(silenced.s);
 const silencedFoe=put(silenced.s,1,'BLC-1-079','front',0,true);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silencedFoe.uid,
  targetUid:kyoraku.uid,until:{player:0,phase:'main',edge:'end'}});
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silencedFoe.uid,
  targetUid:quietKaten.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(playable(silenced.packs,silenced.s,silencedEvent.uid),true);
 let kept=dispatchUniversalAction(silenced.packs,silenced.s,{type:'event',uid:silencedEvent.uid});
 kept=dispatchUniversalAction(silenced.packs,kept,{type:'chooseRetireBp',uid:silencedFoe.uid});
 assert.equal(kept.pending.choices.includes(quietKaten.uid),true);
 const bare=main(deck,30635);
 put(bare.s,0,'BLC-4-067','energy',0);
 put(bare.s,0,'BLC-1-074','energy',1);
 put(bare.s,0,'BLC-3-007','energy',2);
 const bareEvent=hold(bare.s);
 const bareFoe=put(bare.s,1,'BLC-1-079','front',0,true);
 let empty=dispatchUniversalAction(bare.packs,bare.s,{type:'event',uid:bareEvent.uid});
 empty=dispatchUniversalAction(bare.packs,empty,{type:'chooseRetireBp',uid:bareFoe.uid});
 assert.equal(empty.pending,null);
 const skipped=main(deck,30636);
 put(skipped.s,0,'BLC-4-067','energy',0);
 put(skipped.s,0,'BLC-1-074','energy',1);
 put(skipped.s,0,'BLC-3-007','energy',2);
 const locked=put(skipped.s,0,'BLC-4-076','energy',3,false);
 const skipEvent=hold(skipped.s);
 const skipFoe=put(skipped.s,1,'BLC-1-079','front',0,true);
 grantContinuousState(skipped.s,{kind:'skipNextActive',controller:0,sourceUid:skipped.s.players[0].energy[0].uid,
  targetUid:locked.uid});
 let lockedPlay=dispatchUniversalAction(skipped.packs,skipped.s,{type:'event',uid:skipEvent.uid});
 lockedPlay=dispatchUniversalAction(skipped.packs,lockedPlay,{type:'chooseRetireBp',uid:skipFoe.uid});
 lockedPlay=dispatchUniversalAction(skipped.packs,lockedPlay,{type:'chooseActiveEnergyNamed',uid:locked.uid});
 assert.equal(live(lockedPlay,0,locked.uid).ready,false);
 assert.equal(lockedPlay.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed),false);
 const unit=(id,name,type,bp)=>({id,name,color:'green',type,energy:0,ap:1,bp,gen:1,traits:[],trigger:null,implementation:'vanilla'});
 const fillers=Array.from({length:5},(_,i)=>unit('F'+i,'余'+i,'character',1000));
 const labEvent={id:'EVT',name:'花天狂骨枯松心中',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,traits:['花天狂骨'],trigger:'special',implementation:'dsl',playRequiresOwnName:'京楽 春水',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[
  {op:'retireOppFrontUnderBp',bp:5000,optional:false},active]}};
 const lab=createUniversalPack({id:'lab-katen',cards:[
  labEvent,
  unit('KYO','京楽 春水','character',1500),
  unit('KATEN','花天','field',0),
  unit('FRONT','花天','character',2000),
  unit('KOTSU','狂骨','field',0),
  {...unit('ALIAS','別名','field',0),nameAliases:['花天'],implementation:'dsl',effects:{}},
  unit('OTHER','別','character',1000),
  unit('FOE','相手','character',3000),
  ...fillers
 ]});
 const labIds=['EVT','KYO','KATEN','FRONT','KOTSU','ALIAS','OTHER','FOE',...fillers.map(c=>c.id)];
 assert.equal(labIds.length,13);
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 function open(seed){
  let s=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed,first:0});
  for(let n=0;n<8&&s.phase!=='main';n++)s=dispatchUniversalAction(labPacks,s,{type:'next'});
  return s;
 }
 function labHold(s){
  const held=take(s,0,'EVT');
  s.players[0].hand.push(held);
  return held;
 }
 const gated=open(30641);
 put(gated,0,'KYO','front',0);
 const energyKaten=put(gated,0,'KATEN','energy',0,false);
 const frontKaten=put(gated,0,'FRONT','front',1,false);
 const kotsu=put(gated,0,'KOTSU','energy',1,false);
 const other=put(gated,0,'OTHER','energy',2,false);
 const alias=put(gated,0,'ALIAS','energy',3,false);
 const victim=put(gated,1,'FOE','front',0);
 const held=labHold(gated);
 let burned=dispatchUniversalAction(labPacks,gated,{type:'event',uid:held.uid});
 burned=dispatchUniversalAction(labPacks,burned,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(burned.pending.kind,'effect-active-energy-named');
 assert.equal(burned.pending.choices.includes(energyKaten.uid),true);
 assert.equal(burned.pending.choices.includes(kotsu.uid),true);
 assert.equal(burned.pending.choices.includes(alias.uid),true);
 assert.equal(burned.pending.choices.includes(frontKaten.uid),false);
 assert.equal(burned.pending.choices.includes(other.uid),false);
 aiOk(labPacks,burned);
 const declined=dispatchUniversalAction(labPacks,burned,{type:'chooseActiveEnergyNamed',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(live(declined,0,energyKaten.uid).ready,false);
 assert.equal(live(declined,0,kotsu.uid).ready,false);
 const chosen=open(30642);
 put(chosen,0,'KYO','front',0);
 const readyField=put(chosen,0,'KATEN','energy',0,true);
 const restedBone=put(chosen,0,'KOTSU','energy',1,false);
 const chosenFoe=put(chosen,1,'FOE','front',0);
 grantContinuousState(chosen,{kind:'skipNextActive',controller:0,sourceUid:chosen.players[0].front[0].uid,
  targetUid:readyField.uid});
 const chosenEvent=labHold(chosen);
 let stayed=dispatchUniversalAction(labPacks,chosen,{type:'event',uid:chosenEvent.uid});
 stayed=dispatchUniversalAction(labPacks,stayed,{type:'chooseRetireBp',uid:chosenFoe.uid});
 stayed=dispatchUniversalAction(labPacks,stayed,{type:'chooseActiveEnergyNamed',uid:readyField.uid});
 assert.equal(live(stayed,0,readyField.uid).ready,true);
 assert.equal(stayed.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===readyField.uid),true);
 const bone=open(30643);
 put(bone,0,'KYO','energy',0);
 const boneField=put(bone,0,'KOTSU','energy',1,false);
 const boneFoe=put(bone,1,'FOE','front',0);
 grantContinuousState(bone,{kind:'skipNextActive',controller:0,sourceUid:bone.players[0].energy[0].uid,
  targetUid:boneField.uid});
 const boneEvent=labHold(bone);
 let rested=dispatchUniversalAction(labPacks,bone,{type:'event',uid:boneEvent.uid});
 rested=dispatchUniversalAction(labPacks,rested,{type:'chooseRetireBp',uid:boneFoe.uid});
 rested=dispatchUniversalAction(labPacks,rested,{type:'chooseActiveEnergyNamed',uid:boneField.uid});
 assert.equal(live(rested,0,boneField.uid).ready,false);
 assert.equal(rested.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 const aliasBoard=open(30644);
 put(aliasBoard,0,'KYO','front',0);
 const aliasField=put(aliasBoard,0,'ALIAS','energy',0,false);
 const printedField=put(aliasBoard,0,'KATEN','energy',1,false);
 const aliasFoe=put(aliasBoard,1,'FOE','front',0);
 grantContinuousState(aliasBoard,{kind:'originalEffectsDisabled',controller:1,sourceUid:aliasFoe.uid,
  targetUid:aliasField.uid,until:{player:0,phase:'main',edge:'end'}});
 grantContinuousState(aliasBoard,{kind:'originalEffectsDisabled',controller:1,sourceUid:aliasFoe.uid,
  targetUid:printedField.uid,until:{player:0,phase:'main',edge:'end'}});
 const aliasEvent=labHold(aliasBoard);
 let named=dispatchUniversalAction(labPacks,aliasBoard,{type:'event',uid:aliasEvent.uid});
 named=dispatchUniversalAction(labPacks,named,{type:'chooseRetireBp',uid:aliasFoe.uid});
 assert.equal(named.pending.choices.includes(aliasField.uid),false);
 assert.equal(named.pending.choices.includes(printedField.uid),true);
 aiOk(opened.packs,played);
 assert.equal(assertUniversalMatch(opened.packs,played),true);
 assert.equal(assertUniversalMatch(blocked.packs,blocked.s),true);
 assert.equal(assertUniversalMatch(unnamed.packs,unnamed.s),true);
 assert.equal(assertUniversalMatch(silenced.packs,kept),true);
 assert.equal(assertUniversalMatch(bare.packs,empty),true);
 assert.equal(assertUniversalMatch(skipped.packs,lockedPlay),true);
 assert.equal(assertUniversalMatch(labPacks,declined),true);
 assert.equal(assertUniversalMatch(labPacks,stayed),true);
 assert.equal(assertUniversalMatch(labPacks,rested),true);
 assert.equal(assertUniversalMatch(labPacks,named),true);
});

test('BLC-2-012 retires by the combined Bambies trait and Bambietta count',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-012');
 assert.equal(printed.effect,'使 1 個敵方前線角色退場；其 BP 必須不高於「己方場上具有『邦比愛塔親衛隊』特徵及名為〈邦比愛塔・芭絲塔拜茵〉的卡片合計數量 ×1000」。');
 assert.equal(printed.nameJa,'聖隷');
 assert.equal(printed.number,'EX07BT/BLC-2-012');
 assert.equal(printed.traits,'無');
 assert.equal(printed.type,'event');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.color,'yellow');
 const scale={trait:'邦比愛塔親衛隊',name:'バンビエッタ・バスターバイン',per:1000};
 const card=bleach.cards['BLC-2-012'];
 assert.equal(card.name,'聖隷');
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'retireOppFrontUnderBp',optional:false,nameOrTraitPerBp:scale}]);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-008'],scale.trait),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-1-012'],scale.trait),false);
 assert.equal(cardHasName(bleach.cards['BLC-1-012'],scale.name,true),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-006'],scale.trait),false);
 assert.equal(cardHasName(bleach.cards['BLC-2-006'],scale.name,true),true);
 const evt={id:'BAD',name:'隷',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'bad-bambies-per',cards:[{...evt,effects:{onPlay:[{op:'retireOppFrontUnderBp',optional:false,nameOrTraitPerBp:{...scale,per:500}}]}}]}),/unsupported name-or-trait BP retirement/);
 assert.throws(()=>createUniversalPack({id:'bad-bambies-bp',cards:[{...evt,effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:1000,optional:false,nameOrTraitPerBp:scale}]}}]}),/unsupported name-or-trait BP retirement/);
 const deck=realDeck(['BLC-2-012','BLC-2-007','BLC-2-008','BLC-2-010','BLC-2-011','BLC-1-012','BLC-1-013','BLC-2-006','BLC-4-009','BLC-1-007','BLC-1-001','BLC-1-018'],'yellow');
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 function hold(s){
  const event=take(s,0,'BLC-2-012');
  s.players[0].hand.push(event);
  return event;
 }
 const empty=main(deck,30651);
 put(empty.s,0,'BLC-1-007','energy',0);
 put(empty.s,0,'BLC-1-001','energy',1);
 put(empty.s,0,'BLC-1-018','energy',2);
 const emptyEvent=hold(empty.s);
 put(empty.s,1,'BLC-1-012','front',0,true);
 assert.equal(universalEnergyByColor(empty.packs,empty.s,0).yellow,4);
 assert.equal(playable(empty.packs,empty.s,emptyEvent.uid),false);
 const one=main(deck,30652);
 put(one.s,0,'BLC-1-007','energy',0);
 put(one.s,0,'BLC-1-001','energy',1);
 const trait=put(one.s,0,'BLC-2-008','energy',2);
 const oneEvent=hold(one.s);
 const small=put(one.s,1,'BLC-4-009','front',0,true);
 const mid=put(one.s,1,'BLC-1-012','front',1,true);
 assert.equal(universalBp(one.packs,one.s,small),1000);
 assert.equal(universalBp(one.packs,one.s,mid),1500);
 assert.equal(playable(one.packs,one.s,oneEvent.uid),true);
 let played=dispatchUniversalAction(one.packs,one.s,{type:'event',uid:oneEvent.uid});
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.limit,1000);
 assert.equal(played.pending.choices.includes(small.uid),true);
 assert.equal(played.pending.choices.includes(mid.uid),false);
 assert.equal(legalUniversalActions(one.packs,played).some(a=>a.type==='chooseRetireBp'&&a.uid===null),false);
 aiOk(one.packs,played);
 played=dispatchUniversalAction(one.packs,played,{type:'chooseRetireBp',uid:small.uid});
 assert.equal(played.pending,null);
 assert.equal(played.players[1].outside.some(c=>c.uid===small.uid),true);
 const names=main(deck,30653);
 put(names.s,0,'BLC-1-007','energy',0);
 put(names.s,0,'BLC-1-012','energy',1);
 put(names.s,0,'BLC-1-013','energy',2);
 const namesEvent=hold(names.s);
 const cap=put(names.s,1,'BLC-2-010','front',0,true);
 const over=put(names.s,1,'BLC-2-007','front',1,true);
 assert.equal(universalBp(names.packs,names.s,cap),2000);
 assert.equal(universalBp(names.packs,names.s,over),2500);
 let doubled=dispatchUniversalAction(names.packs,names.s,{type:'event',uid:namesEvent.uid});
 assert.equal(doubled.pending.limit,2000);
 assert.equal(doubled.pending.choices.includes(cap.uid),true);
 assert.equal(doubled.pending.choices.includes(over.uid),false);
 doubled=dispatchUniversalAction(names.packs,doubled,{type:'chooseRetireBp',uid:cap.uid});
 assert.equal(doubled.pending,null);
 const zombie=main(deck,30654);
 put(zombie.s,0,'BLC-1-007','energy',0);
 put(zombie.s,0,'BLC-1-001','energy',1);
 put(zombie.s,0,'BLC-1-018','energy',2);
 put(zombie.s,0,'BLC-2-006','energy',3);
 const zombieEvent=hold(zombie.s);
 const zombieSmall=put(zombie.s,1,'BLC-4-009','front',0,true);
 const zombieMid=put(zombie.s,1,'BLC-1-018','front',1,true);
 let zombiePlay=dispatchUniversalAction(zombie.packs,zombie.s,{type:'event',uid:zombieEvent.uid});
 assert.equal(zombiePlay.pending.limit,1000);
 assert.equal(zombiePlay.pending.choices.includes(zombieSmall.uid),true);
 assert.equal(zombiePlay.pending.choices.includes(zombieMid.uid),false);
 const silenced=main(deck,30655);
 put(silenced.s,0,'BLC-1-007','energy',0);
 put(silenced.s,0,'BLC-1-001','energy',1);
 const silencedTrait=put(silenced.s,0,'BLC-2-008','energy',2);
 const silencedName=put(silenced.s,0,'BLC-1-012','front',0);
 const silencedEvent=hold(silenced.s);
 const silencedCap=put(silenced.s,1,'BLC-1-013','front',0,true);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silencedCap.uid,
  targetUid:silencedTrait.uid,until:{player:0,phase:'main',edge:'end'}});
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silencedCap.uid,
  targetUid:silencedName.uid,until:{player:0,phase:'main',edge:'end'}});
 let silencedPlay=dispatchUniversalAction(silenced.packs,silenced.s,{type:'event',uid:silencedEvent.uid});
 assert.equal(silencedPlay.pending.limit,2000);
 assert.equal(silencedPlay.pending.choices.includes(silencedCap.uid),true);
 const both={id:'BOTH',name:'バンビエッタ・バスターバイン',color:'yellow',type:'character',energy:0,ap:1,bp:2000,gen:1,traits:['邦比愛塔親衛隊'],trigger:null,implementation:'vanilla'};
 const plainUnit=(id,name,bp)=>({id,name,color:'yellow',type:'character',energy:0,ap:1,bp,gen:1,traits:[],trigger:null,implementation:'vanilla'});
 const fillers=Array.from({length:9},(_,i)=>plainUnit('F'+i,'余'+i,1000));
 const labEvent={id:'EVT',name:'聖隷',color:'yellow',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'retireOppFrontUnderBp',optional:false,nameOrTraitPerBp:scale}]}};
 const lab=createUniversalPack({id:'lab-bambies',cards:[labEvent,both,plainUnit('LOW','低',1000),plainUnit('HIGH','高',2000),...fillers]});
 const labIds=['EVT','BOTH','LOW','HIGH',...fillers.map(c=>c.id)];
 assert.equal(labIds.length,13);
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let union=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30661,first:0});
 for(let n=0;n<8&&union.phase!=='main';n++)union=dispatchUniversalAction(labPacks,union,{type:'next'});
 const unionCard=put(union,0,'BOTH','front',0);
 put(union,0,'F0','energy',0);
 const unionLow=put(union,1,'LOW','front',0);
 const unionHigh=put(union,1,'HIGH','front',1);
 const unionEvent=take(union,0,'EVT');
 union.players[0].hand.push(unionEvent);
 let unionPlay=dispatchUniversalAction(labPacks,union,{type:'event',uid:unionEvent.uid});
 assert.equal(unionPlay.pending.limit,1000);
 assert.equal(unionPlay.pending.choices.includes(unionLow.uid),true);
 assert.equal(unionPlay.pending.choices.includes(unionHigh.uid),false);
 assert.equal(unionPlay.pending.choices.includes(unionCard.uid),false);
 aiOk(one.packs,played);
 assert.equal(assertUniversalMatch(one.packs,played),true);
 assert.equal(assertUniversalMatch(empty.packs,empty.s),true);
 assert.equal(assertUniversalMatch(names.packs,doubled),true);
 assert.equal(assertUniversalMatch(zombie.packs,zombiePlay),true);
 assert.equal(assertUniversalMatch(silenced.packs,silencedPlay),true);
 assert.equal(assertUniversalMatch(labPacks,unionPlay),true);
});

test('BLC-1-081 cannot enter or move to energy, and raises its retirement cap at six other Squad cards',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-081');
 assert.equal(printed.effect,'此卡不能登場於能源線，也不能移至能源線。Impact 1。登場：可使最多 1 個敵方前線 BP 2000 以下角色退場；己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，BP 上限改為 4000。');
 assert.equal(printed.nameJa,'更木 剣八');
 assert.equal(printed.number,'UA08BT/BLC-1-081');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.type,'character');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,2);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,'draw');
 assert.equal(printed.color,'green');
 const bonus={trait:'護廷十三隊',min:6,excludeSelf:true,bonusBp:4000};
 const card=bleach.cards['BLC-1-081'];
 assert.equal(card.name,'更木 剣八');
 assert.equal(card.energyForbidden,true);
 assert.equal(card.frontForbidden,false);
 assert.equal(card.printedImpact,1);
 assert.equal(card.step,false);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'retireOppFrontUnderBp',bp:2000,optional:true,traitCountBonus:bonus}]);
 const bare={id:'BAD',name:'剣',color:'green',type:'character',energy:4,ap:2,bp:4000,gen:0,traits:['護廷十三隊'],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-energy-event',cards:[{...bare,type:'event',bp:0,energyForbidden:true}]}),/invalid energy-line restriction/);
 assert.throws(()=>createUniversalPack({id:'bad-both-lines',cards:[{...bare,frontForbidden:true,energyForbidden:true}]}),/invalid energy-line restriction/);
 assert.throws(()=>createUniversalPack({id:'bad-cap',cards:[{...bare,effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:2000,optional:false,traitCountBonus:bonus}]}}]}),/unsupported trait-count BP retirement/);
 const deck=realDeck(['BLC-1-081','BLC-4-067','BLC-3-007','BLC-4-068','BLC-1-083','BLC-1-079','BLC-1-080','BLC-4-061','BLC-4-062','BLC-4-060'],'green');
 const playable=(packs,s,uid,line)=>legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===uid&&a.line===line);
 function hold(s){
  const unit=take(s,0,'BLC-1-081');
  s.players[0].hand.push(unit);
  return unit;
 }
 function ownSecond(packs,s){
  for(let n=0;n<40&&!(s.active===0&&s.phase==='main'&&s.players[0].ownTurns===2);n++){
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step);
   s=dispatchUniversalAction(packs,s,step);
  }
  return s;
 }
 const early=main(deck,30671);
 ['BLC-4-067','BLC-3-007','BLC-4-068','BLC-1-083'].forEach((id,i)=>put(early.s,0,id,'energy',i));
 const earlyKen=hold(early.s);
 assert.equal(universalEnergyByColor(early.packs,early.s,0).green,4);
 assert.equal(early.s.players[0].apCards.filter(c=>c.ready).length,1);
 assert.equal(playable(early.packs,early.s,earlyKen.uid,'front'),false);
 assert.equal(playable(early.packs,early.s,earlyKen.uid,'energy'),false);
 const low=main(deck,30672);
 ['BLC-4-067','BLC-3-007','BLC-4-068','BLC-1-083'].forEach((id,i)=>put(low.s,0,id,'energy',i));
 put(low.s,0,'BLC-1-079','front',0);
 const lowKen=hold(low.s);
 const lowSmall=put(low.s,1,'BLC-4-061','front',0,true);
 const lowTall=put(low.s,1,'BLC-4-062','front',1,true);
 low.s=ownSecond(low.packs,low.s);
 assert.equal(low.s.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(playable(low.packs,low.s,lowKen.uid,'energy'),false);
 assert.equal(playable(low.packs,low.s,lowKen.uid,'front'),true);
 const frontPlay=legalUniversalActions(low.packs,low.s).find(a=>a.type==='play'&&a.uid===lowKen.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(frontPlay);
 let played=dispatchUniversalAction(low.packs,low.s,frontPlay);
 assert.equal(played.players[0].front.some(c=>c?.uid===lowKen.uid),true);
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.limit,2000);
 assert.equal(played.pending.optional,true);
 assert.equal(played.pending.choices.includes(lowSmall.uid),true);
 assert.equal(played.pending.choices.includes(lowTall.uid),false);
 assert.equal(fieldCount(played,0),6);
 assert.equal(legalUniversalActions(low.packs,played).some(a=>a.type==='chooseRetireBp'&&a.uid===null),true);
 const declined=dispatchUniversalAction(low.packs,played,{type:'chooseRetireBp',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[1].front.some(c=>c?.uid===lowSmall.uid),true);
 assert.equal(universalImpact(low.packs,declined,live(declined,0,lowKen.uid)),1);
 const high=main(deck,30673);
 ['BLC-4-067','BLC-3-007','BLC-4-068','BLC-1-083'].forEach((id,i)=>put(high.s,0,id,'energy',i));
 const sixth=put(high.s,0,'BLC-1-079','front',0);
 put(high.s,0,'BLC-1-080','front',1);
 const highKen=hold(high.s);
 const highTall=put(high.s,1,'BLC-4-062','front',0,true);
 high.s=ownSecond(high.packs,high.s);
 grantContinuousState(high.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:highTall.uid,
  targetUid:sixth.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(high.s.continuousStates.some(e=>e.kind==='originalEffectsDisabled'&&e.targetUid===sixth.uid&&!e.consumed),true);
 const highPlay=legalUniversalActions(high.packs,high.s).find(a=>a.type==='play'&&a.uid===highKen.uid&&a.line==='front'&&a.replaceUid===undefined);
 let raised=dispatchUniversalAction(high.packs,high.s,highPlay);
 assert.equal(raised.continuousStates.some(e=>e.kind==='originalEffectsDisabled'&&e.targetUid===sixth.uid&&!e.consumed),true);
 assert.equal(raised.pending.limit,4000);
 assert.equal(raised.pending.choices.includes(highTall.uid),true);
 aiOk(high.packs,raised);
 raised=dispatchUniversalAction(high.packs,raised,{type:'chooseRetireBp',uid:highTall.uid});
 assert.equal(raised.pending,null);
 assert.equal(raised.players[1].outside.some(c=>c.uid===highTall.uid),true);
 const parked=main(deck,30674);
 const illegal=hold(parked.s);
 put(parked.s,0,'BLC-1-081','energy',0);
 assert.throws(()=>assertUniversalMatch(parked.packs,parked.s),/energy-forbidden/);
 const moved=main(deck,30675);
 ['BLC-4-067','BLC-3-007','BLC-1-083'].forEach((id,i)=>put(moved.s,0,id,'energy',i));
 const kenpachi=put(moved.s,0,'BLC-1-081','front',0);
 const other=put(moved.s,0,'BLC-4-061','front',1);
 const aizen=take(moved.s,0,'BLC-4-060');
 moved.s.players[0].hand.push(aizen);
 assert.equal(universalEnergyByColor(moved.packs,moved.s,0).green,3);
 const aizenPlay=legalUniversalActions(moved.packs,moved.s).find(a=>a.type==='play'&&a.uid===aizen.uid&&a.line==='energy');
 assert.ok(aizenPlay);
 assert.equal(legalUniversalActions(moved.packs,moved.s).some(a=>a.type==='play'&&a.uid===aizen.uid&&a.line==='front'),false);
 let shifting=dispatchUniversalAction(moved.packs,moved.s,aizenPlay);
 assert.equal(shifting.pending.kind,'effect-line-move');
 assert.equal(shifting.pending.choices.includes(kenpachi.uid),false);
 assert.equal(shifting.pending.choices.includes(other.uid),true);
 assert.throws(()=>dispatchUniversalAction(moved.packs,shifting,{type:'chooseLineMove',uid:kenpachi.uid}),/Action not currently legal/);
 shifting=dispatchUniversalAction(moved.packs,shifting,{type:'chooseLineMove',uid:null});
 assert.equal(shifting.pending,null);
 assert.equal(shifting.players[0].front.some(c=>c?.uid===kenpachi.uid),true);
 const stepPackCards=id=>({id,name:'歩'+id,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null});
 const fillers=Array.from({length:11},(_,i)=>stepPackCards('F'+i));
 const lab=createUniversalPack({id:'lab-ken-step',cards:[
  {...stepPackCards('STEP'),implementation:'vanilla',step:true},
  {...stepPackCards('LOCKED'),implementation:'dsl',energyForbidden:true,step:true,effects:{}},
  ...fillers.map(c=>({...c,implementation:'vanilla'}))
 ]});
 const labIds=['STEP','LOCKED',...fillers.map(c=>c.id)];
 assert.equal(labIds.length,13);
 const labCounts=Object.fromEntries(labIds.map((id,i)=>[id,i===labIds.length-1?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,labCounts),[]);
 const labPacks=[lab,lab];
 let walking=newUniversalMatch(labPacks,{decks:[labCounts,labCounts],seed:30681,first:0});
 for(let n=0;n<6&&walking.phase!=='move';n++)walking=dispatchUniversalAction(labPacks,walking,{type:'next'});
 assert.equal(walking.phase,'move');
 const stepper=put(walking,0,'STEP','front',0);
 const locked=put(walking,0,'LOCKED','front',1);
 assert.equal(legalUniversalActions(labPacks,walking).some(a=>a.type==='step'&&a.uid===stepper.uid),true);
 assert.equal(legalUniversalActions(labPacks,walking).some(a=>a.type==='step'&&a.uid===locked.uid),false);
 walking=dispatchUniversalAction(labPacks,walking,{type:'next'});
 assert.equal(walking.phase,'main');
 const lockedHand=take(walking,0,'LOCKED');
 walking.players[0].hand.push(lockedHand);
 assert.equal(legalUniversalActions(labPacks,walking).some(a=>a.type==='play'&&a.uid===lockedHand.uid&&a.line==='energy'),false);
 assert.equal(legalUniversalActions(labPacks,walking).some(a=>a.type==='play'&&a.uid===lockedHand.uid&&a.line==='front'),true);
 aiOk(low.packs,declined);
 assert.equal(assertUniversalMatch(low.packs,declined),true);
 assert.equal(assertUniversalMatch(high.packs,raised),true);
 assert.equal(assertUniversalMatch(moved.packs,shifting),true);
 assert.equal(assertUniversalMatch(labPacks,walking),true);
});

test('BLC-2-037 may retire one Nem squad character, then one opposing front at that BP, then draws',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-037');
 assert.equal(printed.effect,'登場：可使 1 個己方場上具有「涅骸部隊」特徵的角色退場；成功時，可使最多 1 個敵方前線角色退場，其 BP 必須不高於該己方角色的 BP，然後抽 1 張。');
 assert.equal(printed.nameJa,'涅 マユリ');
 assert.equal(printed.number,'EX07BT/BLC-2-037');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.type,'character');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.color,'blue');
 const follow={kind:'underBpDraw',draw:1};
 const card=bleach.cards['BLC-2-037'];
 assert.equal(card.name,'涅 マユリ');
 assert.equal(card.gen,1);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'retireOwnTraitFollow',optional:true,trait:'涅骸部隊',follow}]);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-040'],'涅骸部隊'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-044'],'涅骸部隊'),true);
 assert.equal(bleach.cards['BLC-2-044'].type,'field');
 const bare={id:'BAD',name:'繭',color:'blue',type:'character',energy:4,ap:1,bp:4000,gen:1,traits:['護廷十三隊'],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-trait-follow',cards:[{...bare,effects:{onPlay:[{op:'retireOwnTraitFollow',optional:true,trait:'涅骸部隊',follow:{kind:'underBpDraw',draw:2}}]}}]}),/invalid trait retirement follow-up/);
 const deck=realDeck(['BLC-2-037','BLC-2-040','BLC-2-039','BLC-2-044','BLC-2-041','BLC-2-043','BLC-2-042','BLC-2-031','BLC-2-016','BLC-2-015'],'blue');
 const playable=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===uid&&a.line==='front');
 function hold(s){
  const unit=take(s,0,'BLC-2-037');
  s.players[0].hand.push(unit);
  return unit;
 }
 const quiet=main(deck,30701);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(quiet.s,0,id,'energy',i));
 put(quiet.s,0,'BLC-2-044','energy',3);
 const quietMayuri=hold(quiet.s);
 assert.equal(universalEnergyByColor(quiet.packs,quiet.s,0).blue,4);
 assert.equal(playable(quiet.packs,quiet.s,quietMayuri.uid),true);
 const quietPlay=legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===quietMayuri.uid&&a.line==='front'&&a.replaceUid===undefined);
 const noSquad=dispatchUniversalAction(quiet.packs,quiet.s,quietPlay);
 assert.equal(noSquad.pending,null);
 assert.equal(noSquad.players[0].deck.length,quiet.s.players[0].deck.length);
 const low=main(deck,30702);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(low.s,0,id,'energy',i));
 const small=put(low.s,0,'BLC-2-040','front',0);
 const fieldOnly=put(low.s,0,'BLC-2-044','energy',3);
 const lowMayuri=hold(low.s);
 const exact=put(low.s,1,'BLC-2-040','front',0,true);
 const taller=put(low.s,1,'BLC-2-042','front',1,true);
 assert.equal(universalBp(low.packs,low.s,small),1000);
 assert.equal(universalBp(low.packs,low.s,exact),1000);
 assert.equal(universalBp(low.packs,low.s,taller),1500);
 const lowPlay=legalUniversalActions(low.packs,low.s).find(a=>a.type==='play'&&a.uid===lowMayuri.uid&&a.line==='front'&&a.replaceUid===undefined);
 let played=dispatchUniversalAction(low.packs,low.s,lowPlay);
 assert.equal(played.pending.kind,'effect-retire-own-trait');
 assert.equal(played.pending.optional,true);
 assert.equal(played.pending.choices.includes(small.uid),true);
 assert.equal(played.pending.choices.includes(fieldOnly.uid),false);
 assert.equal(played.pending.choices.includes(lowMayuri.uid),false);
 const deckBefore=played.players[0].deck.length;
 const declined=dispatchUniversalAction(low.packs,played,{type:'chooseOwnTraitRetire',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].front.some(c=>c?.uid===small.uid),true);
 assert.equal(declined.players[0].deck.length,deckBefore);
 const taken=main(deck,30703);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(taken.s,0,id,'energy',i));
 put(taken.s,0,'BLC-2-044','energy',3);
 const victim=put(taken.s,0,'BLC-2-040','front',0);
 const takenMayuri=hold(taken.s);
 const match=put(taken.s,1,'BLC-2-040','front',0,true);
 const over=put(taken.s,1,'BLC-2-042','front',1,true);
 const takenPlay=legalUniversalActions(taken.packs,taken.s).find(a=>a.type==='play'&&a.uid===takenMayuri.uid&&a.line==='front'&&a.replaceUid===undefined);
 let retiring=dispatchUniversalAction(taken.packs,taken.s,takenPlay);
 const beforeDraw=retiring.players[0].deck.length;
 retiring=dispatchUniversalAction(taken.packs,retiring,{type:'chooseOwnTraitRetire',uid:victim.uid});
 assert.equal(retiring.pending.kind,'effect-retire-bp');
 assert.equal(retiring.pending.limit,1000);
 assert.equal(retiring.pending.optional,true);
 assert.equal(retiring.pending.choices.includes(match.uid),true);
 assert.equal(retiring.pending.choices.includes(over.uid),false);
 assert.equal(retiring.players[0].outside.some(c=>c.uid===victim.uid),true);
 const skipped=dispatchUniversalAction(taken.packs,structuredClone(retiring),{type:'chooseRetireBp',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[1].front.some(c=>c?.uid===match.uid),true);
 // The retired チルッチ draws on her own 退場, then Mayuri's follow draws.
 assert.equal(skipped.players[0].deck.length,beforeDraw-2);
 retiring=dispatchUniversalAction(taken.packs,retiring,{type:'chooseRetireBp',uid:match.uid});
 assert.equal(retiring.pending,null);
 assert.equal(retiring.players[1].outside.some(c=>c.uid===match.uid),true);
 assert.equal(retiring.players[1].front.some(c=>c?.uid===over.uid),true);
 assert.equal(retiring.players[0].deck.length,beforeDraw-2);
 const raised=main(deck,30704);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(raised.s,0,id,'energy',i));
 put(raised.s,0,'BLC-2-044','energy',3);
 const boosted=put(raised.s,0,'BLC-2-040','front',0);
 boosted.buffs=[{bp:1000,untilTurn:raised.s.turn}];
 const part=put(raised.s,0,'BLC-2-041','front',1);
 const raisedMayuri=hold(raised.s);
 const mid=put(raised.s,1,'BLC-2-042','front',0,true);
 assert.equal(universalBp(raised.packs,raised.s,boosted),2000);
 const raisedPlay=legalUniversalActions(raised.packs,raised.s).find(a=>a.type==='play'&&a.uid===raisedMayuri.uid&&a.line==='front'&&a.replaceUid===undefined);
 let higher=dispatchUniversalAction(raised.packs,raised.s,raisedPlay);
 assert.equal(higher.pending.choices.includes(part.uid),true);
 higher=dispatchUniversalAction(raised.packs,higher,{type:'chooseOwnTraitRetire',uid:boosted.uid});
 assert.equal(higher.pending.limit,2000);
 assert.equal(higher.pending.choices.includes(mid.uid),true);
 const silenced=main(deck,30705);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(silenced.s,0,id,'energy',i));
 put(silenced.s,0,'BLC-2-044','energy',3);
 const quietSquad=put(silenced.s,0,'BLC-2-043','front',0);
 const silencedMayuri=hold(silenced.s);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silencedMayuri.uid,
  targetUid:quietSquad.uid,until:{player:0,phase:'main',edge:'end'}});
 const silencedPlay=legalUniversalActions(silenced.packs,silenced.s).find(a=>a.type==='play'&&a.uid===silencedMayuri.uid&&a.line==='front'&&a.replaceUid===undefined);
 const still=dispatchUniversalAction(silenced.packs,silenced.s,silencedPlay);
 assert.equal(still.continuousStates.some(e=>e.kind==='originalEffectsDisabled'&&e.targetUid===quietSquad.uid&&!e.consumed),true);
 assert.equal(still.pending.choices.includes(quietSquad.uid),true);
 aiOk(low.packs,played);
 assert.equal(assertUniversalMatch(low.packs,declined),true);
 assert.equal(assertUniversalMatch(taken.packs,retiring),true);
 assert.equal(assertUniversalMatch(raised.packs,higher),true);
 assert.equal(assertUniversalMatch(silenced.packs,still),true);
 assert.equal(assertUniversalMatch(quiet.packs,noSquad),true);
});

test('BLC-2-045 must retire one Nem squad character, draws, then may ACTIVE two affordable blue AP-1 matches',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-045');
 assert.equal(printed.effect,'使 1 個己方場上具有「涅骸部隊」特徵的角色退場；成功時抽 1 張，再可從己方場外將最多 2 張符合需求能源、AP 消耗 1 的藍色〈涅音夢〉或具有「涅骸部隊」特徵的角色卡，以 ACTIVE 登場於己方場上。');
 assert.equal(printed.nameJa,'勝手にギャアギャア喋るんじゃないヨ');
 assert.equal(printed.number,'EX07BT/BLC-2-045');
 assert.equal(printed.type,'event');
 assert.equal(printed.trigger,'special');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.gen,0);
 assert.equal(printed.color,'blue');
 const follow={kind:'drawActivePair',draw:1,max:2,ap:1,color:'blue',name:'涅 ネム',trait:'涅骸部隊'};
 const card=bleach.cards['BLC-2-045'];
 assert.equal(card.name,printed.nameJa);
 assert.equal(card.gen,0);
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.effects.onPlay,[{op:'retireOwnTraitFollow',optional:false,trait:'涅骸部隊',follow}]);
 assert.equal(V2_PENDING_LABELS['effect-outside-active-pair'],'可從場外將符合條件的角色以 ACTIVE 登場');
 const bare={id:'BAD',name:'吵',color:'blue',type:'event',energy:4,ap:1,bp:0,gen:0,traits:[],trigger:'special',triggerEffect:{op:'retireOppFront'},implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-active-pair',cards:[{...bare,effects:{onPlay:[{op:'retireOwnTraitFollow',optional:false,trait:'涅骸部隊',follow:{...follow,max:3}}]}}]}),/invalid trait retirement follow-up/);
 const deck=realDeck(['BLC-2-045','BLC-2-040','BLC-2-042','BLC-2-044','BLC-4-040','BLC-4-043','BLC-4-036','BLC-4-022','BLC-2-039','BLC-2-031','BLC-2-016','BLC-2-015'],'blue');
 const eventLegal=(packs,s,uid)=>legalUniversalActions(packs,s).some(a=>a.type==='event'&&a.uid===uid);
 function hold(s){const unit=take(s,0,'BLC-2-045');s.players[0].hand.push(unit);return unit;}
 function park(s,id){const c=take(s,0,id);s.players[0].outside.push(c);return c;}
 const blocked=main(deck,30801);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(blocked.s,0,id,'energy',i));
 put(blocked.s,0,'BLC-2-044','energy',3);
 const blockedEvent=hold(blocked.s);
 assert.equal(universalEnergyByColor(blocked.packs,blocked.s,0).blue,4);
 assert.equal(eventLegal(blocked.packs,blocked.s,blockedEvent.uid),false);
 const live=main(deck,30802);
 ['BLC-2-031','BLC-2-016','BLC-2-015'].forEach((id,i)=>put(live.s,0,id,'energy',i));
 put(live.s,0,'BLC-2-044','energy',3);
 const squad=put(live.s,0,'BLC-2-040','front',0);
 const event=hold(live.s);
 const parked=park(live.s,'BLC-2-040');
 const luppi=park(live.s,'BLC-2-042');
 const charlotte=park(live.s,'BLC-2-039');
 const nem=park(live.s,'BLC-4-040');
 const alias=park(live.s,'BLC-4-043');
 const grim=park(live.s,'BLC-4-036');
 const orihime=park(live.s,'BLC-4-022');
 const field=park(live.s,'BLC-2-044');
 assert.equal(eventLegal(live.packs,live.s,event.uid),true);
 const play=legalUniversalActions(live.packs,live.s).find(a=>a.type==='event'&&a.uid===event.uid);
 let played=dispatchUniversalAction(live.packs,live.s,play);
 assert.equal(played.pending.kind,'effect-retire-own-trait');
 assert.equal(played.pending.optional,false);
 assert.equal(played.pending.choices.includes(squad.uid),true);
 assert.equal(legalUniversalActions(live.packs,played).some(a=>a.type==='chooseOwnTraitRetire'&&a.uid===null),false);
 const before=played.players[0].deck.length;
 played=dispatchUniversalAction(live.packs,played,{type:'chooseOwnTraitRetire',uid:squad.uid});
 assert.equal(played.pending.kind,'effect-outside-active-pair');
 assert.equal(played.pending.remaining,2);
 assert.equal(played.pending.optional,true);
 assert.equal(played.players[0].deck.length,before-2);
 for(const uid of [squad.uid,parked.uid,luppi.uid,charlotte.uid,nem.uid,alias.uid])
  assert.equal(played.pending.choices.includes(uid),true,uid);
 for(const uid of [grim.uid,orihime.uid,field.uid,event.uid])
  assert.equal(played.pending.choices.includes(uid),false,uid);
 const legal=legalUniversalActions(live.packs,played);
 assert.equal(legal.some(a=>a.type==='chooseOutsideActivePair'&&a.line==='energy'),true);
 const skipped=dispatchUniversalAction(live.packs,structuredClone(played),{type:'chooseOutsideActivePair',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===squad.uid),true);
 assert.equal(skipped.players[0].deck.length,before-2);
 const first=legal.find(a=>a.type==='chooseOutsideActivePair'&&a.uid===luppi.uid&&a.line==='front'&&a.replaceUid===undefined);
 let entered=dispatchUniversalAction(live.packs,played,first);
 assert.equal(entered.players[0].front.find(c=>c?.uid===luppi.uid).ready,true);
 assert.equal(entered.pending.kind,'effect-outside-active-pair');
 assert.equal(entered.pending.remaining,1);
 assert.equal(entered.pending.choices.includes(luppi.uid),false);
 const second=legalUniversalActions(live.packs,entered).find(a=>a.type==='chooseOutsideActivePair'&&a.uid===squad.uid&&a.line==='front'&&a.replaceUid===undefined);
 entered=dispatchUniversalAction(live.packs,entered,second);
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].front.find(c=>c?.uid===squad.uid).ready,true);
 assert.equal(entered.players[0].deck.length,before-2);
 const named=legal.find(a=>a.type==='chooseOutsideActivePair'&&a.uid===nem.uid&&a.line==='front'&&a.replaceUid===undefined);
 const naming=dispatchUniversalAction(live.packs,structuredClone(played),named);
 assert.equal(naming.players[0].front.find(c=>c?.uid===nem.uid).ready,true);
 assert.equal(naming.pending.kind,'effect-discard');
 aiOk(live.packs,played);
 assert.equal(assertUniversalMatch(live.packs,played),true);
 assert.equal(assertUniversalMatch(live.packs,entered),true);
 assert.equal(assertUniversalMatch(live.packs,skipped),true);
 assert.equal(assertUniversalMatch(live.packs,naming),true);
 assert.equal(assertUniversalMatch(blocked.packs,blocked.s),true);
});

test('BLC-1-061 enters ACTIVE, rests, and may reveal only a Squad Zero top card',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-061');
 assert.equal(printed.effect,'此場域以 ACTIVE 登場。主要階段：REST 此場域，查看己方牌堆頂 1 張；若具有「零番隊」特徵，可公開並加入手牌；若未加入手牌，將其放回牌堆頂或送至場外。');
 assert.equal(printed.nameJa,'霊王宮');
 assert.equal(printed.number,'UA08BT/BLC-1-061');
 assert.equal(printed.type,'field');
 assert.equal(printed.trigger,'get');
 assert.equal(printed.energy,2);
 assert.equal(printed.gen,1);
 assert.equal(printed.color,'purple');
 const card=bleach.cards['BLC-1-061'];
 assert.equal(card.enterAlwaysActive,true);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.mainAbility,{op:'restSelfTopTraitHand',trait:'零番隊'});
 assert.equal(cardHasTrait(bleach.cards['BLC-1-057'],'零番隊'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-1-062'],'零番隊'),false);
 assert.equal(V2_PENDING_LABELS['effect-top-trait-hand'],'查看牌頂，符合特徵可加入手牌，否則放回牌頂或場外');
 const deck=realDeck(['BLC-1-061','BLC-1-057','BLC-2-056','BLC-2-059','BLC-1-062'],'purple');
 const opened=main(deck,30901);
 put(opened.s,0,'BLC-2-056','energy',0);
 put(opened.s,0,'BLC-2-059','energy',1);
 const palace=take(opened.s,0,'BLC-1-061');
 opened.s.players[0].hand.push(palace);
 assert.equal(universalEnergyByColor(opened.packs,opened.s,0).purple,2);
 const play=legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===palace.uid&&a.line==='energy');
 let s=dispatchUniversalAction(opened.packs,opened.s,play);
 const live=s.players[0].energy.find(c=>c?.uid===palace.uid);
 assert.equal(live.ready,true);
 assert.equal(legalUniversalActions(opened.packs,s).some(a=>a.type==='play'&&a.line==='front'&&a.uid===palace.uid),false);
 const zero=setTop(s,0,['BLC-1-057'])[0];
 const act=legalUniversalActions(opened.packs,s).find(a=>a.type==='activate'&&a.uid===palace.uid&&a.mode==='restTopTraitHand');
 s=dispatchUniversalAction(opened.packs,s,act);
 assert.equal(s.players[0].energy.find(c=>c?.uid===palace.uid).ready,false);
 assert.equal(s.pending.kind,'effect-top-trait-hand');
 assert.equal(s.pending.mayHand,true);
 assert.equal(s.pending.uid,zero.uid);
 assert.equal(legalUniversalActions(opened.packs,s).some(a=>a.type==='activate'),false);
 const pub=universalPublicView(opened.packs,s,1);
 assert.deepEqual(pub.pending,{kind:'effect-top-trait-hand',player:0});
 assert.equal(JSON.stringify(pub.pending).includes(zero.uid),false);
 const seen=universalPrivateChoices(opened.packs,s,0);
 assert.equal(seen.options.some(o=>o.card?.cardId==='BLC-1-057'&&o.action.mode==='hand'),true);
 assert.equal(universalPrivateChoices(opened.packs,s,1),null);
 const modes=legalUniversalActions(opened.packs,s).filter(a=>a.type==='chooseTopTraitHand').map(a=>a.mode).sort();
 assert.deepEqual(modes,['hand','outside','top']);
 const refused=dispatchUniversalAction(opened.packs,structuredClone(s),{type:'chooseTopTraitHand',mode:'top'});
 assert.equal(refused.pending,null);
 assert.equal(refused.players[0].deck[0].uid,zero.uid);
 assert.equal(refused.publicReveals.some(r=>r.uid===zero.uid),false);
 const revealed=dispatchUniversalAction(opened.packs,structuredClone(s),{type:'chooseTopTraitHand',mode:'hand'});
 assert.equal(revealed.players[0].hand.some(c=>c.uid===zero.uid),true);
 assert.equal(revealed.publicReveals.some(r=>r.kind==='searched-to-hand'&&r.uid===zero.uid),true);
 const sent=dispatchUniversalAction(opened.packs,s,{type:'chooseTopTraitHand',mode:'outside'});
 assert.equal(sent.players[0].outside.some(c=>c.uid===zero.uid),true);
 assert.equal(sent.publicReveals.some(r=>r.uid===zero.uid),false);
 const other=setTop(sent,0,['BLC-1-062'])[0];
 sent.players[0].energy.find(c=>c?.uid===palace.uid).ready=true;
 assert.equal(sent.mainAbilityUsedUids.includes(palace.uid),false);
 const again=legalUniversalActions(opened.packs,sent).find(a=>a.type==='activate'&&a.uid===palace.uid);
 let plain=dispatchUniversalAction(opened.packs,sent,again);
 assert.equal(plain.pending.mayHand,false);
 assert.equal(legalUniversalActions(opened.packs,plain).some(a=>a.mode==='hand'),false);
 plain=dispatchUniversalAction(opened.packs,plain,{type:'chooseTopTraitHand',mode:'top'});
 assert.equal(plain.players[0].deck[0].uid,other.uid);
 const dry=main(deck,30902);
 put(dry.s,0,'BLC-2-056','energy',0);
 put(dry.s,0,'BLC-2-059','energy',1);
 const bare=take(dry.s,0,'BLC-1-061');
 dry.s.players[0].hand.push(bare);
 let empty=dispatchUniversalAction(dry.packs,dry.s,legalUniversalActions(dry.packs,dry.s).find(a=>a.type==='play'&&a.uid===bare.uid&&a.line==='energy'));
 empty.players[0].outside.push(...empty.players[0].deck.splice(0));
 empty=dispatchUniversalAction(dry.packs,empty,legalUniversalActions(dry.packs,empty).find(a=>a.type==='activate'&&a.uid===bare.uid));
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].energy.find(c=>c?.uid===bare.uid).ready,false);
 const quiet=main(deck,30903);
 put(quiet.s,0,'BLC-2-056','energy',0);
 put(quiet.s,0,'BLC-2-059','energy',1);
 const hushed=take(quiet.s,0,'BLC-1-061');
 quiet.s.players[0].hand.push(hushed);
 const foe=put(quiet.s,1,'BLC-1-057','front',0,true);
 let silenced=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&a.uid===hushed.uid&&a.line==='energy'));
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:1,sourceUid:foe.uid,
  targetUid:hushed.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(legalUniversalActions(quiet.packs,silenced).some(a=>a.type==='activate'&&a.uid===hushed.uid),false);
 aiOk(opened.packs,s);
 assert.equal(assertUniversalMatch(opened.packs,refused),true);
 assert.equal(assertUniversalMatch(opened.packs,revealed),true);
 assert.equal(assertUniversalMatch(opened.packs,sent),true);
 assert.equal(assertUniversalMatch(opened.packs,plain),true);
 assert.equal(assertUniversalMatch(dry.packs,empty),true);
 assert.equal(assertUniversalMatch(quiet.packs,silenced),true);
});

test('BLC-4-077 may recover one sword, then REST-retires and actives plus buffs',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-077');
 assert.equal(printed.effect,'登場時：可從場外將最多1張《神劍・八鏡劍》加入手牌。啟動・主要〔改為Rest，並使此卡退場〕：最多選自己場上1張卡改為Active；再最多選自己場上1個角色，本回合BP+1000。');
 assert.equal(printed.nameJa,'狂骨');
 assert.equal(printed.number,'EX15BT/BLC-4-077');
 assert.equal(printed.type,'field');
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'draw');
 assert.equal(printed.energy,3);
 assert.equal(printed.color,'green');
 const card=bleach.cards['BLC-4-077'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['花天狂骨']);
 assert.deepEqual(card.effects.onPlay,[{op:'recoverOutsideOne',optional:true,filter:{field:'name',value:'神剣・八鏡剣'}}]);
 assert.deepEqual(card.mainAbility,{op:'fieldRestRetireActiveBuff',bp:1000});
 const deck=realDeck(['BLC-4-077','BLC-1-080','BLC-1-069','BLC-1-091','BLC-1-083'],'green');
 const opened=main(deck,31001);
 ['BLC-1-069','BLC-1-091','BLC-1-083'].forEach((id,i)=>put(opened.s,0,id,'energy',i));
 const ken=put(opened.s,0,'BLC-1-080','front',0,false);
 const bone=take(opened.s,0,'BLC-4-077');
 opened.s.players[0].hand.push(bone);
 assert.equal(universalEnergyByColor(opened.packs,opened.s,0).green>=3,true);
 let s=dispatchUniversalAction(opened.packs,opened.s,legalUniversalActions(opened.packs,opened.s).find(a=>a.type==='play'&&a.uid===bone.uid&&a.line==='energy'));
 assert.equal(s.pending,null);
 const live=s.players[0].energy.find(c=>c?.uid===bone.uid);
 assert.equal(live.ready,false);
 assert.equal(legalUniversalActions(opened.packs,s).some(a=>a.type==='activate'&&a.uid===bone.uid),false);
 live.ready=true;
 const before=universalBp(opened.packs,s,ken);
 const act=legalUniversalActions(opened.packs,s).find(a=>a.type==='activate'&&a.uid===bone.uid&&a.mode==='fieldRestRetireActiveBuff');
 let used=dispatchUniversalAction(opened.packs,s,act);
 assert.equal(used.players[0].energy.some(c=>c?.uid===bone.uid),false);
 assert.equal(used.players[0].outside.some(c=>c.uid===bone.uid),true);
 assert.equal(used.pending.kind,'effect-active-any');
 assert.equal(used.pending.choices.includes(ken.uid),true);
 assert.equal(used.pending.choices.includes(bone.uid),false);
 const skipped=dispatchUniversalAction(opened.packs,structuredClone(used),{type:'chooseActiveAny',uid:null});
 assert.equal(skipped.pending.kind,'effect-buff-own');
 assert.equal(skipped.players[0].front.find(c=>c?.uid===ken.uid).ready,false);
 const quiet=dispatchUniversalAction(opened.packs,skipped,{type:'chooseOwnBuff',uid:null});
 assert.equal(quiet.pending,null);
 assert.equal(universalBp(opened.packs,quiet,quiet.players[0].front.find(c=>c?.uid===ken.uid)),before);
 used=dispatchUniversalAction(opened.packs,used,{type:'chooseActiveAny',uid:ken.uid});
 assert.equal(used.players[0].front.find(c=>c?.uid===ken.uid).ready,true);
 assert.equal(used.pending.kind,'effect-buff-own');
 assert.equal(used.pending.choices.includes(ken.uid),true);
 used=dispatchUniversalAction(opened.packs,used,{type:'chooseOwnBuff',uid:ken.uid});
 assert.equal(used.pending,null);
 assert.equal(universalBp(opened.packs,used,used.players[0].front.find(c=>c?.uid===ken.uid)),before+1000);
 const unit=(id,extra)=>({id,name:id,color:'green',type:'character',energy:0,ap:1,bp:2000,gen:1,traits:[],trigger:null,implementation:'vanilla',effects:{},...extra});
 const lab=createUniversalPack({id:'c29-kyokotsu',cards:[
  unit('FLD',{name:'狂骨',type:'field',bp:0,implementation:'dsl',effects:card.effects,mainAbility:card.mainAbility}),
  unit('SWORD',{name:'神剣・八鏡剣',type:'event',bp:0,gen:0}),
  unit('OTHER',{name:'花天',type:'event',bp:0,gen:0}),
  ...['A','B','C','D','E','F','G','H','I','J'].map(id=>unit(id))
 ]});
 const ids=['FLD','SWORD','OTHER','A','B','C','D','E','F','G','H','I','J'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const packs=[lab,lab];
 let labState=newUniversalMatch(packs,{decks:[counts,counts],seed:31002,first:0});
 for(let n=0;n<8&&labState.phase!=='main';n++)labState=dispatchUniversalAction(packs,labState,{type:'next'});
 function lift(id){
  for(const zone of ['hand','deck','life','outside','removed']){
   const list=labState.players[0][zone],i=list.findIndex(c=>c.cardId===id);
   if(i>=0)return list.splice(i,1)[0];
  }
  throw Error('Missing '+id);
 }
 const sword=lift('SWORD'),other=lift('OTHER'),fld=lift('FLD');
 labState.players[0].outside.push(sword,other);
 labState.players[0].hand.push(fld);
 labState=dispatchUniversalAction(packs,labState,legalUniversalActions(packs,labState).find(a=>a.type==='play'&&a.uid===fld.uid&&a.line==='energy'));
 assert.equal(labState.pending.kind,'effect-recover-outside');
 assert.equal(labState.pending.choices.includes(sword.uid),true);
 assert.equal(labState.pending.choices.includes(other.uid),false);
 labState=dispatchUniversalAction(packs,labState,{type:'chooseOutsideRecovery',uid:sword.uid});
 assert.equal(labState.pending,null);
 assert.equal(labState.players[0].hand.some(c=>c.uid===sword.uid),true);
 aiOk(opened.packs,used);
 assert.equal(assertUniversalMatch(opened.packs,used),true);
 assert.equal(assertUniversalMatch(opened.packs,quiet),true);
 assert.equal(assertUniversalMatch(packs,labState),true);
});

test('BLC-4-079 chooses a draw or Nanao Impact, then may rest Kyoraku or Nanao to ready an AP',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-079');
 assert.equal(printed.number,'EX15BT/BLC-4-079');
 assert.equal(printed.nameJa,'神剣・八鏡剣');
 assert.equal(printed.effect,'選1項：①抽1張牌。②最多選自己場上1個《伊勢七緒》，本回合賦予BP+3000及Impact(1)。完成所選效果後，可將自己場上1個Active的《京樂春水》或《伊勢七緒》改為Rest；如此則將自己的1張AP卡改為Active。');
 assert.equal(printed.gen,0);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-4-079'];
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,0);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 assert.equal(card.effects.onPlay[1].op,'restActiveNamedReadyAp');
 const deck=realDeck(['BLC-4-079','BLC-4-064','BLC-4-068','BLC-1-080','BLC-1-091','BLC-1-070','BLC-1-083','BLC-4-062'],'green');
 function board(seed){
  const opened=main(deck,seed);
  const sword=take(opened.s,0,'BLC-4-079');
  opened.s.players[0].hand.push(sword);
  const nanao=put(opened.s,0,'BLC-4-064','front',0);
  const kyoraku=put(opened.s,0,'BLC-4-068','front',1);
  const other=put(opened.s,0,'BLC-1-080','front',2);
  put(opened.s,0,'BLC-1-070','energy',0);
  put(opened.s,0,'BLC-1-083','energy',1);
  put(opened.s,0,'BLC-4-062','energy',2);
  return {opened,sword,nanao,kyoraku,other};
 }
 const drawBoard=board(29079);
 const {packs}=drawBoard.opened;
 assert.equal(legalUniversalActions(packs,drawBoard.opened.s).some(a=>a.type==='event'&&a.uid===drawBoard.sword.uid),true);
 let played=dispatchUniversalAction(packs,drawBoard.opened.s,{type:'event',uid:drawBoard.sword.uid});
 assert.equal(played.pending.kind,'effect-choice-mode');
 assert.equal(V2_PENDING_LABELS[played.pending.kind],'選擇一項效果');
 assert.deepEqual(legalUniversalActions(packs,played).map(a=>a.mode).sort(),['draw','nanao']);
 const before=played.players[0].deck.length;
 const handBefore=played.players[0].hand.length;
 let drawn=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(drawn.players[0].hand.length,handBefore+1);
 assert.equal(drawn.players[0].deck.length,before-1);
 assert.equal(drawn.pending.kind,'effect-named-rest-ready');
 assert.equal(V2_PENDING_LABELS[drawn.pending.kind],'可橫置 1 個 Active 的指定名稱角色，然後啟動 1 張 AP 卡');
 const rests=legalUniversalActions(packs,drawn);
 assert.equal(rests.some(a=>a.type==='chooseNamedRestReady'&&a.uid===null),true);
 assert.equal(rests.some(a=>a.uid===drawBoard.nanao.uid),true);
 assert.equal(rests.some(a=>a.uid===drawBoard.kyoraku.uid),true);
 assert.equal(rests.some(a=>a.uid===drawBoard.other.uid),false);
 const skipped=dispatchUniversalAction(packs,drawn,{type:'chooseNamedRestReady',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,0,drawBoard.kyoraku.uid).ready,true);
 assert.equal(skipped.players[0].apCards.filter(c=>c.inPlay&&!c.ready).length,1);
 const grantBoard=board(29081);
 let second=dispatchUniversalAction(packs,grantBoard.opened.s,{type:'event',uid:grantBoard.sword.uid});
 second=dispatchUniversalAction(packs,second,{type:'chooseEffectMode',mode:'nanao'});
 assert.equal(second.pending.kind,'effect-named-impact');
 assert.equal(V2_PENDING_LABELS[second.pending.kind],'可選 1 個指定名稱角色，本回合 BP 上升並獲得 Impact');
 const impacts=legalUniversalActions(packs,second);
 assert.equal(impacts.some(a=>a.type==='chooseNamedImpact'&&a.uid===null),true);
 assert.equal(impacts.some(a=>a.uid===grantBoard.nanao.uid),true);
 assert.equal(impacts.some(a=>a.uid===grantBoard.kyoraku.uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,second,{type:'chooseNamedImpact',uid:grantBoard.kyoraku.uid}),/not currently legal/);
 aiOk(packs,second);
 let granted=dispatchUniversalAction(packs,second,{type:'chooseNamedImpact',uid:grantBoard.nanao.uid});
 const boosted=live(granted,0,grantBoard.nanao.uid);
 assert.equal(universalBp(packs,granted,boosted),4000);
 assert.equal(universalImpact(packs,granted,boosted),1);
 assert.equal(granted.pending.kind,'effect-named-rest-ready');
 assert.equal(live(granted,0,grantBoard.kyoraku.uid).ready,true);
 let rested=dispatchUniversalAction(packs,granted,{type:'chooseNamedRestReady',uid:grantBoard.kyoraku.uid});
 assert.equal(live(rested,0,grantBoard.kyoraku.uid).ready,false);
 assert.equal(live(rested,0,grantBoard.nanao.uid).ready,true);
 assert.equal(universalImpact(packs,rested,live(rested,0,grantBoard.nanao.uid)),1);
 assert.equal(rested.pending.kind,'effect-recover-ap');
 assert.equal(rested.pending.optional,false);
 const ap=rested.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
 assert.equal(ap.length,1);
 assert.equal(legalUniversalActions(packs,rested).some(a=>a.type==='chooseApRecovery'&&a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(packs,rested,{type:'chooseApRecovery',uid:null}),/not currently legal/);
 const readied=dispatchUniversalAction(packs,rested,{type:'chooseApRecovery',uid:ap[0].uid});
 assert.equal(readied.pending,null);
 assert.equal(readied.players[0].apCards.find(c=>c.uid===ap[0].uid).ready,true);
 assert.equal(readied.players[0].outside.some(c=>c.uid===grantBoard.sword.uid),true);
 const quiet=main(deck,29080);
 const lone=take(quiet.s,0,'BLC-4-079');
 quiet.s.players[0].hand.push(lone);
 put(quiet.s,0,'BLC-1-070','energy',0);
 put(quiet.s,0,'BLC-1-083','energy',1);
 put(quiet.s,0,'BLC-4-062','energy',2);
 const parked=put(quiet.s,0,'BLC-4-068','front',0,false);
 let bare=dispatchUniversalAction(packs,quiet.s,{type:'event',uid:lone.uid});
 bare=dispatchUniversalAction(packs,bare,{type:'chooseEffectMode',mode:'nanao'});
 assert.equal(bare.pending,null);
 assert.equal(live(bare,0,parked.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,readied),true);
 assert.equal(assertUniversalMatch(packs,bare),true);
});

test('BLC-2-064 rests and retires, then may give Kenpachi Impact +1 or Damage +1',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-064');
 assert.equal(printed.number,'EX07BT/BLC-2-064');
 assert.equal(printed.nameJa,'草鹿 やちる');
 assert.equal(printed.effect,'主要階段：REST 並退場自己，可選最多 1 個己方場上的〈更木劍八〉，使其本回合獲得 Impact +1 或 Damage +1；沒有 Impact 的角色獲得 Impact 1，Damage +1 則令直接攻擊傷害增加 1。');
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-2-064'];
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'restRetireNamedGrant');
 assert.equal(card.mainAbility.name,'更木 剣八');
 assert.deepEqual(card.traits,['護廷十三隊']);
 const deck=realDeck(['BLC-2-064','BLC-1-080','BLC-1-081','BLC-1-091'],'green');
 function seat(seed){
  const opened=main(deck,seed);
  const yachiru=put(opened.s,0,'BLC-2-064','front',0);
  const plain=put(opened.s,0,'BLC-1-080','front',1);
  const impact=put(opened.s,0,'BLC-1-081','front',2);
  const other=put(opened.s,0,'BLC-1-091','energy',0);
  return {opened,yachiru,plain,impact,other};
 }
 const first=seat(29064);
 const {packs}=first.opened;
 assert.equal(legalUniversalActions(packs,first.opened.s).some(a=>
  a.type==='activate'&&a.uid===first.yachiru.uid&&a.mode==='restRetireNamed'),true);
 let used=dispatchUniversalAction(packs,first.opened.s,{type:'activate',uid:first.yachiru.uid,mode:'restRetireNamed'});
 assert.equal(used.players[0].front.some(c=>c?.uid===first.yachiru.uid),false);
 assert.equal(used.players[0].outside.some(c=>c.uid===first.yachiru.uid),true);
 assert.equal(used.pending.kind,'effect-named-keyword');
 assert.equal(V2_PENDING_LABELS[used.pending.kind],'可選 1 個指定名稱角色，賦予本回合 Impact 或直接攻擊傷害');
 const choices=legalUniversalActions(packs,used);
 assert.equal(choices.some(a=>a.type==='chooseNamedKeyword'&&a.uid===null),true);
 assert.equal(choices.some(a=>a.uid===first.plain.uid),true);
 assert.equal(choices.some(a=>a.uid===first.impact.uid),true);
 assert.equal(choices.some(a=>a.uid===first.other.uid),false);
 const skipped=dispatchUniversalAction(packs,used,{type:'chooseNamedKeyword',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalImpact(packs,skipped,live(skipped,0,first.plain.uid)),0);
 assert.equal(universalAttackDamage(packs,skipped,live(skipped,0,first.plain.uid)),1);
 const second=seat(29065);
 let aimed=dispatchUniversalAction(packs,second.opened.s,{type:'activate',uid:second.yachiru.uid,mode:'restRetireNamed'});
 aimed=dispatchUniversalAction(packs,aimed,{type:'chooseNamedKeyword',uid:second.plain.uid});
 assert.equal(aimed.pending.kind,'effect-keyword-mode');
 assert.deepEqual(legalUniversalActions(packs,aimed).map(a=>a.mode).sort(),['damage','impact']);
 assert.throws(()=>dispatchUniversalAction(packs,aimed,{type:'chooseKeywordMode',mode:'skip'}),/not currently legal/);
 const impacted=dispatchUniversalAction(packs,aimed,{type:'chooseKeywordMode',mode:'impact'});
 assert.equal(universalImpact(packs,impacted,live(impacted,0,second.plain.uid)),1);
 assert.equal(universalAttackDamage(packs,impacted,live(impacted,0,second.plain.uid)),1);
 const third=seat(29066);
 let hurt=dispatchUniversalAction(packs,third.opened.s,{type:'activate',uid:third.yachiru.uid,mode:'restRetireNamed'});
 const boosted=live(hurt,0,third.impact.uid);
 boosted.attackDamageGranted={turn:hurt.turn,stamp:boosted.fieldEntryStamp,amount:2};
 hurt=dispatchUniversalAction(packs,hurt,{type:'chooseNamedKeyword',uid:third.impact.uid});
 aiOk(packs,hurt);
 hurt=dispatchUniversalAction(packs,hurt,{type:'chooseKeywordMode',mode:'damage'});
 const ken=live(hurt,0,third.impact.uid);
 assert.equal(universalImpact(packs,hurt,ken),1);
 assert.equal(universalAttackDamage(packs,hurt,ken),3);
 const resting=seat(29067);
 resting.yachiru.ready=false;
 assert.equal(legalUniversalActions(packs,resting.opened.s).some(a=>
  a.type==='activate'&&a.uid===resting.yachiru.uid),false);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,impacted),true);
 assert.equal(assertUniversalMatch(packs,hurt),true);
});

test('BLC-4-018 chooses on its own turn to ready or protect a Bambies card, then cuts tall fronts',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-018');
 assert.equal(printed.number,'EX15BT/BLC-4-018');
 assert.equal(printed.nameJa,'リルトット・ランパード');
 assert.equal(printed.effect,'退場時：若為自己的回合，選1項。①最多選自己場上另1個具有「邦比小隊」特徵的角色或《邦比愛塔・芭絲塔拜因》，將其改為Active。②最多選自己場上另1個具有「邦比小隊」特徵的角色或《邦比愛塔・芭絲塔拜因》，到自己下次回合開始前賦予「不會被對方效果選擇」；對方前線所有BP1000以上的角色本回合BP−500。');
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-4-018'];
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['星十字騎士團','邦比小隊']);
 assert.equal(card.effects.onRetire[0].ownTurnOnly,true);
 const deck=realDeck(['BLC-4-018','BLC-2-006','BLC-1-018','BLC-1-016','BLC-1-001','BLC-4-010'],'yellow');
 function seat(seed){
  const opened=main(deck,seed);
  const lilotto=put(opened.s,0,'BLC-4-018','front',0);
  const named=put(opened.s,0,'BLC-2-006','energy',0,false);
  const squad=put(opened.s,0,'BLC-4-018','energy',1,false);
  const other=put(opened.s,0,'BLC-1-018','energy',2,false);
  const wall=put(opened.s,1,'BLC-4-010','front',0);
  const tall=put(opened.s,1,'BLC-1-018','front',1);
  const short=put(opened.s,1,'BLC-1-016','front',2);
  short.buffs=[{bp:-500,untilTurn:opened.s.turn}];
  const bench=put(opened.s,1,'BLC-1-001','energy',0);
  return {opened,lilotto,named,squad,other,wall,tall,short,bench};
 }
 function ownLoss(seat){
  const {packs}=seat.opened;
  let s=seat.opened.s;
  for(let n=0;n<6&&s.phase!=='attack';n++)
   s=dispatchUniversalAction(packs,s,{type:'next'});
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:seat.lilotto.uid});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:seat.wall.uid},{actor:1});
  return s;
 }
 const first=seat(29018);
 const {packs}=first.opened;
 assert.equal(universalBp(packs,first.opened.s,first.short),500);
 let lost=ownLoss(first);
 assert.equal(lost.players[0].front.some(c=>c?.uid===first.lilotto.uid),false);
 assert.equal(lost.players[0].outside.some(c=>c.uid===first.lilotto.uid),true);
 assert.equal(lost.pending.kind,'effect-choice-mode');
 assert.equal(V2_PENDING_LABELS[lost.pending.kind],'選擇一項效果');
 assert.deepEqual(legalUniversalActions(packs,lost).map(a=>a.mode).sort(),['protect','ready']);
 aiOk(packs,lost);
 const readied=dispatchUniversalAction(packs,lost,{type:'chooseEffectMode',mode:'ready'});
 assert.equal(readied.pending.kind,'effect-name-or-trait-ready');
 assert.equal(V2_PENDING_LABELS[readied.pending.kind],'可將 1 個指定名稱或特徵角色改為 ACTIVE');
 const readyChoices=legalUniversalActions(packs,readied);
 assert.equal(readyChoices.some(a=>a.type==='chooseNameOrTraitReady'&&a.uid===null),true);
 assert.equal(readyChoices.some(a=>a.uid===first.named.uid),true);
 assert.equal(readyChoices.some(a=>a.uid===first.squad.uid),true);
 assert.equal(readyChoices.some(a=>a.uid===first.other.uid),false);
 aiOk(packs,readied);
 const stood=dispatchUniversalAction(packs,readied,{type:'chooseNameOrTraitReady',uid:first.named.uid});
 assert.equal(stood.pending,null);
 assert.equal(live(stood,0,first.named.uid).ready,true);
 assert.equal(live(stood,0,first.squad.uid).ready,false);
 const second=seat(29019);
 let guarded=ownLoss(second);
 guarded=dispatchUniversalAction(packs,guarded,{type:'chooseEffectMode',mode:'protect'});
 assert.equal(guarded.pending.kind,'effect-name-or-trait-protect');
 aiOk(packs,guarded);
 guarded=dispatchUniversalAction(packs,guarded,{type:'chooseNameOrTraitProtect',uid:second.squad.uid});
 assert.equal(guarded.pending,null);
 assert.equal(effectChoiceProtected(guarded,1,second.squad.uid,'character'),true);
 assert.equal(effectChoiceProtected(guarded,1,second.squad.uid,'event'),true);
 assert.equal(effectChoiceProtected(guarded,0,second.squad.uid,'character'),false);
 const shield=guarded.continuousStates.find(e=>e.kind==='cannotBeChosenByOppEffect'&&e.targetUid===second.squad.uid);
 assert.equal(shield.selectionScope,'any');
 assert.deepEqual(shield.until,{player:0,phase:'start',edge:'start'});
 assert.equal(shield.sourceLinked,false);
 assert.equal(universalBp(packs,guarded,live(guarded,1,second.wall.uid)),3500);
 assert.equal(universalBp(packs,guarded,live(guarded,1,second.tall.uid)),1000);
 assert.equal(universalBp(packs,guarded,live(guarded,1,second.short.uid)),500);
 assert.equal(universalBp(packs,guarded,live(guarded,1,second.bench.uid)),2000);
 let later=guarded;
 for(let n=0;n<16&&later.active===0;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,1);
 assert.equal(effectChoiceProtected(later,1,second.squad.uid,'character'),true);
 for(let n=0;n<16&&later.active===1;n++)
  later=dispatchUniversalAction(packs,later,{type:'next'});
 assert.equal(later.active,0);
 assert.equal(effectChoiceProtected(later,1,second.squad.uid,'character'),false);
 const third=seat(29020);
 let skipped=ownLoss(third);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseEffectMode',mode:'protect'});
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseNameOrTraitProtect',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'),false);
 assert.equal(universalBp(packs,skipped,live(skipped,1,third.tall.uid)),1000);
 assert.equal(universalBp(packs,skipped,live(skipped,1,third.short.uid)),500);
 const quiet=seat(29021);
 grantContinuousState(quiet.opened.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:quiet.wall.uid,targetUid:quiet.lilotto.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 const silenced=ownLoss(quiet);
 assert.equal(silenced.pending,null);
 assert.equal(silenced.players[0].outside.some(c=>c.uid===quiet.lilotto.uid),true);
 const foe=seat(29022);
 let theirs=foe.opened.s;
 for(let n=0;n<16&&theirs.active===0;n++)
  theirs=dispatchUniversalAction(packs,theirs,{type:'next'});
 assert.equal(theirs.active,1);
 for(let n=0;n<6&&theirs.phase!=='attack';n++)
  theirs=dispatchUniversalAction(packs,theirs,{type:'next'});
 theirs=dispatchUniversalAction(packs,theirs,{type:'attack',uid:foe.wall.uid});
 theirs=dispatchUniversalAction(packs,theirs,{type:'chooseBlock',uid:foe.lilotto.uid},{actor:0});
 assert.equal(theirs.pending,null);
 assert.equal(theirs.players[0].outside.some(c=>c.uid===foe.lilotto.uid),true);
 assert.equal(assertUniversalMatch(packs,stood),true);
 assert.equal(assertUniversalMatch(packs,guarded),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
 assert.equal(assertUniversalMatch(packs,silenced),true);
 assert.equal(assertUniversalMatch(packs,theirs),true);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('BLC-4-008 may retire another Bazz-B, then an opposing front within that printed energy',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-008');
 assert.equal(printed.number,'EX15BT/BLC-4-008');
 assert.equal(printed.nameJa,'バズビー');
 assert.equal(printed.effect,'登場時：若自己場外沒有《友哈巴赫》，可使自己場上另1個《巴茲比》退場；如此則最多選1個對方前線、BP不超過被退場角色所需能量×1000的角色使其退場，並將此角色改為Active。若以此效果使所需能量5以上的己方角色退場，此角色本回合獲得Impact(1)。');
 assert.equal(printed.trigger,'get');
 const card=bleach.cards['BLC-4-008'];
 assert.equal(card.triggerEffect,null);
 assert.equal(card.gen,1);
 assert.equal(card.effects.onPlay[0].op,'sacrificeNamedChain');
 assert.equal(card.effects.onPlay[0].impactMinEnergy,5);
 assert.equal(bleach.cards['BLC-1-011'].energy,5);
 assert.equal(cardHasName(bleach.cards['BLC-1-011'],'バズビー',true),true);
 const deck=realDeck(['BLC-4-008','BLC-2-003','BLC-4-001','BLC-1-018','BLC-1-016','BLC-4-010','BLC-1-021','BLC-1-011'],'yellow');
 function seat(seed){
  const opened=main(deck,seed);
  const other=put(opened.s,0,'BLC-4-008','front',1);
  const big=put(opened.s,0,'BLC-1-011','front',2);
  const small=put(opened.s,0,'BLC-2-003','energy',0);
  const plain=put(opened.s,0,'BLC-1-018','energy',1);
  const fuel=put(opened.s,0,'BLC-1-016','energy',2);
  const alias=put(opened.s,0,'BLC-4-001','energy',3);
  const wall=put(opened.s,1,'BLC-4-010','front',0);
  const mid=put(opened.s,1,'BLC-2-003','front',1);
  const low=put(opened.s,1,'BLC-1-016','front',2);
  const tall=put(opened.s,1,'BLC-1-018','front',3);
  tall.buffs=[{bp:4000,untilTurn:opened.s.turn}];
  const bazz=take(opened.s,0,'BLC-4-008');
  opened.s.players[0].hand.push(bazz);
  return {opened,other,big,small,plain,fuel,alias,wall,mid,low,tall,bazz};
 }
 const first=seat(29008);
 const {packs}=first.opened;
 assert.equal(universalEnergyByColor(packs,first.opened.s,0).yellow>=4,true);
 assert.equal(universalBp(packs,first.opened.s,first.tall),5500);
 assert.equal(legalUniversalActions(packs,first.opened.s).some(a=>
  a.type==='play'&&a.uid===first.bazz.uid&&a.line==='front'&&a.slot===0),true);
 let played=dispatchUniversalAction(packs,first.opened.s,{type:'play',uid:first.bazz.uid,line:'front',slot:0});
 assert.equal(live(played,0,first.bazz.uid).ready,false);
 assert.equal(played.pending.kind,'effect-sacrifice-named');
 assert.equal(V2_PENDING_LABELS[played.pending.kind],'可退場另 1 個指定名稱角色');
 const sacrifice=legalUniversalActions(packs,played);
 assert.equal(sacrifice.some(a=>a.type==='chooseSacrificeNamed'&&a.uid===null),true);
 assert.equal(sacrifice.some(a=>a.uid===first.other.uid),true);
 assert.equal(sacrifice.some(a=>a.uid===first.small.uid),true);
 assert.equal(sacrifice.some(a=>a.uid===first.alias.uid),true);
 assert.equal(sacrifice.some(a=>a.uid===first.big.uid),true);
 assert.equal(sacrifice.some(a=>a.uid===first.plain.uid),false);
 assert.equal(sacrifice.some(a=>a.uid===first.bazz.uid),false);
 aiOk(packs,played);
 const declined=dispatchUniversalAction(packs,played,{type:'chooseSacrificeNamed',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(live(declined,0,first.bazz.uid).ready,false);
 assert.equal(universalImpact(packs,declined,live(declined,0,first.bazz.uid)),0);
 assert.equal(live(declined,1,first.wall.uid).cardId,'BLC-4-010');
 const second=seat(29009);
 let capped=dispatchUniversalAction(packs,second.opened.s,{type:'play',uid:second.bazz.uid,line:'front',slot:0});
 capped=dispatchUniversalAction(packs,capped,{type:'chooseSacrificeNamed',uid:second.other.uid});
 assert.equal(capped.players[0].outside.some(c=>c.uid===second.other.uid),true);
 assert.equal(capped.pending.kind,'effect-retire-bp');
 assert.equal(capped.pending.limit,4000);
 const victims=legalUniversalActions(packs,capped);
 assert.equal(victims.some(a=>a.type==='chooseRetireBp'&&a.uid===null),true);
 assert.equal(victims.some(a=>a.uid===second.wall.uid),true);
 assert.equal(victims.some(a=>a.uid===second.mid.uid),true);
 assert.equal(victims.some(a=>a.uid===second.low.uid),true);
 assert.equal(victims.some(a=>a.uid===second.tall.uid),false);
 aiOk(packs,capped);
 const stood=dispatchUniversalAction(packs,capped,{type:'chooseRetireBp',uid:null});
 assert.equal(stood.pending,null);
 assert.equal(live(stood,0,second.bazz.uid).ready,true);
 assert.equal(universalImpact(packs,stood,live(stood,0,second.bazz.uid)),0);
 assert.equal(live(stood,1,second.wall.uid).cardId,'BLC-4-010');
 const third=seat(29010);
 let narrow=dispatchUniversalAction(packs,third.opened.s,{type:'play',uid:third.bazz.uid,line:'front',slot:0});
 narrow=dispatchUniversalAction(packs,narrow,{type:'chooseSacrificeNamed',uid:third.small.uid});
 assert.equal(narrow.pending.limit,2000);
 const narrowChoices=legalUniversalActions(packs,narrow);
 assert.equal(narrowChoices.some(a=>a.uid===third.low.uid),true);
 assert.equal(narrowChoices.some(a=>a.uid===third.mid.uid),false);
 assert.equal(narrowChoices.some(a=>a.uid===third.wall.uid),false);
 const removed=dispatchUniversalAction(packs,narrow,{type:'chooseRetireBp',uid:third.low.uid});
 assert.equal(removed.pending,null);
 assert.equal(removed.players[1].front.some(c=>c?.uid===third.low.uid),false);
 assert.equal(removed.players[1].outside.some(c=>c.uid===third.low.uid),true);
 assert.equal(live(removed,0,third.bazz.uid).ready,true);
 assert.equal(universalImpact(packs,removed,live(removed,0,third.bazz.uid)),0);
 const fifth=seat(29014);
 let priced=dispatchUniversalAction(packs,fifth.opened.s,{type:'play',uid:fifth.bazz.uid,line:'front',slot:0});
 priced=dispatchUniversalAction(packs,priced,{type:'chooseSacrificeNamed',uid:fifth.big.uid});
 assert.equal(priced.players[0].outside.some(c=>c.uid===fifth.big.uid),true);
 assert.equal(priced.pending.kind,'effect-retire-bp');
 assert.equal(priced.pending.limit,5000);
 assert.equal(legalUniversalActions(packs,priced).some(a=>a.uid===fifth.tall.uid),false);
 aiOk(packs,priced);
 const impacted=dispatchUniversalAction(packs,priced,{type:'chooseRetireBp',uid:null});
 assert.equal(impacted.pending,null);
 assert.equal(live(impacted,0,fifth.bazz.uid).ready,true);
 assert.equal(universalImpact(packs,impacted,live(impacted,0,fifth.bazz.uid)),1);
 grantContinuousState(impacted,{kind:'originalEffectsDisabled',controller:1,sourceUid:fifth.bazz.uid,
  targetUid:fifth.bazz.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalImpact(packs,impacted,live(impacted,0,fifth.bazz.uid)),1);
 const quiet=seat(29011);
 const yhwach=take(quiet.opened.s,0,'BLC-1-021');
 quiet.opened.s.players[0].outside.push(yhwach);
 const blocked=dispatchUniversalAction(packs,quiet.opened.s,{type:'play',uid:quiet.bazz.uid,line:'front',slot:0});
 assert.equal(blocked.pending,null);
 assert.equal(live(blocked,0,quiet.bazz.uid).ready,false);
 const muted=seat(29012);
 grantContinuousState(muted.opened.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:muted.bazz.uid,targetUid:muted.alias.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 const hushed=dispatchUniversalAction(packs,muted.opened.s,{type:'play',uid:muted.bazz.uid,line:'front',slot:0});
 assert.equal(legalUniversalActions(packs,hushed).some(a=>a.uid===muted.alias.uid),false);
 assert.equal(legalUniversalActions(packs,hushed).some(a=>a.uid===muted.small.uid),true);
 const lone=main(deck,29013);
 put(lone.s,0,'BLC-1-018','energy',0);
 put(lone.s,0,'BLC-1-016','energy',1);
 put(lone.s,0,'BLC-4-010','energy',2);
 put(lone.s,0,'BLC-1-021','energy',3);
 const only=take(lone.s,0,'BLC-4-008');
 lone.s.players[0].hand.push(only);
 const alone=dispatchUniversalAction(packs,lone.s,{type:'play',uid:only.uid,line:'front',slot:0});
 assert.equal(alone.pending,null);
 assert.equal(live(alone,0,only.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,declined),true);
 assert.equal(assertUniversalMatch(packs,stood),true);
 assert.equal(assertUniversalMatch(packs,removed),true);
 assert.equal(assertUniversalMatch(packs,blocked),true);
 assert.equal(assertUniversalMatch(packs,hushed),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
 assert.equal(assertUniversalMatch(packs,impacted),true);
});

test('BLC-4-065 steps, gains BP from energy-line Kyoraku, and actives once after the mirror sword',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-065');
 assert.equal(printed.number,'EX15BT/BLC-4-065');
 assert.equal(printed.nameJa,'伊勢 七緒');
 assert.equal(printed.effect,'Step：移動階段可從前線移至能量線。自己的回合中：若自己的能量線有《京樂春水》，此角色BP+1500。啟動・主要：僅在本回合已使用《神劍・八鏡劍》時可發動；將此角色改為Active。所有《伊勢七緒》的此效果合計每回合僅限1次。');
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'color');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 const card=bleach.cards['BLC-4-065'];
 assert.equal(card.gen,2);
 assert.equal(card.step,true);
 assert.equal(card.name,'伊勢 七緒');
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'ownNameExists',turn:'own',zone:'energy',excludeSelf:false,name:'京楽 春水'},bp:1500}]);
 assert.deepEqual(card.mainAbility,{op:'nameOnceActiveIfEvent',scope:'name',eventName:'神剣・八鏡剣'});
 assert.deepEqual(card.triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
 const otherNanao=bleach.cards['BLC-4-064'];
 assert.equal(otherNanao.name,'伊勢 七緒');
 assert.equal(otherNanao.mainAbility?.op==='nameOnceActiveIfEvent',false);
 const bare={id:'BAD',name:'BAD',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-nanao-event',cards:[{...bare,mainAbility:{op:'nameOnceActiveIfEvent',scope:'card',eventName:'神剣・八鏡剣'}}]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-4-065','BLC-4-079','BLC-1-098','BLC-1-074','BLC-4-068','BLC-4-064','BLC-1-078','BLC-4-062','BLC-1-083','BLC-1-080','BLC-1-091'],'green');
 function seat(seed){
  const opened=main(deck,seed);
  const self=put(opened.s,0,'BLC-4-065','front',0,false);
  const copy=put(opened.s,0,'BLC-4-065','front',1,false);
  const earlier=put(opened.s,0,'BLC-4-064','front',2,false);
  const kyoraku=put(opened.s,0,'BLC-1-074','energy',0);
  put(opened.s,0,'BLC-1-078','energy',1);
  put(opened.s,0,'BLC-4-062','energy',2);
  put(opened.s,0,'BLC-1-083','energy',3);
  const funeral=take(opened.s,0,'BLC-1-098');
  const sword=take(opened.s,0,'BLC-4-079');
  opened.s.players[0].hand.push(funeral,sword);
  return {opened,self,copy,earlier,kyoraku,funeral,sword};
 }
 const first=seat(29065);
 const {packs}=first.opened;
 assert.equal(universalEnergyByColor(packs,first.opened.s,0).green>=4,true);
 assert.equal(universalBp(packs,first.opened.s,first.self),4000);
 const frontOnly=main(deck,29066);
 const parked=put(frontOnly.s,0,'BLC-4-065','front',0,false);
 put(frontOnly.s,0,'BLC-1-074','front',1);
 assert.equal(universalBp(frontOnly.packs,frontOnly.s,parked),2500);
 const alias=main(deck,29067);
 const aliased=put(alias.s,0,'BLC-4-065','front',0,false);
 put(alias.s,0,'BLC-4-068','energy',0);
 assert.equal(universalBp(alias.packs,alias.s,aliased),4000);
 let opp=structuredClone(first.opened.s);
 for(let n=0;n<16&&opp.active===0;n++)opp=dispatchUniversalAction(packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 assert.equal(universalBp(packs,opp,live(opp,0,first.self.uid)),2500);
 assert.equal(legalUniversalActions(packs,first.opened.s).some(a=>a.mode==='nameOnceEventActive'),false);
 assert.equal(legalUniversalActions(packs,first.opened.s).some(a=>a.type==='event'&&a.uid===first.funeral.uid),true);
 let wrong=dispatchUniversalAction(packs,first.opened.s,{type:'event',uid:first.funeral.uid});
 assert.equal(wrong.pending,null);
 assert.equal(wrong.players[0].outside.some(c=>c.uid===first.funeral.uid),true);
 assert.equal(legalUniversalActions(packs,wrong).some(a=>a.mode==='nameOnceEventActive'),false);
 wrong.players[0].apCards.find(c=>c.inPlay).ready=true;
 assert.equal(legalUniversalActions(packs,wrong).some(a=>a.type==='event'&&a.uid===first.sword.uid),true);
 let played=dispatchUniversalAction(packs,wrong,{type:'event',uid:first.sword.uid});
 assert.equal(played.pending.kind,'effect-choice-mode');
 played=dispatchUniversalAction(packs,played,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(played.pending.kind,'effect-named-rest-ready');
 played=dispatchUniversalAction(packs,played,{type:'chooseNamedRestReady',uid:null});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].outside.some(c=>c.uid===first.sword.uid),true);
 const act=legalUniversalActions(packs,played).find(a=>a.type==='activate'&&a.mode==='nameOnceEventActive'&&a.uid===first.self.uid);
 assert.ok(act);
 played=dispatchUniversalAction(packs,played,act);
 assert.equal(live(played,0,first.self.uid).ready,true);
 assert.equal(legalUniversalActions(packs,played).some(a=>a.mode==='nameOnceEventActive'),false);
 assert.throws(()=>dispatchUniversalAction(packs,played,{type:'activate',uid:first.copy.uid,mode:'nameOnceEventActive'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,played,{type:'activate',uid:first.earlier.uid,mode:'nameOnceEventActive'}),/not currently legal/);
 const hushed=seat(29068);
 grantContinuousState(hushed.opened.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:hushed.kyoraku.uid,targetUid:hushed.self.uid,sourceLinked:false,
  until:{player:0,phase:'main',edge:'start'}});
 assert.equal(universalBp(hushed.opened.packs,hushed.opened.s,hushed.self),2500);
 let silenced=dispatchUniversalAction(hushed.opened.packs,hushed.opened.s,{type:'event',uid:hushed.funeral.uid});
 assert.equal(silenced.pending,null);
 silenced.players[0].apCards.find(c=>c.inPlay).ready=true;
 silenced=dispatchUniversalAction(hushed.opened.packs,silenced,{type:'event',uid:hushed.sword.uid});
 silenced=dispatchUniversalAction(hushed.opened.packs,silenced,{type:'chooseEffectMode',mode:'draw'});
 silenced=dispatchUniversalAction(hushed.opened.packs,silenced,{type:'chooseNamedRestReady',uid:null});
 assert.equal(universalBp(hushed.opened.packs,silenced,live(silenced,0,hushed.self.uid)),2500);
 assert.equal(universalBp(hushed.opened.packs,silenced,live(silenced,0,hushed.copy.uid)),4000);
 const hushedActs=legalUniversalActions(hushed.opened.packs,silenced);
 assert.equal(hushedActs.some(a=>a.mode==='nameOnceEventActive'&&a.uid===hushed.self.uid),false);
 assert.equal(hushedActs.some(a=>a.mode==='nameOnceEventActive'&&a.uid===hushed.copy.uid),true);
 let stepped=played;
 for(let n=0;n<30&&!(stepped.active===0&&stepped.phase==='move'&&stepped.players[0].ownTurns===2);n++)
  stepped=dispatchUniversalAction(packs,stepped,{type:'next'});
 const shift=legalUniversalActions(packs,stepped).find(a=>a.type==='step'&&a.uid===first.self.uid);
 assert.ok(shift);
 stepped=dispatchUniversalAction(packs,stepped,shift);
 assert.equal(stepped.players[0].energy.some(c=>c?.uid===first.self.uid),true);
 assert.equal(legalUniversalActions(packs,stepped).some(a=>a.mode==='nameOnceEventActive'),false);
 const quietStep=main(deck,29069);
 const mover=put(quietStep.s,0,'BLC-4-065','front',0,true);
 put(quietStep.s,0,'BLC-1-083','energy',0);
 grantContinuousState(quietStep.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:mover.uid,targetUid:mover.uid,sourceLinked:false,
  until:{player:0,phase:'main',edge:'start'}});
 let locked=quietStep.s;
 for(let n=0;n<30&&!(locked.active===0&&locked.phase==='move'&&locked.players[0].ownTurns===2);n++)
  locked=dispatchUniversalAction(quietStep.packs,locked,{type:'next'});
 assert.equal(legalUniversalActions(quietStep.packs,locked).some(a=>a.type==='step'&&a.uid===mover.uid),false);
 const color=main(deck,29070);
 const attacker=put(color.s,0,'BLC-1-080','front',0,true);
 const trigger=take(color.s,1,'BLC-4-065');
 const buried=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buried);
 const cheap=take(color.s,1,'BLC-1-091');
 const zero=take(color.s,1,'BLC-4-064');
 const mid=take(color.s,1,'BLC-4-062');
 const heavy=take(color.s,1,'BLC-1-080');
 const costly=take(color.s,1,'BLC-4-065');
 const eventCard=take(color.s,1,'BLC-4-079');
 color.s.players[1].hand.push(cheap,zero,mid,heavy,costly,eventCard);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='color'&&a.uid===cheap.uid),true);
 assert.equal(choices.some(a=>a.mode==='color'&&a.uid===zero.uid),true);
 assert.equal(choices.some(a=>a.mode==='color'&&a.uid===mid.uid),true);
 assert.equal(choices.some(a=>a.uid===heavy.uid),false);
 assert.equal(choices.some(a=>a.uid===costly.uid),false);
 assert.equal(choices.some(a=>a.uid===eventCard.uid),false);
 aiOk(color.packs,revealed);
 const deployed=dispatchUniversalAction(color.packs,revealed,{type:'chooseTrigger',mode:'color',uid:cheap.uid,line:'front',slot:0},{actor:1});
 const entered=deployed.players[1].front.find(c=>c?.uid===cheap.uid);
 assert.equal(entered.ready,true);
 assert.equal(deployed.players[1].outside.some(c=>c.uid===trigger.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,played),true);
 assert.equal(assertUniversalMatch(packs,stepped),true);
 assert.equal(assertUniversalMatch(frontOnly.packs,frontOnly.s),true);
 assert.equal(assertUniversalMatch(alias.packs,alias.s),true);
 assert.equal(assertUniversalMatch(hushed.opened.packs,silenced),true);
 assert.equal(assertUniversalMatch(quietStep.packs,locked),true);
 assert.equal(assertUniversalMatch(color.packs,deployed),true);
});

test('BLC-2-051 nulls Impact and gains Damage 2 or Impact 1 from the removed area',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-051');
 assert.equal(printed.number,'EX07BT/BLC-2-051');
 assert.equal(printed.nameJa,'黒崎 一護');
 assert.equal(printed.effect,'Impact 無效。己方除外區有至少 10 張卡，或有至少 2 種不同卡名、具有「零番隊」特徵的卡時，此角色獲得 Damage 2；己方除外區有至少 4 種不同卡名、具有「零番隊」特徵的卡時，再獲得 Impact 1。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'get');
 const card=bleach.cards['BLC-2-051'];
 assert.equal(card.impactNull,true);
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.equal(cardHasName(card,'黒崎 一護'),true);
 assert.deepEqual(card.passiveBonuses,[
  {condition:{logic:'any',turn:'any',checks:[
   {kind:'ownRemovedCountAtLeast',turn:'any',min:10},
   {kind:'ownRemovedDistinctTrait',turn:'any',trait:'零番隊',min:2}]},attackDamage:2},
  {condition:{kind:'ownRemovedDistinctTrait',turn:'any',trait:'零番隊',min:4},impact:1}]);
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 const anyRemoved={logic:'any',turn:'any',checks:[{kind:'ownRemovedCountAtLeast',turn:'any',min:10}]};
 assert.throws(()=>createUniversalPack({id:'bad-damage',cards:[{...bare,passiveBonuses:[{condition:anyRemoved,attackDamage:3}]}]}),/invalid passive bonus/);
 const ids=['BLC-2-051','BLC-1-056','BLC-1-057','BLC-1-058','BLC-1-059','BLC-1-060','BLC-2-055','BLC-2-056','BLC-1-004','BLC-2-040','BLC-1-109','BLC-1-041','BLC-2-058'];
 const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 function bury(s,p,id){
  const c=take(s,p,id);
  s.players[p].removed.push(c);
  return c;
 }
 function finishLife(packs,s){
  for(let n=0;n<8&&s.pending&&['life-batch-order','life-trigger'].includes(s.pending.kind);n++){
   const actor={actor:s.pending.player};
   if(s.pending.kind==='life-batch-order'){
    const order=legalUniversalActions(packs,s).find(a=>a.type==='chooseLifeOrder');
    s=dispatchUniversalAction(packs,s,order,actor);
   }else{
    const skip=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='skip')
     ||legalUniversalActions(packs,s)[0];
    s=dispatchUniversalAction(packs,s,skip,actor);
   }
  }
  return s;
 }
 const quiet=main(deck,29051);
 const self=put(quiet.s,0,'BLC-2-051','front',0,true);
 assert.equal(universalAttackDamage(quiet.packs,quiet.s,self),1);
 assert.equal(universalImpact(quiet.packs,quiet.s,self),0);
 const sameName=main(deck,29052);
 const doubled=put(sameName.s,0,'BLC-2-051','front',0,true);
 bury(sameName.s,0,'BLC-1-056');
 bury(sameName.s,0,'BLC-2-055');
 assert.equal(bleach.cards['BLC-1-056'].name,bleach.cards['BLC-2-055'].name);
 assert.equal(universalAttackDamage(sameName.packs,sameName.s,doubled),1);
 assert.equal(universalImpact(sameName.packs,sameName.s,doubled),0);
 const two=main(deck,29053);
 const paired=put(two.s,0,'BLC-2-051','front',0,true);
 bury(two.s,0,'BLC-1-056');
 bury(two.s,0,'BLC-1-057');
 assert.equal(universalAttackDamage(two.packs,two.s,paired),2);
 assert.equal(universalImpact(two.packs,two.s,paired),0);
 const piled=main(deck,29054);
 const bulky=put(piled.s,0,'BLC-2-051','front',0,true);
 for(const id of ['BLC-1-004','BLC-1-004','BLC-1-004','BLC-1-004','BLC-2-040','BLC-2-040','BLC-2-040','BLC-2-040','BLC-1-041','BLC-1-109'])
  bury(piled.s,0,id);
 assert.equal(piled.s.players[0].removed.length,10);
 assert.equal(piled.s.players[0].removed.some(c=>c.cardId==='BLC-1-109'),true);
 assert.equal(universalAttackDamage(piled.packs,piled.s,bulky),2);
 assert.equal(universalImpact(piled.packs,piled.s,bulky),0);
 const lifeBefore=piled.s.players[1].life.length;
 let struck=piled.s;
 for(let n=0;n<6&&struck.phase!=='attack';n++)
  struck=dispatchUniversalAction(piled.packs,struck,{type:'next'});
 struck=dispatchUniversalAction(piled.packs,struck,{type:'attack',uid:bulky.uid});
 struck=dispatchUniversalAction(piled.packs,struck,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(struck.players[1].life.length,lifeBefore-2);
 assert.equal(struck.pending.kind,'life-batch-order');
 struck=finishLife(piled.packs,struck);
 assert.equal(struck.pending,null);
 const named=main(deck,29055);
 const ichigo=put(named.s,0,'BLC-2-051','front',0,true);
 for(const id of ['BLC-1-056','BLC-1-057','BLC-1-058','BLC-1-059'])bury(named.s,0,id);
 assert.equal(universalAttackDamage(named.packs,named.s,ichigo),2);
 assert.equal(universalImpact(named.packs,named.s,ichigo),1);
 const wall=put(named.s,1,'BLC-2-040','front',0,true);
 const plainLife=take(named.s,1,'BLC-2-055');
 named.s.players[1].life.unshift(plainLife);
 const lives=named.s.players[1].life.length;
 let won=named.s;
 for(let n=0;n<6&&won.phase!=='attack';n++)
  won=dispatchUniversalAction(named.packs,won,{type:'next'});
 won=dispatchUniversalAction(named.packs,won,{type:'attack',uid:ichigo.uid});
 won=dispatchUniversalAction(named.packs,won,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(won.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(won.players[1].life.length,lives-1);
 assert.equal(won.pending,null);
 let opp=won;
 for(let n=0;n<16&&opp.active===0;n++)opp=dispatchUniversalAction(named.packs,opp,{type:'next'});
 assert.equal(opp.active,1);
 const away=live(opp,0,ichigo.uid);
 assert.equal(universalAttackDamage(named.packs,opp,away),2);
 assert.equal(universalImpact(named.packs,opp,away),1);
 const muted=main(deck,29056);
 const silent=put(muted.s,0,'BLC-2-051','front',0,true);
 const source=put(muted.s,1,'BLC-2-040','front',0,true);
 for(const id of ['BLC-1-056','BLC-1-057','BLC-1-058','BLC-1-059'])bury(muted.s,0,id);
 grantContinuousState(muted.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:source.uid,targetUid:silent.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalAttackDamage(muted.packs,muted.s,silent),1);
 assert.equal(universalImpact(muted.packs,muted.s,silent),0);
 const nulled=main(deck,29057);
 const es=put(nulled.s,0,'BLC-1-004','front',0,true);
 const body=put(nulled.s,1,'BLC-2-051','front',0,true);
 assert.equal(universalBp(nulled.packs,nulled.s,es),4000);
 assert.equal(universalBp(nulled.packs,nulled.s,body),4000);
 assert.equal(universalImpact(nulled.packs,nulled.s,es),1);
 const saved=nulled.s.players[1].life.length;
 let clash=nulled.s;
 for(let n=0;n<6&&clash.phase!=='attack';n++)
  clash=dispatchUniversalAction(nulled.packs,clash,{type:'next'});
 clash=dispatchUniversalAction(nulled.packs,clash,{type:'attack',uid:es.uid});
 clash=dispatchUniversalAction(nulled.packs,clash,{type:'chooseBlock',uid:body.uid},{actor:1});
 assert.equal(clash.players[1].outside.some(c=>c.uid===body.uid),true);
 assert.equal(clash.players[0].front.some(c=>c?.uid===es.uid),true);
 assert.equal(clash.players[1].life.length,saved);
 assert.equal(clash.pending,null);
 aiOk(quiet.packs,quiet.s);
 assert.equal(assertUniversalMatch(quiet.packs,quiet.s),true);
 assert.equal(assertUniversalMatch(sameName.packs,sameName.s),true);
 assert.equal(assertUniversalMatch(two.packs,two.s),true);
 assert.equal(assertUniversalMatch(piled.packs,struck),true);
 assert.equal(assertUniversalMatch(named.packs,opp),true);
 assert.equal(assertUniversalMatch(muted.packs,muted.s),true);
 assert.equal(assertUniversalMatch(nulled.packs,clash),true);
});

test('BLC-1-092 generates energy on the front and removes a battle loser without retiring it',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-092');
 assert.equal(printed.number,'UA08BT/BLC-1-092');
 assert.equal(printed.nameJa,'山本 元柳斎 重國');
 assert.equal(printed.effect,'此角色位於前線時亦產生能源。己方回合中，與此角色戰鬥並敗北的敵方角色改為除外，且不視為退場。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-1-092'];
 assert.equal(card.frontGeneratesEnergy,true);
 assert.equal(card.battleRemoveInstead,true);
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
 const ids=['BLC-1-092','BLC-2-040','BLC-4-064','BLC-4-061','BLC-1-083','BLC-1-091','BLC-1-080','BLC-1-078','BLC-4-062','BLC-1-087','BLC-2-067','BLC-4-060','BLC-1-079'];
 const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const energy=main(deck,29092);
 const front=put(energy.s,0,'BLC-1-092','front',0,false);
 assert.equal(universalCardEnergy(energy.packs,energy.s,0,front),1);
 assert.equal(universalEnergyByColor(energy.packs,energy.s,0).green,1);
 const lined=main(deck,29093);
 const bench=put(lined.s,0,'BLC-1-080','front',0,true);
 assert.equal(universalCardEnergy(lined.packs,lined.s,0,bench),0);
 const hushed=main(deck,29094);
 const quiet=put(hushed.s,0,'BLC-1-092','front',0,true);
 grantContinuousState(hushed.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:quiet.uid,targetUid:quiet.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalCardEnergy(hushed.packs,hushed.s,0,quiet),0);
 const won=main(deck,29095);
 const yama=put(won.s,0,'BLC-1-092','front',0,true);
 yama.impactGranted={turn:won.s.turn,stamp:yama.fieldEntryStamp,amount:1};
 const wall=put(won.s,1,'BLC-2-040','front',0,true);
 const layer=take(won.s,1,'BLC-4-064');
 wall.stack=[layer];
 const plain=take(won.s,1,'BLC-1-079');
 won.s.players[1].life.unshift(plain);
 const deckBefore=won.s.players[1].deck.length;
 const handBefore=won.s.players[1].hand.length;
 const lives=won.s.players[1].life.length;
 let battle=won.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(won.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(won.packs,battle,{type:'attack',uid:yama.uid});
 battle=dispatchUniversalAction(won.packs,battle,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(battle.players[1].removed.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),false);
 assert.equal(battle.players[1].outside.some(c=>c.uid===layer.uid),true);
 assert.equal(battle.turnRetireEvents.some(e=>e.uid===wall.uid),false);
 assert.equal(battle.players[1].deck.length,deckBefore);
 assert.equal(battle.players[1].hand.length,handBefore);
 assert.equal(battle.players[1].life.length,lives-1);
 assert.equal(battle.pending,null);
 const other=main(deck,29096);
 const attacker=put(other.s,0,'BLC-2-040','front',0,true);
 const blocker=put(other.s,1,'BLC-1-092','front',0,true);
 const beforeDeck=other.s.players[0].deck.length;
 const beforeHand=other.s.players[0].hand.length;
 let blocked=other.s;
 for(let n=0;n<6&&blocked.phase!=='attack';n++)
  blocked=dispatchUniversalAction(other.packs,blocked,{type:'next'});
 blocked=dispatchUniversalAction(other.packs,blocked,{type:'attack',uid:attacker.uid});
 blocked=dispatchUniversalAction(other.packs,blocked,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(blocked.players[0].outside.some(c=>c.uid===attacker.uid),true);
 assert.equal(blocked.players[0].removed.some(c=>c.uid===attacker.uid),false);
 assert.equal(blocked.players[0].deck.length,beforeDeck-1);
 assert.equal(blocked.players[0].hand.length,beforeHand+1);
 assert.equal(blocked.turnRetireEvents.some(e=>e.uid===attacker.uid),true);
 const silenced=main(deck,29097);
 const muted=put(silenced.s,0,'BLC-1-092','front',0,true);
 const victim=put(silenced.s,1,'BLC-2-040','front',0,true);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:muted.uid,targetUid:muted.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const muteDeck=silenced.s.players[1].deck.length;
 let ordinary=silenced.s;
 for(let n=0;n<6&&ordinary.phase!=='attack';n++)
  ordinary=dispatchUniversalAction(silenced.packs,ordinary,{type:'next'});
 ordinary=dispatchUniversalAction(silenced.packs,ordinary,{type:'attack',uid:muted.uid});
 ordinary=dispatchUniversalAction(silenced.packs,ordinary,{type:'chooseBlock',uid:victim.uid},{actor:1});
 assert.equal(ordinary.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(ordinary.players[1].removed.some(c=>c.uid===victim.uid),false);
 assert.equal(ordinary.players[1].deck.length,muteDeck-1);
 const color=main(deck,29098);
 const striker=put(color.s,0,'BLC-1-080','front',0,true);
 const trigger=take(color.s,1,'BLC-1-092');
 const buriedLife=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buriedLife);
 const cheap=take(color.s,1,'BLC-4-064');
 const heavy=take(color.s,1,'BLC-1-080');
 color.s.players[1].hand.push(cheap,heavy);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:striker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='color'&&a.uid===cheap.uid),true);
 assert.equal(choices.some(a=>a.uid===heavy.uid),false);
 const deployed=dispatchUniversalAction(color.packs,revealed,{type:'chooseTrigger',mode:'color',uid:cheap.uid,line:'energy',slot:0},{actor:1});
 assert.equal(deployed.players[1].energy.find(c=>c?.uid===cheap.uid).ready,true);
 aiOk(energy.packs,energy.s);
 assert.equal(assertUniversalMatch(energy.packs,energy.s),true);
 assert.equal(assertUniversalMatch(won.packs,battle),true);
 assert.equal(assertUniversalMatch(other.packs,blocked),true);
 assert.equal(assertUniversalMatch(silenced.packs,ordinary),true);
 assert.equal(assertUniversalMatch(color.packs,deployed),true);
});

test('BLC-4-044 gives Yoruichi BP+2000 and Impact plus sniper on her first attack',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-044');
 assert.equal(printed.number,'EX15BT/BLC-4-044');
 assert.equal(printed.nameJa,'瞬閧・雷神戦形');
 assert.equal(printed.effect,'選自己場上1個《四楓院夜一》，本回合賦予BP+2000，以及「此角色於本回合進行第一次攻擊時，直到該次攻擊結束，獲得Impact(1)與狙擊（可指定對方前線角色為攻擊對象，該次攻擊不會被阻擋）」。');
 assert.equal(printed.trigger,'special');
 assert.equal(printed.gen,0);
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-044'];
 assert.equal(card.gen,0);
 assert.equal(card.triggerEffect.op,'retireOppFront');
 assert.deepEqual(card.effects.onPlay,[{op:'grantFirstAttackKit',name:'四楓院 夜一',bp:2000}]);
 const bare={id:'BAD',name:'BAD',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,traits:[],trigger:'special',implementation:'dsl',triggerEffect:{op:'retireOppFront'},effects:{onPlay:[{op:'grantFirstAttackKit',name:'',bp:2000}]}};
 assert.throws(()=>createUniversalPack({id:'bad-kit',cards:[bare]}),/invalid first-attack kit/);
 const deck=realDeck(['BLC-4-044','BLC-2-024','BLC-2-031','BLC-3-002','BLC-2-015','BLC-2-016','BLC-2-026'],'blue');
 const quiet=main(deck,29044);
 put(quiet.s,0,'BLC-2-031','energy',0);
 put(quiet.s,0,'BLC-3-002','energy',1);
 put(quiet.s,0,'BLC-2-015','energy',2);
 put(quiet.s,0,'BLC-2-016','energy',3);
 const other=put(quiet.s,0,'BLC-2-026','front',0,true);
 const event=take(quiet.s,0,'BLC-4-044');
 quiet.s.players[0].hand.push(event);
 assert.equal(universalEnergyByColor(quiet.packs,quiet.s,0).blue>=4,true);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const first=main(deck,29045);
 put(first.s,0,'BLC-2-031','energy',0);
 put(first.s,0,'BLC-3-002','energy',1);
 put(first.s,0,'BLC-2-015','energy',2);
 put(first.s,0,'BLC-2-016','energy',3);
 const yoru=put(first.s,0,'BLC-2-024','front',0,true);
 const bystander=put(first.s,0,'BLC-2-026','front',1,true);
 const wall=put(first.s,1,'BLC-2-016','front',0,true);
 const secondWall=put(first.s,1,'BLC-2-026','front',1,true);
 const form=take(first.s,0,'BLC-4-044');
 first.s.players[0].hand.push(form);
 assert.equal(legalUniversalActions(first.packs,first.s).some(a=>a.type==='event'&&a.uid===form.uid),true);
 let played=dispatchUniversalAction(first.packs,first.s,{type:'event',uid:form.uid});
 assert.equal(played.pending.kind,'effect-first-attack-kit');
 assert.equal(V2_PENDING_LABELS[played.pending.kind],'選 1 個指定名稱角色，本回合 BP 上升，第一次攻擊獲得 Impact 與狙擊');
 const choices=legalUniversalActions(first.packs,played);
 assert.equal(choices.some(a=>a.type==='chooseFirstAttackKit'&&a.uid===yoru.uid),true);
 assert.equal(choices.some(a=>a.uid===bystander.uid),false);
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'chooseFirstAttackKit',uid:null}),/not currently legal/);
 aiOk(first.packs,played);
 played=dispatchUniversalAction(first.packs,played,{type:'chooseFirstAttackKit',uid:yoru.uid});
 assert.equal(played.pending,null);
 const boosted=live(played,0,yoru.uid);
 assert.equal(universalBp(first.packs,played,boosted),6000);
 assert.equal(universalImpact(first.packs,played,boosted),0);
 grantContinuousState(played,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:bystander.uid,targetUid:yoru.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalBp(first.packs,played,live(played,0,yoru.uid)),5500);
 let battle=played;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(first.packs,battle,{type:'next'});
 const quietLife=Object.keys(deck).find(id=>!bleach.cards[id].trigger);
 battle.players[1].life.unshift(take(battle,1,quietLife));
 const aimed=legalUniversalActions(first.packs,battle).find(a=>a.type==='attack'&&a.uid===yoru.uid&&a.targetUid===wall.uid);
 assert.ok(aimed);
 const lives=battle.players[1].life.length;
 battle=dispatchUniversalAction(first.packs,battle,aimed);
 assert.equal(battle.pending,null);
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(battle.players[1].life.length,lives-1);
 assert.equal(universalImpact(first.packs,battle,live(battle,0,yoru.uid)),0);
 live(battle,0,yoru.uid).ready=true;
 assert.equal(legalUniversalActions(first.packs,battle).some(a=>a.type==='attack'&&a.uid===yoru.uid&&a.targetUid),false);
 const again=legalUniversalActions(first.packs,battle).find(a=>a.type==='attack'&&a.uid===yoru.uid&&!a.targetUid);
 assert.ok(again);
 const before=battle.players[1].life.length;
 battle=dispatchUniversalAction(first.packs,battle,again);
 battle=dispatchUniversalAction(first.packs,battle,{type:'chooseBlock',uid:secondWall.uid},{actor:1});
 assert.equal(battle.players[1].outside.some(c=>c.uid===secondWall.uid),true);
 assert.equal(battle.players[1].life.length,before);
 assert.equal(universalBp(first.packs,battle,live(battle,0,yoru.uid)),5500);
 aiOk(quiet.packs,quiet.s);
 assert.equal(assertUniversalMatch(quiet.packs,quiet.s),true);
 assert.equal(assertUniversalMatch(first.packs,battle),true);
});

test('BLC-4-016 sacrifices another character on its entry turn, then generates yellow and chooses',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-016');
 assert.equal(printed.number,'EX15BT/BLC-4-016');
 assert.equal(printed.nameJa,'リジェ・バロ');
 assert.equal(printed.effect,'啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動；使自己場上另1個角色退場，如此則此角色到自己下次回合開始前額外產生1個黃色能量，並選1項：①抽1張牌。②最多選1個對方前線BP1500以上的角色，本回合BP−1000。');
 assert.equal(printed.trigger,'active');
 assert.equal(printed.gen,4);
 assert.deepEqual(printed.traits,['星十字騎士團']);
 const card=bleach.cards['BLC-4-016'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects.onPlay,[{op:'noteEntryTurn'}]);
 assert.deepEqual(card.mainAbility,{op:'entryTurnSacrificeChoice',oncePerTurn:true,energy:1,color:'yellow',minBp:1500,down:1000});
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-016');
 assert.equal(entry.sourceRecord.gen,2);
 assert.equal(entry.sourceRecord.legacyImportedGen,4);
 assert.equal(entry.definition.gen,2);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:3,ap:1,bp:2500,gen:2,traits:['星十字騎士團'],trigger:'active',implementation:'dsl',effects:{onPlay:[{op:'noteEntryTurn'}]},mainAbility:{op:'entryTurnSacrificeChoice',oncePerTurn:true,energy:2,color:'yellow',minBp:1500,down:1000}};
 assert.throws(()=>createUniversalPack({id:'bad-lille',cards:[bare]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-4-016','BLC-1-016','BLC-1-018','BLC-1-026','BLC-1-006','BLC-1-002'],'yellow');
 const solo=main(deck,29016);
 const only=put(solo.s,0,'BLC-4-016','energy',0,false);
 only.entryTurn=solo.s.turn;
 assert.equal(legalUniversalActions(solo.packs,solo.s).some(a=>a.type==='activate'&&a.mode==='entrySacrifice'),false);
 const fodder=put(solo.s,0,'BLC-1-026','front',0,true);
 assert.equal(legalUniversalActions(solo.packs,solo.s).some(a=>a.type==='activate'&&a.uid===only.uid&&a.mode==='entrySacrifice'),true);
 delete only.entryTurn;
 assert.equal(legalUniversalActions(solo.packs,solo.s).some(a=>a.type==='activate'&&a.mode==='entrySacrifice'),false);
 only.entryTurn=solo.s.turn;
 grantContinuousState(solo.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:fodder.uid,targetUid:only.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(solo.packs,solo.s).some(a=>a.type==='activate'&&a.mode==='entrySacrifice'),false);
 const first=main(deck,29017);
 put(first.s,0,'BLC-1-016','energy',0);
 put(first.s,0,'BLC-1-018','energy',1);
 put(first.s,0,'BLC-1-006','energy',2);
 const victim=put(first.s,0,'BLC-1-026','front',0,true);
 const low=put(first.s,1,'BLC-1-016','front',0,true);
 const mark=put(first.s,1,'BLC-1-018','front',1,true);
 const lille=take(first.s,0,'BLC-4-016');
 first.s.players[0].hand.push(lille);
 assert.equal(universalEnergyByColor(first.packs,first.s,0).yellow,3);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===lille.uid&&a.line==='energy');
 assert.ok(play);
 let played=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(played.pending,null);
 const body=played.players[0].energy.find(c=>c?.uid===lille.uid);
 assert.equal(body.ready,false);
 assert.equal(body.entryTurn,played.turn);
 assert.equal(universalEnergyByColor(first.packs,played,0).yellow,5);
 const act=legalUniversalActions(first.packs,played).find(a=>a.type==='activate'&&a.uid===lille.uid&&a.mode==='entrySacrifice');
 assert.ok(act);
 aiOk(first.packs,played);
 played=dispatchUniversalAction(first.packs,played,act);
 assert.equal(played.pending.kind,'effect-entry-sacrifice');
 assert.equal(V2_PENDING_LABELS[played.pending.kind],'選另 1 個自己的角色退場，成功後此角色額外產生黃色能量並選 1 項');
 const sacrifices=legalUniversalActions(first.packs,played);
 assert.equal(sacrifices.some(a=>a.type==='chooseEntrySacrifice'&&a.uid===victim.uid),true);
 assert.equal(sacrifices.some(a=>a.uid===lille.uid),false);
 assert.equal(sacrifices.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,played,{type:'chooseEntrySacrifice',uid:null}),/not currently legal/);
 const drawState=structuredClone(played);
 const cutState=structuredClone(played);
 const hand=drawState.players[0].hand.length;
 let drawn=dispatchUniversalAction(first.packs,drawState,{type:'chooseEntrySacrifice',uid:victim.uid});
 assert.equal(drawn.pending.kind,'effect-choice-mode');
 assert.equal(drawn.players[0].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(universalEnergyByColor(first.packs,drawn,0).yellow,6);
 drawn=dispatchUniversalAction(first.packs,drawn,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(drawn.pending,null);
 assert.equal(drawn.players[0].hand.length,hand+1);
 grantContinuousState(drawn,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:low.uid,targetUid:lille.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalEnergyByColor(first.packs,drawn,0).yellow,6);
 const quietLife=Object.keys(deck).find(id=>!bleach.cards[id].trigger);
 function march(s,player,phase,own){
  for(let n=0;n<60&&!(s.active===player&&s.phase===phase&&s.players[0].ownTurns===own);n++){
   if(s.pending?.kind==='end-hand-limit'){
    const drop=legalUniversalActions(first.packs,s).find(a=>a.type==='chooseHandLimit');
    s=dispatchUniversalAction(first.packs,s,drop);continue;
   }
   if(s.pending?.kind==='life-trigger'){
    s=dispatchUniversalAction(first.packs,s,{type:'chooseTrigger',mode:'skip'},{actor:s.pending.player});continue;
   }
   const step=legalUniversalActions(first.packs,s).find(a=>a.type==='next');
   assert.ok(step,JSON.stringify(s.pending));
   s=dispatchUniversalAction(first.packs,s,step);
  }
  assert.equal(s.players[0].ownTurns,own);
  assert.equal(s.phase,phase);
  return s;
 }
 let later=structuredClone(drawn);
 later.players[1].life.unshift(take(later,1,quietLife));
 later=march(later,1,'main',1);
 assert.equal(universalEnergyByColor(first.packs,later,0).yellow,6);
 later=march(later,0,'main',2);
 assert.equal(universalEnergyByColor(first.packs,later,0).yellow,5);
 let cut=dispatchUniversalAction(first.packs,cutState,{type:'chooseEntrySacrifice',uid:victim.uid});
 assert.equal(universalEnergyByColor(first.packs,cut,0).yellow,6);
 cut=dispatchUniversalAction(first.packs,cut,{type:'chooseEffectMode',mode:'cut'});
 assert.equal(cut.pending.kind,'effect-target');
 const targets=legalUniversalActions(first.packs,cut);
 assert.equal(targets.some(a=>a.type==='chooseTarget'&&a.uid===mark.uid),true);
 assert.equal(targets.some(a=>a.uid===low.uid),false);
 assert.equal(targets.some(a=>a.type==='chooseTarget'&&a.uid===null),true);
 const skipped=dispatchUniversalAction(first.packs,structuredClone(cut),{type:'chooseTarget',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(first.packs,skipped,live(skipped,1,mark.uid)),1500);
 assert.equal(universalEnergyByColor(first.packs,skipped,0).yellow,6);
 const slot=skipped.players[0].energy.findIndex(c=>c?.uid===lille.uid);
 const moved=skipped.players[0].energy[slot];
 skipped.players[0].energy[slot]=null;
 skipped.players[0].front[2]=moved;
 assert.equal(universalEnergyByColor(first.packs,skipped,0).yellow,3);
 skipped.players[0].front[2]=null;
 skipped.players[0].energy[slot]=moved;
 cut=dispatchUniversalAction(first.packs,cut,{type:'chooseTarget',uid:mark.uid});
 assert.equal(cut.pending,null);
 assert.equal(universalBp(first.packs,cut,live(cut,1,mark.uid)),500);
 assert.equal(universalEnergyByColor(first.packs,cut,0).yellow,6);
 const copy=put(cut,0,'BLC-4-016','front',0,false);
 assert.equal(legalUniversalActions(first.packs,cut).some(a=>a.type==='activate'&&a.uid===copy.uid),false);
 copy.entryTurn=cut.turn;
 assert.equal(legalUniversalActions(first.packs,cut).some(a=>a.type==='activate'&&a.uid===copy.uid&&a.mode==='entrySacrifice'),true);
 assert.equal(legalUniversalActions(first.packs,cut).some(a=>a.type==='activate'&&a.uid===lille.uid),false);
 aiOk(first.packs,cut);
 assert.equal(assertUniversalMatch(first.packs,cut),true);
 assert.equal(assertUniversalMatch(first.packs,later),true);
 assert.equal(assertUniversalMatch(solo.packs,solo.s),true);
});

test('BLC-4-017 draws on entry, then rests and retires to grant one zombie a double attack',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-017');
 assert.equal(printed.number,'EX15BT/BLC-4-017');
 assert.equal(printed.nameJa,'ジゼル・ジュエル');
 assert.equal(printed.effect,'登場時：抽1張牌，再將1張手牌送至場外。啟動・主要〔將此角色改為Rest，並使此卡退場〕：選自己場上1個具有「殭屍」特徵的角色，本回合賦予「2次攻擊」（本回合首次攻擊時將該角色改為Active）。所有《吉賽爾・朱艾兒》的此效果合計每回合僅限1次。');
 assert.equal(printed.trigger,'active');
 assert.equal(printed.gen,3);
 assert.deepEqual(printed.traits,['星十字騎士團','邦比小隊']);
 const card=bleach.cards['BLC-4-017'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團','邦比小隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1,discardCount:1}]);
 assert.deepEqual(card.mainAbility,{op:'nameOnceRestRetireDouble',scope:'name',trait:'殭屍'});
 assert.equal(cardHasTrait(card,'殭屍'),false);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-005'],'殭屍'),true);
 assert.equal(cardHasTrait(bleach.cards['BLC-2-006'],'殭屍'),true);
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-017');
 assert.equal(entry.sourceRecord.gen,2);
 assert.equal(entry.sourceRecord.legacyImportedGen,3);
 assert.equal(entry.definition.gen,2);
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:3,ap:1,bp:2500,gen:2,traits:['星十字騎士團'],trigger:'active',implementation:'dsl',effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:1}]},mainAbility:{op:'nameOnceRestRetireDouble',scope:'name',trait:'護廷十三隊'}};
 assert.throws(()=>createUniversalPack({id:'bad-giselle',cards:[bare]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-4-017','BLC-2-005','BLC-2-006','BLC-1-016','BLC-1-018','BLC-1-006','BLC-1-002'],'yellow');
 const quietLife=Object.keys(deck).find(id=>!bleach.cards[id].trigger);
 const empty=main(deck,29018);
 const lonely=put(empty.s,0,'BLC-4-017','energy',0,true);
 assert.equal(legalUniversalActions(empty.packs,empty.s).some(a=>a.type==='activate'&&a.mode==='nameOnceRestRetire'),false);
 const rested=main(deck,29019);
 const down=put(rested.s,0,'BLC-4-017','energy',0,false);
 put(rested.s,0,'BLC-2-005','front',0,true);
 assert.equal(legalUniversalActions(rested.packs,rested.s).some(a=>a.type==='activate'&&a.uid===down.uid),false);
 const muted=main(deck,29020);
 const hushed=put(muted.s,0,'BLC-4-017','energy',0,true);
 const mutedZombie=put(muted.s,0,'BLC-2-005','front',0,true);
 grantContinuousState(muted.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:mutedZombie.uid,targetUid:hushed.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(muted.packs,muted.s).some(a=>a.type==='activate'&&a.mode==='nameOnceRestRetire'),false);
 const paid=main(deck,29021);
 put(paid.s,0,'BLC-1-016','energy',0);
 put(paid.s,0,'BLC-1-018','energy',1);
 put(paid.s,0,'BLC-1-006','energy',2);
 const giselle=take(paid.s,0,'BLC-4-017');
 const handBefore=paid.s.players[0].hand.length;
 paid.s.players[0].hand.push(giselle);
 const play=legalUniversalActions(paid.packs,paid.s).find(a=>a.type==='play'&&a.uid===giselle.uid&&a.line==='energy');
 assert.ok(play);
 let entered=dispatchUniversalAction(paid.packs,paid.s,play);
 assert.equal(entered.pending.kind,'effect-discard');
 assert.equal(entered.players[0].hand.length,handBefore+1);
 assert.equal(entered.players[0].energy.find(c=>c?.uid===giselle.uid).ready,false);
 const discard=legalUniversalActions(paid.packs,entered).find(a=>a.type==='chooseDiscard');
 assert.ok(discard);
 entered=dispatchUniversalAction(paid.packs,entered,discard);
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].hand.length,handBefore);
 assert.equal(entered.players[0].energy.find(c=>c?.uid===giselle.uid).ready,false);
 assert.equal(legalUniversalActions(paid.packs,entered).some(a=>a.type==='activate'&&a.uid===giselle.uid&&a.mode==='nameOnceRestRetire'),false);
 const first=main(deck,29022);
 const body=put(first.s,0,'BLC-4-017','energy',0,true);
 const zombie=put(first.s,0,'BLC-2-005','front',0,true);
 const other=put(first.s,0,'BLC-1-002','front',1,true);
 const act=legalUniversalActions(first.packs,first.s).find(a=>a.type==='activate'&&a.uid===body.uid&&a.mode==='nameOnceRestRetire');
 assert.ok(act);
 aiOk(first.packs,first.s);
 let used=dispatchUniversalAction(first.packs,first.s,act);
 assert.equal(used.pending.kind,'effect-named-double');
 assert.equal(V2_PENDING_LABELS[used.pending.kind],'選 1 個具有指定特徵的角色，本回合獲得 2 次攻擊');
 const choices=legalUniversalActions(first.packs,used);
 assert.equal(choices.some(a=>a.type==='chooseNamedDouble'&&a.uid===zombie.uid),true);
 assert.equal(choices.some(a=>a.uid===other.uid),false);
 assert.equal(choices.some(a=>a.uid===body.uid),false);
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,used,{type:'chooseNamedDouble',uid:null}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(first.packs,used,{type:'chooseNamedDouble',uid:other.uid}),/not currently legal/);
 aiOk(first.packs,used);
 used=dispatchUniversalAction(first.packs,used,{type:'chooseNamedDouble',uid:zombie.uid});
 assert.equal(used.pending,null);
 assert.equal(used.players[0].outside.some(c=>c.uid===body.uid),true);
 const granted=live(used,0,zombie.uid);
 assert.equal(granted.ready,true);
 assert.deepEqual(Object.keys(granted.readyOnAttackGranted).sort(),['sourceUid','stamp','turn']);
 assert.equal(granted.readyOnAttackGranted.sourceUid,body.uid);
 assert.equal(granted.readyOnAttackGranted.turn,used.turn);
 const copy=put(used,0,'BLC-4-017','front',2,true);
 assert.equal(legalUniversalActions(first.packs,used).some(a=>a.type==='activate'&&a.uid===copy.uid&&a.mode==='nameOnceRestRetire'),false);
 grantContinuousState(used,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:other.uid,targetUid:zombie.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const quiet=take(used,1,quietLife);
 used.players[1].life.unshift(quiet);
 for(let n=0;n<6&&used.phase!=='attack';n++)
  used=dispatchUniversalAction(first.packs,used,{type:'next'});
 assert.equal(used.phase,'attack');
 const lifeBefore=used.players[1].life.length;
 used=dispatchUniversalAction(first.packs,used,{type:'attack',uid:zombie.uid});
 assert.equal(used.pending.kind,'block');
 used=dispatchUniversalAction(first.packs,used,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(used.pending,null);
 assert.equal(used.players[1].life.length,lifeBefore-1);
 assert.equal(used.players[1].outside.some(c=>c.uid===quiet.uid),true);
 const once=live(used,0,zombie.uid);
 assert.equal(once.ready,true);
 assert.equal(used.attacksByUid[zombie.uid],1);
 const againQuiet=take(used,1,quietLife);
 used.players[1].life.unshift(againQuiet);
 const lifeMid=used.players[1].life.length;
 used=dispatchUniversalAction(first.packs,used,{type:'attack',uid:zombie.uid});
 used=dispatchUniversalAction(first.packs,used,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(used.pending,null);
 assert.equal(used.players[1].life.length,lifeMid-1);
 const twice=live(used,0,zombie.uid);
 assert.equal(twice.ready,false);
 assert.equal(used.attacksByUid[zombie.uid],2);
 assert.equal(legalUniversalActions(first.packs,used).some(a=>a.type==='attack'&&a.uid===zombie.uid),false);
 aiOk(first.packs,used);
 assert.equal(assertUniversalMatch(first.packs,used),true);
 assert.equal(assertUniversalMatch(paid.packs,entered),true);
 assert.equal(assertUniversalMatch(empty.packs,empty.s),true);
 assert.equal(assertUniversalMatch(muted.packs,muted.s),true);
 assert.equal(lonely.cardId,'BLC-4-017');
});

test('BLC-1-028 looks at three cards without discarding, then replays that look after a sacrifice',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-028');
 assert.equal(printed.number,'UA08BT/BLC-1-028');
 assert.equal(printed.nameJa,'銀架城');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 3 張，可公開其中最多 1 張具有「星十字騎士團」特徵的卡並加入手牌，其餘以任意順序放至牌堆底。主要階段：REST 此場域，使 1 個己方場上角色退場；成功時發動此場域的登場效果。');
 assert.equal(printed.trigger,'get');
 assert.equal(printed.gen,1);
 assert.equal(printed.traits,'無');
 assert.equal(printed.type,'field');
 const card=bleach.cards['BLC-1-028'];
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.equal(card.type,'field');
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,noHandDiscard:true,filter:{field:'trait',value:'星十字騎士團'}}]);
 assert.deepEqual(card.mainAbility,{op:'fieldRestSacrificeReplay'});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'field',energy:3,ap:1,bp:0,gen:1,traits:[],trigger:'get',implementation:'dsl',effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:5,noHandDiscard:true,filter:{field:'trait',value:'星十字騎士團'}}]},mainAbility:{op:'fieldRestSacrificeReplay'}};
 assert.throws(()=>createUniversalPack({id:'bad-castle',cards:[bare]}),/invalid top-N filtered bottom\/discard profile/);
 const deck=realDeck(['BLC-1-028','BLC-1-002','BLC-4-001','BLC-2-005','BLC-1-016','BLC-1-018','BLC-1-006','BLC-1-026'],'yellow');
 const lone=main(deck,29028);
 const only=put(lone.s,0,'BLC-1-028','energy',0,true);
 assert.equal(legalUniversalActions(lone.packs,lone.s).some(a=>a.type==='activate'&&a.mode==='fieldRestSacrificeReplay'),false);
 const rested=main(deck,29029);
 const down=put(rested.s,0,'BLC-1-028','energy',0,false);
 put(rested.s,0,'BLC-1-016','front',0,true);
 assert.equal(legalUniversalActions(rested.packs,rested.s).some(a=>a.type==='activate'&&a.uid===down.uid),false);
 const muted=main(deck,29030);
 const hushed=put(muted.s,0,'BLC-1-028','energy',0,true);
 const mutedVictim=put(muted.s,0,'BLC-1-016','front',0,true);
 grantContinuousState(muted.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:mutedVictim.uid,targetUid:hushed.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(muted.packs,muted.s).some(a=>a.type==='activate'&&a.mode==='fieldRestSacrificeReplay'),false);
 const first=main(deck,29031);
 put(first.s,0,'BLC-1-016','energy',0);
 put(first.s,0,'BLC-1-018','energy',1);
 put(first.s,0,'BLC-1-006','energy',2);
 const castle=take(first.s,0,'BLC-1-028');
 first.s.players[0].hand.push(castle);
 const tops=setTop(first.s,0,['BLC-1-002','BLC-4-001','BLC-2-005']);
 assert.equal(universalEnergyByColor(first.packs,first.s,0).yellow,3);
 const play=legalUniversalActions(first.packs,first.s).find(a=>a.type==='play'&&a.uid===castle.uid&&a.line==='energy');
 assert.ok(play);
 let opened=dispatchUniversalAction(first.packs,first.s,play);
 assert.equal(opened.pending.kind,'effect-top-filter-choice');
 assert.equal(opened.pending.noHandDiscard,true);
 const looks=legalUniversalActions(first.packs,opened);
 assert.equal(looks.some(a=>a.type==='chooseTopFiltered'&&a.uid===tops[0].uid),true);
 assert.equal(looks.some(a=>a.uid===tops[1].uid),false);
 assert.equal(looks.some(a=>a.uid===tops[2].uid),false);
 assert.equal(looks.some(a=>a.type==='chooseTopFiltered'&&a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(first.packs,opened,{type:'chooseTopFiltered',uid:tops[1].uid}),/not currently legal/);
 aiOk(first.packs,opened);
 const skippedState=structuredClone(opened);
 let skipped=dispatchUniversalAction(first.packs,skippedState,{type:'chooseTopFiltered',uid:null});
 assert.equal(skipped.pending.kind,'effect-top-order');
 assert.equal(skipped.pending.discardAfter,undefined);
 assert.deepEqual(skipped.pending.uids,tops.map(c=>c.uid));
 for(const uid of [...skipped.pending.uids])
  skipped=dispatchUniversalAction(first.packs,skipped,{type:'chooseTopOrder',uid});
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.slice(-3).map(c=>c.uid),tops.map(c=>c.uid));
 assert.equal(skipped.players[0].hand.some(c=>tops.some(t=>t.uid===c.uid)),false);
 assert.equal(skipped.players[0].energy.find(c=>c?.uid===castle.uid).ready,false);
 let taken=dispatchUniversalAction(first.packs,opened,{type:'chooseTopFiltered',uid:tops[0].uid});
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(taken.pending.discardAfter,undefined);
 assert.equal(taken.players[0].hand.some(c=>c.uid===tops[0].uid),true);
 const rest=[...taken.pending.uids];
 for(const uid of rest)
  taken=dispatchUniversalAction(first.packs,taken,{type:'chooseTopOrder',uid});
 assert.equal(taken.pending,null);
 assert.deepEqual(taken.players[0].deck.slice(-2).map(c=>c.uid),rest);
 const body=taken.players[0].energy.find(c=>c?.uid===castle.uid);
 assert.equal(body.ready,false);
 assert.equal(taken.players[0].outside.some(c=>c.uid===castle.uid),false);
 body.ready=true;
 setTop(taken,0,['BLC-1-026','BLC-4-001','BLC-2-005']);
 const act=legalUniversalActions(first.packs,taken).find(a=>a.type==='activate'&&a.uid===castle.uid&&a.mode==='fieldRestSacrificeReplay');
 assert.ok(act);
 let used=dispatchUniversalAction(first.packs,taken,act);
 assert.equal(used.pending.kind,'effect-field-sacrifice-replay');
 assert.equal(V2_PENDING_LABELS[used.pending.kind],'選 1 個自己的角色退場，成功後重播此場域的登場效果');
 assert.equal(live(used,0,castle.uid).ready,false);
 const sacrifices=legalUniversalActions(first.packs,used);
 const victim=used.players[0].energy.find(c=>c?.cardId==='BLC-1-016');
 assert.equal(sacrifices.some(a=>a.type==='chooseFieldSacrifice'&&a.uid===victim.uid),true);
 assert.equal(sacrifices.some(a=>a.uid===castle.uid),false);
 assert.equal(sacrifices.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,used,{type:'chooseFieldSacrifice',uid:null}),/not currently legal/);
 aiOk(first.packs,used);
 used=dispatchUniversalAction(first.packs,used,{type:'chooseFieldSacrifice',uid:victim.uid});
 assert.equal(used.players[0].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(live(used,0,castle.uid).cardId,'BLC-1-028');
 assert.equal(live(used,0,castle.uid).ready,false);
 assert.equal(used.pending.kind,'effect-top-filter-choice');
 assert.equal(used.pending.noHandDiscard,true);
 const replay=legalUniversalActions(first.packs,used);
 const again=used.players[0].deck[0];
 assert.equal(again.cardId,'BLC-1-026');
 assert.equal(replay.some(a=>a.type==='chooseTopFiltered'&&a.uid===again.uid),true);
 assert.equal(replay.some(a=>a.uid===used.players[0].deck[1].uid),false);
 used=dispatchUniversalAction(first.packs,used,{type:'chooseTopFiltered',uid:null});
 for(const uid of [...used.pending.uids])
  used=dispatchUniversalAction(first.packs,used,{type:'chooseTopOrder',uid});
 assert.equal(used.pending,null);
 assert.equal(used.players[0].hand.some(c=>c.uid===again.uid),false);
 live(used,0,castle.uid).ready=true;
 assert.equal(legalUniversalActions(first.packs,used).some(a=>a.type==='activate'&&a.uid===castle.uid&&a.mode==='fieldRestSacrificeReplay'),true);
 const silenced=main(deck,29032);
 const quietField=put(silenced.s,0,'BLC-1-028','energy',0,true);
 const quietVictim=put(silenced.s,0,'BLC-1-016','front',0,true);
 let quiet=dispatchUniversalAction(silenced.packs,silenced.s,legalUniversalActions(silenced.packs,silenced.s).find(a=>a.type==='activate'&&a.uid===quietField.uid));
 grantContinuousState(quiet,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:quietVictim.uid,targetUid:quietField.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 quiet=dispatchUniversalAction(silenced.packs,quiet,{type:'chooseFieldSacrifice',uid:quietVictim.uid});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===quietVictim.uid),true);
 assert.equal(live(quiet,0,quietField.uid).ready,false);
 aiOk(first.packs,used);
 assert.equal(assertUniversalMatch(first.packs,used),true);
 assert.equal(assertUniversalMatch(first.packs,skipped),true);
 assert.equal(assertUniversalMatch(silenced.packs,quiet),true);
 assert.equal(assertUniversalMatch(lone.packs,lone.s),true);
 assert.equal(assertUniversalMatch(muted.packs,muted.s),true);
});

test('BLC-2-002 discards one card, then swaps lines or gains BP, and Yhwach may do both',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-002');
 assert.equal(printed.number,'EX07BT/BLC-2-002');
 assert.equal(printed.nameJa,'石田 雨竜');
 assert.equal(printed.effect,'主要階段・每回合 1 次：將 1 張手牌送至場外，選一項：①各選 1 個己方前線與能源線角色，交換其位置；②此角色本回合 BP +1000。己方場上有〈友哈巴赫〉時，可改為執行兩項。');
 assert.equal(printed.trigger,'draw');
 assert.equal(printed.gen,2);
 assert.equal(printed.traits,'星十字騎士團');
 const card=bleach.cards['BLC-2-002'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'discardGate',optional:false,then:[{op:'swapOrBuff',bp:1000,allName:'ユーハバッハ'}]}]});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:3,ap:1,bp:3000,gen:2,traits:['星十字騎士團'],trigger:'draw',implementation:'dsl',effects:{},mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'discardGate',optional:false,then:[{op:'swapOrBuff',bp:2000,allName:'ユーハバッハ'}]}]}};
 assert.throws(()=>createUniversalPack({id:'bad-uryu',cards:[bare]}),/invalid swap or self BP/);
 const ids=['BLC-2-002','BLC-1-021','BLC-1-016','BLC-1-018','BLC-1-002','BLC-1-081'];
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!ids.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...ids,...rest.slice(0,13-ids.length)];
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const empty=main(deck,29040);
 const lonely=put(empty.s,0,'BLC-2-002','energy',0,true);
 empty.s.players[0].outside.push(...empty.s.players[0].hand.splice(0));
 assert.equal(legalUniversalActions(empty.packs,empty.s).some(a=>a.type==='activate'&&a.uid===lonely.uid),false);
 const muted=main(deck,29041);
 const hushed=put(muted.s,0,'BLC-2-002','energy',0,true);
 const bystander=put(muted.s,0,'BLC-1-016','front',0,true);
 grantContinuousState(muted.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:bystander.uid,targetUid:hushed.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(muted.packs,muted.s).some(a=>a.type==='activate'&&a.uid===hushed.uid),false);
 const locked=main(deck,29042);
 const blocked=put(locked.s,0,'BLC-2-002','energy',0,true);
 put(locked.s,0,'BLC-1-081','front',0,true);
 assert.ok(locked.s.players[0].hand.length);
 const lockedAct=legalUniversalActions(locked.packs,locked.s).find(a=>a.type==='activate'&&a.uid===blocked.uid&&a.mode==='oncePay');
 assert.ok(lockedAct);
 let lockedUsed=dispatchUniversalAction(locked.packs,locked.s,lockedAct);
 assert.equal(lockedUsed.pending.kind,'effect-discard-gate');
 assert.equal(legalUniversalActions(locked.packs,lockedUsed).some(a=>a.uid===null),false);
 const lockedDrop=legalUniversalActions(locked.packs,lockedUsed).find(a=>a.type==='chooseDiscardGate');
 lockedUsed=dispatchUniversalAction(locked.packs,lockedUsed,lockedDrop);
 assert.equal(lockedUsed.pending.kind,'effect-swap-or-buff');
 assert.deepEqual(lockedUsed.pending.options,['bp']);
 const first=main(deck,29043);
 const uryu=put(first.s,0,'BLC-2-002','energy',0,true);
 const front=put(first.s,0,'BLC-1-002','front',0,true);
 const ken=put(first.s,0,'BLC-1-081','front',1,true);
 const act=legalUniversalActions(first.packs,first.s).find(a=>a.type==='activate'&&a.uid===uryu.uid&&a.mode==='oncePay');
 assert.ok(act);
 let used=dispatchUniversalAction(first.packs,first.s,act);
 assert.equal(used.pending.kind,'effect-discard-gate');
 assert.throws(()=>dispatchUniversalAction(first.packs,used,{type:'chooseDiscardGate',uid:null}),/not currently legal/);
 const drop=legalUniversalActions(first.packs,used).find(a=>a.type==='chooseDiscardGate');
 const handBefore=used.players[0].hand.length;
 used=dispatchUniversalAction(first.packs,used,drop);
 assert.equal(used.players[0].hand.length,handBefore-1);
 assert.equal(used.pending.kind,'effect-swap-or-buff');
 assert.equal(V2_PENDING_LABELS[used.pending.kind],'選交換位置、本回合 BP+1000，或在指定角色在場時兩項都做');
 assert.deepEqual(used.pending.options,['swap','bp']);
 const bpOnly=dispatchUniversalAction(first.packs,structuredClone(used),{type:'chooseSwapMode',mode:'bp'});
 assert.equal(bpOnly.pending,null);
 assert.equal(universalBp(first.packs,bpOnly,live(bpOnly,0,uryu.uid)),4000);
 assert.equal(live(bpOnly,0,uryu.uid).cardId==='BLC-2-002'&&bpOnly.players[0].energy.some(c=>c?.uid===uryu.uid),true);
 grantContinuousState(bpOnly,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:front.uid,targetUid:uryu.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalBp(first.packs,bpOnly,live(bpOnly,0,uryu.uid)),4000);
 assert.equal(legalUniversalActions(first.packs,bpOnly).some(a=>a.type==='activate'&&a.uid===uryu.uid),false);
 const copy=put(bpOnly,0,'BLC-2-002','energy',1,true);
 assert.equal(legalUniversalActions(first.packs,bpOnly).some(a=>a.type==='activate'&&a.uid===copy.uid&&a.mode==='oncePay'),true);
 used=dispatchUniversalAction(first.packs,used,{type:'chooseSwapMode',mode:'swap'});
 assert.equal(used.pending.kind,'effect-swap-pair');
 assert.equal(used.pending.step,'front');
 const frontChoices=legalUniversalActions(first.packs,used);
 assert.equal(frontChoices.some(a=>a.type==='chooseSwapPair'&&a.uid===front.uid),true);
 assert.equal(frontChoices.some(a=>a.uid===ken.uid),false);
 assert.equal(frontChoices.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(first.packs,used,{type:'chooseSwapPair',uid:ken.uid}),/not currently legal/);
 used=dispatchUniversalAction(first.packs,used,{type:'chooseSwapPair',uid:front.uid});
 assert.equal(used.pending.step,'energy');
 const energyChoices=legalUniversalActions(first.packs,used);
 assert.equal(energyChoices.some(a=>a.type==='chooseSwapPair'&&a.uid===uryu.uid),true);
 used=dispatchUniversalAction(first.packs,used,{type:'chooseSwapPair',uid:uryu.uid});
 assert.equal(used.pending,null);
 assert.equal(used.players[0].front.find(c=>c?.uid===uryu.uid)!==undefined,true);
 assert.equal(used.players[0].energy.find(c=>c?.uid===front.uid)!==undefined,true);
 assert.equal(universalBp(first.packs,used,live(used,0,uryu.uid)),3000);
 const withKing=main(deck,29044);
 const body=put(withKing.s,0,'BLC-2-002','energy',0,true);
 const king=put(withKing.s,0,'BLC-1-021','front',0,true);
 grantContinuousState(withKing.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:body.uid,targetUid:king.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const kingAct=legalUniversalActions(withKing.packs,withKing.s).find(a=>a.type==='activate'&&a.uid===body.uid);
 let kingUsed=dispatchUniversalAction(withKing.packs,withKing.s,kingAct);
 kingUsed=dispatchUniversalAction(withKing.packs,kingUsed,legalUniversalActions(withKing.packs,kingUsed).find(a=>a.type==='chooseDiscardGate'));
 assert.deepEqual(kingUsed.pending.options,['swap','bp','both']);
 const onlyBp=dispatchUniversalAction(withKing.packs,structuredClone(kingUsed),{type:'chooseSwapMode',mode:'bp'});
 assert.equal(onlyBp.players[0].energy.some(c=>c?.uid===body.uid),true);
 assert.equal(onlyBp.players[0].front.some(c=>c?.uid===king.uid),true);
 assert.equal(universalBp(withKing.packs,onlyBp,live(onlyBp,0,body.uid)),4000);
 aiOk(withKing.packs,kingUsed);
 kingUsed=dispatchUniversalAction(withKing.packs,kingUsed,{type:'chooseSwapMode',mode:'both'});
 kingUsed=dispatchUniversalAction(withKing.packs,kingUsed,{type:'chooseSwapPair',uid:king.uid});
 kingUsed=dispatchUniversalAction(withKing.packs,kingUsed,{type:'chooseSwapPair',uid:body.uid});
 assert.equal(kingUsed.pending,null);
 assert.equal(kingUsed.players[0].front.some(c=>c?.uid===body.uid),true);
 assert.equal(kingUsed.players[0].energy.some(c=>c?.uid===king.uid),true);
 assert.equal(universalBp(withKing.packs,kingUsed,live(kingUsed,0,body.uid)),4000);
 aiOk(first.packs,used);
 assert.equal(assertUniversalMatch(first.packs,used),true);
 assert.equal(assertUniversalMatch(first.packs,bpOnly),true);
 assert.equal(assertUniversalMatch(withKing.packs,kingUsed),true);
 assert.equal(assertUniversalMatch(withKing.packs,onlyBp),true);
 assert.equal(assertUniversalMatch(locked.packs,lockedUsed),true);
 assert.equal(assertUniversalMatch(empty.packs,empty.s),true);
 assert.equal(assertUniversalMatch(muted.packs,muted.s),true);
});

test('BLC-4-032 gains BP from Ichigo or Urahara and may swap from the energy line after an attack',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-032');
 assert.equal(printed.number,'EX15BT/BLC-4-032');
 assert.equal(printed.nameJa,'四楓院 夜一');
 assert.equal(printed.effect,'自己的回合中：若自己場上有《黑崎一護》或《浦原喜助》，此角色BP+1000。〔能量線／每回合1次〕自己的角色攻擊結束時，選自己前線1個本回合尚未攻擊的角色，可將其與此角色交換位置；戰鬥後或傷害的Trigger檢查結束後處理此效果。');
 assert.equal(printed.trigger,'color');
 assert.equal(printed.gen,3);
 assert.deepEqual(printed.traits,[]);
 const card=bleach.cards['BLC-4-032'];
 assert.equal(card.gen,2);
 assert.equal(card.energyLineAttackEndSwap,true);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(card.passiveBonuses,[{condition:{logic:'any',turn:'own',checks:[
  {kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'黒崎 一護'},
  {kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'浦原 喜助'}]},bp:1000}]);
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-032');
 assert.equal(entry.definition.gen,2);
 assert.equal(entry.sourceRecord.gen,2);
 assert.equal(entry.sourceRecord.legacyImportedGen,3);
 const bare={id:'BAD',name:'BAD',color:'blue',type:'character',energy:3,ap:1,bp:3000,gen:2,traits:[],trigger:'color',implementation:'dsl',effects:{},energyLineAttackEndSwap:false,triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500}};
 assert.throws(()=>createUniversalPack({id:'bad-yoruichi',cards:[bare]}),/invalid energy-line attack-end swap/);
 const ids=['BLC-4-032','BLC-4-025','BLC-2-015','BLC-1-081','BLC-2-031','BLC-2-029','BLC-4-023'];
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!ids.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...ids,...rest.slice(0,13-ids.length)];
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const board=main(deck,29050);
 const self=put(board.s,0,'BLC-4-032','front',0);
 assert.equal(universalBp(board.packs,board.s,self),3000);
 const ichigo=put(board.s,0,'BLC-4-025','energy',0);
 assert.equal(universalBp(board.packs,board.s,self),4000);
 const away=structuredClone(board.s);
 let opp=away;
 for(let n=0;n<16&&opp.active===0;n++){
  if(opp.pending?.kind==='end-hand-limit'){
   const drop=legalUniversalActions(board.packs,opp).find(a=>a.type==='chooseHandLimit');
   opp=dispatchUniversalAction(board.packs,opp,drop);
  }else opp=dispatchUniversalAction(board.packs,opp,{type:'next'});
 }
 assert.equal(opp.active,1);
 assert.equal(universalBp(board.packs,opp,live(opp,0,self.uid)),3000);
 const gone=structuredClone(board.s);
 const goneIchigo=gone.players[0].energy[0];
 gone.players[0].energy[0]=null;gone.players[0].hand.push(goneIchigo);
 assert.equal(universalBp(board.packs,gone,live(gone,0,self.uid)),3000);
 put(gone,0,'BLC-2-015','front',1);
 assert.equal(universalBp(board.packs,gone,live(gone,0,self.uid)),4000);
 grantContinuousState(board.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:self.uid,targetUid:ichigo.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalBp(board.packs,board.s,self),4000);
 grantContinuousState(board.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:ichigo.uid,targetUid:self.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalBp(board.packs,board.s,self),3000);
 const fronted=main(deck,29051);
 const standing=put(fronted.s,0,'BLC-4-032','front',0,false);
 const striker=put(fronted.s,0,'BLC-2-031','front',1,true);
 put(fronted.s,0,'BLC-2-029','front',2,true);
 const quietLife=take(fronted.s,1,'BLC-4-025');
 fronted.s.players[1].life.unshift(quietLife);
 let frontAttack=fronted.s;
 for(let n=0;n<6&&frontAttack.phase!=='attack';n++)
  frontAttack=dispatchUniversalAction(fronted.packs,frontAttack,{type:'next'});
 frontAttack=dispatchUniversalAction(fronted.packs,frontAttack,{type:'attack',uid:striker.uid});
 assert.equal(frontAttack.pending.kind,'block');
 frontAttack=dispatchUniversalAction(fronted.packs,frontAttack,{type:'chooseBlock',uid:null});
 assert.equal(frontAttack.pending,null);
 assert.equal(live(frontAttack,0,standing.uid).energyLineAttackEndSwapUsedTurn,undefined);
 const missed=main(deck,29052);
 const waiting=put(missed.s,0,'BLC-4-032','energy',0,true);
 const firstStriker=put(missed.s,0,'BLC-2-031','front',0,true);
 put(missed.s,0,'BLC-1-081','front',1,true);
 const nullLife=take(missed.s,1,'BLC-4-025');
 missed.s.players[1].life.unshift(nullLife);
 let missedAttack=missed.s;
 for(let n=0;n<6&&missedAttack.phase!=='attack';n++)
  missedAttack=dispatchUniversalAction(missed.packs,missedAttack,{type:'next'});
 missedAttack=dispatchUniversalAction(missed.packs,missedAttack,{type:'attack',uid:firstStriker.uid});
 missedAttack=dispatchUniversalAction(missed.packs,missedAttack,{type:'chooseBlock',uid:null});
 assert.equal(missedAttack.pending,null);
 assert.equal(live(missedAttack,0,waiting.uid).energyLineAttackEndSwapUsedTurn,undefined);
 const laterAlly=put(missedAttack,0,'BLC-2-029','front',2,true);
 live(missedAttack,0,firstStriker.uid).ready=true;
 const secondNull=take(missedAttack,1,'BLC-4-025');
 missedAttack.players[1].life.unshift(secondNull);
 missedAttack=dispatchUniversalAction(missed.packs,missedAttack,{type:'attack',uid:firstStriker.uid});
 missedAttack=dispatchUniversalAction(missed.packs,missedAttack,{type:'chooseBlock',uid:null});
 assert.equal(missedAttack.pending.kind,'energy-line-attack-end-swap');
 assert.equal(legalUniversalActions(missed.packs,missedAttack).some(a=>a.uid===laterAlly.uid),true);
 assert.equal(legalUniversalActions(missed.packs,missedAttack).some(a=>a.uid===firstStriker.uid),false);
 const hushed=main(deck,29053);
 const quiet=put(hushed.s,0,'BLC-4-032','energy',0,true);
 const quietStriker=put(hushed.s,0,'BLC-2-031','front',0,true);
 const quietAlly=put(hushed.s,0,'BLC-2-029','front',1,true);
 grantContinuousState(hushed.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:quietAlly.uid,targetUid:quiet.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 hushed.s.players[1].life.unshift(take(hushed.s,1,'BLC-4-025'));
 let quietAttack=hushed.s;
 for(let n=0;n<6&&quietAttack.phase!=='attack';n++)
  quietAttack=dispatchUniversalAction(hushed.packs,quietAttack,{type:'next'});
 quietAttack=dispatchUniversalAction(hushed.packs,quietAttack,{type:'attack',uid:quietStriker.uid});
 quietAttack=dispatchUniversalAction(hushed.packs,quietAttack,{type:'chooseBlock',uid:null});
 assert.equal(quietAttack.pending,null);
 const first=main(deck,29054);
 const yoruichi=put(first.s,0,'BLC-4-032','energy',0,true);
 const attacker=put(first.s,0,'BLC-2-031','front',0,true);
 const ally=put(first.s,0,'BLC-2-029','front',1,true);
 const ken=put(first.s,0,'BLC-1-081','front',2,true);
 const drawn=take(first.s,1,'BLC-2-015');
 first.s.players[1].life.unshift(drawn);
 let fought=first.s;
 for(let n=0;n<6&&fought.phase!=='attack';n++)
  fought=dispatchUniversalAction(first.packs,fought,{type:'next'});
 fought=dispatchUniversalAction(first.packs,fought,{type:'attack',uid:attacker.uid});
 assert.equal(fought.pending.kind,'block');
 fought=dispatchUniversalAction(first.packs,fought,{type:'chooseBlock',uid:null});
 assert.equal(fought.pending.kind,'life-trigger');
 assert.equal(fought.pending.trigger,'draw');
 assert.equal(fought.pending.player,1);
 fought=dispatchUniversalAction(first.packs,fought,{type:'chooseTrigger',mode:'skip'});
 assert.equal(fought.pending.kind,'energy-line-attack-end-swap');
 assert.equal(fought.pending.player,0);
 assert.equal(fought.pending.sourceUid,yoruichi.uid);
 assert.equal(V2_PENDING_LABELS[fought.pending.kind],'可選 1 個本回合尚未攻擊的前線角色，與此角色交換位置');
 const choices=legalUniversalActions(first.packs,fought);
 assert.equal(choices.some(a=>a.type==='chooseEnergyLineAttackEndSwap'&&a.uid===ally.uid),true);
 assert.equal(choices.some(a=>a.uid===attacker.uid),false);
 assert.equal(choices.some(a=>a.uid===ken.uid),false);
 assert.equal(choices.some(a=>a.uid===yoruichi.uid),false);
 assert.equal(choices.some(a=>a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(first.packs,fought,{type:'chooseEnergyLineAttackEndSwap',uid:attacker.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(first.packs,fought,{type:'chooseEnergyLineAttackEndSwap',uid:ken.uid}),/not currently legal/);
 aiOk(first.packs,fought);
 const declined=dispatchUniversalAction(first.packs,structuredClone(fought),{type:'chooseEnergyLineAttackEndSwap',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].energy.some(c=>c?.uid===yoruichi.uid),true);
 assert.equal(declined.players[0].front.some(c=>c?.uid===ally.uid),true);
 assert.equal(live(declined,0,yoruichi.uid).energyLineAttackEndSwapUsedTurn,declined.turn);
 live(declined,0,attacker.uid).ready=true;
 const copy=put(declined,0,'BLC-4-032','energy',1,true);
 const other=put(declined,0,'BLC-4-032','energy',2,true);
 const wall=put(declined,1,'BLC-4-023','front',0,true);
 let blocked=dispatchUniversalAction(first.packs,declined,{type:'attack',uid:attacker.uid});
 assert.equal(blocked.pending.kind,'block');
 blocked=dispatchUniversalAction(first.packs,blocked,{type:'chooseBlock',uid:wall.uid});
 assert.equal(blocked.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(blocked.pending.kind,'phase-order');
 assert.equal(blocked.pending.entries.length,2);
 aiOk(first.packs,blocked);
 const firstKey=blocked.pending.entries[0].key;
 blocked=dispatchUniversalAction(first.packs,blocked,{type:'choosePhaseOrder',key:firstKey});
 assert.equal(blocked.pending.kind,'energy-line-attack-end-swap');
 assert.equal(blocked.pending.sourceUid,firstKey);
 assert.equal(legalUniversalActions(first.packs,blocked).some(a=>a.uid===yoruichi.uid),false);
 blocked=dispatchUniversalAction(first.packs,blocked,{type:'chooseEnergyLineAttackEndSwap',uid:null});
 assert.equal(blocked.pending.kind,'energy-line-attack-end-swap');
 assert.equal(blocked.pending.sourceUid===copy.uid||blocked.pending.sourceUid===other.uid,true);
 assert.notEqual(blocked.pending.sourceUid,firstKey);
 blocked=dispatchUniversalAction(first.packs,blocked,{type:'chooseEnergyLineAttackEndSwap',uid:null});
 assert.equal(blocked.pending,null);
 let swapped=dispatchUniversalAction(first.packs,fought,{type:'chooseEnergyLineAttackEndSwap',uid:ally.uid});
 assert.equal(swapped.pending,null);
 assert.equal(swapped.players[0].front.some(c=>c?.uid===yoruichi.uid),true);
 assert.equal(swapped.players[0].energy.some(c=>c?.uid===ally.uid),true);
 assert.equal(universalBp(first.packs,swapped,live(swapped,0,yoruichi.uid)),3000);
 assert.equal(live(swapped,0,yoruichi.uid).energyLineAttackEndSwapUsedTurn,swapped.turn);
 aiOk(first.packs,swapped);
 assert.equal(assertUniversalMatch(first.packs,swapped),true);
 assert.equal(assertUniversalMatch(first.packs,declined),true);
 assert.equal(assertUniversalMatch(first.packs,blocked),true);
 assert.equal(assertUniversalMatch(board.packs,board.s),true);
 assert.equal(assertUniversalMatch(board.packs,opp),true);
 assert.equal(assertUniversalMatch(board.packs,gone),true);
 assert.equal(assertUniversalMatch(fronted.packs,frontAttack),true);
 assert.equal(assertUniversalMatch(missed.packs,missedAttack),true);
 assert.equal(assertUniversalMatch(hushed.packs,quietAttack),true);
});

test('BLC-1-011 discards one hand card for Damage 2 and a battle-win draw',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-011');
 assert.equal(printed.number,'UA08BT/BLC-1-011');
 assert.equal(printed.nameJa,'バズビー');
 assert.equal(printed.effect,'主要階段：將 1 張手牌送至場外，使此角色本回合獲得 Damage 2，以及「攻擊並贏得戰鬥時，抽 1 張」。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,5);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-1-011'];
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.mainAbility,{op:'repeatDiscardBattleKit'});
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-bazz-kit',cards:[{...bare,mainAbility:{op:'repeatDiscardBattleKit',oncePerTurn:true}}]}),/unsupported main action ability/);
 const deck=realDeck(['BLC-1-011','BLC-1-001','BLC-1-016','BLC-1-018','BLC-1-006','BLC-2-002'],'yellow');
 function finishLife(packs,s){
  for(let n=0;n<8&&s.pending&&['life-batch-order','life-trigger'].includes(s.pending.kind);n++){
   const actor={actor:s.pending.player};
   if(s.pending.kind==='life-batch-order'){
    const order=legalUniversalActions(packs,s).find(a=>a.type==='chooseLifeOrder');
    s=dispatchUniversalAction(packs,s,order,actor);
   }else{
    const skip=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='skip')
     ||legalUniversalActions(packs,s)[0];
    s=dispatchUniversalAction(packs,s,skip,actor);
   }
  }
  return s;
 }
 const empty=main(deck,29111);
 const quiet=put(empty.s,0,'BLC-1-011','front',0,true);
 empty.s.players[0].deck.push(...empty.s.players[0].hand);
 empty.s.players[0].hand=[];
 assert.equal(legalUniversalActions(empty.packs,empty.s).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 empty.s.players[0].hand.push(empty.s.players[0].deck.pop());
 const opened=dispatchUniversalAction(empty.packs,empty.s,{type:'activate',uid:quiet.uid,mode:'repeatDiscardBattle'});
 assert.equal(opened.pending.kind,'effect-discard-gate');
 assert.equal(opened.pending.optional,false);
 assert.equal(legalUniversalActions(empty.packs,opened).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(empty.packs,opened,{type:'chooseDiscardGate',uid:null}),/Action not currently legal/);
 aiOk(empty.packs,opened);
 const payment=opened.players[0].hand[0];
 const paid=dispatchUniversalAction(empty.packs,opened,{type:'chooseDiscardGate',uid:payment.uid});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].outside.some(c=>c.uid===payment.uid),true);
 const bazz=live(paid,0,quiet.uid);
 assert.equal(universalAttackDamage(empty.packs,paid,bazz),2);
 assert.equal(bazz.attackWinDrawGranted.turn,paid.turn);
 assert.equal(paid.mainAbilityUsedUids.includes(bazz.uid),false);
 paid.players[0].hand.push(paid.players[0].deck.pop());
 const again=dispatchUniversalAction(empty.packs,paid,{type:'activate',uid:bazz.uid,mode:'repeatDiscardBattle'});
 assert.equal(again.pending.kind,'effect-discard-gate');
 const lined=main(deck,29112);
 const energyCopy=put(lined.s,0,'BLC-1-011','energy',0,true);
 assert.equal(legalUniversalActions(lined.packs,lined.s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid&&a.mode==='repeatDiscardBattle'),true);
 const hushed=main(deck,29113);
 const silenced=put(hushed.s,0,'BLC-1-011','front',0,true);
 grantContinuousState(hushed.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silenced.uid,
  targetUid:silenced.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(hushed.packs,hushed.s).some(a=>a.uid===silenced.uid&&a.type==='activate'),false);
 const direct=main(deck,29114);
 const striker=put(direct.s,0,'BLC-1-011','front',0,true);
 for(let n=0;n<2;n++)direct.s.players[1].life.unshift(take(direct.s,1,'BLC-1-001'));
 const cost=direct.s.players[0].hand[0];
 let armed=dispatchUniversalAction(direct.packs,direct.s,{type:'activate',uid:striker.uid,mode:'repeatDiscardBattle'});
 armed=dispatchUniversalAction(direct.packs,armed,{type:'chooseDiscardGate',uid:cost.uid});
 const handBefore=armed.players[0].hand.length;
 const lifeBefore=armed.players[1].life.length;
 let struck=armed;
 for(let n=0;n<6&&struck.phase!=='attack';n++)
  struck=dispatchUniversalAction(direct.packs,struck,{type:'next'});
 struck=dispatchUniversalAction(direct.packs,struck,{type:'attack',uid:striker.uid});
 struck=dispatchUniversalAction(direct.packs,struck,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(struck.players[1].life.length,lifeBefore-2);
 assert.equal(struck.players[0].hand.length,handBefore);
 assert.equal(struck.pending.kind,'life-batch-order');
 struck=finishLife(direct.packs,struck);
 assert.equal(struck.pending,null);
 const battle=main(deck,29115);
 const winner=put(battle.s,0,'BLC-1-011','front',0,true);
 const fee=battle.s.players[0].hand[0];
 let ready=dispatchUniversalAction(battle.packs,battle.s,{type:'activate',uid:winner.uid,mode:'repeatDiscardBattle'});
 ready=dispatchUniversalAction(battle.packs,ready,{type:'chooseDiscardGate',uid:fee.uid});
 const wall=put(ready,1,'BLC-1-016','front',0,true);
 const beforeWin=ready.players[0].hand.length;
 const lifeWin=ready.players[1].life.length;
 let won=ready;
 for(let n=0;n<6&&won.phase!=='attack';n++)
  won=dispatchUniversalAction(battle.packs,won,{type:'next'});
 won=dispatchUniversalAction(battle.packs,won,{type:'attack',uid:winner.uid});
 won=dispatchUniversalAction(battle.packs,won,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(won.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(won.players[0].hand.length,beforeWin+1);
 assert.equal(won.players[1].life.length,lifeWin);
 assert.equal(won.pending,null);
 const lost=main(deck,29116);
 const loser=put(lost.s,0,'BLC-1-011','front',0,true);
 const toll=lost.s.players[0].hand[0];
 let tall=dispatchUniversalAction(lost.packs,lost.s,{type:'activate',uid:loser.uid,mode:'repeatDiscardBattle'});
 tall=dispatchUniversalAction(lost.packs,tall,{type:'chooseDiscardGate',uid:toll.uid});
 const tower=put(tall,1,'BLC-1-016','front',0,true);
 tower.buffs.push({bp:5000,untilTurn:tall.turn});
 const beforeLoss=tall.players[0].hand.length;
 let beaten=tall;
 for(let n=0;n<6&&beaten.phase!=='attack';n++)
  beaten=dispatchUniversalAction(lost.packs,beaten,{type:'next'});
 beaten=dispatchUniversalAction(lost.packs,beaten,{type:'attack',uid:loser.uid});
 beaten=dispatchUniversalAction(lost.packs,beaten,{type:'chooseBlock',uid:tower.uid},{actor:1});
 assert.equal(beaten.players[0].outside.some(c=>c.uid===loser.uid),true);
 assert.equal(beaten.players[0].hand.length,beforeLoss);
 assert.equal(assertUniversalMatch(empty.packs,paid),true);
 assert.equal(assertUniversalMatch(direct.packs,struck),true);
 assert.equal(assertUniversalMatch(battle.packs,won),true);
 assert.equal(assertUniversalMatch(lost.packs,beaten),true);
});

test('BLC-1-104 removes four outside cards for a draw and Impact 1',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-104');
 assert.equal(printed.number,'UA08ST/BLC-1-104');
 assert.equal(printed.nameJa,'黒崎 一護');
 assert.equal(printed.effect,'Raid 一護：轉為 ACTIVE，可移到前線。每回合 1 次：場外 4 張除外，成功時抽 1 張並獲得 Impact 1。');
 assert.equal(printed.traits,undefined);
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 const card=bleach.cards['BLC-1-104'];
 assert.equal(card.name,'黒崎 一護');
 assert.equal(card.gen,1);
 assert.equal(card.raidName,'黒崎 一護');
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'removeOutsideThen',count:4,optional:false,cardType:'any',zone:'outside',controller:'own',then:[{op:'draw',count:1},{op:'grantSelfImpactThisTurn',amount:1}]}]});
 const bare={id:'BAD',name:'BAD',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-ichigo-four',cards:[{...bare,raidName:'黒崎 一護',mainAbility:{op:'oncePayProgram'}}]}),/unsupported main action ability/);
 assert.throws(()=>createUniversalPack({id:'bad-ichigo-count',cards:[{...bare,raidName:'黒崎 一護',mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'removeOutsideThen',count:5,optional:false,cardType:'any',zone:'outside',controller:'own',then:[{op:'draw',count:1}]}]}}]}),/invalid outside removal payment/);
 const deck=realDeck(['BLC-1-104','BLC-2-051','BLC-1-035','BLC-1-039','BLC-1-041','BLC-1-103','BLC-1-108','BLC-2-050'],'purple');
 function fuel(s){
  for(const [i,id] of ['BLC-1-041','BLC-1-103','BLC-1-108','BLC-2-050'].entries())
   put(s,0,id,'energy',i);
 }
 const empty=main(deck,29121);
 fuel(empty.s);
 const quiet=put(empty.s,0,'BLC-1-104','front',0,true);
 const lined=put(empty.s,0,'BLC-1-104','front',1,true);
 const unused=dispatchUniversalAction(empty.packs,empty.s,{type:'activate',uid:quiet.uid,mode:'oncePay'});
 assert.equal(unused.pending,null);
 assert.equal(unused.mainAbilityUsedUids.includes(quiet.uid),true);
 assert.equal(universalImpact(empty.packs,unused,live(unused,0,quiet.uid)),0);
 assert.equal(legalUniversalActions(empty.packs,unused).some(a=>a.type==='activate'&&a.uid===quiet.uid),false);
 assert.equal(legalUniversalActions(empty.packs,unused).some(a=>a.type==='activate'&&a.uid===lined.uid&&a.mode==='oncePay'),true);
 const energyBoard=main(deck,29126);
 for(const [i,id] of ['BLC-1-041','BLC-1-103','BLC-1-108'].entries())
  put(energyBoard.s,0,id,'energy',i);
 const energyCopy=put(energyBoard.s,0,'BLC-1-104','energy',3,true);
 assert.equal(legalUniversalActions(energyBoard.packs,energyBoard.s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid&&a.mode==='oncePay'),true);
 const short=main(deck,29122);
 fuel(short.s);
 const self=put(short.s,0,'BLC-1-104','front',0,true);
 const other=put(short.s,0,'BLC-1-104','front',1,true);
 const three=[];
 for(let n=0;n<3;n++)three.push(take(short.s,0,'BLC-1-035'));
 short.s.players[0].outside.push(...three);
 const handShort=short.s.players[0].hand.length;
 const deckShort=short.s.players[0].deck.length;
 const opened=dispatchUniversalAction(short.packs,short.s,{type:'activate',uid:self.uid,mode:'oncePay'});
 assert.equal(opened.pending.kind,'effect-remove-outside');
 assert.equal(opened.pending.optional,false);
 assert.equal(opened.pending.short,true);
 assert.equal(opened.pending.count,4);
 assert.deepEqual(legalUniversalActions(short.packs,opened).map(a=>a.mode),['all']);
 assert.throws(()=>dispatchUniversalAction(short.packs,opened,{type:'chooseRemoveOutside',mode:'skip'}),/Action not currently legal/);
 aiOk(short.packs,opened);
 const cleared=dispatchUniversalAction(short.packs,opened,{type:'chooseRemoveOutside',mode:'all'});
 assert.equal(cleared.pending,null);
 for(const cardPaid of three){
  assert.equal(cleared.players[0].removed.some(c=>c.uid===cardPaid.uid),true);
  assert.equal(cleared.players[0].outside.some(c=>c.uid===cardPaid.uid),false);
 }
 assert.equal(cleared.players[0].hand.length,handShort);
 assert.equal(cleared.players[0].deck.length,deckShort);
 assert.equal(universalImpact(short.packs,cleared,live(cleared,0,self.uid)),0);
 assert.equal(cleared.mainAbilityUsedUids.includes(self.uid),true);
 assert.equal(legalUniversalActions(short.packs,cleared).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 assert.equal(legalUniversalActions(short.packs,cleared).some(a=>a.type==='activate'&&a.uid===other.uid&&a.mode==='oncePay'),true);
 const full=main(deck,29123);
 fuel(full.s);
 const ichigo=put(full.s,0,'BLC-1-104','front',0,true);
 const four=[];
 for(let n=0;n<4;n++)four.push(take(full.s,0,'BLC-1-039'));
 full.s.players[0].outside.push(...four);
 const handFull=full.s.players[0].hand.length;
 const deckFull=full.s.players[0].deck.length;
 let paying=dispatchUniversalAction(full.packs,full.s,{type:'activate',uid:ichigo.uid,mode:'oncePay'});
 assert.equal(paying.pending.short,false);
 assert.equal(legalUniversalActions(full.packs,paying).some(a=>a.mode==='skip'),false);
 aiOk(full.packs,paying);
 for(const cardPaid of four){
  assert.equal(paying.pending.kind,'effect-remove-outside');
  paying=dispatchUniversalAction(full.packs,paying,{type:'chooseRemoveOutside',mode:'pick',uid:cardPaid.uid});
 }
 assert.equal(paying.pending,null);
 for(const cardPaid of four)assert.equal(paying.players[0].removed.some(c=>c.uid===cardPaid.uid),true);
 assert.equal(paying.players[0].hand.length,handFull+1);
 assert.equal(paying.players[0].deck.length,deckFull-1);
 const earned=live(paying,0,ichigo.uid);
 assert.equal(universalImpact(full.packs,paying,earned),1);
 assert.equal(earned.impactGranted.turn,paying.turn);
 assert.equal(earned.impactGranted.amount,1);
 grantContinuousState(paying,{kind:'originalEffectsDisabled',controller:1,sourceUid:ichigo.uid,
  targetUid:ichigo.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalImpact(full.packs,paying,live(paying,0,ichigo.uid)),1);
 const hushed=main(deck,29124);
 fuel(hushed.s);
 const silenced=put(hushed.s,0,'BLC-1-104','front',0,true);
 grantContinuousState(hushed.s,{kind:'originalEffectsDisabled',controller:1,sourceUid:silenced.uid,
  targetUid:silenced.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(hushed.packs,hushed.s).some(a=>a.type==='activate'&&a.uid===silenced.uid),false);
 const raid=main(deck,29125);
 fuel(raid.s);
 const host=put(raid.s,0,'BLC-2-051','front',0,true);
 const plain=put(raid.s,0,'BLC-1-035','front',1,true);
 const rider=take(raid.s,0,'BLC-1-104');
 raid.s.players[0].hand.push(rider);
 assert.ok(universalEnergyByColor(raid.packs,raid.s,0).purple>=4);
 const raids=()=>legalUniversalActions(raid.packs,raid.s).filter(a=>a.type==='raid'&&a.uid===rider.uid);
 assert.equal(raids().some(a=>a.baseUid===host.uid&&a.slot===0),true);
 assert.equal(raids().some(a=>a.baseUid===plain.uid),false);
 aiOk(raid.packs,raid.s);
 const stacked=dispatchUniversalAction(raid.packs,raid.s,{type:'raid',uid:rider.uid,baseUid:host.uid,slot:0});
 assert.equal(stacked.pending,null);
 const top=stacked.players[0].front[0];
 assert.equal(top.cardId,'BLC-1-104');
 assert.equal(top.ready,true);
 assert.equal(top.stack.length,1);
 assert.equal(top.stack[0].cardId,'BLC-2-051');
 assert.equal(top.stack[0].uid,host.uid);
 assert.equal(stacked.players[0].front[1].uid,plain.uid);
 assert.equal(assertUniversalMatch(empty.packs,unused),true);
 assert.equal(assertUniversalMatch(short.packs,cleared),true);
 assert.equal(assertUniversalMatch(full.packs,paying),true);
 assert.equal(assertUniversalMatch(hushed.packs,hushed.s),true);
 assert.equal(assertUniversalMatch(raid.packs,stacked),true);
});

test('BLC-1-014 retires one opposing front REST character only on its own turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-014');
 assert.equal(printed.number,'UA08BT/BLC-1-014');
 assert.equal(printed.nameJa,'バンビエッタ・バスターバイン');
 assert.equal(printed.effect,'Raid〈邦比愛塔・芭絲塔拜茵〉：轉為 ACTIVE，可移至前線。登場：若現在是己方回合，可使最多 1 個敵方前線的 REST 角色退場。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 const card=bleach.cards['BLC-1-014'];
 assert.equal(card.name,'バンビエッタ・バスターバイン');
 assert.equal(card.gen,1);
 assert.equal(card.raidName,'バンビエッタ・バスターバイン');
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects.onPlay,[{op:'retireOppFrontRest',optional:true,ownTurnOnly:true}]);
 assert.equal(bleach.cards['BLC-1-012'].raidName??null,null);
 assert.equal(bleach.cards['BLC-1-012'].name,'バンビエッタ・バスターバイン');
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-bambi-rest',cards:[{...bare,raidName:'バンビエッタ・バスターバイン',effects:{onPlay:[{op:'retireOppFrontRest',optional:false,ownTurnOnly:true}]}}]}),/invalid rested front retirement/);
 const deck=realDeck(['BLC-1-014','BLC-1-012','BLC-1-001','BLC-1-002','BLC-1-016','BLC-1-018'],'yellow');
 function fuel(s){
  for(const [i,id] of ['BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-018'].entries())
   put(s,0,id,'energy',i);
 }
 const board=main(deck,29131);
 fuel(board.s);
 const rested=put(board.s,1,'BLC-1-016','front',0,false);
 const awake=put(board.s,1,'BLC-1-018','front',1,true);
 const parked=put(board.s,1,'BLC-1-001','energy',0,false);
 const bambi=take(board.s,0,'BLC-1-014');
 board.s.players[0].hand.push(bambi);
 assert.ok(universalEnergyByColor(board.packs,board.s,0).yellow>=4);
 const played=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:bambi.uid,line:'front',slot:0});
 assert.equal(live(played,0,bambi.uid).ready,false);
 assert.equal(played.pending.kind,'effect-retire-bp');
 assert.equal(played.pending.optional,true);
 assert.equal(played.pending.onlyRest,true);
 const choices=legalUniversalActions(board.packs,played);
 assert.equal(choices.some(a=>a.type==='chooseRetireBp'&&a.uid===null),true);
 assert.equal(choices.some(a=>a.uid===rested.uid),true);
 assert.equal(choices.some(a=>a.uid===awake.uid),false);
 assert.equal(choices.some(a=>a.uid===parked.uid),false);
 aiOk(board.packs,played);
 const skipped=dispatchUniversalAction(board.packs,played,{type:'chooseRetireBp',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,1,rested.uid).cardId,'BLC-1-016');
 const again=main(deck,29132);
 fuel(again.s);
 const victim=put(again.s,1,'BLC-1-016','front',0,false);
 put(again.s,1,'BLC-1-018','front',1,true);
 const rider=take(again.s,0,'BLC-1-014');
 again.s.players[0].hand.push(rider);
 let retiring=dispatchUniversalAction(again.packs,again.s,{type:'play',uid:rider.uid,line:'front',slot:0});
 retiring=dispatchUniversalAction(again.packs,retiring,{type:'chooseRetireBp',uid:victim.uid});
 assert.equal(retiring.pending,null);
 assert.equal(retiring.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(retiring.players[1].front.some(c=>c?.uid===victim.uid),false);
 const quiet=main(deck,29133);
 fuel(quiet.s);
 put(quiet.s,1,'BLC-1-016','front',0,true);
 const lone=take(quiet.s,0,'BLC-1-014');
 quiet.s.players[0].hand.push(lone);
 const none=dispatchUniversalAction(quiet.packs,quiet.s,{type:'play',uid:lone.uid,line:'front',slot:0});
 assert.equal(none.pending,null);
 assert.equal(live(none,0,lone.uid).ready,false);
 const hostBoard=main(deck,29134);
 for(const [i,id] of ['BLC-1-001','BLC-1-002','BLC-1-016','BLC-1-018'].entries())
  put(hostBoard.s,0,id,'energy',i);
 const host=put(hostBoard.s,0,'BLC-1-012','front',0,true);
 const raider=take(hostBoard.s,0,'BLC-1-014');
 hostBoard.s.players[0].hand.push(raider);
 const raids=legalUniversalActions(hostBoard.packs,hostBoard.s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===host.uid&&a.slot===0),true);
 const stacked=dispatchUniversalAction(hostBoard.packs,hostBoard.s,{type:'raid',uid:raider.uid,baseUid:host.uid,slot:0});
 assert.equal(stacked.players[0].front[0].cardId,'BLC-1-014');
 assert.equal(stacked.players[0].front[0].ready,true);
 assert.equal(stacked.players[0].front[0].stack[0].uid,host.uid);
 assert.equal(stacked.pending,null);
 const packs=[bleach,bleach];
 let life=newUniversalMatch(packs,{decks:[deck,deck],seed:29135,first:1});
 for(let n=0;n<8&&life.phase!=='attack';n++)life=dispatchUniversalAction(packs,life,{type:'next'});
 for(const [i,id] of ['BLC-1-001','BLC-1-002','BLC-1-016','BLC-1-018'].entries())
  put(life,0,id,'energy',i);
 const lifeHost=put(life,0,'BLC-1-012','front',0,true);
 const attacker=put(life,1,'BLC-1-016','front',0,true);
 const revealed=life.players[0].life[0];
 const trigger=take(life,0,'BLC-1-014');
 life.players[0].life[0]=trigger;
 life.players[0].deck.push(revealed);
 life=dispatchUniversalAction(packs,life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(packs,life,{type:'chooseBlock',uid:null},{actor:0});
 const lifeRaid=legalUniversalActions(packs,life).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===lifeHost.uid);
 assert.ok(lifeRaid);
 life=dispatchUniversalAction(packs,life,lifeRaid,{actor:0});
 assert.notEqual(life.pending?.kind,'effect-retire-bp');
 assert.equal(life.players[0].front.some(c=>c?.cardId==='BLC-1-014'&&c.stack?.[0]?.uid===lifeHost.uid),true);
 assert.equal(life.players[1].front.some(c=>c?.uid===attacker.uid),true);
 for(let n=0;n<8&&life.pending;n++){
  assert.notEqual(life.pending.kind,'effect-retire-bp');
  const actor={actor:life.pending.player};
  const action=legalUniversalActions(packs,life).find(a=>a.type==='chooseLifeOrder')||
   legalUniversalActions(packs,life).find(a=>a.type==='chooseTrigger'&&a.mode==='skip')||
   legalUniversalActions(packs,life)[0];
  life=dispatchUniversalAction(packs,life,action,actor);
 }
 assert.equal(life.pending,null);
 assert.equal(assertUniversalMatch(board.packs,skipped),true);
 assert.equal(assertUniversalMatch(again.packs,retiring),true);
 assert.equal(assertUniversalMatch(quiet.packs,none),true);
 assert.equal(assertUniversalMatch(hostBoard.packs,stacked),true);
 assert.equal(assertUniversalMatch(packs,life),true);
});

test('BLC-1-020 draws at attack end only after an opposing trigger activates',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-020');
 assert.equal(printed.number,'UA08BT/BLC-1-020');
 assert.equal(printed.nameJa,'ユーグラム・ハッシュヴァルト');
 assert.equal(printed.effect,'Raid〈雨葛蘭・哈斯沃德〉：轉為 ACTIVE，可移至前線。Impact 1。位於前線時，己方攻擊階段結束時，若敵方本回合曾發動 Trigger，抽 2 張，再將 1 張手牌送至場外。登場：己方手牌少於敵方時，敵方將其 1 張手牌送至場外。');
 assert.equal(printed.traits,'星十字騎士團');
 assert.equal(printed.energy,5);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 const card=bleach.cards['BLC-1-020'];
 assert.equal(card.name,'ユーグラム・ハッシュヴァルト');
 assert.equal(card.gen,1);
 assert.equal(card.printedImpact,1);
 assert.equal(card.raidName,'ユーグラム・ハッシュヴァルト');
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.effects.onPlay,[{op:'discardOppHandIfFewer',count:1}]);
 assert.deepEqual(card.phaseEffects,[{phase:'attack',edge:'end',turn:'own',then:[
  {op:'frontOppTriggerDrawDiscard',count:2,discardCount:1}]}]);
 assert.equal(bleach.cards['BLC-1-018'].raidName??null,null);
 assert.equal(bleach.cards['BLC-1-018'].name,'ユーグラム・ハッシュヴァルト');
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-jugram-fewer',cards:[{...bare,effects:{onPlay:[{op:'discardOppHandIfFewer',count:2}]}}]}),/invalid fewer-hand opponent discard/);
 assert.throws(()=>createUniversalPack({id:'bad-jugram-window',cards:[{...bare,phaseEffects:[{phase:'main',edge:'end',turn:'own',then:[{op:'frontOppTriggerDrawDiscard',count:2,discardCount:1}]}]}]}),/invalid front trigger draw window/);
 assert.throws(()=>createUniversalPack({id:'bad-jugram-play',cards:[{...bare,effects:{onPlay:[{op:'frontOppTriggerDrawDiscard',count:2,discardCount:1}]}}]}),/front trigger draw is only an attack-end effect/);
 assert.throws(()=>createUniversalPack({id:'bad-jugram-phase-discard',cards:[{...bare,phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[{op:'discardOppHandIfFewer',count:1}]}]}]}),/fewer-hand opponent discard is only an onPlay effect/);
 const deck=realDeck(['BLC-1-020','BLC-1-018','BLC-1-001','BLC-1-002','BLC-1-012','BLC-1-016','BLC-1-021','BLC-1-032','BLC-1-031','BLC-2-002','BLC-1-006'],'yellow');
 function sizeHand(s,p,n,keepUid=null){
  const pl=s.players[p];
  while(pl.hand.length>n){
   const i=pl.hand.findIndex(c=>c.uid!==keepUid);
   assert.ok(i>=0);
   pl.outside.push(pl.hand.splice(i,1)[0]);
  }
  while(pl.hand.length<n)pl.hand.push(pl.deck.pop());
 }
 function fuel(s){
  for(const [i,id] of ['BLC-2-002','BLC-1-001','BLC-1-002','BLC-1-012'].entries())
   put(s,0,id,'energy',i);
 }
 function playCase(seed,oppHand){
  const board=main(deck,seed);
  fuel(board.s);
  const held=take(board.s,0,'BLC-1-020');
  board.s.players[0].hand.push(held);
  sizeHand(board.s,0,7,held.uid);
  sizeHand(board.s,1,oppHand);
  assert.ok(universalEnergyByColor(board.packs,board.s,0).yellow>=5);
  const played=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:held.uid,line:'front',slot:0});
  return {board,held,played};
 }
 function setLifeTop(s,p,id){
  const top=take(s,p,id);
  const displaced=s.players[p].life[0];
  s.players[p].life[0]=top;
  if(displaced)s.players[p].deck.push(displaced);
  return top;
 }
 function connect(packs,s,attacker){
  let n=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(n.phase,'attack');
  assert.equal(n.pending,null);
  n=dispatchUniversalAction(packs,n,{type:'attack',uid:attacker.uid});
  n=dispatchUniversalAction(packs,n,{type:'chooseBlock',uid:null},{actor:1});
  return n;
 }
 function discardOne(packs,s,player){
  assert.equal(s.pending.kind,'effect-discard');
  assert.equal(s.pending.player,player);
  const uid=s.players[player].hand[0].uid;
  return dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid},{actor:player});
 }
 const fewer=playCase(29141,7);
 assert.equal(live(fewer.played,0,fewer.held.uid).ready,false);
 assert.equal(universalImpact(fewer.board.packs,fewer.played,live(fewer.played,0,fewer.held.uid)),1);
 assert.equal(fewer.played.pending.kind,'effect-discard');
 assert.equal(fewer.played.pending.player,1);
 const fewerChoices=legalUniversalActions(fewer.board.packs,fewer.played);
 assert.equal(fewerChoices.some(a=>a.uid==null),false);
 assert.equal(fewerChoices.length,fewer.played.players[1].hand.length);
 aiOk(fewer.board.packs,fewer.played);
 const fewerDone=discardOne(fewer.board.packs,fewer.played,1);
 assert.equal(fewerDone.pending,null);
 assert.equal(fewerDone.players[0].hand.length,6);
 assert.equal(fewerDone.players[1].hand.length,6);
 const even=playCase(29142,6);
 assert.equal(even.played.pending,null);
 assert.equal(even.played.players[0].hand.length,6);
 assert.equal(even.played.players[1].hand.length,6);
 const ahead=playCase(29143,5);
 assert.equal(ahead.played.pending,null);
 assert.equal(ahead.played.players[0].hand.length,6);
 assert.equal(ahead.played.players[1].hand.length,5);
 const quiet=playCase(29144,7);
 let quietMatch=discardOne(quiet.board.packs,quiet.played,1);
 setLifeTop(quietMatch,1,'BLC-1-001');
 const quietAttacker=put(quietMatch,0,'BLC-1-016','front',1,true);
 quietMatch=connect(quiet.board.packs,quietMatch,quietAttacker);
 assert.equal(quietMatch.pending,null);
 assert.deepEqual(quietMatch.triggerActivated,[false,false]);
 const quietHand=quietMatch.players[0].hand.length;
 const quietDeck=quietMatch.players[0].deck.length;
 quietMatch=dispatchUniversalAction(quiet.board.packs,quietMatch,{type:'next'});
 assert.notEqual(quietMatch.pending?.kind,'effect-discard');
 assert.equal(quietMatch.players[0].hand.length,quietHand);
 assert.equal(quietMatch.players[0].deck.length,quietDeck);
 const drawn=playCase(29145,7);
 let drawnMatch=discardOne(drawn.board.packs,drawn.played,1);
 setLifeTop(drawnMatch,1,'BLC-1-032');
 const drawnAttacker=put(drawnMatch,0,'BLC-1-016','front',1,true);
 drawnMatch=connect(drawn.board.packs,drawnMatch,drawnAttacker);
 assert.equal(drawnMatch.pending.kind,'life-trigger');
 assert.equal(drawnMatch.pending.player,1);
 assert.equal(drawnMatch.triggerActivated[1],false);
 const drawAction=legalUniversalActions(drawn.board.packs,drawnMatch).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.ok(drawAction);
 drawnMatch=dispatchUniversalAction(drawn.board.packs,drawnMatch,drawAction,{actor:1});
 assert.equal(drawnMatch.triggerActivated[1],true);
 assert.equal(drawnMatch.triggerActivated[0],false);
 const drawnHand=drawnMatch.players[0].hand.length;
 const drawnDeck=drawnMatch.players[0].deck.length;
 drawnMatch=dispatchUniversalAction(drawn.board.packs,drawnMatch,{type:'next'});
 assert.equal(drawnMatch.pending.kind,'effect-discard');
 assert.equal(drawnMatch.pending.player,0);
 assert.equal(drawnMatch.players[0].hand.length,drawnHand+2);
 assert.equal(drawnMatch.players[0].deck.length,drawnDeck-2);
 aiOk(drawn.board.packs,drawnMatch);
 drawnMatch=discardOne(drawn.board.packs,drawnMatch,0);
 assert.equal(drawnMatch.players[0].hand.length,drawnHand+1);
 assert.equal(drawnMatch.pending,null);
 const skipped=playCase(29146,7);
 let skippedMatch=discardOne(skipped.board.packs,skipped.played,1);
 setLifeTop(skippedMatch,1,'BLC-1-032');
 const skippedAttacker=put(skippedMatch,0,'BLC-1-016','front',1,true);
 skippedMatch=connect(skipped.board.packs,skippedMatch,skippedAttacker);
 const skipAction=legalUniversalActions(skipped.board.packs,skippedMatch).find(a=>a.type==='chooseTrigger'&&a.mode==='skip');
 skippedMatch=dispatchUniversalAction(skipped.board.packs,skippedMatch,skipAction,{actor:1});
 assert.equal(skippedMatch.triggerActivated[1],false);
 const skippedHand=skippedMatch.players[0].hand.length;
 const skippedDeck=skippedMatch.players[0].deck.length;
 skippedMatch=dispatchUniversalAction(skipped.board.packs,skippedMatch,{type:'next'});
 assert.notEqual(skippedMatch.pending?.kind,'effect-discard');
 assert.equal(skippedMatch.players[0].hand.length,skippedHand);
 assert.equal(skippedMatch.players[0].deck.length,skippedDeck);
 const doubled=playCase(29147,7);
 let doubledMatch=discardOne(doubled.board.packs,doubled.played,1);
 const second=put(doubledMatch,0,'BLC-1-020','front',2,true);
 setLifeTop(doubledMatch,1,'BLC-1-032');
 const doubledAttacker=put(doubledMatch,0,'BLC-1-016','front',1,true);
 doubledMatch=connect(doubled.board.packs,doubledMatch,doubledAttacker);
 const bothDraw=legalUniversalActions(doubled.board.packs,doubledMatch).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 doubledMatch=dispatchUniversalAction(doubled.board.packs,doubledMatch,bothDraw,{actor:1});
 const bothHand=doubledMatch.players[0].hand.length;
 const bothDeck=doubledMatch.players[0].deck.length;
 doubledMatch=dispatchUniversalAction(doubled.board.packs,doubledMatch,{type:'next'});
 assert.equal(doubledMatch.pending.kind,'phase-order');
 assert.equal(doubledMatch.pending.entries.length,2);
 assert.equal(doubledMatch.pending.entries.some(e=>e.sourceUid===doubled.held.uid),true);
 assert.equal(doubledMatch.pending.entries.some(e=>e.sourceUid===second.uid),true);
 doubledMatch=dispatchUniversalAction(doubled.board.packs,doubledMatch,{type:'choosePhaseOrder',key:doubledMatch.pending.entries[0].key});
 assert.equal(doubledMatch.players[0].hand.length,bothHand+2);
 doubledMatch=discardOne(doubled.board.packs,doubledMatch,0);
 assert.equal(doubledMatch.pending.kind,'effect-discard');
 assert.equal(doubledMatch.players[0].hand.length,bothHand+3);
 doubledMatch=discardOne(doubled.board.packs,doubledMatch,0);
 assert.equal(doubledMatch.players[0].hand.length,bothHand+2);
 assert.equal(doubledMatch.players[0].deck.length,bothDeck-4);
 assert.equal(doubledMatch.pending,null);
 const retired=playCase(29148,7);
 let retiredMatch=discardOne(retired.board.packs,retired.played,1);
 setLifeTop(retiredMatch,1,'BLC-1-031');
 const retiredAttacker=put(retiredMatch,0,'BLC-1-016','front',1,true);
 retiredMatch=connect(retired.board.packs,retiredMatch,retiredAttacker);
 const special=legalUniversalActions(retired.board.packs,retiredMatch).find(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===retired.held.uid);
 assert.ok(special);
 retiredMatch=dispatchUniversalAction(retired.board.packs,retiredMatch,special,{actor:1});
 assert.equal(retiredMatch.triggerActivated[1],true);
 assert.equal(retiredMatch.players[0].front.some(c=>c?.uid===retired.held.uid),false);
 assert.equal(retiredMatch.players[0].outside.some(c=>c.uid===retired.held.uid),true);
 const retiredHand=retiredMatch.players[0].hand.length;
 const retiredDeck=retiredMatch.players[0].deck.length;
 retiredMatch=dispatchUniversalAction(retired.board.packs,retiredMatch,{type:'next'});
 assert.notEqual(retiredMatch.pending?.kind,'effect-discard');
 assert.equal(retiredMatch.players[0].hand.length,retiredHand);
 assert.equal(retiredMatch.players[0].deck.length,retiredDeck);
 const lined=main(deck,29149);
 const linedCopy=put(lined.s,0,'BLC-1-020','energy',0,true);
 const linedAttacker=put(lined.s,0,'BLC-1-016','front',0,true);
 setLifeTop(lined.s,1,'BLC-1-032');
 let linedMatch=connect(lined.packs,lined.s,linedAttacker);
 const linedDraw=legalUniversalActions(lined.packs,linedMatch).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 linedMatch=dispatchUniversalAction(lined.packs,linedMatch,linedDraw,{actor:1});
 assert.equal(linedMatch.triggerActivated[1],true);
 assert.equal(locationLine(linedMatch,linedCopy.uid),'energy');
 const linedHand=linedMatch.players[0].hand.length;
 const linedDeck=linedMatch.players[0].deck.length;
 linedMatch=dispatchUniversalAction(lined.packs,linedMatch,{type:'next'});
 assert.notEqual(linedMatch.pending?.kind,'effect-discard');
 assert.equal(linedMatch.players[0].hand.length,linedHand);
 assert.equal(linedMatch.players[0].deck.length,linedDeck);
 const hushed=playCase(29150,7);
 let hushedMatch=discardOne(hushed.board.packs,hushed.played,1);
 setLifeTop(hushedMatch,1,'BLC-1-032');
 const hushedAttacker=put(hushedMatch,0,'BLC-1-016','front',1,true);
 hushedMatch=connect(hushed.board.packs,hushedMatch,hushedAttacker);
 const hushedDraw=legalUniversalActions(hushed.board.packs,hushedMatch).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 hushedMatch=dispatchUniversalAction(hushed.board.packs,hushedMatch,hushedDraw,{actor:1});
 grantContinuousState(hushedMatch,{kind:'originalEffectsDisabled',controller:1,sourceUid:hushed.held.uid,
  targetUid:hushed.held.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(hushedMatch.players[0].front.some(c=>c?.uid===hushed.held.uid),true);
 const hushedHand=hushedMatch.players[0].hand.length;
 const hushedDeck=hushedMatch.players[0].deck.length;
 hushedMatch=dispatchUniversalAction(hushed.board.packs,hushedMatch,{type:'next'});
 assert.notEqual(hushedMatch.pending?.kind,'effect-discard');
 assert.equal(hushedMatch.players[0].hand.length,hushedHand);
 assert.equal(hushedMatch.players[0].deck.length,hushedDeck);
 const hostBoard=main(deck,29151);
 fuel(hostBoard.s);
 const host=put(hostBoard.s,0,'BLC-1-018','front',0,true);
 const raider=take(hostBoard.s,0,'BLC-1-020');
 hostBoard.s.players[0].hand.push(raider);
 sizeHand(hostBoard.s,0,7,raider.uid);
 sizeHand(hostBoard.s,1,7);
 const raids=legalUniversalActions(hostBoard.packs,hostBoard.s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===host.uid&&a.slot===0),true);
 const stacked=dispatchUniversalAction(hostBoard.packs,hostBoard.s,{type:'raid',uid:raider.uid,baseUid:host.uid,slot:0});
 assert.equal(stacked.players[0].front[0].cardId,'BLC-1-020');
 assert.equal(stacked.players[0].front[0].ready,true);
 assert.equal(stacked.players[0].front[0].stack[0].uid,host.uid);
 assert.equal(universalImpact(hostBoard.packs,stacked,stacked.players[0].front[0]),1);
 assert.equal(stacked.pending.kind,'effect-discard');
 assert.equal(stacked.pending.player,1);
 const raided=discardOne(hostBoard.packs,stacked,1);
 assert.equal(raided.pending,null);
 assert.equal(assertUniversalMatch(fewer.board.packs,fewerDone),true);
 assert.equal(assertUniversalMatch(even.board.packs,even.played),true);
 assert.equal(assertUniversalMatch(ahead.board.packs,ahead.played),true);
 assert.equal(assertUniversalMatch(quiet.board.packs,quietMatch),true);
 assert.equal(assertUniversalMatch(drawn.board.packs,drawnMatch),true);
 assert.equal(assertUniversalMatch(skipped.board.packs,skippedMatch),true);
 assert.equal(assertUniversalMatch(doubled.board.packs,doubledMatch),true);
 assert.equal(assertUniversalMatch(retired.board.packs,retiredMatch),true);
 assert.equal(assertUniversalMatch(lined.packs,linedMatch),true);
 assert.equal(assertUniversalMatch(hushed.board.packs,hushedMatch),true);
 assert.equal(assertUniversalMatch(hostBoard.packs,raided),true);
});

test('BLC-1-050 removes outside cards for a front cut and Impact 1',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-050');
 assert.equal(printed.number,'UA08BT/BLC-1-050');
 assert.equal(printed.nameJa,'朽木 白哉');
 assert.equal(printed.effect,'Raid〈朽木白哉〉：轉為 ACTIVE，可移至前線。登場：可將己方場外 2 張卡除外；成功時所有敵方前線角色本回合 BP −1000。主要階段・每回合 1 次：將己方場外 3 張卡除外；成功時此角色本回合獲得 Impact 1。攻擊時：可將己方場外 1 張卡除外；成功時可使最多 1 個敵方前線角色本回合 BP −1000。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.energy,5);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 const card=bleach.cards['BLC-1-050'];
 assert.equal(card.name,'朽木 白哉');
 assert.equal(card.gen,1);
 assert.equal(card.raidName,'朽木 白哉');
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'removeOutsideThen',count:2,optional:true,cardType:'any',zone:'outside',controller:'own',then:[{op:'enemyFrontAllBpDown',bp:1000}]}]);
 assert.deepEqual(card.effects.onAttack,[{op:'removeOutsideThen',count:1,optional:true,cardType:'any',zone:'outside',controller:'own',then:[{op:'enemyBpDown',bp:1000,optional:true}]}]);
 assert.equal(card.mainAbility.op,'oncePayProgram');
 assert.equal(card.mainAbility.oncePerTurn,true);
 assert.deepEqual(card.mainAbility.then,[{op:'removeOutsideThen',count:3,optional:false,cardType:'any',zone:'outside',controller:'own',then:[{op:'grantSelfImpactThisTurn',amount:1}]}]);
 assert.equal(bleach.cards['BLC-1-048'].raidName??null,null);
 assert.equal(bleach.cards['BLC-1-048'].name,'朽木 白哉');
 const deck=realDeck(['BLC-1-050','BLC-1-048','BLC-1-035','BLC-1-039','BLC-4-046','BLC-2-050','BLC-1-041','BLC-1-103','BLC-1-108'],'purple');
 function fuel(s){
  for(const [i,id] of ['BLC-1-035','BLC-2-050','BLC-1-108','BLC-1-041'].entries())
   put(s,0,id,'energy',i);
 }
 function outs(s,n,id='BLC-1-103'){
  const ids=[];
  for(let i=0;i<n;i++){
   const c=take(s,0,id);
   s.players[0].outside.push(c);
   ids.push(c.uid);
  }
  return ids;
 }
 function ready(seed){
  const board=main(deck,seed);
  fuel(board.s);
  const held=take(board.s,0,'BLC-1-050');
  board.s.players[0].hand.push(held);
  assert.ok(universalEnergyByColor(board.packs,board.s,0).purple>=5);
  return {board,held};
 }
 function enter(board,held){
  return dispatchUniversalAction(board.packs,board.s,{type:'play',uid:held.uid,line:'front',slot:0});
 }
 const cut=ready(29161);
 const tall=put(cut.board.s,1,'BLC-1-039','front',0,true);
 const small=put(cut.board.s,1,'BLC-4-046','front',1,true);
 const parked=put(cut.board.s,1,'BLC-1-048','energy',0,true);
 const pair=outs(cut.board.s,2);
 let cutting=enter(cut.board,cut.held);
 assert.equal(cutting.pending.kind,'effect-remove-outside');
 assert.equal(cutting.pending.count,2);
 assert.equal(cutting.pending.optional,true);
 assert.equal(cutting.pending.short,false);
 aiOk(cut.board.packs,cutting);
 for(const uid of pair)
  cutting=dispatchUniversalAction(cut.board.packs,cutting,{type:'chooseRemoveOutside',mode:'pick',uid});
 assert.equal(cutting.pending,null);
 assert.equal(universalBp(cut.board.packs,cutting,live(cutting,1,tall.uid)),500);
 assert.equal(cutting.players[1].front.some(c=>c?.uid===small.uid),false);
 assert.equal(cutting.players[1].outside.some(c=>c.uid===small.uid),true);
 assert.equal(universalBp(cut.board.packs,cutting,live(cutting,1,parked.uid)),1500);
 assert.equal(pair.every(uid=>cutting.players[0].removed.some(c=>c.uid===uid)),true);
 const declined=ready(29162);
 put(declined.board.s,1,'BLC-1-039','front',0,true);
 const kept=outs(declined.board.s,2);
 const passed=dispatchUniversalAction(declined.board.packs,enter(declined.board,declined.held),{type:'chooseRemoveOutside',mode:'skip'});
 assert.equal(passed.pending,null);
 assert.equal(universalBp(declined.board.packs,passed,passed.players[1].front[0]),1500);
 assert.equal(kept.every(uid=>passed.players[0].outside.some(c=>c.uid===uid)),true);
 const short=ready(29163);
 const untouched=put(short.board.s,1,'BLC-1-039','front',0,true);
 const lone=outs(short.board.s,1);
 const opened=enter(short.board,short.held);
 assert.equal(opened.pending.short,true);
 const cleared=dispatchUniversalAction(short.board.packs,opened,{type:'chooseRemoveOutside',mode:'all'});
 assert.equal(cleared.pending,null);
 assert.equal(universalBp(short.board.packs,cleared,live(cleared,1,untouched.uid)),1500);
 assert.equal(cleared.players[0].removed.some(c=>c.uid===lone[0]),true);
 const paid=ready(29164);
 const three=outs(paid.board.s,3);
 const paidSkip=dispatchUniversalAction(paid.board.packs,enter(paid.board,paid.held),{type:'chooseRemoveOutside',mode:'skip'});
 let maining=dispatchUniversalAction(paid.board.packs,paidSkip,{type:'activate',uid:paid.held.uid,mode:'oncePay'});
 assert.equal(maining.pending.kind,'effect-remove-outside');
 assert.equal(maining.pending.count,3);
 assert.equal(maining.pending.optional,false);
 assert.equal(legalUniversalActions(paid.board.packs,maining).some(a=>a.mode==='skip'),false);
 for(const uid of three)
  maining=dispatchUniversalAction(paid.board.packs,maining,{type:'chooseRemoveOutside',mode:'pick',uid});
 assert.equal(maining.pending,null);
 assert.equal(universalImpact(paid.board.packs,maining,live(maining,0,paid.held.uid)),1);
 assert.throws(()=>dispatchUniversalAction(paid.board.packs,maining,{type:'activate',uid:paid.held.uid,mode:'oncePay'}),/not currently legal/);
 grantContinuousState(maining,{kind:'originalEffectsDisabled',controller:1,sourceUid:paid.held.uid,
  targetUid:paid.held.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalImpact(paid.board.packs,maining,live(maining,0,paid.held.uid)),1);
 const other=put(maining,0,'BLC-1-050','front',1,true);
 outs(maining,3,'BLC-1-039');
 const again=dispatchUniversalAction(paid.board.packs,maining,{type:'activate',uid:other.uid,mode:'oncePay'});
 assert.equal(again.pending.kind,'effect-remove-outside');
 assert.equal(again.pending.sourceUid,other.uid);
 const partial=ready(29165);
 const two=outs(partial.board.s,2);
 const partialSkip=dispatchUniversalAction(partial.board.packs,enter(partial.board,partial.held),{type:'chooseRemoveOutside',mode:'skip'});
 let halving=dispatchUniversalAction(partial.board.packs,partialSkip,{type:'activate',uid:partial.held.uid,mode:'oncePay'});
 assert.equal(halving.pending.short,true);
 assert.equal(legalUniversalActions(partial.board.packs,halving).some(a=>a.mode==='skip'),false);
 halving=dispatchUniversalAction(partial.board.packs,halving,{type:'chooseRemoveOutside',mode:'all'});
 assert.equal(halving.pending,null);
 assert.equal(universalImpact(partial.board.packs,halving,live(halving,0,partial.held.uid)),0);
 assert.equal(two.every(uid=>halving.players[0].removed.some(c=>c.uid===uid)),true);
 assert.throws(()=>dispatchUniversalAction(partial.board.packs,halving,{type:'activate',uid:partial.held.uid,mode:'oncePay'}),/not currently legal/);
 const empty=ready(29166);
 const emptyPlay=enter(empty.board,empty.held);
 assert.equal(emptyPlay.pending,null);
 const stamped=dispatchUniversalAction(empty.board.packs,emptyPlay,{type:'activate',uid:empty.held.uid,mode:'oncePay'});
 assert.equal(stamped.pending,null);
 assert.equal(universalImpact(empty.board.packs,stamped,live(stamped,0,empty.held.uid)),0);
 assert.throws(()=>dispatchUniversalAction(empty.board.packs,stamped,{type:'activate',uid:empty.held.uid,mode:'oncePay'}),/not currently legal/);
 const hostBoard=main(deck,29167);
 fuel(hostBoard.s);
 const host=put(hostBoard.s,0,'BLC-1-048','front',0,true);
 const left=put(hostBoard.s,1,'BLC-1-039','front',0,true);
 const right=put(hostBoard.s,1,'BLC-1-039','front',1,true);
 const aside=put(hostBoard.s,1,'BLC-4-046','energy',0,true);
 const payment=take(hostBoard.s,0,'BLC-1-103');
 hostBoard.s.players[0].outside.push(payment);
 const raider=take(hostBoard.s,0,'BLC-1-050');
 hostBoard.s.players[0].hand.push(raider);
 let raid=dispatchUniversalAction(hostBoard.packs,hostBoard.s,{type:'raid',uid:raider.uid,baseUid:host.uid,slot:0});
 assert.equal(raid.players[0].front[0].ready,true);
 assert.equal(raid.players[0].front[0].stack[0].uid,host.uid);
 assert.equal(raid.pending.kind,'effect-remove-outside');
 assert.equal(raid.pending.short,true);
 raid=dispatchUniversalAction(hostBoard.packs,raid,{type:'chooseRemoveOutside',mode:'skip'});
 assert.equal(raid.players[0].outside.some(c=>c.uid===payment.uid),true);
 raid=dispatchUniversalAction(hostBoard.packs,raid,{type:'next'});
 assert.equal(raid.phase,'attack');
 raid=dispatchUniversalAction(hostBoard.packs,raid,{type:'attack',uid:raider.uid});
 assert.equal(raid.pending.kind,'effect-remove-outside');
 assert.equal(raid.pending.count,1);
 assert.equal(raid.pending.optional,true);
 assert.equal(raid.pending.short,false);
 raid=dispatchUniversalAction(hostBoard.packs,raid,{type:'chooseRemoveOutside',mode:'pick',uid:payment.uid});
 assert.equal(raid.pending.kind,'effect-target');
 assert.equal(raid.pending.optional,true);
 assert.equal(raid.pending.bp,1000);
 const targets=legalUniversalActions(hostBoard.packs,raid);
 assert.equal(targets.some(a=>a.uid===null),true);
 assert.equal(targets.some(a=>a.uid===left.uid),true);
 assert.equal(targets.some(a=>a.uid===right.uid),true);
 assert.equal(targets.some(a=>a.uid===aside.uid),false);
 aiOk(hostBoard.packs,raid);
 raid=dispatchUniversalAction(hostBoard.packs,raid,{type:'chooseTarget',uid:left.uid});
 assert.equal(universalBp(hostBoard.packs,raid,live(raid,1,left.uid)),500);
 assert.equal(universalBp(hostBoard.packs,raid,live(raid,1,right.uid)),1500);
 assert.equal(universalBp(hostBoard.packs,raid,live(raid,1,aside.uid)),1000);
 assert.equal(raid.players[0].removed.some(c=>c.uid===payment.uid),true);
 const quiet=main(deck,29168);
 fuel(quiet.s);
 const quietHost=put(quiet.s,0,'BLC-1-048','front',0,true);
 const quietWall=put(quiet.s,1,'BLC-1-039','front',0,true);
 const quietPay=take(quiet.s,0,'BLC-1-103');
 quiet.s.players[0].outside.push(quietPay);
 const quietRaider=take(quiet.s,0,'BLC-1-050');
 quiet.s.players[0].hand.push(quietRaider);
 let quietRaid=dispatchUniversalAction(quiet.packs,quiet.s,{type:'raid',uid:quietRaider.uid,baseUid:quietHost.uid,slot:0});
 quietRaid=dispatchUniversalAction(quiet.packs,quietRaid,{type:'chooseRemoveOutside',mode:'skip'});
 quietRaid=dispatchUniversalAction(quiet.packs,quietRaid,{type:'next'});
 quietRaid=dispatchUniversalAction(quiet.packs,quietRaid,{type:'attack',uid:quietRaider.uid});
 quietRaid=dispatchUniversalAction(quiet.packs,quietRaid,{type:'chooseRemoveOutside',mode:'skip'});
 assert.notEqual(quietRaid.pending?.kind,'effect-target');
 assert.equal(universalBp(quiet.packs,quietRaid,live(quietRaid,1,quietWall.uid)),1500);
 assert.equal(quietRaid.players[0].outside.some(c=>c.uid===quietPay.uid),true);
 const hushed=main(deck,29169);
 fuel(hushed.s);
 const hushedHost=put(hushed.s,0,'BLC-1-048','front',0,true);
 put(hushed.s,1,'BLC-1-039','front',0,true);
 const hushedPay=take(hushed.s,0,'BLC-1-103');
 hushed.s.players[0].outside.push(hushedPay);
 const hushedRaider=take(hushed.s,0,'BLC-1-050');
 hushed.s.players[0].hand.push(hushedRaider);
 let hushedRaid=dispatchUniversalAction(hushed.packs,hushed.s,{type:'raid',uid:hushedRaider.uid,baseUid:hushedHost.uid,slot:0});
 hushedRaid=dispatchUniversalAction(hushed.packs,hushedRaid,{type:'chooseRemoveOutside',mode:'skip'});
 grantContinuousState(hushedRaid,{kind:'originalEffectsDisabled',controller:1,sourceUid:hushedRaider.uid,
  targetUid:hushedRaider.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 hushedRaid=dispatchUniversalAction(hushed.packs,hushedRaid,{type:'next'});
 hushedRaid=dispatchUniversalAction(hushed.packs,hushedRaid,{type:'attack',uid:hushedRaider.uid});
 assert.notEqual(hushedRaid.pending?.kind,'effect-remove-outside');
 assert.equal(hushedRaid.players[0].outside.some(c=>c.uid===hushedPay.uid),true);
 assert.equal(assertUniversalMatch(cut.board.packs,cutting),true);
 assert.equal(assertUniversalMatch(declined.board.packs,passed),true);
 assert.equal(assertUniversalMatch(short.board.packs,cleared),true);
 assert.equal(assertUniversalMatch(paid.board.packs,again),true);
 assert.equal(assertUniversalMatch(partial.board.packs,halving),true);
 assert.equal(assertUniversalMatch(empty.board.packs,stamped),true);
 assert.equal(assertUniversalMatch(hostBoard.packs,raid),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietRaid),true);
 assert.equal(assertUniversalMatch(hushed.packs,hushedRaid),true);
});

test('BLC-1-055 rests and moves at the next opponent turn start',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-055');
 assert.equal(printed.number,'UA08BT/BLC-1-055');
 assert.equal(printed.nameJa,'砕蜂');
 assert.equal(printed.effect,'主要階段・位於前線・每回合 1 次：支付 1 AP，可選最多 1 個敵方前線 BP 3500 以下角色；下一個敵方回合開始時，使所選角色退場，再將此角色轉為 REST 並移至能源線。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-1-055'];
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],
  ['purple',4,1,3500,1,'draw','character']);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.payAp,1);
 assert.deepEqual(card.mainAbility.then[0],{op:'markOppFrontRetireNextStart',optional:true,maxBp:3500,thenRestMove:'energy'});
 assert.equal(V2_PENDING_LABELS['effect-mark-opp-start'],'可選 1 個敵方前線角色，下一個敵方回合開始時退場');
 const deck=realDeck(['BLC-1-055','BLC-1-035','BLC-2-050','BLC-1-108','BLC-1-041','BLC-1-048','BLC-1-050'],'purple');
 function readyAp(s,n){
  for(let i=0;i<3;i++){
   s.players[0].apCards[i].inPlay=i<n;
   s.players[0].apCards[i].ready=i<n;
  }
 }
 function fuel(s,p=0){
  put(s,p,'BLC-1-035','energy',0);
  put(s,p,'BLC-2-050','energy',1);
 }
 function playSoi(seed,ap=3){
  const board=main(deck,seed);
  fuel(board.s);
  readyAp(board.s,ap);
  const held=take(board.s,0,'BLC-1-055');
  board.s.players[0].hand.push(held);
  assert.ok(universalEnergyByColor(board.packs,board.s,0).purple>=4);
  const played=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:held.uid,line:'front',slot:0});
  assert.equal(played.players[0].front[0].uid,held.uid);
  assert.equal(played.players[0].front[0].ready,false);
  return {board,held,played};
 }
 function activate(packs,s,uid){
  const action=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===uid);
  assert.ok(action);
  return dispatchUniversalAction(packs,s,action);
 }
 function endTurn(packs,s){
  let n=s.phase==='main'?dispatchUniversalAction(packs,s,{type:'next'}):s;
  assert.equal(n.phase,'attack');
  assert.equal(n.pending,null);
  return dispatchUniversalAction(packs,n,{type:'next'});
 }
 function park(packs,s){
  assert.equal(s.pending.kind,'effect-line-slot');
  assert.equal(s.pending.line,'energy');
  assert.equal(s.pending.player,0);
  aiOk(packs,s);
  const slot=legalUniversalActions(packs,s).find(a=>a.type==='chooseLineSlot');
  assert.ok(slot);
  return dispatchUniversalAction(packs,s,slot);
 }
 const opened=playSoi(29171);
 const legalTarget=put(opened.played,1,'BLC-1-048','front',0);
 const high=put(opened.played,1,'BLC-1-039','front',1);
 high.buffs=[{bp:2100,untilTurn:opened.played.turn}];
 legalTarget.buffs=[{bp:2000,untilTurn:opened.played.turn}];
 assert.equal(universalBp(opened.board.packs,opened.played,legalTarget),3500);
 assert.equal(universalBp(opened.board.packs,opened.played,high),3600);
 const energyOnly=put(opened.played,1,'BLC-1-039','energy',0);
 let marked=activate(opened.board.packs,opened.played,opened.held.uid);
 assert.equal(marked.pending.kind,'effect-mark-opp-start');
 assert.equal(marked.pending.optional,true);
 assert.equal(marked.pending.maxBp,3500);
 assert.deepEqual(marked.pending.choices,[legalTarget.uid]);
 assert.equal(marked.mainAbilityUsedUids.includes(opened.held.uid),true);
 assert.equal(V2_PENDING_LABELS[marked.pending.kind],'可選 1 個敵方前線角色，下一個敵方回合開始時退場');
 aiOk(opened.board.packs,marked);
 assert.equal(chooseUniversalAiAction(opened.board.packs,marked,{difficulty:'easy'}).uid,null);
 assert.equal(chooseUniversalAiAction(opened.board.packs,marked,{difficulty:'hard'}).uid,legalTarget.uid);
 marked=dispatchUniversalAction(opened.board.packs,marked,{type:'chooseMarkOppStart',uid:legalTarget.uid});
 assert.equal(marked.pending,null);
 assert.equal(marked.delayedEffects.length,1);
 assert.equal(marked.delayedEffects[0].targetUid,legalTarget.uid);
 assert.equal(marked.delayedEffects[0].dueTurn,marked.turn+1);
 assert.equal(marked.delayedEffects[0].duePlayer,1);
 const second=put(marked,0,'BLC-1-055','front',1);
 marked=activate(opened.board.packs,marked,second.uid);
 assert.equal(marked.pending.kind,'effect-mark-opp-start');
 marked=dispatchUniversalAction(opened.board.packs,marked,{type:'chooseMarkOppStart',uid:null});
 assert.equal(marked.delayedEffects.length,1);
 assert.equal(legalUniversalActions(opened.board.packs,marked).some(a=>a.type==='activate'&&a.uid===opened.held.uid),false);
 assert.equal(legalUniversalActions(opened.board.packs,marked).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 grantContinuousState(marked,{kind:'originalEffectsDisabled',controller:1,sourceUid:opened.held.uid,
  targetUid:opened.held.uid,sourceLinked:false,until:{player:1,phase:'attack',edge:'end'}});
 marked=endTurn(opened.board.packs,marked);
 assert.equal(marked.active,1);
 assert.equal(marked.players[1].outside.some(c=>c.uid===legalTarget.uid),true);
 assert.equal(marked.players[1].front.some(c=>c?.uid===high.uid),true);
 assert.equal(marked.players[1].energy.some(c=>c?.uid===energyOnly.uid),true);
 marked=park(opened.board.packs,marked);
 const rested=live(marked,0,opened.held.uid);
 assert.equal(locationLine(marked,opened.held.uid),'energy');
 assert.equal(rested.ready,false);
 assert.equal(locationLine(marked,second.uid),'front');
 assert.equal(live(marked,0,second.uid).ready,true);
 assert.equal(assertUniversalMatch(opened.board.packs,marked),true);

 const declined=playSoi(29172);
 const kept=put(declined.played,1,'BLC-1-048','front',0);
 let passed=activate(declined.board.packs,declined.played,declined.held.uid);
 passed=dispatchUniversalAction(declined.board.packs,passed,{type:'chooseMarkOppStart',uid:null});
 assert.equal(passed.delayedEffects.length,0);
 passed=endTurn(declined.board.packs,passed);
 assert.equal(passed.pending,null);
 assert.equal(locationLine(passed,declined.held.uid),'front');
 assert.equal(live(passed,0,declined.held.uid).ready,true);
 assert.equal(passed.players[1].front.some(c=>c?.uid===kept.uid),true);

 const quiet=playSoi(29173);
 const tooBig=put(quiet.played,1,'BLC-1-048','front',0);
 tooBig.buffs=[{bp:2100,untilTurn:quiet.played.turn}];
 const none=activate(quiet.board.packs,quiet.played,quiet.held.uid);
 assert.equal(none.pending,null);
 assert.equal(none.delayedEffects.length,0);
 assert.equal(none.mainAbilityUsedUids.includes(quiet.held.uid),true);
 const lined=main(deck,29174);
 fuel(lined.s);
 readyAp(lined.s,1);
 const energyCopy=put(lined.s,0,'BLC-1-055','energy',2);
 assert.equal(legalUniversalActions(lined.packs,lined.s).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 const poor=playSoi(29175,1);
 assert.equal(legalUniversalActions(poor.board.packs,poor.played).some(a=>a.type==='activate'&&a.uid===poor.held.uid),false);
 const hushed=playSoi(29176);
 grantContinuousState(hushed.played,{kind:'originalEffectsDisabled',controller:1,sourceUid:hushed.held.uid,
  targetUid:hushed.held.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(hushed.board.packs,hushed.played).some(a=>a.type==='activate'&&a.uid===hushed.held.uid),false);

 const blocked=playSoi(29177);
 const victim=put(blocked.played,1,'BLC-1-048','front',0,true);
 const attacker=put(blocked.played,0,'BLC-1-041','front',2,true);
 let battle=activate(blocked.board.packs,blocked.played,blocked.held.uid);
 battle=dispatchUniversalAction(blocked.board.packs,battle,{type:'chooseMarkOppStart',uid:victim.uid});
 battle=dispatchUniversalAction(blocked.board.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(blocked.board.packs,battle,{type:'attack',uid:attacker.uid});
 battle=dispatchUniversalAction(blocked.board.packs,battle,{type:'chooseBlock',uid:victim.uid},{actor:1});
 assert.equal(battle.players[1].outside.some(c=>c.uid===victim.uid),true);
 battle=dispatchUniversalAction(blocked.board.packs,battle,{type:'next'});
 battle=park(blocked.board.packs,battle);
 assert.equal(locationLine(battle,blocked.held.uid),'energy');
 assert.equal(live(battle,0,blocked.held.uid).ready,false);
 assert.equal(battle.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(battle.players[1].front.every(c=>c?.uid!==victim.uid),true);

 const covered=playSoi(29178);
 fuel(covered.played,1);
 put(covered.played,1,'BLC-1-108','energy',2);
 const base=put(covered.played,1,'BLC-1-048','front',0,true);
 const raider=take(covered.played,1,'BLC-1-050');
 const displaced=covered.played.players[1].life[0];
 covered.played.players[1].life[0]=raider;
 if(displaced)covered.played.players[1].deck.push(displaced);
 const swinger=put(covered.played,0,'BLC-1-041','front',2,true);
 let raid=activate(covered.board.packs,covered.played,covered.held.uid);
 raid=dispatchUniversalAction(covered.board.packs,raid,{type:'chooseMarkOppStart',uid:base.uid});
 raid=dispatchUniversalAction(covered.board.packs,raid,{type:'next'});
 raid=dispatchUniversalAction(covered.board.packs,raid,{type:'attack',uid:swinger.uid});
 raid=dispatchUniversalAction(covered.board.packs,raid,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(raid.pending.kind,'life-trigger');
 const raidAction=legalUniversalActions(covered.board.packs,raid).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(raidAction);
 raid=dispatchUniversalAction(covered.board.packs,raid,raidAction,{actor:1});
 if(raid.pending?.kind==='effect-remove-outside')
  raid=dispatchUniversalAction(covered.board.packs,raid,{type:'chooseRemoveOutside',mode:'skip'},{actor:1});
 assert.equal(raid.players[1].front[0].cardId,'BLC-1-050');
 assert.equal(raid.players[1].front[0].stack[0].uid,base.uid);
 raid=dispatchUniversalAction(covered.board.packs,raid,{type:'next'});
 raid=park(covered.board.packs,raid);
 assert.equal(raid.players[1].front.some(c=>c?.cardId==='BLC-1-050'),true);
 assert.equal(raid.players[1].outside.some(c=>c.uid===base.uid),false);
 assert.equal(locationLine(raid,covered.held.uid),'energy');
 assert.equal(live(raid,0,covered.held.uid).ready,false);

 const crowded=playSoi(29179);
 const crowdedTarget=put(crowded.played,1,'BLC-1-048','front',0);
 put(crowded.played,0,'BLC-1-039','energy',2);
 put(crowded.played,0,'BLC-1-108','energy',3);
 let full=activate(crowded.board.packs,crowded.played,crowded.held.uid);
 full=dispatchUniversalAction(crowded.board.packs,full,{type:'chooseMarkOppStart',uid:crowdedTarget.uid});
 full=endTurn(crowded.board.packs,full);
 assert.equal(full.pending.kind,'effect-line-slot');
 assert.equal(legalUniversalActions(crowded.board.packs,full).every(a=>a.replaceUid),true);
 const replaced=legalUniversalActions(crowded.board.packs,full).find(a=>a.slot===3);
 const removedUid=replaced.replaceUid;
 full=dispatchUniversalAction(crowded.board.packs,full,replaced);
 assert.equal(full.players[0].removed.some(c=>c.uid===removedUid),true);
 assert.equal(full.players[0].energy[3].uid,crowded.held.uid);
 assert.equal(full.players[0].energy[3].ready,false);
 assert.equal(full.players[1].outside.some(c=>c.uid===crowdedTarget.uid),true);

 const mirror=[bleach,bleach];
 let draw=newUniversalMatch(mirror,{decks:[deck,deck],seed:29180,first:0});
 for(let n=0;n<8&&draw.phase!=='attack';n++)draw=dispatchUniversalAction(mirror,draw,{type:'next'});
 const drawAttacker=put(draw,0,'BLC-1-041','front',0,true);
 const revealed=take(draw,1,'BLC-1-055');
 draw.players[1].deck.push(...draw.players[1].life.splice(0));
 draw.players[1].life.push(revealed);
 const before=draw.players[1].hand.length;
 draw=dispatchUniversalAction(mirror,draw,{type:'attack',uid:drawAttacker.uid});
 draw=dispatchUniversalAction(mirror,draw,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(draw.pending.kind,'life-trigger');
 assert.equal(draw.pending.trigger,'draw');
 draw=dispatchUniversalAction(mirror,draw,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(draw.players[1].hand.length,before+1);
 assert.equal(draw.triggerActivated[1],true);
 assert.equal(assertUniversalMatch(declined.board.packs,passed),true);
 assert.equal(assertUniversalMatch(quiet.board.packs,none),true);
 assert.equal(assertUniversalMatch(lined.packs,lined.s),true);
 assert.equal(assertUniversalMatch(poor.board.packs,poor.played),true);
 assert.equal(assertUniversalMatch(hushed.board.packs,hushed.played),true);
 assert.equal(assertUniversalMatch(blocked.board.packs,battle),true);
 assert.equal(assertUniversalMatch(covered.board.packs,raid),true);
 assert.equal(assertUniversalMatch(crowded.board.packs,full),true);
 assert.equal(assertUniversalMatch(mirror,draw),true);
});

test('BLC-1-063 looks at five cards, adds one, and puts one outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-063');
 assert.equal(printed.number,'UA08BT/BLC-1-063');
 assert.equal(printed.nameJa,'技術開発局');
 assert.equal(printed.effect,'查看己方牌堆頂 5 張，其中 1 張加入手牌、1 張送至場外，其餘以任意順序放至牌堆底。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.gen,0);
 assert.equal(printed.energy,2);
 assert.equal(printed.type,'event');
 assert.equal(printed.trigger,'draw');
 const card=bleach.cards['BLC-1-063'];
 assert.equal(card.name,'技術開発局');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'lookTopHandOutsideBottom',count:5}]);
 assert.equal(V2_PENDING_LABELS['effect-top-hand-outside'],'查看牌頂，1 張加入手牌、1 張送至場外');
 const bare={id:'BAD',name:'BAD',color:'purple',type:'event',energy:2,ap:1,bp:0,gen:0,traits:[],trigger:'draw',implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-look-count',cards:[{...bare,effects:{onPlay:[{op:'lookTopHandOutsideBottom',count:4}]}}]}),/invalid look-hand-outside-bottom window/);
 assert.throws(()=>createUniversalPack({id:'bad-look-key',cards:[{...bare,effects:{onPlay:[{op:'lookTopHandOutsideBottom',count:5,rest:'bottom'}]}}]}),/invalid look-hand-outside-bottom window/);
 assert.doesNotThrow(()=>createUniversalPack({id:'ok-look',cards:[{...bare,effects:{onPlay:[{op:'lookTopHandOutsideBottom',count:5}]}}]}));
 assert.doesNotThrow(()=>createUniversalPack({id:'ok-look-character',cards:[{...bare,id:'WHO',type:'character',bp:2000,gen:1,trigger:null,effects:{onPlay:[{op:'lookTopHandOutsideBottom',count:5}]}}]}));
 const deck=realDeck(['BLC-1-063','BLC-1-035','BLC-1-103','BLC-1-039','BLC-4-046','BLC-1-041','BLC-1-048','BLC-2-050'],'purple');
 const board=main(deck,29181);
 const event=take(board.s,0,'BLC-1-063');
 board.s.players[0].hand.push(event);
 assert.equal(legalUniversalActions(board.packs,board.s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 put(board.s,0,'BLC-1-035','energy',0);
 const window=setTop(board.s,0,['BLC-1-103','BLC-1-039','BLC-4-046','BLC-1-041','BLC-1-048','BLC-2-050']);
 const under=window[5];
 assert.equal(legalUniversalActions(board.packs,board.s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 let played=dispatchUniversalAction(board.packs,board.s,{type:'event',uid:event.uid});
 assert.equal(played.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(played.pending.kind,'effect-top-hand-outside');
 assert.equal(played.pending.step,'hand');
 assert.deepEqual(played.pending.uids,window.slice(0,5).map(c=>c.uid));
 const handChoices=legalUniversalActions(board.packs,played);
 assert.equal(handChoices.some(a=>a.uid===null),false);
 assert.equal(handChoices.some(a=>a.uid===under.uid),false);
 assert.deepEqual(handChoices.map(a=>a.uid),window.slice(0,5).map(c=>c.uid));
 assert.equal(uiActionLabel(handChoices[0],{pack:board.packs,state:played}).includes('加入手牌'),true);
 const mine=universalPrivateChoices(board.packs,played,0);
 assert.equal(mine.kind,'effect-top-hand-outside');
 assert.deepEqual(mine.options.map(o=>o.card.cardId),window.slice(0,5).map(c=>c.cardId));
 assert.equal(universalPrivateChoices(board.packs,played,1),null);
 const hidden=JSON.stringify(universalPublicView(board.packs,played,1));
 for(const c of window.slice(0,5))assert.equal(hidden.includes(c.uid),false);
 assert.equal(played.publicReveals.length,0);
 aiOk(board.packs,played);
 assert.throws(()=>dispatchUniversalAction(board.packs,played,{type:'chooseTopHandOutside',uid:null,step:'hand'}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(board.packs,played,{type:'chooseTopHandOutside',uid:under.uid,step:'hand'}),/not currently legal/);
 const forged=structuredClone(played);
 forged.players[0].deck.push(forged.players[0].deck.shift());
 assert.throws(()=>assertUniversalMatch(board.packs,forged),/Invalid looked hand and outside window/);
 const taken=window[0];
 played=dispatchUniversalAction(board.packs,played,{type:'chooseTopHandOutside',uid:taken.uid,step:'hand'});
 assert.equal(played.players[0].hand.some(c=>c.uid===taken.uid),true);
 assert.equal(played.publicReveals.length,0);
 assert.equal(JSON.stringify(universalPublicView(board.packs,played,1)).includes(taken.uid),false);
 assert.equal(played.pending.kind,'effect-top-hand-outside');
 assert.equal(played.pending.step,'outside');
 assert.deepEqual(played.pending.uids,window.slice(1,5).map(c=>c.uid));
 assert.equal(uiActionLabel(legalUniversalActions(board.packs,played)[0],{pack:board.packs,state:played}).includes('送至場外'),true);
 aiOk(board.packs,played);
 const parked=window[1];
 played=dispatchUniversalAction(board.packs,played,{type:'chooseTopHandOutside',uid:parked.uid,step:'outside'});
 assert.equal(played.players[0].outside.some(c=>c.uid===parked.uid),true);
 assert.equal(played.pending.kind,'effect-top-order');
 assert.deepEqual(played.pending.uids,window.slice(2,5).map(c=>c.uid));
 assert.equal(played.pending.rest,'bottom');
 const order=[window[4].uid,window[2].uid,window[3].uid];
 for(const uid of order)
  played=dispatchUniversalAction(board.packs,played,{type:'chooseTopOrder',uid});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].deck[0].uid,under.uid);
 assert.deepEqual(played.players[0].deck.slice(-3).map(c=>c.uid),order);
 assert.equal(played.publicReveals.length,0);
 const one=main(deck,29182);
 const oneEvent=take(one.s,0,'BLC-1-063');
 one.s.players[0].hand.push(oneEvent);
 put(one.s,0,'BLC-1-035','energy',0);
 const lone=one.s.players[0].deck[0];
 one.s.players[0].removed.push(...one.s.players[0].deck.splice(1));
 let single=dispatchUniversalAction(one.packs,one.s,{type:'event',uid:oneEvent.uid});
 assert.deepEqual(legalUniversalActions(one.packs,single).map(a=>a.uid),[lone.uid]);
 single=dispatchUniversalAction(one.packs,single,{type:'chooseTopHandOutside',uid:lone.uid,step:'hand'});
 assert.equal(single.pending,null);
 assert.equal(single.players[0].hand.some(c=>c.uid===lone.uid),true);
 assert.equal(single.players[0].outside.some(c=>c.uid===lone.uid),false);
 const pair=main(deck,29183);
 const pairEvent=take(pair.s,0,'BLC-1-063');
 pair.s.players[0].hand.push(pairEvent);
 put(pair.s,0,'BLC-1-035','energy',0);
 const two=pair.s.players[0].deck.slice(0,2);
 pair.s.players[0].removed.push(...pair.s.players[0].deck.splice(2));
 let both=dispatchUniversalAction(pair.packs,pair.s,{type:'event',uid:pairEvent.uid});
 both=dispatchUniversalAction(pair.packs,both,{type:'chooseTopHandOutside',uid:two[0].uid,step:'hand'});
 assert.equal(both.pending.step,'outside');
 assert.deepEqual(both.pending.uids,[two[1].uid]);
 both=dispatchUniversalAction(pair.packs,both,{type:'chooseTopHandOutside',uid:two[1].uid,step:'outside'});
 assert.equal(both.pending,null);
 assert.equal(both.players[0].hand.some(c=>c.uid===two[0].uid),true);
 assert.equal(both.players[0].outside.some(c=>c.uid===two[1].uid),true);
 const empty=main(deck,29184);
 const emptyEvent=take(empty.s,0,'BLC-1-063');
 empty.s.players[0].hand.push(emptyEvent);
 put(empty.s,0,'BLC-1-035','energy',0);
 empty.s.players[0].removed.push(...empty.s.players[0].deck.splice(0));
 const quiet=dispatchUniversalAction(empty.packs,empty.s,{type:'event',uid:emptyEvent.uid});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.some(c=>c.uid===emptyEvent.uid),true);
 const mirror=[bleach,bleach];
 let draw=newUniversalMatch(mirror,{decks:[deck,deck],seed:29185,first:0});
 for(let n=0;n<8&&draw.phase!=='attack';n++)draw=dispatchUniversalAction(mirror,draw,{type:'next'});
 const drawAttacker=put(draw,0,'BLC-1-041','front',0,true);
 const revealed=take(draw,1,'BLC-1-063');
 draw.players[1].deck.push(...draw.players[1].life.splice(0));
 draw.players[1].life.push(revealed);
 const before=draw.players[1].hand.length;
 draw=dispatchUniversalAction(mirror,draw,{type:'attack',uid:drawAttacker.uid});
 draw=dispatchUniversalAction(mirror,draw,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(draw.pending.kind,'life-trigger');
 assert.equal(draw.pending.trigger,'draw');
 draw=dispatchUniversalAction(mirror,draw,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(draw.players[1].hand.length,before+1);
 assert.equal(draw.triggerActivated[1],true);
 assert.equal(assertUniversalMatch(board.packs,played),true);
 assert.equal(assertUniversalMatch(one.packs,single),true);
 assert.equal(assertUniversalMatch(pair.packs,both),true);
 assert.equal(assertUniversalMatch(empty.packs,quiet),true);
 assert.equal(assertUniversalMatch(mirror,draw),true);
});

test('BLC-1-093 moves Squad characters forward and buffs the others',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-093');
 assert.equal(printed.number,'UA08BT/BLC-1-093');
 assert.equal(printed.nameJa,'山本 元柳斎 重國');
 assert.equal(printed.effect,'Raid〈山本元柳齋重國〉：轉為 ACTIVE，可移至前線。Impact 1。登場：可將己方能源線任意數量、具有「護廷十三隊」特徵的卡移至前線。攻擊時：所有其他己方場上具有「護廷十三隊」特徵的卡，本回合 BP +2000。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.energy,7);
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-1-093'];
 assert.equal(card.raidName,'山本 元柳斎 重國');
 assert.equal(card.printedImpact,1);
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'moveEnergyTraitToFront',trait:'護廷十三隊'}]);
 assert.deepEqual(card.effects.onAttack,[{op:'buffOwnTraitAllTurn',trait:'護廷十三隊',bp:2000,excludeSelf:true}]);
 assert.equal(V2_PENDING_LABELS['effect-energy-trait-front'],'可將能源線上具有指定特徵的角色移至前線');
 const bare={id:'BAD',name:'BAD',color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,traits:['護廷十三隊'],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-shift',cards:[{...bare,effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:''}]}}]}),/invalid energy-line trait move/);
 assert.throws(()=>createUniversalPack({id:'bad-self',cards:[{...bare,effects:{onAttack:[{op:'buffOwnTraitAllTurn',trait:'護廷十三隊',bp:2000,excludeSelf:false}]}}]}),/invalid all-trait temporary BP/);
 assert.doesNotThrow(()=>createUniversalPack({id:'ok-shift',cards:[{...bare,effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:'護廷十三隊'}],onAttack:[{op:'buffOwnTraitAllTurn',trait:'護廷十三隊',bp:2000,excludeSelf:true}]}}]}));
 const deck=realDeck(['BLC-1-093','BLC-1-092','BLC-4-077','BLC-4-063','BLC-4-071','BLC-1-080','BLC-1-087','BLC-1-079','BLC-1-078'],'green');
 const board=main(deck,29191);
 const fuel=['BLC-1-079','BLC-4-077','BLC-4-063','BLC-4-071'].map((id,i)=>put(board.s,0,id,'energy',i));
 const rested=fuel[0];
 rested.ready=false;
 const base=put(board.s,0,'BLC-1-092','front',0,true);
 const watcher=put(board.s,0,'BLC-1-080','front',1,true);
 const foe=put(board.s,1,'BLC-1-087','front',0,true);
 const raider=take(board.s,0,'BLC-1-093');
 board.s.players[0].hand.push(raider);
 const raidAction=legalUniversalActions(board.packs,board.s).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 assert.ok(raidAction);
 assert.equal(raidAction.slot,0);
 let played=dispatchUniversalAction(board.packs,board.s,raidAction);
 assert.equal(played.players[0].front[0].uid,raider.uid);
 assert.equal(played.players[0].front[0].ready,true);
 assert.equal(played.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(universalImpact(board.packs,played,played.players[0].front[0]),1);
 assert.equal(played.pending.kind,'effect-energy-trait-front');
 assert.equal(played.pending.optional,true);
 const choices=legalUniversalActions(board.packs,played);
 assert.equal(choices.some(a=>a.uid===null),true);
 assert.equal(choices.some(a=>a.uid===fuel[1].uid),false);
 assert.equal(choices.some(a=>a.uid===fuel[0].uid&&a.slot===2),true);
 assert.equal(choices.some(a=>a.uid===fuel[2].uid),true);
 assert.equal(choices.some(a=>a.uid===fuel[3].uid),true);
 assert.equal(choices.some(a=>a.uid===watcher.uid),false);
 assert.equal(uiActionLabel(choices.find(a=>a.uid===null),{pack:board.packs,state:played}).includes('不移動'),true);
 aiOk(board.packs,played);
 const before={
  self:universalBp(board.packs,played,played.players[0].front[0]),
  moved:universalBp(board.packs,played,fuel[0]),
  stayed:universalBp(board.packs,played,fuel[3]),
  watch:universalBp(board.packs,played,watcher),
  field:universalBp(board.packs,played,fuel[1]),
  foe:universalBp(board.packs,played,foe)
 };
 played=dispatchUniversalAction(board.packs,played,{type:'chooseEnergyTraitFront',uid:fuel[0].uid,slot:2});
 assert.equal(played.players[0].front[2].uid,fuel[0].uid);
 assert.equal(played.players[0].front[2].ready,false);
 assert.equal(played.players[0].energy[0],null);
 assert.equal(played.pending.kind,'effect-energy-trait-front');
 played=dispatchUniversalAction(board.packs,played,{type:'chooseEnergyTraitFront',uid:null});
 assert.equal(played.pending,null);
 assert.equal(played.players[0].energy[2].uid,fuel[2].uid);
 assert.equal(played.players[0].energy[3].uid,fuel[3].uid);
 played=dispatchUniversalAction(board.packs,played,{type:'next'});
 played=dispatchUniversalAction(board.packs,played,{type:'attack',uid:raider.uid});
 assert.equal(universalBp(board.packs,played,live(played,0,raider.uid)),before.self);
 assert.equal(universalBp(board.packs,played,live(played,0,fuel[0].uid)),before.moved+2000);
 assert.equal(universalBp(board.packs,played,live(played,0,fuel[3].uid)),before.stayed+2000);
 assert.equal(universalBp(board.packs,played,live(played,0,watcher.uid)),before.watch+2000);
 assert.equal(universalBp(board.packs,played,live(played,0,fuel[1].uid)),before.field);
 assert.equal(universalBp(board.packs,played,live(played,1,foe.uid)),before.foe);
 const crowded=main(deck,29192);
 ['BLC-1-079','BLC-4-077','BLC-4-063','BLC-4-071'].forEach((id,i)=>put(crowded.s,0,id,'energy',i));
 const wall=put(crowded.s,0,'BLC-1-092','front',0,true);
 put(crowded.s,0,'BLC-1-080','front',1,true);
 put(crowded.s,0,'BLC-1-087','front',2,true);
 put(crowded.s,0,'BLC-1-078','front',3,true);
 const second=take(crowded.s,0,'BLC-1-093');
 crowded.s.players[0].hand.push(second);
 let full=dispatchUniversalAction(crowded.packs,crowded.s,{type:'raid',uid:second.uid,baseUid:wall.uid,slot:0});
 assert.equal(full.pending,null);
 const squad=full.players[0].energy[0];
 const squadBefore=universalBp(crowded.packs,full,squad);
 full=dispatchUniversalAction(crowded.packs,full,{type:'next'});
 full=dispatchUniversalAction(crowded.packs,full,{type:'attack',uid:second.uid});
 assert.equal(universalBp(crowded.packs,full,live(full,0,second.uid)),5000);
 assert.equal(universalBp(crowded.packs,full,live(full,0,squad.uid)),squadBefore+2000);
 const quiet=main(deck,29193);
 ['BLC-1-079','BLC-4-077','BLC-4-063','BLC-4-071'].forEach((id,i)=>put(quiet.s,0,id,'energy',i));
 const host=put(quiet.s,0,'BLC-1-092','front',0,true);
 const ally=put(quiet.s,0,'BLC-1-080','front',1,true);
 const hushed=take(quiet.s,0,'BLC-1-093');
 quiet.s.players[0].hand.push(hushed);
 let silenced=dispatchUniversalAction(quiet.packs,quiet.s,{type:'raid',uid:hushed.uid,baseUid:host.uid,slot:0});
 silenced=dispatchUniversalAction(quiet.packs,silenced,{type:'chooseEnergyTraitFront',uid:null});
 const allyBefore=universalBp(quiet.packs,silenced,ally);
 grantContinuousState(silenced,{kind:'originalEffectsDisabled',controller:1,sourceUid:hushed.uid,
  targetUid:hushed.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalImpact(quiet.packs,silenced,live(silenced,0,hushed.uid)),0);
 silenced=dispatchUniversalAction(quiet.packs,silenced,{type:'next'});
 silenced=dispatchUniversalAction(quiet.packs,silenced,{type:'attack',uid:hushed.uid});
 assert.equal(universalBp(quiet.packs,silenced,live(silenced,0,ally.uid)),allyBefore);
 const shift=main(deck,29194);
 const shiftHost=put(shift.s,0,'BLC-1-092','energy',0,true);
 put(shift.s,0,'BLC-4-071','energy',1);
 put(shift.s,0,'BLC-4-077','energy',2);
 put(shift.s,0,'BLC-4-063','energy',3);
 const shifter=take(shift.s,0,'BLC-1-093');
 shift.s.players[0].hand.push(shifter);
 const moved=legalUniversalActions(shift.packs,shift.s).find(a=>a.type==='raid'&&a.baseUid===shiftHost.uid&&a.slot===0);
 assert.ok(moved);
 let shifted=dispatchUniversalAction(shift.packs,shift.s,moved);
 assert.equal(shifted.players[0].front[0].uid,shifter.uid);
 assert.equal(shifted.players[0].front[0].ready,true);
 assert.equal(shifted.players[0].energy[0],null);
 assert.equal(shifted.pending.kind,'effect-energy-trait-front');
 shifted=dispatchUniversalAction(shift.packs,shifted,{type:'chooseEnergyTraitFront',uid:null});
 const mirror=[bleach,bleach];
 let life=newUniversalMatch(mirror,{decks:[deck,deck],seed:29195,first:0});
 for(let n=0;n<8&&life.phase!=='attack';n++)life=dispatchUniversalAction(mirror,life,{type:'next'});
 const swinger=put(life,0,'BLC-1-080','front',0,true);
 ['BLC-1-079','BLC-4-077','BLC-4-063','BLC-4-071'].forEach((id,i)=>put(life,1,id,'energy',i));
 const lifeBase=put(life,1,'BLC-1-092','front',0,true);
 const revealed=take(life,1,'BLC-1-093');
 life.players[1].deck.push(...life.players[1].life.splice(0));
 life.players[1].life.unshift(revealed);
 life=dispatchUniversalAction(mirror,life,{type:'attack',uid:swinger.uid});
 life=dispatchUniversalAction(mirror,life,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(life.pending.kind,'life-trigger');
 const lifeRaid=legalUniversalActions(mirror,life).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===lifeBase.uid);
 assert.ok(lifeRaid);
 life=dispatchUniversalAction(mirror,life,lifeRaid,{actor:1});
 assert.equal(life.players[1].front[0].cardId,'BLC-1-093');
 assert.equal(life.players[1].front[0].ready,true);
 assert.equal(life.pending.kind,'effect-energy-trait-front');
 assert.equal(life.pending.player,1);
 life=dispatchUniversalAction(mirror,life,{type:'chooseEnergyTraitFront',uid:null},{actor:1});
 assert.equal(life.pending,null);
 assert.equal(assertUniversalMatch(board.packs,played),true);
 assert.equal(assertUniversalMatch(crowded.packs,full),true);
 assert.equal(assertUniversalMatch(quiet.packs,silenced),true);
 assert.equal(assertUniversalMatch(shift.packs,shifted),true);
 assert.equal(assertUniversalMatch(mirror,life),true);
});

test('BLC-2-009 draws at three other cards and revives a yellow zombie',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-009');
 assert.equal(printed.number,'EX07BT/BLC-2-009');
 assert.equal(printed.nameJa,'ジゼル・ジュエル');
 assert.equal(printed.effect,'登場：己方場上其他具有「邦比愛塔親衛隊」特徵、「殭屍」特徵或名為〈邦比愛塔・芭絲塔拜茵〉的卡，合計至少 3 張時，抽 2 張，再將 2 張手牌送至場外。主要階段・位於前線・每回合 1 次：使 1 個己方場上不具有「殭屍」特徵的角色退場；成功時可從己方場外將最多 1 張具有「殭屍」特徵的黃色角色卡以 ACTIVE 登場於己方場上。');
 assert.equal(printed.traits,'星十字騎士團／邦比愛塔親衛隊');
 assert.equal(printed.trigger,'get');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-2-009'];
 assert.equal(card.name,'ジゼル・ジュエル');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traitComponents,['星十字騎士團','邦比愛塔親衛隊']);
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],
  ['yellow',4,2,4000,1,'get','character']);
 assert.deepEqual(card.effects.onPlay,[{op:'drawDiscardIfFieldAny',count:2,discardCount:2,min:3,excludeSelf:true,traits:['邦比愛塔親衛隊','殭屍'],names:['バンビエッタ・バスターバイン']}]);
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.payAp,0);
 assert.deepEqual(card.mainAbility.then[0],{op:'retireOwnMissingTraitThen',trait:'殭屍',then:[{op:'deployOutsideColorTraitActive',color:'yellow',trait:'殭屍'}]});
 assert.equal(V2_PENDING_LABELS['effect-retire-missing-trait'],'使 1 個不具有指定特徵的己方角色退場');
 assert.equal(V2_PENDING_LABELS['effect-outside-color-trait-active'],'可從場外將 1 張指定顏色與特徵的角色以 ACTIVE 登場');
 const bare={id:'BAD',name:'BAD',color:'yellow',type:'character',energy:4,ap:2,bp:4000,gen:1,traits:['星十字騎士團'],trigger:'get',implementation:'dsl'};
 const look={op:'drawDiscardIfFieldAny',count:2,discardCount:2,min:3,excludeSelf:true,traits:['邦比愛塔親衛隊','殭屍'],names:['バンビエッタ・バスターバイン']};
 assert.throws(()=>createUniversalPack({id:'bad-field-any',cards:[{...bare,effects:{onPlay:[{...look,min:0}]}}]}),/invalid field-any draw\/discard/);
 assert.throws(()=>createUniversalPack({id:'bad-field-key',cards:[{...bare,effects:{onPlay:[{...look,zone:'front'}]}}]}),/invalid field-any draw\/discard/);
 assert.doesNotThrow(()=>createUniversalPack({id:'ok-field-any',cards:[{...bare,effects:{onPlay:[look]},mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:true,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'retireOwnMissingTraitThen',trait:'殭屍',then:[{op:'deployOutsideColorTraitActive',color:'yellow',trait:'殭屍'}]}]}}]}));
 const deck=realDeck(['BLC-2-009','BLC-2-005','BLC-2-006','BLC-2-011','BLC-1-014','BLC-1-018','BLC-4-017','BLC-1-032','BLC-1-006','BLC-2-003','BLC-4-001'],'yellow');
 function readyAp(s,n){
  for(let i=0;i<3;i++){
   s.players[0].apCards[i].inPlay=i<n;
   s.players[0].apCards[i].ready=i<n;
  }
 }
 function fuel(s){
  put(s,0,'BLC-1-018','energy',1);
  put(s,0,'BLC-2-003','energy',2);
  put(s,0,'BLC-4-001','energy',3);
 }
 function playGiselle(seed){
  const board=main(deck,seed);
  put(board.s,0,'BLC-1-006','energy',0);
  fuel(board.s);
  readyAp(board.s,2);
  const held=take(board.s,0,'BLC-2-009');
  board.s.players[0].hand.push(held);
  assert.ok(universalEnergyByColor(board.packs,board.s,0).yellow>=4);
  const before=board.s.players[0].hand.length;
  const played=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:held.uid,line:'front',slot:0});
  assert.equal(played.players[0].front[0].uid,held.uid);
  assert.equal(played.players[0].front[0].ready,false);
  return {board,held,played,before};
 }
 const short=main(deck,29201);
 fuel(short.s);
 put(short.s,0,'BLC-2-011','energy',0);
 put(short.s,0,'BLC-2-006','front',1);
 readyAp(short.s,2);
 const shortHeld=take(short.s,0,'BLC-2-009');
 short.s.players[0].hand.push(shortHeld);
 const shortPlayed=dispatchUniversalAction(short.packs,short.s,{type:'play',uid:shortHeld.uid,line:'front',slot:0});
 assert.equal(shortPlayed.pending,null);
 const opened=main(deck,29202);
 fuel(opened.s);
 const squad=put(opened.s,0,'BLC-2-011','energy',0);
 const zombie=put(opened.s,0,'BLC-2-005','front',1);
 const named=put(opened.s,0,'BLC-1-014','front',2);
 readyAp(opened.s,2);
 const held=take(opened.s,0,'BLC-2-009');
 opened.s.players[0].hand.push(held);
 const before=opened.s.players[0].hand.length;
 let played=dispatchUniversalAction(opened.packs,opened.s,{type:'play',uid:held.uid,line:'front',slot:0});
 assert.equal(played.pending.kind,'effect-discard');
 assert.equal(played.pending.remaining,2);
 assert.equal(played.players[0].hand.length,before-1+2);
 const firstDiscard=legalUniversalActions(opened.packs,played).find(a=>a.type==='chooseDiscard');
 played=dispatchUniversalAction(opened.packs,played,firstDiscard);
 const secondDiscard=legalUniversalActions(opened.packs,played).find(a=>a.type==='chooseDiscard');
 played=dispatchUniversalAction(opened.packs,played,secondDiscard);
 assert.equal(played.pending,null);
 assert.equal(played.players[0].hand.length,before-1);
 assert.equal(live(played,0,squad.uid).cardId,'BLC-2-011');
 assert.equal(live(played,0,zombie.uid).cardId,'BLC-2-005');
 assert.equal(live(played,0,named.uid).cardId,'BLC-1-014');
 const used=playGiselle(29203);
 put(used.played,0,'BLC-2-005','front',1);
 const legalOther=put(used.played,0,'BLC-1-014','front',2);
 const outsideZombie=take(used.played,0,'BLC-2-005');
 const plainOutside=take(used.played,0,'BLC-4-017');
 const eventOutside=take(used.played,0,'BLC-1-032');
 used.played.players[0].outside.push(outsideZombie,plainOutside,eventOutside);
 let marked=dispatchUniversalAction(used.board.packs,used.played,legalUniversalActions(used.board.packs,used.played).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===used.held.uid));
 assert.equal(marked.pending.kind,'effect-retire-missing-trait');
 assert.equal(marked.pending.trait,'殭屍');
 assert.equal(marked.pending.choices.includes(used.held.uid),true);
 assert.equal(marked.pending.choices.includes(legalOther.uid),true);
 assert.equal(marked.pending.choices.some(uid=>live(marked,0,uid)?.cardId==='BLC-2-005'),false);
 assert.equal(legalUniversalActions(used.board.packs,marked).some(a=>a.uid===null),false);
 assert.equal(marked.mainAbilityUsedUids.includes(used.held.uid),true);
 aiOk(used.board.packs,marked);
 marked=dispatchUniversalAction(used.board.packs,marked,{type:'chooseMissingTraitRetire',uid:legalOther.uid});
 assert.equal(marked.players[0].outside.some(c=>c.uid===legalOther.uid),true);
 assert.equal(marked.pending.kind,'effect-outside-color-trait-active');
 assert.deepEqual(marked.pending.choices,[outsideZombie.uid]);
 assert.equal(chooseUniversalAiAction(used.board.packs,marked,{difficulty:'easy'}).uid,null);
 const accepted=chooseUniversalAiAction(used.board.packs,marked,{difficulty:'hard'});
 assert.equal(accepted.uid,outsideZombie.uid);
 assert.equal(accepted.line!==undefined,true);
 const seen=universalPrivateChoices(used.board.packs,marked,0);
 assert.equal(seen.options.some(o=>o.card?.cardId==='BLC-2-005'),true);
 assert.equal(universalPrivateChoices(used.board.packs,marked,1),null);
 marked=dispatchUniversalAction(used.board.packs,marked,{type:'chooseOutsideColorTraitActive',uid:null});
 assert.equal(marked.pending,null);
 assert.equal(marked.players[0].outside.some(c=>c.uid===outsideZombie.uid),true);
 assert.equal(legalUniversalActions(used.board.packs,marked).some(a=>a.type==='activate'&&a.uid===used.held.uid),false);
 const second=put(marked,0,'BLC-2-009','front',3);
 const energyCopy=take(marked,0,'BLC-2-009');
 const displaced=marked.players[0].energy[1];
 marked.players[0].energy[1]=null;
 marked.players[0].outside.push(displaced);
 energyCopy.ready=true;energyCopy.fieldEntryStamp=marked.nextFieldEntryStamp++;
 marked.players[0].energy[1]=energyCopy;
 put(marked,1,'BLC-1-018','front',0,true);
 assert.equal(legalUniversalActions(used.board.packs,marked).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 let revived=dispatchUniversalAction(used.board.packs,marked,legalUniversalActions(used.board.packs,marked).find(a=>a.type==='activate'&&a.mode==='oncePay'&&a.uid===second.uid));
 assert.equal(revived.pending.choices.includes(second.uid),true);
 revived=dispatchUniversalAction(used.board.packs,revived,{type:'chooseMissingTraitRetire',uid:second.uid});
 assert.equal(revived.players[0].outside.some(c=>c.uid===second.uid),true);
 assert.equal(revived.pending.kind,'effect-outside-color-trait-active');
 const enter=legalUniversalActions(used.board.packs,revived).find(a=>a.uid===outsideZombie.uid&&a.line==='front'&&!a.replaceUid);
 revived=dispatchUniversalAction(used.board.packs,revived,enter);
 assert.equal(live(revived,0,outsideZombie.uid).ready,true);
 assert.equal(locationLine(revived,outsideZombie.uid),'front');
 assert.equal(revived.pending.kind,'effect-rest-bp');
 revived=dispatchUniversalAction(used.board.packs,revived,{type:'chooseRestBp',uid:null});
 assert.equal(revived.pending,null);
 const quiet=playGiselle(29204);
 grantContinuousState(quiet.played,{kind:'originalEffectsDisabled',controller:0,sourceUid:quiet.held.uid,
  targetUid:quiet.held.uid,until:{player:0,phase:'attack',edge:'end'},sourceLinked:false});
 assert.equal(legalUniversalActions(quiet.board.packs,quiet.played).some(a=>a.type==='activate'&&a.uid===quiet.held.uid),false);
 const mirror=[bleach,bleach];
 let life=newUniversalMatch(mirror,{decks:[deck,deck],seed:29205,first:0});
 for(let n=0;n<8&&life.phase!=='attack';n++)life=dispatchUniversalAction(mirror,life,{type:'next'});
 const attacker=put(life,0,'BLC-1-018','front',0,true);
 const revealed=take(life,1,'BLC-2-009');
 life.players[1].deck.push(...life.players[1].life.splice(0));
 life.players[1].life.push(revealed);
 const handBefore=life.players[1].hand.length;
 life=dispatchUniversalAction(mirror,life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(mirror,life,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(life.pending.kind,'life-trigger');
 assert.equal(life.pending.trigger,'get');
 life=dispatchUniversalAction(mirror,life,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.equal(life.players[1].hand.some(c=>c.uid===revealed.uid),true);
 assert.equal(life.players[1].hand.length,handBefore+1);
 assert.equal(life.triggerActivated[1],true);
 assert.equal(assertUniversalMatch(short.packs,shortPlayed),true);
 assert.equal(assertUniversalMatch(opened.packs,played),true);
 assert.equal(assertUniversalMatch(used.board.packs,revived),true);
 assert.equal(assertUniversalMatch(quiet.board.packs,quiet.played),true);
 assert.equal(assertUniversalMatch(mirror,life),true);
});

test('BLC-2-013 protects one field Ichigo after a blue Ichigo puts her outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-013');
 assert.equal(printed.number,'EX07BT/BLC-2-013');
 assert.equal(printed.nameJa,'井上 織姫');
 assert.equal(printed.effect,'此卡因己方場上藍色〈黑崎一護〉的效果從手牌送至場外時，可選最多 1 個己方場上的〈黑崎一護〉；直到下一個己方回合開始前，使其不會被敵方角色或 Trigger 的效果選為對象。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.trigger,'draw');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-2-013'];
 assert.equal(card.name,'井上 織姫');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.traits.length,0);
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],
  ['blue',2,1,3000,1,'draw','character']);
 assert.equal(card.mainAbility,null);
 assert.deepEqual(card.moveTriggers,[{when:{from:'hand',to:'outside',sourceName:'黒崎 一護',
  sourceColor:'blue',sourceOnField:true,reasons:['payment','own-effect']},
  then:[{op:'grantNamedFieldProtection',name:'黒崎 一護',scope:'characterOrTrigger',
   optional:true,until:'nextOwnStart'}]}]);
 assert.equal(V2_PENDING_LABELS['effect-named-field-protect'],
  '可選最多 1 個己方場上指定名稱角色，直到下一個己方回合開始前不受敵方角色或 Trigger 效果選擇');
 const bare={id:'BAD',name:'井上 織姫',color:'blue',type:'character',energy:2,ap:1,bp:3000,gen:1,
  traits:[],trigger:'draw',implementation:'dsl',effects:{}};
 const when={from:'hand',to:'outside',sourceName:'黒崎 一護',sourceColor:'blue',sourceOnField:true,
  reasons:['payment','own-effect']};
 const grant={op:'grantNamedFieldProtection',name:'黒崎 一護',scope:'characterOrTrigger',
  optional:true,until:'nextOwnStart'};
 assert.throws(()=>createUniversalPack({id:'bad-named-scope',cards:[{...bare,
  moveTriggers:[{when,then:[{...grant,scope:'any'}]}]}]}),/invalid named field protection/);
 assert.throws(()=>createUniversalPack({id:'bad-named-front',cards:[{...bare,
  effects:{onPlay:[grant]}}]}),/named field protection resolves from a moved-card trigger/);
 assert.doesNotThrow(()=>createUniversalPack({id:'ok-named-protect',cards:[{...bare,
  moveTriggers:[{when,then:[grant]}]}]}));
 const deck=realDeck(['BLC-2-013','BLC-2-016','BLC-1-039','BLC-4-030','BLC-2-003','BLC-1-004','BLC-1-030','BLC-2-046','BLC-2-017','BLC-2-018','BLC-4-025'],'blue');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const protect=(s,uid,type)=>effectChoiceProtected(s,1,uid,type);
 function caused(seed){
  const board=main(deck,seed);
  const purple=put(board.s,0,'BLC-1-039','energy',0);
  const yoru=put(board.s,0,'BLC-4-030','front',1,true);
  const orihime=hold(board.s,0,'BLC-2-013');
  const ichigo=hold(board.s,0,'BLC-2-016');
  assert.equal(universalEnergyByColor(board.packs,board.s,0).blue||0,0);
  const played=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:ichigo.uid,line:'front',slot:0});
  assert.equal(played.pending.kind,'effect-discard');
  const discarded=dispatchUniversalAction(board.packs,played,{type:'chooseDiscard',uid:orihime.uid});
  assert.equal(discarded.pending.kind,'effect-named-field-protect');
  assert.equal(universalEnergyByColor(board.packs,discarded,0).blue||0,0);
  assert.equal(discarded.players[0].outside.some(c=>c.uid===orihime.uid),true);
  const moved=discarded.zoneMoveEvents.find(e=>e.uid===orihime.uid&&e.to==='outside');
  assert.equal(moved.sourceName,'黒崎 一護');
  assert.equal(moved.sourceColor,'blue');
  assert.equal(moved.sourceOnField,true);
  assert.equal(moved.reason,'own-effect');
  const legal=legalUniversalActions(board.packs,discarded);
  assert.ok(legal.some(a=>a.type==='chooseNamedFieldProtect'&&a.uid===ichigo.uid));
  assert.ok(legal.some(a=>a.type==='chooseNamedFieldProtect'&&a.uid===purple.uid));
  assert.equal(legal.some(a=>a.uid===yoru.uid),false);
  assert.ok(legal.some(a=>a.type==='chooseNamedFieldProtect'&&a.uid===null));
  aiOk(board.packs,discarded);
  assert.equal(chooseUniversalAiAction(board.packs,discarded,{difficulty:'easy'}).uid,null);
  assert.ok(chooseUniversalAiAction(board.packs,discarded,{difficulty:'hard'}).uid);
  return {board,played:discarded,ichigo,purple,yoru,orihime};
 }
 const declined=caused(29311);
 const skipped=dispatchUniversalAction(declined.board.packs,declined.played,
  {type:'chooseNamedFieldProtect',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'),false);
 const energyGrant=caused(29312);
 const grantedEnergy=dispatchUniversalAction(energyGrant.board.packs,energyGrant.played,
  {type:'chooseNamedFieldProtect',uid:energyGrant.purple.uid});
 assert.equal(protect(grantedEnergy,energyGrant.purple.uid,'character'),true);
 assert.equal(protect(grantedEnergy,energyGrant.ichigo.uid,'character'),false);
 assert.equal(grantedEnergy.continuousStates.find(e=>e.kind==='cannotBeChosenByOppEffect').sourceLinked,false);
 const opened=caused(29313);
 let s=dispatchUniversalAction(opened.board.packs,opened.played,
  {type:'chooseNamedFieldProtect',uid:opened.ichigo.uid});
 const packs=opened.board.packs;
 assert.equal(protect(s,opened.ichigo.uid,'character'),true);
 assert.equal(protect(s,opened.ichigo.uid,'trigger'),true);
 assert.equal(protect(s,opened.ichigo.uid,'unknown'),true);
 assert.equal(protect(s,opened.ichigo.uid,'event'),false);
 assert.equal(protect(s,opened.ichigo.uid,'field'),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===opened.orihime.uid),true);
 const special=take(s,1,'BLC-2-046');
 s.players[1].life.unshift(special);
 put(s,1,'BLC-1-004','front',0,true);
 put(s,1,'BLC-2-003','energy',0);
 put(s,1,'BLC-2-003','energy',1);
 const jail=hold(s,1,'BLC-1-030');
 for(let i=0;i<6&&!(s.phase==='attack'&&!s.pending);i++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:opened.yoru.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 const triggerChoices=legalUniversalActions(packs,s).filter(a=>a.mode==='special');
 assert.equal(triggerChoices.some(a=>a.uid===opened.ichigo.uid),false);
 assert.equal(triggerChoices.some(a=>a.uid===opened.yoru.uid),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 const begun=s.turn;
 for(let i=0;i<12&&!(s.active===1&&s.phase==='main'&&!s.pending);i++){
  if(s.pending){
   const a=legalUniversalActions(packs,s)[0];
   s=dispatchUniversalAction(packs,s,a,{actor:s.pending.player});
  }else s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 assert.equal(s.active,1);
 assert.equal(s.phase,'main');
 assert.equal(protect(s,opened.ichigo.uid,'character'),true);
 const activated=dispatchUniversalAction(packs,s,{type:'activate',uid:s.players[1].front[0].uid,mode:'frontOnce'});
 const rest=legalUniversalActions(packs,activated).filter(a=>a.type==='chooseRestBp');
 assert.equal(rest.some(a=>a.uid===opened.ichigo.uid),false);
 assert.equal(rest.some(a=>a.uid===opened.yoru.uid),true);
 s=dispatchUniversalAction(packs,activated,{type:'chooseRestBp',uid:null},{actor:1});
 assert.ok(universalEnergyByColor(packs,s,1).yellow>=2);
 const cast=dispatchUniversalAction(packs,s,{type:'event',uid:jail.uid},{actor:1});
 const eventRest=legalUniversalActions(packs,cast).filter(a=>a.type==='chooseRestBp');
 assert.equal(eventRest.some(a=>a.uid===opened.ichigo.uid),true);
 s=dispatchUniversalAction(packs,cast,{type:'chooseRestBp',uid:opened.ichigo.uid},{actor:1});
 assert.equal(s.players[0].front.find(c=>c?.uid===opened.ichigo.uid).ready,false);
 assert.equal(protect(s,opened.ichigo.uid,'character'),true);
 for(let i=0;i<16&&!(s.active===0&&s.turn>begun&&!s.pending);i++){
  if(s.pending){
   const a=legalUniversalActions(packs,s)[0];
   s=dispatchUniversalAction(packs,s,a,{actor:s.pending.player});
  }else s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 assert.equal(s.active,0);
 assert.equal(protect(s,opened.ichigo.uid,'character'),false);
 function drain(start){
  let cur=start;
  for(let i=0;i<12&&cur.pending;i++){
   assert.notEqual(cur.pending.kind,'effect-named-field-protect');
   const a=legalUniversalActions(packs,cur)[0];
   cur=dispatchUniversalAction(packs,cur,a,{actor:cur.pending.player});
  }
  assert.equal(cur.pending,null);
  assert.equal(cur.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'),false);
  return cur;
 }
 const blueMiss=main(deck,29314);
 put(blueMiss.s,0,'BLC-1-039','energy',0);
 const missedOrihime=hold(blueMiss.s,0,'BLC-2-013');
 const yoruichi=hold(blueMiss.s,0,'BLC-4-030');
 const yoruPlayed=dispatchUniversalAction(blueMiss.packs,blueMiss.s,{type:'play',uid:yoruichi.uid,line:'front',slot:0});
 assert.equal(yoruPlayed.pending.kind,'effect-discard-gate');
 const yoruPaid=dispatchUniversalAction(blueMiss.packs,yoruPlayed,{type:'chooseDiscardGate',uid:missedOrihime.uid});
 const yoruDone=drain(yoruPaid);
 assert.equal(yoruDone.players[0].outside.some(c=>c.uid===missedOrihime.uid),true);
 const yellowMiss=main(deck,29315);
 const bazz=put(yellowMiss.s,0,'BLC-2-003','front',0,true);
 put(yellowMiss.s,1,'BLC-4-030','front',0,true);
 const yellowOrihime=hold(yellowMiss.s,0,'BLC-2-013');
 const bazzPlayed=dispatchUniversalAction(yellowMiss.packs,yellowMiss.s,{type:'activate',uid:bazz.uid,mode:'frontOnce'});
 assert.equal(bazzPlayed.pending.kind,'effect-discard-gate');
 const bazzPaid=dispatchUniversalAction(yellowMiss.packs,bazzPlayed,{type:'chooseDiscardGate',uid:yellowOrihime.uid});
 const bazzDone=drain(bazzPaid);
 assert.equal(bazzDone.players[0].outside.some(c=>c.uid===yellowOrihime.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(blueMiss.packs,yoruDone),true);
 assert.equal(assertUniversalMatch(yellowMiss.packs,bazzDone),true);
 assert.equal(assertUniversalMatch(declined.board.packs,skipped),true);
 assert.equal(assertUniversalMatch(energyGrant.board.packs,grantedEnergy),true);
});

test('BLC-2-030 chooses a Rukia entry AP recovery or the next Rukia AP discount',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-030');
 assert.equal(printed.number,'EX07BT/BLC-2-030');
 assert.equal(printed.nameJa,'朽木 白哉');
 assert.equal(printed.effect,'登場：選一項：①若本回合己方場上曾有〈朽木露琪亞〉登場，可將最多 1 張己方 AP 卡轉為 ACTIVE；②本回合下一張從手牌使用的〈朽木露琪亞〉，AP 消耗減少 1。攻擊時：抽 1 張。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.trigger,'color');
 assert.equal(printed.gen,1);
 const card=bleach.cards['BLC-2-030'];
 assert.equal(card.name,'朽木 白哉');
 assert.deepEqual(card.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onAttack,[{op:'draw',count:1}]);
 assert.equal(card.effects.onPlay[0].op,'chooseOne');
 assert.equal(card.effects.onPlay[0].options[0].then[0].name,'朽木 ルキア');
 assert.deepEqual(card.effects.onPlay[0].options[1].then[0].filter,{name:'朽木 ルキア'});
 const deck=realDeck(['BLC-2-030','BLC-2-031','BLC-2-016','BLC-4-030','BLC-4-026','BLC-1-039','BLC-2-018','BLC-2-017','BLC-2-013','BLC-1-004','BLC-2-046'],'blue');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function readyAp(s,n){
  for(let i=0;i<3;i++){s.players[0].apCards[i].inPlay=i<n;s.players[0].apCards[i].ready=i<n;}
 }
 function fuel(s){
  for(let i=0;i<4;i++)put(s,0,'BLC-2-016','energy',i);
 }
 function playByakuya(seed){
  const board=main(deck,seed);
  fuel(board.s);readyAp(board.s,3);
  const byakuya=hold(board.s,0,'BLC-2-030');
  assert.ok(universalEnergyByColor(board.packs,board.s,0).blue>=4);
  const played=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:byakuya.uid,line:'front',slot:1});
  assert.equal(played.pending.kind,'effect-choice-mode');
  return {board,byakuya,played};
 }
 const missed=playByakuya(29421);
 const noEntry=dispatchUniversalAction(missed.board.packs,missed.played,{type:'chooseEffectMode',mode:'ap'});
 assert.equal(noEntry.pending,null);
 assert.equal(noEntry.players[0].apCards.filter(c=>c.ready).length,1);
 const entered=main(deck,29422);
 fuel(entered.s);readyAp(entered.s,3);
 const rukia=hold(entered.s,0,'BLC-2-031');
 const byakuya=hold(entered.s,0,'BLC-2-030');
 let s=dispatchUniversalAction(entered.packs,entered.s,{type:'play',uid:rukia.uid,line:'front',slot:0});
 s=dispatchUniversalAction(entered.packs,s,{type:'play',uid:byakuya.uid,line:'front',slot:1});
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=dispatchUniversalAction(entered.packs,s,{type:'chooseEffectMode',mode:'ap'});
 assert.equal(s.pending.kind,'effect-recover-ap');
 const rested=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
 s=dispatchUniversalAction(entered.packs,s,{type:'chooseApRecovery',uid:rested.uid});
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,1);
 const discount=playByakuya(29423);
 let cut=dispatchUniversalAction(discount.board.packs,discount.played,{type:'chooseEffectMode',mode:'discount'});
 assert.equal(cut.pending,null);
 assert.equal(cut.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&e.filter.name==='朽木 ルキア'&&!e.consumed),true);
 const other=hold(cut,0,'BLC-4-030');
 const otherPlay=legalUniversalActions(discount.board.packs,cut).find(a=>a.type==='play'&&a.uid===other.uid);
 assert.ok(otherPlay);
 cut=dispatchUniversalAction(discount.board.packs,cut,otherPlay);
 if(cut.pending?.kind==='effect-discard-gate')
  cut=dispatchUniversalAction(discount.board.packs,cut,{type:'chooseDiscardGate',uid:null});
 assert.equal(cut.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&!e.consumed),true);
 const nextRukia=hold(cut,0,'BLC-2-031');
 assert.equal(cut.players[0].apCards.filter(c=>c.ready).length,0);
 const rukiaPlay=legalUniversalActions(discount.board.packs,cut).find(a=>a.type==='play'&&a.uid===nextRukia.uid&&a.line==='front');
 assert.ok(rukiaPlay);
 const yoruLeft=cut.players[0].hand.find(c=>c.cardId==='BLC-4-030');
 if(yoruLeft)assert.equal(legalUniversalActions(discount.board.packs,cut).some(a=>a.type==='play'&&a.uid===yoruLeft.uid),false);
 cut=dispatchUniversalAction(discount.board.packs,cut,rukiaPlay);
 assert.equal(cut.players[0].front.some(c=>c?.uid===nextRukia.uid),true);
 assert.equal(cut.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&!e.consumed),false);
 const attacker=main(deck,29424);
 fuel(attacker.s);readyAp(attacker.s,2);
 const fighter=hold(attacker.s,0,'BLC-2-030');
 let battle=dispatchUniversalAction(attacker.packs,attacker.s,{type:'play',uid:fighter.uid,line:'front',slot:0});
 battle=dispatchUniversalAction(attacker.packs,battle,{type:'chooseEffectMode',mode:'ap'});
 const handBefore=battle.players[0].hand.length;
 for(let i=0;i<20&&!(battle.active===0&&battle.turn>attacker.s.turn&&battle.phase==='attack'&&!battle.pending);i++){
  if(battle.pending){
   const a=legalUniversalActions(attacker.packs,battle)[0];
   battle=dispatchUniversalAction(attacker.packs,battle,a,{actor:battle.pending.player});
  }else battle=dispatchUniversalAction(attacker.packs,battle,{type:'next'});
 }
 assert.equal(battle.players[0].front.find(c=>c?.uid===fighter.uid).ready,true);
 const drawn=battle.players[0].hand.length;
 battle=dispatchUniversalAction(attacker.packs,battle,{type:'attack',uid:fighter.uid});
 assert.equal(battle.players[0].hand.length,drawn+1);
 assert.equal(battle.pending.kind,'block');
 const life=main(deck,29425);
 const bounced=put(life.s,0,'BLC-2-031','front',0,true);
 put(life.s,0,'BLC-2-030','front',1,true);
 const reveal=take(life.s,1,'BLC-2-030');
 life.s.players[1].life.unshift(reveal);
 const striker=put(life.s,0,'BLC-4-030','front',2,true);
 let color=life.s;
 for(let i=0;i<6&&color.phase!=='attack';i++)color=dispatchUniversalAction(life.packs,color,{type:'next'});
 color=dispatchUniversalAction(life.packs,color,{type:'attack',uid:striker.uid});
 color=dispatchUniversalAction(life.packs,color,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(color.pending.trigger,'color');
 const bounces=legalUniversalActions(life.packs,color).filter(a=>a.mode==='colorBounce');
 assert.equal(bounces.some(a=>a.uid===bounced.uid),true);
 assert.equal(bounces.some(a=>a.uid===life.s.players[0].front[1].uid),false);
 color=dispatchUniversalAction(life.packs,color,{type:'chooseTrigger',mode:'colorBounce',uid:bounced.uid},{actor:1});
 assert.equal(color.players[0].hand.some(c=>c.uid===bounced.uid),true);
 assert.equal(assertUniversalMatch(missed.board.packs,noEntry),true);
 assert.equal(assertUniversalMatch(entered.packs,s),true);
 assert.equal(assertUniversalMatch(discount.board.packs,cut),true);
 assert.equal(assertUniversalMatch(attacker.packs,battle),true);
 assert.equal(assertUniversalMatch(life.packs,color),true);
 void handBefore;
});

test('BLC-2-034 rests one front character and locks ACTIVE only while it stays on the front',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-034');
 assert.equal(printed.number,'EX07BT/BLC-2-034');
 assert.equal(printed.nameJa,'朽木 ルキア');
 assert.equal(printed.effect,'Raid〈朽木露琪亞〉：轉為 ACTIVE，可移至前線。登場・位於前線：可選最多 1 個敵方前線角色並轉為 REST；若現在是己方回合，且己方前線有原始 AP 消耗 2 以上角色，則所選角色直到此角色離開前線前均不能轉為 ACTIVE。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.trigger,'raid');
 assert.equal(printed.gen,1);
 assert.equal(printed.ap,1);
 const card=bleach.cards['BLC-2-034'];
 assert.equal(card.name,'朽木 ルキア');
 assert.equal(card.raidName,'朽木 ルキア');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'restOppFrontApLock',optional:true,line:'front',minPrintedAp:2,lockWhile:'sourceOnFront'}]);
 const deck=realDeck(['BLC-2-034','BLC-2-031','BLC-2-030','BLC-2-016','BLC-4-042','BLC-4-030','BLC-4-026','BLC-1-039','BLC-2-018','BLC-2-017','BLC-2-013','BLC-1-004'],'blue');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function readyAp(s,n){
  for(let i=0;i<3;i++){s.players[0].apCards[i].inPlay=i<n;s.players[0].apCards[i].ready=i<n;}
 }
 function fuel(s,p=0,slots=4){
  for(let i=0;i<slots;i++)put(s,p,'BLC-2-016','energy',i);
 }
 const locked=(s,uid)=>s.continuousStates.some(e=>e.kind==='cannotActive'&&e.targetUid===uid&&
  e.whileSourceFront===true&&e.sourceLinked===true&&e.until===null);
 function advance(packs,s,pred){
  for(let i=0;i<40&&!pred(s);i++){
   if(s.pending){
    const a=legalUniversalActions(packs,s)[0];
    s=dispatchUniversalAction(packs,s,a,{actor:s.pending.player});
   }else s=dispatchUniversalAction(packs,s,{type:'next'});
  }
  assert.equal(pred(s),true);
  return s;
 }
 const board=main(deck,29531);
 fuel(board.s);readyAp(board.s,2);
 put(board.s,0,'BLC-2-030','front',0,true);
 const foe=put(board.s,1,'BLC-2-016','front',0,true);
 const rukia=hold(board.s,0,'BLC-2-034');
 let s=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:rukia.uid,line:'front',slot:1});
 assert.equal(s.pending.kind,'effect-rest-ap-lock');
 assert.equal(s.pending.choices.includes(foe.uid),true);
 assert.equal(chooseUniversalAiAction(board.packs,s,{difficulty:'easy'}).uid,null);
 s=dispatchUniversalAction(board.packs,s,{type:'chooseRestApLock',uid:foe.uid});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(locked(s,foe.uid),true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:rukia.uid,
  targetUid:rukia.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(locked(s,foe.uid),true);
 const firstTurn=s.turn;
 s=advance(board.packs,s,x=>x.active===1&&x.phase==='start'&&x.turn>firstTurn);
 assert.equal(s.players[1].front.find(c=>c?.uid===foe.uid).ready,false);
 assert.equal(locked(s,foe.uid),true);
 const opponentTurn=s.turn;
 s=advance(board.packs,s,x=>x.active===0&&x.phase==='main'&&x.turn>opponentTurn);
 const mayuri=hold(s,0,'BLC-4-042');
 const mayuriPlay=legalUniversalActions(board.packs,s).find(a=>a.type==='play'&&a.uid===mayuri.uid&&a.line==='front');
 assert.ok(mayuriPlay);
 s=dispatchUniversalAction(board.packs,s,mayuriPlay);
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=dispatchUniversalAction(board.packs,s,{type:'chooseEffectMode',mode:'field'});
 assert.equal(s.pending.kind,'effect-retire-own-character');
 assert.equal(s.pending.choices.includes(rukia.uid),true);
 s=dispatchUniversalAction(board.packs,s,{type:'chooseOwnCharacterRetire',uid:rukia.uid});
 if(s.pending?.kind==='effect-named-zone-entry')
  s=dispatchUniversalAction(board.packs,s,{type:'chooseNamedZoneDeploy',uid:null});
 assert.equal(s.players[0].front.some(c=>c?.uid===rukia.uid),false);
 assert.equal(locked(s,foe.uid),false);
 assert.equal(s.players[1].front.find(c=>c?.uid===foe.uid).ready,false);
 const leftTurn=s.turn;
 s=advance(board.packs,s,x=>x.active===1&&x.phase==='start'&&x.turn>leftTurn);
 assert.equal(s.players[1].front.find(c=>c?.uid===foe.uid).ready,true);
 const energyPlay=main(deck,29532);
 fuel(energyPlay.s);readyAp(energyPlay.s,2);
 const stayed=put(energyPlay.s,1,'BLC-2-016','front',0,true);
 const energyCard=hold(energyPlay.s,0,'BLC-2-034');
 let energy=dispatchUniversalAction(energyPlay.packs,energyPlay.s,{type:'play',uid:energyCard.uid,line:'energy',slot:0,replaceUid:energyPlay.s.players[0].energy[0].uid});
 assert.equal(energy.pending,null);
 assert.equal(energy.players[1].front[0].ready,true);
 assert.equal(energy.players[1].front[0].uid,stayed.uid);
 const short=main(deck,29533);
 fuel(short.s,0,3);readyAp(short.s,2);
 put(short.s,0,'BLC-2-030','energy',3,true);
 put(short.s,0,'BLC-2-016','front',0,true);
 const shortFoe=put(short.s,1,'BLC-2-016','front',0,true);
 const shortCard=hold(short.s,0,'BLC-2-034');
 let plain=dispatchUniversalAction(short.packs,short.s,{type:'play',uid:shortCard.uid,line:'front',slot:1});
 assert.equal(plain.pending.kind,'effect-rest-ap-lock');
 plain=dispatchUniversalAction(short.packs,plain,{type:'chooseRestApLock',uid:shortFoe.uid});
 assert.equal(plain.players[1].front[0].ready,false);
 assert.equal(locked(plain,shortFoe.uid),false);
 const declined=main(deck,29534);
 fuel(declined.s);readyAp(declined.s,2);
 put(declined.s,0,'BLC-2-030','front',0,true);
 const declineFoe=put(declined.s,1,'BLC-2-016','front',0,true);
 const declineCard=hold(declined.s,0,'BLC-2-034');
 let skip=dispatchUniversalAction(declined.packs,declined.s,{type:'play',uid:declineCard.uid,line:'front',slot:1});
 skip=dispatchUniversalAction(declined.packs,skip,{type:'chooseRestApLock',uid:null});
 assert.equal(skip.players[1].front.find(c=>c?.uid===declineFoe.uid).ready,true);
 assert.equal(locked(skip,declineFoe.uid),false);
 const empty=main(deck,29535);
 fuel(empty.s);readyAp(empty.s,2);
 const emptyCard=hold(empty.s,0,'BLC-2-034');
 const none=dispatchUniversalAction(empty.packs,empty.s,{type:'play',uid:emptyCard.uid,line:'front',slot:0});
 assert.equal(none.pending,null);
 const raided=main(deck,29536);
 put(raided.s,0,'BLC-2-031','energy',0,true);
 for(let i=1;i<4;i++)put(raided.s,0,'BLC-2-016','energy',i);
 readyAp(raided.s,2);
 put(raided.s,0,'BLC-2-030','front',0,true);
 const raidFoe=put(raided.s,1,'BLC-2-016','front',0,true);
 const raider=hold(raided.s,0,'BLC-2-034');
 const raid=legalUniversalActions(raided.packs,raided.s).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.slot===1);
 assert.ok(raid);
 let moved=dispatchUniversalAction(raided.packs,raided.s,raid);
 assert.equal(moved.players[0].front[1].uid,raider.uid);
 assert.equal(moved.players[0].front[1].ready,true);
 assert.equal(moved.pending.kind,'effect-rest-ap-lock');
 moved=dispatchUniversalAction(raided.packs,moved,{type:'chooseRestApLock',uid:raidFoe.uid});
 assert.equal(moved.players[1].front[0].ready,false);
 assert.equal(locked(moved,raidFoe.uid),true);
 function lifeBoard(seed){
  const packs=[bleach,bleach];
  let life=newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
  for(let n=0;n<8&&life.phase!=='attack';n++)life=dispatchUniversalAction(packs,life,{type:'next'});
  const swinger=put(life,0,'BLC-4-030','front',0,true);
  const bystander=put(life,0,'BLC-2-016','front',1,true);
  put(life,1,'BLC-2-031','energy',0,true);
  for(let i=1;i<4;i++)put(life,1,'BLC-2-016','energy',i);
  const revealed=take(life,1,'BLC-2-034');
  life.players[1].deck.push(...life.players[1].life.splice(0));
  life.players[1].life.unshift(revealed);
  life=dispatchUniversalAction(packs,life,{type:'attack',uid:swinger.uid});
  life=dispatchUniversalAction(packs,life,{type:'chooseBlock',uid:null},{actor:1});
  assert.equal(life.pending.kind,'life-trigger');
  return {packs,life,bystander};
 }
 const stayedLife=lifeBoard(29537);
 const stay=legalUniversalActions(stayedLife.packs,stayedLife.life).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.line==='energy');
 assert.ok(stay);
 let stayedMatch=dispatchUniversalAction(stayedLife.packs,stayedLife.life,stay,{actor:1});
 assert.equal(stayedMatch.pending,null);
 assert.equal(stayedMatch.players[0].front.find(c=>c?.uid===stayedLife.bystander.uid).ready,true);
 const movedLife=lifeBoard(29538);
 put(movedLife.life,1,'BLC-2-030','front',0,true);
 const shift=legalUniversalActions(movedLife.packs,movedLife.life).find(a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.line==='front'&&a.slot===1);
 assert.ok(shift);
 let shifted=dispatchUniversalAction(movedLife.packs,movedLife.life,shift,{actor:1});
 assert.equal(shifted.pending.kind,'effect-rest-ap-lock');
 assert.equal(shifted.pending.player,1);
 shifted=dispatchUniversalAction(movedLife.packs,shifted,{type:'chooseRestApLock',uid:movedLife.bystander.uid},{actor:1});
 assert.equal(shifted.players[0].front.find(c=>c?.uid===movedLife.bystander.uid).ready,false);
 assert.equal(locked(shifted,movedLife.bystander.uid),false);
 assert.equal(assertUniversalMatch(board.packs,s),true);
 assert.equal(assertUniversalMatch(energyPlay.packs,energy),true);
 assert.equal(assertUniversalMatch(short.packs,plain),true);
 assert.equal(assertUniversalMatch(declined.packs,skip),true);
 assert.equal(assertUniversalMatch(empty.packs,none),true);
 assert.equal(assertUniversalMatch(raided.packs,moved),true);
 assert.equal(assertUniversalMatch(stayedLife.packs,stayedMatch),true);
 assert.equal(assertUniversalMatch(movedLife.packs,shifted),true);
});

test('BLC-2-035 retires one squad character and looks at the top four',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-035');
 assert.equal(printed.number,'EX07BT/BLC-2-035');
 assert.equal(printed.nameJa,'涅 ネム');
 assert.equal(printed.effect,'主要階段・每回合 1 次：使 1 個己方場上具有「涅骸部隊」特徵的角色退場；成功時查看己方牌堆頂 4 張，可公開其中最多 1 張〈涅繭利〉、〈涅音夢〉或具有「涅骸部隊」特徵的卡並加入手牌，其餘以任意順序放至牌堆底。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.trigger,null);
 assert.equal(printed.gen,2);
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 const card=bleach.cards['BLC-2-035'];
 assert.equal(card.name,'涅 ネム');
 assert.equal(card.gen,2);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'oncePayProgram');
 assert.equal(card.mainAbility.frontOnly,false);
 assert.equal(card.mainAbility.payAp,0);
 assert.equal(card.mainAbility.oncePerTurn,true);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(cardHasTrait(card,'涅骸部隊'),false);
 assert.deepEqual(card.effects,{});
 const follow={kind:'searchTop',count:4,max:1,rest:'bottom',logic:'any',filters:[
  {field:'name',value:'涅 マユリ'},{field:'name',value:'涅 ネム'},{field:'trait',value:'涅骸部隊'}]};
 assert.deepEqual(card.mainAbility.then,[{op:'retireOwnTraitFollow',optional:false,trait:'涅骸部隊',follow}]);
 const deck=realDeck(['BLC-2-035','BLC-2-041','BLC-2-036','BLC-4-040','BLC-2-042','BLC-2-044','BLC-2-016','BLC-2-031','BLC-2-037','BLC-2-043','BLC-2-040'],'blue');
 const board=main(deck,29641);
 put(board.s,0,'BLC-2-016','energy',0);
 const fieldCard=put(board.s,0,'BLC-2-044','energy',1);
 const nem=put(board.s,0,'BLC-2-035','energy',2);
 const energySquad=put(board.s,0,'BLC-2-043','energy',3);
 const frontSquad=put(board.s,0,'BLC-2-041','front',0);
 const mayuri=put(board.s,0,'BLC-2-037','front',1);
 const [named,otherNem,traitHit,miss]=setTop(board.s,0,['BLC-2-036','BLC-4-040','BLC-2-042','BLC-2-031']);
 const anchor=board.s.players[0].deck[4].uid;
 const act=legalUniversalActions(board.packs,board.s).find(a=>a.type==='activate'&&a.uid===nem.uid&&a.mode==='oncePay');
 assert.ok(act);
 let s=dispatchUniversalAction(board.packs,board.s,act);
 assert.equal(s.mainAbilityUsedUids.includes(nem.uid),true);
 assert.equal(s.pending.kind,'effect-retire-own-trait');
 assert.equal(s.pending.optional,false);
 assert.equal(s.pending.choices.includes(frontSquad.uid),true);
 assert.equal(s.pending.choices.includes(energySquad.uid),true);
 assert.equal(s.pending.choices.includes(nem.uid),false);
 assert.equal(s.pending.choices.includes(mayuri.uid),false);
 assert.equal(s.pending.choices.includes(fieldCard.uid),false);
 assert.equal(legalUniversalActions(board.packs,s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(board.packs,s,{type:'chooseOwnTraitRetire',uid:null}),/Action not currently legal/);
 aiOk(board.packs,s);
 s=dispatchUniversalAction(board.packs,s,{type:'chooseOwnTraitRetire',uid:frontSquad.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===frontSquad.uid),true);
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 assert.equal(s.pending.max,1);
 assert.deepEqual(s.pending.filters,follow.filters);
 const windowIds=[named.uid,otherNem.uid,traitHit.uid,miss.uid];
 assert.deepEqual(s.pending.uids,windowIds);
 const look=legalUniversalActions(board.packs,s);
 const pick=uid=>look.some(a=>a.type==='chooseTopFilteredMany'&&a.uid===uid);
 assert.equal(pick(null),true);
 assert.equal(pick(named.uid),true);
 assert.equal(pick(otherNem.uid),true);
 assert.equal(pick(traitHit.uid),true);
 assert.equal(pick(miss.uid),false);
 assert.equal(s.pending.choices.length,3);
 assert.equal(universalPrivateChoices(board.packs,s,1),null);
 const shown=universalPrivateChoices(board.packs,s,0).options.filter(o=>o.card).map(o=>o.card.cardId);
 assert.deepEqual(shown.sort(),['BLC-2-036','BLC-4-040','BLC-2-042'].sort());
 const pub=universalPublicView(board.packs,s,1);
 assert.deepEqual(pub.pending,{kind:'effect-top-filter-many-choice',player:0});
 assert.equal(pub.players[0].hand,null);
 assert.equal(pub.players[0].deck,undefined);
 assert.equal(s.publicReveals.some(r=>windowIds.includes(r.uid)),false);
 aiOk(board.packs,s);
 const declined=orderBottom(board.packs,dispatchUniversalAction(board.packs,s,{type:'chooseTopFilteredMany',uid:null}));
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.some(c=>windowIds.includes(c.uid)),false);
 assert.equal(declined.publicReveals.some(r=>r.kind==='searched-to-hand'),false);
 assert.equal(declined.players[0].deck[0].uid,anchor);
 assert.deepEqual(declined.players[0].deck.slice(-4).map(c=>c.uid).sort(),windowIds.sort());
 let taken=dispatchUniversalAction(board.packs,s,{type:'chooseTopFilteredMany',uid:named.uid});
 assert.equal(taken.publicReveals.at(-1).kind,'searched-to-hand');
 assert.equal(taken.publicReveals.at(-1).cardId,'BLC-2-036');
 assert.equal(taken.publicReveals.filter(r=>windowIds.includes(r.uid)).length,1);
 assert.equal(taken.pending.kind,'effect-top-order');
 assert.equal(universalPrivateChoices(board.packs,taken,1),null);
 assert.ok(universalPrivateChoices(board.packs,taken,0));
 taken=orderBottom(board.packs,taken);
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===named.uid),true);
 assert.equal(taken.players[0].deck[0].uid,anchor);
 assert.deepEqual(taken.players[0].deck.slice(-3).map(c=>c.uid).sort(),[otherNem.uid,traitHit.uid,miss.uid].sort());
 assert.equal(legalUniversalActions(board.packs,taken).some(a=>a.type==='activate'&&a.uid===nem.uid),false);
 const nemB=put(taken,0,'BLC-2-035','front',2);
 const second=legalUniversalActions(board.packs,taken).find(a=>a.type==='activate'&&a.uid===nemB.uid&&a.mode==='oncePay');
 assert.ok(second);
 let again=dispatchUniversalAction(board.packs,taken,second);
 assert.equal(again.pending.kind,'effect-retire-own-trait');
 assert.equal(again.pending.choices.includes(energySquad.uid),true);
 assert.equal(again.pending.choices.includes(nem.uid),false);
 again=dispatchUniversalAction(board.packs,again,{type:'chooseOwnTraitRetire',uid:energySquad.uid});
 if(again.pending?.kind==='effect-top-filter-many-choice')
  again=dispatchUniversalAction(board.packs,again,{type:'chooseTopFilteredMany',uid:null});
 again=orderBottom(board.packs,again);
 assert.equal(again.pending,null);
 assert.equal(again.mainAbilityUsedUids.includes(nemB.uid),true);
 assert.equal(again.players[0].outside.some(c=>c.uid===energySquad.uid),true);
 const quiet=main(deck,29642);
 put(quiet.s,0,'BLC-2-016','energy',0);
 const onlyField=put(quiet.s,0,'BLC-2-044','energy',1);
 const lone=put(quiet.s,0,'BLC-2-035','front',0);
 const namedOnly=put(quiet.s,0,'BLC-2-037','front',1);
 assert.equal(legalUniversalActions(quiet.packs,quiet.s).some(a=>a.type==='activate'&&a.uid===lone.uid),false);
 assert.throws(()=>dispatchUniversalAction(quiet.packs,quiet.s,{type:'activate',uid:lone.uid,mode:'oncePay'}),/Action not currently legal/);
 assert.equal(quiet.s.mainAbilityUsedUids.includes(lone.uid),false);
 assert.equal(onlyField.uid!==namedOnly.uid,true);
 const silenced=main(deck,29643);
 put(silenced.s,0,'BLC-2-016','energy',0);
 const gated=put(silenced.s,0,'BLC-2-035','energy',1);
 put(silenced.s,0,'BLC-2-041','front',0);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:0,sourceUid:gated.uid,
  targetUid:gated.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(silenced.packs,silenced.s).some(a=>a.type==='activate'&&a.uid===gated.uid),false);
 const empty=main(deck,29644);
 put(empty.s,0,'BLC-2-016','energy',0);
 const emptyNem=put(empty.s,0,'BLC-2-035','front',0);
 put(empty.s,0,'BLC-2-041','front',1);
 empty.s.players[0].outside.push(...empty.s.players[0].deck.splice(0));
 let bare=dispatchUniversalAction(empty.packs,empty.s,legalUniversalActions(empty.packs,empty.s).find(a=>a.type==='activate'&&a.uid===emptyNem.uid));
 bare=dispatchUniversalAction(empty.packs,bare,{type:'chooseOwnTraitRetire',uid:empty.s.players[0].front[1].uid});
 assert.equal(bare.pending,null);
 assert.equal(bare.players[0].deck.length,0);
 const missed=main(deck,29645);
 put(missed.s,0,'BLC-2-016','energy',0);
 const missedNem=put(missed.s,0,'BLC-2-035','energy',1);
 put(missed.s,0,'BLC-2-041','front',0);
 setTop(missed.s,0,['BLC-2-031','BLC-2-031','BLC-2-031','BLC-2-031']);
 let none=dispatchUniversalAction(missed.packs,missed.s,legalUniversalActions(missed.packs,missed.s).find(a=>a.type==='activate'&&a.uid===missedNem.uid));
 none=dispatchUniversalAction(missed.packs,none,{type:'chooseOwnTraitRetire',uid:missed.s.players[0].front[0].uid});
 assert.equal(none.pending.kind,'effect-top-order');
 const closed=orderBottom(missed.packs,none);
 assert.equal(closed.pending,null);
 assert.equal(closed.publicReveals.some(r=>r.kind==='searched-to-hand'),false);
 assert.equal(assertUniversalMatch(board.packs,again),true);
 assert.equal(assertUniversalMatch(quiet.packs,quiet.s),true);
 assert.equal(assertUniversalMatch(silenced.packs,silenced.s),true);
 assert.equal(assertUniversalMatch(empty.packs,bare),true);
 assert.equal(assertUniversalMatch(missed.packs,closed),true);
});

test('BLC-2-038 grants Impact to Nem or the squad and REST-plays one from outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-038');
 assert.equal(printed.number,'EX07BT/BLC-2-038');
 assert.equal(printed.nameJa,'涅 マユリ');
 assert.equal(printed.effect,'Raid〈涅繭利〉：轉為 ACTIVE，可移至前線。登場：可使最多 1 個己方場上的〈涅音夢〉或具有「涅骸部隊」特徵的角色，本回合 BP +1000 並獲得 Impact 1。主要階段・位於前線・每回合 1 次：僅在本回合有己方場上角色退場後可發動，從己方場外將 1 張 AP 消耗 1 的藍色〈涅音夢〉或具有「涅骸部隊」特徵的角色卡，以 REST 登場於己方場上。');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.trigger,'raid');
 assert.equal(printed.gen,1);
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 const card=bleach.cards['BLC-2-038'];
 assert.equal(card.name,'涅 マユリ');
 assert.equal(card.raidName,'涅 マユリ');
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.mainAbility.op,'oncePayProgram');
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.payAp,0);
 assert.equal(card.mainAbility.requiresOwnCharacterRetired,true);
 assert.deepEqual(card.traits,['護廷十三隊']);
 assert.equal(cardHasTrait(card,'涅骸部隊'),false);
 assert.equal(cardHasName(card,'涅 ネム'),false);
 assert.deepEqual(card.effects.onPlay,[{op:'buffNameOrTraitImpact',name:'涅 ネム',trait:'涅骸部隊',bp:1000,impact:1,duration:'turn',upTo:1,optional:true}]);
 assert.deepEqual(card.mainAbility.then,[{op:'deployOutsideColorApNameOrTraitRest',color:'blue',ap:1,name:'涅 ネム',trait:'涅骸部隊',optional:false}]);
 const deck=realDeck(['BLC-2-038','BLC-2-041','BLC-2-035','BLC-4-040','BLC-2-043','BLC-2-044','BLC-2-016','BLC-2-036','BLC-2-028','BLC-2-031','BLC-2-034','BLC-4-042','BLC-2-040'],'blue');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const park=(s,id)=>{const c=take(s,0,id);s.players[0].outside.push(c);return c;};
 function fuel(s,slots=4){for(let i=0;i<slots;i++)put(s,0,'BLC-2-016','energy',i);}
 function retireSquad(packs,s,nemUid,squadUid){
  let next=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===nemUid&&a.mode==='oncePay'));
  assert.equal(next.pending.kind,'effect-retire-own-trait');
  next=dispatchUniversalAction(packs,next,{type:'chooseOwnTraitRetire',uid:squadUid});
  if(next.pending?.kind==='effect-top-filter-many-choice')
   next=dispatchUniversalAction(packs,next,{type:'chooseTopFilteredMany',uid:null});
  return orderBottom(packs,next);
 }
 const declined=main(deck,29741);
 put(declined.s,0,'BLC-2-016','energy',0);
 put(declined.s,0,'BLC-2-016','energy',1);
 const energySquad=put(declined.s,0,'BLC-2-041','energy',2);
 const fieldCard=put(declined.s,0,'BLC-2-044','energy',3);
 const dual=put(declined.s,0,'BLC-2-043','front',0);
 const named=put(declined.s,0,'BLC-4-040','front',1);
 const otherMayuri=put(declined.s,0,'BLC-2-036','front',2);
 const handCard=hold(declined.s,0,'BLC-2-038');
 assert.equal(universalEnergyByColor(declined.packs,declined.s,0).blue,4);
 let skip=dispatchUniversalAction(declined.packs,declined.s,{type:'play',uid:handCard.uid,line:'front',slot:3});
 assert.equal(skip.pending.kind,'effect-name-or-trait-impact');
 assert.equal(skip.pending.optional,true);
 assert.equal(V2_PENDING_LABELS[skip.pending.kind],'可選最多 1 個己方場上指定名稱或特徵角色，本回合 BP+1000 並獲得 Impact 1');
 assert.deepEqual(skip.pending.choices.slice().sort(),[energySquad.uid,dual.uid,named.uid].sort());
 assert.equal(skip.pending.choices.includes(handCard.uid),false);
 assert.equal(skip.pending.choices.includes(otherMayuri.uid),false);
 assert.equal(skip.pending.choices.includes(fieldCard.uid),false);
 assert.equal(skip.pending.choices.filter(uid=>uid===dual.uid).length,1);
 aiOk(declined.packs,skip);
 skip=dispatchUniversalAction(declined.packs,skip,{type:'chooseNameOrTraitImpact',uid:null});
 assert.equal(skip.pending,null);
 assert.equal(universalImpact(declined.packs,skip,energySquad),0);
 assert.equal(universalBp(declined.packs,skip,energySquad),2000);
 const granted=main(deck,29742);
 put(granted.s,0,'BLC-2-016','energy',0);
 put(granted.s,0,'BLC-2-016','energy',1);
 const target=put(granted.s,0,'BLC-2-041','energy',2);
 put(granted.s,0,'BLC-2-044','energy',3);
 put(granted.s,0,'BLC-2-043','front',0);
 put(granted.s,0,'BLC-4-040','front',1);
 const actor=hold(granted.s,0,'BLC-2-038');
 let buffed=dispatchUniversalAction(granted.packs,granted.s,{type:'play',uid:actor.uid,line:'front',slot:2});
 assert.equal(buffed.pending.choices.includes(actor.uid),false);
 aiOk(granted.packs,buffed);
 buffed=dispatchUniversalAction(granted.packs,buffed,{type:'chooseNameOrTraitImpact',uid:target.uid});
 assert.equal(buffed.pending,null);
 const boosted=live(buffed,0,target.uid);
 assert.equal(universalBp(granted.packs,buffed,boosted),3000);
 assert.equal(universalImpact(granted.packs,buffed,boosted),1);
 assert.equal(boosted.impactGranted.amount,1);
 assert.equal(boosted.impactGranted.plus,undefined);
 assert.equal(boosted.buffs.some(b=>b.bp===1000&&b.untilTurn===buffed.turn),true);
 grantContinuousState(buffed,{kind:'originalEffectsDisabled',controller:0,sourceUid:actor.uid,
  targetUid:actor.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalImpact(granted.packs,buffed,live(buffed,0,target.uid)),1);
 const quiet=main(deck,29743);
 fuel(quiet.s,3);
 put(quiet.s,0,'BLC-2-044','energy',3);
 put(quiet.s,0,'BLC-2-036','front',0);
 const bare=hold(quiet.s,0,'BLC-2-038');
 const none=dispatchUniversalAction(quiet.packs,quiet.s,{type:'play',uid:bare.uid,line:'front',slot:1});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].front[1].uid,bare.uid);
 assert.equal(none.players[0].front[1].ready,false);
 const gate=main(deck,29744);
 const mayuri=put(gate.s,0,'BLC-2-038','front',0);
 const nem=put(gate.s,0,'BLC-2-035','front',1);
 const squad=put(gate.s,0,'BLC-2-041','front',2);
 const outsideNem=park(gate.s,'BLC-2-035');
 const apTwo=park(gate.s,'BLC-2-028');
 const outsideField=park(gate.s,'BLC-2-044');
 const vanilla=park(gate.s,'BLC-2-036');
 const raider=park(gate.s,'BLC-2-034');
 assert.equal(bleach.cards['BLC-2-034'].raidName,'朽木 ルキア');
 assert.equal(universalEnergyByColor(gate.packs,gate.s,0).blue||0,0);
 assert.equal(legalUniversalActions(gate.packs,gate.s).some(a=>a.type==='activate'&&a.uid===mayuri.uid),false);
 assert.throws(()=>dispatchUniversalAction(gate.packs,gate.s,{type:'activate',uid:mayuri.uid,mode:'oncePay'}),/Action not currently legal/);
 let opened=retireSquad(gate.packs,gate.s,nem.uid,squad.uid);
 assert.equal(opened.players[0].outside.some(c=>c.uid===squad.uid),true);
 assert.equal(opened.mainAbilityUsedUids.includes(mayuri.uid),false);
 const act=legalUniversalActions(gate.packs,opened).find(a=>a.type==='activate'&&a.uid===mayuri.uid&&a.mode==='oncePay');
 assert.ok(act);
 opened=dispatchUniversalAction(gate.packs,opened,act);
 assert.equal(opened.pending.kind,'effect-outside-color-ap-rest');
 assert.equal(opened.pending.optional,false);
 assert.equal(V2_PENDING_LABELS[opened.pending.kind],'從場外將 1 張指定顏色、AP、名稱或特徵的角色以 REST 登場');
 assert.equal(opened.mainAbilityUsedUids.includes(mayuri.uid),true);
 assert.equal(legalUniversalActions(gate.packs,opened).some(a=>a.uid===null),false);
 assert.equal(opened.pending.choices.includes(outsideNem.uid),true);
 assert.equal(opened.pending.choices.includes(squad.uid),true);
 assert.equal(opened.pending.choices.includes(apTwo.uid),false);
 assert.equal(opened.pending.choices.includes(outsideField.uid),false);
 assert.equal(opened.pending.choices.includes(vanilla.uid),false);
 assert.equal(opened.pending.choices.includes(raider.uid),false);
 assert.throws(()=>dispatchUniversalAction(gate.packs,opened,{type:'chooseOutsideColorApRest',uid:null}),/Action not currently legal/);
 aiOk(gate.packs,opened);
 assert.equal(universalEnergyByColor(gate.packs,opened,0).blue||0,0);
 const dest=legalUniversalActions(gate.packs,opened).find(a=>a.type==='chooseOutsideColorApRest'&&a.uid===outsideNem.uid&&a.line==='energy'&&!a.replaceUid);
 assert.ok(dest);
 opened=dispatchUniversalAction(gate.packs,opened,dest);
 assert.equal(opened.pending,null);
 const entered=opened.players[0].energy.find(c=>c?.uid===outsideNem.uid);
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.equal(bleach.cards[entered.cardId].energy,3);
 const copy=put(opened,0,'BLC-2-038','front',3);
 assert.equal(legalUniversalActions(gate.packs,opened).some(a=>a.type==='activate'&&a.uid===mayuri.uid),false);
 assert.ok(legalUniversalActions(gate.packs,opened).some(a=>a.type==='activate'&&a.uid===copy.uid&&a.mode==='oncePay'));
 const lined=main(deck,29745);
 const energyCopy=put(lined.s,0,'BLC-2-038','energy',0);
 const lineNem=put(lined.s,0,'BLC-2-035','front',0);
 const lineSquad=put(lined.s,0,'BLC-2-041','front',1);
 park(lined.s,'BLC-2-035');
 let linedState=retireSquad(lined.packs,lined.s,lineNem.uid,lineSquad.uid);
 assert.equal(legalUniversalActions(lined.packs,linedState).some(a=>a.type==='activate'&&a.uid===energyCopy.uid),false);
 assert.throws(()=>dispatchUniversalAction(lined.packs,linedState,{type:'activate',uid:energyCopy.uid,mode:'oncePay'}),/Action not currently legal/);
 const silenced=main(deck,29746);
 const gated=put(silenced.s,0,'BLC-2-038','front',0);
 const silentNem=put(silenced.s,0,'BLC-2-035','front',1);
 const silentSquad=put(silenced.s,0,'BLC-2-041','front',2);
 park(silenced.s,'BLC-2-041');
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:0,sourceUid:gated.uid,
  targetUid:gated.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 let silent=retireSquad(silenced.packs,silenced.s,silentNem.uid,silentSquad.uid);
 assert.equal(legalUniversalActions(silenced.packs,silent).some(a=>a.type==='activate'&&a.uid===gated.uid),false);
 assert.equal(silent.mainAbilityUsedUids.includes(gated.uid),false);
 const emptyOutside=main(deck,29747);
 const waiting=put(emptyOutside.s,0,'BLC-2-038','front',0);
 const emptyNem=put(emptyOutside.s,0,'BLC-2-035','front',1);
 const emptySquad=put(emptyOutside.s,0,'BLC-2-041','front',2);
 let hidden=retireSquad(emptyOutside.packs,emptyOutside.s,emptyNem.uid,emptySquad.uid);
 const retiredIndex=hidden.players[0].outside.findIndex(c=>c.uid===emptySquad.uid);
 assert.ok(retiredIndex>=0);
 hidden.players[0].removed.push(hidden.players[0].outside.splice(retiredIndex,1)[0]);
 assert.equal(legalUniversalActions(emptyOutside.packs,hidden).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);
 assert.throws(()=>dispatchUniversalAction(emptyOutside.packs,hidden,{type:'activate',uid:waiting.uid,mode:'oncePay'}),/Action not currently legal/);
 assert.equal(hidden.mainAbilityUsedUids.includes(waiting.uid),false);
 hidden.players[0].outside.push(hidden.players[0].removed.pop());
 assert.ok(legalUniversalActions(emptyOutside.packs,hidden).some(a=>a.type==='activate'&&a.uid===waiting.uid&&a.mode==='oncePay'));
 assert.equal(assertUniversalMatch(declined.packs,skip),true);
 assert.equal(assertUniversalMatch(granted.packs,buffed),true);
 assert.equal(assertUniversalMatch(quiet.packs,none),true);
 assert.equal(assertUniversalMatch(gate.packs,opened),true);
 assert.equal(assertUniversalMatch(lined.packs,linedState),true);
 assert.equal(assertUniversalMatch(silenced.packs,silent),true);
 assert.equal(assertUniversalMatch(emptyOutside.packs,hidden),true);
});

test('BLC-2-057 removes any number of hand Zero Squad cards and raises the retire cap',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-057');
 assert.equal(printed.number,'EX07BT/BLC-2-057');
 assert.equal(printed.nameJa,'修多羅 千手丸');
 assert.equal(printed.effect,'Raid〈修多羅千手丸〉：轉為 ACTIVE，可移至前線。登場：將手牌中任意數量具有「零番隊」特徵的卡除外，再可使最多 1 個敵方前線角色退場；BP 上限原為 2500，每以此效果從手牌除外 1 張，上限增加 1000。');
 assert.equal(printed.traits,'零番隊');
 assert.equal(printed.trigger,'raid');
 assert.equal(printed.gen,1);
 assert.equal(printed.energy,4);
 const card=bleach.cards['BLC-2-057'];
 assert.equal(card.name,'修多羅 千手丸');
 assert.equal(card.raidName,'修多羅 千手丸');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,['零番隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'removeHandTraitScaleRetire',trait:'零番隊',baseBp:2500,per:1000}]);
 const deck=realDeck(['BLC-2-057','BLC-2-056','BLC-2-058','BLC-2-059','BLC-1-058','BLC-1-046','BLC-1-041','BLC-1-035','BLC-1-039','BLC-4-052','BLC-2-050','BLC-3-004','BLC-1-108'],'purple');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function fuel(s){for(let i=0;i<4;i++)put(s,0,'BLC-2-056','energy',i);}
 function clearTrait(s){
  const kept=[],moved=[];
  for(const c of s.players[0].hand)
   (cardHasTrait(bleach.cards[c.cardId],'零番隊')?moved:kept).push(c);
  s.players[0].hand=kept;s.players[0].deck.push(...moved);
 }
 function play(board){
  fuel(board.s);
  clearTrait(board.s);
  const actor=hold(board.s,0,'BLC-2-057');
  assert.equal(universalEnergyByColor(board.packs,board.s,0).purple,4);
  const entered=dispatchUniversalAction(board.packs,board.s,{type:'play',uid:actor.uid,line:'front',slot:0});
  return {actor,entered};
 }
 const zero=main(deck,29841);
 const cap=put(zero.s,1,'BLC-1-058','front',0,true);
 const mid=put(zero.s,1,'BLC-1-046','front',1,true);
 const high=put(zero.s,1,'BLC-1-041','front',2,true);
 const aside=put(zero.s,1,'BLC-1-035','energy',0,true);
 assert.equal(universalBp(zero.packs,zero.s,cap),2500);
 assert.equal(universalBp(zero.packs,zero.s,mid),3500);
 assert.equal(universalBp(zero.packs,zero.s,high),4000);
 const opened=play(zero);
 assert.equal(opened.entered.pending.kind,'effect-retire-bp');
 assert.equal(opened.entered.pending.limit,2500);
 assert.equal(opened.entered.pending.optional,true);
 assert.equal(opened.entered.pending.choices.includes(cap.uid),true);
 assert.equal(opened.entered.pending.choices.includes(mid.uid),false);
 assert.equal(opened.entered.pending.choices.includes(high.uid),false);
 assert.equal(opened.entered.pending.choices.includes(aside.uid),false);
 aiOk(zero.packs,opened.entered);
 let declined=dispatchUniversalAction(zero.packs,opened.entered,{type:'chooseRetireBp',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[1].front.some(c=>c?.uid===cap.uid),true);
 const one=main(deck,29842);
 const exact=put(one.s,1,'BLC-1-046','front',0,true);
 const stillHigh=put(one.s,1,'BLC-1-041','front',1,true);
 put(one.s,1,'BLC-1-035','energy',0,true);
 fuel(one.s);clearTrait(one.s);
 const squad=hold(one.s,0,'BLC-2-058');
 const otherSquad=hold(one.s,0,'BLC-2-059');
 const plain=hold(one.s,0,'BLC-1-035');
 const actor=hold(one.s,0,'BLC-2-057');
 let scaled=dispatchUniversalAction(one.packs,one.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(scaled.pending.kind,'effect-remove-hand-scale');
 assert.equal(V2_PENDING_LABELS[scaled.pending.kind],'可將任意張手牌中具有指定特徵的卡除外，再依張數提高敵方前線退場的 BP 上限');
 assert.equal(scaled.pending.choices.includes(squad.uid),true);
 assert.equal(scaled.pending.choices.includes(otherSquad.uid),true);
 assert.equal(scaled.pending.choices.includes(plain.uid),false);
 assert.equal(scaled.pending.choices.includes(actor.uid),false);
 assert.equal(one.s.players[0].energy.every(c=>c&&!scaled.pending.choices.includes(c.uid)),true);
 assert.equal(universalPrivateChoices(one.packs,scaled,1),null);
 const pub=universalPublicView(one.packs,scaled,1);
 assert.deepEqual(pub.pending,{kind:'effect-remove-hand-scale',player:0});
 assert.equal(pub.players[0].hand,null);
 aiOk(one.packs,scaled);
 scaled=dispatchUniversalAction(one.packs,scaled,{type:'chooseRemoveHandScale',mode:'pick',uid:squad.uid});
 assert.equal(scaled.pending.selected.length,1);
 assert.equal(legalUniversalActions(one.packs,scaled).some(a=>a.mode==='pick'&&a.uid===squad.uid),false);
 aiOk(one.packs,scaled);
 scaled=dispatchUniversalAction(one.packs,scaled,{type:'chooseRemoveHandScale',mode:'done'});
 assert.equal(scaled.players[0].removed.some(c=>c.uid===squad.uid),true);
 assert.equal(scaled.players[0].hand.some(c=>c.uid===otherSquad.uid),true);
 assert.equal(scaled.pending.kind,'effect-retire-bp');
 assert.equal(scaled.pending.limit,3500);
 assert.equal(scaled.pending.choices.includes(exact.uid),true);
 assert.equal(scaled.pending.choices.includes(stillHigh.uid),false);
 aiOk(one.packs,scaled);
 scaled=dispatchUniversalAction(one.packs,scaled,{type:'chooseRetireBp',uid:null});
 assert.equal(scaled.pending,null);
 assert.equal(scaled.players[1].front.some(c=>c?.uid===exact.uid),true);
 assert.equal(scaled.players[0].removed.some(c=>c.uid===squad.uid),true);
 const two=main(deck,29843);
 const huge=put(two.s,1,'BLC-1-041','front',0,true);
 fuel(two.s);clearTrait(two.s);
 const first=hold(two.s,0,'BLC-2-058');
 const second=hold(two.s,0,'BLC-2-059');
 const closer=hold(two.s,0,'BLC-2-057');
 let raised=dispatchUniversalAction(two.packs,two.s,{type:'play',uid:closer.uid,line:'front',slot:0});
 raised=dispatchUniversalAction(two.packs,raised,{type:'chooseRemoveHandScale',mode:'pick',uid:first.uid});
 raised=dispatchUniversalAction(two.packs,raised,{type:'chooseRemoveHandScale',mode:'pick',uid:second.uid});
 raised=dispatchUniversalAction(two.packs,raised,{type:'chooseRemoveHandScale',mode:'done'});
 assert.equal(raised.pending.limit,4500);
 assert.equal(raised.pending.choices.includes(huge.uid),true);
 raised=dispatchUniversalAction(two.packs,raised,{type:'chooseRetireBp',uid:huge.uid});
 assert.equal(raised.pending,null);
 assert.equal(raised.players[1].front.some(c=>c?.uid===huge.uid),false);
 assert.equal(raised.players[1].outside.some(c=>c.uid===huge.uid),true);
 assert.equal(assertUniversalMatch(zero.packs,declined),true);
 assert.equal(assertUniversalMatch(one.packs,scaled),true);
 assert.equal(assertUniversalMatch(two.packs,raised),true);
});

test('BLC-2-060 looks at four, names required energy on attack, and COLOR-plays from outside',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-060');
 assert.equal(printed.number,'EX07BT/BLC-2-060');
 assert.equal(printed.nameJa,'兵主部 一兵衛');
 assert.equal(printed.effect,'登場：查看己方牌堆頂 4 張，以任意順序放回牌堆頂。攻擊時：指定 1 個需求能源數值，公開己方牌堆頂 1 張；若其需求能源等於指定數值，可將該卡加入手牌，並將 1 張手牌除外；若未加入手牌，將公開的卡放回牌堆頂。');
 assert.equal(printed.traits,'零番隊');
 assert.equal(printed.trigger,'color');
 assert.equal(printed.gen,1);
 assert.equal(printed.energy,4);
 const card=bleach.cards['BLC-2-060'];
 assert.equal(card.name,'兵主部 一兵衛');
 assert.equal(card.gen,1);
 assert.deepEqual(card.traits,['零番隊']);
 assert.deepEqual(card.effects.onPlay,[{op:'inspectTopArrange',count:4,toOutside:false,rest:'top'}]);
 assert.deepEqual(card.effects.onAttack,[{op:'nameEnergyRevealHandRemove'}]);
 assert.deepEqual(card.triggerEffect,{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true});
 const deck=realDeck(['BLC-2-060','BLC-2-056','BLC-1-039','BLC-1-037','BLC-1-046','BLC-1-038','BLC-1-108','BLC-1-042','BLC-1-056','BLC-4-052','BLC-3-004','BLC-1-035','BLC-1-041'],'purple');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function fuel(s){for(let i=0;i<4;i++)put(s,0,'BLC-2-056','energy',i);}
 function order(packs,s,uids){
  for(const uid of uids){
   s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
  }
  return s;
 }
 const looked=main(deck,29851);
 fuel(looked.s);
 const window=setTop(looked.s,0,['BLC-1-042','BLC-1-056','BLC-1-037','BLC-1-046']);
 const actor=hold(looked.s,0,'BLC-2-060');
 assert.equal(universalEnergyByColor(looked.packs,looked.s,0).purple,4);
 let arranged=dispatchUniversalAction(looked.packs,looked.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(arranged.pending.kind,'effect-top-order');
 assert.equal(arranged.pending.rest,'top');
 assert.deepEqual(arranged.pending.uids,window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(looked.packs,arranged,1),null);
 assert.ok(universalPrivateChoices(looked.packs,arranged,0));
 assert.deepEqual(universalPublicView(looked.packs,arranged,1).pending,{kind:'effect-top-order',player:0});
 assert.equal(V2_PENDING_LABELS[arranged.pending.kind],'排列牌庫頂或底');
 aiOk(looked.packs,arranged);
 arranged=order(looked.packs,arranged,[...window].reverse().map(c=>c.uid));
 assert.equal(arranged.pending,null);
 assert.deepEqual(arranged.players[0].deck.slice(0,4).map(c=>c.uid),[...window].reverse().map(c=>c.uid));
 assert.equal(arranged.players[0].front[0].uid,actor.uid);
 const energyLook=main(deck,29852);
 put(energyLook.s,0,'BLC-1-035','energy',0);
 put(energyLook.s,0,'BLC-1-035','energy',1);
 setTop(energyLook.s,0,['BLC-1-042','BLC-1-056']);
 energyLook.s.players[0].removed.push(...energyLook.s.players[0].deck.splice(2));
 const lined=hold(energyLook.s,0,'BLC-2-060');
 assert.equal(universalEnergyByColor(energyLook.packs,energyLook.s,0).purple,4);
 let short=dispatchUniversalAction(energyLook.packs,energyLook.s,{type:'play',uid:lined.uid,line:'energy',slot:2});
 assert.equal(short.pending.kind,'effect-top-order');
 assert.equal(short.pending.uids.length,2);
 const bare=main(deck,29853);
 fuel(bare.s);
 bare.s.players[0].removed.push(...bare.s.players[0].deck.splice(0));
 const quiet=hold(bare.s,0,'BLC-2-060');
 const none=dispatchUniversalAction(bare.packs,bare.s,{type:'play',uid:quiet.uid,line:'front',slot:0});
 assert.equal(none.pending,null);
 const attack=main(deck,29854);
 const fighter=put(attack.s,0,'BLC-2-060','front',0);
 put(attack.s,1,'BLC-1-042','front',0,true);
 attack.s=dispatchUniversalAction(attack.packs,attack.s,{type:'next'});
 assert.equal(attack.s.phase,'attack');
 const shown=setTop(attack.s,0,['BLC-1-039'])[0];
 const kept=hold(attack.s,0,'BLC-1-056');
 let named=dispatchUniversalAction(attack.packs,attack.s,{type:'attack',uid:fighter.uid});
 assert.equal(named.pending.kind,'effect-name-energy-reveal');
 assert.equal(named.pending.min,0);
 assert.equal(named.pending.max,30);
 assert.equal(V2_PENDING_LABELS[named.pending.kind],'指定 1 個需求能源數值，再公開牌堆頂');
 assert.equal(legalUniversalActions(attack.packs,named).some(a=>a.value===0),true);
 assert.equal(legalUniversalActions(attack.packs,named).some(a=>a.value===30),true);
 assert.equal(legalUniversalActions(attack.packs,named).some(a=>a.value===31),false);
 assert.equal(universalPrivateChoices(attack.packs,named,0),null);
 assert.equal(universalPrivateChoices(attack.packs,named,1),null);
 aiOk(attack.packs,named);
 assert.throws(()=>dispatchUniversalAction(attack.packs,named,{type:'chooseNamedRequiredEnergy',value:31}),/Action not currently legal/);
 let missed=dispatchUniversalAction(attack.packs,named,{type:'chooseNamedRequiredEnergy',value:4});
 assert.equal(missed.players[0].deck[0].uid,shown.uid);
 assert.equal(missed.players[0].hand.some(c=>c.uid===shown.uid),false);
 assert.equal(missed.publicReveals.some(r=>r.uid===shown.uid&&r.kind==='revealed-window'),true);
 assert.equal(missed.pending.kind,'block');
 const matched=main(deck,29855);
 const ready=put(matched.s,0,'BLC-2-060','front',0);
 put(matched.s,1,'BLC-1-042','front',0,true);
 matched.s=dispatchUniversalAction(matched.packs,matched.s,{type:'next'});
 const top=setTop(matched.s,0,['BLC-1-037'])[0];
 const other=hold(matched.s,0,'BLC-1-056');
 let hit=dispatchUniversalAction(matched.packs,matched.s,{type:'attack',uid:ready.uid});
 aiOk(matched.packs,hit);
 hit=dispatchUniversalAction(matched.packs,hit,{type:'chooseNamedRequiredEnergy',value:2});
 assert.equal(hit.pending.kind,'effect-revealed-energy-hand');
 assert.equal(hit.pending.energy,2);
 assert.equal(hit.pending.uid,top.uid);
 assert.equal(V2_PENDING_LABELS[hit.pending.kind],'需求能源相符時，可將公開的卡加入手牌');
 aiOk(matched.packs,hit);
 let declined=dispatchUniversalAction(matched.packs,hit,{type:'chooseRevealedEnergyHand',mode:'top'});
 assert.equal(declined.players[0].deck[0].uid,top.uid);
 assert.equal(declined.players[0].hand.some(c=>c.uid===other.uid),true);
 assert.equal(declined.pending.kind,'block');
 const taken=main(deck,29856);
 const striker=put(taken.s,0,'BLC-2-060','front',0);
 put(taken.s,1,'BLC-1-046','front',0,true);
 taken.s=dispatchUniversalAction(taken.packs,taken.s,{type:'next'});
 const added=setTop(taken.s,0,['BLC-1-039'])[0];
 const spare=hold(taken.s,0,'BLC-1-056');
 const aside=put(taken.s,0,'BLC-1-042','energy',0);
 let grabbed=dispatchUniversalAction(taken.packs,taken.s,{type:'attack',uid:striker.uid});
 grabbed=dispatchUniversalAction(taken.packs,grabbed,{type:'chooseNamedRequiredEnergy',value:0});
 grabbed=dispatchUniversalAction(taken.packs,grabbed,{type:'chooseRevealedEnergyHand',mode:'hand'});
 assert.equal(grabbed.pending.kind,'effect-mandatory-hand-remove');
 assert.equal(V2_PENDING_LABELS[grabbed.pending.kind],'將 1 張手牌除外');
 assert.equal(grabbed.pending.choices.includes(added.uid),true);
 assert.equal(grabbed.pending.choices.includes(spare.uid),true);
 assert.equal(grabbed.pending.choices.includes(striker.uid),false);
 assert.equal(grabbed.pending.choices.includes(aside.uid),false);
 assert.equal(legalUniversalActions(taken.packs,grabbed).some(a=>a.uid===null),false);
 assert.equal(universalPrivateChoices(taken.packs,grabbed,1),null);
 assert.ok(universalPrivateChoices(taken.packs,grabbed,0));
 aiOk(taken.packs,grabbed);
 assert.throws(()=>dispatchUniversalAction(taken.packs,grabbed,{type:'chooseMandatoryHandRemove',uid:null}),/Action not currently legal/);
 let removedOther=dispatchUniversalAction(taken.packs,grabbed,{type:'chooseMandatoryHandRemove',uid:spare.uid});
 assert.equal(removedOther.players[0].hand.some(c=>c.uid===added.uid),true);
 assert.equal(removedOther.players[0].removed.some(c=>c.uid===spare.uid),true);
 assert.equal(removedOther.pending.kind,'block');
 const selfRemove=main(deck,29857);
 const second=put(selfRemove.s,0,'BLC-2-060','front',0);
 selfRemove.s=dispatchUniversalAction(selfRemove.packs,selfRemove.s,{type:'next'});
 const own=setTop(selfRemove.s,0,['BLC-1-042'])[0];
 let only=dispatchUniversalAction(selfRemove.packs,selfRemove.s,{type:'attack',uid:second.uid});
 only=dispatchUniversalAction(selfRemove.packs,only,{type:'chooseNamedRequiredEnergy',value:0});
 only=dispatchUniversalAction(selfRemove.packs,only,{type:'chooseRevealedEnergyHand',mode:'hand'});
 only=dispatchUniversalAction(selfRemove.packs,only,{type:'chooseMandatoryHandRemove',uid:own.uid});
 assert.equal(only.players[0].removed.some(c=>c.uid===own.uid),true);
 assert.equal(only.players[0].hand.some(c=>c.uid===own.uid),false);
 assert.equal(only.pending.kind,'block');
 const empty=main(deck,29858);
 const waiting=put(empty.s,0,'BLC-2-060','front',0);
 empty.s=dispatchUniversalAction(empty.packs,empty.s,{type:'next'});
 empty.s.players[0].removed.push(...empty.s.players[0].deck.splice(0));
 let blank=dispatchUniversalAction(empty.packs,empty.s,{type:'attack',uid:waiting.uid});
 assert.equal(blank.pending.kind,'block');
 const silenced=main(deck,29859);
 const quietFighter=put(silenced.s,0,'BLC-2-060','front',0);
 silenced.s=dispatchUniversalAction(silenced.packs,silenced.s,{type:'next'});
 setTop(silenced.s,0,['BLC-1-039']);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:0,sourceUid:quietFighter.uid,
  targetUid:quietFighter.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 let mute=dispatchUniversalAction(silenced.packs,silenced.s,{type:'attack',uid:quietFighter.uid});
 assert.equal(mute.pending.kind,'block');
 const energyLine=main(deck,29860);
 const parked=put(energyLine.s,0,'BLC-2-060','energy',0);
 energyLine.s=dispatchUniversalAction(energyLine.packs,energyLine.s,{type:'next'});
 assert.equal(legalUniversalActions(energyLine.packs,energyLine.s).some(a=>a.type==='attack'&&a.uid===parked.uid),false);
 const color=main(deck,29861);
 const vanilla=put(color.s,0,'BLC-2-056','front',0);
 color.s=dispatchUniversalAction(color.packs,color.s,{type:'next'});
 const life=take(color.s,1,'BLC-2-060');
 color.s.players[1].deck.push(...color.s.players[1].life.splice(0));
 color.s.players[1].life.push(life);
 const legalOutside=take(color.s,1,'BLC-1-039');
 const exact=take(color.s,1,'BLC-1-037');
 const costly=take(color.s,1,'BLC-1-046');
 const apTwo=take(color.s,1,'BLC-1-038');
 const field=take(color.s,1,'BLC-1-108');
 color.s.players[1].outside.push(legalOutside,exact,costly,apTwo,field);
 let revealed=dispatchUniversalAction(color.packs,color.s,{type:'attack',uid:vanilla.uid});
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null});
 assert.equal(revealed.pending.kind,'life-trigger');
 assert.equal(revealed.pending.trigger,'color');
 const modes=legalUniversalActions(color.packs,revealed).filter(a=>a.type==='chooseTrigger');
 assert.equal(modes.some(a=>a.mode==='colorOutside'&&a.uid===legalOutside.uid&&a.line==='front'),true);
 assert.equal(modes.some(a=>a.mode==='colorOutside'&&a.uid===exact.uid&&a.line==='front'),true);
 assert.equal(modes.some(a=>a.uid===costly.uid),false);
 assert.equal(modes.some(a=>a.uid===apTwo.uid),false);
 assert.equal(modes.some(a=>a.uid===field.uid),false);
 assert.equal(modes.some(a=>a.mode==='colorOutside'&&a.line!=='front'),false);
 aiOk(color.packs,revealed);
 const dest=modes.find(a=>a.mode==='colorOutside'&&a.uid===legalOutside.uid&&a.slot===0&&!a.replaceUid);
 assert.ok(dest);
 revealed=dispatchUniversalAction(color.packs,revealed,dest);
 const entered=revealed.players[1].front.find(c=>c?.uid===legalOutside.uid);
 assert.ok(entered);
 assert.equal(entered.ready,true);
 assert.equal(revealed.players[1].outside.some(c=>c.uid===legalOutside.uid),false);
 assert.equal(assertUniversalMatch(looked.packs,arranged),true);
 assert.equal(assertUniversalMatch(energyLook.packs,short),true);
 assert.equal(assertUniversalMatch(bare.packs,none),true);
 assert.equal(assertUniversalMatch(attack.packs,missed),true);
 assert.equal(assertUniversalMatch(matched.packs,declined),true);
 assert.equal(assertUniversalMatch(taken.packs,removedOther),true);
 assert.equal(assertUniversalMatch(selfRemove.packs,only),true);
 assert.equal(assertUniversalMatch(empty.packs,blank),true);
 assert.equal(assertUniversalMatch(silenced.packs,mute),true);
 assert.equal(assertUniversalMatch(energyLine.packs,energyLine.s),true);
 assert.equal(assertUniversalMatch(color.packs,revealed),true);
});

test('BLC-2-061 removes up to three hand Zero Squad cards, retires, then draws',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-061');
 assert.equal(printed.number,'EX07BT/BLC-2-061');
 assert.equal(printed.nameJa,'娑闥迦羅骸刺絡辻');
 assert.equal(printed.effect,'可將手牌中最多 3 張具有「零番隊」特徵的卡除外，再使 1 個敵方前線角色退場；BP 上限原為 3000，每以此效果從手牌除外 1 張，上限增加 1000。之後，每以此效果從手牌除外 1 張，抽 1 張。');
 assert.equal(printed.traits,'無');
 assert.equal(printed.trigger,'special');
 assert.equal(printed.gen,0);
 assert.equal(printed.type,'event');
 const card=bleach.cards['BLC-2-061'];
 assert.equal(card.name,'娑闥迦羅骸刺絡辻');
 assert.equal(card.gen,0);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'removeHandTraitCapScale',trait:'零番隊',max:3,baseBp:3000,per:1000,draw:true}]);
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 const deck=realDeck(['BLC-2-061','BLC-2-056','BLC-2-058','BLC-2-059','BLC-1-056','BLC-1-058','BLC-1-046','BLC-1-041','BLC-1-035','BLC-1-039','BLC-1-042','BLC-4-052','BLC-3-004'],'purple');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function fuel(s){for(let i=0;i<4;i++)put(s,0,'BLC-2-056','energy',i);}
 function strip(s){
  const kept=[],moved=[];
  for(const c of s.players[0].hand)
   (cardHasTrait(bleach.cards[c.cardId],'零番隊')?moved:kept).push(c);
  s.players[0].hand=kept;s.players[0].deck.push(...moved);
 }
 const zero=main(deck,29871);
 const low=put(zero.s,1,'BLC-1-058','front',0,true);
 const mid=put(zero.s,1,'BLC-1-046','front',1,true);
 const high=put(zero.s,1,'BLC-1-041','front',2,true);
 const aside=put(zero.s,1,'BLC-1-035','energy',0,true);
 assert.equal(universalBp(zero.packs,zero.s,low),2500);
 assert.equal(universalBp(zero.packs,zero.s,mid),3500);
 assert.equal(universalBp(zero.packs,zero.s,high),4000);
 fuel(zero.s);strip(zero.s);
 const event=hold(zero.s,0,'BLC-2-061');
 const plain=hold(zero.s,0,'BLC-1-035');
 assert.equal(legalUniversalActions(zero.packs,zero.s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 let opened=dispatchUniversalAction(zero.packs,zero.s,{type:'event',uid:event.uid});
 assert.equal(opened.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(opened.pending.kind,'effect-retire-bp');
 assert.equal(opened.pending.limit,3000);
 assert.equal(opened.pending.optional,undefined);
 assert.equal(opened.pending.choices.includes(low.uid),true);
 assert.equal(opened.pending.choices.includes(mid.uid),false);
 assert.equal(opened.pending.choices.includes(high.uid),false);
 assert.equal(opened.pending.choices.includes(aside.uid),false);
 assert.equal(legalUniversalActions(zero.packs,opened).some(a=>a.uid===null),false);
 const before=opened.players[0].deck.length;
 aiOk(zero.packs,opened);
 assert.throws(()=>dispatchUniversalAction(zero.packs,opened,{type:'chooseRetireBp',uid:null}),/Action not currently legal/);
 opened=dispatchUniversalAction(zero.packs,opened,{type:'chooseRetireBp',uid:low.uid});
 assert.equal(opened.pending,null);
 assert.equal(opened.players[1].front.some(c=>c?.uid===low.uid),false);
 assert.equal(opened.players[0].deck.length,before);
 assert.equal(opened.players[0].hand.some(c=>c.uid===plain.uid),true);
 const one=main(deck,29872);
 const exact=put(one.s,1,'BLC-1-046','front',0,true);
 const top=put(one.s,1,'BLC-1-041','front',1,true);
 const small=put(one.s,1,'BLC-1-058','front',2,true);
 put(one.s,1,'BLC-1-035','energy',0,true);
 put(one.s,0,'BLC-1-035','energy',0);
 put(one.s,0,'BLC-2-056','energy',1);
 put(one.s,0,'BLC-2-056','energy',2);
 const lined=put(one.s,0,'BLC-1-056','energy',3);
 strip(one.s);
 const squad=hold(one.s,0,'BLC-2-058');
 const other=hold(one.s,0,'BLC-1-039');
 const actor=hold(one.s,0,'BLC-2-061');
 let scaled=dispatchUniversalAction(one.packs,one.s,{type:'event',uid:actor.uid});
 assert.equal(scaled.pending.kind,'effect-remove-hand-cap');
 assert.equal(scaled.pending.max,3);
 assert.equal(V2_PENDING_LABELS[scaled.pending.kind],'可將手牌中最多 3 張具有指定特徵的卡除外，再依張數提高強制退場的 BP 上限並抽等量牌');
 assert.equal(scaled.pending.choices.includes(squad.uid),true);
 assert.equal(scaled.pending.choices.includes(other.uid),false);
 assert.equal(scaled.pending.choices.includes(actor.uid),false);
 assert.equal(scaled.pending.choices.includes(lined.uid),false);
 assert.equal(universalPrivateChoices(one.packs,scaled,1),null);
 assert.ok(universalPrivateChoices(one.packs,scaled,0));
 aiOk(one.packs,scaled);
 const deckBefore=scaled.players[0].deck.length;
 scaled=dispatchUniversalAction(one.packs,scaled,{type:'chooseRemoveHandCap',mode:'done'});
 assert.equal(scaled.pending.kind,'effect-retire-bp');
 assert.equal(scaled.pending.limit,3000);
 assert.equal(scaled.players[0].hand.some(c=>c.uid===squad.uid),true);
 assert.equal(scaled.pending.choices.includes(small.uid),true);
 assert.equal(scaled.pending.choices.includes(exact.uid),false);
 assert.equal(scaled.pending.choices.includes(top.uid),false);
 scaled=dispatchUniversalAction(one.packs,scaled,{type:'chooseRetireBp',uid:scaled.pending.choices[0]});
 assert.equal(scaled.pending,null);
 assert.equal(scaled.players[0].deck.length,deckBefore);
 const paid=main(deck,29873);
 const legalMid=put(paid.s,1,'BLC-1-046','front',0,true);
 const legalHigh=put(paid.s,1,'BLC-1-041','front',1,true);
 fuel(paid.s);strip(paid.s);
 const removed=hold(paid.s,0,'BLC-2-059');
 const spell=hold(paid.s,0,'BLC-2-061');
 let raised=dispatchUniversalAction(paid.packs,paid.s,{type:'event',uid:spell.uid});
 raised=dispatchUniversalAction(paid.packs,raised,{type:'chooseRemoveHandCap',mode:'pick',uid:removed.uid});
 raised=dispatchUniversalAction(paid.packs,raised,{type:'chooseRemoveHandCap',mode:'done'});
 assert.equal(raised.players[0].removed.some(c=>c.uid===removed.uid),true);
 assert.equal(raised.pending.limit,4000);
 assert.equal(raised.pending.choices.includes(legalMid.uid),true);
 assert.equal(raised.pending.choices.includes(legalHigh.uid),true);
 const drewFrom=raised.players[0].deck.length;
 raised=dispatchUniversalAction(paid.packs,raised,{type:'chooseRetireBp',uid:legalHigh.uid});
 assert.equal(raised.pending,null);
 assert.equal(raised.players[1].front.some(c=>c?.uid===legalHigh.uid),false);
 assert.equal(raised.players[0].deck.length,drewFrom-1);
 const capped=main(deck,29874);
 put(capped.s,1,'BLC-1-041','front',0,true);
 fuel(capped.s);strip(capped.s);
 const first=hold(capped.s,0,'BLC-2-058');
 const second=hold(capped.s,0,'BLC-2-059');
 const third=hold(capped.s,0,'BLC-1-056');
 const fourth=hold(capped.s,0,'BLC-1-058');
 const closer=hold(capped.s,0,'BLC-2-061');
 let full=dispatchUniversalAction(capped.packs,capped.s,{type:'event',uid:closer.uid});
 full=dispatchUniversalAction(capped.packs,full,{type:'chooseRemoveHandCap',mode:'pick',uid:first.uid});
 full=dispatchUniversalAction(capped.packs,full,{type:'chooseRemoveHandCap',mode:'pick',uid:second.uid});
 assert.equal(full.pending.kind,'effect-remove-hand-cap');
 assert.equal(legalUniversalActions(capped.packs,full).some(a=>a.uid===fourth.uid),true);
 assert.equal(legalUniversalActions(capped.packs,full).some(a=>a.uid===first.uid),false);
 const threeFrom=full.players[0].deck.length;
 full=dispatchUniversalAction(capped.packs,full,{type:'chooseRemoveHandCap',mode:'pick',uid:third.uid});
 assert.equal(full.pending.kind,'effect-retire-bp');
 assert.equal(full.pending.limit,6000);
 assert.equal(full.players[0].hand.some(c=>c.uid===fourth.uid),true);
 assert.equal(full.players[0].removed.some(c=>c.uid===first.uid),true);
 assert.equal(full.players[0].removed.some(c=>c.uid===second.uid),true);
 assert.equal(full.players[0].removed.some(c=>c.uid===third.uid),true);
 full=dispatchUniversalAction(capped.packs,full,{type:'chooseRetireBp',uid:full.pending.choices[0]});
 assert.equal(full.pending,null);
 assert.equal(full.players[0].deck.length,threeFrom-3);
 const color=main(deck,29875);
 const vanilla=put(color.s,0,'BLC-2-056','front',0);
 const victim=put(color.s,0,'BLC-1-041','front',1);
 color.s=dispatchUniversalAction(color.packs,color.s,{type:'next'});
 const life=take(color.s,1,'BLC-2-061');
 color.s.players[1].deck.push(...color.s.players[1].life.splice(0));
 color.s.players[1].life.push(life);
 let revealed=dispatchUniversalAction(color.packs,color.s,{type:'attack',uid:vanilla.uid});
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null});
 assert.equal(revealed.pending.kind,'life-trigger');
 assert.equal(revealed.pending.trigger,'special');
 assert.equal(legalUniversalActions(color.packs,revealed).some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===victim.uid),true);
 assert.equal(legalUniversalActions(color.packs,revealed).some(a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===vanilla.uid),true);
 aiOk(color.packs,revealed);
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseTrigger',mode:'special',uid:victim.uid});
 assert.equal(revealed.players[0].front.some(c=>c?.uid===victim.uid),false);
 assert.equal(revealed.players[0].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(assertUniversalMatch(zero.packs,opened),true);
 assert.equal(assertUniversalMatch(one.packs,scaled),true);
 assert.equal(assertUniversalMatch(paid.packs,raised),true);
 assert.equal(assertUniversalMatch(capped.packs,full),true);
 assert.equal(assertUniversalMatch(color.packs,revealed),true);
});

test('BLC-4-057 locks printed text, attack, and block until the next own start',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-057');
 assert.equal(printed.number,'EX15BT/BLC-4-057');
 assert.equal(printed.nameJa,'“真打”『しら筆一文字』');
 assert.equal(printed.effect,'最多選1個對方前線角色，到自己下次回合開始前賦予「失去所有原有效果，且不能攻擊或阻擋」。若自己的場上或除外區有《兵主部一兵衛》，抽2張牌，再將1張手牌除外。失去印刷效果不會取消突襲狀態，也不會清除已得到的限時效果，但會取消持續參照的原有效果，且原本的離場觸發也不再發動。');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.trigger,'special');
 assert.equal(printed.gen,0);
 assert.equal(printed.type,'event');
 const card=bleach.cards['BLC-4-057'];
 assert.equal(card.name,'“真打”『しら筆一文字』');
 assert.equal(card.gen,0);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(card.effects.onPlay,[
  {op:'grantPrintedLock',optional:true,until:'nextOwnTurnStart'},
  {op:'drawRemoveIfName',name:'兵主部 一兵衛',draw:2,zones:['field','removed']}
 ]);
 assert.equal(bleach.cards['BLC-2-024'].ownTurnBp,500);
 assert.deepEqual(bleach.cards['BLC-2-040'].effects.onRetire,[{op:'draw',count:1}]);
 const bare={id:'BLC-4-057',name:card.name,color:'purple',type:'event',energy:4,ap:1,bp:0,gen:0,
  traits:[],trigger:'special',triggerEffect:{op:'retireOppFront'},implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-printed-lock',cards:[{
  ...bare,effects:{onPlay:[{op:'grantPrintedLock',optional:false,until:'nextOwnTurnStart'}]}
 }]}),/invalid printed lock/);
 assert.throws(()=>createUniversalPack({id:'bad-named-draw',cards:[{
  ...bare,effects:{onPlay:[{op:'drawRemoveIfName',name:'兵主部 一兵衛',draw:1,zones:['field','removed']}]}
 }]}),/invalid named draw removal/);
 const four=['BLC-2-056','BLC-2-060','BLC-2-040','BLC-2-024','BLC-1-035','BLC-1-046','BLC-4-052','BLC-3-004','BLC-1-042','BLC-1-039','BLC-1-108'];
 const deck=Object.fromEntries(four.map(id=>[id,4]));
 deck['BLC-1-041']=2;deck['BLC-4-057']=2;deck['BLC-2-061']=2;
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function fuel(s){for(let i=0;i<4;i++)put(s,0,'BLC-2-056','energy',i);}
 function dropTrait(s,p,trait){
  const kept=[],moved=[];
  for(const c of s.players[p].hand)
   (cardHasTrait(bleach.cards[c.cardId],trait)?moved:kept).push(c);
  s.players[p].hand=kept;s.players[p].deck.push(...moved);
 }
 function march(packs,s,player,phase,own){
  for(let n=0;n<80&&!(s.active===player&&s.phase===phase&&s.players[0].ownTurns===own);n++){
   if(s.pending?.kind==='end-hand-limit'){
    const drop=legalUniversalActions(packs,s).find(a=>a.type==='chooseHandLimit');
    s=dispatchUniversalAction(packs,s,drop);continue;
   }
   if(s.pending?.kind==='life-trigger'){
    s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:s.pending.player});continue;
   }
   if(s.pending?.kind==='block'){
    s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});continue;
   }
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step,JSON.stringify(s.pending));
   s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(s.active,player);
  assert.equal(s.phase,phase);
  assert.equal(s.players[0].ownTurns,own);
  return s;
 }
 const board=main(deck,29881);
 fuel(board.s);
 const yoruichi=put(board.s,1,'BLC-2-024','front',0,true);
 const sidelined=put(board.s,1,'BLC-1-046','energy',0,true);
 const room=put(board.s,1,'BLC-1-108','energy',1,true);
 const quiet=take(board.s,1,'BLC-1-035');
 board.s.players[1].life.unshift(quiet);
 const attacker=put(board.s,0,'BLC-1-035','front',0,true);
 const event=hold(board.s,0,'BLC-4-057');
 assert.equal(universalEnergyByColor(board.packs,board.s,0).purple,4);
 assert.equal(legalUniversalActions(board.packs,board.s).some(a=>a.type==='event'&&a.uid===event.uid),true);
 const handAtPlay=board.s.players[0].hand.length;
 let opened=dispatchUniversalAction(board.packs,board.s,{type:'event',uid:event.uid});
 assert.equal(opened.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(opened.pending.kind,'effect-printed-lock');
 assert.equal(opened.pending.optional,true);
 assert.equal(opened.pending.sourceName,'“真打”『しら筆一文字』');
 assert.equal(V2_PENDING_LABELS[opened.pending.kind],'可選 1 個對方前線角色，到自己下次回合開始前失去原有效果且不能攻擊或阻擋');
 assert.deepEqual(opened.pending.choices.map(c=>c.uid),[yoruichi.uid]);
 assert.equal(opened.pending.choices.some(c=>c.uid===sidelined.uid),false);
 assert.equal(opened.pending.choices.some(c=>c.uid===room.uid),false);
 assert.equal(legalUniversalActions(board.packs,opened).some(a=>a.type==='choosePrintedLock'&&a.uid===null),true);
 assert.equal(legalUniversalActions(board.packs,opened).some(a=>a.type==='choosePrintedLock'&&a.uid===yoruichi.uid),true);
 assert.equal(universalPrivateChoices(board.packs,opened,0),null);
 assert.equal(universalPrivateChoices(board.packs,opened,1),null);
 aiOk(board.packs,opened);
 assert.throws(()=>dispatchUniversalAction(board.packs,opened,{type:'choosePrintedLock',uid:sidelined.uid}),/not currently legal/);
 const declined=dispatchUniversalAction(board.packs,structuredClone(opened),{type:'choosePrintedLock',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.continuousStates.length,0);
 assert.equal(declined.players[0].hand.length,handAtPlay-1);
 let locked=dispatchUniversalAction(board.packs,opened,{type:'choosePrintedLock',uid:yoruichi.uid});
 assert.equal(locked.pending,null);
 assert.equal(locked.players[0].hand.length,handAtPlay-1);
 const body=locked.players[1].front.find(c=>c.uid===yoruichi.uid);
 assert.equal(originalEffectsDisabled(locked,body),true);
 assert.deepEqual(fieldRestrictions(locked,1,body).map(r=>r.kind).sort(),
  ['cannotAttack','cannotBlock','originalEffectsDisabled']);
 for(const state of locked.continuousStates)
  assert.deepEqual(state.until,{player:0,phase:'start',edge:'start'});
 assert.equal(universalBp(board.packs,locked,body),3500);
 body.buffs.push({bp:1000,untilTurn:locked.turn});
 assert.equal(universalBp(board.packs,locked,body),4500);
 locked=dispatchUniversalAction(board.packs,locked,{type:'next'});
 assert.equal(locked.phase,'attack');
 let fought=dispatchUniversalAction(board.packs,locked,{type:'attack',uid:attacker.uid});
 assert.equal(fought.pending.kind,'block');
 const blocks=legalUniversalActions(board.packs,fought);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===yoruichi.uid),false);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===null),true);
 fought=dispatchUniversalAction(board.packs,fought,{type:'chooseBlock',uid:null});
 assert.equal(fought.pending,null);
 let hers=march(board.packs,fought,1,'attack',1);
 const silenced=hers.players[1].front.find(c=>c.uid===yoruichi.uid);
 assert.equal(universalBp(board.packs,hers,silenced),3500);
 assert.equal(legalUniversalActions(board.packs,hers).some(a=>a.type==='attack'&&a.uid===yoruichi.uid),false);
 const openedAgain=march(board.packs,hers,0,'start',2);
 assert.equal(openedAgain.continuousStates.some(e=>e.targetUid===yoruichi.uid),false);
 let restored=march(board.packs,openedAgain,1,'attack',2);
 const free=restored.players[1].front.find(c=>c.uid===yoruichi.uid);
 assert.equal(universalBp(board.packs,restored,free),4000);
 assert.equal(legalUniversalActions(board.packs,restored).some(a=>a.type==='attack'&&a.uid===yoruichi.uid),true);
 const named=main(deck,29882);
 for(let i=0;i<3;i++)put(named.s,0,'BLC-2-056','energy',i);
 const ichibe=put(named.s,0,'BLC-2-060','energy',3);
 grantContinuousState(named.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:ichibe.uid,targetUid:ichibe.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(originalEffectsDisabled(named.s,ichibe),true);
 const front=put(named.s,1,'BLC-1-046','front',0,true);
 const brush=hold(named.s,0,'BLC-4-057');
 const namedHand=named.s.players[0].hand.length;
 let asked=dispatchUniversalAction(named.packs,named.s,{type:'event',uid:brush.uid});
 assert.equal(asked.pending.kind,'effect-printed-lock');
 asked=dispatchUniversalAction(named.packs,asked,{type:'choosePrintedLock',uid:null});
 assert.equal(asked.pending.kind,'effect-name-hand-remove');
 assert.equal(asked.pending.name,'兵主部 一兵衛');
 assert.equal(asked.pending.draw,2);
 assert.equal(V2_PENDING_LABELS[asked.pending.kind],'將 1 張手牌除外');
 assert.equal(asked.players[0].hand.length,namedHand-1+2);
 assert.equal(legalUniversalActions(named.packs,asked).some(a=>a.uid===null),false);
 assert.equal(universalPrivateChoices(named.packs,asked,1),null);
 assert.equal(universalPrivateChoices(named.packs,asked,0).options.length,asked.players[0].hand.length);
 aiOk(named.packs,asked);
 assert.throws(()=>dispatchUniversalAction(named.packs,asked,{type:'chooseNameHandRemove',uid:null}),/not currently legal/);
 const removedHand=asked.players[0].hand[0];
 let removed=dispatchUniversalAction(named.packs,asked,{type:'chooseNameHandRemove',uid:removedHand.uid});
 assert.equal(removed.pending,null);
 assert.equal(removed.players[0].hand.length,namedHand-1+1);
 assert.equal(removed.players[0].removed.some(c=>c.uid===removedHand.uid),true);
 assert.equal(removed.players[1].front.some(c=>c?.uid===front.uid),true);
 const stored=main(deck,29883);
 fuel(stored.s);
 const buried=take(stored.s,0,'BLC-2-060');
 stored.s.players[0].removed.push(buried);
 const spell=hold(stored.s,0,'BLC-4-057');
 const storedHand=stored.s.players[0].hand.length;
 let drawn=dispatchUniversalAction(stored.packs,stored.s,{type:'event',uid:spell.uid});
 assert.equal(drawn.pending.kind,'effect-name-hand-remove');
 assert.equal(drawn.players[0].hand.length,storedHand-1+2);
 const absent=main(deck,29884);
 fuel(absent.s);
 const parked=take(absent.s,0,'BLC-2-060');
 absent.s.players[0].outside.push(parked);
 const quietEvent=hold(absent.s,0,'BLC-4-057');
 const absentHand=absent.s.players[0].hand.length;
 let skipped=dispatchUniversalAction(absent.packs,absent.s,{type:'event',uid:quietEvent.uid});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.length,absentHand-1);
 assert.equal(skipped.players[0].removed.some(c=>c.cardId==='BLC-2-060'),false);
 const leave=main(deck,29885);
 fuel(leave.s);
 const witch=put(leave.s,1,'BLC-2-040','front',0,true);
 dropTrait(leave.s,0,'零番隊');
 const closer=hold(leave.s,0,'BLC-4-057');
 let sealed=dispatchUniversalAction(leave.packs,leave.s,{type:'event',uid:closer.uid});
 assert.equal(sealed.pending.kind,'effect-printed-lock');
 sealed=dispatchUniversalAction(leave.packs,sealed,{type:'choosePrintedLock',uid:witch.uid});
 assert.equal(sealed.pending,null);
 const ownerHand=sealed.players[1].hand.length;
 sealed.players[0].apCards[0].ready=true;
 dropTrait(sealed,0,'零番隊');
 const actorHand=sealed.players[0].hand.length;
 const finisher=hold(sealed,0,'BLC-2-061');
 let cut=dispatchUniversalAction(leave.packs,sealed,{type:'event',uid:finisher.uid});
 assert.equal(cut.pending.kind,'effect-retire-bp');
 assert.equal(cut.pending.limit,3000);
 assert.equal(cut.pending.choices.includes(witch.uid),true);
 cut=dispatchUniversalAction(leave.packs,cut,{type:'chooseRetireBp',uid:witch.uid});
 assert.equal(cut.pending,null);
 assert.equal(cut.players[1].front.some(c=>c?.uid===witch.uid),false);
 assert.equal(cut.players[1].outside.some(c=>c.uid===witch.uid),true);
 assert.equal(cut.players[1].hand.length,ownerHand);
 assert.equal(cut.players[0].hand.length,actorHand);
 assert.equal(assertUniversalMatch(board.packs,fought),true);
 assert.equal(assertUniversalMatch(board.packs,hers),true);
 assert.equal(assertUniversalMatch(board.packs,restored),true);
 assert.equal(assertUniversalMatch(named.packs,removed),true);
 assert.equal(assertUniversalMatch(stored.packs,drawn),true);
 assert.equal(assertUniversalMatch(absent.packs,skipped),true);
 assert.equal(assertUniversalMatch(leave.packs,cut),true);
});

test('BLC-4-011 raises another character required energy by 2 on its entry turn',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-011');
 assert.equal(printed.number,'EX15BT/BLC-4-011');
 assert.equal(printed.nameJa,'ユーグラム・ハッシュヴァルト');
 assert.equal(printed.effect,'登場時：抽1張牌，再將1張手牌送至場外。啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動；選自己場上另1個角色，本回合其所需能量增加2。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,'color');
 const card=bleach.cards['BLC-4-011'];
 assert.equal(card.name,printed.nameJa);
 assert.equal(card.gen,2);
 assert.equal(card.energy,3);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.triggerEffect,{op:'restOppFrontSkipNextActive'});
 assert.deepEqual(card.effects.onPlay,[
  {op:'noteEntryTurn'},
  {op:'drawDiscard',count:1,discardCount:1}
 ]);
 assert.deepEqual(card.mainAbility,{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,
  raidOnly:false,payAp:0,requiresOwnName:null,entryTurnOnly:true,
  then:[{op:'grantOtherRequiredEnergyThisTurn',amount:2}]});
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-011');
 assert.equal(entry.definition.gen,2);
 assert.equal(entry.sourceRecord.legacyImportedGen,3);
 assert.equal(entry.sourceRecord.gen,2);
 const bare={id:'X',name:'n',color:'yellow',type:'character',energy:3,ap:1,bp:2500,gen:2,
  traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-required-energy',cards:[{
  ...bare,effects:{onPlay:[{op:'grantOtherRequiredEnergyThisTurn',amount:3}]}
 }]}),/invalid required-energy/);
 assert.throws(()=>createUniversalPack({id:'bad-required-energy-timing',cards:[{
  ...bare,effects:{onPlay:[{op:'grantOtherRequiredEnergyThisTurn',amount:2}]}
 }]}),/only a main ability/);
 const required=['BLC-1-005','BLC-1-018','BLC-1-012','BLC-1-002','BLC-1-028','BLC-1-017'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='yellow'&&c.maxCopies===4&&
  !required.includes(c.id)&&c.id!=='BLC-4-011'&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,6),'BLC-4-011'];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const board=main(deck,29890);
 ['BLC-1-005','BLC-1-018','BLC-1-012'].forEach((id,i)=>put(board.s,0,id,'energy',i,false));
 const target=put(board.s,0,'BLC-1-002','front',1,true);
 const castle=put(board.s,0,'BLC-1-028','energy',3,true);
 assert.equal(universalEnergyByColor(board.packs,board.s,0).yellow,4);
 const spare=hold(board.s,0,'BLC-1-002');
 const jugram=hold(board.s,0,'BLC-4-011');
 const play=legalUniversalActions(board.packs,board.s).find(a=>a.type==='play'&&
  a.uid===jugram.uid&&a.line==='front'&&a.slot===0&&a.replaceUid===undefined);
 assert.ok(play);
 let entered=dispatchUniversalAction(board.packs,board.s,play);
 assert.equal(entered.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(board.packs,entered).some(a=>a.uid===null),false);
 assert.equal(entered.players[0].front.find(c=>c.uid===jugram.uid).entryTurn,entered.turn);
 aiOk(board.packs,entered);
 entered=dispatchUniversalAction(board.packs,entered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(entered.pending,null);
 const hushed=structuredClone(entered);
 grantContinuousState(hushed,{kind:'originalEffectsDisabled',controller:0,sourceUid:jugram.uid,
  targetUid:jugram.uid,sourceLinked:false,until:{player:0,phase:'start',edge:'start'}});
 assert.equal(legalUniversalActions(board.packs,hushed).some(a=>a.type==='activate'&&a.uid===jugram.uid),false);
 assert.equal(legalUniversalActions(board.packs,entered).some(a=>
  a.type==='activate'&&a.uid===jugram.uid&&a.mode==='oncePay'),true);
 let choosing=dispatchUniversalAction(board.packs,entered,{type:'activate',uid:jugram.uid,mode:'oncePay'});
 assert.equal(choosing.pending.kind,'effect-required-energy');
 assert.equal(choosing.pending.amount,2);
 assert.equal(choosing.pending.choices.includes(target.uid),true);
 assert.equal(choosing.pending.choices.includes(castle.uid),false);
 assert.equal(choosing.pending.choices.includes(jugram.uid),false);
 const sidelined=choosing.players[0].energy.find(c=>c?.cardId==='BLC-1-018');
 assert.equal(choosing.pending.choices.includes(sidelined.uid),true);
 assert.equal(legalUniversalActions(board.packs,choosing).some(a=>a.type==='chooseRequiredEnergy'&&a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(board.packs,choosing,{type:'chooseRequiredEnergy',uid:null}),/not currently legal/);
 assert.equal(V2_PENDING_LABELS[choosing.pending.kind],'選自己場上另1個角色，本回合其所需能量增加2');
 assert.equal(universalPrivateChoices(board.packs,choosing,0),null);
 assert.equal(universalPrivateChoices(board.packs,choosing,1),null);
 aiOk(board.packs,choosing);
 let granted=dispatchUniversalAction(board.packs,choosing,{type:'chooseRequiredEnergy',uid:target.uid});
 assert.equal(granted.pending,null);
 assert.equal(granted.mainAbilityUsedUids.includes(jugram.uid),true);
 const marked=granted.players[0].front.find(c=>c.uid===target.uid);
 assert.equal(effectiveRequiredEnergy(board.packs,granted,marked),2);
 assert.equal(effectiveHandRequiredEnergy(board.packs,granted,0,bleach.cards['BLC-1-002']),0);
 assert.equal(effectiveRequiredEnergy(board.packs,granted,granted.players[0].energy.find(c=>c?.cardId==='BLC-1-005')),2);
 const muted=structuredClone(granted);
 grantContinuousState(muted,{kind:'originalEffectsDisabled',controller:1,sourceUid:jugram.uid,
  targetUid:target.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 assert.equal(effectiveRequiredEnergy(board.packs,muted,muted.players[0].front.find(c=>c?.uid===target.uid)),2);
 const left=structuredClone(granted);
 const from=left.players[0].front.findIndex(c=>c?.uid===jugram.uid);
 left.players[0].outside.push(left.players[0].front[from]);
 left.players[0].front[from]=null;
 assert.equal(assertUniversalMatch(board.packs,left),true);
 assert.equal(effectiveRequiredEnergy(board.packs,left,left.players[0].front.find(c=>c?.uid===target.uid)),2);
 const later=structuredClone(granted);
 function march(s,player,phase,own){
  for(let n=0;n<80&&!(s.active===player&&s.phase===phase&&s.players[0].ownTurns===own);n++){
   if(s.pending?.kind==='end-hand-limit'){
    s=dispatchUniversalAction(board.packs,s,legalUniversalActions(board.packs,s).find(a=>a.type==='chooseHandLimit'));
    continue;
   }
   if(s.pending?.kind==='life-trigger'){
    s=dispatchUniversalAction(board.packs,s,{type:'chooseTrigger',mode:'skip'},{actor:s.pending.player});
    continue;
   }
   if(s.pending?.kind==='block'){
    s=dispatchUniversalAction(board.packs,s,{type:'chooseBlock',uid:null});
    continue;
   }
   const step=legalUniversalActions(board.packs,s).find(a=>a.type==='next');
   assert.ok(step,JSON.stringify(s.pending));
   s=dispatchUniversalAction(board.packs,s,step);
  }
  assert.equal(s.active,player);
  assert.equal(s.phase,phase);
  assert.equal(s.players[0].ownTurns,own);
  return s;
 }
 const nextTurn=march(later,0,'main',2);
 const aged=nextTurn.players[0].front.find(c=>c?.uid===target.uid);
 assert.equal(effectiveRequiredEnergy(board.packs,nextTurn,aged),0);
 assert.equal(legalUniversalActions(board.packs,nextTurn).some(a=>a.type==='activate'&&a.uid===jugram.uid),false);
 const again=structuredClone(granted);
 again.players[0].apCards[0].ready=true;
 const spare2=hold(again,0,'BLC-1-002');
 const copy=hold(again,0,'BLC-4-011');
 const replay=legalUniversalActions(board.packs,again).find(a=>a.type==='play'&&
  a.uid===copy.uid&&a.line==='front'&&a.replaceUid===undefined);
 let second=dispatchUniversalAction(board.packs,again,replay);
 second=dispatchUniversalAction(board.packs,second,{type:'chooseDiscard',uid:spare2.uid});
 assert.equal(legalUniversalActions(board.packs,second).some(a=>a.type==='activate'&&a.uid===jugram.uid),false);
 assert.equal(legalUniversalActions(board.packs,second).some(a=>
  a.type==='activate'&&a.uid===copy.uid&&a.mode==='oncePay'),true);
 granted.players[0].apCards[0].ready=true;
 const mask=hold(granted,0,'BLC-1-017');
 const bouncePlay=legalUniversalActions(board.packs,granted).find(a=>a.type==='play'&&
  a.uid===mask.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(bouncePlay);
 let bouncing=dispatchUniversalAction(board.packs,granted,bouncePlay);
 assert.equal(bouncing.pending.kind,'effect-bounce-own');
 assert.equal(bouncing.pending.choices.includes(target.uid),true);
 bouncing=dispatchUniversalAction(board.packs,bouncing,{type:'chooseOwnBounce',uid:target.uid});
 const returned=bouncing.players[0].hand.find(c=>c.uid===target.uid);
 assert.ok(returned);
 assert.equal(effectiveHandRequiredEnergy(board.packs,bouncing,0,bleach.cards['BLC-1-002'],returned),2);
 const other=[...bouncing.players[0].hand,...bouncing.players[0].deck].find(c=>
  c.cardId==='BLC-1-002'&&c.uid!==target.uid);
 assert.equal(effectiveHandRequiredEnergy(board.packs,bouncing,0,bleach.cards['BLC-1-002'],other),0);
 bouncing.players[0].apCards[0].ready=true;
 assert.equal(legalUniversalActions(board.packs,bouncing).some(a=>
  a.type==='play'&&a.uid===returned.uid&&a.line==='front'),true);
 const lonely=main(deck,29891);
 for(let i=0;i<3;i++)put(lonely.s,0,'BLC-1-028','energy',i);
 assert.equal(universalEnergyByColor(lonely.packs,lonely.s,0).yellow,3);
 const quietSpare=hold(lonely.s,0,'BLC-1-002');
 const alone=hold(lonely.s,0,'BLC-4-011');
 const alonePlay=legalUniversalActions(lonely.packs,lonely.s).find(a=>a.type==='play'&&
  a.uid===alone.uid&&a.line==='front'&&a.slot===0&&a.replaceUid===undefined);
 let quiet=dispatchUniversalAction(lonely.packs,lonely.s,alonePlay);
 quiet=dispatchUniversalAction(lonely.packs,quiet,{type:'chooseDiscard',uid:quietSpare.uid});
 assert.equal(quiet.pending,null);
 assert.equal(legalUniversalActions(lonely.packs,quiet).some(a=>a.type==='activate'&&a.uid===alone.uid),false);
 assert.equal(quiet.mainAbilityUsedUids.includes(alone.uid),false);
 const parked=main(deck,29893);
 put(parked.s,0,'BLC-1-002','front',0,true);
 const sitting=put(parked.s,0,'BLC-4-011','energy',0,true);
 assert.equal(sitting.entryTurn,undefined);
 assert.equal(legalUniversalActions(parked.packs,parked.s).some(a=>a.type==='activate'&&a.uid===sitting.uid),false);
 const color=main(deck,29892);
 const attacker=put(color.s,0,'BLC-1-002','front',0,true);
 const trigger=take(color.s,1,'BLC-4-011');
 const buried=color.s.players[1].life[0];
 color.s.players[1].life[0]=trigger;
 color.s.players[1].deck.push(buried);
 let revealed=color.s;
 for(let n=0;n<6&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'next'});
 revealed=dispatchUniversalAction(color.packs,revealed,{type:'attack',uid:attacker.uid});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(color.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 const choices=legalUniversalActions(color.packs,revealed);
 assert.equal(choices.some(a=>a.mode==='colorRestSkip'&&a.uid===attacker.uid),true);
 const rested=dispatchUniversalAction(color.packs,revealed,{type:'chooseTrigger',mode:'colorRestSkip',uid:attacker.uid},{actor:1});
 assert.equal(rested.players[0].front.find(c=>c?.uid===attacker.uid).ready,false);
 assert.deepEqual(universalPublicView(color.packs,rested,1).players[0].front.find(c=>c?.uid===attacker.uid).restrictions,
  [{kind:'skipNextActive',until:null}]);
 assert.equal(assertUniversalMatch(board.packs,granted),true);
 assert.equal(assertUniversalMatch(board.packs,bouncing),true);
 assert.equal(assertUniversalMatch(lonely.packs,quiet),true);
 assert.equal(assertUniversalMatch(color.packs,rested),true);
});

test('BLC-4-007 becomes ACTIVE once the live required energy reaches 5',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-007');
 assert.equal(printed.number,'EX15BT/BLC-4-007');
 assert.equal(printed.nameJa,'バズビー');
 assert.equal(printed.effect,'啟動・主要：僅在自己場外沒有《友哈巴赫》，且此角色的所需能量為5以上時可發動；將此角色改為Active。所有《巴茲比》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,null);
 assert.equal(printed.energy,4);
 const card=bleach.cards['BLC-4-007'];
 assert.equal(card.name,printed.nameJa);
 assert.equal(card.gen,1);
 assert.equal(card.energy,4);
 assert.equal(card.trigger,null);
 assert.equal(card.triggerEffect,null);
 const when={logic:'all',turn:'any',checks:[
  {kind:'ownNameAbsent',turn:'any',zone:'outside',excludeSelf:false,name:'ユーハバッハ'},
  {kind:'selfRequiredEnergyAtLeast',turn:'any',min:5}
 ]};
 assert.deepEqual(card.mainAbility,{op:'nameOnceActive',scope:'name',when});
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-007');
 assert.equal(entry.sourceRecord.gen,1);
 assert.equal(entry.definition.gen,1);
 assert.equal(entry.sourceRecord.legacyImportedGen,undefined);
 const bare={id:'X',name:'n',color:'yellow',type:'character',energy:4,ap:1,bp:4000,gen:1,
  traits:[],trigger:null,implementation:'dsl'};
 const broken=(min,extra={})=>createUniversalPack({id:'bad-bazz',cards:[{...bare,mainAbility:{
  op:'nameOnceActive',scope:'name',when:{logic:'all',turn:'any',checks:[
   {kind:'ownNameAbsent',turn:'any',zone:'outside',excludeSelf:false,name:'ユーハバッハ'},
   {kind:'selfRequiredEnergyAtLeast',turn:'any',min,...extra}
  ]}}}]});
 assert.throws(()=>broken(0),/unsupported main action ability/);
 assert.throws(()=>broken(31),/unsupported main action ability/);
 assert.throws(()=>createUniversalPack({id:'bad-bazz-passive',cards:[{...bare,passiveBonuses:[{
  condition:{kind:'selfRequiredEnergyAtLeast',turn:'any',min:5},bp:1000}]}]}),
  /required-energy gate is only a name-once active/);
 const required=['BLC-4-007','BLC-1-005','BLC-1-018','BLC-1-012','BLC-1-002','BLC-1-023'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='yellow'&&c.maxCopies===4&&
  !required.includes(c.id)&&c.id!=='BLC-4-011'&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,6),'BLC-4-011'];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const board=main(deck,29894);
 ['BLC-1-005','BLC-1-018','BLC-1-012'].forEach((id,i)=>put(board.s,0,id,'energy',i,false));
 const front=put(board.s,0,'BLC-4-007','front',1,false);
 const lined=put(board.s,0,'BLC-4-007','energy',3,false);
 assert.equal(effectiveRequiredEnergy(board.packs,board.s,front),4);
 assert.equal(effectiveRequiredEnergy(board.packs,board.s,lined),4);
 assert.equal(universalEnergyByColor(board.packs,board.s,0).yellow,4);
 assert.equal(legalUniversalActions(board.packs,board.s).some(a=>a.type==='activate'&&
  (a.uid===front.uid||a.uid===lined.uid)),false);
 const spare=hold(board.s,0,'BLC-1-002');
 const jugram=hold(board.s,0,'BLC-4-011');
 const play=legalUniversalActions(board.packs,board.s).find(a=>a.type==='play'&&
  a.uid===jugram.uid&&a.line==='front'&&a.slot===0&&a.replaceUid===undefined);
 assert.ok(play);
 let entered=dispatchUniversalAction(board.packs,board.s,play);
 assert.equal(entered.pending.kind,'effect-discard');
 entered=dispatchUniversalAction(board.packs,entered,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(entered.pending,null);
 let choosing=dispatchUniversalAction(board.packs,entered,{type:'activate',uid:jugram.uid,mode:'oncePay'});
 assert.equal(choosing.pending.kind,'effect-required-energy');
 assert.equal(choosing.pending.choices.includes(lined.uid),true);
 assert.equal(choosing.pending.choices.includes(front.uid),true);
 let granted=dispatchUniversalAction(board.packs,choosing,{type:'chooseRequiredEnergy',uid:lined.uid});
 const raised=granted.players[0].energy.find(c=>c?.uid===lined.uid);
 const waiting=granted.players[0].front.find(c=>c?.uid===front.uid);
 assert.equal(effectiveRequiredEnergy(board.packs,granted,raised),6);
 assert.equal(effectiveRequiredEnergy(board.packs,granted,waiting),4);
 assert.equal(legalUniversalActions(board.packs,granted).some(a=>
  a.type==='activate'&&a.uid===front.uid&&a.mode==='nameOnceActive'),false);
 const act=legalUniversalActions(board.packs,granted).find(a=>
  a.type==='activate'&&a.uid===lined.uid&&a.mode==='nameOnceActive');
 assert.ok(act);
 const awake=structuredClone(granted);
 awake.players[0].energy.find(c=>c?.uid===lined.uid).ready=true;
 assert.equal(legalUniversalActions(board.packs,awake).some(a=>
  a.type==='activate'&&a.uid===lined.uid&&a.mode==='nameOnceActive'),true);
 const hushed=structuredClone(granted);
 grantContinuousState(hushed,{kind:'originalEffectsDisabled',controller:1,sourceUid:jugram.uid,
  targetUid:lined.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 assert.equal(legalUniversalActions(board.packs,hushed).some(a=>a.type==='activate'&&a.uid===lined.uid),false);
 const blocked=structuredClone(granted);
 const yhwach=take(blocked,0,'BLC-1-023');
 blocked.players[0].outside.push(yhwach);
 assert.equal(legalUniversalActions(board.packs,blocked).some(a=>a.type==='activate'&&a.uid===lined.uid),false);
 const named=structuredClone(granted);
 const king=put(named,0,'BLC-1-023','front',2,true);
 assert.equal(cardHasName(bleach.cards[king.cardId],'ユーハバッハ'),true);
 assert.equal(legalUniversalActions(board.packs,named).some(a=>
  a.type==='activate'&&a.uid===lined.uid&&a.mode==='nameOnceActive'),true);
 const foe=structuredClone(granted);
 const foreign=take(foe,1,'BLC-1-023');
 foe.players[1].outside.push(foreign);
 assert.equal(legalUniversalActions(board.packs,foe).some(a=>
  a.type==='activate'&&a.uid===lined.uid&&a.mode==='nameOnceActive'),true);
 const clutter=structuredClone(granted);
 const other=take(clutter,0,'BLC-1-002');
 clutter.players[0].outside.push(other);
 assert.equal(legalUniversalActions(board.packs,clutter).some(a=>
  a.type==='activate'&&a.uid===lined.uid&&a.mode==='nameOnceActive'),true);
 aiOk(board.packs,granted);
 let woken=dispatchUniversalAction(board.packs,granted,act);
 assert.equal(woken.pending,null);
 assert.equal(woken.players[0].energy.find(c=>c?.uid===lined.uid).ready,true);
 const key='バズビー|nameOnceActive|ownNameAbsent+selfRequiredEnergyAtLeast';
 assert.equal(woken.mainReadyOnceByName[0].includes(key),true);
 const muted=structuredClone(woken);
 grantContinuousState(muted,{kind:'originalEffectsDisabled',controller:1,sourceUid:jugram.uid,
  targetUid:lined.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 assert.equal(muted.players[0].energy.find(c=>c?.uid===lined.uid).ready,true);
 const second=structuredClone(woken);
 second.players[0].apCards[0].ready=true;
 const spare2=hold(second,0,'BLC-1-002');
 const copy=hold(second,0,'BLC-4-011');
 const replay=legalUniversalActions(board.packs,second).find(a=>a.type==='play'&&
  a.uid===copy.uid&&a.line==='front'&&a.slot===2&&a.replaceUid===undefined);
 assert.ok(replay);
 let again=dispatchUniversalAction(board.packs,second,replay);
 again=dispatchUniversalAction(board.packs,again,{type:'chooseDiscard',uid:spare2.uid});
 let raising=dispatchUniversalAction(board.packs,again,{type:'activate',uid:copy.uid,mode:'oncePay'});
 raising=dispatchUniversalAction(board.packs,raising,{type:'chooseRequiredEnergy',uid:front.uid});
 const lifted=raising.players[0].front.find(c=>c?.uid===front.uid);
 assert.equal(effectiveRequiredEnergy(board.packs,raising,lifted),6);
 assert.equal(legalUniversalActions(board.packs,raising).some(a=>
  a.type==='activate'&&a.uid===front.uid&&a.mode==='nameOnceActive'),false);
 assert.throws(()=>dispatchUniversalAction(board.packs,raising,
  {type:'activate',uid:front.uid,mode:'nameOnceActive'}),/not currently legal/);
 function march(s,player,phase,own){
  for(let n=0;n<80&&!(s.active===player&&s.phase===phase&&s.players[0].ownTurns===own);n++){
   if(s.pending?.kind==='end-hand-limit'){
    s=dispatchUniversalAction(board.packs,s,legalUniversalActions(board.packs,s).find(a=>a.type==='chooseHandLimit'));
    continue;
   }
   if(s.pending?.kind==='life-trigger'){
    s=dispatchUniversalAction(board.packs,s,{type:'chooseTrigger',mode:'skip'},{actor:s.pending.player});
    continue;
   }
   if(s.pending?.kind==='block'){
    s=dispatchUniversalAction(board.packs,s,{type:'chooseBlock',uid:null});
    continue;
   }
   const step=legalUniversalActions(board.packs,s).find(a=>a.type==='next');
   assert.ok(step,JSON.stringify(s.pending));
   s=dispatchUniversalAction(board.packs,s,step);
  }
  assert.equal(s.active,player);
  assert.equal(s.phase,phase);
  assert.equal(s.players[0].ownTurns,own);
  return s;
 }
 const nextTurn=march(structuredClone(woken),0,'main',2);
 const aged=nextTurn.players[0].energy.find(c=>c?.uid===lined.uid);
 assert.equal(effectiveRequiredEnergy(board.packs,nextTurn,aged),4);
 assert.equal(nextTurn.mainReadyOnceByName[0].includes(key),false);
 assert.equal(legalUniversalActions(board.packs,nextTurn).some(a=>a.type==='activate'&&a.uid===lined.uid),false);
 aged.ready=false;
 aged.buffs.push({requiredEnergy:2,untilTurn:nextTurn.turn});
 assert.equal(assertUniversalMatch(board.packs,nextTurn),true);
 assert.equal(effectiveRequiredEnergy(board.packs,nextTurn,aged),6);
 const renewed=legalUniversalActions(board.packs,nextTurn).find(a=>
  a.type==='activate'&&a.uid===lined.uid&&a.mode==='nameOnceActive');
 assert.ok(renewed);
 const fresh=dispatchUniversalAction(board.packs,nextTurn,renewed);
 assert.equal(fresh.players[0].energy.find(c=>c?.uid===lined.uid).ready,true);
 assert.equal(fresh.mainReadyOnceByName[0].includes(key),true);
 assert.equal(assertUniversalMatch(board.packs,woken),true);
 assert.equal(assertUniversalMatch(board.packs,raising),true);
 assert.equal(assertUniversalMatch(board.packs,fresh),true);
});

test('BLC-4-012 raises other required energy in raid and may draw on another retirement',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-012');
 assert.equal(printed.number,'EX15BT/BLC-4-012');
 assert.equal(printed.nameJa,'ユーグラム・ハッシュヴァルト');
 assert.equal(printed.effect,'突襲《雨葛蘭・哈斯沃德》：改為Active，可移至前線。以下僅在突襲狀態適用：〔前線〕自己的其他角色退場時，可抽1張牌；所有《雨葛蘭・哈斯沃德》的此效果合計每回合1次。〔自己的回合／前線〕自己的其他角色所需能量皆增加2。登場時：若自己場上所有卡片皆沒有「星十字騎士團」以外的特徵，可從手牌將最多1張所需能量2以下、消費AP1的黃色角色以Rest登場。沒有特徵的卡片不妨礙此條件。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 assert.equal(printed.energy,4);
 const card=bleach.cards['BLC-4-012'];
 assert.equal(card.name,printed.nameJa);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'raid');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.raidName,'ユーグラム・ハッシュヴァルト');
 assert.equal(card.raidFrontRequiredEnergy,2);
 assert.equal(card.raidFrontOtherRetireDraw,1);
 assert.deepEqual(card.effects.onPlay,[{op:'deployOwnHandRest',type:'character',color:'yellow',
  energy:2,ap:1,max:1,when:{kind:'ownFieldNoOtherTrait',turn:'any',zone:'field',trait:'星十字騎士團'}}]);
 const bare={id:'X',name:'n',color:'yellow',type:'character',energy:4,ap:1,bp:4000,gen:1,
  traits:[],trigger:'raid',implementation:'dsl',raidName:'ユーグラム・ハッシュヴァルト',
  effects:{onPlay:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'bad-raid-energy',cards:[{...bare,raidFrontRequiredEnergy:3}]}),
  /invalid raid-front required energy/);
 const required=['BLC-1-018','BLC-1-005','BLC-1-012','BLC-1-002','BLC-1-028','BLC-2-005','BLC-4-007'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='yellow'&&c.maxCopies===4&&
  !required.includes(c.id)&&c.id!=='BLC-4-012'&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,5),'BLC-4-012'];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const board=main(deck,29895);
 const base=put(board.s,0,'BLC-1-018','energy',0,true);
 put(board.s,0,'BLC-1-005','energy',1,true);
 put(board.s,0,'BLC-1-012','energy',2,true);
 put(board.s,0,'BLC-1-002','energy',3,true);
 const small=put(board.s,0,'BLC-1-002','front',1,true);
 const bazz=put(board.s,0,'BLC-4-007','front',2,false);
 assert.equal(universalEnergyByColor(board.packs,board.s,0).yellow,4);
 assert.equal(effectiveRequiredEnergy(board.packs,board.s,bazz),4);
 const cheap=hold(board.s,0,'BLC-1-002');
 const capped=hold(board.s,0,'BLC-1-005');
 const heavy=hold(board.s,0,'BLC-2-005');
 const rider=hold(board.s,0,'BLC-4-012');
 const raid=legalUniversalActions(board.packs,board.s).find(a=>a.uid===rider.uid&&a.type==='raid'&&
  a.baseUid===base.uid&&a.slot===0);
 assert.ok(raid);
 let entered=dispatchUniversalAction(board.packs,board.s,raid);
 assert.equal(entered.players[0].front.find(c=>c?.uid===rider.uid).ready,true);
 assert.equal(entered.players[0].front.find(c=>c?.uid===rider.uid).stack.length,1);
 assert.equal(entered.pending.kind,'effect-hand-rest');
 assert.equal(entered.pending.choices.includes(cheap.uid),true);
 assert.equal(entered.pending.choices.includes(capped.uid),true);
 assert.equal(entered.pending.choices.includes(heavy.uid),false);
 assert.equal(legalUniversalActions(board.packs,entered).some(a=>a.type==='chooseHandRest'&&a.uid===null),true);
 let stood=dispatchUniversalAction(board.packs,entered,{type:'chooseHandRest',uid:null});
 assert.equal(stood.pending,null);
 const liveRider=stood.players[0].front.find(c=>c?.uid===rider.uid);
 const liveBazz=stood.players[0].front.find(c=>c?.uid===bazz.uid);
 const liveFuel=stood.players[0].energy.find(c=>c?.cardId==='BLC-1-005');
 assert.equal(effectiveRequiredEnergy(board.packs,stood,liveRider),4);
 assert.equal(effectiveRequiredEnergy(board.packs,stood,liveBazz),6);
 assert.equal(effectiveRequiredEnergy(board.packs,stood,liveFuel),4);
 const stacked=structuredClone(stood);
 const marked=stacked.players[0].front.find(c=>c?.uid===bazz.uid);
 marked.buffs.push({requiredEnergy:2,untilTurn:stacked.turn});
 assert.equal(assertUniversalMatch(board.packs,stacked),true);
 assert.equal(effectiveRequiredEnergy(board.packs,stacked,marked),8);
 const theirs=structuredClone(stood);
 theirs.active=1;
 assert.equal(effectiveRequiredEnergy(board.packs,theirs,theirs.players[0].front.find(c=>c?.uid===bazz.uid)),4);
 const hushed=structuredClone(stood);
 grantContinuousState(hushed,{kind:'originalEffectsDisabled',controller:1,sourceUid:rider.uid,
  targetUid:rider.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 assert.equal(effectiveRequiredEnergy(board.packs,hushed,hushed.players[0].front.find(c=>c?.uid===bazz.uid)),4);
 const sidelined=structuredClone(stood);
 const from=sidelined.players[0].front.findIndex(c=>c?.uid===rider.uid);
 const moved=sidelined.players[0].front[from];
 sidelined.players[0].front[from]=null;
 sidelined.players[0].energy[0]=moved;
 assert.equal(assertUniversalMatch(board.packs,sidelined),true);
 assert.equal(effectiveRequiredEnergy(board.packs,sidelined,sidelined.players[0].front.find(c=>c?.uid===bazz.uid)),4);
 const doubled=structuredClone(stood);
 const extraBase=take(doubled,0,'BLC-1-018');
 const extra=take(doubled,0,'BLC-4-012');
 extra.stack=[extraBase];
 extra.ready=true;
 extra.fieldEntryStamp=doubled.nextFieldEntryStamp++;
 doubled.players[0].front[3]=extra;
 assert.equal(assertUniversalMatch(board.packs,doubled),true);
 assert.equal(effectiveRequiredEnergy(board.packs,doubled,doubled.players[0].front.find(c=>c?.uid===bazz.uid)),8);
 const act=legalUniversalActions(board.packs,stood).find(a=>
  a.type==='activate'&&a.uid===bazz.uid&&a.mode==='nameOnceActive');
 assert.ok(act);
 let woken=dispatchUniversalAction(board.packs,stood,act);
 assert.equal(woken.players[0].front.find(c=>c?.uid===bazz.uid).ready,true);
 const wall=put(woken,1,'BLC-2-005','front',0,true);
 const secondWall=put(woken,1,'BLC-4-007','front',1,true);
 let battle=woken;
 for(let n=0;n<4&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(board.packs,battle,{type:'next'});
 assert.equal(battle.phase,'attack');
 battle=dispatchUniversalAction(board.packs,battle,{type:'attack',uid:small.uid});
 assert.equal(battle.pending.kind,'block');
 battle=dispatchUniversalAction(board.packs,battle,{type:'chooseBlock',uid:wall.uid});
 assert.equal(battle.players[0].outside.some(c=>c.uid===small.uid),true);
 assert.equal(battle.pending.kind,'effect-may-draw');
 assert.equal(V2_PENDING_LABELS[battle.pending.kind],'可抽1張牌');
 assert.equal(legalUniversalActions(board.packs,battle).some(a=>a.type==='chooseMayDraw'&&a.mode==='skip'),true);
 assert.equal(legalUniversalActions(board.packs,battle).some(a=>a.type==='chooseMayDraw'&&a.mode==='draw'),true);
 aiOk(board.packs,battle);
 const before=battle.players[0].hand.length;
 const declined=dispatchUniversalAction(board.packs,structuredClone(battle),{type:'chooseMayDraw',mode:'skip'});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.length,before);
 assert.equal(declined.mainReadyOnceByName[0].includes('ユーグラム・ハッシュヴァルト|raidFrontOtherRetireDraw'),true);
 let drawn=dispatchUniversalAction(board.packs,battle,{type:'chooseMayDraw',mode:'draw'});
 assert.equal(drawn.pending,null);
 assert.equal(drawn.players[0].hand.length,before+1);
 const key='ユーグラム・ハッシュヴァルト|raidFrontOtherRetireDraw';
 assert.equal(drawn.mainReadyOnceByName[0].includes(key),true);
 const other=put(drawn,0,'BLC-1-012','front',3,true);
 let again=drawn;
 again=dispatchUniversalAction(board.packs,again,{type:'attack',uid:other.uid});
 again=dispatchUniversalAction(board.packs,again,{type:'chooseBlock',uid:secondWall.uid});
 assert.equal(again.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(again.pending,null);
 const blocked=main(deck,29896);
 put(blocked.s,0,'BLC-1-018','energy',0,true);
 put(blocked.s,0,'BLC-1-005','energy',1,true);
 put(blocked.s,0,'BLC-1-012','energy',2,true);
 put(blocked.s,0,'BLC-1-002','energy',3,true);
 put(blocked.s,0,'BLC-2-005','front',1,true);
 const foreign=hold(blocked.s,0,'BLC-4-012');
 const foreignRaid=legalUniversalActions(blocked.packs,blocked.s).find(a=>a.type==='raid'&&
  a.uid===foreign.uid&&a.baseUid===blocked.s.players[0].energy[0].uid&&a.slot===0);
 assert.ok(foreignRaid);
 const quiet=dispatchUniversalAction(blocked.packs,blocked.s,foreignRaid);
 assert.equal(quiet.pending,null);
 const open=main(deck,29897);
 put(open.s,0,'BLC-1-018','energy',0,true);
 put(open.s,0,'BLC-1-005','energy',1,true);
 put(open.s,0,'BLC-1-012','energy',2,true);
 const castle=put(open.s,0,'BLC-1-028','energy',3,true);
 assert.deepEqual(bleach.cards[castle.cardId].traits,[]);
 const plain=hold(open.s,0,'BLC-1-002');
 const guest=hold(open.s,0,'BLC-4-012');
 const guestRaid=legalUniversalActions(open.packs,open.s).find(a=>a.type==='raid'&&
  a.uid===guest.uid&&a.baseUid===open.s.players[0].energy[0].uid&&a.slot===0);
 let welcomed=dispatchUniversalAction(open.packs,open.s,guestRaid);
 assert.equal(welcomed.pending.kind,'effect-hand-rest');
 assert.equal(welcomed.pending.choices.includes(plain.uid),true);
 welcomed=dispatchUniversalAction(open.packs,welcomed,{type:'chooseHandRest',uid:null});
 const barePlay=main(deck,29898);
 put(barePlay.s,0,'BLC-1-018','energy',0,true);
 put(barePlay.s,0,'BLC-1-005','energy',1,true);
 put(barePlay.s,0,'BLC-1-012','energy',2,true);
 put(barePlay.s,0,'BLC-1-002','energy',3,true);
 const sitting=hold(barePlay.s,0,'BLC-4-012');
 const play=legalUniversalActions(barePlay.packs,barePlay.s).find(a=>a.type==='play'&&
  a.uid===sitting.uid&&a.line==='front'&&a.slot===0&&a.replaceUid===undefined);
 assert.ok(play);
 let plainEntry=dispatchUniversalAction(barePlay.packs,barePlay.s,play);
 assert.equal(plainEntry.pending.kind,'effect-hand-rest');
 plainEntry=dispatchUniversalAction(barePlay.packs,plainEntry,{type:'chooseHandRest',uid:null});
 const neighbor=put(plainEntry,0,'BLC-1-002','front',1,true);
 assert.equal((plainEntry.players[0].front.find(c=>c?.uid===sitting.uid).stack||[]).length,0);
 assert.equal(effectiveRequiredEnergy(barePlay.packs,plainEntry,neighbor),0);
 assert.equal(assertUniversalMatch(board.packs,drawn),true);
 assert.equal(assertUniversalMatch(blocked.packs,quiet),true);
 assert.equal(assertUniversalMatch(open.packs,welcomed),true);
 assert.equal(assertUniversalMatch(barePlay.packs,plainEntry),true);
});

test('BLC-4-004 pays 1 AP from hand and enters ACTIVE after four Ichigo leave the removed area',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-004');
 assert.equal(printed.number,'EX15BT/BLC-4-004');
 assert.equal(printed.nameJa,'石田 雨竜');
 assert.equal(printed.effect,'Impact無效：與此角色戰鬥的角色在該次戰鬥失去Impact。啟動・主要〔支付1 AP〕：僅可在此卡位於自己手牌時發動；將自己除外區4張以上《黑崎一護》送至場外，完成後將此卡以Active登場於自己的前線。所有《石田雨龍》的此效果合計每回合僅限1次。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 assert.equal(printed.energy,4);
 const card=bleach.cards['BLC-4-004'];
 assert.equal(card.name,printed.nameJa);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.equal(card.impactNull,true);
 assert.deepEqual(card.mainAbility,{op:'handNameOnceRemoveNamedEnter',scope:'name',payAp:1,
  zone:'hand',min:4,name:'黒崎 一護',line:'front',ready:true});
 const bare={id:'X',name:'n',color:'yellow',type:'character',energy:4,ap:1,bp:4000,gen:1,
  traits:[],trigger:'active',implementation:'dsl',impactNull:true};
 assert.throws(()=>createUniversalPack({id:'bad-uryu',cards:[{...bare,mainAbility:{
  op:'handNameOnceRemoveNamedEnter',scope:'name',payAp:1,zone:'hand',min:3,
  name:'黒崎 一護',line:'front',ready:true}}]}),/unsupported main action ability/);
 const required=['BLC-4-004','BLC-1-081','BLC-2-017','BLC-4-025','BLC-1-002'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='yellow'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,8)];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const stash=(s,p,id)=>{const c=take(s,p,id);s.players[p].removed.push(c);return c;};
 const key='石田 雨竜|handNameOnce|黒崎 一護';
 const board=main(deck,29900);
 const fieldCopy=put(board.s,0,'BLC-4-004','front',1,false);
 const uryu=hold(board.s,0,'BLC-4-004');
 const copy=hold(board.s,0,'BLC-4-004');
 const other=stash(board.s,0,'BLC-1-002');
 const foreign=stash(board.s,1,'BLC-2-017');
 const ichigo=[0,1,2,3].map(()=>stash(board.s,0,'BLC-2-017'));
 assert.equal(legalUniversalActions(board.packs,board.s).some(a=>
  a.type==='activate'&&a.uid===fieldCopy.uid),false);
 const broke=structuredClone(board.s);
 broke.players[0].apCards.forEach(c=>c.ready=false);
 assert.equal(legalUniversalActions(board.packs,broke).some(a=>
  a.type==='activate'&&a.uid===uryu.uid),false);
 const act=legalUniversalActions(board.packs,board.s).find(a=>
  a.type==='activate'&&a.uid===uryu.uid&&a.mode==='handNameOnce');
 assert.ok(act);
 let choosing=dispatchUniversalAction(board.packs,board.s,act);
 assert.equal(choosing.pending.kind,'effect-removed-name-outside');
 assert.equal(V2_PENDING_LABELS[choosing.pending.kind],'將除外區的指定名稱卡送至場外');
 assert.equal(choosing.pending.choices.includes(other.uid),false);
 assert.equal(choosing.pending.choices.includes(foreign.uid),false);
 for(const c of ichigo)assert.equal(choosing.pending.choices.includes(c.uid),true);
 assert.equal(choosing.players[0].apCards.some(c=>c.ready),false);
 assert.equal(legalUniversalActions(board.packs,choosing).some(a=>
  a.type==='chooseRemovedOutside'&&a.mode==='all'),true);
 aiOk(board.packs,choosing);
 let entered=dispatchUniversalAction(board.packs,choosing,{type:'chooseRemovedOutside',mode:'all'});
 assert.equal(entered.pending.kind,'effect-hand-front-active');
 assert.equal(entered.players[0].hand.some(c=>c.uid===uryu.uid),true);
 assert.equal(entered.players[0].removed.some(c=>c.uid===other.uid),true);
 assert.equal(ichigo.every(c=>entered.players[0].outside.some(x=>x.uid===c.uid)),true);
 const spot=legalUniversalActions(board.packs,entered).find(a=>
  a.type==='chooseHandFrontActive'&&a.slot===0&&a.replaceUid===undefined);
 assert.ok(spot);
 let stood=dispatchUniversalAction(board.packs,entered,spot);
 const live=stood.players[0].front.find(c=>c?.uid===uryu.uid);
 assert.equal(live.ready,true);
 assert.equal(live.entryTurn,stood.turn);
 assert.equal(stood.mainReadyOnceByName[0].includes(key),true);
 assert.equal(legalUniversalActions(board.packs,stood).some(a=>
  a.type==='activate'&&a.uid===copy.uid),false);
 const short=main(deck,29901);
 const waiting=hold(short.s,0,'BLC-4-004');
 [0,1,2].forEach(()=>stash(short.s,0,'BLC-2-017'));
 let few=dispatchUniversalAction(short.packs,short.s,legalUniversalActions(short.packs,short.s).find(a=>
  a.type==='activate'&&a.uid===waiting.uid&&a.mode==='handNameOnce'));
 assert.equal(few.pending.short,true);
 few=dispatchUniversalAction(short.packs,few,{type:'chooseRemovedOutside',mode:'all'});
 assert.equal(few.pending,null);
 assert.equal(few.players[0].hand.some(c=>c.uid===waiting.uid),true);
 assert.equal(few.players[0].outside.length,3);
 assert.equal(few.mainReadyOnceByName[0].includes(key),true);
 const empty=main(deck,29902);
 const lone=hold(empty.s,0,'BLC-4-004');
 const quiet=dispatchUniversalAction(empty.packs,empty.s,legalUniversalActions(empty.packs,empty.s).find(a=>
  a.type==='activate'&&a.uid===lone.uid&&a.mode==='handNameOnce'));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].hand.some(c=>c.uid===lone.uid),true);
 assert.equal(quiet.mainReadyOnceByName[0].includes(key),true);
 const wide=main(deck,29903);
 const fifth=hold(wide.s,0,'BLC-4-004');
 const extra=stash(wide.s,0,'BLC-4-025');
 const four=[0,1,2,3].map(()=>stash(wide.s,0,'BLC-2-017'));
 let picking=dispatchUniversalAction(wide.packs,wide.s,legalUniversalActions(wide.packs,wide.s).find(a=>
  a.type==='activate'&&a.uid===fifth.uid&&a.mode==='handNameOnce'));
 assert.equal(picking.pending.choices.includes(extra.uid),true);
 assert.equal(legalUniversalActions(wide.packs,picking).some(a=>a.mode==='all'),false);
 for(const c of four){
  picking=dispatchUniversalAction(wide.packs,picking,{type:'chooseRemovedOutside',mode:'pick',uid:c.uid});
 }
 assert.equal(legalUniversalActions(wide.packs,picking).some(a=>a.mode==='done'),true);
 assert.equal(legalUniversalActions(wide.packs,picking).some(a=>a.mode==='pick'&&a.uid===extra.uid),true);
 let ready=dispatchUniversalAction(wide.packs,picking,{type:'chooseRemovedOutside',mode:'done'});
 assert.equal(ready.players[0].removed.some(c=>c.uid===extra.uid),true);
 assert.equal(four.every(c=>ready.players[0].outside.some(x=>x.uid===c.uid)),true);
 const placed=legalUniversalActions(wide.packs,ready).find(a=>
  a.type==='chooseHandFrontActive'&&a.slot===0);
 ready=dispatchUniversalAction(wide.packs,ready,placed);
 assert.equal(ready.players[0].front.find(c=>c?.uid===fifth.uid).ready,true);
 const battle=main(deck,29904);
 const hitters=[0,1,2].map(i=>put(battle.s,0,'BLC-1-081','front',i,true));
 const weak=put(battle.s,1,'BLC-1-002','front',0,true);
 const wall=put(battle.s,1,'BLC-4-004','front',1,true);
 for(const [id,index] of [['BLC-4-004',0],['BLC-1-081',1]]){
  const trigger=take(battle.s,1,id);
  const buried=battle.s.players[1].life[index];
  battle.s.players[1].life[index]=trigger;
  battle.s.players[1].deck.push(buried);
 }
 let fight=battle.s;
 for(let n=0;n<4&&fight.phase!=='attack';n++)
  fight=dispatchUniversalAction(battle.packs,fight,{type:'next'});
 const lives=fight.players[1].life.length;
 fight=dispatchUniversalAction(battle.packs,fight,{type:'attack',uid:hitters[0].uid});
 fight=dispatchUniversalAction(battle.packs,fight,{type:'chooseBlock',uid:weak.uid});
 assert.equal(fight.pending.kind,'life-trigger');
 assert.equal(fight.players[1].life.length,lives-1);
 fight=dispatchUniversalAction(battle.packs,fight,{type:'chooseTrigger',mode:'skip'},{actor:1});
 const spared=structuredClone(fight);
 spared.players[0].front.find(c=>c?.uid===hitters[1].uid).ready=true;
 let blocked=dispatchUniversalAction(battle.packs,spared,{type:'attack',uid:hitters[1].uid});
 blocked=dispatchUniversalAction(battle.packs,blocked,{type:'chooseBlock',uid:wall.uid});
 assert.equal(blocked.pending,null);
 assert.equal(blocked.players[1].life.length,lives-1);
 assert.equal(blocked.players[1].outside.some(c=>c.uid===wall.uid),true);
 const hushed=structuredClone(fight);
 grantContinuousState(hushed,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:hitters[2].uid,targetUid:wall.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 hushed.players[0].front.find(c=>c?.uid===hitters[2].uid).ready=true;
 let open=dispatchUniversalAction(battle.packs,hushed,{type:'attack',uid:hitters[2].uid});
 open=dispatchUniversalAction(battle.packs,open,{type:'chooseBlock',uid:wall.uid});
 assert.equal(open.pending.kind,'life-trigger');
 assert.equal(open.players[1].life.length,lives-2);
 assert.equal(assertUniversalMatch(board.packs,stood),true);
 assert.equal(assertUniversalMatch(short.packs,few),true);
 assert.equal(assertUniversalMatch(empty.packs,quiet),true);
 assert.equal(assertUniversalMatch(wide.packs,ready),true);
 assert.equal(assertUniversalMatch(battle.packs,blocked),true);
 assert.equal(assertUniversalMatch(battle.packs,open),true);
});

test('BLC-4-005 chooses one retirement mode, hides the life card, and loses only after re-entry',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-005');
 assert.equal(printed.number,'EX15BT/BLC-4-005');
 assert.equal(printed.nameJa,'ジェラルド・ヴァルキリー');
 assert.equal(printed.effect,'退場時：最多選以下1項。①將自己1張生命加入手牌，完成後將此卡以Rest重新登場於自己的場上。②將2張手牌送至場外，完成後將此卡加入手牌。生命加入手牌不公開、不檢查Trigger；效果處理後生命為0則敗北。');
 assert.deepEqual(printed.traits,['星十字騎士團']);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'active');
 assert.equal(printed.energy,4);
 const card=bleach.cards['BLC-4-005'];
 assert.equal(card.name,printed.nameJa);
 assert.equal(card.gen,1);
 assert.equal(card.trigger,'active');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onRetire,[{op:'retireLifeHandOrReturn',optional:true,life:1,hand:2}]);
 const bare={id:'X',name:'n',color:'yellow',type:'character',energy:4,ap:1,bp:4000,gen:1,
  traits:[],trigger:'active',implementation:'dsl',effects:{onRetire:[
   {op:'retireLifeHandOrReturn',optional:true,life:3,hand:2}]}};
 assert.throws(()=>createUniversalPack({id:'bad-gerard',cards:[bare]}),
  /invalid retirement life or hand return/);
 const required=['BLC-4-005','BLC-1-093'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='yellow'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,11)];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const retire=(seed,prep)=>{
  const board=main(deck,seed);
  const gerard=put(board.s,0,'BLC-4-005','front',0,true);
  const wall=put(board.s,1,'BLC-1-093','front',0,true);
  if(prep)prep(board.s,gerard);
  let s=board.s;
  for(let n=0;n<4&&s.phase!=='attack';n++)
   s=dispatchUniversalAction(board.packs,s,{type:'next'});
  s=dispatchUniversalAction(board.packs,s,{type:'attack',uid:gerard.uid});
  s=dispatchUniversalAction(board.packs,s,{type:'chooseBlock',uid:wall.uid});
  return {packs:board.packs,s,gerard};
 };
 const opened=retire(29910);
 assert.equal(opened.s.pending.kind,'effect-retire-life-or-hand');
 assert.equal(V2_PENDING_LABELS[opened.s.pending.kind],'退場時最多選一項');
 assert.deepEqual(opened.s.pending.modes,['life','hand']);
 assert.equal(legalUniversalActions(opened.packs,opened.s).some(a=>a.mode==='skip'),true);
 aiOk(opened.packs,opened.s);
 const lives=opened.s.players[0].life.length;
 const reveals=opened.s.publicReveals.length;
 const chosen=opened.s.players[0].life[0];
 let hidden=dispatchUniversalAction(opened.packs,opened.s,{type:'chooseRetireLifeOrHand',mode:'life'});
 assert.equal(hidden.pending.kind,'effect-hidden-life-hand');
 const priv=universalPrivateChoices(opened.packs,hidden,0);
 assert.ok(priv.options.length>=1);
 assert.ok(priv.options.every(o=>o.card===null));
 assert.equal(universalPrivateChoices(opened.packs,hidden,1),null);
 assert.deepEqual(universalPublicView(opened.packs,hidden).pending,{kind:'effect-hidden-life-hand',player:0});
 hidden=dispatchUniversalAction(opened.packs,hidden,{type:'chooseHiddenLifeHand',uid:chosen.uid});
 assert.equal(hidden.pending.kind,'effect-rest-reenter');
 assert.equal(hidden.players[0].life.length,lives-1);
 assert.equal(hidden.players[0].hand.some(c=>c.uid===chosen.uid),true);
 assert.equal(hidden.publicReveals.length,reveals);
 assert.equal(hidden.status,'playing');
 const spot=legalUniversalActions(opened.packs,hidden).find(a=>
  a.type==='chooseRestReenter'&&a.replaceUid===undefined);
 assert.ok(spot);
 let stood=dispatchUniversalAction(opened.packs,hidden,spot);
 const live=[...stood.players[0].front,...stood.players[0].energy].find(c=>c?.uid===opened.gerard.uid);
 assert.equal(live.ready,false);
 assert.equal(live.entryTurn,stood.turn);
 assert.equal(stood.pending,null);
 assert.equal(stood.status,'playing');
 const declined=retire(29911);
 let skipped=dispatchUniversalAction(declined.packs,declined.s,{type:'chooseRetireLifeOrHand',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===declined.gerard.uid),true);
 assert.equal(skipped.status,'playing');
 const short=retire(29912,s=>{
  while(s.players[0].hand.length>1)s.players[0].deck.push(s.players[0].hand.pop());
 });
 assert.deepEqual(short.s.pending.modes,['life']);
 assert.equal(legalUniversalActions(short.packs,short.s).some(a=>a.mode==='hand'),false);
 const last=retire(29913,s=>{
  while(s.players[0].life.length>1)s.players[0].deck.push(s.players[0].life.pop());
 });
 const only=last.s.players[0].life[0];
 let dying=dispatchUniversalAction(last.packs,last.s,{type:'chooseRetireLifeOrHand',mode:'life'});
 dying=dispatchUniversalAction(last.packs,dying,{type:'chooseHiddenLifeHand',uid:only.uid});
 assert.equal(dying.pending.kind,'effect-rest-reenter');
 assert.equal(dying.players[0].life.length,0);
 assert.equal(dying.status,'playing');
 const place=legalUniversalActions(last.packs,dying).find(a=>
  a.type==='chooseRestReenter'&&a.replaceUid===undefined);
 dying=dispatchUniversalAction(last.packs,dying,place);
 assert.equal(dying.status,'finished');
 assert.equal(dying.endReason,'life-zero');
 assert.equal(dying.winner,1);
 assert.equal([...dying.players[0].front,...dying.players[0].energy].find(c=>c?.uid===last.gerard.uid).ready,false);
 const back=retire(29914);
 const first=back.s.players[0].hand[0],second=back.s.players[0].hand[1];
 let paid=dispatchUniversalAction(back.packs,back.s,{type:'chooseRetireLifeOrHand',mode:'hand'});
 assert.equal(paid.pending.kind,'effect-hand-two-outside');
 const seen=universalPrivateChoices(back.packs,paid,0);
 assert.equal(seen.options.some(o=>o.card&&o.card.cardId===first.cardId),true);
 assert.equal(universalPrivateChoices(back.packs,paid,1),null);
 paid=dispatchUniversalAction(back.packs,paid,{type:'chooseHandTwoOutside',uid:first.uid});
 assert.deepEqual(paid.pending.selected,[first.uid]);
 paid=dispatchUniversalAction(back.packs,paid,{type:'chooseHandTwoOutside',uid:second.uid});
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].hand.some(c=>c.uid===back.gerard.uid),true);
 assert.equal(paid.players[0].outside.some(c=>c.uid===first.uid),true);
 assert.equal(paid.players[0].outside.some(c=>c.uid===second.uid),true);
 assert.equal(paid.status,'playing');
 const quiet=retire(29915,(s,gerard)=>grantContinuousState(s,{
  kind:'originalEffectsDisabled',controller:0,sourceUid:gerard.uid,targetUid:gerard.uid,
  sourceLinked:false,until:{player:0,phase:'start',edge:'start'}}));
 assert.equal(quiet.s.pending,null);
 assert.equal(quiet.s.players[0].outside.some(c=>c.uid===quiet.gerard.uid),true);
 assert.equal(quiet.s.status,'playing');
 assert.equal(assertUniversalMatch(opened.packs,stood),true);
 assert.equal(assertUniversalMatch(declined.packs,skipped),true);
 assert.equal(assertUniversalMatch(short.packs,short.s),true);
 assert.equal(assertUniversalMatch(last.packs,dying),true);
 assert.equal(assertUniversalMatch(back.packs,paid),true);
 assert.equal(assertUniversalMatch(quiet.packs,quiet.s),true);
});

test('BLC-4-015 returns from outside to the deck bottom and retires another front character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-015');
 assert.equal(printed.number,'EX15BT/BLC-4-015');
 assert.equal(printed.nameJa,'ユーハバッハ');
 assert.equal(printed.effect,'此卡被送至場外時，將此卡從場外放至自己牌庫底。啟動・主要〔前線／每回合1次〕：使自己場上另1個角色退場；如此則將此角色改為Active，查看牌庫頂3張，將其中1張加入手牌，其餘依任意順序放回牌庫底。若以此效果使所需能量4以上的己方角色退場，此角色到自己下次回合開始前BP+1000。');
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'get');
 const card=bleach.cards['BLC-4-015'];
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.outsideToDeckBottom,true);
 assert.equal(card.energy,5);
 assert.equal(card.bp,4000);
 assert.deepEqual(card.traits,['星十字騎士團']);
 assert.deepEqual(card.mainAbility,{op:'frontOnceRetireActiveLook',oncePerTurn:true,
  frontOnly:true,look:3,minEnergy:4,bp:1000});
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-015');
 assert.equal(entry.definition.gen,1);
 assert.equal(entry.sourceRecord.gen,1);
 assert.equal(entry.sourceRecord.legacyImportedGen,undefined);
 assert.equal(V2_PENDING_LABELS['effect-front-retire-look'],'使自己場上另1個角色退場');
 assert.equal(V2_PENDING_LABELS['effect-top-hand-one'],'將查看的1張加入手牌');
 const bare={id:'X',name:'n',color:'yellow',type:'character',energy:5,ap:1,bp:4000,gen:1,
  traits:[],trigger:'get',implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'bad-outside-bottom',cards:[{
  ...bare,effects:{onPlay:[{op:'draw',count:1}]},outsideToDeckBottom:true}]}),/invalid outside-to-deck-bottom/);
 const deck=realDeck(['BLC-4-015','BLC-1-002','BLC-1-005','BLC-4-004','BLC-1-028','BLC-4-011','BLC-1-051','BLC-1-024','BLC-1-017','BLC-1-093'],'yellow');
 function toAttack(packs,s,who=0){
  let n=0;
  while(!(s.active===who&&s.phase==='attack')&&n<20){
   if(s.pending?.kind==='end-hand-limit'){
    const uid=s.players[s.pending.player].hand[0].uid;
    s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid});
   }else if(s.pending)throw Error('blocked '+s.pending.kind);
   else s=dispatchUniversalAction(packs,s,{type:'next'});
   n++;
  }
  assert.equal(s.active,who);
  assert.equal(s.phase,'attack');
  return s;
 }
 function onlyTop(s,ids){
  const cards=setTop(s,0,ids);
  s.players[0].removed.push(...s.players[0].deck.splice(ids.length));
  return cards;
 }
 const fieldLoss=main(deck,29920);
 const lost=put(fieldLoss.s,0,'BLC-4-015','front',0,true);
 const wall=put(fieldLoss.s,1,'BLC-1-093','front',0,true);
 let battle=toAttack(fieldLoss.packs,fieldLoss.s);
 battle=dispatchUniversalAction(fieldLoss.packs,battle,{type:'attack',uid:lost.uid});
 battle=dispatchUniversalAction(fieldLoss.packs,battle,{type:'chooseBlock',uid:wall.uid});
 assert.equal(battle.players[0].outside.some(c=>c.uid===lost.uid),false);
 assert.equal(battle.players[0].deck.at(-1).uid,lost.uid);
 assert.equal(battle.zoneMoveEvents.some(e=>e.uid===lost.uid&&e.from==='front'&&e.to==='outside'&&e.reason==='retirement'),true);
 assert.equal(battle.zoneMoveEvents.some(e=>e.uid===lost.uid&&e.from==='outside'&&e.to==='deck'&&e.reason==='own-effect'&&e.sourceUid===lost.uid),true);
 const silenced=main(deck,29921);
 const quiet=put(silenced.s,0,'BLC-4-015','front',0,true);
 const quietWall=put(silenced.s,1,'BLC-1-093','front',0,true);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:quiet.uid,targetUid:quiet.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 let quietBattle=toAttack(silenced.packs,silenced.s);
 quietBattle=dispatchUniversalAction(silenced.packs,quietBattle,{type:'attack',uid:quiet.uid});
 quietBattle=dispatchUniversalAction(silenced.packs,quietBattle,{type:'chooseBlock',uid:quietWall.uid});
 assert.equal(quietBattle.players[0].outside.some(c=>c.uid===quiet.uid),true);
 assert.equal(quietBattle.players[0].deck.at(-1)?.uid===quiet.uid,false);
 const discarded=main(deck,29922);
 for(const [i,id] of ['BLC-1-002','BLC-1-005','BLC-1-017'].entries())
  put(discarded.s,0,id,'energy',i);
 const fromHand=take(discarded.s,0,'BLC-4-015');
 const jugram=take(discarded.s,0,'BLC-4-011');
 discarded.s.players[0].hand.push(fromHand,jugram);
 let paidPlay=dispatchUniversalAction(discarded.packs,discarded.s,{type:'play',uid:jugram.uid,line:'front',slot:0});
 assert.equal(paidPlay.pending.kind,'effect-discard');
 paidPlay=dispatchUniversalAction(discarded.packs,paidPlay,{type:'chooseDiscard',uid:fromHand.uid});
 assert.equal(paidPlay.players[0].hand.some(c=>c.uid===fromHand.uid),false);
 assert.equal(paidPlay.players[0].outside.some(c=>c.uid===fromHand.uid),false);
 assert.equal(paidPlay.players[0].deck.at(-1).uid,fromHand.uid);
 assert.equal(paidPlay.zoneMoveEvents.some(e=>e.uid===fromHand.uid&&e.from==='hand'&&e.to==='outside'),true);
 assert.equal(paidPlay.zoneMoveEvents.some(e=>e.uid===fromHand.uid&&e.from==='outside'&&e.to==='deck'&&e.sourceUid===fromHand.uid),true);
 const milled=main(deck,29923);
 const rukia=put(milled.s,0,'BLC-1-051','front',0,true);
 const millWall=put(milled.s,1,'BLC-1-093','front',0,true);
 const milledYhwach=take(milled.s,0,'BLC-4-015');
 const stayed=take(milled.s,0,'BLC-1-002');
 milled.s.players[0].deck.unshift(milledYhwach,stayed);
 let millBattle=toAttack(milled.packs,milled.s);
 millBattle=dispatchUniversalAction(milled.packs,millBattle,{type:'attack',uid:rukia.uid});
 millBattle=dispatchUniversalAction(milled.packs,millBattle,{type:'chooseBlock',uid:millWall.uid});
 assert.equal(millBattle.players[0].deck.at(-1).uid,milledYhwach.uid);
 assert.equal(millBattle.players[0].outside.some(c=>c.uid===milledYhwach.uid),false);
 assert.equal(millBattle.players[0].outside.some(c=>c.uid===stayed.uid),true);
 function lifeHit(seed){
  const board=main(deck,seed);
  const yhwach=take(board.s,0,'BLC-4-015');
  board.s.players[0].deck.push(...board.s.players[0].life.splice(0));
  board.s.players[0].life.unshift(yhwach);
  const attacker=put(board.s,1,'BLC-1-093','front',0,true);
  let turn=toAttack(board.packs,board.s,1);
  turn=dispatchUniversalAction(board.packs,turn,{type:'attack',uid:attacker.uid});
  turn=dispatchUniversalAction(board.packs,turn,{type:'chooseBlock',uid:null});
  assert.equal(turn.pending.kind,'life-trigger');
  assert.equal(turn.pending.trigger,'get');
  assert.equal(turn.players[0].outside.some(c=>c.uid===yhwach.uid),true);
  assert.equal(turn.players[0].deck.at(-1)?.uid===yhwach.uid,false);
  return {board,turn,yhwach};
 }
 const skipped=lifeHit(29924);
 const afterSkip=dispatchUniversalAction(skipped.board.packs,skipped.turn,{type:'chooseTrigger',mode:'skip'});
 assert.equal(afterSkip.players[0].hand.some(c=>c.uid===skipped.yhwach.uid),false);
 assert.equal(afterSkip.players[0].outside.some(c=>c.uid===skipped.yhwach.uid),false);
 assert.equal(afterSkip.players[0].deck.at(-1).uid,skipped.yhwach.uid);
 assert.equal(afterSkip.status,'finished');
 assert.equal(afterSkip.endReason,'life-zero');
 const taken=lifeHit(29925);
 const afterGet=dispatchUniversalAction(taken.board.packs,taken.turn,{type:'chooseTrigger',mode:'get'});
 assert.equal(afterGet.players[0].hand.some(c=>c.uid===taken.yhwach.uid),true);
 assert.equal(afterGet.players[0].outside.some(c=>c.uid===taken.yhwach.uid),false);
 assert.equal(afterGet.players[0].deck.some(c=>c.uid===taken.yhwach.uid),false);
 assert.equal(afterGet.status,'finished');
 const raided=main(deck,29926);
 for(const [i,id] of ['BLC-1-017','BLC-1-017','BLC-1-002','BLC-1-005'].entries())
  put(raided.s,0,id,'energy',i);
 const base=put(raided.s,0,'BLC-4-015','front',0,true);
 const rider=take(raided.s,0,'BLC-1-024');
 raided.s.players[0].hand.push(rider);
 let stacked=dispatchUniversalAction(raided.packs,raided.s,{type:'raid',uid:rider.uid,baseUid:base.uid,slot:0});
 assert.equal(stacked.pending.kind,'effect-choice-mode');
 stacked=dispatchUniversalAction(raided.packs,stacked,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(stacked.pending,null);
 assert.equal(stacked.players[0].front[0].stack[0].uid,base.uid);
 const raidWall=put(stacked,1,'BLC-1-093','front',0,true);
 let raidBattle=toAttack(raided.packs,stacked);
 raidBattle=dispatchUniversalAction(raided.packs,raidBattle,{type:'attack',uid:stacked.players[0].front[0].uid});
 raidBattle=dispatchUniversalAction(raided.packs,raidBattle,{type:'chooseBlock',uid:raidWall.uid});
 assert.equal(raidBattle.players[0].outside.some(c=>c.cardId==='BLC-1-024'),true);
 assert.equal(raidBattle.players[0].outside.some(c=>c.uid===base.uid),false);
 assert.equal(raidBattle.players[0].deck.at(-1).uid,base.uid);
 assert.equal(raidBattle.zoneMoveEvents.some(e=>e.uid===base.uid&&e.from==='raid-under'&&e.to==='outside'),true);
 const front=main(deck,29927);
 const actor=put(front.s,0,'BLC-4-015','front',0,false);
 const high=put(front.s,0,'BLC-4-004','front',1,true);
 const spare=put(front.s,0,'BLC-1-002','front',2,true);
 const looked=onlyTop(front.s,['BLC-1-017','BLC-1-017','BLC-1-017']);
 assert.equal(legalUniversalActions(front.packs,front.s).some(a=>a.type==='activate'&&a.mode==='frontOnceRetireLook'&&a.uid===actor.uid),true);
 let retiring=dispatchUniversalAction(front.packs,front.s,{type:'activate',uid:actor.uid,mode:'frontOnceRetireLook'});
 assert.equal(retiring.pending.kind,'effect-front-retire-look');
 assert.equal(legalUniversalActions(front.packs,retiring).some(a=>a.uid===null),false);
 assert.equal(legalUniversalActions(front.packs,retiring).some(a=>a.uid===high.uid),true);
 assert.equal(legalUniversalActions(front.packs,retiring).some(a=>a.uid===actor.uid),false);
 assert.equal(universalPrivateChoices(front.packs,retiring,1),null);
 aiOk(front.packs,retiring);
 assert.throws(()=>dispatchUniversalAction(front.packs,retiring,{type:'chooseFrontRetireLook',uid:null}),/Action not currently legal/);
 retiring=dispatchUniversalAction(front.packs,retiring,{type:'chooseFrontRetireLook',uid:high.uid});
 assert.equal(retiring.pending.kind,'effect-top-hand-one');
 assert.equal(live(retiring,0,actor.uid).ready,true);
 assert.equal(universalBp(front.packs,retiring,live(retiring,0,actor.uid)),4000);
 assert.equal(retiring.players[0].outside.some(c=>c.uid===high.uid),true);
 const seen=universalPrivateChoices(front.packs,retiring,0);
 assert.equal(seen.options.length,3);
 assert.equal(universalPrivateChoices(front.packs,retiring,1),null);
 aiOk(front.packs,retiring);
 retiring=dispatchUniversalAction(front.packs,retiring,{type:'chooseTopHandOne',uid:looked[1].uid});
 assert.equal(retiring.pending.kind,'effect-top-order');
 assert.equal(retiring.players[0].hand.some(c=>c.uid===looked[1].uid),true);
 retiring=orderBottom(front.packs,retiring);
 assert.equal(retiring.pending,null);
 assert.equal(universalBp(front.packs,retiring,live(retiring,0,actor.uid)),5000);
 assert.equal(live(retiring,0,actor.uid).buffs.some(b=>b.bp===1000&&b.untilOwnTurnStart===retiring.players[0].ownTurns+1),true);
 assert.equal(legalUniversalActions(front.packs,retiring).some(a=>a.type==='activate'&&a.uid===actor.uid),false);
 let later=toAttack(front.packs,retiring,1);
 assert.equal(universalBp(front.packs,later,live(later,0,actor.uid)),5000);
 while(later.active!==0||later.phase!=='main'){
  if(later.pending?.kind==='end-hand-limit'){
   const uid=later.players[later.pending.player].hand[0].uid;
   later=dispatchUniversalAction(front.packs,later,{type:'chooseHandLimit',uid});
  }else if(later.pending)throw Error('return '+later.pending.kind);
  else later=dispatchUniversalAction(front.packs,later,{type:'next'});
 }
 assert.equal(universalBp(front.packs,later,live(later,0,actor.uid)),4000);
 assert.equal(legalUniversalActions(front.packs,later).some(a=>a.type==='activate'&&a.mode==='frontOnceRetireLook'&&a.uid===actor.uid),true);
 const low=main(deck,29928);
 const lowActor=put(low.s,0,'BLC-4-015','front',0,false);
 const cheap=put(low.s,0,'BLC-1-002','energy',0,true);
 onlyTop(low.s,[]);
 let lowRetire=dispatchUniversalAction(low.packs,low.s,{type:'activate',uid:lowActor.uid,mode:'frontOnceRetireLook'});
 lowRetire=dispatchUniversalAction(low.packs,lowRetire,{type:'chooseFrontRetireLook',uid:cheap.uid});
 assert.equal(lowRetire.pending,null);
 assert.equal(live(lowRetire,0,lowActor.uid).ready,true);
 assert.equal(universalBp(low.packs,lowRetire,live(lowRetire,0,lowActor.uid)),4000);
 const one=main(deck,29929);
 const oneActor=put(one.s,0,'BLC-4-015','front',0,false);
 const oneFodder=put(one.s,0,'BLC-4-004','front',1,true);
 const lone=onlyTop(one.s,['BLC-1-017']);
 let oneRetire=dispatchUniversalAction(one.packs,one.s,{type:'activate',uid:oneActor.uid,mode:'frontOnceRetireLook'});
 oneRetire=dispatchUniversalAction(one.packs,oneRetire,{type:'chooseFrontRetireLook',uid:oneFodder.uid});
 assert.equal(oneRetire.pending.kind,'effect-top-hand-one');
 oneRetire=dispatchUniversalAction(one.packs,oneRetire,{type:'chooseTopHandOne',uid:lone[0].uid});
 assert.equal(oneRetire.pending,null);
 assert.equal(oneRetire.players[0].hand.some(c=>c.uid===lone[0].uid),true);
 assert.equal(oneRetire.players[0].deck.length,0);
 assert.equal(universalBp(one.packs,oneRetire,live(oneRetire,0,oneActor.uid)),5000);
 const pair=main(deck,29930);
 const pairActor=put(pair.s,0,'BLC-4-015','front',0,false);
 const pairFodder=put(pair.s,0,'BLC-4-004','front',1,true);
 const pairWindow=onlyTop(pair.s,['BLC-1-017','BLC-1-005']);
 let pairRetire=dispatchUniversalAction(pair.packs,pair.s,{type:'activate',uid:pairActor.uid,mode:'frontOnceRetireLook'});
 pairRetire=dispatchUniversalAction(pair.packs,pairRetire,{type:'chooseFrontRetireLook',uid:pairFodder.uid});
 pairRetire=dispatchUniversalAction(pair.packs,pairRetire,{type:'chooseTopHandOne',uid:pairWindow[0].uid});
 assert.equal(pairRetire.pending,null);
 assert.equal(pairRetire.players[0].deck.at(-1).uid,pairWindow[1].uid);
 assert.equal(universalBp(pair.packs,pairRetire,live(pairRetire,0,pairActor.uid)),5000);
 const boosted=main(deck,29931);
 const boostActor=put(boosted.s,0,'BLC-4-015','front',0,false);
 const kilge=put(boosted.s,0,'BLC-1-005','front',1,true);
 const entryJugram=put(boosted.s,0,'BLC-4-011','energy',0,true);
 entryJugram.entryTurn=boosted.s.turn;
 onlyTop(boosted.s,[]);
 let grant=dispatchUniversalAction(boosted.packs,boosted.s,{type:'activate',uid:entryJugram.uid,mode:'oncePay'});
 assert.equal(grant.pending.kind,'effect-required-energy');
 grant=dispatchUniversalAction(boosted.packs,grant,{type:'chooseRequiredEnergy',uid:kilge.uid});
 assert.equal(effectiveRequiredEnergy(boosted.packs,grant,live(grant,0,kilge.uid)),4);
 grant=dispatchUniversalAction(boosted.packs,grant,{type:'activate',uid:boostActor.uid,mode:'frontOnceRetireLook'});
 grant=dispatchUniversalAction(boosted.packs,grant,{type:'chooseFrontRetireLook',uid:kilge.uid});
 assert.equal(universalBp(boosted.packs,grant,live(grant,0,boostActor.uid)),5000);
 const copies=main(deck,29932);
 const firstCopy=put(copies.s,0,'BLC-4-015','front',0,false);
 const secondCopy=put(copies.s,0,'BLC-4-015','front',1,false);
 const firstFodder=put(copies.s,0,'BLC-1-002','front',2,true);
 const secondFodder=put(copies.s,0,'BLC-1-005','energy',0,true);
 onlyTop(copies.s,[]);
 let firstUse=dispatchUniversalAction(copies.packs,copies.s,{type:'activate',uid:firstCopy.uid,mode:'frontOnceRetireLook'});
 firstUse=dispatchUniversalAction(copies.packs,firstUse,{type:'chooseFrontRetireLook',uid:firstFodder.uid});
 assert.equal(legalUniversalActions(copies.packs,firstUse).some(a=>a.uid===firstCopy.uid&&a.mode==='frontOnceRetireLook'),false);
 assert.equal(legalUniversalActions(copies.packs,firstUse).some(a=>a.uid===secondCopy.uid&&a.mode==='frontOnceRetireLook'),true);
 firstUse=dispatchUniversalAction(copies.packs,firstUse,{type:'activate',uid:secondCopy.uid,mode:'frontOnceRetireLook'});
 firstUse=dispatchUniversalAction(copies.packs,firstUse,{type:'chooseFrontRetireLook',uid:secondFodder.uid});
 assert.equal(live(firstUse,0,firstCopy.uid).ready,true);
 assert.equal(live(firstUse,0,secondCopy.uid).ready,true);
 const energyLine=main(deck,29933);
 const energyCopy=put(energyLine.s,0,'BLC-4-015','energy',0,true);
 put(energyLine.s,0,'BLC-1-002','front',0,true);
 assert.equal(legalUniversalActions(energyLine.packs,energyLine.s).some(a=>a.mode==='frontOnceRetireLook'),false);
 const fieldOnly=main(deck,29934);
 put(fieldOnly.s,0,'BLC-4-015','front',0,true);
 put(fieldOnly.s,0,'BLC-1-028','energy',0,true);
 assert.equal(legalUniversalActions(fieldOnly.packs,fieldOnly.s).some(a=>a.mode==='frontOnceRetireLook'),false);
 const locked=main(deck,29935);
 const lockedCopy=put(locked.s,0,'BLC-4-015','front',0,true);
 put(locked.s,0,'BLC-1-002','front',1,true);
 grantContinuousState(locked.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:lockedCopy.uid,targetUid:lockedCopy.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 assert.equal(legalUniversalActions(locked.packs,locked.s).some(a=>a.mode==='frontOnceRetireLook'),false);
 assert.equal(assertUniversalMatch(fieldLoss.packs,battle),true);
 assert.equal(assertUniversalMatch(silenced.packs,quietBattle),true);
 assert.equal(assertUniversalMatch(discarded.packs,paidPlay),true);
 assert.equal(assertUniversalMatch(milled.packs,millBattle),true);
 assert.equal(assertUniversalMatch(skipped.board.packs,afterSkip),true);
 assert.equal(assertUniversalMatch(taken.board.packs,afterGet),true);
 assert.equal(assertUniversalMatch(raided.packs,raidBattle),true);
 assert.equal(assertUniversalMatch(front.packs,later),true);
 assert.equal(assertUniversalMatch(low.packs,lowRetire),true);
 assert.equal(assertUniversalMatch(one.packs,oneRetire),true);
 assert.equal(assertUniversalMatch(pair.packs,pairRetire),true);
 assert.equal(assertUniversalMatch(boosted.packs,grant),true);
 assert.equal(assertUniversalMatch(copies.packs,firstUse),true);
 assert.equal(assertUniversalMatch(energyLine.packs,energyLine.s),true);
 assert.equal(assertUniversalMatch(fieldOnly.packs,fieldOnly.s),true);
 assert.equal(assertUniversalMatch(locked.packs,locked.s),true);
 void spare;
 void energyCopy;
});

test('BLC-4-055 removes another character and chooses a lasting discount or two buffs',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-055');
 assert.equal(printed.number,'EX15BT/BLC-4-055');
 assert.equal(printed.nameJa,'兵主部 一兵衛');
 assert.equal(printed.effect,'登場時：可將自己場上另1個角色除外；如此則選1項。①本回合下一張從手牌使用、具有「零番隊」特徵的卡或《靈王宮》，消費AP−1。②最多選自己場上另2個具有「零番隊」特徵的角色，本回合BP+2000。先使用不符合條件的卡不會耗掉減費效果。');
 assert.equal(printed.gen,3);
 assert.equal(printed.trigger,null);
 const card=bleach.cards['BLC-4-055'];
 assert.equal(card.gen,2);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.energy,3);
 assert.deepEqual(card.traits,['零番隊']);
 assert.equal(card.effects.onPlay[0].op,'optionalRemoveOwnOtherThen');
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-055');
 assert.equal(entry.definition.gen,2);
 assert.equal(entry.sourceRecord.gen,2);
 assert.equal(entry.sourceRecord.legacyImportedGen,3);
 assert.equal(V2_PENDING_LABELS['effect-remove-own-other'],'將自己場上另1個角色除外');
 assert.equal(V2_PENDING_LABELS['effect-buff-other-trait'],'選擇其他己方角色');
 const bare={id:'X',name:'n',color:'purple',type:'character',energy:3,ap:1,bp:3000,gen:2,
  traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-remove',cards:[{
  ...bare,effects:{onPlay:[{op:'optionalRemoveOwnOtherThen',then:[{op:'draw',count:1}]}]}
 }]}),/invalid optional own-character removal/);
 assert.throws(()=>createUniversalPack({id:'bad-or-filter',cards:[{
  ...bare,effects:{onPlay:[{op:'nextEligibleHandPlayApDiscount',filter:{anyOfTraitOrName:true,trait:'零番隊'}}]}
 }]}),/Invalid printed hand-play discount filter/);
 const deck=realDeck(['BLC-4-055','BLC-1-051','BLC-2-056','BLC-2-058','BLC-2-059','BLC-1-035','BLC-1-061','BLC-1-108'],'purple');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const playFront=(packs,s,uid,slot=0)=>legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&a.line==='front'&&a.slot===slot&&a.replaceUid===undefined);
 function fuel(s){
  put(s,0,'BLC-2-056','energy',0,true);
  put(s,0,'BLC-2-059','energy',1,true);
  put(s,0,'BLC-1-108','energy',2,true);
 }
 const removed=main(deck,29940);
 fuel(removed.s);
 const victim=put(removed.s,0,'BLC-1-051','front',1,true);
 const sidelined=removed.s.players[0].energy.find(c=>c?.cardId==='BLC-2-056');
 const top=setTop(removed.s,0,['BLC-1-035','BLC-1-061']);
 const actor=hold(removed.s,0,'BLC-4-055');
 const opening=playFront(removed.packs,removed.s,actor.uid);
 assert.ok(opening);
 let choosing=dispatchUniversalAction(removed.packs,removed.s,opening);
 assert.equal(choosing.pending.kind,'effect-remove-own-other');
 assert.equal(choosing.pending.choices.includes(victim.uid),true);
 assert.equal(choosing.pending.choices.includes(sidelined.uid),true);
 assert.equal(choosing.pending.choices.includes(actor.uid),false);
 assert.equal(choosing.pending.choices.some(uid=>choosing.players[0].energy.some(c=>c?.uid===uid&&c.cardId==='BLC-1-108')),false);
 assert.equal(legalUniversalActions(removed.packs,choosing).some(a=>a.uid===null),true);
 aiOk(removed.packs,choosing);
 choosing=dispatchUniversalAction(removed.packs,choosing,{type:'chooseRemoveOwnOther',uid:victim.uid});
 assert.equal(choosing.pending.kind,'effect-choice-mode');
 assert.equal(choosing.players[0].removed.some(c=>c.uid===victim.uid),true);
 assert.equal(choosing.players[0].outside.some(c=>c.uid===victim.uid),false);
 assert.equal(choosing.turnRetireEvents.some(e=>e.uid===victim.uid),false);
 assert.equal(choosing.zoneMoveEvents.some(e=>e.uid===victim.uid&&e.from==='front'&&e.to==='removed'&&e.reason==='own-effect'&&e.sourceUid===actor.uid),true);
 assert.equal(choosing.players[0].deck[0].uid,top[0].uid);
 assert.equal(choosing.players[0].deck[1].uid,top[1].uid);
 const declined=main(deck,29941);
 fuel(declined.s);
 const stayed=put(declined.s,0,'BLC-1-051','front',1,true);
 const decliner=hold(declined.s,0,'BLC-4-055');
 let skipped=dispatchUniversalAction(declined.packs,declined.s,playFront(declined.packs,declined.s,decliner.uid));
 skipped=dispatchUniversalAction(declined.packs,skipped,{type:'chooseRemoveOwnOther',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].front.some(c=>c?.uid===stayed.uid),true);
 assert.equal(skipped.continuousStates.length,0);
 const lonely=main(deck,29942);
 put(lonely.s,0,'BLC-1-108','energy',0,true);
 put(lonely.s,0,'BLC-1-108','energy',1,true);
 put(lonely.s,0,'BLC-1-108','energy',2,true);
 const alone=hold(lonely.s,0,'BLC-4-055');
 const entered=dispatchUniversalAction(lonely.packs,lonely.s,playFront(lonely.packs,lonely.s,alone.uid));
 assert.equal(entered.pending,null);
 const buffed=main(deck,29943);
 put(buffed.s,0,'BLC-2-058','energy',0,true);
 const one=put(buffed.s,0,'BLC-2-056','front',1,true);
 const two=put(buffed.s,0,'BLC-2-059','front',2,true);
 const plain=put(buffed.s,0,'BLC-1-051','energy',1,true);
 const buffer=hold(buffed.s,0,'BLC-4-055');
 let bonus=dispatchUniversalAction(buffed.packs,buffed.s,playFront(buffed.packs,buffed.s,buffer.uid));
 assert.equal(bonus.pending.choices.includes(plain.uid),true);
 assert.equal(bonus.pending.choices.includes(one.uid),true);
 bonus=dispatchUniversalAction(buffed.packs,bonus,{type:'chooseRemoveOwnOther',uid:plain.uid});
 bonus=dispatchUniversalAction(buffed.packs,bonus,{type:'chooseEffectMode',mode:'buff'});
 assert.equal(bonus.pending.kind,'effect-buff-other-trait');
 assert.equal(bonus.pending.choices.includes(one.uid),true);
 assert.equal(bonus.pending.choices.includes(two.uid),true);
 assert.equal(bonus.pending.choices.includes(buffer.uid),false);
 assert.equal(bonus.pending.choices.includes(plain.uid),false);
 aiOk(buffed.packs,bonus);
 bonus=dispatchUniversalAction(buffed.packs,bonus,{type:'chooseOtherTraitBuff',uid:one.uid});
 assert.equal(bonus.pending.kind,'effect-buff-other-trait');
 bonus=dispatchUniversalAction(buffed.packs,bonus,{type:'chooseOtherTraitBuff',uid:two.uid});
 assert.equal(bonus.pending,null);
 assert.equal(universalBp(buffed.packs,bonus,live(bonus,0,one.uid)),3500);
 assert.equal(universalBp(buffed.packs,bonus,live(bonus,0,two.uid)),4000);
 assert.equal(universalBp(buffed.packs,bonus,live(bonus,0,buffer.uid)),3000);
 let later=bonus,guard=0;
 while(!(later.turn>bonus.turn&&later.active===0&&later.phase==='main')&&guard<40){
  if(later.pending?.kind==='end-hand-limit'){
   const uid=later.players[later.pending.player].hand[0].uid;
   later=dispatchUniversalAction(buffed.packs,later,{type:'chooseHandLimit',uid});
  }else if(later.pending)throw Error('buff '+later.pending.kind);
  else later=dispatchUniversalAction(buffed.packs,later,{type:'next'});
  guard++;
 }
 assert.equal(universalBp(buffed.packs,later,live(later,0,one.uid)),1500);
 const partial=main(deck,29944);
 put(partial.s,0,'BLC-2-058','energy',0,true);
 const kept=put(partial.s,0,'BLC-2-056','front',1,true);
 const other=put(partial.s,0,'BLC-2-059','front',2,true);
 const fodder=put(partial.s,0,'BLC-1-051','energy',1,true);
 const partialActor=hold(partial.s,0,'BLC-4-055');
 let half=dispatchUniversalAction(partial.packs,partial.s,playFront(partial.packs,partial.s,partialActor.uid));
 half=dispatchUniversalAction(partial.packs,half,{type:'chooseRemoveOwnOther',uid:fodder.uid});
 half=dispatchUniversalAction(partial.packs,half,{type:'chooseEffectMode',mode:'buff'});
 half=dispatchUniversalAction(partial.packs,half,{type:'chooseOtherTraitBuff',uid:kept.uid});
 half=dispatchUniversalAction(partial.packs,half,{type:'chooseOtherTraitBuff',uid:null});
 assert.equal(half.pending,null);
 assert.equal(universalBp(partial.packs,half,live(half,0,kept.uid)),3500);
 assert.equal(universalBp(partial.packs,half,live(half,0,other.uid)),2000);
 const priced=main(deck,29945);
 put(priced.s,0,'BLC-1-108','energy',0,true);
 put(priced.s,0,'BLC-1-108','energy',1,true);
 put(priced.s,0,'BLC-1-108','energy',2,true);
 const tall=put(priced.s,0,'BLC-2-058','front',1,true);
 const pricer=hold(priced.s,0,'BLC-4-055');
 const orihime=hold(priced.s,0,'BLC-1-035');
 const squad=hold(priced.s,0,'BLC-2-056');
 let price=dispatchUniversalAction(priced.packs,priced.s,playFront(priced.packs,priced.s,pricer.uid));
 price=dispatchUniversalAction(priced.packs,price,{type:'chooseRemoveOwnOther',uid:tall.uid});
 price=dispatchUniversalAction(priced.packs,price,{type:'chooseEffectMode',mode:'discount'});
 assert.equal(price.pending,null);
 assert.equal(price.continuousStates.length,1);
 assert.equal(handPlayApPlan(price,0,bleach.cards['BLC-1-035']).cost,1);
 assert.equal(handPlayApPlan(price,0,bleach.cards['BLC-2-056']).cost,0);
 assert.equal(handPlayApPlan(price,0,bleach.cards['BLC-1-061']).cost,0);
 let aging=structuredClone(price);
 aging=dispatchUniversalAction(priced.packs,aging,{type:'next'});
 assert.equal(aging.phase,'attack');
 assert.equal(handPlayApPlan(aging,0,bleach.cards['BLC-2-056']).cost,0);
 aging=dispatchUniversalAction(priced.packs,aging,{type:'next'});
 assert.equal(handPlayApPlan(aging,0,bleach.cards['BLC-2-056']).cost,1);
 for(const ap of price.players[0].apCards)ap.ready=ap.inPlay;
 const before=price.continuousStates.length;
 price=dispatchUniversalAction(priced.packs,price,playFront(priced.packs,price,orihime.uid,1));
 assert.equal(price.continuousStates.length,before);
 assert.equal(price.players[0].hand.some(c=>c.uid===orihime.uid),true);
 for(const ap of price.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(priced.packs,price).some(a=>a.type==='play'&&a.uid===orihime.uid),false);
 const cheap=playFront(priced.packs,price,squad.uid,1);
 assert.ok(cheap);
 price=dispatchUniversalAction(priced.packs,price,cheap);
 assert.equal(price.continuousStates.length,0);
 assert.equal(price.players[0].front.some(c=>c?.uid===squad.uid),true);
 const palace=main(deck,29946);
 put(palace.s,0,'BLC-1-108','energy',0,true);
 put(palace.s,0,'BLC-1-108','energy',1,true);
 put(palace.s,0,'BLC-1-108','energy',2,true);
 const host=put(palace.s,0,'BLC-2-058','front',1,true);
 const hostActor=hold(palace.s,0,'BLC-4-055');
 const soul=hold(palace.s,0,'BLC-1-061');
 let soulPlay=dispatchUniversalAction(palace.packs,palace.s,playFront(palace.packs,palace.s,hostActor.uid));
 soulPlay=dispatchUniversalAction(palace.packs,soulPlay,{type:'chooseRemoveOwnOther',uid:host.uid});
 soulPlay=dispatchUniversalAction(palace.packs,soulPlay,{type:'chooseEffectMode',mode:'discount'});
 for(const ap of soulPlay.players[0].apCards)ap.ready=false;
 const fieldPlay=legalUniversalActions(palace.packs,soulPlay).find(a=>a.type==='play'&&a.uid===soul.uid&&a.line==='energy');
 assert.ok(fieldPlay);
 soulPlay=dispatchUniversalAction(palace.packs,soulPlay,fieldPlay);
 assert.equal(soulPlay.continuousStates.length,0);
 assert.equal(soulPlay.players[0].energy.some(c=>c?.uid===soul.uid),true);
 assert.equal(assertUniversalMatch(removed.packs,choosing),true);
 assert.equal(assertUniversalMatch(declined.packs,skipped),true);
 assert.equal(assertUniversalMatch(lonely.packs,entered),true);
 assert.equal(assertUniversalMatch(buffed.packs,later),true);
 assert.equal(assertUniversalMatch(partial.packs,half),true);
 assert.equal(assertUniversalMatch(priced.packs,price),true);
 assert.equal(assertUniversalMatch(palace.packs,soulPlay),true);
});

test('BLC-4-056 draws, may remove Squad Zero, and REST-plays after retirement',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-056');
 assert.equal(printed.number,'EX15BT/BLC-4-056');
 assert.equal(printed.nameJa,'兵主部 一兵衛');
 assert.equal(printed.effect,'登場時：抽1張牌；可將手牌中1張具有「零番隊」特徵的卡除外，如此則將此角色改為Active。退場時：將此卡置於除外區，可從手牌將最多1張紫色《黑崎一護》、《靈王宮》或具有「零番隊」特徵的卡以Rest登場，須為消費AP1且所需能量不超過0；自己除外區每有1種不同卡名的「零番隊」，此登場卡片的所需能量上限+1（也適用於《靈王宮》場地）。');
 assert.equal(printed.gen,1);
 assert.equal(printed.ap,2);
 assert.equal(printed.trigger,'get');
 const card=bleach.cards['BLC-4-056'];
 assert.equal(card.name,'兵主部 一兵衛');
 assert.equal(card.gen,1);
 assert.equal(card.triggerEffect,null);
 assert.equal(card.energy,4);
 assert.equal(card.ap,2);
 assert.equal(card.bp,4000);
 assert.deepEqual(card.traits,['零番隊']);
 assert.deepEqual(card.effects.onPlay.map(e=>e.op),['draw','optionalRemoveHandThen']);
 assert.deepEqual(card.effects.onPlay[1].then,[{op:'activeSelf'}]);
 assert.equal(card.effects.onRetire[0].op,'retireToRemovedHandRest');
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-056');
 assert.match(entry.evidence.reviewNote,/Q2343 \(2026-09-11\)/);
 assert.match(entry.evidence.reviewNote,/登場させるカード/);
 assert.equal(V2_PENDING_LABELS['effect-hand-rest-cap'],'從手牌將符合條件的卡以 Rest 登場');
 const bare={id:'X',name:'n',color:'purple',type:'character',energy:4,ap:2,bp:4000,gen:1,
  traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-rest',cards:[{...bare,effects:{onRetire:[{
  op:'retireToRemovedHandRest',color:'purple',ap:1,baseEnergy:0,per:2,trait:'零番隊',
  names:['黒崎 一護','霊王宮'],max:1}]}}]}),/invalid removed-area hand REST/);
 assert.throws(()=>createUniversalPack({id:'bad-active',cards:[{...bare,effects:{onAttack:[{
  op:'optionalRemoveHandThen',zone:'removed',filter:{field:'trait',value:'零番隊'},
  then:[{op:'activeSelf'}]}]}}]}),/only a character onPlay effect/);
 const deck=realDeck(['BLC-4-056','BLC-1-108','BLC-2-056','BLC-1-039','BLC-1-040','BLC-1-061',
  'BLC-1-051','BLC-1-035','BLC-2-059','BLC-1-093','BLC-1-034','BLC-1-043'],'purple');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const park=(s,p)=>s.players[p].deck.push(...s.players[p].hand.splice(0));
 function secondMain(seed){
  let {packs,s}=main(deck,seed);
  for(let i=0;i<16&&!(s.active===0&&s.players[0].ownTurns>=2&&s.phase==='main');i++){
   assert.equal(s.pending,null,s.pending&&s.pending.kind);
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step);s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
  return {packs,s};
 }
 function fuel(s){for(let slot=0;slot<4;slot++)put(s,0,'BLC-1-108','energy',slot);}
 function playIchibe(seed){
  const {packs,s}=secondMain(seed);
  fuel(s);park(s,0);setTop(s,0,['BLC-1-051']);
  const squad=hold(s,0,'BLC-2-056'),actor=hold(s,0,'BLC-4-056');
  const before=s.players[0].deck.length,ap=s.players[0].apCards.filter(c=>c.ready).length;
  const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid&&
   a.line==='front'&&a.slot===0);
  assert.ok(play);
  const entered=dispatchUniversalAction(packs,s,play);
  assert.equal(entered.players[0].deck.length,before-1);
  assert.equal(entered.players[0].apCards.filter(c=>c.ready).length,ap-2);
  assert.ok(entered.players[0].hand.some(c=>c.cardId==='BLC-1-051'));
  return {packs,entered,squad,actor};
 }
 const opened=playIchibe(29950);
 assert.equal(opened.entered.pending.kind,'effect-remove-hand');
 assert.deepEqual(opened.entered.pending.choices,[opened.squad.uid]);
 const hidden=universalPublicView(opened.packs,opened.entered,1);
 assert.equal(hidden.players[0].hand,null);
 assert.equal(JSON.stringify(hidden.players[0]).includes(opened.squad.uid),false);
 assert.deepEqual(hidden.pending,{kind:'effect-remove-hand',player:0});
 const ai=chooseUniversalAiAction(opened.packs,opened.entered,{difficulty:'hard'});
 assert.ok(legalUniversalActions(opened.packs,opened.entered).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 const choose=legalUniversalActions(opened.packs,opened.entered).find(a=>a.type==='chooseRemoveHand'&&a.uid===opened.squad.uid);
 const active=dispatchUniversalAction(opened.packs,opened.entered,choose);
 assert.equal(active.players[0].front[0].ready,true);
 assert.equal(active.players[0].front[0].uid,opened.actor.uid);
 assert.ok(active.players[0].removed.some(c=>c.uid===opened.squad.uid));
 assert.equal(active.players[0].outside.some(c=>c.uid===opened.squad.uid),false);
 assert.equal(active.turnRetireEvents.length,0);
 assert.equal(active.pending,null);
 const declinedBoard=playIchibe(29951);
 const skipped=dispatchUniversalAction(declinedBoard.packs,declinedBoard.entered,
  {type:'chooseRemoveHand',uid:null});
 assert.equal(skipped.players[0].front[0].ready,false);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===declinedBoard.squad.uid));
 assert.equal(skipped.players[0].removed.some(c=>c.uid===declinedBoard.squad.uid),false);
 const quiet=secondMain(29952);
 fuel(quiet.s);park(quiet.s,0);setTop(quiet.s,0,['BLC-1-051']);
 const plain=hold(quiet.s,0,'BLC-1-035'),lonely=hold(quiet.s,0,'BLC-4-056');
 const alone=dispatchUniversalAction(quiet.packs,quiet.s,legalUniversalActions(quiet.packs,quiet.s)
  .find(a=>a.type==='play'&&a.uid===lonely.uid&&a.line==='front'));
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].front[0].ready,false);
 assert.ok(alone.players[0].hand.some(c=>c.uid===plain.uid));
 function retireBoard(seed){
  const {packs,s}=main(deck,seed);
  park(s,0);
  const self=put(s,0,'BLC-4-056','front',0,true);
  const foe=put(s,1,'BLC-1-093','front',0,true);
  let cur=s;
  while(cur.phase!=='attack'){
   const step=legalUniversalActions(packs,cur).find(a=>a.type==='next');
   assert.ok(step);cur=dispatchUniversalAction(packs,cur,step);
  }
  return {packs,s:cur,self,foe};
 }
 function lose(board){
  let cur=dispatchUniversalAction(board.packs,board.s,{type:'attack',uid:board.self.uid});
  assert.equal(cur.pending.kind,'block');
  cur=dispatchUniversalAction(board.packs,cur,{type:'chooseBlock',uid:board.foe.uid},{actor:1});
  return cur;
 }
 const narrow=retireBoard(29953);
 const ichigo=hold(narrow.s,0,'BLC-1-039'),costly=hold(narrow.s,0,'BLC-1-040');
 const palace=hold(narrow.s,0,'BLC-1-061'),rukia=hold(narrow.s,0,'BLC-1-051');
 ichigo.buffs.push({requiredEnergy:2,untilTurn:narrow.s.turn});
 const lost=lose(narrow);
 assert.equal(lost.pending.kind,'effect-hand-rest-cap');
 assert.equal(lost.pending.cap,1);
 assert.ok(lost.players[0].removed.some(c=>c.uid===narrow.self.uid));
 assert.equal(lost.players[0].outside.some(c=>c.uid===narrow.self.uid),false);
 assert.equal(lost.turnRetireEvents.filter(e=>e.uid===narrow.self.uid).length,1);
 const ids=lost.pending.choices.map(uid=>lost.players[0].hand.find(c=>c.uid===uid).cardId).sort();
 assert.deepEqual(ids,['BLC-1-039','BLC-1-040']);
 const legal=legalUniversalActions(narrow.packs,lost);
 assert.equal(legal.some(a=>a.uid===palace.uid),false);
 assert.equal(legal.some(a=>a.uid===rukia.uid),false);
 assert.ok(legal.some(a=>a.uid===ichigo.uid&&a.line==='front'));
 assert.ok(legal.some(a=>a.uid===ichigo.uid&&a.line==='energy'));
 const apBefore=lost.players[0].apCards.filter(c=>c.ready).length;
 const rested=dispatchUniversalAction(narrow.packs,lost,legal.find(a=>a.uid===ichigo.uid&&a.line==='front'&&!a.replaceUid));
 assert.equal(rested.pending,null);
 assert.equal(rested.players[0].front.some(c=>c?.uid===ichigo.uid&&c.ready===false),true);
 assert.equal(rested.players[0].apCards.filter(c=>c.ready).length,apBefore);
 const wide=retireBoard(29954);
 const named=take(wide.s,0,'BLC-2-059');wide.s.players[0].removed.push(named);
 const soul=hold(wide.s,0,'BLC-1-061'),other=hold(wide.s,0,'BLC-1-051');
 const raised=lose(wide);
 assert.equal(raised.pending.cap,2);
 assert.ok(raised.pending.choices.includes(soul.uid));
 assert.equal(raised.pending.choices.includes(other.uid),false);
 const soulActs=legalUniversalActions(wide.packs,raised).filter(a=>a.uid===soul.uid);
 assert.ok(soulActs.length>=1);
 assert.ok(soulActs.every(a=>a.line==='energy'));
 const apSoul=raised.players[0].apCards.filter(c=>c.ready).length;
 const hosted=dispatchUniversalAction(wide.packs,raised,soulActs[0]);
 assert.equal(hosted.players[0].energy.some(c=>c?.uid===soul.uid&&c.ready===false),true);
 assert.equal(hosted.players[0].apCards.filter(c=>c.ready).length,apSoul);
 assert.equal(hosted.pending,null);
 const peeked=retireBoard(29955);
 const look=hold(peeked.s,0,'BLC-1-040');
 const looking=lose(peeked);
 const lookAct=legalUniversalActions(peeked.packs,looking).find(a=>a.uid===look.uid&&a.line==='energy'&&!a.replaceUid);
 const top=dispatchUniversalAction(peeked.packs,looking,lookAct);
 assert.equal(top.pending.kind,'private-top-choice');
 const placed=dispatchUniversalAction(peeked.packs,top,legalUniversalActions(peeked.packs,top)[0]);
 assert.equal(placed.pending,null);
 assert.equal(placed.players[0].energy.some(c=>c?.uid===look.uid&&c.ready===false),true);
 const passed=retireBoard(29956);
 const kept=hold(passed.s,0,'BLC-1-039');
 const offer=lose(passed);
 const stayed=dispatchUniversalAction(passed.packs,offer,{type:'chooseHandRestCap',uid:null});
 assert.equal(stayed.pending,null);
 assert.ok(stayed.players[0].hand.some(c=>c.uid===kept.uid));
 assert.ok(stayed.players[0].removed.some(c=>c.uid===passed.self.uid));
 const silenced=retireBoard(29957);
 hold(silenced.s,0,'BLC-1-039');
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:silenced.self.uid,targetUid:silenced.self.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const quietLoss=lose(silenced);
 assert.equal(quietLoss.pending,null);
 assert.ok(quietLoss.players[0].outside.some(c=>c.uid===silenced.self.uid));
 assert.equal(quietLoss.players[0].removed.some(c=>c.uid===silenced.self.uid),false);
 const swapped=main(deck,29958);
 park(swapped.s,0);
 const occupant=put(swapped.s,0,'BLC-4-056','energy',0,true);
 put(swapped.s,0,'BLC-1-034','energy',1);put(swapped.s,0,'BLC-1-043','energy',2);
 put(swapped.s,0,'BLC-1-035','energy',3);
 const incoming=hold(swapped.s,0,'BLC-1-039'),waiting=hold(swapped.s,0,'BLC-2-056');
 const replace=legalUniversalActions(swapped.packs,swapped.s).find(a=>a.type==='play'&&
  a.uid===incoming.uid&&a.line==='energy'&&a.replaceUid===occupant.uid);
 assert.ok(replace);
 const removedPlay=dispatchUniversalAction(swapped.packs,swapped.s,replace);
 assert.equal(removedPlay.pending,null);
 assert.ok(removedPlay.players[0].removed.some(c=>c.uid===occupant.uid));
 assert.equal(removedPlay.turnRetireEvents.some(e=>e.uid===occupant.uid),false);
 assert.ok(removedPlay.players[0].hand.some(c=>c.uid===waiting.uid));
 assert.equal(assertUniversalMatch(opened.packs,active),true);
 assert.equal(assertUniversalMatch(declinedBoard.packs,skipped),true);
 assert.equal(assertUniversalMatch(quiet.packs,alone),true);
 assert.equal(assertUniversalMatch(narrow.packs,rested),true);
 assert.equal(assertUniversalMatch(wide.packs,hosted),true);
 assert.equal(assertUniversalMatch(peeked.packs,placed),true);
 assert.equal(assertUniversalMatch(passed.packs,stayed),true);
 assert.equal(assertUniversalMatch(silenced.packs,quietLoss),true);
 assert.equal(assertUniversalMatch(swapped.packs,removedPlay),true);
});

test('BLC-4-041 retires at its own start and may sacrifice for Impact',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-041');
 assert.equal(printed.number,'EX15BT/BLC-4-041');
 assert.equal(printed.nameJa,'涅 ネム');
 assert.equal(printed.color,'blue');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,5000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'color');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.effect,'自己回合開始時，使此角色退場。登場時：若自己的前線有《涅繭利》，可使自己場上另1個角色退場（可以選涅繭利）；如此則將此角色改為Active，本回合獲得Impact(1)與「對方必須盡可能阻擋此角色的攻擊」。退場時：將此卡置於除外區。');
 const card=bleach.cards['BLC-4-041'];
 assert.equal(card.gen,1);
 assert.deepEqual(card.phaseEffects,[{phase:'start',edge:'start',turn:'own',then:[{op:'retireSelfAtOwnStart'}]}]);
 assert.deepEqual(card.triggerEffect,{op:'bounceOppFrontUnderBp',bp:3500});
 assert.deepEqual(card.effects.onPlay,[{op:'optionalRetireOtherIfFrontName',name:'涅 マユリ',then:[
  {op:'activeSelf'},{op:'grantSelfMustBlockThisTurn'},{op:'grantSelfImpactThisTurn',amount:1}
 ]}]);
 assert.deepEqual(card.effects.onRetire,[{op:'retireSelfToRemoved'}]);
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-041');
 assert.match(entry.evidence.reviewNote,/Q2321 \(2026-09-04\)/);
 assert.match(entry.evidence.reviewNote,/Q2322 \(2026-09-04\)/);
 assert.equal(V2_PENDING_LABELS['effect-retire-other-front-name'],'可將自己場上另1個角色退場');
 const bare={id:'X',name:'n',color:'blue',type:'character',energy:4,ap:1,bp:5000,gen:1,
  traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-start',cards:[{...bare,phaseEffects:[
  {phase:'main',edge:'start',turn:'own',then:[{op:'retireSelfAtOwnStart'}]}
 ]}]}),/invalid own-start true self retirement/);
 assert.throws(()=>createUniversalPack({id:'bad-reward',cards:[{...bare,effects:{onPlay:[{
  op:'optionalRetireOtherIfFrontName',name:'涅 マユリ',then:[{op:'activeSelf'}]
 }]}}]}),/invalid front-name retirement reward/);
 const deck=realDeck(['BLC-4-041','BLC-2-036','BLC-2-031','BLC-2-023','BLC-2-025','BLC-2-044','BLC-2-037'],'blue');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const park=(s,p)=>s.players[p].deck.push(...s.players[p].hand.splice(0));
 function secondMain(seed){
  let {packs,s}=main(deck,seed);
  for(let i=0;i<16&&!(s.active===0&&s.players[0].ownTurns>=2&&s.phase==='main');i++){
   assert.equal(s.pending,null,s.pending&&s.pending.kind);
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step);s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
  park(s,0);park(s,1);
  return {packs,s};
 }
 function advance(packs,s,pred){
  for(let i=0;i<16&&!pred(s);i++){
   assert.equal(s.pending,null,s.pending&&s.pending.kind);
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step,s.phase+':'+s.active);
   s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(pred(s),true,s.phase+':'+s.active+':'+s.turn);
  return s;
 }
 const hiddenMayuri=secondMain(29960);
 put(hiddenMayuri.s,0,'BLC-2-036','energy',0);
 put(hiddenMayuri.s,0,'BLC-2-023','energy',1);
 put(hiddenMayuri.s,0,'BLC-2-025','energy',2);
 put(hiddenMayuri.s,0,'BLC-2-031','energy',3);
 assert.equal(universalEnergyByColor(hiddenMayuri.packs,hiddenMayuri.s,0).blue>=4,true);
 const hiddenActor=hold(hiddenMayuri.s,0,'BLC-4-041');
 const hiddenPlay=legalUniversalActions(hiddenMayuri.packs,hiddenMayuri.s).find(a=>
  a.type==='play'&&a.uid===hiddenActor.uid&&a.line==='front'&&a.slot===0);
 assert.ok(hiddenPlay);
 const hiddenEntered=dispatchUniversalAction(hiddenMayuri.packs,hiddenMayuri.s,hiddenPlay);
 assert.equal(hiddenEntered.pending,null);
 assert.equal(live(hiddenEntered,0,hiddenActor.uid).ready,false);
 assert.equal(universalImpact(hiddenMayuri.packs,hiddenEntered,live(hiddenEntered,0,hiddenActor.uid)),0);
 assert.equal(live(hiddenEntered,0,hiddenActor.uid).mustBlockGranted,undefined);
 const board=secondMain(29961);
 const mayuri=put(board.s,0,'BLC-2-036','front',0,true);
 const other=put(board.s,0,'BLC-2-031','front',1,true);
 put(board.s,0,'BLC-2-023','energy',0);
 put(board.s,0,'BLC-2-025','energy',1);
 put(board.s,0,'BLC-2-037','energy',2);
 const fieldCard=put(board.s,0,'BLC-2-044','energy',3);
 const actor=hold(board.s,0,'BLC-4-041');
 const play=legalUniversalActions(board.packs,board.s).find(a=>a.type==='play'&&
  a.uid===actor.uid&&a.line==='front'&&a.slot===2);
 assert.ok(play);
 const entered=dispatchUniversalAction(board.packs,board.s,play);
 assert.equal(entered.pending.kind,'effect-retire-other-front-name');
 assert.equal(entered.pending.name,'涅 マユリ');
 assert.equal(entered.pending.choices.includes(mayuri.uid),true);
 assert.equal(entered.pending.choices.includes(other.uid),true);
 assert.equal(entered.pending.choices.includes(actor.uid),false);
 assert.equal(entered.pending.choices.includes(fieldCard.uid),false);
 const decline=legalUniversalActions(board.packs,entered).find(a=>
  a.type==='chooseRetireOtherFrontName'&&a.uid===null);
 assert.equal(uiActionLabel(decline,{pack:board.packs,state:entered}),'不退場');
 aiOk(board.packs,entered);
 const passed=secondMain(29962);
 const kept=put(passed.s,0,'BLC-2-036','front',0,true);
 put(passed.s,0,'BLC-2-023','energy',0);
 put(passed.s,0,'BLC-2-025','energy',1);
 put(passed.s,0,'BLC-2-031','energy',2);
 put(passed.s,0,'BLC-2-044','energy',3);
 const resting=hold(passed.s,0,'BLC-4-041');
 const restPlay=legalUniversalActions(passed.packs,passed.s).find(a=>a.type==='play'&&
  a.uid===resting.uid&&a.line==='front'&&a.slot===1);
 const asked=dispatchUniversalAction(passed.packs,passed.s,restPlay);
 const skipped=dispatchUniversalAction(passed.packs,asked,decline&&{type:'chooseRetireOtherFrontName',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,0,resting.uid).ready,false);
 assert.equal(universalImpact(passed.packs,skipped,live(skipped,0,resting.uid)),0);
 assert.ok(live(skipped,0,kept.uid));
 const picked=dispatchUniversalAction(board.packs,entered,{type:'chooseRetireOtherFrontName',uid:mayuri.uid});
 assert.equal(picked.pending,null);
 assert.ok(picked.players[0].outside.some(c=>c.uid===mayuri.uid));
 assert.equal(picked.players[0].removed.some(c=>c.uid===mayuri.uid),false);
 const nemu=live(picked,0,actor.uid);
 assert.equal(nemu.ready,true);
 assert.equal(universalImpact(board.packs,picked,nemu),1);
 assert.equal(nemu.mustBlockGranted.turn,picked.turn);
 assert.equal(nemu.mustBlockGranted.stamp,nemu.fieldEntryStamp);
 const quietLife=take(picked,1,'BLC-2-037');
 picked.players[1].life.unshift(quietLife);
 const blocker=put(picked,1,'BLC-2-025','front',0,true);
 const lives=picked.players[1].life.length;
 let battle=advance(board.packs,picked,s=>s.active===0&&s.phase==='attack');
 const swing=legalUniversalActions(board.packs,battle).find(a=>a.type==='attack'&&
  a.uid===actor.uid&&!a.targetUid);
 assert.ok(swing);
 battle=dispatchUniversalAction(board.packs,battle,swing);
 assert.equal(battle.pending.kind,'block');
 const blocks=legalUniversalActions(board.packs,battle);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===null),false);
 assert.equal(blocks.some(a=>a.type==='chooseBlock'&&a.uid===blocker.uid),true);
 battle=dispatchUniversalAction(board.packs,battle,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(battle.pending,null);
 assert.ok(battle.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(battle.players[1].life.length,lives-1);
 assert.ok(live(battle,0,actor.uid));
 const started=battle.turn;
 battle=advance(board.packs,battle,s=>s.turn>started&&s.active===0);
 assert.ok(battle.players[0].removed.some(c=>c.uid===actor.uid));
 assert.equal(battle.players[0].outside.some(c=>c.uid===actor.uid),false);
 assert.equal(battle.turnRetireEvents.some(e=>e.uid===actor.uid),true);
 const silenced=secondMain(29963);
 const stayed=put(silenced.s,0,'BLC-4-041','front',0,true);
 grantContinuousState(silenced.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:stayed.uid,targetUid:stayed.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'end'}});
 const before=silenced.s.turn;
 const still=advance(silenced.packs,silenced.s,s=>s.turn>before&&s.active===0);
 assert.ok(live(still,0,stayed.uid));
 assert.equal(still.players[0].removed.some(c=>c.uid===stayed.uid),false);
 const loss=secondMain(29964);
 const victim=put(loss.s,0,'BLC-4-041','front',0,true);
 grantContinuousState(loss.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:victim.uid,targetUid:victim.uid,sourceLinked:false,
  until:{player:1,phase:'attack',edge:'end'}});
 let quiet=advance(loss.packs,loss.s,s=>s.active===1&&s.phase==='main');
 const hunter=put(quiet,1,'BLC-4-041','front',0,true);
 quiet=advance(loss.packs,quiet,s=>s.active===1&&s.phase==='attack');
 const hit=legalUniversalActions(loss.packs,quiet).find(a=>a.type==='attack'&&
  a.uid===hunter.uid&&!a.targetUid);
 assert.ok(hit);
 quiet=dispatchUniversalAction(loss.packs,quiet,hit);
 quiet=dispatchUniversalAction(loss.packs,quiet,{type:'chooseBlock',uid:victim.uid},{actor:0});
 assert.equal(quiet.pending,null);
 assert.ok(quiet.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(quiet.players[0].removed.some(c=>c.uid===victim.uid),false);
 const color=secondMain(29965);
 const low=put(color.s,1,'BLC-2-025','front',0,true);
 const mid=put(color.s,1,'BLC-2-023','front',1,true);
 const tall=put(color.s,1,'BLC-2-037','front',2,true);
 const revealed=take(color.s,0,'BLC-4-041');
 color.s.players[0].life.unshift(revealed);
 let trigger=advance(color.packs,color.s,s=>s.active===1&&s.phase==='attack');
 const direct=legalUniversalActions(color.packs,trigger).find(a=>a.type==='attack'&&
  a.uid===low.uid&&!a.targetUid);
 assert.ok(direct);
 trigger=dispatchUniversalAction(color.packs,trigger,direct);
 if(trigger.pending?.kind==='block')
  trigger=dispatchUniversalAction(color.packs,trigger,{type:'chooseBlock',uid:null},{actor:0});
 assert.equal(trigger.pending.kind,'life-trigger');
 assert.equal(trigger.pending.trigger,'color');
 const bounces=legalUniversalActions(color.packs,trigger);
 assert.equal(bounces.some(a=>a.mode==='colorBounce'&&a.uid===mid.uid),true);
 assert.equal(bounces.some(a=>a.mode==='colorBounce'&&a.uid===low.uid),true);
 assert.equal(bounces.some(a=>a.uid===tall.uid),false);
 trigger=dispatchUniversalAction(color.packs,trigger,{type:'chooseTrigger',mode:'colorBounce',uid:mid.uid});
 assert.equal(trigger.pending,null);
 assert.ok(trigger.players[1].hand.some(c=>c.uid===mid.uid));
 assert.ok(trigger.players[1].front.some(c=>c?.uid===tall.uid));
 assert.ok(trigger.players[0].outside.some(c=>c.uid===revealed.uid));
 assert.equal(assertUniversalMatch(hiddenMayuri.packs,hiddenEntered),true);
 assert.equal(assertUniversalMatch(passed.packs,skipped),true);
 assert.equal(assertUniversalMatch(board.packs,battle),true);
 assert.equal(assertUniversalMatch(silenced.packs,still),true);
 assert.equal(assertUniversalMatch(loss.packs,quiet),true);
 assert.equal(assertUniversalMatch(color.packs,trigger),true);
});

test('BLC-4-053 sets ACTIVE after an attacking win and gains Damage 2',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-053');
 assert.equal(printed.number,'EX15BT/BLC-4-053');
 assert.equal(printed.nameJa,'朽木 白哉');
 assert.equal(printed.color,'purple');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 assert.deepEqual(printed.traits,['護廷十三隊']);
 assert.equal(printed.effect,'突襲《朽木白哉》：改為Active，可移至前線。以下僅在突襲狀態適用：此角色攻擊並戰鬥勝利時，將此角色改為Active；所有《朽木白哉》的此效果合計每回合僅發動1次。自己的回合中，若對方前線有至少3個角色的BP低於印刷BP，此角色獲得Damage(2)。登場時：最多選1個對方前線角色，本回合BP−1000。');
 const card=bleach.cards['BLC-4-053'];
 assert.equal(card.gen,1);
 assert.equal(card.raidName,'朽木 白哉');
 assert.equal(card.attackWinActiveOnce,'name');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'oppFrontBelowPrintedCount',turn:'own',min:3},attackDamage:2}]);
 assert.deepEqual(card.effects,{onPlay:[{op:'enemyBpDown',bp:1000,optional:true}]});
 const entry=bleachContribution.entries.find(x=>x.id==='BLC-4-053');
 assert.match(entry.evidence.reviewNote,/Q2326 \(2026-09-04\)/);
 assert.match(entry.evidence.reviewNote,/Q2327 \(2026-09-04\)/);
 assert.match(entry.evidence.reviewNote,/no raid-state icon/);
 const bare={id:'BAD',name:'朽木 白哉',color:'purple',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'draw',count:1}]}};
 assert.throws(()=>createUniversalPack({id:'bad-win',cards:[{...bare,attackWinActiveOnce:'card'}]}),/invalid attack-win active once/);
 assert.throws(()=>createUniversalPack({id:'bad-count',cards:[{...bare,id:'LOW',passiveBonuses:[{condition:{kind:'oppFrontBelowPrintedCount',turn:'own',min:9},attackDamage:2}]}]}),/invalid below-printed count/);
 const deck=realDeck(['BLC-4-053','BLC-1-048','BLC-1-042','BLC-1-043','BLC-1-107','BLC-1-041','BLC-1-061','BLC-1-035'],'purple');
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const park=(s,p)=>s.players[p].deck.push(...s.players[p].hand.splice(0));
 function secondMain(seed){
  let {packs,s}=main(deck,seed);
  for(let i=0;i<16&&!(s.active===0&&s.players[0].ownTurns>=2&&s.phase==='main');i++){
   assert.equal(s.pending,null,s.pending&&s.pending.kind);
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step);s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
  park(s,0);park(s,1);
  return {packs,s};
 }
 function advance(packs,s,pred){
  for(let i=0;i<16&&!pred(s);i++){
   assert.equal(s.pending,null,s.pending&&s.pending.kind);
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step,s.phase+':'+s.active);
   s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(pred(s),true,s.phase+':'+s.active+':'+s.turn);
  return s;
 }
 function fuel(s,ids=['BLC-1-042','BLC-1-043','BLC-1-107','BLC-1-048']){
  ids.forEach((id,i)=>put(s,0,id,'energy',i));
 }
 const once=s=>s.mainReadyOnceByName[0].includes('朽木 白哉|attackWinActive');
 const quiet=secondMain(29966);
 fuel(quiet.s);
 assert.equal(universalEnergyByColor(quiet.packs,quiet.s,0).purple>=4,true);
 const quietCard=hold(quiet.s,0,'BLC-4-053');
 const quietPlay=legalUniversalActions(quiet.packs,quiet.s).find(a=>a.type==='play'&&
  a.uid===quietCard.uid&&a.line==='front'&&a.slot===0);
 assert.ok(quietPlay);
 const quietEntered=dispatchUniversalAction(quiet.packs,quiet.s,quietPlay);
 assert.equal(quietEntered.pending,null);
 assert.equal(live(quietEntered,0,quietCard.uid).ready,false);
 assert.equal((live(quietEntered,0,quietCard.uid).stack||[]).length,0);
 assert.equal(universalAttackDamage(quiet.packs,quietEntered,live(quietEntered,0,quietCard.uid)),1);
 const asked=secondMain(29967);
 fuel(asked.s);
 const foe=put(asked.s,1,'BLC-1-043','front',0,true);
 const actor=hold(asked.s,0,'BLC-4-053');
 const play=legalUniversalActions(asked.packs,asked.s).find(a=>a.type==='play'&&
  a.uid===actor.uid&&a.line==='front'&&a.slot===0);
 const opened=dispatchUniversalAction(asked.packs,asked.s,play);
 assert.equal(opened.pending.kind,'effect-target');
 assert.equal(opened.pending.optional,true);
 assert.deepEqual(opened.pending.choices,[foe.uid]);
 const decline=legalUniversalActions(asked.packs,opened).find(a=>a.type==='chooseTarget'&&a.uid===null);
 assert.ok(decline);
 aiOk(asked.packs,opened);
 const skipped=dispatchUniversalAction(asked.packs,opened,decline);
 assert.equal(skipped.pending,null);
 assert.equal(universalBp(asked.packs,skipped,live(skipped,1,foe.uid)),2000);
 assert.equal(live(skipped,0,actor.uid).ready,false);
 const cut=dispatchUniversalAction(asked.packs,structuredClone(opened),{type:'chooseTarget',uid:foe.uid});
 assert.equal(cut.pending,null);
 assert.equal(universalBp(asked.packs,cut,live(cut,1,foe.uid)),1000);
 assert.equal(live(cut,0,actor.uid).ready,false);
 const lined=secondMain(29968);
 put(lined.s,0,'BLC-1-035','energy',0);
 put(lined.s,0,'BLC-1-042','energy',1);
 put(lined.s,0,'BLC-1-043','energy',2);
 assert.equal(universalEnergyByColor(lined.packs,lined.s,0).purple>=4,true);
 const marked=put(lined.s,1,'BLC-1-107','front',0,true);
 const energyCopy=hold(lined.s,0,'BLC-4-053');
 const energyPlay=legalUniversalActions(lined.packs,lined.s).find(a=>a.type==='play'&&
  a.uid===energyCopy.uid&&a.line==='energy'&&a.slot===3);
 assert.ok(energyPlay);
 const energyOpened=dispatchUniversalAction(lined.packs,lined.s,energyPlay);
 assert.equal(energyOpened.pending.kind,'effect-target');
 assert.equal(energyOpened.pending.choices.includes(marked.uid),true);
 const energyCut=dispatchUniversalAction(lined.packs,energyOpened,{type:'chooseTarget',uid:marked.uid});
 assert.equal(live(energyCut,0,energyCopy.uid).ready,false);
 assert.equal(universalBp(lined.packs,energyCut,live(energyCut,1,marked.uid)),1000);
 const struck=secondMain(29969);
 const first=put(struck.s,0,'BLC-4-053','front',0,true);
 const second=put(struck.s,0,'BLC-4-053','front',1,true);
 const lowA=put(struck.s,1,'BLC-1-043','front',0,true);
 const lowB=put(struck.s,1,'BLC-1-107','front',1,true);
 const lowC=put(struck.s,1,'BLC-1-048','front',2,true);
 const aside=put(struck.s,1,'BLC-1-042','energy',0,true);
 const ground=put(struck.s,1,'BLC-1-061','energy',1,true);
 for(const c of [lowA,lowB,lowC])c.buffs.push({bp:-1000,untilTurn:struck.s.turn});
 aside.buffs.push({bp:-500,untilTurn:struck.s.turn});
 assert.equal((first.stack||[]).length,0);
 assert.equal(universalAttackDamage(struck.packs,struck.s,first),2);
 assert.equal(universalBp(struck.packs,struck.s,lowA),1000);
 assert.equal(universalBp(struck.packs,struck.s,aside),500);
 assert.equal(cardHasTrait(bleach.cards[ground.cardId],'護廷十三隊')||bleach.cards[ground.cardId].type==='field',true);
 const lifeA=take(struck.s,1,'BLC-1-042');
 const lifeB=take(struck.s,1,'BLC-1-042');
 struck.s.players[1].life.unshift(lifeA,lifeB);
 const lives=struck.s.players[1].life.length;
 let battle=advance(struck.packs,struck.s,s=>s.active===0&&s.phase==='attack');
 assert.equal(universalAttackDamage(struck.packs,battle,live(battle,0,first.uid)),2);
 battle=dispatchUniversalAction(struck.packs,battle,{type:'attack',uid:first.uid});
 assert.equal(battle.pending.kind,'block');
 battle=dispatchUniversalAction(struck.packs,battle,{type:'chooseBlock',uid:null},{actor:1});
 while(battle.pending?.kind==='life-batch-order'){
  const uid=battle.pending.choices[0];
  battle=dispatchUniversalAction(struck.packs,battle,{type:'chooseLifeOrder',uid},{actor:1});
 }
 assert.equal(battle.pending,null);
 assert.equal(battle.players[1].life.length,lives-2);
 assert.equal(live(battle,0,first.uid).ready,false);
 assert.equal(once(battle),false);
 assert.equal(live(battle,0,second.uid).ready,true);
 battle=dispatchUniversalAction(struck.packs,battle,{type:'attack',uid:second.uid});
 battle=dispatchUniversalAction(struck.packs,battle,{type:'chooseBlock',uid:lowA.uid},{actor:1});
 assert.equal(battle.pending,null);
 assert.equal(live(battle,0,second.uid).ready,true);
 assert.equal(once(battle),true);
 assert.equal(battle.mainReadyOnceByName[0].length,1);
 assert.equal(battle.players[1].life.length,lives-2);
 assert.ok(battle.players[1].outside.some(c=>c.uid===lowA.uid));
 const short=secondMain(29970);
 const partial=put(short.s,0,'BLC-4-053','front',0,true);
 const one=put(short.s,1,'BLC-1-043','front',0,true);
 const two=put(short.s,1,'BLC-1-107','front',1,true);
 const full=put(short.s,1,'BLC-1-048','front',2,true);
 const bench=put(short.s,1,'BLC-1-042','energy',0,true);
 one.buffs.push({bp:-1000,untilTurn:short.s.turn});
 two.buffs.push({bp:-1000,untilTurn:short.s.turn});
 bench.buffs.push({bp:-1000,untilTurn:short.s.turn});
 full.buffs.push({bp:1000,untilTurn:short.s.turn});
 assert.equal(universalAttackDamage(short.packs,short.s,partial),1);
 assert.equal(universalBp(short.packs,short.s,full),2500);
 const later=secondMain(29971);
 const waiting=put(later.s,0,'BLC-4-053','front',0,true);
 const future=[
  put(later.s,1,'BLC-1-043','front',0,true),
  put(later.s,1,'BLC-1-107','front',1,true),
  put(later.s,1,'BLC-1-048','front',2,true)
 ];
 for(const c of future)c.buffs.push({bp:-1000,untilTurn:later.s.turn+1});
 assert.equal(universalAttackDamage(later.packs,later.s,waiting),1);
 assert.equal(universalBp(later.packs,later.s,future[0]),2000);
 const theirTurn=advance(later.packs,later.s,s=>s.active===1&&s.phase==='main');
 assert.equal(universalBp(later.packs,theirTurn,live(theirTurn,1,future[0].uid)),1000);
 assert.equal(universalAttackDamage(later.packs,theirTurn,live(theirTurn,0,waiting.uid)),1);
 const hushed=secondMain(29972);
 const muted=put(hushed.s,0,'BLC-4-053','front',0,true);
 const other=put(hushed.s,0,'BLC-4-053','front',1,true);
 const mutedFoe=put(hushed.s,1,'BLC-1-043','front',0,true);
 const otherFoe=put(hushed.s,1,'BLC-1-107','front',1,true);
 const thirdFoe=put(hushed.s,1,'BLC-1-048','front',2,true);
 for(const c of [mutedFoe,otherFoe,thirdFoe])c.buffs.push({bp:-1000,untilTurn:hushed.s.turn});
 grantContinuousState(hushed.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:muted.uid,targetUid:muted.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 let quietBattle=advance(hushed.packs,hushed.s,s=>s.active===0&&s.phase==='attack');
 assert.equal(universalAttackDamage(hushed.packs,quietBattle,live(quietBattle,0,muted.uid)),1);
 assert.equal(universalAttackDamage(hushed.packs,quietBattle,live(quietBattle,0,other.uid)),2);
 quietBattle=dispatchUniversalAction(hushed.packs,quietBattle,{type:'attack',uid:muted.uid});
 quietBattle=dispatchUniversalAction(hushed.packs,quietBattle,{type:'chooseBlock',uid:mutedFoe.uid},{actor:1});
 assert.equal(live(quietBattle,0,muted.uid).ready,false);
 assert.equal(once(quietBattle),false);
 assert.ok(quietBattle.players[1].outside.some(c=>c.uid===mutedFoe.uid));
 quietBattle=dispatchUniversalAction(hushed.packs,quietBattle,{type:'attack',uid:other.uid});
 quietBattle=dispatchUniversalAction(hushed.packs,quietBattle,{type:'chooseBlock',uid:otherFoe.uid},{actor:1});
 assert.equal(live(quietBattle,0,other.uid).ready,true);
 assert.equal(once(quietBattle),true);
 const lost=secondMain(29973);
 const loser=put(lost.s,0,'BLC-4-053','front',0,true);
 const survivor=put(lost.s,0,'BLC-4-053','front',1,true);
 const wall=put(lost.s,1,'BLC-1-041','front',0,true);
 const equal=put(lost.s,1,'BLC-1-041','front',1,true);
 wall.buffs.push({bp:1000,untilTurn:lost.s.turn});
 let loss=advance(lost.packs,lost.s,s=>s.active===0&&s.phase==='attack');
 loss=dispatchUniversalAction(lost.packs,loss,{type:'attack',uid:loser.uid});
 loss=dispatchUniversalAction(lost.packs,loss,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.ok(loss.players[0].outside.some(c=>c.uid===loser.uid));
 assert.equal(once(loss),false);
 assert.ok(live(loss,1,wall.uid));
 loss=dispatchUniversalAction(lost.packs,loss,{type:'attack',uid:survivor.uid});
 loss=dispatchUniversalAction(lost.packs,loss,{type:'chooseBlock',uid:equal.uid},{actor:1});
 assert.equal(live(loss,0,survivor.uid).ready,true);
 assert.equal(once(loss),true);
 assert.ok(loss.players[1].outside.some(c=>c.uid===equal.uid));
 const raided=secondMain(29974);
 fuel(raided.s);
 const base=raided.s.players[0].energy[3];
 assert.equal(base.cardId,'BLC-1-048');
 const rider=hold(raided.s,0,'BLC-4-053');
 const raid=legalUniversalActions(raided.packs,raided.s).find(a=>a.type==='raid'&&
  a.uid===rider.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(raid);
 assert.equal(legalUniversalActions(raided.packs,raided.s).some(a=>a.type==='raid'&&
  a.uid===rider.uid&&a.baseUid===base.uid&&a.slot!==0),true);
 let stacked=dispatchUniversalAction(raided.packs,raided.s,raid);
 assert.equal(stacked.pending,null);
 assert.equal(stacked.players[0].front[0].cardId,'BLC-4-053');
 assert.equal(stacked.players[0].front[0].ready,true);
 assert.equal(stacked.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(stacked.players[0].energy[3],null);
 const raidFoes=[0,1,2].map(i=>put(stacked,1,['BLC-1-043','BLC-1-107','BLC-1-042'][i],'front',i,true));
 for(const c of raidFoes)c.buffs.push({bp:-500,untilTurn:stacked.turn});
 assert.equal(universalAttackDamage(raided.packs,stacked,stacked.players[0].front[0]),2);
 const raidBlocker=raidFoes[0];
 stacked=advance(raided.packs,stacked,s=>s.active===0&&s.phase==='attack');
 stacked=dispatchUniversalAction(raided.packs,stacked,{type:'attack',uid:rider.uid});
 stacked=dispatchUniversalAction(raided.packs,stacked,{type:'chooseBlock',uid:raidBlocker.uid},{actor:1});
 assert.equal(live(stacked,0,rider.uid).ready,true);
 assert.equal(once(stacked),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietEntered),true);
 assert.equal(assertUniversalMatch(asked.packs,skipped),true);
 assert.equal(assertUniversalMatch(asked.packs,cut),true);
 assert.equal(assertUniversalMatch(lined.packs,energyCut),true);
 assert.equal(assertUniversalMatch(struck.packs,battle),true);
 assert.equal(assertUniversalMatch(short.packs,short.s),true);
 assert.equal(assertUniversalMatch(later.packs,theirTurn),true);
 assert.equal(assertUniversalMatch(hushed.packs,quietBattle),true);
 assert.equal(assertUniversalMatch(lost.packs,loss),true);
 assert.equal(assertUniversalMatch(raided.packs,stacked),true);
});

test('BLC-4-033 actives another traitless character and may REST its raid base',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-033');
 assert.equal(printed.number,'EX15BT/BLC-4-033');
 assert.equal(printed.nameJa,'四楓院 夜一');
 assert.equal(printed.color,'blue');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'raid');
 assert.deepEqual(printed.traits,[]);
 assert.equal(printed.effect,'突襲《四楓院夜一》：改為Active，可移至前線。以下僅在突襲狀態適用：登場時，最多選自己場上另1個沒有特徵的角色改為Active。退場時，若自己場上有《浦原喜助》，可將此角色最多1張突襲底卡以Rest登場於自己場上。');
 const card=bleach.cards['BLC-4-033'];
 assert.equal(card.name,'四楓院 夜一');
 assert.equal(card.gen,1);
 assert.equal(card.raidName,'四楓院 夜一');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects,{
  onPlay:[{op:'activeTraitlessOther'}],
  onRetire:[{op:'raidBaseRestIfName',name:'浦原 喜助'}]
 });
 const entryNote=bleachContribution.entries.find(x=>x.id==='BLC-4-033');
 assert.match(entryNote.evidence.reviewNote,/no raid-state icon/);
 assert.match(entryNote.evidence.reviewNote,/浦原 喜助/);
 const bare={id:'BAD',name:'四楓院 夜一',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-trait',cards:[{...bare,effects:{onPlay:[{op:'activeTraitlessOther',optional:true}]}}]}),/invalid traitless ACTIVE/);
 assert.throws(()=>createUniversalPack({id:'bad-base',cards:[{...bare,id:'BAD2',effects:{onRetire:[{op:'raidBaseRestIfName'}]}}]}),/invalid raid-base REST/);
 assert.throws(()=>createUniversalPack({id:'bad-when',cards:[{...bare,id:'BAD3',effects:{onRetire:[{op:'activeTraitlessOther'}]}}]}),/traitless ACTIVE is only a lone character onPlay effect/);
 assert.throws(()=>createUniversalPack({id:'bad-play',cards:[{...bare,id:'BAD4',effects:{onPlay:[{op:'raidBaseRestIfName',name:'浦原 喜助'}]}}]}),/raid-base REST is only a lone character onRetire effect/);
 const required=['BLC-4-033','BLC-4-031','BLC-2-015','BLC-2-044','BLC-4-041','BLC-4-024','BLC-2-040'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='blue'&&c.maxCopies===4&&!c.trigger&&
  !required.includes(c.id)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const activeUids=s=>legalUniversalActions(deckPacks(s),s).filter(a=>a.type==='chooseActiveTraitless').map(a=>a.uid);
 function deckPacks(s){return [bleach,bleach];}
 function toAttack(s){
  const packs=deckPacks(s);
  for(let n=0;n<6&&!(s.active===0&&s.phase==='attack');n++){
   assert.equal(s.pending,null,s.pending&&s.pending.kind);
   const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
   assert.ok(step);
   s=dispatchUniversalAction(packs,s,step);
  }
  assert.equal(s.phase,'attack');
  assert.equal(s.active,0);
  return s;
 }
 function loseTo(s,attackerUid){
  const wall=put(s,1,'BLC-4-041','front',0,true);
  s=toAttack(s);
  const packs=deckPacks(s);
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:attackerUid});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:wall.uid},{actor:1});
  return s;
 }
 function traitBoard(s){
  return {
   restEnergy:put(s,0,'BLC-4-024','energy',0,false),
   activeEnergy:put(s,0,'BLC-4-031','energy',1,true),
   field:put(s,0,'BLC-2-044','energy',2,true),
   composite:put(s,0,'BLC-2-040','energy',3,true),
   traited:put(s,0,'BLC-4-041','front',1,false),
   frontless:put(s,0,'BLC-4-031','front',2,false)
  };
 }
 function raidOnto(seed){
  const opened=main(deck,seed);
  const base=put(opened.s,0,'BLC-4-031','energy',0,true);
  const fuel=put(opened.s,0,'BLC-2-040','energy',1,true);
  const side=put(opened.s,0,'BLC-2-040','energy',2,true);
  const third=put(opened.s,0,'BLC-2-040','energy',3,true);
  const other=put(opened.s,0,'BLC-4-031','front',1,false);
  const rider=hold(opened.s,0,'BLC-4-033');
  const packs=opened.packs;
  assert.equal(legalUniversalActions(packs,opened.s).some(a=>a.type==='raid'&&a.uid===rider.uid&&a.line==='energy'),false);
  const raid=legalUniversalActions(packs,opened.s).find(a=>a.type==='raid'&&
   a.uid===rider.uid&&a.baseUid===base.uid&&a.slot===0);
  assert.ok(raid);
  let s=dispatchUniversalAction(packs,opened.s,raid);
  assert.equal(s.players[0].front[0].cardId,'BLC-4-033');
  assert.equal(s.players[0].front[0].ready,true);
  assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
  assert.equal(s.players[0].energy[0],null);
  assert.equal(s.pending.kind,'effect-active-traitless');
  const uids=legalUniversalActions(packs,s).filter(a=>a.type==='chooseActiveTraitless').map(a=>a.uid);
  assert.equal(uids.includes(other.uid),true);
  assert.equal(uids.includes(fuel.uid),false);
  assert.equal(uids.includes(side.uid),false);
  assert.equal(uids.includes(third.uid),false);
  assert.equal(uids.includes(base.uid),false);
  assert.equal(uids.includes(rider.uid),false);
  s=dispatchUniversalAction(packs,s,{type:'chooseActiveTraitless',uid:null});
  assert.equal(live(s,0,other.uid).ready,false);
  return {packs,s,base,rider,other,fuel,side,third};
 }
 const quiet=main(deck,29975);
 for(let i=0;i<4;i++)put(quiet.s,0,'BLC-4-041','energy',i,true);
 assert.equal(universalEnergyByColor(quiet.packs,quiet.s,0).blue>=4,true);
 const quietCard=hold(quiet.s,0,'BLC-4-033');
 const quietEntered=dispatchUniversalAction(quiet.packs,quiet.s,{type:'play',uid:quietCard.uid,line:'front',slot:0});
 assert.equal(quietEntered.pending,null);
 assert.equal(live(quietEntered,0,quietCard.uid).ready,false);
 const asked=main(deck,29976);
 const board=traitBoard(asked.s);
 assert.equal(universalEnergyByColor(asked.packs,asked.s,0).blue>=4,true);
 const actor=hold(asked.s,0,'BLC-4-033');
 let askedPlay=dispatchUniversalAction(asked.packs,asked.s,{type:'play',uid:actor.uid,line:'front',slot:0});
 assert.equal(askedPlay.pending.kind,'effect-active-traitless');
 assert.equal(askedPlay.players[0].front[0].ready,false);
 const askedUids=activeUids(askedPlay);
 assert.equal(askedUids.includes(board.restEnergy.uid),true);
 assert.equal(askedUids.includes(board.activeEnergy.uid),true);
 assert.equal(askedUids.includes(board.frontless.uid),true);
 assert.equal(askedUids.includes(board.traited.uid),false);
 assert.equal(askedUids.includes(board.field.uid),false);
 assert.equal(askedUids.includes(board.composite.uid),false);
 assert.equal(askedUids.includes(actor.uid),false);
 assert.equal(askedUids.includes(null),true);
 assert.equal(V2_PENDING_LABELS['effect-active-traitless'],'可將另 1 個沒有特徵的角色改為 ACTIVE');
 assert.match(uiActionLabel({type:'chooseActiveTraitless',uid:null},{pack:asked.packs,state:askedPlay}),/不改為 ACTIVE/);
 assert.match(uiActionLabel({type:'chooseActiveTraitless',uid:board.frontless.uid},{pack:asked.packs,state:askedPlay}),/改為 ACTIVE/);
 aiOk(asked.packs,askedPlay);
 const priv=universalPrivateChoices(asked.packs,askedPlay,0);
 assert.equal(priv.kind,'effect-active-traitless');
 assert.ok(priv.options.some(o=>o.card&&o.card.cardId==='BLC-4-031'));
 assert.equal(universalPrivateChoices(asked.packs,askedPlay,1),null);
 assert.deepEqual(universalPublicView(asked.packs,askedPlay,1).pending,{kind:'effect-active-traitless',player:0});
 const skipped=dispatchUniversalAction(asked.packs,askedPlay,{type:'chooseActiveTraitless',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(live(skipped,0,board.frontless.uid).ready,false);
 assert.equal(live(skipped,0,board.restEnergy.uid).ready,false);
 assert.equal(live(skipped,0,actor.uid).ready,false);
 const chosen=main(deck,29977);
 const chosenBoard=traitBoard(chosen.s);
 const chosenCard=hold(chosen.s,0,'BLC-4-033');
 let chosenPlay=dispatchUniversalAction(chosen.packs,chosen.s,{type:'play',uid:chosenCard.uid,line:'front',slot:0});
 chosenPlay=dispatchUniversalAction(chosen.packs,chosenPlay,{type:'chooseActiveTraitless',uid:chosenBoard.frontless.uid});
 assert.equal(chosenPlay.pending,null);
 assert.equal(live(chosenPlay,0,chosenBoard.frontless.uid).ready,true);
 assert.equal(live(chosenPlay,0,chosenBoard.restEnergy.uid).ready,false);
 const stood=main(deck,29978);
 const stoodBoard=traitBoard(stood.s);
 const stoodCard=hold(stood.s,0,'BLC-4-033');
 let stoodPlay=dispatchUniversalAction(stood.packs,stood.s,{type:'play',uid:stoodCard.uid,line:'front',slot:0});
 stoodPlay=dispatchUniversalAction(stood.packs,stoodPlay,{type:'chooseActiveTraitless',uid:stoodBoard.activeEnergy.uid});
 assert.equal(live(stoodPlay,0,stoodBoard.activeEnergy.uid).ready,true);
 assert.equal(live(stoodPlay,0,stoodBoard.frontless.uid).ready,false);
 const hushed=main(deck,29979);
 const hushedBoard=traitBoard(hushed.s);
 const hushedCard=hold(hushed.s,0,'BLC-4-033');
 let hushedPlay=dispatchUniversalAction(hushed.packs,hushed.s,{type:'play',uid:hushedCard.uid,line:'front',slot:0});
 grantContinuousState(hushedPlay,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:hushedCard.uid,targetUid:hushedCard.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(hushed.packs,hushedPlay).every(a=>a.type!=='chooseActiveTraitless'||a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(hushed.packs,hushedPlay,{type:'chooseActiveTraitless',uid:hushedBoard.frontless.uid}),/Action not currently legal/);
 hushedPlay=dispatchUniversalAction(hushed.packs,hushedPlay,{type:'chooseActiveTraitless',uid:null});
 assert.equal(live(hushedPlay,0,hushedBoard.frontless.uid).ready,false);
 const lined=main(deck,29980);
 put(lined.s,0,'BLC-4-024','energy',0,false);
 const linedTraitless=put(lined.s,0,'BLC-4-031','energy',1,true);
 put(lined.s,0,'BLC-2-040','energy',2,true);
 const linedTraited=put(lined.s,0,'BLC-4-041','front',0,true);
 const linedCard=hold(lined.s,0,'BLC-4-033');
 let linedPlay=dispatchUniversalAction(lined.packs,lined.s,{type:'play',uid:linedCard.uid,line:'energy',slot:3});
 assert.equal(linedPlay.pending.kind,'effect-active-traitless');
 assert.equal(linedPlay.players[0].energy[3].ready,false);
 const linedUids=activeUids(linedPlay);
 assert.equal(linedUids.includes(linedTraitless.uid),true);
 assert.equal(linedUids.includes(linedCard.uid),false);
 assert.equal(linedUids.includes(linedTraited.uid),false);
 const plain=main(deck,29981);
 const plainTop=put(plain.s,0,'BLC-4-033','front',0,true);
 put(plain.s,0,'BLC-2-015','energy',0,true);
 const plainAfter=loseTo(plain.s,plainTop.uid);
 assert.equal(plainAfter.pending,null);
 assert.ok(plainAfter.players[0].outside.some(c=>c.uid===plainTop.uid));
 const missing=raidOnto(29982);
 const missingAfter=loseTo(missing.s,missing.rider.uid);
 assert.equal(missingAfter.pending,null);
 assert.ok(missingAfter.players[0].outside.some(c=>c.uid===missing.base.uid));
 assert.ok(missingAfter.players[0].outside.some(c=>c.uid===missing.rider.uid));
 const declined=raidOnto(29983);
 const guide=put(declined.s,0,'BLC-2-015','energy',0,true);
 const handBefore=declined.s.players[0].hand.length;
 const declinedAfter=loseTo(declined.s,declined.rider.uid);
 assert.equal(declinedAfter.pending.kind,'effect-raid-base-rest');
 assert.equal(V2_PENDING_LABELS['effect-raid-base-rest'],'可將突襲底卡以 Rest 登場');
 const baseActions=legalUniversalActions(declined.packs,declinedAfter).filter(a=>a.type==='chooseRaidBaseRest');
 assert.equal(baseActions.some(a=>a.uid===null),true);
 assert.equal(baseActions.some(a=>a.uid===declined.base.uid&&a.line==='front'&&a.replaceUid===undefined),true);
 assert.equal(baseActions.some(a=>a.uid===declined.base.uid&&a.line==='energy'),true);
 assert.match(uiActionLabel({type:'chooseRaidBaseRest',uid:null},{pack:declined.packs,state:declinedAfter}),/不將突襲底卡/);
 aiOk(declined.packs,declinedAfter);
 const raidPriv=universalPrivateChoices(declined.packs,declinedAfter,0);
 assert.ok(raidPriv.options.some(o=>o.card&&o.card.cardId==='BLC-4-031'));
 assert.equal(universalPrivateChoices(declined.packs,declinedAfter,1),null);
 assert.deepEqual(universalPublicView(declined.packs,declinedAfter,1).pending,{kind:'effect-raid-base-rest',player:0});
 const left=dispatchUniversalAction(declined.packs,declinedAfter,{type:'chooseRaidBaseRest',uid:null});
 assert.equal(left.pending,null);
 assert.ok(left.players[0].outside.some(c=>c.uid===declined.base.uid));
 assert.equal(left.players[0].hand.length,handBefore);
 assert.equal(live(left,0,guide.uid).cardId,'BLC-2-015');
 const entered=raidOnto(29984);
 put(entered.s,0,'BLC-2-015','front',2,true);
 const beforeDraw=entered.s.players[0].hand.length;
 let enteredAfter=loseTo(entered.s,entered.rider.uid);
 const restFront=legalUniversalActions(entered.packs,enteredAfter).find(a=>a.type==='chooseRaidBaseRest'&&
  a.uid===entered.base.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.ok(restFront);
 enteredAfter=dispatchUniversalAction(entered.packs,enteredAfter,restFront);
 assert.equal(enteredAfter.pending,null);
 const returned=live(enteredAfter,0,entered.base.uid);
 assert.equal(returned.ready,false);
 assert.equal(returned.cardId,'BLC-4-031');
 assert.equal(enteredAfter.players[0].outside.some(c=>c.uid===entered.base.uid),false);
 assert.equal(enteredAfter.players[0].hand.length,beforeDraw+1);
 const muted=raidOnto(29985);
 grantContinuousState(muted.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:muted.rider.uid,targetUid:muted.rider.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 put(muted.s,0,'BLC-2-015','energy',0,true);
 const mutedAfter=loseTo(muted.s,muted.rider.uid);
 assert.equal(mutedAfter.pending,null);
 assert.ok(mutedAfter.players[0].outside.some(c=>c.uid===muted.base.uid));
 const named=raidOnto(29986);
 const silentGuide=put(named.s,0,'BLC-2-015','energy',0,false);
 grantContinuousState(named.s,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:silentGuide.uid,targetUid:silentGuide.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 const namedAfter=loseTo(named.s,named.rider.uid);
 assert.equal(namedAfter.pending.kind,'effect-raid-base-rest');
 const hidden=raidOnto(29987);
 const buried=take(hidden.s,0,'BLC-4-031');
 buried.faceDown=true;buried.ready=false;buried.stack=[];buried.under=[];
 hidden.s.players[0].front[0].stack[0].under=[buried];
 put(hidden.s,0,'BLC-2-015','energy',0,true);
 const hiddenAfter=loseTo(hidden.s,hidden.rider.uid);
 assert.equal(hiddenAfter.pending.kind,'effect-raid-base-rest');
 const hiddenUids=legalUniversalActions(hidden.packs,hiddenAfter).filter(a=>a.type==='chooseRaidBaseRest').map(a=>a.uid);
 assert.equal(hiddenUids.includes(hidden.base.uid),true);
 assert.equal(hiddenUids.includes(buried.uid),false);
 assert.ok(hiddenAfter.players[0].outside.some(c=>c.uid===buried.uid));
 const gone=raidOnto(29988);
 const leaving=put(gone.s,0,'BLC-2-015','energy',0,true);
 let goneAfter=loseTo(gone.s,gone.rider.uid);
 const stale=legalUniversalActions(gone.packs,goneAfter).find(a=>a.type==='chooseRaidBaseRest'&&a.uid===gone.base.uid);
 assert.ok(stale);
 const slot=goneAfter.players[0].energy.findIndex(c=>c?.uid===leaving.uid);
 goneAfter.players[0].energy[slot]=null;
 leaving.fieldEntryStamp=null;
 goneAfter.players[0].outside.push(leaving);
 assert.equal(legalUniversalActions(gone.packs,goneAfter).every(a=>a.type!=='chooseRaidBaseRest'||a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(gone.packs,goneAfter,stale),/Action not currently legal/);
 goneAfter=dispatchUniversalAction(gone.packs,goneAfter,{type:'chooseRaidBaseRest',uid:null});
 assert.ok(goneAfter.players[0].outside.some(c=>c.uid===gone.base.uid));
 const replaced=raidOnto(29989);
 const keeper=put(replaced.s,0,'BLC-2-015','energy',0,true);
 const victim=replaced.third;
 const replaceHand=replaced.s.players[0].hand.length;
 let replacedAfter=loseTo(replaced.s,replaced.rider.uid);
 const swap=legalUniversalActions(replaced.packs,replacedAfter).find(a=>a.type==='chooseRaidBaseRest'&&
  a.uid===replaced.base.uid&&a.line==='energy'&&a.replaceUid===victim.uid);
 assert.ok(swap);
 replacedAfter=dispatchUniversalAction(replaced.packs,replacedAfter,swap);
 assert.equal(replacedAfter.pending,null);
 assert.equal(live(replacedAfter,0,replaced.base.uid).ready,false);
 assert.ok(replacedAfter.players[0].removed.some(c=>c.uid===victim.uid));
 assert.equal(replacedAfter.players[0].outside.some(c=>c.uid===victim.uid),false);
 assert.equal(replacedAfter.players[0].hand.length,replaceHand+1);
 assert.equal(live(replacedAfter,0,keeper.uid).cardId,'BLC-2-015');
 const forged=main(deck,29990);
 const forgedTop=put(forged.s,0,'BLC-4-033','front',0,true);
 const forgedBase=take(forged.s,0,'BLC-4-031');
 forgedBase.ready=false;forgedBase.stack=[];forgedBase.under=[];
 forgedTop.stack=[forgedBase];
 put(forged.s,0,'BLC-2-015','energy',0,true);
 const forgedAfter=loseTo(forged.s,forgedTop.uid);
 assert.equal(forgedAfter.pending,null);
 assert.ok(forgedAfter.players[0].outside.some(c=>c.uid===forgedBase.uid));
 assert.equal(assertUniversalMatch(quiet.packs,quietEntered),true);
 assert.equal(assertUniversalMatch(asked.packs,skipped),true);
 assert.equal(assertUniversalMatch(chosen.packs,chosenPlay),true);
 assert.equal(assertUniversalMatch(stood.packs,stoodPlay),true);
 assert.equal(assertUniversalMatch(hushed.packs,hushedPlay),true);
 assert.equal(assertUniversalMatch(lined.packs,linedPlay),true);
 assert.equal(assertUniversalMatch(plain.packs,plainAfter),true);
 assert.equal(assertUniversalMatch(missing.packs,missingAfter),true);
 assert.equal(assertUniversalMatch(declined.packs,left),true);
 assert.equal(assertUniversalMatch(entered.packs,enteredAfter),true);
 assert.equal(assertUniversalMatch(muted.packs,mutedAfter),true);
 assert.equal(assertUniversalMatch(named.packs,namedAfter),true);
 assert.equal(assertUniversalMatch(hidden.packs,hiddenAfter),true);
 assert.equal(assertUniversalMatch(gone.packs,goneAfter),true);
 assert.equal(assertUniversalMatch(replaced.packs,replacedAfter),true);
 assert.equal(assertUniversalMatch(forged.packs,forgedAfter),true);
});

test('BLC-4-075 stays off the front, draws, and actives another Gotei character',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-075');
 assert.equal(printed.number,'EX15BT/BLC-4-075');
 assert.equal(printed.nameJa,'浮竹 十四郎');
 assert.equal(printed.color,'green');
 assert.equal(printed.energy,3);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,500);
 assert.equal(printed.gen,4);
 assert.equal(printed.trigger,'get');
 assert.deepEqual(printed.traits,['護廷十三隊','靈王的右臂']);
 assert.equal(printed.effect,'此卡不能在前線登場，也不能移至前線（包含突襲時的移動）。突襲《浮竹十四郎》：改為Active。以下僅在突襲狀態適用：此角色額外產生1個綠色能量。登場時：抽1張牌。啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動；選自己場上另1個具有「護廷十三隊」特徵的角色改為Active。');
 const card=bleach.cards['BLC-4-075'];
 assert.equal(card.name,'浮竹 十四郎');
 assert.equal(card.gen,2);
 assert.equal(card.printedExtraEnergy,1);
 assert.equal(card.frontForbidden,true);
 assert.equal(card.raidName,'浮竹 十四郎');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'noteEntryTurn'},{op:'draw',count:1}]);
 assert.equal(card.mainAbility.entryTurnOnly,true);
 assert.deepEqual(card.mainAbility.then,[{op:'activeOtherTrait',trait:'護廷十三隊'}]);
 const entryNote=bleachContribution.entries.find(x=>x.id==='BLC-4-075');
 assert.equal(entryNote.sourceRecord.gen,2);
 assert.equal(entryNote.sourceRecord.legacyImportedGen,4);
 assert.match(entryNote.evidence.reviewNote,/no raid-state icon/);
 assert.match(entryNote.evidence.reviewNote,/緑緑\+/);
 const bare={id:'BAD',name:'浮竹 十四郎',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-trait',cards:[{...bare,mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,entryTurnOnly:true,then:[{op:'activeOtherTrait'}]}}]}),/invalid other-trait ACTIVE/);
 const required=['BLC-4-075','BLC-1-069','BLC-4-064','BLC-4-061'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='green'&&c.maxCopies===4&&!c.trigger&&
  !required.includes(c.id)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const deck=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 const fuel=(s,n)=>[0,1,2].slice(0,n).map(i=>put(s,0,'BLC-1-069','energy',i,true));
 const played=main(deck,30010);
 fuel(played.s,3);
 const rider=hold(played.s,0,'BLC-4-075');
 assert.equal(legalUniversalActions(played.packs,played.s).some(a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front'),false);
 const marker=setTop(played.s,0,['BLC-4-061'])[0];
 const before=played.s.players[0].hand.length;
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:rider.uid,line:'energy',slot:3});
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].energy[3].ready,false);
 assert.equal(entered.players[0].energy[3].entryTurn,entered.turn);
 assert.equal(universalCardEnergy(played.packs,entered,0,entered.players[0].energy[3]),3);
 assert.equal(entered.players[0].hand.length,before);
 assert.ok(entered.players[0].hand.some(c=>c.uid===marker.uid));
 grantContinuousState(entered,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:rider.uid,targetUid:rider.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(universalCardEnergy(played.packs,entered,0,entered.players[0].energy[3]),2);
 const asked=main(deck,30011);
 fuel(asked.s,3);
 const squad=put(asked.s,0,'BLC-4-064','front',0,false);
 const other=put(asked.s,0,'BLC-4-061','front',1,false);
 const actor=hold(asked.s,0,'BLC-4-075');
 let askedPlay=dispatchUniversalAction(asked.packs,asked.s,{type:'play',uid:actor.uid,line:'energy',slot:3});
 const act=legalUniversalActions(asked.packs,askedPlay).find(a=>a.type==='activate'&&a.uid===actor.uid);
 assert.ok(act);
 askedPlay=dispatchUniversalAction(asked.packs,askedPlay,act);
 assert.equal(askedPlay.pending.kind,'effect-active-other-trait');
 const uids=legalUniversalActions(asked.packs,askedPlay).filter(a=>a.type==='chooseActiveOtherTrait').map(a=>a.uid);
 assert.equal(uids.includes(squad.uid),true);
 assert.equal(uids.includes(asked.s.players[0].energy[0].uid),true);
 assert.equal(uids.includes(other.uid),false);
 assert.equal(uids.includes(actor.uid),false);
 assert.equal(uids.includes(null),false);
 assert.equal(V2_PENDING_LABELS['effect-active-other-trait'],'選另 1 個指定特徵的角色改為 ACTIVE');
 assert.match(uiActionLabel({type:'chooseActiveOtherTrait',uid:squad.uid},{pack:asked.packs,state:askedPlay}),/改為 ACTIVE/);
 aiOk(asked.packs,askedPlay);
 const priv=universalPrivateChoices(asked.packs,askedPlay,0);
 assert.equal(priv.kind,'effect-active-other-trait');
 assert.ok(priv.options.some(o=>o.card&&o.card.cardId==='BLC-4-064'));
 assert.equal(universalPrivateChoices(asked.packs,askedPlay,1),null);
 assert.deepEqual(universalPublicView(asked.packs,askedPlay,1).pending,{kind:'effect-active-other-trait',player:0});
 assert.throws(()=>dispatchUniversalAction(asked.packs,askedPlay,{type:'chooseActiveOtherTrait',uid:null}),/Action not currently legal/);
 const stood=asked.s.players[0].energy[0];
 askedPlay=dispatchUniversalAction(asked.packs,askedPlay,{type:'chooseActiveOtherTrait',uid:stood.uid});
 assert.equal(askedPlay.pending,null);
 assert.equal(live(askedPlay,0,stood.uid).ready,true);
 assert.equal(live(askedPlay,0,squad.uid).ready,false);
 const chosen=main(deck,30012);
 fuel(chosen.s,3);
 const resting=put(chosen.s,0,'BLC-4-064','front',0,false);
 const chosenCard=hold(chosen.s,0,'BLC-4-075');
 let chosenPlay=dispatchUniversalAction(chosen.packs,chosen.s,{type:'play',uid:chosenCard.uid,line:'energy',slot:3});
 chosenPlay=dispatchUniversalAction(chosen.packs,chosenPlay,legalUniversalActions(chosen.packs,chosenPlay).find(a=>a.type==='activate'&&a.uid===chosenCard.uid));
 chosenPlay=dispatchUniversalAction(chosen.packs,chosenPlay,{type:'chooseActiveOtherTrait',uid:resting.uid});
 assert.equal(live(chosenPlay,0,resting.uid).ready,true);
 const quiet=main(deck,30013);
 for(let i=0;i<3;i++)put(quiet.s,0,'BLC-4-061','energy',i,true);
 const quietCard=hold(quiet.s,0,'BLC-4-075');
 let quietPlay=dispatchUniversalAction(quiet.packs,quiet.s,{type:'play',uid:quietCard.uid,line:'energy',slot:3});
 assert.equal(legalUniversalActions(quiet.packs,quietPlay).some(a=>a.type==='activate'&&a.uid===quietCard.uid),false);
 const parked=main(deck,30014);
 fuel(parked.s,3);
 const parkedCard=put(parked.s,0,'BLC-4-075','energy',3,false);
 put(parked.s,0,'BLC-4-064','front',0,false);
 assert.equal(legalUniversalActions(parked.packs,parked.s).some(a=>a.type==='activate'&&a.uid===parkedCard.uid),false);
 const hushed=main(deck,30015);
 fuel(hushed.s,3);
 put(hushed.s,0,'BLC-4-064','front',0,false);
 const hushedCard=hold(hushed.s,0,'BLC-4-075');
 let hushedPlay=dispatchUniversalAction(hushed.packs,hushed.s,{type:'play',uid:hushedCard.uid,line:'energy',slot:3});
 grantContinuousState(hushedPlay,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:hushedCard.uid,targetUid:hushedCard.uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(legalUniversalActions(hushed.packs,hushedPlay).some(a=>a.type==='activate'&&a.uid===hushedCard.uid),false);
 const later=main(deck,30016);
 fuel(later.s,3);
 put(later.s,0,'BLC-4-064','front',0,false);
 const laterCard=hold(later.s,0,'BLC-4-075');
 let laterPlay=dispatchUniversalAction(later.packs,later.s,{type:'play',uid:laterCard.uid,line:'energy',slot:3});
 const openedTurn=laterPlay.turn;
 for(let n=0;n<40&&!(laterPlay.turn>openedTurn&&laterPlay.active===0&&laterPlay.phase==='main'&&!laterPlay.pending);n++){
  const legal=legalUniversalActions(later.packs,laterPlay);
  const action=laterPlay.pending?legal.find(a=>a.uid===null||a.mode==='skip')||legal[0]:legal.find(a=>a.type==='next');
  assert.ok(action,laterPlay.pending&&laterPlay.pending.kind);
  laterPlay=dispatchUniversalAction(later.packs,laterPlay,action,{actor:laterPlay.pending?laterPlay.pending.player:undefined});
 }
 assert.equal(laterPlay.phase,'main');
 assert.equal(live(laterPlay,0,laterCard.uid).entryTurn===laterPlay.turn,false);
 assert.equal(legalUniversalActions(later.packs,laterPlay).some(a=>a.type==='activate'&&a.uid===laterCard.uid),false);
 const raided=main(deck,30017);
 const base=put(raided.s,0,'BLC-1-069','energy',0,true);
 fuel(raided.s,0);
 put(raided.s,0,'BLC-1-069','energy',1,true);
 put(raided.s,0,'BLC-1-069','energy',2,true);
 const raider=hold(raided.s,0,'BLC-4-075');
 assert.equal(legalUniversalActions(raided.packs,raided.s).some(a=>a.type==='raid'&&a.uid===raider.uid&&a.line==='front'),false);
 const raid=legalUniversalActions(raided.packs,raided.s).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.line==='energy'&&a.slot===0);
 assert.ok(raid);
 const handBefore=raided.s.players[0].hand.length;
 let stacked=dispatchUniversalAction(raided.packs,raided.s,raid);
 assert.equal(stacked.players[0].energy[0].cardId,'BLC-4-075');
 assert.equal(stacked.players[0].energy[0].ready,true);
 assert.equal(stacked.players[0].energy[0].stack[0].uid,base.uid);
 assert.equal(stacked.players[0].front.every(c=>!c||c.cardId!=='BLC-4-075'),true);
 assert.equal(stacked.players[0].hand.length,handBefore);
 assert.equal(universalCardEnergy(raided.packs,stacked,0,stacked.players[0].energy[0]),3);
 assert.equal(legalUniversalActions(raided.packs,stacked).some(a=>a.type==='move'&&a.uid===raider.uid),false);
 assert.equal(assertUniversalMatch(played.packs,entered),true);
 assert.equal(assertUniversalMatch(asked.packs,askedPlay),true);
 assert.equal(assertUniversalMatch(chosen.packs,chosenPlay),true);
 assert.equal(assertUniversalMatch(quiet.packs,quietPlay),true);
 assert.equal(assertUniversalMatch(parked.packs,parked.s),true);
 assert.equal(assertUniversalMatch(hushed.packs,hushedPlay),true);
 assert.equal(assertUniversalMatch(later.packs,laterPlay),true);
 assert.equal(assertUniversalMatch(raided.packs,stacked),true);
});

test('BLC-2-065 strips its raid top, ignores opponent REST and bounce, and still loses a battle',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-2-065');
 assert.equal(printed.number,'EX07BT/BLC-2-065');
 assert.equal(printed.nameJa,'狛村 左陣');
 assert.equal(printed.color,'green');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.gen,1);
 assert.equal(printed.trigger,'get');
 assert.equal(printed.traits,'護廷十三隊');
 assert.equal(printed.effect,'Raid〈狛村左陣〉：轉為 ACTIVE，可移至前線。己方回合開始時，將此角色 Raid 狀態最上層的卡送至場外。Impact 無效。此角色不會被敵方效果轉為 REST 或返回手牌。登場：抽 2 張。');
 const card=bleach.cards['BLC-2-065'];
 assert.equal(card.name,'狛村 左陣');
 assert.equal(card.gen,1);
 assert.equal(card.raidName,'狛村 左陣');
 assert.equal(card.impactNull,true);
 assert.equal(card.opponentRestImmune,true);
 assert.equal(card.opponentBounceImmune,true);
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.effects.onPlay,[{op:'draw',count:2}]);
 assert.deepEqual(card.phaseEffects,[{phase:'start',edge:'start',turn:'own',then:[{op:'stripSelfRaidTopAtOwnStart'}]}]);
 const entryNote=bleachContribution.entries.find(x=>x.id==='BLC-2-065');
 assert.match(entryNote.evidence.reviewNote,/Q1047/);
 assert.match(entryNote.evidence.reviewNote,/Q1052/);
 assert.match(entryNote.evidence.reviewNote,/Q1469/);
 const bare={id:'BAD',name:'狛村 左陣',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'bad-strip',cards:[{...bare,effects:{onPlay:[{op:'stripSelfRaidTopAtOwnStart'}]}}]}),/invalid phase-only self retirement/);
 const required=['BLC-2-065','BLC-1-078','BLC-1-003','BLC-4-041','BLC-1-004'];
 const rest=Object.values(bleach.cards).filter(c=>c.color==='green'&&c.maxCopies===4&&!c.trigger&&
  !required.includes(c.id)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,10)];
 const deck=Object.fromEntries(built.map(id=>[id,required.includes(id)&&id!=='BLC-2-065'&&id!=='BLC-1-078'?1:4]));
 deck[rest[9]]=3;
 assert.equal(Object.values(deck).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(bleach,deck),[]);
 const hold=(s,p,id)=>{const c=take(s,p,id);s.players[p].hand.push(c);return c;};
 function march(packs,s,turn){
  for(let n=0;n<40&&!(s.turn>turn&&s.active===0&&s.phase==='main'&&!s.pending);n++){
   const legal=legalUniversalActions(packs,s);
   const action=s.pending?legal.find(a=>a.uid===null||a.mode==='skip')||legal[0]:legal.find(a=>a.type==='next');
   assert.ok(action,s.pending&&s.pending.kind);
   s=dispatchUniversalAction(packs,s,action,{actor:s.pending?s.pending.player:s.active});
  }
  assert.equal(s.phase,'main');
  assert.equal(s.active,0);
  return s;
 }
 const played=main(deck,30020);
 put(played.s,0,'BLC-1-078','energy',0,true);
 put(played.s,0,'BLC-1-078','energy',1,true);
 const rider=hold(played.s,0,'BLC-2-065');
 const markers=setTop(played.s,0,['BLC-1-078','BLC-1-078']);
 const before=played.s.players[0].hand.length;
 let entered=dispatchUniversalAction(played.packs,played.s,{type:'play',uid:rider.uid,line:'front',slot:0});
 assert.equal(entered.pending,null);
 assert.equal(entered.players[0].front[0].ready,false);
 assert.equal(entered.players[0].hand.length,before+1);
 assert.equal(markers.every(c=>entered.players[0].hand.some(h=>h.uid===c.uid)),true);
 const raided=main(deck,30021);
 const base=put(raided.s,0,'BLC-1-078','energy',0,true);
 put(raided.s,0,'BLC-1-078','energy',1,true);
 const raider=hold(raided.s,0,'BLC-2-065');
 const raid=legalUniversalActions(raided.packs,raided.s).find(a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid&&a.slot===0);
 assert.ok(raid);
 let stacked=dispatchUniversalAction(raided.packs,raided.s,raid);
 assert.equal(stacked.players[0].front[0].cardId,'BLC-2-065');
 assert.equal(stacked.players[0].front[0].ready,true);
 assert.equal(stacked.players[0].front[0].stack[0].uid,base.uid);
 const tucked=take(stacked,0,'BLC-1-078');
 tucked.faceDown=true;
 stacked.players[0].front[0].stack[0].under=[tucked];
 stacked.players[0].front[0].buffs.push({bp:1000,untilTurn:stacked.turn});
 const opened=stacked.turn;
 stacked=march(raided.packs,stacked,opened);
 const promoted=stacked.players[0].front[0];
 assert.equal(promoted.cardId,'BLC-1-078');
 assert.equal(promoted.ready,true);
 assert.equal(promoted.under[0].uid,tucked.uid);
 assert.equal(universalBp(raided.packs,stacked,promoted),3000);
 assert.ok(stacked.players[0].outside.some(c=>c.uid===raider.uid));
 assert.equal(stacked.players[0].hand.some(c=>c.uid===base.uid),false);
 const plain=main(deck,30022);
 put(plain.s,0,'BLC-1-078','energy',0,true);
 put(plain.s,0,'BLC-1-078','energy',1,true);
 const plainCard=hold(plain.s,0,'BLC-2-065');
 let stayed=dispatchUniversalAction(plain.packs,plain.s,{type:'play',uid:plainCard.uid,line:'front',slot:0});
 const plainTurn=stayed.turn;
 stayed=march(plain.packs,stayed,plainTurn);
 assert.equal(live(stayed,0,plainCard.uid).cardId,'BLC-2-065');
 assert.equal(stayed.players[0].outside.some(c=>c.uid===plainCard.uid),false);
 const hushed=main(deck,30023);
 const hushedBase=put(hushed.s,0,'BLC-1-078','energy',0,true);
 put(hushed.s,0,'BLC-1-078','energy',1,true);
 const hushedCard=hold(hushed.s,0,'BLC-2-065');
 const hushedRaid=legalUniversalActions(hushed.packs,hushed.s).find(a=>a.type==='raid'&&a.uid===hushedCard.uid&&a.baseUid===hushedBase.uid&&a.slot===0);
 let sealed=dispatchUniversalAction(hushed.packs,hushed.s,hushedRaid);
 grantContinuousState(sealed,{kind:'originalEffectsDisabled',controller:1,
  sourceUid:hushedCard.uid,targetUid:hushedCard.uid,sourceLinked:false,
  until:{player:0,phase:'move',edge:'start'}});
 const sealedTurn=sealed.turn;
 sealed=march(hushed.packs,sealed,sealedTurn);
 assert.equal(live(sealed,0,hushedCard.uid).cardId,'BLC-2-065');
 assert.equal(live(sealed,0,hushedCard.uid).stack[0].uid,hushedBase.uid);
 const frozen=main(deck,30024);
 const wall=put(frozen.s,0,'BLC-2-065','front',0,true);
 const striker=put(frozen.s,0,'BLC-1-067','front',1,true);
 const life=take(frozen.s,1,'BLC-1-003');
 const buried=frozen.s.players[1].life[0];
 frozen.s.players[1].life[0]=life;
 frozen.s.players[1].deck.push(buried);
 let revealed=frozen.s;
 for(let n=0;n<8&&revealed.phase!=='attack';n++)
  revealed=dispatchUniversalAction(frozen.packs,revealed,{type:'next'},{actor:revealed.pending?revealed.pending.player:revealed.active});
 revealed=dispatchUniversalAction(frozen.packs,revealed,{type:'attack',uid:striker.uid},{actor:0});
 if(revealed.pending?.kind==='block')
  revealed=dispatchUniversalAction(frozen.packs,revealed,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(revealed.pending.trigger,'color');
 assert.equal(legalUniversalActions(frozen.packs,revealed).some(a=>a.mode==='colorRestSkip'&&a.uid===wall.uid),true);
 revealed=dispatchUniversalAction(frozen.packs,revealed,{type:'chooseTrigger',mode:'colorRestSkip',uid:wall.uid},{actor:1});
 assert.equal(live(revealed,0,wall.uid).ready,true);
 assert.ok(universalPublicView(frozen.packs,revealed,1).players[0].front.some(c=>c&&c.uid===wall.uid&&
  c.restrictions.some(r=>r.kind==='skipNextActive')));
 const skipTurn=revealed.turn;
 revealed=march(frozen.packs,revealed,skipTurn);
 const later=live(revealed,0,wall.uid);
 assert.equal(later.ready,true);
 assert.equal(universalPublicView(frozen.packs,revealed,1).players[0].front.find(c=>c.uid===wall.uid).restrictions
  .some(r=>r.kind==='skipNextActive'),false);
 const bounced=main(deck,30025);
 const victim=put(bounced.s,0,'BLC-2-065','front',0,true);
 victim.buffs.push({bp:-1000,untilTurn:bounced.s.turn});
 const bounceLife=take(bounced.s,1,'BLC-4-041');
 const buriedBounce=bounced.s.players[1].life[0];
 bounced.s.players[1].life[0]=bounceLife;
 bounced.s.players[1].deck.push(buriedBounce);
 let flip=bounced.s;
 for(let n=0;n<8&&flip.phase!=='attack';n++)
  flip=dispatchUniversalAction(bounced.packs,flip,{type:'next'},{actor:flip.pending?flip.pending.player:flip.active});
 flip=dispatchUniversalAction(bounced.packs,flip,{type:'attack',uid:victim.uid},{actor:0});
 if(flip.pending?.kind==='block')
  flip=dispatchUniversalAction(bounced.packs,flip,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(flip.pending.trigger,'color');
 assert.equal(legalUniversalActions(bounced.packs,flip).some(a=>a.mode==='colorBounce'&&a.uid===victim.uid),true);
 flip=dispatchUniversalAction(bounced.packs,flip,{type:'chooseTrigger',mode:'colorBounce',uid:victim.uid},{actor:1});
 assert.ok(live(flip,0,victim.uid));
 assert.equal(flip.players[0].hand.some(c=>c.uid===victim.uid),false);
 const clash=main(deck,30026);
 const defender=put(clash.s,1,'BLC-2-065','front',0,true);
 const attacker=put(clash.s,0,'BLC-1-004','front',0,true);
 const lives=clash.s.players[1].life.length;
 let battle=clash.s;
 for(let n=0;n<6&&battle.phase!=='attack';n++)
  battle=dispatchUniversalAction(clash.packs,battle,{type:'next'});
 battle=dispatchUniversalAction(clash.packs,battle,{type:'attack',uid:attacker.uid});
 battle=dispatchUniversalAction(clash.packs,battle,{type:'chooseBlock',uid:defender.uid},{actor:1});
 assert.equal(battle.players[1].life.length,lives);
 assert.ok(battle.players[1].outside.some(c=>c.uid===defender.uid));
 assert.equal(battle.players[1].hand.some(c=>c.uid===defender.uid),false);
 const winner={id:'WIN',name:'勝者',color:'green',type:'character',energy:0,ap:1,bp:5000,gen:1,traits:[],trigger:null,implementation:'dsl',battleLoseToHand:true};
 const loser={id:'LOSE',name:'敗者',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'dsl',opponentBounceImmune:true,opponentRestImmune:true};
 const fillers=Array.from({length:11},(_,i)=>({id:'F'+i,name:'補位'+i,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,implementation:'vanilla'}));
 const mini=createUniversalPack({id:'q1469',cards:[winner,loser,...fillers]});
 const miniDeck=Object.fromEntries([['WIN',4],['LOSE',4],...fillers.slice(0,10).map(c=>[c.id,4]),[fillers[10].id,2]]);
 assert.deepEqual(validateUniversalDeck(mini,miniDeck),[]);
 const packs=[mini,mini];
 let rule=newUniversalMatch(packs,{decks:[miniDeck,miniDeck],seed:30027,first:0});
 for(let n=0;n<8&&rule.phase!=='main';n++)rule=dispatchUniversalAction(packs,rule,{type:'next'});
 const champ=put(rule,0,'WIN','front',0,true);
 const marked=put(rule,1,'LOSE','front',0,true);
 for(let n=0;n<6&&rule.phase!=='attack';n++)rule=dispatchUniversalAction(packs,rule,{type:'next'});
 rule=dispatchUniversalAction(packs,rule,{type:'attack',uid:champ.uid});
 rule=dispatchUniversalAction(packs,rule,{type:'chooseBlock',uid:marked.uid},{actor:1});
 assert.ok(rule.players[1].hand.some(c=>c.uid===marked.uid));
 assert.equal(rule.players[1].outside.some(c=>c.uid===marked.uid),false);
 assert.equal(assertUniversalMatch(played.packs,entered),true);
 assert.equal(assertUniversalMatch(raided.packs,stacked),true);
 assert.equal(assertUniversalMatch(plain.packs,stayed),true);
 assert.equal(assertUniversalMatch(hushed.packs,sealed),true);
 assert.equal(assertUniversalMatch(frozen.packs,revealed),true);
 assert.equal(assertUniversalMatch(bounced.packs,flip),true);
 assert.equal(assertUniversalMatch(clash.packs,battle),true);
 assert.equal(assertUniversalMatch(packs,rule),true);
});

function locationLine(s,uid){
 for(const line of ['front','energy'])
  if(s.players[0][line].some(c=>c?.uid===uid))return line;
 return null;
}
function fieldCount(s,p){
 return [...s.players[p].front,...s.players[p].energy].filter(c=>c&&cardHasTrait(bleach.cards[c.cardId],'護廷十三隊')).length;
}
