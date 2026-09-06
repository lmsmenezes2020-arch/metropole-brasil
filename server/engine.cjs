

/* Metrópole — motor de regras compartilhado; sem bibliotecas externas. */
(function(root,factory){ if(typeof module==='object'&&module.exports) module.exports=factory(); else root.Metro=factory(); })(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const COLORS=['#7649e8','#ed781a','#009f90','#e53287','#2772e8','#967900'];
const TOKENS=['◆','●','▲','✦','✚','■'];
const GROUPS={
  "conexao": {
    "name": "Batel · Curitiba",
    "color": "#a651ef",
    "colorName": "Lilás",
    "build": 450000
  },
  "comunidade": {
    "name": "Praia do Canto · Vitória",
    "color": "#05b9e5",
    "colorName": "Azul-claro",
    "build": 600000
  },
  "robotica": {
    "name": "Savassi e Lourdes · BH",
    "color": "#f52d98",
    "colorName": "Rosa",
    "build": 750000
  },
  "empreendedor": {
    "name": "Orlas do Nordeste",
    "color": "#ff871a",
    "colorName": "Laranja",
    "build": 900000
  },
  "inteligencia": {
    "name": "Moinhos de Vento · Porto Alegre",
    "color": "#f53e51",
    "colorName": "Vermelho",
    "build": 1000000
  },
  "sustentavel": {
    "name": "Litoral de Santa Catarina",
    "color": "#f4c818",
    "colorName": "Amarelo",
    "build": 1200000
  },
  "inteligente": {
    "name": "Jardins · São Paulo",
    "color": "#0ebc83",
    "colorName": "Verde",
    "build": 1500000
  },
  "premium": {
    "name": "Orla do Rio de Janeiro",
    "color": "#2852ef",
    "colorName": "Azul-escuro",
    "build": 1800000
  }
};
const STARTING_CASH=25000000, PASS_START=2000000, JAIL_FEE=500000, HOTEL_LEVEL=5, BID_MIN=200000, BID_STEP=100000;
const cashfmt=v=>"R$ "+Math.round(v).toLocaleString("pt-BR");
const STICKERS=[{"id": "deal", "emoji": "🤝", "label": "Fechado!"}, {"id": "rich", "emoji": "🤑", "label": "Bom negócio!"}, {"id": "home", "emoji": "🏠", "label": "Casa nova!"}, {"id": "hotel", "emoji": "🏨", "label": "Virou hotel!"}, {"id": "laugh", "emoji": "😂", "label": "Essa foi boa!"}, {"id": "wow", "emoji": "😮", "label": "Que jogada!"}, {"id": "dice", "emoji": "🎲", "label": "Boa sorte!"}, {"id": "oops", "emoji": "😅", "label": "Apertou o caixa!"}, {"id": "clap", "emoji": "👏", "label": "Mandou bem!"}, {"id": "party", "emoji": "🎉", "label": "Vamos jogar!"}, {"id": "thinking", "emoji": "🤔", "label": "Pensando…"}, {"id": "heart", "emoji": "💚", "label": "Valeu, turma!"}];
const TILES=[
  {
    "name": "Início",
    "short": "Início",
    "type": "start",
    "icon": "↗"
  },
  {
    "name": "Rua Comendador Araújo",
    "short": "C. Araújo",
    "city": "Curitiba · PR",
    "type": "property",
    "group": "conexao",
    "price": 1200000,
    "rents": [
      48000,
      144000,
      300000,
      540000,
      840000,
      1200000
    ]
  },
  {
    "name": "Brasil em Jogo — Sorte ou Revés",
    "short": "Sorte / Revés",
    "type": "chance",
    "icon": "✦"
  },
  {
    "name": "Avenida do Batel",
    "short": "Batel",
    "city": "Curitiba · PR",
    "type": "property",
    "group": "conexao",
    "price": 1400000,
    "rents": [
      56000,
      168000,
      350000,
      630000,
      980000,
      1400000
    ]
  },
  {
    "name": "Imposto sobre patrimônio",
    "short": "Imposto",
    "type": "tax",
    "icon": "▤",
    "amount": 2000000
  },
  {
    "name": "Metrô de São Paulo",
    "short": "Metrô SP",
    "type": "rail",
    "price": 2000000,
    "rate": 40000,
    "icon": "⇆"
  },
  {
    "name": "Rua Desembargador Sampaio",
    "short": "D. Sampaio",
    "city": "Vitória · ES",
    "type": "property",
    "group": "comunidade",
    "price": 1600000,
    "rents": [
      64000,
      192000,
      400000,
      720000,
      1120000,
      1600000
    ]
  },
  {
    "name": "Brasil em Jogo — Sorte ou Revés",
    "short": "Sorte / Revés",
    "type": "chance",
    "icon": "✦"
  },
  {
    "name": "Avenida Rio Branco",
    "short": "Rio Branco",
    "city": "Vitória · ES",
    "type": "property",
    "group": "comunidade",
    "price": 1800000,
    "rents": [
      72000,
      216000,
      450000,
      810000,
      1260000,
      1800000
    ]
  },
  {
    "name": "Avenida Saturnino de Brito",
    "short": "Saturnino",
    "city": "Vitória · ES",
    "type": "property",
    "group": "comunidade",
    "price": 2000000,
    "rents": [
      80000,
      240000,
      500000,
      900000,
      1400000,
      2000000
    ]
  },
  {
    "name": "Auditoria",
    "short": "Auditoria",
    "type": "jail",
    "icon": "⊞"
  },
  {
    "name": "Rua Fernandes Tourinho",
    "short": "F. Tourinho",
    "city": "Belo Horizonte · MG",
    "type": "property",
    "group": "robotica",
    "price": 2200000,
    "rents": [
      88000,
      264000,
      550000,
      990000,
      1540000,
      2200000
    ]
  },
  {
    "name": "Cemig",
    "short": "Cemig",
    "type": "utility",
    "price": 2500000,
    "rate": 50000,
    "icon": "ϟ"
  },
  {
    "name": "Rua Alagoas",
    "short": "Alagoas",
    "city": "Belo Horizonte · MG",
    "type": "property",
    "group": "robotica",
    "price": 2400000,
    "rents": [
      96000,
      288000,
      600000,
      1080000,
      1680000,
      2400000
    ]
  },
  {
    "name": "Avenida do Contorno",
    "short": "Contorno",
    "city": "Belo Horizonte · MG",
    "type": "property",
    "group": "robotica",
    "price": 2600000,
    "rents": [
      104000,
      312000,
      650000,
      1170000,
      1820000,
      2600000
    ]
  },
  {
    "name": "Rumo Logística",
    "short": "Rumo",
    "type": "rail",
    "price": 2400000,
    "rate": 60000,
    "icon": "⇆"
  },
  {
    "name": "Avenida Boa Viagem",
    "short": "Boa Viagem",
    "city": "Recife · PE",
    "type": "property",
    "group": "empreendedor",
    "price": 2800000,
    "rents": [
      112000,
      336000,
      700000,
      1260000,
      1960000,
      2800000
    ]
  },
  {
    "name": "Brasil em Jogo — Sorte ou Revés",
    "short": "Sorte / Revés",
    "type": "chance",
    "icon": "✦"
  },
  {
    "name": "Avenida Beira-Mar",
    "short": "Beira-Mar",
    "city": "Fortaleza · CE",
    "type": "property",
    "group": "empreendedor",
    "price": 3000000,
    "rents": [
      120000,
      360000,
      750000,
      1350000,
      2100000,
      3000000
    ]
  },
  {
    "name": "Avenida Oceânica",
    "short": "Oceânica",
    "city": "Salvador · BA",
    "type": "property",
    "group": "empreendedor",
    "price": 3200000,
    "rents": [
      128000,
      384000,
      800000,
      1440000,
      2240000,
      3200000
    ]
  },
  {
    "name": "Praça Livre",
    "short": "P. Livre",
    "type": "free",
    "icon": "♧"
  },
  {
    "name": "Rua Padre Chagas",
    "short": "P. Chagas",
    "city": "Porto Alegre · RS",
    "type": "property",
    "group": "inteligencia",
    "price": 3400000,
    "rents": [
      136000,
      408000,
      850000,
      1530000,
      2380000,
      3400000
    ]
  },
  {
    "name": "Brasil em Jogo — Sorte ou Revés",
    "short": "Sorte / Revés",
    "type": "chance",
    "icon": "✦"
  },
  {
    "name": "Rua 24 de Outubro",
    "short": "24 Outubro",
    "city": "Porto Alegre · RS",
    "type": "property",
    "group": "inteligencia",
    "price": 3600000,
    "rents": [
      144000,
      432000,
      900000,
      1620000,
      2520000,
      3600000
    ]
  },
  {
    "name": "Rua Marquês do Pombal",
    "short": "M. Pombal",
    "city": "Porto Alegre · RS",
    "type": "property",
    "group": "inteligencia",
    "price": 3800000,
    "rents": [
      152000,
      456000,
      950000,
      1710000,
      2660000,
      3800000
    ]
  },
  {
    "name": "Correios",
    "short": "Correios",
    "type": "rail",
    "price": 2800000,
    "rate": 80000,
    "icon": "✉"
  },
  {
    "name": "Avenida dos Búzios",
    "short": "Búzios",
    "city": "Jurerê · Florianópolis · SC",
    "type": "property",
    "group": "sustentavel",
    "price": 4000000,
    "rents": [
      160000,
      480000,
      1000000,
      1800000,
      2800000,
      4000000
    ]
  },
  {
    "name": "Avenida dos Salmões",
    "short": "Salmões",
    "city": "Jurerê · Florianópolis · SC",
    "type": "property",
    "group": "sustentavel",
    "price": 4200000,
    "rents": [
      168000,
      504000,
      1050000,
      1890000,
      2940000,
      4200000
    ]
  },
  {
    "name": "Sabesp",
    "short": "Sabesp",
    "type": "utility",
    "price": 2500000,
    "rate": 50000,
    "icon": "≈"
  },
  {
    "name": "Avenida Atlântica",
    "short": "Atlântica",
    "city": "Balneário Camboriú · SC",
    "type": "property",
    "group": "sustentavel",
    "price": 4600000,
    "rents": [
      184000,
      552000,
      1150000,
      2070000,
      3220000,
      4600000
    ]
  },
  {
    "name": "Vá para a Auditoria",
    "short": "Vá auditar",
    "type": "gotojail",
    "icon": "⇥"
  },
  {
    "name": "Rua Haddock Lobo",
    "short": "H. Lobo",
    "city": "São Paulo · SP",
    "type": "property",
    "group": "inteligente",
    "price": 5000000,
    "rents": [
      200000,
      600000,
      1250000,
      2250000,
      3500000,
      5000000
    ]
  },
  {
    "name": "Rua Oscar Freire",
    "short": "Oscar Freire",
    "city": "São Paulo · SP",
    "type": "property",
    "group": "inteligente",
    "price": 5400000,
    "rents": [
      216000,
      648000,
      1350000,
      2430000,
      3780000,
      5400000
    ]
  },
  {
    "name": "Brasil em Jogo — Sorte ou Revés",
    "short": "Sorte / Revés",
    "type": "chance",
    "icon": "✦"
  },
  {
    "name": "Rua Colômbia",
    "short": "Colômbia",
    "city": "São Paulo · SP",
    "type": "property",
    "group": "inteligente",
    "price": 5800000,
    "rents": [
      232000,
      696000,
      1450000,
      2610000,
      4060000,
      5800000
    ]
  },
  {
    "name": "Azul Linhas Aéreas",
    "short": "Azul",
    "type": "rail",
    "price": 3200000,
    "rate": 100000,
    "icon": "✈"
  },
  {
    "name": "Brasil em Jogo — Sorte ou Revés",
    "short": "Sorte / Revés",
    "type": "chance",
    "icon": "✦"
  },
  {
    "name": "Avenida Vieira Souto",
    "short": "Vieira Souto",
    "city": "Ipanema · Rio de Janeiro · RJ",
    "type": "property",
    "group": "premium",
    "price": 6500000,
    "rents": [
      260000,
      780000,
      1625000,
      2925000,
      4550000,
      6500000
    ]
  },
  {
    "name": "Bônus de investimento",
    "short": "Bônus",
    "type": "bonus",
    "icon": "+",
    "amount": 1500000
  },
  {
    "name": "Avenida Delfim Moreira",
    "short": "D. Moreira",
    "city": "Leblon · Rio de Janeiro · RJ",
    "type": "property",
    "group": "premium",
    "price": 7500000,
    "rents": [
      300000,
      900000,
      1875000,
      3375000,
      5250000,
      7500000
    ]
  }
].map((t,id)=>({...t,id}));
const CARDS=[
  {
    "kind": "Sorte",
    "title": "Bom negócio",
    "text": "Sua negociação rendeu um prêmio. Receba R$ 1.500.000 do banco.",
    "cash": 1500000
  },
  {
    "kind": "Revés",
    "title": "Reforma inesperada",
    "text": "Uma manutenção emergencial custou R$ 800.000. Pague ao banco.",
    "cash": -800000
  },
  {
    "kind": "Sorte",
    "title": "Recomeço promissor",
    "text": "Avance para o Início e receba R$ 2.000.000.",
    "move": 0
  },
  {
    "kind": "Sorte",
    "title": "Incentivo à inovação",
    "text": "Seu projeto foi premiado. Receba R$ 2.000.000 do banco.",
    "cash": 2000000
  },
  {
    "kind": "Revés",
    "title": "Documentação pendente",
    "text": "Vá diretamente para a Auditoria, sem receber pelo Início.",
    "jail": true
  },
  {
    "kind": "Sorte",
    "title": "Autorização de liberação",
    "text": "Guarde esta carta para sair da Auditoria sem pagar a taxa. Ela volta ao baralho depois do uso.",
    "pass": true
  },
  {
    "kind": "Sorte",
    "title": "Consultoria contratada",
    "text": "Receba R$ 1.000.000 pelos serviços de sua equipe.",
    "cash": 1000000
  },
  {
    "kind": "Revés",
    "title": "Obras obrigatórias",
    "text": "A adequação de segurança custou R$ 1.200.000. Pague ao banco.",
    "cash": -1200000
  },
  {
    "kind": "Revés",
    "title": "Revisão dos imóveis",
    "text": "Pague R$ 100.000 por casa e R$ 400.000 por hotel. Terrenos sem construções não pagam.",
    "repairs": true
  },
  {
    "kind": "Sorte",
    "title": "Economia de energia",
    "text": "Receba R$ 1.400.000 por um projeto premiado.",
    "cash": 1400000
  },
  {
    "kind": "Revés",
    "title": "Despesas administrativas",
    "text": "Renove suas licenças: pague R$ 600.000.",
    "cash": -600000
  },
  {
    "kind": "Sorte",
    "title": "Negócios em Porto Alegre",
    "text": "Avance para a Rua Padre Chagas e resolva o terreno. Receba R$ 2.000.000 se passar pelo Início.",
    "move": 21
  },
  {
    "kind": "Sorte",
    "title": "Prêmio de arquitetura",
    "text": "Seu projeto se destacou. Receba R$ 1.000.000.",
    "cash": 1000000
  },
  {
    "kind": "Sorte",
    "title": "Logística nacional",
    "text": "Avance para os Correios e resolva a companhia. Receba R$ 2.000.000 se passar pelo Início.",
    "move": 25
  },
  {
    "kind": "Revés",
    "title": "Reparo emergencial",
    "text": "Pague R$ 1.500.000 por uma obra emergencial.",
    "cash": -1500000
  },
  {
    "kind": "Sorte",
    "title": "Dividendos",
    "text": "Seu investimento rendeu R$ 750.000. Receba do banco.",
    "cash": 750000
  },
  {
    "kind": "Revés",
    "title": "Nova infraestrutura",
    "text": "Pague R$ 1.000.000 pela adequação dos imóveis.",
    "cash": -1000000
  },
  {
    "kind": "Revés",
    "title": "Destinação de resíduos",
    "text": "Pague R$ 900.000 pela destinação dos resíduos de uma obra.",
    "cash": -900000
  }
];

function shuffled(values,rng=randomInt){
  const a=values.slice();for(let i=a.length-1;i>0;i--){const j=rng(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;
}
function draw(s,rng){
  if(!s.deck.length){s.deck=shuffled(s.discard,rng);s.discard=[];}
  const index=s.deck.shift();check(CARDS[index],'O baralho está indisponível.');
  if(!CARDS[index].pass)s.discard.push(index);
  return {...CARDS[index],cardId:index};
}
function returnPass(s,p){
  if(p.passes){s.discard.push(CARDS.findIndex(c=>c.pass));p.passes--;}
}

const clone=s=>JSON.parse(JSON.stringify(s));
function randomInt(n){const a=new Uint32Array(1);if(typeof globalThis.crypto!=='undefined'&&crypto.getRandomValues){const limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}return Math.floor(Math.random()*n);}
function id(){return Array.from({length:24},()=>randomInt(16).toString(16)).join('');}
function code(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>chars[randomInt(chars.length)]).join('');}
function check(condition,msg){if(!condition)throw new Error(msg);}
function name(v){const n=String(v||'').replace(/[\x00-\x1F\x7F]/g,'').trim().slice(0,18);check(n.length>0,'Digite seu nome.');return n;}
function log(s,text,kind='info',now=Date.now()){s.log.push({id:id(),text,kind,at:now});s.log=s.log.slice(-70);}
function player(s,pid){const p=s.players.find(p=>p.id===pid);check(p,'Jogador não encontrado.');return p;}
function current(s){return s.players[s.turnIndex]||null;}
function owned(s,pid){return TILES.filter(t=>s.properties[t.id]?.owner===pid);}
function groupTiles(group){return TILES.filter(t=>t.group===group);}
function fullGroup(s,pid,g){return g&&groupTiles(g).every(t=>s.properties[t.id].owner===pid);}
function legacyWealth(s,pid){const p=player(s,pid);return p.cash+owned(s,pid).reduce((v,t)=>{const d=s.properties[t.id];return v+t.price-(d.mortgaged?Math.floor(t.price/2):0)+(t.group?d.level*GROUPS[t.group].build:0);},0)-(s.debt?.playerId===pid?s.debt.amount:0);}
function rent(s,t,dice=7){
 const d=s.properties[t.id];if(!d?.owner||d.mortgaged)return 0;
 if(t.type==='property')return t.rents[d.level]*(d.level===0&&fullGroup(s,d.owner,t.group)?2:1);
 return dice*t.rate;
}
// Active bids and cash offered in an open trade cannot be spent on construction.
function legacySpendable(s,pid){
 const p=player(s,pid);let reserved=s.auction?.bidderId===pid?s.auction.bid:0;
 if(s.trade?.from===pid)reserved+=s.trade.giveCash;
 if(s.trade?.to===pid)reserved+=s.trade.takeCash;
 return Math.max(0,p.cash-reserved);
}
function legacyBuildReason(s,pid,tid){
 const p=s.players.find(x=>x.id===pid),t=TILES[tid],d=s.properties[tid];
 if(!p||p.bankrupt||p.removed||s.phase!=='playing')return 'Construção indisponível.';
 if(t?.type!=='property')return 'Companhias não recebem casas nem hotéis.';
 if(d?.owner!==pid)return 'Este terreno não é seu.';
 if(d.mortgaged)return 'Resgate a hipoteca deste terreno antes de construir.';
 if(d.level>=HOTEL_LEVEL)return 'O hotel já está construído.';
 if(s.debt?.playerId===pid)return 'Quite sua dívida antes de construir.';
 if(s.trade&&(s.trade.give.includes(tid)||s.trade.take.includes(tid)))return 'Cancele a troca deste terreno antes de construir.';
 if(spendable(s,pid)<GROUPS[t.group].build)return 'Saldo livre insuficiente. Lances e propostas em aberto reservam dinheiro.';
 return '';
}
function canBuild(s,pid,tid){return !buildReason(s,pid,tid);}

function makePlayer(pid,n,index,bot=false){return {id:pid,name:name(n),color:COLORS[index%6],token:TOKENS[index%6],cash:STARTING_CASH,pos:0,bankrupt:false,removed:false,bot,online:true,offlineSince:null,jail:0,jailRelease:false,passes:0,lastChat:0};}
function legacyCreateRoom(n,opts={}){const pid=opts.hostId||id();const s={version:30,code:opts.code||code(),hostId:pid,phase:'lobby',players:[makePlayer(pid,n,0)],properties:{},turnIndex:0,round:1,turnCount:0,roundLimit:[0,10,20,40].includes(Number(opts.roundLimit))?Number(opts.roundLimit):0,turnState:'roll',doubles:0,extraTurn:false,dice:[1,1],rollSerial:0,auction:null,debt:null,trade:null,lastCard:null,deck:shuffled(CARDS.map((_,i)=>i)),discard:[],log:[],chat:[],revision:1,createdAt:Date.now(),updatedAt:Date.now(),winnerIds:[]};TILES.filter(t=>t.price).forEach(t=>s.properties[t.id]={owner:null,level:0,mortgaged:false});log(s,`${s.players[0].name} criou a sala.`);return s;}
function touch(s,now=Date.now()){s.revision++;s.updatedAt=now;}
function move(s,p,steps){const next=p.pos+steps;if(next>=TILES.length){const cash=Math.floor(next/TILES.length)*PASS_START;p.cash+=cash;log(s,`${p.name} passou pelo Início e recebeu ${cashfmt(cash)}.`,'money');}p.pos=next%TILES.length;}
function toJail(s,p){p.pos=10;p.jail=3;p.jailRelease=false;s.extraTurn=false;s.doubles=0;s.turnState='end';log(s,`${p.name} foi à Auditoria.`,'alert');}
function legacyCharge(s,p,amount,creditorId=null,reason='Pagamento'){if(amount<=0)return;const available=Math.min(p.cash,amount);p.cash-=available;if(creditorId){const creditor=player(s,creditorId);if(!creditor.bankrupt)creditor.cash+=available;}log(s,`${p.name}: ${reason.toLocaleLowerCase()} de ${cashfmt(amount)}${creditorId?' para '+player(s,creditorId).name:''}.`,'money');if(available<amount){s.debt={playerId:p.id,creditorId,amount:amount-available,reason};s.turnState='debt';s.trade=null;log(s,`${p.name} precisa levantar ${cashfmt(amount-available)} ou declarar falência.`,'alert');}}
function land(s,p,rng,depth=0){check(depth<5,'Não foi possível resolver a casa.');const t=TILES[p.pos];s.turnState='end';log(s,`${p.name} chegou a ${t.name}.`);if(t.price){const d=s.properties[t.id];if(!d.owner){s.turnState='buy';return;}if(d.owner!==p.id&&!d.mortgaged){
 const sum=s.dice[0]+s.dice[1];const total=rent(s,t,sum);
 const reason=t.type==='property'?'Aluguel':`Companhia: ${cashfmt(t.rate)} × (${s.dice[0]} + ${s.dice[1]}) = ${cashfmt(total)}`;
 charge(s,p,total,d.owner,reason);
 }else log(s,d.owner===p.id?'Você já é dono deste imóvel.':'Imóvel hipotecado: aluguel suspenso.');}
else if(t.type==='tax')charge(s,p,t.amount,null,t.name);else if(t.type==='bonus'){p.cash+=t.amount;log(s,`${p.name} recebeu ${cashfmt(t.amount)}.`,'money');}
else if(t.type==='gotojail')toJail(s,p);else if(t.type==='chance'){const c=draw(s,rng);s.lastCard={...c,playerId:p.id,serial:s.rollSerial};log(s,`${c.title}: ${c.text}`,'card');if(c.cash>0)p.cash+=c.cash;else if(c.cash<0)charge(s,p,-c.cash,null,c.title);else if(c.jail)toJail(s,p);else if(c.pass)p.passes++;else if(c.repairs){const cost=owned(s,p.id).reduce((v,t)=>v+(s.properties[t.id].level===HOTEL_LEVEL?400000:s.properties[t.id].level*100000),0);charge(s,p,cost,null,c.title);}else if(c.move!==undefined){if(c.move===0){p.pos=0;p.cash+=PASS_START;log(s,`${p.name} recebeu R$ 2.000.000 no Início.`,'money');}else{move(s,p,(c.move-p.pos+TILES.length)%TILES.length);land(s,p,rng,depth+1);}}}}
function legacyFinish(s,reason){s.phase='finished';s.reason=reason;s.auction=null;s.trade=null;const alive=s.players.filter(p=>!p.bankrupt);const max=Math.max(...alive.map(p=>wealth(s,p.id)));s.winnerIds=alive.filter(p=>wealth(s,p.id)===max).map(p=>p.id);log(s,`Fim de jogo! ${s.winnerIds.map(pid=>player(s,pid).name).join(' e ')} venceu${s.winnerIds.length>1?' em empate':''}.`,'success');}
function legacyNext(s){s.trade=null;s.auction=null;if(s.players.filter(p=>!p.bankrupt).length<=1){finish(s,'Último jogador solvente');return;}const p=current(s);if(s.extraTurn&&!p.bankrupt&&!p.jail){s.extraTurn=false;s.turnState='roll';log(s,`${p.name} joga novamente: dados iguais!`);return;}s.extraTurn=false;s.doubles=0;s.turnCount++;let i=s.turnIndex;do{i=(i+1)%s.players.length;if(i===0)s.round++;}while(s.players[i].bankrupt);s.turnIndex=i;s.turnState='roll';s.lastCard=null;if(s.roundLimit>0&&s.round>s.roundLimit){finish(s,'Limite de rodadas alcançado');return;}log(s,`Vez de ${current(s).name}.`);}
function auctionEnd(s){const a=s.auction;if(a?.bidderId){const p=player(s,a.bidderId);if(!p.bankrupt&&p.cash>=a.bid){p.cash-=a.bid;s.properties[a.tileId].owner=p.id;log(s,`${p.name} arrematou ${TILES[a.tileId].name} por ${cashfmt(a.bid)}.`,'success');}}else log(s,'Leilão encerrado sem ofertas. O imóvel permanece com o banco.');s.auction=null;s.turnState='end';}
function tradeAssets(s,pid,ids){check(Array.isArray(ids)&&ids.length<=28,'Lista de imóveis inválida.');check(new Set(ids).size===ids.length,'Um imóvel foi repetido.');for(const tid of ids){check(Number.isInteger(tid)&&TILES[tid]?.price,'Imóvel inválido.');const t=TILES[tid],d=s.properties[tid];check(d.owner===pid,'O imóvel não pertence ao jogador.');check(!d.mortgaged&&!d.level,'Negocie apenas imóveis sem construção e sem hipoteca.');}}
function amount(v,max=1000000000000){check(Number.isSafeInteger(v)&&v>=0&&v<=max,'Digite um valor inteiro não negativo.');return v;}
function validateTrade(s,tr){const from=player(s,tr.from),to=player(s,tr.to);check(from.id!==to.id&&!from.bankrupt&&!to.bankrupt,'Participantes inválidos.');amount(tr.giveCash);amount(tr.takeCash);check(from.cash>=tr.giveCash&&to.cash>=tr.takeCash,'Saldo insuficiente para a troca.');tradeAssets(s,from.id,tr.give);tradeAssets(s,to.id,tr.take);check(tr.give.length+tr.take.length+tr.giveCash+tr.takeCash>0,'A proposta está vazia.');}
function legacyApply(state,pid,a,now=Date.now(),rng=randomInt){check(a&&typeof a.type==='string','Ação inválida.');const s=clone(state),p=player(s,pid);check(!p.removed,'Você foi retirado da sala pelo anfitrião.');check(a.type.length<40,'Ação inválida.');
if(a.type==='chat'||a.type==='sticker'){
 check(now-p.lastChat>=900,'Espere um instante antes de enviar novamente.');
 const sticker=a.type==='sticker'?STICKERS.find(x=>x.id===a.stickerId):null;
 if(a.type==='sticker')check(sticker,'Figurinha inválida.');
 const text=sticker?sticker.label:String(a.text||'').replace(/[\x00-\x1F]/g,' ').trim().slice(0,200);
 check(text,'Digite uma mensagem.');p.lastChat=now;
 s.chat.push({id:id(),playerId:p.id,name:p.name,text,stickerId:sticker?.id||null,at:now});
 s.chat=s.chat.slice(-60);touch(s,now);return s;
}

if(a.type==='addBot'){check(s.phase==='lobby'&&s.hostId===pid,'Somente o anfitrião pode adicionar IA antes de começar.');const candidates=['Alex • IA','Bia • IA','Caio • IA','Duda • IA','Eli • IA'];const nm=candidates.find(n=>!s.players.some(p=>p.name===n));return join(s,nm,id(),true);}
if(a.type==='remove'){
 check(s.phase==='lobby'||s.phase==='playing','A partida já foi encerrada.');
 check(s.hostId===pid&&a.playerId!==pid,'Somente o anfitrião pode retirar outros jogadores.');
 const target=player(s,a.playerId);check(!target.removed,'Este jogador já foi retirado.');
 if(s.phase==='lobby'){
  s.players=s.players.filter(x=>x.id!==target.id);
 }else{
  const wasActive=current(s).id===target.id;
  if(s.trade&&(s.trade.from===target.id||s.trade.to===target.id)){s.trade=null;log(s,'A proposta foi cancelada porque um participante foi retirado.');}
  if(s.auction){
   if(wasActive){s.auction=null;s.turnState='end';log(s,'Leilão cancelado: o jogador do turno foi retirado.');}
   else{const ar=s.auction;ar.passed=ar.passed.filter(x=>x!==target.id);
    if(ar.bidderId===target.id){ar.bid=0;ar.bidderId=null;ar.endsAt=Math.max(ar.endsAt,now+10000);log(s,'Lance do jogador retirado cancelado. O leilão reabriu.');}
   }
  }
  if(s.debt?.playerId===target.id)s.debt=null;
  else if(s.debt?.creditorId===target.id){s.debt.creditorId=null;log(s,'O saldo da dívida passa a ser devido ao banco.');}
  returnPass(s,target);
  owned(s,target.id).forEach(t=>s.properties[t.id]={owner:null,level:0,mortgaged:false});
  target.cash=0;target.bankrupt=true;target.removed=true;target.online=false;target.offlineSince=now;
  if(s.players.filter(x=>!x.bankrupt).length<=1)finish(s,'Último jogador ativo');
  else if(wasActive){s.extraTurn=false;next(s);}
  else if(s.auction&&s.players.filter(x=>!x.bankrupt&&x.id!==s.auction.bidderId&&!s.auction.passed.includes(x.id)).length===0)auctionEnd(s);
 }
 log(s,`${p.name} retirou ${target.name} da sala. Seus imóveis retornam ao banco.`,'alert');
 touch(s,now);return s;
}

if(a.type==='settings'){check(s.hostId===pid&&s.phase==='lobby','Só o anfitrião pode configurar a sala.');check([0,10,20,40].includes(a.roundLimit),'Configuração inválida.');s.roundLimit=a.roundLimit;touch(s,now);return s;}
if(a.type==='start'){check(s.hostId===pid&&s.phase==='lobby','Só o anfitrião inicia a partida.');check(s.players.length>=2,'É preciso ter ao menos 2 jogadores.');check(s.players.every(p=>p.online||p.bot),'Retire ou reconecte os jogadores ausentes.');s.phase='playing';log(s,`Partida iniciada! ${current(s).name} começa.`,'success');touch(s,now);return s;}
check(s.phase==='playing','A partida não está em andamento.');check(!p.bankrupt,'Você já saiu dos negócios.');const active=current(s).id===pid;
if(a.type==='bid'||a.type==='passAuction'){check(s.auction&&s.turnState==='auction','Não há leilão ativo.');const ar=s.auction;check(now<ar.endsAt,'O leilão terminou.');check(!ar.passed.includes(pid),'Você já desistiu deste leilão.');if(a.type==='bid'){const v=amount(a.amount);check(v>=ar.bid+BID_STEP&&v>=BID_MIN,'O lance deve ser de pelo menos R$ 200.000 e superar o atual em R$ 100.000.');check(p.cash>=v,'Saldo insuficiente para este lance.');check(ar.bidderId!==pid,'Você já tem o maior lance.');ar.bid=v;ar.bidderId=pid;ar.endsAt=Math.max(ar.endsAt,now+8000);log(s,`${p.name} ofereceu ${cashfmt(v)} no leilão.`);}else{check(ar.bidderId!==pid,'O maior lance não pode ser retirado.');ar.passed.push(pid);}if(s.players.filter(x=>!x.bankrupt&&x.id!==ar.bidderId&&!ar.passed.includes(x.id)).length===0)auctionEnd(s);touch(s,now);return s;}
if(a.type==='tradeReply'){check(s.trade,'Não há proposta pendente.');const tr=s.trade;check(pid===tr.to||pid===tr.from,'Esta proposta não é sua.');if(a.accept){check(pid===tr.to,'Somente o destinatário pode aceitar.');check(now<tr.expiresAt,'A proposta expirou.');validateTrade(s,tr);const from=player(s,tr.from),to=player(s,tr.to);from.cash+=tr.takeCash-tr.giveCash;to.cash+=tr.giveCash-tr.takeCash;tr.give.forEach(t=>s.properties[t].owner=to.id);tr.take.forEach(t=>s.properties[t].owner=from.id);log(s,`${from.name} e ${to.name} concluíram uma negociação.`,'success');}else log(s,'Proposta de negociação encerrada.');s.trade=null;touch(s,now);return s;}
if(a.type==='build'){
 const reason=buildReason(s,pid,a.tileId);check(!reason,reason);
 const t=TILES[a.tileId],d=s.properties[a.tileId];
 p.cash-=GROUPS[t.group].build;d.level++;
 log(s,`${p.name} comprou ${d.level===HOTEL_LEVEL?'o hotel':'a '+d.level+'ª casa'} em ${t.name} por ${cashfmt(GROUPS[t.group].build)}.`,'success');
 touch(s,now);return s;
}
check(active,'Aguarde a sua vez.');check(!s.auction,'Resolva o leilão primeiro.');check(!s.trade,'Conclua ou cancele a proposta de troca primeiro.');
if(a.type==='bankrupt'){check(s.turnState==='debt','A falência só é declarada quando há uma dívida pendente.');bankrupt(s,p);}
else if(['sell','mortgage','unmortgage'].includes(a.type)){
 check(['roll','end','debt'].includes(s.turnState),'Resolva a casa atual antes de gerenciar imóveis.');
 const t=TILES[a.tileId],d=s.properties[a.tileId];check(t?.price&&d?.owner===pid,'Este imóvel não é seu.');
 if(a.type==='sell'){
  check(t.type==='property'&&d.level>0,'Não há construção para vender.');d.level--;
  const value=Math.floor(GROUPS[t.group].build/2);p.cash+=value;
  log(s,`${p.name} vendeu uma etapa de construção por ${cashfmt(value)}.`,'money');settle(s,p,rng);
 }else if(a.type==='mortgage'){
  check(!d.mortgaged,'O imóvel já está hipotecado.');check(d.level===0,'Venda as construções deste terreno antes de hipotecá-lo.');
  d.mortgaged=true;const value=Math.floor(t.price/2);p.cash+=value;
  log(s,`${p.name} hipotecou ${t.name} por ${cashfmt(value)}.`,'money');settle(s,p,rng);
 }else{
  check(s.turnState!=='debt','Quite a dívida antes de resgatar hipotecas.');check(d.mortgaged,'Este imóvel não está hipotecado.');
  const cost=Math.ceil(Math.floor(t.price/2)*1.2);check(p.cash>=cost,'Saldo insuficiente.');
  p.cash-=cost;d.mortgaged=false;log(s,`${p.name} resgatou ${t.name} por ${cashfmt(cost)}.`,'money');
 }
}

else if(a.type==='roll'){check(s.turnState==='roll','Você já lançou os dados neste turno.');s.lastCard=null;s.dice=[rng(6)+1,rng(6)+1];check(s.dice.every(x=>x>=1&&x<=6),'Dados inválidos.');s.rollSerial++;const double=s.dice[0]===s.dice[1];log(s,`${p.name} tirou ${s.dice[0]} + ${s.dice[1]}.`,'dice');if(p.jail||p.jailRelease){
 s.extraTurn=false;s.doubles=0;s.turnState='end';
 if(p.jailRelease){
   charge(s,p,JAIL_FEE,null,'Taxa de liberação da Auditoria');
   if(s.debt)s.debt.after={kind:'jailMove',steps:s.dice[0]+s.dice[1]};
   else{p.jailRelease=false;move(s,p,s.dice[0]+s.dice[1]);land(s,p,rng);}
 }else if(double){
   p.jail=0;log(s,`${p.name} saiu da Auditoria com dados iguais.`);
   move(s,p,s.dice[0]+s.dice[1]);land(s,p,rng);
 }else{
   p.jail--;if(p.jail===0){p.jailRelease=true;log(s,`${p.name} esgotou três tentativas. Na próxima jogada deverá pagar ${cashfmt(JAIL_FEE)} e avançar.`);}
   else log(s,`${p.name} permanece na Auditoria (${p.jail} tentativa${p.jail>1?'s':''}).`);
 }
}else{s.doubles=double?s.doubles+1:0;s.extraTurn=double;if(s.doubles>=3)toJail(s,p);else{move(s,p,s.dice[0]+s.dice[1]);land(s,p,rng);}}}
else if(a.type==='bail'){
 check(s.turnState==='roll'&&(p.jail>0||p.jailRelease),'Você não está retido na Auditoria.');
 check(a.usePass&&p.passes>0,'Use sua autorização ou tente tirar dados iguais. A taxa é cobrada na quarta jogada.');
 returnPass(s,p);p.jail=0;p.jailRelease=false;log(s,`${p.name} usou a Autorização de funcionamento e saiu da Auditoria.`);
}

else if(a.type==='buy'){check(s.turnState==='buy','Não há imóvel disponível para comprar neste turno.');const t=TILES[p.pos];check(t.price&&!s.properties[t.id].owner,'Imóvel indisponível.');check(p.cash>=t.price,'Saldo insuficiente. Envie o imóvel a leilão.');p.cash-=t.price;s.properties[t.id].owner=pid;s.turnState='end';log(s,`${p.name} comprou ${t.name} por ${cashfmt(t.price)}.`,'success');}
else if(a.type==='auction'){check(s.turnState==='buy','Nenhum imóvel para leiloar.');s.auction={tileId:p.pos,bid:0,bidderId:null,passed:[],endsAt:now+25000};s.turnState='auction';log(s,`${TILES[p.pos].name} está em leilão. Todos podem participar.`,'alert');}
else if(a.type==='end'){check(s.turnState==='end','Resolva as ações pendentes antes de encerrar.');next(s);}
else if(a.type==='trade'){check(['roll','end'].includes(s.turnState),'Resolva a casa antes de negociar.');const tr={from:pid,to:a.to,give:a.give,take:a.take,giveCash:a.giveCash,takeCash:a.takeCash,expiresAt:now+60000};validateTrade(s,tr);s.trade=tr;log(s,`${p.name} enviou uma proposta a ${player(s,tr.to).name}.`);}
else throw new Error('Ação desconhecida.');
for(const x of s.players)check(Number.isSafeInteger(x.cash)&&x.cash>=0,'Estado financeiro inválido.');touch(s,now);return s;}
function legacyTick(state,now=Date.now()){if(state.phase!=='playing')return state;if(state.auction&&now>=state.auction.endsAt){const s=clone(state);auctionEnd(s);touch(s,now);return s;}if(state.trade&&now>=state.trade.expiresAt){const s=clone(state);s.trade=null;log(s,'A proposta expirou.');touch(s,now);return s;}return state;}
function legacyBotAction(s){if(s.phase!=='playing')return null;if(s.trade){const tr=s.trade,p=player(s,tr.to);if(!p.bot)return null;const value=(ids,cash)=>cash+ids.reduce((n,i)=>n+TILES[i].price,0);return {pid:p.id,action:{type:'tradeReply',accept:value(tr.give,tr.giveCash)>=value(tr.take,tr.takeCash)*.95}};}
if(s.auction){const ar=s.auction;const p=s.players.find(p=>p.bot&&!p.bankrupt&&!ar.passed.includes(p.id)&&ar.bidderId!==p.id);if(!p)return null;const nextBid=Math.max(BID_MIN,ar.bid+BID_STEP);return {pid:p.id,action:nextBid<=Math.min(p.cash-1800000,TILES[ar.tileId].price*.85)?{type:'bid',amount:nextBid}:{type:'passAuction'}};}
const p=current(s);if(!p?.bot||p.bankrupt)return null;let action;
if(s.turnState==='debt'){const props=owned(s,p.id);const developed=props.find(t=>s.properties[t.id].level>0);if(developed)action={type:'sell',tileId:developed.id};else{const t=props.find(t=>!s.properties[t.id].mortgaged);action=t?{type:'mortgage',tileId:t.id}:{type:'bankrupt'};}}
else if(s.turnState==='buy')action={type:p.cash>=TILES[p.pos].price+1800000?'buy':'auction'};
else if(s.turnState==='roll')action=(p.jail||p.jailRelease)&&p.passes?{type:'bail',usePass:true}:{type:'roll'};
else if(s.turnState==='end'){const t=owned(s,p.id).find(t=>t.type==='property'&&!s.properties[t.id].mortgaged&&s.properties[t.id].level<HOTEL_LEVEL&&p.cash>GROUPS[t.group].build+4200000);action=t?{type:'build',tileId:t.id}:{type:'end'};}
return action?{pid:p.id,action}:null;}
/* 3.1 — persistence-safe finance rules. Amounts are integer, fictitious reais. */
const BANK_LOAN = Object.freeze({min:100000,max:5000000,rate:10,term:3,maxContracts:3});
function normalizedName(v){return String(v||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');}
function upgrade(state){
 const s=clone(state);check(s&&Array.isArray(s.players)&&s.properties,'Salvamento inválido.');
 s.version=31;s.loans??=[];s.loanOffer??=null;s.assetOffer??=null;s.pausedAt??=null;
 if(s.debt&&!s.debt.id)s.debt.id=id();return s;
}
function createRoom(n,opts={}){const s=legacyCreateRoom(n,opts);s.version=31;s.loans=[];s.loanOffer=null;s.assetOffer=null;s.pausedAt=null;return s;}
function finish(s,reason){legacyFinish(s,reason);s.loanOffer=null;s.assetOffer=null;s.pausedAt=null;}
function waitingPlayers(s){return s.players.filter(p=>!p.bot&&!p.bankrupt&&!p.removed&&!p.online);}
function refreshPause(s,now=Date.now()){
 const offline=waitingPlayers(s);const paused=offline.length>0&&s.phase!=='finished';
 if(paused&&s.pausedAt==null){s.pausedAt=now;log(s,'Conexão interrompida: a partida aguarda o retorno. Patrimônios preservados.','alert',now);}
 if(!paused&&s.pausedAt!=null){const delta=Math.max(0,now-s.pausedAt);for(const [o,key] of [[s.auction,'endsAt'],[s.trade,'expiresAt'],[s.loanOffer,'expiresAt'],[s.assetOffer,'expiresAt']])if(o&&o[key])o[key]+=delta;s.pausedAt=null;log(s,'Todos reconectados. A partida foi retomada sem perder bens ou dinheiro.','success',now);}
}
function setOnline(state,pid,status,now=Date.now()){
 const p=player(state,pid);if(p.online===status)return state;
 const s=clone(state),q=player(s,pid);q.online=!!status;q.offlineSince=status?null:now;
 refreshPause(s,now);touch(s,now);return s;
}
function join(state,n,pid=id(),bot=false){
 const s=upgrade(state),nm=name(n).replace(/\s+/g,' '),existing=s.players.find(p=>normalizedName(p.name)===normalizedName(nm));
 if(existing){
  check(!existing.removed,'Este nome foi retirado pelo anfitrião. Não pode retornar a esta partida.');
  check(!existing.bot,'Esse nome pertence ao computador.');
  check(!existing.online,'Esse nome já está conectado. Aguarde a conexão anterior cair ou use a mesma sessão.');
  existing.online=true;existing.offlineSince=null;
  log(s,`${existing.name} voltou com o mesmo patrimônio, posição e contratos.`,'success');
 }else{
  check(s.phase==='lobby'||s.phase==='playing','A partida já terminou.');
  check(s.players.filter(p=>!p.removed).length<6,'As seis vagas estão ocupadas. Jogadores desconectados mantêm a vaga.');
  const used=new Set(s.players.filter(p=>!p.removed).map(p=>p.color));
  const index=Math.max(0,COLORS.findIndex(c=>!used.has(c)));
  const p=makePlayer(pid,nm,index,bot);p.joinedRound=s.round;s.players.push(p);
  log(s,`${nm} entrou${s.phase==='playing'?' durante a partida':''} com ${cashfmt(STARTING_CASH)}.`,'success');
 }
 refreshPause(s);touch(s);return s;
}
function activeLoans(s){return (s.loans||[]).filter(l=>['active','overdue'].includes(l.status)&&l.balance>0);}
function loansOf(s,pid){return activeLoans(s).filter(l=>l.borrowerId===pid);}
function lien(s,tid){return activeLoans(s).find(l=>l.collateralId===tid&&s.properties[tid]?.owner===l.borrowerId);}
function assetValue(s,tid){const t=TILES[tid],d=s.properties[tid];if(!t?.price||!d)return 0;return t.price+(t.group?d.level*GROUPS[t.group].build:0)-(d.mortgaged?Math.floor(t.price/2):0);}
function wealth(s,pid){return legacyWealth(s,pid)+((s.debt?.playerId===pid&&s.debt.loanId)?s.debt.amount:0)-loansOf(s,pid).reduce((v,l)=>v+l.balance,0)+activeLoans(s).filter(l=>l.lenderId===pid).reduce((v,l)=>v+l.balance,0);}
function spendable(s,pid){
 let free=legacySpendable(s,pid);
 if(s.loanOffer?.lenderId===pid)free-=s.loanOffer.principal;
 if(s.assetOffer?.creditorId===pid)free-=s.assetOffer.change;
 return Math.max(0,free);
}
function buildReason(s,pid,tid){
 if(s.pausedAt!=null)return 'Aguarde a reconexão dos participantes.';
 if(s.assetOffer?.tileId===tid)return 'Este imóvel está em uma proposta de pagamento. Cancele-a antes de construir.';
 return legacyBuildReason(s,pid,tid);
}
function loanTotal(principal,rate){return Math.ceil(principal*(100+rate)/100);}
function financeReady(s,pid){
 const p=player(s,pid);check(s.phase==='playing'&&!p.bankrupt&&!p.removed,'Operação indisponível.');
 check(s.pausedAt==null,'A partida está pausada para reconexão.');
 check(!s.auction&&!s.trade,'Conclua o leilão ou a troca antes de movimentar empréstimos.');return p;
}
function validateCredit(s,tr,ignoreOffer=false){
 const b=financeReady(s,tr.borrowerId);check(!loansOf(s,b.id).some(l=>l.status==='overdue'),'Resolva o empréstimo vencido antes de contratar outro.');
 check(loansOf(s,b.id).length<BANK_LOAN.maxContracts,'Limite de três empréstimos em aberto por jogador.');
 amount(tr.principal,50000000);check(tr.principal>=BANK_LOAN.min,'O empréstimo mínimo é R$ 100.000.');
 check(Number.isInteger(tr.rate)&&tr.rate>=0&&tr.rate<=50,'Os juros devem estar entre 0% e 50%, para todo o contrato.');
 check(Number.isInteger(tr.term)&&tr.term>=1&&tr.term<=10,'Escolha um prazo de 1 a 10 rodadas.');
 if(tr.lenderId){
  const l=financeReady(s,tr.lenderId);check(l.id!==b.id,'Não é possível emprestar para si mesmo.');
  check(!s.debt||s.debt.playerId!==l.id,'Quem tem uma dívida pendente não pode emprestar.');
  const available=spendable(s,l.id)+(ignoreOffer&&s.loanOffer?.lenderId===l.id?s.loanOffer.principal:0);
  check(available>=tr.principal,'O credor não tem saldo livre suficiente.');
 }else{
  check(tr.principal<=BANK_LOAN.max&&tr.rate===BANK_LOAN.rate&&tr.term===BANK_LOAN.term,'Condições inválidas para o crédito do banco.');
  check(!loansOf(s,b.id).some(l=>!l.lenderId),'É permitido apenas um empréstimo do banco por vez.');
 }
 if(tr.collateralId!=null){const t=TILES[tr.collateralId],d=s.properties[tr.collateralId];
  check(t?.price&&d?.owner===b.id&&!d.mortgaged,'A garantia precisa ser um imóvel próprio, sem hipoteca.');
  check(!lien(s,tr.collateralId),'Esse imóvel já garante outro contrato.');
  check(s.assetOffer?.tileId!==tr.collateralId,'Esse imóvel está em uma proposta de pagamento.');
 }
}
function createLoan(s,tr,now){
 validateCredit(s,tr,true);const b=player(s,tr.borrowerId);
 if(tr.lenderId)player(s,tr.lenderId).cash-=tr.principal;
 b.cash+=tr.principal;
 const total=loanTotal(tr.principal,tr.rate);
 const l={id:id(),borrowerId:b.id,lenderId:tr.lenderId||null,principal:tr.principal,rate:tr.rate,term:tr.term,total,balance:total,createdAt:now,createdRound:s.round,dueRound:s.round+tr.term,collateralId:tr.collateralId??null,status:'active',paid:0};
 s.loans.push(l);s.loanOffer=null;
 log(s,`${b.name} recebeu ${cashfmt(l.principal)} de ${l.lenderId?player(s,l.lenderId).name:'Banco Metrópole'}. Total: ${cashfmt(total)}; vencimento na sua vez da rodada ${l.dueRound}.`,'money',now);
 if(s.debt?.playerId===b.id)settle(s,b);
 return l;
}
function credit(s,pid,value){if(pid){const p=player(s,pid);if(!p.bankrupt&&!p.removed)p.cash+=value;}}
function closePaidLoan(s,l,now=Date.now()){
 if(l.balance>0)return;l.balance=0;l.status='paid';l.closedAt=now;l.collateralId=null;
 log(s,`Empréstimo de ${player(s,l.borrowerId).name} quitado. A garantia está liberada.`,'success',now);
}
function completeDebt(s,rng=randomInt){
 const d=s.debt;if(!d||d.amount>0)return;
 const p=player(s,d.playerId),after=d.after,l=d.loanId?(s.loans||[]).find(x=>x.id===d.loanId):null;
 if(l)closePaidLoan(s,l);s.debt=null;s.assetOffer=null;s.turnState='end';
 log(s,`${p.name} quitou a dívida.`,'success');
 if(after?.kind==='jailMove'){p.jailRelease=false;move(s,p,after.steps);land(s,p,rng);}
 else if(after?.kind==='loanDue'){s.turnState='roll';collectDue(s);}
}
function settle(s,p,rng=randomInt){
 const d=s.debt;if(d?.playerId!==p.id)return;
 const paid=Math.min(d.amount,p.cash);p.cash-=paid;d.amount-=paid;credit(s,d.creditorId,paid);
 if(d.loanId){const l=s.loans.find(x=>x.id===d.loanId);l.balance=d.amount;l.paid+=paid;}
 completeDebt(s,rng);
}
function charge(s,p,v,creditorId=null,reason='Pagamento'){
 legacyCharge(s,p,v,creditorId,reason);if(s.debt&&!s.debt.id)s.debt.id=id();
}
function transferableForDebt(s,tid){
 const d=s.debt;if(!d)return false;const t=TILES[tid],p=s.properties[tid],locked=lien(s,tid);
 return !!(t?.price&&p?.owner===d.playerId&&(!locked||locked.id===d.loanId));
}
function debtAssetQuote(s,tid){
 check(transferableForDebt(s,tid),'O imóvel não pode pagar esta dívida: confira proprietário e garantias.');
 const value=assetValue(s,tid),deduction=Math.min(value,s.debt.amount),change=Math.max(0,value-s.debt.amount);
 return {tileId:tid,value,deduction,change,debtId:s.debt.id,borrowerId:s.debt.playerId,creditorId:s.debt.creditorId};
}
function transferDebtAsset(s,tid,toBank=false,now=Date.now()){
 const d=s.debt,q=debtAssetQuote(s,tid),b=player(s,q.borrowerId),t=TILES[tid];
 const creditor=q.creditorId?player(s,q.creditorId):null;
 if(creditor&&!toBank){
  const available=spendable(s,creditor.id)+(s.assetOffer?.creditorId===creditor.id?s.assetOffer.change:0);
  check(available>=q.change,'O credor precisa pagar o troco. Use a liquidação no banco ou escolha outro imóvel.');
  creditor.cash-=q.change;b.cash+=q.change;s.properties[tid].owner=creditor.id;
 }else{
  s.properties[tid]={owner:null,level:0,mortgaged:false};b.cash+=q.change;credit(s,q.creditorId,q.deduction);
 }
 d.amount-=q.deduction;
 if(d.loanId){const l=s.loans.find(x=>x.id===d.loanId);l.balance=d.amount;l.paid+=q.deduction;if(l.collateralId===tid)l.collateralId=null;}
 s.assetOffer=null;
 log(s,`${t.name} ${creditor&&!toBank?'transferido para '+creditor.name:'liquidado no banco'}. Dívida abatida: ${cashfmt(q.deduction)}; troco para ${b.name}: ${cashfmt(q.change)}.`,'money',now);
 completeDebt(s);checkEmptyDefault(s);
}
function checkEmptyDefault(s){
 if(s.phase!=='playing'||!s.debt?.loanId)return;
 const p=player(s,s.debt.playerId);
 if(p.cash===0&&owned(s,p.id).length===0){log(s,`${p.name} não tem dinheiro nem imóveis para pagar o empréstimo vencido. Falência declarada.`,'alert');bankrupt(s,p);}
}
function bankCollect(s){
 for(let count=0;count<40&&s.phase==='playing'&&s.debt?.loanId&&!s.debt.creditorId;count++){
  const d=s.debt,l=s.loans.find(x=>x.id===d.loanId);
  const assets=owned(s,d.playerId).filter(t=>transferableForDebt(s,t.id));
  if(!assets.length){bankrupt(s,player(s,d.playerId));break;}
  let target=assets.find(t=>t.id===l.collateralId);
  if(!target){const enough=assets.filter(t=>assetValue(s,t.id)>=d.amount).sort((a,b)=>assetValue(s,a.id)-assetValue(s,b.id));target=enough[0]||assets.sort((a,b)=>assetValue(s,b.id)-assetValue(s,a.id))[0];}
  transferDebtAsset(s,target.id,true);
 }
}
function collectDue(s){
 if(s.phase!=='playing'||s.debt||s.pausedAt!=null||s.turnState!=='roll')return;
 const p=current(s);if(!p||p.bankrupt)return;
 const due=loansOf(s,p.id).filter(l=>l.dueRound<=s.round).sort((a,b)=>a.dueRound-b.dueRound||a.createdAt-b.createdAt);
 for(const l of due){
  const paid=Math.min(p.cash,l.balance);p.cash-=paid;l.balance-=paid;l.paid+=paid;credit(s,l.lenderId,paid);
  if(!l.balance){closePaidLoan(s,l);continue;}
  l.status='overdue';
  s.debt={id:id(),playerId:p.id,creditorId:l.lenderId,amount:l.balance,loanId:l.id,reason:`Empréstimo vencido (rodada ${l.dueRound})`,after:{kind:'loanDue'}};s.turnState='debt';s.loanOffer=null;s.trade=null;
  log(s,`${p.name}: venceu o empréstimo. Faltam ${cashfmt(l.balance)}. O credor pode executar imóveis; nada é confiscado antes do vencimento.`,'alert');
  if(!l.lenderId)bankCollect(s);else checkEmptyDefault(s);return;
 }
}
function next(s){legacyNext(s);if(s.phase==='playing')collectDue(s);}
function retireFinance(s,p){
 /* Liquidation preserves secured priority. There is no negative cash or double claim. */
 let funds=p.cash;p.cash=0;
 const claims=loansOf(s,p.id).slice().sort((a,b)=>a.createdAt-b.createdAt);
 for(const l of claims){
  const tid=l.collateralId;if(tid==null||s.properties[tid]?.owner!==p.id)continue;
  const v=assetValue(s,tid),paid=Math.min(l.balance,v);l.balance-=paid;l.paid+=paid;credit(s,l.lenderId,paid);funds+=v-paid;
  s.properties[tid]={owner:null,level:0,mortgaged:false};l.collateralId=null;
 }
 for(const t of owned(s,p.id)){funds+=assetValue(s,t.id);s.properties[t.id]={owner:null,level:0,mortgaged:false};}
 if(s.debt?.playerId===p.id){const d=s.debt,l=d.loanId?claims.find(l=>l.id===d.loanId):null;
  const need=l?l.balance:d.amount,paid=Math.min(need,funds);funds-=paid;credit(s,d.creditorId,paid);
  if(l){l.balance-=paid;l.paid+=paid;}s.debt=null;
 }
 for(const l of claims){const paid=Math.min(funds,l.balance);funds-=paid;l.balance-=paid;l.paid+=paid;credit(s,l.lenderId,paid);
  l.unpaid=l.balance;l.status=l.balance?'defaulted':'paid';l.balance=0;l.collateralId=null;l.closedAt=Date.now();
 }
 for(const l of activeLoans(s).filter(l=>l.lenderId===p.id))l.lenderId=null;
 if(s.debt?.creditorId===p.id)s.debt.creditorId=null;
 if(s.loanOffer&&(s.loanOffer.borrowerId===p.id||s.loanOffer.lenderId===p.id))s.loanOffer=null;
 if(s.assetOffer&&(s.assetOffer.borrowerId===p.id||s.assetOffer.creditorId===p.id))s.assetOffer=null;
}
function bankrupt(s,p){
 retireFinance(s,p);returnPass(s,p);p.cash=0;p.bankrupt=true;s.trade=null;
 log(s,`${p.name} declarou falência. Bens liquidados; garantias e dívidas quitadas até o limite disponível.`,'alert');
 refreshPause(s);
 if(s.players.filter(x=>!x.bankrupt&&!x.removed).length<=1)finish(s,'Último jogador solvente');
 else if(current(s).id===p.id){s.extraTurn=false;next(s);}
 else if(s.debt?.loanId&&!s.debt.creditorId)bankCollect(s);
}
function apply(state,pid,a,now=Date.now(),rng=randomInt){
 check(a&&typeof a.type==='string','Ação inválida.');
 let s=upgrade(state),p=player(s,pid);check(!p.removed,'Você foi retirado pelo anfitrião.');
 if(s.pausedAt!=null&&!['chat','sticker','remove'].includes(a.type))throw new Error('Aguardando reconexão. Nenhum patrimônio será perdido por falta de internet.');
 if(a.type==='remove'){
  check(s.hostId===pid&&a.playerId!==pid,'Somente o anfitrião pode retirar outro jogador.');
  const target=player(s,a.playerId);if(s.phase==='playing'&&!target.bankrupt)retireFinance(s,target);
  s=legacyApply(s,pid,a,now,rng);refreshPause(s,now);touch(s,now);return s;
 }
 if(['sell','mortgage','unmortgage'].includes(a.type)){
  check(!lien(s,a.tileId),'Imóvel em garantia: quite o empréstimo antes de vender construções ou hipotecar.');
  check(s.assetOffer?.tileId!==a.tileId,'Cancele a proposta de pagamento deste imóvel primeiro.');
 }
 if(a.type==='trade')for(const tid of [...(a.give||[]),...(a.take||[])])check(!lien(s,tid)&&s.assetOffer?.tileId!==tid,'O imóvel está comprometido em uma garantia ou pagamento.');
 if(a.type==='tradeReply'&&a.accept&&s.trade)for(const tid of [...s.trade.give,...s.trade.take])check(!lien(s,tid),'Um imóvel da troca está em garantia.');
 if(a.type==='bankLoan'){
  check(!s.loanOffer&&!s.assetOffer,'Conclua as propostas pendentes.');
  createLoan(s,{borrowerId:pid,lenderId:null,principal:a.amount,rate:BANK_LOAN.rate,term:BANK_LOAN.term,collateralId:a.collateralId??null},now);
 }else if(a.type==='loanOffer'){
  financeReady(s,pid);check(!s.loanOffer&&!s.assetOffer,'Já existe uma proposta financeira pendente.');
  const tr={from:pid,borrowerId:a.borrowerId,lenderId:a.lenderId,principal:a.amount,rate:a.rate,term:a.term,collateralId:a.collateralId??null,expiresAt:now+120000};
  check(tr.lenderId&&[tr.borrowerId,tr.lenderId].includes(pid),'Escolha as duas partes do empréstimo.');
  const other=player(s,tr.borrowerId===pid?tr.lenderId:tr.borrowerId);check(other.online||other.bot,'A outra pessoa precisa estar conectada para aceitar.');
  validateCredit(s,tr);s.loanOffer={...tr,id:id()};log(s,`${p.name} propôs um empréstimo a ${other.name}. Aguardando aceite.`,'money',now);
 }else if(a.type==='loanReply'){
  financeReady(s,pid);const tr=s.loanOffer;check(tr&&[tr.lenderId,tr.borrowerId].includes(pid),'Nenhuma proposta para você.');
  if(a.accept){check(pid!==tr.from,'Quem propôs não pode aceitar pela outra pessoa.');check(now<tr.expiresAt,'A proposta expirou.');createLoan(s,tr,now);}else{s.loanOffer=null;log(s,'Proposta de empréstimo cancelada ou recusada.');}
 }else if(a.type==='loanPay'){
  financeReady(s,pid);const l=s.loans.find(l=>l.id===a.loanId);check(l&&l.borrowerId===pid&&['active','overdue'].includes(l.status),'Empréstimo inválido.');
  const paid=amount(a.amount);check(paid>0&&paid<=l.balance&&paid<=spendable(s,pid),'Pagamento maior que a dívida ou o saldo livre.');
  check(!s.debt||s.debt.playerId!==pid||s.debt.loanId===l.id,'Resolva primeiro a dívida que bloqueia sua vez.');
  p.cash-=paid;l.balance-=paid;l.paid+=paid;credit(s,l.lenderId,paid);
  if(s.debt?.loanId===l.id){s.debt.amount=l.balance;completeDebt(s,rng);}else closePaidLoan(s,l,now);
  log(s,`${p.name} pagou ${cashfmt(paid)} de um empréstimo.`,'money',now);
 }else if(a.type==='offerAsset'){
  financeReady(s,pid);check(s.debt?.playerId===pid,'Você não possui uma dívida pendente nesta jogada.');
  check(!s.loanOffer&&!s.assetOffer,'Conclua a proposta financeira pendente.');
  const q=debtAssetQuote(s,a.tileId);
  if(!q.creditorId)transferDebtAsset(s,a.tileId,true,now);
  else{s.assetOffer={...q,id:id(),expiresAt:now+120000};log(s,`${p.name} ofereceu ${TILES[a.tileId].name} para abater ${cashfmt(q.deduction)} da dívida.`,'money',now);}
 }else if(a.type==='assetReply'){
  financeReady(s,pid);const o=s.assetOffer;check(o&&[o.creditorId,o.borrowerId].includes(pid),'A proposta não pertence a você.');
  if(a.accept){check(pid===o.creditorId,'Somente o credor pode aceitar.');check(now<o.expiresAt&&s.debt?.id===o.debtId,'A proposta expirou ou a dívida mudou.');
   const q=debtAssetQuote(s,o.tileId);check(q.value===o.value&&q.change===o.change,'Os valores mudaram. Peça outra proposta.');transferDebtAsset(s,o.tileId,false,now);
  }else{s.assetOffer=null;log(s,'Proposta de pagamento em imóvel encerrada.');}
 }else if(a.type==='foreclose'||a.type==='liquidateDebt'){
  financeReady(s,pid);check(s.debt,'Nenhuma dívida pendente.');
  if(a.type==='foreclose'){
   check(s.debt.loanId&&s.debt.creditorId===pid,'Somente o credor do empréstimo vencido pode executar o imóvel.');
   const l=s.loans.find(l=>l.id===s.debt.loanId);check(l.status==='overdue'&&s.round>=l.dueRound,'Ainda não venceu.');
   if(l.collateralId!=null&&s.properties[l.collateralId]?.owner===l.borrowerId)check(a.tileId===l.collateralId,'Execute primeiro o imóvel dado em garantia.');
  }else{
   check(pid===s.debt.playerId||(s.debt.loanId&&pid===s.debt.creditorId),'Apenas devedor ou credor do empréstimo vencido.');
  }
  transferDebtAsset(s,a.tileId,a.type==='liquidateDebt'||!!a.toBank,now);
 }else{
  s=legacyApply(s,pid,a,now,rng);
 }
 if(s.phase==='playing'&&s.turnState==='roll'&&!s.debt)collectDue(s);
 if(s.assetOffer&&s.assetOffer.debtId!==s.debt?.id)s.assetOffer=null;
 for(const x of s.players)check(Number.isSafeInteger(x.cash)&&x.cash>=0,'Saldo inválido. A ação foi cancelada.');
 for(const l of s.loans)check(Number.isSafeInteger(l.balance)&&l.balance>=0,'Contrato inválido.');
 touch(s,now);return s;
}
function tick(state,now=Date.now()){
 if(state.pausedAt!=null)return state;
 let s=legacyTick(state,now);if(s.phase!=='playing')return s;
 if((s.loanOffer&&now>=s.loanOffer.expiresAt)||(s.assetOffer&&now>=s.assetOffer.expiresAt)){
  s=clone(s);if(s.loanOffer&&now>=s.loanOffer.expiresAt){s.loanOffer=null;log(s,'A proposta de empréstimo expirou.');}
  if(s.assetOffer&&now>=s.assetOffer.expiresAt){s.assetOffer=null;log(s,'A proposta de imóvel expirou; a dívida continua pendente.');}touch(s,now);
 }
 return s;
}
function botAction(s){
 if(s.phase!=='playing'||s.pausedAt!=null)return null;
 if(s.loanOffer){const o=s.loanOffer,other=o.borrowerId===o.from?o.lenderId:o.borrowerId,p=player(s,other);
  if(p.bot){const isLender=p.id===o.lenderId;return {pid:p.id,action:{type:'loanReply',accept:isLender?spendable(s,p.id)+o.principal>o.principal+4000000&&o.collateralId!=null:o.rate<=15}};}
 }
 if(s.assetOffer&&player(s,s.assetOffer.creditorId).bot){const o=s.assetOffer;return {pid:o.creditorId,action:{type:'assetReply',accept:player(s,o.creditorId).cash>=o.change}};}
 if(s.debt?.loanId&&s.debt.creditorId&&player(s,s.debt.creditorId).bot){
  const d=s.debt,l=s.loans.find(l=>l.id===d.loanId),assets=owned(s,d.playerId).filter(t=>transferableForDebt(s,t.id));
  const t=assets.find(t=>t.id===l.collateralId)||assets.sort((a,b)=>assetValue(s,a.id)-assetValue(s,b.id))[0];
  if(t)return {pid:d.creditorId,action:{type:'foreclose',tileId:t.id,toBank:spendable(s,d.creditorId)<debtAssetQuote(s,t.id).change}};
 }
 const p=current(s);if(p?.bot&&s.turnState==='debt'){
  const assets=owned(s,p.id).filter(t=>transferableForDebt(s,t.id));
  const t=assets.sort((a,b)=>assetValue(s,a.id)-assetValue(s,b.id))[0];
  if(t)return {pid:p.id,action:{type:'liquidateDebt',tileId:t.id}};
  return {pid:p.id,action:{type:'bankrupt'}};
 }
 return legacyBotAction(s);
}

return {upgrade,normalizedName,waitingPlayers,activeLoans,loansOf,lien,assetValue,debtAssetQuote,transferableForDebt,loanTotal,BANK_LOAN,collectDue,spendable,buildReason,STICKERS,BID_MIN,BID_STEP,canBuild,STARTING_CASH,PASS_START,JAIL_FEE,HOTEL_LEVEL,TILES,GROUPS,COLORS,TOKENS,CARDS,randomInt,id,code,clone,createRoom,join,apply,tick,setOnline,current,player,owned,wealth,rent,fullGroup,groupTiles,botAction};
});

