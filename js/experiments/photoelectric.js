/* 光電效應 Photoelectric effect */
(function () {
  "use strict";
  PhysicsLab.register("photoelectric", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const plateX = 300, plateTop = 90, plateBot = 310;

      const metals = { "鉀 K": 2.30, "鈉 Na": 2.75, "鋅 Zn": 4.33, "銅 Cu": 4.70 };
      const st = { lambda: 450, intensity: 5, W: 2.30, photons: [], electrons: [], t: 0 };

      const sL = PhysicsLab.ui.slider({ label: "波長 λ", min: 200, max: 700, step: 5, value: 450, format: v => v + " nm", onInput: v => { st.lambda = v; refresh(); } });
      const sI = PhysicsLab.ui.slider({ label: "光強度", min: 1, max: 12, step: 1, value: 5, onInput: v => { st.intensity = v; } });
      // 金屬選擇
      const metalWrap = document.createElement("div");
      metalWrap.innerHTML = "<div style='font-size:12.5px;color:#97a3b3;margin-bottom:6px;'>金屬（功函數 W）</div>";
      const sel = document.createElement("select");
      sel.style.cssText = "width:100%;padding:7px;border-radius:8px;background:#1c2531;color:#e6edf3;border:1px solid #26303d;font-family:inherit;font-size:13px;";
      Object.keys(metals).forEach(k => { const o = document.createElement("option"); o.value = metals[k]; o.textContent = k + "（" + metals[k] + " eV）"; sel.appendChild(o); });
      sel.addEventListener("change", () => { st.W = parseFloat(sel.value); refresh(); });
      metalWrap.appendChild(sel);
      L.controls.appendChild(sL.el); L.controls.appendChild(sI.el); L.controls.appendChild(metalWrap);

      const rE = PhysicsLab.ui.readout({ label: "光子能量 hf = 1240/λ", unit: "eV" });
      const rF0 = PhysicsLab.ui.readout({ label: "底限波長 λ₀ = 1240/W", unit: "nm" });
      const rK = PhysicsLab.ui.readout({ label: "最大動能 K_max", unit: "eV" });
      const rV = PhysicsLab.ui.readout({ label: "遏止電壓 Vs", unit: "V" });
      [rE, rF0, rK, rV].forEach(r => L.readouts.appendChild(r.el));

      function photonE() { return 1240 / st.lambda; }        // eV
      function kmax() { return Math.max(0, photonE() - st.W); }
      function emits() { return photonE() > st.W; }

      function wl2rgb(wl) {
        let r = 0, g = 0, b = 0;
        if (wl < 380) { r = 0.5; b = 1; }
        else if (wl < 440) { r = -(wl - 440) / 60; b = 1; }
        else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
        else if (wl < 510) { g = 1; b = -(wl - 510) / 20; }
        else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
        else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
        else { r = 1; }
        return "rgb(" + (r * 255 | 0) + "," + (g * 255 | 0) + "," + (b * 255 | 0) + ")";
      }

      function refresh() {
        rE.set(U.fmt(photonE(), 2));
        rF0.set(U.fmt(1240 / st.W, 0));
        rK.set(U.fmt(kmax(), 2));
        rV.set(U.fmt(kmax(), 2)); // Vs = Kmax/e，數值同 eV
      }

      function draw() {
        const col = wl2rgb(st.lambda);
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);

        // 光束
        const g = ctx.createLinearGradient(0, 0, plateX, 0);
        g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.12 + st.intensity * 0.02; ctx.fillStyle = col;
        ctx.fillRect(0, plateTop, plateX, plateBot - plateTop); ctx.globalAlpha = 1;
        ctx.fillStyle = "#97a3b3"; ctx.font = "12px system-ui"; ctx.fillText("入射光", 16, plateTop - 10);

        // 金屬板（陰極）
        ctx.fillStyle = "#8fa3b8"; ctx.fillRect(plateX, plateTop, 16, plateBot - plateTop);
        ctx.fillStyle = "#c3ccd6"; ctx.fillText("金屬（陰極）", plateX - 30, plateBot + 20);

        // 集電板（陽極）
        ctx.fillStyle = "#3a4655"; ctx.fillRect(W - 60, plateTop + 20, 12, plateBot - plateTop - 40);
        ctx.fillStyle = "#97a3b3"; ctx.fillText("集電板", W - 90, plateTop + 8);

        // 光子
        ctx.fillStyle = col;
        st.photons.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); });

        // 電子
        st.electrons.forEach(e => {
          ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.arc(e.x, e.y, 4, 0, 7); ctx.fill();
          ctx.strokeStyle = "rgba(255,226,122,0.4)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.vx * 0.04, e.y - e.vy * 0.04); ctx.stroke();
        });

        // 狀態文字
        ctx.font = "bold 14px system-ui";
        if (emits()) { ctx.fillStyle = "#34d3c4"; ctx.fillText("✓ 射出光電子（hf > W）", plateX + 30, 40); }
        else { ctx.fillStyle = "#ff6b6b"; ctx.fillText("✕ 無光電子：hf < W，增加光強也沒用", plateX - 120, 40); }
      }

      const loop = PhysicsLab.loop(function (dt) {
        st.t += dt;
        // 產生光子（頻率 ∝ 強度）
        if (Math.random() < st.intensity * dt * 2.2) {
          st.photons.push({ x: 0, y: plateTop + 10 + Math.random() * (plateBot - plateTop - 20), vx: 320 });
        }
        // 光子前進、撞板
        for (let i = st.photons.length - 1; i >= 0; i--) {
          const p = st.photons[i]; p.x += p.vx * dt;
          if (p.x >= plateX) {
            // 撞到金屬：若 hf>W 則射出電子
            if (emits()) {
              const sp = 120 + Math.sqrt(kmax()) * 200;
              const ang = (Math.random() - 0.5) * 0.7;
              st.electrons.push({ x: plateX + 16, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp });
            }
            st.photons.splice(i, 1);
          }
        }
        // 電子前進
        for (let i = st.electrons.length - 1; i >= 0; i--) {
          const e = st.electrons[i]; e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.x > W || e.y < 0 || e.y > H) st.electrons.splice(i, 1);
        }
        if (st.photons.length > 200) st.photons.splice(0, 50);
        draw();
      });

      refresh(); loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
