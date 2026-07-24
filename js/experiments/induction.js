/* 電磁感應（法拉第定律）Electromagnetic induction */
(function () {
  "use strict";
  PhysicsLab.register("induction", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const coilX = 380, coilY = 200, wSigma = 55;

      const st = { speed: 1.0, N: 20, t: 0, mx: 150, prevFlux: 0, emf: 0 };

      const sS = PhysicsLab.ui.slider({ label: "磁鐵速率", min: 0.3, max: 2.5, step: 0.1, value: 1.0, format: v => v.toFixed(1) + "×", onInput: v => st.speed = v });
      const sN = PhysicsLab.ui.slider({ label: "線圈匝數 N", min: 5, max: 40, step: 1, value: 20, unit: "匝", onInput: v => st.N = v });
      L.controls.appendChild(sS.el); L.controls.appendChild(sN.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bT = PhysicsLab.ui.button("暫停", () => {
        if (loop.isRunning()) { loop.stop(); bT.textContent = "繼續"; } else { loop.start(); bT.textContent = "暫停"; }
      }, "primary");
      btnRow.appendChild(bT);
      L.controls.appendChild(btnRow);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "磁鐵來回穿越線圈使磁通量改變，<br>感應出電動勢；電流方向依楞次定律反抗變化。";
      L.controls.appendChild(tip);

      const rFlux = PhysicsLab.ui.readout({ label: "磁通量 Φ（相對）" });
      const rEMF = PhysicsLab.ui.readout({ label: "感應電動勢 ε（相對）" });
      const rDir = PhysicsLab.ui.readout({ label: "感應電流" });
      [rFlux, rEMF, rDir].forEach(r => L.readouts.appendChild(r.el));

      function fluxAt(mx) { const d = (mx - coilX) / wSigma; return Math.exp(-d * d); }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);

        // 導線：磁鐵 → 線圈 → 檢流計
        ctx.strokeStyle = "#5a6b7d"; ctx.lineWidth = 2;

        // 線圈（多個橢圓）
        const emf = st.emf;
        const cur = U.clamp(emf * 2.2, -1, 1);
        for (let i = 0; i < 7; i++) {
          const x = coilX - 30 + i * 10;
          ctx.strokeStyle = "#8fa3b8"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(x, coilY, 9, 46, 0, 0, 7); ctx.stroke();
        }
        // 線圈電流方向指示（顏色 + 箭頭）
        const curColor = cur > 0 ? "#34d3c4" : cur < 0 ? "#ff8a65" : "#5a6b7d";
        if (Math.abs(cur) > 0.02) {
          ctx.fillStyle = curColor;
          const ay = cur > 0 ? coilY - 54 : coilY + 54;
          U.arrow(ctx, coilX - 8, ay, coilX + 8, ay, curColor, 2.5);
        }

        // 磁鐵
        const mx = st.mx, mw = 70, mh = 34;
        ctx.fillStyle = "#ff5a44"; ctx.fillRect(mx - mw / 2, coilY - mh / 2, mw / 2, mh);
        ctx.fillStyle = "#4d9fff"; ctx.fillRect(mx, coilY - mh / 2, mw / 2, mh);
        ctx.fillStyle = "#fff"; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("N", mx - mw / 4, coilY); ctx.fillText("S", mx + mw / 4, coilY);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        // 磁場線（示意）
        ctx.strokeStyle = "rgba(255,138,101,0.25)"; ctx.lineWidth = 1;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.ellipse(mx, coilY, 46, 20 + k * 12 + 24, 0, 0, 7); ctx.stroke();
        }

        // 檢流計
        const gx = 590, gy = 110, gr = 40;
        ctx.fillStyle = "#11161d"; ctx.strokeStyle = "#3a4655"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "#26303d"; ctx.beginPath(); ctx.moveTo(gx - gr, gy + 20); ctx.lineTo(gx + gr, gy + 20); ctx.stroke();
        // 指針
        const ang = -Math.PI / 2 + cur * 1.0;
        ctx.strokeStyle = curColor; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(gx, gy + 16); ctx.lineTo(gx + Math.cos(ang) * (gr - 6), gy + 16 + Math.sin(ang) * (gr - 6)); ctx.stroke();
        ctx.fillStyle = "#97a3b3"; ctx.font = "11px system-ui"; ctx.textAlign = "center";
        ctx.fillText("檢流計", gx, gy + 36); ctx.fillText("0", gx, gy - 22); ctx.textAlign = "left";
        // 連接線
        ctx.strokeStyle = "#5a6b7d"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(coilX + 35, coilY - 40); ctx.lineTo(gx - 30, gy + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(coilX + 35, coilY + 40); ctx.lineTo(gx + 30, gy + 20); ctx.stroke();

        // 讀數
        rFlux.set(U.fmt(fluxAt(mx) * st.N / 20, 2));
        rEMF.set(U.fmt(emf, 2));
        rDir.set(cur > 0.02 ? "順時針" : cur < -0.02 ? "逆時針" : "無（Φ 不變）");
      }

      const loop = PhysicsLab.loop(function (dt) {
        st.t += dt;
        const A = 210;
        const mxNew = coilX + A * Math.sin(st.t * st.speed);
        const vx = (mxNew - st.mx) / dt;
        st.mx = mxNew;
        // ε = -N dΦ/dt
        const flux = fluxAt(st.mx);
        const dPhi = (flux - st.prevFlux) / dt;
        st.prevFlux = flux;
        st.emf = -st.N / 20 * dPhi * 0.5;
        draw();
      });
      st.prevFlux = fluxAt(st.mx);
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
