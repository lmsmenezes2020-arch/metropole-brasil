import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,3,'Interface incompleta');scripts.forEach((m,i)=>new vm.Script(m[1],{filename:`inline-${i}.js`}));
assert(html.includes('class ServerNet'));assert(!html.includes('new Peer('));
console.log('Metrópole 4.0: HTML e JavaScript verificados. O Netlify empacotará a função metro.mts.');
