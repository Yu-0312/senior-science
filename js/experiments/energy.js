/* 模組四 · 功與能量 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#81c784");
  const KEc = "#5aa2ff", PEc = "#81c784", THc = "#ff6b6b";

  function energyBars(cv, x, y, w, parts, total) {
    const ctx = cv.ctx; let yy = y;
    parts.forEach(p => {
      D.text(ctx, p.label, x, yy + 10, { color: PL.col("text-dim"), size: 11 });
      D.rect(ctx, x + 52, yy, w - 52, 13, { fill: "rgba(255,255,255,0.05)", r: 4 });
      D.rect(ctx, x + 52, yy, (w - 52) * PL.clamp(p.v / total, 0, 1), 13, { fill: p.c, r: 4 });
      D.text(ctx, PL.fmt(p.v, 1) + " J", x + w + 6, yy + 10, { color: p.c, size: 10 });
      yy += 20;
    });
  }

  /* 功與功率 */
  PL.register("work-power", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52);
    let x = 0, W_ = 0;
    const reset = () => { x = 0; W_ = 0; };
    const sF = PL.ui.slider(L.controls, { label: "施力 F", min: 2, max: 20, step: 1, value: 10, unit: "N", digits: 0, onInput: reset });
    const sTh = PL.ui.slider(L.controls, { label: "施力角 θ", min: 0, max: 80, step: 1, value: 30, unit: "°", digits: 0, onInput: reset });
    const sV = PL.ui.slider(L.controls, { label: "移動速率 v", min: 0.5, max: 4, step: 0.5, value: 2, unit: "m/s", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "暫停", () => { anim.toggle(); bP.textContent = anim.running ? "暫停" : "播放"; }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rW = PL.ui.readout(L.readouts, { label: "累積功 W", unit: "J" });
    const rP = PL.ui.readout(L.readouts, { label: "功率 P", unit: "W" });
    const rFx = PL.ui.readout(L.readouts, { label: "有效分力", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const F = sF.get(), th = sTh.get() * Math.PI / 180, m = MC();
      const gy = H - 50, sc = (W - 120) / 16, px = 70 + (x % 16) * sc;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      D.rect(ctx, px - 22, gy - 30, 44, 30, { fill: m, stroke: "rgba(255,255,255,0.4)", r: 5 });
      const fx = F * Math.cos(th), fy = F * Math.sin(th);
      D.arrow(ctx, px, gy - 15, px + fx * 5, gy - 15 - fy * 5, { color: PL.col("accent-2"), width: 2.5, label: "F" });
      D.arrow(ctx, px, gy - 15, px + fx * 5, gy - 15, { color: "#7ee0c0", width: 2, label: "F cosθ", dash: [3, 3] });
      PL.ui.caption(cv, "只有沿移動方向的分力 F cosθ 才做功。");
      rW.set(W_, 1); rP.set(fx * sV.get(), 1); rFx.set(fx, 1);
    }
    const anim = PL.loop(dt => { if (dt) { const F = sF.get(), th = sTh.get() * Math.PI / 180, v = sV.get(); const dx = v * dt; x += dx; W_ += F * Math.cos(th) * dx; if (x > 32) reset(); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 功能定理 */
  PL.register("work-energy", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let x = 0, v = 0, Wnet = 0;
    const reset = () => { x = 0; v = 0; Wnet = 0; };
    const sF = PL.ui.slider(L.controls, { label: "施力 F", min: 2, max: 20, step: 1, value: 12, unit: "N", digits: 0, onInput: reset });
    const sFr = PL.ui.slider(L.controls, { label: "阻力 f", min: 0, max: 10, step: 0.5, value: 2, unit: "N", digits: 1, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 1, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "施力", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rWn = PL.ui.readout(L.readouts, { label: "淨功 W_net", unit: "J" });
    const rK = PL.ui.readout(L.readouts, { label: "動能 K", unit: "J" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = 92, sc = (W - 120) / 16, px = 70 + (x % 16) * sc, K = 0.5 * sM.get() * v * v;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      D.rect(ctx, px - 20, gy - 26, 40, 26, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      D.arrow(ctx, px + 20, gy - 13, px + 20 + sF.get() * 4, gy - 13, { color: KEc, width: 2.2, label: "F" });
      if (sFr.get() > 0) D.arrow(ctx, px - 20, gy - 13, px - 20 - sFr.get() * 4, gy - 13, { color: THc, width: 2, label: "f" });
      energyBars(cv, 40, gy + 40, W - 120, [{ label: "淨功", v: Wnet, c: MC() }, { label: "動能 K", v: K, c: KEc }], Math.max(Wnet, K, 10));
      PL.ui.caption(cv, "淨功 = 動能變化：兩條長條始終等長");
      rWn.set(Wnet, 1); rK.set(K, 1); rV.set(v, 2);
    }
    const anim = PL.loop(dt => { if (dt) { const F = sF.get(), f = sFr.get(), m = sM.get(); const net = F - f; const a = net / m; const dx = Math.max(0, v) * dt + 0.5 * a * dt * dt; v += a * dt; x += Math.max(0, dx); Wnet += net * Math.max(0, dx); if (x > 32) reset(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 軌道上的力學能守恆 */
  /* 軌道上的力學能守恆 —— 旗艦改版
   *
   * 依 PhET《Look and Feel》的「鼓勵探索」原則重做：
   *   · 用認得出來的場景（滑板場），而不是抽象的曲線與圓點
   *   · 能量長條即時變動，「總量不變」這件事要用看的就懂，不是用背的
   *   · 學生會刻意把參數推到極端，模擬必須有合理的反應——
   *     這裡是「速度不夠就上不去、翻不過去會倒退」與「能量全被摩擦吃掉會停下來」
   *   · 可以換軌道形狀，因為守恆與路徑無關才是重點
   */
  PL.register("energy-track", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 860);
    const g = 9.8;

    /*
     * 軌道以「水平位置 → 高度」的函數描述，單位都是公尺。
     * 用函數而不是取樣點，是為了能精確算出任意位置的斜率與高度。
     */
    const TRACKS = {
      valley: {
        label: "U 型谷",
        length: 24,
        h: x => 5.2 * Math.pow((x - 12) / 12, 2) + 0.4,
        note: "最低點速度最快，兩側等高處速度相同。"
      },
      hill: {
        label: "小丘",
        length: 24,
        h: x => 0.4 + 4.6 * Math.exp(-Math.pow((x - 12) / 3.4, 2)),
        note: "能量不夠就翻不過去，會在半山腰倒退回來。"
      },
      double: {
        label: "雙谷",
        length: 26,
        h: x => 3.2 + 2.6 * Math.cos((x - 3) * 0.52) + 0.02 * x,
        note: "起伏多次，但只要沒有摩擦，回到同高度速度就一樣。"
      },
      ramp: {
        label: "斜坡",
        length: 24,
        h: x => Math.max(0.4, 5.6 - x * 0.24),
        note: "等斜率下滑，位能穩定換成動能。"
      }
    };
    let trackKey = "valley";

    let s = 4, v = 0, t = 0, thermal = 0, running = false, trail = [];
    let mech = 0;   // 力學能：速率的大小一律由它決定，守恆才會精確
    let fellOff = false, stopped = false;

    PL.ui.section(L.controls, "滑板者");
    const sMass = PL.ui.slider(L.controls, { label: "質量 m", min: 20, max: 90, step: 5, value: 50, unit: "kg", digits: 0, onInput: resetRun });
    const sStart = PL.ui.slider(L.controls, { label: "起始位置", min: 1, max: 12, step: 0.5, value: 4, unit: "m", digits: 1, onInput: resetRun });
    const sFric = PL.ui.slider(L.controls, { label: "摩擦係數 μ", min: 0, max: 0.25, step: 0.01, value: 0, unit: "", digits: 2, onInput: resetRun });

    PL.ui.section(L.controls, "軌道形狀");
    PL.ui.chipGroup(L.controls, {
      value: trackKey,
      options: Object.keys(TRACKS).map(k => ({ value: k, label: TRACKS[k].label })),
      onChange: k => { trackKey = k; resetRun(); }
    });

    PL.ui.section(L.controls, "顯示");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["bars", "trail", "ref"],
      options: [
        { value: "bars", label: "能量長條" }, { value: "trail", label: "軌跡點" },
        { value: "ref", label: "起始高度線" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    const bPlay = PL.ui.button(row, "放開", () => {
      // 只在這裡處理切換。先前另外掛了一個 addEventListener，
      // 兩個處理器會互相抵銷（一個設 true、另一個馬上 toggle 回 false）。
      if (!fellOff && !stopped) running = !running;
    }, { primary: true });
    PL.ui.button(row, "回到起點", resetRun);

    PL.ui.note(L.controls,
      "先把摩擦設成 0，注意三根長條的總和永遠不變——不論軌道怎麼起伏。" +
      "接著把摩擦調大：總機械能會一路轉成熱能，最後滑板者停下來，但四根長條的總和仍然守恆。" +
      "再把質量從 20 改到 90 kg，看看到達最低點的速率會不會改變。");

    const rH = PL.ui.readout(L.readouts, { label: "高度 h", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速率 v", unit: "m/s" });
    const rKE = PL.ui.readout(L.readouts, { label: "動能 K", unit: "J" });
    const rPE = PL.ui.readout(L.readouts, { label: "位能 U", unit: "J" });
    const rTh = PL.ui.readout(L.readouts, { label: "熱能", unit: "J" });
    const rTot = PL.ui.readout(L.readouts, { label: "總能量", unit: "J" });

    const charts = PL.el("div", "sim-charts", root);
    const w1 = PL.el("div", "sim-chart", charts);
    PL.el("div", "chart-title", w1).textContent = "能量對時間";
    const cvE = PL.canvas.create(w1, 0.56);
    PL.el("div", "cap", w1).textContent =
      "動能與位能此消彼長；沒有摩擦時兩者的和是一條水平線。加入摩擦後，熱能會把它們一起吃掉。";
    let history = [];

    const track = () => TRACKS[trackKey];
    const height = x => track().h(Math.max(0, Math.min(track().length, x)));
    /* 斜率用中央差分，比解析微分好維護，精度也足夠 */
    const slope = x => (height(x + 0.01) - height(x - 0.01)) / 0.02;

    function resetRun() {
      s = Math.min(sStart.get(), track().length - 1);
      v = 0; t = 0; thermal = 0; running = false;
      fellOff = false; stopped = false;
      // 從靜止放開：此刻的力學能全部是位能，之後只會被摩擦搬走
      mech = sMass.get() * g * height(s);
      trail = []; history = [];
    }
    resetRun();

    function energies() {
      const m = sMass.get();
      const h = height(s);
      const U = m * g * h;
      return { m, h, K: Math.max(0, mech - U), U, Q: thermal };
    }

    /*
     * 沿軌道的運動
     *
     * 做法：以「力學能」為狀態，速率由能量反推，而不是對加速度做數值積分。
     *
     * 原因：這個實驗要教的就是能量守恆。用顯式積分寫在彎曲軌道上時，
     * 正確的方程含有向心項 −f'f''ẋ²/(1+f'²)，漏掉它會讓總能量持續漂移
     * （實測 6 秒漂 7.4%）——畫面上「總能量」那條線會自己往下掉，
     * 等於用一個不守恆的模型去演示守恆定律。
     *
     * 改成由能量求速率後，守恆是結構上保證的：
     *   K = E力學 − mgh，  v = √(2K/m)
     * 摩擦則明確地把力學能搬進熱能，四項總和恆為定值。
     *
     * 正向力取 N = mg·cosθ，忽略向心加速度的貢獻——這與高中課本的處理一致。
     */
    function step(dt) {
      if (!running || fellOff || stopped) return;
      const mass = sMass.get(), mu = sFric.get();
      const sub = 8, h = dt / sub;

      for (let i = 0; i < sub; i += 1) {
        const k = slope(s);
        const cosT = 1 / Math.sqrt(1 + k * k);
        const sinT = k * cosT;

        /*
         * 速度用切線方向的加速度推進，位置再依速度前進；
         * 每一步結束後用「剩下多少力學能」把速率校正回來（能量投影）。
         *
         * 為什麼要兩者並用：
         *   · 只用能量反推速率的話，從靜止放開時 K 恰好為 0，
         *     位置永遠不會前進，滑板者卡在原地。
         *   · 只用顯式積分的話，彎曲軌道的正確方程含向心項
         *     −f'f''ẋ²/(1+f'²)，漏掉它總能量會一路漂移（實測 6 秒掉 7.4%），
         *     等於用不守恆的模型演示守恆定律。
         * 由積分決定方向、由能量決定大小，兩個問題都解決。
         */
        let a = -g * sinT;
        if (mu > 0 && Math.abs(v) > 1e-6) a -= Math.sign(v) * mu * g * cosT;
        v += a * h;

        const ds = v * h;                 // 沿軌道的有號位移
        s += ds * cosT;                   // 換算成水平位移

        if (mu > 0 && ds !== 0) {
          const dQ = mu * mass * g * cosT * Math.abs(ds);
          const usable = Math.max(0, mech - mass * g * height(s));
          const spend = Math.min(dQ, usable);
          mech -= spend;
          thermal += spend;
        }

        // 能量投影：速率的大小一律以剩餘力學能為準
        const K = mech - mass * g * height(s);
        if (K <= 0) {
          // 高度已經吃掉全部動能 → 折返；同時把力學能對齊目前高度，避免負動能
          mech = mass * g * height(s);
          v = -v * 0.0;                   // 這一瞬間靜止，下一步由重力決定方向
          const k0 = slope(s);
          // 坡度撐不過靜摩擦就真的停住
          if (mu > 0 && Math.abs(k0) <= mu) { stopped = true; running = false; break; }
        } else {
          v = (v >= 0 ? 1 : -1) * Math.sqrt(2 * K / mass);
        }

        // 衝出軌道兩端：把參數推到極端時該有的合理反應
        if (s < 0.2 || s > track().length - 0.2) {
          s = Math.max(0.2, Math.min(track().length - 0.2, s));
          fellOff = true; running = false; break;
        }
      }

      t += dt;
      trail.push([s, height(s)]);
      if (trail.length > 260) trail.shift();
      const e = energies();
      history.push([t, e.K, e.U, e.Q]);
      if (history.length > 900) history.shift();
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const tk = track();
      const groundY = H - 52, topY = 26;
      const maxH = 6.2;
      const sc = Math.min((W - 90) / tk.length, (groundY - topY) / maxH);
      const ox = 46;
      const px = xm => ox + xm * sc;
      const py = hm => groundY - hm * sc;
      cv.calibrate(sc, "m");

      // 地面
      D.line(ctx, 20, groundY, W - 20, groundY, PL.col("text-faint"), 1.5);

      // 軌道本體
      ctx.save();
      /*
       * 「摩擦係數 μ」原本只在滑板真的開始滑之後才影響畫面（熱能長條），
       * 學生在靜止狀態拉這根滑桿完全看不到差別。
       * 改成軌道本身的粗糙度隨 μ 改變：μ = 0 是一條光滑細線，
       * μ 越大線越粗、顏色越暖，並在軌道上畫出摩擦紋路。
       */
      const muNow = sFric.get();   // 這個實驗的摩擦滑桿叫 sFric（第一版誤用 sMu，直接丟出 ReferenceError）
      ctx.strokeStyle = muNow > 0.001
        ? "rgba(255,183,77," + (0.35 + muNow * 2.2) + ")"
        : PL.theme.pale(0.45);
      ctx.lineWidth = 4 + muNow * 26;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let x = 0; x <= tk.length; x += 0.2) {
        const X = px(x), Y = py(tk.h(x));
        x === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();

      // 起始高度參考線：守恆時滑板者永遠回不到比它更高的位置
      if (layers.has("ref")) {
        const h0 = height(Math.min(sStart.get(), tk.length - 1));
        D.line(ctx, 24, py(h0), W - 24, py(h0), PL.theme.pale(0.22), 1, [5, 4]);
        D.text(ctx, "起始高度 " + PL.fmt(h0, 1) + " m", W - 28, py(h0) - 6,
          { color: PL.col("text-faint"), size: 10, align: "right" });
      }

      if (layers.has("trail")) {
        trail.forEach((p, i) => {
          if (i % 3) return;
          D.disc(ctx, px(p[0]), py(p[1]), 1.8, { fill: PL.theme.pale(0.3) });
        });
      }

      // 滑板者：認得出是個人，但保持卡通化不誤導
      const hNow = height(s);
      const bx = px(s), by = py(hNow);
      const tilt = -Math.atan(slope(s));
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(tilt);
      D.rect(ctx, -13, -3, 26, 4, { fill: m, r: 2 });                 // 滑板
      D.disc(ctx, -8, 2, 2.6, { fill: PL.theme.pale(0.5) });          // 輪
      D.disc(ctx, 8, 2, 2.6, { fill: PL.theme.pale(0.5) });
      D.rect(ctx, -4, -20, 8, 17, { fill: PL.col("accent-2"), r: 3 }); // 身體
      D.disc(ctx, 0, -25, 5.5, { fill: "#e8b48c" });                   // 頭
      ctx.restore();

      // 能量長條：守恆最有說服力的呈現方式
      if (layers.has("bars")) {
        const e = energies();
        const total = e.K + e.U + e.Q;
        const barX = W - 132, barY = 20, barW = 108, barH = 132;
        D.rect(ctx, barX - 8, barY - 8, barW + 16, barH + 46,
          { fill: PL.theme.shade(0.4), stroke: PL.theme.pale(0.2), r: 8 });
        D.text(ctx, "能量分佈", barX, barY + 4, { color: PL.col("text-faint"), size: 10 });

        const items = [
          { label: "動能", value: e.K, color: m },
          { label: "位能", value: e.U, color: PL.col("accent-2") },
          { label: "熱能", value: e.Q, color: PL.col("warn") }
        ];
        /*
         * 原本是 scale = total / barH，也就是把長條正規化到「當下的總能量」。
         * 後果是質量從 20 kg 拉到 90 kg，三根長條完全一樣高——
         * 能量明明變成 4.5 倍，畫面卻看不出任何差別，
         * 「質量」這根滑桿對學生來說等於沒有作用。
         *
         * 改用固定的參考能量（最大質量 × g × 最高起點），
         * 於是重的滑板長條就是明顯比較高，
         * 而「三根長條加起來的高度不變」這個守恆的重點仍然成立。
         */
        const REF = 90 * g * 12;
        const scale = REF / barH;
        let cursor = barY + barH + 12;
        items.forEach((item, i) => {
          const w = barW / 3 - 6;
          const x = barX + i * (barW / 3);
          const h = Math.max(0, item.value / scale);
          D.rect(ctx, x, cursor - h, w, h, { fill: item.color, r: 2 });
          D.text(ctx, item.label, x + w / 2, cursor + 12,
            { color: PL.col("text-faint"), size: 9, align: "center" });
          D.text(ctx, PL.fmt(item.value, 0), x + w / 2, cursor - h - 4,
            { color: item.color, size: 9.5, align: "center", weight: "700" });
        });
        // 總量線：不論怎麼滑，這條線都不會動
        D.line(ctx, barX - 4, cursor - total / scale, barX + barW, cursor - total / scale,
          PL.col("ok"), 1.6, [4, 3]);
        D.text(ctx, "總量 " + PL.fmt(total, 0) + " J", barX + barW, cursor - total / scale - 5,
          { color: PL.col("ok"), size: 9.5, align: "right", weight: "700" });
      }

      // 推到極端時的合理反應
      if (fellOff) {
        D.text(ctx, "衝出軌道了！降低起始高度或加一點摩擦再試一次", W / 2, topY + 14,
          { color: PL.col("danger"), size: 13, align: "center", weight: "700" });
      } else if (stopped) {
        D.text(ctx, "摩擦把機械能全部轉成熱能，停下來了", W / 2, topY + 14,
          { color: PL.col("warn"), size: 13, align: "center", weight: "700" });
      }

      PL.ui.caption(cv, tk.note + (sFric.get() > 0
        ? "　目前有摩擦：機械能會持續轉成熱能，但四項能量的總和仍然守恆。"
        : "　目前無摩擦：動能與位能互換，總和是定值。"));

      const e = energies();
      rH.set(e.h, 2); rV.set(Math.abs(v), 2);
      rKE.set(e.K, 0); rPE.set(e.U, 0); rTh.set(e.Q, 0);
      rTot.set(e.K + e.U + e.Q, 0);
    }

    function chart() {
      cvE.clear();
      const span = 12;
      const recent = history.filter(p => p[0] > t - span);
      const total = Math.max(1, ...history.map(p => p[1] + p[2] + p[3]));
      const gph = PL.graph(cvE, { x: 44, y: 14, w: cvE.W - 58, h: cvE.H - 36 },
        { x0: Math.max(0, t - span), x1: Math.max(span, t), y0: 0, y1: total * 1.15 });
      gph.frame({ xlabel: "t (s)", ylabel: "能量 (J)" });
      gph.grid(6, 4);
      if (recent.length > 1) {
        gph.curve(recent.map(p => [p[0], p[1]]), { color: MC(), width: 2 });
        gph.curve(recent.map(p => [p[0], p[2]]), { color: PL.col("accent-2"), width: 2 });
        if (sFric.get() > 0) gph.curve(recent.map(p => [p[0], p[3]]), { color: PL.col("warn"), width: 2 });
        gph.curve(recent.map(p => [p[0], p[1] + p[2] + p[3]]), { color: PL.col("ok"), width: 2.4, dash: [5, 4] });
      }
      gph.label(Math.max(0, t - span) + 0.3, total * 1.05, "動能／位能／總和", { color: PL.col("text-faint"), size: 9.5 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) {
        step(dt);
        bPlay.textContent = running ? "暫停" : "放開";
      }
      drawAll();
    }, 50);

    cv.onResize(scene); cvE.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cvE.destroy(); },
      rerender: drawAll
    };
  }});

  /* 重力位能與彈性位能 */
  PL.register("potential", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const g = 9.8; let phase = "ready", y = 0, v = 0, comp = 0;
    const sX = PL.ui.slider(L.controls, { label: "彈簧壓縮量 x", min: 0.1, max: 0.6, step: 0.05, value: 0.4, unit: "m", digits: 2, onInput: r });
    const sK = PL.ui.slider(L.controls, { label: "彈簧勁度 k", min: 100, max: 800, step: 20, value: 400, unit: "N/m", digits: 0, onInput: r });
    const sM = PL.ui.slider(L.controls, { label: "物體質量 m", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: r });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釋放", () => { r(); comp = sX.get(); phase = "spring"; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", r);
    const rHmax = PL.ui.readout(L.readouts, { label: "理論最大高度", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速率 v", unit: "m/s" });
    const rH = PL.ui.readout(L.readouts, { label: "當前高度", unit: "m" });
    function r() { phase = "ready"; y = 0; v = 0; comp = sX.get(); }
    r();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const k = sK.get(), x0 = sX.get(), m = sM.get(), Hmax = 0.5 * k * x0 * x0 / (m * g);
      const groundY = H - 30, sc = (H - 80) / (Hmax + 0.6), cx = W * 0.34;
      D.line(ctx, cx - 50, groundY, cx + 50, groundY, PL.col("text-faint"), 2);
      const springTop = groundY - (0.6 - comp) * sc * 0.4 - 40;
      D.spring(ctx, cx, groundY, cx, springTop, 9, 10, MC());
      const by = springTop - 14 - y * sc;
      D.rect(ctx, cx - 20, by - 20, 40, 20, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      // 能量長條
      const spE = 0.5 * k * comp * comp, ke = 0.5 * m * v * v, pe = m * g * y;
      energyBars(cv, W * 0.5, 50, W * 0.42, [{ label: "彈性能", v: spE, c: MC() }, { label: "動能", v: ke, c: KEc }, { label: "重力能", v: pe, c: PEc }], Math.max(spE, 0.5 * k * x0 * x0, 1));
      rHmax.set(Hmax, 2); rV.set(v, 2); rH.set(y, 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.02); const k = sK.get(), m = sM.get();
        if (phase === "spring") { const F = k * comp - m * g; v += F / m * dt; comp -= v * dt; if (comp <= 0) { comp = 0; phase = "fly"; } }
        else if (phase === "fly") { v -= g * dt; y += v * dt; if (y <= 0 && v < 0) { y = 0; phase = "ready"; anim.stop(); } }
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 保守力與非保守力 */
  PL.register("conservative", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const m = 1, g = 9.8; let s = 0;
    const sPath = PL.ui.select(L.controls, { label: "選擇路徑", value: "diag", options: [{ value: "diag", label: "路徑一：直線" }, { value: "L", label: "路徑二：先下後平" }, { value: "arc", label: "路徑三：繞遠弧線" }], onChange: () => { s = 0; } });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係數 μ（非保守）", min: 0, max: 0.4, step: 0.02, value: 0.2, unit: "", digits: 2 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "出發", () => { s = 0; anim.start(); }, { primary: true });
    PL.ui.note(L.controls, "重力做功只看起點與終點高度差（與路徑無關）；摩擦做功則與路徑長度有關。");
    const rWg = PL.ui.readout(L.readouts, { label: "重力功 W_g", unit: "J" });
    const rWf = PL.ui.readout(L.readouts, { label: "摩擦功 W_f", unit: "J" });
    const rLen = PL.ui.readout(L.readouts, { label: "路徑長", unit: "m" });
    const A = { x: 2, y: 10 }, B = { x: 18, y: 2 };
    function pathPts() {
      const p = sPath.get();
      if (p === "diag") return [A, B];
      if (p === "L") return [A, { x: A.x, y: B.y }, B];
      const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; const x = PL.lerp(A.x, B.x, t); const y = PL.lerp(A.y, B.y, t) + 5 * Math.sin(Math.PI * t); pts.push({ x, y }); } return pts;
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const sx = (W - 60) / 20, sy = (H - 60) / 12, PX = p => 30 + p.x * sx, PY = p => H - 30 - p.y * sy;
      const pts = pathPts();
      // 高度參考線
      D.line(ctx, 20, PY(A), W - 20, PY(A), "rgba(255,255,255,0.08)", 1, [3, 3]);
      D.line(ctx, 20, PY(B), W - 20, PY(B), "rgba(255,255,255,0.08)", 1, [3, 3]);
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 3; ctx.beginPath();
      pts.forEach((p, i) => { const px = PX(p), py = PY(p); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.restore();
      D.disc(ctx, PX(A), PY(A), 6, { fill: PL.col("accent-2") }); D.text(ctx, "A", PX(A) - 14, PY(A) + 4, { color: PL.col("accent-2"), size: 13 });
      D.disc(ctx, PX(B), PY(B), 6, { fill: PL.col("warn") }); D.text(ctx, "B", PX(B) + 8, PY(B) + 4, { color: PL.col("warn"), size: 13 });
      // 長度與功
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const Wg = m * g * (A.y - B.y), Wf = -sMu.get() * m * g * len;
      // 移動點
      const idx = Math.min(pts.length - 1, Math.floor(s * (pts.length - 1)));
      D.disc(ctx, PX(pts[idx]), PY(pts[idx]), 8, { fill: MC(), glow: MC(), glowSize: 12 });

      /*
       * 摩擦係數這根滑桿原本只改變讀數上的數字，畫面完全沒反應。
       * 這個實驗的整個重點就是「重力功與路徑無關、摩擦功與路徑長有關」，
       * 看不到差別的話滑桿等於白放。
       *
       * 改成畫一組能量長條：重力功固定不動，摩擦功隨 μ 與路徑長一起長，
       * 淨功 = 兩者相加。切換路徑時重力功那一條紋風不動，
       * 摩擦那一條卻明顯變長——這就是「保守力」與「非保守力」的差別。
       */
      const bx = W - 132, by = 30, bw = 104, rowH = 17;
      const scale = bw / Math.max(1, Math.abs(Wg) * 1.6);
      D.text(ctx, "做功比較", bx, by - 8, { color: PL.col("text-dim"), size: 10.5, weight: "700" });
      [["重力功 W_g", Wg, PL.col("ok")],
       ["摩擦功 W_f", Wf, PL.col("danger")],
       ["淨功", Wg + Wf, PL.col("accent-2")]].forEach((row, i) => {
        const y = by + i * (rowH + 12);
        D.text(ctx, row[0], bx, y + 8, { color: PL.col("text-faint"), size: 9.5 });
        D.rect(ctx, bx, y + 12, bw, rowH, { fill: PL.theme.pale(0.07), r: 3 });
        const len2 = Math.min(bw, Math.abs(row[1]) * scale);
        D.rect(ctx, bx, y + 12, len2, rowH, { fill: row[2], r: 3 });
        D.text(ctx, PL.fmt(row[1], 1) + " J", bx + bw + 4, y + 25, { color: row[2], size: 10 });
      });

      PL.ui.caption(cv, sMu.get() <= 0
        ? "摩擦係數為 0：三條路徑的淨功完全相同——只有重力在做功，而重力功只看高度差。"
        : "切換三條路徑看看：重力功那一條長度紋風不動（只看高度差），" +
          "摩擦功那一條卻隨路徑變長——這就是保守力與非保守力的差別。");
      rWg.set(Wg, 1); rWf.set(Wf, 1); rLen.set(len, 1);
    }
    const anim = PL.loop(dt => { if (dt) { s += dt * 0.4; if (s >= 1) { s = 1; anim.stop(); } } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
