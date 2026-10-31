/*
 * lab-optics.js — 自訂實驗室的光線追蹤
 *
 * 元件：
 *   lens    理想薄透鏡：在鏡面上依「斜率 − 高度／f」偏折，平行光必聚於焦平面（f < 0 為凹透鏡）
 *   mirror  面鏡：先鏡面反射，再依 f 做同樣的偏折（f = ∞ 平面鏡；f > 0 凹面鏡；f < 0 凸面鏡）
 *   glass   玻璃（多邊形）：司乃耳折射＋菲涅耳部分反射；超過臨界角全反射；
 *           折射率隨波長變（柯西式），白光（nm = 0）打到玻璃時才拆成七種波長而色散
 *   block   吸收體（屏幕、擋板）：記錄光點
 * 光線帶強度，部分反射的分支強度低於 4% 就不再追；總段數有上限，避免鏡子對鏡子無限反射。
 */
(function (root) {
  "use strict";
  const LAB = root.PhysicsLabLab = root.PhysicsLabLab || {};

  const EPS = 1e-6, MAX_SEGS = 900, MIN_I = 0.04, MAX_DEPTH = 40, FAR = 1e5;
  const WHITE = [410, 450, 490, 530, 570, 610, 660];

  // 柯西色散：以 589 nm 的 n 為基準
  const nAt = (n, nm) => n + 0.0062 * (1 / Math.pow(nm / 1000, 2) - 1 / Math.pow(0.5893, 2));

  function raySeg(ox, oy, dx, dy, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) return null;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
    const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    if (t <= EPS || u < 0 || u > 1) return null;
    return { t, u };
  }

  function fresnel(cosi, cost, n1, n2) {
    const rs = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost);
    const rp = (n1 * cost - n2 * cosi) / (n1 * cost + n2 * cosi);
    return Math.min(1, (rs * rs + rp * rp) / 2);
  }

  /*
   * sources: [{ x, y, dx, dy, nm, I }]（白光請先展開成多條單色光）
   * elements: 見檔頭；每個都要有 id
   */
  function trace(sources, elements) {
    const segs = [], hits = [];
    // 把所有元件攤平成可求交的線段
    const edges = [];
    elements.forEach(el => {
      if (el.kind === "lens" || el.kind === "mirror" || el.kind === "block") {
        edges.push({ el, ax: el.cx - el.tx * el.half, ay: el.cy - el.ty * el.half, bx: el.cx + el.tx * el.half, by: el.cy + el.ty * el.half });
      } else if (el.kind === "glass") {
        const P = el.poly;
        // 外法向（形心法）
        const cx = P.reduce((s, p) => s + p.x, 0) / P.length, cy = P.reduce((s, p) => s + p.y, 0) / P.length;
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = P[(i + 1) % P.length];
          let nx = b.y - a.y, ny = -(b.x - a.x); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
          if (nx * ((a.x + b.x) / 2 - cx) + ny * ((a.y + b.y) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
          edges.push({ el, ax: a.x, ay: a.y, bx: b.x, by: b.y, nx, ny });
        }
      }
    });

    const stack = sources.map(s => ({ x: s.x, y: s.y, dx: s.dx, dy: s.dy, nm: s.nm, I: s.I == null ? 1 : s.I, depth: 0, inside: null, src: s }));
    while (stack.length && segs.length < MAX_SEGS) {
      const r = stack.pop();
      const dl = Math.hypot(r.dx, r.dy) || 1; r.dx /= dl; r.dy /= dl;
      let best = null;
      for (const e of edges) {
        const h = raySeg(r.x, r.y, r.dx, r.dy, e.ax, e.ay, e.bx, e.by);
        if (h && (!best || h.t < best.t)) best = { t: h.t, u: h.u, e };
      }
      if (!best) {
        segs.push({ x1: r.x, y1: r.y, x2: r.x + r.dx * FAR, y2: r.y + r.dy * FAR, nm: r.nm, I: r.I });
        continue;
      }
      const px = r.x + r.dx * best.t, py = r.y + r.dy * best.t;
      segs.push({ x1: r.x, y1: r.y, x2: px, y2: py, nm: r.nm, I: r.I });
      if (r.depth >= MAX_DEPTH) continue;
      const e = best.e, el = e.el;
      const next = (dx, dy, I, inside, nm) => {
        if (I < MIN_I) return;
        stack.push({ x: px + dx * 1e-3, y: py + dy * 1e-3, dx, dy, nm: nm == null ? r.nm : nm, I, depth: r.depth + 1, inside, src: r.src });
      };

      if (el.kind === "block") {
        hits.push({ id: el.id, x: px, y: py, nm: r.nm, I: r.I, u: best.u });
        continue;
      }
      if (el.kind === "lens" || el.kind === "mirror") {
        // 局部座標：t 沿鏡面，n 為法向；h 是打在鏡面上的高度（相對中心）
        const tx = el.tx, ty = el.ty; let nx = -ty, ny = tx;
        const h = (px - el.cx) * tx + (py - el.cy) * ty;
        let dn = r.dx * nx + r.dy * ny;
        const dt = r.dx * tx + r.dy * ty;
        if (el.kind === "mirror") {
          // 反射後沿 −n 方向前進（相對入射側），再當作在反射側的透鏡偏折
          if (dn > 0) { nx = -nx; ny = -ny; dn = -dn; }   // 讓 n 指向入射側
          const s = dt / -dn;                             // 反射後的斜率（沿 n 方向前進）
          const s2 = isFinite(el.f) && el.f ? s - h / el.f : s;
          const ox = nx + s2 * tx, oy = ny + s2 * ty;
          next(ox, oy, r.I * (el.reflect == null ? 0.96 : el.reflect), r.inside);
        } else {
          if (Math.abs(dn) < 1e-9) { next(r.dx, r.dy, r.I, r.inside); continue; }
          if (dn < 0) { nx = -nx; ny = -ny; dn = -dn; }
          const s = dt / dn, s2 = el.f ? s - h / el.f : s;
          next(nx + s2 * tx, ny + s2 * ty, r.I * 0.97, r.inside);
        }
        continue;
      }
      if (el.kind === "glass") {
        // 白光（nm = 0）到了玻璃才分成七種波長：之前在空氣、透鏡、面鏡裡都還是同一條白光
        (r.nm ? [r.nm] : WHITE).forEach(nm => glass(e, el, nm));
      }
      function glass(e, el, nm) {
        let nx = e.nx, ny = e.ny;
        let cosi = -(r.dx * nx + r.dy * ny);
        const entering = cosi > 0;
        const ng = nAt(el.n, nm);
        const n1 = entering ? 1 : ng, n2 = entering ? ng : 1;
        if (!entering) { nx = -nx; ny = -ny; cosi = -cosi; }  // 讓法向朝入射側
        const eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
        const rx = r.dx + 2 * cosi * nx, ry = r.dy + 2 * cosi * ny;
        if (k < 0) {                                          // 全反射
          next(rx, ry, r.I * 0.995, entering ? null : el.id, nm);
          return;
        }
        const cost = Math.sqrt(k);
        const tx = eta * r.dx + (eta * cosi - cost) * nx, ty = eta * r.dy + (eta * cosi - cost) * ny;
        const R = fresnel(cosi, cost, n1, n2);
        next(tx, ty, r.I * (1 - R), entering ? el.id : null, nm);
        next(rx, ry, r.I * R, entering ? null : el.id, nm);
      }
    }
    return { segs, hits, truncated: stack.length > 0 };
  }

  LAB.optics = { trace, nAt, WHITE };
})(typeof window !== "undefined" ? window : globalThis);
