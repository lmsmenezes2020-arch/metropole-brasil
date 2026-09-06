/** Dependency-free local harness. Use npm run dev for the real Netlify emulator. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fileRepository } from './local-repository.mjs';
import { createRoomService } from './rooms.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||8787);
const handle=createRoomService({repo:fileRepository(process.env.DATA_DIR||path.join(base,'.local-data')),storageName:'local-file-test'});
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.split('?')[0].startsWith('/api/metro')){
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const url='http://'+req.headers.host+req.url;
   const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'||req.method==='HEAD'?{}:{body:Buffer.concat(chunks)})});
   const result=await handle(request,{ip:req.socket.remoteAddress});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return;
  }
  const file=req.url.split('?')[0];
  if(!['/','/index.html','/favicon.ico','/versao.json'].includes(file)){res.writeHead(404);res.end('Not found');return;}
  if(file==='/favicon.ico'){res.writeHead(204);res.end();return;}
  res.writeHead(200,{'Content-Type':file==='/versao.json'?'application/json':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(await readFile(path.join(base,'public',file==='/versao.json'?'versao.json':'index.html')));
 }catch{res.writeHead(500);res.end('Erro local.');}
});
server.listen(port,'0.0.0.0',()=>console.log(`Metrópole 4.0: http://localhost:${port} (harness local, não é link público)`));
