/* 理想氣體與分子動能論 Ideal gas / kinetic theory */
(function () {
  "use strict";
  PhysicsLab.register("gas", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;

      const box = { x: 40, y: 40, w: 360, h: 300 };
      const st = { N: 60, temp: 1.0, wallX: 400, particles: [], pressAccum: 0, pressure: 0 };

      function speedFromTemp() { return 55 * Math.sqrt(st.temp); }

      function makeParticles() {
        st.particles = [];
        for (let i = 0; i < st.N; i++) {
          const ang = Math.random() * Math.PI * 2, sp = speedFromTemp() * (0.6 + Math.random() * 0.8);
          st.particles.push({
            x: box.x + 10 + Math.random() * (st.wallX - box.x - 20),
            y: box.y + 10 + Math.random() * (box.h - 20),
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp
          });
        }
      }

      const sN = PhysicsLab.ui.slider({ label: "分子數 N", min: 10, max: 120, step: 5, value: 60, onInput: v => { st.N = v; makeParticles(); } });
      const sT = PhysicsLab.ui.slider({ label: "溫度 T", min: 0.2, max: 2.5, step: 0.1, value: 1.0, format: v => Math.round(v * 300) + " K", onInput: v => { rescale(v); } });
      const sV = PhysicsLab.ui.slider({ label: "容器寬（體積）", min: 200, max: 400, step: 10, value: 400, onInput: v => { st.wallX = box.x + (v - 200) + 100; clampParticles(); } });
      [sN, sT, sV].forEach(s => L.controls.appendChild(s.el));

      const rP = PhysicsLab.ui.readout({ label: "壓力 P（相對）" });
      const rT = PhysicsLab.ui.readout({ label: "溫度 T", unit: "K" });
      const rKE = PhysicsLab.ui.readout({ label: "平均動能（相對）" });
      const rV = PhysicsLab.ui.readout({ label: "均方根速率", unit: "px/s" });
      [rP, rT, rKE, rV].forEach(r => L.readouts.appendChild(r.el));

      function rescale(newT) {
        const ratio = Math.sqrt(newT / st.temp);
        st.temp = newT;
        st.particles.forEach(p => { p.vx *= ratio; p.vy *= ratio; });
      }
      function clampParticles() {
        st.particles.forEach(p => { if (p.x > st.wallX - 6) p.x = st.wallX - 6; });
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 容器
        ctx.strokeStyle = "#5a6b7d"; ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, st.wallX - box.x, box.h);
        // 活塞（右壁）
        ctx.fillStyle = "#3a4655"; ctx.fillRect(st.wallX, box.y - 4, 14, box.h + 8);
        ctx.fillStyle = "#62707f"; ctx.font = "11px system-ui"; ctx.fillText("活塞", st.wallX - 4, box.y - 10);

        // 分子
        st.particles.forEach(p => {
          const sp = Math.hypot(p.vx, p.vy);
          const hot = U.clamp(sp / (speedFromTemp() * 1.6), 0, 1);
          ctx.fillStyle = "rgb(" + Math.round(90 + hot * 165) + "," + Math.round(180 - hot * 120) + "," + Math.round(255 - hot * 200) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
        });

        // 讀數
        let sumV2 = 0;
        st.particles.forEach(p => sumV2 += p.vx * p.vx + p.vy * p.vy);
        const meanV2 = sumV2 / Math.max(1, st.particles.length);
        const vol = (st.wallX - box.x);
        // 壓力 ~ N·<v²>/V （動力論）
        const pressure = st.particles.length * meanV2 / vol / 900;
        rP.set(U.fmt(pressure, 2));
        rT.set(Math.round(st.temp * 300));
        rKE.set(U.fmt(meanV2 / 6000, 2));
        rV.set(U.fmt(Math.sqrt(meanV2), 0));
      }

      const loop = PhysicsLab.loop(function (dt) {
        const parts = st.particles;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < box.x + 4) { p.x = box.x + 4; p.vx = Math.abs(p.vx); }
          if (p.x > st.wallX - 4) { p.x = st.wallX - 4; p.vx = -Math.abs(p.vx); }
          if (p.y < box.y + 4) { p.y = box.y + 4; p.vy = Math.abs(p.vy); }
          if (p.y > box.y + box.h - 4) { p.y = box.y + box.h - 4; p.vy = -Math.abs(p.vy); }
        }
        draw();
      });

      makeParticles();
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
