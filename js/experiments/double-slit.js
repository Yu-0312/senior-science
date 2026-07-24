/* 雙縫干涉 Double-slit interference */
(function () {
  "use strict";
  PhysicsLab.register("double-slit", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;

      // 幾何：左側光源牆 → 雙縫（中）→ 屏幕（右）
      const slitX = 210, screenX = 560;
      const st = { d: 40, lambda: 550, Ldist: 350, t: 0 };

      function wl2rgb(wl) { // 380-750nm 近似
        let r = 0, g = 0, b = 0;
        if (wl < 440) { r = -(wl - 440) / 60; b = 1; }
        else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
        else if (wl < 510) { g = 1; b = -(wl - 510) / 20; }
        else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
        else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
        else { r = 1; }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      const sD = PhysicsLab.ui.slider({ label: "縫距 d", min: 15, max: 80, step: 1, value: 40, format: v => v + " μm", onInput: v => { st.d = v; draw(); } });
      const sL = PhysicsLab.ui.slider({ label: "波長 λ", min: 400, max: 700, step: 5, value: 550, format: v => v + " nm", onInput: v => { st.lambda = v; draw(); } });
      const sDist = PhysicsLab.ui.slider({ label: "縫屏距離 L", min: 200, max: 500, step: 10, value: 350, onInput: v => { st.Ldist = v; draw(); } });
      [sD, sL, sDist].forEach(s => L.controls.appendChild(s.el));

      const rDy = PhysicsLab.ui.readout({ label: "條紋間距 Δy ∝ λL/d" });
      const rN = PhysicsLab.ui.readout({ label: "可見亮紋數" });
      const rColor = PhysicsLab.ui.readout({ label: "光色" });
      [rDy, rN, rColor].forEach(r => L.readouts.appendChild(r.el));

      function fringeSpacingPx() {
        // Δy = λ L / d，選比例常數讓畫面好看
        return (st.lambda / 550) * (st.Ldist / 350) * (40 / st.d) * 30;
      }

      function colorName(wl) {
        if (wl < 450) return "紫"; if (wl < 490) return "藍"; if (wl < 560) return "綠";
        if (wl < 590) return "黃"; if (wl < 630) return "橙"; return "紅";
      }

      function draw() {
        const [r, g, b] = wl2rgb(st.lambda);
        const midY = H / 2;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#05080c"; ctx.fillRect(0, 0, W, H);

        // 光源 → 縫的波紋
        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + ",0.18)"; ctx.lineWidth = 1;
        for (let rad = 10; rad < 220; rad += st.lambda / 32) {
          ctx.beginPath(); ctx.arc(40, midY, rad + (st.t * 20) % (st.lambda / 32), -0.6, 0.6); ctx.stroke();
        }

        // 雙縫牆
        const slitGap = st.d * 0.7;
        ctx.fillStyle = "#26303d";
        ctx.fillRect(slitX - 5, 0, 10, midY - slitGap - 6);
        ctx.fillRect(slitX - 5, midY - slitGap + 6, 10, 2 * slitGap - 12);
        ctx.fillRect(slitX - 5, midY + slitGap + 6, 10, H - (midY + slitGap + 6));
        const s1 = midY - slitGap, s2 = midY + slitGap;

        // 從雙縫發出的圓形波（示意干涉）
        ctx.lineWidth = 1;
        [s1, s2].forEach(sy => {
          ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + ",0.16)";
          for (let rad = 6; rad < 360; rad += st.lambda / 26) {
            ctx.beginPath(); ctx.arc(slitX, sy, rad + (st.t * 20) % (st.lambda / 26), -1.1, 1.1); ctx.stroke();
          }
        });

        // 屏幕
        ctx.fillStyle = "#11161d"; ctx.fillRect(screenX, 0, 14, H);
        // 干涉強度分佈（右側屏幕上的條紋）
        const dy = fringeSpacingPx();
        for (let y = 0; y < H; y++) {
          const path = (y - midY);
          const I = Math.pow(Math.cos(Math.PI * path / dy), 2); // 亮度
          ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + I.toFixed(3) + ")";
          ctx.fillRect(screenX + 14, y, 60, 1);
        }
        // 屏幕外的強度曲線
        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + ",0.9)"; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let y = 0; y < H; y++) {
          const I = Math.pow(Math.cos(Math.PI * (y - midY) / dy), 2);
          const px = screenX + 78 + I * 55;
          if (y === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.stroke();
        // 標籤
        ctx.fillStyle = "#97a3b3"; ctx.font = "11px system-ui";
        ctx.fillText("光源", 20, midY - 30);
        ctx.fillText("雙縫", slitX - 14, 16);
        ctx.fillText("屏幕", screenX - 4, 16);

        // 讀數
        rDy.set(U.fmt(dy, 0) + " px");
        rN.set(Math.max(1, Math.round(H / dy)));
        rColor.set(colorName(st.lambda) + "光");
      }

      const loop = PhysicsLab.loop(function (dt) { st.t += dt; draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
