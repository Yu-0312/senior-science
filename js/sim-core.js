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
    const stage = el("div", "sim-stage", root);
    const canvasWrap = el("div", "sim-canvas-wrap", stage);
    const controls = el("div", "sim-controls", stage);
    const readouts = el("div", "sim-readouts", root);
    return { root, stage, canvasWrap, controls, readouts };
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
    // 陰影漸層背景（讓 canvas 更有質感）
    bg(cv) {
      const ctx = cv.ctx;
      const g = ctx.createLinearGradient(0, 0, 0, cv.H);
      g.addColorStop(0, col("sim-bg-1", "#0a0f16"));
      g.addColorStop(1, col("sim-bg-2", "#0c1219"));
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.W, cv.H);
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
        D.rect(ctx, box.x, box.y, box.w, box.h, { fill: col("sim-bg-1", "#0a0f16"), stroke: col("border", "#26303d"), width: 1, r: 8 });
        // 零軸
        if (dom.y0 < 0 && dom.y1 > 0) D.line(ctx, box.x, Y(0), box.x + box.w, Y(0), col("text-faint", "#62707f"), 1);
        if (dom.x0 < 0 && dom.x1 > 0) D.line(ctx, X(0), box.y, X(0), box.y + box.h, col("text-faint", "#62707f"), 1);
        if (o.xlabel) D.text(ctx, o.xlabel, box.x + box.w - 4, box.y + box.h - 6, { color: col("text-faint"), size: 11, align: "right" });
        if (o.ylabel) D.text(ctx, o.ylabel, box.x + 6, box.y + 12, { color: col("text-faint"), size: 11 });
        if (o.title) D.text(ctx, o.title, box.x + box.w / 2, box.y - 6, { color: col("text-dim"), size: 11.5, align: "center" });
      },
      grid(nx, ny) {
        ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1; ctx.beginPath();
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
    ui: { layout, slider, select, checkbox, buttonRow, button, readout, note },
    canvas: { create: createCanvas },
    draw: D,
    graph,
    loop,
    col, fmt, clamp, lerp, TAU, el
  };
  window.PhysicsLab = PhysicsLab;
})();
