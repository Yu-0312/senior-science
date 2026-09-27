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
  /*
   * 電池盒（實物級）：藍色塑膠盒＋兩顆乾電池＋頂部金屬接片，
   * 左右兩側是紅（＋）黑（−）接線柱——導線迴路正好接在這兩點。
   * (x,y,w,h) 與舊版完全相容：x,y 為盒體左上角。
   */
  function battery(ctx, x, y, w, h) {
    // 盒體：藍色塑膠
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgb(96,150,214)");
    g.addColorStop(0.3, "rgb(62,112,178)");
    g.addColorStop(1, "rgb(34,70,128)");
    ctx.fillStyle = g;
    D.rect(ctx, x, y, w, h, { fill: g, stroke: "rgba(16,32,60,0.75)", r: 4 });
    // 內腔
    ctx.fillStyle = "rgba(12,24,48,0.55)";
    D.rect(ctx, x + 3, y + 5, w - 6, h - 10, { fill: "rgba(12,24,48,0.55)", r: 3 });
    // 兩顆乾電池（直立）
    const cw = (w - 10) / 2;
    [0, 1].forEach(i => {
      const bx = x + 5 + i * (cw + 2), by = y + 8, ch = h - 16;
      const cg = ctx.createLinearGradient(bx, 0, bx + cw, 0);
      cg.addColorStop(0, "rgb(96,104,118)");
      cg.addColorStop(0.45, "rgb(148,156,170)");
      cg.addColorStop(1, "rgb(74,82,96)");
      ctx.fillStyle = cg;
      D.rect(ctx, bx, by, cw, ch, { fill: cg, stroke: "rgba(20,28,40,0.7)", r: 2.5 });
      // 銅帽端
      ctx.fillStyle = i === 0 ? "rgb(198,148,72)" : "rgb(120,128,142)";
      ctx.fillRect(bx + cw * 0.25, by - 2.5, cw * 0.5, 3);
      // 電池標籤帶
      ctx.fillStyle = "rgba(230,236,244,0.85)";
      ctx.fillRect(bx + 2, by + ch * 0.3, cw - 4, ch * 0.34);
    });
    // 頂部金屬接片把兩顆串起來
    ctx.strokeStyle = "rgb(178,188,200)"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x + 5 + cw, y + 7); ctx.lineTo(x + 5 + cw + 2, y + 4); ctx.lineTo(x + w - 5 - cw, y + 4); ctx.lineTo(x + w - 5 - cw, y + 7); ctx.stroke();
    // 左右接線柱：紅（＋）黑（−）
    const py = y + h / 2;
    ctx.fillStyle = "rgb(196,62,52)";
    D.rect(ctx, x - 5, py - 4, 8, 8, { fill: "rgb(196,62,52)", stroke: "rgba(60,20,16,0.8)", r: 2 });
    brassDisc(ctx, x - 1, py, 1.8);
    ctx.fillStyle = "rgb(40,46,56)";
    D.rect(ctx, x + w - 3, py - 4, 8, 8, { fill: "rgb(40,46,56)", stroke: "rgba(10,14,20,0.8)", r: 2 });
    brassDisc(ctx, x + w + 1, py, 1.8);
    D.text(ctx, "＋", x - 1, py - 7, { color: "#ff9d94", size: 9, align: "center", weight: "700" });
    D.text(ctx, "－", x + w + 1, py - 7, { color: "#aeb6c4", size: 9, align: "center", weight: "700" });
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

  /*
   * 指針式電表（實物級）：圓形金屬框＋米色錶面＋刻度弧＋紅色指針，
   * 底部兩顆接線柱。frac 是指針在量程中的比例 0..1，label 是 A/V 等單位。
   */
  function meter(ctx, cx, cy, r, frac, label) {
    // 外殼投影與圓形金屬框
    contactShadow(ctx, cx, cy + r * 1.18, r * 1.7);
    const bg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r * 1.14);
    bg.addColorStop(0, "rgb(158,168,182)");
    bg.addColorStop(0.72, "rgb(92,102,118)");
    bg.addColorStop(1, "rgb(44,52,66)");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.14, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(18,26,38,0.75)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.14, 0, TAU); ctx.stroke();
    // 錶面（圓形，米色）
    const face = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
    face.addColorStop(0, "rgb(250,247,238)");
    face.addColorStop(1, "rgb(226,221,206)");
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, 0, TAU); ctx.fill();
    // 刻度弧（主刻度帶數字、副刻度短線）
    ctx.strokeStyle = "rgba(40,48,60,0.85)";
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 1.06 + (i / 10) * Math.PI * 0.88;
      const major = i % 5 === 0;
      const rr = major ? r * 0.66 : r * 0.76;
      ctx.lineWidth = major ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      ctx.stroke();
      if (major) {
        ctx.fillStyle = "rgba(40,48,60,0.9)";
        D.text(ctx, String(i / 5), cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52 + 3,
          { color: "rgba(40,48,60,0.9)", size: Math.max(6, r * 0.16), align: "center" });
      }
    }
    // 指針（紅色，帶尾巴配重）
    const f = Math.max(0, Math.min(1, frac || 0));
    const a = Math.PI * 1.06 + f * Math.PI * 0.88;
    ctx.strokeStyle = "rgb(198,56,46)"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * r * 0.16, cy - Math.sin(a) * r * 0.16);
    ctx.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
    ctx.stroke();
    // 軸心與歸零螺絲
    brassDisc(ctx, cx, cy, Math.max(2.4, r * 0.09));
    ctx.strokeStyle = "rgba(70,80,94,0.8)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.78, r * 0.07, 0, TAU); ctx.stroke();
    if (label) D.text(ctx, label, cx, cy - r * 0.38, { color: "rgba(40,48,60,0.85)", size: Math.max(7, r * 0.2), align: "center", weight: "700" });
    // 底部接線柱：紅黑
    ctx.fillStyle = "rgb(196,62,52)";
    D.rect(ctx, cx - r * 0.72 - 4, cy + r * 1.12, 8, 8, { fill: "rgb(196,62,52)", stroke: "rgba(60,20,16,0.8)", r: 2 });
    ctx.fillStyle = "rgb(40,46,56)";
    D.rect(ctx, cx + r * 0.72 - 4, cy + r * 1.12, 8, 8, { fill: "rgb(40,46,56)", stroke: "rgba(10,14,20,0.8)", r: 2 });
  }

  /*
   * 標準電路圖符號（課本畫法）。ink 是線色；vertical 表示所在導線為鉛直走向。
   * 這組符號與 cable/wire 的幾何外框共用座標，讓「實物圖↔電路圖」能一一對應。
   */
  function symWire(ctx, pts, ink, w) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineWidth = w || 1.8;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke(); ctx.restore();
  }
  function symJunction(ctx, x, y, ink) {
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
  }
  function symBattery(ctx, x, y, vertical, ink) {
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineCap = "butt";
    const seg = (off, len, lw) => {
      ctx.lineWidth = lw;
      ctx.beginPath();
      if (vertical) { ctx.moveTo(x - len / 2, y + off); ctx.lineTo(x + len / 2, y + off); }
      else { ctx.moveTo(x + off, y - len / 2); ctx.lineTo(x + off, y + len / 2); }
      ctx.stroke();
    };
    seg(-9, 16, 2.2); seg(9, 8, 4.2);      // 長線（＋）與短粗線（−）
    ctx.restore();
  }
  function symResistor(ctx, x, y, vertical, ink, label) {
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8;
    if (vertical) ctx.strokeRect(x - 7, y - 17, 14, 34);
    else ctx.strokeRect(x - 17, y - 7, 34, 14);
    ctx.restore();
    if (label) D.text(ctx, label, x + (vertical ? 15 : 0), y + (vertical ? 0 : -14),
      { color: ink, size: 10.5, align: vertical ? "left" : "center" });
  }
  function symRheostat(ctx, x, y, vertical, ink, label) {
    symResistor(ctx, x, y, vertical, ink);
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
    const ax = vertical ? x - 15 : x - 13, ay = vertical ? y + 13 : y + 13;
    const bx = vertical ? x + 15 : x + 13, by = vertical ? y - 13 : y - 13;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    // 箭頭頭
    ctx.beginPath();
    ctx.moveTo(bx, by);
    if (vertical) { ctx.lineTo(bx - 7, by + 1); ctx.lineTo(bx - 1, by + 7); }
    else { ctx.lineTo(bx - 1, by + 7); ctx.lineTo(bx + 7, by + 1); }
    ctx.closePath();
    ctx.fillStyle = ink; ctx.fill();
    ctx.restore();
    if (label) D.text(ctx, label, x + (vertical ? 15 : 0), y + (vertical ? 0 : 16),
      { color: ink, size: 10.5, align: vertical ? "left" : "center" });
  }
  function symBulb(ctx, x, y, lit, ink) {
    ctx.save();
    ctx.strokeStyle = lit ? "rgb(226,178,72)" : ink;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.stroke();
    const k = 10.5;
    ctx.beginPath();
    ctx.moveTo(x - k, y - k); ctx.lineTo(x + k, y + k);
    ctx.moveTo(x + k, y - k); ctx.lineTo(x - k, y + k);
    ctx.stroke();
    ctx.restore();
  }
  function symMeter(ctx, x, y, letter, valueText, ink, tint) {
    ctx.save();
    ctx.fillStyle = "rgba(10,14,20,0.55)";
    ctx.strokeStyle = tint || ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill(); ctx.stroke();
    D.text(ctx, letter, x, y + 4, { color: tint || ink, size: 13, align: "center", weight: "700" });
    ctx.restore();
    if (valueText) D.text(ctx, valueText, x, y + 30, { color: PL.col("text-dim"), size: 10, align: "center" });
  }
  function symSwitch(ctx, x, y, closed, vertical, ink) {
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    const a = { x: x - (vertical ? 0 : 12), y: y - (vertical ? 12 : 0) };
    const b = { x: x + (vertical ? 0 : 12), y: y + (vertical ? 12 : 0) };
    ctx.beginPath(); ctx.arc(a.x, a.y, 2.4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    if (vertical) ctx.lineTo(a.x + (closed ? 0 : 12), a.y + 12);
    else ctx.lineTo(a.x + 12, a.y - (closed ? 0 : 12));
    ctx.stroke();
    ctx.restore();
  }
  function symFuse(ctx, x, y, blown, vertical, ink) {
    ctx.save();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.6;
    if (vertical) D.rect(ctx, x - 5, y - 12, 10, 24, { stroke: ink, width: 1.6, r: 1 });
    else D.rect(ctx, x - 12, y - 5, 24, 10, { stroke: ink, width: 1.6, r: 1 });
    ctx.beginPath();
    if (vertical) {
      if (blown) { ctx.moveTo(x, y - 10); ctx.lineTo(x, y - 3); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + 10); }
      else { ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); }
    } else {
      if (blown) { ctx.moveTo(x - 10, y); ctx.lineTo(x - 3, y); ctx.moveTo(x + 3, y); ctx.lineTo(x + 10, y); }
      else { ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); }
    }
    ctx.stroke();
    ctx.restore();
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

  /*
   * 編織導線（實物級）：每段中點帶自然下垂，深色描邊＋線芯＋高光絲，
   * 端點是黃銅接線柱（導線真的「接」在東西上）。
   * pts 與 wire() 同格式；sag 控制每段下垂量（px）。
   */
  function cable(ctx, pts, color, w, sag) {
    if (!pts || pts.length < 2) return;
    const lw = w || 3.6, dip = sag == null ? 4 : sag;
    const path = off => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y + off);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        // 垂直於線段方向的下垂；水平段往下垂，鉛直段往側邊垂
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.max(1e-6, Math.hypot(dx, dy));
        const nx = -dy / len, ny = dx / len;
        const s = dip * Math.min(1, len / 120);
        ctx.quadraticCurveTo(mx + nx * s + off * 0, my + ny * s + off, b.x, b.y + off);
      }
    };
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.30)"; ctx.lineWidth = lw + 2.2;
    path(1.8); ctx.stroke();
    ctx.strokeStyle = color || "rgb(186,54,48)"; ctx.lineWidth = lw;
    path(0); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = lw * 0.32;
    path(-lw * 0.28); ctx.stroke();
    ctx.restore();
    // 兩端接線柱
    [pts[0], pts[pts.length - 1]].forEach(p => {
      brassDisc(ctx, p.x, p.y, Math.max(2.6, lw * 0.72));
      ctx.strokeStyle = "rgba(20,26,36,0.7)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.6, lw * 0.72), 0, TAU); ctx.stroke();
    });
  }

  /*
   * 閘刀開關（實物級）：電木底座＋黃銅閘刀＋刀柄。
   * open01 = 0 完全閉合（水平），1 完全打開（翹起 52°）。
   * (cx, baseY) 是底座中心；回傳兩端接線柱座標 { left, right }。
   */
  function knifeSwitch(ctx, cx, baseY, w, open01) {
    const hw = w / 2;
    contactShadow(ctx, cx, baseY + 3, w * 0.8);
    // 電木底座
    const bg = ctx.createLinearGradient(0, baseY - 9, 0, baseY + 3);
    bg.addColorStop(0, "rgb(72,62,58)");
    bg.addColorStop(1, "rgb(40,34,32)");
    ctx.fillStyle = bg;
    D.rect(ctx, cx - hw, baseY - 9, w, 12, { fill: bg, stroke: "rgba(16,12,10,0.8)", r: 3 });
    // 兩個黃銅刀座（鉸鏈與觸點）
    const jaw = x => {
      ctx.fillStyle = "rgb(196,158,88)";
      D.rect(ctx, x - 4, baseY - 20, 8, 15, { fill: "rgb(196,158,88)", stroke: "rgba(80,56,20,0.85)", r: 2 });
      brassDisc(ctx, x, baseY - 18, 2.2);
    };
    jaw(cx - hw + 7); jaw(cx + hw - 7);
    // 閘刀：從鉸鏈側轉起
    const ang = -(open01 || 0) * 52 * Math.PI / 180;
    ctx.save();
    ctx.translate(cx - hw + 7, baseY - 17);
    ctx.rotate(ang);
    const lg = ctx.createLinearGradient(0, 0, w - 20, 0);
    lg.addColorStop(0, "rgb(226,192,120)");
    lg.addColorStop(0.5, "rgb(198,158,88)");
    lg.addColorStop(1, "rgb(164,126,62)");
    ctx.strokeStyle = lg; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w - 20, 0); ctx.stroke();
    // 刀柄（黑色絕緣把）
    ctx.strokeStyle = "rgb(52,46,44)"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(w - 20, 0); ctx.lineTo(w - 12, 0); ctx.stroke();
    ctx.restore();
    // 底座兩端接線柱
    const left = { x: cx - hw + 7, y: baseY - 2 }, right = { x: cx + hw - 7, y: baseY - 2 };
    brassDisc(ctx, left.x, left.y, 3);
    brassDisc(ctx, right.x, right.y, 3);
    return { left, right };
  }

  /*
   * 滑動變阻器（實物級）：瓷管繞線＋上方金屬滑桿＋滑片，
   * frac 0..1 決定滑片位置。(cx, baseY) 是底面中心。
   * 回傳下方兩端接線柱與滑桿接點座標。
   */
  function rheostat(ctx, cx, baseY, w, frac) {
    const hw = w / 2, tubeY = baseY - 16, rodY = baseY - 34;
    contactShadow(ctx, cx, baseY + 3, w * 0.7);
    // 瓷管繞線：底色＋一圈圈電阻線
    const tg = ctx.createLinearGradient(0, tubeY - 9, 0, tubeY + 9);
    tg.addColorStop(0, "rgb(226,218,200)");
    tg.addColorStop(1, "rgb(186,176,156)");
    ctx.fillStyle = tg;
    D.rect(ctx, cx - hw + 8, tubeY - 9, w - 16, 18, { fill: tg, stroke: "rgba(80,70,52,0.7)", r: 8 });
    ctx.strokeStyle = "rgba(122,84,52,0.85)"; ctx.lineWidth = 1.4;
    const coils = Math.max(8, Math.round(w / 4.5));
    for (let i = 0; i <= coils; i++) {
      const x = cx - hw + 10 + (w - 20) * (i / coils);
      ctx.beginPath(); ctx.moveTo(x, tubeY - 7.5); ctx.lineTo(x, tubeY + 7.5); ctx.stroke();
    }
    // 支腳
    [-1, 1].forEach(s => {
      ctx.strokeStyle = "rgb(110,120,134)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + s * (hw - 8), tubeY + 8); ctx.lineTo(cx + s * (hw - 8), baseY); ctx.stroke();
    });
    // 上方金屬滑桿
    ctx.strokeStyle = "rgb(150,160,174)"; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(cx - hw + 6, rodY); ctx.lineTo(cx + hw - 6, rodY); ctx.stroke();
    // 滑片（隨 frac 移動）＋把手
    const f = Math.max(0, Math.min(1, frac || 0));
    const sx = cx - hw + 6 + (w - 12) * f;
    ctx.fillStyle = "rgb(96,106,120)";
    D.rect(ctx, sx - 4, rodY - 5, 8, 22, { fill: "rgb(96,106,120)", stroke: "rgba(24,32,44,0.8)", r: 2 });
    brassDisc(ctx, sx, rodY - 6, 4);
    // 四個接線柱：管兩端＋桿兩端
    const posts = { tubeL: { x: cx - hw + 8, y: baseY - 2 }, tubeR: { x: cx + hw - 8, y: baseY - 2 }, rodL: { x: cx - hw + 6, y: rodY }, rodR: { x: cx + hw - 6, y: rodY } };
    brassDisc(ctx, posts.tubeL.x, posts.tubeL.y, 3);
    brassDisc(ctx, posts.tubeR.x, posts.tubeR.y, 3);
    brassDisc(ctx, posts.rodL.x, posts.rodL.y, 3);
    brassDisc(ctx, posts.rodR.x, posts.rodR.y, 3);
    return { posts, slider: { x: sx, y: rodY } };
  }

  /*
   * 讀值晶片：掛在元件旁的即時數值小卡（對標電路工坊每顆元件頭上的屬性條）。
   * (x,y) 是晶片左上角；tint 給邊框與數字上色。
   * 底色用 panel-2 主題變數——深色主題是暗面板、淺色主題自動變白，不會出現黑洞。
   */
  function valueChip(ctx, x, y, text, tint) {
    const w = Math.max(34, text.length * 6.4 + 12), h = 17;
    D.rect(ctx, x, y, w, h, { fill: PL.col("panel-2", "rgba(10,14,20,0.62)"), stroke: tint || PL.col("accent-2", "rgba(120,190,255,0.7)"), width: 1, r: 5 });
    D.text(ctx, text, x + w / 2, y + 12, { color: tint || PL.col("accent-2", "rgba(120,190,255,0.95)"), size: 9.5, align: "center", weight: "700" });
    return { x, y, w, h };
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
    // 槽碼的提把缺口與下緣倒角（h 夠高才畫，避免小砝碼糊掉）
    if (h > 18) {
      ctx.fillStyle = "rgba(18,24,32,0.78)";
      D.rect(ctx, cx - w * 0.22, topY + h * 0.42, w * 0.44, 3.2, { fill: "rgba(18,24,32,0.78)", r: 1.6 });
      ctx.fillStyle = "rgba(200,210,224,0.28)";
      ctx.fillRect(cx - w / 2 + 2, topY + h - 3, w - 4, 2);
    }
    if (label) D.text(ctx, label, cx, topY + h / 2 + 4, { color: "#eef3fa", size: 10, align: "center", weight: "700" });
  }

  /* 木塊（斜面、摩擦力實驗用）。ang 為傾角（弧度），(cx,cy) 是底面中心。 */
  function woodBlock(ctx, cx, cy, w, h, ang) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang || 0);
    const r = Math.min(3.5, w * 0.12, h * 0.18);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0.00, "rgb(210,168,112)");
    g.addColorStop(0.35, "rgb(182,138,86)");
    g.addColorStop(1.00, "rgb(140,101,58)");
    ctx.fillStyle = g;
    D.rect(ctx, -w / 2, -h, w, h, { fill: g, stroke: "rgba(84,56,26,0.72)", r });
    // 頂緣高光：受光的上面那一條
    ctx.strokeStyle = "rgba(255,232,196,0.5)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-w / 2 + r + 1, -h + 1.4); ctx.lineTo(w / 2 - r - 1, -h + 1.4); ctx.stroke();
    // 木紋與拼板縫
    ctx.strokeStyle = "rgba(110,76,40,0.35)"; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const yy = -h + (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, yy); ctx.lineTo(w / 2 - 2, yy + (i % 2 ? 1.5 : -1.5)); ctx.stroke();
    }
    if (w > 30) {
      ctx.strokeStyle = "rgba(96,64,32,0.4)";
      ctx.beginPath(); ctx.moveTo(0, -h + 2.5); ctx.lineTo(0, -2.5); ctx.stroke();
    }
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

  /* 定滑輪：輪體 + 輪槽 + 軸心螺栓 + 左上高光弧 */
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
    // 繩槽：靠外緣的凹槽用兩道同心弧表現
    ctx.strokeStyle = "rgba(30,38,50,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    brassDisc(ctx, cx, cy, r * 0.22);
  }

  /* 細繩 */
  function cord(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = "rgba(232,226,210,0.9)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  /* 擺球（金屬球）：頂部掛環 + 球面高光點，讓繩子有明確的接點 */
  function bob(ctx, cx, cy, r) {
    // 掛環：畫在球體之前，開口藏在球後
    ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy - r + 1, Math.max(2, r * 0.22), Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r);
    g.addColorStop(0, "rgb(226,234,246)");
    g.addColorStop(0.35, "rgb(150,162,180)");
    g.addColorStop(0.8, "rgb(78,87,102)");
    g.addColorStop(1, "rgb(46,53,65)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(24,30,40,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    // 環境反光點
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath(); ctx.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.13, r * 0.09, -0.6, 0, TAU); ctx.fill();
  }

  /*
   * 動力小車（參考真實實驗室推車的樣貌）：
   *   金屬膠囊車身 + 頂板深色飾條 + 兩端橡膠保險桿 + 兩端眼環掛鉤
   *   + 輪胎（帶刻紋）/輪轂/黃銅螺栓三層輪組。
   * baseY 是輪子著地的高度；w、h 是車身的寬高。
   * opts.cargo 會在車頂放一個木質砝碼塊（彈簧振子等實驗用）。
   */
  function cart(ctx, cx, baseY, w, h, opts) {
    opts = opts || {};
    const r = Math.max(4, Math.min(9, h * 0.26));
    const bodyBot = baseY - r * 1.1, bodyTop = bodyBot - h;
    const rad = Math.min(h * 0.28, w * 0.16);
    contactShadow(ctx, cx, baseY + 2, w * 0.62);
    // 輪組：先畫輪，車身壓在上緣（輪子只露出下半與側緣）
    [-1, 1].forEach(s => {
      const wx = cx + s * (w * 0.30);
      // 輪胎
      const tg = ctx.createRadialGradient(wx - r * 0.2, baseY - r - r * 0.2, r * 0.2, wx, baseY - r, r);
      tg.addColorStop(0, "rgb(64,72,86)");
      tg.addColorStop(0.75, "rgb(40,46,58)");
      tg.addColorStop(1, "rgb(24,28,36)");
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(wx, baseY - r, r, 0, TAU); ctx.fill();
      // 刻紋：外緣幾道短弧
      ctx.strokeStyle = "rgba(12,16,22,0.8)"; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = i * TAU / 6 + 0.35;
        ctx.beginPath(); ctx.arc(wx, baseY - r, r - 1.2, a, a + 0.42); ctx.stroke();
      }
      // 輪轂
      const hg = ctx.createRadialGradient(wx - r * 0.25, baseY - r - r * 0.25, r * 0.08, wx, baseY - r, r * 0.55);
      hg.addColorStop(0, "rgb(208,216,226)");
      hg.addColorStop(0.7, "rgb(130,140,152)");
      hg.addColorStop(1, "rgb(74,82,96)");
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(wx, baseY - r, r * 0.55, 0, TAU); ctx.fill();
      brassDisc(ctx, wx, baseY - r, r * 0.2);
    });
    // 車身：金屬膠囊
    const g = ctx.createLinearGradient(0, bodyTop, 0, bodyBot);
    g.addColorStop(0.00, "rgb(202,212,222)");
    g.addColorStop(0.38, "rgb(162,172,184)");
    g.addColorStop(1.00, "rgb(98,106,118)");
    ctx.fillStyle = g;
    D.rect(ctx, cx - w / 2, bodyTop, w, h, { fill: g, stroke: "rgba(28,36,48,0.72)", r: rad });
    // 頂板飾條
    ctx.fillStyle = "rgba(30,38,50,0.42)";
    D.rect(ctx, cx - w / 2 + rad * 0.7, bodyTop + 2, w - rad * 1.4, 3, { fill: "rgba(30,38,50,0.42)", r: 1.5 });
    // 兩端保險桿（深色豎條）
    [-1, 1].forEach(s => {
      ctx.fillStyle = "rgba(24,30,40,0.5)";
      D.rect(ctx, cx + s * (w / 2 - 4.5) - 1.6, bodyTop + 3, 3.2, h - 6, { fill: "rgba(24,30,40,0.5)", r: 1.6 });
    });
    // 車身側面高光
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + rad, bodyTop + h * 0.3); ctx.lineTo(cx + w / 2 - rad, bodyTop + h * 0.3); ctx.stroke();
    // 兩端眼環掛鉤：彈簧、細繩的接點
    [-1, 1].forEach(s => {
      const hx = cx + s * (w / 2 + 2.5), hy = bodyTop + h * 0.5;
      ctx.strokeStyle = "rgba(46,54,66,0.95)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy, 3.6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "rgba(200,210,220,0.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(hx, hy, 3.6, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
      // 接座：把環繫在車身上的小墊片
      ctx.fillStyle = "rgba(50,58,70,0.9)";
      ctx.fillRect(cx + s * (w / 2 - 3), hy - 2, s * 5, 4);
    });
    // 車頂貨物（可選）：木質砝碼塊
    if (opts.cargo) {
      const cw = w * 0.42, chh = Math.max(8, h * 0.42);
      woodBlock(ctx, cx, bodyTop + 1, cw, chh, 0);
    }
  }

  /*
   * 牆面固定柱：底座 + 立柱 + 頂蓋 + 掛簧螺栓座。
   * (x, baseY) 是底座中心、topY 是柱頂；bossY 是彈簧/繩索的掛點高度。
   * 回傳掛點座標，呼叫端直接把彈簧畫到回傳值上。
   */
  function wallPost(ctx, x, baseY, topY, bossY) {
    // 底座與固定螺栓
    const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    g.addColorStop(0, "rgb(88,97,110)");
    g.addColorStop(0.4, "rgb(146,156,170)");
    g.addColorStop(1, "rgb(70,78,92)");
    ctx.fillStyle = g;
    D.rect(ctx, x - 10, baseY - 7, 20, 9, { fill: g, stroke: "rgba(26,34,46,0.7)", r: 2 });
    ctx.fillStyle = "rgba(20,26,36,0.85)";
    ctx.beginPath(); ctx.arc(x - 5.5, baseY - 2.5, 1.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5.5, baseY - 2.5, 1.4, 0, TAU); ctx.fill();
    // 立柱
    const cg = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
    cg.addColorStop(0, "rgb(96,106,120)");
    cg.addColorStop(0.35, "rgb(158,168,182)");
    cg.addColorStop(0.8, "rgb(108,118,132)");
    cg.addColorStop(1, "rgb(64,72,86)");
    ctx.fillStyle = cg;
    ctx.fillRect(x - 5, topY, 10, baseY - 7 - topY);
    ctx.strokeStyle = "rgba(26,34,46,0.55)"; ctx.lineWidth = 1;
    ctx.strokeRect(x - 5 + 0.5, topY + 0.5, 9, baseY - 8 - topY);
    // 頂蓋
    ctx.fillStyle = g;
    D.rect(ctx, x - 8, topY - 5, 16, 6, { fill: g, stroke: "rgba(26,34,46,0.7)", r: 2 });
    // 掛簧螺栓座：彈簧端圈就是套在這顆螺栓上
    const bg = ctx.createRadialGradient(x - 1.5, bossY - 1.5, 0.8, x, bossY, 6);
    bg.addColorStop(0, "rgb(196,206,218)");
    bg.addColorStop(0.75, "rgb(126,136,150)");
    bg.addColorStop(1, "rgb(70,78,92)");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(x, bossY, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(26,34,46,0.7)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, bossY, 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(16,22,30,0.9)";
    ctx.beginPath(); ctx.arc(x, bossY, 2, 0, TAU); ctx.fill();
    return { x, y: bossY };
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

  /*
   * 在畫面下緣鋪一層檯面，讓器材有「放在桌上」的著地感。
   * v2：不只是一條灰帶——整個畫面換成實驗室（後牆＋木頭實驗桌），
   * 所有呼叫 benchTop 的實驗一起從「方格紙」搬進實驗室。
   * 它只會在場景最一開始被呼叫（D.bg 之後、器材之前），所以可以安心鋪滿。
   */
  function benchTop(ctx, W, H, y, o) {
    labRoom(ctx, W, H, y, o);
  }

  /* ---------------------------------------------------------------
     場景：天空（萬有引力、軌道、宇宙學實驗共用）
     --------------------------------------------------------------- */

  /*
   * 決定論偽隨機：同一個實驗每次畫出的星空都要一樣，
   * 否則每幀星星都在跳。種子取自實驗傳入的 salt。
   */
  function seeded(seed) {
    let s = seed | 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 8) & 0xffffff) / 0xffffff;
    };
  }

  /*
   * 星空：遠景小星星（固定）＋兩層淡星雲霧。
   * 主題感知：亮色主題下星星轉為深藍點，底色交給 D.bg 之後再疊。
   */
  function starfield(ctx, W, H, salt) {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const rnd = seeded(salt || 42);
    const n = Math.round(W * H / 5200);
    // 星雲霧：兩大團極淡的色斑，讓背景不是純色
    const nebA = rnd() * W, nebB = rnd() * W;
    let g = ctx.createRadialGradient(nebA, H * 0.3, 10, nebA, H * 0.3, H * 0.55);
    g.addColorStop(0, light ? "rgba(90,130,220,0.055)" : "rgba(120,150,255,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(nebB, H * 0.75, 10, nebB, H * 0.75, H * 0.5);
    g.addColorStop(0, light ? "rgba(160,110,60,0.045)" : "rgba(200,140,90,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, r = rnd();
      const rr = r < 0.86 ? 0.7 : r < 0.97 ? 1.1 : 1.7;
      const a = 0.14 + rnd() * (light ? 0.20 : 0.55);
      ctx.fillStyle = light
        ? `rgba(40,70,130,${a})`
        : (r > 0.9 ? `rgba(255,235,200,${a})` : `rgba(220,230,255,${a})`);
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    }
  }

  /*
   * 行星：有明暗界線的球體（側光）。r 為半徑，tone 是主色 rgb 陣列。
   * 畫地球用藍綠色調＋極冠與雲帶；畫其他天體換 tone 即可。
   */
  function planet(ctx, cx, cy, r, tone, kind) {
    const [cr, cg, cb] = tone || [90, 160, 235];
    const light = document.documentElement.getAttribute("data-theme") === "light";
    // 本體：側光球
    const g = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.45, r * 0.12, cx, cy, r * 1.05);
    g.addColorStop(0, `rgb(${Math.min(255, cr + 76)},${Math.min(255, cg + 76)},${Math.min(255, cb + 70)})`);
    g.addColorStop(0.42, `rgb(${cr},${cg},${cb})`);
    g.addColorStop(0.78, `rgb(${Math.round(cr * 0.45)},${Math.round(cg * 0.48)},${Math.round(cb * 0.55)})`);
    g.addColorStop(1, `rgb(${Math.round(cr * 0.22)},${Math.round(cg * 0.26)},${Math.round(cb * 0.34)})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    // 大氣輪廓光
    ctx.strokeStyle = light ? "rgba(60,100,170,0.35)" : `rgba(${cr},${cg},${cb},0.45)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    if (kind === "earth") {
      // 陸塊：幾塊不規則綠斑（固定種子）
      const rnd = seeded(7);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
      ctx.fillStyle = `rgba(${light ? "70,140,80,0.5" : "86,160,92,0.55"})`;
      for (let i = 0; i < 5; i++) {
        const ax = cx + (rnd() - 0.5) * r * 1.5, ay = cy + (rnd() - 0.5) * r * 1.5, ar = r * (0.22 + rnd() * 0.3);
        ctx.beginPath();
        for (let k = 0; k <= 9; k++) {
          const a = k / 9 * TAU, rad = ar * (0.72 + rnd() * 0.5);
          const px = ax + Math.cos(a) * rad, py = ay + Math.sin(a) * rad * 0.74;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
      // 雲帶
      ctx.fillStyle = light ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.30)";
      for (let i = 0; i < 4; i++) {
        const ay = cy - r * 0.7 + (i + rnd()) * r * 0.44;
        ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * r, ay, r * (0.5 + rnd() * 0.4), r * 0.1, 0, 0, TAU); ctx.fill();
      }
      // 極冠
      ctx.fillStyle = "rgba(240,250,255,0.8)";
      ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.94, r * 0.4, r * 0.16, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // 晨昏線陰影（右下暗面）：疊一層半透明黑，讓球體真的「立體」
      const sg = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.2, cx, cy, r * 1.02);
      sg.addColorStop(0, "rgba(0,0,0,0)");
      sg.addColorStop(0.72, "rgba(0,0,0,0)");
      sg.addColorStop(1, light ? "rgba(30,50,90,0.35)" : "rgba(0,0,10,0.55)");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    }
  }

  /* 小型衛星體：金屬灰球＋受光面 */
  function moonBall(ctx, cx, cy, r, tone) {
    const [cr, cg, cb] = tone || [176, 178, 186];
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, `rgb(${Math.min(255, cr + 60)},${Math.min(255, cg + 60)},${Math.min(255, cb + 56)})`);
    g.addColorStop(0.6, `rgb(${cr},${cg},${cb})`);
    g.addColorStop(1, `rgb(${Math.round(cr * 0.4)},${Math.round(cg * 0.42)},${Math.round(cb * 0.5)})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    // 幾個隕石坑
    const rnd = seeded(Math.round(cx * 7 + r * 13));
    ctx.fillStyle = "rgba(60,64,74,0.24)";
    for (let i = 0; i < 3; i++) {
      const ax = cx + (rnd() - 0.5) * r, ay = cy + (rnd() - 0.5) * r, ar = r * (0.14 + rnd() * 0.16);
      ctx.beginPath(); ctx.arc(ax, ay, ar, 0, TAU); ctx.fill();
    }
  }

  /* 數位碼錶：實驗課計時用，readout 由實驗自己疊文字 */
  function stopwatch(ctx, cx, cy, r) {
    // 錶殼
    const shell = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    shell.addColorStop(0, "rgb(210,218,228)");
    shell.addColorStop(0.5, "rgb(140,150,164)");
    shell.addColorStop(1, "rgb(92,100,114)");
    ctx.fillStyle = shell;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(40,48,58,0.55)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    // 錶面
    const face = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 0.78);
    face.addColorStop(0, "rgb(248,250,252)");
    face.addColorStop(1, "rgb(210,218,228)");
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, TAU); ctx.fill();
    // 頂冠與側鈕
    brass(ctx, cx - 4, cy - r - 8, 8, 10);
    ctx.fillStyle = "rgb(120,130,145)";
    ctx.fillRect(cx + r - 2, cy - 4, 7, 8);
    // 顯示窗
    D.rect(ctx, cx - r * 0.55, cy - r * 0.22, r * 1.1, r * 0.42, {
      fill: "#122018", stroke: "rgba(40,48,58,0.4)", r: 3
    });
  }

  /* 十字夾／三爪夾：夾在鐵架橫桿上固定器材 */
  function clampHead(ctx, x, y, length, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    brass(ctx, -5, -5, 10, 10);
    steel(ctx, 4, -2.5, length || 28, 5, 8);
    // 開口鉗爪
    ctx.strokeStyle = "rgb(70,80,94)"; ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo((length || 28) - 2, -2);
    ctx.lineTo((length || 28) + 8, -8);
    ctx.moveTo((length || 28) - 2, 2);
    ctx.lineTo((length || 28) + 8, 8);
    ctx.stroke();
    ctx.restore();
  }

  /* 實驗紀錄板：斜靠在桌邊的數據紙，增強「這是實驗課」的現場感 */
  function dataPad(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.06);
    ctx.translate(-(x + w / 2), -(y + h / 2));
    // 紙張
    ctx.fillStyle = "rgba(242,238,228,0.92)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(120,112,98,0.45)"; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    // 橫格線
    ctx.strokeStyle = "rgba(140,150,170,0.35)";
    for (let ly = y + 10; ly < y + h - 4; ly += 7) {
      ctx.beginPath(); ctx.moveTo(x + 6, ly); ctx.lineTo(x + w - 6, ly); ctx.stroke();
    }
    ctx.restore();
  }

  /* ===============================================================
     場景層 v2：讓每個實驗發生在「一個地方」
     ---------------------------------------------------------------
     原本所有實驗共用同一張方格紙背景，物體像是飄在圖表上。
     學生在課堂上看到的是實驗桌、鐵架、窗外的操場；
     這一層把那個「地方」畫出來，物理量與標註仍然疊在上面。

     兩條規則：
     1. 場景亮度跟著主題走：淺色主題是白天／明亮的實驗室，
        深色主題是夜晚／關燈的實驗室。這樣原本的標註文字色不必改。
     2. 畫完大面積場景後呼叫 note() 把亮度登記進墨色層，
        疊在上面的文字才會自動選對墨色。
     =============================================================== */
  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
  const note = (ctx, color, x, y, w, h) => {
    const T = PL.theme;
    if (T && T.note) T.note(ctx, color, x, y, w, h);
  };
  const clamp01 = v => Math.max(0, Math.min(1, v));

  /* 圓角矩形路徑（不填色，交給呼叫端決定） */
  function rrPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 把 [r,g,b] 調亮（k>0）或調暗（k<0） */
  function shadeRgb(c, k) {
    return c.map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  }
  const rgbStr = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function hexRgb(hex) {
    if (Array.isArray(hex)) return hex;
    const p = PL.theme && PL.theme.parseColor ? PL.theme.parseColor(hex) : null;
    return p ? [p[0], p[1], p[2]] : [224, 112, 58];
  }

  /* ---------------------------------------------------------------
     實驗桌面（木頭／黑色環氧樹脂）
     x0..x1 是桌面範圍，y 是桌面（器材的安裝面），h 是桌板正面露出的高度。
     --------------------------------------------------------------- */
  function benchSlab(ctx, x0, x1, y, h, kind) {
    const L = isLight();
    const w = x1 - x0;
    const topH = Math.max(6, Math.min(16, h * 0.32));   // 透視下看得到的桌面頂面
    let topA, topB, face, faceDark, edge;
    if (kind === "black") {
      topA = L ? "#3b4048" : "#2a2e35"; topB = L ? "#2f343b" : "#20242a";
      face = L ? "#23272d" : "#17191e"; faceDark = L ? "#15181c" : "#0d0f12"; edge = "rgba(255,255,255,0.16)";
    } else if (kind === "steel") {
      topA = L ? "#d7dde4" : "#4a525e"; topB = L ? "#c3cad3" : "#3c434e";
      face = L ? "#a7b0bb" : "#2c323b"; faceDark = L ? "#8e97a3" : "#1f242b"; edge = "rgba(255,255,255,0.35)";
    } else {
      topA = L ? "#e2c294" : "#6e5236"; topB = L ? "#d2ad79" : "#5c432b";
      face = L ? "#b98a55" : "#46321f"; faceDark = L ? "#946638" : "#2f2114"; edge = L ? "rgba(255,240,214,0.7)" : "rgba(255,220,170,0.18)";
    }
    // 桌面頂面
    let g = ctx.createLinearGradient(0, y, 0, y + topH);
    g.addColorStop(0, topA); g.addColorStop(1, topB);
    ctx.fillStyle = g; ctx.fillRect(x0, y, w, topH);
    // 桌板正面
    const faceH = h > topH + 48 ? 22 : Math.max(0, h - topH);
    g = ctx.createLinearGradient(0, y + topH, 0, y + topH + faceH);
    g.addColorStop(0, face); g.addColorStop(1, faceDark);
    ctx.fillStyle = g; ctx.fillRect(x0, y + topH, w, faceH);
    // 前緣高光與陰影縫
    ctx.fillStyle = edge; ctx.fillRect(x0, y + topH - 1, w, 1.2);
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x0, y + topH + 0.5, w, 1.5);
    /*
     * 桌板正面只有二十多像素厚。桌面擺得比較高時，下面一大片不能都是桌板——
     * 那會像一整塊實心木頭。改成實驗桌的櫃體：門片、把手、踢腳板。
     */
    const slabH = topH + 22;
    if (h > slabH + 26) {
      const cy0 = y + slabH, ch = h - slabH;
      const cg = ctx.createLinearGradient(0, cy0, 0, cy0 + ch);
      if (kind === "black" || kind === "steel") { cg.addColorStop(0, L ? "#8d949d" : "#262a31"); cg.addColorStop(1, L ? "#7a818a" : "#1c1f24"); }
      else { cg.addColorStop(0, L ? "#c6a57c" : "#3a2a1b"); cg.addColorStop(1, L ? "#b08d63" : "#2c1f14"); }
      ctx.fillStyle = cg; ctx.fillRect(x0, cy0, w, ch);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x0, cy0, w, 2);
      const doorW = Math.max(90, Math.min(160, w / 5));
      ctx.strokeStyle = L ? "rgba(70,46,20,0.35)" : "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.2;
      for (let dx = x0 + 6; dx + doorW <= x1 - 4; dx += doorW + 6) {
        ctx.strokeRect(dx + 0.5, cy0 + 6.5, doorW - 1, Math.max(8, ch - 18));
        ctx.fillStyle = L ? "rgba(255,244,222,0.18)" : "rgba(255,255,255,0.04)";
        ctx.fillRect(dx + 2, cy0 + 8, doorW - 4, 2);
        // 把手
        ctx.fillStyle = "rgb(170,178,190)";
        ctx.fillRect(dx + doorW - 16, cy0 + 12, 3, Math.min(22, ch * 0.3));
      }
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x0, y + h - 5, w, 5);
      note(ctx, kind === "black" || kind === "steel" ? (L ? "#858c95" : "#22262c") : (L ? "#bd9a70" : "#332518"), x0, cy0, w, ch);
    }
    // 木紋：頂面細長紋 + 正面幾道長弧
    if (kind !== "black" && kind !== "steel") {
      const rnd = seeded(Math.round(w + y));
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y, w, topH + faceH); ctx.clip();
      ctx.lineWidth = 1;
      for (let i = 0; i < Math.max(4, w / 60); i++) {
        const gx = x0 + rnd() * w, gl = 40 + rnd() * 120, gy = y + 2 + rnd() * (topH - 3);
        ctx.strokeStyle = L ? "rgba(120,78,36,0.16)" : "rgba(0,0,0,0.20)";
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gl, gy + (rnd() - 0.5) * 1.5); ctx.stroke();
      }
      for (let i = 0; i < Math.max(3, w / 90); i++) {
        const gx = x0 + rnd() * w, gl = 60 + rnd() * 160, gy = y + topH + 4 + rnd() * Math.max(2, faceH - 8);
        ctx.strokeStyle = L ? "rgba(90,56,24,0.14)" : "rgba(0,0,0,0.22)";
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + gl / 2, gy + (rnd() - 0.5) * 6, gx + gl, gy); ctx.stroke();
      }
      ctx.restore();
    } else if (kind === "black") {
      // 環氧樹脂的細微反光
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x0, y + 1, w, 2);
    }
    note(ctx, topB, x0, y, w, topH);
    note(ctx, face, x0, y + topH, w, faceH);
    return { top: y, faceTop: y + topH };
  }

  /*
   * 實驗室場景：後牆 + 天花板燈光 + 實驗桌。
   * benchY 為桌面高度（器材底部要放在這條線上）；回傳 { top }。
   * o.bench: "wood"（預設）| "black" | "steel" | "none"
   * o.window: true 在牆上開一扇窗（淺色主題為白天、深色為夜晚）
   * o.board: true 畫一塊白板當背景（圖表可以放在上面）
   */
  function labRoom(ctx, W, H, benchY, o) {
    o = o || {};
    const L = isLight();
    const by = benchY == null ? Math.round(H * 0.8) : benchY;
    // 牆面
    let g = ctx.createLinearGradient(0, 0, 0, by);
    if (L) { g.addColorStop(0, "#f3f0ea"); g.addColorStop(1, "#e6e0d5"); }
    else { g.addColorStop(0, "#19202b"); g.addColorStop(1, "#12171f"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, by);
    note(ctx, L ? "#ede8df" : "#161c26", 0, 0, W, by);
    // 天花板燈打在牆上的光暈
    const rg = ctx.createRadialGradient(W * 0.5, -H * 0.15, 20, W * 0.5, -H * 0.15, Math.max(W, H) * 0.95);
    rg.addColorStop(0, L ? "rgba(255,255,250,0.75)" : "rgba(150,180,230,0.10)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, by);
    // 牆板接縫 + 腰線
    if (o.panels !== false) {
      ctx.save();
      ctx.strokeStyle = L ? "rgba(96,82,60,0.075)" : "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
      const step = Math.max(150, W / 5);
      ctx.beginPath();
      for (let x = step * 0.62; x < W; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, by); }
      ctx.stroke();
      const ry = by - Math.min(64, by * 0.26);
      ctx.fillStyle = L ? "rgba(120,98,66,0.09)" : "rgba(255,255,255,0.028)";
      ctx.fillRect(0, ry, W, 3);
      ctx.fillStyle = L ? "rgba(120,98,66,0.035)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(0, ry + 3, W, by - ry - 3);
      ctx.restore();
    }
    if (o.window) labWindow(ctx, o.window.x != null ? o.window.x : W * 0.72, o.window.y != null ? o.window.y : by * 0.12,
      o.window.w || Math.min(180, W * 0.2), o.window.h || by * 0.46);
    if (o.board) whiteboard(ctx, o.board.x, o.board.y, o.board.w, o.board.h);
    // 牆與桌面交界的接觸陰影
    g = ctx.createLinearGradient(0, by - 18, 0, by);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, L ? "rgba(70,50,20,0.10)" : "rgba(0,0,0,0.35)");
    ctx.fillStyle = g; ctx.fillRect(0, by - 18, W, 18);
    if (o.bench !== "none") benchSlab(ctx, 0, W, by, H - by, o.bench || "wood");
    return { top: by };
  }

  /* 牆上的窗：淺色主題看得到藍天白雲，深色主題是夜空 */
  function labWindow(ctx, x, y, w, h) {
    const L = isLight();
    ctx.save();
    // 窗框
    rrPath(ctx, x - 6, y - 6, w + 12, h + 12, 4);
    ctx.fillStyle = L ? "#d9d4ca" : "#2a313c"; ctx.fill();
    // 天空
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (L) { g.addColorStop(0, "#9fd0ef"); g.addColorStop(1, "#dff1fb"); }
    else { g.addColorStop(0, "#0b1426"); g.addColorStop(1, "#1a2945"); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (L) {
      cloud(ctx, x + w * 0.3, y + h * 0.3, w * 0.22, 0.9);
      cloud(ctx, x + w * 0.78, y + h * 0.55, w * 0.16, 0.75);
      // 遠處樹梢
      ctx.fillStyle = "rgba(96,150,96,0.55)";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + i * w / 5, y + h + 4, w * 0.16, 0, TAU); ctx.fill(); }
    } else {
      const rnd = seeded(Math.round(x + y));
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = `rgba(230,236,255,${0.3 + rnd() * 0.5})`;
        ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h * 0.8, rnd() < 0.8 ? 0.8 : 1.3, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "rgba(245,240,215,0.9)";
      ctx.beginPath(); ctx.arc(x + w * 0.74, y + h * 0.25, Math.min(w, h) * 0.08, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // 窗櫺
    ctx.fillStyle = L ? "#cfc9bd" : "#333b47";
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    ctx.fillRect(x, y + h * 0.45 - 2, w, 4);
    ctx.fillStyle = L ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.moveTo(x + w * 0.08, y + h); ctx.lineTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.4, y); ctx.lineTo(x + w * 0.18, y + h); ctx.fill();
    note(ctx, L ? "#c8e5f5" : "#121e34", x, y, w, h);
  }

  /* 白板：圖表可以畫在上面，比浮在牆上自然 */
  function whiteboard(ctx, x, y, w, h) {
    const L = isLight();
    contactShadow(ctx, x + w / 2, y + h + 6, w * 0.4);
    rrPath(ctx, x - 5, y - 5, w + 10, h + 10, 4);
    ctx.fillStyle = L ? "#b9c0c9" : "#39414d"; ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (L) { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#f1f4f7"); }
    else { g.addColorStop(0, "#1f2631"); g.addColorStop(1, "#1a2029"); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = L ? "#a9b1bc" : "#2f3742";
    ctx.fillRect(x + w * 0.1, y + h + 5, w * 0.8, 4);
    note(ctx, L ? "#fbfcfd" : "#1d242e", x, y, w, h);
  }

  /* 雲：幾顆重疊圓，s 是寬度尺度 */
  function cloud(ctx, cx, cy, s, alpha) {
    const L = isLight();
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    const base = L ? "rgba(255,255,255,0.95)" : "rgba(130,145,175,0.13)";
    const shade = L ? "rgba(205,222,236,0.9)" : "rgba(80,95,125,0.10)";
    const puffs = [[-0.55, 0.08, 0.34], [-0.2, -0.12, 0.46], [0.22, -0.05, 0.4], [0.55, 0.1, 0.3], [0, 0.16, 0.36]];
    ctx.fillStyle = shade;
    puffs.forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0] * s, cy + p[1] * s + s * 0.06, p[2] * s, 0, TAU); ctx.fill(); });
    ctx.fillStyle = base;
    puffs.forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0] * s, cy + p[1] * s, p[2] * s, 0, TAU); ctx.fill(); });
    ctx.restore();
  }

  /*
   * 戶外場景：天空 + 太陽／月亮 + 雲 + 遠山 + 地面。
   * groundY 為地面高度；回傳 { top: groundY }。
   * o.t     讓雲緩慢飄動（傳模擬時間）
   * o.ground: "grass"（預設）| "field" | "sand" | "asphalt" | "none"
   * o.hills: false 不畫遠山；o.city: true 畫遠方城市剪影
   * o.sun: false 不畫太陽
   */
  function outdoor(ctx, W, H, groundY, o) {
    o = o || {};
    const L = isLight();
    const gy = groundY == null ? Math.round(H * 0.8) : groundY;
    // 天空
    let g = ctx.createLinearGradient(0, 0, 0, gy);
    if (L) { g.addColorStop(0, "#8ec9ee"); g.addColorStop(0.65, "#c7e6f7"); g.addColorStop(1, "#eaf6fb"); }
    else { g.addColorStop(0, "#08111f"); g.addColorStop(0.7, "#14223b"); g.addColorStop(1, "#23324f"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, gy);
    note(ctx, L ? "#bfe2f6" : "#111d33", 0, 0, W, gy);
    if (!L) {
      const rnd = seeded(97 + Math.round(W));
      for (let i = 0; i < W * gy / 3800; i++) {
        ctx.fillStyle = `rgba(226,234,255,${0.18 + rnd() * 0.5})`;
        ctx.beginPath(); ctx.arc(rnd() * W, rnd() * gy * 0.75, rnd() < 0.85 ? 0.7 : 1.2, 0, TAU); ctx.fill();
      }
    }
    // 太陽／月亮
    if (o.sun !== false) {
      const sx = o.sunX != null ? o.sunX : W * 0.86, sy = o.sunY != null ? o.sunY : gy * 0.2;
      const sr = Math.max(14, Math.min(W, gy) * 0.055);
      const halo = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 4);
      halo.addColorStop(0, L ? "rgba(255,244,200,0.75)" : "rgba(220,230,255,0.22)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo; ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
      ctx.fillStyle = L ? "#fff3c4" : "#eef0f6";
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
      if (!L) {
        ctx.fillStyle = "rgba(150,160,180,0.35)";
        ctx.beginPath(); ctx.arc(sx - sr * 0.3, sy - sr * 0.2, sr * 0.22, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + sr * 0.3, sy + sr * 0.3, sr * 0.14, 0, TAU); ctx.fill();
      }
    }
    // 雲：緩慢飄移
    if (o.clouds !== false) {
      const rnd = seeded(31 + Math.round(H));
      const drift = (o.t || 0) * 6;
      const n = Math.max(3, Math.round(W / 260));
      for (let i = 0; i < n; i++) {
        const baseX = rnd() * (W + 240) - 120, cyy = gy * (0.1 + rnd() * 0.35), s = 36 + rnd() * 50;
        const cx = ((baseX + drift * (0.6 + rnd() * 0.6)) % (W + 240) + W + 240) % (W + 240) - 120;
        cloud(ctx, cx, cyy, s, L ? 0.9 : 1);
      }
    }
    // 遠山兩層
    if (o.hills !== false) {
      const layer = (baseY, amp, col, seed) => {
        const rnd = seeded(seed);
        const p1 = rnd() * TAU, p2 = rnd() * TAU, f1 = 1.6 + rnd(), f2 = 3.8 + rnd() * 2;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, gy);
        for (let x = 0; x <= W; x += 8) {
          const u = x / W;
          ctx.lineTo(x, baseY - amp * (0.55 + 0.3 * Math.sin(u * TAU * f1 / 2 + p1) + 0.15 * Math.sin(u * TAU * f2 + p2)));
        }
        ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
      };
      layer(gy, Math.min(90, gy * 0.26), L ? "rgba(150,186,170,0.55)" : "rgba(28,44,56,0.9)", 11);
      layer(gy, Math.min(56, gy * 0.16), L ? "rgba(122,168,120,0.7)" : "rgba(22,38,40,0.95)", 23);
    }
    if (o.city) skyline(ctx, 0, W, gy, Math.min(80, gy * 0.24));
    // 地面
    const kind = o.ground || "grass";
    if (kind !== "none") ground(ctx, 0, W, gy, H - gy, kind);
    return { top: gy };
  }

  /* 城市剪影 */
  function skyline(ctx, x0, x1, baseY, maxH) {
    const L = isLight();
    const rnd = seeded(Math.round(x1 * 3 + baseY));
    ctx.fillStyle = L ? "rgba(140,160,182,0.55)" : "rgba(30,40,58,0.95)";
    let x = x0;
    while (x < x1) {
      const bw = 18 + rnd() * 34, bh = maxH * (0.35 + rnd() * 0.65);
      ctx.fillRect(x, baseY - bh, bw - 3, bh);
      if (!L) {
        ctx.fillStyle = "rgba(255,214,120,0.35)";
        for (let wy = baseY - bh + 6; wy < baseY - 6; wy += 9) {
          for (let wx = x + 4; wx < x + bw - 7; wx += 7) if (rnd() < 0.3) ctx.fillRect(wx, wy, 2.5, 3.5);
        }
        ctx.fillStyle = "rgba(30,40,58,0.95)";
      }
      x += bw;
    }
  }

  /* 地面：草地／操場／沙地／柏油 */
  function ground(ctx, x0, x1, y, h, kind) {
    const L = isLight();
    const w = x1 - x0;
    let top, bot, lineCol;
    if (kind === "sand") { top = L ? "#e9d3a4" : "#4a3f2c"; bot = L ? "#d4b980" : "#2f281c"; lineCol = L ? "rgba(150,110,60,0.25)" : "rgba(0,0,0,0.25)"; }
    else if (kind === "asphalt") { top = L ? "#7d838c" : "#2b2f35"; bot = L ? "#646a73" : "#1c1f24"; lineCol = "rgba(0,0,0,0.2)"; }
    else if (kind === "field") { top = L ? "#c98b5b" : "#4b3021"; bot = L ? "#b27448" : "#321f15"; lineCol = L ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"; }
    else { top = L ? "#9ccf73" : "#27452b"; bot = L ? "#76b04f" : "#18301d"; lineCol = L ? "rgba(60,110,40,0.4)" : "rgba(0,0,0,0.3)"; }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(x0, y, w, h);
    note(ctx, top, x0, y, w, h);
    ctx.fillStyle = L ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)";
    ctx.fillRect(x0, y, w, 1.5);
    const rnd = seeded(Math.round(w * 7 + y));
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y, w, h); ctx.clip();
    if (kind === "grass") {
      ctx.strokeStyle = lineCol; ctx.lineWidth = 1.2;
      for (let i = 0; i < w / 7; i++) {
        const gx = x0 + rnd() * w, gy2 = y + 3 + rnd() * h, gh = 3 + rnd() * 4;
        ctx.beginPath(); ctx.moveTo(gx, gy2); ctx.lineTo(gx - 1.5, gy2 - gh); ctx.moveTo(gx, gy2); ctx.lineTo(gx + 1.8, gy2 - gh * 0.8); ctx.stroke();
      }
    } else if (kind === "sand" || kind === "field") {
      ctx.fillStyle = lineCol;
      for (let i = 0; i < w / 5; i++) { ctx.fillRect(x0 + rnd() * w, y + 2 + rnd() * h, 1.6, 1.2); }
    } else if (kind === "asphalt") {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let i = 0; i < w / 3; i++) ctx.fillRect(x0 + rnd() * w, y + rnd() * h, 1.2, 1.2);
    }
    ctx.restore();
  }

  /* 柏油路面（側視）：路面 + 車道虛線。回傳路面頂端 y。 */
  function road(ctx, x0, x1, y, h, o) {
    o = o || {};
    const L = isLight();
    ground(ctx, x0, x1, y, h, "asphalt");
    const dash = o.dash || 26, gap = o.gap || 22, off = ((o.offset || 0) % (dash + gap) + dash + gap) % (dash + gap);
    ctx.fillStyle = L ? "rgba(255,255,255,0.85)" : "rgba(235,235,200,0.55)";
    const my = y + h * (o.laneAt || 0.5);
    for (let x = x0 - off; x < x1; x += dash + gap) ctx.fillRect(x, my - 1.5, dash, 3);
    // 路緣
    ctx.fillStyle = L ? "#c9ccd1" : "#474c54";
    ctx.fillRect(x0, y - 3, x1 - x0, 3);
    return y;
  }

  /* 水面（側視或俯視都可）：漸層 + 會動的波紋 */
  function water(ctx, x, y, w, h, t, o) {
    o = o || {};
    const L = isLight();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (L) { g.addColorStop(0, "#7cc3e6"); g.addColorStop(1, "#3f94c4"); }
    else { g.addColorStop(0, "#1c4a68"); g.addColorStop(1, "#0f2c44"); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    note(ctx, L ? "#68b3dc" : "#173e59", x, y, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const rnd = seeded(Math.round(w + h * 3));
    const flow = (o.flow || 0) * (t || 0);
    ctx.strokeStyle = L ? "rgba(255,255,255,0.45)" : "rgba(170,210,240,0.22)"; ctx.lineWidth = 1.3;
    const n = Math.round(w * h / 1800);
    for (let i = 0; i < n; i++) {
      const bx = rnd() * w, by = rnd() * h, len = 10 + rnd() * 18;
      const px = x + ((bx + flow * (0.7 + rnd() * 0.6)) % w + w) % w;
      const py = y + by + Math.sin((t || 0) * 1.6 + i) * 1.2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + len / 2, py - 2.5, px + len, py); ctx.stroke();
    }
    ctx.restore();
  }

  /* 樹（戶外場景點綴） */
  function tree(ctx, x, baseY, h, seed) {
    const L = isLight();
    const rnd = seeded(seed || Math.round(x));
    ctx.fillStyle = L ? "#8a6240" : "#3a2a1c";
    ctx.fillRect(x - h * 0.04, baseY - h * 0.42, h * 0.08, h * 0.42);
    const cols = L ? ["#5f9e4f", "#72b35d", "#4f8c43"] : ["#1f3d25", "#28492d", "#18311e"];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % 3];
      ctx.beginPath();
      ctx.arc(x + (rnd() - 0.5) * h * 0.4, baseY - h * (0.55 + rnd() * 0.3), h * (0.16 + rnd() * 0.1), 0, TAU);
      ctx.fill();
    }
  }

  /* 旗子：插在地上的標竿，t 讓旗面飄動 */
  function flag(ctx, x, baseY, h, color, t, label) {
    ctx.strokeStyle = "rgb(120,128,140)"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - h); ctx.stroke();
    const fw = Math.max(18, h * 0.42), fh = Math.max(12, h * 0.26), ph = (t || 0) * 5;
    ctx.fillStyle = color || "#e0473c";
    ctx.beginPath(); ctx.moveTo(x, baseY - h);
    for (let i = 0; i <= 8; i++) { const u = i / 8; ctx.lineTo(x + fw * u, baseY - h + Math.sin(ph + u * 4) * 2.2 * u); }
    for (let i = 8; i >= 0; i--) { const u = i / 8; ctx.lineTo(x + fw * u, baseY - h + fh + Math.sin(ph + u * 4) * 2.2 * u); }
    ctx.closePath(); ctx.fill();
    if (label) {
      ctx.fillStyle = "#fff"; ctx.font = "700 " + Math.max(8, fh * 0.6) + "px system-ui,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, x + fw * 0.45, baseY - h + fh / 2);
    }
    ctx.fillStyle = "rgb(210,180,90)";
    ctx.beginPath(); ctx.arc(x, baseY - h, 2.6, 0, TAU); ctx.fill();
  }

  /* 靶：木架上的同心圓靶。hit 0..1 讓靶心閃一下 */
  function targetBoard(ctx, x, baseY, r, hit) {
    const legH = r * 1.1;
    ctx.strokeStyle = "rgb(128,92,56)"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, baseY); ctx.lineTo(x, baseY - legH);
    ctx.moveTo(x + r * 0.6, baseY); ctx.lineTo(x, baseY - legH);
    ctx.stroke();
    contactShadow(ctx, x, baseY + 2, r * 1.1);
    const cy = baseY - legH - r * 0.7;
    const rings = ["#f4f1ea", "#1f2733", "#2f7fd8", "#e0473c", "#f6c744"];
    for (let i = 0; i < rings.length; i++) {
      ctx.fillStyle = rings[i];
      ctx.beginPath(); ctx.arc(x, cy, r * (1 - i * 0.19), 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, cy, r, 0, TAU); ctx.stroke();
    if (hit > 0) {
      ctx.save(); ctx.globalAlpha = clamp01(hit);
      ctx.strokeStyle = "rgba(255,230,120,0.95)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, cy, r * (1.1 + (1 - hit) * 0.8), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    return { cx: x, cy };
  }

  /* 建築物（自由落體的樓頂、拋體的高台） */
  function building(ctx, x, baseY, w, h, o) {
    o = o || {};
    const L = isLight();
    const body = hexRgb(o.color || (L ? "#d8cbb8" : "#3b3f4a"));
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, rgbStr(shadeRgb(body, 0.12))); g.addColorStop(1, rgbStr(shadeRgb(body, -0.18)));
    ctx.fillStyle = g; ctx.fillRect(x, baseY - h, w, h);
    note(ctx, rgbStr(body), x, baseY - h, w, h);
    // 屋頂女兒牆
    ctx.fillStyle = rgbStr(shadeRgb(body, -0.3)); ctx.fillRect(x - 3, baseY - h - 5, w + 6, 6);
    // 窗戶
    const cols = Math.max(1, Math.floor((w - 10) / 22)), rows = Math.max(1, Math.floor((h - 14) / 26));
    const cw = (w - 10) / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wx = x + 5 + c * cw + cw * 0.18, wy = baseY - h + 10 + r * 26;
      ctx.fillStyle = L ? "rgba(120,170,210,0.75)" : ((r * 7 + c * 3) % 5 === 0 ? "rgba(255,210,120,0.75)" : "rgba(40,56,80,0.9)");
      ctx.fillRect(wx, wy, cw * 0.64, 14);
      ctx.fillStyle = L ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(wx, wy, cw * 0.64, 3);
    }
  }

  /* 岩石高台／懸崖：平頂在 topY，往下到 baseY */
  function cliff(ctx, x0, x1, topY, baseY) {
    const L = isLight();
    const g = ctx.createLinearGradient(0, topY, 0, baseY);
    g.addColorStop(0, L ? "#b9a386" : "#4a4034"); g.addColorStop(1, L ? "#8f7a5f" : "#2c251d");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, baseY); ctx.lineTo(x0, topY + 2);
    ctx.lineTo(x1 - 6, topY); ctx.lineTo(x1, topY + 8);
    const rnd = seeded(Math.round(x1 + topY));
    for (let y = topY + 8; y < baseY; y += 10) ctx.lineTo(x1 + (rnd() - 0.3) * 8, y);
    ctx.lineTo(x1 + 6, baseY); ctx.closePath(); ctx.fill();
    note(ctx, L ? "#a79172" : "#3c342a", x0, topY, x1 - x0, baseY - topY);
    ctx.strokeStyle = L ? "rgba(80,60,40,0.25)" : "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
    for (let i = 0; i < (baseY - topY) / 14; i++) {
      const yy = topY + 10 + i * 14 + rnd() * 5;
      ctx.beginPath(); ctx.moveTo(x0 + rnd() * (x1 - x0) * 0.5, yy); ctx.lineTo(x0 + (x1 - x0) * (0.5 + rnd() * 0.5), yy + rnd() * 3); ctx.stroke();
    }
    // 頂面草皮
    ctx.fillStyle = L ? "#8cc56b" : "#27452b";
    ctx.fillRect(x0, topY - 3, x1 - x0 - 2, 5);
  }

  /* ---------------------------------------------------------------
     特效：讓「事件」被看見（發射、落地、命中、爆炸）
     age 為事件發生後經過的秒數，超過壽命就什麼都不畫
     --------------------------------------------------------------- */
  function smokePuff(ctx, x, y, age, o) {
    o = o || {};
    const life = o.life || 1.6;
    if (age < 0 || age > life) return;
    const u = age / life, L = isLight();
    const rnd = seeded(o.seed || 5);
    const dir = o.dir || 0;
    for (let i = 0; i < 7; i++) {
      const a = dir + (rnd() - 0.5) * 1.4, sp = (18 + rnd() * 30) * (o.scale || 1);
      const px = x + Math.cos(a) * sp * Math.sqrt(u) * 1.8, py = y - Math.sin(a) * sp * Math.sqrt(u) * 1.8 - u * 22;
      const r = (6 + rnd() * 8 + u * 22) * (o.scale || 1);
      ctx.fillStyle = L ? `rgba(190,190,196,${0.55 * (1 - u)})` : `rgba(150,156,168,${0.45 * (1 - u)})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
    }
  }

  function muzzleFlash(ctx, x, y, ang, age, s) {
    if (age < 0 || age > 0.14) return;
    const u = age / 0.14, k = (s || 1) * (1 - u * 0.5);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-ang);
    ctx.globalAlpha = 1 - u;
    const g = ctx.createRadialGradient(8 * k, 0, 1, 8 * k, 0, 26 * k);
    g.addColorStop(0, "rgba(255,250,220,1)"); g.addColorStop(0.35, "rgba(255,196,80,0.95)"); g.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = -0.9 + i * 0.18, rr = (i % 2 ? 14 : 30) * k;
      ctx.lineTo(Math.cos(a) * rr + 4 * k, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* 塵土：落地時揚起 */
  function dustKick(ctx, x, y, age, s) {
    if (age < 0 || age > 0.9) return;
    const u = age / 0.9, L = isLight(), k = s || 1;
    for (let i = -3; i <= 3; i++) {
      const px = x + i * 7 * k * (0.4 + u * 1.6), py = y - Math.abs(Math.sin(i * 1.3)) * 10 * k * Math.sin(u * Math.PI);
      ctx.fillStyle = L ? `rgba(170,140,100,${0.5 * (1 - u)})` : `rgba(160,140,110,${0.35 * (1 - u)})`;
      ctx.beginPath(); ctx.arc(px, py, (3 + u * 5) * k, 0, TAU); ctx.fill();
    }
  }

  /* 彩帶／火花：命中目標的慶祝效果 */
  function confetti(ctx, x, y, age, o) {
    o = o || {};
    const life = o.life || 1.4;
    if (age < 0 || age > life) return;
    const u = age / life, rnd = seeded(o.seed || 17);
    const cols = ["#f6c744", "#e0473c", "#2f7fd8", "#46c37b", "#b06ad8"];
    for (let i = 0; i < 26; i++) {
      const a = rnd() * TAU, sp = 40 + rnd() * 80;
      const px = x + Math.cos(a) * sp * u, py = y - Math.sin(a) * sp * u + 90 * u * u;
      ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = cols[i % cols.length];
      ctx.translate(px, py); ctx.rotate(u * 8 + i);
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }
  }

  /* 水花 */
  function splash(ctx, x, y, age, s) {
    if (age < 0 || age > 0.8) return;
    const u = age / 0.8, k = s || 1, L = isLight();
    ctx.fillStyle = L ? `rgba(255,255,255,${0.85 * (1 - u)})` : `rgba(180,220,245,${0.6 * (1 - u)})`;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.15 + 0.7 * i / 8), sp = 30 * k;
      const px = x + Math.cos(a) * sp * u * 1.4, py = y - Math.sin(a) * sp * u * 2 + 60 * u * u * k;
      ctx.beginPath(); ctx.arc(px, py, 2.6 * k * (1 - u * 0.5), 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = L ? `rgba(255,255,255,${0.7 * (1 - u)})` : `rgba(180,220,245,${0.5 * (1 - u)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, 8 * k + u * 30 * k, 2 + u * 5, 0, 0, TAU); ctx.stroke();
  }



  /*
   * 資訊卡：場景裡要放長條比較、小圖表時的襯底。
   * 直接畫在木桌或磚牆上會看不清楚，墊一張卡片（深色主題是深色卡）再畫。
   */
  function infoCard(ctx, x, y, w, h) {
    const L = isLight();
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    rrPath(ctx, x + 2, y + 3, w, h, 7); ctx.fill();
    rrPath(ctx, x, y, w, h, 7);
    ctx.fillStyle = L ? "rgba(255,255,255,0.94)" : "rgba(22,28,38,0.94)"; ctx.fill();
    ctx.strokeStyle = L ? "rgba(40,60,90,0.18)" : "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    note(ctx, L ? "#fbfcfd" : "#161c26", x, y, w, h);
  }

  /* 紙帶：米白色長條 + 陰影，登記亮度讓紙上的點與字選對墨色 */
  function paperTape(ctx, x0, x1, cy, h) {
    if (x1 <= x0) return;
    const L = isLight();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(x0 + 1.5, cy - h / 2 + 2, x1 - x0, h);
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    g.addColorStop(0, L ? "#fffdf6" : "#e9e4d6"); g.addColorStop(1, L ? "#efe8d6" : "#d4cdbb");
    ctx.fillStyle = g; ctx.fillRect(x0, cy - h / 2, x1 - x0, h);
    ctx.strokeStyle = "rgba(120,110,90,0.45)"; ctx.lineWidth = 0.8;
    ctx.strokeRect(x0 + 0.5, cy - h / 2 + 0.5, x1 - x0 - 1, h - 1);
    note(ctx, L ? "#f8f3e6" : "#dfd9c9", x0, cy - h / 2, x1 - x0, h);
  }

  /* ===============================================================
     器材 v2：力學與運動
     =============================================================== */

  /* 木製砲車輪：鐵輪框 + 輻條 + 輪轂。spin 讓輻條跟著轉 */
  function spokedWheel(ctx, cx, cy, r, spin, o) {
    o = o || {};
    const rim = o.rim || "rgb(52,50,54)";
    ctx.save();
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.fillStyle = o.wood || "rgb(150,98,52)";
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, TAU); ctx.fill();
    ctx.strokeStyle = o.wood || "rgb(150,98,52)"; ctx.lineWidth = Math.max(1.6, r * 0.14);
    const n = o.spokes || 8;
    for (let i = 0; i < n; i++) {
      const a = (spin || 0) + i * TAU / n;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,230,190,0.28)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    brassDisc(ctx, cx, cy, Math.max(2.2, r * 0.2));
    ctx.restore();
  }

  /*
   * 大砲（側視）。(px,py) 是砲管的轉軸（砲耳），也就是拋體的出發點；
   * ang 為仰角（弧度，向右上為正）。o.s 縮放；o.fired 為開砲後經過秒數（煙與火光）。
   * 砲輪落在 py + wheelDrop(s) 的地面上，呼叫端據此擺地面或高台。
   * 回傳 { mx, my }：砲口座標。
   */
  function cannonWheelDrop(s) { return 12 * (s || 1); }
  function cannon(ctx, px, py, ang, o) {
    o = o || {};
    const s = o.s || 1, facing = o.facing || 1;
    const wr = 12 * s, len = 58 * s;
    const recoil = o.fired != null && o.fired >= 0 && o.fired < 0.25 ? Math.sin(o.fired / 0.25 * Math.PI) * 5 * s : 0;
    const gy = py + wr;                    // 輪子著地高度
    contactShadow(ctx, px - 6 * s * facing, gy + 1, 30 * s);
    ctx.save();
    ctx.translate(px, py); ctx.scale(facing, 1); ctx.translate(-px, -py);
    // 後方砲架尾（落地的拖尾）
    const trail = ctx.createLinearGradient(0, py - 6 * s, 0, gy);
    trail.addColorStop(0, "rgb(128,84,46)"); trail.addColorStop(1, "rgb(86,54,28)");
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(px + 6 * s, py - 5 * s);
    ctx.lineTo(px - 34 * s, gy - 1.5 * s);
    ctx.lineTo(px - 34 * s, gy + 1 * s);
    ctx.lineTo(px - 26 * s, gy + 1 * s);
    ctx.lineTo(px + 8 * s, py + 6 * s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(40,24,10,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    // 鐵箍
    ctx.fillStyle = "rgb(60,58,62)";
    ctx.fillRect(px - 22 * s, py + 2.5 * s + (gy - py) * 0.42, 3 * s, 5 * s);
    // 砲管
    ctx.save();
    ctx.translate(px - recoil * Math.cos(ang), py + recoil * Math.sin(ang));
    ctx.rotate(-ang);
    const bg = ctx.createLinearGradient(0, -8 * s, 0, 8 * s);
    const metal = o.bronze ? ["rgb(214,170,96)", "rgb(160,112,48)", "rgb(96,64,24)"] : ["rgb(118,124,134)", "rgb(58,62,70)", "rgb(26,28,32)"];
    bg.addColorStop(0, metal[0]); bg.addColorStop(0.45, metal[1]); bg.addColorStop(1, metal[2]);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(-14 * s, -7.5 * s);
    ctx.quadraticCurveTo(-20 * s, 0, -14 * s, 7.5 * s);          // 砲尾圓鈕
    ctx.lineTo(len - 6 * s, 5 * s);
    ctx.lineTo(len, 6 * s); ctx.lineTo(len, -6 * s);             // 砲口外擴
    ctx.lineTo(len - 6 * s, -5 * s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1; ctx.stroke();
    // 補強箍環
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    [4 * s, 22 * s, len - 12 * s].forEach(xx => ctx.fillRect(xx, -7 * s, 3 * s, 14 * s));
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(-10 * s, -5.5 * s, len, 1.6 * s);
    // 砲尾鈕
    ctx.fillStyle = metal[1];
    ctx.beginPath(); ctx.arc(-19 * s, 0, 3.4 * s, 0, TAU); ctx.fill();
    // 砲口內膛
    ctx.fillStyle = "rgb(12,12,14)";
    ctx.beginPath(); ctx.ellipse(len, 0, 1.8 * s, 4.6 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
    // 砲耳座
    ctx.fillStyle = "rgb(110,72,38)";
    ctx.beginPath(); ctx.arc(px, py, 6 * s, 0, TAU); ctx.fill();
    brassDisc(ctx, px, py, 2.6 * s);
    // 車輪
    spokedWheel(ctx, px, py, wr, -(o.roll || 0));
    ctx.restore();
    const mx = px + facing * Math.cos(ang) * len, my = py - Math.sin(ang) * len;
    if (o.fired != null && o.fired >= 0) {
      smokePuff(ctx, mx, my, o.fired, { dir: facing > 0 ? ang : Math.PI - ang, scale: s, seed: 3 });
      muzzleFlash(ctx, mx, my, facing > 0 ? ang : Math.PI - ang, o.fired, s);
    }
    return { mx, my, groundY: gy };
  }

  /*
   * 各種球（拋體、落體、碰撞用）。spin 為轉角（弧度），讓球在飛行時看得出在轉。
   * kind: "bowling" | "basketball" | "watermelon" | "balloon" | "cannonball"
   *       | "tennis" | "soccer" | "steel" | "rubber" | "pingpong" | "feather"
   */
  function sportBall(ctx, x, y, r, kind, spin) {
    spin = spin || 0;
    ctx.save();
    if (kind === "balloon") {
      // 氣球：略呈水滴形 + 打結 + 細繩
      ctx.strokeStyle = "rgba(120,120,130,0.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y + r * 1.15);
      ctx.bezierCurveTo(x - r * 0.4, y + r * 1.6, x + r * 0.4, y + r * 2, x - r * 0.1, y + r * 2.6); ctx.stroke();
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.1);
      g.addColorStop(0, "rgb(255,150,150)"); g.addColorStop(0.5, "rgb(228,56,64)"); g.addColorStop(1, "rgb(150,20,30)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.92, r * 1.08, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgb(170,30,40)";
      ctx.beginPath(); ctx.moveTo(x - 3, y + r * 1.18); ctx.lineTo(x + 3, y + r * 1.18); ctx.lineTo(x, y + r * 1.02); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.45, r * 0.16, r * 0.26, -0.5, 0, TAU); ctx.fill();
      ctx.restore(); return;
    }
    if (kind === "feather") {
      ctx.translate(x, y); ctx.rotate(spin * 0.3 - 0.6);
      ctx.fillStyle = "rgba(240,240,236,0.95)";
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 1.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(150,150,150,0.9)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -r * 1.6); ctx.lineTo(0, r * 1.9); ctx.stroke();
      ctx.strokeStyle = "rgba(190,190,190,0.7)";
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * r * 0.3); ctx.lineTo(r * 0.42, i * r * 0.3 - r * 0.25); ctx.moveTo(0, i * r * 0.3); ctx.lineTo(-r * 0.42, i * r * 0.3 - r * 0.25); ctx.stroke(); }
      ctx.restore(); return;
    }
    const pal = {
      bowling: ["rgb(92,96,150)", "rgb(40,40,86)", "rgb(14,14,34)"],
      basketball: ["rgb(255,170,90)", "rgb(226,110,36)", "rgb(140,58,12)"],
      watermelon: ["rgb(140,210,110)", "rgb(58,140,58)", "rgb(22,70,28)"],
      cannonball: ["rgb(120,122,128)", "rgb(52,54,60)", "rgb(18,18,22)"],
      tennis: ["rgb(236,255,140)", "rgb(196,224,60)", "rgb(120,140,20)"],
      soccer: ["rgb(255,255,255)", "rgb(226,228,232)", "rgb(150,154,162)"],
      rubber: ["rgb(255,140,120)", "rgb(220,62,50)", "rgb(130,24,20)"],
      pingpong: ["rgb(255,255,255)", "rgb(244,240,230)", "rgb(196,188,170)"],
      steel: ["rgb(236,242,250)", "rgb(150,162,180)", "rgb(52,60,74)"]
    }[kind] || ["rgb(236,242,250)", "rgb(150,162,180)", "rgb(52,60,74)"];
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
    g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.translate(x, y); ctx.rotate(spin);
    if (kind === "basketball") {
      ctx.strokeStyle = "rgba(40,20,10,0.8)"; ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 1.25, 0, r * 0.95, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    } else if (kind === "watermelon") {
      ctx.strokeStyle = "rgba(16,60,20,0.75)"; ctx.lineWidth = Math.max(1.4, r * 0.16);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * r * 0.42, -r);
        ctx.bezierCurveTo(i * r * 0.42 + r * 0.18, -r * 0.3, i * r * 0.42 - r * 0.18, r * 0.3, i * r * 0.42, r); ctx.stroke();
      }
    } else if (kind === "bowling") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      [[-0.18, -0.38], [0.14, -0.4], [-0.02, -0.12]].forEach(p => { ctx.beginPath(); ctx.arc(p[0] * r, p[1] * r, r * 0.11, 0, TAU); ctx.fill(); });
      ctx.strokeStyle = "rgba(160,160,230,0.25)"; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.arc(r * 0.2, r * 0.3, r * 0.5, 0.3, 2.3); ctx.stroke();
    } else if (kind === "tennis") {
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.arc(-r * 1.2, 0, r * 0.95, -0.95, 0.95); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 1.2, 0, r * 0.95, Math.PI - 0.95, Math.PI + 0.95); ctx.stroke();
    } else if (kind === "soccer") {
      ctx.fillStyle = "rgba(24,26,30,0.9)";
      const pent = (cx, cy, rr) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); };
      pent(0, 0, r * 0.32);
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; pent(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.26); }
    } else if (kind === "cannonball") {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath(); ctx.arc(r * 0.3, r * 0.2, r * 0.12, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath(); ctx.ellipse(x - r * 0.34, y - r * 0.4, r * 0.18, r * 0.11, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /*
   * 實驗用質量塊：烤漆金屬塊 + 斜角高光 + 刻字標籤 + 可選掛鉤。
   * (cx, baseY) 是底面中心；o.ang 讓它貼著斜面旋轉；o.color 決定烤漆顏色
   * （保留原本用顏色區分 m₁、m₂ 的教學約定）。
   */
  function massBlock(ctx, cx, baseY, w, h, o) {
    o = o || {};
    const c = hexRgb(o.color || "#e0703a");
    ctx.save();
    ctx.translate(cx, baseY); ctx.rotate(o.ang || 0);
    if (!o.noShadow) contactShadow(ctx, 0, 1, w * 0.6);
    const r = Math.min(4, w * 0.12, h * 0.16);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, rgbStr(shadeRgb(c, 0.32)));
    g.addColorStop(0.18, rgbStr(shadeRgb(c, 0.08)));
    g.addColorStop(0.85, rgbStr(shadeRgb(c, -0.22)));
    g.addColorStop(1, rgbStr(shadeRgb(c, -0.38)));
    rrPath(ctx, -w / 2, -h, w, h, r);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgbStr(shadeRgb(c, -0.55), 0.85); ctx.lineWidth = 1; ctx.stroke();
    // 頂面斜角與側邊暗面
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(-w / 2 + r, -h + 1, w - 2 * r, Math.max(1.5, h * 0.08));
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(w / 2 - Math.max(3, w * 0.1), -h + r, Math.max(3, w * 0.1) - 1, h - 2 * r);
    // 掛鉤
    if (o.hook) {
      ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -h - 5, 4, Math.PI * 0.15, Math.PI * 0.85, true); ctx.stroke();
      ctx.fillStyle = "rgb(120,130,146)"; ctx.fillRect(-2.5, -h - 2, 5, 3);
    }
    // 標籤（刻字板）
    if (o.label) {
      const fs = Math.max(8, Math.min(13, h * 0.42, w * 0.3));
      ctx.font = "700 " + fs + "px 'Segoe UI','PingFang TC',system-ui,sans-serif";
      const tw = ctx.measureText(o.label).width;
      if (tw + 8 < w) {
        rrPath(ctx, -tw / 2 - 4, -h / 2 - fs * 0.62, tw + 8, fs * 1.24, 2.5);
        ctx.fillStyle = "rgba(255,255,255,0.82)"; ctx.fill();
        ctx.fillStyle = "rgba(24,30,40,0.92)";
      } else ctx.fillStyle = "#fff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(o.label, 0, -h / 2 + 0.5);
    }
    ctx.restore();
  }

  /* 木箱（慣性、摩擦、輸送帶用）：板條 + 釘子 */
  function crate(ctx, cx, baseY, w, h, o) {
    o = o || {};
    ctx.save();
    ctx.translate(cx, baseY); ctx.rotate(o.ang || 0);
    if (!o.noShadow) contactShadow(ctx, 0, 1, w * 0.6);
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, "rgb(222,178,116)"); g.addColorStop(1, "rgb(164,116,62)");
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = "rgba(96,62,28,0.85)"; ctx.lineWidth = 1.2;
    ctx.strokeRect(-w / 2 + 0.5, -h + 0.5, w - 1, h - 1);
    // 外框板
    const t = Math.max(3, Math.min(w, h) * 0.13);
    ctx.fillStyle = "rgba(120,78,36,0.35)";
    ctx.fillRect(-w / 2, -h, w, t); ctx.fillRect(-w / 2, -t, w, t);
    ctx.fillRect(-w / 2, -h, t, h); ctx.fillRect(w / 2 - t, -h, t, h);
    // 斜撐
    ctx.strokeStyle = "rgba(120,78,36,0.5)"; ctx.lineWidth = t * 0.8;
    ctx.beginPath(); ctx.moveTo(-w / 2 + t, -t); ctx.lineTo(w / 2 - t, -h + t); ctx.stroke();
    // 釘子
    ctx.fillStyle = "rgba(60,50,40,0.8)";
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => { ctx.beginPath(); ctx.arc(p[0] * (w / 2 - t / 2), -h / 2 + p[1] * (h / 2 - t / 2), 1.1, 0, TAU); ctx.fill(); });
    if (o.label) {
      const fs = Math.max(8, Math.min(12, h * 0.36));
      ctx.font = "700 " + fs + "px 'Segoe UI','PingFang TC',system-ui,sans-serif";
      const tw = ctx.measureText(o.label).width;
      rrPath(ctx, -tw / 2 - 4, -h / 2 - fs * 0.62, tw + 8, fs * 1.24, 2.5);
      ctx.fillStyle = "rgba(255,248,232,0.9)"; ctx.fill();
      ctx.fillStyle = "rgba(60,36,14,0.95)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(o.label, 0, -h / 2 + 0.5);
    }
    ctx.restore();
  }

  /* 實驗桌（側視）：桌板 + 桌腳，桌面在 topY。回傳 { top, x0, x1 } */
  function table(ctx, x0, x1, topY, floorY, o) {
    o = o || {};
    const th = o.thick || 12;
    const L = isLight();
    // 桌腳
    const legW = Math.max(8, th * 0.8);
    [x0 + 14, x1 - 14 - legW].forEach(lx => {
      const lg = ctx.createLinearGradient(lx, 0, lx + legW, 0);
      lg.addColorStop(0, L ? "rgb(120,128,140)" : "rgb(70,76,86)"); lg.addColorStop(0.4, L ? "rgb(180,188,198)" : "rgb(110,118,130)"); lg.addColorStop(1, L ? "rgb(96,104,116)" : "rgb(52,58,66)");
      ctx.fillStyle = lg; ctx.fillRect(lx, topY + th, legW, floorY - topY - th);
    });
    contactShadow(ctx, (x0 + x1) / 2, floorY + 2, (x1 - x0) * 0.55);
    // 桌板
    const g = ctx.createLinearGradient(0, topY, 0, topY + th);
    g.addColorStop(0, L ? "#e2c294" : "#7a5b3c"); g.addColorStop(0.35, L ? "#c99d66" : "#5e452d"); g.addColorStop(1, L ? "#9c7040" : "#3e2c1b");
    ctx.fillStyle = g; ctx.fillRect(x0, topY, x1 - x0, th);
    ctx.fillStyle = L ? "rgba(255,240,214,0.7)" : "rgba(255,220,170,0.2)"; ctx.fillRect(x0, topY, x1 - x0, 1.4);
    ctx.strokeStyle = "rgba(60,36,14,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, topY + 0.5, x1 - x0 - 1, th - 1);
    note(ctx, L ? "#c99d66" : "#5e452d", x0, topY, x1 - x0, th);
    return { top: topY, x0, x1 };
  }

  /*
   * 汽車（側視）。(cx, baseY) 是車身中心、輪子著地高度；len 為車長。
   * o.color 車身色；o.facing 1 向右、-1 向左；o.roll 輪子轉角；o.kind "car" | "truck" | "bus"
   * o.brake 顯示煞車燈。
   */
  function car(ctx, cx, baseY, len, o) {
    o = o || {};
    const c = hexRgb(o.color || "#2f7fd8");
    const f = o.facing || 1, kind = o.kind || "car";
    const h = kind === "bus" ? len * 0.42 : kind === "truck" ? len * 0.4 : len * 0.3;
    const wr = len * (kind === "car" ? 0.1 : 0.085);
    contactShadow(ctx, cx, baseY + 1, len * 0.56);
    ctx.save();
    ctx.translate(cx, baseY); ctx.scale(f, 1);
    const bodyBot = -wr * 0.55;
    const g = ctx.createLinearGradient(0, -h, 0, bodyBot);
    g.addColorStop(0, rgbStr(shadeRgb(c, 0.35))); g.addColorStop(0.5, rgbStr(c)); g.addColorStop(1, rgbStr(shadeRgb(c, -0.35)));
    ctx.fillStyle = g;
    ctx.beginPath();
    if (kind === "car") {
      const L2 = len / 2;
      ctx.moveTo(-L2, bodyBot);
      ctx.lineTo(-L2, -h * 0.5);
      ctx.quadraticCurveTo(-L2 + 2, -h * 0.62, -L2 * 0.72, -h * 0.6);
      ctx.lineTo(-L2 * 0.42, -h);                       // 後擋
      ctx.lineTo(L2 * 0.18, -h);                        // 車頂
      ctx.lineTo(L2 * 0.5, -h * 0.6);                   // 前擋
      ctx.quadraticCurveTo(L2 * 0.95, -h * 0.56, L2, -h * 0.36);
      ctx.lineTo(L2, bodyBot);
    } else if (kind === "truck") {
      const L2 = len / 2;
      ctx.moveTo(-L2, bodyBot); ctx.lineTo(-L2, -h); ctx.lineTo(L2 * 0.32, -h); ctx.lineTo(L2 * 0.32, -h * 0.82);
      ctx.lineTo(L2 * 0.78, -h * 0.82); ctx.lineTo(L2, -h * 0.45); ctx.lineTo(L2, bodyBot);
    } else {
      rrPath(ctx, -len / 2, -h, len, h + bodyBot, h * 0.18);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgbStr(shadeRgb(c, -0.6), 0.8); ctx.lineWidth = 1; ctx.stroke();
    // 車窗
    ctx.fillStyle = "rgba(170,210,235,0.9)";
    if (kind === "car") {
      const L2 = len / 2;
      ctx.beginPath(); ctx.moveTo(-L2 * 0.38, -h * 0.94); ctx.lineTo(-L2 * 0.08, -h * 0.94); ctx.lineTo(-L2 * 0.08, -h * 0.64); ctx.lineTo(-L2 * 0.62, -h * 0.64); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-L2 * 0.02, -h * 0.94); ctx.lineTo(L2 * 0.16, -h * 0.94); ctx.lineTo(L2 * 0.42, -h * 0.64); ctx.lineTo(-L2 * 0.02, -h * 0.64); ctx.closePath(); ctx.fill();
    } else if (kind === "truck") {
      ctx.fillRect(len * 0.18, -h * 0.76, len * 0.16, h * 0.26);
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-len / 2 + 4, -h + 4, len * 0.58, h * 0.55);
    } else {
      for (let i = 0; i < 5; i++) ctx.fillRect(-len / 2 + 8 + i * len * 0.18, -h * 0.86, len * 0.14, h * 0.3);
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-len / 2 + 4, -h * 0.46, len - 10, 1.5);
    // 車燈
    ctx.fillStyle = "rgba(255,244,190,0.95)"; ctx.fillRect(len / 2 - 4, -h * 0.4, 3.5, h * 0.12);
    ctx.fillStyle = o.brake ? "rgba(255,50,40,1)" : "rgba(190,40,40,0.8)"; ctx.fillRect(-len / 2, -h * 0.42, 3, h * 0.12);
    if (o.brake) {
      ctx.save(); ctx.shadowColor = "rgba(255,40,30,0.9)"; ctx.shadowBlur = 12;
      ctx.fillRect(-len / 2, -h * 0.42, 3, h * 0.12); ctx.restore();
    }
    ctx.restore();
    // 輪子（不跟 scale(f) 一起翻，免得輪紋反向）
    [-1, 1].forEach(s2 => {
      const wx = cx + s2 * len * 0.31;
      ctx.fillStyle = "rgb(28,30,34)";
      ctx.beginPath(); ctx.arc(wx, baseY - wr, wr, 0, TAU); ctx.fill();
      const hg = ctx.createRadialGradient(wx - wr * 0.2, baseY - wr * 1.2, 1, wx, baseY - wr, wr * 0.6);
      hg.addColorStop(0, "rgb(220,224,230)"); hg.addColorStop(1, "rgb(120,126,136)");
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(wx, baseY - wr, wr * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(60,64,72,0.9)"; ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const a = (o.roll || 0) + i * TAU / 5;
        ctx.beginPath(); ctx.moveTo(wx, baseY - wr); ctx.lineTo(wx + Math.cos(a) * wr * 0.5, baseY - wr + Math.sin(a) * wr * 0.5); ctx.stroke();
      }
    });
  }

  /* 俯視小船（相對運動）：船身 + 座板 + 船尾浪花。heading 為船頭方向（弧度，canvas 座標） */
  function boatTop(ctx, cx, cy, len, heading, o) {
    o = o || {};
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(heading);
    const w = len * 0.36;
    // 尾浪
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.4;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(-len * 0.5, -w * 0.3); ctx.quadraticCurveTo(-len * (0.5 + i * 0.25), -w * (0.5 + i * 0.35), -len * (0.55 + i * 0.3), -w * (0.9 + i * 0.4)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-len * 0.5, w * 0.3); ctx.quadraticCurveTo(-len * (0.5 + i * 0.25), w * (0.5 + i * 0.35), -len * (0.55 + i * 0.3), w * (0.9 + i * 0.4)); ctx.stroke();
    }
    // 船身
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(2, 3, len * 0.52, w * 0.56, 0, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    const c = hexRgb(o.color || "#e2574c");
    g.addColorStop(0, rgbStr(shadeRgb(c, 0.3))); g.addColorStop(1, rgbStr(shadeRgb(c, -0.3)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(len * 0.52, 0);
    ctx.quadraticCurveTo(len * 0.25, -w * 0.62, -len * 0.45, -w * 0.5);
    ctx.lineTo(-len * 0.5, 0); ctx.lineTo(-len * 0.45, w * 0.5);
    ctx.quadraticCurveTo(len * 0.25, w * 0.62, len * 0.52, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(60,20,16,0.7)"; ctx.lineWidth = 1; ctx.stroke();
    // 內艙
    ctx.fillStyle = "rgb(214,178,126)";
    ctx.beginPath(); ctx.ellipse(-len * 0.02, 0, len * 0.36, w * 0.32, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgb(150,104,58)";
    ctx.fillRect(-len * 0.12, -w * 0.3, 4, w * 0.6); ctx.fillRect(len * 0.14, -w * 0.28, 4, w * 0.56);
    ctx.restore();
  }

  /*
   * 人物（簡化卡通）：頭 + 身體 + 四肢。(x, baseY) 為腳底中心，h 為身高。
   * o.pose: "stand" | "push" | "walk" | "sit" | "arms-up"；o.shirt 上衣色；o.facing
   */
  function person(ctx, x, baseY, h, o) {
    o = o || {};
    const f = o.facing || 1, pose = o.pose || "stand";
    const shirt = hexRgb(o.shirt || "#3b82c4"), pants = hexRgb(o.pants || "#2f3a4f");
    const skin = o.skin || "rgb(240,200,160)";
    const headR = h * 0.1, hipY = baseY - h * 0.47, shY = baseY - h * 0.76;
    ctx.save();
    ctx.translate(x, 0); ctx.scale(f, 1);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const limb = (x1, y1, x2, y2, x3, y3, col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
    };
    const lw = h * 0.085, aw = h * 0.065;
    const ph = o.phase || 0;
    // 腿
    if (pose === "sit") {
      limb(0, hipY, h * 0.22, hipY, h * 0.22, baseY, rgbStr(pants), lw);
    } else if (pose === "walk" || pose === "push") {
      const sw = pose === "push" ? 0.16 : 0.12 * Math.sin(ph);
      limb(0, hipY, -h * sw * 0.6, baseY - h * 0.24, -h * sw, baseY, rgbStr(shadeRgb(pants, -0.15)), lw);
      limb(0, hipY, h * sw * 0.6 + h * 0.03, baseY - h * 0.24, h * sw, baseY, rgbStr(pants), lw);
    } else {
      limb(0, hipY, -h * 0.03, baseY - h * 0.24, -h * 0.05, baseY, rgbStr(shadeRgb(pants, -0.15)), lw);
      limb(0, hipY, h * 0.03, baseY - h * 0.24, h * 0.05, baseY, rgbStr(pants), lw);
    }
    // 鞋
    ctx.fillStyle = "rgb(40,40,46)";
    ctx.beginPath(); ctx.ellipse(h * 0.07, baseY - h * 0.012, h * 0.06, h * 0.022, 0, 0, TAU); ctx.fill();
    // 軀幹
    const tg = ctx.createLinearGradient(-h * 0.1, 0, h * 0.1, 0);
    tg.addColorStop(0, rgbStr(shadeRgb(shirt, 0.15))); tg.addColorStop(1, rgbStr(shadeRgb(shirt, -0.2)));
    ctx.fillStyle = tg;
    rrPath(ctx, -h * 0.1, shY, h * 0.2, hipY - shY + h * 0.04, h * 0.06); ctx.fill();
    // 手臂
    if (pose === "push") limb(h * 0.02, shY + h * 0.04, h * 0.16, shY + h * 0.1, h * 0.3, shY + h * 0.08, rgbStr(shadeRgb(shirt, -0.1)), aw);
    else if (pose === "arms-up") limb(h * 0.02, shY + h * 0.04, h * 0.1, shY - h * 0.08, h * 0.12, shY - h * 0.2, rgbStr(shadeRgb(shirt, -0.1)), aw);
    else limb(h * 0.02, shY + h * 0.04, h * 0.06 + Math.sin(ph) * h * 0.04, shY + h * 0.18, h * 0.05, shY + h * 0.3, rgbStr(shadeRgb(shirt, -0.1)), aw);
    // 頭
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(h * 0.01, shY - headR * 1.25, headR, 0, TAU); ctx.fill();
    ctx.fillStyle = o.hair || "rgb(50,36,28)";
    ctx.beginPath(); ctx.arc(h * 0.0, shY - headR * 1.45, headR * 0.98, Math.PI * 1.05, Math.PI * 2.05); ctx.fill();
    ctx.fillStyle = "rgb(40,30,24)";
    ctx.beginPath(); ctx.arc(h * 0.05, shY - headR * 1.25, headR * 0.12, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* 滑板（側視）：板面 + 兩組輪子 */
  function skateboard(ctx, cx, baseY, len, o) {
    o = o || {};
    const wr = len * 0.07;
    contactShadow(ctx, cx, baseY + 1, len * 0.5);
    ctx.fillStyle = rgbStr(hexRgb(o.color || "#e2574c"));
    ctx.beginPath();
    ctx.moveTo(-len / 2 + cx, baseY - wr * 2.6);
    ctx.quadraticCurveTo(-len / 2 - 6 + cx, baseY - wr * 3.6, -len / 2 - 4 + cx, baseY - wr * 4.2);
    ctx.lineTo(-len / 2 + cx + 2, baseY - wr * 3.3);
    ctx.lineTo(len / 2 + cx - 2, baseY - wr * 3.3);
    ctx.lineTo(len / 2 + 4 + cx, baseY - wr * 4.2);
    ctx.quadraticCurveTo(len / 2 + 6 + cx, baseY - wr * 3.6, len / 2 + cx, baseY - wr * 2.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(20,20,24,0.85)"; ctx.fillRect(cx - len / 2 + 2, baseY - wr * 3.3 - 1.5, len - 4, 1.5);
    [-1, 1].forEach(s => {
      const wx = cx + s * len * 0.32;
      ctx.fillStyle = "rgb(150,156,166)"; ctx.fillRect(wx - 5, baseY - wr * 2.6, 10, wr * 0.6);
      ctx.fillStyle = "rgb(250,230,160)";
      ctx.beginPath(); ctx.arc(wx, baseY - wr, wr, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(120,100,40,0.7)"; ctx.lineWidth = 1; ctx.stroke();
    });
  }


  /* ===============================================================
     器材 v2：牆面、天花板、輸送帶、手、力桌、繩索
     =============================================================== */

  /*
   * 鉛直牆面（磚牆／水泥牆）。x 是受力的那一面；o.dir = 1 牆往右延伸、-1 往左。
   * 摩擦力題目的「牆」要看起來是能被壓住的實體，不是一條線。
   */
  function wallBlock(ctx, x, y0, y1, w, o) {
    o = o || {};
    const L = isLight(), dir = o.dir || 1;
    const x0 = dir > 0 ? x : x - w, h = y1 - y0;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    if (o.kind === "concrete") {
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, L ? "#c9cbcd" : "#4a4d52"); g.addColorStop(1, L ? "#b3b6ba" : "#3a3d42");
      ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
      const rnd = seeded(Math.round(x + y0));
      ctx.fillStyle = L ? "rgba(90,90,90,0.18)" : "rgba(0,0,0,0.25)";
      for (let i = 0; i < w * h / 60; i++) ctx.fillRect(x0 + rnd() * w, y0 + rnd() * h, 1.4, 1.4);
    } else {
      ctx.fillStyle = L ? "#d8cfc4" : "#3d3834"; ctx.fillRect(x0, y0, w, h);          // 灰縫
      const bh = 13, bl = 30, rnd = seeded(Math.round(x * 3 + y0));
      for (let r = 0, y = y0; y < y1; r++, y += bh) {
        const off = (r % 2) * bl / 2;
        for (let xx = x0 - off; xx < x0 + w; xx += bl) {
          const k = rnd();
          ctx.fillStyle = L ? `rgb(${176 + k * 30},${86 + k * 20},${64 + k * 16})` : `rgb(${92 + k * 20},${46 + k * 12},${36 + k * 10})`;
          ctx.fillRect(xx + 1, y + 1, bl - 2, bh - 2);
          ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(xx + 1, y + 1, bl - 2, 1.5);
        }
      }
    }
    // 受力面的陰影／高光
    const sg = ctx.createLinearGradient(x, 0, x + dir * 10, 0);
    sg.addColorStop(0, "rgba(0,0,0,0.28)"); sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg; ctx.fillRect(dir > 0 ? x : x - 10, y0, 10, h);
    ctx.restore();
    note(ctx, L ? "#b9745a" : "#4f332a", x0, y0, w, h);
  }

  /* 天花板橫樑：懸掛實驗的固定點。回傳底面 y */
  function ceilingBeam(ctx, x0, x1, y, h) {
    const L = isLight();
    const g = ctx.createLinearGradient(0, y - h, 0, y);
    g.addColorStop(0, L ? "#a67c52" : "#4a3524"); g.addColorStop(0.6, L ? "#8a6238" : "#3a2819"); g.addColorStop(1, L ? "#6e4a28" : "#2a1c10");
    ctx.fillStyle = g; ctx.fillRect(x0, y - h, x1 - x0, h);
    ctx.fillStyle = "rgba(255,230,190,0.25)"; ctx.fillRect(x0, y - h, x1 - x0, 1.5);
    ctx.strokeStyle = "rgba(40,24,10,0.35)"; ctx.lineWidth = 1;
    const rnd = seeded(Math.round(x1 + y));
    for (let i = 0; i < (x1 - x0) / 50; i++) {
      const gx = x0 + rnd() * (x1 - x0), gy = y - h + 3 + rnd() * (h - 6);
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 30 + rnd() * 50, gy + (rnd() - 0.5) * 2); ctx.stroke();
    }
    note(ctx, L ? "#8a6238" : "#3a2819", x0, y - h, x1 - x0, h);
    return y;
  }

  /* 吊環座：鎖在天花板上的金屬板 + 吊環。回傳吊環下緣 */
  function hookPlate(ctx, x, y) {
    steel(ctx, x - 11, y, 22, 5, 8);
    ctx.fillStyle = "rgba(20,24,30,0.8)";
    ctx.beginPath(); ctx.arc(x - 7, y + 2.5, 1.2, 0, TAU); ctx.arc(x + 7, y + 2.5, 1.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y + 10, 4.5, 0, TAU); ctx.stroke();
    return { x, y: y + 14 };
  }

  /* 繩索（有編織紋的粗繩）。w 線寬 */
  function rope(ctx, x1, y1, x2, y2, w, color) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.5) return;
    w = w || 3;
    const c = hexRgb(color || "#c8a46a");
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = rgbStr(shadeRgb(c, -0.35)); ctx.lineWidth = w + 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = rgbStr(c); ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (w >= 2.5) {
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len, px = -uy, py = ux;
      ctx.strokeStyle = rgbStr(shadeRgb(c, -0.28), 0.8); ctx.lineWidth = 1;
      const step = Math.max(3, w * 1.2);
      for (let d = step / 2; d < len; d += step) {
        const cx = x1 + ux * d, cy = y1 + uy * d;
        ctx.beginPath();
        ctx.moveTo(cx - px * w * 0.45 - ux * w * 0.3, cy - py * w * 0.45 - uy * w * 0.3);
        ctx.lineTo(cx + px * w * 0.45 + ux * w * 0.3, cy + py * w * 0.45 + uy * w * 0.3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /*
   * 輸送帶（側視）：兩端滾筒 + 橡膠帶 + 會移動的紋路 + 支架。
   * y 是帶面（物體放置面）；offset 是皮帶已移動的像素（正值向右）。
   */
  function conveyor(ctx, x0, x1, y, h, offset) {
    const L = isLight(), r = h / 2, cy = y + r;
    // 支架
    [x0 + r + 10, x1 - r - 10].forEach(lx => {
      steel(ctx, lx - 4, cy, 8, 44, -4);
      steel(ctx, lx - 14, cy + 42, 28, 5, -8);
    });
    contactShadow(ctx, (x0 + x1) / 2, cy + 48, (x1 - x0) * 0.5);
    // 皮帶本體
    ctx.fillStyle = "rgb(38,40,44)";
    rrPath(ctx, x0, y, x1 - x0, h, r); ctx.fill();
    // 側框
    const fg = ctx.createLinearGradient(0, y + 3, 0, y + h - 3);
    fg.addColorStop(0, "rgb(126,134,146)"); fg.addColorStop(1, "rgb(82,88,98)");
    ctx.fillStyle = fg; ctx.fillRect(x0 + r, y + 4, x1 - x0 - 2 * r, h - 8);
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x0 + r, y + 4, x1 - x0 - 2 * r, 1.5);
    // 帶面紋路（會跟著皮帶走）
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 + r, y - 1, x1 - x0 - 2 * r, 5); ctx.clip();
    ctx.fillStyle = "rgba(200,200,190,0.55)";
    const step = 16, off = ((offset || 0) % step + step) % step;
    for (let x = x0 + r - step + off; x < x1 - r; x += step) ctx.fillRect(x, y, 6, 2);
    ctx.restore();
    // 滾筒
    [x0 + r, x1 - r].forEach((rx, i) => {
      const g = ctx.createRadialGradient(rx - r * 0.3, cy - r * 0.3, 1, rx, cy, r * 0.8);
      g.addColorStop(0, "rgb(220,226,234)"); g.addColorStop(1, "rgb(110,118,130)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(rx, cy, r * 0.72, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(40,44,52,0.8)"; ctx.lineWidth = 1.2;
      const a = (offset || 0) / (r * 0.72) + i;
      ctx.beginPath(); ctx.moveTo(rx, cy); ctx.lineTo(rx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62); ctx.stroke();
      brassDisc(ctx, rx, cy, r * 0.2);
    });
    note(ctx, "rgb(90,96,106)", x0, y, x1 - x0, h);
    return { top: y };
  }

  /*
   * 手（施力的來源）：x, y 是掌心接觸點；dir = 1 向右推、-1 向左推；
   * o.pull 為真時畫成握拳拉繩。s 縮放。
   */
  function hand(ctx, x, y, dir, s, o) {
    o = o || {};
    s = s || 1; dir = dir || 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(dir * s, s);
    const skin = "rgb(240,196,156)", skinD = "rgb(206,150,112)";
    // 袖口與前臂
    ctx.fillStyle = o.sleeve || "#3b82c4";
    rrPath(ctx, -62, -9, 30, 18, 4); ctx.fill();
    ctx.fillStyle = skin;
    rrPath(ctx, -36, -7, 22, 14, 5); ctx.fill();
    if (o.pull) {
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.ellipse(-8, 0, 11, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = skinD; ctx.lineWidth = 1;
      for (let i = -1; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-4, i * 4 - 2); ctx.lineTo(2, i * 4 - 2); ctx.stroke(); }
    } else {
      // 手掌（立起來推）
      ctx.fillStyle = skin;
      rrPath(ctx, -16, -13, 15, 26, 6); ctx.fill();
      // 四指
      for (let i = 0; i < 4; i++) {
        rrPath(ctx, -4, -13 + i * 6.3, 4.5, 5.6, 2.4); ctx.fill();
      }
      // 拇指
      ctx.beginPath(); ctx.ellipse(-10, -14, 4, 6.5, -0.7, 0, TAU); ctx.fill();
      ctx.strokeStyle = skinD; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-3, -6.5); ctx.lineTo(-1, -6.5); ctx.moveTo(-3, -0.2); ctx.lineTo(-1, -0.2); ctx.moveTo(-3, 6); ctx.lineTo(-1, 6); ctx.stroke();
    }
    ctx.restore();
  }

  /*
   * 力桌（俯視）：鋁製圓盤 + 角度刻度 + 中心環。
   * 回傳一個函式 pulleyAt(angleDeg, label, massText) 在盤緣裝滑輪並把繩拉到中心。
   */
  function forceTableTop(ctx, cx, cy, r) {
    const L = isLight();
    contactShadow(ctx, cx + 6, cy + r * 0.2, r * 1.15);
    // 支腳（俯視看得到三支腳的末端）
    [90, 210, 330].forEach(a => {
      const ra = a * Math.PI / 180;
      ctx.fillStyle = "rgb(60,66,76)";
      ctx.beginPath(); ctx.arc(cx + Math.cos(ra) * r * 1.02, cy + Math.sin(ra) * r * 1.02, 7, 0, TAU); ctx.fill();
    });
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, "rgb(236,240,245)"); g.addColorStop(0.75, "rgb(200,207,216)"); g.addColorStop(1, "rgb(160,168,180)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(60,70,84,0.7)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    // 刻度：每 5° 短線、每 30° 長線與數字（0° 在右、逆時針增加）
    ctx.font = "9px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let d = 0; d < 360; d += 5) {
      const a = -d * Math.PI / 180, major = d % 30 === 0;
      const r1 = r - 3, r2 = r - (major ? 12 : d % 10 === 0 ? 8 : 5);
      ctx.strokeStyle = major ? "rgba(30,38,50,0.85)" : "rgba(40,50,64,0.45)"; ctx.lineWidth = major ? 1.2 : 0.8;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
      if (major) { ctx.fillStyle = "rgba(30,38,50,0.85)"; ctx.fillText(String(d), cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22)); }
    }
    ctx.strokeStyle = "rgba(60,70,84,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, TAU); ctx.stroke();
    note(ctx, "#d4dae2", cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4);
    return function pulleyAt(deg, massText, tint) {
      const a = -deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const px = cx + ca * (r + 6), py = cy + sa * (r + 6);
      // 繩：中心環 → 滑輪
      ctx.strokeStyle = "rgba(90,70,40,0.9)"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx + ca * 8, cy + sa * 8); ctx.lineTo(px, py); ctx.stroke();
      // 夾具與滑輪（俯視：一個窄長的輪子）
      ctx.save(); ctx.translate(px, py); ctx.rotate(a);
      steel(ctx, -10, -7, 12, 14, 8);
      ctx.fillStyle = "rgb(150,158,170)"; rrPath(ctx, 2, -3.5, 16, 7, 3); ctx.fill();
      ctx.strokeStyle = "rgba(30,36,46,0.7)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      // 掛在滑輪外的砝碼盤（俯視成一個圓）
      const hx = cx + ca * (r + 30), hy = cy + sa * (r + 30);
      const hg = ctx.createRadialGradient(hx - 3, hy - 3, 1, hx, hy, 11);
      const tc = hexRgb(tint || "#8a94a4");
      hg.addColorStop(0, rgbStr(shadeRgb(tc, 0.35))); hg.addColorStop(1, rgbStr(shadeRgb(tc, -0.3)));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(20,26,36,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      if (massText) {
        ctx.fillStyle = "#fff"; ctx.font = "700 8px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(massText, hx, hy + 0.5);
      }
      return { x: hx, y: hy };
    };
  }

  /* 刀口支點（槓桿用）：三角鋼座 */
  function knifeEdge(ctx, cx, topY, h, baseW) {
    const bw = baseW || h * 1.1;
    contactShadow(ctx, cx, topY + h + 2, bw * 0.8);
    const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    g.addColorStop(0, "rgb(96,104,118)"); g.addColorStop(0.45, "rgb(190,198,210)"); g.addColorStop(1, "rgb(70,78,92)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx + bw / 2, topY + h); ctx.lineTo(cx - bw / 2, topY + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(30,38,50,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    steel(ctx, cx - bw * 0.7, topY + h, bw * 1.4, 6, 6);
  }

  window.PhysicsLab.apparatus = {
    steel, brass, brassDisc, contactShadow,
    bench, carrier, benchTop,
    starfield, planet, moonBall,
    candle, laser,
    lens, screen, projectedFlame, glassPlate, curvedMirror, semiCircleGlass, protractor,
    battery, bulb, meter, wire, resistorBox, fuse,
    cable, valueChip, knifeSwitch, rheostat,
    symWire, symJunction, symBattery, symResistor, symRheostat, symBulb, symMeter, symSwitch, symFuse,
    standRod, crossArm, weight, woodBlock, ramp, pulley, cord, bob, ruler, springScale, beaker,
    wallPost,
    cart, tickerTimer, vibrator, tuningFork, glassTube,
    barMagnet, coilWinding, ironCore, thermometer, polePiece,
    stopwatch, clampHead, dataPad,
    /* 場景層 v2 */
    labRoom, benchSlab, labWindow, whiteboard, cloud, outdoor, skyline, ground, road, water, tree, flag,
    targetBoard, building, cliff,
    smokePuff, muzzleFlash, dustKick, confetti, splash,
    /* 器材 v2：力學 */
    paperTape, infoCard, spokedWheel, cannon, cannonWheelDrop, sportBall, massBlock, crate, table, car, boatTop, person, skateboard,
    wallBlock, ceilingBeam, hookPlate, rope, conveyor, hand, forceTableTop, knifeEdge,
    rrPath, isLight
  };
})();
