/* 面鏡成像 Spherical mirror imaging */
(function () {
  "use strict";
  PhysicsLab.register("mirror", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const mx = 470, axisY = 205, SC = 42, objH = 62;

      const st = { p: 4, f: 2, concave: true };

      const sP = PhysicsLab.ui.slider({ label: "物距 p", min: 0.5, max: 6.5, step: 0.1, value: 4, unit: "f單位", onInput: v => { st.p = v; draw(); } });
      const sF = PhysicsLab.ui.slider({ label: "焦距 |f|", min: 1, max: 3.5, step: 0.1, value: 2, onInput: v => { st.f = v; draw(); } });
      L.controls.appendChild(sP.el); L.controls.appendChild(sF.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bType = PhysicsLab.ui.button("凹面鏡", () => { st.concave = !st.concave; bType.textContent = st.concave ? "凹面鏡" : "凸面鏡"; draw(); }, "primary");
      btnRow.appendChild(bType);
      L.controls.appendChild(btnRow);

      const rQ = PhysicsLab.ui.readout({ label: "像距 q" });
      const rM = PhysicsLab.ui.readout({ label: "放大率 m" });
      const rType = PhysicsLab.ui.readout({ label: "像的性質" });
      [rQ, rM, rType].forEach(r => L.readouts.appendChild(r.el));

      function line(x1, y1, x2, y2, color, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      }

      function draw() {
        const f = st.concave ? st.f : -st.f, p = st.p;
        const q = (p * f) / (p - f), m = -q / p;
        const ox = mx - p * SC, oTip = axisY - objH;
        const ix = mx - q * SC, iTip = axisY - m * objH;
        const Fx = mx - f * SC, Cx = mx - 2 * f * SC;

        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 主軸
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(20, axisY); ctx.lineTo(W - 20, axisY); ctx.stroke();
        // 面鏡（弧線）
        ctx.strokeStyle = "#7fb0ff"; ctx.lineWidth = 3;
        ctx.beginPath();
        const bulge = st.concave ? -26 : 26;
        ctx.moveTo(mx - (st.concave ? 0 : 0), axisY - 92);
        ctx.quadraticCurveTo(mx + bulge, axisY, mx, axisY + 92);
        ctx.stroke();
        // 焦點 F、曲率中心 C
        [["F", Fx], ["C", Cx]].forEach(pr => {
          if (pr[1] > 20 && pr[1] < W - 20) {
            ctx.fillStyle = "#97a3b3"; ctx.beginPath(); ctx.arc(pr[1], axisY, 3, 0, 7); ctx.fill();
            ctx.font = "11px system-ui"; ctx.fillText(pr[0], pr[1] - 3, axisY + 16);
          }
        });
        // 物
        U.arrow(ctx, ox, axisY, ox, oTip, "#ffcc66", 2.5);
        ctx.fillStyle = "#ffcc66"; ctx.font = "12px system-ui"; ctx.fillText("物", ox - 18, oTip);

        // 光線1：平行 → 反射過焦點
        line(ox, oTip, mx, oTip, "#34d3c4");
        { const dx = Fx - mx, dy = axisY - oTip, t = (40 - mx) / (dx || -0.001);
          line(mx, oTip, 40, oTip + dy * t, "#34d3c4", st.concave ? [] : [5, 5]); }
        // 光線2：通過曲率中心 C，反射沿原路
        { const dx = Cx - ox, dy = axisY - oTip, t = (40 - ox) / (dx || -0.001);
          line(ox, oTip, 40, oTip + dy * t, "#f06292", [4, 4]); }

        // 像
        const virtual = q < 0;
        U.arrow(ctx, ix, axisY, ix, iTip, virtual ? "#ff8a65" : "#7CFFB0", 2.5);
        ctx.fillStyle = virtual ? "#ff8a65" : "#7CFFB0"; ctx.fillText(virtual ? "虛像" : "實像", ix - 6, iTip - 4);

        rQ.set(U.fmt(q, 2) + " f單位");
        rM.set(U.fmt(m, 2) + "×");
        rType.set((virtual ? "虛像 · " : "實像 · ") + (m > 0 ? "正立 · " : "倒立 · ") + (Math.abs(m) > 1 ? "放大" : "縮小"));
      }

      draw();
      return { stop: function () {} };
    }
  });
})();
