// THE IMPOSTER — everyone shares a secret word except one. Hints, then vote.
(() => {
  const { esc, set, show, tryAct, vibrate, flash, player, nameOf, isHost, laughBtn } = GN;

  const lensArt = `
    <svg class="lens" viewBox="0 0 160 130" aria-hidden="true">
      <g opacity=".55" fill="none" stroke="#c9a96a" stroke-width="1.6">
        <path d="M40 30c12-10 34-10 46 0"/><path d="M34 40c16-14 44-14 58 0"/><path d="M30 52c18-17 50-17 66 0"/>
        <path d="M30 64c18-15 50-15 66 0"/><path d="M34 76c16-12 44-12 58 0"/><path d="M42 88c12-8 30-8 42 0"/>
      </g>
      <circle cx="64" cy="58" r="38" fill="rgba(255,240,210,.08)" stroke="#d9c9a0" stroke-width="7"/>
      <circle cx="64" cy="58" r="30" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2" stroke-dasharray="20 120"/>
      <path d="M92 86 L132 122" stroke="#6b4a2a" stroke-width="13" stroke-linecap="round"/>
      <path d="M92 86 L100 94" stroke="#9aa0a6" stroke-width="13" stroke-linecap="round"/>
    </svg>`;

  let hidden = false, editing = false;

  function dossier(im, small) {
    if (!im.myWord) return `<div class="banner">You walked in mid-case. Watch this round, you're in the next one.</div>`;
    return `<div class="dossier ${hidden ? "hide" : ""}" id="dossier" ${small ? 'style="padding:12px"' : ""}>
      <span class="clip"></span><span class="stamp">Top secret</span>
      <div class="lab">Your secret word</div>
      <div class="word" ${small ? 'style="font-size:28px"' : ""}>${esc(im.myWord)}</div>
      <div class="hint">Tap to ${hidden ? "reveal" : "hide"} · it might not be the same as everyone else's…</div></div>`;
  }
  function bindDossier() {
    const el = document.getElementById("dossier");
    if (el) el.onclick = () => { hidden = !hidden; el.classList.toggle("hide", hidden); el.querySelector(".hint").textContent = `Tap to ${hidden ? "reveal" : "hide"} · it might not be the same as everyone else's…`; };
  }
  const mug = (p) => `<div class="mug" style="background-color:${p.color}"><span>${esc((p.name[0] || "?").toUpperCase())}</span></div>`;

  function suspects(s, im, opts = {}) {
    return `<ul class="suspects">${im.ids.map((id) => {
      const p = player(id); if (!p) return "";
      const list = im.clues[id] || [];
      const cells = [];
      for (let i = 0; i < im.clueRound; i++) {
        const c = list[i];
        if (c === "•") cells.push(`<span>✓ written</span>`);
        else if (c) cells.push(`<span>${esc(c)}${opts.laughs ? " " + laughBtn(`im:${s.round}:${id}:${i}`) : ""}</span>`);
        else cells.push(`<span class="pending">…</span>`);
      }
      const cls = ["suspect", opts.tap && id !== GN.me ? "tap" : "", opts.voted === id ? "voted" : "", opts.guilty === id ? "guilty" : ""].join(" ");
      return `<li class="${cls}" data-id="${id}">${mug(p)}<div class="info"><div class="nm">${esc(p.name)}${id === GN.me ? " (you)" : ""}${opts.guilty === id ? " 🕵️" : ""}</div><div class="clues">${cells.join("")}</div></div>${opts.counts ? `<span class="vc">${opts.counts[id] ? "✗".repeat(Math.min(opts.counts[id], 6)) : ""}</span>` : ""}</li>`;
    }).join("")}</ul>`;
  }

  function clue(view, fresh, s) {
    const im = s.im;
    if (fresh) {
      editing = false;
      view.innerHTML = `
        <div class="qhead"><span class="qnum">Case ${s.round} of ${s.totalRounds} · Hint round ${im.clueRound}</span><span class="secs" id="secs"></span></div>
        <div class="bar" id="bar"><i></i></div>
        ${dossier(im)}
        <div class="card" style="margin-top:22px">
          <h2>Your hint</h2>
          <p class="muted small" style="margin-bottom:10px">${im.clueRound === 1 ? "One word that hints at your secret word. Too obvious and the imposter catches on. Too vague and <i>you</i> look guilty." : "Another hint, different from last time."}</p>
          <form id="cf" class="stack" autocomplete="off">
            <input class="txt" id="clue" maxlength="24" placeholder="Type your hint…" enterkeyhint="send" ${im.myWord ? "" : "disabled"}>
            <button class="btn" type="submit" ${im.myWord ? "" : "disabled"}>Submit hint</button>
          </form>
          <div id="cluelocked" class="hidden"></div>
        </div>
        <div class="card"><h2>Suspects</h2><div id="sus"></div></div>
        <div class="hostbar hidden" id="hb"><button class="ghost" id="skip" style="color:#ece2c9;border-color:#4a4134">Skip to the vote</button></div>`;
      bindDossier();
      const f = document.getElementById("cf"), input = document.getElementById("clue");
      f.onsubmit = async (e) => {
        e.preventDefault();
        const c = input.value.trim(); if (!c) return input.focus();
        const r = await tryAct("im-clue", { clue: c });
        if (r) { editing = false; input.blur(); vibrate(20); GN.render(); }
      };
      document.getElementById("skip").onclick = () => tryAct("im-skip");
    }
    const mine = (im.clues[GN.me] || [])[im.clueRound - 1];
    const locked = mine && !editing;
    show("#cf", !locked); show("#cluelocked", !!locked);
    if (locked) {
      set("#cluelocked", `<div class="locked"><div><div class="muted small">Filed</div><b>${esc(mine)}</b></div><button class="ghost small" id="chg">Change</button></div>`);
      document.getElementById("chg").onclick = () => { editing = true; GN.render(); const i = document.getElementById("clue"); i.value = mine; i.focus(); };
    }
    set("#sus", suspects(s, im));
    show("#hb", isHost());
  }

  function vote(view, fresh, s) {
    const im = s.im;
    if (fresh) {
      view.innerHTML = `
        <div class="qhead"><span class="qnum">Case ${s.round} of ${s.totalRounds} · The lineup</span><span class="secs" id="secs"></span></div>
        <div class="bar" id="bar"><i></i></div>
        ${dossier(im, true)}
        <div class="card" style="margin-top:22px"><h2>Who's the imposter?</h2>
          <p class="muted small" id="votehelp" style="margin-bottom:12px"></p>
          <div id="sus"></div>
          <p class="muted small center" id="votecount" style="margin-top:12px"></p></div>
        <div class="hostbar hidden" id="hb"><button class="ghost" id="more" style="color:#ece2c9;border-color:#4a4134">Another hint round</button><button class="ghost" id="revealnow" style="color:#ece2c9;border-color:#4a4134">Close the case</button></div>`;
      bindDossier();
      document.getElementById("sus").onclick = (e) => {
        const li = e.target.closest(".suspect"); if (!li || !GN.state.im.myWord) return;
        const id = li.dataset.id; if (id === GN.me) return;
        tryAct("im-vote", { target: id }).then((r) => { if (r) vibrate(20); });
      };
      document.getElementById("more").onclick = () => tryAct("im-more");
      document.getElementById("revealnow").onclick = () => tryAct("im-skip");
      flash("LINEUP<br><span style='font-size:20px'>Time to vote</span>", 1100);
    }
    set("#votehelp", im.myWord ? (im.myVote ? `You accused <b>${esc(nameOf(im.myVote))}</b>. Tap someone else to change your mind.` : "Read the hints. Argue. Then tap the suspect you think had a different word.") : "You're watching this case.");
    set("#sus", suspects(s, im, { tap: !!im.myWord, voted: im.myVote }));
    set("#votecount", `${im.voted.length} of ${im.ids.length} detectives have voted`);
    show("#hb", isHost());
    show("#more", isHost() && im.clueRound < 3);
  }

  function recap(s) {
    const im = s.im, o = im.outcome || {};
    const imp = esc(nameOf(im.imposter)), meImp = im.imposter === GN.me;
    let head;
    if (o.caught) head = meImp ? "They caught you red-handed." : `${imp} was the imposter.`;
    else if (o.accused === GN.me) head = `They blamed you. But you were innocent… ${imp} walks free.`;
    else if (o.accused) head = meImp ? `You framed ${esc(nameOf(o.accused))}. Perfect crime.` : `${esc(nameOf(o.accused))} was innocent! ${imp} got away.`;
    else head = meImp ? "Nobody could agree. You slipped away." : `Nobody agreed. ${imp} slipped away.`;
    const myVote = im.votes?.[GN.me];
    const mine = meImp ? (o.caught ? "Imposter caught: +0" : "Clean getaway: +300") : myVote ? (myVote === im.imposter ? "You fingered the right suspect: +100" : "Wrong suspect: +0") : "";
    return `<div class="verdict">
        <span class="stamp big slam ${o.caught ? "" : "green"}">${o.caught ? "Case closed" : "Suspect at large"}</span>
        <div class="head">${head}</div>
        <div class="words">Everyone had <b>${esc(im.common)}</b> · ${imp} had <b>${esc(im.odd)}</b></div></div>
      ${mine ? `<div class="banner" style="margin-top:14px">${mine}</div>` : ""}
      <div class="card"><h2>Evidence</h2>${suspects(s, im, { counts: o.counts || {}, guilty: im.imposter, laughs: true })}
        <p class="muted small" style="margin-top:12px">${Object.entries(im.votes || {}).map(([v, t]) => `${esc(nameOf(v))} → <b>${esc(nameOf(t))}</b>`).join(" · ") || "Nobody voted."}</p>
        <p class="muted small" style="margin-top:6px">Tap 😂 on the best hints for the hall of fame.</p></div>`;
  }

  GN.start({
    key: "imposter", name: "The Imposter", min: 3,
    kicker: "Case file · Classified",
    logo: "<small>The</small>Imposter",
    heroArt: lensArt,
    lobbyArt: lensArt,
    champArt: `<div class="tro">🕵️</div><span class="stamp big slam" style="margin-top:10px">Top detective</span>`,
    tag: "Everyone gets the same secret word. Except one of you. And they don't know it's them.",
    how: [
      "Everyone gets a secret word, like <b>BEACH</b>. One person gets a slightly different one, like <b>POOL</b>. Nobody knows who.",
      "Everyone writes a one-word hint. Then everyone sees the hints and argues it out.",
      "Vote for the suspect. Catch the imposter: <b>+100</b> each. Imposter gets away: <b>+300</b> to them.",
      "Most points after the last case wins. Tap 😂 on the best hints for the hall of fame.",
    ],
    words: { players: "Detectives on the case", create: "Open a new case", startBtn: "Open the case", roomLabel: "Case number", roundWord: "Case", voteTitle: "Ready for case", nextRound: "Next case", standings: "Detective rankings", champLabel: "Top detective", revealChamp: "Close the investigation 🔍", awardsTitle: "Commendations", howTitle: "The briefing", invite: "Send the case file" },
    roundInfo: () => "Each case: secret words, up to 3 hint rounds, then the vote. 40s per hint, 45s to vote.",
    confetti: ["#b3261e", "#e7d6a8", "#d4a017", "#2a2117", "#f3e7c9"],
    phaseKey: (s) => (s.im ? s.im.clueRound : ""),
    timer: (s) => (s.phase === "im-clue" ? { start: s.im.deadline - 40000, end: s.im.deadline } : s.phase === "im-vote" ? { start: s.im.deadline - 45000, end: s.im.deadline } : null),
    screens: { "im-clue": clue, "im-vote": vote },
    recap,
    onRoundEnd: (s) => vibrate(s.im?.imposter === GN.me ? [80, 40, 80] : 40),
  });
})();
