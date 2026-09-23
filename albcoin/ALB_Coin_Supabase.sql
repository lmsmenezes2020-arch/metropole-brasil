<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALB Coin - Economia Escolar</title>
<script src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; }
  input, select, button, textarea { font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { useState, useCallback } = React;


const SYSTEM_ADMIN = { username:"admin1", password:"9012", id:"admin1", apelido:"Administrador Principal", role:"admin" };

const DEMO_USERS = {
  "prof.demo":  { apelido:"Prof. Demo",  turma:"10º A", password:"1234", role:"professor", coins:10000, savings:0, lastInterestUpdate:Date.now() },
  "aluno.demo": { apelido:"Aluno Demo",  turma:"10º A", password:"1234", role:"aluno",     coins:50,    savings:0, lastInterestUpdate:Date.now() },
  "aluno2":     { apelido:"Ana Pereira", turma:"10º A", password:"1234", role:"aluno",     coins:30,    savings:0, lastInterestUpdate:Date.now() },
};

const DEMO_MESSAGES = [
  { id:"m1", text:"Excelente participação na aula!" },
  { id:"m2", text:"Bom trabalho no teste!" },
  { id:"m3", text:"Comportamento exemplar." },
];

const DEFAULT_THEME = {
  loginBg:     "linear-gradient(135deg,#0f172a,#1e3a5f,#312e81)",
  loginAccent: "#3b82f6",
  adminBg:     "#f8fafc",
  adminCard:   "#ffffff",
  adminAccent: "#2563eb",
  profBg:      "#f8fafc",
  profPanel:   "#0f172a",
  profAccent:  "#2563eb",
  alunoBg:     "#f8fafc",
  alunoHeader: "linear-gradient(135deg,#1d4ed8,#312e81)",
  alunoCard:   "#ffffff",
  alunoSafe:   "linear-gradient(135deg,#4f46e5,#6366f1)",
  fontFamily:  "system-ui, sans-serif",
  borderRadius:"28px",
};

function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function fmt(v)  { return Number(v||0).toFixed(2); }
function fmtALB(v){ return `${fmt(v)} ALB`; }

/* ══════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════ */
function ALBCoin() {
  const [view,         setView]         = useState("login");
  const [currentUser,  setCurrentUser]  = useState(null);
  const [users,        setUsers]        = useState(DEMO_USERS);
  const [admins,       setAdmins]       = useState({});
  const [settings,     setSettings]     = useState({ rate:5, interval:1, unit:60000 });
  const [transactions, setTransactions] = useState([]);
  const [messages,     setMessages]     = useState(DEMO_MESSAGES);
  const [challenges,   setChallenges]   = useState([]);   // desafios criados pelo admin
  const [theme,        setTheme]        = useState(DEFAULT_THEME);
  const [loginForm,    setLoginForm]    = useState({ username:"", password:"" });
  const [loginError,   setLoginError]   = useState("");
  const [toast,        setToast]        = useState(null);

  const notify = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  const processInterest = useCallback((uid,snap,cfg)=>{
    const u=snap[uid]; if(!u||!u.savings) return snap;
    const now=Date.now(), last=u.lastInterestUpdate||now;
    const passed=Math.floor((now-last)/(cfg.interval*cfg.unit));
    if(passed<1) return snap;
    const interest=parseFloat((u.savings*(cfg.rate/100)*passed).toFixed(2));
    return {...snap,[uid]:{...u,savings:parseFloat((u.savings+interest).toFixed(2)),lastInterestUpdate:now}};
  },[]);

  const handleLogin = (e) => {
    e.preventDefault();
    const u=loginForm.username.trim().toLowerCase(), p=loginForm.password.trim();
    setLoginError("");
    if(u===SYSTEM_ADMIN.username&&p===SYSTEM_ADMIN.password){ setCurrentUser({...SYSTEM_ADMIN}); setView("admin"); return; }
    if(admins[u]&&admins[u].password===p){ setCurrentUser({id:u,...admins[u]}); setView("admin"); return; }
    const found=users[u];
    if(found&&found.password===p){
      let snap=users;
      if(found.role==="aluno") snap=processInterest(u,users,settings);
      setUsers(snap); setCurrentUser({id:u,...snap[u]}); setView(found.role);
    } else setLoginError("Credenciais inválidas.");
  };

  const logout=()=>{ setCurrentUser(null); setView("login"); setLoginForm({username:"",password:""}); setLoginError(""); };

  const shared = { users,setUsers,admins,setAdmins,settings,setSettings,transactions,setTransactions,
    messages,setMessages,challenges,setChallenges,theme,setTheme,currentUser,notify,logout,processInterest };

  return (
    <div style={{fontFamily:theme.fontFamily}}>
      <Toast toast={toast}/>
      {view==="login"     && <LoginView  {...shared} form={loginForm} setForm={setLoginForm} onLogin={handleLogin} error={loginError}/>}
      {view==="admin"     && <AdminView  {...shared}/>}
      {view==="professor" && <ProfView   {...shared}/>}
      {view==="aluno"     && <AlunoView  {...shared}/>}
    </div>
  );
}

/* ── TOAST ── */
function Toast({toast}){
  if(!toast) return null;
  return <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:toast.type==="ok"?"#22c55e":"#ef4444",color:"#fff",padding:"12px 24px",borderRadius:16,fontWeight:700,fontSize:13,boxShadow:"0 8px 32px rgba(0,0,0,.2)",zIndex:10000}}>{toast.msg}</div>;
}

/* ── MODAL ── */
function Modal({title,children,onClose,maxWidth=460}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:28,padding:32,width:"100%",maxWidth,boxShadow:"0 32px 80px rgba(0,0,0,.3)",maxHeight:"90vh",overflowY:"auto"}}>
        {title&&<h3 style={{fontSize:19,fontWeight:900,color:"#1e293b",marginBottom:18}}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

/* ── FIELD ── */
function Field({label,value,onChange,placeholder="",type="text",required=true,step,min,dark=false,style={}}){
  const s={width:"100%",padding:"12px 15px",borderRadius:13,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box",
    ...(dark?{background:"#1e293b",border:"none",color:"#fff"}:{background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e293b"}),...style};
  return(
    <div style={{marginBottom:13}}>
      <label style={{fontSize:10,fontWeight:700,color:dark?"#475569":"#94a3b8",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:5}}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} step={step} min={min} style={s}
        onFocus={e=>{if(!dark)e.target.style.borderColor="#3b82f6";}} onBlur={e=>{if(!dark)e.target.style.borderColor="#e2e8f0";}}/>
    </div>
  );
}

/* ── BTN ── */
function Btn({onClick,children,color="#2563eb",light=false,danger=false,type="button",full=false,small=false}){
  const bg=danger?"#ef4444":light?"#f1f5f9":color;
  const fg=light?"#64748b":"#fff";
  return(
    <button type={type} onClick={onClick} style={{padding:small?"7px 12px":"11px 16px",background:bg,border:"none",borderRadius:12,fontWeight:700,fontSize:small?10:11,cursor:"pointer",color:fg,width:full?"100%":undefined,textTransform:"uppercase",letterSpacing:.5,flexShrink:0}}>
      {children}
    </button>
  );
}

/* ── COLOR PICKER FIELD ── */
function ColorField({label,value,onChange}){
  return(
    <div style={{marginBottom:12}}>
      <label style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:5}}>{label}</label>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <input type="color" value={value.startsWith("#")?value:"#3b82f6"} onChange={e=>onChange(e.target.value)}
          style={{width:40,height:36,border:"1px solid #e2e8f0",borderRadius:10,cursor:"pointer",padding:2,background:"#f8fafc"}}/>
        <input value={value} onChange={e=>onChange(e.target.value)} placeholder="#3b82f6 ou gradiente"
          style={{flex:1,padding:"9px 12px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,fontSize:12,fontWeight:600,outline:"none"}}
          onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════ */
function LoginView({form,setForm,onLogin,error,theme}){
  return(
    <div style={{minHeight:"100vh",background:theme.loginBg,display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:theme.fontFamily}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:76,height:76,background:theme.loginAccent,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:36,fontWeight:900,color:"#fff",transform:"rotate(3deg)",boxShadow:`0 16px 40px ${theme.loginAccent}66`}}>₳</div>
          <h1 style={{fontSize:34,fontWeight:900,color:"#fff",letterSpacing:"-1px",margin:0}}>ALB Coin</h1>
          <p style={{color:"rgba(147,197,253,.7)",fontSize:11,marginTop:5,letterSpacing:3,textTransform:"uppercase"}}>Economia Escolar</p>
        </div>
        <div style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",borderRadius:28,padding:32,backdropFilter:"blur(20px)"}}>
          <form onSubmit={onLogin}>
            {[["Utilizador","username","text"],["Palavra-passe","password","password"]].map(([lbl,field,tp])=>(
              <div key={field} style={{marginBottom:field==="password"?20:14}}>
                <label style={{fontSize:10,fontWeight:900,color:"rgba(147,197,253,.7)",textTransform:"uppercase",letterSpacing:2,display:"block",marginBottom:7}}>{lbl}</label>
                <input type={tp} value={form[field]} onChange={e=>setForm(p=>({...p,[field]:e.target.value}))} placeholder={tp==="password"?"••••••••":"Nome de utilizador"} required
                  style={{width:"100%",padding:"13px 17px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:15,color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
            <button type="submit" style={{width:"100%",padding:"15px",background:theme.loginAccent,border:"none",borderRadius:15,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer"}}>ENTRAR NO SISTEMA</button>
          </form>
          {error&&<div style={{marginTop:14,padding:11,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",borderRadius:11,color:"#fca5a5",fontSize:12,fontWeight:700,textAlign:"center"}}>{error}</div>}
          <div style={{marginTop:18,textAlign:"center",borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:14}}>
            <p style={{color:"rgba(255,255,255,.3)",fontSize:11,fontWeight:700,marginBottom:3}}>🔑 Admin: admin1 / 9012</p>
            <p style={{color:"rgba(255,255,255,.2)",fontSize:10}}>Demo: prof.demo / 1234 · aluno.demo / 1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ADMIN
══════════════════════════════════════════════════ */
function AdminView({users,setUsers,admins,setAdmins,settings,setSettings,transactions,setTransactions,messages,setMessages,challenges,setChallenges,theme,setTheme,notify,logout,currentUser}){
  const [tab,setTab]=useState("users");

  // modais gerais
  const [newUserM,setNewUserM]=useState(false);
  const [newAdminM,setNewAdminM]=useState(false);
  const [editM,setEditM]=useState(null);
  const [pwM,setPwM]=useState(null);
  const [sendM,setSendM]=useState(null);

  // forms
  const [filter,setFilter]=useState("todas");
  const [newU,setNewU]=useState({id:"",apelido:"",turma:"",password:"",role:"aluno"});
  const [newA,setNewA]=useState({id:"",apelido:"",password:""});
  const [ecoF,setEcoF]=useState({...settings});
  const [newMsg,setNewMsg]=useState("");

  // desafios
  const [chalM,setChalM]=useState(null); // modal criar/editar desafio
  const [chalForm,setChalForm]=useState({title:"",question:"",type:"aberta",options:"",answer:"",reward:10,turma:"todas",deadline:""});
  const [answersM,setAnswersM]=useState(null); // ver respostas

  // tema
  const [themeSection,setThemeSection]=useState("login");
  const [localTheme,setLocalTheme]=useState({...theme});

  const isSuperAdmin=currentUser?.id===SYSTEM_ADMIN.id;
  const turmas=[...new Set(Object.values(users).map(u=>u.turma).filter(Boolean))].sort();
  const list=Object.entries(users).filter(([,u])=>filter==="todas"||u.turma===filter);

  const createUser=(e)=>{
    e.preventDefault(); const id=newU.id.trim().toLowerCase();
    if(!id||users[id]){notify("ID já existe ou inválido.","err");return;}
    setUsers(p=>({...p,[id]:{apelido:newU.apelido,turma:newU.turma,password:newU.password,role:newU.role,coins:newU.role==="professor"?10000:0,savings:0,lastInterestUpdate:Date.now()}}));
    setNewU({id:"",apelido:"",turma:"",password:"",role:"aluno"});setNewUserM(false);notify("Utilizador criado!");
  };
  const createAdmin=(e)=>{
    e.preventDefault(); const id=newA.id.trim().toLowerCase();
    if(!id||admins[id]||id===SYSTEM_ADMIN.username){notify("ID já existe.","err");return;}
    setAdmins(p=>({...p,[id]:{apelido:newA.apelido,password:newA.password,role:"admin"}}));
    setNewA({id:"",apelido:"",password:""});setNewAdminM(false);notify("Admin criado!");
  };
  const applyAll=()=>{
    setUsers(p=>{const u={...p};Object.keys(u).forEach(id=>{if(u[id].role==="aluno"&&u[id].savings>0){const i=parseFloat((u[id].savings*(settings.rate/100)).toFixed(2));u[id]={...u[id],savings:parseFloat((u[id].savings+i).toFixed(2)),lastInterestUpdate:Date.now()};}});return u;});
    notify("Juros aplicados!");
  };
  const saveEdit=(e)=>{
    e.preventDefault();
    const coins=parseFloat(parseFloat(editM.coins).toFixed(2)),savings=parseFloat(parseFloat(editM.savings).toFixed(2));
    if(isNaN(coins)||coins<0||isNaN(savings)||savings<0){notify("Valores inválidos.","err");return;}
    setUsers(p=>({...p,[editM.id]:{...p[editM.id],apelido:editM.apelido,turma:editM.turma,role:editM.role,coins,savings}}));
    setEditM(null);notify("Perfil atualizado!");
  };
  const saveSend=(e)=>{
    e.preventDefault(); const amt=parseFloat(parseFloat(sendM.amount).toFixed(2));
    if(isNaN(amt)||amt<=0){notify("Valor inválido.","err");return;}
    setUsers(p=>({...p,[sendM.id]:{...p[sendM.id],coins:parseFloat(((p[sendM.id].coins||0)+amt).toFixed(2))}}));
    setTransactions(p=>[...p,{id:genId(),to:sendM.id,from:"admin",amount:amt,reason:sendM.reason||"Atribuição Admin",date:Date.now()}]);
    setSendM(null);notify(`${fmtALB(amt)} enviados para ${sendM.apelido}!`);
  };

  // DESAFIOS
  const saveChallenge=(e)=>{
    e.preventDefault();
    const opts=chalForm.type==="multipla"?chalForm.options.split("\n").map(o=>o.trim()).filter(Boolean):[];
    if(chalForm.type==="multipla"&&opts.length<2){notify("Adiciona pelo menos 2 opções.","err");return;}
    const ch={
      id: chalM==="new"?genId():chalM.id,
      title:chalForm.title, question:chalForm.question,
      type:chalForm.type, options:opts,
      answer:chalForm.answer.trim().toLowerCase(),
      reward:parseFloat(chalForm.reward)||0,
      turma:chalForm.turma, deadline:chalForm.deadline,
      status:"active", createdAt:Date.now(),
      responses:{} // uid -> {answer, correct, date, rewarded}
    };
    if(chalM==="new") setChallenges(p=>[...p,ch]);
    else setChallenges(p=>p.map(c=>c.id===ch.id?{...c,...ch,responses:c.responses}:c));
    setChalM(null); notify(chalM==="new"?"Desafio criado!":"Desafio atualizado!");
  };

  const toggleChallenge=(id)=>{
    setChallenges(p=>p.map(c=>c.id===id?{...c,status:c.status==="active"?"closed":"active"}:c));
  };
  const deleteChallenge=(id)=>{
    if(confirm("Eliminar desafio?")) setChallenges(p=>p.filter(c=>c.id!==id));
  };

  // resposta manual aceite pelo admin (pergunta aberta)
  const manualReward=(chalId,uid)=>{
    const ch=challenges.find(c=>c.id===chalId);
    if(!ch||ch.responses[uid]?.rewarded) return;
    const amt=parseFloat(ch.reward);
    setUsers(p=>({...p,[uid]:{...p[uid],coins:parseFloat(((p[uid].coins||0)+amt).toFixed(2))}}));
    setTransactions(p=>[...p,{id:genId(),to:uid,from:"admin",amount:amt,reason:`Desafio: ${ch.title}`,date:Date.now()}]);
    setChallenges(p=>p.map(c=>c.id===chalId?{...c,responses:{...c.responses,[uid]:{...c.responses[uid],rewarded:true}}}:c));
    notify(`${fmtALB(amt)} enviados para ${users[uid]?.apelido}!`);
  };

  // TEMA
  const applyTheme=()=>{ setTheme({...localTheme}); notify("Design atualizado!"); };
  const resetTheme=()=>{ setLocalTheme({...DEFAULT_THEME}); setTheme({...DEFAULT_THEME}); notify("Design reposto."); };

  const THEME_SECTIONS={
    login:["loginBg","loginAccent"],
    admin:["adminBg","adminCard","adminAccent"],
    professor:["profBg","profPanel","profAccent"],
    aluno:["alunoBg","alunoHeader","alunoCard","alunoSafe"],
  };
  const THEME_LABELS={
    loginBg:"Fundo do Login",loginAccent:"Cor de Destaque (Login)",
    adminBg:"Fundo Admin",adminCard:"Cartão Admin",adminAccent:"Destaque Admin",
    profBg:"Fundo Professor",profPanel:"Painel Lateral",profAccent:"Destaque Professor",
    alunoBg:"Fundo Aluno",alunoHeader:"Header do Aluno",alunoCard:"Cartão",alunoSafe:"Cofre",
  };

  const cardBtns=(uid,u)=>(
    <div style={{display:"flex",gap:3}}>
      <button onClick={()=>setSendM({id:uid,apelido:u.apelido,amount:"",reason:""})} title="Enviar moedas"
        style={{padding:"4px 7px",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:7,cursor:"pointer",fontSize:12,color:"#166534"}}>₳</button>
      <button onClick={()=>setEditM({id:uid,apelido:u.apelido,turma:u.turma||"",role:u.role,coins:fmt(u.coins),savings:fmt(u.savings)})} title="Editar"
        style={{padding:"4px 7px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:7,cursor:"pointer",fontSize:12,color:"#2563eb"}}>✎</button>
      <button onClick={()=>setPwM({id:uid,apelido:u.apelido,pw:""})} title="Senha"
        style={{padding:"4px 7px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:7,cursor:"pointer",fontSize:12,color:"#d97706"}}>🔑</button>
      <button onClick={()=>{if(confirm(`Eliminar ${uid}?`)){setUsers(p=>{const n={...p};delete n[uid];return n;});notify("Eliminado.");}}} title="Eliminar"
        style={{padding:"4px 7px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:7,cursor:"pointer",fontSize:12,color:"#ef4444"}}>✕</button>
    </div>
  );

  const TABS=[["users","👥 Utilizadores"],["admins","🛡️ Admins"],["challenges","🏆 Desafios"],["messages","💬 Mensagens"],["economy","📊 Economia"],["design","🎨 Design"]];

  return(
    <div style={{minHeight:"100vh",background:theme.adminBg,padding:"24px 18px",maxWidth:1020,margin:"0 auto",fontFamily:theme.fontFamily}}>

      {/* header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{fontSize:24,fontWeight:900,color:"#1e293b",letterSpacing:"-0.5px",margin:0}}>Painel Admin</h2>
          <p style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:2,marginTop:3}}>{currentUser?.apelido}</p>
        </div>
        <button onClick={logout} style={{background:"#fff",border:"1px solid #e2e8f0",padding:"9px 16px",borderRadius:13,fontSize:11,fontWeight:900,cursor:"pointer",color:"#64748b"}}>SAIR</button>
      </div>

      {/* tabs */}
      <div style={{display:"flex",gap:4,background:"#e2e8f0",padding:5,borderRadius:18,width:"fit-content",marginBottom:22,flexWrap:"wrap"}}>
        {TABS.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",borderRadius:12,border:"none",fontWeight:700,fontSize:11,cursor:"pointer",
            background:tab===k?"#fff":"transparent",color:tab===k?"#1e293b":"#64748b",boxShadow:tab===k?"0 1px 4px rgba(0,0,0,.1)":"none"}}>{l}</button>
        ))}
      </div>

      {/* ══ UTILIZADORES ══ */}
      {tab==="users"&&<>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase"}}>Turma:</span>
            <select value={filter} onChange={e=>setFilter(e.target.value)} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:11,padding:"7px 12px",fontSize:11,fontWeight:700,cursor:"pointer",outline:"none"}}>
              <option value="todas">TODAS</option>{turmas.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Btn onClick={()=>setNewUserM(true)} color={theme.adminAccent}>⊕ Novo Utilizador</Btn>
        </div>
        <div style={{background:theme.adminCard,borderRadius:22,border:"1px solid #f1f5f9",padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:11}}>
            {list.map(([uid,u])=>(
              <div key={uid} style={{background:"#f8fafc",borderRadius:18,padding:15,border:"1px solid #f1f5f9"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                  <span style={{fontSize:9,fontWeight:900,textTransform:"uppercase",padding:"3px 8px",borderRadius:6,background:u.role==="professor"?"#f3e8ff":"#dbeafe",color:u.role==="professor"?"#7c3aed":"#1d4ed8"}}>{u.role}</span>
                  {cardBtns(uid,u)}
                </div>
                <p style={{fontWeight:900,color:"#1e293b",fontSize:13,marginBottom:2}}>{u.apelido}</p>
                <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{u.turma||"Sem Turma"} · {uid}</p>
                <div style={{marginTop:9,paddingTop:7,borderTop:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#94a3b8"}}>Carteira</span>
                    <span style={{fontSize:11,fontWeight:900,color:"#2563eb"}}>{fmtALB(u.coins)}</span>
                  </div>
                  {u.role==="aluno"&&<div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#94a3b8"}}>Cofre</span>
                    <span style={{fontSize:11,fontWeight:900,color:"#4f46e5"}}>{fmtALB(u.savings)}</span>
                  </div>}
                </div>
              </div>
            ))}
            {list.length===0&&<p style={{color:"#cbd5e1",gridColumn:"1/-1",textAlign:"center",padding:24}}>Nenhum utilizador encontrado.</p>}
          </div>
        </div>
      </>}

      {/* ══ ADMINS ══ */}
      {tab==="admins"&&(
        <div style={{background:theme.adminCard,borderRadius:22,border:"1px solid #f1f5f9",padding:22}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <p style={{fontSize:10,fontWeight:900,color:"#1e293b",textTransform:"uppercase",letterSpacing:2,margin:0}}>Administradores</p>
            {isSuperAdmin&&<Btn onClick={()=>setNewAdminM(true)} color="#7c3aed">⊕ Novo Admin</Btn>}
          </div>
          <div style={{background:"linear-gradient(135deg,#1e293b,#0f172a)",borderRadius:16,padding:15,marginBottom:11,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",gap:7,marginBottom:4}}>
                <span style={{fontSize:9,background:"#fbbf24",color:"#78350f",padding:"3px 8px",borderRadius:6,fontWeight:900,textTransform:"uppercase"}}>Super Admin</span>
              </div>
              <p style={{fontWeight:900,color:"#fff",fontSize:13,margin:"0 0 2px"}}>{SYSTEM_ADMIN.apelido}</p>
              <p style={{fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:700,margin:0}}>ID: {SYSTEM_ADMIN.username} · Não editável</p>
            </div>
            <span style={{fontSize:22}}>🛡️</span>
          </div>
          {Object.entries(admins).map(([uid,a])=>(
            <div key={uid} style={{background:"#f8fafc",borderRadius:16,padding:15,marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #f1f5f9"}}>
              <div>
                <span style={{fontSize:9,background:"#ede9fe",color:"#6d28d9",padding:"3px 8px",borderRadius:6,fontWeight:900,textTransform:"uppercase",marginBottom:5,display:"inline-block"}}>Admin</span>
                <p style={{fontWeight:900,color:"#1e293b",fontSize:13,margin:"0 0 2px"}}>{a.apelido}</p>
                <p style={{fontSize:10,color:"#94a3b8",fontWeight:700,margin:0}}>ID: {uid}</p>
              </div>
              {isSuperAdmin&&<div style={{display:"flex",gap:6}}>
                <button onClick={()=>setPwM({id:uid,apelido:a.apelido,pw:"",isAdmin:true})} style={{padding:"6px 9px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:12,color:"#d97706"}}>🔑</button>
                <button onClick={()=>{if(confirm(`Eliminar admin ${uid}?`)){setAdmins(p=>{const n={...p};delete n[uid];return n;});notify("Admin eliminado.");}}} style={{padding:"6px 9px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,cursor:"pointer",fontSize:12,color:"#ef4444"}}>✕</button>
              </div>}
            </div>
          ))}
          {Object.keys(admins).length===0&&<p style={{color:"#cbd5e1",textAlign:"center",padding:20,fontSize:13}}>Nenhum admin extra criado.</p>}
        </div>
      )}

      {/* ══ DESAFIOS ══ */}
      {tab==="challenges"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <h3 style={{fontSize:14,fontWeight:900,color:"#1e293b",margin:0}}>Desafios & Perguntas</h3>
              <p style={{fontSize:11,color:"#94a3b8",margin:"3px 0 0"}}>Cria desafios para os alunos responderem e ganharem ALB Coin</p>
            </div>
            <Btn onClick={()=>{setChalForm({title:"",question:"",type:"aberta",options:"",answer:"",reward:10,turma:"todas",deadline:""});setChalM("new");}} color="#f59e0b">⊕ Novo Desafio</Btn>
          </div>

          {challenges.length===0&&(
            <div style={{background:theme.adminCard,borderRadius:22,border:"2px dashed #e2e8f0",padding:40,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>🏆</div>
              <p style={{fontSize:14,fontWeight:700,color:"#94a3b8",marginBottom:6}}>Nenhum desafio criado ainda</p>
              <p style={{fontSize:12,color:"#cbd5e1"}}>Clica em "Novo Desafio" para criar perguntas e desafios para os alunos.</p>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {challenges.map(ch=>{
              const respCount=Object.keys(ch.responses).length;
              const correctCount=Object.values(ch.responses).filter(r=>r.correct||r.rewarded).length;
              return(
                <div key={ch.id} style={{background:theme.adminCard,borderRadius:20,border:"1px solid #f1f5f9",padding:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,fontWeight:900,padding:"3px 10px",borderRadius:8,textTransform:"uppercase",
                          background:ch.status==="active"?"#dcfce7":"#f1f5f9",color:ch.status==="active"?"#166534":"#64748b"}}>
                          {ch.status==="active"?"● Ativo":"○ Fechado"}
                        </span>
                        <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:8,background:"#fef3c7",color:"#92400e",textTransform:"uppercase"}}>
                          {ch.type==="multipla"?"Múltipla Escolha":ch.type==="verdadeiro_falso"?"V/F":"Resposta Aberta"}
                        </span>
                        <span style={{fontSize:10,fontWeight:700,color:"#4f46e5"}}>🎁 {fmtALB(ch.reward)}</span>
                        {ch.turma!=="todas"&&<span style={{fontSize:10,fontWeight:700,color:"#0891b2"}}>📚 {ch.turma}</span>}
                      </div>
                      <h4 style={{fontSize:15,fontWeight:900,color:"#1e293b",margin:"0 0 4px"}}>{ch.title}</h4>
                      <p style={{fontSize:12,color:"#64748b",margin:"0 0 8px",lineHeight:1.4}}>{ch.question}</p>
                      {ch.type==="multipla"&&<div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ch.options.map((o,i)=><span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:o.toLowerCase()===ch.answer?"#dcfce7":"#f1f5f9",color:o.toLowerCase()===ch.answer?"#166534":"#64748b",fontWeight:700}}>{o.toLowerCase()===ch.answer?"✓ ":""}{o}</span>)}</div>}
                      {ch.deadline&&<p style={{fontSize:10,color:"#94a3b8",marginTop:6}}>⏰ Prazo: {new Date(ch.deadline).toLocaleString("pt-PT")}</p>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                      <button onClick={()=>setAnswersM(ch)} style={{padding:"7px 12px",background:"#dbeafe",border:"none",borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:700,color:"#1d4ed8"}}>
                        👁 {respCount} resp.
                      </button>
                      <button onClick={()=>{setChalForm({title:ch.title,question:ch.question,type:ch.type,options:ch.options.join("\n"),answer:ch.answer,reward:ch.reward,turma:ch.turma,deadline:ch.deadline});setChalM(ch);}}
                        style={{padding:"7px 9px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,cursor:"pointer",fontSize:12,color:"#2563eb"}}>✎</button>
                      <button onClick={()=>toggleChallenge(ch.id)}
                        style={{padding:"7px 9px",background:ch.status==="active"?"#fef3c7":"#dcfce7",border:"none",borderRadius:10,cursor:"pointer",fontSize:12,color:ch.status==="active"?"#92400e":"#166534",fontWeight:700}}>
                        {ch.status==="active"?"Fechar":"Reabrir"}
                      </button>
                      <button onClick={()=>deleteChallenge(ch.id)} style={{padding:"7px 9px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,cursor:"pointer",fontSize:12,color:"#ef4444"}}>✕</button>
                    </div>
                  </div>
                  {/* barra de progresso */}
                  <div style={{marginTop:12,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1,background:"#f1f5f9",borderRadius:8,height:6,overflow:"hidden"}}>
                      <div style={{width:respCount>0?`${(correctCount/Math.max(respCount,1))*100}%`:"0%",height:"100%",background:"#22c55e",borderRadius:8,transition:"width .5s"}}/>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:"#94a3b8",whiteSpace:"nowrap"}}>{correctCount}/{respCount} corretos</span>
                  </div>
                </div>
              );
            })}