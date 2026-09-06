/** Metrópole 4.0. All game mutations and identity/presence live in one CAS record.
 * Nothing in this service depends on a host browser or a long-lived process.
 * Netlify adapter supplies strongly consistent, conditional object writes.
 */
import { createHash, randomBytes } from 'node:crypto';
import G from './engine.cjs';

export const API_VERSION = 4;
export const LEASE_MS = 60000;
export const TOUCH_MS = 12000;
export const ROOM_LIFETIME_MS = 30 * 86400000;
const LIMIT_BYTES = 16384;
const sha = value => createHash('sha256').update(value).digest('hex');
const copy = value => structuredClone(value);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export class GameError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}
function requireThat(ok, code, message, status = 400) { if (!ok) throw new GameError(code, message, status); }
function cleanName(value) {
  requireThat(typeof value === 'string', 'BAD_NAME', 'Digite o seu nome.');
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  requireThat(name.length > 0 && name.length <= 18 && !/[\x00-\x1f\x7f]/.test(name), 'BAD_NAME', 'Use um nome de 1 a 18 caracteres.');
  return name;
}
function checkHex(value, label, min = 24) {
  requireThat(typeof value === 'string' && new RegExp(`^[a-f0-9]{${min},64}$`).test(value), 'BAD_REQUEST', `${label} inválido.`);
}
function codeFor(token, requestId) {
  const bytes = createHash('sha256').update(`metro4:${token}:${requestId}`).digest();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(bytes.subarray(0, 6), b => chars[b % chars.length]).join('');
}
function publicState(state) {
  const safe = copy(state);
  // Drawing order is private; public clients use these arrays only for the local demo.
  safe.deck = []; safe.discard = [];
  return safe;
}
function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private',
    'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '60' } : {})
  }});
}
function seatFor(doc, pid) {
  const seat = doc.seats[pid];
  requireThat(seat, 'SESSION_EXPIRED', 'Entre novamente com o código da sala e seu nome.', 401);
  return seat;
}
function authenticate(doc, body, tokenHash, allowPreviousConnection = false) {
  const seat = seatFor(doc, body.pid);
  requireThat(seat.tokenHash === tokenHash, 'SESSION_REPLACED', 'Essa sessão foi recuperada em outro navegador. Entre novamente quando ela estiver offline.', 401);
  const player = G.player(doc.state, body.pid);
  requireThat(!player.removed, 'PLAYER_REMOVED', 'O anfitrião retirou este participante. Não é uma queda de internet.', 403);
  requireThat(allowPreviousConnection || seat.clientId === body.clientId, 'SESSION_REPLACED', 'Esta partida foi aberta em outra aba. Use somente uma aba por participante.', 409);
  return seat;
}
function expirePresence(doc, now) {
  // Backdate the pause to the earliest expired lease, not to the next HTTP request.
  // Thus timers do not run out while all browsers are asleep / server is idle.
  const expired = doc.state.players.filter(p => !p.bot && !p.removed && !p.bankrupt && p.online &&
    (!doc.seats[p.id] || now - doc.seats[p.id].lastSeen >= LEASE_MS))
    .sort((a,b) => (doc.seats[a.id]?.lastSeen ?? 0) - (doc.seats[b.id]?.lastSeen ?? 0));
  for (const p of expired) {
    const at = Math.min(now, (doc.seats[p.id]?.lastSeen ?? now) + LEASE_MS);
    doc.state = G.setOnline(doc.state, p.id, false, at);
  }
}
function contact(doc, pid, now, force = false) {
  const seat = seatFor(doc, pid);
  if (force || now - seat.lastSeen >= TOUCH_MS) seat.lastSeen = now;
  doc.state = G.setOnline(doc.state, pid, true, now);
}
function advance(doc, now, rng) {
  doc.state = G.tick(doc.state, now);
  if (doc.state.pausedAt != null || doc.state.phase !== 'playing') return;
  if (now - (doc.lastBotAt || 0) >= 1100) {
    const bot = G.botAction(doc.state);
    if (bot) {
      doc.lastBotAt = now;
      try { doc.state = G.apply(doc.state, bot.pid, bot.action, now, rng); }
      catch { /* A bot never bypasses the same rule validation used by humans. */ }
    }
  }
}
function reply(doc, pid, body, now, extra = {}) {
  const seat = seatFor(doc, pid);
  return { apiVersion: API_VERSION, engineVersion: 31, code: doc.state.code, pid,
    isHost: doc.state.hostId === pid, state: body.revision === doc.state.revision && !extra.forceState ? null : publicState(doc.state),
    revision: doc.state.revision, serverTime: now, savedAt: doc.savedAt, expiresAt: doc.expiresAt,
    lastSeq: seat.lastSeq, receipts: seat.receipts.slice(-8), leaseMs: LEASE_MS,
    pollAfterMs: doc.state.phase === 'finished' ? 30000 : doc.state.auction ? 2000 : doc.state.pausedAt != null ? 8000 : 4000,
    ...extra };
}
function intentValue(state, action) {
  if (['roll','end','buy','auction','bail','bankrupt','trade'].includes(action.type))
    return [state.turnCount, state.turnIndex, state.rollSerial, state.turnState].join(':');
  if (['build','sell','mortgage','unmortgage'].includes(action.type)) {
    const p = state.properties[action.tileId]; return p ? [p.owner, p.level, p.mortgaged].join(':') : 'missing';
  }
  if (action.type === 'tradeReply') return state.trade ? JSON.stringify(state.trade) : 'none';
  if (action.type === 'loanReply') return state.loanOffer?.id || 'none';
  if (action.type === 'assetReply') return state.assetOffer?.id || 'none';
  if (['offerAsset','foreclose','liquidateDebt'].includes(action.type)) return state.debt?.id || 'none';
  return null;
}
export { intentValue };

/** repo: {read(key):{data,etag}|null, create(key,data):boolean,
 * compareAndSwap(key,data,etag):boolean}. A blind overwrite is NEVER sufficient. */
export function createRoomService({ repo, now = Date.now, sleep = wait, rng = G.randomInt, storageName = 'persistent', ipHashSalt = 'metro4' }) {
  async function transact(code, mutate) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const found = await repo.read('room/' + code);
      requireThat(found, 'ROOM_NOT_FOUND', 'Sala não encontrada nesta versão. Confira o código de seis caracteres; salas antigas usam outro sistema.', 404);
      requireThat(found.data.schema === 4, 'VERSION_MISMATCH', 'Todos devem abrir a versão 4.0 pelo mesmo endereço.', 409);
      const time = now();
      requireThat(time < found.data.expiresAt, 'ROOM_EXPIRED', 'A sala expirou após 30 dias sem atividade. Crie uma nova partida.', 410);
      const doc = copy(found.data), before = JSON.stringify(doc);
      const result = mutate(doc, time);
      if (JSON.stringify(doc) === before) return result.finish(doc, time);
      doc.savedAt = time;
      doc.expiresAt = time + ROOM_LIFETIME_MS;
      if (await repo.compareAndSwap('room/' + code, doc, found.etag)) return result.finish(doc, time);
      // Retry from the *fresh* record. All effects are within that single document.
      await sleep(Math.min(120, 4 * (attempt + 1)) + Math.floor(Math.random() * 12));
    }
    throw new GameError('ROOM_BUSY', 'Outra jogada está sendo salva. Aguarde um instante e tente novamente.', 503);
  }
  async function throttle(ip, operation, limit) {
    const bucket = Math.floor(now() / 3600000);
    const key = 'limits/' + sha(ipHashSalt + ':' + ip + ':' + operation + ':' + bucket).slice(0, 32);
    for (let attempt = 0; attempt < 8; attempt++) {
      const r = await repo.read(key), data = r?.data || { count: 0, expiresAt: (bucket + 2) * 3600000 };
      requireThat(data.count < limit, 'RATE_LIMIT', 'Muitas tentativas nesta rede. Aguarde antes de tentar novamente.', 429);
      const next = { ...data, count: data.count + 1 };
      if (r ? await repo.compareAndSwap(key, next, r.etag) : await repo.create(key, next)) return;
      await sleep(5 + attempt * 4);
    }
    throw new GameError('SERVICE_BUSY', 'Serviço ocupado. Tente em instantes.', 503);
  }
  async function create(body, tokenHash, ip) {
    const name = cleanName(body.name); checkHex(body.requestId, 'Identificador');
    const code = codeFor(tokenHash, body.requestId), key = 'room/' + code;
    const existing = await repo.read(key);
    if (existing?.data.creationKey === sha(tokenHash + body.requestId)) {
      return join({ ...body, op: 'join', code }, tokenHash, ip, false);
    }
    requireThat(!existing, 'CODE_COLLISION', 'Tente criar a sala novamente.', 409);
    await throttle(ip, 'create', 12);
    const t = now(), pid = randomBytes(12).toString('hex');
    const state = G.createRoom(name, { code, hostId: pid, roundLimit: body.roundLimit ?? 0 });
    const doc = { schema: 4, creationKey: sha(tokenHash + body.requestId), state, savedAt: t, expiresAt: t + ROOM_LIFETIME_MS, lastBotAt: 0,
      seats: { [pid]: { tokenHash, clientId: body.clientId, lastSeen: t, lastSeq: 0, receipts: [], lastActionAt: 0 } } };
    if (!await repo.create(key, doc)) {
      const r = await repo.read(key);
      requireThat(r?.data.creationKey === doc.creationKey, 'CODE_COLLISION', 'Código ocupado. Tente criar outra sala.', 409);
      return join({ ...body, op: 'join', code }, tokenHash, ip, false);
    }
    return reply(doc, pid, {}, t, { forceState: true });
  }
  async function join(body, tokenHash, ip, doThrottle = true) {
    const name = cleanName(body.name);
    if (doThrottle) await throttle(ip, 'join', 240);
    return transact(body.code, (doc, time) => {
      expirePresence(doc, time);
      let p = doc.state.players.find(p => G.normalizedName(p.name) === G.normalizedName(name));
      if (p) {
        requireThat(!p.removed, 'PLAYER_REMOVED', 'Esse participante foi retirado pelo anfitrião.', 403);
        requireThat(!p.bot, 'NAME_TAKEN', 'Esse nome pertence ao computador.', 409);
        const old = seatFor(doc, p.id);
        requireThat(old.tokenHash === tokenHash || !p.online || time - old.lastSeen >= LEASE_MS,
          'NAME_CONNECTED', 'Esse nome ainda está conectado. Feche a aba anterior ou aguarde até um minuto após a queda.', 409);
        old.tokenHash = tokenHash; old.clientId = body.clientId;
      } else {
        requireThat(['lobby','playing'].includes(doc.state.phase), 'GAME_FINISHED', 'A partida já terminou. Não há entrada de novos jogadores.', 409);
        requireThat(doc.state.players.filter(p=>!p.removed).length < 6, 'ROOM_FULL', 'As seis vagas estão ocupadas. Quem caiu da internet mantém a vaga.', 409);
        requireThat(doc.state.players.length < 100, 'ROOM_HISTORY_FULL', 'Esta sala atingiu o limite de substituições. Inicie outra partida.', 409);
        doc.state = G.join(doc.state, name);
        p = doc.state.players.find(p => G.normalizedName(p.name) === G.normalizedName(name));
        doc.seats[p.id] = { tokenHash, clientId: body.clientId, lastSeen: time, lastSeq: 0, receipts: [], lastActionAt: 0 };
      }
      contact(doc, p.id, time, true);
      return { finish: (d,t) => reply(d, p.id, {}, t, { forceState: true }) };
    });
  }
  async function process(body, tokenHash) {
    return transact(body.code, (doc, time) => {
      const seat = authenticate(doc, body, tokenHash);
      expirePresence(doc, time);
      if (body.op === 'leave') {
        seat.lastSeen = time - LEASE_MS;
        doc.state = G.setOnline(doc.state, body.pid, false, time);
        return { finish: (d,t) => reply(d, body.pid, body, t) };
      }
      contact(doc, body.pid, time);
      advance(doc, time, rng);
      if (body.op === 'sync') return { finish: (d,t) => reply(d, body.pid, body, t) };
      requireThat(body.op === 'action', 'BAD_OPERATION', 'Operação inválida.');
      checkHex(body.requestId, 'Identificador da jogada');
      requireThat(Number.isSafeInteger(body.seq) && body.seq > 0, 'BAD_SEQUENCE', 'Sequência inválida.');
      const prior = seat.receipts.find(r => r.seq === body.seq && r.id === body.requestId);
      if (prior) return { finish: (d,t) => reply(d, body.pid, {}, t, { receipt: prior, forceState: true }) };
      requireThat(body.seq > seat.lastSeq, 'ACTION_OLD', 'Essa jogada já foi processada. A sala será atualizada; não foi cobrada de novo.', 409);
      requireThat(body.seq === seat.lastSeq + 1, 'SYNC_REQUIRED', 'Atualize a sala antes de enviar outra jogada.', 409);
      requireThat(body.action && typeof body.action.type === 'string' && body.action.type.length < 40,
        'BAD_ACTION', 'Jogada inválida.');
      let error = null;
      try {
        const expected = intentValue(doc.state, body.action);
        if (expected != null && body.intent !== expected) throw new Error('A situação dessa jogada mudou. Confira o tabuleiro e tente novamente.');
        if (time - seat.lastActionAt < 100) throw new Error('Aguarde um instante entre as jogadas.');
        doc.state = G.apply(doc.state, body.pid, body.action, time, rng);
      } catch (e) { error = e instanceof Error ? e.message : 'Essa jogada não é permitida.'; }
      seat.lastActionAt = time; seat.lastSeq = body.seq;
      const receipt = { seq: body.seq, id: body.requestId, error, at: time, revision: doc.state.revision };
      seat.receipts.push(receipt); seat.receipts = seat.receipts.slice(-64);
      return { finish: (d,t) => reply(d, body.pid, {}, t, { receipt, forceState: true }) };
    });
  }
  return async function handle(request, requestContext = {}) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && (url.pathname.endsWith('/info') || url.searchParams.get('op') === 'info')) {
        return response({ app: 'metropole', apiVersion: API_VERSION, engineVersion: 31, transport: 'https', storage: storageName,
          maxPlayers: 6, savedOnServer: true, requiresPeerJS: false, leaseMs: LEASE_MS });
      }
      requireThat(request.method === 'POST', 'METHOD_NOT_ALLOWED', 'Use POST.', 405);
      const origin = request.headers.get('origin');
      requireThat(!origin || origin === url.origin, 'BAD_ORIGIN', 'Abra o jogo no endereço oficial desta publicação.', 403);
      requireThat((request.headers.get('content-type') || '').split(';')[0] === 'application/json', 'BAD_CONTENT_TYPE', 'Envie JSON.', 415);
      requireThat(Number(request.headers.get('content-length') || 0) <= LIMIT_BYTES, 'BODY_TOO_LARGE', 'Mensagem muito grande.', 413);
      const bytes = await request.arrayBuffer();
      requireThat(bytes.byteLength <= LIMIT_BYTES, 'BODY_TOO_LARGE', 'Mensagem muito grande.', 413);
      let body; try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new GameError('INVALID_JSON', 'JSON inválido.'); }
      requireThat(body && typeof body === 'object' && !Array.isArray(body), 'INVALID_JSON', 'Objeto inválido.');
      requireThat(body.apiVersion === API_VERSION, 'VERSION_MISMATCH', 'Abra a versão 4.0 no endereço atualizado.', 409);
      const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
      checkHex(token, 'Sessão', 48); checkHex(body.clientId, 'Aba');
      const tokenHash = sha(token);
      if (body.op !== 'create') requireThat(typeof body.code === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(body.code), 'BAD_CODE', 'Use o código de seis caracteres.');
      const ip = requestContext.ip || 'local';
      const result = body.op === 'create' ? await create(body, tokenHash, ip)
        : body.op === 'join' ? await join(body, tokenHash, ip) : await process(body, tokenHash);
      return response(result);
    } catch (e) {
      if (e instanceof GameError) return response({ error: e.message, code: e.code, apiVersion: API_VERSION }, e.status);
      // Never expose storage credentials, stack traces or room documents to visitors.
      return response({ error: 'O servidor não confirmou o salvamento. Seus bens já salvos continuam guardados. Aguarde e use Tentar novamente.',
        code: 'STORAGE_UNAVAILABLE', apiVersion: API_VERSION }, 503);
    }
  };
}
