/*
 * exam-electric.js — 學測／分科常考的電學實驗與國中銜接（2026-10）
 *
 *   equipotential-mapping     導電紙描繪等位線（伏特計探針、兩點／平行板／點與板電極）
 *   electric-potential        點電荷的電位地形：氣墊桌上的帶電小圓盤放手後沿電場加速
 *   parallel-plate-capacitor  平行板電容器：接著／斷開電池時拉板距、插介電質
 *   triboelectric             摩擦起電：電子一顆顆搬家、帶電尺吸紙屑
 *   solenoid-field            螺線管的磁場：霍爾探棒沿軸線畫 B–x 曲線
 *
 * 版面一律畫在 800 寬的虛擬座標裡（ctx.scale），把手座標再乘回實際比例。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, AP = PL.apparatus;
  const TAU = Math.PI * 2, VW = 800;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = "'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif";
  const POS = "rgb(214,58,48)", NEG = "rgb(44,102,206)";
  const light = () => PL.theme.isLight();

  /* 把手 → 滑桿：依滑桿範圍與步距寫入，再派發 input（和學生拖滑桿走同一條路） */
  function push(sl, v) {
    const el = sl.el, min = +el.min, max = +el.max, st = +el.step || 0;
    let x = clamp(v, min, max);
    if (st > 0) x = Math.round((x - min) / st) * st + min;
    x = clamp(+x.toFixed(6), min, max);
    if (+el.value === x) return;
    el.value = String(x);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  /* 相對拖曳（旋鈕一類）：抓住時記下起點，位移 × perPx 加到滑桿上；vertical 時往上為正 */
  function relGrip(cv, sl, perPx, label, vertical) {
    let p0 = null, v0 = 0;
    return PL.ui.handle(cv, { slider: sl, label,
      onGrab: () => { p0 = null; },
      onDrag: (x, y) => { const p = vertical ? -y : x; if (p0 == null) { p0 = p; v0 = sl.get(); } push(sl, v0 + (p - p0) * perPx * VW / cv.W); },
      onRelease: () => { p0 = null; } });
  }
  /* 主題面板底的小標籤 */
  function tag(ctx, s, x, y, o) {
    o = o || {};
    const size = o.size || 11;
    ctx.save(); ctx.font = "700 " + size + "px " + FONT;
    const w = ctx.measureText(s).width + 10, h = size + 7;
    ctx.restore();
    const x0 = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
    D.rect(ctx, x0, y - h + 4, w, h, { fill: PL.col("panel-solid"), stroke: o.border || PL.col("border"), width: 1, r: 4 });
    D.text(ctx, s, x0 + 5, y, { size, color: o.color || PL.col("text"), weight: "700" });
  }
  /* 直接用固定顏色寫字（畫在固定深色的導電紙、液晶上，不需要墨色層翻色） */
  function raw(ctx, s, x, y, color, size, align, weight) {
    ctx.save(); ctx.font = (weight || "700") + " " + (size || 11) + "px " + FONT;
    ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y); ctx.restore();
  }
  /* 等值線（marching squares）：F 為 nx×ny 格點值，seg 收到格點座標的線段 */
  function contour(F, nx, ny, lev, seg) {
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const n = j * nx + i, a = F[n] - lev, b = F[n + 1] - lev, c = F[n + nx + 1] - lev, d = F[n + nx] - lev;
      const P = [];
      if ((a < 0) !== (b < 0)) P.push(i + a / (a - b), j);
      if ((b < 0) !== (c < 0)) P.push(i + 1, j + b / (b - c));
      if ((d < 0) !== (c < 0)) P.push(i + d / (d - c), j + 1);
      if ((a < 0) !== (d < 0)) P.push(i, j + a / (a - d));
      if (P.length === 4) seg(P[0], P[1], P[2], P[3]);
      else if (P.length === 8) {
        // 鞍點：看格子中心和左上角是否同側，決定怎麼配對
        const m = (a + b + c + d) / 4;
        if ((m < 0) === (a < 0)) { seg(P[0], P[1], P[2], P[3]); seg(P[4], P[5], P[6], P[7]); }
        else { seg(P[0], P[1], P[6], P[7]); seg(P[2], P[3], P[4], P[5]); }
      }
    }
  }
  function arrowHead(ctx, x, y, ang, s, color) {
    ctx.save(); ctx.fillStyle = color; ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(s, 0); ctx.lineTo(-s * 0.7, -s * 0.6); ctx.lineTo(-s * 0.7, s * 0.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const scaled = (cv, fn) => { const { ctx, W, H } = cv, k = W / VW; ctx.save(); ctx.scale(k, k); try { fn(ctx, H / k, k); } finally { ctx.restore(); } };

  /* =====================================================================
     1. 等位線與電場（導電紙描繪）
     導電紙上的電位滿足拉普拉斯方程式：電極是固定電位、紙邊絕緣（電流不能流出紙外，
     邊界上電場平行紙邊）。用 SOR 直接解，所以「點對板」這種課本沒有公式的情形也畫得出來。
     ===================================================================== */
  PL.register("equipotential-mapping", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const PW = 24, PH = 16, NX = 73, NY = 49, G = PW / (NX - 1);   // 24×16 cm 導電紙，格點 1/3 cm
    const RA = 0.6, BT = 0.3, BH = 5;                                // 點電極半徑、板電極半厚與半長（cm）
    let mode = "points", layers = ["eq", "field", "flow"], recs = [], flowS = 0;

    PL.ui.section(L.controls, "電極形狀");
    const cMode = PL.ui.chipGroup(L.controls, { value: "points", options: [
      { value: "points", label: "兩點電極" }, { value: "plates", label: "平行板電極" }, { value: "pp", label: "點與板" }],
      onChange: v => { mode = v; recs = []; draw(); } });
    const sV = PL.ui.slider(L.controls, { label: "電源電壓 V₀", min: 2, max: 12, step: 1, value: 6, unit: "V", digits: 0, onInput: () => { recs = []; draw(); } });
    const sD = PL.ui.slider(L.controls, { label: "電極間距 d", min: 6, max: 18, step: 0.5, value: 12, unit: "cm", digits: 1, onInput: () => { recs = []; draw(); } });
    PL.ui.section(L.controls, "伏特計探針（紅棒）");
    const sX = PL.ui.slider(L.controls, { label: "探針 x", min: 0, max: 24, step: 0.1, value: 8.5, unit: "cm", digits: 1, onInput: () => draw() });
    const sY = PL.ui.slider(L.controls, { label: "探針 y", min: 0, max: 16, step: 0.1, value: 5, unit: "cm", digits: 1, onInput: () => draw() });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "記錄這一點", () => { if (recs.length < 60) recs.push({ x: sX.get(), y: sY.get(), v: sV.get() * phiAt(sX.get(), sY.get()) }); draw(); }, { primary: true });
    PL.ui.button(row, "清除紀錄", () => { recs = []; draw(); });
    PL.ui.chipGroup(L.controls, { multi: true, value: ["eq", "field", "flow"], options: [
      { value: "eq", label: "等位線" }, { value: "field", label: "電場線" }, { value: "flow", label: "電荷流動" }],
      onChange: v => { layers = v; draw(); } });
    function setup(m, d, x, y) { mode = m; cMode.set(m); recs = []; push(sD, d); push(sX, x); push(sY, y); draw(); }
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "兩點電極・探針在 4 V", apply: () => setup("points", 12, 8.5, 5) },
      { label: "平行板：均勻電場", apply: () => setup("plates", 10, 12, 8) },
      { label: "點對板", apply: () => setup("pp", 12, 10, 4) }] });
    PL.ui.procedure(L.controls, { title: "描繪等位線的步驟", steps: [
      "電源供應器正、負極接兩個電極，導電紙上有微弱電流流過。",
      "伏特計黑棒（COM）夾在<b>負電極</b>當作 0 V，紅棒當探針在紙上移動。",
      "找出讀數相同的點，按「記錄這一點」；連起來就是一條等位線。",
      "換一個電壓值重複；再畫出處處與等位線垂直的電場線（高電位 → 低電位）。"],
      rule: "伏特計讀的是「探針與負電極的電位差」。探針沿等位線移動時讀數不變——電荷沿等位線移動，電力不做功。", ruleTag: "關鍵" });

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rV = PL.ui.readout(L.readouts, { label: "探針電位 V", unit: "V" });
    const rE = PL.ui.readout(L.readouts, { label: "探針處電場 E", unit: "V/cm" });
    const rN = PL.ui.readout(L.readouts, { label: "已記錄點數", unit: "" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "探針與負極的電位差", unit: "V" },
      { label: "此處 E = |ΔV/Δd|", unit: "V/cm", hint: "等位線越密越大" },
      { label: "V₀/d（平行板理論值）" },
      { label: "+1 μC 由探針移到負極，電力做功", unit: "μJ", hint: "W = q(V_A − V_B)" }]);

    /* 拉普拉斯方程式數值解（phi 為 0～1，乘上 V₀ 就是電位） */
    const phi = new Float64Array(NX * NY), fix = new Uint8Array(NX * NY);
    let key = "", lines = [], solved = false;
    const elecs = () => { const d = sD.get(); return [{ bar: mode === "plates", x: 12 - d / 2 }, { bar: mode !== "points", x: 12 + d / 2 }]; };
    const onE = (e, x, y, pad) => e.bar ? Math.abs(x - e.x) <= BT + pad && Math.abs(y - 8) <= BH + pad : Math.hypot(x - e.x, y - 8) <= RA + pad;
    function phiAt(x, y) {
      const fx = clamp(x / G, 0, NX - 1.001), fy = clamp(y / G, 0, NY - 1.001), i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, n = j * NX + i;
      return (phi[n] * (1 - u) + phi[n + 1] * u) * (1 - v) + (phi[n + NX] * (1 - u) + phi[n + NX + 1] * u) * v;
    }
    const grad = (x, y) => { const h = G * 0.6; return [(phiAt(x + h, y) - phiAt(x - h, y)) / (2 * h), (phiAt(x, y + h) - phiAt(x, y - h)) / (2 * h)]; };
    function solve() {
      const k = mode + sD.get();
      if (k === key) return;
      key = k;
      const E = elecs();
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const n = j * NX + i, x = i * G, y = j * G;
        fix[n] = onE(E[0], x, y, 0.01) ? 1 : onE(E[1], x, y, 0.01) ? 2 : 0;
        if (fix[n]) phi[n] = fix[n] === 1 ? 1 : 0;
        else if (!solved) phi[n] = clamp((E[1].x - x) / (E[1].x - E[0].x), 0, 1);
      }
      solved = true;
      // SOR；紙邊用鏡像鄰點（∂V/∂n = 0，電流不會流出紙外）
      for (let it = 0; it < 2500; it++) {
        let mx = 0;
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const n = j * NX + i;
          if (fix[n]) continue;
          const s = phi[i > 0 ? n - 1 : n + 1] + phi[i < NX - 1 ? n + 1 : n - 1] + phi[j > 0 ? n - NX : n + NX] + phi[j < NY - 1 ? n + NX : n - NX];
          const dd = 1.9 * (s / 4 - phi[n]);
          phi[n] += dd;
          if (dd > mx) mx = dd; else if (-dd > mx) mx = -dd;
        }
        if (mx < 2e-6) break;
      }
      // 電場線：從正電極表面出發，沿 −∇V 一路走到負電極
      lines = [];
      const p = E[0], seeds = [];
      if (p.bar) {
        for (let y = 8 - BH + 0.5; y <= 8 + BH - 0.4; y += 1) seeds.push([p.x + BT + 0.15, y]);
        [-4, -1.5, 1.5, 4].forEach(dy => seeds.push([p.x - BT - 0.15, 8 + dy]));
      } else for (let a = 0; a < 16; a++) { const t = (a + 0.5) / 16 * TAU; seeds.push([p.x + (RA + 0.15) * Math.cos(t), 8 + (RA + 0.15) * Math.sin(t)]); }
      seeds.forEach(sd => {
        let x = sd[0], y = sd[1];
        const pts = [[x, y]];
        for (let n = 0; n < 900; n++) {
          const g = grad(x, y), m = Math.hypot(g[0], g[1]);
          if (m < 1e-5) break;
          x = clamp(x - g[0] / m * 0.15, 0.02, PW - 0.02); y = clamp(y - g[1] / m * 0.15, 0.02, PH - 0.02);
          pts.push([x, y]);
          if (onE(E[1], x, y, 0.05) || phiAt(x, y) < 0.002) break;
        }
        if (pts.length > 4) lines.push(pts);
      });
    }
    const eqCol = f => "rgb(" + Math.round(120 + 135 * f) + "," + Math.round(150 + 40 * (1 - Math.abs(2 * f - 1))) + "," + Math.round(255 - 135 * f) + ")";

    let geo = { ox: 16, oy: 86, s: 26 }, knob = { x: 0, y: 0 };
    const gProbe = PL.ui.handle(cv, { slider: sX, label: "伏特計探針（拖到紙上任一點）",
      onDrag: (x, y) => { const k = cv.W / VW; push(sX, (x / k - 20 - geo.ox) / geo.s); push(sY, (y / k + 26 - geo.oy) / geo.s); } });
    const gElec = PL.ui.handle(cv, { slider: sD, label: "負電極（左右拖改間距 d）",
      toValue: x => 2 * ((x * VW / cv.W - geo.ox) / geo.s - 12) });
    const gKnob = relGrip(cv, sV, 0.06, "電源旋鈕（上下拖改電壓 V₀）", true);

    const clock = PL.motion.clock(dt => { flowS += dt * (12 + 5 * sV.get()); draw(); }, { ambient: true });
    function draw() {
      solve();
      cv.clear(); D.bg(cv);
      const V0 = sV.get(), d = sD.get(), E = elecs();
      const tx = sX.get(), ty = sY.get(), pv = phiAt(tx, ty), V = V0 * pv, g = grad(tx, ty), Em = V0 * Math.hypot(g[0], g[1]);
      scaled(cv, (ctx, VH, k) => {
        AP.deskTop(ctx, 0, 0, VW, VH);
        const oy = 86, s = Math.min((VH - oy - 14) / PH, (VW - 150) / PW), ox = 16, pw = PW * s, ph = PH * s;
        geo = { ox, oy, s };
        const P = (x, y) => ({ x: ox + x * s, y: oy + y * s });
        // 導電紙（黑色碳膜紙）＋印刷座標格
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(ox + 4, oy + 5, pw, ph);
        const pg = ctx.createLinearGradient(ox, oy, ox + pw, oy + ph);
        pg.addColorStop(0, "#36393e"); pg.addColorStop(1, "#25272b");
        ctx.fillStyle = pg; ctx.fillRect(ox, oy, pw, ph);
        PL.theme.note(ctx, "#2e3034", ox, oy, pw, ph);
        ctx.lineWidth = 1;
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)"; ctx.beginPath();
          for (let i = 1; i < PW; i++) if ((i % 4 === 0) === !!pass) { ctx.moveTo(ox + i * s, oy); ctx.lineTo(ox + i * s, oy + ph); }
          for (let j = 1; j < PH; j++) if ((j % 4 === 0) === !!pass) { ctx.moveTo(ox, oy + j * s); ctx.lineTo(ox + pw, oy + j * s); }
          ctx.stroke();
        }
        for (let i = 4; i < PW; i += 4) raw(ctx, String(i), ox + i * s + 3, oy + 12, "rgba(255,255,255,0.42)", 9, "left", "400");
        raw(ctx, "導電紙（cm）", ox + 6, oy + ph - 7, "rgba(255,255,255,0.45)", 10, "left", "600");
        const gs = s * G, GX = gx => ox + gx * gs, GY = gy => oy + gy * gs;
        // 等位線（每 1 V 一條；電壓高時每 2 V）
        if (layers.indexOf("eq") >= 0) {
          const step = V0 > 8 ? 2 : 1;
          let li = 0;
          for (let lv = step; lv < V0 - 1e-6; lv += step, li++) {
            const f = lv / V0;
            ctx.strokeStyle = eqCol(f); ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]); ctx.beginPath();
            contour(phi, NX, NY, f, (a, b, c, e) => { ctx.moveTo(GX(a), GY(b)); ctx.lineTo(GX(c), GY(e)); });
            ctx.stroke(); ctx.setLineDash([]);
            // 標籤放在兩電極連線（y = 8 cm）與等位線的交點
            const j0 = Math.round(8 / G);
            for (let i = 0; i < NX - 1; i++) {
              const a = phi[j0 * NX + i] - f, b = phi[j0 * NX + i + 1] - f, x = (i + a / (a - b)) * G;
              if ((a < 0) !== (b < 0) && x > E[0].x && x < E[1].x) { raw(ctx, lv + " V", ox + x * s + 3, oy + 8 * s + (li % 2 ? 16 : -7), eqCol(f), 10); break; }
            }
          }
          // 探針所在的那一條等位線
          if (pv > 0.004 && pv < 0.996) {
            ctx.strokeStyle = "rgb(110,244,190)"; ctx.lineWidth = 2.6; ctx.beginPath();
            contour(phi, NX, NY, pv, (a, b, c, e) => { ctx.moveTo(GX(a), GY(b)); ctx.lineTo(GX(c), GY(e)); });
            ctx.stroke();
          }
        }
        const lp = lines.map(l => l.map(q => [ox + q[0] * s, oy + q[1] * s]));
        if (layers.indexOf("field") >= 0) {
          ctx.strokeStyle = "rgba(255,232,160,0.55)"; ctx.lineWidth = 1.2;
          lp.forEach(l => {
            ctx.beginPath(); l.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
            const m = Math.floor(l.length * 0.45), a = l[m], b = l[Math.min(l.length - 1, m + 2)];
            arrowHead(ctx, a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]), 5, "rgba(255,232,160,0.9)");
          });
        }
        // 導電紙上的電流：沿電場線由正電極流向負電極（速率跟著 V₀）
        if (layers.indexOf("flow") >= 0) lp.forEach(l => PL.motion.flow(ctx, l, flowS, { gap: 34, r: 2.1, color: "#ffd45a", glow: 4 }));
        // 記錄點
        recs.forEach(r => {
          const q = P(r.x, r.y);
          ctx.fillStyle = eqCol(r.v / V0); ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2; ctx.stroke();
          if (recs.length <= 24) raw(ctx, r.v.toFixed(1), q.x + 6, q.y - 5, "rgba(255,255,255,0.85)", 9.5);
        });
        // 電極
        E.forEach((e, idx) => {
          const c = P(e.x, 8);
          if (e.bar) {
            const bw = Math.max(5, 2 * BT * s), bh = 2 * BH * s, gr = ctx.createLinearGradient(c.x - bw / 2, 0, c.x + bw / 2, 0);
            gr.addColorStop(0, "rgb(150,84,40)"); gr.addColorStop(0.5, "rgb(232,160,98)"); gr.addColorStop(1, "rgb(140,78,36)");
            ctx.fillStyle = gr; ctx.fillRect(c.x - bw / 2, c.y - bh / 2, bw, bh);
            ctx.strokeStyle = "rgba(60,30,10,0.8)"; ctx.lineWidth = 1; ctx.strokeRect(c.x - bw / 2, c.y - bh / 2, bw, bh);
            AP.brassDisc(ctx, c.x, c.y - bh / 2 + 6, 4);
          } else { AP.brassDisc(ctx, c.x, c.y, RA * s); AP.brassDisc(ctx, c.x, c.y, 3); }
          raw(ctx, idx ? "−" : "+", c.x, c.y - (e.bar ? BH * s + 6 : RA * s + 6), idx ? "rgb(140,190,255)" : "rgb(255,150,130)", 16, "center", "800");
        });
        const term = e => e.bar ? P(e.x, 8 - BH + 0.25) : P(e.x, 8);
        // 電源供應器、三用電表與導線
        const ps = AP.powerSupply(ctx, 16, 12, 150, 62, V0.toFixed(1) + " V", { label: "直流電源", knob: (V0 - 2) / 10 });
        knob = { x: 16 + 150 - 11 - 9.3, y: 12 + 10 + 11 };
        const mx = VW - 124, mm = AP.multimeter(ctx, mx, oy, 108, 156, V.toFixed(2), { unit: "DC V" });
        raw(ctx, "伏特計", mx + 54, oy + 172, light() ? "rgb(60,40,20)" : "rgb(240,220,190)", 11, "center");
        AP.cable(ctx, [ps.red, term(E[0])], "rgb(200,46,40)", 2.4, 20);
        AP.cable(ctx, [ps.black, term(E[1])], "rgb(36,36,40)", 2.4, 26);
        const tb = E[1].bar ? P(E[1].x, 8 + BH - 0.25) : P(E[1].x, 8);
        AP.cable(ctx, [mm.black, tb], "rgb(36,36,40)", 2, 30);
        // 探針：鋼針＋紅色握柄，導線接回電表紅孔
        const t = P(tx, ty);
        AP.cable(ctx, [{ x: t.x + 30, y: t.y - 40 }, mm.red], "rgb(200,46,40)", 2, 24);
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgb(206,212,220)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + 9, t.y - 12); ctx.stroke();
        ctx.strokeStyle = "rgb(190,38,34)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(t.x + 9, t.y - 12); ctx.lineTo(t.x + 30, t.y - 40); ctx.stroke();
        ctx.strokeStyle = "rgba(255,190,180,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x + 10, t.y - 15); ctx.lineTo(t.x + 27, t.y - 37); ctx.stroke();
        ctx.lineCap = "butt";
        // 探針處的電場方向（⊥ 等位線）
        if (Em > 0.02 && pv > 0.004 && pv < 0.996) {
          const ux = -g[0] / Math.hypot(g[0], g[1]), uy = -g[1] / Math.hypot(g[0], g[1]), len = clamp(14 + Em * 26, 18, 54);
          ctx.strokeStyle = "rgb(110,244,190)"; ctx.lineWidth = 1.4; ctx.beginPath();
          ctx.moveTo(t.x - uy * 14, t.y + ux * 14); ctx.lineTo(t.x + uy * 14, t.y - ux * 14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(t.x + ux * 6 - uy * 6, t.y + uy * 6 + ux * 6); ctx.lineTo(t.x - uy * 6, t.y + ux * 6); ctx.stroke();
          D.arrow(ctx, t.x, t.y, t.x + ux * len, t.y + uy * len, { color: "#ffe36e", width: 2.2, head: 8 });
          raw(ctx, "E", t.x + ux * (len + 9) - 4, t.y + uy * (len + 9) + 4, "#ffe36e", 12, "left", "800");
        }
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(t.x, t.y, 2.2, 0, TAU); ctx.fill();
        // 畫布上的關鍵式
        const cx0 = 182, cw = VW - 124 - cx0 - 14;
        AP.infoCard(ctx, cx0, 12, cw, 62);
        D.text(ctx, "E = −ΔV/Δd　　W_AB = q(V_A − V_B)", cx0 + 12, 36, { size: 14, weight: "800", color: PL.col("text") });
        D.text(ctx, "電場線 ⊥ 等位線，由高電位指向低電位；等位線越密 → 電場越強", cx0 + 12, 60, { size: 11.5, color: PL.col("text-dim") });
        gProbe.place((t.x + 20) * k, (t.y - 26) * k);
        const em = P(E[1].x, 8);
        gElec.place(em.x * k, em.y * k);
        gKnob.place(knob.x * k, knob.y * k);
      });
      // 讀數與判讀
      rV.set(V, 2); rE.set(Em, 2); rN.set(String(recs.length));
      dv.set(0, V, 2); dv.set(1, Em, 2); dv.set(2, (V0 / d).toFixed(2) + " V/cm"); dv.set(3, V, 2);
      if (mode !== "plates") dv.set(2, "只適用平行板");
      const step = V0 > 8 ? 2 : 1, near = Math.round(V / step) * step;
      if (pv >= 0.996) vd.set("探針碰到正電極：V = V₀ = " + V0 + " V（整塊電極是等位體）", "warn");
      else if (pv <= 0.004) vd.set("探針碰到負電極：V = 0（伏特計黑棒就接在這裡）", "warn");
      else if (Math.abs(V - near) < 0.06 && near > 0 && near < V0) vd.set("探針在 " + near + " V 等位線上：沿這條線移動電荷，電力不做功", "ok");
      else vd.set("探針電位 " + V.toFixed(2) + " V，電場 " + Em.toFixed(2) + " V/cm" + (mode === "plates" && Math.abs(tx - 12) < d / 2 - 1 && Math.abs(ty - 8) < 3.5 ? "——板間等位線等距，是均勻電場" : "——指向電位較低處"), "info");
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* =====================================================================
     2. 電位與電位能：點電荷的電位地形
     氣墊桌（幾乎無摩擦）上放兩顆帶電金屬球，帶電小圓盤是試驗電荷。
     色階＝電位（紅高藍低），放手後小圓盤受 qE 加速：U 減少多少、K 就增加多少。
     ===================================================================== */
  PL.register("electric-potential", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.64);
    const KC = 8.99e9, QT = 1e-7, MS = 0.005, RS = 0.03, RP = 0.015, TW = 1.2, TH = 0.6, X1 = 0.35, Y0 = 0.3, SLOW = 0.25;
    const NXg = 61, NYg = 31;
    let qs = 1, layers = ["map", "path", "axis"];
    PL.ui.section(L.controls, "場源電荷（絕緣柱上的金屬球）");
    const sQ1 = PL.ui.slider(L.controls, { label: "Q₁", min: -5, max: 5, step: 0.5, value: 3, unit: "μC", digits: 1, onInput: () => resetPuck() });
    const sQ2 = PL.ui.slider(L.controls, { label: "Q₂", min: -5, max: 5, step: 0.5, value: -3, unit: "μC", digits: 1, onInput: () => resetPuck() });
    const sD = PL.ui.slider(L.controls, { label: "兩球距離 d", min: 20, max: 75, step: 1, value: 50, unit: "cm", digits: 0, onInput: () => resetPuck() });
    PL.ui.section(L.controls, "試驗電荷（帶電小圓盤，m = 5 g）");
    const cQ = PL.ui.chipGroup(L.controls, { value: "p", options: [{ value: "p", label: "+q = +0.1 μC" }, { value: "n", label: "−q = −0.1 μC" }],
      onChange: v => { qs = v === "p" ? 1 : -1; resetPuck(); } });
    const sX = PL.ui.slider(L.controls, { label: "放手位置 x", min: 2, max: 118, step: 1, value: 48, unit: "cm", digits: 0, onInput: () => resetPuck() });
    const sY = PL.ui.slider(L.controls, { label: "放手位置 y", min: 2, max: 58, step: 1, value: 14, unit: "cm", digits: 0, onInput: () => resetPuck() });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "放開試驗電荷", () => release(), { trigger: true });
    PL.ui.button(row, "拿回放手點", () => resetPuck());
    PL.ui.chipGroup(L.controls, { multi: true, value: ["map", "path", "axis"], options: [
      { value: "map", label: "電位色階＋等位線" }, { value: "path", label: "兩條路徑 A→B" }, { value: "axis", label: "連線上 E=0／V=0" }],
      onChange: v => { layers = v; draw(); } });
    const pre = (a, b, d, q) => () => { qs = q; cQ.set(q > 0 ? "p" : "n"); push(sQ1, a); push(sQ2, b); push(sD, d); resetPuck(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "電偶極 +3／−3", apply: pre(3, -3, 50, 1) },
      { label: "等量同號 +3／+3", apply: pre(3, 3, 50, 1) },
      { label: "+4 與 −1（E=0 在外側）", apply: pre(4, -1, 40, 1) },
      { label: "負試驗電荷 −q", apply: pre(3, -3, 50, -1) }] });

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rV = PL.ui.readout(L.readouts, { label: "所在處電位 V", unit: "kV" });
    const rU = PL.ui.readout(L.readouts, { label: "電位能 U = qV", unit: "mJ" });
    const rK = PL.ui.readout(L.readouts, { label: "動能 K", unit: "mJ" });
    const rW = PL.ui.readout(L.readouts, { label: "電力做功 W = U₀ − U", unit: "mJ" });
    const rE = PL.ui.readout(L.readouts, { label: "電場量值 E", unit: "kN/C" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "連線上 E = 0（距 Q₁）", unit: "", hint: "同號在中間、異號在小電荷外側" },
      { label: "連線上 V = 0（距 Q₁）", unit: "", hint: "電位是純量，直接相加" },
      { label: "由無窮遠搬到放手點，外力做功 qV", unit: "mJ" }]);

    const src = () => [{ x: X1, y: Y0, q: sQ1.get() * 1e-6 }, { x: X1 + sD.get() / 100, y: Y0, q: sQ2.get() * 1e-6 }];
    function field(x, y, S) {
      let V = 0, ex = 0, ey = 0;
      S.forEach(c => { const dx = x - c.x, dy = y - c.y, r = Math.max(Math.hypot(dx, dy), 0.012), f = KC * c.q / (r * r * r); V += KC * c.q / r; ex += f * dx; ey += f * dy; });
      return { V, ex, ey };
    }
    const P = { x: 0.48, y: 0.14, vx: 0, vy: 0, ax: 0, ay: 0 };
    let moving = false, stuck = "", U0 = 0, trail = [], B = { x: 1.02, y: 0.5 }, gridKey = "", grid = new Float64Array(NXg * NYg), escale = 10;
    function accel(S) { const f = field(P.x, P.y, S); P.ax = qs * QT * f.ex / MS; P.ay = qs * QT * f.ey / MS; }
    function resetPuck() {
      moving = false; stuck = ""; trail = [];
      P.x = sX.get() / 100; P.y = sY.get() / 100; P.vx = P.vy = 0;
      U0 = qs * QT * field(P.x, P.y, src()).V;
      escale = Math.max(5, Math.abs(U0) * 1000 * 1.5);
      draw();
    }
    function release() {
      if (stuck) resetPuck();
      if (moving) return;
      const S = src();
      if (S.some(c => Math.hypot(P.x - c.x, P.y - c.y) < RS + RP)) { stuck = "球上"; draw(); return; }
      U0 = qs * QT * field(P.x, P.y, S).V; accel(S); moving = true; trail = [[P.x, P.y]];
      clock.start();
    }
    function advance(dt) {
      const S = src();
      let left = dt * SLOW;
      while (left > 1e-9 && moving) {
        const h = Math.min(left, 2e-4); left -= h;
        // 速度 Verlet：能量守恆比尤拉法好得多
        P.vx += P.ax * h / 2; P.vy += P.ay * h / 2;
        P.x += P.vx * h; P.y += P.vy * h;
        if (P.x < RP) { P.x = 2 * RP - P.x; P.vx = -P.vx; } if (P.x > TW - RP) { P.x = 2 * (TW - RP) - P.x; P.vx = -P.vx; }
        if (P.y < RP) { P.y = 2 * RP - P.y; P.vy = -P.vy; } if (P.y > TH - RP) { P.y = 2 * (TH - RP) - P.y; P.vy = -P.vy; }
        accel(S);
        P.vx += P.ax * h / 2; P.vy += P.ay * h / 2;
        S.forEach((c, i) => { if (Math.hypot(P.x - c.x, P.y - c.y) < RS + RP) { moving = false; stuck = i ? "Q₂" : "Q₁"; P.vx = P.vy = 0; } });
      }
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(P.x - last[0], P.y - last[1]) > 0.006) { trail.push([P.x, P.y]); if (trail.length > 400) trail.shift(); }
    }
    function workAlong(pt, S) {
      let W = 0, prev = pt(0);
      for (let i = 1; i <= 500; i++) {
        const c = pt(i / 500), f = field((prev.x + c.x) / 2, (prev.y + c.y) / 2, S);
        W += qs * QT * (f.ex * (c.x - prev.x) + f.ey * (c.y - prev.y)); prev = c;
      }
      return W;
    }
    function axisRoots(S) {
      const out = { e: [], v: [] };
      let pe = null, pv = null;
      for (let x = 0.005; x <= TW - 0.005; x += 0.0025) {
        if (S.some(c => Math.abs(x - c.x) < RS)) { pe = pv = null; continue; }
        const f = field(x, Y0, S);
        if (pe != null && (pe < 0) !== (f.ex < 0) && Math.abs(f.ex) + Math.abs(pe) > 1) out.e.push(x - 0.00125);
        if (pv != null && (pv < 0) !== (f.V < 0)) out.v.push(x - 0.00125);
        pe = f.ex; pv = f.V;
      }
      return out;
    }

    let geo = { ox: 24, oy: 24, s: 600 };
    const gQ2 = PL.ui.handle(cv, { slider: sD, label: "金屬球 Q₂（左右拖改距離 d）", toValue: x => ((x * VW / cv.W - geo.ox) / geo.s - X1) * 100 });
    const gPuck = PL.ui.handle(cv, { slider: sX, label: "試驗電荷（拖到任一點放手）",
      onDrag: (x, y) => { const k = cv.W / VW; push(sX, (x / k - geo.ox) / geo.s * 100); push(sY, (y / k - geo.oy) / geo.s * 100); },
      onRelease: () => release() });
    const gB = PL.ui.handle(cv, { label: "終點 B（比較兩條路徑）",
      onDrag: (x, y) => { const k = cv.W / VW; B = { x: clamp((x / k - geo.ox) / geo.s, 0.03, TW - 0.03), y: clamp((y / k - geo.oy) / geo.s, 0.03, TH - 0.03) }; draw(); } });

    const clock = PL.motion.clock(dt => { if (moving && dt > 0) advance(dt); draw(); });
    function draw() {
      const S = src(), f = field(P.x, P.y, S), U = qs * QT * f.V, K = 0.5 * MS * (P.vx * P.vx + P.vy * P.vy);
      const VA = field(sX.get() / 100, sY.get() / 100, S).V;
      const rts = axisRoots(S);
      cv.clear(); D.bg(cv);
      scaled(cv, (ctx, VH, k) => {
        AP.deskTop(ctx, 0, 0, VW, VH);
        const t = AP.airTable(ctx, 14, 14, VW - 28, Math.min(VH - 112, (VW - 48) * TH / TW + 20));
        const s = t.w / TW, ox = t.x, oy = t.y;
        geo = { ox, oy, s };
        const X = x => ox + x * s, Y = y => oy + y * s;
        // 電位色階與等位線（格點值只在電荷或距離改變時重算）
        const kk = sQ1.get() + "|" + sQ2.get() + "|" + sD.get();
        if (kk !== gridKey) { gridKey = kk; for (let j = 0; j < NYg; j++) for (let i = 0; i < NXg; i++) grid[j * NXg + i] = field(i * TW / (NXg - 1), j * (t.h / s) / (NYg - 1), S).V / 1000; }
        const cw = t.w / (NXg - 1), ch = t.h / (NYg - 1);
        if (layers.indexOf("map") >= 0) {
          for (let j = 0; j < NYg - 1; j++) for (let i = 0; i < NXg - 1; i++) {
            const n = j * NXg + i, v = (grid[n] + grid[n + 1] + grid[n + NXg] + grid[n + NXg + 1]) / 4, a = 0.46 * (1 - Math.exp(-Math.abs(v) / 70));
            if (a < 0.02) continue;
            ctx.fillStyle = v > 0 ? "rgba(232,70,52," + a.toFixed(3) + ")" : "rgba(48,110,232," + a.toFixed(3) + ")";
            ctx.fillRect(ox + i * cw, oy + j * ch, cw + 0.6, ch + 0.6);
          }
          [-320, -160, -80, -40, -20, 20, 40, 80, 160, 320].forEach(lv => {
            ctx.strokeStyle = lv > 0 ? "rgba(196,50,36,0.75)" : "rgba(36,84,196,0.75)"; ctx.lineWidth = 1; ctx.beginPath();
            contour(grid, NXg, NYg, lv, (a, b, c, e) => { ctx.moveTo(ox + a * cw, oy + b * ch); ctx.lineTo(ox + c * cw, oy + e * ch); });
            ctx.stroke();
          });
          ctx.strokeStyle = PL.col("accent"); ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath();
          contour(grid, NXg, NYg, 0, (a, b, c, e) => { ctx.moveTo(ox + a * cw, oy + b * ch); ctx.lineTo(ox + c * cw, oy + e * ch); });
          ctx.stroke(); ctx.setLineDash([]);
        }
        // 連線（軸）上的 E = 0 與 V = 0
        if (layers.indexOf("axis") >= 0) {
          D.line(ctx, ox, Y(Y0), ox + t.w, Y(Y0), PL.col("text-faint"), 1, [3, 4]);
          rts.v.forEach(x => { ctx.fillStyle = PL.col("accent"); ctx.beginPath(); ctx.moveTo(X(x), Y(Y0) - 6); ctx.lineTo(X(x) + 6, Y(Y0)); ctx.lineTo(X(x), Y(Y0) + 6); ctx.lineTo(X(x) - 6, Y(Y0)); ctx.closePath(); ctx.fill(); tag(ctx, "V = 0", X(x), Y(Y0) + 26, { align: "center", color: PL.col("accent"), size: 10 }); });
          rts.e.forEach(x => { D.line(ctx, X(x) - 6, Y(Y0) - 6, X(x) + 6, Y(Y0) + 6, "#8e44ad", 2.4); D.line(ctx, X(x) - 6, Y(Y0) + 6, X(x) + 6, Y(Y0) - 6, "#8e44ad", 2.4); tag(ctx, "E = 0", X(x), Y(Y0) - 14, { align: "center", color: "#8e44ad", size: 10 }); });
        }
        // 兩條路徑：A（放手點）→ B
        let W1 = 0, W2 = 0;
        const A = { x: sX.get() / 100, y: sY.get() / 100 };
        if (layers.indexOf("path") >= 0) {
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ll = Math.hypot(B.x - A.x, B.y - A.y) || 1;
          let nx = -(B.y - A.y) / ll, ny = (B.x - A.x) / ll;
          if (my + ny * 0.24 < 0.04 || my + ny * 0.24 > TH - 0.04) { nx = -nx; ny = -ny; }
          const cxp = mx + nx * 0.24, cyp = my + ny * 0.24;
          const p1 = u => ({ x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u });
          const p2 = u => ({ x: (1 - u) * (1 - u) * A.x + 2 * u * (1 - u) * cxp + u * u * B.x, y: (1 - u) * (1 - u) * A.y + 2 * u * (1 - u) * cyp + u * u * B.y });
          W1 = workAlong(p1, S); W2 = workAlong(p2, S);
          ctx.setLineDash([4, 4]); ctx.lineWidth = 2;
          ctx.strokeStyle = PL.col("accent-2"); ctx.beginPath(); ctx.moveTo(X(A.x), Y(A.y)); ctx.lineTo(X(B.x), Y(B.y)); ctx.stroke();
          ctx.strokeStyle = PL.col("accent-3"); ctx.beginPath(); ctx.moveTo(X(A.x), Y(A.y)); ctx.quadraticCurveTo(X(cxp), Y(cyp), X(B.x), Y(B.y)); ctx.stroke();
          ctx.setLineDash([]);
          D.text(ctx, "①", X(A.x + (B.x - A.x) * 0.3) + 5, Y(A.y + (B.y - A.y) * 0.3) - 5, { color: PL.col("accent-2"), size: 12, weight: "800" });
          D.text(ctx, "②", X(p2(0.5).x) + 4, Y(p2(0.5).y) - 4, { color: PL.col("accent-3"), size: 12, weight: "800" });
          D.disc(ctx, X(B.x), Y(B.y), 6, { fill: PL.col("panel-solid"), stroke: PL.col("text"), width: 2 });
          D.text(ctx, "B", X(B.x) + 9, Y(B.y) + 4, { size: 12, weight: "800", color: PL.col("text") });
          D.text(ctx, "A", X(A.x) - 22, Y(A.y) + 4, { size: 12, weight: "800", color: PL.col("text") });
        }
        // 金屬球（絕緣柱頂端，俯視）
        S.forEach((c, i) => {
          const cx = X(c.x), cy = Y(c.y), r = RS * s;
          ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.arc(cx + 3, cy + 4, r, 0, TAU); ctx.fill();
          const gr = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 1, cx, cy, r);
          gr.addColorStop(0, "rgb(250,252,255)"); gr.addColorStop(0.55, c.q > 0 ? "rgb(226,150,140)" : c.q < 0 ? "rgb(140,170,226)" : "rgb(176,184,196)"); gr.addColorStop(1, c.q > 0 ? "rgb(150,50,40)" : c.q < 0 ? "rgb(40,70,150)" : "rgb(90,98,110)");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
          raw(ctx, c.q > 0 ? "+" : c.q < 0 ? "−" : "0", cx, cy + 6, "#fff", 17, "center", "800");
          tag(ctx, (i ? "Q₂ = " : "Q₁ = ") + (c.q > 0 ? "+" : "") + (c.q * 1e6).toFixed(1) + " μC", cx, cy + r + 20, { align: "center", color: c.q >= 0 ? POS : NEG, size: 10.5 });
        });
        // 軌跡與試驗電荷
        if (trail.length > 1) { ctx.strokeStyle = "rgba(255,190,40,0.85)"; ctx.lineWidth = 2; ctx.beginPath(); trail.forEach((q, i) => i ? ctx.lineTo(X(q[0]), Y(q[1])) : ctx.moveTo(X(q[0]), Y(q[1]))); ctx.stroke(); }
        const px = X(P.x), py = Y(P.y), pr = RP * s;
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.arc(px + 2, py + 3, pr, 0, TAU); ctx.fill();
        const pg = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, 1, px, py, pr);
        pg.addColorStop(0, "rgb(255,246,190)"); pg.addColorStop(1, "rgb(222,160,20)");
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(110,70,0,0.8)"; ctx.lineWidth = 1; ctx.stroke();
        raw(ctx, qs > 0 ? "+" : "−", px, py + 4.5, "rgb(90,50,0)", 13, "center", "800");
        const Fm = Math.hypot(f.ex, f.ey);
        if (Fm > 1 && !stuck) { const len = clamp(10 + 9 * Math.log10(1 + Fm / 2e3), 14, 60), ux = qs * f.ex / Fm, uy = qs * f.ey / Fm; D.arrow(ctx, px + ux * (pr + 2), py + uy * (pr + 2), px + ux * (pr + 2 + len), py + uy * (pr + 2 + len), { color: "#e67e22", width: 2.4, head: 8 }); }
        // 下方：關鍵式與能量長條
        const by = t.y + t.h + 18, bh = VH - by - 8;
        AP.infoCard(ctx, 14, by, 380, bh);
        D.text(ctx, "V = kQ/r　U = qV　W_A→B = q(V_A − V_B) = −ΔU", 24, by + 22, { size: 12.5, weight: "800", color: PL.col("text") });
        if (layers.indexOf("path") >= 0) {
          D.text(ctx, "路徑① W = " + (W1 * 1e3).toFixed(2) + " mJ　路徑② W = " + (W2 * 1e3).toFixed(2) + " mJ", 24, by + 42, { size: 11.5, color: PL.col("text") });
          D.text(ctx, "q(V_A − V_B) = " + (qs * QT * (VA - field(B.x, B.y, S).V) * 1e3).toFixed(2) + " mJ → 電力做功與路徑無關", 24, by + 60, { size: 11.5, color: PL.col("ok"), weight: "700" });
        } else D.text(ctx, "正電荷往電位低處加速；負電荷往電位高處加速", 24, by + 46, { size: 11.5, color: PL.col("text-dim") });
        const ex0 = 404, ew = VW - 14 - ex0;
        AP.infoCard(ctx, ex0, by, ew, bh);
        const zx = ex0 + 108 + (ew - 180) / 2, half = (ew - 180) / 2, bars = [["U = qV", U * 1e3, U >= 0 ? POS : NEG], ["K", K * 1e3, "#27ae60"], ["U + K", (U + K) * 1e3, PL.col("text-dim")]];
        bars.forEach((b, i) => {
          const yy = by + 12 + i * (bh - 18) / 3, hh = (bh - 18) / 3 - 5, w = clamp(b[1] / escale, -1, 1) * half;
          D.text(ctx, b[0], ex0 + 10, yy + hh - 3, { size: 11, weight: "700", color: PL.col("text") });
          ctx.fillStyle = b[2]; ctx.fillRect(Math.min(zx, zx + w), yy, Math.abs(w), hh);
          D.text(ctx, b[1].toFixed(2) + " mJ", ex0 + ew - 10, yy + hh - 3, { size: 11, align: "right", color: PL.col("text") });
        });
        D.line(ctx, zx, by + 8, zx, by + bh - 6, PL.col("text-faint"), 1);
        gQ2.place(X(S[1].x) * k, Y(S[1].y) * k);
        gPuck.place(px * k, py * k);
        if (layers.indexOf("path") >= 0) gB.place(X(B.x) * k, Y(B.y) * k); else gB.hide();
      });
      rV.set(f.V / 1000, 1); rU.set(U * 1e3, 2); rK.set(K * 1e3, 2); rW.set((U0 - U) * 1e3, 2); rE.set(Math.hypot(f.ex, f.ey) / 1000, 1);
      const fmtR = a => a.length ? a.map(x => ((x - X1) * 100).toFixed(1) + " cm").join("、") : "沒有";
      dv.set(0, fmtR(rts.e)); dv.set(1, fmtR(rts.v)); dv.set(2, qs * QT * VA * 1e3, 2);
      if (stuck) vd.set("試驗電荷撞上 " + stuck + "：一路被吸過去，U 一直減少、K 一直增加", "warn");
      else if (moving) vd.set("U 減少 " + ((U0 - U) * 1e3).toFixed(2) + " mJ → K 增加 " + (K * 1e3).toFixed(2) + " mJ：U + K 守恆", "ok");
      else vd.set(qs > 0 ? "正電荷放手後往電位較低處（藍）加速" : "負電荷放手後往電位較高處（紅）加速", "info");
    }
    cv.onResize(() => draw());
    resetPuck();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* =====================================================================
     3. 平行板電容器
     與 PhET 相同的理想化：介電質塊的厚度恰好填滿板間，只改變插入的比例 f，
     等效為兩個並聯電容：C = ε₀A[(1 − f) + κf]/d。
     ===================================================================== */
  PL.register("parallel-plate-capacitor", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.64);
    const EPS = 8.85e-12, PXMM = 14, PXCM = 12, CX = 330;
    let conn = true, Qlock = 0, base = null, flowS = 0, flowA = 0, lastQ = null;
    PL.ui.section(L.controls, "電池");
    const cSw = PL.ui.chipGroup(L.controls, { value: "on", options: [{ value: "on", label: "接著電池" }, { value: "off", label: "斷開電池" }], onChange: v => setConn(v === "on") });
    const sVb = PL.ui.slider(L.controls, { label: "電池電壓 ε", min: 1.5, max: 12, step: 0.5, value: 6, unit: "V", digits: 1, onInput: () => draw() });
    PL.ui.section(L.controls, "電容器");
    const sD = PL.ui.slider(L.controls, { label: "板距 d", min: 2, max: 10, step: 0.5, value: 4, unit: "mm", digits: 1, onInput: () => draw() });
    const sA = PL.ui.slider(L.controls, { label: "板面積 A", min: 100, max: 400, step: 25, value: 225, unit: "cm²", digits: 0, onInput: () => draw() });
    const sK = PL.ui.slider(L.controls, { label: "介電常數 κ", min: 1, max: 8, step: 0.5, value: 4, unit: "", digits: 1, onInput: () => draw() });
    const sF = PL.ui.slider(L.controls, { label: "介電質插入", min: 0, max: 100, step: 5, value: 0, unit: "%", digits: 0, onInput: () => draw() });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "設為比較基準", () => { base = model(); draw(); });
    function model() {
      const d = sD.get() / 1000, A = sA.get() / 1e4, k = sK.get(), f = sF.get() / 100, C = EPS * A * (1 - f + k * f) / d;
      const Q = conn ? C * sVb.get() : Qlock, V = Q / C;
      return { d, A, k, f, C, Q, V, E: V / d, U: 0.5 * Q * V };
    }
    function setConn(on) { if (!on && conn) Qlock = model().Q; conn = on; base = model(); draw(); }
    const Qv = PL.motion.follower(0, { omega: 4.5, zeta: 1 }), sw = PL.motion.follower(0, { omega: 9, zeta: 0.75 });
    const scen = (on, d0, f0, d1, f1) => () => {
      conn = true; cSw.set("on"); push(sK, 4); push(sD, d0); push(sF, f0);
      if (!on) { Qlock = model().Q; conn = false; cSw.set("off"); }
      base = model(); Qv.target = base.Q; Qv.snap(); lastQ = null;
      push(sD, d1); push(sF, f1); draw();
    };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "接著電池・板距加倍", apply: scen(true, 3, 0, 6, 0) },
      { label: "斷開電池・板距加倍", apply: scen(false, 3, 0, 6, 0) },
      { label: "接著電池・插入介電質", apply: scen(true, 4, 0, 4, 100) },
      { label: "斷開電池・插入介電質", apply: scen(false, 4, 0, 4, 100) }] });
    const cz = PL.ui.causality(L.canvasWrap.parentNode, { title: "先分清楚：電池接著還是斷開？", rows: [
      { name: "接著電池", tone: "a", note: "電池把兩板電位差維持在 ε：V 固定，Q = CV 跟著 C 變" },
      { name: "斷開電池", tone: "b", note: "電荷無路可走：Q 固定，V = Q/C 跟著 C 變" },
      { name: "E 與 U", tone: "c", note: "E = V/d；U = ½CV² = Q²/(2C)" }] });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "C／C₀" }, { label: "Q／Q₀" }, { label: "V／V₀" }, { label: "E／E₀" }, { label: "U／U₀" }]);
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rC = PL.ui.readout(L.readouts, { label: "電容 C", unit: "pF" });
    const rQ = PL.ui.readout(L.readouts, { label: "電量 Q", unit: "nC" });
    const rV = PL.ui.readout(L.readouts, { label: "兩板電壓 V", unit: "V" });
    const rE = PL.ui.readout(L.readouts, { label: "板間電場 E", unit: "kV/m" });
    const rU = PL.ui.readout(L.readouts, { label: "儲存能量 U", unit: "nJ" });

    let G = { yb: 368, gap: 56, pw: 180, pl: 240, slabL: 420 };
    const gTop = PL.ui.handle(cv, { slider: sD, label: "上極板（上下拖改板距 d）", toValue: (x, y) => (G.yb - 37 - y * VW / cv.W) / PXMM });
    const gSlab = PL.ui.handle(cv, { slider: sF, label: "介電質塊（左右拖插入）", toValue: x => (1 - (x * VW / cv.W + 14 - G.pw - G.pl) / G.pw) * 100 });
    const gArea = PL.ui.handle(cv, { slider: sA, label: "極板邊緣（左右拖改面積 A）", toValue: x => { const side = 2 * (CX - x * VW / cv.W) / PXCM; return side * side; } });
    const clock = PL.motion.clock(dt => draw(dt), { ambient: true });
    function draw(dt) {
      const m = model();
      if (!base) base = m;
      const running = !!(clock && clock.running);
      const q = Qv.update(m.Q, dt, running);
      if (lastQ == null) lastQ = q;
      const dq = q - lastQ; lastQ = q;
      flowS += dq * 1e9 * 500;
      flowA = dt > 0 ? clamp(Math.abs(dq) * 1e9 / dt / 0.4, 0, 1) : 0;
      const so = sw.update(conn ? 0 : 1, dt, running);
      cv.clear(); D.bg(cv);
      scaled(cv, (ctx, VH, k) => {
        const benchY = VH - 58;
        AP.labRoom(ctx, VW, VH, benchY, {});
        const yb = benchY - 86, gap = sD.get() * PXMM, pw = Math.sqrt(sA.get()) * PXCM, pl = CX - pw / 2, pr = CX + pw / 2, yt = yb - gap, f = m.f;
        const slabL = pl + (1 - f) * pw;
        G = { yb, gap, pw, pl, slabL };
        // 層板：電源與開關放在上面
        ctx.fillStyle = light() ? "rgb(176,128,80)" : "rgb(92,64,40)"; ctx.fillRect(10, 128, 300, 9);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(10, 137, 300, 4);
        [40, 280].forEach(x => AP.steel(ctx, x - 3, 137, 6, 22, 10));
        const ps = AP.powerSupply(ctx, 22, 64, 132, 62, sVb.get().toFixed(1) + " V", { label: "電池（直流電源）", knob: (sVb.get() - 1.5) / 10.5 });
        const ks = AP.knifeSwitch(ctx, 232, 128, 78, so);
        D.text(ctx, conn ? "開關閉合" : "開關打開", 232, 104, { size: 10.5, align: "center", color: conn ? PL.col("ok") : PL.col("warn"), weight: "700" });
        // 支架：鐵架＋橫桿＋絕緣棒吊著上極板
        AP.standRod(ctx, 96, benchY, yt - 64);
        AP.crossArm(ctx, 96, yt - 52, CX + 8);
        ctx.fillStyle = "rgba(236,226,196,0.95)"; ctx.fillRect(CX - 4, yt - 52, 8, 45);
        ctx.strokeStyle = "rgba(90,80,60,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(CX - 4, yt - 52, 8, 45);
        // 下極板的壓克力底座
        ctx.fillStyle = "rgba(190,226,240,0.35)"; ctx.fillRect(CX - 22, yb + 7, 44, benchY - yb - 7);
        ctx.strokeStyle = "rgba(120,170,200,0.7)"; ctx.strokeRect(CX - 22, yb + 7, 44, benchY - yb - 7);
        AP.contactShadow(ctx, CX, benchY + 2, 40);
        // 介電質塊（厚度恰好等於板距）
        ctx.fillStyle = "rgba(255,190,96," + (0.14 + 0.05 * m.k).toFixed(3) + ")"; ctx.fillRect(slabL, yt, pw, gap);   // κ 越大的材料畫得越不透明
        ctx.strokeStyle = "rgba(196,120,30,0.9)"; ctx.lineWidth = 1.4; ctx.strokeRect(slabL, yt, pw, gap);
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(slabL + 3, yt + 2, pw - 6, Math.min(5, gap / 4));
        // 介電質內的分子偶極：κ 越大可極化的分子越多；在板間被電場排成「−在上、+在下」，板外則雜亂
        const nd = Math.round((m.k - 1) * 4), cols = Math.max(1, Math.ceil(nd / 2));
        for (let i = 0; i < nd; i++) {
          const x = slabL + (i % cols + 0.5) * pw / cols, y = yt + gap * (i < cols ? 0.32 : 0.7), inGap = x < pr && m.E > 0;
          ctx.save(); ctx.translate(x, y); ctx.rotate(inGap ? Math.PI / 2 : (i * 2.4) % TAU);
          ctx.fillStyle = "rgba(44,102,206,0.55)"; ctx.beginPath(); ctx.ellipse(-2.2, 0, 2.4, 1.6, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(214,58,48,0.55)"; ctx.beginPath(); ctx.ellipse(2.2, 0, 2.4, 1.6, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
        D.text(ctx, "κ = " + m.k.toFixed(1), slabL + pw / 2, yt + gap / 2 + 4, { size: 11, align: "center", weight: "700", color: light() ? "rgb(140,80,10)" : "rgb(255,200,120)" });
        // 電場線：密度 ∝ E（兩區 E 相同，都等於 V/d）
        const nL = clamp(Math.round(m.E / 150), 0, 36), fc = light() ? "rgba(196,104,10,0.85)" : "rgba(255,196,90,0.8)";
        for (let i = 0; i < nL; i++) {
          const x = pl + (i + 0.5) * pw / nL;
          D.line(ctx, x, yt + 3, x, yb - 3, fc, 1.2);
          if (gap > 30) arrowHead(ctx, x, yt + gap / 2 + 3, Math.PI / 2, 4, fc);
        }
        // 極板上的電荷（面密度在介電質那一段是 κ 倍）
        const unit = 0.02e-9, n = Math.min(70, Math.round(Math.abs(q) / unit)), wA = 1 - f, wK = f * m.k, tot = wA + wK || 1;
        const xs = [];
        for (let i = 0; i < n; i++) {
          const c = (i + 0.5) / n * tot;
          xs.push(c < wA ? pl + c / (wA || 1) * (1 - f) * pw : slabL + (c - wA) / (wK || 1) * f * pw);
        }
        // 金屬板
        const plate = (y, label) => {
          const g = ctx.createLinearGradient(0, y, 0, y + 7);
          g.addColorStop(0, "rgb(224,230,238)"); g.addColorStop(1, "rgb(132,142,156)");
          ctx.fillStyle = g; ctx.fillRect(pl, y, pw, 7);
          ctx.strokeStyle = "rgba(40,48,60,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(pl, y, pw, 7);
          D.text(ctx, label, pl - 8, y + 7, { size: 13, align: "right", weight: "800", color: label[0] === "+" ? POS : NEG });
        };
        plate(yt - 7, "+Q"); plate(yb, "−Q");
        xs.forEach(x => { D.disc(ctx, x, yt + 3.5, 2.6, { fill: POS }); D.disc(ctx, x, yb - 3.5, 2.6, { fill: NEG }); });
        // 介電質表面的極化（束縛）電荷：靠 + 板那面是 −、靠 − 板那面是 +
        if (f > 0 && m.k > 1) {
          const nb = Math.round(xs.filter(x => x >= slabL).length * (1 - 1 / m.k));
          for (let i = 0; i < nb; i++) {
            const x = slabL + (i + 0.5) / nb * f * pw;
            raw(ctx, "−", x, yt + 15, "rgba(44,102,206,0.9)", 10, "center", "800");
            raw(ctx, "+", x, yb - 7, "rgba(214,58,48,0.9)", 10, "center", "800");
          }
        }
        // 板距標示
        D.line(ctx, pl - 22, yt, pl - 22, yb, PL.col("text-dim"), 1);
        D.text(ctx, "d = " + sD.get().toFixed(1) + " mm", pl - 28, (yt + yb) / 2 + 4, { size: 11, align: "right", color: PL.col("text") });
        // 電表與導線
        const mmX = VW - 112, mm = AP.multimeter(ctx, mmX, benchY - 150, 98, 146, m.V.toFixed(2));
        D.text(ctx, "伏特計", mmX + 49, benchY - 156, { size: 11, align: "center", weight: "700", color: PL.col("text") });
        const wR = [ps.red, ks.left], wT = [ks.right, { x: ks.right.x, y: yt - 30 }, { x: pl + 8, y: yt - 7 }], wB = [ps.black, { x: 120, y: yb + 30 }, { x: pl + 8, y: yb + 7 }];
        AP.cable(ctx, wR, "rgb(200,46,40)", 2.4, 8); AP.cable(ctx, wT, "rgb(200,46,40)", 2.4, 6); AP.cable(ctx, wB, "rgb(36,36,40)", 2.4, 10);
        AP.cable(ctx, [mm.red, { x: pr - 8, y: yt - 7 }], "rgb(200,46,40)", 1.8, 30);
        AP.cable(ctx, [mm.black, { x: pr - 8, y: yb + 7 }], "rgb(36,36,40)", 1.8, 16);
        // 充放電時導線上的電荷流動
        if (flowA > 0.02) {
          const o = { gap: 16, r: 2.4, color: "#ffd45a", glow: 5, alpha: flowA };
          PL.motion.flow(ctx, [[ps.red.x, ps.red.y], [ks.left.x, ks.left.y], [ks.right.x, ks.right.y], [ks.right.x, yt - 30], [pl + 8, yt - 7]], flowS, o);
          PL.motion.flow(ctx, [[pl + 8, yb + 7], [120, yb + 30], [ps.black.x, ps.black.y]], flowS, o);
        }
        // 畫布上的關鍵式
        AP.infoCard(ctx, 352, 12, VW - 366, 70);
        D.text(ctx, "C = κε₀A/d　Q = CV　E = V/d　U = ½CV²", 366, 38, { size: 14, weight: "800", color: PL.col("text") });
        D.text(ctx, conn ? "接著電池 → V 固定（= ε），Q 隨 C 改變" : "斷開電池 → Q 固定，V = Q/C 隨 C 改變", 366, 64, { size: 12, weight: "700", color: conn ? PL.col("accent") : PL.col("warn") });
        gTop.place(CX * k, (yt - 30) * k);
        gSlab.place((slabL + pw - 14) * k, (yt + gap / 2) * k);
        gArea.place((pl + 6) * k, (yb + 26) * k);
      });
      rC.set(m.C * 1e12, 1); rQ.set(m.Q * 1e9, 3); rV.set(m.V, 2); rE.set(m.E / 1000, 2); rU.set(m.U * 1e9, 2);
      const r = (a, b) => b ? "× " + (a / b).toFixed(2) : "—";
      [["C", "C"], ["Q", "Q"], ["V", "V"], ["E", "E"], ["U", "U"]].forEach((p, i) => { dv.set(i, r(m[p[0]], base[p[1]])); const x = m[p[0]] / base[p[1]]; dv.tone(i, x > 1.005 ? "ok" : x < 0.995 ? "warn" : ""); });
      cz.set(0, conn ? "<b>現在</b>：V = " + m.V.toFixed(2) + " V 固定，Q = " + (m.Q * 1e9).toFixed(3) + " nC" : "—");
      cz.set(1, conn ? "—" : "<b>現在</b>：Q = " + (m.Q * 1e9).toFixed(3) + " nC 固定，V = " + m.V.toFixed(2) + " V");
      cz.set(2, "E = " + (m.E / 1000).toFixed(2) + " kV/m，U = " + (m.U * 1e9).toFixed(2) + " nJ");
      const ch = base && Math.abs(m.C / base.C - 1) > 0.005 ? "；C 變為 " + (m.C / base.C).toFixed(2) + " 倍 → " + (conn ? "Q × " + (m.Q / base.Q).toFixed(2) + "、U × " + (m.U / base.U).toFixed(2) : "V × " + (m.V / base.V).toFixed(2) + "、U × " + (m.U / base.U).toFixed(2)) : "";
      vd.set((conn ? "接著電池：V 固定 = " + m.V.toFixed(1) + " V" : "斷開電池：Q 固定 = " + (m.Q * 1e9).toFixed(3) + " nC") + ch, conn ? "info" : "warn");
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* =====================================================================
     4. 摩擦起電與電荷守恆
     每顆「−」代表 10⁹ 個電子。摩擦只把電子從序列中較易失去電子的一方搬到另一方，
     兩邊的點數永遠一樣多（總電量為零）。紙屑被吸起的判準：誘發偶極受力 ∝ Q²/r⁵，
     大於紙屑重量才會跳起，因此臨界距離 r* ∝ Q^(2/5)。
     ===================================================================== */
  PL.register("triboelectric", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.54);
    const SER = ["兔毛", "玻璃", "羊毛", "絲綢", "棉布", "橡膠", "塑膠"];
    const RODS = { plastic: ["塑膠尺", 6], glass: ["玻璃棒", 1], rubber: ["橡膠棒", 5] };
    const CLOTHS = { fur: ["毛皮", 0], silk: ["絲綢", 3], cotton: ["棉布", 4] };
    const DOT = 1e9, E_C = 1.6e-19, PXCM = 16, TX = 600, RL = 250, RH = 14;
    let rodM = "plastic", clothM = "fur", dragging = false, auto = null, parts = [];
    PL.ui.section(L.controls, "材料（對照摩擦起電序列）");
    const cRod = PL.ui.chipGroup(L.controls, { value: "plastic", options: [{ value: "plastic", label: "塑膠尺" }, { value: "glass", label: "玻璃棒" }, { value: "rubber", label: "橡膠棒" }], onChange: v => { rodM = v; neutral(); } });
    const cCloth = PL.ui.chipGroup(L.controls, { value: "fur", options: [{ value: "fur", label: "毛皮" }, { value: "silk", label: "絲綢" }, { value: "cotton", label: "棉布" }], onChange: v => { clothM = v; neutral(); } });
    const sN = PL.ui.slider(L.controls, { label: "摩擦次數 N", min: 0, max: 40, step: 1, value: 10, unit: "次", digits: 0, onInput: () => draw() });
    const sH = PL.ui.slider(L.controls, { label: "棒與紙屑的距離 h", min: 0.5, max: 10, step: 0.5, value: 3, unit: "cm", digits: 1, onInput: () => { if (!dragging) overPaper(); draw(); } });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "自動摩擦 5 下", () => { auto = { t: 0, done: 0 }; clock.start(); }, { primary: true });
    PL.ui.button(row, "拿到紙屑上方", () => { overPaper(); draw(); });
    const preset = (r, c) => () => { rodM = r; clothM = c; cRod.set(r); cCloth.set(c); push(sN, 10); push(sH, 3); overPaper(); draw(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "塑膠尺＋毛皮", apply: preset("plastic", "fur") },
      { label: "玻璃棒＋絲綢", apply: preset("glass", "silk") },
      { label: "玻璃棒＋毛皮（玻璃帶負電！）", apply: preset("glass", "fur") }] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rQr = PL.ui.readout(L.readouts, { label: "棒的電量", unit: "nC" });
    const rQc = PL.ui.readout(L.readouts, { label: "布料的電量", unit: "nC" });
    const rSum = PL.ui.readout(L.readouts, { label: "兩者電量總和", unit: "nC" });
    const rNe = PL.ui.readout(L.readouts, { label: "轉移的電子數 n", unit: "×10⁹ 個" });
    const rLift = PL.ui.readout(L.readouts, { label: "被吸起的紙屑", unit: "片" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "失去電子（帶正電）的是", hint: "序列中較靠左的一方" },
      { label: "每摩擦一次約搬", unit: "×10⁹ 個電子" },
      { label: "Q = ne", unit: "nC" }]);

    function model() {
      const ri = RODS[rodM][1], ci = CLOTHS[clothM][1], rate = Math.abs(ri - ci) * 0.5;
      // 電量會飽和（太多電荷會經空氣漏掉），所以用 1 − e^(−x) 而不是無限線性增加
      const n = Math.round(80 * (1 - Math.exp(-sN.get() * rate / 80))), sg = ri > ci ? -1 : 1;
      return { n, sg, rate, Qr: sg * n * DOT * E_C, Qc: -sg * n * DOT * E_C };
    }
    const benchY = 372, furTop = benchY - 22, trayY = benchY - 4;
    const rod = { x: TX, y: 0 }, cloth = { x: 205 };
    function overPaper() { rod.x = TX; rod.y = trayY - sH.get() * PXCM - RH / 2; }
    overPaper();
    function neutral() { auto = null; parts = []; push(sN, 0); draw(); }
    // 紙屑：位置與質量固定（同一組種子），被吸起的與否完全由當下狀態決定
    const bits = [];
    for (let i = 0, s = 7; i < 16; i++) {
      s = (s * 9301 + 49297) % 233280; const a = s / 233280; s = (s * 9301 + 49297) % 233280; const b = s / 233280;
      bits.push({ x: TX - 92 + i * 12 + (a - 0.5) * 6, w: 9 + b * 7, m: 0.3 * Math.pow(10, ((i * 7) % 16 + 0.5) / 16), rot: (a - 0.5) * 1.2, f: PL.motion.follower(0, { omega: 7, zeta: 0.55 }), slot: (i * 37) % 16 });
    }
    function liftOf(b, Q) {
      const rb = rod.y + RH / 2, dx = Math.max(0, Math.abs(b.x - rod.x) - RL / 2) / PXCM, dy = (trayY - rb) / PXCM;
      if (dy < -0.5) return { up: false, near: false };
      const r = Math.max(0.2, Math.hypot(dx, dy)), rs = 3.1 * Math.pow(Math.abs(Q) / 4e-9, 0.4) * Math.pow(b.m, -0.2);
      return { up: Q !== 0 && r < rs, near: Q !== 0 && r < 2 * rs };
    }
    function contact() { return Math.abs(rod.y + RH / 2 - furTop) < 3 && Math.abs(rod.x - cloth.x) < 150; }
    let lastRel = null, dir = 0, acc = 0;
    function stroke() {
      const n0 = model().n;
      push(sN, sN.get() + 1);
      const m = model(), dn = m.n - n0;
      for (let i = 0; i < Math.min(dn, 8); i++) {
        const x = rod.x + (Math.random() - 0.5) * Math.min(RL, 200), down = { x, y: furTop + 2 }, up = { x: x + (Math.random() - 0.5) * 20, y: rod.y };
        parts.push(m.sg < 0 ? { a: down, b: up, t: -i * 0.05 } : { a: up, b: down, t: -i * 0.05 });
      }
    }
    function rub() {
      if (!contact()) { lastRel = null; return; }
      const rel = rod.x - cloth.x;
      if (lastRel == null) { lastRel = rel; return; }
      const d = rel - lastRel; lastRel = rel;
      if (!d) return;
      const sg = Math.sign(d);
      if (sg !== dir) { if (acc >= 25) stroke(); dir = sg; acc = 0; }
      acc += Math.abs(d);
      if (acc >= 90) { stroke(); acc = 0; }
    }
    const gRod = PL.ui.handle(cv, { slider: sH, label: "棒（拖到布上來回摩擦，再拿到紙屑上方）",
      onGrab: () => { dragging = true; auto = null; },
      onRelease: () => { dragging = false; draw(); },
      onDrag: (x, y) => {
        const k = cv.W / VW, X = x / k - 60, Y = y / k;
        rod.x = clamp(X, 140, VW - 140);
        rod.y = clamp(Y, 130, furTop - RH / 2);
        if (Math.abs(rod.x - cloth.x) < 150 && rod.y + RH / 2 > furTop - 22) { rod.y = furTop - RH / 2; rub(); }
        else { lastRel = null; if (Math.abs(rod.x - TX) < 110 && rod.y + RH / 2 < trayY - 4) { push(sH, (trayY - rod.y - RH / 2) / PXCM); rod.y = trayY - sH.get() * PXCM - RH / 2; } }
        draw();
      } });
    const gCloth = PL.ui.handle(cv, { label: "布料（左右拖，在棒下摩擦）",
      onDrag: x => { cloth.x = clamp(x * VW / cv.W + 80, 140, 330); rub(); draw(); } });

    const clock = PL.motion.clock(dt => {
      if (auto && dt > 0) {
        auto.t += dt; rod.y = furTop - RH / 2;
        rod.x = cloth.x + 55 * Math.sin(auto.t / 0.32 * Math.PI);
        const done = Math.floor(auto.t / 0.32);
        if (done > auto.done) { auto.done = done; stroke(); }
        if (auto.done >= 5) auto = null;
      }
      draw(dt);
    }, { ambient: true });

    function draw(dt) {
      const m = model(), running = !!(clock && clock.running);
      parts = parts.filter(p => (p.t += dt || 0) < 0.6);
      let nLift = 0;
      const st = bits.map(b => { const s = liftOf(b, m.Qr); if (s.up) nLift++; b.f.update(s.up ? 1 : 0, dt, running); return s; });
      cv.clear(); D.bg(cv);
      scaled(cv, (ctx, VH, k) => {
        AP.labRoom(ctx, VW, VH, benchY, {});
        // 摩擦起電序列（牆上的掛圖）
        AP.infoCard(ctx, 14, 12, 500, 74);
        D.text(ctx, "摩擦起電序列", 26, 32, { size: 12.5, weight: "800", color: PL.col("text") });
        D.text(ctx, "← 易失去電子（帶正電）　　易得到電子（帶負電）→", 500, 32, { size: 10.5, align: "right", color: PL.col("text-dim") });
        const ri = RODS[rodM][1], ci = CLOTHS[clothM][1];
        SER.forEach((nm, i) => {
          const x = 26 + i * 68, on = i === ri || i === ci;
          D.rect(ctx, x, 42, 60, 24, { fill: on ? (i === Math.min(ri, ci) ? "rgba(214,58,48,0.22)" : "rgba(44,102,206,0.22)") : PL.col("panel-2"), stroke: on ? PL.col("text") : PL.col("border"), width: on ? 1.8 : 1, r: 5 });
          D.text(ctx, nm, x + 30, 59, { size: 12, align: "center", weight: on ? "800" : "500", color: PL.col("text") });
        });
        const xa = 26 + Math.min(ri, ci) * 68 + 30, xb = 26 + Math.max(ri, ci) * 68 + 30;
        D.arrow(ctx, xa, 79, xb, 79, { color: NEG, width: 1.8, head: 7 });
        D.text(ctx, "e⁻", (xa + xb) / 2, 76, { size: 11, align: "center", weight: "800", color: NEG });
        // 計數卡：電荷守恆
        AP.infoCard(ctx, 528, 12, VW - 542, 96);
        const fq = q => (q > 0 ? "+" : q < 0 ? "−" : "") + Math.abs(q * 1e9).toFixed(2) + " nC";
        D.text(ctx, RODS[rodM][0] + "：" + fq(m.Qr), 540, 34, { size: 12.5, weight: "800", color: m.Qr < 0 ? NEG : m.Qr > 0 ? POS : PL.col("text") });
        D.text(ctx, CLOTHS[clothM][0] + "：" + fq(m.Qc), 540, 54, { size: 12.5, weight: "800", color: m.Qc < 0 ? NEG : m.Qc > 0 ? POS : PL.col("text") });
        D.text(ctx, "總和：0（電荷守恆）　Q = ne", 540, 74, { size: 11.5, weight: "700", color: PL.col("ok") });
        D.text(ctx, "每個 ● 代表 10⁹ 個電子，e = 1.6×10⁻¹⁹ C", 540, 96, { size: 10, color: PL.col("text-dim") });
        tag(ctx, "① 把棒拖到布上來回摩擦　② 再拿到紙屑上方，慢慢降低", VW / 2, 140, { align: "center", size: 12, color: PL.col("text-dim") });
        // 紙屑盤
        ctx.fillStyle = "rgba(200,230,245,0.35)"; ctx.fillRect(TX - 110, trayY - 4, 220, 8);
        ctx.strokeStyle = "rgba(120,170,200,0.8)"; ctx.lineWidth = 1.2; ctx.strokeRect(TX - 110, trayY - 4, 220, 8);
        D.text(ctx, "碎紙屑", TX + 118, trayY + 2, { size: 10.5, color: PL.col("text-dim") });
        // 布料
        const cw = 230, cxL = cloth.x - cw / 2;
        const clothCol = { fur: ["rgb(150,104,62)", "rgb(196,148,96)"], silk: ["rgb(206,190,230)", "rgb(244,236,252)"], cotton: ["rgb(222,220,210)", "rgb(248,246,238)"] }[clothM];
        const cg = ctx.createLinearGradient(0, furTop, 0, benchY);
        cg.addColorStop(0, clothCol[1]); cg.addColorStop(1, clothCol[0]);
        AP.rrPath(ctx, cxL, furTop, cw, benchY - furTop + 2, 5); ctx.fillStyle = cg; ctx.fill();
        if (clothM === "fur") { ctx.strokeStyle = "rgba(90,56,26,0.7)"; ctx.lineWidth = 1; ctx.beginPath(); for (let x = cxL + 4; x < cxL + cw - 2; x += 5) { ctx.moveTo(x, furTop + 4); ctx.lineTo(x + 2, furTop - 3 - ((x * 7) % 4)); } ctx.stroke(); }
        else { ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cxL + 10, furTop + 4); ctx.lineTo(cxL + cw - 10, furTop + 4); ctx.stroke(); }
        D.text(ctx, CLOTHS[clothM][0], cloth.x, benchY + 22, { size: 12, align: "center", weight: "700", color: PL.col("text") });
        // 布料上的電荷（與棒等量異號）
        const mk = (x, y, sgn) => { ctx.fillStyle = sgn < 0 ? NEG : POS; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill(); };
        for (let i = 0; i < m.n; i++) mk(cxL + 8 + (i % 40) * (cw - 16) / 39, furTop + 4 + Math.floor(i / 40) * 5, -m.sg);
        // 紙屑（被吸起時飛到棒的下緣）
        const rb = rod.y + RH / 2;
        bits.forEach((b, i) => {
          const f = clamp(b.f.value, 0, 1.15), tx2 = clamp(b.x, rod.x - RL / 2 + 6, rod.x + RL / 2 - 6), ty2 = rb + 3 + (b.slot % 3);
          const x = b.x + (tx2 - b.x) * f, y = trayY - 3 + (ty2 - trayY + 3) * f;
          ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot * (1 - f) + (f > 0.5 ? Math.sin((b.slot + 1) * 1.3) * 0.4 : 0));
          ctx.fillStyle = light() ? "rgb(250,250,246)" : "rgb(236,236,230)"; ctx.fillRect(-b.w / 2, -2.5, b.w, 5);
          ctx.strokeStyle = "rgba(90,90,90,0.6)"; ctx.lineWidth = 0.8; ctx.strokeRect(-b.w / 2, -2.5, b.w, 5);
          ctx.restore();
          if (st[i].near && f < 0.5) { raw(ctx, m.Qr < 0 ? "+" : "−", x, y - 4, m.Qr < 0 ? POS : NEG, 8, "center", "800"); }
        });
        // 棒＋手
        AP.hand(ctx, rod.x - RL / 2 + 4, rod.y, 1, 1, { pull: true });
        const rx = rod.x - RL / 2, ry = rod.y - RH / 2;
        if (rodM === "plastic") {
          ctx.fillStyle = "rgba(110,180,250,0.6)"; ctx.fillRect(rx, ry, RL, RH);
          ctx.strokeStyle = "rgba(30,80,150,0.8)"; ctx.lineWidth = 1; ctx.strokeRect(rx, ry, RL, RH);
          ctx.beginPath(); for (let x = rx + 6; x < rx + RL - 2; x += 8) { ctx.moveTo(x, ry); ctx.lineTo(x, ry + ((x - rx - 6) % 40 === 0 ? 7 : 4)); } ctx.stroke();
        } else {
          const g = ctx.createLinearGradient(0, ry, 0, ry + RH);
          if (rodM === "glass") { g.addColorStop(0, "rgba(240,250,255,0.85)"); g.addColorStop(0.5, "rgba(190,220,236,0.55)"); g.addColorStop(1, "rgba(150,190,210,0.8)"); }
          else { g.addColorStop(0, "rgb(96,96,104)"); g.addColorStop(0.5, "rgb(48,48,54)"); g.addColorStop(1, "rgb(26,26,30)"); }
          AP.rrPath(ctx, rx, ry, RL, RH, RH / 2); ctx.fillStyle = g; ctx.fill();
          ctx.strokeStyle = rodM === "glass" ? "rgba(90,140,170,0.9)" : "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();
        }
        for (let i = 0; i < m.n; i++) {
          const x = rx + 12 + (i % 40) * (RL - 24) / 39, y = ry + (m.n > 40 ? (i < 40 ? 4.5 : 9.5) : 7);
          ctx.fillStyle = m.sg < 0 ? "rgb(18,56,170)" : "rgb(200,30,24)"; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
        }
        D.text(ctx, RODS[rodM][0] + "（" + (m.sg < 0 ? "得到電子 → 帶負電" : "失去電子 → 帶正電") + "）", rod.x, ry - 10, { size: 11.5, align: "center", weight: "700", color: m.n ? (m.sg < 0 ? NEG : POS) : PL.col("text") });
        // 正在搬家的電子
        parts.forEach(p => {
          const u = clamp(p.t / 0.6, 0, 1);
          if (p.t < 0) return;
          const x = p.a.x + (p.b.x - p.a.x) * u, y = p.a.y + (p.b.y - p.a.y) * u - Math.sin(u * Math.PI) * 26;
          ctx.fillStyle = NEG; ctx.shadowColor = "rgba(80,150,255,0.9)"; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
          raw(ctx, "−", x, y + 3, "#fff", 8, "center", "800");
        });
        // 距離標示
        if (Math.abs(rod.x - TX) < 110 && rb < trayY - 4) {
          D.line(ctx, TX + 132, rb, TX + 132, trayY, PL.col("text-dim"), 1, [3, 3]);
          D.text(ctx, "h = " + ((trayY - rb) / PXCM).toFixed(1) + " cm", TX + 138, (rb + trayY) / 2 + 4, { size: 11, color: PL.col("text") });
        }
        gRod.place((rod.x + 60) * k, rod.y * k);
        gCloth.place((cloth.x - 80) * k, (furTop + 6) * k);
      });
      const nm = (m.sg < 0 ? CLOTHS[clothM][0] : RODS[rodM][0]);
      rQr.set(m.Qr * 1e9, 2); rQc.set(m.Qc * 1e9, 2); rSum.set(0, 2); rNe.set(m.n, 0); rLift.set(nLift, 0);
      dv.set(0, nm); dv.set(1, m.rate, 1); dv.set(2, m.n * DOT * E_C * 1e9, 2);
      if (!m.n) vd.set("還沒摩擦：兩者都不帶電（電子數 = 質子數）", "info");
      else vd.set("電荷守恆：" + RODS[rodM][0] + " " + (m.Qr * 1e9).toFixed(2) + " nC ＋ " + CLOTHS[clothM][0] + " +" + (m.Qc * 1e9).toFixed(2).replace("-", "−") + " nC ＝ 0" + (nLift ? "；吸起 " + nLift + " 片紙屑（感應極化）" : ""), "ok");
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* =====================================================================
     5. 螺線管的磁場
     軸上用有限長螺線管的封閉解：B(x) = ½μ₀nI[(x+L/2)/√((x+L/2)²+R²) − (x−L/2)/√((x−L/2)²+R²)]，
     管口恰好是中央的一半左右。磁力線與指南針則把螺線管拆成 30 個圓線圈，
     用橢圓積分精確計算離軸的磁場（管外的形狀才會像條形磁鐵）。
     ===================================================================== */
  PL.register("solenoid-field", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const MU = 4e-7 * Math.PI, S = 11, CX = 400, CY = 150, BENCH = 296, NLOOP = 30;
    let dirS = 1, recs = [], scan = null, fieldKey = "", flines = [];
    const comp = { x: 640, y: 78 };
    const sI = PL.ui.slider(L.controls, { label: "電流 I", min: 0, max: 3, step: 0.1, value: 2, unit: "A", digits: 1, onInput: () => { recs = []; draw(); } });
    const sN = PL.ui.slider(L.controls, { label: "匝數 N", min: 100, max: 600, step: 50, value: 300, unit: "匝", digits: 0, onInput: () => { recs = []; draw(); } });
    const sL = PL.ui.slider(L.controls, { label: "長度 L", min: 10, max: 40, step: 1, value: 30, unit: "cm", digits: 0, onInput: () => { recs = []; draw(); } });
    const sR = PL.ui.slider(L.controls, { label: "半徑 R", min: 1.5, max: 4, step: 0.5, value: 2, unit: "cm", digits: 1, onInput: () => { recs = []; draw(); } });
    PL.ui.chipGroup(L.controls, { value: "f", options: [{ value: "f", label: "電流：正向" }, { value: "r", label: "電流：反向" }], onChange: v => { dirS = v === "f" ? 1 : -1; recs = []; draw(); } });
    PL.ui.section(L.controls, "霍爾探棒");
    const sX = PL.ui.slider(L.controls, { label: "探棒位置 x", min: -30, max: 30, step: 0.5, value: 0, unit: "cm", digits: 1, onInput: () => { record(); draw(); } });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "自動掃描 B–x", () => { scan = { x: -30 }; recs = []; clock.start(); }, { primary: true });
    PL.ui.button(row, "清除描點", () => { recs = []; draw(); });
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "細長螺線管", apply: () => { push(sL, 40); push(sR, 1.5); push(sX, 0); } },
      { label: "短而粗", apply: () => { push(sL, 10); push(sR, 4); push(sX, 0); } },
      { label: "匝數加倍 300→600", apply: () => { push(sN, 300); push(sN, 600); } },
      { label: "探棒放管口", apply: () => push(sX, sL.get() / 2) }] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rB = PL.ui.readout(L.readouts, { label: "探棒處磁場 B", unit: "mT" });
    const rB0 = PL.ui.readout(L.readouts, { label: "μ₀nI（無限長理論值）", unit: "mT" });
    const rn = PL.ui.readout(L.readouts, { label: "每公尺匝數 n = N/L", unit: "匝/m" });
    const rRat = PL.ui.readout(L.readouts, { label: "B／中央 B", unit: "%" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "中央 B（x = 0）", unit: "mT" }, { label: "管口 B（x = L/2）", unit: "mT" }, { label: "管口 ÷ 中央", hint: "長螺線管約 ½" }]);

    const Bax = x => { const l = sL.get() / 2, R = sR.get(), n = sN.get() / (sL.get() / 100), f = u => u / Math.sqrt(u * u + R * R); return 0.5 * MU * n * sI.get() * (f(x + l) - f(x - l)) * 1000; };
    function record() {
      const x = sX.get();
      recs = recs.filter(r => Math.abs(r.x - x) > 0.4);
      recs.push({ x, b: Bax(x) });
      if (recs.length > 140) recs.shift();
    }
    // 完全橢圓積分 K(m)、E(m)：算術—幾何平均法
    function KE(m) {
      let a = 1, b = Math.sqrt(1 - m), c, s = 0.5 * m, p = 1;
      for (let i = 0; i < 14; i++) { c = (a - b) / 2; const an = (a + b) / 2; b = Math.sqrt(a * b); a = an; p *= 2; s += 0.5 * p * c * c; if (Math.abs(c) < 1e-10) break; }
      const K = Math.PI / (2 * a); return [K, K * (1 - s)];
    }
    // 圓線圈（半徑 a）在軸向距離 z、離軸 r 處的磁場（省略 μ₀I/2π）
    function loopB(a, z, r) {
      const a2 = a * a, r2 = r * r, z2 = z * z, al2 = Math.max(1e-9, a2 + r2 + z2 - 2 * a * r), be2 = a2 + r2 + z2 + 2 * a * r, be = Math.sqrt(be2), ke = KE(1 - al2 / be2);
      return [((a2 - r2 - z2) * ke[1] + al2 * ke[0]) / (al2 * be), r < 1e-6 ? 0 : z * ((a2 + r2 + z2) * ke[1] - al2 * ke[0]) / (al2 * be * r)];
    }
    function Bshape(x, r) {
      const l = sL.get(), R = sR.get();
      let bz = 0, br = 0;
      for (let i = 0; i < NLOOP; i++) { const b = loopB(R, x - (-l / 2 + (i + 0.5) * l / NLOOP), r); bz += b[0]; br += b[1]; }
      return [bz, br];
    }
    function traceLines() {
      const k = sL.get() + "|" + sR.get();
      if (k === fieldKey) return;
      fieldKey = k; flines = [];
      const R = sR.get(), l = sL.get() / 2;
      [0.15, 0.42, 0.68, 0.9].forEach(fr => {
        const run = sgn => {
          let x = 0, r = fr * R; const pts = [];
          for (let n = 0; n < 1400; n++) {
            const b = Bshape(x, r), m = Math.hypot(b[0], b[1]);
            if (m < 1e-12) break;
            const out = Math.max(0, Math.abs(x) - l) + Math.max(0, r - R), ds = 0.22 + 0.06 * out;
            x += sgn * b[0] / m * ds; r += sgn * b[1] / m * ds;
            if (r < 0) r = -r;
            pts.push([x, r]);
            if (Math.abs(x) > 40 || r > 14) return { pts, open: true };
            if (n > 20 && sgn > 0 && Math.abs(x) < ds && r < R && pts[pts.length - 2][0] < 0) return { pts, open: false };
          }
          return { pts, open: true };
        };
        const f = run(1);
        flines.push(f.open ? run(-1).pts.reverse().concat([[0, fr * R]], f.pts) : [[0, fr * R]].concat(f.pts));
      });
    }
    const gProbe = PL.ui.handle(cv, { slider: sX, label: "霍爾探棒（沿軸線左右拖）", toValue: x => (x * VW / cv.W - CX) / S });
    const gEnd = PL.ui.handle(cv, { slider: sL, label: "線圈右端（左右拖改長度 L）", toValue: x => 2 * (x * VW / cv.W - CX) / S });
    const gComp = PL.ui.handle(cv, { label: "指南針（拖到螺線管旁邊）",
      onDrag: (x, y) => { const k = cv.W / VW; comp.x = clamp(x / k, 30, VW - 30); comp.y = clamp(y / k, 24, BENCH - 26); draw(); } });
    const needle = PL.motion.follower(0, { omega: 6, zeta: 0.25 });
    let flowS = 0;
    const clock = PL.motion.clock(dt => {
      flowS += dt * 26 * sI.get();
      if (scan && dt > 0) { scan.x += dt * 12; push(sX, Math.min(30, scan.x)); if (scan.x >= 30) scan = null; }
      draw(dt);
    }, { ambient: true });

    function draw(dt) {
      traceLines();
      const I = sI.get(), N = sN.get(), Lc = sL.get(), R = sR.get(), n = N / (Lc / 100), B0 = MU * n * I * 1000, x = sX.get(), Bp = Bax(x), Bc = Bax(0), Be = Bax(Lc / 2);
      const running = !!(clock && clock.running);
      cv.clear(); D.bg(cv);
      scaled(cv, (ctx, VH, k) => {
        AP.labStrip(ctx, VW, 330, BENCH, {});
        const Lp = Lc * S, Rp = R * S, xl = CX - Lp / 2, xr = CX + Lp / 2;
        const X = xc => CX + xc * S;
        // 支架
        [xl + Lp * 0.18, xr - Lp * 0.18].forEach(sx => { AP.steel(ctx, sx - 3, CY + Rp, 6, BENCH - CY - Rp, 10); AP.steel(ctx, sx - 18, BENCH - 6, 36, 6, -8); });
        const nt = Math.max(6, Math.min(Math.round(N / 10), Math.floor(Lp / 4.5))), rx = Math.max(2.5, Rp * 0.22);
        const turns = []; for (let i = 0; i < nt; i++) turns.push(xl + (i + 0.5) * Lp / nt);
        // 線圈後半圈
        ctx.strokeStyle = "rgb(122,72,34)"; ctx.lineWidth = 2.2;
        turns.forEach(t => { ctx.beginPath(); ctx.ellipse(t, CY, rx, Rp, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); });
        // 透明管身
        ctx.fillStyle = "rgba(200,226,240,0.16)"; ctx.fillRect(xl, CY - Rp, Lp, 2 * Rp);
        ctx.strokeStyle = "rgba(150,190,214,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(xl, CY - Rp, Lp, 2 * Rp);
        // 霍爾探棒：沿軸線伸入，尾端握柄接到特斯拉計
        const tip = X(x), rodEnd = Math.min(VW - 6, tip + 170);
        ctx.fillStyle = "rgb(170,178,190)"; ctx.fillRect(tip, CY - 2, rodEnd - tip, 4);
        ctx.fillStyle = "rgb(40,44,52)"; ctx.fillRect(tip - 3, CY - 4, 9, 8);
        if (rodEnd - tip > 120) { ctx.fillStyle = "rgb(36,40,48)"; AP.rrPath(ctx, tip + 120, CY - 6, rodEnd - tip - 120, 12, 4); ctx.fill(); }
        // 線圈前半圈＋電流
        ctx.strokeStyle = "rgb(204,128,60)"; ctx.lineWidth = 2.4;
        turns.forEach(t => { ctx.beginPath(); ctx.ellipse(t, CY, rx, Rp, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); });
        if (I > 0) turns.forEach(t => {
          const pts = []; for (let j = 0; j <= 8; j++) { const a = -Math.PI / 2 + j / 8 * Math.PI; pts.push([t + rx * Math.cos(a), CY + Rp * Math.sin(a)]); }
          // 正向：前半圈電流向下 → 右手定則磁場向右（右端為 N 極）
          PL.motion.flow(ctx, dirS > 0 ? pts : pts.reverse(), flowS, { gap: 13, r: 1.7, color: "#ffe066", glow: 3 });
        });
        // 磁力線（上下對稱）
        const lc = light() ? "rgba(40,92,196,0.78)" : "rgba(140,190,255,0.78)";
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, BENCH); ctx.clip();
        ctx.strokeStyle = lc; ctx.lineWidth = 1.3;
        flines.forEach(pl => [1, -1].forEach(sg => {
          ctx.beginPath(); pl.forEach((p, i) => { const px = X(p[0]), py = CY - sg * p[1] * S; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
          [0.12, 0.5, 0.86].forEach(u => {
            const i = Math.floor(u * (pl.length - 2)), a = pl[i], b = pl[i + 1];
            if (!a || !b) return;
            const ax = X(a[0]), ay = CY - sg * a[1] * S, bx = X(b[0]), by = CY - sg * b[1] * S;
            if (ay > BENCH) return;
            arrowHead(ctx, ax, ay, Math.atan2(by - ay, bx - ax) + (dirS < 0 ? Math.PI : 0), 4.5, lc);
          });
        }));
        ctx.restore();
        steel(ctx, xl, Rp); steel(ctx, xr, Rp);
        const nR = dirS > 0;
        D.text(ctx, nR ? "S" : "N", xl - 16, CY + 6, { size: 17, align: "center", weight: "800", color: nR ? NEG : POS });
        D.text(ctx, nR ? "N" : "S", xr + 16, CY + 6, { size: 17, align: "center", weight: "800", color: nR ? POS : NEG });
        // 電源、特斯拉計與導線
        const ps = AP.powerSupply(ctx, 18, BENCH - 66, 150, 62, I.toFixed(2) + " A", { label: "直流電源", knob: I / 3 });
        AP.cable(ctx, [ps.red, { x: xl + rx, y: CY + Rp }], "rgb(200,46,40)", 2.2, 16);
        AP.cable(ctx, [ps.black, { x: xr - rx, y: CY + Rp }], "rgb(36,36,40)", 2.2, 30);
        const mx = VW - 168;
        ctx.fillStyle = "rgb(58,64,76)"; AP.rrPath(ctx, mx, BENCH - 62, 150, 58, 7); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.stroke();
        AP.lcd(ctx, mx + 10, BENCH - 54, 130, 28, Bp.toFixed(2) + " mT", { color: "rgb(130,230,255)" });
        raw(ctx, "特斯拉計（霍爾探棒）", mx + 75, BENCH - 12, "rgba(230,236,244,0.9)", 10, "center", "600");
        AP.cable(ctx, [{ x: rodEnd, y: CY }, { x: mx + 140, y: BENCH - 62 }], "rgb(36,36,40)", 2, 20);
        // 指南針
        let cx = comp.x, cy = comp.y;
        const xc = (cx - CX) / S, rc = Math.abs(cy - CY) / S;
        if (Math.abs(xc) < Lc / 2 + 1.2 && rc < R + 1.6) cy = CY + (cy < CY ? -1 : 1) * (R + 1.6) * S;
        const bs = Bshape((cx - CX) / S, Math.abs(cy - CY) / S), bx = dirS * bs[0], by = dirS * bs[1] * Math.sign(cy - CY || 1);
        let tgt = I > 0 ? Math.atan2(by, bx) : needle.target;
        while (tgt - needle.value > Math.PI) tgt -= TAU;
        while (tgt - needle.value < -Math.PI) tgt += TAU;
        AP.compass(ctx, cx, cy, 17, needle.update(tgt, dt, running));
        D.text(ctx, "指南針 N 極指向磁場方向", cx, cy - 23, { size: 10, align: "center", color: PL.col("text-dim") });
        // 畫布上的關鍵式
        AP.infoCard(ctx, 14, 10, 262, 50);
        D.text(ctx, "B = μ₀nI，n = N/L", 24, 30, { size: 14, weight: "800", color: PL.col("text") });
        D.text(ctx, "右手四指沿電流，拇指指向 N 極", 24, 50, { size: 11, color: PL.col("text-dim") });
        // B–x 圖（橫軸與上方實景對齊）
        const gy0 = 340, gh = VH - gy0 - 10;
        AP.infoCard(ctx, 14, gy0, VW - 28, gh);
        const ybase = gy0 + gh - 26, ytop = gy0 + 30, ladder = [0.5, 1, 2, 3, 5, 10, 15, 25];
        const ymax = ladder.find(v => v >= B0 * 1.12) || 30, Y = b => ybase - b / ymax * (ybase - ytop);
        ctx.fillStyle = light() ? "rgba(204,128,60,0.12)" : "rgba(204,128,60,0.16)"; ctx.fillRect(xl, ytop - 6, Lp, ybase - ytop + 6);
        D.line(ctx, X(-30), ybase, X(30), ybase, PL.col("text-dim"), 1.2);
        D.line(ctx, X(-30), ybase, X(-30), ytop - 8, PL.col("text-dim"), 1.2);
        for (let t = -30; t <= 30; t += 10) { D.line(ctx, X(t), ybase, X(t), ybase + 4, PL.col("text-dim"), 1); D.text(ctx, String(t), X(t), ybase + 15, { size: 9.5, align: "center", color: PL.col("text-dim") }); }
        D.text(ctx, "x (cm)", X(30) + 8, ybase + 4, { size: 10, color: PL.col("text-dim") });
        D.text(ctx, "B (mT)　0～" + ymax, X(-30) + 6, gy0 + 18, { size: 10.5, weight: "700", color: PL.col("text") });
        if (B0 > 0) {
          D.line(ctx, X(-30), Y(B0), X(30), Y(B0), PL.col("accent"), 1, [5, 4]);
          D.text(ctx, "μ₀nI", X(30) + 4, Y(B0) + 4, { size: 10, color: PL.col("accent"), weight: "700" });
          D.line(ctx, X(-30), Y(B0 / 2), X(30), Y(B0 / 2), PL.col("warn"), 1, [2, 4]);
          D.text(ctx, "½μ₀nI", X(30) + 4, Y(B0 / 2) + 4, { size: 10, color: PL.col("warn"), weight: "700" });
        }
        D.text(ctx, "管口", xl, ytop - 10, { size: 10, align: "center", color: PL.col("text-dim") });
        D.text(ctx, "管口", xr, ytop - 10, { size: 10, align: "center", color: PL.col("text-dim") });
        ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 1.2; ctx.beginPath();
        for (let t = -30; t <= 30.01; t += 0.5) { const yy = Y(Bax(t)); t > -30 ? ctx.lineTo(X(t), yy) : ctx.moveTo(X(t), yy); }
        ctx.stroke();
        recs.forEach(r => D.disc(ctx, X(r.x), Y(r.b), 3, { fill: PL.col("accent-2") }));
        D.line(ctx, X(x), ytop - 6, X(x), ybase, PL.col("accent-3"), 1.2, [3, 3]);
        D.disc(ctx, X(x), Y(Bp), 5, { fill: PL.col("accent-3"), stroke: PL.col("panel-solid"), width: 1.5 });
        gProbe.place(tip * k, CY * k);
        gEnd.place(xr * k, (CY - Rp - 16) * k);
        gComp.place(cx * k, cy * k);
      });
      rB.set(Bp, 3); rB0.set(B0, 3); rn.set(n, 0); rRat.set(Bc ? Bp / Bc * 100 : 0, 1);
      dv.set(0, Bc, 3); dv.set(1, Be, 3); dv.set(2, Bc ? (Be / Bc).toFixed(3) : "—");
      const ax = Math.abs(x), l = Lc / 2;
      const pole = "，" + (dirS > 0 ? "右" : "左") + "端是 N 極";
      if (I === 0) vd.set("沒有電流就沒有磁場", "info");
      else if (ax < l - 2 * R) vd.set("管內中段：B ≈ μ₀nI，均勻（磁力線平行等距）" + pole, "ok");
      else if (l < 4 * R && ax < l / 2) vd.set("短而粗的螺線管：連中央都不到 μ₀nI，管內磁場不均勻" + pole, "warn");
      else if (Math.abs(ax - l) <= Math.min(1.5 * R, l / 2)) vd.set("管口附近：B 約為中央的一半（" + (Bp / Bc * 100).toFixed(0) + "%）" + pole, "warn");
      else if (ax > l) vd.set("管外：磁場迅速變弱，形狀像條形磁鐵" + pole, "info");
      else vd.set("由中段往管口，B 逐漸下降" + pole, "info");
    }
    function steel(ctx, x, Rp) { AP.steel(ctx, x - 3, CY - Rp - 6, 6, 2 * Rp + 12, 10); }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});
})();
