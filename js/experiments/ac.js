/* 交流電（發電機）AC generator */
(function () {
  "use strict";
  PhysicsLab.register("ac", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const gx = 150, gy = 175, R = 82;    // 發電機圓心
      const scopeX = 300, scopeW = 350;

      const st = { w: 2.2, B: 1.2, N: 20, t: 0, trace: [] };

      const sW = PhysicsLab.ui.slider({ label: "轉速 ω", min: 0.6, max: 5, step: 0.1, value: 2.2, unit: "rad/s", onInput: v => st.w = v });
      const sB = PhysicsLab.ui.slider({ label: "磁場 B", min: 0.4, max: 2.5, step: 0.1, value: 1.2, unit: "T", onInput: v => st.B = v });
      const sN = PhysicsLab.ui.slider({ label: "匝數 N", min: 5, max: 40, step: 1, value: 20, unit: "匝", onInput: v => st.N = v });
      [sW, sB, sN].forEach(s => L.controls.appendChild(s.el));

      const rF = PhysicsLab.ui.readout({ label: "頻率 f", unit: "Hz" });
      const rPk = PhysicsLab.ui.readout({ label: "峰值電動勢", unit: "相對" });
      const rNow = PhysicsLab.ui.readout({ label: "目前電動勢", unit: "相對" });
      [rF, rPk, rNow].forEach(r => L.readouts.appendChild(r.el));

      function peak() { return st.N * st.B * st.w * 0.35; }

      function draw() {
        const th = st.t * st.w;
        const emf = peak() * Math.sin(th);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);

        // 磁極與磁場線
        ctx.fillStyle = "#ff5a44"; ctx.fillRect(gx - R - 34, gy - 60, 22, 120);
        ctx.fillStyle = "#4d9fff"; ctx.fillRect(gx + R + 12, gy - 60, 22, 120);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
        ctx.fillText("N", gx - R - 23, gy + 5); ctx.fillText("S", gx + R + 23, gy + 5); ctx.textAlign = "left";
        ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(gx - R - 12, gy + i * 24); ctx.lineTo(gx + R + 12, gy + i * 24); ctx.stroke(); }

        // 轉動線圈（以橢圓寬度表示面法線與磁場夾角）
        const rx = Math.abs(Math.cos(th)) * R;
        ctx.strokeStyle = "#ffcc66"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(gx, gy, Math.max(rx, 3), R, 0, 0, 7); ctx.stroke();
        // 轉軸
        ctx.strokeStyle = "#5a6b7d"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx, gy - R - 14); ctx.lineTo(gx, gy + R + 14); ctx.stroke();
        // 電流方向點（沿線圈，方向隨 emf 正負）
        const cur = emf / (peak() || 1);
        ctx.fillStyle = cur >= 0 ? "#34d3c4" : "#ff8a65";
        ctx.beginPath(); ctx.arc(gx + (cur >= 0 ? rx : -rx), gy, 5, 0, 7); ctx.fill();

        // 示波器
        ctx.strokeStyle = "#26303d"; ctx.lineWidth = 1;
        const cy = gy;
        ctx.beginPath(); ctx.moveTo(scopeX, cy); ctx.lineTo(scopeX + scopeW, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(scopeX, 60); ctx.lineTo(scopeX, H - 40); ctx.stroke();
        ctx.fillStyle = "#62707f"; ctx.font = "11px system-ui"; ctx.fillText("電動勢 ε", scopeX + 4, 56);
        st.trace.push(emf);
        if (st.trace.length > scopeW) st.trace.shift();
        const pk = peak() || 1;
        ctx.strokeStyle = "#34d3c4"; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < st.trace.length; i++) {
          const px = scopeX + i, py = cy - st.trace[i] / pk * 90;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();

        rF.set(U.fmt(st.w / (2 * Math.PI), 3));
        rPk.set(U.fmt(peak(), 2));
        rNow.set(U.fmt(emf, 2));
      }

      const loop = PhysicsLab.loop(function (dt) { st.t += dt; draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
