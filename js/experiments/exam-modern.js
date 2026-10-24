/* 學測／分科常考 · 近代物理：原子結構、波耳氫原子、物質波、X 射線管、質能守恆、核分裂連鎖反應 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  // 器材庫延遲載入：建置時才取 PL.apparatus（預先抓檔時它可能還不存在）
  const ap = () => PL.apparatus;
  const FONT = "'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif";
  const P_RGB = [224, 72, 58], N_RGB = [150, 158, 172], E_RGB = [72, 146, 255];
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉";
  const sup = n => String(n).split("").map(c => SUP[c]).join(""), sub = n => String(n).split("").map(c => SUB[c]).join("");
  const LT = "#dbe7f7", LD = "#9fb4d6";   // 固定暗色視窗上的文字

  // 相對拖曳：拖多少就加減多少（horiz 為左右拖）；背後仍是同一根滑桿
  const relGrip = (s, k, label, horiz) => {
    let st = null;
    return { label, slider: s, onGrab: () => { st = null; }, onRelease: () => { st = null; },
      toValue: (x, y) => { if (!st) st = { x, y, v: s.get() }; return st.v + (horiz ? x - st.x : st.y - y) * k; } };
  };
  // 帶光影的小球（質子、中子、電子共用）
  function ball(ctx, x, y, r, c, a) {
    const m = k => c.map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))).join(",");
    const al = a == null ? 1 : a, g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(${m(0.6)},${al})`); g.addColorStop(0.55, `rgba(${m(0)},${al})`); g.addColorStop(1, `rgba(${m(-0.5)},${al})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  /*
   * 把 A 顆核子堆成一團：半徑依 ∛((i+½)/A) 由內往外（體積均勻）、方向用黃金角序列，
   * 旋轉後依深度排序（遠的先畫），看起來就是課本那種「紅灰小球堆」。
   */
  function cluster(A, Z, br, yaw, pitch) {
    const R = A > 1 ? Math.max(0, 1.16 * br * Math.cbrt(A) - br) : 0, ga = Math.PI * (3 - Math.sqrt(5)), out = [];
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (let i = 0; i < A; i++) {
      const rr = R * Math.cbrt((i + 0.5) / A), v = 1 - 2 * ((i * 0.618034 + 0.31) % 1), h = Math.sqrt(Math.max(0, 1 - v * v)), th = i * ga;
      const x = rr * h * Math.cos(th), y = rr * v, z = rr * h * Math.sin(th), x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      out.push({ x: x1, y: y * cp - z1 * sp, z: y * sp + z1 * cp, p: Math.floor((i + 1) * Z / A) > Math.floor(i * Z / A) });
    }
    return out.sort((a, b) => a.z - b.z);
  }
  // 固定暗色的觀察窗（顯微放大、螢光幕、分光儀）：兩種主題都一樣，並登記亮度讓文字選對墨色
  function darkWin(ctx, x, y, w, h, title) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgb(22,30,46)"); g.addColorStop(1, "rgb(8,11,19)");
    ctx.save(); ap().rrPath(ctx, x, y, w, h, 9); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = PL.theme.isLight() ? "rgba(30,44,66,0.6)" : "rgba(150,180,220,0.3)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    PL.theme.note(ctx, "rgb(14,19,31)", x, y, w, h);
    if (title) D.text(ctx, title, x + 10, y + 17, { color: LT, size: 11, weight: "700" });
  }
  // 玻璃管（真空管、X 射線管、放電管）
  function glass(ctx, x, y, w, h, r) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(226,244,252,0.32)"); g.addColorStop(0.15, "rgba(255,255,255,0.10)"); g.addColorStop(0.85, "rgba(200,224,238,0.08)"); g.addColorStop(1, "rgba(226,244,252,0.30)");
    ap().rrPath(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = PL.theme.isLight() ? "rgba(70,110,140,0.65)" : "rgba(206,232,244,0.55)"; ctx.lineWidth = 2; ctx.stroke();
  }
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random());
  const pois = m => { if (m > 25) return Math.max(0, Math.round(m + Math.sqrt(m) * gauss())); const L = Math.exp(-m); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
  const lamColor = nm => ap().nmColor(nm) || (nm < 380 ? "#c9a8ff" : "#ff8a70");
  const colorWord = nm => nm < 380 ? "紫外線（看不見）" : nm < 450 ? "紫光" : nm < 480 ? "藍光" : nm < 500 ? "藍綠光" : nm < 570 ? "綠光" : nm < 590 ? "黃光" : nm < 620 ? "橙光" : nm <= 750 ? "紅光" : "紅外線（看不見）";

  /* ================================================================
     原子及其結構
     放大窗裡是質子（紅）與中子（灰）堆成的原子核，電子在外層示意路徑上繞；
     右邊是 ᴬ_Z X 符號卡與三個粒子盒——上下拖粒子盒就是把粒子放進去或拿出來。
     ================================================================ */
  const EL = "H氫 He氦 Li鋰 Be鈹 B硼 C碳 N氮 O氧 F氟 Ne氖 Na鈉 Mg鎂 Al鋁 Si矽 P磷 S硫 Cl氯 Ar氬 K鉀 Ca鈣".split(" ").map(s => ({ s: s.replace(/[^A-Za-z]/g, ""), zh: s.replace(/[A-Za-z]/g, "") }));
  // 各元素的穩定同位素質量數（第一個是自然界最多的）
  const STABLE = "1 2|4 3|7 6|9|11 10|12 13|14 15|16 18 17|19|20 22 21|23|24 26 25|27|28 29 30|31|32 34 33 36|35 37|40 36 38|39 41|40 44 42 48 43 46".split("|").map(s => s.split(" ").map(Number));
  PL.register("atom-structure", { build(root) {
    const AP = ap();
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6, 900);
    let view = "model", yaw = 0.5, pick = null, hits = [], clock = null;
    PL.ui.section(L.controls, "放進原子的粒子");
    const mk = (label, min, max, value) => PL.ui.slider(L.controls, { label, min, max, step: 1, value, digits: 0, onInput: () => { pick = null; draw(); } });
    const sZ = mk("質子數 Z", 1, 20, 6), sN = mk("中子數 N", 0, 28, 6), sE = mk("電子數", 0, 20, 6);
    PL.ui.section(L.controls, "看法");
    PL.ui.chipGroup(L.controls, { value: "model", options: [{ value: "model", label: "原子模型" }, { value: "nucleus", label: "放大原子核" }, { value: "scale", label: "真實比例" }], onChange: v => { view = v; pick = null; draw(); } });
    const setAll = (z, n, e) => { sZ.set(z); sN.set(n); sE.set(e); pick = null; draw(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "碳-12", apply: () => setAll(6, 6, 6) },
      { label: "碳-14（同位素）", hint: "質子數相同、中子多 2 個", apply: () => setAll(6, 8, 6) },
      { label: "氘 ²₁H", apply: () => setAll(1, 1, 1) },
      { label: "鈉離子 Na⁺", apply: () => setAll(11, 12, 10) },
      { label: "氯離子 Cl⁻", apply: () => setAll(17, 18, 18) },
      { label: "α 粒子 ⁴₂He²⁺", hint: "氦原子核：沒有電子", apply: () => setAll(2, 2, 0) }] });
    PL.ui.note(L.controls, "點一下畫面中的粒子，看它帶什麼電、多重。右下角三個粒子盒可以上下拖（往上拖＝放進去），展示窗下方的轉台左右拖可以轉動模型。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rSym = PL.ui.readout(L.readouts, { label: "核種符號" });
    const rA = PL.ui.readout(L.readouts, { label: "質量數 A = Z + N" });
    const rQ = PL.ui.readout(L.readouts, { label: "淨電荷", unit: "e" });
    const rM = PL.ui.readout(L.readouts, { label: "粒子質量總和", unit: "u" });
    const rF = PL.ui.readout(L.readouts, { label: "原子核占質量", unit: "%" });
    const rR = PL.ui.readout(L.readouts, { label: "核半徑 ≈ 1.2∛A", unit: "fm" });
    const cz = PL.ui.causality(L.canvasWrap.parentNode, { title: "改哪一種粒子，改變的是什麼", rows: [
      { name: "質子數 Z", tone: "a", note: "決定是哪一種元素：Z 一變，元素符號就換了。" },
      { name: "中子數 N", tone: "b", note: "元素不變，只改質量數 A——同位素（化學性質幾乎相同）。" },
      { name: "電子數", tone: "c", note: "元素與 A 都不變，只改帶電：電子比質子少是陽離子，多是陰離子。" }] });
    const gP = PL.ui.handle(cv, relGrip(sZ, 1 / 14, "質子盒（上下拖增減質子）"));
    const gN = PL.ui.handle(cv, relGrip(sN, 1 / 14, "中子盒（上下拖增減中子）"));
    const gE = PL.ui.handle(cv, relGrip(sE, 1 / 14, "電子盒（上下拖增減電子）"));
    let y0 = null;
    const gRot = PL.ui.handle(cv, { label: "轉台（左右拖旋轉模型）", onGrab: () => { y0 = null; },
      onDrag: x => { if (!y0) y0 = { x, v: yaw }; yaw = y0.v + (x - y0.x) * 0.012; draw(); } });
    // 點粒子看電性：找離點擊處最近的粒子（後畫的在上層，距離相同時取後者）
    cv.canvas.addEventListener("click", e => {
      const r = cv.canvas.getBoundingClientRect(), x = (e.clientX - r.left) * cv.W / r.width, y = (e.clientY - r.top) * cv.H / r.height;
      let best = null, bd = 10;
      hits.forEach(h => { const d = Math.hypot(h.x - x, h.y - y) - h.r; if (d <= bd) { bd = d; best = h; } });
      if (best || pick) { pick = best ? { k: best.k, x: best.x, y: best.y } : null; draw(); }
    });
    const INFO = { p: ["質子 p⁺", "電荷 +e（+1.6×10⁻¹⁹ C）", "質量 1.007 u ≈ 1836 mₑ", P_RGB],
      n: ["中子 n", "不帶電（電荷 0）", "質量 1.009 u ≈ 1839 mₑ", N_RGB],
      e: ["電子 e⁻", "電荷 −e（−1.6×10⁻¹⁹ C）", "質量 0.00055 u（質子的 1/1836）", E_RGB] };

    function modelView(ctx, wx, wy, ww, wh, t, k, z, A, ne) {
      const nuc = view === "nucleus", cx = wx + ww / 2, cy = wy + wh / 2 + 6;
      const br = nuc ? Math.min(22, wh * 0.34 / (1.16 * Math.cbrt(A))) : Math.min(10, wh * 0.034), spin = yaw + t * 0.3;
      const Rn = 1.16 * br * Math.cbrt(A), es = [];
      if (!nuc && ne > 0) {
        // 電子依 2、8、8、… 分層（國中化學的殼層），每層畫成傾斜的橢圓——只是示意，不是真的軌道
        const maxR = Math.min(ww, wh) * 0.46, cap = [2, 8, 8, 99], ns = ne <= 2 ? 1 : ne <= 10 ? 2 : ne <= 18 ? 3 : 4;
        let left = ne;
        for (let s = 0; s < 4 && left > 0; s++) {
          const c = Math.min(cap[s], left); left -= c;
          const R = Rn + 18 + (maxR - Rn - 18) * (s + 1) / Math.max(2, ns), al = 0.5 + s * 1.05 + spin * 0.4, ca = Math.cos(al), sa = Math.sin(al), w = 1.3 / (1 + s * 0.5);
          ctx.save(); ctx.strokeStyle = "rgba(120,170,255,0.32)"; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
          ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.36, al, 0, TAU); ctx.stroke(); ctx.restore();
          for (let j = 0; j < c; j++) {
            const th = t * w + j * TAU / c + s, ex = R * Math.cos(th), ey = R * 0.36 * Math.sin(th);
            es.push({ x: cx + ex * ca - ey * sa, y: cy + ex * sa + ey * ca, f: Math.sin(th) > 0 });
          }
        }
      }
      const dot = e => { ball(ctx, e.x, e.y, e.f ? 4.8 : 3.8, E_RGB, e.f ? 1 : 0.6); hits.push({ x: e.x, y: e.y, r: 5, k: "e" }); };
      es.filter(e => !e.f).forEach(dot);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rn * 1.8 + 6);
      glow.addColorStop(0, "rgba(255,120,90,0.22)"); glow.addColorStop(1, "rgba(255,120,90,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, Rn * 1.8 + 6, 0, TAU); ctx.fill();
      cluster(A, z, br, spin, 0.4).forEach(b => {
        const x = cx + b.x, y = cy + b.y;
        ball(ctx, x, y, br, b.p ? P_RGB : N_RGB);
        if (nuc && br > 9 && b.z > -br) D.text(ctx, b.p ? "+" : "0", x, y + br * 0.32, { color: "rgba(255,255,255,0.9)", size: br * 0.9, align: "center", weight: "700" });
        hits.push({ x, y, r: br, k: b.p ? "p" : "n" });
      });
      es.filter(e => e.f).forEach(dot);
      // 圖例與判讀文字
      const lx = wx + ww - 10, fs = 10.5 * k;
      [["質子", P_RGB], ["中子", N_RGB], ["電子", E_RGB]].forEach((p, i) => {
        if (nuc && i === 2) return;
        ball(ctx, lx - 44 * k, wy + 16 + i * 17, 5, p[1]); D.text(ctx, p[0], lx, wy + 20 + i * 17, { color: LT, size: fs, align: "right" });
      });
      D.text(ctx, nuc ? "A = Z + N = " + z + " + " + (A - z) + " = " + A + "　（核子：質子與中子）" : "虛線只是示意：電子沒有固定軌道，實際是一團「電子雲」",
        wx + 12, wy + wh - 34, { color: LD, size: fs });
    }
    function scaleView(ctx, wx, wy, ww, wh, t, k) {
      const cx = wx + ww / 2, cy = wy + wh / 2 - 6, R = Math.min(ww, wh) * 0.36;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, "rgba(90,150,255,0.30)"); g.addColorStop(0.7, "rgba(90,150,255,0.12)"); g.addColorStop(1, "rgba(90,150,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      // 電子雲：每 1/8 秒重抽一次位置——畫的是「出現機率」，不是軌道
      let s = (Math.floor(t * 8) * 7919) % 2147483646 + 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 80; i++) { const rr = R * Math.min(1, Math.sqrt(-Math.log(1 - rnd() * 0.97)) * 0.5), a = rnd() * TAU; D.disc(ctx, cx + rr * Math.cos(a), cy + rr * Math.sin(a), 1.6, { fill: "rgba(140,190,255,0.75)" }); }
      D.ring(ctx, cx, cy, R, "rgba(150,190,255,0.4)", 1, [4, 4]);
      D.disc(ctx, cx, cy, 0.8, { fill: "#ff6a5a" }); D.ring(ctx, cx, cy, 8, "#ffd27a", 1.4);
      D.line(ctx, cx + 6, cy - 6, cx + 34, cy - 34, "#ffd27a", 1.2);
      D.text(ctx, "原子核在這裡（照比例不到 1 像素）", cx + 37, cy - 36, { color: "#ffd27a", size: 11 * k, weight: "700" });
      D.text(ctx, "原子直徑 ~10⁻¹⁰ m", cx, cy - R - 8, { color: LD, size: 10.5 * k, align: "center" });
      ["原子核 ~10⁻¹⁵ m：半徑只有原子的十萬分之一", "原子若放大成直徑 100 m 的體育場，核只有約 1 mm（一粒芝麻）", "但原子 99.9% 以上的質量都在核裡"].forEach((tx, i) =>
        D.text(ctx, tx, wx + 12, wy + wh - 62 + i * 16, { color: i === 2 ? "#ffd27a" : LT, size: 10.5 * k }));
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const iv = (s, a, b) => PL.clamp(Math.round(s.get()), a, b), t = clock ? clock.t : 0, z = iv(sZ, 1, 20), n = iv(sN, 0, 28), ne = iv(sE, 0, 20), A = z + n, q = z - ne, el = EL[z - 1], k = PL.clamp(W / 820, 0.62, 1.2);
      AP.labRoom(ctx, W, H, H - 14);
      const wx = 10, wy = 10, ww = Math.round(W * 0.58), wh = H - 26;
      darkWin(ctx, wx, wy, ww, wh, { model: "原子模型（示意，大小不成比例）", nucleus: "放大原子核", scale: "真實比例：原子核有多小？" }[view]);
      hits = [];
      ctx.save(); AP.rrPath(ctx, wx, wy, ww, wh, 9); ctx.clip();
      if (view === "scale") scaleView(ctx, wx, wy, ww, wh, t, k); else modelView(ctx, wx, wy, ww, wh, t, k, z, A, ne);
      // 轉台：模型下方的小旋轉盤
      if (view !== "scale") {
        const tx = wx + ww / 2, ty = wy + wh - 14;
        ctx.fillStyle = "rgba(160,180,210,0.35)"; ctx.beginPath(); ctx.ellipse(tx, ty, 34, 7, 0, 0, TAU); ctx.fill();
        D.text(ctx, "⟲ 轉台", tx + 40, ty + 4, { color: LD, size: 10 * k });
        gRot.place(tx, ty);
      } else gRot.hide();
      if (pick && view !== "scale") {
        const f = INFO[pick.k], bw = 210 * k, bh = 62 * k, bx = PL.clamp(pick.x + 16, wx + 6, wx + ww - bw - 6), by = PL.clamp(pick.y - bh - 12, wy + 24, wy + wh - bh - 6);
        D.line(ctx, pick.x, pick.y, bx + 10, by + bh, "#ffd27a", 1.2);
        AP.infoCard(ctx, bx, by, bw, bh);
        ball(ctx, bx + 14, by + 16 * k, 6, f[3]);
        D.text(ctx, f[0], bx + 26, by + 20 * k, { color: PL.col("text"), size: 12 * k, weight: "700" });
        D.text(ctx, f[1], bx + 10, by + 38 * k, { color: PL.col("text"), size: 10.5 * k });
        D.text(ctx, f[2], bx + 10, by + 54 * k, { color: PL.col("text-dim"), size: 10.5 * k });
      } else if (view !== "scale") D.text(ctx, "點一下任一顆粒子，看它的電性", wx + ww - 12, wy + wh - 34 - 16 * k, { color: "#ffd27a", size: 10.5 * k, align: "right" });
      ctx.restore();

      // 右上：核種符號卡 ᴬ_Z X
      const x0 = wx + ww + 10, w0 = W - x0 - 10, h1 = Math.round(H * 0.6), fs = Math.min(60, w0 * 0.2, h1 * 0.22);
      AP.infoCard(ctx, x0, wy, w0, h1);
      ctx.save(); ctx.font = "700 " + fs + "px " + FONT; const sw = ctx.measureText(el.s).width; ctx.restore();
      const sx = x0 + w0 / 2 - sw / 2 + fs * 0.2, sy = wy + 14 + fs;
      D.text(ctx, String(A), sx - 3, sy - fs * 0.56, { size: fs * 0.42, color: PL.col("accent"), align: "right", weight: "700" });
      D.text(ctx, String(z), sx - 3, sy + fs * 0.06, { size: fs * 0.42, color: "#d9463b", align: "right", weight: "700" });
      D.text(ctx, el.s, sx, sy, { size: fs, color: PL.col("text"), weight: "700" });
      if (q) D.text(ctx, (Math.abs(q) > 1 ? Math.abs(q) : "") + (q > 0 ? "+" : "−"), sx + sw + 3, sy - fs * 0.56, { size: fs * 0.42, color: q > 0 ? "#d9463b" : "#2f6fd0", weight: "700" });
      const st = STABLE[z - 1], nick = z === 1 ? ["", "氕", "氘", "氚"][A] || "" : "";
      const name = el.zh + "-" + A + (nick ? "（" + nick + "）" : "");
      const iso = A === st[0] ? "最常見的核種" : st.includes(A) ? "穩定同位素" : "不穩定（放射性）";
      const ion = q === 0 ? "中性原子" : q > 0 ? "陽離子（少 " + q + " 個電子）" : "陰離子（多 " + -q + " 個電子）";
      const fz = 11 * k, ly = sy + fs * 0.5;
      D.text(ctx, name + "｜" + ion, x0 + w0 / 2, ly, { color: PL.col("text"), size: fz, align: "center", weight: "700" });
      D.text(ctx, "A = Z + N = " + z + " + " + n + " = " + A, x0 + w0 / 2, ly + 18 * k, { color: PL.col("text-dim"), size: fz, align: "center" });
      // 粒子性質小表：考題最常問的電性與質量比
      const tb = ly + 30 * k, c1 = x0 + 14, c2 = x0 + w0 * 0.42, c3 = x0 + w0 * 0.66;
      if (tb + 70 * k < wy + h1) {
        D.line(ctx, x0 + 10, tb - 4, x0 + w0 - 10, tb - 4, PL.col("text-faint"), 1);
        [["粒子", "電荷", "質量"], ["質子 p", "+e", "1.007 u"], ["中子 n", "0", "1.009 u"], ["電子 e", "−e", "0.00055 u"]].forEach((r, i) => {
          const yy = tb + 12 * k + i * 17 * k, o = { color: i ? PL.col("text") : PL.col("text-dim"), size: 10.5 * k, weight: i ? "" : "700" };
          if (i) ball(ctx, c1 + 4, yy - 4, 4, [P_RGB, N_RGB, E_RGB][i - 1]);
          D.text(ctx, r[0], c1 + (i ? 12 : 0), yy, o); D.text(ctx, r[1], c2, yy, o); D.text(ctx, r[2], c3, yy, o);
        });
        D.text(ctx, "Z 定元素、N 定同位素、電子數定電性", x0 + w0 / 2, tb + 84 * k, { color: PL.col("text-dim"), size: 10 * k, align: "center" });
      }

      // 右下：三個粒子盒（放在桌上的淺盤）
      const ty = wy + h1 + 26 * k, th = H - 14 - ty, tw = (w0 - 16) / 3;
      [[sZ, P_RGB, "質子", gP], [sN, N_RGB, "中子", gN], [sE, E_RGB, "電子", gE]].forEach(([s, c, nm, g], i) => {
        const bx = x0 + i * (tw + 8), v = s.get(), r = Math.min(6, tw / 13);
        const gg = ctx.createLinearGradient(0, ty, 0, ty + th);
        gg.addColorStop(0, `rgba(${c.join(",")},0.22)`); gg.addColorStop(1, `rgba(${c.join(",")},0.40)`);
        AP.rrPath(ctx, bx, ty, tw, th, 6); ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = `rgba(${c.map(u => u * 0.6 | 0).join(",")},0.8)`; ctx.lineWidth = 1.5; ctx.stroke();
        PL.theme.note(ctx, PL.theme.isLight() ? "#e8d9cf" : "#2a2a30", bx, ty, tw, th);
        D.text(ctx, nm + " " + v, bx + tw / 2, ty - 7, { color: PL.col("text"), size: 11.5 * k, align: "center", weight: "700" });
        const cols = Math.max(1, Math.floor((tw - 8) / (2 * r + 2)));
        for (let j = 0; j < Math.min(v, cols * Math.floor((th - 10) / (2 * r + 2))); j++) ball(ctx, bx + 6 + r + (j % cols) * (2 * r + 2), ty + th - 6 - r - Math.floor(j / cols) * (2 * r + 2), r, c);
        g.place(bx + tw / 2, ty + th * 0.4);
      });

      rSym.set(sup(A) + sub(z) + el.s + (q ? (Math.abs(q) > 1 ? sup(Math.abs(q)) : "") + (q > 0 ? "⁺" : "⁻") : ""));
      rA.set(A, 0); rQ.set(q, 0);
      const mN = z * 1.007276 + n * 1.008665, mT = mN + ne * 0.000549;
      rM.set(mT, 4); rF.set(mN / mT * 100, 3); rR.set(1.2 * Math.cbrt(A), 2);
      vd.set(name + "：" + ion + "，" + iso + (z === 1 && A === 3 ? "（氚會 β 衰變）" : z === 6 && A === 14 ? "（碳-14 用於定年）" : ""), q !== 0 ? "warn" : iso === "不穩定（放射性）" ? "bad" : "ok");
      cz.set(0, "Z = " + z + " → " + el.zh + "（" + el.s + "）"); cz.set(1, "N = " + n + " → A = " + A); cz.set(2, ne + " 個電子 → " + (q === 0 ? "中性" : (q > 0 ? "+" : "−") + Math.abs(q) + "e"));
    }
    clock = PL.motion.clock(() => draw(), { ambient: true });
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* ================================================================
     波耳氫原子模型與光譜系列
     左：放大的氫原子，軌道半徑 r = n²a₀（真實比例）；中：能階圖；下：放電管 → 光柵分光儀，
     每放出一個光子就在分光儀上累積一次譜線。拖能階圖上的電子到高能階、拖「落回」標記選低能階。
     ================================================================ */
  PL.register("bohr-hydrogen", { build(root) {
    const AP = ap();
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62, 900);
    const En = n => -13.6 / (n * n), lamOf = (a, b) => 1240 / (En(a) - En(b));
    const SER = ["", "來曼系（紫外）", "巴耳末系", "帕申系（紅外）", "布拉克系（紅外）", "蒲芬德系（紅外）"], HN = { 3: "H_α", 4: "H_β", 5: "H_γ", 6: "H_δ" };
    let mode = "fix", clock = null, lines = {}, photons = [], st = null, geo = null;
    PL.ui.section(L.controls, "躍遷");
    const sNi = PL.ui.slider(L.controls, { label: "高能階 nᵢ（電子被激發到）", min: 2, max: 6, step: 1, value: 3, digits: 0,
      onInput: v => { if (sNf.get() >= v) sNf.set(v - 1); restart(); draw(); } });
    const sNf = PL.ui.slider(L.controls, { label: "落回能階 n_f", min: 1, max: 5, step: 1, value: 2, digits: 0,
      onInput: v => { if (sNi.get() <= v) sNi.set(v + 1); restart(); draw(); } });
    // 取整並保證 n_f < nᵢ（探測引擎可能寫入非整數值）
    const NI = () => PL.clamp(Math.round(sNi.get()), 2, 6), NF = () => Math.min(PL.clamp(Math.round(sNf.get()), 1, 5), NI() - 1);
    const chip = PL.ui.chipGroup(L.controls, { value: "fix", options: [{ value: "fix", label: "指定 nᵢ → n_f" }, { value: "cascade", label: "自由串級（隨機往下跳）" }], onChange: v => { mode = v; restart(); draw(); } });
    PL.ui.button(PL.ui.buttonRow(L.controls), "清除光譜", () => { lines = {}; draw(); });
    const set = (a, b, m) => { sNi.set(a); sNf.set(b); mode = m || "fix"; chip.set(mode); lines = {}; restart(); draw(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "巴耳末 H_α（3→2）", apply: () => set(3, 2) }, { label: "H_β（4→2）", apply: () => set(4, 2) },
      { label: "來曼 α（2→1）", apply: () => set(2, 1) }, { label: "帕申 α（4→3）", apply: () => set(4, 3) },
      { label: "n = 4 最多幾種光子？", hint: "自由串級：數分光儀上出現幾條線", apply: () => set(4, 1, "cascade") }] });
    PL.ui.note(L.controls, "電子只能待在 n = 1, 2, 3… 的軌道上。從高能階跳到低能階放出一個光子，hf = E_高 − E_低。落回 n = 2 的巴耳末系有四條可見光；落回 n = 1 的來曼系全在紫外。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rDE = PL.ui.readout(L.readouts, { label: "光子能量 hf = ΔE", unit: "eV" });
    const rL = PL.ui.readout(L.readouts, { label: "波長 λ = 1240/ΔE", unit: "nm" });
    const rS = PL.ui.readout(L.readouts, { label: "系列" });
    const rEi = PL.ui.readout(L.readouts, { label: "高能階能量 E_nᵢ", unit: "eV" });
    const rR = PL.ui.readout(L.readouts, { label: "軌道半徑 r = n²a₀", unit: "nm" });
    const rC = PL.ui.readout(L.readouts, { label: "由 nᵢ 最多幾種光子", unit: "種" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "E<sub>nᵢ</sub> = −13.6/nᵢ²", unit: "eV" }, { label: "E<sub>n_f</sub> = −13.6/n_f²", unit: "eV" },
      { label: "ΔE = E<sub>nᵢ</sub> − E<sub>n_f</sub>", unit: "eV", hint: "就是光子能量 hf" }]);
    // 能階圖上：電子（拖到要激發的能階）與「落回」標記
    const near = (y, lo, hi) => { let b = lo; for (let n = lo; n <= hi; n++) if (geo && Math.abs(geo.y(n) - y) < Math.abs(geo.y(b) - y)) b = n; return b; };
    const gHi = PL.ui.handle(cv, { slider: sNi, label: "電子（拖到高能階 nᵢ）", toValue: (x, y) => near(y, 2, 6) });
    const gLo = PL.ui.handle(cv, { slider: sNf, label: "落回能階 n_f（上下拖）", toValue: (x, y) => near(y, 1, 5) });
    function restart() { st = { n: NI(), ph: "dwell", tp: 0.6, from: 0, to: 0, ang: st ? st.ang : 0 }; photons = []; }
    function emit(a, b) { const key = a + "-" + b; lines[key] = (lines[key] || 0) + 1; photons.push({ a, b, lam: lamOf(a, b), ang: st.ang, r0: a * a, age: 0 }); }
    function step(dt) {
      st.ang += dt * 4.5 / Math.pow(st.ph === "dwell" ? st.n : Math.max(st.from, st.to), 1.4); st.tp += dt;
      if (st.ph === "dwell" && st.tp > 0.9) {
        const ni = NI(), nf = NF();
        const to = mode === "fix" ? (st.n === ni ? nf : ni) : (st.n > 1 ? 1 + Math.floor(Math.random() * (st.n - 1)) : ni);
        st.ph = to < st.n ? "fall" : "rise"; st.from = st.n; st.to = to; st.tp = 0;
        if (to < st.n) emit(st.n, to);
      } else if (st.ph !== "dwell" && st.tp > 0.4) { st.n = st.to; st.ph = "dwell"; st.tp = 0; }
      photons.forEach(p => p.age += dt); photons = photons.filter(p => p.age < 2.4);
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const ni = NI(), nf = NF(), k = PL.clamp(W / 860, 0.62, 1.2), t = clock ? clock.t : 0;
      AP.labRoom(ctx, W, H, H - 12);
      const sh = Math.round(PL.clamp(H * 0.2, 74, 112)), ah = H - sh - 26, ww = Math.round(W * 0.43);
      // ---------- 放大的氫原子 ----------
      darkWin(ctx, 10, 10, ww, ah, "放大一個氫原子（軌道依 r ∝ n² 畫）");
      const acx = 10 + ww / 2, acy = 18 + ah / 2, Rm = Math.min(ww, ah) * 0.43, sc = Rm / Math.max(16, ni * ni);
      const u = st.ph === "dwell" ? 1 : Math.min(1, st.tp / 0.4), ea = u * u * (3 - 2 * u);
      const lv = st.ph === "dwell" ? st.n * st.n : st.from * st.from + (st.to * st.to - st.from * st.from) * ea;
      ctx.save(); AP.rrPath(ctx, 10, 10, ww, ah, 9); ctx.clip();
      for (let n = 1; n <= 6; n++) {
        const r = n * n * sc;
        D.ring(ctx, acx, acy, r, n === ni ? "rgba(127,231,255,0.75)" : n === nf ? "rgba(255,210,110,0.7)" : "rgba(160,190,230,0.28)", n === ni || n === nf ? 1.6 : 1, [3, 4]);
        if (r > 12 && r < Rm * 1.08) D.text(ctx, "n=" + n, acx + r * 0.71 + 3, acy - r * 0.71 - 3, { color: LD, size: 9.5 * k });
      }
      D.disc(ctx, acx, acy, 4, { fill: "#ff6a5a", glow: "#ff6a5a", glowSize: 10 });
      const er = lv * sc, ex = acx + er * Math.cos(st.ang), ey = acy + er * Math.sin(st.ang);
      photons.forEach((p, i) => {
        const d = p.r0 * sc + p.age * 230, ca = Math.cos(p.ang), sa = Math.sin(p.ang), wl = PL.clamp(4 + 8 * Math.log10(p.lam / 90), 4, 16), c = lamColor(p.lam);
        ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.shadowColor = c; ctx.shadowBlur = 6; ctx.beginPath();
        for (let s = 0; s <= 44; s += 2) { const dd = d - 44 + s, o = 4 * Math.sin((dd / wl) * TAU) * Math.sin(Math.PI * s / 44); const px = acx + dd * ca - o * sa, py = acy + dd * sa + o * ca; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); ctx.restore();
        if (i === photons.length - 1) D.text(ctx, Math.round(p.lam) + " nm", acx + (d + 6) * ca, acy + (d + 6) * sa, { color: c, size: 10.5 * k, weight: "700" });
      });
      D.disc(ctx, ex, ey, 5, { fill: "#6fb0ff", glow: "#6fb0ff", glowSize: 10 });
      if (st.ph !== "dwell") D.text(ctx, st.ph === "fall" ? "放出光子 hf = ΔE" : "吸收能量（碰撞激發）", ex + 8, ey - 8, { color: st.ph === "fall" ? "#ffd27a" : "#7fe7ff", size: 10.5 * k, weight: "700" });
      D.text(ctx, "電子只能在這些軌道上；a₀ = 0.053 nm", 20, ah - 2, { color: LD, size: 10 * k });
      ctx.restore();

      // ---------- 能階圖 ----------
      const ex0 = 20 + ww, ew = W - ex0 - 10, top = 10 + 44 * k, hh = ah - 44 * k - 30 * k;
      AP.infoCard(ctx, ex0, 10, ew, ah);
      const yOf = n => top + hh * Math.pow(n, -0.9);
      geo = { y: yOf };
      D.text(ctx, "能階圖 Eₙ = −13.6 / n² eV（縱軸未依比例）", ex0 + 10, 28, { color: PL.col("text"), size: 11.5 * k, weight: "700" });
      D.line(ctx, ex0 + 30, top, ex0 + ew - 12, top, PL.col("text-faint"), 1, [4, 4]);
      D.text(ctx, "n = ∞（游離）0 eV", ex0 + ew - 14, top - 4, { color: PL.col("text-dim"), size: 9.5 * k, align: "right" });
      const vx = ex0 + ew - 118;
      for (let n = 1; n <= 6; n++) {
        const y = yOf(n), on = n === ni || n === nf;
        D.line(ctx, ex0 + 30, y, ex0 + ew - 12, y, on ? PL.col("text") : PL.col("text-dim"), on ? 2 : 1.2);
        D.text(ctx, "n=" + n, ex0 + 8, y + 4, { color: PL.col("text"), size: 10 * k, weight: on ? "700" : "" });
        D.text(ctx, En(n).toFixed(2), vx, y - 3, { color: PL.col("text-dim"), size: 9.5 * k, align: "right" });
      }
      // 已發生過的躍遷（淡）與目前指定的躍遷（亮），依落回能階分組排列，像課本的能階圖
      const ax = (a, b) => ex0 + 46 * k + (b - 1) * (vx - 60 - ex0 - 46 * k) / 4.2 + (a - b - 1) * 9 * k;
      Object.keys(lines).forEach(key => { const [a, b] = key.split("-").map(Number); D.arrow(ctx, ax(a, b), yOf(a), ax(a, b), yOf(b) - 2, { color: lamColor(lamOf(a, b)), width: 1.6, head: 6 }); });
      const cc = lamColor(lamOf(ni, nf));
      if (mode === "fix") D.arrow(ctx, ax(ni, nf), yOf(ni), ax(ni, nf), yOf(nf) - 2, { color: cc, width: 3.2, head: 9 });
      [1, 2, 3].forEach(b => { if (Object.keys(lines).some(s => s.endsWith("-" + b)) || (mode === "fix" && nf === b)) D.text(ctx, SER[b].replace(/（.*/, ""), ax(b + 1, b) - 4, yOf(b) + 14 * k, { color: PL.col("text-dim"), size: 9.5 * k }); });
      // 電子在能階圖上的位置（隨躍遷上下移動）
      // 電子沿著正在發生的躍遷箭頭上下移動；停留時待在該能階上
      const yl = st.ph === "dwell" ? yOf(st.n) : yOf(st.from) + (yOf(st.to) - yOf(st.from)) * ea, hx = ex0 + ew - 34;
      const exD = st.ph === "dwell" ? (mode === "fix" ? ax(ni, nf) : ex0 + 30 + 12) : ax(Math.max(st.from, st.to), Math.min(st.from, st.to));
      D.disc(ctx, exD, yl, 5, { fill: "#4a90ff", glow: "#4a90ff", glowSize: 8 });
      D.ring(ctx, hx, yOf(ni), 9, "#2a9fd8", 2); D.text(ctx, "激發到", hx, yOf(ni) + 26, { color: PL.col("text-dim"), size: 9 * k, align: "center" });
      D.arrow(ctx, hx - 56, yOf(nf) - 14, hx - 56, yOf(nf) - 1, { color: "#e39400", width: 2.4, head: 7 });
      D.text(ctx, "落回", hx - 56, yOf(nf) + 24, { color: PL.col("text-dim"), size: 9 * k, align: "center" });
      gHi.place(hx, yOf(ni)); gLo.place(hx - 56, yOf(nf) - 6);
      D.text(ctx, mode === "cascade" ? "由 n = " + ni + " 往下跳，最多 " + ni * (ni - 1) / 2 + " 種光子 = C(" + ni + ",2)" : "hf = E_" + ni + " − E_" + nf + " = " + (En(ni) - En(nf)).toFixed(2) + " eV",
        ex0 + 10, 10 + ah - 10, { color: PL.col("text"), size: 10.5 * k, weight: "700" });

      // ---------- 放電管 → 光柵分光儀 ----------
      const sy = H - sh - 12, tx1 = Math.min(150, W * 0.17), sx0 = tx1 + 18, sw = W - 10 - sx0, tcy = sy + sh * 0.42;
      const glow = 0.55 + 0.15 * Math.sin(t * 6);
      glass(ctx, 14, tcy - 6, tx1 - 18, 12, 6);
      ctx.fillStyle = `rgba(255,110,200,${glow})`; ctx.shadowColor = "rgba(255,110,200,0.9)"; ctx.shadowBlur = 10; ctx.fillRect(22, tcy - 2.5, tx1 - 34, 5); ctx.shadowBlur = 0;
      AP.steel(ctx, 10, tcy - 8, 8, 16); AP.steel(ctx, tx1 - 8, tcy - 8, 8, 16);
      D.text(ctx, "氫氣放電管", (tx1 + 10) / 2, tcy + 24, { color: PL.col("text"), size: 10 * k, align: "center", weight: "700" });
      D.text(ctx, "→ 光柵 →", (tx1 + 10) / 2, tcy + 38, { color: PL.col("text-dim"), size: 9.5 * k, align: "center" });
      darkWin(ctx, sx0, sy, sw, sh, "分光儀：每放出一個光子，譜線就亮一點");
      const X = l => sx0 + 12 + Math.log(l / 80) / Math.log(2000 / 80) * (sw - 24), by = sy + sh - 20;
      for (let l = 380; l < 750; l += 3) { ctx.fillStyle = AP.nmColor(l, 0.55); ctx.fillRect(X(l), by, X(l + 3) - X(l) + 0.6, 5); }
      [100, 200, 400, 700, 1000, 2000].forEach(l => { D.line(ctx, X(l), by + 5, X(l), by + 9, LD, 1); D.text(ctx, l + (l === 2000 ? " nm" : ""), X(l), by + 17, { color: LD, size: 8.5 * k, align: l === 2000 ? "right" : "center" }); });
      [["紫外", 85], ["可見光", 470], ["紅外", 1300]].forEach(p => D.text(ctx, p[0], X(p[1]), sy + 32, { color: LD, size: 9 * k }));
      let nLines = 0;
      Object.keys(lines).forEach(key => {
        const [a, b] = key.split("-").map(Number), l = lamOf(a, b), c = lamColor(l), x = X(l); nLines++;
        ctx.save(); ctx.globalAlpha = Math.min(1, 0.3 + lines[key] * 0.14); ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.shadowColor = c; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(x, sy + 38); ctx.lineTo(x, by - 2); ctx.stroke(); ctx.restore();
      });
      const lsel = lamOf(ni, nf);
      D.line(ctx, X(lsel), sy + 36, X(lsel), by, "rgba(255,255,255,0.5)", 1, [2, 3]);
      D.text(ctx, lsel.toFixed(0) + " nm" + (nf === 2 ? " " + HN[ni] : ""), X(lsel) + 4, sy + 46, { color: lamColor(lsel), size: 10.5 * k, weight: "700" });
      D.text(ctx, "已出現 " + nLines + " 條", sx0 + sw - 10, sy + 17, { color: "#ffd27a", size: 10.5 * k, align: "right", weight: "700" });

      const dE = En(ni) - En(nf);
      rDE.set(dE, 3); rL.set(lsel, 1); rS.set(SER[nf] + (nf === 2 ? " " + HN[ni] : "")); rEi.set(En(ni), 3); rR.set(0.0529 * ni * ni, 3); rC.set(ni * (ni - 1) / 2, 0);
      dv.set(0, En(ni), 3); dv.set(1, En(nf), 3); dv.set(2, dE, 3);
      vd.set(ni + " → " + nf + "：放出 " + dE.toFixed(2) + " eV、λ = " + lsel.toFixed(0) + " nm 的" + colorWord(lsel) + "（" + SER[nf].replace(/（.*/, "") + "）", lsel >= 380 && lsel <= 750 ? "ok" : "info");
    }
    restart();
    for (let i = 0; i < 40; i++) step(1 / 30);   // 預跑一下：一打開就看得到一次躍遷與一條譜線
    clock = PL.motion.clock(dt => { step(Math.min(dt, 0.05)); draw(); }, { ambient: true });
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* ================================================================
     物質波：電子雙狹縫
     電子槍加速 → 奈米雙狹縫 → 螢光幕。電子一顆一顆打上去，落點看似隨機，
     累積起來才浮現條紋（機率分布 cos² × 單縫包絡）。λ = h/√(2meV)，條紋間距 Δy = λL/d。
     ================================================================ */
  PL.register("matter-wave", { build(root) {
    const AP = ap();
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58, 900);
    const h = 6.626e-34, me = 9.109e-31, e = 1.602e-19;
    let clock = null, hy = [], hv = [], flying = [], acc = 0, rate = 10, geo = null;
    const reset = () => { hy = []; hv = []; flying = []; for (let i = 0; i < 30; i++) { hy.push(sample()); hv.push(Math.random()); } };
    const ch = () => { reset(); draw(); };
    PL.ui.section(L.controls, "電子槍與雙狹縫");
    const sV = PL.ui.slider(L.controls, { label: "加速電壓 V", min: 25, max: 400, step: 1, value: 100, unit: "V", digits: 0, onInput: ch });
    const sD = PL.ui.slider(L.controls, { label: "狹縫間距 d", min: 40, max: 120, step: 2, value: 60, unit: "nm", digits: 0, onInput: ch });
    const sL = PL.ui.slider(L.controls, { label: "狹縫到螢幕 L", min: 0.3, max: 0.8, step: 0.01, value: 0.5, unit: "m", digits: 2, onInput: ch });
    PL.ui.chipGroup(L.controls, { value: 10, options: [{ value: 10, label: "一顆一顆" }, { value: 150, label: "大量電子" }], onChange: v => { rate = v; draw(); } });
    PL.ui.button(PL.ui.buttonRow(L.controls), "清除螢幕", () => { hy = []; hv = []; draw(); });
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "戴維森–革末 54 V", hint: "λ ≈ 0.167 nm，與晶格間距相近", apply: () => { sV.set(54); ch(); } },
      { label: "電壓 ×4 → λ 減半", apply: () => { sV.set(Math.min(400, sV.get() * 4)); ch(); } },
      { label: "電子顯微鏡（高壓）", hint: "λ 越短，越能分辨細節", apply: () => { sV.set(400); ch(); } }] });
    PL.ui.note(L.controls, "電壓越高 → 電子動量 p 越大 → 物質波波長 λ = h/p 越短 → 條紋越密。單一電子的落點無法預測，只有大量累積才看得到干涉條紋。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rLam = PL.ui.readout(L.readouts, { label: "物質波波長 λ = h/p", unit: "nm" });
    const rP = PL.ui.readout(L.readouts, { label: "動量 p = √(2meV)", unit: "×10⁻²⁴ kg·m/s" });
    const rV = PL.ui.readout(L.readouts, { label: "電子速率 v", unit: "×10⁶ m/s" });
    const rDy = PL.ui.readout(L.readouts, { label: "條紋間距 Δy = λL/d", unit: "mm" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "電子 λ ≈ 1.23/√V", unit: "nm" }, { label: "同電壓的質子 λ", unit: "nm", hint: "質量大 1836 倍 → λ 小 √1836 倍" },
      { label: "同速率的質子 λ", unit: "nm", hint: "λ = h/mv → 小 1836 倍" }]);
    PL.ui.causality(L.canvasWrap.parentNode, { title: "一條因果鏈", rows: [
      { name: "加速電壓 V", tone: "a", note: "eV = ½mv²：電壓給電子動能。" }, { name: "動量 p", tone: "b", note: "p = √(2meV)：V 變 4 倍，p 變 2 倍。" },
      { name: "波長 λ = h/p", tone: "c", note: "λ ∝ 1/√V：條紋間距 Δy = λL/d 跟著變小。" }] });
    const lam = () => h / Math.sqrt(2 * me * e * sV.get()) * 1e9, dY = () => lam() * sL.get() / sD.get() * 1e3;
    // 雙狹縫機率分布：cos²（兩縫干涉）× sinc²（單縫包絡，縫寬 a = d/4）
    const prob = y => { const u = Math.PI * y / dY(), b = u / 4, s = Math.abs(b) < 1e-6 ? 1 : Math.sin(b) / b; return Math.cos(u) ** 2 * s * s; };
    function sample() { for (let i = 0; i < 300; i++) { const y = (Math.random() * 2 - 1) * 5; if (Math.random() < prob(y)) return y; } return 0; }
    const gV = PL.ui.handle(cv, relGrip(sV, 2.4, "加速電壓旋鈕（上下拖）"));
    const gD = PL.ui.handle(cv, relGrip(sD, 0.5, "雙狹縫板（上下拖改間距 d）"));
    const gL = PL.ui.handle(cv, { slider: sL, label: "螢光幕（左右拖改距離 L）", toValue: x => geo ? 0.3 + (x - geo.s0) / geo.sr * 0.5 : sL.get() });
    function step(dt) {
      acc += dt * rate;
      while (acc >= 1) { acc -= 1; if (flying.length < 40) flying.push({ d: 0, y: sample() }); else { hy.push(sample()); hv.push(Math.random()); } }
      const sp = PL.clamp(170 * Math.sqrt(sV.get() / 100), 90, 340);
      flying.forEach(f => f.d += sp * dt);
      if (geo) flying = flying.filter(f => { if (f.d < geo.len1 + geo.len2) return true; hy.push(f.y); hv.push(Math.random()); return false; });
      if (hy.length > 7000) { hy.splice(0, 1000); hv.splice(0, 1000); }
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock ? clock.t : 0, k = PL.clamp(W / 860, 0.62, 1.2), V = sV.get(), d = sD.get(), Lm = sL.get(), lm = lam(), dy = dY();
      AP.labRoom(ctx, W, H, H - 14);
      const LW = Math.round(W * 0.6), ty0 = Math.round(H * 0.07), ty1 = Math.round(H * 0.5), gy = (ty0 + ty1) / 2, mm = (ty1 - ty0 - 40) / 10;
      AP.steel(ctx, 120, ty1, 10, H - 14 - ty1); AP.steel(ctx, LW - 60, ty1, 10, H - 14 - ty1);
      glass(ctx, 14, ty0, LW - 20, ty1 - ty0, 30);
      D.text(ctx, "真空玻璃管", LW - 16, ty0 - 5, { color: PL.col("text-dim"), size: 10 * k, align: "right" });
      // 電子槍：燈絲加熱的陰極 ＋ 中間有孔的陽極（兩者間的電壓 V 加速電子）
      const gx = 28;
      AP.steel(ctx, gx, gy - 22, 16, 44);
      ctx.strokeStyle = "rgba(255,160,60,0.95)"; ctx.lineWidth = 2; ctx.shadowColor = "#ffa040"; ctx.shadowBlur = 8; ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const yy = gy - 12 + i * 2.4; i ? ctx.lineTo(gx + 18 + (i % 2) * 4, yy) : ctx.moveTo(gx + 18, yy); } ctx.stroke(); ctx.shadowBlur = 0;
      AP.steel(ctx, gx + 50, gy - 34, 7, 30); AP.steel(ctx, gx + 50, gy + 4, 7, 30);
      D.text(ctx, "電子槍", gx + 30, gy - 42, { color: PL.col("text"), size: 10.5 * k, align: "center", weight: "700" });
      D.text(ctx, "陰極", gx + 8, gy + 36, { color: PL.col("text-dim"), size: 9.5 * k, align: "center" }); D.text(ctx, "陽極", gx + 54, gy + 46, { color: PL.col("text-dim"), size: 9.5 * k, align: "center" });
      // 雙狹縫板與螢幕
      const sx = Math.round(14 + (LW - 20) * 0.4), dv2 = 8 + (d - 40) / 80 * 26, s0 = sx + 46, sr = LW - 34 - s0, scr = s0 + (Lm - 0.3) / 0.5 * sr;
      geo = { s0, sr, len1: sx - (gx + 58), len2: scr - sx };
      [[ty0 + 8, gy - dv2 / 2 - 2], [gy - dv2 / 2 + 2, gy + dv2 / 2 - 2], [gy + dv2 / 2 + 2, ty1 - 8]].forEach(p => AP.steel(ctx, sx - 3, p[0], 6, p[1] - p[0]));
      D.text(ctx, "雙狹縫 d", sx - 8, ty0 + 20, { color: PL.col("text"), size: 10.5 * k, align: "right", weight: "700" });
      ctx.fillStyle = "rgb(60,150,100)"; ctx.fillRect(scr, gy - 5 * mm - 6, 6, 10 * mm + 12);
      D.text(ctx, "螢光幕", scr - 6, gy - 5 * mm - 2, { color: PL.col("text"), size: 10.5 * k, align: "right", weight: "700" });
      // 物質波：狹縫前是平面波，穿過兩縫後是兩組圓形波（畫面上的波長依 λ 縮放）
      const wl = 5 + 22 * (lm / 0.245), ph = (t * 50) % wl;
      ctx.save(); ctx.strokeStyle = PL.theme.isLight() ? "rgba(40,120,200,0.35)" : "rgba(110,200,255,0.30)"; ctx.lineWidth = 1.2;
      for (let x = gx + 60 + ph; x < sx - 3; x += wl) { ctx.beginPath(); ctx.moveTo(x, gy - 16); ctx.lineTo(x, gy + 16); ctx.stroke(); }
      ctx.beginPath(); ctx.rect(sx + 3, ty0 + 4, scr - sx - 3, ty1 - ty0 - 8); ctx.clip();
      [-1, 1].forEach(sg => { for (let r = ph; r < scr - sx; r += wl) { ctx.beginPath(); ctx.arc(sx, gy + sg * dv2 / 2, r, -1.25, 1.25); ctx.stroke(); } });
      ctx.restore();
      // 飛行中的電子（粒子）與螢幕上已打到的點
      flying.forEach(f => {
        let x, y;
        if (f.d < geo.len1) { x = gx + 58 + f.d; y = gy; } else { const u = (f.d - geo.len1) / geo.len2; x = sx + (scr - sx) * u; y = gy + f.y * mm * u; }
        D.disc(ctx, x, y, 2.6, { fill: PL.theme.isLight() ? "#1f6fd6" : "#8fd0ff", glow: "#8fd0ff", glowSize: 6 });
      });
      for (let i = Math.max(0, hy.length - 300); i < hy.length; i++) { ctx.fillStyle = "rgba(170,255,190,0.55)"; ctx.fillRect(scr - 1, gy + hy[i] * mm - 0.5, 8, 1.2); }
      // 高壓電源：旋鈕即把手
      const px = 26, pw = 160, ph2 = 60, py = H - 14 - ph2 - 4;
      AP.cable(ctx, [{ x: px + pw - 36, y: py + ph2 - 13 }, { x: gx + 53, y: ty1 + 14 }, { x: gx + 53, y: gy + 34 }], "rgb(214,52,44)", 2.2, 10);
      AP.cable(ctx, [{ x: px + pw - 17, y: py + ph2 - 13 }, { x: gx + 8, y: ty1 + 24 }, { x: gx + 8, y: gy + 22 }], "rgb(40,40,44)", 2.2, 10);
      AP.powerSupply(ctx, px, py, pw, ph2, V.toFixed(0) + " V", { knob: (V - 25) / 375, label: "加速電壓" });
      gV.place(px + pw - 11 - Math.max(5, Math.min(10, ph2 * 0.15)), py + 10 + Math.max(12, Math.min(24, ph2 * 0.36)) / 2);
      gD.place(sx, gy + dv2 / 2 + 26); gL.place(scr + 3, gy + 5 * mm + 20);
      // 公式卡：從電壓一路推到條紋間距
      const qx = px + pw + 18, qy = ty1 + 18, qw = LW - qx - 4, qh = H - 18 - qy;
      if (qw > 120) {
        AP.infoCard(ctx, qx, qy, qw, qh);
        const p = h / (lm * 1e-9), f2 = 10.5 * k, rows = ["① eV = p²/2m　→　p = √(2meV) = " + (p * 1e24).toFixed(2) + "×10⁻²⁴", "② λ = h/p ≈ 1.23/√V = " + lm.toFixed(4) + " nm", "③ Δy = λL/d = " + dy.toFixed(2) + " mm"];
        D.text(ctx, "從電壓到條紋間距", qx + 10, qy + 18, { color: PL.col("text"), size: 11 * k, weight: "700" });
        rows.forEach((r, i) => D.text(ctx, r, qx + 10, qy + 18 + (i + 1) * Math.min(20 * k, (qh - 24) / 3.4), { color: i === 1 ? PL.col("accent") : PL.col("text"), size: f2, weight: i === 1 ? "700" : "" }));
      }
      // 右：螢光幕正面（點）＋ 統計分布
      const x0 = LW + 10, w0 = W - x0 - 10, fh = Math.round(H * 0.5);
      darkWin(ctx, x0, 10, w0, fh, "螢光幕正面：電子一顆一顆打上去");
      const X = y => x0 + 10 + (y + 5) / 10 * (w0 - 20);
      ctx.fillStyle = "rgba(170,255,190,0.85)";
      for (let i = 0; i < hy.length; i++) ctx.fillRect(X(hy[i]) - 0.8, 30 + hv[i] * (fh - 44), 1.6, 1.6);
      D.text(ctx, "已打到 " + hy.length + " 個電子", x0 + w0 - 10, 10 + fh - 8, { color: "#ffd27a", size: 10.5 * k, align: "right", weight: "700" });
      const cy0 = 22 + fh, chh = H - 14 - cy0 - 8;
      AP.infoCard(ctx, x0, cy0, w0, chh);
      const NB = 60, bins = new Array(NB).fill(0);
      hy.forEach(y => { const i = Math.floor((y + 5) / 10 * NB); if (i >= 0 && i < NB) bins[i]++; });
      const mx = Math.max(1, ...bins), base = cy0 + chh - 22, hgt = chh - 46, bw = (w0 - 20) / NB;
      bins.forEach((b, i) => { if (b) { ctx.fillStyle = "rgba(60,170,110,0.75)"; ctx.fillRect(x0 + 10 + i * bw, base - b / mx * hgt, bw - 0.6, b / mx * hgt); } });
      ctx.save(); ctx.strokeStyle = PL.col("accent"); ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.beginPath();
      // 理論曲線：每格的期望值正比於 P(y)，頂端對齊最高的長條
      for (let i = 0; i <= 240; i++) { const y = -5 + i / 24, v = prob(y) * (hy.length > 80 ? 1 : 0.9); i ? ctx.lineTo(X(y), base - v * hgt) : ctx.moveTo(X(y), base - v * hgt); }
      ctx.stroke(); ctx.restore();
      D.line(ctx, x0 + 10, base, x0 + w0 - 10, base, PL.col("text-faint"), 1);
      [-5, 0, 5].forEach(y => D.text(ctx, y + " mm", X(y), base + 13, { color: PL.col("text-dim"), size: 9 * k, align: y < 0 ? "left" : y > 0 ? "right" : "center" }));
      D.text(ctx, "落點統計（虛線：機率分布）　Δy = λL/d = " + dy.toFixed(2) + " mm", x0 + 10, cy0 + 16, { color: PL.col("text"), size: 10.5 * k, weight: "700" });
      if (dy > 0.25) { D.line(ctx, X(0), cy0 + 24, X(dy), cy0 + 24, PL.col("accent"), 1.5); D.text(ctx, "Δy", X(dy) + 3, cy0 + 28, { color: PL.col("accent"), size: 10 * k }); }

      const p = h / (lm * 1e-9);
      rLam.set(lm, 4); rP.set(p * 1e24, 3); rV.set(p / me / 1e6, 3); rDy.set(dy, 3);
      dv.set(0, lm, 4); dv.set(1, lm / Math.sqrt(1836), 5); dv.set(2, lm / 1836, 6);
      vd.set("λ = " + lm.toFixed(3) + " nm（比可見光短約 " + Math.round(550 / lm) + " 倍）→ 條紋間距 " + dy.toFixed(2) + " mm" + (dy < 0.3 ? "：很密，λ 短的波鑑別率高" : ""), dy < 0.3 ? "warn" : "ok");
    }
    reset();
    clock = PL.motion.clock(dt => { step(Math.min(dt, 0.05)); draw(); }, { ambient: true });
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* ================================================================
     X 射線管：連續譜與特性譜
     燈絲放出電子，被高電壓加速撞上靶材：減速放出連續譜（制動輻射），
     最短波長 λmin = hc/eV = 1.24/V(kV) nm；電壓超過靶材 K 層門檻才出現 Kα、Kβ 尖峰。
     右側光譜是偵測器即時累積的計數（帶統計起伏），虛線為理論曲線。
     ================================================================ */
  const TGT = { W: { n: "鎢", Z: 74, ka: 0.0209, kb: 0.0184, vk: 69.5, c: "#9aa6b8" }, Mo: { n: "鉬", Z: 42, ka: 0.0711, kb: 0.0632, vk: 20.0, c: "#c4c9d0" }, Cu: { n: "銅", Z: 29, ka: 0.1542, kb: 0.1392, vk: 8.98, c: "#c8794a" } };
  PL.register("x-ray-tube", { build(root) {
    const AP = ap();
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58, 900);
    const NB = 125, BW = 0.002, X1 = 0.25, SIG = 0.0017;
    let tg = "Mo", clock = null, counts = new Array(NB).fill(0), T = 0, pinned = null, xr = [], geo = null;
    // 理論光譜（任意單位）：Kramers 連續譜 Z·I·(1/λmin − 1/λ)/λ² ＋ 高斯形的 Kα、Kβ
    const lmin = () => 1.24 / sV.get();
    function S(l, V, I, key) {
      const g = TGT[key], lm = 1.24 / V; let s = l > lm ? g.Z * I * (1 / lm - 1 / l) / (l * l) : 0;
      if (V > g.vk) {
        const lr = 1.24 / (1.75 * g.vk), amp = 3 * (g.Z / (6.75 * lr * lr * lr)) / Math.pow(0.75, 1.6) * I * Math.pow(V / g.vk - 1, 1.6);
        s += amp * (Math.exp(-((l - g.ka) ** 2) / (2 * SIG * SIG)) + 0.2 * Math.exp(-((l - g.kb) ** 2) / (2 * SIG * SIG)));
      }
      return s;
    }
    let REF = 0; for (let i = 0; i < NB; i++) REF += S((i + 0.5) * BW, 35, 20, "Mo") * BW;
    const KC = 2500 / REF;
    function acquire(dt) { const V = sV.get(), I = sI.get(); for (let i = 0; i < NB; i++) counts[i] += pois(S((i + 0.5) * BW, V, I, tg) * BW * dt * KC); T += dt; }
    const reset = () => { counts.fill(0); T = 0; acquire(0.5); };
    const ch = () => { reset(); draw(); };
    PL.ui.section(L.controls, "X 射線管");
    const sV = PL.ui.slider(L.controls, { label: "加速電壓 V", min: 8, max: 100, step: 0.5, value: 35, unit: "kV", digits: 1, onInput: ch });
    const sI = PL.ui.slider(L.controls, { label: "管電流 I（燈絲加熱）", min: 2, max: 40, step: 1, value: 20, unit: "mA", digits: 0, onInput: ch });
    const chip = PL.ui.chipGroup(L.controls, { value: "Mo", options: [{ value: "W", label: "鎢靶 W" }, { value: "Mo", label: "鉬靶 Mo" }, { value: "Cu", label: "銅靶 Cu" }], onChange: v => { tg = v; ch(); } });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釘選目前光譜", () => { const V = sV.get(), I = sI.get(), key = tg; pinned = { f: l => S(l, V, I, key), lab: TGT[key].n + " " + V + " kV" }; draw(); });
    PL.ui.button(row, "清除釘選", () => { pinned = null; draw(); });
    const set = (key, V) => { tg = key; chip.set(key); sV.set(V); ch(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "鉬靶 35 kV", apply: () => set("Mo", 35) },
      { label: "電壓加倍", hint: "先釘選，再按這個比較", apply: () => set(tg, Math.min(100, sV.get() * 2)) },
      { label: "換銅靶（同電壓）", apply: () => set("Cu", sV.get()) },
      { label: "鎢靶 60 kV（未達門檻）", apply: () => set("W", 60) }, { label: "鎢靶 90 kV", apply: () => set("W", 90) }] });
    PL.ui.note(L.controls, "截止波長只看電壓（eV = hc/λmin），與靶材無關；特性峰的位置只看靶材，與電壓無關，但電壓要超過 K 層門檻才出現；管電流只改變強度。先「釘選」再改電壓或靶材，就能比較兩條光譜。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rLm = PL.ui.readout(L.readouts, { label: "截止波長 λmin = 1.24/V", unit: "nm" });
    const rE = PL.ui.readout(L.readouts, { label: "光子最大能量 eV", unit: "keV" });
    const rKa = PL.ui.readout(L.readouts, { label: "靶材 Kα 波長", unit: "nm" });
    const rVk = PL.ui.readout(L.readouts, { label: "K 層門檻電壓", unit: "kV" });
    const rI = PL.ui.readout(L.readouts, { label: "總強度（相對，∝ IZV²）" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "電子動能 eV", unit: "×10⁻¹⁵ J" }, { label: "截止波長 λmin", unit: "×10⁻¹¹ m" },
      { label: "反推 h = eVλmin / c", unit: "×10⁻³⁴ J·s", hint: "由截止波長求普朗克常數" }]);
    PL.ui.causality(L.canvasWrap.parentNode, { title: "誰決定光譜的哪一部分", rows: [
      { name: "加速電壓 V", tone: "a", note: "決定 λmin（連續譜的左端）。與靶材無關。" },
      { name: "靶材", tone: "b", note: "決定特性峰的位置（內層電子能階差）。與電壓無關，但 V 要超過門檻。" },
      { name: "管電流 I", tone: "c", note: "電子越多，整條光譜等比例變高；λmin 與峰的位置都不動。" }] });
    const gV = PL.ui.handle(cv, relGrip(sV, 0.4, "高壓電源旋鈕（上下拖改 V）"));
    const gI = PL.ui.handle(cv, relGrip(sI, 0.25, "燈絲電源旋鈕（上下拖改管電流）"));
    const gLm = PL.ui.handle(cv, { slider: sV, label: "截止波長 λmin（左右拖）", toValue: x => geo ? 1.24 / Math.max(0.0124, geo.inv(x)) : sV.get() });
    function step(dt) {
      acquire(dt);
      const n = pois(dt * sI.get() * 1.6 * Math.sqrt(sV.get() / 35));
      for (let i = 0; i < n; i++) xr.push({ a: Math.PI / 2 + (Math.random() - 0.6) * 0.5, age: 0 });
      xr.forEach(p => p.age += dt); xr = xr.filter(p => p.age < 1.2);
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock ? clock.t : 0, k = PL.clamp(W / 860, 0.62, 1.2), V = sV.get(), I = sI.get(), g = TGT[tg], lm = lmin();
      AP.labRoom(ctx, W, H, H - 14);
      const LW = Math.round(W * 0.53), cyT = Math.round(H * 0.25), hh = Math.round(H * 0.13), ax = Math.round(LW * 0.66), dy0 = Math.round(cyT + hh + H * 0.2);
      // 管身與支架
      AP.steel(ctx, 60, cyT + hh, 10, H - 14 - cyT - hh); AP.steel(ctx, LW - 40, cyT + hh, 10, H - 14 - cyT - hh);
      glass(ctx, 14, cyT - hh, LW - 22, 2 * hh, hh);
      D.text(ctx, "X 射線管（真空）", 24, cyT - hh - 6, { color: PL.col("text"), size: 10.5 * k, weight: "700" });
      // 陰極：燈絲（亮度隨管電流）＋聚焦杯
      AP.steel(ctx, 26, cyT - 20, 18, 40);
      const fg = 0.35 + I / 40 * 0.65;
      ctx.strokeStyle = `rgba(255,${120 + I * 2},60,${fg})`; ctx.lineWidth = 2; ctx.shadowColor = "#ffa040"; ctx.shadowBlur = 4 + I / 3; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = cyT - 10 + i * 2.5; i ? ctx.lineTo(46 + (i % 2) * 4, yy) : ctx.moveTo(46, yy); } ctx.stroke(); ctx.shadowBlur = 0;
      D.text(ctx, "燈絲（陰極）", 30, cyT + 36, { color: PL.col("text-dim"), size: 10 * k });
      // 陽極：銅棒＋斜面靶
      const cg = ctx.createLinearGradient(0, cyT - 12, 0, cyT + 12); cg.addColorStop(0, "rgb(222,150,100)"); cg.addColorStop(0.5, "rgb(184,110,64)"); cg.addColorStop(1, "rgb(130,72,40)");
      ctx.fillStyle = cg; ctx.fillRect(ax, cyT - 14, LW - 8 - ax, 28);
      ctx.fillStyle = g.c; ctx.beginPath(); ctx.moveTo(ax, cyT - 14); ctx.lineTo(ax + 10, cyT - 14); ctx.lineTo(ax - 4, cyT + 14); ctx.lineTo(ax - 14, cyT + 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(40,40,40,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      D.text(ctx, g.n + "靶（陽極）", ax + 34, cyT - 22, { color: PL.col("text"), size: 10.5 * k, align: "center", weight: "700" });
      // 電子流：速率 ∝ √V、密度 ∝ I
      AP.flowDots(ctx, [{ x: 54, y: cyT }, { x: ax - 6, y: cyT }], t, 80 + 200 * Math.sqrt(V / 100), { color: "rgba(80,160,255,0.95)", gap: PL.clamp(34 - I * 0.7, 8, 34), r: 2.4 });
      D.text(ctx, "e⁻ 被電壓 V 加速", (54 + ax) / 2, cyT - 12, { color: "#2f7fd0", size: 10 * k, align: "center" });
      D.disc(ctx, ax - 6, cyT + 2, 5 + 2 * Math.sin(t * 20), { fill: "rgba(255,240,180,0.9)", glow: "#ffe08a", glowSize: 14 });
      // X 射線：從靶面往下射出，穿過鈹窗到偵測器
      ctx.save(); ctx.strokeStyle = PL.theme.isLight() ? "rgba(130,50,190,0.85)" : "rgba(210,150,255,0.9)"; ctx.lineWidth = 1.6;
      xr.forEach(p => {
        const d = 8 + p.age * 240, ca = Math.cos(p.a), sa = Math.sin(p.a); if (cyT + 2 + (d + 16) * sa > dy0 - 16) return;
        ctx.beginPath();
        for (let s = 0; s <= 16; s += 2) { const dd = d + s, o = 2.5 * Math.sin(dd * 0.9); const x = ax - 6 + dd * ca - o * sa, y = cyT + 2 + dd * sa + o * ca; s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      });
      ctx.restore();
      ctx.fillStyle = "rgba(200,210,220,0.85)"; ctx.fillRect(ax - 34, cyT + hh - 3, 40, 5);
      D.text(ctx, "鈹窗", ax - 40, cyT + hh + 4, { color: PL.col("text-dim"), size: 9.5 * k, align: "right" });
      D.text(ctx, "X 射線", ax + 14, (cyT + hh + dy0) / 2, { color: PL.theme.isLight() ? "#7a2fb0" : "#d2a0ff", size: 10.5 * k, weight: "700" });
      // 偵測器（晶體分光計）→ 右側光譜
      AP.rrPath(ctx, ax - 50, dy0 - 16, 80, 30, 5); ctx.fillStyle = "rgb(70,80,96)"; ctx.fill(); PL.theme.note(ctx, "rgb(70,80,96)", ax - 50, dy0 - 16, 80, 30);
      D.text(ctx, "偵測器", ax - 10, dy0 + 4, { color: "#e8eef6", size: 10.5 * k, align: "center", weight: "700" });
      D.arrow(ctx, ax + 32, dy0 - 1, LW + 6, dy0 - 1, { color: PL.col("text-dim"), width: 1.5, head: 7 });
      // 電源：高壓（旋鈕＝電壓）、燈絲（旋鈕＝管電流）
      const pw = Math.min(150, (LW - 40) / 2), py = H - 14 - 64, p1 = 14, p2 = 24 + pw;
      AP.cable(ctx, [{ x: p1 + pw - 36, y: py + 45 }, { x: LW - 30, y: py - 10 }, { x: LW - 16, y: cyT + 10 }], "rgb(214,52,44)", 2.2, 6);
      AP.cable(ctx, [{ x: p1 + pw - 17, y: py + 45 }, { x: 20, y: py - 24 }, { x: 22, y: cyT + 16 }], "rgb(40,40,44)", 2.2, 6);
      AP.cable(ctx, [{ x: p2 + pw - 36, y: py + 49 }, { x: 34, y: py - 34 }, { x: 34, y: cyT + 20 }], "rgb(230,170,40)", 1.8, 6);
      AP.powerSupply(ctx, p1, py, pw, 58, V.toFixed(1) + " kV", { knob: (V - 8) / 92, label: "高壓電源 V" });
      AP.powerSupply(ctx, p2, py + 4, pw, 54, I + " mA", { knob: (I - 2) / 38, label: "燈絲電源（管電流）", color: "rgb(130,230,255)" });
      const kn = (x, h) => ({ x: x + pw - 11 - Math.max(5, Math.min(10, h * 0.15)), y: Math.max(12, Math.min(24, h * 0.36)) / 2 + 10 });
      const k1 = kn(p1, 58), k2 = kn(p2, 54);
      gV.place(k1.x, py + k1.y); gI.place(k2.x, py + 4 + k2.y);

      // ---------- 光譜 ----------
      const x0 = LW + 10, w0 = W - x0 - 10;
      AP.infoCard(ctx, x0, 10, w0, H - 24);
      const box = { x: x0 + 34, y: 52, w: w0 - 48, h: H - 24 - 98 };
      let ymax = 0; for (let i = 0; i <= 400; i++) ymax = Math.max(ymax, S(i / 400 * X1, V, 40, tg), pinned ? pinned.f(i / 400 * X1) : 0);
      const G = PL.graph(cv, box, { x0: 0, x1: X1, y0: 0, y1: ymax * 1.08 });
      G.frame({ ticks: false, xlabel: "λ (nm)", ylabel: "強度" }); G.grid(5, 4);
      geo = { inv: x => (x - box.x) / box.w * X1 };
      D.text(ctx, "X 射線光譜（偵測器即時累積）", x0 + 12, 30, { color: PL.col("text"), size: 11.5 * k, weight: "700" });
      [0, 0.05, 0.1, 0.15, 0.2, 0.25].forEach(l => D.text(ctx, l === 0 ? "0" : l.toFixed(2), G.X(l), box.y + box.h + 13, { color: PL.col("text-dim"), size: 9 * k, align: "center" }));
      const sc = T > 0 ? 1 / (T * KC * BW) : 0;
      ctx.fillStyle = PL.theme.isLight() ? "rgba(120,60,190,0.6)" : "rgba(190,140,255,0.62)";
      for (let i = 0; i < NB; i++) { const v = Math.min(counts[i] * sc, ymax * 1.08); if (v > 0) { const y = G.Y(v); ctx.fillRect(G.X(i * BW), y, G.X(BW) - G.X(0) - 0.4, box.y + box.h - y); } }
      if (pinned) { G.fn(pinned.f, { color: PL.col("text-dim"), width: 1.5, dash: [5, 4], samples: 600 }); }
      G.fn(l => S(l, V, I, tg), { color: PL.col("accent"), width: 1.3, samples: 600 });
      G.vline(lm, { color: "#d9463b", width: 1.5, dash: [3, 3] });
      D.text(ctx, "λmin = " + lm.toFixed(4) + " nm", G.X(lm) + 4, box.y + 14, { color: "#d9463b", size: 10.5 * k, weight: "700" });
      gLm.place(G.X(lm), box.y + box.h - 12);
      [["Kα", g.ka], ["Kβ", g.kb]].forEach(([nm, l], i) => {
        const x = G.X(l);
        if (V > g.vk) D.text(ctx, nm, x + (i ? -3 : 3), G.Y(S(l, V, I, tg)) - 4 < box.y + 12 ? box.y + 28 + i * 13 : G.Y(S(l, V, I, tg)) - 4, { color: PL.col("text"), size: 10.5 * k, weight: "700", align: i ? "right" : "left" });
        else { D.line(ctx, x, box.y + box.h * 0.35, x, box.y + box.h, PL.col("text-faint"), 1, [2, 3]); if (!i) D.text(ctx, "Kα（需 V > " + g.vk + " kV）", x + 3, box.y + box.h * 0.35 - 4, { color: PL.col("text-dim"), size: 9.5 * k }); }
      });
      if (pinned) D.text(ctx, "虛線：釘選的 " + pinned.lab, box.x + box.w, box.y + 14, { color: PL.col("text-dim"), size: 9.5 * k, align: "right" });
      D.text(ctx, "eV = hc/λmin ⇒ λmin(nm) = 1.24 / V(kV)", x0 + 12, H - 24, { color: PL.col("text"), size: 10.5 * k, weight: "700" });

      rLm.set(lm, 4); rE.set(V, 1); rKa.set(g.ka, 4); rVk.set(g.vk, 2); rI.set(I * g.Z * V * V / (20 * 42 * 35 * 35) * 100, 0);
      const eV = 1.602e-19 * V * 1e3, lmM = lm * 1e-9;
      dv.set(0, eV * 1e15, 3); dv.set(1, lmM * 1e11, 3); dv.set(2, eV * lmM / 2.998e8 * 1e34, 3);
      vd.set(V > g.vk ? "V = " + V + " kV > " + g.vk + " kV：" + g.n + "的 Kα（" + g.ka + " nm）、Kβ 特性峰出現；λmin = " + lm.toFixed(4) + " nm" : "V 未達" + g.n + "的 K 層門檻 " + g.vk + " kV：只有連續譜，λmin = " + lm.toFixed(4) + " nm", V > g.vk ? "ok" : "warn");
    }
    reset();
    clock = PL.motion.clock(dt => { step(Math.min(dt, 0.05)); draw(); }, { ambient: true });
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* ================================================================
     質能守恆：核子天平與每核子結合能曲線
     左盤放分開的質子與中子，右盤放結合好的原子核——右盤比較輕，少掉的 Δm 就是結合能 E = Δmc²。
     把右盤的原子核往上拉開（要外加能量），質量就慢慢補回來；選「分裂／融合」看反應前後誰重。
     ================================================================ */
  const MP = 1.007276, MN = 1.008665, MH = 1.007825, ME = 0.000549, U = 931.494;
  // [名稱, 符號, Z, A, 原子質量 u]
  const NUC = [["氘", "H", 1, 2, 2.014102], ["氚", "H", 1, 3, 3.016049], ["氦-3", "He", 2, 3, 3.016029], ["氦-4", "He", 2, 4, 4.002603], ["鋰-6", "Li", 3, 6, 6.015123], ["鋰-7", "Li", 3, 7, 7.016003],
    ["碳-12", "C", 6, 12, 12], ["氧-16", "O", 8, 16, 15.994915], ["氖-20", "Ne", 10, 20, 19.99244], ["鈣-40", "Ca", 20, 40, 39.962591], ["鐵-56", "Fe", 26, 56, 55.934936], ["鎳-62", "Ni", 28, 62, 61.928345],
    ["氪-92", "Kr", 36, 92, 91.926156], ["鋇-141", "Ba", 56, 141, 140.914411], ["鉛-208", "Pb", 82, 208, 207.976652], ["鈾-235", "U", 92, 235, 235.04393], ["鈾-238", "U", 92, 238, 238.050788]];
  const BE = i => { const [, , Z, A, M] = NUC[i]; return (Z * MH + (A - Z) * MN - M) * U; };   // 結合能（MeV）
  // 反應：左盤（反應前）、右盤（反應後）；"n" 為中子
  const RX = { fis: { l: [15, "n"], r: [13, 12, "n", "n", "n"], eq: "²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n" }, fus: { l: [0, 1], r: [3, "n"], eq: "²H + ³H → ⁴He + n" } };
  PL.register("mass-energy", { build(root) {
    const AP = ap();
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6, 900);
    let mode = "one", clock = null, geo = null, gam = [], lastSep = 0, stripT0 = 0;
    const tilt = PL.motion.follower(0, { omega: 3.2, zeta: 0.16 });
    PL.ui.section(L.controls, "原子核");
    const sIdx = PL.ui.slider(L.controls, { label: "原子核", min: 0, max: NUC.length - 1, step: 1, value: 3, fmt: v => (NUC[PL.clamp(Math.round(v), 0, NUC.length - 1)] || NUC[0])[0], onInput: () => draw() });
    const sSep = PL.ui.slider(L.controls, { label: "把原子核拆開（外加能量）", min: 0, max: 100, step: 1, value: 0, unit: "%", digits: 0, onInput: () => draw() });
    const chip = PL.ui.chipGroup(L.controls, { value: "one", options: [{ value: "one", label: "單一原子核" }, { value: "fis", label: "鈾-235 分裂" }, { value: "fus", label: "氘氚融合" }], onChange: v => { mode = v; stripT0 = clock ? clock.t : 0; draw(); } });
    const go = (m, i) => { mode = m; stripT0 = clock ? clock.t : 0; chip.set(m); if (i != null) { sIdx.set(i); sSep.set(0); } draw(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "氦-4（α 粒子）", apply: () => go("one", 3) }, { label: "鐵-56（最穩定附近）", apply: () => go("one", 10) },
      { label: "鈾-235", apply: () => go("one", 15) }, { label: "²³⁵U 分裂放多少能？", apply: () => go("fis") }, { label: "²H + ³H 融合放多少能？", apply: () => go("fus") }] });
    PL.ui.note(L.controls, "1 u 的質量相當於 931.5 MeV。原子核比組成它的核子輕，少掉的質量就是結合能。分裂與融合都是往「每核子結合能曲線」的高處走，所以都放能。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rL = PL.ui.readout(L.readouts, { label: "左盤質量", unit: "u" });
    const rR = PL.ui.readout(L.readouts, { label: "右盤質量", unit: "u" });
    const rDm = PL.ui.readout(L.readouts, { label: "質量差 Δm", unit: "u" });
    const rE = PL.ui.readout(L.readouts, { label: "E = Δm × 931.5", unit: "MeV" });
    const rBA = PL.ui.readout(L.readouts, { label: "每核子結合能 B/A", unit: "MeV" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "質量虧損 Δm（完全結合）", unit: "u" }, { label: "結合能／放出能量", unit: "MeV", hint: "E = Δmc²，1 u ↔ 931.5 MeV" },
      { label: "每核子結合能 B/A 變化", hint: "往曲線高處走就放能" }]);
    const cz = PL.ui.causality(L.canvasWrap.parentNode, { title: "質量與能量怎麼互換", rows: [
      { name: "核子結合", tone: "a", note: "質量變小，少掉的 Δm 以能量（γ 射線、動能）放出。" },
      { name: "把核拆開", tone: "b", note: "要外加結合能 B，質量才會補回核子總和。" },
      { name: "核反應", tone: "c", note: "產物的平均 B/A 較大 ⇒ 反應後總質量較小 ⇒ 放能。分裂、融合都是。" }] });
    const gIdx = PL.ui.handle(cv, { slider: sIdx, label: "曲線上的原子核（左右拖換核種）",
      toValue: x => { if (!geo) return sIdx.get(); const A = geo.invA(x); let b = 0; NUC.forEach((n, i) => { if (Math.abs(n[3] - A) < Math.abs(NUC[b][3] - A)) b = i; }); return b; } });
    const gSep = PL.ui.handle(cv, relGrip(sSep, 0.7, "右盤的原子核（往上拉＝拆開）"));
    // 一盤的內容：原子核（核子堆）或單顆中子；回傳 { mass, items }
    const pan = list => list.map(it => it === "n" ? { m: MN, A: 1, Z: 0, n: true } : { m: NUC[it][4] - NUC[it][2] * ME, A: NUC[it][3], Z: NUC[it][2], s: NUC[it][1] });
    function step(dt) {
      const s = sSep.get();
      if (mode === "one" && s < lastSep - 0.5) for (let i = 0; i < 3; i++) gam.push({ a: Math.random() * TAU, age: 0 });
      lastSep = s; gam.forEach(g => g.age += dt); gam = gam.filter(g => g.age < 1);
      draw(dt);
    }
    // 上方的小動畫：結合放出 γ／中子撞鈾核分裂／氘氚融合（換模式時演一次，演完停在結果）
    function strip(ctx, x, y, w, h, t, k) {
      AP.infoCard(ctx, x, y, w, h);
      ctx.save(); AP.rrPath(ctx, x, y, w, h, 7); ctx.clip();
      const p = Math.min(0.999, Math.max(0, t - stripT0) / 3.2), cx = x + w * 0.62, cy = y + h * 0.58, fl = (a, b) => p > a && p < b;
      if (mode === "one") {
        const i = PL.clamp(Math.round(sIdx.get()), 0, NUC.length - 1), Z = NUC[i][2], A = NUC[i][3], m = Math.min(A, 14), u = Math.min(1, p / 0.45);
        for (let j = 0; j < m; j++) { const a = j * 2.4, r = (1 - u) * h * 0.4 + 5 * Math.sqrt(j / m) * 1.6; ball(ctx, cx + r * Math.cos(a) * 1.6, cy + r * Math.sin(a), 5, j < Math.round(m * Z / A) ? P_RGB : N_RGB); }
        if (fl(0.45, 0.85)) { D.ring(ctx, cx, cy, 10 + (p - 0.45) * 160, "rgba(255,210,110," + (0.85 - p).toFixed(2) + ")", 2); D.text(ctx, "γ：E = Δmc²", cx + 30, cy - 10, { color: "#e39400", size: 11 * k, weight: "700" }); }
      } else if (mode === "fis") {
        const hit = Math.min(1, p / 0.3);
        if (p < 0.3) ball(ctx, cx - 90 + 90 * hit, cy, 4, N_RGB);
        if (p < 0.42) ball(ctx, cx, cy, 13 + (p > 0.3 ? 2 * Math.sin(p * 120) : 0), [140, 200, 90]);
        else { const s = (p - 0.42) * 120; ball(ctx, cx - s, cy - s * 0.25, 11, [230, 160, 80]); ball(ctx, cx + s, cy + s * 0.2, 9.5, [120, 170, 240]); [-0.6, 0.4, 1.6].forEach(a => ball(ctx, cx + s * 1.5 * Math.cos(a), cy + s * 0.8 * Math.sin(a), 3.5, N_RGB)); if (fl(0.42, 0.6)) D.ring(ctx, cx, cy, (p - 0.42) * 200, "rgba(255,230,140,0.8)", 2); }
      } else {
        const s = Math.min(1, p / 0.4);
        if (p < 0.4) { ball(ctx, cx - 70 * (1 - s) - 6, cy, 6, [230, 120, 110]); ball(ctx, cx + 70 * (1 - s) + 6, cy, 7, [230, 140, 90]); }
        else { const q = (p - 0.4) * 110; ball(ctx, cx - q * 0.4, cy, 8, [240, 190, 90]); ball(ctx, cx + q, cy - q * 0.15, 3.5, N_RGB); if (fl(0.4, 0.6)) D.ring(ctx, cx, cy, (p - 0.4) * 200, "rgba(255,230,140,0.8)", 2); }
      }
      ctx.restore();
    }
    function drawPan(ctx, items, cx, py, pw, sep, t, hits) {
      // 把盤上的東西排開：核子堆依序放，中子單顆放；sep>0 時核子由堆散成格子
      let x = cx - pw / 2 + 8; const res = [];
      items.forEach((it, j) => {
        if (it.n) { ball(ctx, x + 4, py - 5, 4, N_RGB); x += 11; return; }
        const br = it.A > 100 ? 2.3 : it.A > 40 ? 3.2 : it.A > 10 ? 4.6 : 6.5, R = 1.16 * br * Math.cbrt(it.A);
        const bx = items.length > 1 ? x + R : cx, by = py - R - 2 - sep * 6;
        const cols = Math.max(4, Math.floor((pw - 10) / (2 * br + 1))), cl = cluster(it.A, it.Z, br, 0.6 + t * 0.2 + j, 0.4);
        cl.forEach((b, q) => {
          const gx = cx - pw / 2 + 6 + br + (q % cols) * (2 * br + 1), gy = py - br - 2 - Math.floor(q / cols) * (2 * br + 1);
          const jx = Math.sin(t * 9 + q) * 0.4;
          ball(ctx, bx + b.x + (gx - bx - b.x) * sep + jx, by + b.y + (gy - by - b.y) * sep, br, b.p ? P_RGB : N_RGB);
        });
        res.push({ x: bx, y: by, R }); x += 2 * R + 6;
      });
      if (hits) hits.push(...res);
    }
    function draw(dt) {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock ? clock.t : 0, k = PL.clamp(W / 860, 0.62, 1.2), i = PL.clamp(Math.round(sIdx.get()), 0, NUC.length - 1), sep = mode === "one" ? sSep.get() / 100 : 0, nuc = NUC[i];
      AP.labRoom(ctx, W, H, H - 14);
      const LW = Math.round(W * 0.55);
      // 兩盤內容與質量
      let left, right, lm, rm, eq, bA, bB;
      if (mode === "one") {
        const Z = nuc[2], N = nuc[3] - Z;
        left = [{ A: Z, Z, sepd: true }, { A: N, Z: 0, sepd: true }]; lm = Z * MP + N * MN; rm = nuc[4] - Z * ME + sep * (lm - (nuc[4] - Z * ME));
        eq = Z + " p + " + N + " n → " + sup(nuc[3]) + nuc[1] + " + " + BE(i).toFixed(1) + " MeV";
        bA = 0; bB = BE(i) / nuc[3];
      } else {
        const R = RX[mode], a = pan(R.l), b = pan(R.r), sb = l => l.reduce((s, it) => s + (it === "n" ? 0 : BE(it)), 0);
        left = a; right = b; lm = a.reduce((s, x) => s + x.m, 0); rm = b.reduce((s, x) => s + x.m, 0); eq = R.eq;
        const An = a.reduce((s, x) => s + x.A, 0); bA = sb(R.l) / An; bB = sb(R.r) / An;
      }
      const dm = lm - rm, full = mode === "one" ? lm - (nuc[4] - nuc[2] * ME) : dm;
      // 上方：反應式＋小動畫
      const sh = Math.round(H * 0.2);
      strip(ctx, 10, 10, LW - 14, sh, t, k);
      D.text(ctx, mode === "one" ? "核子結合" : mode === "fis" ? "核分裂" : "核融合", 20, 28, { color: PL.col("text"), size: 11.5 * k, weight: "700" });
      D.text(ctx, eq, 20, 28 + 18 * k, { color: PL.col("text"), size: 11 * k });
      D.text(ctx, (mode === "one" ? "放出 " : "Q = ") + (full * U).toFixed(mode === "fus" ? 2 : 1) + " MeV", 20, 28 + 36 * k, { color: "#e39400", size: 11 * k, weight: "700" });
      // 天平：支柱、橫樑（傾角放大顯示）、吊盤
      const bx = LW / 2, base = H - 14, pyv = sh + 10 + Math.round((H - sh) * 0.16), bl = LW * 0.3;
      const target = PL.clamp(dm / lm * 25, -0.18, 0.18), th = tilt.update(target, dt || 0, clock && clock.running);
      AP.steel(ctx, bx - 5, pyv, 10, base - pyv - 10); AP.steel(ctx, bx - 40, base - 12, 80, 12, -10);
      const Lx = bx - bl * Math.cos(th), Ly = pyv + bl * Math.sin(th), Rx = bx + bl * Math.cos(th), Ry = pyv - bl * Math.sin(th);
      ctx.save(); ctx.strokeStyle = PL.theme.isLight() ? "rgb(90,96,110)" : "rgb(180,188,200)"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(Lx, Ly); ctx.lineTo(Rx, Ry); ctx.stroke(); ctx.restore();
      ap().brassDisc ? ap().brassDisc(ctx, bx, pyv, 5) : D.disc(ctx, bx, pyv, 5, { fill: "#c8a050" });
      // 指針與刻度：指出哪一邊重
      D.line(ctx, bx, pyv, bx + 46 * Math.sin(th), pyv + 46 * Math.cos(th), "#d9463b", 2);
      ctx.save(); ctx.strokeStyle = PL.col("text-dim"); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, pyv, 50, Math.PI / 2 - 0.3, Math.PI / 2 + 0.3); ctx.stroke(); ctx.restore();
      const hang = (H - pyv) * 0.42, pw = bl * 0.86, hits = [];
      [[Lx, Ly, left, "左盤：" + (mode === "one" ? "分開的質子＋中子" : "反應前"), lm], [Rx, Ry, right, "右盤：" + (mode === "one" ? "結合成原子核" : "反應後"), rm]].forEach(([x, y, items, lab, m], s) => {
        const py = y + hang;
        D.line(ctx, x, y, x - pw / 2 + 4, py, PL.col("text-dim"), 1); D.line(ctx, x, y, x + pw / 2 - 4, py, PL.col("text-dim"), 1);
        AP.steel(ctx, x - pw / 2, py, pw, 5, 10);
        if (mode === "one" && s === 0) {
          // 左盤：質子與中子分開排成格子
          const Z = nuc[2], A = nuc[3], br = A > 100 ? 2.3 : A > 40 ? 3.2 : A > 10 ? 4.6 : 6.5, cols = Math.max(4, Math.floor((pw - 10) / (2 * br + 1)));
          for (let q = 0; q < A; q++) ball(ctx, x - pw / 2 + 6 + br + (q % cols) * (2 * br + 1), py - br - 2 - Math.floor(q / cols) * (2 * br + 1), br, q < Z ? P_RGB : N_RGB);
        } else if (mode === "one") drawPan(ctx, [{ A: nuc[3], Z: nuc[2] }], x, py, pw, sep, t, hits);
        else drawPan(ctx, items, x, py, pw, 0, t, null);
        D.text(ctx, lab, x, py + 18, { color: PL.col("text"), size: 10.5 * k, align: "center", weight: "700" });
        D.text(ctx, m.toFixed(mode === "one" && nuc[3] < 10 ? 5 : 4) + " u", x, py + 18 + 15 * k, { color: PL.col("text-dim"), size: 10.5 * k, align: "center" });
      });
      if (mode === "one" && hits[0]) {
        const h0 = hits[0]; gSep.place(Rx, Ry + hang - h0.R * 2 - 18 - sep * 30);
        gam.forEach(g => { const r = h0.R + 6 + g.age * 70; D.line(ctx, Rx + r * Math.cos(g.a), Ry + hang - h0.R + r * Math.sin(g.a), Rx + (r + 10) * Math.cos(g.a), Ry + hang - h0.R + (r + 10) * Math.sin(g.a), "rgba(255,190,60," + (1 - g.age).toFixed(2) + ")", 2); });
        if (sep > 0.01) D.text(ctx, "已外加 " + (sep * full * U).toFixed(1) + " MeV", Rx, Ry + hang - h0.R * 2 - 40 - sep * 30, { color: "#e39400", size: 10.5 * k, align: "center", weight: "700" });
      } else gSep.hide();
      D.text(ctx, "（傾斜程度放大顯示）", bx + 10, pyv + 64, { color: PL.col("text-faint"), size: 9 * k });

      // ---------- 每核子結合能曲線 ----------
      const x0 = LW + 8, w0 = W - x0 - 10;
      AP.infoCard(ctx, x0, 10, w0, H - 24);
      const box = { x: x0 + 34, y: 44, w: w0 - 46, h: H - 24 - 90 };
      const G = PL.graph(cv, box, { x0: 0, x1: 240, y0: 0, y1: 10 });
      G.frame({ xlabel: "質量數 A", ylabel: "B/A (MeV)" }); G.grid(4, 4);
      geo = { invA: x => (x - box.x) / box.w * 240 };
      D.text(ctx, "每核子結合能曲線", x0 + 12, 30, { color: PL.col("text"), size: 11.5 * k, weight: "700" });
      // 半經驗質量公式畫平滑曲線（A ≥ 10），輕核用實測點
      G.fn(A => { if (A < 10) return NaN; const Z = A / (1.98 + 0.0155 * Math.pow(A, 2 / 3)); return (15.75 * A - 17.8 * Math.pow(A, 2 / 3) - 0.711 * Z * (Z - 1) / Math.cbrt(A) - 23.7 * (A - 2 * Z) ** 2 / A) / A; }, { color: PL.col("text-dim"), width: 1.6, samples: 230 });
      NUC.forEach((n, j) => G.dot(n[3], BE(j) / n[3], { r: 3, color: PL.col("text-dim") }));
      [[3, "⁴He", 6, -6], [0, "²H", 6, 4], [10, "⁵⁶Fe", -10, -10], [15, "²³⁵U", -16, -8]].forEach(([j, s, dx, dy]) => G.label(NUC[j][3], BE(j) / NUC[j][3], s, { dx, dy, color: PL.col("text"), size: 10 * k }));
      D.text(ctx, "鐵、鎳附近最高 → 最穩定", G.X(58), G.Y(9.3), { color: "#d9463b", size: 10 * k, align: "center", weight: "700" });
      const arrow = (a, b, c) => D.arrow(ctx, G.X(NUC[a][3]), G.Y(BE(a) / NUC[a][3]), G.X(NUC[b][3]), G.Y(BE(b) / NUC[b][3]), { color: c, width: 2.2, head: 8 });
      if (mode === "fis") { arrow(15, 13, "#e39400"); arrow(15, 12, "#e39400"); D.text(ctx, "分裂：往高處走 → 放能", G.X(150), G.Y(6.3), { color: "#e39400", size: 10.5 * k, weight: "700", align: "center" }); }
      else if (mode === "fus") { arrow(0, 3, "#e39400"); arrow(1, 3, "#e39400"); D.text(ctx, "← 融合：往高處走 → 放能", G.X(10), G.Y(4.6), { color: "#e39400", size: 10.5 * k, weight: "700" }); }
      if (mode === "one") { G.dot(nuc[3], bB, { r: 6, color: "#d9463b", glow: "#d9463b" }); gIdx.place(G.X(nuc[3]), G.Y(bB)); G.label(nuc[3], bB, nuc[0] + "：" + bB.toFixed(2) + " MeV", { dx: nuc[3] > 150 ? -24 : 22, dy: 26, color: "#d9463b", size: 10.5 * k, align: nuc[3] > 150 ? "right" : "left" }); }
      else gIdx.hide();
      D.text(ctx, "E = Δmc²，1 u ↔ 931.5 MeV", x0 + 12, H - 24, { color: PL.col("text"), size: 10.5 * k, weight: "700" });

      rL.set(lm, 5); rR.set(rm, 5); rDm.set(dm, 5); rE.set(dm * U, 2); rBA.set(bB, 3);
      dv.set(0, full, 5); dv.set(1, full * U, 2); dv.set(2, bA.toFixed(2) + " → " + bB.toFixed(2) + " MeV");
      cz.set(0, mode === "one" ? "−" + full.toFixed(4) + " u → +" + (full * U).toFixed(1) + " MeV" : "—");
      cz.set(1, mode === "one" ? "已拆開 " + Math.round(sep * 100) + "%：補回 " + (sep * full).toFixed(4) + " u" : "—");
      cz.set(2, mode === "one" ? "—" : "B/A " + bA.toFixed(2) + " → " + bB.toFixed(2) + " MeV");
      vd.set(mode === "one" ? nuc[0] + "：Δm = " + full.toFixed(4) + " u → 結合能 " + (full * U).toFixed(1) + " MeV（每核子 " + bB.toFixed(2) + " MeV）" + (i === 10 || i === 11 ? "，接近曲線最高點" : "")
        : (mode === "fis" ? "分裂" : "融合") + "：平均每核子結合能 " + bA.toFixed(2) + " → " + bB.toFixed(2) + " MeV，質量少了 " + dm.toFixed(4) + " u，放出 " + (dm * U).toFixed(1) + " MeV", "ok");
    }
    clock = PL.motion.clock(dt => step(Math.min(dt, 0.05)), { ambient: true });
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* ================================================================
     核分裂連鎖反應與控制棒
     反應爐剖面：鈾-235 燃料、水（減速劑）、從上方插入的控制棒。射入一個中子後，
     每個中子的命運依機率決定：引發分裂（放出 2 或 3 個中子）、被控制棒吸收、或逃出爐心。
     k = ν × P(分裂)，ν = 2.5；右側統計每一代的中子數，看它是熄滅、持平還是爆增。
     ================================================================ */
  PL.register("nuclear-chain-reaction", { build(root) {
    const AP = ap();
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6, 900);
    const NU = 2.5, CAP = 140;
    let clock = null, nuc = [], ns = [], frags = [], fl = [], gen = [], fis = 0, started = false, geo = null;
    PL.ui.section(L.controls, "反應爐");
    const sRod = PL.ui.slider(L.controls, { label: "控制棒插入深度", min: 0, max: 100, step: 1, value: 50, unit: "%", digits: 0, onInput: () => draw() });
    const sW = PL.ui.slider(L.controls, { label: "減速劑（水）水位", min: 0, max: 100, step: 1, value: 100, unit: "%", digits: 0, onInput: () => draw() });
    PL.ui.button(PL.ui.buttonRow(L.controls), "射入一個中子", () => inject(), { primary: true, trigger: true });
    const fmod = () => 0.3 + 0.7 * sW.get() / 100, pFis = () => 0.9 * fmod() * (1 - 0.75 * sRod.get() / 100), kOf = () => NU * pFis();
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "調到臨界 k = 1", apply: () => { const d = (1 - 1 / (NU * 0.9 * fmod())) / 0.75; if (d >= 0) sRod.set(Math.round(d * 100)); draw(); } },
      { label: "控制棒全抽出", apply: () => { sRod.set(0); draw(); } }, { label: "控制棒全插入", apply: () => { sRod.set(100); draw(); } },
      { label: "減速劑流失", hint: "沒有水把中子減速，鈾-235 很難吸收快中子", apply: () => { sW.set(0); draw(); } }] });
    PL.ui.note(L.controls, "按「射入一個中子」開始。控制棒吸收中子讓 k 變小；水把快中子減速，慢中子才容易被鈾-235 吸收。k < 1 反應熄滅，k = 1 穩定（核電廠），k > 1 越來越快。");
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rK = PL.ui.readout(L.readouts, { label: "增殖因數 k = ν × P(分裂)" });
    const rSt = PL.ui.readout(L.readouts, { label: "狀態" });
    const rG = PL.ui.readout(L.readouts, { label: "已完成的代數 g" });
    const rN = PL.ui.readout(L.readouts, { label: "該代中子數 N_g" });
    const rF = PL.ui.readout(L.readouts, { label: "累計分裂次數" });
    const rE = PL.ui.readout(L.readouts, { label: "釋放能量（每次約 200 MeV）", unit: "MeV" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "P(引發下一次分裂)", hint: "沒被控制棒吸收、沒逃出爐心" }, { label: "ν：每次分裂放出的中子", hint: "2 或 3 個，平均 2.5" }, { label: "k = ν × P", hint: "N_(g+1) = k N_g" }]);
    PL.ui.causality(L.canvasWrap.parentNode, { title: "誰控制反應快慢", rows: [
      { name: "控制棒（硼、鎘）", tone: "a", note: "吸收中子：插得越深，k 越小。" },
      { name: "減速劑（水）", tone: "b", note: "把快中子減速成熱中子，鈾-235 才容易吸收；水流失時 k 反而下降。" },
      { name: "一次分裂", tone: "c", note: "²³⁵U + n → ¹⁴¹Ba + ⁹²Kr + 3n，約放出 200 MeV。" }] });
    const gRod = PL.ui.handle(cv, { slider: sRod, label: "控制棒（上下拖）", toValue: (x, y) => geo ? (y - geo.iy0) / geo.span * 100 : sRod.get() });
    const gW = PL.ui.handle(cv, { slider: sW, label: "水位（上下拖）", toValue: (x, y) => geo ? (geo.iy1 - y) / (geo.iy1 - geo.iy0) * 100 : sW.get() });
    function layoutCore() {
      const W = cv.W, H = cv.H, LW = Math.round(W * 0.58), vt = Math.round(H * 0.16), ix0 = 30, ix1 = LW - 14, iy0 = vt + 12, iy1 = H - 34;
      const nc = 8, nr = 6, cw = (ix1 - ix0) / nc, rh = (iy1 - iy0 - 20) / nr, rods = [];
      for (let c = 1; c < nc; c += 2) rods.push(ix0 + (c + 1) * cw);
      geo = { LW, vt, ix0, ix1, iy0, iy1, cw, rods, span: iy1 - iy0 - 16 };
      if (nuc.length !== nc * nr) { nuc = []; for (let c = 0; c < nc; c++) for (let r = 0; r < nr; r++) nuc.push({ x: ix0 + (c + 0.5) * cw + ((r * 7 + c * 3) % 5 - 2) * 2, y: iy0 + 16 + (r + 0.5) * rh, split: -9 }); }
      else nuc.forEach((n, j) => { const c = Math.floor(j / nr), r = j % nr; n.x = ix0 + (c + 0.5) * cw + ((r * 7 + c * 3) % 5 - 2) * 2; n.y = iy0 + 16 + (r + 0.5) * rh; });
    }
    // 中子出生時就決定命運，然後飛向目標：k 的意義直接寫在機率上
    function spawn(x, y, g, w, force) {
      const t = clock ? clock.t : 0, d = sRod.get() / 100, f = fmod(), r = Math.random(), G = geo;
      const pL = 0.1 + 0.9 * (1 - f), pR = 0.9 * f * 0.75 * d, rodBot = G.iy0 + d * G.span;
      let fate = force ? "f" : r < pL ? "l" : r < pL + pR ? "r" : "f", tx, ty, tgt = null;
      if (fate === "r" && rodBot - G.iy0 < 6) fate = "l";
      if (fate === "f") {
        const free = nuc.filter(n => t - n.split > 2.5 && n !== force), nearby = free.filter(n => Math.hypot(n.x - x, n.y - y) < G.cw * 3 && Math.hypot(n.x - x, n.y - y) > 8);
        tgt = (nearby.length ? nearby : free.length ? free : nuc)[Math.floor(Math.random() * (nearby.length || free.length || nuc.length))]; tx = tgt.x; ty = tgt.y;
      } else if (fate === "r") { const rx = G.rods.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a); tx = rx; ty = G.iy0 + Math.random() * (rodBot - G.iy0); }
      else { const a = Math.random() * TAU, ca = Math.cos(a), sa = Math.sin(a), s = Math.min(ca > 0 ? (G.ix1 - x) / ca : ca < 0 ? (G.ix0 - x) / ca : 1e9, sa > 0 ? (G.iy1 - y) / sa : sa < 0 ? (G.iy0 - y) / sa : 1e9); tx = x + ca * s; ty = y + sa * s; }
      ns.push({ x, y, tx, ty, fate, tgt, g, w, age: 0 });
    }
    function inject() {
      if (!ns.length) { gen = []; fis = 0; frags = []; }
      if (!geo) layoutCore();
      started = true; gen[0] = (gen[0] || 0) + 1;
      spawn(geo.ix0 + 6, (geo.iy0 + geo.iy1) / 2, 0, 1, true);
      draw();
    }
    function step(dt) {
      if (!geo) return;
      const t = clock.t, f = fmod();
      ns.forEach(n => {
        // 快中子在水中慢下來（減速劑的作用），畫面上看得到速度變化
        const sp = 110 + 230 * Math.exp(-n.age * 5 * f); n.age += dt;
        const dx = n.tx - n.x, dy = n.ty - n.y, dd = Math.hypot(dx, dy), s = sp * dt;
        if (dd <= s) { n.done = true; n.x = n.tx; n.y = n.ty; } else { n.x += dx / dd * s; n.y += dy / dd * s; }
      });
      ns.filter(n => n.done).forEach(n => {
        if (n.fate === "f") {
          fis += n.w; if (n.tgt) n.tgt.split = t;
          fl.push({ x: n.x, y: n.y, age: 0 }); const a = Math.random() * TAU;
          frags.push({ x: n.x, y: n.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, age: 0, c: [230, 160, 80] }, { x: n.x, y: n.y, vx: -Math.cos(a) * 46, vy: -Math.sin(a) * 46, age: 0, c: [120, 170, 240] });
          const m = Math.random() < 0.5 ? 2 : 3, alive = ns.length;
          for (let i = 0; i < m; i++) { gen[n.g + 1] = (gen[n.g + 1] || 0) + n.w; if (alive > CAP && Math.random() < 0.5) continue; spawn(n.x, n.y, n.g + 1, alive > CAP ? n.w * 2 : n.w); }
        } else if (n.fate === "r") fl.push({ x: n.x, y: n.y, age: 0.5, rod: true });
      });
      ns = ns.filter(n => !n.done);
      frags.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt; }); frags = frags.filter(p => p.age < 0.8);
      fl.forEach(p => p.age += dt); fl = fl.filter(p => p.age < 0.6);
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      layoutCore();
      const t = clock ? clock.t : 0, k = PL.clamp(W / 860, 0.62, 1.2), G = geo, d = sRod.get() / 100, wl = sW.get() / 100, K = kOf();
      AP.labRoom(ctx, W, H, H - 12);
      // 壓力槽（鋼殼）與爐心
      AP.steel(ctx, G.ix0 - 12, G.vt, G.ix1 - G.ix0 + 24, H - 22 - G.vt, -6);
      ctx.fillStyle = PL.theme.isLight() ? "rgb(214,222,232)" : "rgb(26,34,46)"; ctx.fillRect(G.ix0, G.iy0, G.ix1 - G.ix0, G.iy1 - G.iy0);
      PL.theme.note(ctx, PL.theme.isLight() ? "rgb(214,222,232)" : "rgb(26,34,46)", G.ix0, G.iy0, G.ix1 - G.ix0, G.iy1 - G.iy0);
      const wy = G.iy1 - wl * (G.iy1 - G.iy0);
      if (wl > 0) {
        const wg = ctx.createLinearGradient(0, wy, 0, G.iy1); wg.addColorStop(0, "rgba(70,150,230,0.42)"); wg.addColorStop(1, "rgba(40,100,190,0.55)");
        ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(G.ix0, G.iy1);
        for (let x = G.ix0; x <= G.ix1; x += 6) ctx.lineTo(x, wy + 2 * Math.sin(x * 0.08 + t * 3)); ctx.lineTo(G.ix1, G.iy1); ctx.closePath(); ctx.fill();
        ap().bubbles(ctx, G.ix0, wy, G.ix1 - G.ix0, G.iy1 - wy, t, 10, { r: 1.6, speed: 24 });
      }
      // 燃料棒（鋯合金管）與鈾-235 核
      for (let c = 0; c < 8; c++) { ctx.fillStyle = "rgba(150,160,175,0.35)"; ctx.fillRect(G.ix0 + (c + 0.5) * G.cw - 4, G.iy0 + 8, 8, G.iy1 - G.iy0 - 14); }
      nuc.forEach(n => { const a = t - n.split; if (a > 2.5 || a < 0) ball(ctx, n.x, n.y, 6, [120, 190, 80]); else if (a > 1.2) ball(ctx, n.x, n.y, 6 * (a - 1.2) / 1.3, [120, 190, 80], 0.6); });
      // 控制棒：從上方穿過頂蓋插入
      const rodBot = G.iy0 + d * G.span;
      G.rods.forEach(x => { const rg = ctx.createLinearGradient(x - 5, 0, x + 5, 0); rg.addColorStop(0, "rgb(50,54,62)"); rg.addColorStop(0.5, "rgb(110,116,128)"); rg.addColorStop(1, "rgb(40,44,50)"); ctx.fillStyle = rg; ctx.fillRect(x - 5, 0, 10, rodBot); });
      AP.steel(ctx, G.ix0 - 12, G.vt, G.ix1 - G.ix0 + 24, 12, 10);
      D.text(ctx, "控制棒（硼）", G.rods[0] - 10, 14, { color: PL.col("text"), size: 10.5 * k, align: "right", weight: "700" });
      // 中子源、碎片、閃光、中子
      ball(ctx, G.ix0 + 4, (G.iy0 + G.iy1) / 2, 6, [200, 200, 90]);
      frags.forEach(p => ball(ctx, p.x, p.y, 4, p.c, 1 - p.age / 0.8));
      fl.forEach(p => D.disc(ctx, p.x, p.y, p.rod ? 4 : 4 + p.age * 30, { fill: p.rod ? "rgba(160,160,170,0.7)" : "rgba(255,230,140," + (0.8 - p.age).toFixed(2) + ")" }));
      ns.forEach(n => D.disc(ctx, n.x, n.y, 2.6, { fill: "#f2f6ff", glow: "#9fd0ff", glowSize: 6 }));
      // 圖例
      D.text(ctx, "水位", G.ix1 - 40, Math.max(G.iy0 + 12, wy - 6), { color: "#2a7fd0", size: 10.5 * k, align: "right", weight: "700" });
      D.text(ctx, "中子源", G.ix0 + 12, (G.iy0 + G.iy1) / 2 + 18, { color: PL.col("text-dim"), size: 9.5 * k });
      gRod.place(G.rods[1], rodBot - 6); gW.place(G.ix1 - 16, Math.max(G.iy0 + 8, wy));

      // ---------- 右：每一代中子數（對數）＋ k 錶 ----------
      const x0 = G.LW + 22, w0 = W - x0 - 10, ch = Math.round(H * 0.6);
      AP.infoCard(ctx, x0, 10, w0, ch);
      D.text(ctx, "每一代的中子數 N_g（對數刻度）", x0 + 10, 28, { color: PL.col("text"), size: 11 * k, weight: "700" });
      const last = gen.length - 1, g0 = Math.max(0, last - 11), nb = 12, bx = x0 + 34, bw = (w0 - 44) / nb, by = 10 + ch - 26, bh = ch - 70;
      const mx = Math.max(10, ...gen.slice(g0).map(v => v || 0), Math.pow(Math.max(K, 1), Math.min(last, 11))), lmx = Math.log10(mx * 1.5);
      const Y = v => by - Math.log10(Math.max(1, v)) / lmx * bh;
      [1, 10, 100, 1000, 1e4, 1e5, 1e6].filter(v => v <= mx * 1.5).forEach(v => { D.line(ctx, bx, Y(v), x0 + w0 - 8, Y(v), PL.col("text-faint"), 0.6, [2, 3]); D.text(ctx, v >= 1000 ? "10" + sup(Math.round(Math.log10(v))) : String(v), bx - 4, Y(v) + 3, { color: PL.col("text-dim"), size: 8.5 * k, align: "right" }); });
      const live = new Set(ns.map(n => n.g)), done = live.size ? Math.min(...live) : last;
      for (let j = 0; j < nb; j++) {
        const g = g0 + j, v = gen[g] || 0, x = bx + j * bw;
        if (v > 0) { ctx.fillStyle = g <= done ? (K > 1.03 ? "rgba(220,90,60,0.8)" : K < 0.97 ? "rgba(70,140,220,0.8)" : "rgba(60,170,110,0.85)") : "rgba(150,150,160,0.5)"; ctx.fillRect(x + 2, Y(v), bw - 4, by - Y(v)); }
        D.text(ctx, String(g), x + bw / 2, by + 12, { color: PL.col("text-dim"), size: 8.5 * k, align: "center" });
      }
      // 理論：N_g = k^g（從 1 個中子開始）
      if (started) { ctx.save(); ctx.beginPath(); ctx.rect(bx, 34, w0 - 44, by - 34); ctx.clip(); ctx.strokeStyle = PL.col("accent"); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath(); for (let j = 0; j < nb; j++) { const v = Math.pow(K, g0 + j), y = Y(Math.max(1, v)); j ? ctx.lineTo(bx + (j + 0.5) * bw, y) : ctx.moveTo(bx + (j + 0.5) * bw, y); } ctx.stroke(); ctx.restore(); }
      D.text(ctx, "代數 g　　虛線：N_g = k^g", x0 + w0 - 10, by + 24, { color: PL.col("text-dim"), size: 9 * k, align: "right" });
      const dcy = 10 + ch + (H - 24 - ch) * 0.52, dr = Math.min(48, (H - 24 - ch) * 0.42, w0 * 0.22);
      AP.dial(ctx, x0 + dr * 1.3, dcy, dr, PL.clamp(K / 3, 0, 1), { max: 3, majors: 3, unit: "k", ghost: 1 / 3 });
      const state = K > 1.03 ? "超臨界" : K < 0.97 ? "次臨界" : "臨界";
      D.text(ctx, "k = " + K.toFixed(2), x0 + dr * 2.8 + 6, dcy - 6, { color: PL.col("text"), size: 15 * k, weight: "700" });
      D.text(ctx, state + (K > 1.03 ? "：越來越快" : K < 0.97 ? "：逐漸熄滅" : "：穩定進行"), x0 + dr * 2.8 + 6, dcy + 14, { color: K > 1.03 ? "#d9463b" : K < 0.97 ? "#2f6fd0" : "#2e9d5c", size: 11 * k, weight: "700" });
      const lg = [["鈾-235", [120, 190, 80]], ["中子", [200, 214, 240]], ["分裂碎片", [230, 160, 80]]];
      lg.forEach((p, j) => { const x = x0 + 10 + j * Math.min(84, w0 / 3); ball(ctx, x + 4, H - 40, 4.5, p[1]); D.text(ctx, p[0], x + 12, H - 36, { color: PL.col("text"), size: 10 * k }); });
      D.text(ctx, "一代實際約 10⁻⁴ s，畫面放慢上萬倍", x0 + 10, H - 18, { color: PL.col("text-dim"), size: 9 * k });
      if (!started) D.text(ctx, "按「射入一個中子」開始統計", x0 + w0 / 2, 10 + ch / 2, { color: PL.col("text-dim"), size: 12 * k, align: "center", weight: "700" });

      const obs = done >= 1 && gen[done - 1] ? gen[done] / gen[done - 1] : null;
      rK.set(K, 3); rSt.set(state); rG.set(started ? done : 0, 0); rN.set(started ? Math.round(gen[done] || 0) : 0, 0); rF.set(Math.round(fis), 0); rE.set(Math.round(fis) * 200, 0);
      dv.set(0, pFis(), 3); dv.set(1, NU, 1); dv.set(2, K, 3);
      const ended = started && !ns.length;
      vd.set(!started ? "k = " + K.toFixed(2) + "（" + state + "）——按「射入一個中子」看看會怎樣"
        : ended ? "連鎖反應在第 " + last + " 代熄滅，共分裂 " + Math.round(fis) + " 次" + (K >= 0.97 ? "（k ≈ 1 也可能因隨機起伏熄滅，再射一次）" : "")
        : "第 " + done + " 代 N = " + Math.round(gen[done] || 0) + (obs ? "，實測 N_g/N_(g−1) = " + obs.toFixed(2) : "") + "；理論 k = " + K.toFixed(2),
        K > 1.03 ? "bad" : K < 0.97 ? "info" : "ok", PL.clamp(K / 2, 0, 1));
    }
    clock = PL.motion.clock(dt => { step(Math.min(dt, 0.05)); draw(); });
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
