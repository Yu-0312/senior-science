/*
 * sim-core.js
 * 台灣高中物理實驗室 — 模擬引擎與共用元件
 * 提供：實驗註冊表、UI 元件（滑桿／按鈕／讀數）、高解析度畫布、動畫迴圈。
 * 使用傳統 <script> 全域註冊，確保直接以檔案開啟（file://）亦可運作。
 */
(function () {
  "use strict";

  const registry = {};

  const PhysicsLab = {
    experiments: registry,

    // 讓各實驗檔案自我註冊
    register: function (id, config) {
      registry[id] = config;
    },
    get: function (id) {
      return registry[id];
    },

    // ---- UI 元件 ----
    ui: {
      // 滑桿：{ label, min, max, step, value, unit, format, onInput }
      slider: function (opts) {
        const wrap = document.createElement("div");
        wrap.className = "ctrl-slider";

        const head = document.createElement("div");
        head.className = "ctrl-head";
        const label = document.createElement("span");
        label.className = "ctrl-label";
        label.textContent = opts.label;
        const val = document.createElement("span");
        val.className = "ctrl-value";
        head.appendChild(label);
        head.appendChild(val);

        const input = document.createElement("input");
        input.type = "range";
        input.min = opts.min;
        input.max = opts.max;
        input.step = opts.step != null ? opts.step : 1;
        input.value = opts.value != null ? opts.value : opts.min;

        const fmt = opts.format || function (v) {
          return (Math.round(v * 100) / 100) + (opts.unit ? " " + opts.unit : "");
        };
        function refresh() {
          val.textContent = fmt(parseFloat(input.value));
        }
        input.addEventListener("input", function () {
          refresh();
          if (opts.onInput) opts.onInput(parseFloat(input.value));
        });
        refresh();

        wrap.appendChild(head);
        wrap.appendChild(input);
        return {
          el: wrap,
          input: input,
          get: function () { return parseFloat(input.value); },
          set: function (v) { input.value = v; refresh(); },
          refresh: refresh
        };
      },

      button: function (label, onClick, variant) {
        const b = document.createElement("button");
        b.className = "btn" + (variant ? " btn-" + variant : "");
        b.textContent = label;
        b.addEventListener("click", onClick);
        return b;
      },

      // 讀數：{ label, unit }
      readout: function (opts) {
        const wrap = document.createElement("div");
        wrap.className = "readout";
        const l = document.createElement("div");
        l.className = "readout-label";
        l.textContent = opts.label;
        const v = document.createElement("div");
        v.className = "readout-value";
        v.textContent = "—";
        wrap.appendChild(v);
        wrap.appendChild(l);
        return {
          el: wrap,
          set: function (text) {
            v.textContent = text + (opts.unit ? " " + opts.unit : "");
          }
        };
      },

      // 建立標準版面：畫布 + 側邊控制列 + 底部讀數列
      layout: function (root) {
        root.innerHTML = "";
        const stage = document.createElement("div");
        stage.className = "sim-stage";
        const canvasWrap = document.createElement("div");
        canvasWrap.className = "sim-canvas-wrap";
        const controls = document.createElement("div");
        controls.className = "sim-controls";
        stage.appendChild(canvasWrap);
        stage.appendChild(controls);

        const readouts = document.createElement("div");
        readouts.className = "sim-readouts";

        root.appendChild(stage);
        root.appendChild(readouts);
        return { canvasWrap: canvasWrap, controls: controls, readouts: readouts };
      }
    },

    // ---- 高解析度畫布 ----
    canvas: {
      create: function (parent, w, h) {
        const dpr = window.devicePixelRatio || 1;
        const c = document.createElement("canvas");
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = "100%";
        c.style.height = "auto";
        c.style.maxWidth = w + "px";
        c.className = "sim-canvas";
        const ctx = c.getContext("2d");
        ctx.scale(dpr, dpr);
        parent.appendChild(c);
        return { canvas: c, ctx: ctx, w: w, h: h };
      }
    },

    // ---- 動畫迴圈：callback(dt秒) ----
    loop: function (callback) {
      let raf = null, last = 0, running = false;
      function frame(ts) {
        if (!running) return;
        if (!last) last = ts;
        let dt = (ts - last) / 1000;
        last = ts;
        if (dt > 0.05) dt = 0.05; // 避免分頁切換造成跳格
        callback(dt);
        raf = requestAnimationFrame(frame);
      }
      return {
        start: function () {
          if (running) return;
          running = true; last = 0;
          raf = requestAnimationFrame(frame);
        },
        stop: function () {
          running = false;
          if (raf) cancelAnimationFrame(raf);
        },
        isRunning: function () { return running; }
      };
    },

    // ---- 小工具 ----
    util: {
      clamp: function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
      lerp: function (a, b, t) { return a + (b - a) * t; },
      fmt: function (v, d) {
        const p = Math.pow(10, d == null ? 2 : d);
        return Math.round(v * p) / p;
      },
      // 繪製淡色格線背景
      grid: function (ctx, w, h, step, color) {
        ctx.save();
        ctx.strokeStyle = color || "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += step) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += step) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        ctx.restore();
      },
      // 畫箭頭（向量）
      arrow: function (ctx, x1, y1, x2, y2, color, width) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) return;
        const a = Math.atan2(dy, dx);
        const head = Math.min(9, len * 0.35);
        ctx.save();
        ctx.strokeStyle = color; ctx.fillStyle = color;
        ctx.lineWidth = width || 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
        ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  };

  window.PhysicsLab = PhysicsLab;
})();
