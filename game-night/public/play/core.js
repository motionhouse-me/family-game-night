// Game Night — shared engine: rooms, lobby, round votes, scoreboards, champion, awards, leaderboard.
// Each game page loads this, then its own game.js which calls GN.start({...}).
window.GN = (() => {
  const API = "/api/night";
  const GAMES = {
    samebrain: { name: "Same Brain", emoji: "🧠", path: "/same-brain/" },
    wordbomb: { name: "Word Bomb", emoji: "💣", path: "/word-bomb/" },
    imposter: { name: "The Imposter", emoji: "🕵️", path: "/imposter/" },
    farout: { name: "Far Out", emoji: "🪐", path: "/far-out/" },
  };
  let D; // the game definition
  const app = () => document.getElementById("app");

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  let toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }
  function flash(html, ms = 1000) {
    const el = document.createElement("div"); el.className = "flashmsg"; el.innerHTML = `<div>${html}</div>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), ms);
  }
  function confetti(n = 120) {
    const colors = D.confetti || ["#ffd166", "#ff6b9d", "#5ce1e6", "#7cf29a", "#9b8cff"];
    const box = document.createElement("div"); box.className = "confetti";
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = 1.8 + Math.random() * 2 + "s";
      c.style.animationDelay = Math.random() * .6 + "s";
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(c);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 5000);
  }
  const set = (sel, html) => { const el = typeof sel === "string" ? document.querySelector(sel) : sel; if (el && el._h !== html) { el._h = html; el.innerHTML = html; } return el; };
  const show = (sel, on) => { const el = document.querySelector(sel); if (el) el.classList.toggle("hidden", !on); };

  class ApiError extends Error { constructor(m, s) { super(m); this.status = s; } }
  async function post(body) {
    const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game: D.key, ...body }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || "Something went wrong", res.status);
    return data;
  }
  async function act(action, extra = {}) {
    const data = await post({ action, code: session.code, id: session.id, secret: session.secret, ...extra });
    if (data.state) apply(data.state);
    return data;
  }
  const tryAct = async (action, extra) => { try { return await act(action, extra); } catch (e) { toast(e.message); return null; } };

  // ---------- session ----------
  let session = null, state = null, skew = 0, pollTimer = null, curKey = "";
  const KEY = () => "gn:session"; // one room, all three games
  const now = () => Date.now() + skew;
  const player = (id) => state?.players.find((p) => p.id === id);
  const nameOf = (id) => player(id)?.name || "Someone";
  const isHost = () => !!state && state.hostId === session?.id;
  const dot = (p) => p ? `<span class="dot" style="background:${p.color}">${esc((p.name[0] || "?").toUpperCase())}</span>` : "";
  const pill = (p, cls = "", extra = "") => p ? `<span class="pl ${cls}" data-id="${p.id}">${dot(p)}${esc(p.name)}${extra}</span>` : "";
  const mini = (p) => p ? `<span class="mini">${dot(p)}${esc(p.name)}</span>` : "";
  const W = (k, d) => (D.words && D.words[k]) || d;
  function laughBtn(key) {
    const l = state?.laughs?.[key];
    return `<button class="laugh ${l?.mine ? "on" : ""}" data-laugh="${esc(key)}">😂${l?.n ? " " + l.n : ""}</button>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-laugh]"); if (!b || !session) return;
    e.stopPropagation();
    const key = b.dataset.laugh, on = !b.classList.contains("on");
    b.classList.toggle("on", on);
    tryAct("laugh", { key, on });
  }, true);

  // ---------- home ----------
  function renderHome(prefill = "") {
    stopPolling(); state = null; curKey = "home";
    const name = store.get("gn:name", "");
    app().innerHTML = `
      <div class="topbar"><a class="back" href="/">← All games</a></div>
      <section class="hero">${D.heroArt || ""}
        <div class="kicker">${D.kicker}</div>
        <h1 class="logo">${D.logo}</h1>
        <p class="tagline">${D.tag}</p>
      </section>
      ${session ? `<div class="card"><h2>You're in ${W("room", "room")} ${esc(session.code)}</h2><div class="row"><button class="btn" id="rejoin">Rejoin</button><button class="ghost" id="forget">Leave it</button></div></div>` : ""}
      <div class="card">
        <label class="lbl" for="nm">Your name</label>
        <input class="txt" id="nm" maxlength="16" autocomplete="nickname" placeholder="e.g. Qabas" value="${esc(name)}">
        <div style="height:12px"></div>
        <button class="btn" id="create">${W("create", "Create a room")}</button>
        <div class="or">or join the family</div>
        <div class="row">
          <input class="txt code" id="code" maxlength="4" placeholder="CODE" value="${esc(prefill)}" autocapitalize="characters" autocomplete="off">
          <button class="ghost" id="join" style="flex:.6">Join</button>
        </div>
      </div>
      <div class="card how"><h2>${W("howTitle", "How to play")}</h2>${D.how.map((h) => `<p>${h}</p>`).join("")}
        <p class="small" style="margin-top:12px">${D.min}–30 players · everyone on their own phone</p></div>`;
    const nm = document.getElementById("nm"), code = document.getElementById("code");
    const rj = document.getElementById("rejoin");
    if (rj) {
      rj.onclick = () => { history.replaceState(null, "", `?room=${session.code}`); enterRoom(); };
      document.getElementById("forget").onclick = async () => { try { await act("leave"); } catch {} store.del(KEY()); session = null; renderHome(); };
    }
    const getName = () => { const n = nm.value.trim(); if (!n) { toast("Type your name first"); nm.focus(); return null; } store.set("gn:name", n); return n; };
    document.getElementById("create").onclick = async (e) => {
      const n = getName(); if (!n) return;
      e.target.disabled = true;
      try { startSession(await post({ action: "create", name: n })); } catch (err) { toast(err.message); e.target.disabled = false; }
    };
    const join = async () => {
      const n = getName(); if (!n) return;
      const c = code.value.trim().toUpperCase();
      if (c.length !== 4) { toast("Codes are 4 letters"); code.focus(); return; }
      try { startSession(await post({ action: "join", name: n, code: c })); } catch (err) { toast(err.status === 404 ? "No room with that code" : err.message); }
    };
    document.getElementById("join").onclick = join;
    code.onkeydown = (e) => { if (e.key === "Enter") join(); };
  }

  async function loadBoardUnused(sel, limit = 10) {
    try {
      const r = await fetch(`${API}?game=${D.key}&board=1`, { cache: "no-store" }).then((x) => x.json());
      const rows = (r.rows || []).slice(0, limit);
      set(sel, rows.length
        ? `<ol class="board">${rows.map((e, i) => `<li class="${i === 0 ? "first" : ""}"><span class="rk">${i === 0 ? "👑" : i + 1}</span><span class="nm">${esc(e.name)}<small>${e.games} game${e.games === 1 ? "" : "s"} · best ${e.best}</small></span><span class="sc">${e.wins}<small>win${e.wins === 1 ? "" : "s"}</small></span></li>`).join("")}</ol>
           <p class="muted small" style="margin-top:8px">${r.gamesPlayed} game${r.gamesPlayed === 1 ? "" : "s"} played so far.</p>`
        : `<p class="muted small">No games finished yet. Win the first one and your name goes here!</p>`);
    } catch { set(sel, `<p class="muted small">Couldn't load the leaderboard.</p>`); }
  }

  function startSession(r) {
    session = { code: r.code, id: r.id, secret: r.secret, name: r.name };
    store.set(KEY(), session);
    history.replaceState(null, "", `?room=${r.code}`);
    enterRoom();
  }
  function leaveLocal(msg) {
    store.del(KEY());
    session = null;
    history.replaceState(null, "", location.pathname);
    if (msg) toast(msg);
    renderHome();
  }

  // ---------- polling ----------
  function stopPolling() { clearTimeout(pollTimer); pollTimer = null; }
  function schedule() {
    stopPolling();
    if (!session || leaving) return;
    let ms = D.fastPhases?.includes(state?.phase) ? 500 : 1500;
    if (document.hidden) ms = 5000;
    pollTimer = setTimeout(refresh, ms);
  }
  async function refresh() {
    if (!session) return;
    try {
      const res = await fetch(`${API}?game=${D.key}&code=${session.code}&id=${encodeURIComponent(session.id)}&secret=${encodeURIComponent(session.secret)}`, { cache: "no-store" });
      if (res.status === 403) return leaveLocal("You're no longer in that room");
      if (res.status === 404) return leaveLocal("That room has closed");
      if (res.ok) apply(await res.json());
    } catch {}
    schedule();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && session) refresh(); });
  function enterRoom() {
    app().innerHTML = `<div class="center muted" style="margin-top:40vh">${W("joining", "Joining…")}</div>`;
    curKey = "";
    refresh();
  }
  function apply(s) {
    if (!session) return;
    if (state && s.v < state.v) return; // older than what we have
    skew = s.now - Date.now();
    if (s.game === "farout") { state = s; renderFarOut(s); return; }
    if (s.game !== D.key && GAMES[s.game]) { stopPolling(); session && (location.href = `${GAMES[s.game].path}?room=${s.code}`); session = null; return; }
    const prevPhase = state?.phase;
    state = s;
    render(prevPhase);
  }

  // ---------- frame ----------
  function render(prevPhase) {
    const s = state;
    const key = `${s.phase}:${s.round}:${D.phaseKey ? D.phaseKey(s) : ""}`;
    const fresh = key !== curKey;
    if (fresh) {
      curKey = key;
      app().innerHTML = `
        <div class="topbar">
          <a class="back" href="/">← Games</a><span class="spacer"></span>
          <span class="chip" title="Room code">${esc(s.code)}</span>
          <button class="iconbtn hidden" id="menubtn">Host ⋯</button>
          <button class="iconbtn" id="leavebtn">Leave</button>
        </div>
        <div id="view"></div>`;
      document.getElementById("leavebtn").onclick = () => sheet("Leave this room?", [["Leave", async () => { try { await act("leave"); } catch {} leaveLocal(); }]]);
      document.getElementById("menubtn").onclick = () => sheet("Host controls", [
        ["End the game now (show champion)", async () => { if (state.phase !== "round-end") { toast("Finish this round first"); return; } await tryAct("finish"); }],
        ["Back to lobby (new game)", () => tryAct("newgame")],
      ]);
    }
    show("#menubtn", isHost() && s.phase !== "lobby" && s.phase !== "final");
    const view = document.getElementById("view");
    if (s.phase === "lobby") renderLobby(view, fresh, s);
    else if (s.phase === "round-end") renderRoundEnd(view, fresh, s);
    else if (s.phase === "final") renderFinal(view, fresh, s, prevPhase);
    else if (D.screens[s.phase]) D.screens[s.phase](view, fresh, s);
    tick();
  }

  function sheet(title, actions) {
    const el = document.createElement("div");
    el.className = "sheet";
    el.innerHTML = `<div class="panel"><h2>${esc(title)}</h2><div class="stack">${actions.map((a, i) => `<button class="${i === 0 ? "btn" : "ghost"}" data-i="${i}">${esc(a[0])}</button>`).join("")}<button class="ghost" data-x>Cancel</button></div></div>`;
    el.onclick = (e) => {
      if (e.target === el || e.target.dataset.x !== undefined) return el.remove();
      const i = e.target.dataset.i;
      if (i !== undefined) { el.remove(); actions[+i][1](); }
    };
    document.body.appendChild(el);
  }

  // scoreboard: rows [{id, val, sub}]
  function boardHtml(rows, fmt = (r) => r.val, sub) {
    if (!rows.length) return `<p class="muted small">No scores yet.</p>`;
    let rank = 0, last = null;
    return `<ol class="board">${rows.map((r, i) => {
      if (r.val !== last) { rank = i + 1; last = r.val; }
      const p = player(r.id);
      return `<li class="${rank === 1 ? "first" : ""} ${r.id === session.id ? "me" : ""}"><span class="rk">${rank}</span>${dot(p)}<span class="nm">${esc(p?.name || "—")}${sub ? `<small>${sub(r)}</small>` : ""}</span><span class="sc">${fmt(r)}</span></li>`;
    }).join("")}</ol>`;
  }
  const totals = (extra = {}) => state.players.map((p) => ({ id: p.id, val: (state.scores[p.id] || 0) + (extra[p.id] || 0), add: extra[p.id] || 0 })).sort((a, b) => b.val - a.val);

  // ---------- vote ----------
  function voteHtml(s) {
    const t = s.tally, mine = s.votes[session.id];
    const next = s.round + 1;
    const need = Math.floor(t.total / 2) + 1;
    const msg = t.passed ? `✅ Majority says go! ${isHost() ? "Start when you're ready." : `Waiting for ${esc(nameOf(s.hostId))} to start.`}`
      : t.no >= need ? "🚫 Majority said not yet. Change your vote when you're ready."
      : `${t.yes} of ${t.total} said yes · need ${need}`;
    return `<div class="card">
      <h2>${W("voteTitle", "Ready for round")} ${next}?</h2>
      <div class="votebtns"><button class="votebtn yes ${mine === true ? "on" : ""}" data-vote="1">👍 Yes</button><button class="votebtn no ${mine === false ? "on" : ""}" data-vote="0">👎 Not yet</button></div>
      <p class="votemsg">${msg}</p>
      <div class="players" style="margin-top:12px">${s.players.map((p) => pill(p, "", ` ${s.votes[p.id] === true ? "👍" : s.votes[p.id] === false ? "👎" : "…"}`)).join("")}</div>
    </div>`;
  }
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-vote]"); if (!v || !session) return;
    const yes = v.dataset.vote === "1";
    state.votes[session.id] = yes; render();
    tryAct("vote", { yes });
  });

  // ---------- room leaderboard + game switcher ----------
  function roomBoardCard(s) {
    const rows = (s.roomBoard || []).filter((r) => r.games > 0);
    const hist = (s.history || []).slice(-6).reverse();
    return `<div class="card mt"><h2>${W("roomBoard", "🏆 Room leaderboard")}</h2>
      ${rows.length ? `<ol class="board">${rows.map((r, i) => {
        const medals = Object.entries(r.byGame || {}).map(([g, n]) => `${GAMES[g]?.emoji || ""}${n > 1 ? "×" + n : ""}`).join(" ");
        return `<li class="${i === 0 && r.wins ? "first" : ""} ${r.id === session.id ? "me" : ""}"><span class="rk">${i === 0 && r.wins ? "👑" : i + 1}</span><span class="dot" style="background:${r.color}">${esc((r.name[0] || "?").toUpperCase())}</span><span class="nm">${esc(r.name)}<small>${r.games} game${r.games === 1 ? "" : "s"}${medals ? " · " + medals : ""}</small></span><span class="sc">${r.wins}<small>win${r.wins === 1 ? "" : "s"}</small></span></li>`;
      }).join("")}</ol>
      ${hist.length ? `<p class="muted small" style="margin-top:10px">Recent: ${hist.map((h) => `${GAMES[h.game]?.emoji || ""} ${esc(h.champions.join(" & "))}`).join(" · ")}</p>` : ""}`
      : `<p class="muted small">No games finished in this room yet. The first champion goes here!</p>`}</div>`;
  }
  function switcher() {
    return `<div class="gswitch">${Object.entries(GAMES).map(([k, g]) => `<button class="gpick ${k === D.key ? "on" : ""}" data-switch="${k}"><span class="e">${g.emoji}</span>${g.name}</button>`).join("")}</div>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-switch]"); if (!b || !session || !isHost()) return;
    const to = b.dataset.switch;
    if (to === D.key && state?.game !== "farout") return;
    sheet(`Switch everyone to ${GAMES[to].name}?`, [[`Yes, play ${GAMES[to].name} ${GAMES[to].emoji}`, () => (to === "farout" ? switchToFarOut() : tryAct("switch", { to }))]]);
  });

  // ---------- Far Out: its own server, joined automatically for everyone in the room ----------
  async function farOutApi(body) {
    const res = await fetch("/api/far-out", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || "Far Out didn't answer", res.status);
    return data;
  }
  let leaving = false;
  function goFarOutPage(code) {
    if (leaving) return;
    leaving = true;
    store.set("gn:foSent", code);
    stopPolling();
    location.href = `/far-out/?room=${code}`;
  }
  async function switchToFarOut() {
    try {
      const r = await farOutApi({ action: "create", name: session.name });
      store.set("farout:session", { code: r.code, id: r.id, secret: r.secret });
      store.set("farout:name", session.name);
      store.set("gn:foSent", r.code); // so the state update doesn't send us twice
      await act("switch", { to: "farout", foCode: r.code });
      goFarOutPage(r.code);
    } catch (e) { toast(e.message); }
  }
  async function joinFarOut(code) {
    const fo = store.get("farout:session");
    if (!fo || fo.code !== code) {
      const r = await farOutApi({ action: "join", code, name: session.name });
      store.set("farout:session", { code: r.code, id: r.id, secret: r.secret });
      store.set("farout:name", session.name);
    }
    goFarOutPage(code);
  }
  function renderFarOut(s) {
    const code = s.farOut?.code;
    if (code && store.get("gn:foSent") !== code) {
      app().innerHTML = `<div class="center muted" style="margin-top:40vh">🪐 Taking you to Far Out…</div>`;
      curKey = "farout-go";
      joinFarOut(code).catch((e) => { toast(e.message); store.set("gn:foSent", code); renderFarOut(state); });
      return;
    }
    if (curKey !== "farout") {
      curKey = "farout";
      app().innerHTML = `
        <div class="topbar"><a class="back" href="/">← Games</a><span class="spacer"></span><span class="chip">${esc(s.code)}</span><button class="iconbtn" id="leavebtn">Leave</button></div>
        <section class="hero"><div class="logo" style="font-size:64px">🪐</div><div class="kicker">Room ${esc(s.code)}</div><h1 class="logo" style="font-size:40px">Playing Far Out</h1>
          <p class="tagline">The room is on Far Out right now.</p></section>
        <button class="btn" id="gofo">Go to Far Out 🚀</button>
        <div id="fohost"></div><div id="foboard"></div>`;
      document.getElementById("gofo").onclick = () => joinFarOut(code).catch((e) => toast(e.message));
      document.getElementById("leavebtn").onclick = () => sheet("Leave this room?", [["Leave", async () => { try { await act("leave"); } catch {} leaveLocal(); }]]);
    }
    set("#fohost", isHost() ? `<div class="card mt"><h2>Done with Far Out? Switch game</h2>${switcher()}<p class="muted small" style="margin-top:8px">Everyone in the room comes with you.</p></div>` : `<p class="muted center mt">When ${esc(nameOf(s.hostId))} picks the next game, you'll move automatically.</p>`);
    set("#foboard", roomBoardCard(s));
  }

  // ---------- lobby ----------
  function renderLobby(view, fresh, s) {
    if (fresh) {
      view.innerHTML = `
        <section class="hero lobbyhero">${D.lobbyArt || ""}
          <div class="kicker">${W("roomLabel", "Room code")}</div>
          <div class="roomcode">${esc(s.code)}</div>
          <button class="ghost small" id="invite">${W("invite", "Share invite link")}</button>
        </section>
        <div class="card"><h2 id="pcount"></h2><div class="players" id="plist"></div><p class="muted small" id="hosthint" style="margin-top:10px"></p></div>
        <div class="card"><h2>Game</h2><div id="gswitch"></div><p class="muted small" id="gswitchhint" style="margin-top:8px"></p></div>
        <div class="card"><h2>${W("settingsTitle", "Game settings")}</h2><div id="gsettings"></div></div>
        <div id="lvote"></div>
        <div id="startarea"></div>
        <div id="roomboard"></div>
        <div class="card how mt"><h2>${W("howTitle", "How to play")}</h2>${D.how.map((h) => `<p>${h}</p>`).join("")}</div>`;
      document.getElementById("invite").onclick = async () => {
        const url = `${location.origin}${location.pathname}?room=${s.code}`;
        const text = `Join our Game Night room! Code ${s.code}`;
        try { if (navigator.share) { await navigator.share({ title: D.name, text, url }); return; } } catch { return; }
        try { await navigator.clipboard.writeText(`${text}: ${url}`); toast("Invite link copied!"); } catch { toast(url); }
      };
      view.querySelector("#plist").onclick = (e) => {
        const el = e.target.closest(".pl"); if (!el || !isHost()) return;
        const id = el.dataset.id; if (id === session.id) return;
        sheet(nameOf(id), [["Make host", () => tryAct("makehost", { target: id })], ["Remove from room", () => tryAct("kick", { target: id })]]);
      };
      document.getElementById("gsettings").onclick = (e) => {
        const b = e.target.closest("[data-k]"); if (!b || !isHost()) return;
        tryAct("settings", { ...state.settings, [b.dataset.k]: +b.dataset.v });
      };
    }
    set("#pcount", `${W("players", "Players")} · ${s.players.length}`);
    set("#plist", s.players.map((p) => pill(p, `${p.id === session.id ? "me" : ""} ${isHost() ? "tap" : ""}`, p.id === s.hostId ? " 👑" : "")).join(""));
    set("#hosthint", isHost() ? "You're the host. Tap someone to remove them or hand over host." : `${esc(nameOf(s.hostId))} is the host.`);
    let st = segHtml(W("roundsLabel", "Rounds"), "rounds", s.roundChoices, s.settings.rounds, (n) => `${n}`);
    for (const x of D.extraSettings || []) st += segHtml(x.label, x.key, x.opts, s.settings[x.key], x.fmt);
    st += `<p class="muted small" style="margin-top:10px">${D.roundInfo(s.settings)}</p>`;
    set("#gsettings", st);
    set("#lvote", voteHtml(s));
    set("#gswitch", isHost() ? switcher() : `<p><b>${GAMES[D.key].emoji} ${esc(D.name)}</b></p>`);
    set("#gswitchhint", isHost() ? "Tap a game to switch. Everyone stays in the room, no new code needed." : `${esc(nameOf(s.hostId))} picks the game. You'll move with the room automatically.`);
    set("#roomboard", roomBoardCard(s));
    const enough = s.players.length >= D.min;
    set("#startarea", isHost()
      ? `<button class="btn" id="startbtn" ${enough && s.tally.passed ? "" : "disabled"}>${W("startBtn", "Start")} 🚀</button>${enough ? "" : `<p class="muted small center" style="margin-top:8px">Needs at least ${D.min} players</p>`}`
      : "");
    const b = document.getElementById("startbtn");
    if (b) b.onclick = () => { b.disabled = true; tryAct("start").then(() => { b.disabled = false; }); };
  }
  function segHtml(label, key, opts, cur, fmt = (n) => n) {
    if (!isHost()) return `<p class="small" style="margin-top:10px"><span class="muted">${label}:</span> <b>${fmt(cur)}</b></p>`;
    return `<div style="margin-top:10px"><label class="lbl">${label}</label><div class="seg">${opts.map((o) => `<button data-k="${key}" data-v="${o}" class="${o === cur ? "on" : ""}">${fmt(o)}</button>`).join("")}</div></div>`;
  }

  // ---------- between rounds ----------
  function renderRoundEnd(view, fresh, s) {
    const last = s.round >= s.totalRounds;
    if (fresh) {
      view.innerHTML = `
        <div id="recap"></div>
        <div class="card"><h2>${W("standings", "Standings")} · ${W("roundWord", "Round")} ${s.round} of ${s.totalRounds}</h2><div id="board"></div></div>
        <div id="rvote"></div>
        <div id="rnext"></div>`;
      if (D.onRoundEnd) D.onRoundEnd(s);
    }
    set("#recap", D.recap(s));
    const rs = s.roundScores[s.round] || {};
    set("#board", boardHtml(totals(), (r) => `${r.val}`, (r) => (rs[r.id] ? `+${rs[r.id]} this round` : "")));
    set("#rvote", last ? "" : voteHtml(s));
    if (isHost()) {
      set("#rnext", last
        ? `<button class="btn" id="fin">${W("revealChamp", "Reveal the champion 🏆")}</button>`
        : `<div class="stack"><button class="btn" id="nextr" ${s.tally.passed ? "" : "disabled"}>${W("nextRound", "Next round")} →</button><button class="ghost" id="fin">End early & crown the champion</button></div>`);
      const n = document.getElementById("nextr"), f = document.getElementById("fin");
      if (n) n.onclick = () => { n.disabled = true; tryAct("start").then(() => { n.disabled = false; }); };
      if (f) f.onclick = () => { f.disabled = true; tryAct("finish"); };
    } else set("#rnext", last ? `<p class="muted center">That was the last round! Waiting for ${esc(nameOf(s.hostId))} to reveal the champion…</p>` : "");
    if (D.afterRoundEnd) D.afterRoundEnd(s);
  }

  // ---------- final ----------
  function renderFinal(view, fresh, s, prevPhase) {
    if (!fresh && view.childElementCount) { const a = document.getElementById("again"); if (a || !isHost()) return; }
    const champs = (s.champions || []).map(nameOf);
    const rounds = Object.keys(s.roundScores).map(Number).sort((a, b) => a - b);
    const rows = totals();
    view.innerHTML = `
      <section class="champ">${D.champArt || `<div class="tro">🏆</div>`}
        <div class="muted" style="margin-top:8px">${champs.length > 1 ? "It's a tie between" : W("champLabel", "Your champion")}</div>
        <div class="who">${esc(champs.join(" & "))}</div>
        <div class="muted">${rows[0]?.val ?? 0} ${W("pointsWord", "points")} · ${rounds.length} round${rounds.length === 1 ? "" : "s"}</div>
      </section>
      <div class="card mt">${boardHtml(rows, (r) => `${r.val}`, (r) => rounds.map((x) => `R${x} ${(s.roundScores[x] || {})[r.id] || 0}`).join(" · "))}</div>
      ${s.awards?.length ? `<h2 class="mt">${W("awardsTitle", "Awards")}</h2><div class="awards">${s.awards.map((a) => `<div class="award"><div class="e">${a.emoji}</div><div><div class="t">${esc(a.title)}</div><div class="w">${esc(a.ids.map(nameOf).join(" & "))}</div><div class="x">${esc(a.text)}</div></div></div>`).join("")}</div>` : ""}
      ${s.hof?.length ? `<h2 class="mt">😂 Hall of fame</h2><div class="hof">${s.hof.map((h) => `<div class="item"><div class="ctx">${esc(h.ctx)}</div><div class="txt">“${esc(h.text)}”</div><div class="muted small">— ${esc(nameOf(h.id))} · 😂 ${h.n}</div></div>`).join("")}</div>` : ""}
      ${roomBoardCard(s)}
      ${isHost() ? `<div class="stack"><button class="btn" id="again">Play ${esc(D.name)} again 🔁</button><div class="card" style="margin-top:12px"><h2>Or switch game · everyone stays in the room</h2>${switcher()}</div></div>` : `<p class="muted center">Waiting for ${esc(nameOf(s.hostId))} to pick what's next…</p>`}`;
    const a = document.getElementById("again");
    if (a) a.onclick = () => tryAct("newgame");
    if (fresh && prevPhase && prevPhase !== "final") { confetti(); if ((s.champions || []).includes(session.id)) vibrate([80, 40, 80, 40, 200]); }
  }

  // ---------- timers ----------
  function tick() {
    if (!state) return;
    const t = now();
    const tm = D.timer && D.timer(state);
    const bar = document.querySelector("#bar");
    if (bar && tm) {
      const left = Math.max(0, tm.end - t), frac = Math.min(1, left / (tm.end - tm.start));
      bar.firstElementChild.style.width = (frac * 100) + "%";
      bar.classList.toggle("low", left < 5000);
      const secs = document.querySelector("#secs"); if (secs) secs.textContent = Math.ceil(left / 1000) + "s";
    }
    if (D.tick) D.tick(t, state);
  }
  setInterval(tick, 100);

  function start(def) {
    D = def;
    document.body.dataset.game = def.key;
    session = store.get(KEY());
    const urlRoom = (new URLSearchParams(location.search).get("room") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (session && urlRoom === session.code) enterRoom();
    else renderHome(urlRoom);
  }

  return {
    refreshNow: async () => { await refresh(); },
    start, esc, set, show, toast, flash, confetti, vibrate, act, tryAct, sheet, boardHtml, totals, laughBtn,
    player, nameOf, isHost, dot, pill, mini, now, render: () => render(),
    get state() { return state; }, get me() { return session?.id; },
  };
})();
