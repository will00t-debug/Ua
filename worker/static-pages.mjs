export const ONLINE_UI_VERSION='20261104step10';
export const SOURCE_ONLINE_RELEASE={version:ONLINE_UI_VERSION,script:'/online.mjs?v='+ONLINE_UI_VERSION};

export function legacyClientRedirect(path,method,release){
 if(!['GET','HEAD'].includes(method)||path!=='/online.mjs'||!/^\/online-client-[A-Z0-9]{8}\.mjs$/.test(release.script))return null;
 return new Response(null,{status:307,headers:{location:release.script,'cache-control':'no-store','x-ua-ui-version':release.version}});
}

// HTML chooses the JS release. Always ask the current asset binding for a
// complete document instead of allowing an older browser document via 304.
export async function currentPage(request,assets,pathname,version=ONLINE_UI_VERSION){
 const url=new URL(request.url);url.pathname=pathname;
 const headers=new Headers(request.headers);
 for(const name of ['if-none-match','if-modified-since','range','if-range'])headers.delete(name);
 const asset=await assets.fetch(new Request(url,{method:request.method,headers,redirect:request.redirect}));
 const response=new Response(asset.body,asset);
 response.headers.set('cache-control','no-store, max-age=0');
 response.headers.set('x-ua-ui-version',version);
 return response;
}
