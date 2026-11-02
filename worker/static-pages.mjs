export const ONLINE_UI_VERSION='20261103onlinefix1';

// HTML chooses the JS release. Always ask the current asset binding for a
// complete document instead of allowing an older browser document via 304.
export async function currentPage(request,assets,pathname){
 const url=new URL(request.url);url.pathname=pathname;
 const headers=new Headers(request.headers);
 for(const name of ['if-none-match','if-modified-since','range','if-range'])headers.delete(name);
 const asset=await assets.fetch(new Request(url,{method:request.method,headers,redirect:request.redirect}));
 const response=new Response(asset.body,asset);
 response.headers.set('cache-control','no-store, max-age=0');
 response.headers.set('x-ua-ui-version',ONLINE_UI_VERSION);
 return response;
}
