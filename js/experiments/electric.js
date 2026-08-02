/* 模組十 · 電場與電路 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4db6ac");
  const POS = "#ff6b6b", NEG = "#5aa2ff";

  /* 庫侖定律 */
  PL.register("coulomb", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sQ1 = PL.ui.slider(L.controls, { label: "電荷 q₁", min: -5, max: 5, step: 0.5, value: 3, unit: "μC", digits: 1, onInput: draw });
    const sQ2 = PL.ui.slider(L.controls, { label: "電荷 q₂", min: -5, max: 5, step: 0.5, value: -2, unit: "μC", digits: 1, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "距離 r", min: 2, max: 10, step: 0.5, value: 5, unit: "cm", digits: 1, onInput: draw });
    const rF = PL.ui.readout(L.readouts, { label: "靜電力 F", unit: "（相對）" });
    const rDir = PL.ui.readout(L.readouts, { label: "方向" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q1 = sQ1.get(), q2 = sQ2.get(), r = sR.get(), F = 9 * q1 * q2 / (r * r);
      const attract = q1 * q2 < 0, cy = 96, ox = 70, sc = (W - 140) / 10, x1 = ox, x2 = ox + r * sc;
      const drawQ = (x, q) => { D.disc(ctx, x, cy, 10 + Math.abs(q) * 2, { fill: q >= 0 ? POS : NEG, glow: q >= 0 ? POS : NEG, glowSize: 10 }); D.text(ctx, (q >= 0 ? "+" : "−") + Math.abs(q), x, cy + 4, { color: "#fff", size: 12, align: "center", weight: "700" }); };
      drawQ(x1, q1); drawQ(x2, q2);
      const fl = PL.clamp(Math.abs(F) * 3, 6, 70), dir = attract ? -1 : 1;
      D.arrow(ctx, x1, cy - 26, x1 + dir * fl, cy - 26, { color: PL.col("warn"), width: 2.4 });
      D.arrow(ctx, x2, cy - 26, x2 - dir * fl, cy - 26, { color: PL.col("warn"), width: 2.4 });
      D.line(ctx, x1, cy + 26, x2, cy + 26, PL.col("text-faint"), 1, [3, 3]); D.text(ctx, "r = " + r + " cm", (x1 + x2) / 2, cy + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      const bx = 44, by = 150, bw = W - 80, bh = H - by - 16;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 2, x1: 10, y0: 0, y1: 9 * Math.abs(q1 * q2) / 4 * 1.1 + 1 });
      g.frame({ title: "靜電力大小對距離（平方反比）", xlabel: "r", ylabel: "|F|" }); g.grid(4, 4);
      g.fn(rr => 9 * Math.abs(q1 * q2) / (rr * rr), { color: MC(), width: 2.2 });
      g.dot(r, Math.abs(F), { color: PL.col("warn"), glow: PL.col("warn") });
      rF.set(Math.abs(F), 2); rDir.set(attract ? "相吸" : "相斥");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 電場線與等勢面 */
  PL.register("efield", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sQ1 = PL.ui.slider(L.controls, { label: "左電荷 q₁", min: -3, max: 3, step: 1, value: 2, unit: "", digits: 0, onInput: draw });
    const sQ2 = PL.ui.slider(L.controls, { label: "右電荷 q₂", min: -3, max: 3, step: 1, value: -2, unit: "", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "電場線由正電荷發出、進入負電荷；線越密處電場越強。");
    const rNote = PL.ui.readout(L.readouts, { label: "組態" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, q1 = sQ1.get(), q2 = sQ2.get();
      const charges = [{ x: W * 0.36, y: cy, q: q1 }, { x: W * 0.64, y: cy, q: q2 }].filter(c => c.q !== 0);
      const E = (x, y) => { let ex = 0, ey = 0; charges.forEach(c => { const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2) + 1e-3; const e = c.q / r2; ex += e * dx / r; ey += e * dy / r; }); return { ex, ey }; };
      // 場線
      charges.forEach(c => {
        if (c.q === 0) return; const n = 8 + Math.abs(c.q) * 4, sgn = c.q > 0 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const a = TAU * i / n; let x = c.x + Math.cos(a) * 12, y = c.y + Math.sin(a) * 12;
          ctx.save(); ctx.strokeStyle = "rgba(77,182,170,0.55)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < 260; s++) { const f = E(x, y); const m = Math.hypot(f.ex, f.ey) + 1e-6; x += sgn * f.ex / m * 4; y += sgn * f.ey / m * 4; if (x < 0 || x > W || y < 0 || y > H) break; let hit = false; charges.forEach(o => { if (o.q * c.q < 0 && Math.hypot(x - o.x, y - o.y) < 12) hit = true; }); ctx.lineTo(x, y); if (hit) break; }
          ctx.stroke(); ctx.restore();
        }
      });
      charges.forEach(c => { D.disc(ctx, c.x, c.y, 13, { fill: c.q > 0 ? POS : NEG, glow: c.q > 0 ? POS : NEG, glowSize: 12 }); D.text(ctx, c.q > 0 ? "+" : "−", c.x, c.y + 5, { color: "#fff", size: 16, align: "center", weight: "700" }); });
      rNote.set(q1 * q2 < 0 ? "電偶極" : q1 === 0 || q2 === 0 ? "單電荷" : "同號電荷");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 電位與電位能（平行板均勻電場） */
  PL.register("potential-e", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let tp = 0.5;
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 20, max: 200, step: 10, value: 100, unit: "V", digits: 0, onInput: draw });
    const sD = PL.ui.slider(L.controls, { label: "板間距 d", min: 2, max: 8, step: 0.5, value: 4, unit: "cm", digits: 1, onInput: draw });
    const sPos = PL.ui.slider(L.controls, { label: "試驗電荷位置", min: 0, max: 1, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: v => { tp = v; draw(); } });
    const rE = PL.ui.readout(L.readouts, { label: "電場 E=V/d", unit: "V/cm" });
    const rV = PL.ui.readout(L.readouts, { label: "該處電位", unit: "V" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      /*
       * 原本上下板固定畫在 y = 40 與 H − 40，「板間距 d」這根滑桿
       * 只改變讀數上的數字，畫面完全不動；電壓 V 也只改變文字。
       * 於是 E = V/d 這個核心關係在畫面上看不到任何線索。
       *
       * 改成：板間距真的隨 d 改變（以滑桿上限 8 cm 對應最大間距），
       * 電場箭頭的密度與長度隨 E = V/d 改變。
       * 把 d 拉小或把 V 拉大，箭頭就變密變長——電場變強是看得見的。
       */
      const V = sV.get(), d = sD.get(), plateL = 60, plateR = W - 60;
      const D_MAX = 8, maxGap = H - 96;
      const gap = maxGap * (0.28 + 0.72 * d / D_MAX);
      const topY = (H - gap) / 2, botY = topY + gap;
      D.rect(ctx, plateL, topY - 8, plateR - plateL, 8, { fill: POS }); D.text(ctx, "+" + V + "V", plateL - 6, topY - 2, { color: POS, size: 11, align: "right" });
      D.rect(ctx, plateL, botY, plateR - plateL, 8, { fill: NEG }); D.text(ctx, "0 V", plateL - 6, botY + 8, { color: NEG, size: 11, align: "right" });
      // 均勻電場線（向下）
      // 電場強度 E = V/d：箭頭越密代表場越強，這是課本畫電場線的標準約定
      const Efield = V / (d / 100);                       // V/m
      const spacing = PL.clamp(2200 / Math.sqrt(Efield), 16, 70);
      for (let x = plateL + 12; x < plateR; x += spacing) D.arrow(ctx, x, topY, x, botY, { color: "rgba(77,182,170,0.4)", width: 1.5 });
      // 等勢線
      for (let i = 1; i < 5; i++) { const y = PL.lerp(topY, botY, i / 5); D.line(ctx, plateL, y, plateR, y, "rgba(255,255,255,0.12)", 1, [4, 4]); D.text(ctx, PL.fmt(V * (1 - i / 5), 0) + "V", plateR + 4, y + 3, { color: PL.col("text-faint"), size: 9 }); }
      // 試驗電荷
      const cyq = PL.lerp(topY, botY, tp), cx = W / 2;
      D.disc(ctx, cx, cyq, 9, { fill: POS, glow: POS, glowSize: 8 });
      D.arrow(ctx, cx, cyq, cx, cyq + 34, { color: PL.col("warn"), width: 2.2, label: "qE" });
      rE.set(V / d, 1); rV.set(V * (1 - tp), 0);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 歐姆定律與電路 */
  /* 歐姆定律與電路 —— 旗艦改版
   *
   * PhET 的設計文件說：「學生會刻意把模擬推到極端，看它會不會有合理的反應；
   * 模擬需要以有意義的方式壞掉。」他們的電路套件裡，電阻超載時真的會冒煙。
   *
   * 這一版把抽象的「電壓滑桿 + 電流讀數」換成一個看得懂的實體電路：
   *   - 燈泡會依功率改變亮度，電流大到超過額定就會燒掉（可換新的）
   *   - 保險絲會先斷，示範它存在的理由
   *   - 電子流的速度與電流成正比，看得見「電流大小」是什麼意思
   *   - 可以切換串聯與並聯，直接比較總電阻與各支路電流
   */
  PL.register("ohms", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58, 820);
    let t = 0, burnt = false, fuseBlown = false, burnFlash = 0;

    const BULB_MAX_POWER = 12;   // 額定功率（W），超過就燒掉
    /*
     * 保險絲額定必須「低於」燈泡的額定電流，否則燈泡永遠先燒，
     * 保險絲就完全沒有保護作用，這個實驗要教的東西也就不成立。
     * 燈泡額定 12 W / 3Ω → 額定電流 √(12/3) = 2.0 A，因此保險絲取 1.5 A。
     */
    const FUSE_LIMIT = 1.5;      // 保險絲額定電流（A）

    PL.ui.section(L.controls, "電源與元件");
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 1, max: 24, step: 0.5, value: 6, unit: "V", digits: 1, onInput: onChange });
    const sR = PL.ui.slider(L.controls, { label: "電阻 R", min: 1, max: 20, step: 0.5, value: 4, unit: "Ω", digits: 1, onInput: onChange });

    PL.ui.section(L.controls, "電路接法");
    let wiring = "single";
    PL.ui.chipGroup(L.controls, {
      value: "single",
      options: [
        { value: "single", label: "單一電阻" },
        { value: "series", label: "串聯兩個" },
        { value: "parallel", label: "並聯兩個" }
      ],
      onChange: v => { wiring = v; onChange(); }
    });

    PL.ui.section(L.controls, "保護裝置");
    const cFuse = PL.ui.checkbox(L.controls, { label: "裝上保險絲（" + FUSE_LIMIT + " A）", checked: true, onChange: onChange });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "換新燈泡／保險絲", () => { burnt = false; fuseBlown = false; burnFlash = 0; }, { primary: true });

    PL.ui.note(L.controls,
      "把電壓一路調高，看看會先發生什麼事——這顆燈泡的額定功率是 " + BULB_MAX_POWER + " W。" +
      "拿掉保險絲再試一次，比較兩者的差別。接著切換串聯與並聯，注意總電阻與燈泡亮度怎麼變。");

    const rI = PL.ui.readout(L.readouts, { label: "電流 I", unit: "A" });
    const rReq = PL.ui.readout(L.readouts, { label: "總電阻", unit: "Ω" });
    const rP = PL.ui.readout(L.readouts, { label: "燈泡功率", unit: "W" });
    const rVb = PL.ui.readout(L.readouts, { label: "燈泡分壓", unit: "V" });

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "I–V 特性曲線（歐姆定律）",
      cap: "定電阻下電流與電壓成正比，直線斜率為 1/R；電阻越大線越平。紅色區域是燈泡會燒掉的範圍。"
    });

    function onChange() { /* 參數改變時保持燒毀狀態，讓學生看到後果不會自動消失 */ }

    /*
     * 電路計算
     * 燈泡本身也有電阻（這裡取固定值，不模擬燈絲的溫度效應），
     * 與可調電阻依接法組合出總電阻。
     */
    const BULB_R = 3;
    function circuit() {
      const V = sV.get(), R = sR.get();
      let Rtotal, bulbShare;
      if (wiring === "series") {
        Rtotal = BULB_R + R + R;          // 燈泡 + 兩個電阻串聯
        bulbShare = BULB_R / Rtotal;
      } else if (wiring === "parallel") {
        Rtotal = BULB_R + (R * R) / (R + R);  // 燈泡串上兩個並聯電阻
        bulbShare = BULB_R / Rtotal;
      } else {
        Rtotal = BULB_R + R;
        bulbShare = BULB_R / Rtotal;
      }
      const openCircuit = burnt || fuseBlown;
      const I = openCircuit ? 0 : V / Rtotal;
      const Vb = I * BULB_R;
      const P = I * I * BULB_R;
      return { V, R, Rtotal, I, Vb, P, bulbShare, openCircuit };
    }

    /* 額定判定：先斷保險絲，沒有保險絲才燒燈泡——這就是保險絲的用意 */
    function checkLimits() {
      if (burnt || fuseBlown) return;
      const c = circuit();
      if (cFuse.get() && c.I > FUSE_LIMIT) { fuseBlown = true; burnFlash = 1; return; }
      if (c.P > BULB_MAX_POWER) { burnt = true; burnFlash = 1; }
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const c = circuit();

      const x0 = 58, x1 = W - 58, y0 = 52, y1 = H - 58;
      const wireColor = c.openCircuit ? PL.col("text-faint") : m;

      // 導線迴路
      ctx.save();
      ctx.strokeStyle = wireColor; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();

      // 電池：長短線是課本的畫法，學生認得
      const by = (y0 + y1) / 2;
      D.rect(ctx, x0 - 13, by - 30, 26, 60, { fill: PL.theme.shade(0.35), r: 3 });
      D.line(ctx, x0, by - 16, x0, by + 16, PL.theme.pale(0.85), 4);
      D.line(ctx, x0 - 7, by - 8, x0 - 7, by + 8, PL.theme.pale(0.85), 2);
      D.text(ctx, PL.fmt(c.V, 1) + " V", x0 - 18, by + 4, { color: PL.col("text-dim"), size: 12, align: "right", weight: "700" });

      // 燈泡
      const bulbX = (x0 + x1) / 2, bulbY = y0;
      const brightness = burnt ? 0 : Math.min(1, c.P / BULB_MAX_POWER);
      if (brightness > 0.02) {
        ctx.save();
        ctx.globalAlpha = 0.16 + brightness * 0.55;
        D.disc(ctx, bulbX, bulbY, 20 + brightness * 26, { fill: "#ffd76a" });
        ctx.restore();
      }
      D.disc(ctx, bulbX, bulbY, 15, {
        fill: burnt ? "#3a3a3a" : "rgb(" + Math.round(90 + brightness * 165) + "," +
          Math.round(85 + brightness * 140) + "," + Math.round(70 + brightness * 40) + ")",
        stroke: PL.theme.pale(0.5), width: 1.5
      });
      D.rect(ctx, bulbX - 7, bulbY + 13, 14, 9, { fill: PL.theme.pale(0.42), r: 2 });
      if (burnt) {
        D.line(ctx, bulbX - 8, bulbY - 8, bulbX + 8, bulbY + 8, PL.col("danger"), 2.5);
        D.line(ctx, bulbX + 8, bulbY - 8, bulbX - 8, bulbY + 8, PL.col("danger"), 2.5);
      }
      D.text(ctx, burnt ? "燈泡燒毀" : PL.fmt(c.P, 1) + " W", bulbX, bulbY - 30,
        { color: burnt ? PL.col("danger") : PL.col("warn"), size: 12, align: "center", weight: "700" });

      // 保險絲
      if (cFuse.get()) {
        const fx = x0 + (x1 - x0) * 0.24;
        D.rect(ctx, fx - 17, y1 - 9, 34, 18, { fill: PL.theme.shade(0.4), stroke: PL.theme.pale(0.35), r: 4 });
        if (fuseBlown) {
          D.line(ctx, fx - 10, y1, fx - 3, y1, PL.col("danger"), 2);
          D.line(ctx, fx + 3, y1, fx + 10, y1, PL.col("danger"), 2);
          D.text(ctx, "保險絲斷了", fx, y1 + 26, { color: PL.col("danger"), size: 11, align: "center", weight: "700" });
        } else {
          D.line(ctx, fx - 11, y1, fx + 11, y1, PL.col("ok"), 2);
          D.text(ctx, FUSE_LIMIT + " A", fx, y1 + 26, { color: PL.col("text-faint"), size: 10, align: "center" });
        }
      }

      // 電阻：鋸齒是課本畫法
      function resistor(cx, cy, label, vertical) {
        const len = 54;
        ctx.save();
        ctx.translate(cx, cy);
        if (vertical) ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = PL.col("accent-2"); ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-len / 2, 0);
        for (let i = 0; i < 6; i += 1) ctx.lineTo(-len / 2 + 4 + i * 9, (i % 2 ? 8 : -8));
        ctx.lineTo(len / 2, 0); ctx.stroke();
        ctx.restore();
        D.text(ctx, label, cx, cy - 16, { color: PL.col("accent-2"), size: 11, align: "center" });
      }

      if (wiring === "single") {
        resistor(x1, (y0 + y1) / 2, PL.fmt(c.R, 1) + "Ω", true);
      } else if (wiring === "series") {
        resistor(x1, y0 + (y1 - y0) * 0.32, PL.fmt(c.R, 1) + "Ω", true);
        resistor(x1, y0 + (y1 - y0) * 0.68, PL.fmt(c.R, 1) + "Ω", true);
      } else {
        // 並聯：兩條支路並排，總電阻變小、電流變大
        const mx = x1 - 46;
        D.line(ctx, x1, y0 + 22, mx, y0 + 22, wireColor, 2.2);
        D.line(ctx, x1, y1 - 22, mx, y1 - 22, wireColor, 2.2);
        D.line(ctx, mx, y0 + 22, mx, y1 - 22, wireColor, 2.2);
        resistor(x1, (y0 + y1) / 2, PL.fmt(c.R, 1) + "Ω", true);
        resistor(mx, (y0 + y1) / 2, PL.fmt(c.R, 1) + "Ω", true);
        D.text(ctx, "並聯後 " + PL.fmt(c.R / 2, 1) + "Ω", mx - 8, y0 + 12,
          { color: PL.col("accent-2"), size: 10, align: "right" });
      }

      // 電子流：速度正比於電流，「電流大小」因此看得見
      if (!c.openCircuit && c.I > 0.001) {
        const peri = 2 * ((x1 - x0) + (y1 - y0));
        const count = 22;
        for (let i = 0; i < count; i += 1) {
          let d = ((t * c.I * 42 + i * peri / count) % peri + peri) % peri;
          let ex, ey;
          if (d < x1 - x0) { ex = x0 + d; ey = y0; }
          else if (d < (x1 - x0) + (y1 - y0)) { ex = x1; ey = y0 + (d - (x1 - x0)); }
          else if (d < 2 * (x1 - x0) + (y1 - y0)) { ex = x1 - (d - (x1 - x0) - (y1 - y0)); ey = y1; }
          else { ex = x0; ey = y1 - (d - 2 * (x1 - x0) - (y1 - y0)); }
          D.disc(ctx, ex, ey, 3, { fill: PL.col("accent-2") });
        }
      }

      // 燒毀瞬間的回饋
      if (burnFlash > 0) {
        const target = fuseBlown ? { x: x0 + (x1 - x0) * 0.24, y: y1 } : { x: bulbX, y: bulbY };
        ctx.save(); ctx.globalAlpha = burnFlash;
        D.ring(ctx, target.x, target.y, (1 - burnFlash) * 46 + 10, PL.col("danger"), 3);
        ctx.restore();
      }

      PL.ui.caption(cv,
        fuseBlown ? "電流超過 " + FUSE_LIMIT + " A，保險絲先斷開，燈泡被保住了——這就是保險絲存在的理由。"
          : burnt ? "功率超過額定 " + BULB_MAX_POWER + " W，燈絲燒斷。若剛才裝了保險絲，斷的會是保險絲而不是燈泡。"
            : "電子的流動速度正比於電流；燈泡亮度正比於它消耗的功率 P = I²R。");
      if ((burnt || fuseBlown) && circuit().V / circuit().Rtotal > FUSE_LIMIT) {
        D.text(ctx, "換新之前先把電壓調低，否則會立刻再燒一次", W / 2, H - 22,
          { color: PL.col("warn"), size: 11.5, align: "center" });
      }

      rI.set(c.I, 2); rReq.set(c.Rtotal, 1); rP.set(c.P, 2); rVb.set(c.Vb, 2);
    }

    function chart() {
      cc.clear();
      const c = circuit();
      const gph = PL.graph(cc, { x: 40, y: 14, w: cc.W - 54, h: cc.H - 34 }, { x0: 0, x1: 24, y0: 0, y1: 5 });
      gph.frame({ xlabel: "V (V)", ylabel: "I (A)" });
      gph.grid(6, 5);
      // 燒毀區：把「極限」畫出來，學生才知道自己在逼近什麼
      const burnI = Math.sqrt(BULB_MAX_POWER / BULB_R);
      gph.hline(burnI, { color: PL.col("danger"), dash: [4, 3], width: 1.4 });
      gph.label(0.6, burnI + 0.22, "燈泡額定上限 " + burnI.toFixed(2) + " A",
        { color: PL.col("danger"), size: 9.5 });
      if (cFuse.get()) {
        gph.hline(FUSE_LIMIT, { color: PL.col("warn"), dash: [3, 3], width: 1.2 });
        gph.label(0.6, FUSE_LIMIT + 0.22, "保險絲 " + FUSE_LIMIT + " A", { color: PL.col("warn"), size: 9.5 });
      }
      gph.fn(v => v / c.Rtotal, { color: MC(), width: 2.2 });
      if (!c.openCircuit) gph.dot(c.V, c.I, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        checkLimits();
        if (burnFlash > 0) burnFlash = Math.max(0, burnFlash - dt * 1.1);
      }
      drawAll();
    }, 45);

    cv.onResize(scene); cc.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cc.destroy(); },
      rerender: drawAll
    };
  }});

  /* 伏安法量電阻：安培計串聯、電壓計並聯，記錄 U-I 資料 */
  PL.register("iv-measurement", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let records = [], feedback = "調整可變電阻後，記錄一組電壓計與安培計讀值。";
    PL.ui.section(L.controls, "量測電路");
    const sE = PL.ui.slider(L.controls, { label: "電源電壓 E", min: 3, max: 12, step: 0.5, value: 9, unit: "V", digits: 1, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "被測電阻 R", min: 2, max: 20, step: 1, value: 8, unit: "Ω", digits: 0, onInput: () => { records = []; feedback = "被測電阻已更換，請重新量測。"; draw(); } });
    const sRv = PL.ui.slider(L.controls, { label: "可變電阻 Rᵥ", min: 1, max: 40, step: 1, value: 10, unit: "Ω", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "量測接線：安培計 A 與被測電阻串聯；電壓計 V 並聯在被測電阻兩端。");
    const actions = PL.ui.buttonRow(L.controls);
    PL.ui.button(actions, "記錄讀值", () => {
      const s = state();
      if (records.some(p => Math.abs(p.Rv - s.Rv) < 1e-8)) { feedback = "這個可變電阻位置已記錄，請先調整 Rᵥ。"; draw(); return; }
      records.push({ I: s.I, U: s.U, Rv: s.Rv });
      if (records.length > 9) records.shift();
      feedback = "已記錄第 " + records.length + " 組資料：U=" + PL.fmt(s.U, 2) + " V、I=" + PL.fmt(s.I, 3) + " A。";
      draw();
    }, { primary: true });
    PL.ui.button(actions, "清空資料", () => { records = []; feedback = "量測資料已清空。"; draw(); });
    const rI = PL.ui.readout(L.readouts, { label: "安培計 I", unit: "A" });
    const rU = PL.ui.readout(L.readouts, { label: "電壓計 U", unit: "V" });
    const rNowR = PL.ui.readout(L.readouts, { label: "目前 U/I", unit: "Ω" });
    const rFit = PL.ui.readout(L.readouts, { label: "作圖斜率 R", unit: "Ω" });
    const rN = PL.ui.readout(L.readouts, { label: "已記錄資料", unit: "組" });
    const note = PL.ui.note(L.controls, feedback);
    const chart = PL.ui.chart(PL.ui.charts(root), { title: "U-I 量測圖", cap: "水平軸為電流 I、垂直軸為電壓 U；直線斜率即被測電阻 R。" });
    function state() {
      const E = sE.get(), R = sR.get(), Rv = sRv.get(), I = E / (R + Rv);
      return { E, R, Rv, I, U: I * R };
    }
    function fittedSlope() {
      if (records.length < 2) return null;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      records.forEach(p => { sx += p.I; sy += p.U; sxx += p.I * p.I; sxy += p.I * p.U; });
      const den = records.length * sxx - sx * sx;
      return Math.abs(den) < 1e-10 ? null : (records.length * sxy - sx * sy) / den;
    }
    function meter(x, y, value, max, label, unit, color) {
      const { ctx } = cv;
      D.disc(ctx, x, y, 31, { fill: PL.col("panel-2"), stroke: color, width: 2, glow: color, glowSize: 7 });
      D.ring(ctx, x, y, 22, PL.col("border"), 1);
      const a = Math.PI * (1.15 + 0.7 * PL.clamp(value / max, 0, 1));
      D.line(ctx, x, y, x + Math.cos(a) * 18, y + Math.sin(a) * 18, PL.col("warn"), 2);
      D.text(ctx, label, x, y - 40, { color, size: 12, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(value, value < 1 ? 3 : 2) + " " + unit, x, y + 48, { color: PL.col("text-dim"), size: 10, align: "center" });
    }
    function draw() {
      const { ctx, W, H } = cv, s = state(); cv.clear(); D.bg(cv);
      const top = 58, bot = H - 42, left = 48, right = W - 46, mid = (top + bot) / 2;
      const wire = "rgba(237,245,250,0.78)", active = MC();
      D.line(ctx, left, top, right, top, wire, 2); D.line(ctx, left, bot, right, bot, wire, 2);
      D.line(ctx, left, top, left, bot, wire, 2); D.line(ctx, right, top, right, bot, wire, 2);
      D.line(ctx, left - 7, mid - 18, left - 7, mid + 18, "#fff", 3); D.line(ctx, left + 7, mid - 11, left + 7, mid + 11, "#fff", 2);
      D.text(ctx, s.E + " V", left - 18, mid + 34, { color: PL.col("text-dim"), size: 11, align: "center" });
      meter(W * 0.47, top, s.I, 1.5, "A", "A", MC());
      const rvx = right - 54;
      ctx.save(); ctx.strokeStyle = active; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let i = 0; i < 7; i++) ctx.lineTo(rvx - 28 + i * 9, top + (i % 2 ? 8 : -8));
      ctx.stroke(); ctx.restore(); D.line(ctx, rvx, top - 26, rvx + 16, top - 7, PL.col("warn"), 1.8);
      D.text(ctx, "Rᵥ=" + s.Rv + "Ω", rvx, top - 37, { color: active, size: 11, align: "center" });
      const rx = W * 0.48;
      ctx.save(); ctx.strokeStyle = active; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i < 7; i++) ctx.lineTo(rx - 30 + i * 10, bot + (i % 2 ? 8 : -8));
      ctx.stroke(); ctx.restore();
      D.text(ctx, "被測 R=" + s.R + "Ω", rx, bot + 27, { color: active, size: 11, align: "center" });
      const vx = W * 0.76, vy = mid;
      D.line(ctx, rx - 36, bot, rx - 36, vy, wire, 1.5); D.line(ctx, rx - 36, vy, vx - 31, vy, wire, 1.5);
      D.line(ctx, rx + 36, bot, rx + 36, vy, wire, 1.5); D.line(ctx, rx + 36, vy, vx + 31, vy, wire, 1.5);
      meter(vx, vy, s.U, 12, "V", "V", PL.col("accent-2"));
      D.text(ctx, "A 串聯", W * 0.47, 20, { color: PL.col("text-faint"), size: 10, align: "center" });
      D.text(ctx, "V 並聯於被測電阻兩端", vx, H - 13, { color: PL.col("text-faint"), size: 10, align: "center" });
      rI.set(s.I, 3); rU.set(s.U, 2); rNowR.set(s.U / s.I, 2); rN.set(records.length, 0); note.textContent = feedback;
      chart.clear();
      const xmax = Math.max(1.3, ...records.map(p => p.I * 1.15), s.I * 1.15), ymax = Math.max(10, ...records.map(p => p.U * 1.15), s.U * 1.15);
      const g = PL.graph(chart, { x: 42, y: 16, w: chart.W - 58, h: chart.H - 40 }, { x0: 0, x1: xmax, y0: 0, y1: ymax });
      g.frame({ xlabel: "I (A)", ylabel: "U (V)" }); g.grid(5, 5);
      g.fn(i => s.R * i, { color: MC(), width: 2.1 });
      records.forEach(p => g.dot(p.I, p.U, { color: PL.col("accent-2"), glow: PL.col("accent-2") }));
      g.dot(s.I, s.U, { color: PL.col("warn"), glow: PL.col("warn") });
      const slope = fittedSlope();
      rFit.set(slope == null ? "待量測" : slope, slope == null ? undefined : 2);
    }
    cv.onResize(draw); chart.onResize(draw); draw();
    return { stop() { cv.destroy(); chart.destroy(); }, rerender: draw };
  }});

  /* 閉合電路：伏安法、安阻法、伏阻法與內電阻量測 */
  PL.register("closed-circuit-emf", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let closed = true, method = "va", records = [], feedback = "", guideStep = 0;

    PL.ui.section(L.controls, "電源與負載");
    const clearForSourceChange = () => { records = []; feedback = "電源設定已變更，舊的量測資料已清除。"; draw(); };
    const sE = PL.ui.stepper(L.controls, { label: "電動勢 E", min: 1.5, max: 12, step: 0.5, value: 3, unit: "V", digits: 1, onInput: clearForSourceChange });
    const sr = PL.ui.stepper(L.controls, { label: "內電阻 r", min: 0.1, max: 4, step: 0.1, value: 0.5, unit: "Ω", digits: 1, onInput: clearForSourceChange });
    const sR = PL.ui.slider(L.controls, { label: "外電阻 R（滑片）", min: 0.5, max: 30, step: 0.5, value: 12, unit: "Ω", digits: 1, onInput: () => { feedback = ""; draw(); } });
    PL.ui.section(L.controls, "儀表設定");
    const sAmRange = PL.ui.select(L.controls, { label: "電流表量程", value: "0.6", options: [{ value: "0.6", label: "0 - 0.6 A" }, { value: "3", label: "0 - 3 A" }], onChange: draw });
    const sVmRange = PL.ui.select(L.controls, { label: "電壓表量程", value: "3", options: [{ value: "3", label: "0 - 3 V" }, { value: "15", label: "0 - 15 V" }], onChange: draw });
    const stateNote = PL.ui.note(L.controls, "閉合開關後可改變滑片位置；每個設定值可記錄成一組量測資料。");

    PL.ui.section(L.controls, "量測控制");
    const methodChips = PL.ui.chipGroup(L.controls, {
      value: method,
      options: [
        { value: "va", label: "伏安法", color: MC() },
        { value: "ar", label: "安阻法" },
        { value: "vr", label: "伏阻法" }
      ],
      onChange: value => { method = value; draw(); }
    });
    const switchRow = PL.ui.buttonRow(L.controls);
    const switchBtn = PL.ui.button(switchRow, "斷開開關 S", () => { closed = !closed; draw(); }, { primary: true });
    const actionRow = PL.ui.buttonRow(L.controls);
    const recordBtn = PL.ui.button(actionRow, "記錄量測點", () => {
      if (!closed) return;
      const s = circuitState();
      if (records.some(p => Math.abs(p.R - s.R) < 1e-8)) {
        feedback = "此阻值已記錄，請調整外電阻後再量測。";
        draw();
        return;
      }
      records.push({ R: s.R, I: s.I, U: s.U });
      if (records.length > 10) records.shift();
      feedback = "已記錄 R=" + PL.fmt(s.R, 1) + " Ω 的量測點。";
      draw();
    });
    PL.ui.button(actionRow, "清空", () => { records = []; feedback = "量測資料已清空。"; draw(); });
    PL.ui.button(L.controls, "重設設定", () => {
      sE.set(3); sr.set(0.5); sR.set(12); closed = true; method = "va"; records = []; feedback = ""; guideStep = 0;
      methodChips.set(method); draw();
    });
    PL.ui.section(L.controls, "實驗引導");
    const guideNote = PL.ui.note(L.controls, "");
    const guideRow = PL.ui.buttonRow(L.controls);
    const guidePrev = PL.ui.button(guideRow, "上一步", () => setGuideStep(guideStep - 1));
    const guideNext = PL.ui.button(guideRow, "下一步", () => setGuideStep(guideStep + 1), { primary: true });

    const rI = PL.ui.readout(L.readouts, { label: "電流 I", unit: "A" });
    const rU = PL.ui.readout(L.readouts, { label: "路端電壓 U", unit: "V" });
    const rIr = PL.ui.readout(L.readouts, { label: "內壓降 Ir", unit: "V" });
    const rP = PL.ui.readout(L.readouts, { label: "負載功率", unit: "W" });
    const rLoss = PL.ui.readout(L.readouts, { label: "內耗功率", unit: "W" });
    const rEta = PL.ui.readout(L.readouts, { label: "效率 η", unit: "%" });
    const rMeter = PL.ui.readout(L.readouts, { label: "儀表量程狀態", unit: "" });
    const rFit = PL.ui.readout(L.readouts, { label: "量測擬合 E、r", unit: "" });

    const charts = PL.ui.charts(root);
    const fitChart = PL.ui.chart(charts, { title: "量測擬合圖", cap: "每次調整外電阻後記錄一點；累積至少兩點即可用對應的線性關係求 E 與 r。" });
    const charChart = PL.ui.chart(charts, { title: "路端特性 U-I 圖", cap: "開路時 U = E；電流愈大，內壓降 Ir 愈大，路端電壓愈低。" });

    function circuitState() {
      const E = sE.get(), r = sr.get(), R = sR.get();
      const I = closed ? E / (R + r) : 0;
      const U = E - I * r;
      return { E, r, R, I, U, drop: I * r, loadP: I * I * R, lossP: I * I * r, eta: closed ? R / (R + r) * 100 : 0 };
    }

    function pointFor(record) {
      if (method === "va") return { x: record.I, y: record.U };
      if (method === "ar") return { x: record.R, y: record.I > 1e-8 ? 1 / record.I : 0 };
      return { x: record.R, y: record.U > 1e-8 ? record.R / record.U : 0 };
    }

    function lineFit(points) {
      if (points.length < 2) return null;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      points.forEach(p => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; });
      const den = points.length * sxx - sx * sx;
      if (Math.abs(den) < 1e-9) return null;
      const m = (points.length * sxy - sx * sy) / den;
      return { m, b: (sy - m * sx) / points.length };
    }

    function inferredParams(fit) {
      if (!fit) return null;
      if (method === "va") return fit.b > 0 && fit.m < 0 ? { E: fit.b, r: -fit.m } : null;
      return fit.m > 0 ? { E: 1 / fit.m, r: fit.b / fit.m } : null;
    }

    function measurementMeta() {
      if (method === "va") return { title: "伏安法：U-I 圖（截距 E、斜率 -r）", x: "I (A)", y: "U (V)", eq: p => p.E - p.r * p.x };
      if (method === "ar") return { title: "安阻法：1/I-R 圖", x: "R (Ω)", y: "1/I (A⁻¹)", eq: p => (p.x + p.r) / p.E };
      return { title: "伏阻法：R/U-R 圖", x: "R (Ω)", y: "R/U (Ω/V)", eq: p => (p.x + p.r) / p.E };
    }

    const GUIDE_STEPS = [
      "確認電動勢、內電阻與兩個電表量程；預設值可直接開始量測。",
      "閉合開關，先以 R = 12 Ω 記錄第一組路端電壓與電流。",
      "將外電阻調大到 R = 24 Ω，記錄第二組資料。",
      "將外電阻調小到 R = 3 Ω，記錄第三組資料。",
      "查看量測擬合圖，將推得的 E、r 與上方設定值比較。"
    ];

    function setGuideStep(next) {
      guideStep = PL.clamp(next, 0, GUIDE_STEPS.length - 1);
      const guideR = [12, 12, 24, 3, 3][guideStep];
      sR.set(guideR);
      if (guideStep > 0) closed = true;
      feedback = "";
      draw();
    }

    function updateGuide() {
      guideNote.textContent = "步驟 " + (guideStep + 1) + "/" + GUIDE_STEPS.length + "：" + GUIDE_STEPS[guideStep];
      guidePrev.disabled = guideStep === 0;
      guideNext.disabled = guideStep === GUIDE_STEPS.length - 1;
    }

    function drawCircuit() {
      const { ctx, W, H } = cv, s = circuitState();
      cv.clear(); D.bg(cv);
      const top = H * 0.28, bottom = H * 0.75, left = 46, right = W - 44;
      const switchX = left + 44, meterX = W * 0.48, resistorX = W * 0.74, sourceX = W * 0.3;
      const resistorW = Math.min(88, W * 0.17), batteryW = Math.min(106, W * 0.3);
      const wire = closed ? "rgba(237,245,250,0.82)" : PL.col("text-faint");
      const active = closed ? MC() : PL.col("text-faint");

      const line = (x1, y1, x2, y2, color, width) => D.line(ctx, x1, y1, x2, y2, color || wire, width || 2);
      const meter = (x, y, value, unit, label, color, limit) => {
        const over = value > limit + 1e-8, meterColor = over ? PL.col("danger", "#ff6b6b") : color;
        D.disc(ctx, x, y, 29, { fill: PL.col("panel-2"), stroke: meterColor, width: 2, glow: meterColor, glowSize: 8 });
        D.ring(ctx, x, y, 20, PL.col("border"), 1);
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (1.12 + i * 0.19);
          line(x + Math.cos(a) * 17, y + Math.sin(a) * 17, x + Math.cos(a) * 21, y + Math.sin(a) * 21, PL.col("text-faint"), 1);
        }
        const ratio = PL.clamp(value / limit, 0, 1);
        const needle = Math.PI * (1.12 + ratio * 0.76);
        line(x, y, x + Math.cos(needle) * 16, y + Math.sin(needle) * 16, over ? meterColor : PL.col("warn"), 1.7);
        D.disc(ctx, x, y, 2.5, { fill: over ? meterColor : PL.col("warn") });
        D.text(ctx, label, x, y - 6, { color: PL.col("text-faint"), size: 10, align: "center" });
        D.text(ctx, over ? "超量程" : PL.fmt(value, 2) + " " + unit, x, y + 12, { color: over ? meterColor : "#fff", size: 10, align: "center", weight: "700" });
        D.text(ctx, "0-" + PL.fmt(limit, 1) + " " + unit, x, y + 42, { color: PL.col("text-faint"), size: 8.5, align: "center" });
      };
      const resistor = (x, y, w, label) => {
        ctx.save(); ctx.strokeStyle = active; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y);
        for (let i = 0; i < 7; i++) ctx.lineTo(x + (i + 1) * w / 8, y + (i % 2 ? 9 : -9));
        ctx.lineTo(x + w, y); ctx.stroke(); ctx.restore();
        D.text(ctx, label, x + w / 2, y - 17, { color: active, size: 11, align: "center" });
      };

      line(left, top, switchX - 14, top);
      D.disc(ctx, switchX - 14, top, 3, { fill: closed ? active : PL.col("text-faint") });
      D.disc(ctx, switchX + 14, top, 3, { fill: closed ? active : PL.col("text-faint") });
      line(switchX - 14, top, switchX + 14, closed ? top : top - 17, active, 2.5);
      D.text(ctx, closed ? "S 閉合" : "S 斷開", switchX, top + 23, { color: active, size: 10, align: "center" });
      line(switchX + 14, top, meterX - 34, top);
      meter(meterX, top, s.I, "A", "A", MC(), +sAmRange.get());
      line(meterX + 34, top, resistorX - resistorW / 2, top);
      resistor(resistorX - resistorW / 2, top, resistorW, "滑動變阻器 R=" + PL.fmt(s.R, 1) + "Ω");
      line(resistorX + resistorW / 2, top, right, top);
      line(right, top, right, bottom);
      line(right, bottom, sourceX + batteryW / 2, bottom);

      D.rect(ctx, sourceX - batteryW / 2, bottom - 29, batteryW, 58, { fill: PL.col("panel-2"), stroke: active, width: 1.5, r: 7 });
      line(sourceX - 13, bottom - 18, sourceX - 13, bottom + 18, "#fff", 3);
      line(sourceX + 9, bottom - 11, sourceX + 9, bottom + 11, "#fff", 1.6);
      D.text(ctx, "E=" + PL.fmt(s.E, 1) + "V", sourceX - 25, bottom + 43, { color: PL.col("warn"), size: 10, align: "center" });
      D.text(ctx, "r=" + PL.fmt(s.r, 1) + "Ω", sourceX + 27, bottom + 43, { color: MC(), size: 10, align: "center" });
      line(sourceX - batteryW / 2, bottom, left, bottom);
      line(left, bottom, left, top);

      const vmX = W * 0.58, vmY = bottom;
      line(sourceX + batteryW / 2, bottom, vmX - 34, bottom, "rgba(90,162,255,0.64)", 1.5);
      meter(vmX, vmY, s.U, "V", "V", "#5aa2ff", +sVmRange.get());
      line(vmX + 34, bottom, right, bottom, "rgba(90,162,255,0.64)", 1.5);
      if (closed) D.arrow(ctx, meterX + 38, top - 14, resistorX - 56, top - 14, { color: PL.col("warn"), width: 1.7, label: "I" });
      D.text(ctx, closed ? "閉合電路：E = U + Ir" : "開關斷開：I = 0，U = E", W / 2, 30, { color: closed ? PL.col("text-dim") : PL.col("text-faint"), size: 12, align: "center", weight: "600" });
    }

    function drawFitChart(s) {
      const meta = measurementMeta(), pts = records.map(pointFor), now = pointFor(s);
      const all = pts.concat([now]);
      const x1 = Math.max(1, ...all.map(p => p.x)) * 1.18;
      const y1 = Math.max(1, ...all.map(p => p.y), method === "va" ? s.E : 0) * 1.18;
      fitChart.clear(); D.bg(fitChart);
      const g = PL.graph(fitChart, { x: 38, y: 24, w: fitChart.W - 52, h: fitChart.H - 42 }, { x0: 0, x1, y0: 0, y1 });
      g.frame({ title: meta.title, xlabel: meta.x, ylabel: meta.y }); g.grid(5, 4);
      const fit = lineFit(pts);
      if (fit) g.fn(x => fit.m * x + fit.b, { color: MC(), width: 2.2 });
      pts.forEach(p => g.dot(p.x, p.y, { color: PL.col("accent-2"), glow: PL.col("accent-2") }));
      if (closed) g.dot(now.x, now.y, { color: PL.col("warn"), glow: PL.col("warn"), r: 4.5 });
      D.text(fitChart.ctx, "已記錄 " + records.length + " 點", fitChart.W - 8, 14, { color: PL.col("text-faint"), size: 10, align: "right" });
    }

    function drawCharacteristic(s) {
      const maxI = Math.max(1, Math.min(20, s.E / s.r));
      charChart.clear(); D.bg(charChart);
      const g = PL.graph(charChart, { x: 38, y: 24, w: charChart.W - 52, h: charChart.H - 42 }, { x0: 0, x1: maxI, y0: 0, y1: Math.max(1, s.E * 1.12) });
      g.frame({ title: "U-I 特性：開路 U=E，斜率=-r", xlabel: "I (A)", ylabel: "U (V)" }); g.grid(5, 4);
      g.fn(i => Math.max(0, s.E - i * s.r), { color: "#5aa2ff", width: 2.3 });
      g.dot(0, s.E, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      if (closed) g.dot(s.I, s.U, { color: PL.col("warn"), glow: PL.col("warn"), r: 4.5 });
      D.text(charChart.ctx, "短路 Iₛ=" + PL.fmt(s.E / s.r, 2) + " A", charChart.W - 8, 14, { color: PL.col("text-faint"), size: 10, align: "right" });
    }

    function draw() {
      const s = circuitState(), fit = inferredParams(lineFit(records.map(pointFor)));
      const ammeterOver = s.I > +sAmRange.get() + 1e-8, voltmeterOver = s.U > +sVmRange.get() + 1e-8;
      switchBtn.textContent = closed ? "斷開開關 S" : "閉合開關 S";
      recordBtn.disabled = !closed;
      const defaultNote = closed
        ? "目前可記錄第 " + (records.length + 1) + " 組資料。改變 R 後再記錄，使用 " + ({ va: "伏安法", ar: "安阻法", vr: "伏阻法" }[method]) + " 擬合。"
        : "開關已斷開，電流為 0。閉合後才能記錄有效量測點。";
      stateNote.textContent = feedback || defaultNote;
      updateGuide(); drawCircuit(); drawFitChart(s); drawCharacteristic(s);
      rI.set(s.I, 3); rU.set(s.U, 3); rIr.set(s.drop, 3); rP.set(s.loadP, 3); rLoss.set(s.lossP, 3); rEta.set(s.eta, 1);
      rMeter.set(ammeterOver || voltmeterOver ? (ammeterOver ? "電流表超量程" : "電壓表超量程") : "量程正常");
      rFit.set(fit ? "E=" + PL.fmt(fit.E, 2) + " V；r=" + PL.fmt(fit.r, 2) + " Ω" : "記錄至少 2 個不同設定");
    }

    cv.onResize(draw); fitChart.onResize(draw); charChart.onResize(draw); draw();
    return { stop() { cv.destroy(); fitChart.destroy(); charChart.destroy(); }, rerender: draw };
  }});

  /* 電阻串並聯
   *
   * 改版原因：原本三根滑桿（R₁、R₂、V）拉到底，畫面上只有方塊裡的數字會變，
   * 電路圖本身完全靜止——學生看到的是一張標了數字的插圖，不是實驗。
   *
   * 這一版讓電路圖自己說話：
   *   · 電阻方塊的長度正比於電阻值，串聯時「兩塊加起來」就是等效電阻
   *   · 導線上有會跑的電流點，密度與速度正比於該段的電流
   *     → 串聯時兩顆電阻的電流點速度一樣（電流處處相同）
   *     → 並聯時電阻小的那條跑得快（電流大）
   *   · 電池的高度正比於電壓
   *   · 每顆電阻上標出它自己分到的電壓，串聯時可以直接看到分壓
   */
  PL.register("resistors", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let flow = 0;
    const sCfg = PL.ui.select(L.controls, { label: "接法", value: "series", options: [{ value: "series", label: "串聯" }, { value: "parallel", label: "並聯" }], onChange: draw });
    const sR1 = PL.ui.slider(L.controls, { label: "電阻 R₁", min: 1, max: 20, step: 1, value: 6, unit: "Ω", digits: 0, onInput: draw });
    const sR2 = PL.ui.slider(L.controls, { label: "電阻 R₂", min: 1, max: 20, step: 1, value: 3, unit: "Ω", digits: 0, onInput: draw });
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 1, max: 24, step: 1, value: 12, unit: "V", digits: 0, onInput: draw });
    const rReq = PL.ui.readout(L.readouts, { label: "等效電阻", unit: "Ω" });
    const rItot = PL.ui.readout(L.readouts, { label: "總電流", unit: "A" });
    const rBranch = PL.ui.readout(L.readouts, { label: "支路電流", unit: "A" });
    /* 電阻方塊：長度正比於電阻值，因此「哪一顆比較大」用看的就知道 */
    function resBox(ctx, x, y, r, lab, volts, amps) {
      const w = 26 + r * 3.4;                     // 1Ω→29px、20Ω→94px
      D.rect(ctx, x, y - 13, w, 26, { fill: "rgba(77,182,170,0.15)", stroke: MC(), width: 1.5, r: 4 });
      // 電阻符號的鋸齒，齒數也隨電阻增加，遠看就有「這顆比較擋」的感覺
      const teeth = Math.max(3, Math.round(r / 2));
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i <= teeth; i += 1) {
        const px = x + 5 + (w - 10) * i / teeth;
        ctx.lineTo(px, y + (i % 2 ? -6 : 6));
      }
      ctx.stroke(); ctx.restore();
      D.text(ctx, lab + " = " + r + " Ω", x + w / 2, y - 19, { color: MC(), size: 10.5, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(volts, 1) + " V ／ " + PL.fmt(amps, 2) + " A", x + w / 2, y + 30,
        { color: PL.col("text-dim"), size: 10, align: "center" });
      return w;
    }

    /* 導線上跑動的電流點：速度與密度都正比於電流，電流大小變成看得見的東西 */
    function currentDots(ctx, x0, y0, x1, y1, amps) {
      if (amps <= 1e-6) return;
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 6) return;
      const gap = Math.max(14, 46 - amps * 7);        // 電流越大，點越密
      const n = Math.floor(len / gap);
      const phase = (flow * (0.25 + amps * 0.5)) % 1; // 電流越大，跑越快
      for (let i = 0; i < n; i += 1) {
        const s = ((i + phase) / n) % 1;
        D.disc(ctx, x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, 2.6,
          { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 6 });
      }
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const R1 = sR1.get(), R2 = sR2.get(), V = sV.get(), series = sCfg.get() === "series";
      const Req = series ? R1 + R2 : R1 * R2 / (R1 + R2), Itot = V / Req;
      const x0 = 56, x1 = W - 56, cy = H / 2 + 16, top = cy - 62;

      // 電池：高度正比於電壓，長短極板是標準符號
      const bh = 12 + V * 1.6;
      D.line(ctx, x0, cy, x0, cy - bh * 0.5, PL.col("text-faint"), 2);
      D.line(ctx, x0 - 13, cy - bh * 0.5, x0 + 13, cy - bh * 0.5, "#fff", 3.4);
      D.line(ctx, x0 - 7, cy - bh * 0.5 - 7, x0 + 7, cy - bh * 0.5 - 7, "#fff", 1.8);
      D.line(ctx, x0, cy - bh * 0.5 - 7, x0, top, PL.col("text-faint"), 2);
      D.text(ctx, V + " V", x0 - 17, cy - bh * 0.5, { color: PL.col("text"), size: 12, align: "right", weight: "700" });

      if (series) {
        // 串聯：兩顆電阻首尾相接，方塊總長就是等效電阻
        const w1 = 26 + R1 * 3.4, w2 = 26 + R2 * 3.4;
        const startX = (W - (w1 + w2 + 30)) / 2;
        currentDots(ctx, x0, top, startX, top, Itot);
        D.line(ctx, x0, top, startX, top, PL.col("text-faint"), 2);
        resBox(ctx, startX, top, R1, "R₁", Itot * R1, Itot);
        D.line(ctx, startX + w1, top, startX + w1 + 30, top, PL.col("text-faint"), 2);
        currentDots(ctx, startX + w1, top, startX + w1 + 30, top, Itot);
        resBox(ctx, startX + w1 + 30, top, R2, "R₂", Itot * R2, Itot);
        D.line(ctx, startX + w1 + 30 + w2, top, x1, top, PL.col("text-faint"), 2);
        currentDots(ctx, startX + w1 + 30 + w2, top, x1, top, Itot);
        D.line(ctx, x1, top, x1, cy, PL.col("text-faint"), 2);
        D.line(ctx, x0, cy, x1, cy, PL.col("text-faint"), 2);
        currentDots(ctx, x1, cy, x0, cy, Itot);
        rBranch.set(Itot, 2);
        PL.ui.caption(cv, "串聯：兩顆電阻的電流點速度一模一樣——電流處處相同。" +
          "電壓則按電阻比例分配，方塊下方就是各自分到的電壓。");
      } else {
        // 並聯：兩條支路各自標出自己的電流，電阻小的那條點跑得明顯比較快
        const i1 = V / R1, i2 = V / R2;
        const w1 = 26 + R1 * 3.4, w2 = 26 + R2 * 3.4;
        const bx = W / 2 - Math.max(w1, w2) / 2, jx = bx - 34, jx2 = bx + Math.max(w1, w2) + 34;
        const yA = top - 26, yB = top + 34;
        D.line(ctx, x0, top, jx, top, PL.col("text-faint"), 2);
        currentDots(ctx, x0, top, jx, top, Itot);
        [[yA, R1, "R₁", i1, w1], [yB, R2, "R₂", i2, w2]].forEach(([yy, rr, lab, ii, ww]) => {
          D.line(ctx, jx, top, jx, yy, PL.col("text-faint"), 2);
          D.line(ctx, jx, yy, bx, yy, PL.col("text-faint"), 2);
          currentDots(ctx, jx, yy, bx, yy, ii);
          resBox(ctx, bx, yy, rr, lab, V, ii);
          D.line(ctx, bx + ww, yy, jx2, yy, PL.col("text-faint"), 2);
          currentDots(ctx, bx + ww, yy, jx2, yy, ii);
          D.line(ctx, jx2, yy, jx2, top, PL.col("text-faint"), 2);
        });
        D.line(ctx, jx2, top, x1, top, PL.col("text-faint"), 2);
        currentDots(ctx, jx2, top, x1, top, Itot);
        D.line(ctx, x1, top, x1, cy, PL.col("text-faint"), 2);
        D.line(ctx, x0, cy, x1, cy, PL.col("text-faint"), 2);
        currentDots(ctx, x1, cy, x0, cy, Itot);
        rBranch.set(i1, 2);
        PL.ui.caption(cv, "並聯：兩條支路的電壓一樣，但電阻小的那條電流點跑得明顯比較快。" +
          "把 R₁ 拉到最小、R₂ 拉到最大，速度差距最清楚。");
      }
      D.text(ctx, "等效電阻 " + PL.fmt(Req, 2) + " Ω　總電流 " + PL.fmt(Itot, 2) + " A",
        W / 2, H - 14, { color: PL.col("text-dim"), size: 11, align: "center" });
      rReq.set(Req, 2); rItot.set(Itot, 2);
    }
    const anim = PL.loop(dt => { if (dt) flow += dt; draw(); }, 40);
    cv.onResize(draw); draw(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 電容器充放電 */
  PL.register("capacitor", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0, mode = "charge";
    const sR = PL.ui.slider(L.controls, { label: "電阻 R", min: 1, max: 10, step: 0.5, value: 4, unit: "kΩ", digits: 1, onInput: () => t = 0 });
    const sC = PL.ui.slider(L.controls, { label: "電容 C", min: 20, max: 200, step: 10, value: 100, unit: "μF", digits: 0, onInput: () => t = 0 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "充電", () => { mode = "charge"; t = 0; anim.start(); }, { primary: true });
    PL.ui.button(row, "放電", () => { mode = "discharge"; t = 0; anim.start(); });
    const rTau = PL.ui.readout(L.readouts, { label: "時間常數 τ=RC", unit: "s" });
    const rV = PL.ui.readout(L.readouts, { label: "電容電壓", unit: "×V₀" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const tau = sR.get() * sC.get() / 1000, V0 = 1;
      const V = mode === "charge" ? V0 * (1 - Math.exp(-t / tau)) : V0 * Math.exp(-t / tau);
      // 電容器示意
      const cx = 74, cyc = 70, gap = 22 * (0.3 + V * 0.7);
      D.line(ctx, cx - 26, cyc - gap, cx + 26, cyc - gap, POS, 4); D.line(ctx, cx - 26, cyc + gap, cx + 26, cyc + gap, NEG, 4);
      for (let i = 0; i < Math.round(V * 6); i++) { D.text(ctx, "+", cx - 20 + i * 8, cyc - gap - 4, { color: POS, size: 12 }); D.text(ctx, "−", cx - 20 + i * 8, cyc + gap + 12, { color: NEG, size: 12 }); }
      D.text(ctx, "電容器", cx, cyc + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      // V–t 與 I–t
      const bx = 150, by = 24, bw = W - bx - 20, bh = H - 48;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 5 * tau, y0: 0, y1: 1.05 });
      g.frame({ title: mode === "charge" ? "充電：電壓上升、電流衰減" : "放電：兩者皆指數衰減", xlabel: "t (s)" }); g.grid(5, 4);
      g.fn(tt => mode === "charge" ? 1 - Math.exp(-tt / tau) : Math.exp(-tt / tau), { color: MC(), width: 2.2 });
      g.fn(tt => Math.exp(-tt / tau), { color: PL.col("accent-2"), width: 2, dash: [4, 3] });
      g.vline(Math.min(t, 5 * tau), { color: "#fff", dash: [3, 3], width: 1 });
      g.dot(Math.min(t, 5 * tau), V, { color: MC(), glow: MC() });
      D.text(ctx, "V", bx + bw - 20, by + 14, { color: MC(), size: 11 }); D.text(ctx, "I", bx + bw - 20, by + 28, { color: PL.col("accent-2"), size: 11 });
      rTau.set(tau, 2); rV.set(V, 3);
    }
    const anim = PL.loop(dt => { if (dt) { t += dt; if (t > 5 * (sR.get() * sC.get() / 1000)) anim.stop(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 惠斯登電橋 */
  PL.register("wheatstone", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sR1 = PL.ui.slider(L.controls, { label: "R₁", min: 1, max: 20, step: 1, value: 6, unit: "Ω", digits: 0, onInput: draw });
    const sR2 = PL.ui.slider(L.controls, { label: "R₂", min: 1, max: 20, step: 1, value: 4, unit: "Ω", digits: 0, onInput: draw });
    const sR3 = PL.ui.slider(L.controls, { label: "R₃", min: 1, max: 20, step: 1, value: 9, unit: "Ω", digits: 0, onInput: draw });
    const sRx = PL.ui.slider(L.controls, { label: "Rₓ（未知）", min: 1, max: 20, step: 1, value: 6, unit: "Ω", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "調到檢流計歸零即平衡：R₁Rₓ = R₂R₃。");
    const rG = PL.ui.readout(L.readouts, { label: "檢流計", unit: "" });
    const rBal = PL.ui.readout(L.readouts, { label: "狀態" });
    const rRx = PL.ui.readout(L.readouts, { label: "平衡時 Rₓ", unit: "Ω" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const R1 = sR1.get(), R2 = sR2.get(), R3 = sR3.get(), Rx = sRx.get();
      const cx = W / 2, cy = H / 2, s = Math.min(W, H) * 0.34;
      const T = { x: cx, y: cy - s }, B = { x: cx, y: cy + s }, Ln = { x: cx - s, y: cy }, Rn = { x: cx + s, y: cy };
      const arm = (a, b, lab, c) => { D.line(ctx, a.x, a.y, b.x, b.y, c, 2); D.text(ctx, lab, (a.x + b.x) / 2 + 12, (a.y + b.y) / 2 - 4, { color: c, size: 11, align: "center" }); };
      arm(T, Ln, "R₁=" + R1, PL.col("accent-2")); arm(T, Rn, "R₂=" + R2, PL.col("accent-2"));
      arm(Ln, B, "R₃=" + R3, MC()); arm(Rn, B, "Rₓ=" + Rx, MC());
      D.disc(ctx, T.x, T.y, 4, { fill: "#fff" }); D.disc(ctx, B.x, B.y, 4, { fill: "#fff" });
      D.text(ctx, "＋電池－", T.x, T.y - 12, { color: PL.col("warn"), size: 11, align: "center" });
      D.line(ctx, Ln.x, Ln.y, Rn.x, Rn.y, PL.col("text-faint"), 1.5);
      const gm = { x: cx, y: cy }; D.disc(ctx, gm.x, gm.y, 16, { fill: PL.col("panel-2"), stroke: PL.col("text-faint"), width: 2 });
      const VL = R3 / (R1 + R3), VR = Rx / (R2 + Rx), diff = VL - VR, needle = PL.clamp(diff * 4, -1, 1) * Math.PI / 3;
      D.line(ctx, gm.x, gm.y, gm.x + 13 * Math.sin(needle), gm.y - 13 * Math.cos(needle), PL.col("danger"), 2);
      D.text(ctx, "G", gm.x, gm.y + 30, { color: PL.col("text-dim"), size: 11, align: "center" });
      const balanced = Math.abs(R1 * Rx - R2 * R3) < 0.5;
      rG.set(diff * 100, 1); rBal.set(balanced ? "平衡 ✓" : "不平衡"); rRx.set(R2 * R3 / R1, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 帶電粒子在電場中的偏轉 */
  PL.register("e-deflection", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sV = PL.ui.slider(L.controls, { label: "入射速度 v", min: 2, max: 10, step: 0.5, value: 6, unit: "", digits: 1 });
    const sE = PL.ui.slider(L.controls, { label: "偏轉電壓 V", min: -10, max: 10, step: 0.5, value: 6, unit: "", digits: 1 });
    PL.ui.note(L.controls, "板內水平等速、鉛直等加速，軌跡為拋物線——與拋體運動一模一樣。");
    const rY = PL.ui.readout(L.readouts, { label: "板內偏轉量", unit: "" });
    const rAng = PL.ui.readout(L.readouts, { label: "出射角", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, plateL = 90, plateR = W * 0.62, gap = 74, v = sV.get(), E = sE.get(), K = E / (v * v) * 0.9;
      D.rect(ctx, plateL, cy - gap / 2 - 8, plateR - plateL, 8, { fill: POS }); D.text(ctx, "＋", plateL - 14, cy - gap / 2, { color: POS, size: 13 });
      D.rect(ctx, plateL, cy + gap / 2, plateR - plateL, 8, { fill: NEG }); D.text(ctx, "－", plateL - 14, cy + gap / 2 + 12, { color: NEG, size: 13 });
      for (let x = plateL + 20; x < plateR; x += 40) D.arrow(ctx, x, cy - gap / 2, x, cy + gap / 2, { color: "rgba(77,182,170,0.28)", width: 1 });
      const yR = K * (plateR - plateL) * (plateR - plateL), slope = 2 * K * (plateR - plateL);
      ctx.save(); ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = plateL; x <= W - 20; x += 2) { let y = x <= plateR ? cy + K * (x - plateL) * (x - plateL) : cy + yR + slope * (x - plateR); if (y > cy + gap / 2 && x < plateR) { y = cy + gap / 2; } x === plateL ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.arrow(ctx, 20, cy, plateL - 4, cy, { color: "#fff", width: 2, label: "v" });
      const tt = (t * v * 26) % (W - plateL - 20), xp = plateL + tt;
      const yp = xp <= plateR ? cy + K * (xp - plateL) * (xp - plateL) : cy + yR + slope * (xp - plateR);
      if (Math.abs(yp - cy) < gap / 2 || xp > plateR) D.disc(ctx, xp, yp, 6, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 8 });
      rY.set(Math.abs(yR), 1); rAng.set(Math.atan(slope) * 180 / Math.PI, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
