/* 單擺 Simple pendulum */
(function () {
  "use strict";
  PhysicsLab.register("pendulum", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const pivotX = 340, pivotY = 60, PXM = 150;

      const st = { Lm: 1.2, g: 9.8, th0: 20, t: 0 };

      const sL = PhysicsLab.ui.slider({ label: "擺長 L", min: 0.4, max: 2.0, step: 0.05, value: 1.2, unit: "m", onInput: v => { st.Lm = v; st.t = 0; refresh(); } });
      const sG = PhysicsLab.ui.slider({ label: "重力 g", min: 1.6, max: 24.8, step: 0.1, value: 9.8, unit: "m/s²", onInput: v => { st.g = v; st.t = 0; refresh(); } });
      const sTh = PhysicsLab.ui.slider({ label: "初始角度 θ₀", min: 5, max: 35, step: 1, value: 20, unit: "°", onInput: v => { st.th0 = v; st.t = 0; } });
      [sL, sG, sTh].forEach(s => L.controls.appendChild(s.el));
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bT = PhysicsLab.ui.button("暫停", () => { if (loop.isRunning()) { loop.stop(); bT.textContent = "繼續"; } else { loop.start(); bT.textContent = "暫停"; } }, "primary");
      btnRow.appendChild(bT);
      L.controls.appendChild(btnRow);

      const rT = PhysicsLab.ui.readout({ label: "週期 T", unit: "s" });
      const rF = PhysicsLab.ui.readout({ label: "頻率 f", unit: "Hz" });
      const rAng = PhysicsLab.ui.readout({ label: "目前角度", unit: "°" });
      [rT, rF, rAng].forEach(r => L.readouts.appendChild(r.el));

      function omega() { return Math.sqrt(st.g / st.Lm); }
      function refresh() { const T = 2 * Math.PI / omega(); rT.set(U.fmt(T, 2)); rF.set(U.fmt(1 / T, 3)); if (!loop.isRunning()) draw(); }

      function draw() {
        const w = omega();
        const th = (st.th0 * Math.PI / 180) * Math.cos(w * st.t);
        const Lpx = st.Lm * PXM;
        const bx = pivotX + Lpx * Math.sin(th), by = pivotY + Lpx * Math.cos(th);
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 支架
        ctx.fillStyle = "#3a4655"; ctx.fillRect(pivotX - 60, pivotY - 10, 120, 8);
        // 鉛垂參考
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX, pivotY + Lpx + 20); ctx.stroke(); ctx.setLineDash([]);
        // 角弧
        ctx.strokeStyle = "#ffcc66"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(pivotX, pivotY, 34, Math.PI / 2, Math.PI / 2 + th, th < 0); ctx.stroke();
        // 擺線
        ctx.strokeStyle = "#8fa3b8"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bx, by); ctx.stroke();
        // 擺錘
        ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(bx, by, 16, 0, 7); ctx.fill();
        ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5; ctx.stroke();
        // 樞紐
        ctx.fillStyle = "#c3ccd6"; ctx.beginPath(); ctx.arc(pivotX, pivotY, 4, 0, 7); ctx.fill();

        rAng.set(U.fmt(th * 180 / Math.PI, 1));
      }

      const loop = PhysicsLab.loop(function (dt) { st.t += dt; draw(); });
      refresh(); loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
