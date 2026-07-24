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

  /* ----------------------------- 版面 ----------------------------- */
  function layout(root) {
    root.innerHTML = "";
    root.classList.add("lab-sim");
    const stage = el("div", "sim-stage", root);
    const visual = el("section", "sim-visual-panel", stage);
    const visualHead = el("div", "sim-panel-head", visual);
    const visualTitle = el("span", "sim-panel-title", visualHead); visualTitle.textContent = "即時實驗視窗";
    const visualState = el("span", "sim-live", visualHead); visualState.textContent = "LIVE";
    const canvasWrap = el("div", "sim-canvas-wrap", visual);

    const controlDeck = el("section", "sim-control-deck", stage);
    const controlHead = el("div", "sim-panel-head", controlDeck);
    const controlTitle = el("span", "sim-panel-title", controlHead); controlTitle.textContent = "實驗參數";
    const controlHint = el("span", "sim-panel-hint", controlHead); controlHint.textContent = "可即時調整";
    const controls = el("div", "sim-controls", controlDeck);

    const readoutPanel = el("section", "sim-readout-panel", root);
    const readoutHead = el("div", "sim-readout-head", readoutPanel);
    const readoutTitle = el("span", "sim-panel-title", readoutHead); readoutTitle.textContent = "即時讀數";
    const readoutHint = el("span", "sim-panel-hint", readoutHead); readoutHint.textContent = "模型計算";
    const readouts = el("div", "sim-readouts", readoutPanel);
    return { root, stage, visual, canvasWrap, controlDeck, controls, readoutPanel, readouts };
  }

  /* --------------------------- 響應式畫布 --------------------------- */
  function createCanvas(wrap, aspect, maxW) {
    aspect = aspect || 0.6;
    maxW = maxW || 780;
    const canvas = el("canvas", "sim-canvas", wrap);
    const ctx = canvas.getContext("2d");
    const cv = { canvas, ctx, W: 640, H: 400, dpr: 1, _resizeCbs: [] };

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
    return {
      set: (val, digits) => { v.textContent = (typeof val === "number" ? fmt(val, digits) : val) + (o.unit ? " " + o.unit : ""); },
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
    register(id, def) { registry[id] = def; },
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
