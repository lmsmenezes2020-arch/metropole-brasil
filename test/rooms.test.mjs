import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRoomService, intentValue, LEASE_MS, ROOM_LIFETIME_MS } from '../server/rooms.mjs';
import { blobRepository } from '../server/blob-repository.mjs';
import { fileRepository } from '../server/local-repository.mjs';
import G from '../server/engine.cjs';
const id=()=>randomBytes(24).toString('hex');
class MemoryRepo {
 constructor(){this.items=new Map();this.n=0;this.conflicts=0;}
 async read(k){await new Promise(r=>setImmediate(r));return structuredClone(this.items.get(k)||null);}
 async create(k,d){await new Promise(r=>setImmediate(r));if(this.items.has(k))return false;this.items.set(k,{data:structuredClone(d),etag:String(++this.n)});return true;}
 async compareAndSwap(k,d,e){await new Promise(r=>setImmediate(r));if(this.items.get(k)?.etag!==e){this.conflicts++;return false;}this.items.set(k,{data:structuredClone(d),etag:String(++this.n)});return true;}
}
function world(repo=new MemoryRepo()){
 const env={repo,time:Date.now(),rng:()=>0};
 env.handler=()=>createRoomService({repo,now:()=>env.time,sleep:async()=>{},rng:n=>env.rng(n)});
 env.service=env.handler();
 env.client=(name)=>new Client(env,name);
 env.fixture=async(code,mutate)=>{const r=await repo.read('room/'+code);mutate(r.data.state,r.data);assert(await repo.compareAndSwap('room/'+code,r.data,r.etag));};
 return env;
}
class Client{
 constructor(env,name){this.env=env;this.name=name;this.token=id();this.clientId=id();this.seq=0;this.createId=id();}
 async request(body,custom={}){
  this.env.time+=250;
  const req=new Request('http://test/api/metro',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+this.token,...custom.headers},body:JSON.stringify({apiVersion:4,code:this.code,pid:this.pid,clientId:this.clientId,...body})});
  const r=await (custom.service||this.env.service)(req,{ip:custom.ip||'test'});const data=await r.json();
  if(r.ok){this.pid=data.pid;this.code=data.code;this.seq=data.lastSeq;if(data.state)this.state=data.state;}
  return {status:r.status,...data};
 }
 create(){return this.request({op:'create',name:this.name,requestId:this.createId,roundLimit:0});}
 join(code=this.code){this.code=code;return this.request({op:'join',name:this.name});}
 sync(){return this.request({op:'sync'});}
 async action(action){await this.sync();return this.request({op:'action',seq:this.seq+1,requestId:id(),action,intent:intentValue(this.state,action)});}
}
async function pair(){const w=world(),a=w.client('Anfitrião'),b=w.client('Colega');assert.equal((await a.create()).status,200);assert.equal((await b.join(a.code)).status,200);assert.equal((await a.action({type:'start'})).receipt.error,null);await b.sync();return {w,a,b};}
const p=(client,pid=client.pid)=>client.state.players.find(x=>x.id===pid);

test('health identifica servidor e não anuncia conexão direta',async()=>{
 const w=world(),r=await w.service(new Request('http://test/api/metro/info'));const d=await r.json();assert.equal(d.apiVersion,4);assert.equal(d.requiresPeerJS,false);assert.equal(d.transport,'https');
});
test('criação idempotente: repetir requisição não cria sala nem capital novamente',async()=>{
 const w=world(),a=w.client('Ana');const first=await a.create(),again=await a.create();assert.equal(first.code,again.code);assert.equal(first.pid,again.pid);assert.equal(again.state.players.length,1);assert.equal(p(a).cash,25000000);
});
test('seis clientes simultâneos em instâncias independentes: CAS não perde jogadores',async()=>{
 const w=world(),a=w.client('Ana');await a.create();
 const others=['Bruno','Caio','Dora','Eva','Fábio'].map(n=>w.client(n));
 const results=await Promise.all(others.map(c=>c.request({op:'join',code:a.code,name:c.name},{service:w.handler(),ip:c.name})));
 assert(results.every(r=>r.status===200));await a.sync();assert.equal(a.state.players.length,6);assert(w.repo.conflicts>0);
 const seventh=w.client('Extra');assert.match((await seventh.join(a.code)).error,/vagas|Sala|seis/);
});
test('colega entra após início sem interromper a vez ou alterar bens existentes',async()=>{
 const {w,a,b}=await pair();const initial=p(a).cash,turn=a.state.turnIndex;
 const c=w.client('Atrasado');const r=await c.join(a.code);assert.equal(r.status,200);assert.equal(r.state.phase,'playing');assert.equal(r.state.turnIndex,turn);assert.equal(p(c).cash,25000000);assert.equal(p(c,a.pid).cash,initial);
});
test('só o anfitrião inicia e retira; queda não é retirada',async()=>{
 const {w,a,b}=await pair();const denied=await b.action({type:'remove',playerId:a.pid});assert.match(denied.receipt.error,/anfitrião/);
 await b.request({op:'leave'});await a.sync();assert(a.state.pausedAt!=null);assert.equal(p(a,b.pid).removed,false);assert.equal(p(a,b.pid).bankrupt,false);
 const removed=await a.action({type:'remove',playerId:b.pid});assert.equal(removed.receipt.error,null);const returner=w.client('Colega');assert.equal((await returner.join(a.code)).code,'PLAYER_REMOVED');
});
test('reconectar mantém saldo, posição, hotel e contratos — mesmo em outro navegador',async()=>{
 const {w,a,b}=await pair();await w.fixture(a.code,s=>{const q=G.player(s,b.pid);q.cash=12345000;q.pos=39;s.properties[39]={owner:b.pid,level:5,mortgaged:false};s.loans=[{id:'loan',borrowerId:b.pid,lenderId:a.pid,principal:1000000,total:1100000,balance:1100000,paid:0,rate:10,term:3,dueRound:20,status:'active',collateralId:39,createdAt:w.time}];});
 await b.request({op:'leave'});const c=w.client('  COLEGA ');await c.join(a.code);assert.equal(c.pid,b.pid);assert.equal(p(c).cash,12345000);assert.equal(p(c).pos,39);assert.equal(c.state.properties[39].level,5);assert.equal(c.state.loans[0].balance,1100000);
 const stale=await b.sync();assert.equal(stale.code,'SESSION_REPLACED');
});
test('atualização da página reassume sessão; aba antiga não consegue derrubar a nova',async()=>{
 const {w,a,b}=await pair(),c=w.client('Colega');c.token=b.token;await c.join(a.code);assert.equal(c.pid,b.pid);const old=await b.request({op:'leave'});assert.equal(old.code,'SESSION_REPLACED');await a.sync();assert.equal(p(a,b.pid).online,true);
});
test('nome igual online em novo dispositivo é recusado sem apagar jogador',async()=>{
 const {w,a,b}=await pair(),c=w.client('Colega');const r=await c.join(a.code);assert.equal(r.code,'NAME_CONNECTED');await a.sync();assert.equal(a.state.players.length,2);
});
test('anfitrião também retorna de outro aparelho sem servir a sala pelo celular',async()=>{
 const {w,a,b}=await pair();await a.request({op:'leave'});const host=w.client('Anfitrião');const r=await host.join(a.code);assert.equal(r.isHost,true);assert.equal(r.pid,a.pid);assert.equal(r.state.pausedAt,null);
});
test('ausência detectada pelo servidor pausa e congela prazo de leilão',async()=>{
 const {w,a,b}=await pair();await w.fixture(a.code,s=>{s.auction={tileId:1,bid:0,bidderId:null,passed:[],endsAt:w.time+180000};s.turnState='auction';});
 w.time+=LEASE_MS+5000;await a.sync();assert(a.state.pausedAt!=null);const before=a.state.auction.endsAt,paused=a.state.pausedAt;
 w.time+=20000;const c=w.client('Colega');await c.join(a.code);assert.equal(c.state.pausedAt,null);assert(c.state.auction.endsAt>before);assert.equal(c.state.round,1);assert(c.state.auction.endsAt>=before+w.time-paused-1000);
});
test('resposta perdida e reenvio de compra gera um único débito',async()=>{
 const {w,a,b}=await pair();await w.fixture(a.code,s=>{s.turnIndex=0;s.turnState='buy';s.players[0].pos=1;});await a.sync();
 const payload={op:'action',seq:a.seq+1,requestId:id(),action:{type:'buy'},intent:intentValue(a.state,{type:'buy'})};
 const one=await a.request(payload),two=await a.request(payload);assert.equal(one.receipt.error,null);assert.deepEqual(two.receipt,one.receipt);assert.equal(p(a).cash,23800000);assert.equal(a.state.properties[1].owner,a.pid);
});
test('sequência velha nunca reaplica dinheiro; ordem inválida rejeitada',async()=>{
 const {a}=await pair();const r=await a.request({op:'action',seq:a.seq+10,requestId:id(),action:{type:'bankLoan',amount:1000000}});assert.equal(r.code,'SYNC_REQUIRED');
 const old=await a.request({op:'action',seq:1,requestId:id(),action:{type:'bankLoan',amount:1000000}});assert.equal(old.code,'ACTION_OLD');
});
test('duas compras concorrentes do mesmo participante só uma é aceita',async()=>{
 const {w,a}=await pair();await w.fixture(a.code,s=>{s.turnState='buy';s.players[0].pos=1;});await a.sync();const seq=a.seq+1,action={type:'buy'},stamp=intentValue(a.state,action);
 const results=await Promise.all([1,2].map(()=>a.request({op:'action',seq,requestId:id(),action,intent:stamp},{service:w.handler()})));
 assert.equal(results.filter(r=>r.receipt&&!r.receipt.error).length,1);await a.sync();assert.equal(p(a).cash,23800000);
});
test('ação atrasada não lança dados em outro turno',async()=>{
 const {w,a}=await pair();await a.sync();const stamp=intentValue(a.state,{type:'roll'});await w.fixture(a.code,s=>s.turnCount++);
 const r=await a.request({op:'action',seq:a.seq+1,requestId:id(),action:{type:'roll'},intent:stamp});assert.match(r.receipt.error,/situação/);assert.equal(r.state.rollSerial,0);
});
test('casas sem grupo, fora da vez, até hotel; companhias continuam bloqueadas',async()=>{
 const {w,a,b}=await pair();await w.fixture(a.code,s=>{s.properties[1].owner=b.pid;s.properties[5].owner=b.pid;});
 for(let i=1;i<=5;i++){const r=await b.action({type:'build',tileId:1});assert.equal(r.receipt.error,null);assert.equal(r.state.properties[1].level,i);}
 assert.equal(p(b).cash,25000000-5*450000);assert.equal((await b.action({type:'build',tileId:1})).receipt.error,'O hotel já está construído.');
 assert.match((await b.action({type:'build',tileId:5})).receipt.error,/Companhias/);
});
test('empréstimo bancário: juros, limite, amortização persistidos',async()=>{
 const {a}=await pair();const r=await a.action({type:'bankLoan',amount:1000000,collateralId:null});assert.equal(r.receipt.error,null);assert.equal(p(a).cash,26000000);const loan=a.state.loans[0];assert.equal(loan.total,1100000);
 assert.match((await a.action({type:'bankLoan',amount:1000000})).receipt.error,/banco/);
 assert.equal((await a.action({type:'loanPay',loanId:loan.id,amount:100000})).receipt.error,null);assert.equal(a.state.loans[0].balance,1000000);
});
test('empréstimo entre jogadores só transfere após aceite e conserva caixa',async()=>{
 const {a,b}=await pair();await b.action({type:'loanOffer',borrowerId:b.pid,lenderId:a.pid,amount:1000000,rate:10,term:3,collateralId:null});assert.equal(p(b).cash,25000000);
 const accepted=await a.action({type:'loanReply',accept:true});assert.equal(accepted.receipt.error,null);assert.equal(p(a).cash,24000000);assert.equal(p(a,b.pid).cash,26000000);assert.equal(a.state.loans[0].balance,1100000);
});
test('imóvel quita empréstimo vencido, devolve excedente e libera garantia',async()=>{
 const {w,a,b}=await pair();await w.fixture(a.code,s=>s.properties[1].owner=b.pid);
 await b.action({type:'loanOffer',borrowerId:b.pid,lenderId:a.pid,amount:1000000,rate:10,term:3,collateralId:1});await a.action({type:'loanReply',accept:true});
 await w.fixture(a.code,s=>{s.round=s.loans[0].dueRound;s.turnIndex=1;s.turnState='roll';G.player(s,b.pid).cash=0;G.collectDue(s);});
 const r=await a.action({type:'foreclose',tileId:1,toBank:false});assert.equal(r.receipt.error,null);assert.equal(r.state.properties[1].owner,a.pid);assert.equal(G.player(r.state,b.pid).cash,100000);assert.equal(r.state.loans[0].status,'paid');
});
test('sem bens no vencimento declara falência, nunca por queda',async()=>{
 const {w,a,b}=await pair();await b.action({type:'bankLoan',amount:1000000});await w.fixture(a.code,s=>{s.round=s.loans[0].dueRound;s.turnIndex=1;s.turnState='roll';G.player(s,b.pid).cash=0;G.collectDue(s);});await a.sync();assert.equal(p(a,b.pid).bankrupt,true);assert.equal(a.state.phase,'finished');
});
test('companhia cobra tarifa × soma, não percentual',()=>{
 const s=G.join(G.createRoom('A'),'B');const b=s.players[1];s.properties[5].owner=b.id;assert.equal(G.rent(s,G.TILES[5],6),240000);
});
test('servidor ignora saldo, patrimônio e dados inventados pelo cliente',async()=>{
 const {a}=await pair();await a.request({op:'sync',cash:999999999,properties:{1:{owner:a.pid}},dice:[6,6],state:{}});assert.equal(p(a).cash,25000000);assert.equal(a.state.properties[1].owner,null);
 const bad=await a.request({op:'action',seq:a.seq+1,requestId:id(),action:{type:'setCash',amount:99999999}});assert.match(bad.receipt.error,/desconhecida/);assert.equal(p(a).cash,25000000);
});
test('API rejeita outra origem, token ausente e mensagem grande',async()=>{
 const w=world(),a=w.client('A');await a.create();assert.equal((await a.request({op:'sync'},{headers:{Origin:'https://evil.example'}})).status,403);
 const r=await w.service(new Request('http://test/api/metro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiVersion:4,op:'sync'})}));assert.equal(r.status,400);
 const big=await a.request({op:'sync',filler:'x'.repeat(20000)});assert.equal(big.status,413);
});
test('resposta pública não revela token, credenciais, hash de sessão ou baralho',async()=>{
 const w=world(),a=w.client('A'),r=await a.create(),text=JSON.stringify(r);assert(!text.includes(a.token));assert(!text.includes('tokenHash'));assert.equal(r.state.deck.length,0);assert(!('seats' in r));
});
test('reinício do serviço e repositório mantém imóveis e identidade em disco',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'metro4-'));
 try{
  const w=world(fileRepository(dir)),a=w.client('A');await a.create();await w.fixture(a.code,s=>{s.players[0].cash=17000000;s.properties[3]={owner:a.pid,level:2,mortgaged:false};});
  const after=world(fileRepository(dir)),b=after.client('A');b.token=a.token;const r=await b.join(a.code);assert.equal(r.pid,a.pid);assert.equal(p(b).cash,17000000);assert.equal(r.state.properties[3].level,2);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('falha de gravação não confirma jogada nem produz falso salvamento',async()=>{
 const {w,a}=await pair();const original=w.repo.compareAndSwap.bind(w.repo);w.repo.compareAndSwap=async()=>{throw new Error('offline');};const r=await a.action({type:'bankLoan',amount:1000000});assert.equal(r.status,503);w.repo.compareAndSwap=original;await a.sync();assert.equal(p(a).cash,25000000);assert.equal(a.state.loans.length,0);
});
test('adapter Blobs usa CAS; modified:true sem ETag é erro, nunca sucesso',async()=>{
 const calls=[],store={set:async(...args)=>{calls.push(args);return {modified:true,etag:'e1'};},getWithMetadata:async()=>({data:{a:1},etag:'e0'})};const r=blobRepository(store);
 assert.equal(await r.create('a',{x:1}),true);assert.deepEqual(calls[0][2],{onlyIfNew:true});assert.equal(await r.compareAndSwap('a',{x:2},'e1'),true);assert.deepEqual(calls[1][2],{onlyIfMatch:'e1'});
 store.set=async()=>({modified:false});assert.equal(await r.compareAndSwap('a',{},'e2'),false);
 store.set=async()=>({modified:true,etag:''});await assert.rejects(()=>r.create('a',{}),/Unconfirmed/);
});
test('limite de criação evita salas ilimitadas e nenhuma assinatura é acionada',async()=>{
 const w=world();for(let i=0;i<12;i++)assert.equal((await w.client('P'+i).create()).status,200);const r=await w.client('Extra').create();assert.equal(r.code,'RATE_LIMIT');
});
test('salas expiram só após inatividade e informam erro específico',async()=>{
 const w=world(),a=w.client('A');await a.create();w.time+=ROOM_LIFETIME_MS+1000;const r=await a.sync();assert.equal(r.code,'ROOM_EXPIRED');
});
test('HTML não carrega PeerJS nem tenta servir sala pelo anfitrião',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');assert(!html.includes('new Peer('));assert(!html.includes('peerjs.min.js'));assert(html.includes('class ServerNet'));assert(html.includes('Banco & contratos'));
});
