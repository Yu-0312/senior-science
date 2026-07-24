/* 等速圓周運動與向心力 Uniform circular motion */
(function () {
  "use strict";
  PhysicsLab.register("circular", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const cx = 250, cy = 200, PXM = 55; // px per m

      const st = { r: 2.0, v: 4, m: 1, ang: 0 };

      const sR = PhysicsLab.ui.slider({ label: "半徑 r", min: 0.8, max: 3, step: 0.1, value: 2, unit: "m", onInput: v => { st.r = v; } });
      const sV = PhysicsLab.ui.slider({ label: "速率 v", min: 1, max: 8, step: 0.5, value: 4, unit: "m/s", onInput: v => { st.v = v; } });
      const sM = PhysicsLab.ui.slider({ label: "質量 m", min: 0.5, max: 3, step: 0.1, value: 1, unit: "kg", onInput: v => { st.m = v; } });
      [sR, sV, sM].forEach(s => L.controls.appendChild(s.el));
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "<span style='color:#34d3c4'>綠</span>：速度（切線方向）<br><span style='color:#ff6b6b'>紅</span>：向心力（指向圓心）";
      L.controls.appendChild(tip);

      const rT = PhysicsLab.ui.readout({ label: "週期 T", unit: "s" });
      const rAc = PhysicsLab.ui.readout({ label: "向心加速度", unit: "m/s²" });
      const rFc = PhysicsLab.ui.readout({ label: "向心力 Fc", unit: "N" });
      const rW = PhysicsLab.ui.readout({ label: "角速度 ω", unit: "rad/s" });
      [rT, rAc, rFc, rW].forEach(r => L.readouts.appendChild(r.el));

      function draw() {
        const rpx = st.r * PXM;
        const ox = cx + rpx * Math.cos(st.ang), oy = cy + rpx * Math.sin(st.ang);
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 圓軌
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, rpx, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        // 半徑
        ctx.strokeStyle = "#2f3a48"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ox, oy); ctx.stroke();
        // 圓心
        ctx.fillStyle = "#5a6b7d"; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
        // 向量
        const tang = { x: -Math.sin(st.ang), y: Math.cos(st.ang) };
        const inw = { x: cx - ox, y: cy - oy }; const inLen = Math.hypot(inw.x, inw.y);
        inw.x /= inLen; inw.y /= inLen;
        const ac = st.v * st.v / st.r, fc = st.m * ac;
        U.arrow(ctx, ox, oy, ox + tang.x * st.v * 9, oy + tang.y * st.v * 9, "#34d3c4", 2.5);
        U.arrow(ctx, ox, oy, ox + inw.x * fc * 7, oy + inw.y * fc * 7, "#ff6b6b", 2.5);
        // 物體
        ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(ox, oy, 10, 0, 7); ctx.fill();
        ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5; ctx.stroke();

        rT.set(U.fmt(2 * Math.PI * st.r / st.v, 2));
        rAc.set(U.fmt(ac, 2));
        rFc.set(U.fmt(fc, 2));
        rW.set(U.fmt(st.v / st.r, 2));
      }

      const loop = PhysicsLab.loop(function (dt) { st.ang += (st.v / st.r) * dt; draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
