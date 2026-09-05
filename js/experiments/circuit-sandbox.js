/* 電路工坊：自由接線實驗室
 *
 * 對標「電路工坊」的核心體驗：器材擺在桌上，學生點兩個接線柱就把它們接起來，
 * 電路即時求解——電表真的會動、燈泡真的會亮、短路真的會出事。
 *
 * 電路求解用節點電壓法（MNA）：
 *   · 電池以諾頓等效（E/r 電流源 + 內阻 r）參與，避開理想電壓源的矩陣擴充
 *   · 開關閉合 = 0.001 Ω、安培計 = 0.05 Ω、伏特計 = 2 MΩ——
 *     把儀表與開關都當成「極端數值的電阻」，一套電阻性 MNA 就能解所有拓樸
 *   · 導線本身 0.02 Ω，讓「直接把電池兩極接起來」算出 13 A 的短路電流，
 *     畫面也會真的警告，而不是假裝沒事
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const AP = PL.apparatus;
  const MC = () => PL.col("m-color", "#4fc3f7");

  PL.register("circuit-sandbox", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66, 900);
    const ctx = cv.ctx;                          // 供各繪圖輔助函式共用
    let view = "physical";          // physical | schematic
    let swClosed = true;
    let rheoR = 6;                  // 滑動變阻器 Ω
    // 預設接好示範電路：開頁就是一個會亮的迴路，學生再自由改接
    let wires = [
      { a: "bat+", b: "swL" }, { a: "swR", b: "A1" }, { a: "A2", b: "bulbL" },
      { a: "bulbR", b: "bat−" }, { a: "V1", b: "bulbL" }, { a: "V2", b: "bulbR" }
    ];
    let pending = null;             // 已點選、等待配對的接線柱
    let burnt = false;              // 燈泡燒毀
    let shortFlash = 0;

    /* ---------------- 元件與接線柱（座標隨畫布寬度按比例排列） ---------------- */
    let T = {};                     // termId -> { x, y, comp }
    let GEO = {};                   // 每次繪圖重算的元件幾何
    function layout(W, H) {
      const benchY = H - 128, topY = 128;
      GEO.bat = { x: 0.10 * W + 6, y: benchY - 30, w: 78, h: 60 };
      GEO.sw = { cx: 0.30 * W, baseY: benchY + 2, w: 64 };
      GEO.ammeter = { cx: 0.46 * W, cy: benchY - 52, r: 30 };
      GEO.bulb = { cx: 0.50 * W, cy: topY + 26, r: 22 };
      GEO.rheo = { cx: 0.78 * W, baseY: benchY + 2, w: 96 };
      GEO.voltmeter = { cx: 0.87 * W, cy: topY + 62, r: 30 };
      T = {
        "bat+": { x: GEO.bat.x, y: benchY, comp: "bat" },
        "bat−": { x: GEO.bat.x + GEO.bat.w, y: benchY, comp: "bat" },
        "swL": { x: GEO.sw.cx - GEO.sw.w / 2 + 7, y: benchY, comp: "sw" },
        "swR": { x: GEO.sw.cx + GEO.sw.w / 2 - 7, y: benchY, comp: "sw" },
        "A1": { x: GEO.ammeter.cx - GEO.ammeter.r * 0.72, y: benchY, comp: "ammeter" },
        "A2": { x: GEO.ammeter.cx + GEO.ammeter.r * 0.72, y: benchY, comp: "ammeter" },
        "bulbL": { x: GEO.bulb.cx - 18, y: topY + 34, comp: "bulb" },
        "bulbR": { x: GEO.bulb.cx + 18, y: topY + 34, comp: "bulb" },
        "rheoL": { x: GEO.rheo.cx - GEO.rheo.w / 2 + 8, y: benchY, comp: "rheo" },
        "rheoR": { x: GEO.rheo.cx + GEO.rheo.w / 2 - 8, y: benchY, comp: "rheo" },
        "V1": { x: GEO.voltmeter.cx - GEO.voltmeter.r * 0.72, y: topY + 96, comp: "volt" },
        "V2": { x: GEO.voltmeter.cx + GEO.voltmeter.r * 0.72, y: topY + 96, comp: "volt" }
      };
    }

    /* ---------------- 控制項 ---------------- */
    PL.ui.section(L.controls, "檢視");
    PL.ui.chipGroup(L.controls, {
      value: "physical",
      options: [{ value: "physical", label: "實物圖" }, { value: "schematic", label: "電路圖" }],
      onChange: v => { view = v; }
    });
    PL.ui.section(L.controls, "元件參數");
    const sRheo = PL.ui.slider(L.controls, { label: "滑動變阻器", min: 0.5, max: 20, step: 0.5, value: 6, unit: "Ω", digits: 1, onInput: v => { rheoR = v; draw(); } });
    const sE = PL.ui.slider(L.controls, { label: "電池電動勢 E", min: 1.5, max: 9, step: 0.5, value: 6, unit: "V", digits: 1, onInput: draw });
    PL.ui.note(L.controls, "點擊兩個接線柱（銅色小圓點）把它們接起來；再點一次已選的接線柱可取消。點擊閘刀開關本體可以開合。");
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "開關 S 開/合", () => { swClosed = !swClosed; draw(); });
    PL.ui.button(row, "一鍵示範接法", () => {
      wires = [
        { a: "bat+", b: "swL" }, { a: "swR", b: "A1" }, { a: "A2", b: "bulbL" },
        { a: "bulbR", b: "bat−" }, { a: "V1", b: "bulbL" }, { a: "V2", b: "bulbR" }
      ];
      pending = null; burnt = false;
      draw();
    }, { primary: true });
    PL.ui.button(row, "清除全部接線", () => { wires = []; pending = null; burnt = false; draw(); });

    const rBat = PL.ui.readout(L.readouts, { label: "電池電流", unit: "A" });
    const rA = PL.ui.readout(L.readouts, { label: "安培計讀值", unit: "A" });
    const rV = PL.ui.readout(L.readouts, { label: "伏特計讀值", unit: "V" });
    const rP = PL.ui.readout(L.readouts, { label: "燈泡功率", unit: "W" });

    /* ---------------- 電路求解（MNA） ---------------- */
    const BULB_R = 6, BULB_P_MAX = 9, E_R = 0.3, WIRE_R = 0.02;
    function solve() {
      const E = sE.get();
      // 節點：只統計有接線的接線柱
      const idx = new Map(), ids = [];
      wires.forEach(w => [w.a, w.b].forEach(t => {
        if (!idx.has(t)) { idx.set(t, ids.length); ids.push(t); }
      }));
      const n = ids.length;
      const out = { V: {}, aI: 0, vV: 0, batI: 0, short: false, bulbP: 0 };
      const zero = () => { rBat.set(0, 2); rA.set(0, 2); rV.set(0, 2); rP.set(0, 2); };
      if (n < 2) { zero(); return out; }
      const gnd = idx.has("bat−") ? "bat−" : ids[0];
      const gi = idx.get(gnd);
      const mi = i => (i === gi ? -1 : (i < gi ? i : i - 1));   // 節點 → 矩陣索引
      // 電阻性元件（兩端都有接線才成立）
      const R = [];
      const addR = (a, b, r) => { if (idx.has(a) && idx.has(b) && r > 0) R.push([idx.get(a), idx.get(b), r]); };
      wires.forEach(w => addR(w.a, w.b, WIRE_R));
      addR("bat+", "bat−", E_R);                                   // 電池內阻
      if (swClosed) addR("swL", "swR", 0.001);
      addR("bulbL", "bulbR", burnt ? 1e9 : BULB_R);
      addR("rheoL", "rheoR", Math.max(0.05, rheoR));
      addR("A1", "A2", 0.05);
      addR("V1", "V2", 2e6);
      // MNA 矩陣（接地行/列移除）
      const m = n - 1;
      const G = Array.from({ length: m }, () => new Float64Array(m));
      const b = new Float64Array(m);
      R.forEach(([ia, ib, r]) => {
        const gv = 1 / r, ma = mi(ia), mb = mi(ib);
        if (ma >= 0) G[ma][ma] += gv;
        if (mb >= 0) G[mb][mb] += gv;
        if (ma >= 0 && mb >= 0) { G[ma][mb] -= gv; G[mb][ma] -= gv; }
      });
      // 電池（諾頓等效）：E/r 電流源由 bat− 流向 bat+
      if (idx.has("bat+") && idx.has("bat−")) {
        const mp = mi(idx.get("bat+")), mm = mi(idx.get("bat−"));
        const src = E / E_R;
        if (mp >= 0) b[mp] += src;
        if (mm >= 0) b[mm] -= src;
      }
      for (let i = 0; i < m; i++) G[i][i] += 1e-9;   // 對地微漏，保證矩陣非奇異
      // 高斯消去（帶部分樞軸）＋回代
      for (let col = 0; col < m; col++) {
        let piv = col;
        for (let r2 = col + 1; r2 < m; r2++) if (Math.abs(G[r2][col]) > Math.abs(G[piv][col])) piv = r2;
        if (Math.abs(G[piv][col]) < 1e-14) continue;
        if (piv !== col) {
          const tG = G[piv]; G[piv] = G[col]; G[col] = tG;
          const tb = b[piv]; b[piv] = b[col]; b[col] = tb;
        }
        for (let r2 = col + 1; r2 < m; r2++) {
          const f = G[r2][col] / G[col][col];
          if (!f) continue;
          for (let k = col; k < m; k++) G[r2][k] -= f * G[col][k];
          b[r2] -= f * b[col];
        }
      }
      const x = new Float64Array(m);
      for (let r2 = m - 1; r2 >= 0; r2--) {
        let s = b[r2];
        for (let k = r2 + 1; k < m; k++) s -= G[r2][k] * x[k];
        x[r2] = s / G[r2][r2];
      }
      // 節點電位
      const Vof = t => {
        if (!idx.has(t)) return 0;
        const i = idx.get(t);
        return i === gi ? 0 : x[mi(i)];
      };
      // 元件電流
      const cur = (a, b2, r) => (Vof(a) - Vof(b2)) / r;
      out.aI = (idx.has("A1") && idx.has("A2")) ? Math.abs(cur("A1", "A2", 0.05)) : 0;
      out.vV = (idx.has("V1") && idx.has("V2")) ? Math.abs(Vof("V1") - Vof("V2")) : 0;
      out.bulbP = (idx.has("bulbL") && idx.has("bulbR")) ? Math.abs(cur("bulbL", "bulbR", BULB_R)) ** 2 * BULB_R : 0;
      out.batI = (idx.has("bat+") && idx.has("bat−")) ? Math.abs((E - (Vof("bat+") - Vof("bat−"))) / E_R) : 0;
      out.short = out.batI > 10;
      rBat.set(out.batI, 2); rA.set(out.aI, 3); rV.set(out.vV, 2); rP.set(out.bulbP, 2);
      return out;
    }

    /* ---------------- 互動：點接線柱接線 ---------------- */
    const canvasPos = e => {
      const r = cv.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (cv.W / r.width), y: (e.clientY - r.top) * (cv.H / r.height) };
    };
    L.canvasWrap.addEventListener("pointerdown", e => {
      const { x, y } = canvasPos(e);
      layout(cv.W, cv.H);
      // 點閘刀開關本體 → 開/合
      if (Math.abs(x - GEO.sw.cx) < GEO.sw.w / 2 && Math.abs(y - (GEO.sw.baseY - 12)) < 22) {
        swClosed = !swClosed; draw(); return;
      }
      // 點接線柱 → 接線
      let hit = null;
      Object.entries(T).forEach(([id, p]) => { if (Math.hypot(x - p.x, y - p.y) < 15) hit = id; });
      if (!hit) { if (pending) { pending = null; draw(); } return; }
      if (pending === hit) { pending = null; return; }        // 再點一次取消
      if (pending) {
        const dup = wires.some(w => (w.a === pending && w.b === hit) || (w.a === hit && w.b === pending));
        if (!dup) wires.push({ a: pending, b: hit });
        pending = null;
      } else pending = hit;
      draw();   // 暫停時也要立刻反映新的接線狀態
    });

    /* ---------------- 繪圖 ---------------- */
    function drawWiresPhysical(sol) {
      wires.forEach(w => {
        const a = T[w.a], b = T[w.b];
        AP.cable(ctx, [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], "rgb(186,54,48)", 3.4, 5);
      });
      // 電流動畫：沿每條導線跑點，速度正比於該導線電流（近似：全部用電池電流）
      if (sol.batI > 0.02 && !sol.short) {
        wires.forEach((w, wi) => {
          const a = T[w.a], b = T[w.b];
          const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 46));
          for (let i = 0; i < n; i++) {
            const s2 = ((t * Math.min(2.5, sol.batI * 0.9) + i / n + wi * 0.37) % 1);
            D.disc(ctx, a.x + (b.x - a.x) * s2, a.y + (b.y - a.y) * s2 + 0, 2.4, { fill: "#ffe9a8", glow: "rgba(255,233,168,0.55)", glowSize: 5 });
          }
        });
      }
    }
    function drawWiresSchematic(sol) {
      const ink = "rgba(34,42,54,0.92)";
      const deg = {};
      wires.forEach(w => { deg[w.a] = (deg[w.a] || 0) + 1; deg[w.b] = (deg[w.b] || 0) + 1; });
      wires.forEach(w => {
        const a = T[w.a], b = T[w.b];
        const my = (a.y + b.y) / 2;
        AP.symWire(ctx, [{ x: a.x, y: a.y }, { x: a.x, y: my }, { x: b.x, y: my }, { x: b.x, y: b.y }], ink);
      });
      Object.entries(deg).forEach(([id, d]) => { if (d > 1) AP.symJunction(ctx, T[id].x, T[id].y, ink); });
    }
    function drawComponents(sol) {
      const live = sol.batI > 0.05 && !sol.short;
      // 電池組
      AP.battery(ctx, GEO.bat.x, GEO.bat.y, GEO.bat.w, GEO.bat.h);
      // 閘刀開關（斷路時閘刀翹起）
      AP.knifeSwitch(ctx, GEO.sw.cx, GEO.sw.baseY, GEO.sw.w, swClosed ? 0 : 1);
      // 電表：指針由解出的電流/電壓驅動
      AP.meter(ctx, GEO.ammeter.cx, GEO.ammeter.cy, GEO.ammeter.r, PL.clamp(sol.aI / 1.5, 0, 1), "A");
      AP.meter(ctx, GEO.voltmeter.cx, GEO.voltmeter.cy, GEO.voltmeter.r, PL.clamp(sol.vV / 6, 0, 1), "V");
      // 燈泡
      const bright = burnt ? 0 : PL.clamp(sol.bulbP / BULB_P_MAX, 0, 1);
      AP.bulb(ctx, GEO.bulb.cx, GEO.bulb.cy, GEO.bulb.r, bright);
      // 滑動變阻器
      AP.rheostat(ctx, GEO.rheo.cx, GEO.rheo.baseY, GEO.rheo.w, PL.clamp(rheoR / 20, 0, 1));
      // 接線柱
      Object.entries(T).forEach(([id, p]) => {
        const sel = pending === id;
        D.disc(ctx, p.x, p.y, sel ? 6.5 : 4.2, { fill: sel ? PL.col("warn") : "rgb(198,164,96)", glow: sel ? PL.col("warn") : null, glowSize: sel ? 8 : 0 });
        ctx.strokeStyle = sel ? "rgba(255,196,110,0.9)" : "rgba(24,30,40,0.7)";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, sel ? 9 : 5.4, 0, TAU); ctx.stroke();
      });
      if (pending) {
        const p = T[pending];
        D.text(ctx, p.x, p.y - 22, "已選 " + pending + "，點另一個接線柱", { color: PL.col("warn"), size: 10, align: "center", weight: "700" });
      }
    }
    function drawSchematicSymbols(sol) {
      AP.symBattery(ctx, GEO.bat.x + GEO.bat.w / 2, GEO.bat.y + GEO.bat.h / 2, false, "rgba(34,42,54,0.92)");
      AP.symSwitch(ctx, GEO.sw.cx, GEO.sw.baseY - 6, swClosed, false, "rgba(34,42,54,0.92)");
      AP.symBulb(ctx, GEO.bulb.cx, GEO.bulb.cy, sol.bulbP > 0.2 && !burnt, "rgba(34,42,54,0.92)");
      AP.symRheostat(ctx, GEO.rheo.cx, GEO.rheo.baseY - 22, false, "rgba(34,42,54,0.92)", rheoR + " Ω");
      AP.symMeter(ctx, GEO.ammeter.cx, GEO.ammeter.cy, "A", null, "rgba(34,42,54,0.92)", MC());
      AP.symMeter(ctx, GEO.voltmeter.cx, GEO.voltmeter.cy, "V", null, "rgba(34,42,54,0.92)", PL.col("accent-2"));
    }

    function draw() {
      const { W, H } = cv; cv.clear(); D.bg(cv);
      layout(W, H);
      const sol = solve();
      AP.benchTop(ctx, W, H, GEO.bat.y + GEO.bat.h + 18);

      if (view === "schematic") {
        drawWiresSchematic(sol);
        drawSchematicSymbols(sol);
        D.text(ctx, 16, 22, "標準電路圖（符號擺在桌上那顆器材的位置）", { color: PL.col("text-faint"), size: 10.5 });
      } else {
        drawWiresPhysical(sol);
        drawComponents(sol);
      }

      // 狀態訊息
      let msg = null, tint = null;
      if (sol.short) { msg = "短路！" + PL.fmt(sol.batI, 1) + " A 流過電池——電池會發燙甚至損壞，快把這條線拆掉"; tint = PL.col("danger"); }
      else if (burnt) { msg = "燈泡燒毀了，按「換新燈泡」再玩"; tint = PL.col("danger"); }
      else if (sol.bulbP > BULB_P_MAX) { msg = "功率 " + PL.fmt(sol.bulbP, 1) + " W 超過額定 " + BULB_P_MAX + " W——燈絲燒斷了"; tint = PL.col("danger"); }
      else if (!wires.length) { msg = "點擊兩個接線柱（銅色小圓點）開始接線"; tint = PL.col("text-dim"); }
      if (msg) D.text(ctx, W / 2, 22, msg, { color: tint, size: 12, align: "center", weight: "700" });
      if (sol.short) shortFlash = 1;

      rBat.set(sol.batI, 2); rA.set(sol.aI, 3); rV.set(sol.vV, 2); rP.set(sol.bulbP, 2);
    }

    /* 動畫：電流跑點 + 短路閃爍 */
    let t = 0;
    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        if (shortFlash > 0) shortFlash = Math.max(0, shortFlash - dt);
        const sol = solve();
        if (sol.bulbP > BULB_P_MAX && !burnt) burnt = true;
      }
      draw();
    }, 45);
    cv.onResize(draw); draw(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
