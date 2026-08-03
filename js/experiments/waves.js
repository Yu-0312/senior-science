/* 模組八 · 波動與聲音 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#7986cb");

  /* 橫波與縱波 */
  PL.register("wave-types", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let t = 0;
    const sType = PL.ui.select(L.controls, { label: "波的種類", value: "trans", options: [{ value: "trans", label: "橫波（如繩波）" }, { value: "long", label: "縱波（如聲波）" }] });
    const sF = PL.ui.slider(L.controls, { label: "頻率 f", min: 0.3, max: 1.5, step: 0.1, value: 0.7, unit: "Hz", digits: 1 });
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 6, max: 26, step: 1, value: 18, unit: "", digits: 0 });
    PL.ui.note(L.controls, "紅色質點只在原地振動，波形卻向右傳遞——傳遞的是能量而非介質。");
    const rV = PL.ui.readout(L.readouts, { label: "波速 v=fλ", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const midY = H / 2, k = TAU / (W * 0.34), w = TAU * sF.get(), A = sA.get();
      if (sType.get() === "trans") {
        ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.4; ctx.beginPath();
        for (let x = 30; x <= W - 30; x += 3) { const y = midY + A * Math.sin(k * x - w * t); x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
        for (let i = 0; i < 14; i++) { const x = 40 + i * (W - 80) / 13; const y = midY + A * Math.sin(k * x - w * t); D.disc(ctx, x, y, i === 4 ? 6 : 3.5, { fill: i === 4 ? PL.col("danger") : "rgba(255,255,255,0.4)" }); if (i === 4) D.line(ctx, x, midY - A - 6, x, midY + A + 6, "rgba(255,107,107,0.3)", 1, [3, 3]); }
      } else {
        for (let i = 0; i < 60; i++) { const x0 = 34 + i * (W - 68) / 59; const dx = A * 0.7 * Math.sin(k * x0 - w * t); const dens = 1 - Math.cos(k * x0 - w * t) * 0.5; D.disc(ctx, x0 + dx, midY, 3, { fill: i === 20 ? PL.col("danger") : `rgba(121,134,203,${0.4 + dens * 0.4})` }); }
        D.text(ctx, "疏部", 34 + (W - 68) * 0.25, midY - 30, { color: PL.col("text-faint"), size: 10, align: "center" });
        D.text(ctx, "密部", 34 + (W - 68) * 0.5, midY - 30, { color: PL.col("text-dim"), size: 10, align: "center" });
      }
      rV.set(sF.get() * (W * 0.34) / 30, 2);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 波的疊加與干涉 */
  PL.register("superposition", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    let t = 0;
    const sA1 = PL.ui.slider(L.controls, { label: "波1 振幅", min: 5, max: 25, step: 1, value: 16, unit: "", digits: 0 });
    const sA2 = PL.ui.slider(L.controls, { label: "波2 振幅", min: 5, max: 25, step: 1, value: 16, unit: "", digits: 0 });
    const sPh = PL.ui.slider(L.controls, { label: "相位差 Δφ", min: 0, max: 360, step: 5, value: 0, unit: "°", digits: 0 });
    const rState = PL.ui.readout(L.readouts, { label: "干涉結果" });
    const rSum = PL.ui.readout(L.readouts, { label: "合成振幅", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const k = TAU / (W * 0.32), w = 2.2, A1 = sA1.get(), A2 = sA2.get(), ph = sPh.get() * Math.PI / 180;
      const rows = [H * 0.22, H * 0.5, H * 0.78];
      const wave = (y0, f, col, wid) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = wid; ctx.beginPath(); for (let x = 30; x <= W - 30; x += 2) { const y = y0 - f(x); x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); D.line(ctx, 30, y0, W - 30, y0, "rgba(255,255,255,0.08)", 1); };
      wave(rows[0], x => A1 * Math.sin(k * x - w * t), PL.col("accent-2"), 1.8);
      wave(rows[1], x => A2 * Math.sin(k * x - w * t + ph), PL.col("accent-3"), 1.8);
      wave(rows[2], x => A1 * Math.sin(k * x - w * t) + A2 * Math.sin(k * x - w * t + ph), MC(), 2.6);
      D.text(ctx, "波 1", 34, rows[0] - 34, { color: PL.col("accent-2"), size: 11 });
      D.text(ctx, "波 2", 34, rows[1] - 34, { color: PL.col("accent-3"), size: 11 });
      D.text(ctx, "合成波", 34, rows[2] - 34, { color: MC(), size: 11 });
      const sum = Math.sqrt(A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(ph));
      rState.set(sPh.get() < 30 || sPh.get() > 330 ? "相長干涉" : Math.abs(sPh.get() - 180) < 30 ? "相消干涉" : "部分干涉");
      rSum.set(sum, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 弦上的駐波 */
  PL.register("standing-wave", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sN = PL.ui.slider(L.controls, { label: "諧波 n", min: 1, max: 6, step: 1, value: 3, unit: "", digits: 0 });
    const sV = PL.ui.slider(L.controls, { label: "波速 v", min: 40, max: 200, step: 10, value: 120, unit: "m/s", digits: 0 });
    PL.ui.note(L.controls, "兩端固定，只有特定頻率能形成駐波：波節不動、波腹振幅最大。");
    const rF = PL.ui.readout(L.readouts, { label: "頻率 fₙ", unit: "Hz" });
    const rNodes = PL.ui.readout(L.readouts, { label: "波節數" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const n = sN.get(), x0 = 40, x1 = W - 40, Ls = x1 - x0, midY = H / 2, A = H * 0.3;
      /*
       * 原本振盪速率寫死成 w = 4，「波速 v」這根滑桿只改讀數不改畫面。
       * 駐波的頻率 f = n·v /（2L），波速變快，弦本來就該抖得更快。
       * 改成角頻率正比於實際頻率，波速這根滑桿就有了物理意義。
       */
      const vWave = sV.get(), Lm = 1.2;                 // 弦長取 1.2 m 作為畫面對應
      const freq = n * vWave / (2 * Lm);
      const k = n * Math.PI / Ls, w = freq * 0.12;
      // 包絡
      ctx.save(); ctx.strokeStyle = PL.theme.pale(0.12); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, midY - A * Math.abs(Math.sin(k * (x - x0)))); ctx.stroke();
      ctx.beginPath(); for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, midY + A * Math.abs(Math.sin(k * (x - x0)))); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.6; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = midY - 2 * A * 0.5 * Math.sin(k * (x - x0)) * Math.cos(w * t); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      // 波節
      for (let i = 0; i <= n; i++) { const x = x0 + Ls * i / n; D.disc(ctx, x, midY, 4, { fill: PL.col("danger") }); }
      D.line(ctx, x0, midY - A - 10, x0, midY + A + 10, PL.col("text-faint"), 3); D.line(ctx, x1, midY - A - 10, x1, midY + A + 10, PL.col("text-faint"), 3);
      const f = n * sV.get() / (2 * 4); // fₙ = n v /2L（L 以相對單位）
      rF.set(sN.get() * sV.get() / 8, 1); rNodes.set(n + 1, 0);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 都卜勒效應 */
  /* 都卜勒效應 —— 旗艦改版
   *
   * 課本寫「音源接近時頻率變高」，但學生真正該看見的是「為什麼」：
   * 波前是一圈一圈以固定速度擴散的，音源自己往前跑，就把前方的波前擠在一起。
   *
   * 這一版用救護車跑過觀測者面前，並且刻意把速度上限開到超越音速——
   * 依 PhET 的原則，學生會去測試極端值，模擬必須有合理反應：
   * 這裡的反應是波前疊成一個馬赫錐，也就是音爆。
   */
  PL.register("doppler", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58, 880);

    const C_SOUND = 340;             // 空氣中的聲速（m/s）
    let t = 0, wavefronts = [], emitAcc = 0, sourceX = 0;

    PL.ui.section(L.controls, "音源");
    const sVs = PL.ui.slider(L.controls, { label: "音源速度 vₛ", min: 0, max: 480, step: 10, value: 90, unit: "m/s", digits: 0, onInput: reset });
    const sF0 = PL.ui.slider(L.controls, { label: "原始頻率 f₀", min: 200, max: 1200, step: 20, value: 600, unit: "Hz", digits: 0, onInput: reset });

    PL.ui.section(L.controls, "觀測者");
    const sObsY = PL.ui.slider(L.controls, { label: "觀測者離馬路", min: 0, max: 120, step: 5, value: 40, unit: "m", digits: 0 });

    PL.ui.section(L.controls, "顯示");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["fronts", "mach", "obs"],
      options: [
        { value: "fronts", label: "波前" },
        { value: "mach", label: "馬赫錐" },
        { value: "obs", label: "觀測者連線" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停一律交給引擎的傳輸列。實驗自己再維護一個 running 旗標的話，
       兩個開關必須同時打開才會動，而學生看不出來要按哪一個——這是實際回報過的問題。 */
    PL.ui.button(row, "重新開始", reset);

    PL.ui.note(L.controls,
      "先用 90 m/s 看波前怎麼在前方被擠密、在後方被拉疏——這就是頻率改變的原因。" +
      "接著把速度慢慢推到 340 m/s 以上：波前會來不及散開，疊成一個錐形，那就是音爆。" +
      "音源超過聲速後，前方的觀測者在它經過之前完全聽不到聲音。");

    const rFront = PL.ui.readout(L.readouts, { label: "接近時 f′", unit: "Hz" });
    const rBack = PL.ui.readout(L.readouts, { label: "遠離時 f′", unit: "Hz" });
    const rNow = PL.ui.readout(L.readouts, { label: "觀測者當下 f′", unit: "Hz" });
    const rMach = PL.ui.readout(L.readouts, { label: "馬赫數 vₛ/v聲" });

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "觀測者聽到的頻率隨時間變化",
      cap: "音源接近時頻率偏高，通過瞬間急速下降，遠離後偏低。距離馬路越近，下降得越陡——這就是救護車呼嘯而過的聲音。"
    });
    let history = [];

    function reset() {
      t = 0; wavefronts = []; emitAcc = 0; sourceX = -260; history = [];
    }
    reset();

    /*
     * 移動音源的都卜勒公式（觀測者靜止）
     *   f′ = f₀ · v / (v − vₛ·cosθ)
     * θ 是音源速度方向與「音源到觀測者」連線的夾角。
     * 正對著來時 cosθ = 1，得到最高頻；正在遠離時 cosθ = −1，得到最低頻。
     */
    function observedFreq(sx, obsX, obsY, vs) {
      const dx = obsX - sx, dy = obsY;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const cosT = dx / dist;                 // 音源沿 +x 前進
      const denom = C_SOUND - vs * cosT;
      if (denom <= 1e-6) return Infinity;     // 超音速且正對觀測者：波前同時抵達
      return sF0.get() * C_SOUND / denom;
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const vs = sVs.get();
      const mach = vs / C_SOUND;

      // 世界座標：以公尺為單位，畫面中央為 x = 0
      const spanM = 700;
      const sc = (W - 60) / spanM;
      const roadY = H * 0.38;
      const px = xm => W / 2 + xm * sc;
      const py = ym => roadY + ym * sc;
      cv.calibrate(sc, "m");

      // 馬路
      D.rect(ctx, 20, roadY - 13, W - 40, 26, { fill: PL.theme.pale(0.10), r: 3 });
      D.line(ctx, 20, roadY, W - 20, roadY, PL.theme.pale(0.28), 1.5, [12, 10]);

      // 波前：每一圈都是在某個時刻、某個位置發出的，之後以聲速等速擴散
      if (layers.has("fronts")) {
        wavefronts.forEach(w => {
          const r = (t - w.t) * C_SOUND * sc;
          if (r <= 0) return;
          const alpha = Math.max(0, 0.5 - (t - w.t) * 0.28);
          if (alpha <= 0.02) return;
          ctx.save();
          ctx.globalAlpha = alpha;
          D.ring(ctx, px(w.x), roadY, r, m, 1.4);
          ctx.restore();
        });
      }

      // 馬赫錐：超音速時波前的共同切線
      if (layers.has("mach") && mach > 1.001) {
        const halfAngle = Math.asin(1 / mach);
        const len = 460 * sc;
        ctx.save();
        ctx.strokeStyle = PL.col("danger"); ctx.lineWidth = 2;
        [1, -1].forEach(sgn => {
          ctx.beginPath();
          ctx.moveTo(px(sourceX), roadY);
          ctx.lineTo(px(sourceX) - Math.cos(halfAngle) * len,
            roadY + sgn * Math.sin(halfAngle) * len);
          ctx.stroke();
        });
        ctx.restore();
        D.text(ctx, "馬赫錐　半角 " + (halfAngle * 180 / Math.PI).toFixed(1) + "°",
          px(sourceX) - 12, roadY - 30, { color: PL.col("danger"), size: 12, align: "right", weight: "700" });
      }

      // 救護車：認得出來的物件比抽象的點更容易理解
      const carX = px(sourceX);
      D.rect(ctx, carX - 20, roadY - 16, 40, 18, { fill: "#eef2f7", stroke: PL.theme.pale(0.4), r: 3 });
      D.rect(ctx, carX - 6, roadY - 14, 24, 9, { fill: "#8fb8dd", r: 2 });
      D.disc(ctx, carX - 12, roadY + 3, 4.5, { fill: "#2b3440" });
      D.disc(ctx, carX + 12, roadY + 3, 4.5, { fill: "#2b3440" });
      // 閃燈：頻率固定，和聲音無關，但讓畫面活起來
      const blink = Math.floor(t * 4) % 2 === 0;
      D.disc(ctx, carX, roadY - 20, 3.5, { fill: blink ? PL.col("danger") : PL.col("accent-2"), glow: blink ? PL.col("danger") : PL.col("accent-2"), glowSize: 9 });
      D.text(ctx, vs + " m/s", carX, roadY + 26, { color: PL.col("text-dim"), size: 10.5, align: "center" });

      // 觀測者
      const obsY = sObsY.get();
      const ox = W / 2, oy = py(obsY);
      D.disc(ctx, ox, oy - 7, 5.5, { fill: "#e8b48c" });
      D.rect(ctx, ox - 4, oy - 2, 8, 14, { fill: PL.col("accent-2"), r: 2 });
      D.text(ctx, "觀測者", ox, oy + 26, { color: PL.col("accent-2"), size: 10.5, align: "center" });

      if (layers.has("obs")) {
        D.line(ctx, carX, roadY, ox, oy, PL.theme.pale(0.22), 1, [4, 4]);
      }

      const fNow = observedFreq(sourceX, 0, obsY, vs);
      const fFront = sF0.get() * C_SOUND / Math.max(1e-6, C_SOUND - vs);
      const fBack = sF0.get() * C_SOUND / (C_SOUND + vs);

      rFront.set(isFinite(fFront) ? fFront : 99999, 0);
      rBack.set(fBack, 0);
      rNow.set(isFinite(fNow) ? Math.min(fNow, 99999) : 99999, 0);
      rMach.set(mach, 2);

      PL.ui.caption(cv, mach > 1.001
        ? "音源比聲音還快：波前來不及散開，疊成一個馬赫錐。錐面經過的瞬間就是音爆，在那之前觀測者完全聽不到。"
        : mach > 0.9
          ? "接近音速：前方的波前被擠得極密，接近時的頻率急速升高。"
          : "波前以聲速等速向外擴散；音源往前跑，把前方的波前擠密、後方拉疏——頻率因此改變。");
    }

    function chart() {
      cc.clear();
      const gph = PL.graph(cc, { x: 48, y: 14, w: cc.W - 62, h: cc.H - 36 },
        { x0: 0, x1: 8, y0: 0, y1: Math.max(1400, sF0.get() * 2.2) });
      gph.frame({ xlabel: "t (s)", ylabel: "f′ (Hz)" });
      gph.grid(6, 4);
      gph.hline(sF0.get(), { color: PL.theme.pale(0.3), dash: [4, 3], width: 1.2 });
      gph.label(0.2, sF0.get() + 40, "原始頻率 " + sF0.get() + " Hz",
        { color: PL.col("text-faint"), size: 9.5 });
      if (history.length > 1) {
        gph.curve(history.filter(p => isFinite(p[1]) && p[1] < 1e5), { color: MC(), width: 2.2 });
      }
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        sourceX += sVs.get() * dt;
        if (sourceX > 300) reset();
        // 依原始頻率發出波前；為了畫面清爽，只取實際頻率的一小部分
        emitAcc += dt * 9;
        while (emitAcc >= 1) { emitAcc -= 1; wavefronts.push({ t, x: sourceX }); }
        wavefronts = wavefronts.filter(w => t - w.t < 3.6);
        const f = observedFreq(sourceX, 0, sObsY.get(), sVs.get());
        history.push([t, isFinite(f) ? f : sF0.get() * 6]);
        if (history.length > 600) history.shift();
      }
      drawAll();
    }, 50);

    cv.onResize(scene); cc.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cc.destroy(); },
      rerender: drawAll
    };
  }});

  /* 拍 */
  PL.register("beats", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sF1 = PL.ui.slider(L.controls, { label: "頻率 f₁", min: 4, max: 12, step: 0.1, value: 8, unit: "Hz", digits: 1 });
    const sF2 = PL.ui.slider(L.controls, { label: "頻率 f₂", min: 4, max: 12, step: 0.1, value: 9, unit: "Hz", digits: 1 });
    PL.ui.note(L.controls, "兩個頻率相近的聲音疊加，響度週期性強弱起伏，這就是「拍」。");
    const rBeat = PL.ui.readout(L.readouts, { label: "拍頻 |f₁−f₂|", unit: "Hz" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const f1 = sF1.get(), f2 = sF2.get(), midY = H / 2, A = H * 0.3, x0 = 30, span = W - 60;
      // 包絡
      ctx.save(); ctx.strokeStyle = PL.theme.pale(0.15); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (let i = 0; i <= span; i += 2) { const x = x0 + i, tt = i / span * 2 + t; const env = 2 * A * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)); ctx.lineTo(x, midY - env); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= span; i += 2) { const x = x0 + i, tt = i / span * 2 + t; const env = 2 * A * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)); ctx.lineTo(x, midY + env); } ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= span; i += 1) { const x = x0 + i, tt = i / span * 2 + t; const y = midY - A * (Math.sin(TAU * f1 * tt) + Math.sin(TAU * f2 * tt)); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      rBeat.set(Math.abs(f1 - f2), 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt * 0.4; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 聲音的共鳴（共鳴管） */
  PL.register("resonance-tube", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let t = 0; const v = 343;
    const sType = PL.ui.select(L.controls, { label: "管型", value: "closed", options: [{ value: "closed", label: "閉管（一端封閉）" }, { value: "open", label: "開管（兩端開口）" }] });
    const sN = PL.ui.slider(L.controls, { label: "諧波 n", min: 1, max: 5, step: 1, value: 1, unit: "", digits: 0 });
    const sL = PL.ui.slider(L.controls, { label: "管長 L", min: 0.2, max: 1, step: 0.05, value: 0.5, unit: "m", digits: 2 });
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ", unit: "m" });
    const rF = PL.ui.readout(L.readouts, { label: "共鳴頻率", unit: "Hz" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const closed = sType.get() === "closed", n = sN.get(), Lm = sL.get();
      /*
       * 原本管子永遠畫滿整個畫面寬度，「管長 L」只改讀數。
       * 共鳴管實驗的核心就是「管子多長決定哪些頻率會共鳴」，
       * 管長看不出來的話，這個實驗就只剩一條抖動的曲線。
       * 改成管長以滑桿上限 1 m 對應最大寬度。
       */
      const L_MAX = 1.0;
      const x0 = 50, x1 = 50 + (W - 90) * (0.25 + 0.75 * Lm / L_MAX), span = x1 - x0, midY = H / 2, A = H * 0.28;
      D.line(ctx, x0, midY + 66, x1, midY + 66, PL.col("text-faint"), 1, [4, 4]);
      D.text(ctx, "L = " + PL.fmt(Lm, 2) + " m", (x0 + x1) / 2, midY + 80,
        { color: PL.col("text-faint"), size: 10, align: "center" });
      // 管壁
      D.line(ctx, x0, midY - 46, x1, midY - 46, PL.col("text-faint"), 2); D.line(ctx, x0, midY + 46, x1, midY + 46, PL.col("text-faint"), 2);
      if (closed) D.line(ctx, x0, midY - 46, x0, midY + 46, PL.col("m-color", "#7986cb"), 4); // 封閉端
      // 位移駐波：閉管封閉端為節、開口端為腹
      const shape = xx => { const u = (xx - x0) / span; // 0..1
        if (closed) return Math.sin((2 * n - 1) * Math.PI / 2 * u);
        return Math.sin(n * Math.PI * u);
      };
      [1, -1].forEach(sgn => { ctx.save(); ctx.strokeStyle = PL.theme.pale(0.14); ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, midY + sgn * A * Math.abs(shape(x))); ctx.stroke(); ctx.restore(); });
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.6; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = midY - A * shape(x) * Math.cos(4 * t); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      const lam = closed ? 4 * Lm / (2 * n - 1) : 2 * Lm / n;
      rLam.set(lam, 2); rF.set(v / lam, 0);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
