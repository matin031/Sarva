for(const text of ['صلاح کار کجا و من خراب کجا','ز راه میکده یاران عنان بگردانید']) {
  for(const term of [text, '"'+text+'"']) {
    const url=new URL('https://api.ganjoor.net/api/ganjoor/poems/search');
    url.search=new URLSearchParams({term,PageNumber:'1',PageSize:'20'});
    const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
    const poems=await r.json();
    console.log(JSON.stringify({term,status:r.status,paging:r.headers.get('paging-headers'),poems:Array.isArray(poems)?poems.map(p=>({id:p.id,url:p.fullUrl})):poems}));
  }
}
