/*
 * duo.js — 物理 Duo（關卡挑戰版）
 *
 * 一關＝一個實驗。題目不是預先寫死的樣板，而是在關卡開始時，
 * 由嵌入的實驗台（embed.html → window.DuoLab）回報「這個模型實際量到的關係」，
 * 再據此出題：
 *
 *   ① 情境預測   先承諾答案（不扣分），做完實驗再揭曉
 *   ② 調整實驗   在實驗台上把讀數調到目標值，即時判定
 *   ③ 數據判讀   表格數字由模型算出，判斷關係或內插
 *   ④ 比例推理／控制變因
 *   ⑤ 情境應用   把量到的關係放進一個要做決定的情境
 *   ⑥ 主站題庫   逐題撰寫的題目，以及每次數值不同的計算題
 *
 * 答錯的題目會排到最後再出一次（多鄰國的作法）：要答對才能過關，
 * 而不是錯了扣愛心、錯太多就被擋在門外——這是給課堂用的，不該讓學生卡死。
 */
(function () {
  "use strict";

  const C = window.PhysicsLabCurriculum;
  const BANK = window.PhysicsLabQuestionBank || {};
  const buildNumeric = window.PhysicsLabBuildNumericQuestion || null;
  const $ = (s, root) => (root || document).querySelector(s);
  const el = (tag, cls, parent, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  if (!C || !C.modules) { document.body.textContent = "単元データを読み込めませんでした。ページを再読み込みしてください。"; return; }

  /* ------------------------------ 小工具 ------------------------------ */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  function fmt(v) {
    if (v == null || !isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(2).replace("e", "×10^").replace("+", "");
    return String(Number(v.toPrecision(3)));
  }
  const withUnit = (v, unit) => fmt(v) + (unit ? " " + unit : "");
  const shade = (hex, amt) => {
    const n = parseInt(String(hex).replace("#", ""), 16);
    if (isNaN(n)) return hex;
    const f = c => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
    return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(c => c.toString(16).padStart(2, "0")).join("");
  };
  // 題庫與公式裡的 LaTeX 轉成可讀純文字（題庫只用到一小組指令）
  function plainTex(src) {
    let s = String(src || "").replace(/\\\(|\\\)|\$\$/g, "");
    for (let i = 0; i < 4; i++) {
      s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
    }
    const sym = { ge: "≥", geq: "≥", le: "≤", leq: "≤", pm: "±", mp: "∓", ell: "ℓ", hbar: "ℏ", infty: "∞", to: "→", neq: "≠", gg: "≫", ll: "≪", sin: "sin ", cos: "cos ", tan: "tan ", ln: "ln ", log: "log ", displaystyle: "", " ": " ", pi: "π", theta: "θ", lambda: "λ", mu: "μ", rho: "ρ", omega: "ω", Delta: "Δ", alpha: "α", beta: "β", varepsilon: "ε", epsilon: "ε", phi: "φ", tau: "τ", propto: "∝", times: "×", cdot: "·", approx: "≈", quad: "  ", qquad: "  ", left: "", right: "", mathrm: "", text: "", vec: "", ",": " ", ";": " " };
    s = s.replace(/\\([a-zA-Z]+|[,; ])/g, (m, w) => (w in sym ? sym[w] : w));
    const sup = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "-": "⁻", "n": "ⁿ" };
    s = s.replace(/\^\{([^{}]*)\}|\^(\S)/g, (m, a, b) => { const t = a != null ? a : b; return t.split("").every(c => sup[c]) ? t.split("").map(c => sup[c]).join("") : "^" + t; });
    const sub = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", o: "ₒ", e: "ₑ", x: "ₓ", n: "ₙ", s: "ₛ", t: "ₜ", m: "ₘ", k: "ₖ", p: "ₚ" };
    s = s.replace(/_\{([^{}]*)\}|_(\S)/g, (m, a, b) => { const t = a != null ? a : b; return t.split("").every(c => sub[c]) ? t.split("").map(c => sub[c]).join("") : t; });
    s = s.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
    return s;
  }

  /* ------------------------------ 進度 ------------------------------ */
  const KEY = "duo2-state";
  const state = Object.assign({ xp: 0, done: {}, streak: { count: 0, last: "" }, mistakes: [] }, store.get(KEY, {}));
  const save = () => store.set(KEY, state);

  const FLAT = [];
  C.modules.forEach((m, mi) => m.experiments.forEach(exp => FLAT.push({ exp, mod: m, mi })));
  const byId = {};
  FLAT.forEach((f, i) => { f.order = i; byId[f.exp.id] = f; });
  const nextUndone = () => FLAT.find(f => !state.done[f.exp.id]) || null;

  function renderStats() {
    $("#xp-n").textContent = state.xp;
    $("#streak-n").textContent = state.streak.count;
    $("#done-n").textContent = Object.keys(state.done).length;
    const n = state.mistakes.length;
    const badge = $("#review-count");
    badge.hidden = !n; badge.textContent = n;
  }

  /* ------------------------------ 地圖 ------------------------------ */
  const ICONS = {
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/></svg>',
    flask: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3"/><path d="M7 15h10"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>'
  };
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>';

  function renderMap() {
    const nav = $("#units-nav"); nav.innerHTML = "";
    const units = $("#units"); units.innerHTML = "";
    const next = nextUndone();

    // 「繼續」卡：回來的人第一眼就知道下一關是什麼
    const cont = $("#continue-card"); cont.innerHTML = "";
    if (next) {
      const ic = el("div", "continue-icon", cont);
      ic.style.setProperty("--cu", next.mod.color);
      ic.innerHTML = ICONS.flask;
      const t = el("div", "continue-text", cont);
      el("p", null, t, (Object.keys(state.done).length ? "前回の続き · " : "最初のステージから · ") + next.mod.title);
      el("h2", null, t, next.exp.title);
      const totalDone = Object.keys(state.done).length;
      const meta = el("div", "continue-meta", t);
      const bar = el("div", "bar", meta); el("i", null, bar).style.width = Math.max(2, Math.round(totalDone / FLAT.length * 100)) + "%";
      el("small", null, meta, "クリア " + totalDone + " / " + FLAT.length + " ステージ");
      const go = el("button", "btn primary", cont, totalDone ? "続ける" : "スタート");
      go.type = "button";
      go.addEventListener("click", () => openLesson(next.exp.id));
    }

    C.modules.forEach((m, mi) => {
      const ud = shade(m.color, -0.22);
      const done = m.experiments.filter(e => state.done[e.id]).length;
      const chip = el("button", "unit-chip" + (done === m.experiments.length ? " done" : ""), nav);
      chip.type = "button"; chip.style.setProperty("--u", m.color);
      el("i", null, chip);
      chip.appendChild(document.createTextNode(m.title));
      el("small", null, chip, done + "/" + m.experiments.length);
      chip.addEventListener("click", () => { const u = document.getElementById("unit-" + m.id); if (u) u.scrollIntoView({ behavior: "smooth", block: "start" }); });

      const unit = el("section", "unit", units);
      unit.id = "unit-" + m.id;
      unit.style.setProperty("--u", m.color); unit.style.setProperty("--ud", ud);
      unit.style.setProperty("--u-ink", shade(m.color, -0.45));
      unit.style.setProperty("--uh", shade(m.color, -0.3));
      const head = el("div", "unit-head", unit);
      const body = el("div", "unit-body", head);
      el("div", "unit-kicker", body, "第 " + (mi + 1) + " 単元 · " + m.track);
      el("h2", null, body, m.title);
      el("p", null, body, m.intro);
      const meter = el("div", "unit-meter", head);
      meter.style.setProperty("--p", Math.round(done / m.experiments.length * 100) + "%");
      el("span", null, meter, done + "/" + m.experiments.length);

      const path = el("div", "path", unit);
      m.experiments.forEach((exp, i) => {
        const wrap = el("div", "node-wrap", path);
        wrap.dataset.id = exp.id;
        wrap.style.setProperty("--dx", Math.round(Math.sin(i * 0.9) * 70) + "px");
        const rec = state.done[exp.id];
        const isNext = next && next.exp.id === exp.id;
        const node = el("button", "node " + (rec ? "done" : isNext ? "next" : "fresh"), wrap);
        node.type = "button";
        node.setAttribute("aria-label", exp.title + (rec ? "（クリア済み、" + rec.stars + " つ星）" : ""));
        node.innerHTML = rec ? ICONS.check : [ICONS.flask, ICONS.chart, ICONS.book][i % 3];
        node.setAttribute("aria-haspopup", "dialog");
        node.addEventListener("click", e => { e.stopPropagation(); togglePop(wrap, exp, m, rec, isNext); });
        if (isNext) { wrap.classList.add("has-bubble"); el("div", "node-bubble", wrap, Object.keys(state.done).length ? "次のステージ" : "スタート"); }
        el("div", "node-label", wrap, exp.title);
        if (rec) {
          const st = el("div", "node-stars", wrap);
          for (let s = 0; s < 3; s++) { st.insertAdjacentHTML("beforeend", STAR); if (s < rec.stars) st.lastChild.classList.add("on"); }
        }
      });
    });
    renderStats();
  }

  /*
   * 點節點先跳出說明卡，按卡上的「開始」才進關。
   * 以前一點就直接進關，在地圖上捲動、瀏覽時很容易誤觸，也沒有機會先看這一關是什麼。
   */
  function closePop() {
    document.querySelectorAll(".node-pop").forEach(n => n.remove());
    document.querySelectorAll(".node-wrap.open").forEach(n => n.classList.remove("open"));
  }
  function togglePop(wrap, exp, m, rec, isNext) {
    const wasOpen = wrap.classList.contains("open");
    closePop();
    if (wasOpen) return;
    wrap.classList.add("open");
    const pop = el("div", "node-pop" + (rec ? " done" : ""), wrap);
    pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", exp.title);
    pop.addEventListener("click", e => e.stopPropagation());
    el("h3", null, pop, exp.title);
    if (rec) {
      const st = el("div", "node-pop-stars", pop);
      for (let s = 0; s < 3; s++) { st.insertAdjacentHTML("beforeend", STAR); if (s < rec.stars) st.lastChild.classList.add("on"); }
      el("p", null, pop, rec.stars < 3 ? "もう一度やって、星 3 つを目指そう" : "星 3 つ取れています。復習にもう一度やってもかまいません。");
    } else {
      el("p", null, pop, m.title + " · 第 " + (m.experiments.indexOf(exp) + 1) + " / " + m.experiments.length + " ステージ" + (isNext ? "" : "（順番を飛ばして挑戦できます）"));
    }
    const go = el("button", "btn", pop, rec ? "もう一度" : "スタート");
    go.type = "button";
    go.addEventListener("click", () => { closePop(); openLesson(exp.id); });
    setTimeout(() => go.focus({ preventScroll: true }), 30);
    // 卡片在畫面外時捲進來
    requestAnimationFrame(() => {
      const r = pop.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 12) window.scrollBy({ top: r.bottom - window.innerHeight + 24, behavior: "smooth" });
    });
  }
  document.addEventListener("click", closePop);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && lesson.hidden) closePop(); });

  /* 回到地圖時：剛過的關卡跳一下、星星一顆顆亮起、下一關解鎖，底部提示可直接接著玩 */
  function celebrateOnMap(info) {
    const wrap = document.querySelector('.node-wrap[data-id="' + CSS.escape(info.id) + '"]');
    if (!wrap) return;
    wrap.scrollIntoView({ block: "center", behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    const node = wrap.querySelector(".node");
    wrap.classList.add("celebrate");
    if (node) node.classList.add("celebrate");
    const nx = info.nextId && document.querySelector('.node-wrap[data-id="' + CSS.escape(info.nextId) + '"]');
    if (nx && info.firstTime) nx.classList.add("unlock");
    setTimeout(() => { wrap.classList.remove("celebrate"); if (node) node.classList.remove("celebrate"); if (nx) nx.classList.remove("unlock"); }, 2600);
    showToast(info);
  }
  let toastTimer = 0;
  function showToast(info) {
    document.querySelectorAll(".toast").forEach(t => t.remove());
    clearTimeout(toastTimer);
    const nf = info.nextId && byId[info.nextId];
    const t = el("div", "toast", document.body);
    t.setAttribute("role", "status");
    const ic = el("span", "toast-ic", t); ic.innerHTML = STAR;
    const tx = el("div", "toast-txt", t);
    el("b", null, tx, "「" + byId[info.id].exp.title + "」" + info.stars + " つ星でクリア");
    el("span", null, tx, nf ? (info.firstTime ? "次のステージが開きました：" : "次のステージ：") + nf.exp.title : "+" + info.gained + " XP");
    if (nf) {
      const b = el("button", "btn primary small", t, "次のステージ");
      b.type = "button";
      b.addEventListener("click", () => { t.remove(); openLesson(nf.exp.id); });
    }
    toastTimer = setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, 6000);
  }

  /* ------------------------------ 錯題本 ------------------------------ */
  function renderReview() {
    const list = $("#review-list"); list.innerHTML = "";
    if (!state.mistakes.length) { el("div", "review-empty", list, "まちがえた問題はまだありません。まちがえると自動でここに入ります。"); return; }
    const groups = {};
    state.mistakes.forEach(m => { (groups[m.id] = groups[m.id] || []).push(m); });
    Object.keys(groups).forEach(id => {
      const f = byId[id]; if (!f) return;
      const g = el("article", "review-group", list);
      const h = el("div", "review-group-head", g);
      el("h2", null, h, f.exp.title);
      const redo = el("button", "btn blue small", h, "このステージをやり直す");
      redo.type = "button"; redo.addEventListener("click", () => openLesson(id));
      groups[id].forEach(m => {
        const it = el("div", "review-item", g);
        el("span", "review-kind", it, m.kind);
        el("p", "review-q", it, m.prompt);
        el("p", "review-a", it, "正解：" + m.answer);
        if (m.explain) el("p", "review-x", it, m.explain);
      });
    });
  }

  function showView(name) {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
    $("#view-map").hidden = name !== "map";
    $("#view-review").hidden = name !== "review";
    if (name === "review") renderReview(); else renderMap();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showView(t.dataset.view)));

  /* =======================================================================
     出題
     ======================================================================= */
  const KIND = {
    predict: ["predict", "場面の予想", '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>'],
    lab: ["lab", "実験の調整", ICONS.flask.replace("<svg ", '<svg ')],
    data: ["data", "データの読み取り", ICONS.chart],
    scenario: ["scenario", "場面の問題", '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>'],
    calc: ["calc", "計算問題", '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2M16 12v4"/></svg>'],
    reason: ["concept", "推論の問題", '<svg viewBox="0 0 24 24"><path d="M4 12h6M14 12h6M7 9v6M17 9v6"/></svg>'],
    concept: ["concept", "考え方の問題", ICONS.book]
  };

  const NICE = [[1, "比例"], [2, "2 乗に比例"], [0.5, "平方根に比例"], [-1, "反比例"], [-2, "2 乗に反比例"], [-0.5, "平方根に反比例"], [3, "3 乗に比例"]];
  function niceExponent(e) {
    if (e == null || !isFinite(e)) return null;
    const hit = NICE.find(([n]) => Math.abs(e - n) < 0.06);
    return hit ? hit[0] : null;
  }
  const relWord = (n, y, x) => {
    const hit = NICE.find(([k]) => k === n);
    if (n === 1) return "「" + y + "」は「" + x + "」に比例";
    if (n === -1) return "「" + y + "」は「" + x + "」に反比例";
    if (n === 2) return "「" + y + "」は「" + x + "」の 2 乗に比例";
    if (n === -2) return "「" + y + "」は「" + x + "」の 2 乗に反比例";
    if (n === 0.5) return "「" + y + "」は「" + x + "」の平方根に比例";
    if (n === -0.5) return "「" + y + "」は「" + x + "」の平方根に反比例";
    if (n === 3) return "「" + y + "」は「" + x + "」の 3 乗に比例";
    return hit ? hit[1] : "";
  };
  const factorText = f => {
    if (Math.abs(f - 1) < 1e-9) return "変わらない";
    if (f > 1) return "" + fmt(f) + " 倍";
    const inv = 1 / f;
    return Math.abs(inv - Math.round(inv)) < 1e-6 ? "はじめの 1/" + Math.round(inv) : "" + fmt(f) + " 倍";
  };
  const firstSentence = text => { const s = String(text || "").split(/[。；]/)[0]; return s ? s + "。" : ""; };

  function buildItems(f, S) {
    const { exp, mod } = f;
    const items = [];
    // 「模型判讀」「狀態」這類讀數是文字判定，不是可以拿來出題的物理量
    const qualitative = /判讀|狀態|判定|模式|提示|結論|是否|^4 人がそれぞれ「シミュレーションを見てわかったこと」を 1 文で書きました。「$|^τ = Iα は運動方程式の回転版です。慣性モーメントが大きいほど、回転の状態を変えにくくなります。$|^いくつかのデータをとってから読み取る$|^このまとめを消しました$|^つり合いの判断$|^つり合いは、力のモーメントの合計が 0 かどうかで判断する$|^ばね振り子がつり合いの位置を通る瞬間、エネルギーの状態はどうなっていますか？$|^ひとことでまとめると$|^まず 2 つの物体をひとまとめにして a を求め、f = m₁a で静止摩擦力が足りるか確かめます。$|^まず系が熱を吸収するのか放出するのかを区別し、状態量を 1 つ変えて温度・圧力・体積・エネルギーを見比べます。$|^まず系と基準面を決めます。摩擦や外力、弾性力があるときに、そのまま力学的エネルギー保存則を使えるかを判断します。$|^わからないときはヒント$|^エネルギーの大きさ、波長、量子数を変えて、測定値にしきい値があるか、とびとびになるか、確率的に散らばるかを見ます。$|^オフラインの状態を確認しています…$|^グラフの読み取り$|^データから保存や状態の変化を読み解く$|^データの読み取り$|^パラメータを 1 つ動かし、変化を見てから公式に戻って読み解きます。$|^ヒント $|^ヒントがほしい$|^ヒントはここまで$|^ヒントはこれで全部です$|^ヒントを見る$|^ヒント：$|^フル表示$|^フル表示に戻す：課題、手順、読み取りのヒントなどを表示します$|^メーターの測定範囲の状態$|^モデルの読み取り$|^モード$|^何度も振動してから自然に止まる状態$|^何度も測ると統計的なばらつきが読み取れる$|^作者が用意した最初の状態に戻します$|^使うときは名前、元のリンク、ライセンスのリンクを残し、内容を変えたかどうかも書いてください。$|^保存する$|^傾いたカーブでは、垂直抗力の水平成分が向心力になります。速さと傾きの角度を変えて、すべるかどうかを判断します。$|^光源の明るさと距離は分けて考える$|^公開モードです。検索エンジンがすべての内容をインデックスできます。$|^内部エネルギーは状態量$|^再生して、エネルギーの合計が保存されるか見てください。摩擦や非弾性衝突があると合計は減ります。$|^再生中にパラメータを変えると、いまの状態から続きます。「リセット」で最初に戻ります。$|^出典を書き、このページか元のサイトへのリンクを付け、改変したかどうかを書いてください。$|^分布とグラフから量子的な現象を読み解く$|^判断の結果$|^力の判断$|^動きの判断$|^単元データが見つかりません。js\/curriculum\.js を確認してください。$|^同じ時刻の運動エネルギー、位置エネルギー、失われたエネルギーを追いかけて、合計が一定かどうかを比べます。$|^回路の状態を変えてメーターを読む$|^壁にはたらく静止摩擦力$|^大学の熱力学：状態方程式、エントロピー、不可逆過程$|^学習の状況$|^干渉の状態$|^平均、ばらつき、残差で読み解く$|^摩擦係数を 0 にします。物体は力がなくても等速のままで、もともとの運動の状態を続けます。$|^操作のヒント：$|^次のヒント（$|^気体の状態$|^減衰が小さい（減衰振動の）とき、振動子の振幅と周期は時間とともにどう変わりますか？$|^温度は状態を表し、熱量は温度差によって移るエネルギー$|^温度は系の状態を表す量で、熱量はエネルギーが系の境界をこえて移る形の 1 つです。$|^演示モード$|^潜熱は状態を変えるのに使われる$|^物体はいまの状態を保とうとする$|^状態$|^目標に達すると自動でクリアになります。$|^系の状態と範囲を決める$|^系の範囲を決めてから、状態量を 1 つだけ変え、熱量と温度を追いかけます。$|^練習モード · そろう目盛りに印をつけません$|^自動車のサスペンション（ショックアブソーバー）の設計で、いちばん望ましい減衰の状態はどれですか？$|^衝突の前と後で速度と向きを比べます。どこまでを系とするか決めてから、合計が変わるかどうかを見ます。$|^説明モード · そろう目盛りに印をつけています$|^課題の説明、グラフの読み方のヒント、一歩ずつのガイド付き$|^距離センサーは一定時間ごとに人や台車の位置を記録します。そのまま位置－時間グラフが得られ、傾きから速度を読み取れます。$|^選択問題 · エネルギーの状態$|^選択問題 · グラフの読み取り$|^選択問題 · スペクトルの読み取り$|^選択問題 · 保存則の判断$|^選択問題 · 実験の読み取り$|^選択問題 · 比べて判断$|^選択問題 · 端での状態$|^選択問題 · 考え方の判断$|^選択問題 · 記号の読み取り$|^選択問題 · 誤差の読み取り$/;
    const rels = S ? S.relations.filter(r => r.s >= 0 && r.r >= 0 && S.sliders[r.s] && S.readouts[r.r] && !qualitative.test(S.readouts[r.r].label)) : [];
    const X = r => S.sliders[r.s], Y = r => S.readouts[r.r];
    const mono = rels.filter(r => (r.direction === "up" || r.direction === "down") && r.relative > 0.08)
      .sort((a, b) => b.relative - a.relative);
    const primary = S && S.primary >= 0 && S.relations[S.primary] && S.relations[S.primary].r >= 0 ? S.relations[S.primary] : mono[0];

    /* ① 情境預測：以探測引擎量到的主關係出題，先承諾、做完再揭曉 */
    // 只用「會變」的關係出預測題：暫停在 t=0 量到的「不變」常常只是還沒開始動（例如 v 還等於 v₀），
    // 拿來問「會怎麼變」會教錯觀念。
    const pr = primary && (primary.direction === "up" || primary.direction === "down") && primary.relative > 0.08 ? primary : mono[0];
    let prediction = null;
    if (pr) {
      const x = X(pr), y = Y(pr);
      const correct = pr.direction === "up" ? 0 : pr.direction === "down" ? 1 : 2;
      prediction = { rel: pr, correct };
      items.push({
        kind: "predict", noPenalty: true,
        title: exp.title,
        scenario: firstSentence(exp.concept),
        prompt: "まず予想：「" + x.label + "」を " + withUnit(pr.xs[0], x.unit) + " から " + withUnit(pr.xs[pr.xs.length - 1], x.unit) + " にすると、「" + y.label + "」はどう変わりますか？",
        note: "外れても減点はありません。次に実験台で確かめます。",
        options: ["大きくなる", "小さくなる", "ほとんど変わらない"], fixedOrder: true, correct, prediction
      });
    }

    /* ② 調整實驗題：把讀數調到目標值 */
    const target = mono[0] || rels.find(r => r.direction === "peak");
    if (target) {
      const x = X(target), y = Y(target);
      // 「調到最大」題：若預設就已經在最大值（例如安培力的夾角預設 90°），改出指定值題，免得一進來就過關
      const startY = S.current ? S.current[target.r] : null;
      const peakDone = target.direction === "peak" && startY != null && startY >= target.max * 0.97;
      if (target.direction === "peak" && !peakDone) {
        items.push({ kind: "lab", mode: "peak", rel: target, title: "「" + y.label + "」を最大にする",
          goal: "「" + x.label + "」を調整して、「" + y.label + "」が最大になる設定を見つけます（最大およそ " + withUnit(target.max, y.unit) + "）。",
          test: v => v >= target.max * 0.97, targetValue: target.max, prediction });
      } else {
        const lo = Math.min.apply(null, target.ys), hi = Math.max.apply(null, target.ys);
        /*
         * 目標一定要「只動這一根就調得到」。
         *
         * 第一版取行程 30% / 70% 的內插值再四捨五入成好看的數字，自動逐關驗證後發現
         * 185 個調整題有 52 個調不到：步進器、整數滑桿（諧波 n、匝數）一格一格跳，
         * 內插出來的值剛好落在兩格之間。改成直接用探測時滑桿真的停過的取樣點——
         * 那個讀數是模型在可達的設定下實際算出來的，一定調得到。
         * 取樣點選離預設值最遠的內側點（不選端點，避免「拉到底」就過關）。
         */
        const xi = (x.initial - x.min) / ((x.max - x.min) || 1) * (target.ys.length - 1);
        const i0 = Math.max(0, Math.min(target.ys.length - 2, Math.floor(xi)));
        const measured = S.current && S.current[target.r];
        const initialY = measured != null && isFinite(measured) ? measured : target.ys[i0] + (target.ys[i0 + 1] - target.ys[i0]) * (xi - i0);
        const tolFor = g => Number(Math.max(Math.abs(g) * 0.03, (hi - lo) * 0.01).toPrecision(2));
        const order = [1, 2, 3].concat([0, target.ys.length - 1])
          .filter(k => k < target.ys.length)
          .map(k => ({ k, g: Number(target.ys[k].toPrecision(3)) }))
          .sort((a, b) => (a.k === 0 || a.k === target.ys.length - 1) - (b.k === 0 || b.k === target.ys.length - 1) || Math.abs(b.g - initialY) - Math.abs(a.g - initialY));
        const chosen = order.find(o => Math.abs(o.g - initialY) > tolFor(o.g) * 1.5) || order[0];
        const goal = chosen.g;
        const tol = tolFor(goal);
        items.push({ kind: "lab", mode: "target", rel: target, title: "「" + y.label + "」の目標：" + withUnit(goal, y.unit),
          goal: "実験台でパラメータを調整して、「" + y.label + "」を <b>" + withUnit(goal, y.unit) + "</b> にします（誤差 ±" + fmt(tol) + (y.unit ? " " + y.unit : "") + " 以内）。",
          test: v => Math.abs(v - goal) <= tol, targetValue: goal, tol, prediction });
      }
    } else {
      items.push({ kind: "lab", mode: "explore", title: "実験台を自由に動かす", prediction,
        goal: (S && S.sliders.length ? "パラメータを " + Math.min(2, S.sliders.length) + " 個以上動かし" : "")
          + (S && S.start ? (S.sliders.length ? "、" : "") + "「" + S.start + "」を押すと何が起きるか見てみます。" : (S && S.sliders.length ? "、画面がどう変わるか見てみます。" : "実験台をよく見て、何が起きているかつかんでから進みます。")) });
    }

    const quiz = [];

    /* ③ 數據判讀：表格數字由模型算出 */
    const dataRel = mono.find(r => niceExponent(r.exponent) != null && r.xs.every(v => v > 0)) || mono[0];
    if (dataRel && dataRel.xs.length >= 5) {
      const x = X(dataRel), y = Y(dataRel);
      const n = niceExponent(dataRel.exponent);
      if (n != null && dataRel.xs.every(v => v > 0)) {
        const options = shuffle([n, ...shuffle(NICE.map(a => a[0]).filter(k => k !== n && k !== 3)).slice(0, 3)]);
        quiz.push({ kind: "data", title: "データから関係を見つける",
          prompt: "実験台で次のデータを記録しました（ほかの条件は固定）。「" + y.label + "」と「" + x.label + "」の関係に最も近いのはどれですか？",
          table: { head: [x.label + (x.unit ? "（" + x.unit + "）" : ""), y.label + (y.unit ? "（" + y.unit + "）" : "")], rows: dataRel.xs.map((v, i) => [fmt(v), fmt(dataRel.ys[i])]) },
          options: options.map(k => relWord(k, y.label, x.label)), correct: options.indexOf(n),
          explain: "「" + x.label + "」を何倍かにしたとき、「" + y.label + "」が何倍になるかを見ます：" + relWord(n, y.label, x.label) + "。" });
      } else {
        const k = 2;
        const ask = dataRel.xs[k], ans = dataRel.ys[k];
        const span = dataRel.ys[3] - dataRel.ys[1];
        const opts = [ans, dataRel.ys[1] - span, dataRel.ys[3] + span].map(Number);
        const uniq = opts.filter((v, i) => opts.findIndex(w => Math.abs(w - v) < Math.abs(span) * 0.05) === i);
        if (uniq.length === 3 && Math.abs(span) > 1e-9) {
          const order = shuffle(uniq);
          quiz.push({ kind: "data", title: "データから見積もる",
            prompt: "下の表は実験台で記録したデータです。「" + x.label + "」= " + withUnit(ask, x.unit) + " のとき、「" + y.label + "」はいくつくらいになりそうですか？",
            table: { head: [x.label + (x.unit ? "（" + x.unit + "）" : ""), y.label + (y.unit ? "（" + y.unit + "）" : "")],
              rows: [0, 1, 2, 3, 4].map(i => i === k ? [fmt(ask), "？"] : [fmt(dataRel.xs[i]), fmt(dataRel.ys[i])]), ask: k },
            options: order.map(v => withUnit(v, y.unit)), correct: order.indexOf(uniq[0]),
            explain: "データは単調なので、答えは前後の 2 つの値 " + withUnit(dataRel.ys[1], y.unit) + " と " + withUnit(dataRel.ys[3], y.unit) + " のあいだにあります。" });
        }
      }
    }

    /* ④ 比例推理（有乾淨冪次時） */
    const propRel = mono.find(r => niceExponent(r.exponent) != null && r !== dataRel) || (dataRel && niceExponent(dataRel.exponent) != null ? dataRel : null);
    if (propRel) {
      const n = niceExponent(propRel.exponent);
      const k = Math.abs(n) === 0.5 ? 4 : pick([2, 3]);
      const x = X(propRel), y = Y(propRel);
      const ans = Math.pow(k, n);
      const cand = [ans, Math.pow(k, -n), Math.pow(k, 2 * n), Math.pow(k, n / 2), k, 1];
      const uniq = cand.filter((v, i) => cand.findIndex(w => Math.abs(w - v) < 1e-9) === i).slice(0, 4);
      const order = shuffle(uniq);
      quiz.push({ kind: "reason", title: "比で考える",
        prompt: "ほかの条件は変えずに、「" + x.label + "」だけをはじめの " + k + " 倍にすると、「" + y.label + "」はどうなる？",
        options: order.map(factorText), correct: order.indexOf(ans),
        explain: relWord(n, y.label, x.label) + "。なので " + k + (n === 1 ? "" : (n > 0 ? "^" + n : "^(" + n + ")")) + " = " + factorText(ans).replace("", "") + "。" });
    }

    /* ⑤ 控制變因：找出「不影響」的那個參數 */
    const inv = S ? S.invariants.map(i => S.relations[i]).find(r => rels.indexOf(r) >= 0) || null : null;
    if (inv && inv.r >= 0 && inv.s >= 0) {
      const y = Y(inv);
      if (S.sliders.length >= 3) {
        const order = shuffle(S.sliders.map((s, i) => i)).slice(0, 4);
        if (order.indexOf(inv.s) < 0) order[0] = inv.s;
        const opts = shuffle(order);
        quiz.push({ kind: "scenario", title: "条件をそろえる",
          prompt: "クラスメートが言いました。「どのパラメータを変えても「" + y.label + "」は変わるよ。」でも、どう動かしても「" + y.label + "」がほとんど変わらないパラメータが 1 つあります。どれですか？",
          options: opts.map(i => S.sliders[i].label), correct: opts.indexOf(inv.s), canPeek: true,
          explain: "実験台で測った結果：「" + S.sliders[inv.s].label + "」を最小から最大まで動かしても、「" + y.label + "」はずっと " + withUnit(inv.first, y.unit) + " くらいのままでした。" });
      } else {
        quiz.push({ kind: "scenario", title: "条件をそろえる",
          prompt: "「" + S.sliders[inv.s].label + "」だけを変えて、ほかの条件は固定します。「" + y.label + "」はどうなりますか？",
          options: ["大きくなる", "小さくなる", "ほとんど変わらない"], fixedOrder: true, correct: 2, canPeek: true,
          explain: "実験台で測った結果：「" + y.label + "」はほとんど「" + S.sliders[inv.s].label + "」の影響を受けません。" });
      }
    }

    /* ⑥ 情境應用：把量到的關係放進一個需要做決定的情境 */
    const scRel = mono.find(r => r !== target) || mono[0] || null;
    if (scRel) {
      const x = X(scRel), y = Y(scRel);
      const wantUp = Math.random() < 0.5;
      const up = scRel.direction === "up";
      const correctText = (wantUp === up ? "「" + x.label + "」を大きくする" : "「" + x.label + "」を小さくする");
      const wrongText = (wantUp === up ? "「" + x.label + "」を小さくする" : "「" + x.label + "」を大きくする");
      const others = [correctText, wrongText];
      const flatSlider = inv && inv.r === scRel.r && inv.s >= 0 ? S.sliders[inv.s] : null;
      if (flatSlider) others.push("「" + flatSlider.label + "」を大きくする");
      others.push("パラメータは何も動かさず、何回もやって平均をとれば" + (wantUp ? "大きくなる" : "小さくなる"));
      const roles = ["科学展のブースで実演している", "実験の授業の準備をしている", "部活動で実験レポートを書いている", "先生の授業の演示を手伝っている"];
      const order = shuffle(others);
      quiz.push({ kind: "scenario", title: "場面の問題",
        prompt: "アンさんは" + pick(roles) + "「" + exp.title + "」の実験で、「" + y.label + "」をいまより" + (wantUp ? "大きく" : "小さく") + "したいと思っています。ただし一度に変えられるパラメータは 1 つだけです。効果があるのはどれですか？",
        options: order, correct: order.indexOf(correctText), canPeek: true,
        explain: "実験台で測った結果：「" + x.label + "」を大きくすると「" + y.label + "」が" + (up ? "大きくなる" : "小さくなる") + "。正解は" + correctText + "。平均をとると測定が正確になるだけで、結果そのものは変わりません。" });
    }

    /* ⑦ 主站題庫：逐題撰寫的題目（情境、實驗設計、誤差判讀）與每次數值不同的計算題 */
    (BANK[exp.id] || []).slice(0, 2).forEach(q => {
      const order = shuffle(q.options.map((_, i) => i));
      const isCalc = /計算|^電気料金は kWh で数えた電力量で決まる$/.test(q.type || "");
      quiz.push({ kind: isCalc ? "calc" : "scenario", title: (q.type || "").split("·").pop().trim() || "場面の問題",
        prompt: q.prompt, formula: q.formula ? plainTex(q.formula) : "",
        options: order.map(i => q.options[i]), correct: order.indexOf(q.correct), hint: q.hint, explain: q.answer });
    });
    if (buildNumeric) {
      const nq = buildNumeric(exp.id, Math.floor(Math.random() * 1e9));
      if (nq) quiz.push({ kind: "calc", numeric: true, title: "計算問題 · 毎回数値が変わる", prompt: nq.prompt, unit: nq.unit,
        answer: nq.answer, tolerance: nq.tolerance || 0.03, hint: nq.hint, explain: (nq.steps || []).join(" → ") });
    }

    /* 補位：數據不夠出題的實驗，用重點句與公式出觀念題。
       誘答一律取「其他單元」的敘述——同單元的重點常常也適用於本關（例如打點計時器的
       「點距等差增加代表等加速」放在等加速度題裡其實也對），會變成兩個正解。 */
    const far = FLAT.filter(o => o.mod.id !== mod.id);
    const usable = exp.points.filter(p => p && p.length >= 4);
    let added = 0;
    while (quiz.length < 3 && added < 2 && usable.length) {
      const right = usable.splice(Math.floor(Math.random() * usable.length), 1)[0];
      const wrong = shuffle(far).slice(0, 3).map(o => ({ p: pick(o.exp.points), t: o.exp.title }));
      const order = shuffle([{ p: right, ok: true }, ...wrong]);
      if (new Set(order.map(o => o.p)).size < 4) continue;
      quiz.push({ kind: "concept", title: "考え方の問題",
        prompt: "「" + exp.title + "」の実験の結論はどれですか？",
        options: order.map(o => o.p), correct: order.findIndex(o => o.ok),
        explain: "「" + right + "」がこのステージのポイントです。ほかの文はそれぞれ次の実験のものです：" + wrong.map(w => "「" + w.t + "」").join("、") + "。" });
      added++;
    }
    const formula = plainTex(exp.formula);
    if (quiz.length < 3 && formula && formula.length < 70) {
      const wrong = shuffle(far.filter(o => o.exp.formula)).map(o => ({ p: plainTex(o.exp.formula), t: o.exp.title }))
        .filter(o => o.p && o.p.length < 70 && o.p !== formula).slice(0, 3);
      if (wrong.length === 3) {
        const order = shuffle([{ p: formula, ok: true }, ...wrong]);
        quiz.push({ kind: "concept", title: "公式を見分ける",
          prompt: "「" + exp.title + "」で使う関係式はどれですか？",
          options: order.map(o => o.p), correct: order.findIndex(o => o.ok),
          explain: "ほかの 3 つは、それぞれ次の実験のものです：" + wrong.map(w => "「" + w.t + "」").join("、") + "。" });
      }
    }

    // 最多 6 題：先保證每種題型至少一題（計算題常排在最後，不能被截掉），再補滿
    const chosen = [];
    ["data", "reason", "scenario", "calc", "concept"].forEach(k => { const q = quiz.find(x => x.kind === k); if (q) chosen.push(q); });
    quiz.forEach(q => { if (chosen.length < 6 && chosen.indexOf(q) < 0) chosen.push(q); });
    // 題型不要連續重複：把同類題拆開
    const ordered = [];
    const pool = chosen.slice();
    while (pool.length) {
      const last = ordered[ordered.length - 1];
      const idx = pool.findIndex(q => !last || q.kind !== last.kind);
      ordered.push(pool.splice(idx < 0 ? 0 : idx, 1)[0]);
    }
    return items.concat(ordered);
  }

  /* =======================================================================
     關卡執行
     ======================================================================= */
  const L = { f: null, items: [], queue: [], index: 0, total: 0, mistakes: 0, answered: 0, lab: null, ready: false, selected: null, phase: "answer", poll: 0, current: null, predictionPick: null, retried: null, combo: 0, firstSeen: 0, firstRight: 0 };
  const lesson = $("#lesson"), main = $("#lesson-main"), labBox = $("#lesson-lab"), frame = $("#lab-frame");
  const foot = $("#lesson-foot"), feedback = $("#feedback"), btnCheck = $("#btn-check"), btnSkip = $("#btn-skip"), btnAgain = $("#btn-again");
  const comboEl = $("#lesson-combo");
  function setCombo(n) {
    L.combo = n;
    comboEl.hidden = n < 2;
    if (n >= 2) {
      $("#combo-n").textContent = "連続正解 " + n;
      comboEl.classList.remove("bump"); void comboEl.offsetWidth; comboEl.classList.add("bump");
    }
  }

  window.addEventListener("message", e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === "lab-height") frame.style.height = Math.max(380, Math.min(1400, e.data.height)) + "px";
    if (e.data.type === "lab-ready" && L.f && e.data.id === L.f.exp.id) labReady();
    if (e.data.type === "lab-error" && L.f && e.data.id === L.f.exp.id) labReady(true);
  });

  /*
   * 換 iframe 的網址要用 location.replace：直接改 src 會在瀏覽器歷史多塞一筆，
   * 學生按「上一頁」時退的是 iframe 而不是關卡，看起來像按了沒反應。
   */
  function setFrame(url) {
    try { frame.contentWindow.location.replace(url); } catch (e) { frame.src = url; }
  }

  function openLesson(id) {
    const f = byId[id]; if (!f) return;
    Object.assign(L, { f, items: [], queue: [], index: 0, total: 0, mistakes: 0, answered: 0, lab: null, ready: false, selected: null, phase: "answer", current: null, predictionPick: null, retried: null, firstSeen: 0, firstRight: 0, finishInfo: null });
    clearInterval(L.poll);
    closePop();
    document.querySelectorAll(".toast, .confetti").forEach(n => n.remove());
    lesson.classList.remove("finished", "answered-good");
    btnAgain.hidden = true;
    setCombo(0);
    document.body.classList.add("in-lesson");
    lesson.hidden = false;
    lesson.style.setProperty("--u", f.mod.color);
    main.innerHTML = '<div class="lab-loading"><div><div class="spinner"></div>「' + f.exp.title + '」の実験台を準備しています…</div></div>';
    labBox.hidden = true;
    $("#lesson-body").classList.remove("with-lab");
    setFoot("idle");
    $("#lesson-step").textContent = "準備中";
    $("#lesson-bar").style.width = "4%";
    frame.style.height = "520px";
    // 畫布高度上限：視窗高扣掉關卡頂欄與實驗台的播放列，整個實驗台一眼看得完
    const maxh = Math.max(240, Math.min(620, window.innerHeight - (window.innerWidth < 960 ? 330 : 240)));
    setFrame("embed.html?id=" + encodeURIComponent(id) + "&theme=light&maxh=" + maxh);
    clearTimeout(L.timeout);
    L.timeout = setTimeout(() => labReady(true), 9000);   // 載不到也要能出題（退回觀念題）
    if (decodeURIComponent(location.hash.slice(1)) !== id) history.pushState(null, "", "#" + id);
  }

  function labReady(failed) {
    if (L.ready) return;
    L.ready = true; clearTimeout(L.timeout);
    let S = null;
    try { L.lab = failed ? null : frame.contentWindow.DuoLab || null; S = L.lab ? L.lab.summary : null; } catch (e) { L.lab = null; }
    // 每次滑桿變動都立刻判定（只靠輪詢的話，快速拖過目標值會被漏掉）
    if (L.lab) { try { L.lab.onChange(() => { if (typeof L.onLabChange === "function") L.onLabChange(); }); } catch (e) {} }
    L.items = buildItems(L.f, S);
    L.queue = L.items.slice();
    L.total = L.items.length;
    next();
  }

  function closeLesson() {
    clearInterval(L.poll); clearTimeout(L.timeout);
    lesson.hidden = true; document.body.classList.remove("in-lesson");
    setFrame("about:blank");
    const info = L.finishInfo;
    L.f = null; L.finishInfo = null;
    lesson.classList.remove("finished", "answered-good");
    document.querySelectorAll(".confetti").forEach(n => n.remove());
    if (location.hash) history.pushState(null, "", location.pathname + location.search);
    renderMap();
    if (info) requestAnimationFrame(() => celebrateOnMap(info));
  }
  /* 離開確認：用自己的底部面板取代瀏覽器的 confirm（confirm 會凍結畫面，在手機上也很突兀） */
  function confirmLeave() {
    if (document.querySelector(".sheet-backdrop")) return;
    const back = el("div", "sheet-backdrop", document.body);
    const sh = el("div", "sheet", back);
    sh.setAttribute("role", "alertdialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-labelledby", "sheet-title");
    el("h3", null, sh, "ちょっと待って").id = "sheet-title";
    const left = L.queue.length + (L.phase === "answer" ? 1 : 0);
    el("p", null, sh, "このステージは" + (left > 0 ? "あと " + left + " 問" : "もうすぐ終わり") + "です。いまやめると、このステージの進み具合は保存されません。");
    const stay = el("button", "btn primary", sh, "続ける"); stay.type = "button";
    const leave = el("button", "btn ghost", sh, "このステージを出る"); leave.type = "button";
    const done = () => { back.remove(); document.removeEventListener("keydown", onKey, true); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); done(); } };
    document.addEventListener("keydown", onKey, true);
    stay.addEventListener("click", done);
    back.addEventListener("click", e => { if (e.target === back) done(); });
    leave.addEventListener("click", () => { done(); closeLesson(); });
    setTimeout(() => stay.focus(), 30);
  }
  $("#lesson-close").addEventListener("click", () => {
    if (L.phase === "done" || L.answered === 0) closeLesson(); else confirmLeave();
  });

  function setFoot(mode, title, text) {
    foot.hidden = false;
    foot.className = "lesson-foot" + (mode === "good" ? " good" : mode === "bad" ? " bad" : mode === "info" ? " info" : "");
    feedback.innerHTML = "";
    if (title) {
      const h = el("h4", null, feedback);
      h.innerHTML = mode === "good" ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>' : mode === "bad" ? '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.5"/></svg>';
      h.appendChild(document.createTextNode(title));
    }
    if (text) el("p", null, feedback, text);
  }
  function updateProgress() {
    const doneCount = L.total - L.queue.length;
    $("#lesson-bar").style.width = Math.max(4, Math.round(doneCount / Math.max(1, L.total) * 100)) + "%";
    $("#lesson-step").textContent = Math.min(L.total, doneCount + 1) + " / " + L.total;
  }

  function next() {
    clearInterval(L.poll);
    L.onLabChange = null;
    updateProgress();
    const item = L.queue.shift();
    if (!item) return finish();
    L.current = item; L.selected = null; L.phase = "answer";
    main.innerHTML = "";
    setFoot("idle");
    btnSkip.hidden = true;
    btnAgain.hidden = true;
    btnCheck.hidden = false;
    btnCheck.textContent = "答え合わせ"; btnCheck.disabled = true;
    lesson.classList.remove("answered-good");
    const [cls, label, icon] = KIND[item.kind] || KIND.concept;
    const kind = el("span", "q-kind " + cls, main);
    kind.innerHTML = icon; kind.appendChild(document.createTextNode(item.retry ? label + " · もう一度" : label));
    el("h2", "q-title", main, item.title);
    main.querySelector(".q-title").id = "lesson-title";

    const withLab = item.kind === "lab";
    labBox.hidden = !withLab;
    $("#lesson-body").classList.toggle("with-lab", withLab);
    if (withLab) return renderLab(item);

    if (item.scenario) {
      const sc = el("div", "q-scenario", main);
      el("span", "q-scenario-mark", sc, String(L.f.mi + 1));
      el("div", null, sc, item.scenario);
    }
    el("p", "q-prompt", main, item.prompt);
    if (item.formula) el("div", "q-formula", main, item.formula);
    if (item.note) el("p", "q-note", main, item.note);
    if (item.table) renderTable(item.table);

    if (item.numeric) {
      const row = el("div", "num-row", main);
      const input = el("input", "num-input", row);
      input.type = "text"; input.inputMode = "decimal"; input.autocomplete = "off"; input.placeholder = "数値を入力";
      input.setAttribute("aria-label", "あなたの答え");
      el("span", "num-unit", row, item.unit || "");
      input.addEventListener("input", () => { L.selected = input.value.trim(); btnCheck.disabled = !L.selected; });
      setTimeout(() => input.focus(), 50);
    } else {
      const box = el("div", "choices", main);
      box.setAttribute("role", "radiogroup");
      item.options.forEach((opt, i) => {
        const b = el("button", "choice", box);
        b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false");
        el("span", "choice-key", b, String(i + 1));
        el("span", "choice-text", b, opt);
        b.addEventListener("click", () => selectChoice(i));
      });
    }
    if (item.canPeek && L.lab) {
      const peek = el("button", "btn small peek", main, "実験台を見る");
      peek.type = "button";
      peek.addEventListener("click", () => {
        const on = labBox.hidden;
        labBox.hidden = !on; $("#lesson-body").classList.toggle("with-lab", on);
        peek.textContent = on ? "実験台をしまう" : "実験台を見る";
      });
    }
  }

  function renderTable(t) {
    const table = el("table", "data", main);
    const tr = el("tr", null, el("thead", null, table));
    t.head.forEach(h => el("th", null, tr, h));
    const tb = el("tbody", null, table);
    t.rows.forEach((r, i) => {
      const row = el("tr", null, tb);
      r.forEach(c => el("td", i === t.ask && c === "？" ? "ask" : null, row, c));
    });
  }

  function selectChoice(i) {
    if (L.phase !== "answer") return;
    L.selected = i;
    main.querySelectorAll(".choice").forEach((b, k) => { b.classList.toggle("selected", k === i); b.setAttribute("aria-checked", String(k === i)); });
    btnCheck.disabled = false;
  }

  /* ---------------- 調整實驗題 ---------------- */
  function renderLab(item) {
    const S = L.lab && L.lab.summary;
    const task = el("div", "task", main);
    el("h3", null, task, item.mode === "explore" ? "やること" : "目標").insertAdjacentHTML("afterbegin", item.mode === "explore" ? ICONS.flask : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>');
    const goal = el("p", "task-goal", task); goal.innerHTML = item.goal;
    const hints = el("div", "task-hints", task);
    const tools = el("div", "task-tools", task);

    if (item.mode === "explore") {
      const list = el("ul", "task-checklist", task);
      const need = S && S.sliders.length ? Math.min(2, S.sliders.length) : 0;
      const li1 = el("li", null, list, need ? "ちがうパラメータを " + need + " 個調整する" : "実験台を観察する");
      const li2 = el("li", null, list, "見えた変化を 1 つ言えるようにする");
      const start = S ? S.sliders.map((s, i) => L.lab.slider(i)) : [];
      const t0 = Date.now();
      const check = () => {
        const moved = S ? S.sliders.filter((s, i) => L.lab.slider(i) !== start[i]).length : 0;
        const ok1 = need ? moved >= need : Date.now() - t0 > 4000;
        li1.classList.toggle("ok", ok1);
        if (ok1) { li2.classList.add("ok"); btnCheck.disabled = false; btnCheck.textContent = "完了"; }
      };
      L.poll = setInterval(check, 300);
      btnCheck.textContent = "完了";
      return;
    }

    const rel = item.rel;
    const y = S.readouts[rel.r], x = S.sliders[rel.s];
    const live = el("div", "task-live", task);
    el("span", null, live, "いまの「" + y.label + "」");
    const now = el("strong", null, live, "—");
    const meter = el("div", "task-meter", task); const fill = el("i", null, meter);
    const range = Math.abs(rel.max - rel.min) || 1;
    let hit = false;
    const update = () => {
      const v = L.lab.read(rel.r);
      now.textContent = withUnit(v, y.unit);
      if (v == null) return;
      const ok = item.test(v);
      const ratio = item.mode === "peak" ? Math.max(0, Math.min(1, (v - rel.min) / range)) : Math.max(0, 1 - Math.abs(v - item.targetValue) / range);
      fill.style.width = Math.round(ratio * 100) + "%";
      task.classList.toggle("hit", ok);
      if (ok && !hit && L.phase === "answer") { hit = true; L.onLabChange = null; L.labValue = { x: L.lab.slider(rel.s), y: v }; resolve(true); }
    };
    L.poll = setInterval(update, 200);
    L.onLabChange = update;
    update();

    // 分層提示：先告訴你動哪一根，再給方向，最後給大約位置
    let level = 0;
    const lines = [
      "この問題で動かすのは「" + x.label + "」だけです。ほかのパラメータはさわりません（条件をそろえる）。",
      item.mode === "peak" ? "最小から最大へ、ゆっくり「" + x.label + "」を動かします。値はいったん上がってから下がるので、いちばん高い所が答えです。"
        : "「" + x.label + "」を大きくすると「" + y.label + "」が" + (rel.direction === "up" ? "大きくなる" : "小さくなる") + "。いまは" + ((L.lab.read(rel.r) || 0) < item.targetValue ? "大きくする向きに調整します" : "小さくする向きに調整します") + "。",
      "「" + x.label + "」はだいたい " + withUnit(estimateX(rel, item.targetValue), x.unit) + " くらいです。"
    ];
    const hintBtn = el("button", "btn small", tools, "ヒントがほしい");
    hintBtn.type = "button";
    hintBtn.addEventListener("click", () => {
      if (level >= lines.length) return;
      el("p", "task-hint", hints, lines[level]);
      if (level === 0) { try { L.lab.focus(rel.s); } catch (e) {} }
      level++;
      if (level >= lines.length) {
        hintBtn.disabled = true; hintBtn.textContent = "ヒントはここまで";
        setFoot("info", "それでも合わない？", "スキップしてもかまいません。この問題はミス 1 回として記録されます。");
        btnSkip.hidden = false;
      }
    });
    const resetBtn = el("button", "btn small ghost", tools, "実験台をリセット");
    resetBtn.type = "button";
    resetBtn.addEventListener("click", () => { try { L.lab.reset(); } catch (e) {} });
    btnCheck.textContent = "答え合わせ";
    btnCheck.disabled = true;
    btnCheck.hidden = true;   // 調整題是即時判定，不需要按「檢查」；底部列先收起，把空間讓給實驗台
    foot.hidden = true;
    el("p", "q-note task-auto", task, "目標に達すると自動でクリアになります。");
  }
  function estimateX(rel, yTarget) {
    for (let i = 1; i < rel.xs.length; i++) {
      const a = rel.ys[i - 1], b = rel.ys[i];
      if ((yTarget - a) * (yTarget - b) <= 0 && a !== b) return rel.xs[i - 1] + (rel.xs[i] - rel.xs[i - 1]) * (yTarget - a) / (b - a);
    }
    return rel.xs[Math.floor(rel.xs.length / 2)];
  }

  /* ---------------- 判定 ---------------- */
  function check() {
    if (L.phase === "result") { next(); return; }
    if (L.phase === "done") return;
    const item = L.current;
    if (item.kind === "lab") {
      if (item.mode === "explore") return resolve(true);
      return;   // 調整題由即時判定處理
    }
    if (L.selected == null) return;
    let ok;
    if (item.numeric) {
      const v = Number(String(L.selected).replace(/[，,]/g, "").replace(/[^\d.eE+-]/g, ""));
      ok = isFinite(v) && Math.abs(v - item.answer) <= Math.abs(item.answer) * item.tolerance;
    } else {
      ok = L.selected === item.correct;
    }
    resolve(ok);
  }

  function resolve(ok) {
    const item = L.current;
    clearInterval(L.poll);
    L.phase = "result";
    L.answered++;
    btnSkip.hidden = true;
    main.querySelectorAll(".choice").forEach((b, k) => {
      b.disabled = true;
      if (item.kind !== "predict" && k === item.correct) b.classList.add("right");
      if (k === L.selected && !ok && item.kind !== "predict") b.classList.add("wrong");
    });
    btnCheck.hidden = false;
    btnCheck.disabled = false;
    btnCheck.textContent = "続ける";

    if (item.kind === "predict") {
      L.predictionPick = L.selected;
      setFoot("info", "記録しました：「" + item.options[L.selected] + "」", "次は実験台で確かめます。");
      return;
    }
    if (item.kind === "lab") {
      clearInterval(L.poll);
      let text = "";
      if (item.mode !== "explore" && L.labValue) {
        const S = L.lab.summary, x = S.sliders[item.rel.s], y = S.readouts[item.rel.r];
        text = "「" + x.label + "」= " + withUnit(L.labValue.x, x.unit) + " のとき、「" + y.label + "」= " + withUnit(L.labValue.y, y.unit) + "。";
      }
      if (item.prediction && L.predictionPick != null) {
        const p = item.prediction, S = L.lab.summary;
        const truth = ["大きくなる", "小さくなる", "ほとんど変わらない"][p.correct];
        text += " さっきの予想：あなたは「" + ["大きくなる", "小さくなる", "ほとんど変わらない"][L.predictionPick] + "」を選びました。実験の結果は「" + S.readouts[p.rel.r].label + "」が" + truth +
          (L.predictionPick === p.correct ? "。当たりです。" : "。予想とは違いました。この結果を覚えておいてください。");
      }
      setFoot("good", item.mode === "explore" ? "よくできました" : "目標達成", text);
      return;
    }
    if (!item.retry) { L.firstSeen++; if (ok) L.firstRight++; }
    if (ok) {
      setCombo(L.combo + 1);
      lesson.classList.add("answered-good");
      setFoot("good", L.combo >= 3 ? "連続正解 " + L.combo + " 問" : pick(["正解", "その調子", "正解です"]), item.explain || "");
    } else {
      setCombo(0);
      L.mistakes++;
      const answerText = item.numeric ? withUnit(item.answer, item.unit) : item.options[item.correct];
      setFoot("bad", "正しい答え：" + answerText, item.explain || item.hint || "");
      recordMistake(item, answerText);
      // 答錯的題目排到最後再出一次，直到答對為止（選項順序每次重排，避免背位置）
      {
        const again = Object.assign({}, item, { retry: true });
        if (!item.numeric && !item.fixedOrder) {
          const order = shuffle(item.options.map((_, i) => i));
          again.options = order.map(i => item.options[i]);
          again.correct = order.indexOf(item.correct);
        }
        L.queue.push(again); L.total++;
      }
    }
    if (ok && item.retry) clearMistake(item);
  }

  function skipLab() {
    // 提示用完仍做不到：給出參考做法再繼續，但這題算一次失誤
    const item = L.current;
    clearInterval(L.poll);
    L.phase = "result"; L.answered++; L.mistakes++;
    setCombo(0);
    btnSkip.hidden = true;
    const S = L.lab.summary, x = S.sliders[item.rel.s];
    setFoot("bad", "この問題はスキップ", "参考：「" + x.label + "」を約 " + withUnit(estimateX(item.rel, item.targetValue), x.unit) + " にします。次にまた挑戦してください。");
    btnCheck.hidden = false; btnCheck.disabled = false; btnCheck.textContent = "続ける";
  }

  function recordMistake(item, answerText) {
    const prompt = item.prompt || item.title;
    if (state.mistakes.some(m => m.id === L.f.exp.id && m.prompt === prompt)) return;
    state.mistakes.unshift({ id: L.f.exp.id, kind: (KIND[item.kind] || KIND.concept)[1], prompt, answer: answerText, explain: item.explain || "" });
    state.mistakes = state.mistakes.slice(0, 80);
    save(); renderStats();
  }
  function clearMistake(item) {
    const prompt = item.prompt || item.title;
    state.mistakes = state.mistakes.filter(m => !(m.id === L.f.exp.id && m.prompt === prompt));
    save(); renderStats();
  }

  function finish() {
    L.phase = "done";
    $("#lesson-bar").style.width = "100%";
    $("#lesson-step").textContent = "完了";
    comboEl.hidden = true;
    labBox.hidden = true; $("#lesson-body").classList.remove("with-lab");
    lesson.classList.remove("answered-good");
    lesson.classList.add("finished");
    const stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1;
    const gained = 10 + stars * 5;
    const prev = state.done[L.f.exp.id];
    state.done[L.f.exp.id] = { stars: Math.max(stars, prev ? prev.stars : 0), at: Date.now() };
    state.xp += gained;
    const t = today();
    if (state.streak.last !== t) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yt = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
      state.streak.count = state.streak.last === yt ? state.streak.count + 1 : 1;
      state.streak.last = t;
    }
    save(); renderStats();

    // 答對率只算「第一次作答」：重出的題目答對不會把比例灌水
    const acc = L.firstSeen ? Math.round(L.firstRight / L.firstSeen * 100) : 100;
    const nx = FLAT[L.f.order + 1];
    L.finishInfo = { id: L.f.exp.id, stars, gained, firstTime: !prev, nextId: nx ? nx.exp.id : null };

    main.innerHTML = "";
    const r = el("div", "result", main);
    const badge = el("div", "result-badge", r);
    el("div", "medal", badge).innerHTML = stars === 3 ? '<svg viewBox="0 0 24 24"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z" fill="#fff" stroke="none"/></svg>' : ICONS.check;
    const st = el("div", "result-stars", r);
    st.setAttribute("aria-label", stars + " つ星");
    for (let i = 0; i < 3; i++) { st.insertAdjacentHTML("beforeend", STAR); if (i < stars) st.lastChild.classList.add("on"); }
    el("h2", "", r, stars === 3 ? "パーフェクト" : stars === 2 ? "クリア" : "クリア").id = "lesson-title";
    el("p", "result-sub", r, stars === 3 ? "1 問もまちがえませんでした。" : stars === 2 ? "あと少しでした。もう一度やれば星 3 つが取れます。" : "まちがえた問題は「まちがえた問題」に入れました。もう一度やると、もっと確実になります。");
    const grid = el("div", "result-grid", r);
    const cells = [
      ["xp", "獲得 XP", gained, '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>', ""],
      ["acc", "正答率", acc, '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"/></svg>', "%"],
      ["streak", "連続日数", state.streak.count, '<svg viewBox="0 0 24 24"><path d="M12 2c1 3.5 5 5.6 5 10.4A5 5 0 0 1 12 22a5 5 0 0 1-5-5c0-2.6 1.5-4.1 2.6-5.3.3 1.6 1 2.6 2 3.1C11 12 10.4 7 12 2z"/></svg>', ""]
    ];
    cells.forEach(([cls, label, v, icon, suffix]) => {
      const c = el("div", "result-cell " + cls, grid);
      el("span", null, c, label);
      const b = el("b", null, c); b.innerHTML = icon;
      const num = el("em", null, b, "0" + suffix); num.style.fontStyle = "normal";
      countUp(num, v, suffix, 700);
    });
    const take = el("p", "result-take", r);
    el("small", null, take, "このステージで覚えておくこと");
    take.appendChild(document.createTextNode(L.f.exp.points[0] || firstSentence(L.f.exp.concept)));
    const links = el("div", "result-links", r);
    if (nx) {
      const go = el("button", "result-link", links, "次のステージへ：" + nx.exp.title + " ›");
      go.type = "button";
      go.addEventListener("click", () => openLesson(nx.exp.id));
    }
    const link = el("a", "result-link", links, "フル版を開く（考え方、公式、ワークシート）");
    link.href = "../#" + L.f.exp.id;
    confetti(stars);

    setFoot("idle");
    btnAgain.hidden = false;
    btnCheck.hidden = false;
    btnCheck.disabled = false;
    btnCheck.textContent = "続ける";
    setTimeout(() => btnCheck.focus({ preventScroll: true }), 60);
  }

  function countUp(node, to, suffix, ms) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = to + suffix; return; }
    const t0 = performance.now() + 250;
    const tick = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / ms));
      node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function confetti(stars) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = el("div", "confetti", document.body);
    box.setAttribute("aria-hidden", "true");
    const colors = ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#ce82ff", "#ff9600"];
    const n = 30 + stars * 15;
    for (let i = 0; i < n; i++) {
      const c = el("i", null, box);
      c.style.setProperty("--x", (Math.random() * 100) + "vw");
      c.style.setProperty("--w", (6 + Math.random() * 6) + "px");
      c.style.setProperty("--c", colors[i % colors.length]);
      c.style.setProperty("--d", (1.8 + Math.random() * 1.6) + "s");
      c.style.setProperty("--delay", (Math.random() * 0.5) + "s");
      c.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
      c.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
    }
    setTimeout(() => box.remove(), 4200);
  }

  btnCheck.addEventListener("click", () => {
    // 過關後回地圖看成果與解鎖動畫，不直接把學生丟進下一關
    if (L.phase === "done") { closeLesson(); return; }
    check();
  });
  btnSkip.addEventListener("click", skipLab);
  btnAgain.addEventListener("click", () => { if (L.f) openLesson(L.f.exp.id); });

  document.addEventListener("keydown", e => {
    if (lesson.hidden || document.querySelector(".sheet-backdrop")) return;
    if (e.target && e.target.tagName === "INPUT" && e.key !== "Enter") return;
    if (e.key === "Escape") { $("#lesson-close").click(); return; }
    // 焦點在按鈕上時 Enter 會由瀏覽器觸發那顆按鈕；再補一次 click 會把「檢查」和「繼續」連按兩下，
    // 學生就看不到對錯回饋。只有焦點不在按鈕上時才代按主按鈕。
    if (e.key === "Enter") {
      if (e.target && e.target.closest && e.target.closest("button, a")) return;
      if (!btnCheck.disabled && !btnCheck.hidden) { e.preventDefault(); btnCheck.click(); }
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= 6 && L.phase === "answer" && L.current && L.current.options && n <= L.current.options.length) selectChoice(n - 1);
  });

  /* ------------------------------ 啟動 ------------------------------ */
  renderMap();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && byId[hash]) openLesson(hash);
  /*
   * 瀏覽器「上一頁」：開關卡時網址會帶 #實驗 id。以前按上一頁網址變了但關卡畫面還開著，
   * 再按一次關卡的 ✕ 又會把網址改回去，兩邊對不上。這裡讓網址成為唯一的依據。
   */
  // pushState 建立的歷史紀錄來回切換只會觸發 popstate，手動改網址才會觸發 hashchange——兩個都要聽
  function syncFromUrl() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && byId[id]) { if (!L.f || L.f.exp.id !== id) openLesson(id); }
    else if (L.f) closeLesson();
  }
  window.addEventListener("hashchange", syncFromUrl);
  window.addEventListener("popstate", syncFromUrl);

  // 給自動測試用：不經過畫面直接檢查出題結果
  window.DuoDebug = { buildItems: (id, S) => buildItems(byId[id], S), state, get current() { return L.current; }, get phase() { return L.phase; } };
})();
