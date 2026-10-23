/* 學測／分科常考實驗：克卜勒定律、人造衛星、錐動擺、水波槽、聲波干涉、真空鐘罩（2026-10） */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, AP = PL.apparatus;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const col = (n, f) => PL.col(n, f);
  const LT = () => PL.theme.isLight();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // 畫布上的數字固定小數位（PL.fmt 會去掉尾數 0，「1.00」變成「1」反而像算錯）
  const fm = (v, d) => isFinite(v) ? Number(v).toFixed(d) : "—";
  const T = (ctx, s, x, y, o) => D.text(ctx, s, x, y, o);

  /* 多行資訊卡：畫面上的關鍵公式與判讀放在卡片上，任何背景都讀得到 */
  function card(ctx, x, y, w, lines, lh) {
    lh = lh || 16;
    const h = lines.length * lh + 10;
    AP.infoCard(ctx, x, y, w, h);
    lines.forEach((ln, i) => T(ctx, ln[0], x + 9, y + 5 + lh * (i + 0.8), { color: ln[1] || col("text"), size: ln[2] || 11.5, weight: ln[3] || "" }));
    return h;
  }

  /*
   * 像素波場：每一格存複數振幅 (re, im)。參數不變時，下一格畫面只要乘上 e^{-iωt}，
   * 也就是 re·cosωt + im·sinωt——所以水波、聲場能每格重畫而不必重算整個疊加。
   * 測試環境沒有 createImageData 時直接略過像素層，其餘器材照畫。
   */
  function Field() {
    const F = { gw: 0, gh: 0, key: "", img: null };
    F.size = (gw, gh) => {
      gw = Math.max(2, Math.round(gw)); gh = Math.max(2, Math.round(gh));
      if (gw === F.gw && gh === F.gh) return;
      F.gw = gw; F.gh = gh; F.key = "";
      F.re = new Float32Array(gw * gh); F.im = new Float32Array(gw * gh); F.m = new Uint8Array(gw * gh);
      try {
        F.c = document.createElement("canvas"); F.c.width = gw; F.c.height = gh;
        F.x = F.c.getContext("2d"); F.img = F.x && F.x.createImageData ? F.x.createImageData(gw, gh) : null;
      } catch (e) { F.img = null; }
    };
    F.paint = (ctx, X, Y, Wd, Hd, wt, pal) => {
      if (!F.img) return;
      const d = F.img.data, c = Math.cos(wt), s = Math.sin(wt), n = F.gw * F.gh;
      for (let i = 0, j = 0; i < n; i++, j += 4) {
        if (!F.m[i]) { d[j + 3] = 0; continue; }
        pal(F.re[i] * c + F.im[i] * s, F.re[i], d, j);
      }
      F.x.putImageData(F.img, 0, 0);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(F.c, X, Y, Wd, Hd); ctx.restore();
    };
    return F;
  }

  function sunGlow(ctx, x, y, r) {
    let g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3.2);
    g.addColorStop(0, "rgba(255,214,110,0.85)"); g.addColorStop(0.35, "rgba(255,170,60,0.3)"); g.addColorStop(1, "rgba(255,150,40,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, "#fff6c8"); g.addColorStop(0.6, "#ffc23a"); g.addColorStop(1, "#ee8418");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* 人造衛星：本體＋兩片太陽能板 */
  function satellite(ctx, x, y, a, body) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = "rgb(52,92,170)"; ctx.fillRect(-16, -3, 10, 6); ctx.fillRect(6, -3, 10, 6);
    ctx.strokeStyle = "rgba(210,222,240,0.85)"; ctx.lineWidth = 0.8; ctx.strokeRect(-16, -3, 10, 6); ctx.strokeRect(6, -3, 10, 6);
    ctx.fillStyle = body || "rgb(214,178,90)"; ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

  /* ======================================================================
     克卜勒三大定律
     行星位置由克卜勒方程式 E − e sinE = M 解出（M 隨時間均勻增加），
     所以近日點快、遠日點慢不是「設定」出來的，而是角動量守恆的結果。
     12 塊扇形是同樣 Δt = T/12 掃過的面積：近日那塊又短又寬，遠日那塊又細又長，面積一樣。
     ====================================================================== */
  PL.register("kepler-orbits", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sE = PL.ui.slider(L.controls, { label: "行星 A 離心率 e", min: 0, max: 0.7, step: 0.001, value: 0.5, digits: 3, onInput: () => draw() });
    const sA = PL.ui.slider(L.controls, { label: "行星 A 半長軸 a", min: 0.8, max: 2, step: 0.01, value: 1.4, unit: "AU", digits: 2, onInput: () => draw() });
    const sB = PL.ui.slider(L.controls, { label: "行星 B 軌道半徑 a", min: 0.4, max: 2, step: 0.01, value: 0.8, unit: "AU", digits: 2, onInput: () => draw() });
    const set3 = (e, a, b) => { sE.set(e); sA.set(a); sB.set(b); draw(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "地球與金星", hint: "地球 e ≈ 0.017 幾乎是圓；金星 a = 0.72 AU", apply: () => set3(0.017, 1, 0.72) },
      { label: "火星與地球", hint: "火星 a = 1.52 AU、e = 0.093，週期 1.88 年", apply: () => set3(0.093, 1.52, 1) },
      { label: "彗星般的扁軌道", hint: "e = 0.7：近日點速率是遠日點的 5.7 倍", apply: () => set3(0.7, 1.8, 1) },
      { label: "a 相同、形狀不同", hint: "週期只由半長軸決定：兩顆行星同時回到起點", apply: () => set3(0.6, 1.5, 1.5) }
    ] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rRp = PL.ui.readout(L.readouts, { label: "近日距 r₁", unit: "AU" });
    const rRa = PL.ui.readout(L.readouts, { label: "遠日距 r₂", unit: "AU" });
    const rV1 = PL.ui.readout(L.readouts, { label: "近日速率 v₁", unit: "km/s" });
    const rV2 = PL.ui.readout(L.readouts, { label: "遠日速率 v₂", unit: "km/s" });
    const rTA = PL.ui.readout(L.readouts, { label: "A 週期 T", unit: "年" });
    const rTB = PL.ui.readout(L.readouts, { label: "B 週期 T", unit: "年" });
    const rK = PL.ui.readout(L.readouts, { label: "T²/a³（A、B 相同）", unit: "年²/AU³" });
    PL.ui.causality(L.canvasWrap.parentNode, { title: "為什麼近日點比較快？", rows: [
      { name: "引力指向太陽", tone: "a", note: "力通過太陽，對太陽不產生力矩，角動量 L = mrv⊥ 守恆。" },
      { name: "L 守恆 → 等面積", tone: "b", note: "連線每單位時間掃過的面積 ΔA/Δt = L/2m 是定值；r 小的地方 v 就得大。" },
      { name: "T² ∝ a³", tone: "c", note: "比值 4π²/GM 只由太陽質量決定，所以同一顆恆星的所有行星都一樣。" }
    ] });

    const YPS = 0.3, VK = 4.74;                        // 每秒 0.3 年；1 AU/年 = 4.74 km/s
    let MA = 0, thB = 2.3, dragB = false;
    const G = { SX: 0, SY: 0, s: 1 };
    const hQ = PL.ui.handle(cv, { slider: sE, label: "遠日點（拖離太陽＝離心率變大）", toValue: x => (G.SX - x) / (G.s * sA.get()) - 1 });
    const hP = PL.ui.handle(cv, { slider: sA, label: "近日點（拖動改半長軸）", toValue: x => (x - G.SX) / G.s / (1 - sE.get()) });
    const hB = PL.ui.handle(cv, { slider: sB, label: "行星 B（拖離太陽＝軌道變大）", toValue: (x, y) => Math.hypot(x - G.SX, y - G.SY) / G.s,
      onGrab: () => { dragB = true; }, onRelease: () => { dragB = false; } });
    const kepE = (M, e) => { let E = M + e * Math.sin(M); for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; };
    const vis = (r, a) => TAU * Math.sqrt(Math.max(0, 2 / r - 1 / a));   // 活力方程式（AU/年）

    function draw(dt) {
      const e = sE.get(), a = sA.get(), aB = sB.get();
      const TA = Math.pow(a, 1.5), TB = Math.pow(aB, 1.5);
      if (dt > 0) { MA = (MA + TAU * dt * YPS / TA) % TAU; if (!dragB) thB = (thB + TAU * dt * YPS / TB) % TAU; }
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      AP.starfield(ctx, W, H, 29);
      const SX = W * 0.56, SY = H * 0.52;
      const s = Math.min((SX - 24) / 3.45, (W - SX - 24) / 2.05, (H / 2 - 20) / 2.05);
      G.SX = SX; G.SY = SY; G.s = s;
      const b = a * Math.sqrt(1 - e * e), c = a * e, rp = a * (1 - e), ra = a * (1 + e);
      const Pt = E => ({ x: SX + a * (Math.cos(E) - e) * s, y: SY - b * Math.sin(E) * s });

      // 行星 B 的圓軌道
      D.ring(ctx, SX, SY, aB * s, LT() ? "rgba(40,90,170,0.45)" : "rgba(120,170,255,0.4)", 1.2, [5, 5]);
      // 等時間扇形：第 0 塊對準近日點、第 6 塊對準遠日點
      const N = 12, kNow = Math.round(MA / (TAU / N)) % N;
      for (let k = 0; k < N; k++) {
        const m0 = (k - 0.5) * TAU / N, m1 = (k + 0.5) * TAU / N, key = k === 0 || k === N / 2;
        ctx.beginPath(); ctx.moveTo(SX, SY);
        for (let q = 0; q <= 10; q++) { const p = Pt(kepE(m0 + (m1 - m0) * q / 10, e)); ctx.lineTo(p.x, p.y); }
        ctx.closePath();
        const al = k === kNow ? 0.42 : key ? 0.28 : 0.1;
        ctx.fillStyle = k % 2 ? "rgba(80,150,240," + al + ")" : "rgba(240,160,50," + al + ")";
        ctx.fill();
        if (key) { ctx.strokeStyle = LT() ? "rgba(150,90,10,0.8)" : "rgba(255,210,130,0.8)"; ctx.lineWidth = 1.2; ctx.stroke(); }
      }
      // 行星 A 的橢圓、長軸、中心與空焦點
      ctx.save(); ctx.strokeStyle = LT() ? "rgba(160,80,30,0.85)" : "rgba(255,190,120,0.85)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(SX - c * s, SY, a * s, b * s, 0, 0, TAU); ctx.stroke(); ctx.restore();
      const xQ = SX - ra * s, xP = SX + rp * s;
      D.line(ctx, xQ, SY, xP, SY, PL.theme.pale(0.3), 1, [4, 4]);
      D.line(ctx, SX - c * s - 5, SY - 5, SX - c * s + 5, SY + 5, PL.theme.pale(0.6), 1.2);
      D.line(ctx, SX - c * s - 5, SY + 5, SX - c * s + 5, SY - 5, PL.theme.pale(0.6), 1.2);
      if (e > 0.12) {
        T(ctx, "中心", SX - c * s, SY + 18, { color: col("text-faint"), size: 10, align: "center" });
        D.ring(ctx, SX - 2 * c * s, SY, 3, PL.theme.pale(0.6), 1.2);
        T(ctx, "空焦點", SX - 2 * c * s, SY - 9, { color: col("text-faint"), size: 10, align: "center" });
      }
      sunGlow(ctx, SX, SY, 11);
      T(ctx, "太陽（焦點）", SX + 4, SY + 30, { color: col("warn"), size: 11, align: "center", weight: "700" });

      // 近日點、遠日點速率（活力方程式），標出 r₁v₁ = r₂v₂
      const v1 = vis(rp, a), v2 = vis(ra, a);
      [[xP, 1, "近日 r₁ = " + fm(rp, 2) + " AU", "v₁ = " + fm(v1 * VK, 1) + " km/s"], [xQ, -1, "遠日 r₂ = " + fm(ra, 2) + " AU", "v₂ = " + fm(v2 * VK, 1) + " km/s"]].forEach(([x, d, l1, l2]) => {
        ctx.save(); ctx.fillStyle = LT() ? "#9a5a10" : "#ffd48a"; ctx.translate(x, SY); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
        const tx = x + d * 10, al = d > 0 ? "left" : "right";
        T(ctx, l1, tx, SY + 18, { color: col("text"), size: 11, align: al });
        T(ctx, l2, tx, SY + 33, { color: col("accent-2"), size: 11, align: al, weight: "700" });
      });
      hQ.place(xQ, SY); hP.place(xP, SY);

      // 行星 A（目前位置、速度箭頭）
      const E = kepE(MA, e), pA = Pt(E), r = a * (1 - e * Math.cos(E)), v = vis(r, a);
      const dx = -a * Math.sin(E), dy = -b * Math.cos(E), dl = Math.hypot(dx, dy) || 1;
      D.line(ctx, SX, SY, pA.x, pA.y, LT() ? "rgba(150,80,20,0.7)" : "rgba(255,200,140,0.7)", 1.2);
      D.arrow(ctx, pA.x, pA.y, pA.x + dx / dl * v * 4.2, pA.y + dy / dl * v * 4.2, { color: col("accent-2"), width: 2, head: 7 });
      AP.planet(ctx, pA.x, pA.y, 8, [214, 120, 70]);
      T(ctx, "A  v = " + fm(v * VK, 1) + " km/s", pA.x + 12, pA.y - 12, { color: col("text"), size: 11, weight: "700" });
      // 行星 B
      const bx = SX + aB * s * Math.cos(thB), by = SY - aB * s * Math.sin(thB);
      AP.planet(ctx, bx, by, 7, [70, 140, 230], "earth");
      T(ctx, "B", bx + 10, by + 4, { color: col("text"), size: 11, weight: "700" });
      hB.place(bx, by);

      const kA = TA * TA / (a * a * a), kB = TB * TB / (aB * aB * aB);
      card(ctx, 12, 12, Math.min(262, SX - 40), [
        ["第二定律：等時間 Δt 掃過等面積", col("warn"), 12, "700"],
        ["每塊 Δt = T/12，面積都是 " + fm(Math.PI * a * b / 12, 3) + " AU²", col("text-dim"), 10.5],
        ["r₁v₁ = r₂v₂：" + fm(rp * v1 * VK, 1) + " = " + fm(ra * v2 * VK, 1) + " AU·km/s", col("text"), 11]
      ]);
      const cw = Math.min(220, W - SX - 16);
      card(ctx, W - cw - 12, 12, cw, [
        ["第三定律：T² ∝ a³", col("accent-2"), 12, "700"],
        ["A：a = " + fm(a, 2) + " AU，T = " + fm(TA, 2) + " 年", col("text"), 11],
        ["B：a = " + fm(aB, 2) + " AU，T = " + fm(TB, 2) + " 年", col("text"), 11],
        ["T²/a³ = " + fm(kA, 2) + " = " + fm(kB, 2) + " 年²/AU³", col("ok"), 11, "700"]
      ]);

      rRp.set(rp, 3); rRa.set(ra, 3); rV1.set(v1 * VK, 2); rV2.set(v2 * VK, 2);
      rTA.set(TA, 3); rTB.set(TB, 3); rK.set(kA, 2);
      vd.set(e < 0.02 ? "e ≈ 0：近乎圓軌道，速率幾乎不變；A 繞一圈 " + fm(TA, 2) + " 年"
        : "e = " + fm(e, 2) + "：近日點速率是遠日點的 " + fm((1 + e) / (1 - e), 2) + " 倍（v₁/v₂ = r₂/r₁）", e < 0.02 ? "info" : "ok");
    }
    const clock = PL.motion.clock(dt => draw(dt), { ambient: true });
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* ======================================================================
     人造衛星：牛頓大砲與軌道比較
     砲彈用真實的 GM、地球半徑做數值積分（速度 Verlet），虛線則是同一初速的圓錐曲線解，
     兩者重合正是「軌道就是一直在落下」。山高誇張成 1000 km，讓發射點看得見。
     ====================================================================== */
  PL.register("satellite-orbit", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const GM = 398600, RE = 6371, R0 = RE + 1000;                  // km³/s²、km
    const VC = Math.sqrt(GM / R0), VE = Math.sqrt(2 * GM / R0);
    let mode = "cannon";
    const go = m => { if (mode !== m) { mode = m; sel.set(m); } };
    const sel = PL.ui.select(L.controls, { label: "情境", value: "cannon", options: [
      { value: "cannon", label: "牛頓大砲：改發射速率" }, { value: "orbit", label: "兩顆衛星：比較高度" }], onChange: v => { mode = v; fire(); draw(); } });
    const sV = PL.ui.slider(L.controls, { label: "砲口速率 v₀", min: 0, max: 12, step: 0.1, value: 7, unit: "km/s", digits: 1, onInput: () => { fire(); draw(); } });
    const sHA = PL.ui.slider(L.controls, { label: "衛星 A 高度 h", min: 200, max: 36000, step: 100, value: 400, unit: "km", digits: 0, onInput: () => draw() });
    const sHB = PL.ui.slider(L.controls, { label: "衛星 B 高度 h", min: 200, max: 36000, step: 100, value: 35800, unit: "km", digits: 0, onInput: () => draw() });
    /*
     * 學生動了哪一組滑桿，就切到那個情境。只聽真正的 input 事件（拖滑桿、拖把手、鍵盤）：
     * 探測引擎與「全部重設」是直接呼叫 onInput，不能因此把情境偷偷換掉。
     * 另一個情境的狀態畫在角落的小窗裡，所以任何時候拉任何滑桿畫面都會變。
     */
    [[sV, "cannon"], [sHA, "orbit"], [sHB, "orbit"]].forEach(([sl, m]) => sl.el.addEventListener("input", () => { if (mode !== m) { go(m); fire(); draw(); } }));
    const btn = PL.ui.buttonRow(L.controls);
    PL.ui.button(btn, "再發射一次", () => { go("cannon"); fire(); draw(); });
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "剛好圓軌道", hint: "v₀ = √(GM/r)", apply: () => { go("cannon"); sV.set(Math.round(VC * 10) / 10); fire(); draw(); } },
      { label: "脫離速度", hint: "v = √(2GM/r) = √2 × 圓軌道速率", apply: () => { go("cannon"); sV.set(Math.ceil(VE * 10) / 10); fire(); draw(); } },
      { label: "太空站 vs 同步衛星", hint: "h = 400 km 與 35800 km（T ≈ 24 h）", apply: () => { go("orbit"); sHA.set(400); sHB.set(35800); draw(); } },
      { label: "GPS 衛星", hint: "h ≈ 20200 km，T ≈ 12 h", apply: () => { go("orbit"); sHA.set(20200); sHB.set(35800); draw(); } }
    ] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rKind = PL.ui.readout(L.readouts, { label: "砲彈軌道" });
    const rSE = PL.ui.readout(L.readouts, { label: "砲彈力學能 E/m", unit: "MJ/kg" });
    const rTc = PL.ui.readout(L.readouts, { label: "砲彈繞一圈", unit: "min" });
    const rVA = PL.ui.readout(L.readouts, { label: "A 速率 v", unit: "km/s" });
    const rTA = PL.ui.readout(L.readouts, { label: "A 週期 T", unit: "h" });
    const rEA = PL.ui.readout(L.readouts, { label: "A 總力學能（1000 kg）", unit: "GJ" });
    const rVB = PL.ui.readout(L.readouts, { label: "B 速率 v", unit: "km/s" });
    const rTB = PL.ui.readout(L.readouts, { label: "B 週期 T", unit: "h" });
    PL.ui.causality(L.canvasWrap.parentNode, { title: "衛星減速，為什麼反而變快？", rows: [
      { name: "減速 → 引力「贏了」", tone: "a", note: "速率小於該處圓軌道速率，衛星往內落，進入較低的軌道。" },
      { name: "往下落 → 位能轉成動能", tone: "b", note: "到了低軌道 v = √(GM/r) 較大，Ek 變大，但總能 E = −GMm/2r 變得更負。" },
      { name: "總能決定束縛", tone: "c", note: "E < 0 繞地球；E = 0 剛好脫離，對應 v = √2 × 圓軌道速率。" }
    ] });

    const ball = {}; let trail = [], angA = 0.4, angB = 2.2;
    function fire() { Object.assign(ball, { x: 0, y: R0, vx: sV.get(), vy: 0, done: "", wait: 0, off: 0 }); trail = [[0, R0]]; }
    fire();
    const G = { cx: 0, cy: 0, k: 1, mx: 0, my: 0, kv: 1, k2: 1, ox: 0, oy: 0 };
    const hV = PL.ui.handle(cv, { slider: sV, label: "砲口速率（往右拉＝更快）", toValue: x => (x - G.mx) / G.kv });
    const hA = PL.ui.handle(cv, { slider: sHA, label: "衛星 A 軌道（拖遠＝升高）", toValue: x => (x - G.ox) / G.k2 - RE });
    const hB = PL.ui.handle(cv, { slider: sHB, label: "衛星 B 軌道（拖遠＝升高）", toValue: x => (G.ox - x) / G.k2 - RE });

    function kind(v) {
      const x = R0 * v * v / GM;
      if (x >= 2) return ["escape", "脫離地球"];
      if (x < 1 && R0 * x / (2 - x) < RE) return ["crash", "落回地面"];
      if (Math.abs(x - 1) < 0.02) return ["circle", "圓軌道"];
      return x < 1 ? ["apo", "橢圓（發射點是遠地點）"] : ["peri", "橢圓（發射點是近地點）"];
    }
    // 同一初速的圓錐曲線 r = p/(1 + e cosν)：發射點在正上方、水平向右（順時針）
    function conic(v) {
      const x = R0 * v * v / GM, pts = [];
      if (x < 0.004) return [[0, R0], [0, RE]];
      const e = Math.abs(x - 1), p = R0 * x, nu0 = x >= 1 ? 0 : Math.PI, phP = x >= 1 ? Math.PI / 2 : -Math.PI / 2;
      const nuMax = e >= 1 ? Math.acos(-1 / e) - 0.02 : Infinity;
      for (let i = 0; i <= 360; i++) {
        const nu = nu0 + TAU * i / 360;
        if (nu - nu0 >= nuMax) break;
        const r = p / (1 + e * Math.cos(nu)), ph = phP - nu;
        if (r > R0 * 30) break;
        pts.push([r * Math.cos(ph), r * Math.sin(ph)]);
        if (r < RE) break;
      }
      return pts;
    }
    function stepBall(dt) {
      if (ball.done) { ball.wait += dt; if (ball.wait > 1.6) fire(); return; }
      let left = dt * 760;                                   // 每秒模擬 760 s
      while (left > 0) {
        const h = Math.min(3, left); left -= h;
        let r = Math.hypot(ball.x, ball.y), q = -GM / (r * r * r);
        ball.vx += 0.5 * h * q * ball.x; ball.vy += 0.5 * h * q * ball.y;
        ball.x += h * ball.vx; ball.y += h * ball.vy;
        r = Math.hypot(ball.x, ball.y); q = -GM / (r * r * r);
        ball.vx += 0.5 * h * q * ball.x; ball.vy += 0.5 * h * q * ball.y;
        if (r < RE) { ball.x *= RE / r; ball.y *= RE / r; ball.done = "land"; break; }
      }
      trail.push([ball.x, ball.y]); if (trail.length > 700) trail.shift();
    }
    // E = −GMm/2r，m = 1000 kg：GM 以 km³/s² 計時 −GM/(2r) 恰好就是 GJ
    const orbit = h => { const r = RE + h; return { r, v: Math.sqrt(GM / r), T: TAU * Math.sqrt(r * r * r / GM), E: -GM / (2 * r) }; };

    function draw(dt) {
      const { ctx, W, H } = cv;
      const oA = orbit(sHA.get()), oB = orbit(sHB.get());
      if (dt > 0) {
        if (mode === "cannon") stepBall(dt);
        angA += dt * 1900 * oA.v / oA.r; angB += dt * 1900 * oB.v / oB.r;
      }
      cv.clear(); D.bg(cv); AP.starfield(ctx, W, H, 61);
      const v0 = sV.get(), kd = kind(v0), xx = R0 * v0 * v0 / GM;
      if (mode === "cannon") {
        hA.hide(); hB.hide();
        const k = Math.min(W * 0.3, H * 0.34) / RE, cx = W * 0.4, cy = H * 0.57;
        const X = x => cx + x * k, Y = y => cy - y * k;
        Object.assign(G, { cx, cy, k });
        // 大氣光暈＋地球
        const g = ctx.createRadialGradient(cx, cy, RE * k * 0.96, cx, cy, RE * k * 1.1);
        g.addColorStop(0, "rgba(110,170,255,0.45)"); g.addColorStop(1, "rgba(110,170,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, RE * k * 1.1, 0, TAU); ctx.fill();
        AP.planet(ctx, cx, cy, RE * k, [70, 130, 200], "earth");
        D.ring(ctx, cx, cy, R0 * k, LT() ? "rgba(30,120,80,0.6)" : "rgba(120,230,170,0.55)", 1.2, [3, 6]);
        T(ctx, "圓軌道 v = " + fm(VC, 2) + " km/s", cx + R0 * k * 0.72, cy + R0 * k * 0.74 + 14, { color: col("ok"), size: 10.5 });
        // 預測軌道（虛線）
        const pts = conic(v0);
        ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.4; ctx.strokeStyle = LT() ? "rgba(170,90,10,0.75)" : "rgba(255,200,120,0.7)";
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke(); ctx.restore();
        // 誇張的高山＋大砲
        const ly = Y(R0), ys = Y(RE);
        AP.poly(ctx, [{ x: cx - 62, y: ys + 10 }, { x: cx - 38, y: ly + 6 }, { x: cx - 12, y: ly + 6 }, { x: cx + 16, y: ys + 10 }], LT() ? "rgb(140,118,92)" : "rgb(104,88,70)", "rgba(40,30,20,0.5)");
        AP.cannon(ctx, cx - 29, ly, 0, { s: 0.5 });
        // 已飛過的軌跡＋砲彈
        ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = col("warn"); ctx.beginPath();
        trail.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke(); ctx.restore();
        const bxp = X(ball.x), byp = Y(ball.y);
        if (bxp < -30 || bxp > W + 30 || byp < -30 || byp > H + 30) { ball.off += dt || 0; if (ball.off > 2.2 && !ball.done) ball.done = "away"; } else ball.off = 0;
        D.disc(ctx, bxp, byp, 4.5, { fill: LT() ? "#3a3f48" : "#e8ecf2", stroke: col("warn"), width: 1.5 });
        if (ball.done === "land") D.ring(ctx, bxp, byp, 6 + ball.wait * 10, col("danger"), 2);
        // 速度箭頭：刻度標出圓軌道與脫離速度
        G.mx = cx; G.my = ly - 26; G.kv = Math.min(20, (W - 250 - cx) / 12);
        const ax = G.mx, ay = G.my, kv = G.kv;
        D.line(ctx, ax, ay, ax + 12 * kv, ay, PL.theme.pale(0.25), 4);
        [[VC, "圓", col("ok")], [VE, "脫離", col("danger")]].forEach(([vv, lb, c]) => {
          D.line(ctx, ax + vv * kv, ay - 7, ax + vv * kv, ay + 7, c, 2);
          T(ctx, lb + " " + fm(vv, 1), ax + vv * kv, ay - 11, { color: c, size: 10, align: "center" });
        });
        D.arrow(ctx, ax, ay, ax + Math.max(0.5, v0 * kv), ay, { color: col("accent-2"), width: 3, head: 9 });
        T(ctx, "v₀ = " + fm(v0, 1) + " km/s", ax - 6, ay + 4, { color: col("accent-2"), size: 12, align: "right", weight: "700" });
        hV.place(ax + v0 * kv, ay);
        const cw = Math.min(232, W * 0.3);
        // 小窗：兩顆衛星的軌道（切到「兩顆衛星」情境看完整比較）
        const iw = Math.min(170, W * 0.22), ix = W - iw - 12, iy = H - iw - 12, ic = iw / 2, kk = (ic - 14) / (RE + 36000);
        AP.infoCard(ctx, ix, iy, iw, iw);
        T(ctx, "兩顆衛星（切換情境看比較）", ix + 8, iy + 15, { color: col("text-dim"), size: 9.5 });
        D.disc(ctx, ix + ic, iy + ic + 6, Math.max(3, RE * kk), { fill: "rgb(70,130,200)" });
        [[oA, angA, col("accent-2")], [oB, angB, col("m-color")]].forEach(([o, an, c]) => {
          D.ring(ctx, ix + ic, iy + ic + 6, o.r * kk, c, 1, [3, 3]);
          D.disc(ctx, ix + ic + o.r * kk * Math.cos(an), iy + ic + 6 - o.r * kk * Math.sin(an), 3, { fill: c });
        });
        card(ctx, W - cw - 12, 12, cw, [
          ["結果：" + kd[1], kd[0] === "crash" ? col("danger") : kd[0] === "escape" ? col("warn") : col("ok"), 12.5, "700"],
          ["萬有引力 = 向心力 → v = √(GM/r)", col("text"), 11],
          ["v₀ / v圓 = " + fm(v0 / VC, 2) + "，v脫離 = √2 · v圓", col("text-dim"), 11],
          ["E/m = v²/2 − GM/r = " + fm(v0 * v0 / 2 - GM / R0, 1) + " MJ/kg", col("text-dim"), 11],
          ["山高誇張為 1000 km", col("text-faint"), 10]
        ]);
      } else {
        hV.hide();
        const k2 = Math.min(W * 0.36, H * 0.46) / (RE + 36000), ox = W * 0.36, oy = H * 0.52;
        Object.assign(G, { ox, k2 });
        AP.planet(ctx, ox, oy, RE * k2, [70, 130, 200], "earth");
        [[oA, angA, "A", col("accent-2"), sHA.get(), 0], [oB, angB, "B", col("m-color"), sHB.get(), Math.PI]].forEach(([o, an, lb, c, h, hang]) => {
          const R = o.r * k2;
          D.ring(ctx, ox, oy, R, c, 1.2, [4, 5]);
          const x = ox + R * Math.cos(an), y = oy - R * Math.sin(an);
          D.arrow(ctx, x, y, x - Math.sin(an) * o.v * 6, y - Math.cos(an) * o.v * 6, { color: c, width: 2, head: 6 });
          satellite(ctx, x, y, -an);
          T(ctx, lb, x + 10, y - 9, { color: c, size: 12, weight: "700" });
          const hx = ox + R * Math.cos(hang);
          D.disc(ctx, hx, oy, 3.5, { fill: c });
          T(ctx, lb + "：" + fm(h, 0) + " km", hx + 6, oy + (lb === "A" ? 16 : -10), { color: c, size: 10.5 });
          (lb === "A" ? hA : hB).place(hx, oy);
        });
        // 比較表：欄位用固定 x，數字才對得齊
        const cw = Math.min(250, W * 0.36), tx0 = W - cw - 12, ca = tx0 + cw * 0.47, cb = tx0 + cw * 0.8;
        const rows = [["r", fm(oA.r, 0) + " km", fm(oB.r, 0) + " km"], ["v", fm(oA.v, 2) + " km/s", fm(oB.v, 2) + " km/s"],
          ["T", fm(oA.T / 3600, 2) + " h", fm(oB.T / 3600, 2) + " h"], ["Ek", fm(-oA.E, 2) + " GJ", fm(-oB.E, 2) + " GJ"],
          ["U", fm(2 * oA.E, 2) + " GJ", fm(2 * oB.E, 2) + " GJ"], ["E", fm(oA.E, 2) + " GJ", fm(oB.E, 2) + " GJ"]];
        AP.infoCard(ctx, tx0, 12, cw, 74 + rows.length * 17);
        T(ctx, "衛星 A", ca, 32, { color: col("accent-2"), size: 11.5, align: "center", weight: "700" });
        T(ctx, "衛星 B", cb, 32, { color: col("m-color"), size: 11.5, align: "center", weight: "700" });
        rows.forEach((r, i) => {
          const y = 52 + i * 17, c = i === 5 ? col("warn") : col("text");
          T(ctx, r[0], tx0 + 12, y, { color: c, size: 11, weight: "700" });
          T(ctx, r[1], ca, y, { color: c, size: 11, align: "center" }); T(ctx, r[2], cb, y, { color: c, size: 11, align: "center" });
        });
        T(ctx, "v = √(GM/r)，E = −GMm/2r = −Ek", tx0 + 12, 58 + rows.length * 17, { color: col("text-dim"), size: 10.5 });
        T(ctx, "（m = 1000 kg）", tx0 + 12, 74 + rows.length * 17, { color: col("text-faint"), size: 10 });
        // 小窗：牛頓大砲目前的砲彈軌道
        const iw = Math.min(170, W * 0.22), ix = W - iw - 12, iy = H - iw - 12, ic = iw / 2, kk = (ic - 18) / R0 * 0.75;
        AP.infoCard(ctx, ix, iy, iw, iw);
        T(ctx, "牛頓大砲 v₀ = " + fm(v0, 1) + " km/s", ix + 8, iy + 15, { color: col("text-dim"), size: 9.5 });
        ctx.save(); ctx.beginPath(); ctx.rect(ix, iy + 20, iw, iw - 20); ctx.clip();
        D.disc(ctx, ix + ic, iy + ic + 8, RE * kk, { fill: "rgb(70,130,200)" });
        ctx.strokeStyle = col("warn"); ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.beginPath();
        conic(v0).forEach((p, i) => i ? ctx.lineTo(ix + ic + p[0] * kk, iy + ic + 8 - p[1] * kk) : ctx.moveTo(ix + ic + p[0] * kk, iy + ic + 8 - p[1] * kk)); ctx.stroke(); ctx.restore();
      }
      // 讀數：兩種情境都照公式計算，探測引擎掃滑桿時關係一致
      rKind.set(kd[1]);
      rSE.set(v0 * v0 / 2 - GM / R0, 2);
      rTc.set(xx < 2 && kd[0] !== "crash" ? TAU * Math.sqrt(Math.pow(R0 / (2 - xx), 3) / GM) / 60 : "—", 1);
      rVA.set(oA.v, 3); rTA.set(oA.T / 3600, 3); rEA.set(oA.E, 2); rVB.set(oB.v, 3); rTB.set(oB.T / 3600, 3);
      if (mode === "cannon") {
        const msg = { crash: "v₀ 太小：落下的同時地面彎得不夠快，砲彈撞回地面", circle: "v₀ ≈ √(GM/r)：每一刻落下的量剛好等於地面彎下去的量——圓軌道",
          apo: "介於中間：橢圓軌道，發射點是最遠點（遠地點）", peri: "超過圓軌道速率：橢圓軌道，發射點是近地點，會飛得更遠再繞回來", escape: "v₀ ≥ √(2GM/r)：總力學能 ≥ 0，飛離地球不再回來" };
        vd.set(msg[kd[0]], kd[0] === "crash" ? "bad" : kd[0] === "escape" ? "warn" : "ok");
      } else {
        const lo = oA.r < oB.r ? "A" : "B";
        vd.set(Math.abs(oA.r - oB.r) < 1 ? "兩顆衛星同高度：v、T、能量都相同" : "衛星 " + lo + " 較低：v 較大、T 較短、Ek 較大，但總能 E 較低（更負）", "ok");
      }
    }
    const clock = PL.motion.clock(dt => draw(dt), { ambient: true });
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* ======================================================================
     錐動擺
     斜視角：擺錘在懸點正下方 h = L cosθ 處的水平圓上轉。cosθ = g/(ω²L)：
     轉得不夠快（ω² ≤ g/L）繩子張不開。擺錘上的力箭頭以 mg 為單位畫，
     T + mg 在畫面上的向量和正好是指向圓心的水平合力（投影是線性的，三角形照樣閉合）。
     ====================================================================== */
  PL.register("conical-pendulum", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    const g = 9.8, TILT = 0.3;
    const sW = PL.ui.slider(L.controls, { label: "轉速 ω", min: 1, max: 9, step: 0.05, value: 4.5, unit: "rad/s", digits: 2, onInput: () => draw() });
    const sL = PL.ui.slider(L.controls, { label: "擺長 L", min: 0.3, max: 1.2, step: 0.01, value: 0.8, unit: "m", digits: 2, onInput: () => draw() });
    const sM = PL.ui.slider(L.controls, { label: "擺錘質量 m", min: 0.05, max: 1, step: 0.05, value: 0.2, unit: "kg", digits: 2, onInput: () => draw() });
    const chk = PL.ui.checkbox(L.controls, { label: "加一個擺長 1.3L 的錐擺（同轉速）", checked: false, onChange: () => draw() });
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "剛好張開", hint: "ω² = g/L 是張開的門檻", apply: () => { sW.set(Math.sqrt(g / sL.get()) + 0.1); draw(); } },
      { label: "θ = 60°（T = 2mg）", hint: "cos60° = 1/2，張力是重力的兩倍", apply: () => { sW.set(Math.sqrt(2 * g / sL.get())); draw(); } },
      { label: "質量加倍", hint: "θ、週期都不變，只有張力加倍", apply: () => { sM.set(Math.min(1, sM.get() * 2)); draw(); } },
      { label: "同高度比週期", hint: "擺長不同、高度相同 → 週期相同", apply: () => { chk.set(true); sW.set(5); draw(); } }
    ] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rTh = PL.ui.readout(L.readouts, { label: "張角 θ", unit: "°" });
    const rR = PL.ui.readout(L.readouts, { label: "圓半徑 r", unit: "m" });
    const rH = PL.ui.readout(L.readouts, { label: "鉛直高度 h", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "擺錘速率 v", unit: "m/s" });
    const rP = PL.ui.readout(L.readouts, { label: "週期 P", unit: "s" });
    const rT = PL.ui.readout(L.readouts, { label: "繩張力 T", unit: "N" });
    const rF = PL.ui.readout(L.readouts, { label: "向心力 mω²r", unit: "N" });
    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "T cosθ", unit: "N", hint: "鉛直分量，抵消重力" }, { label: "mg", unit: "N", hint: "兩者相等" },
      { label: "T sinθ", unit: "N", hint: "水平分量，指向圓心" }, { label: "mω²r", unit: "N", hint: "所需向心力，兩者相等" }]);

    const theta = (w, l) => w * w * l > g ? Math.acos(g / (w * w * l)) : 0;
    let phi = 0;
    const G = { cx: 0, s: 1, f0: 0, fl: 1 };
    const hR = PL.ui.handle(cv, { slider: sW, label: "擺錘軌道（往外拉＝張角變大，需要更快的轉速）", toValue: x => {
      const l = sL.get(), sn = clamp((x - G.cx) / G.s / l, 0, 0.99);
      return Math.sqrt(g / (l * Math.sqrt(1 - sn * sn)));
    } });
    const hF = PL.ui.handle(cv, { slider: sW, label: "馬達轉速推桿", toValue: x => 1 + (x - G.f0) / G.fl * 8 });

    function draw(dt) {
      const w = sW.get(), l = sL.get(), m = sM.get();
      if (dt > 0) phi = (phi + w * dt) % TAU;
      const th = theta(w, l), r = l * Math.sin(th), h = l * Math.cos(th);
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const floorY = H - 24;
      AP.labRoom(ctx, W, H, floorY, { bench: "none" }); AP.woodFloor(ctx, W, H, floorY);
      AP.ceilingBeam(ctx, 0, W, 32, 32);
      const s = Math.min((floorY - 100) / 1.25, W * 0.3 / 0.95), cx = W * 0.36, py = 58;
      G.cx = cx; G.s = s;
      // 天花板上的馬達：轉軸上的記號跟著 φ 轉
      AP.steel(ctx, cx - 18, 32, 36, 20, -10);
      D.line(ctx, cx + 12 * Math.cos(phi), 44, cx, 44, "rgba(220,60,50,0.9)", 2.4);
      AP.steel(ctx, cx - 3, 52, 6, 6, 10);
      // 控制盒（牆上）與電纜
      const bw = 168, bh = 66, bx = W - bw - 14, by = H - bh - 40;
      AP.cable(ctx, [{ x: cx + 18, y: 42 }, { x: bx + bw / 2, y: 42 }, { x: bx + bw / 2, y: by }], "rgb(44,46,52)", 2.6, 3);
      AP.powerSupply(ctx, bx, by, bw, bh, fm(w * 60 / TAU, 1) + " rpm", { knob: (w - 1) / 8 });
      G.f0 = bx + 14; G.fl = bw - 64;
      const fy = by + bh - 13, fx = G.f0 + (w - 1) / 8 * G.fl;
      D.line(ctx, G.f0, fy, G.f0 + G.fl, fy, "rgba(200,206,214,0.8)", 3);
      AP.steel(ctx, fx - 4, fy - 7, 8, 14, 20);
      hF.place(fx, fy);

      const drawPend = (lp, ph, tag) => {
        const thp = theta(w, lp), rp = lp * Math.sin(thp), hp = lp * Math.cos(thp), yb = py + hp * s;
        const bxp = cx + rp * s * Math.cos(ph), byp = yb + rp * s * TILT * Math.sin(ph);
        // 地板影子
        ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(bxp, floorY + 6 + rp * s * TILT * 0.2 * Math.sin(ph), 12, 3.5, 0, 0, TAU); ctx.fill();
        // 圓軌道（後半）、錐面、鉛直軸
        const pc = tag ? col("m-color") : (LT() ? "rgba(40,90,170,0.6)" : "rgba(130,180,255,0.6)");
        ctx.save(); ctx.strokeStyle = pc; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(cx, yb, Math.max(0.1, rp * s), Math.max(0.1, rp * s * TILT), 0, Math.PI, TAU); ctx.stroke(); ctx.restore();
        D.line(ctx, cx, py, cx - rp * s, yb, PL.theme.pale(0.16), 1);
        D.line(ctx, cx, py, cx + rp * s, yb, PL.theme.pale(0.16), 1);
        AP.cord(ctx, cx, py, bxp, byp);
        const br = 6 + 9 * Math.sqrt(m);
        AP.bob(ctx, bxp, byp, br);
        if (tag) T(ctx, "L₂ = 1.3L", bxp + br + 4, byp + 4, { color: col("m-color"), size: 10.5, weight: "700" });
        ctx.save(); ctx.strokeStyle = pc; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(cx, yb, Math.max(0.1, rp * s), Math.max(0.1, rp * s * TILT), 0, 0, Math.PI); ctx.stroke(); ctx.restore();
        return { bx: bxp, by: byp, yb };
      };
      if (chk.get()) drawPend(Math.min(1.6, 1.3 * l), phi + Math.PI, true);
      const yb = py + h * s;
      D.line(ctx, cx, py, cx, Math.max(yb, py + 30) + 14, PL.theme.pale(0.5), 1.2, [6, 4]);
      const B = drawPend(l, phi, false);
      // 張角、L、h、r 的標示
      if (th > 0.02) {
        ctx.save(); ctx.strokeStyle = col("warn"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, py, 34, Math.PI / 2 - th, Math.PI / 2); ctx.stroke(); ctx.restore();
        T(ctx, "θ = " + fm(th / DEG, 1) + "°", cx + 8, py + 50, { color: col("warn"), size: 12, weight: "700" });
        D.line(ctx, cx, yb, cx + r * s, yb, col("accent-2"), 1.2, [3, 3]);
        T(ctx, "r = " + fm(r, 2) + " m", cx + r * s / 2, yb - 6, { color: col("accent-2"), size: 11, align: "center" });
      }
      T(ctx, "h = L cosθ = " + fm(h, 2) + " m", cx + 6, Math.max(yb, py + 30) + r * s * TILT + 22, { color: col("text-dim"), size: 11 });
      T(ctx, "L = " + fm(l, 2) + " m", cx + (B.bx - cx) * 0.3 + (B.bx >= cx ? 10 : -10), py + (B.by - py) * 0.3, { color: col("text"), size: 11, align: B.bx >= cx ? "left" : "right" });
      hR.place(cx + r * s, yb);
      // 擺錘上的力（以 mg 為單位）
      const u = 42, Lp = l * s;
      const tL = Math.min(170, u / Math.max(0.05, Math.cos(th)));
      D.arrow(ctx, B.bx, B.by, B.bx, B.by + u, { color: col("danger"), width: 2.2, head: 7, label: "mg", lx: 6, ly: 2 });
      D.arrow(ctx, B.bx, B.by, B.bx + (cx - B.bx) / Lp * tL, B.by + (py - B.by) / Lp * tL, { color: col("accent-2"), width: 2.2, head: 7, label: "T" });
      if (r > 0.01) {
        const fL = u * Math.tan(th) / (r * s);
        D.arrow(ctx, B.bx, B.by, B.bx + (cx - B.bx) * fL, B.by + (yb - B.by) * fL, { color: col("ok"), width: 2.4, head: 8, dash: [5, 3], label: "合力（向心）", lx: -40, ly: 16 });
      }
      // 右側受力圖（側視）
      const cw = Math.min(222, W * 0.3), cx0 = W - cw - 12, cy0 = 44;
      card(ctx, cx0, cy0, cw, [["受力圖（側視，以 mg 為單位）", col("text"), 11, "700"]]);
      AP.infoCard(ctx, cx0, cy0 + 32, cw, 118);
      const u2 = Math.min(44, 92 * Math.cos(th)), Ox = cx0 + cw * 0.66, Oy = cy0 + 92, tx = u2 * Math.tan(th);
      D.line(ctx, Ox, Oy, Ox - tx, Oy - u2, col("text-faint"), 1, [3, 3]);
      D.arrow(ctx, Ox, Oy, Ox, Oy + u2, { color: col("danger"), width: 2, head: 6, label: "mg", lx: 5, ly: 0 });
      D.arrow(ctx, Ox, Oy, Ox - tx, Oy - u2, { color: col("accent-2"), width: 2, head: 6, label: "T", lx: -14, ly: -2 });
      D.arrow(ctx, Ox, Oy, Ox, Oy - u2, { color: col("text-faint"), width: 1.2, head: 5, dash: [3, 3] });
      T(ctx, "T cosθ", Ox + 5, Oy - u2 + 10, { color: col("text-dim"), size: 10 });
      if (tx > 2) D.arrow(ctx, Ox, Oy, Ox - tx, Oy, { color: col("ok"), width: 2.2, head: 6 });
      T(ctx, "T sinθ = 合力", Ox - Math.max(tx, 4) - 4, Oy + 14, { color: col("ok"), size: 10, align: "left" });
      const Tn = m * g / Math.cos(th), P = TAU / w;
      card(ctx, cx0, cy0 + 156, cw, [
        ["T cosθ = mg → T = " + fm(1 / Math.cos(th), 2) + " mg", col("text"), 11],
        ["T sinθ = mω²r（向心力）", col("text"), 11],
        ["tanθ = ω²r / g = " + fm(Math.tan(th), 2), col("text"), 11],
        ["P = 2π√(h/g) = " + fm(P, 2) + " s", col("warn"), 11.5, "700"]
      ]);

      rTh.set(th / DEG, 1); rR.set(r, 3); rH.set(h, 3); rV.set(w * r, 3); rP.set(P, 3); rT.set(Tn, 3); rF.set(m * w * w * r, 3);
      dv.set(0, Tn * Math.cos(th), 3); dv.set(1, m * g, 3); dv.set(2, Tn * Math.sin(th), 3); dv.set(3, m * w * w * r, 3);
      if (th === 0) vd.set("ω² ≤ g/L（ω ≤ " + fm(Math.sqrt(g / l), 2) + " rad/s）：轉得太慢，繩子張不開，擺錘只在懸點正下方打轉", "warn");
      else vd.set("θ = " + fm(th / DEG, 1) + "°：T = mg/cosθ = " + fm(1 / Math.cos(th), 2) + " mg；週期只由 h = " + fm(h, 2) + " m 決定，與質量無關", "ok");
    }
    const clock = PL.motion.clock(dt => draw(dt), { ambient: true });
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* ======================================================================
     水波槽（俯視）
     亮暗條紋＝實際水槽投影在白紙上的樣子：波峰像凸透鏡聚光（亮）、波谷發散（暗）。
     四種情境都用同一個做法：先算每一點的複數振幅，播放時只轉相位。
       反射：入射平面波＋對擋板鏡射的反射平面波
       折射：邊界上相位連續（切向波數相同），淺水區 k₂ = k₁·v₁/v₂
       繞射：縫中排一列惠更斯子波源（2D 克希何夫積分，振幅 ∝ 1/√ρ）
       干涉：兩個同相點波源
     畫面放慢成約每秒一個週期（頻閃觀察）。
     ====================================================================== */
  PL.register("ripple-tank", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const V1 = 24, TWC = 40;                                         // 深水波速 cm/s、水槽寬 cm
    let mode = "double";
    const go = m => { if (mode !== m) { mode = m; sel.set(m); } };
    const sel = PL.ui.select(L.controls, { label: "情境", value: "double", options: [
      { value: "reflect", label: "反射：斜放的直擋板" }, { value: "refract", label: "折射：淺水區" },
      { value: "slit", label: "繞射：單縫" }, { value: "double", label: "干涉：兩個點波源" }], onChange: v => { mode = v; draw(); } });
    const sF = PL.ui.slider(L.controls, { label: "起波器頻率 f", min: 6, max: 20, step: 0.5, value: 10, unit: "Hz", digits: 1, onInput: () => draw() });
    PL.ui.section(L.controls, "各情境的器材");
    const sAl = PL.ui.slider(L.controls, { label: "擋板傾角（反射）", min: 0, max: 60, step: 1, value: 30, unit: "°", digits: 0, onInput: () => draw() });
    const sBe = PL.ui.slider(L.controls, { label: "淺水邊界傾角（折射）", min: 0, max: 60, step: 1, value: 40, unit: "°", digits: 0, onInput: () => draw() });
    const sRa = PL.ui.slider(L.controls, { label: "淺水波速 v₂/v₁（折射）", min: 0.4, max: 0.95, step: 0.01, value: 0.6, digits: 2, onInput: () => draw() });
    const sW = PL.ui.slider(L.controls, { label: "縫寬 w（繞射）", min: 0.6, max: 9, step: 0.1, value: 2.4, unit: "cm", digits: 1, onInput: () => draw() });
    const sD = PL.ui.slider(L.controls, { label: "波源間距 d（干涉）", min: 1, max: 12, step: 0.1, value: 6.5, unit: "cm", digits: 1, onInput: () => draw() });
    // 動了哪個器材就換到那個情境（只聽真正的 input 事件，探測引擎與重設不會誤切）；
    // 其他情境的器材設定畫在下方「器材盒」縮圖裡，任何滑桿都看得到變化
    [[sAl, "reflect"], [sBe, "refract"], [sRa, "refract"], [sW, "slit"], [sD, "double"]].forEach(([sl, m]) => sl.el.addEventListener("input", () => { if (mode !== m) { go(m); draw(); } }));
    PL.ui.note(L.controls, "頻閃觀察：水波已放慢顯示");
    const lam = () => V1 / sF.get();
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "反射：入射角 = 反射角", apply: () => { go("reflect"); sAl.set(40); draw(); } },
      { label: "折射：偏向法線", apply: () => { go("refract"); sBe.set(40); sRa.set(0.55); draw(); } },
      { label: "縫寬 ≈ 波長", hint: "繞射最明顯", apply: () => { go("slit"); sW.set(Math.round(lam() * 10) / 10); draw(); } },
      { label: "縫寬 ≫ 波長", hint: "幾乎直直穿過", apply: () => { go("slit"); sW.set(9); draw(); } },
      { label: "d = 3λ（6 條節線）", apply: () => { go("double"); sD.set(Math.round(lam() * 30) / 10); draw(); } }
    ] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rL = PL.ui.readout(L.readouts, { label: "深水波長 λ = v/f", unit: "cm" });
    const rRef = PL.ui.readout(L.readouts, { label: "反射角", unit: "°" });
    const rT2 = PL.ui.readout(L.readouts, { label: "折射角 θ₂", unit: "°" });
    const rL2 = PL.ui.readout(L.readouts, { label: "淺水波長 λ₂", unit: "cm" });
    const rLw = PL.ui.readout(L.readouts, { label: "λ / w（繞射）", unit: "" });
    const rN = PL.ui.readout(L.readouts, { label: "節線數（干涉）", unit: "條" });

    const F = Field(), G = { X0: 0, Y0: 0, k: 1, B: null };
    let clock = null;
    const ang = (x, y) => Math.atan2(G.B.y - y, x - G.B.x) / DEG;
    const hRefl = PL.ui.handle(cv, { slider: sAl, label: "擋板端點（轉動擋板）", toValue: ang });
    const hRefr = PL.ui.handle(cv, { slider: sBe, label: "淺水區玻璃板邊緣（轉動邊界）", toValue: ang });
    const hSlit = PL.ui.handle(cv, { slider: sW, label: "擋板缺口（拉開＝縫變寬）", toValue: x => 2 * (x - G.X0 - TWC / 2 * G.k) / G.k });
    const hSrc = PL.ui.handle(cv, { slider: sD, label: "波源 S₂（拉開＝間距變大）", toValue: x => 2 * (x - G.X0 - TWC / 2 * G.k) / G.k });
    const hF = PL.ui.handle(cv, { slider: sF, label: "起波器頻率推桿", toValue: x => 6 + (x - G.f0) / G.fl * 14 });

    // 計算複數振幅；THC 為水槽高（cm），所有座標以 cm 計、y 向下
    function compute(THC) {
      const md = mode, la = lam(), kw = TAU / la, cs = TWC / F.gw, xc = TWC / 2;
      const al = sAl.get() * DEG, be = sBe.get() * DEG, ra = sRa.get(), w = sW.get(), d = sD.get();
      const bxR = xc, byR = THC * 0.32, byF = THC * 0.5, yb = THC * 0.55, ys = THC - 3;
      const N = clamp(Math.ceil(w / (la / 5)), 3, 30), ds = w / N;
      const k2 = kw / ra, kt = kw * Math.sin(be), k2n = Math.sqrt(k2 * k2 - kt * kt);
      for (let j = 0; j < F.gh; j++) for (let i = 0; i < F.gw; i++) {
        const x = (i + 0.5) * cs, y = (j + 0.5) * THC / F.gh, n = j * F.gw + i;
        let re = 0, im = 0, m = 1, p;
        if (md === "reflect") {
          const rx = x - bxR, ry = y - byR;
          if (rx * Math.sin(al) + ry * Math.cos(al) < 0) m = 0;
          else { p = -kw * ry; re = Math.cos(p); im = Math.sin(p); p = kw * (rx * Math.sin(2 * al) + ry * Math.cos(2 * al)); re += Math.cos(p); im += Math.sin(p); re *= 0.6; im *= 0.6; }
        } else if (md === "refract") {
          const rx = x - xc, ry = y - byF, dn = rx * Math.sin(be) + ry * Math.cos(be);
          p = dn >= 0 ? -kw * ry : kt * (rx * Math.cos(be) - ry * Math.sin(be)) - k2n * dn;
          re = Math.cos(p); im = Math.sin(p);
        } else if (md === "slit") {
          if (y > yb + 0.3) { p = -kw * (y - yb); re = Math.cos(p); im = Math.sin(p); }
          else if (y > yb - 0.3) { if (Math.abs(x - xc) < w / 2) { p = -kw * (y - yb); re = Math.cos(p); im = Math.sin(p); } else m = 0; }
          else {
            const dy = yb - y;
            for (let q = 0; q < N; q++) {
              const xs = xc - w / 2 + (q + 0.5) * ds, rho = Math.max(la * 0.25, Math.hypot(x - xs, dy));
              const A = ds / Math.sqrt(la * rho) * (0.5 + 0.5 * dy / rho);
              re += A * Math.cos(kw * rho); im += A * Math.sin(kw * rho);
            }
          }
        } else {
          [xc - d / 2, xc + d / 2].forEach(xs => {
            const rho = Math.max(la * 0.3, Math.hypot(x - xs, y - ys)), A = Math.min(1.2, 0.75 * Math.sqrt(la / rho));
            re += A * Math.cos(kw * rho); im += A * Math.sin(kw * rho);
          });
        }
        F.re[n] = re; F.im[n] = im; F.m[n] = m;
      }
    }
    const pal = (v, re, d, j) => { const u = clamp(0.5 + 0.34 * v, 0, 1); d[j] = 14 + 200 * u * u; d[j + 1] = 64 + 176 * u; d[j + 2] = 92 + 158 * u; d[j + 3] = 255; };

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const X0 = 20, Y0 = 16, TW = W - 40, TH = H - 70, k = TW / TWC, THC = TH / k, xc = X0 + TW / 2;
      Object.assign(G, { X0, Y0, k });
      const la = lam(), t = clock ? clock.t : 0;
      // 水槽：鋁框＋水
      AP.steel(ctx, X0 - 8, Y0 - 8, TW + 16, TH + 16, -20);
      ctx.fillStyle = "#3b8ea6"; ctx.fillRect(X0, Y0, TW, TH);
      PL.theme.note(ctx, "#3b8ea6", X0, Y0, TW, TH);
      F.size(TW / 3, TH / 3);
      const key = [mode, la, sAl.get(), sBe.get(), sRa.get(), sW.get(), sD.get(), F.gw, F.gh].join();
      if (key !== F.key) { compute(THC); F.key = key; }
      F.paint(ctx, X0, Y0, TW, TH, t * TAU * 0.9, pal);
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, TW, TH); ctx.clip();
      const P = (x, y) => ({ x: X0 + x * k, y: Y0 + y * k });
      const plane = mode !== "double";
      if (plane) AP.steel(ctx, X0, Y0 + TH - 9, TW, 9, 0);
      [hRefl, hRefr, hSlit, hSrc].forEach(h => h.hide());
      let lines;
      const ray = (x1, y1, x2, y2, lb) => D.arrow(ctx, x1, y1, x2, y2, { color: "#ffe08a", width: 2.2, head: 8, label: lb });
      if (mode === "reflect" || mode === "refract") {
        const a = (mode === "reflect" ? sAl.get() : sBe.get()) * DEG, B = P(TWC / 2, THC * (mode === "reflect" ? 0.32 : 0.5));
        G.B = B;
        const tx = Math.cos(a), ty = -Math.sin(a), nx = Math.sin(a), ny = Math.cos(a), R = Math.min(TW * 0.3, TH * 0.6);
        if (mode === "reflect") {
          ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(-a); AP.steel(ctx, -2000, -10, 4000, 10, -10); ctx.restore();
          D.line(ctx, B.x - nx * 0.01, B.y, B.x + nx * R * 0.8, B.y + ny * R * 0.8, "rgba(255,255,255,0.75)", 1.2, [5, 4]);
          ray(B.x, B.y + R * 0.75, B.x, B.y + 3, "入射");
          ray(B.x, B.y, B.x + Math.sin(2 * a) * R * 0.75, B.y + Math.cos(2 * a) * R * 0.75, "反射");
          T(ctx, "i = " + fm(a / DEG, 0) + "°", B.x - 8, B.y + 56, { color: "#fff6d0", size: 12, align: "right", weight: "700" });
          T(ctx, "r = " + fm(a / DEG, 0) + "°", B.x + Math.sin(a) * 60 + 10, B.y + 54, { color: "#fff6d0", size: 12, weight: "700" });
          hRefl.place(B.x + tx * R, B.y + ty * R);
          lines = [["反射定律：入射角 = 反射角", "#fff6d0"], ["角度都從法線（虛線）量起", "#d8eef4"], ["反射後波速、波長、頻率都不變", "#d8eef4"]];
        } else {
          const t2 = Math.asin(Math.sin(a) * sRa.get());
          ctx.fillStyle = "rgba(220,240,255,0.16)"; ctx.beginPath();
          ctx.moveTo(B.x - tx * 2000, B.y - ty * 2000); ctx.lineTo(B.x + tx * 2000, B.y + ty * 2000);
          ctx.lineTo(B.x + tx * 2000 - nx * 2000, B.y + ty * 2000 - ny * 2000); ctx.lineTo(B.x - tx * 2000 - nx * 2000, B.y - ty * 2000 - ny * 2000); ctx.fill();
          D.line(ctx, B.x - tx * 2000, B.y - ty * 2000, B.x + tx * 2000, B.y + ty * 2000, "rgba(235,248,255,0.9)", 2);
          D.line(ctx, B.x + nx * R * 0.8, B.y + ny * R * 0.8, B.x - nx * R * 0.8, B.y - ny * R * 0.8, "rgba(255,255,255,0.75)", 1.2, [5, 4]);
          ray(B.x, B.y + R * 0.75, B.x, B.y + 3, "入射");
          // 淺水區的波向量 = k₂(sinθ₂·切向 − cosθ₂·法向)，和相位公式同一個方向
          const dx = Math.sin(t2) * tx - Math.cos(t2) * nx, dy = Math.sin(t2) * ty - Math.cos(t2) * ny;
          ray(B.x, B.y, B.x + dx * R * 0.75, B.y + dy * R * 0.75, "折射");
          T(ctx, "θ₁ = " + fm(a / DEG, 0) + "°", B.x + 8, B.y + 58, { color: "#fff6d0", size: 12, weight: "700" });
          T(ctx, "θ₂ = " + fm(t2 / DEG, 1) + "°", B.x + dx * 58 - 6, B.y + dy * 58, { color: "#fff6d0", size: 12, align: "right", weight: "700" });
          T(ctx, "淺水區（玻璃板）", B.x - tx * R * 0.5 - nx * 80, B.y - ty * R * 0.5 - ny * 80, { color: "#ffffff", size: 11.5, align: "center", weight: "700" });
          hRefr.place(B.x + tx * R, B.y + ty * R);
          lines = [["sinθ₁ / sinθ₂ = v₁ / v₂ = λ₁ / λ₂", "#fff6d0"], ["頻率不變；淺水波速慢、波長短", "#d8eef4"], ["λ₂ = " + fm(la * sRa.get(), 2) + " cm，波前偏向法線", "#d8eef4"]];
        }
      } else if (mode === "slit") {
        const w = sW.get(), yb = P(0, THC * 0.55).y, gl = xc - w / 2 * k, gr = xc + w / 2 * k;
        AP.steel(ctx, X0 - 5, yb - 6, gl - X0 + 5, 12, -10); AP.steel(ctx, gr, yb - 6, X0 + TW - gr + 5, 12, -10);
        D.line(ctx, gl, yb + 16, gr, yb + 16, "#fff6d0", 1.4);
        T(ctx, "w = " + fm(w, 1) + " cm", xc, yb + 30, { color: "#fff6d0", size: 12, align: "center", weight: "700" });
        if (la < w) {
          const th = Math.asin(la / w), R = TH * 0.5;
          [-1, 1].forEach(sg => D.line(ctx, xc, yb, xc + sg * Math.sin(th) * R, yb - Math.cos(th) * R, "rgba(255,240,180,0.85)", 1.4, [6, 4]));
          T(ctx, "第一暗紋 sinθ = λ/w，θ = " + fm(th / DEG, 0) + "°", xc + Math.sin(th) * R * 0.6 + 8, yb - Math.cos(th) * R * 0.6, { color: "#fff6d0", size: 11 });
        }
        hSlit.place(gr, yb);
        lines = [["縫寬與波長相近時，繞射最明顯", "#fff6d0"], ["λ/w = " + fm(la / w, 2) + (la >= w ? "：波幾乎向四面八方散開" : "：散開角度 sinθ ≈ λ/w"), "#d8eef4"], ["縫變窄或波長變長 → 繞射更明顯", "#d8eef4"]];
      } else {
        const d = sD.get(), ys = P(0, THC - 3).y, c = d / 2, nmax = Math.ceil(d / la + 0.5) - 1;
        ctx.save(); ctx.strokeStyle = "rgba(255,240,170,0.75)"; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2;
        for (let n = 1; n <= nmax; n++) {
          const ah = (n - 0.5) * la / 2, bh = Math.sqrt(Math.max(0, c * c - ah * ah));
          [-1, 1].forEach(sg => { ctx.beginPath(); for (let u = 0; u < 4; u += 0.05) { const px = xc + sg * ah * Math.cosh(u) * k, py = ys - bh * Math.sinh(u) * k; u ? ctx.lineTo(px, py) : ctx.moveTo(px, py); if (py < Y0) break; } ctx.stroke(); });
        }
        ctx.restore();
        AP.steel(ctx, xc - c * k - 14, ys + 14, c * 2 * k + 28, 6, 0);
        [-1, 1].forEach(sg => { D.line(ctx, xc + sg * c * k, ys + 15, xc + sg * c * k, ys, "rgb(200,206,214)", 2.5); D.disc(ctx, xc + sg * c * k, ys, 4.5, { fill: "#e8ecf2", stroke: "#2a3440", width: 1.2 }); });
        T(ctx, "S₁", xc - c * k - 8, ys - 8, { color: "#ffffff", size: 12, align: "right", weight: "700" });
        T(ctx, "S₂", xc + c * k + 8, ys - 8, { color: "#ffffff", size: 12, weight: "700" });
        hSrc.place(xc + c * k, ys);
        lines = [["節線：|r₁ − r₂| = (n − ½)λ", "#fff6d0"], ["d = " + fm(d, 1) + " cm = " + fm(d / la, 2) + " λ → 節線 " + 2 * nmax + " 條", "#d8eef4"], ["虛線是理論節線，對照水面上不動的灰線", "#d8eef4"]];
      }
      ctx.restore();
      // 左上說明卡（固定深色，水面上看得清楚）
      ctx.save(); ctx.fillStyle = "rgba(10,30,40,0.72)"; AP.rrPath(ctx, X0 + 8, Y0 + 8, 262, 62, 7); ctx.fill(); ctx.restore();
      lines.forEach((ln, i) => T(ctx, ln[0], X0 + 17, Y0 + 26 + i * 18, { color: ln[1], size: i ? 11 : 12.5, weight: i ? "" : "700" }));
      // 波長比例尺
      const lx = X0 + TW - 16 - la * k, ly = Y0 + 22;
      ctx.save(); ctx.fillStyle = "rgba(10,30,40,0.6)"; AP.rrPath(ctx, lx - 10, ly - 16, la * k + 20, 28, 6); ctx.fill(); ctx.restore();
      D.line(ctx, lx, ly + 4, lx + la * k, ly + 4, "#fff6d0", 2);
      D.line(ctx, lx, ly, lx, ly + 8, "#fff6d0", 2); D.line(ctx, lx + la * k, ly, lx + la * k, ly + 8, "#fff6d0", 2);
      T(ctx, "λ = " + fm(la, 2) + " cm", lx + la * k / 2, ly - 3, { color: "#fff6d0", size: 11, align: "center", weight: "700" });
      // 起波器控制盒與推桿
      const cy0 = H - 38;
      AP.powerSupply(ctx, X0, cy0, 120, 34, fm(sF.get(), 1) + " Hz", { knob: (sF.get() - 6) / 14 });
      G.f0 = X0 + 140; G.fl = Math.min(220, TW * 0.32);
      const fy = cy0 + 20, fx = G.f0 + (sF.get() - 6) / 14 * G.fl;
      D.line(ctx, G.f0, fy, G.f0 + G.fl, fy, PL.theme.pale(0.4), 3);
      AP.steel(ctx, fx - 4, fy - 8, 8, 16, 20); hF.place(fx, fy);
      T(ctx, "起波器頻率", G.f0, fy - 10, { color: col("text-dim"), size: 10 });
      // 器材盒：四種情境的器材縮圖（目前使用的加框）
      const bx0 = G.f0 + G.fl + 24, tw = clamp((W - bx0 - 12) / 4 - 6, 24, 80), th = 30, by0 = cy0 + 2;
      ["reflect", "refract", "slit", "double"].forEach((m, i) => {
        const x = bx0 + i * (tw + 6), cxm = x + tw / 2, cym = by0 + th / 2;
        ctx.save(); ctx.fillStyle = "#3b8ea6"; AP.rrPath(ctx, x, by0, tw, th, 4); ctx.fill();
        ctx.lineWidth = m === mode ? 2.2 : 1; ctx.strokeStyle = m === mode ? col("warn") : PL.theme.pale(0.4); ctx.stroke();
        ctx.beginPath(); ctx.rect(x, by0, tw, th); ctx.clip();
        ctx.strokeStyle = "#dfe6ee"; ctx.fillStyle = "#dfe6ee"; ctx.lineWidth = 2.4;
        if (m === "reflect" || m === "refract") {
          const a = (m === "reflect" ? sAl.get() : sBe.get()) * DEG;
          if (m === "refract") {
            ctx.fillStyle = "rgba(230,245,255,0.35)"; ctx.beginPath(); ctx.moveTo(cxm - 60 * Math.cos(a), cym + 60 * Math.sin(a)); ctx.lineTo(cxm + 60 * Math.cos(a), cym - 60 * Math.sin(a)); ctx.lineTo(cxm + 60, cym - 80); ctx.lineTo(cxm - 60, cym - 80); ctx.fill();
            ctx.lineWidth = 1;
            for (let q = 1; q < 4; q++) { const yy = cym + q * 5, y2 = cym - q * 5 * sRa.get(); ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + 12, yy); ctx.moveTo(x + tw - 12, y2); ctx.lineTo(x + tw - 3, y2); ctx.stroke(); }
            ctx.lineWidth = 2.4;
          }
          ctx.beginPath(); ctx.moveTo(cxm - 60 * Math.cos(a), cym + 60 * Math.sin(a)); ctx.lineTo(cxm + 60 * Math.cos(a), cym - 60 * Math.sin(a)); ctx.stroke();
        } else if (m === "slit") {
          const gp = 2 + sW.get() / 9 * tw * 0.7;
          ctx.fillRect(x, cym - 2, tw / 2 - gp / 2, 4); ctx.fillRect(cxm + gp / 2, cym - 2, tw / 2, 4);
        } else {
          const sp = sD.get() / 12 * tw * 0.8;
          [-1, 1].forEach(sg => { ctx.beginPath(); ctx.arc(cxm + sg * sp / 2, cym + 4, 3, 0, TAU); ctx.fill(); });
        }
        ctx.restore();
        T(ctx, ["反射", "折射", "繞射", "干涉"][i], x + 4, by0 + 11, { color: "#ffffff", size: 9, weight: "700" });
      });

      // 節線數：滿足 (n − ½)λ < d 的 n 有幾個，兩側各一條
      const be = sBe.get() * DEG, t2 = Math.asin(Math.sin(be) * sRa.get()), nmax = Math.ceil(sD.get() / la + 0.5) - 1;
      rL.set(la, 2); rRef.set(sAl.get(), 0); rT2.set(t2 / DEG, 1); rL2.set(la * sRa.get(), 2); rLw.set(la / sW.get(), 2); rN.set(2 * nmax, 0);
      const msg = {
        reflect: ["入射角 " + fm(sAl.get(), 0) + "° = 反射角 " + fm(sAl.get(), 0) + "°：反射波與入射波交錯成格子狀", "ok"],
        refract: ["進入淺水：θ₂ = " + fm(t2 / DEG, 1) + "° < θ₁ = " + fm(be / DEG, 0) + "°，波長變為 " + fm(sRa.get(), 2) + " 倍，頻率不變", "ok"],
        slit: la / sW.get() > 0.7 ? ["縫寬接近或小於波長：繞射很明顯，波穿過後幾乎呈半圓形散開", "ok"] : ["縫寬比波長大很多：大部分直直穿過，只在邊緣稍微彎進陰影區", "info"],
        double: ["d/λ = " + fm(sD.get() / la, 2) + "：兩波源間有 " + 2 * nmax + " 條節線（|r₁ − r₂| = ½λ、3/2λ…）", "ok"]
      }[mode];
      vd.set(msg[0], msg[1]);
    }
    clock = PL.motion.clock(() => draw(), { ambient: true });
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* ======================================================================
     兩喇叭的聲波干涉（俯視教室地板）
     每個喇叭是點聲源，壓力振幅 ∝ e^{ikr}/r；地板上的色塊是 |p|²：
     橘＝大聲、藍＝小聲。麥克風在一條軌道上滑動，旁邊即時畫出沿軌道的強度曲線。
     ====================================================================== */
  PL.register("sound-interference", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const VS = 343, XS = 0.4;
    const sF = PL.ui.slider(L.controls, { label: "訊號頻率 f", min: 200, max: 1500, step: 10, value: 500, unit: "Hz", digits: 0, onInput: () => draw() });
    const sD = PL.ui.slider(L.controls, { label: "喇叭間距 d", min: 0.4, max: 2.4, step: 0.05, value: 1.5, unit: "m", digits: 2, onInput: () => draw() });
    const sY = PL.ui.slider(L.controls, { label: "麥克風位置 y", min: -2.2, max: 2.2, step: 0.01, value: 0, unit: "m", digits: 2, onInput: () => draw() });
    const sLd = PL.ui.slider(L.controls, { label: "軌道到喇叭的距離 L", min: 1.5, max: 4.5, step: 0.1, value: 3.5, unit: "m", digits: 1, onInput: () => draw() });
    const chk = PL.ui.checkbox(L.controls, { label: "喇叭 B 反接（相位差 180°）", checked: false, onChange: () => draw() });
    const lam = () => VS / sF.get();
    const geo = y => { const d = sD.get(), x = sLd.get(); return [Math.hypot(x, y + d / 2), Math.hypot(x, y - d / 2)]; };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "中線：Δr = 0", apply: () => { sY.set(0); draw(); } },
      { label: "第一個小聲處", hint: "Δr = λ/2（同相時）", apply: () => {
        if (chk.get()) { sY.set(0); draw(); return; }        // 反接時中線就是相消
        const want = lam() / 2; let a = 0, b = 2.2;
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2, g = geo(m); (g[0] - g[1] < want ? a = m : b = m); }
        sY.set(Math.round(a * 100) / 100); draw(); } },
      { label: "反接喇叭 B", apply: () => { chk.set(!chk.get()); draw(); } },
      { label: "頻率加倍", hint: "λ 減半，大小聲交替更密", apply: () => { sF.set(Math.min(1500, sF.get() * 2)); draw(); } }
    ] });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ = v/f", unit: "m" });
    const rR1 = PL.ui.readout(L.readouts, { label: "到喇叭 A 距離 r₁", unit: "m" });
    const rR2 = PL.ui.readout(L.readouts, { label: "到喇叭 B 距離 r₂", unit: "m" });
    const rDr = PL.ui.readout(L.readouts, { label: "路徑差 Δr / λ", unit: "" });
    const rI = PL.ui.readout(L.readouts, { label: "強度 I / I（只開 A）", unit: "" });
    const rDb = PL.ui.readout(L.readouts, { label: "麥克風讀數", unit: "dB" });
    const rSp = PL.ui.readout(L.readouts, { label: "相鄰小聲處間距 ≈ λL/d", unit: "m" });

    const F = Field(), G = { cy: 0, s: 1 };
    let clock = null;
    const hMic = PL.ui.handle(cv, { slider: sY, label: "麥克風（沿軌道滑動）", toValue: (x, y) => (y - G.cy) / G.s });
    const hB = PL.ui.handle(cv, { slider: sD, label: "喇叭 B（拖離 A＝間距變大）", toValue: (x, y) => 2 * (y - G.cy) / G.s });
    const press = (x, y, sgn) => {
      const k = TAU / lam(), d = sD.get(), r1 = Math.hypot(x - XS, y + d / 2), r2 = Math.hypot(x - XS, y - d / 2);
      return [Math.cos(k * r1) / r1 + sgn * Math.cos(k * r2) / r2, Math.sin(k * r1) / r1 + sgn * Math.sin(k * r2) / r2, r1, r2];
    };
    const pal = (v, q, d, j) => {
      if (q > 0.35) { d[j] = 255; d[j + 1] = 120; d[j + 2] = 30; d[j + 3] = 125 * Math.min(1, (q - 0.35) / 1.5); }
      else { d[j] = 40; d[j + 1] = 110; d[j + 2] = 255; d[j + 3] = 170 * (0.35 - q) / 0.35; }
    };

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const s = Math.min((W - 200) / 5.3, (H - 24) / 5), x0 = 14, cy = H / 2, sgn = chk.get() ? -1 : 1;
      G.cy = cy; G.s = s;
      const X = xm => x0 + xm * s, Y = ym => cy + ym * s, la = lam(), d = sD.get(), Ld = sLd.get(), t = clock ? clock.t : 0;
      const rx = X(0), ry = Y(-2.4), rw = 5.3 * s, rh = 4.8 * s;
      AP.deskTop(ctx, rx, ry, rw, rh);
      // 聲場強度圖（格點 4 px）
      F.size(rw / 4, rh / 4);
      const key = [la, d, sgn, F.gw, F.gh].join();
      if (key !== F.key) {
        for (let j = 0; j < F.gh; j++) for (let i = 0; i < F.gw; i++) {
          const x = (i + 0.5) * 5.3 / F.gw, y = -2.4 + (j + 0.5) * 4.8 / F.gh, n = j * F.gw + i;
          const p = press(x, y, sgn);
          F.re[n] = (p[0] * p[0] + p[1] * p[1]) / (1 / (p[2] * p[2]) + 1 / (p[3] * p[3])); F.im[n] = 0; F.m[n] = x > XS + 0.05 ? 1 : 0;
        }
        F.key = key;
      }
      F.paint(ctx, rx, ry, rw, rh, 0, pal);
      // 波前：兩個喇叭各自的波峰圓弧（反接時 B 的波峰錯開半個波長）
      ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
      const ph = (t * 0.8) % 1;
      [[-d / 2, 0, LT() ? "rgba(20,90,170," : "rgba(140,200,255,"], [d / 2, sgn < 0 ? 0.5 : 0, LT() ? "rgba(170,30,110," : "rgba(255,150,210,"]].forEach(([yy, off, c]) => {
        for (let n = 0; ; n++) {
          const R = (n + ((ph + off) % 1)) * la;
          if (R > 5.4) break;
          ctx.strokeStyle = c + (0.6 * (1 - R / 5.6)).toFixed(3) + ")"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(X(XS), Y(yy), R * s, -1.35, 1.35); ctx.stroke();
        }
      });
      ctx.restore();
      // 喇叭、訊號產生器與導線
      const ps = AP.powerSupply(ctx, X(0) + 6, 10, 132, 50, fm(sF.get(), 0) + " Hz", { label: "訊號產生器", color: "rgb(120,230,255)" });
      const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.8);
      const ya = Y(-d / 2), yb = Y(d / 2);
      AP.cable(ctx, [ps.red, { x: ps.red.x, y: Math.max(ps.red.y + 10, ya - 40) }, { x: X(XS) - 14, y: ya - 40 }, { x: X(XS) - 14, y: ya - 20 }], "rgb(200,50,44)", 2.2, 2);
      AP.cable(ctx, [ps.black, { x: ps.black.x + 8, y: ps.black.y + 10 }, { x: X(XS) + 34, y: ps.black.y + 10 }, { x: X(XS) + 34, y: yb - 46 }, { x: X(XS) - 10, y: yb - 46 }, { x: X(XS) - 10, y: yb - 20 }], sgn < 0 ? "rgb(60,60,66)" : "rgb(200,50,44)", 2.2, 2);
      AP.speaker(ctx, X(XS), ya, 0.6, pulse, 1);
      AP.speaker(ctx, X(XS), yb, 0.6, sgn < 0 ? 1 - pulse : pulse, 1);
      T(ctx, "A", X(XS) - 24, ya + 4, { color: "#ffffff", size: 12, weight: "700" });
      T(ctx, "B" + (sgn < 0 ? "（反接）" : ""), X(XS) - 24, yb + 4, { color: sgn < 0 ? "#ffd0d0" : "#ffffff", size: 12, weight: "700" });
      hB.place(X(XS) - 6, yb);
      // 軌道、強度曲線
      const railX = X(XS + Ld);
      AP.steel(ctx, railX - 3, Y(-2.3), 6, 4.6 * s, 0);
      const gw = Math.min(110, W - railX - 250 > 40 ? 110 : Math.max(50, W - railX - 30)), samp = [];
      let mx = 0;
      for (let i = 0; i <= 120; i++) { const y = -2.25 + 4.5 * i / 120, p = press(XS + Ld, y, sgn), I = p[0] * p[0] + p[1] * p[1]; samp.push([y, I]); mx = Math.max(mx, I); }
      AP.infoCard(ctx, railX + 8, Y(-2.35), gw + 12, 4.7 * s);
      ctx.save(); ctx.fillStyle = "rgba(240,130,40,0.45)"; ctx.strokeStyle = col("warn"); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(railX + 14, Y(-2.25));
      samp.forEach(([y, I]) => ctx.lineTo(railX + 14 + I / mx * gw, Y(y))); ctx.lineTo(railX + 14, Y(2.25)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      T(ctx, "沿軌道的強度", railX + 16, Y(-2.35) - 3, { color: col("text-dim"), size: 10 });
      // 麥克風與兩條路徑
      const my = sY.get(), mp = press(XS + Ld, my, sgn), I = mp[0] * mp[0] + mp[1] * mp[1], r1 = mp[2], r2 = mp[3], Y0 = Y(my);
      D.line(ctx, X(XS) + 6, ya, railX, Y0, LT() ? "rgba(20,90,170,0.8)" : "rgba(140,200,255,0.85)", 1.3, [5, 4]);
      D.line(ctx, X(XS) + 6, yb, railX, Y0, LT() ? "rgba(170,30,110,0.8)" : "rgba(255,150,210,0.85)", 1.3, [5, 4]);
      T(ctx, "r₁", (X(XS) + railX) / 2, (ya + Y0) / 2 - 6, { color: "#ffffff", size: 12, weight: "700" });
      T(ctx, "r₂", (X(XS) + railX) / 2, (yb + Y0) / 2 + 16, { color: "#ffffff", size: 12, weight: "700" });
      D.line(ctx, railX + 14, Y0, railX + 14 + I / mx * gw, Y0, col("danger"), 1.5);
      ctx.save(); ctx.fillStyle = "rgb(46,50,58)"; AP.rrPath(ctx, railX - 2, Y0 - 7, 26, 14, 5); ctx.fill(); ctx.restore();
      D.disc(ctx, railX - 4, Y0, 8, { fill: "rgb(168,174,184)", stroke: "rgb(60,64,72)", width: 1.2 });
      const dB = Math.max(20, 70 + 10 * Math.log10(Math.max(1e-9, I)));
      AP.lcd(ctx, railX - 82, Y0 - 9, 62, 18, fm(dB, 0) + " dB", { size: 12 });
      hMic.place(railX, Y0);
      // 判讀卡
      const dr = Math.abs(r2 - r1), nl = dr / la, ph2 = sgn < 0 ? nl + 0.5 : nl, fr = Math.abs(ph2 - Math.round(ph2));
      const cw = Math.min(228, W - railX - gw - 34);
      if (cw > 150) card(ctx, W - cw - 10, 12, cw, [
        ["相長：Δr = nλ", col("ok"), 11.5, "700"], ["相消：Δr = (n + ½)λ", col("accent-2"), 11.5, "700"],
        ["λ = v/f = 343/" + fm(sF.get(), 0) + " = " + fm(la, 3) + " m", col("text"), 11],
        ["此處 Δr = " + fm(dr, 3) + " m = " + fm(nl, 2) + " λ", col("text"), 11],
        sgn < 0 ? ["反接：相長、相消位置互換", col("danger"), 11, "700"] : ["兩喇叭同相（接同一訊號）", col("text-faint"), 10.5]
      ]);
      const I1 = 1 / (r1 * r1);
      rLam.set(la, 3); rR1.set(r1, 3); rR2.set(r2, 3); rDr.set(nl, 2); rI.set(I / I1, 2); rDb.set(dB, 1); rSp.set(la * Ld / d, 2);
      vd.set(fr < 0.12 ? "相長：大聲（約單一喇叭的 " + fm(I / I1, 1) + " 倍）" : fr > 0.38 ? "相消：小聲（兩波幾乎互相抵消）" : "介於相長與相消之間", fr < 0.12 ? "ok" : fr > 0.38 ? "info" : "warn", I / mx);
    }
    clock = PL.motion.clock(() => draw(), { ambient: true });
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* ======================================================================
     真空鐘罩
     聲強 I ∝ ρ v ω² A²：鈴錘振幅不變時，傳出去的聲強正比於空氣密度 ρ（∝ P/T）。
     抽氣 P = P₀ e^{−t/τ}；聲音不會降到零，因為電鈴架與底盤是固體，仍會傳出一點振動
     （這裡取 −37 dB 的固體傳導底線），而室內本來就有約 30 dB 的背景噪音。
     ====================================================================== */
  PL.register("sound-vacuum", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const P0 = 101.3, PMIN = 0.02, FLOOR = 3e-5, LREF = 78;
    let P = P0, state = "idle";
    const sP = PL.ui.slider(L.controls, { label: "鐘罩內氣壓 P", min: PMIN, max: P0, step: 0.01, value: P0, unit: "kPa", digits: 2, onInput: v => { P = v; state = "idle"; draw(); } });
    const sT = PL.ui.slider(L.controls, { label: "空氣溫度", min: 0, max: 40, step: 1, value: 20, unit: "°C", digits: 0, onInput: () => draw() });
    const sR = PL.ui.slider(L.controls, { label: "分貝計距離 r", min: 0.6, max: 2, step: 0.05, value: 0.8, unit: "m", digits: 2, onInput: () => draw() });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "開始抽氣", () => { state = "pump"; }, { primary: true, trigger: true });
    PL.ui.button(row, "放氣", () => { state = "vent"; }, { trigger: true });
    const setP = v => { P = v; state = "idle"; sP.set(v); draw(); };
    PL.ui.presets(L.controls, { label: "考題情境", options: [
      { label: "一大氣壓", apply: () => setP(P0) }, { label: "抽到 1/10", apply: () => setP(10.1) },
      { label: "抽到 1 kPa", apply: () => setP(1) }, { label: "接近真空", apply: () => setP(PMIN) }] });
    PL.ui.procedure(L.controls, { title: "真空鐘罩示範", steps: [
      "鐘罩邊緣塗真空油脂、蓋在抽氣盤上；接通電鈴，先記下分貝計讀數。",
      "按<strong>開始抽氣</strong>：壓力計下降，聲音越來越小，但隔著玻璃仍<strong>看得到鈴錘在敲</strong>。",
      "抽到最低後按<strong>放氣</strong>：空氣流回，聲音恢復。"],
      rule: "聲音<strong>不會完全消失</strong>：鐘罩抽不到絕對真空，電鈴架、導線和底盤是固體，也會把振動傳出來。" });
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rP = PL.ui.readout(L.readouts, { label: "罩內氣壓", unit: "kPa" });
    const rRho = PL.ui.readout(L.readouts, { label: "空氣密度 ρ", unit: "kg/m³" });
    const rV = PL.ui.readout(L.readouts, { label: "聲速 v ≈ 331 + 0.6T", unit: "m/s" });
    const rI = PL.ui.readout(L.readouts, { label: "傳出聲強 I / I₀", unit: "" });
    const rDb = PL.ui.readout(L.readouts, { label: "分貝計讀數", unit: "dB" });

    const G = { Jx: 0, kpx: 1, vy: 0 };
    let clock = null;
    const hR = PL.ui.handle(cv, { slider: sR, label: "分貝計（拖近拖遠）", toValue: x => (x - G.Jx) / G.kpx });
    const hV = PL.ui.handle(cv, { slider: sP, label: "微調放氣閥（往上＝漏進較多空氣，平衡氣壓較高）", toValue: (x, y) => P0 * clamp((G.vy - y) / 56, 0, 1) });
    const rho = () => P * 1000 * 0.029 / (8.314 * (sT.get() + 273.15));
    const vs = () => 331 + 0.6 * sT.get();
    const rho0 = 101300 * 0.029 / (8.314 * 293.15), v0 = 343;
    const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    function draw(dt) {
      if (dt > 0) {
        if (state === "pump") P = Math.max(PMIN, P * Math.exp(-dt / 2.2));
        else if (state === "vent") { P = P0 - (P0 - P) * Math.exp(-dt / 0.8); if (P > P0 - 0.05) { P = P0; state = "idle"; } }
        sP.set(Math.round(P * 100) / 100);
      }
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const t = clock ? clock.t : 0, ring = clock && clock.running;
      const benchY = H - 52;
      AP.labRoom(ctx, W, H, benchY);
      const Jx = W * 0.42, kpx = (W - 64 - Jx) / 2.05, jw = Math.min(110, kpx * 0.42), plateY = benchY - 18, jh = Math.min(250, plateY - 70);
      G.Jx = Jx; G.kpx = kpx;
      const Iair = rho() * vs() / (rho0 * v0), Iout = Iair + FLOOR;
      const r = sR.get(), Lm = LREF + 10 * Math.log10(Iout) - 20 * Math.log10(r / 0.5);
      const dB = 10 * Math.log10(Math.pow(10, Lm / 10) + 1000);
      // 真空幫浦＋壓力計
      const px0 = 22, pw = Math.min(150, Jx - jw - 120);
      AP.contactShadow(ctx, px0 + pw / 2, benchY + 1, pw * 0.6);
      ctx.fillStyle = "rgb(62,92,84)"; AP.rrPath(ctx, px0, benchY - 62, pw, 62, 6); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
      PL.theme.note(ctx, "rgb(62,92,84)", px0, benchY - 62, pw, 62);
      ctx.strokeStyle = "rgba(200,220,210,0.35)";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(px0 + 12, benchY - 50 + i * 7); ctx.lineTo(px0 + pw * 0.45, benchY - 50 + i * 7); ctx.stroke(); }
      T(ctx, "真空幫浦", px0 + pw * 0.72, benchY - 24, { color: "#e8f2ee", size: 11, align: "center", weight: "700" });
      if (state === "pump" && ring) D.disc(ctx, px0 + pw - 12, benchY - 50, 4, { fill: "#6cff9a", glow: "#6cff9a" });
      AP.dial(ctx, px0 + pw / 2, benchY - 112, 38, P / P0, { max: 100, unit: "kPa", majors: 4 });
      // 抽氣管＋微調放氣閥
      const vx = (px0 + pw + Jx - jw - 30) / 2, vyb = benchY - 28;
      AP.cable(ctx, [{ x: px0 + pw, y: benchY - 30 }, { x: vx, y: vyb }, { x: Jx - jw - 22, y: plateY + 8 }], "rgb(40,40,44)", 5, 6);
      AP.steel(ctx, vx - 9, vyb - 9, 18, 14, 10);
      const ky = vyb - 16 - 56 * P / P0;
      G.vy = vyb - 16;
      D.line(ctx, vx, vyb - 9, vx, ky, "rgb(150,156,166)", 3);
      D.disc(ctx, vx, ky, 6, { fill: "rgb(206,52,44)", stroke: "rgba(0,0,0,0.4)", width: 1 });
      T(ctx, "放氣閥", vx, vyb + 22, { color: col("text-dim"), size: 10, align: "center" });
      hV.place(vx, ky);
      // 抽氣盤
      AP.contactShadow(ctx, Jx, benchY + 1, jw * 1.5);
      AP.steel(ctx, Jx - jw - 26, plateY, 2 * jw + 52, 18, -6);
      // 電鈴：支架、鈴碗、電磁鐵、鈴錘
      const gy = plateY - jh * 0.56, gx = Jx - 8;
      AP.steel(ctx, Jx - 3, gy, 6, plateY - gy, 0);
      AP.steel(ctx, Jx + 6, plateY - jh * 0.36, 26, 22, -20);
      ctx.save(); const gg = ctx.createRadialGradient(gx - 10, gy - 12, 3, gx, gy, 30);
      gg.addColorStop(0, "rgb(250,226,160)"); gg.addColorStop(0.6, "rgb(200,160,80)"); gg.addColorStop(1, "rgb(130,96,40)");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gx, gy, 28, Math.PI, TAU); ctx.lineTo(gx + 28, gy + 4); ctx.lineTo(gx - 28, gy + 4); ctx.closePath(); ctx.fill(); ctx.restore();
      // 鈴錘：靜止時離鈴碗一小段，敲擊時碰到鈴碗邊緣（每秒 7 下）
      const hit = ring ? Math.max(0, Math.sin(t * TAU * 7)) : 0;
      const ax = Jx + 20, ay = plateY - jh * 0.36, hx = gx + 34 + 14 * (1 - hit), hy = gy + 2;
      D.line(ctx, ax, ay, hx, hy, "rgb(150,156,166)", 2.4);
      D.disc(ctx, hx, hy, 6, { fill: "rgb(90,96,108)", stroke: "rgba(0,0,0,0.5)", width: 1 });
      // 罩內空氣分子：數目 ∝ P
      const nMol = Math.round(170 * P / P0), top = plateY - jh;
      ctx.fillStyle = LT() ? "rgba(30,80,160,0.75)" : "rgba(170,210,255,0.8)";
      for (let i = 0; i < nMol; i++) {
        let x = Jx - jw + 8 + hash(i) * (2 * jw - 16) + 7 * Math.sin(t * (2 + hash(i + 9) * 3) + i);
        let y = top + 10 + hash(i + 3) * (jh - 22) + 7 * Math.cos(t * (2 + hash(i + 5) * 3) + i * 1.7);
        if (y < top + jw && Math.hypot(x - Jx, y - (top + jw)) > jw - 8) continue;
        ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fill();
      }
      // 聲波圓弧：罩內強度 ∝ √(ρv)，罩外再加上固體傳導的底線
      const lp = 34 * vs() / 343, ph = ring ? (t * 70) % lp : 0;
      const jar = () => { ctx.beginPath(); ctx.moveTo(Jx - jw, plateY); ctx.lineTo(Jx - jw, top + jw); ctx.arc(Jx, top + jw, jw, Math.PI, TAU); ctx.lineTo(Jx + jw, plateY); ctx.closePath(); };
      const arcs = (amp, rmax) => { for (let R = ph + 30; R < rmax; R += lp) { ctx.strokeStyle = (LT() ? "rgba(20,110,140," : "rgba(110,220,240,") + (amp * (1 - R / rmax)).toFixed(3) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, R, 0, TAU); ctx.stroke(); } };
      ctx.save(); jar(); ctx.clip(); arcs(0.75 * Math.sqrt(Iair), jh); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, plateY); jar(); ctx.clip("evenodd"); arcs(0.75 * Math.sqrt(Iout), W * 0.62); ctx.restore();
      // 玻璃鐘罩
      ctx.save(); jar(); ctx.fillStyle = LT() ? "rgba(170,210,240,0.16)" : "rgba(170,210,240,0.08)"; ctx.fill();
      ctx.strokeStyle = LT() ? "rgba(60,110,150,0.75)" : "rgba(190,225,250,0.7)"; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(Jx, top + jw, jw - 12, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke(); ctx.restore();
      D.disc(ctx, Jx, top - 6, 7, { fill: "rgba(190,220,240,0.6)", stroke: "rgba(80,120,150,0.7)", width: 1.2 });
      // 光：真空也能傳 → 觀察者仍看得見鈴錘
      const ex = W - 58, ey = 64;
      D.line(ctx, hx, hy, ex - 14, ey, LT() ? "rgba(190,130,0,0.85)" : "rgba(255,220,110,0.85)", 1.6, [7, 5]);
      ctx.save(); ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(40,40,50,0.8)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(ex, ey, 15, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgb(60,110,170)"; ctx.beginPath(); ctx.arc(ex - 3, ey, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex - 3, ey, 2.4, 0, TAU); ctx.fill(); ctx.restore();
      T(ctx, "光不需要介質：", ex - 22, ey - 26, { color: col("warn"), size: 11, align: "right", weight: "700" });
      T(ctx, "看得到鈴錘在敲", ex - 22, ey - 11, { color: col("warn"), size: 11, align: "right" });
      // 分貝計
      const mx = Jx + r * kpx, mtop = benchY - 128;
      AP.steel(ctx, mx - 2, mtop + 60, 4, benchY - mtop - 60, 0);
      ctx.fillStyle = "rgb(44,48,56)"; ctx.fillRect(mx - 22, benchY - 3, 44, 3);
      ctx.fillStyle = "rgb(236,196,60)"; AP.rrPath(ctx, mx - 26, mtop, 52, 62, 7); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1; ctx.stroke();
      PL.theme.note(ctx, "rgb(236,196,60)", mx - 26, mtop, 52, 62);
      D.disc(ctx, mx - 30, mtop + 8, 7, { fill: "rgb(70,74,82)" });
      AP.lcd(ctx, mx - 21, mtop + 12, 42, 20, fm(dB, 0), { size: 13 });
      T(ctx, "dB", mx, mtop + 48, { color: "#2a2410", size: 11, align: "center", weight: "700" });
      T(ctx, "r = " + fm(r, 2) + " m", mx, benchY + 18, { color: col("text-dim"), size: 10.5, align: "center" });
      hR.place(mx, mtop + 30);
      card(ctx, 12, 12, Math.min(270, Jx - 30), [
        ["聲音是力學波，需要介質", col("text"), 12, "700"],
        ["罩內氣壓 " + fm(P, 1) + " kPa（" + fm(P / P0 * 100, P < 10 ? 1 : 0) + "% 大氣壓）", col("accent-2"), 11],
        ["聲強 I ∝ ρ v ω²A²：分子變少 → ρ 變小", col("text-dim"), 11]
      ]);

      rP.set(P, 2); rRho.set(rho(), 3); rV.set(vs(), 1); rI.set(Iout, 4); rDb.set(dB, 1);
      if (P > 50) vd.set("空氣充足：鈴聲清楚（" + fm(dB, 0) + " dB）", "ok", dB / 90);
      else if (P > 2) vd.set("空氣變稀薄：聲音明顯變小（" + fm(dB, 0) + " dB），但鈴錘照樣在敲", "warn", dB / 90);
      else vd.set("接近真空：聲音微弱到接近背景噪音；剩下的一點是電鈴架與底盤等固體傳出來的", "bad", dB / 90);
    }
    clock = PL.motion.clock(dt => draw(dt));
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});
})();
