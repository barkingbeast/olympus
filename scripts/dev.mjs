import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Method not allowed')}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=path.resolve(root,'.'+pathname);
  if(file!==path.resolve(root)&&!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is busy. Set PORT to another number.`:e.message);process.exitCode=1});
server.listen(port,'127.0.0.1',()=>console.log(`OLYMPUS preview: http://localhost:${port}/\nPress Ctrl+C to stop. Live Supabase data is used after sign-in; demo is device-local.`));
