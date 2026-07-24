/* 反射與折射（司乃耳定律）Snell's law */
(function () {
  "use strict";
  PhysicsLab.register("snell", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const O = { x: 340, y: 205 }, len = 155;

      const st = { th1: 40, n1: 1.0, n2: 1.5 };

      const sTh = PhysicsLab.ui.slider({ label: "入射角 θ₁", min: 0, max: 88, step: 1, value: 40, unit: "°", onInput: v => { st.th1 = v; draw(); } });
      const sN1 = PhysicsLab.ui.slider({ label: "介質1 折射率 n₁", min: 1, max: 2.5, step: 0.05, value: 1.0, onInput: v => { st.n1 = v; draw(); } });
      const sN2 = PhysicsLab.ui.slider({ label: "介質2 折射率 n₂", min: 1, max: 2.5, step: 0.05, value: 1.5, onInput: v => { st.n2 = v; draw(); } });
      [sTh, sN1, sN2].forEach(s => L.controls.appendChild(s.el));

      const rTh2 = PhysicsLab.ui.readout({ label: "折射角 θ₂", unit: "°" });
      const rTc = PhysicsLab.ui.readout({ label: "臨界角 θc", unit: "°" });
      const rState = PhysicsLab.ui.readout({ label: "狀態" });
      [rTh2, rTc, rState].forEach(r => L.readouts.appendChild(r.el));

      function draw() {
        const th1 = st.th1 * Math.PI / 180;
        const ratio = st.n1 * Math.sin(th1) / st.n2;
        const tir = ratio > 1;
        ctx.clearRect(0, 0, W, H);
        // 兩介質
        ctx.fillStyle = "rgba(77,159,255,0.07)"; ctx.fillRect(0, 0, W, O.y);
        ctx.fillStyle = "rgba(52,211,196,0.10)"; ctx.fillRect(0, O.y, W, H - O.y);
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, O.y); ctx.lineTo(W, O.y); ctx.stroke();
        ctx.fillStyle = "#7fb0ff"; ctx.font = "13px system-ui"; ctx.fillText("介質 1　n₁ = " + st.n1.toFixed(2), 20, 28);
        ctx.fillStyle = "#5fd6c8"; ctx.fillText("介質 2　n₂ = " + st.n2.toFixed(2), 20, H - 16);
        // 法線
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(O.x, 30); ctx.lineTo(O.x, H - 20); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#97a3b3"; ctx.font = "11px system-ui"; ctx.fillText("法線", O.x + 6, 44);

        // 入射（上左 → O）
        const iS = { x: O.x - Math.sin(th1) * len, y: O.y - Math.cos(th1) * len };
        U.arrow(ctx, iS.x, iS.y, O.x, O.y, "#ffcc66", 2.5);
        ctx.fillStyle = "#ffcc66"; ctx.fillText("入射", iS.x - 10, iS.y - 6);
        // 反射（上右）
        const rE = { x: O.x + Math.sin(th1) * len, y: O.y - Math.cos(th1) * len };
        U.arrow(ctx, O.x, O.y, rE.x, rE.y, "#ff8a65", 2);
        ctx.fillStyle = "#ff8a65"; ctx.fillText("反射", rE.x - 4, rE.y - 6);
        // 折射 或 全反射標示
        if (!tir) {
          const th2 = Math.asin(ratio);
          const tE = { x: O.x + Math.sin(th2) * len, y: O.y + Math.cos(th2) * len };
          U.arrow(ctx, O.x, O.y, tE.x, tE.y, "#4d9fff", 2.5);
          ctx.fillStyle = "#4d9fff"; ctx.fillText("折射", tE.x + 4, tE.y + 12);
          rTh2.set(U.fmt(th2 * 180 / Math.PI, 1));
          rState.set("折射");
        } else {
          rTh2.set("—");
          rState.set("全反射");
        }
        rTc.set(st.n1 > st.n2 ? U.fmt(Math.asin(st.n2 / st.n1) * 180 / Math.PI, 1) : "不適用");
      }

      draw();
      return { stop: function () {} };
    }
  });
})();
