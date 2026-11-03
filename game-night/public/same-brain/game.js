// SAME BRAIN — everyone answers the same prompt; you score for every person who said what you said.
(() => {
  const { esc, set, show, act, tryAct, toast, vibrate, flash, player, nameOf, isHost, pill, mini, laughBtn, confetti } = GN;
  const mind = (cls = "") => `<div class="mind ${cls}"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="core">🧠</span></div>`;
  let editing = false, mergeFrom = null;

  function answer(view, fresh, s) {
    const sb = s.sb;
    if (fresh) {
      editing = false;
      view.innerHTML = `
        <div class="prompt-card">
          <div class="qhead"><span class="qnum">Round ${s.round}/${s.totalRounds} · Q${sb.qi} of ${sb.perRound}</span><span class="secs" id="secs"></span></div>
          <div class="prompt">${esc(sb.prompt)}</div>
          <div class="bar" id="bar"><i></i></div>
          <form id="f" class="stack" autocomplete="off">
            <input class="txt" id="ans" maxlength="40" placeholder="What would the family say?" enterkeyhint="done">
            <button class="btn" type="submit">Lock it in 🔒</button>
          </form>
          <div id="lockedbox" class="hidden"></div>
        </div>
        <div class="waitline" id="waitline"></div>
        <div class="syncing" id="who"></div>
        <div class="hostbar hidden" id="hb"><button class="ghost" id="revealnow">Reveal now</button></div>`;
      const f = document.getElementById("f"), input = document.getElementById("ans");
      f.onsubmit = async (e) => {
        e.preventDefault();
        const a = input.value.trim(); if (!a) return input.focus();
        input.blur();
        const r = await tryAct("sb-answer", { qi: sb.qi, answer: a });
        if (r) { editing = false; vibrate(25); GN.render(); }
      };
      document.getElementById("revealnow").onclick = () => tryAct("sb-reveal");
      setTimeout(() => input.focus(), 80);
    }
    const mine = sb.mine, locked = mine && !editing;
    show("#f", !locked); show("#lockedbox", !!locked);
    if (locked) {
      set("#lockedbox", `<div class="locked"><div><div class="muted small">Locked in</div><b>${esc(mine)}</b></div><button class="ghost small" id="chg">Change</button></div>`);
      document.getElementById("chg").onclick = () => { editing = true; GN.render(); const i = document.getElementById("ans"); i.value = mine; i.focus(); };
    }
    const ids = sb.ids.filter((id) => player(id));
    const done = new Set(sb.answered);
    set("#waitline", `🧠 ${done.size} of ${ids.length} brains locked in`);
    set("#who", ids.map((id) => pill(player(id), done.has(id) ? "done" : "wait", done.has(id) ? " ✓" : "")).join(""));
    show("#hb", isHost());
  }

  function reveal(view, fresh, s) {
    const sb = s.sb;
    if (fresh) {
      mergeFrom = null;
      view.innerHTML = `
        <div class="qhead"><span class="qnum">Round ${s.round}/${s.totalRounds} · Q${sb.qi} of ${sb.perRound}</span></div>
        <div class="prompt" style="font-size:26px;margin-bottom:14px">${esc(sb.prompt)}</div>
        <div id="mine"></div>
        <div id="hosthelp"></div>
        <div id="groups"></div>
        <div class="card mt"><h2>Scores</h2><div id="board"></div></div>
        <div class="hostbar" id="hb"></div>`;
      const pts = sb.points[GN.me];
      if (pts > 0) { vibrate([30, 30, 60]); if (pts >= 30) confetti(60); }
      document.getElementById("groups").onclick = (e) => {
        if (!isHost() || e.target.closest("[data-laugh]")) return;
        const g = e.target.closest(".group"); if (!g) return;
        const key = g.dataset.key;
        if (!mergeFrom) { mergeFrom = key; GN.render(); toast("Now tap the answer it should count as"); return; }
        if (mergeFrom === key) { mergeFrom = null; GN.render(); return; }
        const from = mergeFrom; mergeFrom = null;
        tryAct("sb-merge", { from, to: key });
      };
    }
    const myPts = sb.points[GN.me], answered = sb.answers[GN.me] != null;
    set("#mine", !answered
      ? `<div class="myresult zero"><div class="big">😴</div><div class="sub">You didn't answer this one</div></div>`
      : myPts ? `<div class="myresult"><div class="big">+${myPts}</div><div class="sub">${myPts / 10} ${myPts === 10 ? "brain" : "brains"} synced with yours!</div></div>`
      : `<div class="myresult zero"><div class="big">0</div><div class="sub">Nobody else thought “${esc(sb.answers[GN.me])}” 🐺</div></div>`);
    set("#hosthelp", isHost() ? `<p class="muted small" style="margin-bottom:10px">${mergeFrom ? "Now tap the answer it should count as (tap it again to cancel)." : "Host: two answers mean the same thing? Tap one, then the other, to merge them."}</p>` : "");
    const top = sb.groups[0]?.ids.length || 0;
    set("#groups", sb.groups.length ? sb.groups.map((g) => {
      const n = g.ids.length;
      const cls = `group ${n > 1 && n === top ? "top" : ""} ${n === 1 ? "solo" : ""} ${isHost() ? "tap" : ""} ${mergeFrom === g.key ? "sel" : ""}`;
      return `<div class="${cls}" data-key="${esc(g.key)}">
        <div class="gtop"><span class="ans">${esc(g.label)}</span><span class="cnt">${n > 1 ? `×${n} synced` : "solo"}</span></div>
        <div class="who">${g.ids.map((id) => mini(player(id))).join("")}</div>
        <div class="meta"><span>${n > 1 ? `+${(n - 1) * 10} each` : "0 points"}${g.keys.length > 1 ? " · merged" : ""}</span>${laughBtn(`sb:${s.round}:${sb.qi}:${g.ids[0]}`)}</div></div>`;
    }).join("") : `<p class="muted">Nobody answered! 🦗</p>`);
    set("#board", GN.boardHtml(GN.totals(sb.points), (r) => `${r.add ? `<span class="plus">+${r.add}</span>` : ""}${r.val}`));
    if (isHost()) {
      set("#hb", `${sb.groups.some((g) => g.keys.length > 1) ? `<button class="ghost" id="unmerge">Undo merges</button>` : ""}<button class="btn" id="next">${sb.qi >= sb.perRound ? "Finish round 🏁" : "Next question →"}</button>`);
      document.getElementById("next").onclick = (e) => { e.target.disabled = true; tryAct("sb-next", { qi: sb.qi }).then(() => { e.target.disabled = false; }); };
      const u = document.getElementById("unmerge"); if (u) u.onclick = () => tryAct("sb-unmerge");
    } else set("#hb", `<p class="muted small center" style="width:100%">Waiting for ${esc(nameOf(s.hostId))} to go on…</p>`);
  }

  GN.start({
    key: "samebrain", name: "Same Brain", min: 2,
    kicker: "A mind-meld game",
    logo: "Same<br>Brain",
    heroArt: mind(),
    lobbyArt: mind("small"),
    champArt: `<div class="tro">🧠👑</div>`,
    tag: "Think like the family. Every person who says what you said is points in your pocket.",
    how: [
      "Everyone gets the same prompt, like <b>“A fruit that's yellow.”</b> You have <b>20 seconds</b>.",
      "You get <b>+10 for every other person</b> who said the same thing. Say it alone? Zero. 🐺",
      "Spelling and plurals don't matter. The host can tap two answers to merge them (“cheese” = “cheddar”).",
      "Each round is 5 prompts. Most in sync after the last round is the champion. Tap 😂 on funny answers for the hall of fame.",
    ],
    words: { players: "Brains in the room", startBtn: "Start the mind meld", champLabel: "Biggest hive mind", awardsTitle: "Brain awards" },
    roundInfo: () => "Each round is 5 prompts · 20 seconds each.",
    confetti: ["#ff5bd8", "#46ecff", "#a86bff", "#ffe066", "#5cf2a8"],
    phaseKey: (s) => (s.sb ? s.sb.qi : ""),
    timer: (s) => (s.phase === "sb-answer" ? { start: s.sb.startedAt, end: s.sb.deadline } : null),
    screens: { "sb-answer": answer, "sb-reveal": reveal },
    recap: (s) => {
      const rs = s.roundScores[s.round] || {};
      const best = Math.max(0, ...Object.values(rs));
      const who = Object.keys(rs).filter((id) => rs[id] === best && best > 0 && player(id));
      return `<section class="hero" style="padding-top:6px">${mind("small")}
        <div class="kicker">Round ${s.round} of ${s.totalRounds} complete</div>
        <h1 class="logo" style="font-size:40px">${s.round >= s.totalRounds ? "That's a wrap!" : "Brains recharging…"}</h1>
        <p class="tagline">${who.length ? `Most in sync this round: <b style="color:var(--ink)">${esc(who.map(nameOf).join(" & "))}</b> (+${best})` : "Nobody matched this round 😅"}</p></section>`;
    },
  });
})();
