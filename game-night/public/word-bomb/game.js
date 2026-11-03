// WORD BOMB — type a word containing the letters before the timer hits zero.
(() => {
  const { esc, set, act, toast, vibrate, flash, player, nameOf, isHost } = GN;

  const deviceArt = (label = "00:10") => `
    <svg class="device-art" viewBox="0 0 220 150" aria-hidden="true">
      <path d="M40 40 C 20 10, 70 0, 80 30" stroke="#ff2a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M110 34 C 110 5, 150 5, 150 32" stroke="#2f7bff" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M170 40 C 200 10, 210 50, 186 60" stroke="#ffd400" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="18" y="38" width="184" height="96" rx="10" fill="#2a2b30" stroke="#45474e" stroke-width="3"/>
      <rect x="30" y="50" width="46" height="72" rx="4" fill="#c8b48a"/><rect x="87" y="50" width="46" height="72" rx="4" fill="#c8b48a"/><rect x="144" y="50" width="46" height="72" rx="4" fill="#c8b48a"/>
      <rect x="20" y="78" width="180" height="10" fill="#111"/>
      <rect x="58" y="62" width="104" height="40" rx="6" fill="#0d0303" stroke="#3a0f0f" stroke-width="2"/>
      <text x="110" y="91" text-anchor="middle" font-family="Share Tech Mono, monospace" font-size="26" fill="#ff2a2a" class="blink">${label}</text>
      <circle cx="190" cy="48" r="4" fill="#39ff6a" class="blink"/>
    </svg>`;

  let seenFeed = 0, lastTurnKey = "", sending = false;
  const SEGS = 12;

  function play(view, fresh, s) {
    const wb = s.wb;
    if (fresh) {
      seenFeed = Math.max(0, ...wb.feed.map((f) => f.at));
      lastTurnKey = "";
      view.innerHTML = `
        <div class="qhead"><span class="qnum">Round ${s.round} of ${s.totalRounds}</span><span class="qnum">${wb.usedCount} words</span></div>
        <div class="device" id="device">
          <svg class="wires" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true">
            <path d="M10 28 C 60 -10, 120 40, 170 6" stroke="#ff2a2a" stroke-width="4" fill="none"/>
            <path d="M180 28 C 220 0, 260 30, 300 4" stroke="#2f7bff" stroke-width="4" fill="none"/>
            <path d="M300 28 C 330 0, 370 30, 392 8" stroke="#ffd400" stroke-width="4" fill="none"/>
          </svg>
          <div class="screen">
            <div class="lab">TYPE A WORD CONTAINING</div>
            <div class="syl" id="syl"></div>
            <div class="clock" id="clock">--:--</div>
          </div>
          <div class="segs" id="segs">${"<i></i>".repeat(SEGS)}</div>
          <div class="holder" id="holder"></div>
        </div>
        <form class="wbinput" id="wf" autocomplete="off">
          <input class="txt" id="word" maxlength="24" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="send">
          <button class="btn" type="submit">Defuse</button>
        </form>
        <div class="attempt" id="attempt"></div>
        <div class="crew" id="crew"></div>
        <div class="card"><h2>Words that saved lives</h2><ul class="feed" id="feed"></ul></div>`;
      const f = document.getElementById("wf"), input = document.getElementById("word");
      // tapping the button must not close the keyboard
      f.querySelector("button").addEventListener("pointerdown", (e) => e.preventDefault());
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (sending) return;
        const w = input.value.trim(); if (!w) return;
        sending = true;
        // The server decides whose turn it is: send even if this phone hasn't caught up yet.
        const send = () => act("wb-word", { word: w });
        try {
          let r;
          try { r = await send(); }
          catch (err) {
            if (err.status === 409 && /not your turn/i.test(err.message)) { await GN.refreshNow(); if (GN.state?.wb?.turn === GN.me) r = await send(); else throw err; }
            else throw err;
          }
          if (r.ok) { input.value = ""; vibrate(15); }
          else { const d = document.getElementById("device"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); vibrate([20, 40, 20]); }
        } catch (err) { toast(/not your turn/i.test(err.message) ? "Not your turn yet — hold that word!" : err.message); }
        sending = false;
        input.focus();
      };
    }
    const lives = (id) => `<span class="lives">${"❤️".repeat(Math.max(0, wb.lives[id] || 0))}${"🖤".repeat(Math.max(0, wb.startLives - (wb.lives[id] || 0)))}</span>`;
    set("#crew", wb.order.filter((id) => player(id)).map((id) => {
      const p = player(id);
      return `<div class="m ${id === wb.turn ? "turn" : ""} ${wb.lives[id] > 0 ? "" : "out"} ${id === GN.me ? "me" : ""}">${GN.dot(p)}<span class="n">${esc(p.name)}</span>${lives(id)}</div>`;
    }).join(""));
    set("#syl", esc(wb.syl));

    const mine = wb.turn === GN.me;
    const turnKey = `${wb.turnNo}:${wb.turn}`;
    const input = document.getElementById("word");
    // The box is never locked, so the keyboard can stay open the whole round.
    if (turnKey !== lastTurnKey) {
      lastTurnKey = turnKey;
      if (mine) { vibrate([60, 30, 60]); if (document.activeElement !== input && !document.querySelector(".sheet")) input.focus(); }
    }
    input.classList.toggle("waiting", !mine);
    input.placeholder = mine ? `Word with ${wb.syl}…` : wb.order.includes(GN.me) ? (wb.lives[GN.me] > 0 ? "Get a word ready…" : "You're out 💀") : "Watching this round";

    const at = wb.attempt;
    if (at && at.turnNo === wb.turnNo && !at.ok) set("#attempt", `${esc(nameOf(at.id))}: ${esc(at.word.toUpperCase())} <span class="bad">✗ ${esc(at.reason)}</span>`);
    else if (at && at.ok) set("#attempt", `${esc(nameOf(at.id))}: <span class="good">${esc(at.word.toUpperCase())} ✓ DEFUSED</span>`);
    else set("#attempt", "");

    const fresh2 = wb.feed.filter((f) => f.at > seenFeed);
    if (fresh2.length) seenFeed = Math.max(...wb.feed.map((f) => f.at));
    for (const ev of fresh2) {
      if (ev.t === "boom") {
        const fx = document.createElement("div"); fx.className = "boomfx"; document.body.appendChild(fx); setTimeout(() => fx.remove(), 800);
        const d = document.getElementById("device"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake");
        flash(`💥 BOOM<br><span style="font-size:24px">${esc(nameOf(ev.id))}</span>`, 1100);
        vibrate(ev.id === GN.me ? [250, 80, 250] : 60);
      }
      if (ev.t === "out") setTimeout(() => toast(`${nameOf(ev.id)} is out! 💀`), 900);
    }
    set("#feed", wb.feed.filter((f) => f.t === "word").slice(-6).reverse().map((f) => {
      const Wd = f.word.toUpperCase(), i = Wd.indexOf(f.syl);
      const shown = i >= 0 ? `${esc(Wd.slice(0, i))}<mark>${esc(f.syl)}</mark>${esc(Wd.slice(i + f.syl.length))}` : esc(Wd);
      return `<li><b>${esc(nameOf(f.id))}</b><span class="w">${shown}</span></li>`;
    }).join("") || `<li>No words yet. Tick tock…</li>`);
  }

  function tick(t, s) {
    if (s.phase !== "wb-play") { document.body.classList.remove("alarm"); return; }
    const wb = s.wb;
    const clock = document.getElementById("clock"), holder = document.getElementById("holder"), segs = document.getElementById("segs"), dev = document.getElementById("device");
    if (!clock) return;
    const mine = wb.turn === GN.me;
    if (t < wb.turnStart) {
      const n = Math.ceil((wb.turnStart - t) / 1000);
      clock.textContent = `ARMING ${n}`;
      holder.textContent = mine ? "You're first! Get ready…" : `${nameOf(wb.turn)} goes first`;
      holder.classList.toggle("mine", mine);
      return;
    }
    const total = wb.deadline - wb.turnStart, left = Math.max(0, wb.deadline - t);
    const sec = Math.floor(left / 1000), tenth = Math.floor((left % 1000) / 100);
    clock.textContent = `00:${String(sec).padStart(2, "0")}.${tenth}`;
    const on = Math.ceil((left / total) * SEGS);
    [...segs.children].forEach((el, i) => el.classList.toggle("off", i >= on));
    segs.classList.toggle("warn", left < total * 0.5 && left >= 3000);
    segs.classList.toggle("crit", left < 3000);
    dev.classList.toggle("hot", left < 3000);
    holder.textContent = mine ? "YOUR BOMB! TYPE!" : `💣 ${nameOf(wb.turn)} is holding it`;
    holder.classList.toggle("mine", mine);
    document.body.classList.toggle("alarm", mine && left < 3000);
  }

  function recap(s) {
    const wb = s.wb;
    const rs = s.roundScores[s.round] || {};
    const places = (wb.places || []).filter((id) => player(id));
    return `<section class="hero" style="padding-top:4px">${wb.winner ? deviceArt("SAFE") : deviceArt("BOOM")}
      <div class="kicker">Round ${s.round} of ${s.totalRounds} · ${wb.usedCount} words</div>
      <h1 class="logo" style="font-size:38px">${wb.winner ? `${esc(nameOf(wb.winner))}<br><em>survived</em>` : "Nobody<br><em>survived</em>"}</h1></section>
      <div class="card"><h2>Blast report</h2><ol class="board">${places.map((id, i) => `<li class="${i === 0 ? "first" : ""} ${id === GN.me ? "me" : ""}"><span class="rk">${i === 0 && wb.winner ? "🏆" : i + 1}</span>${GN.dot(player(id))}<span class="nm">${esc(nameOf(id))}</span><span class="sc">+${rs[id] || 0}</span></li>`).join("")}</ol>
      ${wb.lastWords.length ? `<p class="muted small" style="margin-top:10px">Last words: ${wb.lastWords.map((w) => esc(w.toUpperCase())).join(" · ")}</p>` : ""}</div>`;
  }

  GN.start({
    key: "wordbomb", name: "Word Bomb", min: 1,
    kicker: "⚠ High explosive word game ⚠",
    logo: "Word<br><em>Bomb</em>",
    heroArt: deviceArt(),
    lobbyArt: deviceArt("READY"),
    champArt: `<div class="tro">🧨🏆</div>`,
    tag: "The bomb shows some letters. Type a real word with them in it before the timer hits zero, or it blows up in your hands.",
    how: [
      "The bomb shows letters like <b>TH</b>. On your turn, type any real English word containing them: <b>THINK</b>, <b>BROTHER</b>, <b>MATH</b>.",
      "Get it right and the bomb passes to the next person. Run out of time and you lose a ❤️.",
      "No repeats. The fuse gets <b>shorter every lap</b>. Last one standing wins the round.",
      "Points: +2 per word, +10 for everyone you outlast, +25 for surviving. Most points after the last round wins.",
    ],
    words: { players: "Bomb squad", create: "Arm a new bomb", startBtn: "Arm the bomb", roomLabel: "Detonation code", champLabel: "Chief bomb defuser", voteTitle: "Ready for bomb", nextRound: "Next bomb", awardsTitle: "Medals", howTitle: "Briefing" },
    extraSettings: [{ label: "Lives each", key: "wbLives", opts: [1, 2, 3], fmt: (n) => "❤️".repeat(n) }],
    roundInfo: (st) => `Each round is one bomb, played until one person is left. ${st.wbLives} ${st.wbLives === 1 ? "life" : "lives"} each.`,
    confetti: ["#ffd400", "#ff2a2a", "#39ff6a", "#ff8a00", "#ffffff"],
    fastPhases: ["wb-play"],
    screens: { "wb-play": play },
    tick, recap,
  });
})();
