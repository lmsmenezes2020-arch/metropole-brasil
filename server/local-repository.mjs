/** Local testing only: atomic replacement + optimistic version check.
 * Run exactly one local server process per directory. Production uses Netlify CAS.
 */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
export function fileRepository(directory) {
  const queues = new Map();
  const filename = key => path.join(directory, createHash('sha256').update(key).digest('hex') + '.json');
  async function read(key) { try { return JSON.parse(await readFile(filename(key), 'utf8')); } catch (e) { if(e.code==='ENOENT')return null;throw e; } }
  function exclusive(key, task) {
    const previous = queues.get(key) || Promise.resolve();
    const promise = previous.catch(()=>{}).then(task); queues.set(key, promise);
    promise.finally(()=>{if(queues.get(key)===promise)queues.delete(key);}).catch(()=>{}); return promise;
  }
  async function commit(key,data,etag) {
    return exclusive(key, async()=>{
      const existing=await read(key);if(etag===null?existing!==null:existing?.etag!==etag)return false;
      await mkdir(directory,{recursive:true});const tag=randomBytes(16).toString('hex');
      const file=filename(key),temp=file+'.'+tag+'.tmp';
      await writeFile(temp,JSON.stringify({key,data,etag:tag}),{mode:0o600});await rename(temp,file);return true;
    });
  }
  return {read,create:(key,data)=>commit(key,data,null),compareAndSwap:commit};
}
