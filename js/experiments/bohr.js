/* 波耳原子模型與原子光譜 Bohr model */
(function () {
  "use strict";
  PhysicsLab.register("bohr", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const atomX = 175, atomY = 200;

      const st = { ni: 3, nf: 2, ang: 0, phase: 0, photonR: -1 };

      const sNi = PhysicsLab.ui.slider({ label: "初能階 nᵢ", min: 2, max: 6, step: 1, value: 3, format: v => "n = " + v, onInput: v => { st.ni = v; fix(); refresh(); } });
      const sNf = PhysicsLab.ui.slider({ label: "終能階 n_f", min: 1, max: 5, step: 1, value: 2, format: v => "n = " + v, onInput: v => { st.nf = v; fix(); refresh(); } });
      L.controls.appendChild(sNi.el); L.controls.appendChild(sNf.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("放出光子", () => { st.photonR = 0; }, "primary"));
      L.controls.appendChild(btnRow);

      const rDE = PhysicsLab.ui.readout({ label: "能量差 ΔE", unit: "eV" });
      const rLam = PhysicsLab.ui.readout({ label: "波長 λ", unit: "nm" });
      const rSeries = PhysicsLab.ui.readout({ label: "譜線系列" });
      const rVis = PhysicsLab.ui.readout({ label: "可見光?" });
      [rDE, rLam, rSeries, rVis].forEach(r => L.readouts.appendChild(r.el));

      function fix() { if (st.nf >= st.ni) { if (st.ni > 1) st.nf = st.ni - 1; sNf.set(st.nf); } }
      function En(n) { return -13.6 / (n * n); }
      function dE() { return En(st.nf) - En(st.ni); } // 放出為正（nf<ni → 更負 → 差為正? En(nf) more negative） ; actually released = E_ni - E_nf
      function released() { return En(st.ni) - En(st.nf); } // 正值（放出能量的大小為 |ΔE|），nf<ni 時 En(nf)<En(ni) → 正
      function lambda() { return 1240 / released(); }
      function series() { return st.nf === 1 ? "萊曼系（紫外）" : st.nf === 2 ? "巴耳末系（可見）" : st.nf === 3 ? "帕申系（紅外）" : "更高系（紅外）"; }

      function wl2rgb(wl) {
        if (wl < 380 || wl > 780) return "#8892a0";
        let r = 0, g = 0, b = 0;
        if (wl < 440) { r = -(wl - 440) / 60; b = 1; }
        else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
        else if (wl < 510) { g = 1; b = -(wl - 510) / 20; }
        else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
        else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
        else { r = 1; }
        return "rgb(" + (r * 255 | 0) + "," + (g * 255 | 0) + "," + (b * 255 | 0) + ")";
      }

      function refresh() {
        rDE.set(U.fmt(released(), 2));
        rLam.set(U.fmt(lambda(), 0));
        rSeries.set(series());
        const wl = lambda(); rVis.set(wl >= 380 && wl <= 780 ? "是" : (wl < 380 ? "紫外" : "紅外"));
      }

      function rn(n) { return 150 * (n * n) / 36; }

      function draw() {
        const wl = lambda(), col = wl2rgb(wl);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);

        // 軌道
        for (let n = 1; n <= 6; n++) {
          ctx.strokeStyle = (n === st.ni || n === st.nf) ? "rgba(120,160,220,0.5)" : "rgba(90,107,125,0.25)";
          ctx.lineWidth = (n === st.ni || n === st.nf) ? 1.6 : 1;
          ctx.beginPath(); ctx.arc(atomX, atomY, rn(n), 0, 7); ctx.stroke();
        }
        // 原子核
        ctx.fillStyle = "#ffcc66"; ctx.beginPath(); ctx.arc(atomX, atomY, 8, 0, 7); ctx.fill();
        // 電子（在 ni 軌道）
        const er = rn(st.ni);
        const ex = atomX + er * Math.cos(st.ang), ey = atomY + er * Math.sin(st.ang);
        ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 7); ctx.fill();
        ctx.strokeStyle = "#bcd8ff"; ctx.lineWidth = 1.2; ctx.stroke();
        // 放出的光子
        if (st.photonR >= 0) {
          ctx.strokeStyle = col; ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) {
            const rr = st.photonR - k * 12;
            if (rr > 0) { ctx.globalAlpha = U.clamp(1 - rr / 200, 0, 1); ctx.beginPath(); ctx.arc(atomX, atomY, rr, -0.5, 0.5); ctx.stroke(); }
          }
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#97a3b3"; ctx.font = "12px system-ui"; ctx.textAlign = "center";
        ctx.fillText("波耳原子模型", atomX, atomY + 175); ctx.textAlign = "left";

        // 能階圖（右）
        const dx = 430, dw = 210, topY = 60, botY = 350;
        function yOf(E) { return topY + (-E / 13.6) * (botY - topY); }
        ctx.fillStyle = "#97a3b3"; ctx.font = "12px system-ui"; ctx.fillText("能階圖 (eV)", dx, 44);
        for (let n = 1; n <= 6; n++) {
          const y = yOf(En(n));
          ctx.strokeStyle = (n === st.ni || n === st.nf) ? "#8fb0dc" : "#2f3a48"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + dw, y); ctx.stroke();
          ctx.fillStyle = "#62707f"; ctx.font = "10.5px system-ui";
          ctx.fillText("n=" + n, dx + dw + 4, y + 4);
          ctx.fillText(U.fmt(En(n), 2), dx - 42, y + 4);
        }
        // 躍遷箭頭
        const y1 = yOf(En(st.ni)), y2 = yOf(En(st.nf));
        U.arrow(ctx, dx + dw / 2, y1, dx + dw / 2, y2, col, 2.5);
        ctx.fillStyle = col; ctx.font = "11px system-ui";
        ctx.fillText("λ≈" + U.fmt(wl, 0) + "nm", dx + dw / 2 + 8, (y1 + y2) / 2);
      }

      const loop = PhysicsLab.loop(function (dt) {
        st.ang += dt * 2;
        if (st.photonR >= 0) { st.photonR += dt * 130; if (st.photonR > 260) st.photonR = -1; }
        // 自動週期性放出光子
        st.phase += dt; if (st.phase > 2.4) { st.phase = 0; st.photonR = 0; }
        draw();
      });
      fix(); refresh(); loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
