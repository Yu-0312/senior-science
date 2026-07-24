/* 行星軌道與克卜勒定律 Orbital motion */
(function () {
  "use strict";
  PhysicsLab.register("orbit", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const cx = W / 2, cy = H / 2;
      const GM = 90000;      // px³/s²（調校後視覺）
      const r0 = 150;        // 初始距離
      const vc = Math.sqrt(GM / r0); // 圓軌道速度

      const st = { k: 1.0, planet: null, trail: [], running: false };

      const sK = PhysicsLab.ui.slider({
        label: "初速（圓軌道倍率）", min: 0.4, max: 1.5, step: 0.02, value: 1.0,
        format: v => v.toFixed(2) + "×", onInput: v => { st.k = v; reset(); }
      });
      L.controls.appendChild(sK.el);
      const hint = document.createElement("div");
      hint.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.5;";
      hint.innerHTML = "1.00× → 圓形軌道<br>&lt;1 → 橢圓（起點為遠日點）<br>1〜1.41× → 橢圓（起點為近日點）<br>≥1.41× → 逃逸";
      L.controls.appendChild(hint);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("發射", () => { st.running = true; loop.start(); }, "primary"));
      btnRow.appendChild(PhysicsLab.ui.button("重設", reset));
      L.controls.appendChild(btnRow);

      const rR = PhysicsLab.ui.readout({ label: "距中心 r", unit: "px" });
      const rV = PhysicsLab.ui.readout({ label: "速率 v", unit: "px/s" });
      const rType = PhysicsLab.ui.readout({ label: "軌道類型" });
      [rR, rV, rType].forEach(r => L.readouts.appendChild(r.el));

      function reset() {
        loop.stop(); st.running = false; st.trail = [];
        st.planet = { x: cx + r0, y: cy, vx: 0, vy: -vc * st.k };
        classify(); draw();
      }

      function classify() {
        const pl = st.planet;
        const r = Math.hypot(pl.x - cx, pl.y - cy);
        const v = Math.hypot(pl.vx, pl.vy);
        const energy = 0.5 * v * v - GM / r;   // 比能量
        let type;
        if (energy >= -1) type = "逃逸（雙曲線）";
        else if (Math.abs(st.k - 1) < 0.02) type = "圓形";
        else type = "橢圓";
        rR.set(U.fmt(r, 0)); rV.set(U.fmt(v, 0)); rType.set(type);
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 軌跡
        if (st.trail.length > 1) {
          ctx.lineWidth = 1.5;
          for (let i = 1; i < st.trail.length; i++) {
            const a = i / st.trail.length;
            ctx.strokeStyle = "rgba(77,159,255," + (a * 0.7).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(st.trail[i - 1].x, st.trail[i - 1].y);
            ctx.lineTo(st.trail[i].x, st.trail[i].y); ctx.stroke();
          }
        }
        // 恆星
        const grd = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26);
        grd.addColorStop(0, "#fff2b0"); grd.addColorStop(0.5, "#ffcc44"); grd.addColorStop(1, "rgba(255,150,40,0)");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffd54f"; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, 7); ctx.fill();
        // 行星
        const pl = st.planet;
        ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(pl.x, pl.y, 8, 0, 7); ctx.fill();
        ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5; ctx.stroke();
        // 速度向量
        U.arrow(ctx, pl.x, pl.y, pl.x + pl.vx * 0.6, pl.y + pl.vy * 0.6, "#ffcc66", 2);
      }

      function accel(x, y) {
        const dx = cx - x, dy = cy - y;
        const r2 = dx * dx + dy * dy;
        const r = Math.sqrt(r2);
        const a = GM / r2;
        return { ax: a * dx / r, ay: a * dy / r };
      }

      const loop = PhysicsLab.loop(function (dt) {
        if (!st.running) return;
        const T = 3.2;                 // 時間比例
        const steps = 8; const h = dt * T / steps;
        const pl = st.planet;
        for (let i = 0; i < steps; i++) {
          // 速度 Verlet
          let a = accel(pl.x, pl.y);
          pl.x += pl.vx * h + 0.5 * a.ax * h * h;
          pl.y += pl.vy * h + 0.5 * a.ay * h * h;
          const a2 = accel(pl.x, pl.y);
          pl.vx += 0.5 * (a.ax + a2.ax) * h;
          pl.vy += 0.5 * (a.ay + a2.ay) * h;
        }
        st.trail.push({ x: pl.x, y: pl.y });
        if (st.trail.length > 260) st.trail.shift();
        // 逃逸太遠則停
        if (Math.hypot(pl.x - cx, pl.y - cy) > 900) { st.running = false; loop.stop(); }
        classify(); draw();
      });

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
