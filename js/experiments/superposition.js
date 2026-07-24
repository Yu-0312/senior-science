/* 波的疊加與干涉 Wave superposition & beats */
(function () {
  "use strict";
  PhysicsLab.register("superposition", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const x0 = 40, x1 = 640;

      const st = { f1: 3, f2: 3, A: 30, t: 0 };

      const s1 = PhysicsLab.ui.slider({ label: "波一頻率 f₁", min: 1, max: 6, step: 0.1, value: 3, unit: "Hz", onInput: v => st.f1 = v });
      const s2 = PhysicsLab.ui.slider({ label: "波二頻率 f₂", min: 1, max: 6, step: 0.1, value: 3, unit: "Hz", onInput: v => st.f2 = v });
      const sA = PhysicsLab.ui.slider({ label: "振幅 A", min: 10, max: 40, step: 2, value: 30, onInput: v => st.A = v });
      [s1, s2, sA].forEach(s => L.controls.appendChild(s.el));
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bT = PhysicsLab.ui.button("暫停", () => { if (loop.isRunning()) { loop.stop(); bT.textContent = "繼續"; } else { loop.start(); bT.textContent = "暫停"; } }, "primary");
      btnRow.appendChild(bT);
      L.controls.appendChild(btnRow);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "f₁ = f₂：穩定干涉<br>f₁ ≠ f₂：出現「拍」(beats)";
      L.controls.appendChild(tip);

      const rBeat = PhysicsLab.ui.readout({ label: "拍頻 |f₁−f₂|", unit: "Hz" });
      const rState = PhysicsLab.ui.readout({ label: "狀態" });
      [rBeat, rState].forEach(r => L.readouts.appendChild(r.el));

      function wave(y0, fn, color, wdt) {
        ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.beginPath();
        for (let x = x0; x <= x1; x += 2) {
          const y = y0 - fn(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      function draw() {
        const A = st.A, k1 = st.f1 / 90, k2 = st.f2 / 90, t = st.t;
        const y1 = x => A * Math.sin(k1 * (x - x0) - st.f1 * t * 2.2);
        const y2 = x => A * Math.sin(k2 * (x - x0) - st.f2 * t * 2.2);
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 三條基線
        const lanes = [90, 190, 315];
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        lanes.forEach(y => { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); });
        ctx.fillStyle = "#62707f"; ctx.font = "12px system-ui";
        ctx.fillText("波一", x0, 62); ctx.fillText("波二", x0, 162); ctx.fillText("合成波（疊加）", x0, 250);

        wave(90, y1, "#ff8a65", 1.8);
        wave(190, y2, "#ba68c8", 1.8);
        // 合成 + 拍包絡
        wave(315, x => y1(x) + y2(x), "#34d3c4", 2.5);
        if (Math.abs(st.f1 - st.f2) > 0.05) {
          ctx.strokeStyle = "rgba(52,211,196,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
          const df = (st.f1 - st.f2) / 2 / 90;
          [1, -1].forEach(sgn => {
            ctx.beginPath();
            for (let x = x0; x <= x1; x += 3) {
              const env = sgn * 2 * A * Math.abs(Math.cos(df * (x - x0) - (st.f1 - st.f2) * st.t * 1.1));
              const y = 315 - env; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          });
          ctx.setLineDash([]);
        }

        rBeat.set(U.fmt(Math.abs(st.f1 - st.f2), 2));
        rState.set(Math.abs(st.f1 - st.f2) < 0.05 ? "穩定干涉" : "拍現象");
      }

      const loop = PhysicsLab.loop(function (dt) { st.t += dt; draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
