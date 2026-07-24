/* 彈簧振子 Spring-mass simple harmonic motion */
(function () {
  "use strict";
  PhysicsLab.register("spring", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const wallX = 60, eqX = 380, SC = 90; // px per m
      const midY = 130;

      const st = { k: 20, m: 1, A: 1.2, t: 0, running: true };
      const graph = [];

      const sK = PhysicsLab.ui.slider({ label: "彈性係數 k", min: 5, max: 60, step: 1, value: 20, unit: "N/m", onInput: v => { st.k = v; st.t = 0; graph.length = 0; refresh(); } });
      const sM = PhysicsLab.ui.slider({ label: "質量 m", min: 0.5, max: 5, step: 0.1, value: 1, unit: "kg", onInput: v => { st.m = v; st.t = 0; graph.length = 0; refresh(); } });
      const sA = PhysicsLab.ui.slider({ label: "振幅 A", min: 0.3, max: 1.6, step: 0.1, value: 1.2, unit: "m", onInput: v => { st.A = v; st.t = 0; graph.length = 0; refresh(); } });
      [sK, sM, sA].forEach(s => L.controls.appendChild(s.el));
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bToggle = PhysicsLab.ui.button("暫停", () => {
        if (loop.isRunning()) { loop.stop(); bToggle.textContent = "繼續"; }
        else { loop.start(); bToggle.textContent = "暫停"; }
      }, "primary");
      btnRow.appendChild(bToggle);
      btnRow.appendChild(PhysicsLab.ui.button("重設", () => { st.t = 0; graph.length = 0; refresh(); }));
      L.controls.appendChild(btnRow);

      const rT = PhysicsLab.ui.readout({ label: "週期 T", unit: "s" });
      const rW = PhysicsLab.ui.readout({ label: "角頻率 ω", unit: "rad/s" });
      const rX = PhysicsLab.ui.readout({ label: "位移 x", unit: "m" });
      const rEk = PhysicsLab.ui.readout({ label: "動能 K", unit: "J" });
      [rT, rW, rX, rEk].forEach(r => L.readouts.appendChild(r.el));

      function omega() { return Math.sqrt(st.k / st.m); }

      function refresh() {
        const w = omega(), T = 2 * Math.PI / w;
        rT.set(U.fmt(T, 2)); rW.set(U.fmt(w, 2));
        draw();
      }

      function drawSpring(x2) {
        const coils = 14, y = midY;
        ctx.strokeStyle = "#8fa3b8"; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(wallX, y);
        const span = x2 - wallX - 20;
        for (let i = 0; i <= coils; i++) {
          const px = wallX + 12 + span * i / coils;
          const py = y + (i % 2 === 0 ? -12 : 12);
          ctx.lineTo(px, py);
        }
        ctx.lineTo(x2, y); ctx.stroke();
      }

      function draw() {
        const w = omega();
        const x = st.A * Math.cos(w * st.t);         // m
        const v = -st.A * w * Math.sin(w * st.t);
        const bx = eqX + x * SC;

        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 牆
        ctx.fillStyle = "#3a4655"; ctx.fillRect(wallX - 12, midY - 46, 12, 92);
        for (let i = 0; i < 6; i++) { ctx.strokeStyle = "#556"; ctx.beginPath(); ctx.moveTo(wallX - 12, midY - 40 + i * 16); ctx.lineTo(wallX, midY - 52 + i * 16); ctx.stroke(); }
        // 平衡線
        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(eqX, midY - 60); ctx.lineTo(eqX, midY + 60); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#62707f"; ctx.font = "11px system-ui"; ctx.fillText("平衡點", eqX - 22, midY + 78);
        // 彈簧與方塊
        drawSpring(bx - 22);
        ctx.fillStyle = "#4d9fff"; ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5;
        ctx.fillRect(bx - 22, midY - 22, 44, 44); ctx.strokeRect(bx - 22, midY - 22, 44, 44);
        // 速度向量
        if (Math.abs(v) > 0.02) U.arrow(ctx, bx, midY, bx + v * 24, midY, "#ffcc66", 2.5);

        // x-t 圖
        const gy0 = 300, gh = 80;
        ctx.strokeStyle = "#26303d"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, gy0); ctx.lineTo(W - 20, gy0); ctx.stroke();
        ctx.fillStyle = "#62707f"; ctx.fillText("位移對時間 x-t", 40, gy0 - gh - 6);
        graph.push(x / 1.6);
        if (graph.length > W - 60) graph.shift();
        ctx.strokeStyle = "#34d3c4"; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < graph.length; i++) {
          const px = 40 + i, py = gy0 - graph[i] * gh;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 讀數
        const K = 0.5 * st.k * (st.A * st.A - x * x);
        rX.set(U.fmt(x, 2)); rEk.set(U.fmt(K, 2));
      }

      const loop = PhysicsLab.loop(function (dt) { st.t += dt; draw(); });

      refresh();
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
