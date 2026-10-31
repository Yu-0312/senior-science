/*
 * lab-items.js — 自訂實驗室的器材與工具清單
 *
 * 每一種器材是一筆型別定義：
 *   cat        分類：mech 力學／elec 電學／optics 光學／tool 量測工具
 *   defaults   可調參數的預設值（存進 item.p）；params 是右側檢視面板的控制項
 *   size(it)   選取框大小（cm）；card 型（圖表、碼錶、能量計）用螢幕像素，跟縮放無關
 *   draw       在螢幕座標上畫（ctx 已是 1:1 像素，V.s＝每公分幾像素）
 *   body       力學剛體的規格（app 開始模擬時交給 lab-engine）
 *   terms      電學接線柱（局部座標，隨旋轉）
 *   optic      光學元件／光源
 *   ends       連接件（彈簧、細繩、滑輪繩、定力、感測器、尺、量角器）的端點：
 *              端點可以拖到物體或吊鉤上「接住」，放在空中就是固定點
 *
 * 單位與引擎一致：cm、kg、s；面板上顯示 m、m/s、N。
 */
(function (root) {
  "use strict";
  const LAB = root.PhysicsLabLab = root.PhysicsLabLab || {};
  const PL = root.PhysicsLab || {};
  const AP = () => (PL.apparatus || null);
  const TAU = Math.PI * 2, DEG = Math.PI / 180;

  /* ------------------------------ 共用小工具 ------------------------------ */
  const isLight = () => typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";
  const ink = a => isLight() ? `rgba(24,32,46,${a == null ? 1 : a})` : `rgba(230,237,243,${a == null ? 1 : a})`;
  const accent = () => isLight() ? "#0f766e" : "#35e0cf";
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(ctx, s, x, y, o) {
    if (LAB.iconMode) return;          // 器材盒的小圖示不畫文字標籤（會被裁掉）
    o = o || {};
    ctx.save();
    ctx.font = (o.weight || "600") + " " + (o.size || 12) + "px system-ui,'PingFang TC','Microsoft JhengHei',sans-serif";
    ctx.textAlign = o.align || "center"; ctx.textBaseline = o.base || "middle";
    if (o.halo !== false) { ctx.lineWidth = 3; ctx.strokeStyle = isLight() ? "rgba(255,255,255,0.85)" : "rgba(10,14,20,0.8)"; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || ink(); ctx.fillText(s, x, y);
    ctx.restore();
  }
  function chip(ctx, s, x, y, o) {
    if (LAB.iconMode) return;
    o = o || {};
    ctx.save();
    ctx.font = "700 " + (o.size || 11.5) + "px system-ui,'PingFang TC',sans-serif";
    const w = ctx.measureText(s).width + 12, h = (o.size || 11.5) + 9;
    rr(ctx, x - w / 2, y - h / 2, w, h, 5);
    ctx.fillStyle = isLight() ? "rgba(255,255,255,0.94)" : "rgba(18,24,32,0.92)"; ctx.fill();
    ctx.strokeStyle = o.stroke || (isLight() ? "rgba(24,32,46,0.25)" : "rgba(230,237,243,0.25)"); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = o.color || ink(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y + 0.5);
    ctx.restore();
  }
  const fmt = (v, d) => {
    if (!isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(2);
    return v.toFixed(d == null ? 2 : d);
  };
  function local(it, lx, ly) {
    const c = Math.cos(it.a || 0), s = Math.sin(it.a || 0);
    return { x: it.x + lx * c - ly * s, y: it.y + lx * s + ly * c };
  }
  function toLocal(it, x, y) {
    const c = Math.cos(it.a || 0), s = Math.sin(it.a || 0), dx = x - it.x, dy = y - it.y;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }
  function arrow(ctx, x1, y1, x2, y2, color, w) {
    const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.max(8, w * 3.2);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * 0.6, y2 - Math.sin(a) * hl * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(a - 0.42) * hl, y2 - Math.sin(a - 0.42) * hl);
    ctx.lineTo(x2 - Math.cos(a + 0.42) * hl, y2 - Math.sin(a + 0.42) * hl); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function shade(ctx, cx, cy, w) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    g.addColorStop(0, "rgba(0,0,0,0.22)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.fillStyle = g; ctx.scale(1, 0.22); ctx.beginPath(); ctx.arc(cx, cy / 0.22, w / 2, 0, TAU); ctx.fill(); ctx.restore();
  }
  // 卡片型工具：以卡片中心縮放 V.cs（小螢幕上縮小，免得一張圖表蓋掉半個實驗台）
  function withCard(ctx, V, it, fn) {
    const cs = V.cs || 1, x = V.X(it.x), y = V.Y(it.y);
    ctx.save(); ctx.translate(x, y); ctx.scale(cs, cs); ctx.translate(-x, -y); fn(); ctx.restore();
  }
  // 在物體的旋轉座標系裡畫：(cx, cy) 為螢幕中心
  function withRot(ctx, V, it, fn) {
    ctx.save(); ctx.translate(V.X(it.x), V.Y(it.y)); ctx.rotate(it.a || 0); fn(); ctx.restore();
  }
  const COLORS = { red: 650, green: 532, blue: 450, violet: 410, white: 0 };
  const nmCss = (nm, a) => {
    if (AP() && AP().nmColor) return AP().nmColor(nm, a == null ? 1 : a);
    return `rgba(255,80,60,${a == null ? 1 : a})`;
  };

  /* ------------------------------ 參數片段 ------------------------------ */
  const P = {
    m: (min, max, def) => ({ k: "m", label: "質量", min, max, step: 0.01, unit: "kg", def }),
    mu: def => ({ k: "mu", label: "摩擦係數 μ", min: 0, max: 1, step: 0.01, unit: "", def }),
    e: def => ({ k: "e", label: "恢復係數 e", min: 0, max: 1, step: 0.01, unit: "", def }),
    v0: () => ({ k: "v0", label: "初速", min: 0, max: 8, step: 0.1, unit: "m/s", def: 0 }),
    ang0: () => ({ k: "ang0", label: "初速方向（仰角）", min: -180, max: 180, step: 1, unit: "°", def: 0 }),
    rot: () => ({ k: "rot", label: "角度", min: -180, max: 180, step: 1, unit: "°", def: 0, rotation: true }),
    color: () => ({ k: "color", label: "光色", kind: "select", def: "red",
      options: [["red", "紅光 650 nm"], ["green", "綠光 532 nm"], ["blue", "藍光 450 nm"], ["violet", "紫光 410 nm"], ["white", "白光（會色散）"]] })
  };
  function defaultsOf(params) { const d = {}; params.forEach(p => { if (!p.rotation) d[p.k] = p.def; }); return d; }

  const T = {};
  const order = [];
  function def(type, o) {
    o.type = type;
    o.defaults = defaultsOf(o.params || []);
    T[type] = o; order.push(type);
  }

  /* =======================================================================
     力學
     ======================================================================= */
  const dynParams = (m, mu, e) => [P.m(0.01, 5, m), P.mu(mu), P.e(e), P.v0(), P.ang0()];
  function initVel(it) {
    const v = (it.p.v0 || 0) * 100, a = (it.p.ang0 || 0) * DEG;
    return { vx: v * Math.cos(a), vy: -v * Math.sin(a) };
  }
  function velArrow(ctx, V, it) {
    if (V.status !== "edit" || !it.p.v0) return;
    const a = (it.p.ang0 || 0) * DEG, L = 16 + it.p.v0 * 9;
    const x = V.X(it.x), y = V.Y(it.y);
    arrow(ctx, x, y, x + Math.cos(a) * L, y - Math.sin(a) * L, "#2f7de1", 2.4);
    text(ctx, "v₀ = " + fmt(it.p.v0, 1) + " m/s", x + Math.cos(a) * (L + 22), y - Math.sin(a) * (L + 10), { size: 11, color: "#2f7de1" });
  }

  def("ball", {
    cat: "mech", name: "小球", desc: "實心球：可滾動、碰撞、拋射",
    params: [{ k: "r", label: "半徑", min: 1, max: 20, step: 0.5, unit: "cm", def: 5 }].concat(dynParams(0.2, 0.3, 0.6)),
    size: it => ({ w: it.p.r * 2, h: it.p.r * 2 }),
    hit: (it, x, y) => Math.hypot(x - it.x, y - it.y) <= it.p.r + 1,
    body: it => Object.assign({ shape: "circle", r: it.p.r, m: it.p.m, mu: it.p.mu, e: it.p.e }, initVel(it)),
    draw(ctx, it, V) {
      const r = it.p.r * V.s, x = V.X(it.x), y = V.Y(it.y);
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, "#ffd6c4"); g.addColorStop(0.35, "#f0703c"); g.addColorStop(1, "#8f2f12");
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      // 轉動標記：看得到滾動
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath(); ctx.arc(x, y, r * 0.62, (it.a || 0) - 0.6, (it.a || 0) + 0.6); ctx.stroke();
      ctx.restore();
      velArrow(ctx, V, it);
    }
  });

  def("block", {
    cat: "mech", name: "木塊", desc: "長方體：滑動、靜摩擦、翻倒",
    params: [{ k: "w", label: "寬", min: 4, max: 60, step: 1, unit: "cm", def: 16 }, { k: "h", label: "高", min: 4, max: 40, step: 1, unit: "cm", def: 10 }]
      .concat(dynParams(0.5, 0.4, 0.1)),
    size: it => ({ w: it.p.w, h: it.p.h }),
    body: it => Object.assign({ shape: "poly", verts: box(it.p.w, it.p.h), m: it.p.m, mu: it.p.mu, e: it.p.e }, initVel(it)),
    draw(ctx, it, V) {
      const w = it.p.w * V.s, h = it.p.h * V.s;
      withRot(ctx, V, it, () => { if (AP()) AP().woodBlock(ctx, 0, h / 2, w, h, 0); else { ctx.fillStyle = "#b78a56"; ctx.fillRect(-w / 2, -h / 2, w, h); } });
      text(ctx, fmt(it.p.m, 2) + " kg", V.X(it.x), V.Y(it.y), { size: Math.max(9, Math.min(12, h * 0.4)), color: "#3b2410", halo: false, weight: "700" });
      velArrow(ctx, V, it);
    }
  });

  def("cart", {
    cat: "mech", name: "力學車", desc: "低摩擦小車：牛頓第二定律、碰撞",
    params: [{ k: "w", label: "車長", min: 10, max: 50, step: 1, unit: "cm", def: 24 }].concat(dynParams(0.5, 0.01, 0.3)),
    size: it => ({ w: it.p.w, h: 12 }),
    body: it => Object.assign({ shape: "poly", verts: box(it.p.w, 12), m: it.p.m, mu: it.p.mu, e: it.p.e }, initVel(it)),
    draw(ctx, it, V) {
      const w = it.p.w * V.s, h = 12 * V.s;
      withRot(ctx, V, it, () => {
        if (AP()) AP().cart(ctx, 0, h / 2, w, h * 0.62, { color: "#2f7de1" });
        else { ctx.fillStyle = "#2f7de1"; ctx.fillRect(-w / 2, -h / 2, w, h); }
      });
      velArrow(ctx, V, it);
    }
  });

  def("weight", {
    cat: "mech", name: "砝碼", desc: "掛在彈簧、細繩、滑輪上",
    params: [{ k: "m", label: "質量", kind: "select", def: 0.1, options: [[0.02, "20 g"], [0.05, "50 g"], [0.1, "100 g"], [0.2, "200 g"], [0.5, "500 g"], [1, "1 kg"]] }, P.mu(0.4), P.e(0.1)],
    size: it => { const s = wSize(it.p.m); return { w: s.w, h: s.h }; },
    body: it => { const s = wSize(it.p.m); return { shape: "poly", verts: box(s.w, s.h), m: Number(it.p.m), mu: it.p.mu, e: it.p.e }; },
    draw(ctx, it, V) {
      const s = wSize(it.p.m), w = s.w * V.s, h = s.h * V.s;
      const lab = Number(it.p.m) >= 1 ? Number(it.p.m) + " kg" : Math.round(Number(it.p.m) * 1000) + " g";
      withRot(ctx, V, it, () => {
        if (AP()) AP().weight(ctx, 0, -h / 2, w, h, w > 26 ? lab : "");
        else { ctx.fillStyle = "#6b7484"; ctx.fillRect(-w / 2, -h / 2, w, h); }
      });
      if (w <= 26) text(ctx, lab, V.X(it.x) + w / 2 + 16, V.Y(it.y), { size: 11 });
    }
  });
  function wSize(m) { m = Number(m) || 0.1; const s = Math.cbrt(m / 0.1); return { w: 6 * s + 2, h: 7 * s + 1 }; }
  function box(w, h) { return [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }]; }

  def("ramp", {
    cat: "mech", name: "斜面", desc: "固定斜面，可調角度與摩擦",
    params: [{ k: "len", label: "底長", min: 20, max: 300, step: 1, unit: "cm", def: 100 }, { k: "ang", label: "傾角 θ", min: 3, max: 70, step: 0.5, unit: "°", def: 30 },
      P.mu(0.3), { k: "flip", label: "左高右低", kind: "toggle", def: false }],
    fixed: true,
    verts(it) {
      const L = it.p.len, H = L * Math.tan(it.p.ang * DEG);
      // 以外接框中心為原點
      return it.p.flip ? [{ x: -L / 2, y: H / 2 }, { x: L / 2, y: H / 2 }, { x: -L / 2, y: -H / 2 }]
        : [{ x: -L / 2, y: H / 2 }, { x: L / 2, y: H / 2 }, { x: L / 2, y: -H / 2 }];
    },
    size: it => ({ w: it.p.len, h: it.p.len * Math.tan(it.p.ang * DEG) }),
    hit(it, x, y) { return inPoly(T.ramp.verts(it).map(v => local(it, v.x, v.y)), x, y); },
    body: it => ({ shape: "poly", verts: T.ramp.verts(it), isStatic: true, mu: it.p.mu, e: 0.1 }),
    draw(ctx, it, V) {
      const P2 = T.ramp.verts(it).map(v => { const w = local(it, v.x, v.y); return { x: V.X(w.x), y: V.Y(w.y) }; });
      ctx.save();
      ctx.beginPath(); P2.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
      const g = ctx.createLinearGradient(0, Math.min(...P2.map(p => p.y)), 0, Math.max(...P2.map(p => p.y)));
      g.addColorStop(0, isLight() ? "#d9c3a0" : "#8a6c48"); g.addColorStop(1, isLight() ? "#b8946a" : "#5c4630");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = isLight() ? "rgba(90,60,30,0.7)" : "rgba(240,210,170,0.55)"; ctx.lineWidth = 1.5; ctx.stroke();
      // 斜邊加粗：接觸面
      const hyp = it.p.flip ? [P2[2], P2[1]] : [P2[0], P2[2]];
      ctx.strokeStyle = isLight() ? "#5b4026" : "#e9cfa8"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(hyp[0].x, hyp[0].y); ctx.lineTo(hyp[1].x, hyp[1].y); ctx.stroke();
      // 角度標記
      const c0 = it.p.flip ? P2[1] : P2[0], r = 22;
      const base = it.p.flip ? Math.PI : 0, up = it.p.flip ? Math.PI + it.p.ang * DEG : -it.p.ang * DEG;
      ctx.strokeStyle = ink(0.6); ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.arc(c0.x, c0.y, r, Math.min(base + (it.a || 0), up + (it.a || 0)), Math.max(base + (it.a || 0), up + (it.a || 0))); ctx.stroke();
      ctx.restore();
      const la = (base + up) / 2 + (it.a || 0);
      text(ctx, "θ = " + fmt(it.p.ang, 1) + "°", c0.x + Math.cos(la) * (r + 24), c0.y + Math.sin(la) * (r + 10) - 2, { size: 11 });
      if (V.detail) text(ctx, "μ = " + fmt(it.p.mu, 2), (P2[0].x + P2[1].x) / 2, (P2[0].y + P2[1].y) / 2 - 10, { size: 10.5, color: ink(0.7) });
    }
  });
  function inPoly(P2, x, y) {
    let c = false;
    for (let i = 0, j = P2.length - 1; i < P2.length; j = i++) {
      if ((P2[i].y > y) !== (P2[j].y > y) && x < (P2[j].x - P2[i].x) * (y - P2[i].y) / (P2[j].y - P2[i].y) + P2[i].x) c = !c;
    }
    return c;
  }

  def("plank", {
    cat: "mech", name: "木板／牆", desc: "固定平台、牆或可旋轉的斜板",
    params: [{ k: "w", label: "長", min: 10, max: 400, step: 1, unit: "cm", def: 80 }, { k: "h", label: "厚", min: 2, max: 40, step: 1, unit: "cm", def: 4 }, P.mu(0.3), P.e(0.2), P.rot()],
    fixed: true,
    size: it => ({ w: it.p.w, h: it.p.h }),
    body: it => ({ shape: "poly", verts: box(it.p.w, it.p.h), isStatic: true, mu: it.p.mu, e: it.p.e }),
    draw(ctx, it, V) {
      const w = it.p.w * V.s, h = it.p.h * V.s;
      withRot(ctx, V, it, () => {
        const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        g.addColorStop(0, isLight() ? "#9aa6b6" : "#6f7b8c"); g.addColorStop(1, isLight() ? "#6e7a8a" : "#3e4756");
        rr(ctx, -w / 2, -h / 2, w, h, Math.min(3, h / 2)); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "rgba(20,28,40,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h / 2 + 1.2); ctx.lineTo(w / 2 - 2, -h / 2 + 1.2); ctx.stroke();
      });
    }
  });

  def("hook", {
    cat: "mech", name: "吊鉤", desc: "固定點：彈簧、細繩的端點可以接在這裡",
    params: [],
    fixed: true, anchor: true,
    size: () => ({ w: 14, h: 8 }),
    draw(ctx, it, V) {
      const x = V.X(it.x), y = V.Y(it.y), w = Math.max(30, 14 * V.s);
      ctx.save();
      const g = ctx.createLinearGradient(0, y - 14, 0, y - 4);
      g.addColorStop(0, "#9aa4b4"); g.addColorStop(1, "#5d6676");
      rr(ctx, x - w / 2, y - 14, w, 9, 2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = ink(0.35); ctx.lineWidth = 1;
      for (let i = -w / 2 + 3; i < w / 2; i += 6) { ctx.beginPath(); ctx.moveTo(x + i, y - 14); ctx.lineTo(x + i + 5, y - 19); ctx.stroke(); }
      ctx.strokeStyle = "#8c96a6"; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y - 1); ctx.stroke();
      ctx.fillStyle = "#c69448"; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }
  });

  /* ---------- 連接件 ---------- */
  function springPath(ctx, x1, y1, x2, y2, coils, amp) {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    const lead = Math.min(8, L * 0.12), body = L - lead * 2, n = coils * 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
    for (let i = 1; i <= n; i++) {
      const t = lead + body * (i - 0.5) / n, s = i % 2 ? amp : -amp;
      ctx.lineTo(x1 + ux * t + nx * s, y1 + uy * t + ny * s);
    }
    ctx.lineTo(x2 - ux * lead, y2 - uy * lead); ctx.lineTo(x2, y2);
  }
  const twoEnds = (len, vertical) => it => vertical
    ? [{ x: it.x, y: it.y - len / 2, at: null }, { x: it.x, y: it.y + len / 2, at: null }]
    : [{ x: it.x - len / 2, y: it.y, at: null }, { x: it.x + len / 2, y: it.y, at: null }];

  def("spring", {
    cat: "mech", name: "彈簧", desc: "虎克定律：兩端拖到物體或吊鉤上接住",
    params: [{ k: "k", label: "彈性常數 k", min: 1, max: 500, step: 1, unit: "N/m", def: 20 },
      { k: "L0", label: "自然長度", min: 2, max: 150, step: 1, unit: "cm", def: 20 },
      { k: "c", label: "阻尼", min: 0, max: 2, step: 0.01, unit: "N·s/m", def: 0.02 }],
    connector: true, makeEnds: twoEnds(24, true),
    draw(ctx, it, V, E) {
      const a = E[0], b = E[1], x1 = V.X(a.x), y1 = V.Y(a.y), x2 = V.X(b.x), y2 = V.Y(b.y);
      const L = Math.hypot(b.x - a.x, b.y - a.y), stretch = (L - it.p.L0) / Math.max(1, it.p.L0);
      ctx.save();
      ctx.strokeStyle = stretch > 0.02 ? "#d9822b" : stretch < -0.02 ? "#2f7de1" : (isLight() ? "#5b6676" : "#b8c2d0");
      ctx.lineWidth = 2.2; ctx.lineJoin = "round";
      springPath(ctx, x1, y1, x2, y2, 11, Math.max(4, Math.min(9, 3.2 * V.s))); ctx.stroke();
      ctx.restore();
      if (V.detail || V.selected) {
        const F = it.rt && it.rt.force != null ? it.rt.force / 100 : it.p.k * (L - it.p.L0) / 100;
        chip(ctx, "k=" + it.p.k + " · F=" + fmt(F, 2) + " N", (x1 + x2) / 2 + 46, (y1 + y2) / 2, { size: 10.5 });
      }
    }
  });

  def("rope", {
    cat: "mech", name: "細繩", desc: "不可伸長、只能拉不能推；做單擺、吊掛",
    params: [],
    connector: true, makeEnds: twoEnds(40, true),
    draw(ctx, it, V, E) {
      const a = E[0], b = E[1];
      const L = it.rt && it.rt.L || Math.hypot(b.x - a.x, b.y - a.y);
      const slack = Math.max(0, L - Math.hypot(b.x - a.x, b.y - a.y));
      ctx.save(); ctx.strokeStyle = isLight() ? "#6b5a3e" : "#d8c8a6"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(V.X(a.x), V.Y(a.y));
      if (slack > 0.5) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + slack * 0.6;
        ctx.quadraticCurveTo(V.X(mx), V.Y(my), V.X(b.x), V.Y(b.y));
      } else ctx.lineTo(V.X(b.x), V.Y(b.y));
      ctx.stroke(); ctx.restore();
      if ((V.detail || V.selected) && it.rt && it.rt.tension != null && V.status !== "edit") {
        chip(ctx, "T=" + fmt(it.rt.tension / 100, 2) + " N", V.X((a.x + b.x) / 2) + 34, V.Y((a.y + b.y) / 2), { size: 10.5 });
      }
    }
  });

  def("pulley", {
    cat: "mech", name: "定滑輪", desc: "繩的兩端各自拖到物體上：阿特午機",
    params: [{ k: "r", label: "輪半徑", min: 2, max: 20, step: 0.5, unit: "cm", def: 6 }],
    fixed: true, connector: true, ownBody: true,
    size: it => ({ w: it.p.r * 2 + 4, h: it.p.r * 2 + 4 }),
    hit: (it, x, y) => Math.hypot(x - it.x, y - it.y) <= it.p.r + 2,
    makeEnds: it => [{ x: it.x - it.p.r, y: it.y + 40, at: null }, { x: it.x + it.p.r, y: it.y + 40, at: null }],
    draw(ctx, it, V, E) {
      const x = V.X(it.x), y = V.Y(it.y), r = it.p.r * V.s;
      ctx.save(); ctx.strokeStyle = isLight() ? "#6b5a3e" : "#d8c8a6"; ctx.lineWidth = 1.8;
      [[-1, E[0]], [1, E[1]]].forEach(([s, e]) => { ctx.beginPath(); ctx.moveTo(x + s * r, y); ctx.lineTo(V.X(e.x), V.Y(e.y)); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(x, y, r, Math.PI, TAU); ctx.stroke();
      ctx.restore();
      // 支架
      ctx.save(); ctx.strokeStyle = "#7d8796"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - r - 14); ctx.stroke();
      ctx.fillStyle = "#5d6676"; rr(ctx, x - 14, y - r - 20, 28, 7, 2); ctx.fill(); ctx.restore();
      if (AP()) AP().pulley(ctx, x, y, r); else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = "#aab4c2"; ctx.fill(); }
      const ang = (it.rt && it.rt.spin) || 0;
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * r * 0.75, y + Math.sin(ang) * r * 0.75); ctx.stroke(); ctx.restore();
      if ((V.detail || V.selected) && it.rt && it.rt.tension != null && V.status !== "edit") chip(ctx, "T=" + fmt(it.rt.tension / 100, 2) + " N", x, y - r - 32, { size: 10.5 });
    }
  });

  def("force", {
    cat: "mech", name: "定力", desc: "把箭頭尾端拖到物體上，持續施加固定的力",
    params: [{ k: "F", label: "力的大小", min: 0, max: 20, step: 0.1, unit: "N", def: 1 }, { k: "dir", label: "方向（仰角）", min: -180, max: 180, step: 1, unit: "°", def: 0 }],
    connector: true, single: true,
    makeEnds: it => [{ x: it.x, y: it.y, at: null }],
    draw(ctx, it, V, E) {
      const e = E[0], x = V.X(e.x), y = V.Y(e.y), a = it.p.dir * DEG, L = 34 + Math.min(80, it.p.F * 10);
      arrow(ctx, x, y, x + Math.cos(a) * L, y - Math.sin(a) * L, "#d6453d", 3);
      ctx.save(); ctx.fillStyle = "#d6453d"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); ctx.restore();
      text(ctx, "F = " + fmt(it.p.F, 1) + " N", x + Math.cos(a) * (L + 26), y - Math.sin(a) * (L + 12), { size: 11, color: "#d6453d" });
      if (!e.at) text(ctx, "拖到物體上", x, y + 16, { size: 10.5, color: ink(0.6) });
    }
  });

  /* =======================================================================
     電學：接線柱在局部座標 (±w/2, 0)，可 90° 旋轉
     ======================================================================= */
  const twoTerms = w => () => [{ x: -w / 2, y: 0 }, { x: w / 2, y: 0 }];
  function termDot(ctx, x, y, plus) {
    ctx.save();
    ctx.fillStyle = plus === true ? "#c43e34" : plus === false ? "#2a3038" : "#b08a3e";
    ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e7c27a"; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  const rot90 = { k: "rot", label: "方向", kind: "select", def: 0, rotation: true, options: [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]] };

  def("battery", {
    cat: "elec", name: "電池", desc: "電動勢 E、內電阻 r；紅色為正極",
    params: [{ k: "E", label: "電動勢 E", min: 0.5, max: 24, step: 0.5, unit: "V", def: 3 }, { k: "r", label: "內電阻 r", min: 0.05, max: 10, step: 0.05, unit: "Ω", def: 0.5 }, rot90],
    size: () => ({ w: 22, h: 12 }), terms: twoTerms(22), circuit: it => ({ kind: "battery", E: it.p.E, r: it.p.r }),
    draw(ctx, it, V) {
      const w = 22 * V.s, h = 12 * V.s;
      withRot(ctx, V, it, () => { if (AP()) AP().battery(ctx, -w / 2 + 4, -h / 2, w - 8, h); });
      const rt = it.rt || {};
      if (rt.short) {
        ctx.save(); ctx.strokeStyle = "rgba(230,60,40," + (0.5 + 0.5 * Math.sin(V.t * 12)) + ")"; ctx.lineWidth = 3;
        rr(ctx, V.X(it.x) - w / 2 - 4, V.Y(it.y) - h / 2 - 4, w + 8, h + 8, 6); ctx.stroke(); ctx.restore();
        text(ctx, "短路！電流 " + fmt(rt.I, 1) + " A", V.X(it.x), V.Y(it.y) - h / 2 - 14, { size: 11.5, color: "#e5483b", weight: "800" });
      } else text(ctx, fmt(it.p.E, 1) + " V", V.X(it.x), V.Y(it.y) + h / 2 + 11, { size: 11 });
    }
  });

  def("bulb", {
    cat: "elec", name: "小燈泡", desc: "電阻 R；功率越大越亮，過載會燒斷",
    params: [{ k: "R", label: "電阻 R", min: 1, max: 100, step: 0.5, unit: "Ω", def: 10 }, { k: "Pr", label: "額定功率", min: 0.2, max: 10, step: 0.1, unit: "W", def: 1.2 }, rot90],
    size: () => ({ w: 18, h: 18 }), terms: () => [{ x: -9, y: 5 }, { x: 9, y: 5 }],
    circuit: it => (it.rt && it.rt.burnt ? { kind: "open" } : { kind: "resistor", R: it.p.R }),
    draw(ctx, it, V) {
      const rt = it.rt || {}, P = rt.P || 0, b = rt.burnt ? 0 : Math.max(0, Math.min(1, P / it.p.Pr));
      withRot(ctx, V, it, () => {
        const s = V.s;
        ctx.save(); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9 * s, 5 * s); ctx.lineTo(-2.5 * s, 5 * s); ctx.lineTo(-2.5 * s, 2 * s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9 * s, 5 * s); ctx.lineTo(2.5 * s, 5 * s); ctx.lineTo(2.5 * s, 2 * s); ctx.stroke();
        ctx.restore();
        if (AP()) AP().bulb(ctx, 0, -2 * s, 5.5 * s, b);
        if (rt.burnt) { ctx.save(); ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3 * s, -5 * s); ctx.lineTo(3 * s, 1 * s); ctx.moveTo(3 * s, -5 * s); ctx.lineTo(-3 * s, 1 * s); ctx.stroke(); ctx.restore(); }
      });
      if (b > 0.03) {
        ctx.save(); const x = V.X(it.x), y = V.Y(it.y) - 2 * V.s;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * V.s * (0.4 + b));
        g.addColorStop(0, `rgba(255,214,120,${0.35 * b})`); g.addColorStop(1, "rgba(255,214,120,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40 * V.s * (0.4 + b), 0, TAU); ctx.fill(); ctx.restore();
      }
      if (rt.burnt) text(ctx, "燒斷了", V.X(it.x), V.Y(it.y) + 14 * V.s, { size: 11, color: "#e5483b", weight: "800" });
      else if (V.detail || V.selected) text(ctx, fmt(it.p.R, 1) + " Ω", V.X(it.x), V.Y(it.y) + 13 * V.s, { size: 10.5, color: ink(0.75) });
    }
  });

  def("resistor", {
    cat: "elec", name: "電阻", desc: "定值電阻 R",
    params: [{ k: "R", label: "電阻 R", min: 0.5, max: 1000, step: 0.5, unit: "Ω", def: 10 }, rot90],
    size: () => ({ w: 24, h: 8 }), terms: twoTerms(24), circuit: it => ({ kind: "resistor", R: it.p.R }),
    draw(ctx, it, V) {
      withRot(ctx, V, it, () => {
        const s = V.s; ctx.save(); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-12 * s, 0); ctx.lineTo(-7 * s, 0); ctx.moveTo(7 * s, 0); ctx.lineTo(12 * s, 0); ctx.stroke(); ctx.restore();
        if (AP()) AP().resistorBox(ctx, 0, 0, 14 * s, "", false);
      });
      text(ctx, fmt(it.p.R, it.p.R < 10 ? 1 : 0) + " Ω", V.X(it.x), V.Y(it.y) + 5 * V.s + 10, { size: 11 });
    }
  });

  def("rheostat", {
    cat: "elec", name: "可變電阻", desc: "滑動變阻器：拉動滑片改變 R",
    params: [{ k: "Rmax", label: "最大電阻", min: 5, max: 200, step: 1, unit: "Ω", def: 50 }, { k: "frac", label: "滑片位置", min: 0.02, max: 1, step: 0.01, unit: "", def: 0.5 }, rot90],
    size: () => ({ w: 30, h: 10 }), terms: twoTerms(30), circuit: it => ({ kind: "resistor", R: it.p.Rmax * it.p.frac }),
    draw(ctx, it, V) {
      withRot(ctx, V, it, () => {
        const s = V.s; ctx.save(); ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-15 * s, 0); ctx.lineTo(-10 * s, 0); ctx.moveTo(10 * s, 0); ctx.lineTo(15 * s, 0); ctx.stroke();
        // 線圈
        const g = ctx.createLinearGradient(0, -3 * s, 0, 3 * s); g.addColorStop(0, "#c9a46a"); g.addColorStop(1, "#7a5a2c");
        rr(ctx, -10 * s, -2.6 * s, 20 * s, 5.2 * s, 2 * s); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "rgba(60,40,10,0.5)"; ctx.lineWidth = 1;
        for (let x = -9.5; x < 10; x += 1.1) { ctx.beginPath(); ctx.moveTo(x * s, -2.6 * s); ctx.lineTo((x + 0.6) * s, 2.6 * s); ctx.stroke(); }
        // 滑片
        const sx = (-10 + 20 * it.p.frac) * s;
        ctx.fillStyle = "#3a4250"; rr(ctx, sx - 2 * s, -5.5 * s, 4 * s, 3.4 * s, 1); ctx.fill();
        ctx.restore();
      });
      text(ctx, fmt(it.p.Rmax * it.p.frac, 1) + " Ω", V.X(it.x), V.Y(it.y) + 6 * V.s + 10, { size: 11 });
    }
  });

  def("switch", {
    cat: "elec", name: "開關", desc: "點一下切換開／關",
    params: [{ k: "closed", label: "閉合", kind: "toggle", def: true }, rot90],
    size: () => ({ w: 22, h: 10 }), terms: twoTerms(22), circuit: it => ({ kind: "switch", closed: !!it.p.closed }),
    clickToggle: "closed",
    draw(ctx, it, V) {
      withRot(ctx, V, it, () => {
        const s = V.s;
        if (AP()) AP().knifeSwitch(ctx, 0, 3 * s, 22 * s, it.p.closed ? 0 : 1);
      });
      text(ctx, it.p.closed ? "閉合" : "斷開", V.X(it.x), V.Y(it.y) + 5 * V.s + 12, { size: 10.5, color: it.p.closed ? accent() : "#d6453d", weight: "700" });
    }
  });

  function meterItem(type, name, desc, letter, kind, ranges, def0) {
    def(type, {
      cat: "elec", name, desc,
      params: [{ k: "range", label: "量程", kind: "select", def: def0, options: ranges.map(v => [v, v + " " + letter]) }, rot90],
      size: () => ({ w: 20, h: 20 }), terms: () => [{ x: -9, y: 7 }, { x: 9, y: 7 }], circuit: () => ({ kind }),
      draw(ctx, it, V) {
        const rt = it.rt || {}, val = kind === "ammeter" ? rt.I || 0 : rt.V || 0;
        const range = Number(it.p.range), over = Math.abs(val) > range * 1.02;
        withRot(ctx, V, it, () => {
          const s = V.s;
          if (AP()) AP().meter(ctx, 0, -1 * s, 8.5 * s, Math.max(-0.08, Math.min(1.05, val / range)), letter);
        });
        const x = V.X(it.x), y = V.Y(it.y);
        chip(ctx, (over ? "超過量程 " : "") + fmt(val, Math.abs(val) < 10 ? 3 : 2) + " " + letter, x, y + 11 * V.s + 8, { size: 11, color: over ? "#e5483b" : ink() });
        if (val < -1e-6 * range) text(ctx, "接反了（指針反偏）", x, y - 11 * V.s - 6, { size: 10.5, color: "#e5483b" });
      }
    });
  }
  meterItem("ammeter", "安培計", "串聯量電流（內阻 0.01 Ω）", "A", "ammeter", [0.6, 3, 10], 3);
  meterItem("voltmeter", "伏特計", "並聯量電壓（內阻 10 MΩ）", "V", "voltmeter", [3, 15, 30], 15);

  /* =======================================================================
     光學：元件以局部 y 軸為鏡面方向（角度 0 時鏡面直立）
     ======================================================================= */
  function lensEl(it, f, kind) {
    const tx = -Math.sin(it.a || 0), ty = Math.cos(it.a || 0);
    return { id: it.id, kind, cx: it.x, cy: it.y, tx, ty, half: it.p.h / 2, f };
  }
  function opticAxis(ctx, V, it, f) {
    if (!(V.detail || V.selected) || !isFinite(f)) return;
    const c = Math.cos(it.a || 0), s = Math.sin(it.a || 0);
    ctx.save(); ctx.strokeStyle = ink(0.25); ctx.setLineDash([4, 5]); ctx.lineWidth = 1;
    const L = Math.max(80, Math.abs(f) * 2.4);
    ctx.beginPath(); ctx.moveTo(V.X(it.x - c * L), V.Y(it.y - s * L)); ctx.lineTo(V.X(it.x + c * L), V.Y(it.y + s * L)); ctx.stroke();
    ctx.setLineDash([]);
    [-1, 1].forEach(k => {
      const fx = V.X(it.x + c * f * k), fy = V.Y(it.y + s * f * k);
      ctx.fillStyle = accent(); ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, TAU); ctx.fill();
      text(ctx, "F", fx, fy - 10, { size: 10.5, color: accent(), weight: "800" });
    });
    ctx.restore();
  }
  const hParam = def0 => ({ k: "h", label: "口徑", min: 10, max: 120, step: 1, unit: "cm", def: def0 });
  const fParam = def0 => ({ k: "f", label: "焦距 f", min: 5, max: 150, step: 1, unit: "cm", def: def0 });

  function sourceRays(it, local0, dirA, color) {
    const out = [], nms = color === "white" ? [0] : [COLORS[color] || 650];
    local0.forEach(p => {
      const w = local(it, p.x, p.y);
      const a = (it.a || 0) + (p.da || 0);
      nms.forEach(nm => out.push({ x: w.x, y: w.y, dx: Math.cos(a), dy: Math.sin(a), nm, I: 1, id: it.id }));
    });
    return out;
  }

  def("laser", {
    cat: "optics", name: "雷射筆", desc: "單條光線；白光會在稜鏡中色散",
    params: [P.color(), P.rot()],
    size: () => ({ w: 22, h: 5 }),
    source: it => sourceRays(it, [{ x: 11, y: 0 }], 0, it.p.color),
    draw(ctx, it, V) {
      withRot(ctx, V, it, () => { if (AP()) AP().laser(ctx, 11 * V.s, 0, 0, { len: 22 * V.s }); });
      const tip = local(it, 11, 0);
      ctx.save(); ctx.fillStyle = it.p.color === "white" ? "#fff" : nmCss(COLORS[it.p.color] || 650, 1);
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(V.X(tip.x), V.Y(tip.y), 2.6, 0, TAU); ctx.fill(); ctx.restore();
    }
  });

  def("beam", {
    cat: "optics", name: "平行光源", desc: "一束平行光：找焦點最方便",
    params: [{ k: "width", label: "光束寬", min: 4, max: 80, step: 1, unit: "cm", def: 24 }, { k: "n", label: "光線數", min: 2, max: 15, step: 1, unit: "條", def: 7 }, P.color(), P.rot()],
    size: it => ({ w: 12, h: it.p.width + 6 }),
    source(it) {
      const pts = [];
      for (let i = 0; i < it.p.n; i++) pts.push({ x: 6, y: -it.p.width / 2 + it.p.width * (it.p.n > 1 ? i / (it.p.n - 1) : 0.5) });
      return sourceRays(it, pts, 0, it.p.color);
    },
    draw(ctx, it, V) {
      const w = 12 * V.s, h = (it.p.width + 6) * V.s;
      withRot(ctx, V, it, () => {
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, "#3a4250"); g.addColorStop(1, "#5d6676");
        rr(ctx, -w / 2, -h / 2, w, h, 4); ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = it.p.color === "white" ? "rgba(255,250,230,0.9)" : nmCss(COLORS[it.p.color] || 650, 0.85);
        ctx.fillRect(w / 2 - 3, -h / 2 + 3, 3, h - 6);
      });
    }
  });

  def("point", {
    cat: "optics", name: "點光源", desc: "向四周發散的光線",
    params: [{ k: "n", label: "光線數", min: 3, max: 48, step: 1, unit: "條", def: 16 }, { k: "spread", label: "張角", min: 10, max: 360, step: 5, unit: "°", def: 60 }, P.color(), P.rot()],
    size: () => ({ w: 8, h: 8 }),
    hit: (it, x, y) => Math.hypot(x - it.x, y - it.y) <= 5,
    source(it) {
      const pts = [], n = it.p.n, sp = it.p.spread * DEG, full = it.p.spread >= 359;
      for (let i = 0; i < n; i++) {
        const f = full ? i / n : (n > 1 ? i / (n - 1) : 0.5);
        pts.push({ x: 0, y: 0, da: full ? f * TAU : -sp / 2 + sp * f });
      }
      return sourceRays(it, pts, 0, it.p.color);
    },
    draw(ctx, it, V) {
      const x = V.X(it.x), y = V.Y(it.y);
      const c = it.p.color === "white" ? "rgba(255,246,214," : (nmCss(COLORS[it.p.color] || 650, 1).replace(/rgba?\(([^)]+)\)/, (m, inner) => "rgba(" + inner.split(",").slice(0, 3).join(",") + ","));
      ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
      g.addColorStop(0, c + "1)"); g.addColorStop(1, c + "0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); ctx.restore();
    }
  });

  function lensType(type, name, desc, convex) {
    def(type, {
      cat: "optics", name, desc,
      params: [fParam(30), hParam(40), P.rot()],
      size: it => ({ w: 6, h: it.p.h }),
      optic: it => lensEl(it, convex ? it.p.f : -it.p.f, "lens"),
      draw(ctx, it, V) {
        opticAxis(ctx, V, it, it.p.f);
        withRot(ctx, V, it, () => { if (AP()) AP().lens(ctx, 0, 0, it.p.h / 2 * V.s, convex); });
        if (V.detail || V.selected) text(ctx, "f = " + (convex ? "" : "−") + it.p.f + " cm", V.X(it.x), V.Y(it.y) - it.p.h / 2 * V.s - 12, { size: 11 });
      }
    });
  }
  lensType("convex", "凸透鏡", "會聚：平行光聚於焦點", true);
  lensType("concave", "凹透鏡", "發散：光線像從焦點射出", false);

  function mirrorType(type, name, desc, kind) {
    def(type, {
      cat: "optics", name, desc,
      params: (kind === "plane" ? [] : [fParam(30)]).concat([hParam(40), P.rot()]),
      size: it => ({ w: 5, h: it.p.h }),
      optic: it => lensEl(it, kind === "plane" ? Infinity : kind === "concave" ? it.p.f : -it.p.f, "mirror"),
      draw(ctx, it, V) {
        if (kind !== "plane") opticAxis(ctx, V, it, it.p.f);
        withRot(ctx, V, it, () => {
          const half = it.p.h / 2 * V.s;
          if (kind === "plane") {
            ctx.save(); ctx.fillStyle = "#6b7484"; ctx.fillRect(1, -half, 4, half * 2);
            const g = ctx.createLinearGradient(0, -half, 0, half); g.addColorStop(0, "#e8f2fb"); g.addColorStop(0.5, "#a9c3da"); g.addColorStop(1, "#e8f2fb");
            ctx.fillStyle = g; ctx.fillRect(-1.5, -half, 3, half * 2);
            ctx.strokeStyle = "rgba(60,70,84,0.6)"; ctx.lineWidth = 1;
            for (let y = -half + 5; y < half; y += 7) { ctx.beginPath(); ctx.moveTo(5, y); ctx.lineTo(9, y - 4); ctx.stroke(); }
            ctx.restore();
          } else if (AP()) {
            // 曲率半徑 R = 2f；畫的弧度只是示意（光學計算用理想面鏡）
            AP().curvedMirror(ctx, 0, 0, half, Math.max(half * 1.2, 2 * it.p.f * V.s), kind === "concave");
          }
        });
        if ((V.detail || V.selected) && kind !== "plane") text(ctx, "f = " + it.p.f + " cm", V.X(it.x), V.Y(it.y) - it.p.h / 2 * V.s - 12, { size: 11 });
      }
    });
  }
  mirrorType("mirror", "平面鏡", "反射角等於入射角", "plane");
  mirrorType("cmirror", "凹面鏡", "會聚反射：平行光聚於焦點", "concave");
  mirrorType("vmirror", "凸面鏡", "發散反射：照後鏡的視野", "convex");

  function glassDraw(ctx, V, poly, it) {
    ctx.save();
    ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(V.X(p.x), V.Y(p.y)) : ctx.moveTo(V.X(p.x), V.Y(p.y))); ctx.closePath();
    const xs = poly.map(p => V.X(p.x)), ys = poly.map(p => V.Y(p.y));
    const g = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
    g.addColorStop(0, "rgba(190,226,246,0.55)"); g.addColorStop(0.5, "rgba(236,248,255,0.28)"); g.addColorStop(1, "rgba(160,206,232,0.55)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = isLight() ? "rgba(60,110,150,0.85)" : "rgba(210,236,250,0.85)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    if (V.detail || V.selected) {
      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length, cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
      text(ctx, "n = " + fmt(it.p.n, 2), V.X(cx), V.Y(cy), { size: 10.5, color: ink(0.8) });
    }
  }
  const nParam = () => ({ k: "n", label: "折射率 n", min: 1.0, max: 2.5, step: 0.01, unit: "", def: 1.5 });
  function glassType(type, name, desc, params, polyFn, sizeFn) {
    def(type, {
      cat: "optics", name, desc, params: params.concat([nParam(), P.rot()]),
      size: sizeFn, polyLocal: polyFn,
      hit(it, x, y) { return inPoly(polyFn(it).map(p => local(it, p.x, p.y)), x, y); },
      optic: it => ({ id: it.id, kind: "glass", n: it.p.n, poly: polyFn(it).map(p => local(it, p.x, p.y)) }),
      draw(ctx, it, V) { glassDraw(ctx, V, polyFn(it).map(p => local(it, p.x, p.y)), it); }
    });
  }
  glassType("prism", "三稜鏡", "折射兩次；白光分成彩虹", [{ k: "side", label: "邊長", min: 10, max: 80, step: 1, unit: "cm", def: 30 }],
    it => { const s = it.p.side, h = s * Math.sqrt(3) / 2; return [{ x: 0, y: -h * 2 / 3 }, { x: s / 2, y: h / 3 }, { x: -s / 2, y: h / 3 }]; },
    it => ({ w: it.p.side, h: it.p.side * Math.sqrt(3) / 2 }));
  glassType("slab", "玻璃磚", "平行板：出射光平行於入射光、側移",
    [{ k: "w", label: "寬", min: 5, max: 100, step: 1, unit: "cm", def: 30 }, { k: "h", label: "高", min: 5, max: 100, step: 1, unit: "cm", def: 20 }],
    it => box(it.p.w, it.p.h), it => ({ w: it.p.w, h: it.p.h }));
  glassType("semi", "半圓玻璃磚", "從圓弧射向圓心：看臨界角與全反射", [{ k: "r", label: "半徑", min: 8, max: 60, step: 1, unit: "cm", def: 20 }],
    it => { const r = it.p.r, out = [{ x: -r, y: 0 }]; for (let i = 1; i < 40; i++) { const a = Math.PI + Math.PI * i / 40; out.push({ x: r * Math.cos(a), y: r * Math.sin(a) + 0 }); } out.push({ x: r, y: 0 }); return out.map(p => ({ x: p.x, y: p.y + r / 2 })); },
    it => ({ w: it.p.r * 2, h: it.p.r }));

  def("screen", {
    cat: "optics", name: "屏幕", desc: "接收光點：找成像位置",
    params: [{ k: "h", label: "高度", min: 10, max: 150, step: 1, unit: "cm", def: 50 }, P.rot()],
    size: it => ({ w: 4, h: it.p.h }),
    optic: it => lensEl(it, 0, "block"),
    draw(ctx, it, V) {
      withRot(ctx, V, it, () => {
        const h = it.p.h * V.s;
        ctx.save(); ctx.fillStyle = "#3e4756"; ctx.fillRect(1.5, -h / 2, 4, h);
        ctx.fillStyle = isLight() ? "#f7f4ec" : "#e9e4d6"; ctx.fillRect(-2, -h / 2, 3.5, h); ctx.restore();
      });
      (it.rt && it.rt.hits || []).forEach(hp => {
        ctx.save(); const x = V.X(hp.x), y = V.Y(hp.y);
        ctx.fillStyle = nmCss(hp.nm || 650, Math.min(1, 0.4 + hp.I));
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); ctx.restore();
      });
    }
  });

  /* =======================================================================
     量測工具
     ======================================================================= */
  def("ruler", {
    cat: "tool", name: "尺", desc: "拖兩端量距離（cm）",
    params: [], connector: true, tool: true, freeEnds: true,
    makeEnds: it => [{ x: it.x - 25, y: it.y, at: null }, { x: it.x + 25, y: it.y, at: null }],
    draw(ctx, it, V, E) {
      const a = E[0], b = E[1], L = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save(); ctx.translate(V.X(a.x), V.Y(a.y)); ctx.rotate(ang);
      const len = L * V.s, h = 16;
      rr(ctx, 0, -h, len, h, 2); ctx.fillStyle = isLight() ? "rgba(250,232,160,0.92)" : "rgba(214,190,110,0.9)"; ctx.fill();
      ctx.strokeStyle = "rgba(90,70,20,0.7)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = "rgba(60,44,10,0.85)";
      const step = V.s >= 4 ? 1 : V.s >= 1.5 ? 2 : 5;
      for (let c = 0; c <= L + 1e-6; c += step) {
        const major = c % 10 === 0, mid = c % 5 === 0;
        ctx.beginPath(); ctx.moveTo(c * V.s, 0); ctx.lineTo(c * V.s, -(major ? 9 : mid ? 6 : 3.5)); ctx.stroke();
        if (major && c > 0 && (V.s >= 1.2 || c % 50 === 0)) { ctx.fillStyle = "rgba(60,44,10,0.9)"; ctx.font = "600 8.5px system-ui"; ctx.textAlign = "center"; ctx.fillText(String(c), c * V.s, -10.5); }
      }
      ctx.restore();
      chip(ctx, fmt(L, 1) + " cm", V.X((a.x + b.x) / 2) - Math.sin(ang) * 26, V.Y((a.y + b.y) / 2) + Math.cos(ang) * 26 - 0, { size: 11.5 });
    }
  });

  def("protractor", {
    cat: "tool", name: "量角器", desc: "拖中心與兩支量角臂量角度",
    params: [], connector: true, tool: true, freeEnds: true, ownBody: true,
    size: () => ({ w: 10, h: 10 }),
    hit: (it, x, y) => Math.hypot(x - it.x, y - it.y) <= 6,
    makeEnds: it => [{ x: it.x + 30, y: it.y, at: null }, { x: it.x + 26, y: it.y - 15, at: null }],
    draw(ctx, it, V, E) {
      const x = V.X(it.x), y = V.Y(it.y), r = 54;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, Math.PI, TAU); ctx.closePath();
      ctx.fillStyle = isLight() ? "rgba(120,180,220,0.18)" : "rgba(120,180,220,0.16)"; ctx.fill();
      ctx.strokeStyle = ink(0.45); ctx.lineWidth = 1; ctx.stroke();
      for (let d = 0; d <= 180; d += 10) {
        const a = Math.PI + d * DEG, l = d % 30 === 0 ? 8 : 4;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * (r - l), y + Math.sin(a) * (r - l)); ctx.stroke();
      }
      const a1 = Math.atan2(E[0].y - it.y, E[0].x - it.x), a2 = Math.atan2(E[1].y - it.y, E[1].x - it.x);
      ctx.strokeStyle = accent(); ctx.lineWidth = 2;
      [E[0], E[1]].forEach(e => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(V.X(e.x), V.Y(e.y)); ctx.stroke(); });
      let d = Math.abs(a2 - a1); if (d > Math.PI) d = TAU - d;
      const s1 = a1, s2 = ((a2 - a1 + 3 * Math.PI) % TAU) - Math.PI > 0 ? a1 + d : a1 - d;
      ctx.beginPath(); ctx.arc(x, y, 22, Math.min(s1, s2), Math.max(s1, s2)); ctx.stroke();
      ctx.fillStyle = accent(); ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      ctx.restore();
      chip(ctx, fmt(d / DEG, 1) + "°", x + Math.cos((s1 + s2) / 2) * 38, y + Math.sin((s1 + s2) / 2) * 38, { size: 11.5, color: accent() });
    }
  });

  /* 卡片型工具：大小固定在螢幕像素，縮放時字不會跟著變小 */
  def("stopwatch", {
    cat: "tool", name: "碼錶", desc: "量模擬時間（慢動作時也準）",
    params: [], tool: true, card: { w: 150, h: 78 },
    draw(ctx, it, V) { withCard(ctx, V, it, () => drawWatch(ctx, it, V)); },
    // 回傳點到哪一顆鈕（先把指標換回未縮放的卡片座標）
    button(it, V, sx, sy) {
      const x = V.X(it.x), y = V.Y(it.y), cs = V.cs || 1;
      sx = x + (sx - x) / cs; sy = y + (sy - y) / cs;
      if (sy < y + 14 || sy > y + 36) return null;
      if (Math.abs(sx - (x - 36)) <= 30) return "toggle";
      if (Math.abs(sx - (x + 36)) <= 30) return "reset";
      return null;
    }
  });
  function drawWatch(ctx, it, V) {
    {
      const x = V.X(it.x), y = V.Y(it.y), w = 150, h = 78, rt = it.rt || {};
      const t = rt.elapsed || 0;
      ctx.save(); rr(ctx, x - w / 2, y - h / 2, w, h, 10);
      ctx.fillStyle = isLight() ? "rgba(255,255,255,0.96)" : "rgba(24,30,40,0.96)"; ctx.fill();
      ctx.strokeStyle = ink(0.25); ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      if (AP()) AP().lcd(ctx, x - w / 2 + 10, y - h / 2 + 9, w - 20, 30, t.toFixed(2) + " s", {});
      const btn = (bx, label, on) => {
        ctx.save(); rr(ctx, bx - 30, y + 14, 60, 22, 6);
        ctx.fillStyle = on ? accent() : (isLight() ? "#eef2f7" : "#2c3442"); ctx.fill();
        ctx.fillStyle = on ? (isLight() ? "#fff" : "#0b1418") : ink(); ctx.font = "700 11.5px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(label, bx, y + 25.5); ctx.restore();
      };
      btn(x - 36, rt.on ? "停止" : "開始", !!rt.on); btn(x + 36, "歸零", false);
    }
  }

  def("sensor", {
    cat: "tool", name: "運動感測器", desc: "把探頭拖到物體上，畫即時 x–t／v–t 圖",
    params: [{ k: "mode", label: "圖表", kind: "select", def: "v", options: [["x", "水平位置 x–t"], ["h", "高度 h–t"], ["v", "速率 v–t"], ["vx", "水平速度 vₓ–t"], ["a", "加速度 a–t"]] }],
    tool: true, connector: true, single: true, card: { w: 250, h: 150 },
    makeEnds: it => [{ x: it.x, y: it.y + 60, at: null }],
    draw(ctx, it, V, E) {
      const x = V.X(it.x), y = V.Y(it.y), w = 250, h = 150, rt = it.rt || {};
      const e = E[0];
      // 探頭連線（畫在縮放之外，端點才對得準物體）
      ctx.save(); ctx.strokeStyle = accent(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, y + h / 2 * (V.cs || 1)); ctx.lineTo(V.X(e.x), V.Y(e.y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = accent(); ctx.beginPath(); ctx.arc(V.X(e.x), V.Y(e.y), 4.5, 0, TAU); ctx.fill(); ctx.restore();
      withCard(ctx, V, it, () => chart(ctx, x - w / 2, y - h / 2, w, h, it.p.mode, rt.samples || [], e.at ? null : "把探頭（綠點）拖到物體上"));
    }
  });
  const MODE = {
    x: { label: "x (m)", f: s => s.x / 100 }, h: { label: "h (m)", f: s => s.h / 100 },
    v: { label: "v (m/s)", f: s => s.v / 100 }, vx: { label: "vₓ (m/s)", f: s => s.vx / 100 }, a: { label: "a (m/s²)", f: s => s.a / 100 }
  };
  function chart(ctx, x0, y0, w, h, mode, samples, hint) {
    ctx.save(); rr(ctx, x0, y0, w, h, 10);
    ctx.fillStyle = isLight() ? "rgba(255,255,255,0.97)" : "rgba(22,28,38,0.97)"; ctx.fill();
    ctx.strokeStyle = ink(0.25); ctx.lineWidth = 1; ctx.stroke();
    const M = MODE[mode] || MODE.v;
    const withZero = mode === "v" || mode === "vx" || mode === "a";   // 位置、高度不必把 0 拉進來，振動才看得到
    const bx = x0 + 40, by = y0 + 22, bw = w - 52, bh = h - 46;
    ctx.fillStyle = ink(0.85); ctx.font = "700 11.5px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(M.label + " – t", x0 + 10, y0 + 12);
    ctx.strokeStyle = ink(0.35); ctx.strokeRect(bx, by, bw, bh);
    if (hint && !samples.length) { ctx.fillStyle = ink(0.6); ctx.font = "600 11px system-ui"; ctx.textAlign = "center"; ctx.fillText(hint, x0 + w / 2, by + bh / 2); ctx.restore(); return; }
    if (samples.length > 1) {
      const t0 = samples[0].t, t1 = Math.max(t0 + 1, samples[samples.length - 1].t);
      const ys = samples.map(M.f).filter(isFinite);
      let lo = withZero ? Math.min(0, ...ys) : Math.min(...ys), hi = withZero ? Math.max(0, ...ys) : Math.max(...ys);
      if (hi - lo < 0.02) { const m = (hi + lo) / 2; hi = m + 0.01; lo = m - 0.01; }
      const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
      const X = t => bx + (t - t0) / (t1 - t0) * bw, Y = v => by + bh - (v - lo) / (hi - lo) * bh;
      if (lo < 0 && hi > 0) { ctx.strokeStyle = ink(0.2); ctx.beginPath(); ctx.moveTo(bx, Y(0)); ctx.lineTo(bx + bw, Y(0)); ctx.stroke(); }
      ctx.strokeStyle = accent(); ctx.lineWidth = 2; ctx.beginPath();
      samples.forEach((s, i) => { const v = M.f(s); if (!isFinite(v)) return; i ? ctx.lineTo(X(s.t), Y(v)) : ctx.moveTo(X(s.t), Y(v)); });
      ctx.stroke();
      ctx.fillStyle = ink(0.65); ctx.font = "600 9.5px system-ui"; ctx.textAlign = "right";
      ctx.fillText(fmt(hi, 2), bx - 4, by + 4); ctx.fillText(fmt(lo, 2), bx - 4, by + bh - 2);
      ctx.textAlign = "center"; ctx.fillText(fmt(t0, 1) + " s", bx, by + bh + 11); ctx.fillText(fmt(t1, 1) + " s", bx + bw, by + bh + 11);
      const last = samples[samples.length - 1];
      ctx.textAlign = "right"; ctx.font = "700 11px system-ui"; ctx.fillStyle = accent();
      const cur = M.f(last);
      ctx.fillText("目前 " + (Math.abs(cur) < 5e-4 ? "0.00" : fmt(cur, 2)), x0 + w - 10, y0 + 12);
    } else { ctx.fillStyle = ink(0.55); ctx.font = "600 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("按「播放」開始記錄", x0 + w / 2, by + bh / 2); }
    ctx.restore();
  }

  def("gauge", {
    cat: "tool", name: "測力計", desc: "很硬的彈簧秤：串在繩或物體間讀拉力",
    params: [{ k: "k", label: "勁度", min: 50, max: 2000, step: 10, unit: "N/m", def: 400 }, { k: "L0", label: "外殼長", min: 8, max: 40, step: 1, unit: "cm", def: 14 }],
    tool: true, connector: true, gauge: true, makeEnds: twoEnds(14, true),
    draw(ctx, it, V, E) {
      const a = E[0], b = E[1], ang = Math.atan2(b.y - a.y, b.x - a.x), L = Math.hypot(b.x - a.x, b.y - a.y);
      const F = it.rt && it.rt.force != null ? it.rt.force / 100 : it.p.k * (L - it.p.L0) / 100;
      ctx.save(); ctx.translate(V.X(a.x), V.Y(a.y)); ctx.rotate(ang);
      const len = L * V.s, bodyL = Math.min(len, it.p.L0 * V.s * 0.8), hw = 7;
      const g = ctx.createLinearGradient(0, -hw, 0, hw); g.addColorStop(0, "#e9eef4"); g.addColorStop(1, "#9aa6b6");
      rr(ctx, 0, -hw, bodyL, hw * 2, 3); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(40,50,64,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = "#5b6676"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bodyL, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.restore();
      chip(ctx, fmt(Math.max(0, F), 2) + " N", V.X((a.x + b.x) / 2) + 40, V.Y((a.y + b.y) / 2), { size: 11.5, color: "#d9822b" });
    }
  });

  def("energy", {
    cat: "tool", name: "能量計", desc: "整個系統的動能、重力位能、彈性位能",
    params: [], tool: true, card: { w: 230, h: 132 },
    draw(ctx, it, V) { withCard(ctx, V, it, () => drawEnergy(ctx, it, V)); }
  });
  function drawEnergy(ctx, it, V) {
    {
      const x0 = V.X(it.x) - 115, y0 = V.Y(it.y) - 66, w = 230, h = 132, e = (it.rt && it.rt.E) || null;
      ctx.save(); rr(ctx, x0, y0, w, h, 10);
      ctx.fillStyle = isLight() ? "rgba(255,255,255,0.97)" : "rgba(22,28,38,0.97)"; ctx.fill(); ctx.strokeStyle = ink(0.25); ctx.stroke();
      ctx.fillStyle = ink(0.85); ctx.font = "700 11.5px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText("系統能量（J，零位面＝桌面）", x0 + 10, y0 + 13);
      if (!e) { ctx.fillStyle = ink(0.55); ctx.font = "600 11px system-ui"; ctx.textAlign = "center"; ctx.fillText("沒有可動的物體", x0 + w / 2, y0 + h / 2); ctx.restore(); return; }
      const rows = [["動能 K", e.K, "#2f7de1"], ["重力位能 U", e.Ug, "#d9822b"], ["彈性位能 Uₛ", e.Us, "#7c4ddb"], ["總和 E", e.E, accent()]];
      const max = Math.max(0.01, ...rows.map(r => Math.abs(r[1])), it.rt.Emax || 0);
      it.rt.Emax = max;
      rows.forEach((r, i) => {
        const yy = y0 + 32 + i * 24;
        ctx.fillStyle = ink(0.8); ctx.font = "600 10.5px system-ui"; ctx.textAlign = "left"; ctx.fillText(r[0], x0 + 10, yy + 7);
        const bw = Math.abs(r[1]) / max * 100;
        ctx.fillStyle = r[2]; ctx.globalAlpha = r[1] < 0 ? 0.45 : 0.9; ctx.fillRect(x0 + 82, yy + 1, bw, 12); ctx.globalAlpha = 1;
        ctx.fillStyle = ink(); ctx.textAlign = "right"; ctx.font = "700 10.5px system-ui"; ctx.fillText((Math.abs(r[1]) < 5e-4 ? 0 : r[1]).toFixed(3), x0 + w - 10, yy + 7);
      });
      ctx.restore();
    }
  }

  /* ------------------------------ 分類 ------------------------------ */
  LAB.cats = [
    { key: "mech", name: "力學", icon: "M4 18h16M7 18l5-9 5 9M12 9V4" },
    { key: "elec", name: "電學", icon: "M13 2L4 14h7l-1 8 9-12h-7z" },
    { key: "optics", name: "光學", icon: "M2 12h7M15 6l-4 6 4 6M22 12h-5" },
    { key: "tool", name: "量測工具", icon: "M3 17l14-14 4 4L7 21H3zM7 13l2 2M10 10l2 2M13 7l2 2" }
  ];
  LAB.types = T;
  LAB.typeOrder = order;
  LAB.util = { local, toLocal, inPoly, rr, text, chip, fmt, isLight, ink, accent, box, wSize, DEG, COLORS, nmCss, initVel };
})(typeof window !== "undefined" ? window : globalThis);
