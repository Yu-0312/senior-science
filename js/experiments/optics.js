/* 模組九 · 光學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#f06292");
  function intersect(p1, d1, p2, d2) {
    const den = d1.x * d2.y - d1.y * d2.x; if (Math.abs(den) < 1e-6) return null;
    const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
    return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
  }
  const nmRGB = nm => {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
    return [r, g, b];
  };
  const nmColor = nm => {
    const [r, g, b] = nmRGB(nm);
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  };
  // 畫在台面上的光點／波前用：淺色台是米白底，黃綠色光點會直接消失，所以壓暗一些
  const nmInk = nm => {
    if (!PL.theme.isLight()) return nmColor(nm);
    const [r, g, b] = nmRGB(nm), k = 0.68 * 255;
    return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  };

  /* 反射與折射（司乃耳定律）
   *
   * 畫面照著課堂那一套走：光具座上的量角圓盤、盤心的半圓形介質、
   * 從左上打進來的雷射筆。學生在教室裡看到的是這些東西，
   * 螢幕上就該是這些東西——角度與光路疊在器材上面，而不是取代它。
   */
  PL.register("snell", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sTh = PL.ui.slider(L.controls, { label: "入射角 θ₁", min: 0, max: 89, step: 1, value: 35, unit: "°", digits: 0, onInput: () => draw() });
    const sN1 = PL.ui.slider(L.controls, { label: "介質1 折射率 n₁", min: 1, max: 2.4, step: 0.05, value: 1, unit: "", digits: 2, onInput: () => draw() });
    const sN2 = PL.ui.slider(L.controls, { label: "介質2 折射率 n₂", min: 1, max: 2.4, step: 0.05, value: 1.5, unit: "", digits: 2, onInput: () => draw() });
    const rTh2 = PL.ui.readout(L.readouts, { label: "折射角 θ₂", unit: "°" });
    const rTIR = PL.ui.readout(L.readouts, { label: "臨界角 θc", unit: "°" });
    // 直接抓雷射筆繞盤心轉：位置換算成與法線的夾角
    let cx0 = 0, cy0 = 0;
    const grip = PL.ui.handle(cv, { slider: sTh, label: "雷射筆（入射角）",
      toValue: (x, y) => Math.atan2(Math.abs(x - cx0), Math.max(0.0001, cy0 - y)) * 180 / Math.PI });
    /*
     * 播放時光點沿光路前進。介質裡的光速 v = c / n，頻率不變，
     * 所以進入折射率大的介質後光點變慢、間距（波長）變短——這是折射的成因，
     * 不只是「線轉了個角度」。反射與折射光的亮度依菲涅耳公式分配。
     */
    const clock = PL.motion.clock(() => draw());
    function fresnel(n1, n2, ti, tt) {
      const ci = Math.cos(ti), ct = Math.cos(tt);
      const rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct), rp = (n1 * ct - n2 * ci) / (n1 * ct + n2 * ci);
      return Math.min(1, (rs * rs + rp * rp) / 2);
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = PL.apparatus;
      const cx = W / 2, cy = H * 0.5;
      cx0 = cx; cy0 = cy;
      const R = Math.min(W * 0.30, H * 0.40);
      const th1 = sTh.get() * Math.PI / 180, n1 = sN1.get(), n2 = sN2.get();
      const t = clock.t;

      A.benchTop(ctx, W, H, H - 26);

      // 量角圓盤與盤心的半圓介質
      A.protractor(ctx, cx, cy, R);
      A.semiCircleGlass(ctx, cx, cy, R * 0.62);

      // 界面與法線
      D.line(ctx, cx - R, cy, cx + R, cy, PL.theme.pale(0.5), 1.6);
      D.line(ctx, cx, cy - R - 6, cx, cy + R + 6, PL.theme.pale(0.34), 1, [5, 4]);
      D.text(ctx, "法線", cx + 6, cy - R - 10, { color: PL.col("text-faint"), size: 10 });
      D.text(ctx, "n₁ = " + PL.fmt(n1, 2), cx - R - 4, cy - 12, { color: PL.col("accent-2"), size: 12, align: "right" });
      D.text(ctx, "n₂ = " + PL.fmt(n2, 2), cx - R - 4, cy + 20, { color: MC(), size: 12, align: "right" });

      const Ln = R * 0.98;
      // 雷射筆放在入射線的外端，筆身指向盤心
      const ix = cx - Ln * Math.sin(th1), iy = cy - Ln * Math.cos(th1);
      A.laser(ctx, ix, iy, Math.atan2(cy - iy, cx - ix));
      grip.place(ix, iy);

      const sinth2 = n1 * Math.sin(th1) / n2;
      const tir = sinth2 > 1;
      const th2 = tir ? 0 : Math.asin(sinth2);
      const Rf = tir ? 1 : fresnel(n1, n2, th1, th2);
      const rx = cx + Ln * Math.sin(th1), ry = cy - Ln * Math.cos(th1);
      const tx = cx + Ln * Math.sin(th2), ty = cy + Ln * Math.cos(th2);

      // 入射：標籤放在光線中段，放在箭頭尖端會壓在盤心上和「折射」疊在一起
      D.arrow(ctx, ix, iy, cx, cy, { color: "#ffe08a", width: 2.4 });
      D.text(ctx, "入射", (ix + cx) / 2 - 26, (iy + cy) / 2 + 4, { color: "#ffe08a", size: 12 });
      // 反射：亮度依反射率
      D.arrow(ctx, cx, cy, rx, ry, { color: "rgba(255,224,138," + (0.25 + 0.75 * Rf).toFixed(2) + ")", width: 1 + 2 * Rf, label: "反射 " + Math.round(Rf * 100) + "%" });
      if (!tir) {
        D.arrow(ctx, cx, cy, tx, ty, { color: MC(), width: 1 + 1.6 * (1 - Rf) + 0.4, label: "折射", lx: 8, ly: 14 });
        rTh2.set(th2 * 180 / Math.PI, 1);
      } else {
        D.text(ctx, "全反射！", cx + 10, cy + 30, { color: PL.col("danger"), size: 13 });
        rTh2.set("全反射");
      }
      rTIR.set(n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : "不適用");

      // 光點：c 對應畫面速率 150 px/s，頻率固定，間距 = 速率 / 頻率
      const c = 150, f = 6.5, v1 = c / n1, v2 = c / n2;
      const tHit = Ln / v1;                     // 光點走到盤心所需時間
      PL.motion.flow(ctx, [[ix, iy], [cx, cy]], t * v1, { gap: v1 / f, r: 2.6, front: true });
      PL.motion.flow(ctx, [[cx, cy], [rx, ry]], (t - tHit) * v1, { gap: v1 / f, r: 2.2, alpha: 0.2 + 0.8 * Rf, front: true });
      if (!tir) PL.motion.flow(ctx, [[cx, cy], [tx, ty]], (t - tHit) * v2, { gap: v2 / f, color: PL.theme.isLight() ? "#c2185b" : "#ffd1e3", r: 2.4, alpha: 0.25 + 0.75 * (1 - Rf), front: true });
      D.text(ctx, "光速 v = c/n", cx - R - 4, cy + 44, { color: PL.col("text-faint"), size: 10.5, align: "right" });
      D.text(ctx, "介質1：" + (1 / n1).toFixed(2) + " c", cx - R - 4, cy + 60, { color: PL.col("text-faint"), size: 10.5, align: "right" });
      D.text(ctx, "介質2：" + (1 / n2).toFixed(2) + " c", cx - R - 4, cy + 76, { color: PL.col("text-faint"), size: 10.5, align: "right" });
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 透鏡成像
   *
   * 這一版把示意圖換成光具座：導軌上有蠟燭、透鏡與光屏，刻度是真的公分。
   * 原本焦距與物距的單位是 px——學生沒辦法把「200 px」跟課堂上那把
   * 光具座連起來，而這是本實驗最需要的那一步連結。
   *
   * 座標系：導軌左端為 0 cm，全長 BENCH_CM，透鏡固定在 LENS_CM。
   * 垂直與水平共用同一個 pxPerCm，因此可以呼叫 calibrate() 讓尺真的能量。
   */
  PL.register("lens", { build(root) {
    // 光具座需要橫向寬畫面：參數整列移到畫布下方，透鏡、物與像才放得下
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet", instrument: false });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    const BENCH_CM = 120, LENS_CM = 45, OBJ_H_CM = 12;
    const sType = PL.ui.select(L.controls, { label: "透鏡", value: "conv", options: [{ value: "conv", label: "凸透鏡（會聚）" }, { value: "div", label: "凹透鏡（發散）" }], onChange: draw });
    const sF = PL.ui.slider(L.controls, { label: "焦距 |f|", min: 8, max: 30, step: 1, value: 15, unit: "cm", digits: 0, onInput: draw });
    const sP = PL.ui.slider(L.controls, { label: "物距 u", min: 10, max: 40, step: 1, value: 34, unit: "cm", digits: 0, onInput: draw });
    const rQ = PL.ui.readout(L.readouts, { label: "像距 v", unit: "cm" });
    const rM = PL.ui.readout(L.readouts, { label: "放大率 m", unit: "" });
    const rType = PL.ui.readout(L.readouts, { label: "成像" });
    const rZone = PL.ui.readout(L.readouts, { label: "物距所在區間" });

    function zoneOf(u, f, conv) {
      if (!conv) return "凹透鏡：恆為正立縮小虛像";
      if (Math.abs(u - f) < 0.5) return "u = f：不成像（射出平行光）";
      if (u < f) return "u < f：正立放大虛像（放大鏡）";
      if (Math.abs(u - 2 * f) < 0.5) return "u = 2f：倒立等大實像";
      if (u > 2 * f) return "u > 2f：倒立縮小實像（照相機）";
      return "f < u < 2f：倒立放大實像（投影機）";
    }

    // 直接抓蠟燭在導軌上滑：位置換算成物距（透鏡固定在 LENS_CM）
    let gx1 = 44, gPx = 1;
    const grip = PL.ui.handle(cv, { slider: sP, label: "蠟燭（物距）",
      toValue: x => LENS_CM - (x - gx1) / gPx });
    /*
     * 播放時光點從燭焰頂端出發，沿三條特殊光線走：平行主軸 → 折向焦點、
     * 通過光心 → 不偏折、通過（或射向）焦點 → 折成平行。
     * 實像處三串光點真的會聚在同一點；虛像時出射光點彼此分開，
     * 只有虛線的反向延長線交在一起——「光屏接不到」就是這個意思。
     */
    const clock = PL.motion.clock(() => draw());

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = PL.apparatus;
      const conv = sType.get() === "conv";
      const f = sF.get() * (conv ? 1 : -1), u = sP.get();

      const x1 = 44, x2 = W - 44, pxPerCm = (x2 - x1) / BENCH_CM;
      gx1 = x1; gPx = pxPerCm;
      const X = cm => x1 + cm * pxPerCm;
      const cy = Math.round(H * 0.62);
      const railTop = Math.min(H - 30, cy + 84);
      cv.calibrate(pxPerCm, "cm");

      const hoPx = OBJ_H_CM * pxPerCm;          // 物高（畫面像素）
      const xL = X(LENS_CM), xo = X(LENS_CM - u);

      // 檯面與導軌
      A.benchTop(ctx, W, H, railTop + 26);
      A.bench(ctx, x1, x2, railTop, { pxPerCm, cm0: 0 });

      // 主光軸
      D.line(ctx, x1, cy, x2, cy, PL.theme.pale(0.30), 1.2, [6, 5]);

      // 焦點與二倍焦距標記（畫在光軸上，對應五分區）
      [[-2, "2F"], [-1, "F"], [1, "F′"], [2, "2F′"]].forEach(([k, lab]) => {
        const fx = xL + k * Math.abs(f) * pxPerCm;
        if (fx < x1 || fx > x2) return;
        D.line(ctx, fx, cy - 7, fx, cy + 7, PL.theme.pale(0.75), 1.6);
        D.text(ctx, lab, fx, cy + 21, { color: PL.col("text-dim"), size: 10, align: "center", weight: "600" });
      });

      // 成像計算（實正虛負，v > 0 表示像在透鏡右側可用光屏承接）
      const denom = u - f;
      const v = Math.abs(denom) < 1e-6 ? Infinity : f * u / denom;
      const m = isFinite(v) ? -v / u : Infinity;
      const real = isFinite(v) && v > 0;
      const imgH = isFinite(m) ? Math.abs(m) * hoPx : 0;
      const xi = isFinite(v) ? xL + v * pxPerCm : NaN;

      // 光屏：只有成實像時才擺上導軌
      let screenCm = null, offRail = false;
      if (real) {
        screenCm = LENS_CM + v;
        if (screenCm > BENCH_CM - 3) { screenCm = BENCH_CM - 3; offRail = true; }
      }

      // ---- 器材（由後往前疊）----
      // 蠟燭（物）：光軸通過燭台底面，像才會清楚地倒在光軸另一側
      A.carrier(ctx, xo, railTop, cy);
      A.candle(ctx, xo, cy, { h: hoPx, r: Math.max(4, hoPx * 0.16) });
      D.text(ctx, "物（蠟燭）", xo, cy + 42, { color: PL.col("accent-2"), size: 10, align: "center", weight: "600" });

      // 光屏
      if (screenCm !== null) {
        const xs = X(screenCm);
        const sharp = offRail ? 0.25 : 1;
        A.carrier(ctx, xs, railTop, cy + 52);
        A.screen(ctx, xs, cy, 30, 104, c => {
          if (imgH > 1) A.projectedFlame(c, xs, cy, Math.min(imgH, 96), true, sharp);
        });
        D.text(ctx, offRail ? "光屏（已到導軌盡頭）" : "光屏", xs, cy - 62, {
          color: offRail ? PL.col("danger") : PL.col("text-dim"), size: 10, align: "center"
        });
      }

      // 透鏡
      A.carrier(ctx, xL, railTop, cy + 54);
      A.lens(ctx, xL, cy, 54, conv);
      D.text(ctx, conv ? "凸透鏡" : "凹透鏡", xL, cy - 66, { color: MC(), size: 11, align: "center" });

      // ---- 光路（疊在器材上）----
      const rayY = cy - hoPx;                    // 燭焰頂端
      const Atop = { x: xL, y: rayY };
      const Fp = { x: xL + f * pxPerCm, y: cy };
      const d1 = conv ? { x: Fp.x - Atop.x, y: Fp.y - Atop.y } : { x: Atop.x - Fp.x, y: Atop.y - Fp.y };
      const d2 = { x: xL - xo, y: cy - rayY };
      const img = intersect(Atop, d1, { x: xo, y: rayY }, d2);

      // 淺色台是米白底，淡黃光線幾乎看不見，改用琥珀色
      const RAY = PL.theme.isLight() ? "#d08a10" : "#ffd77a", DASH = PL.theme.isLight() ? "rgba(190,120,10,0.55)" : "rgba(255,215,122,0.45)";
      // 第三條特殊光線：凸透鏡是「通過前焦點 F」，凹透鏡是「射向後焦點 F′」，出射後都平行主軸。
      // 交透鏡的高度由「燭焰頂端與該焦點的連線」決定（薄透鏡、近軸近似）。
      const Fc = xL - f * pxPerCm;   // f 帶號：凸透鏡得前焦點，凹透鏡得後焦點
      const yC = Math.abs(Fc - xo) > 1 ? rayY + (cy - rayY) * (xL - xo) / (Fc - xo) : NaN;
      const hasC = isFinite(yC) && Math.abs(yC - cy) < H;
      // 光線裁在導軌上方：射穿檯面的線只會讓畫面變亂，也不是真的會發生的事
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, railTop - 2); ctx.clip();
      D.line(ctx, xo, rayY, Atop.x, Atop.y, RAY, 1.8);          // 平行光軸入射
      D.line(ctx, xo, rayY, xL, cy, RAY, 1.8);                   // 通過光心
      const far = Math.max(W, H) * 1.6;
      const n1 = Math.hypot(d1.x, d1.y), n2 = Math.hypot(d2.x, d2.y);
      const endA = [Atop.x + d1.x / n1 * far, Atop.y + d1.y / n1 * far];
      const endB = [xL + d2.x / n2 * far, cy + d2.y / n2 * far];
      D.line(ctx, Atop.x, Atop.y, endA[0], endA[1], RAY, 1.8);
      D.line(ctx, xL, cy, endB[0], endB[1], RAY, 1.8);
      if (hasC) {
        D.line(ctx, xo, rayY, xL, yC, RAY, 1.4);
        D.line(ctx, xL, yC, x2 + 40, yC, RAY, 1.4);
      }
      // 光點：三串同時從燭焰頂端出發；光在空氣中等速，走到哪裡就是哪裡
      const s = clock.t * 120, fo = { gap: 20, r: 2.5, front: true };
      PL.motion.flow(ctx, [[xo, rayY], [Atop.x, Atop.y], endA], s, fo);
      PL.motion.flow(ctx, [[xo, rayY], [xL, cy], endB], s, fo);
      if (hasC) PL.motion.flow(ctx, [[xo, rayY], [xL, yC], [x2 + 40, yC]], s, fo);
      ctx.restore();
      grip.place(xo, cy - hoPx * 0.45);

      // 虛像：把反向延長線畫成虛線，並說明光屏接不到
      if (img && !real) {
        D.line(ctx, Atop.x, Atop.y, img.x, img.y, DASH, 1.2, [5, 4]);
        D.line(ctx, xL, cy, img.x, img.y, DASH, 1.2, [5, 4]);
        if (hasC) D.line(ctx, xL, yC, img.x, yC, DASH, 1.2, [5, 4]);
        D.arrow(ctx, img.x, cy, img.x, img.y, { color: MC(), width: 2.4, label: "虛像", dash: [4, 3] });
        D.text(ctx, "虛像用光屏接不到，要從透鏡另一側往回看", xL, cy - 84, {
          color: PL.col("text-dim"), size: 11, align: "center"
        });
      }

      // ---- 讀數 ----
      if (!isFinite(v)) {
        rQ.set("不成像"); rM.set("—"); rType.set("射出平行光");
      } else {
        rQ.set(v, 1); rM.set(m, 2);
        rType.set(real ? (Math.abs(m) > 1 ? "倒立放大實像" : Math.abs(m) < 1 ? "倒立縮小實像" : "倒立等大實像")
                       : "正立放大虛像");
      }
      rZone.set(zoneOf(u, Math.abs(f), conv));
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 面鏡成像 —— 同樣改成光具座上的實物配置，單位為公分 */
  PL.register("mirror", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet", instrument: false });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    const BENCH_CM = 120, MIRROR_CM = 104, OBJ_H_CM = 12;
    const sType = PL.ui.select(L.controls, { label: "面鏡", value: "concave", options: [{ value: "concave", label: "凹面鏡（會聚）" }, { value: "convex", label: "凸面鏡（發散）" }], onChange: draw });
    const sF = PL.ui.slider(L.controls, { label: "焦距 |f|", min: 8, max: 30, step: 1, value: 18, unit: "cm", digits: 0, onInput: draw });
    const sP = PL.ui.slider(L.controls, { label: "物距 u", min: 10, max: 50, step: 1, value: 30, unit: "cm", digits: 0, onInput: draw });
    const rQ = PL.ui.readout(L.readouts, { label: "像距 v", unit: "cm" });
    const rM = PL.ui.readout(L.readouts, { label: "放大率 m", unit: "" });
    const rType = PL.ui.readout(L.readouts, { label: "成像" });
    // 直接抓蠟燭在導軌上滑：面鏡固定在導軌右端，位置換算成物距
    let gx1 = 44, gPx = 1;
    const grip = PL.ui.handle(cv, { slider: sP, label: "蠟燭（物距）",
      toValue: x => MIRROR_CM - (x - gx1) / gPx });
    /*
     * 播放時光點從燭焰頂端出發，沿三條特殊光線打到鏡面再反射：
     * 平行主軸 → 反射經過（或好像來自）焦點 F、射向鏡頂 → 依主軸對稱反射、
     * 經過（或射向）F → 反射後平行主軸。凹面鏡的實像處三串光點會真的交會；
     * 凸面鏡的反射光點彼此分開，只有鏡後的虛線延長線交在一起。
     */
    const clock = PL.motion.clock(() => draw());
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = PL.apparatus;
      const concave = sType.get() === "concave";
      const fcm = sF.get() * (concave ? 1 : -1), u = sP.get();

      const x1 = 44, x2 = W - 44, pxPerCm = (x2 - x1) / BENCH_CM;
      gx1 = x1; gPx = pxPerCm;
      const X = cm => x1 + cm * pxPerCm;
      const cy = Math.round(H * 0.62), railTop = Math.min(H - 30, cy + 84);
      cv.calibrate(pxPerCm, "cm");

      const hoPx = OBJ_H_CM * pxPerCm;
      const xm = X(MIRROR_CM), xo = X(MIRROR_CM - u), f = fcm * pxPerCm;

      A.benchTop(ctx, W, H, railTop + 26);
      A.bench(ctx, x1, x2, railTop, { pxPerCm, cm0: 0 });
      D.line(ctx, x1, cy, xm, cy, PL.theme.pale(0.30), 1.2, [6, 5]);

      // 面鏡（安裝在導軌右端）
      A.carrier(ctx, xm, railTop, cy + 56);
      A.curvedMirror(ctx, xm, cy, 56, Math.abs(f) * 2, concave);
      D.text(ctx, concave ? "凹面鏡" : "凸面鏡", xm, cy - 68, { color: MC(), size: 11, align: "center" });

      // 焦點與曲率中心
      [[1, "F"], [2, "C"]].forEach(([k, lab]) => {
        const fx = xm - k * f;
        if (fx < x1 || fx > x2) return;
        D.line(ctx, fx, cy - 7, fx, cy + 7, PL.theme.pale(0.75), 1.6);
        D.text(ctx, lab, fx, cy + 21, { color: PL.col("text-dim"), size: 10, align: "center", weight: "600" });
      });

      // 物（蠟燭）
      A.carrier(ctx, xo, railTop, cy);
      A.candle(ctx, xo, cy, { h: hoPx, r: Math.max(4, hoPx * 0.16) });
      D.text(ctx, "物（蠟燭）", xo, cy + 42, { color: PL.col("accent-2"), size: 10, align: "center", weight: "600" });

      // 光路
      const rayY = cy - hoPx;
      const F = { x: xm - f, y: cy }, Ap = { x: xm, y: rayY }, V = { x: xm, y: cy };
      const d1 = concave ? { x: F.x - Ap.x, y: F.y - Ap.y } : { x: Ap.x - F.x, y: Ap.y - F.y };
      const din = { x: V.x - xo, y: V.y - rayY }, d2 = { x: -din.x, y: din.y };
      const img = intersect(Ap, d1, V, d2);
      const RAY = PL.theme.isLight() ? "#d08a10" : "#ffd77a", far = Math.max(W, H) * 1.6;
      const n1 = Math.hypot(d1.x, d1.y), n2 = Math.hypot(d2.x, d2.y);
      // 第三條：經過（凹）或射向（凸）焦點的光，反射後平行主軸；F.x 已含正負號
      const yC = Math.abs(F.x - xo) > 1 ? rayY + (cy - rayY) * (xm - xo) / (F.x - xo) : NaN;
      const hasC = isFinite(yC) && Math.abs(yC - cy) < H;
      const endA = [Ap.x + d1.x / n1 * far, Ap.y + d1.y / n1 * far], endB = [V.x + d2.x / n2 * far, cy + d2.y / n2 * far];
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, railTop - 2); ctx.clip();
      D.line(ctx, xo, rayY, Ap.x, Ap.y, RAY, 1.8);
      D.line(ctx, xo, rayY, V.x, V.y, RAY, 1.8);
      D.line(ctx, Ap.x, Ap.y, endA[0], endA[1], RAY, 1.8);
      D.line(ctx, V.x, V.y, endB[0], endB[1], RAY, 1.8);
      if (hasC) { D.line(ctx, xo, rayY, xm, yC, RAY, 1.4); D.line(ctx, xm, yC, -40, yC, RAY, 1.4); }
      // 光點：入射與反射在同一介質（空氣）裡，速率不變；反射後掉頭往左走
      const s = clock.t * 120, fo = { gap: 20, r: 2.5, front: true };
      PL.motion.flow(ctx, [[xo, rayY], [Ap.x, Ap.y], endA], s, fo);
      PL.motion.flow(ctx, [[xo, rayY], [V.x, V.y], endB], s, fo);
      if (hasC) PL.motion.flow(ctx, [[xo, rayY], [xm, yC], [-40, yC]], s, fo);
      ctx.restore();
      grip.place(xo, cy - hoPx * 0.45);

      if (img) {
        const virtual = img.x > xm;
        if (virtual) {
          // 鏡後的反向延長線：反射光好像是從這一點發出來的
          const dash = PL.theme.isLight() ? "rgba(190,120,10,0.55)" : "rgba(255,215,122,0.45)";
          D.line(ctx, Ap.x, Ap.y, img.x, img.y, dash, 1.2, [5, 4]);
          D.line(ctx, V.x, V.y, img.x, img.y, dash, 1.2, [5, 4]);
          if (hasC) D.line(ctx, xm, yC, img.x, yC, dash, 1.2, [5, 4]);
        }
        D.arrow(ctx, img.x, cy, img.x, img.y, { color: MC(), width: 2.4, label: virtual ? "虛像" : "實像", dash: virtual ? [4, 3] : null });
        const vcm = (xm - img.x) / pxPerCm, m = -(img.y - cy) / hoPx;
        rQ.set(vcm, 1); rM.set(m, 2);
        rType.set(virtual ? "正立放大虛像" : (Math.abs(m) > 1 ? "倒立放大實像" : "倒立縮小實像"));
        if (virtual) D.text(ctx, "虛像在鏡後，光屏接不到", xm, cy - 86, { color: PL.col("text-dim"), size: 11, align: "center" });
      } else {
        rQ.set("不成像"); rM.set("—"); rType.set("反射後為平行光");
      }
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 凸透鏡位移法：固定物屏距，找出兩個清晰成像位置 */
  PL.register("lens-displacement", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet", instrument: false });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let recorded = [], feedback = "將透鏡移到光屏成像最清晰的位置，再記錄位置。";
    PL.ui.section(L.controls, "物屏與透鏡");
    const sD = PL.ui.slider(L.controls, { label: "物體到光屏距離 D", min: 160, max: 320, step: 10, value: 240, unit: "cm", digits: 0, onInput: () => { recorded = []; feedback = "物屏距已改變，請重新尋找兩個清晰像。"; draw(); } });
    const sF = PL.ui.slider(L.controls, { label: "實際焦距 f", min: 20, max: 55, step: 1, value: 40, unit: "cm", digits: 0, onInput: () => { recorded = []; feedback = "透鏡已更換，請重新量測。"; draw(); } });
    const sX = PL.ui.slider(L.controls, { label: "透鏡位置 x/D", min: 0.05, max: 0.95, step: 0.005, value: 0.28, unit: "", digits: 3, onInput: draw });
    const posRow = PL.ui.buttonRow(L.controls);
    PL.ui.button(posRow, "定位近端像", () => setToSolution(0));
    PL.ui.button(posRow, "定位遠端像", () => setToSolution(1));
    const actionRow = PL.ui.buttonRow(L.controls);
    PL.ui.button(actionRow, "記錄清晰像位置", () => {
      const s = state();
      if (!s.valid) { feedback = "此物屏距未滿足 D > 4f，無法取得兩個清晰像。"; draw(); return; }
      if (s.blur > 0.05) { feedback = "目前光屏上的像仍不夠清晰，請繼續調整透鏡位置。"; draw(); return; }
      if (recorded.some(v => Math.abs(v - s.x) < 0.5)) { feedback = "這個位置已記錄。請移到另一個清晰像位置。"; draw(); return; }
      recorded.push(s.x); recorded.sort((a, b) => a - b);
      feedback = "已記錄 x=" + PL.fmt(s.x, 1) + " cm。";
      draw();
    }, { primary: true });
    PL.ui.button(actionRow, "清除紀錄", () => { recorded = []; feedback = "量測紀錄已清除。"; draw(); });
    const rX = PL.ui.readout(L.readouts, { label: "目前透鏡位置 x", unit: "cm" });
    const rFocus = PL.ui.readout(L.readouts, { label: "光屏成像", unit: "" });
    const rD = PL.ui.readout(L.readouts, { label: "兩位置距離 d", unit: "cm" });
    const rF = PL.ui.readout(L.readouts, { label: "位移法測得 f", unit: "cm" });
    const rN = PL.ui.readout(L.readouts, { label: "已記錄位置", unit: "個" });
    const note = PL.ui.note(L.controls, feedback);
    const chart = PL.ui.chart(PL.ui.charts(root), { title: "光屏清晰度與透鏡位置", cap: "當透鏡位於兩個共軛位置時，像剛好落在光屏上；兩個低谷的位置可用來量焦距。" });
    function state() {
      const Dcm = sD.get(), f = sF.get(), x = sX.get() * Dcm, valid = Dcm > 4 * f;
      const q = x > f ? f * x / (x - f) : -999;
      const blur = valid && q > 0 ? Math.abs(Dcm - x - q) / Dcm : 1;
      const gap = valid ? Math.sqrt(Dcm * Dcm - 4 * Dcm * f) : 0;
      return { Dcm, f, x, valid, q, blur, solutions: valid ? [(Dcm - gap) / 2, (Dcm + gap) / 2] : [] };
    }
    function setToSolution(n) {
      const s = state();
      if (!s.valid) { feedback = "請先將 D 調整為大於 4f。"; draw(); return; }
      sX.set(s.solutions[n] / s.Dcm); feedback = "已定位到" + (n === 0 ? "近端" : "遠端") + "清晰像，可記錄讀值。"; draw();
    }
    // 直接抓透鏡在物與屏之間滑動，找清晰像——這正是位移法實驗裡手在做的事
    let gObj = 58, gSpan = 1;
    const grip = PL.ui.handle(cv, { slider: sX, label: "透鏡位置",
      toValue: x => (x - gObj) / gSpan });
    /*
     * 播放時光點從燭焰頂端沿特殊光線穿過透鏡、打到光屏。
     * 清晰時各串光點在屏上落在同一點；像不在屏上時，它們在屏上分散成一段——
     * 這段長度就是「模糊」的來源，比只看屏上的圖更能說明為什麼要前後找。
     */
    const clock = PL.motion.clock(() => scene());
    function draw() { scene(); plot(); }
    function scene() {
      const { ctx, W, H } = cv, s = state(); cv.clear(); D.bg(cv);
      const A = PL.apparatus || {};
      const objectX = 58, screenX = W - 54, baseY = H - 38, cy = H * 0.5, span = screenX - objectX;
      const lensX = objectX + s.x / s.Dcm * span, focalPx = s.f / s.Dcm * span;
      gObj = objectX; gSpan = span;
      const lensHalf = Math.min(64, H * 0.30);
      // 實驗室裡的光具座：導軌上有公分刻度，蠟燭、透鏡、光屏都夾在滑座上
      if (A.bench) {
        A.benchTop(ctx, W, H, baseY + 26);
        A.bench(ctx, objectX, screenX, baseY, { pxPerCm: span / s.Dcm, cm0: 0 });
      }
      // 物體：蠟燭（擬真）
      // 蠟燭立在滑座的立柱上，燭焰高度對準光軸上方（光線從燭焰出發）
      if (A.candle) { A.carrier(ctx, objectX, baseY, cy - 35 + 13 + 46); A.candle(ctx, objectX, cy - 35 + 13 + 46, { h: 46 }); }
      else D.arrow(ctx, objectX, cy + 48, objectX, cy - 35, { color: PL.col("warn"), width: 3, label: "物體" });
      // 光屏：擬真（支架＋屏面）
      const clarityNow = s.valid && s.x > s.f ? PL.clamp(1 - s.blur * 18, 0, 1) : 0;
      const imgH = s.valid && s.x > s.f ? PL.clamp(-70 * s.q / s.x, -64, 64) : 0;
      if (A.screen) {
        A.carrier(ctx, screenX, baseY, cy + 75);
        A.screen(ctx, screenX, cy, 30, 150, c2 => {
          if (imgH) A.projectedFlame(c2, screenX, cy, Math.abs(imgH) * Math.max(0.35, clarityNow), true, clarityNow);
        });
      } else { D.line(ctx, screenX, 24, screenX, baseY, PL.col("accent-2"), 3); }
      D.text(ctx, "光屏", screenX, 20, { color: PL.col("accent-2"), size: 11, align: "center" });
      // 透鏡：擬真鏡片（描邊＋漸層玻璃）
      if (A.lens) { A.carrier(ctx, lensX, baseY, cy + Math.min(64, H * 0.30) + 6); A.lens(ctx, lensX, cy, Math.min(64, H * 0.30), true); }
      else { ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lensX, 38); ctx.quadraticCurveTo(lensX - 14, cy, lensX, H - 56); ctx.quadraticCurveTo(lensX + 14, cy, lensX, 38); ctx.stroke(); ctx.restore(); }
      [lensX - focalPx, lensX + focalPx].forEach(xx => { if (xx > objectX && xx < screenX) { D.line(ctx, xx, cy - 5, xx, cy + 5, MC(), 1); D.text(ctx, "F", xx, cy + 20, { color: MC(), size: 10, align: "center" }); } });
      grip.place(lensX, cy + lensHalf * 0.55);
      if (s.valid && s.x > s.f) {
        const imageX = lensX + s.q / s.Dcm * span, imageH = -70 * s.q / s.x;
        const rayY = cy - 35;
        /*
         * 燭焰頂端在光軸上方 35 px，像點在光軸下方 35·q/x（倒立，放大率 q/x）。
         * 三條特殊光線都穿過這個像點；畫到光屏為止，屏上的落點散開多少就是多模糊。
         * 第三條（經前焦點 → 平行出射）若交透鏡的高度超出鏡片，就真的沒有這條光。
         */
        const imgY = cy + 35 * s.q / s.x;
        const toScreen = (lx, ly) => [screenX, ly + (imgY - ly) * (screenX - lx) / (imageX - lx)];
        const yC = cy + 35 * s.f / (s.x - s.f);
        const rays = [[[objectX, rayY], [lensX, rayY], toScreen(lensX, rayY)], [[objectX, rayY], [lensX, cy], toScreen(lensX, cy)]];
        if (Math.abs(yC - cy) < lensHalf) rays.push([[objectX, rayY], [lensX, yC], [screenX, yC]]);
        const light = PL.theme.isLight();
        const rayCol = light ? "rgba(200,128,0,0.7)" : "rgba(255,224,138,0.7)";
        rays.forEach(r => { D.line(ctx, r[0][0], r[0][1], r[1][0], r[1][1], rayCol, 1.5); D.line(ctx, r[1][0], r[1][1], r[2][0], r[2][1], rayCol, 1.5); });
        const sDot = clock.t * 130;
        rays.forEach(r => PL.motion.flow(ctx, r, sDot, { gap: 20, r: 2.5, front: true }));
        // 屏上的落點：同一個物點送出的光，清晰時疊成一點，模糊時拉成一段
        const ys = rays.map(r => r[2][1]);
        if (clock.t > 0) {
          const plen = r => Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]) + Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1]);
          const arrive = Math.max(...rays.map(plen));
          if (sDot > arrive) {
            const lo = Math.min(...ys), hi = Math.max(...ys);
            ctx.save(); ctx.strokeStyle = light ? "rgba(200,40,90,0.75)" : "rgba(255,150,190,0.85)"; ctx.lineWidth = 3; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(screenX - 4, lo); ctx.lineTo(screenX - 4, Math.max(hi, lo + 0.5)); ctx.stroke(); ctx.restore();
          }
        }
        const clarity = PL.clamp(1 - s.blur * 18, 0, 1), displayH = imageH * clarity;
        D.text(ctx, clarity > 0.85 ? "清晰像（倒立）" : "模糊像", screenX - 22, cy - 84, { color: clarity > 0.85 ? MC() : PL.col("text-dim"), size: 11, align: "right", weight: "700" });
        if (s.blur > 0.05) D.ring(ctx, screenX, cy - displayH * 0.5, 7 + s.blur * 60, "rgba(240,98,146,0.45)", 1.5);
      }
      D.text(ctx, "D=" + s.Dcm + " cm", (objectX + screenX) / 2, baseY + 23, { color: PL.col("text-dim"), size: 11, align: "center" });
      rX.set(s.x, 1); rFocus.set(s.valid ? (s.blur <= 0.05 ? "清晰" : "尚未清晰") : "D ≤ 4f"); rN.set(recorded.length, 0); note.textContent = feedback;
      const separation = recorded.length === 2 ? Math.abs(recorded[1] - recorded[0]) : 0;
      const measured = recorded.length === 2 ? (s.Dcm * s.Dcm - separation * separation) / (4 * s.Dcm) : 0;
      rD.set(recorded.length === 2 ? separation : "待記錄", recorded.length === 2 ? 1 : undefined);
      rF.set(recorded.length === 2 ? measured : "待量測", recorded.length === 2 ? 1 : undefined);
    }
    function plot() {
      const s = state();
      chart.clear();
      const g = PL.graph(chart, { x: 42, y: 16, w: chart.W - 58, h: chart.H - 40 }, { x0: 0, x1: s.Dcm, y0: 0, y1: 1 });
      g.frame({ xlabel: "透鏡位置 x (cm)", ylabel: "模糊程度" }); g.grid(6, 4);
      if (s.valid) g.fn(x => { const q = x > s.f ? s.f * x / (x - s.f) : -999; return q > 0 ? PL.clamp(Math.abs(s.Dcm - x - q) / s.Dcm, 0, 1) : 1; }, { color: MC(), width: 2.1 });
      recorded.forEach(x => g.dot(x, 0, { color: PL.col("accent-2"), glow: PL.col("accent-2") }));
      g.dot(s.x, PL.clamp(s.blur, 0, 1), { color: PL.col("warn"), glow: PL.col("warn") });
    }
    cv.onResize(scene); chart.onResize(plot); draw();
    return { stop() { clock.stop(); cv.destroy(); chart.destroy(); }, rerender: draw };
  }});

  /* 雙縫干涉 — 光具座 · 單光子累積 */
  /* 雙狹縫干涉 —— 旗艦改版
   *
   * 這個實驗的重點不是把條紋畫得漂亮，而是三件課本只寫一句話的事：
   *
   *   1. 一次只發射一顆光子，前幾顆看起來完全隨機，
   *      累積到幾百顆之後條紋卻自己浮現——單一光子也會干涉。
   *   2. 兩條單縫圖樣相加，不等於雙縫圖樣。差別就是干涉。
   *   3. 只要在縫上裝偵測器去看光子走哪一條，條紋立刻消失。
   *
   * 依 PhET《Look and Feel》：學生會刻意測試極端狀況，
   * 因此「把光子速率降到 1」與「打開偵測器」都必須有立即、明確的反應。
   */
  PL.register("double-slit", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet", instrument: false });
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 880);

    let hits = [];            // 螢幕上累積的光子落點（單位：mm，以中心為 0）
    let flying = [];          // 飛行中的光子，用來呈現「一顆一顆」
    let emitTimer = 0;
    let paused = false;

    PL.ui.section(L.controls, "光源與幾何");
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: clear });
    const sD = PL.ui.slider(L.controls, { label: "縫間距 d", min: 0.10, max: 0.60, step: 0.02, value: 0.24, unit: "mm", digits: 2, onInput: clear });
    const sW = PL.ui.slider(L.controls, { label: "單縫寬 a", min: 0.02, max: 0.14, step: 0.01, value: 0.06, unit: "mm", digits: 2, onInput: clear });
    const sL = PL.ui.slider(L.controls, { label: "屏距 L", min: 0.5, max: 3.0, step: 0.1, value: 1.5, unit: "m", digits: 1, onInput: clear });

    PL.ui.section(L.controls, "狹縫");
    let mode = "double";
    PL.ui.chipGroup(L.controls, {
      value: "double",
      options: [
        { value: "double", label: "雙縫" },
        { value: "single", label: "單縫" },
        { value: "sum", label: "兩單縫相加" }
      ],
      onChange: v => { mode = v; clear(); }
    });

    PL.ui.section(L.controls, "發射方式");
    const sRate = PL.ui.slider(L.controls, { label: "每秒光子數", min: 1, max: 400, step: 1, value: 1, unit: "顆/s", digits: 0 });
    const cDetect = PL.ui.checkbox(L.controls, { label: "在縫上裝偵測器（測量走哪條縫）", checked: false, onChange: clear });

    const row = PL.ui.buttonRow(L.controls);
    const bPause = PL.ui.button(row, "暫停發射", () => { paused = !paused; bPause.textContent = paused ? "繼續發射" : "暫停發射"; }, { primary: true });
    PL.ui.button(row, "清除螢幕", clear);
    PL.ui.button(row, "一次打 500 顆", () => { for (let i = 0; i < 500; i += 1) land(); });

    PL.ui.note(L.controls,
      "把「每秒光子數」設成 1，耐心看前 20 顆——完全看不出規律。" +
      "接著按「一次打 500 顆」，條紋會自己長出來：干涉不是光子之間互相作用，單一光子就會。" +
      "然後打開偵測器，條紋立刻消失；關掉又回來。最後比較「雙縫」與「兩單縫相加」，差的就是干涉項。");

    const rDx = PL.ui.readout(L.readouts, { label: "條紋間距 Δx", unit: "mm" });
    const rCount = PL.ui.readout(L.readouts, { label: "累積光子", unit: "顆" });
    const rVis = PL.ui.readout(L.readouts, { label: "條紋對比度", unit: "" });
    const rMode = PL.ui.readout(L.readouts, { label: "干涉狀態" });

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "螢幕上的光強分布",
      cap: "曲線是理論強度，長條是實際累積到的光子數。光子越多，長條越貼近曲線——機率分布是這樣被「打」出來的。"
    });

    function clear() { hits = []; flying = []; }

    // 直接把光屏沿導軌前後推：位置換算成屏距 L。畫面上屏的位置也跟著 L 走，
    // 學生才看得到「屏拉遠 → 光子扇得更開」。
    let gSlit = 0, gSpan = 1;
    const grip = PL.ui.handle(cv, { slider: sL, label: "光屏（屏距 L）",
      toValue: x => 0.5 + (x - 18 - gSlit - 70) / gSpan * 2.5 });

    /* 螢幕的半寬（mm）：讓主要條紋大致填滿畫面 */
    function halfWidth() {
      const dx = fringeSpacing();
      return Math.max(6, dx * 6);
    }
    function fringeSpacing() {
      // Δx = λL/d，λ 由 nm 轉 m、d 由 mm 轉 m，結果再轉回 mm
      return (sLam.get() * 1e-9) * sL.get() / (sD.get() * 1e-3) * 1000;
    }

    /*
     * 螢幕位置 y（mm）處的相對強度
     *   單縫繞射包絡： sinc²(πa sinθ/λ)
     *   雙縫干涉條紋： cos²(πd sinθ/λ)
     * 裝了偵測器（知道走哪條縫）時，干涉項消失，只剩兩個單縫圖樣相加。
     */
    function intensity(yMm) {
      const lam = sLam.get() * 1e-9;
      const d = sD.get() * 1e-3;
      const a = sW.get() * 1e-3;
      const Lm = sL.get();
      const sinT = (yMm * 1e-3) / Math.sqrt(Lm * Lm + Math.pow(yMm * 1e-3, 2));

      const beta = Math.PI * a * sinT / lam;
      const env = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);

      if (mode === "single") return env;
      if (mode === "sum" || cDetect.get()) {
        // 沒有干涉：兩條縫各自的繞射圖樣直接相加（強度相加，不是振幅相加）
        return 2 * env;
      }
      const alpha = Math.PI * d * sinT / lam;
      return env * 4 * Math.pow(Math.cos(alpha), 2);
    }

    /* 以拒絕採樣從強度分布抽出一顆光子的落點 */
    function sampleY() {
      const half = halfWidth();
      const peak = mode === "single" ? 1 : 4;
      for (let i = 0; i < 200; i += 1) {
        const y = (Math.random() * 2 - 1) * half;
        if (Math.random() * peak <= intensity(y)) return y;
      }
      return (Math.random() * 2 - 1) * half * 0.2;
    }

    function land() {
      hits.push(sampleY());
      if (hits.length > 20000) hits.shift();
    }

    /*
     * 條紋對比度 (Imax − Imin)/(Imax + Imin)
     *
     * 取樣範圍必須只涵蓋「一個條紋間距」的一半，不能掃過整個螢幕。
     * 因為單縫繞射的包絡本身就會由中央往外遞減，掃太寬的話，
     * 即使完全沒有干涉也會量到 0.46 的假對比度——那是包絡的起伏，
     * 不是條紋。限制在 ±Δx/2 之內，包絡幾乎是平的，量到的才是干涉條紋本身。
     */
    function visibility() {
      const window = fringeSpacing() / 2;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 200; i += 1) {
        const y = -window + (2 * window) * i / 200;
        const v = intensity(y);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      return hi + lo > 0 ? (hi - lo) / (hi + lo) : 0;
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const laserX = 46, slitX = W * 0.42;
      gSlit = slitX; gSpan = Math.max(1, W - 74 - slitX - 70);
      const screenX = slitX + 70 + gSpan * (sL.get() - 0.5) / 2.5;
      const cy = H / 2;
      const half = halfWidth();
      const mmToPx = (H - 70) / (2 * half);
      const py = yMm => cy - yMm * mmToPx;

      // 光具座：實驗室長桌上的導軌，雷射、狹縫板、光屏都立在滑座上
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, H - 20);
      AP.bench(ctx, 24, W - 24, H - 46, { pxPerCm: 6 });
      AP.carrier(ctx, laserX, H - 46, cy + 15);

      // 雷射：金屬外殼（圓柱漸層）＋散熱環＋出光口
      const lamColor = wavelengthColor(sLam.get());
      const lg = ctx.createLinearGradient(0, cy - 15, 0, cy + 15);
      lg.addColorStop(0, "rgb(150,156,170)");
      lg.addColorStop(0.35, "rgb(210,216,228)");
      lg.addColorStop(0.7, "rgb(126,132,148)");
      lg.addColorStop(1, "rgb(96,102,118)");
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(laserX - 30, cy - 15, 54, 30, 6) : ctx.rect(laserX - 30, cy - 15, 54, 30); ctx.fill();
      ctx.strokeStyle = "rgba(70,76,92,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      // 散熱環
      ctx.fillStyle = "rgba(96,102,118,0.7)";
      for (let i = 0; i < 3; i++) ctx.fillRect(laserX - 20 + i * 10, cy - 17, 4, 34);
      // 出光口
      const pg2 = ctx.createLinearGradient(0, cy - 7, 0, cy + 7);
      pg2.addColorStop(0, "rgb(70,76,92)"); pg2.addColorStop(0.5, "rgb(120,128,146)"); pg2.addColorStop(1, "rgb(60,66,80)");
      ctx.fillStyle = pg2;
      ctx.beginPath(); ctx.arc(laserX + 24, cy, 7, 0, Math.PI * 2); ctx.fill();
      D.disc(ctx, laserX + 24, cy, 3.4, { fill: lamColor, glow: lamColor, glowSize: 14 });
      D.text(ctx, sLam.get() + " nm", laserX - 2, cy + 34, { color: lamColor, size: 11, align: "center", weight: "700" });

      // 光束（速率高時像連續光束，速率低時只剩一顆一顆）
      const beamAlpha = Math.min(0.5, sRate.get() / 400 * 0.5);
      if (beamAlpha > 0.02) {
        ctx.save(); ctx.globalAlpha = beamAlpha;
        D.line(ctx, laserX + 26, cy, slitX - 6, cy, lamColor, 3);
        ctx.restore();
      }

      // 狹縫板
      const slitHalf = (sD.get() / 2) * mmToPx * 6;   // 視覺放大，否則看不見
      const openings = mode === "single" ? [0] : [-slitHalf, slitHalf];
      AP.carrier(ctx, slitX, H - 46, H - 50);
      AP.slitPlate(ctx, slitX, (24 + H - 54) / 2, H - 78, openings.map(o => o + cy - (24 + H - 54) / 2), 9, beamAlpha > 0.02 ? lamColor : null);
      if (mode !== "single") {
        // 縫距標註：兩縫之間畫帶箭頭的標註線
        const ay = Math.min(cy + slitHalf + 26, H - 60);
        D.line(ctx, slitX + 14, cy - slitHalf, slitX + 14, cy + slitHalf, "rgba(150,120,40,0.55)", 1.2);
        D.line(ctx, slitX + 9, cy - slitHalf, slitX + 19, cy - slitHalf, "rgba(150,120,40,0.55)", 1.2);
        D.line(ctx, slitX + 9, cy + slitHalf, slitX + 19, cy + slitHalf, "rgba(150,120,40,0.55)", 1.2);
        D.text(ctx, "d", slitX + 26, ay - 6, { color: "rgba(140,110,30,0.9)", size: 11, weight: "700" });
      }
      D.text(ctx, mode === "single" ? "單縫" : "雙縫 d=" + sD.get().toFixed(2) + "mm",
        slitX, H - 40, { color: PL.col("text-dim"), size: 11, align: "center" });

      // 偵測器：裝上去就看得到，關聯「知道路徑」與「條紋消失」
      if (cDetect.get() && mode !== "single") {
        openings.forEach(off => {
          D.disc(ctx, slitX - 18, cy + off, 6, { fill: PL.col("danger") });
        });
        D.text(ctx, "偵測器啟用", slitX - 26, cy - slitHalf - 18,
          { color: PL.col("danger"), size: 10.5, align: "right", weight: "700" });
      }

      // 飛行中的光子
      flying.forEach(p => {
        const x = laserX + 26 + p.progress * (screenX - laserX - 26);
        let y = cy;
        if (x > slitX) {
          const f = (x - slitX) / (screenX - slitX);
          y = cy + (py(p.y) - cy) * f;
        }
        D.disc(ctx, x, y, 2.6, { fill: lamColor, glow: lamColor, glowSize: 8 });
      });

      // 螢幕與累積的光點
      // 光屏正面：光點一顆一顆打上去，慢慢排成一條一條的亮紋
      AP.carrier(ctx, screenX + 18, H - 46, H - 50);
      const paper = AP.paperScreen(ctx, screenX + 18, (24 + H - 54) / 2, 40, H - 78);
      grip.place(screenX + 18, H - 74);
      hits.forEach((y, i) => {
        const Y = py(y);
        if (Y < 24 || Y > H - 54) return;
        ctx.save();
        ctx.globalAlpha = 0.6;
        D.disc(ctx, paper.x + 3 + ((i * 7919) % 97) / 97 * (paper.w - 6), Y, 1.5, { fill: lamColor });
        ctx.restore();
      });

      // 條紋位置標記
      const dx = fringeSpacing();
      if (mode === "double" && !cDetect.get()) {
        for (let n = -4; n <= 4; n += 1) {
          const Y = py(n * dx);
          if (Y < 30 || Y > H - 56) continue;
          D.line(ctx, screenX + 42, Y, screenX + 50, Y, m, 1.4);
        }
        D.text(ctx, "Δx=" + dx.toFixed(2) + "mm", screenX - 4, 18,
          { color: m, size: 10, weight: "700" });
      }

      const vis = visibility();
      PL.ui.caption(cv, cDetect.get() && mode === "double"
        ? "偵測器開啟：一旦知道光子走哪一條縫，干涉項消失，螢幕上只剩兩個單縫圖樣相加。"
        : mode === "sum"
          ? "這是兩條單縫各自圖樣的「相加」——沒有干涉。把它和雙縫比較，差的那一項就是干涉。"
          : mode === "single"
            ? "單縫只有繞射包絡，沒有細條紋。"
            : "每一顆光子落在哪裡是隨機的，但累積起來就是干涉圖樣。");

      rDx.set(dx, 3);
      rCount.set(hits.length, 0);
      rVis.set(vis, 2);
      rMode.set(mode === "double" && !cDetect.get() ? "有干涉" : "無干涉");
    }

    /* 可見光波長轉近似顏色，讓「換波長」在畫面上看得出來 */
    function wavelengthColor(nm) {
      let r = 0, g = 0, b = 0;
      if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
      else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
      else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
      else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
      else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
      else { r = 1; }
      const f = nm > 700 ? 0.4 : nm < 420 ? 0.4 : 1;
      return "rgb(" + Math.round(255 * r * f) + "," + Math.round(255 * g * f) + "," + Math.round(255 * b * f) + ")";
    }

    function chart() {
      cc.clear();
      const half = halfWidth();
      const peak = mode === "single" ? 1 : 4;
      const gph = PL.graph(cc, { x: 44, y: 14, w: cc.W - 58, h: cc.H - 36 },
        { x0: -half, x1: half, y0: 0, y1: 1.15 });
      gph.frame({ xlabel: "螢幕位置 (mm)", ylabel: "相對強度" });
      gph.grid(6, 4);

      // 實際落點的直方圖：光子越多越貼近理論曲線
      const bins = 60;
      const counts = new Array(bins).fill(0);
      hits.forEach(y => {
        const i = Math.floor((y + half) / (2 * half) * bins);
        if (i >= 0 && i < bins) counts[i] += 1;
      });
      const maxCount = Math.max(1, ...counts);
      counts.forEach((n, i) => {
        if (!n) return;
        const y0 = -half + (2 * half) * i / bins;
        const y1 = -half + (2 * half) * (i + 1) / bins;
        const h = n / maxCount;
        const x0 = gph.X(y0), x1 = gph.X(y1);
        D.rect(cc.ctx, x0, gph.Y(h), Math.max(1, x1 - x0 - 1), gph.Y(0) - gph.Y(h),
          { fill: "rgba(140,190,230,0.35)" });
      });

      gph.fn(y => intensity(y) / peak, { color: MC(), width: 2.2, samples: 320 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt && !paused) {
        // 依速率發射光子；速率低時真的就是一顆一顆
        emitTimer += dt * sRate.get();
        while (emitTimer >= 1) {
          emitTimer -= 1;
          flying.push({ progress: 0, y: sampleY() });
        }
        flying.forEach(p => { p.progress += dt * 1.4; });
        // 抵達螢幕就變成一個永久的光點
        const arrived = flying.filter(p => p.progress >= 1);
        arrived.forEach(p => hits.push(p.y));
        if (hits.length > 20000) hits.splice(0, hits.length - 20000);
        flying = flying.filter(p => p.progress < 1);
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

  /* 單狹縫繞射 —— 光具座：雷射 → 單狹縫 → 光屏，光屏正面攤開後對齊強度曲線
   *
   * 舊版整個畫面只有一張 sinc² 圖和右邊一條直立的亮帶，看不出實驗是怎麼做的。
   * 現在上方是光具座：雷射（顏色跟著波長）、寬度可調的單狹縫、光屏，
   * 狹縫後的光張開的角度跟著 λ/a 變；中間一條是「從正面看光屏」看到的亮紋，
   * 與下方強度曲線的橫軸一一對齊——中央亮紋的寬度就是兩個第一暗紋之間。
   */
  PL.register("diffraction", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sA = PL.ui.slider(L.controls, { label: "狹縫寬 a", min: 20, max: 120, step: 5, value: 60, unit: "", digits: 0, onInput: () => draw() });
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: () => draw() });
    PL.ui.note(L.controls, "狹縫越窄、波長越長，中央亮紋越寬——繞射越明顯。第一暗紋在 a sinθ = λ 的位置。");
    const rW = PL.ui.readout(L.readouts, { label: "中央亮紋半寬（相對）", unit: "" });
    const UM = 1.2;                                   // 光屏位置的顯示範圍（相對單位）
    /*
     * 狹縫寬在畫面上的開口：刻意畫得比真實比例大，讓上刀片可以用手拖。
     * 開口占板高 GAP0 ~ GAP0 + GAPK；拖曳把手就是下刀片的邊緣。
     */
    const GAP0 = 0.08, GAPK = 0.42;
    let gCy = 0, gPlate = 100;
    const grip = PL.ui.handle(cv, { slider: sA, label: "狹縫刀片（縫寬）",
      toValue: (x, y) => 20 + ((2 * (y - 15 - gCy) / gPlate) - GAP0) / GAPK * 100 });
    /*
     * 播放時：雷射的平面波前一道道打到狹縫板，只有開口那一段穿過去，
     * 之後以狹縫為中心向外擴散成弧形波前（惠更斯）。
     * 每段弧的亮度是該方向的振幅 |sinc|——中央方向最亮、第一暗紋方向完全沒有波，
     * 次亮紋方向淡淡的。縫越窄、λ 越長，亮的那一片張得越開。
     * 第一次開光時，波前要走到光屏，光屏才亮起來。
     */
    const clock = PL.motion.clock(() => draw());
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus, a = sA.get(), lam = sLam.get() / 40, col = nmColor(sLam.get()), ink = nmInk(sLam.get()), u1 = lam / a;
      const sinc = b => Math.abs(b) < 1e-4 ? 1 : (Math.sin(b) / b) ** 2;
      const I = u => sinc(Math.PI * a * u / lam);
      /* 上方：光具座（側視） */
      const sh = Math.round(H * 0.42), tableY = sh - 6, railY = tableY - 26, cyB = Math.round((16 + railY - 22) / 2);
      AP.labStrip(ctx, W, sh, tableY, {});
      AP.bench(ctx, 18, W - 18, railY, { pxPerCm: 5 });
      const lx = 100, sx = Math.round(W * 0.34), scx = W - 60, hS = (railY - 22 - cyB) * 2, sc = (hS / 2 - 4) / UM;
      const plateH = (railY - 16 - cyB) * 1.4, gapPx = plateH * (GAP0 + GAPK * (a - 20) / 100);
      gCy = cyB; gPlate = plateH;
      // 光走過的距離：沒按過播放（t = 0）就當作已經是穩定狀態
      const t = clock.t, played = t > 0, V = 170, sFront = played ? t * V : Infinity;
      const ox = sx + 4, Ldist = scx - 11 - ox, s2 = sFront - (ox - lx);
      const lit = played ? PL.clamp((s2 - Ldist) / 40, 0, 1) : 1;
      const wl = 9 + (sLam.get() - 400) / 300 * 9;     // 畫面上的波長（只做比例示意）
      AP.carrier(ctx, lx - 26, railY, cyB + 7);
      AP.laser(ctx, lx, cyB, 0, { len: 66 });
      D.text(ctx, sLam.get() + " nm", lx - 34, cyB - 14, { color: col, size: 10.5, align: "center", weight: "800" });
      // 擴束後的雷射光：寬度蓋過整個開口，平面波前一道道往右走
      const bh = plateH * (GAP0 + GAPK) / 2 + 3, bEnd = Math.min(sx - 5, lx + 2 + sFront);
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = ink; ctx.fillRect(lx + 2, cyB - bh, Math.max(0, bEnd - lx - 2), bh * 2); ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.9; D.line(ctx, lx + 2, cyB, bEnd, cyB, col, 2.4); ctx.restore();
      ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.75;
      const ph = ((played ? t * V : 0) % wl + wl) % wl;
      for (let x = lx + 4 + ph; x < bEnd; x += wl) { ctx.beginPath(); ctx.moveTo(x, cyB - bh); ctx.lineTo(x, cyB + bh); ctx.stroke(); }
      ctx.restore();
      // 狹縫後張開的光：中央亮紋（到第一暗紋）最亮，兩側次亮紋淡淡的；波前還沒到的地方不亮
      ctx.save();
      ctx.beginPath(); ctx.rect(ox, 0, Ldist, sh); ctx.clip();
      if (played) { ctx.beginPath(); ctx.arc(ox, cyB, Math.max(0, s2), 0, Math.PI * 2); ctx.clip(); }
      const fan = (u0, uA, alpha) => {
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath();
        ctx.moveTo(ox, cyB); ctx.lineTo(scx - 11, cyB + PL.clamp(u0, -UM, UM) * sc); ctx.lineTo(scx - 11, cyB + PL.clamp(uA, -UM, UM) * sc); ctx.closePath(); ctx.fill(); ctx.restore();
      };
      fan(-u1, u1, 0.22); fan(u1, 2 * u1, 0.07); fan(-2 * u1, -u1, 0.07);
      // 弧形波前：亮度 = 該方向振幅 |sinc|
      const phMax = Math.atan(UM * sc / Ldist), rMax = Math.hypot(Ldist, UM * sc), dph = 0.035;
      ctx.lineWidth = 1.6; ctx.strokeStyle = ink;
      const ph2 = played ? ((s2 % wl) + wl) % wl : 0;
      for (let r = ph2 + 2; r < Math.min(rMax, played ? s2 : Infinity); r += wl) {
        for (let p = -phMax; p < phMax; p += dph) {
          const amp = Math.sqrt(I(Math.tan(p + dph / 2) * Ldist / sc));
          if (amp < 0.04) continue;
          ctx.globalAlpha = 0.9 * amp;
          ctx.beginPath(); ctx.arc(ox, cyB, r, p, p + dph); ctx.stroke();
        }
      }
      ctx.restore();
      AP.slitPlate(ctx, sx, cyB, plateH, [0], gapPx, col);
      AP.carrier(ctx, sx, railY, cyB + plateH / 2 + 14);
      D.text(ctx, "單狹縫 a", sx, cyB - plateH / 2 - 7, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      // 把手放在下刀片邊緣下方一點：不蓋住開口，也不壓到上方的「單狹縫 a」標籤
      grip.place(sx, cyB + gapPx / 2 + 15);
      // 光屏（側視）：屏面上的亮度就是 sinc² 分布
      const paper = AP.paperScreen(ctx, scx, cyB, 18, hS);
      AP.carrier(ctx, scx, railY, cyB + hS / 2 + 20);
      for (let y = paper.y; y < paper.y + paper.h; y += 2) { ctx.globalAlpha = I((y - cyB) / sc) * lit; ctx.fillStyle = col; ctx.fillRect(paper.x + 1, y, paper.w - 2, 2); }
      ctx.globalAlpha = 1;
      D.text(ctx, "光屏", scx - 16, paper.y + 10, { color: PL.col("text-dim"), size: 10, align: "right" });
      /* 中間：從正面看光屏的亮紋，橫軸與下方的強度曲線對齊 */
      const gx = 44, gw = W - gx - 20, by = sh + 20, bh2 = 26;
      // 中央亮紋的標尺要在暗色亮紋條「之前」畫：墨色對比是依底下已畫的東西判斷，
      // 先畫暗條的話，淺色台上這條標尺會被當成畫在暗底上而變成淺色、看不見
      const cxB = gx + gw / 2, hw = u1 / UM * gw / 2;
      if (hw < gw / 2 - 4) {
        D.line(ctx, cxB - hw, by - 4, cxB + hw, by - 4, PL.col("text-dim"), 1.2);
        D.line(ctx, cxB - hw, by - 7, cxB - hw, by - 1, PL.col("text-dim"), 1.2); D.line(ctx, cxB + hw, by - 7, cxB + hw, by - 1, PL.col("text-dim"), 1.2);
        D.text(ctx, "中央亮紋", cxB + hw + 6, by - 2, { color: PL.col("text-dim"), size: 9.5 });
      }
      ctx.fillStyle = "rgb(18,20,26)"; ctx.fillRect(gx, by, gw, bh2);
      PL.theme.note(ctx, "rgb(18,20,26)", gx, by, gw, bh2);
      for (let x = 0; x < gw; x += 2) { ctx.globalAlpha = I(-UM + 2 * UM * x / gw) * lit; ctx.fillStyle = col; ctx.fillRect(gx + x, by + 1, 2, bh2 - 2); }
      ctx.globalAlpha = 1;
      D.text(ctx, lit < 1 ? "從正面看光屏（等光傳到）" : "從正面看光屏", gx + 6, by + bh2 - 8, { color: "rgba(230,236,248,0.75)", size: 9.5 });
      /* 下方：強度曲線 */
      const gy = by + bh2 + 26, gh = H - gy - 22;
      const g = PL.graph(cv, { x: gx, y: gy, w: gw, h: gh }, { x0: -UM, x1: UM, y0: 0, y1: 1.05 });
      g.frame({ title: "繞射強度分佈 I ∝ sinc²", xlabel: "光屏位置" }); g.grid(6, 4);
      g.fn(I, { color: col, width: 2.2, samples: 320 });
      g.vline(u1, { color: PL.col("text-faint"), dash: [3, 3], width: 1 });
      g.vline(-u1, { color: PL.col("text-faint"), dash: [3, 3], width: 1 });
      rW.set(u1, 3);
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 偏振
   *
   * 播放時沿光束畫出電場向量（從正面看偏振片的同一個視角：箭頭方向 = 電場在橫截面上的方向）。
   *   光源 → 偏振片1：自然光，每一小段波列的振動方向都不一樣，隨光一起往前走
   *   偏振片1 → 2   ：只剩沿透光軸（鉛直）的振動，振幅降為 1/√2（強度減半）
   *   偏振片2 之後   ：電場投影到第二片的透光軸上，振幅 × cosθ，強度 × cos²θ（馬呂士定律）
   * 照度計指針是有阻尼的機械指針：轉動偏振片後會晃一下才停在 cos²θ。
   */
  PL.register("polarization", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const sTh = PL.ui.slider(L.controls, { label: "兩偏振片夾角 θ", min: 0, max: 180, step: 1, value: 45, unit: "°", digits: 0, onInput: () => draw() });
    PL.ui.note(L.controls, "馬呂士定律：通過第二片後強度 I = I₀cos²θ；兩片垂直（90°）時全暗。");
    const rI = PL.ui.readout(L.readouts, { label: "穿透強度 I/I₀", unit: "" });
    // 直接抓第二片偏振片的轉鈕旋轉：轉鈕相對圓心的方向就是透光軸方向。
    // 滑桿 0–180° 對應轉鈕走右半圈（上 → 右 → 下）；手拖到左半圈時停在端點，
    // 不換算成 θ+180°——那樣轉鈕會突然跳到對面，學生會以為偏振片被翻了過去。
    let g2x = 0, gcy = 0;
    const grip = PL.ui.handle(cv, { slider: sTh, label: "偏振片2（旋轉）",
      toValue: (x, y) => { const d = Math.atan2(x - g2x, gcy - y) * 180 / Math.PI; return d >= 0 ? d : (y < gcy ? 0 : 180); } });
    const needle = PL.motion.follower(Math.cos(sTh.get() * Math.PI / 180) ** 2, { omega: 6, zeta: 0.28 });
    const clock = PL.motion.clock(dt => draw(dt));
    // 自然光每段波列的振動方向：用波列編號做固定的偽亂數，讓它跟著光往前走而不是原地閃爍
    const randAng = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * Math.PI; };
    function draw(dt) {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const th = sTh.get() * Math.PI / 180, cy = H * 0.46, I = Math.cos(th) ** 2;
      const p1x = W * 0.36, p2x = W * 0.62, r = 40;
      g2x = p2x; gcy = cy;
      const AP = PL.apparatus;
      /* 光具座上：光源箱 → 偏振片 1 → 偏振片 2 → 照度計 */
      AP.benchTop(ctx, W, H, H - 18);
      AP.bench(ctx, 30, W - 30, H - 44, { pxPerCm: 5 });
      AP.lampHouse(ctx, 86, cy, 0.9);
      AP.carrier(ctx, p1x, H - 44, cy + r + 20); AP.carrier(ctx, p2x, H - 44, cy + r + 20);
      // 光束（亮度分段）
      const beam = (x0, x1, alpha, col) => { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke(); ctx.restore(); };
      beam(90, p1x, 0.5, "#ffe08a"); beam(p1x, p2x, 0.5, MC()); beam(p2x, W - 96, Math.max(0.04, I * 0.9), MC());
      /* 電場向量：E = A cos(kx − ωt)，畫在每個取樣點上 */
      const light = PL.theme.isLight();
      const lamPx = 64, v = 70, t = clock.t, A0 = r * 0.62, A1 = A0 / Math.SQRT2;
      const eCol0 = light ? "#b8860b" : "#ffe9a8", eCol = light ? "#c2185b" : "#ffc1d8";
      const vec = (x, ang, amp, col) => {
        const e = amp * Math.cos(2 * Math.PI * (x - v * t) / lamPx);
        if (Math.abs(e) < 0.8) return;
        const dx = e * Math.sin(ang), dy = -e * Math.cos(ang);
        D.line(ctx, x, cy, x + dx, cy + dy, col, 1.6);
        D.disc(ctx, x + dx, cy + dy, 1.8, { fill: col });
      };
      ctx.save(); ctx.globalAlpha = 0.9;
      for (let x = 98; x < p1x - r * 0.2; x += 8) vec(x, randAng(Math.floor((x - v * t) / (lamPx * 0.5))), A0, eCol0);
      for (let x = p1x + 6; x < p2x - r * 0.2; x += 8) vec(x, 0, A1, eCol);
      // 通過偏振片2：只剩投影到它透光軸上的分量（cosθ 帶正負號，方向翻轉也照實畫）
      for (let x = p2x + 6; x < W - 100; x += 8) vec(x, th, A1 * Math.cos(th), eCol);
      ctx.restore();
      const disc = (x, ang, lab) => { AP.polarizer(ctx, x, cy, r, ang); D.arrow(ctx, x, cy, x + r * 0.8 * Math.sin(ang), cy - r * 0.8 * Math.cos(ang), { color: PL.col("accent-2"), width: 2.2 }); D.text(ctx, lab, x, cy - r - 12, { color: PL.col("text"), size: 11, align: "center", weight: "700" }); };
      disc(p1x, 0, "偏振片1"); disc(p2x, th, "偏振片2（θ=" + sTh.get() + "°）");
      grip.place(p2x + Math.sin(th) * (r + 6), cy - Math.cos(th) * (r + 6));
      D.text(ctx, "自然光", (98 + p1x - r) / 2, cy + r + 4, { color: PL.col("text-dim"), size: 10.5, align: "center" });
      D.text(ctx, "線偏振光", (p1x + p2x) / 2, cy + r + 4, { color: PL.col("text-dim"), size: 10.5, align: "center" });
      // 照度計：指針就是穿透強度（機械指針有慣性與阻尼）
      AP.carrier(ctx, W - 70, H - 44, cy + 30);
      AP.meter(ctx, W - 70, cy, 24, PL.clamp(needle.update(I, dt, clock.running), -0.05, 1.05), "照度");
      rI.set(I, 3);
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* 色散與稜鏡
   *
   * 舊版的出射彩色扇形是固定角度畫出來的，入射角怎麼調、色散角讀數都不變。
   * 現在每個顏色都真的用司乃耳定律追跡：火石玻璃（F2）的折射率依柯西公式
   * n(λ) = 1.5942 + 0.00895/λ²（λ 以 µm 計），紫光 n≈1.650、紅光 n≈1.613。
   * 入射角太小時光在第二面發生全反射，也照實畫出來。
   *
   * 播放時白光是各色光點疊在一起前進（間距 ∝ 波長）；進入玻璃後每一色都變慢、
   * 間距縮短為 1/n，紫光的 n 最大所以最慢——這就是它偏折最多的原因。
   * 光屏裝在可轉的臂上，始終對著出射光譜（分光儀的望遠鏡也是這樣轉過去找譜線）。
   */
  PL.register("dispersion", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sTh = PL.ui.slider(L.controls, { label: "入射角", min: 20, max: 70, step: 1, value: 45, unit: "°", digits: 0, onInput: () => draw() });
    PL.ui.note(L.controls, "折射率隨波長不同：紫光偏折最多、紅光最少，白光因此散成光譜。");
    const rSpread = PL.ui.readout(L.readouts, { label: "色散角（紫−紅）", unit: "°" });
    // 第一面的折射角在整個入射角範圍內都有定義（全反射只會發生在第二面），
    // 讓「入射角 → 折射角」這條關係在任何角度都量得到
    const rRef = PL.ui.readout(L.readouts, { label: "第一面折射角（550 nm）", unit: "°" });
    const nGlass = nm => 1.5942 + 0.00895 / Math.pow(nm / 1000, 2);
    const LAMS = [400, 450, 500, 550, 600, 650, 700];
    // 直接抓光源箱繞入射點轉：光源到入射點的方向與法線的夾角就是入射角
    let gP = { x: 0, y: 0 }, gN = { x: 1, y: 0 };
    const grip = PL.ui.handle(cv, { slider: sTh, label: "光源（入射角）",
      toValue: (x, y) => {
        const dx = gP.x - x, dy = gP.y - y, m = Math.hypot(dx, dy) || 1;
        const dot = (gN.x * dx + gN.y * dy) / m, cr = (gN.x * dy - gN.y * dx) / m;
        return -Math.atan2(cr, dot) * 180 / Math.PI;
      } });
    const clock = PL.motion.clock(() => draw());
    const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
    const dotp = (a, b) => a.x * b.x + a.y * b.y;
    // 向量形式的司乃耳定律；nrm 指向入射側。全反射時回傳 null
    function refract(d, nrm, eta) {
      const ci = -dotp(nrm, d), k = 1 - eta * eta * (1 - ci * ci);
      if (k < 0) return null;
      const c = eta * ci - Math.sqrt(k);
      return { x: eta * d.x + c * nrm.x, y: eta * d.y + c * nrm.y };
    }
    function hitSeg(o, d, a, b) {
      const ex = b.x - a.x, ey = b.y - a.y, den = d.x * ey - d.y * ex;
      if (Math.abs(den) < 1e-9) return null;
      const t = ((a.x - o.x) * ey - (a.y - o.y) * ex) / den, u = ((a.x - o.x) * d.y - (a.y - o.y) * d.x) / den;
      return t > 1e-6 && u >= 0 && u <= 1 ? { t, x: o.x + d.x * t, y: o.y + d.y * t } : null;
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus, light = PL.theme.isLight();
      const tableY = H - 22;
      const Lp = Math.min(W * 0.2, H * 0.36), hP = Lp * Math.sqrt(3) / 2;
      const cx = W * 0.4, cy = H * 0.36;
      const A = { x: cx, y: cy - hP * 2 / 3 }, B = { x: cx - Lp / 2, y: cy + hP / 3 }, C = { x: cx + Lp / 2, y: cy + hP / 3 };
      const faces = [[A, B], [B, C], [C, A]];
      // A→B→C 在 y 軸向下的畫布上是逆時針繞行，邊向量 (ex, ey) 的朝外法線是 (−ey, ex)
      const outN = faces.map(([a, b]) => { const ex = b.x - a.x, ey = b.y - a.y, m = Math.hypot(ex, ey); return { x: -ey / m, y: ex / m }; });
      AP.benchTop(ctx, W, H, tableY);
      // 稜鏡台：平台＋立柱
      AP.carrier(ctx, cx, tableY, B.y + 6);
      ctx.fillStyle = light ? "rgb(150,156,166)" : "rgb(120,128,140)"; ctx.fillRect(B.x - 10, B.y + 1, Lp + 20, 6);
      const P = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const th = sTh.get() * Math.PI / 180, Nin = { x: -outN[0].x, y: -outN[0].y };
      gP = P; gN = Nin;
      const din = rot(Nin, -th);
      const S = { x: P.x - 170 * din.x, y: P.y - 170 * din.y };
      // 追跡一個波長：入射面折射 → 玻璃內（可能全反射幾次）→ 由某一面射出
      function trace(nm) {
        const n = nGlass(nm), inner = [P];
        let d = refract(din, outN[0], 1 / n), cur = P, from = 0;
        for (let k = 0; k < 4; k++) {
          let best = null, bi = -1;
          faces.forEach(([a, b], i) => { if (i === from) return; const h = hitSeg(cur, d, a, b); if (h && (!best || h.t < best.t)) { best = h; bi = i; } });
          if (!best) break;
          inner.push({ x: best.x, y: best.y });
          const N = outN[bi], out = refract(d, { x: -N.x, y: -N.y }, n);
          if (out) return { n, inner, out, Q: best, face: bi, tir: k > 0 };
          const dn = dotp(d, N); d = { x: d.x - 2 * dn * N.x, y: d.y - 2 * dn * N.y };   // 全反射
          cur = best; from = bi;
        }
        return { n, inner, out: null, Q: inner[inner.length - 1], face: -1, tir: true };
      }
      const rays = LAMS.map(nm => Object.assign({ nm }, trace(nm)));
      const ends = [trace(400), trace(700)];
      // 光屏臂：對準中間色（550 nm）的出射方向；若它沒從第二面射出就停在預設方向
      const mid = rays[3], viaAC = mid.out && mid.face === 2;
      const aim = viaAC ? mid.out : rot({ x: 1, y: 0 }, 0.6), Q0 = viaAC ? mid.Q : C;
      const Dscr = Math.min(W * 0.36, (tableY - 40 - Q0.y) / Math.max(0.2, aim.y));
      const Sc = { x: Q0.x + aim.x * Dscr, y: Q0.y + aim.y * Dscr }, tan = { x: -aim.y, y: aim.x }, half = 52;
      const onScreen = (o, d) => { const den = dotp(d, aim); if (den < 0.05) return null; const t = dotp({ x: Sc.x - o.x, y: Sc.y - o.y }, aim) / den; return { x: o.x + d.x * t, y: o.y + d.y * t, t }; };

      // 光源箱（轉向入射點）
      ctx.save(); ctx.translate(S.x, S.y); ctx.rotate(Math.atan2(din.y, din.x)); AP.lampHouse(ctx, 0, 0, 0.62); ctx.restore();
      grip.place(S.x - din.x * 18, S.y - din.y * 18);
      // 法線（入射點）
      D.line(ctx, P.x - Nin.x * 46, P.y - Nin.y * 46, P.x + Nin.x * 40, P.y + Nin.y * 40, PL.theme.pale(0.4), 1, [4, 4]);
      AP.prismGlass(ctx, A, B, C);
      // 光屏（可轉臂上的白紙）
      ctx.save(); ctx.translate(Sc.x, Sc.y); ctx.rotate(Math.atan2(aim.y, aim.x));
      ctx.fillStyle = "rgb(246,245,238)"; ctx.fillRect(0, -half, 7, half * 2);
      ctx.strokeStyle = "rgba(90,96,110,0.9)"; ctx.lineWidth = 2; ctx.strokeRect(0, -half, 7, half * 2);
      ctx.restore();
      D.text(ctx, "光屏", Sc.x + tan.x * (half + 14), Sc.y + tan.y * (half + 14), { color: PL.col("text-dim"), size: 10.5, align: "center" });

      // 靜態光路：入射白光、玻璃內、出射各色
      const white = light ? "rgba(120,110,90,0.75)" : "rgba(255,248,225,0.85)";
      D.line(ctx, S.x, S.y, P.x, P.y, white, 3);
      D.text(ctx, "白光", (S.x + P.x) / 2 - 8, (S.y + P.y) / 2 - 10, { color: PL.col("text-dim"), size: 11, align: "right" });
      const t = clock.t, played = t > 0, c = 190;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, tableY); ctx.clip();
      rays.forEach(r => {
        const col = nmInk(r.nm);
        ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = col; ctx.lineWidth = 1.4;
        ctx.beginPath(); r.inner.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke();
        if (r.out) {
          const hit = r.face === 2 ? onScreen(r.Q, r.out) : null;
          r.end = hit || { x: r.Q.x + r.out.x * 400, y: r.Q.y + r.out.y * 400 };
          ctx.globalAlpha = 0.85; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(r.Q.x, r.Q.y); ctx.lineTo(r.end.x, r.end.y); ctx.stroke();
        }
        ctx.restore();
        // 光點：空氣中速率 c、玻璃中 c/n；頻率不變，所以間距（波長）在玻璃裡縮成 1/n
        const gap = 24 * r.nm / 700, o = { gap, r: 2.1, color: col, glow: 4, front: true };
        const L1 = Math.hypot(P.x - S.x, P.y - S.y);
        let L2 = 0; for (let i = 1; i < r.inner.length; i++) L2 += Math.hypot(r.inner[i].x - r.inner[i - 1].x, r.inner[i].y - r.inner[i - 1].y);
        const t1 = L1 / c, t2 = L2 * r.n / c;
        r.arrive = r.end ? t1 + t2 + Math.hypot(r.end.x - r.Q.x, r.end.y - r.Q.y) / c : Infinity;
        PL.motion.flow(ctx, [S, P], t * c, Object.assign({}, o, { glow: false, alpha: 0.85 }));
        // 玻璃裡七色幾乎同路，光暈會糊成一團，所以不加光暈、點也小一點
        PL.motion.flow(ctx, r.inner, (t - t1) * c / r.n, Object.assign({}, o, { gap: gap / r.n, glow: false, r: 1.8 }));
        if (r.end) PL.motion.flow(ctx, [r.Q, r.end], (t - t1 - t2) * c, o);
      });
      ctx.restore();

      // 光屏上的光譜：每 5 nm 取一點連成色帶；各色光真正抵達後才亮
      let prev = null;
      ctx.save(); ctx.lineWidth = 6; ctx.lineCap = "butt";
      for (let nm = 400; nm <= 700; nm += 5) {
        const r = trace(nm), hit = r.out && r.face === 2 ? onScreen(r.Q, r.out) : null;
        if (hit && prev && Math.hypot(hit.x - Sc.x, hit.y - Sc.y) < half) {
          const ray = rays.reduce((a, b) => Math.abs(b.nm - nm) < Math.abs(a.nm - nm) ? b : a);
          if (!played || t >= ray.arrive) {
            ctx.strokeStyle = nmColor(nm); ctx.beginPath();
            ctx.moveTo(prev.x + aim.x * 3.5, prev.y + aim.y * 3.5); ctx.lineTo(hit.x + aim.x * 3.5, hit.y + aim.y * 3.5); ctx.stroke();
          }
        }
        prev = hit;
      }
      ctx.restore();

      const okEnds = ends.every(r => r.out && r.face === 2);
      if (okEnds) {
        const a = Math.atan2(ends[0].out.y, ends[0].out.x) - Math.atan2(ends[1].out.y, ends[1].out.x);
        rSpread.set(Math.abs(a) * 180 / Math.PI, 2);
      } else rSpread.set("全反射");
      rRef.set(Math.asin(Math.sin(th) / nGlass(550)) * 180 / Math.PI, 1);
      if (!viaAC) D.text(ctx, "入射角太小：光在第二面全反射，從底面射出", 16, 24, { color: PL.col("danger"), size: 11.5 });
      D.text(ctx, "火石玻璃 n紫 = " + nGlass(400).toFixed(3) + "、n紅 = " + nGlass(700).toFixed(3), A.x, A.y - 12, { color: PL.col("text-faint"), size: 10.5, align: "center" });
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 繞射光柵 —— 光具座上的雷射、光柵片與光屏
   *
   * 舊版的各級光線用 10% 白色畫，淺色主題下幾乎看不見，光屏也浮在空中。
   * 現在三樣器材都立在光具座的滑座上，各級光線用雷射的顏色畫，
   * 第一級的偏折角 θ₁ 直接標在光柵旁邊：d sinθ = mλ。
   */
  PL.register("grating", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const sN = PL.ui.slider(L.controls, { label: "光柵刻線", min: 100, max: 600, step: 20, value: 300, unit: "線/mm", digits: 0, onInput: () => draw() });
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: () => draw() });
    PL.ui.note(L.controls, "d sinθ = mλ。刻線越密、波長越長，各級譜線分得越開。");
    const rD = PL.ui.readout(L.readouts, { label: "縫距 d", unit: "nm" });
    const rTh = PL.ui.readout(L.readouts, { label: "第一級角度", unit: "°" });
    const rOrders = PL.ui.readout(L.readouts, { label: "可見級數" });
    /*
     * 播放時：雷射的波前（垂直光束的短線，間距 ∝ λ）打到光柵，
     * 之後只沿 d sinθ = mλ 的方向各有一列波前前進——那是相鄰刻線的光程差
     * 剛好是整數個波長、彼此加強的方向；其餘方向互相抵消，所以什麼都沒有。
     * 各級波前走到光屏時亮點才出現；高級次的路徑較長，會晚一點亮。
     */
    const clock = PL.motion.clock(() => draw());
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const lines = sN.get(), d = 1e6 / lines, lam = sLam.get(), col = nmColor(lam);
      const AP = PL.apparatus;
      const tableY = H - 12, railY = tableY - 26, cy = Math.round((16 + railY - 20) / 2), gx = 150, scr = W - 52;
      AP.labRoom(ctx, W, H, tableY, {});
      AP.bench(ctx, 14, W - 14, railY, { pxPerCm: 5 });
      AP.carrier(ctx, gx - 64, railY, cy + 7);
      AP.laser(ctx, gx - 38, cy, 0, { len: 66 });
      D.text(ctx, lam + " nm", gx - 72, cy - 14, { color: col, size: 10.5, align: "center", weight: "800" });
      const half = railY - 24 - cy;
      const paper = AP.paperScreen(ctx, scr + 6, cy, 22, half * 2);
      AP.carrier(ctx, scr + 6, railY, cy + half + 20);
      D.text(ctx, "光屏", scr + 6, paper.y - 8, { color: PL.col("text-dim"), size: 10, align: "center" });
      let y1 = null;
      const t = clock.t, played = t > 0, c = 260, ink = nmInk(lam), wl = 8 + (lam - 400) / 300 * 8;
      const tIn = 34 / c;                                 // 波前從雷射口走到光柵的時間
      // 沿方向 (ux, uy) 從 (x0, y0) 出發的一列波前：每一道是垂直傳播方向的短線
      const fronts = (x0, y0, ux, uy, len, sDist, hw) => {
        const reach = Math.min(len, played ? sDist : Infinity);
        if (reach <= 0) return;
        const ph = played ? ((sDist % wl) + wl) % wl : 0;
        ctx.beginPath();
        for (let q = ph; q < reach; q += wl) {
          const x = x0 + ux * q, y = y0 + uy * q;
          ctx.moveTo(x - uy * hw, y + ux * hw); ctx.lineTo(x + uy * hw, y - ux * hw);
        }
        ctx.stroke();
      };
      ctx.save(); ctx.lineCap = "round";
      for (let mm = -5; mm <= 5; mm++) {
        const s = mm * lam / d;
        if (Math.abs(s) > 1) continue;
        const th = Math.asin(s), yy = cy + Math.tan(th) * (scr - gx);
        if (yy < paper.y + 4 || yy > paper.y + paper.h - 4) continue;
        if (mm === 1) y1 = yy;
        ctx.globalAlpha = mm === 0 ? 0.8 : 0.5; ctx.strokeStyle = col; ctx.lineWidth = mm === 0 ? 2.2 : 1.6;
        ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(scr, yy); ctx.stroke();
        const len = Math.hypot(scr - gx, yy - cy), sAfter = (t - tIn) * c;
        ctx.globalAlpha = 0.85; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
        fronts(gx, cy, Math.cos(th), Math.sin(th), len, sAfter, 5);
        // 亮點在該級波前抵達光屏後才出現
        const on = played ? PL.clamp((sAfter - len) / 24, 0, 1) : 1;
        ctx.globalAlpha = 1;
        if (on > 0) { ctx.save(); ctx.globalAlpha = on; D.disc(ctx, scr + 6, yy, mm === 0 ? 6 : 5, { fill: col, glow: col, glowSize: 10 }); ctx.restore(); }
        D.text(ctx, "m=" + mm, scr - 10, yy - 5, { color: PL.col("text-dim"), size: 9.5, align: "right" });
      }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.9; D.line(ctx, gx - 36, cy, gx - 4, cy, col, 2.4);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5; fronts(gx - 36, cy, 1, 0, 32, t * c, 7);
      ctx.restore();
      AP.carrier(ctx, gx, railY, cy + 48);
      AP.gratingSlide(ctx, gx, cy, 84);
      D.text(ctx, "光柵 " + lines + " 線/mm", gx, cy - 56, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      const th1 = Math.asin(PL.clamp(lam / d, -1, 1));
      if (y1 != null) {
        const R = 70;
        ctx.save(); ctx.strokeStyle = PL.col("text-dim"); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(gx, cy, R, 0, th1); ctx.stroke(); ctx.restore();
        D.text(ctx, "θ₁ = " + PL.fmt(th1 * 180 / Math.PI, 1) + "°", gx + R * Math.cos(th1 / 2) + 8, cy + R * Math.sin(th1 / 2) + 6, { color: PL.col("text"), size: 10.5, weight: "700" });
      }
      rD.set(d, 0); rTh.set(th1 * 180 / Math.PI, 1); rOrders.set("±" + Math.floor(d / lam));
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
