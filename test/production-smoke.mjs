/** Smoke test of the deployed service using a NEW disposable room only.
 * Does not inspect or modify any room belonging to real players.
 * Credentials and room codes are deliberately not printed.
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { intentValue } from '../server/rooms.mjs';
import G from '../server/engine.cjs';
const origin='https://celadon-biscotti-4a8f9d.netlify.app';
const id=()=>randomBytes(24).toString('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const passed=[];
const infoResponse=await fetch(origin+'/api/metro/info',{signal:AbortSignal.timeout(30000)});
assert(infoResponse.ok,'API indisponível');
const info=await infoResponse.json();assert.equal(info.apiVersion,4);assert.equal(info.savedOnServer,true);
passed.push('API de produção 4.0 disponível por HTTPS');
class Client{
 constructor(name){this.name=name;this.token=id();this.clientId=id();this.seq=0;}
 async call(data){
  const payload={apiVersion:4,code:this.code,pid:this.pid,clientId:this.clientId,...data};
  const r=await fetch(origin+'/api/metro',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+this.token,Origin:origin},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
  const d=await r.json();
  assert(r.ok,`Operação ${data.op}: HTTP ${r.status} ${d.code||''} ${d.error||''}`);
  this.pid=d.pid;this.code=d.code;this.seq=d.lastSeq;if(d.state)this.state=d.state;
  if(d.receipt)assert.equal(d.receipt.error,null,d.receipt.error||'');return d;
 }
 create(){return this.call({op:'create',name:this.name,requestId:id(),roundLimit:10});}
 join(code){this.code=code;return this.call({op:'join',name:this.name});}
 sync(){return this.call({op:'sync'});}
 async act(action){await this.sync();await pause(150);return this.call({op:'action',seq:this.seq+1,requestId:id(),action,intent:intentValue(this.state,action)});}
 player(){return this.state.players.find(p=>p.id===this.pid);}
}
const suffix=randomBytes(3).toString('hex');
let clients=Array.from({length:6},(_,i)=>new Client(`Valida${i+1}-${suffix}`));
let host=clients[0];
await host.create();await clients[1].join(host.code);await host.act({type:'start'});
await Promise.all(clients.slice(2).map(c=>c.join(host.code)));
await Promise.all(clients.map(c=>c.sync()));
assert(clients.every(c=>c.state.players.length===6));assert.equal(host.state.phase,'playing');
passed.push('Seis participantes reais na API, quatro entrando após o início');
const bank=await host.act({type:'bankLoan',amount:1000000,collateralId:null});
assert.equal(host.player().cash,26000000);assert.equal(bank.state.loans[0].balance,1100000);
passed.push('Empréstimo e juros persistidos no armazenamento de produção');
let bought=null;
for(let turn=0;turn<18&&!bought;turn++){
 await Promise.all(clients.map(c=>c.sync()));
 const active=clients.find(c=>c.pid===G.current(host.state).id);
 if(active.state.turnState==='roll')await active.act({type:'roll'});
 if(active.state.turnState==='buy'){
  await active.act({type:'buy'});
  const tile=G.TILES[active.player().pos];
  if(tile.type==='property'){
   await active.act({type:'build',tileId:tile.id});
   bought={owner:active,tileId:tile.id,cash:active.player().cash};
  }
 }
 if(active.state.turnState==='end')await active.act({type:'end'});
}
assert(bought,'A simulação não alcançou uma propriedade');
passed.push('Compra e construção em terreno confirmadas pelo servidor');
const old=bought.owner;await old.call({op:'leave'});
await (clients.find(c=>c!==old)).sync();
const resumed=new Client(old.name);await resumed.join(host.code);
assert.equal(resumed.pid,old.pid);assert.equal(resumed.player().cash,bought.cash);
assert.equal(resumed.state.properties[bought.tileId].owner,old.pid);
assert.equal(resumed.state.properties[bought.tileId].level,1);
clients=clients.map(c=>c===old?resumed:c);if(host===old)host=resumed;
passed.push('Retorno por código e mesmo nome em nova sessão mantém dinheiro e construção');
await host.call({op:'leave'});
const newHost=new Client(host.name);const recovered=await newHost.join(host.code);
assert.equal(recovered.pid,host.pid);assert.equal(recovered.isHost,true);
clients=clients.map(c=>c===host?newHost:c);host=newHost;
await Promise.all(clients.map(c=>c.sync()));assert.equal(host.state.pausedAt,null);
passed.push('Anfitrião retorna em nova sessão; partida retoma sem depender do navegador original');
// Release all six presence leases so the disposable room does not continue playing.
await Promise.all(clients.map(c=>c.call({op:'leave'})));
console.log(JSON.stringify({production:true,site:origin,checks:passed,passed:passed.length,mobileCarriersTested:false},null,2));
