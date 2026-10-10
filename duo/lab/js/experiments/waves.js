/* 模組八 · 波動與聲音 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#7986cb");

  /* 橫波與縱波 */
  PL.register("wave-types", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let t = 0;
    const sType = PL.ui.select(L.controls, { label: "波的種類", value: "trans", options: [{ value: "trans", label: "橫波（如繩波）" }, { value: "long", label: "縱波（如聲波）" }] });
    const sF = PL.ui.slider(L.controls, { label: "頻率 f", min: 0.3, max: 1.5, step: 0.1, value: 0.7, unit: "Hz", digits: 1 });
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 6, max: 26, step: 1, value: 18, unit: "", digits: 0 });
    PL.ui.note(L.controls,
      "紅色質點只在原地振動，波形卻向右傳遞——傳遞的是能量而非介質。" +
      "波速由介質決定，所以提高頻率不會讓波跑得比較快，只會讓波長變短：λ = v / f。");
    const rV = PL.ui.readout(L.readouts, { label: "波速 v（由介質決定）", unit: "" });
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ = v/f", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      /*
       * 波速由介質決定，是這一版的重點修正。
       *
       * 舊版把波長寫死（k 是常數），頻率只出現在 ω·t 裡。結果有二：
       *   · 靜止畫面上調整頻率完全看不出差別
       *   · 讀數寫著「波速 v = fλ」，而 λ 固定，等於在教「頻率越高波速越快」
       * 這對繩波與聲波都是錯的——同一條繩、同一團空氣，v 是定值，
       * 改變頻率改的是波長。現在固定 v，由 λ = v/f 反推 k。
       */
      const midY = H / 2, V = W * 0.30, f = sF.get();
      const lambda = V / f, k = TAU / lambda, w = TAU * f, A = sA.get();
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, H - 28, {});
      if (sType.get() === "trans") {
        /* 橫波：手抓著繩子上下抖，繩子另一端綁在牆柱上 */
        const post = AP.wallPost(ctx, W - 24, H - 28, midY - 44, midY);
        ctx.save(); ctx.lineCap = "round";
        ctx.strokeStyle = "rgb(140,100,52)"; ctx.lineWidth = 5.5; ctx.beginPath();
        for (let x = 30; x <= post.x; x += 3) { const y = midY + A * Math.sin(k * x - w * t) * Math.min(1, (post.x - x) / 30); x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
        ctx.strokeStyle = "rgb(214,170,100)"; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
        AP.hand(ctx, 34, midY + A * Math.sin(k * 30 - w * t), 1, 0.9, { pull: true });
        for (let i = 0; i < 14; i++) { const x = 40 + i * (W - 80) / 13; const y = midY + A * Math.sin(k * x - w * t) * Math.min(1, (post.x - x) / 30); D.disc(ctx, x, y, i === 4 ? 6 : 3.5, { fill: i === 4 ? PL.col("danger") : "rgba(255,255,255,0.85)" }); if (i === 4) D.line(ctx, x, midY - A - 6, x, midY + A + 6, "rgba(255,107,107,0.45)", 1, [3, 3]); }
      } else {
        /* 縱波：手推拉一條彈簧（Slinky），線圈疏密往右傳 */
        AP.hand(ctx, 34 + A * 0.7 * Math.sin(k * 34 - w * t) - 18, midY, 1, 0.9);
        for (let i = 0; i < 60; i++) {
          const x0 = 34 + i * (W - 68) / 59; const dx = A * 0.7 * Math.sin(k * x0 - w * t);
          const red = i === 20;
          ctx.save();
          ctx.strokeStyle = red ? "rgb(214,52,44)" : "rgb(150,158,172)"; ctx.lineWidth = red ? 2.6 : 1.8;
          ctx.beginPath(); ctx.ellipse(x0 + dx, midY, 3.2, 20, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.ellipse(x0 + dx - 0.8, midY, 2.2, 18, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
          ctx.restore();
        }
        D.text(ctx, "疏部", 34 + (W - 68) * 0.25, midY - 32, { color: PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
        D.text(ctx, "密部", 34 + (W - 68) * 0.5, midY - 32, { color: PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
      }
      // 以「畫面寬度為 1」的無因次尺度呈現，讓兩個讀數可以直接互相印證
      rV.set(V / W, 2); rLam.set(lambda / W, 2);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 波的疊加與干涉 */
  PL.register("superposition", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    let t = 0;
    const sA1 = PL.ui.slider(L.controls, { label: "波1 振幅", min: 5, max: 25, step: 1, value: 16, unit: "", digits: 0 });
    const sA2 = PL.ui.slider(L.controls, { label: "波2 振幅", min: 5, max: 25, step: 1, value: 16, unit: "", digits: 0 });
    const sPh = PL.ui.slider(L.controls, { label: "相位差 Δφ", min: 0, max: 360, step: 5, value: 0, unit: "°", digits: 0 });
    const rState = PL.ui.readout(L.readouts, { label: "干涉結果" });
    const rSum = PL.ui.readout(L.readouts, { label: "合成振幅", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      /* 兩台訊號產生器接到示波器：CH1、CH2 與相加後的波形同時顯示在螢光幕上 */
      AP.labRoom(ctx, W, H, H - 22, {});
      const scr = AP.oscilloscope(ctx, 16, 12, W - 32, H - 44, { label: "CH1 + CH2" });
      const k = TAU / (scr.w * 0.36), w = 2.2, ph = sPh.get() * Math.PI / 180;
      const amp = scr.h / 330, A1 = sA1.get() * amp, A2 = sA2.get() * amp;
      const rows = [scr.y + scr.h * 0.2, scr.y + scr.h * 0.47, scr.y + scr.h * 0.78];
      const wave = (y0, f, col, wid) => {
        ctx.save(); ctx.beginPath(); ctx.rect(scr.x, scr.y, scr.w, scr.h); ctx.clip();
        ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.strokeStyle = col; ctx.lineWidth = wid; ctx.beginPath();
        for (let x = scr.x; x <= scr.x + scr.w; x += 2) { const y = y0 - f(x); x === scr.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke(); ctx.restore();
      };
      wave(rows[0], x => A1 * Math.sin(k * x - w * t), "#f5d442", 1.8);
      wave(rows[1], x => A2 * Math.sin(k * x - w * t + ph), "#4fd8ff", 1.8);
      wave(rows[2], x => A1 * Math.sin(k * x - w * t) + A2 * Math.sin(k * x - w * t + ph), "#7dff9a", 2.6);
      ctx.save(); ctx.font = "700 11px system-ui,sans-serif"; ctx.textAlign = "left";
      ctx.fillStyle = "#f5d442"; ctx.fillText("CH1  波 1", scr.x + 8, rows[0] - scr.h * 0.12);
      ctx.fillStyle = "#4fd8ff"; ctx.fillText("CH2  波 2", scr.x + 8, rows[1] - scr.h * 0.12);
      ctx.fillStyle = "#7dff9a"; ctx.fillText("CH1 + CH2  合成波", scr.x + 8, rows[2] - scr.h * 0.13);
      ctx.restore();
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sN = PL.ui.slider(L.controls, { label: "諧波 n", min: 1, max: 6, step: 1, value: 3, unit: "", digits: 0 });
    const sV = PL.ui.slider(L.controls, { label: "波速 v", min: 40, max: 200, step: 10, value: 120, unit: "m/s", digits: 0 });
    PL.ui.note(L.controls, "兩端固定，只有特定頻率能形成駐波：波節不動、波腹振幅最大。");
    const rF = PL.ui.readout(L.readouts, { label: "頻率 fₙ", unit: "Hz" });
    const rNodes = PL.ui.readout(L.readouts, { label: "波節數" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      const n = sN.get(), x0 = 76, x1 = W - 88, Ls = x1 - x0, midY = H * 0.44, A = H * 0.26;
      /*
       * 原本振盪速率寫死成 w = 4，「波速 v」這根滑桿只改讀數不改畫面。
       * 駐波的頻率 f = n·v /（2L），波速變快，弦本來就該抖得更快。
       * 改成角頻率正比於實際頻率，波速這根滑桿就有了物理意義。
       */
      const vWave = sV.get(), Lm = 1.2;                 // 弦長取 1.2 m 作為畫面對應
      const freq = n * vWave / (2 * Lm);
      const k = n * Math.PI / Ls, w = freq * 0.12;
      /* 實驗裝置：左端電動振動器驅動，右端跨過滑輪掛重物提供張力。
         「波速由張力決定」這句話，要看得見那顆重物才成立。 */
      const deskY = midY + A + 44;
      AP.benchTop(ctx, W, H, deskY);
      AP.vibrator(ctx, x0 - 26, midY + 26, 52);
      D.text(ctx, "振動器", x0 - 26, midY + 42, { color: PL.col("text-faint"), size: 10, align: "center" });
      AP.pulley(ctx, x1 + 16, midY, 13);
      AP.cord(ctx, x1 + 16, midY + 13, x1 + 16, midY + 46);
      /* 波速 v = √(T/μ)：波速越快代表張力越大，掛的重物畫得越大 */
      const q = (vWave - 40) / 160, wwid = 18 + 10 * q, whgt = 14 + 30 * q * q;
      AP.weight(ctx, x1 + 16, midY + 46, wwid, whgt, null);
      D.text(ctx, "張力", x1 + 16, midY + 60 + whgt, { color: PL.col("text-faint"), size: 10, align: "center" });

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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58, 880);

    const C_SOUND = 340;             // 空氣中的聲速（m/s）
    let t = 0, wavefronts = [], emitAcc = 0, sourceX = 0;

    PL.ui.section(L.controls, "音源");
    const sVs = PL.ui.slider(L.controls, { label: "音源速度 vₛ", min: 0, max: 480, step: 10, value: 90, unit: "m/s", digits: 0, onInput: () => drawAll(), onReset: reset });
    const sF0 = PL.ui.slider(L.controls, { label: "原始頻率 f₀", min: 200, max: 1200, step: 20, value: 600, unit: "Hz", digits: 0, onInput: () => drawAll(), onReset: reset });

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

      // 俯視街景：草地中間一條馬路
      const AP = PL.apparatus;
      AP.ground(ctx, 0, W, 0, H, "grass");
      AP.road(ctx, 0, W, roadY - 18, 36, { laneAt: 0.5 });
      for (let i = 0; i < 7; i++) AP.tree(ctx, 40 + i * (W - 60) / 6, roadY - 30, 26, 11 + i);

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
      // 閃燈：頻率固定，和聲音無關，但讓畫面活起來
      const blink = Math.floor(t * 4) % 2 === 0;
      AP.ambulanceTop(ctx, carX, roadY - 8, 44, blink);
      D.text(ctx, vs + " m/s", carX, roadY + 32, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });

      // 觀測者
      const obsY = sObsY.get();
      const ox = W / 2, oy = py(obsY);
      AP.personTop(ctx, ox, oy + (obsY < 12 ? 22 : 0), 1, "#2f7fd8");
      D.text(ctx, "觀測者", ox, oy + 26 + (obsY < 12 ? 22 : 0), { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });

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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sF1 = PL.ui.slider(L.controls, { label: "頻率 f₁", min: 4, max: 12, step: 0.1, value: 8, unit: "Hz", digits: 1 });
    const sF2 = PL.ui.slider(L.controls, { label: "頻率 f₂", min: 4, max: 12, step: 0.1, value: 9, unit: "Hz", digits: 1 });
    PL.ui.note(L.controls, "兩個頻率相近的聲音疊加，響度週期性強弱起伏，這就是「拍」。");
    const rBeat = PL.ui.readout(L.readouts, { label: "拍頻 |f₁−f₂|", unit: "Hz" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      /* 兩支音叉同時敲響，麥克風把聲音送進示波器：看得到響度一強一弱 */
      AP.labRoom(ctx, W, H, H - 24, {});
      AP.tuningFork(ctx, 34, H - 24, 96); AP.tuningFork(ctx, 84, H - 24, 88);
      D.text(ctx, "f₁", 34, H - 128, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      D.text(ctx, "f₂", 84, H - 120, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      AP.microphone(ctx, 130, H - 24, 70, 1);
      const scr = AP.oscilloscope(ctx, 170, 14, W - 186, H - 46, { label: "MIC" });
      const f1 = sF1.get(), f2 = sF2.get(), midY = scr.y + scr.h / 2, A = scr.h * 0.2, x0 = scr.x, span = scr.w;
      // 包絡
      ctx.save(); ctx.strokeStyle = "rgba(125,255,154,0.35)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (let i = 0; i <= span; i += 2) { const x = x0 + i, tt = i / span * 2 + t; const env = 2 * A * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)); ctx.lineTo(x, midY - env); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= span; i += 2) { const x = x0 + i, tt = i / span * 2 + t; const env = 2 * A * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)); ctx.lineTo(x, midY + env); } ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = "#7dff9a"; ctx.shadowColor = "#7dff9a"; ctx.shadowBlur = 5; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i <= span; i += 1) { const x = x0 + i, tt = i / span * 2 + t; const y = midY - A * (Math.sin(TAU * f1 * tt) + Math.sin(TAU * f2 * tt)); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      rBeat.set(Math.abs(f1 - f2), 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt * 0.4; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 聲音的共鳴（共鳴管）
   *
   * 舊版只有一根橫放的玻璃管和一條抖動的曲線，而且開管畫成「兩端都是節」——
   * 那是兩端封閉的管子。開口端的空氣可以自由進出，位移應該最大（腹）。
   * 聲音是縱波：管內空氣是沿著管子前後擠壓，那條曲線畫的是「位移大小」。
   * 現在管內加上一排排空氣分子，依駐波的位移前後振動（節附近幾乎不動、腹附近動最多，
   * 疏密交替看得見），曲線保留成位移圖並標出節與腹；手拿音叉在開口端振動發聲，管子架在夾具上。
   */
  PL.register("resonance-tube", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let t = 0; const v = 343;
    const sType = PL.ui.select(L.controls, { label: "管型", value: "closed", options: [{ value: "closed", label: "閉管（一端封閉）" }, { value: "open", label: "開管（兩端開口）" }] });
    const sN = PL.ui.slider(L.controls, { label: "諧波 n", min: 1, max: 5, step: 1, value: 1, unit: "", digits: 0 });
    const sL = PL.ui.slider(L.controls, { label: "管長 L", min: 0.2, max: 1, step: 0.05, value: 0.5, unit: "m", digits: 2 });
    PL.ui.note(L.controls, "聲音是縱波：管內空氣沿著管子前後振動。閉管的封閉端是位移的節、開口端是腹；開管兩端都是腹。紅點是做了記號的空氣分子。");
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ", unit: "m" });
    const rF = PL.ui.readout(L.readouts, { label: "共鳴頻率", unit: "Hz" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus, Lt = PL.theme.isLight();
      const closed = sType.get() === "closed", n = sN.get(), Lm = sL.get();
      const lam = closed ? 4 * Lm / (2 * n - 1) : 2 * Lm / n, f = v / lam;
      const benchY = Math.round(H * 0.86), midY = Math.round(H * 0.42), th = Math.round(Math.min(34, H * 0.085));
      AP.labRoom(ctx, W, H, benchY, {});
      /* 管長以滑桿上限 1 m 對應最大寬度——「管子多長決定哪些頻率會共鳴」要看得見 */
      const x0 = 50, x1 = 50 + (W - 170) * (0.25 + 0.75 * Lm / 1.0), span = x1 - x0;
      const shape = u => closed ? Math.sin((2 * n - 1) * Math.PI / 2 * u) : Math.cos(n * Math.PI * u);
      const ph = Math.cos(4 * t);
      // 夾具的立桿與底座（先畫，玻璃管擱在上面）
      const clamps = [x0 + span * 0.2, x0 + span * 0.8];
      clamps.forEach(sx => {
        AP.contactShadow(ctx, sx, benchY + 2, 34);
        AP.steel(ctx, sx - 3, midY + th, 6, benchY - 6 - midY - th, 4);
        AP.steel(ctx, sx - 24, benchY - 7, 48, 7, -8);
      });
      // 管內空氣分子：依位移駐波前後振動
      const A = Math.min(7, span / 40);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, midY - th, span, th * 2); ctx.clip();
      const cols = Math.max(8, Math.floor(span / 9));
      for (let i = 0; i <= cols; i++) {
        const xe = x0 + 3 + i * (span - 6) / cols, dx = A * shape((xe - x0) / span) * ph;
        for (let j = 0; j < 5; j++) {
          const jit = ((i * 73 + j * 151) % 17) / 17 - 0.5, tracer = j === 2 && i % 10 === 5;
          ctx.fillStyle = tracer ? "#e5484d" : (Lt ? "rgba(46,96,156,0.62)" : "rgba(150,200,255,0.7)");
          ctx.beginPath(); ctx.arc(xe + dx + jit * 2, midY + (j - 2) * th * 0.37 + jit * 3, tracer ? 3.2 : 2, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
      // 玻璃管本體
      ctx.save();
      const gg = ctx.createLinearGradient(0, midY - th, 0, midY + th);
      gg.addColorStop(0.00, "rgba(226,244,252,0.34)"); gg.addColorStop(0.16, "rgba(255,255,255,0.16)");
      gg.addColorStop(0.84, "rgba(200,224,238,0.10)"); gg.addColorStop(1.00, "rgba(226,244,252,0.34)");
      ctx.fillStyle = gg; ctx.fillRect(x0, midY - th, span, th * 2);
      ctx.strokeStyle = Lt ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.8)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, midY - th); ctx.lineTo(x1, midY - th); ctx.moveTo(x0, midY + th); ctx.lineTo(x1, midY + th); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 + 6, midY - th + 5); ctx.lineTo(x1 - 6, midY - th + 5); ctx.stroke();
      ctx.restore();
      // 開口端的管口（橢圓）；閉管那端塞上橡皮塞
      [closed ? null : x0, x1].forEach(xe => { if (xe == null) return; ctx.strokeStyle = Lt ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.8)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(xe, midY, 6, th, 0, 0, TAU); ctx.stroke(); });
      if (closed) {
        AP.rrPath(ctx, x0 - 12, midY - th - 3, 18, th * 2 + 6, 4);
        const rg = ctx.createLinearGradient(x0 - 12, 0, x0 + 6, 0); rg.addColorStop(0, "rgb(60,62,68)"); rg.addColorStop(1, "rgb(104,106,114)");
        ctx.fillStyle = rg; ctx.fill();
      }
      // 夾具的夾環
      clamps.forEach(sx => { AP.steel(ctx, sx - 5, midY - th - 5, 10, th * 2 + 10, -18); AP.brassDisc(ctx, sx + 9, midY + th + 1, 3.5); });
      // 位移圖：包絡線（虛線）與此刻的位移（縱波的位移畫成上下）
      const Ac = th * 0.78;
      ctx.save(); ctx.strokeStyle = PL.theme.pale(0.22); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      [1, -1].forEach(sg => { ctx.beginPath(); for (let x = x0; x <= x1; x += 2) { const yy = midY + sg * Ac * Math.abs(shape((x - x0) / span)); x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); });
      ctx.restore();
      ctx.save(); ctx.strokeStyle = MC(); ctx.globalAlpha = 0.85; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const yy = midY - Ac * shape((x - x0) / span) * ph; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke(); ctx.restore();
      // 節與腹
      const nodes = [], anti = [];
      if (closed) for (let k = 0; k < n; k++) { nodes.push(2 * k / (2 * n - 1)); anti.push((2 * k + 1) / (2 * n - 1)); }
      else { for (let k = 0; k <= n; k++) anti.push(k / n); for (let k = 0; k < n; k++) nodes.push((k + 0.5) / n); }
      nodes.forEach(u => D.text(ctx, "節", x0 + u * span, midY + th + 17, { color: "#e5484d", size: 10.5, align: "center", weight: "800" }));
      anti.forEach(u => D.text(ctx, "腹", x0 + u * span, midY + th + 17, { color: PL.col("accent-2"), size: 10.5, align: "center", weight: "800" }));
      // 管長標示
      const dy = midY + th + 38;
      D.arrow(ctx, (x0 + x1) / 2 - 36, dy, x0, dy, { color: PL.col("text-faint"), width: 1.2, head: 6 });
      D.arrow(ctx, (x0 + x1) / 2 + 36, dy, x1, dy, { color: PL.col("text-faint"), width: 1.2, head: 6 });
      D.text(ctx, "L = " + PL.fmt(Lm, 2) + " m", (x0 + x1) / 2, dy + 4, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      D.text(ctx, "位移圖（縱波的位移畫成上下）", x0, midY - th - 12, { color: PL.col("text-faint"), size: 10 });
      // 手拿音叉在開口端振動發聲
      const fx = x1 + 34, fBase = midY + 50, sw = 1.6 * ph;
      ctx.save(); ctx.translate(fx, fBase); ctx.rotate(sw * 0.004); ctx.translate(-fx, -fBase);
      AP.tuningFork(ctx, fx, fBase, 80);
      ctx.restore();
      ctx.save(); ctx.strokeStyle = PL.theme.pale(0.5); ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const r = 14 + ((t * 36 + k * 15) % 45), a = Math.max(0, 1 - r / 60);
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(fx - 6, midY - 6, r, Math.PI - 0.55, Math.PI + 0.55); ctx.stroke();
      }
      ctx.restore();
      AP.hand(ctx, fx - 7, fBase - 10, -1, 0.9, { pull: true });
      D.text(ctx, "音叉 f = " + Math.round(f) + " Hz", fx, fBase + 20, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      rLam.set(lam, 2); rF.set(f, 0);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
