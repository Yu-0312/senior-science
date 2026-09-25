/*
 * sim-tools.js — 可拖曳的量測工具層
 *
 * 由來：PhET 的設計文件（來自學生訪談）指出兩件事——
 *   「點擊拖曳是學生最自然的動作，看起來有用的東西他們都會想去拖。」
 *   「為了鼓勵量化探究，模擬應該提供尺、碼錶、電壓表、溫度計這類量測儀器。」
 * 本站原本 245 個實驗全部只能用滑桿操作，畫面上的東西一個都不能碰，
 * 也沒有任何一個「學生自己動手量」的工具。這個檔案補上這一塊。
 *
 * 實作要點：
 *   1. 工具畫在獨立的疊圖畫布上，不介入實驗自己的 draw()／動畫迴圈，
 *      因此不必修改任何一個實驗檔，245 個實驗自動全部可用。
 *   2. 沒有開啟工具時疊圖層是 pointer-events: none，完全不影響原本的操作。
 *   3. 碼錶量的是「模擬時間」而不是牆上時鐘——慢動作與單步都會被正確計入，
 *      學生用它量單擺週期，得到的才是模擬裡的物理時間。
 *   4. 量角器量的是螢幕角度，角度與比例尺無關，所有實驗都成立。
 *   5. 尺需要知道「幾像素等於一公尺」，因此只在實驗呼叫過 cv.calibrate()
 *      時才提供。沒校準就不給尺，不給出沒有物理意義的讀數。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /*
   * 觸控裝置的命中範圍
   * 量角器的量角臂與尺的端點原本用 12px 的命中半徑，那是照滑鼠游標設計的。
   * 手指的接觸面積大得多，實測上 12px 幾乎抓不到，因此在觸控裝置放大到 24px；
   * 碼錶的按鈕也一併加高。視覺尺寸不變，只放大看不見的判定區。
   */
  const COARSE = (function () {
    try { return window.matchMedia && window.matchMedia("(pointer: coarse)").matches; }
    catch (e) { return false; }
  })();
  const GRAB = COARSE ? 24 : 12;              // 把手的命中半徑
  const BTN_H = COARSE ? 30 : 18;             // 碼錶按鈕高度
  const BTN_GAP = COARSE ? 6 : 4;

  /* 依主題取得工具本身的配色（工具是介面，不是實驗內容，用固定的高對比配色） */
  function palette() {
    const light = PL.theme.isLight();
    return {
      body: light ? "rgba(255,255,255,0.94)" : "rgba(16,22,32,0.92)",
      edge: light ? "rgba(22,32,46,0.55)" : "rgba(230,240,250,0.45)",
      tick: light ? "rgba(22,32,46,0.75)" : "rgba(230,240,250,0.7)",
      text: light ? "#16202e" : "#eef3fa",
      dim: light ? "rgba(22,32,46,0.55)" : "rgba(200,215,230,0.6)",
      accent: PL.col("accent", "#35e0cf"),
      warn: PL.col("warn", "#ffcc66"),
      shadow: light ? "rgba(30,50,90,0.20)" : "rgba(0,0,0,0.5)"
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function label(ctx, text, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = o.color || "#fff";
    ctx.font = (o.weight || "") + " " + (o.size || 12) + "px 'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif";
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = o.baseline || "alphabetic";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /* =======================================================================
     碼錶
     量的是模擬時間：慢動作 0.25× 時，真實世界過 4 秒，碼錶只走 1 秒。
     這樣學生用它量出來的單擺週期，才會和公式算出來的一致。
     ======================================================================= */
  function Stopwatch() {
    return {
      key: "stopwatch",
      name: "碼錶",
      x: 24, y: 24, w: COARSE ? 172 : 138, h: COARSE ? 76 : 62,
      elapsed: 0,
      running: false,
      laps: [],
      tick(dt) { if (this.running) this.elapsed += dt; },
      reset() { this.elapsed = 0; this.running = false; this.laps = []; },
      format() {
        const t = this.elapsed;
        const m = Math.floor(t / 60);
        const s = t - m * 60;
        return (m > 0 ? m + ":" + (s < 10 ? "0" : "") : "") + s.toFixed(2) + (m > 0 ? "" : " s");
      },
      // 內部按鈕（相對座標）
      buttons() {
        // 觸控裝置上按鈕加高、間距加大，避免誤觸隔壁的按鈕
        const w1 = COARSE ? 62 : 56, w2 = COARSE ? 40 : 28, w3 = COARSE ? 42 : 30;
        const x1 = 8, x2 = x1 + w1 + BTN_GAP, x3 = x2 + w2 + BTN_GAP;
        return [
          { id: "toggle", x: x1, y: 36, w: w1, h: BTN_H, text: this.running ? "停止" : "開始" },
          { id: "lap", x: x2, y: 36, w: w2, h: BTN_H, text: "記圈" },
          { id: "zero", x: x3, y: 36, w: w3, h: BTN_H, text: "歸零" }
        ];
      },
      press(id) {
        if (id === "toggle") this.running = !this.running;
        else if (id === "zero") { this.elapsed = 0; this.laps = []; }
        else if (id === "lap") {
          this.laps.unshift(this.elapsed);
          if (this.laps.length > 3) this.laps.pop();
        }
      },
      draw(ctx, p) {
        const h = this.h + (this.laps.length ? 16 + this.laps.length * 13 : 0);
        ctx.save();
        ctx.shadowColor = p.shadow; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
        ctx.fillStyle = p.body;
        roundRect(ctx, this.x, this.y, this.w, h, 8);
        ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();

        label(ctx, "碼錶 · 模擬時間", this.x + 8, this.y + 15, { color: p.dim, size: 9.5 });
        label(ctx, this.format(), this.x + 8, this.y + 32,
          { color: this.running ? p.accent : p.text, size: 17, weight: "700" });

        this.buttons().forEach(b => {
          ctx.save();
          ctx.fillStyle = b.id === "toggle" && this.running ? p.warn : "transparent";
          ctx.strokeStyle = p.edge; ctx.lineWidth = 1;
          roundRect(ctx, this.x + b.x, this.y + b.y, b.w, b.h, 4);
          if (b.id === "toggle" && this.running) ctx.fill();
          ctx.stroke();
          ctx.restore();
          label(ctx, b.text, this.x + b.x + b.w / 2, this.y + b.y + BTN_H / 2 + 4,
            { color: b.id === "toggle" && this.running ? "#241a00" : p.text, size: 10, align: "center", weight: "600" });
        });

        // 記圈：量週期時可以連續按，直接比較相鄰兩次的差
        this.laps.forEach((lap, i) => {
          const y = this.y + this.h + 12 + i * 13;
          const prev = this.laps[i + 1];
          const diff = prev != null ? "  Δ " + (lap - prev).toFixed(2) : "";
          label(ctx, "#" + (this.laps.length - i) + "  " + lap.toFixed(2) + " s" + diff,
            this.x + 8, y, { color: p.dim, size: 10 });
        });
        this._drawnHeight = h;
      },
      hit(mx, my) {
        const h = this._drawnHeight || this.h;
        return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + h;
      },
      hitButton(mx, my) {
        const b = this.buttons().find(btn =>
          mx >= this.x + btn.x && mx <= this.x + btn.x + btn.w &&
          my >= this.y + btn.y && my <= this.y + btn.y + btn.h);
        return b ? b.id : null;
      }
    };
  }

  /* =======================================================================
     量角器
     角度與比例尺無關，因此不需要任何校準，所有實驗都能直接用：
     量斜面傾角、入射角與折射角、向量夾角、單擺擺角。
     中心可拖曳，量角臂也可以單獨拖到要對齊的方向。
     ======================================================================= */
  function Protractor() {
    return {
      key: "protractor",
      name: "量角器",
      x: 260, y: 150, r: 78,
      armAngle: -Math.PI / 6,
      reset() { this.armAngle = -Math.PI / 6; },
      armPoint() {
        return { x: this.x + Math.cos(this.armAngle) * this.r, y: this.y + Math.sin(this.armAngle) * this.r };
      },
      degrees() {
        let deg = -this.armAngle * 180 / Math.PI;   // 螢幕 y 軸向下，取負讓逆時針為正
        if (deg < 0) deg += 360;
        return deg;
      },
      draw(ctx, p) {
        ctx.save();
        // 半透明本體，才不會遮住底下要量的東西
        ctx.fillStyle = p.body; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, Math.PI, TAU); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, Math.PI, TAU); ctx.closePath(); ctx.stroke();

        // 每 10° 一刻度，每 30° 標數字
        for (let deg = 0; deg <= 180; deg += 10) {
          const a = -deg * Math.PI / 180;
          const long = deg % 30 === 0;
          const r0 = this.r - (long ? 12 : 6);
          ctx.strokeStyle = p.tick; ctx.lineWidth = long ? 1.2 : 0.8;
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(a) * r0, this.y + Math.sin(a) * r0);
          ctx.lineTo(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r);
          ctx.stroke();
          if (long) {
            label(ctx, String(deg), this.x + Math.cos(a) * (this.r - 22), this.y + Math.sin(a) * (this.r - 22) + 4,
              { color: p.dim, size: 9, align: "center" });
          }
        }
        // 基準線與中心
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(this.x - this.r, this.y); ctx.lineTo(this.x + this.r, this.y); ctx.stroke();

        // 量角臂
        const arm = this.armPoint();
        ctx.strokeStyle = p.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(arm.x, arm.y); ctx.stroke();
        ctx.fillStyle = p.accent;
        ctx.beginPath(); ctx.arc(arm.x, arm.y, COARSE ? 10 : 6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(this.x, this.y, COARSE ? 5 : 3.5, 0, TAU); ctx.fill();
        ctx.restore();

        // 讀數框
        const text = this.degrees().toFixed(1) + "°";
        const bw = 56, bx = this.x - bw / 2, by = this.y + 8;
        ctx.save();
        ctx.fillStyle = p.body; ctx.strokeStyle = p.edge; ctx.lineWidth = 1;
        roundRect(ctx, bx, by, bw, 20, 4); ctx.fill(); ctx.stroke();
        ctx.restore();
        label(ctx, text, this.x, by + 14, { color: p.text, size: 12, align: "center", weight: "700" });
      },
      hitArm(mx, my) {
        const a = this.armPoint();
        return Math.hypot(mx - a.x, my - a.y) <= GRAB;
      },
      hit(mx, my) {
        const d = Math.hypot(mx - this.x, my - this.y);
        return d <= this.r && my <= this.y + 28;
      }
    };
  }

  /* =======================================================================
     尺
     只有實驗呼叫過 cv.calibrate(pxPerUnit, unit) 才會出現。
     兩端都可以拖：拖端點改變方向與位置，拖中間整支平移。
     ======================================================================= */
  function Ruler(pxPerUnit, unit) {
    return {
      key: "ruler",
      name: "尺",
      ax: 90, ay: 250, bx: 330, by: 250,
      pxPerUnit, unit,
      reset() { this.ax = 90; this.ay = 250; this.bx = 330; this.by = 250; },
      lengthPx() { return Math.hypot(this.bx - this.ax, this.by - this.ay); },
      reading() { return this.lengthPx() / this.pxPerUnit; },
      draw(ctx, p) {
        const dx = this.bx - this.ax, dy = this.by - this.ay;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        const half = 13;

        ctx.save();
        ctx.shadowColor = p.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
        ctx.fillStyle = p.body;
        ctx.beginPath();
        ctx.moveTo(this.ax + nx * half, this.ay + ny * half);
        ctx.lineTo(this.bx + nx * half, this.by + ny * half);
        ctx.lineTo(this.bx - nx * half, this.by - ny * half);
        ctx.lineTo(this.ax - nx * half, this.ay - ny * half);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1; ctx.stroke();

        // 刻度：依校準比例決定間隔，讓刻度密度在畫面上維持可讀
        const total = this.reading();
        const rough = total / 10;
        const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)));
        const stepUnit = [1, 2, 5, 10].map(m => m * mag).find(v => total / v <= 12) || mag;
        const stepPx = stepUnit * this.pxPerUnit;
        ctx.strokeStyle = p.tick;
        for (let d = 0, i = 0; d <= len + 0.5; d += stepPx, i++) {
          const x = this.ax + ux * d, y = this.ay + uy * d;
          const long = i % 5 === 0;
          ctx.lineWidth = long ? 1.2 : 0.7;
          ctx.beginPath();
          ctx.moveTo(x - nx * half, y - ny * half);
          ctx.lineTo(x - nx * (half - (long ? 9 : 5)), y - ny * (half - (long ? 9 : 5)));
          ctx.stroke();
          if (long && i > 0) {
            label(ctx, PL.fmt(i * stepUnit, stepUnit < 1 ? 2 : 0), x + nx * 4, y + ny * 4 + 3,
              { color: p.dim, size: 8, align: "center" });
          }
        }
        // 兩端把手
        ctx.fillStyle = p.accent;
        [[this.ax, this.ay], [this.bx, this.by]].forEach(([hx, hy]) => {
          ctx.beginPath(); ctx.arc(hx, hy, COARSE ? 10 : 6, 0, TAU); ctx.fill();
        });
        ctx.restore();

        // 讀數
        const mx = (this.ax + this.bx) / 2, my = (this.ay + this.by) / 2;
        const text = PL.fmt(total, 3) + " " + this.unit;
        ctx.save();
        ctx.fillStyle = p.body; ctx.strokeStyle = p.edge; ctx.lineWidth = 1;
        roundRect(ctx, mx - 38, my - half - 26, 76, 20, 4); ctx.fill(); ctx.stroke();
        ctx.restore();
        label(ctx, text, mx, my - half - 12, { color: p.text, size: 11.5, align: "center", weight: "700" });
      },
      hitEnd(mx, my) {
        if (Math.hypot(mx - this.ax, my - this.ay) <= GRAB) return "a";
        if (Math.hypot(mx - this.bx, my - this.by) <= GRAB) return "b";
        return null;
      },
      hit(mx, my) {
        // 點到尺身（線段附近）就算命中
        const dx = this.bx - this.ax, dy = this.by - this.ay;
        const len2 = dx * dx + dy * dy || 1;
        const t = clamp(((mx - this.ax) * dx + (my - this.ay) * dy) / len2, 0, 1);
        const px = this.ax + dx * t, py = this.ay + dy * t;
        return Math.hypot(mx - px, my - py) <= (COARSE ? 26 : 15);
      }
    };
  }

  /* =======================================================================
     工具層本體：疊圖畫布 + 指標事件 + 工具列按鈕
     ======================================================================= */
  function attachTools(cv, wrap, context) {
    if (context.tools) return;                       // 一個實驗只掛一次

    const host = document.createElement("div");
    host.className = "sim-tool-host";
    const overlay = document.createElement("canvas");
    overlay.className = "sim-tool-layer";
    host.appendChild(overlay);

    // 主畫布必須已經掛在文件裡才有地方疊；理論上不會發生，但不要讓整個實驗因此建不起來。
    if (!cv.canvas.parentNode || !wrap.parentNode) return;

    // 疊在主畫布正上方
    cv.canvas.parentNode.insertBefore(host, cv.canvas.nextSibling);

    const ctx = overlay.getContext("2d");
    const active = new Map();
    let dpr = 1, needsPaint = true, raf = 0, destroyed = false;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.W, h = cv.H;
      /*
       * 對齊主畫布：.sim-canvas-wrap 有內距，畫布並不是從容器的左上角開始。
       * 用畫布自己回報的 offset 定位，工具的座標系才會和畫布逐像素重合。
       */
      host.style.left = (cv.canvas.offsetLeft || 0) + "px";
      host.style.top = (cv.canvas.offsetTop || 0) + "px";
      host.style.width = w + "px";
      host.style.height = h + "px";
      overlay.style.width = w + "px";
      overlay.style.height = h + "px";
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsPaint = true;
    }

    function paint() {
      raf = 0;
      if (destroyed) return;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cv.W, cv.H);
      ctx.restore();
      const p = palette();
      active.forEach(tool => tool.draw(ctx, p));
      needsPaint = false;
    }
    function schedule() {
      if (destroyed || raf) return;
      raf = requestAnimationFrame(paint);
    }

    /* ---------------- 指標互動 ---------------- */
    let drag = null;
    const pos = e => {
      const r = overlay.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (cv.W / r.width), y: (e.clientY - r.top) * (cv.H / r.height) };
    };

    overlay.addEventListener("pointerdown", e => {
      const { x, y } = pos(e);
      // 由後往前測試，讓後畫（在上層）的工具優先被抓到
      const tools = Array.from(active.values()).reverse();
      for (const tool of tools) {
        if (tool.key === "stopwatch") {
          const btn = tool.hitButton(x, y);
          if (btn) { tool.press(btn); schedule(); e.preventDefault(); overlay.setPointerCapture(e.pointerId); drag = { tool, mode: "none" }; return; }
        }
        if (tool.key === "protractor" && tool.hitArm(x, y)) {
          drag = { tool, mode: "arm" };
        } else if (tool.key === "ruler" && tool.hitEnd(x, y)) {
          drag = { tool, mode: "end", end: tool.hitEnd(x, y) };
        } else if (tool.hit(x, y)) {
          drag = { tool, mode: "move", ox: x, oy: y };
        }
        if (drag) {
          // 被拖的工具移到最上層
          active.delete(tool.key); active.set(tool.key, tool);
          overlay.setPointerCapture(e.pointerId);
          e.preventDefault();
          schedule();
          return;
        }
      }
    });

    overlay.addEventListener("pointermove", e => {
      if (!drag) return;
      const { x, y } = pos(e);
      const t = drag.tool;
      if (drag.mode === "arm") {
        t.armAngle = Math.atan2(y - t.y, x - t.x);
      } else if (drag.mode === "end") {
        if (drag.end === "a") { t.ax = x; t.ay = y; } else { t.bx = x; t.by = y; }
      } else if (drag.mode === "move") {
        const dx = x - drag.ox, dy = y - drag.oy;
        drag.ox = x; drag.oy = y;
        if (t.key === "ruler") { t.ax += dx; t.ay += dy; t.bx += dx; t.by += dy; }
        else { t.x += dx; t.y += dy; }
      }
      schedule();
    });

    const endDrag = () => { drag = null; };
    overlay.addEventListener("pointerup", endDrag);
    overlay.addEventListener("pointercancel", endDrag);

    /* ---------------- 工具列按鈕 ---------------- */
    const bar = document.createElement("div");
    bar.className = "sim-tool-bar";
    const barLabel = document.createElement("span");
    barLabel.className = "sim-tool-bar-label";
    barLabel.textContent = "量測工具";
    bar.appendChild(barLabel);

    const available = [
      { key: "stopwatch", name: "碼錶", make: Stopwatch, hint: "拖到畫面上，按開始量週期或反應時間" },
      { key: "protractor", name: "量角器", make: Protractor, hint: "拖動中心與量角臂，量斜面角、入射角或向量夾角" }
    ];
    // 只有校準過比例尺的實驗才提供尺
    if (cv.pxPerUnit) {
      available.push({
        key: "ruler", name: "尺（" + cv.unit + "）",
        make: () => Ruler(cv.pxPerUnit, cv.unit),
        hint: "拖兩端對準要量的距離，讀數已依本實驗的比例尺換算"
      });
    }

    function syncPointerEvents() {
      overlay.style.pointerEvents = active.size ? "auto" : "none";
      host.classList.toggle("has-tools", active.size > 0);
    }

    available.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sim-tool-btn";
      btn.textContent = item.name;
      btn.title = item.hint;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        if (active.has(item.key)) { active.delete(item.key); btn.setAttribute("aria-pressed", "false"); btn.classList.remove("active"); }
        else {
          const tool = item.make();
          // 出現在畫面內的合理位置
          if (tool.key === "protractor") { tool.x = cv.W * 0.5; tool.y = cv.H * 0.55; }
          if (tool.key === "ruler") { tool.ax = cv.W * 0.2; tool.ay = cv.H * 0.8; tool.bx = cv.W * 0.6; tool.by = cv.H * 0.8; }
          active.set(item.key, tool);
          btn.setAttribute("aria-pressed", "true"); btn.classList.add("active");
        }
        syncPointerEvents();
        schedule();
      });
      bar.appendChild(btn);
    });

    const hint = document.createElement("span");
    hint.className = "sim-tool-hint";
    const dragVerb = COARSE ? "用手指拖" : "用滑鼠拖";
    hint.textContent = (cv.pxPerUnit
      ? "點一下加到畫面上，然後直接" + dragVerb
      : "點一下加到畫面上（此實驗未設定比例尺，故不提供尺）")
      + (COARSE ? "。工具啟用時畫布區域不會跟著捲動，收起工具即可恢復。" : "");
    bar.appendChild(hint);

    wrap.parentNode.insertBefore(bar, wrap.nextSibling);

    resize();
    cv.onResize(resize);
    syncPointerEvents();

    context.tools = {
      tick(dt) {
        let changed = false;
        active.forEach(tool => { if (tool.tick) { tool.tick(dt); changed = true; } });
        if (changed) schedule();
      },
      reset() {
        active.forEach(tool => tool.reset && tool.reset());
        schedule();
      },
      destroy() {
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        active.clear();
        if (host.parentNode) host.parentNode.removeChild(host);
        if (bar.parentNode) bar.parentNode.removeChild(bar);
      },
      repaint: schedule,
      _active: active
    };
  }

  /*
   * 掛載時機
   * 比例尺是實驗在 draw() 裡算出來的，createCanvas() 當下還不知道。
   * 因此這裡先把主畫布記在建置情境上，等 build() 跑完（第一格已經畫過、
   * calibrate() 也已生效）再建立工具列，才能正確決定要不要提供尺。
   */
  PL._hooks.onStageCanvas((cv, wrap, context) => {
    if (!context.stageCanvas) context.stageCanvas = { cv, wrap };
  });

  PL._hooks.onBuilt(context => {
    if (context.stageCanvas && !context.tools) {
      attachTools(context.stageCanvas.cv, context.stageCanvas.wrap, context);
    }
    if (context.tools) context.tools.repaint();
  });
})();
