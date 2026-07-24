/* 都卜勒效應 Doppler effect */
(function () {
  "use strict";
  PhysicsLab.register("doppler", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const C = 120;        // 波速 px/s
      const midY = 200;

      const st = { vs: 60, f: 2, sx: 80, t: 0, waves: [], emitAcc: 0 };

      const sV = PhysicsLab.ui.slider({ label: "波源速率 vs", min: 0, max: 108, step: 4, value: 60, format: v => (v / C).toFixed(2) + "× 波速", onInput: v => st.vs = v });
      const sF = PhysicsLab.ui.slider({ label: "波源頻率 f", min: 1, max: 4, step: 0.5, value: 2, unit: "Hz", onInput: v => st.f = v });
      L.controls.appendChild(sV.el); L.controls.appendChild(sF.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bT = PhysicsLab.ui.button("暫停", () => { if (loop.isRunning()) { loop.stop(); bT.textContent = "繼續"; } else { loop.start(); bT.textContent = "暫停"; } }, "primary");
      btnRow.appendChild(bT);
      btnRow.appendChild(PhysicsLab.ui.button("重設", () => { st.waves = []; st.sx = 80; }));
      L.controls.appendChild(btnRow);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "波源前方波前被壓縮 → 頻率變高<br>後方被拉長 → 頻率變低";
      L.controls.appendChild(tip);

      const rFront = PhysicsLab.ui.readout({ label: "前方觀察頻率", unit: "Hz" });
      const rBack = PhysicsLab.ui.readout({ label: "後方觀察頻率", unit: "Hz" });
      const rRatio = PhysicsLab.ui.readout({ label: "速率 / 波速" });
      [rFront, rBack, rRatio].forEach(r => L.readouts.appendChild(r.el));

      function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);
        U.grid(ctx, W, H, 34, "rgba(255,255,255,0.04)");
        // 觀察者
        ctx.fillStyle = "#34d3c4"; ctx.font = "12px system-ui";
        ctx.fillText("前方 ▶", W - 74, midY - 60);
        ctx.fillText("◀ 後方", 24, midY - 60);
        ctx.beginPath(); ctx.arc(W - 30, midY, 7, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(30, midY, 7, 0, 7); ctx.fill();
        // 波前
        ctx.lineWidth = 1.5;
        st.waves.forEach(w => {
          const rad = (st.t - w.t0) * C;
          const a = U.clamp(1 - rad / 620, 0, 1);
          ctx.strokeStyle = "rgba(77,159,255," + (a * 0.8).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(w.x, midY, rad, 0, 7); ctx.stroke();
        });
        // 波源
        ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(st.sx, midY, 9, 0, 7); ctx.fill();
        ctx.strokeStyle = "#ffd0c8"; ctx.lineWidth = 1.5; ctx.stroke();
        if (st.vs > 1) U.arrow(ctx, st.sx, midY, st.sx + 34, midY, "#ffcc66", 2);

        const denom1 = Math.max(0.05, 1 - st.vs / C);
        rFront.set(U.fmt(st.f / denom1, 2));
        rBack.set(U.fmt(st.f / (1 + st.vs / C), 2));
        rRatio.set((st.vs / C).toFixed(2));
      }

      const loop = PhysicsLab.loop(function (dt) {
        st.t += dt;
        st.sx += st.vs * dt;
        if (st.sx > W - 60) { st.sx = 80; st.waves = []; }
        st.emitAcc += dt;
        if (st.emitAcc >= 1 / st.f) { st.emitAcc = 0; st.waves.push({ x: st.sx, t0: st.t }); }
        st.waves = st.waves.filter(w => (st.t - w.t0) * C < 640);
        draw();
      });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
