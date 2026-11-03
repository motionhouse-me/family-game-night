// Game Night — server for Same Brain, Word Bomb and The Imposter.
// Each game keeps its own rooms (its own Blobs store), so codes never mix.
// A room is one blob; every change is read → modify → conditional write
// (onlyIfMatch), retried on conflict. Timers are enforced lazily: whoever
// polls after a deadline moves the game on.
import { getStore } from "@netlify/blobs";
import { SAME_BRAIN, IMPOSTER, BOMB_EASY, BOMB_HARD } from "../../lib/content.js";
import WORDS_RAW from "../../lib/words.js";

const WORDS = new Set(WORDS_RAW.split("\n"));
const GAMES = ["samebrain", "wordbomb", "imposter"];
const STORE = { samebrain: "same-brain-rooms", wordbomb: "word-bomb-rooms", imposter: "imposter-rooms" };

const COLORS = ["#ff7a59", "#ffc83d", "#3ddc97", "#4cc9f0", "#a78bfa", "#ff6fae", "#f4a261", "#2ec4b6",
  "#e76f51", "#90be6d", "#f9844a", "#7aa6ff", "#c77dff", "#ff99c8", "#06d6a0", "#ffd166"];
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_PLAYERS = 30;
const SB_PER_ROUND = 5;
const SB_SECONDS = 20;
const IM_CLUE_SECONDS = 40;
const IM_VOTE_SECONDS = 45;
const WB_GRACE = 700;
const ROOM_TTL = 1000 * 60 * 60 * 24 * 3;
const ROUND_CHOICES = { samebrain: [3, 5, 7, 10], wordbomb: [1, 3, 5, 7], imposter: [3, 5, 7, 10] };
const DEFAULT_ROUNDS = { samebrain: 3, wordbomb: 3, imposter: 5 };

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const token = () => crypto.randomUUID().replace(/-/g, "");
const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const cleanCode = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const roomKey = (code) => `room/${code}`;
const BOARD_KEY = "leaderboard/all-time";
const HISTORY_KEY = "history/used";

// ======================================================================
// Same Brain: answer matching
// ======================================================================
export function normAnswer(s) {
  let t = String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  t = t.replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^(a|an|the|my|some) /, "");
  t = t.replace(/ /g, "");
  if (t.length > 4 && t.endsWith("ies")) t = t.slice(0, -3) + "y";
  else if (t.length > 4 && /(s|x|ch|sh)es$/.test(t)) t = t.slice(0, -2);
  else if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) t = t.slice(0, -1);
  return t;
}
function sbGroups(q) {
  const merges = q.merges || {};
  const root = (k) => { let n = 0; while (merges[k] && n++ < 50) k = merges[k]; return k; };
  const groups = new Map();
  for (const [id, ans] of Object.entries(q.answers || {})) {
    const raw = ans.a;
    if (!raw) continue;
    const own = normAnswer(raw);
    const k = root(own);
    if (!k) continue;
    const pretty = raw.replace(/[!?.,]+$/g, "").replace(/^./, (c) => c.toUpperCase()) || raw;
    if (!groups.has(k)) groups.set(k, { key: k, label: pretty, ids: [], keys: [] });
    const g = groups.get(k);
    g.ids.push(id);
    if (!g.keys.includes(own)) g.keys.push(own);
    if (own === k && normAnswer(g.label) !== k) g.label = pretty;
  }
  return [...groups.values()].sort((a, b) => b.ids.length - a.ids.length || a.label.localeCompare(b.label));
}
const SB_POINTS = 10;
function sbPoints(groups) {
  const pts = {};
  for (const g of groups) for (const id of g.ids) pts[id] = (g.ids.length - 1) * SB_POINTS;
  return pts;
}

// ======================================================================
// Word Bomb helpers
// ======================================================================
const wbAlive = (wb) => wb.order.filter((id) => wb.lives[id] > 0);
function wbNextAfter(wb, id) {
  const n = wb.order.length, start = wb.order.indexOf(id);
  for (let i = 1; i <= n; i++) { const c = wb.order[(start + i) % n]; if (wb.lives[c] > 0) return c; }
  return null;
}
function wbSyllable(wb) {
  const alive = Math.max(1, wbAlive(wb).length);
  const early = wb.turnNo < alive * 2;
  let s;
  for (let i = 0; i < 10; i++) { s = early || Math.random() < 0.55 ? pick(BOMB_EASY) : pick(BOMB_HARD); if (s !== wb.syl) break; }
  return s;
}
function wbTurnMs(wb) {
  const alive = Math.max(1, wbAlive(wb).length);
  return Math.max(6000, 12000 - Math.floor(wb.turnNo / alive) * 1000);
}
function wbFeed(wb, ev) { wb.feed.push(ev); wb.feed = wb.feed.slice(-8); }

// ======================================================================
// Room state helpers
// ======================================================================
const present = (st) => new Set(st.players.map((p) => p.id));
function stat(st, id) { st.stats[id] = st.stats[id] || {}; return st.stats[id]; }
function bump(st, id, field, n = 1) { const s = stat(st, id); s[field] = (s[field] || 0) + n; }
function addPoints(st, id, n) {
  st.scores[id] = (st.scores[id] || 0) + n;
  const r = (st.roundScores[st.round] = st.roundScores[st.round] || {});
  r[id] = (r[id] || 0) + n;
}

function newPlayer(st, name) {
  const used = new Set(st.players.map((p) => p.color));
  const color = COLORS.find((c) => !used.has(c)) || COLORS[st.players.length % COLORS.length];
  const base = clean(name, 16) || "Player";
  let nm = base, n = 2;
  while (st.players.some((p) => p.name.toLowerCase() === nm.toLowerCase())) nm = `${base.slice(0, 13)} ${n++}`;
  const p = { id: token().slice(0, 10), secret: token(), name: nm, color, joined: Date.now() };
  st.players.push(p);
  return p;
}

function voteTally(st) {
  let yes = 0, no = 0;
  const ids = present(st);
  for (const [id, v] of Object.entries(st.votes || {})) { if (!ids.has(id)) continue; v ? yes++ : no++; }
  const total = st.players.length;
  return { yes, no, total, passed: yes > total / 2 };
}

function freshGame(st) {
  st.round = 0; st.scores = {}; st.roundScores = {}; st.stats = {}; st.laughs = {}; st.log = []; st.pairs = {};
  st.votes = {}; st.cur = null; st.recorded = false; st.champions = null; st.phase = "lobby";
  for (const p of st.players) st.scores[p.id] = 0;
}

// ---------- starting a round ----------
function startRound(st, now, usedGlobal) {
  st.round += 1;
  st.votes = {};
  st.roundScores[st.round] = {};
  for (const p of st.players) if (st.scores[p.id] == null) st.scores[p.id] = 0;
  if (st.game === "samebrain") {
    st.cur = { qi: 0, ids: st.players.map((p) => p.id) };
    sbNextPrompt(st, now, usedGlobal);
  } else if (st.game === "wordbomb") {
    const order = shuffle(st.players.map((p) => p.id));
    const lives = {};
    for (const id of order) lives[id] = st.settings.wbLives;
    const wb = { order, lives, startLives: st.settings.wbLives, turnNo: 0, used: [], feed: [], outOrder: [], attempt: null, syl: null, winner: null };
    wb.turn = order[0];
    wb.syl = wbSyllable(wb);
    wb.turnStart = now + 3500;
    wb.deadline = wb.turnStart + wbTurnMs(wb);
    st.cur = wb;
    st.phase = "wb-play";
  } else if (st.game === "imposter") {
    imNewRound(st, now, usedGlobal);
  }
}

function pickFresh(list, keyOf, localUsed, globalUsed) {
  const local = new Set(localUsed);
  let pool = list.filter((x) => !local.has(keyOf(x)) && !(globalUsed && globalUsed[keyOf(x)]));
  if (pool.length < 5) {
    pool = list.filter((x) => !local.has(keyOf(x)));
    if (!pool.length) pool = list;
    if (globalUsed && pool.length > 5) {
      // prefer the ones played longest ago
      pool = shuffle(pool).sort((a, b) => (globalUsed[keyOf(a)] || 0) - (globalUsed[keyOf(b)] || 0)).slice(0, Math.max(5, Math.ceil(pool.length / 3)));
    }
  }
  return pick(pool);
}

function sbNextPrompt(st, now, usedGlobal) {
  const c = st.cur;
  const q = pickFresh(SAME_BRAIN, (x) => x, st.used || [], usedGlobal);
  st.used = [...(st.used || []), q].slice(-600);
  st.newlyUsed = [...(st.newlyUsed || []), q];
  c.qi += 1;
  c.prompt = q;
  c.answers = {};
  c.merges = {};
  c.startedAt = now;
  c.deadline = now + SB_SECONDS * 1000;
  c.ids = st.players.map((p) => p.id);
  st.phase = "sb-answer";
}

function sbFinishPrompt(st) {
  const c = st.cur;
  const groups = sbGroups(c);
  const pts = sbPoints(groups);
  for (const [id, n] of Object.entries(pts)) if (n) addPoints(st, id, n);
  for (const g of groups) {
    if (g.ids.length === 1) bump(st, g.ids[0], "solos");
    else for (const id of g.ids) bump(st, id, "matches", g.ids.length - 1);
    if (g.ids.length > 1 && g.ids.length === groups[0].ids.length) for (const id of g.ids) bump(st, id, "topGroup");
    for (let i = 0; i < g.ids.length; i++) for (let j = i + 1; j < g.ids.length; j++) {
      const k = [g.ids[i], g.ids[j]].sort().join("|");
      st.pairs[k] = (st.pairs[k] || 0) + 1;
    }
  }
  for (const [id, a] of Object.entries(c.answers)) { bump(st, id, "answerMs", Math.max(0, a.t - c.startedAt)); bump(st, id, "answered"); }
  const answers = {};
  for (const [id, a] of Object.entries(c.answers)) answers[id] = a.a;
  st.log.push({ r: st.round, qi: c.qi, prompt: c.prompt, answers });
}

// ---------- Word Bomb ----------
function wbPassTurn(st, fromId, now) {
  const wb = st.cur;
  if (wbCheckOver(st, now)) return;
  wb.turn = wbNextAfter(wb, fromId);
  wb.turnNo += 1;
  wb.syl = wbSyllable(wb);
  wb.turnStart = now;
  wb.deadline = now + wbTurnMs(wb);
}
function wbCheckOver(st, now) {
  const wb = st.cur;
  const alive = wbAlive(wb);
  const over = wb.order.length > 1 ? alive.length <= 1 : alive.length === 0;
  if (!over) return false;
  wb.winner = alive[0] || null;
  if (wb.winner) wb.outOrder.push(wb.winner);
  wb.turn = null;
  // placement points: 10 per player you outlasted, +25 for the last one standing
  const places = [...wb.outOrder].reverse();
  const n = wb.order.length;
  places.forEach((id, i) => {
    let pts = (n - 1 - i) * 10;
    if (i === 0 && wb.winner) { pts += 25; bump(st, id, "roundWins"); }
    if (pts) addPoints(st, id, pts);
  });
  wb.places = places;
  st.phase = "round-end";
  st.votes = {};
  return true;
}
function wbKnockOut(st, id, now) {
  const wb = st.cur;
  if (!wb || !(wb.lives[id] > 0)) return;
  wb.lives[id] = 0;
  wb.outOrder.push(id);
  wbFeed(wb, { t: "out", id, at: now });
}

// ---------- Imposter ----------
function imIds(st) { const p = present(st); return st.cur.ids.filter((id) => p.has(id)); }
function imNewRound(st, now, usedGlobal) {
  const pair = pickFresh(IMPOSTER, (p) => p.join("|"), st.used || [], usedGlobal);
  st.used = [...(st.used || []), pair.join("|")].slice(-600);
  st.newlyUsed = [...(st.newlyUsed || []), pair.join("|")];
  const [common, odd] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
  const ids = st.players.map((p) => p.id);
  st.cur = { common, odd, ids, imposter: pick(ids), clueRound: 1, clues: {}, votes: {}, outcome: null, deadline: now + IM_CLUE_SECONDS * 1000, startedAt: now };
  st.phase = "im-clue";
}
function imReveal(st) {
  const im = st.cur;
  const counts = {};
  for (const [voter, target] of Object.entries(im.votes)) if (voter !== target) counts[target] = (counts[target] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = Object.keys(counts).filter((id) => counts[id] === max);
  const accused = max > 0 && top.length === 1 ? top[0] : null;
  const caught = accused === im.imposter;
  for (const [voter, target] of Object.entries(im.votes)) {
    if (voter === im.imposter) continue;
    if (target === im.imposter) { addPoints(st, voter, 100); bump(st, voter, "rightVotes"); }
    else { bump(st, voter, "wrongVotes"); bump(st, target, "suspected"); }
  }
  if (caught) bump(st, im.imposter, "caught");
  else { addPoints(st, im.imposter, 300); bump(st, im.imposter, "escapes"); }
  im.outcome = { counts, accused, caught };
  st.log.push({ r: st.round, common: im.common, odd: im.odd, imposter: im.imposter, clues: im.clues });
  st.phase = "round-end";
  st.votes = {};
}

// ---------- timers ----------
function advance(st, now) {
  let changed = false;
  if (st.phase === "sb-answer") {
    const c = st.cur, p = present(st);
    const ids = c.ids.filter((id) => p.has(id));
    if ((ids.length && ids.every((id) => c.answers[id])) || now > c.deadline + 800) { st.phase = "sb-reveal"; changed = true; }
  }
  if (st.phase === "wb-play") {
    const wb = st.cur;
    let guard = 0;
    while (st.phase === "wb-play" && now > wb.deadline + WB_GRACE && guard++ < 40) {
      const id = wb.turn;
      wb.lives[id] = Math.max(0, (wb.lives[id] || 0) - 1);
      bump(st, id, "booms");
      wbFeed(wb, { t: "boom", id, syl: wb.syl, at: wb.deadline });
      if (wb.lives[id] === 0) { wb.outOrder.push(id); wbFeed(wb, { t: "out", id, at: wb.deadline }); }
      wbPassTurn(st, id, now);
      changed = true;
    }
  }
  if (st.phase === "im-clue") {
    const im = st.cur, ids = imIds(st);
    if ((ids.length && ids.every((id) => (im.clues[id] || [])[im.clueRound - 1])) || now > im.deadline + 800) {
      st.phase = "im-vote"; im.votes = {}; im.deadline = now + IM_VOTE_SECONDS * 1000; changed = true;
    }
  }
  if (st.phase === "im-vote") {
    const im = st.cur, ids = imIds(st);
    if ((ids.length && ids.every((id) => im.votes[id])) || now > im.deadline + 800) { imReveal(st); changed = true; }
  }
  return changed;
}

function removePlayer(st, id, now) {
  st.players = st.players.filter((p) => p.id !== id);
  if (st.votes) delete st.votes[id];
  if (st.hostId === id && st.players.length) st.hostId = st.players[0].id;
  if (st.phase === "wb-play" && st.cur.lives[id] > 0) {
    const wasTurn = st.cur.turn === id;
    wbKnockOut(st, id, now);
    if (wasTurn) wbPassTurn(st, id, now); else wbCheckOver(st, now);
  }
}

// ---------- awards ----------
function awards(st) {
  const ids = st.players.map((p) => p.id);
  const best = (field, { min = 1, low = false, value } = {}) => {
    let top = null, val = null;
    for (const id of ids) {
      const v = value ? value(id) : (st.stats[id]?.[field] || 0);
      if (v == null || (!low && v < min)) continue;
      if (val == null || (low ? v < val : v > val)) { val = v; top = [id]; }
      else if (v === val) top.push(id);
    }
    return top && top.length <= 3 ? { ids: top, value: val } : null;
  };
  const out = [];
  const add = (emoji, title, res, blurb) => { if (res) out.push({ emoji, title, ids: res.ids, text: blurb(res.value) }); };
  const s = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (st.game === "samebrain") {
    add("🧠", "Hive Mind", best("matches"), (n) => `matched ${n} ${n === 1 ? "person" : "people"} in total`);
    add("🎯", "Crowd Pleaser", best("topGroup"), (n) => `gave the most popular answer ${n}×`);
    add("🐺", "Lone Wolf", best("solos"), (n) => `${s(n, "answer")} nobody else said`);
    const pairs = Object.entries(st.pairs || {}).filter(([k]) => k.split("|").every((id) => ids.includes(id))).sort((a, b) => b[1] - a[1]);
    if (pairs.length && pairs[0][1] >= 2) out.push({ emoji: "👯", title: "Twin Brains", ids: pairs[0][0].split("|"), text: `said the same thing ${pairs[0][1]}×` });
    add("⚡", "Quickest Draw", best(null, { low: true, value: (id) => (st.stats[id]?.answered >= 3 ? Math.round(st.stats[id].answerMs / st.stats[id].answered / 100) / 10 : null) }), (n) => `locked in after ${n}s on average`);
  }
  if (st.game === "wordbomb") {
    add("🏆", "Last One Standing", best("roundWins"), (n) => `won ${s(n, "round")}`);
    add("📚", "Wordsmith", best("words"), (n) => `${s(n, "word")} played`);
    const longest = best(null, { value: (id) => st.stats[id]?.longest?.length || null });
    if (longest) out.push({ emoji: "📏", title: "Longest Word", ids: longest.ids, text: longest.ids.map((id) => st.stats[id].longest.toUpperCase()).join(", ") });
    add("😰", "Clutch Defuser", best("clutch"), (n) => `saved it with under 2s left ${n}×`);
    add("💥", "Bomb Magnet", best("booms"), (n) => `blew up ${n}×`);
  }
  if (st.game === "imposter") {
    add("🔍", "Sherlock", best("rightVotes"), (n) => `caught the imposter ${n}×`);
    add("🎭", "Master of Disguise", best("escapes"), (n) => `got away ${n}× as the imposter`);
    add("🤨", "Most Suspicious", best("suspected"), (n) => `got ${s(n, "vote")} while innocent`);
    add("🙈", "Easily Fooled", best("wrongVotes"), (n) => `voted for the wrong person ${n}×`);
  }
  return out;
}

function hallOfFame(st) {
  const items = [];
  for (const [key, who] of Object.entries(st.laughs || {})) {
    if (!who.length) continue;
    const [kind, r, a, b] = key.split(":");
    if (kind === "sb") {
      const e = st.log.find((x) => x.r === +r && x.qi === +a);
      if (e && e.answers[b]) items.push({ id: b, text: e.answers[b], ctx: e.prompt, n: who.length });
    } else if (kind === "im") {
      const e = st.log.find((x) => x.r === +r);
      const clue = e?.clues?.[a]?.[+b];
      if (clue) items.push({ id: a, text: clue, ctx: `Hint for “${a === e.imposter ? e.odd : e.common}”`, n: who.length });
    }
  }
  return items.sort((x, y) => y.n - x.n).slice(0, 8);
}

// ---------- what each player sees ----------
function view(st, meId, now) {
  const v = {
    now, me: meId, code: st.code, game: st.game, hostId: st.hostId, v: st.v, phase: st.phase,
    settings: st.settings, round: st.round, totalRounds: st.settings.rounds, roundChoices: ROUND_CHOICES[st.game],
    players: st.players.map(({ secret, ...p }) => p),
    scores: st.scores, roundScores: st.roundScores, votes: st.votes, tally: voteTally(st),
  };
  const c = st.cur;
  if (st.game === "samebrain" && c) {
    const out = { qi: c.qi, perRound: SB_PER_ROUND, prompt: c.prompt, deadline: c.deadline, startedAt: c.startedAt, ids: c.ids };
    if (st.phase === "sb-answer") { out.answered = Object.keys(c.answers); out.mine = c.answers[meId]?.a || null; }
    else {
      out.groups = sbGroups(c); out.points = sbPoints(out.groups);
      out.answers = Object.fromEntries(Object.entries(c.answers).map(([id, a]) => [id, a.a]));
    }
    v.sb = out;
  }
  if (st.game === "wordbomb" && c) {
    v.wb = { order: c.order, lives: c.lives, startLives: c.startLives, turn: c.turn, turnNo: c.turnNo, syl: c.syl,
      deadline: c.deadline, turnStart: c.turnStart, feed: c.feed, attempt: c.attempt, usedCount: c.used.length,
      winner: c.winner, lastWords: c.used.slice(-8), places: c.places || null };
  }
  if (st.game === "imposter" && c) {
    const inRound = c.ids.includes(meId);
    const out = { clueRound: c.clueRound, deadline: c.deadline, ids: imIds(st) };
    out.myWord = inRound ? (meId === c.imposter ? c.odd : c.common) : null;
    const clues = {};
    for (const [id, list] of Object.entries(c.clues)) {
      clues[id] = list.map((x, i) => (st.phase === "im-clue" && i === c.clueRound - 1 && id !== meId ? (x ? "•" : null) : x));
    }
    out.clues = clues;
    if (st.phase === "im-vote") { out.voted = Object.keys(c.votes); out.myVote = c.votes[meId] || null; }
    if (st.phase === "round-end" || st.phase === "final") { out.votes = c.votes; out.imposter = c.imposter; out.common = c.common; out.odd = c.odd; out.outcome = c.outcome; }
    v.im = out;
  }
  v.laughs = {};
  for (const [k, who] of Object.entries(st.laughs || {})) v.laughs[k] = { n: who.length, mine: who.includes(meId) };
  if (st.phase === "final") {
    v.awards = awards(st);
    v.hof = hallOfFame(st);
    v.champions = st.champions;
  }
  return v;
}

// ---------- storage ----------
async function mutate(store, code, fn) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const got = await store.getWithMetadata(roomKey(code), { type: "json" });
    if (!got || !got.data) fail(404, "No room with that code");
    const st = got.data;
    const now = Date.now();
    advance(st, now);
    const result = await fn(st, now);
    advance(st, now);
    st.v = (st.v || 0) + 1;
    st.touched = now;
    const used = st.newlyUsed; delete st.newlyUsed;
    const w = await store.setJSON(roomKey(code), st, { onlyIfMatch: got.etag });
    if (w && w.modified === false) { await new Promise((r) => setTimeout(r, 20 + Math.random() * 60 * (attempt + 1))); continue; }
    return { st, result, used };
  }
  fail(503, "Busy — try again");
}

async function casUpdate(store, key, fn, init) {
  for (let i = 0; i < 10; i++) {
    const got = await store.getWithMetadata(key, { type: "json" });
    const data = got?.data || init();
    fn(data);
    const w = got ? await store.setJSON(key, data, { onlyIfMatch: got.etag }) : await store.setJSON(key, data, { onlyIfNew: true });
    if (!w || w.modified !== false) return data;
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 80));
  }
}

async function recordHistory(store, keys) {
  if (!keys?.length) return;
  const now = Date.now();
  await casUpdate(store, HISTORY_KEY, (h) => { for (const k of keys) h[k] = now; }, () => ({})).catch(() => {});
}

async function recordLeaderboard(store, st) {
  const champs = new Set(st.champions || []);
  await casUpdate(store, BOARD_KEY, (b) => {
    b.players = b.players || {};
    for (const p of st.players) {
      const k = p.name.toLowerCase();
      const e = (b.players[k] = b.players[k] || { name: p.name, games: 0, wins: 0, points: 0, best: 0 });
      e.name = p.name;
      e.games += 1;
      if (champs.has(p.id)) e.wins += 1;
      const pts = st.scores[p.id] || 0;
      e.points += pts;
      e.best = Math.max(e.best || 0, pts);
      e.last = Date.now();
    }
    b.gamesPlayed = (b.gamesPlayed || 0) + 1;
  }, () => ({ players: {}, gamesPlayed: 0 })).catch(() => {});
}

// ======================================================================
// handler
// ======================================================================
export default async (req) => {
  const url = new URL(req.url);
  try {
    if (req.method === "GET") {
      const game = url.searchParams.get("game");
      if (!GAMES.includes(game)) return json({ error: "Unknown game" }, 400);
      const store = getStore({ name: STORE[game], consistency: "strong" });
      if (url.searchParams.get("board")) {
        const b = (await store.get(BOARD_KEY, { type: "json" })) || { players: {}, gamesPlayed: 0 };
        const rows = Object.values(b.players).sort((x, y) => y.wins - x.wins || y.points - x.points).slice(0, 25);
        return json({ rows, gamesPlayed: b.gamesPlayed || 0 });
      }
      const code = cleanCode(url.searchParams.get("code"));
      const id = clean(url.searchParams.get("id"), 20);
      const secret = String(url.searchParams.get("secret") || "");
      let st = await store.get(roomKey(code), { type: "json" });
      if (!st) return json({ error: "Room not found" }, 404);
      const me = st.players.find((p) => p.id === id && p.secret === secret);
      if (!me) return json({ error: "Not in this room" }, 403);
      if (advance(structuredClone(st), Date.now())) ({ st } = await mutate(store, code, () => {}));
      return json(view(st, me.id, Date.now()));
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
    const game = body.game;
    if (!GAMES.includes(game)) return json({ error: "Unknown game" }, 400);
    const store = getStore({ name: STORE[game], consistency: "strong" });
    const action = body.action;

    if (action === "create") {
      let code = "";
      for (let tries = 0; tries < 30; tries++) {
        code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
        const existing = await store.get(roomKey(code), { type: "json" });
        if (!existing || Date.now() - (existing.touched || 0) > ROOM_TTL) break;
      }
      const st = { code, game, v: 1, created: Date.now(), touched: Date.now(), hostId: null, players: [],
        settings: { rounds: DEFAULT_ROUNDS[game], wbLives: 2 }, used: [] };
      freshGame(st);
      const host = newPlayer(st, body.name);
      st.hostId = host.id;
      st.scores[host.id] = 0;
      await store.setJSON(roomKey(code), st);
      return json({ code, id: host.id, secret: host.secret, name: host.name });
    }

    const code = cleanCode(body.code);

    if (action === "join") {
      const { result } = await mutate(store, code, (st) => {
        if (st.players.length >= MAX_PLAYERS) fail(409, "Room is full");
        const p = newPlayer(st, body.name);
        if (st.scores[p.id] == null) st.scores[p.id] = 0;
        return p;
      });
      return json({ code, id: result.id, secret: result.secret, name: result.name });
    }

    // site-wide "recently played" list so new rooms keep getting fresh prompts
    const needsHistory = ["start", "sb-next"].includes(action);
    const usedGlobal = needsHistory ? ((await store.get(HISTORY_KEY, { type: "json" }).catch(() => null)) || {}) : null;

    const { st, result, used } = await mutate(store, code, (st, now) => {
      const me = st.players.find((p) => p.id === clean(body.id, 20) && p.secret === body.secret);
      if (!me) fail(403, "Not in this room");
      const isHost = me.id === st.hostId;
      const hostOnly = () => { if (!isHost) fail(403, "Only the host can do that"); };

      switch (action) {
        case "leave": removePlayer(st, me.id, now); return { ok: true };
        case "kick": {
          hostOnly();
          const t = clean(body.target, 20);
          if (!t || t === me.id) fail(400, "You can't remove yourself");
          removePlayer(st, t, now); return { ok: true };
        }
        case "makehost": {
          hostOnly();
          const t = st.players.find((p) => p.id === clean(body.target, 20));
          if (!t) fail(404, "Player not found");
          st.hostId = t.id; return { ok: true };
        }
        case "settings": {
          hostOnly();
          const r = Math.round(Number(body.rounds));
          if (ROUND_CHOICES[st.game].includes(r)) st.settings.rounds = Math.max(r, st.round || 1);
          const l = Math.round(Number(body.wbLives));
          if (l >= 1 && l <= 3) st.settings.wbLives = l;
          return { ok: true };
        }
        case "vote": {
          if (st.phase !== "lobby" && st.phase !== "round-end") fail(409, "Not voting right now");
          st.votes[me.id] = !!body.yes;
          return { ok: true };
        }
        case "start": {
          hostOnly();
          if (st.phase !== "lobby" && st.phase !== "round-end") fail(409, "A round is already running");
          if (st.round >= st.settings.rounds) fail(409, "That was the last round — reveal the champion!");
          if (st.game === "imposter" && st.players.length < 3) fail(409, "The Imposter needs at least 3 players");
          const t = voteTally(st);
          if (!t.passed) fail(409, `Need a majority 👍 first (${t.yes} of ${t.total})`);
          startRound(st, now, usedGlobal);
          return { ok: true };
        }
        case "finish": {
          hostOnly();
          if (st.round < 1) fail(409, "Play at least one round first");
          if (st.phase !== "round-end") fail(409, "Finish this round first");
          const best = Math.max(...st.players.map((p) => st.scores[p.id] || 0));
          st.champions = st.players.filter((p) => (st.scores[p.id] || 0) === best).map((p) => p.id);
          st.phase = "final";
          const record = !st.recorded;
          st.recorded = true;
          return { ok: true, record };
        }
        case "newgame": { hostOnly(); freshGame(st); return { ok: true }; }
        case "laugh": {
          const key = clean(body.key, 60);
          if (!/^(sb:\d+:\d+:[a-z0-9]+|im:\d+:[a-z0-9]+:\d)$/.test(key)) fail(400, "Bad reference");
          const set = new Set(st.laughs[key] || []);
          body.on ? set.add(me.id) : set.delete(me.id);
          st.laughs[key] = [...set];
          if (!st.laughs[key].length) delete st.laughs[key];
          return { ok: true };
        }

        // ----- Same Brain -----
        case "sb-answer": {
          if (st.phase !== "sb-answer") fail(409, "Too late — answers are in");
          if (Number(body.qi) !== st.cur.qi) fail(409, "That question is over");
          const a = clean(body.answer, 40);
          if (!a) fail(400, "Type an answer first");
          st.cur.answers[me.id] = { a, t: now };
          return { ok: true };
        }
        case "sb-reveal": { hostOnly(); if (st.phase === "sb-answer") st.phase = "sb-reveal"; return { ok: true }; }
        case "sb-merge": {
          hostOnly();
          if (st.phase !== "sb-reveal") fail(409, "Only after the reveal");
          const from = String(body.from || ""), to = String(body.to || "");
          if (!from || !to || from === to) fail(400, "Pick two different answers");
          st.cur.merges[from] = to; return { ok: true };
        }
        case "sb-unmerge": { hostOnly(); if (st.phase === "sb-reveal") st.cur.merges = {}; return { ok: true }; }
        case "sb-next": {
          hostOnly();
          if (st.phase !== "sb-reveal") fail(409, "Wait for the reveal");
          if (Number(body.qi) !== st.cur.qi) return { ok: true };
          sbFinishPrompt(st);
          if (st.cur.qi >= SB_PER_ROUND) { st.phase = "round-end"; st.votes = {}; }
          else sbNextPrompt(st, now, usedGlobal);
          return { ok: true };
        }

        // ----- Word Bomb -----
        case "wb-word": {
          if (st.phase !== "wb-play") fail(409, "The round is over");
          const wb = st.cur;
          if (wb.turn !== me.id) fail(409, "Not your turn");
          if (now < wb.turnStart) fail(409, "Wait for it…");
          const word = String(body.word || "").toLowerCase().replace(/[^a-z]/g, "");
          let reason = null;
          if (word.length < 3) reason = "Too short";
          else if (!word.includes(wb.syl.toLowerCase())) reason = `Needs "${wb.syl}"`;
          else if (wb.used.includes(word)) reason = "Already used";
          else if (!WORDS.has(word)) reason = "Not a word";
          wb.attempt = { id: me.id, word, ok: !reason, reason, at: now, turnNo: wb.turnNo };
          if (reason) return { ok: false, reason };
          wb.used.push(word);
          bump(st, me.id, "words");
          addPoints(st, me.id, 2);
          const s = stat(st, me.id);
          if (!s.longest || word.length > s.longest.length) s.longest = word;
          if (wb.deadline - now < 2000) bump(st, me.id, "clutch");
          wbFeed(wb, { t: "word", id: me.id, word, syl: wb.syl, at: now });
          wbPassTurn(st, me.id, now);
          return { ok: true };
        }

        // ----- The Imposter -----
        case "im-clue": {
          if (st.phase !== "im-clue") fail(409, "Clue time is over");
          const im = st.cur;
          if (!im.ids.includes(me.id)) fail(409, "You'll join next round");
          const clue = clean(body.clue, 24);
          if (!clue) fail(400, "Type a hint first");
          const word = me.id === im.imposter ? im.odd : im.common;
          const n = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
          if (n(clue).includes(n(word)) || (n(clue).length >= 3 && n(word).includes(n(clue)))) fail(400, "No saying the word!");
          im.clues[me.id] = im.clues[me.id] || [];
          im.clues[me.id][im.clueRound - 1] = clue;
          return { ok: true };
        }
        case "im-vote": {
          if (st.phase !== "im-vote") fail(409, "Voting is closed");
          const im = st.cur;
          if (!im.ids.includes(me.id)) fail(409, "You'll join next round");
          const t = clean(body.target, 20);
          if (!im.ids.includes(t)) fail(400, "Pick someone in this round");
          if (t === me.id) fail(400, "You can't vote for yourself");
          im.votes[me.id] = t; return { ok: true };
        }
        case "im-more": {
          hostOnly();
          if (st.phase !== "im-vote") fail(409, "Only during voting");
          if (st.cur.clueRound >= 3) fail(409, "Three hint rounds max — time to vote!");
          st.cur.clueRound += 1; st.cur.votes = {}; st.cur.deadline = now + IM_CLUE_SECONDS * 1000; st.phase = "im-clue";
          return { ok: true };
        }
        case "im-skip": {
          hostOnly();
          if (st.phase === "im-clue") { st.phase = "im-vote"; st.cur.votes = {}; st.cur.deadline = now + IM_VOTE_SECONDS * 1000; }
          else if (st.phase === "im-vote") imReveal(st);
          return { ok: true };
        }
        default: fail(400, "Unknown action");
      }
    });

    if (used?.length) await recordHistory(store, used);
    if (action === "finish" && result?.record) await recordLeaderboard(store, st);
    const meId = clean(body.id, 20);
    return json({ ...(result || {}), state: st.players.some((p) => p.id === meId) ? view(st, meId, Date.now()) : null });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Something went wrong — try again" }, 500);
  }
};

export const config = { path: "/api/night" };
