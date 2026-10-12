#!/usr/bin/env python3
"""Cache verified official card images; reuse research downloads when available."""
import concurrent.futures, json, shutil, sys
from pathlib import Path
from urllib.request import Request,urlopen

root=Path(sys.argv[1]);target=Path(__file__).resolve().parents[1]/'dist/assets/cards'
items=[]
for filename in ['bleach-sets/ua08bt-cards.json','bleach-sets/ex07bt-cards.json','bleach-third/official-cards.json','bleach-books/cards.json']:
 for c in json.loads((root/filename).read_text()):
  number=c.get('cardNo',c.get('number'));url=c.get('imageUrl',c.get('imageSource',c.get('image')))
  name=number.replace('/','_')+'.png';local=c.get('imageLocal',c.get('imageFile'))
  items.append((name,url,Path(local) if local else None))
def fetch(row):
 name,url,local=row;dest=target/name
 if dest.exists() and dest.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'):return name
 if local and local.exists():shutil.copyfile(local,dest)
 else:
  last=None
  for _ in range(3):
   try:
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=35) as r:data=r.read()
    if not data.startswith(b'\x89PNG\r\n\x1a\n') or len(data)<1000:raise ValueError('Invalid PNG '+name)
    dest.write_bytes(data);break
   except Exception as e:last=e
  else:raise last
 return name
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 for n,name in enumerate(ex.map(fetch,items),1):
  if n%25==0:print(f'Cached {n}/{len(items)} images',flush=True)
print(f'Cached {len(items)} official card images',flush=True)
