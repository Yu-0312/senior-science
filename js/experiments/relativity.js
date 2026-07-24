/* 狹義相對論：光鐘與時間膨脹 Light clock & time dilation */
(function () {
  "use strict";
  PhysicsLab.register("relativity", {
    build: function (root) {
      const U = PhysicsLab.util;
      const L = PhysicsLab.ui.layout(root);
      const W = 680, H = 400;
      const cv = PhysicsLab.canvas.create(L.canvasWrap, W, H);
      const ctx = cv.ctx;
      const clockH = 150, topY = 90;

      const st = { beta: 0.6, t: 0, restTicks: 0, movTicks: 0, restPh: 0, movPh: 0, movX: 60 };

      const sB = PhysicsLab.ui.slider({ label: "速度 v", min: 0, max: 0.95, step: 0.01, value: 0.6, format: v => v.toFixed(2) + " c", onInput: v => { st.beta = v; } });
      L.controls.appendChild(sB.el);
      const btnRow = document.createElement("div"); btnRow.className = "btn-row";
      btnRow.appendChild(PhysicsLab.ui.button("重設計數", () => { st.restTicks = 0; st.movTicks = 0; }));
      L.controls.appendChild(btnRow);
      const tip = document.createElement("div");
      tip.style.cssText = "font-size:11.5px;color:#62707f;line-height:1.6;margin-top:4px;";
      tip.innerHTML = "運動光鐘的光子走斜線（路徑較長），<br>所以走得比靜止光鐘慢 → 時間膨脹。";
      L.controls.appendChild(tip);

      const rBeta = PhysicsLab.ui.readout({ label: "β = v/c" });
      const rGamma = PhysicsLab.ui.readout({ label: "時間膨脹 γ" });
      const rLen = PhysicsLab.ui.readout({ label: "長度收縮 1/γ" });
      const rTicks = PhysicsLab.ui.readout({ label: "靜止 : 運動 計數" });
      [rBeta, rGamma, rLen, rTicks].forEach(r => L.readouts.appendChild(r.el));

      function gamma() { return 1 / Math.sqrt(1 - st.beta * st.beta); }

      function clock(x, ph, label, moving) {
        // 兩面鏡
        ctx.strokeStyle = "#5a6b7d"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x - 26, topY); ctx.lineTo(x + 26, topY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 26, topY + clockH); ctx.lineTo(x + 26, topY + clockH); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1;
        ctx.strokeRect(x - 26, topY, 52, clockH);
        // 光子（在上下鏡間往返）：ph 0..1 → 位置
        const yy = topY + clockH * (ph < 0.5 ? ph * 2 : (1 - ph) * 2);
        // 光子路徑
        ctx.strokeStyle = moving ? "rgba(255,204,102,0.5)" : "rgba(52,211,196,0.5)"; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, topY + clockH); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = moving ? "#ffcc66" : "#34d3c4";
        ctx.beginPath(); ctx.arc(x, yy, 6, 0, 7); ctx.fill();
        ctx.fillStyle = "#c3ccd6"; ctx.font = "12px system-ui"; ctx.textAlign = "center";
        ctx.fillText(label, x, topY + clockH + 24); ctx.textAlign = "left";
      }

      function draw() {
        const g = gamma();
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#070b10"; ctx.fillRect(0, 0, W, H);
        // 靜止光鐘（左）
        clock(140, st.restPh, "靜止光鐘", false);
        ctx.fillStyle = "#34d3c4"; ctx.font = "13px system-ui"; ctx.textAlign = "center";
        ctx.fillText("計數 " + st.restTicks, 140, 60); ctx.textAlign = "left";
        // 運動光鐘（右，會漂移）
        clock(st.movX, st.movPh, "運動光鐘 →", true);
        ctx.fillStyle = "#ffcc66"; ctx.textAlign = "center";
        ctx.fillText("計數 " + st.movTicks, st.movX, 60); ctx.textAlign = "left";

        rBeta.set(st.beta.toFixed(2));
        rGamma.set(U.fmt(g, 3));
        rLen.set(U.fmt(1 / g, 3));
        rTicks.set(st.restTicks + " : " + st.movTicks);
      }

      const loop = PhysicsLab.loop(function (dt) {
        const g = gamma();
        st.t += dt;
        // 靜止鐘：每 0.8s 一次來回
        const rate = 1 / 0.8;
        st.restPh += dt * rate; while (st.restPh >= 1) { st.restPh -= 1; st.restTicks++; }
        // 運動鐘：慢 γ 倍
        st.movPh += dt * rate / g; while (st.movPh >= 1) { st.movPh -= 1; st.movTicks++; }
        // 漂移
        st.movX += st.beta * 90 * dt;
        if (st.movX > W - 40) st.movX = 380;
        if (st.movX < 380) st.movX = 380 + (st.movX - 380);
        draw();
      });
      st.movX = 380;
      loop.start();
      return { stop: function () { loop.stop(); } };
    }
  });
})();
