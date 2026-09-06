/** Run the authorized Netlify deployment from GitHub's standard Linux runner.
 * The temporary deployment URL is encrypted to an ephemeral RSA key. The private
 * key stays only in this process; no plaintext token is committed or logged.
 * Fixed destination: the user's existing celadon-biscotti-4a8f9d site.
 */
import { generateKeyPairSync, privateDecrypt, createDecipheriv, constants } from 'node:crypto';
import { spawn } from 'node:child_process';
const REPOSITORY = 'lmsmenezes2020-arch/metropole-brasil';
const SITE = '8785ef5e-0899-40a0-94f7-17d8e50524b1';
const SITE_URL = 'https://celadon-biscotti-4a8f9d.netlify.app';
const token = process.env.GITHUB_TOKEN;
const runId = process.env.GITHUB_RUN_ID;
const attempt = process.env.GITHUB_RUN_ATTEMPT || '1';
if (!token || !/^\d+$/.test(runId || '') || process.env.GITHUB_REPOSITORY !== REPOSITORY) throw new Error('Run this only in the authorized repository workflow');
const keyId = `${runId}-${attempt}`;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function api(path, method='GET', body) {
 const r = await fetch(`https://api.github.com/repos/${REPOSITORY}/${path}`, {
  method, signal: AbortSignal.timeout(20000),
  headers: { Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json' },
  ...(body ? { body:JSON.stringify(body) } : {})
 });
 if (r.status===404 && method==='GET') return null;
 if (!r.ok) throw new Error(`Repository operation failed: HTTP ${r.status}`);
 return r.json();
}
async function saveJson(path, data, message) {
 const existing = await api(`contents/${path}?ref=main`);
 return api(`contents/${path}`, 'PUT', { message, branch:'main', ...(existing?{sha:existing.sha}:{}), content:Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64') });
}
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength:3072 });
const expiresAt = Date.now()+10*60*1000;
await saveJson(`deployment/requests/${keyId}.json`, {
 runId:keyId, siteId:SITE, repository:REPOSITORY, expiresAt,
 algorithm:'RSA-OAEP-256+A256GCM', publicKey:publicKey.export({type:'spki',format:'pem'})
}, 'Abrir autorização criptografada temporária para publicar no site existente');
console.log(`Deployment request ready: ${keyId}. Waiting for encrypted authorization.`);
let secret;
while (Date.now()<expiresAt) {
 const file = await api(`contents/deployment/responses/${keyId}.json?ref=main`);
 if (file) {
  const envelope=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
  if(envelope.runId!==keyId || envelope.algorithm!=='RSA-OAEP-256+A256GCM') throw new Error('Invalid envelope');
  const aes=privateDecrypt({key:privateKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(envelope.encryptedKey,'base64'));
  const iv=Buffer.from(envelope.iv,'base64'), all=Buffer.from(envelope.ciphertext,'base64');
  if(aes.length!==32 || iv.length!==12 || all.length<17) throw new Error('Invalid encryption parameters');
  const decipher=createDecipheriv('aes-256-gcm',aes,iv);decipher.setAuthTag(all.subarray(-16));
  decipher.setAAD(Buffer.from(keyId));
  secret=JSON.parse(Buffer.concat([decipher.update(all.subarray(0,-16)),decipher.final()]).toString('utf8'));
  aes.fill(0);
  break;
 }
 await delay(3000);
}
if(!secret) throw new Error('Temporary authorization expired; nothing was deployed');
if(secret.runId!==keyId || secret.siteId!==SITE || Date.now()>expiresAt) throw new Error('Authorization does not match this deployment');
const proxy=new URL(secret.proxyPath);
if(proxy.protocol!=='https:' || proxy.hostname!=='netlify-mcp.netlify.app' || !proxy.pathname.startsWith('/proxy/')) throw new Error('Unexpected deployment gateway');
const sensitive=[secret.proxyPath,proxy.pathname.slice('/proxy/'.length)];
for(const value of sensitive) console.log(`::add-mask::${value}`);
const clean=line=>sensitive.reduce((text,secret)=>text.split(secret).join('[REDACTED]'),line);
console.log('Deploying the complete project to the existing Netlify site. No account or plan changes.');
const safeEnv={ PATH:process.env.PATH, HOME:process.env.HOME, CI:'true', TERM:'dumb', NETLIFY_TELEMETRY_DISABLED:'1', npm_config_audit:'false', npm_config_fund:'false' };
const exitCode=await new Promise((resolve,reject)=>{
 const child=spawn('npx',['--yes','@netlify/mcp@latest','--site-id',SITE,'--proxy-path',secret.proxyPath],{cwd:process.cwd(),env:safeEnv,stdio:['ignore','pipe','pipe']});
 const limit=setTimeout(()=>child.kill('SIGTERM'),10*60*1000);
 for(const stream of [child.stdout,child.stderr]){
  let pending='';
  stream.on('data',chunk=>{pending+=chunk.toString();let i;while((i=pending.indexOf('\n'))>=0){console.log(clean(pending.slice(0,i)));pending=pending.slice(i+1);}});
  stream.on('end',()=>{if(pending)console.log(clean(pending));});
 }
 child.on('error',e=>{clearTimeout(limit);reject(e);});
 child.on('exit',code=>{clearTimeout(limit);resolve(code??1);});
});
secret=null;
let info=null, verified=false;
if(exitCode===0){
 for(let i=0;i<12;i++){
  try{
   const r=await fetch(`${SITE_URL}/api/metro/info?verify=${Date.now()}`,{signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(r.ok){info=await r.json();if(info.app==='metropole'&&info.apiVersion===4){verified=true;break;}}
  }catch{}
  await delay(5000);
 }
}
await saveJson(`deployment/results/${keyId}.json`,{runId:keyId,siteId:SITE,siteUrl:SITE_URL,exitCode,apiReachable:verified,info:verified?info:null,finishedAt:new Date().toISOString()},'Registrar resultado da publicação sem expor credenciais');
if(exitCode!==0) throw new Error(`Deployment command failed (exit ${exitCode}); inspect sanitized logs`);
if(!verified) throw new Error('Deployment command finished, but the public game API was not verified');
console.log(`Public game API confirmed: ${SITE_URL}/api/metro/info`);
