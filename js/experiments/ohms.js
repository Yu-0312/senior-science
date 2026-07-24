/* 歐姆定律與電路 Ohm's law & circuits */
(function () {
  "use strict";
  PhysicsLab.register("ohms", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      // 迴路矩形
      const x0 = 90, y0 = 90, x1 = 560, y1 = 320;

      const st = { V: 6, R1: 3, R2: 6, series: true, phase: 0 };

      const sV = PhysicsLab.ui.slider({ label: "電壓 V", min: 1, max: 12, step: 0.5, value: 6, unit: "V", onInput: v => st.V = v });
      const sR1 = PhysicsLab.ui.slider({ label: "電阻 R₁", min: 1, max: 12, step: 0.5, value: 3, unit: "Ω", onInput: v => st.R1 = v });
      const sR2 = PhysicsLab.ui.slider({ label: "電阻 R₂", min: 1, max: 12, step: 0.5, value: 6, unit: "Ω", onInput: v => st.R2 = v });
      [sV, sR1, sR2].forEach(s => L.controls.appendChild(s.el));
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bMode = PhysicsLab.ui.button("串聯", () => { st.series = !st.series; bMode.textContent = st.series ? "串聯" : "並聯"; }, "primary");
      btnRow.appendChild(bMode);
      L.controls.appendChild(btnRow);

      const rR = PhysicsLab.ui.readout({ label: "總電阻 R", unit: "Ω" });
      const rI = PhysicsLab.ui.readout({ label: "電流 I", unit: "A" });
      const rP = PhysicsLab.ui.readout({ label: "總功率 P", unit: "W" });
      const rMode = PhysicsLab.ui.readout({ label: "接法" });
      [rR, rI, rP].forEach(r => L.readouts.appendChild(r.el));
      L.readouts.appendChild(rMode.el);

      function Rtot() { return st.series ? st.R1 + st.R2 : 1 / (1 / st.R1 + 1 / st.R2); }

      function resistor(x, y, w, label) {
        ctx.strokeStyle = "#ffcc66"; ctx.lineWidth = 2.5; ctx.beginPath();
        const n = 6, step = w / n; ctx.moveTo(x, y);
        for (let i = 0; i < n; i++) ctx.lineTo(x + step * (i + 0.5), y + (i % 2 ? 9 : -9));
        ctx.lineTo(x + w, y); ctx.stroke();
        ctx.fillStyle = "#ffcc66"; ctx.font = "12px system-ui"; ctx.textAlign = "center";
        ctx.fillText(label, x + w / 2, y - 14); ctx.textAlign = "left";
      }

      function draw() {
        const R = Rtot(), I = st.V / R, P = st.V * I;
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 導線迴路
        ctx.strokeStyle = "#8fa3b8"; ctx.lineWidth = 2.5;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        // 電池（左邊）
        ctx.clearRect(x0 - 6, (y0 + y1) / 2 - 26, 12, 52);
        ctx.strokeStyle = "#34d3c4"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0 - 10, (y0 + y1) / 2 - 16); ctx.lineTo(x0 + 10, (y0 + y1) / 2 - 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0 - 5, (y0 + y1) / 2 + 4); ctx.lineTo(x0 + 5, (y0 + y1) / 2 + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0 - 10, (y0 + y1) / 2 + 20); ctx.lineTo(x0 + 10, (y0 + y1) / 2 + 20); ctx.stroke();
        ctx.fillStyle = "#34d3c4"; ctx.font = "13px system-ui"; ctx.fillText(st.V + " V", x0 - 46, (y0 + y1) / 2 + 4);

        // 電阻
        if (st.series) {
          // 上邊放 R1、右邊放 R2（覆蓋白線）
          ctx.clearRect(x0 + 120, y0 - 12, 120, 24); resistor(x0 + 120, y0, 120, "R₁ = " + st.R1 + "Ω");
          ctx.save(); ctx.translate(x1, y0 + 70); ctx.rotate(Math.PI / 2);
          ctx.clearRect(0 - 12, -12, 100 + 24, 24); resistor(0, 0, 100, "R₂ = " + st.R2 + "Ω"); ctx.restore();
        } else {
          // 並聯：上邊兩條分支
          ctx.clearRect(x0 + 150, y0 - 12, 150, 24); resistor(x0 + 150, y0, 130, "R₁");
          ctx.strokeStyle = "#8fa3b8"; ctx.lineWidth = 2.5;
          ctx.strokeRect(x0 + 150, y0, 130, 50);
          ctx.clearRect(x0 + 150, y0 + 50 - 12, 150, 24); resistor(x0 + 150, y0 + 50, 130, "R₂");
          ctx.fillStyle = "#97a3b3"; ctx.font = "11px system-ui";
          ctx.fillText("R₁=" + st.R1 + "Ω  R₂=" + st.R2 + "Ω", x0 + 165, y0 - 16);
        }

        // 電流方向點（沿迴路）
        const peri = 2 * ((x1 - x0) + (y1 - y0));
        const n = 26;
        for (let i = 0; i < n; i++) {
          let d = ((st.phase * I * 30) + i * peri / n) % peri;
          const pt = perimeter(d, x0, y0, x1, y1);
          ctx.fillStyle = "#4d9fff"; ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, 7); ctx.fill();
        }

        rR.set(U.fmt(R, 2)); rI.set(U.fmt(I, 2)); rP.set(U.fmt(P, 1));
        rMode.set(st.series ? "串聯（R 相加）" : "並聯（R 變小）");
      }

      function perimeter(d, x0, y0, x1, y1) {
        const wSide = x1 - x0, hSide = y1 - y0;
        if (d < wSide) return { x: x0 + d, y: y0 };
        d -= wSide; if (d < hSide) return { x: x1, y: y0 + d };
        d -= hSide; if (d < wSide) return { x: x1 - d, y: y1 };
        d -= wSide; return { x: x0, y: y1 - d };
      }

      const loop = PhysicsLab.loop(function (dt) { st.phase += dt; draw(); });
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
