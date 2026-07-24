/* 透鏡成像 Thin lens imaging */
(function () {
  "use strict";
  PhysicsLab.register("lens", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const cx = 340, axisY = 210, SC = 42, objH = 66;

      const st = { p: 4, f: 2, convex: true };

      const sP = PhysicsLab.ui.slider({ label: "物距 p", min: 0.5, max: 6.5, step: 0.1, value: 4, unit: "f單位", onInput: v => { st.p = v; draw(); } });
      const sF = PhysicsLab.ui.slider({ label: "焦距 |f|", min: 1, max: 3.5, step: 0.1, value: 2, onInput: v => { st.f = v; draw(); } });
      L.controls.appendChild(sP.el); L.controls.appendChild(sF.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bType = PhysicsLab.ui.button("凸透鏡", () => { st.convex = !st.convex; bType.textContent = st.convex ? "凸透鏡" : "凹透鏡"; draw(); }, "primary");
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
        const f = st.convex ? st.f : -st.f;
        const p = st.p;
        const q = (p * f) / (p - f);            // 1/f = 1/p + 1/q
        const m = -q / p;
        const ox = cx - p * SC, oTip = axisY - objH;
        const iTip = axisY - m * objH, ix = cx + q * SC;

        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 主軸
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(20, axisY); ctx.lineTo(W - 20, axisY); ctx.stroke();
        // 透鏡
        ctx.strokeStyle = "#4d9fff"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx, axisY - 92); ctx.lineTo(cx, axisY + 92); ctx.stroke();
        ctx.fillStyle = "#4d9fff"; ctx.font = "16px system-ui"; ctx.textAlign = "center";
        if (st.convex) { ctx.fillText("▲", cx, axisY - 92); ctx.fillText("▼", cx, axisY + 100); }
        else { ctx.fillText("▼", cx, axisY - 84); ctx.fillText("▲", cx, axisY + 96); }
        ctx.textAlign = "left";
        // 焦點
        [f, -f].forEach(ff => {
          const fx = cx + ff * SC;
          ctx.fillStyle = "#97a3b3"; ctx.beginPath(); ctx.arc(fx, axisY, 3, 0, 7); ctx.fill();
          ctx.font = "11px system-ui"; ctx.fillText("F", fx - 3, axisY + 16);
        });
        // 物
        U.arrow(ctx, ox, axisY, ox, oTip, "#ffcc66", 2.5);
        ctx.fillStyle = "#ffcc66"; ctx.font = "12px system-ui"; ctx.fillText("物", ox - 20, oTip);

        // 主要光線
        const backF = cx + f * SC;
        // 1) 平行入射 → 經透鏡折射後通過後焦點方向
        line(ox, oTip, cx, oTip, "#34d3c4");
        {
          const dx = backF - cx, dy = axisY - oTip;
          const t = (W - 40 - cx) / (dx || 0.0001);
          line(cx, oTip, W - 40, oTip + dy * t, "#34d3c4", st.convex ? [] : [5, 5]);
        }
        // 2) 過鏡心直線（不偏折）
        const slope = (axisY - oTip) / (cx - ox);
        line(ox, oTip, W - 40, oTip + slope * (W - 40 - ox), "#f06292");
        // 像
        const virtual = q < 0;
        U.arrow(ctx, ix, axisY, ix, iTip, virtual ? "#ff8a65" : "#7CFFB0", 2.5);
        ctx.fillStyle = virtual ? "#ff8a65" : "#7CFFB0"; ctx.fillText(virtual ? "虛像" : "實像", ix + 4, iTip);

        rQ.set(U.fmt(q, 2) + " f單位");
        rM.set(U.fmt(m, 2) + "×");
        rType.set((virtual ? "虛像 · " : "實像 · ") + (m > 0 ? "正立 · " : "倒立 · ") + (Math.abs(m) > 1 ? "放大" : "縮小"));
      }

      draw();
      return { stop: function () {} };
    }
  });
})();
