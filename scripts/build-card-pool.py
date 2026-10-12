#!/usr/bin/env python3
"""Build a local catalog from previously fetched, annotated official entries.

Only exact, reviewed effect templates enter the automatic rule registry. A card
with any remaining clause stays available for construction, but cannot silently
enter a game with an omitted effect.
"""
import json, re, sys
from pathlib import Path

root=Path(sys.argv[1]); out=Path(__file__).resolve().parents[1]/'dist'
load=lambda p:json.loads((root/p).read_text())
types={'キャラクター':'character','イベント':'event','フィールド':'field'}
triggers={'ドロー':'draw','ゲット':'get','アクティブ':'active','スペシャル':'special','ファイナル':'final','レイド':'raid','カラー':'color'}
keys={'黒崎一護':'ichigo','井上織姫':'orihime','浦原喜助':'urahara','阿散井恋次':'renji','朽木ルキア':'rukia','茶渡泰虎':'chad','石田雨竜':'uryu'}
def text(s):return re.sub(r'\s+','',s.replace('【','[').replace('】',']'))
def key(s):
 s=re.sub(r'\s+','',s)
 return keys.get(s,s)
def trigger(s):
 m=re.search(r'\[([^]]+)\]',text(s));return triggers.get(m[1]) if m else None
def safe_rules(c):
 standard={'draw':'[ドロー]カードを1枚引く。','get':'[ゲット]このカードを手札に加える。','active':'[アクティブ]自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。','special':'[スペシャル]相手のフロントLのキャラを1枚選び、退場させる。','final':'[ファイナル]自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。'}
 if c['trigger'] in standard and text(c['triggerJa'])!=standard[c['trigger']]:return None
 r={}; lines=[text(s) for s in c['effectJa'].splitlines() if s.strip() and s.strip()!='-']
 for line in lines:
  if re.fullmatch(r'\[ステップ\](?:（自分の移動フェイズにフロントLからエナジーLへ移動できる）)?',line):r['step']=True;continue
  if re.fullmatch(r'\[インパクト無効\](?:（このキャラとバトルをしたキャラはこのバトル中、\[インパクト\]を失う）)?',line):r['impactNull']=True;continue
  if re.fullmatch(r'\[インパクト（1）\](?:（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）)?',line):r['impact']=1;continue
  if re.fullmatch(r'\[ダメージ（2）\](?:（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）)?',line):r['damage']=2;continue
  if re.fullmatch(r'\[2回ブロック\](?:（このキャラがこのターン初めてブロックした時、アクティブにする）)?',line):r['doubleBlock']=True;continue
  if re.fullmatch(r'このキャラがアクティブの場合、このキャラの発生エナジー\+\[(?:黄|紫|緑|青)\]。',line):r['activeEnergy']=True;continue
  hook=None; body=line
  for marker,h in [('登場時','entry'),('アタック時','attack'),('退場時','retire')]:
   if line.startswith('['+marker+']'):hook=h;body=line[len(marker)+2:];break
  if not hook and c['type']=='event':hook='event'
  fx=None
  if re.fullmatch(r'カードを([1-4])枚引く。',body):fx={'op':'draw','count':int(re.search(r'([1-4])枚',body)[1])}
  elif (m:=re.fullmatch(r'カードを([1-4])枚引き、自分の手札を([1-4])枚場外に置く。',body)):fx={'op':'drawDiscard','draw':int(m[1]),'discard':int(m[2])}
  elif (m:=re.fullmatch(r'自分の山札の上から([1-4])枚を場外に置く。',body)):fx={'op':'mill','count':int(m[1])}
  elif (m:=re.fullmatch(r'このキャラはこのターン中、BP\+([0-9]+)。',body)):fx={'op':'buff','target':'self','amount':int(m[1])}
  elif (m:=re.fullmatch(r'(?:自分の場の(他の)?キャラを1枚(まで)?選び、このターン中、BP\+([0-9]+)。)',body)):fx={'op':'buff','target':'own','other':bool(m[1]),'optional':bool(m[2]),'amount':int(m[3])}
  elif (m:=re.fullmatch(r'相手のフロントLのキャラを1枚(まで)?選び、このターン中、BP-([0-9]+)。',body)):fx={'op':'buff','target':'oppFront','optional':bool(m[1]),'amount':-int(m[2])}
  elif (m:=re.fullmatch(r'(?:BP([0-9]+)以下の)?相手のフロントLのキャラを1枚(まで)?選び、レストにする。',body)):fx={'op':'rest','target':'oppFront','optional':bool(m[2]),**({'bpMax':int(m[1])} if m[1] else {})}
  elif body=='必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。':fx={'op':'bounceSmall'}
  elif body=='自分のAPカードを2枚まで選び、アクティブにする。':fx={'op':'recoverAp','count':2}
  if hook and fx:r.setdefault(hook,[]).append(fx);continue
  if (m:=re.fullmatch(r'\[起動メイン\](?:\[フロントLにある場合\])?\[レストにする\]\[ターン1\]このターン中、このキャラの発生エナジー\+\[(?:黄|紫|緑|青)\]。メインフェイズ終了時、このキャラを退場させる。',line)):
   r['ability']={'once':True,'front':'[フロントLにある場合]' in line,'rest':True,'effects':[{'op':'energyBoost','retire':True}]};continue
  if (m:=re.fullmatch(r'\[起動メイン\]\[フロントLにある場合\]\[レストにする\]相手のフロントLのキャラを1枚選び、レストにする。',line)):
   r['ability']={'front':True,'rest':True,'effects':[{'op':'rest','target':'oppFront'}]};continue
  return None
 # COLOR is card-specific, never inferred from color alone.
 if c['trigger']=='color':
  t=text(c['triggerJa'])
  if t=='[カラー]相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。':r['color']={'op':'freeze','target':'oppFront'}
  elif t=='[カラー]BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。':r['color']={'op':'bounce','target':'oppFront','bpMax':3500}
  elif t=='[カラー]自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。':r['color']={'zone':'outside','color':'purple','front':True}
  elif t=='[カラー]自分の手札から必要エナジーが2以下で消費APが1の緑のキャラカードを1枚自分の場にアクティブで登場させる。':r['color']={'zone':'hand','color':'green'}
  else:return None
 return r

cards=[]
for filename,setid in [('bleach-sets/ua08bt-cards.json','b1'),('bleach-sets/ex07bt-cards.json','b2')]:
 for c in load(filename):
  cards.append({'identity':c['identity'],'number':c['cardNo'],'name':c['nameZh'],'nameJa':c['nameJa'],'key':key(c['nameJa']),'color':c['color'],'energy':c['needEnergy'],'ap':c['ap'],'bp':c['bp'],'gen':c['generatedEnergy'],'type':types[c['typeJa']],'traits':c.get('traitsZh',[]),'effect':c['effectZh'],'effectJa':c['effectJa'],'trigger':trigger(c['triggerJa']),'triggerJa':c['triggerJa'],'triggerEffect':c['triggerZh'],'rarity':c['rarity'],'sets':[setid],'aliases':[c['cardNo']],'imageSource':c['imageUrl'],'source':c['detailUrl']})
annotations=load('bleach-third/annotations.json')
for c in load('bleach-third/official-cards.json'):
 a=annotations[c['id'][-3:]]
 cards.append({'identity':c['id'],'number':c['number'],'name':a['nameZh'],'nameJa':c['name_jp'],'key':key(c.get('nameZh',a['nameZh'])),'color':c['color'],'energy':c['requiredEnergy'],'ap':int(c['ap']),'bp':int(re.search(r'\d+',c['bp'])[0]) if re.search(r'\d+',c['bp']) else 0,'gen':sum(x['count'] for x in c['generated']),'type':types[c['category']],'traits':c.get('traitsZh',[]),'effect':a['effectZh'],'effectJa':c['effect'],'trigger':trigger(c['trigger']),'triggerJa':c['trigger'],'triggerEffect':c.get('triggerZh',a.get('triggerZh','')),'rarity':c['rarity'],'sets':['b3'],'aliases':[c['number']],'imageSource':c['image'],'source':c['source'],'uncertainty':a.get('uncertainty',c.get('uncertainty'))})
for c in load('bleach-books/cards.json'):
 cards.append({'identity':c['canonicalId'],'number':c['number'],'name':c['nameZh'],'nameJa':c['nameJp'],'key':key(c['nameJp']),'color':c['color'],'energy':c['energy'],'ap':c['ap'],'bp':c['bp'],'gen':c['generated'],'type':c['type'],'traits':c['traitsZh'],'effect':c['effectZh'],'effectJa':c['effectJp'],'trigger':c['triggerKind'],'triggerJa':c['triggerJp'],'triggerEffect':c['triggerZh'],'rarity':'PR','sets':['book' if c['isBook'] else 'nc'],'aliases':[c['number']],'imageSource':c['imageSource'],'source':c['source']})
registry={}
verified_aliases={}
for f in ['bleach-sets/ua08bt-index.json','bleach-sets/ex07bt-index.json']:
 for row in load(f)['variants']:
  identity=row['cardNo'].split('/')[-1]
  verified_aliases.setdefault(identity,[]).append(row['variantNo'])
for row in load('bleach-books/aliases.json'):
 if not row['isAP']:verified_aliases.setdefault(row['canonicalId'],[]).append(row['number'])
for row in load('bleach-third/official-cards.json'):
 verified_aliases.setdefault(row['id'],[]).extend(row.get('parallelNumbers',[]))
for c in cards:
 assert isinstance(c['energy'],int) and isinstance(c['bp'],int) and isinstance(c['ap'],int),c['number']
 assert c['name'] and c['effect'] and (not c['trigger'] or c['triggerEffect']),c['number']
 c['image']='assets/cards/'+c['number'].replace('/','_')+'.png'
 c['variants']=[{'set':c['sets'][0],'number':c['number'],'image':c['image'],'source':c['source']}]
 c['aliases']=list(dict.fromkeys(c['aliases']+verified_aliases.get(c['identity'],[])))
 c['tag']='・'.join([x for ja,x in [('レイド','Raid'),('ステップ','Step'),('インパクト','Impact'),('登場時','登場'),('アタック時','攻擊'),('起動メイン','起動'),('退場時','退場')] if ja in c['effectJa']]) or '基礎角色' if c['type']=='character' else '事件效果' if c['type']=='event' else '場域效果'
 c['setName']=next((x for x in c['sets']),None)
 rules=safe_rules(c)
 if rules is not None and not c.get('uncertainty'):registry[c['identity']]=rules
 # The original clauses remain an audit input, not a runtime text interpreter.
 del c['effectJa'];del c['triggerJa'];del c['imageSource']
(out/'expansion-cards.mjs').write_text('// Verified official base card catalog. Reprints share identity.\nexport const EXPANSION_CARDS='+json.dumps(cards,ensure_ascii=False,separators=(',',':'))+';\n')
(out/'card-rules.mjs').write_text('// Explicit supported profiles; unrecognized clauses are construction-only.\nexport const CARD_RULES='+json.dumps(registry,ensure_ascii=False,separators=(',',':'))+';\n')
print(json.dumps({'rows':len(cards),'unique':len(set(c['identity'] for c in cards)),'automaticProfiles':len(registry)},ensure_ascii=False))
