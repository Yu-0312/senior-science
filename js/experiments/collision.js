/* 一維碰撞 One-dimensional collision */
(function () {
  "use strict";
  PhysicsLab.register("collision", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const trackY = 250, SC = 26; // px per (m/s)

      const p = { m1: 2, m2: 1, u1: 3, u2: -1, e: 1 };
      let carts, collided;

      const s1 = PhysicsLab.ui.slider({ label: "質量 m₁", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", onInput: v => { p.m1 = v; reset(); } });
      const s2 = PhysicsLab.ui.slider({ label: "質量 m₂", min: 0.5, max: 6, step: 0.5, value: 1, unit: "kg", onInput: v => { p.m2 = v; reset(); } });
      const u1 = PhysicsLab.ui.slider({ label: "初速 u₁", min: -4, max: 6, step: 0.5, value: 3, unit: "m/s", onInput: v => { p.u1 = v; reset(); } });
      const u2 = PhysicsLab.ui.slider({ label: "初速 u₂", min: -6, max: 4, step: 0.5, value: -1, unit: "m/s", onInput: v => { p.u2 = v; reset(); } });
      const se = PhysicsLab.ui.slider({ label: "回復係數 e", min: 0, max: 1, step: 0.05, value: 1, format: v => v.toFixed(2) + (v >= 1 ? "（彈性）" : v <= 0 ? "（完全非彈性）" : ""), onInput: v => { p.e = v; reset(); } });
      [s1, s2, u1, u2, se].forEach(s => L.controls.appendChild(s.el));
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("開始", () => loop.start(), "primary"));
      btnRow.appendChild(PhysicsLab.ui.button("重設", reset));
      L.controls.appendChild(btnRow);

      const rP = PhysicsLab.ui.readout({ label: "總動量 p", unit: "kg·m/s" });
      const rK = PhysicsLab.ui.readout({ label: "總動能 K", unit: "J" });
      const rV1 = PhysicsLab.ui.readout({ label: "v₁", unit: "m/s" });
      const rV2 = PhysicsLab.ui.readout({ label: "v₂", unit: "m/s" });
      [rP, rK, rV1, rV2].forEach(r => L.readouts.appendChild(r.el));

      function size(m) { return 26 + m * 8; }

      function reset() {
        loop.stop(); collided = false;
        carts = [
          { m: p.m1, x: 170, v: p.u1, color: "#4d9fff" },
          { m: p.m2, x: 470, v: p.u2, color: "#ff8a65" }
        ];
        updateReadouts();
        draw();
      }

      function updateReadouts() {
        const P = carts[0].m * carts[0].v + carts[1].m * carts[1].v;
        const K = 0.5 * carts[0].m * carts[0].v * carts[0].v + 0.5 * carts[1].m * carts[1].v * carts[1].v;
        rP.set(U.fmt(P, 2)); rK.set(U.fmt(K, 2));
        rV1.set(U.fmt(carts[0].v, 2)); rV2.set(U.fmt(carts[1].v, 2));
      }

      function doCollision() {
        const m1 = carts[0].m, m2 = carts[1].m, a = carts[0].v, b = carts[1].v, e = p.e;
        const va = (m1 * a + m2 * b - m2 * e * (a - b)) / (m1 + m2);
        const vb = (m1 * a + m2 * b + m1 * e * (a - b)) / (m1 + m2);
        carts[0].v = va; carts[1].v = vb;
        collided = true;
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 軌道
        ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(20, trackY + 30); ctx.lineTo(W - 20, trackY + 30); ctx.stroke();
        // 標題
        ctx.fillStyle = collided ? "#34d3c4" : "#62707f"; ctx.font = "13px system-ui";
        ctx.fillText(collided ? "碰撞後" : "碰撞前", 24, 28);

        carts.forEach((c, i) => {
          const w = size(c.m), h = w * 0.8;
          ctx.fillStyle = c.color; ctx.strokeStyle = "#e6edf3"; ctx.lineWidth = 1.5;
          ctx.fillRect(c.x - w / 2, trackY + 30 - h, w, h);
          ctx.strokeRect(c.x - w / 2, trackY + 30 - h, w, h);
          // 標籤
          ctx.fillStyle = "#04121a"; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
          ctx.fillText((i + 1), c.x, trackY + 30 - h / 2 + 5);
          ctx.textAlign = "left";
          ctx.fillStyle = "#c3ccd6"; ctx.font = "12px system-ui";
          ctx.fillText(c.m + " kg", c.x - 16, trackY + 30 - h - 8);
          // 速度向量
          if (Math.abs(c.v) > 0.05) U.arrow(ctx, c.x, trackY + 30 - h - 26, c.x + c.v * SC, trackY + 30 - h - 26, "#ffcc66", 2.5);
        });
      }

      const loop = PhysicsLab.loop(function (dt) {
        const scale = 26; // px per m
        carts.forEach(c => c.x += c.v * scale * dt);
        // 碰撞偵測（右緣 vs 左緣）
        if (!collided) {
          const r1 = carts[0].x + size(carts[0].m) / 2;
          const l2 = carts[1].x - size(carts[1].m) / 2;
          if (r1 >= l2 && carts[0].v - carts[1].v > 0) {
            // 分開避免重疊
            const overlap = r1 - l2; carts[0].x -= overlap / 2; carts[1].x += overlap / 2;
            doCollision();
          }
        }
        // 邊界：離開畫面則停
        if (carts[0].x < -60 || carts[1].x > W + 60) { loop.stop(); }
        updateReadouts();
        draw();
      });

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
