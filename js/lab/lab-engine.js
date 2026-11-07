/*
 * lab-engine.js — 自訂實驗室的力學引擎
 *
 * 單位：長度 cm、質量 kg、時間 s。這組單位有個好性質：
 *   力（kg·cm/s²）＝ 100 × 牛頓，而彈簧 k（N/m）× 伸長量（cm）剛好就是 kg·cm/s²，
 *   阻尼 c（N·s/m）× 速度（cm/s）也是——課本單位的數值可以直接代入，不必到處換算。
 *   對外顯示時再把力 ÷ 100 換成 N、速度 ÷ 100 換成 m/s。
 *
 * 做法是常見的「循序衝量」剛體引擎（Box2D-lite 的路數）：
 *   1. 外力（重力、彈簧、定力、拖曳）改速度
 *   2. 偵測碰撞：圓–圓、圓–多邊形、多邊形–多邊形（SAT＋參考面裁切，最多兩個接觸點）
 *   3. 速度疊代：繩、滑輪只能拉不能推（累積衝量 ≥ 0）；接觸法向衝量 ≥ 0、摩擦 ≤ μ × 法向
 *   4. 積分位置，再做一次位置修正（只推開穿透、不加速度，所以不會憑空生出能量）
 * 子步長 1/240 s：彈簧 k = 500 N/m 掛 50 g 也穩定（ω·dt ≈ 0.4）。
 *
 * 這支只做計算，不碰 DOM，Node 測試可以直接載入（見 tools/tests/lab-test.js）。
 */
(function (root) {
  "use strict";
  const LAB = root.PhysicsLabLab = root.PhysicsLabLab || {};

  const G = 980;                 // cm/s²
  const SLOP = 0.08;             // 允許的穿透（cm），避免接觸點在零與非零之間抖動
  const BAUMGARTE = 0.35;        // 位置修正比例
  const REST_THRESHOLD = 25;     // 相對速度低於 25 cm/s 不反彈：靜止接觸不會一直彈跳
  const ITER = 14;

  const cross = (ax, ay, bx, by) => ax * by - ay * bx;

  /* ------------------------------ 剛體 ------------------------------ */
  function makeBody(o) {
    const b = {
      id: o.id, shape: o.shape, x: o.x, y: o.y, a: o.a || 0,
      vx: o.vx || 0, vy: o.vy || 0, w: o.w || 0,
      mu: o.mu == null ? 0.4 : o.mu, e: o.e == null ? 0.2 : o.e,
      isStatic: !!o.isStatic, fx: 0, fy: 0, torque: 0, contacts: 0
    };
    if (o.shape === "circle") {
      b.r = o.r;
    } else {
      b.verts = o.verts.map(v => ({ x: v.x, y: v.y }));
      // 外法向：與形心比較方向，順時針、逆時針排列都適用
      const cx = b.verts.reduce((s, v) => s + v.x, 0) / b.verts.length;
      const cy = b.verts.reduce((s, v) => s + v.y, 0) / b.verts.length;
      b.norms = b.verts.map((v, i) => {
        const w = b.verts[(i + 1) % b.verts.length];
        let nx = w.y - v.y, ny = -(w.x - v.x);
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        if (nx * ((v.x + w.x) / 2 - cx) + ny * ((v.y + w.y) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
        return { x: nx, y: ny };
      });
      b.radius = Math.max(...b.verts.map(v => Math.hypot(v.x, v.y)));
    }
    if (b.isStatic) { b.m = Infinity; b.im = 0; b.I = Infinity; b.iI = 0; }
    else {
      b.m = o.m; b.im = 1 / o.m;
      if (o.shape === "circle") b.I = (o.inertia == null ? 0.4 : o.inertia) * o.m * o.r * o.r;  // 實心球 2/5 mr²
      else {
        const xs = b.verts.map(v => v.x), ys = b.verts.map(v => v.y);
        const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
        b.I = o.m * (w * w + h * h) / 12;
      }
      if (o.noRotate) b.I = Infinity;
      b.iI = isFinite(b.I) ? 1 / b.I : 0;
    }
    return b;
  }

  // 多邊形頂點與法向轉成世界座標
  function worldPoly(b) {
    const c = Math.cos(b.a), s = Math.sin(b.a);
    return {
      v: b.verts.map(p => ({ x: b.x + p.x * c - p.y * s, y: b.y + p.x * s + p.y * c })),
      n: b.norms.map(p => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }))
    };
  }
  function bound(b) { return b.shape === "circle" ? b.r : b.radius; }

  /* ------------------------------ 碰撞偵測 ------------------------------ */
  // 回傳 { n:{x,y}（由 A 指向 B）, pts:[{x,y,pen}] } 或 null
  function collideCircles(A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), r = A.r + B.r;
    if (d >= r) return null;
    const nx = d > 1e-9 ? dx / d : 0, ny = d > 1e-9 ? dy / d : 1;
    return { n: { x: nx, y: ny }, pts: [{ x: A.x + nx * (A.r - (r - d) / 2), y: A.y + ny * (A.r - (r - d) / 2), pen: r - d }] };
  }

  function collidePolyCircle(P, C) {   // 法向由多邊形指向圓
    const W = worldPoly(P);
    let maxSep = -Infinity, best = 0;
    for (let i = 0; i < W.v.length; i++) {
      const s = W.n[i].x * (C.x - W.v[i].x) + W.n[i].y * (C.y - W.v[i].y);
      if (s > C.r) return null;
      if (s > maxSep) { maxSep = s; best = i; }
    }
    if (maxSep < 0) {
      // 圓心在多邊形內：沿穿透最淺的面推出去
      const n = W.n[best];
      return { n, pts: [{ x: C.x - n.x * C.r, y: C.y - n.y * C.r, pen: C.r - maxSep }] };
    }
    // 找邊界上離圓心最近的點（含頂點區域）
    let bd = Infinity, q = null;
    for (let i = 0; i < W.v.length; i++) {
      const a = W.v[i], b = W.v[(i + 1) % W.v.length];
      const ex = b.x - a.x, ey = b.y - a.y, L2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((C.x - a.x) * ex + (C.y - a.y) * ey) / L2));
      const px = a.x + ex * t, py = a.y + ey * t, d = Math.hypot(C.x - px, C.y - py);
      if (d < bd) { bd = d; q = { x: px, y: py }; }
    }
    if (bd >= C.r) return null;
    const n = bd > 1e-9 ? { x: (C.x - q.x) / bd, y: (C.y - q.y) / bd } : W.n[best];
    return { n, pts: [{ x: q.x, y: q.y, pen: C.r - bd }] };
  }

  function maxSeparation(WA, WB) {
    let best = -Infinity, idx = 0;
    for (let i = 0; i < WA.v.length; i++) {
      const n = WA.n[i], v = WA.v[i];
      let min = Infinity;
      for (const p of WB.v) { const s = n.x * (p.x - v.x) + n.y * (p.y - v.y); if (s < min) min = s; }
      if (min > best) { best = min; idx = i; }
    }
    return { sep: best, idx };
  }

  function collidePolys(A, B) {
    const WA = worldPoly(A), WB = worldPoly(B);
    const sa = maxSeparation(WA, WB); if (sa.sep > 0) return null;
    const sb = maxSeparation(WB, WA); if (sb.sep > 0) return null;
    let ref, inc, ri, flip;
    if (sb.sep > sa.sep + 0.02) { ref = WB; inc = WA; ri = sb.idx; flip = true; }
    else { ref = WA; inc = WB; ri = sa.idx; flip = false; }
    const n = ref.n[ri];
    // 參考面對面的「入射邊」：法向與 n 最反向的那一條
    let ii = 0, minDot = Infinity;
    for (let i = 0; i < inc.n.length; i++) { const d = inc.n[i].x * n.x + inc.n[i].y * n.y; if (d < minDot) { minDot = d; ii = i; } }
    let p1 = inc.v[ii], p2 = inc.v[(ii + 1) % inc.v.length];
    const v1 = ref.v[ri], v2 = ref.v[(ri + 1) % ref.v.length];
    let tx = v2.x - v1.x, ty = v2.y - v1.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    // 以參考面兩端的側平面裁切入射邊
    const clip = (a, b, ox, oy, off) => {
      const da = a.x * ox + a.y * oy - off, db = b.x * ox + b.y * oy - off, out = [];
      if (da <= 0) out.push(a);
      if (db <= 0) out.push(b);
      if (da * db < 0) { const t = da / (da - db); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
      return out;
    };
    let pts = clip(p1, p2, -tx, -ty, -(tx * v1.x + ty * v1.y));
    if (pts.length < 2) return null;
    pts = clip(pts[0], pts[1], tx, ty, tx * v2.x + ty * v2.y);
    if (pts.length < 2) return null;
    const out = [];
    for (const p of pts) {
      const sep = n.x * (p.x - v1.x) + n.y * (p.y - v1.y);
      if (sep <= 0) out.push({ x: p.x, y: p.y, pen: -sep });
    }
    if (!out.length) return null;
    return { n: flip ? { x: -n.x, y: -n.y } : { x: n.x, y: n.y }, pts: out };
  }

  function collide(A, B) {
    if (A.shape === "circle" && B.shape === "circle") return collideCircles(A, B);
    if (A.shape !== "circle" && B.shape === "circle") return collidePolyCircle(A, B);
    if (A.shape === "circle" && B.shape !== "circle") {
      const m = collidePolyCircle(B, A);
      return m && { n: { x: -m.n.x, y: -m.n.y }, pts: m.pts };
    }
    return collidePolys(A, B);
  }

  /* ------------------------------ 世界 ------------------------------ */
  function World(opts) {
    opts = opts || {};
    this.g = opts.gravity == null ? G : opts.gravity;
    this.bodies = []; this.ropes = []; this.springs = []; this.pulleys = []; this.forces = [];
    this.grab = null; this.time = 0; this.contacts = [];
    this.dt = opts.dt || 1 / 240;
  }
  World.prototype.add = function (o) { const b = makeBody(o); this.bodies.push(b); return b; };
  World.prototype.body = function (id) { return this.bodies.find(b => b.id === id) || null; };

  // 物體上的局部點 → 世界座標
  function anchorWorld(b, lx, ly) {
    if (!b) return { x: lx, y: ly };
    const c = Math.cos(b.a), s = Math.sin(b.a);
    return { x: b.x + lx * c - ly * s, y: b.y + lx * s + ly * c };
  }
  function pointVel(b, px, py) {
    if (!b) return { x: 0, y: 0 };
    return { x: b.vx - b.w * (py - b.y), y: b.vy + b.w * (px - b.x) };
  }
  function applyImpulse(b, jx, jy, px, py) {
    if (!b || b.isStatic) return;
    b.vx += jx * b.im; b.vy += jy * b.im;
    b.w += cross(px - b.x, py - b.y, jx, jy) * b.iI;
  }
  function effMass(b, px, py, ux, uy) {
    if (!b || b.isStatic) return 0;
    const rn = cross(px - b.x, py - b.y, ux, uy);
    return b.im + rn * rn * b.iI;
  }
  LAB.anchorWorld = anchorWorld;

  /*
   * 繩：A 端（物體或世界固定點）到 B 端，長度 ≤ L，只能拉。
   * 用「繩長變化率」寫：Ld = u·(vB − vA)，張力衝量 T ≥ 0 讓 Ld 不再為正。
   */
  World.prototype.rope = function (o) { const r = Object.assign({ T: 0, tension: 0 }, o); this.ropes.push(r); return r; };
  World.prototype.spring = function (o) { const s = Object.assign({ c: 0.6, force: 0 }, o); this.springs.push(s); return s; };
  // 定滑輪：A、B 兩物體分掛兩側，|A − GA| + |B − GB| ≤ L
  World.prototype.pulley = function (o) { const p = Object.assign({ T: 0, tension: 0 }, o); this.pulleys.push(p); return p; };
  World.prototype.force = function (o) { this.forces.push(o); return o; };

  World.prototype.step = function (dt) {
    dt = dt || this.dt;
    const B = this.bodies;
    // 1. 外力
    B.forEach(b => { b.fx = 0; b.fy = 0; b.torque = 0; });
    this.springs.forEach(s => {
      const pa = anchorWorld(s.a, s.ax, s.ay), pb = anchorWorld(s.b, s.bx, s.by);
      let dx = pb.x - pa.x, dy = pb.y - pa.y; const len = Math.hypot(dx, dy) || 1e-9; dx /= len; dy /= len;
      const va = pointVel(s.a, pa.x, pa.y), vb = pointVel(s.b, pb.x, pb.y);
      const rel = (vb.x - va.x) * dx + (vb.y - va.y) * dy;
      const f = s.k * (len - s.L0) + s.c * rel;     // > 0：拉伸，把兩端拉近
      s.force = f; s.len = len;
      const add = (b, p, fx, fy) => { if (!b || b.isStatic) return; b.fx += fx; b.fy += fy; b.torque += cross(p.x - b.x, p.y - b.y, fx, fy); };
      add(s.a, pa, f * dx, f * dy); add(s.b, pb, -f * dx, -f * dy);
    });
    this.forces.forEach(f => {
      const b = f.body; if (!b || b.isStatic) return;
      b.fx += f.F * 100 * Math.cos(f.ang); b.fy += f.F * 100 * Math.sin(f.ang);
    });
    B.forEach(b => {
      if (b.isStatic) return;
      b.vx += (b.fx * b.im) * dt; b.vy += (this.g + b.fy * b.im) * dt;
      b.w += b.torque * b.iI * dt;
    });
    // 拖曳：滑鼠抓著的物體被一條很硬、臨界阻尼的彈簧拉向指標
    if (this.grab && this.grab.body && !this.grab.body.isStatic) {
      const g = this.grab, b = g.body, p = anchorWorld(b, g.lx, g.ly);
      const k = 260, c = 2 * Math.sqrt(k);
      const v = pointVel(b, p.x, p.y);
      const ax = k * (g.tx - p.x) - c * v.x, ay = k * (g.ty - p.y) - c * v.y - this.g;
      applyImpulse(b, ax * dt * b.m, ay * dt * b.m, p.x, p.y);
      b.w *= 0.96;
    }

    // 2. 碰撞
    const C = [];
    for (let i = 0; i < B.length; i++) {
      for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (a.isStatic && b.isStatic) continue;
        const rr = bound(a) + bound(b);
        if (Math.abs(a.x - b.x) > rr || Math.abs(a.y - b.y) > rr) continue;
        const m = collide(a, b);
        if (!m) continue;
        // 摩擦取兩面中較小者：力學車（μ = 0.01）放在桌上就是低摩擦，不會被桌面的 μ 拉高
        const mu = Math.min(a.mu, b.mu), e = Math.max(a.e, b.e);
        m.pts.forEach(p => {
          const n = m.n, tx = -n.y, ty = n.x;
          const kn = effMass(a, p.x, p.y, n.x, n.y) + effMass(b, p.x, p.y, n.x, n.y);
          const kt = effMass(a, p.x, p.y, tx, ty) + effMass(b, p.x, p.y, tx, ty);
          const va = pointVel(a, p.x, p.y), vb = pointVel(b, p.x, p.y);
          const vn = (vb.x - va.x) * n.x + (vb.y - va.y) * n.y;
          C.push({ a, b, n, t: { x: tx, y: ty }, p, pen: p.pen, mu, mn: kn > 0 ? 1 / kn : 0, mt: kt > 0 ? 1 / kt : 0,
            bounce: vn < -REST_THRESHOLD ? -e * vn : 0, jn: 0, jt: 0 });
        });
        a.contacts++; b.contacts++;
      }
    }
    this.contacts = C;

    // 3. 速度疊代
    const ropes = this.ropes.map(r => {
      const pa = anchorWorld(r.a, r.ax, r.ay), pb = anchorWorld(r.b, r.bx, r.by);
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1e-9;
      const u = { x: (pb.x - pa.x) / len, y: (pb.y - pa.y) / len };
      const k = effMass(r.a, pa.x, pa.y, u.x, u.y) + effMass(r.b, pb.x, pb.y, u.x, u.y);
      return { r, pa, pb, u, len, k, T: 0, taut: len >= r.L - 0.02 };
    });
    const pulls = this.pulleys.map(q => {
      const pa = anchorWorld(q.a, q.ax, q.ay), pb = anchorWorld(q.b, q.bx, q.by);
      const la = Math.hypot(pa.x - q.ga.x, pa.y - q.ga.y) || 1e-9, lb = Math.hypot(pb.x - q.gb.x, pb.y - q.gb.y) || 1e-9;
      const ua = { x: (pa.x - q.ga.x) / la, y: (pa.y - q.ga.y) / la }, ub = { x: (pb.x - q.gb.x) / lb, y: (pb.y - q.gb.y) / lb };
      const k = effMass(q.a, pa.x, pa.y, ua.x, ua.y) + effMass(q.b, pb.x, pb.y, ub.x, ub.y);
      return { q, pa, pb, ua, ub, la, lb, k, T: 0, taut: la + lb >= q.L - 0.02 };
    });
    for (let it = 0; it < ITER; it++) {
      ropes.forEach(R => {
        if (!R.taut || R.k <= 0) return;
        const va = pointVel(R.r.a, R.pa.x, R.pa.y), vb = pointVel(R.r.b, R.pb.x, R.pb.y);
        const Ld = R.u.x * (vb.x - va.x) + R.u.y * (vb.y - va.y);
        const T0 = R.T; R.T = Math.max(0, R.T + Ld / R.k); const d = R.T - T0;
        applyImpulse(R.r.b, -R.u.x * d, -R.u.y * d, R.pb.x, R.pb.y);
        applyImpulse(R.r.a, R.u.x * d, R.u.y * d, R.pa.x, R.pa.y);
      });
      pulls.forEach(P => {
        if (!P.taut || P.k <= 0) return;
        const va = pointVel(P.q.a, P.pa.x, P.pa.y), vb = pointVel(P.q.b, P.pb.x, P.pb.y);
        const Ld = P.ua.x * va.x + P.ua.y * va.y + P.ub.x * vb.x + P.ub.y * vb.y;
        const T0 = P.T; P.T = Math.max(0, P.T + Ld / P.k); const d = P.T - T0;
        applyImpulse(P.q.a, -P.ua.x * d, -P.ua.y * d, P.pa.x, P.pa.y);
        applyImpulse(P.q.b, -P.ub.x * d, -P.ub.y * d, P.pb.x, P.pb.y);
      });
      C.forEach(c => {
        const va = pointVel(c.a, c.p.x, c.p.y), vb = pointVel(c.b, c.p.x, c.p.y);
        const rvx = vb.x - va.x, rvy = vb.y - va.y;
        // 法向
        const vn = rvx * c.n.x + rvy * c.n.y;
        let dj = c.mn * (c.bounce - vn);
        const j0 = c.jn; c.jn = Math.max(0, j0 + dj); dj = c.jn - j0;
        applyImpulse(c.a, -c.n.x * dj, -c.n.y * dj, c.p.x, c.p.y);
        applyImpulse(c.b, c.n.x * dj, c.n.y * dj, c.p.x, c.p.y);
        // 摩擦
        const va2 = pointVel(c.a, c.p.x, c.p.y), vb2 = pointVel(c.b, c.p.x, c.p.y);
        const vt = (vb2.x - va2.x) * c.t.x + (vb2.y - va2.y) * c.t.y;
        let dt2 = -c.mt * vt;
        const max = c.mu * c.jn, t0 = c.jt;
        c.jt = Math.max(-max, Math.min(max, t0 + dt2)); dt2 = c.jt - t0;
        applyImpulse(c.a, -c.t.x * dt2, -c.t.y * dt2, c.p.x, c.p.y);
        applyImpulse(c.b, c.t.x * dt2, c.t.y * dt2, c.p.x, c.p.y);
      });
    }
    ropes.forEach(R => { R.r.T = R.T; R.r.tension = R.T / dt; R.r.len = R.len; R.r.taut = R.taut; });
    pulls.forEach(P => { P.q.T = P.T; P.q.tension = P.T / dt; P.q.taut = P.taut; });

    // 4. 積分位置
    B.forEach(b => {
      if (b.isStatic) return;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    });

    // 5. 位置修正：接觸穿透、繩長超出（只移位置，不改速度）
    C.forEach(c => {
      const corr = Math.max(0, c.pen - SLOP) * BAUMGARTE;
      const tot = c.a.im + c.b.im; if (!corr || !tot) return;
      const s = corr / tot;
      if (!c.a.isStatic) { c.a.x -= c.n.x * s * c.a.im; c.a.y -= c.n.y * s * c.a.im; }
      if (!c.b.isStatic) { c.b.x += c.n.x * s * c.b.im; c.b.y += c.n.y * s * c.b.im; }
    });
    this.ropes.forEach(r => {
      const pa = anchorWorld(r.a, r.ax, r.ay), pb = anchorWorld(r.b, r.bx, r.by);
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y); const ex = len - r.L;
      if (ex <= 0.01) return;
      const ux = (pb.x - pa.x) / len, uy = (pb.y - pa.y) / len;
      const ia = r.a && !r.a.isStatic ? r.a.im : 0, ib = r.b && !r.b.isStatic ? r.b.im : 0, tot = ia + ib;
      if (!tot) return;
      const s = ex * 0.8 / tot;
      if (ia) { r.a.x += ux * s * ia; r.a.y += uy * s * ia; }
      if (ib) { r.b.x -= ux * s * ib; r.b.y -= uy * s * ib; }
    });
    this.pulleys.forEach(q => {
      const pa = anchorWorld(q.a, q.ax, q.ay), pb = anchorWorld(q.b, q.bx, q.by);
      const la = Math.hypot(pa.x - q.ga.x, pa.y - q.ga.y), lb = Math.hypot(pb.x - q.gb.x, pb.y - q.gb.y);
      const ex = la + lb - q.L; if (ex <= 0.01) return;
      const ia = q.a && !q.a.isStatic ? q.a.im : 0, ib = q.b && !q.b.isStatic ? q.b.im : 0, tot = ia + ib;
      if (!tot) return;
      const s = ex * 0.8 / tot;
      if (ia) { q.a.x -= (pa.x - q.ga.x) / la * s * ia; q.a.y -= (pa.y - q.ga.y) / la * s * ia; }
      if (ib) { q.b.x -= (pb.x - q.gb.x) / lb * s * ib; q.b.y -= (pb.y - q.gb.y) / lb * s * ib; }
    });
    this.time += dt;
  };

  /* 系統能量（焦耳）：動能、重力位能（以 yRef 為零點，y 向下）、彈性位能 */
  World.prototype.energy = function (yRef) {
    let K = 0, Ug = 0, Us = 0;
    this.bodies.forEach(b => {
      if (b.isStatic) return;
      K += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy) / 1e4 + (isFinite(b.I) ? 0.5 * b.I * b.w * b.w / 1e4 : 0);
      Ug += b.m * (this.g / 100) * ((yRef - b.y) / 100);
    });
    this.springs.forEach(s => {
      const pa = anchorWorld(s.a, s.ax, s.ay), pb = anchorWorld(s.b, s.bx, s.by);
      const x = (Math.hypot(pb.x - pa.x, pb.y - pa.y) - s.L0) / 100;
      Us += 0.5 * s.k * x * x;
    });
    return { K, Ug, Us, E: K + Ug + Us };
  };

  LAB.mech = { World, makeBody, collide, worldPoly, G };

  /* ------------------------------ 擺放吸附 ------------------------------
   * 學生用手拖繩子、彈簧的端點，很難拖出剛好水平的線；差 2° 拉力的方向就跟著歪。
   * 這裡決定「手指／滑鼠在 cand 時，端點實際該放在哪裡」：
   *   1. 角度：相對於另一端（ref），接近 0°、90°、45°、15° 的倍數就吸過去，長度取到 0.5 cm
   *   2. 對齊：x 或 y 接近其他器材的中心、端點（points）就對齊，畫出參考線
   *   3. 都沒有就對齊 1 cm 格點（grid）
   * 容許範圍用螢幕像素算（scale = 每 cm 幾 px），縮放後手感一致。free = true（按住 Shift）時完全不吸附。
   * 純計算、不碰 DOM：tools/tests/lab-test.js 直接測。
   */
  function snapPoint(cand, o) {
    o = o || {};
    const scale = o.scale || 1, out = { x: cand.x, y: cand.y, kind: null, guides: [] };
    if (o.free) return out;
    const ref = o.ref;
    if (ref) {
      const dx = cand.x - ref.x, dy = cand.y - ref.y, dist = Math.hypot(dx, dy);
      if (dist * scale > 12) {
        const ang = Math.atan2(-dy, dx) / (Math.PI / 180);          // 數學角度：右 0°、上 90°
        let best = null;
        for (let k = -180; k <= 180; k += 15) {
          const diff = Math.abs(((ang - k + 540) % 360) - 180);
          const tolPx = k % 90 === 0 ? 10 : k % 45 === 0 ? 7 : 4;     // 水平、鉛直最好吸
          const offPx = Math.sin(diff * Math.PI / 180) * dist * scale;
          if (diff < 20 && offPx <= tolPx && (!best || offPx < best.offPx)) best = { k, offPx };
        }
        if (best) {
          const L = Math.max(0.5, Math.round(dist * 2) / 2), a = best.k * Math.PI / 180;
          out.x = ref.x + Math.cos(a) * L; out.y = ref.y - Math.sin(a) * L;
          // 0°／90° 的倍數消掉浮點殘差，讓「水平」真的是同一個 y
          if (best.k % 90 === 0) { if (best.k % 180 === 0) out.y = ref.y; else out.x = ref.x; }
          out.kind = "angle"; out.angle = best.k; out.len = L;
          out.guides.push({ x1: ref.x, y1: ref.y, x2: ref.x + Math.cos(a) * L * 1.6, y2: ref.y - Math.sin(a) * L * 1.6 });
          return out;
        }
      }
    }
    const tol = 6 / scale;
    let bx = null, by = null;
    (o.points || []).forEach(q => {
      const ex = Math.abs(q.x - cand.x), ey = Math.abs(q.y - cand.y);
      if (ex <= tol && (!bx || ex < bx.e)) bx = { e: ex, q };
      if (ey <= tol && (!by || ey < by.e)) by = { e: ey, q };
    });
    if (bx) { out.x = bx.q.x; out.guides.push({ x1: bx.q.x, y1: Math.min(bx.q.y, cand.y) - 30, x2: bx.q.x, y2: Math.max(bx.q.y, cand.y) + 30, axis: "x" }); }
    if (by) { out.y = by.q.y; out.guides.push({ x1: Math.min(by.q.x, cand.x) - 30, y1: by.q.y, x2: Math.max(by.q.x, cand.x) + 30, y2: by.q.y, axis: "y" }); }
    if (bx || by) out.kind = "align";
    if (o.grid) { if (!bx) out.x = Math.round(out.x / o.grid) * o.grid; if (!by) out.y = Math.round(out.y / o.grid) * o.grid; }
    if (ref) {
      const dx = out.x - ref.x, dy = out.y - ref.y;
      out.angle = Math.atan2(-dy, dx) / (Math.PI / 180); out.len = Math.hypot(dx, dy);
    }
    return out;
  }
  LAB.snapPoint = snapPoint;
})(typeof window !== "undefined" ? window : globalThis);
