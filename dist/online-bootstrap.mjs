import {fetchOnlineRelease,markOnlineRelease} from './online-updates.mjs';

export async function startOnlineClient({doc=globalThis.document,fetcher=globalThis.fetch,origin=globalThis.location.origin}={},retry=false){
 const root=doc.querySelector('#app');
 const panel=doc.createElement('section');panel.className='panel';panel.setAttribute('role','status');
 const title=doc.createElement('h1');title.textContent='正在準備對戰介面…';panel.append(title);root.replaceChildren(panel);
 const failed=()=>{
  title.textContent='對戰介面載入失敗';
  const text=doc.createElement('p');text.textContent='請重新載入介面，再繼續對局。';
  const button=doc.createElement('button');button.type='button';button.textContent='重新載入介面';
  button.addEventListener('click',()=>{void startOnlineClient({doc,fetcher,origin},true);});
  panel.replaceChildren(title,text,button);
 };
 try{
  const release=await fetchOnlineRelease(fetcher,origin);markOnlineRelease(release.version,doc);
  const script=doc.createElement('script');script.type='module';
  const url=new URL(release.script);if(retry)url.searchParams.set('retry',Date.now());
  script.src=url.href;script.dataset.onlineClient=release.version;
  script.addEventListener('error',()=>{
   script.remove();
   if(!retry)void startOnlineClient({doc,fetcher,origin},true);else failed();
  },{once:true});
  doc.head.append(script);
 }catch{failed();}
}

if(globalThis.document?.querySelector('#app'))void startOnlineClient();
