/* 斜面上的物體受力 Block on an incline */
(function () {
  "use strict";
  PhysicsLab.register("incline", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const g = 9.8;

      const state = { ang: 30, m: 2, mu: 0.3, s: 0, v: 0 };
      const HYP = 330; // 斜面長度(px)

      const sA = PhysicsLab.ui.slider({ label: "傾角 θ", min: 5, max: 75, step: 1, value: 30, unit: "°", onInput: v => { state.ang = v; reset(); } });
      const sM = PhysicsLab.ui.slider({ label: "質量 m", min: 0.5, max: 8, step: 0.1, value: 2, unit: "kg", onInput: v => { state.m = v; refresh(); } });
      const sU = PhysicsLab.ui.slider({ label: "摩擦係數 μ", min: 0, max: 1, step: 0.02, value: 0.3, onInput: v => { state.mu = v; refresh(); } });
      L.controls.appendChild(sA.el); L.controls.appendChild(sM.el); L.controls.appendChild(sU.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("釋放", () => loop.start(), "primary"));
      btnRow.appendChild(PhysicsLab.ui.button("重設", reset));
      L.controls.appendChild(btnRow);

      const rGx = PhysicsLab.ui.readout({ label: "沿斜面重力 mg·sinθ", unit: "N" });
      const rFr = PhysicsLab.ui.readout({ label: "最大靜摩擦 μmg·cosθ", unit: "N" });
      const rA = PhysicsLab.ui.readout({ label: "加速度 a", unit: "m/s²" });
      const rState = PhysicsLab.ui.readout({ label: "狀態" });
      [rGx, rFr, rA, rState].forEach(r => L.readouts.appendChild(r.el));

      function physics() {
        const rad = state.ang * Math.PI / 180;
        const mg = state.m * g;
        const along = mg * Math.sin(rad);      // 下滑分量
        const normal = mg * Math.cos(rad);     // 正向力
        const maxFric = state.mu * normal;      // 最大靜摩擦
        let a = 0, moving;
        if (along > maxFric) { a = g * (Math.sin(rad) - state.mu * Math.cos(rad)); moving = true; }
        else { a = 0; moving = false; }
        return { rad, mg, along, normal, maxFric, a, moving };
      }

      function refresh() { const p = physics();
        rGx.set(U.fmt(p.along, 1)); rFr.set(U.fmt(p.maxFric, 1)); rA.set(U.fmt(p.a, 2));
        rState.set(p.moving ? "下滑中" : "靜止平衡");
        draw();
      }

      function reset() { state.s = 0; state.v = 0; loop.stop(); refresh(); }

      function draw() {
        const p = physics();
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        const oy = H - 46;                       // 地面
        const marginX = 60;
        const base = HYP * Math.cos(p.rad), height = HYP * Math.sin(p.rad);
        const TL = { x: marginX, y: oy - height };
        const BL = { x: marginX, y: oy };
        const BR = { x: marginX + base, y: oy };
        // 斜面
        ctx.fillStyle = "#1b2836"; ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(TL.x, TL.y); ctx.lineTo(BL.x, BL.y); ctx.lineTo(BR.x, BR.y); ctx.closePath();
        ctx.fill(); ctx.stroke();
        // 地面
        ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
        // 角度標示
        ctx.fillStyle = "#97a3b3"; ctx.font = "13px system-ui";
        ctx.fillText(state.ang + "°", BR.x - 34, BR.y - 8);

        // 方塊位置（沿斜面）
        const down = { x: Math.cos(p.rad), y: Math.sin(p.rad) };   // 下坡方向(螢幕)
        const norm = { x: Math.sin(p.rad), y: -Math.cos(p.rad) };  // 外法線
        const s = U.clamp(state.s, 0, HYP - 46);
        const bx = TL.x + down.x * (s + 24) + norm.x * 20;
        const by = TL.y + down.y * (s + 24) + norm.y * 20;
        // 方塊
        ctx.save(); ctx.translate(bx, by); ctx.rotate(p.rad);
        ctx.fillStyle = "#4d9fff"; ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.5;
        ctx.fillRect(-20, -20, 40, 40); ctx.strokeRect(-20, -20, 40, 40);
        ctx.restore();

        // 力向量（px/N 比例）
        const fs = 3.2;
        // 重力（向下）
        U.arrow(ctx, bx, by, bx, by + p.mg * fs, "#ff6b6b", 2.5);
        // 正向力（沿外法線）
        U.arrow(ctx, bx, by, bx + norm.x * p.normal * fs, by + norm.y * p.normal * fs, "#34d3c4", 2.5);
        // 摩擦力（沿上坡，抵抗下滑）
        const fric = p.moving ? p.maxFric : Math.min(p.along, p.maxFric);
        U.arrow(ctx, bx, by, bx - down.x * fric * fs, by - down.y * fric * fs, "#ffcc66", 2.5);

        // 圖例
        legend(ctx, W - 150, 20);
      }

      function legend(ctx, x, y) {
        const items = [["重力 mg", "#ff6b6b"], ["正向力 N", "#34d3c4"], ["摩擦力 f", "#ffcc66"]];
        ctx.font = "12px system-ui";
        items.forEach((it, i) => {
          ctx.fillStyle = it[1]; ctx.fillRect(x, y + i * 20, 12, 12);
          ctx.fillStyle = "#c3ccd6"; ctx.fillText(it[0], x + 18, y + i * 20 + 11);
        });
      }

      const loop = PhysicsLab.loop(function (dt) {
        const p = physics();
        if (!p.moving) { loop.stop(); return; }
        state.v += p.a * dt * 26;   // 26 px per m 視覺比例
        state.s += state.v * dt;
        if (state.s > HYP - 46) { state.s = HYP - 46; state.v = 0; loop.stop(); }
        draw();
      });

      reset();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
