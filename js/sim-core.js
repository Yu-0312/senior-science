/*
 * sim-core.js — 模擬引擎
 * 提供：實驗註冊、響應式高解析 canvas、滑桿／按鈕／下拉／讀數等控制項、
 * 動畫迴圈、向量與圖形繪製助手、以及可重複使用的 Graph 座標系。
 * 所有互動實驗都以 PhysicsLab.register(id, { build(root) }) 註冊。
 */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // 讀取目前主題色（隨深／淺色切換即時更新）
  function col(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim();
    return v || fallback || "#34d3c4";
  }

  function fmt(n, d) {
    if (!isFinite(n)) return "—";
    d = d == null ? 2 : d;
    const a = Math.abs(n);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return n.toExponential(2);
    return n.toFixed(d).replace(/\.?0+$/, m => (m.indexOf(".") >= 0 ? "" : m));
  }

  const el = (tag, cls, parent) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  };

  // 每個課程模組有自己的儀器語言；所有實驗由註冊表自動帶入，不必在 84 個檔案裡重複設定。
  const STAGE_BY_MODULE = {
    kinematics: { family: "mechanics", stage: "運動量測台", code: "KIN" },
    newton: { family: "mechanics", stage: "受力分析台", code: "FOR" },
    momentum: { family: "mechanics", stage: "動量量測台", code: "MOM" },
    energy: { family: "mechanics", stage: "能量轉換台", code: "ENG" },
    gravity: { family: "orbital", stage: "軌道觀測台", code: "ORB" },
    shm: { family: "mechanics", stage: "振動量測台", code: "OSC" },
    thermal: { family: "thermal", stage: "熱流量測台", code: "THM" },
    waves: { family: "waves", stage: "波形量測台", code: "WAV" },
    optics: { family: "optics", stage: "光學量測台", code: "OPT" },
    electric: { family: "circuit", stage: "電路量測台", code: "ELC" },
    magnetism: { family: "magnetism", stage: "電磁觀測台", code: "MAG" },
    modern: { family: "modern", stage: "微觀探測台", code: "QNT" }
  };

  function profileFor(id) {
    const modules = window.PhysicsLabCurriculum && window.PhysicsLabCurriculum.modules;
    const module = modules && modules.find(m => m.experiments.some(e => e.id === id));
    const stage = STAGE_BY_MODULE[module && module.id] || { family: "general", stage: "互動量測台", code: "PHY" };
    return Object.assign({ id: id || "", moduleId: module && module.id, moduleNo: module && module.no, moduleTitle: module && module.title }, stage);
  }

  function workflowFor(profile) {
    const subject = profile.moduleTitle || "這個主題";
    const steps = {
      mechanics: ["設定物體與初始條件", "啟動模型並觀察運動", "對照讀數與圖表驗證關係"],
      orbital: ["設定初始條件與尺度", "觀察軌跡或場的演化", "比較模型預測與量測值"],
      thermal: ["設定系統狀態與邊界", "改變熱學條件並觀察交換", "以數據判讀守恆或狀態變化"],
      waves: ["調整波源與介質參數", "播放並鎖定一個觀測點", "比對波形、頻率與相位"],
      optics: ["設定光源與光學元件", "觀察光路、像或條紋", "記錄量測並驗證幾何關係"],
      circuit: ["設定電源與元件參數", "調整電路狀態並讀取儀表", "用讀數或曲線檢查電路定律"],
      magnetism: ["設定電流、磁場或線圈", "顯示方向與作用效果", "比較向量、曲線與計算值"],
      modern: ["選擇微觀條件與材料", "啟動探測或統計過程", "從分布與曲線判讀量子現象"]
    };
    return steps[profile.family] || ["設定 " + subject + " 的參數", "操作模型並觀察現象", "讀取數據並連結公式"];
  }

  function downloadText(filename, text, type) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([text], { type: type || "text/plain;charset=utf-8" }));
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /* ----------------------------- 版面 ----------------------------- */
  function layout(root) {
    root.innerHTML = "";
    root.classList.add("lab-sim");
    const profile = root._labProfile || profileFor(root.dataset && root.dataset.simId);
    root._labProfile = profile;
    if (root.dataset) { root.dataset.labFamily = profile.family; root.dataset.labCode = profile.code; }
    root._labReadouts = [];
    const workflow = workflowFor(profile);
    const commandBar = el("div", "sim-command-bar", root);
    const commandTitle = el("div", "sim-command-title", commandBar);
    const stageLabel = el("span", "sim-command-stage", commandTitle); stageLabel.textContent = profile.stage;
    const stageMeta = el("span", "sim-command-meta", commandTitle); stageMeta.textContent = "操作 · 量測 · 驗證";
    const commandTools = el("div", "sim-command-tools", commandBar);
    const guideBtn = el("button", "sim-command", commandTools); guideBtn.type = "button"; guideBtn.textContent = "實驗指南"; guideBtn.setAttribute("aria-expanded", "false");
    const stepBtn = el("button", "sim-command", commandTools); stepBtn.type = "button"; stepBtn.textContent = "分步演示";
    const focusBtn = el("button", "sim-command", commandTools); focusBtn.type = "button"; focusBtn.textContent = "專注模式"; focusBtn.setAttribute("aria-pressed", "false");
    const exportBtn = el("button", "sim-command", commandTools); exportBtn.type = "button"; exportBtn.textContent = "匯出讀數";
    const screenBtn = el("button", "sim-command", commandTools); screenBtn.type = "button"; screenBtn.textContent = "截取主畫面";
    const fullBtn = el("button", "sim-command", commandTools); fullBtn.type = "button"; fullBtn.textContent = "全螢幕";

    const procedure = el("section", "sim-procedure", root);
    const procedureHead = el("div", "sim-procedure-head", procedure);
    const procedureTitle = el("span", "sim-panel-title", procedureHead); procedureTitle.textContent = "實驗流程";
    const procedureState = el("span", "sim-procedure-state", procedureHead); procedureState.textContent = "準備中";
    const procedureSteps = el("ol", "sim-procedure-steps", procedure);
    const procedureNote = el("p", "sim-procedure-note", procedure); procedureNote.textContent = "每一步都會對應下方可操作的參數、模擬或量測讀數。";
    let activeStep = -1;
    const paintSteps = () => {
      procedureSteps.innerHTML = "";
      workflow.forEach((text, index) => {
        const item = el("li", "sim-procedure-step" + (index === activeStep ? " active" : ""), procedureSteps);
        const number = el("span", "sim-step-number", item); number.textContent = String(index + 1);
        const copy = el("span", "sim-step-copy", item); copy.textContent = text;
      });
      procedureState.textContent = activeStep < 0 ? "準備中" : "第 " + (activeStep + 1) + " / " + workflow.length + " 步";
    };
    paintSteps();

    guideBtn.addEventListener("click", () => {
      const visible = root.classList.toggle("show-procedure");
      guideBtn.setAttribute("aria-expanded", String(visible));
      if (visible && activeStep < 0) { activeStep = 0; paintSteps(); }
    });
    stepBtn.addEventListener("click", () => {
      root.classList.add("show-procedure"); guideBtn.setAttribute("aria-expanded", "true");
      activeStep = (activeStep + 1) % workflow.length; paintSteps();
      procedure.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    focusBtn.addEventListener("click", () => {
      const focused = root.classList.toggle("is-focused");
      focusBtn.setAttribute("aria-pressed", String(focused));
      focusBtn.textContent = focused ? "離開專注" : "專注模式";
    });
    exportBtn.addEventListener("click", () => {
      const rows = [["實驗", profile.id], ["實驗台", profile.stage], ["匯出時間", new Date().toLocaleString("zh-TW")]];
      root._labReadouts.forEach(item => rows.push([item.label, item.value + (item.unit ? " " + item.unit : "")]));
      downloadText("physics-lab-" + profile.id + "-readings.csv", rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(",")).join("\n"), "text/csv;charset=utf-8");
    });
    screenBtn.addEventListener("click", () => {
      const canvas = root.querySelector(".sim-visual-panel canvas");
      if (!canvas) return;
      const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = "physics-lab-" + profile.id + ".png"; link.click();
    });
    fullBtn.addEventListener("click", () => { if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); });

    const stage = el("div", "sim-stage", root);
    const visual = el("section", "sim-visual-panel", stage);
    const visualHead = el("div", "sim-panel-head", visual);
    const visualTitle = el("span", "sim-panel-title", visualHead); visualTitle.textContent = profile.stage;
    const visualState = el("span", "sim-live", visualHead); visualState.textContent = "LIVE MODEL";
    const canvasWrap = el("div", "sim-canvas-wrap", visual);
    canvasWrap._labProfile = profile;
    const instrumentStrip = el("div", "sim-instrument-strip", visual);
    const instrumentCode = el("span", "sim-instrument-code", instrumentStrip); instrumentCode.textContent = profile.code + " · " + (profile.moduleNo ? "模組" + profile.moduleNo : "物理模型");
    const instrumentMode = el("span", "sim-instrument-mode", instrumentStrip); instrumentMode.textContent = "即時量測 / 可調參數";

    const controlDeck = el("section", "sim-control-deck", stage);
    const controlHead = el("div", "sim-panel-head", controlDeck);
    const controlTitle = el("span", "sim-panel-title", controlHead); controlTitle.textContent = "實驗參數";
    const controlHint = el("span", "sim-panel-hint", controlHead); controlHint.textContent = "可即時調整";
    const controls = el("div", "sim-controls", controlDeck);

    const readoutPanel = el("section", "sim-readout-panel", root);
    const readoutHead = el("div", "sim-readout-head", readoutPanel);
    const readoutTitle = el("span", "sim-panel-title", readoutHead); readoutTitle.textContent = "量測讀數";
    const readoutHint = el("span", "sim-panel-hint", readoutHead); readoutHint.textContent = "模型計算";
    const readouts = el("div", "sim-readouts", readoutPanel);
    return { root, profile, workflow, commandBar, procedure, stage, visual, canvasWrap, instrumentStrip, controlDeck, controls, readoutPanel, readouts };
  }

  /* --------------------------- 響應式畫布 --------------------------- */
  function createCanvas(wrap, aspect, maxW) {
    aspect = aspect || 0.6;
    maxW = maxW || 780;
    const canvas = el("canvas", "sim-canvas", wrap);
    const ctx = canvas.getContext("2d");
    const cv = { canvas, ctx, W: 640, H: 400, dpr: 1, _resizeCbs: [], profile: wrap._labProfile || profileFor() };

    function fit() {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(240, Math.min(rect.width || maxW, maxW));
      const h = Math.round(w * aspect);
      const dpr = window.devicePixelRatio || 1;
      cv.W = w; cv.H = h; cv.dpr = dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    cv.fit = fit;
    cv.onResize = fn => cv._resizeCbs.push(fn);
    cv.clear = c => {
      ctx.save();
      ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
      if (c) { ctx.fillStyle = c; ctx.fillRect(0, 0, cv.W, cv.H); }
      else ctx.clearRect(0, 0, cv.W, cv.H);
      ctx.restore();
    };

    fit();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { fit(); cv._resizeCbs.forEach(f => f()); });
    });
    ro.observe(wrap);
    cv.destroy = () => ro.disconnect();
    return cv;
  }

  /* --------------------------- 動畫迴圈 --------------------------- */
  function loop(step) {
    let raf = null, running = false, last = 0, t = 0;
    function frame(now) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now; t += dt;
      step(dt, t);
      raf = requestAnimationFrame(frame);
    }
    const ctrl = {
      start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
      toggle() { running ? ctrl.stop() : ctrl.start(); },
      render() { step(0, t); },
      reset() { t = 0; last = 0; },
      get t() { return t; },
      get running() { return running; }
    };
    return ctrl;
  }

  /* --------------------------- 控制項 --------------------------- */
  function slider(parent, o) {
    const wrap = el("div", "ctrl-slider", parent);
    const head = el("div", "ctrl-head", wrap);
    const lab = el("span", "ctrl-label", head); lab.textContent = o.label;
    const val = el("span", "ctrl-value", head);
    const input = el("input", null, wrap);
    input.type = "range";
    input.setAttribute("aria-label", o.ariaLabel || o.label || "數值滑桿");
    input.min = o.min; input.max = o.max; input.step = o.step == null ? 1 : o.step;
    input.value = o.value;
    const f = o.fmt || (v => fmt(v, o.digits == null ? 1 : o.digits));
    const show = v => { val.textContent = f(v) + (o.unit ? " " + o.unit : ""); };
    show(+input.value);
    input.addEventListener("input", () => { show(+input.value); o.onInput && o.onInput(+input.value); });
    return { el: input, get: () => +input.value, set: v => { input.value = v; show(v); }, label: lab, valueEl: val, showUnit: show };
  }

  function select(parent, o) {
    const wrap = el("div", "ctrl-select", parent);
    if (o.label) { const l = el("div", "ctrl-label", wrap); l.textContent = o.label; }
    const sel = el("select", null, wrap);
    if (o.label) sel.setAttribute("aria-label", o.ariaLabel || o.label);
    o.options.forEach(op => {
      const oe = el("option", null, sel);
      oe.value = op.value; oe.textContent = op.label;
    });
    if (o.value != null) sel.value = o.value;
    sel.addEventListener("change", () => o.onChange && o.onChange(sel.value));
    return { el: sel, get: () => sel.value, set: v => sel.value = v };
  }

  function checkbox(parent, o) {
    const wrap = el("label", "ctrl-check", parent);
    const input = el("input", null, wrap); input.type = "checkbox"; input.checked = !!o.checked;
    const span = el("span", null, wrap); span.textContent = o.label;
    input.addEventListener("change", () => o.onChange && o.onChange(input.checked));
    return { el: input, get: () => input.checked, set: v => input.checked = v };
  }

  function buttonRow(parent) { return el("div", "btn-row", parent); }
  function button(row, label, onClick, o) {
    o = o || {};
    const b = el("button", "btn" + (o.primary ? " btn-primary" : ""), row);
    b.type = "button"; b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function readout(parent, o) {
    const box = el("div", "readout", parent);
    const v = el("div", "readout-value", box); v.textContent = "—";
    const l = el("div", "readout-label", box); l.textContent = o.label;
    const record = { label: o.label, unit: o.unit || "", value: "—" };
    const simRoot = parent.closest && parent.closest(".lab-sim");
    if (simRoot && simRoot._labReadouts) simRoot._labReadouts.push(record);
    return {
      set: (val, digits) => { record.value = typeof val === "number" ? fmt(val, digits) : val; v.textContent = record.value + (o.unit ? " " + o.unit : ""); },
      raw: v, box
    };
  }

  function note(parent, text) {
    const n = el("div", "ctrl-note", parent); n.innerHTML = text; return n;
  }

  function section(parent, text) {
    const s = el("div", "ctrl-section", parent); s.textContent = text; return s;
  }

  function stepper(parent, o) {
    const wrap = el("div", "ctrl-stepper", parent);
    if (o.label) { const l = el("div", "ctrl-label", wrap); l.innerHTML = o.label; }
    const box = el("div", "stepper-box", wrap);
    const dec = el("button", "stepper-btn", box); dec.type = "button"; dec.textContent = "−";
    const val = el("span", "stepper-val", box);
    if (o.unit) { const u = el("span", "stepper-unit", box); u.textContent = o.unit; }
    const inc = el("button", "stepper-btn", box); inc.type = "button"; inc.textContent = "+";
    const name = o.ariaLabel || o.label || "數值";
    dec.setAttribute("aria-label", name + " 減少");
    inc.setAttribute("aria-label", name + " 增加");
    const step = o.step == null ? 1 : o.step, dg = o.digits == null ? 0 : o.digits;
    let v = o.value;
    const show = () => { val.textContent = typeof o.format === "function" ? o.format(v) : (+v).toFixed(dg); };
    const set = (nv, fire) => { v = clamp(Math.round(nv / step) * step, o.min, o.max); show(); if (fire !== false && o.onInput) o.onInput(v); };
    dec.addEventListener("click", () => set(v - step));
    inc.addEventListener("click", () => set(v + step));
    show();
    return { get: () => v, set: nv => set(nv, false), el: box };
  }

  function chipGroup(parent, o) {
    const row = el("div", "chip-row", parent);
    const multi = !!o.multi;
    let value = multi ? new Set(o.value || []) : o.value;
    const chips = [];
    o.options.forEach(op => {
      const c = el("button", "chip", row); c.type = "button"; c.innerHTML = op.label;
      if (op.color) c.style.setProperty("--chip", op.color);
      const isOn = () => multi ? value.has(op.value) : value === op.value;
      const paint = () => c.classList.toggle("active", isOn());
      c.addEventListener("click", () => {
        if (multi) { value.has(op.value) ? value.delete(op.value) : value.add(op.value); }
        else value = op.value;
        chips.forEach(x => x.paint());
        if (o.onChange) o.onChange(multi ? [...value] : value, op.value);
      });
      chips.push({ paint }); paint();
    });
    return { get: () => multi ? [...value] : value, has: v => multi && value.has(v), set: v => { value = multi ? new Set(v) : v; chips.forEach(x => x.paint()); } };
  }

  function charts(parent) { return el("div", "sim-charts", parent); }
  function chart(container, o) {
    o = o || {};
    const w = el("div", "sim-chart", container);
    if (o.title) { const t = el("div", "chart-title", w); t.textContent = o.title; }
    const c = createCanvas(w, o.aspect || 0.6);
    if (o.cap) { const p = el("div", "cap", w); p.textContent = o.cap; }
    return c;
  }

  function instrumentChrome(ctx, W, H, profile) {
    const family = profile && profile.family || "general";
    const faint = "rgba(255,255,255,0.10)", dim = "rgba(255,255,255,0.055)", accent = col("m-color", col("accent"));
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = faint; ctx.fillStyle = dim;
    const y = H - 12;
    if (family === "mechanics" || family === "optics") {
      ctx.fillRect(14, y, W - 28, 5); ctx.strokeRect(14.5, y + 0.5, W - 29, 4);
      for (let x = 24; x < W - 20; x += 24) { ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x, y + (x % 72 === 24 ? 5 : 3)); ctx.stroke(); }
    } else if (family === "circuit") {
      const py = H - 16; ctx.strokeStyle = "rgba(90,162,255,0.14)";
      [[16, 76], [W * 0.30, W * 0.53], [W * 0.68, W - 18]].forEach((span, i) => {
        ctx.beginPath(); ctx.moveTo(span[0], py + (i % 2 ? 5 : 0)); ctx.lineTo(span[1], py + (i % 2 ? 5 : 0)); ctx.stroke();
        [span[0], span[1]].forEach(x => { ctx.beginPath(); ctx.arc(x, py + (i % 2 ? 5 : 0), 2.3, 0, TAU); ctx.fillStyle = "rgba(90,162,255,0.22)"; ctx.fill(); });
      });
    } else if (family === "thermal") {
      ctx.fillRect(14, y - 2, W - 28, 7); ctx.strokeRect(14.5, y - 1.5, W - 29, 6);
      for (let x = 26; x < W - 20; x += 20) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y); ctx.stroke(); }
    } else if (family === "waves") {
      ctx.strokeStyle = "rgba(77,208,225,0.16)"; ctx.beginPath();
      for (let x = 14; x <= W - 14; x += 5) { const yy = y + Math.sin((x - 14) / 14) * 2.5; x === 14 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
    } else if (family === "magnetism") {
      ctx.strokeStyle = "rgba(185,139,255,0.14)";
      for (let x = 24; x < W - 22; x += 30) { ctx.beginPath(); ctx.arc(x, y - 1, 9, Math.PI, 0); ctx.stroke(); }
    } else if (family === "orbital" || family === "modern") {
      ctx.strokeStyle = "rgba(90,162,255,0.12)";
      for (let x = 20; x < W - 16; x += 28) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke(); }
    }
    ctx.fillStyle = accent; ctx.globalAlpha = 0.62; ctx.font = "8px system-ui, sans-serif";
    ctx.fillText((profile && profile.code || "PHY") + " / CALIBRATED", 15, H - 18);
    ctx.textAlign = "right"; ctx.fillStyle = faint; ctx.fillText("INTERACTIVE LAB", W - 15, H - 18);
    ctx.restore();
  }

  /* --------------------------- 繪圖助手 --------------------------- */
  const D = {
    grid(ctx, x, y, w, h, step, color) {
      ctx.save(); ctx.strokeStyle = color || "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = x; gx <= x + w + 0.5; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
      for (let gy = y; gy <= y + h + 0.5; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
      ctx.stroke(); ctx.restore();
    },
    line(ctx, x1, y1, x2, y2, color, width, dash) {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1.5;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    },
    arrow(ctx, x1, y1, x2, y2, o) {
      o = o || {};
      const color = o.color || "#fff", w = o.width || 2, head = o.head || 9;
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.5) return;
      ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      const hs = Math.min(head, len);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hs * Math.cos(ang - 0.42), y2 - hs * Math.sin(ang - 0.42));
      ctx.lineTo(x2 - hs * Math.cos(ang + 0.42), y2 - hs * Math.sin(ang + 0.42));
      ctx.closePath(); ctx.fill();
      if (o.label) { D.text(ctx, o.label, x2 + (o.lx || 6), y2 + (o.ly || -6), { color, size: o.lsize || 12 }); }
      ctx.restore();
    },
    disc(ctx, x, y, r, o) {
      o = o || {};
      ctx.save();
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowSize || 16; }
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      ctx.shadowBlur = 0;
      if (o.stroke) { ctx.lineWidth = o.width || 2; ctx.strokeStyle = o.stroke; ctx.stroke(); }
      ctx.restore();
    },
    ring(ctx, x, y, r, color, width, dash) {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1.5;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
    },
    rect(ctx, x, y, w, h, o) {
      o = o || {}; const r = o.r || 0;
      ctx.save();
      ctx.beginPath();
      if (r > 0) {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
      } else ctx.rect(x, y, w, h);
      ctx.closePath();
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke) { ctx.lineWidth = o.width || 1.5; ctx.strokeStyle = o.stroke; ctx.stroke(); }
      ctx.restore();
    },
    text(ctx, str, x, y, o) {
      o = o || {};
      ctx.save();
      ctx.fillStyle = o.color || "#e6edf3";
      ctx.font = (o.weight || "") + " " + (o.size || 13) + "px 'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif";
      ctx.textAlign = o.align || "left";
      ctx.textBaseline = o.baseline || "alphabetic";
      ctx.fillText(str, x, y);
      ctx.restore();
    },
    spring(ctx, x1, y1, x2, y2, coils, w, color) {
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      const n = (coils || 10) * 2, pad = 0.12;
      ctx.save(); ctx.strokeStyle = color || "#9aa"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 0; i <= n; i++) {
        const f = pad + (1 - 2 * pad) * (i / n);
        const bx = x1 + dx * f, by = y1 + dy * f;
        const off = (i % 2 === 0 ? 0 : (i % 4 === 1 ? (w || 8) : -(w || 8)));
        ctx.lineTo(bx + px * off, by + py * off);
      }
      ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    },
    // 陰影漸層、儀器格線與內框，讓所有模擬共享實驗台的質感。
    bg(cv) {
      const ctx = cv.ctx, W = cv.W, H = cv.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, col("sim-bg-1", "#0a0f16"));
      g.addColorStop(1, col("sim-bg-2", "#0c1219"));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const light = document.documentElement.getAttribute("data-theme") === "light";
      const rg = ctx.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.15, W / 2, H * 0.5, Math.max(W, H) * 0.72);
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, light ? "rgba(30,50,90,0.05)" : "rgba(0,0,0,0.30)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      const step = Math.max(24, Math.round(Math.min(W, H) / 11));
      ctx.save();
      ctx.strokeStyle = light ? "rgba(30,50,90,0.045)" : "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1; ctx.beginPath();
      for (let x = step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = light ? "rgba(30,50,90,0.10)" : "rgba(255,255,255,0.075)";
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      ctx.strokeStyle = col("m-color", col("accent")); ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4;
      const mark = 10;
      [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]].forEach(p => {
        ctx.beginPath(); ctx.moveTo(p[0], p[1] + p[3] * mark); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + p[2] * mark, p[1]); ctx.stroke();
      });
      ctx.restore();
      instrumentChrome(ctx, W, H, cv.profile);
    }
  };

  /* ---------------------- 可重複使用的 Graph 座標系 ---------------------- */
  function graph(cv, box, dom) {
    const ctx = cv.ctx;
    const X = dx => box.x + (dx - dom.x0) / (dom.x1 - dom.x0) * box.w;
    const Y = dy => box.y + box.h - (dy - dom.y0) / (dom.y1 - dom.y0) * box.h;
    const g = {
      X, Y, box, dom,
      frame(o) {
        o = o || {};
        D.rect(ctx, box.x, box.y, box.w, box.h, { fill: col("sim-bg-1", "#0a0f16"), stroke: col("border", "#26303d"), width: 1, r: 7 });
        // 零軸
        if (dom.y0 < 0 && dom.y1 > 0) D.line(ctx, box.x, Y(0), box.x + box.w, Y(0), col("text-faint", "#62707f"), 1);
        if (dom.x0 < 0 && dom.x1 > 0) D.line(ctx, X(0), box.y, X(0), box.y + box.h, col("text-faint", "#62707f"), 1);
        if (o.ticks !== false) {
          const n = o.tickCount || 4;
          for (let i = 0; i <= n; i++) {
            const xv = lerp(dom.x0, dom.x1, i / n), yv = lerp(dom.y0, dom.y1, i / n);
            D.text(ctx, fmt(xv, Math.abs(dom.x1 - dom.x0) < 2 ? 2 : 1), X(xv), box.y + box.h + 13, { color: col("text-faint"), size: 8.5, align: "center" });
            D.text(ctx, fmt(yv, Math.abs(dom.y1 - dom.y0) < 2 ? 2 : 1), box.x - 5, Y(yv) + 3, { color: col("text-faint"), size: 8.5, align: "right" });
          }
        }
        if (o.xlabel) D.text(ctx, o.xlabel, box.x + box.w - 4, box.y + box.h - 6, { color: col("text-faint"), size: 11, align: "right" });
        if (o.ylabel) D.text(ctx, o.ylabel, box.x + 6, box.y + 12, { color: col("text-faint"), size: 11 });
        if (o.title) D.text(ctx, o.title, box.x + box.w / 2, box.y - 6, { color: col("text-dim"), size: 11.5, align: "center" });
      },
      grid(nx, ny) {
        const light = document.documentElement.getAttribute("data-theme") === "light";
        ctx.save(); ctx.strokeStyle = light ? "rgba(30,50,90,0.08)" : "rgba(255,255,255,0.055)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 1; i < nx; i++) { const gx = box.x + box.w * i / nx; ctx.moveTo(gx, box.y); ctx.lineTo(gx, box.y + box.h); }
        for (let j = 1; j < ny; j++) { const gy = box.y + box.h * j / ny; ctx.moveTo(box.x, gy); ctx.lineTo(box.x + box.w, gy); }
        ctx.stroke(); ctx.restore();
      },
      curve(pts, o) {
        o = o || {}; if (pts.length < 2) return;
        ctx.save(); ctx.beginPath();
        ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
        ctx.strokeStyle = o.color || col("accent"); ctx.lineWidth = o.width || 2;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath();
        pts.forEach((p, i) => { const px = X(p[0]), py = Y(p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
        ctx.stroke(); ctx.restore();
      },
      fn(f, o) {
        o = o || {}; const n = o.samples || 160, pts = [];
        for (let i = 0; i <= n; i++) { const x = lerp(dom.x0, dom.x1, i / n); pts.push([x, f(x)]); }
        g.curve(pts, o);
      },
      area(pts, o) {
        o = o || {}; if (pts.length < 2) return;
        ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
        ctx.beginPath();
        ctx.moveTo(X(pts[0][0]), Y(0));
        pts.forEach(p => ctx.lineTo(X(p[0]), Y(p[1])));
        ctx.lineTo(X(pts[pts.length - 1][0]), Y(0));
        ctx.closePath(); ctx.fillStyle = o.fill || "rgba(52,211,196,0.15)"; ctx.fill(); ctx.restore();
      },
      dot(x, y, o) { o = o || {}; D.disc(ctx, X(x), Y(y), o.r || 4, { fill: o.color || col("accent-2"), glow: o.glow }); },
      vline(x, o) { o = o || {}; D.line(ctx, X(x), box.y, X(x), box.y + box.h, o.color || col("accent-2"), o.width || 1.5, o.dash); },
      hline(y, o) { o = o || {}; D.line(ctx, box.x, Y(y), box.x + box.w, Y(y), o.color || col("accent-2"), o.width || 1.5, o.dash); },
      label(x, y, str, o) { o = o || {}; D.text(ctx, str, X(x) + (o.dx || 0), Y(y) + (o.dy || 0), o); }
    };
    return g;
  }

  /* --------------------------- 註冊表 --------------------------- */
  const registry = {};
  const PhysicsLab = {
    _registry: registry,
    register(id, def) {
      registry[id] = Object.assign({}, def, {
        build(root) {
          const profile = profileFor(id);
          root._labProfile = profile;
          if (root.dataset) root.dataset.simId = id;
          return def.build(root);
        }
      });
    },
    get(id) { return registry[id]; },
    has(id) { return !!registry[id]; },
    ids() { return Object.keys(registry); },
    // 對外助手
    ui: { layout, slider, select, checkbox, buttonRow, button, readout, note, section, stepper, chipGroup, charts, chart },
    canvas: { create: createCanvas },
    draw: D,
    graph,
    loop,
    col, fmt, clamp, lerp, TAU, el
  };
  window.PhysicsLab = PhysicsLab;
})();
