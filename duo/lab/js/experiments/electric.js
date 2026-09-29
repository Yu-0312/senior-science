/* 模組十 · 電場與電路 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4db6ac");
  const POS = "#ff6b6b", NEG = "#5aa2ff";

  /* 庫侖定律 —— 絕緣架上的兩顆帶電金屬球，中間畫出電力線
   *
   * 舊版兩顆球只有 10–20 px，擠在畫面頂端一條窄帶裡，其餘全是圖表。
   * 現在上方是實驗桌：兩顆金屬球立在壓克力絕緣架上，桌前一支公分尺量 r，
   * 球面上的 +／− 記號多寡代表電量，兩球之間的電力線隨同性／異性電荷改變形狀
   * （異性相連、同性互相排開），兩球受力一樣大、方向相反。
   */
  PL.register("coulomb", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    const sQ1 = PL.ui.slider(L.controls, { label: "電荷 q₁", min: -5, max: 5, step: 0.5, value: 3, unit: "μC", digits: 1, onInput: draw });
    const sQ2 = PL.ui.slider(L.controls, { label: "電荷 q₂", min: -5, max: 5, step: 0.5, value: -2, unit: "μC", digits: 1, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "距離 r", min: 2, max: 10, step: 0.5, value: 5, unit: "cm", digits: 1, onInput: draw });
    const rF = PL.ui.readout(L.readouts, { label: "靜電力 F", unit: "（相對）" });
    const rDir = PL.ui.readout(L.readouts, { label: "方向" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q1 = sQ1.get(), q2 = sQ2.get(), r = sR.get(), F = 9 * q1 * q2 / (r * r);
      const attract = q1 * q2 < 0, AP = PL.apparatus;
      const sh = Math.round(H * 0.46), benchY = sh - 16, cy = Math.round(benchY * 0.46);
      const ox = 90, sc = (W - 180) / 10, x1 = ox, x2 = ox + r * sc;
      const r1 = 12 + Math.abs(q1) * 2.4, r2 = 12 + Math.abs(q2) * 2.4;
      AP.labStrip(ctx, W, sh, benchY, {});
      // 電力線：從電荷出發沿電場一步一步走，碰到另一顆球或走出桌面上方就停
      const Ex = (x, y) => { let ex = 0, ey = 0; [[x1, q1], [x2, q2]].forEach(c => { const dx = x - c[0], dy = y - cy, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1; ex += c[1] * dx / (d2 * d); ey += c[1] * dy / (d2 * d); }); return [ex, ey]; };
      const trace = (sx, sy, sgn) => {
        const pts = [[sx, sy]]; let x = sx, y = sy;
        for (let k = 0; k < 420; k++) {
          const e = Ex(x, y), m = Math.hypot(e[0], e[1]) || 1;
          x += sgn * e[0] / m * 3; y += sgn * e[1] / m * 3;
          if (x < 2 || x > W - 2 || y < 4 || y > benchY - 4) break;
          if (Math.hypot(x - x1, y - cy) < r1 || Math.hypot(x - x2, y - cy) < r2) { pts.push([x, y]); break; }
          pts.push([x, y]);
        }
        return pts;
      };
      const lines = [];
      const seed = (cx0, q, rr) => {
        const n = Math.min(14, Math.round(Math.abs(q) * 2.6));
        for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; lines.push({ pts: trace(cx0 + Math.cos(a) * (rr + 2), cy + Math.sin(a) * (rr + 2), Math.sign(q)), sgn: Math.sign(q) }); }
      };
      if (q1) seed(x1, q1, r1);
      if (q2 && (!q1 || Math.sign(q2) === Math.sign(q1))) seed(x2, q2, r2);
      ctx.save(); ctx.strokeStyle = PL.theme.isLight() ? "rgba(214,120,30,0.5)" : "rgba(255,196,110,0.45)"; ctx.lineWidth = 1.2;
      lines.forEach(l => { if (l.pts.length < 3) return; ctx.beginPath(); l.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); });
      ctx.restore();
      lines.forEach(l => {
        if (l.pts.length < 12) return;
        const k = Math.floor(l.pts.length * 0.4), a = l.pts[k], b = l.pts[k + 1], dx = (b[0] - a[0]) * l.sgn, dy = (b[1] - a[1]) * l.sgn, m = Math.hypot(dx, dy) || 1;
        D.arrow(ctx, a[0] - dx / m * 4, a[1] - dy / m * 4, a[0] + dx / m * 4, a[1] + dy / m * 4, { color: PL.theme.isLight() ? "rgba(214,120,30,0.75)" : "rgba(255,196,110,0.7)", width: 1.2, head: 5 });
      });
      // 桌前的公分尺：兩球球心分別對準 0 與 r
      const ry = benchY + 2;
      ctx.fillStyle = "rgb(246,238,206)"; ctx.fillRect(ox - 16, ry, 10 * sc + 32, 12);
      ctx.strokeStyle = "rgba(120,104,60,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(ox - 15.5, ry + 0.5, 10 * sc + 31, 11);
      ctx.beginPath();
      for (let c = 0; c <= 20; c++) { const x = Math.round(ox + c * sc / 2) + 0.5; ctx.moveTo(x, ry); ctx.lineTo(x, ry + (c % 2 ? 4 : 7)); }
      ctx.stroke();
      PL.theme.note(ctx, "rgb(246,238,206)", ox - 16, ry, 10 * sc + 32, 12);
      for (let c = 0; c <= 10; c += 2) D.text(ctx, String(c), ox + c * sc, ry + 11, { color: "#5a4a20", size: 8, align: "center" });
      // 絕緣架與帶電金屬球
      const ball = (x, q, rr) => {
        ctx.fillStyle = "rgba(214,232,246,0.55)"; ctx.fillRect(x - 3, cy + rr, 6, benchY - 6 - cy - rr);
        ctx.strokeStyle = "rgba(120,150,180,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(x - 3.5, cy + rr, 7, benchY - 6 - cy - rr);
        AP.steel(ctx, x - 18, benchY - 6, 36, 6, -6);
        ctx.save(); ctx.globalAlpha = 0.3; D.disc(ctx, x, cy, rr + 4, { fill: q >= 0 ? POS : NEG, glow: q >= 0 ? POS : NEG, glowSize: 14 }); ctx.restore();
        AP.sportBall(ctx, x, cy, rr, "steel");
        const n = Math.min(10, Math.round(Math.abs(q) * 2));
        for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; D.text(ctx, q >= 0 ? "+" : "−", x + Math.cos(a) * rr * 0.62, cy + Math.sin(a) * rr * 0.62 + 4, { color: q >= 0 ? "#b3261e" : "#1d4ed8", size: 10, align: "center", weight: "800" }); }
        D.text(ctx, (q >= 0 ? "+" : "−") + Math.abs(q) + " μC", x, cy - rr - 8, { color: q >= 0 ? POS : NEG, size: 11, align: "center", weight: "800" });
      };
      ball(x1, q1, r1); ball(x2, q2, r2);
      // 一對大小相等、方向相反的靜電力
      if (q1 && q2) {
        const fl = PL.clamp(12 + Math.abs(F) * 5, 12, 90), dir = attract ? 1 : -1;
        const s1 = x1 + dir * (r1 + 3), s2 = x2 - dir * (r2 + 3);
        D.arrow(ctx, s1, cy, s1 + dir * fl, cy, { color: PL.col("warn"), width: 2.8, label: "F" });
        D.arrow(ctx, s2, cy, s2 - dir * fl, cy, { color: PL.col("warn"), width: 2.8, label: "F" });
      }
      D.text(ctx, (attract ? "異性相吸" : q1 * q2 > 0 ? "同性相斥" : "有一顆不帶電：沒有靜電力") + "　r = " + r + " cm", W - 16, 20, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
      // 下方：靜電力大小對距離（平方反比）
      const bx = 44, by = sh + 22, bw = W - 80, bh = H - by - 18;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 2, x1: 10, y0: 0, y1: 9 * Math.abs(q1 * q2) / 4 * 1.1 + 1 });
      g.frame({ title: "靜電力大小對距離（平方反比）", xlabel: "r (cm)", ylabel: "|F|" }); g.grid(4, 4);
      g.fn(rr => 9 * Math.abs(q1 * q2) / (rr * rr), { color: MC(), width: 2.2 });
      g.dot(r, Math.abs(F), { color: PL.col("warn"), glow: PL.col("warn") });
      rF.set(Math.abs(F), 2); rDir.set(attract ? "相吸" : q1 * q2 > 0 ? "相斥" : "無");
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
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

    /*
     * 檢視切換：實物圖（器材擺在桌上）與標準電路圖（課本符號）共用同一個
     * 幾何外框，位置一一對應——學生卡在「實物連不成電路圖」的那道坎，
     * 就靠「同一個迴路、兩種畫法、同一組數值」解開。
     */
    PL.ui.section(L.controls, "檢視");
    let view = "physical";
    PL.ui.chipGroup(L.controls, {
      value: "physical",
      options: [
        { value: "physical", label: "實物圖" },
        { value: "schematic", label: "電路圖" }
      ],
      onChange: v => { view = v; }
    });

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

      const A = PL.apparatus;
      const x0 = 70, x1 = W - 78, y0 = 88, y1 = H - 74;
      const live = !c.openCircuit;
      const wireColor = live ? "rgb(186,54,48)" : "rgb(128,120,118)";
      const ink = live ? "rgba(34,42,54,0.92)" : "rgba(34,42,54,0.45)";

      // 檯面：實物圖是俯視的實驗桌，電路圖是桌上的一張白紙
      A.circuitBoard(ctx, W, H, view === "schematic");

      const by = (y0 + y1) / 2;
      const bulbX = (x0 + x1) / 2, bulbY = y0;
      const brightness = burnt ? 0 : Math.min(1, c.P / BULB_MAX_POWER);
      // 滑桿量程從 input 元素本身讀（slider 回傳物件不直接暴露 min/max）
      const rFrac = Math.max(0, Math.min(1,
        (sR.get() - Number(sR.el.min)) / Math.max(1e-9, Number(sR.el.max) - Number(sR.el.min))));

      /* --------------------------------------------------------------
       * 電路圖模式：課本符號 + 即時數值，與實物圖同一個外框。
       * -------------------------------------------------------------- */
      function drawSchematic() {
        // 迴路導線（細黑線、直角）＋串聯支路
        A.wire(ctx, [{ x: x0, y: y1 }, { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], ink, 1.8);
        let mx = null;
        if (wiring === "parallel") {
          mx = x1 - 58;
          A.wire(ctx, [{ x: x1, y: y0 + 26 }, { x: mx, y: y0 + 26 }, { x: mx, y: y1 - 26 }, { x: x1, y: y1 - 26 }], ink, 1.6);
        }
        // 電池符號（左）：長短線各兩組
        ctx.strokeStyle = ink; ctx.lineWidth = 2;
        [[-9, 15], [9, 15]].forEach(([dy, len], i) => {
          ctx.lineWidth = i === 0 ? 2.4 : 4.2;
          ctx.beginPath(); ctx.moveTo(x0 - len / 2, by + dy); ctx.lineTo(x0 + len / 2, by + dy); ctx.stroke();
        });
        D.text(ctx, "＋", x0 + 14, by - 12, { color: PL.col("text-faint"), size: 10 });
        // 開關符號（左下）
        const swx = x0 + (x1 - x0) * 0.13;
        ctx.strokeStyle = ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(swx - 14, y1); ctx.lineTo(swx - 2, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(swx + 14, y1); ctx.lineTo(swx + 2, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(swx - 2, y1); ctx.lineTo(swx + 10, y1 - (live ? 2 : 13)); ctx.stroke();
        ctx.beginPath(); ctx.arc(swx - 2, y1, 2, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(swx + 2, y1, 2, 0, TAU); ctx.stroke();
        // 保險絲符號（下方）
        if (cFuse.get()) {
          const fx = x0 + (x1 - x0) * 0.28;
          ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
          D.rect(ctx, fx - 12, y1 - 5, 24, 10, { stroke: ink, width: 1.6, r: 1 });
          ctx.beginPath();
          if (fuseBlown) { ctx.moveTo(fx - 10, y1 - 5); ctx.lineTo(fx - 3, y1 - 5); ctx.moveTo(fx + 3, y1 + 5); ctx.lineTo(fx + 10, y1 + 5); }
          else { ctx.moveTo(fx - 10, y1); ctx.lineTo(fx + 10, y1); }
          ctx.stroke();
        }
        // 燈泡符號（上）：圓圈＋叉
        ctx.strokeStyle = live && !burnt ? "rgb(226,178,72)" : ink;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bulbX, bulbY, 15, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bulbX - 10.5, bulbY - 10.5); ctx.lineTo(bulbX + 10.5, bulbY + 10.5);
        ctx.moveTo(bulbX + 10.5, bulbY - 10.5); ctx.lineTo(bulbX - 10.5, bulbY + 10.5);
        ctx.stroke();
        // 可變電阻符號（右）：矩形＋斜箭頭
        const drawRheoSym = (symX, symY, lab) => {
          ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
          ctx.strokeRect(symX - 7, symY - 17, 14, 34);
          ctx.beginPath();
          ctx.moveTo(symX - 15, symY + 13); ctx.lineTo(symX + 15, symY - 13);
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(symX + 15, symY - 13); ctx.lineTo(symX + 7, symY - 13); ctx.lineTo(symX + 13, symY - 6); ctx.closePath();
          ctx.fillStyle = ink; ctx.fill();
          D.text(ctx, lab, symX + 24, symY + 4, { color: PL.col("accent-2"), size: 11, weight: "700" });
        };
        if (wiring === "single") drawRheoSym(x1, by, PL.fmt(c.R, 1) + " Ω");
        else if (wiring === "series") {
          [0.32, 0.68].forEach(k => drawRheoSym(x1, y0 + (y1 - y0) * k, PL.fmt(c.R, 1) + " Ω"));
        } else {
          drawRheoSym(x1, by, PL.fmt(c.R, 1) + " Ω");
          drawRheoSym(mx, by, PL.fmt(c.R / 2, 1) + " Ω");
          D.text(ctx, "並聯", mx - 16, y0 + 16, { color: PL.col("text-faint"), size: 10, align: "right" });
        }
        // 即時數值晶片
        A.valueChip(ctx, x0 - 6, y0 + 8, "I = " + PL.fmt(c.I, 2) + " A", "rgba(120,190,255,0.85)");
        A.valueChip(ctx, bulbX - 30, bulbY - 58, burnt ? "燒毀" : "P = " + PL.fmt(c.P, 1) + " W", burnt ? PL.col("danger") : "rgba(255,196,110,0.9)");
        A.valueChip(ctx, x1 - 168, y1 + 14, "Req = " + PL.fmt(c.Rtotal, 1) + " Ω", "rgba(126,222,190,0.9)");
        D.text(ctx, "標準電路圖（與實物圖位置一一對應）", x0, y0 - 34, { color: PL.col("text-faint"), size: 10.5 });
      }

      /* --------------------------------------------------------------
       * 實物模式：器材擺在桌上（電池盒、閘刀開關、滑動變阻器、燈座）
       * -------------------------------------------------------------- */
      function drawPhysical() {
        A.cable(ctx, [{ x: x0, y: y1 }, { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], wireColor, 3.6, 5);
        let mx = null;
        if (wiring === "parallel") {
          mx = x1 - 58;
          A.cable(ctx, [{ x: x1, y: y0 + 26 }, { x: mx, y: y0 + 26 }, { x: mx, y: y1 - 26 }, { x: x1, y: y1 - 26 }], wireColor, 3, 4);
        }

        // 電池組（左側）：藍色電池盒，接線柱朝左右
        A.battery(ctx, x0 - 17, by - 34, 34, 68);

        // 閘刀開關（左下）：斷路時閘刀翹起
        A.knifeSwitch(ctx, x0 + (x1 - x0) * 0.13, y1 + 2, 46, c.openCircuit ? 1 : 0);

        // 燈泡（上方）
        A.bulb(ctx, bulbX, bulbY - 6, 22, brightness);
        if (burnt) {
          D.line(ctx, bulbX - 12, bulbY - 18, bulbX + 12, bulbY + 6, PL.col("danger"), 2.8);
          D.line(ctx, bulbX + 12, bulbY - 18, bulbX - 12, bulbY + 6, PL.col("danger"), 2.8);
        }

        // 保險絲（下方）
        if (cFuse.get()) {
          const fx = x0 + (x1 - x0) * 0.28;
          A.fuse(ctx, fx, y1, fuseBlown);
        }

        // 滑動變阻器（右側）：滑片位置就是 R 滑桿
        const drawRheo = (rx, lab) => {
          A.rheostat(ctx, rx, by + 9, 92, rFrac);
          A.valueChip(ctx, rx + 24, by - 52, lab, "rgba(126,222,190,0.9)");
        };
        if (wiring === "single") drawRheo(x1, PL.fmt(c.R, 1) + " Ω");
        else if (wiring === "series") {
          [0.32, 0.68].forEach(k => {
            const yy = y0 + (y1 - y0) * k;
            A.resistorBox(ctx, x1, yy, 50, null, true);
            A.valueChip(ctx, x1 + 16, yy - 30, PL.fmt(c.R, 1) + " Ω", "rgba(126,222,190,0.9)");
          });
        } else {
          drawRheo(x1, PL.fmt(c.R, 1) + " Ω");
          A.resistorBox(ctx, mx, by, 50, null, true);
          A.valueChip(ctx, mx - 56, by - 34, "並聯 " + PL.fmt(c.R / 2, 1) + " Ω", "rgba(126,222,190,0.9)");
        }

        // 讀值晶片：I 掛在上導線、V 掛在電池盒上方、P 掛在燈泡上
        A.valueChip(ctx, x0 + 10, y0 - 36, "I = " + PL.fmt(c.I, 2) + " A", "rgba(120,190,255,0.85)");
        A.valueChip(ctx, x0 - 17, by - 62, PL.fmt(c.V, 1) + " V", "rgba(120,190,255,0.85)");
        A.valueChip(ctx, bulbX - 30, bulbY - 58, burnt ? "燒毀" : "P = " + PL.fmt(c.P, 1) + " W", burnt ? PL.col("danger") : "rgba(255,196,110,0.9)");
      }

      if (view === "schematic") drawSchematic(); else drawPhysical();

      // 電子流：速度正比於電流，「電流大小」因此看得見（兩種檢視都保留）
      if (live && c.I > 0.001) {
        const peri = 2 * ((x1 - x0) + (y1 - y0));
        const count = 22;
        for (let i = 0; i < count; i += 1) {
          let d = ((t * c.I * 42 + i * peri / count) % peri + peri) % peri;
          let ex, ey;
          if (d < x1 - x0) { ex = x0 + d; ey = y0; }
          else if (d < (x1 - x0) + (y1 - y0)) { ex = x1; ey = y0 + (d - (x1 - x0)); }
          else if (d < 2 * (x1 - x0) + (y1 - y0)) { ex = x1 - (d - (x1 - x0) - (y1 - y0)); ey = y1; }
          else { ex = x0; ey = y1 - (d - 2 * (x1 - x0) - (y1 - y0)); }
          D.disc(ctx, ex, ey, 3, { fill: "#ffe9a8", glow: "rgba(255,233,168,0.6)", glowSize: 6 });
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
            : view === "schematic" ? "同一個迴路的課本畫法：切回實物圖對照，每個符號的位置就是桌上那顆器材。"
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const AP = PL.apparatus;
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let records = [], feedback = "調整可變電阻後，記錄一組電壓計與安培計讀值。";
    PL.ui.section(L.controls, "量測電路");
    const sE = PL.ui.slider(L.controls, { label: "電源電壓 E", min: 3, max: 12, step: 0.5, value: 9, unit: "V", digits: 1, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "被測電阻 R", min: 2, max: 20, step: 1, value: 8, unit: "Ω", digits: 0, onInput: () => { records = []; feedback = "被測電阻已更換，請重新量測。"; draw(); } });
    const sRv = PL.ui.slider(L.controls, { label: "可變電阻 Rᵥ", min: 1, max: 40, step: 1, value: 10, unit: "Ω", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "量測接線：安培計 A 與被測電阻串聯；電壓計 V 並聯在被測電阻兩端。");
    /*
     * 檢視切換：實物圖用新器材（電池盒、圓形電表、編織導線），
     * 電路圖用課本符號，兩者共用同一個迴路外框。
     */
    PL.ui.section(L.controls, "檢視");
    let view = "physical";
    PL.ui.chipGroup(L.controls, {
      value: "physical",
      options: [{ value: "physical", label: "實物圖" }, { value: "schematic", label: "電路圖" }],
      onChange: v => { view = v; draw(); }
    });
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
      // 圓形金屬框電表（實物級）；frac 帶動指針
      AP.meter(ctx, x, y, 30, PL.clamp(value / max, 0, 1), label);
      D.text(ctx, PL.fmt(value, value < 1 ? 3 : 2) + " " + unit, x, y + 54, { color: PL.col("text-dim"), size: 10, align: "center" });
    }
    function draw() {
      const { ctx, W, H } = cv, s = state(); cv.clear(); D.bg(cv);
      const top = 58, bot = H - 42, left = 48, right = W - 46, mid = (top + bot) / 2;
      const AP = PL.apparatus, active = MC();
      AP.circuitBoard(ctx, W, H, view === "schematic");
      const wireColor = "rgb(186,54,48)";
      const rvx = right - 54, rx = W * 0.48, vx = W * 0.76, vy = mid;

      if (view === "schematic") {
        // 課本符號版：同一個迴路外框，位置與實物圖一一對應
        const ink = "rgba(34,42,54,0.92)";
        AP.symWire(ctx, [{ x: left, y: bot }, { x: left, y: top }, { x: right, y: top },
                          { x: right, y: bot }, { x: left, y: bot }], ink);
        AP.symBattery(ctx, left, mid, true, ink);
        AP.symMeter(ctx, W * 0.47, top, "A", PL.fmt(s.I, 2) + " A", ink, MC());
        AP.symRheostat(ctx, rvx, top, false, ink, "Rᵥ=" + s.Rv + "Ω");
        AP.symResistor(ctx, rx, bot, false, ink, "被測 R=" + s.R + "Ω");
        // 電壓計的並聯跨接線
        AP.symWire(ctx, [{ x: rx - 36, y: bot }, { x: rx - 36, y: vy }, { x: vx - 15, y: vy }], "rgba(58,96,168,0.9)", 1.5);
        AP.symWire(ctx, [{ x: rx + 36, y: bot }, { x: rx + 36, y: vy }, { x: vx + 15, y: vy }], "rgba(58,96,168,0.9)", 1.5);
        AP.symJunction(ctx, rx - 36, bot, ink); AP.symJunction(ctx, rx + 36, bot, ink);
        AP.symMeter(ctx, vx, vy, "V", PL.fmt(s.U, 2) + " V", ink, PL.col("accent-2"));
        D.text(ctx, "A 串聯、V 並聯——與實物圖位置一一對應", W / 2, 20, { color: PL.col("text-faint"), size: 10, align: "center" });
      } else {
        // 實物圖：編織導線＋電池盒＋圓形電表
        AP.cable(ctx, [{ x: left, y: bot }, { x: left, y: top }, { x: right, y: top },
                        { x: right, y: bot }, { x: left, y: bot }], wireColor, 3.4, 5);
        AP.battery(ctx, left - 15, mid - 30, 30, 60);
        meter(W * 0.47, top, s.I, 1.5, "A", "A", MC());
        AP.resistorBox(ctx, rvx, top, 56, null, false); D.line(ctx, rvx, top - 26, rvx + 16, top - 7, PL.col("warn"), 1.8);
        AP.valueChip(ctx, rvx - 30, top - 44, "Rᵥ=" + s.Rv + "Ω", active);
        AP.resistorBox(ctx, rx, bot, 62, null, false);
        AP.valueChip(ctx, rx - 52, bot + 16, "被測 R=" + s.R + "Ω", active);
        AP.cable(ctx, [{ x: rx - 36, y: bot }, { x: rx - 36, y: vy }, { x: vx - 31, y: vy }], "rgb(58,96,168)", 2.6, 3);
        AP.cable(ctx, [{ x: rx + 36, y: bot }, { x: rx + 36, y: vy }, { x: vx + 31, y: vy }], "rgb(58,96,168)", 2.6, 3);
        meter(vx, vy, s.U, 12, "V", "V", PL.col("accent-2"));
        D.text(ctx, "A 串聯", W * 0.47, 20, { color: PL.col("text-faint"), size: 10, align: "center" });
        D.text(ctx, "V 並聯於被測電阻兩端", vx, H - 13, { color: PL.col("text-faint"), size: 10, align: "center" });
      }
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      const AP = PL.apparatus;
      /* 俯視的實驗桌：電池盒、閘刀開關、安培計、滑動變阻器、伏特計用導線接成閉合電路 */
      AP.circuitBoard(ctx, W, H, false);
      const top = H * 0.30, bottom = H * 0.76, left = 46, right = W - 44;
      const switchX = left + 64, meterX = W * 0.46, resistorX = W * 0.74, sourceX = W * 0.30;
      const resistorW = Math.min(120, W * 0.2), batteryW = Math.min(96, W * 0.24);
      const red = "rgb(186,54,48)", black = "rgb(40,44,52)", blue = "rgb(52,98,178)";
      const meter = (x, y, value, unit, label, limit) => {
        const over = value > limit + 1e-8;
        AP.meter(ctx, x, y, 26, over ? 1 : PL.clamp(value / limit, 0, 1), label);
        D.text(ctx, over ? "超量程！" : PL.fmt(value, 2) + " " + unit, x, y + 50, { color: over ? PL.col("danger") : PL.col("text"), size: 11, align: "center", weight: "700" });
        D.text(ctx, "量程 0–" + PL.fmt(limit, 1) + " " + unit, x, y + 64, { color: PL.col("text-dim"), size: 9, align: "center" });
      };
      // 上排：開關 → 安培計 → 變阻器
      const sw = AP.knifeSwitch(ctx, switchX, top + 10, 64, closed ? 0 : 1);
      D.text(ctx, closed ? "S 閉合" : "S 斷開", switchX, top + 30, { color: PL.col("text"), size: 10, align: "center", weight: "700" });
      const rh = AP.rheostat(ctx, resistorX, top + 16, resistorW, PL.clamp((s.R - Number(sR.el ? sR.el.min : 0)) / Math.max(1e-9, (sR.el ? Number(sR.el.max) - Number(sR.el.min) : 1)), 0, 1));
      D.text(ctx, "滑動變阻器 R = " + PL.fmt(s.R, 1) + " Ω", resistorX, top - 34, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      // 下排：電池盒（內阻 r）與伏特計
      const bh = 44;
      AP.battery(ctx, sourceX - batteryW / 2, bottom - bh / 2, batteryW, bh);
      D.text(ctx, "E = " + PL.fmt(s.E, 1) + " V　r = " + PL.fmt(s.r, 1) + " Ω", sourceX, bottom + bh / 2 + 18, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      const vmX = W * 0.62, vmY = bottom - 8;
      // 導線（主迴路紅線，伏特計並聯在電池兩端用藍線）
      AP.cable(ctx, [{ x: sourceX - batteryW / 2 - 1, y: bottom }, { x: left, y: bottom }, { x: left, y: top + 8 }, sw.left], red, 3, 3);
      AP.cable(ctx, [sw.right, { x: meterX - 20, y: top + 8 + 26 * 1.12 + 4 }], red, 3, 4);
      AP.cable(ctx, [{ x: meterX + 20, y: top + 8 + 26 * 1.12 + 4 }, rh.posts.tubeL], red, 3, 4);
      AP.cable(ctx, [rh.slider, { x: right, y: top - 14 }, { x: right, y: bottom }, { x: sourceX + batteryW / 2 + 1, y: bottom }], black, 3, 3);
      AP.cable(ctx, [{ x: sourceX + batteryW / 2 + 1, y: bottom + 8 }, { x: vmX - 20, y: vmY + 26 * 1.12 + 4 }], blue, 2.2, 5);
      AP.cable(ctx, [{ x: vmX + 20, y: vmY + 26 * 1.12 + 4 }, { x: right - 6, y: bottom + 6 }], blue, 2.2, 5);
      meter(meterX, top + 8, s.I, "A", "A", +sAmRange.get());
      meter(vmX, vmY, s.U, "V", "V", +sVmRange.get());
      if (closed) D.arrow(ctx, meterX + 36, top - 18, resistorX - resistorW / 2 - 10, top - 18, { color: PL.col("warn"), width: 1.8, label: "I" });
      D.text(ctx, closed ? "閉合電路：E = U + Ir" : "開關斷開：I = 0，U = E", W / 2, 24, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
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
      /* 畫成真的線繞電阻，但長度仍正比於阻值——「這顆比較擋」的視覺隱喻要留著，
         只是把課本符號換成學生在實驗桌上會拿到的那個東西。 */
      PL.apparatus.resistorBox(ctx, x + w / 2, y, w, null, false);
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

    /* 導線畫成有厚度、帶陰影與高光的實物線，取代原本的示意細線 */
    const WIRECOLOR = "rgb(186,54,48)";
    function WIRELINE(ctx, ax, ay, bx, by, color, w) {
      PL.apparatus.wire(ctx, [{ x: ax, y: ay }, { x: bx, y: by }], color === WIRECOLOR ? WIRECOLOR : color, (w || 2) + 1.2);
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      const R1 = sR1.get(), R2 = sR2.get(), V = sV.get(), series = sCfg.get() === "series";
      const Req = series ? R1 + R2 : R1 * R2 / (R1 + R2), Itot = V / Req;
      AP.circuitBoard(ctx, W, H, false);
      /* 接上數位電表：伏特計並聯在電阻兩端、安培計串在主線上——課本量測串並聯的做法 */
      const x0 = 56, x1 = W - 56, top = Math.round(H * 0.28), cy = Math.round(H * 0.8);
      const MW = 76, MH = 92, blue = "rgb(52,98,178)";
      const meterAt = (cx, y, val, unit) => AP.multimeter(ctx, cx - MW / 2, y, MW, MH, PL.fmt(val, val >= 10 ? 1 : 2), { unit });
      // 電池組：高度正比於電壓
      const bh = Math.max(26, 12 + V * 1.6), by = (top + cy) / 2 - bh / 2;
      WIRELINE(ctx, x0, top, x0, cy, WIRECOLOR, 2);
      AP.battery(ctx, x0 - 15, by, 30, bh);
      D.text(ctx, V + " V", x0 - 21, by + bh / 2 + 4, { color: PL.col("text"), size: 12, align: "right", weight: "700" });
      // 主線上的安培計（坐在下方導線上，兩個接孔就是導線的斷點）
      const amX = Math.round(W * 0.26), amY = cy - MH + 14;
      WIRELINE(ctx, x1, top, x1, cy, WIRECOLOR, 2);
      WIRELINE(ctx, x0, cy, amX - MW * 0.18, cy, WIRECOLOR, 2); WIRELINE(ctx, amX + MW * 0.18, cy, x1, cy, WIRECOLOR, 2);
      currentDots(ctx, x1, cy, amX + MW * 0.18, cy, Itot); currentDots(ctx, amX - MW * 0.18, cy, x0, cy, Itot);
      meterAt(amX, amY, Itot, "A");
      D.text(ctx, "安培計（串聯）", amX + MW / 2 + 8, amY + 14, { color: PL.col("text-dim"), size: 10 });
      const vlead = (ax, ay, bx2, low, jack) => AP.cable(ctx, [{ x: ax, y: ay }, { x: ax, y: low }, { x: bx2, y: low }, jack], blue, 1.8, 0);
      if (series) {
        // 串聯：兩顆電阻首尾相接，電流處處相同；兩顆伏特計各量一顆電阻的電壓
        const w1 = 26 + R1 * 3.4, w2 = 26 + R2 * 3.4, startX = (W - (w1 + w2 + 30)) / 2;
        WIRELINE(ctx, x0, top, startX, top, WIRECOLOR, 2); currentDots(ctx, x0, top, startX, top, Itot);
        resBox(ctx, startX, top, R1, "R₁", Itot * R1, Itot);
        WIRELINE(ctx, startX + w1, top, startX + w1 + 30, top, WIRECOLOR, 2); currentDots(ctx, startX + w1, top, startX + w1 + 30, top, Itot);
        resBox(ctx, startX + w1 + 30, top, R2, "R₂", Itot * R2, Itot);
        WIRELINE(ctx, startX + w1 + 30 + w2, top, x1, top, WIRECOLOR, 2); currentDots(ctx, startX + w1 + 30 + w2, top, x1, top, Itot);
        const vy = top + 44, low = vy + MH + 8;
        [[W / 2 - 88, startX, startX + w1, Itot * R1], [W / 2 + 88, startX + w1 + 30, startX + w1 + 30 + w2, Itot * R2]].forEach(m => {
          const jk = { black: { x: m[0] - MW * 0.18, y: vy + MH - 14 }, red: { x: m[0] + MW * 0.18, y: vy + MH - 14 } };
          vlead(m[1], top, jk.black.x, low, jk.black); vlead(m[2], top, jk.red.x, low + 5, jk.red);
          meterAt(m[0], vy, m[3], "V");
        });
        rBranch.set(Itot, 2);
        PL.ui.caption(cv, "串聯：兩顆電阻的電流點速度一模一樣——電流處處相同。電壓按電阻比例分配，兩顆伏特計的讀數加起來就是電池電壓。");
      } else {
        // 並聯：兩條支路電壓相同；電阻小的那條電流點跑得明顯比較快
        const i1 = V / R1, i2 = V / R2, w1 = 26 + R1 * 3.4, w2 = 26 + R2 * 3.4;
        const bx = W / 2 - Math.max(w1, w2) / 2, jx = bx - 34, jx2 = bx + Math.max(w1, w2) + 34, yA = top - 32, yB = top + 42;
        WIRELINE(ctx, x0, top, jx, top, WIRECOLOR, 2); currentDots(ctx, x0, top, jx, top, Itot);
        [[yA, R1, "R₁", i1, w1], [yB, R2, "R₂", i2, w2]].forEach(([yy, rr, lab, ii, ww]) => {
          WIRELINE(ctx, jx, top, jx, yy, WIRECOLOR, 2); WIRELINE(ctx, jx, yy, bx, yy, WIRECOLOR, 2); currentDots(ctx, jx, yy, bx, yy, ii);
          resBox(ctx, bx, yy, rr, lab, V, ii);
          WIRELINE(ctx, bx + ww, yy, jx2, yy, WIRECOLOR, 2); currentDots(ctx, bx + ww, yy, jx2, yy, ii);
          WIRELINE(ctx, jx2, yy, jx2, top, WIRECOLOR, 2);
        });
        WIRELINE(ctx, jx2, top, x1, top, WIRECOLOR, 2); currentDots(ctx, jx2, top, x1, top, Itot);
        const vy = yB + 36, low = vy + MH + 8, jk = { black: { x: W / 2 - MW * 0.18, y: vy + MH - 14 }, red: { x: W / 2 + MW * 0.18, y: vy + MH - 14 } };
        vlead(jx, yB, jk.black.x, low, jk.black); vlead(jx2, yB, jk.red.x, low + 5, jk.red);
        meterAt(W / 2, vy, V, "V");
        D.text(ctx, "伏特計（並聯）", W / 2 + MW / 2 + 8, vy + 14, { color: PL.col("text-dim"), size: 10 });
        rBranch.set(i1, 2);
        PL.ui.caption(cv, "並聯：兩條支路的電壓一樣，但電阻小的那條電流點跑得明顯比較快。把 R₁ 拉到最小、R₂ 拉到最大，速度差距最清楚。");
      }
      D.text(ctx, "等效電阻 " + PL.fmt(Req, 2) + " Ω　總電流 " + PL.fmt(Itot, 2) + " A", 16, 22, { color: PL.col("text-dim"), size: 11 });
      rReq.set(Req, 2); rItot.set(Itot, 2);
    }
    const anim = PL.loop(dt => { if (dt) flow += dt; draw(); }, 40);
    cv.onResize(draw); draw(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 電容器充放電 —— 木板上接好的 RC 電路
   *
   * 舊版幾乎整個畫面都是圖表，電容器只是左上角一個小圖示，
   * 而且極板間距會隨電壓改變——真正的電容器極板是固定的，會變的是板上的電荷。
   * 現在上半部是一塊接好的電路板：電池、單刀雙擲開關（充電／放電）、電阻、
   * 中心零點的安培計（放電時指針往反方向偏）、平行板電容器與跨在兩端的伏特計。
   * 板上的 + / − 電荷隨 Q = CV 增減，極板面積隨 C 變大（C ∝ A）；下半部保留 V–t 與 I–t 圖。
   */
  PL.register("capacitor", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0, mode = "charge", flow = 0;
    const sR = PL.ui.slider(L.controls, { label: "電阻 R", min: 1, max: 10, step: 0.5, value: 4, unit: "kΩ", digits: 1, onInput: () => t = 0 });
    const sC = PL.ui.slider(L.controls, { label: "電容 C", min: 20, max: 200, step: 10, value: 100, unit: "μF", digits: 0, onInput: () => t = 0 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "充電", () => { mode = "charge"; t = 0; anim.start(); }, { primary: true });
    PL.ui.button(row, "放電", () => { mode = "discharge"; t = 0; anim.start(); });
    const rTau = PL.ui.readout(L.readouts, { label: "時間常數 τ=RC", unit: "s" });
    const rV = PL.ui.readout(L.readouts, { label: "電容電壓", unit: "×V₀" });
    const rI = PL.ui.readout(L.readouts, { label: "電流 I", unit: "×V₀/R" });
    // 指針式電表：bipolar 為中心零點（−1..1），否則 0..1
    function gauge(ctx, cx, cy, r, val, label, bipolar) {
      const AP = PL.apparatus, w = r * 2.3, h = r * 1.9, x = cx - w / 2, y = cy - h / 2;
      AP.contactShadow(ctx, cx, y + h + 3, w * 0.6);
      AP.rrPath(ctx, x, y, w, h, 6); ctx.fillStyle = "rgb(60,66,78)"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 1; ctx.stroke();
      PL.theme.note(ctx, "rgb(60,66,78)", x, y, w, h);
      const fx = x + 5, fy = y + 5, fw = w - 10, fh = h * 0.64;
      AP.rrPath(ctx, fx, fy, fw, fh, 3); ctx.fillStyle = "rgb(247,243,232)"; ctx.fill();
      PL.theme.note(ctx, "rgb(247,243,232)", fx, fy, fw, fh);
      const pcx = cx, pcy = fy + fh * 0.95, R = fh * 0.84, span = 0.62;
      ctx.save(); ctx.strokeStyle = "rgba(40,44,52,0.85)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i / 5 - 1) * span, r0 = i % 5 === 0 ? R * 0.7 : R * 0.82;
        ctx.moveTo(pcx + Math.cos(a) * r0, pcy + Math.sin(a) * r0); ctx.lineTo(pcx + Math.cos(a) * R * 0.95, pcy + Math.sin(a) * R * 0.95);
      }
      ctx.stroke(); ctx.restore();
      (bipolar ? ["−", "0", "+"] : ["0", "0.5", "1"]).forEach((tx, i) => {
        const a = -Math.PI / 2 + (i - 1) * span;
        D.text(ctx, tx, pcx + Math.cos(a) * R * 0.52, pcy + Math.sin(a) * R * 0.52 + 3, { color: "#33363c", size: 8.5, align: "center", weight: "700" });
      });
      const f = bipolar ? PL.clamp(val, -1, 1) : PL.clamp(val, 0, 1) * 2 - 1, a = -Math.PI / 2 + f * span;
      ctx.save(); ctx.strokeStyle = "rgb(198,56,46)"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(pcx + Math.cos(a) * R * 0.92, pcy + Math.sin(a) * R * 0.92); ctx.stroke(); ctx.restore();
      AP.brassDisc(ctx, pcx, pcy, 2.6);
      D.text(ctx, label, cx, y + h - 5, { color: "#e8ecf2", size: 10.5, align: "center", weight: "800" });
      const tl = { x: x + 8, y: y + h - 8 }, tr = { x: x + w - 8, y: y + h - 8 };
      [[tl, "rgb(196,62,52)"], [tr, "rgb(34,38,46)"]].forEach(q => { ctx.fillStyle = q[1]; ctx.beginPath(); ctx.arc(q[0].x, q[0].y, 4, 0, TAU); ctx.fill(); AP.brassDisc(ctx, q[0].x, q[0].y, 1.8); });
      return { l: tl, r: tr };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus, s = PL.clamp(W / 800, 0.6, 1.4);
      const tau = sR.get() * sC.get() / 1000, charging = mode === "charge";
      const e = Math.exp(-t / tau), V = charging ? 1 - e : e, I = charging ? e : -e;
      const sh = Math.round(H * 0.46);
      /* 上半部：俯視的電路板 */
      AP.deskTop(ctx, 0, 0, W, sh);
      ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(0, sh, W, 3);
      const xL = 44 * s, xS = 170 * s, xR = W - 170 * s, xJ = 250 * s, yT = 46 * s, yB = sh - 40 * s, yM = yB - 38 * s;
      const yC = (yT + yB) / 2, gap = 36 * s, pw = (44 + sC.get() / 200 * 66) * s, xA = xR - 116 * s, xRes = (xS + xA) / 2;
      const Cc = { x: xS - 50 * s, y: yT }, Dc = { x: xS - 36 * s, y: yT + 36 * s }, P = { x: xS, y: yT };
      const bx = xL + 64 * s, bw = 64 * s, bplus = { x: bx - 1, y: yB }, bminus = { x: bx + bw + 1, y: yB };
      const red = "rgb(186,54,48)", blk = "rgb(40,44,52)";
      const topPlate = { x: xR, y: yC - gap / 2 - 8 * s }, botPlate = { x: xR, y: yC + gap / 2 + 8 * s };
      // 導線（先畫，元件蓋在上面）
      const wBat = [bplus, { x: xL, y: yB }, { x: xL, y: yT }, Cc];
      const wTop = [P, { x: xR, y: yT }, topPlate];
      const wBot = [botPlate, { x: xR, y: yB }, bminus];
      const wDis = [Dc, { x: Dc.x, y: yM }, { x: xJ, y: yM }, { x: xJ, y: yB }];
      AP.cable(ctx, wBat, red, 2.6, 2); AP.cable(ctx, wTop, red, 2.6, 2);
      AP.cable(ctx, wBot, blk, 2.6, 2); AP.cable(ctx, wDis, "rgb(58,98,170)", 2.6, 2);
      // 電流流動（亮點沿著目前那個迴路跑，越跑越慢）
      if (Math.abs(I) > 0.02) {
        const o = { r: 2 * s, gap: 20 * s, color: "rgba(255,226,120," + PL.fmt(0.35 + 0.6 * Math.abs(I), 2) + ")" };
        if (charging) { AP.flowDots(ctx, wBat, flow, 1, o); AP.flowDots(ctx, wTop, flow, 1, o); AP.flowDots(ctx, wBot, flow, 1, o); }
        else {
          AP.flowDots(ctx, [topPlate, { x: xR, y: yT }, P], flow, 1, o);
          AP.flowDots(ctx, [Dc, { x: Dc.x, y: yM }, { x: xJ, y: yM }, { x: xJ, y: yB }, { x: xR, y: yB }, botPlate], flow, 1, o);
        }
      }
      // 電池組
      AP.battery(ctx, bx, yB - 22 * s, bw, 44 * s);
      // 單刀雙擲開關（俯視）：電木底座、三個黃銅接點、閘刀倒向充電或放電
      AP.rrPath(ctx, xS - 64 * s, yT - 16 * s, 80 * s, 68 * s, 6); ctx.fillStyle = "rgb(72,60,54)"; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      PL.theme.note(ctx, "rgb(72,60,54)", xS - 64 * s, yT - 16 * s, 80 * s, 68 * s);
      [P, Cc, Dc].forEach(q => AP.brassDisc(ctx, q.x, q.y, 5 * s));
      const tip = charging ? Cc : Dc;
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = "rgb(216,180,106)"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.strokeStyle = "rgb(34,30,28)"; ctx.lineWidth = 8 * s; ctx.beginPath();
      ctx.moveTo(P.x + (tip.x - P.x) * 0.92, P.y + (tip.y - P.y) * 0.92); ctx.lineTo(P.x + (tip.x - P.x) * 1.22, P.y + (tip.y - P.y) * 1.22); ctx.stroke();
      ctx.restore();
      D.text(ctx, "充電", Cc.x + 2 * s, yT - 6 * s, { color: "#f3e6cc", size: 9.5, align: "center", weight: "700" });
      D.text(ctx, "放電", Dc.x + 22 * s, Dc.y + 12 * s, { color: "#f3e6cc", size: 9.5, align: "center", weight: "700" });
      // 電阻與安培計（中心零點：放電時電流反向，指針往負邊偏）
      AP.resistorBox(ctx, xRes, yT, 100 * s, "R = " + PL.fmt(sR.get(), 1) + " kΩ", false);
      gauge(ctx, xA, yT + 6 * s, 26 * s, I, "A", true);
      // 平行板電容器：板面積隨 C 變大；電荷量 Q = CV
      AP.steel(ctx, xR - pw / 2, topPlate.y - 4 * s, pw, 8 * s, 6);
      AP.steel(ctx, xR - pw / 2, botPlate.y - 4 * s, pw, 8 * s, 6);
      ctx.fillStyle = "rgba(255,90,80," + PL.fmt(0.5 * V, 2) + ")"; ctx.fillRect(xR - pw / 2, topPlate.y - 4 * s, pw, 8 * s);
      ctx.fillStyle = "rgba(80,140,255," + PL.fmt(0.5 * V, 2) + ")"; ctx.fillRect(xR - pw / 2, botPlate.y - 4 * s, pw, 8 * s);
      const nq = Math.round(V * pw / (10 * s));
      for (let i = 0; i < nq; i++) {
        const x = xR - pw / 2 + (i + 0.5) * pw / Math.max(1, nq);
        D.text(ctx, "+", x, topPlate.y + 14 * s, { color: POS, size: 11, align: "center", weight: "800" });
        D.text(ctx, "−", x, botPlate.y - 7 * s, { color: NEG, size: 11, align: "center", weight: "800" });
      }
      const nf = Math.round(V * 4);
      for (let i = 0; i < nf; i++) {
        const x = xR - pw / 2 + (i + 0.5) * pw / nf;
        D.arrow(ctx, x + 4 * s, topPlate.y + 16 * s, x + 4 * s, botPlate.y - 16 * s, { color: "rgba(255,210,110," + PL.fmt(0.3 + 0.6 * V, 2) + ")", width: 1.2, head: 4 });
      }
      D.text(ctx, "C = " + sC.get() + " μF", xR - pw / 2 - 8 * s, yC + 4, { color: PL.col("text"), size: 10.5, align: "right", weight: "700" });
      // 伏特計並聯在電容器兩端
      const vm = gauge(ctx, xR + 108 * s, yC, 26 * s, V, "V", false);
      AP.cable(ctx, [{ x: xR + pw / 2, y: topPlate.y }, { x: vm.l.x, y: topPlate.y }, vm.l], red, 2, 2);
      AP.cable(ctx, [{ x: xR + pw / 2, y: botPlate.y }, { x: vm.r.x, y: botPlate.y }, vm.r], blk, 2, 2);
      AP.lcd(ctx, W - 140 * s, sh - 32 * s, 124 * s, 22 * s, "t = " + PL.fmt(t, 2) + " s");
      AP.valueChip(ctx, 12 * s, 8 * s, W >= 640 ? (charging ? "充電中：電池 → 電阻 → 電容器" : "放電中：電容器 → 電阻（電池斷開）") : (charging ? "充電中" : "放電中"), charging ? "rgba(255,196,110,0.95)" : "rgba(120,190,255,0.95)");
      /* 下半部：V–t 與 I–t */
      const gx = 56, gy = sh + 24, gw = W - gx - 20, gh = H - gy - 22;
      const g = PL.graph(cv, { x: gx, y: gy, w: gw, h: gh }, { x0: 0, x1: 5 * tau, y0: charging ? 0 : -1.05, y1: 1.05 });
      g.frame({ title: charging ? "充電：電壓上升、電流衰減" : "放電：電壓衰減、電流反向衰減", xlabel: "t (s)" }); g.grid(5, 4);
      if (!charging) g.hline(0, { color: PL.col("text-faint"), width: 1 });
      g.fn(tt => charging ? 1 - Math.exp(-tt / tau) : Math.exp(-tt / tau), { color: MC(), width: 2.2 });
      g.fn(tt => (charging ? 1 : -1) * Math.exp(-tt / tau), { color: PL.col("accent-2"), width: 2, dash: [4, 3] });
      g.vline(Math.min(t, 5 * tau), { color: PL.col("text-faint"), dash: [3, 3], width: 1 });
      g.dot(Math.min(t, 5 * tau), V, { color: MC(), glow: MC() });
      g.dot(Math.min(t, 5 * tau), I, { color: PL.col("accent-2") });
      D.text(ctx, "V", gx + gw - 20, gy + 14, { color: MC(), size: 11, weight: "700" }); D.text(ctx, "I", gx + gw - 20, gy + 28, { color: PL.col("accent-2"), size: 11, weight: "700" });
      rTau.set(tau, 2); rV.set(V, 3); rI.set(I, 3);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        const tau = sR.get() * sC.get() / 1000;
        t += dt; flow += dt * 70 * Math.exp(-t / tau);
        if (t > 5 * tau) anim.stop();
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 惠斯登電橋 */
  PL.register("wheatstone", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      const cx = W / 2, cy = H / 2 + 8, s = Math.min(W, H) * 0.34;
      const AP = PL.apparatus;
      /* 桌上的惠斯登電橋：四顆電阻接成菱形，中間跨一個檢流計，上方接電池盒 */
      AP.circuitBoard(ctx, W, H, false);
      const T = { x: cx, y: cy - s }, B = { x: cx, y: cy + s }, Ln = { x: cx - s, y: cy }, Rn = { x: cx + s, y: cy };
      const red = "rgb(186,54,48)";
      const arm = (a, b, lab, c) => {
        AP.cable(ctx, [a, b], red, 2.6, 0);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save(); ctx.translate(mx, my); ctx.rotate(ang); AP.resistorBox(ctx, 0, 0, s * 0.5, null, false); ctx.restore();
        D.text(ctx, lab, mx + (mx < cx ? -30 : 30), my + (my < cy ? -8 : 18), { color: c, size: 11.5, align: "center", weight: "800" });
      };
      arm(T, Ln, "R₁=" + R1, PL.col("accent-2")); arm(T, Rn, "R₂=" + R2, PL.col("accent-2"));
      arm(Ln, B, "R₃=" + R3, MC()); arm(Rn, B, "Rₓ=" + Rx, MC());
      // 電池盒接在上下兩個節點之間（繞到左側）
      AP.battery(ctx, cx - s - 96, cy - 22, 54, 44);
      AP.cable(ctx, [T, { x: cx - s - 69, y: T.y }, { x: cx - s - 69, y: cy - 24 }], red, 2.6, 2);
      AP.cable(ctx, [{ x: cx - s - 69, y: cy + 24 }, { x: cx - s - 69, y: B.y }, B], "rgb(40,44,52)", 2.6, 2);
      // 檢流計跨在左右兩節點之間
      const VL = R3 / (R1 + R3), VR = Rx / (R2 + Rx), diff = VL - VR;
      AP.cable(ctx, [Ln, { x: cx - 30, y: cy }], "rgb(52,98,178)", 2.2, 2);
      AP.cable(ctx, [{ x: cx + 30, y: cy }, Rn], "rgb(52,98,178)", 2.2, 2);
      AP.meter(ctx, cx, cy - 6, 22, PL.clamp(0.5 + diff * 2, 0, 1), "G");
      [T, B, Ln, Rn].forEach(p => AP.brassDisc(ctx, p.x, p.y, 4));
      const balanced = Math.abs(R1 * Rx - R2 * R3) < 0.5;
      rG.set(diff * 100, 1); rBal.set(balanced ? "平衡 ✓" : "不平衡"); rRx.set(R2 * R3 / R1, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 帶電粒子在電場中的偏轉 */
  PL.register("e-deflection", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sV = PL.ui.slider(L.controls, { label: "入射速度 v", min: 2, max: 10, step: 0.5, value: 6, unit: "", digits: 1 });
    const sE = PL.ui.slider(L.controls, { label: "偏轉電壓 V", min: -10, max: 10, step: 0.5, value: 6, unit: "", digits: 1 });
    PL.ui.note(L.controls, "板內水平等速、鉛直等加速，軌跡為拋物線——與拋體運動一模一樣。");
    const rY = PL.ui.readout(L.readouts, { label: "板內偏轉量", unit: "" });
    const rAng = PL.ui.readout(L.readouts, { label: "出射角", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2 - 8, plateL = 128, plateR = W * 0.58, gap = 74, v = sV.get(), E = sE.get(), K = E / (v * v) * 0.9;
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, cy + 150, {});
      [W * 0.22, W * 0.78].forEach(sx => { AP.steel(ctx, sx - 4, cy + 120, 8, 30, 8); AP.steel(ctx, sx - 22, cy + 146, 44, 6, -6); });
      // 真空管外殼（玻璃管質感）
      ctx.save();
      const tube = ctx.createLinearGradient(0, cy - 120, 0, cy + 120);
      tube.addColorStop(0, "rgba(180,196,220,0.06)");
      tube.addColorStop(0.5, "rgba(200,214,236,0.10)");
      tube.addColorStop(1, "rgba(180,196,220,0.06)");
      ctx.fillStyle = tube;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(46, cy - 120, W - 110, 240, 40) : ctx.rect(46, cy - 120, W - 110, 240); ctx.fill();
      ctx.strokeStyle = "rgba(150,170,200,0.35)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      // 電子槍：燈絲＋聚焦環
      const gunX = 66;
      const gg = ctx.createLinearGradient(gunX - 12, 0, gunX + 20, 0);
      gg.addColorStop(0, "rgb(96,102,118)"); gg.addColorStop(0.5, "rgb(176,184,200)"); gg.addColorStop(1, "rgb(100,108,124)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(gunX - 12, cy - 26, 44, 52, 8) : ctx.rect(gunX - 12, cy - 26, 44, 52); ctx.fill();
      ctx.strokeStyle = "rgba(60,66,80,0.7)"; ctx.lineWidth = 1; ctx.stroke();
      // 燈絲（暖光）
      ctx.strokeStyle = "rgba(255,180,90,0.9)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(gunX - 4, cy - 8); ctx.quadraticCurveTo(gunX + 4, cy, gunX - 4, cy + 8); ctx.stroke();
      D.text(ctx, "電子槍", gunX + 8, cy + 44, { color: PL.col("text-dim"), size: 10, align: "center" });
      // 偏轉板
      const pg = ctx.createLinearGradient(0, cy - gap / 2 - 8, 0, cy - gap / 2);
      pg.addColorStop(0, "rgb(110,116,132)"); pg.addColorStop(1, "rgb(180,188,204)");
      ctx.fillStyle = pg;
      D.rect(ctx, plateL, cy - gap / 2 - 8, plateR - plateL, 8, { fill: POS }); D.text(ctx, "＋", plateL - 14, cy - gap / 2, { color: POS, size: 13 });
      D.rect(ctx, plateL, cy + gap / 2, plateR - plateL, 8, { fill: NEG }); D.text(ctx, "－", plateL - 14, cy + gap / 2 + 12, { color: NEG, size: 13 });
      for (let x = plateL + 20; x < plateR; x += 40) D.arrow(ctx, x, cy - gap / 2, x, cy + gap / 2, { color: "rgba(77,182,170,0.28)", width: 1 });
      // 螢光屏：右側綠色刻度屏
      const scrX = W - 58;
      const sg = ctx.createLinearGradient(scrX, 0, scrX + 14, 0);
      sg.addColorStop(0, "rgba(120,220,160,0.28)");
      sg.addColorStop(1, "rgba(60,100,80,0.45)");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(scrX, cy - 130, 16, 260, 5) : ctx.rect(scrX, cy - 130, 16, 260); ctx.fill();
      ctx.strokeStyle = "rgba(120,200,150,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      for (let yy = cy - 120; yy <= cy + 120; yy += 24) { D.line(ctx, scrX + 4, yy, scrX + 12, yy, "rgba(140,230,170,0.4)", 1); }
      D.text(ctx, "螢光屏", scrX + 8, cy - 140, { color: PL.col("text-faint"), size: 10, align: "center" });
      const yR = K * (plateR - plateL) * (plateR - plateL), slope = 2 * K * (plateR - plateL);
      // 電子束：亮綠螢光軌跡（外暈＋內芯）
      ctx.save(); ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(120,255,180,0.22)"; ctx.lineWidth = 7; ctx.beginPath();
      for (let x = plateL; x <= scrX; x += 2) { let y = x <= plateR ? cy + K * (x - plateL) * (x - plateL) : cy + yR + slope * (x - plateR); if (y > cy + gap / 2 && x < plateR) { y = cy + gap / 2; } x === plateL ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      ctx.strokeStyle = "rgba(180,255,215,0.9)"; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = plateL; x <= scrX; x += 2) { let y = x <= plateR ? cy + K * (x - plateL) * (x - plateL) : cy + yR + slope * (x - plateR); if (y > cy + gap / 2 && x < plateR) { y = cy + gap / 2; } x === plateL ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      ctx.restore();
      D.arrow(ctx, 34, cy, plateL - 4, cy, { color: "#fff", width: 2, label: "v" });
      const tt = (t * v * 26) % (scrX - plateL), xp = plateL + tt;
      const yp = xp <= plateR ? cy + K * (xp - plateL) * (xp - plateL) : cy + yR + slope * (xp - plateR);
      if (Math.abs(yp - cy) < gap / 2 || xp > plateR) D.disc(ctx, xp, yp, 6, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 8 });
      // 撞擊螢光點
      const hitY = cy + yR + slope * (scrX - plateR);
      if (Math.abs(hitY) < 130) {
        ctx.fillStyle = "rgba(160,255,200,0.9)";
        ctx.beginPath(); ctx.arc(scrX + 8, cy + hitY, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(160,255,200,0.3)";
        ctx.beginPath(); ctx.arc(scrX + 8, cy + hitY, 8, 0, Math.PI * 2); ctx.fill();
      }
      rY.set(Math.abs(yR), 1); rAng.set(Math.atan(slope) * 180 / Math.PI, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
