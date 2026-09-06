/** One-time migration of the user's own, already-published frontend.
 * Never executes downloaded code. Every source fragment AND the assembled HTML
 * must match SHA-256 hashes of the tested 4.0 release before anything is written.
 * No account credentials are needed or transferred. After import, all game files
 * live in this repository and deployment no longer depends on the old website.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const digest = text => createHash('sha256').update(text).digest('hex');
const expected = [
 'cfbdd6aa8f4384cf6006781f4f6afb68490566e990a8d7cfb915e84ae0e479dd',
 '50e883cd92e8fd8c3ff394d6c5ff4c1e6186b37788d853f277689bd65adf0a9a',
 '59033d10b451d9a8aca6f270b636068a5153b72c8f6d13b759c4b50a0e83f66b',
 'ac411c7a8774ab44c9ef8e93a63ba620d52e8ce348bcbb2bdd2dcc09df1a9d9b'
];
const expectedHtml = 'fb0ba87d20c7c8acfa6907a97f61f4658eecfbffa4f141a80e1130e8e53cb6ab';
const sources = [
 'https://6a9dcb0678a2176ab1bd8be4--celadon-biscotti-4a8f9d.netlify.app/',
 'https://celadon-biscotti-4a8f9d.netlify.app/'
];
const shell = await readFile(new URL('./frontend-shell.html', import.meta.url), 'utf8');
let verified;
for (const url of sources) {
 try {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'Accept': 'text/html' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 2000000) throw new Error('Unexpected document size');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/\r\n/g, '\n');
  const pieces = [...text.matchAll(/<(?:style|script)\b[^>]*>([\s\S]*?)<\/(?:style|script)>/gi)].map(m => m[1]);
  const byHash = new Map(pieces.map(piece => [digest(piece), piece]));
  if (!expected.every(hash => byHash.has(hash))) {
   console.log('Fragment hashes received:', pieces.map(digest));
   throw new Error('Published source differs from the approved 4.0 release; import refused');
  }
  const html = shell.replace(/@@PAYLOAD_([0-3])@@/g, (_, i) => byHash.get(expected[Number(i)]));
  if (digest(html) !== expectedHtml) throw new Error('Reconstructed HTML integrity check failed');
  verified = { html, engine: byHash.get(expected[1]), source: url };
  break;
 } catch (error) { console.log(url, String(error.message || error)); }
}
if (!verified) throw new Error('Could not import the exact approved source. No game files were written.');
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await mkdir(new URL('../server/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/index.html', import.meta.url), verified.html);
await writeFile(new URL('../server/engine.cjs', import.meta.url), verified.engine);
await writeFile(new URL('../public/versao.json', import.meta.url), JSON.stringify({ app: 'metropole', version: '4.0.0', apiVersion: 4, requiresServer: true }, null, 2) + '\n');
console.log('Imported exact 4.0 frontend and rules engine:', expectedHtml);
