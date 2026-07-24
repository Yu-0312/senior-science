/* 拋體運動 Projectile motion */
(function () {
  "use strict";
  PhysicsLab.register("projectile", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;

      const state = { v0: 25, ang: 45, g: 9.8, t: 0, flying: false, done: false };

      // 控制項
      const sV = PhysicsLab.ui.slider({ label: "初速 v₀", min: 5, max: 45, step: 1, value: 25, unit: "m/s", onInput: v => { state.v0 = v; reset(); } });
      const sA = PhysicsLab.ui.slider({ label: "發射角 θ", min: 5, max: 85, step: 1, value: 45, unit: "°", onInput: v => { state.ang = v; reset(); } });
      const sG = PhysicsLab.ui.slider({ label: "重力 g", min: 1.6, max: 24.8, step: 0.1, value: 9.8, unit: "m/s²", onInput: v => { state.g = v; reset(); } });
      L.controls.appendChild(sV.el); L.controls.appendChild(sA.el); L.controls.appendChild(sG.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bGo = PhysicsLab.ui.button("發射", () => { if (state.done) reset(); state.flying = true; loop.start(); }, "primary");
      const bReset = PhysicsLab.ui.button("重設", reset);
      btnRow.appendChild(bGo); btnRow.appendChild(bReset);
      L.controls.appendChild(btnRow);

      // 讀數
      const rT = PhysicsLab.ui.readout({ label: "飛行時間", unit: "s" });
      const rH = PhysicsLab.ui.readout({ label: "最大高度", unit: "m" });
      const rR = PhysicsLab.ui.readout({ label: "水平射程", unit: "m" });
      const rS = PhysicsLab.ui.readout({ label: "目前速率", unit: "m/s" });
      [rT, rH, rR, rS].forEach(r => L.readouts.appendChild(r.el));

      function derived() {
        const rad = state.ang * Math.PI / 180;
        const vx = state.v0 * Math.cos(rad), vy = state.v0 * Math.sin(rad);
        const T = 2 * vy / state.g;
        const R = vx * T;
        const Hm = vy * vy / (2 * state.g);
        return { vx, vy, T, R, Hm, rad };
      }

      function reset() {
        state.t = 0; state.flying = false; state.done = false;
        loop.stop(); draw();
        const d = derived();
        rT.set(U.fmt(d.T, 2)); rH.set(U.fmt(d.Hm, 1)); rR.set(U.fmt(d.R, 1)); rS.set(U.fmt(state.v0, 1));
      }

      function scaleFit(d) {
        const usableW = W - 70, usableH = H - 70;
        let s = Math.min(usableW / Math.max(d.R, 1), usableH / Math.max(d.Hm, 1));
        return Math.min(s, 46);
      }

      function draw() {
        const d = derived();
        const s = scaleFit(d);
        const ox = 46, oy = H - 40;
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 地面
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
        // 預測軌跡（虛線）
        ctx.strokeStyle = "rgba(52,211,196,0.35)"; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const tt = d.T * i / 60;
          const px = ox + d.vx * tt * s;
          const py = oy - (d.vy * tt - 0.5 * state.g * tt * tt) * s;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke(); ctx.setLineDash([]);
        // 發射角指示
        ctx.strokeStyle = "#5a6b7d"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 40 * Math.cos(d.rad), oy - 40 * Math.sin(d.rad)); ctx.stroke();

        // 目前位置
        const t = state.t;
        const cx = ox + d.vx * t * s;
        const cy = oy - (d.vy * t - 0.5 * state.g * t * t) * s;
        // 已飛軌跡
        ctx.strokeStyle = "#34d3c4"; ctx.lineWidth = 2.5; ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const tt = t * i / 40;
          const px = ox + d.vx * tt * s;
          const py = oy - (d.vy * tt - 0.5 * state.g * tt * tt) * s;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // 速度向量
        const cvx = d.vx, cvy = d.vy - state.g * t;
        U.arrow(ctx, cx, cy, cx + cvx * 1.6, cy - cvy * 1.6, "#ffcc66", 2.5);
        // 拋體
        ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill();
        ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5; ctx.stroke();

        // 目前速率讀數
        rS.set(U.fmt(Math.hypot(cvx, cvy), 1));
      }

      const loop = PhysicsLab.loop(function (dt) {
        if (!state.flying) return;
        state.t += dt;
        const d = derived();
        if (state.t >= d.T) { state.t = d.T; state.flying = false; state.done = true; loop.stop(); }
        draw();
      });

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
