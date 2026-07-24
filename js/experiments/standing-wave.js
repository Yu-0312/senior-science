/* 弦上的駐波 Standing waves on a string */
(function () {
  "use strict";
  PhysicsLab.register("standing-wave", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const x0 = 50, x1 = 560, midY = 170, amp = 90;

      const st = { n: 3, speed: 1.0, showComp: true, t: 0 };

      const sN = PhysicsLab.ui.slider({ label: "諧波數 n", min: 1, max: 6, step: 1, value: 3, format: v => "第 " + v + " 諧波", onInput: v => { st.n = v; refresh(); } });
      const sS = PhysicsLab.ui.slider({ label: "波速（相對）", min: 0.2, max: 2, step: 0.1, value: 1.0, format: v => v.toFixed(1) + "×", onInput: v => { st.speed = v; } });
      L.controls.appendChild(sN.el); L.controls.appendChild(sS.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      const bToggle = PhysicsLab.ui.button("暫停", () => {
        if (loop.isRunning()) { loop.stop(); bToggle.textContent = "繼續"; } else { loop.start(); bToggle.textContent = "暫停"; }
      }, "primary");
      const bComp = PhysicsLab.ui.button("行進波：開", () => {
        st.showComp = !st.showComp; bComp.textContent = "行進波：" + (st.showComp ? "開" : "關");
      });
      btnRow.appendChild(bToggle); btnRow.appendChild(bComp);
      L.controls.appendChild(btnRow);

      const rLam = PhysicsLab.ui.readout({ label: "波長 λ = 2L/n", unit: "L" });
      const rNode = PhysicsLab.ui.readout({ label: "波節數" });
      const rAnti = PhysicsLab.ui.readout({ label: "波腹數" });
      const rF = PhysicsLab.ui.readout({ label: "頻率 = n·f₁", unit: "f₁" });
      [rLam, rNode, rAnti, rF].forEach(r => L.readouts.appendChild(r.el));

      function refresh() {
        rLam.set(U.fmt(2 / st.n, 2));
        rNode.set(st.n + 1);
        rAnti.set(st.n);
        rF.set(st.n);
        if (!loop.isRunning()) draw();
      }

      function yStanding(x, phase) {
        const k = st.n * Math.PI / (x1 - x0);
        return amp * Math.sin(k * (x - x0)) * Math.cos(phase);
      }
      function yTravel(x, phase, dir) {
        const k = st.n * Math.PI / (x1 - x0);
        return 0.5 * amp * Math.sin(k * (x - x0) - dir * phase);
      }

      function draw() {
        const phase = st.t * 2.4 * st.speed;
        ctx.clearRect(0, 0, W, H);
        U.grid(ctx, W, H, 34);
        // 中線
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x0, midY); ctx.lineTo(x1, midY); ctx.stroke(); ctx.setLineDash([]);
        // 固定端
        ctx.fillStyle = "#5a6b7d"; ctx.fillRect(x0 - 6, midY - 50, 6, 100); ctx.fillRect(x1, midY - 50, 6, 100);

        // 兩個行進波分量
        if (st.showComp) {
          [[1, "rgba(255,138,101,0.5)"], [-1, "rgba(186,104,200,0.5)"]].forEach(pair => {
            ctx.strokeStyle = pair[1]; ctx.lineWidth = 1.5; ctx.beginPath();
            for (let x = x0; x <= x1; x += 3) {
              const y = midY - yTravel(x, phase, pair[0]);
              if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          });
        }
        // 合成駐波
        ctx.strokeStyle = "#34d3c4"; ctx.lineWidth = 3; ctx.beginPath();
        for (let x = x0; x <= x1; x += 2) {
          const y = midY - yStanding(x, phase);
          if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // 波節（紅點）
        for (let i = 0; i <= st.n; i++) {
          const x = x0 + (x1 - x0) * i / st.n;
          ctx.fillStyle = "#ff6b6b"; ctx.beginPath(); ctx.arc(x, midY, 4, 0, 7); ctx.fill();
        }
        // 圖例
        ctx.font = "12px system-ui";
        ctx.fillStyle = "#34d3c4"; ctx.fillText("駐波（合成）", x0, 40);
        ctx.fillStyle = "#ff6b6b"; ctx.fillText("● 波節", x0 + 110, 40);
      }

      const loop = PhysicsLab.loop(function (dt) { st.t += dt; draw(); });
      refresh();
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
