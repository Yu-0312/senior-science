/* 磁場與勞侖茲力 Lorentz force */
(function () {
  "use strict";
  PhysicsLab.register("lorentz", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const cx = 250, cy = 200;

      const st = { v: 4, B: 1.2, m: 1, sign: 1, ang: 0 };

      const sV = PhysicsLab.ui.slider({ label: "速率 v", min: 1, max: 8, step: 0.5, value: 4, unit: "×10⁶ m/s", onInput: v => st.v = v });
      const sB = PhysicsLab.ui.slider({ label: "磁場 B", min: 0.4, max: 2.5, step: 0.1, value: 1.2, unit: "T", onInput: v => st.B = v });
      const sM = PhysicsLab.ui.slider({ label: "質量 m", min: 0.5, max: 2.5, step: 0.1, value: 1, unit: "×m", onInput: v => st.m = v });
      [sV, sB, sM].forEach(s => L.controls.appendChild(s.el));
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bSign = PhysicsLab.ui.button("正電荷 ＋", () => { st.sign *= -1; bSign.textContent = st.sign > 0 ? "正電荷 ＋" : "負電荷 －"; }, "primary");
      btnRow.appendChild(bSign);
      L.controls.appendChild(btnRow);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "× 代表磁場指入頁面<br><span style='color:#34d3c4'>綠</span>：速度　<span style='color:#ff6b6b'>紅</span>：磁力";
      L.controls.appendChild(tip);

      const rR = PhysicsLab.ui.readout({ label: "半徑 r = mv/qB", unit: "px" });
      const rT = PhysicsLab.ui.readout({ label: "週期 T", unit: "相對" });
      const rF = PhysicsLab.ui.readout({ label: "磁力 F = qvB", unit: "相對" });
      [rR, rT, rF].forEach(r => L.readouts.appendChild(r.el));

      function radius() { return U.clamp(28 * st.m * st.v / st.B, 20, 150); }

      function draw() {
        const r = radius();
        // 圓心相對粒子在向心方向；固定圓心於 (cx,cy)
        const px = cx + r * Math.cos(st.ang), py = cy + r * Math.sin(st.ang);
        // 速度切線方向（依電荷正負決定繞行方向）
        const dir = st.sign;
        const vx = -Math.sin(st.ang) * dir, vy = Math.cos(st.ang) * dir;
        // 向心（磁力）指向圓心
        const inx = cx - px, iny = cy - py; const il = Math.hypot(inx, iny);

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);
        // 磁場符號
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.font = "13px system-ui";
        for (let gx = 40; gx < W - 20; gx += 46) for (let gy = 40; gy < H - 20; gy += 46) ctx.fillText("×", gx, gy);
        // 軌跡圓
        ctx.strokeStyle = "#2f3a48"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        // 向量
        U.arrow(ctx, px, py, px + vx * st.v * 8, py + vy * st.v * 8, "#34d3c4", 2.5);
        U.arrow(ctx, px, py, px + inx / il * st.v * st.B * 8, py + iny / il * st.v * st.B * 8, "#ff6b6b", 2.5);
        // 粒子
        ctx.fillStyle = st.sign > 0 ? "#ff5a44" : "#4d9fff";
        ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(st.sign > 0 ? "＋" : "－", px, py + 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

        rR.set(U.fmt(r, 0));
        rT.set(U.fmt(2 * Math.PI * st.m / st.B, 2));
        rF.set(U.fmt(st.v * st.B, 2));
      }

      const loop = PhysicsLab.loop(function (dt) { st.ang += st.sign * (st.v / radius()) * dt * 30; draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
