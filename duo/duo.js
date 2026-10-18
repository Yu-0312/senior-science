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
  if (!C || !C.modules) { document.body.textContent = "課程資料載入失敗，請重新整理。"; return; }

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
      const t = el("div", "continue-text", cont);
      el("p", null, t, Object.keys(state.done).length ? "接著上次的進度" : "從第一關開始");
      el("h2", null, t, next.exp.title);
      const go = el("button", "btn primary", cont, Object.keys(state.done).length ? "繼續" : "開始");
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
      el("div", "unit-kicker", body, "第 " + (mi + 1) + " 單元 · " + m.track);
      el("h2", null, body, m.title);
      el("p", null, body, m.intro);
      const meter = el("div", "unit-meter", head);
      meter.style.setProperty("--p", Math.round(done / m.experiments.length * 100) + "%");
      el("span", null, meter, done + "/" + m.experiments.length);

      const path = el("div", "path", unit);
      m.experiments.forEach((exp, i) => {
        const wrap = el("div", "node-wrap", path);
        wrap.style.setProperty("--dx", Math.round(Math.sin(i * 0.9) * 70) + "px");
        const rec = state.done[exp.id];
        const isNext = next && next.exp.id === exp.id;
        const node = el("button", "node " + (rec ? "done" : isNext ? "next" : "fresh"), wrap);
        node.type = "button";
        node.setAttribute("aria-label", exp.title + (rec ? "（已通過，" + rec.stars + " 星）" : ""));
        node.innerHTML = rec ? ICONS.check : [ICONS.flask, ICONS.chart, ICONS.book][i % 3];
        node.addEventListener("click", () => openLesson(exp.id));
        if (isNext) { wrap.classList.add("has-bubble"); el("div", "node-bubble", wrap, Object.keys(state.done).length ? "下一關" : "開始"); }
        el("div", "node-label", wrap, exp.title);
        if (rec) {
          const st = el("div", "node-stars", wrap);
          for (let s = 0; s < 3; s++) { st.insertAdjacentHTML("beforeend", STAR); if (s < rec.stars) st.lastChild.classList.add("on"); }
        }
      });
    });
    renderStats();
  }

  /* ------------------------------ 錯題本 ------------------------------ */
  function renderReview() {
    const list = $("#review-list"); list.innerHTML = "";
    if (!state.mistakes.length) { el("div", "review-empty", list, "目前沒有錯題。答錯的題目會自動收進這裡。"); return; }
    const groups = {};
    state.mistakes.forEach(m => { (groups[m.id] = groups[m.id] || []).push(m); });
    Object.keys(groups).forEach(id => {
      const f = byId[id]; if (!f) return;
      const g = el("article", "review-group", list);
      const h = el("div", "review-group-head", g);
      el("h2", null, h, f.exp.title);
      const redo = el("button", "btn blue small", h, "重練這關");
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
    predict: ["predict", "情境預測", '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>'],
    lab: ["lab", "調整實驗", ICONS.flask.replace("<svg ", '<svg ')],
    data: ["data", "數據判讀", ICONS.chart],
    scenario: ["scenario", "情境題", '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></svg>'],
    calc: ["calc", "計算題", '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2M16 12v4"/></svg>'],
    reason: ["concept", "推理題", '<svg viewBox="0 0 24 24"><path d="M4 12h6M14 12h6M7 9v6M17 9v6"/></svg>'],
    concept: ["concept", "觀念題", ICONS.book]
  };

  const NICE = [[1, "成正比"], [2, "與平方成正比"], [0.5, "與平方根成正比"], [-1, "成反比"], [-2, "與平方成反比"], [-0.5, "與平方根成反比"], [3, "與三次方成正比"]];
  function niceExponent(e) {
    if (e == null || !isFinite(e)) return null;
    const hit = NICE.find(([n]) => Math.abs(e - n) < 0.06);
    return hit ? hit[0] : null;
  }
  const relWord = (n, y, x) => {
    const hit = NICE.find(([k]) => k === n);
    if (n === 1) return "「" + y + "」與「" + x + "」成正比";
    if (n === -1) return "「" + y + "」與「" + x + "」成反比";
    if (n === 2) return "「" + y + "」與「" + x + "」的平方成正比";
    if (n === -2) return "「" + y + "」與「" + x + "」的平方成反比";
    if (n === 0.5) return "「" + y + "」與「" + x + "」的平方根成正比";
    if (n === -0.5) return "「" + y + "」與「" + x + "」的平方根成反比";
    if (n === 3) return "「" + y + "」與「" + x + "」的三次方成正比";
    return hit ? hit[1] : "";
  };
  const factorText = f => {
    if (Math.abs(f - 1) < 1e-9) return "不變";
    if (f > 1) return "變為 " + fmt(f) + " 倍";
    const inv = 1 / f;
    return Math.abs(inv - Math.round(inv)) < 1e-6 ? "變為原來的 1/" + Math.round(inv) : "變為 " + fmt(f) + " 倍";
  };
  const firstSentence = text => { const s = String(text || "").split(/[。；]/)[0]; return s ? s + "。" : ""; };

  function buildItems(f, S) {
    const { exp, mod } = f;
    const items = [];
    // 「模型判讀」「狀態」這類讀數是文字判定，不是可以拿來出題的物理量
    const qualitative = /判讀|狀態|判定|模式|提示|結論|是否/;
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
        prompt: "先猜猜看：把「" + x.label + "」從 " + withUnit(pr.xs[0], x.unit) + " 調到 " + withUnit(pr.xs[pr.xs.length - 1], x.unit) + "，「" + y.label + "」會怎麼變？",
        note: "猜錯不扣分。下一步你會在實驗台上親手驗證。",
        options: ["變大", "變小", "幾乎不變"], fixedOrder: true, correct, prediction
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
        items.push({ kind: "lab", mode: "peak", rel: target, title: "把「" + y.label + "」調到最大",
          goal: "調整「" + x.label + "」，找出讓「" + y.label + "」最大的設定（最大約 " + withUnit(target.max, y.unit) + "）。",
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
        items.push({ kind: "lab", mode: "target", rel: target, title: "把「" + y.label + "」調到 " + withUnit(goal, y.unit),
          goal: "在實驗台上調整參數，讓「" + y.label + "」等於 <b>" + withUnit(goal, y.unit) + "</b>（誤差 ±" + fmt(tol) + (y.unit ? " " + y.unit : "") + " 內）。",
          test: v => Math.abs(v - goal) <= tol, targetValue: goal, tol, prediction });
      }
    } else {
      items.push({ kind: "lab", mode: "explore", title: "動手玩實驗台", prediction,
        goal: S && S.sliders.length ? "至少調整 " + Math.min(2, S.sliders.length) + " 個參數，並按「播放」看看會發生什麼。" : "按「播放」觀察實驗台，看清楚發生了什麼再繼續。" });
    }

    const quiz = [];

    /* ③ 數據判讀：表格數字由模型算出 */
    const dataRel = mono.find(r => niceExponent(r.exponent) != null && r.xs.every(v => v > 0)) || mono[0];
    if (dataRel && dataRel.xs.length >= 5) {
      const x = X(dataRel), y = Y(dataRel);
      const n = niceExponent(dataRel.exponent);
      if (n != null && dataRel.xs.every(v => v > 0)) {
        const options = shuffle([n, ...shuffle(NICE.map(a => a[0]).filter(k => k !== n && k !== 3)).slice(0, 3)]);
        quiz.push({ kind: "data", title: "看數據找關係",
          prompt: "實驗台記錄到下面這組數據（其他條件固定）。「" + y.label + "」和「" + x.label + "」的關係最接近？",
          table: { head: [x.label + (x.unit ? "（" + x.unit + "）" : ""), y.label + (y.unit ? "（" + y.unit + "）" : "")], rows: dataRel.xs.map((v, i) => [fmt(v), fmt(dataRel.ys[i])]) },
          options: options.map(k => relWord(k, y.label, x.label)), correct: options.indexOf(n),
          explain: "把「" + x.label + "」放大幾倍，看「" + y.label + "」放大幾倍：" + relWord(n, y.label, x.label) + "。" });
      } else {
        const k = 2;
        const ask = dataRel.xs[k], ans = dataRel.ys[k];
        const span = dataRel.ys[3] - dataRel.ys[1];
        const opts = [ans, dataRel.ys[1] - span, dataRel.ys[3] + span].map(Number);
        const uniq = opts.filter((v, i) => opts.findIndex(w => Math.abs(w - v) < Math.abs(span) * 0.05) === i);
        if (uniq.length === 3 && Math.abs(span) > 1e-9) {
          const order = shuffle(uniq);
          quiz.push({ kind: "data", title: "從數據推估",
            prompt: "下表是實驗台記錄的數據。當「" + x.label + "」= " + withUnit(ask, x.unit) + " 時，「" + y.label + "」最可能是多少？",
            table: { head: [x.label + (x.unit ? "（" + x.unit + "）" : ""), y.label + (y.unit ? "（" + y.unit + "）" : "")],
              rows: [0, 1, 2, 3, 4].map(i => i === k ? [fmt(ask), "？"] : [fmt(dataRel.xs[i]), fmt(dataRel.ys[i])]), ask: k },
            options: order.map(v => withUnit(v, y.unit)), correct: order.indexOf(uniq[0]),
            explain: "數據是單調的：答案一定落在前後兩筆 " + withUnit(dataRel.ys[1], y.unit) + " 與 " + withUnit(dataRel.ys[3], y.unit) + " 之間。" });
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
      quiz.push({ kind: "reason", title: "比例推理",
        prompt: "其他條件都不變，只把「" + x.label + "」變為原來的 " + k + " 倍，「" + y.label + "」會？",
        options: order.map(factorText), correct: order.indexOf(ans),
        explain: relWord(n, y.label, x.label) + "，所以變為 " + k + (n === 1 ? "" : (n > 0 ? "^" + n : "^(" + n + ")")) + " = " + factorText(ans).replace("變為 ", "") + "。" });
    }

    /* ⑤ 控制變因：找出「不影響」的那個參數 */
    const inv = S ? S.invariants.map(i => S.relations[i]).find(r => rels.indexOf(r) >= 0) || null : null;
    if (inv && inv.r >= 0 && inv.s >= 0) {
      const y = Y(inv);
      if (S.sliders.length >= 3) {
        const order = shuffle(S.sliders.map((s, i) => i)).slice(0, 4);
        if (order.indexOf(inv.s) < 0) order[0] = inv.s;
        const opts = shuffle(order);
        quiz.push({ kind: "scenario", title: "控制變因",
          prompt: "同學說：「只要改任何一個參數，「" + y.label + "」都會跟著變。」其實有一個參數不管怎麼調，「" + y.label + "」幾乎都不會變。是哪一個？",
          options: opts.map(i => S.sliders[i].label), correct: opts.indexOf(inv.s), canPeek: true,
          explain: "實驗台實測：「" + S.sliders[inv.s].label + "」從最小調到最大，「" + y.label + "」都維持在 " + withUnit(inv.first, y.unit) + " 左右。" });
      } else {
        quiz.push({ kind: "scenario", title: "控制變因",
          prompt: "只改變「" + S.sliders[inv.s].label + "」，其他條件固定。「" + y.label + "」會怎樣？",
          options: ["變大", "變小", "幾乎不變"], fixedOrder: true, correct: 2, canPeek: true,
          explain: "實驗台實測：「" + y.label + "」幾乎不受「" + S.sliders[inv.s].label + "」影響。" });
      }
    }

    /* ⑥ 情境應用：把量到的關係放進一個需要做決定的情境 */
    const scRel = mono.find(r => r !== target) || mono[0] || null;
    if (scRel) {
      const x = X(scRel), y = Y(scRel);
      const wantUp = Math.random() < 0.5;
      const up = scRel.direction === "up";
      const correctText = (wantUp === up ? "把「" + x.label + "」調大" : "把「" + x.label + "」調小");
      const wrongText = (wantUp === up ? "把「" + x.label + "」調小" : "把「" + x.label + "」調大");
      const others = [correctText, wrongText];
      const flatSlider = inv && inv.r === scRel.r && inv.s >= 0 ? S.sliders[inv.s] : null;
      if (flatSlider) others.push("把「" + flatSlider.label + "」調大");
      others.push("任何參數都不用動，多做幾次取平均就會" + (wantUp ? "變大" : "變小"));
      const roles = ["在科展攤位示範", "在實驗課準備器材", "在社團寫實驗報告", "幫老師準備課堂演示"];
      const order = shuffle(others);
      quiz.push({ kind: "scenario", title: "情境題",
        prompt: "小安" + pick(roles) + "「" + exp.title + "」。他希望「" + y.label + "」比現在" + (wantUp ? "大" : "小") + "一些，而且一次只能改一個參數。哪個做法有效？",
        options: order, correct: order.indexOf(correctText), canPeek: true,
        explain: "實驗台實測：「" + x.label + "」增加時「" + y.label + "」" + (up ? "變大" : "變小") + "，所以要" + correctText + "。取平均只會讓量測更準，不會改變結果本身。" });
    }

    /* ⑦ 主站題庫：逐題撰寫的題目（情境、實驗設計、誤差判讀）與每次數值不同的計算題 */
    (BANK[exp.id] || []).slice(0, 2).forEach(q => {
      const order = shuffle(q.options.map((_, i) => i));
      const isCalc = /計算/.test(q.type || "");
      quiz.push({ kind: isCalc ? "calc" : "scenario", title: (q.type || "").split("·").pop().trim() || "情境題",
        prompt: q.prompt, formula: q.formula ? plainTex(q.formula) : "",
        options: order.map(i => q.options[i]), correct: order.indexOf(q.correct), hint: q.hint, explain: q.answer });
    });
    if (buildNumeric) {
      const nq = buildNumeric(exp.id, Math.floor(Math.random() * 1e9));
      if (nq) quiz.push({ kind: "calc", numeric: true, title: "計算題 · 每次數值不同", prompt: nq.prompt, unit: nq.unit,
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
      quiz.push({ kind: "concept", title: "觀念題",
        prompt: "下列哪一句是「" + exp.title + "」這個實驗的結論？",
        options: order.map(o => o.p), correct: order.findIndex(o => o.ok),
        explain: "「" + right + "」是本關的重點；其他敘述分別來自" + wrong.map(w => "「" + w.t + "」").join("、") + "。" });
      added++;
    }
    const formula = plainTex(exp.formula);
    if (quiz.length < 3 && formula && formula.length < 70) {
      const wrong = shuffle(far.filter(o => o.exp.formula)).map(o => ({ p: plainTex(o.exp.formula), t: o.exp.title }))
        .filter(o => o.p && o.p.length < 70 && o.p !== formula).slice(0, 3);
      if (wrong.length === 3) {
        const order = shuffle([{ p: formula, ok: true }, ...wrong]);
        quiz.push({ kind: "concept", title: "認公式",
          prompt: "做「" + exp.title + "」時，會用到下列哪一組關係式？",
          options: order.map(o => o.p), correct: order.findIndex(o => o.ok),
          explain: "其他三組分別屬於" + wrong.map(w => "「" + w.t + "」").join("、") + "。" });
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
  const L = { f: null, items: [], queue: [], index: 0, total: 0, mistakes: 0, answered: 0, lab: null, ready: false, selected: null, phase: "answer", poll: 0, current: null, predictionPick: null, retried: null };
  const lesson = $("#lesson"), main = $("#lesson-main"), labBox = $("#lesson-lab"), frame = $("#lab-frame");
  const foot = $("#lesson-foot"), feedback = $("#feedback"), btnCheck = $("#btn-check"), btnSkip = $("#btn-skip");

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
    Object.assign(L, { f, items: [], queue: [], index: 0, total: 0, mistakes: 0, answered: 0, lab: null, ready: false, selected: null, phase: "answer", current: null, predictionPick: null, retried: null });
    clearInterval(L.poll);
    document.body.classList.add("in-lesson");
    lesson.hidden = false;
    lesson.style.setProperty("--u", f.mod.color);
    main.innerHTML = '<div class="lab-loading"><div><div class="spinner"></div>正在準備「' + f.exp.title + '」的實驗台…</div></div>';
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
    L.f = null;
    if (location.hash) history.pushState(null, "", location.pathname + location.search);
    renderMap();
  }
  $("#lesson-close").addEventListener("click", () => {
    if (L.phase === "done" || L.answered === 0 || window.confirm("確定要離開這一關嗎？這一關的進度不會保存。")) closeLesson();
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
    btnCheck.hidden = false;
    btnCheck.textContent = "檢查"; btnCheck.disabled = true;
    const [cls, label, icon] = KIND[item.kind] || KIND.concept;
    $("#lesson-step").textContent = label;
    const kind = el("span", "q-kind " + cls, main);
    kind.innerHTML = icon; kind.appendChild(document.createTextNode(item.retry ? label + " · 再試一次" : label));
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
      input.type = "text"; input.inputMode = "decimal"; input.autocomplete = "off"; input.placeholder = "輸入數值";
      input.setAttribute("aria-label", "你的答案");
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
      const peek = el("button", "btn small peek", main, "回實驗台看看");
      peek.type = "button";
      peek.addEventListener("click", () => {
        const on = labBox.hidden;
        labBox.hidden = !on; $("#lesson-body").classList.toggle("with-lab", on);
        peek.textContent = on ? "收起實驗台" : "回實驗台看看";
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
    el("h3", null, task, item.mode === "explore" ? "任務" : "目標");
    const goal = el("p", "task-goal", task); goal.innerHTML = item.goal;
    const hints = el("div", "task-hints", task);
    const tools = el("div", "task-tools", task);

    if (item.mode === "explore") {
      const list = el("ul", "task-checklist", task);
      const need = S && S.sliders.length ? Math.min(2, S.sliders.length) : 0;
      const li1 = el("li", null, list, need ? "調整 " + need + " 個不同的參數" : "觀察實驗台");
      const li2 = el("li", null, list, "說得出一個你看到的變化");
      const start = S ? S.sliders.map((s, i) => L.lab.slider(i)) : [];
      const t0 = Date.now();
      const check = () => {
        const moved = S ? S.sliders.filter((s, i) => L.lab.slider(i) !== start[i]).length : 0;
        const ok1 = need ? moved >= need : Date.now() - t0 > 4000;
        li1.classList.toggle("ok", ok1);
        if (ok1) { li2.classList.add("ok"); btnCheck.disabled = false; btnCheck.textContent = "完成"; }
      };
      L.poll = setInterval(check, 300);
      btnCheck.textContent = "完成";
      return;
    }

    const rel = item.rel;
    const y = S.readouts[rel.r], x = S.sliders[rel.s];
    const live = el("div", "task-live", task);
    el("span", null, live, "目前「" + y.label + "」");
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
      "這題只要動「" + x.label + "」——其他參數先不要碰（控制變因）。",
      item.mode === "peak" ? "從最小往最大慢慢推「" + x.label + "」，讀數先升後降，最高點就是答案。"
        : "「" + x.label + "」調大時「" + y.label + "」會" + (rel.direction === "up" ? "變大" : "變小") + "。現在要" + ((L.lab.read(rel.r) || 0) < item.targetValue ? "往大的方向調" : "往小的方向調") + "。",
      "「" + x.label + "」大約在 " + withUnit(estimateX(rel, item.targetValue), x.unit) + " 附近。"
    ];
    const hintBtn = el("button", "btn small", tools, "給我提示");
    hintBtn.type = "button";
    hintBtn.addEventListener("click", () => {
      if (level >= lines.length) return;
      el("p", "task-hint", hints, lines[level]);
      if (level === 0) { try { L.lab.focus(rel.s); } catch (e) {} }
      level++;
      if (level >= lines.length) {
        hintBtn.disabled = true; hintBtn.textContent = "提示用完了";
        setFoot("info", "還是調不到嗎？", "可以先跳過，這題會記一次失誤。");
        btnSkip.hidden = false;
      }
    });
    const resetBtn = el("button", "btn small ghost", tools, "重設實驗台");
    resetBtn.type = "button";
    resetBtn.addEventListener("click", () => { try { L.lab.reset(); } catch (e) {} });
    btnCheck.textContent = "檢查";
    btnCheck.disabled = true;
    btnCheck.hidden = true;   // 調整題是即時判定，不需要按「檢查」；底部列先收起，把空間讓給實驗台
    foot.hidden = true;
    el("p", "q-note task-auto", task, "達到目標時會自動判定通過。");
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
    btnCheck.textContent = "繼續";

    if (item.kind === "predict") {
      L.predictionPick = L.selected;
      setFoot("info", "記下來了：「" + item.options[L.selected] + "」", "下一步到實驗台上親手驗證。");
      return;
    }
    if (item.kind === "lab") {
      clearInterval(L.poll);
      let text = "";
      if (item.mode !== "explore" && L.labValue) {
        const S = L.lab.summary, x = S.sliders[item.rel.s], y = S.readouts[item.rel.r];
        text = "「" + x.label + "」= " + withUnit(L.labValue.x, x.unit) + " 時，「" + y.label + "」= " + withUnit(L.labValue.y, y.unit) + "。";
      }
      if (item.prediction && L.predictionPick != null) {
        const p = item.prediction, S = L.lab.summary;
        const truth = ["變大", "變小", "幾乎不變"][p.correct];
        text += " 剛才的預測：你選「" + ["變大", "變小", "幾乎不變"][L.predictionPick] + "」，實驗結果是「" + S.readouts[p.rel.r].label + "」" + truth +
          (L.predictionPick === p.correct ? "——猜對了。" : "——和你想的不一樣，記住這個結果。");
      }
      setFoot("good", item.mode === "explore" ? "做得好！" : "達成目標！", text);
      return;
    }
    if (ok) {
      setFoot("good", pick(["答對了！", "太好了！", "正確！"]), item.explain || "");
    } else {
      L.mistakes++;
      const answerText = item.numeric ? withUnit(item.answer, item.unit) : item.options[item.correct];
      setFoot("bad", "正確答案：" + answerText, item.explain || item.hint || "");
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
    btnSkip.hidden = true;
    const S = L.lab.summary, x = S.sliders[item.rel.s];
    setFoot("bad", "這題先跳過", "參考做法：把「" + x.label + "」調到約 " + withUnit(estimateX(item.rel, item.targetValue), x.unit) + "。下次再挑戰一次！");
    btnCheck.hidden = false; btnCheck.disabled = false; btnCheck.textContent = "繼續";
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
    $("#lesson-step").textContent = "完成";
    labBox.hidden = true; $("#lesson-body").classList.remove("with-lab");
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
    // 全部重答對的錯題移出錯題本
    save(); renderStats();

    main.innerHTML = "";
    const r = el("div", "result", main);
    const st = el("div", "result-stars", r);
    for (let i = 0; i < 3; i++) { st.insertAdjacentHTML("beforeend", STAR); if (i < stars) st.lastChild.classList.add("on"); }
    el("h2", null, r, stars === 3 ? "完美通關！" : stars === 2 ? "過關！" : "過關了，再練一次會更穩");
    const grid = el("div", "result-grid", r);
    [[gained, "XP"], [L.mistakes, "次答錯"], [state.streak.count, "天連續"]].forEach(([v, l]) => { const c = el("div", "result-cell", grid); el("b", null, c, String(v)); el("span", null, c, l); });
    const take = el("p", "result-take", r);
    el("small", null, take, "這一關要帶走的");
    take.appendChild(document.createTextNode(L.f.exp.points[0] || firstSentence(L.f.exp.concept)));
    const link = el("a", "result-link", r, "在物理實驗室打開完整版（含概念、公式與學習單）");
    link.href = "../#" + L.f.exp.id;

    setFoot("good", "+" + gained + " XP", "");
    btnCheck.hidden = false;
    const nx = FLAT[L.f.order + 1];
    btnCheck.disabled = false;
    btnCheck.textContent = nx ? "下一關" : "回地圖";
    btnCheck.onclick = null;
    L.nextId = nx ? nx.exp.id : null;
  }

  btnCheck.addEventListener("click", () => {
    if (L.phase === "done") { if (L.nextId) openLesson(L.nextId); else closeLesson(); return; }
    check();
  });
  btnSkip.addEventListener("click", skipLab);

  document.addEventListener("keydown", e => {
    if (lesson.hidden) return;
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
