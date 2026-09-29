/* 模組十一 · 磁場與電磁感應 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#9575cd");
  const NP = "#ff6b6b", SP = "#5aa2ff";

  /* 載流導線的磁場 */
  PL.register("current-field", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0;
    const sI = PL.ui.slider(L.controls, { label: "電流 I", min: 1, max: 10, step: 0.5, value: 5, unit: "A", digits: 1 });
    const sDir = PL.ui.select(L.controls, { label: "電流方向", value: "out", options: [{ value: "out", label: "流出頁面 ⊙" }, { value: "in", label: "流入頁面 ⊗" }] });
    PL.ui.note(L.controls, "安培右手定則：大拇指指電流方向，四指環繞方向即磁場方向。B 與距離成反比。");
    const rB = PL.ui.readout(L.readouts, { label: "近處磁場（相對）", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, out = sDir.get() === "out", ccw = out ? 1 : -1, I = sI.get();
      const AP = PL.apparatus;
      /* 奧斯特實驗（俯視）：直導線垂直穿過一塊硬紙板，紙板上的鐵粉排成同心圓，小羅盤沿圓切線指向 */
      AP.deskTop(ctx, 0, 0, W, H);
      const card = Math.min(W, H) * 0.46;
      ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(cx - card + 4, cy - card + 5, card * 2, card * 2);
      ctx.fillStyle = PL.theme.isLight() ? "#f3f0e6" : "#d8d3c4"; ctx.fillRect(cx - card, cy - card, card * 2, card * 2);
      PL.theme.note(ctx, "#ece8dc", cx - card, cy - card, card * 2, card * 2);
      // 鐵粉：沿切線排的短線，離導線越近越密、越整齊
      {
        let sd = 91;
        const rnd = () => { sd = (sd * 1664525 + 1013904223) | 0; return ((sd >>> 8) & 0xffffff) / 0xffffff; };
        ctx.save(); ctx.beginPath(); ctx.rect(cx - card, cy - card, card * 2, card * 2); ctx.clip();
        ctx.strokeStyle = "rgba(50,50,56,0.55)"; ctx.lineWidth = 1;
        for (let i = 0; i < 900; i++) {
          const rr = 18 + Math.pow(rnd(), 0.8) * card * 1.35, a = rnd() * TAU;
          const keep = Math.min(1, (I / 5) * 60 / rr);
          if (rnd() > keep) continue;
          const px = cx + rr * Math.cos(a), py = cy + rr * Math.sin(a), ta = a + Math.PI / 2 + (rnd() - 0.5) * 0.25;
          ctx.beginPath(); ctx.moveTo(px - Math.cos(ta) * 2.5, py - Math.sin(ta) * 2.5); ctx.lineTo(px + Math.cos(ta) * 2.5, py + Math.sin(ta) * 2.5); ctx.stroke();
        }
        ctx.restore();
      }
      // 導線截面
      D.disc(ctx, cx, cy, 12, { fill: MC(), glow: MC(), glowSize: 12 });
      if (out) D.disc(ctx, cx, cy, 4, { fill: "#fff" });
      else { D.line(ctx, cx - 6, cy - 6, cx + 6, cy + 6, "#fff", 2); D.line(ctx, cx - 6, cy + 6, cx + 6, cy - 6, "#fff", 2); }
      // 場圈
      /*
       * 場圈的濃淡與箭頭長度代表磁場強度 B ∝ I / r。
       *
       * 舊版所有圈都畫成同一個 rgba(...,0.4)、箭頭一律 6 px，電流只影響動畫轉速。
       * 於是這個實驗把「B 與距離成反比」寫在說明裡，畫面上卻完全看不出來；
       * 暫停時調整電流更是毫無反應。現在把兩件事都畫進去：
       * 往外一圈比一圈淡（距離反比），拉大電流則整體變濃、箭頭變長。
       */
      const B0 = 28;                                   // 參考半徑，用來把 B 正規化
      for (let ri = 1; ri <= 5; ri++) {
        const R = 28 + ri * 26;
        const B = (I / 5) * (B0 / R);                  // 相對場強：I=5、r=28 時為 1
        D.ring(ctx, cx, cy, R, "rgba(149,117,205," + PL.fmt(Math.min(0.75, 0.12 + B * 0.42), 3) + ")",
          Math.min(3.2, 0.8 + B * 1.5));
        const a = ccw * (t * 0.6) + ri;
        const ax = cx + R * Math.cos(a), ay = cy + R * Math.sin(a), ta = a + ccw * Math.PI / 2;
        const len = Math.min(14, 3 + B * 7);
        D.arrow(ctx, ax - Math.cos(ta) * len, ay - Math.sin(ta) * len,
          ax + Math.cos(ta) * len, ay + Math.sin(ta) * len, { color: MC(), width: 1.6, head: 6 });
      }
      // 四個小羅盤擺在第三圈上：N 極沿磁場方向（逆時針或順時針）
      [0, 1, 2, 3].forEach(k => {
        const a = k * Math.PI / 2 + Math.PI / 4, R = 28 + 3 * 26;
        AP.compass(ctx, cx + R * Math.cos(a), cy + R * Math.sin(a), 13, a + ccw * Math.PI / 2);
      });
      rB.set(I, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt * sI.get(); draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 磁場與勞侖茲力 —— 亥姆霍茲線圈裡的粒子束管
   *
   * 舊版是一整片灰色磁極面上一個小圓，而且轉向畫反了：B 穿入畫面時，
   * 正電荷要逆時針轉，F = qv×B 才會指向圓心；舊版正電荷卻是順時針。
   * 半徑還多加了一個常數 20 px，於是「r 與 v 成正比、直線過原點」在圖上並不成立。
   *
   * 現在改成課堂上看得到的器材：一對亥姆霍茲線圈夾著玻璃球管，
   * 管內的低壓氣體被粒子撞到會發光，整圈軌跡直接亮出來。
   * 半徑太大就打到玻璃壁——實際操作時也真的會這樣。
   */
  PL.register("lorentz", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ang = 0;
    // r(cm) = K·v/B（m/q 取 1 的相對單位）；球管半徑 8 cm；粒子槍在球心下方 0.55 倍半徑處
    const K = 3.2, RB_CM = 8, GUN = 0.55, RIN = 0.96, RMAX = RB_CM * (RIN + GUN) / 2;
    PL.ui.section(L.controls, "粒子與磁場");
    const sV = PL.ui.slider(L.controls, { label: "速率 v", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1 });
    const sB = PL.ui.slider(L.controls, { label: "磁場 B", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1 });
    const sQ = PL.ui.select(L.controls, { label: "電荷", value: "neg", options: [{ value: "neg", label: "負電荷 −（電子束）" }, { value: "pos", label: "正電荷 +" }], onChange: () => ang = 0 });
    PL.ui.note(L.controls, "磁力恆垂直於速度，使帶電粒子作等速率圓周運動；半徑 r = mv/qB。B 穿入畫面時正電荷逆時針、負電荷順時針。v 太大或 B 太小，圓大到會打上玻璃壁。");
    const rR = PL.ui.readout(L.readouts, { label: "迴轉半徑 r", unit: "cm" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T（相對）", unit: "" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "迴轉半徑 r – 速率 v", cap: "r = mv/qB：定磁場下半徑與速率成正比（直線過原點）；磁場越強、斜率越小。虛線是球管裝得下的最大半徑。" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus, Lt = PL.theme.isLight();
      const v = sV.get(), B = sB.get(), pos = sQ.get() === "pos", dir = pos ? 1 : -1;
      const benchY = Math.round(H * 0.88);
      AP.labRoom(ctx, W, H, benchY, {});
      const Rb = Math.min(W * 0.19, benchY * 0.29, (benchY - 58) / 2.76), bx = W * 0.4, by = 28 + Rb * 1.38;
      const Rc = Rb * 1.3, tw = Rb * 0.16, ro = Rc + tw / 2, ri = Rc - tw / 2;
      const ox = Rb * 0.1, oy = -Rb * 0.07;                 // 後線圈的透視位移
      const coil = (cx, cy, back) => {
        ctx.save();
        const g = ctx.createRadialGradient(cx - ro * 0.3, cy - ro * 0.35, ri * 0.5, cx, cy, ro);
        if (back) { g.addColorStop(0, "rgb(130,80,40)"); g.addColorStop(1, "rgb(82,46,22)"); }
        else { g.addColorStop(0, "rgb(226,156,88)"); g.addColorStop(0.7, "rgb(186,112,52)"); g.addColorStop(1, "rgb(126,72,32)"); }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.arc(cx, cy, ri, 0, TAU, true); ctx.fill();
        ctx.strokeStyle = back ? "rgba(36,18,8,0.35)" : "rgba(92,50,18,0.45)"; ctx.lineWidth = 1;
        for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(cx, cy, ri + tw * k / 6, 0, TAU); ctx.stroke(); }
        ctx.strokeStyle = "rgba(24,14,6,0.65)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(cx, cy, ro, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, ri, 0, TAU); ctx.stroke();
        if (!back) { ctx.strokeStyle = "rgba(255,228,184,0.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, Rc, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke(); }
        ctx.restore();
      };
      const legs = (cx, cy, back) => {
        ctx.save(); ctx.lineCap = "round";
        [0.3, 0.7].forEach(f => {
          const a = Math.PI * f;
          ctx.strokeStyle = back ? "rgb(62,66,74)" : "rgb(104,110,122)"; ctx.lineWidth = back ? 6 : 7;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * ro * 0.96, cy + Math.sin(a) * ro * 0.96);
          ctx.lineTo(cx + Math.cos(a) * ro * 1.1, benchY - 8); ctx.stroke();
        });
        ctx.restore();
      };
      // 後線圈、底座
      legs(bx + ox, by + oy, true); coil(bx + ox, by + oy, true);
      AP.contactShadow(ctx, bx, benchY + 2, ro * 1.2);
      AP.steel(ctx, bx - ro * 1.22, benchY - 10, ro * 2.44, 10, -10);
      // 球管燈座：球底伸出玻璃頸，插在黑色電木座上
      AP.rrPath(ctx, bx - Rb * 0.2, by + Rb + 8, Rb * 0.4, benchY - 10 - (by + Rb + 8), 3);
      ctx.fillStyle = "rgb(38,38,44)"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(200,220,236,0.35)"; ctx.fillRect(bx - 7, by + Rb * 0.9, 14, Rb * 0.1 + 10);
      // 玻璃球：實驗在暗室裡做，球內偏暗，發光的粒子束才看得清楚
      const Rin = Rb * RIN;
      const gi = ctx.createRadialGradient(bx - Rb * 0.25, by - Rb * 0.3, Rb * 0.1, bx, by, Rb);
      gi.addColorStop(0, Lt ? "rgba(54,66,86,0.9)" : "rgba(24,32,46,0.94)");
      gi.addColorStop(1, Lt ? "rgba(26,34,48,0.94)" : "rgba(8,12,20,0.96)");
      ctx.fillStyle = gi; ctx.beginPath(); ctx.arc(bx, by, Rb, 0, TAU); ctx.fill();
      PL.theme.note(ctx, "rgb(30,38,52)", bx - Rb, by - Rb, Rb * 2, Rb * 2);
      // B 穿入畫面：叉叉越密代表磁場越強
      const bN = (B - 1) / 5, sp = Math.max(10, Math.round(Rb * (0.36 - bN * 0.17)));
      ctx.save(); ctx.beginPath(); ctx.arc(bx, by, Rin, 0, TAU); ctx.clip();
      ctx.strokeStyle = "rgba(200,214,236," + PL.fmt(0.16 + bN * 0.24, 2) + ")"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = bx - Rb + sp / 2; x < bx + Rb; x += sp) for (let y = by - Rb + sp / 2; y < by + Rb; y += sp) { ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x + 3, y - 3); }
      ctx.stroke(); ctx.restore();
      // 粒子槍：從球底伸上來的電極筒，槍口朝發射方向
      const gx = bx, gy = by + GUN * Rb;
      ctx.fillStyle = "rgb(118,126,138)"; ctx.fillRect(gx - 3, gy + 5, 6, by + Rin - gy - 5);
      D.rect(ctx, gx - 11, gy - 6, 22, 12, { fill: "rgb(152,160,174)", stroke: "rgba(20,24,30,0.7)", r: 3 });
      D.rect(ctx, gx + dir * 9 - 3, gy - 3.5, 6, 7, { fill: "rgb(84,90,102)" });
      D.disc(ctx, gx - dir * 5, gy, 2.2, { fill: "#ffb070", glow: "#ff9040", glowSize: 8 });
      D.text(ctx, "粒子槍", gx, gy + 22, { color: "rgba(214,224,240,0.85)", size: 10, align: "center" });
      // 軌跡：以槍口為起點的圓，圓心在槍口正上方 r 處
      const rcm = K * v / B, rp = rcm * Rb / RB_CM, cx0 = gx, cy0 = gy - rp;
      const P = th => ({ x: cx0 + dir * rp * Math.sin(th), y: cy0 + rp * Math.cos(th) });
      let thEnd = TAU;
      for (let i = 1; i <= 180; i++) { const th = TAU * i / 180, p = P(th); if (Math.hypot(p.x - bx, p.y - by) > Rin) { thEnd = th; break; } }
      const beam = pos ? "255,150,205" : "120,255,215";
      ctx.save(); ctx.beginPath(); ctx.arc(bx, by, Rin, 0, TAU); ctx.clip(); ctx.lineCap = "round";
      [[11, 0.1], [5, 0.22], [2.2, 0.92]].forEach(s => {
        ctx.strokeStyle = "rgba(" + beam + "," + s[1] + ")"; ctx.lineWidth = s[0];
        ctx.beginPath(); ctx.arc(cx0, cy0, rp, Math.PI / 2, Math.PI / 2 - dir * thEnd, pos); ctx.stroke();
      });
      ctx.restore();
      if (thEnd < TAU) {
        const hp = P(thEnd);
        D.disc(ctx, hp.x, hp.y, 5, { fill: "#fff0b0", glow: "rgb(" + beam + ")", glowSize: 16 });
        D.text(ctx, "打到玻璃壁", hp.x + (bx - hp.x) * 0.3, hp.y + (by - hp.y) * 0.3 + 16, { color: "#ffe08a", size: 11, align: "center", weight: "700" });
      } else {
        D.disc(ctx, cx0, cy0, 2.2, { fill: "rgba(230,236,248,0.85)" });
      }
      // 粒子本身與 v、F 箭頭
      const thp = ang % thEnd, p = P(thp), al = PL.clamp(rp * 0.8, 14, 34);
      if (thEnd >= TAU && rp > 14) {
        D.line(ctx, cx0, cy0, cx0, cy0 - rp, "rgba(230,236,248,0.5)", 1, [3, 3]);
        D.text(ctx, "r", cx0 + 5, cy0 - rp / 2 + 4, { color: "rgba(230,236,248,0.9)", size: 11, weight: "700" });
      }
      D.disc(ctx, p.x, p.y, 6, { fill: pos ? NP : SP, glow: pos ? NP : SP, glowSize: 10 });
      D.arrow(ctx, p.x, p.y, p.x + dir * Math.cos(thp) * al, p.y - Math.sin(thp) * al, { color: "#fff", width: 2, label: "v" });
      D.arrow(ctx, p.x, p.y, p.x + (cx0 - p.x) / rp * al * 0.85, p.y + (cy0 - p.y) / rp * al * 0.85, { color: "#ffc766", width: 2, label: "F" });
      // 玻璃的邊緣與反光
      ctx.save();
      ctx.strokeStyle = "rgba(214,232,246,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, Rb, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(bx, by, Rb * 0.9, Math.PI * 1.12, Math.PI * 1.4); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.13)"; ctx.beginPath(); ctx.ellipse(bx - Rb * 0.42, by - Rb * 0.52, Rb * 0.2, Rb * 0.09, -0.6, 0, TAU); ctx.fill();
      ctx.restore();
      // 前線圈（蓋在最上面）與順時針的線圈電流（直接畫，不走主題墨色，銅色底上才看得清楚）
      legs(bx, by, false); coil(bx, by, false);
      ctx.save(); ctx.fillStyle = "#fff4cc"; ctx.strokeStyle = "rgba(60,30,8,0.8)"; ctx.lineWidth = 1;
      [0.15, 0.65, 1.15, 1.65].forEach(f => {
        const a = Math.PI * f, x = bx + Math.cos(a) * Rc, y = by + Math.sin(a) * Rc, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a), hl = tw * 0.42;
        ctx.beginPath(); ctx.moveTo(x + tx * hl * 1.3, y + ty * hl * 1.3); ctx.lineTo(x - tx * hl + nx * hl, y - ty * hl + ny * hl); ctx.lineTo(x - tx * hl - nx * hl, y - ty * hl - ny * hl); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      ctx.restore();
      D.text(ctx, "線圈電流順時針 ⇒ 球管內 B 穿入畫面 ⊗", 16, 20, { color: PL.col("text-dim"), size: 11, weight: "700" });
      // 右側兩台電源：加速電壓（決定 v）與線圈電流（決定 B）
      const px0 = bx + ro + 24, sw = Math.min(150, W - 14 - px0);
      if (W - px0 > 200 && benchY - 108 > 130) {
        const cw = W - px0 - 16;
        AP.infoCard(ctx, px0, 40, cw, 62);
        D.text(ctx, "球管內充低壓氣體：", px0 + 10, 60, { color: PL.col("text"), size: 11, weight: "700" });
        D.text(ctx, "粒子撞到氣體分子會發光，", px0 + 10, 76, { color: PL.col("text-dim"), size: 10.5 });
        D.text(ctx, "所以整圈軌跡看得見。", px0 + 10, 91, { color: PL.col("text-dim"), size: 10.5 });
      }
      if (sw >= 84) {
        const top = AP.powerSupply(ctx, px0, benchY - 108, sw, 50, "I " + PL.fmt(B * 0.5, 2) + "A", { label: "線圈電流", knob: (B - 1) / 5, color: "rgb(130,230,255)" });
        const low = AP.powerSupply(ctx, px0, benchY - 54, sw, 50, "U " + Math.round(20 * v * v) + "V", { label: "加速電壓", knob: (v - 1) / 5 });
        // 導線從機身右側繞出去，不壓住面板上的字
        const ex = px0 + sw + 8, upY = benchY - 120;
        AP.cable(ctx, [top.red, { x: ex, y: top.red.y }, { x: ex, y: upY }, { x: bx + ro * 0.8, y: by + ro * 0.62 }], "rgb(186,54,48)", 2.4, 4);
        AP.cable(ctx, [top.black, { x: ex + 5, y: top.black.y }, { x: ex + 5, y: upY - 6 }, { x: bx + ro * 0.72, y: by + ro * 0.72 }], "rgb(40,44,52)", 2.4, 4);
        AP.cable(ctx, [low.red, { x: ex, y: low.red.y }, { x: ex, y: benchY + 5 }, { x: bx + Rb * 0.32, y: benchY + 5 }, { x: bx + Rb * 0.2, y: benchY - 30 }], "rgb(186,54,48)", 2.4, 2);
        AP.cable(ctx, [low.black, { x: ex + 5, y: low.black.y }, { x: ex + 5, y: benchY + 9 }, { x: bx + Rb * 0.36, y: benchY + 9 }, { x: bx + Rb * 0.2, y: benchY - 18 }], "rgb(40,44,52)", 2.4, 2);
      }
      rR.set(rcm, 2); rT.set(TAU / B, 2);
      // r–v 圖
      cc.clear();
      const gg = PL.graph(cc, { x: 36, y: 14, w: cc.W - 48, h: cc.H - 34 }, { x0: 0, x1: 6, y0: 0, y1: 20 });
      gg.frame({ xlabel: "v", ylabel: "r (cm)" }); gg.grid(6, 4);
      gg.hline(RMAX, { color: PL.col("text-faint"), dash: [4, 4], width: 1 });
      gg.label(0.15, RMAX, "管壁", { color: PL.col("text-faint"), size: 10, dy: -5 });
      gg.fn(vv => K * vv / B, { color: MC(), width: 2.2 });
      gg.dot(v, rcm, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => { if (dt) ang += sB.get() * dt * 0.9; draw(); });
    cv.onResize(draw); cc.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 電磁感應（法拉第定律） */
  /* 電磁感應（法拉第定律） —— 旗艦改版
   *
   * 這個主題最常見的誤解是「磁鐵放在線圈裡就會發電」。
   * 因此這一版把重點放在「變化率」上：
   *
   *   · 磁鐵停在線圈正中央——磁通量最大，但感應電動勢是零
   *   · 推得越快電動勢越大，磁通量的最大值卻完全沒變
   *   · 電流方向永遠反抗磁通量的改變（楞次定律），進去和出來反向
   *
   * 依 PhET 的原則，用認得出來的器材（磁鐵、線圈、檢流計指針），
   * 並且讓「停住就沒電」這件事立刻看得到。
   */
  PL.register("induction", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 860);

    let x = -1.2, v = 0, t = 0, mode = "manual", auto = 1;
    let history = [];

    PL.ui.section(L.controls, "磁鐵");
    /* 磁鐵位置原本只在迴圈裡同步，暫停時拉滑桿磁鐵不會移動——
       而「自己拉滑桿」本來就是這個實驗預設的操作方式。 */
    const sPos = PL.ui.slider(L.controls, { label: "磁鐵位置", min: -1.5, max: 1.5, step: 0.01, value: -1.2, unit: "", digits: 2,
      onInput: v => { if (mode === "manual") x = v; } });
    const sStrength = PL.ui.slider(L.controls, { label: "磁鐵強度", min: 0.4, max: 2.5, step: 0.1, value: 1.2, unit: "", digits: 1 });
    const sTurns = PL.ui.stepper(L.controls, { label: "線圈匝數 N", value: 20, min: 5, max: 60, step: 5 });

    PL.ui.section(L.controls, "推動方式");
    PL.ui.chipGroup(L.controls, {
      value: "manual",
      options: [
        { value: "manual", label: "自己拉滑桿" },
        { value: "slow", label: "自動·慢" },
        { value: "fast", label: "自動·快" }
      ],
      onChange: v2 => {
        mode = v2;
        auto = v2 === "fast" ? 1.6 : 0.55;
        if (v2 !== "manual") { x = -1.5; history = []; }
      }
    });

    PL.ui.note(L.controls,
      "把磁鐵慢慢推到線圈正中央再停住：磁通量此時最大，但指針會回到零——" +
      "產生電動勢的是「磁通量的變化」，不是磁通量本身。" +
      "接著比較自動慢與自動快：磁通量的最高點完全一樣，電動勢卻差很多。");

    const rFlux = PL.ui.readout(L.readouts, { label: "磁通量 Φ", unit: "" });
    const rEmf = PL.ui.readout(L.readouts, { label: "感應電動勢 ε", unit: "" });
    const rDir = PL.ui.readout(L.readouts, { label: "電流方向" });
    const rSpeed = PL.ui.readout(L.readouts, { label: "磁鐵速度", unit: "" });

    const charts = PL.el("div", "sim-charts", root);
    const w1 = PL.el("div", "sim-chart", charts);
    PL.el("div", "chart-title", w1).textContent = "磁通量 Φ 與感應電動勢 ε";
    const cvG = PL.canvas.create(w1, 0.5);
    PL.el("div", "cap", w1).textContent =
      "ε = −N·dΦ/dt。Φ 的最高點正好是 ε 的零點——山頂的斜率是零，這就是「最大值處沒有電動勢」的原因。";

    /*
     * 磁通量模型
     * 用高斯函數近似「磁鐵靠近線圈時穿過的磁通量」：中心最大、兩側衰減。
     * 這是教學用的簡化，重點是形狀對，微分之後才會出現正確的雙峰電動勢。
     */
    function flux(pos) {
      return sStrength.get() * Math.exp(-Math.pow(pos / 0.42, 2));
    }
    /* ε = −N dΦ/dt = −N (dΦ/dx)(dx/dt)，dΦ/dx 用中央差分 */
    function emf(pos, speed) {
      const dPhidx = (flux(pos + 0.005) - flux(pos - 0.005)) / 0.01;
      return -sTurns.get() * dPhidx * speed * 0.35;
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const cx = W * 0.46, cy = H * 0.44;
      const scale = W * 0.24;                       // 位置 1.0 對應的像素

      // 線圈：一圈一圈畫出來，匝數改變看得見
      const turns = Math.min(18, Math.round(sTurns.get() / 3));
      const coilW = 96, coilH = 74;
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, cy + coilH / 2 + 40);
      // 線軸的兩片端板，銅線繞在中間
      AP.steel(ctx, cx - coilW / 2 - 7, cy - coilH / 2 - 8, 6, coilH + 16, -12);
      AP.steel(ctx, cx + coilW / 2 + 1, cy - coilH / 2 - 8, 6, coilH + 16, -12);
      for (let i = 0; i < turns; i += 1) {
        const off = (i - (turns - 1) / 2) * (coilW / Math.max(1, turns));
        ctx.save();
        // 銅線有亮暗面，一圈一圈才看得出是繞上去的線而不是畫的橢圓
        const cg = ctx.createLinearGradient(cx + off - 9, 0, cx + off + 9, 0);
        cg.addColorStop(0, "rgb(140,86,40)");
        cg.addColorStop(0.35, "rgb(226,164,92)");
        cg.addColorStop(1, "rgb(150,94,44)");
        ctx.strokeStyle = cg; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx + off, cy, 9, coilH / 2, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      D.text(ctx, "N = " + sTurns.get() + " 匝", cx, cy + coilH / 2 + 24,
        { color: "#c98a4b", size: 11, align: "center", weight: "700" });

      // 磁鐵：南北極用顏色與字標示
      const mx = cx + x * scale;
      /*
       * 「磁鐵強度」原本只進到磁通量公式裡，磁鐵本身永遠畫成同樣大小，
       * 學生拉這根滑桿時畫面上找不到任何線索。
       * 改成磁鐵尺寸與周圍磁力線的密度都隨強度改變。
       */
      const strength = sStrength.get();
      const magW = 24 + strength * 8, magH = 18 + strength * 6;
      // 磁力線：強度越大畫得越多
      const lines = Math.round(2 + strength * 2);
      for (let i = 1; i <= lines; i += 1) {
        const rr = magH * 0.7 + i * 9;
        D.ring(ctx, mx, cy, rr, "rgba(209,73,91,0.16)", 1);
      }
      ctx.save();
      const ng = ctx.createLinearGradient(0, cy - magH / 2, 0, cy + magH / 2);
      ng.addColorStop(0, "rgb(226,110,124)"); ng.addColorStop(0.4, "rgb(196,64,84)"); ng.addColorStop(1, "rgb(140,38,54)");
      ctx.fillStyle = ng; ctx.fillRect(mx - magW, cy - magH / 2, magW, magH);
      const sg = ctx.createLinearGradient(0, cy - magH / 2, 0, cy + magH / 2);
      sg.addColorStop(0, "rgb(118,152,206)"); sg.addColorStop(0.4, "rgb(66,102,158)"); sg.addColorStop(1, "rgb(38,62,104)");
      ctx.fillStyle = sg; ctx.fillRect(mx, cy - magH / 2, magW, magH);
      ctx.strokeStyle = "rgba(22,26,34,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(mx - magW, cy - magH / 2, magW * 2, magH);
      ctx.restore();
      D.text(ctx, "N", mx - magW / 2, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.text(ctx, "S", mx + magW / 2, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });

      const phi = flux(x);
      const e = emf(x, v);

      // 導線與檢流計
      const gx = W * 0.83, gy = cy;
      AP.wire(ctx, [{ x: cx + coilW / 2 + 7, y: cy - coilH / 2 + 6 }, { x: gx - 30, y: gy - 26 }], "rgb(186,54,48)", 2.8);
      AP.wire(ctx, [{ x: cx + coilW / 2 + 7, y: cy + coilH / 2 - 6 }, { x: gx - 30, y: gy + 26 }], "rgb(58,96,168)", 2.8);
      AP.meter(ctx, gx, gy - 6, 26, 0.5 + Math.max(-0.5, Math.min(0.5, e * 0.5)), null);
      D.text(ctx, "檢流計", gx, gy + 52, { color: PL.col("text-faint"), size: 10, align: "center" });
      // 指針：偏轉角正比於電動勢，方向就是電流方向
      const maxE = 3.2;
      const ang = Math.max(-1, Math.min(1, e / maxE)) * 0.85;
      D.ring(ctx, gx, gy + 14, 30, PL.theme.pale(0.22), 1);
      D.line(ctx, gx, gy + 14, gx + Math.sin(ang) * 26, gy + 14 - Math.cos(ang) * 26,
        Math.abs(e) > 0.05 ? PL.col("danger") : PL.col("text-faint"), 2.4);
      D.disc(ctx, gx, gy + 14, 3, { fill: PL.theme.pale(0.5) });
      D.text(ctx, "0", gx, gy - 18, { color: PL.col("text-faint"), size: 9, align: "center" });

      // 感應電流的方向：楞次定律
      if (Math.abs(e) > 0.05) {
        const dirText = e > 0 ? "順時針（由右看）" : "逆時針（由右看）";
        D.text(ctx, dirText, cx, cy - coilH / 2 - 26,
          { color: PL.col("accent-2"), size: 11.5, align: "center", weight: "700" });
        // 線圈上的電流箭頭
        const flow = e > 0 ? 1 : -1;
        for (let i = 0; i < 3; i += 1) {
          const ax = cx - 30 + i * 30;
          D.arrow(ctx, ax, cy - coilH / 2 - 8, ax + flow * 18, cy - coilH / 2 - 8,
            { color: PL.col("accent-2"), width: 2, head: 6 });
        }
      } else {
        D.text(ctx, "沒有電流", cx, cy - coilH / 2 - 26,
          { color: PL.col("text-faint"), size: 11.5, align: "center" });
      }

      rFlux.set(phi, 3);
      rEmf.set(e, 3);
      rSpeed.set(Math.abs(v), 2);
      rDir.set(Math.abs(e) <= 0.05 ? "無" : (e > 0 ? "順時針" : "逆時針"));

      PL.ui.caption(cv, Math.abs(v) < 0.02 && Math.abs(x) < 0.15
        ? "磁鐵停在線圈正中央：磁通量此刻最大，但它沒有在變化，所以電動勢是零。"
        : Math.abs(v) < 0.02
          ? "磁鐵靜止：不管放在哪裡、磁鐵多強，只要磁通量不變，就沒有感應電動勢。"
          : "感應電動勢正比於磁通量的變化率，不是磁通量本身；方向永遠反抗這個變化。");
    }

    function chart() {
      cvG.clear();
      const span = 6;
      const recent = history.filter(p => p[0] > t - span);
      const gph = PL.graph(cvG, { x: 46, y: 14, w: cvG.W - 60, h: cvG.H - 34 },
        { x0: Math.max(0, t - span), x1: Math.max(span, t), y0: -3.4, y1: 3.4 });
      gph.frame({ xlabel: "t (s)" });
      gph.grid(6, 4);
      gph.hline(0, { color: PL.theme.pale(0.3), width: 1 });
      if (recent.length > 1) {
        gph.curve(recent.map(p => [p[0], p[1]]), { color: MC(), width: 2.2 });          // Φ
        gph.curve(recent.map(p => [p[0], p[2]]), { color: PL.col("accent-2"), width: 2.2 }); // ε
      }
      gph.label(Math.max(0, t - span) + 0.15, 3.0, "Φ 磁通量", { color: MC(), size: 10 });
      gph.label(Math.max(0, t - span) + 0.15, 2.4, "ε 電動勢", { color: PL.col("accent-2"), size: 10 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        if (mode === "manual") {
          /*
           * 拖曳滑桿時，input 事件不是每個影格都來，因此逐格算出來的
           * 瞬時速度會在「有動」與「完全沒動」之間跳，指針閃個不停。
           * 這裡做指數平滑：拖的時候讀數穩定，放手後幾個影格內衰減到零，
           * 「停住就沒有電動勢」這個結論仍然成立。
           */
          const target = sPos.get();
          const instant = Math.max(-6, Math.min(6, (target - x) / Math.max(dt, 1e-3)));
          v = v * 0.55 + instant * 0.45;
          if (Math.abs(v) < 0.02) v = 0;
          x = target;
        } else {
          x += auto * dt;
          v = auto;
          if (x > 1.5) { x = -1.5; }
          sPos.set(Math.max(-1.5, Math.min(1.5, x)));
        }
        history.push([t, flux(x), emf(x, v)]);
        if (history.length > 700) history.shift();
      }
      drawAll();
    }, 50);

    cv.onResize(scene); cvG.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cvG.destroy(); },
      rerender: drawAll
    };
  }});

  /* 楞次定律 —— 手拿磁鐵推進、拉出線圈，檢流計告訴你電流往哪走
   *
   * 舊版只有一塊磁鐵在線圈旁來回晃，「接近」模式其實有一半時間在遠離；
   * 沒有檢流計，也看不到感應電流在線圈上的方向。
   * 現在做成課本那四種情況（N/S 極 × 接近/遠離）：
   *   · 手推磁鐵進去（或拉出來），推動的那段時間檢流計才偏轉，停住就回零
   *   · 線圈正面畫出電流方向，近端感應出的磁極與磁鐵同極（接近）或異極（遠離）
   *   · 斥力／引力箭頭直接畫在磁鐵與線圈上
   */
  PL.register("lenz", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const P = 3.4;
    let t = P * 0.3;                     // 進場時磁鐵正在移動，一打開就看得到偏轉
    const sPole = PL.ui.select(L.controls, { label: "朝向線圈的磁極", value: "N", options: [{ value: "N", label: "N 極" }, { value: "S", label: "S 極" }] });
    const sMode = PL.ui.select(L.controls, { label: "磁鐵動作", value: "approach", options: [{ value: "approach", label: "接近線圈" }, { value: "leave", label: "遠離線圈" }] });
    PL.ui.note(L.controls, "感應電流的磁場總是反抗磁通量的變化：接近時排斥、遠離時吸引。磁鐵一停下來，檢流計就回到零。");
    const rFace = PL.ui.readout(L.readouts, { label: "線圈近端感應極" });
    const rForce = PL.ui.readout(L.readouts, { label: "磁鐵與線圈" });
    const rG = PL.ui.readout(L.readouts, { label: "檢流計" });
    // 中心零點檢流計：val −1..1
    function galvo(ctx, cx, baseY, w, val) {
      const AP = PL.apparatus, h = w * 0.8, x = cx - w / 2, y = baseY - h;
      AP.contactShadow(ctx, cx, baseY + 2, w * 0.6);
      AP.rrPath(ctx, x, y, w, h, 6); ctx.fillStyle = "rgb(58,64,74)"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      PL.theme.note(ctx, "rgb(58,64,74)", x, y, w, h);
      const fx = x + 6, fy = y + 6, fw = w - 12, fh = h * 0.6;
      AP.rrPath(ctx, fx, fy, fw, fh, 3); ctx.fillStyle = "rgb(246,242,230)"; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.stroke();
      PL.theme.note(ctx, "rgb(246,242,230)", fx, fy, fw, fh);
      const pcx = cx, pcy = fy + fh * 0.94, R = fh * 0.8;
      ctx.save(); ctx.strokeStyle = "rgba(40,44,52,0.85)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = -5; i <= 5; i++) {
        const a = -Math.PI / 2 + i * 0.12, r0 = i % 5 === 0 ? R * 0.7 : R * 0.82;
        ctx.moveTo(pcx + Math.cos(a) * r0, pcy + Math.sin(a) * r0); ctx.lineTo(pcx + Math.cos(a) * R * 0.95, pcy + Math.sin(a) * R * 0.95);
      }
      ctx.stroke(); ctx.restore();
      D.text(ctx, "−", pcx - R * 0.62, pcy - R * 0.5, { color: "#33363c", size: 10, align: "center", weight: "700" });
      D.text(ctx, "0", pcx, pcy - R * 0.55, { color: "#33363c", size: 9, align: "center" });
      D.text(ctx, "+", pcx + R * 0.62, pcy - R * 0.5, { color: "#33363c", size: 10, align: "center", weight: "700" });
      const a = -Math.PI / 2 + PL.clamp(val, -1, 1) * 0.6;
      ctx.save(); ctx.strokeStyle = "rgb(198,56,46)"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.lineTo(pcx + Math.cos(a) * R * 0.92, pcy + Math.sin(a) * R * 0.92); ctx.stroke(); ctx.restore();
      AP.brassDisc(ctx, pcx, pcy, 3);
      D.text(ctx, "G", cx, y + h - 8, { color: "#e8ecf2", size: 12, align: "center", weight: "800" });
      const tl = { x: x + 12, y: y + h - 11 }, tr = { x: x + w - 12, y: y + h - 11 };
      [[tl, "rgb(196,62,52)"], [tr, "rgb(34,38,46)"]].forEach(q => { D.disc(ctx, q[0].x, q[0].y, 4.5, { fill: q[1] }); AP.brassDisc(ctx, q[0].x, q[0].y, 2); });
      return { l: tl, r: tr };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus, s = PL.clamp(W / 700, 0.55, 1.5);
      const pole = sPole.get(), approach = sMode.get() === "approach", other = pole === "N" ? "S" : "N";
      const induced = approach ? pole : other;
      // 一個循環：停 → 移動（平滑加減速）→ 停住 → 淡出重來
      const u = (t % P) / P, k = PL.clamp((u - 0.08) / 0.5, 0, 1), sm = k * k * (3 - 2 * k);
      const speed = u > 0.08 && u < 0.58 ? 6 * k * (1 - k) / 1.5 : 0;   // 0..1
      const moving = speed > 0.02, alpha = u > 0.9 ? 1 - (u - 0.9) / 0.1 : 1;
      const benchY = Math.round(H * 0.8);
      AP.labRoom(ctx, W, H, benchY, {});
      const cy = benchY - 72 * s, coilX = W * 0.56, span = 120 * s, halfH = 44 * s;
      const hw = 44 * s, mh = 26 * s;
      const xNear = coilX - span / 2 - 20 * s - hw, xFar = xNear - 190 * s;
      const mx = approach ? xFar + (xNear - xFar) * sm : xNear + (xFar - xNear) * sm;
      const gsign = induced === "N" ? 1 : -1, g = moving ? gsign * speed : 0;
      // 線圈底座與線圈
      AP.woodBlock(ctx, coilX, benchY, span + 40 * s, cy + halfH + 8 * s < benchY ? benchY - (cy + halfH + 8 * s) : 6);
      AP.coilWinding(ctx, coilX, cy, span, halfH, 9);
      // 線圈兩端的感應磁極（只有電流流動時才存在）
      const ends = [[coilX - span / 2 - 16 * s, induced], [coilX + span / 2 + 16 * s, induced === "N" ? "S" : "N"]];
      if (moving) ends.forEach(e => {
        D.text(ctx, e[1], e[0], cy - halfH - 14 * s, { color: e[1] === "N" ? NP : SP, size: 16 * s, align: "center", weight: "800" });
      });
      // 線圈正面的電流方向：近端感應 N 極 ⇒ 正面電流向上
      if (moving) {
        [-0.3, 0, 0.3].forEach(f => {
          const x = coilX + f * span, dy = -gsign * (16 + 10 * speed) * s;
          D.arrow(ctx, x, cy - dy / 2, x, cy + dy / 2, { color: PL.col("warn"), width: 2.4, head: 7 });
        });
        D.text(ctx, "I", coilX + 0.3 * span + 10 * s, cy + 4, { color: PL.col("warn"), size: 12, weight: "800" });
      }
      // 導線接到檢流計
      const gw = 92 * s, gx = Math.min(W - gw / 2 - 12, coilX + span / 2 + 150 * s);
      const tm = galvo(ctx, gx, benchY, gw, g * 0.9);
      const lA = { x: coilX - span / 2, y: cy + halfH }, lB = { x: coilX + span / 2, y: cy + halfH };
      const routeA = [lA, { x: lA.x, y: benchY - 4 }, { x: tm.l.x - 14 * s, y: benchY - 4 }, tm.l];
      const routeB = [lB, { x: lB.x + 18 * s, y: benchY - 12 }, tm.r];
      AP.cable(ctx, routeA, "rgb(186,54,48)", 2.4, 2);
      AP.cable(ctx, routeB, "rgb(40,44,52)", 2.4, 3);
      if (moving) AP.flowDots(ctx, routeA, t, -gsign * 60 * speed, { r: 1.8, gap: 18 });
      // 磁鐵（可淡出）與手
      ctx.save(); ctx.globalAlpha = alpha;
      const nearX = mx + hw;                            // 朝向線圈的那一端
      // 近端磁力線：N 極向外、S 極向內
      [-1, 0, 1].forEach(j => {
        const x0 = nearX + 4, y0 = cy + j * mh * 0.3, x1 = nearX + 58 * s, y1 = cy + j * 30 * s;
        if (pole === "N") D.arrow(ctx, x0, y0, x1, y1, { color: "rgba(149,117,205,0.7)", width: 1.4, head: 5 });
        else D.arrow(ctx, x1, y1, x0, y0, { color: "rgba(149,117,205,0.7)", width: 1.4, head: 5 });
      });
      ctx.save(); ctx.translate(mx, 0); if (pole === "N") ctx.scale(-1, 1); AP.barMagnet(ctx, 0, cy, hw, mh); ctx.restore();
      PL.theme.note(ctx, "rgb(150,52,70)", mx - hw, cy - mh / 2, hw * 2, mh);
      D.text(ctx, other, mx - hw / 2, cy + 5 * s, { color: "#fff", size: 13 * s, align: "center", weight: "800" });
      D.text(ctx, pole, mx + hw / 2, cy + 5 * s, { color: "#fff", size: 13 * s, align: "center", weight: "800" });
      AP.hand(ctx, mx - hw + 10 * s, cy, 1, s, { pull: true });
      ctx.restore();
      // 速度與交互作用力（有電流時才有力）
      if (moving) {
        const vdir = approach ? 1 : -1;
        D.arrow(ctx, mx - 14 * s, cy + mh / 2 + 16 * s, mx - 14 * s + vdir * (24 + 26 * speed) * s, cy + mh / 2 + 16 * s, { color: PL.col("text-dim"), width: 1.8, label: "v" });
        const fdir = approach ? -1 : 1, fl = (18 + 22 * speed) * s, lab = approach ? "斥力" : "引力";
        D.arrow(ctx, mx, cy - mh / 2 - 14 * s, mx + fdir * fl, cy - mh / 2 - 14 * s, { color: PL.col("danger"), width: 2.4, label: lab });
        D.arrow(ctx, coilX, cy - halfH - 34 * s, coilX - fdir * fl, cy - halfH - 34 * s, { color: PL.col("danger"), width: 2.4, label: lab });
      }
      const cap = moving
        ? pole + " 極" + (approach ? "接近" : "遠離") + " → 線圈近端感應出 " + induced + " 極 → " + (approach ? "互相排斥，反抗接近" : "互相吸引，反抗遠離")
        : "磁鐵沒有在動：磁通量不變，沒有感應電流，檢流計指零";
      D.text(ctx, cap, W / 2, 24, { color: PL.col("text"), size: 12.5, align: "center", weight: "700" });
      // 課本的四種情況，現在這一種標亮
      const tx = 16, ty = 40, tw = Math.min(300, W * 0.42), rh = 18;
      if (W > 420) {
        AP.infoCard(ctx, tx, ty, tw, rh * 5 + 10);
        const cols = [tx + 10, tx + tw * 0.4, tx + tw * 0.7];
        ["情況", "線圈近端", "交互作用"].forEach((h, i) => D.text(ctx, h, cols[i], ty + 17, { color: PL.col("text-dim"), size: 10, weight: "700" }));
        [["N", 1], ["N", 0], ["S", 1], ["S", 0]].forEach((c, i) => {
          const yy = ty + 17 + rh * (i + 1), ind = c[1] ? c[0] : (c[0] === "N" ? "S" : "N"), cur = c[0] === pole && !!c[1] === approach;
          if (cur) D.rect(ctx, tx + 4, yy - 13, tw - 8, rh, { fill: "rgba(255,196,80,0.22)", r: 4 });
          D.text(ctx, c[0] + " 極" + (c[1] ? "接近" : "遠離"), cols[0], yy, { color: PL.col(cur ? "text" : "text-dim"), size: 10.5, weight: cur ? "700" : "400" });
          D.text(ctx, ind + " 極", cols[1], yy, { color: ind === "N" ? NP : SP, size: 10.5, weight: "700" });
          D.text(ctx, c[1] ? "排斥" : "吸引", cols[2], yy, { color: PL.col(cur ? "text" : "text-dim"), size: 10.5, weight: cur ? "700" : "400" });
        });
      }
      rFace.set(induced + (approach ? "（排斥）" : "（吸引）"));
      rForce.set(approach ? "互相排斥" : "互相吸引");
      rG.set(moving ? (g > 0 ? "向 + 偏轉" : "向 − 偏轉") : "歸零（磁鐵靜止）");
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 交流發電機 */
  /* 交流發電機 —— 中性面才是重點
   *
   * 學生會背 e = nBAω·sin(ωt)，但問「線圈轉到中性面時電動勢是多少」
   * 常常答「最大」——因為那時磁通量最大。這正好答反了。
   *
   * 中性面（線圈平面垂直於 B）的磁通量是極大值，而極值處的變化率是零，
   * 所以那一刻 e = 0，而且電流正要換向。這是本單元最關鍵、也最反直覺的一點，
   * 因此把「過中性面」做成會亮起來的判定，而不是埋在波形裡讓學生自己看。
   *
   * Φ 與 e 畫在同一張圖上（雙 y 軸），兩條線錯開四分之一週期——
   * Φ 的山頂正好對上 e 的零點，這比任何文字說明都有效。
   */
  PL.register("ac-generator", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 900);
    let t = 0, hist = [];

    PL.ui.section(L.controls, "發電機參數");
    const sN = PL.ui.stepper(L.controls, { label: "匝數 n", value: 50, min: 10, max: 200, step: 10, unit: "匝", digits: 0, onChange: reset });
    const sB = PL.ui.stepper(L.controls, { label: "磁感應強度 B", value: 0.5, min: 0.1, max: 2, step: 0.1, unit: "T", digits: 1, onChange: reset });
    const sW = PL.ui.stepper(L.controls, { label: "角速度 ω", value: 3, min: 0.5, max: 8, step: 0.5, unit: "rad/s", digits: 1, onChange: reset });
    const sR = PL.ui.stepper(L.controls, { label: "外電阻 R", value: 10, min: 1, max: 100, step: 1, unit: "Ω", digits: 0, onChange: reset });

    PL.ui.presets(L.controls, {
      label: "快捷轉速",
      options: [
        { label: "慢 1.5", apply: () => { sW.set(1.5); reset(); } },
        { label: "標準 3.0", apply: () => { sW.set(3); reset(); } },
        { label: "快 6.0", apply: () => { sW.set(6); reset(); } }
      ]
    });

    PL.ui.section(L.controls, "疊加層");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["field", "neutral", "flow"],
      options: [
        { value: "field", label: "磁感線" },
        { value: "neutral", label: "中性面" },
        { value: "normal", label: "法線 n̂" },
        { value: "flow", label: "電流流動" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    PL.ui.button(row, "回中性面", () => { t = 0; hist = []; update(); });
    PL.ui.button(row, "重置", reset);
    function reset() { t = 0; hist = []; update(); }

    PL.ui.note(L.controls,
      "線圈轉到中性面時，磁通量是最大值——但電動勢恰好是零。" +
      "山頂的斜率是零，這就是「磁通量最大處沒有電動勢」的原因。" +
      "而且電流每經過中性面一次就換向一次。按「回中性面」把線圈轉回那個位置再看一次。");

    const A = 0.02;                 // 線圈面積（m²），固定值
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rE = PL.ui.readout(L.readouts, { label: "瞬時電動勢 e", unit: "V" });
    const rE0 = PL.ui.readout(L.readouts, { label: "峰值 E₀ = nBAω", unit: "V" });
    const rRms = PL.ui.readout(L.readouts, { label: "有效值 E₀/√2", unit: "V" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const rPhi = PL.ui.readout(L.readouts, { label: "磁通量 Φ（單匝）", unit: "Wb" });
    const rAng = PL.ui.readout(L.readouts, { label: "轉角 θ（從中性面起）", unit: "°" });

    /*
     * 從中性面起算轉角 θ = ωt：
     *   Φ = B·A·cos θ        （中性面 θ=0 時最大）
     *   e = n·B·A·ω·sin θ    （中性面時為零，正要換向）
     */
    function model(tt) {
      const n = sN.get(), B = sB.get(), w = sW.get(), R = sR.get();
      const th = w * tt;
      const phi = B * A * Math.cos(th);
      const e = n * B * A * w * Math.sin(th);
      const E0 = n * B * A * w;
      return { n, B, w, R, th, phi, e, E0, rms: E0 / Math.SQRT2, T: TAU / w, i: e / R };
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = model(t);
      const cx = W * 0.30, cy = H * 0.46, R = Math.min(W * 0.13, H * 0.26);

      // 磁極靴與磁感線
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, cy + R + 42);
      AP.polePiece(ctx, cx - R - 46, cy - R * 0.9, 22, R * 1.8, true);
      D.text(ctx, "N", cx - R - 35, cy + 5, { color: "#fff", size: 14, align: "center", weight: "700" });
      AP.polePiece(ctx, cx + R + 24, cy - R * 0.9, 22, R * 1.8, false);
      D.text(ctx, "S", cx + R + 35, cy + 5, { color: "#fff", size: 14, align: "center", weight: "700" });
      if (layers.has("field")) {
        // 磁感線密度隨 B：這是 B 這根滑桿唯一看得見的地方
        const lines = PL.clamp(Math.round(2 + m.B * 3), 3, 9);
        for (let i = 0; i < lines; i += 1) {
          const y = cy - R * 0.8 + i * (R * 1.6 / Math.max(1, lines - 1));
          D.arrow(ctx, cx - R - 22, y, cx + R + 22, y, { color: "rgba(120,200,180,0.35)", width: 1.2, head: 5 });
        }
        D.text(ctx, "B = " + PL.fmt(m.B, 1) + " T", cx, cy - R - 22,
          { color: "rgba(120,200,180,0.8)", size: 10, align: "center" });
      }

      // 中性面：線圈平面垂直於 B 的位置
      if (layers.has("neutral")) {
        D.line(ctx, cx, cy - R - 10, cx, cy + R + 10, PL.col("ok"), 1.6, [5, 4]);
        D.text(ctx, "中性面", cx, cy - R - 34, { color: PL.col("ok"), size: 10, align: "center" });
      }

      // 轉動的線圈：以橢圓投影呈現，寬度 = R·|cosθ|
      const half = R * Math.cos(m.th);
      ctx.save();
      // 線圈是銅線，用漸層畫出亮暗面，和其他電磁實驗的線圈長得一樣
      const wg = ctx.createLinearGradient(cx - Math.abs(half), 0, cx + Math.abs(half), 0);
      wg.addColorStop(0, "rgb(140,86,40)");
      wg.addColorStop(0.35, "rgb(232,170,96)");
      wg.addColorStop(1, "rgb(150,94,44)");
      ctx.strokeStyle = wg; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1.5, Math.abs(half)), R, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      D.disc(ctx, cx + half, cy - R, 5, { fill: PL.col("accent-2") });
      D.disc(ctx, cx - half, cy + R, 5, { fill: PL.col("warn") });

      // 法線：直接顯示線圈平面的朝向，與 B 的夾角就是 θ
      if (layers.has("normal")) {
        const nx = Math.cos(m.th), ny = 0, nz = Math.sin(m.th);
        D.arrow(ctx, cx, cy, cx + nx * R * 0.8, cy - Math.abs(nz) * R * 0.35,
          { color: PL.col("accent-3"), width: 2, head: 7, label: "n̂" });
      }

      // 電流流動：方向隨 e 的正負反轉，密度隨電流大小
      if (layers.has("flow") && Math.abs(m.i) > 1e-4) {
        const dir = m.i >= 0 ? 1 : -1;
        const phase = (t * 1.2 * dir) % 1;
        const n = PL.clamp(Math.round(Math.abs(m.i) * 40), 3, 14);
        for (let i = 0; i < n; i += 1) {
          const f = ((i / n) + (phase + 1) % 1) % 1;
          const ang = f * TAU;
          D.disc(ctx, cx + Math.abs(half) * Math.cos(ang), cy + R * Math.sin(ang), 2.6,
            { fill: PL.col("warn") });
        }
      }

      // 轉角與磁通量的即時標示
      D.text(ctx, "轉角 θ = " + PL.fmt(m.th * 180 / Math.PI % 360, 0) + "°", cx, cy + R + 26,
        { color: PL.col("text-dim"), size: 11, align: "center" });

      PL.ui.caption(cv, Math.abs(Math.sin(m.th)) < 0.08
        ? "正在通過中性面：線圈平面垂直於 B，磁通量此刻最大——但變化率是零，所以 e = 0，而且電流正要換向。"
        : "電動勢 e = nBAω·sin θ 與磁通量 Φ = BA·cos θ 錯開四分之一週期：Φ 的極值正好是 e 的零點。");
    }

    /* Φ 與 e 同框（雙尺度）：兩條線錯開四分之一週期是本單元的核心圖像 */
    const chart = PL.ui.chart(PL.ui.charts(root), {
      title: "e − t 與 Φ − t 波形",
      cap: "e 與 Φ 錯開四分之一週期：Φ 過極值（中性面）時 e = 0；波形每次穿過橫軸，電流換向一次。"
    });

    function drawChart() {
      chart.clear();
      const m = model(t);
      const span = Math.max(2, m.T * 2);
      const g = PL.graph(chart, { x: 52, y: 18, w: chart.W - 76, h: chart.H - 46 },
        { x0: Math.max(0, t - span), x1: Math.max(span, t), y0: -m.E0 * 1.25, y1: m.E0 * 1.25 });
      g.frame({ xlabel: "t (s)", ylabel: "e (V)" });
      g.grid(6, 4);
      g.hline(0, { color: PL.col("text-faint"), width: 1.2 });
      g.hline(m.rms, { color: PL.col("ok"), dash: [4, 3], width: 1.2 });
      g.label(Math.max(0, t - span) + span * 0.02, m.rms + m.E0 * 0.06,
        "有效值 " + PL.fmt(m.rms, 2) + " V", { color: PL.col("ok"), size: 9.5 });

      const recent = hist.filter(p => p[0] > t - span);
      if (recent.length > 1) {
        g.curve(recent.map(p => [p[0], p[1]]), { color: MC(), width: 2.4 });
        // Φ 用同一張圖但自行縮放到相同高度，重點是相位差不是絕對值
        const scale = m.E0 / Math.max(1e-9, m.B * A);
        g.curve(recent.map(p => [p[0], p[2] * scale * 0.72]),
          { color: PL.col("warn"), width: 2, dash: [6, 4] });
      }
      g.label(Math.max(0, t - span) + span * 0.02, m.E0 * 1.08, "電動勢 e", { color: MC(), size: 10 });
      g.label(Math.max(0, t - span) + span * 0.02, m.E0 * 0.9, "磁通量 Φ（等比縮放）",
        { color: PL.col("warn"), size: 10 });
    }

    function update() {
      const m = model(t);
      draw(); drawChart();
      rE.set(m.e, 2); rE0.set(m.E0, 2); rRms.set(m.rms, 2);
      rT.set(m.T, 2); rPhi.set(m.phi, 4);
      rAng.set((m.th * 180 / Math.PI) % 360, 0);

      const nearNeutral = Math.abs(Math.sin(m.th)) < 0.08;
      if (nearNeutral) vd.set("過中性面：e = 0，電流換向", "warn");
      else if (m.e > 0) vd.set("電動勢為正（e = " + PL.fmt(m.e, 2) + " V）", "ok");
      else vd.set("電動勢為負（e = " + PL.fmt(m.e, 2) + " V），電流反向", "ok");
    }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        const m = model(t);
        hist.push([t, m.e, m.phi]);
        if (hist.length > 1200) hist.shift();
      }
      update();
    }, 50);
    cv.onResize(update); chart.onResize(update); update(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); chart.destroy(); }, rerender: update };
  }});

  /* 變壓器 */
  /* 變壓器 —— 理想變壓器與「誰決定誰」
   *
   * 學生都背得出 U₁/U₂ = n₁/n₂，但問「把負載換成更耗電的，原線圈電流會怎麼變」
   * 就答不出來。原因是課本只給了比例式，沒講因果方向，而這一題的因果是分岔的：
   *
   *   電壓：原邊決定副邊   （U₂ 由 U₁ 與匝數比決定）
   *   電流：副邊決定原邊   （I₂ 由負載決定，再回頭決定 I₁）
   *   功率：輸出決定輸入   （負載越重，輸入功率越大）
   *
   * 三個量三個方向，這正是「制約關係」面板要講的事。
   *
   * 另外補上兩個課本會特別強調、但模擬很少做的狀態：
   *   · 直流輸入 → 副邊沒有輸出（磁通量不變就沒有感應）
   *   · 空載 → 電流幾乎為零，但電壓照樣有
   */
  PL.register("transformer", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.52, 880);
    let t = 0;

    PL.ui.section(L.controls, "變壓器參數");
    const sNp = PL.ui.stepper(L.controls, { label: "原線圈匝數 n₁", value: 200, min: 20, max: 800, step: 20, unit: "匝", digits: 0, onChange: draw });
    const sNs = PL.ui.stepper(L.controls, { label: "副線圈匝數 n₂", value: 200, min: 20, max: 800, step: 20, unit: "匝", digits: 0, onChange: draw });
    const sVp = PL.ui.stepper(L.controls, { label: "輸入電壓 U₁", value: 220, min: 10, max: 400, step: 10, unit: "V", digits: 0, onChange: draw });
    const sR = PL.ui.stepper(L.controls, { label: "負載電阻 R", value: 440, min: 10, max: 2000, step: 10, unit: "Ω", digits: 0, onChange: draw });

    PL.ui.presets(L.controls, {
      label: "快捷預設",
      options: [
        { label: "升壓 1:2", hint: "副線圈匝數是原線圈的兩倍，電壓加倍、電流減半",
          apply: () => { sNp.set(200); sNs.set(400); draw(); } },
        { label: "降壓 4:1", hint: "電壓降為四分之一，電流變四倍",
          apply: () => { sNp.set(400); sNs.set(100); draw(); } },
        { label: "隔離 1:1", hint: "電壓不變，但原副邊在電路上完全分開",
          apply: () => { sNp.set(200); sNs.set(200); draw(); } }
      ]
    });

    PL.ui.section(L.controls, "電源與負載");
    const srcChips = PL.ui.chipGroup(L.controls, {
      value: "ac",
      options: [{ value: "ac", label: "交流 ~" }, { value: "dc", label: "直流 =" }],
      onChange: draw
    });
    const loadChips = PL.ui.chipGroup(L.controls, {
      value: "on",
      options: [{ value: "on", label: "接通" }, { value: "off", label: "空載" }],
      onChange: draw
    });
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["flux", "current"],
      options: [{ value: "flux", label: "磁通 Φ" }, { value: "current", label: "電流流向" }]
    });

    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    PL.ui.button(row, "重置", () => { sNp.set(200); sNs.set(200); sVp.set(220); sR.set(440); draw(); });

    PL.ui.note(L.controls,
      "先按「降壓 4:1」：電壓降成四分之一，但電流變成四倍——功率沒有變。" +
      "再把負載電阻調小（負載變重）：副線圈電流變大，原線圈電流跟著變大。" +
      "注意因果方向：電壓是原邊決定副邊，電流卻是副邊決定原邊。" +
      "最後把電源切成直流：磁通量不再變化，副邊完全沒有輸出。");

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rVs = PL.ui.readout(L.readouts, { label: "副線圈電壓 U₂", unit: "V" });
    const rIs = PL.ui.readout(L.readouts, { label: "副線圈電流 I₂", unit: "A" });
    const rIp = PL.ui.readout(L.readouts, { label: "原線圈電流 I₁", unit: "A" });
    const rP = PL.ui.readout(L.readouts, { label: "功率 P₁ = P₂", unit: "W" });

    const cz = PL.ui.causality(L.canvasWrap.parentNode, {
      title: "制約關係（誰決定誰）",
      rows: [
        { name: "電壓", tone: "a", note: "原 → 副：由原線圈電壓和匝數比決定。副邊接什麼負載都不會改變 U₂。" },
        { name: "電流", tone: "b", note: "副 → 原：I₂ 由負載決定，再依匝數比回頭決定 I₁。這是最常被搞反的一條。" },
        { name: "功率", tone: "c", note: "輸出 → 輸入：負載越重，輸出功率越大，輸入功率跟著變大。理想變壓器 P₁ = P₂。" }
      ]
    });

    /* 理想變壓器：不計損耗，P₁ = P₂ */
    function model() {
      const n1 = sNp.get(), n2 = sNs.get(), U1 = sVp.get(), R = sR.get();
      const ac = srcChips.get() === "ac";
      const loaded = loadChips.get() === "on";
      // 直流輸入：磁通量不變 → 沒有感應電動勢 → 副邊沒有輸出
      const U2 = ac ? U1 * n2 / n1 : 0;
      const I2 = ac && loaded ? U2 / R : 0;
      const I1 = ac && loaded ? I2 * n2 / n1 : 0;
      const P = U2 * I2;
      return { n1, n2, U1, U2, I1, I2, P, R, ac, loaded, ratio: n2 / n1 };
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = model();
      const cx = W * 0.5, cy = H * 0.46;
      const coreW = 92, coreH = 128;

      // 鐵芯：疊片矽鋼片疊成的口字形閉合磁路
      const AP = PL.apparatus;
      AP.circuitBoard(ctx, W, H, false);
      AP.ironCore(ctx, cx - coreW / 2, cy - coreH / 2, coreW, coreH, 18);

      // 磁通：交流時在鐵芯裡循環流動；直流時靜止且畫成灰色，一眼看出「沒有變化」
      if (layers.has("flux")) {
        const phase = m.ac ? (t * 1.4) % 1 : 0;
        const col = m.ac ? PL.col("accent-3") : PL.col("text-faint");
        for (let i = 0; i < 4; i += 1) {
          const f = (i / 4 + phase) % 1;
          const y = cy - coreH / 2 + 9 + f * (coreH - 18);
          D.arrow(ctx, cx - coreW / 2 + 9, y, cx - coreW / 2 + 9, y + 14,
            { color: col, width: 1.6, head: 5 });
          D.arrow(ctx, cx + coreW / 2 - 9, cy + coreH / 2 - 9 - f * (coreH - 18),
            cx + coreW / 2 - 9, cy + coreH / 2 - 23 - f * (coreH - 18),
            { color: col, width: 1.6, head: 5 });
        }
        D.text(ctx, m.ac ? "Φ 變化中" : "Φ 不變（直流）", cx, cy + 4,
          { color: col, size: 11, align: "center", weight: "700" });
      }

      // 線圈：匝數以實際圈數呈現，比例一眼可見
      /* 線圈：繞在鐵芯柱上的漆包銅線。匝數多的那一側線圈明顯繞得比較密，
         「匝數比決定電壓比」這件事因此看得見，而不只是讀數字。 */
      function coil(x, n, color, side) {
        const turns = PL.clamp(Math.round(n / 40), 3, 14);
        const half = (coreH - 26) / 2;
        ctx.save();
        ctx.translate(x, cy); ctx.rotate(Math.PI / 2);
        AP.coilWinding(ctx, 0, 0, half * 2 - 6, 12, turns, true);
        ctx.restore();
        D.text(ctx, (side === "p" ? "n₁ = " : "n₂ = ") + n + " 匝", x, cy + coreH / 2 + 18,
          { color, size: 11, align: "center", weight: "700" });
      }
      coil(cx - coreW / 2, m.n1, PL.col("accent-2"), "p");
      coil(cx + coreW / 2, m.n2, PL.col("danger"), "s");

      // 原邊迴路
      const lx = 60, rx = W - 60, ty = cy - coreH / 2 - 26, by = cy + coreH / 2 + 42;
      D.line(ctx, lx, ty, cx - coreW / 2, ty, PL.col("accent-2"), 2);
      D.line(ctx, lx, by, cx - coreW / 2, by, PL.col("accent-2"), 2);
      D.line(ctx, lx, ty, lx, by, PL.col("accent-2"), 2);
      D.ring(ctx, lx, cy, 17, PL.col("accent-2"), 2);
      D.text(ctx, m.ac ? "~" : "=", lx, cy + 6, { color: PL.col("accent-2"), size: 17, align: "center", weight: "700" });
      D.text(ctx, "U₁ = " + PL.fmt(m.U1, 0) + " V", lx + 4, ty - 10, { color: PL.col("accent-2"), size: 11, weight: "700" });
      D.text(ctx, "I₁ = " + PL.fmt(m.I1, 2) + " A", lx + 4, by + 16, { color: PL.col("accent-2"), size: 11 });

      // 副邊迴路
      D.line(ctx, cx + coreW / 2, ty, rx, ty, PL.col("danger"), 2);
      D.line(ctx, cx + coreW / 2, by, rx, by, PL.col("danger"), 2);
      if (m.loaded) {
        D.line(ctx, rx, ty, rx, cy - 16, PL.col("danger"), 2);
        D.line(ctx, rx, cy + 16, rx, by, PL.col("danger"), 2);
        // 燈泡：亮度隨功率
        const glow = PL.clamp(m.P / 200, 0, 1);
        D.disc(ctx, rx, cy, 14, {
          fill: m.P > 0.5 ? "rgba(255,214,120," + (0.25 + glow * 0.6) + ")" : PL.theme.shade(0.3),
          stroke: PL.col("warn"), width: 1.8,
          glow: m.P > 0.5 ? PL.col("warn") : null, glowSize: 6 + glow * 22
        });
        D.text(ctx, "R = " + PL.fmt(m.R, 0) + " Ω", rx, cy + 34,
          { color: PL.col("warn"), size: 10.5, align: "center" });
      } else {
        // 空載：把斷口畫出來，「有電壓但沒電流」才看得懂
        D.line(ctx, rx, ty, rx, cy - 22, PL.col("danger"), 2);
        D.line(ctx, rx, cy + 22, rx, by, PL.col("danger"), 2);
        D.disc(ctx, rx, cy - 22, 3, { fill: PL.col("danger") });
        D.disc(ctx, rx, cy + 22, 3, { fill: PL.col("danger") });
        D.text(ctx, "空載（斷路）", rx, cy + 4, { color: PL.col("text-faint"), size: 10, align: "center" });
      }
      D.text(ctx, "U₂ = " + PL.fmt(m.U2, 0) + " V", rx - 4, ty - 10,
        { color: PL.col("danger"), size: 11, align: "right", weight: "700" });
      D.text(ctx, "I₂ = " + PL.fmt(m.I2, 2) + " A", rx - 4, by + 16,
        { color: PL.col("danger"), size: 11, align: "right" });

      // 電流流動的點：密度隨電流大小，兩側可以直接比較
      if (layers.has("current") && m.ac) {
        const flow = (t * 0.6) % 1;
        const dots = (x0, y0, x1, y1, amps, color) => {
          if (amps <= 1e-6) return;
          const len = Math.hypot(x1 - x0, y1 - y0);
          const gap = PL.clamp(40 - amps * 12, 12, 40);
          const n = Math.floor(len / gap);
          for (let i = 0; i < n; i += 1) {
            const f = ((i + flow) / Math.max(1, n)) % 1;
            D.disc(ctx, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 2.4, { fill: color });
          }
        };
        dots(lx, ty, cx - coreW / 2, ty, m.I1, PL.col("accent-2"));
        dots(cx + coreW / 2, ty, rx, ty, m.I2, PL.col("danger"));
      }

      PL.ui.caption(cv, !m.ac
        ? "直流輸入：鐵芯裡的磁通量固定不變，沒有變化就沒有感應電動勢——副線圈完全沒有輸出。變壓器只能變交流。"
        : !m.loaded
          ? "空載：副線圈仍然有電壓 U₂，但電路斷開所以沒有電流，輸入功率也接近零。電壓與電流是兩回事。"
          : "匝數比決定電壓比，電壓比又決定電流比（方向相反）。理想變壓器不產生也不消耗功率：P₁ = P₂。");
    }

    function update() {
      const m = model();
      draw();
      rVs.set(m.U2, 1); rIs.set(m.I2, 2); rIp.set(m.I1, 2); rP.set(m.P, 1);

      cz.set(0, "U₁ " + PL.fmt(m.U1, 0) + "V　×" + PL.fmt(m.ratio, 2) + " →　U₂ " + PL.fmt(m.U2, 0) + "V");
      cz.set(1, "I₂ " + PL.fmt(m.I2, 2) + "A　×" + PL.fmt(m.ratio, 2) + " →　I₁ " + PL.fmt(m.I1, 2) + "A");
      cz.set(2, "P₂ " + PL.fmt(m.P, 1) + "W　=　P₁ " + PL.fmt(m.P, 1) + "W");

      if (!m.ac) vd.set("直流：磁通不變，副邊沒有輸出", "bad");
      else if (!m.loaded) vd.set("空載：有電壓、沒有電流", "warn");
      else if (Math.abs(m.ratio - 1) < 1e-9) vd.set("隔離變壓器 1:1（電壓不變，電路分開）", "ok");
      else if (m.ratio > 1) vd.set("升壓 1:" + PL.fmt(m.ratio, 2) + "（電壓升、電流降）", "ok");
      else vd.set("降壓 " + PL.fmt(1 / m.ratio, 2) + ":1（電壓降、電流升）", "ok");
    }

    const anim = PL.loop(dt => { if (dt) t += dt; update(); }, 40);
    cv.onResize(update); update(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: update };
  }});


  /* 質譜儀 —— 照班布里奇質譜儀的課本畫法做成器材
   *
   * 舊版的落點畫錯地方：離子沿半圓回到入口那條線上，亮點卻畫在底部偵測屏的另一處；
   * B 穿入畫面時正離子往右飛應該向上彎，舊版卻往下彎；預設參數下半徑還被夾到最小值 12 px。
   *
   * 現在：離子源在上、速度選擇器直立（右板 +、左板 −，E 向左，兩板間 B 穿入畫面），
   * 底片水平橫在磁場區頂端。離子向下射入 B ⊗ 的磁場區，受力向右、畫半圓後從下方打回底片，
   * 落點到入口的距離正好是直徑 2r，並在底片上留下一道感光痕。
   * 換質量不清除舊痕，同位素會在底片上排成一排；改 E 或 B 等於換一張新底片。
   */
  PL.register("mass-spec", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    let y = 0, ang = 0, phase = "acc", wait = 0, marks = [];
    const sE = PL.ui.slider(L.controls, { label: "選擇器電場 E", min: 1, max: 8, step: 0.5, value: 4, unit: "", digits: 1, onInput: newFilm });
    const sB = PL.ui.slider(L.controls, { label: "磁場 B", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1, onInput: newFilm });
    const sM = PL.ui.slider(L.controls, { label: "離子質量 m", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "射入離子", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "換新底片", () => { marks = []; draw(); });
    PL.ui.note(L.controls, "只有 v = E/B 的離子能直線穿過速度選擇器；進入磁場區後 r = mv/qB，落點離入口 2r ∝ m。換不同質量多射幾次，底片上會留下一排感光痕。");
    const rV = PL.ui.readout(L.readouts, { label: "選擇速率 v=E/B", unit: "" });
    const rR = PL.ui.readout(L.readouts, { label: "迴轉半徑 r", unit: "" });
    const rLand = PL.ui.readout(L.readouts, { label: "落點 ∝ m" });
    const rUnits = () => sM.get() * sE.get() / (sB.get() * sB.get());     // r = mv/qB = mE/(qB²)，相對單位
    function geo() {
      const W = cv.W, H = cv.H, s = PL.clamp(Math.min(W / 800, H / 560), 0.5, 1.6);
      const sx = Math.round(W * 0.16), srcTop = 12 * s, srcH = 40 * s, plateY = Math.round(H * 0.4);
      const accY = srcTop + srcH + 14 * s, selTop = accY + 22 * s, selBot = plateY - 16 * s;
      return { W, H, s, sx, srcTop, srcH, plateY, accY, selTop, selBot, x0: sx - 36 * s, x1: W - 16, yE: plateY + 7, y1: H - 32 * s, U: 95 * s };
    }
    const arcPt = (G, r, th) => ({ x: G.sx + r - r * Math.cos(th), y: G.yE + r * Math.sin(th) });
    function endAngle(G, r) {
      for (let i = 1; i <= 120; i++) { const th = Math.PI * i / 120, p = arcPt(G, r, th); if (p.x > G.x1 - 8 || p.y > G.y1 - 8) return th; }
      return Math.PI;
    }
    function reset() { const G = geo(); y = G.srcTop + G.srcH; ang = 0; phase = "acc"; wait = 0; }
    function newFilm() { marks = []; reset(); }
    reset();
    const dPath = (ctx, x, yy, w, h, r) => {          // 上緣平直、下緣圓角（D 形磁極）
      r = Math.max(0, Math.min(r, w / 2, h)); ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x + w, yy + h - r);
      ctx.arcTo(x + w, yy + h, x + w - r, yy + h, r); ctx.lineTo(x + r, yy + h); ctx.arcTo(x, yy + h, x, yy + h - r, r); ctx.closePath();
    };
    function draw() {
      const { ctx } = cv; cv.clear(); D.bg(cv);
      const G = geo(), { W, H, s, sx, plateY, selTop, selBot, x0, x1, yE, y1, U } = G;
      const AP = PL.apparatus, Lt = PL.theme.isLight();
      const E = sE.get(), B = sB.get(), v = E / B, ru = rUnits(), r = Math.max(3, ru * U), thEnd = endAngle(G, r);
      AP.labRoom(ctx, W, H, H - 18 * s, {});
      // 電磁鐵：銅線圈包著鐵磁極，磁極面就在離子飛行平面的後方
      const rr = Math.min(90 * s, (y1 - yE) * 0.45), cw = 10 * s;
      AP.contactShadow(ctx, (x0 + x1) / 2, y1 + cw + 4, (x1 - x0) * 0.5);
      dPath(ctx, x0 - cw, yE - 4, x1 - x0 + cw * 2, y1 - yE + cw + 4, rr + cw);
      const cg = ctx.createLinearGradient(0, yE, 0, y1 + cw);
      cg.addColorStop(0, "rgb(216,146,80)"); cg.addColorStop(1, "rgb(138,80,34)");
      ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = "rgba(60,30,10,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.strokeStyle = "rgba(92,50,18,0.4)";
      for (let k = 1; k < 3; k++) { const d = k * cw / 3; dPath(ctx, x0 - cw + d, yE - 4, x1 - x0 + cw * 2 - 2 * d, y1 - yE + cw + 4 - d, rr + cw - d); ctx.stroke(); }
      dPath(ctx, x0, yE, x1 - x0, y1 - yE, rr);
      const pg = ctx.createLinearGradient(x0, yE, x1, y1);
      pg.addColorStop(0, Lt ? "rgb(150,158,172)" : "rgb(84,92,106)"); pg.addColorStop(1, Lt ? "rgb(102,110,124)" : "rgb(48,54,66)");
      ctx.fillStyle = pg; ctx.fill();
      PL.theme.note(ctx, Lt ? "rgb(124,132,146)" : "rgb(64,70,84)", x0, yE, x1 - x0, y1 - yE);
      const bN = (B - 1) / 5, sp = Math.max(16, Math.round((46 - bN * 20) * s));
      ctx.save(); dPath(ctx, x0, yE, x1 - x0, y1 - yE, rr); ctx.clip();
      ctx.strokeStyle = "rgba(226,232,244," + PL.fmt(0.2 + bN * 0.25, 2) + ")"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = x0 + sp / 2; x < x1; x += sp) for (let yy = yE + sp / 2; yy < y1; yy += sp) { ctx.moveTo(x - 3.5, yy - 3.5); ctx.lineTo(x + 3.5, yy + 3.5); ctx.moveTo(x - 3.5, yy + 3.5); ctx.lineTo(x + 3.5, yy - 3.5); }
      ctx.stroke(); ctx.restore();
      D.text(ctx, "磁場區 B ⊗（電磁鐵的磁極）", x1 - 14 * s, y1 - 12 * s, { color: "rgba(238,242,250,0.88)", size: 10.5, align: "right", weight: "700" });
      // 離子源：氣體由細管送入，燈絲把它游離
      AP.steel(ctx, sx - 60 * s, G.srcTop + G.srcH * 0.38, 28 * s, 6 * s, 0);
      AP.steel(ctx, sx - 34 * s, G.srcTop, 68 * s, G.srcH, -24);
      PL.theme.note(ctx, "rgb(112,122,138)", sx - 34 * s, G.srcTop, 68 * s, G.srcH);
      D.text(ctx, "離子源", sx, G.srcTop + G.srcH * 0.46, { color: "#f4f6fa", size: 10.5 * Math.min(1, s * 1.2), align: "center", weight: "700" });
      D.disc(ctx, sx, G.srcTop + G.srcH - 6 * s, 2.5, { fill: "#ffb070", glow: "#ff9040", glowSize: 8 });
      // 加速電極：兩片之間留一道狹縫
      AP.steel(ctx, sx - 32 * s, G.accY, 27 * s, 5, 0); AP.steel(ctx, sx + 5 * s, G.accY, 27 * s, 5, 0);
      D.text(ctx, "加速", sx - 38 * s, G.accY + 6, { color: PL.col("text-dim"), size: 10, align: "right" });
      // 速度選擇器：左板 −、右板 +（E 向左）；兩板之間 B 穿入畫面
      const pw = 7 * s, gx = 18 * s, sh = selBot - selTop;
      ctx.fillStyle = "rgba(149,117,205,0.14)"; ctx.fillRect(sx - gx, selTop, gx * 2, sh);
      ctx.save(); ctx.strokeStyle = "rgba(149,117,205," + PL.fmt(0.35 + bN * 0.4, 2) + ")"; ctx.lineWidth = 1; ctx.beginPath();
      const sps = Math.max(12, (30 - bN * 14) * s);
      for (let yy = selTop + sps / 2; yy < selBot; yy += sps) [-0.5, 0.5].forEach(f => { const x = sx + f * gx; ctx.moveTo(x - 2.5, yy - 2.5); ctx.lineTo(x + 2.5, yy + 2.5); ctx.moveTo(x - 2.5, yy + 2.5); ctx.lineTo(x + 2.5, yy - 2.5); });
      ctx.stroke(); ctx.restore();
      const nE = 2 + Math.round((E - 1) / 7 * 4);
      for (let i = 0; i < nE; i++) { const yy = selTop + (i + 0.5) * sh / nE; D.arrow(ctx, sx + gx - 3, yy, sx - gx + 3, yy, { color: "rgba(255,190,80,0.8)", width: 1.2, head: 4 }); }
      AP.steel(ctx, sx - gx - pw, selTop, pw, sh, -12); AP.steel(ctx, sx + gx, selTop, pw, sh, 8);
      ctx.fillStyle = "rgba(80,130,220,0.7)"; ctx.fillRect(sx - gx - 2, selTop, 2, sh);
      ctx.fillStyle = "rgba(220,80,70,0.7)"; ctx.fillRect(sx + gx, selTop, 2, sh);
      D.text(ctx, "−", sx - gx - pw - 8 * s, selTop + 14, { color: "#5aa2ff", size: 14, align: "center", weight: "800" });
      D.text(ctx, "+", sx + gx + pw + 8 * s, selTop + 14, { color: "#ff6b6b", size: 14, align: "center", weight: "800" });
      // 速率不對的離子被推到板上（淡虛線）：太快偏向 + 板、太慢偏向 − 板
      ctx.save(); ctx.setLineDash([2, 3]); ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255,120,120,0.6)"; ctx.beginPath(); ctx.moveTo(sx, selTop); ctx.quadraticCurveTo(sx, selTop + sh * 0.45, sx + gx - 1, selTop + sh * 0.72); ctx.stroke();
      ctx.strokeStyle = "rgba(120,170,255,0.6)"; ctx.beginPath(); ctx.moveTo(sx, selTop); ctx.quadraticCurveTo(sx, selTop + sh * 0.35, sx - gx + 1, selTop + sh * 0.56); ctx.stroke();
      ctx.restore();
      const lx = sx + gx + pw + 16 * s;
      D.text(ctx, "速度選擇器", lx, selBot - 34 * s, { color: PL.col("text"), size: 11, weight: "700" });
      D.text(ctx, "qE = qvB ⇒ v = E/B", lx, selBot - 18 * s, { color: PL.col("text-dim"), size: 10 });
      if (W >= 600) D.text(ctx, "太快撞 + 板、太慢撞 − 板", lx, selBot - 3 * s, { color: PL.col("text-faint"), size: 9.5 });
      // 底片（偵測板）：水平橫在磁場區頂端，入口處留一道狹縫
      const fy = plateY - 4, fh = 8;
      AP.steel(ctx, x0 - cw, fy - 3, sx - 5 - (x0 - cw), fh + 6, -6);
      AP.steel(ctx, sx + 5, fy - 3, x1 + cw - sx - 5, fh + 6, -6);
      ctx.fillStyle = Lt ? "rgb(222,226,212)" : "rgb(176,182,168)"; ctx.fillRect(sx + 6, fy, x1 - sx - 6, fh);
      PL.theme.note(ctx, "rgb(206,210,196)", sx + 6, fy, x1 - sx - 6, fh);
      ctx.strokeStyle = "rgba(60,64,70,0.6)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let d = 0.5; sx + d * U < x1 - 4; d += 0.5) { const x = Math.round(sx + d * U) + 0.5; ctx.moveTo(x, fy + fh); ctx.lineTo(x, fy + fh - (d % 1 === 0 ? 5 : 3)); }
      ctx.stroke();
      D.text(ctx, "底片", x1 - 4, fy - 9, { color: PL.col("text-dim"), size: 10.5, align: "right", weight: "700" });
      marks.forEach(mk => {
        const mxp = sx + 2 * mk.r * U;
        if (mxp > x1 - 6) return;
        ctx.fillStyle = "rgba(46,30,70,0.88)"; ctx.fillRect(mxp - 2, fy, 4, fh);
        D.text(ctx, "m=" + PL.fmt(mk.m, 1), mxp, fy - 9, { color: PL.col("text-dim"), size: 9.5, align: "center" });
      });
      // 預測軌跡（虛線）與離子本身
      ctx.save(); ctx.strokeStyle = "rgba(255,226,140,0.55)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx + r, yE, r, Math.PI, Math.PI - thEnd, true); ctx.stroke(); ctx.restore();
      const inArc = phase !== "acc" && phase !== "sel", th = Math.min(ang, thEnd);
      const ip = inArc ? arcPt(G, r, th) : { x: sx, y };
      ctx.save(); ctx.strokeStyle = "rgba(120,190,255,0.75)"; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(sx, G.srcTop + G.srcH);
      if (inArc) { ctx.lineTo(sx, yE); ctx.arc(sx + r, yE, r, Math.PI, Math.PI - th, true); } else ctx.lineTo(sx, y);
      ctx.stroke(); ctx.restore();
      D.disc(ctx, ip.x, ip.y, 5, { fill: "#9ad6ff", glow: "#5aa2ff", glowSize: 9 });
      if (phase === "arc") { const cx = sx + r, fl = Math.min(22 * s, r * 0.8); D.arrow(ctx, ip.x, ip.y, ip.x + (cx - ip.x) / r * fl, ip.y + (yE - ip.y) / r * fl, { color: "#ffc766", width: 2, label: "F", lsize: 10 }); }
      if (phase === "hit") { D.disc(ctx, ip.x, ip.y, 6, { fill: "#fff0b0", glow: "#ffd27a", glowSize: 16 }); D.text(ctx, "半徑太大：打到腔壁", PL.clamp(ip.x, x0 + 70 * s, x1 - 70 * s), ip.y - 14, { color: "#ffe08a", size: 11, align: "center", weight: "700" }); }
      if (phase === "land") D.disc(ctx, sx + 2 * r, plateY, 7, { fill: "rgba(255,236,160,0.9)", glow: "#ffe08a", glowSize: 16 });
      // 右上方兩台電源：選擇器電壓（E）與電磁鐵電流（B）
      const px0 = lx + 150 * s, bw = Math.min(150 * s, (W - 16 - px0 - 12) / 2);
      if (bw >= 80) {
        const h = 50 * s, top = 16 * s;
        const e1 = AP.powerSupply(ctx, px0, top, bw, h, "E " + PL.fmt(E, 1), { label: "選擇器電壓", knob: (E - 1) / 7 });
        const e2 = AP.powerSupply(ctx, px0 + bw + 12, top, bw, h, "B " + PL.fmt(B, 1), { label: "電磁鐵電流", knob: (B - 1) / 5, color: "rgb(130,230,255)" });
        AP.cable(ctx, [e1.red, { x: e1.red.x, y: top + h + 12 * s }, { x: sx + gx + pw / 2, y: selTop }], "rgb(186,54,48)", 2.2, 6);
        AP.cable(ctx, [e1.black, { x: e1.black.x, y: top + h + 18 * s }, { x: sx - gx - pw / 2, y: selTop }], "rgb(40,44,52)", 2.2, 8);
        if (W >= 600 && plateY - (top + h) > 110 * s) {
          const ix = px0, iy = top + h + 34 * s, iw = bw * 2 + 12;
          AP.infoCard(ctx, ix, iy, iw, 48 * s);
          D.text(ctx, "底片上的感光痕：落點離入口 2r ∝ m", ix + 10, iy + 19 * s, { color: PL.col("text"), size: 10.5, weight: "700" });
          D.text(ctx, "換不同質量多射幾次，同位素會排成一排", ix + 10, iy + 36 * s, { color: PL.col("text-dim"), size: 10 });
        }
        AP.cable(ctx, [e2.red, { x: x1 - 44 * s, y: yE - 2 }], "rgb(186,54,48)", 2.2, 10);
        AP.cable(ctx, [e2.black, { x: x1 - 22 * s, y: yE - 2 }], "rgb(40,44,52)", 2.2, 10);
      }
      rV.set(v, 2); rR.set(ru, 2); rLand.set("2r = " + PL.fmt(2 * ru, 2));
    }
    function addMark() { const m = sM.get(); if (!marks.some(mk => Math.abs(mk.m - m) < 1e-6)) marks.push({ r: rUnits(), m }); }
    const anim = PL.loop(dt => {
      if (dt) {
        const G = geo(), r = Math.max(3, rUnits() * G.U), vpx = 170 * G.s;
        if (phase === "acc") { y += (60 * G.s + 4 * (y - G.srcTop - G.srcH)) * dt; if (y >= G.selTop) { y = G.selTop; phase = "sel"; } }
        else if (phase === "sel") { y += vpx * dt; if (y >= G.yE) { y = G.yE; phase = "arc"; ang = 0; } }
        else if (phase === "arc") {
          ang += vpx / r * dt;
          const te = endAngle(G, r);
          if (ang >= te) { ang = te; wait = 0; if (te >= Math.PI - 1e-9) { phase = "land"; addMark(); } else phase = "hit"; }
        } else { wait += dt; if (wait > 1.1) reset(); }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();

/* ------------------------------------------------------------------
   以下由 extended.js 移入（該檔在場景實物化之後超過單檔大小上限）
   ------------------------------------------------------------------ */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const AP = PL.apparatus;
  const color = () => PL.col("m-color", "#35e0cf");
  /* =========================================================================
     雙棒導軌：電磁剎車與動量傳遞（對應經典「雙棒導軌模型」）
     ========================================================================= */
  PL.register("rail-rods", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const AP = PL.apparatus;
    const c = color();

    const sB = PL.ui.slider(L.controls, { label: "磁場 B", min: 0.2, max: 2, step: 0.1, value: 0.8, unit: "T", digits: 1 });
    const sR = PL.ui.slider(L.controls, { label: "迴路電阻 R", min: 0.5, max: 6, step: 0.5, value: 2, unit: "Ω", digits: 1 });
    const sV0 = PL.ui.slider(L.controls, { label: "棒1初速 v₀", min: 1, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1, onInput: reset });
    PL.ui.note(L.controls,
      "棒1在磁場裡切割磁力線，迴路出現感應電流：快棒被安培力煞車、慢棒被推動。" +
      "注意 v–t 圖上兩條線收斂到同一條水平線——那就是動量守恆算出的共同速度，" +
      "少掉的動能變成了迴路的焦耳熱。改變 B 或 R，只改變「多久」收斂，不改變收斂到哪。");

    const rEmf = PL.ui.readout(L.readouts, { label: "感應電動勢 ε", unit: "V" });
    const rI = PL.ui.readout(L.readouts, { label: "感應電流 I", unit: "A" });
    const rF = PL.ui.readout(L.readouts, { label: "安培力 F", unit: "N" });
    const rQ = PL.ui.readout(L.readouts, { label: "已生焦耳熱", unit: "J" });

    /* 物理參數：導軌間距 L=0.8 m，兩棒質量各 1 kg，導軌光滑 */
    const Lm = 0.8, M1 = 1, M2 = 1;
    const PX_PER_M = 110;                    // 導軌長度對應的像素比例
    let v1 = 0, v2 = 0, x1 = 0, x2 = 0, t = 0, settled = 0, merged = false, vStar = 0, KE0 = 0;
    let history = [];

    function reset() {
      v1 = sV0.get(); v2 = 0;
      KE0 = 0.5 * M1 * v1 * v1;
      vStar = M1 * v1 / (M1 + M2);
      x1 = 1.2; x2 = 2.6; merged = false;      // 公尺
      t = 0; settled = 0; history = [];
    }
    reset();

    function drawScene() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const B = sB.get(), R = sR.get();
      const emf = B * Lm * (v1 - v2), I = emf / R, F = B * Lm * I;
      const rail1 = 78, rail2 = 234, rx0 = 56, rx1 = W - 40;
      const mToPx = x => rx0 + x * PX_PER_M;

      /* 俯視的實驗桌：導軌下方鋪一整片磁鐵，磁場垂直穿入桌面（×） */
      AP.deskTop(ctx, 0, 0, W, 282);
      const mg = ctx.createLinearGradient(0, rail1, 0, rail2);
      mg.addColorStop(0, "rgb(70,76,90)"); mg.addColorStop(1, "rgb(46,50,60)");
      ctx.fillStyle = mg; ctx.fillRect(rx0 - 10, rail1 + 4, rx1 - rx0 + 20, rail2 - rail1);
      PL.theme.note(ctx, "rgb(58,63,75)", rx0 - 10, rail1 + 4, rx1 - rx0 + 20, rail2 - rail1);
      ctx.save();
      ctx.strokeStyle = "rgba(214,176,255,0.55)"; ctx.lineWidth = 1.4;
      for (let y = rail1 + 22; y < rail2 - 6; y += 30) {
        for (let x = rx0 + 24; x < rx1; x += 34) {
          ctx.beginPath();
          ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4);
          ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4);
          ctx.stroke();
        }
      }
      ctx.restore();
      D.text(ctx, "磁鐵：B 垂直穿入桌面（×）", rx1 - 8, rail2 - 10, { color: "rgba(226,206,255,0.9)", size: 10, align: "right", weight: "700" });

      // 兩條導軌（鋼條）
      AP.steel(ctx, rx0, rail1, rx1 - rx0, 7, 4);
      AP.steel(ctx, rx0, rail2, rx1 - rx0, 7, 4);

      // 導體棒：1 號（主色）、2 號（紫）
      const rod = (xm, tint, lab) => {
        const px = mToPx(xm);
        const g = ctx.createLinearGradient(px - 5, 0, px + 5, 0);
        g.addColorStop(0, "rgba(255,255,255,0.35)");
        const cg = ctx.createLinearGradient(px - 6, 0, px + 6, 0);
        cg.addColorStop(0, "rgb(150,86,40)"); cg.addColorStop(0.45, "rgb(236,170,110)"); cg.addColorStop(1, "rgb(140,80,36)");
        ctx.fillStyle = cg; AP.rrPath(ctx, px - 6, rail1 - 8, 12, rail2 - rail1 + 16, 5); ctx.fill();
        ctx.strokeStyle = "rgba(60,30,10,0.7)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = tint; ctx.fillRect(px - 6, rail1 - 8, 12, 6); ctx.fillRect(px - 6, rail2 + 2, 12, 6);
        D.text(ctx, lab, px, rail2 + 24, { color: tint, size: 10.5, align: "center", weight: "700" });
        // 速度箭頭
        const vpx = (lab === "棒1" ? v1 : v2) * 16;
        if (Math.abs(vpx) > 4) D.arrow(ctx, px, rail1 - 22, px + vpx, rail1 - 22, { color: tint, width: 2.2, label: "v", lsize: 10 });
        return px;
      };
      const p1 = rod(Math.min(x1, x2 - 0.35), c, "棒1");
      const p2 = rod(Math.max(x2, x1 + 0.35), PL.col("accent-3"), "棒2");
      // 安培力箭頭：快棒受力與運動反向（煞車）、慢棒同向（推動）——兩棒力等大反向
      const Fnow = sB.get() * Lm * Math.abs(sB.get() * Lm * (v1 - v2) / Math.max(0.05, sR.get()));
      const Flen = Math.min(44, 6 + Fnow * 26);
      if (Flen > 9) {
        const dir1 = Math.sign(v1 - v2 || 1);
        D.arrow(ctx, p1, rail1 - 40, p1 - dir1 * Flen, rail1 - 40, { color: PL.col("danger"), width: 2.2, label: "F₁", lsize: 10 });
        D.arrow(ctx, p2, rail1 - 40, p2 + dir1 * Flen, rail1 - 40, { color: PL.col("danger"), width: 2.2, label: "F₂", lsize: 10 });
      }

      // 感應電流：迴路箭頭（只在有電流時出現，方向依相對速度）
      // 棒1向右、B 向內 ⇒ 棒1 內電流往上（畫布 −y），繞外圈回到棒2 往下
      if (Math.abs(I) > 0.02) {
        const sgn = Math.sign(I);
        const midX = (p1 + p2) / 2;
        D.arrow(ctx, midX, rail1 - 8, midX + sgn * 26, rail1 - 8, { color: PL.col("warn"), width: 2 });
        D.arrow(ctx, midX, rail2 + 10, midX - sgn * 26, rail2 + 10, { color: PL.col("warn"), width: 2 });
        A_arrowVert(p1, rail1 + 14, sgn > 0 ? -1 : 1);
        A_arrowVert(p2, rail1 + 14, sgn > 0 ? 1 : -1);
      }
      function A_arrowVert(x, y, dir) {
        D.arrow(ctx, x, y, x, y + dir * 24, { color: PL.col("warn"), width: 2 });
      }

      // 讀值晶片
      AP.valueChip(ctx, rx0 + 6, rail2 + 40, "I = " + PL.fmt(Math.abs(I), 2) + " A", "rgba(255,196,110,0.9)");
      AP.valueChip(ctx, rx1 - 150, rail2 + 40, "F = " + PL.fmt(Math.abs(F), 2) + " N", "rgba(255,150,140,0.9)");

      // v–t 圖：兩棒速度收斂到共同速度
      const bx = 44, byB = 292, bw = W - 88, bh = H - byB - 26;
      const g = PL.graph(cv, { x: bx, y: byB, w: bw, h: bh }, { x0: 0, x1: 14, y0: 0, y1: Math.max(1.2, sV0.get() * 1.15) });
      g.frame({ title: "v – t：兩棒收斂到動量守恆的共同速度 v*", xlabel: "t (s)" }); g.grid(4, 2);
      const win = history.filter(p => p[0] > t - 14);
      if (win.length > 1) {
        g.curve(win.map(p => [p[0] - (t - 14), p[1]]), { color: c, width: 2.1 });
        g.curve(win.map(p => [p[0] - (t - 14), p[2]]), { color: PL.col("accent-3"), width: 2.1 });
      }
      g.hline(vStar, { color: PL.col("ok"), dash: [5, 4], width: 1.3 });
      g.label(0.4, vStar, "v* = " + PL.fmt(vStar, 2) + " m/s（動量守恆）", { color: PL.col("ok"), size: 9.5 });
      g.dot(Math.min(14, t), v1, { color: c, glow: c });

      // 收斂提示
      if (settled > 0) {
        D.text(ctx, (merged ? "兩棒接觸" : "磁場完成動量傳遞") + "：以共同速度 v* = " + PL.fmt(vStar, 2) + " m/s 一起前進，電流歸零", W / 2, 22,
          { color: PL.col("ok"), size: 11.5, align: "center", weight: "700" });
        D.text(ctx, "少掉的動能 " + PL.fmt(KE0 - 0.5 * (M1 + M2) * vStar * vStar, 3) + " J 已變成迴路的焦耳熱", W / 2, 38,
          { color: PL.col("text-faint"), size: 10.5, align: "center" });
      }

      rEmf.set(Math.abs(emf), 2); rI.set(Math.abs(I), 2); rF.set(Math.abs(F), 2);
      const Q = Math.max(0, KE0 - 0.5 * M1 * v1 * v1 - 0.5 * M2 * v2 * v2);
      rQ.set(Q, 3);
    }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        const B = sB.get(), R = sR.get();
        const emf = B * Lm * (v1 - v2), I = emf / R, F = B * Lm * I;
        // 安培力：快棒減速、慢棒加速（一對交互作用，靠磁場傳遞動量）
        v1 -= (F / M1) * dt * Math.sign(v1 - v2 || 1);
        v2 += (F / M2) * dt * Math.sign(v1 - v2 || 1);
        x1 += v1 * dt; x2 += v2 * dt;
        /*
         * 磁場收斂需要的滑行距離（v₀·mR/B²L²）常常超過導軌長度，
         * 棒1 會先追上棒2 —— 接觸瞬間是完全非彈性合併，動量守恆給出
         * 與磁場收斂完全相同的 v*；之後一起等速前進、電流歸零。
         */
        if (x1 > x2 - 0.3) {
          x1 = x2 - 0.3;
          if (Math.abs(v1 - v2) > 0.02) { v1 = v2 = (M1 * v1 + M2 * v2) / (M1 + M2); merged = true; }
        }
        if (Math.abs(v1 - v2) < 0.02 && v1 > 0) {
          if (settled === 0) v1 = v2 = vStar;
          settled += dt;
          if (settled > 3.4) reset();
        } else settled = 0;
        history.push([t, v1, v2]);
        if (history.length > 1200) history.shift();
      }
      drawScene();
    }, 45);

    cv.onResize(drawScene); drawScene(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: drawScene };
  }});
})();
