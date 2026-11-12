/* 模組七 · 流體與熱學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#e57373");
  // 相對拖曳：旋鈕、火焰這類沒有「位置＝數值」對應的東西，按下後上下（或左右）拖多少就加減多少
  const relGrip = (s, k, label, horiz) => {
    let st = null;
    return { slider: s, label, onGrab: () => { st = null; }, onRelease: () => { st = null; },
      toValue: (x, y) => { if (!st) st = { x, y, v: s.get() }; return st.v + (horiz ? x - st.x : st.y - y) * k; } };
  };

  /* 浮力與阿基米德原理 */
  PL.register("buoyancy", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let bob = 0;
    const sObj = PL.ui.slider(L.controls, { label: "物体の密度 ρ物体", min: 200, max: 2000, step: 50, value: 600, unit: "kg/m³", digits: 0 });
    const sFl = PL.ui.slider(L.controls, { label: "流体の密度 ρ流体", min: 500, max: 1400, step: 50, value: 1000, unit: "kg/m³", digits: 0 });
    PL.ui.note(L.controls, "水の密度は約 1000 kg/m³ です。沈んでいる割合 = ρ物体 / ρ流体 で、比が 1 以上なら沈みます。");
    const rState = PL.ui.readout(L.readouts, { label: "状態" });
    const rSub = PL.ui.readout(L.readouts, { label: "沈んでいる割合", unit: "%" });
    const rFb = PL.ui.readout(L.readouts, { label: "浮力 / 重力" });
    // 抓木塊往下壓（或往上提）再放手：漂浮的會上下晃回平衡吃水線，下沉的會落回槽底
    let push = 0, pushV = 0, held = false, geo = null;
    const grip = PL.ui.handle(cv, { label: "物体（押し下げたり持ち上げたりしてはなす）",
      onDrag: (x, y) => { held = true; pushV = 0; push = PL.clamp(y - geo.grabY, geo.lo, geo.hi); draw(); },
      onRelease: () => { held = false; if (!anim.running) anim.start(); } });
    function settle(dt) {
      if (held || !dt || !geo) return;
      const fl = sObj.get() < sFl.get();
      pushV += (fl ? -36 * push - 2.4 * pushV : 420 - 3 * pushV) * dt; push += pushV * dt;
      if (!fl && push >= 0) { push = 0; pushV = 0; }
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const ro = sObj.get(), rf = sFl.get(), ratio = ro / rf, floats = ratio < 1;
      const AP = PL.apparatus;
      const surf = 96, tankL = Math.round(W * 0.21), tankR = Math.round(W * 0.79), bottom = H - 30;
      // 玻璃水槽：水面、杯壁與刻度都畫出來，「沒入多少」才量得出來
      AP.benchTop(ctx, W, H, bottom - 2);
      AP.beaker(ctx, (tankL + tankR) / 2, bottom, tankR - tankL, bottom - surf + 26,
        (bottom - surf) / (bottom - surf + 26));
      const boxW = 84, boxH = 64, cx = W / 2;
      const sub = floats ? ratio : 1;
      let topY = floats ? surf - boxH * (1 - sub) + bob : surf - 0 + bob;
      if (!floats) topY = bottom - boxH; // 沉底
      const rest = topY - bob;
      geo = { grabY: rest + boxH - 12, lo: surf - boxH - 30 - rest, hi: bottom - boxH - rest };
      push = PL.clamp(push, geo.lo, geo.hi); topY += push;
      grip.place(cx, topY + boxH - 12);
      AP.woodBlock(ctx, cx, topY + boxH, boxW, boxH, 0);
      D.text(ctx, ro + "", cx, topY + boxH / 2 + 4, { color: "#2b1f10", size: 12, align: "center", weight: "700" });
      // 力向量
      const midX = cx, wY = topY + boxH / 2;
      D.arrow(ctx, midX - 26, wY, midX - 26, wY + 42, { color: PL.col("warn"), width: 2.4, label: "重力" });
      const fb = floats ? 1 : ratio < 1 ? ratio : 1 / ratio; // 浮力/重力
      D.arrow(ctx, midX + 26, wY, midX + 26, wY - 42 * (floats ? 1 : 1 / ratio), { color: PL.col("accent-2"), width: 2.4, label: "浮力" });
      rState.set(floats ? "浮く" : "沈む"); rSub.set(sub * 100, 0); rFb.set(floats ? "つり合い" : PL.fmt(1 / ratio, 2));
    }
    const anim = PL.loop((dt, t) => { bob = Math.sin(t * 1.6) * 3; settle(dt); draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 彈簧秤示重差量浮力 */
  PL.register("spring-scale-buoyancy", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    PL.ui.section(L.controls, "沈めて測る");
    const sRho = PL.ui.slider(L.controls, { label: "物体の密度 ρ物体", min: 1200, max: 8000, step: 100, value: 2700, unit: "kg/m³", digits: 0, onInput: () => draw() });
    const sVol = PL.ui.slider(L.controls, { label: "物体の体積 V", min: 100, max: 800, step: 25, value: 300, unit: "cm³", digits: 0, onInput: () => draw() });
    const sSub = PL.ui.slider(L.controls, { label: "沈めた割合", min: 0, max: 100, step: 5, value: 0, unit: "%", digits: 0, onInput: () => draw() });
    const sFluid = PL.ui.select(L.controls, { label: "液体", value: "1000", options: [{ value: "1000", label: "水（1000 kg/m³）" }, { value: "800", label: "アルコール（800 kg/m³）" }, { value: "1260", label: "食塩水（1260 kg/m³）" }], onChange: () => draw() });
    PL.ui.note(L.controls, "まず空気中での値を読み、それから少しずつ液体に沈めます。2 回のばねばかりの値の差が浮力です。再生を押して手をはなすと、金属のかたまりはばねの上で何回かゆれてから止まります。液体の中ではゆれが少なく、早く止まります。金属のかたまりを直接つかんで上下にドラッグし、沈める割合を変えることもできます。");
    const rW = PL.ui.readout(L.readouts, { label: "空気中での重さ W", unit: "N" });
    const rT = PL.ui.readout(L.readouts, { label: "ばねばかりの値 T", unit: "N" });
    const rFb = PL.ui.readout(L.readouts, { label: "値の差／浮力 F_b", unit: "N" });
    const rVd = PL.ui.readout(L.readouts, { label: "押しのけた液体の体積", unit: "cm³" });
    const chart = PL.ui.chart(PL.ui.charts(root), { title: "ばねばかりの値と沈めた割合", cap: "物体が全部沈むまでは、押しのける水が増えるので浮力が増え、ばねばかりの値は直線的に下がります。全部沈むと値は変わらなくなります。" });
    function data() {
      const rho = sRho.get(), volCm = sVol.get(), frac = sSub.get() / 100, rhoL = Number(sFluid.get()), vol = volCm * 1e-6;
      const W = rho * vol * 9.8, Fb = rhoL * vol * frac * 9.8;
      return { rho, volCm, frac, rhoL, W, Fb: Math.min(Fb, W), T: Math.max(0, W - Fb) };
    }
    /*
     * 彈簧秤的指針不是瞬間跳到新讀數：金屬塊掛在彈簧上是一個彈簧–質量系統，
     * 浮力一改變就上下振動，再由阻力慢慢消耗掉，最後指針停在 T = W − F_b（讀數仍以此式為準）。
     * 阻尼隨浸入比例變大——在空氣中幾乎只靠空氣阻力，泡進液體裡黏滯阻力大得多，晃兩下就停。
     * t = 0 時手還托著金屬塊、彈簧沒有伸長（示數 0）；按播放才放手。
     */
    let xr = 0, vr = 0;                      // 指針目前指的拉力（N）與其變化率
    const KPX = 1.2;                          // 每 1 N 拉力，彈簧多伸長幾 px（掛鉤下的細繩跟著變長）
    let geo = null;
    const clock = PL.motion.clock(dt => draw(dt));
    const grip = PL.ui.handle(cv, { slider: sSub, label: "金属のかたまり（上下に引いて沈める割合を変える）",
      toValue: (x, y) => geo ? 100 * (1 - (geo.surface - (y - geo.boxH + 6 - geo.bob)) / geo.boxH) : sSub.get() });
    function draw(dt) {
      const { ctx, W, H } = cv, s = data(); cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      const fresh = clock.t === 0 && !clock.running;
      if (fresh) { xr = 0; vr = 0; }
      else if (dt > 0) {
        const om = 9, ze = 0.07 + 0.35 * s.frac;
        let left = Math.min(dt, 0.1);
        while (left > 1e-6) { const h = Math.min(left, 1 / 240); vr += (-om * om * (xr - s.T) - 2 * ze * om * vr) * h; xr += vr * h; left -= h; }
      } else if (!clock.running) { xr = s.T; vr = 0; }
      /* 矮畫面時整組縮小、水面往下移，彈簧秤才掛得在鐵架橫桿底下 */
      const k = PL.clamp(H / 400, 0.6, 1), boxW = 72 * k, boxH = 56 * k;
      const tankL = W * 0.45, tankR = W - 36, surface = Math.max(H * 0.5, 113 + boxH), floor = H - 28;
      AP.benchTop(ctx, W, H, floor - 2);
      AP.beaker(ctx, (tankL + tankR) / 2, floor, tankR - tankL, floor - surface + 26,
        (floor - surface) / (floor - surface + 26));
      D.text(ctx, s.rhoL + " kg/m³", tankL + 12, surface + 19, { color: PL.col("accent-2"), size: 11 });
      const topEq = surface - boxH * (1 - s.frac), cx = (tankL + tankR) / 2;
      // 拉力超過 20 N 時指針已到底，延伸量也一併封頂，才不會把金屬塊拉出畫面
      const ext = v => PL.clamp(v, 0, 20) * KPX, bob = ext(xr) - ext(s.T), top = topEq + bob;
      /* 鐵架吊著彈簧秤，彈簧秤下掛金屬塊：浸得越深，整組跟著放低 */
      const len = PL.clamp(surface - boxH - 83 - ext(20), 30, Math.max(60, H * 0.16)), scaleTop = topEq - 18 - ext(s.T) - 21 - len;
      AP.standRod(ctx, tankL - 40, floor, 14);
      AP.crossArm(ctx, tankL - 40, 24, cx);
      AP.cord(ctx, cx, 33, cx, scaleTop - 11);
      const hook = AP.springScaleV(ctx, cx, scaleTop, len, PL.clamp(xr / 20, 0, 1), PL.fmt(Math.max(0, xr), 2) + " N");
      AP.cord(ctx, cx, hook.y, cx, top);
      AP.massBlock(ctx, cx, top + boxH, boxW, boxH, { color: "#8d97a6", label: "金属のかたまり", noShadow: true });
      geo = { surface, boxH, bob };
      // 把手放在金屬塊底緣中央，不蓋住中間的標籤與兩側的力箭頭
      grip.place(cx, top + boxH - 6);
      const mid = top + boxH / 2;
      D.arrow(ctx, cx - boxW * 0.44, mid, cx - boxW * 0.44, mid + 42, { color: PL.col("warn"), width: 2.2, label: "W" });
      D.arrow(ctx, cx + boxW * 0.44, mid, cx + boxW * 0.44, mid - 42 * (s.Fb / Math.max(s.W, 0.01)), { color: PL.col("accent-2"), width: 2.2, label: "F_b" });
      D.arrow(ctx, cx, top, cx, top - 34 * (s.T / Math.max(s.W, 0.01)), { color: MC(), width: 2, label: "T" });
      D.text(ctx, "沈めた割合 " + PL.fmt(s.frac * 100, 0) + "%", cx, floor - 9, { color: PL.col("text-dim"), size: 11, align: "center" });
      if (fresh) { D.text(ctx, "手で金属のかたまりを支えている。", 12, 30, { color: PL.col("text-dim"), size: 11 }); D.text(ctx, "再生を押すとはなす", 12, 46, { color: PL.col("text-dim"), size: 11 }); }
      rW.set(s.W, 2); rT.set(s.T, 2); rFb.set(s.Fb, 2); rVd.set(s.volCm * s.frac, 0);
      chart.clear();
      const g = PL.graph(chart, { x: 42, y: 16, w: chart.W - 58, h: chart.H - 40 }, { x0: 0, x1: 100, y0: 0, y1: Math.max(1, s.W * 1.15) });
      g.frame({ xlabel: "沈めた割合 (%)", ylabel: "T (N)" }); g.grid(5, 4);
      g.fn(p => Math.max(0, s.W - s.rhoL * s.volCm * 1e-6 * 9.8 * p / 100), { color: MC(), width: 2.1 });
      g.dot(s.frac * 100, s.T, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    cv.onResize(() => draw()); chart.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); chart.destroy(); }, rerender: () => draw() };
  }});

  /* 白努利原理 */
  PL.register("bernoulli", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const rho = 1000; let parts = [];
    const sV = PL.ui.slider(L.controls, { label: "入口の流れの速さ v₁", min: 1, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1 });
    const sN = PL.ui.slider(L.controls, { label: "細い管のしぼり具合", min: 1.5, max: 4, step: 0.1, value: 2.5, unit: "×", digits: 1 });
    const rV2 = PL.ui.readout(L.readouts, { label: "細い管の流れの速さ v₂", unit: "m/s" });
    const rDp = PL.ui.readout(L.readouts, { label: "圧力の差 P₁−P₂", unit: "Pa" });
    function shape(x, W) { const wide = 46, t = x / W; // 中段收縮
      const narrow = wide / sN.get();
      const c = 0.5, band = 0.16;
      let f = 1; if (t > c - band && t < c + band) { const u = (t - (c - band)) / (2 * band); f = 1 - (1 - narrow / wide) * Math.sin(Math.PI * u); }
      return wide * f;
    }
    // 抓窄管下緣上下拖：管子捏得越細，收縮比越大、流速越快、壓力計水柱越低（上緣接著壓力計，所以抓下緣）
    let midYg = 0;
    const grip = PL.ui.handle(cv, { slider: sN, label: "細い管の壁（上下に引いてしぼり具合を変える）", toValue: (x, y) => 46 / Math.max(1, y - midYg) });
    for (let i = 0; i < 70; i++) parts.push({ x: Math.random(), y: Math.random() * 2 - 1 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const midY = H * 0.5, x0 = 30, x1 = W - 30, PW = x1 - x0;
      const AP = PL.apparatus;
      /* 文氏管：透明玻璃管裡流著水，上面接三支壓力計玻璃管 */
      AP.benchTop(ctx, W, H, H - 24);
      [0.12, 0.88].forEach(t => { AP.steel(ctx, x0 + PW * t - 4, midY + 46, 8, H - 24 - midY - 46, 8); AP.steel(ctx, x0 + PW * t - 18, H - 30, 36, 7, -6); });
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); i ? ctx.lineTo(x, midY - h) : ctx.moveTo(x, midY - h); }
      for (let i = 100; i >= 0; i--) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); ctx.lineTo(x, midY + h); }
      ctx.closePath();
      const wg = ctx.createLinearGradient(0, midY - 46, 0, midY + 46);
      wg.addColorStop(0, "rgba(120,196,230,0.55)"); wg.addColorStop(0.5, "rgba(80,160,210,0.45)"); wg.addColorStop(1, "rgba(60,130,190,0.6)");
      ctx.fillStyle = wg; ctx.fill();
      ctx.strokeStyle = PL.theme.isLight() ? "rgba(70,110,140,0.85)" : "rgba(200,230,245,0.85)"; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.restore();
      PL.theme.note(ctx, "#4f93c4", x0, midY - 46, PW, 92);
      // 粒子
      const v1 = sV.get(), A1 = 46;
      parts.forEach(p => {
        const h = shape(p.x * PW, PW), v = v1 * A1 / h;
        D.disc(ctx, x0 + p.x * PW, midY + p.y * (h - 6), 2.2, { fill: "rgba(235,248,255,0.9)" });
      });
      // 壓力管（越窄壓力越低）
      const gauge = (t, label) => {
        const x = x0 + PW * t, h = shape(PW * t, PW), v = v1 * A1 / h; const P = 0.5 * rho * (v1 * v1 - v * v);
        const gh = Math.max(8, 50 - P / 40), tubeTop = Math.max(26, midY - 170);
        AP.glassTube(ctx, x, tubeTop, midY - h + 2, 12, midY - h - gh);
        D.text(ctx, label, x, tubeTop - 8, { color: PL.col("text-dim"), size: 10, align: "center", weight: "700" });
      };
      gauge(0.12, "P₁ 高い"); gauge(0.5, "P₂ 低い"); gauge(0.88, "P₃");
      const v2 = v1 * A1 / shape(PW * 0.5, PW);
      midYg = midY; grip.place(x0 + PW * 0.5, midY + shape(PW * 0.5, PW));
      rV2.set(v2, 2); rDp.set(0.5 * rho * (v2 * v2 - v1 * v1), 0);
    }
    const anim = PL.loop(dt => { if (dt) { const v1 = sV.get(); parts.forEach(p => { const PW = cv.W - 60; const h = shape(p.x * PW, PW); p.x += (v1 * 46 / h) * dt * 0.08; if (p.x > 1) { p.x = 0; p.y = Math.random() * 2 - 1; } }); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 理想氣體與分子動能論 */
  /* 理想氣體與分子動能論 —— 旗艦改版
   *
   * 課本說「壓力來自分子碰撞器壁」，但學生看到的通常只是 PV = nRT 這條公式。
   * 這一版讓壓力真的「被撞出來」：
   *
   *   · 畫面裡是真的在運動與碰撞的分子，壓力由實際撞擊器壁的動量變化統計而來，
   *     不是用公式算出來再顯示
   *   · 推動活塞改變體積，壓力跟著變，PV 乘積維持不變（等溫）
   *   · 升溫時分子明顯變快，速率分布往右移，並自己長成馬克士威分布
   *
   * 依 PhET 的原則，把活塞推到極端會有合理反應：體積被壓到很小時，
   * 壓力急遽上升並顯示警示。
   */
  PL.register("gas", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6, 840);

    const BOX_W = 1.0, BOX_H = 0.62;      // 容器的模型尺寸（無單位，僅作幾何用）
    let particles = [];
    let pistonX = 0.78;                    // 活塞位置（0～1，佔容器寬的比例）
    let impulseAcc = 0, sampleTime = 0, pressure = 0;
    let speedHist = new Array(28).fill(0);

    PL.ui.section(L.controls, "気体の状態");
    const sN = PL.ui.slider(L.controls, { label: "分子の数 N", min: 20, max: 240, step: 10, value: 90, unit: "個", digits: 0, onInput: rebuild });
    const sT = PL.ui.slider(L.controls, { label: "温度 T", min: 100, max: 900, step: 25, value: 300, unit: "K", digits: 0, onInput: retemp });
    /* 活塞位置原本只在 stepPhysics 裡讀取，暫停時推活塞畫面完全不動——
       而「把體積壓小」正是波以耳定律要學生親手做的那個動作。 */
    const sPiston = PL.ui.slider(L.controls, { label: "ピストンの位置（体積）", min: 0.25, max: 0.98, step: 0.01, value: 0.78, unit: "", digits: 2,
      onInput: v => { pistonX = v; } });

    PL.ui.section(L.controls, "表示");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["trails", "hist"],
      options: [
        { value: "trails", label: "衝突の光" },
        { value: "hist", label: "速さの分布" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "分子をまきなおす", rebuild, { primary: true });

    PL.ui.note(L.controls,
      "圧力の値は PV=nRT で計算したものではなく、分子が右側のピストンに実際にぶつかったときの運動量の変化を数えたものです。" +
      "温度を固定して、ピストンをゆっくり左へ押します。体積が小さくなると圧力は大きくなりますが、P×V はほとんど変わりません（ボイルの法則）。" +
      "次に温度を 100 K から 900 K まで上げて、分子が速くなり、速さの分布全体が右へ移る様子を見ます。");

    const rP = PL.ui.readout(L.readouts, { label: "圧力（測定値）", unit: "" });
    const rV = PL.ui.readout(L.readouts, { label: "体積 V", unit: "" });
    const rPV = PL.ui.readout(L.readouts, { label: "P × V", unit: "" });
    const rVrms = PL.ui.readout(L.readouts, { label: "二乗平均速度", unit: "" });
    const rKE = PL.ui.readout(L.readouts, { label: "平均の運動エネルギー", unit: "" });

    // 活塞左右推拉 → 體積；電熱板旋鈕上下拖 → 溫度
    let gOx = 0, gBw = 1;
    const gPiston = PL.ui.handle(cv, { slider: sPiston, label: "ピストン（左右に押したり引いたりして体積を変える）", toValue: x => (x - 7 - gOx) / gBw });
    const gHeat = PL.ui.handle(cv, relGrip(sT, 5, "ホットプレートのつまみ（上下に引いて温度を調節）"));

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "分子の速さの分布",
      cap: "棒は実際に数えた分子の速さ、曲線は理論上のマクスウェル分布です。温度が高いほど、分布全体が右へ移り、幅も広くなります。"
    });

    /* 由溫度決定的特徵速率；係數只是為了讓畫面上的速度好看 */
    const speedScale = () => Math.sqrt(sT.get() / 300) * 0.42;

    function rebuild() {
      const n = sN.get();
      particles = [];
      for (let i = 0; i < n; i += 1) {
        const sp = speedScale() * (0.5 + Math.random() * 1.1);
        const a = Math.random() * TAU;
        particles.push({
          x: Math.random() * pistonX * BOX_W * 0.94 + 0.02,
          y: Math.random() * BOX_H * 0.94 + 0.02,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          flash: 0
        });
      }
      impulseAcc = 0; sampleTime = 0; pressure = 0;
    }

    /* 改溫度時不重灑，而是等比例縮放速度——這樣看得出「同一群分子變快了」 */
    function retemp() {
      const target = speedScale();
      const current = Math.sqrt(particles.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy, 0) /
        Math.max(1, particles.length)) || 1e-6;
      const k = target * 1.15 / current;
      particles.forEach(p => { p.vx *= k; p.vy *= k; });
      impulseAcc = 0; sampleTime = 0;
    }
    rebuild();

    function stepPhysics(dt) {
      pistonX = sPiston.get();
      const right = pistonX * BOX_W;
      const sub = 2, h = dt / sub;
      for (let k = 0; k < sub; k += 1) {
        particles.forEach(p => {
          p.x += p.vx * h; p.y += p.vy * h;
          if (p.flash > 0) p.flash -= h * 4;

          if (p.x < 0) { p.x = -p.x; p.vx = -p.vx; }
          if (p.y < 0) { p.y = -p.y; p.vy = -p.vy; }
          if (p.y > BOX_H) { p.y = 2 * BOX_H - p.y; p.vy = -p.vy; }
          if (p.x > right) {
            p.x = 2 * right - p.x;
            p.vx = -p.vx;
            /*
             * 壓力就在這裡產生：每一次撞擊活塞，動量改變 2m|vx|。
             * 把一段時間內的總動量變化除以（時間 × 受力面積），就是壓力。
             * 這是「壓力來自碰撞」的字面實作，不是套公式。
             */
            impulseAcc += 2 * Math.abs(p.vx);
            p.flash = 1;
          }
        });
      }
      /*
       * 壓力要取平均，不能只看最近一次的取樣窗。
       * 200 顆分子在 0.25 秒內大約只撞到活塞 25 次，單一窗口的
       * 卜瓦松雜訊可以讓讀數在 12 到 100 之間亂跳，波以耳定律
       * 完全看不出來。實際的壓力計也是在做時間平均。
       */
      sampleTime += dt;
      if (sampleTime >= 0.5) {
        const instant = impulseAcc / (sampleTime * BOX_H);
        pressure = pressure > 0 ? pressure * 0.7 + instant * 0.3 : instant;
        impulseAcc = 0; sampleTime = 0;
      }
    }

    function stats() {
      const n = Math.max(1, particles.length);
      const sumSq = particles.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy, 0);
      const vrms = Math.sqrt(sumSq / n);
      return { vrms, ke: 0.5 * sumSq / n, volume: pistonX * BOX_H };
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const pad = 42;
      const boxW = W - pad * 2 - 90, boxH = H - pad * 2 - 26;
      const ox = pad, oy = pad;
      const px = xm => ox + xm / BOX_W * boxW;
      const py = ym => oy + ym / BOX_H * boxH;

      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, oy + boxH + 36, { bench: "wood" });
      // 汽缸架在支腳上，底下的電熱板溫度越高越紅
      [ox + 20, ox + boxW - 30].forEach(lx => AP.steel(ctx, lx, oy + boxH, 8, 36, 8));
      AP.hotPlate(ctx, ox + boxW * 0.45, oy + boxH + 36, 120, (sT.get() - 100) / 800);
      // 容器：厚壁玻璃汽缸，看得出來是一個「裝著氣體的東西」
      D.rect(ctx, ox, oy, boxW, boxH, { fill: PL.theme.shade(0.28), stroke: PL.theme.pale(0.35), width: 2 });
      ctx.save();
      const cg = ctx.createLinearGradient(0, oy, 0, oy + boxH);
      cg.addColorStop(0.00, "rgba(226,244,252,0.16)");
      cg.addColorStop(0.12, "rgba(255,255,255,0.07)");
      cg.addColorStop(1.00, "rgba(180,206,222,0.05)");
      ctx.fillStyle = cg; ctx.fillRect(ox, oy, boxW, boxH);
      ctx.strokeStyle = "rgba(206,232,244,0.55)"; ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, boxW, boxH);
      ctx.restore();

      // 活塞：金屬盤 + 推桿
      const pistonPx = px(pistonX * BOX_W);
      AP.steel(ctx, pistonPx, oy + 2, 15, boxH - 4, -10);
      ctx.strokeStyle = "rgba(28,34,44,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(pistonPx + 0.5, oy + 2.5, 14, boxH - 5);
      AP.steel(ctx, pistonPx + 15, oy + boxH / 2 - 5, W - pad - (pistonPx + 15), 10, 8);
      // 推桿末端的握把
      AP.brassDisc(ctx, W - pad, oy + boxH / 2, 8);
      D.text(ctx, "ピストン", pistonPx + 7, oy - 10, { color: PL.col("text-dim"), size: 10.5, align: "center" });
      gOx = ox; gBw = boxW; gPiston.place(pistonPx + 7, oy + boxH / 2);
      gHeat.place(ox + boxW * 0.45 + 36, oy + boxH + 25);

      // 分子
      particles.forEach(p => {
        const X = px(p.x), Y = py(p.y);
        if (layers.has("trails") && p.flash > 0) {
          ctx.save(); ctx.globalAlpha = p.flash * 0.6;
          D.disc(ctx, pistonPx, Y, 7, { fill: PL.col("warn") });
          ctx.restore();
        }
        D.disc(ctx, X, Y, 3, { fill: m });
      });

      // 溫度計式的側邊指示
      const s = stats();
      const barX = W - 62;
      D.text(ctx, sT.get() + " K", barX + 16, oy + 12, { color: PL.col("danger"), size: 12, align: "center", weight: "700" });
      const warm = Math.min(1, (sT.get() - 100) / 800);
      AP.thermometer(ctx, barX + 16, oy + 22, oy + boxH, 16, 0.08 + 0.9 * warm);

      // 壓力過高的警示：把活塞推到極端時該有的反應
      const volume = pistonX;
      if (volume < 0.32) {
        D.text(ctx, "体積が限界に近く、圧力が急に上がっている", W / 2, oy + boxH + 18,
          { color: PL.col("danger"), size: 12, align: "center", weight: "700" });
      }

      rP.set(pressure, 3);
      rV.set(s.volume, 3);
      rPV.set(pressure * s.volume, 3);
      rVrms.set(s.vrms, 3);
      rKE.set(s.ke, 4);

      PL.ui.caption(cv,
        "圧力の値は、分子が実際にピストンにぶつかるときの運動量の変化を数えて求めています。ピストンを左へ押すと衝突が増え、圧力が上がります。");
    }

    function chart() {
      cc.clear();
      // 統計速率直方圖
      speedHist.fill(0);
      const vmax = Math.max(0.3, speedScale() * 3.2);
      particles.forEach(p => {
        const sp = Math.hypot(p.vx, p.vy);
        const i = Math.floor(sp / vmax * speedHist.length);
        if (i >= 0 && i < speedHist.length) speedHist[i] += 1;
      });
      const maxN = Math.max(1, ...speedHist);
      const gph = PL.graph(cc, { x: 46, y: 14, w: cc.W - 60, h: cc.H - 36 },
        { x0: 0, x1: vmax, y0: 0, y1: 1.18 });
      gph.frame({ xlabel: "速さ", ylabel: "数（相対値）" });
      gph.grid(5, 4);
      speedHist.forEach((n, i) => {
        if (!n) return;
        const a = vmax * i / speedHist.length, b = vmax * (i + 1) / speedHist.length;
        const x0 = gph.X(a), x1 = gph.X(b), h = n / maxN;
        D.rect(cc.ctx, x0, gph.Y(h), Math.max(1, x1 - x0 - 1), gph.Y(0) - gph.Y(h),
          { fill: "rgba(150,190,230,0.38)" });
      });
      /* 二維的馬克士威分布：f(v) ∝ v·exp(−v²/2σ²) */
      const sigma = speedScale() * 0.82;
      const peak = sigma * Math.exp(-0.5);
      gph.fn(v => (v * Math.exp(-v * v / (2 * sigma * sigma))) / (peak || 1), { color: MC(), width: 2.2, samples: 200 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) stepPhysics(Math.min(dt, 0.05));
      drawAll();
    }, 50);

    cv.onResize(scene); cc.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cc.destroy(); },
      rerender: drawAll
    };
  }});

  /* 氣體定律（波以耳 / 查理） */
  PL.register("gas-laws", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sProc = PL.ui.select(L.controls, { label: "過程", value: "iso", options: [{ value: "iso", label: "等温（ボイル）" }, { value: "isobar", label: "定圧（シャルル）" }], onChange: () => draw() });
    const sDrive = PL.ui.slider(L.controls, { label: "調節", min: 0.4, max: 1.6, step: 0.02, value: 1, unit: "×", digits: 2, onInput: () => draw() });
    PL.ui.note(L.controls, "再生を押して、シリンダーの中の分子を見ます。等温ではピストンを直接つかんで押し下げると、分子の速さは変わりませんが、ピストンにぶつかる回数が増えて圧力が大きくなります。定圧ではホットプレートを引いて温度を上げると、分子が速くなり、ピストンが押し上げられて体積が大きくなります。");
    const rP = PL.ui.readout(L.readouts, { label: "圧力 P", unit: "kPa" });
    const rV = PL.ui.readout(L.readouts, { label: "体積 V", unit: "L" });
    const rT = PL.ui.readout(L.readouts, { label: "温度 T", unit: "K" });
    function state() {
      const d = sDrive.get();
      if (sProc.get() === "iso") { const V = 2 * d, T = 300, P = 300 * 2 / V; return { V, T, P }; }
      const T = 300 * d, V = 2 * d, P = 300; return { V, T, P };
    }
    /*
     * 汽缸裡的分子：位置用「佔氣柱寬、高的比例」存，活塞一動整群跟著壓扁或拉開。
     * 速率 ∝ √T（每顆分子有自己的速率倍數，模擬速率分布）；撞到四壁彈性反射。
     * 撞活塞的次數就是壓力的來源：
     *   等溫壓縮——速率不變、氣柱變矮，撞得更頻繁 → P ∝ 1/V
     *   等壓加熱——分子變快、但活塞被推高，撞擊頻率 × 每次的動量剛好不變 → P 固定
     * 讀數仍由 PV = 常數 × T 計算；分子只負責讓學生看見這件事為什麼成立。
     */
    const N = 36, mol = [];
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < N; i++) {
      const a = rnd() * TAU, f = 0.55 + rnd() * 0.9;
      mol.push({ x: rnd(), y: rnd(), vx: Math.cos(a) * f, vy: Math.sin(a) * f, flash: 0 });
    }
    const BASE = 95;                           // 300 K 時的典型速率（px/s，慢動作）
    const piston = PL.motion.follower(2, { omega: 6, zeta: 0.6 });
    let hits = 0, rate = 0, rateT = 0, flashes = [];
    const clock = PL.motion.clock(dt => draw(dt));
    let geo = null;
    // 等溫：抓活塞壓；等壓：活塞自由浮動，學生能動的是加熱板
    const gPiston = PL.ui.handle(cv, { slider: sDrive, label: "ピストン（上下に引いて体積を変える）",
      toValue: (x, y) => geo ? (geo.cylBot - (y + 6)) / geo.fullH * 3.2 / 2 : sDrive.get() });
    let heatStart = null;
    const gHeat = PL.ui.handle(cv, { slider: sDrive, label: "ホットプレート（上下に引いて温度を調節）",
      toValue: (x, y) => { if (!heatStart) heatStart = { y, v: sDrive.get() }; return heatStart.v + (heatStart.y - y) / 140 * 1.2; },
      onRelease: () => { heatStart = null; } });
    function draw(dt) {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const s = state();
      // 汽缸
      const AP = PL.apparatus;
      const cylX = 40, cylW = 80, cylTop = 70, cylBot = H - 56, fullH = cylBot - cylTop;
      // 活塞追上新體積：有質量的活塞被推動，會稍微晃一下才停（暫停時直接到位）
      const Vs = piston.update(s.V, dt, clock.running);
      const gasH = fullH * PL.clamp(Vs / 3.2, 0.1, 1);
      AP.benchTop(ctx, W, H, H - 30);
      /* 等溫：壓力靠活塞上的砝碼決定（砝碼越多壓力越大）；等壓：砝碼不變、底下加熱 */
      const iso = sProc.get() === "iso";
      AP.hotPlate(ctx, cylX + cylW / 2, H - 30, cylW + 30, iso ? 0 : (s.T - 120) / 360);
      const hue = PL.clamp((s.T - 120) / 360, 0, 1);
      const pistonY = cylBot - gasH;
      AP.cylinderPiston(ctx, cylX, cylTop, cylW, fullH, pistonY, {
        gas: "rgb(" + Math.round(120 + 110 * hue) + "," + Math.round(150 - 60 * hue) + "," + Math.round(220 - 150 * hue) + ")",
        weights: Math.max(1, Math.round(s.P / 110)), rod: 16
      });
      // 分子運動：px/s 換成「每秒走過幾個氣柱寬／高」，氣柱變矮時同樣速率撞頂更頻繁
      const gw = cylW - 10, gh = Math.max(6, gasH - 6), k = Math.sqrt(s.T / 300);
      if (dt > 0) {
        mol.forEach(m => {
          m.x += m.vx * BASE * k * dt / gw; m.y += m.vy * BASE * k * dt / gh;
          if (m.x < 0) { m.x = -m.x; m.vx = Math.abs(m.vx); }
          if (m.x > 1) { m.x = 2 - m.x; m.vx = -Math.abs(m.vx); }
          if (m.y > 1) { m.y = 2 - m.y; m.vy = -Math.abs(m.vy); }
          if (m.y < 0) { m.y = -m.y; m.vy = Math.abs(m.vy); hits++; m.flash = 1; flashes.push({ x: m.x, a: 1 }); }
          m.x = PL.clamp(m.x, 0, 1); m.y = PL.clamp(m.y, 0, 1);
          if (m.flash > 0) m.flash -= dt * 5;
        });
        flashes.forEach(f => { f.a -= dt * 4; }); flashes = flashes.filter(f => f.a > 0);
        // 撞擊頻率：每 0.5 秒結算一次，再做指數平滑，數字才讀得出來
        rateT += dt;
        if (rateT >= 0.5) { rate = rate ? rate * 0.6 + (hits / rateT) * 0.4 : hits / rateT; hits = 0; rateT = 0; }
      }
      const Lt = PL.theme.isLight(), dotC = Lt ? "rgba(26,40,90,0.85)" : "rgba(236,242,255,0.92)";
      const gx0 = cylX + 5, gy0 = pistonY + 3;
      ctx.save();
      mol.forEach(m => {
        const px = gx0 + m.x * gw, py = gy0 + m.y * gh;
        ctx.fillStyle = m.flash > 0 ? (Lt ? "#d0453a" : "#ffd36b") : dotC;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill();
      });
      // 撞到活塞底面的位置亮一下：每一下都是一次推力
      ctx.strokeStyle = Lt ? "#d0453a" : "#ffd36b"; ctx.lineWidth = 2;
      flashes.forEach(f => { ctx.globalAlpha = Math.max(0, f.a); const x = gx0 + f.x * gw; ctx.beginPath(); ctx.moveTo(x - 5, pistonY + 1); ctx.lineTo(x + 5, pistonY + 1); ctx.stroke(); });
      ctx.restore();
      D.text(ctx, iso ? "等温 300 K" : PL.fmt(s.T, 0) + " K", cylX + cylW / 2, 18, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      // 撞擊頻率寫在 P–V 圖右上角（那一角兩種過程的曲線都不會經過；畫布左下角留給把手提示）
      if (clock.running && rate > 0) D.text(ctx, "分子がピストンにぶつかる回数 " + PL.fmt(rate, 0) + " 回/秒（スロー）", W - 30, 62, { color: PL.col("text-dim"), size: 10.5, align: "right", weight: "700" });
      else if (!clock.running && clock.t === 0) D.text(ctx, "再生を押して、シリンダーの中の分子を見る", W - 30, 62, { color: PL.col("text-dim"), size: 10.5, align: "right" });
      geo = { cylBot, fullH };
      if (iso) { gHeat.hide(); gPiston.place(cylX + cylW / 2, pistonY - 6); }
      else { gPiston.hide(); gHeat.place(cylX + cylW / 2 + 34, H - 40); }
      // P–V 圖
      const bx = cylX + cylW + 40, by = 40, bw = W - bx - 20, bh = H - 70;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 3.4, y0: 0, y1: 700 });
      g.frame({ title: "P – V グラフ", xlabel: "V (L)", ylabel: "P (kPa)" }); g.grid(4, 4);
      if (sProc.get() === "iso") g.fn(V => 300 * 2 / V, { color: MC(), width: 2.2, samples: 120 });
      else g.curve([[0.8, 300], [3.2, 300]], { color: MC(), width: 2.2 });
      g.dot(s.V, s.P, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rP.set(s.P, 0); rV.set(s.V, 2); rT.set(s.T, 0);
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* 熱平衡與比熱 */
  PL.register("heat", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let T1, T2, running = false, tRun = 0;
    const s1 = PL.ui.slider(L.controls, { label: "物体 1 の温度", min: 0, max: 100, step: 1, value: 80, unit: "°C", digits: 0, onInput: reset });
    const sm1 = PL.ui.slider(L.controls, { label: "物体 1 の質量", min: 0.5, max: 4, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const s2 = PL.ui.slider(L.controls, { label: "物体 2 の温度", min: 0, max: 100, step: 1, value: 20, unit: "°C", digits: 0, onInput: reset });
    const sm2 = PL.ui.slider(L.controls, { label: "物体 2 の質量", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "ふれさせる", () => { running = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "リセット", reset);
    const rTf = PL.ui.readout(L.readouts, { label: "熱平衡の温度", unit: "°C" });
    const rT1 = PL.ui.readout(L.readouts, { label: "物体 1", unit: "°C" });
    const rT2 = PL.ui.readout(L.readouts, { label: "物体 2", unit: "°C" });
    function reset() { T1 = s1.get(); T2 = s2.get(); running = false; tRun = 0; }
    reset();
    // 接觸前把兩支溫度計的液柱拉到想要的初溫（溫度計 0–100 °C 對應整支液柱）
    let th1 = null, th2 = null;
    const thermoT = (g, y) => g ? 100 * (1 - (y - g.top) / (g.bot - g.top)) : 0;
    const g1 = PL.ui.handle(cv, { slider: s1, label: "物体 1 の温度計（上下に引いてはじめの温度を決める）", toValue: (x, y) => thermoT(th1, y) });
    const g2 = PL.ui.handle(cv, { slider: s2, label: "物体 2 の温度計（上下に引いてはじめの温度を決める）", toValue: (x, y) => thermoT(th2, y) });
    const tcol = T => { const t = PL.clamp(T / 100, 0, 1); return `rgb(${Math.round(60 + 195 * t)},${Math.round(120 - 60 * t)},${Math.round(220 - 200 * t)})`; };
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = sm1.get(), m2 = sm2.get(), Tf = (m1 * T1 + m2 * T2) / (m1 + m2);
      const AP = PL.apparatus;
      /* 左半：兩杯水靠在一起（中間夾一片銅板），溫度計插在水裡；右半：溫度–時間曲線 */
      const benchY = Math.round(H * 0.8), sceneW = W * 0.5, bh = Math.min(120, benchY * 0.42);
      AP.labRoom(ctx, W, H, benchY, {});
      const w1 = 56 + m1 * 13, w2 = 56 + m2 * 13, cx = sceneW * 0.54;
      const b1 = cx - 5 - w1 / 2, b2 = cx + 5 + w2 / 2, wt = benchY - bh * 0.84;
      ctx.fillStyle = tcol(T1); ctx.fillRect(b1 - w1 / 2 + 3, wt, w1 - 6, benchY - wt - 3);
      ctx.fillStyle = tcol(T2); ctx.fillRect(b2 - w2 / 2 + 3, wt, w2 - 6, benchY - wt - 3);
      AP.beaker(ctx, b1, benchY, w1, bh, 0.84);
      AP.beaker(ctx, b2, benchY, w2, bh, 0.84);
      AP.steel(ctx, cx - 4, benchY - bh * 0.9, 8, bh * 0.9 - 2, 30);           // 夾在兩杯之間的銅板
      ctx.fillStyle = "rgba(210,130,60,0.55)"; ctx.fillRect(cx - 4, benchY - bh * 0.9, 8, bh * 0.9 - 2);
      // 溫度計插在水裡
      AP.thermometer(ctx, b1 - w1 * 0.22, benchY - bh - 58, benchY - 16, 11, PL.clamp(T1, 0, 100) / 100);
      AP.thermometer(ctx, b2 + w2 * 0.22, benchY - bh - 58, benchY - 16, 11, PL.clamp(T2, 0, 100) / 100);
      // 液柱頂端位置：與 apparatus.thermometer 的算法一致（球泡半徑 0.85w）
      const tTop = benchY - bh - 58, tBot = benchY - 16 - 11 * 0.85 * 1.4, colY = T => tBot - (tBot - tTop) * PL.clamp(T, 0, 100) / 100;
      th1 = th2 = { top: tTop, bot: tBot };
      if (running || tRun > 0) { g1.hide(); g2.hide(); }
      else { g1.place(b1 - w1 * 0.22, colY(T1)); g2.place(b2 + w2 * 0.22, colY(T2)); }
      D.text(ctx, PL.fmt(T1, 0) + "°C", b1 + w1 * 0.08, benchY - bh * 0.4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(T2, 0) + "°C", b2 - w2 * 0.08, benchY - bh * 0.4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, "物体 1 " + m1 + " kg", b1, benchY + 16, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      D.text(ctx, "物体 2 " + m2 + " kg", b2, benchY + 16, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      // 接觸後熱量經銅板由高溫流向低溫（箭頭越粗，溫差越大）
      const dT = T1 - T2;
      if (running && Math.abs(dT) > 0.4) {
        const dir = dT > 0 ? 1 : -1, k = PL.clamp(Math.abs(dT) / 60, 0.2, 1);
        [0.35, 0.6].forEach(f => D.arrow(ctx, cx - dir * 18, benchY - bh * f, cx + dir * 18, benchY - bh * f, { color: PL.col("danger"), width: 1.5 + 2.5 * k, head: 7 }));
        D.text(ctx, "熱", cx, benchY - bh * 0.72, { color: PL.col("danger"), size: 11, align: "center", weight: "800" });
      }
      D.text(ctx, "熱は高温から低温へ移る", sceneW * 0.54, 24, { color: PL.col("text-dim"), size: 11, align: "center" });
      // 右半：溫度–時間（兩條線往終溫靠攏）
      const T10 = s1.get(), T20 = s2.get(), Tf0 = (m1 * T10 + m2 * T20) / (m1 + m2);
      const gx = W * 0.54, gy = 26, gw = W - gx - 18, gh = benchY - 44;
      const g = PL.graph(cv, { x: gx, y: gy, w: gw, h: gh }, { x0: 0, x1: 4, y0: 0, y1: 100 });
      g.frame({ title: "温度－時間", xlabel: "t（イメージ）", ylabel: "T (°C)" }); g.grid(4, 5);
      g.hline(Tf0, { color: PL.col("warn"), dash: [6, 5], width: 1.4 });
      g.label(0.08, Tf0, "最後の温度 " + PL.fmt(Tf0, 1) + " °C", { color: PL.col("warn"), size: 10.5, dy: -6 });
      g.fn(t => Tf0 + (T10 - Tf0) * Math.exp(-1.5 * t), { color: "#e5484d", width: 2.2 });
      g.fn(t => Tf0 + (T20 - Tf0) * Math.exp(-1.5 * t), { color: "#3b82f6", width: 2.2 });
      if (tRun > 0) { const tt = Math.min(tRun, 4); g.vline(tt, { color: PL.col("text-faint"), dash: [3, 3], width: 1 }); g.dot(tt, T1, { color: "#e5484d" }); g.dot(tt, T2, { color: "#3b82f6" }); }
      PL.ui.caption(cv, "最後の温度の点線はまん中には来ず、質量の大きいほうに寄ります。" +
        "2 つの質量を同じにすると、点線はちょうど 2 つの温度のまん中に来ます。");
      rTf.set(Tf, 1); rT1.set(T1, 1); rT2.set(T2, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && running) { tRun += dt; const Tf = (sm1.get() * T1 + sm2.get() * T2) / (sm1.get() + sm2.get()); const r = 1 - Math.exp(-dt * 1.5); T1 += (Tf - T1) * r; T2 += (Tf - T2) * r; if (Math.abs(T1 - T2) < 0.1 || tRun > 4) running = false; }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 熱力學第一定律 */
  PL.register("thermo1", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const sQ = PL.ui.slider(L.controls, { label: "吸収した熱量 Q", min: -50, max: 100, step: 5, value: 60, unit: "J", digits: 0, onInput: draw });
    const sW = PL.ui.slider(L.controls, { label: "外にした仕事 W", min: -50, max: 100, step: 5, value: 40, unit: "J", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "ΔU = Q − W。等温では ΔU=0、定積では W=0（ΔU=Q）、断熱では Q=0（ΔU=−W）。");
    const rU = PL.ui.readout(L.readouts, { label: "内部エネルギーの変化 ΔU", unit: "J" });
    const rTrend = PL.ui.readout(L.readouts, { label: "温度の変化" });
    let tt = 0, pg = null;
    // 活塞高度直接對應作功 W（氣柱 = 0.45 缸高 + 0.5 px/J）；電熱板旋鈕上下拖改吸放熱 Q
    const gW = PL.ui.handle(cv, { slider: sW, label: "ピストン（上下に引く：外にする仕事 W）", toValue: (x, y) => (pg.bot - y - pg.h0) / 0.5 });
    const gQ = PL.ui.handle(cv, relGrip(sQ, 0.8, "ホットプレートのつまみ（上下に引く：熱の出入り Q）"));
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Q = sQ.get(), Wk = sW.get(), dU = Q - Wk, T = 300 + dU * 1.2;
      /* 汽缸：活塞上壓著砝碼，氣體分子的跑動快慢跟著溫度（內能）走 */
      const AP = PL.apparatus;
      const benchY = H - 30, cylX = 50, cylW = 116, cylH = Math.min(230, H - 110), cylBot = benchY - 26, gasH = cylH * 0.45 + Wk * 0.5;
      AP.labRoom(ctx, W, H, benchY, {});
      // 吸熱時底下的電熱板發紅；放熱時換成一盆冰
      if (Q >= 0) AP.hotPlate(ctx, cylX + cylW / 2, benchY, cylW + 30, Q / 100);
      else {
        ctx.fillStyle = "rgba(170,215,240,0.9)"; ctx.fillRect(cylX - 12, benchY - 22, cylW + 24, 22);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = "rgba(235,248,255,0.95)"; ctx.fillRect(cylX - 8 + i * 17, benchY - 26 + (i % 2) * 3, 13, 10); }
      }
      const hue = PL.clamp(0.5 + dU / 200, 0, 1);
      AP.cylinderPiston(ctx, cylX, cylBot - cylH, cylW, cylH, cylBot - gasH, {
        gas: "#" + [Math.round(120 + 110 * hue), Math.round(150 - 60 * hue), Math.round(220 - 150 * hue)].map(v => v.toString(16).padStart(2, "0")).join(""),
        rod: 18, weights: 2, particles: 34, t: tt * Math.sqrt(T / 300) * 1.6
      });
      pg = { bot: cylBot, h0: cylH * 0.45 };
      gW.place(cylX + cylW / 2, cylBot - gasH - 6);
      gQ.place(cylX + cylW / 2 + (cylW + 30) * 0.3, benchY - 13);
      // 溫度計貼在汽缸旁：溫度 ∝ 內能
      AP.thermometer(ctx, cylX + cylW + 22, cylBot - cylH + 10, cylBot - 4, 12, PL.clamp((T - 150) / 300, 0, 1));
      D.text(ctx, PL.fmt(T, 0) + " K", cylX + cylW + 22, cylBot - cylH, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      if (Q !== 0) D.arrow(ctx, cylX + cylW / 2 - 30, benchY + 2, cylX + cylW / 2 - 30, cylBot - 30, { color: PL.col("danger"), width: 2.2, label: Q > 0 ? "Q 入" : "Q 出" });
      if (Wk !== 0) {
        const py = cylBot - gasH - 12 - 18 - 22, up = Wk > 0;
        D.arrow(ctx, cylX + 16, py + (up ? 0 : -36), cylX + 16, py + (up ? -36 : 0), { color: PL.col("accent-2"), width: 2.2, label: up ? "W（外へ）" : "W（外から気体へ）" });
      }
      // 能量條
      const bx = cylX + cylW + 80, bw = W - bx - 24; let y = 46;
      AP.infoCard(ctx, bx - 12, 8, bw + 30, 150);
      const bar = (lab, val, c) => { D.text(ctx, lab, bx, y - 4, { color: PL.col("text-dim"), size: 12 }); D.rect(ctx, bx + 40, y - 14, bw - 40, 16, { fill: "rgba(255,255,255,0.05)", r: 4 }); const mid = (bw - 40) / 2; D.rect(ctx, bx + 40 + mid, y - 14, mid * PL.clamp(val / 100, -1, 1), 16, { fill: c, r: 2 }); D.text(ctx, PL.fmt(val, 0) + " J", bx + bw + 4, y, { color: c, size: 11, align: "right" }); y += 40; };
      D.text(ctx, "ΔU = Q − W", bx, 24, { color: PL.col("text-dim"), size: 12 });
      bar("Q", Q, PL.col("danger")); bar("W", Wk, PL.col("accent-2")); bar("ΔU", dU, MC());
      D.text(ctx, dU > 0 ? "内部エネルギーが増える → 温度が上がり、分子が速く動く" : dU < 0 ? "内部エネルギーが減る → 温度が下がり、分子がゆっくり動く" : "内部エネルギーが変わらない → 温度も変わらない", bx, 186, { color: PL.col("text-dim"), size: 11 });
      const kind = Wk === 0 ? "定積変化：W = 0。吸収した熱がすべて内部エネルギーになる" : Q === 0 ? "断熱変化：Q = 0。外にする仕事はすべて内部エネルギーから出る" : dU === 0 ? "等温変化：ΔU = 0。吸収した熱をすべて仕事に使う" : "";
      if (kind) AP.valueChip(ctx, bx, 200, kind, PL.col("warn"));
      rU.set(dU, 0); rTrend.set(dU > 0 ? "温度が上がる" : dU < 0 ? "温度が下がる" : "変わらない");
    }
    const anim = PL.loop(dt => { if (dt) tt += dt; draw(); });
    cv.onResize(draw); draw(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /*
   * 熱機原理：試管噴塞（國中經典演示，教學模型對齊公開國中實驗設計）
   *
   * 不是卡諾效率，而是「受熱氣體膨脹做功 → 內能變機械能」：
   *   酒精燈加熱 → 水汽化、管內壓力升高 → 壓力剛好克服塞子阻力 → 塞子射出
   *   → 氣體對外做功、內能下降 → 管口白霧（水蒸氣遇冷液化，不是蒸氣本身）
   * 台灣 108：國中自然「物質與能量／能源」內能與熱機簡介；
   * 高中必修能量守恆定性 → 選修熱力學 → 本站 heat-engine（效率與卡諾）。
   */
  PL.register("heat-engine-principle", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72, 920);
    const AP = PL.apparatus;

    /* 0待加熱 1加熱 2壓力升高 3膨脹做功 4白霧消散 —— 一次性，不自動循環 */
    let stage = 0, U = 0, corkX = 0, corkV = 0, fog = 0, bubble = 0, elapsed = 0, heatIn = 0;

    function reset() {
      stage = 0; U = 0; corkX = 0; corkV = 0; fog = 0; bubble = 0; elapsed = 0; heatIn = 0;
      draw();
    }

    PL.ui.section(L.controls, "演示の条件");
    const sHeat = PL.ui.slider(L.controls, {
      label: "アルコールランプの加熱の強さ", min: 0, max: 100, step: 5, value: 70, unit: "%", digits: 0, onInput: () => draw(), onReset: reset
    });
    const sWater = PL.ui.slider(L.controls, {
      label: "試験管の中の水の量", min: 5, max: 40, step: 1, value: 15, unit: "mL", digits: 0, onInput: () => draw(), onReset: reset
    });
    const sFriction = PL.ui.slider(L.controls, {
      label: "栓のきつさ（おさえる力）", min: 20, max: 90, step: 5, value: 45, unit: "", digits: 0, onInput: () => draw(), onReset: reset
    });

    PL.ui.presets(L.controls, {
      label: "演示の場面",
      options: [
        { label: "教科書どおり", hint: "中火、水は少し、栓のきつさはふつう",
          apply: () => { sHeat.set(70); sWater.set(15); sFriction.set(45); reset(); } },
        { label: "弱火でゆっくり", hint: "熱し方がゆっくりなので、圧力が上がって飛ぶまで長くかかる",
          apply: () => { sHeat.set(30); sWater.set(20); sFriction.set(45); reset(); } },
        { label: "強火ですぐ飛ぶ", hint: "火が強いので、すぐに栓をおさえる力をこえる",
          apply: () => { sHeat.set(95); sWater.set(12); sFriction.set(35); reset(); } },
        { label: "栓がとてもきつい", hint: "おさえる力が大きい：長くためてから、勢いよく飛ぶ",
          apply: () => { sHeat.set(75); sWater.set(18); sFriction.set(80); reset(); } }
      ]
    });

    PL.ui.note(L.controls,
      "再生したら順に見ていきます：炎と泡 → 圧力のバーが上がる → 栓が飛ぶ → 管の口の白いけむり。" +
      "白いけむりは水蒸気ではなく、液体になった小さな水滴です。これは 1 回きりの演示で、ひとりでにくり返しはしません。");

    const rStage = PL.ui.readout(L.readouts, { label: "いまの段階" });
    const rU = PL.ui.readout(L.readouts, { label: "管の中の気体の内部エネルギー（相対値）" });
    const rP = PL.ui.readout(L.readouts, { label: "圧力のたまり具合" });
    const rWork = PL.ui.readout(L.readouts, { label: "栓の力学的エネルギー" });
    const rFog = PL.ui.readout(L.readouts, { label: "白いけむりの濃さ" });
    PL.ui.button(PL.ui.buttonRow(L.controls), "リセット", reset);

    PL.ui.causality(L.canvasWrap.parentNode, {
      title: "熱機関のしくみ：エネルギーの流れ",
      rows: [
        { name: "炎 → 内部エネルギー", tone: "a", note: "化学エネルギーがまず熱になり、熱が伝わって水と管の中の気体の内部エネルギーが上がる。これは熱の吸収で、仕事ではない。" },
        { name: "内部エネルギー → 力学的エネルギー", tone: "b", note: "圧力が栓をおさえる力にちょうど勝ったとき、気体が膨張して栓を押す：外に仕事をして、気体の内部エネルギーは下がる。" },
        { name: "白いけむり ≠ 水蒸気", tone: "c", note: "水蒸気は見えない。白いけむりは、仕事をして温度が下がり、水蒸気が冷えて液体になった小さな水滴。" },
        { name: "続けて動く熱機関ではない", tone: "d", note: "1 回飛んだら終わり。本物の熱機関には、サイクル、排熱、熱を加え続けることが必要で、これは仕事をするしくみの演示にすぎない。" }
      ]
    });

    PL.ui.procedure(L.controls, {
      title: "観察の手順（先に予想してから見る）",
      steps: [
        "まず<strong>炎と水の量</strong>を見て予想する：強く熱し、栓がきついほど、飛ぶのは早くなるか、遅くなるか？",
        "<strong>圧力のバー</strong>を見る：栓をおさえる力の線をこえるまでたまってから飛ぶ。一瞬でいっぱいになるのではない。",
        "栓が<strong>飛んだのと同じ瞬間</strong>に管の口に白いけむりが出る。内部エネルギーが力学的エネルギーに変わっているしるし。",
        "白いけむりは数秒で消える：水滴が広がったり蒸発したりするためで、「水蒸気が水にもどる」の一言ではすまない。",
        "リセットを押して別のパラメータにし、圧力の上がる速さと飛ぶタイミングを比べる。"
      ],
      rule: "よくある誤解：① 白いけむりを水蒸気だと思う、② 内部エネルギーがすべて栓の運動エネルギーになると思う。" +
        "管の壁が熱を吸うこと、熱が逃げること、音が出ることでもエネルギーは使われるので、変換効率は必ず 100% より小さい。"
    });

    const verdict = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", tone: "a" });
    const derived = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "入れた熱（化学エネルギー→内部エネルギー）", unit: "", hint: "∝ 加熱の強さ × 時間" },
      { label: "飛ぶ前の圧力のたまり具合", unit: "%", hint: "U と、栓をおさえる力の境目の比" },
      { label: "飛んだあとに残る内部エネルギー", unit: "", hint: "仕事をして下がるが、0 にはならない" }
    ]);

    const thr = () => sFriction.get();
    // 學生動手的兩件事：調酒精燈火焰（上下拖）、把塞子塞緊（往下壓）；塞子噴出後就不能再抓
    const gLamp = PL.ui.handle(cv, relGrip(sHeat, 0.8, "アルコールランプの炎（上下に引いて加熱の強さを調節）"));
    const gCork = PL.ui.handle(cv, relGrip(sFriction, -0.6, "栓（下に押してきつくする）"));
    const stageName = s => ["加熱前", "加熱中：泡", "圧力が上がる", "膨張して仕事をする：栓が飛ぶ", "白いけむりが消える"][s] || "—";

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const heat = sHeat.get(), water = sWater.get(), th = thr();
      const pRatio = PL.clamp(U / Math.max(th, 1), 0, 1.2);

      /* 左：實驗台 */
      const baseY = H - 46;
      const tubeW = 58, tubeH = Math.min(240, H * 0.54);
      const tubeX = W * 0.20, tubeBot = baseY - 70, tubeTop = tubeBot - tubeH;
      if (AP && AP.benchTop) AP.benchTop(ctx, W, H, baseY + 6);

      // 鐵架與試管夾
      AP.standRod(ctx, tubeX - 70, baseY + 6, tubeTop + 10);
      AP.clampHead(ctx, tubeX - 70, tubeTop + 50, 40, 0);

      ctx.save();
      ctx.translate(tubeX, tubeBot);
      ctx.rotate(-0.1);
      const waterH = tubeH * (0.16 + water / 40 * 0.40);
      AP.testTube(ctx, tubeW, tubeH, waterH, {});
      if (stage === 1 || stage === 2) {
        const n = Math.round(3 + heat / 18);
        for (let i = 0; i < n; i++) {
          const ph = (bubble + i * 0.37) % 1;
          D.disc(ctx, (i % 2 ? 1 : -1) * (3 + (i * 7) % 12), -waterH + ph * waterH * 0.85,
            2 + (i % 3), { fill: "rgba(230,240,255,0.8)" });
        }
      }
      // 壓力色帶（幾何隨 U 變化）
      const pressH = Math.max(3, (tubeH - waterH - 24) * pRatio * 0.4);
      D.rect(ctx, -tubeW / 2 + 7, -tubeH + 10, tubeW - 14, pressH,
        { fill: "rgba(229,115,115," + (0.12 + pRatio * 0.5) + ")" });

      const corkW = 20 + sFriction.get() * 0.12, corkH = 24;
      let cx0 = 0, cy0 = -tubeH - 2;
      if (stage >= 3) { cx0 = corkX; cy0 = -tubeH - 2 - corkX * 0.4; }
      else if (stage === 2) cx0 = Math.sin(elapsed * 26) * 1.6;
      ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(stage >= 3 ? corkX * 0.02 : 0);
      AP.cork(ctx, corkW, corkH);
      ctx.restore();

      if (fog > 0.02) {
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * TAU + elapsed * 0.8;
          const rr = 12 + (i % 5) * 7 + fog * 30;
          D.disc(ctx, Math.cos(ang) * rr * 0.75, -tubeH - 30 + Math.sin(ang) * rr * 0.4,
            3 + (i % 3), { fill: "rgba(245,248,252," + (0.12 + fog * 0.5) + ")" });
        }
        D.text(ctx, "白いけむり＝液体になった小さな水滴（水蒸気ではない）", tubeW / 2, -tubeH - 78,
          { color: PL.col("text-dim"), size: 10, align: "center" });
      }
      ctx.restore();

      const lampX = tubeX + 14, lampY = baseY - 16;
      gLamp.place(lampX, lampY - 22);
      if (stage >= 3) gCork.hide(); else gCork.place(tubeX - 0.0998 * (tubeH + 14), tubeBot - 0.995 * (tubeH + 14));
      // 酒精燈：火焰大小跟著加熱功率
      AP.alcoholLamp(ctx, lampX, baseY + 6, 1.15, heat > 5 && stage < 3 ? heat / 100 : 0);
      D.text(ctx, "アルコールランプ", lampX, baseY + 24, { color: PL.col("text-faint"), size: 10, align: "center" });
      D.text(ctx, "熱機関のしくみ · 試験管の栓が飛ぶ", 18, 22, { color: PL.col("text-dim"), size: 12, weight: "700" });

      /* 右：壓力門檻、能量鏈、階段說明 */
      const px = W * 0.46, pw = W * 0.5;
      D.text(ctx, "圧力のたまり具合と栓をおさえる力", px, 34, { color: PL.col("text-dim"), size: 12, weight: "700" });
      const barY = 48, barH = 24, barW = pw - 16;
      D.rect(ctx, px, barY, barW, barH, { fill: PL.theme.shade(0.45), stroke: PL.theme.pale(0.22), width: 1, r: 5 });
      D.rect(ctx, px + 1, barY + 1, Math.max(2, (barW - 2) * PL.clamp(pRatio / 1.25, 0, 1)), barH - 2,
        { fill: stage >= 3 ? PL.col("accent-2") : PL.col("danger"), r: 4 });
      const thrX = px + barW * (th / (th * 1.25));
      D.line(ctx, thrX, barY - 8, thrX, barY + barH + 8, PL.col("warn"), 2.2);
      D.text(ctx, "おさえる力の境目", thrX, barY + barH + 20, { color: PL.col("warn"), size: 10, align: "center" });

      const chainY = 110, bw = (pw - 36) / 3, bh = 54;
      const chainBox = (i, title, sub, color, on) => {
        const x = px + i * (bw + 12);
        D.rect(ctx, x, chainY, bw, bh, {
          fill: on ? color : PL.theme.shade(0.4),
          stroke: on ? color : PL.theme.pale(0.22), width: 1.5, r: 8
        });
        const ink = on ? "#141414" : PL.col("text-dim");
        D.text(ctx, title, x + bw / 2, chainY + 20, { color: ink, size: 12, align: "center", weight: "700" });
        D.text(ctx, sub, x + bw / 2, chainY + 40, { color: on ? "#222" : PL.col("text-faint"), size: 9.5, align: "center" });
        if (i < 2) D.text(ctx, "→", x + bw + 6, chainY + bh / 2 + 4, { color: PL.col("text-dim"), size: 14, align: "center" });
      };
      chainBox(0, "化学エネルギー", "アルコールランプ", "#e8c39e", heat > 5 && stage <= 2);
      chainBox(1, "内部エネルギー", "管の中の気体の圧力が上がる", "#e57373", stage >= 1);
      chainBox(2, "力学的エネルギー", "栓が運動エネルギーを得る", "#64b5f6", stage >= 3);

      D.text(ctx, "108 課綱との対応", px, chainY + bh + 36, { color: PL.col("text-faint"), size: 10, weight: "700" });
      D.text(ctx, "中学理科 · 物質とエネルギー／エネルギー資源：内部エネルギー、熱の移動、熱機関の紹介", px, chainY + bh + 54,
        { color: PL.col("text-dim"), size: 10 });
      D.text(ctx, "高校の必修でエネルギー保存（定性的）→ 選択で熱力学 → このサイトの heat-engine の効率の実験", px, chainY + bh + 70,
        { color: PL.col("text-dim"), size: 10 });

      const noteY = chainY + bh + 92;
      D.rect(ctx, px, noteY, pw - 16, 78, { fill: PL.theme.shade(0.25), stroke: PL.theme.pale(0.16), width: 1, r: 8 });
      D.text(ctx, stageName(stage), px + 12, noteY + 22, { color: MC(), size: 13, weight: "700" });
      const tip = stage <= 1 ? "熱が伝わって内部エネルギーが増える。泡は水が沸騰に近づき、水蒸気が増えているしるし。"
        : stage === 2 ? "圧力が栓をおさえる力に近づく：栓が細かくふるえはじめ、もうすぐ飛ぶ。"
        : stage === 3 ? "気体が膨張して栓に仕事をする：内部エネルギー ↓、栓の力学的エネルギー ↑。管の口に白いけむりが出る。"
        : "白いけむりが消えて、演示は終わり。もう一度見るにはリセットを押す。これはくり返し動く熱機関ではない。";
      D.text(ctx, tip, px + 12, noteY + 46, { color: PL.col("text-dim"), size: 10.5 });
      D.text(ctx, "108 課綱：中学の内部エネルギー／熱機関 → 高校の熱力学へのつながり", px + 12, noteY + 66,
        { color: PL.col("text-faint"), size: 9.5 });

      rStage.set(stageName(stage));
      rU.set(U, 1);
      rP.set((pRatio * 100).toFixed(0) + "% 境目 " + th);
      rWork.set(stage >= 3 ? (0.5 * corkV * corkV).toFixed(2) : "0");
      rFog.set(fog > 0.02 ? (fog * 100).toFixed(0) + "%" : "—");
      if (verdict && verdict.set) {
        verdict.set(stageName(stage), stage >= 3 ? "b" : stage >= 1 ? "a" : "c");
      }
      if (derived && derived.set) {
        derived.set(0, heatIn.toFixed(1));
        derived.set(1, (PL.clamp(pRatio, 0, 1) * 100).toFixed(0));
        derived.set(2, stage >= 3 ? U.toFixed(1) : "—");
      }
    }

    const anim = PL.loop(dt => {
      if (dt) {
        elapsed += dt;
        const heat = sHeat.get(), th = thr(), water = sWater.get();
        if (stage <= 2 && heat > 5) {
          // 水越多，要更多熱才能把壓力拉高
          const gain = heat * dt * (0.55 - water * 0.006);
          if (gain > 0) { U += gain; heatIn += gain; }
          bubble += dt * (0.6 + heat / 80);
        }
        if (stage === 0 && U > th * 0.18) stage = 1;
        if (stage === 1 && U > th * 0.72) stage = 2;
        if (stage === 2 && U >= th) {
          stage = 3;
          // 一次性做功：部分內能轉成塞子機械能，其餘留在管氣／散失
          const work = U * 0.45;
          U -= work;
          corkV = Math.sqrt(Math.max(0, work * 2.4));
          fog = 1;
        }
        if (stage === 3) {
          corkX += corkV * dt * 55;
          corkV *= Math.exp(-dt * 0.35);
          fog = Math.max(0, fog - dt * 0.35);
          if (fog <= 0.05) stage = 4;
        } else if (stage === 4) {
          fog = Math.max(0, fog - dt * 0.2);
          U = Math.max(0, U - dt * 2);
        }
      }
      draw();
    });

    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
