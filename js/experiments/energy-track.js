/* 軌道上的能量守恆 Energy conservation on a track */
(function () {
  "use strict";
  PhysicsLab.register("energy-track", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const g = 9.8, mass = 1;
      const X0 = 40, X1 = 560, baseY = 300, maxHt = 210;

      // 軌道高度（世界座標，越大越高）：山谷形
      function worldH(x) {
        const u = (x - X0) / (X1 - X0);              // 0..1
        return 20 + maxHt * (0.5 + 0.5 * Math.cos(u * 2 * Math.PI));
      }
      function slopeAt(x) { const d = 1.0; return (worldH(x + d) - worldH(x - d)) / (2 * d); }

      const st = { relFrac: 0.9, mu: 0.0, x: 0, dir: 1, E: 0, running: false };

      const sH = PhysicsLab.ui.slider({ label: "釋放高度", min: 0.3, max: 1.0, step: 0.05, value: 0.9, format: v => Math.round(v * 100) + " %", onInput: v => { st.relFrac = v; reset(); } });
      const sMu = PhysicsLab.ui.slider({ label: "摩擦係數 μ", min: 0, max: 0.25, step: 0.01, value: 0, onInput: v => { st.mu = v; reset(); } });
      L.controls.appendChild(sH.el); L.controls.appendChild(sMu.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("釋放", () => { st.running = true; loop.start(); }, "primary"));
      btnRow.appendChild(PhysicsLab.ui.button("重設", reset));
      L.controls.appendChild(btnRow);

      const rK = PhysicsLab.ui.readout({ label: "動能 K" });
      const rU = PhysicsLab.ui.readout({ label: "位能 U" });
      const rE = PhysicsLab.ui.readout({ label: "力學能 E" });
      const rSpd = PhysicsLab.ui.readout({ label: "速率", unit: "px/s" });
      [rK, rU, rE, rSpd].forEach(r => L.readouts.appendChild(r.el));

      function targetHeight() { return 20 + maxHt * st.relFrac; }

      function reset() {
        loop.stop(); st.running = false; st.dir = 1;
        // 由左側斜坡上高度為 target 的點釋放
        const target = targetHeight();
        let bx = X0;
        for (let x = X0; x < (X0 + X1) / 2; x += 1) { if (worldH(x) <= target) { bx = x; break; } }
        st.x = bx; st.E = g * target; // KE 0
        draw();
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 軌道
        ctx.strokeStyle = "#4a90d9"; ctx.lineWidth = 3; ctx.beginPath();
        for (let x = X0; x <= X1; x += 4) {
          const sy = baseY - worldH(x);
          if (x === X0) ctx.moveTo(x, sy); else ctx.lineTo(x, sy);
        }
        ctx.stroke();
        // 底部填色
        ctx.lineTo(X1, baseY + 6); ctx.lineTo(X0, baseY + 6); ctx.closePath();
        ctx.fillStyle = "rgba(74,144,217,0.08)"; ctx.fill();

        // 球
        const by = baseY - worldH(st.x);
        ctx.fillStyle = "#ffcc66"; ctx.beginPath(); ctx.arc(st.x, by - 9, 9, 0, 7); ctx.fill();
        ctx.strokeStyle = "#fff0c0"; ctx.lineWidth = 1.5; ctx.stroke();

        // 能量長條圖
        const U_ = g * worldH(st.x);
        const K_ = Math.max(0, st.E - U_);
        const Emax = g * (20 + maxHt) * 1.02;
        bars(K_, U_, st.E, Emax);

        rK.set(U.fmt(K_, 0)); rU.set(U.fmt(U_, 0)); rE.set(U.fmt(st.E, 0));
        rSpd.set(U.fmt(Math.sqrt(2 * K_ / mass), 0));
      }

      function bars(K, Upe, E, Emax) {
        const bx = 590, bw = 60, bh = 230, by = 40;
        ctx.fillStyle = "#0a0f16"; ctx.strokeStyle = "#26303d";
        const data = [["K", K, "#ffcc66"], ["U", Upe, "#4d9fff"], ["E", E, "#34d3c4"]];
        const each = bw / 3;
        ctx.font = "11px system-ui";
        data.forEach((d, i) => {
          const x = bx + i * each;
          ctx.fillStyle = "#0a0f16"; ctx.fillRect(x, by, each - 6, bh);
          ctx.strokeStyle = "#26303d"; ctx.strokeRect(x, by, each - 6, bh);
          const hgt = U.clamp(d[1] / Emax, 0, 1) * bh;
          ctx.fillStyle = d[2]; ctx.fillRect(x, by + bh - hgt, each - 6, hgt);
          ctx.fillStyle = "#97a3b3"; ctx.fillText(d[0], x + 3, by + bh + 14);
        });
      }

      const loop = PhysicsLab.loop(function (dt) {
        if (!st.running) return;
        const steps = 6; const h = dt / steps;
        for (let i = 0; i < steps; i++) step(h);
        draw();
      });

      function step(dt) {
        const U_ = g * worldH(st.x);
        let K = st.E - U_;
        if (K <= 0) { st.dir *= -1; K = 0.5; } // 到達最高點折返
        const speed = Math.sqrt(2 * K / mass);            // 沿軌速率
        const sl = slopeAt(st.x);
        const cosA = 1 / Math.sqrt(1 + sl * sl);
        const vx = st.dir * speed * cosA;                 // 水平速度分量
        const ds = speed * dt;                            // 沿軌位移
        st.x += vx * dt * 6;                              // 6：視覺時間比例
        // 摩擦：消耗力學能
        st.E -= st.mu * g * cosA * ds * 6;
        if (st.E < U_) st.E = U_;
        // 邊界
        if (st.x <= X0) { st.x = X0; st.dir = 1; }
        if (st.x >= X1) { st.x = X1; st.dir = -1; }
        // 幾乎靜止則停
        if (st.mu > 0 && st.E - g * 20 < 1) { st.running = false; loop.stop(); }
      }

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
