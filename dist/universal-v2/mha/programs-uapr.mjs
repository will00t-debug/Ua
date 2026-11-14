// UAPR/MHA-P-001–003. Ready only when every printed sentence is a shared
// V2 operation. This file is not imported by the MHA-1 or MHA-2 packs.
// The new operations are generic and are reported in
// docs/v2-handoff/V2-MHA-uapr-shared.md. No card id is branched in the engine.

export const UAPR_MHA_PROGRAMS=Object.freeze({
 'MHA-P-001':Object.freeze({
  ready:true,
  implementation:'dsl',
  impactNull:true,
  handPlayBannedWhileOtherTrait:Object.freeze({trait:'A組',excludeName:'緑谷 出久'}),
  distinctNameBp:Object.freeze({
   trait:'ワン・フォー・オール',zones:Object.freeze(['field','outside']),per:500,turn:'own'
  }),
  notes:'UAPR/MHA-P-001。手札登場只在自己場上有其他卡名的 A組 時被禁止。沒有突襲指定。衝擊無效。自己回合，自己場上與場外每個不同的ワン・フォー・オール卡名 BP+500。'
 }),
 'MHA-P-002':Object.freeze({
  ready:true,
  implementation:'dsl',
  emptyOwnFieldHandEnergyDiscount:2,
  effects:Object.freeze({
   onPlay:Object.freeze([Object.freeze({
    op:'optionalHandOutsideThen',
    then:Object.freeze([Object.freeze({
     op:'enemyBpDown',bp:2000,minBp:2500,zone:'front'
    })])
   })]),
   onRaided:Object.freeze([Object.freeze({op:'replayOnPlay'})])
  }),
  notes:'UAPR/MHA-P-002。自己場上沒有卡時，手牌的必要能量減 2，印刷能量仍是紫 2。被突襲時重放登場時，並與突襲者的登場時任選順序。支付 1 張手牌到場外後，才選對方前線目前 BP 2500 以上的 1 張，本回合 BP-2000。'
 }),
 'MHA-P-003':Object.freeze({
  ready:true,
  implementation:'dsl',
  impactNull:true,
  effects:Object.freeze({
   onPlay:Object.freeze([Object.freeze({
    op:'tuckFacedownUnder',from:'hand',
    host:Object.freeze({names:Object.freeze(['ホークス'])}),
    count:1,optional:true,
    then:Object.freeze([Object.freeze({
     op:'takeTopHandRestOutside',count:2,upTo:1,whenHost:'self'
    })])
   })])
  }),
  notes:'UAPR/MHA-P-003。衝擊無效。登場時可將 1 張手牌蓋到自己場上的〈ホークス〉下面。只有蓋到這張角色自己下面時，看自己牌庫頂 2 張，最多 1 張加入手牌，其餘放場外。Q2069 的蓋牌可見範圍沿用既有預覽。'
 })
});
