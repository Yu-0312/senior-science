/* 自由落體 Free fall */
(function () {
  "use strict";
  PhysicsLab.register("freefall", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const laneX = 130, topY = 46, groundY = H - 40;

      const st = { h: 5, g: 9.8, t: 0, falling: false, done: false };

      const sH = PhysicsLab.ui.slider({ label: "初始高度 h", min: 1, max: 20, step: 0.5, value: 5, unit: "m", onInput: v => { st.h = v; reset(); } });
      const sG = PhysicsLab.ui.slider({ label: "重力 g", min: 1.6, max: 24.8, step: 0.1, value: 9.8, unit: "m/s²", onInput: v => { st.g = v; reset(); } });
      L.controls.appendChild(sH.el); L.controls.appendChild(sG.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("釋放", () => { if (st.done) reset(); st.falling = true; loop.start(); }, "primary"));
      btnRow.appendChild(PhysicsLab.ui.button("重設", reset));
      L.controls.appendChild(btnRow);

      const rT = PhysicsLab.ui.readout({ label: "落地時間", unit: "s" });
      const rVf = PhysicsLab.ui.readout({ label: "落地速率", unit: "m/s" });
      const rY = PhysicsLab.ui.readout({ label: "目前高度", unit: "m" });
      const rV = PhysicsLab.ui.readout({ label: "目前速率", unit: "m/s" });
      [rT, rVf, rY, rV].forEach(r => L.readouts.appendChild(r.el));

      function fall() { return Math.sqrt(2 * st.h / st.g); }

      function reset() {
        st.t = 0; st.falling = false; st.done = false; loop.stop();
        rT.set(U.fmt(fall(), 2)); rVf.set(U.fmt(st.g * fall(), 1)); rY.set(U.fmt(st.h, 1)); rV.set("0");
        draw();
      }

      function draw() {
        const scale = (groundY - topY) / st.h;
        const dist = Math.min(0.5 * st.g * st.t * st.t, st.h);
        const by = topY + dist * scale;
        const v = st.g * st.t;
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 高度刻度
        ctx.strokeStyle = "#26303d"; ctx.fillStyle = "#62707f"; ctx.font = "11px system-ui";
        ctx.beginPath(); ctx.moveTo(laneX - 40, topY); ctx.lineTo(laneX - 40, groundY); ctx.stroke();
        for (let i = 0; i <= 4; i++) {
          const y = topY + (groundY - topY) * i / 4;
          ctx.fillText(U.fmt(st.h * (1 - i / 4), 1) + " m", laneX - 78, y + 4);
          ctx.beginPath(); ctx.moveTo(laneX - 44, y); ctx.lineTo(laneX - 36, y); ctx.stroke();
        }
        // 地面
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(laneX - 50, groundY); ctx.lineTo(laneX + 60, groundY); ctx.stroke();
        // 球
        ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(laneX, by, 11, 0, 7); ctx.fill();
        ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5; ctx.stroke();
        // 速度向量
        if (v > 0.1) U.arrow(ctx, laneX, by, laneX, by + Math.min(v * 4, 60), "#ffcc66", 2.5);

        // v-t 圖
        const gx = 300, gy = groundY, gw = 320, gh = groundY - 70;
        ctx.strokeStyle = "#26303d"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - gh); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.stroke();
        ctx.fillStyle = "#62707f"; ctx.fillText("速度", gx - 4, gy - gh - 8); ctx.fillText("時間", gx + gw - 24, gy + 14);
        const T = fall(), vmax = st.g * T;
        ctx.strokeStyle = "#34d3c4"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw * 0.92, gy - (vmax / vmax) * gh * 0.92); ctx.stroke();
        // 目前點
        const px = gx + (st.t / T) * gw * 0.92, py = gy - (v / vmax) * gh * 0.92;
        ctx.fillStyle = "#ffcc66"; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();

        rY.set(U.fmt(st.h - dist, 1)); rV.set(U.fmt(v, 1));
      }

      const loop = PhysicsLab.loop(function (dt) {
        if (!st.falling) return;
        st.t += dt;
        if (0.5 * st.g * st.t * st.t >= st.h) { st.t = fall(); st.falling = false; st.done = true; loop.stop(); }
        draw();
      });

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
