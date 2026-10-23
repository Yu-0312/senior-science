/* 學測／分科／國中銜接 · 光學與熱學實驗台
 * apparent-depth（視深）、plane-mirror（平面鏡）、brewster-angle（布魯斯特角）、
 * four-stroke-engine（四行程引擎）、brownian-diffusion（布朗運動與擴散）、em-spectrum（電磁波譜）
 *
 * 共同原則：畫面是學生在實驗室或生活中真的會看到的東西（水槽、全身鏡、雷射與偏光片、
 * 引擎剖面、顯微鏡視野、波譜掛圖），公式與判讀直接寫在器材旁邊；
 * 把手抓的是真實實驗裡用手去動的東西（硬幣、眼睛、鏡框、雷射筆、油門、飛輪、溫度計）。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, AP = PL.apparatus;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const col = (k, f) => PL.col(k, f);
  const isL = () => PL.theme.isLight();
  const T = (ctx, s, x, y, o) => D.text(ctx, s, x, y, o);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (v, d) => PL.fmt(v, d);
  // 光線色：深色台用亮黃，淺色台的米白牆上黃色會消失，改用深橘
  const rayCol = () => isL() ? "#d84315" : "#ffd54f";
  const tri = x => { const m = ((x % 2) + 2) % 2; return m > 1 ? 2 - m : m; };
  const sstep = u => u * u * (3 - 2 * u);
  function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function gauss() { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); }
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  // 科學記號（上標指數），課本寫法 5.45×10¹⁴
  function sci(v, d) {
    if (!isFinite(v) || v === 0) return "0";
    const e = Math.floor(Math.log10(Math.abs(v)) + 1e-9);
    if (e >= -2 && e <= 3) return String(+v.toPrecision(3));
    const m = v / Math.pow(10, e);
    return m.toFixed(d == null ? 2 : d) + "×10" + (e < 0 ? "⁻" : "") + String(Math.abs(e)).split("").map(c => SUP[+c]).join("");
  }

  /* 畫布上的說明卡：lines 每列為字串或 [文字, 顏色, 粗細] */
  function card(ctx, x, y, lines, o) {
    o = o || {};
    const fs = o.size || 12, lh = fs + 5;
    ctx.save(); ctx.font = "600 " + fs + "px system-ui,sans-serif";
    let w = 0;
    lines.forEach(l => { w = Math.max(w, ctx.measureText(Array.isArray(l) ? l[0] : l).width); });
    ctx.restore();
    w = Math.ceil(w + 18);
    const h = lines.length * lh + 9, X = o.right ? x - w : x;
    AP.infoCard(ctx, X, y, w, h);
    lines.forEach((l, i) => {
      const a = Array.isArray(l) ? l : [l];
      T(ctx, a[0], X + 9, y + 3 + fs + i * lh, { size: fs, color: a[1] || col("text"), weight: a[2] || "" });
    });
    return { x: X, y, w, h };
  }
  /* 眼睛：ang 是視線方向（看向光進來的地方） */
  function eyeIcon(ctx, x, y, ang, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.95, s, 0); ctx.quadraticCurveTo(0, s * 0.95, -s, 0); ctx.closePath();
    ctx.fillStyle = "rgb(250,247,240)"; ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = "rgb(110,72,52)"; ctx.stroke();
    ctx.clip();
    ctx.fillStyle = "rgb(84,120,66)"; ctx.beginPath(); ctx.arc(s * 0.42, 0, s * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgb(16,16,20)"; ctx.beginPath(); ctx.arc(s * 0.5, 0, s * 0.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  /* 鉛直尺寸標示：雙箭頭＋左側標籤 */
  function dimV(ctx, x, y1, y2, label, c) {
    if (Math.abs(y2 - y1) < 8) return;
    const m = (y1 + y2) / 2;
    D.arrow(ctx, x, m, x, y1, { color: c, width: 1.3, head: 6 });
    D.arrow(ctx, x, m, x, y2, { color: c, width: 1.3, head: 6 });
    if (label) T(ctx, label, x - 4, m + 4, { size: 12, align: "right", color: c, weight: "700" });
  }
  /* 角度弧：由 a0 到 a1（兩者差小於 π） */
  function arcA(ctx, x, y, r, a0, a1, c) {
    ctx.save(); ctx.strokeStyle = PL.theme.ink(ctx, c, x, y); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); ctx.restore();
  }
  /* 側視硬幣（金色扁橢圓）；ghost 為虛像 */
  function coinSide(ctx, x, y, ghost) {
    ctx.save(); ctx.globalAlpha = ghost ? 0.55 : 1;
    const g = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
    g.addColorStop(0, "#9c6b22"); g.addColorStop(0.45, "#f6d77e"); g.addColorStop(1, "#a8782c");
    ctx.beginPath(); ctx.ellipse(x, y, 12, 3.4, 0, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(90,60,20,0.9)"; ctx.lineWidth = 1; if (ghost) ctx.setLineDash([3, 2]); ctx.stroke();
    ctx.restore();
  }

  /* =====================================================================
     視深與實深：水槽側視
     眼睛只認得「光從哪個方向進來」。把進入瞳孔的幾條折射光反向延長，
     它們交在一起的地方就是看到的虛像。瞳孔兩側的光線來自略為不同的角度，
     交點（包絡點）的深度 h′ = h·(n₂/n₁)·cos³θ₂ / cos³θ₁，
     θ → 0 時正是課本的 h′ = h/n；斜著看時 cos³ 比值變小 → 更淺。
     ===================================================================== */
  PL.register("apparent-depth", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sMode = PL.ui.select(L.controls, { label: "觀察方式", value: "coin", options: [
      { value: "coin", label: "從岸上往下看水中的硬幣" },
      { value: "lamp", label: "潛入水中往上看岸上的燈" }], onChange: () => draw() });
    const sH = PL.ui.slider(L.controls, { label: "物體到水面的距離 h", min: 4, max: 30, step: 0.5, value: 20, unit: "cm", digits: 1, onInput: () => draw() });
    const sA = PL.ui.slider(L.controls, { label: "視線與法線夾角 θ（眼睛那一側）", min: 0, max: 65, step: 1, value: 20, unit: "°", digits: 0, onInput: () => draw() });
    const sN = PL.ui.slider(L.controls, { label: "水的折射率 n", min: 1.2, max: 1.8, step: 0.01, value: 1.33, digits: 2, onInput: () => draw() });
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "垂直往下看", hint: "近法線觀察：視深 ≈ 實深 ÷ n", apply: () => { sMode.set("coin"); sA.set(0); draw(); } },
      { label: "斜著看 50°", hint: "斜看時池底看起來更淺", apply: () => { sMode.set("coin"); sA.set(50); draw(); } },
      { label: "玻璃 n = 1.5", hint: "折射率越大，看起來越淺", apply: () => { sN.set(1.5); draw(); } },
      { label: "從水中看岸上", hint: "岸上的物體看起來比實際高", apply: () => { sMode.set("lamp"); sA.set(0); draw(); } }
    ]});
    PL.ui.note(L.controls, "直接在水槽上拖：硬幣（或燈）上下拖改距離，眼睛沿弧線拖改觀察角。眼睛只認得光從哪個方向進來，把折射光反向延長，交點就是看到的虛像。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rH = PL.ui.readout(L.readouts, { label: "實際距離 h（實深）", unit: "cm" });
    const rD = PL.ui.readout(L.readouts, { label: "看起來的距離 h′（視深）", unit: "cm" });
    const rK = PL.ui.readout(L.readouts, { label: "h ÷ h′" });
    const rA = PL.ui.readout(L.readouts, { label: "物體那一側光線與法線夾角", unit: "°" });

    const G = { s: 6, R: 120, ys: 200, x0: 20, x1: 600 };
    // 給定眼睛側角度（度）算出整組幾何；把手換算也用同一個函式，拖到哪就畫到哪
    function lay(a2d) {
      const coin = sMode.get() === "coin", n = sN.get(), h = sH.get();
      const n1 = coin ? n : 1, n2 = coin ? 1 : n, sg = coin ? 1 : -1;
      const a2 = a2d * DEG, s1 = n2 * Math.sin(a2) / n1, tir = s1 >= 0.9999;
      const a1 = tir ? 0 : Math.asin(s1);
      const off = tir ? h * 2 : h * Math.tan(a1);
      const d = tir ? NaN : h * (n2 / n1) * Math.pow(Math.cos(a2) / Math.cos(a1), 3);
      const xc = clamp(G.x1 - 30 - off * G.s - G.R * Math.sin(a2), G.x0 + 100, G.x0 + (G.x1 - G.x0) * 0.3);
      const P = { x: xc + off * G.s, y: G.ys }, O = { x: xc, y: G.ys + sg * h * G.s };
      const E = { x: P.x + G.R * Math.sin(a2), y: G.ys - sg * G.R * Math.cos(a2) };
      const I = tir ? null : { x: P.x - d * G.s * Math.tan(a2), y: G.ys + sg * d * G.s };
      return { coin, n, h, n1, n2, sg, a1, a2, tir, d, xc, P, O, E, I };
    }
    // 找出經過瞳孔上某一點的光線：對水面出射點做二分搜尋
    function through(g, tx, ty) {
      const dist = Math.abs(ty - G.ys);
      const m = g.n1 > g.n2 ? Math.asin(g.n2 / g.n1) - 1e-4 : 89.5 * DEG;
      const a2of = a1 => Math.asin(clamp(g.n1 * Math.sin(a1) / g.n2, -0.99999, 0.99999));
      const X = a1 => g.xc + g.h * G.s * Math.tan(a1) + dist * Math.tan(a2of(a1));
      let lo = -m, hi = m;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (X(mid) < tx) lo = mid; else hi = mid; }
      return { x: g.xc + g.h * G.s * Math.tan(lo), y: G.ys };
    }
    let cur = null;
    const hObj = PL.ui.handle(cv, { slider: sH, label: "物體（拖動改距離 h）", toValue: (x, y) => (cur ? cur.sg : 1) * (y - G.ys) / G.s });
    const hEye = PL.ui.handle(cv, { slider: sA, label: "眼睛（沿弧線拖改觀察角）", toValue: (x, y) => {
      let best = sA.get(), bd = Infinity;
      for (let a = 0; a <= 65; a++) { const E = lay(a).E, dd = Math.hypot(E.x - x, E.y - y); if (dd < bd) { bd = dd; best = a; } }
      return best;
    } });
    const clock = PL.motion.clock(() => draw(), { ambient: true });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock.t, light = isL();
      const benchY = Math.round(H * 0.9), yb = benchY - 3;
      AP.labRoom(ctx, W, H, benchY);
      G.x0 = Math.round(W * 0.04); G.x1 = Math.round(W * 0.96); G.ys = Math.round(H * 0.44);
      G.R = Math.min(H * 0.3, 150);
      // 從水中看岸上時虛像約在 n·h 高，比例尺要讓它留在畫面內
      G.s = Math.min((yb - G.ys - 16) / 30, (G.ys - 24) / (sMode.get() === "coin" ? 30 : 33 * sN.get()), W / 105);
      const g = cur = lay(sA.get()), s = G.s, ys = G.ys, { O, P, E, I } = g;
      // 水槽：玻璃壁、水、槽底細砂；硬幣模式時槽壁貼一把尺（0 在水面）
      const tTop = ys - Math.round(H * 0.07);
      AP.water(ctx, G.x0, ys, G.x1 - G.x0, yb - ys, t, { flow: 4 });
      ctx.fillStyle = "rgba(205,232,245,0.10)"; ctx.fillRect(G.x0, tTop, G.x1 - G.x0, ys - tTop);
      const sand = ctx.createLinearGradient(0, yb - 8, 0, yb); sand.addColorStop(0, "#cdb98f"); sand.addColorStop(1, "#a48a5c");
      ctx.fillStyle = sand; ctx.fillRect(G.x0, yb - 8, G.x1 - G.x0, 8);
      if (g.coin) AP.ruler(ctx, G.x0 + 4, ys, yb - 8, s);
      ctx.strokeStyle = light ? "rgba(60,100,130,0.85)" : "rgba(200,230,245,0.7)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(G.x0, tTop); ctx.lineTo(G.x0, yb); ctx.lineTo(G.x1, yb); ctx.lineTo(G.x1, tTop); ctx.stroke();
      D.line(ctx, G.x0, ys, G.x1, ys, light ? "rgba(20,80,130,0.9)" : "rgba(190,230,255,0.9)", 1.8);
      T(ctx, "空氣 n = 1.00", G.x1 - 8, ys - 8, { size: 11, align: "right", color: col("text-dim") });
      T(ctx, "水 n = " + g.n.toFixed(2), G.x1 - 8, ys + 18, { size: 11, align: "right", color: col("text") });

      // 物體：硬幣放在透明壓克力墊台上（才能改深度）；或吊在水面上方的燈
      if (g.coin) {
        ctx.fillStyle = "rgba(225,242,252,0.30)"; ctx.fillRect(O.x - 13, O.y + 3, 26, yb - 8 - O.y - 3);
        ctx.strokeStyle = "rgba(225,242,252,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(O.x - 12.5, O.y + 3.5, 25, Math.max(0, yb - 8 - O.y - 4));
        coinSide(ctx, O.x, O.y, false);
      } else {
        D.line(ctx, O.x, 0, O.x, O.y - 12, light ? "rgba(60,60,60,0.8)" : "rgba(200,200,200,0.7)", 1.4);
        ctx.save(); ctx.translate(O.x, O.y); ctx.rotate(Math.PI); AP.bulb(ctx, 0, 0, 9, 1); ctx.restore();
      }
      D.line(ctx, P.x, ys - 56, P.x, ys + 56, PL.theme.pale(0.5), 1, [4, 4]);

      const rc = rayCol();
      if (!g.tir) {
        // 三條進入瞳孔的光線（中央＋兩側），各自反向延長
        const px = Math.cos(g.a2), py = g.sg * Math.sin(g.a2);
        [-6, 6, 0].forEach(k => {
          const tg = { x: E.x + px * k, y: E.y + py * k };
          const Pi = k ? through(g, tg.x, tg.y) : P;
          D.line(ctx, O.x, O.y, Pi.x, Pi.y, rc, k ? 1 : 2);
          D.line(ctx, Pi.x, Pi.y, tg.x, tg.y, rc, k ? 1 : 2);
          const ux = tg.x - Pi.x, uy = tg.y - Pi.y, ul = Math.hypot(ux, uy) || 1;
          const back = Math.hypot(I.x - Pi.x, I.y - Pi.y) + 26;
          D.line(ctx, Pi.x, Pi.y, Pi.x - ux / ul * back, Pi.y - uy / ul * back, rc, 1.2, [5, 4]);
        });
        // 光點：在水中走 c/n，在空氣中走 c，頻率不變
        const c0 = 130, f0 = 5, v1 = c0 / g.n1, v2 = c0 / g.n2, l1 = Math.hypot(P.x - O.x, P.y - O.y);
        PL.motion.flow(ctx, [[O.x, O.y], [P.x, P.y]], t * v1, { gap: v1 / f0, r: 2.6, color: rc });
        PL.motion.flow(ctx, [[P.x, P.y], [E.x, E.y]], (t - l1 / v1) * v2, { gap: v2 / f0, r: 2.6, color: rc });
        if (g.coin) coinSide(ctx, I.x, I.y, true);
        else { ctx.save(); ctx.globalAlpha = 0.5; ctx.translate(I.x, I.y); ctx.rotate(Math.PI); AP.bulb(ctx, 0, 0, 9, 0.6); ctx.restore(); }
        T(ctx, "虛像", I.x - 16, I.y + (g.coin ? -6 : 16), { size: 12, align: "right", color: col("accent-2"), weight: "700" });
        if (g.a2 > 0.035) {
          const nv = g.coin ? -Math.PI / 2 : Math.PI / 2;
          arcA(ctx, P.x, P.y, 26, nv, Math.atan2(E.y - P.y, E.x - P.x), rc);
          arcA(ctx, P.x, P.y, 34, -nv, Math.atan2(O.y - P.y, O.x - P.x), col("accent-2"));
          const nm2 = g.coin ? "θ空 " : "θ水 ", nm1 = g.coin ? "θ水 " : "θ空 ";
          T(ctx, nm2 + fmt(g.a2 / DEG, 0) + "°", P.x + 8 + 30 * Math.sin(g.a2 / 2), ys - g.sg * (36 * Math.cos(g.a2 / 2)) + (g.coin ? 0 : 8), { size: 11.5, color: rc, weight: "700" });
          T(ctx, nm1 + fmt(g.a1 / DEG, 0) + "°", P.x + 6, ys + g.sg * 48 + 4, { size: 11.5, color: col("accent-2"), weight: "700" });
        }
        D.line(ctx, I.x, I.y, O.x - 58, I.y, PL.theme.pale(0.45), 1, [3, 3]);
        dimV(ctx, O.x - 54, ys, I.y, "h′", col("accent-2"));
      } else {
        // 超過臨界角：眼睛沿這方向看到的是水面的全反射，岸上的光進不來
        D.line(ctx, E.x, E.y, P.x, P.y, rc, 1.4, [5, 4]);
        D.line(ctx, P.x, P.y, 2 * P.x - E.x, E.y, rc, 1.4, [5, 4]);
        T(ctx, "全反射", P.x + 8, ys + 18, { size: 12, color: col("danger"), weight: "700" });
      }
      dimV(ctx, O.x - 30, ys, O.y, "h", col("text"));

      eyeIcon(ctx, E.x, E.y, Math.atan2(P.y - E.y, P.x - E.x), 13);
      if (!g.coin) { ctx.save(); ctx.strokeStyle = "rgba(30,34,40,0.9)"; ctx.lineWidth = 3; AP.rrPath(ctx, E.x - 21, E.y - 15, 42, 30, 9); ctx.stroke(); ctx.restore(); }
      T(ctx, g.coin ? "眼睛" : "眼睛（戴面鏡）", E.x + 18, E.y - 14, { size: 11.5, color: col("text"), weight: "600" });

      card(ctx, W - 12, 12, [
        ["n₁ sin θ₁ = n₂ sin θ₂", col("text"), "700"],
        [g.coin ? "垂直往下看：h′ ≈ h ÷ n" : "垂直往上看：h′ ≈ n × h", col("text")],
        g.tir ? ["超過臨界角，看不到岸上", col("danger"), "600"] : ["此刻 h′ = " + fmt(g.d, 1) + " cm，h ÷ h′ = " + fmt(g.h / g.d, 2), col("accent-2"), "600"],
        [g.coin ? "越斜著看 → 虛像越淺" : "岸上物體看起來偏高", col("text-dim")]
      ], { right: true, size: 12 });

      rH.set(g.h, 1); rA.set(g.a1 / DEG, 1);
      if (g.tir) {
        rD.set("看不到"); rK.set("—");
        vd.set("超過臨界角 " + fmt(Math.asin(1 / g.n) / DEG, 1) + "°：水面像鏡子，看到的是水中景物的全反射，岸上的燈看不到", "bad");
      } else {
        rD.set(g.d, 1); rK.set(g.h / g.d, 2);
        if (g.coin) vd.set(g.a2 < 0.06 ? "近法線觀察：視深 h′ ≈ h ÷ n = " + fmt(g.h / g.n, 1) + " cm，池底看起來變淺"
          : "斜著看：視深 " + fmt(g.d, 1) + " cm，比 h ÷ n = " + fmt(g.h / g.n, 1) + " cm 更淺——越斜看池底越淺", g.a2 < 0.06 ? "ok" : "warn");
        else vd.set("從水中往上看：燈看起來在水面上 " + fmt(g.d, 1) + " cm，比實際的 " + fmt(g.h, 1) + " cm 高（虛像偏高）", "ok");
      }
      hObj.place(O.x, O.y);
      if (E.x > 4 && E.x < W - 4 && E.y > 4 && E.y < H - 4) hEye.place(E.x, E.y); else hEye.hide();
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* =====================================================================
     平面鏡成像
     左：側視全身鏡。頭頂與腳底的光經鏡面反射進眼睛，鏡子上真正被用到的
     只是「頭頂—眼睛」與「眼睛—腳底」兩個中點之間——恰好身高的一半，與距離無關。
     右：俯視兩面鏡。像由「反射再反射」產生：沿 A→B→A… 與 B→A→B… 兩條鏈
     逐次對鏡線反射，只要上一個像還在下一面鏡子的前方就繼續。
     360°/θ 為整數時共有 360°/θ − 1 個像。每隔幾秒點亮一個像的真實光路。
     ===================================================================== */
  function mirrorImages(th, P0) {
    const out = [];
    for (let first = 0; first < 2; first++) {
      let m = first, p = P0, pts = [P0], seq = [], M = [1, 0, 0, 1];
      for (let k = 0; k < 40; k++) {
        const b = m ? th : 0, ang = Math.atan2(p.y, p.x);
        if ((m ? Math.sin(th - ang) : Math.sin(ang)) <= 1e-6) break;   // 已在這面鏡子背後
        const c = Math.cos(2 * b), s2 = Math.sin(2 * b);
        p = { x: c * p.x + s2 * p.y, y: s2 * p.x - c * p.y };
        M = [c * M[0] + s2 * M[2], c * M[1] + s2 * M[3], s2 * M[0] - c * M[2], s2 * M[1] - c * M[3]];
        seq = seq.concat(m); pts = pts.concat([p]);
        if (!out.some(q => Math.hypot(q.p.x - p.x, q.p.y - p.y) < 1e-3 * (1 + Math.hypot(p.x, p.y)))) out.push({ p, M, seq, pts });
        m = 1 - m;
      }
    }
    return out;
  }
  // 從眼睛往回追：瞄準最後一個像 → 打在最後那面鏡子上 → 再瞄準前一個像…
  function mirrorPath(im, E, Lm, th) {
    let from = E; const qs = [];
    for (let j = im.seq.length - 1; j >= 0; j--) {
      const b = im.seq[j] ? th : 0, ux = Math.cos(b), uy = Math.sin(b), to = im.pts[j + 1];
      const dx = to.x - from.x, dy = to.y - from.y, den = dx * uy - dy * ux;
      if (Math.abs(den) < 1e-9) return null;
      const tt = -(from.x * uy - from.y * ux) / den, q = { x: from.x + dx * tt, y: from.y + dy * tt }, sa = q.x * ux + q.y * uy;
      if (tt <= 1e-6 || tt >= 1 || sa <= 0 || sa > Lm) return null;
      qs.push(q); from = q;
    }
    return [im.pts[0]].concat(qs.reverse(), [E]);
  }

  PL.register("plane-mirror", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.68);
    PL.ui.section(L.controls, "全身鏡（左：側視）");
    const sD = PL.ui.slider(L.controls, { label: "人到鏡面的距離 d", min: 50, max: 150, step: 1, value: 100, unit: "cm", digits: 0, onInput: () => draw() });
    const sH = PL.ui.slider(L.controls, { label: "身高 H", min: 120, max: 190, step: 1, value: 160, unit: "cm", digits: 0, onInput: () => draw() });
    const sTop = PL.ui.slider(L.controls, { label: "鏡子上緣離地", min: 80, max: 220, step: 1, value: 170, unit: "cm", digits: 0,
      onInput: () => { if (sTop.get() - sBot.get() < 40) sBot.set(sTop.get() - 40); draw(); } });
    const sBot = PL.ui.slider(L.controls, { label: "鏡子下緣離地", min: 0, max: 140, step: 1, value: 50, unit: "cm", digits: 0,
      onInput: () => { if (sTop.get() - sBot.get() < 40) sTop.set(sBot.get() + 40); draw(); } });
    PL.ui.section(L.controls, "兩面鏡夾角（右：俯視）");
    const sTh = PL.ui.slider(L.controls, { label: "兩鏡夾角 θ", min: 30, max: 180, step: 1, value: 60, unit: "°", digits: 0, onInput: () => draw() });
    const sK = PL.ui.slider(L.controls, { label: "物體位置 φ／θ（離鏡 A 多遠）", min: 0.1, max: 0.9, step: 0.01, value: 0.5, digits: 2, onInput: () => draw() });
    const eyeOf = Hc => 0.8985 * Hc;     // 人偶的眼高約為身高的 0.9
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "剛好 H/2 的全身鏡", hint: "下緣在眼高一半、上緣在眼與頭頂的中點", apply: () => {
        const Hc = sH.get(), e = eyeOf(Hc); sBot.set(Math.floor(e / 2)); sTop.set(Math.ceil((e + Hc) / 2)); draw(); } },
      { label: "走近鏡子 d = 50", hint: "像距跟著變小，但需要的鏡長不變", apply: () => { sD.set(50); draw(); } },
      { label: "夾角 90°", hint: "360/90 − 1 = 3 個像", apply: () => { sTh.set(90); draw(); } },
      { label: "夾角 60°", hint: "360/60 − 1 = 5 個像", apply: () => { sTh.set(60); draw(); } },
      { label: "夾角 45°", hint: "360/45 − 1 = 7 個像", apply: () => { sTh.set(45); draw(); } }
    ]});
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rImg = PL.ui.readout(L.readouts, { label: "像到鏡面的距離", unit: "cm" });
    const rImgH = PL.ui.readout(L.readouts, { label: "像高", unit: "cm" });
    const rNeed = PL.ui.readout(L.readouts, { label: "全身鏡最短長度 H/2", unit: "cm" });
    const rUse = PL.ui.readout(L.readouts, { label: "鏡面上被用到的長度", unit: "cm" });
    const rN = PL.ui.readout(L.readouts, { label: "兩面鏡成像數 N" });
    const rQ = PL.ui.readout(L.readouts, { label: "360° ÷ θ" });

    const G = { s: 1, xm: 0, floorY: 0, cx: 0, cy: 0, th: 1, rho: 0 };
    const hPer = PL.ui.handle(cv, { slider: sD, label: "人（前後走）", toValue: x => (G.xm - x) / G.s });
    const hTop = PL.ui.handle(cv, { slider: sTop, label: "鏡子上緣", toValue: (x, y) => (G.floorY - y) / G.s });
    const hBot = PL.ui.handle(cv, { slider: sBot, label: "鏡子下緣", toValue: (x, y) => (G.floorY - y) / G.s });
    const mAng = (x, y) => Math.atan2(G.cy - y, x - G.cx);
    const hB = PL.ui.handle(cv, { slider: sTh, label: "鏡 B（轉動改夾角）", toValue: (x, y) => {
      let a = mAng(x, y); if (a < -Math.PI / 2) a += TAU; return 2 * (a - Math.PI / 2) / DEG; } });
    const hO = PL.ui.handle(cv, { slider: sK, label: "物體（在兩鏡間移動）", toValue: (x, y) => {
      let a = mAng(x, y) - G.rho; while (a < -Math.PI) a += TAU; while (a > Math.PI) a -= TAU; return a / G.th; } });
    const clock = PL.motion.clock(() => draw(), { ambient: true });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock.t, light = isL(), rc = rayCol();
      const split = Math.round(W * 0.6), floorY = Math.round(H * 0.9);
      AP.labRoom(ctx, W, H, floorY, { bench: "none" });
      AP.woodFloor(ctx, W, H, floorY);
      const s = Math.min((floorY - 30) / 235, (split - 26) / 315), xm = Math.round(16 + 165 * s);
      G.s = s; G.xm = xm; G.floorY = floorY;
      const d = sD.get(), Hc = sH.get(), top = sTop.get(), bot = sBot.get();
      const hp = Hc * s / 0.985, xp = xm - d * s, xi = xm + d * s;
      const yHead = floorY - Hc * s, yEye = floorY - 0.885 * hp, eyeX = xp + 0.05 * hp, eCm = eyeOf(Hc);
      const yTopM = floorY - top * s, yBotM = floorY - bot * s;
      const m1 = (yHead + yEye) / 2, m2 = (yEye + floorY) / 2;

      // 鏡後是虛像區：光沒有真的到這裡
      ctx.fillStyle = light ? "rgba(70,90,130,0.08)" : "rgba(0,0,0,0.22)"; ctx.fillRect(xm + 8, 0, split - xm - 8, floorY);
      T(ctx, "鏡後（光沒有到這裡）", (xm + split) / 2 + 4, 20, { size: 11, align: "center", color: col("text-faint") });
      const wg = ctx.createLinearGradient(xm, 0, xm + 8, 0); wg.addColorStop(0, "#a3abb5"); wg.addColorStop(1, "#6b737d");
      ctx.fillStyle = wg; ctx.fillRect(xm, 0, 8, floorY);
      const mg = ctx.createLinearGradient(xm - 6, 0, xm, 0); mg.addColorStop(0, "#eef7fc"); mg.addColorStop(1, "#9fb8c8");
      ctx.fillStyle = mg; ctx.fillRect(xm - 6, yTopM, 6, yBotM - yTopM);
      ctx.strokeStyle = "rgba(60,80,100,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(xm - 6.5, yTopM + 0.5, 6, yBotM - yTopM - 1);
      ctx.save(); ctx.globalAlpha = 0.42; AP.person(ctx, xi, floorY, hp, { facing: -1 }); ctx.restore();
      T(ctx, "虛像", xi, yHead - 10, { size: 12, align: "center", color: col("accent-2"), weight: "700" });
      AP.person(ctx, xp, floorY, hp, { facing: 1 });
      D.line(ctx, eyeX + 6, yEye, xm - 6, yEye, PL.theme.pale(0.4), 1, [3, 4]);

      const headOK = yTopM <= m1 + 0.5, footOK = yBotM >= m2 - 0.5, paths = [];
      [[yHead, m1, headOK, xp + 0.01 * hp], [floorY - 2, m2, footOK, xp + 0.07 * hp]].forEach(([yo, ym, ok, xo]) => {
        if (ok) {
          D.line(ctx, xo, yo, xm - 6, ym, rc, 1.8);
          D.arrow(ctx, xm - 6, ym, eyeX + 4, yEye, { color: rc, width: 1.8, head: 7 });
          D.line(ctx, xm, ym, 2 * xm - xo, yo, rc, 1.1, [5, 4]);
          paths.push([[xo, yo], [xm - 6, ym], [eyeX + 4, yEye]]);
        } else {
          D.line(ctx, xo, yo, xm - 6, ym, col("danger"), 1.3, [3, 4]);
          T(ctx, "✕", xm - 18, ym + 5, { color: col("danger"), size: 15, weight: "700" });
        }
      });
      paths.forEach(p => PL.motion.flow(ctx, p, t * 110, { gap: 22, r: 2.3, color: rc }));
      const u1 = Math.max(m1, yTopM), u2 = Math.min(m2, yBotM);
      if (u2 > u1) D.line(ctx, xm - 3, u1, xm - 3, u2, col("ok"), 4);
      D.arrow(ctx, xm + 20, (m1 + m2) / 2, xm + 20, m1, { color: col("ok"), width: 1.3, head: 6 });
      D.arrow(ctx, xm + 20, (m1 + m2) / 2, xm + 20, m2, { color: col("ok"), width: 1.3, head: 6 });
      T(ctx, "H/2 = " + fmt(Hc / 2, 0) + " cm", xm + 25, (m1 + m2) / 2 + 4, { size: 11.5, color: col("ok"), weight: "700" });
      T(ctx, "上緣 " + top + " cm", xm - 24, yTopM - 5, { size: 11, align: "right", color: col("text-dim") });
      T(ctx, "下緣 " + bot + " cm", xm - 24, Math.min(floorY - 4, yBotM + 14), { size: 11, align: "right", color: col("text-dim") });
      // 地板上的距離：物距 = 像距
      const fy = floorY + 18;
      [[xp, xm, "d = " + d + " cm"], [xm, xi, "像距 " + d + " cm"]].forEach(([a, b, lab]) => {
        D.arrow(ctx, (a + b) / 2, fy, a, fy, { color: col("text"), width: 1.2, head: 6 });
        D.arrow(ctx, (a + b) / 2, fy, b, fy, { color: col("text"), width: 1.2, head: 6 });
        T(ctx, lab, (a + b) / 2, fy + 15, { size: 11, align: "center", color: col("text"), weight: "600" });
      });
      card(ctx, 12, 12, [["θ入 = θ反，像距 = 物距", col("text"), "700"], ["全身鏡最短 = H/2 = " + fmt(Hc / 2, 0) + " cm", col("ok"), "600"], ["與站多遠無關", col("text-dim")]], { size: 11.5 });

      // ---------- 右：俯視兩面鏡 ----------
      const px0 = split + 8, py0 = 10, pw = W - px0 - 10, ph = floorY - 20;
      const tg = ctx.createLinearGradient(px0, py0, px0 + pw, py0 + ph);
      tg.addColorStop(0, light ? "#e6cfaa" : "#4c3a28"); tg.addColorStop(1, light ? "#d4b88c" : "#3c2d1f");
      AP.rrPath(ctx, px0, py0, pw, ph, 10); ctx.fillStyle = tg; ctx.fill();
      ctx.strokeStyle = light ? "rgba(110,80,40,0.5)" : "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.stroke();
      PL.theme.note(ctx, light ? "#ddc39b" : "#45352a", px0, py0, pw, ph);
      T(ctx, "俯視：兩面鏡夾角 θ", px0 + 10, py0 + 18, { size: 12, color: col("text"), weight: "700" });
      const th = sTh.get() * DEG, rho = Math.PI / 2 - th / 2, Lm = Math.min(pw * 0.42, ph * 0.3);
      const cx = px0 + pw / 2, cy = py0 + ph * 0.56;
      Object.assign(G, { cx, cy, th, rho });
      const S = p => ({ x: cx + p.x * Math.cos(rho) - p.y * Math.sin(rho), y: cy - (p.x * Math.sin(rho) + p.y * Math.cos(rho)) });
      // 鏡中鏡：鏡線本身的像（淡虛線）
      const nRay = Math.floor(TAU / th + 1e-6);
      for (let j = -nRay; j <= nRay; j++) {
        if (j === 0 || j === 1) continue;
        const a = j * th, e = S({ x: Math.cos(a) * Lm, y: Math.sin(a) * Lm });
        D.line(ctx, cx, cy, e.x, e.y, PL.theme.pale(0.22), 1, [4, 5]);
      }
      const phi = sK.get() * th, r0 = Lm * 0.5, O = { x: Math.cos(phi) * r0, y: Math.sin(phi) * r0 };
      const er = { x: Math.cos(phi), y: Math.sin(phi) }, et = { x: -Math.sin(phi), y: Math.cos(phi) };
      // 物體：旗子插在一邊，奇數次反射後旗子會跑到另一邊（左右相反）
      const shape = [[-11, 0], [13, 0], [13, 10], [4, 10]].map(([a, b]) => ({ x: O.x + er.x * a + et.x * b, y: O.y + er.y * a + et.y * b }));
      const drawFlag = (M, alpha, ring) => {
        const q = shape.map(p => S({ x: M[0] * p.x + M[1] * p.y, y: M[2] * p.x + M[3] * p.y }));
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.strokeStyle = light ? "#4e342e" : "#efebe9"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); ctx.lineTo(q[1].x, q[1].y); ctx.stroke();
        ctx.fillStyle = "#e53935"; ctx.beginPath(); ctx.moveTo(q[1].x, q[1].y); ctx.lineTo(q[2].x, q[2].y); ctx.lineTo(q[3].x, q[3].y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffb300"; ctx.beginPath(); ctx.arc(q[0].x, q[0].y, 3.5, 0, TAU); ctx.fill();
        ctx.restore();
        if (ring) D.ring(ctx, (q[0].x + q[1].x) / 2, (q[0].y + q[1].y) / 2, 15, col("accent-2"), 1.6);
      };
      const imgs = mirrorImages(th, O), N = imgs.length;
      const E = { x: Math.cos(th / 2) * Lm * 1.45, y: Math.sin(th / 2) * Lm * 1.45 };
      const vis = imgs.map(im => ({ im, path: mirrorPath(im, E, Lm, th) })).filter(v => v.path);
      const curV = vis.length ? vis[Math.floor(t / 2.4) % vis.length] : null;
      imgs.forEach(im => drawFlag(im.M, 0.85 * Math.pow(0.82, im.seq.length), curV && curV.im === im));
      // 兩面真實的鏡子：亮面朝內，背面畫斜線
      [0, th].forEach((b, k) => {
        const e = S({ x: Math.cos(b) * Lm, y: Math.sin(b) * Lm }), nb = k ? b + Math.PI / 2 : b - Math.PI / 2;
        const bk = S({ x: Math.cos(nb) * 5, y: Math.sin(nb) * 5 });
        ctx.save(); ctx.strokeStyle = light ? "rgba(70,60,50,0.6)" : "rgba(220,220,220,0.35)"; ctx.lineWidth = 1;
        for (let u = 0.1; u <= 1; u += 0.09) {
          const x = cx + (e.x - cx) * u, y = cy + (e.y - cy) * u;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (bk.x - cx) + 3 * (e.x - cx) / Lm, y + (bk.y - cy) + 3 * (e.y - cy) / Lm); ctx.stroke();
        }
        ctx.restore();
        ctx.save(); ctx.strokeStyle = "#cfe3ee"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
        ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 3;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.restore();
        T(ctx, k ? "鏡 B" : "鏡 A", e.x + (k ? -6 : 6), e.y + 14, { size: 11, align: k ? "right" : "left", color: col("text"), weight: "700" });
        if (k) hB.place(e.x, e.y);
      });
      AP.brassDisc(ctx, cx, cy, 4);
      drawFlag([1, 0, 0, 1], 1, false);
      const so = S(O); hO.place(so.x, so.y);
      const se = S(E);
      if (curV) {
        const pp = curV.path.map(S);
        PL.motion.flow(ctx, pp.map(p => [p.x, p.y]), (t % 2.4) * 120, { gap: 14, r: 2.2, color: rc });
        ctx.save(); ctx.globalAlpha = 0.6; D.line(ctx, pp[pp.length - 2].x, pp[pp.length - 2].y, S(curV.im.p).x, S(curV.im.p).y, rc, 1.2, [4, 4]); ctx.restore();
        for (let i = 0; i < pp.length - 1; i++) D.line(ctx, pp[i].x, pp[i].y, pp[i + 1].x, pp[i + 1].y, rc, 1);
      }
      eyeIcon(ctx, se.x, se.y, Math.atan2(cy - se.y, cx - se.x), 10);
      const q = 360 / sTh.get(), qi = Math.abs(q - Math.round(q)) < 1e-6;
      const ly = py0 + ph - 46;
      T(ctx, "看到 N = " + N + " 個像", px0 + 10, ly, { size: 12.5, color: col("accent-2"), weight: "700" });
      T(ctx, qi ? "N = 360°/θ − 1 = " + Math.round(q) + " − 1" : "360°/θ = " + fmt(q, 2) + " 非整數：N 依位置而定", px0 + 10, ly + 17, { size: 11, color: col("text") });
      T(ctx, curV ? "亮線：第 " + (imgs.indexOf(curV.im) + 1) + " 個像，光反射 " + curV.im.seq.length + " 次進眼睛" : "旗子在另一邊＝左右相反", px0 + 10, ly + 33, { size: 11, color: col("text-dim") });

      hPer.place(xp + 0.04 * hp, floorY - 8);
      hTop.place(xm - 3, yTopM); hBot.place(xm - 3, yBotM);
      rImg.set(d, 0); rImgH.set(Hc, 0); rNeed.set(Hc / 2, 1);
      rUse.set(Math.max(0, (u2 - u1) / s), 1); rN.set(N, 0); rQ.set(q, 2);
      if (headOK && footOK) vd.set("看得到全身：鏡子只用到 " + fmt(Hc / 2, 0) + " cm（身高的一半），走近走遠都一樣", "ok");
      else vd.set((headOK ? "" : "看不到頭頂：上緣要高於 " + fmt((eCm + Hc) / 2, 0) + " cm。") + (footOK ? "" : "看不到腳：下緣要低於 " + fmt(eCm / 2, 0) + " cm。"), "warn");
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* =====================================================================
     反射光的偏振（布魯斯特角）
     入射雷射是非偏振光：沿光線同時畫「點」（垂直入射面＝平行水面的振動 s）
     與「短線」（在入射面內的振動 p），大小代表振幅。反射與折射依菲涅耳公式分配；
     tan θB = n₂/n₁ 時 Rp = 0，反射光只剩點——完全偏振，且反射光 ⟂ 折射光。
     偏光片正面朝向觀察者：透光軸水平（φ = 0）讓 s 通過，鉛直（太陽眼鏡）擋掉 s。
     ===================================================================== */
  function fresnel(n1, n2, ti) {
    const st = n1 * Math.sin(ti) / n2;
    if (st >= 1) return { Rs: 1, Rp: 1, tt: Math.PI / 2 };
    const tt = Math.asin(st), ci = Math.cos(ti), ct = Math.cos(tt);
    const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct);
    return { Rs: rs * rs, Rp: rp * rp, tt };
  }
  function polMarks(ctx, A, B, t, v, as, ap, alpha) {
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
    if (len < 20 || alpha < 0.02) return;
    const ux = dx / len, uy = dy / len, gap = 30, off = ((t * v) % gap + gap) % gap;
    const sc = isL() ? "#1565c0" : "#82b1ff", pc = isL() ? "#2e7d32" : "#a5d6a7";
    ctx.save(); ctx.globalAlpha = alpha;
    for (let d = off + 10; d < len - 8; d += gap) {
      const x = A.x + ux * d, y = A.y + uy * d;
      if (ap > 0.04) { ctx.strokeStyle = pc; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - uy * 9 * ap, y + ux * 9 * ap); ctx.lineTo(x + uy * 9 * ap, y - ux * 9 * ap); ctx.stroke(); }
      if (as > 0.04) { ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(x, y, 1.3 + 2.9 * as, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  function beam(ctx, A, B, a, w) {
    if (a < 0.02) return;
    ctx.save(); ctx.strokeStyle = "rgba(255,45,35," + a.toFixed(3) + ")"; ctx.lineWidth = w || 2.2;
    ctx.shadowColor = "rgba(255,70,50,0.8)"; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
  }

  PL.register("brewster-angle", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.64);
    const sTh = PL.ui.slider(L.controls, { label: "入射角 θ₁", min: 10, max: 85, step: 0.5, value: 40, unit: "°", digits: 1, onInput: () => draw() });
    const sN = PL.ui.slider(L.controls, { label: "反射面介質折射率 n₂", min: 1.2, max: 2.42, step: 0.01, value: 1.33, digits: 2, onInput: () => draw() });
    const sP = PL.ui.slider(L.controls, { label: "偏光片透光軸與水平夾角 φ", min: 0, max: 180, step: 1, value: 0, unit: "°", digits: 0, onInput: () => draw() });
    const thB = () => Math.atan(sN.get()) / DEG;
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "水 n = 1.33", hint: "θB ≈ 53°", apply: () => { sN.set(1.33); draw(); } },
      { label: "玻璃 n = 1.50", hint: "θB ≈ 56°", apply: () => { sN.set(1.5); draw(); } },
      { label: "設為布魯斯特角", hint: "tan θB = n₂/n₁", apply: () => { sTh.set(Math.round(thB() * 2) / 2); draw(); } },
      { label: "戴偏光太陽眼鏡", hint: "透光軸鉛直，擋掉水平振動的眩光", apply: () => { sP.set(90); draw(); } }
    ]});
    PL.ui.note(L.controls, "藍點＝垂直入射面（平行水面）的振動，綠短線＝在入射面內的振動。拖雷射筆改入射角，轉偏光片上的金色把手看光度計怎麼變。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rB = PL.ui.readout(L.readouts, { label: "布魯斯特角 θB = tan⁻¹ n₂", unit: "°" });
    const rT = PL.ui.readout(L.readouts, { label: "折射角 θt", unit: "°" });
    const rAng = PL.ui.readout(L.readouts, { label: "反射光與折射光夾角", unit: "°" });
    const rR = PL.ui.readout(L.readouts, { label: "反射率 R（非偏振入射）", unit: "%" });
    const rPol = PL.ui.readout(L.readouts, { label: "反射光偏振度", unit: "%" });
    const rI = PL.ui.readout(L.readouts, { label: "偏光片後亮度（入射的）", unit: "%" });
    const G = { X0: 0, ys: 0, pc: { x: 0, y: 0 } };
    const hLas = PL.ui.handle(cv, { slider: sTh, label: "雷射筆（入射角）", toValue: (x, y) => Math.atan2(Math.abs(x - G.X0), Math.max(1e-3, G.ys - y)) / DEG });
    const hPol = PL.ui.handle(cv, { slider: sP, label: "偏光片把手（旋轉）", toValue: (x, y) => {
      const a = Math.atan2(x - G.pc.x, G.pc.y - y) / DEG + 90; return ((a % 180) + 180) % 180; } });
    const clock = PL.motion.clock(() => draw(), { ambient: true });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock.t, light = isL();
      const benchY = Math.round(H * 0.93), ys = Math.round(H * 0.56), X0 = Math.round(W * 0.42);
      G.X0 = X0; G.ys = ys;
      AP.labRoom(ctx, W, H, benchY);
      const n2 = sN.get(), th = sTh.get() * DEG, phi = sP.get() * DEG, tB = Math.atan(n2);
      const F = fresnel(1, n2, th), R = (F.Rs + F.Rp) / 2, tt = F.tt;
      const Iout = (F.Rs * Math.cos(phi) ** 2 + F.Rp * Math.sin(phi) ** 2) / 2;
      // 介質：n 接近水時畫水槽，否則畫玻璃磚
      const bx0 = Math.round(W * 0.27), bx1 = W - 10;
      if (n2 < 1.4) {
        AP.water(ctx, bx0, ys, bx1 - bx0, benchY - ys, t, { flow: 3 });
        ctx.strokeStyle = light ? "rgba(60,100,130,0.85)" : "rgba(200,230,245,0.7)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx0, ys - 18); ctx.lineTo(bx0, benchY); ctx.lineTo(bx1, benchY); ctx.lineTo(bx1, ys - 18); ctx.stroke();
      } else {
        const gg = ctx.createLinearGradient(0, ys, 0, benchY);
        gg.addColorStop(0, light ? "rgba(170,215,232,0.75)" : "rgba(80,140,170,0.55)"); gg.addColorStop(1, light ? "rgba(130,190,215,0.85)" : "rgba(40,90,120,0.6)");
        ctx.fillStyle = gg; ctx.fillRect(bx0, ys, bx1 - bx0, benchY - ys);
        PL.theme.note(ctx, light ? "#a6d2e4" : "#2d5a72", bx0, ys, bx1 - bx0, benchY - ys);
        ctx.strokeStyle = "rgba(220,240,250,0.85)"; ctx.lineWidth = 1.5; ctx.strokeRect(bx0 + 0.5, ys + 0.5, bx1 - bx0 - 1, benchY - ys - 1);
      }
      D.line(ctx, bx0, ys, bx1, ys, light ? "rgba(20,80,130,0.9)" : "rgba(200,235,255,0.9)", 1.6);
      T(ctx, (n2 < 1.4 ? "水" : "玻璃") + " n₂ = " + n2.toFixed(2), bx1 - 10, benchY - 12, { size: 12, align: "right", color: col("text"), weight: "600" });
      T(ctx, "空氣 n₁ = 1.00", bx1 - 10, ys - 8, { size: 11, align: "right", color: col("text-dim") });
      D.line(ctx, X0, ys - H * 0.36, X0, ys + H * 0.3, PL.theme.pale(0.45), 1, [4, 4]);

      const Ll = Math.min(H * 0.36, W * 0.28), Lp = Ll * 0.78;
      const las = { x: X0 - Ll * Math.sin(th), y: ys - Ll * Math.cos(th) }, P0 = { x: X0, y: ys };
      const ur = { x: Math.sin(th), y: -Math.cos(th) }, pc = { x: X0 + ur.x * Lp, y: ys + ur.y * Lp }, det = { x: X0 + ur.x * (Lp + 76), y: ys + ur.y * (Lp + 76) };
      G.pc = pc;
      const tl = (benchY - ys) / Math.max(0.2, Math.cos(tt)), tEnd = { x: X0 + Math.sin(tt) * tl, y: ys + Math.cos(tt) * tl };
      // 光束與偏振記號：s 與 p 振幅各自依菲涅耳係數，畫面內各光束自己正規化
      const v = 60, aS = Math.sqrt(F.Rs), aP = Math.sqrt(F.Rp), mx = Math.max(aS, aP, 1e-6);
      const tS = Math.sqrt(1 - F.Rs), tP = Math.sqrt(1 - F.Rp), mt = Math.max(tS, tP, 1e-6);
      beam(ctx, las, P0, 1, 2.4);
      beam(ctx, P0, pc, 0.25 + 0.75 * Math.min(1, R * 4), 2);
      beam(ctx, pc, det, Math.min(1, Iout * 8), 1.8);
      beam(ctx, P0, tEnd, 0.35 + 0.65 * (1 - R), 2);
      polMarks(ctx, las, P0, t, v, 1, 1, 1);
      polMarks(ctx, P0, pc, t, v, aS / mx, aP / mx, 0.65 + 0.35 * Math.min(1, R * 5));
      polMarks(ctx, P0, tEnd, t, v / n2, tS / mt, tP / mt, 0.9);
      // 角度：θ₁、θt，以及反射光與折射光的夾角
      arcA(ctx, X0, ys, 34, -Math.PI / 2 - th, -Math.PI / 2, col("text"));
      T(ctx, "θ₁", X0 - 8 - 40 * Math.sin(th / 2), ys - 40 * Math.cos(th / 2), { size: 12, align: "right", color: col("text"), weight: "700" });
      arcA(ctx, X0, ys, 34, Math.PI / 2 - tt, Math.PI / 2, col("text"));
      T(ctx, "θt", X0 + 6 + 40 * Math.sin(tt / 2), ys + 44 * Math.cos(tt / 2) + 4, { size: 12, color: col("text"), weight: "700" });
      const angR = -(Math.PI / 2 - th), angT = Math.PI / 2 - tt, between = 180 - (th + tt) / DEG, atB = Math.abs(th - tB) < 0.6 * DEG;
      if (atB) {
        const k = 14, a = { x: Math.cos(angR) * k, y: Math.sin(angR) * k }, b = { x: Math.cos(angT) * k, y: Math.sin(angT) * k };
        ctx.save(); ctx.strokeStyle = PL.theme.ink(ctx, col("ok"), X0, ys); ctx.lineWidth = 1.6; ctx.beginPath();
        ctx.moveTo(X0 + a.x, ys + a.y); ctx.lineTo(X0 + a.x + b.x, ys + a.y + b.y); ctx.lineTo(X0 + b.x, ys + b.y); ctx.stroke(); ctx.restore();
      } else arcA(ctx, X0, ys, 20, angR, angT, col("warn"));
      const mid = (angR + angT) / 2;
      T(ctx, atB ? "90°" : fmt(between, 0) + "°", X0 + Math.cos(mid) * 30 + 4, ys + Math.sin(mid) * 30 + 4, { size: 12, color: atB ? col("ok") : col("warn"), weight: "700" });
      PL.motion.flow(ctx, [[las.x, las.y], [X0, ys]], t * 90, { gap: 18, r: 2, color: "#ffecb3" });
      AP.laser(ctx, las.x, las.y, Math.atan2(ys - las.y, X0 - las.x));
      // 偏光片（正面）與光度計
      AP.polarizer(ctx, pc.x, pc.y, 24, phi - Math.PI / 2);
      T(ctx, "偏光片", pc.x + 30, pc.y + 4, { size: 11.5, color: col("text"), weight: "600" });
      ctx.save(); AP.rrPath(ctx, det.x - 24, det.y - 15, 48, 30, 5); ctx.fillStyle = "rgb(40,44,52)"; ctx.fill(); ctx.restore();
      AP.lcd(ctx, det.x - 20, det.y - 10, 40, 20, (Iout * 100).toFixed(1) + "%", { size: 11 });
      T(ctx, "光度計", det.x, det.y - 20, { size: 11, align: "center", color: col("text-dim") });
      // 反射率曲線：Rs、Rp 對入射角
      const box = { x: 44, y: ys + 26, w: Math.max(80, bx0 - 64), h: benchY - ys - 60 };
      if (box.h > 50) {
        const gr = PL.graph(cv, box, { x0: 0, x1: 90, y0: 0, y1: 1 });
        gr.frame({ title: "反射率–入射角", ylabel: "R", tickCount: 3 });
        const sc = light ? "#1565c0" : "#82b1ff", pcl = light ? "#2e7d32" : "#a5d6a7";
        gr.fn(x => fresnel(1, n2, x * DEG).Rs, { color: sc, width: 2 });
        gr.fn(x => fresnel(1, n2, x * DEG).Rp, { color: pcl, width: 2 });
        gr.vline(tB / DEG, { color: col("ok"), width: 1.2, dash: [4, 3] });
        gr.vline(th / DEG, { color: col("danger"), width: 1.4 });
        gr.label(22, 0.9, "Rs（點）", { color: sc, size: 10.5 });
        gr.label(22, 0.76, "Rp（線）", { color: pcl, size: 10.5 });
        gr.label(tB / DEG, 0.3, "θB", { color: col("ok"), size: 11, dx: 3, weight: "700" });
      }
      card(ctx, 12, 12, [["tan θB = n₂ / n₁", col("text"), "700"], ["θB = tan⁻¹(" + n2.toFixed(2) + ") = " + fmt(tB / DEG, 1) + "°", col("ok"), "600"], ["θB + θt = 90°", col("text")]], { size: 12 });

      hLas.place(las.x, las.y);
      hPol.place(pc.x + Math.sin(phi - Math.PI / 2) * 30, pc.y - Math.cos(phi - Math.PI / 2) * 30);
      const pol = (F.Rs - F.Rp) / (F.Rs + F.Rp);
      rB.set(tB / DEG, 1); rT.set(tt / DEG, 1); rAng.set(between, 1); rR.set(R * 100, 2); rPol.set(pol * 100, 1); rI.set(Iout * 100, 2);
      if (atB) vd.set("布魯斯特角：反射光只剩垂直入射面（平行水面）的振動——完全偏振，而且反射光 ⟂ 折射光" + (Iout < 0.002 ? "；偏光片透光軸鉛直，眩光被完全擋掉" : ""), "ok");
      else vd.set("反射光部分偏振（偏振度 " + fmt(pol * 100, 0) + "%）：入射角" + (th < tB ? "再加大" : "再減小") + "到 θB = " + fmt(tB / DEG, 1) + "° 時才完全偏振", "info");
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* =====================================================================
     四行程引擎（理想奧圖循環）
     曲軸角 0–720°：進氣 0–180、壓縮 180–360、動力 360–540、排氣 540–720。
     活塞位置用曲柄連桿的精確幾何；汽缸壓力：壓縮與膨脹走絕熱 PV^γ = 定值，
     上死點點火時等容加熱 Q入，下死點排氣門開時等容降壓（Q出 隨廢氣離開）。
     單缸排氣量 500 cm³，每循環 Q入 = 900 J，η = 1 − 1/r^(γ−1)。
     畫面放慢 30 倍，轉速仍與油門成正比。
     ===================================================================== */
  const P0 = 100, T1 = 300, VS = 500, GAM = 1.4, QIN = 900, RG = 8.314, LAM = 3.2, SLOW = 30;
  function otto(r) {
    const Vc = VS / (r - 1), V1 = VS + Vc, n = P0 * 1e3 * V1 * 1e-6 / (RG * T1);
    const T2 = T1 * Math.pow(r, GAM - 1), T3 = T2 + QIN / (n * 2.5 * RG);
    const P2 = P0 * Math.pow(r, GAM), P3 = P2 * T3 / T2, P4 = P3 / Math.pow(r, GAM), T4 = T3 / Math.pow(r, GAM - 1);
    const eta = 1 - Math.pow(r, 1 - GAM);
    return { Vc, V1, n, T2, T3, P2, P3, P4, eta, W: eta * QIN, Tex: T4 * Math.pow(P0 / P4, (GAM - 1) / GAM) };
  }
  const crankDisp = ph => { const a = ph * DEG; return (1 + LAM - (Math.cos(a) + Math.sqrt(LAM * LAM - Math.sin(a) ** 2))) / 2; };
  function engineState(ph, c) {
    const V = c.Vc + VS * crankDisp(ph);
    const comp = P0 * Math.pow(c.V1 / V, GAM), pw = c.P3 * Math.pow(c.Vc / V, GAM);
    let P, k;
    if (ph < 180) { P = P0; k = 0; }
    else if (ph < 360) { P = comp; k = 1; }
    else if (ph < 540) { P = comp + (pw - comp) * sstep(clamp((ph - 360) / 14, 0, 1)); k = 2; }
    else { P = pw + (P0 - pw) * sstep(clamp((ph - 540) / 16, 0, 1)); k = 3; }
    const Tk = k === 0 ? T1 : Math.max(k === 3 ? c.Tex : 0, P * 1e3 * V * 1e-6 / (c.n * RG));
    return { V, P, k, T: Tk };
  }
  const STROKES = [
    ["① 進氣行程", "進氣門開，活塞下行，吸入汽油＋空氣", "#42a5f5"],
    ["② 壓縮行程", "兩門關閉，活塞上行壓縮混合氣（靠飛輪慣性）", "#ffa726"],
    ["③ 動力行程", "火星塞點火，高溫高壓氣體推活塞下行——對外做功", "#ef5350"],
    ["④ 排氣行程", "排氣門開，活塞上行把廢氣推出（帶走 Q出）", "#9e9e9e"]
  ];

  PL.register("four-stroke-engine", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sRpm = PL.ui.slider(L.controls, { label: "轉速（油門）", min: 800, max: 6000, step: 100, value: 2400, unit: "rpm", digits: 0, onInput: () => draw() });
    const sR = PL.ui.slider(L.controls, { label: "壓縮比 r = V最大 / V最小", min: 6, max: 12, step: 0.5, value: 9, digits: 1, onInput: () => draw() });
    PL.ui.presets(L.controls, { label: "情境", options: [
      { label: "怠速 800 rpm", apply: () => { sRpm.set(800); draw(); } },
      { label: "全油門 6000 rpm", hint: "每循環做功不變，每秒循環數變多 → 功率變大", apply: () => { sRpm.set(6000); draw(); } },
      { label: "低壓縮比 r = 6", apply: () => { sR.set(6); draw(); } },
      { label: "高壓縮比 r = 12", hint: "壓縮比越大，理想效率越高", apply: () => { sR.set(12); draw(); } }
    ]});
    PL.ui.note(L.controls, "直接拖進氣管上的油門拉桿改轉速；抓住飛輪可以用手慢慢轉曲軸，一格一格看四個行程。只有動力行程對外做功，其餘三個行程靠飛輪的慣性帶過。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "Q入（每循環）", unit: "J" }, { label: "W = Q入 − Q出", unit: "J" }, { label: "Q出（廢氣＋冷卻）", unit: "J" }, { label: "η = W / Q入", unit: "%" }]);
    const rS = PL.ui.readout(L.readouts, { label: "目前行程" });
    const rA = PL.ui.readout(L.readouts, { label: "曲軸角度（一循環 720°）", unit: "°" });
    const rP = PL.ui.readout(L.readouts, { label: "汽缸內壓力", unit: "kPa" });
    const rE = PL.ui.readout(L.readouts, { label: "理想效率 η", unit: "%" });
    const rW = PL.ui.readout(L.readouts, { label: "輸出功率 P = W × (rpm/2) / 60", unit: "kW" });
    let phi = 30, therm = 0, grabbed = false;
    const G = { cx: 0, cy: 0, piv: { x: 0, y: 0 } };
    const hThr = PL.ui.handle(cv, { slider: sRpm, label: "油門拉桿（轉速）", toValue: (x, y) => {
      const a = Math.atan2(x - G.piv.x, G.piv.y - y) / DEG; return 800 + clamp(a / 80, 0, 1) * 5200; } });
    const hCr = PL.ui.handle(cv, { label: "飛輪（用手轉曲軸）", onGrab: () => { grabbed = true; }, onRelease: () => { grabbed = false; },
      onDrag: (x, y) => {
        const a = (Math.atan2(x - G.cx, G.cy - y) / DEG + 360) % 360;
        let c = Math.floor(phi / 360) * 360 + a;
        if (c - phi > 180) c -= 360; if (phi - c > 180) c += 360;
        phi = ((c % 720) + 720) % 720; draw();
      } });
    const clock = PL.motion.clock((dt) => draw(dt), { ambient: true });

    function draw(dt) {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const rpm = sRpm.get(), r = sR.get(), c = otto(r), t = clock.t, light = isL();
      if (dt > 0 && !grabbed) phi = (phi + dt * 6 * rpm / SLOW) % 720;
      const st = engineState(phi, c);
      if (dt > 0) therm += dt * Math.sqrt(st.T / 300);
      const benchY = Math.round(H * 0.95);
      AP.labRoom(ctx, W, H, benchY);
      // ---------- 引擎剖面 ----------
      const ex = Math.round(W * 0.25), bw = Math.min(H * 0.2, W * 0.16), wall = bw * 0.28;
      const Cy = H * 0.79, cr = H * 0.083, lr = cr * LAM, pistonH = H * 0.075;
      const crownT = Cy - cr - lr - H * 0.05, hc = 2 * cr / (r - 1), yc = crownT - hc;
      const a = phi * DEG, pin = { x: ex + cr * Math.sin(a), y: Cy - cr * Math.cos(a) };
      const yPin = Cy - (cr * Math.cos(a) + Math.sqrt(lr * lr - (cr * Math.sin(a)) ** 2)), yCrown = yPin - H * 0.05;
      const blockBot = crownT + 2 * cr + pistonH + 6, xl = ex - bw / 2, xr = ex + bw / 2, headTop = yc - H * 0.085;
      G.cx = ex; G.cy = Cy;
      // 曲軸箱
      const ck = ctx.createLinearGradient(0, blockBot, 0, Cy + cr * 1.8);
      ck.addColorStop(0, "rgb(70,76,86)"); ck.addColorStop(1, "rgb(40,44,52)");
      AP.rrPath(ctx, xl - wall - 10, blockBot - 4, bw + 2 * wall + 20, Cy + cr * 1.8 - blockBot, 16); ctx.fillStyle = ck; ctx.fill();
      ctx.fillStyle = "rgb(26,29,35)"; AP.rrPath(ctx, xl - wall, blockBot, bw + 2 * wall, Cy + cr * 1.65 - blockBot, 12); ctx.fill();
      AP.flywheel(ctx, ex, Cy, cr * 1.5, a, cr * 1.24, 6);
      // 曲柄臂＋配重、連桿
      ctx.save(); ctx.lineCap = "round";
      // 配重在曲柄銷的對面（畫布角度：銷在 a − π/2，配重在 a + π/2）
      ctx.fillStyle = "rgb(120,128,140)"; ctx.beginPath(); ctx.moveTo(ex, Cy); ctx.arc(ex, Cy, cr * 0.8, a + Math.PI / 2 - 1, a + Math.PI / 2 + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgb(150,158,170)"; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(ex, Cy); ctx.lineTo(pin.x, pin.y); ctx.stroke();
      ctx.strokeStyle = "rgb(60,66,76)"; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(pin.x, pin.y); ctx.lineTo(ex, yPin); ctx.stroke();
      ctx.strokeStyle = "rgb(176,184,196)"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(pin.x, pin.y); ctx.lineTo(ex, yPin); ctx.stroke();
      ctx.restore();
      AP.brassDisc(ctx, pin.x, pin.y, 5); AP.brassDisc(ctx, ex, Cy, 6);
      // 汽缸壁（含冷卻水套：帶走一部分 Q出）
      AP.steel(ctx, xl - wall, yc, wall, blockBot - yc); AP.steel(ctx, xr, yc, wall, blockBot - yc);
      [xl - wall * 0.65, xr + wall * 0.25].forEach(jx => {
        ctx.fillStyle = "rgba(66,165,245,0.7)"; ctx.fillRect(jx, yc + 6, wall * 0.4, blockBot - yc - 18);
        PL.motion.flow(ctx, [[jx + wall * 0.2, blockBot - 14], [jx + wall * 0.2, yc + 8]], t * 18, { gap: 12, r: 1.4, color: "#e3f2fd", glow: false });
      });
      // 汽缸內氣體：顏色隨溫度
      const hot = clamp((st.T - 300) / 2400, 0, 1);
      ctx.fillStyle = st.k === 3 ? "rgba(150,150,150,0.35)" : st.k === 2 ? "rgba(255," + Math.round(150 - 70 * hot) + ",40," + (0.18 + 0.45 * hot).toFixed(2) + ")" : "rgba(120,200,255,0.28)";
      ctx.fillRect(xl, yc, bw, Math.max(0, yCrown - yc));
      if (phi > 358 && phi < 440) {
        const gl = ctx.createRadialGradient(ex, yc, 2, ex, yc, bw * 0.9), k = 1 - (phi - 358) / 82;
        gl.addColorStop(0, "rgba(255,240,170," + (0.9 * k).toFixed(2) + ")"); gl.addColorStop(1, "rgba(255,120,30,0)");
        ctx.save(); ctx.beginPath(); ctx.rect(xl, yc, bw, yCrown - yc); ctx.clip(); ctx.fillStyle = gl; ctx.fillRect(xl, yc, bw, yCrown - yc); ctx.restore();
      }
      // 氣體分子：進氣時逐漸進來、排氣時逐漸被推出；速率隨 √T
      const NM = 44, nVis = st.k === 0 || st.k === 3 ? Math.round(NM * (st.V / c.V1)) : NM, rnd = seeded(11);
      for (let i = 0; i < NM; i++) {
        const u0 = rnd(), v0 = rnd(), au = 0.5 + rnd(), av = 0.5 + rnd();
        if (i >= nVis) continue;
        const x = xl + 4 + tri(u0 + au * therm * 0.6) * (bw - 8), y = yc + 3 + tri(v0 + av * therm * 0.6) * Math.max(1, yCrown - yc - 6);
        ctx.fillStyle = st.k === 3 ? "#757575" : st.k === 2 ? (hot > 0.45 ? "#ff6d00" : "#bf360c") : i % 5 === 0 ? "#ff8f00" : light ? "#0277bd" : "#4fc3f7";
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill();
      }
      // 活塞
      AP.steel(ctx, xl + 1, yCrown, bw - 2, pistonH);
      ctx.fillStyle = "rgba(20,24,30,0.6)"; [5, 9, 13].forEach(k => ctx.fillRect(xl + 1, yCrown + k, bw - 2, 1.5));
      AP.brassDisc(ctx, ex, yPin, 5);
      // 汽缸頭、進排氣道、氣門與彈簧、火星塞
      AP.steel(ctx, xl - wall, headTop, bw + 2 * wall, yc - headTop);
      const portY = yc - H * 0.045, vxI = ex - bw * 0.27, vxE = ex + bw * 0.27, pW = bw * 0.2;
      const liftI = phi < 180 ? Math.sin(phi * DEG) : 0, liftE = phi >= 540 ? Math.sin((phi - 540) * DEG) : 0;
      const intakeGas = light ? "rgb(150,205,240)" : "rgb(70,130,170)", exGas = "rgb(120,120,120)";
      [[vxI, xl - wall - bw * 0.85, intakeGas], [vxE, xr + wall + bw * 0.75, exGas]].forEach(([vx, endX, gc]) => {
        ctx.save(); ctx.lineCap = "butt"; ctx.lineJoin = "round";
        ctx.strokeStyle = "rgb(58,62,70)"; ctx.lineWidth = pW + 8;
        ctx.beginPath(); ctx.moveTo(vx, yc); ctx.lineTo(vx + (endX < vx ? -8 : 8), portY); ctx.lineTo(endX, portY); ctx.stroke();
        ctx.strokeStyle = gc; ctx.lineWidth = pW;
        ctx.beginPath(); ctx.moveTo(vx, yc + 1); ctx.lineTo(vx + (endX < vx ? -8 : 8), portY); ctx.lineTo(endX, portY); ctx.stroke();
        ctx.restore();
      });
      if (liftI > 0.05) PL.motion.flow(ctx, [[xl - wall - bw * 0.85, portY], [vxI - 8, portY], [vxI, yc]], t * 70, { gap: 9, r: 2, color: light ? "#0277bd" : "#b3e5fc", glow: false });
      if (liftE > 0.05) PL.motion.flow(ctx, [[vxE, yc], [vxE + 8, portY], [xr + wall + bw * 0.75, portY]], t * 70, { gap: 9, r: 2.2, color: "#e0e0e0", glow: false });
      [[vxI, liftI], [vxE, liftE]].forEach(([vx, lf]) => {
        const vy = yc + lf * H * 0.022, sTop = headTop - H * 0.06;
        D.spring(ctx, vx, sTop, vx, headTop - 2, 5, 5, "#b0bec5");
        AP.steel(ctx, vx - 1.5, sTop, 3, vy - sTop);
        ctx.fillStyle = "rgb(150,158,170)"; ctx.beginPath(); ctx.moveTo(vx - pW * 0.65, vy); ctx.lineTo(vx + pW * 0.65, vy); ctx.lineTo(vx + 2, vy - 6); ctx.lineTo(vx - 2, vy - 6); ctx.closePath(); ctx.fill();
      });
      const plugTop = headTop - H * 0.07;
      const ce = ctx.createLinearGradient(ex - 5, 0, ex + 5, 0); ce.addColorStop(0, "#d7d7d7"); ce.addColorStop(0.5, "#ffffff"); ce.addColorStop(1, "#bdbdbd");
      ctx.fillStyle = ce; ctx.fillRect(ex - 5, plugTop, 10, headTop - plugTop + 2);
      AP.steel(ctx, ex - 8, headTop - 4, 16, 8);
      ctx.fillStyle = "rgb(90,96,104)"; ctx.fillRect(ex - 1.5, headTop + 4, 3, yc - headTop - 2);
      if (phi > 352 && phi < 366) {
        ctx.save(); ctx.strokeStyle = "rgba(255,255,210,1)"; ctx.shadowColor = "#fff59d"; ctx.shadowBlur = 14; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) { const b = i * TAU / 8 + t * 9; ctx.beginPath(); ctx.moveTo(ex, yc + 3); ctx.lineTo(ex + Math.cos(b) * 10, yc + 3 + Math.sin(b) * 8); ctx.stroke(); }
        ctx.restore();
      }
      // 油門：進氣管上的節氣門（蝶形閥）與拉桿
      const f = (rpm - 800) / 5200, tx = xl - wall - bw * 0.5, fa = f * 80 * DEG;
      ctx.save(); ctx.strokeStyle = "rgb(40,44,52)"; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(tx - Math.sin(fa) * pW * 0.5, portY - Math.cos(fa) * pW * 0.5); ctx.lineTo(tx + Math.sin(fa) * pW * 0.5, portY + Math.cos(fa) * pW * 0.5); ctx.stroke(); ctx.restore();
      const piv = { x: tx, y: portY - pW / 2 - 4 }, tip = { x: piv.x + Math.sin(fa) * 30, y: piv.y - Math.cos(fa) * 30 };
      G.piv = piv;
      ctx.save(); ctx.strokeStyle = "rgb(200,60,50)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(piv.x, piv.y); ctx.lineTo(tip.x, tip.y); ctx.stroke(); ctx.restore();
      AP.brassDisc(ctx, piv.x, piv.y, 3.5);
      T(ctx, "油門", piv.x - 10, piv.y - 8, { size: 11, align: "right", color: col("text"), weight: "600" });
      T(ctx, "混合氣", xl - wall - bw * 0.85, portY + pW / 2 + 16, { size: 10.5, color: col("text-dim") });
      T(ctx, "廢氣", xr + wall + bw * 0.75, portY + pW / 2 + 16, { size: 10.5, align: "right", color: col("text-dim") });
      T(ctx, "火星塞", ex + 9, plugTop + 4, { size: 10.5, color: col("text-dim") });
      T(ctx, "活塞", xr + wall + 6, yCrown + pistonH / 2 + 4, { size: 10.5, color: col("text-dim") });
      T(ctx, "飛輪", xr + wall + 16, Cy + 4, { size: 10.5, color: col("text-dim") });
      const dir = st.k === 0 || st.k === 2 ? 1 : -1;
      D.arrow(ctx, xr + wall + 30, yCrown + 10 - dir * 12, xr + wall + 30, yCrown + 10 + dir * 12, { color: STROKES[st.k][2], width: 2.4, head: 8 });
      T(ctx, STROKES[st.k][0], 12, 24, { size: 15, color: STROKES[st.k][2], weight: "700" });
      T(ctx, STROKES[st.k][1], 12, 42, { size: 11.5, color: col("text") });

      // ---------- P–V 圖 ----------
      const gx = Math.round(W * 0.53), gy = Math.round(H * 0.08), gw = Math.round(W * 0.44), gh = Math.round(H * 0.38);
      const gr = PL.graph(cv, { x: gx, y: gy, w: gw, h: gh }, { x0: 0, x1: 600, y0: 0, y1: 12 });
      gr.frame({ title: "P–V 圖（理想奧圖循環）", xlabel: "V (cm³)", ylabel: "P (MPa)", tickCount: 4 });
      const comp = [], exp = [];
      for (let i = 0; i <= 48; i++) { const V = c.Vc + (c.V1 - c.Vc) * i / 48; comp.push([V, P0 * Math.pow(c.V1 / V, GAM) / 1e3]); exp.push([V, c.P3 * Math.pow(c.Vc / V, GAM) / 1e3]); }
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip(); ctx.beginPath();
      exp.forEach((p, i) => i ? ctx.lineTo(gr.X(p[0]), gr.Y(p[1])) : ctx.moveTo(gr.X(p[0]), gr.Y(p[1])));
      for (let i = comp.length - 1; i >= 0; i--) ctx.lineTo(gr.X(comp[i][0]), gr.Y(comp[i][1]));
      ctx.closePath(); ctx.fillStyle = "rgba(239,83,80,0.18)"; ctx.fill(); ctx.restore();
      gr.curve([[c.Vc, P0 / 1e3], [c.V1, P0 / 1e3]], { color: "#42a5f5", width: 2 });
      gr.curve(comp, { color: "#ffa726", width: 2 });
      gr.curve([[c.Vc, c.P2 / 1e3], [c.Vc, c.P3 / 1e3]], { color: "#ef5350", width: 2, dash: [4, 3] });
      gr.curve(exp, { color: "#ef5350", width: 2.2 });
      gr.curve([[c.V1, c.P4 / 1e3], [c.V1, P0 / 1e3]], { color: "#9e9e9e", width: 2, dash: [4, 3] });
      gr.label(c.Vc, c.P3 / 1e3, "點火 Q入", { dx: 6, dy: 4, size: 10.5, color: col("danger"), weight: "700" });
      gr.label(c.V1, c.P4 / 1e3, "Q出", { dx: -30, dy: -16, size: 10.5, color: col("text-dim"), weight: "700" });
      gr.label((c.Vc + c.V1) / 2, c.P3 / 1e3 * 0.2, "面積 = W", { dx: -20, size: 11, color: col("danger"), weight: "700" });
      gr.dot(st.V, st.P / 1e3, { r: 5, color: STROKES[st.k][2], glow: STROKES[st.k][2] });
      // 行程時間軸：曲軸轉兩圈完成一個循環
      const ty = gy + gh + 34, sw = gw / 4;
      STROKES.forEach((s, i) => {
        D.rect(ctx, gx + i * sw + 1, ty, sw - 2, 16, { fill: s[2], r: 3 });
        T(ctx, s[0].slice(2, 4), gx + i * sw + sw / 2, ty + 12, { size: 10.5, align: "center", color: "#ffffff", weight: "700" });
      });
      const mx = gx + gw * phi / 720;
      D.arrow(ctx, mx, ty - 10, mx, ty - 1, { color: col("text"), width: 2, head: 6 });
      T(ctx, "曲軸第 1 圈", gx + gw * 0.25, ty + 30, { size: 10.5, align: "center", color: col("text-dim") });
      T(ctx, "第 2 圈（一循環 = 2 圈）", gx + gw * 0.75, ty + 30, { size: 10.5, align: "center", color: col("text-dim") });
      // 每循環能量流
      const ey = ty + 44, eh = Math.min(H - ey - 10, 130);
      if (eh > 60) {
        AP.infoCard(ctx, gx, ey, gw, eh);
        const bx = gx + 12, bwid = gw - 24;
        T(ctx, "每循環能量：W = Q入 − Q出", bx, ey + 18, { size: 12, color: col("text"), weight: "700" });
        D.rect(ctx, bx, ey + 26, bwid, 12, { fill: "#ff9800", r: 3 });
        T(ctx, "Q入 = " + QIN + " J（燃料化學能）", bx + 4, ey + 52, { size: 10.5, color: col("text") });
        D.rect(ctx, bx, ey + 58, bwid * c.eta, 12, { fill: "#43a047", r: 3 });
        D.rect(ctx, bx + bwid * c.eta + 2, ey + 58, bwid * (1 - c.eta) - 2, 12, { fill: "#9e9e9e", r: 3 });
        T(ctx, "W = " + fmt(c.W, 0) + " J", bx + 4, ey + 84, { size: 10.5, color: col("ok"), weight: "700" });
        T(ctx, "Q出 = " + fmt(QIN - c.W, 0) + " J", bx + bwid, ey + 84, { size: 10.5, align: "right", color: col("text-dim"), weight: "700" });
        if (eh > 100) T(ctx, "η = 1 − 1/r^(γ−1) = " + fmt(c.eta * 100, 1) + "% < 1（實際引擎約 30%）", bx, ey + 102, { size: 11, color: col("text") });
      }

      hThr.place(tip.x, tip.y);
      hCr.place(pin.x, pin.y);
      const kw = c.W * rpm / 120 / 1000;
      rS.set(STROKES[st.k][0].slice(2)); rA.set(phi, 0); rP.set(st.P, 0); rE.set(c.eta * 100, 1); rW.set(kw, 2);
      dv.set(0, QIN, 0); dv.set(1, c.W, 0); dv.set(2, QIN - c.W, 0); dv.set(3, c.eta * 100, 1);
      vd.set(st.k === 2 ? "動力行程：燃氣推動活塞——四個行程中唯一對外做功的行程（內能 → 機械能）"
        : st.k === 1 ? "壓縮行程：飛輪的慣性推活塞上行，外界對氣體做功，混合氣溫度升高"
          : st.k === 0 ? "進氣行程：活塞下行吸入混合氣，靠飛輪慣性帶動" : "排氣行程：廢氣帶著無法利用的熱 Q出 離開，所以 η 不可能 100%",
        st.k === 2 ? "ok" : st.k === 3 ? "warn" : "info");
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* =====================================================================
     布朗運動與擴散
     左：顯微鏡視野。花粉顆粒的位移每一步取 √(2D·Δt) × 常態亂數，
     D = kT / (6πηa)（斯托克斯—愛因斯坦），水的黏滯係數 η 隨溫度下降。
     藍點是「示意放大」的水分子，只表達「被四面八方撞擊」；真正的分子小到看不見。
     右：墨水在靜水中擴散（D_墨 約 4×10⁻¹⁰ m²/s 並隨 T/η 變大），
     ⟨x²⟩ 隨時間成直線：⟨x²⟩ = 2Dt，所以擴散距離 ∝ √t。
     ===================================================================== */
  const KB = 1.380649e-23, M_H2O = 18.015 * 1.66054e-27;
  const etaW = TK => 2.414e-5 * Math.pow(10, 247.8 / (TK - 140));
  const dGrain = (TK, a) => KB * TK / (6 * Math.PI * etaW(TK) * a * 1e-6) * 1e12;   // μm²/s
  const dInk = TK => 4e-10 * (TK / 293.15) * (etaW(293.15) / etaW(TK));             // m²/s

  PL.register("brownian-diffusion", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sT = PL.ui.slider(L.controls, { label: "水溫 T", min: 0, max: 100, step: 1, value: 20, unit: "°C", digits: 0, onInput: () => { resetInk(); draw(); } });
    const sA = PL.ui.slider(L.controls, { label: "花粉顆粒半徑 a", min: 0.5, max: 3, step: 0.1, value: 1, unit: "μm", digits: 1, onInput: () => draw() });
    PL.ui.presets(L.controls, { label: "比較", options: [
      { label: "冰水 0 °C", apply: () => { sT.set(0); resetInk(); draw(); } },
      { label: "室溫 20 °C", apply: () => { sT.set(20); resetInk(); draw(); } },
      { label: "熱水 80 °C", hint: "分子更快、黏滯更小 → 跳得更劇烈、擴散更快", apply: () => { sT.set(80); resetInk(); draw(); } },
      { label: "大顆粒 3 μm", hint: "越大越不容易被撞得不平衡", apply: () => { sA.set(3); draw(); } },
      { label: "小顆粒 0.5 μm", apply: () => { sA.set(0.5); draw(); } }
    ]});
    const cz = PL.ui.causality(L.controls, { title: "誰決定誰", rows: [
      { name: "溫度 T ↑", note: "分子平均動能 ½mv² = 3/2 kT 只由溫度決定" },
      { name: "顆粒半徑 a ↓", note: "顆粒越小，各方向撞擊越難互相抵消" }] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rKE = PL.ui.readout(L.readouts, { label: "水分子平均動能 3/2 kT", unit: "×10⁻²¹ J" });
    const rV = PL.ui.readout(L.readouts, { label: "水分子方均根速率", unit: "m/s" });
    const rD = PL.ui.readout(L.readouts, { label: "顆粒擴散係數 D", unit: "μm²/s" });
    const rX = PL.ui.readout(L.readouts, { label: "顆粒 10 秒內方均根位移 √(2D·10 s)", unit: "μm" });
    const rDi = PL.ui.readout(L.readouts, { label: "墨水擴散係數", unit: "×10⁻¹⁰ m²/s" });

    const RF = 20, rnd = seeded(5);
    const grains = [[-7, -5], [8, 3], [1, 10]].map(p => ({ x: p[0], y: p[1], tr: [] }));
    const mols = Array.from({ length: 120 }, () => { const a = rnd() * TAU, rr = Math.sqrt(rnd()) * RF, b = rnd() * TAU; return { x: rr * Math.cos(a), y: rr * Math.sin(a), dx: Math.cos(b), dy: Math.sin(b) }; });
    let flashes = [], ink = [], inkT = 0, hist = [], lastS = 0, held = false;
    const HX = 25, HY = 10;   // 局部水域：寬 50 mm、深 20 mm（牆遠到不影響 12 小時內的擴散）
    function resetInk() { const r2 = seeded(9); ink = Array.from({ length: 260 }, () => ({ x: (r2() - 0.5) * 1.2, y: (r2() - 0.5) * 1.2 })); inkT = 0; hist = [[0, 0]]; lastS = 0; }
    resetInk();
    const G = { mx: 0, my: 0, pu: 1, th: { x: 0, y0: 0, y1: 1 } };
    const hTh = PL.ui.handle(cv, { slider: sT, label: "溫度計（拖液柱改水溫）", toValue: (x, y) => 100 * (G.th.y1 - y) / (G.th.y1 - G.th.y0) });
    const hG = PL.ui.handle(cv, { slider: sA, label: "花粉顆粒邊緣（拖動改大小）", onGrab: () => { held = true; }, onRelease: () => { held = false; },
      toValue: (x, y) => (Math.hypot(x - (G.mx + grains[0].x * G.pu), y - (G.my + grains[0].y * G.pu)) - 4) / G.pu });

    function step(dt) {
      const TK = sT.get() + 273.15, a = sA.get(), Dg = dGrain(TK, a), k = Math.sqrt(2 * Dg * dt * 10);
      grains.forEach((g, i) => {
        if (!(i === 0 && held)) { g.x += k * gauss(); g.y += k * gauss(); }
        const rr = Math.hypot(g.x, g.y), lim = RF - a - 0.5; if (rr > lim) { g.x *= lim / rr; g.y *= lim / rr; }
        g.tr.push([g.x, g.y]); if (g.tr.length > 300) g.tr.shift();
      });
      const vm = 26 * Math.sqrt(TK / 293);
      mols.forEach(m => {
        m.x += m.dx * vm * dt; m.y += m.dy * vm * dt;
        if (Math.random() < dt * 3) { const b = Math.random() * TAU; m.dx = Math.cos(b); m.dy = Math.sin(b); }
        if (Math.hypot(m.x, m.y) > RF) { m.x *= -0.97; m.y *= -0.97; }
        grains.forEach(g => {
          const qx = m.x - g.x, qy = m.y - g.y, q = Math.hypot(qx, qy);
          if (q < a + 0.25 && q > 1e-6) {
            const nx = qx / q, ny = qy / q, dd = m.dx * nx + m.dy * ny;
            if (dd < 0) { m.dx -= 2 * dd * nx; m.dy -= 2 * dd * ny; flashes.push({ x: g.x + nx * a, y: g.y + ny * a, life: 0.22, g }); }
            m.x = g.x + nx * (a + 0.26); m.y = g.y + ny * (a + 0.26);
          }
        });
      });
      flashes.forEach(f => { f.life -= dt; }); flashes = flashes.filter(f => f.life > 0).slice(-60);
      const idt = dt * 3600, kk = Math.sqrt(2 * dInk(TK) * idt) * 1e3;
      ink.forEach(p => {
        p.x += kk * gauss(); p.y += kk * gauss();
        if (p.x > HX) p.x = 2 * HX - p.x; if (p.x < -HX) p.x = -2 * HX - p.x;
        if (p.y > HY) p.y = 2 * HY - p.y; if (p.y < -HY) p.y = -2 * HY - p.y;
      });
      inkT += idt;
      if (inkT - lastS >= 900) { lastS = inkT; hist.push([inkT / 3600, ink.reduce((s, p) => s + p.x * p.x, 0) / ink.length]); }
      if (inkT > 12 * 3600) resetInk();
    }
    const clock = PL.motion.clock((dt) => { if (dt > 0) step(Math.min(dt, 0.05)); draw(); }, { ambient: true });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const light = isL(), TK = sT.get() + 273.15, a = sA.get();
      const benchY = Math.round(H * 0.56);
      AP.labRoom(ctx, W, H, benchY);
      // ---------- 顯微鏡視野 ----------
      const mx = W * 0.25, my = H * 0.5, Rv = Math.min(W * 0.22, H * 0.42), pu = Rv / RF;
      Object.assign(G, { mx, my, pu });
      const ring = ctx.createRadialGradient(mx, my, Rv, mx, my, Rv + 14);
      ring.addColorStop(0, "rgb(14,14,16)"); ring.addColorStop(1, "rgba(14,14,16,0)");
      ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(mx, my, Rv + 14, 0, TAU); ctx.fill();
      const fld = ctx.createRadialGradient(mx - Rv * 0.2, my - Rv * 0.2, Rv * 0.1, mx, my, Rv);
      fld.addColorStop(0, "#f7f4ea"); fld.addColorStop(1, "#d6d0bf");
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, Rv, 0, TAU); ctx.fillStyle = fld; ctx.fill(); ctx.clip();
      PL.theme.note(ctx, "#ebe6d8", mx - Rv * 0.7, my - Rv * 0.7, Rv * 1.4, Rv * 1.4);
      ctx.fillStyle = "rgba(30,100,200,0.55)";
      mols.forEach(m => { ctx.beginPath(); ctx.arc(mx + m.x * pu, my + m.y * pu, 1.6, 0, TAU); ctx.fill(); });
      const TR = ["#c62828", "#6a1b9a", "#00838f"];
      grains.forEach((g, i) => {
        ctx.strokeStyle = TR[i]; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.4; ctx.beginPath();
        g.tr.forEach((p, j) => j ? ctx.lineTo(mx + p[0] * pu, my + p[1] * pu) : ctx.moveTo(mx + p[0] * pu, my + p[1] * pu)); ctx.stroke();
        ctx.globalAlpha = 1;
      });
      grains.forEach(g => {
        const x = mx + g.x * pu, y = my + g.y * pu, R = a * pu;
        const gg = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
        gg.addColorStop(0, "#f5d77a"); gg.addColorStop(0.7, "#d9a33a"); gg.addColorStop(1, "#9c6a1c");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(120,80,20,0.55)";
        for (let k = 0; k < 9; k++) { const b = k * TAU / 9; ctx.beginPath(); ctx.arc(x + Math.cos(b) * R * 0.62, y + Math.sin(b) * R * 0.62, Math.max(0.8, R * 0.09), 0, TAU); ctx.fill(); }
      });
      ctx.strokeStyle = "rgba(255,170,0,0.95)"; ctx.lineWidth = 1.3;
      flashes.forEach(f => { ctx.globalAlpha = f.life / 0.22; ctx.beginPath(); ctx.arc(mx + f.x * pu, my + f.y * pu, 2.6, 0, TAU); ctx.stroke(); });
      ctx.globalAlpha = 1;
      const sbx = mx + Rv * 0.2, sby = my + Rv * 0.8;
      ctx.fillStyle = "#222222"; ctx.fillRect(sbx, sby - 1.2, 10 * pu, 2.4);
      ctx.font = "700 10.5px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.fillText("10 μm", sbx + 5 * pu, sby - 6); ctx.textAlign = "left";
      ctx.restore();
      T(ctx, "顯微鏡視野：水中的花粉顆粒（時間 ×10）", mx, my - Rv - 18, { size: 12, align: "center", color: col("text"), weight: "700" });
      card(ctx, Math.max(8, mx - Rv), Math.min(H - 30, my + Rv + 8), [["藍點：撞擊顆粒的水分子（示意；實際小到看不見）", col("text-dim")]], { size: 10.5 });

      // ---------- 燒杯中的墨水 ----------
      const cx = W * 0.76, base = benchY + 6, bw = Math.min(W * 0.36, (benchY - 50) * 1.8), pm = (bw - 8) / (2 * HX), bh = (2 * HY / 0.85) * pm + 4;
      const lev = AP.beaker(ctx, cx, base, bw, bh, 0.85);
      const wy = lev.waterY, cyI = wy + (base - 2 - wy) / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - bw / 2 + 2, wy + 2, bw - 4, base - wy - 4); ctx.clip();
      ctx.fillStyle = light ? "rgba(40,30,140,0.2)" : "rgba(200,160,255,0.28)";
      ink.forEach(p => { ctx.beginPath(); ctx.arc(cx + p.x * pm, cyI + p.y * pm, 3.6, 0, TAU); ctx.fill(); });
      ctx.restore();
      const thx = cx + bw / 2 - 18, thTop = base - bh - 28, thBot = base - 8, tw = 8, bR = tw * 0.85, colBot = thBot - bR - bR * 0.4;
      G.th = { y0: thTop, y1: colBot };
      AP.thermometer(ctx, thx, thTop, thBot, tw, sT.get() / 100);
      T(ctx, sT.get() + " °C", thx - 8, thTop + 10, { size: 11.5, align: "right", color: col("text"), weight: "700" });
      T(ctx, "墨水在靜水中擴散（縮時：1 秒 = 1 小時）", cx, Math.max(16, thTop - 8), { size: 12, align: "center", color: col("text"), weight: "700" });
      T(ctx, "t = " + fmt(inkT / 3600, 1) + " h", cx - bw / 2 + 6, wy + 16, { size: 11, color: col("text") });
      // ⟨x²⟩–t 圖
      const box = { x: Math.round(W * 0.56), y: benchY + 34, w: Math.round(W * 0.41), h: H - benchY - 62 };
      const Di = dInk(TK);
      if (box.h > 40) {
        const gr = PL.graph(cv, box, { x0: 0, x1: 12, y0: 0, y1: 160 });
        gr.frame({ title: "墨水 ⟨x²⟩–t：直線 → ⟨x²⟩ = 2Dt", xlabel: "t (h)", ylabel: "⟨x²⟩ (mm²)", tickCount: 4 });
        gr.fn(x => 2 * Di * x * 3600 * 1e6, { color: col("text-faint"), width: 1.4, dash: [5, 4] });
        gr.curve(hist, { color: light ? "#4527a0" : "#b39ddb", width: 2.2 });
        const last = hist[hist.length - 1]; gr.dot(last[0], last[1], { r: 4, color: light ? "#4527a0" : "#b39ddb" });
        gr.label(7, 2 * Di * 7 * 3600 * 1e6, "理論 2Dt", { dx: 4, dy: -6, size: 10.5, color: col("text-dim") });
      }
      card(ctx, Math.round(W * 0.53), 12, [["⟨x²⟩ = 2Dt → 距離 ∝ √t", col("text"), "700"], ["½ m v² 平均 = 3/2 kT", col("text")]], { size: 11 });

      const g0 = grains[0];
      hG.place(mx + (g0.x + a) * pu + 4, my + g0.y * pu);
      hTh.place(thx, G.th.y0 + (G.th.y1 - G.th.y0) * (1 - sT.get() / 100));
      const Dg = dGrain(TK, a), ke = 1.5 * KB * TK;
      rKE.set(ke * 1e21, 2); rV.set(Math.sqrt(3 * KB * TK / M_H2O), 0); rD.set(Dg, 3); rX.set(Math.sqrt(2 * Dg * 10), 2); rDi.set(Di * 1e10, 2);
      cz.set(0, "T = " + sT.get() + " °C → 平均動能 " + fmt(ke * 1e21, 2) + "×10⁻²¹ J");
      cz.set(1, "a = " + fmt(a, 1) + " μm → D = " + fmt(Dg, 3) + " μm²/s（D ∝ T / ηa）");
      vd.set("顆粒 10 秒內約亂跳 " + fmt(Math.sqrt(2 * Dg * 10), 2) + " μm：溫度越高、顆粒越小，跳得越劇烈——這是水分子不停撞擊的證據", "info");
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* =====================================================================
     電磁波譜
     上：教室牆上的波譜掛圖（波長取對數刻度，長波長在左），游標可拖。
     中：發射源 → 前進中的電磁波 → 偵測器。畫面上的波長只是示意（非等比例），
     但所有波段的波前都用同一個速率前進——真空中速率都是 c；
     波長越短，同樣速率下每秒經過的波峰越多（f = c/λ），光子能量 E = hc/λ 越大。
     ===================================================================== */
  const lg47 = Math.log10(4e-7), lg77 = Math.log10(7e-7);
  const BANDS = [
    ["無線電波", 0, 3.01, "#8d6e63", "天線中來回振盪的電流", "AM／FM 廣播、電視、無線通訊", "radio"],
    ["微波", -3, 0, "#fb8c00", "磁控管（微波爐）、基地台", "微波爐加熱、雷達、Wi-Fi、手機", "mw"],
    ["紅外線", lg77, -3, "#e53935", "所有溫暖的物體（人體、暖爐）", "遙控器、耳溫槍、熱像儀", "ir"],
    ["可見光", lg47, lg77, null, "太陽、燈泡、LED", "照明、視覺、光合作用", "vis"],
    ["紫外線", -8, lg47, "#8e24aa", "太陽、紫外燈（黑光燈）", "殺菌燈、驗鈔螢光、合成維生素 D", "uv"],
    ["X 射線", -11, -8, "#3949ab", "X 射線管：高速電子撞擊金屬靶", "胸腔 X 光、電腦斷層、安檢", "xray"],
    ["γ 射線", -13.01, -11, "#00897b", "放射性原子核（如鈷-60）", "放射治療、醫材與食品滅菌", "gamma"]
  ];
  const bandOf = lg => BANDS.find(b => lg >= b[1] && lg < b[2]) || BANDS[0];
  function lamStr(m) {
    const U = [[1e3, "km"], [1, "m"], [1e-2, "cm"], [1e-3, "mm"], [1e-6, "μm"], [1e-9, "nm"]];
    for (const [k, u] of U) if (m >= k * 0.9995) return +(m / k).toPrecision(3) + " " + u;
    return +(m / 1e-12).toPrecision(3) + " pm";
  }
  function srcIcon(ctx, k, x, by, t, glow) {
    ctx.save();
    if (k === "radio") {
      ctx.strokeStyle = "rgb(200,60,50)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 18, by); ctx.lineTo(x, by - 86); ctx.lineTo(x + 18, by); ctx.stroke();
      ctx.lineWidth = 1.2;
      for (let i = 1; i < 6; i++) { const y = by - i * 14, w = 18 * (1 - i * 14 / 86); ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x + w * 0.85, y + 12); ctx.stroke(); }
      ctx.fillStyle = (t % 1) < 0.5 ? "#ff1744" : "#7f0000"; ctx.beginPath(); ctx.arc(x, by - 88, 3, 0, TAU); ctx.fill();
    } else if (k === "mw") {
      const g = ctx.createLinearGradient(0, by - 50, 0, by); g.addColorStop(0, "#eceff1"); g.addColorStop(1, "#b0bec5");
      ctx.fillStyle = g; AP.rrPath(ctx, x - 34, by - 50, 68, 48, 4); ctx.fill();
      ctx.fillStyle = "rgb(30,34,40)"; ctx.fillRect(x - 28, by - 44, 42, 36);
      ctx.fillStyle = "rgba(255,200,120," + (0.35 + 0.15 * Math.sin(t * 4)).toFixed(2) + ")"; ctx.fillRect(x - 25, by - 41, 36, 30);
      ctx.fillStyle = "rgb(60,66,76)"; ctx.beginPath(); ctx.arc(x + 24, by - 30, 4.5, 0, TAU); ctx.fill();
      ctx.fillRect(x + 19, by - 44, 10, 5);
    } else if (k === "ir") {
      const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0); g.addColorStop(0, "#9e9e9e"); g.addColorStop(1, "#616161");
      ctx.fillStyle = g; AP.rrPath(ctx, x - 26, by - 66, 52, 60, 6); ctx.fill();
      ctx.fillStyle = "rgb(40,40,44)"; ctx.fillRect(x - 20, by - 58, 40, 44);
      ctx.shadowColor = "#ff3d00"; ctx.shadowBlur = 10; ctx.strokeStyle = "rgb(255," + Math.round(80 + 30 * Math.sin(t * 3)) + ",30)"; ctx.lineWidth = 3;
      [-46, -36, -26].forEach(dy => { ctx.beginPath(); ctx.moveTo(x - 16, by + dy); ctx.lineTo(x + 16, by + dy); ctx.stroke(); });
      ctx.shadowBlur = 0; ctx.fillStyle = "rgb(50,50,54)"; ctx.fillRect(x - 22, by - 6, 8, 6); ctx.fillRect(x + 14, by - 6, 8, 6);
    } else if (k === "vis") {
      AP.standRod(ctx, x, by, by - 46);
      AP.bulb(ctx, x, by - 62, 15, 1);
      if (glow) { ctx.fillStyle = glow; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, by - 62, 15, 0, TAU); ctx.fill(); }
    } else if (k === "uv") {
      AP.standRod(ctx, x, by, by - 40);
      ctx.fillStyle = "rgb(70,74,84)"; ctx.fillRect(x - 34, by - 58, 68, 8);
      ctx.shadowColor = "#d500f9"; ctx.shadowBlur = 14; ctx.fillStyle = "rgb(190,120,255)"; AP.rrPath(ctx, x - 30, by - 50, 60, 9, 4); ctx.fill();
    } else if (k === "xray") {
      ctx.fillStyle = "rgba(200,230,245,0.35)"; ctx.strokeStyle = "rgba(160,200,220,0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(x, by - 50, 34, 17, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgb(255,170,60)"; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i <= 6; i++) ctx.lineTo(x - 26 + i * 1.6, by - 50 + (i % 2 ? -4 : 4)); ctx.stroke();
      ctx.fillStyle = "rgb(184,115,51)"; ctx.beginPath(); ctx.moveTo(x + 12, by - 58); ctx.lineTo(x + 30, by - 58); ctx.lineTo(x + 30, by - 42); ctx.lineTo(x + 18, by - 42); ctx.closePath(); ctx.fill();
      PL.motion.flow(ctx, [[x - 16, by - 50], [x + 14, by - 50]], t * 60, { gap: 7, r: 1.6, color: "#64b5f6" });
      ctx.fillStyle = "rgb(60,64,72)"; ctx.fillRect(x - 40, by - 24, 80, 24);
    } else {
      const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0); g.addColorStop(0, "#9e9e9e"); g.addColorStop(0.5, "#616161"); g.addColorStop(1, "#424242");
      ctx.fillStyle = g; ctx.fillRect(x - 20, by - 46, 40, 46); ctx.fillRect(x - 23, by - 52, 46, 8);
      ctx.fillStyle = "#ffd600"; ctx.beginPath(); ctx.arc(x, by - 24, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = "#212121";
      for (let i = 0; i < 3; i++) { const b = -Math.PI / 2 + i * TAU / 3; ctx.beginPath(); ctx.moveTo(x, by - 24); ctx.arc(x, by - 24, 9.5, b - 0.5, b + 0.5); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = "#ffd600"; ctx.beginPath(); ctx.arc(x, by - 24, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#212121"; ctx.beginPath(); ctx.arc(x, by - 24, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  PL.register("em-spectrum", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const sL = PL.ui.slider(L.controls, { label: "波長 log₁₀(λ / m)", min: -13, max: 3, step: 0.01, value: -6.26, digits: 2,
      fmt: v => v.toFixed(2) + "（λ = " + lamStr(Math.pow(10, v)) + "）", onInput: () => draw() });
    const at = (lam) => () => { sL.set(Math.round(Math.log10(lam) * 100) / 100); draw(); };
    PL.ui.presets(L.controls, { label: "生活中的例子", options: [
      { label: "FM 廣播 100 MHz", hint: "λ = c/f = 3 m", apply: at(3) },
      { label: "微波爐 2.45 GHz", hint: "λ ≈ 12 cm", apply: at(0.1224) },
      { label: "人體紅外 10 μm", apply: at(1e-5) },
      { label: "綠光 550 nm", apply: at(5.5e-7) },
      { label: "UV-B 300 nm", hint: "曬傷的紫外線", apply: at(3e-7) },
      { label: "X 光 0.05 nm", apply: at(5e-11) },
      { label: "鈷-60 γ 1.33 MeV", hint: "λ = 1240 / 1.33×10⁶ nm", apply: at(9.32e-13) }
    ]});
    PL.ui.note(L.controls, "拖掛圖上的游標或下方的 λ 尺標選波長。注意：每一個波段的波前都以同樣的速率前進（真空中都是 c），波長越短，每秒通過的波峰越多。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rL = PL.ui.readout(L.readouts, { label: "波長 λ", unit: "m" });
    const rF = PL.ui.readout(L.readouts, { label: "頻率 f = c / λ", unit: "Hz" });
    const rE = PL.ui.readout(L.readouts, { label: "光子能量 E = 1240 / λ(nm)", unit: "eV" });
    const rB = PL.ui.readout(L.readouts, { label: "波段" });
    const rIon = PL.ui.readout(L.readouts, { label: "游離輻射？" });
    const G = { bx0: 0, bx1: 1, x0: 0 };
    const lvOf = lg => 9 + (lg + 13) / 16 * 190;   // 畫面上的示意波長（px）
    const hCur = PL.ui.handle(cv, { slider: sL, label: "波譜游標（選波長）", toValue: x => 3 - (x - G.bx0) / (G.bx1 - G.bx0) * 16 });
    const hLv = PL.ui.handle(cv, { slider: sL, label: "λ 尺標（拖長變短）", toValue: x => (x - G.x0 - 9) / 190 * 16 - 13 });
    const clock = PL.motion.clock(() => draw(), { ambient: true });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock.t, light = isL(), lg = sL.get(), lam = Math.pow(10, lg), nm = lam * 1e9;
      const f = 2.998e8 / lam, E = 1239.84 / nm, band = bandOf(lg), isVis = band[6] === "vis";
      const benchY = Math.round(H * 0.76);
      AP.labRoom(ctx, W, H, benchY);
      // ---------- 掛圖 ----------
      const px = W * 0.03, pw = W * 0.94, ph = H * 0.42;
      AP.whiteboard(ctx, px, 8, pw, ph);
      const bx0 = W * 0.07, bx1 = W * 0.93, by = Math.round(H * 0.13), bh = Math.round(H * 0.065);
      G.bx0 = bx0; G.bx1 = bx1;
      const X = l => bx1 - (l + 13) / 16 * (bx1 - bx0);
      T(ctx, "電磁波譜（波長取對數刻度）", px + 12, 28, { size: 12.5, color: col("text"), weight: "700" });
      BANDS.forEach(b => {
        const xa = X(Math.min(3, b[2])), xb = X(Math.max(-13, b[1]));
        if (b[3]) { D.rect(ctx, xa, by, xb - xa, bh, { fill: b[3] }); }
        else {
          const rg = ctx.createLinearGradient(xa, 0, xb, 0);
          [700, 620, 580, 530, 480, 420].forEach((w, i) => rg.addColorStop(i / 5, AP.nmColor(w)));
          ctx.fillStyle = rg; ctx.fillRect(xa, by, xb - xa, bh);
        }
        if (b[6] !== "vis") T(ctx, b[0], (xa + xb) / 2, by + bh + 15, { size: 11, align: "center", color: col("text"), weight: band === b ? "700" : "" });
      });
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(bx0, by, bx1 - bx0, bh);
      [[3, "1 km"], [0, "1 m"], [-3, "1 mm"], [-6, "1 μm"], [-9, "1 nm"], [-12, "1 pm"]].forEach(([l, s]) => {
        D.line(ctx, X(l), by - 4, X(l), by, col("text-dim"), 1);
        T(ctx, s, X(l), by - 7, { size: 10.5, align: "center", color: col("text-dim") });
      });
      // 可見光放大條（線性 700 → 400 nm）
      const zx0 = W * 0.38, zx1 = W * 0.62, zy = Math.round(H * 0.29), zv = n => zx0 + (700 - n) / 300 * (zx1 - zx0);
      const zg = ctx.createLinearGradient(zx0, 0, zx1, 0);
      for (let n = 700; n >= 400; n -= 25) zg.addColorStop((700 - n) / 300, AP.nmColor(n));
      ctx.fillStyle = zg; ctx.fillRect(zx0, zy, zx1 - zx0, 12);
      D.line(ctx, X(lg77), by + bh, zx0, zy, col("text-faint"), 1, [3, 3]); D.line(ctx, X(lg47), by + bh, zx1, zy, col("text-faint"), 1, [3, 3]);
      [700, 600, 500, 400].forEach(n => T(ctx, n + "", zv(n), zy + 24, { size: 10, align: "center", color: col("text-dim") }));
      T(ctx, "可見光 400–700 nm（放大）", zx1 + 8, zy + 10, { size: 10.5, color: col("text"), weight: "600" });
      T(ctx, "← 波長較長", bx0, H * 0.4, { size: 11, color: col("text-dim") });
      T(ctx, "頻率、光子能量較高 →", bx1, H * 0.4, { size: 11, align: "right", color: col("text-dim") });
      const cx = X(lg);
      ctx.save(); ctx.fillStyle = PL.theme.ink(ctx, col("danger"), cx, by); ctx.beginPath(); ctx.moveTo(cx - 7, by - 12); ctx.lineTo(cx + 7, by - 12); ctx.lineTo(cx, by - 2); ctx.closePath(); ctx.fill(); ctx.restore();
      D.line(ctx, cx, by - 2, cx, by + bh + 2, col("danger"), 2.4);
      if (isVis) D.line(ctx, zv(nm), zy - 3, zv(nm), zy + 15, col("danger"), 2.4);

      // ---------- 發射源 → 電磁波 → 偵測器 ----------
      const sx = W * 0.1, x0 = sx + 44, dx = W * 0.88, x1 = dx - 34, wy = benchY - 52, A = Math.min(24, H * 0.055);
      G.x0 = x0;
      const vc = isVis ? AP.nmColor(nm) : band[3];
      srcIcon(ctx, band[6], sx, benchY + 4, t, isVis ? AP.nmColor(nm, 0.9) : null);
      const lv = lvOf(lg), v = 80;
      ctx.save(); ctx.strokeStyle = vc; ctx.lineWidth = 2.4; ctx.shadowColor = vc; ctx.shadowBlur = isVis ? 8 : 0; ctx.beginPath();
      for (let x = x0; x <= x1; x += 1) { const y = wy - A * Math.sin(TAU * (x - x0 - v * t) / lv); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
      D.line(ctx, x0, wy, x1, wy, PL.theme.pale(0.3), 1, [3, 4]);
      const fx = x0 + (v * t) % (x1 - x0);
      D.disc(ctx, fx, wy, 4, { fill: col("accent-2"), glow: col("accent-2") });
      T(ctx, "波前以 c 前進（每個波段都一樣快）", (x0 + x1) / 2, wy - A - 10, { size: 11, align: "center", color: col("text"), weight: "600" });
      // λ 尺標
      const ry = wy + A + 12;
      D.line(ctx, x0, ry, x0 + lv, ry, col("text"), 1.4);
      D.line(ctx, x0, ry - 5, x0, ry + 5, col("text"), 1.4); D.line(ctx, x0 + lv, ry - 5, x0 + lv, ry + 5, col("text"), 1.4);
      T(ctx, "λ（示意，非等比例）", x0 + lv + 20, ry + 4, { size: 10.5, color: col("text-dim") });
      // 偵測器
      ctx.save(); const dg = ctx.createLinearGradient(0, benchY - 62, 0, benchY); dg.addColorStop(0, "rgb(70,76,86)"); dg.addColorStop(1, "rgb(36,40,48)");
      ctx.fillStyle = dg; AP.rrPath(ctx, dx - 32, benchY - 62, 64, 62, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = "rgb(20,22,26)"; ctx.beginPath(); ctx.arc(dx - 32, wy, 7, 0, TAU); ctx.fill();
      AP.lcd(ctx, dx - 26, benchY - 30, 52, 20, sci(E, 2), { size: 10, align: "center" });
      T(ctx, "偵測器（eV）", dx, benchY - 68, { size: 10.5, align: "center", color: col("text-dim") });
      // ---------- 說明卡 ----------
      const ion = E >= 10, uvc = !ion && E >= 3.1;
      const iy = benchY + 10, ih = H - iy - 6;
      if (ih > 50) {
        AP.infoCard(ctx, W * 0.03, iy, W * 0.94, ih);
        const tx = W * 0.03 + 10, fs = Math.min(12, ih / 6.2);
        T(ctx, band[0] + "　λ = " + lamStr(lam) + "　f = " + sci(f) + " Hz　E = hc/λ = " + sci(E) + " eV", tx, iy + fs + 4, { size: fs + 0.5, color: col("text"), weight: "700" });
        T(ctx, "來源：" + band[4] + "　｜　應用：" + band[5], tx, iy + 2 * fs + 10, { size: fs, color: col("text") });
        T(ctx, ion ? "游離輻射：E ≥ 10 eV，能把原子中的電子打出去，會破壞 DNA" : uvc ? "非游離，但光子能量足以破壞化學鍵（曬傷、皮膚癌）" : "非游離輻射：光子能量太小，打不出原子中的電子",
          tx, iy + 3 * fs + 16, { size: fs, color: ion ? col("danger") : uvc ? col("warn") : col("ok"), weight: "600" });
        T(ctx, "c = fλ = 3.0×10⁸ m/s；E = hf = hc/λ，hc ≈ 1240 eV·nm", tx, iy + 4 * fs + 22, { size: fs, color: col("text-dim") });
      }
      hCur.place(cx, by + bh / 2);
      hLv.place(x0 + lv, ry);
      rL.set(lam, 3); rF.set(f, 3); rE.set(E, 3); rB.set(band[0]); rIon.set(ion ? "是" : "否");
      vd.set(ion ? band[0] + "：E = " + sci(E) + " eV ≥ 10 eV，屬於游離輻射" : band[0] + "：E = " + sci(E) + " eV，非游離輻射" + (uvc ? "（但能破壞化學鍵）" : ""), ion ? "bad" : uvc ? "warn" : "ok");
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
