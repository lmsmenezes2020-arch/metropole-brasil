/** Actual HTTP sockets + exact shipped browser transport in isolated JS realms.
 * This is NOT a test across mobile carriers or of Netlify's production runtime.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import G from '../server/engine.cjs';
import { webcrypto } from 'node:crypto';
const base=path.resolve(new URL('..',import.meta.url).pathname), dir=await mkdtemp(path.join(os.tmpdir(),'metro-http-'));
const port=8791, origin=`http://127.0.0.1:${port}`, delay=ms=>new Promise(r=>setTimeout(r,ms));
const html=await readFile(path.join(base,'public/index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
let server;const nets=[];let passed=[];
function start(){server=spawn(process.execPath,['server/local.mjs'],{cwd:base,env:{...process.env,PORT:String(port),DATA_DIR:dir},stdio:'ignore'});}
async function waitFor(test,ms=7000){const start=Date.now();while(Date.now()-start<ms){if(await test())return;await delay(100);}throw Error('Timed out');}
async function ready(){await waitFor(async()=>{try{return (await fetch(origin+'/api/metro/info')).ok;}catch{return false;}});}
function realm(){
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const win=new EventTarget(),document=Object.assign(new EventTarget(),{visibilityState:'visible'}),navigator={onLine:true};
 let drop=false;
 const context=vm.createContext({Metro:G,localStorage:storage,sessionStorage:storage,window:win,document,navigator,
  location:{protocol:'http:',origin},crypto:webcrypto,setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,console,TypeError,AbortController,CustomEvent,Event,
  fetch:async(url,init)=>{const r=await fetch(new URL(url,origin),init);if(drop&&init?.body&&JSON.parse(init.body).op==='action'){drop=false;throw new TypeError('Simulated lost response after commit');}return r;}
 });
 vm.runInContext(scripts[1],context);
 return {N:win.MetroNet,navigator,win,dropNext:()=>drop=true};
}
async function connect(name,kind='join',code){const r=realm();const net=await r.N.connect({kind,name,room:code,roundLimit:0,onState:()=>{},onStatus:()=>{}});nets.push(net);return {r,net};}
const actor=(n,pid=n.pid)=>n.state.players.find(p=>p.id===pid);
async function act(n,a){await delay(150);await n.act(a);}
try{
 start();await ready();
 const A=await connect('Ana','create'),B=await connect('Bruno','join',A.net.code);
 await act(A.net,{type:'start'});
 const more=await Promise.all(['Caio','Dora','Eva','Fábio'].map(name=>connect(name,'join',A.net.code)));
 await waitFor(()=>nets.every(n=>n.state.players.length===6));passed.push('6 clientes HTTP independentes; 4 entram após o início');
 let owner=null;
 for(let i=0;i<18&&!owner;i++){
  await A.net.pulse(true);const active=nets.find(n=>n.pid===G.current(A.net.state).id);await active.pulse(true);
  if(active.state.turnState==='roll')await act(active,{type:'roll'});
  if(active.state.turnState==='buy'){
   await act(active,{type:'buy'});const t=G.TILES[actor(active).pos];
   if(t.type==='property'){await act(active,{type:'build',tileId:t.id});owner={net:active,tile:t.id,cash:actor(active).cash};}
  }
  if(active.state.turnState==='end')await act(active,{type:'end'});
 }
 assert(owner,'Não encontrou terreno durante simulação');passed.push('compra de terreno e construção confirmadas por HTTP');
 const before=actor(A.net).cash;
 A.r.dropNext();await assert.rejects(()=>act(A.net,{type:'bankLoan',amount:1000000}),/conexão HTTP/);
 await A.net.retry();await waitFor(()=>A.net.connected&&!A.net.pending);assert.equal(actor(A.net).cash,before+1000000);assert.equal(A.net.state.loans.filter(l=>l.borrowerId===A.net.pid).length,1);
 passed.push('resposta perdida após débito: reconexão não duplica empréstimo');
 await B.net.pulse(true);const wealth=actor(B.net).cash;B.net.notifyLeave();B.r.navigator.onLine=false;B.r.win.dispatchEvent(new Event('offline'));
 await waitFor(()=>A.net.state.pausedAt!=null);assert.equal(actor(A.net,B.net.pid).bankrupt,false);
 B.r.navigator.onLine=true;B.r.win.dispatchEvent(new Event('online'));await waitFor(()=>B.net.connected&&B.net.state.pausedAt==null);assert.equal(actor(B.net).cash,wealth);
 passed.push('queda/retorno simulado pelo transporte, pausa e patrimônio preservado');
 const ownerPid=owner.net.pid,ownerCash=actor(owner.net).cash;
 const stopping=once(server,'exit');server.kill('SIGTERM');await stopping;start();await ready();
 await Promise.all(nets.map(n=>n.retry()));await waitFor(()=>nets.every(n=>n.connected));
 await owner.net.pulse(true);assert.equal(actor(owner.net).cash,ownerCash);assert.equal(owner.net.state.properties[owner.tile].owner,ownerPid);assert.equal(owner.net.state.properties[owner.tile].level,1);
 passed.push('processo reiniciado; banco e arquivo persistem, sem depender do anfitrião');
 const hostToken=A.net.token,newRealm=realm();newRealm.N.storage.set('metro-br40-identity-'+A.net.code+'-ana',hostToken);
 const hostAgain=await newRealm.N.connect({kind:'join',name:'Ana',room:A.net.code,onState:()=>{},onStatus:()=>{}});nets.push(hostAgain);
 assert.equal(hostAgain.pid,A.net.pid);assert.equal(hostAgain.isHost,true);await A.net.pulse(true);assert.equal(A.net.halted,true);passed.push('atualização do anfitrião mantém autoridade; conexão antiga é invalidada');
 console.log(JSON.stringify({passed,number:passed.length,transport:'HTTP local; JavaScript do transporte sem alterações',externalNetworkTested:false},null,2));
}finally{for(const n of nets)n.close();if(server){const exit=once(server,'exit');server.kill();await Promise.race([exit,delay(1000)]);}await rm(dir,{recursive:true,force:true});}
