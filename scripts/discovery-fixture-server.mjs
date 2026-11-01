// Disposable native-HTTP contract fixture, never used by hosted deployments.
import http from 'node:http';
let requests=0;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:54329');res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/health'){res.end(JSON.stringify({fixture:'duzelo-m04'}));return;}
 if(url.pathname==='/counts'){res.end(JSON.stringify({requests}));return;}
 if(url.searchParams.get('country')!=='za'||url.searchParams.get('limit')!=='5'||url.searchParams.get('autocomplete')!=='false'){res.statusCode=400;res.end('{}');return;}
 requests++;
 if(url.pathname.includes('Unavailable')){res.statusCode=503;res.end('{}');return;}
 const found=url.pathname.includes('Fictional');
 res.end(JSON.stringify({features:found?[{place_name:'Fictional rural farm, synthetic test area',center:[30.071234,-27.041234]}]:[]}));
}).listen(54329,'127.0.0.1');
