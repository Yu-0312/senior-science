/* 模組五 · 圓周運動與萬有引力 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#ffd54f");
  /* 場景層：星空與行星是共用器材，延遲載入後由 PL.apparatus 取用 */
  const AP = () => PL.apparatus || {};

  /* 等速圓周運動 */
  PL.register("circular", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ang = 0;
    const sR = PL.ui.slider(L.controls, { label: "半徑 r", min: 1, max: 5, step: 0.5, value: 3, unit: "m", digits: 1 });
    const sW = PL.ui.slider(L.controls, { label: "角速度 ω", min: 0.5, max: 4, step: 0.1, value: 1.6, unit: "rad/s", digits: 1 });
    PL.ui.note(L.controls, "速率不變，但速度方向持續改變，因此有指向圓心的向心加速度。");
    const rV = PL.ui.readout(L.readouts, { label: "線速率 v=ωr", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "向心加速度", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = AP();
      const cx = W / 2, cy = H / 2, r = sR.get(), w = sW.get(), R = Math.min(W, H) * 0.3 * (r / 5) + 34;
      /* 俯視的實驗桌：馬達轉盤等速轉動，鋼珠黏在盤上距軸心 r 的位置 */
      if (A.deskTop) {
        A.deskTop(ctx, 0, 0, W, H);
        A.turntable(ctx, cx, cy, Math.min(W, H) * 0.3 + 50, ang);
      }
      // 軌道：實線細環＋已走過的弧（淡色），「圓周」看得見
      D.ring(ctx, cx, cy, R, "rgba(180,200,230,0.45)", 2);
      ctx.save(); ctx.strokeStyle = "rgba(120,190,255,0.45)"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, R, ang - 1.1, ang); ctx.stroke(); ctx.restore();
      const bx = cx + R * Math.cos(ang), by = cy + R * Math.sin(ang);
      // 半徑
      D.line(ctx, cx, cy, bx, by, "rgba(255,255,255,0.2)", 1.5);
      // 速度（切線）與加速度（向心）
      /* 箭頭長度跟著 v = ωr 與 a = ω²r：角速度一變，箭頭就變，暫停時也看得出來 */
      const vl = PL.clamp(14 + w * r * 5, 14, 96), al = PL.clamp(10 + w * w * r * 1.6, 10, R * 0.85) / R;
      D.arrow(ctx, bx, by, bx - vl * Math.sin(ang), by + vl * Math.cos(ang), { color: PL.col("accent-2"), width: 2.4, label: "v" });
      D.arrow(ctx, bx, by, bx + (cx - bx) * al, by + (cy - by) * al, { color: PL.col("danger"), width: 2.4, label: "a_c" });
      A.sportBall ? A.sportBall(ctx, bx, by, 11, "steel") : D.disc(ctx, bx, by, 11, { fill: MC() });
      rV.set(w * r, 2); rA.set(w * w * r, 2); rT.set(TAU / w, 2);
    }
    const anim = PL.loop(dt => { if (dt) ang += sW.get() * dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 向心力 —— 課本的「向心力實驗器」：手握玻璃管甩橡皮塞，繩子另一端掛墊圈
   *
   * 舊版是俯視木桌上一顆球繞著一個圓點轉，半徑 1–4 m、質量 1 kg——手甩不動那種東西。
   * 現在照高中實驗的器材與數量級：橡皮塞 10–50 g、半徑 0.2–0.8 m、角速度 2–12 rad/s。
   * 繩子穿過玻璃管，下端掛墊圈（每片 10 g）；墊圈的重量就是繩子的張力，也就是向心力 mω²r。
   * 從斜上方看：橡皮塞在水平面上畫圓（透視成橢圓），轉到後方時會被玻璃管和手擋住。
   * 斷繩時橡皮塞沿切線飛出、墊圈往下掉。
   */
  PL.register("centripetal", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ang = 0, broken = false, fly = null, drop = 0, dropV = 0;
    const sM = PL.ui.slider(L.controls, { label: "橡皮塞質量 m", min: 0.01, max: 0.05, step: 0.005, value: 0.02, unit: "kg", digits: 3 });
    const sR = PL.ui.slider(L.controls, { label: "半徑 r", min: 0.2, max: 0.8, step: 0.05, value: 0.5, unit: "m", digits: 2 });
    const sW = PL.ui.slider(L.controls, { label: "角速度 ω", min: 2, max: 12, step: 0.2, value: 6.2, unit: "rad/s", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "斷繩！", () => { if (!broken) { broken = true; fly = null; drop = 0; dropV = 0; } }, { primary: true });
    PL.ui.button(row, "重新旋轉", () => { broken = false; fly = null; ang = 0; drop = 0; dropV = 0; });
    PL.ui.note(L.controls, "繩子的張力由下方墊圈的重量提供：Mg = mω²r。轉得越快、半徑越大、橡皮塞越重，就得掛越多墊圈。斷繩後橡皮塞沿切線飛出，不是往外甩。");
    const rF = PL.ui.readout(L.readouts, { label: "向心力 F_c", unit: "N" });
    const rV = PL.ui.readout(L.readouts, { label: "線速率 v", unit: "m/s" });
    const rMg = PL.ui.readout(L.readouts, { label: "需掛墊圈 M = F_c/g", unit: "g" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const K = 0.26;                                  // 透視：水平圓看成橢圓的扁率
    const geo = () => { const W = cv.W, H = cv.H, Rmax = Math.min(W * 0.36, H * 0.56); return { W, H, cx: W * 0.44, ty: H * 0.3, Rmax, R: Rmax * sR.get() / 0.8 }; };
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = AP(), G = geo(), { cx, ty, R, Rmax } = G;
      const m = sM.get(), r = sR.get(), w = sW.get(), Fc = m * w * w * r, Mg = Fc / 9.8 * 1000;
      A.labRoom(ctx, W, H, Math.round(H * 0.93), { window: { x: W * 0.76, y: H * 0.07, w: Math.min(160, W * 0.19), h: H * 0.36 } });
      const tb = ty + 150, fl = PL.clamp(12 + Fc * 40, 12, R * 0.8);
      let sx, sy;
      if (broken && fly) { sx = fly.x; sy = fly.y; } else { sx = cx + R * Math.cos(ang); sy = ty + K * R * Math.sin(ang); }
      const behind = !broken && Math.sin(ang) < 0;
      // 水平圓軌道（透視成橢圓）
      ctx.save(); ctx.strokeStyle = PL.theme.pale(0.32); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(cx, ty, R, K * R, 0, 0, TAU); ctx.stroke(); ctx.restore();
      const rs = (4 + 45 * Math.cbrt(m)) * (1 + (sy - ty) / (K * Rmax + 1) * 0.08);
      const stopperAndString = () => { if (!broken) A.cord(ctx, cx, ty, sx, sy); A.stopper(ctx, sx, sy, rs); };
      if (behind) stopperAndString();
      // 玻璃管
      ctx.save();
      const tg = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
      tg.addColorStop(0, "rgba(200,226,240,0.55)"); tg.addColorStop(0.45, "rgba(255,255,255,0.3)"); tg.addColorStop(1, "rgba(170,200,220,0.6)");
      ctx.fillStyle = tg; ctx.fillRect(cx - 6, ty, 12, tb - ty);
      ctx.strokeStyle = PL.theme.isLight() ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.8)"; ctx.lineWidth = 1.2; ctx.strokeRect(cx - 6, ty, 12, tb - ty);
      ctx.restore();
      // 管下的繩、迴紋針記號與墊圈
      const hy = tb + 24 + (Rmax - R) * 0.5 + drop;
      if (broken) A.cord(ctx, cx, hy - 50, cx, hy); else A.cord(ctx, cx, ty, cx, hy);
      if (!broken) { ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx, tb + 12, 3, 6, 0, 0, TAU); ctx.stroke(); }
      const n = PL.clamp(Math.round(Mg / 10), 1, 30);
      ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, hy + 3, 4, Math.PI * 1.1, Math.PI * 1.9 + Math.PI * 0.2); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const yy = hy + 7 + i * 3.4;
        const g = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
        g.addColorStop(0, "rgb(96,104,118)"); g.addColorStop(0.4, "rgb(196,204,216)"); g.addColorStop(1, "rgb(104,112,126)");
        ctx.fillStyle = g; A.rrPath(ctx, cx - 14, yy, 28, 3, 1.5); ctx.fill();
        ctx.strokeStyle = "rgba(30,36,46,0.45)"; ctx.lineWidth = 0.8; ctx.stroke();
      }
      const wb = hy + 7 + n * 3.4;
      if (!broken) D.arrow(ctx, cx, wb + 4, cx, wb + 4 + fl, { color: PL.col("danger"), width: 2.4, label: "Mg" });
      D.text(ctx, "墊圈 " + n + " 片 ≈ " + Math.round(Mg) + " g", cx + 24, hy + 16, { color: PL.col("text"), size: 11, weight: "700" });
      D.text(ctx, "Mg = mω²r（張力提供向心力）", cx + 24, hy + 32, { color: PL.col("text-dim"), size: 10 });
      // 手握住玻璃管
      A.hand(ctx, cx + 2, ty + 112, 1, 1, { pull: true, ang: -0.7 });
      if (!behind) stopperAndString();
      if (!broken) {
        const ux = cx - sx, uy = ty - sy, ul = Math.hypot(ux, uy) || 1;
        D.arrow(ctx, sx, sy, sx + ux / ul * fl, sy + uy / ul * fl, { color: PL.col("danger"), width: 2.4, label: "F_c" });
        const tx = -Math.sin(ang) * R, tv = K * R * Math.cos(ang), tl = Math.hypot(tx, tv) || 1, vl = PL.clamp(14 + w * r * 9, 14, 90);
        D.arrow(ctx, sx, sy, sx + tx / tl * vl, sy + tv / tl * vl, { color: PL.col("accent-2"), width: 2, label: "v" });
        D.text(ctx, "r = " + PL.fmt(r, 2) + " m", (cx + sx) / 2, (ty + sy) / 2 - 10, { color: PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
      } else if (fly) {
        const vl = Math.hypot(fly.vx, fly.vy) || 1;
        D.arrow(ctx, sx, sy, sx + fly.vx / vl * 50, sy + fly.vy / vl * 50, { color: PL.col("accent-2"), width: 2, label: "沿切線飛出" });
        D.text(ctx, "慢動作 ×0.35", 16, 22, { color: PL.col("text-dim"), size: 11, weight: "700" });
      }
      rF.set(Fc, 3); rV.set(w * r, 2); rMg.set(Mg, 1); rT.set(TAU / w, 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        if (!broken) ang += sW.get() * dt;
        else {
          const G = geo(), w = sW.get();
          if (!fly) fly = { x: G.cx + G.R * Math.cos(ang), y: G.ty + K * G.R * Math.sin(ang), vx: -G.R * Math.sin(ang) * w, vy: K * G.R * Math.cos(ang) * w };
          const sl = dt * 0.35;                         // 斷繩後放慢動作，切線方向才看得清楚
          fly.x += fly.vx * sl; fly.y += fly.vy * sl;
          dropV += 900 * sl; drop += dropV * sl;
          if ((fly.x < -30 || fly.x > cv.W + 30 || fly.y < -30 || fly.y > cv.H + 30) && drop > cv.H) { broken = false; fly = null; ang = 0; drop = 0; dropV = 0; }
        }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 角動量守恆 */
  PL.register("angular-momentum", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const m = 1, Lmom = 1 * 3 * 2; // L = m v r（固定）
    let ang = 0, trail = [];
    const sR = PL.ui.slider(L.controls, { label: "半徑 r（拉繩調整）", min: 0.8, max: 3.2, step: 0.1, value: 3, unit: "m", digits: 1 });
    PL.ui.note(L.controls, "外力沿繩指向圓心、不產生力矩，故角動量 L 守恆：半徑縮小，轉速就變快。");
    const rL = PL.ui.readout(L.readouts, { label: "角動量 L", unit: "（守恆）" });
    const rW = PL.ui.readout(L.readouts, { label: "角速度 ω", unit: "rad/s" });
    const rV = PL.ui.readout(L.readouts, { label: "線速率 v", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = AP();
      const cx = W / 2, cy = H / 2, r = sR.get(), R = 30 + r * 42;
      const w = Lmom / (m * r * r), v = w * r;
      /* 氣墊桌（幾乎無摩擦）中央開一個洞，繩子穿過洞，從桌下把繩子往下拉 → 半徑變小 */
      if (A.airTable) {
        A.deskTop(ctx, 0, 0, W, H);
        A.airTable(ctx, cx - Math.min(W * 0.46, 210), 8, Math.min(W * 0.92, 420), H - 16, { hole: { x: cx, y: cy } });
      }
      D.ring(ctx, cx, cy, R, "rgba(90,110,140,0.35)", 1.5, [4, 4]);
      const bx = cx + R * Math.cos(ang), by = cy + R * Math.sin(ang);
      // 最近兩秒的軌跡：拉繩時畫出向內捲的螺線，轉速變快一眼看得出來
      if (trail.length > 1) {
        ctx.save(); ctx.lineCap = "round";
        for (let i = 1; i < trail.length; i++) {
          const a = i / trail.length;
          if (Math.abs(trail[i].r - trail[i - 1].r) > 6) continue;      // 拉繩瞬間半徑跳動，不畫那條弦
          ctx.strokeStyle = "rgba(47,111,208," + PL.fmt(a * 0.55, 3) + ")"; ctx.lineWidth = 1 + a * 3;
          ctx.beginPath(); ctx.moveTo(cx + trail[i - 1].r * Math.cos(trail[i - 1].a), cy + trail[i - 1].r * Math.sin(trail[i - 1].a));
          ctx.lineTo(cx + trail[i].r * Math.cos(trail[i].a), cy + trail[i].r * Math.sin(trail[i].a)); ctx.stroke();
        }
        ctx.restore();
      }
      A.cord ? A.cord(ctx, cx, cy, bx, by) : D.line(ctx, cx, cy, bx, by, MC(), 2);
      D.arrow(ctx, cx, cy, cx + (bx - cx) * 0.4, cy + (by - cy) * 0.4, { color: PL.col("danger"), width: 2, label: "拉力" });
      const va = 18 + v * 6; D.arrow(ctx, bx, by, bx - va * Math.sin(ang), by + va * Math.cos(ang), { color: PL.col("accent-2"), width: 2, label: "v" });
      A.poolBall ? A.poolBall(ctx, bx, by, 12, "#2f6fd0", null) : D.disc(ctx, bx, by, 11, { fill: MC() });
      D.text(ctx, "繩子從洞口往下拉", cx + 12, cy - 14, { color: PL.col("text-dim"), size: 10 });
      // 右下角側視小圖：桌面下的手把繩子往下拉，拉得越多半徑越小
      if (W >= 640 && A.infoCard) {
        const iw = 150, ih = 118, ix = W - iw - 12, iy = H - ih - 12;
        A.infoCard(ctx, ix, iy, iw, ih);
        ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
        D.text(ctx, "側視：桌下拉繩", ix + 8, iy + 15, { color: PL.col("text"), size: 10, weight: "700" });
        const tyy = iy + 38, hx = ix + iw / 2;
        A.steel(ctx, ix + 12, tyy, iw - 24, 6, -6);
        ctx.fillStyle = "rgb(20,22,26)"; ctx.fillRect(hx - 2, tyy, 4, 6);
        const pullY = tyy + 12 + (3.2 - r) / 2.4 * 34;
        A.cord(ctx, hx + 8 + r * 12, tyy - 5, hx, tyy); A.cord(ctx, hx, tyy + 6, hx, pullY);
        A.poolBall(ctx, hx + 8 + r * 12, tyy - 6, 5, "#2f6fd0", null);
        A.hand(ctx, hx - 5, pullY + 3, 1, 0.5, { pull: true, ang: -1.4 });
        D.arrow(ctx, hx + 20, tyy + 14, hx + 20, pullY + 4, { color: PL.col("danger"), width: 1.6, head: 5 });
        ctx.restore();
      }
      rL.set(Lmom, 1); rW.set(w, 2); rV.set(v, 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        const r = sR.get(); ang += (Lmom / (m * r * r)) * dt;
        trail.push({ a: ang, r: 30 + r * 42 }); if (trail.length > 110) trail.shift();
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 剛體轉動與轉動慣量 */
  PL.register("rotation", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let w = 0, ang = 0;
    const sTau = PL.ui.slider(L.controls, { label: "外加力矩 τ", min: 0, max: 12, step: 0.5, value: 6, unit: "N·m", digits: 1 });
    const sI = PL.ui.slider(L.controls, { label: "轉動慣量 I", min: 1, max: 10, step: 0.5, value: 4, unit: "kg·m²", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "施加力矩", () => { anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", () => { w = 0; ang = 0; });
    PL.ui.note(L.controls, "τ = Iα 是轉動版的牛頓第二定律；轉動慣量越大越難改變轉動狀態。");
    const rI = PL.ui.readout(L.readouts, { label: "轉動慣量 I", unit: "kg·m²" });
    const rA = PL.ui.readout(L.readouts, { label: "角加速度 α", unit: "rad/s²" });
    const rW = PL.ui.readout(L.readouts, { label: "角速度 ω", unit: "rad/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.32;
      const A = AP();
      /* 轉動慣量實驗：飛輪架在支架上。I 越大，配重塊被推得離軸越遠 */
      if (A.flywheel) {
        A.benchTop(ctx, W, H, H - 30);
        A.steel(ctx, cx - 7, cy, 14, H - 30 - cy, 8);
        A.steel(ctx, cx - 60, H - 38, 120, 9, -6);
        const massR = R * (0.28 + 0.62 * Math.sqrt((sI.get() - 1) / 9));
        A.flywheel(ctx, cx, cy, R, ang, massR, 6);
        // 標記線：看得出轉了幾圈
        D.line(ctx, cx, cy, cx + (R - 8) * Math.cos(ang), cy + (R - 8) * Math.sin(ang), MC(), 3);
      }
      /* 力矩箭頭的弧長 ∝ τ；配重所在半徑畫成虛線圈，I 一變就看得到 */
      if (A.flywheel) D.ring(ctx, cx, cy, R * (0.28 + 0.62 * Math.sqrt((sI.get() - 1) / 9)), "rgba(255,210,110,0.55)", 1.4, [4, 4]);
      const tq = sTau.get(), span = 0.12 + 1.1 * tq / 12;
      if (tq > 0) {
        ctx.save(); ctx.strokeStyle = PL.col("danger"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx, cy, R + 16, -span, span); ctx.stroke(); ctx.restore();
        D.arrow(ctx, cx + (R + 16) * Math.cos(span), cy + (R + 16) * Math.sin(span), cx + (R + 16) * Math.cos(span + 0.16), cy + (R + 16) * Math.sin(span + 0.16), { color: PL.col("danger"), width: 2.4, label: "τ" });
      }
      rI.set(sI.get(), 1); rA.set(sTau.get() / sI.get(), 2); rW.set(w, 2);
    }
    const anim = PL.loop(dt => { if (dt) { w += (sTau.get() / sI.get()) * dt; ang += w * dt; } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 鉛直圓周運動 */
  PL.register("vertical-circle", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.8);
    const g = 9.8, m = 1; let beta = 0, dir = 1, mode = "circle", px = 0, py = 0, vx = 0, vy = 0;
    const sV = PL.ui.slider(L.controls, { label: "最低點速率 v₀", min: 2, max: 10, step: 0.5, value: 7, unit: "m/s", digits: 1, onInput: reset });
    const sR = PL.ui.slider(L.controls, { label: "半徑 r", min: 1, max: 3, step: 0.5, value: 2, unit: "m", digits: 1, onInput: reset });
    /* 持續繞行，保留播放/暫停以便暫停觀察；這顆維持單純重置。 */
    PL.ui.button(PL.ui.buttonRow(L.controls), "重新開始", reset, { primary: true });
    PL.ui.note(L.controls, "要能通過最高點，該處速率至少 √(gr)，否則繩鬆脫、物體脫離圓周。");
    const rTop = PL.ui.readout(L.readouts, { label: "頂點速率", unit: "m/s" });
    const rT = PL.ui.readout(L.readouts, { label: "底點張力", unit: "N" });
    const rMin = PL.ui.readout(L.readouts, { label: "過頂最小速率", unit: "m/s" });
    function reset() { beta = 0; dir = 1; mode = "circle"; }
    reset();
    const speed2 = b => sV.get() * sV.get() - 2 * g * sR.get() * (1 - Math.cos(b));
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const r = sR.get(), cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.3;
      const A = AP();
      /* 鐵架上的轉軸：小球綁在繩子一端，在鉛直面上繞著轉軸甩 */
      if (A.standRod) {
        A.benchTop(ctx, W, H, H - 20);
        A.standRod(ctx, cx - R - 50, H - 18, cy - 30);
        A.crossArm(ctx, cx - R - 50, cy, cx);
      }
      D.ring(ctx, cx, cy, R, "rgba(120,130,150,0.35)", 1.4, [5, 5]);
      A.brassDisc ? A.brassDisc(ctx, cx, cy, 6) : D.disc(ctx, cx, cy, 4, { fill: PL.col("text-faint") });
      let ballx, bally;
      if (mode === "circle") {
        ballx = cx + R * Math.sin(beta); bally = cy + R * Math.cos(beta);
        A.cord ? A.cord(ctx, cx, cy, ballx, bally) : D.line(ctx, cx, cy, ballx, bally, MC(), 2);
        const v2 = Math.max(0, speed2(beta)), T = m * v2 / r + m * g * Math.cos(beta);
        if (T > 0) { const f = PL.clamp(T / 80, 0.12, 0.5); D.arrow(ctx, ballx, bally, ballx + (cx - ballx) * f, bally + (cy - bally) * f, { color: PL.col("danger"), width: 2, label: "T" }); }
      } else { ballx = px; bally = py; D.text(ctx, "繩鬆脫，物體脫離圓周！", cx, H - 14, { color: PL.col("danger"), size: 12, align: "center" }); }
      A.sportBall ? A.sportBall(ctx, ballx, bally, 12, "steel") : D.disc(ctx, ballx, bally, 11, { fill: MC() });
      const vt2 = speed2(Math.PI);
      rTop.set(vt2 > 0 ? Math.sqrt(vt2) : 0, 2); rT.set(m * sV.get() * sV.get() / r + m * g, 1); rMin.set(Math.sqrt(g * r), 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.02);
        const r = sR.get(), cx = cv.W / 2, cy = cv.H * 0.46, R = Math.min(cv.W, cv.H) * 0.3, scale = R / r;
        if (mode === "circle") {
          const v2 = speed2(beta);
          if (v2 <= 0) { dir = -dir; beta += dir * 0.02; }
          else {
            const T = m * v2 / r + m * g * Math.cos(beta), v = Math.sqrt(v2);
            if (Math.cos(beta) < 0 && T < 0) { px = cx + R * Math.sin(beta); py = cy + R * Math.cos(beta); vx = dir * v * Math.cos(beta); vy = -dir * v * Math.sin(beta); mode = "projectile"; }
            else beta += dir * (v / r) * dt;
          }
        } else { vy += g * dt; px += vx * scale * dt; py += vy * scale * dt; if (py > cv.H + 20) reset(); }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
