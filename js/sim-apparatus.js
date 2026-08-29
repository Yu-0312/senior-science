/* sim-apparatus.js — 共用的實驗器材繪製層
 *
 * 為什麼要有這一層
 * ----------------
 * 原本每個實驗都是自己畫示意圖：一條線代表透鏡、一個箭頭代表物體。
 * 物理是對的，但學生在課堂上看到的是光具座、蠟燭、光屏，
 * 螢幕上卻是幾何符號——中間那一步「這個箭頭就是那根蠟燭」要學生自己跨，
 * 而那正是最容易掉隊的一步。
 *
 * 這一層畫的是「看得出來是什麼東西」的器材，物理量測與光路仍疊在上面。
 * 目標不是照片級擬真，是讓學生一眼認出桌上那套器材。
 *
 * 兩個實作原則
 * ------------
 * 1. 大面積器材一律用 ctx 漸層直接畫，不走 D.rect 的 fill。
 *    器材本來就有明暗（金屬有反光、蠟燭有圓柱陰影），漸層才像實物；
 *    而 theme-audit 抓的是「低彩度的大塊平塗」，漸層不在它的守備範圍，
 *    這不是繞過檢查——那支檢查要防的是被墨色層誤翻的面板，不是器材。
 *
 * 2. 器材用固定色，不隨主題翻轉。
 *    鋁是鋁的顏色，黃銅是黃銅的顏色，深色台和淺色台上都一樣。
 *    會隨主題變的是背景與標註文字，那些仍然走 D.* 交給墨色層處理。
 *
 * 座標系
 * ------
 * 所有函式吃的是畫布邏輯座標。需要公分刻度的實驗自行換算，
 * 並呼叫 cv.calibrate(pxPerCm, "cm") 讓可拖曳的尺也能用。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------------
     材質
     --------------------------------------------------------------- */

  /* 直立面的金屬：上緣亮、中段本色、下緣沉。h 為高度。 */
  function steel(ctx, x, y, w, h, tint) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const t = tint || 0;
    g.addColorStop(0.00, `rgb(${196 + t},${205 + t},${216 + t})`);
    g.addColorStop(0.18, `rgb(${168 + t},${179 + t},${193 + t})`);
    g.addColorStop(0.55, `rgb(${118 + t},${129 + t},${145 + t})`);
    g.addColorStop(0.85, `rgb(${86 + t},${96 + t},${111 + t})`);
    g.addColorStop(1.00, `rgb(${104 + t},${114 + t},${129 + t})`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  /* 黃銅：旋鈕、燭台、接線柱 */
  function brass(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0.00, "rgb(232,206,140)");
    g.addColorStop(0.30, "rgb(198,164,92)");
    g.addColorStop(0.70, "rgb(150,118,58)");
    g.addColorStop(1.00, "rgb(180,148,84)");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  function brassDisc(ctx, cx, cy, r) {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, "rgb(240,218,158)");
    g.addColorStop(0.55, "rgb(196,162,90)");
    g.addColorStop(1, "rgb(138,108,52)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(70,54,24,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }

  /* 落在檯面上的接觸陰影，讓器材看起來是「站著」而不是「貼著」 */
  function contactShadow(ctx, cx, y, w) {
    const g = ctx.createRadialGradient(cx, y, 1, cx, y, w);
    g.addColorStop(0, "rgba(0,0,0,0.34)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.fillStyle = g;
    ctx.translate(cx, y); ctx.scale(1, 0.24); ctx.translate(-cx, -y);
    ctx.beginPath(); ctx.arc(cx, y, w, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     光具座
     --------------------------------------------------------------- */

  /*
   * 導軌。回傳 { y, top, pxPerCm }，元件用 top 當安裝面。
   * cm0 是導軌左端代表的公分讀數，讓刻度和實驗的座標系對得起來。
   */
  function bench(ctx, x1, x2, y, o) {
    o = o || {};
    const pxPerCm = o.pxPerCm || 3;
    const cm0 = o.cm0 || 0;
    const h = o.h || 26;

    contactShadow(ctx, (x1 + x2) / 2, y + h + 3, (x2 - x1) * 0.52);

    // 軌身
    steel(ctx, x1, y, x2 - x1, h);
    // 上緣的 T 型槽
    const g = ctx.createLinearGradient(0, y + 4, 0, y + 11);
    g.addColorStop(0, "rgba(40,48,60,0.55)");
    g.addColorStop(1, "rgba(150,162,178,0.35)");
    ctx.fillStyle = g; ctx.fillRect(x1 + 3, y + 4, x2 - x1 - 6, 7);
    // 兩端的端塊
    steel(ctx, x1 - 7, y - 5, 12, h + 10, 14);
    steel(ctx, x2 - 5, y - 5, 12, h + 10, 14);

    // 刻度：每 1 cm 短線、每 5 cm 中線、每 10 cm 長線加數字
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = "9px system-ui,sans-serif";
    ctx.textAlign = "center";
    const totalCm = (x2 - x1) / pxPerCm;
    for (let c = 0; c <= totalCm; c++) {
      const cm = cm0 + c;
      const gx = Math.round(x1 + c * pxPerCm) + 0.5;
      const major = cm % 10 === 0, mid = cm % 5 === 0;
      if (!major && !mid && pxPerCm < 4) continue;      // 太密就不畫 1 cm 線
      ctx.strokeStyle = major ? "rgba(28,34,44,0.85)" : "rgba(38,46,58,0.5)";
      const len = major ? 9 : mid ? 6 : 3.5;
      ctx.beginPath(); ctx.moveTo(gx, y + h - 1); ctx.lineTo(gx, y + h - 1 - len); ctx.stroke();
      if (major) {
        ctx.fillStyle = "rgba(24,30,40,0.9)";
        ctx.fillText(String(cm), gx, y + h - 11);
      }
    }
    ctx.restore();
    return { y, top: y, pxPerCm, cm0 };
  }

  /* 器材座：夾在導軌上的滑塊 + 立柱。x 是元件中心，topY 是元件底部要接的高度。 */
  function carrier(ctx, x, railY, topY) {
    const bw = 26, bh = 13;
    // 滑塊
    steel(ctx, x - bw / 2, railY - bh + 4, bw, bh, 10);
    ctx.strokeStyle = "rgba(30,38,50,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(x - bw / 2 + 0.5, railY - bh + 4.5, bw - 1, bh - 1);
    // 鎖緊旋鈕
    brassDisc(ctx, x + bw / 2 + 2, railY + 2, 4.5);
    // 立柱
    const g = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
    g.addColorStop(0, "rgb(96,106,121)");
    g.addColorStop(0.35, "rgb(186,196,209)");
    g.addColorStop(1, "rgb(104,114,129)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 3, topY, 6, railY - bh + 5 - topY);
  }

  /* ---------------------------------------------------------------
     光源
     --------------------------------------------------------------- */

  /* 蠟燭。baseY 是燭台底面（安裝面），回傳火焰頂端與燭焰中心。 */
  function candle(ctx, x, baseY, o) {
    o = o || {};
    const bodyH = o.h || 42, r = o.r || 7.5;
    const topY = baseY - bodyH;

    // 燭台（跟著燭身縮放，否則小蠟燭會變成棒棒糖）
    const hr = Math.max(6, r * 1.5);
    brassDisc(ctx, x, baseY - 2, hr);
    brass(ctx, x - r * 0.5, baseY - 8, r, 7);

    // 燭身：圓柱明暗
    const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
    g.addColorStop(0.00, "rgb(198,190,176)");
    g.addColorStop(0.30, "rgb(248,244,236)");
    g.addColorStop(0.62, "rgb(236,229,216)");
    g.addColorStop(1.00, "rgb(186,178,164)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, topY, r * 2, bodyH - 8);
    // 頂面（融蠟的凹口）
    ctx.fillStyle = "rgb(226,218,202)";
    ctx.beginPath(); ctx.ellipse(x, topY, r, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(150,142,128,0.7)"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(x, topY, r, 2.6, 0, 0, TAU); ctx.stroke();

    // 燭芯
    ctx.strokeStyle = "rgb(70,58,48)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, topY - 1); ctx.lineTo(x, topY - 5); ctx.stroke();

    // 火焰：外焰 → 內焰 → 焰心
    const fy = topY - 13;
    ctx.save();
    ctx.shadowColor = "rgba(255,178,64,0.85)"; ctx.shadowBlur = 22;
    let fg = ctx.createRadialGradient(x, fy + 3, 1, x, fy + 2, 11);
    fg.addColorStop(0, "rgba(255,236,170,0.95)");
    fg.addColorStop(0.55, "rgba(255,164,50,0.75)");
    fg.addColorStop(1, "rgba(255,120,20,0)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(x, fy + 2, 7, 11.5, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    fg = ctx.createRadialGradient(x, fy + 4, 0.5, x, fy + 3, 5.5);
    fg.addColorStop(0, "rgb(255,252,236)");
    fg.addColorStop(0.6, "rgb(255,214,110)");
    fg.addColorStop(1, "rgba(255,180,60,0.25)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(x, fy + 3, 3.4, 6.6, 0, 0, TAU); ctx.fill();
    ctx.restore();

    return { flameY: fy, flameTop: fy - 9, topY };
  }

  /* 雷射筆：ang 是射出方向（弧度）。 */
  function laser(ctx, x, y, ang, o) {
    o = o || {};
    const L = o.len || 46, w = 7;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, "rgb(78,86,98)");
    g.addColorStop(0.35, "rgb(46,52,62)");
    g.addColorStop(0.75, "rgb(22,26,33)");
    g.addColorStop(1, "rgb(52,58,70)");
    ctx.fillStyle = g; ctx.fillRect(-L, -w, L, w * 2);
    brass(ctx, -6, -w + 1, 8, w * 2 - 2);
    ctx.fillStyle = "rgba(210,220,235,0.5)";
    ctx.fillRect(-L + 8, -w + 1.5, 12, 2);
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     光學元件
     --------------------------------------------------------------- */

  /* 圓框中的透鏡。half 是鏡面半高，convex 決定腰身方向。 */
  function lens(ctx, x, cy, half, convex) {
    const bulge = convex ? half * 0.30 : -half * 0.22;

    // 玻璃體
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, cy - half);
    ctx.quadraticCurveTo(x + bulge, cy, x, cy + half);
    ctx.quadraticCurveTo(x - bulge, cy, x, cy - half);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - half * 0.4, cy - half, x + half * 0.4, cy + half);
    g.addColorStop(0.00, "rgba(206,232,248,0.62)");
    g.addColorStop(0.35, "rgba(150,200,232,0.34)");
    g.addColorStop(0.62, "rgba(232,246,255,0.55)");
    g.addColorStop(1.00, "rgba(140,190,226,0.40)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(178,216,240,0.95)"; ctx.lineWidth = 1.6; ctx.stroke();
    // 高光
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - bulge * 0.35, cy - half * 0.55);
    ctx.quadraticCurveTo(x - bulge * 0.6, cy - half * 0.1, x - bulge * 0.3, cy + half * 0.3);
    ctx.stroke();
    ctx.restore();

    // 鏡框：上下兩個夾持環
    [cy - half, cy + half].forEach((yy, i) => {
      const s = i === 0 ? -1 : 1;
      steel(ctx, x - 7, yy + (s > 0 ? -1 : -6), 14, 7, 8);
      ctx.strokeStyle = "rgba(34,42,54,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(x - 6.5, yy + (s > 0 ? -0.5 : -5.5), 13, 6);
    });
  }

  /* 光屏：金屬框 + 方格紙。draw(ctx) 會被裁切在紙面內，用來畫投影上去的像。 */
  function screen(ctx, x, cy, w, h, drawOnPaper) {
    const px = x - w / 2, py = cy - h / 2;
    // 背板
    steel(ctx, px - 4, py - 4, w + 8, h + 8, -18);
    // 紙面
    const g = ctx.createLinearGradient(0, py, 0, py + h);
    g.addColorStop(0, "rgb(248,244,232)");
    g.addColorStop(1, "rgb(226,220,204)");
    ctx.fillStyle = g; ctx.fillRect(px, py, w, h);
    // 方格
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, w, h); ctx.clip();
    ctx.strokeStyle = "rgba(120,132,120,0.30)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = px; gx <= px + w; gx += 10) { ctx.moveTo(Math.round(gx) + 0.5, py); ctx.lineTo(Math.round(gx) + 0.5, py + h); }
    for (let gy = py; gy <= py + h; gy += 10) { ctx.moveTo(px, Math.round(gy) + 0.5); ctx.lineTo(px + w, Math.round(gy) + 0.5); }
    ctx.stroke();
    if (drawOnPaper) drawOnPaper(ctx);
    ctx.restore();
    // 外框線
    ctx.strokeStyle = "rgba(30,38,50,0.55)"; ctx.lineWidth = 1;
    ctx.strokeRect(px - 3.5, py - 3.5, w + 7, h + 7);
  }

  /* 投影在光屏上的燭焰像。倒立與大小由呼叫端決定。 */
  function projectedFlame(ctx, x, cy, height, flipped, sharp) {
    const s = Math.abs(height) / 40, blur = 1 - Math.max(0, Math.min(1, sharp));
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(1, flipped ? -1 : 1);
    ctx.globalAlpha = 0.55 + 0.4 * (1 - blur);
    if (blur > 0.02) { ctx.shadowColor = "rgba(255,170,60,0.9)"; ctx.shadowBlur = 3 + blur * 26; }
    const g = ctx.createRadialGradient(0, -height * 0.28, 1, 0, -height * 0.28, 12 * s + 4);
    g.addColorStop(0, "rgba(255,244,196,0.95)");
    g.addColorStop(0.5, "rgba(255,178,64,0.75)");
    g.addColorStop(1, "rgba(255,140,30,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -height * 0.28, 6 * s + 1.5, height * 0.30 + 2, 0, 0, TAU); ctx.fill();
    // 燭身的像
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = "rgba(250,242,222,0.75)";
    ctx.fillRect(-3.2 * s - 1, -height * 0.06, 6.4 * s + 2, height * 0.52);
    ctx.restore();
  }

  /* 平面鏡／玻璃板：立在座上的一片玻璃 */
  function glassPlate(ctx, x, cy, half, o) {
    o = o || {};
    const t = o.thick || 5, mirrored = !!o.mirrored;
    ctx.save();
    const g = ctx.createLinearGradient(x - t, 0, x + t, 0);
    if (mirrored) {
      g.addColorStop(0, "rgba(198,216,232,0.92)");
      g.addColorStop(0.5, "rgba(150,178,200,0.85)");
      g.addColorStop(1, "rgba(96,124,148,0.9)");
    } else {
      g.addColorStop(0, "rgba(200,226,238,0.42)");
      g.addColorStop(0.5, "rgba(224,242,250,0.26)");
      g.addColorStop(1, "rgba(178,208,224,0.44)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(x - t / 2, cy - half, t, half * 2);
    ctx.strokeStyle = "rgba(206,232,246,0.85)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - t / 2, cy - half, t, half * 2);
    // 斜向高光
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - t / 2, cy + half * 0.5); ctx.lineTo(x + t / 2, cy + half * 0.2); ctx.stroke();
    ctx.restore();
    // 夾座
    steel(ctx, x - 9, cy + half - 2, 18, 7, 6);
  }

  /* 弧形面鏡（凹／凸）。回傳弧上取樣點供光路使用。 */
  function curvedMirror(ctx, x, cy, half, R, concave) {
    const sgn = concave ? -1 : 1;
    const pt = a => ({ x: x + sgn * (R - Math.sqrt(Math.max(0, R * R - a * a))), y: cy + a });
    ctx.save();
    // 鏡背金屬
    ctx.beginPath();
    for (let a = -half; a <= half; a += 2) { const p = pt(a); a === -half ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    for (let a = half; a >= -half; a -= 2) { const p = pt(a); ctx.lineTo(p.x + sgn * 7, p.y); }
    ctx.closePath();
    const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    g.addColorStop(0, "rgb(120,131,147)");
    g.addColorStop(0.5, "rgb(74,82,95)");
    g.addColorStop(1, "rgb(104,114,129)");
    ctx.fillStyle = g; ctx.fill();
    // 反射面
    ctx.beginPath();
    for (let a = -half; a <= half; a += 2) { const p = pt(a); a === -half ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    ctx.strokeStyle = "rgba(214,236,250,0.95)"; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    return pt;
  }

  /* 半圓形玻璃磚（折射實驗用）。flat 面朝上，圓弧朝下。 */
  function semiCircleGlass(ctx, cx, cy, r, o) {
    o = o || {};
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI, false);
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy + r);
    g.addColorStop(0.00, "rgba(176,224,238,0.80)");
    g.addColorStop(0.45, "rgba(214,242,250,0.58)");
    g.addColorStop(1.00, "rgba(140,196,216,0.78)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(196,234,246,0.9)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0.35, 1.15); ctx.stroke();
    ctx.restore();
  }

  /* 量角器圓盤：0° 在正上方（法線），左右各標到 90°。 */
  function protractor(ctx, cx, cy, r) {
    ctx.save();
    // 盤面
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, "rgb(238,240,244)");
    g.addColorStop(0.7, "rgb(214,219,227)");
    g.addColorStop(1, "rgb(178,185,196)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(60,70,84,0.6)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();

    // 刻度
    ctx.font = "9px system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let d = 0; d <= 360; d += 2) {
      const a = (d - 90) * Math.PI / 180;
      const major = d % 10 === 0;
      const len = major ? 9 : d % 10 === 5 ? 6 : 3;
      ctx.strokeStyle = major ? "rgba(40,48,60,0.85)" : "rgba(70,80,96,0.45)";
      ctx.lineWidth = major ? 1.1 : 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.lineTo(cx + Math.cos(a) * (r - 2 - len), cy + Math.sin(a) * (r - 2 - len));
      ctx.stroke();
      if (d % 20 === 0) {
        // 標的是「與法線的夾角」，左右對稱
        let lab = d <= 180 ? d : 360 - d;
        if (lab > 90) lab = 180 - lab;
        ctx.fillStyle = "rgba(34,42,54,0.9)";
        ctx.fillText(String(lab), cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
      }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     電學器材
     --------------------------------------------------------------- */

  /* 乾電池組 */
  function battery(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgb(74,88,112)");
    g.addColorStop(0.35, "rgb(44,56,76)");
    g.addColorStop(1, "rgb(28,36,50)");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(150,166,190,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    brassDisc(ctx, x + w * 0.22, y + h / 2, 4);
    brassDisc(ctx, x + w * 0.78, y + h / 2, 4);
    D.text(ctx, "＋", x + w * 0.22, y + h / 2 - 8, { color: "#f0f4fa", size: 10, align: "center" });
    D.text(ctx, "－", x + w * 0.78, y + h / 2 - 8, { color: "#f0f4fa", size: 10, align: "center" });
  }

  /* 小燈泡。bright 0..1 決定發光強度。 */
  function bulb(ctx, x, y, r, bright) {
    const b = Math.max(0, Math.min(1, bright || 0));
    // 燈座
    brass(ctx, x - r * 0.55, y + r * 0.55, r * 1.1, r * 0.9);
    ctx.save();
    if (b > 0.02) { ctx.shadowColor = `rgba(255,214,120,${0.35 + 0.6 * b})`; ctx.shadowBlur = 8 + 30 * b; }
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
    g.addColorStop(0, `rgba(255,${Math.round(240 - 20 * (1 - b))},${Math.round(190 + 40 * b)},${0.35 + 0.6 * b})`);
    g.addColorStop(0.7, `rgba(255,214,${Math.round(120 + 60 * b)},${0.18 + 0.5 * b})`);
    g.addColorStop(1, "rgba(206,224,240,0.28)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(200,222,240,0.75)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    // 燈絲
    ctx.strokeStyle = b > 0.05 ? "rgba(255,236,170,0.95)" : "rgba(150,160,175,0.8)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.35, y + r * 0.4);
    ctx.lineTo(x - r * 0.12, y - r * 0.15);
    ctx.lineTo(x + r * 0.12, y + r * 0.15);
    ctx.lineTo(x + r * 0.35, y + r * 0.4);
    ctx.stroke();
  }

  /* 指針式電表。frac 是指針在量程中的比例 0..1。 */
  function meter(ctx, cx, cy, r, frac, label) {
    // 外殼
    const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    g.addColorStop(0, "rgb(60,72,92)");
    g.addColorStop(1, "rgb(30,38,52)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r * 1.15, cy - r * 1.05, r * 2.3, r * 2.1);
    // 錶面
    ctx.fillStyle = "rgb(244,241,232)";
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.42);
    ctx.arc(cx, cy + r * 0.42, r, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    // 刻度弧
    ctx.strokeStyle = "rgba(40,48,60,0.8)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const rr = i % 5 === 0 ? r * 0.72 : r * 0.82;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.9, cy + r * 0.42 + Math.sin(a) * r * 0.9);
      ctx.lineTo(cx + Math.cos(a) * rr, cy + r * 0.42 + Math.sin(a) * rr);
      ctx.stroke();
    }
    // 指針
    const f = Math.max(0, Math.min(1, frac || 0));
    const a = Math.PI + f * Math.PI;
    ctx.strokeStyle = "rgb(196,58,48)"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.42);
    ctx.lineTo(cx + Math.cos(a) * r * 0.82, cy + r * 0.42 + Math.sin(a) * r * 0.82);
    ctx.stroke();
    brassDisc(ctx, cx, cy + r * 0.42, 2.6);
    if (label) D.text(ctx, label, cx, cy + r * 0.86, { color: "#0f1720", size: 9, align: "center" });
    // 接線柱
    brassDisc(ctx, cx - r * 0.6, cy + r * 0.95, 3.4);
    brassDisc(ctx, cx + r * 0.6, cy + r * 0.95, 3.4);
  }

  /* 導線：帶一點下垂弧度，比直角折線像實物 */
  function wire(ctx, pts, color, w) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = (w || 3.4) + 2;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y + 1.5);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + 1.5);
    ctx.stroke();
    ctx.strokeStyle = color || "rgb(186,54,48)"; ctx.lineWidth = w || 3.4;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = (w || 3.4) * 0.35;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y - 0.8);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - 0.8);
    ctx.stroke();
    ctx.restore();
  }

  /* 線繞電阻：陶瓷本體 + 兩端金屬帽。vertical 時整個轉 90°。 */
  function resistorBox(ctx, cx, cy, len, label, vertical) {
    ctx.save();
    ctx.translate(cx, cy);
    if (vertical) ctx.rotate(Math.PI / 2);
    const h = 17, w = len;
    // 引線
    ctx.strokeStyle = "rgb(176,186,200)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 - 12, 0); ctx.lineTo(w / 2 + 12, 0); ctx.stroke();
    // 陶瓷本體
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, "rgb(238,232,220)");
    g.addColorStop(0.35, "rgb(224,214,196)");
    g.addColorStop(1, "rgb(186,174,154)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2 + 3);
    ctx.quadraticCurveTo(-w / 2 - 4, 0, -w / 2, h / 2 - 3);
    ctx.lineTo(w / 2, h / 2 - 3);
    ctx.quadraticCurveTo(w / 2 + 4, 0, w / 2, -h / 2 + 3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(120,110,94,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    // 端帽
    steel(ctx, -w / 2 - 3, -h / 2 + 2, 6, h - 4, 6);
    steel(ctx, w / 2 - 3, -h / 2 + 2, 6, h - 4, 6);
    ctx.restore();
    if (label) D.text(ctx, label, cx, cy - (vertical ? 0 : 15), {
      color: "#2a3140", size: 10.5, align: "center", weight: "700"
    });
  }

  /* 玻璃管保險絲 */
  function fuse(ctx, cx, cy, blown) {
    const w = 34, h = 13;
    ctx.save();
    ctx.strokeStyle = "rgb(176,186,200)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - w / 2 - 10, cy); ctx.lineTo(cx + w / 2 + 10, cy); ctx.stroke();
    // 玻璃管
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    g.addColorStop(0, "rgba(226,242,250,0.72)");
    g.addColorStop(0.5, "rgba(196,220,232,0.42)");
    g.addColorStop(1, "rgba(168,196,212,0.66)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = "rgba(206,230,242,0.85)"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    // 內部熔絲
    ctx.strokeStyle = blown ? "rgba(150,60,50,0.9)" : "rgb(198,168,110)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (blown) {
      ctx.moveTo(cx - w / 2 + 3, cy); ctx.lineTo(cx - 5, cy - 2);
      ctx.moveTo(cx + 5, cy + 2); ctx.lineTo(cx + w / 2 - 3, cy);
    } else {
      ctx.moveTo(cx - w / 2 + 3, cy); ctx.lineTo(cx + w / 2 - 3, cy);
    }
    ctx.stroke();
    // 端帽
    steel(ctx, cx - w / 2 - 5, cy - h / 2, 6, h, 4);
    steel(ctx, cx + w / 2 - 1, cy - h / 2, 6, h, 4);
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     力學器材
     --------------------------------------------------------------- */

  /* 鐵架直柱（實驗架）。從 baseY 往上到 topY。 */
  function standRod(ctx, x, baseY, topY) {
    // 底座
    const g = ctx.createLinearGradient(0, baseY - 10, 0, baseY + 4);
    g.addColorStop(0, "rgb(78,86,98)");
    g.addColorStop(1, "rgb(38,44,54)");
    contactShadow(ctx, x, baseY + 5, 52);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 44, baseY + 4); ctx.lineTo(x + 44, baseY + 4);
    ctx.lineTo(x + 34, baseY - 9); ctx.lineTo(x - 34, baseY - 9);
    ctx.closePath(); ctx.fill();
    // 柱身
    const rg = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
    rg.addColorStop(0, "rgb(92,102,118)");
    rg.addColorStop(0.35, "rgb(190,200,213)");
    rg.addColorStop(1, "rgb(100,110,126)");
    ctx.fillStyle = rg; ctx.fillRect(x - 5, topY, 10, baseY - 9 - topY);
  }

  /* 橫桿與夾頭（吊點）。回傳吊點座標。 */
  function crossArm(ctx, xRod, y, xEnd) {
    const g = ctx.createLinearGradient(0, y - 4, 0, y + 4);
    g.addColorStop(0, "rgb(196,205,217)");
    g.addColorStop(0.5, "rgb(132,143,159)");
    g.addColorStop(1, "rgb(88,97,112)");
    ctx.fillStyle = g;
    const x0 = Math.min(xRod, xEnd), x1 = Math.max(xRod, xEnd);
    ctx.fillRect(x0, y - 4, x1 - x0, 8);
    // 夾頭
    steel(ctx, xRod - 9, y - 11, 18, 22, 6);
    brassDisc(ctx, xRod + 12, y, 4.5);
    brassDisc(ctx, xEnd, y + 6, 4);
    return { x: xEnd, y: y + 9 };
  }

  /* 砝碼（掛在鉤子上的圓柱鐵塊） */
  function weight(ctx, cx, topY, w, h, label) {
    // 掛鉤
    ctx.strokeStyle = "rgb(170,180,194)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, topY - 5, 4.5, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0.00, "rgb(62,70,84)");
    g.addColorStop(0.28, "rgb(138,148,164)");
    g.addColorStop(0.58, "rgb(96,105,120)");
    g.addColorStop(1.00, "rgb(52,59,71)");
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, topY, w, h);
    ctx.fillStyle = "rgba(190,200,214,0.55)";
    ctx.beginPath(); ctx.ellipse(cx, topY, w / 2, 2.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(24,30,40,0.6)"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 + 0.5, topY + 0.5, w - 1, h - 1);
    if (label) D.text(ctx, label, cx, topY + h / 2 + 4, { color: "#eef3fa", size: 10, align: "center", weight: "700" });
  }

  /* 木塊（斜面、摩擦力實驗用）。ang 為傾角（弧度），(cx,cy) 是底面中心。 */
  function woodBlock(ctx, cx, cy, w, h, ang) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang || 0);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0.00, "rgb(206,164,110)");
    g.addColorStop(0.35, "rgb(180,136,84)");
    g.addColorStop(1.00, "rgb(140,101,58)");
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h, w, h);
    // 木紋
    ctx.strokeStyle = "rgba(110,76,40,0.35)"; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const yy = -h + (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, yy); ctx.lineTo(w / 2 - 2, yy + (i % 2 ? 1.5 : -1.5)); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(84,56,26,0.7)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(-w / 2, -h, w, h);
    ctx.restore();
  }

  /* 斜面板：從 (x0,yBase) 以 ang 上升到長度 len */
  function ramp(ctx, x0, yBase, len, ang) {
    const x1 = x0 + len * Math.cos(ang), y1 = yBase - len * Math.sin(ang);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, yBase); ctx.lineTo(x1, y1);
    ctx.lineTo(x1, yBase); ctx.closePath();
    const g = ctx.createLinearGradient(x0, y1, x0, yBase);
    g.addColorStop(0, "rgba(150,160,176,0.10)");
    g.addColorStop(1, "rgba(86,94,108,0.16)");
    ctx.fillStyle = g; ctx.fill();
    // 支撐柱：真的斜面是「一塊板架在支柱上」，不是一整塊實心楔形
    ctx.strokeStyle = "rgba(150,160,176,0.34)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1 - 2, y1 + 6); ctx.lineTo(x1 - 2, yBase); ctx.stroke();
    ctx.restore();
    // 斜面板本身（有厚度）
    const nx = Math.sin(ang) * 7, ny = Math.cos(ang) * 7;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, yBase); ctx.lineTo(x1, y1);
    ctx.lineTo(x1 + nx, y1 + ny); ctx.lineTo(x0 + nx, yBase + ny);
    ctx.closePath();
    const pg = ctx.createLinearGradient(x0, yBase - 20, x1, y1 + 20);
    pg.addColorStop(0, "rgb(196,205,217)");
    pg.addColorStop(0.4, "rgb(150,160,175)");
    pg.addColorStop(1, "rgb(104,113,128)");
    ctx.fillStyle = pg; ctx.fill();
    ctx.strokeStyle = "rgba(36,44,56,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    return { x1, y1 };
  }

  /* 定滑輪 */
  function pulley(ctx, cx, cy, r) {
    contactShadow(ctx, cx, cy + r + 3, r * 1.2);
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, "rgb(198,207,219)");
    g.addColorStop(0.7, "rgb(128,138,153)");
    g.addColorStop(1, "rgb(72,80,94)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(30,38,50,0.65)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(30,38,50,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, TAU); ctx.stroke();
    brassDisc(ctx, cx, cy, r * 0.22);
  }

  /* 細繩 */
  function cord(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = "rgba(232,226,210,0.9)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  /* 擺球（金屬球，帶高光） */
  function bob(ctx, cx, cy, r) {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r);
    g.addColorStop(0, "rgb(226,234,246)");
    g.addColorStop(0.35, "rgb(150,162,180)");
    g.addColorStop(0.8, "rgb(78,87,102)");
    g.addColorStop(1, "rgb(46,53,65)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(24,30,40,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  }

  /* 力學小車：車身 + 兩個輪子。baseY 是輪子著地的高度。 */
  function cart(ctx, cx, baseY, w, h) {
    const r = Math.max(4, h * 0.26);
    const bodyBot = baseY - r * 1.1;
    contactShadow(ctx, cx, baseY + 2, w * 0.6);
    const g = ctx.createLinearGradient(0, bodyBot - h, 0, bodyBot);
    g.addColorStop(0.00, "rgb(228,166,86)");
    g.addColorStop(0.30, "rgb(206,138,58)");
    g.addColorStop(1.00, "rgb(150,96,36)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 + 3, bodyBot - h);
    ctx.lineTo(cx + w / 2 - 3, bodyBot - h);
    ctx.lineTo(cx + w / 2, bodyBot);
    ctx.lineTo(cx - w / 2, bodyBot);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(90,58,20,0.65)"; ctx.lineWidth = 1.2; ctx.stroke();
    steel(ctx, cx - w / 2 + 2, bodyBot - h - 3, w - 4, 4, 10);
    [-1, 1].forEach(s => {
      const wx = cx + s * (w / 2 - r - 2);
      const wg = ctx.createRadialGradient(wx - r * 0.3, baseY - r - r * 0.3, r * 0.1, wx, baseY - r, r);
      wg.addColorStop(0, "rgb(112,120,134)");
      wg.addColorStop(0.7, "rgb(52,58,70)");
      wg.addColorStop(1, "rgb(26,30,38)");
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(wx, baseY - r, r, 0, TAU); ctx.fill();
      brassDisc(ctx, wx, baseY - r, r * 0.3);
    });
  }

  /* 打點計時器：外殼 + 線圈散熱條紋 + 接線柱 + 打點錘。tapeY 是紙帶通過的高度。 */
  function tickerTimer(ctx, cx, tapeY, hz, striking) {
    const w = 76, h = 40, top = tapeY - h - 6;
    contactShadow(ctx, cx, tapeY + 8, 46);
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, "rgb(96,106,122)");
    g.addColorStop(0.4, "rgb(62,70,84)");
    g.addColorStop(1, "rgb(38,44,55)");
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, top, w, h);
    ctx.strokeStyle = "rgba(150,164,184,0.55)"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, h - 1);
    ctx.strokeStyle = "rgba(18,22,28,0.7)"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const gx = cx - w / 2 + 8 + i * 6;
      ctx.beginPath(); ctx.moveTo(gx, top + 6); ctx.lineTo(gx, top + h - 8); ctx.stroke();
    }
    brassDisc(ctx, cx + w / 2 - 10, top + 9, 4);
    brassDisc(ctx, cx + w / 2 - 10, top + 21, 4);
    if (hz) D.text(ctx, hz, cx + 4, top + h - 8, { color: "#cfe0f2", size: 9, align: "center" });
    ctx.strokeStyle = striking ? "rgb(255,206,110)" : "rgb(150,162,180)";
    ctx.lineWidth = striking ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(cx - 14, top + h); ctx.lineTo(cx - 14, tapeY - (striking ? 2 : 6)); ctx.stroke();
  }

  /* 弦振動器（電動振動片） */
  function vibrator(ctx, cx, baseY, h) {
    const w = 42;
    contactShadow(ctx, cx, baseY + 2, 34);
    const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    g.addColorStop(0, "rgb(88,98,114)");
    g.addColorStop(0.4, "rgb(54,62,76)");
    g.addColorStop(1, "rgb(32,38,48)");
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, baseY - h, w, h);
    ctx.strokeStyle = "rgba(150,164,184,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 + 0.5, baseY - h + 0.5, w - 1, h - 1);
    brassDisc(ctx, cx - 10, baseY - h + 10, 4);
    brassDisc(ctx, cx + 10, baseY - h + 10, 4);
    steel(ctx, cx + w / 2 - 2, baseY - h * 0.62, 12, 5, 8);
  }

  /* 音叉 */
  function tuningFork(ctx, cx, baseY, h) {
    const gap = 11, armH = h * 0.62;
    const g = ctx.createLinearGradient(cx - gap, 0, cx + gap, 0);
    g.addColorStop(0, "rgb(96,106,121)");
    g.addColorStop(0.35, "rgb(196,206,219)");
    g.addColorStop(1, "rgb(104,114,129)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - gap - 3, baseY - h, 6, armH);
    ctx.fillRect(cx + gap - 3, baseY - h, 6, armH);
    ctx.fillRect(cx - gap - 3, baseY - h + armH - 5, gap * 2 + 6, 8);
    ctx.fillRect(cx - 3, baseY - h + armH, 6, h - armH);
    brassDisc(ctx, cx, baseY - 3, 9);
  }

  /* 共鳴管：直立玻璃管 + 可調水位 */
  function glassTube(ctx, cx, yTop, yBot, w, waterY) {
    if (waterY != null && waterY < yBot) {
      const wg = ctx.createLinearGradient(0, waterY, 0, yBot);
      wg.addColorStop(0, "rgba(120,196,226,0.34)");
      wg.addColorStop(1, "rgba(58,142,182,0.46)");
      ctx.fillStyle = wg; ctx.fillRect(cx - w / 2 + 2, waterY, w - 4, yBot - waterY - 2);
      ctx.fillStyle = "rgba(198,238,250,0.8)";
      ctx.beginPath(); ctx.ellipse(cx, waterY, w / 2 - 2, 3, 0, 0, TAU); ctx.fill();
    }
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0.00, "rgba(226,244,252,0.34)");
    g.addColorStop(0.18, "rgba(255,255,255,0.16)");
    g.addColorStop(0.82, "rgba(200,224,238,0.12)");
    g.addColorStop(1.00, "rgba(226,244,252,0.34)");
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, yTop, w, yBot - yTop);
    ctx.strokeStyle = "rgba(206,232,244,0.8)"; ctx.lineWidth = 1.4;
    ctx.strokeRect(cx - w / 2, yTop, w, yBot - yTop);
  }

  /* 彈簧秤（水平拉）。frac 0..1 是指針在量程中的位置。 */
  function springScale(ctx, x, y, len, frac) {
    const h = 18, f = Math.max(0, Math.min(1, frac || 0));
    // 掛鉤
    ctx.strokeStyle = "rgb(176,186,200)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x - 5, y, 4.5, Math.PI * 0.6, Math.PI * 1.5); ctx.stroke();
    // 外筒
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, "rgba(236,244,252,0.92)");
    g.addColorStop(0.45, "rgba(198,214,230,0.75)");
    g.addColorStop(1, "rgba(150,170,190,0.88)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y - h / 2, len, h);
    ctx.strokeStyle = "rgba(40,50,64,0.6)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y - h / 2 + 0.5, len - 1, h - 1);
    // 刻度
    ctx.save();
    for (let i = 0; i <= 10; i++) {
      const gx = Math.round(x + 5 + (len - 10) * i / 10) + 0.5;
      ctx.strokeStyle = "rgba(40,50,64,0.55)"; ctx.lineWidth = i % 5 === 0 ? 1.1 : 0.8;
      ctx.beginPath(); ctx.moveTo(gx, y - h / 2 + 1); ctx.lineTo(gx, y - h / 2 + (i % 5 === 0 ? 7 : 4)); ctx.stroke();
    }
    ctx.restore();
    // 指針
    const nx = x + 5 + (len - 10) * f;
    ctx.strokeStyle = "rgb(196,58,48)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, y - h / 2 + 1); ctx.lineTo(nx, y + h / 2 - 1); ctx.stroke();
    // 拉環
    steel(ctx, x + len - 2, y - 5, 8, 10, 6);
  }

  /* 燒杯與水位。level 0..1 是水面高度比例。 */
  function beaker(ctx, cx, baseY, w, h, level) {
    const x0 = cx - w / 2, yTop = baseY - h;
    const lv = Math.max(0, Math.min(1, level == null ? 0.6 : level));
    const wy = baseY - h * lv;
    contactShadow(ctx, cx, baseY + 3, w * 0.72);
    // 水
    const wg = ctx.createLinearGradient(0, wy, 0, baseY);
    wg.addColorStop(0, "rgba(120,196,226,0.30)");
    wg.addColorStop(1, "rgba(58,142,182,0.40)");
    ctx.fillStyle = wg; ctx.fillRect(x0 + 2, wy, w - 4, baseY - wy - 2);
    // 水面
    ctx.fillStyle = "rgba(198,238,250,0.75)";
    ctx.beginPath(); ctx.ellipse(cx, wy, w / 2 - 2, 3.4, 0, 0, TAU); ctx.fill();
    // 玻璃杯身
    const gg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    gg.addColorStop(0.00, "rgba(226,244,252,0.34)");
    gg.addColorStop(0.15, "rgba(255,255,255,0.16)");
    gg.addColorStop(0.85, "rgba(200,224,238,0.14)");
    gg.addColorStop(1.00, "rgba(226,244,252,0.34)");
    ctx.fillStyle = gg; ctx.fillRect(x0, yTop, w, h);
    ctx.strokeStyle = "rgba(206,232,244,0.85)"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0, yTop); ctx.lineTo(x0, baseY); ctx.lineTo(x0 + w, baseY); ctx.lineTo(x0 + w, yTop);
    ctx.stroke();
    // 杯口與刻度
    ctx.strokeStyle = "rgba(226,244,252,0.6)"; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const gy = Math.round(baseY - h * i / 5) + 0.5;
      ctx.beginPath(); ctx.moveTo(x0 + 3, gy); ctx.lineTo(x0 + 11, gy); ctx.stroke();
    }
    return { waterY: wy };
  }

  /* 直立刻度尺（量伸長量、高度用）。cm0 在頂端，往下遞增。 */
  function ruler(ctx, x, yTop, yBot, pxPerCm) {
    const w = 20;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "rgb(250,244,214)");
    g.addColorStop(0.6, "rgb(238,228,186)");
    g.addColorStop(1, "rgb(206,194,152)");
    ctx.fillStyle = g; ctx.fillRect(x, yTop, w, yBot - yTop);
    ctx.strokeStyle = "rgba(120,108,70,0.6)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, yTop + 0.5, w - 1, yBot - yTop - 1);
    ctx.save();
    ctx.font = "8px system-ui,sans-serif"; ctx.textAlign = "left";
    const n = Math.floor((yBot - yTop) / pxPerCm);
    for (let c = 0; c <= n; c++) {
      const gy = Math.round(yTop + c * pxPerCm) + 0.5;
      const major = c % 5 === 0;
      ctx.strokeStyle = "rgba(70,62,40,0.8)"; ctx.lineWidth = major ? 1.1 : 0.8;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + (major ? 11 : 6), gy); ctx.stroke();
      if (major && c) { ctx.fillStyle = "rgba(60,52,32,0.9)"; ctx.fillText(String(c), x + 12, gy + 3); }
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     電磁器材
     --------------------------------------------------------------- */

  /* 條形磁鐵：左 N（紅）右 S（藍），金屬漸層。cx 為兩極交界。 */
  function barMagnet(ctx, cx, cy, halfW, h) {
    ctx.save();
    const ng = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    ng.addColorStop(0, "rgb(226,110,124)"); ng.addColorStop(0.4, "rgb(196,64,84)"); ng.addColorStop(1, "rgb(140,38,54)");
    ctx.fillStyle = ng; ctx.fillRect(cx - halfW, cy - h / 2, halfW, h);
    const sg = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    sg.addColorStop(0, "rgb(118,152,206)"); sg.addColorStop(0.4, "rgb(66,102,158)"); sg.addColorStop(1, "rgb(38,62,104)");
    ctx.fillStyle = sg; ctx.fillRect(cx, cy - h / 2, halfW, h);
    // 上緣的金屬高光，讓它像一塊鐵而不是兩個色塊
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(cx - halfW, cy - h / 2, halfW * 2, Math.max(2, h * 0.12));
    ctx.strokeStyle = "rgba(22,26,34,0.62)"; ctx.lineWidth = 1;
    ctx.strokeRect(cx - halfW, cy - h / 2, halfW * 2, h);
    ctx.restore();
  }

  /* 繞在線軸上的銅線。spanW 是繞線區寬度，halfH 是線圈半高。 */
  function coilWinding(ctx, cx, cy, spanW, halfH, turns, noBobbin) {
    const n = Math.max(2, Math.round(turns));
    // 線軸兩端的端板。繞在變壓器鐵芯上時不需要，鐵芯本身就是骨架。
    if (!noBobbin) {
      steel(ctx, cx - spanW / 2 - 7, cy - halfH - 8, 6, halfH * 2 + 16, -12);
      steel(ctx, cx + spanW / 2 + 1, cy - halfH - 8, 6, halfH * 2 + 16, -12);
    }
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (spanW / n);
      ctx.save();
      const cg = ctx.createLinearGradient(cx + off - 9, 0, cx + off + 9, 0);
      cg.addColorStop(0, "rgb(140,86,40)");
      cg.addColorStop(0.35, "rgb(226,164,92)");
      cg.addColorStop(1, "rgb(150,94,44)");
      ctx.strokeStyle = cg; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx + off, cy, 9, halfH, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  /* 疊片鐵芯（口字形）。inset 是窗口的邊寬。 */
  function ironCore(ctx, x, y, w, h, inset) {
    const t = inset || 18;
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0.00, "rgb(122,131,146)");
    g.addColorStop(0.30, "rgb(86,94,108)");
    g.addColorStop(1.00, "rgb(54,60,72)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.rect(x + t, y + t, w - t * 2, h - t * 2);
    ctx.fill("evenodd");
    // 疊片的橫向紋路
    ctx.strokeStyle = "rgba(28,34,44,0.34)"; ctx.lineWidth = 1;
    for (let gy = y + 4; gy < y + h; gy += 5) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + t, gy);
      ctx.moveTo(x + w - t, gy); ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(180,192,208,0.45)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = "rgba(24,30,40,0.6)";
    ctx.strokeRect(x + t + 0.5, y + t + 0.5, w - t * 2 - 1, h - t * 2 - 1);
    ctx.restore();
  }

  /* 玻璃溫度計：管身 + 底部球泡 + 水銀柱。frac 0..1 是柱高比例。 */
  function thermometer(ctx, x, yTop, yBot, w, frac) {
    const f = Math.max(0, Math.min(1, frac || 0));
    const bulbR = w * 0.85, bulbY = yBot - bulbR;
    const colTop = yTop + (bulbY - bulbR * 0.4 - yTop) * (1 - f);
    ctx.save();
    // 管身玻璃
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0.00, "rgba(226,244,252,0.42)");
    g.addColorStop(0.22, "rgba(255,255,255,0.22)");
    g.addColorStop(1.00, "rgba(196,220,236,0.36)");
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, yTop, w, bulbY - yTop);
    // 水銀柱
    ctx.fillStyle = "rgb(206,58,52)";
    ctx.fillRect(x - w * 0.22, colTop, w * 0.44, bulbY - colTop + 2);
    // 球泡
    const bg = ctx.createRadialGradient(x - bulbR * 0.3, bulbY - bulbR * 0.3, bulbR * 0.1, x, bulbY, bulbR);
    bg.addColorStop(0, "rgb(236,110,100)");
    bg.addColorStop(0.6, "rgb(198,52,46)");
    bg.addColorStop(1, "rgb(140,30,28)");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(x, bulbY, bulbR, 0, TAU); ctx.fill();
    // 刻度
    ctx.strokeStyle = "rgba(50,60,74,0.7)"; ctx.lineWidth = 1;
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const gy = Math.round(yTop + (bulbY - bulbR * 0.4 - yTop) * i / n) + 0.5;
      const major = i % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - (major ? 8 : 5), gy); ctx.lineTo(x + w / 2 - 1, gy);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(206,232,244,0.8)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(x - w / 2, yTop, w, bulbY - yTop);
    ctx.restore();
  }

  /* 磁極塊（發電機／馬達的磁極靴）。north 決定紅藍。 */
  function polePiece(ctx, x, y, w, h, north) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (north) {
      g.addColorStop(0, "rgb(226,110,124)"); g.addColorStop(0.4, "rgb(196,64,84)"); g.addColorStop(1, "rgb(140,38,54)");
    } else {
      g.addColorStop(0, "rgb(118,152,206)"); g.addColorStop(0.4, "rgb(66,102,158)"); g.addColorStop(1, "rgb(38,62,104)");
    }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fillRect(x, y, w, Math.max(2, h * 0.10));
    ctx.strokeStyle = "rgba(22,26,34,0.6)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     共用：實驗檯面
     --------------------------------------------------------------- */

  /* 在畫面下緣鋪一層檯面，讓器材有「放在桌上」的著地感。 */
  function benchTop(ctx, W, H, y) {
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, "rgba(120,110,96,0.30)");
    g.addColorStop(0.25, "rgba(96,88,76,0.22)");
    g.addColorStop(1, "rgba(58,54,48,0.30)");
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
    ctx.strokeStyle = "rgba(210,200,180,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
  }

  window.PhysicsLab.apparatus = {
    steel, brass, brassDisc, contactShadow,
    bench, carrier, benchTop,
    candle, laser,
    lens, screen, projectedFlame, glassPlate, curvedMirror, semiCircleGlass, protractor,
    battery, bulb, meter, wire, resistorBox, fuse,
    standRod, crossArm, weight, woodBlock, ramp, pulley, cord, bob, ruler, springScale, beaker,
    cart, tickerTimer, vibrator, tuningFork, glassTube,
    barMagnet, coilWinding, ironCore, thermometer, polePiece
  };
})();
