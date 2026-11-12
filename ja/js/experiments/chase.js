/* 追及與相遇 —— 兩車同向共線的追及問題
 *
 * 為什麼值得單獨做一個：
 * 「後車比前車快，遲早追上」——這句話只對了一半，而學生幾乎都背成全對。
 * 前車在剎車 → 它終會停下 → 後車一定追得上，只是這段時間夠不夠而已；
 * 前車在加速 → 它越來越快 → 速度相等的那一刻若還沒追上，之後就永遠追不上了。
 *
 * 這個「速度相等是間距的極值」是整個單元的鑰匙，但它在課本上只是一行字。
 * 做成模擬之後可以直接看：Δx−t 曲線的最高點就落在 v甲 = v乙 的那一刻。
 *
 * 三張圖各自回答不同的問題，所以用分頁而不是硬塞在一起：
 *   x−t   兩條位置曲線的交點 = 相遇
 *   v−t   兩條線的交點 = 速度相等，曲線之間的面積 = 間距的變化量
 *   Δx−t  間距本身，極值一眼可見
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#4dd0e1");
  const CAR_A = "#c9a227";      // 甲：後車
  const CAR_B = "#5b8dd6";      // 乙：前車

  PL.register("chase-and-meet", { build(root) {
    // 道路與三張時間圖都要橫向空間
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.34, 960);

    const T_MAX = 12;                 // 觀察時間長度（s）
    const X_MAX = 160;                // 畫面涵蓋的路程（m）
    let t = 0;

    /* ---------------- 控制項 ---------------- */
    PL.ui.section(L.controls, "場面");
    const scenarios = {
      brake:  { label: "等速で、ブレーキ中の車を追う", va: 12, aa: 0,   vb: 20, ab: -4,
                note: "前の車はブレーキで止まったらもう動きません。後ろの車は必ず追いつきます。公式で計算して、前の車が止まったあとに後ろへ下がる結果が出たら、それは計算のまちがいです。" },
      start:  { label: "等速で、発進する車を追う", va: 15, aa: 0,   vb: 0,  ab: 2,
                note: "前の車は止まった状態から発進し、加速し続けます。速さが等しくなった瞬間までに追いついていなければ、そのあとは二度と追いつけません。" },
      accel:  { label: "発進して、等速の車を追う", va: 0,  aa: 3,   vb: 10, ab: 0,
                note: "後ろの車が止まった状態から発進します。速さが等しくなったとき間隔が最大になり、そこから縮みはじめます。" }
    };
    let scenarioKey = "brake";

    PL.ui.presets(L.controls, {
      options: Object.keys(scenarios).map(k => ({
        label: scenarios[k].label,
        hint: scenarios[k].note,
        apply: () => {
          scenarioKey = k;
          const s = scenarios[k];
          sVa.set(s.va); sAa.set(s.aa); sVb.set(s.vb); sAb.set(s.ab);
          t = 0; sTime.set(0); draw();
        }
      }))
    });

    PL.ui.section(L.controls, "A（後ろの車）");
    const sVa = PL.ui.slider(L.controls, { label: "A の初速度 v₀", min: 0, max: 30, step: 0.5, value: 12, unit: "m/s", digits: 1, onInput: reset });
    const sAa = PL.ui.slider(L.controls, { label: "A の加速度 a", min: -6, max: 6, step: 0.5, value: 0, unit: "m/s²", digits: 1, onInput: reset });

    PL.ui.section(L.controls, "B（前の車）");
    const sVb = PL.ui.slider(L.controls, { label: "B の初速度 v₀", min: 0, max: 30, step: 0.5, value: 20, unit: "m/s", digits: 1, onInput: reset });
    const sAb = PL.ui.slider(L.controls, { label: "B の加速度 a", min: -6, max: 6, step: 0.5, value: -4, unit: "m/s²", digits: 1, onInput: reset });

    PL.ui.section(L.controls, "はじめの条件");
    const sGap = PL.ui.slider(L.controls, { label: "はじめの間隔 Δx₀", min: 0, max: 80, step: 1, value: 30, unit: "m", digits: 0, onInput: reset });
    const sTime = PL.ui.slider(L.controls, { label: "見る時刻 t", min: 0, max: T_MAX, step: 0.05, value: 0, unit: "s", digits: 2,
      onInput: v => { t = v; anim.stop(); draw(); } });

    const row = PL.ui.buttonRow(L.controls);
    /*
     * 這裡刻意不做播放／暫停按鈕。
     * 引擎的傳輸列已經提供播放、單步與速度，而且它控制的就是下面這個迴圈。
     * 實驗若再維護一個自己的 running 旗標，就會變成「兩個開關要同時打開」——
     * 傳輸列按了播放卻毫無反應，學生完全看不出問題在哪。這是實際回報過的狀況。
     *
     * 下面幾顆是「跳到某個時刻」的動作，按下時把動畫停住，
     * 因為它們的用途就是停在那一刻仔細看。
     */
    PL.ui.button(row, "速さが等しい時刻へ", () => {
      const te = equalSpeedTime();
      if (te != null) { t = te; sTime.set(t); anim.stop(); draw(); }
    }, { primary: true });
    PL.ui.button(row, "追いつく時刻へ", () => {
      const tc = catchTime();
      if (tc != null) { t = tc; sTime.set(t); anim.stop(); draw(); }
    });
    PL.ui.button(row, "リセット", () => { t = 0; sTime.set(0); draw(); });

    function reset() { t = 0; sTime.set(0); draw(); }

    /* 直接在路上操作：抓乙車車尾左右拖改初始間距，拖兩車的速度箭頭尖端改初速（3.2 px 代表 1 m/s） */
    let cg = { k: 1, xa: 0, xb: 0 };
    const gGap = PL.ui.handle(cv, { slider: sGap, label: "B の車（左右に引いてはじめの間隔 Δx₀ を変える）", toValue: x => (x + 22 - 40) / cg.k });
    const gVa = PL.ui.handle(cv, { slider: sVa, label: "A の初速度（矢印をドラッグ）", toValue: x => (x - cg.xa - 29) / 3.2 });
    const gVb = PL.ui.handle(cv, { slider: sVb, label: "B の初速度（矢印をドラッグ）", toValue: x => (x - cg.xb - 29) / 3.2 });

    PL.ui.note(L.controls,
      "「後ろの車のほうが速ければ、いつかは追いつく」は半分しか正しくありません。" +
      "前の車がブレーキをかけているなら、いずれ止まるので必ず追いつきます。問題は、見ている時間内に追いつくかどうかだけです。" +
      "前の車が加速しているなら、どんどん速くなるので、速さが等しくなった瞬間までに追いついていなければ、二度と追いつけません。" +
      "まず「速さが等しい時刻へ」を押して、下の Δx−t グラフを見ます。その瞬間がちょうど間隔の極値です。");

    /* ---------------- 運動學 ----------------
     * 兩車都是等加速度直線運動，但必須處理「剎停後不再倒退」：
     * 直接套 x = v₀t + ½at² 會讓剎停的車開始往回走，這是本單元最經典的錯誤。
     */
    function motion(v0, a, tt) {
      const tStop = a < 0 ? -v0 / a : Infinity;     // 減速到零的時刻
      const te = Math.min(tt, tStop);
      return {
        x: v0 * te + 0.5 * a * te * te,
        v: tt >= tStop ? 0 : v0 + a * tt,
        stopped: tt >= tStop
      };
    }
    const carA = tt => motion(sVa.get(), sAa.get(), tt);
    const carB = tt => motion(sVb.get(), sAb.get(), tt);
    /* 間距：乙在前方 Δx₀ 處，甲從原點出發 */
    const gapAt = tt => sGap.get() + carB(tt).x - carA(tt).x;

    /*
     * 這三個量都要掃 2400 個點，而它們只跟滑桿有關、不跟目前時刻有關。
     * 第一版每次更新畫面都重算三遍，一影格一萬多次運算——手機上會明顯掉格。
     * 改成以「參數組合」為鍵快取，滑桿沒動就直接取用。
     */
    let cache = null;
    function analysis() {
      const key = [sVa.get(), sAa.get(), sVb.get(), sAb.get(), sGap.get()].join("|");
      if (cache && cache.key === key) return cache;
      cache = { key, te: equalSpeedTimeRaw(), tc: catchTimeRaw(), near: closestRaw() };
      return cache;
    }
    const equalSpeedTime = () => analysis().te;
    const catchTime = () => analysis().tc;
    const closest = () => analysis().near;

    /* 速度相等的時刻（含剎停後速度為零的情況，用掃描比解析式穩健） */
    function equalSpeedTimeRaw() {
      let prev = carA(0).v - carB(0).v, best = null;
      for (let i = 1; i <= 2400; i++) {
        const tt = i / 200;
        const d = carA(tt).v - carB(tt).v;
        if (prev === 0) { best = (i - 1) / 200; break; }
        if ((prev < 0 && d >= 0) || (prev > 0 && d <= 0)) { best = tt; break; }
        prev = d;
      }
      return best;
    }
    /* 追上的時刻：間距首次 ≤ 0 */
    function catchTimeRaw() {
      for (let i = 0; i <= 2400; i++) {
        const tt = i / 200;
        if (gapAt(tt) <= 0) return tt;
      }
      return null;
    }
    /* 這段觀察時間內最接近的時刻與間距 */
    function closestRaw() {
      let bt = 0, bg = Infinity;
      for (let i = 0; i <= 2400; i++) {
        const tt = i / 200, g = gapAt(tt);
        if (g < bg) { bg = g; bt = tt; }
      }
      return { t: bt, gap: bg };
    }

    /* ---------------- 讀數 ---------------- */
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rT = PL.ui.readout(L.readouts, { label: "時刻 t", unit: "s" });
    const rGap = PL.ui.readout(L.readouts, { label: "いまの間隔 Δx", unit: "m" });
    const rDv = PL.ui.readout(L.readouts, { label: "速さの差 vA − vB", unit: "m/s" });
    const rXa = PL.ui.readout(L.readouts, { label: "A の位置", unit: "m" });
    const rXb = PL.ui.readout(L.readouts, { label: "B の位置", unit: "m" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "速さが等しい時刻", unit: "s", hint: "この瞬間に間隔が極値になる" },
      { label: "その瞬間の間隔", unit: "m", hint: "この時間内でいちばん近づいた距離" },
      { label: "結果", hint: "追いつくか、追いつかないか、あとどれだけか" }
    ]);

    /* ---------------- 主畫面：公路俯視 ---------------- */
    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const roadTop = H * 0.20, roadBot = H * 0.78;
      const px = m => 40 + (m / X_MAX) * (W - 80);
      cv.calibrate((W - 80) / X_MAX, "m");

      // 俯視的雙線道公路：兩側草地與行道樹
      const AP = PL.apparatus;
      AP.ground(ctx, 0, W, 0, H, "grass");
      AP.ground(ctx, 0, W, roadTop, roadBot - roadTop, "asphalt");
      ctx.fillStyle = PL.theme.isLight() ? "#d9dcdf" : "#50555c";
      ctx.fillRect(0, roadTop - 4, W, 4); ctx.fillRect(0, roadBot, W, 4);
      for (let i = 0; i < 9; i++) AP.tree(ctx, 30 + i * (W - 40) / 8, roadTop - 8, 24, 5 + i);
      // 車道分隔虛線
      const mid = (roadTop + roadBot) / 2;
      ctx.fillStyle = PL.theme.isLight() ? "rgba(255,255,255,0.9)" : "rgba(235,235,200,0.6)";
      for (let x = 20; x < W; x += 34) ctx.fillRect(x, mid - 1.5, 18, 3);
      // 距離刻度
      for (let m = 0; m <= X_MAX; m += 10) {
        const x = px(m);
        D.line(ctx, x, roadBot, x, roadBot + 6, PL.theme.pale(0.25), 1);
        if (m % 20 === 0) {
          D.text(ctx, String(m), x, roadBot + 18,
            { color: PL.col("text-faint"), size: 9, align: "center" });
        }
      }
      D.text(ctx, "x / m", W - 40, roadBot + 18, { color: PL.col("text-faint"), size: 9, align: "right" });

      const A = carA(t), B = carB(t);
      const xa = A.x, xb = sGap.get() + B.x;
      const laneA = mid + (roadBot - mid) * 0.42;
      const laneB = roadTop + (mid - roadTop) * 0.55;

      // 間距標註：把 Δx 畫成一段有端點的線段，而不是只印數字
      const gap = xb - xa;
      if (gap > 0.2) {
        const y = roadTop - 14;
        D.line(ctx, px(xa), y, px(xb), y, PL.col("warn"), 1.6);
        D.line(ctx, px(xa), y - 5, px(xa), y + 5, PL.col("warn"), 1.6);
        D.line(ctx, px(xb), y - 5, px(xb), y + 5, PL.col("warn"), 1.6);
        D.text(ctx, "Δx = " + PL.fmt(gap, 1) + " m", (px(xa) + px(xb)) / 2, y - 8,
          { color: PL.col("warn"), size: 11, align: "center", weight: "700" });
      }

      drawCar(ctx, px(xa), laneA, CAR_A, "A", A.v, A.stopped);
      drawCar(ctx, px(xb), laneB, CAR_B, "B", B.v, B.stopped);
      // 把手只在 t = 0（起跑前）出現：拖的是初始條件，改了本來就會回到 t = 0
      cg = { k: (W - 80) / X_MAX, xa: px(xa), xb: px(xb) };
      [[gGap, px(xb) - 22, laneB], [gVa, px(xa) + 29 + sVa.get() * 3.2, laneA], [gVb, px(xb) + 29 + sVb.get() * 3.2, laneB]]
        .forEach(([gp, x, y]) => t === 0 ? gp.place(x, y) : gp.hide());

      PL.ui.caption(cv, scenarios[scenarioKey] ? scenarios[scenarioKey].note
        : "どちらかの車の初速度や加速度を変えて、下の 3 つのグラフがどう変わるか見ます。");
    }

    function drawCar(ctx, x, y, color, name, v, stopped) {
      const w = 52, h = 24;
      // 剎車燈：剎停或減速中亮起，這是「前車在剎車」最直接的視覺線索
      PL.apparatus.carTop(ctx, x, y, w, color, { brake: stopped || v < 0.05 });
      // 速度箭頭：長度正比於速率
      if (v > 0.05) {
        D.arrow(ctx, x + w / 2 + 3, y, x + w / 2 + 3 + v * 3.2, y,
          { color: PL.theme.pale(0.55), width: 2, head: 6 });
      }
      D.text(ctx, name + " v = " + PL.fmt(v, 1) + " m/s", x, y - h / 2 - 10,
        { color: PL.theme.isLight() ? "#ffffff" : "#f2f4f8", size: 11, align: "center", weight: "800" });
    }

    /* ---------------- 三張圖 ---------------- */
    const tabs = PL.ui.chartTabs(PL.ui.charts(root), {
      title: "グラフの読み取り",
      aspect: 0.42,
      views: [
        {
          label: "x − t グラフ",
          cap: "2 本の位置のグラフが交わった瞬間に追いつく。交わる前は、2 本の縦軸の値の差が残りの間隔。",
          draw(c) { drawXT(c); }
        },
        {
          label: "v − t グラフ",
          cap: "2 本の線の交点が「速さが等しい」所。交点の前は B が A より速く、間隔は広がっている。交点のあとは A が B より速く、間隔は縮みはじめる。",
          draw(c) { drawVT(c); }
        },
        {
          label: "Δx − t 間隔",
          cap: "間隔そのもの。グラフのいちばん高い点は、速さが等しい瞬間にある。ここがこの単元でいちばん大事な点。0 になれば追いついた。",
          draw(c) { drawGap(c); }
        }
      ]
    });

    function domainX() { return { x0: 0, x1: T_MAX }; }

    function drawXT(c) {
      const g = PL.graph(c, { x: 52, y: 16, w: c.W - 68, h: c.H - 44 },
        Object.assign(domainX(), { y0: 0, y1: Math.max(60, X_MAX) }));
      g.frame({ xlabel: "t (s)", ylabel: "x (m)" });
      g.grid(6, 4);
      const pa = [], pb = [];
      for (let i = 0; i <= 240; i++) {
        const tt = i / 240 * T_MAX;
        pa.push([tt, carA(tt).x]);
        pb.push([tt, sGap.get() + carB(tt).x]);
      }
      g.curve(pa, { color: CAR_A, width: 2.4 });
      g.curve(pb, { color: CAR_B, width: 2.4 });
      const tc = catchTime();
      if (tc != null && tc <= T_MAX) {
        g.dot(tc, carA(tc).x, { color: PL.col("ok"), glow: PL.col("ok"), r: 6 });
        g.label(tc, carA(tc).x + X_MAX * 0.06, "追いつく t = " + PL.fmt(tc, 2) + " s",
          { color: PL.col("ok"), size: 10 });
      }
      g.vline(t, { color: PL.theme.pale(0.4), dash: [4, 3], width: 1 });
      g.label(0.2, X_MAX * 0.94, "A（後ろの車）", { color: CAR_A, size: 10 });
      g.label(0.2, X_MAX * 0.86, "B（前の車）", { color: CAR_B, size: 10 });
    }

    function drawVT(c) {
      const vmax = Math.max(sVa.get(), sVb.get(), 5) * 1.25;
      const g = PL.graph(c, { x: 52, y: 16, w: c.W - 68, h: c.H - 44 },
        Object.assign(domainX(), { y0: 0, y1: vmax }));
      g.frame({ xlabel: "t (s)", ylabel: "v (m/s)" });
      g.grid(6, 4);
      const pa = [], pb = [];
      for (let i = 0; i <= 240; i++) {
        const tt = i / 240 * T_MAX;
        pa.push([tt, carA(tt).v]);
        pb.push([tt, carB(tt).v]);
      }
      g.curve(pa, { color: CAR_A, width: 2.4 });
      g.curve(pb, { color: CAR_B, width: 2.4 });
      const te = equalSpeedTime();
      if (te != null && te <= T_MAX) {
        g.vline(te, { color: PL.col("warn"), dash: [5, 4], width: 1.6 });
        g.label(te, vmax * 0.92, "速さが等しい", { color: PL.col("warn"), size: 10 });
      }
      g.vline(t, { color: PL.theme.pale(0.4), dash: [4, 3], width: 1 });
    }

    function drawGap(c) {
      let hi = 0, lo = 0;
      const pts = [];
      for (let i = 0; i <= 240; i++) {
        const tt = i / 240 * T_MAX, gp = gapAt(tt);
        pts.push([tt, gp]);
        hi = Math.max(hi, gp); lo = Math.min(lo, gp);
      }
      const pad = Math.max(4, (hi - lo) * 0.14);
      const g = PL.graph(c, { x: 52, y: 16, w: c.W - 68, h: c.H - 44 },
        Object.assign(domainX(), { y0: Math.min(0, lo) - pad, y1: hi + pad }));
      g.frame({ xlabel: "t (s)", ylabel: "Δx (m)" });
      g.grid(6, 4);
      g.hline(0, { color: PL.col("danger"), width: 1.6 });
      g.label(0.2, pad * 0.4, "Δx = 0 で追いつく", { color: PL.col("danger"), size: 9.5 });
      g.curve(pts, { color: MC(), width: 2.6 });
      const te = equalSpeedTime();
      if (te != null && te <= T_MAX) {
        g.vline(te, { color: PL.col("warn"), dash: [5, 4], width: 1.6 });
        g.dot(te, gapAt(te), { color: PL.col("warn"), glow: PL.col("warn"), r: 6 });
        g.label(te, gapAt(te) + pad * 0.5, "速さが等しい → 間隔が極値", { color: PL.col("warn"), size: 10 });
      }
      g.vline(t, { color: PL.theme.pale(0.4), dash: [4, 3], width: 1 });
    }

    /* ---------------- 更新 ---------------- */
    function update() {
      draw();
      tabs.render();

      const A = carA(t), B = carB(t);
      const gap = gapAt(t);
      rT.set(t, 2);
      rGap.set(gap, 1);
      rDv.set(A.v - B.v, 2);
      rXa.set(A.x, 1);
      rXb.set(sGap.get() + B.x, 1);

      const te = equalSpeedTime();
      const tc = catchTime();
      const near = closest();
      dv.set(0, te == null ? "—" : PL.fmt(te, 2), 2);
      dv.set(1, te == null ? "—" : PL.fmt(gapAt(te), 1), 1);

      if (tc != null && tc <= T_MAX) {
        dv.set(2, "追いつく（t = " + PL.fmt(tc, 2) + " s）");
        dv.tone(2, "ok");
        vd.set(t >= tc ? "もう追いついた" : "追いつく：t = " + PL.fmt(tc, 2) + " s、あと " + PL.fmt(gap, 1) + " m",
          "ok", t >= tc ? 1 : Math.max(0, 1 - gap / Math.max(1, near.gap + gapAt(0))));
      } else {
        // 分辨「這段時間不夠」與「永遠追不上」：看速度相等之後間距是否仍在縮小
        const shrinking = gapAt(T_MAX) < gapAt(Math.max(0, (te == null ? 0 : te)));
        dv.set(2, shrinking ? "この時間内にはまだ追いつかない" : "ずっと追いつけない");
        dv.tone(2, shrinking ? "warn" : "bad");
        vd.set(shrinking
          ? "この " + T_MAX + " 秒間ではまだ追いつかない。でも間隔はまだ縮んでいるので、時間が足りないだけ"
          : "追いつけない：速さが等しいときにいちばん近づいても、まだ " + PL.fmt(near.gap, 1) + " m",
          shrinking ? "warn" : "bad",
          Math.max(0, 1 - near.gap / Math.max(1, gapAt(0))));
      }
    }

    const anim = PL.loop(dt => {
      if (dt) {
        // 跑到觀察時間結束就停住，不要無限重播；使用者按傳輸列播放即可重新開始
        if (t >= T_MAX) { anim.stop(); update(); return; }
        t = Math.min(T_MAX, t + dt);
        sTime.set(t);
      }
      update();
    }, 50);

    cv.onResize(update);
    tabs.canvas.onResize(update);
    update();

    return {
      stop() { anim.stop(); cv.destroy(); tabs.canvas.destroy(); },
      rerender: update
    };
  }});
})();
