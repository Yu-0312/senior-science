/*
 * lab-app.js — 自訂實驗室的介面
 *
 * 狀態只有三樣：state（實驗台上的器材與導線，可序列化、可存檔分享）、
 * view（縮放與平移）、sim（模擬時間與力學世界）。畫面每一格都由這三樣重畫，
 * 電路與光路每一格重新求解（元件很少，求解只要零點幾毫秒），
 * 力學只在播放時前進；暫停時改了擺設，下次播放會保留速度重建世界。
 *
 * 「重設」回到按下播放前的擺設——學生可以一直重跑同一個實驗，
 * 改一個參數、再跑一次，這是做實驗的基本動作。
 */
(function () {
  "use strict";
  const LAB = window.PhysicsLabLab, T = LAB.types, U = LAB.util, PL = window.PhysicsLab || {};
  const $ = s => document.querySelector(s);
  const DEG = Math.PI / 180;
  const WORLD = { w: 400, h: 240, floor: 220 };
  const STORE_KEY = "pl-lab-v1";
  const SNAP = 1, ROT_SNAP = 15;

  const state = { items: [], wires: [], seq: 1 };
  const view = { s: 2.5, ox: 0, oy: 0 };
  /*
   * place：「點一下拿起、再點一下放下」的端點或導線（不必一直按住滑鼠拖，手不穩也畫得直）
   * draw：從器材盒點了細繩、彈簧之類，正在一個節點一個節點地畫
   * snap：目前這一步吸附到哪裡（畫參考線與角度標籤用）；selEnd：方向鍵要微調的端點
   */
  const ui = { sel: null, selWire: null, hover: null, detail: true, grid: true, cat: "mech", drag: null, pointers: new Map(), pinch: null,
    place: null, draw: null, snap: null, selEnd: null, pointer: null };
  const sim = { status: "edit", t: 0, speed: 1, world: null, map: new Map(), snapshot: null, acc: 0, dirty: true, sampleAcc: 0 };
  const undoStack = [], redoStack = [];
  const wirePhase = new Map();
  let rays = [], canvas, ctx, W = 0, H = 0, dpr = 1, lastFrame = 0, saveTimer = 0, inspectorKey = "";

  const X = x => (x - view.ox) * view.s, Y = y => (y - view.oy) * view.s;
  const WX = sx => sx / view.s + view.ox, WY = sy => sy / view.s + view.oy;
  const byId = id => state.items.find(it => it.id === id) || null;
  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";

  /* ============================== 器材與存檔 ============================== */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function newItem(type, x, y) {
    const d = T[type];
    const it = { id: "i" + state.seq++, type, x, y, a: 0, p: clone(d.defaults) };
    if (d.makeEnds) it.ends = d.makeEnds(it);
    return it;
  }
  function serialize() {
    return JSON.stringify({
      v: 1, seq: state.seq,
      items: state.items.map(it => ({ id: it.id, type: it.type, x: +it.x.toFixed(3), y: +it.y.toFixed(3), a: +(it.a || 0).toFixed(5), p: it.p,
        ends: it.ends ? it.ends.map(e => ({ x: +e.x.toFixed(3), y: +e.y.toFixed(3), at: e.at || null })) : undefined })),
      wires: state.wires
    });
  }
  // 讀檔一律重新驗證：分享連結和匯入檔都是外部輸入，壞掉的欄位不能讓頁面掛掉
  function load(json) {
    const o = typeof json === "string" ? JSON.parse(json) : json;
    if (!o || !Array.isArray(o.items)) throw new Error("格式不符");
    const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
    const items = [];
    o.items.forEach(raw => {
      if (!raw || !T[raw.type] || typeof raw.id !== "string") return;
      const d = T[raw.type];
      const it = { id: raw.id.slice(0, 20), type: raw.type, x: num(raw.x, 200), y: num(raw.y, 100), a: num(raw.a, 0), p: clone(d.defaults) };
      if (raw.p && typeof raw.p === "object") Object.keys(it.p).forEach(k => {
        const v = raw.p[k];
        if (typeof v === typeof it.p[k] || (typeof it.p[k] === "number" && typeof v === "number")) it.p[k] = typeof v === "number" && !isFinite(v) ? it.p[k] : v;
      });
      if (d.makeEnds) {
        it.ends = d.makeEnds(it);
        if (Array.isArray(raw.ends)) it.ends.forEach((e, i) => {
          const r = raw.ends[i]; if (!r) return;
          e.x = num(r.x, e.x); e.y = num(r.y, e.y);
          if (r.at && typeof r.at.id === "string") e.at = { id: r.at.id, lx: num(r.at.lx, 0), ly: num(r.at.ly, 0) };
        });
      }
      items.push(it);
    });
    const ids = new Set(items.map(it => it.id));
    items.forEach(it => (it.ends || []).forEach(e => { if (e.at && !ids.has(e.at.id)) e.at = null; }));
    const termOk = k => typeof k === "string" && ids.has(k.split(":")[0]);
    ui.place = null; ui.draw = null; ui.snap = null; ui.selEnd = null;
    state.items = items;
    state.wires = (Array.isArray(o.wires) ? o.wires : []).filter(w => w && termOk(w.a) && termOk(w.b) && w.a !== w.b)
      .map((w, i) => ({ id: typeof w.id === "string" ? w.id : "w" + i, a: w.a, b: w.b }));
    const maxN = items.concat(state.wires).reduce((m, it) => Math.max(m, parseInt(String(it.id).slice(1), 10) || 0), 0);
    state.seq = Math.max(num(o.seq, 1), maxN + 1);
    ui.sel = null; ui.selWire = null;
  }
  function pushUndo(before) {
    undoStack.push(before || serialize());
    if (undoStack.length > 80) undoStack.shift();
    redoStack.length = 0;
    updateUndoButtons();
  }
  function changed(opts) {
    sim.dirty = true;
    if (!opts || opts.save !== false) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, sim.status === "edit" ? serialize() : (sim.snapshot || serialize())); } catch (e) {} }, 400);
    }
    inspectorKey = "";
    updateEmpty();
  }
  function doUndo() {
    if (!undoStack.length) return;
    redoStack.push(serialize()); load(undoStack.pop()); changed(); updateUndoButtons(); toast("已復原");
  }
  function doRedo() {
    if (!redoStack.length) return;
    undoStack.push(serialize()); load(redoStack.pop()); changed(); updateUndoButtons(); toast("已重做");
  }
  function updateUndoButtons() { $("#lab-undo").disabled = !undoStack.length; $("#lab-redo").disabled = !redoStack.length; }

  /* ---------- 端點與接線柱 ---------- */
  function endPos(it, i) {
    const e = it.ends[i];
    if (e.at) {
      const t = byId(e.at.id);
      if (t) { const p = U.local(t, e.at.lx, e.at.ly); e.x = p.x; e.y = p.y; return { x: p.x, y: p.y, at: e.at }; }
      e.at = null;
    }
    return { x: e.x, y: e.y, at: null };
  }
  const endsOf = it => (it.ends ? it.ends.map((_, i) => endPos(it, i)) : []);
  function terms(it) { const d = T[it.type]; return d.terms ? d.terms(it).map(t => U.local(it, t.x, t.y)) : []; }
  function termAt(sx, sy) {
    const r = 11;
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i]; const P = terms(it);
      for (let k = 0; k < P.length; k++) if (Math.hypot(X(P[k].x) - sx, Y(P[k].y) - sy) <= r) return { it, k, key: it.id + ":" + k, p: P[k] };
    }
    return null;
  }
  const termPos = key => { const [id, k] = key.split(":"); const it = byId(id); return it ? terms(it)[+k] : null; };

  /* ---------- 圖層：決定畫的順序與點選的優先序 ---------- */
  function layer(it) {
    const d = T[it.type];
    if (d.card) return 7;
    if (d.tool) return 6;
    if (d.connector && !d.fixed) return 5;
    if (d.cat === "mech" && !d.fixed) return 4;
    if (d.cat === "optics") return 3;
    if (d.cat === "elec") return 2;
    return 1;
  }
  const sorted = () => state.items.slice().sort((a, b) => layer(a) - layer(b));

  /* ============================== 模擬 ============================== */
  function endRef(e) {
    if (e.at) {
      const b = sim.map.get(e.at.id);
      if (b && !b.isStatic) return { body: b, lx: e.at.lx, ly: e.at.ly };
      const t = byId(e.at.id);
      if (t) { const p = U.local(t, e.at.lx, e.at.ly); return { body: null, x: p.x, y: p.y }; }
    }
    return { body: null, x: e.x, y: e.y };
  }
  const refPt = r => r.body ? LAB.anchorWorld(r.body, r.lx, r.ly) : { x: r.x, y: r.y };
  const refArgs = (r, pre) => r.body ? { [pre]: r.body, [pre + "x"]: r.lx, [pre + "y"]: r.ly } : { [pre]: null, [pre + "x"]: r.x, [pre + "y"]: r.y };

  function buildWorld(fresh) {
    const w = new LAB.mech.World();
    const map = new Map();
    w.add({ id: "_floor", shape: "poly", isStatic: true, x: WORLD.w / 2, y: WORLD.floor + 30, verts: U.box(WORLD.w + 600, 60), mu: 0.35, e: 0.3 });
    w.add({ id: "_wl", shape: "poly", isStatic: true, x: -15, y: WORLD.floor - 400, verts: U.box(30, 800), mu: 0.3, e: 0.5 });
    w.add({ id: "_wr", shape: "poly", isStatic: true, x: WORLD.w + 15, y: WORLD.floor - 400, verts: U.box(30, 800), mu: 0.3, e: 0.5 });
    state.items.forEach(it => {
      const d = T[it.type]; if (!d.body) return;
      const spec = d.body(it);
      spec.id = it.id; spec.x = it.x; spec.y = it.y; spec.a = it.a || 0;
      if (d.fixed) spec.isStatic = true;
      if (!fresh && it.rt && it.rt.vx != null) { spec.vx = it.rt.vx; spec.vy = it.rt.vy; spec.w = it.rt.w || 0; }
      if (fresh && !d.fixed) { it.rt = it.rt || {}; it.rt.x0 = it.x; it.rt.y0 = it.y; }
      map.set(it.id, w.add(spec));
    });
    sim.map = map; sim.world = w;
    state.items.forEach(it => {
      const d = T[it.type]; if (!d.ends && !d.makeEnds) return;
      it.rt = it.rt || {};
      if (it.type === "spring" || it.type === "gauge") {
        const A = endRef(it.ends[0]), B = endRef(it.ends[1]);
        if (!A.body && !B.body) return;
        it.rt.sp = w.spring(Object.assign({ k: it.p.k, L0: it.p.L0, c: it.type === "gauge" ? 0.6 : it.p.c }, refArgs(A, "a"), refArgs(B, "b")));
      } else if (it.type === "rope") {
        const A = endRef(it.ends[0]), B = endRef(it.ends[1]);
        if (!A.body && !B.body) return;
        const pa = refPt(A), pb = refPt(B);
        const L = !fresh && it.rt.L ? it.rt.L : Math.hypot(pb.x - pa.x, pb.y - pa.y);
        it.rt.L = L; it.rt.rope = w.rope(Object.assign({ L }, refArgs(A, "a"), refArgs(B, "b")));
      } else if (it.type === "pulley") {
        const ga = { x: it.x - it.p.r, y: it.y }, gb = { x: it.x + it.p.r, y: it.y };
        const A = endRef(it.ends[0]), B = endRef(it.ends[1]), pa = refPt(A), pb = refPt(B);
        const la = Math.hypot(pa.x - ga.x, pa.y - ga.y), lb = Math.hypot(pb.x - gb.x, pb.y - gb.y);
        it.rt.L = !fresh && it.rt.L ? it.rt.L : la + lb;
        if (A.body && B.body) it.rt.pul = w.pulley({ a: A.body, ax: A.lx, ay: A.ly, b: B.body, bx: B.lx, by: B.ly, ga, gb, L: it.rt.L });
        else if (A.body) it.rt.rope = w.rope({ a: null, ax: ga.x, ay: ga.y, b: A.body, bx: A.lx, by: A.ly, L: la });
        else if (B.body) it.rt.rope = w.rope({ a: null, ax: gb.x, ay: gb.y, b: B.body, bx: B.lx, by: B.ly, L: lb });
      } else if (it.type === "force") {
        const A = endRef(it.ends[0]);
        if (A.body) w.force({ body: A.body, F: it.p.F, ang: -it.p.dir * DEG });
      }
    });
    sim.dirty = false;
  }

  function syncFromWorld() {
    state.items.forEach(it => {
      const b = sim.map.get(it.id);
      if (b && !b.isStatic) {
        it.x = b.x; it.y = b.y; it.a = b.a;
        it.rt = it.rt || {};
        it.rt.vx = b.vx; it.rt.vy = b.vy; it.rt.w = b.w;
      }
      const rt = it.rt; if (!rt) return;
      if (rt.sp) rt.force = rt.sp.force;
      if (rt.rope) rt.tension = rt.rope.tension;
      if (rt.pul) rt.tension = rt.pul.tension;
    });
  }

  function stepTools(dt) {
    sim.sampleAcc += dt;
    const sample = sim.sampleAcc >= 1 / 60;
    if (sample) sim.sampleAcc = 0;
    state.items.forEach(it => {
      const rt = it.rt || (it.rt = {});
      if (it.type === "stopwatch" && rt.on) rt.elapsed = (rt.elapsed || 0) + dt;
      if (it.type === "pulley" && (rt.pul || rt.rope)) {
        const E = it.ends.map((_, i) => endRef(it.ends[i]));
        const b = (E[0].body || E[1].body);
        if (b) { const s = E[0].body ? -1 : 1; rt.spin = (rt.spin || 0) + s * b.vy * dt / Math.max(1, it.p.r); }
      }
      if (sample && it.type === "sensor") {
        const r = it.ends[0].at && sim.map.get(it.ends[0].at.id);
        if (!r || r.isStatic) return;
        const s = rt.samples || (rt.samples = []);
        const v = Math.hypot(r.vx, r.vy), prev = s[s.length - 1];
        const a = prev ? (v - prev.v) / Math.max(1e-6, sim.t - prev.t) : 0;
        s.push({ t: sim.t, x: r.x - (byId(r.id).rt.x0 || 0), h: WORLD.floor - r.y, v, vx: r.vx, a: prev ? prev.a * 0.7 + a * 0.3 : 0 });
        if (s.length > 1800) s.splice(0, s.length - 1800);
      }
    });
  }

  function advance(seconds) {
    if (!sim.world || sim.dirty) buildWorld(false);
    const w = sim.world;
    sim.acc += seconds;
    let n = 0;
    while (sim.acc >= w.dt && n < 1200) {
      w.step(); sim.acc -= w.dt; sim.t += w.dt; n++;
      stepTools(w.dt);
    }
    syncFromWorld();
  }

  function play() {
    if (sim.status === "running") { sim.status = "paused"; w_grabEnd(); updateTransport(); return; }
    if (sim.status === "edit") {
      sim.snapshot = serialize();
      sim.t = 0; sim.acc = 0;
      state.items.forEach(it => { if (it.rt) { delete it.rt.samples; delete it.rt.L; } });
      buildWorld(true);
    }
    sim.status = "running"; updateTransport();
  }
  function stepOnce() {
    if (sim.status === "edit") { play(); sim.status = "paused"; }
    else sim.status = "paused";
    advance(1 / 60); updateTransport();
  }
  function reset() {
    if (sim.snapshot) { load(sim.snapshot); }
    sim.snapshot = null; sim.status = "edit"; sim.t = 0; sim.acc = 0; sim.world = null; sim.map = new Map();
    state.items.forEach(it => { it.rt = {}; });
    changed({ save: false }); updateTransport();
  }
  function w_grabEnd() { if (sim.world) sim.world.grab = null; }

  /* ---------- 電路與光路（每一格） ---------- */
  function evalCircuit(dt) {
    const elec = state.items.filter(it => T[it.type].circuit);
    if (!elec.length) return;
    const comps = elec.map(it => Object.assign(T[it.type].circuit(it), { id: it.id, t: [it.id + ":0", it.id + ":1"] }));
    const out = LAB.circuit.solve(comps, state.wires.map(w => [w.a, w.b]));
    elec.forEach(it => {
      const r = out.comp[it.id]; if (!r) return;
      const rt = it.rt || (it.rt = {});
      rt.I = r.I; rt.V = r.V; rt.P = r.P;
      if (it.type === "battery") rt.short = r.I > 2 && r.I > 0.7 * it.p.E / it.p.r;
      if (it.type === "bulb" && !rt.burnt && r.P > it.p.Pr * 2.5) { rt.burnt = true; toast("燈泡過載燒斷了：功率 " + U.fmt(r.P, 2) + " W，額定只有 " + it.p.Pr + " W"); }
    });
    state.wires.forEach((w, i) => {
      const I = out.wire[i] || 0;
      w.I = I;
      const sp = Math.sign(I) * Math.min(220, Math.max(Math.abs(I) > 1e-4 ? 8 : 0, Math.abs(I) * 70));
      wirePhase.set(w.id, ((wirePhase.get(w.id) || 0) + sp * dt));
    });
  }
  function evalOptics() {
    const sources = [], els = [];
    state.items.forEach(it => {
      const d = T[it.type];
      if (d.source) d.source(it).forEach(s => sources.push(s));
      if (d.optic) els.push(d.optic(it));
      if (it.type === "screen") (it.rt || (it.rt = {})).hits = [];
    });
    if (!sources.length) { rays = []; return; }
    const res = LAB.optics.trace(sources, els);
    rays = res.segs;
    res.hits.forEach(h => { const it = byId(h.id); if (it && it.rt) it.rt.hits.push(h); });
  }
  function evalEnergy() {
    const meters = state.items.filter(it => it.type === "energy");
    if (!meters.length) return;
    let E = null;
    if (sim.world && sim.status !== "edit") E = sim.world.energy(WORLD.floor);
    else if (state.items.some(it => T[it.type].body && !T[it.type].fixed)) {
      // 編輯中：用目前擺設與初速算一次（播放前就能看到起點能量）
      const w = new LAB.mech.World(); const map = new Map();
      state.items.forEach(it => { const d = T[it.type]; if (d.body && !d.fixed) { const s = d.body(it); s.x = it.x; s.y = it.y; s.a = it.a; map.set(it.id, w.add(s)); } });
      state.items.forEach(it => {
        if ((it.type === "spring" || it.type === "gauge") && it.ends) {
          const r = e => { const b = e.at && map.get(e.at.id); return b ? { b, x: e.at.lx, y: e.at.ly } : { b: null, x: e.x, y: e.y }; };
          const A = r(it.ends[0]), B = r(it.ends[1]);
          w.spring({ a: A.b, ax: A.x, ay: A.y, b: B.b, bx: B.x, by: B.y, k: it.p.k, L0: it.p.L0 });
        }
      });
      E = w.energy(WORLD.floor);
    }
    meters.forEach(m => { m.rt = m.rt || {}; m.rt.E = E; if (sim.status === "edit") m.rt.Emax = 0; });
  }

  /* ============================== 繪圖 ============================== */
  function resize() {
    const r = canvas.parentNode.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(200, Math.round(r.width)); H = Math.max(200, Math.round(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!view.fitted || !view.manual) fit();
  }
  /*
   * 置中：框住實驗台上的器材（至少 180 × 110 cm），沒有器材就框整張桌子。
   * 手機上整張桌子 4 m 寬會把器材縮得太小，框住實際用到的範圍比較看得清楚。
   */
  function contentBounds() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    state.items.forEach(it => {
      const d = T[it.type];
      if (d.card) { add(it.x - d.card.w / 5, it.y - d.card.h / 5); add(it.x + d.card.w / 5, it.y + d.card.h / 5); return; }
      const s = d.size ? d.size(it) : { w: 0, h: 0 }, r = Math.hypot(s.w, s.h) / 2;
      add(it.x - r, it.y - r); add(it.x + r, it.y + r);
      (it.ends || []).forEach((_, i) => { const p = endPos(it, i); add(p.x, p.y); });
    });
    if (!isFinite(x0)) return null;
    if (state.items.some(it => T[it.type].cat === "mech")) y1 = Math.max(y1, WORLD.floor + 4);
    x0 -= 15; x1 += 15; y0 -= 15; y1 += 6;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const w = Math.max(180, x1 - x0), h = Math.max(110, y1 - y0);
    return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
  }
  function fit() {
    const pad = 12, bottom = 34;
    const b = contentBounds() || { x0: 0, x1: WORLD.w, y0: -4, y1: WORLD.h + 2 };
    const s = Math.min((W - pad * 2) / (b.x1 - b.x0), (H - pad - bottom) / (b.y1 - b.y0));
    view.s = Math.max(0.5, Math.min(8, s));
    view.ox = (b.x0 + b.x1) / 2 - W / 2 / view.s;
    view.oy = b.y1 - (H - bottom) / view.s;
    // 內容比畫面矮時，把桌面貼在下緣、上方留空
    view.fitted = true; view.manual = false;
  }
  // 卡片（圖表、碼錶、能量計）的縮放：大畫面原尺寸，手機上縮到六成
  const cardScale = () => Math.max(0.6, Math.min(1, Math.min(W / 900, view.s / 2.2)));
  function zoomAt(f, sx, sy) {
    view.manual = true;
    const wx = WX(sx), wy = WY(sy);
    view.s = Math.max(0.6, Math.min(14, view.s * f));
    view.ox = wx - sx / view.s; view.oy = wy - sy / view.s;
  }

  function drawBackground() {
    const light = isLight();
    ctx.fillStyle = light ? "#eef2f7" : "#141920"; ctx.fillRect(0, 0, W, H);
    if (ui.grid) {
      const step = view.s >= 5 ? 5 : 10, x0 = Math.floor(WX(0) / step) * step, y0 = Math.floor(WY(0) / step) * step;
      ctx.lineWidth = 1;
      for (let x = x0; X(x) < W; x += step) {
        ctx.strokeStyle = x % 50 === 0 ? (light ? "rgba(30,50,90,0.13)" : "rgba(255,255,255,0.075)") : (light ? "rgba(30,50,90,0.055)" : "rgba(255,255,255,0.03)");
        ctx.beginPath(); ctx.moveTo(Math.round(X(x)) + 0.5, 0); ctx.lineTo(Math.round(X(x)) + 0.5, Y(WORLD.floor)); ctx.stroke();
      }
      for (let y = y0; y < WORLD.floor; y += step) {
        if (Y(y) > H) break;
        ctx.strokeStyle = y % 50 === 0 ? (light ? "rgba(30,50,90,0.13)" : "rgba(255,255,255,0.075)") : (light ? "rgba(30,50,90,0.055)" : "rgba(255,255,255,0.03)");
        ctx.beginPath(); ctx.moveTo(0, Math.round(Y(y)) + 0.5); ctx.lineTo(W, Math.round(Y(y)) + 0.5); ctx.stroke();
      }
    }
    // 實驗桌
    const fy = Y(WORLD.floor);
    const g = ctx.createLinearGradient(0, fy, 0, fy + 14);
    g.addColorStop(0, light ? "#c89b67" : "#8a6440"); g.addColorStop(1, light ? "#a87a48" : "#5d4128");
    ctx.fillStyle = g; ctx.fillRect(0, fy, W, Math.min(14, H - fy));
    ctx.fillStyle = light ? "#d9dee6" : "#232a34"; ctx.fillRect(0, fy + 14, W, Math.max(0, H - fy - 14));
    ctx.strokeStyle = light ? "rgba(70,40,10,0.45)" : "rgba(255,220,180,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, fy + 0.5); ctx.lineTo(W, fy + 0.5); ctx.stroke();
    // 實驗台左右邊界（力學世界的牆）
    ctx.strokeStyle = light ? "rgba(30,50,90,0.18)" : "rgba(255,255,255,0.12)"; ctx.setLineDash([6, 6]);
    [0, WORLD.w].forEach(x => { ctx.beginPath(); ctx.moveTo(X(x) + 0.5, 0); ctx.lineTo(X(x) + 0.5, fy); ctx.stroke(); });
    ctx.setLineDash([]);
    // 比例尺
    const bar = view.s * 50 > 140 ? 20 : 50;
    ctx.fillStyle = light ? "rgba(30,40,56,0.7)" : "rgba(230,237,243,0.7)"; ctx.font = "600 11px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillRect(12, 14, bar * view.s, 3); ctx.fillRect(12, 10, 1.5, 11); ctx.fillRect(12 + bar * view.s - 1.5, 10, 1.5, 11);
    ctx.fillText(bar + " cm", 18 + bar * view.s, 16);
  }

  function drawWires() {
    const light = isLight();
    const palette = ["#d6453d", "#2a3038", "#2f7de1", "#1f9d6b", "#d9a400"];
    state.wires.forEach((w, i) => {
      const a = termPos(w.a), b = termPos(w.b); if (!a || !b) return;
      const ax = X(a.x), ay = Y(a.y), bx = X(b.x), by = Y(b.y);
      const L = Math.hypot(bx - ax, by - ay), sag = Math.min(22, L * 0.06);
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
      const sel = ui.selWire === w.id;
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = sel ? (light ? "#0f766e" : "#35e0cf") : "rgba(0,0,0,0.25)"; ctx.lineWidth = sel ? 7 : 5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      ctx.strokeStyle = palette[i % palette.length]; ctx.lineWidth = 3;
      if (palette[i % palette.length] === "#2a3038" && !light) ctx.strokeStyle = "#5c6878";
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
      // 電流光點：沿電流方向移動（傳統電流方向）
      const I = w.I || 0;
      if (Math.abs(I) > 1e-4) {
        const ph = wirePhase.get(w.id) || 0, gap = 16, n = Math.max(1, Math.floor(L / gap));
        ctx.fillStyle = light ? "#e39400" : "#fff4c2";
        for (let k = 0; k < n; k++) {
          let t = ((k * gap + ph) % (n * gap)) / (n * gap); if (t < 0) t += 1;
          const px = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx, py = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by;
          ctx.beginPath(); ctx.arc(px, py, 2.1, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    });
    // 拉線中的橡皮筋
    const d = ui.drag;
    if (d && d.mode === "wire") {
      const a = termPos(d.from);
      if (a) {
        ctx.save(); ctx.strokeStyle = isLight() ? "#0f766e" : "#35e0cf"; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(d.sx, d.sy); ctx.stroke(); ctx.restore();
      }
    }
  }
  function drawTerminals() {
    const wiring = ui.drag && ui.drag.mode === "wire";
    state.items.forEach(it => {
      const P = terms(it); if (!P.length) return;
      P.forEach((p, k) => {
        const x = X(p.x), y = Y(p.y), key = it.id + ":" + k;
        const hot = (ui.hover && ui.hover.term === key) || (wiring && ui.drag.from !== key);
        ctx.save();
        if (hot) { ctx.fillStyle = isLight() ? "rgba(15,118,110,0.22)" : "rgba(53,224,207,0.25)"; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = it.type === "battery" ? (k === 0 ? "#c43e34" : "#2a3038") : "#b08a3e";
        ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#f0d08c"; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    });
  }
  function drawRays() {
    if (!rays.length) return;
    const light = isLight();
    ctx.save();
    if (!light) ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    rays.forEach(s => {
      const a = Math.min(1, s.I) * (light ? 0.95 : 0.85);
      let col;
      if (!s.nm) col = light ? `rgba(226,150,0,${a})` : `rgba(255,248,226,${a})`;
      else col = U.nmCss(s.nm, a);
      // 外暈＋芯線：亮的光線看起來像光
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(s.x1), Y(s.y1)); ctx.lineTo(X(s.x2), Y(s.y2)); ctx.stroke();
      if (!light && s.I > 0.3) { ctx.globalAlpha = 0.25; ctx.lineWidth = 6; ctx.stroke(); ctx.globalAlpha = 1; }
    });
    ctx.restore();
  }
  function drawSelection(it) {
    const d = T[it.type];
    ctx.save(); ctx.strokeStyle = isLight() ? "#0f766e" : "#35e0cf"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    if (d.card) {
      const k = cardScale(), cw = d.card.w * k, ch = d.card.h * k; ctx.strokeRect(X(it.x) - cw / 2 - 4, Y(it.y) - ch / 2 - 4, cw + 8, ch + 8);
    } else if (d.size) {
      const s = d.size(it), pad = 4 / view.s;
      ctx.translate(X(it.x), Y(it.y)); ctx.rotate(it.a || 0);
      ctx.strokeRect((-s.w / 2 - pad) * view.s, (-s.h / 2 - pad) * view.s, (s.w + 2 * pad) * view.s, (s.h + 2 * pad) * view.s);
    } else if (it.ends && it.ends.length === 2) {
      const E = endsOf(it); ctx.lineWidth = 9; ctx.globalAlpha = 0.25; ctx.setLineDash([]); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(X(E[0].x), Y(E[0].y)); ctx.lineTo(X(E[1].x), Y(E[1].y)); ctx.stroke();
    }
    ctx.restore();
    const h = rotHandle(it);
    if (h) {
      ctx.save(); ctx.strokeStyle = isLight() ? "#0f766e" : "#35e0cf"; ctx.fillStyle = isLight() ? "#fff" : "#141920"; ctx.lineWidth = 2;
      const c = { x: X(it.x), y: Y(it.y) };
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(h.x, h.y); ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(h.x, h.y, 3, -0.3, 4.2); ctx.stroke();
      ctx.restore();
    }
  }
  function canRotate(it) {
    const d = T[it.type];
    return !d.card && (d.params || []).some(p => p.rotation);
  }
  function rotHandle(it) {
    if (!canRotate(it) || ui.sel !== it.id) return null;
    const s = T[it.type].size ? T[it.type].size(it) : { h: 10 };
    const r = s.h / 2 * view.s + 26;
    return { x: X(it.x) + Math.sin(it.a || 0) * r, y: Y(it.y) - Math.cos(it.a || 0) * r };
  }
  function drawEndHandles() {
    state.items.forEach(it => {
      const d = T[it.type]; if (!it.ends) return;
      const E = endsOf(it), show = ui.sel === it.id || (ui.hover && ui.hover.id === it.id) || d.freeEnds || it.ends.some(e => !e.at);
      if (!show) return;
      E.forEach((p, i) => {
        const e = it.ends[i], x = X(p.x), y = Y(p.y), on = !!e.at;
        ctx.save();
        ctx.fillStyle = on ? (isLight() ? "#0f766e" : "#35e0cf") : (isLight() ? "#ffffff" : "#1c232d");
        ctx.strokeStyle = isLight() ? "#0f766e" : "#35e0cf"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, d.freeEnds ? 5 : 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
    });
  }

  /* 吸附參考線、目標圈與角度標籤：拖曳、拿起端點、畫線、搬器材時都看得到 */
  function drawSnapGuides() {
    const sn = ui.snap, accent = isLight() ? "#0f766e" : "#35e0cf";
    // 接線：起點到游標的橡皮筋
    if (ui.place && ui.place.kind === "wire" && ui.pointer) {
      const a = termPos(ui.place.from);
      if (a) { ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(ui.pointer.sx, ui.pointer.sy); ctx.stroke(); ctx.restore(); }
    }
    if (!sn) return;
    ctx.save();
    ctx.strokeStyle = accent; ctx.lineWidth = 1.2; ctx.setLineDash([5, 5]); ctx.globalAlpha = 0.85;
    (sn.guides || []).forEach(g => {
      if (g.axis === "y") { ctx.beginPath(); ctx.moveTo(0, Y(g.y1) + 0.5); ctx.lineTo(W, Y(g.y1) + 0.5); ctx.stroke(); }
      else if (g.axis === "x") { ctx.beginPath(); ctx.moveTo(X(g.x1) + 0.5, 0); ctx.lineTo(X(g.x1) + 0.5, Y(WORLD.floor)); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(X(g.x1), Y(g.y1)); ctx.lineTo(X(g.x2), Y(g.y2)); ctx.stroke(); }
    });
    ctx.restore();
    if (!sn.it) return;
    const it = sn.it, i = sn.i, p = endPos(it, i), ref = endRefPoint(it, i);
    // 會接到的目標：綠圈
    if (sn.target) {
      const t = byId(sn.target.id);
      if (t) { const q = U.local(t, sn.target.lx, sn.target.ly); ctx.save(); ctx.strokeStyle = "#1f9d6b"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
    // 拿起中的端點：外圈脈動
    ctx.save(); ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 160);
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 11, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (ref) {
      // 接上目標時，最後的位置可能被吸到物體中心：標籤用最後的位置算
      let q = { x: p.x, y: p.y };
      if (sn.target) { const t = byId(sn.target.id); if (t) q = U.local(t, sn.target.lx, sn.target.ly); }
      const ang = Math.atan2(-(q.y - ref.y), q.x - ref.x) / DEG, L = Math.hypot(q.x - ref.x, q.y - ref.y);
      const exact = sn.kind === "angle" && Math.abs(((ang - sn.angle) % 360 + 540) % 360 - 180) < 0.05;
      U.chip(ctx, angleText(ang) + " · " + U.fmt(L, 1) + " cm" + (exact ? " ✓" : ""), X(q.x) + 18, Y(q.y) - 18, { size: 11 });
    }
  }
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground();
    const V = { s: view.s, X, Y, status: sim.status, detail: ui.detail, t: performance.now() / 1000, selected: false, cs: cardScale() };
    const list = sorted();
    let raysDrawn = false;
    list.forEach(it => {
      const L = layer(it);
      if (L >= 3 && !raysDrawn) { drawWires(); drawTerminals(); raysDrawn = true; }
      if (L >= 4 && raysDrawn !== "r") { drawRays(); raysDrawn = "r"; }
      V.selected = ui.sel === it.id;
      try { T[it.type].draw(ctx, it, V, endsOf(it)); } catch (e) { console.warn("繪製失敗", it.type, e); }
    });
    if (!raysDrawn) { drawWires(); drawTerminals(); }
    if (raysDrawn !== "r") drawRays();
    drawEndHandles();
    const sel = byId(ui.sel); if (sel) drawSelection(sel);
    drawSnapGuides();
  }

  /* ============================== 點選 ============================== */
  function distSeg(px, py, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay, L2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey) / L2));
    return Math.hypot(px - ax - ex * t, py - ay - ey * t);
  }
  function itemHit(it, sx, sy) {
    const d = T[it.type], wx = WX(sx), wy = WY(sy);
    if (d.card) return Math.abs(sx - X(it.x)) <= d.card.w / 2 * cardScale() && Math.abs(sy - Y(it.y)) <= d.card.h / 2 * cardScale();
    if (d.hit) return d.hit(it, wx, wy);
    if (it.type === "force") {
      const p = endPos(it, 0), a = it.p.dir * DEG, L = 34 + Math.min(80, it.p.F * 10);
      return distSeg(sx, sy, X(p.x), Y(p.y), X(p.x) + Math.cos(a) * L, Y(p.y) - Math.sin(a) * L) <= 8;
    }
    if (d.connector && !d.size) {
      const E = endsOf(it);
      return E.length === 2 && distSeg(sx, sy, X(E[0].x), Y(E[0].y), X(E[1].x), Y(E[1].y)) <= 8;
    }
    if (!d.size) return false;
    const s = d.size(it), l = U.toLocal(it, wx, wy), pad = 4 / view.s;
    return Math.abs(l.x) <= s.w / 2 + pad && Math.abs(l.y) <= s.h / 2 + pad;
  }
  function pick(sx, sy) {
    const sel = byId(ui.sel), h = sel && rotHandle(sel);
    if (h && Math.hypot(h.x - sx, h.y - sy) <= 10) return { kind: "rotate", it: sel };
    const list = sorted().reverse();
    for (const it of list) {
      if (!it.ends) continue;
      const E = endsOf(it);
      for (let i = 0; i < E.length; i++) if (Math.hypot(X(E[i].x) - sx, Y(E[i].y) - sy) <= 9) return { kind: "end", it, i };
    }
    for (const it of list) {
      if (it.type === "stopwatch" && itemHit(it, sx, sy)) {
        const b = T.stopwatch.button(it, { X, Y, cs: cardScale() }, sx, sy);
        if (b) return { kind: "button", it, b };
      }
    }
    const tm = termAt(sx, sy);
    if (tm) return { kind: "term", t: tm };
    for (const it of list) if (itemHit(it, sx, sy)) return { kind: "item", it };
    for (let i = state.wires.length - 1; i >= 0; i--) {
      const w = state.wires[i], a = termPos(w.a), b = termPos(w.b); if (!a || !b) continue;
      const ax = X(a.x), ay = Y(a.y), bx = X(b.x), by = Y(b.y), L = Math.hypot(bx - ax, by - ay), sag = Math.min(22, L * 0.06);
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
      for (let k = 0; k < 16; k++) {
        const t0 = k / 16, t1 = (k + 1) / 16;
        const q = t => ({ x: (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * bx, y: (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * by });
        const p0 = q(t0), p1 = q(t1);
        if (distSeg(sx, sy, p0.x, p0.y, p1.x, p1.y) <= 6) return { kind: "wire", w };
      }
    }
    return null;
  }
  /* ---------- 擺放吸附：角度、對齊、格點（計算在 LAB.snapPoint） ---------- */
  // 對齊用的參考點：器材中心、連接件端點；正在動的那一個自己不算
  function alignPoints(skipId) {
    const pts = [];
    state.items.forEach(it => {
      if (it.id === skipId) return;
      const d = T[it.type];
      if (d.card) return;
      if (!d.connector || d.size) pts.push({ x: it.x, y: it.y });
      if (it.ends) endsOf(it).forEach(p => pts.push({ x: p.x, y: p.y }));
    });
    return pts;
  }
  // 端點 i 的基準點：角度吸附量的是「從基準點看過去」的方向
  function endRefPoint(it, i) {
    if (it.type === "pulley") return { x: it.x + (i ? 1 : -1) * it.p.r, y: it.y };   // 繩從輪緣垂下
    if (it.type === "protractor") return { x: it.x, y: it.y };
    if (it.ends && it.ends.length === 2) return endPos(it, 1 - i);
    return null;
  }
  function snapEnd(it, i, wx, wy, free) {
    return LAB.snapPoint({ x: wx, y: wy }, { ref: endRefPoint(it, i), points: alignPoints(it.id), scale: view.s, grid: ui.grid ? SNAP : 0, free });
  }
  // 把端點放到 (wx, wy)，順便找可以接上的目標；拖曳、點一下放下、方向鍵都走這裡
  function moveEndTo(it, i, wx, wy, free) {
    const sn = snapEnd(it, i, wx, wy, free), e0 = it.ends[i];
    e0.at = null; e0.x = sn.x; e0.y = sn.y;
    // 已經吸到某個角度時，接上物體就接在這一點，不要再吸到中心——否則剛對好的水平又歪掉
    const target = attachTarget(it, i, sn.x, sn.y, X(sn.x), Y(sn.y), sn.kind === "angle");
    ui.snap = Object.assign(sn, { it, i, target });
    sim.dirty = true;
    return target;
  }
  // 端點放開時可以接上的目標：可動物體（任意位置）、吊鉤、固定器材
  function attachTarget(it, i, wx, wy, sx, sy, exact) {
    const d = T[it.type];
    if (d.freeEnds) return null;
    const onlyDynamic = it.type === "force" || it.type === "sensor";
    const list = sorted().reverse();
    for (const t of list) {
      if (t.id === it.id) continue;
      const td = T[t.type];
      if (td.anchor && Math.hypot(X(t.x) - sx, Y(t.y) - sy) <= 14 && !onlyDynamic) return { id: t.id, lx: 0, ly: 0 };
    }
    for (const t of list) {
      if (t.id === it.id) continue;
      const td = T[t.type];
      if (!td.body) continue;
      if (onlyDynamic && td.fixed) continue;
      if (!itemHit(t, sx, sy)) continue;
      const l = U.toLocal(t, wx, wy);
      // 接在物體中心附近就吸到中心：力和繩通過質心，不會莫名其妙地轉
      const s = td.size ? td.size(t) : { w: 10, h: 10 };
      const centered = it.type === "sensor" || (!exact && Math.hypot(l.x, l.y) < Math.min(s.w, s.h) * 0.3);
      return { id: t.id, lx: centered ? 0 : l.x, ly: centered ? 0 : l.y };
    }
    return null;
  }

  /* ============================== 操作 ============================== */
  const snapV = v => (ui.grid ? Math.round(v / SNAP) * SNAP : v);
  function setSel(id, wire) {
    ui.sel = id || null; ui.selWire = wire || null; inspectorKey = "";
  }
  function addItem(type, wx, wy, opts) {
    const before = serialize();
    const it = newItem(type, snapV(wx), snapV(wy));
    const d = T[type];
    // 連接件放下時順手接上：上端靠近吊鉤就接吊鉤，下端落在物體上就接物體
    if (it.ends && !d.freeEnds && !(opts && opts.raw)) {
      if (it.type === "sensor" || it.type === "force") {
        const tgt = attachTarget(it, 0, wx, wy, X(wx), Y(wy));
        it.ends[0].x = wx; it.ends[0].y = wy;
        if (tgt) it.ends[0].at = tgt;
        if (it.type === "sensor") { it.x = wx; it.y = wy - (T.sensor.card.h / 2 + 50) / view.s; }
      } else if (it.ends.length === 2 && it.type !== "pulley") {
        const hook = state.items.find(t => T[t.type].anchor && Math.hypot(t.x - it.ends[0].x, t.y - it.ends[0].y) < 25);
        if (hook) {
          const dy = it.ends[1].y - it.ends[0].y;
          it.ends[0] = { x: hook.x, y: hook.y, at: { id: hook.id, lx: 0, ly: 0 } };
          it.ends[1].x = hook.x; it.ends[1].y = hook.y + dy;
        }
      }
    }
    if (d.card && !(opts && opts.raw) && type !== "sensor") { it.x = wx; it.y = wy; }
    state.items.push(it);
    if (!(opts && opts.silent)) { pushUndo(before); setSel(it.id); changed(); status("已加入「" + d.name + "」。" + (it.ends && !d.freeEnds ? "把圓點拖到物體或吊鉤上接住。" : "")); }
    return it;
  }
  function removeItem(id) {
    state.items = state.items.filter(it => it.id !== id);
    state.wires = state.wires.filter(w => w.a.split(":")[0] !== id && w.b.split(":")[0] !== id);
    state.items.forEach(it => (it.ends || []).forEach(e => { if (e.at && e.at.id === id) e.at = null; }));
  }
  function deleteSelection() {
    if (ui.selWire) { pushUndo(); state.wires = state.wires.filter(w => w.id !== ui.selWire); setSel(null); changed(); status("已刪除導線"); return; }
    const it = byId(ui.sel); if (!it) return;
    pushUndo(); removeItem(it.id); setSel(null); changed(); status("已刪除「" + T[it.type].name + "」（Ctrl+Z 復原）");
  }
  function duplicate() {
    const it = byId(ui.sel); if (!it) return;
    pushUndo();
    const c = clone({ type: it.type, x: it.x, y: it.y, a: it.a, p: it.p, ends: it.ends });
    c.id = "i" + state.seq++; c.x += 10; c.y -= 6;
    if (c.ends) c.ends.forEach(e => { e.at = null; e.x += 10; e.y -= 6; });
    state.items.push(c); setSel(c.id); changed();
  }
  function rotateSel(dir) {
    const it = byId(ui.sel); if (!it || !canRotate(it)) return;
    const step = rot90Type(it) ? 90 : ROT_SNAP;
    pushUndo();
    it.a = Math.round(((it.a || 0) / DEG + dir * step) / step) * step * DEG;
    normAngle(it); changed();
  }
  const rot90Type = it => (T[it.type].params || []).some(p => p.rotation && p.kind === "select");
  function normAngle(it) { let d = (it.a || 0) / DEG; d = ((d + 180) % 360 + 360) % 360 - 180; it.a = d * DEG; }

  /* ---------- 畫布指標事件 ---------- */
  function onDown(e) {
    canvas.focus({ preventScroll: true });
    const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    ui.pointers.set(e.pointerId, { x: sx, y: sy });
    if (ui.pointers.size === 2) {
      // 兩指：縮放＋平移
      const [p, q] = Array.from(ui.pointers.values());
      ui.pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, s: view.s, ox: view.ox, oy: view.oy };
      view.manual = true;
      cancelDrag(); return;
    }
    canvas.setPointerCapture(e.pointerId);
    closeMenus();
    const base = { sx0: sx, sy0: sy, sx, sy, moved: false, before: serialize() };
    // 畫線模式：這一下是一個節點（起點）
    if (ui.draw && e.button === 0) { drawStart(sx, sy, e.shiftKey); return; }
    // 已經拿起一個端點：這一下就是放下的位置（按住拖也可以，放開時才定案，觸控好用）
    if (ui.place && ui.place.kind === "end" && e.button === 0) {
      const P = ui.place;
      ui.drag = Object.assign(base, { mode: "end", it: P.it, i: P.i, before: P.before, moved: true, fromPlace: true });
      ui.drag.target = moveEndTo(P.it, P.i, WX(sx), WY(sy), e.shiftKey);
      return;
    }
    if (ui.place && ui.place.kind === "wire" && e.button === 0) {
      const t = termAt(sx, sy), from = ui.place.from;
      ui.place = null;
      if (t && t.key !== from) connectWire(from, t.key, base.before);
      else status("已取消接線。");
      return;
    }
    const hit = pick(sx, sy);
    ui.selEnd = null;
    if (e.button === 1 || !hit) {
      if (!hit && e.button !== 1) setSel(null);
      ui.drag = Object.assign(base, { mode: "pan", ox: view.ox, oy: view.oy });
      return;
    }
    if (hit.kind === "button") {
      const rt = hit.it.rt || (hit.it.rt = {});
      if (hit.b === "toggle") rt.on = !rt.on; else { rt.on = false; rt.elapsed = 0; }
      if (rt.on && sim.status !== "running") status("碼錶量的是模擬時間：按「播放」它才會走。");
      setSel(hit.it.id); return;
    }
    if (hit.kind === "rotate") { ui.drag = Object.assign(base, { mode: "rotate", it: hit.it }); return; }
    if (hit.kind === "end") { setSel(hit.it.id); ui.selEnd = { id: hit.it.id, i: hit.i }; ui.drag = Object.assign(base, { mode: "end", it: hit.it, i: hit.i }); return; }
    if (hit.kind === "term") { setSel(hit.t.it.id); ui.drag = Object.assign(base, { mode: "wire", from: hit.t.key }); return; }
    if (hit.kind === "wire") { setSel(null, hit.w.id); ui.drag = null; return; }
    const it = hit.it; setSel(it.id);
    const b = sim.map.get(it.id);
    if (sim.status === "running" && b && !b.isStatic) {
      const l = U.toLocal(it, WX(sx), WY(sy));
      sim.world.grab = { body: b, lx: l.x, ly: l.y, tx: WX(sx), ty: WY(sy) };
      ui.drag = Object.assign(base, { mode: "grab" });
      return;
    }
    ui.drag = Object.assign(base, { mode: "move", it, dx: WX(sx) - it.x, dy: WY(sy) - it.y,
      ends0: it.ends ? it.ends.map((e, i) => Object.assign({}, endPos(it, i))) : null, x0: it.x, y0: it.y });
  }
  function onMove(e) {
    const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (ui.pointers.has(e.pointerId)) ui.pointers.set(e.pointerId, { x: sx, y: sy });
    if (ui.pinch && ui.pointers.size >= 2) {
      const [p, q] = Array.from(ui.pointers.values()), P = ui.pinch;
      const d = Math.hypot(p.x - q.x, p.y - q.y), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      view.s = Math.max(0.6, Math.min(14, P.s * d / Math.max(10, P.d)));
      const wx = P.mx / P.s + P.ox, wy = P.my / P.s + P.oy;
      view.ox = wx - mx / view.s; view.oy = wy - my / view.s;
      return;
    }
    ui.pointer = { sx, sy };
    const d = ui.drag;
    if (!d) {
      if (ui.place && ui.place.kind === "end") { ui.place.target = moveEndTo(ui.place.it, ui.place.i, WX(sx), WY(sy), e.shiftKey); canvas.style.cursor = "crosshair"; return; }
      if (ui.place || ui.draw) { canvas.style.cursor = "crosshair"; ui.snap = ui.draw ? LAB.snapPoint({ x: WX(sx), y: WY(sy) }, { points: alignPoints(null), scale: view.s, grid: ui.grid ? SNAP : 0, free: e.shiftKey }) : null; return; }
      hover(sx, sy); return;
    }
    d.sx = sx; d.sy = sy;
    if (!d.moved && Math.hypot(sx - d.sx0, sy - d.sy0) > 4) d.moved = true;
    if (!d.moved) return;
    const wx = WX(sx), wy = WY(sy);
    if (d.mode === "pan") { view.manual = true; view.ox = d.ox - (sx - d.sx0) / view.s; view.oy = d.oy - (sy - d.sy0) / view.s; return; }
    if (d.mode === "grab") { sim.world.grab.tx = wx; sim.world.grab.ty = wy; return; }
    if (d.mode === "rotate") {
      const it = d.it; let a = Math.atan2(wx - it.x, -(wy - it.y)) / DEG;
      const step = rot90Type(it) ? 90 : (ui.grid && !e.shiftKey ? ROT_SNAP : 0);
      if (step) a = Math.round(a / step) * step;
      it.a = a * DEG; normAngle(it); sim.dirty = true; inspectorKey = ""; return;
    }
    if (d.mode === "end") { d.target = moveEndTo(d.it, d.i, wx, wy, e.shiftKey); return; }
    if (d.mode === "move") {
      // 器材中心對齊其他器材的中心與端點（例如把吊鉤拉到和木塊中心同高，繩子才會水平）
      const sn = LAB.snapPoint({ x: wx - d.dx, y: wy - d.dy }, { points: alignPoints(d.it.id), scale: view.s, grid: ui.grid ? SNAP : 0, free: e.shiftKey });
      ui.snap = sn.kind ? sn : null;
      const it = d.it, nx = sn.x, ny = sn.y;
      const ddx = nx - d.x0, ddy = ny - d.y0;
      it.x = nx; it.y = ny;
      if (it.ends && d.ends0) {
        const own = T[it.type].ownBody;
        it.ends.forEach((e, i) => {
          if (own && e.at) return;           // 滑輪、量角器：已接上的端點留在物體上
          e.at = null; e.x = d.ends0[i].x + ddx; e.y = d.ends0[i].y + ddy;
        });
      }
      if (it.rt) { it.rt.vx = 0; it.rt.vy = 0; it.rt.w = 0; }
      sim.dirty = true; inspectorKey = "";
    }
  }
  function onUp(e) {
    ui.pointers.delete(e.pointerId);
    if (ui.pinch) { if (ui.pointers.size < 2) ui.pinch = null; return; }
    const d = ui.drag; ui.drag = null;
    if (d && d.mode !== "end" && d.mode !== "wire") ui.snap = null;
    if (!d) return;
    const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (d.mode === "grab") { if (sim.world) sim.world.grab = null; return; }
    if (d.mode === "wire") {
      const t = termAt(sx, sy);
      if (t && t.key !== d.from) {
        const dup = state.wires.some(w => (w.a === d.from && w.b === t.key) || (w.b === d.from && w.a === t.key));
        if (!dup) { pushUndo(d.before); state.wires.push({ id: "w" + state.seq++, a: d.from, b: t.key }); changed(); status("已接上導線。點導線可選取、按 Delete 刪除。"); }
      } else if (d.moved) status("導線要從一個接線柱拖到另一個接線柱。");
      else { ui.place = { kind: "wire", from: d.from }; status("已選起點：點另一個接線柱接上導線（Esc 取消）。"); }
      return;
    }
    if (d.mode === "end" && !d.moved) {
      if (d.fromPlace) return;   // 剛點下畫線的起點：繼續等下一下（終點）
      // 點一下端點＝拿起來：之後跟著滑鼠走，再點一下放下。不用一直按住，手不穩也拉得直
      const it = d.it;
      ui.place = { kind: "end", it, i: d.i, before: d.before, orig: Object.assign({}, it.ends[d.i]) };
      ui.place.target = moveEndTo(it, d.i, WX(sx), WY(sy), e.shiftKey);
      status("已拿起端點：移到要放的位置再點一下。靠近水平、鉛直會自動吸附（按住 Shift 不吸附），Esc 或「取消擺放」可以取消。");
      return;
    }
    if (d.mode === "end" && d.moved) {
      d.target = moveEndTo(d.it, d.i, WX(sx), WY(sy), e.shiftKey);
      finishEnd(d.it, d.i, d.target, d.before);
      return;
    }
    if (d.mode === "move" && !d.moved) {
      const it = d.it, dd = T[it.type];
      if (dd.clickToggle) { pushUndo(d.before); it.p[dd.clickToggle] = !it.p[dd.clickToggle]; changed(); }
      return;
    }
    if ((d.mode === "move" || d.mode === "rotate") && d.moved) { pushUndo(d.before); changed(); }
  }
  function cancelDrag() { if (ui.drag && ui.drag.mode === "grab" && sim.world) sim.world.grab = null; ui.drag = null; }
  // 端點定案：接上目標、記一筆復原、離開放置模式；之後方向鍵還能微調這個端點
  function finishEnd(it, i, target, before) {
    const P = ui.place;
    ui.place = null; ui.snap = null;
    if (target) it.ends[i].at = target;
    if (P && P.drawing) {
      const E = endsOf(it);
      const len = Math.hypot(E[1].x - E[0].x, E[1].y - E[0].y);
      if (len < 2) { removeItem(it.id); setSel(null); ui.selEnd = null; changed(); status("太短了，已取消。"); return; }
      // 畫出來的彈簧就當作原長：不然預設 20 cm 的彈簧一畫成 60 cm，還沒掛東西就先被拉長 40 cm
      if (it.type === "spring") it.p.L0 = Math.max(2, Math.min(150, Math.round(len)));
    }
    ui.selEnd = { id: it.id, i };
    pushUndo(before); changed();
    const E = endsOf(it), ref = endRefPoint(it, i);
    let msg = target ? "已接到「" + (byId(target.id) ? T[byId(target.id).type].name : "") + "」。" : "已放下。";
    if (P && P.drawing && it.type === "spring") msg += "自然長度設成畫出來的 " + it.p.L0 + " cm，可以在右邊改。";
    if (ref) msg += "角度 " + angleText(Math.atan2(-(E[i].y - ref.y), E[i].x - ref.x) / DEG) + "，方向鍵可以再微調（Alt 0.1 cm）。";
    status(msg);
  }
  // 放置模式取消：端點回到拿起前的位置
  function cancelPlace() {
    const P = ui.place, D = ui.draw;
    ui.place = null; ui.draw = null; ui.snap = null;
    if (P && P.kind === "end") {
      if (P.drawing) { removeItem(P.it.id); setSel(null); ui.selEnd = null; }
      else Object.assign(P.it.ends[P.i], P.orig);
      sim.dirty = true; status("已取消。"); return true;
    }
    if (P || D) { status("已取消。"); return true; }
    return false;
  }
  function connectWire(a, b, before) {
    const dup = state.wires.some(w => (w.a === a && w.b === b) || (w.b === a && w.a === b));
    if (dup) { status("這兩個接線柱已經接過了。"); return; }
    pushUndo(before); state.wires.push({ id: "w" + state.seq++, a, b }); changed(); status("已接上導線。點導線可選取、按 Delete 刪除。");
  }
  // 角度的說法：0° 叫水平、90° 叫鉛直，其餘直接給度數
  function angleText(a) {
    let d = ((a % 360) + 360) % 360; if (d > 180) d -= 360;
    const r = Math.round(d * 10) / 10, abs = Math.abs(r);
    if (abs < 0.05 || Math.abs(abs - 180) < 0.05) return "0°（水平）";
    if (Math.abs(abs - 90) < 0.05) return "90°（鉛直）";
    return r.toFixed(1) + "°";
  }

  function nudgeEnd(it, i, key, st) {
    const dx = key === "ArrowLeft" ? -st : key === "ArrowRight" ? st : 0, dy = key === "ArrowUp" ? -st : key === "ArrowDown" ? st : 0;
    const e0 = it.ends[i];
    if (!ui.place) pushUndo();
    if (e0.at) {
      // 接在物體上：移動的是接點在物體上的位置（物體轉了也照著物體自己的座標走）
      const t = byId(e0.at.id), a = t ? (t.a || 0) : 0, c = Math.cos(a), s = Math.sin(a);
      e0.at.lx += dx * c + dy * s; e0.at.ly += -dx * s + dy * c;
    } else { e0.x += dx; e0.y += dy; }
    endPos(it, i);
    if (!ui.place) changed(); else sim.dirty = true;
    const ref = endRefPoint(it, i), p = endPos(it, i);
    status("微調端點" + (ref ? "：角度 " + angleText(Math.atan2(-(p.y - ref.y), p.x - ref.x) / DEG) + "、長度 " + U.fmt(Math.hypot(p.x - ref.x, p.y - ref.y), 1) + " cm" : "") + "。");
  }
  /*
   * 設定連接件的長度與方向（從端點 1 看端點 2，數學角度：右 0°、上 90°）。只移動一端：
   * 優先移沒接東西的端點；兩端都接上了，就移接著的固定器材（吊鉤）；再不行才移接著的物體。
   */
  function setGeometry(it, angDeg, len) {
    const E = endsOf(it);
    if (E.length !== 2 || !(len > 0.5)) return false;
    if (sim.status === "running") { status("模擬中不能移動；先暫停。"); return false; }
    const u = { x: Math.cos(angDeg * DEG), y: -Math.sin(angDeg * DEG) };
    const before = serialize();
    let k = [1, 0].find(i => !it.ends[i].at);
    if (k == null) k = [1, 0].find(i => { const t = byId(it.ends[i].at.id); return t && T[t.type].fixed; });
    if (k == null) k = 1;
    const target = k === 1 ? { x: E[0].x + u.x * len, y: E[0].y + u.y * len } : { x: E[1].x - u.x * len, y: E[1].y - u.y * len };
    if (!it.ends[k].at) { it.ends[k].x = target.x; it.ends[k].y = target.y; }
    else {
      const t = byId(it.ends[k].at.id); if (!t) return false;
      t.x += target.x - E[k].x; t.y += target.y - E[k].y;
      if (t.rt) { t.rt.vx = 0; t.rt.vy = 0; t.rt.w = 0; }
    }
    pushUndo(before); changed();
    return true;
  }
  function connectorGeom(it) {
    const E = endsOf(it);
    return { ang: Math.atan2(-(E[1].y - E[0].y), E[1].x - E[0].x) / DEG, len: Math.hypot(E[1].x - E[0].x, E[1].y - E[0].y) };
  }
  // 拉成水平／鉛直：保持長度、保持原本朝左或朝右（朝上或朝下）
  function alignConnector(it, dir) {
    const g = connectorGeom(it), E = endsOf(it);
    const ang = dir === "h" ? (E[1].x >= E[0].x ? 0 : 180) : (E[1].y >= E[0].y ? -90 : 90);
    if (setGeometry(it, ang, g.len)) status("已拉成" + (dir === "h" ? "水平（0°）" : "鉛直（90°）") + "，長度維持 " + U.fmt(g.len, 1) + " cm。");
  }

  /* ---------- 從器材盒「畫」連接件：點一下起點、點一下終點 ---------- */
  const DRAWABLE = ["rope", "spring", "gauge", "ruler"];
  function startDraw(type) {
    cancelPlace();
    ui.draw = { type };
    setSel(null); ui.selEnd = null;
    showStage(); canvas.focus({ preventScroll: true });
    status("畫「" + T[type].name + "」：在實驗台上點一下放起點（點在吊鉤或物體上就會接住），再點一下放終點。Esc 或「取消擺放」可以取消。");
  }
  function drawStart(sx, sy, free) {
    const type = ui.draw.type, before = serialize();
    const sn = LAB.snapPoint({ x: WX(sx), y: WY(sy) }, { points: alignPoints(null), scale: view.s, grid: ui.grid ? SNAP : 0, free });
    const it = addItem(type, sn.x, sn.y, { raw: true, silent: true });
    it.ends.forEach(e => { e.x = sn.x; e.y = sn.y; e.at = null; });
    const t0 = T[type].freeEnds ? null : attachTarget(it, 0, sn.x, sn.y, X(sn.x), Y(sn.y));
    if (t0) it.ends[0].at = t0;
    ui.draw = null; setSel(it.id);
    ui.place = { kind: "end", it, i: 1, before, orig: Object.assign({}, it.ends[1]), drawing: true };
    ui.place.target = moveEndTo(it, 1, WX(sx), WY(sy), free);
    // 按著直接拖到終點放開也可以（一筆畫完）；只點一下就等下一下
    ui.drag = { mode: "end", it, i: 1, before, moved: false, fromPlace: true, sx0: sx, sy0: sy, sx, sy };
    status("起點" + (t0 ? "已接到「" + T[byId(t0.id).type].name + "」" : "已放下") + "：移到終點再點一下。靠近水平、鉛直會自動吸附（Shift 不吸附）。");
  }
  function hover(sx, sy) {
    const h = pick(sx, sy);
    ui.hover = h ? { id: h.it && h.it.id, term: h.kind === "term" ? h.t.key : null } : null;
    let cur = "default";
    if (h) {
      if (h.kind === "term") cur = "crosshair";
      else if (h.kind === "button" || h.kind === "wire" || (h.it && T[h.it.type].clickToggle)) cur = "pointer";
      else cur = "grab";
    } else cur = "move";
    canvas.style.cursor = cur;
  }
  function onWheel(e) {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
  }

  /* ============================== 器材盒 ============================== */
  function drawIcon(cv, type) {
    const d = T[type], c = cv.getContext("2d"), w = cv.clientWidth || 88, h = cv.clientHeight || 52, r = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * r); cv.height = Math.round(h * r);
    c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, h);
    const it = newItemPreview(type);
    let bw, bh;
    if (d.card) { bw = d.card.w; bh = d.card.h; }
    else if (it.ends && !d.size) { bw = 40; bh = 40; }
    else { const s = d.size(it); bw = Math.max(8, s.w); bh = Math.max(8, s.h); }
    let s;
    if (d.card) s = 1;
    else s = Math.min((w - 12) / bw, (h - 10) / bh, 4.5);
    const Vx = { s, X: x => w / 2 + (x - it.x) * s, Y: y => h / 2 + (y - it.y) * s, status: "edit", detail: false, t: 0, selected: false };
    c.save();
    if (d.card) { const k = Math.min((w - 6) / d.card.w, (h - 6) / d.card.h); c.translate(w / 2, h / 2); c.scale(k, k); c.translate(-w / 2, -h / 2); }
    LAB.iconMode = !d.card;
    try { d.draw(c, it, Vx, it.ends ? it.ends.map(e => ({ x: e.x, y: e.y, at: e.at })) : []); } catch (e) { /* 圖示畫失敗不影響功能 */ }
    LAB.iconMode = false;
    if (d.source) {
      // 光源的圖示補一小段光線
      d.source(it).slice(0, 5).forEach(sr => {
        c.strokeStyle = sr.nm ? U.nmCss(sr.nm, 0.9) : (isLight() ? "#e39600" : "#fff4c2"); c.lineWidth = 1.6;
        c.beginPath(); c.moveTo(Vx.X(sr.x), Vx.Y(sr.y)); c.lineTo(Vx.X(sr.x) + sr.dx * 30, Vx.Y(sr.y) + sr.dy * 30); c.stroke();
      });
    }
    c.restore();
  }
  function newItemPreview(type) {
    const d = T[type];
    const it = { id: "_icon", type, x: 0, y: 0, a: 0, p: clone(d.defaults), rt: {} };
    if (type === "ramp") it.p.len = 60;
    if (type === "plank") it.p.w = 50;
    if (type === "point") it.p.spread = 120;
    if (d.makeEnds) {
      it.ends = d.makeEnds(it).map(e => ({ x: e.x, y: e.y, at: null }));
      if (type === "pulley") it.ends.forEach(e => { e.y = it.y + 14; });
      if (type === "force" || type === "sensor") it.ends = [{ x: -8, y: 0, at: { id: "_" } }];
      if (type === "spring" || type === "gauge" || type === "rope") it.ends = [{ x: -14, y: -14, at: null }, { x: 14, y: 14, at: null }];
      if (type === "ruler") it.ends = [{ x: -20, y: 6, at: null }, { x: 20, y: 6, at: null }];
      if (type === "protractor") { it.y = 6; it.ends = [{ x: 18, y: 6, at: null }, { x: 12, y: -8, at: null }]; }
    }
    return it;
  }
  function buildPalette() {
    const tabs = $("#lab-tabs");
    tabs.innerHTML = "";
    LAB.cats.forEach(c => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lab-tab"; b.setAttribute("role", "tab"); b.dataset.cat = c.key;
      b.setAttribute("aria-selected", String(c.key === ui.cat));
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + c.icon + '"/></svg><span></span>';
      b.querySelector("span").textContent = c.name;
      b.addEventListener("click", () => { ui.cat = c.key; buildPalette(); });
      tabs.appendChild(b);
    });
    const tiles = $("#lab-tiles");
    tiles.innerHTML = "";
    LAB.typeOrder.filter(t => T[t].cat === ui.cat).forEach(type => {
      const d = T[type];
      const b = document.createElement("button");
      b.type = "button"; b.className = "lab-tile"; b.title = d.name + "：" + d.desc;
      b.setAttribute("aria-label", "加入" + d.name + "：" + d.desc);
      const cv = document.createElement("canvas"); b.appendChild(cv);
      const sp = document.createElement("span"); sp.textContent = d.name; b.appendChild(sp);
      tiles.appendChild(b);
      requestAnimationFrame(() => drawIcon(cv, type));
      b.addEventListener("pointerdown", e => startPaletteDrag(e, type, cv));
      b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addAtCenter(type); } });
    });
  }
  let centerBump = 0;
  // 手機版器材盒在實驗台下方：點了器材之後把實驗台捲回畫面裡，才看得到放上去的東西
  // （手機版頂列是 sticky，要捲到頂列下面，不然實驗台上緣會被蓋住）
  function showStage() {
    const r = $("#lab-stage").getBoundingClientRect(), top = $(".lab-top");
    const hh = top && getComputedStyle(top).position === "sticky" ? top.getBoundingClientRect().height : 0;
    if (r.top < hh - 1 || r.bottom > innerHeight + 1) window.scrollBy(0, r.top - hh);
  }
  function addAtCenter(type) {
    showStage();
    centerBump = (centerBump + 1) % 6;
    const wx = WX(W / 2) + (centerBump - 3) * 8, wy = Math.min(WORLD.floor - 20, WY(H / 2) + (centerBump - 3) * 4);
    addItem(type, wx, wy);
  }
  function startPaletteDrag(e, type, iconCv) {
    if (e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY;
    let ghost = null;
    const stage = $("#lab-stage");
    const overStage = (x, y) => { const r = canvas.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
    const move = ev => {
      if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
        ghost = document.createElement("div"); ghost.className = "lab-ghost";
        const c = document.createElement("canvas"); ghost.appendChild(c);
        const s = document.createElement("span"); s.textContent = T[type].name; ghost.appendChild(s);
        document.body.appendChild(ghost); drawIcon(c, type);
      }
      if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; stage.classList.toggle("is-drop", overStage(ev.clientX, ev.clientY)); }
    };
    const up = ev => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up);
      stage.classList.remove("is-drop");
      if (ghost) {
        ghost.remove();
        if (overStage(ev.clientX, ev.clientY)) {
          const r = canvas.getBoundingClientRect();
          addItem(type, WX(ev.clientX - r.left), Math.min(WORLD.floor + 30, WY(ev.clientY - r.top)));
        }
      } else if (ev.type === "pointerup") { if (DRAWABLE.includes(type)) startDraw(type); else addAtCenter(type); }
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
  }

  /* ============================== 檢視面板 ============================== */
  function readoutsFor(it) {
    const f = U.fmt, rt = it.rt || {}, d = T[it.type], out = [];
    const running = sim.status !== "edit";
    if (d.body && !d.fixed) {
      const vx = running ? (rt.vx || 0) : U.initVel(it).vx, vy = running ? (rt.vy || 0) : U.initVel(it).vy, v = Math.hypot(vx, vy);
      const m = Number(it.p.m);
      out.push(["高度（離桌面）", f((WORLD.floor - it.y) / 100, 3) + " m"], ["速率 v", f(v / 100, 3) + " m/s"],
        ["vₓ", f(vx / 100, 3) + " m/s"], ["v_y（向上為正）", f(-vy / 100, 3) + " m/s"],
        ["動能 K", f(0.5 * m * v * v / 1e4, 4) + " J"], ["動量 p", f(m * v / 100, 4) + " kg·m/s"]);
    }
    if (it.type === "spring" || it.type === "gauge") {
      const E = endsOf(it), L = Math.hypot(E[1].x - E[0].x, E[1].y - E[0].y), F = rt.force != null && running ? rt.force / 100 : it.p.k * (L - it.p.L0) / 100;
      out.push(["長度", f(L, 1) + " cm"], ["伸長量 x", f(L - it.p.L0, 1) + " cm"], ["彈力 F", f(F, 3) + " N"], ["彈性位能", f(0.5 * it.p.k * Math.pow((L - it.p.L0) / 100, 2), 4) + " J"]);
    }
    if (it.type === "rope") { const E = endsOf(it); out.push(["長度", f(rt.L || Math.hypot(E[1].x - E[0].x, E[1].y - E[0].y), 1) + " cm"], ["張力 T", running && rt.tension != null ? f(rt.tension / 100, 3) + " N" : "—"]); }
    // 連接件的方向：看得到是不是真的水平；歪 2° 拉力的方向就跟著歪
    if (DRAWABLE.includes(it.type)) { const E = endsOf(it); out.push(["方向（與水平）", angleText(Math.atan2(-(E[1].y - E[0].y), E[1].x - E[0].x) / DEG)]); }
    if (it.type === "pulley") out.push(["繩張力 T", running && rt.tension != null ? f(rt.tension / 100, 3) + " N" : "—"]);
    if (d.circuit) {
      out.push(["電流 I", f(rt.I || 0, 4) + " A"], ["電壓 V", f(Math.abs(rt.V || 0), 3) + " V"]);
      if (it.type === "battery") out.push(["端電壓", f(rt.V || 0, 3) + " V"], ["輸出功率", f((rt.V || 0) * (rt.I || 0), 3) + " W"]);
      else if (it.type !== "ammeter" && it.type !== "voltmeter") out.push(["功率 P", f(rt.P || 0, 3) + " W"]);
    }
    if (it.type === "convex" || it.type === "concave") out.push(["焦距", (it.type === "concave" ? "−" : "") + it.p.f + " cm"], ["屈光度", f((it.type === "concave" ? -100 : 100) / it.p.f, 2) + " D"]);
    if (it.type === "screen") out.push(["光點數", String((rt.hits || []).length)]);
    if (it.type === "ruler") { const E = endsOf(it); out.push(["距離", f(Math.hypot(E[1].x - E[0].x, E[1].y - E[0].y), 1) + " cm"]); }
    if (it.type === "protractor") {
      const E = endsOf(it); let a = Math.abs(Math.atan2(E[0].y - it.y, E[0].x - it.x) - Math.atan2(E[1].y - it.y, E[1].x - it.x)); if (a > Math.PI) a = 2 * Math.PI - a;
      out.push(["夾角", f(a / DEG, 1) + "°"]);
    }
    if (it.type === "stopwatch") out.push(["時間", f(rt.elapsed || 0, 2) + " s"]);
    if (it.type === "sensor") {
      const s = (rt.samples || [])[(rt.samples || []).length - 1];
      out.push(["記錄點數", String((rt.samples || []).length)]);
      if (s) out.push(["速率", f(s.v / 100, 3) + " m/s"], ["加速度", f(s.a / 100, 3) + " m/s²"]);
    }
    if (it.type === "energy" && rt.E) out.push(["動能", f(rt.E.K, 4) + " J"], ["位能（重力）", f(rt.E.Ug, 4) + " J"], ["彈性位能", f(rt.E.Us, 4) + " J"], ["總和", f(rt.E.E, 4) + " J"]);
    return out;
  }
  const TIPS = {
    ball: "把斜面的 μ 調大，球會「滾」下來（a = 5/7·g sinθ）；μ = 0 時則是「滑」下來（a = g sinθ）。",
    block: "放在斜面上慢慢加大傾角：tanθ 超過 μ 的那一刻才開始滑。",
    ramp: "拖右上方的旋轉把手可以整個轉向；也可以調「左高右低」。",
    spring: "上端拖到吊鉤、下端拖到砝碼。平衡時伸長量 x = mg/k。",
    rope: "繩只能拉不能推：拉直的長度就是擺長。單擺週期 T = 2π√(L/g)。",
    pulley: "繩的兩端各拖到一個砝碼上，就是阿特午機：a = (m₁−m₂)g/(m₁+m₂)。",
    force: "定力會一直作用；搭配力學車與運動感測器驗證 F = ma。",
    battery: "從接線柱拖到另一個接線柱就是一條導線。紅色是正極。",
    ammeter: "安培計要串聯；接反了指針會反偏。",
    voltmeter: "伏特計要並聯在待測元件兩端。",
    bulb: "燈泡的功率超過額定 2.5 倍會燒斷；調低電壓再按「換新燈泡」。",
    convex: "放一個平行光源對著它，光線會聚的那一點就是焦點。",
    prism: "雷射選「白光」：紫光偏折最多、紅光最少。",
    semi: "雷射從圓弧面對準圓心射入，在平面那一側調大入射角，找臨界角。",
    sensor: "探頭拖到物體上；按播放後開始記錄，選單可切換 x–t、v–t、a–t。",
    stopwatch: "碼錶量的是模擬時間，慢動作（0.25×）時也準。",
    energy: "播放時看總能量是否守恆；加了摩擦或非彈性碰撞，總和會下降。"
  };
  function renderInspector() {
    const box = $("#lab-inspector");
    const it = byId(ui.sel), wire = ui.selWire && state.wires.find(w => w.id === ui.selWire);
    /*
     * 重建時機：換了選取、接線狀態或模擬狀態才重建。參數值不放進鍵——拖滑桿時每一格都重建的話，
     * 正在被拖的那根滑桿會被換掉，拖到一半就斷了。外部改參數（復原、拖旋轉把手）會自己把 inspectorKey 清空。
     */
    const key = (it ? it.id + "|" + (it.rt && it.rt.burnt) + "|" + (it.ends || []).map(e => e.at ? e.at.id : "-").join(",") : wire ? "w" + wire.id : "none:" + state.items.length + ":" + state.wires.length) + "|" + sim.status;
    if (key === inspectorKey) { updateReadouts(); return; }
    inspectorKey = key;
    const el = (tag, cls, txt, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; if (parent) parent.appendChild(n); return n; };
    const root = el("div", "lab-insp");
    if (wire) {
      const h = el("h2", null, "導線", root); el("span", "cat", "電學", h);
      el("p", "desc", "連接兩個接線柱（電阻 0.002 Ω）。光點沿傳統電流方向移動。", root);
      const dl = el("dl", "lab-readouts", null, root); dl.dataset.ro = "1";
      const acts = el("div", "lab-insp-actions", null, root);
      const del = el("button", "danger", "刪除導線", acts); del.type = "button"; del.addEventListener("click", deleteSelection);
    } else if (!it) {
      el("h2", null, "實驗台", root);
      el("p", "desc", state.items.length ? "點選實驗台上的器材，就能在這裡調整參數、看讀數。" : "從左邊的器材盒拖器材進來，或先開一個範例看看。", root);
      if (state.items.length) {
        el("div", "sec", "器材（" + state.items.length + "）", root);
        const ul = el("ul", "list", null, root);
        state.items.forEach(x => {
          const li = el("li", null, null, ul); const b = el("button", null, T[x.type].name, li); b.type = "button";
          b.addEventListener("click", () => { setSel(x.id); });
        });
      } else {
        el("div", "sec", "範例", root);
        const ul = el("ul", "list", null, root);
        PRESETS.forEach(p => { const li = el("li", null, null, ul); const b = el("button", null, p.name, li); b.type = "button"; b.addEventListener("click", () => loadPreset(p)); });
      }
      const k = el("div", "keys", null, root);
      k.innerHTML = "<kbd>空白</kbd> 播放／暫停　<kbd>Delete</kbd> 刪除<br><kbd>R</kbd> 旋轉　<kbd>Ctrl</kbd>+<kbd>D</kbd> 複製<br><kbd>Ctrl</kbd>+<kbd>Z</kbd> 復原　滾輪／兩指 縮放<br>" +
        "細繩、彈簧：在器材盒點一下，再到實驗台點起點、點終點<br>點一下端點＝拿起，再點一下放下；靠近水平、鉛直會自動吸附（<kbd>Shift</kbd> 不吸附）<br>" +
        "方向鍵微調 1 cm（<kbd>Shift</kbd> 10、<kbd>Alt</kbd> 0.1）<br>拖空白處平移；播放時可以直接抓住物體甩動";
    } else {
      const d = T[it.type];
      const h = el("h2", null, d.name, root); el("span", "cat", LAB.cats.find(c => c.key === d.cat).name, h);
      el("p", "desc", d.desc, root);
      (d.params || []).forEach(p => root.appendChild(field(it, p)));
      if (d.body && !d.fixed && sim.status !== "edit") el("p", "tip", "播放中改參數會從目前狀態繼續；按「重設」回到起點。", root);
      const ro = readoutsFor(it);
      if (ro.length) { el("div", "sec", "讀數", root); const dl = el("dl", "lab-readouts", null, root); dl.dataset.ro = "1"; }
      const acts = el("div", "lab-insp-actions", null, root);
      const btn = (t, fn, cls) => { const b = el("button", cls || null, t, acts); b.type = "button"; b.addEventListener("click", fn); return b; };
      if (canRotate(it)) btn(rot90Type(it) ? "轉 90°" : "轉 15°", () => rotateSel(1));
      if (DRAWABLE.includes(it.type) && sim.status !== "running") {
        btn("拉成水平", () => alignConnector(it, "h")); btn("拉成鉛直", () => alignConnector(it, "v"));
        root.insertBefore(geomForm(it, el), acts);
      }
      if (it.type === "bulb" && it.rt && it.rt.burnt) btn("換新燈泡", () => { it.rt.burnt = false; inspectorKey = ""; });
      if (it.ends && it.ends.some(e => e.at)) btn("解除連接", () => { pushUndo(); it.ends.forEach(e => { e.at = null; }); changed(); });
      if (it.type === "sensor") btn("清除紀錄", () => { if (it.rt) it.rt.samples = []; });
      btn("複製", duplicate);
      btn("刪除", deleteSelection, "danger");
      if (TIPS[it.type]) el("p", "tip", TIPS[it.type], root);
    }
    box.innerHTML = ""; box.appendChild(root);
    updateReadouts();
  }
  // 直接輸入長度與方向：要剛好 50 cm 長、剛好 30° 的繩子，用打的比用拖的快
  function geomForm(it, el) {
    const g = connectorGeom(it), f = el("form", "lab-geom");
    f.setAttribute("aria-label", "設定長度與方向");
    const num = (label, val, step, unit, id) => {
      const w = el("label", null, null, f); w.htmlFor = id;
      el("span", null, label, w);
      const inp = el("input", null, null, w); inp.type = "number"; inp.id = id; inp.step = step; inp.value = String(Math.round(val * 10) / 10);
      el("span", "u", unit, w);
      return inp;
    };
    const L = num("長度", g.len, "0.5", "cm", "geom-len-" + it.id), A = num("方向", g.ang, "1", "°", "geom-ang-" + it.id);
    const go = el("button", null, "套用", f); go.type = "submit";
    el("p", "hint", "方向從端點 1 量到端點 2：右 0°、上 90°、下 −90°。", f);
    f.addEventListener("submit", ev => {
      ev.preventDefault();
      const len = Number(L.value), ang = Number(A.value);
      if (!isFinite(len) || len <= 0.5 || !isFinite(ang)) { status("長度要大於 0.5 cm，方向要是數字。"); return; }
      if (setGeometry(it, ang, len)) status("已設成長度 " + U.fmt(len, 1) + " cm、方向 " + angleText(ang) + "。");
    });
    return f;
  }
  function field(it, p) {
    const wrap = document.createElement("div");
    const id = "f-" + it.id + "-" + p.k;
    const value = () => p.rotation ? Math.round((it.a || 0) / DEG) : it.p[p.k];
    let before = null;
    const commit = () => { if (before) { pushUndo(before); before = null; } changed(); };
    if (p.kind === "toggle") {
      wrap.className = "lab-field toggle";
      const l = document.createElement("label"); l.htmlFor = id; l.textContent = p.label;
      const c = document.createElement("input"); c.type = "checkbox"; c.id = id; c.checked = !!value();
      c.addEventListener("change", () => { pushUndo(); it.p[p.k] = c.checked; changed(); });
      l.appendChild(c); wrap.appendChild(l); return wrap;
    }
    wrap.className = "lab-field";
    const head = document.createElement("div"); head.className = "lab-field-head";
    const lab = document.createElement("label"); lab.htmlFor = id; lab.textContent = p.label; head.appendChild(lab);
    const out = document.createElement("output"); out.htmlFor = id; head.appendChild(out);
    wrap.appendChild(head);
    if (p.kind === "select") {
      const s = document.createElement("select"); s.id = id;
      p.options.forEach(([v, t]) => { const o = document.createElement("option"); o.value = String(v); o.textContent = t; s.appendChild(o); });
      s.value = String(value());
      s.addEventListener("change", () => {
        pushUndo();
        const v = typeof p.def === "number" ? Number(s.value) : s.value;
        if (p.rotation) { it.a = v * DEG; normAngle(it); } else it.p[p.k] = v;
        changed();
      });
      wrap.appendChild(s); return wrap;
    }
    const r = document.createElement("input"); r.type = "range"; r.id = id; r.min = p.min; r.max = p.max; r.step = p.step; r.value = value();
    const show = () => { out.textContent = U.fmt(Number(r.value), p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0) + (p.unit ? " " + p.unit : ""); };
    show();
    r.addEventListener("pointerdown", () => { before = before || serialize(); });
    r.addEventListener("keydown", () => { before = before || serialize(); });
    r.addEventListener("input", () => {
      before = before || serialize();
      const v = Number(r.value);
      if (p.rotation) { it.a = v * DEG; } else it.p[p.k] = v;
      show(); sim.dirty = true;
    });
    r.addEventListener("change", commit);
    wrap.appendChild(r);
    return wrap;
  }
  function updateReadouts() {
    const dl = document.querySelector("#lab-inspector [data-ro]");
    if (!dl) return;
    let rows;
    const wire = ui.selWire && state.wires.find(w => w.id === ui.selWire);
    if (wire) rows = [["電流", U.fmt(Math.abs(wire.I || 0), 4) + " A"]];
    else { const it = byId(ui.sel); if (!it) return; rows = readoutsFor(it); }
    if (dl.children.length !== rows.length) {
      dl.innerHTML = "";
      rows.forEach(r => { const d = document.createElement("div"); const t = document.createElement("dt"); const v = document.createElement("dd"); d.appendChild(t); d.appendChild(v); dl.appendChild(d); });
    }
    rows.forEach((r, i) => { const d = dl.children[i]; if (d.children[0].textContent !== r[0]) d.children[0].textContent = r[0]; if (d.children[1].textContent !== r[1]) d.children[1].textContent = r[1]; });
    // 長度、方向的輸入框跟著拖曳更新；正在打字時不要蓋掉
    const form = document.querySelector("#lab-inspector .lab-geom"), it = byId(ui.sel);
    if (form && it && !form.contains(document.activeElement) && DRAWABLE.includes(it.type)) {
      const g = connectorGeom(it), [L, A] = form.querySelectorAll("input");
      const lv = String(Math.round(g.len * 10) / 10), av = String(Math.round(g.ang * 10) / 10);
      if (L.value !== lv) L.value = lv;
      if (A.value !== av) A.value = av;
    }
  }

  /* ============================== 範例 ============================== */
  function onRamp(ramp, frac, hb) {
    const L = ramp.p.len, H = L * Math.tan(ramp.p.ang * DEG), th = ramp.p.ang * DEG;
    const px = ramp.x - L / 2 + frac * L, py = ramp.y + H / 2 - frac * H;
    return { x: px - Math.sin(th) * (hb / 2 + 0.1), y: py - Math.cos(th) * (hb / 2 + 0.1), a: -th };
  }
  function attach(con, i, target, lx, ly) { con.ends[i] = Object.assign(con.ends[i], { at: { id: target.id, lx: lx || 0, ly: ly || 0 } }); const p = U.local(target, lx || 0, ly || 0); con.ends[i].x = p.x; con.ends[i].y = p.y; }
  const S = (type, x, y, p, a) => { const it = newItem(type, x, y); Object.assign(it.p, p || {}); it.a = (a || 0) * DEG; if (T[type].makeEnds) it.ends = T[type].makeEnds(it); state.items.push(it); return it; };
  const wire = (a, b) => state.wires.push({ id: "w" + state.seq++, a, b });
  const PRESETS = [
    { name: "斜面上的木塊", desc: "改 μ 與 θ，看什麼時候開始滑", build() {
      const r = S("ramp", 170, 0, { len: 160, ang: 30, mu: 0.2 }); r.y = WORLD.floor - r.p.len * Math.tan(30 * DEG) / 2;
      const b = S("block", 0, 0, { m: 0.5, w: 16, h: 10, mu: 0.2 }); Object.assign(b, onRamp(r, 0.82, 10));
      const s = S("sensor", 310, 60, { mode: "v" }); attach(s, 0, b);
      S("stopwatch", 70, 60);
    } },
    { name: "單擺", desc: "擺長、擺角與週期", build() {
      const h = S("hook", 170, 30); const ball = S("ball", 170 + 120 * Math.sin(15 * DEG), 30 + 120 * Math.cos(15 * DEG), { r: 4, m: 0.2, e: 0.5 });
      const rope = S("rope", 170, 90); attach(rope, 0, h); attach(rope, 1, ball);
      S("stopwatch", 320, 50); S("energy", 320, 140);
    } },
    { name: "彈簧振子", desc: "週期 T = 2π√(m/k)", build() {
      const h = S("hook", 150, 30); const w = S("weight", 150, 30 + 20 + 9.8 + 8, { m: 0.2 });
      const sp = S("spring", 150, 60, { k: 20, L0: 20, c: 0 }); attach(sp, 0, h); attach(sp, 1, w, 0, -U.wSize(0.2).h / 2);
      const s = S("sensor", 300, 70, { mode: "h" }); attach(s, 0, w); S("energy", 300, 170);
    } },
    { name: "阿特午機", desc: "a = (m₁ − m₂)g / (m₁ + m₂)", build() {
      const p = S("pulley", 200, 40, { r: 8 });
      const a = S("weight", 192, 140, { m: 0.5 }), b = S("weight", 208, 150, { m: 0.2 });
      attach(p, 0, a, 0, -U.wSize(0.5).h / 2); attach(p, 1, b, 0, -U.wSize(0.2).h / 2);
      const s = S("sensor", 320, 70, { mode: "v" }); attach(s, 0, a);
    } },
    { name: "水平拋射與斜拋", desc: "初速 4 m/s、仰角 45°", build() {
      S("ball", 30, WORLD.floor - 5, { r: 4, m: 0.1, e: 0.5, v0: 4, ang0: 45 });
      const r = S("ruler", 200, WORLD.floor - 4); r.ends = [{ x: 30, y: WORLD.floor - 1, at: null }, { x: 230, y: WORLD.floor - 1, at: null }];
      const s = S("sensor", 300, 50, { mode: "h" }); attach(s, 0, state.items[0]);
    } },
    { name: "力學車碰撞", desc: "彈性與非彈性碰撞、動量守恆", build() {
      const a = S("cart", 60, WORLD.floor - 6, { w: 24, m: 0.5, e: 1, v0: 1.2 }), b = S("cart", 220, WORLD.floor - 6, { w: 24, m: 0.5, e: 1 });
      const s = S("sensor", 120, 70, { mode: "vx" }); attach(s, 0, a);
      const s2 = S("sensor", 300, 70, { mode: "vx" }); attach(s2, 0, b);
      S("energy", 210, 150);
    } },
    { name: "定力拉動力學車", desc: "驗證 F = ma", build() {
      const c = S("cart", 60, WORLD.floor - 6, { w: 24, m: 0.5 });
      const f = S("force", 60, WORLD.floor - 6, { F: 0.5, dir: 0 }); attach(f, 0, c);
      const s = S("sensor", 250, 70, { mode: "v" }); attach(s, 0, c);
    } },
    { name: "串聯與並聯電路", desc: "燈泡亮度、電流與電壓", build() {
      // 兩個燈泡並聯，安培計量幹路電流，伏特計跨在上面那個燈泡兩端
      const bat = S("battery", 160, 190, { E: 6, r: 0.5 });
      const sw = S("switch", 90, 140, {}, 90); const am = S("ammeter", 150, 80, { range: 3 });
      const b1 = S("bulb", 240, 100, { R: 10, Pr: 3 }); const b2 = S("bulb", 240, 150, { R: 10, Pr: 3 });
      const vm = S("voltmeter", 240, 40, { range: 15 });
      wire(bat.id + ":0", sw.id + ":1"); wire(sw.id + ":0", am.id + ":0");
      wire(am.id + ":1", b1.id + ":0"); wire(b1.id + ":0", b2.id + ":0");
      wire(b1.id + ":1", b2.id + ":1"); wire(b2.id + ":1", bat.id + ":1");
      wire(vm.id + ":0", b1.id + ":0"); wire(vm.id + ":1", b1.id + ":1");
    } },
    { name: "凸透鏡：平行光與焦點", desc: "平行光聚焦在 f 處", build() {
      S("beam", 50, 110, { width: 40, n: 9, color: "red" }); S("convex", 180, 110, { f: 60, h: 60 }); S("screen", 240, 110, { h: 70 });
      const r = S("ruler", 210, 160); r.ends = [{ x: 180, y: 160, at: null }, { x: 240, y: 160, at: null }];
    } },
    { name: "稜鏡色散", desc: "白光分成彩虹", build() {
      S("laser", 50, 150, { color: "white" }, -24); S("prism", 180, 110, { side: 60, n: 1.52 }); S("screen", 370, 148, { h: 70 });
    } },
    { name: "全反射與臨界角", desc: "半圓玻璃磚", build() {
      const g = S("semi", 200, 120, { r: 40, n: 1.5 }, 180);
      const ang = 46 * DEG, cx = 200, cy = 100;
      const L = S("laser", cx + Math.sin(ang) * 75, cy + Math.cos(ang) * 75, { color: "red" }); L.a = Math.atan2(cy - L.y, cx - L.x);
      S("protractor", cx, cy).ends = [{ x: cx, y: cy + 40, at: null }, { x: cx + Math.sin(ang) * 40, y: cy + Math.cos(ang) * 40, at: null }];
      void g;
    } }
  ];
  function loadPreset(p) {
    const before = serialize();
    if (sim.status !== "edit") reset();
    ui.place = null; ui.draw = null; ui.snap = null; ui.selEnd = null;
    state.items = []; state.wires = []; state.seq = 1;
    p.build();
    pushUndo(before); setSel(null); changed();
    closeMenus(); fit();
    status("已載入範例「" + p.name + "」：" + p.desc + "。按「播放」開始。");
  }
  function buildExamples() {
    const box = $("#lab-examples"); box.innerHTML = "";
    const groups = [["力學", PRESETS.slice(0, 7)], ["電學", PRESETS.slice(7, 8)], ["光學", PRESETS.slice(8)]];
    groups.forEach(([g, list]) => {
      const h = document.createElement("h3"); h.textContent = g; box.appendChild(h);
      list.forEach(p => {
        const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem");
        b.textContent = p.name; const s = document.createElement("small"); s.textContent = p.desc; b.appendChild(s);
        b.addEventListener("click", () => loadPreset(p)); box.appendChild(b);
      });
    });
    const ea = $("#lab-empty-actions"); ea.innerHTML = "";
    [0, 1, 3, 7, 9].forEach(i => { const b = document.createElement("button"); b.type = "button"; b.textContent = PRESETS[i].name; b.addEventListener("click", () => loadPreset(PRESETS[i])); ea.appendChild(b); });
  }

  /* ============================== 介面雜項 ============================== */
  let toastTimer = 0;
  function toast(msg) {
    const t = $("#lab-toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function status(msg) { $("#lab-status").textContent = msg; }
  function defaultStatus() {
    if (sim.status === "running") return "模擬中：可以直接抓住物體甩動；按「暫停」停下來量測。";
    if (sim.status === "paused") return "已暫停：可以調整擺設與參數，按「播放」繼續；「重設」回到起點。";
    return "編輯中：從器材盒拖器材到實驗台。拖空白處平移、滾輪縮放。";
  }
  function updateTransport() {
    const b = $("#lab-play"), running = sim.status === "running";
    b.classList.toggle("is-running", running);
    b.querySelector("span").textContent = running ? "暫停" : sim.status === "paused" ? "繼續" : "播放";
    b.querySelector("svg").innerHTML = running ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>' : '<path d="M8 5v14l11-7z" fill="currentColor"/>';
    $("#lab-reset").disabled = sim.status === "edit";
    status(defaultStatus());
    inspectorKey = "";
  }
  function updateEmpty() { $("#lab-empty").hidden = state.items.length > 0; }
  function closeMenus() {
    ["#lab-examples", "#lab-file"].forEach(s => { const m = $(s); if (m && !m.hidden) { m.hidden = true; const btn = document.querySelector('[aria-controls="' + m.id + '"]'); if (btn) btn.setAttribute("aria-expanded", "false"); } });
  }
  function toggleMenu(btn, menu) {
    const open = menu.hidden;
    closeMenus();
    menu.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) { const f = menu.querySelector("button"); if (f) f.focus(); }
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("pl-theme", JSON.stringify(t)); } catch (e) {}
    $("#lab-theme").innerHTML = t === "light"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    buildPalette();
  }
  const b64 = {
    enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))
  };
  function download(name, blob) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function fileAction(act) {
    closeMenus();
    const json = sim.status === "edit" ? serialize() : (sim.snapshot || serialize());
    if (act === "share") {
      const url = location.origin + location.pathname + "#lab=" + b64.enc(json);
      const done = () => toast("分享連結已複製");
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => { history.replaceState(null, "", "#lab=" + b64.enc(json)); toast("已放進網址列，請直接複製網址"); });
      else { history.replaceState(null, "", "#lab=" + b64.enc(json)); toast("已放進網址列，請直接複製網址"); }
    } else if (act === "export") download("physics-lab-custom.json", new Blob([json], { type: "application/json" }));
    else if (act === "import") $("#lab-import").click();
    else if (act === "png") canvas.toBlob(b => b && download("physics-lab-custom.png", b));
    else if (act === "clear") {
      if (!state.items.length) return;
      if (sim.status !== "edit") reset();
      pushUndo(); state.items = []; state.wires = []; setSel(null); changed(); toast("已清空（Ctrl+Z 可以復原）");
    }
  }

  /* ============================== 啟動 ============================== */
  let lastPlacing = false;
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000)); lastFrame = now;
    if (sim.status === "running") advance(dt * sim.speed);
    try { evalCircuit(dt); } catch (e) { console.warn("電路求解失敗", e); }
    try { evalOptics(); } catch (e) { console.warn("光路追蹤失敗", e); rays = []; }
    evalEnergy();
    render();
    $("#lab-time").textContent = "t = " + sim.t.toFixed(2) + " s";
    renderInspector();
    const placing = !!(ui.place || ui.draw);
    if (placing !== lastPlacing) { lastPlacing = placing; $("#lab-cancel").hidden = !placing; }
    requestAnimationFrame(loop);
  }
  function init() {
    canvas = $("#lab-canvas"); ctx = canvas.getContext("2d");
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => resize()).observe(canvas.parentNode);
    window.addEventListener("resize", resize);
    resize();
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", e => { ui.pointers.delete(e.pointerId); ui.pinch = null; cancelDrag(); });
    canvas.addEventListener("pointerleave", () => { if (!ui.drag) ui.hover = null; });
    canvas.addEventListener("wheel", onWheel, { passive: false });
    $("#lab-play").addEventListener("click", play);
    $("#lab-step").addEventListener("click", stepOnce);
    $("#lab-reset").addEventListener("click", reset);
    $("#lab-speed").addEventListener("change", e => { sim.speed = Number(e.target.value) || 1; });
    $("#lab-undo").addEventListener("click", doUndo);
    $("#lab-redo").addEventListener("click", doRedo);
    $("#lab-detail").addEventListener("click", e => { ui.detail = !ui.detail; e.currentTarget.setAttribute("aria-pressed", String(ui.detail)); });
    $("#lab-grid").addEventListener("click", e => { ui.grid = !ui.grid; e.currentTarget.setAttribute("aria-pressed", String(ui.grid)); });
    $("#lab-fit").addEventListener("click", fit);
    $("#lab-cancel").addEventListener("click", () => { cancelPlace(); canvas.focus({ preventScroll: true }); });
    $("#lab-zoom-in").addEventListener("click", () => zoomAt(1.25, W / 2, H / 2));
    $("#lab-zoom-out").addEventListener("click", () => zoomAt(0.8, W / 2, H / 2));
    $("#lab-examples-btn").addEventListener("click", e => toggleMenu(e.currentTarget, $("#lab-examples")));
    $("#lab-file-btn").addEventListener("click", e => toggleMenu(e.currentTarget, $("#lab-file")));
    document.querySelectorAll("#lab-file [data-act]").forEach(b => b.addEventListener("click", () => fileAction(b.dataset.act)));
    $("#lab-import").addEventListener("change", e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const before = serialize();
        try { if (sim.status !== "edit") reset(); load(String(rd.result)); pushUndo(before); changed(); fit(); toast("已開啟「" + f.name + "」"); }
        catch (err) { load(before); toast("這個檔案打不開：" + err.message); }
        e.target.value = "";
      };
      rd.readAsText(f);
    });
    $("#lab-theme").addEventListener("click", () => setTheme(isLight() ? "dark" : "light"));
    document.addEventListener("pointerdown", e => { if (!e.target.closest(".lab-menu")) closeMenus(); });
    document.addEventListener("keydown", e => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") { if (e.key === "Escape") e.target.blur(); return; }
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") { closeMenus(); cancelDrag(); if (!cancelPlace()) { setSel(null); ui.selEnd = null; } return; }
      if (mod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
      if (mod && (e.key === "y" || e.key === "Y")) { e.preventDefault(); doRedo(); return; }
      if (mod && (e.key === "d" || e.key === "D")) { e.preventDefault(); duplicate(); return; }
      if (tag === "button" && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " ") { e.preventDefault(); play(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { if (ui.sel || ui.selWire) { e.preventDefault(); deleteSelection(); } return; }
      if (e.key === "r" || e.key === "R") { rotateSel(e.shiftKey ? -1 : 1); return; }
      // 方向鍵微調端點：選到（點過、剛放下）的端點優先，每次 1 cm（Shift 10、Alt 0.1）
      const se = ui.selEnd && byId(ui.selEnd.id);
      if (se && se.id === ui.sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        nudgeEnd(se, ui.selEnd.i, e.key, e.altKey ? 0.1 : e.shiftKey ? 10 : 1);
        return;
      }
      const it = byId(ui.sel);
      if (it && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const st = e.altKey ? 0.1 : e.shiftKey ? 10 : 1;
        pushUndo();
        const dx = e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0, dy = e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0;
        it.x += dx; it.y += dy; (it.ends || []).forEach(en => { if (!en.at) { en.x += dx; en.y += dy; } });
        changed();
      }
    });
    setTheme(isLight() ? "light" : "dark");
    buildExamples();
    // 讀取：分享連結 > 上次的自動存檔 > 空白實驗台
    let loaded = false;
    const m = location.hash.match(/#lab=([A-Za-z0-9_-]+)/);
    if (m) {
      try { load(b64.dec(m[1])); loaded = true; status("已開啟分享的實驗。"); } catch (e) { toast("分享連結壞掉了，改開空白實驗台"); }
      // 讀完就把網址還原：否則重新整理會一直回到分享時的樣子，蓋掉自己後來的修改
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    }
    if (!loaded) { try { const s = localStorage.getItem(STORE_KEY); if (s) { load(s); loaded = true; } } catch (e) { state.items = []; state.wires = []; } }
    updateEmpty(); updateUndoButtons(); updateTransport(); fit();
    requestAnimationFrame(loop);
    window.PhysicsLabLabApp = { state, sim, view, ui, load, serialize, play, reset, loadPreset: i => loadPreset(PRESETS[i]), presets: PRESETS.map(p => p.name), addItem, fit };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
